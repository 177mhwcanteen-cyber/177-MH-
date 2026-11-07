// 🏢 संस्था-पहरा (build से पहले, CI में भी): इस रिपो में सिर्फ़ इसी संस्था का डेटा रहे।
// 177 MH (रिपो 177-MH-) = org "mh177" + Firebase "mh177-canteen" · भैरव (रिपो bhairav-canteen-app) = org "bhairav" + Firebase "bhairav-canteen"
// कुछ भी मेल न खाए तो build रुक जाता है — कुछ भी फ़ोन तक नहीं पहुँचता।
import fs from "node:fs";
import path from "node:path";
const ORGS = {
  mh177: { fb: "mh177-canteen", repo: /177-MH-/i, name: "177 MH" },
  bhairav: { fb: "bhairav-canteen", repo: /bhairav-canteen-app/i, name: "भैरव" },
};
export function orgGuard(R) {
  const W = path.join(R, "web"), bad = [];
  const cfg = fs.readFileSync(path.join(W, "config.js"), "utf8");
  const org = (/org:\s*"([a-z0-9]+)"/.exec(cfg) || [])[1];
  const fb = (/projectId:\s*"([^"]+)"/.exec(cfg) || [])[1];
  if (!ORGS[org]) bad.push(`config.js में org नहीं/ग़लत: ${org}`);
  const O = ORGS[org] || {};
  if (fb && fb !== O.fb) bad.push(`config.js: org ${org} पर Firebase ${fb} (होना चाहिए ${O.fb})`);
  const gr = process.env.GITHUB_REPOSITORY || "";
  if (gr && O.repo && !O.repo.test(gr)) bad.push(`रिपो ${gr} में org ${org} — ग़लत रिपो!`);
  const mg = path.join(W, "migrate.json");
  if (fs.existsSync(mg)) {
    const m = JSON.parse(fs.readFileSync(mg, "utf8"));
    if ((m._org || "mh177") !== org) bad.push(`migrate.json का _org ${m._org || "(नहीं — mh177 माना)"} ≠ ${org}`);
  }
  const D = path.join(W, "data", "items");
  if (fs.existsSync(D)) for (const f of fs.readdirSync(D).filter(f => f.endsWith(".json"))) {
    const j = JSON.parse(fs.readFileSync(path.join(D, f), "utf8"));
    if ((j.org || "mh177") !== org) bad.push(`data/items/${f} का org ${j.org || "(नहीं)"} ≠ ${org}`);
  }
  // दूसरी संस्था का Firebase नाम web/ के किसी डेटा/कोड में न हो
  for (const [k, o] of Object.entries(ORGS)) if (k !== org) {
    for (const f of fs.readdirSync(W).filter(f => /\.(js|json|html)$/.test(f)))
      if (fs.readFileSync(path.join(W, f), "utf8").includes(o.fb)) bad.push(`web/${f} में दूसरी संस्था (${o.name}) का Firebase "${o.fb}"`);
  }
  // 📏 GitHub की सीमा: कोई फ़ाइल 20 MB से बड़ी नहीं, फोटो (web/p) 20 KB तक, कुल web 800 MB तक (Pages 1 GB)
  let tot = 0;
  (function walk(d) { for (const f of fs.readdirSync(d)) { const a = path.join(d, f), s = fs.statSync(a);
    if (s.isDirectory()) { walk(a); continue }
    tot += s.size;
    if (s.size > 20 * 1024 * 1024) bad.push(`बहुत बड़ी फ़ाइल: ${path.relative(R, a)} (${Math.round(s.size / 1048576)} MB)`);
    if (a.includes(path.sep + "p" + path.sep) && f.endsWith(".jpg") && s.size > 24 * 1024) bad.push(`फोटो 20 KB से बड़ी: ${path.relative(R, a)}`);
  } })(W);
  if (tot > 800 * 1024 * 1024) bad.push(`web/ कुल ${Math.round(tot / 1048576)} MB — GitHub Pages की 1 GB सीमा के पास`);
  if (bad.length) { console.error("⛔ संस्था/सीमा पहरा:\n  " + bad.join("\n  ")); process.exit(1) }
  console.log(`🏢 संस्था-पहरा ठीक: ${O.name} (${org}) · web ${Math.round(tot / 1048576)} MB`);
  return org;
}
if (process.argv[1] && process.argv[1].endsWith("org-guard.mjs")) orgGuard(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
