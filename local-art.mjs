import {html} from './core.mjs';

const DB_NAME='paldea-personal-art';
const FILES='portraits';
export const MAX_IMAGE_BYTES=10*1024*1024;
export const MIME_ACCEPT='image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

const cleanName=value=>String(value??'').normalize('NFC').toLowerCase().replace(/[\s._-]/g,'');

export function buildArtMatcher(pokemon) {
 const speciesIds=new Set(pokemon.map(p=>p.id));
 const names=new Map();
 for(const p of pokemon){
  for(const label of [p.name,p.en,p.slug].filter(Boolean)){
   const key=cleanName(label);
   if(names.has(key)&&names.get(key)!==p.id)names.set(key,null);
   else names.set(key,p.id);
  }
 }
 return filename=>{
  const stem=String(filename).replace(/\.(png|jpe?g|webp)$/i,'');
  const number=stem.match(/^(?:no\.?\s*)?0*(\d{1,4})(?:$|[\s._-])/i);
  if(number&&speciesIds.has(Number(number[1])))return Number(number[1]);
  return names.get(cleanName(stem))??null;
 };
}

export function inspectImageHeader(head) {
 if(head[0]===0xff&&head[1]===0xd8&&head[2]===0xff)return 'image/jpeg';
 const png=[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
 if(png.every((byte,i)=>byte===head[i]))return 'image/png';
 const chars=(from,to)=>String.fromCharCode(...head.slice(from,to));
 return chars(0,4)==='RIFF'&&chars(8,12)==='WEBP'?'image/webp':null;
}

const requestResult=req=>new Promise((resolve,reject)=>{
 req.onsuccess=()=>resolve(req.result);
 req.onerror=()=>reject(req.error);
});

export function localArtStore() {
 let database=null;
 async function open() {
  if(!database) database=new Promise((resolve,reject)=>{
   if(!('indexedDB' in globalThis)){reject(new Error('이미지 보관 기능을 사용할 수 없는 브라우저예요.'));return;}
   const req=indexedDB.open(DB_NAME,1);
   req.onupgradeneeded=()=>req.result.createObjectStore(FILES);
   req.onsuccess=()=>{
    const db=req.result;
    db.onversionchange=()=>{db.close();database=null;};
    resolve(db);
   };
   req.onerror=()=>reject(req.error);
  }).catch(error=>{database=null;throw error;});
  return database;
 }
 async function read(method,key) {
  const db=await open();
  const store=db.transaction(FILES,'readonly').objectStore(FILES);
  return requestResult(key===undefined?store[method]():store[method](key));
 }
 async function write(action) {
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(FILES,'readwrite');
   tx.oncomplete=()=>resolve();
   tx.onabort=()=>reject(tx.error??new Error('이미지를 저장하지 못했어요.'));
   try{action(tx.objectStore(FILES));}catch(error){tx.abort();reject(error);}
  });
 }
 return {
  ids:()=>read('getAllKeys'),
  read:id=>read('get',id),
  put:images=>write(store=>{for(const [id,image] of images)store.put(image,id);}),
  remove:id=>write(store=>{store.delete(id);})
 };
}

export async function collectArt(files,match,selectedId) {
 const images=new Map(), skipped=[];
 for(const file of files){
  const id=selectedId??match(file.name);
  if(!id||file.size>MAX_IMAGE_BYTES){skipped.push(file.name);continue;}
  const type=inspectImageHeader(new Uint8Array(await file.slice(0,12).arrayBuffer()));
  if(!type){skipped.push(file.name);continue;}
  images.set(id,file.slice(0,file.size,type));
 }
 return {images,skipped};
}

export function ownPortrait(id,fallback,{name='',detail=false}={}) {
 return `<span class="press-portrait personal-portrait${detail?' portrait-detail':''}"><img class="portrait-image" alt="${html(detail?name:'')}" decoding="async" data-local-pokemon="${id}"><span class="portrait-fallback">${fallback}</span></span>`;
}

export function observeArt(root, art) {
 const used=new Map();
 const sync=()=>{
  for(const [img,url] of used)if(!root.contains(img)){URL.revokeObjectURL(url);used.delete(img);}
  for(const img of root.querySelectorAll('[data-local-pokemon]:not([data-requested])')){
   img.dataset.requested='1';
   art.read(Number(img.dataset.localPokemon)).then(blob=>{
    if(!(blob instanceof Blob)||!root.contains(img))return;
    const url=URL.createObjectURL(blob);
    used.set(img,url);
    img.src=url;
   }).catch(()=>{});
  }
 };
 new MutationObserver(sync).observe(root,{childList:true,subtree:true});
 sync();
}
