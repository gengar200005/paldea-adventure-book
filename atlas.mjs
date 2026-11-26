import {html} from './core.mjs';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const cameras=new Map();
let observer;
const img=(src,alt='')=>`<img src="${html(src)}" alt="${html(alt)}" draggable="false" decoding="async">`;
const tileUrl=(map,z,x,y)=>map.tiles.replace('{z}',z).replace('{x}',x).replace('{y}',y);

export function atlasPreview(world){
 const map=world.nativeMap;
 if(!map)return '';
 if(map.preview)return img(map.preview,world.title+' 지형');
 return '<span class="atlas-preview-tiles">'+[0,1,2,3].map(n=>img(tileUrl(map,0,n%2,Math.floor(n/2)))).join('')+'</span>';
}

// Crop the original square map without stretching it. Coordinates are percentages
// of that same map in both the full atlas and the booklet.
export function atlasLocalMap(world, point, start) {
 const map=world.nativeMap;
 const hasStart=Number.isFinite(start?.x)&&Number.isFinite(start?.y)&&Math.hypot(start.x-point.x,start.y-point.y)>.04;
 const a=hasStart?start:point;
 const width=320,height=192,aspect=width/height;
 const spanX=Math.min(100*aspect,Math.max(hasStart?5:13,Math.abs(a.x-point.x)*1.65,Math.abs(a.y-point.y)*1.75*aspect));
 const spanY=spanX/aspect;
 const windowStart=(center,span)=>span>100?(100-span)/2:clamp(center-span/2,0,100-span);
 const top=windowStart((a.y+point.y)/2,spanY);
 const left=windowStart((a.x+point.x)/2,spanX);
 const scale=width/spanX;
 const project=p=>({x:(p.x-left)*scale,y:(p.y-top)*scale});
 const dest=project(point),origin=project(a);
 function picture(src,x,y,size) {
  return `<image href="${html(src)}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
 }
 let terrain='';
 if(map.image)terrain=picture(map.image,-left*scale,-top*scale,100*scale);
 else{
  const level=clamp(Math.ceil(Math.log2(scale*100/512)),0,3),count=2**(level+1),unit=100/count;
  for(let row=clamp(Math.floor(top/unit),0,count-1);row<=clamp(Math.floor((top+spanY)/unit),0,count-1);row++){
   for(let col=clamp(Math.floor(left/unit),0,count-1);col<=clamp(Math.floor((left+spanX)/unit),0,count-1);col++)
    terrain+=picture(tileUrl(map,level,col,row),(unit*col-left)*scale,(unit*row-top)*scale,unit*scale);
  }
 }
 const distance=Math.hypot(dest.x-origin.x,dest.y-origin.y);
 const showStart=hasStart&&distance>=25;
 const bearing=Math.atan2(dest.y-origin.y,dest.x-origin.x)*180/Math.PI;
 const arrow=showStart&&distance>47?`<path transform="translate(${(dest.x+origin.x)/2} ${(dest.y+origin.y)/2}) rotate(${bearing})" d="M-9 -2H2V-7L10 0 2 7V2H-9Z" fill="#263c36" stroke="white" stroke-width="2.5" paint-order="stroke"/>`:'';
 const originDot=showStart?`<circle cx="${origin.x}" cy="${origin.y}" r="7" fill="#167164" stroke="#fff" stroke-width="2.5"/>`:'';
 const destMark=point.accuracy==='area'?`<circle cx="${dest.x}" cy="${dest.y}" r="9" fill="#fff9" stroke="white" stroke-width="4"/><circle cx="${dest.x}" cy="${dest.y}" r="9" fill="none" stroke="#a63830" stroke-width="2.5" stroke-dasharray="4 2"/>`:`<path transform="translate(${dest.x} ${dest.y})" d="M0 0C-1.8-3.5-8-9-8-14A8 8 0 0 1 8-14C8-9 1.8-3.5 0 0Z" fill="#bd3f37" stroke="#fff" stroke-width="2.3"/><circle cx="${dest.x}" cy="${dest.y-14}" r="2.3" fill="white"/>`;
 const alt=showStart?a.title+'에서 '+point.title+' 방향':point.title+' 주변 지형';
 return {showStart,graphic:`<svg class="inset-terrain" viewBox="0 0 ${width} ${height}" role="img" aria-label="${html(alt)}">
 ${terrain}${arrow}${originDot}${destMark}</svg>`};
}

export function atlasView(world,pins,active,icon,label,found,cells=[],overview=false){
 const controls=[['out','−','축소'],['in','＋','확대'],['fit','전체','지도 전체 보기']];
 return `<div class="atlas-tools"><div class="atlas-zoom">${controls.map(([key,text,title])=>`<button type="button" data-camera="${key}" aria-label="${title}">${text}</button>`).join('')}<output class="atlas-scale" aria-label="확대 배율">1×</output></div><span>북쪽 ↑</span></div>
 <div class="atlas-view" data-overview="${overview}" tabindex="0" aria-label="${html(world.title)} 지도. 방향키로 이동하고 더하기와 빼기 키로 확대하거나 축소하세요.">
 <div class="atlas-scene"><div class="atlas-base">${atlasPreview(world)}</div><div class="atlas-tiles"></div><div class="atlas-habitat" aria-hidden="true">${cells.map(i=>`<i style="left:${i%20*5}%;top:${Math.floor(i/20)*5}%"></i>`).join('')}</div><div class="atlas-pins">${pins.map(p=>`<button type="button" class="atlas-pin ${p.accuracy==='area'?'approx':''} ${p===active?'selected':''} ${found(p)?'found':''}" data-act="map-point" data-value="${html(p.id)}" data-kind="${html(p.category)}" style="left:${p.x}%;top:${p.y}%" aria-label="${html(p.title+' · '+label(p))}"><span aria-hidden="true">${icon(p)}</span><b>${html(p.title)}</b><i class="atlas-count" aria-hidden="true"></i></button>`).join('')}</div></div></div>
 <section class="atlas-nearby" hidden aria-label="가까운 장소 선택"><header><strong>어디로 갈까요?</strong><button type="button" data-nearby-close>닫기</button></header><div class="atlas-nearby-list"></div></section>
 <div class="atlas-caption"><span>드래그로 이동 · 두 손가락 또는 휠로 확대</span><a href="${html(world.nativeMap.source)}" rel="noopener noreferrer" target="_blank">지도 출처 ↗</a></div>`;
}

export function atlasFrame(width,height,camera){
 const side=Math.min(width,height)*camera.zoom;
 const bound=(dim,center)=>side<=dim?(dim-side)/2:clamp(dim/2-center*side,dim-side,0);
 return {side,left:bound(width,camera.x),top:bound(height,camera.y)};
}

export function mountAtlas(root,world,active){
 observer?.disconnect();
 const view=root.querySelector('.atlas-view');
 if(!view||!world)return;
 const scene=view.querySelector('.atlas-scene'),tiles=view.querySelector('.atlas-tiles'),map=world.nativeMap;
 const camera=cameras.get(world.id)??{x:.5,y:.5,zoom:1,selected:null};
 cameras.set(world.id,camera);
 if(active?.id!==camera.selected){
  camera.selected=active?.id??null;
  if(active&&Number.isFinite(active.x)){
   camera.x=active.x/100;camera.y=active.y/100;camera.zoom=Math.max(2.5,camera.zoom);
  }
 }
 const priority=el=>el.classList.contains('selected')?-1:({gym:0,town:1,star:2,titan:2,landmark:3,area:4}[el.dataset.kind]??5);
 const points=[...view.querySelectorAll('.atlas-pin')].sort((a,b)=>priority(a)-priority(b)),touches=new Map();
 const nearby=root.querySelector('.atlas-nearby'),choices=nearby.querySelector('.atlas-nearby-list');
 const clusters=new Map();
 let lastGroup;
 function dismissGroup(returnFocus=false){
  nearby.hidden=true;
  choices.replaceChildren();
  if(returnFocus)lastGroup?.focus({preventScroll:true});
 }
 nearby.querySelector('[data-nearby-close]').onclick=()=>dismissGroup(true);
 nearby.addEventListener('keydown',event=>{if(event.key==='Escape')dismissGroup(true);});
 function chooseGroup(pin,group){
  choices.replaceChildren();
  for(const member of group){
   const button=document.createElement('button');
   button.type='button';button.dataset.act='map-point';button.dataset.value=member.dataset.value;
   button.textContent=member.querySelector('b').textContent;
   if(member.classList.contains('selected'))button.setAttribute('aria-current','true');
   choices.append(button);
  }
  lastGroup=pin;nearby.hidden=false;
  nearby.scrollIntoView({block:'nearest'});
  choices.firstElementChild?.focus({preventScroll:true});
 }
 const width=()=>view.clientWidth,height=()=>view.clientHeight;
 const fit=()=>{dismissGroup();Object.assign(camera,{x:.5,y:.5,zoom:1});paint();};
 const incoming=new Map();
 let drawTick=0,dragged=false,origin,gesture;
 function paint(){
  const w=width(),h=height();
  if(!w||!h)return;
  const {left,top,side}=atlasFrame(w,h,camera);
  camera.x=(w/2-left)/side;camera.y=(h/2-top)/side;
  scene.style.width=side+'px';scene.style.height=side+'px';
  scene.style.transform=`translate(${left}px,${top}px)`;
  root.querySelector('.atlas-scale').textContent=Number(camera.zoom.toFixed(1))+'×';
  if(!map.image){
   const z=clamp(Math.ceil(Math.log2(side*Math.min(devicePixelRatio||1,2)/512)),0,3),n=2**(z+1),size=side/n;
   const visible=new Set();
   for(let y=clamp(Math.floor(-top/size),0,n-1);y<=clamp(Math.floor((h-top)/size),0,n-1);y++){
    for(let x=clamp(Math.floor(-left/size),0,n-1);x<=clamp(Math.floor((w-left)/size),0,n-1);x++){
     const key=[z,x,y].join('/');visible.add(key);
     if(!incoming.has(key)){
      const tile=new Image();tile.alt='';tile.draggable=false;tile.decoding='async';
      Object.assign(tile.style,{left:100*x/n+'%',top:100*y/n+'%',width:100/n+'%',height:100/n+'%'});
      tile.src=tileUrl(map,z,x,y);tiles.append(tile);incoming.set(key,tile);
     }
    }
   }
   for(const [key,tile] of incoming)if(!visible.has(key)){tile.remove();incoming.delete(key);}
  }
  const occupied=[],icons=[];
  clusters.clear();
  view.style.setProperty('--view-width',w+'px');
  for(const el of points){
   const px=side*parseFloat(el.style.left)/100+left,py=side*parseFloat(el.style.top)/100+top;
   // Only on-screen centres can represent other points. A hidden edge pin
   // must never make a visible place impossible to reach.
   const onScreen=px>=0&&px<=w&&py>=0&&py<=h;
   const group=onScreen&&icons.find(other=>Math.abs(px-other.x)<44&&Math.abs(py-other.y)<44);
   el.hidden=Boolean(group);
   if(group){clusters.get(group.el).push(el);continue;}
   clusters.set(el,[el]);
   if(onScreen)icons.push({x:px,y:py,el});
   el.style.setProperty('--pin-screen-x',px+'px');
   el.classList.toggle('label-above',py>h-66);
   const named=el.classList.contains('selected')||((camera.zoom>=2.1||['town','gym','landmark','shrine'].includes(el.dataset.kind))&&px>10&&py>10&&px<w-30&&py<h-18&&!occupied.some(([a,b])=>Math.abs(px-a)<100&&Math.abs(py-b)<38));
   el.classList.toggle('named',named);
   if(named)occupied.push([px,py]);
  }
  for(const [el,members] of clusters){
   const count=el.querySelector('.atlas-count');
   const number=members.length>1?String(members.length):'';
   if(count.textContent!==number)count.textContent=number;
   if(!el.dataset.originalLabel)el.dataset.originalLabel=el.getAttribute('aria-label');
   el.setAttribute('aria-label',number?el.dataset.originalLabel+' 주변 '+number+'곳 고르기':el.dataset.originalLabel);
  }
 }
 const queue=()=>{if(!drawTick)drawTick=requestAnimationFrame(()=>{drawTick=0;paint();});};
 function zoom(factor,px=width()/2,py=height()/2){
  if(!nearby.hidden)dismissGroup();
  const before=atlasFrame(width(),height(),camera);
  const u=(px-before.left)/before.side,v=(py-before.top)/before.side;
  camera.zoom=clamp(camera.zoom*factor,1,12);
  const side=Math.min(width(),height())*camera.zoom;
  camera.x=u+(width()/2-px)/side;camera.y=v+(height()/2-py)/side;paint();
 }
 function pan(dx,dy){if(!nearby.hidden)dismissGroup();const {side}=atlasFrame(width(),height(),camera);camera.x-=dx/side;camera.y-=dy/side;paint();}
 function measure(){
  const pair=[...touches.values()].slice(0,2);
  if(pair.length<2)return pair[0];
  return {x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2,d:Math.hypot(pair[1].x-pair[0].x,pair[1].y-pair[0].y)};
 }
 const loc=e=>{const r=view.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 view.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const p=loc(e);if(!touches.size){dragged=false;origin=p;}touches.set(e.pointerId,p);
  gesture=measure();if(touches.size>1)dragged=true;
 });
 view.addEventListener('pointermove',e=>{
  if(!touches.has(e.pointerId))return;
  const p=loc(e);touches.set(e.pointerId,p);const next=measure();
  if(!dragged&&Math.hypot(p.x-origin.x,p.y-origin.y)<5)return;
  dragged=true;view.setPointerCapture(e.pointerId);
  if(next.d&&gesture?.d)zoom(next.d/gesture.d,gesture.x,gesture.y);
  if(gesture)pan(next.x-gesture.x,next.y-gesture.y);
  gesture=next;
 });
 const end=e=>{touches.delete(e.pointerId);gesture=measure();};
 for(const name of ['pointerup','pointercancel'])view.addEventListener(name,end);
 view.addEventListener('lostpointercapture',e=>{if(e.target===view&&!view.hasPointerCapture(e.pointerId))end(e);});
 view.addEventListener('pointerleave',e=>{if(!view.hasPointerCapture(e.pointerId))end(e);});
 view.addEventListener('click',e=>{
  if(dragged&&e.detail){e.stopPropagation();e.preventDefault();dragged=false;return;}
  const pin=e.target.closest('.atlas-pin'),members=clusters.get(pin);
  if(members?.length>1){e.stopPropagation();e.preventDefault();chooseGroup(pin,members);}
 },true);
 view.addEventListener('wheel',e=>{e.preventDefault();const p=loc(e);zoom(Math.exp(-clamp(e.deltaY,-180,180)*.0025),p.x,p.y);},{passive:false});
 view.addEventListener('dblclick',e=>{if(!e.target.closest('button')){const p=loc(e);zoom(1.8,p.x,p.y);}});
 view.addEventListener('keydown',e=>{
  if(e.target!==view)return;
  const keys={ArrowLeft:()=>pan(70,0),ArrowRight:()=>pan(-70,0),ArrowUp:()=>pan(0,70),ArrowDown:()=>pan(0,-70),'+':()=>zoom(1.5),'=':()=>zoom(1.5),'-':()=>zoom(1/1.5),Home:fit};
  if(keys[e.key]){e.preventDefault();keys[e.key]();}
 });
 for(const b of root.querySelectorAll('[data-camera]'))b.onclick=()=>b.dataset.camera==='fit'?fit():zoom(b.dataset.camera==='in'?1.5:1/1.5);
 if(map.image){const full=new Image();full.alt='';full.draggable=false;full.src=map.image;tiles.append(full);}
 observer=new ResizeObserver(queue);observer.observe(view);paint();
}
