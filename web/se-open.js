/* 🏁 SO — नया ओपनिंग स्टॉक (सिर्फ़ मालिक)
   ऐप एक-एक पैकेट वाला सामान दिखाकर पूछता है "कितने हैं?" — स्कैन (हर स्कैन +1) या संख्या, साथ में एक्सपायरी/खरीद भाव।
   अधूरा काम फोन में (bh_open) रहता है। "पक्का करें" पर ही स्टॉक बदलता है; पुराना स्टॉक/एक्सपायरी/खरीद भाव openings/{id} में सुरक्षित। */
(function(){
"use strict";
const SO=window.SO={};
const K="mh_open";
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(n)?n:0};
const r2=v=>Math.round(v*100)/100;
let O=null;
try{O=JSON.parse(localStorage.getItem(K)||"null")}catch(e){O=null}
const save=()=>{try{if(O)localStorage.setItem(K,JSON.stringify(O));else localStorage.removeItem(K)}catch(e){}};
const costOf=it=>window.SF?SF.costOf(it):(+it.cost||0);
const qOf=it=>+(S.pstock[it.id]&&S.pstock[it.id].qty)||0;
const pool=()=>S.items.filter(i=>i.track&&!i.virtual&&(i.active!==false||(O&&O.order.includes(i.id))));
const ids=()=>O?O.order.filter(id=>item(id)):[];
const cur=()=>{const L=ids();if(!L.length)return null;O.i=Math.max(0,Math.min(O.i||0,L.length-1));return item(L[O.i])};
const st=id=>O.off[id]?"off":O.n[id]!=null?(O.n[id]>0?"ok":"zero"):"";
const doneN=()=>ids().filter(id=>st(id)).length;
SO.active=()=>!!O&&!!S.isOwner;

SO.start=function(){
  if(!S.isOwner){toast("ओपनिंग स्टॉक सिर्फ़ विक्रम जी चढ़ा सकते हैं");return}
  const order=pool().filter(i=>i.active!==false).sort((a,b)=>(+a.code||9999)-(+b.code||9999)||String(a.name).localeCompare(b.name)).map(i=>i.id);
  O={start:Date.now(),date:today(),i:0,order,n:{},exp:{},cost:{},off:{},added:[]};save();
  S.tab="stock";try{showTab()}catch(e){}SO.render();
  if(typeof camOn==="function"&&(SE.isNative||("BarcodeDetector" in window)))camOn();
  toast("🏁 ओपनिंग स्टॉक शुरू — हर सामान गिनकर लिखें या स्कैन करें");
};

/* ---------- स्क्रीन ---------- */
SO.render=function(){
  const el=$("#p-stock");if(!el||!O)return;
  const L=ids(),it=cur(),dn=doneN(),pc=L.length?Math.round(dn/L.length*100):0;
  if(O.view==="list")return drawList(el,L,dn);
  if(!it){el.innerHTML=`<h2 class="sec">🏁 ओपनिंग स्टॉक</h2><p class="note">कोई पैकेट वाला सामान नहीं — बारकोड स्कैन करके नया सामान जोड़ें।</p>${foot(dn,L.length)}`;return}
  const e=O.exp[it.id]||"",c=O.cost[it.id]!=null?O.cost[it.id]:(costOf(it)||""),q=O.n[it.id],s=st(it.id);
  const oldExp=window.SF&&SF.nearExp?SF.nearExp(it):(it.exp||"");
  el.innerHTML=`<div class="so-top"><div><h2 class="sec" style="margin:0">🏁 ओपनिंग स्टॉक</h2><span class="note">${fdate(O.date)} · शुरू ${ftime(O.start)}</span></div>
    <button class="chip" data-so="list">📋 सूची</button></div>
  <div class="so-prog"><i style="width:${pc}%"></i><span>${dn} / ${L.length} हुए</span></div>
  <div class="card2 so-card ${s}">
    <div class="so-ph">${tileHTML(it)}</div>
    <div class="so-ask">विक्रम जी, यह है —</div>
    <h3 class="so-nm">${esc(SE.capNm(it.name))}</h3>
    <p class="note so-meta">#${esc(it.code||"")}${it.barcode?" · "+esc(String(it.barcode).split(",")[0]):""}${+it.mrp?" · MRP ₹"+(+it.mrp):""} · बिक्री ₹${+it.sale||0}</p>
    <div class="so-q-l">कितने हैं? स्कैन करें या संख्या लिखें</div>
    <div class="so-q"><button type="button" data-so="dec" aria-label="एक कम">−</button><input class="inp" id="soQ" inputmode="decimal" value="${q!=null?q:""}" placeholder="—" aria-label="${esc(SE.capNm(it.name))} कितने हैं" autocomplete="off"><button type="button" data-so="inc" aria-label="एक और">+</button></div>
    <div class="row2" style="margin:8px 0 0"><label class="fld">एक्सपायरी (हो तो)<input class="inp" id="soE" type="date" value="${esc(e)}"></label><label class="fld">खरीद भाव ₹<input class="inp" id="soC" inputmode="decimal" value="${esc(String(c))}" placeholder="पता हो तो"></label></div>
    <p class="note so-old">ऐप में पहले: ${fq(qOf(it),it.unit)}${oldExp?" · पुरानी एक्सपायरी "+fdate(oldExp):""}${s==="off"?' · <b style="color:var(--chili)">🚫 बंद किया</b>':""}</p>
    <button class="big" data-so="next">✓ अगला${q!=null?" ("+q+")":""}</button>
    <div class="so-b3"><button class="big ghost" data-so="prev" ${O.i?"":"disabled"}>← पिछला</button><button class="big ghost" data-so="zero">0 — नहीं है</button><button class="big ghost" data-so="off">🚫 अब नहीं बेचते</button></div>
  </div>
  ${foot(dn,L.length)}`;
  setTimeout(()=>{const f=$("#soQ");if(f&&!document.querySelector("#sheet .scrim")){f.focus();try{f.select()}catch(x){}}},40);
};
const foot=(dn,n)=>`<div style="height:120px"></div><div class="cartbar px cntbar"><button class="big ghost" data-so="cancel">रद्द</button><button class="big" data-so="finish">🏁 पूरा करें (${dn}/${n})</button></div>`;
function drawList(el,L,dn){
  el.innerHTML=`<div class="so-top"><div><h2 class="sec" style="margin:0">🏁 ओपनिंग — सूची</h2><span class="note">${dn} / ${L.length} हुए · किसी पर दबाएँ</span></div><button class="chip" data-so="card">← एक-एक करके</button></div>
  <div class="list">${L.map((id,i)=>{const it=item(id),s=st(id);return `<button class="li cntrow ${s==="ok"?"ok":""}" data-soi="${i}">${tileHTML(it)}<div class="mid"><b>${esc(SE.capNm(it.name))}</b><span>#${esc(it.code||"")}${O.added.includes(id)?" · 🆕 नया":""}</span></div><div class="rt">${s==="off"?"🚫 बंद":s==="zero"?"0":s==="ok"?fq(O.n[id],it.unit):'<span class="note">— बाकी</span>'}</div></button>`}).join("")}</div>${foot(dn,L.length)}`;
}
function keep(){const it=cur();if(!it)return;const q=$("#soQ"),e=$("#soE"),c=$("#soC");
  if(q){const v=String(q.value).trim();if(v==="")delete O.n[it.id];else{O.n[it.id]=Math.max(0,r2(num(v)));delete O.off[it.id]}}
  if(e){if(e.value)O.exp[it.id]=e.value;else delete O.exp[it.id]}
  if(c){const v=String(c.value).trim();if(v==="")delete O.cost[it.id];else O.cost[it.id]=r2(num(v))}
  save()}
function go(d){O.i=Math.max(0,Math.min(ids().length-1,(O.i||0)+d));save();SO.render()}

/* स्कैन: यही सामान → +1, दूसरा → उस पर जाओ और +1 */
SO.scan=function(it){
  if(!O)return;if(!it.track){toast(it.name+" पैकेट वाला सामान नहीं (गिनती नहीं रखी जाती)");return}
  if(S.tab!=="stock"){S.tab="stock";try{showTab()}catch(e){}}
  if(O.view==="list")O.view="";
  const c=cur();if(c&&c.id!==it.id)keep();
  if(!O.order.includes(it.id))O.order.push(it.id);
  O.i=ids().indexOf(it.id);O.n[it.id]=r2((+O.n[it.id]||0)+1);delete O.off[it.id];save();SO.render();
  toast("✓ "+it.name+" · "+O.n[it.id]);
};
/* नया सामान (अनजान बारकोड से) */
SO.addNew=function(id,qty){if(!O)return;if(!O.order.includes(id))O.order.push(id);if(!O.added.includes(id))O.added.push(id);
  O.n[id]=r2(qty>0?qty:1);O.i=ids().indexOf(id);save();SO.render()};

/* ---------- पूरा करना ---------- */
function summary(){
  const L=ids().map(item),done=L.filter(it=>st(it.id)),left=L.filter(it=>!st(it.id));
  const val=r2(L.reduce((a,it)=>a+(O.off[it.id]?0:num(O.n[it.id])*(O.cost[it.id]!=null?O.cost[it.id]:costOf(it))),0));
  const mrp=r2(L.reduce((a,it)=>a+(O.off[it.id]?0:num(O.n[it.id])*(+it.mrp||+it.sale||0)),0));
  return {L,done,left,ok:L.filter(it=>st(it.id)==="ok"),zero:L.filter(it=>st(it.id)==="zero"),off:L.filter(it=>O.off[it.id]),val,mrp,
    noCost:L.filter(it=>st(it.id)==="ok"&&!(O.cost[it.id]!=null?O.cost[it.id]:costOf(it))).length};
}
function finishSheet(){
  const it=cur();if(it&&O.view!=="list")keep();const s=summary();let leftMode="keep";
  const draw=()=>{$("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="ओपनिंग स्टॉक पक्का करें"><div class="grab"></div>
    <div class="sh-head"><div><h3>🏁 ओपनिंग स्टॉक — सार</h3><span class="note">${fdate(O.date)} · ${s.L.length} सामान</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="skstats"><div><b>${s.ok.length}</b><span>गिने</span></div><div><b>${s.zero.length}</b><span>0 (नहीं है)</span></div><div><b>${s.off.length}</b><span>🚫 बंद</span></div><div><b>${O.added.length}</b><span>🆕 नए</span></div></div>
    <div class="stkmeta"><span>माल की लागत (खरीद भाव से)</span><b>${rs(s.val)}</b></div>
    <div class="stkmeta"><span>इसी माल की MRP कीमत</span><b>${rs(s.mrp)}</b></div>
    ${s.noCost?`<p class="note" style="color:var(--chili)">⚠ ${s.noCost} सामान का खरीद भाव नहीं भरा — उनकी लागत इसमें नहीं जुड़ी (बाद में भी भर सकते हैं)</p>`:""}
    ${s.left.length?`<div class="warn">⚠ ${s.left.length} सामान अभी नहीं गिने: ${s.left.slice(0,6).map(i=>esc(SE.capNm(i.name))).join(", ")}${s.left.length>6?" …":""}</div>
      <div class="paym" style="margin:6px 0"><button data-solm="keep" aria-pressed="${leftMode==="keep"}">जैसे हैं वैसे रहने दें</button><button data-solm="zero" aria-pressed="${leftMode==="zero"}">इन्हें 0 मानें</button></div>`:""}
    <p class="note">"पक्का करें" दबाते ही यही नया स्टॉक लग जाएगा। पुराना स्टॉक, पुरानी एक्सपायरी और पुराना खरीद भाव "ओपनिंग रिकॉर्ड" में सुरक्षित रहेंगे — कुछ मिटेगा नहीं।</p>
    <button class="big" data-soapply>✓ पक्का करें — आज से नया स्टॉक</button>
    <button class="big ghost" data-close style="margin-top:8px">← वापस, और गिनना है</button></div></div>`};
  draw();
  $("#sheet").onclick=async e=>{
    if(e.target.matches("[data-close]")){closeSheet();SO.render();return}
    const m=e.target.closest("[data-solm]");if(m){leftMode=m.dataset.solm;draw();return}
    const b=e.target.closest("[data-soapply]");if(b){b.disabled=true;b.textContent="⏳ लग रहा है…";try{await apply(leftMode)}catch(err){b.disabled=false;b.textContent="✓ पक्का करें — आज से नया स्टॉक";toast("पूरा नहीं हुआ — नेट देखकर दोबारा दबाएँ")}}
  };
}
async function apply(leftMode){
  const ts=Date.now(),date=O.date||today(),lines=[];
  for(const id of ids()){const it=item(id);let s=st(id);
    if(!s){if(leftMode!=="zero")continue;O.n[id]=0;s="zero"}
    const old=r2(qOf(it)),qty=O.off[id]?0:r2(num(O.n[id]));
    const oldCost=costOf(it),cost=O.cost[id]!=null?O.cost[id]:oldCost;
    lines.push({id,name:it.name,code:it.code||"",unit:it.unit,old,qty,diff:r2(qty-old),exp:O.exp[id]||"",oldExp:it.exp||"",
      oldNear:(window.SF&&SF.nearExp?SF.nearExp(it):"")||"",cost:r2(cost||0),oldCost:r2(oldCost||0),off:!!O.off[id],added:O.added.includes(id)});
  }
  if(!lines.length){toast("अभी कुछ नहीं गिना");throw new Error("empty")}
  const doc={date,ts,start:O.start,by:S.uid||"",byName:biller(),n:lines.length,lines,
    val:r2(lines.reduce((a,l)=>a+l.qty*l.cost,0)),mrp:r2(lines.reduce((a,l)=>{const it=item(l.id);return a+l.qty*(+(it&&it.mrp)||+(it&&it.sale)||0)},0))};
  const oid="o"+ts.toString(36);
  if(!S.demo)await S.db.collection("openings").doc(oid).set(doc);   // पहले रिकॉर्ड — फिर बदलाव
  await adjStock(lines.filter(l=>l.diff).map(l=>[l.id,l.diff]),"ओपनिंग स्टॉक "+fdate(date));
  for(const l of lines){const it=item(l.id);const p={openTs:ts,openQty:l.qty,exp:l.exp||""};
    if(l.off)p.active=false;if(l.cost>0&&l.cost!==l.oldCost)p.cost=l.cost;
    Object.assign(it,p);
    if(!S.demo){try{await S.db.doc("items/"+l.id).update(p)}catch(e){}if(p.cost)try{logPrice(l.id,"cost",l.oldCost,l.cost)}catch(e){}}
    if(l.exp&&l.qty>0){const bt={itemId:l.id,exp:l.exp,qty:l.qty,date,ts,src:"opening"};S.batches.push({id:"t"+ts+l.id,...bt});if(!S.demo)S.db.collection("batches").doc("op"+ts.toString(36)+l.id).set(bt).catch(()=>{})}
  }
  const sp={openDate:date,openTs:ts,openId:oid};Object.assign(S.settings,sp);
  if(!S.demo)try{await S.db.doc("settings/main").set(sp,{merge:true})}catch(e){}
  O=null;save();closeSheet();if(typeof camOff==="function")camOff(false);
  try{beep(true)}catch(e){}toast("🏁 ओपनिंग स्टॉक लग गया — "+lines.length+" सामान · लागत "+rs(doc.val)+" · अब बिलिंग चालू करें");
  if(window.SK)SK.render();
}

/* ---------- बटन ---------- */
document.addEventListener("click",e=>{
  const st0=e.target.closest("[data-sostart]");if(st0){SO.start();return}
  const r=e.target.closest("[data-soresume]");if(r){S.tab="stock";try{showTab()}catch(x){}SO.render();return}
  if(!O)return;
  const li=e.target.closest("[data-soi]");if(li){O.i=+li.dataset.soi;O.view="";save();SO.render();return}
  const b=e.target.closest("[data-so]");if(!b||!document.getElementById("p-stock").contains(b))return;
  const k=b.dataset.so;
  if(k==="list"){keep();O.view="list";save();SO.render();return}
  if(k==="card"){O.view="";save();SO.render();return}
  if(k==="inc"||k==="dec"){const q=$("#soQ");q.value=Math.max(0,r2(num(q.value)+(k==="inc"?1:-1)));keep();return}
  if(k==="next"){keep();const it=cur();if(it&&O.n[it.id]==null&&!O.off[it.id]){toast("कितने हैं लिखें — नहीं है तो ‘0 — नहीं है’ दबाएँ");$("#soQ").focus();return}if(O.i>=ids().length-1){finishSheet();return}go(1);return}
  if(k==="prev"){keep();go(-1);return}
  if(k==="zero"){const it=cur();keep();O.n[it.id]=0;delete O.off[it.id];save();if(O.i>=ids().length-1){SO.render();finishSheet();return}go(1);return}
  if(k==="off"){const it=cur();keep();O.off[it.id]=1;delete O.n[it.id];save();toast("🚫 "+it.name+" — पक्का करने पर बिक्री से हटेगा");if(O.i>=ids().length-1){SO.render();finishSheet();return}go(1);return}
  if(k==="finish"){finishSheet();return}
  if(k==="cancel"){if(b.dataset.sure!=="1"){b.dataset.sure="1";b.textContent="पक्का रद्द? गिना हुआ हट जाएगा";return}O=null;save();if(typeof camOff==="function")camOff(false);if(window.SK)SK.render();toast("ओपनिंग स्टॉक रद्द — कुछ नहीं बदला");return}
});
document.addEventListener("keydown",e=>{if(!O||e.key!=="Enter")return;const t=e.target;if(!t||!["soQ","soE","soC"].includes(t.id))return;e.preventDefault();
  if(t.id==="soQ"){const b=document.querySelector('[data-so="next"]');if(b)b.click()}});
document.addEventListener("input",e=>{if(O&&e.target&&e.target.id==="soQ"){const it=cur();const b=document.querySelector('[data-so="next"]');if(b)b.textContent="✓ अगला"+(String(e.target.value).trim()!==""?" ("+num(e.target.value)+")":"")}});

/* स्टॉक टैब का बटन (सिर्फ़ मालिक) */
SO.btnHTML=function(){if(!S.isOwner)return "";
  if(O)return `<button class="big so-go" data-soresume>🏁 अधूरा ओपनिंग स्टॉक जारी रखें (${doneN()}/${ids().length})</button>`;
  const od=(S.settings||{}).openDate;
  return `<button class="big ghost so-go" data-sostart>🏁 नया ओपनिंग स्टॉक शुरू करें</button>${od?`<p class="note" style="margin:4px 0 0">पिछला ओपनिंग स्टॉक: ${fdate(od)}</p>`:""}`};

const css=document.createElement("style");css.textContent=`
.so-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
.so-prog{position:relative;height:26px;border-radius:13px;background:var(--line,#e5e7eb);overflow:hidden;margin-bottom:10px}
.so-prog i{position:absolute;inset:0 auto 0 0;background:var(--grad,linear-gradient(120deg,#4f46e5,#7c3aed));border-radius:13px;transition:width .3s}
.so-prog span{position:relative;display:block;text-align:center;font-weight:800;font-size:13px;line-height:26px;color:var(--ink)}
.so-card{text-align:center}.so-card.ok{box-shadow:0 0 0 2px var(--leaf,#16a34a)}.so-card.off{opacity:.75}
.so-ph{width:150px;height:150px;margin:0 auto 6px;border-radius:20px;overflow:hidden;position:relative}.so-ph .tile{width:100%;height:100%}.so-ph .tile .em{font-size:72px}
.so-ask{color:var(--muted);font-weight:700}.so-nm{font-size:24px;margin:2px 0}.so-meta{margin:0 0 10px}
.so-q-l{font-weight:700;margin:4px 0}.so-q{display:flex;justify-content:center;align-items:center;gap:10px}
.so-q button{width:58px;height:58px;border:0;border-radius:16px;background:var(--line,#e5e7eb);font-size:30px;font-weight:800;color:var(--ink)}
.so-q .inp{width:130px;margin:0;font-size:34px;font-weight:800;text-align:center;padding:8px}
.so-card .row2{text-align:left}.so-old{margin:4px 0 10px}
.so-b3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px}.so-b3 .big{font-size:13px;padding:10px 4px}
.so-go{margin:10px 0 0}`;
document.head.appendChild(css);
})();
