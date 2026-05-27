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
let lanMode    = false;
let localIPs   = [];

// ─── Single-instance lock ─────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit(); // another instance already running
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else if (!mainWindow) {
      // Window was destroyed (e.g. after a cancelled/failed update); recreate it
      createWindow();
    }
  });
}

async function startExpressServer() {
  const { startServer } = require('./server');
  const result = await startServer(3000);
  actualPort = result.port;
  lanMode    = result.lanMode  || false;
  localIPs   = result.localIPs || [];
}

function updateTrayTooltip() {
  if (!tray) return;
  tray.setToolTip(lanMode && localIPs[0]
    ? `מג'יק פרינט · LAN פעיל · ${localIPs[0]}:${actualPort}`
    : "מג'יק פרינט · מערכת ניהול בית דפוס");
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

  // Nullify reference when the window is actually destroyed
  // so isDestroyed() checks on mainWindow are not needed everywhere
  mainWindow.on('closed', () => {
    mainWindow = null;
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
    { label: 'פתח', click: () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'יציאה', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } });
  updateTrayTooltip();
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  } else if (!mainWindow) {
    // Recreate the window if it was destroyed (e.g. after a cancelled/failed update)
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  // Backup DB on every clean exit
  try { require('./server').doBackupSync(); } catch {}
});
