const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',Object.freeze({saveFile:(payload)=>ipcRenderer.invoke('save-file',payload)}));
