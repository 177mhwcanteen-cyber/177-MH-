"""177 MH कैंटीन — 📦 GitHub खेप की जाँच (डेमो): data/items/index.json → नए सामान बनें, पुराने में सिर्फ़ खाली खाने भरें,
फोटो Pages (p/<id>.jpg) से, गिनती स्टॉक नहीं बने जब तक "चालू" न लिखा जाए, दोबारा चलाने पर कुछ दोबारा न बने।
उपयोग: python3 tests/packs.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, json, shutil, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
# नमूना खेप (असली रिपो में नहीं — सिर्फ़ www में)
os.makedirs(os.path.join(WWW, "data/items"), exist_ok=True); os.makedirs(os.path.join(WWW, "p"), exist_ok=True)
PK = {"app": "mh177-pack", "v": 5, "id": "S-TEST-01", "items": [
    {"id": "b8901786140503", "name": "everest shahi biryani masala 50g", "barcode": "8901786140503", "mrp": 90, "sale": 90, "cost": 72, "rack": "6-4", "ph": "abc12345", "mfr": "c-everest", "open": {"qty": 10, "exp": "2027-12"}},
    {"id": "g-test-pc", "name": "TEST TOFFEE 1 PC", "mrp": 1, "sale": 1, "perPack": 50, "rack": "7-2", "open": {"qty": 120}},
    {"id": "g-test-pk", "name": "TEST TOFFEE JAR 50PC", "packOf": "g-test-pc", "perPack": 50, "mrp": 50, "sale": 50, "track": False},
    {"id": "EXISTING", "name": "X", "rack": "9-9", "mrp": 999}],
    "companies": [{"id": "c-everest", "name": "EVEREST FOOD PRODUCTS", "care": "18002091234", "phone": "+91 98765 43210", "email": "care@everest.test", "brands": ["EVEREST"]}]}
json.dump(PK, open(os.path.join(WWW, "data/items/S-TEST-01.json"), "w"), ensure_ascii=False)
json.dump({"app": "mh177-packs", "v": 5, "packs": [{"id": "S-TEST-01", "n": 4, "sha": "x1"}]}, open(os.path.join(WWW, "data/items/index.json"), "w"))
img = [f for f in os.listdir(os.path.join(WWW, "img")) if f.endswith(".jpg")][0]
shutil.copy(os.path.join(WWW, "img", img), os.path.join(WWW, "p/b8901786140503.jpg"))

srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8781), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8781/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;S.demo=false;S.db=firebase.firestore()")
        ex = await pg.evaluate("(()=>{const it=S.items.find(i=>i.active!==false&&!i.virtual&&!i.packOf);it.rack='';it.mrp=55;return it.id})()")
        await pg.evaluate(f"""(async()=>{{const f=await fetch('data/items/S-TEST-01.json');const j=await f.json();j.items[3].id='{ex}';window.__pk=j}})()""")
        # असली फ़ाइल में EXISTING की जगह मौजूद सामान का id
        PK["items"][3]["id"] = ex
        json.dump(PK, open(os.path.join(WWW, "data/items/S-TEST-01.json"), "w"), ensure_ascii=False)
        r = await pg.evaluate("SPK.apply()")
        print("apply:", r)
        assert r and r["packs"] == 1 and r["add"] == 3 and r["fill"] == 1 and r["cnt"] == 2 and r["co"] == 1, r
        assert r["lbl"] == 1, r  # बिना कंपनी बारकोड का नया सामान (पैकेट नहीं गिना)
        await pg.evaluate("SBC.open('need','7')"); await pg.wait_for_timeout(700)
        ids = await pg.evaluate("SBC.curList().map(i=>i.id)")
        assert "g-test-pc" in ids and "b8901786140503" not in ids, ids
        assert await pg.evaluate("SBC.stock(item('g-test-pc'))") == 120
        t = await pg.inner_text("#sbcSheet"); assert "रैक 7 के लिस्ट में" in t and "📍 7" in t, t[:400]
        await pg.click("[data-sbcall]"); assert await pg.evaluate("SL.count()") >= 120
        # 🖨️ छप गए ↔ बाकी ↔ ✅ लग गए (↩ से वापस)
        has = lambda f: pg.evaluate(f"SBC.{f}().some(i=>i.id==='g-test-pc')")
        assert await has("todoList") and not await has("prList")
        await pg.evaluate("SBC.setPr('g-test-pc',120)"); assert not await has("todoList") and await has("prList")
        t = await pg.inner_text("#sbcSheet .sbc-tabs"); assert "छप गए 1" in t.replace("\n", " "), t
        await pg.click('[data-sbctab="pr"]'); await pg.wait_for_timeout(300); assert await pg.locator('[data-sbcback="g-test-pc"]').count() == 1
        await pg.screenshot(path=f"{SHOTS}/pk-printed.png")
        await pg.click('[data-sbcback="g-test-pc"]'); await pg.wait_for_timeout(300); assert await has("todoList") and not await has("prList")
        await pg.evaluate("SBC.setPr('g-test-pc',5)"); await pg.evaluate("SBC.mark('g-test-pc','tap')")
        assert await has("okList") and not await has("prList") and not await has("todoList")
        await pg.evaluate("SBC.unOk('g-test-pc')"); assert await has("prList") and not await has("okList")
        await pg.click('[data-sbctab="need"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("closeSheet()")
        co = await pg.evaluate("S.suppliers.find(s=>s.id==='c-everest')")
        assert co and co["kind"] == "company" and co["phone"] == "9876543210" and co["care"] == "18002091234", co
        it = await pg.evaluate("item('b8901786140503')")
        assert it["mfr"] == "c-everest", it
        assert it["name"] == "EVEREST SHAHI BIRYANI MASALA 50G" and it["rack"] == "6-4" and it["cost"] == 72 and it["track"] is True, it
        assert len(it["code"]) == 4 and it["src"] == "pack:S-TEST-01", it["code"]  # 🔢 4 अंक
        cs = await pg.evaluate("S.items.map(i=>String(i.code||'')).filter(Boolean)"); assert len(cs) == len(set(cs)), "दोहरा कोड"
        pk = await pg.evaluate("item('g-test-pk')")
        assert pk["packOf"] == "g-test-pc" and pk["track"] is False
        e2 = await pg.evaluate(f"item('{ex}')")
        assert e2["rack"] == "9-9" and e2["mrp"] == 55, e2  # खाली खाना भरा, भरा हुआ भाव नहीं बदला
        assert await pg.evaluate("SE.photoSrc(item('b8901786140503'))") == "p/b8901786140503.jpg?v=abc12345"
        ok = await pg.evaluate("new Promise(r=>{const i=new Image();i.onload=()=>r(i.width>0);i.onerror=()=>r(false);i.src=SE.photoSrc(item('b8901786140503'))})")
        assert ok
        # 📦→📊 नए सामान की गिनती अपने-आप स्टॉक (बिलिंग "चालू" नहीं)
        assert await pg.evaluate("S.pstock['b8901786140503'].qty") == 10
        assert await pg.evaluate("S.pstock['g-test-pc'].qty") == 120
        assert r["stock"] == 2, r
        assert not await pg.evaluate("!!(S.settings.live&&S.settings.live.ts)")
        lg = await pg.evaluate("Object.values(window.__MOCK__['stockLog']||{}).filter(x=>String(x.why).includes('खेप की गिनती')).length"); assert lg == 2, lg
        assert len(await pg.evaluate("SPK.counts()")) == 0
        # दोबारा चलाने पर कुछ नहीं
        r2 = await pg.evaluate("SPK.apply()")
        assert r2["packs"] == 0 and r2["stock"] == 0, r2
        # जिसका स्टॉक पहले से है: गिनती रुकी रहे, ▶ "चालू" से ही बदले
        await pg.evaluate("window.__MOCK__['openings']=window.__MOCK__['openings']||{};window.__MOCK__['openings']['cnt_b8901786140503']={kind:'count',itemId:'b8901786140503',qty:7,done:false,pack:'X'}")
        assert await pg.evaluate("SPK.autoStock()") == 0
        assert await pg.evaluate("S.pstock['b8901786140503'].qty") == 10
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_selector("#spkCard"); await pg.wait_for_timeout(300)
        t = await pg.inner_text("#spkInfo"); assert "खेपें चढ़ीं: 1" in t and "बाकी गिनती (स्टॉक पहले से था): 1" in t, t
        await pg.click("[data-spklive]"); await pg.wait_for_timeout(200)
        assert await pg.evaluate("S.pstock['b8901786140503'].qty") == 10  # बिना "चालू" लिखे कुछ नहीं
        await pg.fill("#spkConf", "चालू"); await pg.click("[data-spklive]"); await pg.wait_for_timeout(600)
        assert await pg.evaluate("S.pstock['b8901786140503'].qty") == 7
        assert len(await pg.evaluate("SPK.counts()")) == 0
        await pg.screenshot(path=f"{SHOTS}/pk1.png", full_page=True)
        # 🔍 रैक-वार जाँच: मालिक को ऐप का स्टॉक + फ़र्क
        await pg.evaluate("S.tab='stock';showTab()"); await pg.wait_for_timeout(300)
        await pg.click("[data-skstart]"); await pg.wait_for_timeout(300)
        await pg.fill("#ckrack", "6"); await pg.dispatch_event("#ckrack", "input"); await pg.wait_for_timeout(300)
        t = await pg.inner_text("#cklist"); assert "ऐप में 7" in t and "TEST" not in t.upper().split("EVEREST")[0][:0] , t[:300]
        await pg.fill('[data-cn="b8901786140503"]', "5"); await pg.dispatch_event('[data-cn="b8901786140503"]', "input"); await pg.wait_for_timeout(200)
        t = await pg.inner_text('[data-crow="b8901786140503"]'); assert "(-2)" in t, t
        await pg.screenshot(path=f"{SHOTS}/pk-count.png")
        # 📍 वही सामान दूसरे खाने में भी (xloc): स्टॉक में +5, खाने-वार हिसाब, दोबारा नहीं
        json.dump({"app": "mh177-pack", "org": "mh177", "v": 5, "id": "S-TEST-02", "items": [{"id": "g-test-pc", "name": "X", "xloc": {"6-11": 5}}]},
                  open(os.path.join(WWW, "data/items/S-TEST-02.json"), "w"), ensure_ascii=False)
        json.dump({"app": "mh177-packs", "v": 5, "packs": [{"id": "S-TEST-01", "n": 4, "sha": "x1"}, {"id": "S-TEST-02", "n": 1, "sha": "x2"}]},
                  open(os.path.join(WWW, "data/items/index.json"), "w"))
        q0 = await pg.evaluate("S.pstock['g-test-pc'].qty")
        r3 = await pg.evaluate("SPK.apply()"); assert r3["packs"] == 1 and r3["cnt"] == 1, r3
        assert await pg.evaluate("S.pstock['g-test-pc'].qty") == q0 + 5
        assert (await pg.evaluate("SRX.locs(item('g-test-pc')).map(l=>[l.k,l.q])"))[1] == ["6-11", 5]
        await pg.evaluate("SPK.apply(true)"); assert await pg.evaluate("S.pstock['g-test-pc'].qty") == q0 + 5
        await br.close()
    assert not errs, errs
    print("✅ खेप टेस्ट पास")

asyncio.run(main())
