/* 177 वेट कैंटीन — 🛍️ बाज़ार खरीद (v2: बिलिंग जैसा)
   ऊपर कैमरा हमेशा चालू · स्कैन करते ही सामान जुड़ जाए (MRP + पिछला खरीद भाव अपने-आप) · दोबारा स्कैन = +1
   🤖 पक्का बिल हो तो: प्रॉम्प्ट कॉपी → ChatGPT/Gemini में बिल की फोटो → जवाब चिपकाओ → GST/छूट/भाड़ा जोड़कर
      "घर पहुँचा भाव" हर सामान का अपने-आप; फिर बारकोड स्कैन करके मिलाओ और गिनो। एक बिल दो बार कभी नहीं चढ़ता।
   आखिर में: 🧾 बिल फोटो · 💳 दुकान के QR की फोटो → उसी रकम का QR विक्रम जी के पास → भुगतान → रसीद
   बिलर: "📦 गिनकर पक्का करें" → तभी स्टॉक बढ़े + खरीद का रिकॉर्ड + नए सामान बनें; फर्क की रिपोर्ट मालिक को।
   मालिक: सबकी खरीद, भुगतान, फर्क, "🔎 कहाँ मिलेगा?" (पुरानी दुकानें, भाव, नक्शा)। */
(function(){
"use strict";
const SM=window.SM={};
SM.draftLines=()=>D?D.lines:[];/* 🏷️ लेबल छपाई (se-label.js) के लिए */
const KEY="mh_mkt_draft",MAXL=80,LOW=10;
const num=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:0};
const rid=n=>Math.random().toString(36).slice(2,2+(n||4)).toUpperCase();
const PAYS=[["qr","💳 विक्रम जी QR से"],["cash","💵 मैंने नकद दिया"],["galla","🏪 गल्ले से"],["udhar","📒 दुकान का उधार"]];
const PAYN=Object.fromEntries(PAYS);
let D=null,LIST=[],SENT=[],un1=null,un2=null,VIEW="home",OPEN=null,FLASH="",FIND="",RCV=null;

/* ---------- कच्ची एंट्री फोन में (बिना इंटरनेट भी) ---------- */
function load(){if(D)return;try{D=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){D=null}}
function save(){try{if(D)localStorage.setItem(KEY,JSON.stringify(D));else localStorage.removeItem(KEY)}catch(e){toast("⚠ फोन की जगह भर गई — कुछ फोटो हटाएँ")}}
function blank(){const d=new Date(),p=n=>String(n).padStart(2,"0");
  return {no:"MP-"+p(d.getDate())+p(d.getMonth()+1)+"-"+rid(4),date:today(),start:Date.now(),shop:"",phone:"",loc:null,lines:[],bill:"",qr:"",upi:"",pay:"qr",note:"",ai:null,mode:"scan"}}
const lidOf=i=>D.no+"-"+String(i).padStart(2,"0");
function nextLid(){let n=0;D.lines.forEach(l=>{const k=+String(l.lid).split("-").pop();if(k>n)n=k});return lidOf(n+1)}

/* ---------- फोटो ---------- */
function shrink(file,max,q){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL("image/jpeg",q))};
  img.onerror=e=>{URL.revokeObjectURL(u);rej(e)};img.src=u})}
async function pick(cb){const wasCam=SE.cam&&SE.cam.on;if(wasCam)try{await camOff(false)}catch(e){}
  const fi=document.createElement("input");fi.type="file";fi.accept="image/*";fi.capture="environment";
  fi.onchange=async()=>{const f=fi.files[0];if(f)await cb(f);if(wasCam)setTimeout(camAuto,300)};
  window.addEventListener("focus",function back(){window.removeEventListener("focus",back);setTimeout(()=>{if(wasCam&&!SE.cam.on)camAuto()},1200)});fi.click()}

/* ---------- लोकेशन ---------- */
function getLoc(){return new Promise(res=>{
  const l=window.SR&&SR.last;if(l&&Date.now()-l.ts<10*60000)return res({lat:l.lat,lng:l.lng,acc:l.acc||0,ts:l.ts});
  if(!navigator.geolocation)return res(null);
  try{navigator.geolocation.getCurrentPosition(p=>res({lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy),ts:Date.now()}),()=>res(null),{enableHighAccuracy:true,timeout:9000,maximumAge:120000})}catch(e){res(null)}})}
SM.loc=getLoc;
async function fixLoc(){const l=await getLoc();if(l&&D){D.loc=l;save();if(VIEW==="draft")draw()}return l}

/* ---------- फायदा ---------- */
function gain(rate,mrp){rate=num(rate);mrp=num(mrp);if(!(rate>0)||!(mrp>0))return null;const per=r2(mrp-rate),pct=Math.round(per/rate*1000)/10;return {per,pct,low:pct<LOW}}
const tot=()=>r2((D?D.lines:[]).reduce((a,l)=>a+num(l.qty)*num(l.rate),0));
const mrpTot=()=>r2((D?D.lines:[]).reduce((a,l)=>a+(num(l.mrp)>0?num(l.mrp)*num(l.qty):0),0));
const costWithMrp=()=>r2((D?D.lines:[]).reduce((a,l)=>a+(num(l.mrp)>0?num(l.rate)*num(l.qty):0),0));
function totPct(){const c=costWithMrp();return c>0?Math.round((mrpTot()-c)/c*1000)/10:null}
function lastCost(it){const c=window.SF?SF.costOf(it):(+it.cost||0);return c>0?r2(c):0}

/* ---------- स्कैन (ऊपर का कैमरा, बिलिंग जैसा) ---------- */
SM.active=()=>S.tab==="mkt"&&(VIEW==="draft"&&!!D||VIEW==="detail"&&!!RCV);
SM.wantCam=()=>SM.active();
SM.scan=function(code){if(!SM.active())return false;code=String(code||"").trim();if(!code)return true;
  if(VIEW==="detail"&&RCV){rcvScan(code);return true}
  if(/^upi:\/\//i.test(code)){setUpi(code);return true}
  const ex=D.lines.find(l=>l.bar===code);
  if(ex){if(ex.ai){ex.seen=(+ex.seen||0)+1;FLASH=ex.lid;save();draw();beep(ex.seen<=num(ex.qty));toast((ex.seen<=num(ex.qty)?"✓ गिना ":"⚠ ज़्यादा: ")+ex.name+" "+ex.seen+"/"+ex.qty);return true}
    ex.qty=r2(num(ex.qty)+1);FLASH=ex.lid;save();draw();beep(true);toast("✓ "+ex.name+" × "+ex.qty);return true}
  const open=D.lines.filter(l=>l.ai&&!l.bar);
  if(open.length){matchSheet(code,open);return true}
  addByCode(code);return true};
async function addByCode(code,ai){
  const it=findByCode(code);const ln={lid:nextLid(),bar:code,itemId:"",name:"",qty:1,rate:"",mrp:"",f:"",m:"",ts:Date.now()};
  if(it){ln.itemId=it.id;ln.name=it.name;ln.mrp=+it.mrp||"";const c=lastCost(it);if(c){ln.rate=c;ln.last=c}}
  else{const m=await pehchan(),x=m.get(code);if(x){ln.name=x.bill;if(x.mrp)ln.mrp=+x.mrp;if(x.lastPur){ln.last=+x.lastPur;ln.rate=+x.lastPur}ln.peh=1}}
  if(D.lines.length>=MAXL){toast("एक खरीद में "+MAXL+" सामान तक");return}
  D.lines.unshift(ln);FLASH=ln.lid;save();draw();beep(true);
  toast(it?"✓ "+it.name+(ln.rate?" · पिछला भाव "+rs(ln.rate):" · भाव लिखें"):ln.name?"🗂️ "+ln.name+" (पुरानी सूची) · भाव लिखें":"🆕 नया बारकोड — नाम और भाव लिखें");
  if(!ln.name){if(SE.aiReady()&&!S.demo)webFill(ln);else setTimeout(()=>{const n=document.querySelector(`[data-lid="${ln.lid}"] [data-f="name"]`);if(n)n.focus()},80)}}
/* 🌐 अनजान बारकोड → (1) पहले खोजा हुआ (bcache) (2) Google Gemini खोज — एक बारकोड पर एक ही बार */
const aiWhy=r=>!r?"":r.error==="quota"?"आज की मुफ़्त AI सीमा पूरी — कल फिर चलेगी":r.error==="busy"?"Google अभी व्यस्त — थोड़ी देर में फिर":r.error==="bad-key"?"🔑 AI चाबी गलत है — मालिक सेटिंग में नई Gemini चाबी डालें":r.error==="offline"?"इंटरनेट बंद है":r.error==="timeout"?"AI ने जवाब देने में देर की — फिर कोशिश करें":r.error==="no-url"?"🔑 AI चाबी सेटिंग में नहीं है":r.error?"AI: "+String(r.detail||r.error).slice(0,80):"";
SM.aiWhy=aiWhy;SM.lastErr="";
const TRIED={};
SM.lookup=async function(code){code=String(code||"").replace(/\D/g,"");if(code.length<8)return null;
  try{if(!S.demo&&S.db){const g=await S.db.doc("bcache/"+code).get();if(g.exists){const d=g.data();return d.found===false?null:d}}}catch(e){}
  if(TRIED[code])return null;TRIED[code]=1;if(!SE.aiReady())return null;
  const r=await SE.ai({mode:"code",code});if(!r||!r.ok){SM.lastErr=aiWhy(r)||"AI से जवाब नहीं";if(r&&(r.error==="busy"||r.error==="timeout"||r.error==="offline"))delete TRIED[code];return null}SM.lastErr="";
  const d={found:!!(r.found&&r.name),name:String(r.name||"").slice(0,60),hi:String(r.hi||"").slice(0,60),brand:String(r.brand||""),size:String(r.size||""),mrp:num(r.mrp),cat:String(r.category||""),src:String(r.source||"web").slice(0,60),ts:Date.now(),by:S.uid||"",byName:biller()};
  try{if(!S.demo&&S.db)await S.db.doc("bcache/"+code).set(d)}catch(e){}
  return d.found?d:null};
SM.readImg=async function(dataUrl){if(!SE.aiReady()){SM.lastErr="🔑 AI चाबी सेटिंग में नहीं है — मालिक ⚙ सेटिंग में Gemini चाबी डालें";return null}const r=await SE.ai({mode:"img",b64:String(dataUrl).split(",")[1]||""});
  if(!r||!r.ok){SM.lastErr=aiWhy(r)||"AI से जवाब नहीं";return null}if(!(r.found&&r.name)){SM.lastErr="📸 फोटो में नाम साफ़ नहीं दिखा — आगे का हिस्सा पास से, रोशनी में खींचें";return null}SM.lastErr="";return r};
/* बिलिंग का "नया बारकोड" फॉर्म: पहचान सूची में न मिले तो इंटरनेट से भरो */
SM.fillNew=async function(code){const n0=$("#nbName");if(!n0)return;const tip=document.createElement("p");tip.className="note";tip.style.cssText="background:#eef2ff;padding:8px 10px;border-radius:10px;margin:0 0 10px";tip.textContent="🌐 इंटरनेट पर ढूँढ रहे हैं…";if(!SE.aiReady())return;n0.closest("label")?.before(tip);
  const d=await SM.lookup(code);const n=$("#nbName");if(!n){return}if(!d){tip.textContent="🌐 इंटरनेट पर नहीं मिला — नाम खुद लिखें";return}
  if(!n.value.trim())n.value=d.name;const h=$("#nbHi");if(h&&!h.value.trim()&&d.hi)h.value=d.hi;const m=$("#nbMrp");if(m&&!(+m.value)&&d.mrp)m.value=d.mrp;
  tip.textContent=`🌐 इंटरनेट से भरा: ${d.name}${d.mrp?" · MRP ₹"+d.mrp:""} — पैकेट से मिलाकर ही सेव करें`};
async function webFill(ln){ln.webQ=1;draw();const d=await SM.lookup(ln.bar);ln.webQ=0;const L=D&&D.lines.find(x=>x.lid===ln.lid);if(!L){return}
  if(d){if(!L.nmEdit||!String(L.name).trim())L.name=d.name;if(!L.hi)L.hi=d.hi;if(!num(L.mrp)&&d.mrp)L.mrp=d.mrp;L.web=1;toast("🌐 इंटरनेट से: "+d.name+(d.mrp?" · MRP ₹"+d.mrp:"")+" — पैकेट से मिलाएँ")}
  else{L.aiNo=1;toast(SE.aiReady()?(SM.lastErr?"🌐 "+SM.lastErr:"🌐 इंटरनेट पर नहीं मिला")+" — 📸 पैकेट की फोटो लें, AI नाम भरेगा":"🔑 AI चाबी सेटिंग में नहीं है — नाम खुद लिखें या मालिक चाबी डालें")}
  save();draw()}
async function imgFill(L,big){L.imgQ=1;draw();const r=await SM.readImg(big);L.imgQ=0;const l=D&&D.lines.find(x=>x.lid===L.lid);if(!l)return;
  if(r){if(!String(l.name).trim()||l.web||(!l.itemId&&!l.nmEdit))l.name=r.name;if(!l.hi&&r.hi)l.hi=r.hi;if(r.mrp&&(!num(l.mrp)||l.web))l.mrp=num(r.mrp);if(!l.bar&&/^\d{8,14}$/.test(String(r.barcode||"")))l.bar=String(r.barcode);if(r.exp)l.exp=String(r.exp);l.web=0;l.pic=1;l.aiNo=0;toast("📸 फोटो से पढ़ा: "+r.name+(r.mrp?" · MRP ₹"+r.mrp:""))}
  else{l.aiNo=1;toast("📸 "+(SM.lastErr||"AI नहीं पढ़ पाया — नाम खुद लिखें"))}
  save();draw()}
function addManual(name){const t=String(name||"").trim();if(!t)return;
  const it=S.items.find(i=>i.name.toLowerCase()===t.toLowerCase());
  const ln={lid:nextLid(),bar:it?(it.barcode||""):"",itemId:it?it.id:"",name:it?it.name:t,qty:1,rate:it&&lastCost(it)?lastCost(it):"",mrp:it&&+it.mrp?+it.mrp:"",f:"",m:"",ts:Date.now()};
  if(it&&ln.rate)ln.last=ln.rate;D.lines.unshift(ln);FLASH=ln.lid;D.q="";save();draw();beep(true);
  setTimeout(()=>{const r=document.querySelector(`[data-lid="${ln.lid}"] [data-f="rate"]`);if(r&&!ln.rate)r.focus()},80)}

/* AI वाले सामान से बारकोड मिलाना */
function matchSheet(code,open){const it=findByCode(code);
  const sim=l=>{if(!it)return 0;const a=it.name.toLowerCase().split(/\W+/),b=l.name.toLowerCase();return a.filter(w=>w.length>2&&b.includes(w)).length};
  open=[...open].sort((a,b)=>sim(b)-sim(a));
  const hd=$("header").getBoundingClientRect(),top=Math.max(8,Math.round(hd.bottom)+6);
  $("#sheet").innerHTML=`<div class="qscrim" data-close></div><div class="qpop mk-match" style="top:${top}px" role="dialog" aria-label="बारकोड किस सामान का">
    <div class="qh"><div class="qn"><b>📟 ${esc(code)}</b><span>${it?"ऐप में: "+esc(SE.capNm(it.name))+" · ":""}बिल में यह कौन-सा सामान है?</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="mk-mlist">${open.map(l=>`<button type="button" data-mm="${esc(l.lid)}"><b>${esc(l.name)}</b><span>${l.qty} × ${rs(l.rate)}${l.mrp?" · MRP "+rs(l.mrp):""}</span></button>`).join("")}</div>
    <button class="big ghost" data-mmnew>➕ बिल में नहीं है — नया जोड़ें</button></div>`;
  $("#sheet").onclick=e=>{if(e.target.closest("[data-close]")){closeSheet();return}
    const b=e.target.closest("[data-mm]");if(b){const l=D.lines.find(x=>x.lid===b.dataset.mm);if(l){l.bar=code;l.seen=1;if(it){l.itemId=it.id;if(!l.mrp&&+it.mrp)l.mrp=+it.mrp}FLASH=l.lid;save()}closeSheet();draw();beep(true);toast("✓ मिलाया: "+(l?l.name:""));return}
    if(e.target.closest("[data-mmnew]")){closeSheet();addByCode(code)}}}

/* ---------- 💳 दुकान का QR ---------- */
function parseUpi(s){try{const u=new URL(String(s).replace(/^upi:\/\//i,"https://x/"));const pa=u.searchParams.get("pa");if(!pa)return null;return {pa,pn:u.searchParams.get("pn")||"",mc:u.searchParams.get("mc")||""}}catch(e){return null}}
function setUpi(s){const u=parseUpi(s);if(!u){toast("यह UPI QR नहीं लगा");return false}D.upi=String(s);if(!D.shop&&u.pn)D.shop=decodeURIComponent(u.pn);save();draw();beep(true);toast("💳 QR मिला: "+(u.pn||u.pa));return true}
function payLink(b){const u=parseUpi(b.upi||"");if(!u)return "";const amt=+(b.pay&&b.pay.amt||b.total)||0;
  return `upi://pay?pa=${encodeURIComponent(u.pa)}&pn=${encodeURIComponent(u.pn||b.shop||"Shop")}&am=${amt.toFixed(2)}&cu=INR&tn=${encodeURIComponent("177 MH "+b.no)}`}

/* ---------- 🤖 AI से पक्का बिल ---------- */
SM.aiPrompt=function(ref){return `You are reading a PURCHASE BILL / INVOICE photo for "177 Wet Canteen", Barmer (we are under GST Composition Scheme — we CANNOT claim GST input credit, so GST is part of our cost).
Read EVERY line item exactly from the bill image(s) I attach. Do not guess items that are not on the bill.
Reply with ONLY this JSON (no other words, no markdown):
{"app":"mh177-bill","ref":"${ref}","supplier":{"name":"","gstin":"","phone":"","billNo":"","date":"YYYY-MM-DD"},
"items":[{"name":"Brand Item Size (short, e.g. 'India Gate Basmati 1kg')","hi":"हिंदी नाम","hsn":"","qty":0,"free":0,"unit":"pc","rate":0,"discPct":0,"taxable":0,"gstPct":0,"gstAmt":0,"lineTotal":0,"mrp":0,"barcode":""}],
"billDiscount":0,"freight":0,"otherCharges":0,"roundOff":0,"grandTotal":0}
Rules:
- qty = billed quantity in PIECES (if bill says 2 box × 12, write qty 24 and note rate per piece). free = free pieces (scheme).
- rate = rate per piece BEFORE GST as printed; taxable = value after item discount, before GST; gstPct = CGST+SGST (or IGST) %; gstAmt = that GST in ₹; lineTotal = taxable + gstAmt.
- mrp = MRP per piece if printed on bill (else 0). barcode only if printed (else "").
- billDiscount / freight / otherCharges / roundOff = bill-level amounts (discount positive number). grandTotal = final payable amount on the bill.
- Numbers only (no ₹ or commas). If something is not on the bill, write 0 or "".
- Check: sum of lineTotal − billDiscount + freight + otherCharges + roundOff should be ≈ grandTotal.`};
function parseJSON(t){t=String(t||"");const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a<0||b<a)throw new Error("JSON नहीं मिला");return JSON.parse(t.slice(a,b+1).replace(/[“”]/g,'"'))}
const keyOf=s=>(String(s.gstin||s.name||"").toUpperCase().replace(/[^A-Z0-9ऀ-ॿ]/g,"").slice(0,24)+"_"+String(s.billNo||"").toUpperCase().replace(/[^A-Z0-9]/g,"")+"_"+String(s.date||"").replace(/\D/g,"")).slice(0,90);
/* GST + छूट + भाड़ा + राउंड-ऑफ सब मिलाकर हर सामान का "घर पहुँचा भाव" (एक पीस का) */
function landed(j){const its=(j.items||[]).filter(x=>num(x.qty)>0||num(x.free)>0);
  const base=its.map(x=>{let v=num(x.lineTotal);if(!(v>0)){const tx=num(x.taxable)>0?num(x.taxable):num(x.qty)*num(x.rate)*(1-num(x.discPct)/100);v=tx+(num(x.gstAmt)>0?num(x.gstAmt):tx*num(x.gstPct)/100)}return v});
  const B=base.reduce((a,v)=>a+v,0);const extra=-num(j.billDiscount)+num(j.freight)+num(j.otherCharges)+num(j.roundOff);
  let G=num(j.grandTotal);let f=1,warn="";
  if(B>0){if(G>0){f=G/B;if(Math.abs(f-1)>0.25){warn=`बिल का कुल ${rs(G)} पर सामान का जोड़ ${rs(r2(B))} — बहुत फर्क, AI का जवाब जाँचें`;f=(B+extra)/B}}else{f=(B+extra)/B;G=r2(B+extra)}}
  const lines=its.map((x,i)=>{const pcs=num(x.qty)+num(x.free),L=base[i]*f;return {name:String(x.name||"").trim()||"सामान "+(i+1),hi:String(x.hi||""),qty:pcs,rate:pcs>0?r2(L/pcs):0,mrp:num(x.mrp)||"",bar:/^\d{8,14}$/.test(String(x.barcode||""))?String(x.barcode):"",gst:num(x.gstPct),billRate:num(x.rate),free:num(x.free),hsn:String(x.hsn||"")}});
  return {lines,B:r2(B),G:r2(G),diff:r2(G-B),warn}}
async function aiApply(txt){
  let j;try{j=parseJSON(txt)}catch(e){toast("जवाब समझ नहीं आया — ChatGPT का पूरा जवाब कॉपी करके चिपकाएँ");return}
  if(j.app&&j.app!=="mh177-bill"){toast("यह इस ऐप का बिल-जवाब नहीं है");return}
  const sup=j.supplier||{};const key=keyOf(sup);
  if(!sup.billNo&&!sup.name){toast("जवाब में दुकान/बिल नंबर नहीं — दोबारा पूछें");return}
  if(D.ai&&D.ai.key===key){toast("♻️ यह बिल इसी खरीद में पहले से है — दोबारा नहीं जोड़ा");return}
  if(D.ai){toast("इस खरीद में एक बिल पहले से है — दूसरा बिल नई खरीद में डालें");return}
  const dup=[...LIST,...SENT].find(b=>b.aiKey===key);if(dup){beep(false);toast("⛔ यह बिल पहले ही चढ़ चुका है: "+dup.no+" ("+(dup.byName||"")+") — दोबारा नहीं चढ़ेगा");return}
  if(!S.demo&&S.db){try{const g=await S.db.doc("aikeys/"+key).get();if(g.exists){beep(false);toast("⛔ यह बिल पहले ही चढ़ चुका है: "+(g.data().no||"")+" — दोबारा नहीं चढ़ेगा");return}}catch(e){}}
  const L=landed(j);if(!L.lines.length){toast("जवाब में कोई सामान नहीं मिला");return}
  if(j.ref&&j.ref!==D.no)toast("ℹ️ यह जवाब दूसरी पर्ची ("+j.ref+") के प्रॉम्प्ट से बना था — कोई बात नहीं, जोड़ रहे हैं");
  L.lines.forEach(x=>{const it=x.bar?findByCode(x.bar):S.items.find(i=>i.name.toLowerCase()===x.name.toLowerCase());
    const ln={lid:nextLid(),bar:it&&it.barcode?it.barcode:x.bar,itemId:it?it.id:"",name:it?it.name:x.name,hi:x.hi,qty:x.qty,rate:x.rate,mrp:x.mrp||(it&&+it.mrp)||"",f:"",m:"",ai:1,seen:0,gst:x.gst,billRate:x.billRate,free:x.free,ts:Date.now()};
    if(it){const c=lastCost(it);if(c)ln.last=c}D.lines.push(ln)});
  D.ai={key,supplier:sup,B:L.B,G:L.G,diff:L.diff,warn:L.warn,n:L.lines.length};
  if(!D.shop&&sup.name)D.shop=String(sup.name);if(!D.phone&&sup.phone)D.phone=String(sup.phone).replace(/\D/g,"").slice(-10);
  D.mode="ai";D.paste="";save();draw();beep(true);
  toast(`🤖 ${L.lines.length} सामान आए · बिल ${rs(L.G)}${L.diff?` · ${rs(Math.abs(L.diff))} (GST के बाद छूट/भाड़ा/राउंड) सबमें बाँटा`:""}`)}

/* ---------- भेजें ---------- */
async function send(btn){
  const L=D.lines;if(!L.length){toast("कम से कम एक सामान जोड़ें");return}
  const bad=L.find(l=>!String(l.name||"").trim()||!(num(l.qty)>0)||!(num(l.rate)>0));
  if(bad){FLASH=bad.lid;closeSheet();draw();toast("⚠ "+(bad.name||"एक सामान")+": नाम, गिनती और भाव ज़रूरी");return}
  if(D.phone&&String(D.phone).replace(/\D/g,"").length!==10){toast("दुकान का मोबाइल 10 अंक का हो (या खाली छोड़ें)");return}
  if(!D.bill&&D.sureBill!==1){D.sureBill=1;save();beep(false);toast("🧾 दुकान के बिल की फोटो नहीं ली — बिना बिल भेजना है तो दोबारा दबाएँ");return}
  if(D.pay==="qr"&&!D.upi&&!D.qr&&D.sureQr!==1){D.sureQr=1;save();beep(false);toast("💳 दुकान के QR की फोटो नहीं — विक्रम जी भुगतान कैसे करेंगे? बिना QR भेजना है तो दोबारा दबाएँ");return}
  const unm=L.filter(l=>l.ai&&!l.bar).length;
  if(unm&&D.sureBar!==1){D.sureBar=1;save();beep(false);toast("📟 "+unm+" सामान का बारकोड मिलाना बाकी — बिना मिलाए भेजना है तो दोबारा दबाएँ");return}
  if(!D.loc)await fixLoc();
  const total=tot(),lines=L.map(l=>({lid:l.lid,bar:l.bar||"",itemId:l.itemId||"",name:String(l.name).trim(),hi:l.hi||"",qty:num(l.qty),rate:r2(num(l.rate)),mrp:r2(num(l.mrp)),amt:r2(num(l.qty)*num(l.rate)),
    f:l.f||"",m:l.m||"",low:!!(gain(l.rate,l.mrp)||{}).low,last:+l.last||0,ai:!!l.ai,seen:+l.seen||0,...(l.gst?{gst:l.gst}:{}),...(l.free?{free:l.free}:{})}));
  const doc={no:D.no,date:today(),ts:Date.now(),start:D.start,by:S.uid||"",byName:biller(),shop:String(D.shop||"").trim(),phone:String(D.phone||"").replace(/\D/g,"").slice(-10),loc:D.loc||null,
    lines,n:lines.length,total,gain:r2(mrpTot()-costWithMrp()),pct:totPct(),low:lines.filter(l=>l.low).map(l=>l.name),dear:lines.filter(l=>l.last&&l.rate>l.last*1.05).map(l=>l.name),
    bill:D.bill||"",qr:D.upi?"":(D.qr||""),upi:D.upi||"",pay:{mode:D.pay,status:D.pay==="qr"?"pending":D.pay==="udhar"?"udhar":"paid",amt:total},
    ai:D.ai?{supplier:D.ai.supplier,B:D.ai.B,G:D.ai.G,diff:D.ai.diff,warn:D.ai.warn||""}:null,aiKey:D.ai?D.ai.key:"",
    note:String(D.note||"").trim(),status:"sent",recv:null,app:SE.version};
  if(btn)btn.disabled=true;
  try{if(!S.demo){if(doc.aiKey){await S.db.doc("aikeys/"+doc.aiKey).set({no:doc.no,by:doc.by,byName:doc.byName,ts:doc.ts})}await S.db.collection("mbuys").doc(D.no).set(doc)}
    else LIST.unshift({id:D.no,...doc});
    D=null;save();VIEW="home";closeSheet();camAuto();draw();beep(true);
    toast(doc.pay.mode==="qr"?"📤 भेज दिया — विक्रम जी को "+rs(total)+" के भुगतान की सूचना गई":"📤 खरीद "+doc.no+" भेज दी · "+rs(total));
  }catch(e){if(btn)btn.disabled=false;const dupe=/permission|exists/i.test(e.code||e.message||"")&&doc.aiKey;
    toast(dupe?"⛔ यह बिल पहले ही किसी ने चढ़ा दिया है — दोबारा नहीं चढ़ेगा":"नहीं गया: "+(e.code||e.message||"")+" — इंटरनेट देखकर दोबारा दबाएँ (एंट्री फोन में सुरक्षित है)")}}

/* ---------- सूची ---------- */
SM.watch=function(){if(S.demo||!S.db||!S.uid)return;
  const set=(arr,which)=>{if(which===1)LIST=arr;else SENT=arr;if(S.tab==="mkt"&&VIEW!=="draft")draw();try{renderTabs()}catch(e){}};
  const map=s=>s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.ts||0)-(a.ts||0));
  try{if(!un1){const q=S.isOwner?S.db.collection("mbuys").orderBy("ts","desc").limit(300):S.db.collection("mbuys").where("by","==",S.uid).limit(60);un1=q.onSnapshot(s=>set(map(s),1),()=>{})}
    if(!un2&&!S.isOwner)un2=S.db.collection("mbuys").where("status","==","sent").limit(40).onSnapshot(s=>set(map(s),2),()=>{})}catch(e){}};
function all(){const m=new Map();[...LIST,...SENT].forEach(b=>m.set(b.id,b));return [...m.values()].sort((a,b)=>(b.ts||0)-(a.ts||0))}
SM.pendingPay=()=>LIST.filter(b=>b.pay&&b.pay.status==="pending").length;
SM.all=()=>all();
SM.toRecv=()=>all().filter(b=>b.status==="sent"&&(S.isOwner||b.by!==S.uid)).length;
/* मालिक की लाइव रिपोर्ट के लिए: आज की खरीद में फर्क / कम फायदा / भुगतान बाकी */
SM.warns=function(date){const w=[];all().filter(b=>b.date===date).forEach(b=>{if(b.recv&&b.recv.diff&&b.recv.diff.length)w.push(`🛍️ ${b.no} (${b.byName||""} → ${b.recv.byName||""}): ${b.recv.diff.join(", ")}`);
  if(b.low&&b.low.length)w.push(`🛍️ ${b.no} (${b.byName||""}): कम फायदा — ${b.low.join(", ")}`);if(b.dear&&b.dear.length)w.push(`🛍️ ${b.no} (${b.byName||""}): पिछली बार से महँगा — ${b.dear.join(", ")}`)});return w};
SM.badge=()=>S.isOwner?SM.pendingPay()+SM.toRecv():SM.toRecv();
const ST=b=>`${b.status==="recv"?`<span class="pill green">📦 पक्का</span>`:`<span class="pill blue">🚚 गिनना बाकी</span>`} ${b.pay&&b.pay.status==="pending"?`<span class="pill red">💳 भुगतान बाकी</span>`:b.pay&&b.pay.status==="udhar"?`<span class="pill blue">📒 उधार</span>`:`<span class="pill green">✅ भुगतान</span>`}`;

/* ---------- स्क्रीन: होम ---------- */
function rowHTML(b){const th=(b.lines||[]).find(l=>l.f);return `<div class="mk-li" data-mkopen="${esc(b.id)}" role="button" tabindex="0">${th?`<img src="${th.f}" alt="">`:`<span class="mk-li-i">🛍️</span>`}<div class="mid"><b>${esc(b.shop||"दुकान")} <i>${rs(b.total)}</i></b><span>${esc(b.no)} · ${ftime(b.ts)} ${fdate(b.date).slice(0,5)}${S.isOwner?" · "+esc(b.byName||""):""} · ${b.n||0} सामान${b.pct!=null?` · <em class="${b.pct<LOW?"bad":""}">${b.pct}%</em>`:""}${b.recv&&b.recv.diff&&b.recv.diff.length?` · <em class="bad">⚠ ${b.recv.diff.length} फर्क</em>`:""}</span></div><div class="mk-st">${ST(b)}</div></div>`}
function findHTML(){const q=FIND.trim().toLowerCase();if(q.length<2)return "";
  const hits=[];all().forEach(b=>(b.lines||[]).forEach(l=>{if(String(l.name).toLowerCase().includes(q)||String(l.hi||"").includes(FIND.trim()))hits.push({b,l})}));
  hits.sort((x,y)=>(y.b.ts||0)-(x.b.ts||0));const shops=new Map();hits.forEach(h=>{const k=h.b.shop||h.b.no;if(!shops.has(k))shops.set(k,h)});
  const pts=[...shops.values()].filter(h=>h.b.loc).slice(0,9);
  const route=pts.length?`https://www.google.com/maps/dir/?api=1&destination=${pts[pts.length-1].b.loc.lat},${pts[pts.length-1].b.loc.lng}${pts.length>1?"&waypoints="+pts.slice(0,-1).map(h=>h.b.loc.lat+","+h.b.loc.lng).join("|"):""}`:"";
  return `<div class="mk-find">${shops.size?[...shops.values()].map(h=>`<div class="mk-fr"><b>${esc(h.b.shop||"दुकान")}</b><span>${esc(h.l.name)} · ${rs(h.l.rate)}${h.l.mrp?" (MRP "+rs(h.l.mrp)+")":""} · ${fdate(h.b.date)} · ${esc(h.b.byName||"")}</span>${h.b.phone?`<a href="tel:${esc(h.b.phone)}">📞</a>`:""}${h.b.loc?`<a target="_blank" rel="noopener" href="https://maps.google.com/?q=${h.b.loc.lat},${h.b.loc.lng}">📍</a>`:""}</div>`).join("")+(route?`<a class="big mk-route" target="_blank" rel="noopener" href="${route}">🗺️ इन दुकानों का रास्ता (${pts.length})</a>`:""):`<p class="note">"${esc(FIND)}" अभी किसी खरीद में नहीं</p>`}</div>`}
function homeHTML(){const A=all();
  const pay=S.isOwner?A.filter(b=>b.pay&&b.pay.status==="pending"):[];const rcv=A.filter(b=>b.status==="sent"&&(S.isOwner||b.by!==S.uid));
  const mine=S.isOwner?A:A.filter(b=>b.by===S.uid);const td=mine.filter(b=>b.date===today());
  return `<div class="mk-head"><div><h2>🛍️ बाज़ार खरीद</h2><span>${S.isOwner?`आज ${td.length} खरीद · ${rs(r2(td.reduce((a,b)=>a+(+b.total||0),0)))}`:"दुकान पर ही एंट्री — स्कैन, भाव, फोटो"}</span></div>
    ${D?`<button class="mk-new" data-mkresume>▶ चालू खरीद<small>${D.lines.length} · ${rs(tot())}</small></button>`:`<button class="mk-new" data-mknew>＋ नई खरीद<small>स्कैन / बिल</small></button>`}</div>
  ${pay.length?`<h3 class="mk-h3">💳 भुगतान करना है <b>${pay.length}</b></h3><div class="mk-list">${pay.map(rowHTML).join("")}</div>`:""}
  ${rcv.length?`<h3 class="mk-h3">📦 माल आया — गिनकर पक्का करें <b>${rcv.length}</b></h3><div class="mk-list">${rcv.map(rowHTML).join("")}</div>`:""}
  ${S.isOwner?`<div class="mk-search"><span>🔎</span><input id="mkFind" value="${esc(FIND)}" placeholder="कहाँ मिलेगा? जैसे काजू, चावल…" autocomplete="off"></div><div id="mkFindR">${findHTML()}</div>`:""}
  <h3 class="mk-h3">${S.isOwner?"सबकी खरीद":"मेरी खरीद"}</h3>
  <div class="mk-list">${mine.length?mine.slice(0,60).map(rowHTML).join(""):`<div class="empty">अभी कोई खरीद नहीं</div>`}</div>`}

/* ---------- स्क्रीन: खरीद बनाना (बिलिंग जैसा) ---------- */
/* 🥛 क्रेट/डिब्बा/कार्टन: 1 क्रेट में कितने पीस — एक बार लिखो, अगली बार अपने-आप (उसी फोन में) */
function perOf(l){if(num(l.per)>0)return num(l.per);const it=l.itemId&&item(l.itemId);if(it&&!it.packOf&&+it.perPack>1)return +it.perPack;try{return +localStorage.getItem("mk_per_"+(l.itemId||l.bar||""))||0}catch(e){return 0}}
function lineHTML(l){const g=gain(l.rate,l.mrp),dear=l.last&&num(l.rate)>l.last*1.05,amt=r2(num(l.qty)*num(l.rate));
  const tag=l.webQ?`<i class="t new">🌐 इंटरनेट पर ढूँढ रहे…</i>`:l.imgQ?`<i class="t new">📸 AI फोटो पढ़ रहा…</i>`:l.web?`<i class="t bad">🌐 इंटरनेट से — पैकेट से मिलाएँ</i>`:l.pic?`<i class="t ok">📸 फोटो से पढ़ा</i>`:l.ai?(l.bar?(+l.seen>=num(l.qty)?`<i class="t ok">✓ गिना ${l.seen}/${l.qty}</i>`:`<i class="t">📟 गिनें ${+l.seen||0}/${l.qty}</i>`):`<i class="t bad">📟 बारकोड मिलाएँ</i>`):l.itemId?`<i class="t ok">♻️</i>`:`<i class="t new">🆕</i>`;
  const aiBtn=(!l.itemId&&!l.pic&&!l.imgQ&&!l.webQ&&(l.aiNo||!String(l.name).trim()||l.web))?`<button type="button" class="t aiph" data-ph="f">📸 फोटो लें — AI नाम भरेगा</button>`:"";
  return `<div class="mk-ln ${FLASH===l.lid?"fl":""} ${g&&g.low?"low":""}" data-lid="${esc(l.lid)}">
    <button type="button" class="mk-th" data-ph="f" aria-label="आगे की फोटो">${l.f?`<img src="${l.f}" alt="">`:(l.itemId&&SE.photoSrc(item(l.itemId))?`<img src="${esc(SE.photoSrc(item(l.itemId)))}" alt="">`:"📦")}<em class="${l.m?"on":""}" data-ph="m" title="MRP की फोटो">🏷️</em></button>
    <div class="mk-mid"><input class="mk-nm" data-f="name" value="${esc(l.name)}" placeholder="सामान का नाम" autocomplete="off"><div class="mk-tags">${tag}${aiBtn}${(()=>{const n=perOf(l);return `<button type="button" class="t crt" data-crate data-q="${n||0}" title="पूरा क्रेट/डिब्बा/कार्टन जोड़ें">🧺${n?" +1 क्रेट ("+n+")":" क्रेट?"}</button>`})()}${l.gst?`<i class="t">GST ${l.gst}%</i>`:""}${l.free?`<i class="t ok">+${l.free} मुफ़्त</i>`:""}${g?`<i class="t ${g.low?"bad":"ok"}">${g.per<0?"⛔ घाटा":g.low?"🔴":"🟢"} ${g.pct}% · ${rs(g.per)}</i>`:`<i class="t">MRP डालें</i>`}${dear?`<i class="t bad">⚠ पिछली बार ${rs(l.last)}</i>`:""}</div>
      <div class="mk-nums"><span class="mk-q"><button type="button" data-q="-1" aria-label="एक कम">−</button><input data-f="qty" inputmode="decimal" value="${esc(l.qty)}" aria-label="गिनती"><button type="button" data-q="1" aria-label="एक और">+</button></span>
        <label class="mk-in"><span>₹ एक</span><input data-f="rate" inputmode="decimal" value="${esc(l.rate)}" placeholder="${l.last||"भाव"}" aria-label="एक का खरीद भाव"></label>
        <label class="mk-in mrp"><span>MRP</span><input data-f="mrp" inputmode="decimal" value="${esc(l.mrp)}" placeholder="0" aria-label="MRP"></label></div>${l.perOpen?`<label class="mk-cr">🧺 1 क्रेट/डिब्बे/कार्टन में <input data-f="per" inputmode="numeric" value="${perOf(l)||""}" placeholder="पीस"> पीस</label>`:""}</div>
    <div class="mk-am"><b>${rs(amt)}</b><button type="button" class="mk-x" data-del aria-label="${esc(l.name)} हटाएँ">✕</button></div></div>`}
function searchHits(){const q=String(D.q||"").trim().toLowerCase();if(q.length<2)return "";
  const hits=S.items.filter(i=>i.active!==false&&!i.virtual&&(i.name.toLowerCase().includes(q)||String(i.hi||"").includes(D.q.trim())||String(i.code||"")===q||String(i.barcode||"")===q)).slice(0,6);
  return `<div class="mk-hits">${hits.map(i=>`<button type="button" data-hit="${esc(i.id)}">${tileHTML(i,"mini")}<span>${esc(SE.capNm(i.name))}</span></button>`).join("")}<button type="button" class="nw" data-hitnew>➕ "${esc(D.q.trim())}" नया</button></div>`}
function draftHTML(){const L=D.lines,ai=D.ai,unm=L.filter(l=>l.ai&&!l.bar).length,pct=totPct();
  return `<div class="mk-bar1"><button class="mk-back" data-mkback aria-label="वापस">‹</button><div class="mk-id"><b>${esc(D.shop||"नई खरीद")}</b><span>${esc(D.no)} · ${D.loc?"📍✓":"📍✗"} · ${esc(biller())}</span></div>
    <div class="mk-seg" role="tablist"><button role="tab" aria-selected="${D.mode!=="ai"}" data-mode="scan">📟 स्कैन</button><button role="tab" aria-selected="${D.mode==="ai"}" data-mode="ai">🤖 बिल से</button></div></div>
  ${D.mode==="ai"&&!ai?`<div class="mk-ai">
    <div class="mk-steps"><button type="button" data-aicopy><b>①</b>📋 प्रॉम्प्ट कॉपी</button><span>→</span><div><b>②</b>ChatGPT में बिल की फोटो + प्रॉम्प्ट</div><span>→</span><div><b>③</b>जवाब कॉपी करके नीचे</div></div>
    <textarea id="mkPaste" rows="3" placeholder="ChatGPT / Gemini का जवाब यहाँ चिपकाएँ ({ … })">${esc(D.paste||"")}</textarea>
    <div class="mk-ai2"><button class="big ghost" type="button" data-aipaste>📋 चिपकाएँ</button><button class="big" type="button" data-aiapply>🤖 सामान बनाएँ</button></div>
    <p class="note">GST, छूट, भाड़ा, राउंड-ऑफ — सब जोड़कर हर सामान का <b>घर पहुँचा भाव</b> अपने-आप। एक बिल दो बार नहीं चढ़ेगा।</p></div>`:""}
  ${ai?`<div class="mk-aisum"><b>🤖 ${esc(ai.supplier.name||"")}</b><span>बिल ${esc(ai.supplier.billNo||"")} · ${esc(ai.supplier.date||"")} · कुल ${rs(ai.G)}${ai.diff?` · ${rs(Math.abs(ai.diff))} सबमें बाँटा`:""}</span>${ai.warn?`<em>⚠ ${esc(ai.warn)}</em>`:""}${unm?`<em>📟 ${unm} सामान का बारकोड स्कैन करके मिलाएँ</em>`:`<i>✓ सब बारकोड मिले</i>`}</div>`:""}
  <div class="mk-search"><span>🔎</span><input id="mkQ" value="${esc(D.q||"")}" placeholder="नाम / कोड लिखें — या ऊपर कैमरे से स्कैन" autocomplete="off" enterkeyhint="done"><button type="button" class="scanbtn" data-mkscan aria-label="कैमरा">📷</button></div>
  <div id="mkHits">${searchHits()}</div>
  ${L.length&&window.SL?`<button type="button" class="mk-lbl" data-mklbl>🏷️ इन ${L.length} सामान के बारकोड लेबल छापें</button>`:""}
  <div class="mk-lines">${L.length?L.map(lineHTML).join(""):`<div class="mk-empty"><b>📟 बारकोड कैमरे के सामने लाएँ</b><span>सामान अपने-आप जुड़ेगा — MRP और पिछला भाव भी। दोबारा स्कैन = +1<br>पक्का बिल हो तो ऊपर <b>🤖 बिल से</b> दबाएँ</span></div>`}</div>
  <div class="mk-cart" id="mkCart"><div><b>${L.length} सामान · ${rs(tot())}</b><span>${pct!=null?`MRP पर फायदा <em class="${pct<LOW?"bad":""}">${pct}%</em> (${rs(r2(mrpTot()-costWithMrp()))})`:"भाव और MRP डालें"}${L.some(l=>(gain(l.rate,l.mrp)||{}).low)?` · 🔴 ${L.filter(l=>(gain(l.rate,l.mrp)||{}).low).length} कम`:""}</span></div><button class="mk-go" data-fin ${L.length?"":"disabled"}>आगे ›</button></div>`}
function cartBar(){const c=$("#mkCart");if(!c||!D)return;const L=D.lines,pct=totPct();
  c.firstElementChild.innerHTML=`<b>${L.length} सामान · ${rs(tot())}</b><span>${pct!=null?`MRP पर फायदा <em class="${pct<LOW?"bad":""}">${pct}%</em> (${rs(r2(mrpTot()-costWithMrp()))})`:"भाव और MRP डालें"}</span>`}

/* आखिरी कदम — बिल, QR, भुगतान (नीचे से खुलने वाली शीट) */
function finSheet(){const u=parseUpi(D.upi||"");
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px mk-fin" role="dialog" aria-label="बिल और भुगतान"><div class="grab"></div>
    <div class="sh-head"><div><h3>${rs(tot())} · ${D.lines.length} सामान</h3><span class="note">${esc(D.no)}</span></div><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="mk-ph3"><button type="button" data-fbill class="${D.bill?"has":""}">${D.bill?`<img src="${D.bill}" alt="">`:"🧾"}<span>दुकान का बिल</span></button>
      <button type="button" data-fqr class="${D.upi||D.qr?"has":""}">${D.qr?`<img src="${D.qr}" alt="">`:"💳"}<span>${u?"✓ "+esc(u.pn||u.pa):"दुकान का QR"}</span></button>
      <button type="button" data-floc class="${D.loc?"has":""}">📍<span>${D.loc?"जगह ✓ ±"+(D.loc.acc||"?")+"m":"जगह लें"}</span></button></div>
    <div class="mk-pays">${PAYS.map(([k,v])=>`<button type="button" aria-pressed="${D.pay===k}" data-fpay="${k}">${v}</button>`).join("")}</div>
    <div class="mk-two"><label class="mk-in w"><span>🏪</span><input id="fShop" value="${esc(D.shop)}" placeholder="दुकान (ज़रूरी नहीं)"></label><label class="mk-in w"><span>📞</span><input id="fPh" inputmode="tel" value="${esc(D.phone)}" placeholder="मोबाइल"></label></div>
    <label class="mk-in w"><span>📝</span><input id="fNote" value="${esc(D.note)}" placeholder="कुछ लिखना हो (जैसे 2 पेटी बाद में)"></label>
    <button class="big mk-send" data-fsend>📤 भेजें · ${rs(tot())}</button>
    <p class="note" style="text-align:center;margin:6px 0 0">${D.pay==="qr"?"विक्रम जी को भुगतान की सूचना जाएगी · ":""}बिलर गिनकर पक्का करेंगे, तब स्टॉक बढ़ेगा</p></div></div>`;
  const sh=$("#sheet");
  sh.oninput=e=>{const id=e.target.id;if(id==="fShop")D.shop=e.target.value;if(id==="fPh")D.phone=e.target.value;if(id==="fNote")D.note=e.target.value;save()};
  sh.onclick=async e=>{const t=e.target;if(t.matches("[data-close]")||t.closest(".x[data-close]")){closeSheet();draw();return}
    if(t.closest("[data-fbill]")){pick(async f=>{try{D.bill=await shrink(f,1000,.6);D.sureBill=0;save();finSheet()}catch(x){toast("फोटो नहीं बनी")}});return}
    if(t.closest("[data-fqr]")){pick(async f=>{try{let c=null;try{c=await decodeImage(f)}catch(x){}
        if(c&&/^upi:/i.test(c)){D.upi=c;D.qr="";const u2=parseUpi(c);if(u2&&!D.shop&&u2.pn)D.shop=decodeURIComponent(u2.pn);toast("💳 QR पढ़ लिया: "+(u2&&(u2.pn||u2.pa)))}else{D.qr=await shrink(f,700,.7);D.upi="";toast("QR पढ़ा नहीं गया — फोटो भेज देंगे, विक्रम जी स्कैन कर लेंगे")}
        D.sureQr=0;save();finSheet()}catch(x){toast("फोटो नहीं बनी")}});return}
    if(t.closest("[data-floc]")){toast("📍 जगह देख रहे हैं…");const l=await fixLoc();if(!l)toast("जगह नहीं मिली — फोन में Location चालू करें");finSheet();return}
    const p=t.closest("[data-fpay]");if(p){D.pay=p.dataset.fpay;save();finSheet();return}
    const s=t.closest("[data-fsend]");if(s)send(s)}}

/* ---------- स्क्रीन: एक खरीद (भुगतान / गिनकर पक्का) ---------- */
function detailHTML(b){const own=b.by===S.uid,canRecv=b.status==="sent"&&(S.isOwner||!own),pend=b.pay&&b.pay.status==="pending";const link=payLink(b);
  const R=RCV&&RCV.id===b.id?RCV:null;
  return `<div class="mk-bar1"><button class="mk-back" data-mkback aria-label="वापस">‹</button><div class="mk-id"><b>${esc(b.shop||"दुकान")} · ${rs(b.total)}</b><span>${esc(b.no)} · ${fdate(b.date)} ${ftime(b.ts)} · ${esc(b.byName||"")}</span></div><div class="mk-st">${ST(b)}</div></div>
  <div class="mk-meta">${b.phone?`<a href="tel:${esc(b.phone)}">📞 ${esc(b.phone)}</a>`:""}${b.loc?`<a target="_blank" rel="noopener" href="https://maps.google.com/?q=${b.loc.lat},${b.loc.lng}">📍 नक्शा</a>`:"<span>📍 जगह नहीं</span>"}<span>${esc(PAYN[b.pay&&b.pay.mode]||"")}</span>${b.pct!=null?`<span class="${b.pct<LOW?"bad":""}">फायदा ${b.pct}%</span>`:""}${b.ai?`<span>🤖 बिल ${esc(b.ai.supplier&&b.ai.supplier.billNo||"")}</span>`:""}</div>
  ${b.note?`<p class="note">📝 ${esc(b.note)}</p>`:""}
  ${S.isOwner&&pend?`<div class="mk-pay"><h3>💳 भुगतान करें — ${rs(b.pay.amt||b.total)}</h3>
    ${link?`<div class="qrbox"><div class="qr" id="mkPayQr"></div><b>${rs(b.pay.amt||b.total)}</b><span class="note">${esc((parseUpi(b.upi)||{}).pn||"")} · ${esc((parseUpi(b.upi)||{}).pa||"")}</span></div><a class="big" href="${esc(link)}">📱 UPI ऐप में खोलें</a>`:b.qr?`<img src="${b.qr}" alt="दुकान का QR" style="width:100%;max-width:300px;display:block;margin:0 auto;border-radius:12px"><p class="note" style="text-align:center">दूसरे फोन से स्कैन करें · रकम ${rs(b.total)} डालें</p>`:`<p class="note">दुकान का QR नहीं आया — ${b.phone?"दुकान के नंबर "+esc(b.phone)+" पर UPI करें":"खरीदार से पूछें"}</p>`}
    <div class="mk-two"><label class="mk-in w"><span>UTR</span><input id="mkUtr" inputmode="numeric" placeholder="12 अंक (ज़रूरी नहीं)"></label><button class="big ghost" type="button" data-proof>${OPEN&&SM._proof?"✓ रसीद":"📸 रसीद"}</button></div>
    <button class="big mk-send" data-paid>✅ भुगतान हो गया</button></div>`:""}
  ${b.pay&&b.pay.status==="paid"&&b.pay.paidTs?`<div class="mk-meta"><span class="ok">✅ ${fdate(today(new Date(b.pay.paidTs)))} ${ftime(b.pay.paidTs)} · ${esc(b.pay.paidBy||"")}${b.pay.utr?" · UTR "+esc(b.pay.utr):""}</span>${b.phone?`<a target="_blank" rel="noopener" href="https://wa.me/91${esc(b.phone)}?text=${encodeURIComponent("नमस्ते, 177 वेट कैंटीन की ओर से "+rs(b.pay.amt||b.total)+" का भुगतान कर दिया है"+(b.pay.utr?" (UTR "+b.pay.utr+")":"")+"। धन्यवाद — विक्रम")}">💬 दुकान को बताएँ</a>`:""}</div>${b.pay.proof?`<img src="${b.pay.proof}" alt="रसीद" class="mk-proof">`:""}`:""}
  ${b.recv?`<div class="mk-meta"><span class="ok">📦 पक्का: ${esc(b.recv.byName||"")} · ${ftime(b.recv.ts)}</span>${b.recv.diff&&b.recv.diff.length?`<span class="bad">⚠ ${b.recv.diff.map(esc).join(" · ")}</span>`:"<span class=ok>सब बराबर</span>"}</div>`:""}
  ${canRecv?`<div class="mk-rcvh">📦 <b>गिनकर पक्का करें</b><span>ऊपर कैमरे से हर सामान स्कैन करें या गिनती लिखें</span></div>`:own&&b.status==="sent"?`<p class="note">📦 दूसरे साथी (बिलर) गिनकर पक्का करेंगे — खुद की खरीद खुद पक्की नहीं होती</p>`:""}
  <div class="mk-lines">${(b.lines||[]).map(l=>{const g=gain(l.rate,l.mrp),got=R?R.got[l.lid]:null;return `<div class="mk-ln ro ${g&&g.low?"low":""} ${R&&FLASH===l.lid?"fl":""}"><span class="mk-th">${l.f?`<img src="${l.f}" alt="">`:"📦"}${l.m?`<em class="on">🏷️</em>`:""}</span>
    <div class="mk-mid"><b class="mk-nm">${esc(l.name)}</b><div class="mk-tags"><i class="t">${l.qty} × ${rs(l.rate)}</i>${l.mrp?`<i class="t">MRP ${rs(l.mrp)}</i>`:""}${g?`<i class="t ${g.low?"bad":"ok"}">${g.pct}%</i>`:""}${l.bar?"":`<i class="t new">बिना बारकोड</i>`}${l.gst?`<i class="t">GST ${l.gst}%</i>`:""}</div>
    ${R?`<div class="mk-nums"><span class="mk-q"><button type="button" data-rq="${esc(l.lid)}" data-d="-1">−</button><input data-rg="${esc(l.lid)}" inputmode="decimal" value="${got}"><button type="button" data-rq="${esc(l.lid)}" data-d="1">+</button></span><i class="t ${num(got)===num(l.qty)?"ok":"bad"}">${num(got)===num(l.qty)?"✓ बराबर":"फर्क "+r2(num(got)-num(l.qty))}</i></div>`:""}</div><div class="mk-am"><b>${rs(l.amt)}</b></div></div>`}).join("")}</div>
  ${canRecv?(R?`<button class="big mk-send" data-recv>✓ सब गिन लिया — पक्का करें (स्टॉक बढ़ेगा)</button>`:`<button class="big mk-send" data-rstart>📦 गिनना शुरू करें</button>`):""}
  ${b.bill?`<img src="${b.bill}" alt="दुकान का बिल" class="mk-proof">`:`<p class="note">🧾 बिल की फोटो नहीं ली गई</p>`}`}
function rcvScan(code){const b=all().find(x=>x.id===OPEN);if(!b||!RCV)return;const l=(b.lines||[]).find(x=>x.bar===code)||(b.lines||[]).find(x=>{const it=findByCode(code);return it&&x.itemId===it.id});
  if(!l){beep(false);toast("⚠ यह सामान इस खरीद में नहीं है: "+code);return}
  if(!RCV.fresh[l.lid]){RCV.fresh[l.lid]=1;RCV.got[l.lid]=1}else RCV.got[l.lid]=r2(num(RCV.got[l.lid])+1);
  FLASH=l.lid;draw();beep(RCV.got[l.lid]<=l.qty);toast((RCV.got[l.lid]<=l.qty?"✓ ":"⚠ ज़्यादा: ")+l.name+" "+RCV.got[l.lid]+"/"+l.qty)}

/* बिलर ने गिन लिया → स्टॉक + खरीद का रिकॉर्ड + नए सामान */
async function receive(b,btn){if(!RCV)return;btn.disabled=true;btn.textContent="⏳ चढ़ रहा है…";
  const ts=Date.now(),date=today(),why="बाज़ार खरीद "+b.no+" · "+(b.byName||"");const lines=[],diff=[],rl=[];let nNew=0;
  try{for(const l of b.lines||[]){const got=num(RCV.got[l.lid]);rl.push({lid:l.lid,got});if(got!==num(l.qty))diff.push(`${l.name} ${l.qty} लिखे, ${got} आए`);if(!(got>0))continue;
      let id=l.itemId&&item(l.itemId)?l.itemId:"";if(!id&&l.bar){const ex=findByCode(l.bar);if(ex)id=ex.id}
      if(!id){id="i"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);const code=nextCode("kirana");
        const bar=/^\d{8,14}$/.test(l.bar||"")&&!findByCode(l.bar)?l.bar:ean13("2000000"+code+"0");
        const it={name:l.name,hi:l.hi||"",emoji:"",cat:"kirana",sub:"",unit:"pc",size:"",mrp:num(l.mrp),sale:num(l.mrp)||0,cost:num(l.rate),code,barcode:bar,track:true,min:5,
          hue:Math.floor(Math.random()*360),order:S.items.length+1,active:true,src:"market",mp:b.no,addedBy:S.uid||"",addedByName:biller(),addedTs:ts,pending:!S.isOwner};
        if(!S.demo)await S.db.collection("items").doc(id).set(it);if(!item(id))S.items.push({id,...it});if(l.f&&!SE.photos[id])SE.photos[id]=l.f;nNew++}
      await adjStock([[id,got]],why);
      lines.push({id,name:item(id).name,unit:"pc",qty:got,rate:r2(num(l.rate)),amt:r2(got*num(l.rate)),billAmt:r2(got*num(l.rate)),prev:0,mp:l.lid})}
    if(lines.length){const t2=r2(lines.reduce((a,l)=>a+l.amt,0)),pid="pm"+b.no.replace(/\W/g,"");const pm=b.pay&&b.pay.mode;
      const pdoc={date,ts,by:S.uid||"",byName:biller(),supId:"",supName:b.shop||"बाज़ार",supPhone:b.phone||"",lines,gross:t2,disc:0,total:t2,pay:pm==="qr"?"vikram":pm==="galla"?"galla":pm==="udhar"?"udhar":"vikram",
        paid:pm==="udhar"?0:t2,due:pm==="udhar"?t2:0,src:"shop",note:"🛍️ बाज़ार खरीद "+b.no+" · खरीदा: "+(b.byName||""),photos:[],photoPending:0,cancelled:false,mp:b.no,buyer:b.byName||""};
      if(!S.demo)await S.db.collection("purchases").doc(pid).set(pdoc);S.purchHist&&S.purchHist.push({id:pid,...pdoc})}
    const recv={by:S.uid||"",byName:biller(),ts,lines:rl,diff};
    if(!S.demo)await S.db.collection("mbuys").doc(b.id).update({status:"recv",recv});b.status="recv";b.recv=recv;
    RCV=null;camAuto();draw();beep(!diff.length);toast(diff.length?"⚠ पक्का हुआ — "+diff.length+" में फर्क, विक्रम जी को दिखेगा":"✓ पक्का — स्टॉक बढ़ गया"+(nNew?" · "+nNew+" नया सामान बना":""))}
  catch(e){btn.disabled=false;btn.textContent="✓ सब गिन लिया — पक्का करें";toast("नहीं हुआ: "+(e.code||e.message||""))}}

async function markPaid(b,btn){btn.disabled=true;const utr=String(($("#mkUtr")||{}).value||"").replace(/\s/g,"").slice(0,30);
  const pay={...b.pay,status:"paid",paidTs:Date.now(),paidBy:biller(),utr,...(SM._proof?{proof:SM._proof}:{})};
  try{if(!S.demo)await S.db.collection("mbuys").doc(b.id).update({pay});b.pay=pay;SM._proof="";draw();beep(true);toast("✅ "+b.no+" का भुगतान दर्ज — "+(b.byName||"खरीदार")+" को दिखेगा")}
  catch(e){btn.disabled=false;toast("नहीं हुआ: "+(e.code||e.message||""))}}

function draw(){const el=$("#p-mkt");if(!el||S.tab!=="mkt")return;
  const a=document.activeElement,keep=a&&el.contains(a)?(a.id||(a.dataset&&a.dataset.f&&a.closest("[data-lid]")?a.closest("[data-lid]").dataset.lid+"|"+a.dataset.f:"")):"";
  const b=VIEW==="detail"&&OPEN?all().find(x=>x.id===OPEN):null;
  el.innerHTML=VIEW==="draft"&&D?draftHTML():b?detailHTML(b):homeHTML();
  if(b&&S.isOwner&&b.pay&&b.pay.status==="pending"){const q=$("#mkPayQr"),lk=payLink(b);if(q&&lk&&window.QRCode)try{new QRCode(q,{text:lk,width:200,height:200,correctLevel:QRCode.CorrectLevel.M})}catch(e){}}
  if(keep){let k=null;if(keep.includes("|")){const [lid,f]=keep.split("|");k=el.querySelector(`[data-lid="${lid}"] [data-f="${f}"]`)}else k=document.getElementById(keep);
    if(k)try{k.focus();const v=k.value||"";k.setSelectionRange&&k.setSelectionRange(v.length,v.length)}catch(e){}}
  if(FLASH){const f=el.querySelector(".fl");if(f&&f.scrollIntoView&&VIEW==="draft"&&!keep)try{f.scrollIntoView({block:"nearest",behavior:"smooth"})}catch(e){}setTimeout(()=>{FLASH=""},900)}}
SM.render=function(){load();if(VIEW==="draft"&&!D)VIEW="home";draw()};

/* ---------- बटन ---------- */
SM.bind=function(){const el=$("#p-mkt");if(!el)return;
  el.addEventListener("click",async e=>{const t=e.target;
    if(t.closest("[data-mknew]")){D=blank();save();VIEW="draft";draw();camAuto();fixLoc();return}
    if(t.closest("[data-mkresume]")){VIEW="draft";draw();camAuto();if(!D.loc)fixLoc();return}
    if(t.closest("[data-mkback]")){VIEW="home";OPEN=null;RCV=null;camAuto();draw();window.scrollTo(0,0);return}
    const op=t.closest("[data-mkopen]");if(op){OPEN=op.dataset.mkopen;RCV=null;VIEW="detail";draw();window.scrollTo(0,0);return}
    if(t.closest("[data-mkscan]")){if(typeof liveScan==="function")liveScan();return}
    const md=t.closest("[data-mode]");if(md&&D){D.mode=md.dataset.mode;save();draw();return}
    if(t.closest("[data-aicopy]")){const p=SM.aiPrompt(D.no);try{await navigator.clipboard.writeText(p);toast("📋 प्रॉम्प्ट कॉपी हो गया — ChatGPT/Gemini में बिल की फोटो के साथ चिपकाएँ")}catch(x){const ta=document.createElement("textarea");ta.value=p;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");toast("📋 प्रॉम्प्ट कॉपी हो गया")}catch(y){toast("कॉपी नहीं हुआ")}ta.remove()}return}
    if(t.closest("[data-aipaste]")){try{const s=await navigator.clipboard.readText();if(s){D.paste=s;save();draw();aiApply(s)}else toast("कॉपी किया हुआ कुछ नहीं मिला")}catch(x){toast("नीचे के खाने में लंबा दबाकर Paste करें");$("#mkPaste")?.focus()}return}
    if(t.closest("[data-aiapply]")){aiApply(($("#mkPaste")||{}).value||D.paste||"");return}
    const hit=t.closest("[data-hit]");if(hit){const it=item(hit.dataset.hit);if(it){if(it.barcode&&D.lines.some(l=>l.bar===it.barcode))SM.scan(it.barcode);else addManual(it.name)}D.q="";save();draw();return}
    if(t.closest("[data-hitnew]")){addManual(D.q);return}
    if(t.closest("[data-fin]")){finSheet();return}
    const ln=t.closest("[data-lid]");
    if(ln&&D&&VIEW==="draft"){const l=D.lines.find(x=>x.lid===ln.dataset.lid);if(!l)return;
      const ph=t.closest("[data-ph]");if(ph){const k=t.closest("em[data-ph]")?"m":"f";pick(async f=>{try{l[k]=await shrink(f,k==="m"?240:200,.6);save();draw();
        if(!S.demo&&(l.aiNo||!String(l.name).trim()||l.web||!l.itemId&&!num(l.mrp)||k==="m"&&!num(l.mrp))){if(SE.aiReady())imgFill(l,await shrink(f,1100,.75));else toast("🔑 AI चाबी सेटिंग में नहीं है — मालिक ⚙ सेटिंग में Gemini चाबी डालें")}}catch(x){toast("फोटो नहीं बनी")}});return}
      const q=t.closest("[data-q]");if(q&&q.hasAttribute("data-crate")&&!(+q.dataset.q>0)){l.perOpen=1;save();draw();setTimeout(()=>{const pi=document.querySelector(`[data-lid="${l.lid}"] [data-f=per]`);if(pi)pi.focus()},50);return}if(q){const n=r2(num(l.qty)+(+q.dataset.q));if(n<=0){if(q.dataset.sure!=="1"){q.dataset.sure="1";toast("एक और बार − दबाएँ तो हट जाएगा");setTimeout(()=>{q.dataset.sure=""},2000);return}D.lines=D.lines.filter(x=>x!==l)}else l.qty=n;save();draw();beep(true);return}
      const dl=t.closest("[data-del]");if(dl){if(dl.dataset.sure!=="1"){dl.dataset.sure="1";dl.textContent="पक्का?";setTimeout(()=>{if(dl.isConnected){dl.dataset.sure="";dl.textContent="✕"}},2500);return}D.lines=D.lines.filter(x=>x!==l);save();draw();return}
      return}
    const b=VIEW==="detail"&&OPEN?all().find(x=>x.id===OPEN):null;if(!b)return;
    if(t.closest("[data-proof]")){pick(async f=>{try{SM._proof=await shrink(f,700,.6);draw();toast("✓ रसीद लगी")}catch(x){}});return}
    const pd=t.closest("[data-paid]");if(pd){markPaid(b,pd);return}
    if(t.closest("[data-rstart]")){RCV={id:b.id,got:{},fresh:{}};(b.lines||[]).forEach(l=>RCV.got[l.lid]=num(l.qty));draw();camAuto();toast("📟 हर सामान स्कैन करें — पहली बार स्कैन पर गिनती 1 से शुरू होगी");return}
    const rq=t.closest("[data-rq]");if(rq&&RCV){const k=rq.dataset.rq;RCV.got[k]=Math.max(0,r2(num(RCV.got[k])+(+rq.dataset.d)));RCV.fresh[k]=1;draw();return}
    const rc=t.closest("[data-recv]");if(rc){receive(b,rc);return}
  });
  el.addEventListener("input",e=>{const t=e.target;
    if(t.id==="mkFind"){FIND=t.value;const r=$("#mkFindR");if(r)r.innerHTML=findHTML();return}
    if(t.dataset.rg&&RCV){RCV.got[t.dataset.rg]=num(t.value);RCV.fresh[t.dataset.rg]=1;return}
    if(!D)return;
    if(t.id==="mkQ"){D.q=t.value;const h=$("#mkHits");if(h)h.innerHTML=searchHits();return}
    if(t.id==="mkPaste"){D.paste=t.value;save();return}
    const ln=t.closest("[data-lid]");if(!ln||!t.dataset.f)return;const l=D.lines.find(x=>x.lid===ln.dataset.lid);if(!l)return;
    l[t.dataset.f]=t.value;if(t.dataset.f==="name")l.nmEdit=1;save();if(t.dataset.f==="per"){const n=parseInt(t.value)||0;try{localStorage.setItem("mk_per_"+(l.itemId||l.bar||""),n)}catch(e){}}
    const am=ln.querySelector(".mk-am b");if(am)am.textContent=rs(r2(num(l.qty)*num(l.rate)));cartBar();
    if(t.dataset.f!=="name"){const g=gain(l.rate,l.mrp);ln.classList.toggle("low",!!(g&&g.low));const tmp=document.createElement("div");tmp.innerHTML=lineHTML(l);const nt=tmp.querySelector(".mk-tags"),ot=ln.querySelector(".mk-tags");if(nt&&ot)ot.innerHTML=nt.innerHTML}
  });
  el.addEventListener("change",e=>{const t=e.target;if(t.dataset.rg&&RCV){const b=all().find(x=>x.id===OPEN);const l=b&&(b.lines||[]).find(x=>x.lid===t.dataset.rg);const tg=t.closest(".mk-nums")&&t.closest(".mk-nums").querySelector(".t");if(l&&tg){const ok=num(RCV.got[l.lid])===num(l.qty);tg.className="t "+(ok?"ok":"bad");tg.textContent=ok?"✓ बराबर":"फर्क "+r2(num(RCV.got[l.lid])-num(l.qty))}}});
  el.addEventListener("keydown",e=>{const t=e.target;
    if(e.key==="Enter"&&t.id==="mkQ"){e.preventDefault();const q=String(D.q||"").trim();if(!q)return;const it=findByCode(q);if(it||/^\d{8,14}$/.test(q)){D.q="";SM.scan(q)}else{const h=el.querySelector("[data-hit]");if(h)h.click();else addManual(q)}return}
    if(e.key==="Enter"&&t.dataset&&t.dataset.f){e.preventDefault();const order=["name","qty","rate","mrp"],ln=t.closest("[data-lid]"),i=order.indexOf(t.dataset.f);const nx=i<order.length-1?ln.querySelector(`[data-f="${order[i+1]}"]`):null;if(nx){nx.focus();nx.select&&nx.select()}else{t.blur();const q=$("#mkQ");if(q&&!SE.cam.on)q.focus()}}
    if((e.key==="Enter"||e.key===" ")&&t.matches&&t.matches("[data-mkopen]")){e.preventDefault();t.click()}});
  const st=document.createElement("style");st.textContent=`
#p-mkt{padding-bottom:96px}
.mk-head{display:flex;align-items:center;gap:10px;margin:2px 0 10px;padding:12px 12px;border-radius:18px;background:linear-gradient(125deg,#0f5132,#16a34a 55%,#65a30d);color:#fff;box-shadow:0 8px 22px -10px rgba(22,101,52,.7)}
.mk-head>div{flex:1;min-width:0}.mk-head h2{margin:0;font-family:var(--f-display);font-size:21px;line-height:1.1}.mk-head span{font-size:12.5px;opacity:.9}
.mk-new{border:0;border-radius:14px;background:#fff;color:#0f5132;font-weight:900;font-size:16px;padding:9px 14px;display:grid;line-height:1.1;box-shadow:0 4px 12px rgba(0,0,0,.18)}.mk-new small{font-size:11px;font-weight:700;opacity:.7}
.mk-h3{display:flex;align-items:center;gap:6px;margin:14px 2px 6px;font-size:15px}.mk-h3 b{background:var(--chili);color:#fff;border-radius:99px;padding:0 8px;font-size:12px}
.mk-list{display:grid;gap:6px}
.mk-li{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:14px;background:var(--surface);box-shadow:var(--shadow);cursor:pointer}
.mk-li>img,.mk-li-i{width:42px;height:42px;border-radius:11px;object-fit:cover;flex:none;display:grid;place-items:center;background:#e9f9ef;font-size:20px}
.mk-li .mid{flex:1;min-width:0;display:grid}.mk-li .mid b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mk-li .mid b i{font-style:normal;color:#0f6b36;margin-left:4px}
.mk-li .mid span{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mk-li em,.mk-meta .bad{font-style:normal;color:var(--chili);font-weight:700}
.mk-st{display:grid;gap:3px;justify-items:end;flex:none}.mk-st .pill{font-size:10.5px;padding:1px 7px}
.mk-search{display:flex;align-items:center;gap:6px;margin:8px 0 6px;padding:3px 4px 3px 12px;border-radius:14px;background:var(--surface);box-shadow:var(--shadow);border:1.5px solid transparent}.mk-search:focus-within{border-color:#16a34a}
.mk-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:16px;padding:9px 0;color:var(--ink)}.mk-search .scanbtn{flex:none}
.mk-find{display:grid;gap:5px;margin-bottom:6px}.mk-fr{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}.mk-fr b{font-size:14px;flex:none;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mk-fr span{flex:1;min-width:0;font-size:12px;color:var(--muted)}.mk-fr a{text-decoration:none;font-size:18px}
.mk-route{display:block;text-align:center;text-decoration:none;background:#16a34a;color:#fff}
.mk-bar1{display:flex;align-items:center;gap:8px;margin:0 0 8px}
.mk-back{width:38px;height:38px;flex:none;border:0;border-radius:12px;background:var(--surface);box-shadow:var(--shadow);font-size:26px;line-height:1;font-weight:700;color:var(--ink)}
.mk-id{flex:1;min-width:0;display:grid}.mk-id b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mk-id span{font-size:11.5px;color:var(--muted)}
.mk-seg{display:flex;flex:none;background:var(--line);border-radius:12px;padding:3px}.mk-seg button{border:0;background:transparent;border-radius:9px;padding:6px 9px;font-weight:800;font-size:13px;color:var(--muted)}.mk-seg button[aria-selected="true"]{background:var(--surface);color:#0f5132;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.mk-ai{padding:10px;border-radius:16px;background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:1.5px solid #c7d2fe;margin-bottom:6px;display:grid;gap:8px}
.mk-steps{display:flex;align-items:stretch;gap:4px;font-size:12px}.mk-steps>*{flex:1;border-radius:10px;background:#fff;padding:6px;display:grid;place-items:center;text-align:center;line-height:1.2;font-weight:700;color:#3730a3;border:0}.mk-steps>span{flex:none;background:none;padding:0;color:#818cf8}.mk-steps b{font-size:14px}
.mk-steps button{background:#4f46e5;color:#fff;box-shadow:0 4px 10px -4px #4f46e5}
.mk-ai textarea{width:100%;border:1.5px solid #c7d2fe;border-radius:12px;padding:8px 10px;font:13px/1.3 ui-monospace,monospace;background:#fff;color:#111;resize:vertical}
.mk-ai2{display:grid;grid-template-columns:1fr 1.4fr;gap:6px}.mk-ai2 .big{padding:10px;font-size:15px}.mk-ai .note{margin:0;font-size:12px}
.mk-aisum{display:grid;gap:2px;padding:8px 11px;border-radius:14px;background:#eef2ff;border-left:4px solid #4f46e5;margin-bottom:6px}.mk-aisum b{font-size:14.5px}.mk-aisum span{font-size:12px;color:var(--muted)}.mk-aisum em{font-style:normal;font-size:12.5px;color:#b42318;font-weight:700}.mk-aisum i{font-style:normal;font-size:12.5px;color:#0f6b36;font-weight:700}
.mk-hits{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:6px}.mk-hits::-webkit-scrollbar{display:none}
.mk-hits button{flex:none;display:flex;align-items:center;gap:6px;max-width:190px;padding:4px 10px 4px 4px;border-radius:12px;border:0;background:var(--surface);box-shadow:var(--shadow);font-size:13px;font-weight:700;text-align:left}.mk-hits .tile{width:30px;border-radius:8px;flex:none}.mk-hits .tile .em{font-size:16px;transform:none}.mk-hits span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mk-hits .nw{background:#e9f9ef;color:#0f5132;padding-left:10px}
.mk-lines{display:grid;gap:7px}
.mk-ln{position:relative;display:flex;gap:8px;padding:7px;border-radius:16px;background:var(--surface);box-shadow:var(--shadow);border:1.5px solid transparent;transition:box-shadow .2s,border-color .2s,transform .2s}
.mk-ln.low{border-color:#fca5a5}.mk-ln.fl{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.25),var(--shadow);animation:mkpop .45s cubic-bezier(.3,1.6,.5,1)}
@keyframes mkpop{0%{transform:scale(.97)}60%{transform:scale(1.015)}100%{transform:none}}
.mk-th{position:relative;width:54px;height:54px;flex:none;border:0;border-radius:12px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);display:grid;place-items:center;font-size:24px;overflow:visible;padding:0}
.mk-th img{width:100%;height:100%;object-fit:cover;border-radius:12px}
.mk-th em{position:absolute;right:-5px;bottom:-5px;width:24px;height:24px;border-radius:99px;display:grid;place-items:center;font-style:normal;font-size:12px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);filter:grayscale(1);opacity:.75}.mk-th em.on{filter:none;opacity:1;background:#dcfce7}
.mk-mid{flex:1;min-width:0;display:grid;gap:4px}
.mk-nm{width:100%;border:0;outline:0;background:transparent;font-family:var(--f-display);font-weight:800;font-size:15.5px;color:var(--ink);padding:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}input.mk-nm:focus{background:var(--bg);border-radius:6px}
.mk-tags{display:flex;flex-wrap:wrap;gap:4px}.mk-tags .t{font-style:normal;font-size:11px;font-weight:700;padding:1px 6px;border-radius:99px;background:var(--bg);color:var(--muted)}.mk-tags .t.ok{background:#dcfce7;color:#166534}.mk-tags .t.bad{background:#fee2e2;color:#b42318}.mk-tags .t.new{background:#dbeafe;color:#1e40af}.mk-tags .t.aiph{border:0;font-size:12.5px;padding:4px 10px;background:linear-gradient(120deg,#7c3aed,#db2777);color:#fff;box-shadow:0 2px 6px rgba(124,58,237,.4)}
.mk-nums{display:flex;gap:5px;align-items:center}.mk-cr{display:flex;align-items:center;gap:4px;font-size:12px;margin-top:4px}.mk-cr input{width:56px;font-size:14px;padding:3px 5px;border:1px solid #cbd5e1;border-radius:8px}.t.crt{border:1px dashed #16a34a;background:#f0fdf4;color:#166534;font:inherit;font-size:11px;cursor:pointer}
.mk-q{display:flex;align-items:center;height:34px;border-radius:10px;background:#16a34a;overflow:hidden;flex:none}.mk-q button{width:30px;height:34px;border:0;background:transparent;color:#fff;font-size:19px;font-weight:800}.mk-q input{width:38px;height:28px;border:0;border-radius:7px;text-align:center;font-weight:900;font-size:15px;background:rgba(255,255,255,.95);color:#111;outline:0}
.mk-in{display:flex;align-items:center;gap:3px;height:34px;min-width:0;flex:1;border-radius:10px;background:var(--bg);border:1.5px solid var(--line);padding:0 7px}.mk-in:focus-within{border-color:#16a34a}.mk-in span{font-size:11px;font-weight:800;color:var(--muted);flex:none}
.mk-in input{flex:1;min-width:0;width:100%;border:0;outline:0;background:transparent;font-weight:800;font-size:15px;color:var(--ink);padding:0}.mk-in.mrp{flex:1}.mk-in.w{height:42px;flex:1}.mk-in.w input{font-weight:600}
.mk-am{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;flex:none}.mk-am b{font-size:14px}.mk-x{border:0;background:transparent;color:var(--muted);font-size:15px;padding:2px 4px}
.mk-ln.ro .mk-nm{white-space:normal}
.mk-empty{display:grid;gap:4px;text-align:center;padding:22px 14px;border-radius:16px;border:2px dashed #86efac;background:#f0fdf4;color:#166534}.mk-empty b{font-size:16px}.mk-empty span{font-size:13px}
.mk-cart{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:15;display:flex;align-items:center;gap:10px;padding:9px 9px 9px 14px;border-radius:18px;background:linear-gradient(120deg,#0f5132,#16a34a);color:#fff;box-shadow:0 10px 28px -8px rgba(15,81,50,.75);max-width:640px;margin:0 auto}
.mk-cart>div{flex:1;min-width:0;display:grid}.mk-cart b{font-size:17px}.mk-cart span{font-size:12px;opacity:.92}.mk-cart em{font-style:normal;font-weight:900}.mk-cart em.bad{color:#fecaca}
.mk-go{border:0;border-radius:13px;background:#fff;color:#0f5132;font-weight:900;font-size:17px;padding:11px 18px}.mk-go:disabled{opacity:.5}
.mk-fin{display:grid;gap:10px}
.mk-ph3{display:grid;grid-template-columns:1fr 1fr .8fr;gap:7px}
.mk-ph3 button{position:relative;height:86px;border:2px dashed var(--line);border-radius:14px;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:26px;overflow:hidden;padding:0}
.mk-ph3 button span{position:relative;z-index:1;font-size:11.5px;font-weight:800;color:var(--muted);max-width:96%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mk-ph3 button.has{border-style:solid;border-color:#16a34a;background:#f0fdf4}
.mk-ph3 button img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9}.mk-ph3 button.has img+span{background:rgba(0,0,0,.6);color:#fff;border-radius:7px;padding:0 6px;margin-top:auto;margin-bottom:4px}
.mk-pays{display:grid;grid-template-columns:1fr 1fr;gap:6px}.mk-pays button{border:1.5px solid var(--line);background:var(--bg);border-radius:12px;padding:9px 6px;font-weight:800;font-size:13.5px;color:var(--ink)}.mk-pays button[aria-pressed="true"]{border-color:#16a34a;background:#dcfce7;color:#14532d}
.mk-two{display:flex;gap:6px;align-items:stretch}.mk-two .big{width:auto;flex:none;padding:0 14px;font-size:14px;margin:0}
.mk-send{background:linear-gradient(120deg,#0f5132,#16a34a);color:#fff;font-weight:900}
.mk-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}.mk-meta>*{font-size:12.5px;padding:3px 9px;border-radius:99px;background:var(--surface);box-shadow:var(--shadow);text-decoration:none;color:var(--ink)}.mk-meta .ok{color:#166534;background:#dcfce7}
.mk-pay{display:grid;gap:8px;padding:12px;border-radius:18px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1.5px solid #fdba74;margin-bottom:10px}.mk-pay h3{margin:0}.mk-pay a.big{text-align:center;text-decoration:none;background:#ea580c;color:#fff}
.mk-rcvh{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;font-size:22px;padding:9px 12px;border-radius:14px;background:#eff6ff;border-left:4px solid #2563eb;margin:4px 0 8px}.mk-rcvh b{font-size:15px;grid-column:2}.mk-rcvh span{font-size:12px;color:var(--muted);grid-column:2}.mk-rcvh{grid-template-rows:auto auto}.mk-rcvh::first-letter{grid-row:span 2}
.mk-proof{display:block;width:100%;margin-top:10px;border-radius:14px;box-shadow:var(--shadow)}
.mk-match .mk-mlist{display:grid;gap:5px;max-height:46vh;overflow:auto}.mk-mlist button{display:grid;text-align:left;border:1.5px solid var(--line);background:var(--bg);border-radius:12px;padding:8px 10px}.mk-mlist b{font-size:14.5px}.mk-mlist span{font-size:12px;color:var(--muted)}
.tile.mini .tbr{display:none!important}`;document.head.appendChild(st);
};
})();
