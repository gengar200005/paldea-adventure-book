export const TYPES = {
 normal:['노말','●','#eae6d9','#544c39'], fire:['불꽃','♨','#fbded2','#833a27'],
 water:['물','💧','#dbeaf7','#265779'], electric:['전기','ϟ','#fff1bb','#6c5208'],
 grass:['풀','❋','#dbefcf','#2e6235'], ice:['얼음','❄','#d9f2f1','#255e62'],
 fighting:['격투','✊','#f3d9d2','#8a392f'], poison:['독','✦','#efddf2','#70467e'],
 ground:['땅','⛰','#eee3be','#6e502a'], flying:['비행','〰','#e0e8fa','#3a5483'],
 psychic:['에스퍼','◎','#f9dce8','#843e60'], bug:['벌레','✿','#e9efc0','#4c6119'],
 rock:['바위','◆','#eae2cc','#645632'], ghost:['고스트','☾','#e8def5','#5d437a'],
 dragon:['드래곤','⌁','#dfdff8','#503e87'], dark:['악','◐','#e5dedb','#53443a'],
 steel:['강철','⬡','#e0e8eb','#41565c'], fairy:['페어리','★','#fae3ee','#833d64']
};
const CHART = {
 normal:[[],['rock','steel'],['ghost']],
 fire:[['grass','ice','bug','steel'],['fire','water','rock','dragon']],
 water:[['fire','ground','rock'],['water','grass','dragon']],
 electric:[['water','flying'],['electric','grass','dragon'],['ground']],
 grass:[['water','ground','rock'],['fire','grass','poison','flying','bug','dragon','steel']],
 ice:[['grass','ground','flying','dragon'],['fire','water','ice','steel']],
 fighting:[['normal','ice','rock','dark','steel'],['poison','flying','psychic','bug','fairy'],['ghost']],
 poison:[['grass','fairy'],['poison','ground','rock','ghost'],['steel']],
 ground:[['fire','electric','poison','rock','steel'],['grass','bug'],['flying']],
 flying:[['grass','fighting','bug'],['electric','rock','steel']],
 psychic:[['fighting','poison'],['psychic','steel'],['dark']],
 bug:[['grass','psychic','dark'],['fire','fighting','poison','flying','ghost','steel','fairy']],
 rock:[['fire','ice','flying','bug'],['fighting','ground','steel']],
 ghost:[['psychic','ghost'],['dark'],['normal']],
 dragon:[['dragon'],['steel'],['fairy']],
 dark:[['psychic','ghost'],['fighting','dark','fairy']],
 steel:[['ice','rock','fairy'],['fire','water','electric','steel']],
 fairy:[['fighting','dragon','dark'],['fire','poison','steel']]
};
export const typeIds = Object.keys(TYPES);
export const isType = t => Object.hasOwn(TYPES,t);
export function effectiveness(attack, defenders, tera='', blockedAttacks=[]) {
 if(blockedAttacks.includes(attack))return 0;
 const [strong,weak,immune=[]] = CHART[attack] ?? [[],[],[]];
 const defending = isType(tera) ? [tera] : [...new Set(defenders.filter(isType))];
 return defending.reduce((value,defender)=>value*(immune.includes(defender)?0:strong.includes(defender)?2:weak.includes(defender)?.5:1),1);
}
export function defensiveGroups(typings, tera='', blockedAttacks=[]) {
 const groups = new Map();
 for(const type of typeIds) {
   const value = effectiveness(type,typings,tera,blockedAttacks);
   if(!groups.has(value)) groups.set(value,[]);
   groups.get(value).push(type);
 }
 return groups;
}
export const STORAGE_KEY = 'paldea-adventure-book.v1';
export const blankState = () => ({
 version:1, settings:{dlc:false,advanced:false,spoilers:false,rare:false},
 caught:[],wanted:[],evolved:[],favorites:[],completed:[],found:[],team:[]
});
function strings(value) {
 return [...new Set(Array.isArray(value) ? value.filter(v=>typeof v==='string'&&v.length>0&&v.length<120).slice(0,5000) : [])];
}
function speciesIds(value) {
 return [...new Set(Array.isArray(value) ? value.filter(v=>Number.isInteger(v)&&v>0&&v<10000).slice(0,3000) : [])];
}
export function normalizeState(raw) {
 if(!raw || typeof raw!=='object' || Array.isArray(raw) || raw.version!==1) throw new Error('이 모험책에서 만든 백업 파일을 골라 주세요.');
 const result=blankState();
 for(const key of Object.keys(result.settings)) result.settings[key]=raw.settings?.[key]===true;
 for(const key of ['caught','wanted','evolved','favorites']) result[key]=speciesIds(raw[key]);
 for(const key of ['completed','found']) result[key]=strings(raw[key]);
 if(Array.isArray(raw.team)) result.team=raw.team.filter(t=>t&&Number.isInteger(t.id)&&t.id>0&&t.id<10000).slice(0,6).map(t=>({
    id:t.id,
    level:Math.min(100,Math.max(1,Math.round(Number(t.level)||5))),
    moves:Array.isArray(t.moves)?t.moves.slice(0,4).filter(m=>m&&typeof m.name==='string'&&isType(m.type)).map(m=>({name:m.name.trim().slice(0,35),type:m.type})).filter(m=>m.name):[]
 }));
 return result;
}
export function recommendTeam(team, lookup, defenders, tera='', findMove=()=>undefined, blockedAttacks=[]) {
 return team.flatMap((member,index)=>{
   const species = lookup(member.id);
   if(!species) return [];
   const moves = member.moves.length ? member.moves : species.types.map(type=>({type,name:TYPES[type]?.[0]??''}));
   const ranked = moves.flatMap(move=>{
     const known = findMove(move.name);
     const type = known?.type ?? move.type;
     return known?.category==='status'?[]:[{...move,type,known:Boolean(known),value:effectiveness(type,defenders,tera,blockedAttacks)}];
   }).sort((a,b)=>b.value-a.value||Number(b.known)-Number(a.known));
   return [{species,index,best:ranked[0],actual:member.moves.length>0}];
 }).sort((a,b)=>(b.best?.value??0)-(a.best?.value??0));
}
export const html = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
