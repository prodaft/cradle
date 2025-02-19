import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
});


contextBridge.exposeInMainWorld('electronUpdater', {
    onUpdateAvailable: (callback) => 
      ipcRenderer.on('update-available', (_, info) => callback(info)),
    onUpdateDownloaded: (callback) => 
      ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
    onUpdateError: (callback) => 
      ipcRenderer.on('update-error', (_, error) => callback(error))
  })
