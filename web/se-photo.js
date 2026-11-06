/* 177 MH कैंटीन — 📸 असली फोटो (se-photo.js, window.SPH) · नियम: docs/खाता-और-फोटो-प्रॉम्प्ट.txt
   • हर फोटो अपने-आप: खाली किनारा काटो → चौकोर, सफ़ेद पृष्ठभूमि → 320px → JPEG ≤ 20 KB (HD भी) — ऐप कभी भारी नहीं
   • ⚙️ "📸 असली फोटो": कितनी बाकी · 10/15/20 सामान का तैयार प्रॉम्प्ट एक टैप में कॉपी (ChatGPT/Gemini) · ZIP या कई फोटो एक साथ डालें
   • फाइल का नाम → सामान: id → 4 अंक कोड → बारकोड → नाम */
(function(){
"use strict";
const SPH=window.SPH={};
const MAXB=20*1024,SIDE=320;
try{const st=document.createElement("style");st.textContent=`.sphg{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin-top:8px}
.sphc{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px;border:2px solid var(--line,#e5e7eb);border-radius:12px;background:#fff;font:600 10.5px/1.15 inherit;color:var(--ink,#222);text-align:center}
.sphc img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:8px;background:#fff}.sphc.bad{border-color:var(--chili,#dc2626);box-shadow:0 0 0 2px #fee2e2}
.sphc i{position:absolute;top:4px;left:4px;font-style:normal;background:var(--chili,#dc2626);color:#fff;border-radius:8px;padding:1px 5px;font-size:10px}
#sphCard .son-k{grid-template-columns:repeat(4,1fr)}`;document.head.appendChild(st)}catch(e){}
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
const pub=i=>i.active!==false&&!i.virtual&&!(typeof isTob==="function"&&isTob(i));
SPH.missing=()=>S.items.filter(i=>pub(i)&&!i.photo);
/* 🔍 फोटो की जाँच: धुंधली / अंधेरी / खाली — छोटे canvas पर (तेज़), नतीजा इसी फोन में याद (sph_q) */
const QK="sph_q",qGet=()=>{try{return JSON.parse(LSx.get(QK)||"{}")}catch(e){return {}}};
SPH.LIMIT=150;/* इससे कम तेज़ी = धुंधली */
SPH.score=async function(url){const im=await loadImg(url),N=128,c=document.createElement("canvas");c.width=c.height=N;const x=c.getContext("2d",{willReadFrequently:true});
  x.fillStyle="#fff";x.fillRect(0,0,N,N);x.drawImage(im,0,0,N,N);const d=x.getImageData(0,0,N,N).data,g=new Float32Array(N*N);let lum=0;
  for(let i=0;i<N*N;i++){g[i]=d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114;lum+=g[i]}lum/=N*N;
  let n=0,m=0,m2=0,cont=0;for(let y=1;y<N-1;y++)for(let X=1;X<N-1;X++){const i=y*N+X;if(g[i]>245&&g[i-1]>245&&g[i+1]>245)continue;cont++;
    const L=4*g[i]-g[i-1]-g[i+1]-g[i-N]-g[i+N];n++;m+=L;m2+=L*L}
  const sharp=n?Math.round(m2/n-(m/n)*(m/n)):0,fill=cont/((N-2)*(N-2));
  const why=fill<.03?"खाली":lum<55?"अंधेरी":sharp<SPH.LIMIT?"धुंधली":(im.width<120?"बहुत छोटी":"");return {sharp,fill:Math.round(fill*100),lum:Math.round(lum),why}};
SPH.isBad=i=>!!i.photo&&!i.photoOk&&(!!i.photoBad||!!((qGet()[i.id]||{}).why));
SPH.isShop=i=>!!i.photo&&i.photoSrc==="shop"&&!i.photoOk&&!["mithai","fast"].includes(i.cat);/* पैकेट वाला सामान, फोटो दुकान में खींची — असली पैकेट फोटो से बदलो */
/* जिनकी असली फोटो चाहिए: ① फोटो नहीं ② खराब/धुंधली ③ दुकान में खींची (पैकेट) */
SPH.need=()=>{const A=S.items.filter(pub),r=[];A.forEach(i=>{if(!i.photo)r.push({i,w:0});else if(SPH.isBad(i))r.push({i,w:1});else if(SPH.isShop(i))r.push({i,w:2})});return r};
SPH.scan=async function(){const A=S.items.filter(i=>pub(i)&&i.photo&&SE.photos&&SE.photos[i.id]),q=qGet();let k=0,bad=0;
  for(const i of A){const u=SE.photos[i.id];const v=String(u).length;if(!(q[i.id]&&q[i.id].v===v)){try{const r=await SPH.score(u);q[i.id]={v,why:r.why,s:r.sharp}}catch(e){}}
    if(q[i.id]&&q[i.id].why)bad++;if(++k%25===0){toast(`🔍 ${k}/${A.length} जाँची…`);await new Promise(r=>setTimeout(r,0))}}
  LSx.set(QK,JSON.stringify(q));return {n:A.length,bad}};
async function mark(id,p){const it=item(id);if(!it)return;Object.assign(it,p);if(!S.demo&&S.db)try{await S.db.doc("items/"+id).update(p)}catch(e){toast("सेव नहीं हुआ")}}
SPH.prompt=function(L){const shop="177 MH Canteen, Barmer (India)";
  const rows=L.map((i,k)=>{const br=i.brand?` | brand: ${i.brand}`:"";const bc=String(i.barcode||"").split(",")[0].trim();
    const why=i.photo?(SPH.isBad(i)?" | NOTE: our current photo is blurry/bad — replace it":" | NOTE: our current photo is a shop snapshot — need the original pack photo"):"";
    return `${k+1}. file: ${i.id}.jpg${why} | product: ${SE.capNm(i.name)}${br}${i.size?` | size: ${i.size}`:""}${bc?` | barcode (EAN): ${bc}`:""}${+i.mrp?` | MRP ₹${i.mrp}`:""}${i.hi?` | Hindi: ${i.hi}`:""} | type: ${["mithai","fast"].includes(i.cat)?"loose food (sweet/snack) made in our shop":"packaged product"}`}).join("\n");
  return `You are helping ${shop} put REAL product photos in its billing & online-order app.

For each item below, find the ORIGINAL photo of exactly that product — same brand, same variant/flavour, same pack size — like the main image on Amazon, Flipkart, BigBasket, Blinkit or the brand's official website. Search the web using the barcode and the product name.

Rules:
1. Real photo of the real pack only. Never invent, redraw or AI-generate a branded pack. If you cannot find the exact product, skip it and list it under "NOT FOUND".
2. Front of the pack, whole pack visible, plain white background, no watermark, no price stickers, no hands, no extra items.
3. Square image, at least 600 x 600 px, JPG.
4. Name each file EXACTLY as given ("file:" value), e.g. ${L[0]?L[0].id:"item-id"}.jpg — this is how the app matches the photo.
5. For "loose food (sweet/snack) made in our shop" there is no brand pack: create one realistic, appetising photo of that Indian sweet/snack (top view, on a plain white plate, plain white background, natural light, no text) and name it the same way.
6. Put all images in ONE ZIP file and give me the download. Also give a short list: FOUND / GENERATED / NOT FOUND.
7. Work fast: first collect all the photos you can find quickly and give the ZIP; do not spend long on one item. If one is hard, mark it NOT FOUND and move on — I will ask again later.

Items (${L.length}):
${rows}`};
SPH.copy=async function(t){try{await navigator.clipboard.writeText(t);return true}catch(e){}
  try{const a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();const ok=document.execCommand("copy");a.remove();return ok}catch(e){return false}};
SPH.batch=async function(n){const asked=JSON.parse(LSx.get("sph_ask")||"{}"),now=Date.now();
  const M=SPH.need().sort((a,b)=>a.w-b.w||(asked[a.i.id]||0)-(asked[b.i.id]||0)||((+b.i.mrp>0)-(+a.i.mrp>0))).map(x=>x.i);/* बिना फोटो → खराब → दुकान वाली; जो कभी नहीं माँगे, वे पहले */
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
    try{const tag=await SPH.save(it.id,j.blob);const p={photo:tag,photoBad:0,photoOk:0,photoSrc:"web"};Object.assign(it,p);if(!S.demo&&(SE.db||S.db))try{await (SE.db||S.db).doc("items/"+it.id).update(p)}catch(e){}ok++;
    const q=qGet();delete q[it.id];LSx.set(QK,JSON.stringify(q));if(ok%5===0)toast(`📸 ${ok}/${tot} लग गईं…`)}catch(e){miss.push(j.name.split("/").pop())}}
  try{renderSettings();if(S.tab==="bill")renderBill()}catch(e){}if(window.SON&&SON.publishPhotos)SON.publishPhotos(true);
  toast(`✓ ${ok} असली फोटो लगीं (हर एक ≤20 KB)${miss.length?` · ${miss.length} का सामान नहीं मिला: ${miss.slice(0,4).join(", ")}${miss.length>4?"…":""}`:""}`);return {ok,miss}};

/* ---------- ⚙️ कार्ड ---------- */
SPH.settingsHTML=function(){if(!S.isOwner&&!S.demo)return "";const N=SPH.need(),A=S.items.filter(pub).length,kb=Object.values(SE.photos||{}).reduce((a,u)=>a+String(u).length*.75,0)/1024;
  const c=[0,1,2].map(w=>N.filter(x=>x.w===w).length);
  return `<div class="card2 sph" id="sphCard"><h3>📸 असली फोटो (Amazon/Blinkit जैसा भरोसा)</h3>
  <div class="son-k"><div><span>अच्छी फोटो</span><b style="color:var(--leaf)">${A-N.length}</b></div><div><span>फोटो नहीं</span><b style="color:${c[0]?"var(--chili)":"var(--leaf)"}">${c[0]}</b></div><div><span>धुंधली/खराब</span><b style="color:${c[1]?"var(--chili)":"var(--leaf)"}">${c[1]}</b></div><div><span>दुकान वाली</span><b>${c[2]}</b></div></div>
  <p class="note" style="margin:0">सब ${N.length} की सूची अपने-आप बनती है — फोटो लगते ही सामान सूची से हट जाता है। एक बार में कितने का प्रॉम्प्ट? (पहले बिना फोटो, फिर धुंधली) · भार ${kb<1024?Math.round(kb)+" KB":(kb/1024).toFixed(1)+" MB"}</p>
  <div class="row2" style="margin:0;grid-template-columns:repeat(3,1fr)">${[10,15,20].map(n=>`<button class="big ghost" data-sphb="${n}" ${N.length?"":"disabled"}>📋 ${n}</button>`).join("")}</div>
  <button class="big" data-sphin>📥 ZIP / फोटो डालें</button><input type="file" id="sphFile" accept="image/*,.zip,application/zip,.html,.htm" multiple hidden>
  <div class="row2" style="margin:0"><button class="big ghost" data-sphscan>🔍 धुंधली फोटो ढूँढें</button><button class="big ghost" data-sphview>👀 फोटो देखें</button></div>
  <button class="big ghost" data-sphfix>📝 AI का सुधार चिपकाएँ (नाम/हिंदी/ब्रांड)</button>
  <p class="note" style="margin:0">हर फोटो अपने-आप साफ़ कटकर ≤20 KB की बनती है। खराब फोटो पर "👀 फोटो देखें" में टैप करें — वह सूची में आ जाएगी।</p></div>`};
/* 👀 सब फोटो एक जाली में — टैप: 🔁 बदलवानी है ⇄ ✓ ठीक है */
SPH.view=function(f){f=f||"all";const q=qGet(),A=S.items.filter(i=>pub(i)&&i.photo&&SE.photos&&SE.photos[i.id]);
  const L=f==="bad"?A.filter(SPH.isBad):A;
  $("#sheet").innerHTML=`<div class="qscrim" data-close></div><div class="qpop" style="top:56px;max-height:84vh;overflow:auto" role="dialog" aria-label="फोटो देखें">
    <div class="sl-ah"><b>👀 ${L.length} फोटो</b><span></span><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <div class="row2" style="margin:0"><button class="big ${f==="all"?"":"ghost"}" data-sphvf="all">सब</button><button class="big ${f==="bad"?"":"ghost"}" data-sphvf="bad">🔁 खराब (${A.filter(SPH.isBad).length})</button></div>
    <p class="note" style="margin:0">फोटो पर टैप करें: लाल = बदलवानी है (अगले प्रॉम्प्ट में आएगी), फिर टैप = ठीक है।</p>
    <div class="sphg">${L.map(i=>{const b=SPH.isBad(i),w=(q[i.id]||{}).why||"";return `<button type="button" class="sphc ${b?"bad":""}" data-sphmk="${esc(i.id)}"><img src="${SE.photos[i.id]}" alt="" loading="lazy"><span>${esc(SE.capNm(i.short||i.name).slice(0,18))}</span>${b?`<i>🔁 ${esc(i.photoBad?"बदलो":w)}</i>`:""}</button>`}).join("")||'<p class="note">कोई फोटो नहीं</p>'}</div></div>`;
  $("#sheet").onclick=async e=>{if(e.target.closest("[data-close]")){closeSheet();try{renderSettings()}catch(x){}return}const v=e.target.closest("[data-sphvf]");if(v){SPH.view(v.dataset.sphvf);return}
    const m=e.target.closest("[data-sphmk]");if(m){const it=item(m.dataset.sphmk);if(!it)return;await mark(it.id,SPH.isBad(it)?{photoBad:0,photoOk:1}:{photoBad:1,photoOk:0});SPH.view(f)}}};
/* 📝 STEP 2 का सुधार: {"app":"mh177","mode":"fix","items":[{"barcode"|"id","name","hi","brand","size",...}]} — सिर्फ़ नाम-जानकारी, स्टॉक/भाव नहीं */
SPH.fix=function(t){let s=String(t||"");const f=s.match(/```(?:json)?\s*([\s\S]*?)```/);if(f)s=f[1];const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a<0||b<a)throw new Error("{ } नहीं मिला");
  const j=JSON.parse(s.slice(a,b+1).replace(/[“”]/g,'"'));const R=Array.isArray(j)?j:j.items;if(!Array.isArray(R))throw new Error("items नहीं मिले");const out=[];
  for(const r of R){const it=(r.id&&item(r.id))||(r.barcode&&SPH.match(String(r.barcode).replace(/\D/g,"")))||(r.code&&SPH.match(String(r.code)))||(r.old&&SPH.match(r.old))||null;if(!it){out.push({r,it:null});continue}
    const p={};const cap=v=>SE.capNm(String(v).trim());
    if(r.name&&cap(r.name)!==it.name)p.name=cap(r.name).slice(0,40);if(r.short)p.short=cap(r.short).slice(0,24);else if(p.name&&p.name.length>24&&!it.short)p.short=p.name.slice(0,24);
    if(r.hi&&r.hi!==it.hi)p.hi=String(r.hi).slice(0,40);if(r.brand&&cap(r.brand)!==it.brand)p.brand=cap(r.brand).slice(0,30);if(r.size&&r.size!==it.size)p.size=String(r.size).slice(0,16);
    if(r.emoji&&!it.emoji)p.emoji=String(r.emoji).slice(0,4);if(+r.mrp>0&&!(+it.mrp))p.mrp=+r.mrp;/* भाव कभी नहीं बदलता — सिर्फ़ खाली MRP भरता है */
    out.push({r,it,p})}return out};
SPH.fixSheet=function(){$("#sheet").innerHTML=`<div class="qscrim" data-close></div><div class="qpop" style="top:70px;max-height:80vh;overflow:auto" role="dialog" aria-label="AI का सुधार">
    <div class="sl-ah"><b>📝 AI का सुधार (STEP 2)</b><span></span><button class="x" data-close aria-label="बंद करें">✕</button></div>
    <p class="note" style="margin:0">AI ने जो "mode":"fix" वाला जवाब दिया, पूरा यहाँ चिपकाएँ। सिर्फ़ नाम, हिंदी नाम, ब्रांड, साइज़ ठीक होंगे — स्टॉक और भाव वैसे ही रहेंगे।</p>
    <textarea class="inp" id="sphFixT" rows="8" placeholder='{"app":"mh177","mode":"fix","items":[...]}' style="font:12px monospace"></textarea><div id="sphFixR"></div>
    <button class="big" data-sphfixgo>🔍 जाँचें</button></div>`;
  let P=null;$("#sheet").onclick=async e=>{if(e.target.closest("[data-close]")){closeSheet();return}const g=e.target.closest("[data-sphfixgo]");if(!g)return;
    if(!P){try{P=SPH.fix($("#sphFixT").value)}catch(x){toast("जवाब समझ नहीं आया: "+x.message);return}const ch=P.filter(x=>x.it&&Object.keys(x.p).length),nf=P.filter(x=>!x.it);
      $("#sphFixR").innerHTML=`<div class="list">${ch.map(x=>`<div class="li"><div class="mid"><b>${esc(x.it.name)}</b><span>${Object.entries(x.p).map(([k,v])=>esc(k+": "+v)).join(" · ")}</span></div></div>`).join("")}</div>${nf.length?`<p class="note">⚠ ${nf.length} का सामान नहीं मिला: ${esc(nf.slice(0,4).map(x=>x.r.barcode||x.r.name||"?").join(", "))}</p>`:""}`;
      g.textContent=ch.length?`✓ ${ch.length} सामान ठीक करें`:"कुछ बदलना नहीं";if(!ch.length)P=null;return}
    g.disabled=true;let n=0;for(const x of P)if(x.it&&Object.keys(x.p).length){await mark(x.it.id,x.p);n++}closeSheet();try{renderSettings()}catch(x){}toast(`✓ ${n} सामान की जानकारी ठीक हुई`)}};
document.addEventListener("click",e=>{const t=e.target;let b;
  if((b=t.closest("[data-sphb]"))){SPH.batch(+b.dataset.sphb);return}
  if((b=t.closest("[data-sphscan]"))){b.disabled=true;b.textContent="⏳ जाँच रहे हैं…";SPH.scan().then(r=>{toast(`🔍 ${r.n} फोटो जाँची · ${r.bad} धुंधली/खराब`);try{renderSettings()}catch(e){}});return}
  if(t.closest("[data-sphview]")){SPH.view("all");return}
  if(t.closest("[data-sphfix]")){SPH.fixSheet();return}
  if(t.closest("[data-sphin]")){const f=document.getElementById("sphFile");if(f){f.value="";f.click()}}});
document.addEventListener("change",e=>{if(e.target.id==="sphFile"&&e.target.files&&e.target.files.length){toast("📥 फोटो लग रही हैं…");SPH.importFiles([...e.target.files])}});
})();
