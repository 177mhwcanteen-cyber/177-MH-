/* 177 MH कैंटीन — 📸 असली फोटो (se-photo.js, window.SPH) · नियम: docs/खाता-और-फोटो-प्रॉम्प्ट.txt
   • हर फोटो अपने-आप: खाली किनारा काटो → चौकोर, सफ़ेद पृष्ठभूमि → 320px → JPEG ≤ 20 KB (HD भी) — ऐप कभी भारी नहीं
   • ⚙️ "📸 असली फोटो": कितनी बाकी · 10/15/20 सामान का तैयार प्रॉम्प्ट एक टैप में कॉपी (ChatGPT/Gemini) · ZIP या कई फोटो एक साथ डालें
   • फाइल का नाम → सामान: id → 4 अंक कोड → बारकोड → नाम */
(function(){
"use strict";
const SPH=window.SPH={};
const MAXB=20*1024,SIDE=320;
const LSx={get:k=>{try{return localStorage.getItem(k)||""}catch(e){return ""}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const loadImg=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src});
/* ---------- छोटा + साफ़: किनारा काटो, चौकोर, ≤20 KB ---------- */
SPH.compress=async function(blob){const u=URL.createObjectURL(blob);let im;try{im=await loadImg(u)}finally{setTimeout(()=>URL.revokeObjectURL(u),2000)}
  /* खाली किनारा ढूँढो (कोनों का रंग = पृष्ठभूमि) — छोटे canvas पर, तेज़ */
  const w0=200,sc0=Math.min(1,w0/Math.max(im.width,im.height)),cw=Math.max(1,Math.round(im.width*sc0)),ch=Math.max(1,Math.round(im.height*sc0));
  const t=document.createElement("canvas");t.width=cw;t.height=ch;const tx=t.getContext("2d",{willReadFrequently:true});tx.drawImage(im,0,0,cw,ch);
  let box=[0,0,im.width,im.height];
  try{const d=tx.getImageData(0,0,cw,ch).data,px=(x,y)=>{const i=(y*cw+x)*4;return [d[i],d[i+1],d[i+2]]};
    const cs=[px(0,0),px(cw-1,0),px(0,ch-1),px(cw-1,ch-1)],bg=[0,1,2].map(k=>Math.round(cs.reduce((a,c)=>a+c[k],0)/4));
    const same=cs.every(c=>Math.abs(c[0]-bg[0])+Math.abs(c[1]-bg[1])+Math.abs(c[2]-bg[2])<60);
    if(same){let x1=cw,y1=ch,x2=-1,y2=-1;for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const c=px(x,y);if(Math.abs(c[0]-bg[0])+Math.abs(c[1]-bg[1])+Math.abs(c[2]-bg[2])>48){if(x<x1)x1=x;if(x>x2)x2=x;if(y<y1)y1=y;if(y>y2)y2=y}}
      if(x2>x1&&y2>y1&&(x2-x1)*(y2-y1)>cw*ch*.04){const f=1/sc0;box=[x1*f,y1*f,(x2-x1+1)*f,(y2-y1+1)*f]}}}catch(e){}
  const pad=Math.max(box[2],box[3])*.06;
  for(const side of [SIDE,280,240,200]){const c=document.createElement("canvas");c.width=c.height=side;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,side,side);
    const bw=box[2]+pad*2,bh=box[3]+pad*2,s=Math.min(side/bw,side/bh),dw=box[2]*s,dh=box[3]*s;x.imageSmoothingQuality="high";
    x.drawImage(im,box[0],box[1],box[2],box[3],(side-dw)/2,(side-dh)/2,dw,dh);
    for(let q=.84;q>=.4;q-=.08){const url=c.toDataURL("image/jpeg",q);if(url.length*.75<=MAXB)return url}}
  const c=document.createElement("canvas");c.width=c.height=160;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,160,160);x.drawImage(im,0,0,160,160);return c.toDataURL("image/jpeg",.5)};
SPH.save=async function(id,blob){const url=await SPH.compress(blob);SE.photos[id]=url;
  if(!S.demo&&(SE.db||S.db))await (SE.db||S.db).doc("photos/"+id).set({d:url,ts:Date.now(),kb:Math.round(url.length*.75/1024)});return "fs"+Date.now()};
/* कैमरे/गैलरी से लगने वाली हर फोटो भी इसी रास्ते (पहले 240px, कोई सीमा नहीं थी) */
SE.savePhoto=function(id,blob){return SPH.save(id,blob)};

/* ---------- 📋 10/15/20 सामान का प्रॉम्प्ट ---------- */
SPH.missing=()=>S.items.filter(i=>i.active!==false&&!i.virtual&&!i.photo&&!(typeof isTob==="function"&&isTob(i)));
SPH.prompt=function(L){const shop="177 MH Canteen, Barmer (India)";
  const rows=L.map((i,k)=>{const br=i.brand?` | brand: ${i.brand}`:"";const bc=String(i.barcode||"").split(",")[0].trim();
    return `${k+1}. file: ${i.id}.jpg | product: ${SE.capNm(i.name)}${br}${i.size?` | size: ${i.size}`:""}${bc?` | barcode (EAN): ${bc}`:""}${+i.mrp?` | MRP ₹${i.mrp}`:""}${i.hi?` | Hindi: ${i.hi}`:""} | type: ${["mithai","fast"].includes(i.cat)?"loose food (sweet/snack) made in our shop":"packaged product"}`}).join("\n");
  return `You are helping ${shop} put REAL product photos in its billing & online-order app.

For each item below, find the ORIGINAL photo of exactly that product — same brand, same variant/flavour, same pack size — like the main image on Amazon, Flipkart, BigBasket, Blinkit or the brand's official website. Search the web using the barcode and the product name.

Rules:
1. Real photo of the real pack only. Never invent, redraw or AI-generate a branded pack. If you cannot find the exact product, skip it and list it under "NOT FOUND".
2. Front of the pack, whole pack visible, plain white background, no watermark, no price stickers, no hands, no extra items.
3. Square image, at least 600 x 600 px, JPG.
4. Name each file EXACTLY as given ("file:" value), e.g. ${L[0]?L[0].id:"item-id"}.jpg — this is how the app matches the photo.
5. For "loose food (sweet/snack) made in our shop" there is no brand pack: create one realistic, appetising photo of that Indian sweet/snack (top view, on a plain white plate, plain white background, natural light, no text) and name it the same way.
6. Put all images in ONE ZIP file and give me the download. Also give a short list: FOUND / GENERATED / NOT FOUND.

Items (${L.length}):
${rows}`};
SPH.copy=async function(t){try{await navigator.clipboard.writeText(t);return true}catch(e){}
  try{const a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();const ok=document.execCommand("copy");a.remove();return ok}catch(e){return false}};
SPH.batch=async function(n){const asked=JSON.parse(LSx.get("sph_ask")||"{}"),now=Date.now();
  const M=SPH.missing().sort((a,b)=>(asked[a.id]||0)-(asked[b.id]||0)||((+b.mrp>0)-(+a.mrp>0)));/* जो कभी नहीं माँगे, वे पहले */
  const L=M.slice(0,n);if(!L.length){toast("सबकी असली फोटो लग चुकी है 🎉");return}
  L.forEach(i=>asked[i.id]=now);LSx.set("sph_ask",JSON.stringify(asked));const t=SPH.prompt(L);SPH._last=t;
  const ok=await SPH.copy(t);
  $("#sheet").innerHTML=`<div class="qscrim" data-close></div><div class="qpop" style="top:70px;max-height:80vh;overflow:auto" role="dialog" aria-label="फोटो का प्रॉम्प्ट">
    <div class="sl-ah"><b>📋 ${L.length} सामान का प्रॉम्प्ट ${ok?"कॉपी हो गया ✓":""}</b><span></span><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <p class="note" style="margin:0">① ChatGPT या Gemini खोलें → ② चिपकाएँ (Paste) और भेजें → ③ जो ZIP मिले उसे डाउनलोड करें → ④ यहाँ "📥 ZIP / फोटो डालें" दबाकर वही ZIP चुनें। बस।</p>
    <div class="row2" style="margin:0"><button class="big" data-sphcp>📋 फिर से कॉपी</button>${navigator.share?`<button class="big ghost" data-sphsh>📤 भेजें</button>`:""}</div>
    <textarea class="inp" rows="8" readonly style="font-size:12px">${esc(t)}</textarea></div>`;
  $("#sheet").onclick=async e=>{if(e.target.closest("[data-close]")){closeSheet();return}if(e.target.closest("[data-sphcp]")){toast((await SPH.copy(t))?"📋 कॉपी हो गया":"कॉपी नहीं हुआ — नीचे से चुनकर कॉपी करें");return}
    if(e.target.closest("[data-sphsh]")){try{await navigator.share({text:t})}catch(x){}}}};

/* ---------- 📥 ZIP / HTML / कई फोटो डालें ---------- */
async function unzip(buf){const dv=new DataView(buf);let e=-1;for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65557);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw new Error("ZIP नहीं पढ़ा गया");const cnt=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out=[];
  for(let k=0;k<cnt;k++){if(dv.getUint32(p,true)!==0x02014b50)break;const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lho=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(new Uint8Array(buf,p+46,nl));p+=46+nl+xl+cl;if(/\/$/.test(name)||/__MACOSX|\/\._/.test(name))continue;
    const ds=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true),raw=new Uint8Array(buf,ds,csz);let data;
    if(meth===0)data=raw;else if(meth===8&&window.DecompressionStream)data=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());else continue;
    out.push({name,blob:new Blob([data],{type:/\.png$/i.test(name)?"image/png":/\.webp$/i.test(name)?"image/webp":"image/jpeg"})})}return out}
const norm=s=>String(s||"").toUpperCase().replace(/\.[A-Z0-9]+$/,"").replace(/[^A-Z0-9]/g,"");
SPH.match=function(fname){const base=String(fname).split("/").pop().replace(/\.[a-z0-9]+$/i,""),A=S.items.filter(i=>!i.virtual),n=norm(base);if(!n)return null;
  return A.find(i=>i.id===base)||A.find(i=>norm(i.id)===n)||A.find(i=>String(i.code||"")===base)||A.find(i=>String(i.barcode||"").split(",").some(b=>b.trim()===base))
    ||A.find(i=>norm(i.short||i.name)===n)||A.find(i=>n.length>5&&norm(i.name).includes(n))||null};
SPH.importFiles=async function(files){const jobs=[];
  for(const f of files){
    if(/\.zip$/i.test(f.name)||f.type==="application/zip"){try{(await unzip(await f.arrayBuffer())).filter(z=>/\.(jpe?g|png|webp)$/i.test(z.name)).forEach(z=>jobs.push(z))}catch(e){toast("ZIP नहीं खुला: "+f.name)}}
    else if(/\.html?$/i.test(f.name)){const doc=new DOMParser().parseFromString(await f.text(),"text/html");
      doc.querySelectorAll("img[src^='data:image']").forEach((im,k)=>{const key=im.getAttribute("data-id")||im.getAttribute("data-file")||im.getAttribute("alt")||im.getAttribute("title")||("img"+k);
        const bin=atob(im.src.split(",")[1]||""),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);jobs.push({name:key,blob:new Blob([u],{type:"image/jpeg"})})})}
    else if(/^image\//.test(f.type)||/\.(jpe?g|png|webp)$/i.test(f.name))jobs.push({name:f.name,blob:f})}
  if(!jobs.length){toast("कोई फोटो नहीं मिली");return}
  let ok=0;const miss=[];const tot=jobs.length;
  for(const j of jobs){const it=SPH.match(j.name);if(!it){miss.push(j.name.split("/").pop());continue}
    try{const tag=await SPH.save(it.id,j.blob);it.photo=tag;if(typeof saveItem==="function")await saveItem(it.id,{photo:tag});ok++;if(ok%5===0)toast(`📸 ${ok}/${tot} लग गईं…`)}catch(e){miss.push(j.name.split("/").pop())}}
  try{renderSettings();if(S.tab==="bill")renderBill()}catch(e){}if(window.SON&&SON.publishPhotos)SON.publishPhotos(true);
  toast(`✓ ${ok} असली फोटो लगीं (हर एक ≤20 KB)${miss.length?` · ${miss.length} का सामान नहीं मिला: ${miss.slice(0,4).join(", ")}${miss.length>4?"…":""}`:""}`);return {ok,miss}};

/* ---------- ⚙️ कार्ड ---------- */
SPH.settingsHTML=function(){if(!S.isOwner&&!S.demo)return "";const M=SPH.missing(),A=S.items.filter(i=>i.active!==false&&!i.virtual).length,kb=Object.values(SE.photos||{}).reduce((a,u)=>a+String(u).length*.75,0)/1024;
  return `<div class="card2 sph" id="sphCard"><h3>📸 असली फोटो (Amazon/Blinkit जैसा भरोसा)</h3>
  <div class="son-k"><div><span>असली फोटो लगी</span><b>${A-M.length}</b></div><div><span>बाकी</span><b style="color:${M.length?"var(--chili)":"var(--leaf)"}">${M.length}</b></div><div><span>सब फोटो का भार</span><b>${kb<1024?Math.round(kb)+" KB":(kb/1024).toFixed(1)+" MB"}</b></div></div>
  <p class="note" style="margin:0">एक बार में कितने सामान का प्रॉम्प्ट बनाएँ? (जिनका कभी नहीं माँगा, वे पहले)</p>
  <div class="row2" style="margin:0;grid-template-columns:repeat(3,1fr)">${[10,15,20].map(n=>`<button class="big ghost" data-sphb="${n}" ${M.length?"":"disabled"}>📋 ${n}</button>`).join("")}</div>
  <button class="big" data-sphin>📥 ZIP / फोटो डालें</button><input type="file" id="sphFile" accept="image/*,.zip,application/zip,.html,.htm" multiple hidden>
  <p class="note" style="margin:0">हर फोटो अपने-आप साफ़ कटकर ≤20 KB की बनती है। दुकान में खींची फोटो के लिए: सामान की पंक्ति खोलकर फोटो पर टैप करें।</p></div>`};
document.addEventListener("click",e=>{const t=e.target;let b;
  if((b=t.closest("[data-sphb]"))){SPH.batch(+b.dataset.sphb);return}
  if(t.closest("[data-sphin]")){const f=document.getElementById("sphFile");if(f){f.value="";f.click()}}});
document.addEventListener("change",e=>{if(e.target.id==="sphFile"&&e.target.files&&e.target.files.length){toast("📥 फोटो लग रही हैं…");SPH.importFiles([...e.target.files])}});
})();
