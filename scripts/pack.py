#!/usr/bin/env python3
"""📦 सामान की खेप बनाओ (Claude के लिए) — docs/सामान-चढ़ाना-प्रॉम्प्ट.txt देखें।

उपयोग:
  python3 scripts/pack.py add  <खेप.json>       # mh177-pack (v5) या mh177-stock (ZIP v4.8) — दोनों चलते हैं
  python3 scripts/pack.py check                 # सारी खेपों की जाँच (दोहरा id/बारकोड, बिना भाव/फोटो, ग़लत रैक…)

खेप.json में हर सामान के साथ "photo": "<फोटो फ़ाइल का रास्ता>" दे सकते हैं — यह उसे 400px, ≤20 KB करके
web/p/<id>.jpg में रखेगा और "ph" (फोटो-संस्करण) भर देगा। बिक्री/स्टॉक कभी नहीं छूता; गिनती "open.qty" में जाती है।
"""
import hashlib, io, json, os, re, sys

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
D = os.path.join(R, "web", "data", "items")
P = os.path.join(R, "web", "p")
IDX = os.path.join(D, "index.json")
ORG = (re.search(r'org:\s*"([a-z0-9]+)"', open(os.path.join(R, "web", "config.js"), encoding="utf8").read()) or [None, "mh177"])[1]  # 🏢 संस्था
KEEP = ["id", "name", "short", "hi", "brand", "size", "alias", "emoji", "cat", "sub", "unit", "code", "barcode", "mrp", "sale", "cost",
        "perPack", "packOf", "track", "min", "rack", "secret", "ph", "mfr", "fotos", "ctn", "open"]
CKEEP = ["id", "name", "phone", "care", "email", "web", "addr", "city", "fssai", "gst", "brands", "dist", "note"]


def cap(s):
    return re.sub(r"[a-z]+", lambda m: m.group(0).upper(), str(s or "")).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s or "").lower()).strip("-")[:40]


def make_id(x):
    bc = re.sub(r"\D", "", str(x.get("barcode") or ""))
    if len(bc) >= 8 and not bc.startswith("2"):
        return "b" + bc  # कंपनी का बारकोड = पक्की पहचान
    return "g-" + slug(x.get("name"))


def photo(src, iid):
    from PIL import Image
    im = Image.open(src).convert("RGB")
    im.thumbnail((400, 400))
    for q in (78, 70, 62, 55, 48, 42, 36):
        b = io.BytesIO()
        im.save(b, "JPEG", quality=q, optimize=True, progressive=True)
        if b.tell() <= 20 * 1024:
            break
    if b.tell() > 20 * 1024:
        im.thumbnail((300, 300)); b = io.BytesIO(); im.save(b, "JPEG", quality=45, optimize=True)
    os.makedirs(P, exist_ok=True)
    open(os.path.join(P, iid + ".jpg"), "wb").write(b.getvalue())
    return hashlib.sha1(b.getvalue()).hexdigest()[:8], b.tell()


def from_stock(it):
    """ZIP v4.8 (mh177-stock) का एक सामान → एक या दो (पीस + पैकेट) mh177-pack सामान"""
    pp = int(it.get("perPack") or 0)
    base = {"name": cap(it.get("name")), "hi": it.get("hi", ""), "brand": cap(it.get("brand")), "size": it.get("size", ""),
            "cat": it.get("cat") or "kirana", "sub": it.get("sub", ""), "unit": it.get("unit") or "pc", "barcode": it.get("barcode", ""),
            "mrp": it.get("mrp") or 0, "sale": it.get("sale") or 0, "cost": it.get("cost") or 0, "rack": it.get("rack", ""),
            "secret": it.get("secret", ""), "alias": " ".join(it.get("searchWords") or []) if isinstance(it.get("searchWords"), list) else it.get("searchWords", ""),
            "short": cap(it.get("short", "")), "mfr": it.get("mfrId", ""), "fotos": it.get("fotos") or [], "ctn": int(it.get("caseQty") or 0) or ""}
    ph = (it.get("photoFile") or (it.get("photos") or [None])[0])
    op = {"qty": it.get("qty"), "exp": it.get("exp", ""), "batchNo": it.get("batchNo", "")} if it.get("qty") not in (None, "") else None
    if pp > 1 and it.get("sell") in ("both", "pack"):
        pc = dict(base, name=cap(it.get("name")) + " 1 PC", barcode="", mrp=round((base["mrp"] or 0) / pp, 2),
                  sale=it.get("saleOne") or round((base["sale"] or 0) / pp, 2), cost=round((base["cost"] or 0) / pp, 2), perPack=pp)
        pc["id"] = it.get("appId") or (make_id(dict(pc, barcode="")) + "-pc")
        pc["short"] = cap((it.get("short") or base["name"])[:19] + " 1 PC")
        pk = dict(base, perPack=pp, packOf=pc["id"], track=False)
        pk["id"] = make_id(pk)
        if op: pc["open"] = {**op, "qty": (op["qty"] or 0) * pp}
        return [dict(pc, photo=ph), dict(pk, photo=ph)]
    x = dict(base, perPack=pp)
    x["id"] = it.get("appId") or it.get("id") or make_id(x)  # appId = ऐप में पहले से (किट v6)
    if op: x["open"] = op
    return [dict(x, photo=ph)]


def add(path):
    src = json.load(open(path, encoding="utf8"))
    items = []
    if src.get("app") == "mh177-stock":
        for it in src.get("items", []): items += from_stock(it)
        pid = src.get("batch") or os.path.basename(path)[:-5]
    elif src.get("app") == "mh177-pack":
        items = src.get("items", []); pid = src.get("id") or os.path.basename(path)[:-5]
    else:
        sys.exit("❌ app = mh177-pack या mh177-stock होना चाहिए")
    here = os.path.dirname(os.path.abspath(path)); out = []; kb = 0
    for x in items:
        x = dict(x); x["name"] = cap(x.get("name")); x["short"] = cap(x.get("short") or x["name"])[:24]
        x["id"] = x.get("id") or make_id(x)
        ph = x.pop("photo", None)
        if ph:
            f = ph if os.path.isabs(ph) else os.path.join(here, ph)
            if os.path.exists(f):
                x["ph"], n = photo(f, x["id"]); kb += n
        out.append({k: x[k] for k in KEEP if k in x and x[k] not in (None, "")})
    os.makedirs(D, exist_ok=True)
    if src.get("org") and src["org"] != ORG: sys.exit(f"⛔ यह खेप {src['org']} की है, यह रिपो {ORG} का है — नहीं चढ़ेगी")
    cos = [{k: c[k] for k in CKEEP if c.get(k) not in (None, "", [])} for c in src.get("companies", [])]
    for c in cos:
        c["name"] = cap(c["name"])
        if not re.fullmatch(r"c-[a-z0-9-]{2,40}", c.get("id", "")): sys.exit(f"❌ कंपनी id ग़लत (c-<नाम>): {c}")
    doc = {"app": "mh177-pack", "org": ORG, "v": 5, "id": pid, "date": src.get("date", ""), "by": src.get("by", ""), "note": src.get("note", ""), "items": out}
    if cos: doc["companies"] = cos
    txt = json.dumps(doc, ensure_ascii=False, indent=1)
    open(os.path.join(D, pid + ".json"), "w", encoding="utf8").write(txt + "\n")
    idx = json.load(open(IDX, encoding="utf8")) if os.path.exists(IDX) else {"app": "mh177-packs", "org": ORG, "v": 5, "packs": []}
    idx["org"] = ORG
    sha = hashlib.sha1(txt.encode()).hexdigest()[:10]
    idx["packs"] = [p for p in idx["packs"] if p["id"] != pid] + [{"id": pid, "n": len(out), "sha": sha, "date": doc["date"]}]
    json.dump(idx, open(IDX, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"✅ खेप {pid}: {len(out)} सामान, फोटो {kb // 1024} KB")
    check()


def check():
    idx = json.load(open(IDX, encoding="utf8")) if os.path.exists(IDX) else {"packs": []}
    seen, bcs, warn = {}, {}, []
    cids = {c["id"] for p in idx["packs"] for c in json.load(open(os.path.join(D, p["id"] + ".json"), encoding="utf8")).get("companies", [])}
    for p in idx["packs"]:
        for x in json.load(open(os.path.join(D, p["id"] + ".json"), encoding="utf8"))["items"]:
            i = x["id"]
            if i in seen and seen[i] != p["id"]: warn.append(f"दोहरा id {i} ({seen[i]}, {p['id']})")
            seen[i] = p["id"]
            b = x.get("barcode")
            if b:
                if b in bcs and bcs[b] != i: warn.append(f"एक बारकोड दो सामान: {b} → {bcs[b]}, {i}")
                bcs[b] = i
            if not x.get("packOf") and not (x.get("sale") or x.get("mrp")): warn.append(f"भाव नहीं: {x['name']}")
            if x.get("sale") and x.get("mrp") and float(x["sale"]) > float(x["mrp"]): warn.append(f"MRP से ऊपर: {x['name']} {x['sale']} > {x['mrp']}")
            if x.get("cost") and x.get("sale") and float(x["sale"]) < float(x["cost"]): warn.append(f"खरीद से कम: {x['name']}")
            if x.get("rack") and not re.fullmatch(r"\d{1,2}-\d{1,2}", str(x["rack"])): warn.append(f"रैक ग़लत: {x['name']} '{x['rack']}'")
            if not x.get("ph"): warn.append(f"फोटो नहीं: {x['name']}")
            if len(x["name"]) > 24 and x.get("short", "") == x["name"][:24]: warn.append(f"छोटा नाम (short) कटा हुआ — खुद लिखो: {x['name']}")
            if x.get("mfr") and x["mfr"] not in cids: warn.append(f"🏭 कंपनी {x['mfr']} किसी खेप की companies में नहीं: {x['name']}")
            if x.get("sub") == "tob" and not x.get("secret"): warn.append(f"🔒 तम्बाकू पर secret कोड नहीं: {x['name']}")
    print(f"🔍 {len(seen)} सामान, {len(idx['packs'])} खेप · {len(warn)} चेतावनी")
    for w in warn[:60]: print("  ⚠", w)
    return warn


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "add": add(sys.argv[2])
    elif len(sys.argv) >= 2 and sys.argv[1] == "check": check()
    else: print(__doc__)
