"""177 MH — 🛍️ एक ऑर्डर-पेज पर तीन दुकानें (/order/): 🛒 177 MH · 🥬 सब्ज़ी एक्सप्रेस · 🍛 मारवाड़ रसोई
जाँच: पहले "क्या मँगाना है?" (3 कार्ड) · सब्ज़ी के भाव सब्ज़ी एक्सप्रेस के pub/rates से (फोटो उसकी साइट से) · रसोई का मेन्यू rasoi.json ·
वेज/नॉन-वेज (Swiggy जैसा: पहली बार पूछे; वेज = सिर्फ़ वेज; नॉन-वेज = नॉन-वेज पहले + वेज) · कार्ट दुकान-वार ·
"ऑर्डर" = हर दुकान का अलग ऑर्डर (src web2 / web2:sabji / web2:rasoi, नोट में 🏬 और 🧺 समूह, डिलीवरी शुल्क एक बार) · ऐप में दुकान का ठप्पा + WhatsApp।
उपयोग: python3 tests/stores.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, json, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8793), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []


def fsv(v):
    if isinstance(v, bool): return {"booleanValue": v}
    if isinstance(v, int): return {"integerValue": str(v)}
    if isinstance(v, float): return {"doubleValue": v}
    if isinstance(v, str): return {"stringValue": v}
    if isinstance(v, list): return {"arrayValue": {"values": [fsv(x) for x in v]}}
    if isinstance(v, dict): return {"mapValue": {"fields": {k: fsv(x) for k, x in v.items()}}}
    return {"nullValue": None}


MH = {"items": [{"id": "a1", "n": "AMUL KOOL CAFE 200ML", "u": "pc", "s": 30, "c": "daily", "k": 1}, {"id": "a2", "n": "20-20 KAJU 250G", "u": "pc", "s": 320, "c": "kirana", "k": 1}],
      "cfg": {"on": True, "stockOnly": True, "fee": 20, "freeAbove": 0, "eta": 30, "open": "00:00", "close": "23:59", "del": True, "pick": True, "phone": "9829000000"}, "phone": "9829000000"}
SX = {"items": [{"id": "tamatar", "n": "टमाटर", "e": "Tomato", "u": "kg", "s": 30, "c": "sabzi", "p": "img/tamatar.jpg"}, {"id": "palak", "n": "पालक", "e": "Spinach", "u": "kg", "s": 40, "c": "patta"}, {"id": "seb", "n": "सेब", "e": "Apple", "u": "kg", "s": 160, "c": "fal"}]}


async def main():
    posted = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, service_workers="block")

        async def fs(route):
            u = route.request.url
            if "/projects/sabji-express-9a8f0/" in u and "/pub/rates" in u: return await route.fulfill(json={"fields": {k: fsv(v) for k, v in SX.items()}})
            if "/projects/mh177-canteen/" in u and "/pub/rates" in u: return await route.fulfill(json={"fields": {k: fsv(v) for k, v in MH.items()}})
            if u.split("?")[0].endswith("/documents/orders") and route.request.method == "POST":
                body = json.loads(route.request.post_data); posted.append(body["fields"])
                return await route.fulfill(json={"name": "projects/x/databases/(default)/documents/orders/O" + str(len(posted)), "fields": body["fields"]})
            return await route.fulfill(status=404, json={})
        c = await ctx.new_page()
        c.on("pageerror", lambda e: errs.append("page: " + str(e)))
        await c.route("https://firestore.googleapis.com/**", fs)
        await c.route("https://177mhwcanteen-cyber.github.io/**", lambda r: r.fulfill(status=404, body=""))
        await c.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={firebase:{projectId:'mh177-canteen',apiKey:'k'},stores:{sabji:{pid:'sabji-express-9a8f0',key:'s',base:'https://177mhwcanteen-cyber.github.io/sabji-express-app/'}}};", content_type="application/javascript"))
        await c.add_init_script("if(!localStorage.getItem('mh_acc'))localStorage.setItem('mh_acc',JSON.stringify({nm:'Ramesh',ph:'9876543210'}));localStorage.setItem('mh_me',JSON.stringify({nm:'Ramesh',ph:'9876543210',ll:'25.7461,71.3926'}))")
        await c.goto("http://127.0.0.1:8793/order/"); await c.wait_for_timeout(1500)

        # 1) पहले "क्या मँगाना है?" — तीन दुकानें
        assert await c.locator(".chc").count() == 3, await c.inner_text("#m")
        t = await c.inner_text("#m")
        assert "Vegetables" in t and "Restaurant" in t and "Grocery" in t, t
        await c.screenshot(path=f"{SHOTS}/st1-chooser.png")
        # 2) 🥬 सब्ज़ी: सब्ज़ी एक्सप्रेस के भाव, फोटो उसकी साइट से
        await c.click('.chc[data-st="sabji"]'); await c.wait_for_timeout(300)
        t = await c.inner_text("#m")
        assert "TOMATO" in t and "SPINACH" in t and "APPLE" in t and "KOOL" not in t, t
        assert "sabji-express-app/img/tamatar.jpg" in await c.evaluate("document.querySelector('#m').innerHTML")
        assert await c.locator('#stores [data-st]').count() == 3
        await c.click('#m [data-p="sx-tamatar"]'); await c.wait_for_timeout(150)
        # 3) 🍛 रसोई: पहली बार वेज/नॉन-वेज पूछे
        await c.click('#stores [data-st="rasoi"]'); await c.wait_for_timeout(400)
        assert await c.locator("#ov .va [data-veg]").count() == 2, "वेज/नॉन-वेज पूछा"
        await c.screenshot(path=f"{SHOTS}/st2-vegask.png")
        await c.click('#ov [data-veg="nonveg"]'); await c.wait_for_timeout(300)
        first = await c.evaluate("document.querySelector('#m .sec').textContent")
        assert "Non-Veg" in first, first  # नॉन-वेज वाले को नॉन-वेज पहले
        assert await c.locator("#m .vd.nv").count() > 10 and await c.locator("#m .vd.v").count() > 10
        await c.screenshot(path=f"{SHOTS}/st3-rasoi-nonveg.png")
        await c.click('#vegbar [data-veg="veg"]'); await c.wait_for_timeout(300)
        assert await c.locator("#m .vd.nv").count() == 0 and await c.locator("#m .vd.v").count() >= 30, "वेज = सिर्फ़ वेज"
        assert "Biryani" not in (await c.inner_text("#cats")) or "Rice" in (await c.inner_text("#cats"))
        await c.screenshot(path=f"{SHOTS}/st4-rasoi-veg.png")
        await c.click('#m [data-p="rs-shahi-paneer"]'); await c.click('#m [data-p="rs-butter-naan"]'); await c.click('#m [data-p="rs-butter-naan"]'); await c.wait_for_timeout(150)
        # 4) 🛒 किराना
        await c.click('#stores [data-st="mh"]'); await c.wait_for_timeout(300)
        assert "KOOL" in await c.inner_text("#m") and "TOMATO" not in await c.inner_text("#m")
        await c.click('#m [data-p="a1"]'); await c.wait_for_timeout(150)
        assert "4 items" in await c.inner_text("#cbar")
        # 5) कार्ट: दुकान-वार
        await c.click("#cbar"); await c.wait_for_timeout(300)
        assert await c.locator("#ov .csh").count() == 3 and "3 shops" in await c.inner_text("#ov")
        await c.screenshot(path=f"{SHOTS}/st5-cart.png", full_page=True)
        if await c.locator("#qt").count(): await c.fill("#qt", "12/B")
        await c.click("#place"); await c.wait_for_timeout(1500)
        assert len(posted) == 3, posted
        src = sorted(x["src"]["stringValue"] for x in posted)
        assert src == ["web2", "web2:rasoi", "web2:sabji"], src
        for x in posted:
            assert set(x) <= {"name", "phone", "addr", "note", "items", "ts", "status", "src"}, "Firestore नियम वाले खाने ही"
            n = x["note"]["stringValue"]; assert "🧺" in n and "/3" in n, n
        rs = [x for x in posted if x["src"]["stringValue"] == "web2:rasoi"][0]
        assert "🏬rasoi" in rs["note"]["stringValue"] and "₹300" in rs["note"]["stringValue"], rs["note"]  # 210 + 2×45, शुल्क नहीं (पहले वाले पर)
        mh = [x for x in posted if x["src"]["stringValue"] == "web2"][0]
        assert "₹50" in mh["note"]["stringValue"], mh["note"]  # 30 + 20 डिलीवरी शुल्क एक बार
        assert len(json.loads(await c.evaluate("localStorage.getItem('mh_orders')"))) == 3
        # 6) दुकान का ऐप: ऑर्डर-कार्ड पर दुकान का ठप्पा, 🧺 समूह, "सब्ज़ी को भेजें" WhatsApp, बिल; 🌐 ऑनलाइन मेन्यू
        MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read()
        a = await ctx.new_page(); a.on("pageerror", lambda e: errs.append("app: " + str(e)))
        await a.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await a.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await a.route("https://firestore.googleapis.com/**", fs)
        await a.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={stores:{sabji:{pid:'sabji-express-9a8f0',key:'s',base:'https://x/'}}};", content_type="application/javascript"))
        await a.goto("http://127.0.0.1:8793/index.html"); await a.wait_for_timeout(1500)
        await a.evaluate("S.isOwner=true;S.demo=false;S.settings={...S.settings,online:{stores:{sabji:{ph:'9829011111'}}}};0")
        sx = [x for x in posted if x["src"]["stringValue"] == "web2:sabji"][0]
        o = {"id": "s1", "name": "Ramesh", "phone": "9876543210", "addr": "12/B", "src": "web2:sabji", "status": "new", "ts": 1, "note": sx["note"]["stringValue"],
             "items": [{"id": "sx-tamatar", "n": "TOMATO", "q": 0.25, "u": "kg", "s": 30}]}
        await a.evaluate("o=>{SX.orders=[o];SON.sheet()}", o); await a.wait_for_timeout(200)
        t = await a.inner_text("#sheet")
        assert "सब्ज़ी एक्सप्रेस" in t and "को भेजें" in t and "3 ऑर्डर" in t, t[:400]
        h = await a.evaluate("document.querySelector('#sheet').innerHTML")
        assert "wa.me/919829011111" in h and "data-sxobill" not in h, "सब्ज़ी का ऑर्डर उसी के नंबर पर, MH बिल नहीं"
        assert "TOMATO" in await a.evaluate("o=>SON.storeText(o)", o)
        await a.evaluate("SON._mt='rasoi';SON.menuSheet()"); await a.wait_for_timeout(1200)
        t = await a.inner_text("#sheet")
        assert "ऑनलाइन मेन्यू" in t and "KADAI CHICKEN" in t and "60 आइटम" in t, t[:300]
        await a.evaluate("SON._mt='sabji';SON.menus.ts=0;SON.menuSheet()"); await a.wait_for_timeout(1200)
        assert "TOMATO" in await a.inner_text("#sheet")
        assert "omenu" in await a.evaluate("SMN.acts().map(x=>x.k)")
        await b.close()
    bad = [e for e in errs if "Failed to load" not in e]
    assert not bad, bad
    print("✅ तीन-दुकान ऑर्डर-पेज टेस्ट पास")

asyncio.run(main())
