import test from 'node:test';import assert from 'node:assert/strict';
import {liangBarsky,cohenSutherland,midpoint,cyrusBeck,sutherlandHodgman,rectangle,validatePolygon,parseRectText,area} from '../src/algorithms.js';
const r=[-6,-4,6,4],rect=rectangle(r);
const close=(a,b,eps=1e-7)=>{assert.equal(Boolean(a),Boolean(b));if(a&&b)for(let i=0;i<2;i++)for(let j=0;j<2;j++)assert.ok(Math.abs(a[i][j]-b[i][j])<=eps,`${JSON.stringify(a)} != ${JSON.stringify(b)}`);};
test('Контрольный пример Лианга–Барски, t = 1/4 и 3/4',()=>{const x=liangBarsky([-12,-2],[12,4],r);assert.equal(x.lo,.25);assert.equal(x.hi,.75);assert.deepEqual(x.segment,[[-6,-.5],[6,2.5]]);});
test('Все направления, параллельность, точка, касание, граница',()=>{
 const pairs=[[[0,-10],[0,10]],[[0,0],[0,0]],[[8,8],[8,8]],[[-10,4],[10,4]],[[-10,0],[-2,8]],[[6,4],[8,8]],[[-8,8],[8,8]]];
 for(const [a,b] of pairs){const expect=liangBarsky(a,b,r).segment;close(cohenSutherland(a,b,r).segment,expect);close(cyrusBeck(a,b,rect).segment,expect);close(midpoint(a,b,r).segment,expect,3e-7);}
 assert.deepEqual(liangBarsky([-10,0],[-2,8],r).segment,[[-6,4],[-6,4]]);
});
test('Согласованность трёх точных методов и приближённого на 3000 воспроизводимых отрезках',()=>{
 let seed=1401;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32*60-30;};
 for(let i=0;i<3000;i++){const a=[rnd(),rnd()],b=[rnd(),rnd()],x=liangBarsky(a,b,r).segment;close(cohenSutherland(a,b,r).segment,x);close(cyrusBeck(a,b,rect).segment,x);close(midpoint(a,b,r).segment,x,3e-7);close(liangBarsky(b,a,r).segment,x?.slice().reverse()||null);}
});
test('Кирус–Бек: выпуклое пятиугольное окно, оба обхода, горизонтальный отрезок',()=>{
 const p=[[-6,-4],[4,-5],[8,1],[3,6],[-5,5]],a=[-12,0],b=[12,0];const x=cyrusBeck(a,b,p);assert.ok(x.segment);close(x.segment,cyrusBeck(a,b,[...p].reverse()).segment);
 for(const point of x.segment)for(let i=0;i<p.length;i++){const v=p[i],w=p[(i+1)%p.length];assert.ok((w[0]-v[0])*(point[1]-v[1])-(w[1]-v[1])*(point[0]-v[0])>=-1e-8);}
});
test('Сазерленд–Ходжман: покрытие, внутренний, внешний, обратный обход, касание',()=>{
 const large=[[-20,-20],[20,-20],[20,20],[-20,20]],small=[[-1,-1],[1,-1],[1,1],[-1,1]],outside=[[10,10],[12,10],[12,12],[10,12]];
 assert.equal(Math.abs(area(sutherlandHodgman(large,rect).polygon)),96);assert.equal(Math.abs(area(sutherlandHodgman(small,rect).polygon)),4);assert.deepEqual(sutherlandHodgman(outside,rect).polygon,[]);
 assert.equal(Math.abs(area(sutherlandHodgman([...large].reverse(),[...rect].reverse()).polygon)),96);
 const touch=[[6,4],[8,4],[8,6],[6,6]];assert.deepEqual(sutherlandHodgman(touch,rect).polygon,[[6,4]]);
});
test('Проверка ввода: файл задания, BOM, отрицательные и дробные, ошибки',()=>{
 assert.equal(parseRectText('\uFEFF2\n-8 0 8 0\n0 0 0.5 1\n-6 -4 6 4').segments.length,2);assert.equal(parseRectText('0\n-6 -4 6 4').segments.length,0);
 for(const input of ['2\n0 0 1 1\n-6 -4 6 4','1\n0 0 Infinity 1\n-6 -4 6 4','0\n6 -4 -6 4','abc'])assert.throws(()=>parseRectText(input));
 assert.throws(()=>validatePolygon([[0,0],[3,0],[1,1],[3,3],[0,3]]));assert.throws(()=>validatePolygon([[0,0],[3,3],[0,3],[3,0]]));assert.throws(()=>validatePolygon([[0,0],[1,0],[2,0]]));
});
