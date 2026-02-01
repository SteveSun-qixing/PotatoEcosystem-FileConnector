/**
 * Electron主进程入口
 * @module main
 */

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { createWindow } from './window';
import { setupIPC } from './ipc';

// 禁用硬件加速（可选，根据需要）
// app.disableHardwareAcceleration();

// 单例模式
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 如果用户尝试打开第二个实例，聚焦到现有窗口
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // 应用就绪时
  app.whenReady().then(() => {
    // 创建主窗口
    createWindow();

    // 设置IPC通信
    setupIPC();

    // macOS: 点击dock图标时重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

// 所有窗口关闭时退出应用（除了macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理未捕获的异常
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
