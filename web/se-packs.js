/* 📦 SPK — GitHub से सामान की खेपें (5000 सामान, फोटो, रैक, गिनती) अपने-आप ऐप में
   • खेपें: (Pages) data/items/index.json → data/items/<खेप>.json  (ढाँचा: docs/सामान-चढ़ाना-प्रॉम्प्ट.txt, "mh177-pack" v5)
   • फोटो: (Pages) p/<id>.jpg?v=<ph> — OTA ज़िप में नहीं, हर फोन सिर्फ़ दिखने वाली फोटो लेता है (SE.photoSrc)
   • सिर्फ़ मालिक के फोन पर चलता है; हर खेप एक बार (settings/packs.done)। पुराना कुछ नहीं मिटता:
     नया सामान जुड़ता है, पहले से मौजूद में सिर्फ़ खाली खाने भरते हैं।
   • गिनती स्टॉक नहीं बनती — openings/cnt_<id> में रुकती है; "▶ बिलिंग चालू / गिनती को स्टॉक बनाओ" दबाने पर ही pstock + stockLog। */
(function(){
"use strict";
const SPK=window.SPK={};
const own=()=>typeof S!=="undefined"&&S&&S.isOwner&&!S.demo&&S.db;
const base=()=>{const u=(window.SE&&SE.cfg&&SE.cfg.updateUrl)||"";return (window.SE&&SE.isNative&&u)?u.replace(/\/?$/,"/"):""};
SPK.url=p=>base()+p;
const empty=v=>v==null||v===""||v===0||v==="0";
const FILL=["mfr","ctn","rack","mrp","sale","cost","barcode","ph","hi","brand","size","alias","emoji","sub","secret","perPack","packOf","unit"];
const PRICE=["mrp","sale","cost"];
const say=m=>{try{toast(m)}catch(e){}};
/* कोड: index.html का nextCode (4 अंक, किस्म-वार) — यह सिर्फ़ बचाव */
function nextPkCode(){return String(Math.max(10000,...(S.items||[]).map(i=>+i.code||0).filter(c=>c>=10000))+1)}
function match(x){
  let it=(S.items||[]).find(i=>i.id===x.id);if(it)return it;
  if(x.barcode&&typeof findByCode==="function"){it=findByCode(String(x.barcode));if(it)return it}
  return null}
/* एक सामान: नया बनाओ या खाली खाने भरो */
async function one(x,pk,R){
  if(!x||!x.id||!x.name){R.bad++;return}
  const name=window.SE&&SE.capNm?SE.capNm(x.name):String(x.name).toUpperCase();
  const ex=match(x),ts=Date.now();
  if(!ex){
    const d={name,short:String(x.short?SE.capNm(x.short):name).slice(0,24),hi:x.hi||"",brand:x.brand||"",size:x.size||"",alias:x.alias||"",
      emoji:x.emoji||(x.sub==="tob"?"🚬":"🛒"),cat:x.cat||"kirana",sub:x.sub||"",unit:x.unit||"pc",
      code:String(x.code&&!(S.items||[]).some(i=>String(i.code)===String(x.code))?x.code:(typeof nextCode==="function"?nextCode(x.cat||"kirana"):nextPkCode())),barcode:String(x.barcode||""),mrp:+x.mrp||0,sale:+x.sale||+x.mrp||0,cost:+x.cost||0,
      perPack:+x.perPack||0,...(x.packOf?{packOf:x.packOf}:{}),track:x.track!=null?!!x.track:!x.packOf,min:+x.min||(x.packOf?0:2),
      rack:x.rack||"",secret:x.secret||"",ph:x.ph||"",...(x.mfr?{mfr:x.mfr}:{}),...(+x.ctn>1?{ctn:+x.ctn}:{}),hue:Math.floor(Math.random()*360),active:true,
      order:(S.items||[]).length+1,src:"pack:"+pk,addedTs:ts,addedBy:S.uid||""};
    if(!d.barcode&&typeof ean13==="function")d.barcode=ean13(("200000"+d.code.padStart(5,"0")).slice(0,11)+"0");
    await S.db.collection("items").doc(x.id).set(d);S.items.push({id:x.id,...d});R.add++;x._id=x.id;if(!x.barcode&&!x.packOf)R.lbl++}
  else{
    const p={};for(const k of FILL){const v=x[k];if(v==null||v==="")continue;if(empty(ex[k])&&!empty(v))p[k]=k==="perPack"||PRICE.includes(k)?+v:v}
    if(Object.keys(p).length){await S.db.collection("items").doc(ex.id).set(p,{merge:true});
      for(const k of PRICE)if(k in p&&typeof logPrice==="function")logPrice(ex.id,k,ex[k]||0,p[k]);
      Object.assign(ex,p);R.fill++}else R.same++;x._id=ex.id}
  /* गिनती → सिर्फ़ ओपनिंग गिनती (स्टॉक नहीं) */
  const o=x.open;if(o&&o.qty!=null&&o.qty!==""){
    await S.db.collection("openings").doc("cnt_"+x._id).set({kind:"count",itemId:x._id,qty:+o.qty||0,exp:o.exp||"",batchNo:o.batchNo||"",rack:x.rack||"",pack:pk,ts,by:S.uid||"",done:false},{merge:true});R.cnt++}}
/* 🏭 कंपनी (निर्माता/वितरक) — सीधा कंपनी से मंगाने के लिए। suppliers/<id> kind:"company"; पहले से हो तो सिर्फ़ खाली खाने भरो */
const CF=["name","phone","care","email","web","addr","city","fssai","gst","brands","dist","note"];
async function company(c,pk,R){
  if(!c||!c.id||!c.name||!/^c-[a-z0-9-]{2,40}$/.test(c.id)){R.bad++;return}
  const ex=(S.suppliers||[]).find(s=>s.id===c.id);const p={};
  for(const k of CF){const v=c[k];if(v==null||v===""||(Array.isArray(v)&&!v.length))continue;if(!ex||empty(ex[k]))p[k]=k==="phone"?String(v).replace(/\D/g,"").slice(-10):v}
  if(!ex)Object.assign(p,{kind:"company",src:"pack:"+pk,lastTs:0,addedTs:Date.now()});
  if(!Object.keys(p).length)return;
  await S.db.collection("suppliers").doc(c.id).set(p,{merge:true});
  if(ex)Object.assign(ex,p);else S.suppliers&&S.suppliers.push({id:c.id,...p});R.co++}
/* सारी नई खेपें */
SPK.apply=async function(force){
  if(!own()||SPK._busy)return null;SPK._busy=1;const out={packs:0,add:0,fill:0,same:0,cnt:0,co:0,lbl:0,bad:0};
  try{
    const r=await fetch(SPK.url("data/items/index.json")+"?t="+Date.now(),{cache:"no-store"});if(!r.ok)return null;
    const idx=await r.json();if(idx&&!SE.orgOk(idx.org)){say(SE.orgErr(idx.org));return null}const list=(idx&&idx.packs)||[];if(!list.length)return out;
    const ref=S.db.collection("settings").doc("packs");const g=await ref.get();const done=(g.exists&&g.data().done)||{};
    for(const P of list){if(!P||!P.id||(done[P.id]&&!force))continue;
      const rr=await fetch(SPK.url("data/items/"+P.id+".json")+"?v="+encodeURIComponent(P.sha||""),{cache:"no-store"});if(!rr.ok)continue;
      const pk=await rr.json();if(!pk||pk.app!=="mh177-pack"||!Array.isArray(pk.items))continue;
      if(!SE.orgOk(pk.org)){say(SE.orgErr(pk.org)+" (खेप "+P.id+")");continue}
      const R={add:0,fill:0,same:0,cnt:0,co:0,lbl:0,bad:0};
      for(const c of (Array.isArray(pk.companies)?pk.companies:[]))try{await company(c,P.id,R)}catch(e){R.bad++}
      /* पहले पीस वाले, फिर पैकेट (packOf को पीस मिल जाए) */
      const L=[...pk.items].sort((a,b)=>(a.packOf?1:0)-(b.packOf?1:0));
      for(const x of L)try{await one(x,P.id,R)}catch(e){R.bad++}
      await ref.set({done:{[P.id]:{ts:Date.now(),by:S.uid||"",n:L.length,...R}}},{merge:true});
      out.packs++;for(const k in R)out[k]+=R[k]}
    if(out.packs){try{typeof setSoon==="function"&&setSoon()}catch(e){}
      say(`📦 ${out.packs} खेप: ${out.add} नए सामान, ${out.fill} में भाव/रैक/फोटो भरे${out.cnt?`, ${out.cnt} की गिनती (अभी स्टॉक नहीं)`:""}${out.co?`, 🏭 ${out.co} कंपनी`:""}${out.lbl?` · 🏷️ ${out.lbl} का अपना बारकोड तैयार — "बारकोड पहरा" में रैक चुनकर छापें`:""}${out.bad?` · ⚠ ${out.bad} अधूरे`:""}`)}
    return out}
  catch(e){return null}finally{SPK._busy=0}};
/* ▶ बिलिंग चालू / गिनती को स्टॉक बनाओ */
SPK.counts=async function(){if(!own())return [];const s=await S.db.collection("openings").where("kind","==","count").get();return s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.done&&item(x.itemId))};
SPK.goLive=async function(){
  if(!own())return 0;const L=await SPK.counts();const ts=Date.now(),nm=typeof biller==="function"?biller():"";let n=0;
  for(const c of L){const old=+((S.pstock||{})[c.itemId]||{}).qty||0,q=+c.qty||0;
    try{await S.db.collection("pstock").doc(c.itemId).set({qty:q,ts,by:S.uid||"",byName:nm,last:"▶ ओपनिंग गिनती"},{merge:true});
      S.db.collection("stockLog").doc("o"+ts.toString(36)+n).set({itemId:c.itemId,d:q-old,why:"▶ ओपनिंग गिनती ("+(c.pack||"")+") · पहले "+old,ts,date:today(),by:S.uid||"",byName:nm}).catch(()=>{});
      await S.db.collection("openings").doc(c.id).update({done:true,doneTs:ts});
      S.pstock[c.itemId]={...(S.pstock[c.itemId]||{}),qty:q,ts};n++}catch(e){}}
  const st=S.settings||{};if(!st.live){try{await S.db.collection("settings").doc("main").set({live:{ts,by:S.uid||"",byName:nm}},{merge:true});st.live={ts}}catch(e){}}
  return n};
SPK.html=()=>{if(!own())return "";const live=(S.settings||{}).live;
  return `<div class="card2" id="spkCard"><h3 style="margin:0 0 4px">📦 GitHub से सामान ${live?"· ✅ बिलिंग चालू":"· ⏸ बिलिंग अभी बंद"}</h3>
  <p class="note" style="margin:0 0 8px">Claude जो सामान (फोटो, भाव, रैक) GitHub में रखता है, वह "ऐप अपडेट करें" पर अपने-आप आता है। गिनती तब तक स्टॉक नहीं बनती जब तक आप नीचे पक्का न करें।</p>
  <div id="spkInfo" class="note">⏳ देख रहे हैं…</div>
  <button type="button" class="big ghost" data-spkapply style="margin-top:6px">🔄 अभी नई खेपें लाओ</button>
  <input class="inp" id="spkConf" placeholder='गिनती को स्टॉक बनाने के लिए लिखें: चालू' autocomplete="off" style="margin-top:8px">
  <button type="button" class="big" data-spklive style="margin-top:6px">▶ ${live?"नई गिनती को स्टॉक बनाओ":"बिलिंग चालू — गिनती को स्टॉक बनाओ"}</button></div>`};
SPK.info=async function(){const el=document.getElementById("spkInfo");if(!el||!own())return;
  try{const g=await S.db.collection("settings").doc("packs").get();const d=(g.exists&&g.data().done)||{};const ks=Object.keys(d).sort();
    const nItems=(S.items||[]).filter(i=>String(i.src||"").startsWith("pack:")).length;const L=await SPK.counts();
    el.innerHTML=`खेपें चढ़ीं: <b>${ks.length}</b>${ks.length?` (आख़िरी ${ks[ks.length-1]})`:""} · GitHub वाले सामान: <b>${nItems}</b> · स्टॉक बनने को बाकी गिनती: <b>${L.length}</b>`}catch(e){el.textContent="—"}};
document.addEventListener("click",async e=>{
  if(e.target.closest("[data-spkapply]")){const b=e.target.closest("[data-spkapply]");b.disabled=true;const r=await SPK.apply();b.disabled=false;if(r&&!r.packs)say("✅ कोई नई खेप नहीं");SPK.info();return}
  const g=e.target.closest("[data-spklive]");if(!g||!own())return;const c=document.getElementById("spkConf");if(!c||c.value.trim()!=="चालू"){say('ऊपर "चालू" लिखें, फिर दबाएँ');return}
  g.disabled=true;const n=await SPK.goLive();g.disabled=false;c.value="";say("▶ "+n+" सामान की गिनती स्टॉक बनी — हर बदलाव स्टॉक-हिसाब में");SPK.info()});
})();
