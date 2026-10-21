import { createHash } from 'node:crypto';

export const DEMO_ZONE='America/New_York';
export const demoHash=value=>createHash('sha256').update(String(value)).digest().readUInt32BE(0);
export const demoDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:DEMO_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export const demoWeekday=day=>new Date(day+'T12:00:00Z').getUTCDay();
export function demoInstant(day,minutes){
 const local=Date.parse(day+'T00:00:00Z')+minutes*60000;
 const formatter=new Intl.DateTimeFormat('en-US',{timeZone:DEMO_ZONE,timeZoneName:'shortOffset'});
 let instant=local;
 for(let i=0;i<3;i++){const offset=formatter.formatToParts(new Date(instant)).find(p=>p.type==='timeZoneName').value;instant=local-Number(offset.replace('GMT',''))*3600000}
 return instant;
}
export function demoDayVolume(day){
 const weekday=demoWeekday(day),seed=demoHash(day);
 return weekday===5?95+seed%6:[70,30,40,50,60,0,82][weekday]+seed%7;
}
function weight(day,minute){
 const friday=demoWeekday(day)===5;
 if(minute<450)return 1.4;
 if(minute<540)return 4;
 if(minute<600)return 3.3;
 if(minute<660)return 1;
 if(minute<840)return .45;
 if(minute<960)return .7;
 if(minute<1020)return 1.3;
 if(minute<1080)return friday?6:2.8;
 if(minute<1200)return friday?15:3;
 if(minute<1260)return friday?6:1.9;
 return 1;
}
// Stratified sampling preserves the peaks even with only a few dozen orders.
export function demoEmission(day,index,count,key,latestMinute=1275){
 if(latestMinute<420)throw Error('No completed demo window inside opening hours');
 const bins=[];let sum=0;
 for(let start=420;start<latestMinute;start+=15){const end=Math.min(start+15,latestMinute),mass=(end-start)*weight(day,start);sum+=mass;bins.push({start,end,mass})}
 if(!sum)return demoInstant(day,420);
 let point=((index+(demoHash(key)%10000)/10000)/count)*sum;
 for(const bin of bins){if(point<=bin.mass)return Math.round(demoInstant(day,bin.start+(bin.end-bin.start)*point/bin.mass));point-=bin.mass}
 return demoInstant(day,latestMinute)-1;
}
// Preserve total history: Fridays approach the existing 100/day ceiling,
// distributing the remainder over the other days without deleting any orders.
export function demoHistoryCounts(days,total){
 const ranges=[[70,79],[30,39],[40,49],[50,59],[60,69],[95,100],[80,94]];
 const result=new Map(days.map(day=>[day,demoDayVolume(day)]));
 let left=total-[...result.values()].reduce((a,b)=>a+b,0),cursor=0;
 if(!Number.isInteger(total)||total<0)throw Error('Invalid history total');
 const normal=days.filter(day=>demoWeekday(day)!==5).sort((a,b)=>demoHash(a)-demoHash(b));
 if(left&&!normal.length)throw Error('Demo history cannot fit weekday ranges');
 while(left!==0){
  const direction=Math.sign(left),day=normal[cursor++%normal.length],next=result.get(day)+direction,[min,max]=ranges[demoWeekday(day)];
  if(next>=min&&next<=max){result.set(day,next);left-=direction}
  else if(normal.every(d=>direction>0?result.get(d)>=ranges[demoWeekday(d)][1]:result.get(d)<=ranges[demoWeekday(d)][0]))throw Error('Demo history cannot fit weekday ranges without deleting records');
 }
 return result;
}
