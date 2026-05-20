// App entrypoint - wires shell, screens, notifications, new-order modal

// ── Password screen shown on launch ──────────────────────────────────────────
const PasswordScreen = ({ onAuth }) => {
  const [pw,    setPw]    = React.useState('');
  const [error, setError] = React.useState(false);
  const [busy,  setBusy]  = React.useState(false);

  const tryLogin = async () => {
    if (!pw) return;
    setBusy(true);
    setError(false);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json();
      if (d.ok) { onAuth(); } else { setError(true); setPw(''); }
    } catch { setError(true); }
    setBusy(false);
  };

  const inp = {
    padding: '12px 16px', borderRadius: 10, fontSize: 15,
    textAlign: 'center', fontFamily: "'Heebo', sans-serif",
    outline: 'none', background: '#fff', color: '#111', width: '100%',
    boxSizing: 'border-box',
    border: `1.5px solid ${error ? '#C53030' : '#CDD1CE'}`,
    transition: 'border-color .15s',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F4F2EC',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 18, fontFamily: "'Heebo', sans-serif", direction: 'rtl',
    }}>
      <img src="assets/logo.jpeg" style={{ height: 90, objectFit: 'contain', borderRadius: 12 }} alt="מג'יק פרינט" />
      <div style={{ fontSize: 22, fontWeight: 700, color: '#181C1B', letterSpacing: '-.015em' }}>מג'יק פרינט</div>
      <div style={{ fontSize: 13, color: '#6E7470', marginTop: -8 }}>נא להזין סיסמה להמשך</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 280 }}>
        <input
          type="password" value={pw} autoFocus
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && tryLogin()}
          placeholder="●●●●"
          style={inp}
        />
        {error && (
          <div style={{ fontSize: 12, color: '#C53030', textAlign: 'center' }}>סיסמה שגויה, נסה שנית</div>
        )}
        <button
          onClick={tryLogin} disabled={busy || !pw}
          style={{
            padding: '12px', borderRadius: 10, border: 'none',
            background: busy || !pw ? '#AAD8D5' : '#1FA89B',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: busy || !pw ? 'not-allowed' : 'pointer',
            fontFamily: "'Heebo', sans-serif", transition: 'background .15s',
          }}>
          {busy ? '...' : 'כניסה'}
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 20, fontSize: 11, color: '#B0B8B4' }}>
        מג'יק פרינט · מערכת ניהול בית דפוס
      </div>
    </div>
  );
};

// ── Loading screen shown while fetching data ──────────────────────────────────
const LoadingScreen = () => (
  <div style={{
    position: 'fixed', inset: 0,
    background: '#F4F2EC',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 18, fontFamily: "'Heebo', sans-serif",
  }}>
    <img src="assets/logo.jpeg" style={{ height: 90, objectFit: 'contain', borderRadius: 12 }} alt="מג'יק פרינט" />
    <div style={{ fontSize: 22, fontWeight: 700, color: '#181C1B', letterSpacing: '-.015em' }}>מג'יק פרינט</div>
    <div style={{ fontSize: 13, color: '#6E7470', marginTop: -6 }}>מערכת ניהול בית דפוס</div>
    <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 9, height: 9, borderRadius: '50%', background: '#1FA89B',
          animation: `mp-dot 1.2s ${i * 0.2}s infinite ease-in-out both`,
        }} />
      ))}
    </div>
    <style>{`
      @keyframes mp-dot {
        0%, 80%, 100% { opacity: .25; transform: scale(.8); }
        40%            { opacity: 1;   transform: scale(1.2); }
      }
    `}</style>
  </div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
const App = () => {
  const [authed, setAuthed]        = React.useState(false);
  const [loaded, setLoaded]       = React.useState(false);
  const [tick, setTick]           = React.useState(0);   // bumped after refreshData
  const [section, setSection]     = React.useState('dashboard');
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [newOrderOpen, setNewOrderOpen] = React.useState(false);
  const [toasts, setToasts]       = React.useState([]);
  const [submitBusy, setSubmitBusy]       = React.useState(false);
  const [prefillCustId, setPrefillCustId] = React.useState('');
  const [updateInfo, setUpdateInfo]       = React.useState(null);   // { latestVersion, downloadUrl, assetName }
  const [updateBusy, setUpdateBusy]       = React.useState(false);
  const [updateDone, setUpdateDone]       = React.useState(false);

  // Load data on mount + wire window.refreshData for mutations
  React.useEffect(() => {
    window.refreshData = async () => {
      await window.loadData();
      setTick(t => t + 1);
    };
    window.loadData()
      .then(() => setLoaded(true))
      .catch(err => {
        console.error('Failed to load data:', err);
        setLoaded(true); // show app anyway (empty state)
      });
  }, []);

  // Auto-check for updates on startup (after data loads)
  React.useEffect(() => {
    if (!loaded) return;
    fetch('/api/update/check')
      .then(r => r.json())
      .then(d => { if (d.isNewer && d.downloadUrl) setUpdateInfo(d); })
      .catch(() => {});
  }, [loaded]);

  const doInstallUpdate = async () => {
    if (!updateInfo?.downloadUrl || updateBusy) return;
    setUpdateBusy(true);
    try {
      const r = await fetch('/api/update/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: updateInfo.downloadUrl, assetName: updateInfo.assetName }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setUpdateDone(true);
      // Close app after 4 s so the installer can replace the files
      setTimeout(() => { try { window.close(); } catch {} }, 4000);
    } catch (e) {
      console.error('Update failed:', e);
      setUpdateBusy(false);
    }
  };

  // Auto-dismiss toasts after 6.5 s
  React.useEffect(() => {
    if (toasts.length === 0) return;
    const last = toasts[toasts.length - 1];
    const t = setTimeout(() => setToasts(ts => ts.filter(x => x.id !== last.id)), 6500);
    return () => clearTimeout(t);
  }, [toasts]);

  const addToast = (title, text) =>
    setToasts(t => [...t, { id: Date.now() + Math.random(), title, text }]);

  const onOpenNotif = () => setNotifOpen(o => !o);
  const onNav = (id) => { setSection(id); setNotifOpen(false); };
  const onNewOrder = (custId) => {
    setPrefillCustId(custId || '');
    setNewOrderOpen(true);
  };

  // Expose globally so any screen can open the modal
  React.useEffect(() => { window.openNewOrder = onNewOrder; });

  // ── Submit new order → POST to backend ──────────────────────────────────────
  const onSubmitOrder = async (formData) => {
    if (submitBusy) return;
    setSubmitBusy(true);
    try {
      let customerName = '';

      // If new customer was created inline, save them to DB first
      if (formData.customerId === 'NEW') {
        const newCust = window.DATA.CUSTOMERS.find(c => c.id === 'NEW');
        if (newCust) {
          const r = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCust),
          });
          const j = await r.json();
          customerName = newCust.name;
        }
      } else {
        const cust = window.DATA.CUSTOMERS.find(c => c.id === formData.customerId);
        customerName = cust ? cust.name : '';
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          notes:    formData.notes    || '',
          due:      formData.due      || '',
          price:    formData.price    || 0,
          priority: formData.priority || 'medium',
          asDraft:  !!formData.asDraft,
        }),
      });
      const orderJson = await orderRes.json();

      setNewOrderOpen(false);
      await window.refreshData();
      addToast('הזמנת עבודה נוצרה',
        `${customerName} · ${formData.asDraft ? 'נשמרה כהצעת מחיר' : 'נכנסה לתור ממתין לאישור'}`);
      return { id: orderJson.id, customerName };
    } catch (err) {
      console.error('Order creation failed:', err);
      addToast('שגיאה', 'לא ניתן היה ליצור את ההזמנה. נסה שנית.');
    } finally {
      setSubmitBusy(false);
    }
  };

  // Show password screen before anything else
  if (!authed) return <PasswordScreen onAuth={() => setAuthed(true)} />;

  // Show while fetching
  if (!loaded) return <LoadingScreen />;

  const { NOTIFICATIONS } = window.DATA;

  const renderScreen = () => {
    switch (section) {
      case 'dashboard': return <ScreenDashboard onOpen={onNav} />;
      case 'orders':    return <ScreenOrders onOpenNewOrder={onNewOrder} onOpenOrder={() => {}} />;
      case 'customers': return <ScreenCustomers />;
      case 'invoices':  return <ScreenInvoices />;
      case 'receipts':  return <ScreenReceipts />;
      case 'suppliers': return <ScreenSuppliers />;
      case 'inventory': return <ScreenInventory />;
      case 'printers':  return <ScreenPrinters />;
      case 'reports':   return <ScreenReports />;
      case 'settings':  return <ScreenSettings />;
      default:          return <ScreenDashboard onOpen={onNav} />;
    }
  };

  return (
    <div className="shell" data-screen-label={`${section}`}>
      <Sidebar current={section} onNav={onNav} />
      <main className="main">
        <Topbar
          section={section}
          onOpenNotif={onOpenNotif}
          notifCount={NOTIFICATIONS.length}
          onNewOrder={onNewOrder}
        />
        {updateInfo && !updateDone && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '10px 22px',
            background: 'var(--teal)', color: '#fff', fontSize: 14, flexShrink: 0,
          }}>
            <Icon name="refresh" size={16} />
            <span style={{ flex: 1 }}>
              <b>עדכון זמין — גרסה {updateInfo.latestVersion}</b>
              {'  '}עדכן עכשיו כדי ליהנות מהשיפורים האחרונים
            </span>
            <button onClick={doInstallUpdate} disabled={updateBusy}
              style={{
                padding: '6px 18px', borderRadius: 8, border: '2px solid #fff',
                background: 'transparent', color: '#fff', fontFamily: "'Heebo',sans-serif",
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
              {updateBusy ? 'מוריד...' : 'עדכן עכשיו'}
            </button>
            <button onClick={() => setUpdateInfo(null)}
              style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 4 }}>
              <Icon name="x" size={15} />
            </button>
          </div>
        )}
        {updateDone && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 22px',
            background: '#1F633E', color: '#fff', fontSize: 14, flexShrink: 0,
          }}>
            <Icon name="check" size={16} />
            <span>המתקין הופעל — המערכת תיסגר תוך מספר שניות ותעלה מחדש עם הגרסה החדשה</span>
          </div>
        )}
        <div className="content">{renderScreen()}</div>
      </main>

      {notifOpen && <NotifPopover onClose={() => setNotifOpen(false)} />}

      <NewOrderModal
        open={newOrderOpen}
        onClose={() => { setNewOrderOpen(false); setPrefillCustId(''); }}
        onSubmit={onSubmitOrder}
        busy={submitBusy}
        prefillCustomerId={prefillCustId}
      />

      <div className="toast-stack">
        {toasts.slice(-3).map(t => (
          <div key={t.id} className="toast">
            <div className="ico"><Icon name="bell" size={16} /></div>
            <div className="body" style={{ flex: 1, minWidth: 0 }}>
              <b>{t.title}</b>
              <p>{t.text}</p>
            </div>
            <button
              className="icon-btn"
              style={{ width: 24, height: 24, background: 'transparent', border: 0, color: '#7C8482' }}
              onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Notifications popover ─────────────────────────────────────────────────────
const NotifPopover = ({ onClose }) => {
  const { NOTIFICATIONS } = window.DATA;
  const colorMap = {
    success: { bg: 'var(--success-soft)', fg: '#1F633E' },
    danger:  { bg: 'var(--danger-soft)',  fg: '#8E3939' },
    warn:    { bg: 'var(--warn-soft)',    fg: '#92651D' },
    teal:    { bg: 'var(--teal-soft)',    fg: 'var(--teal-3)' },
  };
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={onClose}></div>
      <div className="notif-pop">
        <div className="notif-pop__head">
          <b>התראות</b>
          <span className="count">{NOTIFICATIONS.length}</span>
          <button className="btn sm ghost" style={{ marginInlineStart: 'auto' }}>סמן הכל כנקרא</button>
        </div>
        <div>
          {NOTIFICATIONS.map(n => {
            const c = colorMap[n.color] || colorMap.teal;
            return (
              <div key={n.id} className="notif-item">
                <div className="ico" style={{ background: c.bg, color: c.fg }}>
                  <Icon name={n.icon} size={15} />
                </div>
                <div className="body">
                  <b>{n.title}</b>
                  <p>{n.text}</p>
                  <div className="time">{n.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
