export const evolutionMethods = {
 all:'전체', level:'레벨', item:'돌·도구', trade:'통신교환',
 friendship:'친밀도', move:'기술', special:'특수 조건'
};

export function methodFor(edge) {
 if(Object.hasOwn(evolutionMethods,edge.method)&&edge.method!=='all')return edge.method;
 const text=edge.condition??'';
 if(edge.externalGame||/유니언 서클|걸음|반동|기절하지|모으령의코인|같은 무리|닌텐도 스위치|사탕공예|공격이 방어|공격과 방어|종류를 이겨/.test(text))return 'special';
 if(edge.multiplayer||text.includes('통신교환'))return 'trade';
 if(text.includes('친밀도'))return 'friendship';
 if(/기억한 채|기억시킨|기술을 배운/.test(text))return 'move';
 if(edge.items?.length||/아이템으로|에게 .*을 사용해요/.test(text))return 'item';
 return 'level';
}

export function evolutionView(pokemon, guides, visible, dlc) {
 const members=new Map(pokemon.filter(visible).map(p=>[p.id,p]));
 const edges=new Map();
 const parentIds=new Set();
 for(const p of members.values()){
  const children=[];
  for(const edge of p.evolvesTo??[]){
   if(!members.has(edge.id))continue;
   const guide=guides?.[p.id+'-'+edge.id]??{};
   if(guide.dlc&&!dlc)continue;
   const record={...edge,...guide,from:p.id};
   record.method=methodFor(record);
   children.push(record);
   parentIds.add(edge.id);
  }
  if(children.length)edges.set(p.id,children);
 }
 const families=[], byMember=new Map();
 for(const p of members.values()){
  if(!edges.has(p.id)||parentIds.has(p.id))continue;
  const stack=[p.id], seen=new Set(), types=new Set(), ids=[];
  while(stack.length){
   const id=stack.pop();
   if(seen.has(id))continue;
   seen.add(id);
   ids.push(id);
   const children=edges.get(id)??[];
   for(let i=children.length-1;i>=0;i--){
    const edge=children[i];
    types.add(edge.method);
    for(const variant of edge.variants??[])if(variant.method)types.add(variant.method);
    stack.push(edge.id);
   }
  }
  const family={root:p.id,ids,methods:types};
  families.push(family);
  for(const id of ids)byMember.set(id,family);
 }
 const order=id=>{
  const p=members.get(id);
  return p.dex.paldea??(p.dex.kitakami?500+p.dex.kitakami:p.dex.blueberry?1000+p.dex.blueberry:1500+id);
 };
 families.sort((a,b)=>order(a.root)-order(b.root));
 return {families,byMember,edges};
}

export function evolutionPath(view,root,target){
 if(root===target)return [root];
 for(const child of view.edges.get(root)??[]){
  const tail=evolutionPath(view,child.id,target);
  if(tail.length)return [root,...tail];
 }
 return [];
}
