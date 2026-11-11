#!/usr/bin/env python3
"""2×2 ग्रिड वाली फोटो (ChatGPT/Gemini) से रसोई की 4 डिश काटकर web/order/rasoi/<id>.jpg (≤20 KB) में रखता है।
उपयोग: python3 scripts/grid_photos.py <फोटो> rs-id1 rs-id2 rs-id3 rs-id4   (क्रम: ऊपर-बाएँ, ऊपर-दाएँ, नीचे-बाएँ, नीचे-दाएँ; '-' = छोड़ो)"""
import io, json, os, sys
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(sys.argv[1]).convert("RGB"); W, H = src.size
ids = sys.argv[2:6]
known = {i["id"] for i in json.load(open(os.path.join(R, "web/order/rasoi.json"), encoding="utf-8"))["items"]}
for k, i in enumerate(ids):
    if i == "-": continue
    assert i in known, "मेन्यू में नहीं: " + i
    x, y, m = k % 2, k // 2, 6
    base = src.crop((x * W // 2 + m, y * H // 2 + m, (x + 1) * W // 2 - m, (y + 1) * H // 2 - m))
    best = None
    for sz in (400, 380, 360, 340, 320):
        t = base.resize((sz, sz), Image.LANCZOS)
        for q in range(80, 47, -4):
            b = io.BytesIO(); t.save(b, "JPEG", quality=q, optimize=True, progressive=True)
            if b.tell() <= 20000: best = (sz, q, b.getvalue()); break
        if best and best[1] >= 60: break
    open(os.path.join(R, "web/order/rasoi", i + ".jpg"), "wb").write(best[2])
    print(i, best[0], "px q", best[1], len(best[2]), "B")
