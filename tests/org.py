"""🏢 संस्था-पहरा की जाँच: इस रिपो की config.js वाली org से ऐप चलाओ → दूसरी संस्था की खेप/migrate न चढ़े,
हर टैब बिना JS गलती खुले, (भैरव में) MH का रैक-नक्शा न दिखे। उपयोग: python3 tests/org.py <www> <shots>"""
import asyncio, os, re, sys, json, threading, http.server, functools
from playwright.async_api import async_playwright
WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
ORG = re.search(r'org:\s*"([a-z0-9]+)"', open(os.path.join(H, "..", "web", "config.js"), encoding="utf8").read()).group(1)
OTHER = "bhairav" if ORG == "mh177" else "mh177"
os.makedirs(os.path.join(WWW, "data/items"), exist_ok=True)
json.dump({"app": "mh177-packs", "org": OTHER, "v": 5, "packs": [{"id": "X1", "n": 1}]}, open(os.path.join(WWW, "data/items/index.json"), "w"))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8783), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();window.__t=[];")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body='window.SE_CONFIG={org:"%s"};' % ORG, content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8783/index.html"); await pg.wait_for_timeout(1500)
        assert await pg.evaluate("SE.org") == ORG
        assert await pg.evaluate(f"SE.orgOk('{ORG}')") and not await pg.evaluate(f"SE.orgOk('{OTHER}')")
        assert await pg.evaluate("SE.orgOk(undefined)") == (ORG == "mh177")  # org न लिखा = MH का माना
        await pg.evaluate("S.isOwner=true;S.demo=false;S.db=firebase.firestore();window.toast=m=>__t.push(m)")
        assert await pg.evaluate("SPK.apply()") is None
        assert any(t and "नहीं चढ़ेगा" in str(t) for t in await pg.evaluate("__t")), await pg.evaluate("__t")
        bad = json.dumps({"app": "mh177-kharid", "org": OTHER, "bills": []})
        msg = await pg.evaluate("c=>{try{SKJ.parse(c);return ''}catch(e){return e.message}}", bad)
        assert "नहीं चढ़ेगा" in msg, msg
        if ORG != "mh177":
            assert await pg.evaluate("SRK.home({name:'LAYS CHIPS',cat:'kirana'})") is None, "MH का घर-नक्शा भैरव में नहीं"
            assert await pg.evaluate("SRK.gold('6-4')") is False
        for t in await pg.evaluate("[...document.querySelectorAll('[data-tab]')].map(b=>b.dataset.tab)"):
            await pg.evaluate("t=>{S.tab=t;showTab()}", t); await pg.wait_for_timeout(150)
        await pg.screenshot(path=f"{SHOTS}/org.png")
        await br.close()
    assert not errs, errs
    print(f"✅ संस्था-पहरा टेस्ट पास ({ORG})")
asyncio.run(main())
