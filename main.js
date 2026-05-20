'use strict';

// ─── Guard: require('electron') returns the npm package path in dev mode ──────
const _electron = require('electron');
if (typeof _electron !== 'object' || _electron === null || !_electron.app) {
  console.error(
    "מג'יק פרינט: לא רץ בתוך Electron.\n" +
    'הרץ npm run build ולאחר מכן התקן את ה-EXE מ-dist/\n' +
    'לבדיקה בדפדפן: node server.js ← http://localhost:3000'
  );
  process.exit(1);
}

const { app, BrowserWindow, shell, Tray, Menu, nativeImage, dialog } = _electron;
const path = require('path');

let mainWindow;
let tray;
let actualPort = 3000;

// ─── Single-instance lock ─────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit(); // another instance already running
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

async function startExpressServer() {
  const { startServer } = require('./server');
  const result = await startServer(3000);
  actualPort = result.port;
}

function createWindow() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: "מג'יק פרינט",
    icon: iconPath,
    backgroundColor: '#F4F2EC',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL(`http://localhost:${actualPort}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const menu = Menu.buildFromTemplate([
    { label: "מג'יק פרינט", enabled: false },
    { type: 'separator' },
    { label: 'פתח', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'יציאה', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip("מג'יק פרינט · מערכת ניהול בית דפוס");
  tray.setContextMenu(menu);
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

app.whenReady().then(async () => {
  try {
    await startExpressServer();
  } catch (err) {
    dialog.showErrorBox(
      "מג'יק פרינט — שגיאת הפעלה",
      `לא ניתן להפעיל את השרת הפנימי:\n${err.message}`
    );
    app.quit();
    return;
  }

  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Don't quit — stays in system tray
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  // Backup DB on every clean exit
  try { require('./server').doBackupSync(); } catch {}
});
