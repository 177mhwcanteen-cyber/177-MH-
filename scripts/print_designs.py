#!/usr/bin/env python3
"""मेन्यू कार्ड + ऑर्डर पर्चा (A4) — web/order/rasoi.json से बनता है, फिर PDF पढ़कर हर भाव जाँचता है।
चलाएँ:  python3 scripts/print_designs.py [out-dir]      (प्रॉम्प्ट: docs/मेन्यू-और-पर्चा-डिज़ाइन-प्रॉम्प्ट.txt)
"""
import json, os, re, subprocess, sys, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "docs", "print"))
os.makedirs(OUT, exist_ok=True)
R = json.load(open(os.path.join(ROOT, "web", "order", "rasoi.json"), encoding="utf-8"))
SHOP = R["shop"]
ITEMS = {i["id"]: i for i in R["items"]}
ORDER_URL = "https://177mhwcanteen-cyber.github.io/177-MH-/order/"
MENU_URL = ORDER_URL + "?s=rasoi"  # मेन्यू का QR → सीधा मारवाड़ रसोई (12-11-2026)
MENU_WEB = os.path.join(ROOT, "web", "order", "marwar-rasoi-menu.pdf")  # ग्राहक-पेज का 📖 Menu बटन यही खोलता है


def pic(iid):
    """मेन्यू के फोटो-खाने: web/order/rasoi/<id>.jpg (वही फोटो जो ऑर्डर-पेज पर है)"""
    import base64
    f = os.path.join(ROOT, "web", "order", "rasoi", iid + ".jpg")
    return f'style="background:url(data:image/jpeg;base64,{base64.b64encode(open(f, "rb").read()).decode()}) center/cover"' if os.path.exists(f) else ""
QRJS = open(os.path.join(ROOT, "www", "lib", "qrcode.min.js"), encoding="utf-8").read() if os.path.exists(os.path.join(ROOT, "www", "lib", "qrcode.min.js")) else open(os.path.join(ROOT, "web", "lib", "qrcode.min.js"), encoding="utf-8").read()

E = html.escape


def title(n):
    return " ".join(("(" + w[1:2].upper() + w[2:].lower()) if w.startswith("(") else (w[:1].upper() + w[1:].lower()) for w in n.split())


def t12(hm):
    h, m = map(int, hm.split(":"))
    return f"{(h - 1) % 12 + 1}:{m:02d} {'AM' if h < 12 else 'PM'}"


# समूह — हर डिश ठीक एक बार (नीचे जाँच)
G = lambda *ids: ["rs-" + x for x in ids]
LEFT = [
    ("दाल और सब्ज़ी", "Dal & Sabzi", G("dal-tadka", "dal-fry", "mix-veg", "sev-tamatar")),
    ("पनीर", "Paneer", G("matar-paneer", "shahi-paneer", "paneer-butter-masala", "paneer-lababdar", "paneer-bhurji", "paneer-handi", "paneer-masala", "kadai-paneer")),
    ("मशरूम और काजू", "Mushroom & Kaju", G("mushroom-masala", "mushroom-paneer", "mushroom-matar", "mushroom-kaju-masala", "kaju-masala", "kaju-paneer-masala", "kaju-curry")),
    ("तंदूरी स्टार्टर", "Tandoori Starters", G("paneer-tikka", "paneer-malai-tikka", "paneer-hariyali-tikka")),
    ("चाइनीज़", "Chinese", G("manchurian-gravy", "manchurian-dry", "chilli-paneer-gravy", "chilli-paneer-dry")),
]
RIGHT = [
    ("चिकन करी", "Chicken Curries", G("kadai-chicken", "chicken-curry", "chicken-handi", "masala-chicken", "garlic-chicken", "butter-chicken", "desi-chicken-half", "desi-chicken-full")),
    ("तंदूरी चिकन", "Tandoori Chicken", G("tandoori-chicken-plate", "tandoori-chicken-half", "tandoori-chicken-full", "chicken-tikka", "chicken-hariyali-tikka")),
    ("चाइनीज़", "Chinese", G("chilli-chicken-dry", "chicken-chilli-gravy")),
    ("चिकन बिरयानी", "Chicken Biryani", G("chicken-biryani", "hyderabadi-chicken-biryani", "chicken-dum-biryani")),
    ("मछली", "Fish", G("fish-curry", "fish-masala")),
    ("सलाद, दही, पानी", "Extras", G("green-salad", "dahi", "water-bottle")),
]
BOTTOM = [
    ("रोटी और नान", "Naan & Roti", G("plain-tandoori-roti", "butter-tandoori-roti", "plain-naan", "butter-naan", "garlic-naan", "lachha-paratha")),
    ("चावल और पुलाव", "Rice & Pulao", G("jeera-rice", "fried-rice", "veg-pulao", "plain-rice", "veg-biryani")),
]
placed = [i for grp in (LEFT, RIGHT, BOTTOM) for _, _, ids in grp for i in ids]
assert sorted(placed) == sorted(ITEMS), ("समूह और rasoi.json अलग", set(ITEMS) ^ set(placed), [x for x in placed if placed.count(x) > 1])

BASE_CSS = """
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:794px;height:1123px;background:#2b1708}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact;font-family:Lora,serif;color:#2a1a0e}
.hi{font-family:Poppins,sans-serif}
.frame{width:794px;height:1123px;padding:20px;position:relative;overflow:hidden;
 background:
  repeating-linear-gradient(88deg,rgba(0,0,0,.10) 0 1.5px,transparent 1.5px 6px),
  repeating-linear-gradient(92deg,rgba(255,220,170,.06) 0 1px,transparent 1px 13px),
  radial-gradient(ellipse 60% 8% at 30% 20%,rgba(0,0,0,.25),transparent 70%),
  radial-gradient(ellipse 50% 6% at 70% 75%,rgba(0,0,0,.22),transparent 70%),
  linear-gradient(135deg,#6b3d1b,#4a2810 30%,#70421f 55%,#3d210c 80%,#5c3416);
 box-shadow:inset 0 0 0 3px #22110a,inset 0 0 28px rgba(0,0,0,.7)}
.frame:before{content:"";position:absolute;inset:11px;border:1.5px solid rgba(214,170,90,.55);border-radius:3px;pointer-events:none}
.paper{position:relative;height:100%;border:3px double #b8893a;outline:1.5px solid #6e4a17;outline-offset:3px;
 background:radial-gradient(ellipse at 50% 40%,#fdf7e7 0%,#f7ecd0 60%,#ecdcb3 100%);
 box-shadow:inset 0 0 40px rgba(150,100,30,.25);padding:14px 22px 0;display:flex;flex-direction:column}
.cn{position:absolute;width:46px;height:46px;z-index:2}
.cn.tl{top:-3px;left:-3px}.cn.tr{top:-3px;right:-3px;transform:scaleX(-1)}
.cn.bl{bottom:-3px;left:-3px;transform:scaleY(-1)}.cn.br{bottom:-3px;right:-3px;transform:scale(-1,-1)}
.paper:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.07;
 background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'%3E%3Cpath d='M22 2l20 20-20 20L2 22z M22 10l12 12-12 12-12-12z' fill='none' stroke='%237a1c1c' stroke-width='1.2'/%3E%3Ccircle cx='22' cy='22' r='3' fill='%23b8893a'/%3E%3C/svg%3E")}
.paper>*{position:relative;z-index:1}.paper>.cn{position:absolute;z-index:2}
.slot{border:3px double #b8893a;outline:1.5px solid #6e4a17;border-radius:3px;background:linear-gradient(135deg,#4a2810,#6b3d1b);box-shadow:0 2px 5px rgba(60,30,5,.35)}
.rule{display:flex;align-items:center;gap:8px;color:#9a6b22}
.rule:before,.rule:after{content:"";flex:1;height:1.5px;background:linear-gradient(90deg,transparent,#b8893a 30%,#b8893a 70%,transparent)}
"""
CORNER = """<svg class="cn {c}" viewBox="0 0 46 46"><path d="M3 3h20M3 3v20" stroke="#b8893a" stroke-width="2.4" fill="none"/>
<path d="M8 8c8 0 12 4 12 12M8 8c0 8 4 12 12 12" stroke="#8a5a1a" stroke-width="1.4" fill="none"/>
<circle cx="8" cy="8" r="3.2" fill="#b8893a"/><circle cx="20" cy="20" r="2" fill="#8a5a1a"/>
<path d="M27 3q4 3 8 0M3 27q3 4 0 8" stroke="#b8893a" stroke-width="1.6" fill="none"/></svg>"""
CORNERS = "".join(CORNER.format(c=c) for c in ("tl", "tr", "bl", "br"))
ARCH = """<svg width="120" height="26" viewBox="0 0 120 26"><path d="M4 24h112M20 24V14q0-10 40-12q40 2 40 12v10" stroke="#9a6b22" stroke-width="1.6" fill="none"/>
<path d="M44 24v-8q16-12 32 0v8" stroke="#b8893a" stroke-width="1.4" fill="none"/><circle cx="60" cy="9" r="2.6" fill="#b8893a"/>
<path d="M8 24v-6M112 24v-6" stroke="#9a6b22" stroke-width="1.6"/></svg>"""


def mark(veg):
    c = "#1e7a34" if veg else "#a3201b"
    inner = f'<circle cx="7" cy="7" r="3.2" fill="{c}"/>' if veg else f'<path d="M7 3.2L10.6 10H3.4z" fill="{c}"/>'
    return f'<svg class="mk" width="14" height="14" viewBox="0 0 14 14"><rect x=".9" y=".9" width="12.2" height="12.2" rx="1.5" fill="#fff" stroke="{c}" stroke-width="1.5"/>{inner}</svg>'


def rows(ids):
    out = []
    for i in ids:
        it = ITEMS[i]
        out.append(f'<div class="r">{mark(it["veg"])}<span class="n">{E(title(it["n"]))}</span><i></i><b>₹{it["s"]}</b></div>')
    return "".join(out)


def group(hi, en, ids):
    note = f'<div class="note"><span class="hi">कोल्ड ड्रिंक MRP पर</span> · {E(SHOP["note"])}</div>' if en == "Extras" and SHOP.get("note") else ""
    return f'<div class="sg"><div class="rule sh"><span class="hi">{E(hi)}</span><em>·</em><span>{E(en)}</span></div>{rows(ids)}{note}</div>'


def menu_html():
    h = SHOP["hours"]
    hours = f'<span class="hi">दोपहर</span> · Lunch {t12(h[0][0])}–{t12(h[0][1])}<br><span class="hi">रात</span> · Dinner {t12(h[1][0])}–{t12(h[1][1])}'
    phones = "📞 " + " · ".join(SHOP["phones"][:2]) + "<br>" + " · ".join(SHOP["phones"][2:])
    css = BASE_CSS + """
.hd{text-align:center;line-height:1;position:relative}
.hd .slot{position:absolute;top:2px;width:158px;height:118px}.hd .slot.l{left:-4px}.hd .slot.r{right:-4px}
.hd .hi.big{font-size:40px;font-weight:700;color:#7a1c1c;letter-spacing:.5px;margin-top:-2px}
.hd .en{font:700 21px Lora;letter-spacing:7px;color:#5b3510;margin-top:1px}
.hd .sub{font-size:12.5px;color:#7a5a2a;margin-top:5px;font-style:italic;display:flex;justify-content:center;gap:16px;align-items:center}
.key{display:inline-flex;align-items:center;gap:5px;font-style:normal;font-weight:600;color:#3a2a14}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:10px}
.ch{display:flex;justify-content:center;align-items:baseline;gap:8px;color:#fff6dd;border-radius:3px;padding:5px 0 6px;
 box-shadow:inset 0 0 0 1.5px rgba(255,220,150,.55),0 1px 2px rgba(0,0,0,.3);letter-spacing:1.5px}
.ch .hi{font-size:17px;font-weight:700;letter-spacing:0}.ch span:last-child{font:700 15px Lora}
.ch.v{background:linear-gradient(#2c7a3e,#1d5a2c)}.ch.nv{background:linear-gradient(#9a2a22,#741913)}.ch.b{background:linear-gradient(#8a5a1a,#6a420f)}
.sg{margin-top:5px}
.sh{font:italic 600 14px Lora;color:#8a5a1a;margin-bottom:2px}.sh .hi{font-style:normal;font-size:13.5px;font-weight:600}.sh em{font-style:normal}
.r{display:flex;align-items:center;height:20.1px;font-size:15.5px}
.r .mk{flex:none;margin-right:7px}
.r .n{font-weight:600;color:#24160a;white-space:nowrap}
.r i{flex:1;margin:0 6px;border-bottom:2px dotted #c4a46a;transform:translateY(4px);min-width:10px}
.r b{font-weight:700;color:#7a1c1c;font-variant-numeric:tabular-nums}
.bot{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:8px}
.bw{display:flex;gap:12px;align-items:center}.bw .sg{flex:1}.bw .slot{flex:none;width:112px;height:118px;margin-top:5px}
.bw .mq{flex:none;width:112px;margin-top:5px;background:#fff;border-radius:4px;padding:4px 4px 2px;text-align:center;box-shadow:inset 0 0 0 1.5px #b8893a,0 1px 3px rgba(0,0,0,.25)}
.mq #q{width:100px;height:100px;margin:0 auto}.mq #q img,.mq #q canvas{width:100px!important;height:100px!important;display:block}
.mq small{display:block;font:700 8.5px Lora;letter-spacing:.6px;color:#7a1c1c;margin-top:1px;white-space:nowrap;line-height:1.2}
.bot .r{font-size:15px}
.note{font:italic 600 13.5px Lora;color:#7a5a2a;margin-top:3px;padding-left:21px}.note .hi{font-style:normal}
.ft{margin:auto -22px 0;background:linear-gradient(#7a1c1c,#5a120e);color:#fbe6b0;padding:8px 20px 9px;
 border-top:2px solid #b8893a;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;font-size:13px;font-weight:600}
.ft .fd{text-align:center;line-height:1.15}.ft .fd .hi{font-size:17px;font-weight:700;color:#ffd77a}.ft .fd div:last-child{font:700 12.5px Lora;letter-spacing:2.5px}
.ft .ph{text-align:right;font-weight:700;font-size:13.5px;line-height:1.35}
.ft .hr{line-height:1.35}
"""
    left = "".join(group(*g) for g in LEFT)
    right = "".join(group(*g) for g in RIGHT)
    bot = "".join(f'<div><div class="ch b"><span class="hi">{E(hi)}</span><span>· {E(en.upper())}</span></div><div class="bw"><div class="sg">{rows(ids)}</div>{'<div class="slot" id="m-bread" ' + pic("rs-butter-naan") + '></div>' if k == "bread" else '<div class="mq" id="m-qr"><div id="q"></div><small>SCAN &amp; ORDER</small></div>'}</div></div>' for (hi, en, ids), k in zip(BOTTOM, ("bread", "rice")))
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>Marwar Rasoi Menu</title><style>{css}</style></head><body>
<div class="frame"><div class="paper">{CORNERS}
<div class="hd"><div class="slot l" id="m-veg" {pic("rs-shahi-paneer")}></div><div class="slot r" id="m-nonveg" {pic("rs-tandoori-chicken-full")}></div>{ARCH}<div class="hi big">{E(SHOP['hi'])}</div><div class="en">{E(SHOP['name'])}</div>
<div class="sub" style="flex-wrap:wrap;row-gap:1px;margin-top:3px"><span style="flex:0 0 100%">Amenity Centre, Jalipa · Barmer</span><span class="key">{mark(True)}<span class="hi">शाकाहारी</span> Veg</span><span class="key">{mark(False)}<span class="hi">मांसाहारी</span> Non-Veg</span></div></div>
<div class="cols"><div><div class="ch v"><span class="hi">शाकाहारी</span><span>· VEG MAIN COURSE</span></div>{left}</div>
<div><div class="ch nv"><span class="hi">मांसाहारी</span><span>· NON-VEG</span></div>{right}</div></div>
<div class="bot">{bot}</div>
<div class="ft"><div class="hr">{hours}</div>
<div class="fd"><div class="hi">फ्री होम डिलीवरी</div><div>FREE HOME DELIVERY</div></div>
<div class="ph">{phones}</div></div>
</div></div>
<script>{QRJS}</script><script>new QRCode(document.getElementById("q"),{{text:{json.dumps(MENU_URL)},width:456,height:456,correctLevel:QRCode.CorrectLevel.M}});</script></body></html>"""


def flyer_html():
    h = SHOP["hours"]
    css = BASE_CSS + """
.paper{padding:16px 26px 0}
.hd{text-align:center;line-height:1.1}
.hd .hi.big{font-size:36px;font-weight:700;color:#7a1c1c}
.hd .en{font:italic 600 19px Lora;color:#5b3510;margin-top:2px}
.hd .rule{margin-top:6px;font-size:14.5px;font-weight:600;color:#7a4a12}.hd .rule .hi{font-size:15px}
.free{margin-top:12px;border-radius:6px;padding:10px 14px 12px;text-align:center;color:#fff7de;
 background:radial-gradient(ellipse at 50% 0%,#2f8a45,#1b5a2a 75%);box-shadow:inset 0 0 0 2px #d6b25e,inset 0 0 0 4px #1b5a2a,inset 0 0 0 5.5px rgba(214,178,94,.6),0 2px 4px rgba(0,0,0,.25)}
.free .hi.big{font-size:38px;font-weight:800;line-height:1.05;color:#ffe08a;text-shadow:0 1px 0 #0d3a18}
.free .en{font:700 21px Lora;letter-spacing:6px;margin-top:2px}
.free .pts{display:flex;gap:12px;justify-content:center;margin-top:9px}
.free .pt{background:#fff8e6;color:#1b4d26;border-radius:99px;padding:5px 14px 6px;font-size:14px;font-weight:700;line-height:1.15;box-shadow:0 1px 0 #0d3a18}
.free .pt .hi{font-size:15px}.free .pt small{display:block;font:600 12.5px Lora;color:#3e6b46}
.cards{display:grid;gap:10px;margin-top:12px}
.cd{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center;padding:11px 14px 12px 12px;border-radius:6px;
 background:linear-gradient(90deg,rgba(255,255,255,.75),rgba(255,250,236,.55));border:1.5px solid #c9a35a;border-left:7px solid var(--c);box-shadow:0 1px 3px rgba(90,50,10,.18)}
.cd>.slot{width:150px;height:122px}
.ic{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;font-size:38px;background:radial-gradient(#fffaf0,#f3e3bd);
 box-shadow:inset 0 0 0 2.5px #b8893a,inset 0 0 0 5px #fffaf0,inset 0 0 0 6.5px var(--c)}
.tt{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;line-height:1.1}
.tt .hi{font-size:23px;font-weight:700;color:var(--c)}.tt .en{font:700 18px Lora;color:#3a2410}
.ds{font-size:14px;margin-top:3px;color:#4a3418}.ds .hi{font-size:14.5px;font-weight:600}
.tg{display:flex;flex-wrap:wrap;gap:5px 6px;margin-top:7px}
.tg>span{border:1.2px solid #c9a35a;background:#fffaf0;border-radius:99px;padding:2px 10px 3px;font:600 13px Lora;color:#3a2410;white-space:nowrap}
.tg span .hi{font-size:13.5px;font-weight:600;color:var(--c)}
.tm{margin-top:6px;font-size:13.5px;font-weight:700;color:#7a1c1c}.tm .hi{font-size:14px}
.how{display:grid;grid-template-columns:1fr 206px;gap:16px;margin-top:14px;align-items:stretch}
.steps{display:grid;gap:6px;align-content:center}
.st{display:flex;gap:10px;align-items:center;background:rgba(255,250,236,.8);border:1.2px solid #d2b274;border-radius:6px;padding:5px 10px}
.st .n{flex:none;width:30px;height:30px;border-radius:50%;background:linear-gradient(#9a2a22,#741913);color:#ffe08a;display:grid;place-items:center;font:700 16px Lora;box-shadow:inset 0 0 0 1.5px #d6b25e}
.st div{line-height:1.2}.st .hi{font-size:15.5px;font-weight:700;color:#3a2410}.st small{display:block;font:600 13px Lora;color:#6a4a1a}
.qr{background:#fff;border-radius:6px;padding:10px 10px 8px;text-align:center;box-shadow:inset 0 0 0 2px #b8893a,inset 0 0 0 5px #fff,inset 0 0 0 6.5px #7a1c1c,0 2px 4px rgba(0,0,0,.2)}
#q{width:170px;height:170px;margin:6px auto 0}#q img,#q canvas{width:170px!important;height:170px!important}
.qr .hi{display:block;font-size:16px;font-weight:700;color:#7a1c1c;margin-top:6px;line-height:1.1}.qr small{font:700 13px Lora;letter-spacing:2px;color:#3a2410}
.ad{margin:auto -26px 0;background:linear-gradient(#7a1c1c,#5a120e);color:#fbe6b0;border-top:2px solid #b8893a;text-align:center;padding:8px 0 9px;font-size:14px;font-weight:600}
.ad .hi{font-size:14.5px}
"""
    chips = [("किराना", "Grocery"), ("मिठाई", "Sweets"), ("दूध", "Milk"), ("आइसक्रीम", "Ice Cream"), ("कोल्ड ड्रिंक", "Cold Drinks"), ("ड्राई फ्रूट", "Dry Fruits"), ("नमकीन-बिस्कुट", "Snacks")]
    chip = lambda L: "".join(f'<span><span class="hi">{E(a)}</span> {E(b)}</span>' for a, b in L)
    card = lambda c, ic, hi, en, ds, tg, extra="": f'<div class="cd" style="--c:{c}"><div class="slot" id="f-{ic}"></div><div><div class="tt"><span class="hi">{hi}</span><span class="en">{en}</span></div><div class="ds">{ds}</div><div class="tg">{chip(tg)}</div>{extra}</div></div>'
    tm = f'<div class="tm"><span class="hi">दोपहर</span> {t12(h[0][0])}–{t12(h[0][1])} &nbsp;·&nbsp; <span class="hi">रात</span> {t12(h[1][0])}–{t12(h[1][1])} &nbsp;·&nbsp; 📞 {SHOP["phones"][0]}</div>'
    cards = (card("#b4530e", "grocery", "किराना और रोज़ की ज़रूरत", "Grocery &amp; Daily Needs",
                  '<span class="hi">घर की हर ज़रूरत का सामान</span> · Everything for your home', chips)
             + card("#3f7d20", "sabji", "सब्ज़ी एक्सप्रेस", "Sabji Express",
                    '<span class="hi">ताज़ी हरी सब्ज़ियाँ और फल</span> · Fresh vegetables &amp; fruits',
                    [("हरी सब्ज़ियाँ", "Vegetables"), ("फल", "Fruits"), ("धनिया-मिर्च", "Herbs")])
             + card("#8a1d17", "rasoi", "मारवाड़ रसोई", "Marwar Rasoi",
                    '<span class="hi">रेस्टोरेंट — शाकाहारी और मांसाहारी खाना</span> · Veg &amp; Non-Veg Restaurant',
                    [("पनीर", "Paneer"), ("तंदूर", "Tandoor"), ("बिरयानी", "Biryani"), ("चाइनीज़", "Chinese"), ("चिकन", "Chicken")], tm))
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>Order From Home</title><style>{css}</style></head><body>
<div class="frame"><div class="paper">{CORNERS}
<div class="hd">{ARCH}<div class="hi big">अब घर बैठे मँगाइए</div><div class="en">Now order from home</div>
<div class="rule"><span><span class="hi">एक ही जगह से तीन दुकानें</span> · Three stores, one place</span></div></div>
<div class="free"><div class="hi big">फ्री होम डिलीवरी</div><div class="en">FREE HOME DELIVERY</div>
<div class="pts"><div class="pt">✓ <span class="hi">कोई डिलीवरी चार्ज नहीं</span><small>No delivery charge</small></div>
<div class="pt">✓ <span class="hi">कोई न्यूनतम ऑर्डर नहीं</span><small>No minimum order</small></div></div></div>
<div class="cards">{cards}</div>
<div class="how"><div class="steps">
<div class="st"><span class="n">1</span><div><span class="hi">QR स्कैन करें, दुकान चुनें</span><small>Scan the QR &amp; choose a store</small></div></div>
<div class="st"><span class="n">2</span><div><span class="hi">सामान चुनें, ऑर्डर करें</span><small>Pick items &amp; place your order</small></div></div>
<div class="st"><span class="n">3</span><div><span class="hi">घर पर डिलीवरी — नकद / UPI</span><small>Home delivery · Pay cash or UPI</small></div></div>
<div class="st"><span class="n">✓</span><div><span class="hi">एक ऑर्डर — हर दुकान का अलग बिल</span><small>One order · Separate bill for each store</small></div></div>
</div><div class="qr"><small>SCAN TO ORDER</small><div id="q"></div><span class="hi">स्कैन करके ऑर्डर करें</span></div></div>
<div class="ad">📍 <span class="hi">आकाशवाणी रोड, बाड़मेर</span> · Akashvani Road, Barmer</div>
</div></div>
<script>{QRJS}</script><script>new QRCode(document.getElementById("q"),{{text:{json.dumps(ORDER_URL)},width:340,height:340,correctLevel:QRCode.CorrectLevel.H}});</script>
</body></html>"""


def render(name, doc):
    from playwright.sync_api import sync_playwright
    hp = os.path.join(OUT, name + ".html")
    open(hp, "w", encoding="utf-8").write(doc)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 794, "height": 1123}, device_scale_factor=3)
        pg.goto("file://" + hp)
        pg.wait_for_timeout(600)
        over = pg.evaluate("""()=>{const bad=[];const P=document.querySelector('.paper').getBoundingClientRect();
          document.querySelectorAll('.paper *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&(r.bottom>P.bottom+1||r.right>P.right+1))bad.push((e.className||e.tagName)+':'+Math.round(r.bottom)+'/'+Math.round(r.right))});
          document.querySelectorAll('.r').forEach(r=>{const n=r.querySelector('.n'),b=r.querySelector('b');if(n&&b&&n.getBoundingClientRect().right>b.getBoundingClientRect().left-4)bad.push('भीड़:'+n.textContent)});return bad}""")
        slots = pg.evaluate("""()=>Object.fromEntries([...document.querySelectorAll('.slot')].map(e=>{const r=e.getBoundingClientRect();return [e.id,[r.left+3,r.top+3,r.width-6,r.height-6].map(v=>Math.round(v*10)/10)]}))""")
        json.dump(slots, open(os.path.join(OUT, name + "-slots.json"), "w"), indent=1)
        pg.screenshot(path=os.path.join(OUT, name + ".png"))
        pg.pdf(path=os.path.join(OUT, name + ".pdf"), width="210mm", height="297mm", print_background=True, prefer_css_page_size=True)
        b.close()
    return over


def check_menu():
    txt = subprocess.run(["pdftotext", "-layout", os.path.join(OUT, "menu.pdf"), "-"], capture_output=True, text=True).stdout
    flat = re.sub(r"\s+", " ", txt)
    err = []
    for it in ITEMS.values():
        nm = title(it["n"])
        if not re.search(re.escape(nm) + r"\s*₹" + str(it["s"]) + r"(?!\d)", flat):
            err.append(f"{nm} ₹{it['s']}")
    prices = re.findall(r"₹\s?(\d+)", flat)
    if len(prices) != len(ITEMS):
        err.append(f"₹ गिनती {len(prices)} ≠ {len(ITEMS)}")
    for ph in SHOP["phones"]:
        if ph not in flat:
            err.append("फ़ोन " + ph)
    pages = subprocess.run(["pdfinfo", os.path.join(OUT, "menu.pdf")], capture_output=True, text=True).stdout
    if not re.search(r"Pages:\s+1\n", pages):
        err.append("एक पेज नहीं")
    import cv2
    img = cv2.imread(os.path.join(OUT, "menu.png")); H, W = img.shape[:2]
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(img[int(H * .72):, int(W * .6):])  # QR नीचे-दाएँ (चावल के पास)
    if data != MENU_URL:
        err.append("मेन्यू QR पढ़ा: " + repr(data))
    return err


def check_flyer():
    import cv2
    err = []
    img = cv2.imread(os.path.join(OUT, "flyer.png"))
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    if data != ORDER_URL:
        err.append("QR पढ़ा: " + repr(data))
    flat = re.sub(r"\s+", " ", subprocess.run(["pdftotext", os.path.join(OUT, "flyer.pdf"), "-"], capture_output=True, text=True).stdout)
    for s in ["FREE HOME DELIVERY", "No delivery charge", "No minimum order", "Grocery & Daily Needs", "Sabji Express", "Marwar Rasoi", "Akashvani Road, Barmer"]:
        if s not in flat:
            err.append("नहीं मिला: " + s)
    if "177" in flat:
        err.append("पर्चे पर 177 लिखा है")
    return err


if __name__ == "__main__":
    bad = render("menu", menu_html()) + render("flyer", flyer_html())
    bad += check_menu() + check_flyer()
    if bad:
        print("❌", *bad, sep="\n  ")
        sys.exit(1)
    if OUT == os.path.join(ROOT, "docs", "print"):
        import shutil; shutil.copy(os.path.join(OUT, "menu.pdf"), MENU_WEB)  # ऑर्डर-पेज का 📖 Menu बटन
    print(f"✅ सब भाव सही ({len(ITEMS)} डिश), QR सही, एक-एक पेज — {OUT}")
