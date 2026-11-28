"""🥬 सब्ज़ी एक्सप्रेस की सब्ज़ी 177 के बिल में (se-sabji.js) — python3 tests/sabji.py www <shots>"""
import asyncio, os, sys, threading, http.server, functools, json, time
from playwright.async_api import async_playwright
WWW=os.path.abspath(sys.argv[1]);SH=sys.argv[2] if len(sys.argv)>2 else "/tmp/shots";os.makedirs(SH,exist_ok=True)
H=os.path.dirname(os.path.abspath(__file__));MOCK=open(H+"/mock-firebase.js").read()
srv=http.server.ThreadingHTTPServer(("127.0.0.1",8811),functools.partial(http.server.SimpleHTTPRequestHandler,directory=WWW));srv.RequestHandlerClass.log_message=lambda *a:None
threading.Thread(target=srv.serve_forever,daemon=True).start()
R={"items":[{"id":"aalu","n":"आलू","e":"Potato","u":"kg","s":30,"c":"sabzi","p":"img/aalu.jpg"},{"id":"dhaniya","n":"धनिया","e":"Coriander","u":"kg","s":200,"c":"patta"},{"id":"kela","n":"केला","e":"Banana","u":"kg","s":50,"c":"fal"}],"ts":int(time.time()*1000)}
def ok(c,m):
  if not c: print("❌",m);sys.exit(1)
  print("✓",m)
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await (await b.new_context(viewport={"width":390,"height":844},service_workers="block")).new_page()
    pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();localStorage.setItem('se_sx',JSON.stringify(%s));"%json.dumps(R))
    await pg.route("**/lib/vendor.js",lambda r:r.fulfill(body=MOCK,content_type="application/javascript"))
    await pg.route("**/config.js",lambda r:r.fulfill(body="window.SE_CONFIG={stores:{sabji:{pid:'x',key:'y',base:'https://ex.com/'}}};",content_type="application/javascript"))
    await pg.route("**/firestore.googleapis.com/**",lambda r:r.fulfill(status=503,body=""))
    await pg.route("**/migrate.json",lambda r:r.fulfill(body=open(H+"/fixture-migrate.json").read(),content_type="application/json"))
    await pg.goto("http://127.0.0.1:8811/index.html");await pg.wait_for_timeout(1800)
    r=await pg.evaluate("""async()=>{S.tab='bill';showTab();await new Promise(r=>setTimeout(r,200));document.querySelector('[data-cat="sabzi"]').click();await new Promise(r=>setTimeout(r,300));
      return {ids:S.items.filter(i=>i.sx).map(i=>i.id),tiles:[...document.querySelectorAll('#grid [data-item^="sx-"]')].length,bar:!!document.querySelector('#sxbarw .sxbar'),
        ph:SE.photoSrc(item('sx-aalu')),virt:S.items.filter(i=>i.sx).every(i=>i.virtual&&i.cat==='sabzi'),patta:item('sx-dhaniya').sub,fal:item('sx-kela').sub}}""")
    ok(r["ids"]==["sx-aalu","sx-dhaniya","sx-kela"],"3 सब्ज़ी आभासी सामान बनीं");ok(r["tiles"]==3 and r["bar"],"🥬 चिप पर 3 टाइल + भाव-पट्टी")
    ok(r["ph"]=="https://ex.com/img/aalu.jpg","फोटो सब्ज़ी एक्सप्रेस की साइट से");ok(r["virt"] and r["patta"]=="patta" and r["fal"]=="fruit","virtual + श्रेणी")
    await pg.evaluate("S.cat='all';renderBill()");await pg.fill("#q","potato 1.5");await pg.wait_for_timeout(400)
    await pg.click('#grid [data-item="sx-aalu"] .tile');await pg.wait_for_timeout(400)
    c=await pg.evaluate("S.cart.map(l=>[l.id,l.qty,l.rate,l.amt])");ok(c==[["sx-aalu",1.5,30,45]],"खोज 'potato 1.5' → 1.5 किलो ₹45")
    await pg.evaluate("SR.rateSheet(item('sx-kela'))");ok(not await pg.evaluate("!!document.querySelector('.sheet')"),"भाव-मोड: सब्ज़ी का भाव 177 में नहीं बदलता")
    await pg.evaluate("S.settings.sxOff=true;SSX.merge()");ok(await pg.evaluate("!S.items.some(i=>i.sx)"),"मालिक बंद करे (settings.sxOff) तो हट जाएँ")
    await pg.screenshot(path=SH+"/sabji.png")
    ok(not errs,"JS error नहीं "+str(errs[:2]))
  print("✅ सब्ज़ी-177 टेस्ट पास")
asyncio.run(main())
