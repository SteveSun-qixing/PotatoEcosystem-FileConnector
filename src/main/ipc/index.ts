/**
 * IPC通信设置
 * @module main/ipc
 */

import { ipcMain, dialog, shell } from 'electron';
import { getMainWindow } from '../window';

/**
 * 设置IPC通信
 */
export function setupIPC(): void {
  // 文件选择对话框
  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const win = getMainWindow();
    if (!win) return { canceled: true, filePaths: [] };

    const result = await dialog.showOpenDialog(win, {
      title: options?.title || '选择文件',
      filters: options?.filters || [{ name: '所有文件', extensions: ['*'] }],
      properties: options?.properties || ['openFile', 'multiSelections']
    });

    return result;
  });

  // 文件夹选择对话框
  ipcMain.handle('dialog:openDirectory', async (_event, options) => {
    const win = getMainWindow();
    if (!win) return { canceled: true, filePaths: [] };

    const result = await dialog.showOpenDialog(win, {
      title: options?.title || '选择文件夹',
      properties: ['openDirectory']
    });

    return result;
  });

  // 保存对话框
  ipcMain.handle('dialog:saveFile', async (_event, options) => {
    const win = getMainWindow();
    if (!win) return { canceled: true, filePath: undefined };

    const result = await dialog.showSaveDialog(win, {
      title: options?.title || '保存文件',
      filters: options?.filters || [{ name: '所有文件', extensions: ['*'] }],
      defaultPath: options?.defaultPath
    });

    return result;
  });

  // 在文件管理器中显示文件
  ipcMain.handle('shell:showItemInFolder', async (_event, path) => {
    shell.showItemInFolder(path);
  });

  // 用默认程序打开文件
  ipcMain.handle('shell:openPath', async (_event, path) => {
    return shell.openPath(path);
  });

  // 获取应用信息
  ipcMain.handle('app:getInfo', async () => {
    const { app } = await import('electron');
    return {
      name: app.getName(),
      version: app.getVersion(),
      locale: app.getLocale(),
      path: {
        userData: app.getPath('userData'),
        temp: app.getPath('temp'),
        documents: app.getPath('documents')
      }
    };
  });
}
