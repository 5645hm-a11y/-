// Printers — real-time view from Windows (no mock data)

// ── Printer Detail Modal ──────────────────────────────────────────────────────
const PrinterDetailModal = ({ printer, onClose }) => {
  const [details, setDetails] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [openingApp, setOpeningApp] = React.useState(false);
  const [openingWin, setOpeningWin] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/printers/details')
      .then(r => r.json())
      .then(list => {
        setDetails((list || []).find(p => p.name === printer.name) || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [printer.name]);

  const openApp = async () => {
    setOpeningApp(true);
    await fetch('/api/printers/open', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: printer.name }),
    }).catch(() => {});
    setTimeout(() => setOpeningApp(false), 2500);
  };

  const openWin = async () => {
    setOpeningWin(true);
    await fetch('/api/printers/windows-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
    setTimeout(() => setOpeningWin(false), 2000);
  };

  const STATE_LABEL = { printing: 'מדפיסה', idle: 'פנויה', error: 'תקלה', offline: 'מנותקת' };
  const STATE_COLOR = { printing: 'teal', idle: 'muted', error: 'danger', offline: 'warn' };
  const connType = printer.isVirtual  ? 'תוכנה (וירטואלי)'
                 : printer.isNetwork  ? 'רשת (TCP/IP)'
                 :                      'מקומי / USB';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>

        {/* Head */}
        <div className="modal__head">
          <div style={{ width: 42, height: 42, background: 'var(--teal-soft)', color: 'var(--teal-3)', borderRadius: 11, display: 'grid', placeItems: 'center' }}>
            <Icon name="printer" size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {printer.name}
              <Chip tone={STATE_COLOR[printer.state] || 'muted'}>{STATE_LABEL[printer.state] || printer.state}</Chip>
            </h2>
            <div className="sub">{printer.model}</div>
          </div>
          <button className="icon-btn" style={{ marginInlineStart: 'auto' }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="modal__body">

          {/* Badges row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
            <BrandBadge name={printer.name} model={printer.model} />
            {printer.isVirtual && (
              <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: '#6B7280', color: '#fff' }}>וירטואלית</span>
            )}
            {printer.isDefault && (
              <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: 'var(--teal)', color: '#fff' }}>ברירת מחדל</span>
            )}
            {printer.isShared && (
              <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: '#8B5CF6', color: '#fff' }}>משותפת ברשת</span>
            )}
          </div>

          {/* Connection */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 10 }}><h2>חיבור</h2></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <DetailStat label="סוג חיבור"           value={connType} />
              <DetailStat label="יציאה"                value={printer.portLabel || printer.port || '—'} />
              <DetailStat label="תקשורת דו-כיוונית"   value={loading ? '...' : (details?.enableBIDI ? 'מופעל' : 'כבוי')} />
            </div>
          </div>

          {/* Technical specs — physical printers only */}
          {!printer.isVirtual && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div className="section-title" style={{ marginBottom: 10 }}><h2>מפרט טכני</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <DetailStat label="רזולוציה"       value={loading ? '...' : (details?.resolution || '—')} />
                  <DetailStat label="הדפסה דו-צדדית" value={loading ? '...' : (details?.capabilities?.includes('Duplex') ? 'כן' : 'לא')} />
                  <DetailStat label="עבודות מאז איפוס" value={loading ? '...' : String(details?.jobsSinceReset ?? 0)} />
                </div>
              </div>

              {/* Paper sizes */}
              {!loading && details?.paperSizes?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div className="section-title" style={{ marginBottom: 8 }}><h2>גדלי נייר נתמכים</h2></div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {details.paperSizes.map(s => (
                      <span key={s} style={{ padding: '3px 10px', borderRadius: 6, background: 'var(--surface-alt)', fontSize: 12.5, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities badges */}
              {!loading && details?.capabilities?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div className="section-title" style={{ marginBottom: 8 }}><h2>יכולות</h2></div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {details.capabilities.map(c => (
                      <span key={c} style={{ padding: '3px 10px', borderRadius: 6, background: 'var(--teal-softer)', color: 'var(--teal-3)', fontSize: 12.5, fontWeight: 600 }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Toner / Ink */}
              <div style={{ padding: '14px 16px', background: 'var(--surface-alt)', borderRadius: 10, marginBottom: 8 }}>
                <div className="section-title" style={{ marginBottom: 10 }}><h2>טונר / דיו</h2></div>
                {loading ? (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>טוען...</div>
                ) : details?.managerApp ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                      רמת הטונר מנוהלת על ידי תוכנת {details.managerApp.label}.<br />
                      לחץ כדי לפתוח ולראות את רמת הטונר בזמן אמת.
                    </div>
                    <button className="btn sm teal" onClick={openApp} disabled={openingApp}>
                      <Icon name="printer" size={12} />
                      {openingApp ? 'פותח...' : details.managerApp.label}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                    נתוני טונר לא זמינים דרך Windows עבור מדפסת זו.<br />
                    השתמש בתוכנת ניהול המדפסת שמגיעה עם המכשיר.
                  </div>
                )}
              </div>
            </>
          )}

          {/* Virtual printer info */}
          {printer.isVirtual && (
            <div style={{ padding: '14px 16px', background: 'var(--surface-alt)', borderRadius: 10, marginBottom: 8 }}>
              <div className="section-title" style={{ marginBottom: 6 }}><h2>טונר / דיו</h2></div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>לא רלוונטי — מדפסת תוכנה ללא חומרה פיזית</div>
            </div>
          )}

          {/* Error / offline state */}
          {printer.state === 'error' && (
            <div className="job" style={{ background: 'var(--danger-soft)', color: '#8E3939', marginTop: 14 }}>
              <Icon name="warning" size={14} />
              <span>{printer.errorMsg || 'שגיאת מדפסת — פתח הגדרות Windows לפרטים'}</span>
            </div>
          )}
          {printer.state === 'offline' && (
            <div className="job" style={{ background: '#FEF5E7', color: '#92651D', marginTop: 14 }}>
              <Icon name="warning" size={14} />
              <span>המדפסת מנותקת או כבויה — בדוק חיבור כבל / חשמל</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose}>סגור</button>
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn" onClick={openWin} disabled={openingWin}>
              <Icon name="cog" size={14} />
              {openingWin ? 'פותח...' : 'הגדרות Windows'}
            </button>
            {!loading && details?.managerApp && (
              <button className="btn teal" onClick={openApp} disabled={openingApp}>
                <Icon name="printer" size={14} />
                {openingApp ? 'פותח...' : details.managerApp.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailStat = ({ label, value }) => (
  <div style={{ padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8 }}>
    <div className="text-xs muted">{label}</div>
    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{value}</div>
  </div>
);

// ── Manage Printers Modal ─────────────────────────────────────────────────────
const ManagePrintersModal = ({ onClose }) => {
  const [allPrinters, setAllPrinters] = React.useState([]);
  const [hiddenList,  setHiddenList]  = React.useState([]);
  const [loading,     setLoading]     = React.useState(true);
  const [saving,      setSaving]      = React.useState(false);
  const [saved,       setSaved]       = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/printers/all').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([prns, settings]) => {
      setAllPrinters(prns || []);
      setHiddenList(settings.hidden_printers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleHidden = (name) => {
    setHiddenList(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden_printers: hiddenList }),
      });
      await window.refreshData();
      setSaved(true);
      setTimeout(onClose, 800);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div style={{ width: 40, height: 40, background: 'var(--teal-soft)', borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--teal)' }}>
            <Icon name="cog" size={18} />
          </div>
          <div>
            <h2>ניהול מדפסות</h2>
            <div className="sub">הסתר מדפסות וירטואליות או לא רלוונטיות</div>
          </div>
          <button className="icon-btn" style={{ marginInlineStart: 'auto' }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="modal__body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>טוען מדפסות...</div>
          ) : allPrinters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>לא נמצאו מדפסות</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                מדפסות מסומנות יוצגו במסך. בטל סימון להסתרה.
              </div>
              {allPrinters.map(p => {
                const visible = !hiddenList.includes(p.name);
                return (
                  <label key={p.name} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: visible ? 'var(--teal-soft)' : 'var(--bg-deep)',
                    cursor: 'pointer', transition: 'background .15s',
                    border: `1px solid ${visible ? 'var(--teal)' : 'var(--border)'}`,
                  }}>
                    <input type="checkbox" checked={visible}
                      onChange={() => toggleHidden(p.name)}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--teal)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                        {p.isVirtual && <span style={{ fontSize: 10, marginRight: 6, background: '#6B7280', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>וירטואלית</span>}
                        {p.isDefault && <span style={{ fontSize: 10, marginRight: 6, background: 'var(--teal)', color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>ברירת מחדל</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.model}</div>
                    </div>
                    <span style={{ fontSize: 12, color: visible ? 'var(--teal-3)' : 'var(--text-muted)' }}>
                      {visible ? 'מוצגת' : 'מוסתרת'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose}>ביטול</button>
          <button className="btn teal" onClick={save} disabled={saving || loading} style={{ marginInlineStart: 'auto' }}>
            {saved ? '✓ נשמר' : saving ? '...' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
const ScreenPrinters = () => {
  const [printers,  setPrinters]  = React.useState(window.DATA.PRINTERS || []);
  const [selected,  setSelected]  = React.useState(null);
  const [managing,  setManaging]  = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState(new Date());
  const [scanning,  setScanning]  = React.useState(false);

  const runScan = React.useCallback(() => {
    setScanning(true);
    window.loadData().then(() => {
      setPrinters([...(window.DATA.PRINTERS || [])]);
      setLastUpdate(new Date());
    }).catch(() => {}).finally(() => setScanning(false));
  }, []);

  // Scan immediately on mount, then every 15 seconds
  React.useEffect(() => {
    runScan();
    const iv = setInterval(runScan, 15000);
    return () => clearInterval(iv);
  }, [runScan]);

  const printing   = printers.filter(p => p.state === 'printing').length;
  const errors     = printers.filter(p => p.state === 'error').length;
  const offline    = printers.filter(p => p.state === 'offline').length;
  const totalQueue = printers.reduce((s, p) => s + (p.queue || 0), 0);
  const timeFmt    = d => d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div>
      {/* Banner */}
      <div style={{ background: '#0E665E', color: '#fff', borderRadius: 14, padding: '18px 22px', marginBottom: 22, display: 'flex', gap: 24, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 95% 100%, rgba(255,255,255,.1), transparent 50%)' }} />
        <div style={{ width: 54, height: 54, background: 'rgba(255,255,255,.15)', borderRadius: 14, display: 'grid', placeItems: 'center', position: 'relative', zIndex: 1 }}>
          <Icon name="printer" size={28} />
          {printing > 0 && <span className="live-dot" style={{ position: 'absolute', top: -2, left: -2 }} />}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>מצב חי · {printing} מדפסות פעילות</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>
            סריקה אוטומטית כל 15 שניות · עודכן {timeFmt(lastUpdate)}
          </div>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          style={{ marginInlineStart: 16, position: 'relative', zIndex: 1, padding: '8px 16px', borderRadius: 9, border: '1.5px solid rgba(255,255,255,.4)', background: scanning ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.15)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: scanning ? 'default' : 'pointer' }}
        >
          {scanning ? 'סורק...' : 'סרוק מחדש'}
        </button>
        <button
          onClick={() => setManaging(true)}
          style={{ position: 'relative', zIndex: 1, padding: '8px 16px', borderRadius: 9, border: '1.5px solid rgba(255,255,255,.4)', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <Icon name="cog" size={13} /> נהל מדפסות
        </button>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 24, position: 'relative', zIndex: 1 }}>
          <BannerStat label="סה״כ מדפסות" value={printers.length} />
          <BannerStat label="תקלות"        value={errors}  highlight={errors > 0} />
          <BannerStat label="מנותקות"      value={offline} highlight={offline > 0} />
          <BannerStat label="בתור"         value={totalQueue} />
        </div>
      </div>

      {printers.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
          לא נמצאו מדפסות מוגדרות ב-Windows
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {printers.map(p => (
            <PrinterFull key={p.id} p={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}

      {selected && (
        <PrinterDetailModal printer={selected} onClose={() => setSelected(null)} />
      )}

      {managing && (
        <ManagePrintersModal onClose={() => { setManaging(false); runScan(); }} />
      )}
    </div>
  );
};

const BannerStat = ({ label, value, highlight }) => (
  <div>
    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.7)' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? '#FCA5A5' : '#fff' }}>{value}</div>
  </div>
);

// ── Single printer card (clickable) ──────────────────────────────────────────
const PrinterFull = ({ p, onClick }) => {
  const STATE_LABEL = { printing: 'מדפיסה', idle: 'פנויה', error: 'תקלה', offline: 'מנותקת' };
  const STATE_COLOR = { printing: 'teal', idle: 'muted', error: 'danger', offline: 'warn' };
  const connType = p.isVirtual ? 'תוכנה (וירטואלי)' : p.isNetwork ? 'רשת' : 'מקומי / USB';

  return (
    <div
      className={`printer-card ${p.state === 'offline' ? 'maint' : p.state}`}
      style={{ padding: 20, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="head">
        <div className={`icon ${p.state === 'printing' ? 'live' : ''}`} style={{ width: 48, height: 48, borderRadius: 11 }}>
          <Icon name="printer" size={22} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="name" style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {p.name}
            {p.isDefault && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal-2)', background: 'var(--teal-softer)', borderRadius: 4, padding: '1px 5px' }}>
                ברירת מחדל
              </span>
            )}
          </div>
          <div className="model" style={{ fontSize: 12 }}>{p.model}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            <BrandBadge name={p.name} model={p.model} />
            {p.isVirtual && (
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 700, background: '#6B7280', color: '#fff' }}>
                וירטואלית
              </span>
            )}
          </div>
        </div>
        {p.state === 'printing' && <span className="live-dot" />}
        <Chip tone={STATE_COLOR[p.state] || 'muted'}>{STATE_LABEL[p.state] || p.state}</Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
        <PrinterStat label="עבודות בתור" value={`${p.queue || 0}`} />
        <PrinterStat label="סוג חיבור"   value={connType} />
        <PrinterStat label="יציאה"       value={p.portLabel || p.port || '—'} />
      </div>

      {p.state === 'error' && (
        <div className="job" style={{ background: 'var(--danger-soft)', color: '#8E3939', marginTop: 12 }}>
          <Icon name="warning" size={14} /><span>{p.errorMsg || 'שגיאת מדפסת'}</span>
        </div>
      )}
      {p.state === 'offline' && (
        <div className="job" style={{ background: '#FEF5E7', color: '#92651D', marginTop: 12 }}>
          <Icon name="warning" size={14} /><span>המדפסת מנותקת או כבויה</span>
        </div>
      )}
      {p.state === 'printing' && (
        <div className="job" style={{ marginTop: 12 }}>
          <Icon name="printer" size={14} /><span>{p.queue} {p.queue === 1 ? 'עבודה' : 'עבודות'} בביצוע</span>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
        לחץ לפרטים מלאים ›
      </div>
    </div>
  );
};

const PrinterStat = ({ label, value }) => (
  <div style={{ padding: '8px 10px', background: 'var(--surface-alt)', borderRadius: 8 }}>
    <div className="text-xs muted">{label}</div>
    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{value}</div>
  </div>
);

window.ScreenPrinters = ScreenPrinters;
