const {app,BrowserWindow,Menu,ipcMain,dialog}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const ENTRY=pathToFileURL(path.join(__dirname,'index.html')).href;
const smoke=process.argv.includes('--smoke-test');
app.commandLine.appendSwitch('lang','en-US');
app.setPath('userData',path.join(app.getPath('appData'),'tunnel-structural-resilience-en'));
if(smoke&&process.env.TUNNEL_SMOKE_DIR)app.setPath('userData',path.join(process.env.TUNNEL_SMOKE_DIR,'user-data'));
app.setName('Tunnel Structural Resilience Assessment');
let win;
if(!app.requestSingleInstanceLock()&&!smoke){app.quit();}else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
 app.whenReady().then(async()=>{
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:app.name,submenu:[{label:'About Tunnel Resilience',role:'about'}, {type:'separator'},{label:'Hide Tunnel Resilience',role:'hide'},{label:'Hide Others',role:'hideOthers'},{label:'Show All',role:'unhide'},{type:'separator'},{label:'Quit Tunnel Resilience',role:'quit'}]},{label:'Edit',submenu:[{label:'Undo',role:'undo'},{label:'Redo',role:'redo'},{type:'separator'},{label:'Cut',role:'cut'},{label:'Copy',role:'copy'},{label:'Paste',role:'paste'},{label:'Select All',role:'selectAll'}]},{label:'View',submenu:[{label:'Actual Size',role:'resetZoom'},{label:'Zoom In',role:'zoomIn'},{label:'Zoom Out',role:'zoomOut'},{type:'separator'},{label:'Toggle Full Screen',role:'togglefullscreen'}]},{label:'Window',submenu:[{label:'Minimise',role:'minimize'},{label:'Zoom',role:'zoom'}]}]));
  app.setAboutPanelOptions({applicationName:app.name,applicationVersion:'1.1.1',copyright:'Local offline computation'});
  win=new BrowserWindow({width:1600,height:1040,minWidth:1200,minHeight:760,show:false,title:app.name,backgroundColor:'#f2f5f4',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(e,url)=>{if(url!==ENTRY)e.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.webContents.session.setPermissionCheckHandler(()=>false);
  let errors=[];win.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
  win.webContents.on('render-process-gone',(_e,details)=>console.error('Renderer stopped:',details.reason));
  ipcMain.handle('save-file',async(event,payload)=>{
   if(event.sender!==win.webContents||event.senderFrame?.url!==ENTRY)return {error:'Unrecognised save request'};
   if(!payload||typeof payload.text!=='string'||Buffer.byteLength(payload.text,'utf8')>20e6)return {error:'Export content is invalid or too large'};
   if(typeof payload.name!=='string'||!/^.+\.(csv|json|svg|html)$/.test(payload.name)||/[\\/\x00-\x1f]/.test(payload.name))return {error:'Invalid file name'};
   const ext=path.extname(payload.name).slice(1),result=await dialog.showSaveDialog(win,{title:'Save Assessment Results',defaultPath:path.join(app.getPath('documents'),payload.name),filters:[{name:ext.toUpperCase()+'  file',extensions:[ext]}]});
   if(result.canceled||!result.filePath)return {saved:false};
   try{await fs.writeFile(result.filePath,payload.text,'utf8');return {saved:true};}catch(e){return {error:'Unable to save file: '+e.message};}
  });
  await win.loadFile(path.join(__dirname,'index.html'));
  if(smoke){
   const out=process.env.TUNNEL_SMOKE_DIR;
   if(out){
    await fs.mkdir(out,{recursive:true});
    dialog.showSaveDialog=async(_win,options)=>({canceled:false,filePath:path.join(out,path.basename(options.defaultPath))});
    await win.webContents.executeJavaScript(`(async()=>{
      setPreset('DS3 Duration Example',s=>s.durations[3][2]-=16.3);
      state.batch=TunnelExampleCases.map(x=>({...x}));computeBatch();
      await download('project-roundtrip.json',JSON.stringify(project(),null,2),'application/json');
      await exportBatch();
      await download('S06-report.html',reportHTML(),'text/html');
      const saved=project();importProject(saved);
      if(Math.abs(E.assess(state.input,state.schedule,state.horizon).Rs-.7052447631167872)>1e-12)throw Error('Baseline example changed');
      const custom=structuredClone(saved);
      custom.taskLibrary.push({id:'QA01',name:'Custom strengthening check',duration:7});
      custom.schedule.stages[3].push({name:'New repair stage check',taskIds:['QA01'],weight:20});
      custom.schedule.durations[3].push(7);custom.schedule.final[3]=.97;
      importProject(custom);
      const customRs=E.assess(state.input,state.schedule,state.horizon).Rs;
      await download('custom-project.json',JSON.stringify(project(),null,2),'application/json');
      await download('custom-report.html',reportHTML(),'text/html');
      importProject(JSON.parse(JSON.stringify(project())));
      if(Math.abs(E.assess(state.input,state.schedule,state.horizon).Rs-customRs)>1e-12)throw Error('Custom roundtrip changed result');
      if(!reportHTML().includes('Custom strengthening check'))throw Error('Custom task missing from report');
      const oldProject=structuredClone(saved);oldProject.version=1;delete oldProject.taskLibrary;delete oldProject.schedule.stages;delete oldProject.schedule.final;
      importProject(oldProject);
      importProject(saved);
      go('compare');
    })()`);
   }
   if(out){
    const localeQA=await win.webContents.executeJavaScript(`(async()=>{
      const checks=[];
      for(const page of ['assess','compare','batch','tasks']){
       go(page);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
       const text=document.body.innerText;
       if(/[\u4e00-\u9fff]/.test(text))throw Error('Untranslated visible text on '+page);
       if(document.body.scrollWidth>innerWidth+1)throw Error('Horizontal page overflow on '+page);
       checks.push({page,heading:document.querySelector('#page-'+page+' h1').innerText});
      }
      if(document.querySelectorAll('.nav').length!==4||document.querySelector('#page-about'))throw Error('Unexpected navigation');
      for(const id of ['task-dialog','stage-dialog']){
       document.getElementById(id).showModal();
       if(/[\u4e00-\u9fff]/.test(document.getElementById(id).innerText))throw Error('Untranslated dialog');
       document.getElementById(id).close();
      }
      if(/[\u4e00-\u9fff]/.test(reportHTML()))throw Error('Untranslated report');
      if(state.taskLibrary.some(t=>/[\u4e00-\u9fff]/.test(t.name)))throw Error('Untranslated task library');
      setPreset('Same as baseline',()=>{});go('assess');document.querySelector('#toast').className='';
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      return {language:document.documentElement.lang,navigation:checks,taskCount:state.taskLibrary.length,reportEnglish:true};
    })()`);
    await fs.writeFile(path.join(out,'localisation-check.json'),JSON.stringify(localeQA,null,2));
    for(const page of ['assess','compare','batch','tasks']){
     await win.webContents.executeJavaScript(`(async()=>{go('${page}');document.querySelector('#toast').className='';await new Promise(r=>setTimeout(r,300));})()`);
     await fs.writeFile(path.join(out,page+'.png'),(await win.webContents.capturePage()).toPNG());
    }
    await win.webContents.executeJavaScript(`(async()=>{go('compare');document.querySelector('.stage-editor').scrollIntoView();await new Promise(r=>setTimeout(r,300));})()`);
    await fs.writeFile(path.join(out,'stage-editor.png'),(await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`(async()=>{go('tasks');document.querySelector('#new-task').click();document.querySelector('#toast').className='';await new Promise(r=>setTimeout(r,300));})()`);
    await fs.writeFile(path.join(out,'add-task.png'),(await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`document.querySelector('#task-dialog').close();go('assess');`);
    win.setSize(1200,900);
    await win.webContents.executeJavaScript(`(async()=>{await new Promise(r=>setTimeout(r,300));if(document.body.scrollWidth>innerWidth+1)throw Error('Narrow window overflow');})()`);
    await fs.writeFile(path.join(out,'assess-narrow.png'),(await win.webContents.capturePage()).toPNG());
    win.setSize(1600,1040);
    await win.webContents.executeJavaScript(`(async()=>{go('assess');await new Promise(r=>setTimeout(r,300));})()`);
   }
   const check=await win.webContents.executeJavaScript(`({title:document.title,text:document.querySelector('#metrics').innerText,comparison:document.querySelector('#compare-metrics').innerText,chartCount:document.querySelectorAll('svg').length,desktopBridge:typeof window.desktop?.saveFile==='function',bodyWidth:document.body.scrollWidth,viewport:innerWidth})`);
   if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'native-smoke.json'),JSON.stringify({...check,errors,electron:process.versions.electron,arch:process.arch},null,2));const img=await win.webContents.capturePage();await fs.writeFile(path.join(out,'native-window.png'),img.toPNG());}
   console.log(JSON.stringify({...check,errors}));app.quit();
  }else{win.show();}
 });
 app.on('activate',()=>{if(win&&!win.isDestroyed()){win.show();win.focus();}});
 app.on('window-all-closed',()=>app.quit());
}
