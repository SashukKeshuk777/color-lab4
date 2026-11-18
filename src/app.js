import {lineAlgorithms,cyrusBeckConvex,sutherlandHodgman,parseRectText,parseVertices,rectangle,validateRect,lerp} from './algorithms.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const names={liang:'Лианг–Барски',cohen:'Сазерленд–Коэн',midpoint:'Средняя точка',cyrus:'Кирус–Бек',polygon:'Сазерленд–Ходжман'};
const examples={mixed:'6\n-12 -2 12 4\n-2 -1 3 2\n-12 9 12 9\n0 -10 0 10\n-12 4 12 -4\n-10 -8 -8 -6\n-6 -4 6 4',boundary:'7\n-10 4 10 4\n-6 -8 -6 8\n-10 0 -2 8\n0 0 0 0\n9 9 9 9\n-10 -8 10 8\n10 0 -10 0\n-6 -4 6 4',outside:'3\n-10 7 10 7\n8 -10 8 10\n-10 -8 -9 -7\n-6 -4 6 4'};
const state={part:1,algorithm:'liang',segments:[],rect:[],clip:[],subject:[],results:[],selected:0,step:0,width:800,height:470,scale:25,center:[0,0],timer:null,pending:null,hasData:false};
const canvas=$('#plot'),ctx=canvas.getContext('2d');
const fmt=x=>Number(x.toFixed(6)).toLocaleString('ru-RU',{maximumFractionDigits:6}),point=p=>`(${p.map(fmt).join('; ')})`;
const screen=p=>[state.width/2+(p[0]-state.center[0])*state.scale,state.height/2-(p[1]-state.center[1])*state.scale];
const world=(x,y)=>[(x-state.width/2)/state.scale+state.center[0],(state.height/2-y)/state.scale+state.center[1]];
const stop=()=>{clearInterval(state.timer);state.timer=null;$('#play').textContent='Пуск';};
function variantSetup() {
 const v=Number($('#variant').value),key=['midpoint','cohen','liang'][v%3];
 $('#variant-note').textContent=`${names[key]} + ${v%2?'отсечение многоугольника':'отрезки выпуклым окном'}.`;
 $('#part2').textContent=`Часть 2 · ${v%2?'Многоугольник':'Отрезки выпуклым окном'}`;
 setPart(state.part);
}
function setPart(part) {
 $('#wd-panel').hidden=true;$('#workspace').hidden=false;$('#wd-mode').classList.remove('active');$('#wd-mode').setAttribute('aria-pressed','false');
 stop();state.part=part;state.pending=null;$('#status').textContent='';
 const v=Number($('#variant').value),keys=part===1?['liang','cohen','midpoint']:['cyrus','polygon'];
 $('#algorithm').replaceChildren(...keys.map(k=>new Option(names[k],k)));
 $('#algorithm').value=part===1?['midpoint','cohen','liang'][v%3]:v%2?'polygon':'cyrus';
 $('#part1').classList.toggle('active',part===1);$('#part2').classList.toggle('active',part===2);
 $('#part1').setAttribute('aria-pressed',part===1);$('#part2').setAttribute('aria-pressed',part===2);
 configure();build(true);
}
function configure() {
 state.algorithm=$('#algorithm').value;
 $('#format-note').textContent=state.part===1?'Первая строка: n. Далее n строк: x₁ y₁ x₂ y₂. Последняя: xmin ymin xmax ymax. Дробные числа — с точкой.':'Формат TXT тот же: n, строки отрезков, строка прямоугольника. В части 2 прямоугольник не используется: отсекающее окно задаётся вершинами ниже.';
 $('#clip-fields').hidden=state.part===1;$('#subject-fields').hidden=state.algorithm!=='polygon';
 $('#midpoint-fields').hidden=state.algorithm!=='midpoint';
 $('#segments').disabled=state.algorithm==='polygon';$('#add-mode').disabled=state.algorithm==='polygon';
 if(state.algorithm==='polygon') {$('#add-mode').checked=false;canvas.classList.remove('adding');}
 $('#selection-label').hidden=state.algorithm==='polygon';
 $('#method-note').textContent=({liang:'Четыре неравенства уточняют вход и выход на отрезке.',cohen:'Коды положения и пересечения с границами прямоугольника.',midpoint:'Деление неопределённых фрагментов пополам; приближённый метод.',cyrus:'Каждая сторона выпуклого окна уточняет интервал видимости.',polygon:'Последовательное отсечение полуплоскостями выпуклого окна.'})[state.algorithm];
}
function build(autoFit=false) {
 stop();
 try {
  const input=state.algorithm==='polygon'?{segments:[],rect:state.rect.length?state.rect:[-6,-4,6,4]}:parseRectText($('#segments').value);
  const clip=state.part===1?rectangle(input.rect):parseVertices($('#clip').value);
  const subject=state.algorithm==='polygon'?parseVertices($('#subject').value):[];
  const epsilon=Number($('#epsilon').value);if(state.algorithm==='midpoint'&&(!Number.isFinite(epsilon)||epsilon<1e-8||epsilon>.01)) throw Error('Точность ε должна быть от 10⁻⁸ до 0.01.');
  const results=state.algorithm==='polygon'?[sutherlandHodgman(subject,clip)]:input.segments.map(([a,b])=>state.algorithm==='cyrus'?cyrusBeckConvex(a,b,clip):lineAlgorithms[state.algorithm](a,b,input.rect,epsilon));
  Object.assign(state,{...input,clip,subject,results,hasData:true,pending:null,selected:Math.min(state.selected,Math.max(0,results.length-1))});
  $('#error').textContent='';$('#status').textContent='Вычисления обновлены.';
  $('#selected').replaceChildren(...results.map((r,i)=>new Option(`${i+1}: ${r.segment?'виден':'скрыт'}`,i)));$('#selected').value=state.selected;
  state.step=Math.max(0,currentTrace().length-1);renderResults();renderStep();if(autoFit) fit();else draw();
 } catch(error) {$('#error').textContent=error.message;$('#status').textContent='На рисунке остаётся последний успешно рассчитанный набор.';}
}
const currentResult=()=>state.results[state.selected];
const currentTrace=()=>currentResult()?.trace||[];
function renderResults() {
 $('#plot-title').textContent=names[state.algorithm];
 const poly=state.algorithm==='polygon',visible=state.results.filter(x=>x.segment).length;
 $('#summary').textContent=poly?`Вершин результата: ${state.results[0]?.polygon.length||0}`:`Видимых отрезков: ${visible} из ${state.segments.length}`;
 $('#result-head').innerHTML=poly?'<tr><th>Вершина</th><th>x</th><th>y</th></tr>':'<tr><th>№</th><th>Начало</th><th>Конец</th><th>Состояние</th></tr>';
 const rows=poly?(state.results[0]?.polygon||[]).map((p,i)=>[i+1,...p.map(fmt)]):state.results.map((r,i)=>[i+1,r.segment?point(r.segment[0]):'—',r.segment?point(r.segment[1]):'—',r.segment?'Виден':'Скрыт']);
 $('#result-body').replaceChildren(...rows.map(values=>{const tr=document.createElement('tr');values.forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});return tr;}));
 $('#result-note').textContent=(poly&&!rows.length?'Пересечение пусто. ':'')+(state.algorithm==='midpoint'?`Приближённый метод; ε = ${$('#epsilon').value}. Возможна погрешность граничных точек до ε. `:'')+'Координаты показаны с округлением до 6 знаков; JSON сохраняет вычисленную точность. Граница включена.';
}
function setStep(n) {state.step=Math.max(0,Math.min(currentTrace().length-1,n));renderStep();draw();}
function renderStep() {
 const trace=currentTrace(),frame=trace[state.step];
 $('#step').max=Math.max(0,trace.length-1);$('#step').value=state.step;$('#step-label').textContent=trace.length?`${state.step+1} / ${trace.length}`:'0 / 0';
 $('#step-detail').textContent=frame?`${frame.label}. ${frame.detail}`:'Отрезки отсутствуют.';
 ['first','prev','play','next','last','step'].forEach(id=>{$('#'+id).disabled=!trace.length;});
 const start=Math.max(0,Math.min(state.step-3,trace.length-7));
 $('#trace-body').replaceChildren(...trace.slice(start,start+7).map((f,i)=>{
  const tr=document.createElement('tr');tr.dataset.step=start+i;tr.classList.toggle('selected',state.step===start+i);
  [start+i+1,f.label,f.detail].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});return tr;
 }));
 $('#interval').hidden=!frame||frame.lo===undefined||frame.lo>frame.hi;
 if(!$('#interval').hidden){const lo=Math.max(0,frame.lo),hi=Math.min(1,frame.hi);$('#interval-fill').style.left=`${lo*100}%`;$('#interval-fill').style.width=`${Math.max(0,hi-lo)*100}%`;}
}
function fit() {
 const points=[...state.clip,...state.subject,...state.segments.flat()];if(!points.length)return;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 points.forEach(([x,y])=>{minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);});
 state.center=[(minX+maxX)/2,(minY+maxY)/2];state.scale=Math.max(.00001,Math.min(10000,(state.width-90)/Math.max(4,maxX-minX),(state.height-80)/Math.max(4,maxY-minY)));draw();
}
function path(points,color,width=2,dash=[],closed=false,fill=null) {
 if(!points?.length)return;ctx.beginPath();points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...screen(p)));if(closed&&points.length>2)ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
 if(points.length===1 || points.length===2&&Math.hypot(points[0][0]-points[1][0],points[0][1]-points[1][1])<1e-10){ctx.fillStyle=color;ctx.beginPath();ctx.arc(...screen(points[0]),4,0,Math.PI*2);ctx.fill();}
}
function draw() {
 if(!state.hasData)return;
 const {width:w,height:h,scale:s}=state;ctx.clearRect(0,0,w,h);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
 const [left,top]=world(0,0),[right,bottom]=world(w,h);
 const base=10**Math.floor(Math.log10(60/s)),grid=[1,2,5,10].map(x=>x*base).find(x=>x*s>=45);
 ctx.font='11px Arial';ctx.textAlign='center';
 if($('#show-grid').checked){ctx.strokeStyle='#e6edf8';ctx.lineWidth=1;ctx.beginPath();
  for(let x=Math.ceil(left/grid)*grid;x<right;x+=grid){const [px]=screen([x,0]);ctx.moveTo(px,0);ctx.lineTo(px,h);}
  for(let y=Math.ceil(bottom/grid)*grid;y<top;y+=grid){const [,py]=screen([0,y]);ctx.moveTo(0,py);ctx.lineTo(w,py);}ctx.stroke();}
 const [ox,oy]=screen([0,0]),axisX=Math.max(14,Math.min(h-20,oy)),axisY=Math.max(28,Math.min(w-20,ox));
 ctx.strokeStyle='#a2b4d4';ctx.lineWidth=1.1;ctx.beginPath();if(oy>=0&&oy<=h){ctx.moveTo(0,oy);ctx.lineTo(w,oy);}if(ox>=0&&ox<=w){ctx.moveTo(ox,0);ctx.lineTo(ox,h);}ctx.stroke();
 ctx.fillStyle='#637798';for(let x=Math.ceil(left/grid)*grid;x<right;x+=grid){if(Math.abs(x)<grid*1e-5)continue;ctx.fillText(fmt(x),screen([x,0])[0],axisX+14);}
 ctx.textAlign='right';for(let y=Math.ceil(bottom/grid)*grid;y<top;y+=grid){if(Math.abs(y)<grid*1e-5)continue;ctx.fillText(fmt(y),axisY-7,screen([0,y])[1]+4);}ctx.fillText('0',axisY-7,axisX+14);ctx.fillText('X',w-9,axisX-7);ctx.fillText('Y',axisY+16,16);
 path(state.clip,'#2557bd',2,[],true,'#2557bd0b');
 if($('#show-source').checked){state.segments.forEach(seg=>path(seg,'#7a879f',1.5,[6,5]));if(state.subject.length)path(state.subject,'#7a879f',1.5,[6,5],true);}
 state.results.forEach(r=>r.segment?path(r.segment,'#c42b69',3.5):r.polygon?path(r.polygon,'#c42b69',3,[],true,'#c42b6914'):null);
 const frame=currentTrace()[state.step];
 if(frame&&state.step<currentTrace().length-1){if(frame.segment)path(frame.segment,'#b56e00',3,[3,4]);if(frame.polygon)path(frame.polygon,'#b56e00',3,[3,4],true);if(frame.edge)path(frame.edge,'#b56e00',4);}
 if(state.algorithm!=='polygon'&&state.segments[state.selected]){
  const seg=state.segments[state.selected];ctx.font='11px Arial';ctx.textAlign='left';seg.forEach((p,i)=>{const [x,y]=screen(p);if(x<0||x>w||y<0||y>h)return;ctx.fillStyle='#526581';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.fillText(`${i?'B':'A'}${state.selected+1}`,Math.min(w-30,x+7),Math.max(15,y-7));});
 }
 if(state.pending){const [x,y]=screen(state.pending);ctx.strokeStyle='#b56e00';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.stroke();}
 $('#scale-label').textContent=`${fmt(s)} px / ед.`;
 canvas.setAttribute('aria-label',`${names[state.algorithm]}. ${$('#summary').textContent}. Окно: ${state.clip.map(point).join(', ')}. Результаты доступны в таблице ниже.`);
}
function resize(){const box=canvas.getBoundingClientRect();state.width=box.width;state.height=box.height;const dpr=devicePixelRatio||1;canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function textInput(){return [state.segments.length,...state.segments.map(s=>s.flat().join(' ')),state.rect.join(' ')].join('\n');}
const inputJSON=()=>({variant:Number($('#variant').value),part:state.part,algorithm:state.algorithm,segments:state.segments,rect:state.rect,clip:state.clip,subject:state.subject});
$('#data-form').addEventListener('submit',e=>{e.preventDefault();build(true);});
$('#part1').onclick=()=>setPart(1);$('#part2').onclick=()=>setPart(2);
$('#variant').onchange=variantSetup;$('#algorithm').onchange=()=>{configure();build(true);};
$('#preset').onchange=()=>{$('#segments').value=examples[$('#preset').value];build(true);};
$('#selected').onchange=()=>{stop();state.selected=Number($('#selected').value);setStep(currentTrace().length-1);};
$('#first').onclick=()=>{stop();setStep(0);};$('#prev').onclick=()=>{stop();setStep(state.step-1);};$('#next').onclick=()=>{stop();setStep(state.step+1);};$('#last').onclick=()=>{stop();setStep(currentTrace().length-1);};$('#step').oninput=()=>{stop();setStep(Number($('#step').value));};
$('#trace-body').onclick=e=>{const row=e.target.closest('[data-step]');if(row){stop();setStep(Number(row.dataset.step));}};
$('#play').onclick=()=>{if(state.timer){stop();return;}if(state.step>=currentTrace().length-1)setStep(0);$('#play').textContent='Пауза';state.timer=setInterval(()=>{setStep(state.step+1);if(state.step>=currentTrace().length-1)stop();},600);};
$('#fit').onclick=fit;['show-source','show-grid'].forEach(id=>$('#'+id).onchange=draw);
$('#add-mode').onchange=()=>{state.pending=null;canvas.classList.toggle('adding',$('#add-mode').checked);$('#status').textContent=$('#add-mode').checked?'Добавление отрезка: начальная точка.':'';draw();};
$('#png').onclick=()=>canvas.toBlob(blob=>{if(blob)download(blob,'lab4-clipping.png','image/png');});
$('#save-input').onclick=()=>{if(!state.hasData)return;state.part===1?download(textInput(),'lab4-input.txt','text/plain;charset=utf-8'):download(JSON.stringify(inputJSON(),null,2),'lab4-input.json','application/json');};
$('#save-result').onclick=()=>{if(state.hasData)download(JSON.stringify({...inputJSON(),results:state.results},null,2),'lab4-results.json','application/json');};
$('#file').onchange=async()=>{
 const f=$('#file').files[0];if(!f)return;
 try{
  if(f.size>2e6)throw Error('Размер входного файла должен быть не более 2 МБ.');const text=await f.text();
  if(text.trim().startsWith('{')){
   const data=JSON.parse(text);if(data.rect)validateRect(data.rect);
   if(data.clip)parseVertices(data.clip.map(p=>p.join(' ')).join('\n'));
   if(data.subject?.length)parseVertices(data.subject.map(p=>p.join(' ')).join('\n'));
   if(data.segments){$('#segments').value=[data.segments.length,...data.segments.map(s=>s.flat().join(' ')),(data.rect||[-6,-4,6,4]).join(' ')].join('\n');parseRectText($('#segments').value);}
   if(data.clip)$('#clip').value=data.clip.map(p=>p.join(' ')).join('\n');if(data.subject?.length)$('#subject').value=data.subject.map(p=>p.join(' ')).join('\n');
   if(Number.isInteger(data.variant)&&data.variant>=1&&data.variant<=21)$('#variant').value=data.variant;
   variantSetup();setPart(data.part===2?2:1);
   if([...$('#algorithm').options].some(x=>x.value===data.algorithm)){$('#algorithm').value=data.algorithm;configure();build(true);}
  }else{parseRectText(text);$('#segments').value=text;build(true);}
  if(!$('#error').textContent)$('#status').textContent=`Загружен файл «${f.name}».`;
 }catch(e){$('#error').textContent=`Ошибка файла: ${e.message}`;}
 $('#file').value='';
};
let drag=null;
canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,center:[...state.center],moved:false};canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{const box=canvas.getBoundingClientRect(),p=world(e.clientX-box.left,e.clientY-box.top);$('#coords').textContent=`x: ${fmt(p[0])}; y: ${fmt(p[1])}`;if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;if(drag.moved){state.center=[drag.center[0]-dx/state.scale,drag.center[1]+dy/state.scale];draw();}};
canvas.onpointerup=e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved||!$('#add-mode').checked||state.algorithm==='polygon')return;
 const box=canvas.getBoundingClientRect(),p=world(e.clientX-box.left,e.clientY-box.top).map(x=>Math.round(x*100)/100);
 if(p.some(x=>Math.abs(x)>1e6)){$('#error').textContent='Координаты вне диапазона: |значения| ≤ 10⁶.';return;}
 if(!state.pending){state.pending=p;$('#status').textContent='Добавление отрезка: конечная точка.';draw();}else{
  if(state.segments.length>=1000){$('#error').textContent='Максимум 1000 отрезков.';return;}
  state.segments.push([state.pending,p]);state.selected=state.segments.length-1;$('#segments').value=textInput();build();$('#status').textContent='Отрезок добавлен.';
 }};
canvas.onpointercancel=()=>drag=null;
canvas.addEventListener('wheel',e=>{e.preventDefault();const box=canvas.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top,before=world(x,y);state.scale=Math.max(.00001,Math.min(10000,state.scale*Math.exp(-e.deltaY*.0015)));const after=world(x,y);state.center[0]+=before[0]-after[0];state.center[1]+=before[1]-after[1];draw();},{passive:false});
$('#variant').replaceChildren(...Array.from({length:21},(_,i)=>new Option(`Вариант ${i+1}`,i+1)));$('#variant').value='14';$('#segments').value=examples.mixed;
new ResizeObserver(resize).observe($('.canvas-wrap'));resize();variantSetup();

$('#wd-mode').onclick=()=>{
 stop();
 if(state.part!==2||state.algorithm!=='cyrus')setPart(2);
 const selected=state.segments[state.selected]||[[-12,-2],[12,4]];
 const geometry={a:selected[0],b:selected[1],polygon:state.clip,edge:Math.min(4,state.clip.length-1),t:0};
 $('#wd-cyrus-demo-14').dataset.geometry=JSON.stringify(geometry);
 $('#wd-panel').hidden=false;$('#workspace').hidden=true;
 for(const id of ['part1','part2']){$('#'+id).classList.remove('active');$('#'+id).setAttribute('aria-pressed','false');}
 $('#wd-mode').classList.add('active');$('#wd-mode').setAttribute('aria-pressed','true');
 window.dispatchEvent(new CustomEvent('wd:geometry',{detail:geometry}));
};
if(location.hash==='#wd')$('#wd-mode').click();
