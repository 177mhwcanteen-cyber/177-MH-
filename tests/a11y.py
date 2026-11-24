"""177 MH — 👆📱 हर टैब कसा हुआ (24-11-2026; axe-core/WCAG के नियम, बिना लाइब्रेरी):
360px मोबाइल और 1280px लैपटॉप पर हर टैब: (1) हर बटन/खाने का नाम (लिखा/aria-label/placeholder) (2) हर बटन ≥24×24px
(3) पूरा पेज कभी स्क्रीन से चौड़ा नहीं (दाएँ-बाएँ न खिसके; चिप की पट्टियाँ अपने अंदर ठीक) (4) कोई JS गलती नहीं।
उपयोग: python3 tests/a11y.py <www> <shots>"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright
WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read()
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8796), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = """async()=>{const out={};for(const tab of ['bill','kharid','stock','udhar','bills','day','label','report','set']){S.tab=tab;showTab();await new Promise(r=>setTimeout(r,500));
 const bad=[];document.querySelectorAll('#p-'+tab+' button, #p-'+tab+' input:not([type=hidden]), #p-'+tab+' select').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(e).visibility==='hidden')return;
  const nm=(e.getAttribute('aria-label')||e.title||e.textContent||e.placeholder||(e.labels&&e.labels[0]&&e.labels[0].textContent)||'').trim();if(!nm)bad.push('नाम नहीं: '+e.outerHTML.slice(0,80));
  if(e.tagName==='BUTTON'&&(r.width<24||r.height<24))bad.push('छोटा: '+nm.slice(0,20)+' '+Math.round(r.width)+'x'+Math.round(r.height))});
 if(document.documentElement.scrollWidth>innerWidth+1)bad.push('पेज चौड़ा '+document.documentElement.scrollWidth);
 const pn=document.getElementById('p-'+tab);if(pn){pn.querySelectorAll('.card2').forEach(c=>{const r=c.getBoundingClientRect();if(r.width&&r.right>innerWidth+1)bad.push('कार्ड बाहर: '+(c.querySelector('h3')||c).textContent.trim().slice(0,30))})}
 if(bad.length)out[tab]=bad.slice(0,8)}return out}"""
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vw in (360, 1280):
            ctx = await b.new_context(viewport={"width": vw, "height": 800}, service_workers="block"); pg = await ctx.new_page()
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
            await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
            await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
            await pg.goto("http://127.0.0.1:8796/index.html"); await pg.wait_for_timeout(1500)
            await pg.evaluate("S.isOwner=true")
            r = await pg.evaluate(JS); print(vw, r)
            assert not r, (vw, r)
            await ctx.close()
        await b.close()
    assert not errs, errs
    print("✅ मोबाइल+लैपटॉप कसाव टेस्ट पास")
asyncio.run(main())
