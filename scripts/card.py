"""🪪 मारवाड़ रसोई का विज़िटिंग कार्ड (90×54 मिमी, आगे + पीछे, असली QR) → docs/print/card-front.png, card-back.png, card.pdf
चलाएँ: python3 scripts/card.py   (नाम/नंबर बदलने हों तो नीचे NAME/PHONE)"""
import asyncio, base64, os
from playwright.async_api import async_playwright
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = R + "/docs/print"
NAME, PHONE, ORDERS = "Vikram Singh", "95095 53600", "86962 83600 · 63671 83480"
QR = "data:image/png;base64," + base64.b64encode(open(R + "/web/order/qr.png", "rb").read()).decode()
CSS = """*{box-sizing:border-box;margin:0;padding:0}@page{size:90mm 54mm;margin:0}body{font-family:Lora,serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.c{width:90mm;height:54mm;position:relative;overflow:hidden;background:radial-gradient(120% 140% at 50% 0%,#7a1620 0%,#4a0b12 55%,#2e060b 100%);color:#f6e7c8;page-break-after:always}
.c:before{content:"";position:absolute;inset:2.2mm;border:.25mm solid #c9a24a;border-radius:1.6mm}.c:after{content:"";position:absolute;inset:3mm;border:.1mm solid rgba(201,162,74,.55);border-radius:1.2mm}
.g{color:#e3c069}.hi{font-family:Poppins,sans-serif}
.f{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;position:relative;z-index:1}
.arch{width:26mm;height:8mm;margin-bottom:1mm}
.f h1{font-size:8.6mm;letter-spacing:.9mm;font-weight:700;color:#f2d586;line-height:1}.f .hn{font-size:4.6mm;font-weight:600;margin-top:1mm;color:#f6e7c8}
.ln{display:flex;align-items:center;gap:2mm;margin:2mm 0 1.6mm}.ln i{display:block;width:13mm;height:.2mm;background:#c9a24a}.ln b{width:1.3mm;height:1.3mm;background:#c9a24a;transform:rotate(45deg)}
.f p{font-size:2.9mm;letter-spacing:.35mm}.f .fd{margin-top:2mm;font:600 2.7mm Poppins,sans-serif;letter-spacing:.5mm;color:#4a0b12;background:linear-gradient(180deg,#f2d586,#c9a24a);padding:.8mm 3.4mm;border-radius:3mm}
.b{display:flex;height:100%;padding:6mm 5.5mm;gap:3.5mm;align-items:center;position:relative;z-index:1}.b .l{flex:1;min-width:0}
.b h2{font-size:5.2mm;color:#f2d586;letter-spacing:.3mm}.b .rl{font:500 2.3mm Poppins,sans-serif;letter-spacing:.5mm;color:#e3c069;margin:.4mm 0 2.4mm;text-transform:uppercase}
.b .r{font:400 2.3mm Poppins,sans-serif;margin:1.25mm 0;display:flex;gap:1.4mm;align-items:baseline;white-space:nowrap}.b .r small{font-size:1.75mm;color:#e3c069;letter-spacing:.25mm;min-width:10.5mm;text-transform:uppercase}.b .r b{font-weight:600;letter-spacing:.2mm}
.b .ft{white-space:nowrap;font:500 1.95mm Poppins,sans-serif;color:#e3c069;margin-top:2.2mm;letter-spacing:.2mm}
.q{width:23.5mm;flex:none;text-align:center}.q img{width:23.5mm;height:23.5mm;background:#fff;border-radius:1.4mm;padding:.9mm;border:.3mm solid #c9a24a;display:block}.q span{display:block;white-space:nowrap;font:600 2.1mm Poppins,sans-serif;letter-spacing:.5mm;color:#f2d586;margin-top:1.3mm}.q em{display:block;font:400 1.9mm Poppins,sans-serif;font-style:normal;color:#f6e7c8}"""
ARCH = '<svg class="arch" viewBox="0 0 130 40" fill="none" stroke="#c9a24a" stroke-width="1.6"><path d="M5 38h120M22 38V22c0-9 8-14 14-14M108 38V22c0-9-8-14-14-14M45 38V20c0-10 9-17 20-17s20 7 20 17v18M36 8h58"/><circle cx="65" cy="20" r="2.2" fill="#c9a24a"/></svg>'
HTML = f"""<!doctype html><meta charset="utf-8"><style>{CSS}</style>
<div class="c" id="front"><div class="f">{ARCH}<h1>MARWAR RASOI</h1><div class="hn hi">मारवाड़ रसोई</div><div class="ln"><i></i><b></b><i></i></div><p>Restaurant &nbsp;•&nbsp; Grocery &nbsp;•&nbsp; Fresh Vegetables</p><div class="fd">FREE HOME DELIVERY</div></div></div>
<div class="c" id="back"><div class="b"><div class="l"><h2>{NAME}</h2><div class="rl">Marwar Rasoi</div>
<div class="r"><small>WhatsApp</small><b>{PHONE}</b></div><div class="r"><small>Orders</small><b>{ORDERS}</b></div><div class="r"><small>Address</small><span>Amenity Centre, Jalipa, Barmer</span></div>
<div class="ft">Free delivery &nbsp;·&nbsp; No minimum order</div></div>
<div class="q"><img src="{QR}"><span>SCAN &amp; ORDER</span><em class="hi">घर बैठे ऑर्डर करें</em></div></div></div>"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 340, "height": 204}, device_scale_factor=6.25)
        await pg.set_content(HTML); await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(400)
        for k in ("front", "back"): await pg.locator("#" + k).screenshot(path=f"{OUT}/card-{k}.png")
        await pg.pdf(path=OUT + "/card.pdf", width="90mm", height="54mm", print_background=True); await b.close()
asyncio.run(main()); print("✅ कार्ड बना —", OUT)
