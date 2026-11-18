
export const EPS = 1e-9;
export const lerp = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
export const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
const sub = (a,b) => [a[0]-b[0],a[1]-b[1]];
export const area = p => p.reduce((s,a,i)=>s+cross(a,p[(i+1)%p.length]),0)/2;
export function rectangle(r) { return [[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]]; }
export function validateRect(r) {
 if(r.length!==4 || r.some(x=>!Number.isFinite(x)||Math.abs(x)>1e6) || r[0]>=r[2] || r[1]>=r[3]) throw Error('Окно: задайте xmin < xmax и ymin < ymax; |координаты| ≤ 10⁶.');
 return r;
}
export function validatePolygon(input) {
 let p=input.map(x=>[...x]);
 if(p.length>1 && p[0][0]===p.at(-1)[0] && p[0][1]===p.at(-1)[1]) p.pop();
 if(p.length<3 || p.length>100 || p.some(x=>x.length!==2||x.some(v=>!Number.isFinite(v)||Math.abs(v)>1e6))) throw Error('Многоугольник: от 3 до 100 вершин, по две конечные координаты, |значения| ≤ 10⁶.');
 if(new Set(p.map(x=>x.join(','))).size!==p.length) throw Error('Вершины многоугольника не должны повторяться.');
 const ar=area(p); if(Math.abs(ar)<EPS) throw Error('Площадь многоугольника должна быть ненулевой.');
 if(ar<0) p.reverse();

 for(let i=0;i<p.length;i++) {
  const edge=sub(p[(i+1)%p.length],p[i]);
  for(const q of p) if(cross(edge,sub(q,p[i])) < -EPS) throw Error('Нужен выпуклый многоугольник без самопересечений; вершины перечисляются по контуру.');
 }
 return p;
}
export function regionCode(p,r) { return (p[0]<r[0]?1:0)|(p[0]>r[2]?2:0)|(p[1]<r[1]?4:0)|(p[1]>r[3]?8:0); }
const result = (segment,trace,extra={}) => ({segment,trace,...extra});
export function cohenSutherland(a,b,r) {
 let p=[...a],q=[...b]; const trace=[];
 for(let i=0;i<16;i++) {
  const ca=regionCode(p,r),cb=regionCode(q,r);
  trace.push({label:'Коды концов',detail:`A: ${ca.toString(2).padStart(4,'0')}; B: ${cb.toString(2).padStart(4,'0')}`,segment:[p,q]});
  if(!(ca|cb)) {trace.push({label:'Принять',detail:'Оба конца внутри.',segment:[p,q]}); return result([p,q],trace);}
  if(ca&cb) {trace.push({label:'Отклонить',detail:'Есть общий внешний полупространственный бит.',segment:[p,q]});return result(null,trace);}
  const c=ca||cb; let v,side; const dx=q[0]-p[0],dy=q[1]-p[1];

  if(c&8) {v=[p[0]+dx*(r[3]-p[1])/dy,r[3]];side='верхняя';}
  else if(c&4) {v=[p[0]+dx*(r[1]-p[1])/dy,r[1]];side='нижняя';}
  else if(c&2) {v=[r[2],p[1]+dy*(r[2]-p[0])/dx];side='правая';}
  else {v=[r[0],p[1]+dy*(r[0]-p[0])/dx];side='левая';}
  if(ca) p=v; else q=v;
  trace.push({label:`Пересечение: ${side} граница`,detail:`Новый конец (${v.map(x=>+x.toFixed(6)).join('; ')}).`,segment:[p,q]});
 }
 throw Error('Не удалось завершить отсечение из-за численной нестабильности.');
}
export function liangBarsky(a,b,r) {
 const dx=b[0]-a[0],dy=b[1]-a[1];
 const ps=[-dx,dx,-dy,dy],qs=[a[0]-r[0],r[2]-a[0],a[1]-r[1],r[3]-a[1]];
 const sides=['левая','правая','нижняя','верхняя']; let lo=0,hi=1;const trace=[];
 for(let i=0;i<4;i++) {
  const p=ps[i],q=qs[i]; let detail=`p = ${p}; q = ${q}. `;
  if(p===0) {
   if(q<0) {trace.push({label:sides[i],detail:detail+'Параллелен и снаружи: отклонить.',lo,hi,segment:[a,b]});return result(null,trace);}
   detail+='Параллелен и внутри: интервал не меняется.';
  } else {
   const t=q/p;if(p<0) lo=Math.max(lo,t);else hi=Math.min(hi,t);
   detail+=`q/p = ${+t.toFixed(6)}; tвх = ${+lo.toFixed(6)}; tвых = ${+hi.toFixed(6)}.`;
  }
  trace.push({label:sides[i],detail,lo,hi,segment:lo<=hi?[lerp(a,b,lo),lerp(a,b,hi)]:null});
  if(lo>hi) {trace.push({label:'Отклонить',detail:'Интервал параметра пуст.'});return result(null,trace);}
 }
 trace.push({label:'Принять',detail:`P(t), t ∈ [${lo}; ${hi}].`,segment:[lerp(a,b,lo),lerp(a,b,hi)]});
 return result([lerp(a,b,lo),lerp(a,b,hi)],trace,{lo,hi});
}
export function midpoint(a,b,r,tolerance=1e-7) {
 const trace=[],spans=[];let nodes=0;
 const visit=(l,h,depth)=>{
  nodes++;const p=lerp(a,b,l),q=lerp(a,b,h),ca=regionCode(p,r),cb=regionCode(q,r);
  let action;
  if(!(ca|cb)) {spans.push([l,h]);action='Принять внутреннюю часть';}
  else if(ca&cb) action='Отбросить: общий внешний бит';
  else if(Math.hypot(q[0]-p[0],q[1]-p[1])<=tolerance || depth>=52) {spans.push([l,h]);action='Граничный фрагмент: достигнута точность ε';}
  else action='Разделить пополам';
  trace.push({label:action,detail:`Глубина ${depth}; t ∈ [${l.toFixed(8)}; ${h.toFixed(8)}]; коды ${ca.toString(2).padStart(4,'0')}/${cb.toString(2).padStart(4,'0')}.`,segment:[p,q]});
  if(action==='Разделить пополам') {const m=(l+h)/2;visit(l,m,depth+1);visit(m,h,depth+1);}
 };
 visit(0,1,0);
 if(!spans.length) return result(null,trace,{tolerance,nodes});
 const lo=Math.min(...spans.map(x=>x[0])),hi=Math.max(...spans.map(x=>x[1]));
 const clamp=p=>[Math.max(r[0],Math.min(r[2],p[0])),Math.max(r[1],Math.min(r[3],p[1]))];
 const seg=[clamp(lerp(a,b,lo)),clamp(lerp(a,b,hi))];
 trace.push({label:'Объединить видимые интервалы',detail:`Точность по длине ≤ ${tolerance}. Граничные координаты прижаты к окну. Касания и промахи ближе ε численно неразличимы.`,segment:seg});
 return result(seg,trace,{tolerance,nodes});
}
export function cyrusBeck(a,b,polygon) { return cyrusBeckConvex(a,b,validatePolygon(polygon)); }

export function cyrusBeckConvex(a,b,clip) {
 const d=sub(b,a);let lo=0,hi=1;const trace=[];
 for(let i=0;i<clip.length;i++) {
  const v=clip[i],w=clip[(i+1)%clip.length],edge=sub(w,v),n=[-edge[1],edge[0]];
  const W=n[0]*(a[0]-v[0])+n[1]*(a[1]-v[1]),D=n[0]*d[0]+n[1]*d[1];
  let detail=`n = (${n}); W = ${W}; D = ${D}. `;
  if(D===0) {
   if(W<0) {trace.push({label:`Сторона ${i+1}: отклонить`,detail:detail+'Параллелен и снаружи.'});return result(null,trace);}
   detail+='Параллелен и внутри.';
  } else {
   const t=-W/D;if(D>0) lo=Math.max(lo,t);else hi=Math.min(hi,t);
   detail+=`t = ${+t.toFixed(6)}; интервал [${+lo.toFixed(6)}; ${+hi.toFixed(6)}].`;
  }
  trace.push({label:`Сторона ${i+1}`,detail,lo,hi,edge:[v,w],segment:lo<=hi?[lerp(a,b,lo),lerp(a,b,hi)]:null});
  if(lo>hi) return result(null,[...trace,{label:'Отклонить',detail:'Вход позже выхода: интервал пуст.'}]);
 }
 const seg=[lerp(a,b,lo),lerp(a,b,hi)];trace.push({label:'Принять',detail:`t ∈ [${lo}; ${hi}].`,segment:seg});
 return result(seg,trace,{lo,hi});
}
function dedupe(p) { const out=[]; for(const x of p) {const y=out.at(-1); if(!y||Math.hypot(x[0]-y[0],x[1]-y[1])>EPS) out.push(x);} if(out.length>1&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<=EPS) out.pop(); return out; }
export function sutherlandHodgman(subject,polygon) {
 let out=validatePolygon(subject);const clip=validatePolygon(polygon),trace=[];
 for(let i=0;i<clip.length;i++) {
  const a=clip[i],b=clip[(i+1)%clip.length],e=sub(b,a),input=out;out=[];const actions=[];
  for(let j=0;j<input.length;j++) {
   const s=input[(j+input.length-1)%input.length],p=input[j],fs=cross(e,sub(s,a)),fp=cross(e,sub(p,a));
   const ins=fs>=0,inp=fp>=0;
   if(ins!==inp) out.push(lerp(s,p,fs/(fs-fp)));
   if(inp) out.push(p);
   actions.push(`${ins?'внутри':'снаружи'} → ${inp?'внутри':'снаружи'}`);
  }
  out=dedupe(out);
  trace.push({label:`Полуплоскость ${i+1}`,detail:`${actions.join('; ') || 'Пустой результат'}. Вершин: ${out.length}.`,polygon:out.map(p=>[...p]),edge:[a,b]});
  if(!out.length) break;
 }
 return {polygon:out,trace};
}
export const lineAlgorithms={cohen:cohenSutherland,liang:liangBarsky,midpoint,cyrus:cyrusBeck};
export function parseRectText(text) {
 const rows=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.split('#')[0].trim()).filter(Boolean).map(x=>x.split(/\s+/).map(Number));
 if(!rows.length || rows[0].length!==1 || !Number.isInteger(rows[0][0]) || rows[0][0]<0 || rows[0][0]>1000) throw Error('Первая строка — целое число отрезков от 0 до 1000.');
 const n=rows[0][0];if(rows.length!==n+2) throw Error(`Ожидается ${n} строк отрезков и одна строка окна.`);
 const segments=rows.slice(1,n+1);if(segments.some(x=>x.length!==4||x.some(v=>!Number.isFinite(v)||Math.abs(v)>1e6))) throw Error('Каждый отрезок: x₁ y₁ x₂ y₂; |значения| ≤ 10⁶.');
 return {segments:segments.map(x=>[x.slice(0,2),x.slice(2)]),rect:validateRect(rows.at(-1))};
}
export function parseVertices(text) {return validatePolygon(text.trim().split(/\n/).filter(x=>x.trim()).map(x=>x.trim().split(/[\s,;]+/).map(Number)));}
