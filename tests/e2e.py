"""177 MH कैंटीन — नकली Firebase के साथ पूरा टेस्ट:
डेमो → मालिक लॉगिन → पुराना डेटा (2 बार, कुछ न बदले) → कर्मचारी जोड़ें → कर्मचारी लॉगिन + PIN →
स्कैन से बिल → नकद भुगतान → स्टॉक घटे → भाव पर रोक → उधार खाता (मोबाइल ज़रूरी, पिछला बाकी) →
177 MH से माल (स्टॉक बढ़े, खेप, पर्ची) → गिनती → खराब माल → मालिक को रिपोर्ट।
उपयोग: python3 tests/e2e.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, json, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:8765/index.html"
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
CFG = """window.SE_CONFIG={firebase:{apiKey:"TEST",projectId:"t"},ownerHash:"465bf0ff70fca5f4025f1dab7dd7a1ad8298b39f1635f64b0ad3cfa0bb78c334",ownerName:"विक्रम जी",updateUrl:"",photoUrl:"http://127.0.0.1:8765/fake-upload"};"""
errs = []
UPLOADS = []

async def page(b, mock, users, cfg=True):
    ctx = await b.new_context(viewport={"width": 400, "height": 860}, service_workers="block", geolocation={"latitude": 25.7712, "longitude": 71.3521, "accuracy": 12}, permissions=["geolocation", "clipboard-read", "clipboard-write"])
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append("console: " + m.text))
    await pg.add_init_script(f"window.__MOCK__={json.dumps(mock)};window.__USERS__={json.dumps(users)};window.print=()=>{{window.__printed=(window.__printed||0)+1}};")
    await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
    await pg.route("**/config.js", lambda r: r.fulfill(body=CFG if cfg else "window.SE_CONFIG={};", content_type="application/javascript"))
    async def up(r):
        UPLOADS.append(len(r.request.post_data or ""))
        await r.fulfill(body='{"ok":true,"id":"f%d","url":"https://drive.google.com/file/d/f%d"}' % (len(UPLOADS), len(UPLOADS)), content_type="application/json")
    await pg.route("**/fake-upload", up)
    await pg.route("https://tile.openstreetmap.org/**", lambda r: r.fulfill(body=b"", status=204))
    await pg.goto(URL)
    return pg


def bills_of(mock):
    return [x for k, v in mock.items() if k.endswith('/bills') for x in v.values()]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---------- 0) बिना Firebase: डेमो ----------
        pg = await page(b, {}, {}, cfg=False)
        await pg.wait_for_timeout(1500)
        assert await pg.is_hidden("#lock"), "demo should not lock"
        n = await pg.locator("#grid [data-item]").count(); assert n >= 10, n
        await pg.screenshot(path=f"{SHOTS}/0-demo.png")
        await pg.context.close()

        # ---------- 1) मालिक: लॉगिन, पुराना डेटा, कर्मचारी ----------
        users = {"sabziexpress3600@gmail.com": {"uid": "own", "pw": "secret123"}}
        pg = await page(b, {}, users)
        await pg.wait_for_selector("#lock:not([hidden])")
        await pg.screenshot(path=f"{SHOTS}/1-login.png")
        await pg.click('[data-lg="to-owner"]')
        await pg.fill("#lgEmail", "sabziexpress3600@gmail.com"); await pg.fill("#lgPass", "secret123")
        await pg.click('[data-lg="owner-go"]')
        await pg.wait_for_selector("#lock", state="hidden"); await pg.wait_for_timeout(500)
        tabs = await pg.eval_on_selector_all("[data-tab]", "e=>e.map(x=>x.dataset.tab)")
        assert {"set", "report", "stock", "kharid"} <= set(tabs) and "route" not in tabs, tabs
        await pg.click('[data-tab="set"]'); await pg.wait_for_timeout(300)
        await pg.click("[data-migrate]"); await pg.wait_for_timeout(2500)
        items = await pg.evaluate("window.__MOCK__.items||{}")
        assert len(items) == 32, len(items)
        assert all(v.get("code") and v.get("barcode") for v in items.values()), "every item needs code + barcode"
        st = await pg.evaluate("window.__MOCK__.settings.main")
        assert st["upi"] == "6367183480@okbizaxis" and st["payee"] == "177 MH WET CANTEEN", st
        await pg.evaluate("window.__MOCK__.items.k1001.sale=111")
        await pg.click("[data-migrate]"); await pg.wait_for_timeout(2500)
        assert await pg.evaluate("window.__MOCK__.items.k1001.sale") == 111, "migration overwrote data!"
        print("migrate ok: 32 items, idempotent")
        await pg.click('[data-tab="set"]'); await pg.wait_for_timeout(300)
        await pg.fill("#stName", "दिनेश जी"); await pg.fill("#stPhone", "+91 82095 93527"); await pg.fill("#stPin", "4321")
        await pg.click("[data-staffadd]"); await pg.wait_for_timeout(800)
        staff = await pg.evaluate("window.__MOCK__.staff")
        dk = [k for k, v in staff.items() if v.get("phone") == "8209593527"]
        assert dk and staff[dk[0]]["active"], staff
        await pg.screenshot(path=f"{SHOTS}/2-owner-settings.png", full_page=True)
        mock = await pg.evaluate("window.__MOCK__"); users = await pg.evaluate("window.__USERS__")
        await pg.context.close()

        # ---------- 2) कर्मचारी: लॉगिन + PIN ----------
        pg = await page(b, mock, users)
        await pg.wait_for_selector("#lock:not([hidden])")
        for d in "8209593527": await pg.click(f'#lock [data-k="{d}"]')
        for d in "1111": await pg.click(f'#lock [data-k="{d}"]')
        await pg.wait_for_timeout(500)
        assert await pg.is_visible(".lgerr"), "wrong pin should show error"
        for d in "4321": await pg.click(f'#lock [data-k="{d}"]')
        await pg.wait_for_selector("#lock", state="hidden"); await pg.wait_for_timeout(800)
        tabs = await pg.eval_on_selector_all("[data-tab]", "e=>e.map(x=>x.dataset.tab)")
        assert "set" not in tabs and "report" not in tabs and "route" not in tabs, tabs
        assert "दिनेश" in await pg.inner_text("#who")
        # 12 घंटे बाद ही PIN (घंटे-घंटे पर नहीं)
        await pg.evaluate("localStorage.setItem('se_act',String(Date.now()-3*3600e3));pinGate()"); await pg.wait_for_timeout(200)
        assert await pg.locator(".pinlock").count() == 0, "PIN must not be asked after only 3 hours"
        await pg.evaluate("localStorage.setItem('bh_pin_ts',String(Date.now()-13*3600e3));pinGate()"); await pg.wait_for_selector(".pinlock")
        await pg.fill("#pgIn", "1111"); await pg.wait_for_timeout(300); assert await pg.locator(".pinlock").count() == 1
        await pg.fill("#pgIn", "4321"); await pg.wait_for_timeout(300); assert await pg.locator(".pinlock").count() == 0
        print("12h PIN ok")

        # ---------- 3) स्कैन से बिल ----------
        ps0 = await pg.evaluate("JSON.parse(JSON.stringify(window.__MOCK__.pstock||{}))")
        lays0 = (ps0.get("k1027") or {}).get("qty", 0)
        # Lays (k1009) पुराने डेटा में एक्सपायर है — वो बिल में नहीं जुड़ना चाहिए
        await pg.evaluate("handleScan('8901491981682')"); await pg.wait_for_timeout(150)
        assert "एक्सपायर" in await pg.text_content("#toast") and await pg.evaluate("S.cart.length") == 0, "expired item must be blocked"
        for c in ["8908013982899", "8908013982899"]:
            await pg.evaluate(f"handleScan('{c}')"); await pg.wait_for_timeout(150)
        await pg.click('[data-item="k1010"]'); await pg.wait_for_timeout(150)
        assert await pg.evaluate("S.cart.find(l=>l.id==='k1027').qty") == 2
        await pg.screenshot(path=f"{SHOTS}/3-staff-billing.png")
        # खरीद भाव/मुनाफ़ा कर्मचारी को न दिखे
        assert await pg.locator("#grid .margin, #grid .mg").count() == 0
        await pg.click("#cartbtn"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f"{SHOTS}/4-checkout.png")
        await pg.click("[data-billsave]"); await pg.wait_for_selector("[data-sbok]"); await pg.wait_for_timeout(500)
        await pg.click('[data-sbpay="cash"]'); await pg.wait_for_timeout(150); await pg.click("[data-sbok]"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f"{SHOTS}/5-receipt.png")
        bl = bills_of(await pg.evaluate("window.__MOCK__"))
        assert bl and bl[0]["byName"] == "दिनेश जी" and bl[0]["settled"] is True and bl[0]["pay"]["cash"] == bl[0]["total"], bl[:1]
        assert bl[0]["no"].startswith("BW-"), bl[0]["no"]
        assert any(l.get("mrp") for l in bl[0]["lines"]), "MRP not stored on lines"
        lays1 = await pg.evaluate("(window.__MOCK__.pstock.k1027||{}).qty")
        assert abs((lays0 - 2) - lays1) < 1e-6, (lays0, lays1)
        print("bill ok", bl[0]["no"], bl[0]["total"], "· stock", lays0, "->", lays1)
        await pg.evaluate("closeSheet()")

        # ---------- 4) भाव पर रोक ----------
        await pg.evaluate("S.rateMode=true;renderBill()"); await pg.click('[data-item="k1010"]'); await pg.wait_for_timeout(200)
        assert "सिर्फ़ विक्रम जी" in await pg.text_content("#toast")
        await pg.evaluate("S.rateMode=false;renderBill()")

        # ---------- 5) उधार खाता ----------
        await pg.evaluate("openNewParty(id=>{window.__np=id})"); await pg.wait_for_timeout(200)
        await pg.fill("#npName", "हवलदार रमेश जी"); await pg.click("[data-ok]"); await pg.wait_for_timeout(200)
        assert await pg.evaluate("!window.__np"), "account must not be made without mobile"
        await pg.fill("#npPhone", "98290 12345"); await pg.fill("#npQtr", "15 भैरव"); await pg.fill("#npOpen", "300"); await pg.click("[data-ok]"); await pg.wait_for_timeout(500)
        np = await pg.evaluate("window.__np"); m = await pg.evaluate("window.__MOCK__")
        assert m["parties"][np]["phone"] == "9829012345" and m["ledger"]["o" + np]["amt"] == 300, (m["parties"].get(np), m.get("ledger"))
        print("udhar account ok")

        # ---------- 6) 177 MH से माल ----------
        pis0 = await pg.evaluate("(window.__MOCK__.pstock.k1010||{}).qty||0")
        await pg.click('[data-tab="kharid"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-psrc="mh"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("handleScan('8906079510407')"); await pg.wait_for_selector("#piQ")
        await pg.fill("#piQ", "3"); await pg.fill("#piR", "300")
        await pg.evaluate("document.querySelector('#piE').value=new Date(Date.now()+40*864e5).toISOString().slice(0,10)")
        await pg.click("[data-pisave]"); await pg.wait_for_timeout(300)
        await pg.click("[data-pbill]"); await pg.wait_for_timeout(400); await pg.click("[data-psave]"); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=f"{SHOTS}/6-mh-slip.png")
        m = await pg.evaluate("window.__MOCK__")
        pu = list(m["purchases"].values())
        assert pu and pu[-1]["src"] == "mh" and pu[-1]["pay"] == "mh", pu[-1:]
        assert abs(m["pstock"]["k1010"]["qty"] - (pis0 + 3)) < 1e-6, (pis0, m["pstock"]["k1010"])
        assert any(x["itemId"] == "k1010" for x in m.get("batches", {}).values()), "batch missing"
        assert await pg.locator("[data-mhsent]").count() == 1 and "wa.me/91" in (await pg.get_attribute("[data-mhsent]", "href"))
        print("177 MH ok")
        await pg.evaluate("closeSheet()")

        # ---------- 7) गिनती (कर्मचारी को ऐप का स्टॉक नहीं दिखता) ----------
        await pg.click('[data-tab="stock"]'); await pg.wait_for_timeout(300)
        assert "लागत" not in await pg.inner_text("#p-stock"), "staff must not see stock cost"
        await pg.click("[data-skstart]"); await pg.wait_for_timeout(300)
        for i in range(3):
            await pg.evaluate("handleScan('8909106103856')"); await pg.wait_for_timeout(950)
        await pg.fill('[data-cn="k1030"]', "0")
        await pg.screenshot(path=f"{SHOTS}/7-count.png")
        await pg.click("[data-ckdone]"); await pg.wait_for_timeout(200); await pg.click("[data-ckdone]"); await pg.wait_for_timeout(800)
        assert "धन्यवाद" in await pg.text_content("#toast")
        m = await pg.evaluate("window.__MOCK__"); cn = list(m["counts"].values())
        assert cn and cn[0]["byName"] == "दिनेश जी" and m["pstock"]["k1032"]["qty"] == 3 and m["pstock"]["k1030"]["qty"] == 0, (cn, m["pstock"]["k1032"])
        print("count ok: diff", cn[0]["nDiff"], "short", cn[0]["short"])

        # ---------- 8) खराब माल ----------
        lh0 = m["pstock"]["k1027"]["qty"]
        await pg.evaluate("SR.wasteSheet('k1027','एक्सपायर')"); await pg.wait_for_selector("#wQ")
        await pg.fill("#wQ", "1"); await pg.click("[data-wsave]"); await pg.wait_for_timeout(500)
        assert abs(await pg.evaluate("window.__MOCK__.pstock.k1027.qty") - (lh0 - 1)) < 1e-6
        print("waste ok")
        mock = await pg.evaluate("window.__MOCK__")
        await pg.context.close()

        # ---------- 9) मालिक: रिपोर्ट ----------
        pg = await page(b, mock, users)
        await pg.wait_for_selector("#lock:not([hidden])")
        await pg.click('[data-lg="to-owner"]'); await pg.fill("#lgEmail", "sabziexpress3600@gmail.com"); await pg.fill("#lgPass", "secret123")
        await pg.click('[data-lg="owner-go"]'); await pg.wait_for_selector("#lock", state="hidden"); await pg.wait_for_timeout(800)
        await pg.click('[data-tab="report"]'); await pg.wait_for_timeout(600)
        txt = await pg.evaluate("SK.ownerText()")
        assert "बिक्री" in txt and "मुनाफ़ा" in txt and "177 MH" in txt, txt
        await pg.screenshot(path=f"{SHOTS}/8-owner-report.png")
        await pg.click('[data-tab="stock"]'); await pg.wait_for_timeout(500)
        assert await pg.locator("[data-skview]").count() >= 1, "owner should see count report"
        await pg.screenshot(path=f"{SHOTS}/9-owner-stock.png", full_page=True)
        print(txt)
        await pg.context.close()
        await b.close()
    bad = [e for e in errs if "favicon" not in e]
    assert not bad, bad
    print("\n✅ 177 MH कैंटीन: पूरा टेस्ट पास")

asyncio.run(main())
