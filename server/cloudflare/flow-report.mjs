import { reportPeriod, timeZoneIntervals, calendarCoverage, reportTimeZone } from '../../shared/report-period.mjs';
export function flowWindows(timeZone,hourDays=30,weekdayDays=120,now=Date.now()){
 timeZone=reportTimeZone(timeZone);
 for(const days of [hourDays,weekdayDays])if(!Number.isInteger(days)||days<7||days>366)throw Object.assign(Error('Informe uma janela entre 7 e 366 dias.'),{status:400});
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value])),today=parts.year+'-'+parts.month+'-'+parts.day;
 const ago=days=>new Date(Date.parse(today+'T12:00:00Z')-days*86400000).toISOString().slice(0,10);
 const window=days=>({days,from:ago(days),to:ago(1),...reportPeriod(new URLSearchParams({from:ago(days),to:ago(1),timeZone}))});
 return {hours:window(hourDays),weekdays:window(weekdayDays)};
}
export async function flowReport(env,stores,timeZone,hourDays=30,weekdayDays=120,now=Date.now()){
 const windows=flowWindows(timeZone,hourDays,weekdayDays,now),start=Math.min(windows.hours.start,windows.weekdays.start),end=windows.hours.end,intervals=timeZoneIntervals(start,end,windows.hours.timeZone);
 const {results}=await env.DB.prepare(`WITH orders AS(SELECT unixepoch(json_extract(data,'$.createdAt')) emitted FROM store_records WHERE store_id IN(SELECT value FROM json_each(?)) AND key GLOB 'order:*' AND julianday(json_extract(data,'$.createdAt'))>=julianday(?) AND julianday(json_extract(data,'$.createdAt'))<julianday(?)),zoned AS(SELECT datetime(emitted+(SELECT json_extract(value,'$.offset') FROM json_each(?) WHERE emitted>=json_extract(value,'$.start') AND emitted<json_extract(value,'$.end') LIMIT 1),'unixepoch') local_at FROM orders) SELECT substr(local_at,1,10) day,CAST(strftime('%H',local_at) AS INTEGER) hour,COUNT(*) count FROM zoned GROUP BY day,hour`).bind(JSON.stringify(stores.map(s=>s.id)),new Date(start).toISOString(),new Date(end).toISOString(),JSON.stringify(intervals)).all();
 const hourCounts=Array(24).fill(0),weekCounts=Array(7).fill(0);
 for(const row of results){if(row.day>=windows.hours.from)hourCounts[row.hour]+=row.count;if(row.day>=windows.weekdays.from)weekCounts[new Date(row.day+'T12:00:00Z').getUTCDay()]+=row.count}
 const occurrences=Array(7).fill(0);for(const day of calendarCoverage(timeZoneIntervals(windows.weekdays.start,windows.weekdays.end,windows.weekdays.timeZone)))occurrences[day.weekday]++;
 return {timeZone:windows.hours.timeZone,hours:{...windows.hours,buckets:hourCounts.map((total,key)=>({key,total,days:hourDays,average:total/hourDays}))},weekdays:{...windows.weekdays,buckets:[1,2,3,4,5,6,0].map(key=>({key,total:weekCounts[key],days:occurrences[key],average:weekCounts[key]/occurrences[key]}))}};
}
