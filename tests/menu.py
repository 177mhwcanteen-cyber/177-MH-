"""177 MH कैंटीन — 🏠 सब काम (☰) + ⚙️ सेटिंग का साफ़ मेन्यू + ◁ वापस-बटन (se-menu.js = SMN) की जाँच (डेमो):
☰ से हर काम एक टैप (नाम + एक लाइन), खोज · सेटिंग 11,000px की जगह छोटा मेन्यू, टैप = सिर्फ़ वही हिस्सा, ‹ वापस, खोज (अंदर के शब्द भी),
कोई पुराना हिस्सा/बटन ग़ायब नहीं · साथी को मालिक वाले काम नहीं · वापस-बटन का क्रम
उपयोग: python3 tests/menu.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8788), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read()
errs = []


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block")
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        await pg.add_init_script("window.__SET_FLAT__=false;window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8788/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true;S.tab='bill';showTab()"); await pg.wait_for_timeout(300)

        # ---- 🏠 सब काम ----
        assert await pg.is_visible("#smnBtn")
        await pg.click("#smnBtn"); await pg.wait_for_selector("#smnHome")
        n = await pg.locator("#hmMain .hm-t").count(); assert n >= 14, n
        # हर टाइल पर नाम + "यह क्या करता है" वाली लाइन
        assert await pg.evaluate("[...document.querySelectorAll('#hmMain .hm-t')].every(t=>t.querySelector('b').textContent.trim()&&t.querySelector('small').textContent.trim().length>8)")
        assert await pg.evaluate("document.getElementById('hmMain').scrollWidth<=document.getElementById('hmMain').clientWidth+1")
        await pg.screenshot(path=f"{SHOTS}/m1-home.png")
        # खोज: काम + सेटिंग के हिस्से (अंदर लिखे शब्द से भी)
        await pg.fill("#hmQ", "उधार"); await pg.wait_for_timeout(150)
        assert await pg.locator('#hmMain [data-hmgo="udhar"]').count() == 1 and await pg.locator("#hmMain .hm-t").count() <= 3
        await pg.fill("#hmQ", "प्रिंटर"); await pg.wait_for_timeout(150)
        assert await pg.locator('#hmMain [data-hmset="printer"]').count() == 1 and await pg.locator('#hmMain [data-hmset="lblp"]').count() == 1
        await pg.fill("#hmQ", "GSTIN"); await pg.wait_for_timeout(150)   # सिर्फ़ बिल-डिज़ाइन के अंदर लिखा है
        assert await pg.locator('#hmMain [data-hmset="rc"]').count() == 1
        await pg.click('#hmMain [data-hmset="rc"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("S.tab") == "set" and (await pg.evaluate("SMN.setState().cur")) == "rc" and await pg.locator("#smnHome").count() == 0
        assert await pg.is_visible("#rcDesign") and not await pg.is_visible("#slDesign")
        # टाइल = सीधा काम
        await pg.click("#smnBtn"); await pg.click('[data-hmgo="stock"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("S.tab") == "stock" and await pg.locator("#smnHome").count() == 0
        await pg.click("#smnBtn"); await pg.click('[data-hmgo="rkv"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("SRX.isOpen()") and (await pg.locator("#rxMain .rx-rack").count() > 5 or "नक्शा अभी नहीं बना" in await pg.inner_text("#rxMain"))
        assert await pg.evaluate("SMN.back()") == "srx" and not await pg.evaluate("SRX.isOpen()")
        # ⭐ ज़्यादा इस्तेमाल वाले ऊपर
        for _ in range(2):
            await pg.click("#smnBtn"); await pg.click('[data-hmgo="label"]'); await pg.wait_for_timeout(150)
        await pg.click("#smnBtn"); await pg.click('[data-hmgo="stock"]'); await pg.wait_for_timeout(150)
        await pg.click("#smnBtn"); await pg.wait_for_timeout(150)
        assert "ज़्यादा यही करते हैं" in await pg.inner_text("#hmMain")
        await pg.click("[data-hmclose]")

        # ---- ⚙️ सेटिंग मेन्यू ----
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_timeout(1500)
        st = await pg.evaluate("SMN.setState()")
        for k in ["items", "new", "photo", "sbc", "rack", "plog", "shop", "staff", "online", "printer", "rc", "lblp", "sl", "upd", "bk", "skj", "ai", "old", "zero"]:
            assert k in st["keys"], (k, st["keys"])
        assert st["cur"] == "" and await pg.locator("#p-set .smn-row").count() == len(st["keys"])
        h = await pg.evaluate("document.documentElement.scrollHeight"); assert h < 2400, h   # पहले ~11,700px
        assert await pg.evaluate("[...document.querySelectorAll('#p-set > [data-smn]')].every(e=>e.offsetParent===null)"), "मेन्यू में कोई हिस्सा खुला नहीं"
        assert "undefined" not in await pg.inner_text("#p-set .smn")
        await pg.screenshot(path=f"{SHOTS}/m3-set.png")
        # हर हिस्सा खुले, सिर्फ़ वही दिखे, ‹ से वापस — और किसी हिस्से का कोई बटन/खाना ग़ायब नहीं
        tot = await pg.evaluate("[...document.querySelectorAll('#p-set > [data-smn]:not(.snav)')].reduce((a,e)=>a+e.querySelectorAll('button,input,select').length,0)")
        seen = 0
        for k in st["keys"]:
            await pg.click(f'[data-smnopen="{k}"]'); await pg.wait_for_timeout(60)
            vis = await pg.evaluate("[...document.querySelectorAll('#p-set > [data-smn]')].filter(e=>!e.classList.contains('smn-h')).map(e=>e.dataset.smn)")
            assert vis and set(vis) == {k}, (k, vis)
            assert await pg.is_visible("#p-set .smn-bar [data-smnback]") and await pg.locator("#p-set > .smn").count() == 0
            seen += await pg.evaluate("[...document.querySelectorAll('#p-set > [data-smn]:not(.smn-h)')].reduce((a,e)=>a+e.querySelectorAll('button,input,select').length,0)")
            await pg.click("[data-smnback]"); await pg.wait_for_timeout(40)
        assert seen == tot and tot > 100, (seen, tot)
        # खोज
        await pg.fill("#smnQ", "PIN"); await pg.wait_for_timeout(150)
        assert await pg.locator('#smnBody [data-smnopen="staff"]').count() == 1 and await pg.locator("#smnBody .smn-row").count() <= 4
        assert await pg.evaluate("document.activeElement.id") == "smnQ", "लिखते समय की-बोर्ड न हटे"
        await pg.fill("#smnQ", "")
        # खुला हिस्सा दोबारा बनने (Firebase से बदलाव) पर भी वही खुला रहे; नया सामान सेव जैसा काम चलता रहे
        await pg.click('[data-smnopen="shop"]'); await pg.evaluate("renderSettings()"); await pg.wait_for_timeout(300)
        assert (await pg.evaluate("SMN.setState().cur")) == "shop" and await pg.is_visible("#p-set .smn-bar")
        await pg.screenshot(path=f"{SHOTS}/m5-shop.png")
        # लेबल टैब का "डिज़ाइन बदलें" → सीधे वही हिस्सा
        assert await pg.evaluate("SMN.openSet('slDesign')") and (await pg.evaluate("SMN.setState().cur")) == "sl" and await pg.is_visible("#slDesign")
        # ◁ वापस-बटन: हिस्सा → मेन्यू → बिलिंग → (कुछ नहीं = ऐप छोटा)
        assert await pg.evaluate("SMN.back()") == "set" and (await pg.evaluate("SMN.setState().cur")) == ""
        assert await pg.evaluate("SMN.back()") == "tab" and await pg.evaluate("S.tab") == "bill"
        assert await pg.evaluate("SMN.back()") == ""
        # शीट खुली हो तो पहले वही बंद
        await pg.evaluate("document.getElementById('sheet').innerHTML='<div class=\"sheet\">x</div>'")
        assert await pg.evaluate("SMN.back()") == "sheet" and await pg.evaluate("document.getElementById('sheet').innerHTML") == ""
        # दूसरे टैब से लौटने पर सेटिंग मेन्यू से शुरू
        await pg.evaluate("SMN.openSet('rc')"); await pg.click('#tabs [data-tab="report"]'); await pg.wait_for_timeout(200)
        await pg.click('#tabs [data-tab="set"]'); await pg.wait_for_timeout(400)
        assert (await pg.evaluate("SMN.setState().cur")) == "" and await pg.is_visible("#p-set .smn")

        # ---- साथी: मालिक वाले काम नहीं ----
        await pg.evaluate("S.isOwner=false;S.demo=false;S.tab='bill';showTab()"); await pg.wait_for_timeout(200)
        acts = await pg.evaluate("SMN.acts().map(a=>a.k)")
        assert "bill" in acts and "set" not in acts and "report" not in acts, acts
        assert await pg.evaluate("SMN.openSet('rc')") is False
        await pg.click("#smnBtn"); await pg.fill("#hmQ", "प्रिंटर"); await pg.wait_for_timeout(150)
        assert await pg.locator("#hmMain [data-hmset]").count() == 0
        await br.close()
    assert not errs, errs
    print("✅ मेन्यू टेस्ट पास")


asyncio.run(main())
