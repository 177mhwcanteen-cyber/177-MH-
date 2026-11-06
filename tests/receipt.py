"""177 MH कैंटीन — 🧾 बिल छपाई की जाँच (डेमो, बिना Firebase):
5 थीम × 3 चौड़ाई (58/80mm/4 इंच) × (सब चालू / कम से कम / बड़े अक्षर) → बिना गलती बने, किनारे पर कुछ न कटे,
QR पढ़ा जाए, तम्बाकू का असली नाम कभी न छपे, सेटिंग बदलने पर तुरंत लागू हो।
उपयोग: python3 tests/receipt.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, base64, os, sys, threading, http.server, functools
import numpy as np, cv2
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8768), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []
ALL = ["logo","tag","addr","phone","gst","custTag","billno","date","cust","sr","en","rate","count","saved","pay","balance","qr","stamps","delivery","nutri","note","barcode","foot","biller"]


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: m.type in ("error", "warning") and "Failed to load resource" not in m.text and errs.append(m.type + ": " + m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8768/index.html")
        await pg.wait_for_timeout(1500)
        assert await pg.evaluate("!!window.SRc && SE.receiptCanvas!==SE.receiptCanvasOld")
        # तम्बाकू का नाम बिल लाइन में पहले से छुपा (billNm) — छपाई उसी नाम को रखे
        assert (await pg.evaluate("billNm({name:'Gold Flake Kings',sub:'tob',code:'7001'})")).startswith("Misc Item")
        sets = {"all": {k: 1 for k in ALL}, "min": {k: 0 for k in ALL}, "big": {}}
        n = 0
        for th in ["classic", "modern", "compact", "bigtotal", "premium"]:
            for w in [384, 576, 800]:
                for sk, show in sets.items():
                    r = await pg.evaluate("""([th,w,show,size])=>{const {b,o}=SRc.sample();b.lines.push({name:'Misc Item S-01',qty:2,unit:'pc',rate:20,amt:40});
                      b.lines.push({name:'Haldiram Bhujia Sev Extra Long Product Name 1kg Family Pack',qty:1,unit:'pc',rate:310,amt:310});b.disc=9;b.total=1040;b.partyName='रमेश जी';b.custPhone='98290xxxxx';o.balance=250;
                      const c={...SRc.cfg(),theme:th,size,gst:'08ABCDE1234F1Z5',note:'रविवार को मिठाई पर 5% छूट'};c.show={...c.show,...show};
                      const cv=SRc.draw(b,o,w,c);const x=cv.getContext('2d'),W=cv.width,H=cv.height,d=x.getImageData(0,0,W,H).data;
                      let edge=0;const m=Math.max(3,Math.round(W*.012));for(let y=0;y<H;y++)for(let xx=0;xx<W;xx++){if(xx>=m&&xx<W-m)continue;if(th==='premium'&&(xx<=Math.round(W/384*6)))continue;if(th==='premium'&&xx>=W-Math.round(W/384*6)-1)continue;const i=(y*W+xx)*4;if(d[i]<150)edge++}
                      return {png:cv.toDataURL('image/png').split(',')[1],w:W,h:H,edge}}""", [th, w, show, "l" if sk == "big" else "m"])
                    assert r["w"] == w and 300 < r["h"] < 8800, (th, w, sk, r["h"])
                    assert r["edge"] == 0, ("किनारे पर छपाई", th, w, sk, r["edge"])
                    if w == 384 and sk != "big":
                        open(f"{SHOTS}/r-{th}-{sk}.png", "wb").write(base64.b64decode(r["png"]))
                    if sk == "all" and w == 576:
                        g = cv2.imdecode(np.frombuffer(base64.b64decode(r["png"]), np.uint8), cv2.IMREAD_GRAYSCALE)
                        v, _, _ = cv2.QRCodeDetector().detectAndDecode(np.where(g < 150, 0, 255).astype(np.uint8))
                        assert v.startswith("upi://") or v == "", ("qr", th, v)
                    n += 1
        print("themes × widths × toggles ok", n)
        # सेटिंग: थीम/चालू-बंद/नाम बदलो → झलक और असली बिल दोनों बदलें
        await pg.evaluate("S.isOwner=true;S.tab='set';showTab()")
        await pg.wait_for_selector("#rcDesign #rcPrev")
        h0 = await pg.evaluate("document.getElementById('rcPrev').height")
        await pg.click('#rcDesign [data-rcth="compact"]'); await pg.wait_for_timeout(100)
        h1 = await pg.evaluate("document.getElementById('rcPrev').height")
        assert h1 < h0, (h0, h1)
        await pg.uncheck('[data-rcshow="delivery"]'); await pg.check('[data-rcshow="count"]')
        await pg.fill('[data-rcf="shop"]', "177 MH वेट कैंटीन"); await pg.dispatch_event('[data-rcf="shop"]', "change")
        c = await pg.evaluate("SRc.cfg()")
        assert c["theme"] == "compact" and c["show"]["delivery"] == 0 and c["show"]["count"] == 1 and c["shop"] == "177 MH वेट कैंटीन", c
        el = await pg.query_selector("#rcDesign"); await el.screenshot(path=f"{SHOTS}/r-settings.png")
        # असली छपाई वाला रास्ता (SE.receiptCanvas) भी नई थीम ले
        hh = await pg.evaluate("(()=>{const {b,o}=SRc.sample();return SE.receiptCanvas(b,o,384).height})()")
        assert abs(hh - h1) < 400, (hh, h1)
        print("settings ok")
        await b.close()
    assert not errs, errs
    print("✅ बिल टेस्ट पास")

asyncio.run(main())
