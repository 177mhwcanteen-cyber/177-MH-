"""177 MH कैंटीन — 🔍 खरीद-जाँच की जाँच (डेमो): खरीद-बही का कोड चिपकाओ → ऐप की खरीद से मिलान ·
✅ चढ़ा · ⚠ भाव/मात्रा/रकम अलग · ❌ नहीं चढ़ा · सामान का खरीद भाव ग़लत · बिक्री भाव खरीद से कम।
उपयोग: python3 tests/kharid.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, json, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8775), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []
CODE = {"app": "mh177-kharid", "v": 1, "bills": [
    {"id": "majisha-5639", "sup": "MAJISHA DISPOSAL & TRADING", "no": "5639", "date": "2026-11-04", "total": 18401, "lines": [
        {"nm": "PAPER PLATE 8 INCH", "qty": 100, "u": "pcs", "rate": 9, "amt": 900, "uc": 9},
        {"nm": "PANEER", "qty": 10.4, "u": "kg", "rate": 240, "amt": 2496, "uc": 240}]},
    {"id": "majisha-5703", "sup": "MAJISHA DISPOSAL & TRADING", "no": "5703", "date": "2026-11-07", "total": 1840, "lines": [
        {"nm": "CHERRY TUTTI FRUTTI 400G", "qty": 10, "u": "pcs", "rate": 40, "amt": 400, "uc": 40}]},
    {"id": "x-1", "sup": "RAM TRADERS", "no": "77", "date": "2026-11-05", "total": 500, "lines": [{"nm": "SUGAR", "qty": 10, "u": "kg", "rate": 50, "amt": 500, "uc": 50}]}]}


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8775/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true")
        assert await pg.evaluate("SKJ.sim('PAPER PLATE 8 INCH','Paper Plate 8in')") >= 0.6
        # ऐप की खरीद: 5639 चढ़ा (प्लेट का भाव 10 ग़लत), 5703 नहीं, RAM वाला बाज़ार से चढ़ा
        pid = await pg.evaluate("""(()=>{const it=S.items.find(i=>i.active!==false&&!i.virtual);it.short='PANEER';it.name='PANEER';it.unit='kg';it.cost=220;it.sale=230;return it.id})()""")
        await pg.evaluate(f"""SKJ._demo=[{{id:'p1',kind:'खरीद',date:'2026-11-04',sup:'Majisha Disposal',total:18401,by:'मनोज',lines:[{{name:'PAPER PLATE 8IN',qty:100,rate:10,amt:1000}},{{id:'{pid}',name:'PANEER',qty:10.4,rate:240,amt:2496}}],note:''}},
          {{id:'m1',kind:'बाज़ार',date:'2026-11-05',sup:'Ram Traders',total:500,by:'मुकेश',lines:[{{name:'SUGAR LOOSE',qty:10,rate:50,amt:500}}],note:''}}]""")
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_selector("#skjCard")
        await pg.click("[data-skjopen]"); await pg.wait_for_selector("#skjSheet")
        await pg.fill("#skjIn", "यह रहा: " + json.dumps(CODE, ensure_ascii=False)); await pg.click("[data-skjgo]"); await pg.wait_for_timeout(600)
        t = await pg.inner_text("#skjOut")
        assert "❌ ऐप में नहीं चढ़ा" in t and "5703" in t, t[:400]
        assert "ऐप में भाव ₹10, बिल पर ₹9" in t, t[:600]
        assert "ऐप में खरीद भाव ₹220, असल में पड़ा ₹240" in t and "बिक्री भाव ₹230 खरीद ₹240 से कम" in t, t[:800]
        R = await pg.evaluate("SKJ.check(%s.bills).then(R=>R.map(r=>[r.b.no,r.st,r.m&&r.m.id]))" % json.dumps(CODE))
        assert R == [["5639", "diff", "p1"], ["5703", "missing", None], ["77", "ok", "m1"]], R
        await pg.screenshot(path=f"{SHOTS}/k1-check.png", full_page=True)
        assert await pg.evaluate("JSON.parse(localStorage.getItem('skj_b')).length") == 3
        # 📥 बही → ऐप (बाज़ार-खरीद, गिनना बाकी) · 🛡️ दोहरी एंट्री रोक
        await pg.evaluate("S.purchHist=[{id:'p1',date:'2026-11-04',supName:'Majisha Disposal',total:18401,byName:'मनोज',lines:[{name:'PAPER PLATE 8IN'}]}]")
        await pg.click("[data-skjplan]"); await pg.wait_for_timeout(400)
        P = await pg.evaluate("SKJ._P=null,(async()=>{const P=await SKJ.plan(%s.bills);return P.map(x=>[x.b.no,x.st,x.lines.map(l=>l.itemId?1:0)])})()" % json.dumps(CODE))
        assert P[0][:2] == ["5639", "dup"] and P[1][:2] == ["5703", "new"] and P[2][:2] == ["77", "new"] and P[0][2] == [0, 1], P
        t = await pg.inner_text("#skjPlan"); assert "लगता है पहले से चढ़ा" in t and "फिर भी चढ़ाओ" in t, t[:300]
        await pg.click("[data-skjgoimp]"); await pg.wait_for_timeout(500)
        M = await pg.evaluate("SKJ._made.map(m=>[m.no,m.status,m.by===S.uid||m.by===''])")
        assert M == [["KB-majisha-5703", "sent", True], ["KB-x-1", "sent", True]], M
        P = await pg.evaluate("SKJ.plan(%s.bills).then(P=>P.map(x=>x.st))" % json.dumps(CODE))
        assert P == ["dup", "have", "have"], P
        # मालिक की अनुमति से ही दोहरा
        await pg.click("[data-skjplan]"); await pg.wait_for_timeout(300); await pg.check('[data-skjforce="KB-majisha-5639"]'); await pg.click("[data-skjgoimp]"); await pg.wait_for_timeout(400)
        assert await pg.evaluate("SKJ._made.length") == 3
        # साथी की हाथ वाली खरीद में वही बिल = रुकेगा
        assert await pg.evaluate("!!SKJ.dupOf({sup:'MAJISHA',total:18401,date:'2026-11-05',lines:[]})")
        assert not await pg.evaluate("SKJ.dupOf({sup:'MAJISHA',total:999,date:'2026-11-05',lines:[]})")
        # 🔒 कोड वाला सामान ऐप में नहीं = रुको · बारकोड से मिल जाए = चढ़े
        P = await pg.evaluate("SKJ.plan([{id:'kinjal-4812',sup:'KINJAL',no:'4812',date:'2026-11-07',total:4360,lines:[{nm:'CLASSIC DOUBLE BURST 20',qty:10,u:'pkt',rate:436,amt:4360,uc:436,bc:'8901725120610',tob:true}]}]).then(P=>P.map(x=>x.st))")
        assert P == ["block"], P
        await pg.evaluate("(()=>{const it=S.items.find(i=>i.active!==false&&!i.virtual&&i.id!==item('%s').id);it.barcode='8901725120610';it.sub='tob';it.secret='S-20'})()" % pid)
        P = await pg.evaluate("SKJ.plan([{id:'kinjal-4812',sup:'KINJAL',no:'4812',date:'2026-11-07',total:4360,lines:[{nm:'CLASSIC DOUBLE BURST 20',qty:10,u:'pkt',rate:436,amt:4360,uc:436,bc:'8901725120610',tob:true}]}]).then(P=>[P[0].st,!!P[0].lines[0].itemId])")
        assert P == ["new", True], P
        cat = await pg.evaluate("JSON.parse(SKJ.catalogCode())"); assert cat["app"] == "mh177-cat" and len(cat["items"]) > 10 and "sale" not in json.dumps(cat)
        # 💵 गल्ले से खरीद के लिए पैसा → 🔁 हिसाब (खरीद + वापस) · फ़र्क · याद
        await pg.evaluate("closeSheet&&closeSheet();S.staff='मनोहर जी';S.billsDate=today()")
        await pg.evaluate("SG.sheet('out')"); await pg.wait_for_timeout(200)
        await pg.click('[data-sgto="🛒 खरीद के लिए साथी को"]'); await pg.wait_for_timeout(100)
        await pg.fill("#sgAmt", "3000"); await pg.fill("#sgPer", "रविंद्र जी"); await pg.fill("#sgNote", "मजीशा"); await pg.click("[data-sgsave]"); await pg.wait_for_timeout(300)
        assert await pg.evaluate("SG.openAdv().map(x=>[x.person,x.total])") == [["रविंद्र जी", 3000]]
        assert await pg.evaluate("SG.expAt(Date.now()+1).out") == 3000
        await pg.evaluate("SG.openAdv()[0].ts-=3*36e5;S.isOwner=false;SG.nag(true)"); await pg.wait_for_timeout(100)
        assert "रविंद्र जी को ₹3,000" in await pg.inner_text("#sgNag"), await pg.inner_text("#sgNag")
        await pg.click('[data-sgnag="back"]'); await pg.wait_for_timeout(200)
        await pg.fill("#sgBuy", "1840"); await pg.fill("#sgBack", "1100"); await pg.wait_for_timeout(100)
        assert "60" in await pg.inner_text("#sgF")
        await pg.click("[data-sgbsave]"); await pg.wait_for_timeout(300)
        assert await pg.evaluate("SG.openAdv().length") == 0
        g = await pg.evaluate("SG.list().find(x=>x.kind==='back')"); assert g["fark"] == 60 and g["buy"] == 1840, g
        assert await pg.evaluate("SG.expAt(Date.now()+1).out") == 1900
        await pg.evaluate("S.isOwner=true"); assert "हिसाब में फ़र्क" in await pg.evaluate("SG.ownerLine()")
        await pg.evaluate("S.isOwner=false;S.demo=false"); assert await pg.evaluate("SKJ.settingsHTML()") == ""
        await br.close()
    assert not errs, errs
    print("✅ खरीद-जाँच टेस्ट पास")

asyncio.run(main())
