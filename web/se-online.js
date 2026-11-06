/* 177 MH कैंटीन — 🛵 घर बैठे ऑर्डर: दुकान वाला हिस्सा (se-online.js, window.SON) · नियम: docs/ऑनलाइन-दुकान-प्रॉम्प्ट.txt
   • pub/rates: सार्वजनिक भाव-सूची — 🔒 तम्बाकू कभी नहीं, 🌐 छिपाए सामान नहीं, स्टॉक है/नहीं, MRP, श्रेणी, सेटिंग
   • ऑर्डर: तुरंत बीप, स्वीकार होने तक हर 45 सेकंड याद · स्वीकार → पैक → रास्ते में → पहुँचा · ग्राहक के फोन पर ट्रैकिंग (pub/ot_<id>)
   • ⚙️ 🛵 ऑनलाइन दुकान: चालू/बंद, सिर्फ़ स्टॉक वाले, कम से कम ऑर्डर, डिलीवरी शुल्क, मुफ़्त सीमा, समय, लिंक + QR */
(function(){
"use strict";
const SON=window.SON={};
const num=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:0};
const LSx={get:k=>{try{return localStorage.getItem(k)||""}catch(e){return ""}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const base=()=>String((window.SE_CONFIG||{}).updateUrl||location.href.replace(/[^/]*$/,"")).replace(/\/?$/,"/");
SON.link=()=>base()+"order/";
const wa=(t,ph)=>"https://wa.me/"+(String(ph||"").replace(/\D/g,"").length===10?"91"+String(ph).replace(/\D/g,""):"")+"?text="+encodeURIComponent(t);
const DEF={on:true,stockOnly:true,min:0,fee:0,freeAbove:0,eta:30,open:"08:00",close:"21:00",del:true,pick:true};
SON.cfg=()=>({...DEF,...((S.settings&&S.settings.online)||{})});
SON.save=async function(p){const c={...SON.cfg(),...p};S.settings={...(S.settings||{}),online:c};
  try{if(!S.demo&&S.db)await S.db.doc("settings/main").set({online:c},{merge:true})}catch(e){toast("सेव नहीं हुआ — सिर्फ़ विक्रम जी बदल सकते हैं");return}SON.publish(true)};

/* ================= 📢 सार्वजनिक भाव-सूची (pub/rates) ================= */
SON.inStock=it=>!it.track?1:((+(S.pstock&&S.pstock[it.id]&&S.pstock[it.id].qty)||0)>0?1:0);
SON.list=function(){const top=S.top7||{};
  return S.items.filter(i=>i.active!==false&&!i.virtual&&!i.pending&&!i.noOnline&&num(i.sale)>0&&i.id!=="xyz"&&!(typeof isTob==="function"&&isTob(i))&&!i.secret&&i.sub!=="tob")
    .map(i=>{const ps=SE.photoSrc(i);const o={id:i.id,n:SE.capNm(i.short||i.name),u:i.unit||"pc",s:num(i.sale),c:i.cat||"",k:SON.inStock(i)};
      if(num(i.mrp)>num(i.sale))o.m=num(i.mrp);if(i.hi)o.hi=String(i.hi).slice(0,40);const en=window.SN&&SN.en?SN.en(i):"";if(en)o.e=en;if(i.sub)o.sb=i.sub;
      if(ps&&!/^data:/.test(ps))o.p=ps;if(i.emoji)o.em=i.emoji;if(num(i.hue))o.h=num(i.hue);if(i.size)o.sz=String(i.size).slice(0,16);if(top[i.id])o.t=Math.round(top[i.id]);return o})};
SON.publish=async function(force){if(S.demo||!S.db||!(S.isOwner||S.uid))return;
  const c=SON.cfg(),L=SON.list(),cfg={...c,phone:String(S.settings.ownerPh||S.settings.shopPh||"").replace(/\D/g,"").slice(-10),upi:typeof upiId==="function"?upiId():""};
  const h=JSON.stringify([cfg,L]).length+":"+JSON.stringify(L.map(i=>[i.id,i.s,i.k,i.p||"",i.m||0])).replace(/[^0-9a-z]/gi,"").slice(-4000);
  if(!force&&LSx.get("son_h")===h&&Date.now()-(+LSx.get("son_t")||0)<6*3600e3)return;
  try{await S.db.collection("pub").doc("rates").set({type:"rates",items:L,cfg,ts:Date.now(),phone:cfg.phone});LSx.set("son_h",h);LSx.set("son_t",String(Date.now()))}catch(e){}};
/* पुराना SX.pubRates भी अब यही (तम्बाकू वाली गलती पूरी तरह बंद) */
if(window.SX)SX.pubRates=SON.publish;

/* ================= 📥 ऑर्डर ================= */
const ACTIVE=["new","billing","acc","pack","out"];
SON.parse=function(o){const n=String(o.note||"");if(!n.includes("¦"))return {note:n};const [meta,rest]=n.split("¦");const p=meta.split("|");const r={note:rest||""};
  p.forEach(x=>{if(x==="🛵")r.mode="d";else if(x==="🏪")r.mode="p";else if(x==="💵")r.pay="नकद";else if(x==="📱")r.pay="UPI";else if(x.startsWith("⏰"))r.when=x.slice(1).trim();else if(x.startsWith("📍"))r.ll=x.slice(2);else if(x.startsWith("₹"))r.total=num(x.slice(1))});return r};
const ST={new:["🆕","नया"],billing:["🧾","बिल बन रहा"],acc:["✓","स्वीकार"],pack:["📦","पैक"],out:["🛵","रास्ते में"],done:["✅","पहुँचा"],cancel:["✕","रद्द"]};
SON.watch=function(){if(S.demo||!S.db||SON._un)return;
  try{SON._un=S.db.collection("orders").where("status","in",ACTIVE).onSnapshot(s=>{SX.orders=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>num(b.ts)-num(a.ts));SX.orderPill();
    if($("#sheet .son-sheet"))SON.sheet()},()=>{})}catch(e){}};
if(window.SX){SX.watchOrders=SON.watch;SX.ordersSheet=()=>SON.sheet()}
/* कदम: Firestore ऑर्डर + ग्राहक की ट्रैकिंग (pub/ot_<id>, सिर्फ़ स्थिति — कोई निजी जानकारी नहीं) */
SON.step=async function(id,st,extra){extra=extra||{};const o=(SX.orders||[]).find(x=>x.id===id)||{};const rom=t=>window.SRc&&SRc.roman?SRc.roman(String(t||"")):String(t||"");const by=rom(String(biller()||"").split(/\s+/)[0]);/* ग्राहक-पेज अंग्रेज़ी में — नाम रोमन (मनोहर → Manohar) */
  const etaTs=extra.mins?Date.now()+extra.mins*60000:(o.etaTs||0);
  const pubSt={new:"new",billing:"pack",acc:"acc",pack:"pack",out:"out",done:"done",cancel:"cancel"}[st]||st;
  const msg=extra.msg?rom(extra.msg):(st==="out"&&extra.rider?"🛵 "+rom(extra.rider)+" is bringing your order":st==="pack"?"Your items are being packed":"");
  try{if(!S.demo&&S.db){await S.db.collection("orders").doc(id).update({status:st,dts:Date.now(),byName:biller()||"",...(etaTs?{etaTs}:{}),...(extra.rider?{rider:extra.rider}:{}),...(extra.billNo?{billNo:extra.billNo}:{}),...(extra.reason?{reason:extra.reason}:{})});
      await S.db.collection("pub").doc("ot_"+id).set({st:pubSt,ts:Date.now(),by,...(etaTs?{eta:etaTs}:{}),...(msg?{msg}:{}),...(extra.billNo?{billNo:extra.billNo}:{})},{merge:true})}}
  catch(e){toast("नहीं हुआ: "+(e.code||e.message||""));return false}
  toast(({acc:"✓ ऑर्डर स्वीकार — ग्राहक को दिख रहा",pack:"📦 पैक हो रहा",out:"🛵 रास्ते में",done:"✅ ऑर्डर पूरा",cancel:"✕ रद्द"})[st]||"✓");return true};
if(window.SX)SX.orderSet=(id,status,extra)=>SON.step(id,status,extra);
const ago=ts=>{const m=Math.floor((Date.now()-num(ts))/60000);return m<1?"अभी":m<60?m+" मि पहले":Math.floor(m/60)+" घं पहले"};
SON.sheet=function(){const L=SX.orders||[];const link=SON.link();
  const card=o=>{const p=SON.parse(o),st=o.status||"new",[ic,tx]=ST[st]||["",st],old=st==="new"&&Date.now()-num(o.ts)>3*60000;
    const items=(o.items||[]).map(x=>`${esc(SE.capNm(x.n))} <b>${fq(num(x.q),x.u||"pc")}</b>`).join(" · ");
    const est=p.total||(o.items||[]).reduce((a,x)=>a+num(x.q)*num(x.s),0);const eta=o.etaTs?new Date(o.etaTs).toLocaleTimeString("hi-IN",{hour:"numeric",minute:"2-digit"}):"";
    return `<div class="card2 son-o ${st}${old?" late":""}"><div class="son-h"><span class="son-st">${ic} ${tx}</span><b>${esc(o.name||"ग्राहक")}</b><small>${ago(o.ts)}${eta?" · ⏱️ "+eta:""}</small></div>
    <div class="son-m">${p.mode==="p"?"🏪 दुकान से लेंगे":"🛵 घर पहुँचाना"} · ${p.pay?(p.pay==="UPI"?"📱 UPI":"💵 नकद"):""} · ⏰ ${esc(p.when||"अभी")} · <b>≈ ${rs(Math.round(est))}</b></div>
    ${o.addr&&p.mode!=="p"?`<div class="son-a">📍 ${esc(o.addr)}${p.ll?` · <a href="https://www.google.com/maps/search/?api=1&query=${esc(p.ll)}" target="_blank" rel="noopener">नक्शा ↗</a>`:""}</div>`:""}
    <div class="son-i">${items}</div>${p.note?`<div class="son-a">📝 ${esc(p.note)}</div>`:""}${o.rider?`<div class="son-a">🛵 ${esc(o.rider)}</div>`:""}
    <div class="son-b">${st==="new"?`<span class="son-l">स्वीकार:</span>${[15,30,45].map(m=>`<button data-sona="${esc(o.id)}" data-mins="${m}">✓ ${m} मि</button>`).join("")}`
      :st==="acc"||st==="billing"?`<button data-sonst="pack" data-id="${esc(o.id)}">📦 पैक हो गया</button>`
      :st==="pack"?(p.mode==="p"?`<button data-sonst="done" data-id="${esc(o.id)}">✅ ग्राहक ले गया</button>`:`<button data-sonout="${esc(o.id)}">🛵 भेज दिया</button>`)
      :st==="out"?`<button data-sonst="done" data-id="${esc(o.id)}">✅ पहुँच गया</button>`:""}
      ${st!=="billing"?`<button class="g" data-sxobill="${esc(o.id)}">🧾 बिल</button>`:""}
      <a class="g" href="tel:+91${esc(o.phone||"")}">📞</a><a class="g" target="_blank" rel="noopener" href="${wa(`🙏 नमस्ते ${o.name||""} जी, 177 MH कैंटीन — आपका ऑर्डर ${st==="new"?"मिल गया":"तैयार हो रहा"} है।${eta?" लगभग "+eta+" तक।":""}`,o.phone)}">💬</a>
      <button class="g r" data-sonx="${esc(o.id)}">✕</button></div></div>`};
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px son-sheet" role="dialog" aria-label="ग्राहकों के ऑर्डर"><div class="grab"></div>
  <div class="sh-head"><div><h3>📥 घर बैठे ऑर्डर (${L.length})</h3><span class="note">नया ऑर्डर तुरंत स्वीकार करें — ग्राहक अपने फोन पर देख रहा है</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
  ${L.length?L.map(card).join(""):'<div class="empty">अभी कोई ऑर्डर नहीं 🙂</div>'}
  <div class="son-ft"><button class="big ghost" data-sxolink>🔗 लिंक भेजें</button><button class="big ghost" data-sxposter>🖨️ QR पोस्टर</button></div>
  <p class="note" style="text-align:center;margin:6px 0 0">${esc(link)}</p></div></div>`};
document.addEventListener("click",async e=>{const t=e.target;let b;
  if((b=t.closest("[data-sona]"))){b.disabled=true;await SON.step(b.dataset.sona,"acc",{mins:+b.dataset.mins});SON.alarm();return}
  if((b=t.closest("[data-sonst]"))){b.disabled=true;await SON.step(b.dataset.id,b.dataset.sonst);return}
  if((b=t.closest("[data-sonout]"))){const r=prompt("कौन ले जा रहा है? (नाम)",LSx.get("son_rider")||String(biller()||"").split(/\s+/)[0]);if(r===null)return;LSx.set("son_rider",r.trim());await SON.step(b.dataset.sonout,"out",{rider:r.trim().slice(0,20)});return}
  if((b=t.closest("[data-sonx]"))){const r=prompt("रद्द क्यों? (ग्राहक को अंग्रेज़ी में दिखेगा)","Item out of stock");if(r===null)return;await SON.step(b.dataset.sonx,"cancel",{reason:r.slice(0,60),msg:r.slice(0,60)});return}
  if((b=t.closest("[data-sonon]"))){SON.save({[b.dataset.sonon]:!SON.cfg()[b.dataset.sonon]});try{renderSettings()}catch(x){}return}
  if(t.closest("[data-sonpub]")){await SON.publish(true);toast("✓ ग्राहक-पेज पर आज के भाव और स्टॉक भेज दिए");return}
  if((b=t.closest("[data-noonline]"))){const it=item(b.dataset.noonline);if(!it)return;const v=!it.noOnline;it.noOnline=v;
    try{if(!S.demo&&S.db)await S.db.collection("items").doc(it.id).update({noOnline:v})}catch(x){}b.setAttribute("aria-pressed",String(!v));toast(v?"🌐 ऑनलाइन से छिपाया":"🌐 ऑनलाइन दिखेगा");SON.publish(true)}});
/* बिल सेव हुआ (SX.checkOrderDone) → पहुँचा/पूरा, बिल नंबर ग्राहक को */

/* 🔔 जब तक कोई स्वीकार न करे — हर 45 सेकंड बीप (दुकान में शोर हो तब भी छूटे नहीं) */
SON.alarm=function(){clearInterval(SON._al);SON._al=setInterval(()=>{const n=(SX.orders||[]).filter(o=>o.status==="new").length;if(!n){clearInterval(SON._al);SON._al=0;return}
  try{beep(true);setTimeout(()=>beep(true),300)}catch(e){}try{if(navigator.vibrate)navigator.vibrate([150,80,150])}catch(e){}},45000)};
const op=window.SX&&SX.orderPill;if(op)SX.orderPill=function(){op.apply(this,arguments);if((SX.orders||[]).some(o=>o.status==="new")&&!SON._al)SON.alarm()};

/* ================= ⚙️ 🛵 ऑनलाइन दुकान ================= */
SON.settingsHTML=function(){if(!S.isOwner&&!S.demo)return "";const c=SON.cfg(),L=SON.list(),out=L.filter(i=>i.k===0).length,tob=S.items.filter(i=>i.active!==false&&typeof isTob==="function"&&isTob(i)).length;
  const sw=(k,t)=>`<button type="button" class="chip" data-sonon="${k}" aria-pressed="${!!c[k]}">${c[k]?"✅":"⬜"} ${t}</button>`;
  return `<div class="card2 son-set" id="sonSet"><h3>🛵 ऑनलाइन दुकान (घर बैठे ऑर्डर)</h3>
  <div class="son-k"><div><span>ग्राहक को दिख रहे</span><b>${c.stockOnly?L.length-out:L.length}</b></div><div><span>स्टॉक ख़त्म</span><b>${out}</b></div><div><span>🔒 तम्बाकू (कभी नहीं)</span><b>${tob}</b></div></div>
  <div class="seg son-sw">${sw("on","ऑनलाइन ऑर्डर चालू")}${sw("stockOnly","सिर्फ़ स्टॉक वाले सामान दिखाएँ")}${sw("del","🛵 घर पहुँचाना")}${sw("pick","🏪 दुकान से लेना")}</div>
  <div class="son-f">${[["min","कम से कम ऑर्डर ₹"],["fee","डिलीवरी शुल्क ₹"],["freeAbove","इतने से ऊपर मुफ़्त ₹"],["eta","पहुँचने का समय (मि)"]].map(([k,t])=>`<label class="fld">${t}<input class="inp" inputmode="numeric" data-sonf="${k}" value="${num(c[k])||""}" placeholder="0"></label>`).join("")}
    <label class="fld">दुकान खुलती<input class="inp" type="time" data-sonf="open" value="${esc(c.open)}"></label><label class="fld">बंद होती<input class="inp" type="time" data-sonf="close" value="${esc(c.close)}"></label></div>
  <div class="son-ln"><code>${esc(SON.link())}</code></div>
  <div class="row2" style="margin:0"><a class="big ghost" href="${esc(SON.link())}" target="_blank" rel="noopener">👀 ग्राहक-पेज देखें</a><button class="big ghost" data-sxolink>💬 WhatsApp पर भेजें</button></div>
  <div class="row2" style="margin:0"><button class="big ghost" data-sxposter>🖨️ दुकान के लिए QR पोस्टर</button><button class="big ghost" data-sonpub>🔄 भाव/स्टॉक अभी भेजें</button></div>
  <p class="note" style="margin:0">हर सामान को ऑनलाइन से छिपाने के लिए नीचे सामान की पंक्ति में 🌐 दबाएँ। सिगरेट-तम्बाकू अपने-आप कभी नहीं दिखते।</p></div>`};
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||!t.dataset.sonf)return;const k=t.dataset.sonf;SON.save({[k]:k==="open"||k==="close"?t.value:num(t.value)})});

const css=document.createElement("style");css.textContent=`
.son-o{display:grid;gap:5px;border-left:4px solid var(--line)}.son-o.new{border-left-color:var(--chili);animation:sonp 1.6s infinite}.son-o.acc,.son-o.billing{border-left-color:var(--haldi)}.son-o.pack{border-left-color:#3b82f6}.son-o.out{border-left-color:var(--leaf)}
@keyframes sonp{50%{box-shadow:0 0 0 3px rgba(239,68,68,.25)}}.son-o.late .son-h small{color:var(--chili);font-weight:800}
.son-h{display:flex;align-items:baseline;gap:8px}.son-h b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:16px}.son-h small{font-size:12px;color:var(--muted)}
.son-st{font-size:12px;font-weight:900;padding:2px 8px;border-radius:99px;background:var(--bg)}.son-o.new .son-st{background:var(--chili);color:#fff}
.son-m,.son-a{font-size:13px;color:var(--muted)}.son-a a{color:var(--leaf);font-weight:800}.son-i{font-size:14px;line-height:1.5}
.son-b{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.son-l{font-size:12px;font-weight:800;color:var(--muted)}
.son-b button,.son-b a{border:0;border-radius:10px;padding:8px 11px;font-weight:900;font-size:14px;background:var(--leaf);color:#fff;text-decoration:none}
.son-b .g{background:var(--bg);color:var(--ink);border:1.5px solid var(--line);padding:7px 10px}.son-b .r{color:var(--chili)}.son-b button:disabled{opacity:.5}
.son-ft{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.son-set{display:grid;gap:10px}.son-k{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.son-k div{background:var(--bg);border-radius:10px;padding:6px;display:grid}.son-k span{font-size:11px;color:var(--muted)}.son-k b{font-size:18px}
.son-sw{display:flex;flex-wrap:wrap;gap:6px;margin:0}.son-f{display:grid;grid-template-columns:1fr 1fr;gap:6px}.son-ln code{display:block;font-size:12px;word-break:break-all;background:var(--bg);padding:8px;border-radius:8px}`;document.head.appendChild(css);

/* बदलाव पर अपने-आप दोबारा भेजो (हर 2 मिनट जाँच — सिर्फ़ बदला हो तब) */
setInterval(()=>{try{if(typeof S!=="undefined"&&S.db&&!S.demo&&S.items&&S.items.length)SON.publish(false)}catch(e){}},120000);
})();
