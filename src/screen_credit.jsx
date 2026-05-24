// Credit card aggregation — monthly collections vs bank deposits

const ScreenCredit = () => {
  const { RECEIPTS } = window.DATA;
  const [deposits,  setDeposits]  = React.useState([]);
  const [editMonth, setEditMonth] = React.useState(null); // 'YYYY-MM'
  const [editVal,   setEditVal]   = React.useState('');
  const [saving,    setSaving]    = React.useState(false);
  const [expanded,  setExpanded]  = React.useState(null); // 'YYYY-MM'

  React.useEffect(() => {
    fetch('/api/credit-deposits').then(r => r.json()).then(setDeposits).catch(() => {});
  }, []);

  // Parse 'DD.MM.YY' → 'YYYY-MM' key
  const toMonthKey = (s) => {
    if (!s) return null;
    const p = String(s).split('.');
    if (p.length < 3) return null;
    const mm = p[1].padStart(2, '0');
    const yy = p[2];
    return `20${yy}-${mm}`;
  };

  // Filter only credit receipts
  const creditReceipts = RECEIPTS.filter(r => r.method === 'אשראי');

  // Group by month
  const byMonth = {};
  creditReceipts.forEach(r => {
    const key = toMonthKey(r.date);
    if (!key) return;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(r);
  });

  // Merge with deposits
  const depositMap = {};
  deposits.forEach(d => { depositMap[d.month] = d.deposited; });

  // All months that appear in either receipts or deposits
  const allMonths = [...new Set([
    ...Object.keys(byMonth),
    ...deposits.map(d => d.month),
  ])].sort().reverse();

  const totalCollected = creditReceipts.reduce((s, r) => s + (r.amount || 0), 0);
  const totalDeposited = deposits.reduce((s, d) => s + (d.deposited || 0), 0);
  const totalPending   = totalCollected - totalDeposited;

  const fmt = n => Math.round(n || 0).toLocaleString();

  const startEdit = (month) => {
    setEditMonth(month);
    setEditVal(String(depositMap[month] || ''));
  };

  const saveDeposit = async (month) => {
    setSaving(true);
    try {
      await fetch('/api/credit-deposits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, deposited: parseFloat(editVal) || 0 }),
      });
      const updated = await fetch('/api/credit-deposits').then(r => r.json());
      setDeposits(updated);
    } catch {}
    setSaving(false);
    setEditMonth(null);
  };

  const heMonth = (key) => {
    if (!key) return '';
    const [y, m] = key.split('-');
    const NAMES = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return `${NAMES[+m] || m} ${y}`;
  };

  return (
    <div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon teal"><Icon name="credit-card" size={16} /></div>
            <div className="kpi__label">סה"כ גביות אשראי</div>
          </div>
          <div className="kpi__value">₪{fmt(totalCollected)}</div>
          <div className="kpi__delta"><span>{creditReceipts.length} קבלות אשראי</span></div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon success"><Icon name="check-circle" size={16} /></div>
            <div className="kpi__label">סה"כ הופקד</div>
          </div>
          <div className="kpi__value">₪{fmt(totalDeposited)}</div>
          <div className="kpi__delta"><span>בחשבון הבנק</span></div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon" style={{ background: totalPending > 0 ? 'var(--warn-soft)' : 'var(--success-soft)', color: totalPending > 0 ? 'var(--warn)' : 'var(--success)' }}>
              <Icon name="clock" size={16} />
            </div>
            <div className="kpi__label">ממתין לסילוק</div>
          </div>
          <div className="kpi__value" style={{ color: totalPending > 0 ? 'var(--warn)' : 'var(--success)' }}>
            ₪{fmt(totalPending)}
          </div>
          <div className="kpi__delta">
            <span>{totalPending <= 0 ? '✓ הכל סולק' : 'טרם הופקד בבנק'}</span>
          </div>
        </div>
      </div>

      {/* Monthly table */}
      <div className="card">
        <div className="card-header">
          <h3>פירוט לפי חודש</h3>
          <div className="sub">גביות אשראי מול הפקדות בנק</div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {allMonths.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              <Icon name="credit-card" size={28} />
              <div style={{ marginTop: 10 }}>אין קבלות אשראי עדיין</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '11px 20px', textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>חודש</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>גביות אשראי</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>הופקד בבנק</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>הפרש</th>
                  <th style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>עריכה</th>
                </tr>
              </thead>
              <tbody>
                {allMonths.map(month => {
                  const monthReceipts = byMonth[month] || [];
                  const collected = monthReceipts.reduce((s, r) => s + (r.amount || 0), 0);
                  const deposited = depositMap[month] || 0;
                  const diff      = collected - deposited;
                  const isExpanded = expanded === month;

                  const diffColor = diff < -0.01 ? '#C53030' : diff < 0.01 ? 'var(--success)' : 'var(--warn)';
                  const diffLabel = diff < -0.01 ? 'חריגה' : diff < 0.01 ? 'מסולק' : 'ממתין';

                  return (
                    <React.Fragment key={month}>
                      <tr
                        style={{ borderBottom: '1px solid var(--border)', cursor: monthReceipts.length > 0 ? 'pointer' : 'default' }}
                        onClick={() => monthReceipts.length > 0 && setExpanded(isExpanded ? null : month)}
                      >
                        <td style={{ padding: '13px 20px', fontWeight: 600 }}>
                          {monthReceipts.length > 0 && (
                            <Icon name={isExpanded ? 'minus' : 'plus'} size={12} style={{ marginInlineEnd: 8, color: 'var(--text-muted)' }} />
                          )}
                          {heMonth(month)}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'left', fontFamily: 'monospace', fontWeight: 600 }}>
                          ₪{fmt(collected)}
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 6 }}>({monthReceipts.length})</span>
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'left' }}>
                          {editMonth === month ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                              <input
                                type="number" value={editVal} autoFocus
                                onChange={e => setEditVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveDeposit(month); if (e.key === 'Escape') setEditMonth(null); }}
                                style={{ width: 100, padding: '4px 8px', border: '1px solid var(--teal)', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}
                              />
                              <button className="btn sm teal" onClick={() => saveDeposit(month)} disabled={saving}>✓</button>
                              <button className="btn sm ghost" onClick={() => setEditMonth(null)}>✗</button>
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {deposited > 0 ? `₪${fmt(deposited)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'left' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                            background: diff < -0.01 ? 'var(--danger-soft)' : diff < 0.01 ? 'var(--success-soft)' : 'var(--warn-soft)',
                            color: diffColor,
                          }}>
                            {diff < 0 ? `▲ ₪${fmt(Math.abs(diff))}` : diff > 0.01 ? `▼ ₪${fmt(diff)}` : diffLabel}
                          </span>
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button className="btn sm ghost" onClick={() => startEdit(month)} title="ערוך הפקדה">
                            <Icon name="edit" size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Accordion: receipts for this month */}
                      {isExpanded && monthReceipts.length > 0 && (
                        <tr style={{ background: 'var(--bg-deep)' }}>
                          <td colSpan={5} style={{ padding: '0 0 8px' }}>
                            <div style={{ padding: '10px 28px 6px' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                                קבלות אשראי — {heMonth(month)}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {monthReceipts.map(r => (
                                  <div key={r.id} style={{
                                    display: 'flex', gap: 12, padding: '7px 12px',
                                    background: 'var(--bg-card)', borderRadius: 8, fontSize: 13,
                                    alignItems: 'center',
                                  }}>
                                    <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 80 }}>{r.id}</span>
                                    <span style={{ flex: 1, fontWeight: 500 }}>{r.customer}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.date}</span>
                                    {r.card && <span style={{ fontSize: 11, background: 'var(--teal-soft)', color: 'var(--teal-3)', padding: '2px 8px', borderRadius: 4 }}>{r.card}</span>}
                                    <span className="mono" style={{ fontWeight: 700 }}>₪{fmt(r.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

window.ScreenCredit = ScreenCredit;
