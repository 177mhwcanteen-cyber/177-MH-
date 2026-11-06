/* 177 MH कैंटीन — A से Z सुधार (se-quick.js) · नियम: docs/सुधार-योजना-प्रॉम्प्ट.txt
   ⭐ फ़ेवरेट · 📊 मालिक का डैशबोर्ड · 🔢 बिल के बारकोड से वापसी · 🎁 ग्राहक पॉइंट · 📲 उधार की याद · 🔐 AI चाबी मालिक के खाने में · 📦 बैकअप का हाल
   डेटा की जगह वही: Firebase के पुराने खाने (customers, parties, ownerCfg, days/…/bills) — कोई नई जगह नहीं। */
(function(){
"use strict";
const SA=window.SA={};
const num=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:0};
const r2=n=>Math.round((+n||0)*100)/100;
const dayAdd=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return today(x)};
const onlyOwner=()=>S.isOwner||S.demo;

/* ================= ⭐ फ़ेवरेट: मालिक के चुने + पिछले 14 दिन में सबसे ज़्यादा बिके — कुल 12 ================= */
SA.favIds=function(){const pin=((S.settings&&S.settings.favs)||[]).filter(id=>{const i=item(id);return i&&i.active!==false});
  const sc=S.top7||{};const top=Object.keys(sc).filter(id=>!pin.includes(id)&&(()=>{const i=item(id);return i&&i.active!==false&&!i.virtual})()).sort((a,b)=>sc[b]-sc[a]);
  return pin.concat(top).slice(0,Math.max(12,pin.length))};
SA.isFav=i=>{if(!SA._fs||SA._fsT!==S.top7||SA._fsP!==(S.settings&&S.settings.favs)){SA._fs=new Set(SA.favIds());SA._fsT=S.top7;SA._fsP=S.settings&&S.settings.favs}return SA._fs.has(i.id)};
SA.favChipHTML=()=>`<button class="chip favchip" aria-pressed="${S.flt==="fav"}" data-flt="fav">⭐ फ़ेवरेट</button>`;
SA.togglePin=async function(id){if(!S.isOwner&&!S.demo){toast("फ़ेवरेट विक्रम जी चुनते हैं");return}
  const cur=((S.settings&&S.settings.favs)||[]).slice();const i=cur.indexOf(id);if(i>-1)cur.splice(i,1);else cur.unshift(id);
  S.settings={...(S.settings||{}),favs:cur.slice(0,24)};SA._fs=null;
  try{if(!S.demo&&S.db)await S.db.doc("settings/main").set({favs:cur.slice(0,24)},{merge:true})}catch(e){toast("सेव नहीं हुआ")}
  toast(i>-1?"⭐ फ़ेवरेट से हटाया":"⭐ फ़ेवरेट में जोड़ा — बिलिंग में \"⭐ फ़ेवरेट\" दबाएँ");try{renderSettings()}catch(e){}};

/* ================= ⏸️ होल्ड बिल: कितनी देर से रुका ================= */
SA.ago=ts=>{const m=Math.floor((Date.now()-(+ts||Date.now()))/60000);return m<1?"अभी":m<60?m+" मि":Math.floor(m/60)+" घं"};

/* ================= 📊 मालिक का एक-पेज डैशबोर्ड (रिपोर्ट टैब में ऊपर) ================= */
const W7={at:0,days:{},busy:false};
async function load7(){if(W7.busy||S.demo||!S.db||Date.now()-W7.at<10*60000)return;W7.busy=true;
  try{const ds=[];for(let k=1;k<7;k++)ds.push(dayAdd(today(),-k));
    await Promise.all(ds.map(async d=>{try{const q=await S.db.collection("days/"+d+"/bills").get();W7.days[d]=sumBills(q.docs.map(x=>x.data()))}catch(e){}}));
    W7.at=Date.now();if(S.tab==="report")try{renderReport()}catch(e){}}finally{W7.busy=false}}
function sumBills(B){const L=B.filter(b=>!b.cancelled&&!b.pending&&b.mode!=="inst");const s={n:L.length,tot:0,cash:0,upi:0,ud:0,cost:0};
  L.forEach(b=>{s.tot+=num(b.total);const p=b.pay||{};s.cash+=num(p.cash);s.upi+=num(p.upi);s.ud+=num(p.udhar);s.cost+=num(b.cost)});Object.keys(s).forEach(k=>s[k]=r2(s[k]));return s}
SA.dashHTML=function(){if(!S.isOwner&&!S.demo)return "";load7();
  const d=S.repDate||today(),isT=d===today(),T=sumBills(S.dayBills||[]),avg=T.n?Math.round(T.tot/T.n):0,profit=r2(T.tot-T.cost);
  const by={};(S.dayBills||[]).filter(b=>!b.cancelled&&!b.pending&&b.mode!=="inst").forEach(b=>(b.lines||[]).forEach(l=>{const k=l.id||l.name;const o=by[k]||(by[k]={n:(item(l.id)||{}).name||l.realName||l.name,amt:0,q:0,u:l.unit});o.amt+=num(l.amt);o.q+=num(l.qty)}));
  const top=Object.values(by).sort((a,b)=>b.amt-a.amt).slice(0,5),mx=top.length?top[0].amt:1;
  const act=S.items.filter(i=>i.active!==false&&!i.virtual),low=typeof isLow==="function"?act.filter(isLow).length:0,exp=typeof expInfo==="function"?act.filter(i=>expInfo(i)).length:0;
  const udTot=r2((S.parties||[]).reduce((a,p)=>a+Math.max(0,typeof bal==="function"?bal(p.id):0),0));
  const ords=window.SX&&SX.orders?SX.orders.length:0;
  /* 7 दिन — पुराने से आज तक */
  const days=[];for(let k=6;k>=0;k--){const x=dayAdd(today(),-k);days.push({d:x,v:k===0&&isT?T.tot:(W7.days[x]||{}).tot})}
  const vmax=Math.max(1,...days.map(x=>x.v||0)),yest=(W7.days[dayAdd(today(),-1)]||{}).tot;
  const ch=isT&&yest>0?Math.round((T.tot-yest)/yest*100):null;
  const bars=days.map((x,i)=>{const h=x.v==null?0:Math.max(2,Math.round(x.v/vmax*54));const lbl=["र","सो","मं","बु","गु","शु","श"][new Date(x.d+"T12:00:00").getDay()];
    return `<g><rect x="${i*44+8}" y="${68-h}" width="28" height="${h}" rx="5" class="${i===6?"td":""}"></rect><text x="${i*44+22}" y="82">${lbl}</text>${x.v?`<text class="v" x="${i*44+22}" y="${64-h}">${x.v>=1000?(x.v/1000).toFixed(1)+"k":Math.round(x.v)}</text>`:""}</g>`}).join("");
  const seg=(v,c)=>T.tot>0&&v>0?`<i class="${c}" style="flex:${v}"></i>`:"";
  return `<div class="card2 dash"><div class="dh"><b>📊 ${isT?"आज":fdate(d)} एक नज़र में</b>${ch!=null?`<span class="${ch>=0?"up":"dn"}">${ch>=0?"▲":"▼"} ${Math.abs(ch)}% कल से</span>`:""}</div>
    <div class="dk"><div><span>बिक्री</span><b>${rs(T.tot)}</b></div><div><span>बिल</span><b>${T.n}</b></div><div><span>औसत बिल</span><b>${rs(avg)}</b></div><div><span>मुनाफ़ा</span><b class="${profit>=0?"pos":"neg"}">${rs(profit)}</b></div></div>
    ${T.tot>0?`<div class="dbar">${seg(T.cash,"c")}${seg(T.upi,"u")}${seg(T.ud,"d")}</div><div class="dleg"><span><i class="c"></i>नकद ${rs(T.cash)}</span><span><i class="u"></i>UPI ${rs(T.upi)}</span><span><i class="d"></i>उधार ${rs(T.ud)}</span></div>`:""}
    <svg class="d7" viewBox="0 0 308 86" role="img" aria-label="पिछले 7 दिन की बिक्री">${bars}</svg>
    ${top.length?`<div class="dtop">${top.map(t=>`<div><span>${esc(t.n)}</span><i style="width:${Math.max(6,Math.round(t.amt/mx*100))}%"></i><b>${rs(r2(t.amt))}</b></div>`).join("")}</div>`:""}
    <div class="dchips"><button data-dgo="low" class="${low?"warn":""}">📉 कम स्टॉक <b>${low}</b></button><button data-dgo="exp" class="${exp?"warn":""}">⏳ एक्सपायरी <b>${exp}</b></button><button data-dgo="udhar">📒 उधार <b>${rs(udTot)}</b></button>${ords?`<button data-dgo="orders" class="warn">📥 ऑर्डर <b>${ords}</b></button>`:""}${(()=>{const t0=new Date();t0.setHours(0,0,0,0);const n=((window.SON&&SON.accts)||[]).filter(o=>+o.ts>=t0.getTime()).length;return n?`<button data-dgo="orders">👤 नए ऑनलाइन खाते <b>${n}</b></button>`:""})()}</div></div>`};
document.addEventListener("click",e=>{const b=e.target.closest("[data-dgo]");if(!b)return;const k=b.dataset.dgo;
  if(k==="udhar"){S.tab="udhar";showTab();return}if(k==="orders"){if(window.SX&&SX.ordersSheet)SX.ordersSheet();return}
  S.tab="bill";S.flt=k;S.cat="all";showTab()});

/* ================= 🔢 बिल का बारकोड (BW-XXXXXX) स्कैन → वही बिल + माल वापसी ================= */
SA.scan=function(code){const c=String(code||"").trim().toUpperCase();if(!/^BW-[0-9A-Z]{6}$/.test(c))return false;
  try{beep(true)}catch(e){}SA.openBill(c);return true};
SA.openBill=async function(no){const d=window.SF&&SF.decodeBill?SF.decodeBill(no):null;
  let b=(S.dayBills||[]).find(x=>x.no===no);
  if(!b&&d&&!S.demo&&S.db){try{const g=await S.db.doc("days/"+d.date+"/bills/"+no).get();if(g.exists)b=g.data()}catch(e){}}
  if(!b){toast("🔢 बिल "+no+" नहीं मिला"+(d?" ("+fdate(d.date)+")":""));return}
  if(b.cancelled){toast("यह बिल रद्द हो चुका है");return}
  if(window.SV&&SV.saleSheet&&b.mode!=="inst"){toast("🔢 बिल "+no+" · "+rs(b.total)+" — वापसी का माल चुनें");SV.saleSheet(b)}
  else if(typeof openBill==="function")openBill(b);};

/* ================= 🎁 ग्राहक पॉइंट (customers/<मोबाइल> में ही) ================= */
const PCFG=()=>({per:100,min:20,...((S.settings&&S.settings.pts)||{})});
SA.points=function(ph){ph=String(ph||"");if(ph.length!==10)return null;const c=(S.customers||[]).find(x=>x.id===ph);if(!c)return null;
  const earned=Math.floor(num(c.spent)/PCFG().per);return {earned,used:num(c.ptsUsed),left:Math.max(0,earned-num(c.ptsUsed)),c}};
SA.ptsSheet=function(ph){const p=SA.points(ph);if(!p){toast("इस नंबर का कोई खाता नहीं");return}const own=onlyOwner();
  $("#sheet").innerHTML=`<div class="qscrim" data-close></div><div class="qpop" style="top:90px" role="dialog" aria-label="ग्राहक पॉइंट">
    <div class="sl-ah"><b>🎁 ${esc(p.c.name||"ग्राहक")} · ${esc(ph)}</b><span></span><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="pts-k"><div><span>बचे पॉइंट</span><b>${p.left}</b></div><div><span>कुल खरीद</span><b>${rs(num(p.c.spent))}</b></div><div><span>आए</span><b>${num(p.c.visits)} बार</b></div></div>
    <p class="note" style="margin:0">हर ${rs(PCFG().per)} की खरीद पर 1 पॉइंट · 1 पॉइंट = ₹1 का इनाम (मुफ़्त सामान)। बिल में छूट नहीं — इनाम मुफ़्त सामान के रूप में।</p>
    ${own?(p.left>=PCFG().min?`<div class="sl-ar"><span class="lb-n"><button type="button" data-ptm>−</button><input id="ptN" inputmode="numeric" value="${Math.min(p.left,50)}" aria-label="कितने पॉइंट"><button type="button" data-ptp>＋</button></span><button class="big" data-ptuse>🎁 इतने पॉइंट का इनाम दिया</button></div>`
      :`<p class="note" style="margin:0">इनाम के लिए कम से कम ${PCFG().min} पॉइंट चाहिए।</p>`):`<p class="note" style="margin:0">इनाम विक्रम जी देते हैं।</p>`}</div>`;
  const sh=$("#sheet");sh.onclick=async e=>{const c=s=>e.target.closest(s),I=$("#ptN");
    if(c("[data-close]")){closeSheet();return}
    if(c("[data-ptp]")&&I){I.value=Math.min(p.left,num(I.value)+10);return}if(c("[data-ptm]")&&I){I.value=Math.max(1,num(I.value)-10);return}
    if(c("[data-ptuse]")&&I){const n=Math.round(num(I.value));if(!(n>0)||n>p.left){toast("1 से "+p.left+" तक");return}
      try{if(!S.demo&&S.db)await S.db.collection("customers").doc(ph).set({ptsUsed:num(p.c.ptsUsed)+n,ptsLog:[...(p.c.ptsLog||[]).slice(-19),{n,ts:Date.now(),by:biller()}]},{merge:true});
        p.c.ptsUsed=num(p.c.ptsUsed)+n;closeSheet();toast("🎁 "+n+" पॉइंट का इनाम दर्ज — अब बचे "+(p.left-n))}catch(err){toast("सेव नहीं हुआ")}}}};

/* ================= 📲 उधार की याद WhatsApp पर ================= */
SA.remindHTML=function(){const L=(S.parties||[]).filter(p=>!p.hide).map(p=>({p,b:typeof bal==="function"?bal(p.id):0})).filter(x=>x.b>0).sort((a,b)=>b.b-a.b);
  if(!L.length)return "";const ph=x=>String(x.p.phone||"").replace(/\D/g,"").slice(-10);
  const days=ts=>ts?Math.floor((Date.now()-ts)/864e5):null;
  return `<details class="card2 rmd"${SA._rmOpen?" open":""}><summary><b>📲 उधार की याद दिलाएँ</b><span class="note">${L.length} खाते · ${L.filter(x=>ph(x).length===10).length} के नंबर</span></summary>
  <div class="rml">${L.slice(0,60).map(x=>{const n=ph(x),dd=days(x.p.remindTs);return `<div class="rmr"><div><b>${esc(x.p.name)}</b><span>${rs(x.b)}${dd!=null?` · याद: ${dd?dd+" दिन पहले":"आज"}`:" · कभी याद नहीं"}</span></div>
    ${n.length===10?`<button type="button" data-rmd="${esc(x.p.id)}" class="${dd===0?"done":""}">📲 WhatsApp</button>`:`<span class="note">नंबर नहीं</span>`}</div>`}).join("")}</div></details>`};
SA.remind=async function(pid){const p=(S.parties||[]).find(x=>x.id===pid);if(!p)return;const b=typeof bal==="function"?bal(pid):0,n=String(p.phone||"").replace(/\D/g,"").slice(-10);if(n.length!==10)return;
  const upi=typeof upiId==="function"?upiId():"";const shop=(S.settings&&S.settings.rcpt&&S.settings.rcpt.shop)||"177 MH कैंटीन";
  const t=`🙏 नमस्ते ${p.name} जी,\n${shop} में आपका उधार *₹${b}* बाकी है।\nसुविधा अनुसार चुका दें${upi?`\n📱 UPI: ${upi}`:""}\nधन्यवाद 🙏`;
  window.open("https://wa.me/91"+n+"?text="+encodeURIComponent(t),"_blank");
  p.remindTs=Date.now();try{if(!S.demo&&S.db)await S.db.collection("parties").doc(pid).update({remindTs:p.remindTs})}catch(e){}
  SA._rmOpen=true;try{renderUdhar()}catch(e){}};
document.addEventListener("click",e=>{const b=e.target.closest("[data-rmd]");if(b){e.preventDefault();SA.remind(b.dataset.rmd)}
  const s=e.target.closest(".rmd summary");if(s)SA._rmOpen=!s.parentNode.open});

/* ================= 🔐 AI चाबी: ownerCfg/ai (सिर्फ़ मालिक) — settings/main से हटे ================= */
SA.aiInit=function(){if(S.demo||!S.db||!S.isOwner||SA._ai)return;SA._ai=1;
  S.db.doc("ownerCfg/ai").onSnapshot(async s=>{const v=s.exists?s.data():{};SE._ogk=String(v.gk||"");
    const old=String((S.settings&&S.settings.gk)||"");
    /* पुरानी चाबी settings में है (जिसे साथी पढ़ सकते हैं) → मालिक के खाने में ले जाओ, फिर settings से हटाओ (जब तक "साथियों को सीधा AI" बंद हो) */
    if(old&&!v.gk){try{await S.db.doc("ownerCfg/ai").set({gk:old,movedTs:Date.now()},{merge:true});SE._ogk=old}catch(e){return}}
    /* Apps Script का पता न हो तो साथियों का AI सिर्फ़ इसी चाबी से चलता है — तब चाबी settings में ही रहने दो (कुछ टूटे नहीं) */
    if(old&&!(S.settings&&S.settings.aiShare)&&(SE._ogk||v.gk)&&SE.scriptUrl&&SE.scriptUrl()){try{await S.db.doc("settings/main").update({gk:firebase.firestore.FieldValue.delete()})}catch(e){}}},()=>{})};
SA.saveKey=async function(k){SE._ogk=k;if(S.demo||!S.db)return;await S.db.doc("ownerCfg/ai").set({gk:k,ts:Date.now()},{merge:true});
  if(S.settings&&S.settings.aiShare)await S.db.doc("settings/main").set({gk:k},{merge:true})};
SA.setShare=async function(on){S.settings={...(S.settings||{}),aiShare:!!on};if(S.demo||!S.db)return;
  const k=SE._ogk||"";await S.db.doc("settings/main").set(on&&k?{aiShare:true,gk:k}:{aiShare:false,gk:firebase.firestore.FieldValue.delete()},{merge:true});
  toast(on?"साथियों के फोन पर भी सीधा AI चालू":"चाबी सिर्फ़ आपके फोन में — साथियों का AI Apps Script से")};

/* ================= 📦 बैकअप का हाल (सेटिंग में) ================= */
SA.bkHTML=function(){if(!S.isOwner)return "";const y=dayAdd(today(),-1),last=localStorage.getItem("sx_bk")||"",lf=+(localStorage.getItem("sx_bkf")||0);
  return `<div class="card2 bkst"><h3>📦 बैकअप का हाल</h3>
  <div class="bkr"><span>${last===y||last===today()?"✅":"⏳"}</span><div><b>रोज़ का अपने-आप बैकअप (Firebase में)</b><small>${last?"आख़िरी: "+fdate(last)+" का दिन":"आज पहली बार — ऐप खुलने के ~30 सेकंड बाद"}</small></div></div>
  <div class="bkr"><span>☁️</span><div><b>Google Drive "177 MH कैंटीन बैकअप" + Sheet</b><small>Apps Script दिन में 2 बार (सुबह 7, रात 10) + हर घंटे Sheet — वही पुरानी जगह</small></div></div>
  <div class="bkr"><span>${lf?"✅":"•"}</span><div><b>फ़ाइल बैकअप (30 दिन, हाथ से)</b><small>${lf?"आख़िरी: "+new Date(lf).toLocaleDateString("hi-IN"):"अभी तक नहीं बना"} · <button type="button" class="lnk" data-sxbk>अभी बनाएँ</button></small></div></div></div>`};

/* ================= 🔠 सामान का नाम: टाइप करते ही CAPITAL (विक्रम जी का पक्का नियम) =================
   बचत Firebase में पहरे (SE.capItem, se-platform) से भी पक्की; यहाँ कीबोर्ड Caps-Lock जैसा + लिखते ही बड़े अक्षर */
const NAMEF='[data-if="name"],[data-if="short"],#nbName,#ni-name,#kNm,#niName,#ikName,[data-nmf]';
document.addEventListener("focusin",e=>{const t=e.target;if(t&&t.matches&&t.matches(NAMEF)){t.setAttribute("autocapitalize","characters");t.style.textTransform="uppercase"}});
document.addEventListener("input",e=>{const t=e.target;if(!t||!t.matches||!t.matches(NAMEF)||!/[a-z]/.test(t.value))return;
  const a=t.selectionStart,b=t.selectionEnd;t.value=SE.capNm(t.value);try{t.setSelectionRange(a,b)}catch(x){}},true);

/* ================= ⚙️ सामान और भाव: खोज / छाँटना / 40-40 / टैप करके संपादन ================= */
const reSet=(all)=>{const el=document.getElementById(all?"setList":"setBody");if(!el||typeof setListHTML!=="function")return;el.innerHTML=all?setListHTML():setBodyHTML()};
document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#p-set"))return;let b;
  if((b=t.closest("[data-sopen]"))&&!t.closest(".setitem")){const id=b.dataset.sopen;SETV.open=SETV.open===id?"":id;reSet(false);
    if(SETV.open)setTimeout(()=>{const o=document.querySelector("#setBody .sopen");if(o)o.scrollIntoView({block:"start",behavior:"smooth"})},30);return}
  if((b=t.closest("[data-sf]"))){SETV.f=SETV.f===b.dataset.sf&&b.dataset.sf!=="all"?"all":b.dataset.sf;SETV.n=40;reSet(true);return}
  if(t.closest("[data-smore]")){SETV.n+=40;reSet(false)}});
let sqT=0;document.addEventListener("input",e=>{if(e.target.id!=="setQ")return;SETV.q=e.target.value.trim();SETV.n=40;clearTimeout(sqT);sqT=setTimeout(()=>reSet(false),120)});

/* ================= रूप-रंग ================= */
const css=document.createElement("style");css.textContent=`
.favchip{border-color:var(--haldi)!important}
.sl-hd2{padding:4px 0}.sf-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 4px}.sf-row .chip{flex:none}.sf-row i{font-style:normal;opacity:.75;font-size:12px}
.slist{display:grid;gap:0}.srow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:var(--surface);color:var(--ink);padding:8px 10px;min-height:58px}
.srow.off{opacity:.55}.srow .tile{width:44px;height:44px;flex:none;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:hsl(var(--h) 60% 88%)}.srow .tile img{width:100%;height:100%;object-fit:cover}.srow .tile .em{font-size:22px}
.sr-n{flex:1;min-width:0;display:grid}.sr-n b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sr-n small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sr-p{display:grid;text-align:right;font-weight:800;font-size:15px}.sr-p em{color:var(--chili);font-style:normal}.sr-p small{font-weight:600;font-size:11.5px;color:var(--muted)}.sr-p i{font-style:normal}.sr-p i.lo{color:var(--chili);font-weight:800}
.sr-c{color:var(--muted);font-size:20px;transition:transform .15s}.srow[aria-expanded=true] .sr-c{transform:rotate(90deg)}
.sopen{border:2px solid var(--haldi);border-radius:14px;overflow:hidden;margin:6px 0;background:var(--surface)}.sopen .srow{border-bottom:1px dashed var(--line)}
.card .nm,.sl-nm b,.lb-nm,.sl-ah b,.sl-hits b,.lines .mid b,.dtop span,.qh .qn b{text-transform:uppercase}
.dash{display:grid;gap:10px}.dh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.dh b{font-size:16px}.dh .up{color:var(--leaf);font-weight:800;font-size:13px}.dh .dn{color:var(--chili);font-weight:800;font-size:13px}
.dk{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.dk div{background:var(--bg);border-radius:12px;padding:7px 6px;display:grid;gap:1px;min-width:0}
.dk span{font-size:11px;color:var(--muted)}.dk b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dk .pos{color:var(--leaf)}.dk .neg{color:var(--chili)}
@media(max-width:360px){.dk{grid-template-columns:repeat(2,1fr)}}
.dbar{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--line)}.dbar i,.dleg i{display:block}.dbar .c,.dleg .c{background:#22a06b}.dbar .u,.dleg .u{background:#3b82f6}.dbar .d,.dleg .d{background:#ef4444}
.dleg{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted)}.dleg span{display:flex;align-items:center;gap:4px}.dleg i{width:9px;height:9px;border-radius:3px}
.d7{width:100%;height:auto}.d7 rect{fill:var(--line)}.d7 rect.td{fill:var(--haldi)}.d7 text{font-size:10px;fill:var(--muted);text-anchor:middle}.d7 text.v{font-size:9px;font-weight:700;fill:var(--ink)}
.dtop{display:grid;gap:4px}.dtop div{display:grid;grid-template-columns:minmax(0,1fr) 34% auto;gap:6px;align-items:center;font-size:13px}.dtop span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dtop i{height:8px;border-radius:99px;background:var(--haldi);display:block}.dtop b{font-size:12px}
.dchips{display:flex;gap:6px;flex-wrap:wrap}.dchips button{border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:20px;padding:5px 10px;font-weight:700;font-size:13px}.dchips .warn{border-color:var(--chili)}
.ptsp{border:0;border-radius:99px;padding:2px 9px;font-weight:900;font-size:12px;background:var(--haldi);color:var(--haldi-ink);margin-left:4px;flex:none}
.pts-k{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.pts-k div{background:var(--bg);border-radius:10px;padding:6px;display:grid}.pts-k span{font-size:11px;color:var(--muted)}.pts-k b{font-size:17px}
.rmd summary{display:flex;justify-content:space-between;align-items:baseline;gap:8px;cursor:pointer;list-style:none}.rmd summary::-webkit-details-marker{display:none}
.rml{display:grid;gap:5px;margin-top:8px;max-height:340px;overflow:auto}.rmr{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:4px 0}.rmr div{flex:1;min-width:0;display:grid}
.rmr b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rmr span{font-size:12px;color:var(--muted)}
.rmr button{border:0;border-radius:10px;padding:6px 10px;font-weight:800;background:#25d366;color:#06331a;flex:none}.rmr button.done{opacity:.55}
.bkst{display:grid;gap:8px}.bkr{display:flex;gap:10px;align-items:flex-start}.bkr>span{font-size:18px}.bkr div{display:grid}.bkr small{color:var(--muted);font-size:12px}
.btab small i{font-style:normal;opacity:.8}`;document.head.appendChild(css);

/* ================= जोड़ (पुराने फ़ंक्शन के ऊपर, बिना उन्हें बदले) ================= */
function wrap(name,after){const f=window[name];if(typeof f!=="function"||f._sq)return;const g=function(){const r=f.apply(this,arguments);try{after.apply(this,arguments)}catch(e){console.warn("SA "+name,e)}return r};g._sq=1;window[name]=g}
wrap("renderReport",()=>{const el=$("#p-report");if(!el||el.querySelector(".dash"))return;const h=el.querySelector("h2");const html=SA.dashHTML();if(!html)return;if(h)h.insertAdjacentHTML("afterend",html);else el.insertAdjacentHTML("afterbegin",html)});
wrap("renderUdhar",()=>{const el=$("#p-udhar");if(!el||el.querySelector(".rmd"))return;const html=SA.remindHTML();if(!html)return;const h=el.querySelector("h2");if(h)h.insertAdjacentHTML("afterend",html);else el.insertAdjacentHTML("afterbegin",html)});
wrap("renderBcust",()=>{const b=$("#bcust");if(!b||S.mode!=="walk"||b.querySelector(".ptsp"))return;const p=SA.points(S.cust&&S.cust.phone);if(!p)return;
  const x=document.createElement("button");x.type="button";x.className="ptsp";x.dataset.pts=S.cust.phone;x.textContent="🎁 "+p.left;x.setAttribute("aria-label",p.left+" पॉइंट");b.appendChild(x)});
document.addEventListener("click",e=>{const b=e.target.closest("[data-pts]");if(b){e.preventDefault();SA.ptsSheet(b.dataset.pts)}});
const st=setInterval(()=>{const s=typeof S!=="undefined"?S:null;if(s&&s.db&&s.isOwner){clearInterval(st);SA.aiInit()}},2500);
})();
