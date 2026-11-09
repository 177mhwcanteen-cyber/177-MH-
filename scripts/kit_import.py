#!/usr/bin/env python3
"""📥 दूसरे Claude की ZIP (किट v6 — mh177-kaam-S-….zip) को ऐप तक चढ़ाओ।  docs/kit/README.md देखें।
  python3 scripts/kit_import.py <zip>  [--dry]
1) ZIP खोलो (अलग फ़ोल्डर, सिर्फ़ डेटा), org/app/ढाँचा जाँचो (tools/jaanch.py वाले नियम)
2) असली फोटो → संग्रह शाखा foto-sangrah (scripts/foto.py), हर सामान के fotos में रास्ता
3) खेप → scripts/pack.py add (web/data/items + web/p ≤20 KB) — कंपनियाँ, mfr, carton, appId समेत
4) कंपनियाँ → docs/सामान-इनबॉक्स/companies.json (सिर्फ़ खाली खाने भरो) · सवाल → sawal.md
5) पूरी जानकारी (desc, geminiPrompt, ingredients…) → docs/सामान-इनबॉक्स/kaam/<batch>.json (आगे ऑनलाइन दुकान के लिए)
इसके बाद: build + tests/packs.py + e2e → commit/push (यह स्क्रिप्ट main में commit नहीं करती, फोटो-शाखा push करती है)।"""
import datetime, json, os, re, shutil, subprocess, sys, tempfile, zipfile

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(R, "scripts"))
import foto  # noqa: E402

ORG = re.search(r'org:\s*"([a-z0-9]+)"', open(os.path.join(R, "web", "config.js"), encoding="utf8").read())[1]
INB = os.path.join(R, "docs", "सामान-इनबॉक्स")


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if not a: sys.exit(__doc__)
    dry = "--dry" in sys.argv
    tmp = tempfile.mkdtemp(prefix="kit-")
    with zipfile.ZipFile(a[0]) as z:
        for n in z.namelist():
            if n.startswith("/") or ".." in n.split("/"): sys.exit(f"⛔ ZIP में ग़लत रास्ता: {n}")
        z.extractall(tmp)
    sj = next((os.path.join(dp, f) for dp, _, fs in os.walk(tmp) for f in fs if f == "stock.json"), None)
    if not sj: sys.exit("❌ ZIP में stock.json नहीं")
    base = os.path.dirname(sj); ph = os.path.join(base, "photos")
    d = json.load(open(sj, encoding="utf8"))
    if d.get("org") != ORG: sys.exit(f"⛔ यह ZIP '{d.get('org')}' की है, यह रिपो '{ORG}' का — नहीं चढ़ेगी")
    if d.get("app") != "mh177-stock": sys.exit("❌ app mh177-stock नहीं")
    batch = d.get("batch") or "S-" + datetime.date.today().strftime("%Y%m%d") + "-01"
    # 🔁 इसी नाम की खेप पहले से (जैसे इस ऐप के Claude ने भी उसी दिन -01 बनाई) → अगला खाली नंबर, पुरानी खेप कभी न बदले
    idir = os.path.join(R, "web", "data", "items")
    if os.path.exists(os.path.join(idir, batch + ".json")):
        m = re.match(r"(.*-)(\d+)$", batch); pre, n = (m[1], int(m[2])) if m else (batch + "-", 1)
        while os.path.exists(os.path.join(idir, f"{pre}{n:02d}.json")): n += 1
        print(f"⚠ खेप {batch} पहले से है → नया नाम {pre}{n:02d}"); batch = f"{pre}{n:02d}"; d["batch"] = batch
    # जाँच (वही नियम जो दूसरे Claude ने चलाए)
    kd = os.path.join(tmp, "_kit")  # ताज़ा किट (CSV समेत) — उसी के नियमों से जाँच
    subprocess.run([sys.executable, os.path.join(R, "scripts", "kit.py")], check=True, capture_output=True)
    with zipfile.ZipFile(os.path.join(R, "docs", "kit", f"{ORG}-saman-kit-v6.zip")) as z: z.extractall(kd)
    r = subprocess.run([sys.executable, os.path.join(kd, "tools", "jaanch.py"), sj, ph], capture_output=True, text=True)
    print(r.stdout[-3000:])
    nbad = int((re.search(r"^❌ (\d+)", r.stdout, re.M) or [0, "1"])[1])
    if nbad and "--force" not in sys.argv:
        sys.exit(f"❌ ZIP में {nbad} गलतियाँ — दूसरे Claude से ठीक करवाओ, या stock.json सुधारकर दोबारा (--dry से देखो, --force से फिर भी)")
    items = d.get("items") or []
    # 🏭 एक ही कंपनी के दो id (दूसरे Claude ने नया बना दिया) → पुराना id (docs/सामान-इनबॉक्स/company-alias.json)
    try: AL = json.load(open(os.path.join(INB, "company-alias.json"), encoding="utf8"))
    except Exception: AL = {}
    for x in items:
        for k in ("mfrId", "mfr"):
            if x.get(k) in AL: x[k] = AL[x[k]]
    for c in d.get("companies") or []:
        if c.get("id") in AL: c["id"] = AL[c["id"]]
    # 2) असली फोटो → संग्रह
    foto.wt(); Q = foto.load(); have = {x["sha"]: x for x in Q}; day = datetime.datetime.now().strftime("%Y%m%d"); kb = 0; new = 0
    ref = {}
    for x in items:
        rk = str(x.get("rack", "")).split("-")[0] or "x"
        for p in x.get("photos") or []:
            f = os.path.join(ph, p)
            if str(p).startswith("#") or not os.path.exists(f): continue
            h = foto.sha(f)
            if h not in have:
                rel = f"r{rk}/{day}-{h[:8]}.jpg"
                if not dry: kb += foto.store(f, os.path.join(foto.WT, rel)) // 1024
                row = {"f": rel, "sha": h, "rack": rk, "ts": datetime.datetime.now().isoformat(timespec="seconds"), "note": f"kit:{batch}", "st": "done",
                       "n": len(Q) + 1, "item": x.get("appId") or x.get("key")}
                Q.append(row); have[h] = row; new += 1
            ref.setdefault(id(x), []).append(have[h]["f"])
    for x in items:
        x["fotos"] = ref.get(id(x), [])
        x["photos"] = ["photos/" + p for p in (x.get("photos") or []) if not str(p).startswith("#")]
    # 3) खेप
    d["items"] = items
    d.setdefault("by", "दूसरा Claude"); d["note"] = (d.get("note") or "") + " · किट v6"
    pj = os.path.join(base, batch + ".json")
    json.dump({**d, "batch": batch}, open(pj, "w", encoding="utf8"), ensure_ascii=False)
    if dry:
        print(f"(dry) {len(items)} सामान, {new} नई फोटो — कुछ नहीं बदला"); return
    foto.save(Q)
    subprocess.run([sys.executable, os.path.join(R, "scripts", "pack.py"), "add", pj], check=True)
    # 4) कंपनियाँ + सवाल
    cp = os.path.join(INB, "companies.json"); C = json.load(open(cp, encoding="utf8")); M = {c["id"]: c for c in C}; nc = 0
    for c in d.get("companies") or []:
        if not c.get("id"): continue
        if c["id"] not in M: M[c["id"]] = c; C.append(c); nc += 1
        else:
            for k, v in c.items():
                if v not in (None, "", []) and M[c["id"]].get(k) in (None, "", []): M[c["id"]][k] = v
    json.dump(C, open(cp, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    asks = [x for x in items if x.get("ask")]
    if asks:
        with open(os.path.join(INB, "sawal.md"), "a", encoding="utf8") as f:
            f.write(f"\n## {batch} (दूसरे Claude की ZIP)\n" + "\n".join(f"- रैक {x.get('rack','?')} · {x.get('short') or x.get('name')} — {x['ask']}" for x in asks) + "\n")
    # 5) पूरी जानकारी सँभालो (thumb बिना)
    os.makedirs(os.path.join(INB, "kaam"), exist_ok=True)
    for x in items: x.pop("thumb", None)
    json.dump(d, open(os.path.join(INB, "kaam", batch + ".json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    for f in ("सवाल.md", "सार.md", "जाँच.txt"):
        p = os.path.join(base, f)
        if os.path.exists(p): shutil.copy(p, os.path.join(INB, "kaam", f"{batch}-{f}"))
    foto.push(f"📸 किट {batch}: {new} फोटो")
    print(f"✅ {batch}: {len(items)} सामान · {new} असली फोटो संग्रह में ({kb} KB) · {nc} नई कंपनी · {len(asks)} सवाल\n"
          f"अब: node scripts/build.mjs → tests/packs.py + e2e → git add web/data web/p docs → commit/push")
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
