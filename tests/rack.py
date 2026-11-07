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
        # 31-2 = दुकान का अंदर वाला हिस्सा → मुख्य जगह ही (गोदाम नहीं)
        await pg.fill("#srkR", "31-2"); await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"[item('{A}').rack,item('{A}').grack||'']") == ["31-2", ""]
        await pg.fill("#srkR", "11-23"); await pg.evaluate(f"handleScan(SF.itemCode(item('{A}')))"); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"item('{A}').rack") == "11-23"
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
        # छोटी जगहें मिलीं: पुराने फोटो-नंबर → नए, अलग रैक की चिप नहीं
        assert await pg.evaluate("[SRK.canon('2-1'),SRK.canon('3-4'),SRK.canon('14-2'),SRK.canon('16-1')]") == ["1-7", "12-8", "13-14", "10-5"]
        assert not await pg.query_selector('[data-srksel="2"]') and not await pg.query_selector('[data-srksel="16"]')
        await pg.fill("#srkR", "2-1"); await pg.wait_for_timeout(100)
        assert "अब 1-7" in await pg.inner_text("#srkInfo")
        await pg.fill("#srkQ", nm[:6]); await pg.wait_for_timeout(150); await pg.click(f'[data-srkset="{B}"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"item('{B}').rack") == "1-7", "पुराना नंबर = नया खाना"
        await pg.fill("#srkR", "11-23"); await pg.fill("#srkQ", nm[:6]); await pg.wait_for_timeout(150); await pg.click(f'[data-srkset="{B}"]'); await pg.wait_for_timeout(300)
        # 🧭 घर: मसाला → 6, चिप्स → 10, स्टेशनरी → 15
        assert await pg.evaluate("[SRK.home({name:'EVEREST GARAM MASALA',sub:'masala',cat:'kirana'}).r,SRK.home({name:'LAYS MAGIC MASALA',cat:'kirana',sub:'namkeen'}).r,SRK.home({name:'CELLO PEN',cat:'stationery'}).r]") == [6, 10, 15]
        await pg.evaluate(f"window.__cc=[item('{C}').sub,item('{C}').cat];item('{C}').sub='masala';item('{C}').cat='kirana'")
        au = await pg.evaluate("(()=>{const A=SRK.audit();return {m:A.move.map(x=>x.it.id),g:A.groups.find(g=>g.k==='masala')}})()")
        assert C in au["m"] and au["g"]["r"] == 6, au
        await pg.click("[data-srkaud]"); await pg.wait_for_timeout(200)
        t = await pg.inner_text(".srk-au"); assert "मसाले" in t and "रैक 6" in t, t[:300]
        await pg.screenshot(path=f"{SHOTS}/r4-audit.png", full_page=True)
        await pg.click("[data-srkmv]"); await pg.wait_for_timeout(200)
        h = (await pg.evaluate("window.__pr"))["h"]; assert "ले जाएँ" in h and "9-14" in h, h[:300]
        await pg.evaluate(f"item('{C}').sub=__cc[0];item('{C}').cat=__cc[1]")
        # 🪧 बोर्ड A4 + स्टिकर पर घर
        await pg.evaluate("SRK.boards([6,11])"); h = (await pg.evaluate("window.__pr"))["h"]
        assert h.count('class="bd"') == 2 and "6-13" in h and "मसाले" in h
        p2 = await ctx.new_page(); await p2.set_content("<html><body>" + h + "</body></html>"); await p2.screenshot(path=f"{SHOTS}/r5-board.png"); await p2.close()
        assert (await pg.evaluate("SRK.homeOf('10-5')")).startswith("मिठाई")
        # 🏷️ नया स्टिकर: QR (2D) + Code-128 (1D) + बड़ा नंबर
        assert await pg.evaluate("(()=>{const c=SRK.stickerCanvas('11-23');return c._qr===1&&c._bc>=1})()")
        p2 = await ctx.new_page(); u = await pg.evaluate("SRK.stickerCanvas('11-23').toDataURL()"); await p2.set_content(f"<img src='{u}' style='border:1px solid #000'><img src='" + await pg.evaluate("SRK.stickerCanvas('31-5').toDataURL()") + "' style='border:1px solid #000'>"); await p2.screenshot(path=f"{SHOTS}/r6-sticker.png"); await p2.close()
        # 🧩 खाना बढ़ाओ (फोटो में छूटा) → नए खानों के स्टिकर · से–तक · आख़िरी हटाओ
        await pg.evaluate("SRK.open()"); await pg.click('[data-srksel="5"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-srkadd="1"]'); await pg.wait_for_timeout(200)
        assert await pg.evaluate("SRK.RK[5].n") == 8 and await pg.evaluate("S.settings.rk.n['5']") == 8
        await pg.click(".srk-nf"); await pg.wait_for_timeout(500); h = (await pg.evaluate("window.__pr"))["h"]; assert h.count("<img") == 1, h.count("<img")
        await pg.fill("#srkFa", "2"); await pg.fill("#srkFb", "4"); await pg.click('.srk-tl [data-srkrange="5"]'); await pg.wait_for_timeout(500)
        assert (await pg.evaluate("window.__pr"))["h"].count("<img") == 3
        await pg.click("[data-srkdel]"); await pg.wait_for_timeout(200); assert await pg.evaluate("SRK.RK[5].n") == 7
        assert await pg.evaluate("SRK.total()") == 238
        # ➕ नया रैक
        await pg.click('[data-srknew="0"]'); await pg.wait_for_timeout(150)
        assert await pg.input_value("#srkNr") == "22"
        await pg.fill("#srkNn", "4"); await pg.fill("#srkNm", "दरवाज़े के पीछे"); await pg.click("[data-srknrsave]"); await pg.wait_for_timeout(200)
        assert await pg.evaluate("SRK.RK[22]&&SRK.RK[22].n") == 4 and await pg.query_selector('[data-srksel="22"]') and await pg.evaluate("SRK.total()") == 242
        assert await pg.evaluate("SRK.addRack(2,3,'x')") is False, "मिलाया गया नंबर दोबारा नहीं"
        # ↔ खाना → खाना, रैक → रैक (कम खाने = रोक)
        await pg.evaluate(f"SRK.move('11-23','4-2')"); await pg.wait_for_timeout(200)
        assert await pg.evaluate(f"[item('{A}').rack,item('{B}').rack]") == ["4-2", "4-2"]
        await pg.evaluate(f"SRK.move('4-2','11-23')"); await pg.wait_for_timeout(200)
        assert await pg.evaluate("SRK.move('9','7')") == 0 and await pg.evaluate(f"item('{C}').rack") == "9-14", "7 में 13 खाने — 9-14 नहीं जा सकता"
        assert await pg.evaluate("SRK.move('9','11')") == 1 and await pg.evaluate(f"item('{C}').rack") == "11-14"
        await pg.evaluate("SRK.move('11-14','9-14')")
        await pg.click('[data-srksel="11"]'); await pg.wait_for_timeout(150); await pg.click('[data-srkfrom="11-23"]'); await pg.wait_for_timeout(100)
        assert await pg.input_value("#srkTa") == "11-23"
        # 📊 रैक का हिसाब + 🧠 सुझाव (12 दिन के नकली बिल)
        await pg.evaluate(f"""(()=>{{const B={{}};for(let i=1;i<=12;i++){{const d=today(new Date(Date.now()-i*864e5));B[d]=[{{no:'b'+i,byName:i%2?'मुकेश':'मनोहर',lines:[{{id:'{C}',name:'C',qty:5,amt:100,rk:'9-14'}},{{id:'{A}',name:'A',qty:1,amt:20,rk:'11-23'}}]}}]}};SRK._demoBills=B}})()""")
        await pg.evaluate(f"S.purchHist=[{{id:'pz',date:today(new Date(Date.now()-2*864e5)),byName:'मनोहर',lines:[{{id:'{C}',qty:24,amt:480}}]}}]")
        await pg.click('[data-srkrep="15"]'); await pg.wait_for_timeout(500)
        t = await pg.inner_text("#srkRep"); assert "रैक 9" in t and "पास लाएँ" in t and "ऊपर या अंदर" in t, t[:500]
        await pg.click('[data-srkrk="9"]'); await pg.wait_for_timeout(100)
        assert "मुकेश" in await pg.inner_text("#srkRep")
        assert "माल आया ₹480" in await pg.inner_text("#srkRep"), "रैक में माल आया"
        await pg.screenshot(path=f"{SHOTS}/r7-report.png")
        # 📷 रैक की फोटो (≤20 KB, photos/rk_9)
        await pg.click('[data-srksel="9"]'); await pg.wait_for_timeout(150)
        await pg.set_input_files('[data-srkph="9"]', os.path.join(SHOTS, "r6-sticker.png")); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("!!(SE.photos['rk_9']&&SE.photos['rk_9'].length*0.75<=20500)"), "रैक फोटो"
        assert await pg.query_selector(".srk-ph img")
        await pg.evaluate("SRK.boards([9])"); assert "data:image" in (await pg.evaluate("window.__pr"))["h"]
        # 📋 चिपकाने की सूची
        await pg.evaluate("SRK.checklist()"); h = (await pg.evaluate("window.__pr"))["h"]; assert "☐ 11-63" in h and "☐ 22-4" in h and "अंदर" in h
        p2 = await ctx.new_page(); await p2.set_content("<html><body>" + h + "</body></html>"); await p2.screenshot(path=f"{SHOTS}/r8-checklist.png", full_page=True); await p2.close()
        await pg.evaluate("SRK.open()")
        # 📥 AI से आई रैक-सूची (ZIP v4.8): बारकोड/नाम से मिलान, गलत खाना = चेतावनी, ऐप में नहीं = सूची
        bA = await pg.evaluate(f"SF.itemCode(item('{A}'))")
        r = await pg.evaluate(f"""SRK.importText(JSON.stringify({{items:[{{barcode:'{{bA}}'.replace('{{bA}}','{bA}'),rack:'१७-२',rackConf:'low'}},{{name:'NO SUCH ITEM',rack:'6-1'}},{{barcode:'{bA}',rack:'11-99'}}],racks:[{{rack:'17',thumb:document.createElement('canvas').toDataURL('image/png')}}]}}))""")
        assert r["ok"] == 1 and r["miss"] == ["NO SUCH ITEM"] and len(r["bad"]) == 1 and len(r["low"]) == 1, r
        assert await pg.evaluate(f"item('{A}').rack") == "17-2"
        r = await pg.evaluate(f"SRK.importText('{bA},11-23')"); assert r["ok"] == 1 and await pg.evaluate(f"item('{A}').rack") == "11-23", r
        # 🏷️ सामान के लेबल पर रैक
        assert await pg.evaluate(f"SL.dataOf(item('{A}')).rack") == "11-23" and await pg.evaluate("SL.cfg().show.rack")
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
        assert await pg.query_selector(f'#grid [data-item="{A}"] .rkb'), "टाइल पर 📍"
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
        # बिना रैक-शीट के खाने का स्टिकर स्कैन = जानकारी (बिल में कुछ न जुड़े)
        n0 = await pg.evaluate("S.cart.length"); await pg.evaluate("handleScan('R11-23')"); await pg.wait_for_timeout(200)
        assert await pg.evaluate("S.cart.length") == n0
        # 📷 editor: सामान चुना (arm) → खाने का स्टिकर = उसी का खाना
        await pg.evaluate(f"SRK.arm='{C}';handleScan('R7-3')"); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"item('{C}').rack") == "7-3"
        # नया सामान फ़ॉर्म: रैक खाना + घर का सुझाव
        if await pg.evaluate("!!document.querySelector('#ni-rack')&&document.querySelector('#ni-rack').offsetParent!==null"):
            await pg.evaluate("handleScan('R6-4')"); await pg.wait_for_timeout(200)
            assert await pg.input_value("#ni-rack") == "6-4"
            await pg.fill("#ni-name", "EVEREST GARAM MASALA"); await pg.select_option("#ni-cat", "kirana"); await pg.wait_for_timeout(100)
            await pg.evaluate("document.getElementById('ni-sub').value='masala';SRK.niHome()")
            assert "रैक 6" in await pg.inner_text("#ni-rkhome")
            print("नया सामान फ़ॉर्म ok")
        await br.close()
    assert not errs, errs
    print("✅ रैक टेस्ट पास")

asyncio.run(main())
