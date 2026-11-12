/* 177 वेट कैंटीन — 📦 स्टॉक: कम स्टॉक, एक्सपायरी (खेप-वार), गिनती, खराब माल
   गिनती में कर्मचारी को ऐप वाला स्टॉक नहीं दिखता — वो सिर्फ़ गिनकर लिखते हैं; फर्क की रिपोर्ट सिर्फ़ मालिक को। */
(function(){
"use strict";
const SK=window.SK={};
const num=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:0};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let C=null,Q="",VIEW=null;S.counts=[];
function loadC(){try{C=JSON.parse(localStorage.getItem("bh_count")||"null")}catch(e){C=null}}
function saveC(){try{if(C)localStorage.setItem("bh_count",JSON.stringify(C));else localStorage.removeItem("bh_count")}catch(e){}}
loadC();
const tracked=()=>S.items.filter(i=>i.track&&i.active!==false&&!i.virtual).sort((a,b)=>(+a.code||9999)-(+b.code||9999)||String(a.name).localeCompare(b.name));
const qOf=it=>+(S.pstock[it.id]?.qty)||0;
const costOf=it=>window.SF?SF.costOf(it):(+it.cost||0);
const lossRate=it=>costOf(it)||(+it.sale||0); // नुकसान: खरीद भाव न हो तो बिक्री भाव से
const ownerPh=()=>{const d=String(S.settings.ownerPh||"").replace(/\D/g,"").slice(-10);return d.length===10?d:"9509553600"};
const hit=(it,q)=>!q||(it.name+" "+(it.hi||"")+" "+(it.code||"")+" "+(it.alias||"")).toLowerCase().includes(q);
const need=it=>Math.max(lowOf(it),Math.ceil(lowOf(it)*2-qOf(it)));
SK.counting=()=>!!C;

SK.onDb=function(db){
  if(!S.isOwner)return;
  db.collection("counts").orderBy("ts","desc").limit(20).onSnapshot(s=>{S.counts=s.docs.map(d=>({id:d.id,...d.data()}));if(S.tab==="stock")SK.render()},()=>{});
};

/* ---------- मुख्य स्क्रीन ---------- */
SK.render=function(){
  const el=$("#p-stock");if(!el)return;
  if(window.SO&&SO.active())return SO.render();
  if(C)return renderCount(el);
  if(el.contains(document.activeElement)&&document.activeElement.id==="skq")return drawList();
  const T=tracked(),low=T.filter(isLow),xp=T.filter(it=>qOf(it)>0&&expInfo(it)).sort((a,b)=>(expInfo(a).d??999)-(expInfo(b).d??999));
  const val=r2(T.reduce((a,it)=>a+Math.max(0,qOf(it))*costOf(it),0)),mrpVal=r2(T.reduce((a,it)=>a+Math.max(0,qOf(it))*(+it.mrp||+it.sale||0),0));
  const seen=+lsGet("bh_cnt_seen")||0,fresh=S.counts.filter(c=>c.ts>seen).length;
  el.innerHTML=`<h2 class="sec">📦 स्टॉक</h2>
  <div class="skstats"><div><i class="ic">📦</i><b>${T.length}</b><span>सामान</span></div><div class="${low.length?"bad":""}"><i class="ic">⚠️</i><b>${low.length}</b><span>कम स्टॉक</span></div><div class="${xp.length?"warn":""}"><i class="ic">⏰</i><b>${xp.length}</b><span>एक्सपायरी</span></div>
  ${S.isOwner?`<div><i class="ic">💰</i><b style="font-size:clamp(13px,4.2vw,18px)">${rs(Math.round(val))}</b><span>माल की लागत</span></div>`:""}</div>
  ${S.isOwner&&T.some(it=>qOf(it)>0&&!costOf(it))?`<p class="note" style="margin:-4px 0 6px;color:var(--chili)">⚠ ${T.filter(it=>qOf(it)>0&&!costOf(it)).length} सामान का खरीद भाव नहीं भरा — "रेट व सेटिंग" में "खरीद ₹" भरें, या अगली बार "माल आया" में भाव लिखें</p>`:""}
  ${S.isOwner&&mrpVal>0?`<p class="note" style="margin:-4px 0 10px">इसी माल की MRP कीमत ${rs(mrpVal)} · बिकने पर लगभग फायदा ${rs(r2(T.reduce((a,it)=>a+Math.max(0,qOf(it))*((+it.sale||0)-costOf(it)),0)))}</p>`:""}
  <button class="big" data-skstart>🔢 गिनती शुरू करें</button>
  ${window.SO?SO.btnHTML():""}
  <div class="row2" style="margin:8px 0 0"><button class="big ghost" data-skwaste>🗑️ खराब / एक्सपायर हटाएँ</button><button class="big ghost" data-skin>📦 माल आया</button></div>
  ${S.isOwner&&S.counts.length?`<div class="card2"><h3>📋 गिनती की रिपोर्ट ${fresh?`<span class="pill red">${fresh} नई</span>`:""}</h3><div class="list" style="margin:0">${S.counts.slice(0,6).map(c=>`<button class="li" data-skview="${esc(c.id)}"><div class="mid"><b>${fdate(c.date)} · ${esc(c.byName||"")}</b><span>${c.n} सामान गिने · ${c.nDiff?c.nDiff+" में फर्क":"सब मिला 👍"}</span></div><div class="rt" style="color:${c.nDiff?"var(--chili)":"var(--leaf)"}">${c.short>0?"−"+rs(c.short):c.nDiff?"फर्क":"✓"}<small>${c.extra>0?"ज़्यादा "+rs(c.extra):""}</small></div></button>`).join("")}</div></div>`:""}
  <div class="card2"><h3>⚠ कम स्टॉक — मँगाना है (${low.length})</h3>
  ${low.length?`<div class="list" style="margin:0">${low.map(it=>`<div class="li"><div class="mid"><b>${esc(SE.capNm(it.name))}</b><span>#${esc(it.code||"")}${it.supplier?" · "+esc(it.supplier):""}</span></div><div class="rt" style="color:var(--chili)">${qOf(it)<=0?"खत्म":"बचे "+fq(qOf(it),it.unit)}<small>मँगाएँ ~${need(it)}</small></div></div>`).join("")}</div>
  <button class="big" style="margin-top:8px" data-sodopen>🏪 दुकान-वार ऑर्डर — हर दुकान को उसकी सूची</button>
  <a class="big ghost" style="text-align:center;text-decoration:none;display:block;margin-top:8px" target="_blank" rel="noopener" href="${waLink(orderText(low),ownerPh())}">🟢 पूरी लिस्ट विक्रम जी को</a>`:'<p class="note" style="margin:0">सब सामान पूरा है 👍</p>'}</div>
  <div class="card2"><h3>⏰ एक्सपायरी पास / जाँचना है (${xp.length})</h3>
  ${xp.length?`<div class="list" style="margin:0">${xp.map(it=>{const e=expInfo(it),bl=window.SF&&SF.batchList?SF.batchList(it):[];return `<div class="li"><div class="mid"><b>${esc(SE.capNm(it.name))}</b><span>${bl.filter(b=>b.exp).map(b=>fdate(b.exp)+" · "+fq(b.qty,it.unit)).join(" | ")||"तारीख नहीं लिखी"}</span></div><div class="rt"><span class="xpb ${e.k}">${e.t}</span><small><button class="lnk" data-skw="${esc(it.id)}">हटाएँ</button></small></div></div>`}).join("")}</div>`:'<p class="note" style="margin:0">अगले 30 दिन में कुछ एक्सपायर नहीं हो रहा 👍</p>'}</div>
  <h3 style="margin:14px 0 6px">सारा पैकेट वाला माल</h3>
  <input class="inp" id="skq" type="search" placeholder="🔍 नाम या कोड" value="${esc(Q)}" autocomplete="off" aria-label="स्टॉक खोजें" style="margin-bottom:8px">
  <div class="list" id="sklist"></div>`;
  drawList();
};
function drawList(){
  const box=$("#sklist");if(!box)return;const q=Q.trim().toLowerCase();
  box.innerHTML=tracked().filter(it=>hit(it,q)).map(it=>{const v=qOf(it),e=expInfo(it);
    const pc=Math.max(0,Math.min(100,Math.round(v/(lowOf(it)*3)*100))),lv=v<=0||isLow(it)?"low":pc<60?"mid":"";
    return `<div class="li"><span class="sith">${SE.photoSrc(it)?`<img src="${esc(SE.photoSrc(it))}" alt="" loading="lazy">`:esc(it.emoji||"📦")}</span><div class="mid"><b>${esc(SE.capNm(it.name))}</b><span>#${esc(it.code||"")}${e?` · <span class="xpb ${e.k}">${e.t}</span>`:""}</span><span class="skbar ${lv}"><i style="width:${v<=0?4:Math.max(6,pc)}%"></i></span></div><div class="rt" style="color:${isLow(it)?"var(--chili)":"var(--ink)"}">${v<=0?"खत्म":fq(v,it.unit)}${S.isOwner?`<small>${rs(r2(Math.max(0,v)*costOf(it)))}</small>`:""}</div></div>`}).join("")||'<p class="note">कुछ नहीं मिला</p>';
}
function orderText(low){
  return `🛒 *177 वेट कैंटीन — ऑर्डर लिस्ट*\n${fdate(today())}\n────────\n`+low.map((it,i)=>`${i+1}. ${it.name}${it.size&&!String(it.name).includes(it.size)?" "+it.size:""} — बचे ${qOf(it)<=0?0:qOf(it)} · मँगाएँ ${need(it)}${it.supplier?" ("+it.supplier+")":""}`).join("\n")+`\n────────\n${biller()?"भेजा: "+biller():""}`;
}

/* ---------- 🔢 गिनती ---------- */
function startCount(){C={start:Date.now(),by:biller(),n:{}};saveC();Q="";SK.render();
  if(typeof camOn==="function"&&(SE.isNative||("BarcodeDetector" in window)))camOn();
  toast("गिनती शुरू — हर पैकेट स्कैन करें या संख्या लिखें")}
function renderCount(el){
  const T=tracked(),done=Object.keys(C.n).filter(id=>T.find(i=>i.id===id)).length;
  if(el.contains(document.activeElement)&&document.activeElement.matches("[data-cn],#ckq")){drawCount();$("#ckdone").textContent=done+" / "+T.length;return}
  el.innerHTML=`<div class="cnthead"><div><h2 class="sec" style="margin:0">🔢 गिनती</h2><span class="note">शुरू: ${ftime(C.start)} · ${esc(C.by||"")}</span></div><b id="ckdone">${done} / ${T.length}</b></div>
  <p class="note" style="margin:6px 0 10px">रैक के हिसाब से एक-एक पैकेट <b>स्कैन</b> करें (हर स्कैन = 1 गिना), या संख्या सीधे लिखें। जो सामान नहीं है, उसमें 0 लिखें।</p>
  <div class="pqrow" style="margin-bottom:8px"><input class="inp" id="ckrack" placeholder="🗄️ अभी कौन सा रैक? (जैसे R1, फ्रिज, काउंटर)" value="${esc(C.rack||"")}" autocomplete="off" aria-label="रैक"></div>
  <div class="chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${racks().map(r=>`<button type="button" class="chip${C.rack===r?" on":""}" data-ckr="${esc(r)}">${esc(r)}</button>`).join("")}</div>
  <div class="pqrow"><input class="inp" id="ckq" type="search" placeholder="🔍 नाम या कोड" value="${esc(Q)}" autocomplete="off" aria-label="खोजें"><button class="scanbtn" type="button" data-ckscan aria-label="स्कैन">📷</button></div>
  <div class="list" id="cklist"></div>
  <div style="height:150px"></div>
  <div class="cartbar px cntbar"><button class="big ghost" data-ckcancel>रद्द</button><button class="big" data-ckdone>✓ गिनती पूरी करें</button></div>`;
  drawCount();
}
function drawCount(){
  const box=$("#cklist");if(!box)return;const q=Q.trim().toLowerCase();
  box.innerHTML=tracked().filter(it=>hit(it,q)&&(q||!C.rack||it.rack===C.rack||(/^\d{1,2}$/.test(C.rack)&&String(it.rack||"").startsWith(C.rack+"-"))||(C.rk&&C.rk[it.id]===C.rack))).map(it=>{const v=C.n[it.id];const has=v!=null;
    return `<div class="li cntrow ${has?"ok":""}" data-crow="${esc(it.id)}">${tileHTML(it)}<div class="mid"><b>${esc(SE.capNm(it.name))}</b><span>#${esc(it.code||"")}${it.size?" · "+esc(it.size):""}${it.rack?" · 🗄️ "+esc(it.rack):""}${S.isOwner?ckDiff(it,v):""}</span></div>
    <div class="cstep2"><button type="button" data-cdec="${esc(it.id)}" aria-label="एक कम">−</button><input class="inp" data-cn="${esc(it.id)}" inputmode="numeric" value="${has?v:""}" placeholder="—" aria-label="${esc(SE.capNm(it.name))} कितने गिने"><button type="button" data-cinc="${esc(it.id)}" aria-label="एक और">+</button></div></div>`}).join("")||'<p class="note">कुछ नहीं मिला</p>';
}
/* 🔍 मालिक की जाँच (रैक/खाने-वार): ऐप का स्टॉक और गिनती का फ़र्क तुरंत — साथी को नहीं दिखता (अंधी गिनती) */
function updD(id){if(!S.isOwner)return;const r=document.querySelector(`[data-crow="${CSS.escape(id)}"] .ckd`),it=item(id);if(r&&it)r.outerHTML=ckDiff(it,C.n[id]).replace(/^ · /,"")}
function ckDiff(it,v){const sys=r2(qOf(it));if(v==null)return ` · <span class="ckd">ऐप में ${sys}</span>`;const d=r2(+v-sys);return ` · <span class="ckd ${d<0?"bad":d>0?"plus":"ok"}">ऐप ${sys} → गिने ${r2(+v)} ${d===0?"✅":d>0?"(+"+d+")":"("+d+")"}</span>`}
function setCnt(id,v){if(v==null||v==="")delete C.n[id];else{C.n[id]=Math.max(0,r2(num(v)));const it=S.items.find(i=>i.id===id);if(it)setRack(it)}saveC()}
/* 🗄️ रैक-वार गिनती: रैक चुनकर जो सामान गिनो, वह उसी रैक का हो जाता है (मालिक के लिए अपने-आप सेव) */
const racks=()=>[...new Set(S.items.map(i=>{const r=String(i.rack||""),m=/^(\d{1,2})-\d/.exec(r);return m?m[1]:r}).filter(Boolean).concat(C&&C.rack?[C.rack]:[]))].sort((a,b)=>(/^\d+$/.test(a)&&/^\d+$/.test(b))?a-b:String(a).localeCompare(b));/* 📍 11-23 जैसे खाने = रैक 11 की चिप */
function setRack(it){if(!C.rack||it.rack===C.rack)return;if(/^\d{1,2}$/.test(C.rack)&&String(it.rack||"").startsWith(C.rack+"-"))return;/* 📍 "11" गिनते समय 11-23 वाला खाना नहीं बिगड़ता */C.rk=C.rk||{};C.rk[it.id]=C.rack;it.rack=C.rack;if(!S.demo&&S.db)S.db.doc("items/"+it.id).update({rack:C.rack}).catch(()=>{})}
SK.scanCount=function(it){
  if(!it.track){toast(it.name+" की गिनती नहीं रखी जाती");return}
  C.n[it.id]=(+C.n[it.id]||0)+1;setRack(it);saveC();toast("✓ "+it.name+" · गिने: "+C.n[it.id]+(C.rack?" · 🗄️ "+C.rack:""));
  let inp=document.querySelector(`[data-cn="${CSS.escape(it.id)}"]`);if(!inp){drawCount();inp=document.querySelector(`[data-cn="${CSS.escape(it.id)}"]`)}
  if(inp){inp.value=C.n[it.id];updD(it.id);const r=inp.closest(".cntrow");r.classList.add("ok","flash");setTimeout(()=>r.classList.remove("flash"),500);try{r.scrollIntoView({block:"nearest"})}catch(e){}}
  const d=$("#ckdone");if(d)d.textContent=Object.keys(C.n).length+" / "+tracked().length;
};
async function finishCount(){
  const T=tracked(),ids=Object.keys(C.n).filter(id=>T.find(i=>i.id===id));
  if(!ids.length){toast("अभी कुछ नहीं गिना");return}
  const left=T.length-ids.length,b=$("[data-ckdone]");
  if(left&&b.dataset.sure!=="1"){b.dataset.sure="1";b.textContent=`${left} सामान नहीं गिने — फिर भी पूरी करें?`;toast(left+" सामान बाकी हैं — वो जैसे हैं वैसे रहेंगे");return}
  b.disabled=true;
  const lines=ids.map(id=>{const it=item(id),sys=r2(qOf(it)),cnt=r2(C.n[id]),c=lossRate(it);return {id,name:it.name,code:it.code||"",unit:it.unit,sys,cnt,diff:r2(cnt-sys),cost:c,bySale:!costOf(it),val:r2((cnt-sys)*c)}});
  const D=lines.filter(l=>l.diff!==0);
  const doc={date:today(),ts:Date.now(),start:C.start,by:S.uid||"",byName:biller(),n:lines.length,left,nDiff:D.length,
    short:r2(-D.filter(l=>l.diff<0).reduce((a,l)=>a+l.val,0)),extra:r2(D.filter(l=>l.diff>0).reduce((a,l)=>a+l.val,0)),lines};
  const id="c"+uid();
  try{
    if(!S.demo)await S.db.collection("counts").doc(id).set(doc);
    await adjStock(D.map(l=>[l.id,l.diff]),"गिनती "+fdate(doc.date));
    if(S.isOwner||S.demo)S.counts.unshift({id,...doc});
  }catch(e){b.disabled=false;toast("सेव नहीं हुआ — नेट देखकर दोबारा दबाएँ");return}
  C=null;saveC();if(typeof camOff==="function")camOff(false);
  if(S.isOwner){SK.render();viewCount(S.counts.find(c=>c.id===id)||{id,...doc})}
  else{SK.render();toast("✓ गिनती पूरी हुई · "+lines.length+" सामान गिने · धन्यवाद 🙏")}
}
function viewCount(c){
  lsSet("bh_cnt_seen",String(Math.max(+lsGet("bh_cnt_seen")||0,c.ts)));
  const D=(c.lines||[]).filter(l=>l.diff!==0).sort((a,b)=>a.val-b.val);
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="गिनती की रिपोर्ट"><div class="grab"></div>
  <div class="sh-head"><div><h3>📋 गिनती · ${fdate(c.date)}</h3><span class="note">${esc(c.byName||"")} · ${ftime(c.start||c.ts)}–${ftime(c.ts)} · ${c.n} गिने${c.left?" · "+c.left+" नहीं गिने":""}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <div class="skstats"><div class="${c.short>0?"bad":""}"><b>${rs(c.short)}</b><span>कम निकला${(c.lines||[]).some(l=>l.bySale&&l.diff<0)?" *":""}</span></div><div><b>${rs(c.extra)}</b><span>ज़्यादा निकला</span></div><div><b>${c.nDiff}</b><span>सामान में फर्क</span></div></div>
  ${D.length?`<div class="tblwrap"><table class="t"><thead><tr><th>सामान</th><th class="n">ऐप में</th><th class="n">गिने</th><th class="n">फर्क</th><th class="n">₹</th></tr></thead><tbody>
  ${D.map(l=>`<tr><td>${esc(l.name)} <small class="note">#${esc(l.code)}</small></td><td class="n">${l.sys}</td><td class="n">${l.cnt}</td><td class="n" style="color:${l.diff<0?"var(--chili)":"var(--leaf)"};font-weight:800">${l.diff>0?"+":""}${l.diff}</td><td class="n">${l.val>0?"+":""}${rs(l.val)}</td></tr>`).join("")}</tbody></table></div>
  ${D.some(l=>l.bySale)?`<p class="note">* जिन सामान का खरीद भाव नहीं भरा, उनका नुकसान बिक्री भाव से जोड़ा है।</p>`:""}
  <p class="note">ऐप का स्टॉक गिनती के हिसाब से ठीक कर दिया गया है। कम निकले माल के बारे में ${esc(c.byName||"")} से पूछ सकते हैं — शायद बिल बनाना रह गया हो, खराब हुआ हो या कहीं और रखा हो।</p>`:`<p class="note" style="font-size:16px">✅ सब गिनती ऐप से मिल गई — बहुत बढ़िया।</p>`}
  </div></div>`;
  $("#sheet").onclick=e=>{if(e.target.matches("[data-close]")){closeSheet();SK.render()}};
}

/* ---------- 📲 रात की रिपोर्ट ---------- */
function dayNums(){
  const all=S.dayBills||[],bills=all.filter(b=>!b.cancelled),sale=bills.filter(b=>b.mode!=="inst"),inst=bills.filter(b=>b.mode==="inst");
  const sum=(a,f)=>r2(a.reduce((x,b)=>x+(+f(b)||0),0));
  const lc=(l,b)=>window.SF&&SF.lineCost?SF.lineCost(l,b.date):(+l.cost||0);/* बिल, रिपोर्ट, डैशबोर्ड — सब में एक ही तरीका */
  const cost=sum(sale,b=>(b.lines||[]).reduce((y,l)=>y+(lc(l,b)>0?lc(l,b)*(+l.qty||0):0),0));
  const noCost=sum(sale,b=>(b.lines||[]).reduce((y,l)=>y+(lc(l,b)>0||l.free?0:(+l.amt||0)),0));
  const P=(S.purch||[]).filter(p=>!p.cancelled);
  const W=((S.stock&&S.stock.wlog)||[]);
  return {n:sale.length,tot:sum(sale,b=>b.total),cash:sum(sale,b=>b.pay&&b.pay.cash),upi:sum(sale,b=>b.pay&&b.pay.upi),ud:sum(sale,b=>b.pay&&b.pay.udhar),
    pend:sale.filter(b=>b.settled===false).length,inst:sum(inst,b=>b.total),nInst:inst.length,cost,noCost,gm:r2(sum(sale,b=>b.total)-noCost-cost),
    saved:sum(sale,b=>typeof savedOf==="function"?savedOf(b):0),cancel:all.filter(b=>b.cancelled),
    buy:sum(P.filter(p=>p.src!=="mh"),p=>p.total),mh:sum(P.filter(p=>p.src==="mh"),p=>p.total),mhUnsent:P.filter(p=>p.src==="mh"&&!p.mhSent).length,
    waste:r2(W.reduce((a,w)=>a+(+w.qty||0)*(+w.cost||0),0)),nWaste:W.length,
    kh:sum(S.kharch||[],k=>k.amt),byStaff:sale.reduce((m,b)=>{const k=b.byName||"—";m[k]=r2((m[k]||0)+(+b.total||0));return m},{})};
}
function ownerText(){
  const d=dayNums(),T=tracked(),low=T.filter(isLow),xp=T.filter(it=>qOf(it)>0&&expInfo(it)&&expInfo(it).k!=="chk");
  const cnt=(S.counts||[]).filter(c=>c.date===S.billsDate);
  return `🛒 *177 वेट कैंटीन — ${fdate(S.billsDate)} का हिसाब*\n────────\n`+
  `💰 बिक्री: *${rs(d.tot)}* (${d.n} बिल)${window.SV&&SV.saleTotal(S.billsDate)>0?" · वापसी घटाकर "+rs(r2(d.tot-SV.saleTotal(S.billsDate))):""}\n   नकद ${rs(d.cash)} · UPI ${rs(d.upi)} · उधार ${rs(d.ud)}${d.pend?`\n   ⏳ ${d.pend} बिल का भुगतान बाकी`:""}\n`+
  (d.nInst?`🏢 संस्था को: ${rs(d.inst)} (${d.nInst} बिल)\n`:"")+
  `📈 लगभग मुनाफ़ा: *${rs(d.gm)}* (लागत ${rs(d.cost)})\n`+(d.noCost>0?`   ⚠ ${rs(d.noCost)} की बिक्री वाले सामान का खरीद भाव नहीं भरा — उसका मुनाफ़ा इसमें नहीं गिना\n`:"")+
  (d.saved>0?`🎉 ग्राहकों की MRP से बचत: ${rs(d.saved)}\n`:"")+
  `🚚 माल आया: ${rs(d.buy)}${d.mh?` · 177 MH से ${rs(d.mh)}${d.mhUnsent?` (⚠ ${d.mhUnsent} पर्ची भेजनी बाकी)`:""}`:""}\n`+
  (d.kh?`💸 खर्चा: ${rs(d.kh)}\n`:"")+
  (d.nWaste?`🗑️ खराब/एक्सपायर हटाया: ${d.nWaste} बार · लगभग ${rs(d.waste)}\n`:"")+
  (window.SG?SG.ownerLine():"")+
  (window.SB&&SB.rateLine?SB.rateLine(S.dayBills):"")+
  (window.SV?SV.dayLine(S.billsDate):"")+
  (cnt.length?`🔢 गिनती: ${cnt.map(c=>c.byName+" · "+(c.nDiff?c.nDiff+" सामान में फर्क"+(c.short>0?", कम "+rs(c.short):""):"सब मिला")).join(", ")}\n`:"")+
  (d.cancel.length?`❌ रद्द बिल: ${d.cancel.map(b=>b.no+" "+rs(b.total)+(b.cancelReason?" ("+b.cancelReason+")":"")).join(", ")}\n`:"")+
  `👤 ${Object.entries(d.byStaff).map(([k,v])=>k+" "+rs(v)).join(" · ")||"—"}\n`+
  `────────\n⚠ कम स्टॉक (${low.length}): ${low.slice(0,10).map(it=>it.name+" "+Math.max(0,qOf(it))).join(", ")||"कोई नहीं"}${low.length>10?" …":""}\n`+
  `⏰ एक्सपायरी पास (${xp.length}): ${xp.slice(0,8).map(it=>it.name+" ("+expInfo(it).t+")").join(", ")||"कोई नहीं"}`;
}
function staffText(){
  const d=dayNums();
  return `🛒 *177 वेट कैंटीन — ${fdate(S.billsDate)}*\n${biller()} की तरफ़ से आज का हिसाब 🙏\n────────\n`+
  `बिक्री: *${rs(d.tot)}* (${d.n} बिल)\nनकद ${rs(d.cash)} · UPI ${rs(d.upi)} · उधार ${rs(d.ud)}\n`+(d.nInst?`संस्था: ${rs(d.inst)}\n`:"")+(d.kh?`खर्चा: ${rs(d.kh)}\n`:"")+(d.buy||d.mh?`माल आया: ${rs(r2(d.buy+d.mh))}\n`:"");
}
SK.reportBtnHTML=function(){return `<div class="card2 nightcard"><div><b>📲 आज का पूरा हिसाब WhatsApp पर</b><span class="note">बिक्री, मुनाफ़ा, खरीद, रद्द बिल, कम स्टॉक, एक्सपायरी — एक मैसेज में</span></div>
  <a class="big" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" href="${waLink(ownerText(),ownerPh())}">🟢 भेजें</a><button class="lnk" data-nightview>पहले देखें</button></div>`};
SK.staffBtnHTML=function(){return `<div class="card2 nightcard"><div><b>📲 आज का हिसाब विक्रम जी को भेजें</b><span class="note">दुकान बंद करते समय एक बार</span></div>
  <a class="big" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" href="${waLink(staffText(),ownerPh())}">🟢 भेजें</a></div>`};
SK.ownerText=ownerText;
document.addEventListener("click",e=>{if(e.target.closest("[data-nightview]")){$("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="आज का हिसाब"><div class="grab"></div><div class="sh-head"><h3>📲 आज का हिसाब</h3><button class="x" data-close aria-label="बंद करें">✕</button></div><pre class="mhslip">${esc(ownerText().replace(/\*/g,""))}</pre><a class="big" style="text-align:center;text-decoration:none;display:block" target="_blank" rel="noopener" href="${waLink(ownerText(),ownerPh())}">🟢 WhatsApp पर भेजें</a></div></div>`;$("#sheet").onclick=x=>{if(x.target.matches("[data-close]"))closeSheet()}}});

/* ---------- घटनाएँ ---------- */
SK.bind=function(){
  const el=$("#p-stock");
  el.addEventListener("input",e=>{const t=e.target;
    if(t.id==="skq"){Q=t.value;drawList();return}
    if(t.id==="ckq"){Q=t.value;drawCount();return}
    if(t.id==="ckrack"){C.rack=t.value.trim();saveC();drawCount();return}
    if(t.dataset.cn){setCnt(t.dataset.cn,t.value);updD(t.dataset.cn);t.closest(".cntrow").classList.toggle("ok",t.value!=="");const d=$("#ckdone");if(d)d.textContent=Object.keys(C.n).length+" / "+tracked().length}});
  el.addEventListener("click",e=>{
    if(e.target.closest("[data-skstart]")){startCount();return}
    const rk=e.target.closest("[data-ckr]");if(rk){C.rack=C.rack===rk.dataset.ckr?"":rk.dataset.ckr;saveC();SK.render();return}
    if(e.target.closest("[data-skwaste]")){if(window.SR)SR.wasteSheet();return}
    const w=e.target.closest("[data-skw]");if(w){if(window.SR)SR.wasteSheet(w.dataset.skw,"एक्सपायर");return}
    if(e.target.closest("[data-skin]")){S.tab="kharid";showTab();return}
    const v=e.target.closest("[data-skview]");if(v){const c=S.counts.find(x=>x.id===v.dataset.skview);if(c)viewCount(c);return}
    if(e.target.closest("[data-ckscan]")){if(typeof liveScan==="function")liveScan();return}
    const dc=e.target.closest("[data-cdec]");if(dc){const id=dc.dataset.cdec;setCnt(id,Math.max(0,(+C.n[id]||0)-1));drawCountKeep();return}
    const ic=e.target.closest("[data-cinc]");if(ic){const id=ic.dataset.cinc;setCnt(id,(+C.n[id]||0)+1);drawCountKeep();return}
    if(e.target.closest("[data-ckdone]")){finishCount();return}
    const cc=e.target.closest("[data-ckcancel]");if(cc){if(cc.dataset.sure!=="1"){cc.dataset.sure="1";cc.textContent="पक्का रद्द?";return}C=null;saveC();if(typeof camOff==="function")camOff(false);SK.render();toast("गिनती रद्द — स्टॉक में कुछ नहीं बदला")}
  });
};
function drawCountKeep(){const y=document.body.scrollTop||window.scrollY;drawCount();const d=$("#ckdone");if(d)d.textContent=Object.keys(C.n).length+" / "+tracked().length;document.body.scrollTop=y;window.scrollTo(0,y)}
})();
