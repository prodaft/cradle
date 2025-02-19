import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater'
const isDevelopment = process.env.NODE_ENV === 'development';

let mainWindow;

// __dirname points to /out
var image = nativeImage.createFromPath(
    path.join(__dirname, '../../src/renderer/src/assets/logo-nobg.png'),
);


function createWindow() {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        },
        icon: image,
    });

    if (isDevelopment) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadURL(`file://${path.join(__dirname, '../renderer/index.html')}`);
    }

    mainWindow.setMenuBarVisibility(false);

    mainWindow.on('closed', () => (mainWindow = null));

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates
  autoUpdater.checkForUpdates()

  // Set up update events
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info)
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-error', err)
  })
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
