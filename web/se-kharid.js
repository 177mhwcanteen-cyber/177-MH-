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
const STT={ok:"✅ ऐप में चढ़ा",diff:"⚠ चढ़ा, पर फ़र्क़",missing:"❌ ऐप में नहीं चढ़ा"};
function resHTML(R){if(!R)return "";const n=k=>R.filter(r=>r.st===k).length;
  return `<div class="skj-k"><div class="ok"><b>${n("ok")}</b><span>✅ सही</span></div><div class="df"><b>${n("diff")}</b><span>⚠ फ़र्क़</span></div><div class="ms"><b>${n("missing")}</b><span>❌ नहीं चढ़े</span></div></div>
  ${R.sort((a,b)=>({missing:0,diff:1,ok:2}[a.st]-{missing:0,diff:1,ok:2}[b.st])).map(r=>`<div class="skj-b ${r.st}"><div class="skj-h"><b>${esc(r.b.sup)} #${esc(r.b.no)}</b><span>${fdate?fdate(r.b.date):r.b.date} · ${rs(r.b.total)}</span><i>${STT[r.st]}</i></div>
    ${r.m?`<p class="note" style="margin:2px 0">ऐप में: ${esc(r.m.kind)} · ${esc(r.m.sup)} · ${fdate?fdate(r.m.date):r.m.date} · ${rs(r.m.total)} · चढ़ाया ${esc(r.m.by||"—")}${Math.abs(r.m.total-r.b.total)>2?` · <b class="skj-w">रकम में फ़र्क़ ${rs(Math.round((r.m.total-r.b.total)*100)/100)}</b>`:""}</p>`:`<p class="skj-w" style="margin:2px 0">यह बिल किसी साथी ने ऐप में नहीं चढ़ाया — स्टॉक और हिसाब अधूरा है।</p>`}
    ${r.rows.filter(x=>x.warn.length).map(x=>`<div class="skj-l"><b>${esc(x.nm)}</b> ${x.warn.map(w=>`<span>${esc(w)}</span>`).join("")}</div>`).join("")}</div>`).join("")}
  <button type="button" class="big ghost" data-skjcopy>📋 नतीजा कॉपी करें (Claude को भेजें)</button>`}
SKJ.text=R=>(R||[]).map(r=>`${STT[r.st]} — ${r.b.sup} #${r.b.no} (${r.b.date}, ₹${r.b.total})${r.m?` · ऐप: ${r.m.kind} ₹${r.m.total} by ${r.m.by}`:""}${r.rows.filter(x=>x.warn.length).map(x=>`\n   • ${x.nm}: ${x.warn.join("; ")}`).join("")}`).join("\n");
const V={R:null};
SKJ.open=function(){if(!own()){toast("सिर्फ़ विक्रम जी");return}const B=LS.get("skj_b",[]);
  $("#sheet").innerHTML=`<div class="scrim" data-close><div class="sheet px" id="skjSheet" role="dialog" aria-label="खरीद-जाँच"><div class="grab"></div>
  <div class="sh-head"><h3 style="font-size:17px">🔍 खरीद-जाँच — असली बिल बनाम ऐप</h3><button class="x" data-close aria-label="बंद करें">✕</button></div>
  <p class="note" style="margin:0 0 6px">Claude की "खरीद-बही" → 🔍 ऐप से मिलान → कोड कॉपी → यहाँ चिपकाएँ। ${B.length?`इस फोन में ${B.length} बिल याद हैं।`:""}</p>
  <textarea id="skjIn" class="inp" rows="4" placeholder='{"app":"mh177-kharid","bills":[…]}' style="width:100%;font:12px monospace"></textarea>
  <div style="display:flex;gap:6px;margin:6px 0"><button type="button" class="pri big" data-skjgo>🔍 मिलान करें</button>${B.length?`<button type="button" class="big ghost" data-skjold>♻️ याद वाले ${B.length} बिल फिर जाँचें</button>`:""}</div>
  <div id="skjOut">${resHTML(V.R)}</div></div></div>`;
  const sh=$("#sheet");
  sh.onclick=async e=>{const t=e.target;if(t.matches("[data-close]")){closeSheet();return}
    if(t.closest("[data-skjgo]")||t.closest("[data-skjold]")){let bills;try{bills=t.closest("[data-skjold]")?LS.get("skj_b",[]):SKJ.parse($("#skjIn").value)}catch(err){toast(err.message);return}
      if(!t.closest("[data-skjold]")){const m={};LS.get("skj_b",[]).concat(bills).forEach(b=>m[b.id||b.sup+b.no]=b);LS.set("skj_b",Object.values(m).slice(-400))}
      $("#skjOut").innerHTML=`<p class="note">⏳ ${bills.length} बिल मिला रहे हैं…</p>`;V.R=await SKJ.check(bills);$("#skjOut").innerHTML=resHTML(V.R);return}
    if(t.closest("[data-skjcopy]")){const s=SKJ.text(V.R);try{await navigator.clipboard.writeText(s);toast("✓ कॉपी — Claude की चैट में चिपकाएँ")}catch(err){toast("कॉपी नहीं हुआ")}}}};
SKJ.settingsHTML=()=>own()?`<div class="card2" id="skjCard"><h3 style="margin:0 0 4px">🔍 खरीद-जाँच</h3><p class="note" style="margin:0 0 8px">Claude की खरीद-बही के असली बिल को साथियों की चढ़ाई खरीद से मिलाएँ — न चढ़ा बिल, अलग भाव/मात्रा, कम बिक्री भाव पकड़ में आएँगे।</p><button type="button" class="pri" data-skjopen>🔍 खरीद-जाँच खोलें</button></div>`:"";
document.addEventListener("click",e=>{if(e.target.closest("[data-skjopen]"))SKJ.open()});
const css=document.createElement("style");css.textContent=`.skj-k{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}.skj-k div{border:1.5px solid var(--line);border-radius:12px;padding:6px;text-align:center}.skj-k b{display:block;font-size:18px}.skj-k span{font-size:12px}.skj-k .ms b{color:#b91c1c}.skj-k .df b{color:#b45309}.skj-k .ok b{color:#0f766e}
.skj-b{border:1.5px solid var(--line);border-radius:12px;padding:8px;margin:6px 0}.skj-b.missing{border-color:#b91c1c88;background:#b91c1c0d}.skj-b.diff{border-color:#b4530988}.skj-h{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}.skj-h span{font-size:12.5px;color:var(--muted)}.skj-h i{font-style:normal;font-weight:700;margin-left:auto;font-size:12.5px}
.skj-w{color:#b91c1c;font-weight:700;font-size:12.5px}.skj-l{font-size:12.5px;padding:2px 0}.skj-l span{display:inline-block;margin:0 4px 2px 0;padding:0 6px;border-radius:6px;background:#b4530918;color:#92400e}`;document.head.appendChild(css);
})();
