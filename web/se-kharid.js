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
  if(j.app!=="mh177-kharid"||!Array.isArray(j.bills))throw new Error("यह खरीद-बही का कोड नहीं");return j.bills};
async function appBuys(from,to){const L=[];const seen=new Set();const add=(x,k)=>{if(!x||seen.has(k+x.id))return;seen.add(k+x.id);L.push(x)};
  [...(S.purchHist||[]),...(S.purch||[])].forEach(p=>add({id:p.id,kind:"खरीद",date:p.date,sup:p.supName||"",total:+p.total||+p.gross||0,by:p.byName||"",lines:(p.lines||[]).map(l=>({id:l.id||"",name:l.name||"",qty:+l.qty||0,rate:+l.rate||0,amt:+l.amt||+l.billAmt||0})),cancelled:!!p.cancelled,note:p.note||""},"p"));
  if(!S.demo&&S.db){try{const q=await S.db.collection("purchases").where("date",">=",from).get();q.docs.forEach(d=>{const p=d.data();add({id:d.id,kind:"खरीद",date:p.date,sup:p.supName||"",total:+p.total||0,by:p.byName||"",lines:(p.lines||[]).map(l=>({id:l.id||"",name:l.name||"",qty:+l.qty||0,rate:+l.rate||0,amt:+l.amt||0})),cancelled:!!p.cancelled,note:p.note||""},"p")})}catch(e){}
    try{const q=await S.db.collection("mbuys").where("date",">=",from).get();q.docs.forEach(d=>{const m=d.data();add({id:d.id,kind:"बाज़ार",date:m.date,sup:m.shop||"",total:+m.total||0,by:m.byName||"",lines:(m.lines||[]).map(l=>({id:l.id||"",name:l.name||"",qty:+l.qty||0,rate:+l.rate||0,amt:+l.amt||0})),cancelled:m.status==="cancel",note:(m.bill||"")+" "+(m.note||"")},"m")})}catch(e){}}
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
/* 📤 सामान-सूची (खरीद-बही के लिए): AI बिल की लाइन को ऐप के सही सामान से जोड़ सके — भाव नहीं जाते */
SKJ.catalogCode=()=>JSON.stringify({app:"mh177-cat",v:1,ts:Date.now(),items:(S.items||[]).filter(i=>i.active!==false&&!i.virtual&&!["fast","mela"].includes(typeof mcat==="function"?mcat(i):i.cat)).map(i=>({i:i.id,n:SE.capNm(i.short||i.name||""),u:i.unit||"pc",...(+i.perPack>0?{pp:+i.perPack}:{}),...(i.packOf?{pk:i.packOf}:{})}))});
/* 📥 बही → ऐप: हर बिल एक "बाज़ार-खरीद" (mbuys, status sent) — बिलिंग वाला साथी गिनकर पक्का करे तभी स्टॉक + खरीद बने (एक ही बार) */
const MID=b=>"KB-"+String(b.id||"").replace(/[^A-Za-z0-9-]/g,"").slice(0,60);
const itemFor=l=>{if(l.iid&&typeof item==="function"&&item(l.iid))return l.iid;if(l.bc&&typeof findByCode==="function"){const b=findByCode(String(l.bc));if(b)return b.id}const u=SE.capNm(l.nm||"");const it=(S.items||[]).find(i=>i.active!==false&&!i.virtual&&(SE.capNm(i.short||"")===u||SE.capNm(i.name||"")===u))||(S.items||[]).find(i=>i.active!==false&&!i.virtual&&SKJ.sim(l.nm,i.short||i.name)>=0.85);return it?it.id:""};
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
SKJ.text=R=>(R||[]).map(r=>`${STT[r.st]} — ${r.b.sup} #${r.b.no} (${r.b.date}, ₹${r.b.total})${r.m?` · ऐप: ${r.m.kind} ₹${r.m.total} by ${r.m.by}`:""}${r.rows.filter(x=>x.warn.length).map(x=>`\n   • ${x.nm}: ${x.warn.join("; ")}`).join("")}`).join("\n");
const V={R:null,P:null};
SKJ.open=function(){if(!own()){toast("सिर्फ़ विक्रम जी");return}const B=LS.get("skj_b",[]);
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" id="skjSheet" role="dialog" aria-label="खरीद-जाँच"><div class="grab"></div>
  <div class="sh-head"><h3 style="font-size:17px">🔍 खरीद-जाँच — असली बिल बनाम ऐप</h3><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <p class="note" style="margin:0 0 6px">Claude की "खरीद-बही" → 🔍 ऐप से मिलान → कोड कॉपी → यहाँ चिपकाएँ। ${B.length?`इस फोन में ${B.length} बिल याद हैं।`:""}</p>
  <textarea id="skjIn" class="inp" rows="4" placeholder='{"app":"mh177-kharid","bills":[…]}' style="width:100%;font:12px monospace"></textarea>
  <div style="display:flex;gap:6px;margin:6px 0"><button type="button" class="pri big" data-skjgo>🔍 मिलान करें</button>${B.length?`<button type="button" class="big ghost" data-skjold>♻️ याद वाले ${B.length} बिल फिर जाँचें</button>`:""}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px"><button type="button" class="big" data-skjplan>📥 बही से ऐप में चढ़ाओ</button><button type="button" class="big ghost" data-skjcat>📤 सामान-सूची कॉपी (बही के लिए)</button></div>
  <div id="skjPlan">${planHTML(V.P)}</div>
  <div id="skjOut">${resHTML(V.R)}</div></div></div>`;
  const sh=$("#sheet");
  sh.onclick=async e=>{const t=e.target;if(t.matches("[data-close]")){closeSheet();return}
    if(t.closest("[data-skjgo]")||t.closest("[data-skjold]")){let bills;try{bills=t.closest("[data-skjold]")?LS.get("skj_b",[]):SKJ.parse($("#skjIn").value)}catch(err){toast(err.message);return}
      if(!t.closest("[data-skjold]")){const m={};LS.get("skj_b",[]).concat(bills).forEach(b=>m[b.id||b.sup+b.no]=b);LS.set("skj_b",Object.values(m).slice(-400))}
      $("#skjOut").innerHTML=`<p class="note">⏳ ${bills.length} बिल मिला रहे हैं…</p>`;V.R=await SKJ.check(bills);$("#skjOut").innerHTML=resHTML(V.R);return}
    if(t.closest("[data-skjcat]")){try{await navigator.clipboard.writeText(SKJ.catalogCode());toast("✓ सामान-सूची कॉपी — खरीद-बही → ⚙️ सामान-सूची में चिपकाएँ")}catch(err){toast("कॉपी नहीं हुआ")}return}
    if(t.closest("[data-skjplan]")){let bills;try{bills=SKJ.parse($("#skjIn").value)}catch(err){toast(err.message);return}$("#skjPlan").innerHTML=`<p class="note">⏳ जाँच रहे हैं…</p>`;V.P=await SKJ.plan(bills);$("#skjPlan").innerHTML=planHTML(V.P);return}
    if(t.closest("[data-skjgoimp]")){const b=t.closest("[data-skjgoimp]");b.disabled=true;let n=0,h=0;for(const P of V.P||[]){const ok=P.st==="new"||(P.st==="dup"&&S.isOwner&&($(`[data-skjforce="${P.id}"]`)||{}).checked);if(!ok)continue;
        try{const r=await SKJ.importOne(P);if(r==="ok"){P.st="made";n++}else{P.st="have";h++}}catch(err){P.err=err.code||err.message}}
      $("#skjPlan").innerHTML=planHTML(V.P);beep(true);toast(`✓ ${n} बिल ऐप में "बाज़ार खरीद" में — बिलिंग वाला गिनकर पक्का करे${h?` · ${h} पहले से थे`:""}`);return}
    if(t.closest("[data-skjcopy]")){const s=SKJ.text(V.R);try{await navigator.clipboard.writeText(s);toast("✓ कॉपी — Claude की चैट में चिपकाएँ")}catch(err){toast("कॉपी नहीं हुआ")}}}};
SKJ.settingsHTML=()=>own()?`<div class="card2" id="skjCard"><h3 style="margin:0 0 4px">🔍 खरीद-जाँच</h3><p class="note" style="margin:0 0 8px">Claude की खरीद-बही के असली बिल को साथियों की चढ़ाई खरीद से मिलाएँ — न चढ़ा बिल, अलग भाव/मात्रा, कम बिक्री भाव पकड़ में आएँगे।</p><button type="button" class="pri" data-skjopen>🔍 खरीद-जाँच खोलें</button></div>`:"";
document.addEventListener("click",e=>{if(e.target.closest("[data-skjopen]"))SKJ.open()});
const css=document.createElement("style");css.textContent=`.skj-k{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}.skj-k div{border:1.5px solid var(--line);border-radius:12px;padding:6px;text-align:center}.skj-k b{display:block;font-size:18px}.skj-k span{font-size:12px}.skj-k .ms b{color:#b91c1c}.skj-k .df b{color:#b45309}.skj-k .ok b{color:#0f766e}
.skj-b{border:1.5px solid var(--line);border-radius:12px;padding:8px;margin:6px 0}.skj-b.missing{border-color:#b91c1c88;background:#b91c1c0d}.skj-b.diff{border-color:#b4530988}.skj-h{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}.skj-h span{font-size:12.5px;color:var(--muted)}.skj-h i{font-style:normal;font-weight:700;margin-left:auto;font-size:12.5px}
.skj-w{color:#b91c1c;font-weight:700;font-size:12.5px}.skj-l{font-size:12.5px;padding:2px 0}.skj-l span{display:inline-block;margin:0 4px 2px 0;padding:0 6px;border-radius:6px;background:#b4530918;color:#92400e}`;document.head.appendChild(css);
})();
