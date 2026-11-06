"""177 MH कैंटीन — 📍 रैक व्यवस्था की जाँच (डेमो):
रैक नंबर लिखो → स्कैन/खोज से सामान उस खाने का · खाने की चिप और सूची · A4 भाव-पट्टी (रैक, भाव, MRP कटा, बारकोड, तम्बाकू = Misc) ·
भाव बदला = "दोबारा छापें" · बिल की खोज में रैक नंबर · ऑनलाइन ऑर्डर रैक के क्रम में · सामान के editor में रैक खाना।
उपयोग: python3 tests/rack.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8774), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8774/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;SE.printA4=async(t,h)=>{window.__pr={t,h}}")
        ids = await pg.evaluate("""()=>{const L=S.items.filter(i=>i.active!==false&&!i.virtual&&i.id!=='xyz'&&!isTob(i)).slice(0,4);L.forEach((i,k)=>{delete i.rack;i.sale=40+k*10});
          if(!SF.itemCode(L[0]))L[0].barcode='8906000000019';if(!SF.itemCode(L[2]))L[2].barcode='8906000000026';L[0].mrp=+L[0].sale+10;const t=L[3];t.sub='tob';t.secret='S-09';return L.map(i=>i.id)}""")
        A, B, C, T = ids
        assert await pg.evaluate(f"isTob(item('{T}'))"), 'तम्बाकू डेमो'
        # रैक लगाओ
        await pg.evaluate("SRK.open()"); await pg.wait_for_selector("#srkSheet")
        await pg.fill("#srkR", "a3 - 2"); await pg.wait_for_timeout(100)
        assert await pg.input_value("#srkR") == "A3-2"
        await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"item('{A}').rack") == "A3-2", "स्कैन = रैक लगा"
        nm = await pg.evaluate(f"item('{B}').name")
        await pg.fill("#srkQ", nm[:6]); await pg.wait_for_timeout(150)
        await pg.click(f'[data-srkset="{B}"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"item('{B}').rack") == "A3-2"
        await pg.fill("#srkR", "B1-1"); await pg.evaluate(f"handleScan(SF.itemCode(item('{C}')))"); await pg.wait_for_timeout(300)
        if T: await pg.evaluate(f"item('{T}').rack='T1'")
        assert await pg.evaluate(f"item('{C}').rack") == "B1-1"
        # खाने की चिप → सूची
        await pg.evaluate("SRK.open()"); await pg.click('[data-srksel="A3-2"]'); await pg.wait_for_timeout(150)
        t = await pg.inner_text("#srkSheet"); assert "A3-2 · 2 सामान" in t, t[:300]
        await pg.screenshot(path=f"{SHOTS}/r1-sheet.png")
        # A4 भाव-पट्टी
        await pg.click('[data-srkpr="A3-2"]'); await pg.wait_for_timeout(300)
        pr = await pg.evaluate("window.__pr"); h = pr["h"]
        assert h.count('class="st"') == 2 and "A3-2" in h and "<s>₹" in h and h.count("<img") >= 1, h[:400]
        p2 = await ctx.new_page(); await p2.set_content("<html><body>" + h + "</body></html>"); await p2.screenshot(path=f"{SHOTS}/r2-strips.png"); await p2.close()
        if T:
            await pg.evaluate(f"SRK.print([item('{T}')])"); h = (await pg.evaluate("window.__pr"))["h"]
            tn = await pg.evaluate(f"SE.capNm(item('{T}').name)")
            assert tn not in h, "तम्बाकू का असली नाम पट्टी पर नहीं"
        # भाव बदला → दोबारा छापें
        await pg.evaluate(f"SRK.print([item('{A}'),item('{B}')])")
        assert await pg.evaluate("SRK.changed().length") == 0
        await pg.evaluate(f"item('{A}').sale=+item('{A}').sale+5")
        assert await pg.evaluate("SRK.changed().map(i=>i.id)") == [A]
        await pg.evaluate("SRK.open()"); assert await pg.query_selector("[data-srkch]")
        await pg.evaluate("closeSheet()")
        # बिल की खोज: रैक नंबर
        await pg.evaluate("S.tab='bill';showTab()"); await pg.fill("#q", "a3-2"); await pg.wait_for_timeout(300)
        g = await pg.evaluate("[...document.querySelectorAll('#grid [data-item]')].map(x=>x.dataset.item)")
        assert A in g and B in g and C not in g, g
        await pg.fill("#q", ""); await pg.wait_for_timeout(100)
        # ऑनलाइन ऑर्डर: रैक के क्रम में
        srt = await pg.evaluate(f"SRK.sortItems([{{id:'zz'}},{{id:'{C}'}},{{id:'{A}'}}]).map(x=>x.id)")
        assert srt == [A, C, "zz"], srt
        if await pg.evaluate("!!(window.SX&&window.SON&&SON.sheet)"):
            await pg.evaluate(f"SX.orders=[{{id:'o1',name:'RAM',phone:'9876543210',items:[{{id:'{C}',n:'X',q:1,u:'pc',s:10}},{{id:'{A}',n:'Y',q:2,u:'pc',s:10}}],status:'new',ts:Date.now(),note:''}}];SON.sheet()"); await pg.wait_for_timeout(200)
            hh = await pg.evaluate("document.querySelector('#sheet').innerHTML")
            assert "📍A3-2" in hh and hh.index("📍A3-2") < hh.index("📍B1-1"), "ऑर्डर रैक-क्रम में"
            await pg.evaluate("closeSheet()")
        # सेटिंग: कार्ड + editor में रैक खाना
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_selector("#srkCard")
        await br.close()
    assert not errs, errs
    print("✅ रैक टेस्ट पास")

asyncio.run(main())
