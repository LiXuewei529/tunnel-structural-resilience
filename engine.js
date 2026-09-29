'use strict';
(function (root) {
  const ROCK = Object.freeze({I:34, II:26.5, III:12, IV:3.4, V:1});
  const LIMITS = {theta:[0,180],omega:[0,50],d:[0,2.25],l:[0,13.5],D:[0,.8],H:[50,450],lambda:[.5,2.5]};
  const LABELS = {theta:'Void location θ',omega:'Angular extent ω',d:'Radial thickness d',l:'Longitudinal length l',D:'Lining deterioration D',H:'Burial depth H',lambda:'Lateral pressure coefficient λ'};
  const Q0=[1,.9,.75,.25,0], FINAL=[1,.99,.98,.95,.9];
  const ETA_J=[.11277966336337288,.22674336719268962,.557906210588332,1.9846422879535583];
  const BETA=.9104388790841943, A1=.17488864343200103, A2=.8251113565679989;
  const NAMES=['No damage','Minor damage','Moderate damage','Severe damage','Very severe damage'];
  const STAGES=[[],[
    ['R1–R3','Inspection and assessment',16.6,0],['R6','Grouting hole layout and parameter trials',5.8,0],['R7','Backfill grouting of voids behind the lining',12.7,.7857142857142857],['R21','Surface protection and coating',4.4,.21428571428571427],['R22','Reassessment and acceptance',3.8,0],['R23','Monitoring installation and defect records',3.4,0]
  ],[
    ['R1–R5','Inspection, assessment and repair approval',29.2,0],['R6–R7','Grouting preparation and backfill grouting',18.5,.5263157894736842],['R8','Contact grouting and quality verification',4.8,.15789473684210525],['R10, R13','Deteriorated concrete removal and section repair',17,.21052631578947367],['R21–R23','Protection, acceptance and monitoring',11.6,.10526315789473684]
  ],[
    ['R24','Traffic control and site protection',2.9,0],['R1–R5','Inspection, assessment and repair approval',29.2,0],['R6–R9','Comprehensive void remediation',39.6,.42105263157894735],['R10–R12, R14','Lining repair and drainage works',29.4,.2631578947368421],['R15','Structural strengthening of the lining',11.2,.21052631578947367],['R21–R23','Protection, acceptance and monitoring',11.6,.10526315789473684]
  ],[
    ['R24–R25','Construction coordination and safety management',9.9,0],['R1–R5','Inspection, assessment and repair approval',29.2,0],['R18','Temporary support and protection against falling fragments',9.8,.07216494845360824],['R7, R9','Void backfilling and deep-borehole reinforcement',29,.32989690721649484],['R10–R12, R14','Lining repair and drainage works',29.4,.20618556701030927],['R20','Local removal and lining reconstruction',32.4,.28865979381443296],['R21–R23','Protection, acceptance and monitoring',11.6,.10309278350515463]
  ]];
  function finite(v,label){
    if(typeof v!=='number'||!Number.isFinite(v))throw Error(label+' must be a valid number');
    return v;
  }
  function validateInput(input){
    if(!input||typeof input!=='object')throw Error('Engineering inputs are missing');
    const x={id:String(input.id||'Segment').slice(0,80)};
    for(const [k,[lo,hi]] of Object.entries(LIMITS)){
      const v=finite(input[k],LABELS[k]);
      if(v<lo||v>hi)throw Error(`${LABELS[k]} must be within ${lo}–${hi} `);
      x[k]=v;
    }
    if(!Object.hasOwn(ROCK,input.rock_class))throw Error('Rock mass class must be I, II, III, IV or V');
    x.rock_class=input.rock_class;
    const n=[x.omega,x.d,x.l].filter(v=>v>0).length;
    if(n!==0&&n!==3)throw Error('For a void, ω, d and l must all be greater than 0. For no void, set all three to 0.');
    return x;
  }
  function predictFeatures(features){
    const m=root.TunnelModelData;
    if(!m)throw Error('Model data have not loaded');
    if(features.length!==8||features.some(v=>!Number.isFinite(v)))throw Error('The model requires eight valid inputs');
    const x=features.map((v,i)=>(v-m.min[i])/m.span[i]);
    let sum=0;
    for(let node of m.trees){
      while(Array.isArray(node))node=x[node[0]]<=node[1]?node[2]:node[3];
      sum+=node;
    }
    return sum*m.y_span+m.y_min;
  }
  function predict(input){const x=validateInput(input);return predictFeatures([x.theta,x.omega,x.d,x.l,x.D,x.H,x.lambda,ROCK[x.rock_class]]);}
  function damageState(z){return z>=1?0:z>=.8?1:z>=.6?2:z>=.4?3:4;}
  function intensity(x){return A1*x.omega/50+A2*x.D/.8;}
  // A positive-term expansion avoids cancellation inside the normal integral.
  function normalCDF(x){
    if(x<=-10)return 0;if(x>=10)return 1;
    const a=Math.abs(x);let term=a,sum=a;
    for(let k=1;k<1000;k++){term*=a*a/(2*k+1);sum+=term;if(term<=sum*1e-16)break;}
    const integral=sum*Math.exp(-a*a/2)/Math.sqrt(2*Math.PI);
    return Math.max(0,Math.min(1,.5+(x<0?-integral:integral)));
  }
  function probabilities(eta){
    finite(eta,'Composite defect intensity');if(eta<0||eta>1+1e-12)throw Error('Composite defect intensity is outside the model range');
    if(eta===0)return [1,0,0,0,0];
    const f=ETA_J.map(v=>normalCDF(Math.log(eta/v)/BETA));
    return [1-f[0],f[0]-f[1],f[1]-f[2],f[2]-f[3],f[3]];
  }
  function baselineSchedule(){return {wait:[0,5.8,11.4,22.7,46.9],durations:STAGES.map(a=>a.map(s=>s[2]))};}
  function editableSchedule(s=baselineSchedule()){
    const out=structuredClone(s);
    if(!out.stages)out.stages=STAGES.map(rows=>rows.map(row=>({name:row[1],label:row[0],weight:row[3]*100,taskIds:[]})));
    if(!out.final)out.final=FINAL.slice();
    return out;
  }
  function planStages(s,i){
    if(!s.stages)return STAGES[i];
    const total=s.stages[i].reduce((a,r)=>a+r.weight,0);
    return s.stages[i].map((r,k)=>[r.taskIds?.length?r.taskIds.join(', '):(r.label||'Custom stage'),r.name,s.durations[i][k],total>0?r.weight/total:0]);
  }
  function finalLevels(s){return s.final||FINAL;}
  function validateSchedule(s){
    if(!s||!Array.isArray(s.wait)||s.wait.length!==5||!Array.isArray(s.durations)||s.durations.length!==5)throw Error('Invalid repair plan format');
    if(s.stages&&(!Array.isArray(s.stages)||s.stages.length!==5))throw Error('Invalid repair stage configuration');
    const finals=s.final||FINAL;
    if(!Array.isArray(finals)||finals.length!==5)throw Error('Invalid final recovery level configuration');
    for(let i=0;i<5;i++){
      finite(s.wait[i],'Waiting time');if(s.wait[i]<0||s.wait[i]>3650)throw Error('Waiting time must be between 0 and 3650 days');
      const rows=s.stages?s.stages[i]:STAGES[i];
      if(!Array.isArray(rows)||rows.length>100)throw Error('Each damage state supports up to 100 stages');
      if(!Array.isArray(s.durations[i])||s.durations[i].length!==rows.length)throw Error('Duration count does not match the repair stages');
      for(const v of s.durations[i]){finite(v,'Stage duration');if(v<0||v>3650)throw Error('Stage duration must be between 0 and 3650 days');}
      finite(finals[i],'Final recovery level');if(finals[i]<Q0[i]||finals[i]>1)throw Error(`DS${i}  final recovery level must be between ${Q0[i]} and 1`);
      if(s.stages){
        for(const r of rows){
          if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>120)throw Error('Stage names are required and must not exceed 120 characters');
          finite(r.weight,'Gain weight');if(r.weight<0||r.weight>1000000)throw Error('Gain weights must be non-negative and no greater than 1000000');
          if(!Array.isArray(r.taskIds)||r.taskIds.length>100||r.taskIds.some(v=>typeof v!=='string'||v.length>30))throw Error('Invalid linked task IDs');
          if(r.label!==undefined&&typeof r.label!=='string')throw Error('Invalid stage label format');
        }
        if(finals[i]>Q0[i]&&rows.reduce((a,r)=>a+r.weight,0)<=0)throw Error(`DS${i}  final performance exceeds initial performance; at least one stage must have a positive gain weight`);
      }
    }
    if(s.wait[0]!==0||s.durations[0].length||finals[0]!==1)throw Error('DS0 remains intact and does not require repair stages');
    const out={wait:s.wait.slice(),durations:s.durations.map(a=>a.slice())};
    if(s.stages)out.stages=s.stages.map(rows=>rows.map(r=>({name:r.name.trim(),label:r.label||'',weight:r.weight,taskIds:r.taskIds.slice()})));
    if(s.final)out.final=finals.slice();
    return out;
  }
  function checkHorizon(t){finite(t,'Assessment period');if(t<=0||t>3650)throw Error('Assessment period must be greater than 0 and no more than 3650 days');return t;}
  function events(i,s){let t=s.wait[i];return planStages(s,i).map((row,k)=>({time:t+=s.durations[i][k],gain:(finalLevels(s)[i]-Q0[i])*row[3],ids:row[0],name:row[1]}));}
  function performance(i,t,s){return Q0[i]+events(i,s).reduce((sum,e)=>sum+(t+1e-10>=e.time?e.gain:0),0);}
  function stateResilience(s=baselineSchedule(),T=198.2){
    validateSchedule(s);checkHorizon(T);
    return Q0.map((q,i)=>q+events(i,s).reduce((sum,e)=>sum+e.gain*Math.max(T-e.time,0)/T,0));
  }
  function assess(input,s=baselineSchedule(),T=198.2){
    const x=validateInput(input),zeta=predict(x),eta=intensity(x),p=probabilities(eta),r=stateResilience(s,T);
    return {input:x,zeta,ds:damageState(zeta),eta,probabilities:p,stateResilience:r,Rs:p.reduce((a,v,i)=>a+v*r[i],0),initial:p.reduce((a,v,i)=>a+v*Q0[i],0),final:p.reduce((a,v,i)=>a+v*finalLevels(s)[i],0),horizon:T};
  }
  function history(p,s,T=198.2){
    const nodes=[0,T];for(let i=1;i<5;i++)for(const e of events(i,s))if(e.time<=T+1e-10)nodes.push(Math.min(T,e.time));
    return [...new Set(nodes)].sort((a,b)=>a-b).map(t=>({t,q:p.reduce((a,v,i)=>a+v*performance(i,t,s),0)}));
  }
  function parseCSV(text){
    if(text.length>5e6)throw Error('CSV files must not exceed 5 MB');
    text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.length)throw Error('Invalid quotation marks in the CSV');else quoted=!quoted;}
      else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(cell.trim());cell='';if(c!==','){if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}
      else cell+=c;
    }
    if(quoted)throw Error('Unclosed quotation mark in the CSV');row.push(cell.trim());if(row.some(Boolean))rows.push(row);
    if(rows.length<2)throw Error('The CSV contains no data rows');
    if(rows.length>5001)throw Error('Import up to 5000 segments at a time');
    const headers=rows.shift();if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV column names');
    const keys=['id','theta','omega','d','l','D','H','lambda','rock_class'];
    for(const k of keys)if(!headers.includes(k))throw Error('Missing CSV column: '+k);
    const ids=new Set();return rows.map((row,i)=>{
      if(row.length!==headers.length)throw Error(`Row ${i+2}  has an incorrect number of columns`);
      const o=Object.fromEntries(headers.map((h,k)=>[h,row[k]]));
      for(const k of keys){if(!o[k])throw Error(`Row ${i+2} , field ${k}  is empty`);if(Object.hasOwn(LIMITS,k))o[k]=Number(o[k]);}
      try{const x=validateInput(o);if(ids.has(x.id))throw Error('Duplicate segment ID: '+x.id);ids.add(x.id);return x;}catch(e){throw Error(`Row ${i+2} : ${e.message}`);}
    });
  }
  function toCSV(rows){
    return '\uFEFF'+rows.map(row=>row.map(v=>{
      let s=String(v??'');if(typeof v==='string'&&/^[\s]*[=+\-@]/.test(s))s="'"+s;
      return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
    }).join(',')).join('\r\n');
  }
  root.TunnelEngine=Object.freeze({ROCK,LIMITS,LABELS,Q0,FINAL,ETA_J,BETA,A1,A2,NAMES,STAGES,validateInput,predictFeatures,predict,damageState,intensity,normalCDF,probabilities,baselineSchedule,editableSchedule,planStages,finalLevels,validateSchedule,checkHorizon,events,performance,stateResilience,assess,history,parseCSV,toCSV});
})(globalThis);
