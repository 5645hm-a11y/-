// Orders screen - kanban view + table view + order detail modal

// ── Order Detail Modal ────────────────────────────────────────────────────────
const OrderDetailModal = ({ order, onClose }) => {
  const [status,   setStatus]   = React.useState(order.status);
  const [priority, setPriority] = React.useState(order.priority || 'medium');
  const [assignee, setAssignee] = React.useState(order.assignee || '');
  const [notes,    setNotes]    = React.useState(order.notes || order.desc || '');
  const [due,      setDue]      = React.useState(order.due || '');
  const [busy,       setBusy]       = React.useState(false);
  const [saved,      setSaved]      = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);

  const { STATUS, STATUS_FLOW, USERS } = window.DATA;
  const VAT_RATE  = window.DATA.VAT_RATE || 18;
  const subtotal  = parseFloat(order.price) || 0;
  const vat       = +(subtotal * VAT_RATE / 100).toFixed(2);
  const total     = +(subtotal + vat).toFixed(2);
  const fmt       = n => `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;

  const fullFlow = ['pending', ...STATUS_FLOW, 'delivered', 'paid'];
  const currentIdx = fullFlow.indexOf(status);

  const handleSave = async () => {
    setBusy(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, priority, assignee, notes, due }),
      });
      await window.refreshData();
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
      await window.refreshData();
      onClose();
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };

  const stateColor = { printing: 'teal', idle: 'muted', maint: 'warn', error: 'danger' };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>

        {/* ── Head ── */}
        <div className="modal__head">
          <div style={{ width: 38, height: 38, background: 'var(--teal-soft)', color: 'var(--teal-3)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <Icon name="orders" size={18} />
          </div>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ fontSize: 15 }}>{order.id}</span>
              <StatusChip status={status} />
              {priority === 'high' && <Chip tone="danger" dot={false}>דחוף</Chip>}
            </h2>
            <div className="sub">{order.customer} · התקבלה {order.received || order.created_at?.slice(0,10) || '—'}</div>
          </div>
          <button className="icon-btn" style={{ marginInlineStart: 'auto' }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="modal__body">

          {/* ── Status flow ── */}
          <div style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 10 }}><h2>סטטוס הזמנה</h2></div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {fullFlow.map((s, i) => {
                const st = STATUS[s];
                if (!st) return null;
                const isCurrent = s === status;
                const isPast    = i < currentIdx;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      border: isCurrent ? '2px solid var(--teal)' : '1.5px solid var(--border)',
                      background: isCurrent ? 'var(--teal-softer)' : isPast ? 'var(--surface-alt)' : '#fff',
                      color: isCurrent ? 'var(--teal-3)' : isPast ? 'var(--ink-3)' : 'var(--ink-2)',
                      fontSize: 12.5,
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {isPast && <span style={{ color: 'var(--success)' }}>✓</span>}
                    {isCurrent && <span style={{ color: 'var(--teal)' }}>●</span>}
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Two columns: details + edit ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, borderTop: '1px solid var(--border)', paddingTop: 20 }}>

            {/* Left: order info */}
            <div>
              <div className="section-title" style={{ marginBottom: 10 }}><h2>פרטי ההזמנה</h2></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
                {order.customer && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: 'var(--ink-3)', minWidth: 80 }}>לקוח</span>
                    <b>{order.customer}</b>
                  </div>
                )}
                {order.product && order.product !== 'הזמנת עבודה' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: 'var(--ink-3)', minWidth: 80 }}>מוצר</span>
                    <span>{order.product}</span>
                  </div>
                )}
                {order.qty > 0 && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: 'var(--ink-3)', minWidth: 80 }}>כמות</span>
                    <span>{order.qty.toLocaleString()} יח'</span>
                  </div>
                )}
                {subtotal > 0 && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: 'var(--ink-3)', minWidth: 80 }}>מחיר</span>
                    <span>
                      {fmt(subtotal)} + מע"מ {VAT_RATE}% = <b>{fmt(total)}</b>
                    </span>
                  </div>
                )}
                {order.received && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: 'var(--ink-3)', minWidth: 80 }}>התקבלה</span>
                    <span>{order.received}</span>
                  </div>
                )}
              </div>

              {(notes || order.desc) && (
                <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-alt)', borderRadius: 9, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {notes || order.desc}
                </div>
              )}
            </div>

            {/* Right: editable fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Due date */}
              <div className="field">
                <label>תאריך אספקה</label>
                <input value={due} onChange={e => setDue(e.target.value)} placeholder="21.05.2026" />
              </div>

              {/* Priority */}
              <div className="field">
                <label>עדיפות</label>
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  {[
                    { id: 'low',    label: 'נמוכה', tone: '#9CA098' },
                    { id: 'medium', label: 'רגילה', tone: 'var(--teal-2)' },
                    { id: 'high',   label: 'דחוף',  tone: 'var(--danger)' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      style={{
                        flex: 1, padding: '8px 4px',
                        border: `1.5px solid ${priority === p.id ? p.tone : 'var(--border)'}`,
                        borderRadius: 8,
                        background: priority === p.id ? '#fff' : 'var(--surface)',
                        fontSize: 12, fontWeight: 600,
                        color: priority === p.id ? p.tone : 'var(--ink-2)',
                        cursor: 'pointer',
                      }}
                    >● {p.label}</button>
                  ))}
                </div>
              </div>

              {/* Notes edit */}
              <div className="field" style={{ flex: 1 }}>
                <label>הערות / תיאור עבודה</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%', minHeight: 90,
                    border: '1px solid var(--border)', borderRadius: 9,
                    padding: '10px 12px', fontSize: 13, lineHeight: 1.6,
                    resize: 'vertical', background: '#fff', fontFamily: 'inherit', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--teal)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>סגור</button>

          {/* Delete — shows confirm inline */}
          {confirmDel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginInlineStart: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>למחוק את ההזמנה?</span>
              <button className="btn sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete} disabled={busy}>
                {busy ? '...' : 'כן, מחק'}
              </button>
              <button className="btn sm ghost" onClick={() => setConfirmDel(false)} disabled={busy}>ביטול</button>
            </div>
          ) : (
            <button
              className="btn ghost"
              style={{ color: 'var(--danger)', borderColor: 'transparent', marginInlineStart: 8 }}
              onClick={() => setConfirmDel(true)}
              disabled={busy}
            >
              <Icon name="x" size={14} /> מחק הזמנה
            </button>
          )}

          <button className="btn ghost" onClick={() => window.open(`documents.html?type=order&id=${encodeURIComponent(order.id)}`, '_blank', 'width=960,height=1100,menubar=no,toolbar=no')}>
            <Icon name="download" size={14} /> הדפס הזמנה
          </button>

          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>✓ נשמר</span>}
            <button className="btn teal" onClick={handleSave} disabled={busy}>
              <Icon name="check" size={14} />
              {busy ? 'שומר...' : 'עדכן הזמנה'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Kanban card ───────────────────────────────────────────────────────────────
const KanbanCard = ({ o, onClick }) => (
  <div className="kanban__card" onClick={onClick} style={{ cursor: 'pointer' }}>
    <div className="flex items-center" style={{ gap: 8 }}>
      <span className="id">{o.id}</span>
      <div style={{ marginInlineStart: 'auto' }}>
        {o.priority === 'high' && <Chip tone="danger" dot={false}>דחוף</Chip>}
      </div>
    </div>
    <div className="title">{o.customer}</div>
    {o.notes && (
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {o.notes}
      </div>
    )}
    {o.progress > 0 && o.progress < 100 && (
      <div className="bar"><div style={{ width: `${o.progress}%` }}></div></div>
    )}
    <div className="meta">
      {o.assignee ? <><Avatar name={o.assignee.charAt(0)} size={20} /><span>{o.assignee}</span></> : <span style={{ color: 'var(--ink-4)' }}>לא שויך</span>}
      <span style={{ marginInlineStart: 'auto' }}>
        <Icon name="calendar" size={12} style={{ verticalAlign: -2 }} /> {o.due || '—'}
      </span>
    </div>
  </div>
);

const KANBAN_COLS = [
  { id: 'awaiting',  label: 'ממתינות לאישור', color: '#D89B3A' },
  { id: 'design',    label: 'בעיצוב',         color: '#6E6BB8' },
  { id: 'printing',  label: 'בדפוס',          color: '#1FA89B' },
  { id: 'finishing', label: 'בגימור',         color: '#1FA89B' },
  { id: 'ready',     label: 'מוכן לאיסוף',    color: '#2F9466' },
];

// ── Main screen ───────────────────────────────────────────────────────────────
const ScreenOrders = ({ onOpenNewOrder }) => {
  const [filter,        setFilter]        = React.useState('all');
  const [search,        setSearch]        = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const { ORDERS } = window.DATA;

  const filtered = ORDERS.filter(o => {
    if (filter === 'urgent') return o.priority === 'high';
    if (filter === 'pending') return o.status === 'pending';
    return true;
  }).filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (o.id || '').toLowerCase().includes(q) ||
           (o.customer || '').includes(q) ||
           (o.notes || '').includes(q);
  });

  return (
    <div>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={15} />
          <input
            placeholder="חפש לפי לקוח, מספר הזמנה..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filters">
          <button className={`filter-btn ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>
            הכל <span style={{ opacity: .6 }}>· {ORDERS.length}</span>
          </button>
          <button className={`filter-btn ${filter==='urgent'?'active':''}`} onClick={() => setFilter('urgent')}>
            <Icon name="fire" size={13} />
            דחופות <span style={{ opacity: .6 }}>· {ORDERS.filter(o => o.priority === 'high').length}</span>
          </button>
          <button className={`filter-btn ${filter==='pending'?'active':''}`} onClick={() => setFilter('pending')}>
            הצעות מחיר
          </button>
        </div>
        <div style={{ marginInlineStart: 'auto' }}>
          <button className="btn teal" onClick={onOpenNewOrder}>
            <Icon name="plus" size={15} />
            הזמנה חדשה
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>מספר</th>
              <th>לקוח</th>
              <th>פרטי הזמנה</th>
              <th>סטטוס</th>
              <th>אספקה</th>
              <th>מחיר</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-softer)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td className="mono" style={{ fontSize: 12 }}>{o.id}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{o.customer || '—'}</div>
                </td>
                <td style={{ maxWidth: 300 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.notes || o.desc || '—'}
                  </div>
                </td>
                <td><StatusChip status={o.status} /></td>
                <td>
                  <div>{o.due || '—'}</div>
                  {o.priority === 'high' && (
                    <div className="text-xs" style={{ color: 'var(--danger)' }}>● דחוף</div>
                  )}
                </td>
                <td className="mono">
                  {o.price > 0 ? `₪${o.price.toLocaleString()}` : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>אין הזמנות</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

window.ScreenOrders = ScreenOrders;
window.OrderDetailModal = OrderDetailModal;
