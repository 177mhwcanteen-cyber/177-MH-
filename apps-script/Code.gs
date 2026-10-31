// 177 MH कैंटीन → Google Sheet (रोज़ का दूसरा बैकअप + Claude के लिए हिसाब)
//
// लगाने का तरीका (एक बार):
// 1. sheets.new खोलें, नाम रखें "177 MH कैंटीन हिसाब"
// 2. Extensions → Apps Script → यह पूरा कोड चिपकाएँ → Save
// 3. बाईं ओर ⚙ Project Settings → "Show appsscript.json" चालू करें, फिर appsscript.json में
//    इसी फ़ोल्डर की appsscript.json वाली चीज़ें चिपकाएँ
// 4. ऊपर फ़ंक्शन "setup" चुनकर ▶ Run दबाएँ → अनुमति दें (Allow)
// 5. ऊपर Deploy → New deployment → प्रकार "Web app" → Execute as: Me, Who has access: Anyone → Deploy
//    जो URL मिले (…/exec) वह Claude को भेजें — ऐप की खरीद वाली फोटो इसी से Drive में जाएँगी
// बस। अब हर घंटे पिछले 3 दिन का हिसाब Sheet में अपने-आप उतरता रहेगा,
// और दिन में 2 बार (सुबह ~7 और रात ~10 बजे) पूरा डेटा JSON फाइल बनकर Drive के
// "177 MH कैंटीन बैकअप" फ़ोल्डर में जाएगा (पिछले 60 बैकअप रखे जाते हैं, पुराने अपने-आप हटते हैं)।
// Sheet में कुछ भी हाथ से बदलने से ऐप का डेटा नहीं बदलता (सिर्फ़ पढ़ने की कॉपी है)।
//
const PROJECT_ID = 'mh177-canteen'; // 177 MH का Firebase प्रोजेक्ट ID (Claude भरेगा, जैसे bhairav-canteen-1a2b3)
const DAYS_BACK = 3;
const OWNER_EMAILS = ['mhwetcanteen@gmail.com']; // मालिक की लॉगिन ईमेल (कर्मचारी staff सूची से जाँचे जाते हैं)

function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncAll').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('liveJson').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('backupJson').timeBased().atHour(7).everyDays(1).inTimezone('Asia/Kolkata').create();
  ScriptApp.newTrigger('backupJson').timeBased().atHour(22).everyDays(1).inTimezone('Asia/Kolkata').create();
  syncAll();
  backupJson();
}

function syncAll() {
  const ss = SpreadsheetApp.getActive();
  syncBills_(ss);
  syncItems_(ss);
  syncLedger_(ss);
  syncDayMeta_(ss);
  syncPurchases_(ss);
  sheet_(ss, 'जानकारी', ['आखिरी अपडेट']).getRange(2, 1).setValue(new Date());
}

//  ---------- दिन में 2 बार पूरा बैकअप (Drive → "177 MH कैंटीन बैकअप") ----------
const BK_COLS = ['items', 'pstock', 'batches', 'parties', 'ledger', 'customers', 'purchases', 'suppliers', 'supPay', 'counts', 'settings', 'priceLog', 'staff', 'staffIndex', 'cancelReq'];
function backupJson() {
  const out = { app: '177 MH कैंटीन', project: PROJECT_ID, at: new Date().toISOString(), collections: {}, days: {} };
  BK_COLS.forEach(c => { try { out.collections[c] = fsList_(c); } catch (e) { out.collections[c] = { error: String(e) }; } });
  days_().concat(daysBack_(7)).filter((d, i, a) => a.indexOf(d) === i).forEach(d => {
    try { out.days[d] = { bills: fsList_('days/' + d + '/bills'), meta: fsList_('days/' + d + '/meta'), kharch: fsList_('days/' + d + '/kharch') }; } catch (e) {}
  });
  const root = folder_(DriveApp.getRootFolder(), '177 MH कैंटीन बैकअप');
  const name = 'mh177-backup-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd_HHmm') + '.json';
  root.createFile(name, JSON.stringify(out), 'application/json');
  const files = []; const it = root.getFiles(); while (it.hasNext()) files.push(it.next());
  files.filter(f => /^mh177-backup-/.test(f.getName())).sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(60).forEach(f => f.setTrashed(true));
  sheet_(SpreadsheetApp.getActive(), 'जानकारी', ['आखिरी अपडेट']).getRange(3, 1).setValue('आखिरी बैकअप: ' + name);
}
function daysBack_(n) { const out = []; for (let i = 0; i < n; i++) out.push(Utilities.formatDate(new Date(Date.now() - i * 864e5), 'Asia/Kolkata', 'yyyy-MM-dd')); return out; }

//  ---------- Firestore REST (आपके Google खाते की अनुमति से) ----------
function fsList_(path) {
  const out = [];
  let token = '';
  do {
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' +
      path + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : '');
    const r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (r.getResponseCode() === 404) return out;
    if (r.getResponseCode() !== 200) throw new Error(path + ': ' + r.getContentText().slice(0, 300));
    const j = JSON.parse(r.getContentText());
    (j.documents || []).forEach(d => out.push(Object.assign({ _id: d.name.split('/').pop() }, val_({ mapValue: { fields: d.fields || {} } }))));
    token = j.nextPageToken || '';
  } while (token);
  return out;
}
function val_(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val_);
  if ('mapValue' in v) { const o = {}; const f = v.mapValue.fields || {}; Object.keys(f).forEach(k => o[k] = val_(f[k])); return o; }
  return null;
}
function days_() {
  const tz = 'Asia/Kolkata', out = [];
  for (let i = 0; i < DAYS_BACK; i++) out.push(Utilities.formatDate(new Date(Date.now() - i * 864e5), tz, 'yyyy-MM-dd'));
  return out;
}
function sheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#e6f2e6'); }
  return sh;
}
//  key वाली पंक्तियाँ बदलो/जोड़ो — पुरानी तारीखों की पंक्तियाँ कभी नहीं मिटतीं
function upsert_(sh, keyCol, rows) {
  const n = sh.getLastRow();
  const keys = n > 1 ? sh.getRange(2, keyCol, n - 1, 1).getValues().map(r => String(r[0])) : [];
  const idx = {}; keys.forEach((k, i) => idx[k] = i + 2);
  const add = [];
  rows.forEach(r => { const k = String(r[keyCol - 1]); if (idx[k]) sh.getRange(idx[k], 1, 1, r.length).setValues([r]); else add.push(r); });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, add[0].length).setValues(add);
}
const ist_ = ts => ts ? Utilities.formatDate(new Date(ts), 'Asia/Kolkata', 'dd-MM-yyyy HH:mm') : '';

function syncBills_(ss) {
  const B = sheet_(ss, 'बिल', ['बिल नं', 'तारीख', 'समय', 'प्रकार', 'ग्राहक/संस्था', 'मोबाइल', 'बिलर', 'कुल', 'नकद', 'UPI', 'उधार', 'छूट', 'खरीद लागत', 'रेट बदला', 'रद्द', 'रद्द की वजह']);
  const L = sheet_(ss, 'बिल की लाइनें', ['चाबी', 'बिल नं', 'तारीख', 'प्रकार', 'सामान', 'मात्रा', 'इकाई', 'भाव', 'बोर्ड भाव', 'रकम', 'खरीद भाव', 'भाव बदला', 'मुफ्त', 'रद्द']);
  const bRows = [], lRows = [];
  days_().forEach(d => fsList_('days/' + d + '/bills').forEach(b => {
    const p = b.pay || {};
    const mode = b.mode === 'inst' ? 'संस्था' : b.mode === 'udhar' ? 'उधार खाता' : 'ग्राहक';
    bRows.push([b.no || b._id, b.date || d, ist_(b.ts), mode, b.partyName || '', b.custPhone || '', b.byName || '', b.total || 0, p.cash || 0, p.upi || 0, p.udhar || 0, b.disc || 0, b.cost || 0, b.rateChanged ? 'हाँ' : '', b.cancelled ? 'रद्द' : '', b.cancelReason || '']);
    (b.lines || []).forEach((l, i) => lRows.push([(b.no || b._id) + '#' + i, b.no || b._id, b.date || d, mode, l.name, l.qty, l.unit, l.rate, l.board, l.amt, l.cost, l.changed ? 'हाँ' : '', l.free ? 'हाँ' : '', b.cancelled ? 'रद्द' : '']));
  }));
  if (bRows.length) upsert_(B, 1, bRows);
  if (lRows.length) upsert_(L, 1, lRows);
}
function syncItems_(ss) {
  const today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  const S = sheet_(ss, 'भाव (रोज़)', ['चाबी', 'तारीख', 'सामान', 'बिक्री भाव', 'खरीद भाव', 'इकाई', 'चालू']);
  const rows = fsList_('items').map(it => [today + '|' + it._id, today, it.name, it.sale || 0, it.cost || 0, it.unit || '', it.active === false ? 'बंद' : 'चालू']);
  if (rows.length) upsert_(S, 1, rows);
  const P = sheet_(ss, 'स्टॉक (पैक्ड)', ['सामान', 'मात्रा', 'आखिरी बदलाव', 'किसने', 'क्यों']);
  const ps = fsList_('pstock'); const names = {}; fsList_('items').forEach(i => names[i._id] = i.name);
  if (ps.length) upsert_(P, 1, ps.map(x => [names[x._id] || x._id, x.qty || 0, ist_(x.ts), x.byName || '', x.last || '']));
}
function syncLedger_(ss) {
  const S = sheet_(ss, 'उधार खाता', ['चाबी', 'तारीख', 'खाता', 'उधार/जमा', 'रकम', 'तरीका', 'बिल', 'किसने']);
  const rows = fsList_('ledger').map(l => [l._id, l.date || '', l.partyName || '', l.type === 'udhar' ? 'उधार' : 'जमा', l.amt || 0, l.mode || '', l.billNo || '', l.byName || '']);
  if (rows.length) upsert_(S, 1, rows);
}
function syncDayMeta_(ss) {
  const K = sheet_(ss, 'खर्चा', ['चाबी', 'तारीख', 'किस पर', 'रकम', 'तरीका', 'किसने']);
  const G = sheet_(ss, 'गल्ला मिलान', ['तारीख', 'विवरण (JSON)']);
  const kr = [], gr = [];
  days_().forEach(d => {
    fsList_('days/' + d + '/kharch').forEach(k => kr.push([d + '|' + k._id, d, k.what || '', k.amt || 0, k.mode === 'upi' ? 'UPI' : 'नकद', k.byName || '']));
    const meta = fsList_('days/' + d + '/meta');
    if (meta.length) gr.push([d, JSON.stringify(meta)]);
  });
  if (kr.length) upsert_(K, 1, kr);
  if (gr.length) upsert_(G, 1, gr);
}

//  ---------- मंडी खरीद ----------
function syncPurchases_(ss) {
  const P = sheet_(ss, 'खरीद', ['चाबी', 'तारीख', 'समय', 'दुकान', 'मोबाइल', 'किसने', 'कुल', 'भुगतान', 'दिया', 'बाकी', 'फोटो', 'नोट']);
  const L = sheet_(ss, 'खरीद की लाइनें', ['चाबी', 'तारीख', 'दुकान', 'सामान', 'मात्रा', 'इकाई', 'भाव', 'रकम', 'पिछला भाव', 'बदलाव %']);
  const pay = { vikram: 'विक्रम जी ने दिया', galla: 'गल्ले से नकद', upi: 'कर्मचारी UPI', udhar: 'बाकी (उधार)' };
  const pr = [], lr = [];
  days_().forEach(d => {
    const q = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents:runQuery', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'purchases' }], where: { fieldFilter: { field: { fieldPath: 'date' }, op: 'EQUAL', value: { stringValue: d } } } } })
    });
    if (q.getResponseCode() !== 200) return;
    JSON.parse(q.getContentText()).filter(x => x.document).forEach(x => {
      const p = Object.assign({ _id: x.document.name.split('/').pop() }, val_({ mapValue: { fields: x.document.fields || {} } }));
      if (p.cancelled) return;
      pr.push([p._id, p.date, ist_(p.ts), p.supName || '', p.supPhone || '', p.byName || '', p.total || 0, pay[p.pay] || p.pay || '', p.paid || 0, p.due || 0,
        (p.photos || []).map(f => f.url).join(' '), p.note || '']);
      (p.lines || []).forEach((l, i) => lr.push([p._id + '#' + i, p.date, p.supName || '', l.name, l.qty, l.unit, l.rate, l.amt, l.prev || '',
        l.prev ? Math.round((l.rate - l.prev) / l.prev * 100) : '']));
    });
  });
  if (pr.length) upsert_(P, 1, pr);
  if (lr.length) upsert_(L, 1, lr);
}

//  ---------- ऐप से बिल की फोटो → Google Drive ----------
function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    // 1) फोटो भेजने वाला सच में हमारे ऐप का चालू कर्मचारी/मालिक है?
    const lk = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(b.apiKey),
      { method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: b.idToken }), muteHttpExceptions: true });
    if (lk.getResponseCode() !== 200) return out_({ ok: false, error: 'login' });
    const u = (JSON.parse(lk.getContentText()).users || [])[0];
    if (!u) return out_({ ok: false, error: 'login' });
    const isOwner = OWNER_EMAILS.indexOf(String(u.email || '').toLowerCase()) > -1 && u.emailVerified;
    const st = isOwner ? { name: 'विक्रम जी', active: true } : fsGet_('staff/' + u.localId);
    if (!st || st.active !== true) return out_({ ok: false, error: 'not-staff' });
    // 🤖 Google Gemini (मुफ़्त चाबी Script Properties में GEMINI_KEY) — बारकोड खोज / पैकेट की फोटो पढ़ना
    if (b.act === 'ai') return out_(ai_(b));
    // 2) Drive में "177 MH कैंटीन बिल फोटो / 2026-10" फ़ोल्डर
    const root = folder_(DriveApp.getRootFolder(), '177 MH कैंटीन बिल फोटो');
    const month = folder_(root, String(b.date || '').slice(0, 7) || 'बिना तारीख');
    const name = String(b.name || (b.pid + '.jpg')).replace(/[\\/:*?"<>|]/g, '_');
    const f = month.createFile(Utilities.newBlob(Utilities.base64Decode(b.b64), b.mime || 'image/jpeg', name));
    f.setDescription('खरीद ' + b.pid + ' · ' + (st.name || ''));
    return out_({ ok: true, id: f.getId(), url: f.getUrl() });
  } catch (err) {
    return out_({ ok: false, error: String(err).slice(0, 200) });
  }
}
//  ---------- 🤖 Google Gemini ----------
//    चाबी: aistudio.google.com → Get API key (मुफ़्त) → यहाँ ⚙ Project Settings → Script Properties → GEMINI_KEY
//    (चाबी कभी ऐप/GitHub में नहीं जाती — सिर्फ़ इस Script में)
function ai_(b) {
  const P = PropertiesService.getScriptProperties();
  const key = P.getProperty('GEMINI_KEY');
  if (!key) return { ok: false, error: 'no-key' };
  if (b.mode === 'ping') return { ok: true, pong: true };
  let parts, tools = null;
  if (b.mode === 'code') {
    const code = String(b.code || '').replace(/\D/g, '').slice(0, 14);
    if (code.length < 8) return { ok: false, error: 'bad-code' };
    parts = [{ text: 'Search the web (Google) for the retail product with barcode / EAN / GTIN "' + code + '" sold in India. ' +
      'Use only what you actually find for this exact barcode; if nothing reliable is found, set found=false. ' +
      'Reply with ONLY one JSON object, no other words: {"found":true,"name":"Brand Item Size (short, for a shop bill, e.g. Parle-G Biscuit 100g)","hi":"हिंदी नाम","brand":"","size":"","mrp":0,"category":"namkeen|biscuit|chocolate|drinks|dairy|rashan|masala|clean|personal|tobacco|other","source":"website name"}' }];
    tools = [{ google_search: {} }];
  } else if (b.mode === 'img') {
    parts = [{ inline_data: { mime_type: 'image/jpeg', data: String(b.b64 || '') } },
      { text: 'This is a photo of a retail product pack (front or back label) in an Indian shop. Read it. ' +
        'Reply with ONLY one JSON object: {"found":true,"name":"Brand Item Size (short, e.g. Haldiram Bhujia 200g)","hi":"हिंदी नाम","brand":"","size":"","mrp":0,"barcode":"digits if visible else empty","exp":"YYYY-MM if expiry/best-before visible else empty","category":"namkeen|biscuit|chocolate|drinks|dairy|rashan|masala|clean|personal|tobacco|other"}. ' +
        'mrp = printed MRP in rupees (number only). If not readable, use 0 / empty. If this is not a product, found=false.' }];
  } else return { ok: false, error: 'mode' };
  const models = [P.getProperty('GEMINI_MODEL') || 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  let last = '';
  for (const m of models) {
    const body = { contents: [{ role: 'user', parts: parts }], generationConfig: { temperature: 0.1 } };
    if (tools) body.tools = tools;
    const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(key),
      { method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
    const c = r.getResponseCode();
    if (c === 404) { last = 'model ' + m; continue; }
    if (c === 429) return { ok: false, error: 'quota' };
    if (c !== 200) { last = c + ' ' + r.getContentText().slice(0, 160); continue; }
    const j = JSON.parse(r.getContentText());
    const t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(function (x) { return x.text || ''; }).join('');
    const a = t.indexOf('{'), z = t.lastIndexOf('}');
    if (a < 0 || z < a) return { ok: true, found: false, model: m };
    try { const o = JSON.parse(t.slice(a, z + 1)); o.ok = true; o.model = m; return o; } catch (e) { return { ok: true, found: false, model: m }; }
  }
  return { ok: false, error: last || 'ai' };
}
function fsGet_(path) {
  const r = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + path,
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  return val_({ mapValue: { fields: JSON.parse(r.getContentText()).fields || {} } });
}
function folder_(parent, name) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

//  🤖 Claude के लिए लाइव हिसाब — हर 15 मिनट Drive में "177 MH कैंटीन बैकअप/mh177-live.json" (एक ही फाइल, ऊपर से नई)
//    विक्रम जी Claude से पूछें "अभी तक कितनी मिठाई बिकी?" → Claude यही फाइल पढ़कर बताए।
function liveJson() {
  const items = {}; fsList_('items').forEach(i => items[i._id] = i);
  const CAT = it => it.cat === 'mithai' ? 'मिठाई-पनीर' : it.cat === 'fast' ? 'नाश्ता' : it.cat === 'sabzi' ? 'सब्ज़ी-फल' :
    ({ tob: 'कोड वाले (गुटखा/सिगरेट)', dairy: 'दूध-दही', ice: 'आइसक्रीम', drinks: 'ड्रिंक' })[it.sub] || 'किराना';
  const day = d => {
    const bills = fsList_('days/' + d + '/bills').filter(b => !b.cancelled && !b.pending);
    const r = { date: d, bills: bills.length, total: 0, cash: 0, upi: 0, udhar: 0, profit: 0, transfer: 0, byCategory: {}, byItem: {}, byBiller: {}, warnings: [], lastBillAt: '' };
    let last = 0;
    bills.forEach(b => {
      const inst = b.mode === 'inst', p = b.pay || {};
      if (inst) r.transfer += +b.total || 0; else { r.total += +b.total || 0; r.cash += +p.cash || 0; r.upi += +p.upi || 0; r.udhar += +p.udhar || 0; }
      r.byBiller[b.byName || '?'] = (r.byBiller[b.byName || '?'] || 0) + (+b.total || 0);
      (b.warn || []).forEach(w => r.warnings.push('बिल ' + b.no + ' (' + (b.byName || '') + '): ' + w));
      if (b.rateChanged) r.warnings.push('बिल ' + b.no + ' (' + (b.byName || '') + '): भाव बदला');
      last = Math.max(last, +b.ts || 0);
      (b.lines || []).forEach(l => {
        const it = items[l.id] || {}, c = inst ? 'संस्था/ट्रांसफर' : CAT(it), nm = it.name || l.realName || l.name;
        r.byCategory[c] = Math.round(((r.byCategory[c] || 0) + (+l.amt || 0)) * 100) / 100;
        const x = r.byItem[nm] = r.byItem[nm] || { qty: 0, amt: 0, unit: l.unit }; x.qty = Math.round((x.qty + (+l.qty || 0)) * 1000) / 1000; x.amt = Math.round((x.amt + (+l.amt || 0)) * 100) / 100;
        if (!inst) r.profit += (+l.amt || 0) - (+l.cost || 0) * (+l.qty || 0);
      });
    });
    r.profit = Math.round(r.profit); r.lastBillAt = ist_(last);
    return r;
  };
  const days = daysBack_(7).map(d => { try { return day(d); } catch (e) { return { date: d, error: String(e) }; } });
  const out = { app: '177 MH वेट कैंटीन', note: 'रकम ₹ में; profit = बिक्री − लागत (जिन सामान की लागत डली है)', updatedAt: ist_(Date.now()), today: days[0], last7days: days };
  const root = folder_(DriveApp.getRootFolder(), '177 MH कैंटीन बैकअप');
  const it = root.getFilesByName('mh177-live.json');
  if (it.hasNext()) it.next().setContent(JSON.stringify(out, null, 1)); else root.createFile('mh177-live.json', JSON.stringify(out, null, 1), 'application/json');
}
// ===== कोड यहीं खत्म — इसके नीचे कुछ नहीं होना चाहिए =====
