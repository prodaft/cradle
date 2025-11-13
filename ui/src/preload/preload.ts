import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

interface ElectronAPI {
    openFile: () => Promise<unknown>;
}

interface ElectronUpdater {
    onUpdateAvailable: (callback: (info: unknown) => void) => void;
    onUpdateDownloaded: (callback: (info: unknown) => void) => void;
    onUpdateError: (callback: (error: unknown) => void) => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
} as ElectronAPI);

contextBridge.exposeInMainWorld('electronUpdater', {
    onUpdateAvailable: (callback: (info: unknown) => void) =>
        ipcRenderer.on('update-available', (_: IpcRendererEvent, info: unknown) => callback(info)),
    onUpdateDownloaded: (callback: (info: unknown) => void) =>
        ipcRenderer.on('update-downloaded', (_: IpcRendererEvent, info: unknown) => callback(info)),
    onUpdateError: (callback: (error: unknown) => void) =>
        ipcRenderer.on('update-error', (_: IpcRendererEvent, error: unknown) => callback(error)),
} as ElectronUpdater);

// Declare global types for window
declare global {
    interface Window {
        electronAPI: ElectronAPI;
        electronUpdater: ElectronUpdater;
    }
}
