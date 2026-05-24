'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');
const crypto = require('crypto');
const multer = require('multer');

// ─── DB path: AppData in Electron, __dirname in standalone Node ───────────────
function getDBPath() {
  try {
    const { app: eApp } = require('electron');
    if (eApp && typeof eApp.getPath === 'function') {
      const ud = eApp.getPath('userData');
      fs.mkdirSync(ud, { recursive: true });
      return path.join(ud, 'magic_print.db');
    }
  } catch {}
  return path.join(__dirname, 'magic_print.db');
}

// ─── SQLite init ──────────────────────────────────────────────────────────────
let db;

const DB_VERSION = '2'; // schema version — bump only when adding new tables/columns

function initDB() {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(getDBPath());

  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer TEXT NOT NULL DEFAULT '',
      contact TEXT DEFAULT '',
      product TEXT DEFAULT '',
      desc TEXT DEFAULT '',
      qty INTEGER DEFAULT 0,
      size TEXT DEFAULT '',
      paper TEXT DEFAULT '',
      colors TEXT DEFAULT '',
      finish TEXT DEFAULT '',
      price REAL DEFAULT 0,
      due TEXT DEFAULT '',
      received TEXT DEFAULT '',
      status TEXT DEFAULT 'awaiting',
      progress INTEGER DEFAULT 0,
      assignee TEXT DEFAULT '',
      printer TEXT DEFAULT '—',
      priority TEXT DEFAULT 'medium',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      city TEXT DEFAULT '',
      vat TEXT DEFAULT '',
      orders_count INTEGER DEFAULT 0,
      lifetime REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      tag TEXT DEFAULT '',
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'חשבונית מס',
      customer TEXT NOT NULL DEFAULT '',
      date TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      vat REAL DEFAULT 0,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      tax TEXT DEFAULT 'pending',
      allocation TEXT DEFAULT '—',
      method TEXT DEFAULT '—'
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      customer TEXT NOT NULL DEFAULT '',
      date TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      method TEXT DEFAULT '',
      invoice TEXT DEFAULT '',
      card TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      contact TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      city TEXT DEFAULT '',
      balance REAL DEFAULT 0,
      last TEXT DEFAULT '',
      payment TEXT DEFAULT '',
      rating INTEGER DEFAULT 3
    );

    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id TEXT PRIMARY KEY,
      supplier_id TEXT DEFAULT '',
      supplier TEXT DEFAULT '',
      inv_number TEXT DEFAULT '',
      date TEXT DEFAULT '',
      desc TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      vat REAL DEFAULT 0,
      total REAL DEFAULT 0,
      paid INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory (
      sku TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      size TEXT DEFAULT '',
      stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT '',
      min_stock INTEGER DEFAULT 0,
      supplier TEXT DEFAULT '',
      cost REAL DEFAULT 0,
      last TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      icon TEXT DEFAULT 'bell',
      color TEXT DEFAULT 'teal',
      title TEXT NOT NULL,
      text TEXT DEFAULT '',
      time TEXT DEFAULT '',
      read INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS credit_deposits (
      month TEXT PRIMARY KEY,
      deposited REAL DEFAULT 0
    );
  `);

  // Add attachments column if missing (safe migration)
  try { db.exec("ALTER TABLE orders ADD COLUMN attachments TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE invoices ADD COLUMN desc TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE invoices ADD COLUMN customerVat TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE receipts ADD COLUMN card_type TEXT DEFAULT ''"); } catch {}
  try { db.exec("CREATE TABLE IF NOT EXISTS bit_config (key TEXT PRIMARY KEY, value TEXT)"); } catch {}

  // Mark current schema version (no data wipe — safe migrations only via ALTER TABLE)
  db.prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('version',?)").run(DB_VERSION);

  // Seed default VAT rate (18% — current Israeli law) if not set
  db.prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('vat_rate','18')").run();

  // Seed default app password if not set
  db.prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('app_password','zxzx')").run();
}

// ─── Bit config helpers ────────────────────────────────────────────────────────
const getBitCfg = (k) => db?.prepare('SELECT value FROM bit_config WHERE key=?').get(k)?.value ?? null;
const setBitCfg = (k, v) => db?.prepare('INSERT OR REPLACE INTO bit_config VALUES (?,?)').run(k, String(v));

function makeBitHeaders(method, path, body = '') {
  const date = new Date().toUTCString();
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const digest = 'SHA-256=' + crypto.createHash('sha256').update(bodyStr).digest('base64');
  const sigInput = `(request-target): ${method.toLowerCase()} ${path}\ndate: ${date}\ndigest: ${digest}`;
  const privateKey = getBitCfg('private_key');
  if (!privateKey) return { Date: date, Digest: digest };
  try {
    const sig = crypto.sign('sha256', Buffer.from(sigInput), { key: privateKey, format: 'pem' }).toString('base64');
    return {
      Date: date,
      Digest: digest,
      Signature: `keyId="${getBitCfg('client_id')}",algorithm="rsa-sha256",headers="(request-target) date digest",signature="${sig}"`,
    };
  } catch { return { Date: date, Digest: digest }; }
}

async function pollBitTransactions() {
  const token = getBitCfg('access_token');
  const accountId = getBitCfg('account_id');
  if (!token || !accountId) return;
  try {
    const path = `/api/v1/accounts/${accountId}/transactions`;
    const data = await fetch(`https://open-banking.bitpay.co.il${path}`, {
      headers: { Authorization: `Bearer ${token}`, ...makeBitHeaders('GET', path) },
    }).then(r => r.json());
    const lastId = getBitCfg('bit_last_tx_id') || '';
    const newTxns = (data.transactions || []).filter(tx =>
      tx.creditDebitIndicator === 'CRDT' && tx.transactionId > lastId
    );
    for (const tx of newTxns) {
      db.prepare('INSERT INTO notifications (icon, color, title, text, time) VALUES (?,?,?,?,?)')
        .run('credit-card', 'teal', 'תשלום Bit התקבל',
          `₪${tx.transactionAmount?.amount} התקבל בחשבון Bit`, 'עכשיו');
    }
    if (newTxns.length) setBitCfg('bit_last_tx_id', newTxns.at(-1).transactionId);
  } catch (e) { console.error('[Bit] poll error:', e.message); }
}

// ─── Real Windows printers via PowerShell ─────────────────────────────────────
const VIRTUAL_PORT_RE   = /^(nul:|portprompt:|ne0x:|xpsport:|shrfax:)/i;
const VIRTUAL_DRIVER_RE = /print to pdf|onenote|xps document writer|fax driver|microsoft (print|note)/i;

function getWindowsPrinters() {
  try {
    // WMI: accurate PrinterStatus (numeric), Default, Shared, PortName
    const raw = execSync(
      'powershell -NoProfile -NonInteractive -Command "Get-WmiObject Win32_Printer | Select-Object Name,PrinterStatus,DriverName,PortName,Default,Shared | ConvertTo-Json -Compress"',
      { timeout: 8000, windowsHide: true }
    ).toString().trim();

    if (!raw || raw === 'null') return [];
    let list = JSON.parse(raw);
    if (!Array.isArray(list)) list = [list];

    // Get-Printer has live JobCount (current queue size)
    const queueMap = {};
    try {
      const qraw = execSync(
        'powershell -NoProfile -NonInteractive -Command "Get-Printer | Select-Object Name,JobCount | ConvertTo-Json -Compress"',
        { timeout: 5000, windowsHide: true }
      ).toString().trim();
      let ql = JSON.parse(qraw);
      if (!Array.isArray(ql)) ql = [ql];
      ql.forEach(p => { queueMap[p.Name] = p.JobCount || 0; });
    } catch {}

    // WMI PrinterStatus: 1=Other, 2=Unknown, 3=Idle, 4=Printing, 5=Warmup, 6=Stopped, 7=Offline
    const stateOf = (n) => {
      if (n === 4 || n === 5) return 'printing';
      if (n === 7)             return 'offline';
      if (n === 6 || n === 1)  return 'error';
      return 'idle';
    };

    return list.map((p, i) => {
      const port      = p.PortName   || '';
      const driver    = p.DriverName || p.Name || '';
      const isVirtual = VIRTUAL_PORT_RE.test(port) || VIRTUAL_DRIVER_RE.test(driver);
      const isNetwork = /^ip_|tcp/i.test(port) || /^\d+\.\d+\.\d+\.\d+/.test(port);
      const status    = typeof p.PrinterStatus === 'number' ? p.PrinterStatus : parseInt(p.PrinterStatus) || 3;
      const state     = stateOf(status);
      const portLabel = /^PORTPROMPT:/i.test(port) ? 'PDF (בחירת נתיב)'
                      : /^nul:/i.test(port)         ? 'NUL (וירטואלי)'
                      : port || '—';

      return {
        id:        `WIN-${i + 1}`,
        name:      p.Name  || `מדפסת ${i + 1}`,
        model:     driver,
        port,
        portLabel,
        state,
        isVirtual,
        isNetwork,
        isDefault: !!p.Default,
        isShared:  !!p.Shared,
        queue:     queueMap[p.Name] || 0,
        errorMsg:  state === 'error'   ? 'שגיאת מדפסת — בדוק מצב בהגדרות Windows' :
                   state === 'offline' ? 'המדפסת מנותקת או כבויה' : '',
      };
    });
  } catch {
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Safe ID generators: use MAX(existing) so deletions never cause collisions
function nextOrderId() {
  const year = new Date().getFullYear();
  const pfx  = `PRN-${year}-`;
  const row  = db.prepare("SELECT id FROM orders WHERE id LIKE ? ORDER BY id DESC LIMIT 1").get(pfx + '%');
  const last = row ? (parseInt(row.id.slice(pfx.length)) || 0) : 0;
  return `${pfx}${String(last + 1).padStart(4, '0')}`;
}

function nextCustomerId() {
  const row  = db.prepare("SELECT id FROM customers ORDER BY id DESC LIMIT 1").get();
  const last = row ? (parseInt(row.id.replace('C-', '')) || 999) : 999;
  return `C-${last + 1}`;
}

function nextSupplierId() {
  const row  = db.prepare("SELECT id FROM suppliers ORDER BY id DESC LIMIT 1").get();
  const last = row ? (parseInt(row.id.replace('S-', '')) || 999) : 999;
  return `S-${last + 1}`;
}

function nextSupplierInvId() {
  const year = new Date().getFullYear();
  const pfx  = `SI-${year}-`;
  const row  = db.prepare("SELECT id FROM supplier_invoices WHERE id LIKE ? ORDER BY id DESC LIMIT 1").get(pfx + '%');
  const last = row ? (parseInt(row.id.slice(pfx.length)) || 0) : 0;
  return `${pfx}${String(last + 1).padStart(4, '0')}`;
}

function nextReceiptId() {
  const year = new Date().getFullYear();
  const pfx  = `R-${year}-`;
  const row  = db.prepare("SELECT id FROM receipts WHERE id LIKE ? ORDER BY id DESC LIMIT 1").get(pfx + '%');
  const last = row ? (parseInt(row.id.slice(pfx.length)) || 0) : 0;
  return `${pfx}${String(last + 1).padStart(4, '0')}`;
}

function nextInvoiceId() {
  const year = new Date().getFullYear();
  const pfx  = `${year}-`;
  const row  = db.prepare("SELECT id FROM invoices WHERE id LIKE ? ORDER BY id DESC LIMIT 1").get(pfx + '%');
  const last = row ? (parseInt(row.id.slice(pfx.length)) || 0) : 0;
  return `${pfx}${String(last + 1).padStart(4, '0')}`;
}

function nextInvSku() {
  const row  = db.prepare("SELECT sku FROM inventory ORDER BY sku DESC LIMIT 1").get();
  const last = row ? (parseInt(row.sku.replace('INV-', '')) || 0) : 0;
  return `INV-${String(last + 1).padStart(4, '0')}`;
}

function todayHE() {
  return new Date().toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'2-digit' }).replace(/\//g,'.');
}

// ─── Multer file upload storage ──────────────────────────────────────────────
let uploadsDir = path.join(__dirname, 'uploads'); // fallback for dev mode
function getUploadsDir() {
  try {
    const { app: eApp } = require('electron');
    if (eApp && typeof eApp.getPath === 'function') {
      const ud = eApp.getPath('userData');
      uploadsDir = path.join(ud, 'uploads');
    }
  } catch {}
  fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

// ─── Backup ───────────────────────────────────────────────────────────────────
function pad2(n) { return String(n).padStart(2, '0'); }

function getBackupsDir() {
  // Check for user-configured override path (NAS / network share)
  try {
    const override = db?.prepare("SELECT value FROM meta WHERE key='backup_path_override'").get()?.value;
    if (override?.trim()) return override.trim();
  } catch {}
  try {
    const { app: eApp } = require('electron');
    if (eApp && typeof eApp.getPath === 'function')
      return path.join(eApp.getPath('userData'), 'backups');
  } catch {}
  return path.join(__dirname, 'backups');
}

function getLocalIPs() {
  const nets = require('os').networkInterfaces();
  return Object.values(nets).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
}

function doBackup() {
  if (!db) throw new Error('DB not initialized');
  const backDir = getBackupsDir();
  fs.mkdirSync(backDir, { recursive: true });

  const now   = new Date();
  const stamp = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}_${pad2(now.getHours())}-${pad2(now.getMinutes())}`;
  const dest  = path.join(backDir, `backup_${stamp}.db`);

  // VACUUM INTO — safe SQLite backup, works even while DB is open
  const safeDest = dest.replace(/\\/g, '/').replace(/'/g, "''");
  db.exec(`VACUUM INTO '${safeDest}'`);

  // Keep only the 14 most recent backups
  const files = fs.readdirSync(backDir)
    .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
    .sort().reverse();
  files.slice(14).forEach(f => { try { fs.unlinkSync(path.join(backDir, f)); } catch {} });

  db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES ('last_backup',?)").run(now.toISOString());
  return { file: dest, time: now.toISOString(), kept: Math.min(files.length + 1, 14) };
}

function autoBackup() {
  try {
    const row  = db.prepare("SELECT value FROM meta WHERE key='last_backup'").get();
    const last = row ? new Date(row.value) : null;
    if (!last || (Date.now() - last.getTime()) > 23 * 3600 * 1000)
      doBackup();
  } catch (e) {
    console.error('Auto-backup failed:', e.message);
  }
}

// ─── Dynamic port: try startPort … startPort+9 ───────────────────────────────
function tryListen(server, startPort, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const attempt = (port) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && port < startPort + 9) {
          attempt(port + 1);
        } else {
          reject(err);
        }
      });
      server.listen(port, host, () => resolve(port));
    };
    attempt(startPort);
  });
}

// ─── Express app ──────────────────────────────────────────────────────────────
let _actualPort = 3000;
let _actualHost = '127.0.0.1';

function startServer(preferredPort) {
  return new Promise((resolve, reject) => {
    try {
      initDB();
      autoBackup(); // daily backup on startup
    } catch (err) {
      reject(new Error(`DB init failed: ${err.message}`));
      return;
    }

    const lanMode  = db.prepare("SELECT value FROM meta WHERE key='lan_mode'").get()?.value === 'true';
    const bindHost = lanMode ? '0.0.0.0' : '127.0.0.1';

    const app = express();
    app.use(express.json());
    app.use(express.static(__dirname));

    // ── Setup multer with uploads dir ────────────────────────────────────────
    const upload = multer({ dest: getUploadsDir() });

    // ── GET /api/data — all collections in one shot ──────────────────────────
    app.get('/api/data', (req, res) => {
      try {
        const orders    = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
        const customers = db.prepare('SELECT * FROM customers ORDER BY name').all()
          .map(c => ({ ...c, orders: c.orders_count }));
        const invoices  = db.prepare('SELECT * FROM invoices ORDER BY id DESC').all();
        const receipts  = db.prepare('SELECT * FROM receipts ORDER BY id DESC').all();
        const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
        const supplierInvoices = db.prepare('SELECT * FROM supplier_invoices ORDER BY date DESC, id DESC').all();
        const inventory = db.prepare('SELECT * FROM inventory ORDER BY category, name').all()
          .map(i => ({ ...i, min: i.min_stock }));
        const hidden    = JSON.parse(db.prepare("SELECT value FROM meta WHERE key='hidden_printers'").get()?.value || '[]');
        const printers  = getWindowsPrinters().filter(p => !hidden.includes(p.name));
        const notifications = db.prepare('SELECT * FROM notifications ORDER BY id DESC').all();
        const vatRow    = db.prepare("SELECT value FROM meta WHERE key='vat_rate'").get();
        const VAT_RATE  = parseInt(vatRow?.value || '18');

        res.json({ ORDERS: orders, CUSTOMERS: customers, INVOICES: invoices,
                   RECEIPTS: receipts, SUPPLIERS: suppliers, SUPPLIER_INVOICES: supplierInvoices,
                   INVENTORY: inventory, PRINTERS: printers, NOTIFICATIONS: notifications, VAT_RATE });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/orders/next-id ──────────────────────────────────────────────
    app.get('/api/orders/next-id', (req, res) => {
      try {
        res.json({ id: nextOrderId() });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/printers/details — full WMI detail per printer ─────────────
    app.get('/api/printers/details', (req, res) => {
      try {
        const raw = execSync(
          'powershell -NoProfile -NonInteractive -Command "Get-WmiObject Win32_Printer | Select-Object Name,PrinterStatus,DriverName,PortName,Default,Shared,EnableBIDI,HorizontalResolution,VerticalResolution,JobCountSinceLastReset,DetectedErrorState,ExtendedPrinterStatus,PrinterPaperNames,CapabilityDescriptions | ConvertTo-Json -Compress"',
          { timeout: 10000, windowsHide: true }
        ).toString().trim();

        let list = JSON.parse(raw || '[]');
        if (!Array.isArray(list)) list = [list];

        const XEROX_APP = 'C:\\Program Files (x86)\\Xerox\\Easy Printer Manager\\Xerox.Application.exe';
        const hasXeroxApp = fs.existsSync(XEROX_APP);

        const result = list.map((p) => {
          const port   = p.PortName   || '';
          const driver = p.DriverName || p.Name || '';
          const isVirtual = VIRTUAL_PORT_RE.test(port) || VIRTUAL_DRIVER_RE.test(driver);
          const nameLow   = (p.Name || '').toLowerCase();
          const drvLow    = driver.toLowerCase();

          let managerApp = null;
          if (!isVirtual) {
            if ((nameLow.includes('xerox') || drvLow.includes('xerox') || nameLow.includes('phaser') || nameLow.includes('workcentre')) && hasXeroxApp)
              managerApp = { label: 'Xerox Easy Printer Manager', path: XEROX_APP };
          }

          // Deduplicate paper names
          const papers = [...new Set(Array.isArray(p.PrinterPaperNames) ? p.PrinterPaperNames : [])].filter(Boolean);
          const caps   = Array.isArray(p.CapabilityDescriptions) ? p.CapabilityDescriptions : [];

          return {
            name:           p.Name || '',
            resolution:     p.HorizontalResolution ? `${p.HorizontalResolution}×${p.VerticalResolution} dpi` : null,
            capabilities:   caps,
            paperSizes:     papers.slice(0, 12),
            enableBIDI:     !!p.EnableBIDI,
            jobsSinceReset: p.JobCountSinceLastReset || 0,
            errorState:     p.DetectedErrorState || 0,
            extStatus:      p.ExtendedPrinterStatus || 0,
            managerApp,
          };
        });

        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/printers/open — open brand manager or Windows settings ──────
    app.post('/api/printers/open', (req, res) => {
      try {
        const name = String(req.body?.name || '').toLowerCase();
        const XEROX_APP = 'C:\\Program Files (x86)\\Xerox\\Easy Printer Manager\\Xerox.Application.exe';

        if ((name.includes('xerox') || name.includes('phaser') || name.includes('workcentre')) && fs.existsSync(XEROX_APP)) {
          execSync(`"${XEROX_APP}"`, { timeout: 4000, windowsHide: false });
        } else {
          execSync('powershell -NoProfile -NonInteractive -Command "Start-Process \'ms-settings:printers\'"',
                   { timeout: 4000, windowsHide: true });
        }
        res.json({ success: true });
      } catch {
        res.json({ success: false });
      }
    });

    // ── POST /api/printers/windows-settings — always open Windows settings ───
    app.post('/api/printers/windows-settings', (req, res) => {
      try {
        execSync('powershell -NoProfile -NonInteractive -Command "Start-Process \'ms-settings:printers\'"',
                 { timeout: 4000, windowsHide: true });
        res.json({ success: true });
      } catch {
        res.json({ success: false });
      }
    });

    // ── POST /api/uploads ────────────────────────────────────────────────────
    app.post('/api/uploads', upload.single('file'), (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: 'no file' });
        res.json({ name: req.file.originalname, stored: req.file.filename });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/auth/login — verify app password ──────────────────────────
    app.post('/api/auth/login', (req, res) => {
      try {
        const { password } = req.body || {};
        const row = db.prepare("SELECT value FROM meta WHERE key='app_password'").get();
        const stored = row?.value || 'zxzx';
        res.json({ ok: String(password) === stored });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── PUT /api/auth/password — change app password ─────────────────────────
    app.put('/api/auth/password', (req, res) => {
      try {
        const { current, newPassword } = req.body || {};
        const row = db.prepare("SELECT value FROM meta WHERE key='app_password'").get();
        const stored = row?.value || 'zxzx';
        if (String(current) !== stored)
          return res.status(403).json({ error: 'סיסמה נוכחית שגויה' });
        if (!newPassword || String(newPassword).length < 2)
          return res.status(400).json({ error: 'סיסמה קצרה מדי (מינ׳ 2 תווים)' });
        db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES ('app_password',?)").run(String(newPassword));
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/settings ────────────────────────────────────────────────────
    app.get('/api/settings', (req, res) => {
      try {
        const g = (k, d='') => db.prepare("SELECT value FROM meta WHERE key=?").get(k)?.value ?? d;
        const hasSecret = !!g('ita_client_secret');
        res.json({
          vat_rate:          parseInt(g('vat_rate','18')),
          business_name:     g('business_name', "מג'יק פרינט"),
          business_owner:    g('business_owner', 'אלי אליאס'),
          business_vat:      g('business_vat'),
          business_phone:    g('business_phone'),
          business_email:    g('business_email'),
          business_address:  g('business_address'),
          accountant_email:  g('accountant_email'),
          ita_client_id:     g('ita_client_id'),
          ita_client_secret: hasSecret ? '***' : '',
          ita_vat_number:    g('ita_vat_number'),
          ita_env:           g('ita_env','sandbox'),
          ita_configured:    !!(g('ita_client_id') && hasSecret && g('ita_vat_number')),
          hidden_printers:   JSON.parse(g('hidden_printers','[]')),
          auto_update_check: g('auto_update_check','true'),
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── PUT /api/settings ────────────────────────────────────────────────────
    app.put('/api/settings', (req, res) => {
      try {
        const set = (k, v) => { if (v != null && v !== '***') db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)").run(k, String(v)); };
        const { vat_rate, business_name, business_owner, business_vat,
                business_phone, business_email, business_address, accountant_email,
                ita_client_id, ita_client_secret, ita_vat_number, ita_env,
                hidden_printers, auto_update_check } = req.body;
        if (vat_rate != null) { const r = parseInt(vat_rate); if (!isNaN(r) && r>=1 && r<=99) set('vat_rate', r); }
        set('business_name',     business_name);
        set('business_owner',    business_owner);
        set('business_vat',      business_vat);
        set('business_phone',    business_phone);
        set('business_email',    business_email);
        set('business_address',  business_address);
        set('accountant_email',  accountant_email);
        set('ita_client_id',     ita_client_id);
        set('ita_client_secret', ita_client_secret);
        set('ita_vat_number',    ita_vat_number);
        set('ita_env',           ita_env);
        set('auto_update_check', auto_update_check);
        if (hidden_printers != null) set('hidden_printers', JSON.stringify(hidden_printers));
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/backup/status ────────────────────────────────────────────────
    app.get('/api/backup/status', (req, res) => {
      try {
        const backDir = getBackupsDir();
        const lastRow = db.prepare("SELECT value FROM meta WHERE key='last_backup'").get();
        let files = [];
        try {
          files = fs.readdirSync(backDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
            .sort().reverse()
            .map(f => {
              const stat = fs.statSync(path.join(backDir, f));
              return { name: f, sizeMB: +(stat.size / 1048576).toFixed(1), mtime: stat.mtime.toISOString() };
            });
        } catch {}
        res.json({ lastBackup: lastRow?.value || null, count: files.length, dir: backDir, files });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ── POST /api/backup/now ──────────────────────────────────────────────────
    app.post('/api/backup/now', (req, res) => {
      try {
        const result = doBackup();
        res.json({ ok: true, ...result });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ── POST /api/backup/open-folder ─────────────────────────────────────────
    app.post('/api/backup/open-folder', (req, res) => {
      try {
        const backDir = getBackupsDir();
        fs.mkdirSync(backDir, { recursive: true });
        execSync(`explorer "${backDir}"`, { timeout: 4000, windowsHide: true });
        res.json({ ok: true });
      } catch { res.json({ ok: false }); }
    });

    // ── POST /api/backup/set-path ─────────────────────────────────────────────
    app.post('/api/backup/set-path', (req, res) => {
      try {
        const { path: targetPath } = req.body;
        if (!targetPath?.trim()) {
          // Clear override — revert to default
          db.prepare("DELETE FROM meta WHERE key='backup_path_override'").run();
          return res.json({ ok: true, cleared: true });
        }
        fs.mkdirSync(targetPath.trim(), { recursive: true });
        // Test write access
        const testFile = path.join(targetPath.trim(), '.write_test');
        fs.writeFileSync(testFile, 'ok');
        fs.unlinkSync(testFile);
        db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES ('backup_path_override',?)").run(targetPath.trim());
        res.json({ ok: true });
      } catch (err) {
        res.status(400).json({ error: `נתיב לא נגיש: ${err.message}` });
      }
    });

    // ── POST /api/backup/restore ──────────────────────────────────────────────
    app.post('/api/backup/restore', async (req, res) => {
      try {
        let filePath = req.body?.filePath;
        // In Electron: open file picker dialog
        if (!filePath) {
          try {
            const { dialog } = require('electron');
            const result = await dialog.showOpenDialog({
              title: 'בחר קובץ גיבוי לשחזור',
              filters: [{ name: 'SQLite DB', extensions: ['db'] }],
              properties: ['openFile'],
            });
            if (result.canceled || !result.filePaths[0])
              return res.json({ canceled: true });
            filePath = result.filePaths[0];
          } catch {
            return res.status(400).json({ error: 'לא רץ בתוך Electron — ציין filePath בגוף הבקשה' });
          }
        }
        if (!fs.existsSync(filePath))
          return res.status(400).json({ error: 'קובץ לא נמצא' });

        // Close DB, copy backup over current DB, re-init
        const dbPath = getDBPath();
        db.close();
        db = null;
        fs.copyFileSync(filePath, dbPath);
        initDB();
        res.json({ ok: true, restored: filePath });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/printers/all — unfiltered list (for management UI) ───────────
    app.get('/api/printers/all', (req, res) => {
      try {
        res.json(getWindowsPrinters());
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/network-info ─────────────────────────────────────────────────
    app.get('/api/network-info', (req, res) => {
      try {
        const lanSaved  = db.prepare("SELECT value FROM meta WHERE key='lan_mode'").get()?.value === 'true';
        const lanActive = _actualHost === '0.0.0.0'; // actually listening on all interfaces
        res.json({ lanMode: lanSaved, lanActive, localIPs: getLocalIPs(), port: _actualPort });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/lan/enable ──────────────────────────────────────────────────
    app.post('/api/lan/enable', (req, res) => {
      try {
        db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES ('lan_mode','true')").run();
        // Try to open Windows Firewall — non-fatal
        try {
          execSync(
            `netsh advfirewall firewall add rule name="MagicPrint LAN" dir=in action=allow protocol=TCP localport=${_actualPort}`,
            { timeout: 5000, windowsHide: true }
          );
        } catch {}
        res.json({ ok: true, needsRestart: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/lan/disable ─────────────────────────────────────────────────
    app.post('/api/lan/disable', (req, res) => {
      try {
        db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES ('lan_mode','false')").run();
        try {
          execSync(
            'netsh advfirewall firewall delete rule name="MagicPrint LAN"',
            { timeout: 5000, windowsHide: true }
          );
        } catch {}
        res.json({ ok: true, needsRestart: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/credit-deposits ──────────────────────────────────────────────
    app.get('/api/credit-deposits', (req, res) => {
      try {
        res.json(db.prepare('SELECT * FROM credit_deposits ORDER BY month DESC').all());
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── PUT /api/credit-deposits ──────────────────────────────────────────────
    app.put('/api/credit-deposits', (req, res) => {
      try {
        const { month, deposited } = req.body;
        if (!month || !/^\d{4}-\d{2}$/.test(month))
          return res.status(400).json({ error: 'month must be YYYY-MM' });
        db.prepare('INSERT OR REPLACE INTO credit_deposits (month, deposited) VALUES (?, ?)')
          .run(month, parseFloat(deposited) || 0);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/update/check — compare with GitHub latest release ───────────
    app.get('/api/update/check', async (req, res) => {
      try {
        const pkg = require('./package.json');
        const currentVersion = pkg.version;
        const r = await fetch('https://api.github.com/repos/5645hm-a11y/-/releases/latest', {
          headers: { 'User-Agent': 'magic-print-app', 'Accept': 'application/vnd.github.v3+json' },
        });
        if (r.status === 404) return res.json({ noReleases: true, currentVersion, latestVersion: currentVersion, isNewer: false });
        if (!r.ok) throw new Error(`GitHub API responded ${r.status}`);
        const data = await r.json();
        const latestVersion = (data.tag_name || '0.0.0').replace(/^v/, '');

        function cmpVer(a, b) {
          const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
          for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const d = (pa[i]||0) - (pb[i]||0);
            if (d !== 0) return d;
          }
          return 0;
        }

        const isNewer = cmpVer(latestVersion, currentVersion) > 0;
        const asset   = (data.assets || []).find(a => /\.exe$/i.test(a.name));
        res.json({
          currentVersion,
          latestVersion,
          isNewer,
          releaseName:  data.name || data.tag_name || '',
          releaseNotes: (data.body || '').slice(0, 2000),
          downloadUrl:  asset?.browser_download_url || null,
          assetName:    asset?.name || null,
          publishedAt:  data.published_at || '',
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/update/install — download asset and launch installer ────────
    app.post('/api/update/install', async (req, res) => {
      try {
        const { downloadUrl, assetName } = req.body;
        if (!downloadUrl || !assetName) return res.status(400).json({ error: 'missing downloadUrl or assetName' });
        const tmpPath = path.join(require('os').tmpdir(), assetName);
        const dl = await fetch(downloadUrl, { headers: { 'User-Agent': 'magic-print-app' } });
        if (!dl.ok) throw new Error(`הורדה נכשלה: ${dl.status}`);
        const buf = Buffer.from(await dl.arrayBuffer());
        fs.writeFileSync(tmpPath, buf);
        // Launch installer detached so it survives this process exiting
        const { spawn } = require('child_process');
        const child = spawn(tmpPath, [], { detached: true, stdio: 'ignore', windowsHide: false });
        child.unref();
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── ITA helpers ───────────────────────────────────────────────────────────
    const getMeta = (k, d='') => db.prepare("SELECT value FROM meta WHERE key=?").get(k)?.value ?? d;

    const ITA_URLS = {
      sandbox:    { token: 'https://openapi.taxes.gov.il/shaam/tsandbox/longtimetoken/oauth2/token', api: 'https://openapi.taxes.gov.il/shaam/tsandbox/itc/v1/authorizedDraftDocument' },
      production: { token: 'https://openapi.taxes.gov.il/shaam/longtimetoken/oauth2/token',          api: 'https://openapi.taxes.gov.il/shaam/itc/v1/authorizedDraftDocument' },
    };

    // Invoice type mapping per Israeli tax law
    const ITA_TYPE_MAP = {
      'חשבונית מס':         300,
      'חשבונית מס קבלה':    305,
      'חשבונית עסקה':       320,
    };

    async function itaGetToken() {
      const id  = getMeta('ita_client_id');
      const sec = getMeta('ita_client_secret');
      const env = getMeta('ita_env','sandbox');
      if (!id || !sec) throw new Error('אישורי API לא מוגדרים');
      const r = await fetch(ITA_URLS[env]?.token || ITA_URLS.sandbox.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type:'client_credentials', client_id:id, client_secret:sec }),
      });
      if (!r.ok) { const t = await r.text(); throw new Error(`שגיאת טוקן ${r.status}: ${t.slice(0,200)}`); }
      return (await r.json()).access_token;
    }

    async function itaAllocate(inv) {
      const vatNumber  = getMeta('ita_vat_number');
      const env        = getMeta('ita_env','sandbox');
      if (!vatNumber) throw new Error('מספר עוסק מורשה לא מוגדר');
      const token      = await itaGetToken();
      const today      = new Date();
      const dd         = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
      const invoiceType = ITA_TYPE_MAP[inv.type] || 300;
      const r = await fetch(ITA_URLS[env]?.api || ITA_URLS.sandbox.api, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceType, vatId: vatNumber,
          documentId: inv.id, reportingDate: dd, referenceDate: dd,
          sumAmountBeforeVat: inv.amount, vatAmount: inv.vat, totalVatIncluded: inv.total,
          action: 1,
        }),
      });
      const text = await r.text();
      let data; try { data = JSON.parse(text); } catch { data = {}; }
      if (!r.ok) throw new Error(`שגיאת הקצאה ${r.status}: ${text.slice(0,300)}`);
      const num = data.allocationNumber || data.AllocationNumber || data.confirmationNumber || data.referenceNumber;
      if (!num) throw new Error(`לא התקבל מספר הקצאה: ${text.slice(0,200)}`);
      return { allocationNumber: num, responseMs: 0 };
    }

    // ── GET /api/ita/status ───────────────────────────────────────────────────
    app.get('/api/ita/status', async (req, res) => {
      const configured = !!(getMeta('ita_client_id') && getMeta('ita_client_secret') && getMeta('ita_vat_number'));
      if (!configured) return res.json({ connected: false, configured: false, message: 'לא מוגדר' });
      try {
        const t0 = Date.now();
        await itaGetToken();
        const ms = Date.now() - t0;
        res.json({ connected: true, configured: true, responseMs: ms, env: getMeta('ita_env','sandbox'), message: `מחובר · ${ms}ms` });
      } catch (err) {
        res.json({ connected: false, configured: true, message: err.message.slice(0,200) });
      }
    });

    // ── POST /api/ita/allocate ────────────────────────────────────────────────
    app.post('/api/ita/allocate', async (req, res) => {
      try {
        const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(req.body.invoiceId);
        if (!inv) return res.status(404).json({ error: 'חשבונית לא נמצאה' });
        const t0 = Date.now();
        const { allocationNumber } = await itaAllocate(inv);
        db.prepare("UPDATE invoices SET allocation=?, tax='allocated' WHERE id=?").run(allocationNumber, inv.id);
        res.json({ success: true, allocationNumber, responseMs: Date.now()-t0 });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/update/open-github ─────────────────────────────────────────
    app.post('/api/update/open-github', (req, res) => {
      try {
        execSync('powershell -NonInteractive -Command "Start-Process \'https://github.com/5645hm-a11y/-/releases\'"', { timeout: 3000, windowsHide: true });
        res.json({ success: true });
      } catch { res.json({ success: false }); }
    });

    // ── POST /api/ita/open-portal ─────────────────────────────────────────────
    app.post('/api/ita/open-portal', (req, res) => {
      try {
        execSync('powershell -NonInteractive -Command "Start-Process \'https://openapi-portal.taxes.gov.il/shaam/production/\'"', { timeout: 3000, windowsHide: true });
        res.json({ success: true });
      } catch { res.json({ success: false }); }
    });

    // ── POST /api/orders ─────────────────────────────────────────────────────
    app.post('/api/orders', (req, res) => {
      try {
        const d = req.body;
        const id = nextOrderId();
        const received = todayHE();
        db.prepare(`
          INSERT INTO orders (id, customer, product, desc, qty, price, due, received, status, priority, notes, assignee, printer)
          VALUES (:id, :customer, :product, :desc, :qty, :price, :due, :received, :status, :priority, :notes, :assignee, :printer)
        `).run({
          id,
          customer:  d.customerName  || '',
          product:   d.product       || 'הזמנת עבודה',
          desc:      d.notes         || '',
          qty:       0,
          price:     parseFloat(d.price) || 0,
          due:       d.due           || '',
          received,
          status:    d.asDraft ? 'pending' : 'awaiting',
          priority:  d.priority      || 'medium',
          notes:     d.notes         || '',
          assignee:  '',
          printer:   '—',
        });

        if (d.customerName) {
          db.prepare(`UPDATE customers SET orders_count = orders_count + 1,
            lifetime = lifetime + :price WHERE name = :name`)
            .run({ price: parseFloat(d.price) || 0, name: d.customerName });
        }

        res.json({ success: true, id });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── DELETE /api/orders/:id ──────────────────────────────────────────────
    app.delete('/api/orders/:id', (req, res) => {
      try {
        db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── PUT /api/orders/:id ──────────────────────────────────────────────────
    app.put('/api/orders/:id', (req, res) => {
      try {
        const { status, progress, assignee, printer, priority, notes, due, price } = req.body;
        db.prepare(`UPDATE orders SET
          status   = COALESCE(:status,   status),
          progress = COALESCE(:progress, progress),
          assignee = COALESCE(:assignee, assignee),
          printer  = COALESCE(:printer,  printer),
          priority = COALESCE(:priority, priority),
          notes    = COALESCE(:notes,    notes),
          due      = COALESCE(:due,      due),
          price    = COALESCE(:price,    price)
          WHERE id = :id`)
          .run({
            status:   status   ?? null,
            progress: progress ?? null,
            assignee: assignee ?? null,
            printer:  printer  ?? null,
            priority: priority ?? null,
            notes:    notes    ?? null,
            due:      due      ?? null,
            price:    price != null ? parseFloat(price) : null,
            id: req.params.id,
          });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/customers ──────────────────────────────────────────────────
    app.post('/api/customers', (req, res) => {
      try {
        const d = req.body;
        const id = nextCustomerId();
        db.prepare(`INSERT INTO customers (id, name, contact, phone, email, city, vat)
          VALUES (:id, :name, :contact, :phone, :email, :city, :vat)`)
          .run({ id, name: d.name||'', contact: d.name||'', phone: d.phone||'',
                 email: d.email||'', city: d.city||'', vat: d.vat||'' });
        res.json({ success: true, id });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/suppliers ───────────────────────────────────────────────────
    app.post('/api/suppliers', (req, res) => {
      try {
        const d = req.body;
        const id = nextSupplierId();
        db.prepare(`INSERT INTO suppliers (id,name,category,contact,phone,email,city,payment,rating)
          VALUES (:id,:name,:category,:contact,:phone,:email,:city,:payment,:rating)`)
          .run({ id, name:d.name||'', category:d.category||'', contact:d.contact||'',
                 phone:d.phone||'', email:d.email||'', city:d.city||'',
                 payment:d.payment||'שוטף+30', rating:d.rating||3 });
        res.json({ success:true, id });
      } catch(err) { res.status(500).json({ error:err.message }); }
    });

    // ── PUT /api/suppliers/:id ────────────────────────────────────────────────
    app.put('/api/suppliers/:id', (req, res) => {
      try {
        const d = req.body;
        db.prepare(`UPDATE suppliers SET
          name=COALESCE(:name,name), category=COALESCE(:category,category),
          contact=COALESCE(:contact,contact), phone=COALESCE(:phone,phone),
          email=COALESCE(:email,email), city=COALESCE(:city,city),
          payment=COALESCE(:payment,payment), rating=COALESCE(:rating,rating)
          WHERE id=:id`)
          .run({ name:d.name??null, category:d.category??null, contact:d.contact??null,
                 phone:d.phone??null, email:d.email??null, city:d.city??null,
                 payment:d.payment??null, rating:d.rating??null, id:req.params.id });
        res.json({ success:true });
      } catch(err) { res.status(500).json({ error:err.message }); }
    });

    // ── DELETE /api/suppliers/:id ─────────────────────────────────────────────
    app.delete('/api/suppliers/:id', (req, res) => {
      try {
        db.prepare('DELETE FROM suppliers WHERE id=?').run(req.params.id);
        res.json({ success:true });
      } catch(err) { res.status(500).json({ error:err.message }); }
    });

    // ── POST /api/supplier-invoices ───────────────────────────────────────────
    app.post('/api/supplier-invoices', (req, res) => {
      try {
        const d = req.body;
        const id = nextSupplierInvId();
        const vatRate = parseInt(getMeta('vat_rate','18')) / 100;
        const amount = parseFloat(d.amount) || 0;
        const vat    = d.vat_included
          ? parseFloat((amount - amount / (1 + vatRate)).toFixed(2))
          : parseFloat((amount * vatRate).toFixed(2));
        const total  = d.vat_included ? amount : parseFloat((amount + vat).toFixed(2));
        const base   = d.vat_included ? parseFloat((amount / (1 + vatRate)).toFixed(2)) : amount;
        db.prepare(`INSERT INTO supplier_invoices
          (id,supplier_id,supplier,inv_number,date,desc,amount,vat,total,paid)
          VALUES (:id,:supplier_id,:supplier,:inv_number,:date,:desc,:amount,:vat,:total,:paid)`)
          .run({ id, supplier_id:d.supplier_id||'', supplier:d.supplier||'',
                 inv_number:d.inv_number||'', date:d.date||todayHE(),
                 desc:d.desc||'', amount:base, vat, total, paid:0 });
        // Update supplier balance
        if (d.supplier_id) {
          db.prepare('UPDATE suppliers SET balance=balance-:total WHERE id=:id')
            .run({ total, id:d.supplier_id });
        }
        res.json({ success:true, id });
      } catch(err) { res.status(500).json({ error:err.message }); }
    });

    // ── PUT /api/supplier-invoices/:id ────────────────────────────────────────
    app.put('/api/supplier-invoices/:id', (req, res) => {
      try {
        const { paid } = req.body;
        const inv = db.prepare('SELECT * FROM supplier_invoices WHERE id=?').get(req.params.id);
        if (!inv) return res.status(404).json({ error:'not found' });
        db.prepare('UPDATE supplier_invoices SET paid=? WHERE id=?').run(paid ? 1 : 0, req.params.id);
        // Adjust supplier balance
        if (inv.supplier_id) {
          const delta = paid ? inv.total : -inv.total;
          db.prepare('UPDATE suppliers SET balance=balance+:d WHERE id=:id')
            .run({ d:delta, id:inv.supplier_id });
        }
        res.json({ success:true });
      } catch(err) { res.status(500).json({ error:err.message }); }
    });

    // ── DELETE /api/supplier-invoices/:id ─────────────────────────────────────
    app.delete('/api/supplier-invoices/:id', (req, res) => {
      try {
        const inv = db.prepare('SELECT * FROM supplier_invoices WHERE id=?').get(req.params.id);
        if (inv && inv.supplier_id) {
          // Always reverse the balance: unpaid = restore the debt, paid = reverse the payment
          const delta = inv.paid ? -inv.total : inv.total;
          db.prepare('UPDATE suppliers SET balance=balance+:d WHERE id=:id')
            .run({ d: delta, id: inv.supplier_id });
        }
        db.prepare('DELETE FROM supplier_invoices WHERE id=?').run(req.params.id);
        res.json({ success:true });
      } catch(err) { res.status(500).json({ error:err.message }); }
    });

    // ── PUT /api/customers/:id ────────────────────────────────────────────────
    app.put('/api/customers/:id', (req, res) => {
      try {
        const d = req.body;
        db.prepare(`UPDATE customers SET
          name=COALESCE(:name,name), contact=COALESCE(:contact,contact),
          phone=COALESCE(:phone,phone), email=COALESCE(:email,email),
          city=COALESCE(:city,city), vat=COALESCE(:vat,vat), tag=COALESCE(:tag,tag)
          WHERE id=:id`)
          .run({ name:d.name??null, contact:d.contact??null, phone:d.phone??null,
                 email:d.email??null, city:d.city??null, vat:d.vat??null, tag:d.tag??null,
                 id: req.params.id });
        res.json({ success: true });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ── DELETE /api/customers/:id ──────────────────────────────────────────────
    app.delete('/api/customers/:id', (req, res) => {
      try {
        db.prepare('DELETE FROM customers WHERE id=?').run(req.params.id);
        res.json({ success: true });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ── POST /api/invoices ───────────────────────────────────────────────────
    app.post('/api/invoices', async (req, res) => {
      try {
        const d = req.body;
        const id = nextInvoiceId();
        const vatRate = parseInt(getMeta('vat_rate','18')) / 100;
        const amount  = parseFloat(d.amount) || 0;
        const vat     = parseFloat((amount * vatRate).toFixed(2));
        const total   = parseFloat((amount + vat).toFixed(2));
        db.prepare(`INSERT INTO invoices (id, type, customer, customerVat, "desc", date, amount, vat, total, status, tax, allocation, method)
          VALUES (:id,:type,:customer,:customerVat,:desc,:date,:amount,:vat,:total,:status,:tax,:allocation,:method)`)
          .run({ id, type: d.type||'חשבונית מס', customer: d.customer||'',
                 customerVat: d.customerVat||'', desc: d.desc||'',
                 date: todayHE(), amount, vat, total, status: 'open', tax: 'pending', allocation: '', method: d.method||'—' });

        // Auto-request ITA allocation number
        let allocationNumber = null; let responseMs = null;
        try {
          const t0 = Date.now();
          const result = await itaAllocate({ id, amount, vat, total });
          allocationNumber = result.allocationNumber;
          responseMs = Date.now() - t0;
          db.prepare("UPDATE invoices SET allocation=?, tax='allocated' WHERE id=?").run(allocationNumber, id);
        } catch (itaErr) {
          console.log('[ITA] allocation skipped:', itaErr.message);
        }

        res.json({ success: true, id, allocationNumber, responseMs });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── PUT /api/invoices/:id ─────────────────────────────────────────────────
    app.put('/api/invoices/:id', (req, res) => {
      try {
        const { status, method } = req.body;
        db.prepare('UPDATE invoices SET status=COALESCE(:status,status), method=COALESCE(:method,method) WHERE id=:id')
          .run({ status: status??null, method: method??null, id: req.params.id });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/receipts ───────────────────────────────────────────────────
    app.post('/api/receipts', (req, res) => {
      try {
        const d = req.body;
        const id = nextReceiptId();
        db.prepare(`INSERT INTO receipts (id, customer, date, amount, method, invoice, card, card_type)
          VALUES (:id, :customer, :date, :amount, :method, :invoice, :card, :card_type)`)
          .run({ id, customer: d.customer||'', date: todayHE(),
                 amount: parseFloat(d.amount)||0, method: d.method||'',
                 invoice: d.invoice||'', card: d.card||'', card_type: d.card_type||'' });
        if (d.invoice) {
          db.prepare('UPDATE invoices SET status=:status WHERE id=:id')
            .run({ status: 'paid', id: d.invoice });
        }
        res.json({ success: true, id });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/inventory ──────────────────────────────────────────────────
    app.post('/api/inventory', (req, res) => {
      try {
        const d = req.body;
        const sku = (d.sku || '').trim() || nextInvSku();
        db.prepare(`INSERT INTO inventory (sku,name,category,size,stock,unit,min_stock,supplier,cost,last)
          VALUES (:sku,:name,:category,:size,:stock,:unit,:min_stock,:supplier,:cost,:last)`)
          .run({ sku, name: d.name||'', category: d.category||'', size: d.size||'',
                 stock: parseInt(d.stock)||0, unit: d.unit||"יח'",
                 min_stock: parseInt(d.min_stock)||0, supplier: d.supplier||'',
                 cost: parseFloat(d.cost)||0, last: todayHE() });
        res.json({ success: true, sku });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ── PUT /api/inventory/:sku ──────────────────────────────────────────────
    app.put('/api/inventory/:sku', (req, res) => {
      try {
        const d = req.body;
        db.prepare(`UPDATE inventory SET
          name=COALESCE(:name,name), category=COALESCE(:category,category),
          size=COALESCE(:size,size), stock=COALESCE(:stock,stock),
          unit=COALESCE(:unit,unit), min_stock=COALESCE(:min_stock,min_stock),
          supplier=COALESCE(:supplier,supplier), cost=COALESCE(:cost,cost),
          last=COALESCE(:last,last) WHERE sku=:sku`)
          .run({
            name:      d.name      ?? null,
            category:  d.category  ?? null,
            size:      d.size      ?? null,
            stock:     d.stock     != null ? parseInt(d.stock)     : null,
            unit:      d.unit      ?? null,
            min_stock: d.min_stock != null ? parseInt(d.min_stock) : null,
            supplier:  d.supplier  ?? null,
            cost:      d.cost      != null ? parseFloat(d.cost)    : null,
            last:      d.last      ?? null,
            sku: req.params.sku,
          });
        res.json({ success: true });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ── DELETE /api/inventory/:sku ───────────────────────────────────────────
    app.delete('/api/inventory/:sku', (req, res) => {
      try {
        db.prepare('DELETE FROM inventory WHERE sku=?').run(req.params.sku);
        res.json({ success: true });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ── POST /api/notifications ──────────────────────────────────────────────
    app.post('/api/notifications', (req, res) => {
      try {
        const d = req.body;
        db.prepare('INSERT INTO notifications (icon, color, title, text, time) VALUES (:icon, :color, :title, :text, :time)')
          .run({ icon: d.icon||'bell', color: d.color||'teal',
                 title: d.title||'', text: d.text||'', time: d.time||'עכשיו' });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Bit payment notifications ─────────────────────────────────────────────
    app.get('/api/bit/status', (req, res) => {
      try {
        const connected = !!getBitCfg('access_token') && !!getBitCfg('account_id');
        res.json({ connected, account_id: getBitCfg('account_id') || null });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post('/api/bit/config', (req, res) => {
      try {
        const { client_id, client_secret } = req.body || {};
        if (client_id != null) setBitCfg('client_id', client_id);
        if (client_secret != null) setBitCfg('client_secret', client_secret);
        res.json({ ok: true });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.get('/api/bit/auth', (req, res) => {
      try {
        const clientId = getBitCfg('client_id');
        if (!clientId) return res.status(400).send('הגדר Client ID תחילה בהגדרות');
        const verifier = crypto.randomBytes(32).toString('base64url');
        const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
        setBitCfg('pkce_verifier', verifier);
        const url = new URL('https://www.bitpay.co.il/app/open-banking');
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('redirect_uri', `http://localhost:${_actualPort}/api/bit/callback`);
        url.searchParams.set('code_challenge', challenge);
        url.searchParams.set('code_challenge_method', 'S256');
        url.searchParams.set('scope', 'AIS');
        res.redirect(url.toString());
      } catch (err) { res.status(500).send(`שגיאה: ${err.message}`); }
    });

    app.get('/api/bit/callback', async (req, res) => {
      try {
        const { code, error } = req.query;
        if (error || !code) return res.send(`<p style="font-family:sans-serif;direction:rtl">שגיאת אישור: ${error || 'לא התקבל קוד'}</p>`);
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `http://localhost:${_actualPort}/api/bit/callback`,
          code_verifier: getBitCfg('pkce_verifier') || '',
          client_id: getBitCfg('client_id') || '',
          client_secret: getBitCfg('client_secret') || '',
        }).toString();
        const tokenRes = await fetch('https://open-banking.bitpay.co.il/api/v1/oauth/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        const tokens = await tokenRes.json();
        if (!tokens.access_token) return res.send(`<p style="font-family:sans-serif;direction:rtl">שגיאה: ${JSON.stringify(tokens)}</p>`);
        setBitCfg('access_token', tokens.access_token);
        if (tokens.refresh_token) setBitCfg('refresh_token', tokens.refresh_token);
        // Fetch account ID
        const accountPath = '/api/v1/accounts';
        const accountRes = await fetch(`https://open-banking.bitpay.co.il${accountPath}`, {
          headers: { Authorization: `Bearer ${tokens.access_token}`, ...makeBitHeaders('GET', accountPath) },
        });
        const accountData = await accountRes.json();
        const accountId = accountData.accounts?.[0]?.accountId || accountData.accounts?.[0]?.account_id;
        if (accountId) setBitCfg('account_id', accountId);
        res.send('<html dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>✓ חיבור Bit הושלם!</h2><p>ניתן לסגור חלון זה.</p><script>setTimeout(()=>window.close(),2000)</script></body></html>');
      } catch (err) { res.status(500).send(`<p style="font-family:sans-serif;direction:rtl">שגיאה: ${err.message}</p>`); }
    });

    app.post('/api/bit/poll', async (req, res) => {
      try { await pollBitTransactions(); res.json({ ok: true }); }
      catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post('/api/bit/disconnect', (req, res) => {
      try {
        ['access_token', 'refresh_token', 'account_id', 'pkce_verifier', 'bit_last_tx_id']
          .forEach(k => { try { db.prepare('DELETE FROM bit_config WHERE key=?').run(k); } catch {} });
        res.json({ ok: true });
      } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // ── SPA fallback ─────────────────────────────────────────────────────────
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/') && !req.path.includes('.')) {
        res.sendFile(path.join(__dirname, 'index.html'));
      } else {
        res.status(404).end();
      }
    });

    const srv = http.createServer(app);
    tryListen(srv, preferredPort, bindHost)
      .then(port => {
        _actualPort = port;
        _actualHost = bindHost;
        console.log(`\nמג'יק פרינט · שרת פועל על http://localhost:${port}\n`);
        setInterval(pollBitTransactions, 5 * 60 * 1000);
        pollBitTransactions();
        resolve({ server: srv, port, lanMode, localIPs: getLocalIPs() });
      })
      .catch(reject);
  });
}

module.exports = {
  startServer,
  doBackupSync: () => { try { doBackup(); } catch (e) { console.error('Shutdown backup failed:', e.message); } },
};

// Allow running standalone: node server.js
if (require.main === module) {
  startServer(3000).then(({ port }) => {
    console.log(`פתח http://localhost:${port} בדפדפן`);
  }).catch(err => {
    console.error('שגיאה:', err.message);
    process.exit(1);
  });
}
