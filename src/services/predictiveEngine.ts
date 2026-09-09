import type { ParsedDataset, RawRow } from '@/types/dataset';
import type { RiskLevel } from '@/types';

export interface PredictionSignal { label: string; impact: 'positive' | 'warning' | 'risk'; detail: string; }
export interface ProjectPrediction {
  rowIndex: number; projectId: string; projectName: string; state: string; constituency: string;
  status: string; delayProbability: number; costOverrunProbability: number; completionRisk: number;
  riskLevel: RiskLevel; confidence: number; signals: PredictionSignal[]; recommendedAction: string;
}
export interface PredictiveSummary { projects: number; delayHigh: number; costHigh: number; completionHigh: number; averageDelayProbability: number; averageCostProbability: number; averageCompletionRisk: number; coverage: number; topProjects: ProjectPrediction[]; }

type Row = RawRow & Record<string, unknown>;
const n=(v:unknown):number|null=>{if(typeof v==='number'&&Number.isFinite(v))return v; if(v==null||v==='')return null; const x=Number(String(v).replace(/[₹$€£,%\s,]/g,'')); return Number.isFinite(x)?x:null;};
const s=(v:unknown)=>String(v??'').trim();
const d=(v:unknown):Date|null=>{const x=s(v);if(!x)return null;const z=new Date(x);return Number.isNaN(z.getTime())?null:z;};
const status=(r:Row)=>{const x=s(r.status).toLowerCase(); if(x.includes('complete'))return 'completed'; if(x.includes('delay'))return 'delayed'; if(x.includes('pending'))return 'pending'; return 'in-progress';};
const level=(x:number):RiskLevel=>x>=75?'critical':x>=50?'high':x>=25?'medium':'low';

export function predictDataset(dataset: ParsedDataset): PredictiveSummary & { predictions: ProjectPrediction[] } {
  const today=new Date(); const predictions:ProjectPrediction[]=[]; let covered=0;
  (dataset.rows as Row[]).forEach((r,i)=>{
    const st=status(r); const physical=n(r.physical_progress); const financial=n(r.financial_progress);
    const estimated=n(r.estimated_cost); const sanctioned=n(r.sanctioned_cost??r.sanctioned_amount); const spent=n(r.expenditure??r.amount_disbursed);
    const start=d(r.start_date??r.recommendation_date??r.sanction_date); const expected=d(r.expected_completion_date??r.expected_completion); const actual=d(r.actual_completion_date??r.actual_completion);
    let delay=15, cost=15, completion=15; const signals:PredictionSignal[]=[]; let evidence=0;
    if(physical!=null){evidence++; if(physical<40) {delay+=25; completion+=25; signals.push({label:'Low physical progress',impact:'risk',detail:`Physical progress is ${physical.toFixed(1)}%.`});} else if(physical<70){delay+=12;completion+=12;signals.push({label:'Moderate physical progress',impact:'warning',detail:`Physical progress is ${physical.toFixed(1)}%.`});} else {delay-=5;completion-=5;signals.push({label:'Healthy physical progress',impact:'positive',detail:`Physical progress is ${physical.toFixed(1)}%.`});}}
    if(financial!=null&&physical!=null){evidence++;const gap=financial-physical;if(gap>30){delay+=18;completion+=18;signals.push({label:'Financial/physical mismatch',impact:'risk',detail:`Financial progress is ${gap.toFixed(1)} points ahead of physical progress.`});} else if(gap>15){delay+=8;completion+=8;signals.push({label:'Progress mismatch',impact:'warning',detail:`Financial progress is ${gap.toFixed(1)} points ahead of physical progress.`});}}
    if(expected){evidence++;if(!actual&&expected<today){const days=Math.max(0,Math.floor((today.getTime()-expected.getTime())/86400000));delay+=days>180?30:days>90?22:12;completion+=days>180?25:days>90?18:10;signals.push({label:'Overdue milestone',impact:'risk',detail:`Expected completion is overdue by ${days} days.`});} else if(!actual){const days=Math.floor((expected.getTime()-today.getTime())/86400000);if(days<60&&physical!=null&&physical<80){delay+=15;completion+=15;signals.push({label:'Near-term completion pressure',impact:'warning',detail:`Expected completion is within ${days} days with incomplete physical progress.`});}}
      if(actual&&actual>expected){delay+=20;completion+=20;signals.push({label:'Historical delay pattern',impact:'risk',detail:'Actual completion occurred after the expected completion date.'});}}
    if(start&&expected&&!actual){evidence++;const total=Math.max(1,expected.getTime()-start.getTime());const elapsed=Math.max(0,today.getTime()-start.getTime());const timePct=Math.min(100,elapsed/total*100);if(timePct>75&&(physical??0)<60){delay+=20;completion+=20;signals.push({label:'Time-progress divergence',impact:'risk',detail:`About ${timePct.toFixed(0)}% of the planned timeline has elapsed while physical progress is below 60%.`});}}
    if(estimated!=null&&sanctioned!=null&&estimated>0){evidence++;const v=(sanctioned-estimated)/estimated*100;if(v>20){cost+=28;signals.push({label:'High sanction variance',impact:'risk',detail:`Sanctioned cost is ${v.toFixed(1)}% above the estimate.`});}else if(v>5){cost+=12;signals.push({label:'Sanction variance',impact:'warning',detail:`Sanctioned cost is ${v.toFixed(1)}% above the estimate.`});}}
    if(sanctioned!=null&&spent!=null&&sanctioned>0){evidence++;const util=spent/sanctioned*100;if(util>100){cost+=30;completion+=10;signals.push({label:'Potential cost overrun',impact:'risk',detail:`Expenditure is ${util.toFixed(1)}% of sanctioned cost.`});}else if(util>85){cost+=15;signals.push({label:'High financial utilization',impact:'warning',detail:`Expenditure has reached ${util.toFixed(1)}% of sanctioned cost.`});}}
    if(st==='delayed'){delay+=20;completion+=18;signals.push({label:'Current delayed status',impact:'risk',detail:'The source record currently marks the project as delayed.'});}
    if(st==='completed'){delay=Math.min(delay,10);completion=Math.min(completion,10);signals.push({label:'Completed project',impact:'positive',detail:'The source record indicates completion.'});}
    delay=Math.max(0,Math.min(100,delay)); cost=Math.max(0,Math.min(100,cost)); completion=Math.max(0,Math.min(100,completion));
    const coverage=Math.min(100,Math.round(evidence/6*100)); const combined=Math.round(delay*.35+cost*.30+completion*.35); const finalLevel=level(combined); covered+=coverage;
    const action=finalLevel==='critical'||finalLevel==='high'?'Prioritize field/record verification and obtain an updated corrective action plan.':finalLevel==='medium'?'Monitor the next milestone and verify progress evidence.':'Continue routine monitoring.';
    predictions.push({rowIndex:i,projectId:s(r.project_id)||`ROW-${i+1}`,projectName:s(r.project_name)||s(r.work)||`Project ${i+1}`,state:s(r.state),constituency:s(r.constituency),status:st,delayProbability:Math.round(delay),costOverrunProbability:Math.round(cost),completionRisk:Math.round(completion),riskLevel:finalLevel,confidence:coverage,signals,recommendedAction:action});
  });
  predictions.sort((a,b)=>(b.completionRisk*.4+b.delayProbability*.35+b.costOverrunProbability*.25)-(a.completionRisk*.4+a.delayProbability*.35+a.costOverrunProbability*.25));
  const avg=(key: 'delayProbability'|'costOverrunProbability'|'completionRisk')=>predictions.length?Math.round(predictions.reduce((a,p)=>a+p[key],0)/predictions.length):0;
  return {projects:predictions.length,delayHigh:predictions.filter(p=>p.delayProbability>=60).length,costHigh:predictions.filter(p=>p.costOverrunProbability>=60).length,completionHigh:predictions.filter(p=>p.completionRisk>=60).length,averageDelayProbability:avg('delayProbability'),averageCostProbability:avg('costOverrunProbability'),averageCompletionRisk:avg('completionRisk'),coverage:predictions.length?Math.round(covered/predictions.length):0,topProjects:predictions.slice(0,25),predictions};
}
