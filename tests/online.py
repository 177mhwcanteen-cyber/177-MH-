"""177 MH कैंटीन — 🛵 घर बैठे ऑर्डर की जाँच:
दुकान: तम्बाकू/छिपाए सामान सार्वजनिक सूची में कभी नहीं · स्टॉक है/नहीं · ऑर्डर शीट के कदम · सेटिंग।
ग्राहक-पेज (/order/): भाव आएँ · खोज/श्रेणी · ADD/[−+] · कार्ट · पता/लोकेशन · ऑर्डर भेजें (Firestore नियम के अंदर) · ट्रैकिंग।
उपयोग: python3 tests/online.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, json, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8770), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []


def fsv(v):  # Python → Firestore REST value
    if isinstance(v, bool): return {"booleanValue": v}
    if isinstance(v, int): return {"integerValue": str(v)}
    if isinstance(v, float): return {"doubleValue": v}
    if isinstance(v, str): return {"stringValue": v}
    if isinstance(v, list): return {"arrayValue": {"values": [fsv(x) for x in v]}}
    if isinstance(v, dict): return {"mapValue": {"fields": {k: fsv(x) for k, x in v.items()}}}
    return {"nullValue": None}


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", geolocation={"latitude": 25.7461, "longitude": 71.3926}, permissions=["geolocation"])
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append("app: " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append("app: " + m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();window.prompt=()=>'मनोहर';")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8770/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true")

        # ---------- दुकान: सार्वजनिक सूची ----------
        r = await pg.evaluate("""()=>{const A=S.items.filter(i=>i.active!==false&&!i.virtual);
          A.slice(5,25).forEach((x,k)=>{x.sale=20+k;delete x.track});
          A[0].sale=50;A[0].mrp=60;A[0].unit='pc';A[0].name='Parle-G Biscuit 100g';A[0].cat='kirana';A[0].track=true;S.pstock[A[0].id]={qty:12};
          A[1].sale=40;A[1].track=true;S.pstock[A[1].id]={qty:0};A[1].cat='kirana';
          A[2].sale=30;A[2].noOnline=true;
          A[3].sale=24;A[3].sub='tob';A[3].name='Gold Flake Kings';
          A[4].sale=10;A[4].name='Classic Cigarette';A[4].secret='S-07';
          const L=SON.list();return {ids:L.map(i=>i.id),a0:L.find(i=>i.id===A[0].id),a1:L.find(i=>i.id===A[1].id),hide:A[2].id,t1:A[3].id,t2:A[4].id,n:L.length}}""")
        assert r["t1"] not in r["ids"] and r["t2"] not in r["ids"], "🔒 तम्बाकू सार्वजनिक सूची में नहीं"
        assert r["hide"] not in r["ids"], "🌐 छिपाया सामान नहीं"
        assert r["a0"]["k"] == 1 and r["a1"]["k"] == 0 and r["a0"]["m"] == 60 and r["a0"]["n"] == "PARLE-G BISCUIT 100G", r["a0"]
        rates = await pg.evaluate("({items:SON.list(),cfg:{...SON.cfg(),phone:'9829000000',freeAbove:200,fee:20,min:0},ts:Date.now(),phone:'9829000000'})")
        print("public list ok", r["n"], "items, tobacco & hidden excluded")

        # ---------- दुकान: ऑर्डर शीट ----------
        await pg.evaluate("""()=>{SX.orders=[{id:'o1',name:'रमेश जी',phone:'9876543210',addr:'12/B JCO लाइन',note:'🛵|📱|⏰ अभी|📍25.74610,71.39260|₹170¦गेट पर फोन करें',status:'new',ts:Date.now()-5*60000,items:[{id:'x',n:'parle-g',q:2,u:'pc',s:50}]},
          {id:'o2',name:'सीमा जी',phone:'9876500000',addr:'दुकान से लेंगे',note:'🏪|💵|⏰ शाम 6-8|₹90¦',status:'pack',ts:Date.now()-20*60000,items:[{id:'y',n:'Besan Laddu',q:0.5,u:'kg',s:400}]}];SON.sheet()}""")
        txt = await pg.text_content("#sheet")
        assert "PARLE-G" in txt and "नक्शा" in txt and "गेट पर फोन करें" in txt and "📱 UPI" in txt and "✓ 15 मि" in txt and "ग्राहक ले गया" in txt, txt[:400]
        p0 = await pg.evaluate("SON.parse({note:'🛵|📱|⏰ अभी|📍25.7,71.3|₹170¦हाय'})")
        assert p0 == {"note": "हाय", "mode": "d", "pay": "UPI", "when": "अभी", "ll": "25.7,71.3", "total": 170}, p0
        h = await pg.evaluate("""(()=>{SON.accts=[{id:'a1',name:'Ramesh',phone:'9000012345',note:'👤|old:9876543210|ua:x',ts:Date.now()},{id:'a2',name:'Seema',phone:'9876500000',note:'👤|ua:x',ts:Date.now()-3600e3}];return SON.acctHTML()})()""")
        assert "नंबर बदला" in h and "9876543210" in h and "नया खाता" in h, h[:300]
        assert (await pg.evaluate("SON.parse({note:'🛵|💵|☎️9829011111|₹90¦'})"))["alt"] == "9829011111"
        await pg.screenshot(path=f"{SHOTS}/o1-shop-orders.png")
        await pg.evaluate("closeSheet()")
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_timeout(200)
        await pg.click("#p-set [data-sopen]"); await pg.wait_for_timeout(100)
        assert await pg.locator("#sonSet").count() == 1 and await pg.locator("#p-set [data-noonline]").count() > 0
        el = await pg.query_selector("#sonSet"); await el.screenshot(path=f"{SHOTS}/o2-settings.png")
        print("shop orders + settings ok")

        # ---------- ग्राहक-पेज ----------
        posted = {}
        signups = []
        track = {"st": "new"}

        async def fs(route):
            u, m = route.request.url, route.request.method
            if "/documents/pub/rates" in u:
                return await route.fulfill(json={"fields": {k: fsv(v) for k, v in rates.items()}})
            if m == "POST" and "/documents/orders" in u:
                body = json.loads(route.request.post_data)
                if body["fields"]["src"]["stringValue"] == "signup":
                    signups.append(body["fields"]); return await route.fulfill(json={"name": "projects/x/databases/(default)/documents/orders/Sg" + str(len(signups)), "fields": body["fields"]})
                posted.update(body)
                return await route.fulfill(json={"name": "projects/x/databases/(default)/documents/orders/AbCdEf123456", "fields": posted["fields"]})
            if "/documents/pub/ot_AbCdEf123456" in u:
                if track["st"] == "new": return await route.fulfill(status=404, json={})
                return await route.fulfill(json={"fields": {"st": fsv(track["st"]), "eta": fsv(1893456000000), "by": fsv("Manohar")}})
            return await route.fulfill(status=404, json={})
        c = await ctx.new_page()
        c.on("pageerror", lambda e: errs.append("page: " + str(e)))
        c.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append("page: " + m.text))
        await c.route("https://firestore.googleapis.com/**", fs)
        await c.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={firebase:{projectId:'mh177-canteen',apiKey:'k'},updateUrl:'https://177mhwcanteen-cyber.github.io/177-MH-/'};", content_type="application/javascript"))
        await c.goto("http://127.0.0.1:8770/order/"); await c.wait_for_selector("#wgo")
        # 👋 खाता: नाम + मोबाइल बिना सामान/भाव नहीं (धुंधला), भरोसे की लाइन
        assert await c.evaluate("document.body.classList.contains('locked')")
        assert "only to call you about your order" in await c.text_content(".safe")
        await c.screenshot(path=f"{SHOTS}/o0-welcome.png")
        await c.fill("#wnm", "Ramesh"); await c.fill("#wph", "12345"); await c.click("#wgo"); await c.wait_for_timeout(150)
        assert not signups, "गलत नंबर पर खाता नहीं"
        await c.fill("#wph", "98765 43210"); await c.click("#wgo"); await c.wait_for_timeout(300)
        assert len(signups) == 1 and signups[0]["phone"]["stringValue"] == "9876543210" and signups[0]["status"]["stringValue"] == "new"
        assert set(signups[0]) <= {"name", "phone", "addr", "note", "items", "ts", "status", "src"}
        assert not await c.evaluate("document.body.classList.contains('locked')")
        await c.wait_for_selector(".t")
        tiles = await c.locator(".t").count(); assert tiles > 3, tiles
        assert "GOLD FLAKE" not in (await c.text_content("#m")).upper() and "CLASSIC" not in (await c.text_content("#m")).upper()
        assert await c.locator(".t.out").count() == 0, "सिर्फ़ स्टॉक वाले चालू — ख़त्म वाला न दिखे"
        assert "Free delivery" in await c.text_content("#trust")
        await c.screenshot(path=f"{SHOTS}/o3-page.png")
        # खोज + ADD + स्टेपर
        await c.fill("#q", "parle"); await c.wait_for_timeout(100)
        assert await c.locator(".t").count() == 1
        await c.click(".t .add"); await c.click(".t [data-p]")
        assert "2" in await c.text_content(".t .stp span")
        assert not await c.locator("#cbar").is_hidden() and "₹100" in await c.text_content("#cbN")
        await c.fill("#q", ""); await c.wait_for_timeout(100)
        await c.screenshot(path=f"{SHOTS}/o4-added.png")
        # कार्ट
        await c.click("#cbar"); await c.wait_for_selector("#place")
        assert "₹20" in await c.text_content(".sheet") and "Delivery fee" in await c.text_content(".sheet"), "₹200 से कम — डिलीवरी शुल्क"
        await c.screenshot(path=f"{SHOTS}/o5-cart.png", full_page=False)
        await c.click("#place"); await c.wait_for_timeout(150)
        assert not posted, "बिना पता/लोकेशन ऑर्डर नहीं जाना चाहिए"
        assert "9876543210" in await c.text_content(".acc")
        await c.fill("#qt", "12/B"); await c.fill("#un", "177 MH"); await c.fill("#ad", "JCO Lines"); await c.fill("#alt", "9829011111")
        await c.click("#loc"); await c.wait_for_timeout(400)
        await c.click('[data-pay="u"]')
        await c.click("#place"); await c.wait_for_selector(".trk")
        f = posted["fields"]
        assert f["addr"]["stringValue"] == "Qtr 12/B · 177 MH · JCO Lines", f["addr"]
        assert "☎️9829011111" in f["note"]["stringValue"] and f["phone"]["stringValue"] == "9876543210"
        assert set(f) <= {"name", "phone", "addr", "note", "items", "ts", "status", "src"}, set(f)
        assert f["status"]["stringValue"] == "new" and f["phone"]["stringValue"] == "9876543210"
        assert len(f["note"]["stringValue"]) <= 200 and len(f["addr"]["stringValue"]) <= 80 and 0 < len(f["items"]["arrayValue"]["values"]) <= 40
        assert "📍25.74610,71.39260" in f["note"]["stringValue"] and "📱" in f["note"]["stringValue"], f["note"]
        await c.screenshot(path=f"{SHOTS}/o6-track.png")
        # दुकान ने स्वीकार किया → ट्रैकिंग में दिखे
        track["st"] = "acc"
        await c.click(".sheet .x"); await c.click("#myo"); await c.click("[data-trk]"); await c.wait_for_timeout(400)
        assert "Manohar" in await c.text_content(".trk") and await c.locator(".st.done").count() >= 1
        await c.screenshot(path=f"{SHOTS}/o7-track-acc.png")
        # फिर से मँगाएँ
        await c.click(".sheet .x"); await c.click("#myo"); await c.click("[data-again]"); await c.wait_for_timeout(150)
        assert not await c.locator("#cbar").is_hidden()
        # ✏️ नंबर बदला → दुकान को दोनों नंबर
        await c.click("[data-chacc2]"); await c.fill("#wph", "9000012345"); await c.click("#wgo"); await c.wait_for_timeout(300)
        assert len(signups) == 2 and "old:9876543210" in signups[1]["note"]["stringValue"] and signups[1]["phone"]["stringValue"] == "9000012345", signups[-1]
        # पुराना लिंक नए पेज पर
        o = await ctx.new_page(); await o.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await o.goto("http://127.0.0.1:8770/o.html"); await o.wait_for_timeout(600)
        assert o.url.endswith("/order/"), o.url
        print("customer page ok")
        await b.close()
    assert not errs, errs
    print("✅ ऑनलाइन दुकान टेस्ट पास")

asyncio.run(main())
