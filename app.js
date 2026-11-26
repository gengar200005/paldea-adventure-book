import {atlasView,mountAtlas} from './atlas.mjs';
import {buildHuntIndex,encounterKinds,encounterMapWorld,encounterTargets,matchesHunt} from './hunt.mjs';
import {evolutionMethods,evolutionView,evolutionPath} from './evolution.mjs';
import {wayfindingIndex,wayfindingLabels} from './wayfinding.mjs';
import {buildArtMatcher,localArtStore,collectArt,ownPortrait,observeArt,MIME_ACCEPT} from './local-art.mjs';
import {routeSteps,preparation,extraReferences} from './expanded.mjs';
import {pressPortrait,initPressImages} from './media.mjs';
import {guideImage,missionArt,routeTone,mapInset,landmarkDiagram,screenshotRefs,recipeBoard} from './visuals.mjs';
import {TYPES,typeIds,isType,html,blankState,normalizeState,STORAGE_KEY,effectiveness,defensiveGroups,recommendTeam} from './core.mjs';

initPressImages();
const $=selector=>document.querySelector(selector);
const main=$('#main');
const art=localArtStore();
const localImages=new Set();
let findArtId, importingArt=false, evolutionCache;
const artInput=$('#art-input');
artInput.accept=MIME_ACCEPT;
observeArt(main,art);
const encounterWorld={paldea:'paldea',kitakami:'kitakami',blueberry:'blueberry',terarium:'blueberry'};
const worldNames={paldea:'팔데아',kitakami:'북신의 고장',blueberry:'블루베리'};
const routes={
 home:['홈','⌂'], adventure:['모험 가이드','⚑'], dex:['포켓몬 도감','◈'],
 evolution:['진화 도감','↗'], map:['지도','◎'], battle:['타입 상성','⚔'],
 team:['나의 팀','✦'], field:['탐험 안내','✹'], journal:['모험 기록','✓'], settings:['설정','⚙']
};
const missionRoutes={victory:'챔피언 로드',legend:'레전드 루트',star:'스타더스트★스트리트',finale:'마지막 모험',postgame:'엔딩 이후',teal:'벽록의 가면',indigo:'남청의 원반',epilogue:'번외편'};
const chapters={rare:'희귀 포켓몬',items:'아이템·기술머신',picnic:'피크닉·육성',raid:'테라 레이드'};
const pointCategories={gym:['체육관','⚑'],titan:['주인 포켓몬','▲'],star:['스타단','★'],town:['마을','🏡'],center:['포켓몬센터','✚'],shop:['상점','◉'],area:['지역','◎'],encounter:['포켓몬','◈'],tera:['테라스탈 포켓몬','✧'],item:['아이템','◆'],tm:['기술머신','▣'],evolution:['진화 도구','↗'],gimmighoul:['모으령','●'],stake:['봉인된 말뚝','✦'],shrine:['사당','⬡'],landmark:['장소','⚑'],collectible:['수집 요소','✓']};
const accuracy={schematic:'길잡이 위치',area:'대략적인 지역',random:'무작위 출현',conditional:'조건부',exact:'정확한 위치'};
const colors={black:'검정',blue:'파랑',brown:'갈색',gray:'회색',green:'초록',pink:'분홍',purple:'보라',red:'빨강',white:'하양',yellow:'노랑'};
const versions={scarlet:'스칼렛',violet:'바이올렛',both:'스칼렛·바이올렛'};
const positions={hp:'HP',attack:'공격',defense:'방어',specialAttack:'특수공격',specialDefense:'특수방어',speed:'스피드'};
const quick=[
 ['hunt/paldea/south-one-area','◈','포켓몬 잡기','#dcebd4'],['evolution','↗','포켓몬 진화','#f7e4bb'],
 ['adventure/victory','⚑','체육관 도전','#e5e7f9'],['field/rare','✦','희귀 포켓몬','#eedff4'],
 ['team','★','나의 포켓몬 팀','#fde3d4'],['map/paldea/item','◆','보물 찾기','#f7edbd'],
 ['journal','✓','나의 도감 기록','#d9ece7'],['map','◎','지도 열기','#dceaf6']
];
const ui={dexQuery:'',dexType:'',dexColor:'',dexEvolution:false,dexIllustrated:false,dexPage:0,evolutionQuery:'',evolutionMethod:'all',evolutionPage:0,fieldQuery:'',mapQuery:'',mapSelected:'',mapOnlyPokemon:null,teamQuery:'',attack:'fire',def1:'grass',def2:'',tera:'',battleSpecies:0,journalTab:'caught'};
const revealed=new Set();
let store=blankState(), db, species, missions, articles, movesById, movesByName, wayfinding;
let huntIndex;
const cookbook={effect:'',type:'',query:'',page:0};
const hunting={version:'scarlet',collection:'all'};
let toastTimer;
try { const saved=localStorage.getItem(STORAGE_KEY); if(saved) store=normalizeState(JSON.parse(saved)); } catch {}
function flash(message){
 const toast=$('#toast'); toast.textContent=message; toast.classList.add('visible');
 clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('visible'),3300);
}
function save() {
 try { localStorage.setItem(STORAGE_KEY,JSON.stringify(store)); return true; }
 catch { flash('이 브라우저에 기록을 저장할 수 없어요. 백업 파일로 보관해 주세요.'); return false; }
}
function toggled(key,value){const set=new Set(store[key]);set.has(value)?set.delete(value):set.add(value);store[key]=[...set];save();}
function path() {
 return location.hash.slice(1).split('/').filter(Boolean).map(value=>{try{return decodeURIComponent(value)}catch{return ''}});
}
const to=(route,id)=>'#'+route+(id!==undefined?'/'+encodeURIComponent(id):'');
const link=(route,label,kind='')=>`<a href="#${route}" class="button ${kind}">${html(label)}</a>`;
const button=(act,label,value='',kind='')=>`<button type="button" class="button ${kind}" data-act="${act}" data-value="${html(value)}">${html(label)}</button>`;
const chip=(route,label,active)=>`<a href="#${route}" class="chip${active?' active':''}"${active?' aria-current="page"':''}>${html(label)}</a>`;
const page=(title,text='',extra='')=>`<div class="page-head">${extra}<h1>${html(title)}</h1>${text?`<p>${html(text)}</p>`:''}</div>`;
const empty=text=>`<p class="empty">${html(text)}</p>`;
const typeStyle=id=>`--tint:${TYPES[id]?.[2]??'#e9f0e1'};--typeInk:${TYPES[id]?.[3]??'#426345'}`;
const type=id=>isType(id)?`<span class="type" style="${typeStyle(id)}"><span aria-hidden="true">${TYPES[id][1]}</span>${TYPES[id][0]}</span>`:'';
const types=ids=>`<div class="pills">${(ids??[]).map(type).join('')}</div>`;
const symbol=id=>`<span class="glyph" aria-hidden="true">${TYPES[id]?.[1]??'✦'}</span>`;
const num=n=>String(n).padStart(3,'0');
const isDlcRoute=route=>['teal','indigo','epilogue'].includes(route);
const showWorld=id=>!id||id==='paldea'||store.settings.dlc;
const showMission=m=>m&&(!isDlcRoute(m.route)||store.settings.dlc);
const accessibleEvolution=id=>Boolean(db?.evolutionGuides.edges?.[getPokemon(id)?.evolvesFrom+'-'+id]?.baseGame);
const showSpecies=p=>p&&(store.settings.dlc||p.dex.paldea||accessibleEvolution(p.id)||p.encounters?.some(e=>e.region==='paldea'&&!e.requiresDlc)||(!p.dex.kitakami&&!p.dex.blueberry&&['transfer','eventOrTransfer'].includes(p.availability)));
const showPoint=p=>store.settings.dlc||!p.dlc;
const safeUrl=url=>{
 try {const result=new URL(url);return result.protocol==='https:'?result.href:'';}catch{return '';}
};
function provenance(registry,ids) {
 const sources=(ids??[]).flatMap(id=>registry?.[id]??[]).filter(s=>safeUrl(s.url));
 return sources.length?`<details class="section"><summary>참고 자료</summary><ul class="links">${sources.map(s=>`<li><a class="inline-link" href="${html(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${html(s.title)}</a></li>`).join('')}</ul></details>`:'';
}
function gate(key,label,kind='spoilers') {
 return store.settings[kind]||revealed.has(key)?'':`<div class="spoiler"><p>${html(label)}</p>${button('reveal','이 내용만 보기',key)}</div>`;
}
function select(id,values,current,label,first) {
 return `<select class="select" id="${id}" aria-label="${html(label)}">${first!==undefined?`<option value="">${html(first)}</option>`:''}${values.map(([key,name])=>`<option value="${html(key)}"${String(key)===String(current)?' selected':''}>${html(name)}</option>`).join('')}</select>`;
}
function query(id,value,label) {
 return `<div class="search"><input id="${id}" type="search" autocomplete="off" aria-label="${html(label)}" placeholder="${html(label)}" value="${html(value)}"></div>`;
}
const words=s=>String(s??'').toLowerCase().replace(/[\s·・★-]+/g,'');
const match=(values,q)=>!q||values.some(v=>words(v).includes(words(q)));
const autoDex=p=>p.dex.paldea?'paldea':store.settings.dlc&&p.dex.kitakami?'kitakami':store.settings.dlc&&p.dex.blueberry?'blueberry':'other';
const getPokemon=id=>species.get(Number(id));
const pokemonLink=(id)=>{
 const p=getPokemon(id);
 return p&&showSpecies(p)?link('pokemon/'+p.id,p.name):p?html(p.name):'';
};
function dataUrls(){
 return ['dex','adventure','map','fieldbook','visual-steps','visual-references'].map(name=>fetch('data/'+name+'.json').then(r=>{if(!r.ok)throw new Error(name+' '+r.status);return r.json()}));
}
function mediaData(name,fallback) {
 return fetch('data/'+name+'.json').then(r=>r.ok?r.json():fallback).catch(()=>fallback);
}
const portraitOf=p=>db.dexMedia.species?.[p.id];
const levitates=p=>p?.abilities?.length===1&&p.abilities[0]==='부유';
const spriteOf=p=>db.sprites.species?.[p.id];
const hasPortrait=p=>localImages.has(p.id)||spriteOf(p)?.normal||portraitOf(p);
function spriteImage(p,shade,{detail=false,record=spriteOf(p)}={}){
 const image=record?.[shade];
 if(!image)return '';
 const alt=[p.name,record.form].filter(Boolean).join(' · ')+' · '+(shade==='shiny'?'색이 다른 모습':'일반 모습');
 return `<span class="press-portrait${detail?' portrait-detail':''}"><img class="portrait-image" src="${html(image)}" alt="${html(alt)}" decoding="async" loading="${detail?'eager':'lazy'}" data-press-image><span class="portrait-fallback">${symbol(p.types[0])}</span></span>`;
}
function appearance(p){
 const sprite=spriteOf(p);
 if(!sprite?.normal)return '';
 const url='https://pokemondb.net/pokedex/'+encodeURIComponent(sprite.slug);
 const pair=record=>`<div class="appearance-grid">${[['normal','일반 모습'],['shiny','색이 다른 모습']].filter(([k])=>record[k]).map(([k,label])=>`<figure><a href="${url}" target="_blank" rel="noopener noreferrer">${spriteImage(p,k,{detail:true,record})}</a><figcaption>${label}</figcaption></figure>`).join('')}</div>`;
 const trail=store.settings.dlc&&db.catchTrails.dlc?.[p.id];
 const variant=trail?.sprite&&db.sprites.variants?.[trail.sprite];
 const showForm=variant&&(!trail.spoiler||store.settings.rare||revealed.has('trail:'+p.id+':'+trail.point));
 return `${sprite.form?`<p>${html(sprite.form)}</p>`:''}${pair(sprite)}${showForm?`<details><summary>${html(variant.form)}도 보기</summary>${pair(variant)}${variant.note?`<p>${html(variant.note)}</p>`:''}</details>`:''}<p><a class="inline-link" href="https://pokemondb.net/sprites/${encodeURIComponent(sprite.slug)}" target="_blank" rel="noopener noreferrer">그림 출처 · Pokémon Database ↗</a></p>`;
}
function portrait(p,{detail=false}={}){
 const fallback=spriteImage(p,'normal',{detail})||pressPortrait(portraitOf(p),symbol(p.types[0]),{name:p.name,detail});
 return localImages.has(p.id)?ownPortrait(p.id,fallback,{name:p.name,detail}):fallback;
}
function expandedFor(id){return db.expandedStory.missions?.[id]??db.expandedDlc.missions?.[id];}
function guideSteps(steps){
 return `<ol class="step-list">${steps.map((step,i)=>`<li><span class="step-index">${i+1}</span><div>${step.landmark?`<strong>${html(step.landmark)}</strong>`:''}${html(step.action??step)}</div></li>`).join('')}</ol>`;
}
function visibleTarget(id){
 const target=wayfinding.points.get(id);
 return target&&showWorld(target.world)&&showPoint(target.point)&&
  (!target.point.spoiler||store.settings.rare||revealed.has('point:'+id))?target:null;
}
function machineWayfinding(number){
 const candidates=(wayfinding.byNumber.get(number)??[]).filter(route=>showWorld(route.world)&&(!route.point||showPoint(wayfinding.points.get(route.point)?.point??{})));
 const revealKey='tm-places:'+number;
 const hidden=candidates.some(r=>r.point&&!visibleTarget(r.point))&&!revealed.has(revealKey);
 const entries=candidates.filter(r=>!r.point||visibleTarget(r.point)||revealed.has(revealKey));
 const actionable=entries.filter(route=>route.kind!=='area');
 const areas=entries.filter(route=>route.kind==='area');
 const labels={area:'구역 지도 보기',pickup:'길잡이 지도 보기',reward:'보상 장소 보기',purchase:'매점 입구 보기',unlock:'해금 장소 보기'};
 const routeLink=route=>route.point?link('map/'+route.world+'/tm/'+route.point,labels[route.kind]):'';
 const card=route=>{
  const mapLink=routeLink(route);
  const photo=route.source?.title.includes('위치 사진')&&safeUrl(route.source.url)?`<a class="button" href="${html(route.source.url)}" target="_blank" rel="noopener noreferrer">지역 공략 사진 · TM${num(number)} ↗</a>`:'';
  return `<article class="tm-location"><div class="card-row"><h3>${html(route.place)}</h3><span class="badge">${wayfindingLabels[route.kind]}</span></div>
  ${route.requirement?`<p class="aside-note"><strong>먼저</strong> ${html(route.requirement)}</p>`:''}
  ${route.steps?.length?guideSteps(route.steps):''}
  ${mapLink||photo?`<div class="actions">${mapLink}${photo}</div>`:''}</article>`;
 };
 const regions=`<div class="tm-areas">${areas.map(route=>`<div><strong>${html(route.place)}</strong>${routeLink(route)}</div>`).join('')}</div>`;
 const sources=[...new Map(entries.filter(r=>r.source?.url).map(r=>[r.source.url,r.source])).values()];
 return `<section class="panel tm-wayfinding"><h2>기술머신 얻는 곳</h2>${actionable.map(card).join('')}${
  areas.length?(actionable.length?`<details class="section"><summary>다른 후보 지역 ${areas.length}곳</summary>${regions}</details>`:
  `<p class="muted">아래 구역에서 찾아볼 수 있어요. 정확한 지점과 접근 경로는 확인 중이에요.</p>${regions}`):''}
 ${hidden?button('reveal','후반 지역의 획득 장소 보기',revealKey):entries.length?'':empty('현재 설정에 표시할 획득 위치가 없어요.')}${provenance({wayfinding:sources},['wayfinding'])}</section>`;
}
function machinesAt(point){
 return [...(wayfinding.byPoint.get(point)?.entries()??[])].flatMap(([number,entries])=>{
  const article=articles.get('tm-'+num(number));
  return article&&showWorld(article.world)&&(!article.spoiler||store.settings.rare||revealed.has('article:'+article.id))?
   [{article,kind:entries[0].kind}]:[];
 });
}

function chrome(route){
 const parent={trails:'dex',recipes:'field',hunt:'dex',pokemon:'dex',mission:'adventure',article:'field'}[route]??route;
 const nav=(id)=>`<a class="nav-link" href="#${id}"${parent===id?' aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${routes[id][1]}</span><span>${routes[id][0]}</span></a>`;
 $('#sidebar').innerHTML=`<a href="#home" class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>팔데아 모험책<small>SCARLET ADVENTURE</small></span></a><nav aria-label="전체 메뉴">${Object.keys(routes).map(nav).join('')}</nav><div class="side-card"><strong>내 팔데아 도감</strong>${countCaught('paldea')} / ${dexTotal('paldea')} 마리</div>`;
 $('#bottom').innerHTML=['home','adventure','dex','map','journal'].map(nav).join('');
 $('#trail').textContent=routes[parent]?.[0]??routes.home[0];
 $('#top-actions').innerHTML=button('mode',store.settings.advanced?'어린이 모드':'상세 모드')+link('settings','⚙ 설정');
}
const dexTotal=world=>db.dex.pokemon.filter(p=>p.dex[world]).length;
const countCaught=world=>db.dex.pokemon.filter(p=>p.dex[world]&&store.caught.includes(p.id)).length;
function nextMission() {
 return db.adventure.missions.find(m=>showMission(m)&&!store.completed.includes(m.id)&&(m.prerequisites??[]).every(id=>store.completed.includes(id)));
}
function home() {
 const next=nextMission(), caught=countCaught('paldea'), total=dexTotal('paldea');
 const hideNext=next?.spoiler&&!store.settings.spoilers&&!revealed.has('mission:'+next.id);
 return `<section class="hero"><img class="hero-art" src="assets/countryside.webp" alt="" fetchpriority="high"><div class="hero-inner"><span class="hero-kicker">✦ 팔데아 모험책</span><h1>오늘은 어디로<br>모험 갈까?</h1><p>다음 목적지를 찾고, 만난 포켓몬을 모험책에 기록해 보자.</p><div class="actions">${link(next?'mission/'+next.id:'adventure','다음 모험 보기','light')}${link('map','지도 열기','light')}</div></div></section>
 <section class="section"><div class="section-head"><h2>오늘 하고 싶은 일</h2></div><div class="quick-grid">${quick.map(([id,icon,label,color])=>`<a class="quick" href="#${id}"><span class="quick-icon" style="--card:${color}" aria-hidden="true">${icon}</span>${label}</a>`).join('')}</div></section>
 <section class="section journey"><div class="card"><span class="eyebrow">⚑ 다음 목적지</span><h3>${html(hideNext?'새로운 모험이 기다려요':next?.title??'내가 고르는 다음 모험')}</h3><p>${html(hideNext?'준비하기를 눌러서 자세한 내용을 펼쳐요.':next?.action??'모험 가이드에서 다음 도전을 골라 보세요.')}</p>${next?`<div class="actions">${link('mission/'+next.id,'준비하기','primary')}</div>`:''}</div><div class="card"><span class="eyebrow">◈ 팔데아 도감</span><h3>${caught}마리 발견!</h3><progress class="progress" value="${caught}" max="${total||1}">${caught}/${total}</progress><div class="actions">${link('journal','내 기록 보기')}</div></div></section>`;
}
function dex(cardWorld) {
 const worlds=[['paldea','팔데아'],...(store.settings.dlc?[['kitakami','북신'],['blueberry','블루베리']]:[]),['other','도감 외']];
 const world=worlds.some(([id])=>id===cardWorld)?cardWorld:'paldea';
 return page('포켓몬 도감','이름이 생각나지 않으면 타입·색깔·도감 번호로 찾아보세요.')+
 `<div class="filters">${worlds.map(([id,label])=>chip('dex/'+id,label,id===world)).join('')}</div>`+
 '<div class="actions">'+link('hunt/'+(world==='other'?'paldea':world),'지역을 골라 포켓몬 잡기')+link('trails/'+(world==='other'?'paldea':world),'표식을 따라 잡기')+'</div>'+query('dex-query',ui.dexQuery,'이름 또는 도감 번호로 찾기')+
 `<div class="filters">${select('dex-type',typeIds.map(t=>[t,TYPES[t][0]]),ui.dexType,'타입','모든 타입')}${select('dex-color',Object.entries(colors),ui.dexColor,'색깔','모든 색깔')}<label class="chip"><input type="checkbox" id="dex-evolution"${ui.dexEvolution?' checked':''}> 진화할 수 있어요</label><label class="chip"><input type="checkbox" id="dex-illustrated"${ui.dexIllustrated?' checked':''}> 그림이 있어요</label></div><div id="dex-results">${dexResults(world)}</div>`;
}
function dexResults(world) {
 const visible=db.dex.pokemon.filter(p=>showSpecies(p)&&(world==='other'?autoDex(p)==='other':!!p.dex[world]))
 .filter(p=>(!ui.dexType||p.types.includes(ui.dexType))&&(!ui.dexColor||p.color===ui.dexColor)&&(!ui.dexEvolution||evolutionData().edges.has(p.id))&&(!ui.dexIllustrated||hasPortrait(p))&&match([p.name,p.en,p.ja,p.id,num(p.dex[world]??p.id)],ui.dexQuery))
 .sort((a,b)=>(a.dex[world]??a.id)-(b.dex[world]??b.id));
 const size=48, max=Math.max(0,Math.ceil(visible.length/size)-1), current=Math.max(0,Math.min(ui.dexPage,max));
 return `<div class="count">${visible.length}마리</div>${visible.length?`<div class="dex-grid">${visible.slice(current*size,(current+1)*size).map(p=>pokeCard(p,world)).join('')}</div>`:empty('조건에 맞는 포켓몬이 없어요.')}${max?`<div class="pager">${button('dex-page','‹ 이전',Math.max(0,current-1))}<span>${current+1} / ${max+1}</span>${button('dex-page','다음 ›',Math.min(max,current+1))}</div>`:''}`;
}
function pokeCard(p,world) {
 const a=p.types[0];
 return `<a href="${to('pokemon',p.id)}" class="poke"><div class="poke-art" style="${typeStyle(a)}"><span class="number">No. ${num(p.dex[world]??p.id)}</span>${portrait(p)}${store.caught.includes(p.id)?'<span class="captured" aria-label="잡았어요">✓</span>':''}</div><div class="poke-copy"><strong>${html(p.name)}</strong>${types(p.types)}</div></a>`;
}
function evolutionData(){
 const dlc=store.settings.dlc;
 if(!evolutionCache||evolutionCache.dlc!==dlc){
  evolutionCache={dlc,view:evolutionView(db.dex.pokemon,db.evolutionGuides.edges,showSpecies,dlc)};
 }
 return evolutionCache.view;
}
function linearFamily(family,view){
 return family.ids.every(id=>(view.edges.get(id)?.length??0)<=1);
}
function evolutionOverview(p){
 const view=evolutionData(), family=view.byMember.get(p.id);
 if(!family)return empty('현재 도감에 연결된 진화 계보가 없어요.');
 const next=view.edges.get(p.id)??[];
 const summary=linearFamily(family,view)?family.ids.map(id=>{
  const name=html(getPokemon(id).name);
  return id===p.id?`<strong>${name}</strong>`:`<a href="${to('pokemon',id)}">${name}</a>`;
 }).join('<span aria-hidden="true">→</span>'):`<strong>${html(getPokemon(family.root).name)}의 진화 계보</strong>`;
 return `<div class="evo-overview"><div class="evo-name-line">${summary}</div>${next.length===1?`<p>${html(next[0].condition)}</p>`:next.length>1?`<p>이 포켓몬에서 ${next.length}가지 진화를 볼 수 있어요.</p>`:''}<div class="actions">${link('evolution/'+p.id,'전체 진화 계보와 방법','primary')}</div></div>`;
}
function pokemon(id) {
 const p=getPokemon(id);
 if(!showSpecies(p))return page('포켓몬 도감')+empty('이 포켓몬을 보려면 도감 또는 DLC 설정을 확인해 주세요.')+link('settings','설정 열기');
 const restricted=p.spoiler&&gate('pokemon:'+p.id,'이 포켓몬은 특별한 탐험에서 만날 수 있어요.','rare');
 const toggles=[['caught','잡았어요'],['wanted','잡고 싶어요'],['evolved','진화했어요'],['favorites','즐겨찾기']];
 const groups=defensiveGroups(p.types,'',levitates(p)?['ground']:[]);
 const relevant=db.map.worlds.filter(w=>showWorld(w.id)).flatMap(w=>w.points.filter(s=>showPoint(s)&&s.pokemon?.includes(p.id)).map(s=>[w,s]));
 const related=db.field.articles.filter(a=>a.species?.includes(p.id)&&showWorld(a.world)&&(!a.spoiler||store.settings.rare)).slice(0,9);
 const habitatLinks=db.map.worlds.filter(w=>showWorld(w.id)&&w.nativeMap.habitats[p.id]).flatMap(w=>{
  const cells=w.nativeMap.habitats[p.id],version=cells.both||cells.scarlet?'scarlet':'violet';
  return link('map/'+w.id+'/habitat/'+p.id+'/'+version,w.title+' 야생 출현 구역 보기');
 });
 const encounterSection=(habitatLinks.length?'<div class="actions">'+habitatLinks.join('')+'</div>':'')+catchTrail(p)+encounterDetails(p);
 const knownLocations=encounterSection||relevant.length;
 const advice=p.accessTip??p.access??p.acquisition;

 const illustrated=portraitOf(p);
 const personal=localImages.has(p.id);
 const hero=`<div class="detail-banner${hasPortrait(p)?' has-portrait':''}" style="${typeStyle(p.types[0])}">${portrait(p,{detail:true})}<div><span class="eyebrow">${Object.entries(p.dex).filter(([w])=>showWorld(w)).map(([w,n])=>html(worldNames[w]+' No. '+num(n))).join(' · ')||'전국도감 No. '+num(p.id)}</span><h1>${html(p.name)}</h1>${types(p.types)}</div></div>`;
 return `<div class="actions" style="margin-bottom:12px">${link('dex/'+autoDex(p),'‹ 도감')}${button('team-add','팀에 넣기',p.id)}${button('speak','🔊 읽어주기',p.name+' · '+p.types.map(t=>TYPES[t]?.[0]).join('와 ')+' 타입')}</div>${hero}
 <div class="filters">${toggles.map(([key,label])=>`<button class="chip${store[key].includes(p.id)?' active':''}" data-act="species-mark" data-value="${key}/${p.id}" aria-pressed="${store[key].includes(p.id)}">${html(label)}</button>`).join('')}</div>
 <div class="columns section"><div class="stack"><section class="panel"><h2>진화 방법</h2>${evolutionOverview(p)}</section><section class="panel" id="pokemon-encounters" tabindex="-1"><h2>어디에서 만날까?</h2>${p.version&&versions[p.version]?`<p><span class="badge">${versions[p.version]}</span></p>`:''}${restricted||((typeof advice==='string'?'<p>'+html(advice)+'</p>':'')+encounterSection+(relevant.length?'<div class="actions">'+relevant.map(([w,s])=>link('map/'+w.id+'/all/'+s.id,s.title)).join('')+'</div>':'')+(!knownLocations&&!advice?empty('이 모험책에 확인된 야생 위치가 없어요. 진화나 다른 획득 방법을 확인해 보세요.'):'')+(related.length?'<div class="actions">'+related.map(a=>link('article/'+a.id,a.title)).join('')+'</div>':''))}</section></div>
 <div class="stack"><section class="panel"><h2>어떤 기술에 약할까?</h2>${[4,2,0.5,0.25,0].filter(n=>groups.has(n)&&(store.settings.advanced||n>=2||n===0)).map(n=>`<div class="next-type"><strong>${n===0?'효과 없음':n+'배'}</strong>${types(groups.get(n))}</div>`).join('')||empty('2배 이상 받는 타입이 없어요.')}${link('battle/'+p.id,'테라스탈까지 계산하기')}</section><section class="panel"><h2>모습 살펴보기</h2>${appearance(p)}${!spriteOf(p)?.normal&&illustrated?`<p><a class="inline-link" href="${html(illustrated.source)}" target="_blank" rel="noopener noreferrer">그림 출처 · 포켓몬 공식 미디어 자료 ↗</a></p>`:''}<div class="actions"><a class="button" href="https://pokemonkorea.co.kr/pokedex?word=${String(p.id).padStart(4,'0')}" target="_blank" rel="noopener noreferrer">포켓몬코리아 도감 ↗</a>${button('art-import',personal?'내 이미지 바꾸기':'내 이미지 추가',p.id)}${personal?button('art-remove','내 이미지 지우기',p.id,'danger'):''}</div></section></div></div>${moveDetails(p)}${raidDetails(p)}
 ${store.settings.advanced?`<section class="section panel"><h2>상세 정보</h2>${p.stats?`<div class="table-wrap"><table><thead><tr>${Object.values(positions).map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody><tr>${Object.keys(positions).map(k=>`<td>${html(p.stats[k]??'—')}</td>`).join('')}</tr></tbody></table></div>`:''}${p.abilities?.length?`<p>특성 · ${p.abilities.map(html).join(', ')}</p>`:''}${p.forms?.length?`<ul class="plain-list">${p.forms.map(f=>`<li>${html(f.name??'다른 모습')} ${types(f.types)}</li>`).join('')}</ul>`:''}${p.en?`<p>영어 이름 · ${html(p.en)}</p>`:''}</section>`:''}`;
}
function evolution(id,mode,targetId){
 const view=evolutionData();
 if(id){
  const family=view.byMember.get(Number(id));
  if(!family)return page('진화 도감')+empty('현재 설정에서 이 포켓몬의 진화를 볼 수 없어요.')+link('evolution','진화 도감으로');
  const branches=!linearFamily(family,view);
  const ends=branches?family.ids.filter(member=>!view.edges.has(member)):[];
  const target=mode==='to'&&ends.includes(Number(targetId))?Number(targetId):0;
  const pathIds=target?new Set(evolutionPath(view,family.root,target)):null;
  const chooser=branches?`<section class="panel evo-choice"><h2>누구로 진화시킬까?</h2><div class="filters">${chip('evolution/'+id,'전체 계보',!target)}${ends.map(n=>chip('evolution/'+id+'/to/'+n,getPokemon(n).name,n===target)).join('')}</div></section>`:'';
  return link('evolution','‹ 진화 도감')+
   page(getPokemon(family.root).name+'의 진화 계보','단계마다 진화 조건을 확인하세요.')+
   chooser+`<section class="evo-family panel" aria-label="진화 계보">${evolutionNode(family.root,target||Number(id),view,pathIds)}</section>`;
 }
 return page('진화 도감','포켓몬 이름이나 도감 번호로 검색하면 처음부터 마지막까지 볼 수 있어요.')+
  query('evolution-query',ui.evolutionQuery,'포켓몬 이름 또는 도감 번호')+
  `<div class="filters">${select('evolution-method',Object.entries(evolutionMethods),ui.evolutionMethod,'진화 방법')}</div><div id="evolution-results">${evolutionResults(view)}</div>`;
}
function evolutionResults(view=evolutionData()){
 const q=ui.evolutionQuery.trim(), numeric=/^\d+$/.test(q);
 const contains=p=>numeric?[p.id,...Object.values(p.dex)].includes(Number(q)):match([p.name,p.en,p.ja],q);
 const families=view.families.filter(f=>(ui.evolutionMethod==='all'||f.methods.has(ui.evolutionMethod))&&(!q||f.ids.some(id=>contains(getPokemon(id)))));
 if(!families.length)return empty('조건에 맞는 진화 계보가 없어요.');
 const size=18, last=Math.ceil(families.length/size)-1, current=Math.min(ui.evolutionPage,last);
 return `<p class="count">${families.length}개의 진화 계보</p><div class="evo-grid">${families.slice(current*size,(current+1)*size).map(f=>{
  const root=getPokemon(f.root), matchId=q?f.ids.find(id=>contains(getPokemon(id)))??f.root:f.root;
  const chain=linearFamily(f,view);
  const kinds=[...f.methods].map(type=>evolutionMethods[type]).join(' · ');
  return `<a class="evo-card" href="${to('evolution',matchId)}">
  <div class="evo-list-art" style="${typeStyle(root.types[0])}">${portrait(root)}</div><div><h2>${html(root.name)}</h2>
  <p>${chain?f.ids.map(id=>html(getPokemon(id).name)).join(' → '):f.ids.slice(1).map(id=>html(getPokemon(id).name)).join(' · ')}</p><small>${html(kinds)}</small></div></a>`;
 }).join('')}</div>${last?`<div class="pager"><button type="button" class="button" data-act="evo-page" data-value="${current-1}"${current===0?' disabled':''}>‹ 이전</button><span>${current+1} / ${last+1}</span><button type="button" class="button" data-act="evo-page" data-value="${current+1}"${current===last?' disabled':''}>다음 ›</button></div>`:''}`;
}
function evolutionNode(id,selected,view,pathIds){
 const p=getPokemon(id);
 const edges=(view.edges.get(id)??[]).filter(e=>!pathIds||pathIds.has(e.id));
 const catchable=p.encounters?.some(e=>showWorld(e.region)&&(!e.requiresDlc||store.settings.dlc));
 return `<div class="evo-stage">
  <div class="evo-species${id===selected?' chosen':''}"><div class="evo-species-art" style="${typeStyle(p.types[0])}">${portrait(p)}</div><div><a class="evo-species-name" href="${to('pokemon',id)}"${id===selected?' aria-current="true"':''}>${html(p.name)}</a>${types(p.types)}${catchable?`<a class="evo-location inline-link" href="${to('pokemon',id)}/where">어디서 만날까?</a>`:''}</div></div>
  ${edges.length?`<ul class="evo-branches">${edges.map(edge=>`<li>
   ${evolutionCondition(edge)}
   ${evolutionNode(edge.id,selected,view,pathIds)}
  </li>`).join('')}</ul>`:''}</div>`;
}
function evolutionCondition(edge){
 const methods=[evolutionMethods[edge.method],edge.externalGame?'다른 게임':null,
  edge.version?versions[edge.version]:null,edge.dlc?worldNames[edge.dlc]:null].filter(Boolean);
 const variants=edge.variants??[];
 const forms=!variants.length?[edge.fromForm,edge.toForm].filter(Boolean).join(' → '):'';
 const articleIds=new Set([edge.itemArticle]);
 if(edge.method==='item'&&edge.items?.some(i=>i.name.endsWith('의돌')))articleIds.add('stones');
 if(edge.method==='trade'&&edge.items?.length)articleIds.add('trade-evo');
 if(edge.method==='friendship')articleIds.add('friendship-picnic');
 const links=[...articleIds].map(id=>articles.get(id)).filter(a=>a&&showWorld(a.world)).map(a=>link('article/'+a.id,a.title));
 const reference=safeUrl(edge.source?.url);
 return `<div class="evo-condition">
  <div class="evo-tags">${methods.map(name=>`<span class="badge">${html(name)}</span>`).join('')}</div>
  ${forms?`<p class="evo-form">${html(forms)}</p>`:''}
  <p>${html(edge.condition)}</p>
  ${variants.length?`<ul class="evo-variants">${variants.map(v=>`<li>${v.fromForm||v.toForm?`<strong>${html([v.fromForm,v.toForm].filter(Boolean).join(' → '))}</strong> `:''}${html(v.condition)}</li>`).join('')}</ul>`:''}
  ${edge.steps?.length?`<details class="evo-steps"><summary>따라 하는 순서</summary><ol>${edge.steps.map(s=>`<li>${html(s)}</li>`).join('')}</ol></details>`:''}
  ${edge.note?`<p class="evo-note">${html(edge.note)}</p>`:''}
  ${links.length?`<div class="actions">${links.join('')}</div>`:''}
  ${reference?`<a class="evo-source inline-link" href="${html(reference)}" target="_blank" rel="noopener noreferrer">${html(edge.source.title)} ↗</a>`:''}
 </div>`;
}
function adventure(filter) {
 const groups=[['all','추천 순서'],['intro','첫 모험'],...Object.entries(missionRoutes).filter(([id])=>!isDlcRoute(id)||store.settings.dlc)];
 const opening=m=>['intro','school'].includes(m.id);
 const visible=db.adventure.missions.filter(m=>showMission(m)&&(!filter||filter==='all'||(filter==='intro'?opening(m):m.route===filter&&!opening(m))));
 return page('모험 가이드','가고 싶은 목적지를 골라요. 완료한 모험은 다음 추천에 반영돼요.')+
 `<div class="filters">${groups.map(([id,label])=>chip('adventure/'+id,label,(filter??'all')===id)).join('')}</div>`+
 (visible.length?`<div class="guide-list">${visible.map((m,i)=>guideCard(m,i)).join('')}</div>`:empty('이 길의 모험을 열려면 설정과 진행 상황을 확인하세요.'));
}
function guideCard(m,i) {
 const hidden=m.spoiler&&!store.settings.spoilers&&!revealed.has('mission:'+m.id)&&!store.completed.includes(m.id);
 return `<a class="guide-card mission-card board-${routeTone(m.route)}" href="${to('mission',m.id)}"><div class="card-row"><span class="eyebrow">${html((['intro','school'].includes(m.id)?'첫 모험':missionRoutes[m.route])??'모험')}</span><span class="status">${store.completed.includes(m.id)?'완료 ✓':!hidden&&m.level?'Lv. '+m.level:'⚑'}</span></div>${!hidden?guideImage(missionArt(m,db.visualSteps),'guide-thumb'):''}<h3>${html(hidden?'잠긴 모험':m.title)}</h3><small>${html(hidden?'자세한 내용은 선택해서 볼 수 있어요.':m.place)}</small></a>`;
}
function partyTable(party){
 const rows=(party??[]).map(o=>{
  const p=getPokemon(o.species??o.id);
  const form=p?.forms?.find(f=>f.name===o.form);
  const defenders=form?.types??p?.types??[];
  const groups=defensiveGroups(defenders,o.tera);
  const weak=[...groups].filter(([v])=>v>1).sort(([a],[b])=>b-a).flatMap(([,v])=>v).filter(t=>!o.immuneTo?.includes(t));
  const picture=p&&!o.form&&!p.forms?.length?`<span class="opponent-art">${spriteImage(p,'normal')}</span>`:'';
  const tip=o.abilityTip?`<small class="ability-tip">${html(o.ability)} · ${html(o.abilityTip)}</small>`:'';
  return `<tr><td>${picture}${p?pokemonLink(p.id):html(o.name??'포켓몬')}${o.form?`<small> · ${html(o.form)}</small>`:''}${store.settings.advanced?types(defenders):''}${o.tera?`<small>테라 ${o.tera==='stellar'?'스텔라':TYPES[o.tera]?.[0]??html(o.tera)}</small>`:''}</td><td>${html(o.level??'—')}</td>${store.settings.advanced?`<td>${weak.length?types(weak):'뚜렷한 약점 없음'}${tip}</td>`:''}</tr>`;
 });
 return rows.length?`<div class="table-wrap"><table><thead><tr><th>상대</th><th>레벨</th>${store.settings.advanced?'<th>약점</th>':''}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'';};

function missionParty(m,expanded){
 const extraParties=Object.entries(m.starterParties??{}).map(([id,party])=>`<details class="section"><summary>${html(getPokemon(id)?.name??'첫 파트너')}를 골랐다면</summary>${partyTable(party)}</details>`).join('');
 const recs=(m.recommendations??[]).map(pokemonLink).join('');
 const content=partyTable(m.party)+extraParties+
 (m.afterCreditsParty?.length?`<details><summary>본편 엔딩 이후 상대</summary>${partyTable(m.afterCreditsParty)}</details>`:'')+
 (m.versions?.violet?.party?.length?`<details><summary>바이올렛의 상대</summary>${partyTable(m.versions.violet.party)}</details>`:'')+
 (m.specialOpponent?`<p>${html(m.specialOpponent.name)} · Lv. ${html(m.specialOpponent.level)} ${type(m.specialOpponent.type)}</p>`:'');
 return preparation(expanded)+(m.battleFormat?'<p>'+html(m.battleFormat)+'</p>':'')+(recs?'<div class="actions">'+recs+'</div>':'')+content;
}
function nextStops(m) {
 const destinations=(m.nextLinks??[]).flatMap(route=>{
  const [view,id,,point]=route.split('/');
  if(view==='mission'){
   const next=missions.get(id);
   if(!showMission(next))return [];
   const locked=next.spoiler&&!store.settings.spoilers&&!store.completed.includes(id)&&!revealed.has('mission:'+id);
   return [link(route,locked?'다음 이야기 열기':next.title+' 공략')];
  }
  if(view==='map'||view==='dex'){
   if(!showWorld(id))return [];
   const name=point?visibleTarget(point)?.point.title:worldNames[id];
   return name?[link(route,name+(view==='map'?' 지도':' 도감'))]:[];
  }
  return view==='field'?[link(route,chapters[id]??'탐험 안내')]:[];
 });
 return [...new Set(destinations)].join('');
}
function mission(id,stageNumber) {
 const m=missions.get(id);
 if(!showMission(m))return page('모험 가이드')+empty('이 모험을 보려면 DLC 설정을 확인하세요.')+link('settings','설정 열기');
 const locked=m.spoiler&&!store.completed.includes(id)&&gate('mission:'+id,'이 모험은 뒷이야기의 인물이나 배틀이 나올 수 있어요.');
 if(locked)return page('잠긴 모험')+locked+link('adventure','‹ 모험 가이드');
 const expanded=expandedFor(id);
 const directions=wayfinding.missions[id];
 const stages=directions?.stages??expanded.route.map((step,i)=>({
  title:step.label,action:step.body,point:m.stagePoints?.[i],battle:step.battle,useMissionParty:step.useMissionParty,
  cues:directions?.steps.filter((_,n)=>m.wayfindingStages?.[n]===i+1)
 }));
 const parsed=Number(stageNumber);
 const index=Number.isInteger(parsed)&&parsed>=1&&parsed<=stages.length?parsed-1:0;
 const stage=stages[index];
 const stageUrl=i=>'mission/'+id+'/'+(i+1);
 const target=visibleTarget(stage.point);
 const start=visibleTarget(stage.from);
 const context=stage.diagram?.length?'/mission/'+id+'/'+(index+1):'';
 const mapUrl=target?'map/'+target.world+'/all/'+target.point.id+context:'';
 const world=target&&db.map.worlds.find(w=>w.id===target.world);
 const mapLabel=stage.mapLabel??(target?target.point.title+' 지도 열기':'');
 const map=target?(mapInset(world,target.point,'#'+mapUrl,{from:start?.world===target.world?start.point:null,label:mapLabel})||link(mapUrl,mapLabel)):'';
 const diagram=landmarkDiagram(stage.diagram);
 const photoSource=stage.photoSource&&safeUrl(stage.photoSource.url);
 const photoUrl=stage.photo?.startsWith('data:image/webp;base64,')?stage.photo:safeUrl(stage.photoUrl);
 const photo=photoUrl?'<figure class="stage-photo" hidden><img data-route-scene decoding="async" referrerpolicy="no-referrer" src="'+html(photoUrl)+'" alt="'+html(stage.photoAlt??stage.look??stage.title)+'"><figcaption>'+html(stage.photoAlt??stage.title)+(photoSource?' <a class="inline-link" href="'+html(photoSource)+'" target="_blank" rel="noopener noreferrer">사진 출처 ↗</a>':'')+'</figcaption></figure>':'';
 const cue=stage.cues?.length?`<details class="cue-details"><summary>이 구간에서 찾을 표식</summary>${guideSteps(stage.cues)}</details>`:'';
 const startPrep=directions?.prepare||expanded.check?.join(' · ')||m.prep;
 const battle=stage.battle;
 const isAfter=ui.routeEnding??store.completed.includes('area-zero');
 const versionButtons=battle?.after?.length?`<div class="route-period" role="group" aria-label="게임 진행 상태">${[[false,'본편 엔딩 전'],[true,'본편 엔딩 후']].map(([val,label])=>`<button data-act="route-ending" data-value="${val}" aria-pressed="${val===isAfter}">${label}</button>`).join('')}</div>`:'';
 const specificBattle=battle?`<section class="stage-party"><h3>여기서 만나는 상대</h3>${versionButtons}${partyTable(isAfter&&battle.after?.length?battle.after:battle.before)}<p>${html(battle.tip??'')}</p></section>`:'';
 const partyInfo=missionParty(m,expanded);
 const challenge=stage.useMissionParty?'<section class="stage-party"><h3>여기서 만나는 상대</h3>'+partyInfo+'</section>':specificBattle;
 const next=index+1<stages.length?link(stageUrl(index+1),'다음 단계 · '+stages[index+1].title,'primary'):'';
 const end=store.completed.includes(id);
 const mark=button('mission-mark',end?'완료 취소':'이 모험을 끝냈어요',id,end?'':'primary');
 const recovery=stage.ifLost??(!directions?.stages&&index===stages.length-1?expanded.stuck:null);
 const solution=expanded.solution?.length?`<details class="cue-details"><summary>${html(expanded.solutionTitle??'시험 정답 펼치기')}</summary><ul>${expanded.solution.map(s=>`<li><strong>${html(s.label)}</strong> ${html(s.body)}</li>`).join('')}</ul></details>`:'';
 const extras=!directions?.stages&&!stages.some(s=>s.useMissionParty||s.battle)&&partyInfo?`<details class="mission-extra panel"${store.settings.advanced?' open':''}><summary>상대와 배틀 준비</summary>${partyInfo}</details>`:'';
 const prereqs=(m.prerequisites??[]).filter(k=>!store.completed.includes(k)).map(k=>{const pre=missions.get(k);return link('mission/'+k,pre.spoiler&&!store.settings.spoilers?'앞선 이야기':pre.title)});
 const skipMap=(index===0&&!map&&!directions?.stages)&&db.map.worlds.filter(w=>showWorld(w.id)).flatMap(w=>w.points.filter(p=>p.mission===id&&visibleTarget(p.id)).map(p=>link('map/'+w.id+'/all/'+p.id,p.title+' 지도'))).slice(0,2).join('');
 return `<header class="route-head"><a href="#adventure">‹ 모험 가이드</a><h1>${html(m.title)}</h1></header>
 <section class="panel route-current" id="route-current" tabindex="-1"><div class="route-position"><span>지금 할 일 · ${index+1} / ${stages.length}</span><label>현재 위치 <select id="mission-stage" aria-label="현재 위치에서 시작">${stages.map((s,i)=>`<option value="${i+1}"${i===index?' selected':''}>${i+1}. ${html(s.title)}</option>`).join('')}</select></label></div>
 <div class="stage-layout${diagram||photo||map?' has-media':''}"><div class="stage-instructions"><h2>${html(stage.title)}</h2><p class="stage-action">${html(stage.action)}</p>
 ${stage.look?`<p class="stage-look"><strong>게임에서 찾기</strong> ${html(stage.look)}</p>`:''}
 ${index===0&&startPrep?`<p class="stage-pack"><strong>출발 전 준비</strong> ${html(startPrep)}</p>`:''}
 ${challenge}${cue}${recovery?`<p class="stage-recovery"><strong>길을 놓쳤다면</strong> ${html(recovery)}</p>`:''}
 ${skipMap?`<div class="actions">${skipMap}</div>`:''}
 </div>${diagram||photo||map?`<div class="stage-media">${diagram}${photo}${map}</div>`:''}<div class="actions stage-nav">${index?link(stageUrl(index-1),'‹ 이전 단계'):''}${next||mark}${button('speak','이 단계 듣기',[stage.title,stage.action,stage.look,index===0?startPrep:'',recovery].filter(Boolean).join('. '))}</div></div></section>
 ${m.id==='intro'&&index===1?`<section class="panel"><h2>함께 출발할 친구</h2><div class="dex-grid starter-grid">${m.recommendations.map(id=>pokeCard(getPokemon(id),'paldea')).join('')}</div></section>`:''}
 ${solution}${extras}
 <section class="panel mission-finish" id="mission-finish" tabindex="-1"><h2>${end?'완료했어요 ✓':'모험을 마치면'}</h2><p><b>보상</b> ${html(expanded.reward??m.reward)}</p>${m.next?`<p><b>다음 목적지</b> ${html(m.next)}</p>`:''}
 <div class="actions">${nextStops(m)}${index<stages.length-1?mark:''}</div></section>
 ${prereqs.length?`<details class="section"><summary>이 모험 전에 할 일</summary><div class="actions">${prereqs.join('')}</div></details>`:''}
 ${extraReferences(expanded,safeUrl)}${provenance({guides:directions?.sources??[]},['guides'])}${provenance(db.adventure.sources,m.sources)}`;
}
function missionMapReturn(active){
 const [, , ,point,mode,id,number]=path();
 if(mode!=='mission'||active?.id!==point)return '';
 const m=missions.get(id);
 const stage=wayfinding.missions[id]?.stages?.[Number(number)-1];
 if(!showMission(m)||stage?.point!==point||!stage?.diagram?.length)return '';
 if(m.spoiler&&!store.settings.spoilers&&!store.completed.includes(id)&&!revealed.has('mission:'+id))return '';
 return `<section class="panel mission-map-step"><h2>${html(stage.title)}</h2><p>${html(stage.look)}</p>${landmarkDiagram(stage.diagram)}${link('mission/'+id+'/'+number,'이 단계로 돌아가기')}</section>`;
}
function mapView(id,filter,selected) {
 const worlds=db.map.worlds.filter(w=>showWorld(w.id));
 const world=worlds.find(w=>w.id===id)??worlds[0];
 if(!world)return page('모험 지도')+empty('지도 자료를 열 수 없어요.');
 const stakeColors={purple:'보라',yellow:'노랑',green:'초록',blue:'파랑'};
 const stakeColor=filter==='stake'&&Object.hasOwn(stakeColors,selected)?selected:null;
 const habitat=filter==='habitat'?getPokemon(selected):null;
 const speciesCells=habitat&&showSpecies(habitat)?world.nativeMap.habitats[habitat.id]:null;
 const game=path()[4]==='violet'?'violet':'scarlet';
 const cells=speciesCells?[...new Set([...(speciesCells.both??[]),...(speciesCells[game]??[])])]:[];
 const treasures=['item','tm','evolution','gimmighoul','collectible','stake'];
 const tmPoints=new Map(world.points.filter(p=>wayfinding.byPoint.has(p.id)).map(p=>[p.id,machinesAt(p.id)]));
 const teraPoints=new Map();
 for(const point of world.points){
  const found=[];
  for(const [id,rows] of huntIndex.get(point.id)??[]){
   const species=getPokemon(id);
   if(!showSpecies(species)||(species.spoiler&&!store.settings.rare))continue;
   for(const entry of rows)if(entry.kind==='tera'&&matchesHunt(entry,species,'scarlet',store.settings.dlc))found.push({species,entry});
  }
  if(found.length)teraPoints.set(point.id,found);
 }
 const inCategory=(p,key)=>key==='all'||(key==='tera'&&teraPoints.has(p.id))||p.category===key||(key==='tm'&&tmPoints.get(p.id)?.length)||(key==='item'&&treasures.includes(p.category));
 const categories=[['all','모두'],...Object.entries(pointCategories).filter(([key])=>world.points.some(p=>showPoint(p)&&inCategory(p,key))).map(([key,[name]])=>[key,key==='item'?'보물과 도구':name])];
 const current=categories.some(([key])=>key===filter)?filter:'all';
 const points=world.points.filter(p=>showPoint(p)&&(!p.spoiler||store.settings.rare||revealed.has('point:'+p.id))&&
 (!ui.mapOnlyPokemon||p.pokemon?.includes(ui.mapOnlyPokemon))&&
 inCategory(p,current)&&(!stakeColor||p.id.startsWith('stake-'+stakeColor+'-'))&&
 match([p.title,p.region,p.detail,...(current==='tera'?(teraPoints.get(p.id)??[]).flatMap(({species,entry})=>[species.name,teraName(entry.tera)]):[]),...(current==='tm'?(tmPoints.get(p.id)??[]).flatMap(({article})=>[article.title,'TM'+num(article.tmNumber)]):[])],ui.mapQuery));
 const active=points.find(p=>p.id===(ui.mapSelected||(habitat?path()[5]:selected)));
 const concealed=!active&&world.points.find(p=>p.id===selected&&p.spoiler);
 const primary=['gym','titan','star','town','area','shrine','landmark'];
 const pins=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&(current!=='all'||ui.mapQuery||p===active||primary.includes(p.category)||Boolean(habitat&&p.pokemon?.includes(habitat.id))));
 const label=p=>pointCategories[p.category]?.[0]??'장소';
 const icon=p=>pointCategories[p.category]?.[1]??'◎';
 const found=p=>store.found.includes(p.id);
 const areaDex=active?.locationIds?.length?db.dex.pokemon.filter(p=>showSpecies(p)&&p.encounters?.some(e=>active.locationIds.includes(e.locationId)&&(!e.requiresDlc||store.settings.dlc))&&(!p.spoiler||store.settings.rare)) : [];
 const fixedTera=teraPoints.get(active?.id)??[];
 const teraPanel=fixedTera.length?`<details class="section"${current==='tera'?' open':''}><summary>스칼렛에서 만나는 야생 테라스탈 포켓몬</summary><div class="tm-areas">${fixedTera.map(({species:p,entry:e})=>`<div>${link('pokemon/'+p.id+'/where',p.name)}<small>${html(teraName(e.tera))} · Lv. ${e.minLevel}${e.maxLevel>e.minLevel?'–'+e.maxLevel:''}</small>${link('battle/'+p.id+'/'+e.tera,'배틀 준비')}</div>`).join('')}</div></details>`:'';
 const chooseHabitat=Object.keys(world.nativeMap.habitats).map(getPokemon).filter(p=>showSpecies(p)&&(!p.spoiler||store.settings.rare)).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
 const pointMachines=tmPoints.get(active?.id)??[];
 const tmLinks=pointMachines.length?`<details class="section"${current==='tm'?' open':''}><summary>이 장소와 연결된 기술머신 ${pointMachines.length}개</summary><div class="tm-areas">${pointMachines.map(({article,kind})=>`<div>${link('article/'+article.id,article.title)}<span class="badge">${wayfindingLabels[kind]}</span></div>`).join('')}</div></details>`:'';
 return page('모험 지도',world.description||'장소를 눌러 가는 방법을 살펴보세요.')+
 `<div class="filters">${worlds.map(w=>chip('map/'+w.id,w.title,w.id===world.id)).join('')}${ui.mapOnlyPokemon?button('map-unfilter','포켓몬 필터 지우기'):''}</div>
 <div class="actions">${select('map-category',categories,current,'지도 종류')}${select('atlas-species',chooseHabitat.map(p=>[p.id,p.name]),habitat?.id,'포켓몬 서식 구역','포켓몬 서식 구역 찾기')}${current==='tm'?link('field/items','기술 이름·번호로 찾기'):''}</div>${query('map-query',ui.mapQuery,current==='tm'?'장소, 기술 이름 또는 TM 번호':current==='tera'?'지역, 포켓몬 이름 또는 테라스탈 타입':'장소 또는 아이템 이름')}${concealed?gate('point:'+concealed.id,'후반 지역이나 희귀 발견 정보가 나올 수 있어요.','rare'):''}
 ${current==='stake'?`<div class="filters stake-filters">${chip('map/'+world.id+'/stake','모든 색',!stakeColor)}${Object.entries(stakeColors).map(([key,name])=>chip('map/'+world.id+'/stake/'+key,name+' '+world.points.filter(p=>p.id.startsWith('stake-'+key+'-')&&found(p)).length+'/8',stakeColor===key)).join('')}</div>`:''}
 ${encounterMapNote(world,habitat,active)}
 ${speciesCells?`<div class="habitat-legend"><b>▧ ${html(habitat.name)} · 야생 출현 구역</b><p>${cells.length?'빗금은 야생 출현 기록이 있는 곳 주변이에요. 풀밭·물가·동굴과 시간에 따라 만날 수 있어요.':'이 버전에서 확인한 일반 야생 출현 구역이 없어요.'}</p><div class="filters">${['scarlet','violet'].map(v=>chip('map/'+world.id+'/habitat/'+habitat.id+'/'+v+(path()[5]?'/'+encodeURIComponent(path()[5]):''),versions[v],game===v)).join('')}${link('pokemon/'+habitat.id+'/where','포획 방법 보기')}</div></div>`:''}
 <div class="section map-layout atlas-layout"><div>${atlasView(world,pins,active,icon,label,found,cells,current==='all'&&!ui.mapQuery)}${active?`<div class="atlas-selected">${html(active.title)} · ${html(active.nativeRole??'지역 안내')} ${button('map-read','장소 설명 보기')}</div>`:''}${missionMapReturn(active)}</div>
 <div class="map-list" aria-label="장소 목록">${points.length?points.map(p=>`<button class="${p.id===active?.id?'active':''}" data-act="map-point" data-value="${html(p.id)}">${icon(p)} ${html(p.title)}${found(p)?' ✓':''}<small>${label(p)} · ${html(p.nativeRole??'지역 안내')}</small></button>`).join(''):empty('표시할 장소가 없어요.')}</div></div>${active?`<section class="panel map-detail" id="selected-point" tabindex="-1" aria-label="선택한 장소"><div class="card-row"><h2>${html(active.title)}</h2><span class="badge">${html(active.nativeRole??'지역 안내')}</span></div><p>${html(active.region)} · ${label(active)}</p><p>${html(active.detail)}</p>${active.landmarkHint?`<p><strong>가까운 표식</strong> ${html(active.landmarkHint)}</p>`:''}<div class="actions">${active.mission&&showMission(missions.get(active.mission))?link('mission/'+active.mission,'공략 보기'):''}${(active.pokemon??[]).map(pokemonLink).join('')}${active.battle?link('battle/'+active.pokemon[0]+'/'+active.battle,'이 상대와 배틀 준비'):''}${active.article?link('article/'+active.article,'말뚝 여덟 곳 따라가기'):''}${button('point-mark',found(active)?'찾았어요 ✓':'찾았다고 기록',active.id,'primary')}${button('speak','🔊 읽어주기',active.title+'. '+active.detail)}</div>${huntIndex.has(active.id)?link('hunt/'+world.id+'/'+active.id,'여기서 만나는 포켓몬'):''}${areaDex.length?`<details class="section"><summary>이 구역에 기록된 포켓몬 ${areaDex.length}마리</summary><div class="actions">${areaDex.map(p=>pokemonLink(p.id)).join('')}</div></details>`:''}${active.respawnSpecies?.length?`<details><summary>다시 나타날 때 만날 수 있는 포켓몬</summary><div class="actions">${active.respawnSpecies.map(pokemonLink).join('')}</div></details>`:''}${teraPanel}${tmLinks}${screenshotRefs(db.visualRefs.points?.[active.id],safeUrl)}${provenance(db.map.sources,active.sources)}</section>`:''}`;

}
function battle(id,requestedTera) {
 const tera=requestedTera==='stellar'||isType(requestedTera)?requestedTera:(id?'':ui.tera);
 const target=getPokemon(id||ui.battleSpecies);
 const accessible=showSpecies(target)?target:null;
 const defenders=accessible?.types??[ui.def1,ui.def2].filter(Boolean);
 const values=typeIds.map(t=>[t,TYPES[t][0]]);
 const blockedAttacks=levitates(accessible)?['ground']:[];
 const test=effectiveness(ui.attack,defenders,tera,blockedAttacks);
 const groups=defensiveGroups(defenders,tera,blockedAttacks);
 const ranked=recommendTeam(store.team,getPokemon,defenders,tera,name=>movesByName.get(words(name)),blockedAttacks).filter(r=>showSpecies(r.species));
 return page('타입 상성','상대의 타입을 고르고, 어떤 기술을 쓰면 좋을지 살펴보세요.')+`
 <div class="columns"><section class="panel"><h2>상대 포켓몬</h2>${accessible?`<p><strong>${html(accessible.name)}</strong> ${types(defenders)}</p><div class="actions">${link('battle','직접 고르기')}</div>`:`<div class="actions">${select('def1',values,ui.def1,'첫 번째 상대 타입')}${select('def2',values,ui.def2,'두 번째 상대 타입','두 번째 타입 없음')}</div>`}
 <label class="label-row">상대가 테라스탈했다면 ${select('tera',[...values,['stellar','스텔라']],tera,'테라스탈 타입','테라스탈 안 함')}</label><small>스텔라는 원래 방어 타입을 유지해요. ${blockedAttacks.length?'부유 특성 때문에 땅 기술은 닿지 않아요.':'타입 기준 계산이에요. 상대의 특성과 기술에 따라 실제 결과가 달라질 수 있어요.'}</small>
 <label class="label-row">내 기술 타입 ${select('attack',values,ui.attack,'내 기술 타입')}</label>
 <p><strong>${type(ui.attack)} → ${test===0?'효과 없음':test===1?'보통 효과 · 1배':test>1?'효과가 굉장해요 · '+test+'배':'효과가 작아요 · '+test+'배'}</strong></p></section>
 <section class="panel"><h2>잘 통하는 기술 타입</h2>${[4,2,0.5,0.25,0].filter(n=>groups.has(n)&&(store.settings.advanced||n>=2||n===0)).map(n=>`<div class="next-type"><strong>${n===0?'효과 없음':n+'배'}</strong>${types(groups.get(n))}</div>`).join('')||empty('이 타입 조합에는 타입으로 인한 약점이 없어요.')}</section></div>
 <section class="panel section"><h2>내 팀에서 누구를 보낼까?</h2>${ranked.length?`<ol class="plain-list">${ranked.map(r=>`<li><strong>${html(r.species.name)}</strong> ${type(r.best?.type)} ${r.best?.value??'—'}배 <small>${r.best?(r.actual?html(r.best.name)+(r.best.known?'':' · 입력한 타입 기준'):'타입으로 고른 후보'):'등록한 공격 기술 없음'}</small></li>`).join('')}</ol>`:empty('팀을 만들면 실제 기술을 기준으로 골라볼 수 있어요.')}${link('team','팀 보기')}</section>
 ${store.settings.advanced?`<section class="panel section"><h2>18가지 타입 전체 표</h2><p>세로는 공격 타입, 가로는 방어 타입이에요.</p><div class="table-wrap"><table><thead><tr><th>공격</th>${typeIds.map(t=>`<th>${type(t)}</th>`).join('')}</tr></thead><tbody>${typeIds.map(t=>`<tr><th>${type(t)}</th>${typeIds.map(d=>`<td>${effectiveness(t,[d])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`:''}`;
}
function teamChoices(){
 const list=db.dex.pokemon.filter(p=>showSpecies(p)&&match([p.name,p.en],ui.teamQuery)).filter(p=>!store.team.some(t=>t.id===p.id));
 if(!ui.teamQuery){const score=p=>store.caught.includes(p.id)?0:[906,909,912].includes(p.id)?1:p.encounters?.some(e=>e.region==='paldea'&&e.kind==='wild'&&e.minLevel<=7&&!e.requiresDlc)?2:3;list.sort((a,b)=>score(a)-score(b));}
 return list.slice(0,10).map(p=>button('team-add','＋ '+p.name,p.id)).join('')||empty('팀에 넣을 수 있는 포켓몬이 없어요.');
}
function team() {
 const typesFound=new Set(store.team.flatMap(t=>{const p=getPokemon(t.id);return showSpecies(p)?p.types:[]}));
 const attacks=new Set(store.team.flatMap(t=>{const p=getPokemon(t.id);return showSpecies(p)?(t.moves.length?t.moves.filter(m=>movesByName.get(words(m.name))?.category!=='status').map(m=>movesByName.get(words(m.name))?.type??m.type):p.types):[]}));
 const noStrongHit=typeIds.filter(d=>![...attacks].some(a=>effectiveness(a,[d])>1));
 const weaknesses=typeIds.map(a=>[a,store.team.filter(member=>{const p=getPokemon(member.id);return showSpecies(p)&&effectiveness(a,p.types)>1}).length]).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]);
 return page('나의 포켓몬 팀','함께 모험할 포켓몬을 최대 6마리까지 고를 수 있어요.')+
 `<div class="columns"><div class="stack"><section class="panel"><div class="card-row"><h2>함께 갈 포켓몬</h2><span class="status">${store.team.length} / 6</span></div>${store.team.length?store.team.map((member,i)=>teamCard(member,i)).join(''):empty('아직 비어 있어요. 아래에서 첫 포켓몬을 골라 보세요.')}</section>${store.team.length<6?`<section class="panel"><h2>팀에 넣기</h2>${query('team-query',ui.teamQuery,'포켓몬 이름')}<div class="actions" id="team-results">${teamChoices()}</div></section>`:''}</div>
 <section class="panel"><h2>배틀 준비</h2><p>우리 팀 타입</p>${types([...typesFound])}${store.team.length?`<p>2마리 이상이 약한 타입</p>${weaknesses.length?`<div class="pills">${weaknesses.map(([t,n])=>type(t)+`<small>${n}마리</small>`).join('')}</div>`:empty('같은 약점을 가진 포켓몬이 2마리 이상 없어요.')}<p>효과가 굉장한 기술이 부족한 상대 타입</p>${noStrongHit.length?types(noStrongHit):empty('모든 단일 타입에 대응할 기술이 있어요.')}<small>기술을 입력하기 전에는 포켓몬 자신의 타입으로만 계산해요.</small>`:''}<div class="actions">${link('battle','배틀에서 확인하기','primary')}${link('adventure','지금 만날 수 있는 포켓몬 찾기')}</div></section></div>`;
}
function teamCard(member,i) {
 const p=getPokemon(member.id);
 if(!showSpecies(p))return `<div class="check-card">표시가 꺼진 포켓몬 ${button('team-remove','빼기',i,'danger')}</div>`;
 return `<article class="section"><div class="team-entry"><div>${pokemonLink(member.id)} ${types(p.types)}</div><label>레벨<input class="form-input" type="number" min="1" max="100" value="${member.level}" data-member="${i}" data-field="level" aria-label="${html(p.name)} 레벨"></label></div><details><summary>기술 입력 ${member.moves.length}/4</summary><form class="moves-form" data-moves="${i}">${Array.from({length:4},(_,n)=>`<div class="actions" style="margin:8px 0"><input class="form-input" name="move${n}" maxlength="35" placeholder="기술 ${n+1} 이름" aria-label="기술 ${n+1} 이름" value="${html(member.moves[n]?.name??'')}">${select('member-'+i+'-type-'+n,typeIds.map(t=>[t,TYPES[t][0]]),member.moves[n]?.type??'','기술 '+(n+1)+' 타입','타입')}</div>`).join('')}<button type="submit" class="button primary">기술 저장</button></form></details><div class="actions">${button('team-remove','팀에서 빼기',i,'danger')}</div></article>`;
}
function recipes(){
 const powers=[...new Set(db.recipeBook.recipes.flatMap(r=>r.powers.map(p=>p.name)))];
 return link('field/picnic','‹ 피크닉·육성')+page('샌드위치 레시피','원하는 식사 파워를 골라요. 번호를 누르면 필요한 재료와 개수가 보여요.')+
 `<div class="actions">${select('recipe-effect',powers.map(n=>[n,n]),cookbook.effect,'식사 파워','모든 식사 파워')}${select('recipe-type',typeIds.map(t=>[t,TYPES[t][0]]),cookbook.type,'식사 파워 타입','모든 타입')}</div>`+
 query('recipe-query',cookbook.query,'레시피 번호, 이름 또는 재료')+`<div id="recipe-results">${recipeResults()}</div>`+provenance({recipes:db.recipeBook.sources},['recipes']);
}
function recipeResults(){
 const entries=db.recipeBook.recipes.filter(r=>
  r.powers.some(p=>(!cookbook.effect||p.name===cookbook.effect)&&(!cookbook.type||p.type===cookbook.type))&&
  (/^\d+$/.test(cookbook.query.trim())?r.number===Number(cookbook.query):match([r.name,...r.ingredients.map(i=>i.name)],cookbook.query)));
 const size=12, last=Math.max(0,Math.ceil(entries.length/size)-1), current=Math.min(cookbook.page,last);
 return `<p class="count">${entries.length}가지 레시피</p><div class="recipe-list">${entries.slice(current*size,(current+1)*size).map(r=>{
  const powers=r.powers.map(p=>`<span class="recipe-power">${html(p.name)} ${p.type?type(p.type):''} Lv. ${p.level}</span>`).join('');
  return `<details class="panel"><summary><strong>${r.number}번 · ${html(r.name)}</strong><span class="recipe-powers">${powers}</span></summary><h3>재료를 고르는 횟수</h3><ul class="plain-list">${r.ingredients.map(i=>`<li>${html(i.name)} × ${i.count}</li>`).join('')}</ul><p>피크닉 테이블에서 ${r.number}번을 골라요. 아직 배우기 전이라면 자유롭게 만드는 모드에서 이 재료를 같은 양으로 골라요.</p></details>`;
 }).join('')}</div>${entries.length?'':empty('이 조건에 맞는 레시피가 없어요.')}${last?`<div class="pager">${current?button('recipe-page','‹ 이전',current-1):''}<span>${current+1} / ${last+1}</span>${current<last?button('recipe-page','다음 ›',current+1):''}</div>`:''}`;
}
function field(category) {
 const current=Object.hasOwn(chapters,category)?category:'rare';
 return page('탐험 안내','희귀 포켓몬, 보물과 기술머신, 피크닉과 테라 레이드를 찾아봐요.')+
 `<div class="filters">${Object.entries(chapters).map(([key,label])=>chip('field/'+key,label,current===key)).join('')}</div>`+
 (current==='picnic'?link('recipes','샌드위치 레시피 찾기','primary'):'')+query('field-query',ui.fieldQuery,'이 장에서 찾기')+`<div id="field-results">${fieldResults(current)}</div>`;
}
function fieldResults(category) {
 const found=db.field.articles.filter(a=>a.category===category&&showWorld(a.world)&&match([a.title,a.summary,a.tmNumber?'TM'+num(a.tmNumber):''],ui.fieldQuery));
 const size=48, max=Math.max(0,Math.ceil(found.length/size)-1), cur=Math.min(max,ui.fieldPage??0);
 return `<div class="count">${found.length}개</div><div class="guide-list">${found.slice(cur*size,(cur+1)*size).map(a=>{
 const hide=a.spoiler&&!store.settings.rare&&!revealed.has('article:'+a.id);
 return `<a class="guide-card" href="${to('article',a.id)}"><span class="eyebrow">${worldNames[a.world]??chapters[a.category]}</span><h3>${html(hide?'숨겨진 탐험':a.title)}</h3><small>${html(hide?'열어서 선택적으로 살펴볼 수 있어요.':a.summary)}</small></a>`;
 }).join('')}</div>${max?`<div class="pager">${button('field-page','‹ 이전',Math.max(0,cur-1))}<span>${cur+1} / ${max+1}</span>${button('field-page','다음 ›',Math.min(max,cur+1))}</div>`:''}${found.length?'':empty('찾는 공략이 없어요.')}`;
}
function article(id) {
 const a=articles.get(id);
 if(!a||!showWorld(a.world))return page('탐험 안내')+empty('공략을 찾을 수 없어요. DLC 설정을 확인하세요.');
 const hidden=a.spoiler&&gate('article:'+id,'특별한 포켓몬이나 후반 지역을 미리 볼 수 있어요.','rare');
 if(hidden)return page('숨겨진 탐험')+hidden+link('field/'+a.category,'‹ 탐험 안내');
 const recipeLink=a.category==='picnic'?link('recipes','샌드위치 레시피 찾기'):'';
 const item=a.category==='items', marked=store.found.includes('article:'+id);
 const tmGuide=a.tmNumber?machineWayfinding(a.tmNumber):'';
 const listedSteps=a.tmNumber?(a.steps??[]).slice(1):a.steps??[];
 const board=recipeBoard(a,movesById.get(a.moveId))||storyBoard(db.visualSteps.articles[id],{branch:id==='evolution-apples',label:id==='evolution-apples'?'사과와 기술로 갈라지는 진화':'그림으로 보는 방법'});
 const refs=screenshotRefs(db.visualRefs.articles[id],safeUrl);
 const expanded=db.expandedField.articles?.[id];
 const mapLinks=(expanded?.points??[]).flatMap(id=>db.map.worlds.filter(w=>showWorld(w.id)).flatMap(w=>w.points.filter(p=>p.id===id&&showPoint(p)).map(p=>link('map/'+w.id+'/all/'+p.id,p.title))));
 const guide=expanded?`<section class="panel section field-guide">${routeSteps(expanded,'이 순서로 해 봐요',step=>step.point?`<div class="actions">${link('map/paldea/all/'+step.point,'지도 위치')}${step.point.startsWith('stake-')?button('point-mark',store.found.includes(step.point)?'뽑았어요 ✓':'뽑았다고 기록',step.point):''}</div>`:'')}${preparation(expanded)}${mapLinks.length&&!expanded.route.some(s=>s.point)?`<div class="actions">${mapLinks.join('')}</div>`:''}${extraReferences(expanded,safeUrl)}</section>`:'';

 return link('field/'+a.category,'‹ '+chapters[a.category])+page(a.title,a.summary,`<span class="eyebrow" style="margin-top:13px">${html(chapters[a.category])}</span>`)+ recipeLink + tmGuide + board + guide +
 `<section class="panel"><ol class="step-list">${listedSteps.map((s,i)=>`<li><span class="step-index">${i+1}</span><span>${html(s)}</span></li>`).join('')}</ol>${a.detail?`<details class="section"${store.settings.advanced?' open':''}><summary>더 자세히</summary><p>${html(a.detail)}</p></details>`:''}${a.species?.length?`<div class="actions">${a.species.map(pokemonLink).join('')}</div>`:''}<div class="actions">${item?button('point-mark',marked?'찾았어요 ✓':'찾았다고 기록','article:'+id,'primary'):''}${button('speak','🔊 읽어주기',[a.title,...(expanded?.route?.map(s=>s.label+'. '+s.body)??listedSteps)].join('. '))}</div></div></section>`+refs+provenance(db.field.sources,a.sources);
}
const journalLabels={caught:'잡은 포켓몬',wanted:'잡고 싶은 포켓몬',evolved:'진화 완료',favorites:'즐겨찾기',completed:'클리어한 모험',found:'수집품'};
function journal(){
 const key=ui.journalTab;
 const progress=Object.entries(worldNames).filter(([world])=>showWorld(world)).map(([world,label])=>{
 const count=countCaught(world), total=dexTotal(world);
 return `<div class="card"><h3>${label} 도감</h3><p>${count} / ${total}마리</p><progress class="progress" max="${total||1}" value="${count}"></progress></div>`;
 }).join('');
 let records;
 if(key==='completed')records=store.completed.flatMap(id=>{const m=missions.get(id);return showMission(m)?[link('mission/'+id,m.title)]:[]});
 else if(key==='found') records=store.found.flatMap(id=>{
   if(id.startsWith('article:')){const a=articles.get(id.slice(8));return a&&showWorld(a.world)?[link('article/'+a.id,a.title)]:[];}
   return db.map.worlds.filter(w=>showWorld(w.id)).flatMap(w=>w.points.filter(p=>p.id===id&&(!p.spoiler||store.settings.rare)).map(p=>link('map/'+w.id+'/all/'+p.id,p.title)));
 });
 else records=store[key].filter(id=>showSpecies(getPokemon(id))).map(pokemonLink);
 return page('나의 모험 기록','스위치에서 모험을 마치면 여기에서 기록해요.')+`
 <div class="grid">${progress}</div><section class="section panel"><h2>모아 보기</h2><div class="actions">${Object.entries(journalLabels).map(([id,label])=>button('journal-tab',label,id,id===key?'primary':'')).join('')}</div>${records.length?`<div class="actions">${records.join('')}</div>`:empty('아직 이 모험 기록이 비어 있어요.')}${key==='caught'?link('dex','도감에서 기록하기'):key==='found'?link('map','지도에서 찾기'):key==='completed'?link('adventure','모험에서 기록하기'):''}</section>${key==='completed'?badgeChecklist():''}<div class="actions section">${link('settings','백업과 설정')}</div>`;
}
function settings(){
 const rows=[['dlc','제로의 비보 보기','벽록의 가면, 남청의 원반, 번외편을 열어요.'],['advanced','상세 모드','능력치, 특성, 자세한 상성을 보여 줘요.'],['spoilers','후반 모험 내용 보기','뒷이야기와 보스 정보까지 펼쳐요.'],['rare','희귀 탐험 내용 보기','전설과 비밀 탐험 정보를 펼쳐요.']];
 return page('모험책 설정','이 브라우저에 팀과 기록이 저장돼요. 다른 기기로 옮길 땐 백업 파일을 사용해요.')+
 `<div class="columns"><section class="panel"><h2>화면에서 볼 내용</h2>${rows.map(([key,label,note])=>`<label class="switch-row"><span><strong>${label}</strong><br><small>${note}</small></span><input type="checkbox" data-setting="${key}"${store.settings[key]?' checked':''}></label>`).join('')}</section>
 <section class="panel"><h2>기록 옮기기</h2><p>복원하면 현재 기록이 백업 파일의 기록으로 바뀌어요.</p><div class="actions">${button('export','백업 파일 받기','','primary')}${button('restore','백업 파일 열기')}</div><h3 class="section">홈 화면에 추가</h3><p>Safari는 공유 메뉴에서 ‘홈 화면에 추가’를, Chrome은 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 찾아보세요.</p></section></div>
 <section class="section panel"><h2>내 도감 이미지</h2><p>직접 저장한 PNG, JPG, WebP를 선택하세요. 파일 이름은 전국도감 번호(906.png) 또는 포켓몬 이름(나오하.webp)이면 됩니다. 파일은 이 브라우저 안에 보관돼요.</p><div class="actions">${button('art-import','이미지 여러 장 불러오기','','primary')}<span class="status">${localImages.size}개 저장</span></div></section>`;
}
function render(){
 if(!db)return;
 const [route='home',id,filter,selected]=path();
 chrome(route);
 const views={home,hunt,trails,recipes,dex,pokemon,evolution,adventure,mission,map:mapView,battle,team,field,article,journal,settings};
 main.innerHTML=(Object.hasOwn(views,route)?views[route]:home)(id,filter,selected);
 const mapWorld=route==='map'&&db.map.worlds.find(w=>showWorld(w.id)&&w.id===id)||db.map.worlds[0];
 const chosen=main.querySelector('.atlas-selected')&&mapWorld.points.find(p=>p.id===(ui.mapSelected||(filter==='habitat'?path()[5]:selected)));
 mountAtlas(main,route==='map'?mapWorld:null,chosen);
 document.title=(routes[route]?.[0]??'팔데아 모험책')+' · 팔데아 모험책';
}
function updateResults(key,value) {
 ui[key]=value;
 const [,id]=path();
 if(key==='dexQuery'){ui.dexPage=0;const world=id??'paldea';$('#dex-results').innerHTML=dexResults(world==='other'||showWorld(world)?world:'paldea');}
 if(key==='evolutionQuery'){ui.evolutionPage=0;$('#evolution-results').innerHTML=evolutionResults();}
 if(key==='fieldQuery'){ui.fieldPage=0;$('#field-results').innerHTML=fieldResults(Object.hasOwn(chapters,id)?id:'rare');}
 if(key==='teamQuery')$('#team-results').innerHTML=teamChoices();
 if(key==='mapQuery'){
  const at=$('#map-query')?.selectionStart??value.length;
  render();const input=$('#map-query');input?.focus({preventScroll:true});
  try{input?.setSelectionRange(at,at)}catch{}
 }
}
const inputs={'dex-query':'dexQuery','evolution-query':'evolutionQuery','field-query':'fieldQuery','team-query':'teamQuery','map-query':'mapQuery'};
document.addEventListener('input',event=>{
 if(event.target.id==='recipe-query'&&!event.isComposing){cookbook.query=event.target.value;cookbook.page=0;$('#recipe-results').innerHTML=recipeResults();return;}
 const key=inputs[event.target.id];
 if(key&&!event.isComposing)updateResults(key,event.target.value);
});
document.addEventListener('compositionend',event=>{const key=inputs[event.target.id];if(key)updateResults(key,event.target.value)});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.matches('[data-mission-check]')){toggled('completed',el.dataset.missionCheck);render();return;}
 if(el.matches('[data-setting]')) {store.settings[el.dataset.setting]=el.checked;save();render();return;}
 if(el.matches('[data-member][data-field="level"]')){
  const level=Math.min(100,Math.max(1,Math.round(Number(el.value)||1)));
  store.team[Number(el.dataset.member)].level=level;el.value=level;save();return;
 }
 if(el.id==='tera'&&path()[0]==='battle'&&path()[1]){
  location.hash='battle/'+path()[1]+(el.value?'/'+el.value:'');return;
 }
 const filter={'dex-type':'dexType','dex-color':'dexColor','dex-evolution':'dexEvolution','dex-illustrated':'dexIllustrated','evolution-method':'evolutionMethod',def1:'def1',def2:'def2',attack:'attack',tera:'tera'}[el.id];
 if(filter){ui[filter]=el.type==='checkbox'?el.checked:el.value;ui.dexPage=0;ui.evolutionPage=0;render();return;}
 if(el.id==='recipe-effect'||el.id==='recipe-type'){cookbook[el.id==='recipe-effect'?'effect':'type']=el.value;cookbook.page=0;render();return;}
 if(el.id==='hunt-region'){location.hash='hunt/'+(path()[1]??'paldea')+'/'+el.value;return;}
 if(el.id==='hunt-version'||el.id==='hunt-collection'){hunting[el.id==='hunt-version'?'version':'collection']=el.value;render();return;}
 if(el.id==='mission-stage'){location.hash='mission/'+path()[1]+'/'+el.value;return;}
 if(el.id==='atlas-species'){
  const world=db.map.worlds.find(w=>w.id===(path()[1]||'paldea'));
  const data=world.nativeMap.habitats[el.value],version=data&&(data.both||data.scarlet)?'scarlet':'violet';
  location.hash='map/'+world.id+(el.value?'/habitat/'+el.value+'/'+version:'/all');return;
 }
 if(el.id==='map-category'){location.hash=to('map',(path()[1]??'paldea'))+'/'+el.value;return;}
 if(el.id==='backup-input'&&el.files[0])void importBackup(el);
 if(el.id==='art-input'&&el.files.length)void importArtFiles(el);
});
document.addEventListener('submit',event=>{
 const form=event.target;
 if(!form.matches('[data-moves]'))return;
 event.preventDefault();
 const i=Number(form.dataset.moves), values=new FormData(form), moves=[];
 for(let n=0;n<4;n++){
  const name=String(values.get('move'+n)??'').trim();
  const type=form.querySelector('#member-'+i+'-type-'+n).value;
  if(Boolean(name)!==Boolean(type)){flash('기술 이름과 타입을 함께 넣어 주세요.');return;}
  if(name&&isType(type))moves.push({name,type});
 }
 store.team[i].moves=moves;save();render();flash('기술을 저장했어요.');
});
function exportBackup(){
 const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');
 a.href=url;a.download='paldea-adventure-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function importBackup(input){
 const file=input.files[0];input.value='';
 try {
  if(file.size>1000000)throw new Error('백업 파일이 너무 커요.');
  let payload;
  try{payload=JSON.parse(await file.text())}catch{throw new Error('이 모험책의 백업 파일을 골라 주세요.');}
  const restored=normalizeState(payload);
  if(!window.confirm('현재 기록을 백업 파일의 기록으로 바꿀까요?'))return;
  store=restored;const stored=save();render();if(stored)flash('백업 기록을 불러왔어요.');
 } catch(error) {flash(error.message);}
}
async function importArtFiles(input) {
 const files=[...input.files];
 const id=Number(input.dataset.forPokemon)||undefined;
 input.value='';
 if(importingArt||!files.length)return;
 importingArt=true;
 try{
  const {images,skipped}=await collectArt(files,findArtId,id);
  if(!images.size){flash('포켓몬 이름 또는 전국도감 번호로 저장한 이미지 파일을 골라 주세요.');return;}
  await art.put(images);
  for(const key of images.keys())localImages.add(key);
  render();
  flash(skipped.length?`${images.size}종을 저장했어요. 파일 이름이나 형식을 확인할 사진이 ${skipped.length}개 있어요.`:`${images.size}종의 이미지를 이 기기에 저장했어요.`);
 }catch{
  flash('이미지를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
 }finally{importingArt=false;}
}

async function removeArtImage(id) {
 if(!window.confirm('이 기기의 도감에서 내 이미지를 지울까요?'))return;
 try{await art.remove(id);localImages.delete(id);render();flash('이 기기의 이미지를 지웠어요.');}
 catch{flash('이미지를 지우지 못했어요.');}
}

function speech(text) {
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance'in window)){flash('이 브라우저에서는 읽어주기를 사용할 수 없어요.');return;}
 window.speechSynthesis.cancel();
 const phrase=new SpeechSynthesisUtterance(text);phrase.lang='ko-KR';phrase.rate=.87;
 const voice=window.speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ko'));
 if(voice)phrase.voice=voice;
 phrase.onerror=event=>{if(!['interrupted','canceled'].includes(event.error))flash('한국어 음성을 시작할 수 없어요. 기기의 음성 설정을 확인하세요.');};
 window.speechSynthesis.speak(phrase);
}
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-act]');
 if(!el){
  if(event.target.closest('.skip')){event.preventDefault();main.focus();main.scrollIntoView();}
  return;
 }
 const val=el.dataset.value;
 switch(el.dataset.act){
 case 'route-ending': ui.routeEnding=val==='true';break;
 case 'mode': store.settings.advanced=!store.settings.advanced;save();break;
 case 'dex-page': ui.dexPage=Number(val);break;
 case 'recipe-page': cookbook.page=Number(val);break;
 case 'evo-page': ui.evolutionPage=Number(val);break;
 case 'field-page': ui.fieldPage=Number(val);break;
 case 'species-mark': {const [key,id]=val.split('/');toggled(key,Number(id));break;}
 case 'mission-mark': toggled('completed',val);break;
 case 'point-mark': toggled('found',val);break;
 case 'team-add': {
  if(store.team.some(t=>t.id===Number(val))){flash('이미 팀에 있어요.');return;}
  if(store.team.length>=6){flash('팀에 여섯 마리가 있어요.');return;}
  store.team.push({id:Number(val),level:5,moves:[]});save();flash('팀에 넣었어요.');break;
 }
 case 'team-remove': store.team.splice(Number(val),1);save();break;
 case 'journal-tab': ui.journalTab=val;break;
 case 'map-read': $('#selected-point')?.focus();$('#selected-point')?.scrollIntoView({block:'start'});return;
 case 'map-point': ui.mapSelected=val;break;
 case 'map-unfilter': ui.mapOnlyPokemon=null;break;
 case 'reveal': revealed.add(val);break;
 case 'speak': speech(val);return;
 case 'export': exportBackup();return;
 case 'restore': $('#backup-input').click();return;
 case 'art-import':
  if(importingArt){flash('이미지를 저장하고 있어요.');return;}
  artInput.dataset.forPokemon=val;
  artInput.multiple=!val;
  artInput.click();
  return;
 case 'art-remove': void removeArtImage(Number(val));return;
 default:return;
 }
 render();
 if(['recipe-page','evo-page'].includes(el.dataset.act))main.scrollIntoView({block:'start'});
 if(el.dataset.act==='mission-mark'&&store.completed.includes(val)){const finish=$('#mission-finish');finish?.focus({preventScroll:true});finish?.scrollIntoView({block:'center'});}
 if(el.dataset.act==='map-point'){const view=$('.atlas-view');view?.focus({preventScroll:true});view?.scrollIntoView({block:'nearest'});}
});
function focusRoute(){
 const [kind,,focus]=path();
 if(kind==='pokemon'&&focus==='where'){
  const guided=path()[3];
  const target=(guided?document.getElementById('catch-'+guided):null)??$('#pokemon-encounters');
  target?.focus({preventScroll:true});
  target?.scrollIntoView({block:'start'});
 }
 if(kind==='map'&&path()[3]){
  const target=$('.atlas-view');
  target?.focus({preventScroll:true});
  target?.scrollIntoView({block:'nearest'});
 }
}
window.addEventListener('hashchange',()=>{
 ui.dexPage=0;ui.evolutionPage=0;ui.fieldPage=0;ui.mapSelected='';ui.mapQuery='';ui.mapOnlyPokemon=null;
 render();window.scrollTo(0,0);main.focus({preventScroll:true});focusRoute();
});
function badgeChecklist(){
 const values=db.adventure.missions.filter(m=>/^(gym|titan|star)-/.test(m.id)&&!m.spoiler&&m.level&&m.id!=='star-final');
 return `<section class="section panel"><h2>배지 체크리스트</h2><p>${values.filter(m=>store.completed.includes(m.id)).length} / ${values.length}개 완료</p><div class="checklist">${values.map(m=>`<div class="check-card"><input type="checkbox" aria-label="${html(m.title+' 완료')}" data-mission-check="${html(m.id)}"${store.completed.includes(m.id)?' checked':''}><a href="${to('mission',m.id)}">${html(m.title)}</a></div>`).join('')}</div></section>`;
}
async function boot(){
 try{
  const [dexData,adventureData,mapData,fieldData,visualSteps,visualRefs,dexMedia,expandedStory,expandedDlc,expandedField,evolutionGuides,missionPaths,tmPaths,dlcPaths,tmShop,catchTrails,recipeBook,sprites,artIds]=await Promise.all([
   ...dataUrls(),mediaData('dex-media',{species:{}}),
   mediaData('story-expanded',{missions:{}}),mediaData('dlc-expanded',{missions:{}}),mediaData('field-expanded',{articles:{}}),mediaData('evolution-guides',{edges:{}}),
   mediaData('mission-wayfinding',{}),mediaData('tm-paldea-paths',{}),mediaData('dlc-wayfinding',{}),mediaData('blueberry-tm-shop',{}),mediaData('catch-trails',{species:{}}),mediaData('sandwiches',{recipes:[],sources:[]}),mediaData('sprite-catalog',{species:{}}),art.ids().catch(()=>[])
  ]);
  wayfinding=wayfindingIndex(mapData.worlds,fieldData,{...missionPaths,...tmPaths},dlcPaths,tmShop);
  huntIndex=buildHuntIndex(mapData.worlds,dexData.pokemon);
  db={sprites,recipeBook,catchTrails,dex:dexData,adventure:adventureData,map:mapData,field:fieldData,visualSteps,visualRefs,dexMedia,expandedStory,expandedDlc,expandedField,evolutionGuides};
  findArtId=buildArtMatcher(dexData.pokemon);
  for(const id of artIds)localImages.add(id);
  species=new Map(db.dex.pokemon.map(p=>[p.id,p]));
  missions=new Map(db.adventure.missions.map(m=>[m.id,m]));
  movesById=new Map((db.dex.moves??[]).map(m=>[m.id,m]));
  movesByName=new Map((db.dex.moves??[]).map(m=>[words(m.name),m]));
  articles=new Map(db.field.articles.map(a=>[a.id,a]));
  render();focusRoute();
  if('serviceWorker'in navigator)void navigator.serviceWorker.register('sw.js').catch(()=>{});
 }catch(error){
  console.error(error);
  main.innerHTML=page('모험책을 열지 못했어요')+empty('인터넷에 연결한 뒤 새로고침해 주세요.');
 }
}
void boot();

function encounterForm(p,e){
 const index=e.formIndex??0;
 const named=p.forms?.find(f=>f.gameFormIndex===index);
 return named?.name??db.catchTrails.forms?.[p.id]?.[index]??'';
}
function trailPortrait(p,trail){
 const variant=db.sprites.variants?.[trail.sprite];
 if(variant||trail.shade)return spriteImage(p,trail.shade??'normal',{record:variant??spriteOf(p)});
 return portrait(p);
}
function catchTrail(p){
 const guides=[db.catchTrails.species?.[p.id],store.settings.dlc&&db.catchTrails.dlc?.[p.id]].filter(Boolean);
 return guides.map(trail=>{
  const hidden=trail.spoiler&&gate('trail:'+p.id+':'+trail.point,'이 포획 방법에는 후반 탐험 정보가 있어요.','rare');
  if(hidden)return hidden;
  const target=visibleTarget(trail.point);
  return `<article class="catch-trail" id="catch-${html(trail.point)}" tabindex="-1"><h3>${html(trail.title)}</h3>${trail.sprite||trail.shade?`<div class="trail-appearance">${trailPortrait(p,trail)}<span>${html(db.sprites.variants?.[trail.sprite]?.form??'색이 다른 모습')}</span></div>`: ''}${guideSteps(trail.steps)}
   <div class="actions">${target?link('map/'+target.world+'/all/'+trail.point,'근처 지도 보기'):''}${trail.related.map(pokemonLink).join('')}${button('speak','🔊 포획 방법 읽기',trail.steps.join('. '))}</div>
   ${provenance({trail:trail.source},['trail'])}</article>`;
 }).join('');
}
function teraName(key){
 return key==='stellar'?'스텔라':key==='random'?'무작위':TYPES[key]?.[0]??'';
}
function trails(worldId='paldea'){
 const world=db.map.worlds.find(w=>w.id===worldId&&showWorld(w.id));
 if(!world)return page('표식을 따라 잡기')+link('trails/paldea','팔데아 보기');
 const guides=world.id==='paldea'?db.catchTrails.species:db.catchTrails.dlc;
 const entries=Object.entries(guides??{}).filter(([id,g])=>wayfinding.points.get(g.point)?.world===world.id&&showSpecies(getPokemon(id)));
 const safe=entries.filter(([id,g])=>(!g.spoiler&&!getPokemon(id).spoiler)||store.settings.rare||revealed.has('trail-index:'+world.id));
 return page('표식을 따라 잡기','만나고 싶은 포켓몬을 고르면 출발할 곳과 찾아볼 표식이 나와요.')+
  `<div class="filters">${db.map.worlds.filter(w=>showWorld(w.id)).map(w=>chip('trails/'+w.id,w.title,w.id===world.id)).join('')}</div>
  <div class="hunt-list">${safe.map(([id,g])=>{
   const p=getPokemon(id);
   return `<a class="hunt-card" href="#pokemon/${id}/where/${html(g.point)}"><div class="hunt-portrait" style="${typeStyle(p.types[0])}">${trailPortrait(p,g)}</div><div><strong>${html(p.name)}</strong><small>${html(g.title)}</small></div></a>`;
  }).join('')}</div>${safe.length<entries.length?button('reveal','후반 포획 안내도 보기','trail-index:'+world.id):''}`;
}
function hunt(worldId='paldea',pointId){
 const world=db.map.worlds.find(w=>w.id===worldId&&showWorld(w.id));
 if(!world)return page('지역별 포켓몬')+link('hunt/paldea','팔데아 보기');
 const available=world.points.filter(p=>huntIndex.has(p.id)&&visibleTarget(p.id));
 const fallback={paldea:'south-one-area',kitakami:'kitakami-road',blueberry:'savanna-biome'};
 const active=available.find(p=>p.id===(pointId??fallback[world.id]))??available[0];
 if(!active)return page('지역별 포켓몬')+empty('표시할 지역이 없어요.');
 const caught=new Set(store.caught),wanted=new Set(store.wanted);
 const list=[];
 for(const [id,encounters] of huntIndex.get(active.id)){
  const p=getPokemon(id);
  if(!showSpecies(p)||(p.spoiler&&!store.settings.rare&&!revealed.has('pokemon:'+id)))continue;
  if((hunting.collection==='wanted'&&!wanted.has(id))||(hunting.collection==='missing'&&caught.has(id)))continue;
  const rows=encounters.filter(e=>matchesHunt(e,p,hunting.version,store.settings.dlc));
  if(rows.length)list.push({p,rows});
 }
 list.sort((a,b)=>Number(wanted.has(b.p.id))-Number(wanted.has(a.p.id))||(a.p.dex[world.id]??a.p.id)-(b.p.dex[world.id]??b.p.id));
 return page('지역별 포켓몬','지금 서 있는 곳을 고르고, 만나고 싶은 포켓몬을 눌러요.')+
 `<div class="filters">${db.map.worlds.filter(w=>showWorld(w.id)).map(w=>chip('hunt/'+w.id,w.title,w.id===world.id)).join('')}</div>
 <div class="actions">${select('hunt-region',available.map(p=>[p.id,p.title]),active.id,'탐험할 지역')}${select('hunt-version',[['scarlet','스칼렛'],['violet','바이올렛']],hunting.version,'게임 버전')}${select('hunt-collection',[['all','모두 보기'],['wanted','잡고 싶은 포켓몬'],['missing','아직 안 잡은 포켓몬']],hunting.collection,'내 기록으로 찾기')}${link('map/'+world.id+'/all/'+active.id,'지역 지도 보기')}${link('trails/'+world.id,'표식을 따라 잡기')}</div>
 <div class="section-head section"><h2>${html(active.title)}</h2><span class="badge">${list.length}마리</span></div>
 <div class="hunt-list">${list.map(({p,rows})=>{
  const methods=[...new Set(rows.map(e=>[encounterKinds[e.kind],e.tera?teraName(e.tera)+' 타입':'',encounterForm(p,e),e.minLevel?'Lv. '+e.minLevel+(e.maxLevel>e.minLevel?'–'+e.maxLevel:''):'',e.when?.join?.('·')].filter(Boolean).join(' · ')))];
  const conditions=[...new Set(rows.map(e=>e.condition).filter(Boolean))];
  return `<a class="hunt-card" href="#pokemon/${p.id}/where"><div class="hunt-portrait" style="${typeStyle(p.types[0])}">${portrait(p)}</div><div><strong>${html(p.name)}</strong>${wanted.has(p.id)?' ★':''}<small>${html(methods.slice(0,2).join(' / '))}${methods.length>2?' 외':''}</small>${conditions.map(note=>`<small class="hunt-note">${html(note)}</small>`).join('')}</div></a>`;
 }).join('')}</div>${list.length?'':empty('이 조건에서 만날 포켓몬이 없어요.')}`;
}
function environmentNames(p,locationId){
 const groups=db.catchTrails.habitatEnvironments?.[locationId]?.groups??{};
 return Object.keys(groups).filter(name=>groups[name].includes(p.id));
}

function encounterMapNote(world,habitat,active){
 const [, ,filter,selected,mode,suffix]=path();
 if(filter==='habitat'){
  if(!habitat||!suffix)return '';
  const area=world.points.find(point=>point.id===suffix);
  if(!area)return '';
  const entry=habitat.encounters?.find(e=>e.kind==='wild'&&area.locationIds?.includes(e.locationId)&&encounterMapWorld(e)===world.id);
  if(!entry)return '';
  const names=environmentNames(habitat,entry.locationId);
  const source=db.catchTrails.habitatEnvironments?.[entry.locationId]?.source;
  return '<section class="panel"><h2>'+html(area.title)+'에서 찾기</h2><p>'+html(names.length?'지도에서 이 지역의 빗금과 '+names.join(' · ')+'이 겹치는 곳을 둘러봐요.':'이 지역 안의 빗금 친 곳을 둘러봐요. 정확한 지형 조건은 아직 확인 중이에요.')+'</p>'+
   (names.length&&source?provenance({environment:{title:'지역별 야생 포켓몬과 지형',url:source}},['environment']):'')+'</section>';
 }
 if(filter!=='all'||!['fixed','wild','tera'].includes(mode)||!active||selected!==active.id)return '';
 const p=getPokemon(suffix);
 const entry=showSpecies(p)&&p.encounters?.find(e=>e.kind===mode&&active.locationIds?.includes(e.locationId)&&encounterMapWorld(e)===world.id);
 if(!entry)return '';
 const names=mode==='wild'?environmentNames(p,entry.locationId):[];
 const explanation=mode==='wild'?(names.length?names.join(' · ')+'에서 찾아봐요.':'이 지역 안에서 만날 수 있어요.')+' 이 지역의 서식 범위를 표시할 자료가 부족해요.':
  '이 지역에서 만난 기록이 있어요. 선택된 표식은 지역을 찾는 기준이에요. 포켓몬이 서 있는 정확한 자리는 아직 확인 중이에요.';
 return '<section class="panel"><h2>'+html(p.name+' · '+entry.area+'까지 확인')+'</h2><p>'+html(explanation)+'</p>'+link('pokemon/'+p.id+'/where','포획 방법으로 돌아가기')+'</section>';
}

function encounterDetails(p){
 const encounters=(p.encounters??[]).filter(e=>showWorld(encounterWorld[e.region]??e.region??'paldea')&&(!e.requiresDlc||store.settings.dlc));
 if(!encounters.length)return '';
 const byArea=new Map();
 for(const entry of encounters){
  const key=entry.region+'/'+entry.locationId;
  if(!byArea.has(key))byArea.set(key,[]);
  byArea.get(key).push(entry);
 }
 const ordered=[...byArea.values()].flat();
 const rows=data=>data.map(e=>{
  const world=db.map.worlds.find(w=>w.id===encounterMapWorld(e));
  const {area,habitatVersion,exactPoints}=encounterTargets(world,p,e);
  const limitArea=area&&showPoint(area);
  const exact=exactPoints.filter(point=>showPoint(point)&&(!point.spoiler||store.settings.rare||revealed.has('point:'+point.id)));
  const level=e.minLevel?'Lv. '+e.minLevel+(e.maxLevel>e.minLevel?'–'+e.maxLevel:''):'';
  const detail=[encounterForm(p,e),level,Array.isArray(e.when)?e.when.join('·'):e.when,versions[e.version],e.requiresDlc?'DLC 필요':null,e.tera?teraName(e.tera)+' 테라스탈':null,e.condition].filter(Boolean).join(' · ');
  const names=e.kind==='wild'?environmentNames(p,e.locationId):[];
  let actions='';
  if(habitatVersion){
   actions=link('map/'+world.id+'/habitat/'+p.id+'/'+habitatVersion+(limitArea?'/'+area.id:''),e.area+' 야생 서식 구역');
  }else if(exact.length){
   actions=exact.map(point=>link('map/'+world.id+'/all/'+point.id,encounterKinds[e.kind]+' · '+point.title)).join('');
  }else if(['fixed','tera','wild'].includes(e.kind)){
   const caption=e.area+'까지 확인';
   actions=limitArea?link('map/'+world.id+'/all/'+area.id+'/'+e.kind+'/'+p.id,caption):html(caption);
  }else if(limitArea){
   actions=link('map/'+world.id+'/all/'+area.id,area.title+' 주변 지도');
  }
  return '<li><strong>'+html(e.area+' · '+encounterKinds[e.kind])+'</strong> <small>'+html(detail)+'</small>'+
   (names.length?'<p>찾을 곳 · '+html(names.join(' · '))+'</p>':'')+
   (actions?'<div class="actions">'+actions+'</div>':'')+'</li>';
 }).join('');
 return '<ul class="plain-list">'+rows(ordered.slice(0,6))+'</ul>'+(ordered.length>6?'<details><summary>다른 출몰 정보 '+(ordered.length-6)+'개</summary><ul class="plain-list">'+rows(ordered.slice(6))+'</ul></details>':'');
}
function raidDetails(p){
 const raids=(p.raids??[]).filter(r=>showWorld(r.region));
 if(!raids.length)return '';
 return `<details class="panel section"><summary>일반 테라 레이드에서 만나요</summary><ul class="plain-list">${raids.map(r=>`<li>${html(worldNames[r.region]??r.region)} · ${html(Array.isArray(r.stars)?r.stars.join('·'):r.stars)}성${r.version?' · '+html(versions[r.version]??r.version):''}</li>`).join('')}</ul><div class="actions">${link('field/raid','레이드 도전 방법')}</div></details>`;
}
function moveDetails(p){
 const levels=(p.learnset?.levelUp??[]).flatMap(([id,level])=>{
   const move=movesById.get(id);
   return move?[{...move,level}]:[];
 });
 if(!levels.length)return '';
 const moves=store.settings.advanced?levels:levels.filter(m=>m.power>=35&&p.types.includes(m.type)).slice(0,6);
 if(!moves.length&&!store.settings.advanced)return '';
 const machine=(p.learnset.tm??[]).map(id=>movesById.get(id)).filter(m=>m?.tmNumber&&(m.tmNumber<=171||store.settings.dlc));
 return `<section class="section panel"><h2>${store.settings.advanced?'배울 수 있는 기술':'같은 타입이라 쓰기 좋은 기술'}</h2><p>레벨이 오르거나 진화하면 배울 수 있어요.</p><div class="table-wrap"><table><thead><tr><th>기술</th><th>타입</th><th>배우는 때</th>${store.settings.advanced?'<th>위력</th><th>명중</th>':''}</tr></thead><tbody>${moves.map(m=>`<tr><td>${html(m.name)}</td><td>${type(m.type)}</td><td>${m.level===0?'진화할 때':'Lv. '+m.level}</td>${store.settings.advanced?`<td>${html(m.power??'—')}</td><td>${html(m.accuracy??'—')}</td>`:''}</tr>`).join('')}</tbody></table></div>${store.settings.advanced&&machine.length?`<details class="section"><summary>배울 수 있는 기술머신 ${machine.length}개</summary><div class="actions">${machine.map(m=>{const a=db.field.articles.find(a=>a.tmNumber===m.tmNumber&&showWorld(a.world));return a?link('article/'+a.id,a.title):`<span class="badge">${html(m.name)}</span>`}).join('')}</div></details>`:''}</section>`;
}
