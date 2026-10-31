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
    await pg.route("**/migrate.json", lambda r: r.fulfill(body=open(os.path.join(H, "fixture-migrate.json"), encoding="utf8").read(), content_type="application/json"))
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
        # ⚡ एक टैप: UPI पहले से चुना; नकद चिप दबाएँ → सेव+सेटल → सीधे बिलिंग स्क्रीन
        assert await pg.get_attribute('[data-pay="upi"]', "aria-pressed") == "true", "UPI default"
        assert await pg.locator(".ck-foot [data-hold]").count() == 1 and await pg.locator("[data-billsave]").count() == 0
        await pg.click('[data-pay="cash"]'); await pg.wait_for_timeout(150)
        assert await pg.get_attribute('[data-pay="cash"]', "aria-pressed") == "true"
        await pg.screenshot(path=f"{SHOTS}/4b-checkout-cash.png")
        await pg.click("[data-save]"); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("!document.querySelector('#sheet .scrim')"), "sheet should close after save+settle"
        assert "सेव" in (await pg.text_content("#toast") or "")
        await pg.screenshot(path=f"{SHOTS}/5-after-save.png")
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
        assert await pg.is_visible("#rnIn"), "staff should be able to open rate sheet"
        await pg.fill("#rnIn", "9999"); await pg.click("[data-rnsave]"); await pg.wait_for_timeout(200)
        assert "बहुत बड़ा" in await pg.text_content("#toast"), "extreme rate needs 2nd press"
        await pg.evaluate("closeSheet();S.rateMode=false;renderBill()")
        # टैप से जोड़ो / गिनती लिखो / माइनस से हटाओ
        await pg.evaluate("S.cart=[];renderCart();renderBill()")
        pcid = await pg.evaluate("(S.items.find(i=>isPc(i.unit)&&priceOf(i)>0&&document.querySelector('#grid [data-item=\"'+i.id+'\"]'))||{}).id")
        sel = f'#grid [data-item="{pcid}"]'
        await pg.click(sel + " .tile"); await pg.click(sel + " .tile")
        assert await pg.evaluate(f"S.cart.find(l=>l.id==='{pcid}').qty") == 2
        assert await pg.evaluate("!document.querySelector('#sheet').innerHTML.trim()"), "no popup for piece items"
        assert "in" in (await pg.get_attribute(sel, "class")).split()
        await pg.click(sel + " [data-qo]"); await pg.fill(sel + " .qinl", "6"); await pg.press(sel + " .qinl", "Enter")
        assert await pg.evaluate(f"S.cart.find(l=>l.id==='{pcid}').qty") == 6
        await pg.screenshot(path=f"{SHOTS}/3b-tap-stepper.png")
        await pg.click(sel + " [data-qo]"); await pg.fill(sel + " .qinl", "1"); await pg.press(sel + " .qinl", "Enter")
        await pg.click(sel + " [data-dec]")
        assert await pg.evaluate(f"!S.cart.some(l=>l.id==='{pcid}')"), "minus at 1 removes"
        print("tap-add/stepper ok", pcid)
        await pg.click("#who"); await pg.wait_for_selector("[data-updnow]"); await pg.click("[data-updnow]"); await pg.wait_for_timeout(300)
        assert "पता" in await pg.text_content(".updmsg"), await pg.text_content(".updmsg")
        await pg.screenshot(path=f"{SHOTS}/3f-update-btn.png"); await pg.evaluate("closeSheet()")
        print("update button ok")
        # ---------- 🛍️ बाज़ार खरीद (खरीदार) — स्कैन से ----------
        await pg.click('[data-tab="mkt"]'); await pg.wait_for_selector("[data-mknew]"); await pg.screenshot(path=f"{SHOTS}/7z-market-home-empty.png")
        await pg.click("[data-mknew]"); await pg.wait_for_timeout(150)
        await pg.evaluate("handleScan('8906079510407')"); await pg.wait_for_timeout(250)
        assert await pg.evaluate("JSON.parse(localStorage.getItem('mh_mkt_draft')).lines[0].name") == "20-20 Pista 250g"
        await pg.evaluate("handleScan('8906079510407')"); await pg.wait_for_timeout(100)
        assert await pg.evaluate("JSON.parse(localStorage.getItem('mh_mkt_draft')).lines[0].qty") == 2
        ln = '.mk-ln >> nth=0'
        await pg.fill(ln + ' >> [data-f="rate"]', "560"); await pg.fill(ln + ' >> [data-f="mrp"]', "599"); await pg.press(ln + ' >> [data-f="mrp"]', "Enter"); await pg.wait_for_timeout(100)
        assert "🔴" in await pg.text_content(".mk-ln >> nth=0")
        await pg.fill("#mkQ", "India Gate चावल 1kg"); await pg.press("#mkQ", "Enter"); await pg.wait_for_timeout(150)
        await pg.fill(ln + ' >> [data-f="qty"]', "5"); await pg.fill(ln + ' >> [data-f="rate"]', "100"); await pg.fill(ln + ' >> [data-f="mrp"]', "130"); await pg.press(ln + ' >> [data-f="mrp"]', "Enter")
        await pg.wait_for_timeout(150); await pg.screenshot(path=f"{SHOTS}/7a-market-draft.png")
        # 🤖 AI बिल: GST + भाड़ा बाँटना
        await pg.click('[data-mode="ai"]'); await pg.wait_for_timeout(100)
        aij = {"app":"mh177-bill","ref":"x","supplier":{"name":"Shree Traders","gstin":"08ABCDE1234F1Z5","billNo":"ST-77","date":"2026-10-31"},
               "items":[{"name":"Dairy Milk 50g","qty":10,"rate":100,"taxable":1000,"gstPct":18,"gstAmt":180,"lineTotal":1180,"mrp":200,"barcode":""},
                        {"name":"Parle-G 100g","qty":20,"free":4,"rate":8,"taxable":160,"gstPct":18,"gstAmt":28.8,"lineTotal":188.8,"mrp":10}],
               "billDiscount":0,"freight":30,"otherCharges":0,"roundOff":1.2,"grandTotal":1400}
        await pg.fill("#mkPaste", json.dumps(aij)); await pg.click("[data-aiapply]"); await pg.wait_for_timeout(200)
        d = await pg.evaluate("JSON.parse(localStorage.getItem('mh_mkt_draft'))")
        dm = [l for l in d["lines"] if l["name"] == "Dairy Milk 50g"][0]; pg_ = [l for l in d["lines"] if l["name"] == "Parle-G 100g"][0]
        assert abs(dm["rate"] - 120.69) < 0.02 and pg_["qty"] == 24, (dm["rate"], pg_)
        assert abs(sum(l["qty"]*l["rate"] for l in d["lines"] if l.get("ai")) - 1400) < 0.5
        await pg.evaluate("handleScan('8901262152334')"); await pg.wait_for_selector("[data-mm]")
        await pg.click('[data-mm]:has-text("Dairy Milk")'); await pg.wait_for_timeout(150)
        await pg.screenshot(path=f"{SHOTS}/7c-market-ai.png")
        await pg.click("[data-fin]"); await pg.wait_for_selector("[data-fsend]"); await pg.wait_for_timeout(700); await pg.screenshot(path=f"{SHOTS}/7d-market-finish.png")
        for _ in range(4):
            if not await pg.is_visible("[data-fsend]"): break
            await pg.click("[data-fsend]"); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(500)
        mb = list((await pg.evaluate("window.__MOCK__.mbuys||{}")).values())
        assert mb and mb[0]["status"] == "sent" and mb[0]["pay"]["status"] == "pending" and mb[0]["aiKey"] and len(mb[0]["low"]) == 1, mb
        assert abs(mb[0]["total"] - (1120 + 500 + 1400)) < 1, mb[0]["total"]
        # वही बिल दोबारा → रोक
        await pg.click("[data-mknew]"); await pg.click('[data-mode="ai"]'); await pg.fill("#mkPaste", json.dumps(aij)); await pg.click("[data-aiapply]"); await pg.wait_for_timeout(200)
        assert "पहले ही" in await pg.text_content("#toast"), await pg.text_content("#toast")
        await pg.click("[data-mkback]"); await pg.wait_for_timeout(300); await pg.screenshot(path=f"{SHOTS}/7b-market-home.png")
        # मालिक: भुगतान · दूसरा साथी: गिनकर पक्का
        no = mb[0]["no"]; uid0 = await pg.evaluate("S.uid")
        await pg.evaluate("S.isOwner=true;SM.render()"); await pg.wait_for_timeout(100)
        await pg.click(f'[data-mkopen="{no}"]'); await pg.wait_for_selector("[data-paid]"); await pg.screenshot(path=f"{SHOTS}/7e-market-pay.png")
        await pg.fill("#mkUtr", "123456789012"); await pg.click("[data-paid]"); await pg.wait_for_timeout(300)
        assert (await pg.evaluate(f"window.__MOCK__.mbuys['{no}'].pay"))["status"] == "paid"
        await pg.evaluate("S.isOwner=false;S.uid='other-biller';SM.render()"); await pg.wait_for_timeout(100)
        await pg.click("[data-rstart]"); await pg.wait_for_timeout(100)
        pis0 = await pg.evaluate("(window.__MOCK__.pstock.k1010||{}).qty||0")
        await pg.evaluate("handleScan('8906079510407')"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f"{SHOTS}/7f-market-recv.png")
        await pg.click("[data-recv]"); await pg.wait_for_timeout(800)
        m = await pg.evaluate(f"window.__MOCK__.mbuys['{no}']")
        assert m["status"] == "recv" and m["recv"]["diff"], m.get("recv")
        pis1 = await pg.evaluate("(window.__MOCK__.pstock.k1010||{}).qty||0")
        assert abs(pis1 - pis0 - 1) < 1e-6, (pis0, pis1)
        assert any(p.get("mp") == no for p in (await pg.evaluate("window.__MOCK__.purchases")).values())
        await pg.evaluate(f"S.uid='{uid0}';SM.render()")
        print("market pay+receive ok")
        # 🤖 सीधा Gemini (AQ. चाबी, header में) — नकली fetch
        res = await pg.evaluate("""async()=>{S.settings.gk='AQ.Ab8RN6Ltest_key-123456789';const of=window.fetch;const seen=[];
          window.fetch=async(u,o)=>{if(String(u).includes('generativelanguage')){seen.push([u,o.headers['x-goog-api-key']]);
            if(u.includes('gemini-pro-latest'))return new Response(JSON.stringify({error:{status:'RESOURCE_EXHAUSTED',message:'quota'}}),{status:429});
            const isImg=JSON.parse(o.body).contents[0].parts[0].inline_data;
            return new Response(JSON.stringify({candidates:[{content:{parts:[{text:isImg?'```json {"found":true,"name":"Haldiram Bhujia 200g","mrp":60} ```':'OK'}]}}]}),{status:200})}return of(u,o)};
          const a=await SE.ai({mode:'ping'});const b=await SE.ai({mode:'img',b64:'xx'});window.fetch=of;S.settings.gk='';return {a,b,seen}}""")
        assert res["a"]["ok"] and res["b"]["name"] == "Haldiram Bhujia 200g" and res["b"]["model"] != "gemini-pro-latest", res
        assert all(x[1].startswith("AQ.") and "key=" not in x[0] for x in res["seen"]), res["seen"]
        print("gemini direct ok", res["a"]["model"], res["b"]["model"])
        # 🌐 अनजान बारकोड → Gemini (नकली जवाब) → नाम/MRP भरे, bcache में याद
        await pg.evaluate("""()=>{S.settings.scriptUrl='https://script.google.com/macros/s/x/exec';window.__aiN=0;SE.ai=async p=>{__aiN++;return p.mode==='code'?{ok:true,found:true,name:'Bikaji Bhujia 200g',hi:'बीकाजी भुजिया',mrp:55,source:'test'}:{ok:true,pong:true}}}""")
        await pg.click('[data-tab="mkt"]'); await pg.wait_for_timeout(100)
        if await pg.is_visible("[data-mkback]"): await pg.click("[data-mkback]")
        await pg.click("[data-mkresume]" if await pg.is_visible("[data-mkresume]") else "[data-mknew]"); await pg.wait_for_timeout(100)
        await pg.evaluate("handleScan('8904063200011')"); await pg.wait_for_timeout(600)
        d = await pg.evaluate("JSON.parse(localStorage.getItem('mh_mkt_draft')).lines[0]")
        assert d["name"] == "Bikaji Bhujia 200g" and d["mrp"] == 55 and d.get("web"), d
        assert (await pg.evaluate("window.__MOCK__.bcache||{}")).get("8904063200011", {}).get("name") == "Bikaji Bhujia 200g"
        await pg.screenshot(path=f"{SHOTS}/7g-market-web.png")
        await pg.evaluate("localStorage.removeItem('mh_mkt_draft')"); await pg.click("[data-mkback]") if await pg.is_visible("[data-mkback]") else None
        await pg.click('[data-tab="bill"]'); await pg.wait_for_timeout(150)
        print("web lookup ok")
        # 🎪 मेला स्पेशल + टोकन
        mig = json.load(open(os.path.join(WWW, "migrate.json"), encoding="utf-8")); mel = [dict(v, id=k) for k, v in mig["items"].items() if v.get("cat") == "mela"]
        await pg.evaluate("x=>{S.items.push(...x);S.cat='mela';S.cart=[];renderCart();renderBill()}", mel); await pg.wait_for_timeout(200)
        await pg.click('#grid [data-item="m-pnr-kadhai"] .tile'); await pg.click('#grid [data-item="m-pnr-kadhai"] .tile'); await pg.click('#grid [data-item="m-btr-roti"] .tile')
        await pg.wait_for_timeout(300); await pg.screenshot(path=f"{SHOTS}/8a-mela.png")
        await pg.evaluate("showReceipt({no:'MH-31-7',date:today(),ts:Date.now(),byName:'दिनेश जी',partyName:'VIP',mode:'walk',lines:S.cart.map(l=>({...l})),total:395,disc:0,pay:{cash:395,upi:0,udhar:0}},true)"); await pg.wait_for_timeout(400)
        assert await pg.locator(".tok").count() == 0, "token box must be off"
        await pg.screenshot(path=f"{SHOTS}/8b-tokens.png"); await pg.evaluate("closeSheet();S.cart=[];S.items=S.items.filter(i=>i.cat!=='mela');S.cat='all';renderCart();renderBill()")
        print("mela ok")
        await pg.click('[data-tab="bill"]'); await pg.wait_for_timeout(200)
        print("market buy ok", mb[0]["no"], mb[0]["total"])
        # झलक: तम्बाकू टाइलें + मिठाई का छोटा पॉपअप (सिर्फ़ स्क्रीनशॉट)
        mig = json.load(open(os.path.join(WWW, "migrate.json"), encoding="utf-8"))
        extra = [dict(v, id=k, sale=(v.get("mrp") or 20)) for k, v in mig["items"].items() if k.startswith("t-")]
        extra.append(dict(id="m-kaju", name="Kaju Katli", hi="काजू कतली", emoji="", cat="mithai", unit="kg", sale=880, active=True, order=0))
        extra.append(dict(id="m-paneer", name="Paneer", hi="पनीर", emoji="", cat="mithai", unit="kg", sale=360, active=True, order=0))
        await pg.evaluate("x=>{S.items.push(...x);S.cat='kirana';S.sub='all';renderBill()}", extra)
        await pg.evaluate("S.q='';$('#q').value='';S.cat='kirana';S.sub='tob';renderBill()"); await pg.wait_for_timeout(200)
        await pg.click('#grid [data-item="t-vimal"] .tile'); await pg.click('#grid [data-item="t-vimal"] .tile'); await pg.click('#grid [data-item="t-rajni"] .tile')
        await pg.wait_for_timeout(400); await pg.screenshot(path=f"{SHOTS}/3c-tobacco.png")
        await pg.evaluate("S.cat='mithai';S.sub='all';renderBill()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f"{SHOTS}/3d-mithai.png")
        await pg.click('#grid [data-item="m-kaju"] .tile'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{SHOTS}/3e-weigh-popup.png")
        await pg.click('#sheet [data-a="50"]'); await pg.wait_for_timeout(200)
        assert await pg.evaluate("S.cart.find(l=>l.id==='m-kaju').amt") == 50
        await pg.evaluate("S.cart=[];S.items=S.items.filter(i=>!i.id.startsWith('t-')&&!i.id.startsWith('m-'));S.cat='all';renderCart();renderBill()")

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
