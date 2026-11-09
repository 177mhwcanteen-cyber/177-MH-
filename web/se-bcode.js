/* 177 MH — 🏷️ बारकोड पहरा (window.SBC) — पक्का नियम: docs/बारकोड-पहरा-प्रॉम्प्ट.txt · जाँच: tests/bcode.py
   जिन सामान पर कंपनी का बारकोड नहीं → बड़ी फोटो + स्टॉक के साथ सूची → लेबल छापें → लगाने वाला एक लेबल स्कैन करे = ✅ पक्का।
   स्कैन/हाथ से जोड़ी पंक्तियों और छपे लेबल का हिसाब; छूट वाले और "बारकोड है पर स्कैन नहीं होते" वाले सामान अलग से।
   पुराना डेटा नहीं बदलता — सिर्फ़ नए खाने (bcOk, bcAI, bcHint, noLbl) और days/<तारीख>/meta/bcode (s_/t_/ok_/bc_<id>)। */
(()=>{
const SBC=window.SBC={};
const LSb={get:(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const dAdd=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return today(x)};
const NM=it=>typeof shortNm==="function"?shortNm(it):SE.capNm(it.short||it.name||"");
const OWN=c=>/^2\d{12}$/.test(c);
const eanOk=c=>{if(!/^\d{13}$/.test(c))return false;let t=0;for(let i=0;i<12;i++)t+=(+c[i])*(i%2?3:1);return (10-t%10)%10===+c[12]};
const isOwn=()=>!!(S.isOwner||S.demo);
const META=d=>"days/"+d+"/meta/bcode";

/* ---------- पहचान ---------- */
SBC.codes=it=>String(it&&it.barcode||"").split(/[,\s]+/).map(x=>x.trim()).filter(Boolean);
SBC.co=it=>SBC.codes(it).find(c=>/^\d{8,14}$/.test(c)&&!OWN(c))||"";
SBC.ownCodes=it=>{const a=SBC.codes(it).filter(c=>!/^\d{8,14}$/.test(c)||OWN(c));const k=window.SF&&SF.itemCode?SF.itemCode(it):"";if(k&&!a.includes(k))a.push(k);return a};
const OK=LSb.get("sbc_ok",{}),BC=LSb.get("sbc_bc",{}),PR=LSb.get("sbc_pr",{}),PRD=LSb.get("sbc_prd",{});
/* 🖨️ छप गए (विक्रम जी, 09-11-2026): छापते ही सामान "बाकी" से "छप गए" सूची में; ↩ से वापस। मालिक: items.bcPr · साथी: फोन + meta pr_<id> */
SBC.okOf=it=>{if(!it)return null;const x=it.bcOk||OK[it.id];return x&&!x.undo?x:null};
SBC.cand=it=>!!it&&it.active!==false&&!it.virtual&&!it.pending&&it.id!=="xyz"&&(it.unit==="pc"||it.unit==="pk")&&!["fast","mela"].includes(typeof mcat==="function"?mcat(it):it.cat)&&!it.noLbl;
SBC.need=it=>SBC.cand(it)&&!SBC.co(it)&&!BC[it.id]&&!SBC.okOf(it);
SBC.prOf=it=>{if(!it)return null;const a=it.bcPr&&it.bcPr.ts?it.bcPr:null,b=PRD[it.id]||null;const x=!a?b:!b?a:(b.ts>a.ts?b:a);return x&&!x.undo?x:null};
SBC.todo=it=>SBC.need(it)&&!SBC.prOf(it);
SBC.printedNeed=it=>SBC.need(it)&&!!SBC.prOf(it);
SBC.list=()=>(S.items||[]).filter(SBC.need);
SBC.todoList=()=>(S.items||[]).filter(SBC.todo);
SBC.prList=()=>(S.items||[]).filter(SBC.printedNeed).sort((a,b)=>(SBC.prOf(b).ts||0)-(SBC.prOf(a).ts||0));
SBC.okList=()=>(S.items||[]).filter(i=>SBC.cand(i)&&!SBC.co(i)&&!BC[i.id]&&SBC.okOf(i)).sort((a,b)=>((SBC.okOf(b)||{}).ts||0)-((SBC.okOf(a)||{}).ts||0));
SBC.disc=it=>+it.mrp>0&&+it.sale>0&&+it.sale<+it.mrp?Math.round((+it.mrp-+it.sale)*100)/100:0;
SBC.stock=it=>{try{const v=typeof stockLeft==="function"?stockLeft(it.id):null;if(v!=null)return v;const p=S.pstock&&S.pstock[it.id];return p&&p.qty!=null?+p.qty:null}catch(e){return null}};
/* लेबल कितने: स्टॉक, न हो तो GitHub खेप की ओपनिंग गिनती (बिलिंग चालू से पहले), न हो तो 5 */
const CNT={};SBC.cnt=CNT;
const defN=it=>{const s=SBC.stock(it),c=+CNT[it.id]||0;return s>0?Math.min(200,Math.round(s)):c>0?Math.min(200,Math.round(c)):5};
async function loadCnt(){try{if(window.SPK&&SPK.counts&&S.isOwner&&!S.demo){const L=await SPK.counts();L.forEach(c=>{CNT[c.itemId]=+c.qty||0})}}catch(e){}}
/* 📍 रैक: "6-4" → "6" (SRK का पुराना-नया नंबर भी) */
const rkOf=it=>{const r=window.SRK&&SRK.canon?SRK.canon(it.rack):String(it.rack||"").toUpperCase();return String(r||"").split("-")[0]};
SBC.rkOf=rkOf;
const sortL=L=>L.sort((a,b)=>(SBC.stock(b)||0)-(SBC.stock(a)||0)||(String(b.id)>String(a.id)?1:-1));

/* ---------- दिन का दस्तावेज़ (गिनती) ---------- */
SBC.mem={};/* डेमो/टेस्ट: तारीख → {key:val} */
let pend={},tmr=0;
function put(obj,now){const d=today();
  if(S.demo||!S.db){const m=SBC.mem[d]||(SBC.mem[d]={});for(const [k,v] of Object.entries(obj))m[k]=v&&v.__inc!=null?(+m[k]||0)+v.__inc:typeof v==="number"&&/^[st]_/.test(k)?(+m[k]||0)+v:v;return}
  for(const [k,v] of Object.entries(obj)){if(typeof v==="number"&&/^[st]_/.test(k))pend[k]=(pend[k]||0)+v;else pend[k]=v}
  clearTimeout(tmr);tmr=setTimeout(flush,now?10:20000)}
function flush(){const p=pend;pend={};if(!Object.keys(p).length||!S.db||S.demo)return;const o={};
  for(const [k,v] of Object.entries(p))o[k]=typeof v==="number"&&/^[st]_/.test(k)?SE.inc(v):v;o.ts=Date.now();
  S.db.doc(META(today())).set(o,{merge:true}).catch(()=>{Object.entries(p).forEach(([k,v])=>{if(typeof v==="number")pend[k]=(pend[k]||0)+v;else if(!(k in pend))pend[k]=v})})}
window.addEventListener("pagehide",flush);document.addEventListener("visibilitychange",()=>{if(document.hidden)flush()});
SBC.onBill=function(lines){const o={};(lines||[]).forEach(l=>{if(!l.id||!(l.unit==="pc"||l.unit==="pk"))return;const q=Math.max(0,Math.round(+l.qty||0)),sc=Math.min(q,Math.round(+l.sc||0));
  if(sc)o["s_"+l.id]=(o["s_"+l.id]||0)+sc;if(q-sc)o["t_"+l.id]=(o["t_"+l.id]||0)+(q-sc)});if(Object.keys(o).length)put(o)};
async function loadDays(n){const out=[];const d0=today();
  for(let k=0;k<n;k++){const d=dAdd(d0,-k);if(S.demo||!S.db){out.push({d,v:{...(SBC.mem[d]||{})}});continue}
    out.push(S.db.doc(META(d)).get().then(s=>({d,v:s.exists?s.data():{}})).catch(()=>({d,v:{}})))}
  return Promise.all(out)}

/* ---------- ✅ पक्का / बारकोड जोड़ना ---------- */
async function itemUp(id,p){const it=item(id);if(!it)return false;
  if(S.demo||!S.db){Object.assign(it,p);return true}
  if(!S.isOwner)return false;try{await S.db.doc("items/"+id).update(p);Object.assign(it,p);return true}catch(e){return false}}
SBC.mark=async function(id,how){const it=item(id);if(!it)return;const r={ts:Date.now(),byName:biller()||"",how:how||"tap"};
  OK[id]=r;LSb.set("sbc_ok",OK);
  if(isOwn())await itemUp(id,{bcOk:r});else put({["ok_"+id]:r},1);
  SBC.refresh()};
SBC.setPr=async function(id,n,undo){const it=item(id);if(!it)return;const r=undo?{ts:Date.now(),undo:true,byName:biller()||""}:{ts:Date.now(),n:+n||0,byName:biller()||""};
  PRD[id]=r;LSb.set("sbc_prd",PRD);
  if(isOwn())await itemUp(id,{bcPr:undo?null:r});else put({["pr_"+id]:r},1);
  SBC.refresh()};
SBC.unOk=async function(id){const it=item(id);if(!it)return;delete OK[id];LSb.set("sbc_ok",OK);if(isOwn())await itemUp(id,{bcOk:null});else put({["ok_"+id]:{undo:true,ts:Date.now()}},1);SBC.refresh()};
SBC.attach=async function(id,code){const it=item(id);code=String(code||"").replace(/\s+/g,"");if(!it||!/^\d{8,14}$/.test(code)){toast("यह बारकोड सही नहीं लगता");return false}
  const o=findByCode(code);if(o&&o.id!==id){toast("यह बारकोड पहले से "+NM(o)+" में है");return false}
  if(SBC.codes(it).includes(code)){toast("यह बारकोड पहले से लगा है");return true}
  BC[id]=code;LSb.set("sbc_bc",BC);
  if(isOwn()){const ok=await itemUp(id,{barcode:[...SBC.codes(it),code].join(",")});if(!ok){toast("सेव नहीं हुआ");return false}}
  else put({["bc_"+id]:code},1);
  toast("✓ "+NM(it)+" — कंपनी बारकोड "+code+" जुड़ गया");SBC.refresh();return true};
/* मालिक का ऐप: साथियों के ✅ और स्कैन किए बारकोड items में लिखे (पिछले 14 दिन) */
SBC.sync=async function(){if(!S.isOwner||S.demo||!S.db)return;const D=await loadDays(14);let n=0;
  for(const {v} of D)for(const [k,x] of Object.entries(v||{})){
    if(k.startsWith("ok_")){const id=k.slice(3),it=item(id);if(it&&x&&x.ts){if(x.undo){if(it.bcOk&&(it.bcOk.ts||0)<x.ts){await itemUp(id,{bcOk:null});n++}}else if(!it.bcOk){await itemUp(id,{bcOk:x});n++}}}
    else if(k.startsWith("pr_")){const id=k.slice(3),it=item(id);if(it&&x&&x.ts&&(!it.bcPr||(it.bcPr.ts||0)<x.ts)&&(it.bcPr||!x.undo)){await itemUp(id,{bcPr:x.undo?null:x});n++}}
    else if(k.startsWith("bc_")){const id=k.slice(3),it=item(id),c=String(x||"");if(it&&/^\d{8,14}$/.test(c)&&!SBC.codes(it).includes(c)){const o=findByCode(c);if(!o||o.id===id){await itemUp(id,{barcode:[...SBC.codes(it),c].join(",")});n++}}}}
  return n};
let synced=0;setInterval(()=>{if(!synced&&typeof S!=="undefined"&&S.isOwner&&S.items&&S.items.length&&S.db&&!S.demo){synced=1;SBC.sync().catch(()=>{})}},5000);
/* पिछले 14 दिन के ✅ (दूसरे फोन वाले) — सूची खोलने पर */
async function pullOk(){if(S.isOwner)return;const D=await loadDays(14);D.forEach(({v})=>Object.entries(v||{}).forEach(([k,x])=>{if(k.startsWith("ok_")&&(!OK[k.slice(3)]||(x&&x.ts>(OK[k.slice(3)].ts||0))))OK[k.slice(3)]=x;if(k.startsWith("pr_")&&x&&(!PRD[k.slice(3)]||x.ts>(PRD[k.slice(3)].ts||0)))PRD[k.slice(3)]=x;if(k.startsWith("bc_")&&!BC[k.slice(3)])BC[k.slice(3)]=x}));LSb.set("sbc_ok",OK);LSb.set("sbc_bc",BC);LSb.set("sbc_prd",PRD)}

/* ---------- स्कैन ---------- */
SBC.arm=null;
SBC.seen=function(it,code){if(!it||!SBC.cand(it)||SBC.okOf(it)||SBC.co(it))return;code=String(code||"");
  if(OWN(code)||SBC.ownCodes(it).includes(code)){SBC.mark(it.id,"scan");toast("✅ "+NM(it)+" का लेबल पढ़ा गया — पक्का")}};
SBC.scan=function(code){const a=SBC.arm;if(!a)return false;if(!$("#sbcSheet")){SBC.arm=null;return false}
  code=String(code||"").trim();const it=item(a.id);if(!it){SBC.arm=null;return false}
  if(a.kind==="ok"){const f=findByCode(code);beep(!!f&&f.id===a.id);
    if(f&&f.id===a.id){SBC.arm=null;SBC.mark(a.id,"scan");toast("✅ "+NM(it)+" — लेबल सही पढ़ा गया, पक्का");return true}
    toast(f?"⚠ यह "+NM(f)+" का बारकोड है — "+NM(it)+" का लेबल स्कैन करें":"⚠ यह बारकोड किसी सामान में नहीं — "+NM(it)+" का लेबल स्कैन करें");return true}
  if(a.kind==="attach"){beep(/^\d{8,14}$/.test(code));SBC.arm=null;const nw=$("#sbcSheet").dataset.new;SBC.attach(a.id,code).then(ok=>{if(ok&&nw)closeSheet()});return true}
  return false};

/* ---------- छपाई का हिसाब (हर फोन) ---------- */
if(window.SL&&SL.print&&!SL.print._sbc){const f=SL.print;SL.print=async function(rows){const src=(rows||SL.list()).map(r=>({id:r.id,n:Math.round(+r.n)||0}));const t=await f.apply(this,arguments);
  if(t>0){src.forEach(r=>{if(r.n>0)PR[r.id]=(PR[r.id]||0)+r.n});LSb.set("sbc_pr",PR);
    const mv=src.filter(r=>r.n>0&&SBC.todo(item(r.id)));for(const r of mv)await SBC.setPr(r.id,r.n);
    if(mv.length)toast("🖨️ "+mv.length+" सामान \"छप गए\" सूची में — चिपकाकर ✅ दबाएँ, गलती हो तो ↩");SBC.refresh()}return t};SL.print._sbc=1}
let P30=null;
async function loadPrints(){if(P30)return P30;let m={...PR};/* साथी: अपने फोन की छपाई · मालिक: सबकी (labelLog, 30 दिन) */
  if(S.isOwner&&!S.demo&&S.db){try{const q=await S.db.collection("labelLog").where("ts",">=",Date.now()-30*864e5).get();m={};
    q.docs.forEach(d=>{const x=d.data()||{};(x.items||[]).forEach(r=>{if(r&&r.id)m[r.id]=(m[r.id]||0)+(+r.n||0)});if(x.itemId)m[x.itemId]=(m[x.itemId]||0)+(+x.copies||0)})}catch(e){}}
  P30=m;setTimeout(()=>{P30=null},120000);return m}

/* ---------- 🤖 AI से छाँटें ---------- */
SBC.ai=async function(){if(!isOwn()){toast("यह सिर्फ़ विक्रम जी के फोन पर");return}
  if(!SE.aiReady||!SE.aiReady()){toast("🔑 पहले ⚙️ में AI चाबी डालें (मुफ़्त Gemini)");return}
  const L=SBC.list().filter(i=>!i.bcAI).slice(0,25);if(!L.length){toast("सब सामान AI से छाँटे जा चुके");return}
  V.busy="🤖 "+L.length+" सामान इंटरनेट पर खोज रहे हैं… 20-60 सेकंड";draw();
  const r=await SE.ai({mode:"bcfind",items:L.map(i=>({id:i.id,n:i.name,b:i.brand||"",s:i.size||""}))});V.busy="";
  if(!r||!r.ok||!Array.isArray(r.r)){toast(r&&r.error==="quota"?"⚠ आज की मुफ़्त AI सीमा पूरी — कल दबाएँ":r&&r.error==="mode"?"⚠ AI चाबी विक्रम जी के फोन में डालें (Apps Script यह नहीं करता)":"⚠ AI से जवाब नहीं आया — थोड़ी देर बाद");draw();return}
  let p=0,l=0;for(const x of r.r){const it=item(x&&x.id);if(!it||!L.includes(it))continue;const k=x.k==="pack"?"pack":"loose";const up={bcAI:k};
    const e=String(x.ean||"").replace(/\D/g,"");if(k==="pack"&&eanOk(e)&&!findByCode(e))up.bcHint=e;await itemUp(it.id,up);k==="pack"?p++:l++}
  toast("🤖 "+p+" कंपनी पैकेट · "+l+" खुला/दुकान का");draw()};

/* ---------- UI ---------- */
const V={tab:"need",q:"",rk:"",more:0,busy:""};
const tabList=()=>V.tab==="pr"?SBC.prList():V.tab==="ok"?SBC.okList():sortL(SBC.todoList());
const ph=it=>`<div class="sbc-ph">${tileHTML(it)}</div>`;
const priceTxt=it=>{const d=SBC.disc(it);return +it.sale>0?`<b>${rs(+it.sale)}</b>${d?` <s>${rs(+it.mrp)}</s> <em class="sbc-off">${rs(d)} छूट</em>`:""}`:"<em>भाव नहीं</em>"};
const stTxt=it=>{const s=SBC.stock(it);return s==null?"📦 स्टॉक ?":s>0?`📦 स्टॉक <b>${Math.round(s*100)/100}</b> पीस`:"📦 स्टॉक 0"};
function card(it,pr){const id=esc(it.id),n=defN(it),p=pr[it.id]||0,armed=SBC.arm&&SBC.arm.id===it.id;
  return `<div class="sbc-c${armed?" arm":""}" data-sbcid="${id}">${ph(it)}
    <div class="sbc-nm">${esc(NM(it))}</div><div class="sbc-pr">${priceTxt(it)}</div>
    <div class="sbc-st">${stTxt(it)}${p?` · 🖨️ ${p} छपे`:""}${it.code?` · #${esc(it.code)}`:""}</div>
    ${it.bcAI==="pack"?`<div class="sbc-ai">🤖 कंपनी पैकेट लगता है${it.bcHint?` · AI: <code>${esc(it.bcHint)}</code>`:""}</div>`:it.bcAI==="loose"?`<div class="sbc-ai">🤖 खुला/दुकान का — अपना लेबल</div>`:""}
    ${armed?`<div class="sbc-arm">${SBC.arm.kind==="ok"?"📷 अब इसका एक लगा हुआ लेबल स्कैन करें":"📷 अब पैकेट का बारकोड स्कैन करें"}<span><button type="button" data-sbccam>📷 कैमरा</button>${SBC.arm.kind==="ok"?`<button type="button" data-sbcokh="${id}">बिना स्कैन ✅</button>`:""}<button type="button" data-sbcunarm>रद्द</button></span></div>`:
    V.tab==="pr"&&SBC.prOf(it)?`<div class="sbc-prt">🖨️ छपे ${SBC.prOf(it).n||""} · ${ftime(SBC.prOf(it).ts)}${SBC.prOf(it).byName?" · "+esc(SBC.prOf(it).byName):""}</div><div class="sbc-b"><button type="button" class="pri" data-sbcok="${id}">✅ लग गया</button><button type="button" data-sbcback="${id}">↩ वापस (फिर छापना है)</button></div>`:
    V.tab==="ok"?`<div class="sbc-prt">✅ ${esc((SBC.okOf(it)||{}).byName||"")}${SBC.okOf(it)&&SBC.okOf(it).ts?" · "+ftime(SBC.okOf(it).ts):""}</div><div class="sbc-b"><button type="button" data-sbcunok="${id}">↩ गलती से — वापस छपे में</button></div>`:
    `<div class="sbc-b"><button type="button" class="pri" data-sbcadd="${id}" data-n="${n}">🏷️ ${n} लेबल</button><button type="button" data-sbcok="${id}">✅ लग गया</button></div>
    <div class="sbc-b2"><button type="button" data-sbcpr="${id}" data-n="${n}" title="ऐप के बाहर/मशीन से छापा">🖨️ छप गया</button><button type="button" data-sbcatt="${id}">📷 कंपनी बारकोड है</button>${it.bcHint&&isOwn()?`<button type="button" data-sbchint="${id}">✓ AI वाला लगाएँ</button>`:""}${isOwn()?`<button type="button" data-sbcno="${id}" title="इस पर लेबल नहीं चाहिए">🚫</button>`:""}</div>`}</div>`}
function curList(noRk){let L=tabList();const q=V.q.trim().toLowerCase();
  if(q)L=L.filter(i=>((i.name||"")+" "+(i.short||"")+" "+(i.hi||"")+" "+(i.code||"")).toLowerCase().includes(q));
  if(V.rk&&!noRk)L=L.filter(i=>rkOf(i)===(V.rk==="—"?"":V.rk));return L}
SBC.curList=curList;
/* 📍 रैक-वार पट्टी: एक रैक के सारे लेबल एक साथ छापें-चिपकाएँ */
function rkBar(){const all=curList(1),m={};all.forEach(i=>{const r=rkOf(i)||"—";m[r]=(m[r]||0)+1});
  const ks=Object.keys(m).sort((a,b)=>(a==="—")-(b==="—")||(+a||999)-(+b||999)||a.localeCompare(b));if(ks.length<2&&!V.rk)return "";
  return `<div class="sbc-rk" role="group" aria-label="रैक से छाँटें"><button type="button" data-sbcrk="" aria-pressed="${!V.rk}">सब <b>${all.length}</b></button>${ks.map(r=>`<button type="button" data-sbcrk="${esc(r==="—"?"":r)}"${r==="—"?" data-none=1":""} aria-pressed="${V.rk===r}">${r==="—"?"बिना रैक":"📍 "+esc(r)} <b>${m[r]}</b></button>`).join("")}</div>`}
async function needHTML(){const pr=await loadPrints();const L=curList();const q=V.q.trim();
  if(!L.length)return rkBar()+`<div class="sbc-empty">${q||V.rk?"यहाँ कोई सामान नहीं":V.tab==="pr"?"🖨️ अभी कोई छपा लेबल चिपकाने को बाकी नहीं":V.tab==="ok"?"अभी कोई लेबल पक्का नहीं हुआ":"🎉 छापने को कुछ बाकी नहीं — सब छप गए या लग गए"}</div>`;
  if(V.tab!=="need"){const max=120+V.more;return `${rkBar()}<p class="note sbc-nt">${V.tab==="pr"?"🖨️ ये छप चुके हैं — उसी खाने में चिपकाएँ, फिर ✅। ग़लती से छापे/दोबारा छापने हैं तो ↩।":"✅ इन पर लेबल लग चुका। ग़लती से दबाया हो तो ↩।"}</p><div class="sbc-g">${L.slice(0,max).map(i=>card(i,pr)).join("")}</div>${L.length>max?`<button type="button" class="lnk sbc-more" data-sbcmore>और ${L.length-max} दिखाएँ ›</button>`:""}`}
  const pack=L.filter(i=>i.bcAI==="pack"),rest=L.filter(i=>i.bcAI!=="pack"),max=120+V.more;
  const grid=(A)=>`<div class="sbc-g">${A.slice(0,max).map(i=>card(i,pr)).join("")}</div>${A.length>max?`<button type="button" class="lnk sbc-more" data-sbcmore>और ${A.length-max} दिखाएँ ›</button>`:""}`;
  return `${rkBar()}${V.rk?`<p class="note sbc-nt">📍 रैक ${esc(V.rk)}: इन ${L.length} सामान का बारकोड तैयार है — "🏷️ सब लिस्ट में" दबाकर छापें, इसी रैक में चिपकाएँ, फिर हर सामान पर "✅ लग गया"।</p>`:""}${pack.length?`<h4 class="sbc-h">📦 कंपनी पैकेट (${pack.length}) — एक बार पैकेट का बारकोड स्कैन करें, अपने-आप जुड़ेगा</h4>${grid(pack)}`:""}
    ${rest.length?`<h4 class="sbc-h">🏷️ अपना लेबल लगाएँ (${rest.length}) — छापें, चिपकाएँ, फिर "✅ लग गया"</h4>${grid(rest)}`:""}`}
const row=(it,txt,btn)=>`<div class="sbc-r">${tileHTML(it)}<div><b>${esc(NM(it))}</b><span>${txt}</span></div>${btn||""}</div>`;
async function repHTML(){const [D,pr]=await Promise.all([loadDays(7),loadPrints()]);const S7={};let ts=0,tt=0,ds=0,dt=0;
  D.forEach(({d,v},k)=>Object.entries(v||{}).forEach(([key,x])=>{const m=/^([st])_(.+)$/.exec(key);if(!m)return;const o=S7[m[2]]||(S7[m[2]]={s:0,t:0});o[m[1]]+=+x||0;
    if(m[1]==="s")ts+=+x||0;else tt+=+x||0;if(k===0){if(m[1]==="s")ds+=+x||0;else dt+=+x||0}}));
  const pct=(a,b)=>a+b?Math.round(a/(a+b)*100)+"%":"—";const act=(S.items||[]).filter(SBC.cand);
  const sold=i=>(S7[i.id]||{s:0,t:0});const tot=i=>sold(i).s+sold(i).t;
  const discL=act.filter(i=>SBC.disc(i)>0).sort((a,b)=>tot(b)-tot(a)||SBC.disc(b)-SBC.disc(a));
  const handL=act.filter(i=>SBC.co(i)&&sold(i).t>0&&sold(i).s<sold(i).t).sort((a,b)=>(SBC.disc(b)>0)-(SBC.disc(a)>0)||sold(b).t-sold(a).t);
  const noScan=act.filter(i=>pr[i.id]>0&&!SBC.co(i)&&sold(i).s===0&&sold(i).t>0).sort((a,b)=>sold(b).t-sold(a).t);
  const addB=(i,mrp)=>`<button type="button" class="sbc-sb" data-sbcadd="${esc(i.id)}" data-n="${defN(i)}"${mrp?" data-mrp=1":""}>🏷️ ${defN(i)}</button>`;
  const sec=(t,note,A,f)=>A.length?`<h4 class="sbc-h">${t} (${A.length})</h4><p class="note sbc-nt">${note}</p>${A.slice(0,60).map(f).join("")}${A.length>60?`<p class="note">…और ${A.length-60}</p>`:""}`:"";
  return `<div class="sbc-k"><div><span>आज स्कैन से</span><b>${pct(ds,dt)}</b></div><div><span>7 दिन स्कैन से</span><b>${pct(ts,tt)}</b></div><div><span>बारकोड चाहिए</span><b>${SBC.list().length}</b></div><div><span>30 दिन छपे लेबल</span><b>${Object.values(pr).reduce((a,b)=>a+b,0)}</b></div></div>
    ${sec("💸 छूट वाले सामान","इन पर अपना भाव-लेबल लगाएँ (MRP कटा + अपना भाव) — ग्राहक को छूट दिखेगी। ज़्यादा बिकने वाले पहले।",discL,i=>row(i,`MRP ${rs(+i.mrp)} → ${rs(+i.sale)} · ${rs(SBC.disc(i))} छूट${tot(i)?` · 7 दिन ${tot(i)} बिके`:""}${pr[i.id]?` · 🖨️ ${pr[i.id]}`:""}`,addB(i,1)))}
    ${sec("📦 कंपनी बारकोड है, पर हाथ से जोड़े जा रहे","पैकेट का बारकोड शायद ऐप में नहीं (नया पैकेट/नया साइज़) — एक बार पैकेट स्कैन करके जोड़ें। छूट वाले सबसे ऊपर।",handL,i=>row(i,`7 दिन: स्कैन ${sold(i).s} · हाथ से ${sold(i).t}${SBC.disc(i)?` · 💸 ${rs(SBC.disc(i))} छूट`:""}`,`<button type="button" class="sbc-sb" data-sbcatt="${esc(i.id)}">📷 जोड़ें</button>`))}
    ${sec("🖨️ छपे पर स्कैन नहीं हुए","लेबल छपे पर बिलिंग में स्कैन नहीं हुए — लेबल लगे नहीं या पढ़े नहीं जाते। एक बार जाँच लें।",noScan,i=>row(i,`🖨️ ${pr[i.id]} छपे · 7 दिन हाथ से ${sold(i).t}`,addB(i)))}
    ${!discL.length&&!handL.length&&!noScan.length?`<div class="sbc-empty">✅ सब ठीक — कोई ख़ास काम नहीं</div>`:""}
    <p class="note">बिना छूट वाले कंपनी-बारकोड सामान पर अलग लेबल ज़रूरी नहीं — कंपनी का बारकोड ही चलेगा।</p>`}
async function draw(){const sh=$("#sbcSheet");if(!sh||sh.dataset.new)return;const b=sh.querySelector(".sbc-body");const n=SBC.list().length;
  sh.querySelector(".sbc-tabs").innerHTML=`<button type="button" data-sbctab="need" aria-pressed="${V.tab==="need"}">🏷️ छापने बाकी <b>${SBC.todoList().length}</b></button><button type="button" data-sbctab="pr" aria-pressed="${V.tab==="pr"}">🖨️ छप गए <b>${SBC.prList().length}</b></button><button type="button" data-sbctab="ok" aria-pressed="${V.tab==="ok"}">✅ लग गए <b>${SBC.okList().length}</b></button>${isOwn()?`<button type="button" data-sbctab="rep" aria-pressed="${V.tab==="rep"}">📊 स्कैन-छपाई हिसाब</button>`:""}`;
  const tools=sh.querySelector(".sbc-tools");tools.hidden=V.tab==="rep";const nT=SBC.todoList().length;
  tools.innerHTML=`<input id="sbcQ" type="search" placeholder="🔍 नाम / कोड" value="${esc(V.q)}" aria-label="सामान खोजें">`+(V.tab==="need"?`<button type="button" class="pri" data-sbcall ${nT?"":"disabled"}>🏷️ ${V.rk?(V.rk==="—"?"बिना रैक वाले":"रैक "+esc(V.rk)+" के"):"सब"} लिस्ट में</button>${isOwn()?`<button type="button" data-sbcai>🤖 AI से छाँटें</button>`:""}`:"")+(V.busy?`<div class="sbc-busy">${esc(V.busy)}</div>`:"");
  const html=V.tab==="rep"&&isOwn()?await repHTML():await needHTML();if($("#sbcSheet"))b.innerHTML=html;
  const c=SL&&SL.count?SL.count():0;sh.querySelector(".sbc-foot").innerHTML=c?`<button type="button" class="big" data-sbcgo>🖨️ लेबल टैब में छापें (${c} लेबल लिस्ट में)</button>`:""}
SBC.refresh=function(){if($("#sbcSheet"))draw();if(S.tab==="set"&&$("#sbcCard"))$("#sbcCard").outerHTML=SBC.settingsHTML();const bar=$("#sbcBar");if(bar)bar.outerHTML=barHTML()};
function addLbl(id,n,mrp){const it=item(id);if(!it||!window.SL)return;const o=mrp||SBC.disc(it)>0?{mrp:1}:{};const k=SL.add(id,n,o);toast("🏷️ "+NM(it)+" · "+k+" लेबल लिस्ट में")}
SBC.open=function(tab,rk){if(tab)V.tab=tab;V.more=0;if(rk!=null)V.rk=String(rk);loadCnt().then(()=>{if(Object.keys(CNT).length)draw()});
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px sbc" id="sbcSheet" role="dialog" aria-label="बारकोड पहरा"><div class="grab"></div>
  <div class="sh-head"><h3 style="font-size:17px">🏷️ बारकोड पहरा</h3><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <div class="sbc-tabs seg"></div><div class="sbc-tools"></div><div class="sbc-body"><p class="note">⏳…</p></div><div class="sbc-foot"></div></div></div>`;
  const sh=$("#sheet");
  sh.onclick=async e=>{const t=e.target;if(t.matches("[data-close]")){SBC.arm=null;closeSheet();return}const g=s=>t.closest(s);let b;
    if((b=g("[data-sbctab]"))){V.tab=b.dataset.sbctab;draw();return}
    if((b=g("[data-sbcadd]"))){addLbl(b.dataset.sbcadd,+b.dataset.n||1,!!b.dataset.mrp);draw();return}
    if((b=g("[data-sbcrk]"))){V.rk=b.dataset.none?"—":b.dataset.sbcrk;V.more=0;draw();return}
    if(g("[data-sbcall]")){const L=curList();L.forEach(i=>SL.add(i.id,defN(i),SBC.disc(i)>0?{mrp:1}:{}));toast("🏷️ "+L.length+" सामान लिस्ट में — नीचे 🖨️ दबाएँ");draw();return}
    if((b=g("[data-sbcok]"))){SBC.arm={id:b.dataset.sbcok,kind:"ok"};draw();return}
    if((b=g("[data-sbcpr]"))){await SBC.setPr(b.dataset.sbcpr,+b.dataset.n||0);toast("🖨️ छप गए सूची में — ↩ से वापस");return}
    if((b=g("[data-sbcback]"))){await SBC.setPr(b.dataset.sbcback,0,true);toast("↩ वापस \"छापने बाकी\" में");return}
    if((b=g("[data-sbcunok]"))){await SBC.unOk(b.dataset.sbcunok);toast("↩ वापस \"छप गए\" में");return}
    if((b=g("[data-sbcatt]"))){SBC.arm={id:b.dataset.sbcatt,kind:"attach"};if(V.tab==="rep"){V.tab="need";const it=item(SBC.arm.id);toast("📷 "+(it?NM(it):"")+" का पैकेट स्कैन करें")}draw();return}
    if((b=g("[data-sbcokh]"))){SBC.arm=null;await SBC.mark(b.dataset.sbcokh,"tap");toast("✅ पक्का (बिना स्कैन)");return}
    if(g("[data-sbcunarm]")){SBC.arm=null;draw();return}
    if(g("[data-sbccam]")){if(typeof camOn==="function")camOn();return}
    if((b=g("[data-sbchint]"))){const it=item(b.dataset.sbchint);if(it&&it.bcHint)await SBC.attach(it.id,it.bcHint);return}
    if((b=g("[data-sbcno]"))){await itemUp(b.dataset.sbcno,{noLbl:true});toast("🚫 इस पर लेबल नहीं माँगेंगे");draw();return}
    if(g("[data-sbcai]")){SBC.ai();return}
    if(g("[data-sbcmore]")){V.more+=120;draw();return}
    if(g("[data-sbcgo]")){SBC.arm=null;closeSheet();S.tab="label";showTab();return}};
  sh.oninput=e=>{if(e.target.id==="sbcQ"){V.q=e.target.value;clearTimeout(V.qt);V.qt=setTimeout(async()=>{const b=$("#sbcSheet .sbc-body");if(b)b.innerHTML=await needHTML()},200)}};
  draw();pullOk().then(()=>{if($("#sbcSheet"))draw()}).catch(()=>{})};

/* नया सामान जुड़ा, बारकोड खाली → तुरंत पूछो */
SBC.onNew=function(id,tries){const it=item(id);if(!it){if((tries||0)<10)setTimeout(()=>SBC.onNew(id,(tries||0)+1),500);return}
  if(!SBC.need(it))return;
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px sbc" id="sbcSheet" data-new="1" role="dialog" aria-label="नए सामान का बारकोड"><div class="grab"></div>
    <div class="sh-head"><h3 style="font-size:17px">🏷️ ${esc(NM(it))}</h3><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="sbc-new">${ph(it)}<div><p><b>इसका कंपनी बारकोड नहीं डाला गया।</b><br>पैकेट पर बारकोड है तो स्कैन करें — नहीं तो दुकान का लेबल छापकर लगाएँ।</p><div class="sbc-st">${stTxt(it)} · 🔢 अपना कोड ${esc(SBC.ownCodes(it)[0]||"")}</div></div></div>
    <div class="sbc-tabs" hidden></div><div class="sbc-tools" hidden></div><div class="sbc-body" hidden></div><div class="sbc-foot"></div>
    <div class="sbc-b sbc-nb"><button type="button" class="pri" data-nwatt>📷 पैकेट का बारकोड स्कैन करें</button><button type="button" data-nwlbl>🏷️ ${defN(it)} लेबल लिस्ट में</button><button type="button" data-close>बाद में</button></div></div></div>`;
  $("#sheet").onclick=e=>{const t=e.target;if(t.matches("[data-close]")){SBC.arm=null;closeSheet();return}
    if(t.closest("[data-nwatt]")){SBC.arm={id,kind:"attach"};t.closest("[data-nwatt]").textContent="📷 अब बारकोड स्कैन करें…";if(typeof camOn==="function")camOn();return}
    if(t.closest("[data-nwlbl]")){addLbl(id,defN(it));closeSheet();return}}};

const barHTML=()=>{const n=SBC.todoList().length;return n?`<button type="button" id="sbcBar" class="sbc-bar" data-sbcopen>🏷️ <b>${n}</b> सामान पर बारकोड नहीं — फोटो, स्टॉक के साथ देखें, लेबल छापें ›</button>`:`<span id="sbcBar"></span>`};
SBC.chip=()=>{const n=SBC.todoList().length;return n?`<button data-dgo="bcode" class="warn">🏷️ बारकोड चाहिए <b>${n}</b></button>`:""};
SBC.settingsHTML=function(){const L=SBC.list(),d=(S.items||[]).filter(i=>SBC.cand(i)&&SBC.disc(i)>0).length,ok=(S.items||[]).filter(i=>SBC.cand(i)&&SBC.okOf(i)).length;
  return `<div class="card2" id="sbcCard"><h3 style="margin:0 0 4px">🏷️ बारकोड पहरा</h3>
  <p class="note" style="margin:0 0 8px">बिना कंपनी बारकोड: <b>${L.length}</b> — 🏷️ छापने बाकी <b>${SBC.todoList().length}</b> · 🖨️ छप गए (चिपकाने बाकी) <b>${SBC.prList().length}</b> · ✅ लग गए <b>${ok}</b> · 💸 छूट वाले: <b>${d}</b></p>
  <div class="sbc-b"><button type="button" class="pri" data-sbcopen>🏷️ सूची देखें</button>${isOwn()?`<button type="button" data-sbcopen="rep">📊 स्कैन-छपाई हिसाब</button>`:""}</div></div>`};
document.addEventListener("click",e=>{const b=e.target.closest("[data-sbcopen]");if(!b||b.closest("#sbcSheet"))return;SBC.open(b.dataset.sbcopen||"need")});
/* 🏷️ लेबल टैब में सबसे ऊपर पट्टी */
if(window.SL&&SL.render&&!SL.render._sbc){const f=SL.render;SL.render=function(){const r=f.apply(this,arguments);try{const el=$("#p-label");if(el&&!el.querySelector("#sbcBar")){const h=el.querySelector("h2.sec");if(h)h.insertAdjacentHTML("afterend",barHTML())}}catch(e){}return r};SL.render._sbc=1}

const css=document.createElement("style");css.textContent=`
.sbc-bar{display:block;width:100%;text-align:left;margin:0 0 10px;padding:10px 12px;border-radius:14px;border:1.5px solid #f59e0b;background:#fff7e6;color:#7a4b00;font:inherit;font-size:14px}
:root[data-theme="dark"] .sbc-bar{background:#2a2110;color:#fcd38a}
.sbc .sbc-tabs{display:flex;gap:6px;margin:0 0 8px;overflow-x:auto}.sbc .sbc-tabs button{flex:1 0 auto}.sbc .sbc-tabs button{flex:1;padding:8px 6px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13px}
.sbc .sbc-tabs button[aria-pressed="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.sbc-tools{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}.sbc-tools input{flex:1 1 140px;min-width:0;padding:8px 10px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit}
.sbc-tools button,.sbc-b button,.sbc-b2 button,.sbc-arm button,.sbc-sb{padding:7px 9px;border-radius:11px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13px;line-height:1.15}
.sbc .pri{background:#0f766e;color:#fff;border-color:#0f766e}.sbc-busy{flex-basis:100%;font-size:13px;color:var(--muted)}
.sbc-h{margin:10px 0 6px;font-size:14px}.sbc-prt{font-size:12px;color:var(--muted);margin:2px 0 4px}.sbc-rk{display:flex;gap:6px;overflow-x:auto;margin:0 0 8px;padding-bottom:2px}.sbc-rk button{flex:0 0 auto;padding:6px 10px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13px}.sbc-rk button[aria-pressed=true]{background:var(--brand,#0a7);color:#fff;border-color:transparent}.sbc-nt{margin:-2px 0 6px}
.sbc-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.sbc-c{display:flex;flex-direction:column;gap:3px;border:1.5px solid var(--line);border-radius:16px;padding:6px;background:var(--surface);min-width:0}
.sbc-c.arm{border-color:#0f766e;box-shadow:0 0 0 3px #0f766e33}
.sbc-ph .tile{width:100%!important;height:128px!important;border-radius:12px;font-size:52px}.sbc-ph .tile .em{font-size:46px}
.sbc-ph .tile img{object-fit:contain;background:#fff}.sbc-ph .tile.food img{object-fit:cover}
.sbc-nm{font-weight:800;font-size:13.5px;line-height:1.2;word-break:break-word}.sbc-pr{font-size:13px}.sbc-pr s{color:var(--muted)}.sbc-off{color:#b45309;font-style:normal;font-weight:700}
.sbc-st{font-size:12px;color:var(--muted)}.sbc-ai{font-size:11.5px;color:#6d28d9}.sbc-ai code{font-size:11px}
.sbc-b,.sbc-b2{display:flex;gap:5px;flex-wrap:wrap}.sbc-b button{flex:1 1 auto}.sbc-b2 button{flex:1 1 auto;font-size:12px;padding:5px 7px}
.sbc-arm{font-size:12.5px;font-weight:700;color:#0f766e;display:flex;flex-direction:column;gap:5px}.sbc-arm span{display:flex;gap:5px;flex-wrap:wrap}
.sbc-empty{padding:18px;text-align:center;font-weight:700}.sbc-more{display:block;margin:8px auto}
.sbc-k{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 6px}.sbc-k div{border:1.5px solid var(--line);border-radius:12px;padding:6px;text-align:center}.sbc-k span{display:block;font-size:11px;color:var(--muted)}.sbc-k b{font-size:16px}
.sbc-r{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line)}.sbc-r .tile{width:46px;height:46px;border-radius:10px}.sbc-r .tile .em{font-size:22px}
.sbc-r b{display:block;font-size:13px}.sbc-r span{font-size:12px;color:var(--muted)}
.sbc-new{display:grid;grid-template-columns:150px 1fr;gap:10px;align-items:start;margin:0 0 10px}.sbc-new p{margin:0 0 6px;font-size:14px}.sbc-nb{margin-top:4px}
.sbc-foot{position:sticky;bottom:0;padding-top:6px;background:var(--surface)}
@media (max-width:360px){.sbc-g{grid-template-columns:1fr 1fr}.sbc-ph .tile{height:104px!important}.sbc-k{grid-template-columns:1fr 1fr}.sbc-new{grid-template-columns:110px 1fr}}`;
document.head.appendChild(css);
})();
