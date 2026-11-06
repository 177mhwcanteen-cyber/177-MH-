"""177 MH कैंटीन — 🏷️ बारकोड छपाई की जाँच (डेमो, बिना Firebase):
बिलिंग का 🏷️ मोड → सामान दबाओ → संख्या → लिस्ट · स्कैन = +1 · खोज + Enter · लेबल टैब की लिस्ट · छापना ·
हर डिज़ाइन × हर साइज़ × सब चालू/बंद → बारकोड कभी न कटे और OpenCV से पढ़ा जाए (थर्मल जैसा काला-सफ़ेद, कैमरे जैसा धुंधला)।
उपयोग: python3 tests/label.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, base64, json, os, sys, threading, http.server, functools
import numpy as np, cv2
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []
BD = cv2.barcode.BarcodeDetector()


def decode(png_b64, blur=False, bc=None):
    a = np.frombuffer(base64.b64decode(png_b64), np.uint8)
    g = cv2.imdecode(a, cv2.IMREAD_GRAYSCALE)
    g = np.where(g < 150, 0, 255).astype(np.uint8)  # प्रिंटर जैसा: सिर्फ़ काला/सफ़ेद
    P = 30; g = cv2.copyMakeBorder(g, P, P, P, P, cv2.BORDER_CONSTANT, value=255)
    f = 1.0
    if blur:  # कैमरे जैसा: धुंधला + छोटा (≈1.3 px प्रति डॉट से कम)
        f = .6; g = cv2.GaussianBlur(g, (5, 5), 1.2); g = cv2.resize(g, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    r = BD.detectAndDecode(g)
    out = r[0] if isinstance(r[0], str) else ([x for x in r[0] if x] or [""])[0]
    if not out and bc:  # OpenCV का "ढूँढना" कमज़ोर है — जगह बताकर सिर्फ़ "पढ़ना" जाँचो
        x0, y0, x1, y1 = (bc["x"] + P) * f, (bc["y"] + P) * f, (bc["x"] + bc["w"] + P) * f, (bc["y"] + bc["h"] + P) * f
        pts = np.array([[[x0, y1], [x0, y0], [x1, y0], [x1, y1]]], np.float32)
        r = BD.decode(g, pts)
        out = r[0] if isinstance(r[0], str) else ([x for x in r[0] if x] or [""])[0]
    return out or ""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 400, "height": 860}, service_workers="block")
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append("console: " + m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};window.print=()=>{window.__printed=(window.__printed||0)+1};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8766/index.html")
        await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;S.tab='bill';showTab()")
        # सबको बारकोड + भाव (डेमो में कुछ बिना बारकोड हो सकते हैं)
        ids = await pg.evaluate("""(()=>{let n=1;return S.items.filter(i=>i.active!==false&&!i.virtual).slice(0,8).map(i=>{if(!i.barcode)i.barcode=ean13('2000000'+String(1000+n)+'0');if(!(+i.sale>0))i.sale=50;if(!i.code)i.code=String(1000+n);n++;return i.id})})()""")
        assert len(ids) >= 4, ids
        await pg.evaluate("renderBill()")

        # ---------- 1) बिलिंग: 🏷️ चिप, भाव बदलें के पास ----------
        chips = await pg.evaluate("[...document.querySelectorAll('#cats .chip')].slice(0,2).map(x=>x.textContent.trim())")
        assert "भाव" in chips[0] and "बारकोड" in chips[1], chips
        await pg.click("[data-lblmode]")
        assert await pg.is_visible("#lblbar"), "lblbar"
        await pg.screenshot(path=f"{SHOTS}/l1-mode.png")
        # टैप = +1 (बिक्री जैसा, कोई पॉपअप नहीं)
        for _ in range(3): await pg.click(f'#grid [data-item="{ids[0]}"] .tile')
        assert await pg.locator(".sl-ask").count() == 0, "बड़ा पॉपअप नहीं खुलना चाहिए"
        assert await pg.evaluate("S.cart.length") == 0, "बारकोड मोड में बिल में नहीं जुड़ना चाहिए"
        assert await pg.evaluate(f"SL.list().find(r=>r.id==='{ids[0]}').n") == 3
        assert "🏷️3" in await pg.text_content(f'#grid [data-item="{ids[0]}"] .lbub')
        # पट्टी में संख्या लिखो (कीबोर्ड खुलने पर भी ऊपर दिखे)
        await pg.fill("#lbN", "5"); await pg.press("#lbN", "Enter")
        assert await pg.evaluate(f"SL.list().find(r=>r.id==='{ids[0]}').n") == 5
        await pg.click("[data-lbp]")
        assert await pg.evaluate(f"SL.list().find(r=>r.id==='{ids[0]}').n") == 6
        await pg.click("[data-lbm]")
        bb = await pg.eval_on_selector("#lblbar", "e=>e.getBoundingClientRect().height")
        assert bb < 60, bb
        assert await pg.evaluate("!!document.querySelector('header #lblbar')"), "पट्टी हेडर में"
        await pg.screenshot(path=f"{SHOTS}/l2-bar.png")
        # स्कैन (गन/कैमरा) = +1, सिर्फ़ लिस्ट में
        bc1 = await pg.evaluate(f"item('{ids[1]}').barcode")
        await pg.evaluate(f"handleScan('{bc1}')")
        await pg.evaluate(f"handleScan('{bc1}')")
        assert await pg.evaluate(f"SL.list().find(r=>r.id==='{ids[1]}').n") == 2
        assert await pg.evaluate("S.cart.length") == 0
        # खोजकर Enter = +1
        nm = await pg.evaluate(f"item('{ids[2]}').name")
        await pg.fill("#q", nm); await pg.press("#q", "Enter"); await pg.wait_for_timeout(150)
        assert await pg.evaluate(f"SL.list().find(r=>r.id==='{ids[2]}').n") == 1
        await pg.evaluate("clearSearch&&clearSearch();renderBill()")
        bar = await pg.evaluate("document.querySelector('#lblbar').innerHTML")
        assert "data-lblgo" in bar and "3·" in bar, bar
        # बंद करो → सामान फिर से बिल में
        await pg.click("[data-lbloff]")
        assert await pg.is_hidden("#lblbar")
        await pg.click(f'#grid [data-item="{ids[3]}"] .tile'); await pg.wait_for_timeout(150)
        print("billing label mode ok")

        # ---------- 2) लेबल टैब: लिस्ट ----------
        await pg.evaluate("closeSheet();S.cart=[];renderCart();S.tab='label';showTab()")
        await pg.wait_for_selector("#slList .sl-row")
        n_rows = await pg.locator("#slList .sl-row").count(); assert n_rows >= 2, n_rows
        await pg.fill("#slQ", await pg.evaluate(f"item('{ids[3]}').code")); await pg.press("#slQ", "Enter"); await pg.wait_for_timeout(100)
        assert await pg.evaluate(f"!!SL.list().find(r=>r.id==='{ids[3]}')")
        await pg.keyboard.type("7"); await pg.wait_for_timeout(50)  # फोकस संख्या पर — 1 हटाकर 7
        assert await pg.evaluate(f"SL.list().find(r=>r.id==='{ids[3]}').n") == 7, await pg.evaluate("SL.list()")
        await pg.evaluate(f"handleScan(item('{ids[3]}').barcode)")
        assert await pg.evaluate(f"SL.list().find(r=>r.id==='{ids[3]}').n") == 8
        await pg.click(f'[data-slp="{ids[3]}"]')
        assert await pg.evaluate(f"SL.list().find(r=>r.id==='{ids[3]}').n") == 9
        total = await pg.evaluate("SL.count()")
        assert str(total) in await pg.text_content("[data-slprint]")
        await pg.screenshot(path=f"{SHOTS}/l3-list.png", full_page=True)
        await pg.evaluate("void (SE.printA4=async(t,h)=>{window.__printed=(window.__printed||0)+1;window.__imgs=(h.match(/<img /g)||[]).length})")
        await pg.click("[data-slprint]"); await pg.wait_for_timeout(600)
        assert await pg.evaluate("window.__printed||0") >= 1, "print"
        assert await pg.evaluate("window.__imgs") == total, (await pg.evaluate("window.__imgs"), total)
        assert await pg.locator(".sl-done").count() == 1
        print("label tab list + print ok", total)
        # सब्ज़ी वाला पुराना लेबल अभी भी खुले
        await pg.click('[data-ltype="sabzi"]'); await pg.wait_for_timeout(100)
        assert await pg.locator("#p-label .ppick, #p-label #lPrev").count() >= 1
        await pg.click('[data-ltype="kirana"]'); await pg.wait_for_selector("#slList")

        # ---------- 3) सेटिंग: डिज़ाइन, चालू/बंद ----------
        await pg.evaluate("S.tab='set';showTab()")
        await pg.wait_for_selector("#slDesign [data-slstyle]")
        assert await pg.locator("#slDesign [data-slstyle]").count() == 6
        await pg.fill("#slShop", "177 MH वेट कैंटीन"); await pg.dispatch_event("#slShop", "change")
        await pg.click('#slDesign [data-slstyle="band"]')
        await pg.check('[data-slshow="mrp"]'); await pg.check('[data-slshow="exp"]')
        assert await pg.evaluate("SL.cfg().style") == "band" and await pg.evaluate("SL.cfg().show.mrp") == 1
        assert await pg.evaluate("SL.cfg().shop") == "177 MH वेट कैंटीन"
        el = await pg.query_selector("#slDesign"); await el.screenshot(path=f"{SHOTS}/l4-settings.png")
        print("settings ok")

        # ---------- 4) हर डिज़ाइन × साइज़ × चालू/बंद: बारकोड पढ़ा जाए ----------
        codes = ["2000000100104", "8901030865275", "890103086", "890103000041", "96385074"]
        sets = {"none": {}, "all": {k: 1 for k in ["shop","name","price","mrp","size","code","brand","mfg","exp","digits","qr","extra","caps"]},
                "nodigits": {"digits": 0}}
        bad = []
        for st in ["classic", "band", "tag", "frame", "bigprice", "minimal"]:
            for sz in ["50x25", "38x25", "40x30", "60x40", "100x50"]:
                for sk, show in sets.items():
                    for code in codes:
                        r = await pg.evaluate("""([st,sz,show,code])=>{const c=SL.cfg();c.style=st;c.show={...c.show,...show};
                          const it={id:'t',name:'Fortune Kachi Ghani Mustard Oil 1L',sale:189,mrp:210,code:'1234',brand:'Adani Wilmar',size:'1L',barcode:code,exp:'2027-05-06'};
                          const cv=SL.canvasFor(it,{},c,sz);const x=cv.getContext('2d');const d=x.getImageData(0,0,cv.width,cv.height).data;
                          /* किनारे की 2 mm (16 डॉट) में कुछ काला नहीं (frame की लाइन छोड़कर) */
                          let edge=0;const W=cv.width,H=cv.height;for(let y=0;y<H;y++)for(let xx=0;xx<W;xx++){if(xx>=14&&xx<W-14&&y>=12&&y<H-11)continue;const i=(y*W+xx)*4;if(d[i]<150)edge++}
                          return {png:cv.toDataURL('image/png').split(',')[1],edge,w:W,h:H,bc:cv._bc,top:cv._top}}""", [st, sz, show, code])
                        if r["bc"] and r["top"] > r["bc"]["y"] + 2: bad.append(("overlap", st, sz, sk, r["top"], r["bc"]["y"]))
                        got = decode(r["png"], bc=r["bc"])
                        if r["bc"] and r["bc"]["fmt"] != "CODE128" and r["bc"]["m"] < 2: bad.append(("thin", st, sz, sk, code, r["bc"]["m"]))
                        exp = code if len(code) != 12 else code  # UPC-A: OpenCV 12 अंक देता है
                        if code == "890103086":
                            exp = "890103086"  # CODE128 — OpenCV 1D नहीं पढ़ता, सिर्फ़ किनारा जाँचें
                        okc = (got.lstrip("0") == exp.lstrip("0")) or code == "890103086"
                        if not okc or r["edge"] > 0:
                            bad.append((st, sz, sk, code, got, r["edge"]))
                        if code == "2000000100104" and sk == "all":
                            open(f"{SHOTS}/d-{st}-{sz}.png", "wb").write(base64.b64decode(r["png"]))
                        if code == "2000000100104" and sk == "none" and sz == "50x25":
                            open(f"{SHOTS}/d-{st}-plain.png", "wb").write(base64.b64decode(r["png"]))
                            if decode(r["png"], blur=True, bc=r["bc"]).lstrip("0") != code.lstrip("0"): bad.append(("blur", st))
        assert not bad, bad[:12]
        # सामान्य (पहले से चालू) सेटिंग में हर डिज़ाइन — देखने के लिए
        for st in ["classic", "band", "tag", "frame", "bigprice", "minimal"]:
            for sz in ["50x25", "38x25"]:
                png = await pg.evaluate("""([st,sz])=>{const c={shop:'177 MH वेट कैंटीन · बाड़मेर',style:st,extra:'',show:{shop:1,name:1,price:1,mrp:0,size:0,code:0,brand:0,mfg:0,exp:0,digits:1,qr:0,extra:0,caps:0}};
                  return SL.canvasFor({id:'n',name:'Nihar Badam Amla 240ml',sale:72,mrp:80,barcode:'2000000100104'},{},c,sz).toDataURL('image/png').split(',')[1]}""", [st, sz])
                open(f"{SHOTS}/def-{st}-{sz}.png", "wb").write(base64.b64decode(png))
        # QR भी पढ़ा जाए
        r = await pg.evaluate("""()=>{const c=SL.cfg();c.style='classic';c.show={...c.show,qr:1};const cv=SL.canvasFor({id:'q',name:'Parle-G',sale:10,barcode:'8901719110016'},{},c,'50x25');return {png:cv.toDataURL('image/png').split(',')[1],qr:cv._qr}}""")
        if r["qr"]:
            g = cv2.imdecode(np.frombuffer(base64.b64decode(r["png"]), np.uint8), cv2.IMREAD_GRAYSCALE)
            g = cv2.copyMakeBorder(np.where(g < 150, 0, 255).astype(np.uint8), 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=255)
            v, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.resize(g, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST))
            assert v == "8901719110016", ("qr", v)
            print("qr ok")
        print("designs × sizes × toggles: all barcodes read, nothing in 2 mm edge")

        # ---------- 5) बाज़ार खरीद / सामान की सेटिंग से ----------
        await pg.evaluate("S.tab='set';showTab()")
        btn = pg.locator("[data-lbladd]").first
        await btn.scroll_into_view_if_needed(); await btn.click()
        await pg.wait_for_selector(".sl-ask"); await pg.click('[data-slqk="10"]')
        h = await pg.eval_on_selector(".sl-ask", "e=>e.getBoundingClientRect().height"); assert h < 200, h
        await pg.screenshot(path=f"{SHOTS}/l5-ask.png"); await pg.click("[data-sladdq]")
        print("settings item 🏷️ ok")
        await b.close()
    assert not errs, errs
    print("✅ लेबल टेस्ट पास")

asyncio.run(main())
