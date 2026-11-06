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
        await pg.evaluate("localStorage.removeItem('srk_cur')")
        # खाना नंबर लिखो → सामान स्कैन / खोज
        await pg.evaluate("SRK.open()"); await pg.wait_for_selector("#srkSheet")
        await pg.fill("#srkR", "११ - 23"); await pg.wait_for_timeout(100)
        assert await pg.input_value("#srkR") == "11-23"
        assert "बड़ा रैक" in await pg.inner_text("#srkInfo")
        await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"item('{A}').rack") == "11-23", "स्कैन = खाना लगा"
        nm = await pg.evaluate(f"item('{B}').name")
        await pg.fill("#srkQ", nm[:6]); await pg.wait_for_timeout(150)
        await pg.click(f'[data-srkset="{B}"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"item('{B}').rack") == "11-23"
        assert "इस खाने में" in await pg.inner_text("#srkInfo")
        # खाने का स्टिकर (R9-14) स्कैन = वही खाना चुना
        await pg.evaluate("handleScan('R9-14')"); await pg.wait_for_timeout(200)
        assert await pg.input_value("#srkR") == "9-14"
        await pg.evaluate(f"handleScan(SF.itemCode(item('{C}')))"); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"item('{C}').rack") == "9-14"
        # गोदाम 31-2 = दूसरी जगह (मुख्य जगह वैसी ही)
        await pg.fill("#srkR", "31-2"); await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"[item('{A}').rack,item('{A}').grack]") == ["11-23", "31-2"]
        await pg.fill("#srkR", "11-99"); await pg.wait_for_timeout(100)
        assert "नक्शे में नहीं" in await pg.inner_text("#srkInfo")
        await pg.evaluate(f"item('{T}').rack='20-1'")
        # रैक 11 → हर खाना
        await pg.click('[data-srksel="11"]'); await pg.wait_for_timeout(150)
        t = await pg.inner_text(".srk-sel"); assert "रैक 11" in t and "11-23" in t and "खाली" in t, t[:300]
        await pg.screenshot(path=f"{SHOTS}/r1-sheet.png")
        # A4 भाव-पट्टी (रैक 11 = 2 सामान)
        await pg.click('[data-srkpr="11"]'); await pg.wait_for_timeout(300)
        h = (await pg.evaluate("window.__pr"))["h"]
        assert h.count('class="st"') == 2 and "11-23" in h and "<s>₹" in h and h.count("<img") >= 1, h[:400]
        p2 = await ctx.new_page(); await p2.set_content("<html><body>" + h + "</body></html>"); await p2.screenshot(path=f"{SHOTS}/r2-strips.png"); await p2.close()
        # खानों के स्टिकर: रैक 11 = 63
        await pg.click('[data-srkstk="11"]'); await pg.wait_for_timeout(800)
        h = (await pg.evaluate("window.__pr"))["h"]; assert h.count("<img") == 63, h.count("<img")
        p2 = await ctx.new_page(); await p2.set_content("<html><body>" + h.split('<img')[0] + '<img' + '<img'.join(h.split('<img')[1:4]) + "</div></body></html>"); await p2.screenshot(path=f"{SHOTS}/r3-stickers.png"); await p2.close()
        assert await pg.evaluate("SRK.total()") == 238
        # तम्बाकू की पट्टी पर असली नाम नहीं
        await pg.evaluate(f"SRK.print([item('{T}')])"); h = (await pg.evaluate("window.__pr"))["h"]
        assert await pg.evaluate(f"SE.capNm(item('{T}').name)") not in h, "तम्बाकू का असली नाम पट्टी पर नहीं"
        # भाव बदला → दोबारा छापें
        await pg.evaluate(f"SRK.print([item('{A}'),item('{B}')])")
        assert await pg.evaluate("SRK.changed().length") == 0
        await pg.evaluate(f"item('{A}').sale=+item('{A}').sale+5")
        assert await pg.evaluate("SRK.changed().map(i=>i.id)") == [A]
        await pg.evaluate("SRK.open()"); assert await pg.query_selector("[data-srkch]")
        # आज की गिनती → स्टॉक टैब में उसी रैक की गिनती
        tdy = await pg.evaluate("SRK.today()"); assert tdy in (9, 11, 20), tdy
        await pg.evaluate(f"item('{A}').track=true;item('{C}').track=true")
        await pg.click("[data-srkcount]"); await pg.wait_for_timeout(700)
        assert await pg.input_value("#ckrack") == str(tdy)
        lst = await pg.evaluate("[...document.querySelectorAll('#cklist [data-crow]')].map(x=>x.dataset.crow)")
        exp = {9: C, 11: A}.get(tdy)
        if exp: assert exp in lst, lst
        assert await pg.evaluate(f"item('{A}').rack") == "11-23", "गिनती से खाना न बिगड़े"
        await pg.click("[data-ckcancel]") if await pg.query_selector("[data-ckcancel]") else None
        await pg.evaluate("localStorage.removeItem('bh_count')")
        # बिल: खोज में खाना नंबर, बिल में 📍
        await pg.evaluate("S.tab='bill';showTab()"); await pg.fill("#q", "11-23"); await pg.wait_for_timeout(300)
        g = await pg.evaluate("[...document.querySelectorAll('#grid [data-item]')].map(x=>x.dataset.item)")
        assert A in g and B in g and C not in g, g
        await pg.fill("#q", ""); await pg.wait_for_timeout(100)
        await pg.evaluate(f"quickAdd(item('{A}'),1);renderSide&&renderSide()"); await pg.wait_for_timeout(200)
        assert "📍11-23" in (await pg.evaluate("(document.querySelector('#side')||document.body).innerText"))
        # ऑनलाइन ऑर्डर: रैक के क्रम में
        srt = await pg.evaluate(f"SRK.sortItems([{{id:'zz'}},{{id:'{A}'}},{{id:'{C}'}}]).map(x=>x.id)")
        assert srt == [C, A, "zz"], srt
        if await pg.evaluate("!!(window.SX&&window.SON&&SON.sheet)"):
            await pg.evaluate(f"SX.orders=[{{id:'o1',name:'RAM',phone:'9876543210',items:[{{id:'{A}',n:'X',q:1,u:'pc',s:10}},{{id:'{C}',n:'Y',q:2,u:'pc',s:10}}],status:'new',ts:Date.now(),note:''}}];SON.sheet()"); await pg.wait_for_timeout(200)
            hh = await pg.evaluate("document.querySelector('#sheet').innerHTML")
            assert "📍9-14" in hh and hh.index("📍9-14") < hh.index("📍11-23"), "ऑर्डर रैक-क्रम में"
            await pg.evaluate("closeSheet()")
        # सेटिंग: कार्ड + editor में रैक खाना
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_selector("#srkCard")
        await br.close()
    assert not errs, errs
    print("✅ रैक टेस्ट पास")

asyncio.run(main())
