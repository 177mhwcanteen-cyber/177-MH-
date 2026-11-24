"""177 MH — 💻 लैपटॉप: कैमरा-स्कैन + 🔵 ब्लूटूथ (BLE) छपाई (24-11-2026): BarcodeDetector न हो (Windows/Linux Chrome, Firefox) तो Quagga2 (web/vendor)।
नकली वेबकैम (Chrome --use-file-for-fake-video-capture) पर EAN-13 → बिलिंग वाला कैमरा और स्कैन-पॉपअप दोनों पढ़ें; फालतू नहीं।
उपयोग: python3 tests/scanlap.py <www> <shots>"""
import asyncio, base64, os, sys, threading, http.server, functools
import numpy as np, cv2
from playwright.async_api import async_playwright
WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8797), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
Y4M = os.path.join(SHOTS, "cam.y4m")
BLEMOCK = r"""window.__ble=[];(()=>{let conn=false;const ch={properties:{writeWithoutResponse:true},writeValueWithoutResponse:async d=>{if(window.__bleFail){window.__bleFail--;throw new Error('gatt lost')}window.__ble.push(d.length)}};
const dev={id:'dev1',name:'MPT-II',gatt:{get connected(){return conn},connect:async()=>{conn=true;return dev.gatt},disconnect(){conn=false},getPrimaryService:async u=>{if(u==='000018f0-0000-1000-8000-00805f9b34fb')return {getCharacteristic:async()=>ch};throw new Error('no')},getPrimaryServices:async()=>[]}};
Object.defineProperty(navigator,'bluetooth',{value:{requestDevice:async o=>{window.__opt=o;return dev},getDevices:async()=>[dev]}})})();
"""
async def make_video(p):
    b = await p.chromium.launch(); pg = await b.new_page(); await pg.set_content("<html></html>")
    await pg.add_script_tag(content=open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read())
    d = await pg.evaluate("""()=>{const c=document.createElement('canvas');JsBarcode(c,'8901030865275',{format:'EAN13',width:3,height:120,margin:40,background:'#fff'});return c.toDataURL().split(',')[1]}""")
    await b.close()
    bc = cv2.imdecode(np.frombuffer(base64.b64decode(d), np.uint8), cv2.IMREAD_COLOR)
    W, Hh = 640, 480; fr = np.full((Hh, W, 3), (90, 110, 130), np.uint8); h, w = bc.shape[:2]; fr[(Hh-h)//2:(Hh-h)//2+h, (W-w)//2:(W-w)//2+w] = bc
    yuv = cv2.cvtColor(fr, cv2.COLOR_BGR2YUV_I420)
    with open(Y4M, "wb") as f:
        f.write(b"YUV4MPEG2 W640 H480 F15:1 Ip A1:1 C420jpeg\n")
        for _ in range(20): f.write(b"FRAME\n"); f.write(yuv.tobytes())
async def main():
    async with async_playwright() as p:
        await make_video(p)
        b = await p.chromium.launch(args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--use-file-for-fake-video-capture=" + Y4M])
        ctx = await b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block", permissions=["camera"]); pg = await ctx.new_page()
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();delete window.BarcodeDetector;")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8797/index.html"); await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""async()=>{const R={bd:'BarcodeDetector' in window,can:SE.canLiveScan()};
          const p=SE.scan();R.one=await Promise.race([p,new Promise(r=>setTimeout(()=>r('timeout'),10000))]);document.querySelectorAll('.camov button').forEach(b=>b.click());
          const v=document.createElement('video');v.muted=true;v.playsInline=true;document.body.appendChild(v);const got=[];
          R.start=await SE.cam.start(c=>got.push(c),v);await new Promise(r=>setTimeout(r,5000));await SE.cam.stop();R.live=got;return R}""")
        print(r)
        assert not r["bd"] and r["can"], r
        assert r["one"] == "8901030865275", r
        assert r["start"] and r["live"] and set(r["live"]) == {"8901030865275"}, r
        # 🔵 BLE प्रिंटर (नकली navigator.bluetooth): चुनना → 180 बाइट के टुकड़े → बीच में टूटे तो दोबारा जुड़कर → भूलना
        pg2 = await ctx.new_page(); pg2.on("pageerror", lambda e: errs.append(str(e)))
        await pg2.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg2.add_init_script(BLEMOCK)
        await pg2.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg2.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg2.goto("http://127.0.0.1:8797/index.html"); await pg2.wait_for_timeout(1500)
        r = await pg2.evaluate("""async()=>{const R={ok:SDK.bleOk};const c=document.createElement('div');c.innerHTML=SDK.cardHTML();document.body.appendChild(c);
          c.querySelector('[data-sdkble=bill]').click();await new Promise(r=>setTimeout(r,500));R.can=SE.canDirect('bill');
          let b='';for(let i=0;i<1000;i++)b+=String.fromCharCode(i%256);await SDK.send('bill',btoa(b));R.chunks=window.__ble.slice();
          window.__bleFail=1;window.__ble=[];await SDK.send('bill',btoa(b.slice(0,300)));R.retry=window.__ble.slice();await SDK.forget('bill');R.after=SDK.has('bill');return R}""")
        print(r)
        assert r == {"ok": True, "can": True, "chunks": [180, 180, 180, 180, 180, 100], "retry": [180, 120], "after": False}, r
        await b.close()
    assert not errs, errs
    print("✅ लैपटॉप स्कैन + ब्लूटूथ टेस्ट पास")
asyncio.run(main())
