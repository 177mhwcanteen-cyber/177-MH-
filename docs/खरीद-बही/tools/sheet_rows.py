# बही के बिल (data/bills/*.json) → Google Sheet "लाइनें" और "बिल" टैब की इनपुट पंक्तियाँ (CSV)।
# शीट खो जाए या नई बनानी हो तो: python3 sheet_rows.py  → lines.csv, bills.csv बनेंगी।
# इन्हें नई शीट में चिपकाकर README में लिखे फ़ॉर्मूले लगाइए। हिसाब (जोड़, फ़र्क, %) शीट के फ़ॉर्मूले ही करेंगे — मन से नहीं।
import csv, glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
BILLS = sorted(glob.glob(os.path.join(HERE, "..", "data", "bills", "*.json")))

def dmy(iso):
    if not iso:
        return ""
    y, m, d = iso.split("-")
    return f"{d}-{m}-{y}"

lines, bills = [], []
for f in BILLS:
    b = json.load(open(f, encoding="utf8"))
    bid = os.path.basename(f)[:-5]
    bills.append([bid, dmy(b.get("date", "")), b.get("sup", ""), b.get("no", ""), b.get("buyer", ""), b.get("pay", ""), b.get("total", ""), b.get("note", "")])
    for l in b.get("lines", []):
        pp = l.get("pp") or 1
        lines.append([bid, dmy(b.get("date", "")), b.get("sup", ""), l.get("nm") or l.get("n", ""), pp, l.get("qty", ""), l.get("u", ""),
                      l.get("rate", ""), l.get("mrp", ""), l.get("sale", ""), l.get("saleOne", ""), l.get("bc", "")])

with open(os.path.join(HERE, "lines.csv"), "w", newline="", encoding="utf8") as fh:
    w = csv.writer(fh)
    w.writerow(["A बिल id", "B तारीख", "C दुकान", "D सामान", "E 1 पैकेट में पीस", "F मात्रा", "G इकाई", "H रेट (GST सहित, 1 इकाई)", "I MRP (1 इकाई)", "O बेचें पैकेट", "P बेचें 1 पीस", "S बारकोड"])
    w.writerows(lines)
with open(os.path.join(HERE, "bills.csv"), "w", newline="", encoding="utf8") as fh:
    w = csv.writer(fh)
    w.writerow(["A बिल id", "B तारीख", "C दुकान", "D बिल नंबर", "E खरीदार", "F भुगतान", "G बिल पर लिखा कुल", "K नोट"])
    w.writerows(bills)
print(len(bills), "बिल,", len(lines), "लाइनें")
