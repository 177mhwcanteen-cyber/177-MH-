#!/usr/bin/env python3
"""177 MH किट v6 — जाँच + ZIP (दूसरे Claude के लिए)।
उपयोग:  python3 tools/jaanch.py <stock.json> <photos-फ़ोल्डर> [--zip]
  --zip   जाँच में ❌ न हो तो mh177-kaam-<batch>.zip बनाओ (stock.json, photos/, सवाल.md, सार.md, जाँच.txt)
किट की CSV (01, 03, 08, 09) इसी फ़ाइल के एक फ़ोल्डर ऊपर से पढ़ता है।"""
import csv, io, json, os, re, sys, zipfile

K = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ORG = "mh177"


def rcsv(n):
    p = os.path.join(K, n)
    if not os.path.exists(p): return []
    return list(csv.DictReader(open(p, encoding="utf-8-sig")))


def ean_ok(c):
    if not re.fullmatch(r"\d{8}|\d{12,14}", c): return False
    d = [int(x) for x in c]; s = sum(v * (3 if (len(d) - 1 - i) % 2 else 1) for i, v in enumerate(d[:-1]))
    return (10 - s % 10) % 10 == d[-1]


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(a) < 2: sys.exit(__doc__)
    J, PH = a[0], a[1]; mkzip = "--zip" in sys.argv
    d = json.load(open(J, encoding="utf-8"))
    bad, warn = [], []
    E = lambda m: bad.append(m)
    W = lambda m: warn.append(m)
    if d.get("app") != "mh177-stock": E('app = "mh177-stock" होना चाहिए')
    if d.get("org") != ORG: E(f'org = "{ORG}" होना चाहिए (भैरव का काम इस किट से नहीं)')
    if not re.fullmatch(r"S-\d{8}-\d{2}", str(d.get("batch", ""))): E("batch = S-YYYYMMDD-NN")
    cats = {(r.get("cat", ""), r.get("sub", "")) for r in rcsv("01-श्रेणी-सूची.csv")}
    racks = {}
    for r in rcsv("08-रैक-नक्शा.csv"):
        try: racks[str(r.get("रैक", "")).strip()] = int(r.get("खाने") or 0)
        except ValueError: pass
    app = rcsv("03-ऐप-में-पहले-से.csv"); appB = {r["barcode"]: r["id"] for r in app if r.get("barcode")}; appN = {r["name"].upper(): r["id"] for r in app}
    cos = {c.get("id"): c for c in (d.get("companies") or [])}
    old = {}
    try: old = {c["id"]: c for c in json.load(open(os.path.join(K, "09-कंपनियाँ.json"), encoding="utf-8"))}
    except Exception: pass
    for cid, c in cos.items():
        if not re.fullmatch(r"c-[a-z0-9-]{2,40}", str(cid or "")): E(f"कंपनी id ग़लत: {cid} (c-<छोटे अंग्रेज़ी अक्षर>)")
        ph = re.sub(r"\D", "", str(c.get("phone", "")))
        if c.get("phone") and len(ph[-10:]) != 10: W(f"कंपनी {cid}: phone 10 अंक का मोबाइल नहीं ({c.get('phone')}) — 1800/लैंडलाइन 'care' में")
        if not (c.get("phone") or c.get("care") or c.get("email")): W(f"कंपनी {cid}: कोई नंबर/ईमेल नहीं")
        if not c.get("note"): W(f"कंपनी {cid}: note में स्रोत लिखो (कौन-सी फोटो/वेबसाइट)")
    keys, bcs, used_ph = set(), {}, set()
    items = d.get("items") or []
    if not items: E("items खाली")
    for i, x in enumerate(items, 1):
        nm = x.get("name", f"#{i}"); t = f"#{i} {nm[:30]}"
        k = str(x.get("key", ""))
        if not k: E(f"{t}: key नहीं")
        elif k in keys: E(f"{t}: key दोहरी {k}")
        keys.add(k)
        for f in ("name", "short", "hi", "cat", "sub", "unit", "rack"):
            if not str(x.get(f, "")).strip(): (E if f in ("name", "short", "cat", "unit") else W)(f"{t}: '{f}' खाली")
        for f in ("name", "short", "brand"):
            v = str(x.get(f, ""))
            if re.search(r"[a-z]", v): E(f"{t}: {f} में छोटे अंग्रेज़ी अक्षर — सब CAPITAL")
        if len(str(x.get("short", ""))) > 24: E(f"{t}: short 24 से लंबा")
        if (x.get("cat"), x.get("sub")) not in cats and cats: E(f"{t}: cat/sub '{x.get('cat')}/{x.get('sub')}' 01-श्रेणी-सूची में नहीं")
        b = re.sub(r"\D", "", str(x.get("barcode", "")))
        if b:
            if not ean_ok(b): W(f"{t}: बारकोड {b} का जाँच-अंक नहीं मिलता — फोटो से दोबारा पढ़ो")
            if b in bcs: E(f"{t}: बारकोड {b} दो सामान में ({bcs[b]})")
            bcs[b] = k
            if b in appB and not x.get("appId"): W(f"{t}: यह बारकोड ऐप में पहले से ({appB[b]}) — appId लिखो")
        elif not x.get("needLabel"): W(f"{t}: बारकोड नहीं — needLabel: true करो (ऐप अपना बारकोड बनाएगा)")
        if not b and nm.upper() in appN and not x.get("appId"): W(f"{t}: यही नाम ऐप में है ({appN[nm.upper()]}) — appId?")
        if x.get("code"): W(f"{t}: code खाली छोड़ो — ऐप 4 अंक का कोड खुद देगा")
        r = str(x.get("rack", ""))
        if r:
            m = re.fullmatch(r"(\d{1,2})-(\d{1,2})", r)
            if not m: E(f"{t}: rack '{r}' ग़लत (6-4 जैसा)")
            elif racks and m.group(1) in racks and int(m.group(2)) > racks[m.group(1)]: W(f"{t}: रैक {m.group(1)} में सिर्फ़ {racks[m.group(1)]} खाने")
            elif racks and m.group(1) not in racks: W(f"{t}: रैक {m.group(1)} नक्शे में नहीं — विक्रम जी से पूछो")
        mrp, sale, cost = (float(x.get(f) or 0) for f in ("mrp", "sale", "cost"))
        if sale and mrp and sale > mrp + 0.001: E(f"{t}: बिक्री {sale} > MRP {mrp}")
        if cost and sale and sale < cost: E(f"{t}: बिक्री {sale} < खरीद {cost}")
        if not sale and not mrp and x.get("cat") not in ("mithai", "fast"): W(f"{t}: न MRP न बिक्री भाव")
        if x.get("sub") == "tob":
            if not x.get("secret"): E(f"{t}: 🔒 तम्बाकू पर secret कोड नहीं")
            if x.get("geminiPrompt") or x.get("desc"): W(f"{t}: 🔒 तम्बाकू का geminiPrompt/desc खाली रखो")
        elif not x.get("geminiPrompt"): W(f"{t}: geminiPrompt नहीं")
        if x.get("mfrId") and x["mfrId"] not in cos and x["mfrId"] not in old: E(f"{t}: mfrId {x['mfrId']} companies में नहीं")
        if not x.get("mfrId") and x.get("sub") != "tob" and x.get("cat") not in ("mithai", "fast"): W(f"{t}: mfrId (कंपनी) नहीं")
        P = x.get("photos") or []
        if not P: W(f"{t}: फोटो नहीं")
        for p in P:
            if str(p).startswith("#"): continue
            if not os.path.exists(os.path.join(PH, p)): E(f"{t}: फोटो फ़ाइल नहीं मिली: {p}")
            used_ph.add(p)
        if x.get("exp") and str(x["exp"]) < __import__("datetime").date.today().isoformat()[:len(str(x["exp"]))]: W(f"{t}: ⏰ एक्सपायर हो चुका ({x['exp']})")
        if x.get("ask"): W(f"{t}: सवाल — {x['ask']}")
    for r in d.get("racks") or []:
        if r.get("photo"): used_ph.add(r["photo"])
    if os.path.isdir(PH):
        extra = [f for f in sorted(os.listdir(PH)) if f not in used_ph and not f.startswith(".")]
        if extra: W(f"{len(extra)} फोटो किसी सामान/रैक में नहीं जुड़ीं: {', '.join(extra[:8])}{'…' if len(extra) > 8 else ''}")
    rep = [f"177 MH किट v6 जाँच · {d.get('batch')} · {len(items)} सामान · {len(cos)} कंपनी",
           f"❌ {len(bad)}  ⚠ {len(warn)}"] + ["❌ " + m for m in bad] + ["⚠ " + m for m in warn]
    txt = "\n".join(rep); print(txt[:6000])
    if not mkzip: return
    if bad: sys.exit("\n❌ पहले ❌ ठीक करो — ZIP नहीं बनी")
    nb = sum(1 for x in items if not re.sub(r"\D", "", str(x.get("barcode", ""))))
    asks = [x for x in items if x.get("ask")]
    sar = (f"# सार · {d.get('batch')}\n\n- सामान: {len(items)}\n- रैक: {', '.join(sorted({str(x.get('rack','')).split('-')[0] for x in items}))}\n"
           f"- कंपनियाँ: {len(cos)}\n- बिना कंपनी बारकोड (ऐप लेबल बनाएगा): {nb}\n- सवाल: {len(asks)}\n- ⚠ चेतावनी: {len(warn)}\n")
    sw = "# विक्रम जी से सवाल\n\n" + "\n".join(f"{i}. रैक {x.get('rack','?')} · {x.get('short') or x.get('name')} — {x['ask']}" for i, x in enumerate(asks, 1))
    out = os.path.join(os.path.dirname(os.path.abspath(J)), f"mh177-kaam-{d.get('batch')}.zip")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("stock.json", json.dumps(d, ensure_ascii=False, indent=1))
        z.writestr("सवाल.md", sw); z.writestr("सार.md", sar); z.writestr("जाँच.txt", txt)
        for f in sorted(used_ph):
            p = os.path.join(PH, f)
            if not os.path.exists(p): continue
            b = open(p, "rb").read()
            if len(b) > 1500 * 1024:
                try:
                    from PIL import Image, ImageOps
                    im = ImageOps.exif_transpose(Image.open(p)).convert("RGB"); im.thumbnail((2000, 2000)); o = io.BytesIO(); im.save(o, "JPEG", quality=85); b = o.getvalue()
                except Exception: pass
            z.writestr("photos/" + f, b)
    print(f"\n✅ ZIP बनी: {out} ({os.path.getsize(out) // 1024} KB)")


if __name__ == "__main__":
    main()
