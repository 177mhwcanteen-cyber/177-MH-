/* 177 MH कैंटीन — 📸 फोटो से माल (AI)
   हर सामान की 3 फोटो (आगे / MRP-एक्सपायरी / बारकोड) + मात्रा + भाव → AI के लिए PDF →
   Claude/Gemini का जवाब (JSON) चिपकाएँ → नया सामान बने / स्टॉक बढ़े / खेप-एक्सपायरी / खरीद का रिकॉर्ड।
   बड़ी फोटो सिर्फ़ इसी फोन (IndexedDB) में; ऐप में सिर्फ़ ~6-10 KB की छोटी फोटो जाती है। */
(function(){
"use strict";
const SI=window.SI={};
const num=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:0};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const SRC={opening:"🏁 ओपनिंग स्टॉक",mh:"🏥 177 MH से",shop:"🏪 दुकान से"};
const PAYS={vikram:"विक्रम जी ने दिया",galla:"गल्ले से नकद",upi:"UPI से",udhar:"बाकी (उधार)"};
const KINDS=[["f","आगे की फोटो","📦",true],["p","MRP / एक्सपायरी","🏷️",false],["b","बारकोड","📟",false]];
const MAXN=30;
let B=null,CUR=null,VIEW="form",PV=null,PASTE="";

/* ---------- फोन में फोटो (IndexedDB) ---------- */
const IDB={db:null,
  open(){return this.db||(this.db=new Promise((res,rej)=>{const r=indexedDB.open("bh-intake",1);r.onupgradeneeded=()=>r.result.createObjectStore("p",{keyPath:"k"});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
  async tx(mode,fn){const d=await this.open();return new Promise((res,rej)=>{const t=d.transaction("p",mode);const st=t.objectStore("p");const out=fn(st);t.oncomplete=()=>res(out&&out.result!==undefined?out.result:undefined);t.onerror=()=>rej(t.error)})},
  put(k,blob){return this.tx("readwrite",s=>s.put({k,blob}))},
  async get(k){const d=await this.open();return new Promise(res=>{const r=d.transaction("p").objectStore("p").get(k);r.onsuccess=()=>res(r.result?r.result.blob:null);r.onerror=()=>res(null)})},
  async delPrefix(pre){const d=await this.open();return new Promise(res=>{const t=d.transaction("p","readwrite"),st=t.objectStore("p");const r=st.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(String(c.key).startsWith(pre))c.delete();c.continue()};t.oncomplete=()=>res();t.onerror=()=>res()})}};
const pk=(n,k)=>B.id+"_"+n+"_"+k;

function shrink(file,max,q){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(new Error("photo")),"image/jpeg",q)};
  img.onerror=rej;img.src=u})}
const toURL=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob)});
async function thumbOf(blob,px){const b=await shrink(blob,px||120,.6);return toURL(b)}
function pick(cb){const fi=document.createElement("input");fi.type="file";fi.accept="image/*";fi.capture="environment";fi.onchange=()=>{const f=fi.files[0];if(f)cb(f)};fi.click()}

/* ---------- स्थिति ---------- */
function load(){try{B=JSON.parse(localStorage.getItem("bh_intake")||"null")}catch(e){B=null}if(B&&!B.entries)B.entries=[];CUR=B?(B.cur||blank()):null}
function save(){try{if(B){B.cur=CUR;localStorage.setItem("bh_intake",JSON.stringify(B))}else localStorage.removeItem("bh_intake")}catch(e){toast("फोन में जगह कम है")}}
function blank(){return {n:(B?B.entries.reduce((a,e)=>Math.max(a,e.n),0):0)+1,qty:"",cost:"",sale:"",bar:"",match:"",has:{},th:{}}}
load();
SI.active=()=>!!(B&&B.open);
SI.open=function(){if(!B)B={open:true,id:"",src:"",entries:[]};B.open=true;if(!CUR)CUR=blank();VIEW="form";save();if(typeof camOff==="function")camOff(false);SI.render()};
function close(){B.open=false;save();if(window.SF)SF.renderKharid(1)}

/* ---------- AI निर्देश ---------- */
function prompt(){
  const src=B.src==="mh"?"177 MH transfer":B.src==="shop"?"Bought from: "+(B.shop||"-"):"Opening stock";
  return `177 MH CANTEEN (Barmer, India) - PRODUCT ENTRY · batch ${B.id} · ${src}
Each product #N has up to 3 photos: FRONT, MRP (price/expiry label), BARCODE. ZIP: NN-front.jpg / NN-mrp.jpg / NN-barcode.jpg + items.csv (n, qty, cost, sale, barcode). PDF: one page per product.

WORK FAST: go through ALL products without stopping. Read only what is printed. No web search now. Unsure = null. Give the JSON at once so billing can start.
Later, only if I write "STEP 2": search the web for exact name/brand/size/Hindi and the ORIGINAL pack photo; reply {"app":"mh177","mode":"fix","items":[{"barcode":"…","name":"…","hi":"…","brand":"…","size":"…"}]} + ONE ZIP (or show photos in chat) named <barcode>.jpg.

Reply with ONE json code block:
{"app":"mh177","v":1,"batch":"${B.id}","items":[
 {"n":1,"name":"PARLE-G 70G","hi":"पारले-जी 70 ग्राम","brand":"PARLE","size":"70g","mrp":10,"sale":10,"cost":8,"qty":12,"exp":"2027-03-31","mfg":"2026-09-30","batchNo":"B123","barcode":"8901719101038","cat":"kirana","sub":"sweet","emoji":"🍪","imgKind":"ref","img":"<photo prompt>","note":""}
]}
Rules: n = #N, same order · name = CAPITAL English, max 22 letters, Brand + product + size · hi = simple Hindi (Devanagari) · mrp = printed MRP ₹ · sale = given SALE else mrp · cost, qty = copy exactly, never invent · exp = YYYY-MM-DD (from "best before N months" + mfg; month only = last day) · barcode = given BARCODE else digits under barcode · cat: kirana (packed), fast (cooked food), sabzi (veg/fruit) · sub (kirana): namkeen, dryfruit, achar, rashan, drinks, sweet, clean · doubt → null + short Hindi "note".

"img" = ONE ready-to-paste image prompt (English, 2-4 lines) made for THIS product, so the shop can get a perfect photo later in Gemini:
• imgKind "ref" (any branded pack): "Use my attached photo of <BRAND PRODUCT SIZE, pack colours, what is printed> as the only reference. Make a clean e-commerce photo of exactly this pack: keep the real logo, colours and printed text, front view, centred, pure white background, soft studio light, light shadow, square 800x800, no hands, no extra text."
• imgKind "make" (no brand / loose / fresh / cooked in shop / plain item): describe the real thing vividly so it can be created, e.g. "Fresh red tomatoes, 3 whole and one cut in half showing juicy inside, water droplets, on pure white background, soft daylight, realistic e-commerce photo, square 800x800, no text." — sweets/snacks: "on a white plate, 45° view, fresh and tasty"; loose grain/spice: "small heap in a white bowl plus a few grains in front".
After the json write 2-3 short Hindi lines only about doubtful items.`}
SI.prompt=()=>B?prompt():"";
/* 🎨 हर सामान का अपना फोटो-प्रॉम्प्ट (AI ने STEP 1 में लिखा) — items/<id>.aiPrompt, imgKind "ref" (अपनी फोटो से साफ़) / "make" (बनाओ) */
const imgP=a=>a&&a.img?{aiPrompt:String(a.img).trim().slice(0,700),imgKind:a.imgKind==="make"?"make":"ref"}:{};

/* ---------- स्क्रीन ---------- */
SI.render=function(el){
  el=el||$("#p-kharid");if(!el||!B)return;
  if(!B.src)return renderStart(el);
  if(VIEW==="paste")return renderPaste(el);
  const E=B.entries,n=E.length;
  el.innerHTML=`<div class="sihead"><div><h2 class="sec" style="margin:0">📸 फोटो से माल</h2><span class="note">${SRC[B.src]}${B.src==="shop"&&B.shop?" · "+esc(B.shop):""} · ${esc(B.id)}</span></div><button class="big ghost" data-siclose style="width:auto;padding:8px 14px">✕ बंद</button></div>
  ${n<MAXN?formHTML():`<div class="card2"><b>एक PDF में ${MAXN} सामान हो गए</b><p class="note" style="margin:0">अब PDF बनाकर AI में डालें। अगले सामान नई खेप में।</p></div>`}
  ${n?`<h3 style="margin:14px 0 6px">इस खेप में ${n} सामान</h3><div class="list silist">${E.map(e=>`<div class="li"><span class="sith">${e.th.f?`<img src="${e.th.f}" alt="">`:"📦"}</span><div class="mid"><b>#${e.n} · ${e.match&&item(e.match)?esc(item(e.match).name):"नया / AI बताएगा"}</b><span>${e.qty} पीस${num(e.cost)?" · खरीद ₹"+num(e.cost):""}${num(e.sale)?" · बिक्री ₹"+num(e.sale):""}${e.bar?" · 📟 "+esc(e.bar):""} · ${["f","p","b"].filter(k=>e.has[k]).length} फोटो</span></div><button class="lnk" data-sidel="${e.n}" style="color:var(--chili)">हटाएँ</button></div>`).join("")}</div>`:""}
  <div class="siact">
    <div class="row2" style="margin:0"><button class="big" data-sizip ${n?"":"disabled"}>📦 AI के लिए ZIP (${n})</button><button class="big ghost" data-sipdf ${n?"":"disabled"}>📄 PDF (${n})</button></div>
    <div class="row2" style="margin:0"><button class="big ghost" data-sipaste ${n?"":"disabled"}>📋 AI का जवाब चिपकाएँ</button><button class="big ghost" data-sicopy>🧾 AI निर्देश कॉपी</button></div>
    <p class="note" style="margin:0">ZIP (या PDF) Claude/Gemini में डालकर लिखें: <b>"READ-ME-FIRST मानो, STEP 1 करो"</b> — वह फटाफट सब लिख देगा, जवाब यहाँ चिपकाएँ। बाद में फुर्सत में लिखें <b>"STEP 2"</b> — असली नाम-फोटो ढूँढेगा (⚙️ 📸 असली फोटो में डालें)।</p>
    ${n?`<button class="lnk" data-sireset style="color:var(--chili);justify-self:start">यह पूरी खेप मिटाएँ</button>`:""}</div>`;
};
function formHTML(){
  const c=CUR,m=c.match&&item(c.match);
  return `<div class="card2 siform"><h3>#${c.n} · अगला सामान</h3>
  <div class="sislots">${KINDS.map(([k,l,ic,req])=>`<button type="button" class="sislot ${c.has[k]?"ok":""}" data-siph="${k}">${c.th[k]?`<img src="${c.th[k]}" alt="">`:`<span class="ic">${ic}</span>`}<span class="lb">${l}${req?" *":""}</span>${c.has[k]?'<i class="tick">✓</i>':""}</button>`).join("")}</div>
  <div class="sibar">${c.bar?`📟 <b>${esc(c.bar)}</b> ${m?`· <span class="pill green">♻️ पहले से: ${esc(m.name)}</span>`:`· <span class="pill blue">🆕 नया सामान</span>`}`:`<span class="note">बारकोड की फोटो लें या 📷 से स्कैन करें — ऐप नंबर खुद पढ़ लेगा</span>`}<button class="scanbtn" type="button" data-siscan aria-label="बारकोड स्कैन">📷</button></div>
  <div class="row3 sinums"><label class="fld">कितने पीस *<input class="inp" id="siQ" inputmode="numeric" value="${esc(c.qty)}" placeholder="0"></label><label class="fld">खरीद ₹/पीस<input class="inp" id="siC" inputmode="decimal" value="${esc(c.cost)}" placeholder="${m&&+m.cost?+m.cost:"पता हो तो"}"></label><label class="fld">बिक्री ₹<input class="inp" id="siS" inputmode="decimal" value="${esc(c.sale)}" placeholder="${m&&+m.sale?+m.sale:"= MRP"}"></label></div>
  <button class="big" data-sinext>✓ जोड़ें, अगला सामान</button></div>`;
}
function renderStart(el){
  el.innerHTML=`<div class="sihead"><h2 class="sec" style="margin:0">📸 फोटो से माल</h2><button class="big ghost" data-siclose style="width:auto;padding:8px 14px">✕ बंद</button></div>
  <div class="card2 sihero"><div class="sihero-ic">🤖</div><div><b>फोटो लो, AI नाम-MRP-एक्सपायरी भरेगा</b><p class="note" style="margin:2px 0 0">हर सामान की 3 फोटो + मात्रा → PDF → Claude/Gemini → जवाब चिपकाओ → सब चढ़ गया।</p></div></div>
  <h3 style="margin:12px 0 6px">माल कहाँ से आया?</h3>
  <div class="sisrc">${Object.entries(SRC).map(([k,v])=>`<button class="big ghost" data-sisrc="${k}">${v}</button>`).join("")}</div>
  <div id="sishop" hidden class="card2"><label class="fld">🏪 दुकान का नाम<input class="inp" id="siShop" placeholder="जैसे गणेश ट्रेडर्स"></label>
  <div class="paym" style="margin:6px 0 0">${Object.entries(PAYS).map(([k,v],i)=>`<button data-sipay="${k}" aria-pressed="${i===0}">${v}</button>`).join("")}</div>
  <button class="big" data-sishopgo style="margin-top:8px">शुरू करें</button></div>`;
}
function startBatch(src,shop,pay){
  const d=today().slice(5).replace("-","");B={open:true,id:"F"+d+"-"+Math.random().toString(36).slice(2,6).toUpperCase(),src,shop:shop||"",pay:pay||"",ts:Date.now(),entries:[]};CUR=blank();save();SI.render();
}

/* ---------- फोटो, बारकोड ---------- */
async function takePhoto(k){
  pick(async f=>{
    try{
      toast("फोटो छोटी कर रहे हैं…");
      const big=await shrink(f,k==="p"?1500:k==="b"?1000:1100,k==="p"?.78:.72);
      await IDB.put(pk(CUR.n,k),big);CUR.has[k]=true;CUR.th[k]=await thumbOf(big,120);
      if(k==="b"&&typeof decodeImage==="function"){try{const c=await decodeImage(big);if(c)setBar(c);else toast("बारकोड नहीं पढ़ा — AI पढ़ लेगा, या 📷 से स्कैन करें")}catch(e){}}
      save();SI.render();beep(true);
    }catch(e){toast("फोटो नहीं ली जा सकी")}
  });
}
function setBar(code){code=String(code||"").replace(/\s/g,"");CUR.bar=code;const it=findByCode(code);CUR.match=it?it.id:"";
  if(it&&!CUR.sale&&+it.sale)CUR.sale="";save();toast(it?"♻️ पहले से है: "+it.name:"🆕 नया बारकोड "+code)}
SI.scan=function(code){if(!B||!B.src||VIEW!=="form")return false;setBar(code);beep(true);SI.render();return true};
function addEntry(){
  const q=num($("#siQ").value);CUR.qty=$("#siQ").value;CUR.cost=$("#siC").value;CUR.sale=$("#siS").value;
  if(!CUR.has.f){toast("पहले आगे की फोटो लें");return}
  if(!(q>0)){toast("कितने पीस — लिखें");$("#siQ").focus();return}
  B.entries.push({n:CUR.n,qty:q,cost:num(CUR.cost)||"",sale:num(CUR.sale)||"",bar:CUR.bar,match:CUR.match,has:{...CUR.has},th:{f:CUR.th.f||""}});
  CUR=blank();save();SI.render();toast("✓ जुड़ गया · अब "+B.entries.length+" सामान");window.scrollTo(0,0);document.body.scrollTop=0;
}

/* ---------- 📄 PDF ---------- */
function loadPdf(){return window.jspdf?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement("script");s.src="lib/jspdf.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
function dims(url){return new Promise(res=>{const i=new Image();i.onload=()=>res([i.width,i.height]);i.onerror=()=>res([4,3]);i.src=url})}
function hiLine(t,w){const c=document.createElement("canvas");c.width=w*4;c.height=64;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.fillStyle="#3730a3";
  let f=30;do{x.font=`700 ${f}px "Mukta","Noto Sans Devanagari",sans-serif`;f--}while(x.measureText(t).width>c.width-12&&f>12);x.textBaseline="middle";x.fillText(t,6,32);return c.toDataURL("image/png")}
async function makePdf(){
  const btn=$("[data-sipdf]");if(btn){btn.disabled=true;btn.textContent="⏳ PDF बन रही है…"}
  try{
    await loadPdf();const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4",compress:true});
    const W=210,M=12;
    doc.addImage(hiLine("यह PDF Claude या Gemini में डालें और लिखें: \"PDF के पहले पेज के निर्देश मानो\"",186),"PNG",M,8,186,8);
    doc.setFont("helvetica","normal");doc.setFontSize(9);
    doc.text(doc.splitTextToSize(prompt(),W-2*M),M,22);
    const srcEn=B.src==="mh"?"177 MH transfer":B.src==="shop"?"Shop: "+(B.shop||""):"Opening stock";
    for(const e of B.entries){
      doc.addPage();doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("#"+e.n,M,16);
      doc.setFontSize(11);doc.setFont("helvetica","normal");
      const it=e.match&&item(e.match);
      const ln=[`QTY: ${e.qty}`,`COST: ${e.cost||"-"}`,`SALE: ${e.sale||"-"}`,`BARCODE: ${e.bar||"-"}`,`SOURCE: ${srcEn}`].join("   |   ");
      doc.text(ln,M+16,16);
      if(it)doc.text("Already in app as: "+String(it.name).replace(/[^\x20-\x7E]/g,""),M+16,22);
      const boxes={f:[M,28,90,120],p:[M+96,28,90,120],b:[M,154,90,120]};
      for(const [k,lb] of [["f","FRONT"],["p","PRICE / MRP / EXPIRY"],["b","BARCODE"]]){
        const [x,y,w,h]=boxes[k];doc.setFontSize(9);doc.setTextColor(90);doc.text(lb,x,y-1.5);doc.setTextColor(0);
        doc.setDrawColor(200);doc.rect(x,y,w,h);
        if(!e.has[k]){doc.text("(no photo)",x+w/2-8,y+h/2);continue}
        const blob=await IDB.get(pk(e.n,k));if(!blob){doc.text("(photo missing)",x+w/2-10,y+h/2);continue}
        const url=await toURL(blob);const [iw,ih]=await dims(url);const sc=Math.min(w/iw,h/ih),dw=iw*sc,dh=ih*sc;
        doc.addImage(url,"JPEG",x+(w-dw)/2,y+(h-dh)/2,dw,dh,undefined,"FAST");
      }
    }
    const name="MH177_"+B.id+"_"+B.entries.length+"items.pdf";
    if(window.SENative&&SENative.isNative){const b64=doc.output("datauristring").split(",")[1];await SENative.BtPrinter.shareBytes({name,data:b64,mime:"application/pdf"})}
    else doc.save(name);
    B.pdfAt=Date.now();save();toast("📄 PDF बन गई — अब Claude/Gemini में डालें");
  }catch(e){toast("PDF नहीं बनी: "+(e.message||e))}
  SI.render();
}

/* ---------- 📦 ZIP (Claude को पूरी, साफ़ फोटो दिखती हैं — PDF से बेहतर) ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
SI.zipBlob=function(files){/* files: [{name, data:Uint8Array}] — STORE (JPEG पहले से दबी हुई) */
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  for(const f of files){const nm=enc.encode(f.name),d=f.data,c=crc32(d),h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint32(14,c,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,nm.length,true);
    parts.push(h,nm,d);const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint32(16,c,true);e.setUint32(20,d.length,true);e.setUint32(24,d.length,true);e.setUint16(28,nm.length,true);e.setUint32(42,off,true);
    cen.push(e,nm);off+=30+nm.length+d.length}
  const cs=cen.reduce((a,x)=>a+(x.byteLength||x.length),0),z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,files.length,true);z.setUint16(10,files.length,true);z.setUint32(12,cs,true);z.setUint32(16,off,true);
  return new Blob([...parts,...cen,z],{type:"application/zip"})};
async function makeZip(){
  const btn=$("[data-sizip]");if(btn){btn.disabled=true;btn.textContent="⏳ ZIP बन रही है…"}
  try{const enc=new TextEncoder(),F=[],srcEn=B.src==="mh"?"177 MH transfer":B.src==="shop"?"Shop: "+(B.shop||""):"Opening stock";
    F.push({name:"00-READ-ME-FIRST.txt",data:enc.encode(prompt()+"\n\nFiles: NN-front.jpg / NN-mrp.jpg / NN-barcode.jpg, details in items.csv.\n")});
    const csv=["n,qty,cost,sale,barcode,already_in_app_as,source"].concat(B.entries.map(e=>{const it=e.match&&item(e.match);return [e.n,e.qty,e.cost||"",e.sale||"",e.bar||"",it?'"'+String(it.name).replace(/"/g,"'")+'"':"",'"'+srcEn+'"'].join(",")}));
    F.push({name:"items.csv",data:enc.encode(csv.join("\n"))});
    for(const e of B.entries)for(const [k,lb] of [["f","front"],["p","mrp"],["b","barcode"]]){if(!e.has[k])continue;const b=await IDB.get(pk(e.n,k));if(b)F.push({name:String(e.n).padStart(2,"0")+"-"+lb+".jpg",data:new Uint8Array(await b.arrayBuffer())})}
    const zb=SI.zipBlob(F),name="MH177_"+B.id+"_"+B.entries.length+"items.zip";SI._zip=zb;
    if(window.SENative&&SENative.isNative){const b64=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(String(fr.result).split(",")[1]);fr.readAsDataURL(zb)});await SENative.BtPrinter.shareBytes({name,data:b64,mime:"application/zip"})}
    else{const a=document.createElement("a");a.href=URL.createObjectURL(zb);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
    B.pdfAt=Date.now();save();toast("📦 ZIP बन गई — Claude में डालकर लिखें: READ-ME-FIRST मानो");
  }catch(e){toast("ZIP नहीं बनी: "+(e.message||e))}
  SI.render()}

/* ---------- 📋 जवाब चिपकाना ---------- */
function renderPaste(el){
  el.innerHTML=`<div class="sihead"><div><h2 class="sec" style="margin:0">📋 AI का जवाब</h2><span class="note">${esc(B.id)} · ${B.entries.length} सामान · ${SRC[B.src]}</span></div><button class="big ghost" data-siback style="width:auto;padding:8px 14px">‹ वापस</button></div>
  ${PV?pvHTML():`<div class="card2"><p class="note" style="margin:0 0 6px">Claude/Gemini ने जो जवाब दिया, वो <b>पूरा</b> कॉपी करके यहाँ चिपकाएँ।</p>
  <textarea class="inp" id="siPaste" rows="9" placeholder='{"app":"mh177", ... }' style="font:13px monospace">${esc(PASTE)}</textarea>
  <button class="big" data-sicheck style="margin-top:8px">🔍 जाँचें</button></div>`}`;
}
function parse(t){
  let s=String(t||"");const f=s.match(/```(?:json)?\s*([\s\S]*?)```/);if(f)s=f[1];
  const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a<0||b<a)throw new Error("जवाब में { } वाला हिस्सा नहीं मिला");
  const j=JSON.parse(s.slice(a,b+1).replace(/[“”]/g,'"'));const items=Array.isArray(j)?j:j.items;if(!Array.isArray(items)||!items.length)throw new Error("items की लिस्ट खाली है");return {j,items};
}
const okDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||""))&&!isNaN(new Date(d+"T12:00:00"));
function check(){
  PASTE=$("#siPaste").value;
  try{const {j,items}=parse(PASTE);
    if(j.batch&&j.batch!==B.id)toast("⚠ यह जवाब किसी दूसरी खेप ("+j.batch+") का लगता है — ध्यान से देखें");
    PV=B.entries.map(e=>{const a=items.find(x=>+x.n===+e.n)||{};const bar=String(a.barcode||e.bar||"").replace(/\D/g,"");
      const ex=(e.match&&item(e.match))||(bar&&findByCode(bar))||null;
      return {e,a,ex,use:true,name:String(a.name||(ex&&ex.name)||"").slice(0,24),hi:String(a.hi||""),bar,
        qty:num(e.qty)||num(a.qty),sale:num(e.sale)||num(a.sale)||num(a.mrp)||(ex?+ex.sale:0),mrp:num(a.mrp)||(ex?+ex.mrp||0:0),cost:num(e.cost)||num(a.cost),exp:okDate(a.exp)?a.exp:""}});
    const miss=PV.filter(r=>!r.a.n).length;if(miss)toast("⚠ "+miss+" सामान का जवाब AI ने नहीं दिया");
  }catch(err){toast("जवाब समझ नहीं आया: "+err.message);return}
  SI.render();
}
function pvHTML(){
  const nNew=PV.filter(r=>r.use&&!r.ex).length,nOld=PV.filter(r=>r.use&&r.ex).length;
  return `<div class="card2"><b>🆕 ${nNew} नया सामान · ♻️ ${nOld} में स्टॉक जुड़ेगा</b><p class="note" style="margin:2px 0 0">नाम या भाव ठीक करना हो तो यहीं बदल दें। ⚠ वाली लाइनें ध्यान से देखें।</p></div>
  <div class="list sipv">${PV.map((r,i)=>{const warn=!r.name||!(r.sale>0)||!r.qty||(r.a.note);const past=r.exp&&r.exp<today();
    return `<div class="li sirow ${r.use?"":"off"} ${warn||past?"warn":""}"><label class="sichk"><input type="checkbox" data-pvuse="${i}" ${r.use?"checked":""}></label><span class="sith">${r.e.th.f?`<img src="${r.e.th.f}" alt="">`:"📦"}</span>
    <div class="mid"><div class="sipvt">${r.ex?`<span class="pill green">♻️ ${esc(r.ex.name)}</span>`:`<span class="pill blue">🆕 नया ${esc(r.a.emoji||"")}</span>`} <small>#${r.e.n}</small></div>
      ${r.ex?"":`<input class="inp" data-pvname="${i}" value="${esc(r.name)}" placeholder="नाम" maxlength="24">`}
      <span>${esc(r.hi||"")}${r.a.size?" · "+esc(r.a.size):""} · ${r.qty} पीस · MRP ${r.mrp?"₹"+r.mrp:"—"} · ${r.exp?(past?"⚠ एक्सपायर "+fdate(r.exp):"एक्स. "+fdate(r.exp)):"एक्सपायरी नहीं मिली"}${r.bar?" · 📟 "+esc(r.bar):""}</span>
      ${r.a.note?`<span class="sinote">⚠ ${esc(r.a.note)}</span>`:""}</div>
    <label class="fld sipr">बिक्री ₹<input class="inp" data-pvsale="${i}" inputmode="decimal" value="${r.sale||""}"></label></div>`}).join("")}</div>
  <div class="siact"><button class="big" data-siapply>✓ सब चढ़ाएँ (${PV.filter(r=>r.use).length})</button><button class="big ghost" data-sirepaste>दूसरा जवाब चिपकाएँ</button></div>`;
}
async function apply(){
  const rows=PV.filter(r=>r.use);if(!rows.length){toast("कुछ चुना नहीं");return}
  const bad=rows.find(r=>!r.ex&&(!r.name||!(r.sale>0)))||rows.find(r=>!(r.qty>0));if(bad){toast("#"+bad.e.n+": नाम, बिक्री ₹ और मात्रा ज़रूरी");return}
  const btn=$("[data-siapply]");btn.disabled=true;btn.textContent="⏳ चढ़ रहा है…";
  const ts=Date.now(),date=today(),why=(B.src==="opening"?"ओपनिंग स्टॉक":B.src==="mh"?"177 MH से":"दुकान: "+B.shop)+" · फोटो "+B.id;
  const lines=[];let nNew=0,nOld=0,photoKB=0;
  for(const r of rows){
    let id;
    if(r.ex){id=r.ex.id;nOld++;
      if(S.isOwner){const p={};if(!r.ex.hi&&r.hi)p.hi=r.hi;if(!r.ex.size&&r.a.size)p.size=r.a.size;if(!(+r.ex.mrp)&&r.mrp)p.mrp=r.mrp;if(!r.ex.sub&&r.a.sub)p.sub=r.a.sub;if(!(+r.ex.cost)&&r.cost)p.cost=r.cost;
        if(!r.ex.barcode&&r.bar)p.barcode=r.bar;if(!r.ex.aiPrompt&&r.a.img)Object.assign(p,imgP(r.a));if(Object.keys(p).length){Object.assign(r.ex,p);if(!S.demo)S.db.doc("items/"+id).update(p).catch(()=>{})}}}
    else{nNew++;id="i"+uid();const cat=["kirana","fast","sabzi"].includes(r.a.cat)?r.a.cat:"kirana",code=nextCode(cat);
      const bar=/^\d{8,14}$/.test(r.bar)&&!findByCode(r.bar)?r.bar:ean13("2000000"+code+"0");
      const it={name:r.name,hi:r.hi,emoji:r.a.emoji||"📦",cat,sub:(SUBS[cat]||[]).some(([k])=>k===r.a.sub)?r.a.sub:"",unit:"pc",size:r.a.size||"",mrp:r.mrp,sale:r.sale,cost:r.cost||0,code,barcode:bar,track:true,min:5,
        hue:Math.floor(Math.random()*360),order:S.items.length+1,active:true,src:"photo-ai",photoSrc:"shop",...imgP(r.a),addedBy:S.uid||"",addedByName:biller(),addedTs:ts,pending:!S.isOwner,...(r.exp?{exp:r.exp}:{})};
      // ऐप में छोटी फोटो (≈6-10 KB)
      try{const big=await IDB.get(pk(r.e.n,"f"));if(big){const sm=await shrink(big,220,.66);photoKB+=sm.size/1024;
        if(S.demo||!S.isOwner){SE.photos[id]=await toURL(sm);it.photo=""}else{it.photo=await SE.savePhoto(id,sm,220,.66)}}}catch(e){}
      try{if(!S.demo)await S.db.collection("items").doc(id).set(it);if(!item(id))S.items.push({id,...it});if(S.isOwner&&!S.demo&&typeof logPrice==="function")logPrice(id,"sale",0,r.sale)}
      catch(e){toast("#"+r.e.n+" नहीं बना: "+(e.code||e.message||""));continue}}
    const nm=item(id).name;
    await adjStock([[id,r.qty]],why);
    if(r.exp){const bt={itemId:id,exp:r.exp,qty:r.qty,date,ts,pid:B.id,src:B.src};S.batches=S.batches||[];S.batches.push({id:"t"+uid(),...bt});if(!S.demo)S.db.collection("batches").doc("x"+uid()).set(bt).catch(()=>{})}
    lines.push({id,name:nm,unit:"pc",qty:r.qty,rate:r2(r.cost||0),amt:r2((r.cost||0)*r.qty),billAmt:r2((r.cost||0)*r.qty),prev:0,...(r.exp?{exp:r.exp}:{})});
  }
  let pdoc=null;
  if(B.src!=="opening"&&lines.length){
    const tot=r2(lines.reduce((a,l)=>a+l.amt,0)),mh=B.src==="mh",pid="p"+uid();
    pdoc={date,ts,by:S.uid||"",byName:biller(),supId:"",supName:mh?"177 MH कैंटीन":B.shop||"दुकान",supPhone:"",lines,gross:tot,disc:0,total:tot,
      pay:mh?"mh":(B.pay||"vikram"),paid:mh||B.pay==="udhar"?0:tot,due:!mh&&B.pay==="udhar"?tot:0,src:mh?"mh":"shop",note:"📸 फोटो से (AI) · "+B.id,photos:[],photoPending:0,cancelled:false};
    try{if(!S.demo)await S.db.collection("purchases").doc(pid).set(pdoc);S.purch=S.purch||[];if(S.demo||!S.purch.find(p=>p.id===pid))S.purch.push({id:pid,...pdoc});S.purchHist&&S.purchHist.push({id:pid,...pdoc});pdoc={id:pid,...pdoc}}catch(e){toast("खरीद का रिकॉर्ड नहीं बना: "+(e.code||""))}
  }
  const old=B.id,src=B.src;await IDB.delPrefix(old+"_");B=null;CUR=null;PV=null;PASTE="";VIEW="form";save();
  toast(`✓ ${nNew} नया · ${nOld} पुराने में स्टॉक जुड़ा${photoKB?` · फोटो कुल ${Math.round(photoKB)} KB`:""}`);beep(true);
  if(window.SF)SF.renderKharid(1);
  if(src==="mh"&&pdoc&&window.SF&&SF.mhSlip)setTimeout(()=>SF.mhSlip(pdoc,"फोटो "+old),300);
}

/* ---------- 🎨 Gemini फोटो प्रॉम्प्ट ---------- */
SI.geminiPrompt=function(it){if(it.aiPrompt)return it.aiPrompt;if(window.SPH&&SPH.makePrompt&&["mithai","fast","mela","sabzi"].includes(it.cat))return SPH.makePrompt(it);return `Create a clean e-commerce product photo of this exact product: ${it.name}${it.size&&!String(it.name).includes(it.size)?" "+it.size:""}.
Use my attached photo as the only reference. Keep the real packaging, colours, brand logo and printed text exactly as they are; do not redesign anything.
Square 1:1 image, pure white background, product centred and filling about 80% of the frame, straight front view, soft studio light, gentle shadow under the pack.
No hands, no other objects, no extra text, no watermark. Output size 800x800.`};
SI.copyGemini=async function(id){const it=item(id);if(!it)return;try{await navigator.clipboard.writeText(SI.geminiPrompt(it));toast("🎨 Gemini प्रॉम्प्ट कॉपी — Gemini में अपनी फोटो के साथ चिपकाएँ, बनी फोटो यहीं लगाएँ (अपने-आप छोटी होगी)")}catch(e){toast("कॉपी नहीं हुआ")}};

/* ---------- घटनाएँ ---------- */
SI.bind=function(){
  const el=$("#p-kharid");
  el.addEventListener("input",e=>{if(!SI.active())return;const t=e.target;
    if(t.id==="siQ"){CUR.qty=t.value;save()}else if(t.id==="siC"){CUR.cost=t.value;save()}else if(t.id==="siS"){CUR.sale=t.value;save()}
    else if(t.id==="siPaste")PASTE=t.value;
    else if(t.dataset.pvname!=null)PV[+t.dataset.pvname].name=t.value.trim();
    else if(t.dataset.pvsale!=null)PV[+t.dataset.pvsale].sale=num(t.value)});
  el.addEventListener("change",e=>{const t=e.target;if(t.dataset&&t.dataset.pvuse!=null){PV[+t.dataset.pvuse].use=t.checked;SI.render()}});
  el.addEventListener("click",async e=>{
    if(e.target.closest("[data-siopen]")){SI.open();return}
    if(!SI.active())return;
    if(e.target.closest("[data-siclose]")){close();return}
    const sr=e.target.closest("[data-sisrc]");if(sr){const k=sr.dataset.sisrc;if(k==="shop"){$("#sishop").hidden=false;$("#siShop").focus();return}startBatch(k);return}
    const sp=e.target.closest("[data-sipay]");if(sp){document.querySelectorAll("[data-sipay]").forEach(x=>x.setAttribute("aria-pressed",x===sp));return}
    if(e.target.closest("[data-sishopgo]")){const nm=$("#siShop").value.trim();if(!nm){toast("दुकान का नाम लिखें");return}const p=document.querySelector('[data-sipay][aria-pressed="true"]');startBatch("shop",nm,p?p.dataset.sipay:"vikram");return}
    const ph=e.target.closest("[data-siph]");if(ph){takePhoto(ph.dataset.siph);return}
    if(e.target.closest("[data-siscan]")){if(typeof liveScan==="function")liveScan();return}
    if(e.target.closest("[data-sinext]")){addEntry();return}
    const dl=e.target.closest("[data-sidel]");if(dl){const n=+dl.dataset.sidel;B.entries=B.entries.filter(x=>x.n!==n);for(const k of "fpb")IDB.tx("readwrite",s=>s.delete(pk(n,k))).catch(()=>{});save();SI.render();return}
    if(e.target.closest("[data-sipdf]")){makePdf();return}
    if(e.target.closest("[data-sizip]")){makeZip();return}
    if(e.target.closest("[data-sicopy]")){try{await navigator.clipboard.writeText(prompt());toast("🧾 AI निर्देश कॉपी हो गया")}catch(err){toast("कॉपी नहीं हुआ")}return}
    if(e.target.closest("[data-sipaste]")){VIEW="paste";PV=null;SI.render();setTimeout(()=>{const t=$("#siPaste");if(t)t.focus()},80);return}
    if(e.target.closest("[data-siback]")){VIEW="form";PV=null;SI.render();return}
    if(e.target.closest("[data-sicheck]")){check();return}
    if(e.target.closest("[data-sirepaste]")){PV=null;SI.render();return}
    if(e.target.closest("[data-siapply]")){apply();return}
    const rs_=e.target.closest("[data-sireset]");if(rs_){if(rs_.dataset.sure!=="1"){rs_.dataset.sure="1";rs_.textContent="पक्का? सारी फोटो मिट जाएँगी";return}await IDB.delPrefix(B.id+"_");B=null;CUR=null;save();if(window.SF)SF.renderKharid(1);toast("खेप मिटा दी")}
  });
};
SI.cardHTML=function(){const n=B&&B.entries?B.entries.length:0;
  return `<button class="sicard" data-siopen><span class="sicard-ic">📸</span><span><b>फोटो से माल चढ़ाएँ <i class="ai">AI</i></b><small>${n?`चालू खेप: ${n} सामान · ${B.src?SRC[B.src]:""}`:"3 फोटो + मात्रा → AI नाम, MRP, एक्सपायरी भरेगा"}</small></span><span class="go">›</span></button>`};
})();
