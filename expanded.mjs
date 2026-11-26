import {html} from './core.mjs';

export function routeSteps(entry,heading='따라가기',stepExtras=()=>'') {
 if(!entry?.route?.length)return '';
 return `<div class="walkthrough-route"><h2>${html(heading)}</h2>
 <ol class="step-list">${entry.route.map((step,i)=>`<li><span class="step-index" aria-hidden="true">${i+1}</span><div><strong>${html(step.label)}</strong><span>${html(step.body)}</span>${stepExtras(step)}</div></li>`).join('')}</ol>
 ${entry.stuck?`<p class="aside-note"><strong>막혔을 때</strong><br>${html(entry.stuck)}</p>`:''}
 ${entry.solution?.length?`<details class="walkthrough-solution"><summary>${html(entry.solutionTitle??'시험 정답 펼치기')}</summary><ul class="plain-list">${entry.solution.map(({label,body})=>`<li><strong>${html(label)}</strong> ${html(body)}</li>`).join('')}</ul></details>`:''}
 </div>`;
}

export function preparation(entry){
 if(!entry?.check?.length&&!entry?.battle)return '';
 return `<div class="walkthrough-prep">${entry.check?.length?`<ul class="plain-list">${entry.check.map(item=>`<li>${html(item)}</li>`).join('')}</ul>`:''}
 ${entry.battle?`<p class="aside-note"><strong>배틀 요령</strong><br>${html(entry.battle)}</p>`:''}</div>`;
}

export function extraReferences(entry,safeUrl) {
 if(!entry)return '';
 const refs=(entry.sources??[]).filter(s=>s.title&&safeUrl(s.url));
 const video=entry.video?.title&&safeUrl(entry.video.url);
 return `${video?`<a class="button walkthrough-video" href="${html(video)}" target="_blank" rel="noopener noreferrer">${html(entry.video.title)} ↗</a>`:''}
 ${refs.length?`<details class="section"><summary>공략 상세 출처</summary><ul class="links">${refs.map(s=>`<li><a class="inline-link" href="${html(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${html(s.title)}</a></li>`).join('')}</ul></details>`:''}`;
}
