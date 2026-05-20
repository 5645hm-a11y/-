// Dashboard - simplified, focused view

const KPI = ({ icon, tone, label, value, delta, deltaDir = 'up' }) => (
  <div className="kpi">
    <div className="kpi__top">
      <div className={`kpi__icon ${tone}`}><Icon name={icon} size={16} /></div>
      <div className="kpi__label">{label}</div>
    </div>
    <div className="kpi__value">{value}</div>
    {delta && (
      <div className="kpi__delta">
        <b className={deltaDir === 'down' ? 'down' : ''}>{deltaDir === 'up' ? '▲' : '▼'} {delta}</b>
      </div>
    )}
  </div>
);

const PrinterMini = ({ p }) => (
  <div className={`printer-card ${p.state}`} style={{ padding: '12px 14px' }}>
    <div className="head">
      <div className={`icon ${p.state === 'printing' ? 'live' : ''}`} style={{ width: 32, height: 32, borderRadius: 8 }}>
        <Icon name="printer" size={15} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="name" style={{ fontSize: 13 }}>{p.name.split(' - ')[0]}</div>
        <div className="model" style={{ fontSize: 10.5 }}>{p.model}</div>
      </div>
      {p.state === 'printing' && <span className="live-dot"></span>}
      {p.state === 'error' && <Chip tone="danger" dot={false}>תקלה</Chip>}
      {p.state === 'idle' && <Chip tone="muted" dot={false}>פנויה</Chip>}
      {p.state === 'maint' && <Chip tone="warn" dot={false}>תחזוקה</Chip>}
    </div>
    {p.state === 'printing' && (
      <div className="progress" style={{ marginTop: 4 }}>
        <div className="bar"><div style={{ width: `${p.progress}%` }}></div></div>
        <span className="mono" style={{ minWidth: 30, textAlign: 'left' }}>{p.progress}%</span>
      </div>
    )}
  </div>
);

const ScreenDashboard = ({ onOpen }) => {
  const { ORDERS, PRINTERS, INVOICES, RECEIPTS } = window.DATA;
  const [selectedOrder, setSelectedOrder] = React.useState(null);

  const activeOrders = ORDERS.filter(o => ['design','printing','finishing','ready','awaiting'].includes(o.status));
  const urgent = activeOrders.filter(o => o.priority === 'high');

  const fmt = n => n > 0 ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '₪0';
  const monthRevenue = (RECEIPTS || []).reduce((s, r) => s + (r.amount || 0), 0);
  const pending = (INVOICES || [])
    .filter(i => i.status === 'open')
    .reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid">
        <KPI icon="banknote" tone="teal" label="הכנסות החודש" value={fmt(monthRevenue)} />
        <KPI icon="orders" tone="violet" label="הזמנות פעילות" value={activeOrders.length} />
        <KPI icon="fire" tone="warn" label="דחופות השבוע" value={urgent.length} />
        <KPI icon="wallet" tone="success" label="ממתין לגבייה" value={fmt(pending)} />
      </div>

      {/* Two-column area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginTop: 18 }}>
        <div className="card">
          <div className="card-header">
            <h3>הזמנות פעילות</h3>
            <div className="actions">
              <button className="btn sm ghost" onClick={() => onOpen('orders')}>
                ראה הכל
                <Icon name="arrow-left" size={14} />
              </button>
            </div>
          </div>
          <div className="card-body tight">
            <table className="table">
              <thead>
                <tr>
                  <th>לקוח</th>
                  <th>פרטי הזמנה</th>
                  <th>סטטוס</th>
                  <th>אספקה</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.slice(0, 7).map(o => {
                  const details = o.notes || o.desc || o.product || '';
                  const isLong  = details.length > 40;
                  return (
                    <tr
                      key={o.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedOrder(o)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-softer)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td>
                        <div className="name">{o.customer}</div>
                        <div className="text-xs mono muted">{o.id}</div>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        {details ? (
                          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isLong ? details.slice(0, 40) + '…' : details}
                          </div>
                        ) : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                      </td>
                      <td><StatusChip status={o.status} /></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.due || '—'}</div>
                        {o.priority === 'high' && (
                          <div className="text-xs" style={{ color: 'var(--danger)' }}>● דחוף</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {activeOrders.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>אין הזמנות פעילות</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>מצב מכונות</h3>
            <div className="actions">
              <span className="live-dot"></span>
              <button className="btn sm ghost" onClick={() => onOpen('printers')}>
                ראה הכל
                <Icon name="arrow-left" size={14} />
              </button>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRINTERS.slice(0, 4).map(p => <PrinterMini key={p.id} p={p} />)}
          </div>
        </div>
      </div>

      {/* Order detail modal — opened by clicking a row */}
      {selectedOrder && window.OrderDetailModal && (
        <window.OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

window.ScreenDashboard = ScreenDashboard;
