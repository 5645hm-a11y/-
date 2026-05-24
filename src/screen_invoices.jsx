// Invoices — real ITA (Israeli Tax Authority) integration

// ── Settings Modal ────────────────────────────────────────────────────────────
const ITASettingsModal = ({ onClose, onSaved }) => {
  const [form, setForm] = React.useState({
    business_name: '', business_vat: '',
    ita_client_id: '', ita_client_secret: '',
    ita_vat_number: '', ita_env: 'sandbox',
  });
  const [busy, setBusy] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setForm(f => ({ ...f,
        business_name:    d.business_name    || '',
        business_vat:     d.business_vat     || '',
        ita_client_id:    d.ita_client_id    || '',
        ita_client_secret: d.ita_client_secret || '',
        ita_vat_number:   d.ita_vat_number   || '',
        ita_env:          d.ita_env          || 'sandbox',
      }));
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setBusy(false);
    onSaved();
    onClose();
  };

  const openPortal = () => fetch('/api/ita/open-portal', { method: 'POST' }).catch(() => {});

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    const r = await fetch('/api/ita/status').then(r => r.json()).catch(() => ({ connected: false, message: 'שגיאת רשת' }));
    setTestResult(r);
    setTesting(false);
  };

  const F = ({ label, name, placeholder, type = 'text', hint }) => (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={form[name]} onChange={e => set(name, e.target.value)} placeholder={placeholder} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div style={{ width: 38, height: 38, background: 'var(--teal-soft)', color: 'var(--teal-3)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <Icon name="shield" size={18} />
          </div>
          <div><h2>הגדרות עסק ורשות המיסים</h2><div className="sub">חיבור API לקבלת מספרי הקצאה אוטומטיים</div></div>
          <button className="icon-btn" style={{ marginInlineStart: 'auto' }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal__body">

          <div className="section-title" style={{ marginBottom: 10 }}><h2>פרטי העסק</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
            <F label="שם העסק"         name="business_name"  placeholder="מג'יק פרינט" />
            <F label="מספר עוסק מורשה" name="business_vat"   placeholder="123456789" hint="מופיע על חשבוניות המס" />
          </div>

          <div className="section-title" style={{ marginBottom: 6 }}><h2>API רשות המיסים — מספרי הקצאה</h2></div>
          <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 9, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
            לקבלת Client ID ו-Client Secret:<br />
            1. לחץ <b>"פתח פורטל מפתחים"</b> ↙ (openapi-portal.taxes.gov.il)<br />
            2. לחץ <b>"S'inscrire / Sign Up"</b> — צור חשבון עם מספר עוסק וסיסמת מס הכנסה<br />
            3. לאחר הכניסה — לחץ <b>"Applications"</b> ← <b>"Add New Application"</b><br />
            4. בחר את מוצר ה-API של <b>חשבוניות ישראל</b> ולחץ Subscribe<br />
            5. בפרטי היישום תמצא <b>Client ID</b> ו-<b>Client Secret</b> — העתק אותם כאן
          </div>
          <button className="btn" style={{ marginBottom: 18 }} onClick={openPortal}>
            <Icon name="shield" size={14} />פתח פורטל מפתחים רשות המיסים
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <F label="Client ID"      name="ita_client_id"     placeholder="הכנס Client ID" />
            <F label="Client Secret"  name="ita_client_secret" placeholder={form.ita_client_secret === '***' ? 'מוגדר ✓' : 'הכנס Client Secret'} type="password" />
            <F label="מספר ח.פ. / ע.מ. לרשות המיסים" name="ita_vat_number" placeholder="123456789" />
            <div className="field">
              <label>סביבה</label>
              <select value={form.ita_env} onChange={e => set('ita_env', e.target.value)}>
                <option value="sandbox">Sandbox — בדיקות</option>
                <option value="production">Production — אמיתי</option>
              </select>
            </div>
          </div>

          {testResult && (
            <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 10,
              background: testResult.connected ? 'var(--teal-softer)' : 'var(--danger-soft)',
              color: testResult.connected ? 'var(--teal-3)' : 'var(--danger)', fontSize: 13 }}>
              {testResult.connected ? `✓ מחובר בהצלחה · תגובה ${testResult.responseMs}ms · ${testResult.env}` : `✗ ${testResult.message}`}
            </div>
          )}
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose}>ביטול</button>
          <button className="btn" onClick={testConnection} disabled={testing}>
            {testing ? 'בודק...' : 'בדוק חיבור'}
          </button>
          <button className="btn teal" style={{ marginInlineStart: 'auto' }} onClick={save} disabled={busy}>
            {busy ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── New Invoice Modal ─────────────────────────────────────────────────────────
const NewInvoiceModal = ({ onClose, onCreated }) => {
  const { CUSTOMERS, VAT_RATE } = window.DATA;
  const [form, setForm] = React.useState({
    type: 'חשבונית מס', customer: '', customerVat: '',
    desc: '', amount: '', method: 'אשראי',
  });
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const amount   = parseFloat(form.amount) || 0;
  const vat      = parseFloat((amount * (VAT_RATE || 18) / 100).toFixed(2));
  const total    = parseFloat((amount + vat).toFixed(2));
  const fmt      = n => n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const submit = async () => {
    if (!form.customer || !amount) return;
    setBusy(true);
    try {
      const r = await fetch('/api/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount }),
      });
      const j = await r.json();
      await window.refreshData();
      setResult(j);
    } catch { setBusy(false); }
  };

  if (result) return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div style={{ width: 38, height: 38, background: 'var(--teal-soft)', color: 'var(--teal-3)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <Icon name="check" size={18} />
          </div>
          <div><h2>חשבונית נוצרה</h2><div className="sub">מספר: {result.id}</div></div>
        </div>
        <div className="modal__body">
          {result.allocationNumber ? (
            <div style={{ padding: '14px 16px', background: 'var(--teal-softer)', borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--teal-2)', fontWeight: 700, marginBottom: 4 }}>מספר הקצאה — רשות המיסים</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--teal-3)', fontFamily: 'monospace' }}>{result.allocationNumber}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>זמן תגובה: {result.responseMs}ms</div>
            </div>
          ) : (
            <div style={{ padding: '12px 14px', background: '#FEF5E7', borderRadius: 9, marginBottom: 12, fontSize: 13 }}>
              <b>מספר הקצאה לא התקבל</b> — API לא מוגדר או לא זמין.<br />
              ניתן לבקש הקצאה מאוחר יותר מפרטי החשבונית.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn teal" onClick={() => { downloadInvoicePDF(result.id); }}>
              <Icon name="download" size={14} />הורד PDF
            </button>
            <button className="btn ghost" onClick={() => { onCreated(); onClose(); }}>סגור</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div style={{ width: 38, height: 38, background: 'var(--teal-soft)', color: 'var(--teal-3)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <Icon name="invoice" size={18} />
          </div>
          <div><h2>חשבונית חדשה</h2><div className="sub">יישלח לרשות המיסים לאישור אוטומטי</div></div>
          <button className="icon-btn" style={{ marginInlineStart: 'auto' }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>סוג מסמך</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['חשבונית מס', 'חשבונית מס קבלה', 'חשבונית עסקה'].map(t => (
                  <button key={t} type="button" onClick={() => set('type', t)}
                    style={{ flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${form.type === t ? 'var(--teal)' : 'var(--border)'}`,
                      background: form.type === t ? 'var(--teal-softer)' : 'var(--surface)',
                      color: form.type === t ? 'var(--teal-3)' : 'var(--ink-2)' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>לקוח</label>
              <select value={form.customer} onChange={e => set('customer', e.target.value)}>
                <option value="">בחר לקוח...</option>
                {CUSTOMERS.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>מע"מ לקוח (ל-B2B)</label>
              <input value={form.customerVat} onChange={e => set('customerVat', e.target.value)} placeholder="אופציונלי" />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>תיאור שירות / מוצר</label>
              <textarea value={form.desc} onChange={e => set('desc', e.target.value)}
                placeholder="לדוגמה: הדפסת ברושורים 500 יח', עיצוב גרפי..."
                style={{ width: '100%', minHeight: 70, border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div className="field">
              <label>סכום לפני מע"מ (₪)</label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            </div>
            <div className="field">
              <label>אופן תשלום</label>
              <select value={form.method} onChange={e => set('method', e.target.value)}>
                {['אשראי','מזומן','העברה בנקאית','BIT','פייבוקס','שיק'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Live calculation */}
          {amount > 0 && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>לפני מע"מ</div><div style={{ fontWeight: 700 }}>₪{fmt(amount)}</div></div>
                <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>מע"מ {VAT_RATE || 18}%</div><div style={{ fontWeight: 700 }}>₪{fmt(vat)}</div></div>
                <div style={{ color: 'var(--teal-3)' }}><div style={{ fontSize: 11.5 }}>סה"כ לתשלום</div><div style={{ fontWeight: 800, fontSize: 18 }}>₪{fmt(total)}</div></div>
              </div>
            </div>
          )}
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>
          <button className="btn teal" style={{ marginInlineStart: 'auto' }} onClick={submit} disabled={busy || !form.customer || !amount}>
            <Icon name="shield" size={14} />
            {busy ? 'שומר ומבקש הקצאה...' : 'צור חשבונית + הקצאה'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Invoice Detail Modal ──────────────────────────────────────────────────────
const InvoiceDetailModal = ({ inv, onClose, onRefresh }) => {
  const { VAT_RATE } = window.DATA;
  const [allocating, setAllocating] = React.useState(false);
  const [allocMsg,   setAllocMsg]   = React.useState(null);
  const [markingPaid, setMarkingPaid] = React.useState(false);

  const allocate = async () => {
    setAllocating(true); setAllocMsg(null);
    const r = await fetch('/api/ita/allocate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: inv.id }),
    }).then(r => r.json()).catch(() => ({ error: 'שגיאת רשת' }));
    setAllocMsg(r.allocationNumber ? `✓ ${r.allocationNumber} · ${r.responseMs}ms` : `✗ ${r.error}`);
    if (r.allocationNumber) { await window.refreshData(); onRefresh(r.allocationNumber); }
    setAllocating(false);
  };

  const markPaid = async () => {
    setMarkingPaid(true);
    await fetch(`/api/invoices/${inv.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });
    await window.refreshData();
    onClose();
  };

  const fmt = n => `₪${(+n || 0).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;
  const today = new Date().toLocaleDateString('he-IL');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div style={{ width: 38, height: 38, background: 'var(--teal-soft)', color: 'var(--teal-3)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <Icon name="invoice" size={18} />
          </div>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono">{inv.id}</span>
              {inv.status === 'paid'    && <Chip tone="success">שולם</Chip>}
              {inv.status === 'open'    && <Chip tone="warn">פתוח</Chip>}
              {inv.status === 'pending' && <Chip tone="muted">טיוטה</Chip>}
            </h2>
            <div className="sub">{inv.type} · {inv.customer} · {inv.date}</div>
          </div>
          <button className="icon-btn" style={{ marginInlineStart: 'auto' }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 9 }}>
              <div className="text-xs muted">לפני מע"מ</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(inv.amount)}</div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 9 }}>
              <div className="text-xs muted">מע"מ {VAT_RATE || 18}%</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(inv.vat)}</div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--teal-softer)', borderRadius: 9 }}>
              <div className="text-xs" style={{ color: 'var(--teal-2)' }}>סה"כ לתשלום</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--teal-3)' }}>{fmt(inv.total)}</div>
            </div>
          </div>

          {/* ITA allocation section */}
          <div style={{ padding: '14px 16px', background: inv.tax === 'allocated' ? 'var(--teal-softer)' : '#FEF5E7', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="shield" size={16} style={{ color: inv.tax === 'allocated' ? 'var(--teal-3)' : '#92651D' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: inv.tax === 'allocated' ? 'var(--teal-3)' : '#92651D' }}>
                  {inv.tax === 'allocated' ? 'מספר הקצאה — מאושר רשות המיסים' : 'ממתין למספר הקצאה'}
                </div>
                {inv.allocation ? (
                  <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, marginTop: 2 }}>{inv.allocation}</div>
                ) : (
                  <div style={{ fontSize: 12, marginTop: 2, color: '#92651D' }}>לחץ "בקש הקצאה" לקבלת מספר מרשות המיסים</div>
                )}
                {allocMsg && <div style={{ fontSize: 12, marginTop: 4, color: allocMsg.startsWith('✓') ? 'var(--teal-3)' : 'var(--danger)' }}>{allocMsg}</div>}
              </div>
              {inv.tax !== 'allocated' && (
                <button className="btn sm teal" onClick={allocate} disabled={allocating}>
                  <Icon name="shield" size={12} />{allocating ? 'מבקש...' : 'בקש הקצאה'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13.5 }}>
            {[['לקוח', inv.customer], ['תאריך', inv.date], ['אופן תשלום', inv.method], ['מספר מסמך', inv.id]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--ink-3)', minWidth: 100 }}>{l}</span>
                <b>{v || '—'}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose}>סגור</button>
          <button className="btn" onClick={() => downloadInvoicePDF(inv.id, inv)}>
            <Icon name="download" size={14} />הורד PDF
          </button>
          {inv.status === 'open' && (
            <button className="btn teal" style={{ marginInlineStart: 'auto' }} onClick={markPaid} disabled={markingPaid}>
              <Icon name="check" size={14} />{markingPaid ? '...' : 'סמן כשולם'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Open invoice document (new design) ───────────────────────────────────────
function downloadInvoicePDF(id) {
  window.open(`documents.html?type=invoice&id=${encodeURIComponent(id)}`, '_blank', 'width=960,height=1100,menubar=no,toolbar=no');
}

// ── Main Screen ───────────────────────────────────────────────────────────────
const ScreenInvoices = () => {
  const { INVOICES, VAT_RATE } = window.DATA;
  const [tab,         setTab]         = React.useState('all');
  const [search,      setSearch]      = React.useState('');
  const [itaStatus,   setItaStatus]   = React.useState(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showNew,      setShowNew]     = React.useState(false);
  const [selectedInv, setSelectedInv] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/ita/status').then(r => r.json()).then(setItaStatus).catch(() => {});
  }, []);

  const filtered = INVOICES.filter(i => {
    if (tab !== 'all' && i.status !== tab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (i.id||'').toLowerCase().includes(q) || (i.customer||'').includes(q) || (i.allocation||'').includes(q);
  });

  const totalMonth = INVOICES.reduce((s, i) => s + (+i.total||0), 0);
  const totalOpen  = INVOICES.filter(i => i.status === 'open').reduce((s, i) => s + (+i.total||0), 0);
  const allocated  = INVOICES.filter(i => i.tax === 'allocated').length;
  const fmt = n => `₪${Math.round(n).toLocaleString('he-IL')}`;

  const counts = { all: INVOICES.length, open: INVOICES.filter(i=>i.status==='open').length, paid: INVOICES.filter(i=>i.status==='paid').length, pending: INVOICES.filter(i=>i.status==='pending').length };

  return (
    <div>
      {/* ITA connection banner */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div className="tax-banner" style={{ margin: 0, cursor: 'pointer' }} onClick={() => setShowSettings(true)}>
          <div className="seal"><Icon name="shield" size={24} /></div>
          <div>
            <h3>רשות המיסים · {itaStatus?.connected ? 'מחובר' : itaStatus?.configured ? 'שגיאת חיבור' : 'לא מוגדר'}</h3>
            <p>
              {itaStatus?.connected
                ? `מספרי הקצאה אוטומטיים · ${itaStatus.responseMs}ms · ${itaStatus.env === 'production' ? 'ייצור' : 'Sandbox'}`
                : itaStatus?.configured
                  ? `${itaStatus.message}`
                  : 'לחץ להגדרת API — Client ID + Secret'}
            </p>
          </div>
          <div className="meta" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <span className="live-dot" style={{ background: itaStatus?.connected ? undefined : itaStatus?.configured ? 'orange' : '#aaa' }}></span>
            <span style={{ fontSize: 11, opacity: .7 }}>לחץ לניהול</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon teal"><Icon name="invoice" size={16} /></div><div className="kpi__label">סה"כ החודש</div></div>
          <div className="kpi__value">{fmt(totalMonth)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon warn"><Icon name="wallet" size={16} /></div><div className="kpi__label">פתוחות לגבייה</div></div>
          <div className="kpi__value">{fmt(totalOpen)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon success"><Icon name="check-circle" size={16} /></div><div className="kpi__label">קיבלו הקצאה</div></div>
          <div className="kpi__value">{allocated} / {INVOICES.length}</div>
        </div>
      </div>

      <div className="tabs">
        {[['all','הכל'],['open','פתוחות'],['paid','שולמו'],['pending','טיוטות']].map(([id, label]) => (
          <button key={id} className={`tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>
            {label} <span className="count">{counts[id]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש לפי מספר, לקוח או מספר הקצאה..." />
        </div>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn" onClick={() => setShowSettings(true)}><Icon name="cog" size={14} />הגדרות API</button>
          <button className="btn teal" onClick={() => setShowNew(true)}><Icon name="plus" size={14} />חשבונית חדשה</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>מסמך</th><th>לקוח</th><th>תאריך</th><th>לפני מע"מ</th><th>מע"מ</th><th>סה"כ</th><th>תשלום</th><th>הקצאה ITA</th><th>סטטוס</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} style={{ cursor: 'pointer' }}
                onClick={() => setSelectedInv(inv)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-softer)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td>
                  <div className="name">{/[א-ת]/.test(inv.type || '') ? inv.type : 'חשבונית מס'}</div>
                  <div className="text-xs mono muted">#{inv.id}</div>
                </td>
                <td>{inv.customer}</td>
                <td className="mono">{inv.date}</td>
                <td className="mono">₪{(+inv.amount||0).toLocaleString()}</td>
                <td className="mono muted">₪{(+inv.vat||0).toLocaleString()}</td>
                <td className="mono" style={{ fontWeight: 600 }}>₪{(+inv.total||0).toLocaleString()}</td>
                <td>{inv.method}</td>
                <td>
                  {inv.tax === 'allocated'
                    ? <div><Chip tone="success">מאושר</Chip><div className="text-xs mono muted" style={{ marginTop: 2 }}>{inv.allocation}</div></div>
                    : <Chip tone="muted">ממתין</Chip>}
                </td>
                <td>
                  {inv.status === 'paid'    && <Chip tone="success">שולם</Chip>}
                  {inv.status === 'open'    && <Chip tone="warn">פתוח</Chip>}
                  {inv.status === 'pending' && <Chip tone="muted">טיוטה</Chip>}
                </td>
                <td>
                  <button className="btn sm ghost" onClick={e => { e.stopPropagation(); downloadInvoicePDF(inv.id, inv); }}>
                    <Icon name="download" size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>אין חשבוניות</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showSettings && <ITASettingsModal onClose={() => setShowSettings(false)} onSaved={() => fetch('/api/ita/status').then(r=>r.json()).then(setItaStatus)} />}
      {showNew      && <NewInvoiceModal  onClose={() => setShowNew(false)} onCreated={() => {}} />}
      {selectedInv  && (
        <InvoiceDetailModal
          inv={selectedInv}
          onClose={() => setSelectedInv(null)}
          onRefresh={(alloc) => setSelectedInv(i => ({ ...i, allocation: alloc, tax: 'allocated' }))}
        />
      )}
    </div>
  );
};

window.ScreenInvoices = ScreenInvoices;
window.downloadInvoicePDF = downloadInvoicePDF;
