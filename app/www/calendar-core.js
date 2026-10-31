(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OESTCalendarCore=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';const DAY=86400000,groups=['fire','water','elec','mech','sub'];
  const colors={fire:'#e5534b',water:'#3b8eea',elec:'#e3b341',mech:'#3fb27f',sub:'#a371f7'};
  const valid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  function number(s){if(!valid(s))throw Error('CALENDAR_DATE');return Date.parse(s+'T00:00:00Z')/DAY;}
  const iso=n=>new Date(n*DAY).toISOString().slice(0,10);
  function period(f){const m=/^([1-9]\d*)([DWM])$/.exec(f);if(!m||+m[1]>1200)throw Error('CALENDAR_FREQUENCY');return {n:+m[1],unit:m[2]};}
  function occurrence(anchor,p,index){if(p.unit!=='M')return iso(number(anchor)+p.n*index*(p.unit==='W'?7:1));const d=new Date(anchor+'T00:00:00Z'),original=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+p.n*index);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(original,last));return d.toISOString().slice(0,10);}
  function isWorkday(date,scheduleOn){const s=scheduleOn?.(date);if(!s||!valid(s.effectiveFrom)||date<s.effectiveFrom)throw Error('CALENDAR_SCHEDULE_REQUIRED');const wd=new Date(date+'T00:00:00Z').getUTCDay();if(s.kind==='weekdays')return wd>0&&wd<6;if(s.kind==='weekends')return wd===0||wd===6;if(s.kind==='4on4'){if(!valid(s.anchor))throw Error('CALENDAR_SCHEDULE_REQUIRED');return ((number(date)-number(s.anchor))%8+8)%8<4;}throw Error('CALENDAR_SCHEDULE_REQUIRED');}
  function displayDate(d,mode,scheduleOn){if(mode==='all')return d;if(isWorkday(d,scheduleOn))return d;if(mode==='skip')return null;for(let i=1;i<=366;i++){const next=iso(number(d)+i);if(isWorkday(next,scheduleOn))return next;}throw Error('CALENDAR_WORKDAY_NOT_FOUND');}
  function generate({tasks,dues,today,config,scheduleOn,receipts=[]}){
    const start=number(today);if(!Number.isInteger(config.weeks)||config.weeks<1||config.weeks>52||!['all','skip','next'].includes(config.workdayMode)||!Array.isArray(config.groups)||config.groups.some(g=>!groups.includes(g)))throw Error('CALENDAR_CONFIG');
    const end=start+config.weeks*7,out=new Map(),byId=new Map(tasks.map(t=>[t.id,t]));
    function event(t,d,completed=false){const displayed=completed?d:displayDate(d,config.workdayMode,scheduleOn);if(!displayed||(!completed&&(number(displayed)<start||number(displayed)>=end)))return;const key='ppm:'+t.id+':'+d;out.set(key,{key,taskId:t.id,kind:'ppm',sourceDue:d,date:displayed,completed,title:(completed?'✓ ':'')+t.name,description:'Group: '+t.group+'\nFrequency: '+t.freq.join(' + ')+(displayed!==d?'\nOriginal due date: '+d:'')+'\nOpen in app: OEST → PPM → '+t.name+'\n'+t.id,color:colors[t.group]||'#3ecf8e'});}
    if(config.exportInspections)for(const t of tasks){if(!config.groups.includes(t.group)||!dues[t.id])continue;if(!/^[\w.-]{1,120}$/.test(t.id))throw Error('CALENDAR_TASK_ID');const anchor=dues[t.id];number(anchor);const ps=t.freq.map(period),p=ps.sort((a,b)=>occurrence(anchor,a,1).localeCompare(occurrence(anchor,b,1)))[0];if(!p){if(number(anchor)>=start&&number(anchor)<end)event(t,anchor);continue;}
      let i=0;if(p.unit==='M'){const a=new Date(anchor+'T00:00:00Z'),z=new Date(today+'T00:00:00Z');i=Math.max(0,Math.floor(((z.getUTCFullYear()-a.getUTCFullYear())*12+z.getUTCMonth()-a.getUTCMonth())/p.n)-1);}else i=Math.max(0,Math.floor((start-number(anchor))/(p.n*(p.unit==='W'?7:1)))-1);
      for(let count=0;count<1000;count++,i++){const d=occurrence(anchor,p,i);if(number(d)>=end)break;if(number(d)>=start)event(t,d);}
    }
    for(const r of receipts){if(!['completed','sent'].includes(r.status)||!valid(r.due))throw Error('CALENDAR_COMPLETION');const t=byId.get(r.taskId);if(t&&config.exportInspections&&config.groups.includes(t.group)&&number(r.due)<end)event(t,r.due,true);}
    if(config.shiftMarkers)for(let d=start;d<end;d++){const date=iso(d);if(isWorkday(date,scheduleOn)){const s=scheduleOn(date);const key='shift:'+date;out.set(key,{key,taskId:'shift',kind:'shift',sourceDue:date,date,completed:false,title:'Shift '+(s.start||'')+'–'+(s.end||''),description:'Workday marker from OEST profile. This is NOT your family shift calendar.',color:'#8b949e'});}}
    return [...out.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
  }
  function plan(existing,desired,today){const used=new Set(),ops=[],exact=new Map();for(const x of existing){if(!exact.has(x.key))exact.set(x.key,[]);exact.get(x.key).push(x);}
    for(const d of desired){let old=(exact.get(d.key)||[]).find(e=>!used.has(e.eventId));if(!old)old=existing.find(e=>!used.has(e.eventId)&&!e.completed&&e.date>=today&&e.taskId===d.taskId&&e.kind===d.kind&&!desired.some(z=>z.key===e.key));if(!old){ops.push({op:'insert',event:d});continue;}used.add(old.eventId);if(old.completed&&!d.completed)continue;if(['key','title','description','date','completed','color'].some(k=>old[k]!==d[k]))ops.push({op:'update',eventId:old.eventId,expectedKey:old.key,event:d});}
    for(const e of existing)if(!used.has(e.eventId)&&(!e.completed&&e.date>=today||desired.some(d=>d.key===e.key)))ops.push({op:'delete',eventId:e.eventId,expectedKey:e.key});return ops;
  }
  return {generate,plan,isWorkday,valid,occurrence,period};
});
