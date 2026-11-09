"""177 MH कैंटीन — 📍 रैक बदलें · माल ट्रांसफ़र (SRX) की जाँच (डेमो):
बिलिंग में "📍 रैक बदलें" चिप → शीट · सामान स्कैन → कहाँ-कहाँ कितना · 8 पीस 7-5 → 6-2 (कुल स्टॉक वही) · टाइल पर 📍+1 ·
खाने का स्टिकर स्कैन = "कहाँ" · सब भेजा = मुख्य जगह बदली · ↩ वापस · 🧠 सुझाव (किस्म बिखरी, ले जाएँ, खाली खाने) · खरीद में 📍 + 🏷️ लेबल
उपयोग: python3 tests/rkx.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8787), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
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
        await pg.goto("http://127.0.0.1:8787/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;SE.printA4=async(t,h)=>{window.__pr=(window.__pr||0)+1;window.__imgs=(h.match(/<img /g)||[]).length};0")
        ids = await pg.evaluate("""()=>{const L=S.items.filter(i=>i.active!==false&&!i.virtual&&!isTob(i)&&isPc(i.unit)).slice(0,6);
          L.forEach((i,k)=>{i.sale=40+k;i.sub='masala';delete i.rkx;delete i.rkxTs;S.pstock[i.id]={qty:10+k}});
          L[0].rack='7-5';L[1].rack='6-1';L[2].rack='6-2';L[3].rack='6-4';L[4].rack='15-12';L[5].rack='';
          if(!SF.itemCode(L[0]))L[0].barcode='8906000000019';return L.map(i=>i.id)}""")
        A, B, C, D, E, F = ids
        # बिलिंग में चिप
        await pg.evaluate("S.tab='bill';showTab()"); await pg.wait_for_timeout(200)
        assert await pg.locator("#cats [data-rkxopen]").count() == 1
        await pg.click("#cats [data-rkxopen]"); await pg.wait_for_selector("#srxSheet")
        await pg.screenshot(path=f"{SHOTS}/x1-open.png")
        # सामान स्कैन → कहाँ-कहाँ
        await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(150)
        t = await pg.inner_text("#srxSheet")
        assert "7-5" in t and "10 पीस" in t and "मुख्य" in t, t[:400]
        assert await pg.input_value("#srxN") == "10"
        await pg.fill("#srxN", "8")
        # खाने का स्टिकर स्कैन = कहाँ
        await pg.evaluate("handleScan('R6-2')"); await pg.wait_for_timeout(150)
        assert await pg.input_value("#srxTo") == "6-2"
        await pg.fill("#srxN", "8")
        await pg.screenshot(path=f"{SHOTS}/x2-item.png")
        await pg.click("[data-rxgo]"); await pg.wait_for_timeout(200)
        L = await pg.evaluate(f"SRX.locs(item('{A}')).map(l=>[l.k,l.q,l.main])")
        assert L == [["7-5", 2, True], ["6-2", 8, False]], L
        assert await pg.evaluate(f"S.pstock['{A}'].qty") == 10, "कुल स्टॉक वही"
        assert await pg.evaluate(f"item('{A}').rack") == "7-5"
        # ज़्यादा नहीं भेज सकते
        await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(100)
        assert await pg.evaluate(f"SRX.xfer('{A}','6-2','6-4',9)") is False
        # 6-2 का बाकी 8 वापस 7-5 (मुख्य) → एक ही जगह
        assert await pg.evaluate(f"!!SRX.xfer('{A}','6-2','7-5',8)")
        assert await pg.evaluate(f"SRX.locs(item('{A}')).map(l=>[l.k,l.q])") == [["7-5", 10]]
        # सारा माल दूसरी जगह = मुख्य जगह बदली
        assert await pg.evaluate(f"!!SRX.xfer('{A}','7-5','8-3',10)")
        assert await pg.evaluate(f"item('{A}').rack") == "8-3" and await pg.evaluate(f"SRX.more(item('{A}'))") == 0
        # आधा + "मुख्य यही" = पुराने में बचा अलग गिना
        assert await pg.evaluate(f"!!SRX.xfer('{B}','6-1','6-5',4,true)")
        _v = await pg.evaluate(f"SRX.locs(item('{B}')).map(l=>[l.k,l.q,l.main])"); assert _v == [["6-5", 4, True], ["6-1", 7, False]], _v
        # ↩ वापस
        ts = await pg.evaluate("SRX.state&&0") or 0
        await pg.evaluate("SRX.close();SRX.open()"); await pg.wait_for_timeout(100)
        assert await pg.locator("[data-rxundo]").count() >= 3
        await pg.locator("[data-rxundo]").first.click(); await pg.wait_for_timeout(150)
        assert await pg.evaluate(f"[item('{B}').rack,SRX.more(item('{B}'))]") == ["6-1", 0]
        # टाइल पर 📍+1
        assert await pg.evaluate(f"!!SRX.xfer('{C}','6-2','6-7',3)")
        await pg.evaluate("SRX.close();renderBill()"); await pg.wait_for_timeout(150)
        assert await pg.evaluate(f"(document.querySelector('.card[data-item=\"{C}\"] .rkb')||{{}}).textContent||''") == "📍6-2+1"
        # खाने का स्टिकर पहले (सामान नहीं चुना) = उस खाने का सामान
        await pg.evaluate("SRX.open()"); await pg.evaluate("handleScan('R6-4')"); await pg.wait_for_timeout(150)
        assert "6-4" in await pg.inner_text("#srxSheet") and await pg.input_value("#srxN") == str(10 + 3)
        # बिना जगह वाला → सीधा घर
        await pg.evaluate("SRX.close()")
        assert await pg.evaluate(f"!!SRX.xfer('{F}','','6-6',0)") and await pg.evaluate(f"item('{F}').rack") == "6-6"
        # 🧠 सुझाव: 6 मसाले, रैक 6 घर → 15-12 / 8-3 वाले "ले जाएँ"
        await pg.evaluate("SRX.open()"); await pg.click('[data-rxtab="idea"]'); await pg.wait_for_timeout(150)
        t = await pg.inner_text("#srxSheet")
        assert "रैक 6★" in t and "ले जाएँ" in t and "खाली खाने" in t, t[:600]
        assert await pg.locator(f'[data-rxidea="{E}"]').count() == 1
        await pg.screenshot(path=f"{SHOTS}/x3-ideas.png", full_page=True)
        await pg.click(f'[data-rxidea="{E}"]'); await pg.wait_for_timeout(150)
        assert await pg.input_value("#srxTo") != "" and "15-12" in await pg.inner_text("#srxSheet")
        await pg.evaluate("SRX.close()")
        # लेबल टैब और सेटिंग में भी बटन
        await pg.evaluate("S.tab='label';showTab()"); await pg.wait_for_timeout(200)
        assert await pg.locator("#p-label [data-rkxopen]").count() == 1
        # 🛒 खरीद: 📍 पहले वाला खाना + 🏷️ लेबल
        await pg.evaluate("S.tab='kharid';showTab()"); await pg.wait_for_timeout(300)
        await pg.evaluate(f"SF.scanAdd(item('{D}'))"); await pg.wait_for_timeout(200)
        assert await pg.input_value("#piK") == "6-4"
        lb = await pg.locator("#piL").count()
        await pg.fill("#piK", "6-7"); await pg.fill("#piQ", "5"); await pg.fill("#piR", "30"); await pg.wait_for_timeout(50)
        await pg.click("[data-pisave]"); await pg.wait_for_timeout(500)
        assert await pg.evaluate(f"SRX.state(item('{D}')).x['6-7']") == 5
        if lb: assert await pg.evaluate("window.__pr||0") >= 1 and await pg.evaluate("window.__imgs") == 5
        await br.close()
    assert not errs, errs
    print("✅ रैक-बदलें टेस्ट पास")


asyncio.run(main())
