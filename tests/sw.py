"""177 MH — 📶 ऑफ़लाइन कैश (sw.js, scripts/build.mjs से) — 24-11-2026: एक फ़ाइल न मिले तो भी कैश बने; बिना नेट: पेज, सामान की फोटो p/*, खेप data/*.json
उपयोग: python3 tests/sw.py <कोई भी खाली फ़ोल्डर>"""
import asyncio, os, re, sys, threading, http.server, functools
from playwright.async_api import async_playwright
D = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "/tmp/swtest"); os.makedirs(D + "/p", exist_ok=True); os.makedirs(D + "/data", exist_ok=True)
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts", "build.mjs"), encoding="utf8").read()
k = 'fs.writeFileSync(path.join(OUT, "sw.js"), `'; a = src.index(k) + len(k); b = src.index("`);", a)
t = src[a:b].replace("${VERSION}", "t").replace('${JSON.stringify(["./", ...shell])}', '["index.html","nahi-hai.js"]').replace("\\\\", "\\")
open(D + "/sw.js", "w").write(t)
open(D + "/index.html", "w").write('<html><script>navigator.serviceWorker.register("sw.js")</script></html>')
open(D + "/p/a.jpg", "wb").write(b"\xff\xd8jpg"); open(D + "/data/x.json", "w").write('{"v":1}')
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8798), functools.partial(http.server.SimpleHTTPRequestHandler, directory=D)); srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(); pg = await ctx.new_page()
        await pg.goto("http://localhost:8798/index.html"); await pg.wait_for_timeout(1500); await pg.reload(); await pg.wait_for_timeout(800)
        assert await pg.evaluate("!!navigator.serviceWorker.controller"), "sw"
        await pg.evaluate("Promise.all([fetch('p/a.jpg'),fetch('data/x.json')])")
        await ctx.set_offline(True)
        r = await pg.evaluate("Promise.all([fetch('p/a.jpg').then(r=>r.status),fetch('data/x.json').then(r=>r.json()),fetch('index.html').then(r=>r.status)])")
        assert r == [200, {"v": 1}, 200], r
        await b.close()
    print("✅ ऑफ़लाइन कैश टेस्ट पास")
asyncio.run(main())
