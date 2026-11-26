const aliases={
 '세르클마을':'map-gym-cortondo',
 '보울마을':'map-gym-artazon',
 '누룩스시티':'map-gym-levincia',
 '카라프시티':'map-gym-cascarrafa',
 '참푸르마을':'map-gym-medali',
 '프리지마을':'map-gym-montenevera',
 '베이크마을':'map-gym-alfornada',
 '나페산 체육관 보상':'map-gym-glaseado',
 '티스푼 오솔길':'poco-lighthouse',
 '스타단 팀 세긴 기지':'map-star-dark',
 '스타단 팀 쉐다르 기지':'map-star-fire',
 '스타단 팀 루크바 기지':'map-star-fairy',
 '스타단 팀 카프 기지':'map-star-fighting',
 '오렌지 아카데미(스칼렛) 또는 그레이프 아카데미(바이올렛)':'mesagoza',
 '블루베리 아카데미':'academy-entrance',
 '블루베리그 사천왕 하솔 배틀 보상':'savanna-plaza',
 '블루베리그 사천왕 네리네 배틀 보상':'canyon-plaza',
 '블루베리그 사천왕 제빈 배틀 보상':'polar-plaza',
 '블루베리그 사천왕 타로 배틀 보상':'coastal-plaza'
};

export const wayfindingLabels={
 pickup:'직접 줍기', reward:'보상', unlock:'제작법 해금',
 purchase:'매점에서 사기', area:'지역 단위'
};

export function wayfindingIndex(worlds,field,paldea={},dlc={},shop={}){
 const points=new Map(), byTitle=new Map(), byNumber=new Map(), byPoint=new Map();
 for(const world of worlds)for(const point of world.points){
  const entry={world:world.id,point};
  points.set(point.id,entry);
  byTitle.set(point.title,entry);
 }
 const findPoint=place=>{
  const withoutReward=place.replace(/ (?:체육관|보스 배틀) 보상$/,'');
  return points.get(aliases[place]??aliases[withoutReward])??byTitle.get(withoutReward);
 };
 const tmSource=field.sources.tmBulba?.[0]??field.sources.tmBulba;
 for(const article of field.articles.filter(a=>a.tmNumber)){
  const number=String(article.tmNumber).padStart(3,'0');
  const routes=[...(paldea.machines?.[number]??[]),...(dlc.machines?.[number]??[])];
  if(article.tmNumber===57&&!routes.some(route=>route.kind==='reward')){
   routes.push({kind:'reward',place:'아카데미 생물실 · 지니어',point:'false-swipe',
    steps:[article.steps[0]],source:tmSource});
  }
  const price=shop.prices?.[number];
  if(price!==undefined){
   routes.push({kind:'purchase',place:'블루베리 아카데미 매점',point:'academy-entrance',price,
    steps:['블루베리 아카데미 입구의 건물로 들어가요.',
     '이동할 곳 목록에서 매점을 고르고 '+price+' BP로 구매해요.'],source:shop.source});
  }
  const regions=article.steps[0]?.match(/^획득 후보는 (.+?)(?:이에요|예요)\.$/)?.[1].split(', ')??[];
  for(const label of regions){
   const place=label.replace('스타단 팀 나비 기지','팀 시 아지트');
   const target=findPoint(place);
   const reward=place.endsWith('보상');
   if(routes.some(route=>route.point&&route.point===target?.point.id&&
    (reward?route.kind==='reward':['pickup','purchase'].includes(route.kind))))continue;
   if(place==='체육관 5곳을 클리어했을 때의 보상'&&routes.some(route=>route.kind==='reward'&&route.place==='다섯 번째로 이긴 체육관'))continue;
   const world=target?.world??article.world??'paldea';
   routes.push({kind:reward?'reward':'area',place,point:target?.point.id,world,source:tmSource});
  }
  const entries=routes.map(route=>({...route,world:route.world??points.get(route.point)?.world??article.world??'paldea'}));
  byNumber.set(article.tmNumber,entries);
  for(const entry of entries){
   if(!entry.point)continue;
   if(!byPoint.has(entry.point))byPoint.set(entry.point,new Map());
   const atPoint=byPoint.get(entry.point);
   if(!atPoint.has(article.tmNumber))atPoint.set(article.tmNumber,[]);
   atPoint.get(article.tmNumber).push(entry);
  }
 }
 return {missions:{...paldea.missions,...dlc.missions},points,byNumber,byPoint};
}
