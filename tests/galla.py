"""177 MH कैंटीन — 💵 गल्ला-प्रबंधन + 🪙 खुले का डिब्बा + 🚫 बिना स्टॉक बिक्री + 📦 कार्टून खरीद + 🔢 4 अंक कोड + 🧮 बिल पर गिनती + 📋 खरीद-नकल
उपयोग: python3 tests/galla.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, json, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8785), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8785/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;S.demo=false;S.db=firebase.firestore();S.uid='own';S.staff='विक्रम जी';S.billsDate=today()")

        # 🔢 4 अंक कोड: हर किस्म में 4 अंक, कभी दोहरा नहीं, भरा हिस्सा हो तो अगला
        r = await pg.evaluate("""(()=>{const a=nextCode('kirana'),b=nextCode('mithai'),c=nextCode('stationery');
          const used=[];for(let n=1001;n<=1999;n++)used.push(String(n));const d=nextCode('kirana',used);return [a,b,c,d]})()""")
        assert all(len(x) == 4 for x in r) and r[1].startswith("5") and r[2].startswith("8") and not r[3].startswith("1"), r
        assert await pg.evaluate("(()=>{const u=new Set(S.items.map(i=>String(i.code)));return !u.has(nextCode('kirana'))})()")

        # 🪙 खुले का डिब्बा: सेट → ₹500 के खुले दिए (रकम वही) → ग़लत (बराबर नहीं) रुके → कम खुले की चेतावनी → रिफिल
        ok = await pg.evaluate("SKH.init().then(()=>SKH.setBox({100:30,50:60,20:100,10:20,5:60,2:50,1:100},{100:30,50:60,20:100,10:150,5:60,2:50,1:100}))")
        assert ok and await pg.evaluate("SKH.total()") == 8700, await pg.evaluate("SKH.total()")
        low = await pg.evaluate("SKH.low().map(x=>x.v)"); assert low == [10], low  # 20 < 150×30%
        assert await pg.evaluate("SKH.move({500:1},{50:10},'khula','ग्राहक')") is True
        c = await pg.evaluate("SKH.cur()"); assert c["500"] == 1 and c["50"] == 50 and await pg.evaluate("SKH.total()") == 8700, c
        assert await pg.evaluate("SKH.move({500:1},{50:9},'khula','')") is False  # 500 ≠ 450
        assert await pg.evaluate("SKH.move({100:1},{1:200},'khula','')") is False  # डिब्बे में इतने नहीं
        mk = await pg.evaluate("window.__MOCK__['days/'+today()+'/meta']['khula']"); assert mk["n50"] == 50 and mk["n500"] == 1, mk
        assert await pg.evaluate("SKH.move({10:100},{500:1,100:5},'krefill','SBI')") is True
        assert await pg.evaluate("SKH.low().length") == 0 and await pg.evaluate("SKH.total()") == 8700
        # शीट: एक-टैप ₹500 → 5×₹100, बराबर दिखे, सेव
        await pg.evaluate("SKH.sheet('give')"); await pg.wait_for_timeout(200)
        await pg.click("[data-skq]"); await pg.wait_for_timeout(100)
        assert "✅ बराबर" in await pg.inner_text(".skh-sh")
        await pg.screenshot(path=f"{SHOTS}/1-khula-sheet.png")
        await pg.click("[data-skhsave]"); await pg.wait_for_timeout(300)
        assert await pg.evaluate("SKH.total()") == 8700
        kh = await pg.evaluate("S.galla.filter(g=>g.kind==='khula'||g.kind==='krefill'||g.kind==='kset').length")
        assert kh >= 1 or len(await pg.evaluate("Object.keys(window.__MOCK__['days/'+today()+'/galla']||{})")) >= 4

        # 📤 निकासी: नाम + काम ज़रूरी, मालिक "✓ क्लियर", 30 दिन की सूची
        await pg.evaluate("closeSheet();S.staff='मनोहर जी';S.isOwner=false;S.uid='u2'")
        await pg.evaluate("SG.sheet('out')"); await pg.wait_for_timeout(200)
        await pg.click('[data-sgto="🙋 साथी ने अपने लिए लिया"]'); await pg.wait_for_timeout(100)
        await pg.fill("#sgAmt", "500"); await pg.click("[data-sgsave]"); await pg.wait_for_timeout(200)
        assert "नाम" in await pg.text_content("#toast")
        await pg.fill("#sgPer", "मुकेश भाई"); await pg.click("[data-sgsave]"); await pg.wait_for_timeout(200)
        assert "किस लिए" in await pg.text_content("#toast")
        await pg.fill("#sgNote", "घर का काम"); await pg.click("[data-sgsave]"); await pg.wait_for_timeout(400)
        G = await pg.evaluate("window.__MOCK__['days/'+today()+'/galla']")
        o = [g for g in G.values() if g.get("kind") == "out"]; assert o and o[0]["person"] == "मुकेश भाई" and o[0]["note"] == "घर का काम", o
        await pg.evaluate("S.galla=Object.entries(window.__MOCK__['days/'+today()+'/galla']).map(([id,v])=>({id,...v}));S.isOwner=true;S.uid='own'")
        assert "क्लियर बाकी: मुकेश भाई" in await pg.evaluate("SG.ownerLine()")
        assert "क्लियर बाकी" in await pg.evaluate("SG.pingText()")
        assert await pg.evaluate("SG.ownerPing(true)") is True
        await pg.evaluate("S.tab='day';showTab()"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"{SHOTS}/2-galla-day.png", full_page=True)
        dh = await pg.evaluate("SG.dayHTML()"); assert "खुले का डिब्बा" in dh and "data-sgwho" in dh and "data-sgok" in dh
        await pg.evaluate("SG.whoSheet()"); await pg.wait_for_timeout(600)
        t = await pg.inner_text("#sgWho"); assert "मुकेश भाई" in t and "क्लियर बाकी" in t, t[:300]
        await pg.screenshot(path=f"{SHOTS}/3-who.png")
        await pg.click("#sgWho [data-sgok]"); await pg.wait_for_timeout(600)
        assert all(g.get("ok") for g in (await pg.evaluate("window.__MOCK__['days/'+today()+'/galla']")).values() if g.get("kind") == "out")
        await pg.evaluate("closeSheet()")

        # 🚫 बिना स्टॉक बिक्री: बिल बनता है, लाइन पर ns, रिपोर्ट में
        await pg.evaluate("""(()=>{const it={id:'t-ns',name:'TEST NS ITEM',short:'TEST NS',unit:'pc',cat:'kirana',sale:10,mrp:10,cost:8,code:'1999',active:true};S.items.push(it);it.track=true;S.pstock[it.id]={qty:1};S.settings.live={ts:1};window.__it=it.id})()""")
        await pg.evaluate("S.tab='bill';showTab()"); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{const it=item(window.__it);S.cart=[{id:it.id,name:it.name,unit:it.unit,qty:3,rate:+it.sale,board:+it.sale,cost:+it.cost||0,amt:3*it.sale}];})()")
        await pg.evaluate("renderCart()"); await pg.click("#cartbtn"); await pg.wait_for_timeout(1500)
        B = await pg.evaluate("Object.values(window.__MOCK__['days/'+today()+'/bills']||{})")
        ln = [l for b in B for l in b.get("lines", []) if l.get("id") == await pg.evaluate("window.__it")]
        assert ln and ln[0].get("ns") == 1, ln
        await pg.evaluate("S.dayBills=Object.values(window.__MOCK__['days/'+today()+'/bills']);S.repDate=today();S.tab='report';showTab()"); await pg.wait_for_timeout(400)
        assert "बिना स्टॉक बिके" in await pg.inner_text("#p-report")

        # 🧮 बिल पर "कुल सामान · कुल नग" (पुरानी बंद सेटिंग भी एक बार चालू)
        await pg.evaluate("S.settings.rcpt={show:{count:0}}")
        assert await pg.evaluate("SRc.cfg().show.count") == 1
        await pg.evaluate("S.settings.rcpt={show:{count:0},cnt9:1}")
        assert await pg.evaluate("SRc.cfg().show.count") == 0
        await pg.evaluate("delete S.settings.rcpt")

        # 📦 कार्टून खरीद: 5 कार्टून × 24, ₹480/कार्टून → 120 पीस @ ₹20
        await pg.evaluate("S.tab='kharid';showTab()"); await pg.wait_for_timeout(400)
        pid = await pg.evaluate("(S.items.push({id:'t-ct',name:'TEST COLD DRINK 250ML',unit:'pc',cat:'kirana',sale:20,mrp:20,cost:0,code:'1998',active:true}),'t-ct')")
        await pg.evaluate("closeSheet()"); await pg.evaluate(f"SF.scanAdd(item('{pid}'))"); await pg.wait_for_timeout(300)
        assert await pg.locator("[data-pict='1']").count(), "कार्टून बटन नहीं"
        await pg.click("[data-pict='1']"); await pg.fill("#piC", "24"); await pg.fill("#piQ", "5"); await pg.fill("#piR", "480"); await pg.wait_for_timeout(100)
        bt = await pg.inner_text("[data-pisave]"); assert "120 पीस" in bt and "₹20/पीस" in bt and "₹2,400" in bt, bt
        await pg.screenshot(path=f"{SHOTS}/4-carton.png")
        await pg.click("[data-pisave]"); await pg.wait_for_timeout(300)
        L = await pg.evaluate("JSON.parse(localStorage.getItem('se_pdraft')).lines")
        assert L[-1]["qty"] == 120 and L[-1]["rate"] == 20 and L[-1]["ctn"]["per"] == 24, L[-1]
        assert await pg.evaluate(f"localStorage.getItem('mk_per_{pid}')") == "24"

        # 📋 ऐप की खरीद → Claude (कोड)
        await pg.evaluate("S.purch=[{id:'p1',date:today(),ts:Date.now(),supName:'X',total:2400,byName:'मनोहर जी',lines:[{id:'"+pid+"',name:'Y',qty:120,rate:20,amt:2400,unit:'pc',ctn:{n:5,per:24,rm:'ctn',r:480}}]}]")
        j = json.loads(await pg.evaluate("SKJ.appCode(7)"))
        assert j["app"] == "mh177-appbuys" and j["org"] == await pg.evaluate("SE.org") and j["n"] >= 1 and j["buys"][0]["ln"][0]["c"]["per"] == 24, j
    srv.shutdown()
    assert not errs, errs
    print("✅ गल्ला-प्रबंधन टेस्ट पास")

asyncio.run(main())
