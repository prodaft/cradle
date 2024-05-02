const { app, BrowserWindow } = require('electron');
const path = require('path');

const rendererDirectory = path.join(__dirname, '..', 'renderer');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({});
  // mainWindow.loadURL('http://localhost:5173');
  mainWindow.loadFile(path.join(rendererDirectory, 'index.html'));
  mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow == null) {
    createWindow();
  }
});
