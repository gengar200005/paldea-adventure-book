import {html} from './core.mjs';

export const pressTerms = 'https://press.pokemon.com/en/Assets-Use-Terms';
const pressHosts = new Set(['press.pokemon.com','pokemon.gamespress.com']);
const imageHosts = new Set(['imguscdn.gamespress.com','imgeucdn.gamespress.com']);
export function mediaRecord(record) {
 try {
  const source = new URL(record?.source);
  const url = new URL(record?.url);
  if (source.protocol!=='https:' || url.protocol!=='https:' ||
      source.username || source.password || url.username || url.password ||
      (!pressHosts.has(source.hostname) || !imageHosts.has(url.hostname))) return null;
  return {...record,source:source.href,url:url.href};
 } catch {
  return null;
 }
}

function image(record,alt,{eager=false,css=''}={}) {
 return `<img class="${css}" src="${html(record.url)}" alt="${html(alt)}" loading="${eager?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer" data-press-image>`;
}

export function pressPortrait(record,fallback,{name='',detail=false}={}) {
 const approved = mediaRecord(record);
 if (!approved) return fallback;
 return `<span class="press-portrait${detail?' portrait-detail':''}">${image(approved,detail?name:'',{eager:detail,css:'portrait-image'})}<span class="portrait-fallback" aria-hidden="true">${fallback}</span></span>`;
}

export function initPressImages() {
 const mark=(event,style)=>{
  const img=event.target;
  if(img instanceof HTMLImageElement && img.matches('[data-press-image],[data-local-pokemon]')) img.classList.add(style);
 };
 document.addEventListener('load',event=>mark(event,'has-image'),true);
 document.addEventListener('error',event=>mark(event,'image-failed'),true);
}
