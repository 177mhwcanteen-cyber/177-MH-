/* 177 MH — 🔍 खरीद-जाँच (window.SKJ) — पक्का नियम: docs/खरीद-बही-प्रॉम्प्ट.txt · जाँच: tests/kharid.py
   विक्रम जी के भेजे असली खरीद-बिल Claude "खरीद-बही" आर्टिफैक्ट में चढ़ाता है। वहाँ से कोड (mh177-kharid) कॉपी करके यहाँ चिपकाओ →
   ऐप हर बिल को साथियों की चढ़ाई खरीद (purchases + mbuys) से मिलाता है: ✅ चढ़ा · ⚠ रकम/भाव अलग · ❌ नहीं चढ़ा।
   सिर्फ़ मालिक। बिल की नकल इसी फोन में (localStorage skj_b) — Firestore/GitHub में कुछ नहीं जाता, पुराना कुछ नहीं बदलता। */
(()=>{
const SKJ=window.SKJ={};
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const own=()=>!!(S.isOwner||S.demo);
const W=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9ऀ-ॿ]+/g," ").trim();
const words=s=>W(s).split(" ").filter(w=>w.length>=3);
/* नाम मिलान: साझा शब्द (3+ अक्षर) / कम वाले शब्द — "PAPER PLATE 8 INCH" ~ "PAPER PLATE 8IN" */
SKJ.sim=(a,b)=>{const A=words(a),B=new Set(words(b));if(!A.length||!B.size)return 0;const n=A.filter(w=>B.has(w)||[...B].some(x=>x.startsWith(w.slice(0,4))&&w.length>=4)).length;return n/Math.min(A.length,B.size)};
const dd=(a,b)=>Math.abs((new Date(a+"T12:00:00")-new Date(b+"T12:00:00"))/864e5);
SKJ.parse=function(t){t=String(t||"");const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a<0)throw new Error("कोड में { } नहीं");const j=JSON.parse(t.slice(a,b+1));
  if(j.app!=="mh177-kharid"||!Array.isArray(j.bills))throw new Error("यह खरीद-बही का कोड नहीं");if(!SE.orgOk(j.org))throw new Error(SE.orgErr(j.org));return j.bills};
const LN=l=>({id:l.id||"",name:l.name||"",qty:+l.qty||0,rate:+l.rate||0,amt:+l.amt||+l.billAmt||0,...(l.unit?{u:l.unit}:{}),...(l.ctn?{ctn:l.ctn}:{}),...(l.exp?{exp:l.exp}:{})});
const XT=p=>({ts:+p.ts||0,...(p.noStock?{noStock:1}:{}),...(p.supPhone?{ph:p.supPhone}:{}),...(p.paid!=null?{paid:+p.paid||0}:{}),...(p.pay?{pay:p.pay}:{}),...(p.late?{late:1}:{}),phn:(p.photos||[]).length+(+p.photoPending||0)});
SKJ.appBuys=(f,t)=>appBuys(f,t);
async function appBuys(from,to){const L=[];const seen=new Set();const add=(x,k)=>{if(!x||seen.has(k+x.id))return;seen.add(k+x.id);L.push(x)};
  [...(S.purchHist||[]),...(S.purch||[])].forEach(p=>add({id:p.id,kind:"खरीद",date:p.date,sup:p.supName||"",total:+p.total||+p.gross||0,by:p.byName||"",lines:(p.lines||[]).map(LN),cancelled:!!p.cancelled,note:p.note||"",...XT(p)},"p"));
  if(!S.demo&&S.db){try{const q=await S.db.collection("purchases").where("date",">=",from).get();q.docs.forEach(d=>{const p=d.data();add({id:d.id,kind:"खरीद",date:p.date,sup:p.supName||"",total:+p.total||0,by:p.byName||"",lines:(p.lines||[]).map(LN),cancelled:!!p.cancelled,note:p.note||"",...XT(p)},"p")})}catch(e){}
    try{const q=await S.db.collection("mbuys").where("date",">=",from).get();q.docs.forEach(d=>{const m=d.data();add({id:d.id,kind:"बाज़ार",date:m.date,sup:m.shop||"",total:+m.total||0,by:m.byName||"",lines:(m.lines||[]).map(LN),cancelled:m.status==="cancel",note:(m.bill||"")+" "+(m.note||""),...XT(m)},"m")})}catch(e){}}
  (SKJ._demo||[]).forEach(x=>add(x,"d"));return L.filter(x=>!x.cancelled&&x.date>=from&&x.date<=to)}
/* हर बिल का सबसे अच्छा मिलान: तारीख ±4 दिन, फिर कुल रकम / दुकान का नाम / सामान के नाम */
SKJ.check=async function(bills){bills=(bills||[]).filter(b=>b&&b.date);if(!bills.length)return [];const ds=bills.map(b=>b.date).sort();
  const from=new Date(new Date(ds[0]+"T12:00:00")-4*864e5).toISOString().slice(0,10),to=new Date(new Date(ds[ds.length-1]+"T12:00:00")+4*864e5).toISOString().slice(0,10);
  const A=await appBuys(from,to),used=new Set();
  return bills.map(b=>{let best=null;A.forEach(x=>{if(used.has(x.id))return;const d=dd(x.date,b.date);if(d>4)return;
      const amt=Math.abs(x.total-b.total)<=Math.max(2,b.total*0.003),near=Math.abs(x.total-b.total)<=b.total*0.15,sup=SKJ.sim(b.sup,x.sup)>=0.5||(b.no&&x.note.includes(String(b.no)));
      const ln=(b.lines||[]).filter(l=>x.lines.some(y=>SKJ.sim(l.nm,y.name)>=0.6)).length/Math.max(1,(b.lines||[]).length);
      const sc=(amt?5:near?1.5:0)+(sup?2:0)+ln*3-d*0.3;if(sc>=3&&(!best||sc>best.sc))best={x,sc,amt,ln}});
    if(best)used.add(best.x.id);
    /* पंक्ति-वार: ऐप में कौन-सी लाइन, भाव, सामान का खरीद भाव */
    const rows=(b.lines||[]).map(l=>{const y=best?best.x.lines.map(z=>({z,s:SKJ.sim(l.nm,z.name)})).filter(o=>o.s>=0.6).sort((p,q)=>q.s-p.s)[0]:null;
      const it=(y&&y.z.id&&typeof item==="function"&&item(y.z.id))||(typeof S!=="undefined"?(S.items||[]).find(i=>i.active!==false&&SKJ.sim(l.nm,i.short||i.name)>=0.8):null);
      const r={nm:l.nm,qty:l.qty,u:l.u,rate:l.rate,uc:l.uc,app:y?y.z:null,it:it||null,warn:[]};
      if(best&&!y)r.warn.push("ऐप की खरीद में यह सामान नहीं");
      if(y&&y.z.rate&&Math.abs(y.z.rate-l.rate)>Math.max(0.5,l.rate*0.01))r.warn.push(`ऐप में भाव ₹${y.z.rate}, बिल पर ₹${l.rate}`);
      if(y&&y.z.qty&&Math.abs(y.z.qty-l.qty)>0.01)r.warn.push(`ऐप में मात्रा ${y.z.qty}, बिल पर ${l.qty}`);
      if(it&&+it.cost>0&&l.uc>0&&String(l.u).replace(/s$/,"")===String(it.unit==="kg"?"kg":"pc")&&Math.abs(+it.cost-l.uc)>Math.max(0.5,l.uc*0.03))r.warn.push(`ऐप में खरीद भाव ₹${it.cost}, असल में पड़ा ₹${l.uc}`);
      if(it&&+it.sale>0&&l.uc>0&&+it.sale<l.uc&&String(l.u).replace(/s$/,"")===String(it.unit==="kg"?"kg":"pc"))r.warn.push(`⚠ बिक्री भाव ₹${it.sale} खरीद ₹${l.uc} से कम!`);
      return r});
    const st=!best?"missing":!best.amt||rows.some(r=>r.warn.length)?"diff":"ok";
    return {b,st,m:best&&best.x,rows}})};
/* 🛡️ दोहरी एंट्री: यही बिल ऐप में पहले से (खरीद या बाज़ार-खरीद, ±3 दिन, रकम ±0.5%, दुकान/सामान मिलते) */
SKJ.dupOf=function(x,skip){if(!x||!(+x.total>0))return null;const L=[];const add=(id,kind,date,sup,total,by,lines,c)=>{if(c||id===skip)return;L.push({id,kind,date,sup,total:+total||0,by,lines:lines||[]})};
  [...(S.purch||[]),...(S.purchHist||[])].forEach(p=>add(p.id,"खरीद",p.date,p.supName,p.total,p.byName,(p.lines||[]).map(l=>l.name),p.cancelled));
  try{(window.SM&&SM.all?SM.all():[]).forEach(m=>add(m.id,"बाज़ार",m.date,m.shop,m.total,m.buyer||m.byName,(m.lines||[]).map(l=>l.name),m.status==="cancel"))}catch(e){}
  const seen=new Set();for(const y of L){if(seen.has(y.id))continue;seen.add(y.id);if(!y.date||dd(y.date,x.date)>3)continue;if(Math.abs(y.total-x.total)>Math.max(2,x.total*0.005))continue;
    const ln=(x.lines||[]).length?(x.lines||[]).filter(l=>y.lines.some(n=>SKJ.sim(l.nm||l.name,n)>=0.6)).length/(x.lines||[]).length:0;
    if(SKJ.sim(x.sup,y.sup)>=0.5||ln>=0.5)return {id:y.id,txt:`${y.kind} · ${y.sup||""} · ${y.date} · ₹${y.total} · ${y.by||""}`}}return null};
/* 📤 सामान-सूची (खरीद-बही के लिए): AI बिल की लाइन को ऐप के सही सामान से जोड़ सके (नाम/इकाई/पैकेट/बारकोड → बही mem, साथी पढ़ें)
   + 💰 सिर्फ़ मालिक: s = बिक्री, m = MRP, c = ऐप की cost → बही में अलग जगह (rate/*, सिर्फ़ मालिक) — "किस भाव खरीदा, किस भाव बेचा" एक नज़र में।
   b = सारे बारकोड कॉमा से (दो बारकोड वाले सामान, जैसे 555 चाय) */
SKJ.catalogCode=()=>{const n=v=>Math.round((+v||0)*100)/100;return JSON.stringify({app:"mh177-cat",org:SE.org,v:2,ts:Date.now(),items:(S.items||[]).filter(i=>i.active!==false&&!i.virtual&&!["fast","mela"].includes(typeof mcat==="function"?mcat(i):i.cat)).map(i=>{const bs=String(i.barcode||"").split(/[^0-9]+/).filter(c=>c.length>=8);
  return {i:i.id,n:SE.capNm(i.short||i.name||""),u:i.unit||"pc",...(+i.perPack>0?{pp:+i.perPack}:{}),...(i.packOf?{pk:i.packOf}:{}),...(bs.length?{b:bs.join(",")}:{}),...(own()&&+i.sale>0?{s:n(i.sale)}:{}),...(own()&&+i.mrp>0?{m:n(i.mrp)}:{}),...(own()&&+i.cost>0?{c:n(i.cost)}:{})}})})};
/* 🏪 पूरी दुकान का डेटा (सिर्फ़ मालिक) → Claude की बही: हर सामान का भाव/स्टॉक/रैक/बिक्री, रोज़ की बिक्री, उधार, खरीद, भाव-बदलाव।
   ऐप में कुछ नहीं बदलता — सिर्फ़ पढ़कर एक कोड बनता है। ढाँचा: docs/दुकान-डेटा-प्रॉम्प्ट.txt */
const thumb=(src,px)=>new Promise(ok=>{try{const im=new Image();im.onload=()=>{try{const k=Math.min(1,px/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",.6))}catch(e){ok("")}};im.onerror=()=>ok("");im.src=src}catch(e){ok("")}});
SKJ.shopCode=async function(days){if(!own())return "";days=Math.min(60,+days||30);const n2=v=>Math.round((+v||0)*100)/100,T=today(),dOf=k=>{const x=new Date();x.setDate(x.getDate()-k);return today(x)};
  const ds=[];for(let k=days-1;k>=0;k--)ds.push(dOf(k));const d7=dOf(6),d14=dOf(13);
  const snaps=await Promise.all(ds.map(d=>d===S.billsDate&&S.dayBills?Promise.resolve(S.dayBills):(S.demo||!S.db?Promise.resolve([]):S.db.collection("days/"+d+"/bills").get().then(q=>q.docs.map(x=>x.data())).catch(()=>[]))));
  const A={},sd={},dayL=[];
  ds.forEach((d,k)=>{const bl=(snaps[k]||[]).filter(b=>b&&!b.cancelled&&b.mode!=="inst");let pr=0,ud=0,me=0;
    bl.forEach(b=>{pr-=(+b.disc||0);ud+=+(b.pay&&b.pay.udhar)||0;(b.lines||[]).forEach(l=>{if(!l.id)return;{const it=item(l.id);if(it&&typeof mcat==="function"&&mcat(it)==="mela")me+=+l.amt||0}const o=A[l.id]||(A[l.id]={q7:0,q30:0,a30:0,p30:0,nb:0,ls:"",ns:0});const q=+l.qty||0;
      o.q30+=q;o.a30+=+l.amt||0;o.nb++;if(d>=d7)o.q7+=q;if(d>o.ls)o.ls=d;if(l.ns!=null)o.ns++;if(+l.cost>0){const m=((+l.rate||0)-(+l.cost))*q;o.p30+=m;pr+=m}
      if(d>=d14){const [pid,pq]=packMap(l.id,q);(sd[d]=sd[d]||{})[pid]=n2(((sd[d]||{})[pid]||0)+pq)}})});
    dayL.push({d,sale:n2(bl.reduce((a,b)=>a+(+b.total||0),0)),profit:n2(pr),n:bl.length,...(ud?{udhar:n2(ud)}:{}),...(me?{mela:n2(me)}:{}),...((snaps[k]||[]).some(b=>b&&b.cancelled)?{can:(snaps[k]||[]).filter(b=>b&&b.cancelled).length}:{})})});
  const exp={};(S.batches||[]).forEach(b=>{if(b.itemId&&b.exp&&b.exp>=T&&(!exp[b.itemId]||b.exp<exp[b.itemId]))exp[b.itemId]=b.exp});
  const L=(S.items||[]).filter(i=>i.active!==false&&!i.virtual),th={};let nth=0;
  const items=L.map(i=>{const bs=String(i.barcode||"").split(/[^0-9]+/).filter(c=>c.length>=8),a=A[i.id],ps=S.pstock&&S.pstock[i.id],src=SE.photoSrc?SE.photoSrc(i):"";
    return {i:i.id,n:SE.capNm(i.short||i.name||""),u:i.unit||"pc",cat:typeof mcat==="function"?mcat(i):(i.cat||""),...(i.sub?{sub:i.sub}:{}),...(i.hi?{hi:String(i.hi).slice(0,40)}:{}),...(i.brand?{br:String(i.brand).slice(0,24)}:{}),...(i.size?{sz:String(i.size).slice(0,12)}:{}),
      ...(+i.perPack>0?{pp:+i.perPack}:{}),...(i.packOf?{pk:i.packOf}:{}),...(bs.length?{b:bs.join(",")}:{}),...(+i.sale>0?{s:n2(i.sale)}:{}),...(+i.mrp>0?{m:n2(i.mrp)}:{}),...(+i.cost>0?{c:n2(i.cost)}:{}),
      ...(i.track?{tr:1}:{}),...(ps&&ps.qty!=null?{st:n2(ps.qty)}:{}),...(+i.min>0?{min:+i.min}:{}),...(i.rack?{rk:String(i.rack)}:{}),...(i.rkx&&Object.keys(i.rkx).length?{rx:i.rkx}:{}),...(i.grack?{gr:String(i.grack)}:{}),
      ...(i.mfr?{co:i.mfr}:{}),...(exp[i.id]?{ex:exp[i.id]}:{}),...(typeof isTob==="function"&&isTob(i)?{tob:1}:{}),...(i.pending?{pend:1}:{}),...(i.offer?{of:String(i.offer).slice(0,20)}:{}),
      ph:src?(/^data:/.test(src)?2:1):0,...(a?{q7:n2(a.q7),q30:n2(a.q30),a30:n2(a.a30),p30:n2(a.p30),nb:a.nb,ls:a.ls,...(a.ns?{ns:a.ns}:{})}:{})}});
  /* 📸 फोन में खींची फोटो (जो GitHub में नहीं): छोटी 96px नकल, 80 तक */
  for(const i of L){const src=SE.photos&&SE.photos[i.id];if(!src||nth>=80)continue;const t=await thumb(src,96);if(t&&t.length<9000){th[i.id]=t;nth++}}
  const from=ds[0],B=(await appBuys(from,T)).sort((a,b)=>String(a.date).localeCompare(b.date)),bd={};
  B.forEach(x=>{if(x.date<d14||x.noStock)return;(x.lines||[]).forEach(l=>{if(!l.id||!item(l.id))return;const [pid,pq]=packMap(l.id,+l.qty||0);(bd[x.date]=bd[x.date]||{})[pid]=n2(((bd[x.date]||{})[pid]||0)+pq)})});
  const supD=(S.suppliers||[]).map(x=>{const due=(S.purchHist||[]).concat(S.purch||[]).filter((p,k,a)=>!p.cancelled&&p.supId===x.id&&a.findIndex(y=>y.id===p.id)===k).reduce((a,p)=>a+(+p.due||0),0),paid=(S.supPay||[]).filter(y=>y.supId===x.id).reduce((a,y)=>a+(+y.amt||0),0);
    return {id:x.id,n:String(x.name||"").slice(0,60),...(x.phone?{ph:String(x.phone)}:{}),...(x.kind?{k:x.kind}:{}),...(x.gst?{gst:x.gst}:{}),...(x.city?{city:String(x.city).slice(0,30)}:{}),...(n2(due-paid)?{due:n2(due-paid)}:{}),...(x.lastTs?{last:today(new Date(x.lastTs))}:{})}});
  const out={app:"mh177-shop",org:SE.org,v:1,ts:Date.now(),day:T,from,ver:SE.version||"",live:!!(S.settings&&S.settings.live),items,days:dayL,sd,bd,sup:supD,
    buys:B.map(x=>({k:x.kind,id:x.id,d:x.date,sup:x.sup,t:n2(x.total),...(x.pay?{pay:x.pay}:{}),...(x.paid!=null?{paid:n2(x.paid)}:{}),by:x.by,...(x.noStock?{ns:1}:{}),lines:(x.lines||[]).map(l=>({...(l.id?{i:l.id}:{}),n:String(l.name||"").slice(0,40),q:l.qty,r:n2(l.rate)}))})),
    plog:(S.priceLog||[]).filter(l=>l.ts>Date.now()-days*864e5).slice(0,200).map(l=>({i:l.itemId,f:l.field,o:n2(l.old),w:n2(l.new),ts:l.ts,by:l.byName||""})),th};
  let txt=JSON.stringify(out);if(txt.length>850000){out.th={};txt=JSON.stringify(out)}if(txt.length>850000){out.buys.forEach(b=>delete b.lines);txt=JSON.stringify(out)}return txt};
/* 📥 बही → ऐप: हर बिल एक "बाज़ार-खरीद" (mbuys, status sent) — बिलिंग वाला साथी गिनकर पक्का करे तभी स्टॉक + खरीद बने (एक ही बार) */
const MID=b=>"KB-"+String(b.id||"").replace(/[^A-Za-z0-9-]/g,"").slice(0,60);
/* 🏷️ बारकोड सबसे पहले (दुकान नाम कुछ भी लिखे), फिर बही वाला id, फिर नाम */
const itemFor=l=>{if(l.bc&&typeof findByCode==="function"){const b=findByCode(String(l.bc));if(b)return b.id}if(l.iid&&typeof item==="function"&&item(l.iid))return l.iid;const u=SE.capNm(l.nm||"");const it=(S.items||[]).find(i=>i.active!==false&&!i.virtual&&(SE.capNm(i.short||"")===u||SE.capNm(i.name||"")===u))||(S.items||[]).find(i=>i.active!==false&&!i.virtual&&SKJ.sim(l.nm,i.short||i.name)>=0.85);return it?it.id:""};
SKJ.plan=async function(bills){const ex=new Set();try{(window.SM&&SM.all?SM.all():[]).forEach(m=>ex.add(m.id))}catch(e){}(SKJ._made||[]).forEach(m=>ex.add(m.id));
  const out=[];for(const b of bills){const id=MID(b);let have=ex.has(id);if(!have&&!S.demo&&S.db){try{have=(await S.db.doc("mbuys/"+id).get()).exists}catch(e){}}
    const lines=(b.lines||[]).map(l=>({...l,itemId:itemFor(l)}));const dup=have?null:SKJ.dupOf({sup:b.sup,total:b.total,date:b.date,lines});
    /* 🔒 कोड वाला (सिगरेट-तम्बाकू) सामान ऐप में न हो तो रुको — वरना गिनते समय आम "किराना" बन जाता (छपे बिल पर असली नाम!) */
    const tob=lines.filter(l=>l.tob&&!l.itemId);
    out.push({b,id,st:have?"have":tob.length?"block":dup?"dup":"new",dup,lines,tob,nNew:lines.filter(l=>!l.itemId).length})}return out};
SKJ.importOne=async function(P){const b=P.b,t=Date.now();const pm=b.pay==="udhar"?"udhar":"vikram";
  const lines=P.lines.map((l,i)=>{const r=Math.round((+l.uc||+l.rate||0)*100)/100,q=+l.qty||0;return {lid:"k"+i,bar:String(l.bc||""),itemId:l.itemId||"",name:SE.capNm(l.nm||""),hi:"",qty:q,rate:r,mrp:0,amt:Math.round(q*r*100)/100,f:"",m:"",low:false,last:0,ai:true,seen:0}});
  const total=Math.round(lines.reduce((a,l)=>a+l.amt,0)*100)/100;
  const doc={no:P.id,date:b.date||today(),ts:t,start:t,by:S.uid||"",byName:(typeof biller==="function"?biller():"")+" (खरीद-बही)",buyer:b.buyer||"",shop:String(b.sup||"").trim(),phone:String(b.phone||"").replace(/\D/g,"").slice(-10),loc:null,
    lines,n:lines.length,total,gain:0,pct:0,low:[],dear:[],bill:"",qr:"",upi:"",pay:{mode:pm,status:pm==="udhar"?"udhar":"paid",amt:total},ai:null,aiKey:"",
    note:"📒 खरीद-बही से · "+b.id+(b.buyer?" · खरीदा: "+b.buyer:""),status:"sent",recv:null,app:SE.version,kb:b.id};
  if(!S.demo&&S.db){const ref=S.db.doc("mbuys/"+P.id);const ok=await S.db.runTransaction?await S.db.runTransaction(async tx=>{const d=await tx.get(ref);if(d.exists)return false;tx.set(ref,doc);return true}).catch(()=>null):null;
    if(ok===false)return "have";if(ok===null){const d=await ref.get().catch(()=>null);if(d&&d.exists)return "have";await ref.set(doc)}}
  SKJ._made=(SKJ._made||[]).concat([{id:P.id,...doc}]);return "ok"};
/* 🆕 बही से सामान बनाओ (मालिक): बिल की जो लाइन ऐप में नहीं (बारकोड/नाम से) और जिसका बेचने का भाव तय है →
   पैकेट वाला (pp>1): खुला पीस मुख्य सामान + पैकेट (packOf, perPack, कंपनी बारकोड) · बाकी: एक सामान।
   🔒 tob: sub "tob" + अपने-आप secret कोड (S-xx, पैकेट S-xxP), घर रैक 5। स्टॉक नहीं छूता (बिलिंग अभी शुरू नहीं)। */
SKJ.itemPlan=function(bills){const out=[],seen=new Set();(bills||[]).forEach(b=>(b.lines||[]).forEach(l=>{const k=String(l.bc||SE.capNm(l.nm||""));if(!l.nm||seen.has(k))return;seen.add(k);
    const have=itemFor(l);out.push({l,b,have,ok:!have&&(+l.sale>0||+l.saleOne>0),why:have?"✅ पहले से ऐप में":!(+l.sale>0||+l.saleOne>0)?"💰 बेचने का भाव बही में नहीं":""})}));return out};
SKJ.makeItems=async function(plan){const r2=n=>Math.round((+n||0)*100)/100;let n=0;const made=[];
  const nextS=()=>{const mx=(S.items||[]).reduce((a,x)=>{const m=/^S-(\d+)$/.exec(x.secret||"");return m?Math.max(a,+m[1]):a},0);return "S-"+String(mx+1).padStart(2,"0")};
  for(const P of plan){if(!P.ok)continue;const l=P.l,pp=+l.pp||0,tob=!!l.tob,cat="kirana",ts=Date.now();const base=SE.capNm(String(l.nm).replace(/\s+\d+\s*$/,""));
    const id="i"+ts.toString(36)+Math.random().toString(36).slice(2,5),code=nextCode(cat);
    const common={hi:"",alias:"",sub:tob?"tob":"",emoji:tob?"🚬":"🛒",cat,unit:"pc",hue:Math.floor(Math.random()*360),active:true,src:"kharid-bahi",addedTs:ts,addedBy:S.uid||"",...(tob&&SE.org==="mh177"?{rack:"5-1"}:{})};
    try{if(pp>1){const sec=tob?nextS():"";
        const pc={...common,name:base+" 1 PC",short:(base+" 1PC").slice(0,24),secret:sec,perPack:pp,code,barcode:ean13("2000000"+code+"0"),track:true,min:pp,mrp:r2((+l.mrp||0)/pp),sale:+l.saleOne||r2((+l.sale||0)/pp),cost:r2((+l.uc||+l.rate||0)/pp),order:(S.items||[]).length+1};
        if(!S.demo)await S.db.collection("items").doc(id).set(pc);S.items.push({id,...pc});
        let c2=nextCode(cat,[code]);const pid=id+"-pk";
        const pk={...common,name:SE.capNm(l.nm),short:SE.capNm(l.nm).slice(0,24),secret:sec?sec+"P":"",packOf:id,perPack:pp,code:c2,barcode:String(l.bc||ean13("2000000"+c2+"0")),track:false,min:0,mrp:+l.mrp||0,sale:+l.sale||r2((+l.saleOne||0)*pp),cost:r2(+l.uc||+l.rate||0),order:pc.order+0.5};
        if(!S.demo)await S.db.collection("items").doc(pid).set(pk);S.items.push({id:pid,...pk});made.push(pk.name+" + 1 PC");n+=2}
      else{const it={...common,name:SE.capNm(l.nm),short:SE.capNm(l.nm).slice(0,24),secret:tob?nextS():"",perPack:0,code,barcode:String(l.bc||ean13("2000000"+code+"0")),track:true,min:5,mrp:+l.mrp||0,sale:+l.sale||+l.saleOne||0,cost:r2(+l.uc||+l.rate||0),order:(S.items||[]).length+1};
        if(!S.demo)await S.db.collection("items").doc(id).set(it);S.items.push({id,...it});made.push(it.name);n++}
      P.ok=false;P.why="🆕 बन गया";P.have=id}catch(e){P.why="नहीं बना: "+(e.code||e.message||"")}}
  return {n,made}};
/* 🧹 स्टॉक शून्य (मालिक — बिलिंग शुरू करने से पहले): हर सामान का स्टॉक 0, हर बदलाव stockLog में (पुराना हिसाब मिटता नहीं) */
SKJ.zeroStock=async function(filter){const L=Object.entries(S.pstock||{}).filter(([id,v])=>v&&+v.qty!==0&&item(id)&&(!filter||filter(item(id))));let n=0;const ts=Date.now();
  for(const [id,v] of L){const q=+v.qty||0;try{if(!S.demo){await S.db.collection("pstock").doc(id).set({qty:0,ts,by:S.uid||"",byName:typeof biller==="function"?biller():"",last:"🧹 स्टॉक शून्य (मालिक)"},{merge:true});
      S.db.collection("stockLog").doc("z"+ts.toString(36)+n).set({itemId:id,d:-q,why:"🧹 स्टॉक शून्य (मालिक) · पहले "+q,ts,date:today(),by:S.uid||"",byName:typeof biller==="function"?biller():""}).catch(()=>{})}
    S.pstock[id]={...v,qty:0,ts};n++}catch(e){}}return n};
const STT={ok:"✅ ऐप में चढ़ा",diff:"⚠ चढ़ा, पर फ़र्क़",missing:"❌ ऐप में नहीं चढ़ा"};
function resHTML(R){if(!R)return "";const n=k=>R.filter(r=>r.st===k).length;
  return `<div class="skj-k"><div class="ok"><b>${n("ok")}</b><span>✅ सही</span></div><div class="df"><b>${n("diff")}</b><span>⚠ फ़र्क़</span></div><div class="ms"><b>${n("missing")}</b><span>❌ नहीं चढ़े</span></div></div>
  ${R.sort((a,b)=>({missing:0,diff:1,ok:2}[a.st]-{missing:0,diff:1,ok:2}[b.st])).map(r=>`<div class="skj-b ${r.st}"><div class="skj-h"><b>${esc(r.b.sup)} #${esc(r.b.no)}</b><span>${fdate?fdate(r.b.date):r.b.date} · ${rs(r.b.total)}</span><i>${STT[r.st]}</i></div>
    ${r.m?`<p class="note" style="margin:2px 0">ऐप में: ${esc(r.m.kind)} · ${esc(r.m.sup)} · ${fdate?fdate(r.m.date):r.m.date} · ${rs(r.m.total)} · चढ़ाया ${esc(r.m.by||"—")}${Math.abs(r.m.total-r.b.total)>2?` · <b class="skj-w">रकम में फ़र्क़ ${rs(Math.round((r.m.total-r.b.total)*100)/100)}</b>`:""}</p>`:`<p class="skj-w" style="margin:2px 0">यह बिल किसी साथी ने ऐप में नहीं चढ़ाया — स्टॉक और हिसाब अधूरा है।</p>`}
    ${r.rows.filter(x=>x.warn.length).map(x=>`<div class="skj-l"><b>${esc(x.nm)}</b> ${x.warn.map(w=>`<span>${esc(w)}</span>`).join("")}</div>`).join("")}</div>`).join("")}
  <button type="button" class="big ghost" data-skjcopy>📋 नतीजा कॉपी करें (Claude को भेजें)</button>`}
const PST={block:"🔒 पहले कोड वाला सामान बनाएँ",new:"🆕 चढ़ेगा",have:"✅ पहले से ऐप में (दोबारा नहीं)",dup:"⚠ लगता है पहले से चढ़ा",made:"📥 भेज दिया — गिनना बाकी"};
function planHTML(P){if(!P)return "";const n=P.filter(x=>x.st==="new"||x.st==="dup").length;
  return `${P.map(x=>`<div class="skj-b ${x.st==="dup"?"diff":x.st==="new"?"":"ok"}"><div class="skj-h"><b>${esc(x.b.sup)} #${esc(x.b.no)}</b><span>${esc(x.b.date)} · ${rs(x.b.total)}${x.b.buyer?" · 🛒 "+esc(x.b.buyer):""}</span><i>${PST[x.st]||""}</i></div>
    ${x.st==="dup"?`<p class="skj-w" style="margin:2px 0">यह बिल ऐप में मिलता-जुलता है: ${esc(x.dup.txt)}</p>${S.isOwner?`<label class="note"><input type="checkbox" data-skjforce="${esc(x.id)}"> फिर भी चढ़ाओ (मालिक की अनुमति)</label>`:""}`:""}
    ${x.st==="block"?`<p class="skj-w" style="margin:2px 0">ये कोड वाले सामान ऐप में नहीं मिले — ⚙️ सामान में "कोड वाला (सिगरेट-तम्बाकू)" बनाकर यही बारकोड डालें, फिर दोबारा "बही से ऐप में चढ़ाओ": ${x.tob.map(l=>esc(l.nm)+(l.bc?" ("+esc(l.bc)+")":"")).join(", ")}</p>`:""}
    ${x.nNew&&x.st!=="have"&&x.st!=="block"?`<p class="note" style="margin:2px 0">🆕 ${x.nNew} सामान ऐप में नहीं मिले — गिनते समय नए बनेंगे: ${x.lines.filter(l=>!l.itemId).map(l=>esc(l.nm)).join(", ")}</p>`:""}${x.err?`<p class="skj-w">${esc(x.err)}</p>`:""}</div>`).join("")}
  ${n?`<button type="button" class="pri big" data-skjgoimp>📥 ${n} बिल ऐप में भेजें — बिलिंग वाला साथी गिनकर पक्का करेगा</button>`:""}`}
function itemsHTML(I){if(!I)return "";const k=I.filter(x=>x.ok).length;
  return `<div class="skj-b">${I.map(x=>{const l=x.l,pp=+l.pp||0;return `<div class="skj-l"><b>${l.tob?"🔒 ":""}${esc(SE.capNm(l.nm))}</b> ${pp>1?`<span>खुला 1 PC ₹${esc(l.saleOne||"?")} + पैकेट ${pp} ₹${esc(l.sale||"?")}</span>`:`<span>₹${esc(l.sale||l.saleOne||"?")}</span>`}${l.bc?`<span>${esc(l.bc)}</span>`:""}<i style="font-style:normal;margin-left:4px">${esc(x.why||"🆕 बनेगा")}</i></div>`}).join("")}</div>
  ${k?`<button type="button" class="pri big" data-skjmk>🆕 ${k} सामान ऐप में बनाओ</button>`:""}`}
/* 📋 ऐप में साथियों की चढ़ाई सारी खरीद → Claude (खरीद-बही से मिलान, docs/खरीद-बही/README.md §ऐप-नकल) */
SKJ.appCode=async function(days){days=+days||30;const to=today(),from=new Date(Date.now()-days*864e5).toISOString().slice(0,10);
  const L=(await appBuys(from,to)).sort((a,b)=>String(a.date).localeCompare(b.date)||(a.ts||0)-(b.ts||0));
  const bc=id=>{const it=id&&item(id);const b=it&&String(it.barcode||"").replace(/\D/g,"");return b&&b.length>=8?b:""};
  return JSON.stringify({app:"mh177-appbuys",org:SE.org,v:1,from,to,n:L.length,ts:Date.now(),
    buys:L.map(x=>({k:x.kind,id:x.id,d:x.date,ts:x.ts||0,sup:x.sup,...(x.ph?{ph:x.ph}:{}),t:x.total,...(x.paid!=null?{paid:x.paid}:{}),...(x.pay?{pay:x.pay}:{}),by:x.by,...(x.late?{late:1}:{}),phn:x.phn||0,...(String(x.note||"").trim()?{note:String(x.note).trim()}:{}),
      ln:x.lines.map(l=>({n:l.name,...(l.id?{i:l.id}:{}),...(bc(l.id)?{b:bc(l.id)}:{}),q:l.qty,...(l.u&&l.u!=="pc"?{u:l.u}:{}),r:l.rate,a:l.amt,...(l.ctn?{c:l.ctn}:{}),...(l.exp?{x:l.exp}:{})}))}))})};
SKJ.text=R=>(R||[]).map(r=>`${STT[r.st]} — ${r.b.sup} #${r.b.no} (${r.b.date}, ₹${r.b.total})${r.m?` · ऐप: ${r.m.kind} ₹${r.m.total} by ${r.m.by}`:""}${r.rows.filter(x=>x.warn.length).map(x=>`\n   • ${x.nm}: ${x.warn.join("; ")}`).join("")}`).join("\n");
const V={R:null,P:null,I:null};
SKJ.open=function(){if(!own()){toast("सिर्फ़ विक्रम जी");return}const B=LS.get("skj_b",[]);
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" id="skjSheet" role="dialog" aria-label="खरीद-जाँच"><div class="grab"></div>
  <div class="sh-head"><h3 style="font-size:17px">🔍 खरीद-जाँच — असली बिल बनाम ऐप</h3><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <p class="note" style="margin:0 0 6px">Claude की "खरीद-बही" → 🔍 ऐप से मिलान → कोड कॉपी → यहाँ चिपकाएँ। ${B.length?`इस फोन में ${B.length} बिल याद हैं।`:""}</p>
  <textarea id="skjIn" class="inp" rows="4" placeholder='{"app":"mh177-kharid","bills":[…]}' style="width:100%;font:12px monospace"></textarea>
  <div style="display:flex;gap:6px;margin:6px 0"><button type="button" class="pri big" data-skjgo>🔍 मिलान करें</button>${B.length?`<button type="button" class="big ghost" data-skjold>♻️ याद वाले ${B.length} बिल फिर जाँचें</button>`:""}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px"><button type="button" class="big" data-skjplan>📥 बही से ऐप में चढ़ाओ</button><button type="button" class="big ghost" data-skjcat>📤 सामान-सूची कॉपी (बही के लिए)</button></div>
  <button type="button" class="pri big" data-skjshop style="width:100%;margin:0 0 4px">🏪 पूरी दुकान का डेटा कॉपी (बही के लिए)</button>
  <p class="note" style="margin:0 0 8px">हर सामान का भाव, स्टॉक, रैक, 30 दिन की बिक्री, उधार, खरीद — एक कोड में। रोज़ या 2-3 दिन में कॉपी करके खरीद-बही → "📥 ऐप का डेटा" में चिपकाएँ; बही बताएगी क्या बदला और क्या गड़बड़ है। ऐप में कुछ नहीं बदलता।</p>
  <div class="skj-ac" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 6px"><span class="note">📋 ऐप की सारी खरीद Claude को (मिलान के लिए):</span>${[7,30,90].map(d=>`<button type="button" class="big ghost" data-skjapp="${d}" style="flex:1">${d} दिन</button>`).join("")}</div>
  <button type="button" class="big ghost" data-skjitems style="margin:0 0 6px">🆕 बही से नए सामान बनाओ (भाव, पैकेट, कोड — स्टॉक नहीं छूता)</button><div id="skjItems">${itemsHTML(V.I)}</div>
  <div id="skjPlan">${planHTML(V.P)}</div>
  <div id="skjOut">${resHTML(V.R)}</div></div></div>`;
  const sh=$("#sheet");
  sh.onclick=async e=>{const t=e.target;if(t.matches("[data-close]")){closeSheet();return}
    if(t.closest("[data-skjgo]")||t.closest("[data-skjold]")){let bills;try{bills=t.closest("[data-skjold]")?LS.get("skj_b",[]):SKJ.parse($("#skjIn").value)}catch(err){toast(err.message);return}
      if(!t.closest("[data-skjold]")){const m={};LS.get("skj_b",[]).concat(bills).forEach(b=>m[b.id||b.sup+b.no]=b);LS.set("skj_b",Object.values(m).slice(-400))}
      $("#skjOut").innerHTML=`<p class="note">⏳ ${bills.length} बिल मिला रहे हैं…</p>`;V.R=await SKJ.check(bills);$("#skjOut").innerHTML=resHTML(V.R);return}
    const sb=t.closest("[data-skjshop]");if(sb){sb.disabled=true;const o=sb.textContent;sb.textContent="⏳ डेटा जोड़ रहे हैं…";try{const code=await SKJ.shopCode(30);SKJ._shop=code;await navigator.clipboard.writeText(code);const j=JSON.parse(code);toast("✓ दुकान का डेटा कॉपी — "+j.items.length+" सामान, "+Math.round(code.length/1024)+" KB। खरीद-बही में चिपकाएँ")}catch(err){toast("कॉपी नहीं हुआ — फिर दबाएँ")}sb.disabled=false;sb.textContent=o;return}
    if(t.closest("[data-skjcat]")){try{await navigator.clipboard.writeText(SKJ.catalogCode());toast("✓ सामान-सूची कॉपी — खरीद-बही → ⚙️ सामान-सूची में चिपकाएँ")}catch(err){toast("कॉपी नहीं हुआ")}return}
    if(t.closest("[data-skjitems]")){let bills;try{bills=SKJ.parse($("#skjIn").value)}catch(err){toast(err.message);return}V.I=SKJ.itemPlan(bills);$("#skjItems").innerHTML=itemsHTML(V.I);return}
    if(t.closest("[data-skjmk]")){t.closest("[data-skjmk]").disabled=true;const r=await SKJ.makeItems(V.I||[]);$("#skjItems").innerHTML=itemsHTML(V.I);beep(true);toast("✓ "+r.n+" सामान बने — अब बही में 🧠 याद ताज़ा करें (📤 सामान-सूची कॉपी)");if(typeof renderSettings==="function")setTimeout(()=>{},0);return}
    if(t.closest("[data-skjplan]")){let bills;try{bills=SKJ.parse($("#skjIn").value)}catch(err){toast(err.message);return}$("#skjPlan").innerHTML=`<p class="note">⏳ जाँच रहे हैं…</p>`;V.P=await SKJ.plan(bills);$("#skjPlan").innerHTML=planHTML(V.P);return}
    if(t.closest("[data-skjgoimp]")){const b=t.closest("[data-skjgoimp]");b.disabled=true;let n=0,h=0;for(const P of V.P||[]){const ok=P.st==="new"||(P.st==="dup"&&S.isOwner&&($(`[data-skjforce="${P.id}"]`)||{}).checked);if(!ok)continue;
        try{const r=await SKJ.importOne(P);if(r==="ok"){P.st="made";n++}else{P.st="have";h++}}catch(err){P.err=err.code||err.message}}
      $("#skjPlan").innerHTML=planHTML(V.P);beep(true);toast(`✓ ${n} बिल ऐप में "बाज़ार खरीद" में — बिलिंग वाला गिनकर पक्का करे${h?` · ${h} पहले से थे`:""}`);return}
    const ap=t.closest("[data-skjapp]");if(ap){ap.disabled=true;const c=await SKJ.appCode(ap.dataset.skjapp);ap.disabled=false;const n=JSON.parse(c).n;
      try{await navigator.clipboard.writeText(c);toast("✓ "+n+" खरीद कॉपी — Claude की चैट में चिपकाएँ")}catch(err){try{if(window.SX&&SX.shareBlob)await SX.shareBlob(new Blob([c],{type:"application/json"}),"MH177_khareed_"+today(),"json","application/json","177 MH खरीद");else{$("#skjIn").value=c;toast("कॉपी नहीं हुआ — ऊपर डिब्बे से कॉपी करें")}}catch(x){}}return}
    if(t.closest("[data-skjcopy]")){const s=SKJ.text(V.R);try{await navigator.clipboard.writeText(s);toast("✓ कॉपी — Claude की चैट में चिपकाएँ")}catch(err){toast("कॉपी नहीं हुआ")}}}};
SKJ.zeroHTML=()=>own()?`<div class="card2" id="skjZero"><h3 style="margin:0 0 4px">🧹 स्टॉक शून्य करें</h3><p class="note" style="margin:0 0 8px">बिलिंग शुरू करने से पहले — असली गिनती से शुरुआत के लिए। हर सामान का बदलाव स्टॉक-हिसाब में लिखा रहेगा (मिटेगा नहीं)। सिर्फ़ विक्रम जी।</p>
  <div class="seg" style="margin-bottom:6px"><button class="chip" data-zsel="all" aria-pressed="true">सारे सामान</button><button class="chip" data-zsel="tob" aria-pressed="false">🔒 सिर्फ़ कोड वाले</button></div>
  <input class="inp" id="zConf" placeholder='पक्का करने के लिए लिखें: शून्य' autocomplete="off"><button type="button" class="big ghost" data-zgo style="margin-top:6px">🧹 स्टॉक 0 करो</button></div>`:"";
let ZSEL="all";document.addEventListener("click",async e=>{const z=e.target.closest("[data-zsel]");if(z){ZSEL=z.dataset.zsel;document.querySelectorAll("[data-zsel]").forEach(b=>b.setAttribute("aria-pressed",String(b===z)));return}
  const g=e.target.closest("[data-zgo]");if(!g||!own())return;const c=document.getElementById("zConf");if(!c||c.value.trim()!=="शून्य"){toast('ऊपर "शून्य" लिखें, फिर दबाएँ');return}
  g.disabled=true;const n=await SKJ.zeroStock(ZSEL==="tob"?(i=>typeof isTob==="function"&&isTob(i)):null);g.disabled=false;c.value="";toast("🧹 "+n+" सामान का स्टॉक 0 — अब असली गिनती चढ़ाएँ")});
SKJ.settingsHTML=()=>own()?`<div class="card2" id="skjCard"><h3 style="margin:0 0 4px">🔍 खरीद-जाँच</h3><p class="note" style="margin:0 0 8px">Claude की खरीद-बही के असली बिल को साथियों की चढ़ाई खरीद से मिलाएँ — न चढ़ा बिल, अलग भाव/मात्रा, कम बिक्री भाव पकड़ में आएँगे।</p><button type="button" class="pri" data-skjopen>🔍 खरीद-जाँच खोलें</button></div>`:"";
document.addEventListener("click",e=>{if(e.target.closest("[data-skjopen]"))SKJ.open()});
const css=document.createElement("style");css.textContent=`.skj-k{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}.skj-k div{border:1.5px solid var(--line);border-radius:12px;padding:6px;text-align:center}.skj-k b{display:block;font-size:18px}.skj-k span{font-size:12px}.skj-k .ms b{color:#b91c1c}.skj-k .df b{color:#b45309}.skj-k .ok b{color:#0f766e}
.skj-b{border:1.5px solid var(--line);border-radius:12px;padding:8px;margin:6px 0}.skj-b.missing{border-color:#b91c1c88;background:#b91c1c0d}.skj-b.diff{border-color:#b4530988}.skj-h{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}.skj-h span{font-size:12.5px;color:var(--muted)}.skj-h i{font-style:normal;font-weight:700;margin-left:auto;font-size:12.5px}
.skj-w{color:#b91c1c;font-weight:700;font-size:12.5px}.skj-l{font-size:12.5px;padding:2px 0}.skj-l span{display:inline-block;margin:0 4px 2px 0;padding:0 6px;border-radius:6px;background:#b4530918;color:#92400e}`;document.head.appendChild(css);
})();
