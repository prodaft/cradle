import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';

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
