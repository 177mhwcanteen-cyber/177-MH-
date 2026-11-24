"""177 MH — 🖼️ लेबल का "ढाँचा-फ़ोटो" (24-11-2026; Playwright snapshot-तुलना का तरीका): हर डिज़ाइन × साइज़ में बारकोड कहाँ, कितना बड़ा,
मॉड्यूल, ऊपर की लिखाई कहाँ खत्म — पिछली पक्की नकल (tests/visual/labels.json) से ±3 डॉट। कोई बदलाव डिज़ाइन बिगाड़े तो पकड़ में आए।
जानबूझकर डिज़ाइन बदला हो तो: python3 tests/visual.py <www> <shots> --update   (और commit में लिखें क्यों)"""
import asyncio, json, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright
WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); os.makedirs(SHOTS, exist_ok=True)
UPD = "--update" in sys.argv
H = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.join(H, "visual", "labels.json")
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8795 + 4), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = """()=>{const items=[{id:'a',name:'PARLE-G',sale:10,barcode:'2000000100104',rack:'3-4'},{id:'b',name:'FORTUNE KACHI GHANI MUSTARD OIL BIG JAR',sale:1890,mrp:2100,barcode:'8906007280011',rack:'9-23'}];
  const out={};for(const st of SL.STYLES.map(x=>x[0]))for(const sz of ['50x25','38x25','60x40'])for(const it of items){
    const c={...SL.cfg(),style:st,shop:'177 वेट कैंटीन',extra:'धन्यवाद',show:{shop:1,name:1,price:1,rack:1,mrp:1,size:0,code:0,brand:0,mfg:0,exp:0,digits:1,qr:0,extra:1,caps:1}};
    const cv=SL.canvasFor(it,{},c,sz),b=cv._bc||{};out[st+'|'+sz+'|'+it.id]=[cv.width,cv.height,b.x,b.y,b.w,b.h,b.m,cv._top]}return out}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8799/index.html"); await pg.wait_for_timeout(1500)
        cur = await pg.evaluate(JS); await b.close()
    if UPD or not os.path.exists(BASE):
        json.dump(cur, open(BASE, "w"), indent=0, sort_keys=True); print("📸 नई पक्की नकल लिखी:", len(cur)); return
    base = json.load(open(BASE)); bad = []
    for k, v in base.items():
        c = cur.get(k)
        if c is None: bad.append((k, "गायब")); continue
        if any(abs((a or 0) - (b or 0)) > 3 for a, b in zip(v, c)): bad.append((k, v, c))
    assert not bad, bad[:10]
    print("✅ लेबल ढाँचा टेस्ट पास (", len(base), "नकलें)")
asyncio.run(main())
