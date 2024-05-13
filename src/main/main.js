import { app, BrowserWindow} from 'electron'
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';



let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    }
});

  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    // mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    mainWindow.loadURL(`file://${path.join(__dirname, '../renderer/index.html')}`)
    // mainWindow.loadURL("https://www.google.com")
  }

  mainWindow.setMenuBarVisibility(false);

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
