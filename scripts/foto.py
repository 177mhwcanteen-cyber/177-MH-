#!/usr/bin/env python3
"""📸 सामान की असली फोटो का संग्रह (फटाफट जमा → बाद में आराम से काम) — docs/सामान-इनबॉक्स/README.md देखें।

  python3 scripts/foto.py add <रैक> [--note "…"] --new        # चैट में आई सारी नई फोटो (जो पहले नहीं ली) इस रैक में
  python3 scripts/foto.py add <रैक> [--note "…"] <फ़ाइलें…>   # या ख़ास फ़ाइलें
  python3 scripts/foto.py status                            # रैक-वार: कितनी नई / हो गईं / सवाल
  python3 scripts/foto.py next [r=<रैक>] [n]                # अगली n नई फोटो (काम के लिए), रास्ते समेत
  python3 scripts/foto.py mark <st> <item-id|-> <f…> [--q "सवाल"]   # st = done | ask | skip | dup
  python3 scripts/foto.py ignore-old                        # अभी तक की सारी चैट-फोटो (बिल आदि) को "सामान नहीं" मानो
  python3 scripts/foto.py get                               # संग्रह शाखा लाओ (दूसरे Claude खाते पर पहली बार)

असली फोटो → git शाखा "foto-sangrah" (इसी रिपो में; main/ऐप/Pages से अलग, कोई build नहीं): r<रैक>/<तारीख>-<sha8>.jpg
सूची (कतार) → main में docs/सामान-इनबॉक्स/queue.jsonl  (हर फोटो एक पंक्ति)।  फोटो कभी मिटती नहीं।
"""
import datetime, hashlib, io, json, os, re, subprocess, sys

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DRY = os.environ.get("FOTO_DRY")  # जाँच के लिए: कुछ push नहीं, अलग जगह
Q = DRY + "/queue.jsonl" if DRY else os.path.join(R, "docs", "सामान-इनबॉक्स", "queue.jsonl")
IGN = os.path.join(R, "docs", "सामान-इनबॉक्स", "ignore-sha.txt")
WT = DRY + "/wt" if DRY else os.path.join(os.path.dirname(R), os.path.basename(R) + "-foto")  # संग्रह शाखा की अलग जगह
BR = "foto-sangrah"
UP = ["/mnt/user-data/attachments", "/mnt/user-data/uploads"]
MAXB = 450 * 1024  # इससे बड़ी फोटो 2000px तक छोटी (पढ़ने लायक बनी रहे)


def sh(*a, cwd=None, ok=False):
    r = subprocess.run(a, cwd=cwd or R, capture_output=True, text=True)
    if r.returncode and not ok: sys.exit(f"❌ {' '.join(a)}\n{r.stderr[-800:]}")
    return r.stdout.strip()


def load():
    if not os.path.exists(Q): return []
    return [json.loads(l) for l in open(Q, encoding="utf8") if l.strip()]


def save(rows):
    os.makedirs(os.path.dirname(Q), exist_ok=True)
    open(Q, "w", encoding="utf8").write("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))


def ign():
    return set(open(IGN).read().split()) if os.path.exists(IGN) else set()


def sha(f):
    return hashlib.sha256(open(f, "rb").read()).hexdigest()


def wt():
    """संग्रह शाखा तैयार (न हो तो बनाओ / लाओ)"""
    if DRY: os.makedirs(WT, exist_ok=True); return
    if os.path.isdir(os.path.join(WT, ".git")) or os.path.isfile(os.path.join(WT, ".git")): return
    sh("git", "fetch", "origin", BR, ok=True)
    if sh("git", "ls-remote", "--heads", "origin", BR, ok=True):
        sh("git", "worktree", "add", WT, "origin/" + BR, ok=True) if not os.path.exists(WT) else None
        sh("git", "checkout", "-B", BR, "origin/" + BR, cwd=WT)
    else:
        sh("git", "worktree", "add", "--detach", WT)
        sh("git", "checkout", "--orphan", BR, cwd=WT)
        sh("git", "rm", "-rfq", ".", cwd=WT, ok=True)
        open(os.path.join(WT, "README.md"), "w", encoding="utf8").write(
            "# 📸 177 MH — सामान की असली फोटो (संग्रह)\n\nसिर्फ़ 177 MH। फोटो कभी न मिटाएँ। सूची: main शाखा docs/सामान-इनबॉक्स/queue.jsonl ·"
            " तरीका: main शाखा docs/सामान-इनबॉक्स/README.md\n")
        sh("git", "add", "README.md", cwd=WT)
        sh("git", "commit", "-qm", "📸 फोटो-संग्रह शुरू", cwd=WT)


def uploads():
    """चैट में आई फोटो, आने के क्रम में"""
    out = []
    for base in UP:
        if not os.path.isdir(base): continue
        for dp, _, fs in os.walk(base):
            for f in fs:
                if re.search(r"\.(jpe?g|png|webp|heic)$", f, re.I): out.append(os.path.join(dp, f))
    return sorted(out, key=os.path.getmtime)


def store(src, dst):
    b = open(src, "rb").read()
    if len(b) > MAXB or not re.search(r"\.jpe?g$", src, re.I):
        from PIL import Image, ImageOps
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB"); im.thumbnail((2000, 2000))
        o = io.BytesIO(); im.save(o, "JPEG", quality=85, optimize=True); b = o.getvalue()
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "wb").write(b)
    return len(b)


def push(msg):
    if DRY: return
    sh("git", "add", "-A", cwd=WT)
    if sh("git", "status", "--porcelain", cwd=WT):
        sh("git", "commit", "-qm", msg, cwd=WT)
    for _ in range(3):
        r = subprocess.run(["git", "push", "-q", "origin", "HEAD:" + BR], cwd=WT, capture_output=True, text=True)
        if r.returncode == 0: break
        sh("git", "pull", "-q", "--rebase", "origin", BR, cwd=WT, ok=True)
    else: print("⚠ फोटो-शाखा push नहीं हुई:", r.stderr[-300:])
    fs = [os.path.relpath(x, R) for x in (Q, IGN) if os.path.exists(x)]
    if fs: sh("git", "add", *fs)
    if sh("git", "diff", "--cached", "--name-only"):
        sh("git", "commit", "-qm", msg + "\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")
        sh("git", "pull", "-q", "--rebase", "--autostash", ok=True)
        sh("git", "push", "-q", ok=True)


def add(args):
    rack = args[0]; args = args[1:]; note = ""
    if "--note" in args: i = args.index("--note"); note = args[i + 1]; del args[i:i + 2]
    if not re.fullmatch(r"[0-9A-Za-z-]{1,8}", rack): sys.exit("❌ रैक जैसे 6 या 6-4 या गोदाम")
    wt(); rows = load(); have = {r["sha"] for r in rows} | ign()
    files = uploads() if args == ["--new"] else args
    new = dup = kb = 0; day = datetime.datetime.now().strftime("%Y%m%d")
    for f in files:
        h = sha(f)
        if h in have:
            dup += (args != ["--new"]); continue
        rel = f"r{rack}/{day}-{h[:8]}.jpg"
        kb += store(f, os.path.join(WT, rel)) // 1024
        rows.append({"f": rel, "sha": h, "rack": rack, "ts": datetime.datetime.now().isoformat(timespec="seconds"),
                     "note": note, "st": "new", "n": len(rows) + 1}); have.add(h); new += 1
    save(rows)
    if new: push(f"📸 रैक {rack}: {new} फोटो")
    left = sum(r["st"] == "new" for r in rows)
    print(f"✅ रैक {rack}: {new} नई फोटो सुरक्षित ({kb} KB){f', {dup} दोहरी छोड़ी' if dup else ''} · कुल बाकी काम: {left}")


def status():
    rows = load(); by = {}
    for r in rows: by.setdefault(r["rack"], {}).setdefault(r["st"], 0); by[r["rack"]][r["st"]] += 1
    for k in sorted(by, key=lambda x: (len(x), x)): print(f"रैक {k}: " + " · ".join(f"{s} {n}" for s, n in sorted(by[k].items())))
    print(f"कुल {len(rows)} फोटो · नई {sum(r['st'] == 'new' for r in rows)} · सवाल {sum(r['st'] == 'ask' for r in rows)}")


def nxt(args):
    rack = None; n = 20
    for x in args:
        if x.startswith("r=") or x.startswith("रैक="): rack = x.split("=", 1)[1]
        elif x.isdigit(): n = int(x)
    wt()
    for r in [r for r in load() if r["st"] == "new" and (rack is None or r["rack"] == rack)][:n]:
        p = os.path.join(WT, r["f"])
        if not os.path.exists(p): sh("git", "pull", "-q", "origin", BR, cwd=WT, ok=True)
        print(f"#{r['n']} रैक {r['rack']} {p}{'  · ' + r['note'] if r['note'] else ''}")


def mark(args):
    st, item = args[0], args[1]; args = args[2:]; q = ""
    if "--q" in args: i = args.index("--q"); q = args[i + 1]; del args[i:i + 2]
    if st not in ("done", "ask", "skip", "dup", "new"): sys.exit("❌ st = done|ask|skip|dup|new")
    rows = load(); keys = set(a.lstrip("#") for a in args); n = 0
    for r in rows:
        if r["f"] in keys or str(r["n"]) in keys or os.path.basename(r["f"]) in keys:
            r["st"] = st; n += 1
            if item != "-": r["item"] = item
            if q: r["q"] = q
    save(rows); print(f"✓ {n} फोटो → {st}")


def ignore_old():
    s = ign() | {sha(f) for f in uploads()} - {r["sha"] for r in load()}
    os.makedirs(os.path.dirname(IGN), exist_ok=True)
    open(IGN, "w").write("\n".join(sorted(s)) + "\n"); print(f"✓ {len(s)} पुरानी चैट-फोटो (बिल आदि) सामान में नहीं गिनी जाएँगी")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: print(__doc__)
    elif a[0] == "add" and len(a) >= 3: add(a[1:])
    elif a[0] == "status": status()
    elif a[0] == "next": nxt(a[1:])
    elif a[0] == "mark" and len(a) >= 4: mark(a[1:])
    elif a[0] == "ignore-old": ignore_old()
    elif a[0] == "push": wt(); push("📸 सूची ताज़ा")
    elif a[0] == "get": wt(); sh("git", "pull", "-q", "origin", BR, cwd=WT, ok=True); print("✓ संग्रह:", WT)
    else: print(__doc__)
