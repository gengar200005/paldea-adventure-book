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
