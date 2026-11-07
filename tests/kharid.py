"""177 MH कैंटीन — 🔍 खरीद-जाँच की जाँच (डेमो): खरीद-बही का कोड चिपकाओ → ऐप की खरीद से मिलान ·
✅ चढ़ा · ⚠ भाव/मात्रा/रकम अलग · ❌ नहीं चढ़ा · सामान का खरीद भाव ग़लत · बिक्री भाव खरीद से कम।
उपयोग: python3 tests/kharid.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, json, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8775), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []
CODE = {"app": "mh177-kharid", "v": 1, "bills": [
    {"id": "majisha-5639", "sup": "MAJISHA DISPOSAL & TRADING", "no": "5639", "date": "2026-11-04", "total": 18401, "lines": [
        {"nm": "PAPER PLATE 8 INCH", "qty": 100, "u": "pcs", "rate": 9, "amt": 900, "uc": 9},
        {"nm": "PANEER", "qty": 10.4, "u": "kg", "rate": 240, "amt": 2496, "uc": 240}]},
    {"id": "majisha-5703", "sup": "MAJISHA DISPOSAL & TRADING", "no": "5703", "date": "2026-11-07", "total": 1840, "lines": [
        {"nm": "CHERRY TUTTI FRUTTI 400G", "qty": 10, "u": "pcs", "rate": 40, "amt": 400, "uc": 40}]},
    {"id": "x-1", "sup": "RAM TRADERS", "no": "77", "date": "2026-11-05", "total": 500, "lines": [{"nm": "SUGAR", "qty": 10, "u": "kg", "rate": 50, "amt": 500, "uc": 50}]}]}


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8775/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true")
        assert await pg.evaluate("SKJ.sim('PAPER PLATE 8 INCH','Paper Plate 8in')") >= 0.6
        # ऐप की खरीद: 5639 चढ़ा (प्लेट का भाव 10 ग़लत), 5703 नहीं, RAM वाला बाज़ार से चढ़ा
        pid = await pg.evaluate("""(()=>{const it=S.items.find(i=>i.active!==false&&!i.virtual);it.short='PANEER';it.name='PANEER';it.unit='kg';it.cost=220;it.sale=230;return it.id})()""")
        await pg.evaluate(f"""SKJ._demo=[{{id:'p1',kind:'खरीद',date:'2026-11-04',sup:'Majisha Disposal',total:18401,by:'मनोज',lines:[{{name:'PAPER PLATE 8IN',qty:100,rate:10,amt:1000}},{{id:'{pid}',name:'PANEER',qty:10.4,rate:240,amt:2496}}],note:''}},
          {{id:'m1',kind:'बाज़ार',date:'2026-11-05',sup:'Ram Traders',total:500,by:'मुकेश',lines:[{{name:'SUGAR LOOSE',qty:10,rate:50,amt:500}}],note:''}}]""")
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_selector("#skjCard")
        await pg.click("[data-skjopen]"); await pg.wait_for_selector("#skjSheet")
        await pg.fill("#skjIn", "यह रहा: " + json.dumps(CODE, ensure_ascii=False)); await pg.click("[data-skjgo]"); await pg.wait_for_timeout(600)
        t = await pg.inner_text("#skjOut")
        assert "❌ ऐप में नहीं चढ़ा" in t and "5703" in t, t[:400]
        assert "ऐप में भाव ₹10, बिल पर ₹9" in t, t[:600]
        assert "ऐप में खरीद भाव ₹220, असल में पड़ा ₹240" in t and "बिक्री भाव ₹230 खरीद ₹240 से कम" in t, t[:800]
        R = await pg.evaluate("SKJ.check(%s.bills).then(R=>R.map(r=>[r.b.no,r.st,r.m&&r.m.id]))" % json.dumps(CODE))
        assert R == [["5639", "diff", "p1"], ["5703", "missing", None], ["77", "ok", "m1"]], R
        await pg.screenshot(path=f"{SHOTS}/k1-check.png", full_page=True)
        assert await pg.evaluate("JSON.parse(localStorage.getItem('skj_b')).length") == 3
        await pg.evaluate("S.isOwner=false;S.demo=false"); assert await pg.evaluate("SKJ.settingsHTML()") == ""
        await br.close()
    assert not errs, errs
    print("✅ खरीद-जाँच टेस्ट पास")

asyncio.run(main())
