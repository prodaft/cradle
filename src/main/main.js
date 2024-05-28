import { app, BrowserWindow} from 'electron'
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';



let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    }
});

  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, '../renderer/index.html')}`)
  }

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  // eslint-disable-next-line no-undef
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow == null) {
    createWindow();
  }
});
