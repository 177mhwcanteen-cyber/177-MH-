"""💻 लैपटॉप: Web Serial से सीधी छपाई (बिल + लेबल), प्रिंटर कार्ड, F2 खोज — नकली serial पोर्ट से"""
import asyncio, sys, os, subprocess, time
from playwright.async_api import async_playwright
WWW = sys.argv[1] if len(sys.argv) > 1 else "www"; SHOTS = sys.argv[2] if len(sys.argv) > 2 else "/tmp"
FAKE = """(()=>{const W=window.__w=[];class P{constructor(i){this.i=i;this.writable=null}getInfo(){return this.i}
 async open(o){this.o=o;const me=this;this.writable={getWriter(){return {write:async u=>{W.push([me.i.tag,u.length,Array.from(u.slice(0,12))])},releaseLock(){}}}}}async close(){this.writable=null}}
 const A=new P({bluetoothServiceClassId:'00001101-0000-1000-8000-00805f9b34fb',tag:'bt'}),B=new P({usbVendorId:0x1fc9,usbProductId:0x2016,tag:'usb'});let next=A;
 Object.defineProperty(navigator,'serial',{value:{getPorts:async()=>[A,B],requestPort:async()=>next}});window.__next=t=>{next=t==='usb'?B:A}})();"""
async def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", "8799"], cwd=WWW, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx = await b.new_context(viewport={"width": 1366, "height": 768}); pg = await ctx.new_page()
            errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.add_init_script(FAKE)
            await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
            await pg.goto("http://localhost:8799/index.html"); await pg.wait_for_timeout(2000)
            assert await pg.evaluate("SDK.ok&&!SDK.has('bill')")
            # 🖨️ कार्ड प्रिंटर-शीट में (लेबल टैब → इस फोन के प्रिंटर)
            await pg.evaluate("prnGo()"); await pg.wait_for_timeout(400)
            assert await pg.locator("#p-label .sdk-c").count() == 1
            await pg.click('#p-label [data-sdkpick="bill"][data-w="80"]'); await pg.wait_for_timeout(300)
            await pg.evaluate("__next('usb')"); await pg.click('#p-label [data-sdkpick="label"][data-t="tspl"]'); await pg.wait_for_timeout(300)
            st = await pg.evaluate("[SDK.has('bill'),SDK.has('label'),SE.printer.addr,SE.printer.width,SF.labelPrinter.addr,SE.canDirect('bill')]")
            assert st == [True, True, "web-serial", 576, "web-serial", True], st
            await pg.screenshot(path=f"{SHOTS}/desk-card.png")
            # 🧾 बिल सीधे ब्लूटूथ (COM) पर — ESC/POS (1B 40 …), डायलॉग नहीं
            await pg.evaluate("window.__w.length=0;SDK.port={}")
            r = await pg.evaluate("SE.printReceipt({no:7,date:today(),ts:Date.now(),items:[{id:'x',name:'TEST',qty:2,price:10,rate:10,amt:20}],total:20,pay:'cash',byName:'टेस्ट'},{})")
            w = await pg.evaluate("window.__w")
            assert r == "serial" and w and all(x[0] == "bt" for x in w) and sum(x[1] for x in w) > 1000 and w[0][2][:2] == [27, 64], (r, w[:2])
            # 🏷️ जाँच लेबल USB पर — TSPL ("SIZE")
            await pg.evaluate("window.__w.length=0"); await pg.evaluate("SDK.test('label')")
            w = await pg.evaluate("window.__w"); assert w and w[0][0] == "usb" and bytes(w[0][2][:4]) == b"SIZE", w[:1]
            # ✕ हटाना → फिर पुराना तरीका
            await pg.click('#p-label [data-sdkx="bill"]'); await pg.wait_for_timeout(200)
            assert await pg.evaluate("[SDK.has('bill'),SE.canDirect('bill'),SE.printer.addr]") == [False, False, ""]
            # ⌨️ F2 = खोज
            await pg.evaluate("S.tab='bill';showTab()"); await pg.keyboard.press("F2"); assert await pg.evaluate("document.activeElement.id") == "q"
            # 🖥️ ग्राहक स्क्रीन: बिल में सामान → दूसरी खिड़की में सामान + कुल + UPI QR; सेव → धन्यवाद
            disp = await pg.context.new_page(); await disp.goto("http://localhost:8799/display.html"); await disp.wait_for_timeout(400)
            await pg.evaluate("S.tab='bill';showTab()"); await pg.wait_for_timeout(200)
            await pg.evaluate("(()=>{const L=S.items.filter(i=>i.unit==='pc'||!i.unit).slice(0,2);L.forEach((it,k)=>{it.sale=it.sale||(k?25:40);it.mrp=it.mrp||(k?30:40);quickAdd(it,k+1)})})()"); await pg.wait_for_timeout(400)
            await pg.evaluate("closeSheet()")
            assert await pg.evaluate("S.cart.length") >= 1
            await disp.wait_for_timeout(500); t = await disp.inner_text("main")
            assert "कुल" in t and await disp.locator("#qr canvas, #qr img").count() >= 1, t[:200]
            assert await pg.locator("#side [data-sdkcust]").count() == 1 and await pg.locator("#side .sdk-keys").count() == 1
            # ⌨️ + / − / Delete आख़िरी सामान पर
            q0 = await pg.evaluate("S.cart[S.cart.length-1].qty"); await pg.evaluate("document.activeElement.blur()")
            await pg.keyboard.press("+"); await pg.wait_for_timeout(200)
            if await pg.evaluate("!!document.querySelector('#side [data-sinc]')"): assert await pg.evaluate("S.cart[S.cart.length-1].qty") == q0 + 1
            await pg.screenshot(path=f"{SHOTS}/desk-bill.png"); await disp.screenshot(path=f"{SHOTS}/desk-display.png")
            await pg.evaluate("SDK.custPaid({no:'T-9',total:120,lines:[]})"); await disp.wait_for_timeout(400)
            assert "धन्यवाद" in await disp.inner_text("main")
            await pg.keyboard.press("Delete"); await pg.wait_for_timeout(200)
            await pg.keyboard.press("F1"); assert await pg.locator("#sdkHelp").count() == 1; await pg.keyboard.press("Escape"); assert await pg.locator("#sdkHelp").count() == 0
            assert not errs, errs
            # 📴 बिना इंटरनेट: दोबारा खोलें तो भी ऐप खुले (sw.js कैश)
            await pg.evaluate("navigator.serviceWorker.ready.then(()=>1)"); await pg.wait_for_timeout(1500)
            await pg.reload(); await pg.wait_for_timeout(1500)
            await pg.context.set_offline(True); await pg.reload(); await pg.wait_for_timeout(2000)
            assert await pg.locator("#q").count() == 1 and await pg.evaluate("typeof SDK==='object'"), "ऑफ़लाइन खुला नहीं"
            d2 = await pg.context.new_page(); await d2.goto("http://localhost:8799/display.html"); assert "177" in await d2.inner_text("header")
            await pg.context.set_offline(False)
            assert not errs, errs; await b.close()
    finally: srv.kill()
    print("✅ लैपटॉप टेस्ट पास")
asyncio.run(main())
