/* 177 MH — 📍 रैक व्यवस्था (window.SRK) — पक्का नियम: docs/रैक-व्यवस्था-प्रॉम्प्ट.txt · जाँच: tests/rack.py
   हर खाने का नंबर "A3-2" (दीवार + रैक + खाना)। डेटा: items/<id>.rack (se-stock की रैक-वार गिनती वाला ही खाना)।
   रैक लगाना (स्कैन/खोज), खाने की भाव-पट्टी A4, ऑनलाइन ऑर्डर रैक के क्रम में, बिल की खोज में रैक नंबर। */
(()=>{
const SRK=window.SRK={};
const LSr={get:(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const NM=it=>typeof shortNm==="function"?shortNm(it):SE.capNm(it.short||it.name||"");
const ORDER="ABCDHKMST";
SRK.norm=v=>String(v||"").toUpperCase().replace(/\s+/g,"").replace(/[–—_]/g,"-").slice(0,12);
/* क्रम: A→D, H, K, M, S, T, फिर पुराने खुले नाम, बिना रैक सबसे आख़िर */
SRK.key=r=>{r=SRK.norm(r);if(!r)return "~~";const m=/^([A-Z])(\d*)(?:-(\d+))?/.exec(r);
  if(!m)return "y"+r;const w=ORDER.indexOf(m[1]);return (w<0?"x":String.fromCharCode(97+w))+String(+m[2]||0).padStart(3,"0")+String(+m[3]||0).padStart(3,"0")+r};
SRK.wall=r=>{const m=/^([A-Z])\d/.exec(SRK.norm(r));return m?m[1]:""};
const act=()=>(S.items||[]).filter(i=>i.active!==false&&!i.virtual&&i.id!=="xyz");
SRK.racks=()=>{const m={};act().forEach(i=>{const r=SRK.norm(i.rack);if(r)m[r]=(m[r]||0)+1});return Object.keys(m).sort((a,b)=>SRK.key(a)<SRK.key(b)?-1:1).map(r=>({r,n:m[r]}))};
SRK.of=r=>{r=SRK.norm(r);return act().filter(i=>{const x=SRK.norm(i.rack);return x===r||(r.length<=3&&!r.includes("-")&&x.startsWith(r+"-"))})};
SRK.sortItems=L=>[...L].sort((a,b)=>{const A=SRK.key((item(a.id)||{}).rack),B=SRK.key((item(b.id)||{}).rack);return A<B?-1:A>B?1:0});
const isOwn=()=>!!(S.isOwner||S.demo);

/* ---------- रैक लगाना ---------- */
async function setRack(id,r){const it=item(id);if(!it)return false;r=SRK.norm(r);
  if(S.demo||!S.db){it.rack=r;return true}
  if(!S.isOwner){toast("रैक सिर्फ़ विक्रम जी लगा सकते हैं — गिनती में रैक चुनकर गिनें");return false}
  try{await S.db.doc("items/"+id).update({rack:r});it.rack=r;return true}catch(e){toast("सेव नहीं हुआ");return false}}
SRK.set=setRack;
const V={rack:LSr.get("srk_cur",""),q:"",sel:"",open:false};
SRK.scan=function(code){if(!V.open||!$("#srkSheet"))return false;const it=findByCode(code);beep(!!it);
  if(!it){toast("यह बारकोड किसी सामान में नहीं: "+code);return true}assign(it.id);return true};
async function assign(id){const it=item(id);if(!it)return;if(!V.rack){toast("पहले ऊपर रैक नंबर लिखें (जैसे A3-2)");const i=$("#srkR");if(i)i.focus();return}
  const old=SRK.norm(it.rack);if(old===V.rack){toast(NM(it)+" पहले से "+V.rack+" में");return}
  if(await setRack(id,V.rack)){toast("📍 "+NM(it)+" → "+V.rack+(old?" (पहले "+old+")":""));V.q="";draw()}}

/* ---------- खाने की भाव-पट्टी (A4) ---------- */
const PR=LSr.get("srk_pr",{});
SRK.changed=()=>act().filter(i=>SRK.norm(i.rack)&&PR[i.id]!=null&&+PR[i.id]!==+i.sale);
function barURL(it){try{const c=window.SF&&SF.itemCode?SF.itemCode(it):"";if(!c||!window.SL||!SL.barCanvas)return "";const b=SL.barCanvas(c,520,70,true,20,3);return b&&b.c?b.c.toDataURL("image/png"):""}catch(e){return ""}}
SRK.stripHTML=function(L){return `<style>.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5mm}.st{border:0.3mm solid #222;border-radius:2mm;padding:1.6mm 2mm;height:31mm;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;page-break-inside:avoid}
  .st .t{display:flex;justify-content:space-between;align-items:baseline;gap:2mm}.st .r{font:800 15pt/1 sans-serif;letter-spacing:0.3mm;white-space:nowrap}.st .p{font:800 16pt/1 sans-serif;white-space:nowrap}.st .c{font:700 10pt monospace;align-self:center;margin-top:1mm}.st .p s{font:600 9pt sans-serif;color:#555;margin-right:1mm}
  .st .n{font:700 9pt/1.15 sans-serif;margin:1mm 0 0.6mm;max-height:7mm;overflow:hidden;text-transform:uppercase}.st img{height:11mm;width:auto;max-width:100%;align-self:center;image-rendering:pixelated}</style>
  <div class="sg">${L.map(it=>{const tob=typeof isTob==="function"&&isTob(it),nm=tob&&typeof billNm==="function"?billNm(it):NM(it),mrp=+it.mrp>+it.sale&&+it.sale>0?`<s>₹${+it.mrp}</s>`:"",u=barURL(it);
    return `<div class="st"><div class="t"><span class="r">${esc(SRK.norm(it.rack)||"—")}</span><span class="p">${mrp}${+it.sale>0?"₹"+(+it.sale):""}</span></div><div class="n">${esc(nm)}</div>${u?`<img src="${u}" alt="">`:it.code?`<span class="c">#${esc(it.code)}</span>`:""}</div>`}).join("")}</div>`};
SRK.print=async function(L,title){L=(L||[]).filter(Boolean);if(!L.length){toast("कोई सामान नहीं");return 0}if(L.length>300){toast("एक बार में 300 पट्टी तक — रैक चुनें");return 0}
  L=[...L].sort((a,b)=>SRK.key(a.rack)<SRK.key(b.rack)?-1:1);
  try{await SE.printA4(title||("खाने की भाव-पट्टी · "+L.length),SRK.stripHTML(L))}catch(e){toast("प्रिंट नहीं हुआ");return 0}
  L.forEach(i=>PR[i.id]=+i.sale||0);LSr.set("srk_pr",PR);SRK._last=L.map(i=>i.id);toast("🏷️ "+L.length+" पट्टी छप रही हैं");draw();refreshCard();return L.length};

/* ---------- UI ---------- */
function hits(q){q=String(q||"").trim().toLowerCase();if(!q)return [];const byC=findByCode(q);
  const L=act().filter(i=>((i.name||"")+" "+(i.hi||"")+" "+(i.short||"")+" "+(i.alias||"")).toLowerCase().includes(q)||String(i.code||"")===q);
  if(byC&&!L.includes(byC))L.unshift(byC);return L.slice(0,10)}
const row=(it,btn)=>`<div class="srk-r">${tileHTML(it)}<div><b>${esc(NM(it))}</b><span>${SRK.norm(it.rack)?"📍 "+esc(SRK.norm(it.rack)):"<em>रैक नहीं</em>"}${+it.sale>0?" · "+rs(+it.sale):""}${it.code?" · #"+esc(it.code):""}</span></div>${btn||""}</div>`;
function body(){const R=SRK.racks(),none=act().filter(i=>!SRK.norm(i.rack)).length,ch=SRK.changed();
  const list=V.sel?SRK.of(V.sel).sort((a,b)=>SRK.key(a.rack)<SRK.key(b.rack)?-1:1):[];
  return `<div class="srk-k"><div><b>${act().length-none}</b><span>रैक लगा</span></div><div class="${none?"w":""}"><b>${none}</b><span>बाकी</span></div><div><b>${R.length}</b><span>खाने</span></div></div>
  <div class="srk-as"><label>📍 रैक नंबर<input id="srkR" class="inp code" value="${esc(V.rack)}" placeholder="A3-2" autocomplete="off" aria-label="रैक नंबर"></label>
    <div class="srk-q"><input id="srkQ" class="inp" type="search" value="${esc(V.q)}" placeholder="🔍 सामान का नाम / कोड — या बारकोड स्कैन करें" autocomplete="off" aria-label="सामान खोजें"><button type="button" class="scanbtn" data-srkcam aria-label="कैमरे से स्कैन">📷</button></div>
    <div id="srkHits">${hits(V.q).map(i=>row(i,`<button type="button" class="srk-b" data-srkset="${esc(i.id)}">→ ${esc(V.rack||"?")}</button>`)).join("")}</div>
    <p class="note" style="margin:4px 0 0">नंबर लिखें, फिर उस खाने का हर सामान स्कैन करें — अपने-आप उसी रैक का हो जाएगा।</p></div>
  <h4 class="srk-h">🗄️ खाने (${R.length})</h4>
  <div class="srk-c">${R.map(x=>`<button type="button" class="chip" data-srksel="${esc(x.r)}" aria-pressed="${V.sel===x.r}">${esc(x.r)} <b>${x.n}</b></button>`).join("")||'<span class="note">अभी कोई रैक नहीं लगा</span>'}</div>
  ${V.sel?`<div class="srk-sel"><div class="srk-st"><b>📍 ${esc(V.sel)} · ${list.length} सामान</b>${isOwn()?`<button type="button" class="srk-b pri" data-srkpr="${esc(V.sel)}">🏷️ इस रैक की पट्टी</button>`:""}</div>${list.map(i=>row(i,isOwn()?`<button type="button" class="srk-b" data-srkrm="${esc(i.id)}" aria-label="${esc(NM(i))} को इस रैक से हटाएँ">✕</button>`:"")).join("")}</div>`:""}
  ${isOwn()?`<div class="srk-pb"><button type="button" class="big" data-srkall ${R.length?"":"disabled"}>🏷️ सारे खानों की भाव-पट्टी (${act().filter(i=>SRK.norm(i.rack)).length})</button>
    ${ch.length?`<button type="button" class="big ghost" data-srkch>🔁 भाव बदले — ${ch.length} पट्टी दोबारा छापें</button>`:""}</div>`:""}
  <details class="srk-lg"><summary>नंबर का तरीका (A, B, C, D, K…)</summary><p class="note">A मुख्य दीवार · B खिड़की वाली दीवार · C दायाँ कोना (C1 सफ़ाई) · D नमकीन-चिप्स · H पाइप की लड़ियाँ · K ठंडा (K1 ड्रिंक, K2 पानी-जूस, K3 डेयरी, K4 आइसक्रीम, K5 फ्रोज़न, K6 कैडबरी) · M मिठाई ट्रे · S स्टोर-रूम · T तम्बाकू दराज़। खाना = ऊपर से गिनती: A3-2।</p></details>`}
function draw(){const b=$("#srkBody");if(!b)return;const a=document.activeElement,id=a&&a.id,pos=a&&a.selectionStart;b.innerHTML=body();if(id){const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}}
SRK.open=function(sel){V.open=true;if(sel)V.sel=SRK.norm(sel);
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px srk" id="srkSheet" role="dialog" aria-label="रैक व्यवस्था"><div class="grab"></div>
  <div class="sh-head"><h3 style="font-size:17px">📍 रैक व्यवस्था</h3><button class="x" data-close aria-label="बंद करें">✕</button></div><div id="srkBody"></div></div></div>`;
  const sh=$("#sheet");draw();
  sh.onclick=async e=>{const t=e.target;if(t.matches("[data-close]")){V.open=false;closeSheet();refreshCard();return}const g=s=>t.closest(s);let b;
    if((b=g("[data-srkset]"))){await assign(b.dataset.srkset);return}
    if((b=g("[data-srksel]"))){V.sel=V.sel===b.dataset.srksel?"":b.dataset.srksel;draw();return}
    if((b=g("[data-srkrm]"))){if(await setRack(b.dataset.srkrm,""))draw();return}
    if((b=g("[data-srkpr]"))){SRK.print(SRK.of(b.dataset.srkpr),"खाने की भाव-पट्टी · "+b.dataset.srkpr);return}
    if(g("[data-srkall]")){SRK.print(act().filter(i=>SRK.norm(i.rack)),"खाने की भाव-पट्टी · सब");return}
    if(g("[data-srkch]")){SRK.print(SRK.changed(),"भाव बदले — नई पट्टी");return}
    if(g("[data-srkcam]")){if(typeof camOn==="function")camOn();return}};
  sh.oninput=e=>{const t=e.target;if(t.id==="srkR"){const v=SRK.norm(t.value);if(v!==t.value)t.value=v;V.rack=v;LSr.set("srk_cur",v);const h=$("#srkHits");if(h)h.innerHTML=hits(V.q).map(i=>row(i,`<button type="button" class="srk-b" data-srkset="${esc(i.id)}">→ ${esc(V.rack||"?")}</button>`)).join("");return}
    if(t.id==="srkQ"){V.q=t.value;const h=$("#srkHits");if(h)h.innerHTML=hits(V.q).map(i=>row(i,`<button type="button" class="srk-b" data-srkset="${esc(i.id)}">→ ${esc(V.rack||"?")}</button>`)).join("")}};
  sh.onkeydown=e=>{if(e.key==="Enter"&&e.target.id==="srkQ"){const v=e.target.value.trim(),it=findByCode(v)||hits(v)[0];if(it){e.preventDefault();assign(it.id)}}}};
SRK.settingsHTML=function(){if(!isOwn())return "";const R=SRK.racks(),none=act().filter(i=>!SRK.norm(i.rack)).length,ch=SRK.changed().length;
  return `<div class="card2" id="srkCard"><h3 style="margin:0 0 4px">📍 रैक व्यवस्था</h3>
  <p class="note" style="margin:0 0 8px">रैक लगे: <b>${act().length-none}</b> · बाकी: <b>${none}</b> · खाने: <b>${R.length}</b>${ch?` · 🔁 भाव बदले: <b>${ch}</b>`:""}</p>
  <div class="srk-pb"><button type="button" class="pri" data-srkopen>📍 रैक लगाएँ / पट्टी छापें</button></div></div>`};
function refreshCard(){const c=$("#srkCard");if(c)c.outerHTML=SRK.settingsHTML()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-srkopen]");if(!b||b.closest("#srkSheet"))return;SRK.open(b.dataset.srkopen||"")});

const css=document.createElement("style");css.textContent=`
.srk-k{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 0 8px}.srk-k div{border:1.5px solid var(--line);border-radius:12px;padding:6px;text-align:center}.srk-k b{display:block;font-size:18px}.srk-k span{font-size:11.5px;color:var(--muted)}.srk-k .w b{color:#b45309}
.srk-as{border:1.5px solid var(--line);border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:6px}.srk-as label{display:flex;align-items:center;gap:8px;font-weight:700}.srk-as #srkR{width:120px;font:800 18px monospace;text-transform:uppercase}
.srk-q{display:flex;gap:6px}.srk-q input{flex:1;min-width:0}
.srk-r{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--line)}.srk-r .tile{width:40px;height:40px;border-radius:9px}.srk-r .tile .em{font-size:20px}.srk-r b{display:block;font-size:13px}.srk-r span{font-size:12px;color:var(--muted)}
.srk-b{padding:6px 9px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13px;white-space:nowrap}.srk .pri,#srkCard .pri{background:#0f766e;color:#fff;border-color:#0f766e;padding:8px 12px;border-radius:12px;font:inherit}
.srk-h{margin:10px 0 6px;font-size:14px}.srk-c{display:flex;flex-wrap:wrap;gap:6px}.srk-c b{font-size:11px;opacity:.75;margin-left:2px}
.srk-sel{margin-top:8px;border:1.5px solid #0f766e55;border-radius:14px;padding:8px}.srk-st{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px}
.srk-pb{display:flex;flex-direction:column;gap:6px;margin-top:10px}.srk-lg{margin-top:8px}`;
document.head.appendChild(css);
})();
