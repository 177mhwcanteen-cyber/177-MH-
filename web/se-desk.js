/* 💻 लैपटॉप / कंप्यूटर (21-11-2026, विक्रम जी: "पूरा ऐप लैपटॉप पर, बिना लैग, बिल और बारकोड सीधे छपें")
   यही ऐप Chrome/Edge में "ऐप की तरह इंस्टॉल" (PWA) होता है — अपनी खिड़की, टास्कबार आइकन, अपने-आप अपडेट।
   प्रिंटर: ब्लूटूथ से pair किया प्रिंटर Windows में COM पोर्ट बनता है (USB-Serial वाले भी) → Web Serial से सीधे ESC/POS / TSPL
   (कोई प्रिंट-डायलॉग नहीं, फोन वाली ही छपाई)। न हो तो पुराना तरीका (ब्राउज़र का प्रिंट) चलता रहता है।
   window.SDK — has(role), pick(role,opt), send(role,b64), forget(role), cardHTML(); role = "bill" | "label"। जाँच tests/desk.py */
(function(){
"use strict";
const LSd={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
const SDK=window.SDK={ok:!(window.SE&&SE.isNative)&&("serial" in navigator),port:{},w:{}};
const key=r=>"se_ser_"+r;
SDK.info=r=>{try{return JSON.parse(LSd.get(key(r))||"null")}catch(e){return null}};
SDK.has=r=>SDK.ok&&!!SDK.info(r);
async function findPort(r){if(SDK.port[r])return SDK.port[r];const inf=SDK.info(r);if(!inf)throw {msg:"लैपटॉप पर प्रिंटर नहीं चुना — 🖨️ प्रिंटर में \"लैपटॉप: प्रिंटर चुनें\""};
  const L=await navigator.serial.getPorts();let p=null;
  if(inf.v!=null)p=L.find(x=>{const i=x.getInfo();return i.usbVendorId===inf.v&&i.usbProductId===inf.p})||null;
  if(!p&&inf.bt)p=L.filter(x=>x.getInfo().bluetoothServiceClassId)[inf.k||0]||null;
  if(!p)p=L[inf.i]||null;
  if(!p)throw {msg:"प्रिंटर का पोर्ट नहीं मिला — प्रिंटर चालू करें, या 🖨️ में दोबारा चुनें"};
  SDK.port[r]=p;return p}
async function openPort(r){const p=await findPort(r);if(!p.writable){const inf=SDK.info(r)||{};await p.open({baudRate:+inf.baud||9600,bufferSize:65536})}return p}
const sleep=ms=>new Promise(f=>setTimeout(f,ms));
/* data = base64 (ESC/POS या TSPL बाइट) — 1 KB के टुकड़ों में, बीच में थोड़ा रुककर (ब्लूटूथ का बफ़र न भरे) */
SDK.send=async function(r,b64){const raw=atob(b64),u=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);
  for(let t=0;t<2;t++){let w=null;try{const p=await openPort(r);w=p.writable.getWriter();
      for(let i=0;i<u.length;i+=1024){await w.write(u.subarray(i,i+1024));if(u.length>4096)await sleep(15)}
      w.releaseLock();return true}
    catch(e){try{w&&w.releaseLock()}catch(x){}try{const p=SDK.port[r];if(p)await p.close()}catch(x){}SDK.port[r]=null;if(t)throw e.msg?e:{msg:"प्रिंटर तक नहीं पहुँचा: "+(e.message||e)}}}};
/* चुनना: Chrome की सूची से पोर्ट (ब्लूटूथ प्रिंटर = "Standard Serial over Bluetooth link (COMx)") */
SDK.pick=async function(r,o){o=o||{};if(!SDK.ok)throw {msg:"यह ब्राउज़र प्रिंटर से सीधे नहीं जुड़ता — Chrome या Edge खोलें"};
  const p=await navigator.serial.requestPort({});const L=await navigator.serial.getPorts(),i=p.getInfo();
  const bt=!!i.bluetoothServiceClassId,inf={i:L.indexOf(p),v:i.usbVendorId,p:i.usbProductId,bt,k:bt?L.filter(x=>x.getInfo().bluetoothServiceClassId).indexOf(p):0,baud:o.baud||9600};
  LSd.set(key(r),JSON.stringify(inf));SDK.port[r]=p;
  const nm=o.name||(bt?"ब्लूटूथ प्रिंटर (COM)":i.usbVendorId!=null?"USB प्रिंटर "+i.usbVendorId.toString(16)+":"+(i.usbProductId||0).toString(16):"COM प्रिंटर");
  if(r==="bill"){LSd.set("se_prn","web-serial");LSd.set("se_prn_n",nm);LSd.set("se_prn_w",String(o.w||"58"));LSd.set("se_prn_t",o.t||(String(o.w)==="100"?"tspl":"escpos"))}
  else{LSd.set("se_lbl","web-serial");LSd.set("se_lbl_n",nm);LSd.set("se_lbl_t",o.t||"tspl")}
  return nm};
SDK.forget=async function(r){try{const p=SDK.port[r];if(p&&p.readable==null&&p.writable)await p.close()}catch(e){}SDK.port[r]=null;LSd.set(key(r),null);
  if(r==="bill"&&LSd.get("se_prn")==="web-serial"){LSd.set("se_prn",null);LSd.set("se_prn_n",null)}
  if(r==="label"&&LSd.get("se_lbl")==="web-serial"){LSd.set("se_lbl",null);LSd.set("se_lbl_n",null)}};
/* 🖨️ कार्ड (प्रिंटर कार्ड में, सिर्फ़ लैपटॉप/कंप्यूटर पर) */
SDK.cardHTML=function(){if(window.SE&&SE.isNative)return "";
  const row=(r,t)=>{const inf=SDK.info(r),nm=r==="bill"?LSd.get("se_prn_n"):LSd.get("se_lbl_n");
    return `<div class="sdk-r"><b>${t}</b><span>${inf?"✓ "+esc(nm||"चुना"):"नहीं चुना"}</span>
      ${r==="bill"?`<button type="button" class="chip" data-sdkpick="bill" data-w="58">58mm</button><button type="button" class="chip" data-sdkpick="bill" data-w="80">80mm</button><button type="button" class="chip" data-sdkpick="bill" data-w="100">4 इंच</button>`
        :`<button type="button" class="chip" data-sdkpick="label" data-t="tspl">लेबल प्रिंटर (TSPL)</button><button type="button" class="chip" data-sdkpick="label" data-t="escpos">रसीद प्रिंटर पर</button>`}
      ${inf?`<button type="button" class="chip" data-sdktest="${r}">🧪 जाँच</button><button type="button" class="chip" data-sdkx="${r}">✕</button>`:""}</div>`};
  return `<div class="card2 sdk-c"><h3>💻 लैपटॉप / कंप्यूटर से सीधी छपाई</h3>
    ${SDK.ok?`<p class="note" style="margin:0 0 6px">① Windows की Bluetooth सेटिंग में प्रिंटर pair करें (PIN अक्सर 0000 या 1234) ② यहाँ साइज़ दबाएँ → सूची में "Serial over Bluetooth (COM…)" चुनें → Connect ③ 🧪 जाँच। USB वाला प्रिंटर भी (अगर COM पोर्ट बनाता हो)।</p>${row("bill","🧾 बिल")}${row("label","🏷️ लेबल")}
      <p class="note" style="margin:6px 0 0">न जुड़े तो भी चलेगा: बिल/लेबल Windows के प्रिंट से छपेंगे (प्रिंटर का ड्राइवर डालकर)।</p>`
      :`<p class="note" style="margin:0">यह ब्राउज़र प्रिंटर से सीधे नहीं जुड़ता। <b>Google Chrome</b> या <b>Microsoft Edge</b> में यही पता खोलें। अभी बिल/लेबल ब्राउज़र के प्रिंट से छपेंगे।</p>`}
    ${SDK.installHTML()}</div>`};
/* 📥 ऐप की तरह इंस्टॉल (PWA) */
let deferred=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;try{document.querySelectorAll("[data-sdkinst]").forEach(b=>b.hidden=false)}catch(x){}});
SDK.standalone=()=>{try{return matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: window-controls-overlay)").matches}catch(e){return false}};
SDK.installHTML=()=>SDK.standalone()?`<p class="note" style="margin:6px 0 0">✅ ऐप की तरह खुला है (अपनी खिड़की)।</p>`
  :`<button type="button" class="big ghost" data-sdkinst ${deferred?"":"hidden"} style="margin-top:6px">📥 इस कंप्यूटर पर ऐप इंस्टॉल करें</button><p class="note" style="margin:6px 0 0">इंस्टॉल का बटन न दिखे: Chrome/Edge में ऊपर पते के दाएँ ⊕ / "ऐप इंस्टॉल करें" दबाएँ।</p>`;
document.addEventListener("click",async e=>{const g=s=>e.target.closest(s);
  const pk=g("[data-sdkpick]");if(pk){try{const nm=await SDK.pick(pk.dataset.sdkpick,{w:pk.dataset.w,t:pk.dataset.t});toast("🖨️ जुड़ गया: "+nm);SDK.refresh()}catch(x){if(x&&x.name==="NotFoundError")return;toast(x.msg||("नहीं जुड़ा: "+(x.message||x)))}return}
  const ts=g("[data-sdktest]");if(ts){try{await SDK.test(ts.dataset.sdktest);toast("🧪 जाँच भेजी")}catch(x){toast(x.msg||String(x.message||x))}return}
  const xx=g("[data-sdkx]");if(xx){await SDK.forget(xx.dataset.sdkx);toast("हटाया");SDK.refresh();return}
  if(g("[data-sdkinst]")&&deferred){deferred.prompt();try{await deferred.userChoice}catch(x){}deferred=null;SDK.refresh()}});
SDK.refresh=()=>{try{document.querySelectorAll(".sdk-c").forEach(c=>{c.outerHTML=SDK.cardHTML()})}catch(e){}};
/* 🧪 जाँच: छोटी पर्ची / लेबल */
SDK.test=async function(r){const cv=document.createElement("canvas"),W=r==="bill"?SE.printer.width:400,H=r==="bill"?180:240;cv.width=W;cv.height=H;const x=cv.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#000";x.font="800 30px sans-serif";x.fillText("177 वेट कैंटीन",14,50);x.font="500 22px sans-serif";x.fillText("💻 लैपटॉप से जाँच ✓",14,95);x.fillText(new Date().toLocaleString("hi-IN"),14,135);
  if(r==="bill")return SDK.send("bill",SE.printer.type==="tspl"?SE.tspl(cv,{gap:0}):SE.escpos(cv));
  const t=LSd.get("se_lbl_t")||"tspl";return SDK.send("label",t==="escpos"?SE.escpos(cv):SE.tspl(cv,{wmm:50,hmm:30}))};
/* ⌨️ लैपटॉप पर कीबोर्ड: F2 = खोज, (F9 बिल / Esc पहले से index.html में) */
document.addEventListener("keydown",e=>{if(e.key==="F2"){const q=document.getElementById("q");if(q){e.preventDefault();q.focus();q.select&&q.select()}}});
/* 🖥️ ग्राहक स्क्रीन (display.html) — BroadcastChannel; चालू बिल बदलते ही भेजो, बिल सेव होते ही "धन्यवाद" */
let bc=null;try{if(!(window.SE&&SE.isNative))bc=new BroadcastChannel("se-cust")}catch(e){}
SDK.custState=function(){try{if(typeof S==="undefined"||S.tab!=="bill")return {state:"idle"};const L=S.cart||[];if(!L.length)return {state:"idle"};
  const tot=Math.round(cartTotal()*100)/100,inst=S.mode==="inst";
  return {state:"cart",lines:L.map((l,i)=>({k:l.id+":"+i,n:l.name,/* बिल वाला नाम — तम्बाकू पर "Misc Item" ही */q:typeof fq==="function"?fq(l.qty,l.unit):l.qty,a:l.amt})),total:inst?tot:Math.round(tot),
    saved:inst?0:(typeof savedOf==="function"?savedOf({mode:S.mode,lines:L}):0),
    upi:!inst&&tot>0&&typeof upiId==="function"&&upiId()?`upi://pay?pa=${encodeURIComponent(upiId())}&pn=${encodeURIComponent(UPI_FIXED.payee)}&am=${Math.round(tot).toFixed(2)}&cu=INR&tn=${encodeURIComponent("177 Wet Canteen")}`:"",payee:typeof UPI_FIXED!=="undefined"?UPI_FIXED.payee:""}}catch(e){return {state:"idle"}}};
SDK.custPost=function(d){if(!bc)return;try{bc.postMessage(d);localStorage.setItem("se_cust_last",JSON.stringify({t:Date.now(),d}))}catch(e){}};
let lastJ="";SDK.custPush=function(){const d=SDK.custState(),j=JSON.stringify(d);if(j===lastJ)return;lastJ=j;SDK.custPost(d)};
if(bc)bc.onmessage=e=>{if(e.data&&e.data.hello){lastJ="";SDK.custPush()}};
SDK.custOpen=function(){const w=window.open("display.html","se_cust","popup,width=1000,height=700");if(!w){toast("पॉप-अप रुका — पते की पट्टी में 'पॉप-अप चालू करें' दबाएँ");return}setTimeout(()=>{lastJ="";SDK.custPush()},800);
  toast("🖥️ ग्राहक स्क्रीन खुली — उसे दूसरी स्क्रीन पर खींचें, F11 दबाएँ")};
let paidNo="";SDK.custPaid=function(b){try{if(!b||!b.no||paidNo===b.no)return;paidNo=b.no;lastJ="";const tot=+b.total||+b.net||0;
  SDK.custPost({state:"paid",no:b.no,total:tot,saved:typeof savedOf==="function"?savedOf(b):0})}catch(e){}};
/* index.html के फ़ंक्शन लपेटो (वहीं के global function, बदलना ज़रूरी नहीं) */
function wrap(n,after){const f=window[n];if(typeof f!=="function"||f.__sdk)return;const g=function(){const r=f.apply(this,arguments);try{after.apply(this,arguments)}catch(e){}return r};g.__sdk=1;window[n]=g}
function sideBtn(){if(!bc)return;const h=document.querySelector("#side .sdh");if(h&&!h.querySelector("[data-sdkcust]")){const b=document.createElement("button");b.type="button";b.className="sdk-cb";b.dataset.sdkcust="1";b.title="ग्राहक को सामान और कुल दिखाएँ (F10)";b.textContent="🖥️ ग्राहक स्क्रीन";h.appendChild(b)}
  const l=document.querySelector("#side .sdl");if(l&&!document.querySelector("#side .sdk-keys")){const k=document.createElement("div");k.className="sdk-keys";k.innerHTML="<kbd>F2</kbd> खोज · <kbd>+</kbd>/<kbd>−</kbd> मात्रा · <kbd>Del</kbd> हटाएँ · <kbd>F9</kbd> बिल · <kbd>F10</kbd> ग्राहक स्क्रीन · <kbd>F1</kbd> मदद";l.after(k)}}
setTimeout(()=>{wrap("renderSide",()=>{SDK.custPush();sideBtn()});wrap("showReceipt",(b,fresh)=>{if(fresh)SDK.custPaid(b)});wrap("quickDone",b=>SDK.custPaid(b));wrap("showTab",()=>SDK.custPush());try{sideBtn()}catch(e){}},0);
document.addEventListener("click",e=>{if(e.target.closest("[data-sdkcust]"))SDK.custOpen()});
/* ⌨️ पूरे कीबोर्ड से बिल (लैपटॉप) */
SDK.help=function(){const o=document.getElementById("sdkHelp");if(o){o.remove();return}const d=document.createElement("div");d.id="sdkHelp";d.setAttribute("role","dialog");d.setAttribute("aria-label","कीबोर्ड की कुंजियाँ");
  d.innerHTML=`<div class="sdk-hb"><h3>⌨️ लैपटॉप पर बिलिंग — कुंजियाँ</h3><table>${[["F2 या /","सामान खोजें (नाम / 4 अंक कोड / बारकोड)"],["Enter","खोज में एक ही सामान मिले तो बिल में जोड़ें · \"5*कोड\" = 5 नग"],["+ / −","आख़िरी सामान की मात्रा एक बढ़ाएँ / घटाएँ"],["Delete","आख़िरी सामान हटाएँ"],["F4","ग्राहक का मोबाइल नंबर"],["F9 या Ctrl+Enter","बिल बनाएँ → फिर से दबाएँ = सेव"],["F10","ग्राहक स्क्रीन (दूसरी स्क्रीन पर)"],["Esc","खिड़की बंद"],["F1","यह मदद"]].map(r=>`<tr><td><kbd>${r[0]}</kbd></td><td>${r[1]}</td></tr>`).join("")}</table><button type="button" class="big" onclick="this.closest('#sdkHelp').remove()">ठीक</button></div>`;
  document.body.appendChild(d);d.addEventListener("click",e=>{if(e.target===d)d.remove()})};
document.addEventListener("keydown",e=>{if(typeof S==="undefined")return;const t=e.target,inInput=t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.tagName==="SELECT"),sheetOpen=!!(document.getElementById("sheet")||{}).innerHTML?.trim();
  if(e.key==="F1"){e.preventDefault();SDK.help();return}
  if(e.key==="Escape"&&document.getElementById("sdkHelp")){document.getElementById("sdkHelp").remove();return}
  if(S.tab!=="bill"||sheetOpen)return;
  if(e.key==="F10"){e.preventDefault();SDK.custOpen();return}
  if(e.key==="F4"){const c=document.getElementById("custPh");if(c){e.preventDefault();c.focus()}return}
  const qEmpty=t&&t.id==="q"&&!String(t.value||"").trim();if(inInput&&!qEmpty)return;
  const L=S.cart||[];if(!L.length)return;const i=L.length-1,l=L[i];
  if(e.key==="+"||e.key==="="){const b=document.querySelector(`#side [data-sinc="${CSS.escape(l.id)}"]`);if(b){e.preventDefault();b.click()}return}
  if(e.key==="-"){const b=document.querySelector(`#side [data-sdec="${CSS.escape(l.id)}"]`);if(b){e.preventDefault();b.click()}return}
  if(e.key==="Delete"){const b=document.querySelector(`#side [data-sdel="${i}"]`);if(b){e.preventDefault();b.click()}}});
/* 🔄 लैपटॉप पर नया वर्ज़न (sw.js बदला): खाली बिल हो तो चुपचाप ताज़ा, वरना बताओ */
try{if(!(window.SE&&SE.isNative)&&navigator.serviceWorker){let had=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!had){had=true;return}
  const busy=typeof S!=="undefined"&&((S.cart||[]).length||(document.getElementById("sheet")||{}).innerHTML?.trim());if(!busy)location.reload();else toast("🔄 ऐप का नया वर्ज़न आया — यह बिल पूरा होने के बाद F5 दबाएँ")})}}catch(e){}
const css=document.createElement("style");css.textContent=`.sdk-r{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 0;border-top:1px dashed var(--line,#e5e7eb)}.sdk-r>b{min-width:58px}.sdk-r>span{flex:1;min-width:120px;font-size:13px;color:var(--muted)}
.sdk-cb{border:1px solid var(--line,#e2e8f0);background:var(--surface,#fff);border-radius:999px;padding:4px 10px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.sdk-keys{padding:6px 12px;font-size:11.5px;color:var(--muted,#64748b);border-top:1px dashed var(--line,#e2e8f0);line-height:1.8}
kbd{display:inline-block;min-width:18px;padding:0 5px;border:1px solid #cbd5e1;border-bottom-width:2px;border-radius:5px;background:#f8fafc;font:700 11px/1.5 monospace;text-align:center;color:#0f172a}
#sdkHelp{position:fixed;inset:0;z-index:99;background:rgba(15,23,42,.45);display:grid;place-items:center;padding:16px}
.sdk-hb{background:var(--surface,#fff);border-radius:18px;padding:18px 20px;max-width:560px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25)}.sdk-hb h3{margin:0 0 10px}
.sdk-hb table{width:100%;border-collapse:collapse;margin-bottom:12px}.sdk-hb td{padding:7px 6px;border-bottom:1px dashed var(--line,#e2e8f0);font-size:15px}.sdk-hb td:first-child{white-space:nowrap;width:1%}`;document.head.appendChild(css);
})();
