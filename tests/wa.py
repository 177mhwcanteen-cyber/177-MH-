"""177 MH कैंटीन — 💬 WhatsApp: 10 अंक डालते ही सीधी उसी ग्राहक की चैट (SE.waNum/waUrl/waParse/waAuto, SR.shareAsk, बिल शीट)
उपयोग: python3 tests/wa.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8786), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read()
errs = []


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8786/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;S.demo=false;S.db=firebase.firestore();S.uid='own';S.staff='विक्रम जी'")

        # नंबर साफ़ करना: +91, 0, स्पेस, डैश — सब 91XXXXXXXXXX; ग़लत नंबर खाली
        r = await pg.evaluate("""['9509553600','+91 95095-53600','09509553600','919509553600','12345','5509553600',''].map(SE.waNum)""")
        assert r == ["919509553600"] * 4 + ["", "", ""], r
        # ऐप में whatsapp://send?phone=… (सीधी चैट), वेब पर wa.me/91…
        u = await pg.evaluate("""(()=>{const w=SE.waUrl('9509553600','बिल ₹50');SE.isNative=true;const n=SE.waUrl('9509553600','बिल ₹50'),a=SE.waUrl('9509553600','x','api');SE.isNative=false;return [w,n,a]})()""")
        assert u[0].startswith("https://wa.me/919509553600?text=") and u[1].startswith("whatsapp://send?phone=919509553600&text=") and u[2].startswith("https://api.whatsapp.com/send?phone=919509553600&"), u
        # पुराने wa.me लिंक पहचान (ऐप में अपने-आप सीधी चैट)
        w = await pg.evaluate("[SE.waParse(waLink('हिसाब','9509553600')),SE.waParse('https://api.whatsapp.com/send?phone=919509553600&text=a'),SE.waParse('https://example.com/x')]")
        assert w[0]["phone"] == "919509553600" and w[0]["text"] == "हिसाब" and w[1]["phone"] == "919509553600" and w[2] is None, w

        # 📤 बिल भेजें: 10 अंक टाइप करते ही (बिना बटन) उसी नंबर पर WhatsApp
        await pg.evaluate("window.__wa=[];SE.wa=(p,t)=>{window.__wa.push([p,t,String(new Error().stack).slice(0,300)]);return true};0")
        b = "({no:'T-1',date:today(),ts:Date.now(),mode:'walk',partyName:'VIP ग्राहक',custPhone:'',byName:'विक्रम जी',lines:[{n:'MAGGI 70G',q:2,p:14,pid:'x'}],sub:28,disc:0,total:28})"
        await pg.evaluate(f"window.__b={b};SR.shareAsk(window.__b,'',true)")
        await pg.type("#shPh", "95095 53600", delay=40); await pg.wait_for_timeout(1400)
        sent = await pg.evaluate("window.__wa")
        assert len(sent) == 1 and SE_ok(sent[0][0]) and "28" in sent[0][1], sent
        assert await pg.evaluate("window.__b.custPhone") == "9509553600"
        assert await pg.evaluate("document.getElementById('shbox').hidden") is True
        # आधा नंबर → कुछ नहीं जाता; बटन से ग़लत नंबर पर रोक
        await pg.evaluate("window.__wa=[];SR.shareAsk({...window.__b,custPhone:''},'',true)")
        await pg.type("#shPh", "95095", delay=30); await pg.wait_for_timeout(1300)
        assert await pg.evaluate("window.__wa.length") == 0
        await pg.click("[data-shwa]"); assert await pg.evaluate("window.__wa.length") == 0
        await pg.screenshot(path=os.path.join(SHOTS, "wa-ask.png"))
        await pg.evaluate("document.getElementById('shbox').hidden=true")
        # PDF के बाद वाला पॉप-अप बनता है
        await pg.evaluate("SR.pdfAfter(window.__b,'9509553600',true)")
        assert await pg.is_visible("[data-shp]")
        await pg.click("#shbox [data-shx] >> nth=1"); assert await pg.evaluate("document.getElementById('shbox').hidden")
        await br.close()
    assert not errs, errs
    print("✅ पूरा टेस्ट पास (WhatsApp सीधी चैट)")


def SE_ok(ph):
    return ph in ("9509553600", "919509553600")


asyncio.run(main())
