import type { RawRow } from '@/types/dataset';

export interface AgencyPerformance {
  agency: string; projectCount: number; sanctionedAmount: number; expenditure: number;
  utilization: number; averagePhysicalProgress: number; completedProjects: number;
  delayedProjects: number; costOverrunProjects: number; completionRate: number;
  delayRate: number; costOverrunRate: number; performanceScore: number;
  performanceLevel: 'Excellent' | 'Good' | 'Moderate' | 'Needs Attention'; reasons: string[];
}
const str=(v:unknown)=>String(v??'').trim();
const num=(v:unknown)=>{const n=Number(String(v??'').replace(/[₹,%\s,]/g,''));return Number.isFinite(n)?n:0;};
const get=(r:RawRow, fields:string[])=>fields.map(f=>r[f]).find(v=>v!==undefined&&v!==null&&v!=='')??null;
const agency=(r:RawRow)=>str(get(r,['implementing_agency','agency','IDA']))||'Unknown Agency';
const sanctioned=(r:RawRow)=>num(get(r,['sanctioned_amount','sanctioned_cost','estimated_cost','Amount Sanctioned']));
const expenditure=(r:RawRow)=>num(get(r,['expenditure','amount_disbursed','final_cost','Amount Disbursed ( ₹ )','Amount Disbursed']));
const progress=(r:RawRow)=>Math.max(0,Math.min(100,num(get(r,['physical_progress','Physical Progress','progress']))));
const status=(r:RawRow)=>str(get(r,['status','Status'])).toLowerCase();
const completed=(r:RawRow)=>status(r).includes('complete')||progress(r)>=100;
function delayed(r:RawRow){
  const st=status(r); if(st.includes('delay')||st.includes('overdue')) return true;
  const e=str(get(r,['expected_completion_date','expected_completion','Expected Completion Date']));
  const a=str(get(r,['actual_completion_date','actual_completion','Completion Date']));
  if(!e||!a)return false; const ed=new Date(e),ad=new Date(a);
  return !Number.isNaN(ed.getTime())&&!Number.isNaN(ad.getTime())&&ad>ed;
}
const overrun=(r:RawRow)=>{const s=sanctioned(r),e=expenditure(r);return s>0&&e>s*1.05;};
export function analyzeAgencyPerformance(rows:RawRow[]):AgencyPerformance[]{
  const map=new Map<string,{count:number;s:number;e:number;p:number;c:number;d:number;o:number}>();
  for(const r of rows){const a=agency(r);const x=map.get(a)||{count:0,s:0,e:0,p:0,c:0,d:0,o:0};x.count++;x.s+=sanctioned(r);x.e+=expenditure(r);x.p+=progress(r);if(completed(r))x.c++;if(delayed(r))x.d++;if(overrun(r))x.o++;map.set(a,x);}
  return [...map.entries()].map(([a,x])=>{
    const util=x.s>0?x.e/x.s*100:0, avg=x.p/x.count, completion=x.c/x.count*100, delay=x.d/x.count*100, cost=x.o/x.count*100;
    const score=completion*.30+Math.min(util,100)*.25+avg*.20+Math.max(0,100-delay)*.15+Math.max(0,100-cost)*.10;
    const reasons:string[]=[]; if(util<60)reasons.push(`Low fund utilization at ${util.toFixed(0)}%`); if(delay>=25)reasons.push(`${delay.toFixed(0)}% of projects show delay signals`); if(avg<50)reasons.push(`Low average physical progress at ${avg.toFixed(0)}%`); if(cost>=15)reasons.push(`${cost.toFixed(0)}% of projects show cost-overrun signals`); if(!reasons.length)reasons.push('No major performance weakness detected');
    const performanceLevel=score>=85?'Excellent':score>=70?'Good':score>=50?'Moderate':'Needs Attention';
    return {agency:a,projectCount:x.count,sanctionedAmount:x.s,expenditure:x.e,utilization:+util.toFixed(1),averagePhysicalProgress:+avg.toFixed(1),completedProjects:x.c,delayedProjects:x.d,costOverrunProjects:x.o,completionRate:+completion.toFixed(1),delayRate:+delay.toFixed(1),costOverrunRate:+cost.toFixed(1),performanceScore:+score.toFixed(1),performanceLevel,reasons};
  }).sort((a,b)=>a.performanceScore-b.performanceScore);
}
