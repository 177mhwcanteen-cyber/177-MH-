#!/usr/bin/env python3
"""📦 दूसरे Claude खाते के लिए "सामान चढ़ाने का किट v6" बनाओ (docs/kit/README.md देखें)।
  python3 scripts/kit.py            → docs/kit/mh177-saman-kit-v6.zip (रिपो के ताज़ा डेटा से)
हर बार सामान/कंपनी/खरीद-भाव बदलें तो दोबारा चलाकर push करो — विक्रम जी GitHub से नया किट ले सकें।"""
import csv, datetime, glob, io, json, os, re, subprocess, zipfile

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
K = os.path.join(R, "docs", "kit")
V48 = os.path.join(R, "docs", "सामान-AI-ZIP-v4.8")
ORG = re.search(r'org:\s*"([a-z0-9]+)"', open(os.path.join(R, "web", "config.js"), encoding="utf8").read())[1]
OUT = os.path.join(K, f"{ORG}-saman-kit-v6.zip")


def node_eval(expr_src, name):
    js = f"{expr_src}\nprocess.stdout.write(JSON.stringify({name}))"
    return json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)


def csv_text(rows, head):
    o = io.StringIO(); o.write("﻿"); w = csv.writer(o); w.writerow(head)
    for r in rows: w.writerow([r.get(h, "") for h in head])
    return o.getvalue()


def main():
    html = open(os.path.join(R, "web", "index.html"), encoding="utf8").read()
    cats = node_eval(re.search(r"^const CATS=.*?;$", html, re.M)[0], "CATS")
    subs = node_eval(re.search(r"^const SUBS=.*?;$", html, re.M)[0], "SUBS")
    cn = dict((c[0], c[1]) for c in cats)
    r01 = [{"cat": c, "cat_naam": cn.get(c, c), "sub": s[0], "sub_naam": s[1]} for c, L in subs.items() for s in L]
    # 02 पहचान-सूची (पुराना Vyapar)
    ph = json.load(open(os.path.join(R, "web", "pehchan.json"), encoding="utf8"))
    r02 = [{"id": x["id"], "brand": x.get("brand", ""), "name": x.get("name", ""), "hi": x.get("hi", ""), "size": x.get("size", ""),
            "barcodes": " ".join(b["code"] for b in x.get("barcodes", []) if b.get("code")), "mrp": x.get("mrp", ""),
            "purana_sale": x.get("lastSale", ""), "purana_kharid": x.get("lastPur", ""), "unit": x.get("unit", "")} for x in ph.get("items", [])]
    # 03 ऐप में पहले से (migrate + खेपें)
    mg = json.load(open(os.path.join(R, "web", "migrate.json"), encoding="utf8"))
    it = mg.get("items") or {}
    it = it if isinstance(it, list) else [dict(id=k, **v) for k, v in it.items()]
    for p in glob.glob(os.path.join(R, "web", "data", "items", "*.json")):
        if p.endswith("index.json"): continue
        it += json.load(open(p, encoding="utf8")).get("items", [])
    r03 = [{"id": x.get("id", ""), "code": x.get("code", ""), "name": str(x.get("name", "")).upper(), "short": str(x.get("short", "")).upper(),
            "barcode": x.get("barcode", ""), "cat": x.get("cat", ""), "sub": x.get("sub", ""), "rack": x.get("rack", ""),
            "mrp": x.get("mrp", ""), "sale": x.get("sale", ""), "perPack": x.get("perPack", ""), "packOf": x.get("packOf", "")}
           for x in it if x.get("active") is not False]
    # 08 रैक-नक्शा (se-rack.js MAP — अभी वाला)
    rk = open(os.path.join(R, "web", "se-rack.js"), encoding="utf8").read()
    mp = node_eval("const ISMH=true;const MAP=" + re.search(r"const MAP=!ISMH\?\[\]:(\[.*?\]\]);", rk, re.S)[1] + ";", "MAP")
    old = node_eval("const ISMH=true;const OLD=" + re.search(r"const OLD=!ISMH\?\{\}:(\{.*?\});", rk, re.S)[1] + ";", "OLD")
    r08 = [{"रैक": m[0], "खाने": m[1], "नाम": m[2], "क्या रखें": m[3] if len(m) > 3 else "",
            "हिस्सा": "अंदर वाला हिस्सा" if int(m[0]) >= 31 else "दुकान", "खाने का नंबर": f"{m[0]}-1 … {m[0]}-{m[1]} (ऊपर-बाएँ से, किताब जैसे)"} for m in mp]
    oldt = "पुराने नंबर → नए: " + ", ".join(f"{a}→{b}" for a, b in old.items())
    # 09 कंपनियाँ
    co = json.load(open(os.path.join(R, "docs", "सामान-इनबॉक्स", "companies.json"), encoding="utf8"))
    # 10 खरीद-भाव (बही के बिल)
    r10 = []
    for f in sorted(glob.glob(os.path.join(R, "docs", "खरीद-बही", "data", "bills", "*.json"))):
        b = json.load(open(f, encoding="utf8"))
        for l in b.get("lines", []):
            nm = str(l.get("nm", ""))
            if re.search(r"ROUND|WAGE|MAZDOORI|LABOUR|FREIGHT|भाड़ा", nm, re.I): continue
            pp = float(l.get("pp") or 0); rate = float(l.get("rate") or 0)
            r10.append({"date": b.get("date", ""), "dukan": b.get("sup", ""), "bill": b.get("no", ""), "naam": nm, "barcode": l.get("bc", ""),
                        "qty": l.get("qty", ""), "unit": l.get("u", ""), "bhav": rate, "pack_me": int(pp) if pp else "",
                        "ek_ka_kharid": round(rate / pp, 2) if pp > 1 else rate, "mrp": l.get("mrp", ""), "tob": 1 if l.get("tob") else ""})
    r10.sort(key=lambda r: (r["naam"], r["date"]))
    today = datetime.date.today().strftime("%d-%m-%Y")
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("00-पहले-यह-पढ़ो.md", open(os.path.join(K, "00-पहले-यह-पढ़ो.md"), encoding="utf8").read().replace("{{DATE}}", today))
        z.writestr("00b-विस्तार-v4.8.txt", "⚠ यह पुराना (v4.8) विस्तार है — 00-पहले-यह-पढ़ो.md से टकराए तो वही सही। thumb (base64) अब नहीं चाहिए।\n\n" +
                   open(os.path.join(V48, "00-प्रॉम्प्ट-पहले-यह-पढ़ें.txt"), encoding="utf8").read())
        z.writestr("01-श्रेणी-सूची.csv", csv_text(r01, ["cat", "cat_naam", "sub", "sub_naam"]))
        z.writestr("02-पहचान-सूची.csv", csv_text(r02, list(r02[0].keys()) if r02 else ["id"]))
        z.writestr("03-ऐप-में-पहले-से.csv", csv_text(r03, ["id", "code", "name", "short", "barcode", "cat", "sub", "rack", "mrp", "sale", "perPack", "packOf"]))
        z.write(os.path.join(V48, "04-नमूना-जवाब.json"), "04-नमूना-जवाब.json")
        z.write(os.path.join(V48, "05-खाली-ढाँचा.csv"), "05-खाली-ढाँचा.csv")
        z.write(os.path.join(R, "docs", "ऑनलाइन-दुकान-प्रॉम्प्ट.txt"), "06-ऑनलाइन-दुकान.txt")
        z.write(os.path.join(K, "07-Gemini-फोटो-प्रॉम्प्ट.txt"), "07-Gemini-फोटो-प्रॉम्प्ट.txt")
        z.writestr("08-रैक-नक्शा.csv", csv_text(r08, ["रैक", "खाने", "नाम", "क्या रखें", "हिस्सा", "खाने का नंबर"]) + f'"{oldt}"\n')
        z.writestr("09-कंपनियाँ.json", json.dumps(co, ensure_ascii=False, indent=1))
        z.writestr("10-खरीद-भाव.csv", csv_text(r10, ["date", "dukan", "bill", "naam", "barcode", "qty", "unit", "bhav", "pack_me", "ek_ka_kharid", "mrp", "tob"]))
        z.write(os.path.join(K, "tools", "jaanch.py"), "tools/jaanch.py")
    print(f"✅ किट: {OUT} ({os.path.getsize(OUT) // 1024} KB) · श्रेणी {len(r01)} · पहचान {len(r02)} · ऐप में {len(r03)} · रैक {len(r08)} · कंपनी {len(co)} · खरीद-भाव {len(r10)}")


if __name__ == "__main__":
    main()
