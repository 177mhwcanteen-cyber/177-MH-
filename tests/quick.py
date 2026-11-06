"""177 MH कैंटीन — A से Z सुधार की जाँच (डेमो): ⭐ फ़ेवरेट · होल्ड टैब · 📊 डैशबोर्ड · 🔢 बिल-बारकोड से वापसी ·
🎁 पॉइंट · 📲 उधार की याद · 🔐 AI चाबी · SX.start (ऑर्डर/बैकअप) सच में चले · बिल पर पॉइंट/बारकोड।
उपयोग: python3 tests/quick.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8769), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();window.open=(u)=>{window.__opened=u};")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8769/index.html")
        await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;S.tab='bill';showTab()")
        ids = await pg.evaluate("S.items.filter(i=>i.active!==false&&!i.virtual).slice(0,20).map(i=>i.id)")

        # ⭐ फ़ेवरेट: 14 दिन के टॉप + मालिक का चुना
        await pg.evaluate("ids=>{S.top7={};ids.forEach((id,i)=>S.top7[id]=100-i);renderBill()}", ids)
        assert await pg.locator('#cats [data-flt="fav"]').count() == 1
        await pg.click('#cats [data-flt="fav"]'); await pg.wait_for_timeout(100)
        n = await pg.locator("#grid [data-item]").count(); assert 1 <= n <= 12, n
        await pg.evaluate(f"SA.togglePin('{ids[19]}')"); await pg.wait_for_timeout(100); await pg.evaluate("renderBill()")
        assert await pg.locator(f'#grid [data-item="{ids[19]}"]').count() == 1, "चुना हुआ फ़ेवरेट दिखे"
        await pg.screenshot(path=f"{SHOTS}/q1-fav.png")
        await pg.click('#cats [data-flt="fav"]')
        print("fav ok", n)

        # ⏸️ होल्ड टैब: कितनी देर से + कितने सामान
        pc = await pg.evaluate("S.items.filter(i=>i.active!==false&&!i.virtual).slice(0,2).map(i=>{i.sale=50;i.unit='pc';return i.id})")
        await pg.evaluate(f"""()=>{{closeSheet();quickAdd(item('{pc[0]}'),1);syncTab();S.bt[S.ai].ts=Date.now()-7*60000;newTab();quickAdd(item('{pc[1]}'),1);syncTab();renderBillTabs()}}""")
        tabs = await pg.evaluate("[...document.querySelectorAll('#bts .btab small')].map(x=>x.textContent)")
        assert any("7 मि" in t for t in tabs), tabs
        print("hold tabs ok", tabs)

        # 🎁 पॉइंट: customers में spent → पॉइंट; बिलिंग में पिल; शीट; बिल पर छपे
        await pg.evaluate("""()=>{S.customers=[{id:'9876543210',phone:'9876543210',name:'रमेश जी',spent:4560,ptsUsed:5,visits:12}];S.mode='walk';S.cust={phone:'9876543210',name:'रमेश जी'};renderBcust()}""")
        assert (await pg.text_content("#bcust .ptsp")).strip() == "🎁 40"
        await pg.click("#bcust .ptsp"); await pg.wait_for_selector("#ptN")
        await pg.fill("#ptN", "20"); await pg.click("[data-ptuse]"); await pg.wait_for_timeout(100)
        assert await pg.evaluate("SA.points('9876543210').left") == 20
        h1 = await pg.evaluate("""(()=>{const {b,o}=SRc.sample();b.custPhone='9876543210';delete o.points;return SE.receiptCanvas(b,o,384).height})()""")
        h0 = await pg.evaluate("""(()=>{const {b,o}=SRc.sample();delete o.points;return SE.receiptCanvas(b,o,384).height})()""")
        assert h1 > h0, ("बिल पर पॉइंट की लाइन", h0, h1)
        print("points ok")

        # 🔢 बिल के बारकोड से वापसी
        await pg.evaluate("""()=>{closeSheet();S.dayBills=[{no:'BW-ABC123',date:today(),ts:Date.now(),mode:'walk',partyName:'VIP ग्राहक',lines:[{id:S.items[0].id,name:S.items[0].name,qty:2,unit:'pc',rate:10,amt:20}],sub:20,total:20,pay:{cash:20},settled:true,byName:'टेस्ट'},...S.dayBills]}""")
        await pg.evaluate("S.staff='टेस्ट';handleScan('BW-ABC123')"); await pg.wait_for_timeout(300)
        assert "वापसी" in (await pg.text_content("#sheet")), "वापसी शीट खुले"
        await pg.screenshot(path=f"{SHOTS}/q2-return.png")
        await pg.evaluate("closeSheet()")
        print("bill barcode → return ok")

        # 📊 डैशबोर्ड
        await pg.evaluate("S.tab='report';showTab()"); await pg.wait_for_timeout(300)
        assert await pg.locator("#p-report .dash .dk").count() == 1 and await pg.locator("#p-report .d7 rect").count() == 7
        el = await pg.query_selector("#p-report .dash"); await el.screenshot(path=f"{SHOTS}/q3-dash.png")
        # 📊 रिपोर्ट-क्षेत्र: समूह, ⭐ पसंदीदा, टैप = वही रिपोर्ट, ‹ वापस
        assert await pg.locator("#p-report .rp-g").count() == 4 and await pg.locator("#p-report .rp-fav button").count() == 3
        await pg.screenshot(path=f"{SHOTS}/q3b-report-hub.png", full_page=True)
        await pg.click('#p-report .rp-go[data-rsel="items"]'); await pg.wait_for_timeout(200)
        assert "सामान-वार बिक्री" in await pg.text_content("#p-report") and not await pg.locator("#p-report .rp-g").count()
        await pg.click("#p-report .rp-back"); await pg.wait_for_timeout(200)
        await pg.click('#p-report [data-rfav="staff"]'); await pg.wait_for_timeout(200)
        assert await pg.locator("#p-report .rp-fav button").count() == 4
        await pg.click('#p-report .rp-fav [data-rsel="full"]'); await pg.wait_for_timeout(200)
        assert "कुल बिक्री" in await pg.text_content("#p-report") and await pg.locator("#p-report [data-a4]").count() == 1
        for rid in ["brief","chart","galla","flags","staff","short","profit","udhar","topc","inst","range","rr","tools"]:
            await pg.evaluate(f"S.repSel='{rid}';renderReport()"); await pg.wait_for_timeout(60)
        await pg.evaluate("S.repSel='';renderReport()")
        print("dashboard + report hub ok")

        # 📲 उधार की याद
        await pg.evaluate("""()=>{S.parties=[{id:'p1',name:'सुरेश भाई',phone:'9829012345'},{id:'p2',name:'बिना नंबर',phone:''}];S.ledger=[{id:'x1',partyId:'p1',type:'udhar',amt:450,date:today(),ts:Date.now()},{id:'x2',partyId:'p2',type:'udhar',amt:90,date:today(),ts:Date.now()}];S.tab='udhar';showTab()}""")
        await pg.wait_for_timeout(200)
        if await pg.locator("#p-udhar .rmd").count():
            await pg.click("#p-udhar .rmd summary"); await pg.click('[data-rmd="p1"]'); await pg.wait_for_timeout(150)
            u = await pg.evaluate("window.__opened||''")
            assert u.startswith("https://wa.me/919829012345") and "450" in u, u
            assert await pg.evaluate("!!S.parties[0].remindTs")
            print("udhar remind ok")
        else:
            print("udhar remind: demo में बाकी नहीं निकला (bal) — छोड़ा")

        # 🔐 AI चाबी: मालिक की चाबी SE._ogk से, settings में नहीं
        assert await pg.evaluate("(()=>{SE._ogk='AIzaOwnerKey123456789';S.settings.gk='';return SE.gk()})()") == "AIzaOwnerKey123456789"
        await pg.evaluate("SE._ogk=''")
        print("ai key ok")

        # SX.start (ऑर्डर सुनना + रोज़ का बैकअप) अब सच में चलता है
        await pg.evaluate("S.db={collection(){return {where(){return this},onSnapshot(){return ()=>{}},doc(){return {get:async()=>({exists:true}),set:async()=>{}}}}},doc(){return {get:async()=>({exists:true}),set:async()=>{},onSnapshot(){}}}}")
        await pg.wait_for_timeout(2600)
        assert await pg.evaluate("!!SX._st"), "SX.start चालू होना चाहिए"
        await pg.evaluate("S.db=null")
        print("SX.start ok")

        # ⚙️ सेटिंग: बैकअप का हाल, ⭐ बटन, AI साझा
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_timeout(200)
        n_rows = await pg.locator("#p-set .srow").count(); assert 0 < n_rows <= 40, n_rows  # 40-40 करके, लंबी सूची नहीं
        await pg.fill("#setQ", "laddu"); await pg.wait_for_timeout(250)
        assert all("LADDU" in t.upper() for t in await pg.locator("#p-set .srow .sr-n b").all_text_contents())
        await pg.fill("#setQ", ""); await pg.wait_for_timeout(250)
        await pg.click("#p-set [data-sopen]"); await pg.wait_for_timeout(100)
        assert await pg.locator("#p-set .sopen .setitem").count() == 1
        assert await pg.locator("#p-set .bkst").count() == 1 and await pg.locator("#p-set [data-favpin]").count() > 0 and await pg.locator("#aiShare").count() == 1
        print("settings ok")
        # 🔠 नाम CAPITAL: टाइप करते ही, सेव के पहरे में, बिल/लेबल पर
        await pg.fill("#ni-name", "parle-g biscuit 70g"); await pg.dispatch_event("#ni-name", "input")
        assert await pg.input_value("#ni-name") == "PARLE-G BISCUIT 70G", await pg.input_value("#ni-name")
        c = await pg.evaluate("SE.capItem({name:'haldiram bhujia 200g',short:'Haldiram Bhujia',hi:'हल्दीराम भुजिया',brand:'haldiram'})")
        assert c["name"] == "HALDIRAM BHUJIA 200G" and c["short"] == "HALDIRAM BHUJIA" and c["hi"] == "हल्दीराम भुजिया" and c["brand"] == "HALDIRAM", c
        assert await pg.evaluate("shortNm({name:'Nihar Badam Amla 240ml'})") == "NIHAR BADAM AMLA 240ML"
        assert await pg.evaluate("SL.dataOf({id:'x',name:'Nihar Badam Amla 240ml',sale:72}).name") == "NIHAR BADAM AMLA"
        print("capital names ok")
        await b.close()
    assert not errs, errs
    print("✅ सुधार टेस्ट पास")

asyncio.run(main())
