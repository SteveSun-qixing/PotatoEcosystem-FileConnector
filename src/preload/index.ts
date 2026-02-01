/**
 * 预加载脚本
 * @module preload
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * 暴露给渲染进程的API
 */
const api = {
  // 对话框
  dialog: {
    openFile: (options?: OpenDialogOptions) => 
      ipcRenderer.invoke('dialog:openFile', options),
    openDirectory: (options?: OpenDialogOptions) => 
      ipcRenderer.invoke('dialog:openDirectory', options),
    saveFile: (options?: SaveDialogOptions) => 
      ipcRenderer.invoke('dialog:saveFile', options)
  },

  // Shell操作
  shell: {
    showItemInFolder: (path: string) => 
      ipcRenderer.invoke('shell:showItemInFolder', path),
    openPath: (path: string) => 
      ipcRenderer.invoke('shell:openPath', path)
  },

  // 应用信息
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo')
  },

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => 
      callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  // 发送事件
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args);
  }
};

// 类型定义
interface OpenDialogOptions {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: ('openFile' | 'openDirectory' | 'multiSelections')[];
}

interface SaveDialogOptions {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  defaultPath?: string;
}

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', api);

// 类型声明
declare global {
  interface Window {
    electronAPI: typeof api;
  }
}
