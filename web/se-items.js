/* 🏆 SQ — सामान-वार रिपोर्ट (सिर्फ़ मालिक): किससे सबसे ज़्यादा कमाई, क्या सबसे तेज़ बिकता, 30 दिन से क्या नहीं बिका, किसमें मुनाफ़ा कम
   SF.fetchRange से बिल (दिन-वार एक बार पढ़े जाते हैं), वापसी घटाकर। */
(function(){
"use strict";
const SQ=window.SQ={open:false,days:30,res:null,busy:false};
const num=v=>{const n=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(n)?n:0};
const r2=v=>Math.round(v*100)/100;
const dAdd=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return today(x)};
const qOf=it=>+(S.pstock[it.id]&&S.pstock[it.id].qty)||0;

SQ.calc=async function(days){
  SQ.busy=true;const to=today(),from=dAdd(to,-(days-1));
  const B=(await SF.fetchRange(from,to)).filter(b=>!b.cancelled&&b.mode!=="inst");
  const M={};const g=(id,name,unit)=>M[id]||(M[id]={id,name,unit,qty:0,sale:0,cost:0,miss:0,days:new Set(),last:""});
  B.forEach(b=>(b.lines||[]).forEach(l=>{if(!l.id||l.id==="xyz")return;const o=g(l.id,l.name,l.unit);const c=SF.lineCost?SF.lineCost(l,b.date):num(l.cost);
    o.qty+=num(l.qty);o.sale+=l.free?0:num(l.amt);if(c>0)o.cost+=num(l.qty)*c;else o.miss+=l.free?0:num(l.amt);o.days.add(b.date);if(b.date>o.last)o.last=b.date}));
  (S.returns||[]).filter(r=>r.kind==="sale"&&!r.void&&r.date>=from&&r.date<=to).forEach(r=>(r.lines||[]).forEach(l=>{const o=M[l.id];if(!o)return;
    o.qty-=num(l.qty);o.sale-=num(l.amt);const it=item(l.id);const c=it?SF.costOf(it):0;if(c>0)o.cost-=num(l.qty)*c}));
  const od=(S.settings||{}).openDate;const eff=od&&od>from?Math.max(1,Math.round((new Date(to+"T12:00:00")-new Date(od+"T12:00:00"))/864e5)+1):days;/* ओपनिंग के बाद के दिन ही गिनो */
  const rows=Object.values(M).map(o=>{const it=item(o.id);const pf=r2(o.sale-o.miss-o.cost);const base=o.sale-o.miss;
    return {...o,it,qty:r2(o.qty),sale:r2(o.sale),pf,pct:base>0?Math.round(pf/base*100):null,perDay:r2(o.qty/eff),nd:o.days.size,stock:it&&it.track?qOf(it):null}}).filter(o=>o.qty>0||o.sale>0);
  const sold=new Set(rows.map(r=>r.id));
  const T=S.items.filter(i=>i.track&&i.active!==false&&!i.virtual);
  /* 30 दिन से नहीं बिका — हमेशा 30 दिन देखते हैं (या जितने दिन चुने, उससे ज़्यादा) */
  let dead=T.filter(it=>qOf(it)>0&&!sold.has(it.id));
  if(days<30){const B30=(await SF.fetchRange(dAdd(to,-29),to)).filter(b=>!b.cancelled);const s30=new Set();B30.forEach(b=>(b.lines||[]).forEach(l=>s30.add(l.id)));dead=T.filter(it=>qOf(it)>0&&!s30.has(it.id))}
  /* पुराना-नया: जो ओपनिंग/खरीद के बाद आया ही हाल में, उसे "नया" बताओ */
  dead=dead.map(it=>({it,qty:qOf(it),val:r2(qOf(it)*(SF.costOf(it)||0)),mrpVal:r2(qOf(it)*(+it.mrp||+it.sale||0)),newish:(it.addedTs&&Date.now()-it.addedTs<30*864e5)||(it.openTs&&Date.now()-it.openTs<30*864e5)}))
    .sort((a,b)=>b.val-a.val||b.mrpVal-a.mrpVal);
  const tot={sale:r2(rows.reduce((a,r)=>a+r.sale,0)),pf:r2(rows.reduce((a,r)=>a+r.pf,0)),miss:r2(rows.reduce((a,r)=>a+r.miss,0)),bills:B.length};
  SQ.res={days,from,to,rows,dead,tot,ts:Date.now()};SQ.busy=false;return SQ.res;
};
const tbl=(head,rows)=>`<div class="tblwrap"><table class="rrt"><thead><tr>${head.map((h,i)=>`<th${i?' class="r"':""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const td=v=>`<td class="r">${v}</td>`;
SQ.html=function(){if(!S.isOwner)return "";const R=SQ.res&&SQ.res.days===SQ.days?SQ.res:null;
  if(SQ.open&&!R&&!SQ.busy)SQ.calc(SQ.days).then(()=>{if(S.tab==="report"&&typeof renderReport==="function")renderReport()}).catch(()=>{SQ.busy=false});
  let body="";
  if(SQ.open&&!R)body='<p class="note">⏳ बिल गिने जा रहे हैं…</p>';
  else if(SQ.open&&R){
    const top=R.rows.filter(r=>r.pct!=null).sort((a,b)=>b.pf-a.pf).slice(0,10);
    const fast=R.rows.slice().sort((a,b)=>b.perDay-a.perDay).slice(0,10);
    const low=R.rows.filter(r=>r.pct!=null&&r.pct<10&&r.sale>0).sort((a,b)=>a.pct-b.pct).slice(0,8);
    const noC=R.rows.filter(r=>r.miss>0).length;
    body=`<div class="kpis" style="margin:6px 0"><div class="kpi"><span>${R.days} दिन की बिक्री</span><b>${rs(R.tot.sale)}</b></div><div class="kpi ${R.tot.pf<0?"red":""}"><span>मुनाफ़ा (पता वाले सामान का)</span><b>${rs(R.tot.pf)}</b></div></div>
    ${noC?`<p class="note" style="color:var(--chili);margin:0 0 6px">⚠ ${noC} सामान का खरीद भाव नहीं भरा — उनकी ${rs(R.tot.miss)} की बिक्री मुनाफ़े में नहीं गिनी</p>`:""}
    <h4 class="sq-h">💰 सबसे ज़्यादा कमाई</h4>${top.length?tbl(["सामान","बिका","बिक्री","मुनाफ़ा","%"],top.map(r=>`<tr><td>${esc(r.name)}</td>${td(fq(r.qty,r.unit))}${td(rs(r.sale))}${td("<b>"+rs(r.pf)+"</b>")}${td(r.pct+"%")}</tr>`)):'<p class="note">खरीद भाव भरने पर यहाँ दिखेगा</p>'}
    <h4 class="sq-h">🚀 सबसे तेज़ बिकने वाले</h4>${fast.length?tbl(["सामान","रोज़ औसत","कुल बिका","स्टॉक चलेगा"],fast.map(r=>{const d=r.stock!=null&&r.perDay>0?Math.floor(r.stock/r.perDay):null;
      return `<tr><td>${esc(r.name)}</td>${td(fq(r.perDay,r.unit))}${td(fq(r.qty,r.unit))}${td(d==null?"—":d<=3?`<b style="color:var(--chili)">${d} दिन ⚠</b>`:d+" दिन")}</tr>`})):'<p class="note">अभी कोई बिक्री नहीं</p>'}
    <h4 class="sq-h">🐢 30 दिन से नहीं बिका (${R.dead.length})</h4>${R.dead.length?tbl(["सामान","स्टॉक","लागत","MRP कीमत"],R.dead.slice(0,15).map(x=>`<tr><td>${esc(SE.capNm(x.it.name))}${x.newish?' <small class="note">(नया)</small>':""}</td>${td(fq(x.qty,x.it.unit))}${td(x.val?rs(x.val):"—")}${td(rs(x.mrpVal))}</tr>`))+
      `<p class="note" style="margin:4px 0 0">इसमें ${rs(r2(R.dead.reduce((a,x)=>a+x.val,0)))} का पैसा फँसा है — छूट देकर निकालें, या दुकान को लौटाएँ (खरीद → ↩️ माल लौटाया)</p>`:'<p class="note">सब माल बिक रहा है 👍</p>'}
    ${low.length?`<h4 class="sq-h">⚠ बहुत कम मुनाफ़ा (10% से कम)</h4>${tbl(["सामान","खरीद","बिक्री भाव","%"],low.map(r=>`<tr><td>${esc(r.name)}</td>${td(r.it?rs(SF.costOf(r.it)):"—")}${td(r.it?rs(+r.it.sale||0):"—")}${td(`<b style="color:var(--chili)">${r.pct}%</b>`)}</tr>`))}<p class="note" style="margin:4px 0 0">इनका भाव जाँचें — कहीं खरीद भाव गलत तो नहीं भरा, या बिक्री भाव बढ़ाना है</p>`:""}
    <a class="big ghost" style="display:block;text-align:center;text-decoration:none;margin-top:10px" target="_blank" rel="noopener" href="${waLink(SQ.text(),String((S.settings||{}).ownerPh||"9509553600").replace(/\D/g,"").slice(-10))}">🟢 यह रिपोर्ट WhatsApp पर</a>`}
  return `<div class="card2 rrc"><div class="rr-h"><h3 style="margin:0">🏆 सामान-वार मुनाफ़ा</h3><button class="lnk" data-sqopen>${SQ.open?"बंद करें":"खोलें ›"}</button></div>
    ${SQ.open?`<div class="bf-r" style="margin:6px 0">${[7,30,90].map(d=>`<button class="chip" data-sqd="${d}" aria-pressed="${SQ.days===d}">${d} दिन</button>`).join("")}</div>${body}`:'<p class="note" style="margin:4px 0 0">किससे सबसे ज़्यादा कमाई · क्या तेज़ बिकता · क्या 30 दिन से नहीं बिका</p>'}</div>`;
};
SQ.text=function(){const R=SQ.res;if(!R)return "";const top=R.rows.filter(r=>r.pct!=null).sort((a,b)=>b.pf-a.pf).slice(0,5),fast=R.rows.slice().sort((a,b)=>b.perDay-a.perDay).slice(0,5);
  return `🏆 *177 वेट कैंटीन — ${R.days} दिन, सामान-वार*\n${fdate(R.from)} से ${fdate(R.to)}\n────────\nबिक्री ${rs(R.tot.sale)} · मुनाफ़ा ${rs(R.tot.pf)}\n\n💰 सबसे ज़्यादा कमाई:\n`+top.map((r,i)=>`${i+1}. ${r.name} — ${rs(r.pf)} (${r.pct}%)`).join("\n")+
  `\n\n🚀 सबसे तेज़:\n`+fast.map((r,i)=>`${i+1}. ${r.name} — रोज़ ${fq(r.perDay,r.unit)}`).join("\n")+
  (R.dead.length?`\n\n🐢 30 दिन से नहीं बिका (${R.dead.length}):\n`+R.dead.slice(0,8).map(x=>`• ${x.it.name} — ${fq(x.qty,x.it.unit)}${x.val?" ("+rs(x.val)+")":""}`).join("\n"):"")};
document.addEventListener("click",e=>{
  if(e.target.closest("[data-sqopen]")){SQ.open=!SQ.open;renderReport();return}
  const d=e.target.closest("[data-sqd]");if(d){SQ.days=+d.dataset.sqd;renderReport();return}
});
const css=document.createElement("style");css.textContent=`.sq-h{margin:12px 0 6px;font-size:16px}`;document.head.appendChild(css);
})();
