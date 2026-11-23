"""🚫 रद्द-अर्ज़ी (23-11-2026, विक्रम जी): साथी अर्ज़ी भेजे → बिल उसकी "भुगतान बाकी"/बिल-सूची से हटे, स्कैन से भी न खुले →
मालिक को कार्ड (साफ़ शब्द) → एक दबाव में शीट → ✓ रद्द (स्टॉक वापस, अर्ज़ी मंज़ूर) · बिल खोलकर ✗ मना (बिल चालू, फिर भुगतान बाकी में)।
उपयोग: python3 tests/cancel.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, json, os, sys, threading, http.server, functools, re
from playwright.async_api import async_playwright
H=os.path.dirname(os.path.abspath(__file__)); R=os.path.join(H,".."); WWW=os.path.abspath(sys.argv[1]); SHOTS=os.path.abspath(sys.argv[2]); os.makedirs(SHOTS,exist_ok=True); PORT=8795
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(s,*a): pass
srv=http.server.ThreadingHTTPServer(("127.0.0.1",PORT),functools.partial(Q,directory=WWW));threading.Thread(target=srv.serve_forever,daemon=True).start()
MOCK=open(H+"/mock-firebase.js",encoding="utf8").read()+"\ntry{firebase.firestore.FieldValue.delete=firebase.firestore.FieldValue.delete||(()=>null)}catch(e){}\n"+open(os.path.join(R,"node_modules/jsbarcode/dist/JsBarcode.all.min.js"),encoding="utf8").read()
CFG="""window.SE_CONFIG={org:"mh177",firebase:{apiKey:"TEST",projectId:"t"},ownerHash:"465bf0ff70fca5f4025f1dab7dd7a1ad8298b39f1635f64b0ad3cfa0bb78c334",ownerName:"विक्रम जी",updateUrl:"",photoUrl:""};"""
errs=[]
async def page(b,mock,users):
    ctx=await b.new_context(viewport={"width":400,"height":860},service_workers="block")
    pg=await ctx.new_page();pg.on("pageerror",lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__MOCK__={json.dumps(mock)};window.__USERS__={json.dumps(users)};window.print=()=>{{}};window.confirm=()=>true;window.alert=()=>{{}};window.open=()=>({{}});")
    await pg.route("**/lib/vendor.js",lambda r: r.fulfill(body=MOCK,content_type="application/javascript"))
    await pg.route("**/config.js",lambda r: r.fulfill(body=CFG,content_type="application/javascript"))
    await pg.route("**/migrate.json",lambda r: r.fulfill(body=open(os.path.join(H,"fixture-migrate.json"),encoding="utf8").read(),content_type="application/json"))
    await pg.route(re.compile(r"^(?!http://127\.0\.0\.1).*"),lambda r: r.abort())
    await pg.goto(f"http://127.0.0.1:{PORT}/index.html");await pg.wait_for_selector("#lock:not([hidden])")
    return pg
async def staff(pg):
    for d in "8209593527": await pg.click(f'#lock [data-k="{d}"]')
    for d in "482916": await pg.click(f'#lock [data-k="{d}"]')
    await pg.wait_for_selector("#lock",state="hidden");await pg.wait_for_timeout(1200)
    await pg.evaluate("document.querySelectorAll('.pinlock,#sgNag,.sgnag').forEach(x=>x.remove())")
async def owner(pg):
    await pg.click('[data-lg="to-owner"]');await pg.fill("#lgEmail","sabziexpress3600@gmail.com");await pg.fill("#lgPass","secret123")
    await pg.click('[data-lg="owner-go"]');await pg.wait_for_selector("#lock",state="hidden");await pg.wait_for_timeout(1200)
async def main():
    users={"sabziexpress3600@gmail.com":{"uid":"own","pw":"secret123"}}
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # ---- तैयारी: मालिक → पुराना डेटा → साथी ----
        pg=await page(b,{},users);await owner(pg)
        await pg.evaluate("S.tab='set';showTab()");await pg.wait_for_timeout(300);await pg.click("[data-migrate]");await pg.wait_for_timeout(2500)
        await pg.evaluate("S.tab='set';showTab()");await pg.wait_for_timeout(300)
        await pg.fill("#stName","दिनेश जी");await pg.fill("#stPhone","8209593527");await pg.fill("#stPin","482916");await pg.click("[data-staffadd]");await pg.wait_for_timeout(800)
        mock=await pg.evaluate("window.__MOCK__");users=await pg.evaluate("window.__USERS__");await pg.context.close()
        # ---- साथी: दो बिल, बिना भुगतान ----
        pg=await page(b,mock,users);await staff(pg)
        nos=[]
        for code in ["2000000100104","2000000100203"]:
            await pg.evaluate(f"S.tab='bill';showTab();handleScan('{code}')");await pg.wait_for_timeout(300)
            await pg.evaluate("openCheckout()");await pg.wait_for_timeout(900)
            no=await pg.evaluate("(document.querySelector('#sheet h3 small')||{}).textContent||''");nos.append(no.replace('·','').strip())
            await pg.click("[data-sblater]");await pg.wait_for_timeout(400)
        print("bills",nos)
        st0=await pg.evaluate("(document.querySelector('.sb-pend')||{}).textContent||''");print("pending strip before:",st0[:80])
        # पहला बिल खोलो → रद्द → वजह-बटन → अर्ज़ी
        await pg.click(f'.sb-pend [data-sbopen="{nos[0]}"]');await pg.wait_for_timeout(400)
        await pg.click("[data-sbcancel]");await pg.wait_for_timeout(300)
        lbl=await pg.inner_text("[data-cxgo]");print("staff button:",lbl)
        await pg.click('[data-crwhy="ग्राहक ने सामान नहीं लिया"]');assert await pg.input_value("#crWhy")=="ग्राहक ने सामान नहीं लिया"
        await pg.click("[data-cxgo]");await pg.wait_for_timeout(900)
        t=await pg.text_content("#toast");print("staff toast:",t)
        st1=await pg.evaluate("(document.querySelector('.sb-pend')||{}).textContent||''");print("pending strip after:",st1[:80])
        assert nos[0] not in st1 and nos[1] in st1, st1
        req=await pg.evaluate(f"window.__MOCK__.cancelReq&&window.__MOCK__.cancelReq['{nos[0]}']");print("req:",{k:req[k] for k in ["status","done","reason","byName"]})
        assert req["status"]=="pending" and req["done"]==False
        bl=await pg.evaluate(f"window.__MOCK__['days/'+today()+'/bills']['{nos[0]}'].cancelled");assert not bl
        await pg.evaluate("S.tab='bills';showTab()");await pg.wait_for_timeout(300)
        inlist=await pg.evaluate(f"!!document.querySelector('#p-bills [data-bill=\"{nos[0]}\"]')");print("staff list has req bill:",inlist);assert not inlist
        # दूसरे बिल की अर्ज़ी भी (मना करने के लिए)
        await pg.evaluate("S.tab='bill';showTab()");await pg.wait_for_timeout(300)
        await pg.click(f'.sb-pend [data-sbopen="{nos[1]}"]');await pg.wait_for_timeout(300);await pg.click("[data-sbcancel]");await pg.fill("#crWhy","गलत मात्रा");await pg.click("[data-cxgo]");await pg.wait_for_timeout(900)
        # स्कैन से वही बिल खोलने की कोशिश (BW) → रुके
        await pg.evaluate(f"SA.openBill('{nos[0]}')");await pg.wait_for_timeout(300);print("scan open toast:",await pg.text_content("#toast"))
        ps0=await pg.evaluate("JSON.parse(JSON.stringify(window.__MOCK__.pstock))")
        mock=await pg.evaluate("window.__MOCK__");users=await pg.evaluate("window.__USERS__");await pg.context.close()
        # ---- मालिक ----
        pg=await page(b,mock,users);await owner(pg)
        await pg.evaluate("S.tab='report';showTab()");await pg.wait_for_timeout(600)
        await pg.screenshot(path=f"{SHOTS}/cr0-card.png");card=await pg.inner_text("#p-report .card2");print("owner card:",card[:260].replace("\n"," | "))
        ed=await pg.evaluate("(window.SB&&SB.editsHTML())||''");assert nos[0] not in ed and nos[1] not in ed, "pending-list should not show req bills"
        # ✓ रद्द करें → शीट → हाँ
        await pg.click(f'#p-report button[data-crview="{nos[0]}"]');await pg.wait_for_timeout(500)
        sh=await pg.inner_text("#sheet");print("sheet:",sh[:200].replace("\n"," | "))
        await pg.screenshot(path=f"{SHOTS}/cr1-sheet.png");await pg.click('#sheet [data-crdo="1"]');await pg.wait_for_timeout(1200)
        print("owner toast:",await pg.text_content("#toast"))
        bl=await pg.evaluate(f"window.__MOCK__['days/'+today()+'/bills']['{nos[0]}'].cancelled");rq=await pg.evaluate(f"window.__MOCK__.cancelReq['{nos[0]}'].status")
        print("bill cancelled:",bl,"req:",rq);assert bl and rq=="approved"
        ps1=await pg.evaluate("JSON.parse(JSON.stringify(window.__MOCK__.pstock))");print("stock k1001:",ps0.get("k1001"),"->",ps1.get("k1001"))
        # दूसरा: बिल खोलकर (रसीद) मना करें
        await pg.evaluate(f"showReceipt(S.dayBills.find(x=>x.no==='{nos[1]}'),false)");await pg.wait_for_timeout(400)
        has=await pg.evaluate("!!document.querySelector('#sheet .crbox [data-crdo=\"0\"]')");print("receipt has decision box:",has);assert has
        await pg.click('#sheet .crbox [data-crdo="0"]');await pg.wait_for_timeout(1000)
        rq2=await pg.evaluate(f"window.__MOCK__.cancelReq['{nos[1]}'].status");bl2=await pg.evaluate(f"window.__MOCK__['days/'+today()+'/bills']['{nos[1]}'].cancelled");print("req2:",rq2,"bill2 cancelled:",bl2);assert rq2=="rejected" and not bl2
        await pg.evaluate("S.tab='bill';showTab()");await pg.wait_for_timeout(300)
        st2=await pg.evaluate("(document.querySelector('.sb-pend')||{}).textContent||''");print("owner pending after reject:",st2[:80]);assert nos[1] in st2
        await pg.evaluate("S.tab='report';showTab()");await pg.wait_for_timeout(300)
        left=await pg.evaluate("S.cancelReqs.length");print("requests left:",left);assert left==0
        await b.close()
    print("errs",errs);assert not errs
    print("✅ रद्द-अर्ज़ी टेस्ट पास")
asyncio.run(main())
