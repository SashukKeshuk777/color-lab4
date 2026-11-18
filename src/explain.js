(()=>{
 const root=document.getElementById('wd-cyrus-demo-14');if(!root)return;
 const q=s=>root.querySelector(s),qa=s=>[...root.querySelectorAll(s)],v=name=>q(`[data-value="${name}"]`);
 const state={a:[-12,-2],b:[12,4],polygon:[[-6,-4],[4,-5],[8,1],[3,6],[-5,5]],edge:4,t:0};
 let plotMap=null,drag=null,animation=null,lastTime=0,polygonKey='';
 const EPS=1e-9,sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
 const point=t=>[state.a[0]+t*(state.b[0]-state.a[0]),state.a[1]+t*(state.b[1]-state.a[1])];
 const fmt=n=>!Number.isFinite(n)?'—':Math.abs(n)<5e-9?'0':Number(n.toFixed(6)).toLocaleString('ru-RU',{maximumFractionDigits:6});
 const pair=p=>`(${p.map(fmt).join('; ')})`;
 function values(){
  const direction=sub(state.b,state.a);let lo=0,hi=1,parallelOutside=false;
  const rows=state.polygon.map((a,i)=>{
   const b=state.polygon[(i+1)%state.polygon.length],e=sub(b,a),n=[-e[1],e[0]],W=dot(n,sub(state.a,a)),D=dot(n,direction);
   const tolerance=Number.EPSILON*32*Math.max(1,Math.hypot(...n)*Math.hypot(...direction));
   const parallel=Math.abs(D)<=tolerance,t=parallel?null:-W/D;
   if(parallel){if(W < -EPS)parallelOutside=true;}else if(D>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
   return {i,a,b,e,n,W,D,t,parallel,lo,hi,empty:parallelOutside||lo>hi+EPS};
  });
  const empty=parallelOutside||lo>hi+EPS;
  if(!empty&&lo>hi){lo=hi=(lo+hi)/2;}
  return {rows,lo,hi,empty,direction};
 }
 function save(){
  const r=values(),active=r.rows[state.edge];
  if(window.openai?.setWidgetState)window.openai.setWidgetState({modelContent:{A:state.a,B:state.b,side:state.edge+1,W:active.W,D:active.D,t:state.t,visibleInterval:r.empty?null:[r.lo,r.hi]},privateContent:{a:state.a,b:state.b,polygon:state.polygon,edge:state.edge,t:state.t}}).catch(()=>{});
 }
 function restore(raw){
  const s=raw?.privateContent||raw;if(!s)return;
  if(Array.isArray(s.a)&&s.a.length===2&&s.a.every(Number.isFinite))state.a=[...s.a];
  if(Array.isArray(s.b)&&s.b.length===2&&s.b.every(Number.isFinite))state.b=[...s.b];
  if(Array.isArray(s.polygon)&&s.polygon.length>=3&&s.polygon.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))state.polygon=s.polygon.map(p=>[...p]);
  if(Number.isInteger(s.edge))state.edge=Math.max(0,Math.min(state.polygon.length-1,s.edge));
  if(Number.isFinite(s.t))state.t=Math.max(0,Math.min(1,s.t));
 }
 function stop(){if(animation!==null)cancelAnimationFrame(animation);animation=null;q('[data-role="play"]').textContent='Анимация';}
 function syncControls(){
  for(const [key,p,index] of [['ax','a',0],['ay','a',1],['bx','b',0],['by','b',1]]){
   const input=q(`[data-coordinate="${key}"]`);if(document.activeElement!==input)input.value=state[p][index];
  }
  const key=JSON.stringify(state.polygon);
  if(key!==polygonKey){polygonKey=key;q('[data-role="edge"]').replaceChildren(...state.polygon.map((_,i)=>new Option(`V${i+1} → V${(i+1)%state.polygon.length+1}`,i)));}
  q('[data-role="edge"]').value=state.edge;q('[data-role="t"]').value=state.t;v('t').textContent=fmt(state.t);
 }
 function crossingKind(r){
  if(r.parallel)return r.W < -EPS?'Параллельный снаружи':Math.abs(r.W)<=EPS?'На прямой стороны':'Параллельный внутри';
  if(r.t < -EPS||r.t > 1+EPS)return 'Вне отрезка AB';
  const p=point(r.t),u=dot(sub(p,r.a),r.e)/dot(r.e,r.e);
  return u>=-EPS&&u<=1+EPS?'На стороне окна':'На продолжении стороны';
 }
 function render(full=true){
  const all=values(),r=all.rows[state.edge],p=point(state.t),F=r.W+r.D*state.t;
  syncControls();
  if(full){
   v('W').textContent=fmt(r.W);v('D').textContent=fmt(r.D);v('crossing').textContent=r.t===null?'—':fmt(r.t);
   v('position').textContent=r.W < -EPS?'A снаружи полуплоскости':r.W>EPS?'A внутри полуплоскости':'A на границе';
   v('direction').textContent=r.parallel?'Параллельно':r.D>0?'Вход в полуплоскость':'Выход из полуплоскости';v('crossing-kind').textContent=crossingKind(r);
   q('[data-role="vectors"]').replaceChildren(...[`V${r.i+1} = ${pair(r.a)}`,`e = ${pair(r.e)}`,`n = ${pair(r.n)}`,`B − A = ${pair(all.direction)}`].map(s=>{const span=document.createElement('span');span.textContent=s;return span;}));
   q('[data-role="rows"]').replaceChildren(...all.rows.map(row=>{
    const tr=document.createElement('tr');tr.setAttribute('aria-selected',String(row.i===state.edge));
    const cell=document.createElement('td'),button=document.createElement('button');button.type='button';button.className='btn btn-ghost wd-row-edge';button.textContent=`${row.i+1}`;button.setAttribute('aria-label',`Сторона ${row.i+1}`);button.setAttribute('aria-pressed',String(row.i===state.edge));button.onclick=()=>{stop();state.edge=row.i;render();save();};cell.append(button);tr.append(cell);
    const restriction=row.parallel?(row.W < -EPS?'Отклонить':'Без ограничения'):`t ${row.D>0?'≥':'≤'} ${fmt(row.t)}`;
    [pair(row.n),fmt(row.W),fmt(row.D),row.t===null?'—':fmt(row.t),restriction,row.empty?'∅':`[${fmt(row.lo)}; ${fmt(row.hi)}]`].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});return tr;
   }));
   q('[data-role="result"]').textContent=all.empty?'Видимая часть: ∅':`tвх = ${fmt(all.lo)}; tвых = ${fmt(all.hi)} · A′ ${pair(point(all.lo))}; B′ ${pair(point(all.hi))}`;
  }
  q('[data-role="point-values"]').textContent=`P(t) = ${pair(p)} · F(t) = ${fmt(F)} · ${Math.abs(F)<=EPS?'на прямой стороны':F>0?'внутренняя полуплоскость':'внешняя полуплоскость'}`;
  draw(all,r,p);
 }
 function draw(all,r,current){
  const svg=q('svg'),width=Math.floor(q('.wd-plot').getBoundingClientRect().width);if(width<50)return;
  const height=width<480?310:390,margin={left:45,right:24,top:22,bottom:40};
  const mid=[(r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2],normalEnd=[mid[0]+r.n[0],mid[1]+r.n[1]];
  const pts=[...state.polygon,state.a,state.b,normalEnd],xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,dx=Math.max(6,maxX-minX)*1.25,dy=Math.max(6,maxY-minY)*1.3;
  const scale=Math.min((width-margin.left-margin.right)/dx,(height-margin.top-margin.bottom)/dy);
  const middle=[(margin.left+width-margin.right)/2,(margin.top+height-margin.bottom)/2];
  const scr=p=>[middle[0]+(p[0]-cx)*scale,middle[1]-(p[1]-cy)*scale];
  const invert=p=>[(p[0]-middle[0])/scale+cx,(middle[1]-p[1])/scale+cy];plotMap={invert,scale,width,height};
  const lower=invert([margin.left,height-margin.bottom]),upper=invert([width-margin.right,margin.top]);
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.height=height+'px';
  const path=ps=>ps.map((p,i)=>`${i?'L':'M'}${scr(p).join(',')}`).join(' '),line=(a,b,attrs='')=>`<path d="${path([a,b])}" fill="none" ${attrs}/>`;
  const text=(p,label,attrs='')=>{const [x,y]=scr(p);return `<text x="${Math.max(margin.left+3,Math.min(width-margin.right-3,x))}" y="${Math.max(margin.top+13,Math.min(height-margin.bottom-4,y))}" ${attrs}>${label}</text>`;};
  let shade=[[lower[0],lower[1]],[upper[0],lower[1]],[upper[0],upper[1]],[lower[0],upper[1]]],clipped=[];
  for(let i=0;i<shade.length;i++){
   const a=shade[(i+shade.length-1)%shade.length],b=shade[i],fa=dot(r.n,sub(a,r.a)),fb=dot(r.n,sub(b,r.a));
   if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}if(fb>=0)clipped.push(b);
  }
  const clipId='wd-geometry-clip',markerId='wd-normal-arrow';
  let html=`<title>Кирус–Бек</title><desc>Сторона ${r.i+1}. W ${fmt(r.W)}, D ${fmt(r.D)}. ${crossingKind(r)}. Концы A и B доступны для перетаскивания и численного ввода.</desc><defs><clipPath id="${clipId}"><rect x="${margin.left}" y="${margin.top}" width="${width-margin.left-margin.right}" height="${height-margin.top-margin.bottom}"/></clipPath><marker id="${markerId}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="var(--wd-edge)"/></marker></defs><rect data-chart-frame x="${margin.left}" y="${margin.top}" width="${width-margin.left-margin.right}" height="${height-margin.top-margin.bottom}" fill="none" stroke="var(--border)" stroke-width="1"/><g clip-path="url(#${clipId})">`;
  if(clipped.length)html+=`<path d="${path(clipped)} Z" fill="var(--wd-edge)" fill-opacity="0.06"/>`;
  const spanX=upper[0]-lower[0],spanY=upper[1]-lower[1];
  const niceStep=span=>{const base=10**Math.floor(Math.log10(span));return [1,2,5,10].map(v=>v*base).find(v=>v>=span);};
  const xStep=niceStep(spanX/(width<480?3:6)),yStep=niceStep(spanY/5);
  const tick=n=>Math.abs(n)>=10000?Number(n.toPrecision(2)).toExponential().replace('e+','e'):fmt(n);
  for(let x=Math.ceil(lower[0]/xStep)*xStep;x<=upper[0];x+=xStep)html+=line([x,lower[1]],[x,upper[1]],'stroke="var(--border)" stroke-width="0.6"');
  for(let y=Math.ceil(lower[1]/yStep)*yStep;y<=upper[1];y+=yStep)html+=line([lower[0],y],[upper[0],y],'stroke="var(--border)" stroke-width="0.6"');
  if(lower[1]<=0&&upper[1]>=0)html+=line([lower[0],0],[upper[0],0],'stroke="var(--muted-foreground)" stroke-opacity="0.5"');
  if(lower[0]<=0&&upper[0]>=0)html+=line([0,lower[1]],[0,upper[1]],'stroke="var(--muted-foreground)" stroke-opacity="0.5"');
  html+=`<path d="${path(state.polygon)} Z" fill="var(--wd-visible)" fill-opacity="0.035" stroke="var(--muted-foreground)" stroke-width="1.5"/>`;
  const eLength=Math.hypot(...r.e),ext=Math.max(spanX,spanY)*3/eLength;
  html+=line([r.a[0]-r.e[0]*ext,r.a[1]-r.e[1]*ext],[r.a[0]+r.e[0]*ext,r.a[1]+r.e[1]*ext],'stroke="var(--wd-edge)" stroke-width="1.2" stroke-dasharray="5 5"');
  html+=line(r.a,r.b,'stroke="var(--wd-edge)" stroke-width="3"');

  html+=line(mid,normalEnd,`stroke="var(--wd-edge)" stroke-width="2" marker-end="url(#${markerId})"`);
  html+=line(state.a,state.b,'stroke="var(--wd-source)" stroke-width="2" stroke-dasharray="6 4"');
  if(!all.empty)html+=line(point(all.lo),point(all.hi),'stroke="var(--wd-visible)" stroke-width="5"');
  if(r.t!==null&&r.t>=-EPS&&r.t<=1+EPS){const [x,y]=scr(point(r.t));html+=`<path d="M${x},${y-6} L${x+6},${y} L${x},${y+6} L${x-6},${y} Z" fill="var(--wd-cross)" stroke="var(--background)" stroke-width="1.5"/>`;}
  for(const [label,p] of [['A',state.a],['B',state.b]]){const [x,y]=scr(p);html+=`<g data-drag="${label.toLowerCase()}"><circle cx="${x}" cy="${y}" r="22" fill="transparent"/><circle cx="${x}" cy="${y}" r="5" fill="var(--foreground)" stroke="var(--background)" stroke-width="1.5"/></g>`;}
  const [px,py]=scr(current);html+=`<circle cx="${px}" cy="${py}" r="6" fill="var(--background)" stroke="var(--foreground)" stroke-width="2" pointer-events="none"/>`;
  html+='</g>';
  for(let x=Math.ceil(lower[0]/xStep)*xStep;x<=upper[0];x+=xStep){const [px]=scr([x,0]);html+=`<text x="${px}" y="${height-margin.bottom+18}" text-anchor="middle" class="wd-axis-text">${tick(x)}</text>`;}
  for(let y=Math.ceil(lower[1]/yStep)*yStep;y<=upper[1];y+=yStep){const [,py]=scr([0,y]);html+=`<text x="${margin.left-7}" y="${py+4}" text-anchor="end" class="wd-axis-text">${tick(y)}</text>`;}
  html+=`<text class="axis-title" data-axis="x" x="${width-margin.right}" y="${height-4}" text-anchor="end">x</text><text class="axis-title" data-axis="y" x="${margin.left-25}" y="14">y</text>`;
  html+=text(normalEnd,'n','dx="8" dy="-6"');
  for(const [label,p] of [['A',state.a],['B',state.b]])html+=text(p,label,p[0]>cx?'dx="-9" dy="-10" text-anchor="end"':'dx="9" dy="-10"');
  if(r.t!==null&&r.t>=-EPS&&r.t<=1+EPS)html+=text(point(r.t),'I','dx="-10" dy="17" text-anchor="end"');
  html+=text(current,'P(t)',state.t<.04||state.t>.96?'dx="8" dy="24" pointer-events="none"':'dx="8" dy="-12" pointer-events="none"');
  if(!all.empty){html+=text(point(all.lo),'A′','dx="8" dy="22"');html+=text(point(all.hi),'B′','dx="8" dy="22"');}
  svg.innerHTML=html;
 }
 qa('[data-coordinate]').forEach(input=>input.addEventListener('input',()=>{
  const n=input.valueAsNumber;if(!Number.isFinite(n)||Math.abs(n)>1e6)return;stop();const key=input.dataset.coordinate;state[key[0]][key[1]==='x'?0:1]=n;render();
 }));
 qa('[data-coordinate]').forEach(input=>input.addEventListener('change',()=>{render();save();}));
 q('[data-role="edge"]').addEventListener('change',e=>{stop();state.edge=Number(e.target.value);render();save();q('[data-role="live"]').textContent=`Сторона ${state.edge+1}. W ${v('W').textContent}. D ${v('D').textContent}.`;});
 q('[data-role="t"]').addEventListener('input',e=>{stop();state.t=Number(e.target.value);render(false);});
 q('[data-role="t"]').addEventListener('change',()=>save());
 q('[data-role="play"]').addEventListener('click',()=>{
  if(animation!==null){stop();save();return;}
  if(state.t>=1)state.t=0;lastTime=0;q('[data-role="play"]').textContent='Пауза';
  const tick=time=>{if(lastTime)state.t=Math.min(1,state.t+(time-lastTime)/6000);lastTime=time;render(false);if(state.t<1)animation=requestAnimationFrame(tick);else{stop();save();}};
  animation=requestAnimationFrame(tick);
 });
 const svg=q('svg');
 svg.addEventListener('pointerdown',e=>{const target=e.target.closest('[data-drag]');if(!target)return;stop();drag=target.dataset.drag;svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag||!plotMap)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());const value=plotMap.invert([local.x,local.y]).map(v=>Math.max(-1e6,Math.min(1e6,Math.round(v*100)/100)));state[drag]=value;render();});
 svg.addEventListener('pointerup',()=>{if(drag){drag=null;save();}});svg.addEventListener('pointercancel',()=>drag=null);
 window.addEventListener('openai:set_globals',e=>{if(e.detail?.globals?.widgetState){stop();restore(e.detail.globals.widgetState);render();}});
 window.addEventListener('wd:geometry',e=>{stop();restore(e.detail);render();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 new ResizeObserver(()=>render(false)).observe(q('.wd-plot'));
 restore(window.openai?.widgetState);if(root.dataset.geometry){try{restore(JSON.parse(root.dataset.geometry));}catch{}}render();
})();
