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
/* 📸 ग्राहक-पेज की फोटो: pub/phx {n,v} + pub/ph_<k> {m:{id:112px JPEG}} — 40-40 के टुकड़े, सिर्फ़ सार्वजनिक सूची वाले सामान */
const thumb=src=>new Promise(res=>{const im=new Image();im.onload=()=>{const S2=112,c=document.createElement("canvas");c.width=c.height=S2;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,S2,S2);
  const sc=Math.min(S2/im.width,S2/im.height),w=im.width*sc,h=im.height*sc;x.drawImage(im,(S2-w)/2,(S2-h)/2,w,h);res(c.toDataURL("image/jpeg",.62))};im.onerror=()=>res("");im.src=src});
SON.publishPhotos=async function(force){if(S.demo||!S.db||!S.isOwner||SON._pp)return;
  const L=SON.list().filter(i=>SE.photos[i.id]),v=L.map(i=>i.id+":"+String(SE.photos[i.id]).length).join(",");const h=String(v.length)+":"+v.slice(-200)+L.length;
  if(!force&&LSx.get("son_ph")===h)return;SON._pp=1;
  try{const out={};for(const i of L){const t=await thumb(SE.photos[i.id]);if(t)out[i.id]=t}
    const ids=Object.keys(out),n=Math.ceil(ids.length/40);
    for(let k=0;k<n;k++){const m={};ids.slice(k*40,k*40+40).forEach(id=>m[id]=out[id]);await S.db.collection("pub").doc("ph_"+k).set({m,ts:Date.now()})}
    await S.db.collection("pub").doc("phx").set({n,v:String(Date.now()),count:ids.length,ts:Date.now()});LSx.set("son_ph",h)}catch(e){}finally{SON._pp=0}};
/* पुराना SX.pubRates भी अब यही (तम्बाकू वाली गलती पूरी तरह बंद) */
if(window.SX)SX.pubRates=SON.publish;

/* ================= 📥 ऑर्डर ================= */
const ACTIVE=["new","billing","acc","pack","out"];
SON.parse=function(o){const n=String(o.note||"");if(!n.includes("¦"))return {note:n};const [meta,rest]=n.split("¦");const p=meta.split("|");const r={note:rest||""};
  p.forEach(x=>{if(x==="🛵")r.mode="d";else if(x==="🏪")r.mode="p";else if(x==="💵")r.pay="नकद";else if(x==="📱")r.pay="UPI";else if(x.startsWith("⏰"))r.when=x.slice(1).trim();else if(x.startsWith("📍"))r.ll=x.slice(2);else if(x.startsWith("☎️"))r.alt=x.slice(2).replace(/\D/g,"");else if(x.startsWith("₹"))r.total=num(x.slice(1))});return r};
const ST={new:["🆕","नया"],billing:["🧾","बिल बन रहा"],acc:["✓","स्वीकार"],pack:["📦","पैक"],out:["🛵","रास्ते में"],done:["✅","पहुँचा"],cancel:["✕","रद्द"]};
SON.accts=[];
SON.watch=function(){if(S.demo||!S.db||SON._un)return;
  try{SON._un=S.db.collection("orders").where("status","in",ACTIVE).onSnapshot(s=>{const all=s.docs.map(d=>({id:d.id,...d.data()}));
    /* 👤 नया खाता / नंबर बदला — ऑर्डर नहीं: अलार्म नहीं, सूचना + "acct" */
    all.filter(o=>o.src==="signup"&&o.status==="new").forEach(o=>{SON.seenAcct(o);S.db.collection("orders").doc(o.id).update({status:"acct",seenTs:Date.now()}).catch(()=>{})});
    SX.orders=all.filter(o=>o.src!=="signup").sort((a,b)=>num(b.ts)-num(a.ts));SX.orderPill();
    if($("#sheet .son-sheet"))SON.sheet()},()=>{});
    SON._ua=S.db.collection("orders").where("src","==","signup").onSnapshot(s=>{SON.accts=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>num(b.ts)-num(a.ts)).slice(0,200)},()=>{})}catch(e){}};
SON.old=o=>{const m=String(o.note||"").match(/old:(\d{10})/);return m?m[1]:""};
SON.seenAcct=function(o){const k="son_seen_"+o.id;if(LSx.get(k))return;LSx.set(k,"1");const old=SON.old(o);
  try{beep(true)}catch(e){}toast(old?`📱 ${o.name||"ग्राहक"} ने नंबर बदला: ${old} → ${o.phone}`:`👤 नया ऑनलाइन खाता: ${o.name||""} · ${o.phone}`)};
SON.acctHTML=function(max){const A=SON.accts||[];if(!A.length)return `<p class="note" style="margin:0">अभी कोई ऑनलाइन खाता नहीं बना।</p>`;
  const today0=new Date();today0.setHours(0,0,0,0);const nT=A.filter(o=>num(o.ts)>=today0.getTime()).length;
  return `<p class="note" style="margin:0 0 4px">कुल ${A.length} · आज ${nT} — इनसे फोन करके पूछ सकते हैं, ऑर्डर में कोई दिक्कत तो नहीं</p><div class="son-acl">${A.slice(0,max||30).map(o=>{const old=SON.old(o);
    return `<div class="son-ac"><div><b>${esc(o.name||"—")}</b><span>${old?`📱 नंबर बदला: <s>${esc(old)}</s> → `:"👤 नया खाता · "}${esc(o.phone)} · ${ago(o.ts)}</span></div>
    <a href="tel:+91${esc(o.phone)}" aria-label="कॉल">📞</a><a target="_blank" rel="noopener" href="${wa("🙏 नमस्ते "+(o.name||"")+" जी, 177 MH Canteen में आपका स्वागत है! ऑर्डर में कोई मदद चाहिए तो बताइए।",o.phone)}" aria-label="WhatsApp">💬</a></div>`}).join("")}</div>`};
if(window.SX){SX.watchOrders=SON.watch;SX.ordersSheet=()=>SON.sheet()}
/* कदम: Firestore ऑर्डर + ग्राहक की ट्रैकिंग (pub/ot_<id>, सिर्फ़ स्थिति — कोई निजी जानकारी नहीं) */
SON.step=async function(id,st,extra){extra=extra||{};const o=(SX.orders||[]).find(x=>x.id===id)||{};const rom=t=>window.SRc&&SRc.roman?SRc.roman(String(t||"")):String(t||"");const by=rom(String(biller()||"").split(/\s+/)[0]);/* ग्राहक-पेज अंग्रेज़ी में — नाम रोमन (मनोहर → Manohar) */
  const etaTs=extra.mins?Date.now()+extra.mins*60000:(o.etaTs||0);
  const pubSt={new:"new",billing:"pack",acc:"acc",pack:"pack",out:"out",done:"done",cancel:"cancel"}[st]||st;
  const msg=extra.msg?rom(extra.msg):(st==="out"&&extra.rider?"🛵 "+rom(extra.rider)+" is bringing your order":st==="pack"?"Your items are being packed":"");
  try{if(!S.demo&&S.db){await S.db.collection("orders").doc(id).update({status:st,dts:Date.now(),byName:biller()||"",...(etaTs?{etaTs}:{}),...(extra.rider?{rider:extra.rider}:{}),...(extra.billNo?{billNo:extra.billNo}:{}),...(extra.reason?{reason:extra.reason}:{})});
      const pp=window.SA&&SA.points&&o.phone?SA.points(String(o.phone).replace(/\D/g,"").slice(-10)):null;/* 🎁 ग्राहक को उसके पॉइंट दिखें (सिर्फ़ गिनती) */
      await S.db.collection("pub").doc("ot_"+id).set({st:pubSt,ts:Date.now(),by,...(pp?{pts:pp.left,ptsPer:+((S.settings&&S.settings.pts&&S.settings.pts.per)||100)}:{}),...(etaTs?{eta:etaTs}:{}),...(msg?{msg}:{}),...(extra.billNo?{billNo:extra.billNo}:{})},{merge:true})}}
  catch(e){toast("नहीं हुआ: "+(e.code||e.message||""));return false}
  toast(({acc:"✓ ऑर्डर स्वीकार — ग्राहक को दिख रहा",pack:"📦 पैक हो रहा",out:"🛵 रास्ते में",done:"✅ ऑर्डर पूरा",cancel:"✕ रद्द"})[st]||"✓");return true};
if(window.SX)SX.orderSet=(id,status,extra)=>SON.step(id,status,extra);
const ago=ts=>{const m=Math.floor((Date.now()-num(ts))/60000);return m<1?"अभी":m<60?m+" मि पहले":Math.floor(m/60)+" घं पहले"};
SON.sheet=function(){const L=SX.orders||[];const link=SON.link();
  const card=o=>{const p=SON.parse(o),st=o.status||"new",[ic,tx]=ST[st]||["",st],old=st==="new"&&Date.now()-num(o.ts)>3*60000;
    const items=(window.SRK?SRK.sortItems(o.items||[]):(o.items||[])).map(x=>{const r=window.SRK?SRK.norm((item(x.id)||{}).rack):"";return `${r?`<i class="son-rk">📍${esc(r)}</i> `:""}${esc(SE.capNm(x.n))} <b>${fq(num(x.q),x.u||"pc")}</b>`}).join(" · ");/* 📍 रैक के क्रम में — एक चक्कर में पूरा ऑर्डर */
    const est=p.total||(o.items||[]).reduce((a,x)=>a+num(x.q)*num(x.s),0);const eta=o.etaTs?new Date(o.etaTs).toLocaleTimeString("hi-IN",{hour:"numeric",minute:"2-digit"}):"";
    return `<div class="card2 son-o ${st}${old?" late":""}"><div class="son-h"><span class="son-st">${ic} ${tx}</span><b>${esc(o.name||"ग्राहक")}</b><small>${ago(o.ts)}${eta?" · ⏱️ "+eta:""}</small></div>
    <div class="son-m">${p.mode==="p"?"🏪 दुकान से लेंगे":"🛵 घर पहुँचाना"} · ${p.pay?(p.pay==="UPI"?"📱 UPI":"💵 नकद"):""} · ⏰ ${esc(p.when||"अभी")} · <b>≈ ${rs(Math.round(est))}</b></div>
    ${o.addr&&p.mode!=="p"?`<div class="son-a">📍 ${esc(o.addr)}${p.ll?` · <a href="https://www.google.com/maps/search/?api=1&query=${esc(p.ll)}" target="_blank" rel="noopener">नक्शा ↗</a>`:""}</div>`:""}
    <div class="son-i">${items}</div>${p.note?`<div class="son-a">📝 ${esc(p.note)}</div>`:""}${p.alt?`<div class="son-a">☎️ कॉल के लिए: <a href="tel:+91${esc(p.alt)}">${esc(p.alt)}</a></div>`:""}${o.rider?`<div class="son-a">🛵 ${esc(o.rider)}</div>`:""}
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
  <details class="card2 son-acc"><summary><b>👤 ऑनलाइन खाते (${(SON.accts||[]).length})</b></summary>${SON.acctHTML(30)}</details>
  <div class="son-ft"><button class="big ghost" data-sxolink>🔗 लिंक भेजें</button><button class="big ghost" data-sonqr>📲 QR कार्ड</button></div>
  <p class="note" style="text-align:center;margin:6px 0 0">${esc(link)}</p></div></div>`};
document.addEventListener("click",async e=>{const t=e.target;let b;
  if((b=t.closest("[data-sona]"))){b.disabled=true;await SON.step(b.dataset.sona,"acc",{mins:+b.dataset.mins});SON.alarm();return}
  if((b=t.closest("[data-sonst]"))){b.disabled=true;await SON.step(b.dataset.id,b.dataset.sonst);return}
  if((b=t.closest("[data-sonout]"))){const r=prompt("कौन ले जा रहा है? (नाम)",LSx.get("son_rider")||String(biller()||"").split(/\s+/)[0]);if(r===null)return;LSx.set("son_rider",r.trim());await SON.step(b.dataset.sonout,"out",{rider:r.trim().slice(0,20)});return}
  if((b=t.closest("[data-sonx]"))){const r=prompt("रद्द क्यों? (ग्राहक को अंग्रेज़ी में दिखेगा)","Item out of stock");if(r===null)return;await SON.step(b.dataset.sonx,"cancel",{reason:r.slice(0,60),msg:r.slice(0,60)});return}
  if((b=t.closest("[data-sonon]"))){SON.save({[b.dataset.sonon]:!SON.cfg()[b.dataset.sonon]});try{renderSettings()}catch(x){}return}
  if(t.closest("[data-sonqr]")){SON.qrSheet();return}
  if((b=t.closest("[data-sonqrsh]"))){SON.qrShare(b.dataset.sonqrsh);return}
  if(t.closest("[data-sonpub]")){await SON.publish(true);toast("✓ ग्राहक-पेज पर आज के भाव और स्टॉक भेज दिए");return}
  if((b=t.closest("[data-noonline]"))){const it=item(b.dataset.noonline);if(!it)return;const v=!it.noOnline;it.noOnline=v;
    try{if(!S.demo&&S.db)await S.db.collection("items").doc(it.id).update({noOnline:v})}catch(x){}b.setAttribute("aria-pressed",String(!v));toast(v?"🌐 ऑनलाइन से छिपाया":"🌐 ऑनलाइन दिखेगा");SON.publish(true)}});
/* बिल सेव हुआ (SX.checkOrderDone) → पहुँचा/पूरा, बिल नंबर ग्राहक को */

/* 🔔 जब तक कोई स्वीकार न करे — हर 45 सेकंड बीप (दुकान में शोर हो तब भी छूटे नहीं) */
SON.alarm=function(){clearInterval(SON._al);SON._al=setInterval(()=>{const n=(SX.orders||[]).filter(o=>o.status==="new").length;if(!n){clearInterval(SON._al);SON._al=0;return}
  try{beep(true);setTimeout(()=>beep(true),300)}catch(e){}try{if(navigator.vibrate)navigator.vibrate([150,80,150])}catch(e){}},45000)};
const op=window.SX&&SX.orderPill;if(op)SX.orderPill=function(){op.apply(this,arguments);if((SX.orders||[]).some(o=>o.status==="new")&&!SON._al)SON.alarm()};

/* ================= 📲 घर-घर का QR कार्ड (छापकर हर घर पर — स्कैन करो, ऑर्डर करो) ================= */
SON.qrCanvas=async function(){const link=SON.link(),W=1240,H=1748,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  try{await document.fonts.load('800 60px "Baloo 2"');await document.fonts.load('700 40px "Mukta"')}catch(e){}
  const F=(w,px,f)=>`${w} ${px}px ${f||'"Baloo 2","Mukta",sans-serif'}`,ctr=(t,y,f,col)=>{x.font=f;x.fillStyle=col||"#14181c";x.textAlign="center";x.fillText(t,W/2,y)};
  const rr=(X,Y,w,h,r)=>{x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()};
  x.fillStyle="#fffdf5";x.fillRect(0,0,W,H);
  x.fillStyle="#f8cb46";x.fillRect(0,0,W,400);x.fillStyle="#0c831f";x.fillRect(0,400,W,16);
  try{const im=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src="icon.png"});x.save();rr(W/2-70,40,140,140,30);x.clip();x.drawImage(im,W/2-70,40,140,140);x.restore()}catch(e){}
  ctr("177 MH Canteen",262,F(800,92),"#1a1a1a");ctr("Military Hospital · Akashvani Road, Barmer",330,F(700,40),"#3b3b2f");ctr("मिलिट्री हॉस्पिटल कैंटीन",385,F(700,38),"#3b3b2f");
  ctr("घर बैठे ऑर्डर करें",520,F(800,96),"#0a6b19");ctr("Scan · Order · Get it at your door 🛵",590,F(700,44),"#14181c");
  x.fillStyle="#fff";x.strokeStyle="#0c831f";x.lineWidth=10;rr(W/2-410,640,820,820,48);x.fill();x.stroke();
  let m=null;try{const q=new QRCode(document.createElement("div"),{text:link,width:64,height:64,correctLevel:QRCode.CorrectLevel?QRCode.CorrectLevel.H:2});m=q&&q._oQRCode}catch(e){}
  if(!m)throw new Error("QR");const n=m.getModuleCount(),cs=Math.floor(720/n),o0=Math.round(W/2-cs*n/2),o1=Math.round(1050-cs*n/2);x.fillStyle="#0b3d14";
  for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(m.isDark(r,k))x.fillRect(o0+k*cs,o1+r*cs,cs,cs);
  x.fillStyle="#fff";rr(W/2-76,974,152,152,28);x.fill();try{const im=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src="icon.png"});x.drawImage(im,W/2-58,992,116,116)}catch(e){}
  ctr("📷 कैमरा खोलें → QR पर रखें → ऑर्डर करें",1530,F(700,44));
  ctr("🍬 मिठाई · 🥟 नाश्ता · 🛒 किराना · 🥛 दूध",1600,F(700,42),"#3b3b2f");
  const ph=String((S.settings&&(S.settings.ownerPh||S.settings.shopPh))||"").replace(/\D/g,"").slice(-10);
  x.fillStyle="#0c831f";x.fillRect(0,H-100,W,100);ctr((ph?"📞 "+ph+"  ·  ":"")+link.replace(/^https?:\/\//,""),H-36,F(700,36),"#fff");
  return c};
SON.qrSheet=async function(){toast("📲 QR कार्ड बन रहा है…");let c;try{c=await SON.qrCanvas()}catch(e){toast("QR नहीं बना");return}SON._qr=c;
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" role="dialog" aria-label="QR कार्ड"><div class="grab"></div><div class="sh-head"><h3>📲 घर-घर का QR कार्ड</h3><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <img src="${c.toDataURL("image/jpeg",.9)}" alt="QR कार्ड" style="width:100%;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.12)">
    <p class="note">इसे छपवाकर हर घर/क्वार्टर पर लगाएँ — ग्राहक कैमरे से स्कैन करके सीधा ऑर्डर पेज खोलेगा। आकार A6 (पोस्टकार्ड) — A4 पर 4 भी छप सकते हैं।</p>
    <div class="row2" style="margin:0"><button class="big" data-sonqrsh="share">📤 WhatsApp / शेयर</button><button class="big ghost" data-sonqrsh="save">⬇️ फोटो सेव</button></div></div></div>`;
  $("#sheet").onclick=e=>{if(e.target.matches("[data-close]")||e.target.closest(".x[data-close]"))closeSheet()}};
SON.qrShare=async function(how){const c=SON._qr||await SON.qrCanvas(),name="MH177_Order_QR.png",txt="🛵 177 MH Canteen — घर बैठे ऑर्डर करें: "+SON.link();
  try{if(window.SENative&&SENative.isNative){await SENative.BtPrinter.shareBytes({name,data:c.toDataURL("image/png").split(",")[1],mime:"image/png"});return}
    const blob=await new Promise(r=>c.toBlob(r,"image/png")),f=new File([blob],name,{type:"image/png"});
    if(how==="share"&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:txt});return}
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},3000);toast("⬇️ QR कार्ड सेव हो गया")}
  catch(e){if(e&&e.name!=="AbortError")toast("शेयर नहीं हुआ")}};

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
  <div class="row2" style="margin:0"><button class="big" data-sonqr>📲 घर-घर का QR कार्ड</button><button class="big ghost" data-sxposter>🖼️ भाव-पोस्टर</button></div><div class="row2" style="margin:0"><button class="big ghost" data-sonpub>🔄 भाव/स्टॉक अभी भेजें</button></div>
  <details class="son-acc"><summary><b>👤 ऑनलाइन खाते (${(SON.accts||[]).length})</b> <span class="note">— किसने खाता बनाया / नंबर बदला</span></summary>${SON.acctHTML(50)}</details>
  <p class="note" style="margin:0">हर सामान को ऑनलाइन से छिपाने के लिए नीचे सामान की पंक्ति में 🌐 दबाएँ। सिगरेट-तम्बाकू अपने-आप कभी नहीं दिखते।</p></div>`};
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||!t.dataset.sonf)return;const k=t.dataset.sonf;SON.save({[k]:k==="open"||k==="close"?t.value:num(t.value)})});

const css=document.createElement("style");css.textContent=`
.son-o{display:grid;gap:5px;border-left:4px solid var(--line)}.son-o.new{border-left-color:var(--chili);animation:sonp 1.6s infinite}.son-o.acc,.son-o.billing{border-left-color:var(--haldi)}.son-o.pack{border-left-color:#3b82f6}.son-o.out{border-left-color:var(--leaf)}
@keyframes sonp{50%{box-shadow:0 0 0 3px rgba(239,68,68,.25)}}.son-o.late .son-h small{color:var(--chili);font-weight:800}
.son-h{display:flex;align-items:baseline;gap:8px}.son-h b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:16px}.son-h small{font-size:12px;color:var(--muted)}
.son-st{font-size:12px;font-weight:900;padding:2px 8px;border-radius:99px;background:var(--bg)}.son-o.new .son-st{background:var(--chili);color:#fff}
.son-m,.son-a{font-size:13px;color:var(--muted)}.son-a a{color:var(--leaf);font-weight:800}.son-i{font-size:14px;line-height:1.5}.son-rk{font-style:normal;font:700 11px monospace;background:#0f766e1a;color:#0f766e;border-radius:6px;padding:0 4px}
.son-b{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.son-l{font-size:12px;font-weight:800;color:var(--muted)}
.son-b button,.son-b a{border:0;border-radius:10px;padding:8px 11px;font-weight:900;font-size:14px;background:var(--leaf);color:#fff;text-decoration:none}
.son-b .g{background:var(--bg);color:var(--ink);border:1.5px solid var(--line);padding:7px 10px}.son-b .r{color:var(--chili)}.son-b button:disabled{opacity:.5}
.son-acc summary{cursor:pointer;list-style:none;padding:4px 0}.son-acc summary::-webkit-details-marker{display:none}.son-acl{display:grid;gap:4px;max-height:320px;overflow:auto}
.son-ac{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:5px 0}.son-ac div{flex:1;min-width:0;display:grid}.son-ac b{font-size:14px}.son-ac span{font-size:12px;color:var(--muted)}.son-ac a{text-decoration:none;font-size:18px}
.son-ft{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.son-set{display:grid;gap:10px}.son-k{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.son-k div{background:var(--bg);border-radius:10px;padding:6px;display:grid}.son-k span{font-size:11px;color:var(--muted)}.son-k b{font-size:18px}
.son-sw{display:flex;flex-wrap:wrap;gap:6px;margin:0}.son-f{display:grid;grid-template-columns:1fr 1fr;gap:6px}.son-ln code{display:block;font-size:12px;word-break:break-all;background:var(--bg);padding:8px;border-radius:8px}`;document.head.appendChild(css);

/* बदलाव पर अपने-आप दोबारा भेजो (हर 2 मिनट जाँच — सिर्फ़ बदला हो तब) */
setInterval(()=>{try{if(typeof S!=="undefined"&&S.db&&!S.demo&&S.items&&S.items.length){SON.publish(false);SON.publishPhotos(false)}}catch(e){}},120000);
})();
