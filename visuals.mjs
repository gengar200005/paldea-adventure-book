import {atlasLocalMap} from './atlas.mjs';
import {html,TYPES} from './core.mjs';

export const validIcon = value => typeof value === 'string' && /^[a-z][a-z-]*$/.test(value);
export function guideImage(icon,css='',loading='lazy') {
 if(!validIcon(icon))return '';
 return `<img class="${css}" src="assets/guide/${icon}.webp" alt="" width="160" height="160" loading="${loading}" decoding="async">`;
}
const variants={victory:'meadow',legend:'slope',star:'ember',finale:'violet',postgame:'ocean',teal:'meadow',indigo:'ocean',epilogue:'violet'};
export function missionArt(mission,boards) {
 const board=boards?.missions?.[mission.id];
 return board?.find(step=>!['home','gate','bag','check','battle'].includes(step.icon))?.icon??board?.[0]?.icon;
}
export function routeTone(route) {return variants[route]??'meadow';}
export function storyBoard(steps, {route, label='그림으로 먼저 보기', branch=false}={}) {
 if(!steps?.length)return '';
 return `<section class="visual-panel board-${routeTone(route)}" aria-label="${html(label)}">
   <h2>${html(label)}</h2>
   <${branch?'ul':'ol'} class="visual-steps${branch?' branch':''}" style="--step-count:${steps.length}">
   ${steps.map(({icon,label:step},i)=>`<li>${branch?'':`<span class="step-token" aria-hidden="true">${i+1}</span>`}${guideImage(icon,'step-art')}${html(step)}</li>`).join('')}
   </${branch?'ul':'ol'}>
 </section>`;
}
// Signs are read from left to right as a sequence of landmarks, not as bearings.
const routeSigns={
 gate:'<path fill="#e3ae76" d="M5 42V12h7V7h6v5h28V7h6v5h7v30H42V28a10 10 0 0 0-20 0v14Z"/>',
 gym:'<path fill="#e4e9e9" d="M6 40V17h52v23Z"/><path fill="#84b4c4" d="M4 17 29 6h27l4 11Z"/><path fill="#448895" d="M22 20h19v20H22Z"/><path d="M32 20v20"/>',
 plaza:'<ellipse cx="32" cy="34" rx="27" ry="9" fill="#f0d5a9"/><path fill="#d5a16d" d="M23 29h18v7H23Z"/><path fill="#87a16a" d="M28 29V16l5-7 6 9-4 11Z"/>',
 flower:'<path stroke="#45884c" stroke-width="4" d="M33 24v16"/><path fill="#7cb86a" d="M32 37q-13 1-17-10 12-1 17 10Zm2-3q2-11 15-12-1 12-15 12Z"/><g fill="#ffcd47"><ellipse cx="32" cy="17" rx="6" ry="12"/><ellipse cx="32" cy="17" rx="6" ry="12" transform="rotate(60 32 17)"/><ellipse cx="32" cy="17" rx="6" ry="12" transform="rotate(120 32 17)"/></g><circle cx="32" cy="17" r="6" fill="#ab713f"/>',
 road:'<path fill="#eac88f" d="M9 43c6-16 29-20 24-37h8c7 19-9 24 11 37Z"/><path stroke="#fffbed" stroke-dasharray="4 5" d="M31 41q-5-8 5-19l2-9"/>',
 pot:'<path fill="#91bc76" d="M31 24Q14 19 15 7q17 2 18 17 1-17 16-19 0 13-16 19Z"/><path fill="#ca7954" d="m16 23 5 18h23l5-18Z"/><path fill="#e29872" d="M14 21h37v6H14Z"/>',
 tree:'<path fill="#a87b48" d="M29 25h7v16h-7z"/><path fill="#8db571" d="M14 29C5 26 9 16 17 16c-1-13 19-17 25-6 12-1 20 14 11 19Z"/>',
 bridge:'<path fill="#85bdd0" stroke="none" d="M4 34q11-5 22 0t21 0 14 0v7H4Z"/><path fill="#cb9565" d="M5 32q25-19 54 0v5q-27-16-54 0Zm5-4v-9m11 5V13m22 11V13m11 15v-9M7 21q24-18 50 0"/>',
 water:'<path fill="#72a9c0" d="M33 4S15 22 15 29a17 13 0 0 0 34 0C49 22 33 4 33 4Z"/>',
 pond:'<ellipse fill="#79b9c0" cx="32" cy="29" rx="27" ry="10"/><path d="M12 25V10m4 15 4-11" stroke="#529974"/><path d="M30 30q7 3 13-1" stroke="#f4ffff"/>',
 center:'<path fill="#d85850" d="M6 8h52v11H6Z"/><path fill="#eee5ce" d="M12 19h40v20H12Z"/><path fill="#93bbc4" d="M21 23h22v11H21Z"/><circle cx="33" cy="13" r="5" fill="white"/>',
 wallet:'<path fill="#a86c49" d="M7 14 43 7l5 11H10Z"/><rect x="7" y="15" rx="5" width="49" height="24" fill="#ddaa6d"/><path fill="#efc082" d="M41 22h17v11H41Z"/><circle cx="46" cy="27" r="1.2"/>',
 person:'<circle cx="32" cy="14" r="9" fill="#ecc6a0"/><path fill="#83aeb6" d="M14 41q-1-18 18-18t18 18Z"/>',
 shop:'<path fill="#ead9ae" d="M9 18h46v22H9Z"/><path fill="#d67d5d" d="m6 21 7-13h38l7 13Z"/><path fill="#55777a" d="M17 25h30v10H17Z"/><path d="M22 9l-3 12m15-12v12m11-12 4 12" stroke="#ffebc4"/>',
 desert:'<circle cx="46" cy="10" r="5" fill="#e5a947"/><path fill="#e9bf77" d="M3 33q16-24 39-7 9-9 19-3v17H3Z"/><path d="M13 35q16-11 29-6" stroke="#cb994f"/>',
 stairs:'<path fill="#c7b48f" d="M5 39v-7h12v-7h12v-7h12v-7h17v28Z"/>',
 slope:'<path fill="#c67e50" d="M3 39 44 9h16v30Z"/><path d="m16 34 26-18" stroke="#f6d39a" stroke-width="4"/>',
 cliff:'<path fill="#c27c55" d="M5 41V26l13-3V11l14-4 23 4v30Z"/><path d="m27 12-2 12 5 4m14-15-5 13 3 8" stroke="#e2a477"/>',
 cave:'<path fill="#bd845c" d="m4 39 9-22 16-10 19 8 13 24Z"/><path fill="#35423a" d="m20 39 4-13 8-6 10 4 4 15Z"/>',
 crab:'<path fill="#dc8159" d="M16 26q15-12 32 0l-4 9H20Z"/><path d="m18 25-9-8m38 9 9-9M19 31l-10 6m35-5 11 5m-33-1-6 5m25-6 6 6"/><path fill="#dd8760" d="m8 21-4-10 6 4 6-6 1 10Zm42-2 1-10 6 6 5-5-3 11Z"/><path d="m26 23-1-6m13 6 1-6"/>',
 flag:'<path d="M17 41V6"/><path fill="#dc7855" d="M18 7h31l-7 7 7 7H18Z"/>',
 battle:'<circle cx="32" cy="23" r="16" fill="#f8edd5"/><path fill="#d87261" d="M16 23a16 16 0 0 1 32 0Z"/><circle cx="32" cy="23" r="5" fill="#fff"/>'
};
export function landmarkDiagram(stops) {
 if(!stops?.length)return '';
 const cards=stops.map(stop=>`<li><svg viewBox="0 0 64 46" aria-hidden="true" fill="none" stroke="#404c40" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${routeSigns[stop.icon]??routeSigns.flag}</svg><b>${html(stop.label)}</b>${stop.note?`<small>${html(stop.note)}</small>`:''}</li>`).join('');
 return `<figure class="route-signs"><figcaption>표식을 따라가요</figcaption><ol style="--stops:${stops.length}">${cards}</ol></figure>`;
}

export function mapInset(world,point,url,{from,label}={}) {
 if(!world?.nativeMap||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return '';
 const {graphic,showStart}=atlasLocalMap(world,point,from);
 const name=label??point.title+' 지도 열기';
 return `<figure class="visual-panel mini-map local-inset">
 <figcaption><h2>${showStart?'가는 방향':'목적지 주변'}</h2></figcaption>
 <a href="${html(url)}" class="mini-map-link" aria-label="${html(name)}"><span class="mini-map-board local-map-board">${graphic}</span>
 <strong>${html(name)} <span aria-hidden="true">↗</span></strong></a>
 <div class="inset-key">${showStart?`<span><i class="inset-origin"></i>출발 · ${html(from.title)}</span>`:''}<span><i class="inset-dest"${point.accuracy==='area'?' style="border:2px dashed #a63830;background:transparent;border-radius:50%"':''}></i>${html(point.nativeRole??'장소')} · ${html(point.title)}</span></div>
 </figure>`;
}
export function screenshotRefs(refs,safeUrl) {
 const usable=(refs??[]).flatMap(ref=>{
  const url=safeUrl(ref.url);
  return url?[{...ref,url}]:[];
 });
 if(!usable.length)return '';
 function source(ref){return `<a class="reference-link" href="${html(ref.url)}" target="_blank" rel="noopener noreferrer"><span class="visual-camera">${guideImage('camera')}</span><span><strong>${html(ref.title)}</strong><small>${ref.language==='en'?'영어 페이지':'한국어 페이지'} · 새 탭</small></span><span aria-hidden="true" class="reference-arrow">↗</span></a>`;}
 const direct=usable.filter(ref=>!ref.spoilers);
 const sensitive=usable.filter(ref=>ref.spoilers);
 return `<section class="visual-panel reference-panel" aria-label="실제 게임 화면">
 <h2>실제 게임 화면 보기</h2>
 ${direct.map(source).join('')}
 ${sensitive.length?`<details class="visual-disclosure"><summary>이후 내용이 나올 수 있는 화면</summary>${sensitive.map(source).join('')}</details>`:''}
 </section>`;
}
export function recipeBoard(article,move) {
 if(!article.tmNumber||!Number.isSafeInteger(article.lp)||!article.materials?.length)return '';
 const accent=move?.type&&TYPES[move.type]?.[2];
 const cash=`${article.lp.toLocaleString('ko-KR')} LP`;
 return `<section class="visual-panel recipe-panel" aria-label="기술머신 재료" ${accent?`style="--visual-bg:${accent}"`:''}>
 <h2>만들 때 필요한 것</h2>
 <ul class="recipe-cards">
 <li>${guideImage('coin','step-art')}<strong>${cash}</strong></li>
 ${article.materials.map(item=>`<li>${guideImage('bag','step-art')}<strong>${html(item.name)}</strong><span>${html(item.count)}개</span></li>`).join('')}
 </ul></section>`;
}
