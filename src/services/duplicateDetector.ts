import type { DuplicateGroup, RawRow } from '@/types/dataset';
export type DuplicateKind='exact'|'strong'|'potential';
export interface DuplicatePair { a:number; b:number; score:number; kind:DuplicateKind; reasons:string[]; }
export interface DuplicateDetectionOptions { strongThreshold?:number; potentialThreshold?:number; amountTolerancePercent?:number; }
export interface DuplicateDetectionResult { duplicateGroups:DuplicateGroup[]; exactDuplicateGroups:DuplicateGroup[]; strongDuplicateGroups:DuplicateGroup[]; potentialDuplicateGroups:DuplicateGroup[]; pairs:DuplicatePair[]; totalDuplicateRows:number; }
const str=(v:unknown)=>String(v??'').trim();
const norm=(v:unknown)=>str(v).toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const tokens=(v:unknown)=>new Set(norm(v).split(' ').filter(x=>x.length>2));
const amount=(v:unknown)=>{if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(/[₹$€£,%\s,]/g,''));return Number.isFinite(n)?n:null;};
const signature=(r:RawRow)=>[norm(r.mp_name),norm(r.constituency),norm(r.state),norm(r.project_name),norm(r.work_description),amount(r.amount_disbursed??r.expenditure??r.sanctioned_cost??r.sanctioned_amount)?.toFixed(2)||'',norm(r.start_date),norm(r.expected_completion_date)].join('|');
function jaccard(a:Set<string>,b:Set<string>){if(!a.size&&!b.size)return 0;let same=0;a.forEach(x=>{if(b.has(x))same++;});return same/(a.size+b.size-same||1);}
function similarity(a:RawRow,b:RawRow,amountTol:number){
 const da=a.work_description||a.project_name, db=b.work_description||b.project_name;
 const desc=jaccard(tokens(da),tokens(db)); const name=jaccard(tokens(a.project_name),tokens(b.project_name));
 const sameState=norm(a.state)&&norm(a.state)===norm(b.state)?1:0, sameCon=norm(a.constituency)&&norm(a.constituency)===norm(b.constituency)?1:0;
 const mpA=norm(a.mp_name),mpB=norm(b.mp_name), sameMp=mpA&&mpA===mpB?1:0;
 const agA=norm(a.implementing_agency||a.agency),agB=norm(b.implementing_agency||b.agency), sameAgency=agA&&agA===agB?1:0;
 const aa=amount(a.amount_disbursed??a.expenditure??a.sanctioned_cost??a.sanctioned_amount),bb=amount(b.amount_disbursed??b.expenditure??b.sanctioned_cost??b.sanctioned_amount);
 let amountScore=0, amountReason=''; if(aa!==null&&bb!==null&&Math.max(aa,bb)>0){const diff=Math.abs(aa-bb)/Math.max(aa,bb)*100;amountScore=diff<=amountTol?1:Math.max(0,1-diff/50);amountReason=`amount difference ${diff.toFixed(1)}%`;}
 const score=Math.round((desc*.48+name*.07+sameState*.10+sameCon*.18+sameMp*.08+sameAgency*.04+amountScore*.05)*100);
 const reasons:string[]=[]; if(desc>=.8)reasons.push(`description similarity ${(desc*100).toFixed(0)}%`); if(sameCon)reasons.push('same constituency'); if(sameState)reasons.push('same state'); if(sameMp)reasons.push('same MP'); if(sameAgency)reasons.push('same agency'); if(amountReason)reasons.push(amountReason); return {score,reasons};
}
function add(map:Map<string,number[]>,key:string,i:number){if(!key)return;const a=map.get(key);a?a.push(i):map.set(key,[i]);}
function groups(pairs:DuplicatePair[],kind:DuplicateKind){const adj=new Map<number,number[]>();pairs.filter(p=>p.kind===kind).forEach(p=>{(adj.get(p.a)||adj.set(p.a,[]).get(p.a)!).push(p.b);(adj.get(p.b)||adj.set(p.b,[]).get(p.b)!).push(p.a);});const seen=new Set<number>(),out:DuplicateGroup[]=[];for(const root of adj.keys()){if(seen.has(root))continue;const stack=[root],rows:number[]=[];while(stack.length){const n=stack.pop()!;if(seen.has(n))continue;seen.add(n);rows.push(n);for(const x of adj.get(n)||[])if(!seen.has(x))stack.push(x);}if(rows.length>1)out.push({key:`${kind}:${rows.join('-')}`,rowIndices:rows.sort((a,b)=>a-b),count:rows.length});}return out;}
export function detectDuplicates(rows:RawRow[],options:DuplicateDetectionOptions={}):DuplicateDetectionResult{
 const strong=options.strongThreshold??70,potential=options.potentialThreshold??50,amountTol=options.amountTolerancePercent??10;
 const exactMap=new Map<string,number[]>(), candidate=new Set<string>(), tokenIndex=new Map<string,number[]>();
 rows.forEach((r,i)=>{const sig=signature(r);if(sig.replace(/\|/g,'').trim())add(exactMap,sig,i);const text=norm(`${r.project_name||''} ${r.work_description||''}`);for(const t of [...tokens(text)].slice(0,35)){const arr=tokenIndex.get(t)||[];if(arr.length<180)arr.push(i);tokenIndex.set(t,arr);}});
 for(const ids of exactMap.values())if(ids.length>1)for(let x=0;x<ids.length;x++)for(let y=x+1;y<ids.length;y++)candidate.add(`${ids[x]}-${ids[y]}`);
 for(let i=0;i<rows.length;i++){const seen=new Set<number>();const ts=[...tokens(`${rows[i].project_name||''} ${rows[i].work_description||''}`)].slice(0,18);for(const t of ts){for(const j of tokenIndex.get(t)||[]){if(j<=i||seen.has(j))continue;seen.add(j);if(seen.size<=80)candidate.add(`${i}-${j}`);}}}
 const exactRows=new Set<number>();for(const ids of exactMap.values())if(ids.length>1)ids.forEach(i=>exactRows.add(i));
 const pairs:DuplicatePair[]=[];for(const key of candidate){const [a,b]=key.split('-').map(Number);if(!Number.isInteger(a)||!Number.isInteger(b))continue;const sim=similarity(rows[a],rows[b],amountTol);const exact=signature(rows[a])===signature(rows[b]);const kind:DuplicateKind=exact?'exact':sim.score>=strong?'strong':sim.score>=potential?'potential':'potential';if(exact||sim.score>=potential)pairs.push({a,b,score:sim.score,kind,reasons:exact?['all available identifying fields match']:sim.reasons});}
 pairs.sort((a,b)=>b.score-a.score);const exactDuplicateGroups=groups(pairs,'exact');
 // rebuild strong groups directly; filter out pairs whose rows are already exact
 const exactSet=new Set(exactDuplicateGroups.flatMap(g=>g.rowIndices)); const strongPairs=pairs.filter(p=>p.kind==='strong'&&!exactSet.has(p.a)&&!exactSet.has(p.b)); const potentialPairs=pairs.filter(p=>p.kind==='potential'&&!exactSet.has(p.a)&&!exactSet.has(p.b));
 const strongGroups=groups(strongPairs,'strong'), potentialGroups=groups(potentialPairs,'potential');
 const all=new Set<number>();pairs.forEach(p=>{if(p.score>=potential){all.add(p.a);all.add(p.b);}});
 return {duplicateGroups:[...exactDuplicateGroups,...strongGroups,...potentialGroups],exactDuplicateGroups,strongDuplicateGroups:strongGroups,potentialDuplicateGroups:potentialGroups,pairs,totalDuplicateRows:all.size};
}
