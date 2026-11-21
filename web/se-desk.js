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
const css=document.createElement("style");css.textContent=`.sdk-r{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 0;border-top:1px dashed var(--line,#e5e7eb)}.sdk-r>b{min-width:58px}.sdk-r>span{flex:1;min-width:120px;font-size:13px;color:var(--muted)}`;document.head.appendChild(css);
})();
