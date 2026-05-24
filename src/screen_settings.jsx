// Settings screen — business info, VAT, ITA, auto-update

// ── shared field helpers ──────────────────────────────────────────────────────
const SLabel = ({ children }) => (
  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
    {children}
  </label>
);
const SInput = ({ value, onChange, placeholder, type = 'text', readOnly }) => (
  <input
    type={type} value={value || ''} onChange={onChange} placeholder={placeholder}
    readOnly={readOnly}
    style={{
      width: '100%', boxSizing: 'border-box', padding: '9px 11px',
      border: '1px solid var(--border)', borderRadius: 8, fontSize: 14,
      fontFamily: "'Heebo',sans-serif", direction: 'rtl',
      background: readOnly ? 'var(--bg-deep)' : 'var(--bg-card)',
      color: 'var(--text)',
    }}
  />
);
const SSection = ({ title, subtitle, children }) => (
  <div className="card" style={{ marginBottom: 18 }}>
    <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
    </div>
    <div style={{ padding: '18px 20px' }}>{children}</div>
  </div>
);
const SaveBar = ({ saving, saved, onSave, dirty }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
    {saved && <span style={{ fontSize: 13, color: 'var(--success)', alignSelf: 'center' }}>✓ נשמר בהצלחה</span>}
    <button className="btn teal" onClick={onSave} disabled={saving || !dirty}>
      {saving ? '...' : 'שמור שינויים'}
    </button>
  </div>
);

// ── LAN tab ───────────────────────────────────────────────────────────────────
const LanTab = () => {
  const [info,    setInfo]    = React.useState(null);
  const [busy,    setBusy]    = React.useState(false);
  const [msg,     setMsg]     = React.useState(null);
  const qrRef = React.useRef(null);
  const qrInstance = React.useRef(null);

  const load = () =>
    fetch('/api/network-info').then(r => r.json()).then(setInfo).catch(() => {});

  React.useEffect(() => { load(); }, []);

  // Build QR code when LAN is actually active and div is mounted
  React.useEffect(() => {
    if (!info?.lanActive || !info?.localIPs?.[0]) return;
    const qrUrl = `http://${info.localIPs[0]}:${info.port || 3000}`;
    // Use a small timeout to ensure the conditional div has rendered
    const t = setTimeout(() => {
      if (!qrRef.current) return;
      try {
        if (qrInstance.current) { qrInstance.current.clear(); qrInstance.current.makeCode(qrUrl); }
        else { qrInstance.current = new QRCode(qrRef.current, { text: qrUrl, width: 160, height: 160, colorDark: '#181C1B' }); }
      } catch {}
    }, 50);
    return () => clearTimeout(t);
  }, [info]);

  const toggle = async (enable) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(enable ? '/api/lan/enable' : '/api/lan/disable', { method: 'POST' });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMsg({ ok: true, text: 'השינוי יכנס לתוקף לאחר הפעלה מחדש של האפליקציה' });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
  };

  // lanActive = server is actually listening on 0.0.0.0 (after restart)
  // lanMode   = setting is saved in DB (takes effect after restart)
  const lanActive = info?.lanActive;
  const lanSaved  = info?.lanMode;
  const url = lanActive && info?.localIPs?.[0]
    ? `http://${info.localIPs[0]}:${info.port || 3000}` : null;

  // Show restart-pending state when saved=true but not yet active
  const pendingRestart = lanSaved && !lanActive;

  return (
    <>
      <SSection title="גישה מרשת LAN" subtitle="אפשר למחשבים אחרים בבית הדפוס להתחבר דרך דפדפן">

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>

            {/* Status banner */}
            <div style={{
              padding: '14px 18px', borderRadius: 12, marginBottom: 14,
              background: lanActive ? 'var(--teal-soft)' : pendingRestart ? 'var(--warn-soft)' : 'var(--bg-deep)',
              border: `1px solid ${lanActive ? 'var(--teal)' : pendingRestart ? 'var(--warn)' : 'var(--border)'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6,
                color: lanActive ? 'var(--teal-3)' : pendingRestart ? 'var(--warn)' : 'var(--text)' }}>
                {info === null ? 'טוען...'
                  : lanActive       ? '✓ LAN פעיל — מחשבים ברשת יכולים להתחבר'
                  : pendingRestart  ? '⏳ LAN מוגדר — יכנס לתוקף לאחר הפעלה מחדש'
                  :                   'LAN כבוי — רק מחשב זה יכול לגשת'}
              </div>
              {lanActive && url && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  כתובת גישה: <b style={{ fontFamily: 'monospace', color: 'var(--teal-3)' }}>{url}</b>
                </div>
              )}
              {lanActive && info?.localIPs?.length > 1 && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  כתובות IP נוספות: {info.localIPs.slice(1).map(ip => (
                    <span key={ip} style={{ fontFamily: 'monospace', marginInlineStart: 6 }}>{ip}</span>
                  ))}
                </div>
              )}
              {pendingRestart && (
                <div style={{ fontSize: 13, color: 'var(--warn)', marginTop: 4 }}>
                  סגור ופתח מחדש את האפליקציה כדי שהשינוי יכנס לתוקף
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {!lanSaved ? (
                <button className="btn teal" onClick={() => toggle(true)} disabled={busy}>
                  <Icon name="refresh" size={14} /> הפעל LAN
                </button>
              ) : (
                <button className="btn ghost" onClick={() => toggle(false)} disabled={busy}>
                  <Icon name="x" size={14} /> כבה LAN
                </button>
              )}
            </div>

            {msg && (
              <div style={{
                padding: '10px 14px', borderRadius: 9, fontSize: 13, marginBottom: 10,
                background: msg.ok ? 'var(--warn-soft)' : 'var(--danger-soft)',
                color:      msg.ok ? 'var(--warn)'      : 'var(--danger)',
              }}>
                {msg.ok ? '⚠ ' : '✗ '}{msg.text}
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
              <b>הוראות חיבור:</b><br />
              1. הפעל LAN וסגור/פתח את האפליקציה מחדש<br />
              2. מחשבים אחרים ברשת — פתח דפדפן → {url
                ? <b style={{ fontFamily: 'monospace' }}>{url}</b>
                : <span style={{ fontFamily: 'monospace' }}>http://IP:3000</span>}<br />
              3. סרוק את ה-QR code מכל מכשיר ברשת
            </div>
          </div>

          {/* QR code — only when LAN is actually active */}
          {lanActive && url && (
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>סרוק לגישה מהירה</div>
              <div ref={qrRef} style={{ background: '#fff', padding: 8, borderRadius: 10, display: 'inline-block' }} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>{url}</div>
            </div>
          )}
        </div>
      </SSection>
    </>
  );
};

// ── Backup tab ────────────────────────────────────────────────────────────────
const BackupTab = () => {
  const [status,  setStatus]  = React.useState(null);
  const [busy,    setBusy]    = React.useState(false);
  const [msg,     setMsg]     = React.useState(null); // { ok, text }

  const load = () =>
    fetch('/api/backup/status').then(r => r.json()).then(setStatus).catch(() => {});

  React.useEffect(() => { load(); }, []);

  const backupNow = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/backup/now', { method: 'POST' });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMsg({ ok: true, text: 'גיבוי בוצע בהצלחה' });
      load();
    } catch (e) {
      setMsg({ ok: false, text: `שגיאה: ${e.message}` });
    }
    setBusy(false);
  };

  const openFolder = () =>
    fetch('/api/backup/open-folder', { method: 'POST' }).catch(() => {});

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const h    = Math.floor(diff / 3600000);
    if (h < 1)  return 'לפני פחות משעה';
    if (h < 24) return `לפני ${h} שעות`;
    const days = Math.floor(h / 24);
    return `לפני ${days} ימים · ${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <>
      <SSection title="גיבוי אוטומטי" subtitle="מסד הנתונים מגובה אוטומטית — בפתיחת האפליקציה ובסגירתה">

        {/* Status banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', background: 'var(--bg-deep)', borderRadius: 12, marginBottom: 20,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11, flexShrink: 0,
            background: status?.count > 0 ? 'var(--success-soft)' : 'var(--warn-soft)',
            display: 'grid', placeItems: 'center',
            color: status?.count > 0 ? 'var(--success)' : 'var(--warn)',
          }}>
            <Icon name={status?.count > 0 ? 'check-circle' : 'warning'} size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
              {status
                ? (status.count > 0 ? `${status.count} גיבויים שמורים` : 'אין גיבויים עדיין')
                : 'טוען...'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              גיבוי אחרון: <b>{fmtDate(status?.lastBackup)}</b>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn ghost" onClick={openFolder} title="פתח תיקיית גיבויים">
              <Icon name="eye" size={14} /> תיקייה
            </button>
            <button className="btn teal" onClick={backupNow} disabled={busy}>
              <Icon name={busy ? 'clock' : 'box'} size={14} />
              {busy ? 'מגבה...' : 'גבה עכשיו'}
            </button>
          </div>
        </div>

        {msg && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 9, fontSize: 13,
            background: msg.ok ? 'var(--success-soft)' : 'var(--danger-soft)',
            color:      msg.ok ? 'var(--success)'      : 'var(--danger)',
          }}>
            {msg.ok ? '✓ ' : '✗ '}{msg.text}
          </div>
        )}

        {/* Policy info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { icon: 'refresh', label: 'בפתיחה',    val: 'כל יום אוטומטי' },
            { icon: 'x',      label: 'בסגירה',     val: 'כל יציאה תקינה' },
            { icon: 'box',    label: 'שמירה',       val: '14 גיבויים אחרונים' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg-deep)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <Icon name={item.icon} size={18} style={{ color: 'var(--teal)', marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{item.val}</div>
            </div>
          ))}
        </div>

        {/* Files list */}
        {status?.files?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>קבצי גיבוי:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {status.files.map((f, i) => (
                <div key={f.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: i === 0 ? 'var(--teal-soft)' : 'var(--bg-deep)',
                  borderRadius: 8, fontSize: 12,
                }}>
                  <Icon name="box" size={13} style={{ color: i === 0 ? 'var(--teal)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="mono" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{f.sizeMB} MB</span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{new Date(f.mtime).toLocaleDateString('he-IL')}</span>
                  {i === 0 && <span style={{ background: 'var(--teal)', color: '#fff', borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>אחרון</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Path info */}
        {status?.dir && (
          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            <Icon name="info" size={12} /> תיקיית גיבויים: <span className="mono">{status.dir}</span>
          </div>
        )}
      </SSection>

      <SSection title="נתיב גיבוי מותאם" subtitle="שמור גיבויים ישירות ל-NAS, כונן רשת או תיקייה חיצונית">
        <BackupPathForm />
      </SSection>

      <SSection title="שחזור מגיבוי" subtitle="טען מסד נתונים ישן לשחזור נתונים — האפליקציה תאתחל מחדש">
        <RestoreBackupForm />
      </SSection>
    </>
  );
};

const BackupPathForm = () => {
  const [pathVal, setPathVal] = React.useState('');
  const [busy,    setBusy]    = React.useState(false);
  const [msg,     setMsg]     = React.useState(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/backup/set-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathVal }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMsg({ ok: true, text: pathVal.trim() ? 'נתיב הגיבוי עודכן' : 'חזרנו לנתיב ברירת המחדל' });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <SInput value={pathVal} onChange={e => setPathVal(e.target.value)}
          placeholder='\\\\NAS\\share\\backups  (ריק = נתיב ברירת מחדל)' />
        <button className="btn teal" onClick={save} disabled={busy} style={{ flexShrink: 0 }}>
          {busy ? '...' : 'שמור נתיב'}
        </button>
      </div>
      {msg && (
        <div style={{ fontSize: 12, color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>
          {msg.ok ? '✓ ' : '✗ '}{msg.text}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
        השאר ריק כדי להשתמש בנתיב ברירת המחדל (AppData של Windows)
      </div>
    </div>
  );
};

const RestoreBackupForm = () => {
  const [busy, setBusy] = React.useState(false);
  const [msg,  setMsg]  = React.useState(null);

  const restore = async () => {
    if (!window.confirm('האם אתה בטוח? שחזור יחליף את כל הנתונים הנוכחיים!')) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/backup/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await r.json();
      if (d.canceled) { setBusy(false); return; }
      if (d.error) throw new Error(d.error);
      setMsg({ ok: true, text: 'שחזור הושלם בהצלחה — טוען נתונים מחדש...' });
      setTimeout(() => window.refreshData(), 1500);
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
        padding: '12px 16px', background: 'var(--danger-soft)', borderRadius: 10, fontSize: 13, color: '#8E3939' }}>
        <Icon name="warning" size={18} />
        <span>שחזור ידרוס את כל הנתונים הקיימים. בצע גיבוי לפני כן!</span>
      </div>
      <button className="btn" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
        onClick={restore} disabled={busy}>
        <Icon name="box" size={14} /> {busy ? 'משחזר...' : 'שחזר מגיבוי...'}
      </button>
      {msg && (
        <div style={{ marginTop: 10, fontSize: 13, color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>
          {msg.ok ? '✓ ' : '✗ '}{msg.text}
        </div>
      )}
    </div>
  );
};

// ── Change Password sub-form ──────────────────────────────────────────────────
const ChangePasswordForm = () => {
  const [current, setCurrent] = React.useState('');
  const [newPw,   setNewPw]   = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [status,  setStatus]  = React.useState(null);
  const [errMsg,  setErrMsg]  = React.useState('');
  const [busy,    setBusy]    = React.useState(false);

  const pwInp = {
    padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8,
    fontSize: 14, fontFamily: "'Heebo',sans-serif", direction: 'rtl',
    background: 'var(--bg-card)', color: 'var(--text)',
    width: '100%', boxSizing: 'border-box',
  };

  const save = async () => {
    if (newPw !== confirm) { setStatus('error'); setErrMsg('הסיסמאות החדשות אינן תואמות'); return; }
    if (newPw.length < 2) { setStatus('error'); setErrMsg('סיסמה חדשה קצרה מדי (מינ׳ 2 תווים)'); return; }
    setBusy(true);
    setStatus(null);
    try {
      const r = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, newPassword: newPw }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setStatus('ok');
      setCurrent(''); setNewPw(''); setConfirm('');
      setTimeout(() => setStatus(null), 4000);
    } catch (e) {
      setStatus('error');
      setErrMsg(e.message || 'שגיאה בעדכון הסיסמה');
    }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 380 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <SLabel>סיסמה נוכחית</SLabel>
          <input type="password" value={current} style={pwInp}
            onChange={e => { setCurrent(e.target.value); setStatus(null); }}
            placeholder="הסיסמה שבשימוש כעת" />
        </div>
        <div>
          <SLabel>סיסמה חדשה</SLabel>
          <input type="password" value={newPw} style={pwInp}
            onChange={e => { setNewPw(e.target.value); setStatus(null); }}
            placeholder="לפחות 2 תווים" />
        </div>
        <div>
          <SLabel>אימות סיסמה חדשה</SLabel>
          <input type="password" value={confirm} style={pwInp}
            onChange={e => { setConfirm(e.target.value); setStatus(null); }}
            placeholder="הקלד שוב את הסיסמה החדשה" />
        </div>
        {status === 'error' && (
          <div style={{ fontSize: 12, color: 'var(--danger)' }}>{errMsg}</div>
        )}
        {status === 'ok' && (
          <div style={{ fontSize: 12, color: 'var(--success)' }}>✓ הסיסמה עודכנה בהצלחה</div>
        )}
        <button className="btn teal" onClick={save}
          disabled={busy || !current || !newPw || !confirm}
          style={{ alignSelf: 'flex-start', padding: '9px 22px' }}>
          {busy ? '...' : 'עדכן סיסמה'}
        </button>
      </div>
    </div>
  );
};

// ── Tab ids ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'business', label: 'פרטי העסק',          icon: 'building'     },
  { id: 'tax',      label: 'מע"מ ורשות המיסים',  icon: 'invoice'      },
  { id: 'update',   label: 'עדכון גרסה',           icon: 'refresh'      },
  { id: 'lan',      label: 'רשת LAN',             icon: 'qr'           },
  { id: 'backup',   label: 'גיבוי',               icon: 'box'          },
  { id: 'security', label: 'אבטחה',               icon: 'lock'         },
  { id: 'about',    label: 'אודות',                icon: 'info'         },
];

// ── Main Screen ───────────────────────────────────────────────────────────────
const ScreenSettings = () => {
  const [tab,      setTab]      = React.useState('business');
  const [settings, setSettings] = React.useState(null);
  const [original, setOriginal] = React.useState(null);
  const [saving,   setSaving]   = React.useState(false);
  const [saved,    setSaved]    = React.useState(false);

  // auto-update state
  const [updateInfo,       setUpdateInfo]       = React.useState(null);
  const [updateChecking,   setUpdateChecking]   = React.useState(false);
  const [updateDownloading, setUpdateDownloading] = React.useState(false);
  const [updateDone,       setUpdateDone]       = React.useState(false);

  React.useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { setSettings(d); setOriginal(JSON.stringify(d)); });
  }, []);

  const dirty = settings && JSON.stringify(settings) !== original;

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  const saveSettings = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      await window.refreshData();
      setOriginal(JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const checkUpdate = async () => {
    setUpdateChecking(true);
    setUpdateInfo(null);
    try {
      const r = await fetch('/api/update/check');
      const d = await r.json();
      setUpdateInfo(d);
    } catch (e) {
      setUpdateInfo({ error: e.message });
    }
    setUpdateChecking(false);
  };

  const installUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    setUpdateDownloading(true);
    try {
      const r = await fetch('/api/update/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: updateInfo.downloadUrl, assetName: updateInfo.assetName }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setUpdateDone(true);
    } catch (e) {
      setUpdateInfo(p => ({ ...p, installError: e.message }));
    }
    setUpdateDownloading(false);
  };

  if (!settings) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80, color: 'var(--text-muted)' }}>
      טוען הגדרות...
    </div>
  );

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontFamily: "'Heebo',sans-serif", fontSize: 14,
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--teal)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--teal)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── פרטי העסק ───────────────────────────────────────────────────────── */}
      {tab === 'business' && (
        <>
          <SSection title="פרטי העסק" subtitle="מידע זה מופיע על חשבוניות, קבלות ומסמכים רשמיים">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <SLabel>שם העסק</SLabel>
                <SInput value={settings.business_name} onChange={e => set('business_name', e.target.value)} placeholder="מג'יק פרינט" />
              </div>
              <div>
                <SLabel>שם בעל העסק</SLabel>
                <SInput value={settings.business_owner} onChange={e => set('business_owner', e.target.value)} placeholder="אלי אליאס" />
              </div>
              <div>
                <SLabel>מספר עוסק מורשה</SLabel>
                <SInput value={settings.business_vat} onChange={e => set('business_vat', e.target.value)} placeholder="123456789" />
              </div>
              <div>
                <SLabel>טלפון</SLabel>
                <SInput value={settings.business_phone} onChange={e => set('business_phone', e.target.value)} placeholder="050-0000000" />
              </div>
              <div>
                <SLabel>אימייל</SLabel>
                <SInput type="email" value={settings.business_email} onChange={e => set('business_email', e.target.value)} placeholder="info@magic-print.co.il" />
              </div>
              <div>
                <SLabel>כתובת</SLabel>
                <SInput value={settings.business_address} onChange={e => set('business_address', e.target.value)} placeholder="רחוב, עיר" />
              </div>
              <div>
                <SLabel>אימייל רואה חשבון</SLabel>
                <SInput type="email" value={settings.accountant_email} onChange={e => set('accountant_email', e.target.value)} placeholder="accountant@example.com" />
              </div>
            </div>
            <SaveBar saving={saving} saved={saved} onSave={saveSettings} dirty={dirty} />
          </SSection>
        </>
      )}

      {/* ── מע"מ ורשות המיסים ────────────────────────────────────────────────── */}
      {tab === 'tax' && (
        <>
          <SSection title={'שיעור מע"מ'} subtitle={'שיעור המע"מ הנוכחי בישראל — עודכן לפי חוק'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ flex: 1, maxWidth: 240 }}>
                <SLabel>שיעור מע"מ (%)</SLabel>
                <SInput type="number" value={settings.vat_rate} onChange={e => set('vat_rate', parseInt(e.target.value) || 18)} />
              </div>
              <div style={{ paddingTop: 18, fontSize: 13, color: 'var(--text-muted)', maxWidth: 320 }}>
                ₪100 לפני מע"מ = ₪{(100 * (1 + (settings.vat_rate||18)/100)).toFixed(2)} כולל מע"מ
              </div>
            </div>
            <SaveBar saving={saving} saved={saved} onSave={saveSettings} dirty={dirty} />
          </SSection>

          <SSection title="רשות המיסים — API" subtitle="מספרי הקצאה אוטומטיים לחשבוניות מס">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <SLabel>Client ID</SLabel>
                <SInput value={settings.ita_client_id} onChange={e => set('ita_client_id', e.target.value)} placeholder="מהפורטל" />
              </div>
              <div>
                <SLabel>Client Secret</SLabel>
                <SInput type="password" value={settings.ita_client_secret === '***' ? '' : settings.ita_client_secret}
                  onChange={e => set('ita_client_secret', e.target.value)}
                  placeholder={settings.ita_client_secret === '***' ? '••••••••' : 'מהפורטל'} />
              </div>
              <div>
                <SLabel>מספר עוסק (לחשבוניות)</SLabel>
                <SInput value={settings.ita_vat_number} onChange={e => set('ita_vat_number', e.target.value)} placeholder="מספר העוסק שלך" />
              </div>
              <div>
                <SLabel>סביבה</SLabel>
                <select value={settings.ita_env || 'sandbox'} onChange={e => set('ita_env', e.target.value)}
                  style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: "'Heebo',sans-serif", direction: 'rtl', background: 'var(--bg-card)', color: 'var(--text)' }}>
                  <option value="sandbox">בדיקות (Sandbox)</option>
                  <option value="production">ייצור (Production)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {settings.ita_configured
                  ? <span style={{ color: 'var(--success)' }}>✓ API מוגדר</span>
                  : <span>נא למלא את פרטי ה-API · <a href="#" style={{ color: 'var(--teal)' }} onClick={e => { e.preventDefault(); fetch('/api/ita/open-portal',{method:'POST'}); }}>פתח פורטל</a></span>}
              </div>
              <SaveBar saving={saving} saved={saved} onSave={saveSettings} dirty={dirty} />
            </div>
          </SSection>
        </>
      )}

      {/* ── עדכון גרסה ───────────────────────────────────────────────────────── */}
      {tab === 'update' && (
        <>
          <SSection title="עדכון גרסה אוטומטי" subtitle="בדיקת עדכונים מ-GitHub Releases">

            {/* current version */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--bg-deep)', borderRadius: 10, marginBottom: 18 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--teal-soft)', display: 'grid', placeItems: 'center', color: 'var(--teal)' }}>
                <Icon name="cog" size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>מג'יק פרינט</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  גרסה נוכחית: <b style={{ color: 'var(--text)', fontFamily: 'monospace' }}>
                    {updateInfo?.currentVersion || '1.0.0'}
                  </b>
                </div>
              </div>
              <button className="btn ghost" style={{ marginInlineStart: 'auto' }}
                onClick={checkUpdate} disabled={updateChecking}>
                <Icon name="refresh" size={14} />
                {updateChecking ? 'בודק...' : 'בדוק עדכונים'}
              </button>
            </div>

            {/* result */}
            {updateInfo && !updateInfo.error && !updateInfo.noReleases && (
              <div style={{
                borderRadius: 12, padding: '16px 20px',
                background: updateInfo.isNewer ? 'var(--teal-soft)' : 'var(--success-soft)',
                border: `1px solid ${updateInfo.isNewer ? 'var(--teal)' : 'var(--success)'}`,
                marginBottom: 14,
              }}>
                {updateInfo.isNewer ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--teal-3)', marginBottom: 6 }}>
                      עדכון זמין — גרסה {updateInfo.latestVersion}
                    </div>
                    {updateInfo.releaseName && (
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{updateInfo.releaseName}</div>
                    )}
                    {updateInfo.releaseNotes && (
                      <pre style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: '8px 0 14px', fontFamily: "'Heebo',sans-serif" }}>
                        {updateInfo.releaseNotes}
                      </pre>
                    )}
                    {updateInfo.downloadUrl ? (
                      updateDone ? (
                        <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                          ✓ ההתקנה הופעלה — המתן לחלון המתקין
                        </div>
                      ) : (
                        <button className="btn teal" onClick={installUpdate} disabled={updateDownloading}>
                          <Icon name="download" size={14} />
                          {updateDownloading ? 'מוריד...' : `הורד והתקן גרסה ${updateInfo.latestVersion}`}
                        </button>
                      )
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        לא נמצא קובץ התקנה בגרסה זו. עדכן ידנית מ-GitHub.
                      </div>
                    )}
                    {updateInfo.installError && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
                        שגיאה: {updateInfo.installError}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>✓</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1F633E' }}>המערכת מעודכנת</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>גרסה {updateInfo.latestVersion} היא הגרסה העדכנית ביותר</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {updateInfo?.noReleases && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
                לא נמצאו גרסאות פורסמו ב-GitHub עדיין.
              </div>
            )}

            {updateInfo?.error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, padding: '10px 0' }}>
                שגיאה בבדיקת עדכונים: {updateInfo.error}
              </div>
            )}

            {/* GitHub link */}
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted)' }}>
              <Icon name="info" size={14} />
              עדכונים מתפרסמים ב-GitHub ·
              <button className="btn sm ghost" onClick={() => fetch('/api/update/open-github', { method: 'POST' }).catch(() => {})}>
                github.com/5645hm-a11y/-
              </button>
            </div>
          </SSection>

          <SSection title="הגדרות עדכון" subtitle="">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" id="auto-check"
                checked={settings.auto_update_check === 'true' || settings.auto_update_check === true}
                onChange={e => set('auto_update_check', e.target.checked ? 'true' : 'false')}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="auto-check" style={{ fontSize: 14, cursor: 'pointer' }}>
                בדוק עדכונים אוטומטית בהפעלה
              </label>
            </div>
            <SaveBar saving={saving} saved={saved} onSave={saveSettings} dirty={dirty} />
          </SSection>
        </>
      )}

      {/* ── LAN ──────────────────────────────────────────────────────────────── */}
      {tab === 'lan' && <LanTab />}

      {/* ── גיבוי ────────────────────────────────────────────────────────────── */}
      {tab === 'backup' && <BackupTab />}

      {/* ── אבטחה ────────────────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <>
          <SSection title="סיסמת כניסה" subtitle="הסיסמה נדרשת בכל פתיחת המערכת">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: 'var(--bg-deep)', borderRadius: 10, marginBottom: 20,
              fontSize: 13, color: 'var(--text-muted)',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--teal-soft)', display: 'grid', placeItems: 'center', color: 'var(--teal)', flexShrink: 0 }}>
                <Icon name="lock" size={18} />
              </div>
              <span>הסיסמה מגינה על הגישה למערכת. שנה אותה לסיסמה שתזכור ושמור אותה במקום בטוח.</span>
            </div>
            <ChangePasswordForm />
          </SSection>
        </>
      )}

      {/* ── אודות ────────────────────────────────────────────────────────────── */}
      {tab === 'about' && (
        <SSection title="אודות המערכת" subtitle="">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <img src="assets/logo.jpeg" alt="לוגו" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 16 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 4 }}>מג'יק פרינט</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                מערכת ניהול בית דפוס — גרסה 1.1.0
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <div>בעל העסק: {settings.business_owner || 'אלי אליאס'}</div>
                <div>שם העסק: {settings.business_name || "מג'יק פרינט"}</div>
                {settings.business_vat && <div>עוסק מורשה: {settings.business_vat}</div>}
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-deep)', padding: '4px 10px', borderRadius: 20 }}>
                  React 18
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-deep)', padding: '4px 10px', borderRadius: 20 }}>
                  Electron
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-deep)', padding: '4px 10px', borderRadius: 20 }}>
                  Node.js SQLite
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-deep)', padding: '4px 10px', borderRadius: 20 }}>
                  Express
                </div>
              </div>
            </div>
          </div>
        </SSection>
      )}
    </div>
  );
};

window.ScreenSettings = ScreenSettings;
