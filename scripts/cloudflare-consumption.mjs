import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export const INCLUDED={requests:10000000,cpuMs:30000000,rowsRead:25000000000,rowsWritten:50000000,storageBytes:5000000000};
export function consumptionReport(values,now=new Date()){
 const missing=Object.keys(INCLUDED).filter(k=>!Number.isFinite(values[k])||values[k]<0),metrics=Object.fromEntries(Object.entries(INCLUDED).map(([key,included])=>{const value=values[key],ratio=Number.isFinite(value)&&value>=0?value/included:null;return[key,{value:ratio===null?null:value,included,percent:ratio===null?null:ratio*100,band:ratio===null?'unknown':ratio>=1?100:ratio>=.95?95:ratio>=.9?90:ratio>=.8?80:ratio>=.3?30:0}]}));
 return {checkedAt:now.toISOString(),ok:missing.length===0,missingMetrics:missing,baseMonthlyUSD:5,hardSpendingCap:false,windowStart:new Date(now.getTime()-31*86400000).toISOString(),windowEnd:now.toISOString(),basis:'rolling-31-days-conservative',billingCycleVerified:false,note:'Estimativa conservadora dos últimos 31 dias, não uma fatura. A credencial não possui leitura de assinaturas; não assumir renovação no primeiro dia do mês. Métricas podem ter atraso. Alertas não bloqueiam cobrança.',metrics,alerts:Object.entries(metrics).filter(([,m])=>m.band==='unknown'||m.band>=30).map(([metric,m])=>({metric,...m})),sources:['https://developers.cloudflare.com/workers/platform/pricing/','https://developers.cloudflare.com/d1/platform/pricing/']};
}
async function collect(){
 const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;if(!token||!account)throw Error('Monitoring credentials are not configured');
 const now=new Date(),start=new Date(now.getTime()-31*86400000),storageStart=new Date(now.getTime()-86400000);
 const query=`query($account:string!,$start:Date!,$end:Date!,$from:Time!,$to:Time!,$storageStart:Date!){viewer{accounts(filter:{accountTag:$account}){d1AnalyticsAdaptiveGroups(limit:1,filter:{date_geq:$start,date_leq:$end}){sum{rowsRead rowsWritten}} workersInvocationsAdaptive(limit:1,filter:{datetime_geq:$from,datetime_leq:$to}){sum{requests cpuTimeUs}} d1StorageAdaptiveGroups(limit:10000,filter:{date_geq:$storageStart,date_leq:$end}){dimensions{databaseId} max{databaseSizeBytes}}}}}`;
 const response=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',signal:AbortSignal.timeout(25000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query,variables:{account,start:start.toISOString().slice(0,10),end:now.toISOString().slice(0,10),from:start.toISOString(),to:now.toISOString(),storageStart:storageStart.toISOString().slice(0,10)}})});
 const data=await response.json();if(!response.ok||data.errors?.length)throw Error('Cloudflare analytics unavailable: '+(data.errors?.map(e=>e.message).join('; ')||response.status));
 const result=data.data?.viewer?.accounts?.[0];if(!result)throw Error('Account analytics unavailable');
 const d1=result.d1AnalyticsAdaptiveGroups,workers=result.workersInvocationsAdaptive,storage=result.d1StorageAdaptiveGroups;
 if(d1.length>1||workers.length>1||storage.length>=10000)throw Error('Analytics result may be truncated');
 return consumptionReport({rowsRead:d1[0]?.sum.rowsRead,rowsWritten:d1[0]?.sum.rowsWritten,requests:workers[0]?.sum.requests,cpuMs:workers[0]?.sum.cpuTimeUs/1000,storageBytes:storage.length?storage.reduce((s,r)=>s+r.max.databaseSizeBytes,0):null},now);
}
async function publish(report){
 const repo=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;if(!repo||!token)throw Error('Snapshot publication credentials missing');
 const api=async(route,method='GET',body)=>{const response=await fetch('https://api.github.com/repos/'+repo+route,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(response.status===404)return null;const data=await response.json();if(!response.ok)throw Error('Snapshot API HTTP '+response.status);return data};
 const branch='consumption-status';if(!await api('/git/ref/heads/'+branch)){const base=await api('/git/ref/heads/main');await api('/git/refs','POST',{ref:'refs/heads/'+branch,sha:base.object.sha})}
 const file='/contents/monitoring/cloudflare-usage.json',previous=await api(file+'?ref='+branch);
 await api(file,'PUT',{branch,message:'Update Cloudflare consumption snapshot [skip ci]',content:Buffer.from(JSON.stringify(report,null,2)+'\n').toString('base64'),...(previous?{sha:previous.sha}:{})});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){let report;try{report=await collect()}catch(error){report={checkedAt:new Date().toISOString(),ok:false,missingMetrics:Object.keys(INCLUDED),error:String(error.message).replaceAll(process.env.CLOUDFLARE_ACCOUNT_ID||'__none__','[account]'),alerts:[{metric:'monitoring',band:'unknown'}]}}fs.mkdirSync('consumption-output',{recursive:true});fs.writeFileSync('consumption-output/latest.json',JSON.stringify(report,null,2));console.log('CONSUMPTION_REPORT='+JSON.stringify(report));if(process.argv.includes('--publish'))await publish(report);if(!report.ok)process.exitCode=1}
