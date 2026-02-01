/**
 * 窗口管理
 * @module main/window
 */

import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
export function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: '薯片文件连接器',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 准备好后显示窗口
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 开发环境加载开发服务器，生产环境加载打包文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // 开发环境打开开发者工具
  if (is.dev) {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * 获取主窗口
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
