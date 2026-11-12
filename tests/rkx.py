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
        # बिलिंग में चिप — लिखा हुआ दिखे (पहले सफ़ेद पर सफ़ेद था)
        await pg.evaluate("S.tab='bill';showTab()"); await pg.wait_for_timeout(200)
        if not await pg.locator("#cats [data-rkxopen]").count(): await pg.click("#cats [data-tools]"); await pg.wait_for_timeout(150)  # चरण 4
        chip = pg.locator("#cats [data-rkxopen]")
        assert await chip.count() == 1 and "रैक बदलें" in await chip.inner_text()
        col = await chip.evaluate("e=>{const c=getComputedStyle(e);return [c.color,c.backgroundColor]}")
        assert col[0] != col[1], col
        await chip.click(); await pg.wait_for_selector("#rxMain")
        # पूरी स्क्रीन: ऊपर पट्टी (‹ · 📷 · 3 टैब), ऐप का हेडर छिपा
        assert await pg.locator("#srxSheet [data-rxtab]").count() == 3 and await pg.is_visible("[data-rxback]")
        assert await pg.evaluate("getComputedStyle(document.querySelector('header')).visibility") == "hidden"
        await pg.screenshot(path=f"{SHOTS}/x1-open.png")
        # 📷 कैमरा चालू हो तो कैमरे की खिड़की पट्टी के ठीक नीचे पूरी दिखे, काम उसके नीचे (पहले कैमरा ढक जाता था)
        geo = await pg.evaluate("""(()=>{document.documentElement.classList.add('camon');const w=document.getElementById('camwin');w.hidden=false;w.style.display='block';
          const g=e=>e.getBoundingClientRect(),b=g(document.querySelector('#srxSheet .rx-bar')),c=g(w),m=g(document.getElementById('rxMain'));
          const r=[b.bottom,c.top,c.bottom,m.top,+getComputedStyle(w).zIndex];document.documentElement.classList.remove('camon');w.hidden=true;w.style.display='';return r})()""")
        assert abs(geo[1] - geo[0]) <= 2 and geo[2] - geo[1] > 120 and geo[3] >= geo[2] - 2 and geo[4] > 60, geo
        # सामान स्कैन → कहाँ-कहाँ कितना
        await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(150)
        t = await pg.inner_text("#rxMain")
        assert "7-5" in t and "10 पीस" in t and "मुख्य जगह" in t and "कहाँ से उठाना है" in t, t[:400]
        assert await pg.input_value("#srxN") == "10"
        assert await pg.is_disabled("[data-rxgo]"), "नया खाना चुने बिना बटन बंद"
        await pg.fill("#srxN", "8")
        # खाने का स्टिकर स्कैन = कहाँ रखना है
        await pg.evaluate("handleScan('R6-2')"); await pg.wait_for_timeout(150)
        assert await pg.input_value("#srxTo") == "6-2"
        await pg.fill("#srxN", "8"); await pg.wait_for_timeout(50)
        t = await pg.inner_text("#rxRoute"); assert "बचेंगे" in t and "2 पीस" in t and "हो जाएँगे" in t and "8 पीस" in t, t
        assert "8 पीस भेजें" in await pg.inner_text("[data-rxgo]")
        await pg.screenshot(path=f"{SHOTS}/x2-item.png")
        await pg.click("[data-rxgo]"); await pg.wait_for_timeout(250)
        assert await pg.is_visible(".rx-done") and "6-2" in await pg.inner_text(".rx-done")
        L = await pg.evaluate(f"SRX.locs(item('{A}')).map(l=>[l.k,l.q,l.main])")
        assert L == [["7-5", 2, True], ["6-2", 8, False]], L
        assert await pg.evaluate(f"S.pstock['{A}'].qty") == 10, "कुल स्टॉक वही"
        assert await pg.evaluate(f"item('{A}').rack") == "7-5"
        # ↩ वापस (हरे कार्ड से)
        await pg.click(".rx-done [data-rxundo]"); await pg.wait_for_timeout(200)
        assert await pg.evaluate(f"SRX.locs(item('{A}')).map(l=>[l.k,l.q])") == [["7-5", 10]]
        assert await pg.evaluate(f"!!SRX.xfer('{A}','7-5','6-2',8)")
        # ज़्यादा नहीं भेज सकते
        assert await pg.evaluate(f"SRX.xfer('{A}','6-2','6-4',9)") is False
        # 6-2 का 8 वापस 7-5 (मुख्य) → एक ही जगह
        assert await pg.evaluate(f"!!SRX.xfer('{A}','6-2','7-5',8)")
        assert await pg.evaluate(f"SRX.locs(item('{A}')).map(l=>[l.k,l.q])") == [["7-5", 10]]
        # सारा माल दूसरी जगह = मुख्य जगह बदली
        assert await pg.evaluate(f"!!SRX.xfer('{A}','7-5','8-3',10)")
        assert await pg.evaluate(f"item('{A}').rack") == "8-3" and await pg.evaluate(f"SRX.more(item('{A}'))") == 0
        # आधा + "मुख्य यही" = पुराने में बचा अलग गिना
        assert await pg.evaluate(f"!!SRX.xfer('{B}','6-1','6-5',4,true)")
        _v = await pg.evaluate(f"SRX.locs(item('{B}')).map(l=>[l.k,l.q,l.main])"); assert _v == [["6-5", 4, True], ["6-1", 7, False]], _v
        # आज के ट्रांसफ़र + ↩
        await pg.evaluate("SRX.close();SRX.open()"); await pg.wait_for_timeout(100)
        assert await pg.locator(".rx-log [data-rxundo]").count() >= 3
        await pg.locator(".rx-log [data-rxundo]").first.click(); await pg.wait_for_timeout(150)
        assert await pg.evaluate(f"[item('{B}').rack,SRX.more(item('{B}'))]") == ["6-1", 0]
        # टाइल पर 📍+1 · बंद करने पर हेडर वापस
        assert await pg.evaluate(f"!!SRX.xfer('{C}','6-2','6-7',3)")
        await pg.click("[data-rxback]"); await pg.wait_for_timeout(150)
        assert await pg.locator("#srxSheet").count() == 0 and await pg.evaluate("getComputedStyle(document.querySelector('header')).visibility") == "visible"
        assert await pg.evaluate(f"(document.querySelector('.card[data-item=\"{C}\"] .rkb')||{{}}).textContent||''") == "📍6-2+1"
        # खाने का स्टिकर पहले (सामान नहीं चुना) = उस खाने का सामान
        await pg.evaluate("SRX.open()"); await pg.evaluate("handleScan('R6-4')"); await pg.wait_for_timeout(150)
        assert "6-4" in await pg.inner_text("#rxMain") and await pg.input_value("#srxN") == str(10 + 3)
        # नाम से खोज → सूची में 📍 जगह
        await pg.click("[data-rxnew]"); await pg.fill("#srxQ", await pg.evaluate(f"item('{B}').name.slice(0,4)")); await pg.wait_for_timeout(150)
        assert await pg.locator(f'#rxHits [data-rxpick="{B}"]').count() == 1 and "📍6-1" in await pg.inner_text(f'#rxHits [data-rxpick="{B}"]')
        # बिना जगह वाला → सीधा घर
        await pg.evaluate("SRX.close()")
        assert await pg.evaluate(f"!!SRX.xfer('{F}','','6-6',0)") and await pg.evaluate(f"item('{F}').rack") == "6-6"
        # 🗄️ रैक देखें: रैक → खानों की जाली → खाने का सामान → "यहाँ रखना है" = अगला स्कैन सीधे वहीं
        rl = await pg.evaluate("(((window.SRK&&SRK.RL)||[]).find(x=>x.r===6)||{}).n||0")   # भैरव में नक्शा खाली (मालिक जोड़ें) → जाली वाली जाँच नहीं
        if rl:
            await pg.evaluate("SRX.open(null,{tab:'rack'})"); await pg.wait_for_timeout(150)
            assert await pg.locator(".rx-rack").count() == await pg.evaluate("SRK.RL.length")
            await pg.click('[data-rxrk="6"]'); await pg.wait_for_timeout(150)
            assert await pg.locator(".rx-cell").count() == rl and await pg.locator(".rx-cell.empty").count() >= 1
            gone = await pg.evaluate("[...Array(%d)].filter((_,i)=>SRK.canon('6-'+(i+1))!=='6-'+(i+1)).length" % rl)
            assert await pg.locator(".rx-cell.gone").count() == gone, "मिला दिए गए खाने (जैसे 6-3 → 6-2) धुँधले"
            await pg.click('[data-rxkh="6-4"]'); await pg.wait_for_timeout(150)
            assert await pg.locator(f'#rxMain [data-rxpick="{D}"]').count() == 1
            await pg.screenshot(path=f"{SHOTS}/x4-rack.png")
            await pg.click('[data-rxput="6-4"]'); await pg.wait_for_timeout(150)
            assert "6-4" in await pg.inner_text(".rx-pre")
            await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(150)
            assert await pg.input_value("#srxTo") == "6-4"
        else:
            await pg.evaluate("SRX.open(null,{tab:'rack'})"); await pg.wait_for_timeout(150)
            assert "नक्शा अभी नहीं बना" in await pg.inner_text("#rxMain")
        await pg.evaluate("SRX.close()")
        # 🧠 सुझाव: स्कोर + किस्म का घर (6 में से 4 मसाले रैक 6 → घर 6 अपने-आप) + बाहर वाले "घर ले जाएँ" + खाली खाने
        await pg.evaluate("SRX.open(null,{tab:'idea'})"); await pg.wait_for_timeout(200)
        t = await pg.inner_text("#rxMain")
        assert "जमावट स्कोर" in t and "🏠 रैक 6" in t and "घर ले जाएँ" in t and "खाली खाने" in t, t[:700]
        assert "undefined" not in t and "NaN" not in t
        sc = await pg.evaluate("SRX.ideas().score"); assert 0 < sc < 100, sc
        assert await pg.locator(f'[data-rxidea="{E}"]').count() == 1
        assert await pg.evaluate("document.getElementById('rxMain').scrollWidth<=document.getElementById('rxMain').clientWidth+1"), "दाएँ-बाएँ नहीं खिसकना चाहिए"
        await pg.screenshot(path=f"{SHOTS}/x3-ideas.png")
        await pg.click(f'[data-rxidea="{E}"]'); await pg.wait_for_timeout(150)
        to = await pg.input_value("#srxTo"); assert to.startswith("6-") and "15-12" in await pg.inner_text("#rxMain"), to
        # 🏠 मालिक किस्म का घर खुद चुने
        assert await pg.evaluate("SRX.setHome('masala',15)") and await pg.evaluate("SRX.zones().masala.home") == 15
        await pg.evaluate("SRX.setHome('masala',0)")
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
