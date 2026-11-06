"""177 MH कैंटीन — 📸 असली फोटो की जाँच (डेमो):
बड़ी HD फोटो (3000px, किनारे पर खाली जगह) → ≤20 KB, खाली किनारा कटे, चौकोर · ZIP (deflate) से एक साथ, नाम से सही सामान (id/कोड/बारकोड/नाम) ·
10/15/20 का प्रॉम्प्ट (असली फोटो, फाइल-नाम = id) · ⚙️ कार्ड · ग्राहक-पेज वाली छोटी फोटो (112px)।
उपयोग: python3 tests/photo.py <www फ़ोल्डर> <स्क्रीनशॉट फ़ोल्डर>"""
import asyncio, io, os, sys, zipfile, threading, http.server, functools
from PIL import Image, ImageDraw, ImageFilter
from playwright.async_api import async_playwright

WWW, SHOTS = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(SHOTS, exist_ok=True)
H = os.path.dirname(os.path.abspath(__file__))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8772), functools.partial(http.server.SimpleHTTPRequestHandler, directory=WWW))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
MOCK = open(os.path.join(H, "mock-firebase.js"), encoding="utf8").read() + "\n" + open(os.path.join(H, "..", "node_modules/jsbarcode/dist/JsBarcode.all.min.js"), encoding="utf8").read()
errs = []


def pack_img(seed, w=3000, h=2400):
    """HD फोटो: सफ़ेद पृष्ठभूमि, बीच में रंगीन 'पैकेट' + शोर (भारी JPEG)"""
    im = Image.new("RGB", (w, h), (255, 255, 255)); d = ImageDraw.Draw(im)
    x0, y0 = int(w * .35), int(h * .2); d.rectangle([x0, y0, int(w * .65), int(h * .85)], fill=(200 - seed * 30, 40 + seed * 40, 30))
    for k in range(0, 600, 7): d.line([x0, y0 + k, int(w * .65), y0 + (k * 3) % 900], fill=(255, 220, 0), width=3)
    d.text((x0 + 40, y0 + 60), "EVEREST", fill=(255, 255, 255))
    b = io.BytesIO(); im.save(b, "JPEG", quality=95); return b.getvalue()


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width": 400, "height": 860}, service_workers="block", permissions=["clipboard-read", "clipboard-write"])
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errs.append(m.text))
        await pg.add_init_script("window.__MOCK__={};window.__USERS__={};localStorage.clear();")
        await pg.route("**/lib/vendor.js", lambda r: r.fulfill(body=MOCK, content_type="application/javascript"))
        await pg.route("**/config.js", lambda r: r.fulfill(body="window.SE_CONFIG={};", content_type="application/javascript"))
        await pg.goto("http://127.0.0.1:8772/index.html"); await pg.wait_for_timeout(1500)
        await pg.evaluate("S.isOwner=true")
        it = await pg.evaluate("S.items.filter(i=>!i.virtual).slice(0,4).map((i,k)=>{i.photo='';if(k===1)i.code='7777';if(k===2)i.barcode='8901786140503';return {id:i.id,name:i.name}})")
        # ZIP: id से, कोड से, बारकोड से, नाम से + एक बेकार फाइल
        zb = io.BytesIO()
        with zipfile.ZipFile(zb, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(f"photos/{it[0]['id']}.jpg", pack_img(0))
            z.writestr("photos/7777.jpg", pack_img(1))
            z.writestr("8901786140503.png", pack_img(2))
            z.writestr(it[3]["name"].upper().replace(" ", "_") + ".jpg", pack_img(3))
            z.writestr("unknown-thing.jpg", pack_img(1))
            z.writestr("__MACOSX/._x.jpg", b"junk")
        zp = os.path.join(SHOTS, "photos.zip"); open(zp, "wb").write(zb.getvalue())
        print("zip", round(len(zb.getvalue()) / 1024), "KB, HD images 3000px")

        await pg.evaluate("S.tab='set';showTab()"); await pg.wait_for_selector("#sphCard")
        miss0 = await pg.evaluate("SPH.missing().length")
        # 📋 प्रॉम्प्ट
        await pg.click('[data-sphb="10"]'); await pg.wait_for_timeout(300)
        t = await pg.evaluate("SPH._last")
        assert t and "ORIGINAL photo" in t and "Never invent" in t and ".jpg" in t and t.count("| product:") == min(10, miss0), t[:300]
        clip = await pg.evaluate("navigator.clipboard.readText().catch(()=>'')")
        assert clip == t or clip == "", "प्रॉम्प्ट कॉपी हुआ"
        await pg.evaluate("closeSheet()")
        t2 = await pg.evaluate("SPH.batch(10).then(()=>SPH._last)")
        assert t2 != t or miss0 <= 10, "अगली बार अगले 10 सामान"
        await pg.evaluate("closeSheet()")
        # 📥 ZIP डालो
        await pg.set_input_files("#sphFile", zp); await pg.wait_for_timeout(4000)
        r = await pg.evaluate("""ids=>ids.map(id=>{const u=SE.photos[id]||'';return {id,kb:Math.round(u.length*.75/1024*10)/10,ok:u.startsWith('data:image/jpeg'),photo:!!item(id).photo}})""", [x["id"] for x in it])
        print(r)
        assert all(x["ok"] and x["photo"] and 0 < x["kb"] <= 20 for x in r), r
        assert await pg.evaluate("SPH.missing().length") == miss0 - 4
        # खाली किनारा कटा: पैकेट (रंगीन) चौकोर फोटो का बड़ा हिस्सा भरे
        fill = await pg.evaluate("""id=>new Promise(res=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
          const d=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]<600)n++;res({w:im.width,h:im.height,fill:n/(c.width*c.height)})};im.src=SE.photos[id]})""", it[0]["id"])
        assert fill["w"] == fill["h"] and fill["w"] >= 200 and fill["fill"] > 0.35, fill
        print("crop ok", fill)
        el = await pg.query_selector("#sphCard"); await el.screenshot(path=f"{SHOTS}/p1-card.png")
        # 🔍 धुंधली फोटो: अपने-आप सूची में, नई फोटो लगते ही बाहर
        im = Image.open(io.BytesIO(pack_img(2, 1200, 1200))).filter(ImageFilter.GaussianBlur(10)); bb = io.BytesIO(); im.save(bb, "JPEG", quality=90)
        zb2 = io.BytesIO()
        with zipfile.ZipFile(zb2, "w") as z: z.writestr(f"{it[1]['id']}.jpg", bb.getvalue())
        zp2 = os.path.join(SHOTS, "blur.zip"); open(zp2, "wb").write(zb2.getvalue())
        await pg.set_input_files("#sphFile", zp2); await pg.wait_for_timeout(2000)
        n0 = await pg.evaluate("SPH.need().length")
        await pg.click("[data-sphscan]"); await pg.wait_for_timeout(2500)
        bad = await pg.evaluate("ids=>ids.map(id=>SPH.isBad(item(id)))", [x["id"] for x in it])
        assert bad == [False, True, False, False], bad
        assert await pg.evaluate("SPH.need().length") == n0 + 1
        t3 = await pg.evaluate("SPH.prompt(SPH.need().filter(x=>x.w===1).map(x=>x.i))")
        assert "blurry" in t3, "धुंधली फोटो प्रॉम्प्ट में"
        # 👀 जाली: टैप = ठीक है / बदलवानी है
        await pg.click("[data-sphview]"); await pg.wait_for_selector(".sphg .sphc")
        await pg.screenshot(path=f"{SHOTS}/p2-grid.png")
        await pg.click(f'[data-sphmk="{it[1]["id"]}"]'); await pg.wait_for_timeout(200)
        assert not await pg.evaluate(f"SPH.isBad(item('{it[1]['id']}'))"), "ठीक है"
        await pg.click(f'[data-sphmk="{it[0]["id"]}"]'); await pg.wait_for_timeout(200)
        assert await pg.evaluate(f"SPH.isBad(item('{it[0]['id']}'))"), "बदलवानी है"
        await pg.evaluate("closeSheet()")
        # नई फोटो लगी → सूची से अपने-आप बाहर
        await pg.set_input_files("#sphFile", zp); await pg.wait_for_timeout(4000)
        assert not await pg.evaluate(f"SPH.isBad(item('{it[0]['id']}'))"), "नई फोटो से सूची पूरी"
        # 📝 STEP 2 सुधार: सिर्फ़ नाम-जानकारी, भाव/स्टॉक नहीं
        before = await pg.evaluate(f"(i=>({{sale:i.sale,stock:i.stock}}))(item('{it[2]['id']}'))")
        await pg.click("[data-sphfix]"); await pg.wait_for_selector("#sphFixT")
        await pg.fill("#sphFixT", '```json\n{"app":"mh177","mode":"fix","items":[{"barcode":"8901786140503","name":"everest biryani masala 50g","hi":"एवरेस्ट बिरयानी मसाला","brand":"everest","size":"50g","sale":999},{"barcode":"0000","name":"x"}]}\n```')
        await pg.click("[data-sphfixgo]"); await pg.wait_for_timeout(200); assert "1 सामान" in await pg.text_content("[data-sphfixgo]")
        await pg.click("[data-sphfixgo]"); await pg.wait_for_timeout(400)
        after = await pg.evaluate(f"(i=>({{name:i.name,hi:i.hi,brand:i.brand,sale:i.sale,stock:i.stock}}))(item('{it[2]['id']}'))")
        assert after["name"] == "EVEREST BIRYANI MASALA 50G" and after["brand"] == "EVEREST" and after["hi"].startswith("एवरेस्ट"), after
        assert after["sale"] == before["sale"] and after["stock"] == before["stock"], (before, after)
        print("blur/grid/fix ok")
        # 📦 फोटो से माल → ZIP (READ-ME + items.csv + फोटो), दो कदम वाला निर्देश
        z = await pg.evaluate("""async()=>{SI.open();const B={};return 1}""")
        zr = await pg.evaluate("""async()=>{const f=[{name:'a.txt',data:new TextEncoder().encode('hello')},{name:'01-front.jpg',data:new Uint8Array([1,2,3,4])}];
          const b=SI.zipBlob(f);const u=new Uint8Array(await b.arrayBuffer());return Array.from(u)}""")
        zf = zipfile.ZipFile(io.BytesIO(bytes(zr))); assert zf.namelist() == ["a.txt", "01-front.jpg"] and zf.read("a.txt") == b"hello" and zf.testzip() is None
        pr = await pg.evaluate("(()=>{localStorage.setItem('bh_intake',JSON.stringify({open:true,id:'F1106-TEST',src:'opening',entries:[]}));return 1})()")
        print("zip writer ok")
        # ग्राहक-पेज वाली छोटी कॉपी
        th = await pg.evaluate("""id=>new Promise(res=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=112;c.getContext('2d').drawImage(im,0,0,112,112);res(c.toDataURL('image/jpeg',.62).length*.75/1024)};im.src=SE.photos[id]})""", it[0]["id"])
        assert th < 8, th
        await br.close()
    assert not errs, errs
    print("✅ फोटो टेस्ट पास")

asyncio.run(main())
