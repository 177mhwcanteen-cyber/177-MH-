"""177 MH कैंटीन — 🏷️ बारकोड पहरा की जाँच (डेमो):
बिना कंपनी बारकोड वाले सामान की सूची (बड़ी फोटो, स्टॉक) · लेबल लिस्ट में (स्टॉक जितने, छूट = MRP कटा) · "✅ लग गया" + स्कैन = पक्का ·
बिलिंग में दुकान-लेबल स्कैन = अपने-आप पक्का · पैकेट का बारकोड स्कैन = जुड़ जाए · स्कैन/हाथ की गिनती · हिसाब (छूट, हाथ से) · AI सुझाव · नया सामान।
उपयोग: python3 tests/bcode.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8773), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []


def ean(s12):
    t = sum(int(c) * (3 if i % 2 else 1) for i, c in enumerate(s12)); return s12 + str((10 - t % 10) % 10)


CO, HINT = ean("890600000001"), ean("890172513397")


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
        await pg.goto("http://127.0.0.1:8773/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true")
        # A, B, C, D: बिना कंपनी बारकोड · E: कंपनी बारकोड + छूट
        ids = await pg.evaluate("""()=>{const L=S.items.filter(i=>i.active!==false&&!i.virtual&&(i.unit==='pc')&&!['fast','mela'].includes(mcat(i))&&i.id!=='xyz').slice(0,6);
          L.forEach((i,k)=>{delete i.bcOk;delete i.bcAI;delete i.bcHint;delete i.noLbl;i.sale=i.sale>0?i.sale:50;i.code=i.code||String(7100+k);
            i.barcode=k!==4?ean13('2000000'+String(i.code).padStart(4,'0').slice(-4)+'0'):'"""+CO+"""';i.track=true;S.pstock[i.id]={qty:[12,3,7,0,9,4][k]}});
          L[0].mrp=L[0].sale+10;L[4].mrp=L[4].sale+5;return L.map(i=>i.id)}""")
        A, B, C, D, E, F = ids
        L = await pg.evaluate("SBC.list().map(i=>i.id)")
        assert all(x in L for x in (A, B, C, D, F)) and E not in L, L
        print("बारकोड चाहिए:", len(L))
        # सूची — बड़ी फोटो, स्टॉक
        await pg.evaluate("SBC.open()"); await pg.wait_for_timeout(500)
        c = await pg.query_selector(f'.sbc-c[data-sbcid="{A}"]'); assert c, "A का कार्ड"
        box = await (await c.query_selector(".sbc-ph .tile")).bounding_box(); assert box["height"] >= 100 and box["width"] >= 120, box
        t = await c.inner_text(); assert "12" in t and "स्टॉक" in t and "छूट" in t, t
        await pg.screenshot(path=f"{SHOTS}/b1-list.png")
        # 🏷️ 12 लेबल (स्टॉक जितने) + MRP चालू
        await pg.click(f'.sbc-c[data-sbcid="{A}"] [data-sbcadd]')
        q = await pg.evaluate(f"SL.list().find(r=>r.id==='{A}')"); assert q and q["n"] == 12 and q.get("mrp"), q
        assert await pg.evaluate(f"SL.dataOf(item('{A}'),SL.list().find(r=>r.id==='{A}')).mrpOn")
        # ✅ लग गया → गलत स्कैन पर नहीं, सही स्कैन पर पक्का
        await pg.click(f'.sbc-c[data-sbcid="{A}"] [data-sbcok]'); await pg.wait_for_timeout(200)
        assert await pg.query_selector(f'.sbc-c[data-sbcid="{A}"] .sbc-arm')
        await pg.evaluate(f"handleScan(SBC.ownCodes(item('{B}'))[0])"); await pg.wait_for_timeout(200)
        assert not await pg.evaluate(f"!!item('{A}').bcOk"), "दूसरे का लेबल = पक्का नहीं"
        await pg.evaluate(f"handleScan(SBC.ownCodes(item('{A}'))[0])"); await pg.wait_for_timeout(400)
        ok = await pg.evaluate(f"item('{A}').bcOk"); assert ok and ok["how"] == "scan", ok
        assert A not in await pg.evaluate("SBC.list().map(i=>i.id)")
        # 📷 कंपनी बारकोड है → पैकेट स्कैन = जुड़ जाए (पुराना बारकोड भी रहे)
        old = await pg.evaluate(f"item('{C}').barcode")
        await pg.click(f'.sbc-c[data-sbcid="{C}"] [data-sbcatt]'); await pg.wait_for_timeout(200)
        await pg.evaluate("handleScan('" + ean("890600000002") + "')"); await pg.wait_for_timeout(400)
        bc = await pg.evaluate(f"item('{C}').barcode"); assert bc.startswith(old + ",") and bc.endswith(ean("890600000002")), bc
        assert C not in await pg.evaluate("SBC.list().map(i=>i.id)")
        # 🤖 AI (नकली जवाब): D = कंपनी पैकेट + सुझाव → "AI वाला लगाएँ"
        await pg.evaluate("""([D,H])=>{SE.aiReady=()=>true;SE.ai=async p=>({ok:true,r:p.items.map(x=>({id:x.id,k:x.id===D?'pack':'loose',ean:x.id===D?H:'123'}))})}""", [D, HINT])
        await pg.click("[data-sbcai]"); await pg.wait_for_timeout(600)
        d = await pg.evaluate(f"({{k:item('{D}').bcAI,h:item('{D}').bcHint,b:item('{B}').bcAI,bh:item('{B}').bcHint||''}})"); assert d == {"k": "pack", "h": HINT, "b": "loose", "bh": ""}, d
        assert "कंपनी पैकेट" in await pg.inner_text("#sbcSheet")
        await pg.screenshot(path=f"{SHOTS}/b2-ai.png")
        await pg.click(f'.sbc-c[data-sbcid="{D}"] [data-sbchint]'); await pg.wait_for_timeout(300)
        assert HINT in await pg.evaluate(f"item('{D}').barcode")
        await pg.evaluate("closeSheet()")
        # बिलिंग: B का दुकान-लेबल स्कैन = बिल में + अपने-आप पक्का + sc
        await pg.evaluate("S.tab='bill';showTab()"); await pg.wait_for_timeout(200)
        await pg.evaluate(f"handleScan(SBC.ownCodes(item('{B}'))[0])"); await pg.wait_for_timeout(400)
        assert await pg.evaluate(f"item('{B}').bcOk.how") == "scan"
        assert await pg.evaluate(f"S.cart.find(l=>l.id==='{B}').sc") == 1
        # स्कैन/हाथ की गिनती
        await pg.evaluate(f"SBC.onBill([{{id:'{E}',unit:'pc',qty:3,sc:1}},{{id:'{E}',unit:'pc',qty:2}},{{id:'{B}',unit:'pc',qty:1,sc:1}}])")
        m = await pg.evaluate("SBC.mem[today()]"); assert m[f"s_{E}"] == 1 and m[f"t_{E}"] == 4 and m[f"s_{B}"] == 1, m
        # 📊 हिसाब
        await pg.evaluate("SBC.open('rep')"); await pg.wait_for_timeout(600)
        t = await pg.inner_text("#sbcSheet")
        assert "छूट वाले सामान" in t and "हाथ से जोड़े" in t and "स्कैन से" in t, t[:400]
        await pg.screenshot(path=f"{SHOTS}/b3-rep.png", full_page=True)
        await pg.click('[data-sbcadd][data-mrp]'); assert await pg.evaluate("SL.list().length") >= 1
        await pg.evaluate("closeSheet()")
        # नया सामान (बारकोड खाली) → पॉपअप
        await pg.evaluate(f"SBC.onNew('{F}')"); await pg.wait_for_timeout(300)
        assert await pg.query_selector("[data-nwatt]") and await pg.query_selector("#sbcSheet .sbc-ph .tile")
        await pg.screenshot(path=f"{SHOTS}/b4-new.png")
        await pg.click("[data-nwlbl]"); await pg.wait_for_timeout(200)
        assert not await pg.query_selector("#sbcSheet")
        # 🏷️ टैब पट्टी, ⚙️ कार्ड
        await pg.evaluate("S.tab='label';showTab()"); await pg.wait_for_timeout(300)
        assert await pg.query_selector("#p-label .sbc-bar")
        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_selector("#sbcCard")
        await br.close()
    assert not errs, errs
    print("✅ बारकोड-पहरा टेस्ट पास")

asyncio.run(main())
