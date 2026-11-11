"""177 MH कैंटीन — 🔔 ऑर्डर की घंटी (se-ring.js = window.SRG; असली अलार्म APK की OrderRingService.java में)
जाँच: लॉगिन के बाद अपने-आप ringStart (चाबी/प्रोजेक्ट/दुकान का समय), इजाज़तों की सूची, जाँच-घंटी, बंद/चालू, सूचना से खुले तो ऑर्डर-शीट + चुप,
ऑर्डर-शीट खुली = चुप, नेटिव घंटी चल रही हो तो JS बीप नहीं, पुराना APK = "नया ऐप लें", वेब पर कोई गलती नहीं, ☰ में 🔔, लॉग-आउट पर बंद।
उपयोग: python3 tests/ring.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, threading, http.server, functools, json
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8791), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read()
errs = []

# नकली APK प्लगइन: हर बुलावा __rc में दर्ज
NATIVE = """window.__rc=[];window.__rs={on:false,running:false,ringing:false,pending:0,lastOk:0,lastErr:'',checks:0,opened:false,notif:false,battery:false,fsi:false,chan:true};
const st=()=>Object.assign({},window.__rs);
window.__BP={ringStatus:async o=>{__rc.push(['status',o]);const r=st();if(o&&o.consume)__rs.opened=false;return r},
 ringStart:async o=>{__rc.push(['start',o]);Object.assign(__rs,{on:true,running:true,notif:true,lastOk:Date.now()});return st()},
 ringStop:async()=>{__rc.push(['stop']);Object.assign(__rs,{on:false,running:false});return st()},
 ringSilence:async()=>{__rc.push(['silence']);Object.assign(__rs,{ringing:false,pending:0,opened:false});return st()},
 ringTest:async()=>{__rc.push(['test']);return st()},ringBattery:async()=>{__rc.push(['battery']);__rs.battery=true;return st()},
 ringSettings:async o=>{__rc.push(['settings',o]);if(o.what==='fsi')__rs.fsi=true;return st()},
 authSet:async o=>{__rc.push(['authSet',o]);window.__auth=o;return {ok:true}},authClear:async()=>{__rc.push(['authClear']);return {}}};"""


async def page(br, native, old=False):
    pg = await (await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")).new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
    await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK + ("\n" + NATIVE + (";delete __BP.ringStatus;delete __BP.ringStart;__BP.ringStatus=async()=>{throw {code:'UNIMPLEMENTED',message:'not implemented'}};" if old else "") + "window.SENative={isNative:true,BtPrinter:__BP};" if native else ""), content_type="application/javascript"))
    await pg.route("**/config.js", lambda r: r.fulfill(body='window.SE_CONFIG={firebase:{apiKey:"AIzaTEST",projectId:"mh177-canteen"}};', content_type="application/javascript"))
    await pg.goto("http://127.0.0.1:8791/index.html"); await pg.wait_for_timeout(1500)
    await pg.evaluate("S.isOwner=true;S.demo=false;S.db=firebase.firestore();S.uid='own';S.staff='विक्रम जी';firebase.auth().currentUser={uid:'own',email:'o@x',refreshToken:'RT-123',getIdToken:async()=>'T'};0")
    return pg


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        # 1) वेब (APK नहीं): कुछ नहीं बुलाता, शीट साफ़ संदेश
        pg = await page(br, False)
        await pg.evaluate("SRG.boot()"); await pg.wait_for_timeout(300)
        assert await pg.evaluate("SRG.native()") is False
        assert "APK" in await pg.evaluate("SRG.html()")

        # 2) APK: लॉगिन के बाद अपने-आप चालू (डिफ़ॉल्ट), सही चाबी/प्रोजेक्ट/समय
        pg = await page(br, True)
        await pg.wait_for_timeout(3600)  # se-ring अपने-आप हर 3 सेकंड लॉगिन देखता है
        rc = await pg.evaluate("__rc")
        starts = [c for c in rc if c[0] == "start"]
        assert starts, rc
        o = starts[0][1]
        assert o["rt"] == "RT-123" and o["key"] == "AIzaTEST" and o["pid"] == "mh177-canteen" and o["every"] == 20 and o["open"] == 480 and o["close"] == 1260 and o["loud"] is True, o
        # 3) इजाज़तें कम → शीट (दिन में एक बार) में सूची
        await pg.wait_for_timeout(2800)
        assert await pg.locator(".srg-sheet").count() == 1, "पहली बार इजाज़त-शीट"
        assert await pg.locator("[data-srgfix]").count() == 2  # बैटरी + पूरी स्क्रीन (सूचना मिल चुकी)
        await pg.evaluate("(()=>{const l=document.getElementById('lock');if(l)l.hidden=true})()")
        await pg.screenshot(path=os.path.join(SHOTS, "ring_sheet.png"))
        await pg.evaluate("s=>document.querySelector(s).click()", '[data-srgfix="battery"]'); await pg.wait_for_timeout(1700)
        await pg.evaluate("s=>document.querySelector(s).click()", '[data-srgfix="fsi"]'); await pg.wait_for_timeout(1700)
        rc = await pg.evaluate("__rc.map(c=>c[0])")
        assert "battery" in rc and "settings" in rc, rc
        assert await pg.locator("[data-srgfix]").count() == 0 and "सारी इजाज़तें" in await pg.inner_text("#srgBody")
        assert "घंटी चालू है" in await pg.inner_text(".srg-top")
        # 4) जाँच-घंटी
        await pg.evaluate("s=>document.querySelector(s).click()", "[data-srgtest]"); await pg.wait_for_timeout(200)
        assert ["test"] in await pg.evaluate("__rc.map(c=>[c[0]])")
        # 5) बंद → चालू (फोन पर याद)
        await pg.evaluate("s=>document.querySelector(s).click()", "[data-srgtoggle]"); await pg.wait_for_timeout(1000)
        assert await pg.evaluate("localStorage.getItem('srg_off')") == "1" and ["stop"] in await pg.evaluate("__rc.map(c=>[c[0]])")
        assert "बंद" in await pg.inner_text(".srg-top")
        await pg.evaluate("s=>document.querySelector(s).click()", "[data-srgtoggle]"); await pg.wait_for_timeout(1000)
        assert await pg.evaluate("localStorage.getItem('srg_off')") == "0" and await pg.evaluate("__rs.on") is True
        # 6) तेज़ आवाज़ का डिब्बा → फिर से start(loud:false)
        await pg.evaluate("s=>document.querySelector(s).click()", "[data-srgloud]"); await pg.wait_for_timeout(300)
        last = (await pg.evaluate("__rc.filter(c=>c[0]==='start').pop()"))[1]
        assert last["loud"] is False and last["ask"] is False, last
        await pg.evaluate("s=>document.querySelector(s).click()", "[data-srgloud]"); await pg.wait_for_timeout(300)
        # 7) सूचना से ऐप खुला → पूरी स्क्रीन का पॉप-अप (नाम, सामान, स्वीकार 15/30/45) + चुप
        await pg.evaluate("document.querySelector('#sheet').innerHTML='';__rs.opened=true;__rs.ringing=true;__rc=[];SX.orders=[{id:'o1',name:'राम',phone:'9999999999',addr:'गली 4',note:'🛵|💵|⏰ अभी|📍25.75,71.39|₹120¦',items:[{n:'maggi 70g',q:2,u:'pc',s:14}],status:'new',ts:Date.now()}];SRG.checkOpened()")
        await pg.wait_for_timeout(500)
        assert await pg.locator("#srgPop:not([hidden])").count() == 1, "पॉप-अप खुला"
        txt = await pg.inner_text("#srgPop")
        assert "राम" in txt and "MAGGI 70G" in txt and "₹120" in txt and "गली 4" in txt, txt
        assert await pg.locator("#srgPop [data-spacc]").count() == 3
        await pg.evaluate("(()=>{const l=document.getElementById('lock');if(l)l.hidden=true})()")
        await pg.screenshot(path=os.path.join(SHOTS, "ring_popup.png"))
        await pg.evaluate("window.__steps=[];SON.step=async(id,st,ex)=>{__steps.push([id,st,ex&&ex.mins]);return true};0")
        await pg.evaluate("s=>document.querySelector(s).click()", '[data-spacc="30"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("__steps") == [["o1", "acc", 30]] and await pg.locator("#srgPop:not([hidden])").count() == 0
        assert ["silence"] in await pg.evaluate("__rc.map(c=>[c[0]])")
        # "सब ऑर्डर" → ऑर्डर-शीट (उसमें 🔔 घंटी बटन)
        await pg.evaluate("SRG.popup(SX.orders[0])"); await pg.evaluate("s=>document.querySelector(s).click()", "[data-spall]"); await pg.wait_for_timeout(300)
        assert await pg.locator("#sheet .son-sheet").count() == 1 and await pg.locator("#sheet [data-srgopen]").count() == 1
        # 🎵 10 धुनें + फोन का अलार्म; चुनने पर ringStart(tone)
        await pg.evaluate("SRG.sheet()"); await pg.wait_for_timeout(300)
        assert await pg.locator("[data-srgtone]").count() == 11 and await pg.evaluate("SRG.tone()") == "t1"
        await pg.evaluate("s=>document.querySelector(s).click()", '[data-srgtone="t6"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("localStorage.getItem('srg_tone')") == "t6" and (await pg.evaluate("__rc.filter(c=>c[0]==='start').pop()"))[1]["tone"] == "t6"
        ok = await pg.evaluate("Promise.all(SRG.TONES.filter(t=>t[0]!=='sys').map(t=>fetch('sounds/'+t[0]+'.wav').then(r=>r.ok&&r.headers.get('content-type')!=='text/html')))")
        assert all(ok), ok
        # 🔑 लॉगिन की चाबी APK को (ऐप बंद हो तब भी लोकेशन/घंटी)
        assert "authSet" in await pg.evaluate("__rc.map(c=>c[0]).join()") or await pg.evaluate("window.__auth||0"), "authSet"
        # 8) नेटिव घंटी चल रही → JS बीप नहीं; कोई नया नहीं बचा → चुप
        await pg.evaluate("window.__beeps=0;window.beep=()=>{__beeps++};SX._seen=new Set();SX._oInit=1;SRG.st.running=true;SX.orders=[{id:'o2',name:'श्याम',items:[{n:'B',q:1}],status:'new',ts:Date.now()}];SX.orderPill()")
        assert await pg.evaluate("__beeps") == 0
        await pg.evaluate("SRG.st.running=false;SX.orders=[{id:'o3',name:'गीता',items:[{n:'C',q:1}],status:'new',ts:Date.now()}];SX.orderPill()")
        await pg.wait_for_timeout(900)
        assert await pg.evaluate("__beeps") == 3, "नेटिव न हो तो पुरानी 3 बीप"
        await pg.evaluate("__rc=[];SRG.st.ringing=true;SX.orders=[{id:'o3',status:'billing',items:[],ts:Date.now()}];SX.orderPill()"); await pg.wait_for_timeout(200)
        assert ["silence"] in await pg.evaluate("__rc.map(c=>[c[0]])"), "स्वीकार होते ही घंटी चुप"
        # 9) ☰ में 🔔, ऑनलाइन सेटिंग में बटन
        assert "ring" in await pg.evaluate("SMN.acts().map(a=>a.k)")
        assert "data-srgopen" in await pg.evaluate("SON.settingsHTML()")
        # 10) लॉग-आउट से पहले घंटी बंद
        assert await pg.evaluate("!!SE.logout._srg"), "SE.logout लिपटा"
        await pg.evaluate("async()=>{const w=SE.logout;window.__out=0;SE.logout=async()=>{__out=1};SRG.wrapLogout();__rc=[];await SE.logout();SE.logout=w}")
        assert await pg.evaluate("__out") == 1 and ["authClear"] in await pg.evaluate("__rc.map(c=>[c[0]])"), "लॉग-आउट पर चाबी भी मिटी"
        assert ["stop"] in await pg.evaluate("__rc.map(c=>[c[0]])"), "लॉग-आउट पर बंद"

        # 🛵 डिलीवरी की जाँच (मालिक का लोकेशन टैब): ग्राहक के घर से "पहुँच गया" की दूरी + रास्ता
        await pg.evaluate("""(async()=>{const db=firebase.firestore(),d=today(),t=Date.now();
          await db.collection('orders').doc('d1').set({name:'सीता',status:'done',note:'🛵|💵|📍25.752000,71.396000|₹200¦',addr:'गली 7',items:[],ts:t-3600e3,outTs:t-1800e3,doneTs:t-60e3,dts:t-60e3,doneUid:'u9',rider:'मनोहर',doneLoc:{lat:25.7521,lng:71.3961,acc:10,ts:t}});
          await db.collection('orders').doc('d2').set({name:'गीता',status:'done',note:'🛵|💵|📍25.760000,71.410000|₹90¦',items:[],ts:t-3600e3,outTs:t-1700e3,doneTs:t-50e3,dts:t-50e3,doneUid:'u9',rider:'मनोहर',doneLoc:{lat:25.7521,lng:71.3961,acc:10,ts:t}});
          await db.collection('trk').doc(d+'_u9_10').set({uid:'u9',name:'मनोहर',date:d,hr:10,pts:[(t-1000e3)+',25.751900,71.396100,8',(t-900e3)+',25.752050,71.396020,8']})})()""")
        await pg.evaluate("S.tab='route';(()=>{let e=document.getElementById('p-route');if(!e){e=document.createElement('div');e.id='p-route';document.body.appendChild(e)}})();SR.renderRoute()")
        await pg.wait_for_timeout(1500); await pg.evaluate("SR.renderRoute()"); await pg.wait_for_timeout(500)
        t = await pg.inner_text(".rdv")
        assert "2 ऑर्डर" in t and "सीता" in t and "पहुँचा — पक्का" in t and "गीता" in t and "दूर से" in t, t
        assert await pg.locator("[data-rdv]").count() == 2

        # 11) पुराना APK (प्लगइन में घंटी नहीं) → "नया ऐप डाउनलोड करें", कोई गलती नहीं
        pg = await page(br, True, old=True)
        await pg.evaluate("SRG.boot()"); await pg.wait_for_timeout(500)
        assert await pg.evaluate("SRG.unsupported") is True and "नया ऐप" in await pg.evaluate("SRG.html()")

        await br.close()
    bad = [e for e in errs if "reload" not in e]
    assert not bad, bad
    print("✅ ऑर्डर-घंटी टेस्ट पास")

asyncio.run(main())
