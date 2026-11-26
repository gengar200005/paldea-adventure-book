export const encounterKinds={wild:'야생',fixed:'고정 출현',gift:'선물',special:'특별한 만남',trade:'게임 속 교환',tera:'테라스탈'};

export function encounterMapWorld(entry){
 return [196,198].includes(entry.locationId)?'paldea':entry.region;
}

export function buildHuntIndex(worlds,pokemon){
 const locations=new Map(), regions=new Map();
 for(const world of worlds)for(const point of world.points){
  for(const id of point.locationIds??[]){
   const key=world.id+'/'+id;
   if(!locations.has(key))locations.set(key,[]);
   locations.get(key).push(point.id);
  }
 }
 for(const species of pokemon)for(const entry of species.encounters??[]){
  const key=encounterMapWorld(entry)+'/'+entry.locationId;
  for(const pointId of locations.get(key)??[]){
   if(!regions.has(pointId))regions.set(pointId,new Map());
   const found=regions.get(pointId);
   if(!found.has(species.id))found.set(species.id,[]);
   found.get(species.id).push(entry);
  }
 }
 return regions;
}

export function matchesHunt(entry,species,version,dlc){
 const game=entry.version??species.version;
 return (dlc||(!entry.requiresDlc&&entry.region==='paldea'))&&(!game||game==='both'||game===version);
}

export function encounterTargets(world,species,entry){
 if(!world)return {area:null,habitatVersion:null,exactPoints:[]};
 const area=world.points.find(point=>point.locationIds?.includes(entry.locationId));
 const cells=world.nativeMap.habitats[species.id];
 const version=entry.version??species.version;
 const versions=version&&version!=='both'?[version]:['scarlet','violet'];
 const habitatVersion=entry.kind==='wild'&&cells?versions.find(v=>cells.both?.length||cells[v]?.length):null;
 const exactPoints=world.points.filter(point=>{
  if(!point.pokemon?.includes(species.id)||!Number.isFinite(point.x)||!Number.isFinite(point.y))return false;
  if(entry.kind==='tera')return point.category==='tera'&&point.sourceTable&&point.battle===entry.tera&&point.region===entry.area;
  const evidence=point.encounter;
  return entry.kind==='fixed'&&point.accuracy==='exact'&&evidence?.kind==='fixed'&&evidence.locationId===entry.locationId&&
   evidence.level>=entry.minLevel&&evidence.level<=entry.maxLevel&&(evidence.formIndex??0)===(entry.formIndex??0);
 });
 return {area,habitatVersion,exactPoints};
}
