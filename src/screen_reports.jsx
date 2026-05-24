// Reports & profitability — real data from DB

async function exportMonthlyReport(data) {
  const { monthRev, monthInvs, colRate, paidInvs, totalInvs, avgOrder, top5, methodData, fmt, monthLabel, VAT_RATE } = data;

  const el = document.createElement('div');
  el.style.cssText = 'direction:rtl;font-family:Arial,sans-serif;padding:32px;color:#181C1B;background:#fff;max-width:800px;margin:0 auto';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:18px;margin-bottom:28px;border-bottom:2px solid #1FA89B;padding-bottom:18px">
      <img src="assets/logo.jpeg" crossorigin="anonymous" style="height:64px;border-radius:10px" />
      <div>
        <div style="font-size:22px;font-weight:800">מג'יק פרינט — דוח חודשי</div>
        <div style="font-size:14px;color:#6E7470;margin-top:4px">${monthLabel} · שיעור מע"מ ${VAT_RATE}%</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;margin-bottom:28px">
      ${[
        { label: 'הכנסות החודש', val: `₪${fmt(monthRev)}` },
        { label: 'שיעור גבייה',  val: `${colRate}%` },
        { label: 'חשבוניות',    val: `${paidInvs}/${totalInvs} שולמו` },
        { label: 'ממוצע הזמנה', val: `₪${fmt(avgOrder)}` },
      ].map(k => `
        <div style="background:#F4F2EC;border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:11px;color:#6E7470;margin-bottom:6px">${k.label}</div>
          <div style="font-size:18px;font-weight:700">${k.val}</div>
        </div>
      `).join('')}
    </div>
    ${top5.length > 0 ? `
      <div style="margin-bottom:24px">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;color:#1FA89B">5 לקוחות מובילים</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#F4F2EC">
            <th style="padding:8px;text-align:right">#</th>
            <th style="padding:8px;text-align:right">לקוח</th>
            <th style="padding:8px;text-align:left">הזמנות</th>
            <th style="padding:8px;text-align:left">סה"כ</th>
          </tr></thead>
          <tbody>${top5.map((c, i) => `
            <tr style="border-top:1px solid #eee">
              <td style="padding:8px">${i + 1}</td>
              <td style="padding:8px;font-weight:600">${c.name}</td>
              <td style="padding:8px;text-align:left">${c.orders_count || 0}</td>
              <td style="padding:8px;text-align:left;font-weight:700">₪${fmt(c.lifetime || 0)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    ` : ''}
    ${methodData.length > 0 ? `
      <div>
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;color:#1FA89B">פילוח שיטות תשלום</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#F4F2EC">
            <th style="padding:8px;text-align:right">שיטה</th>
            <th style="padding:8px;text-align:left">אחוז</th>
            <th style="padding:8px;text-align:left">סכום</th>
          </tr></thead>
          <tbody>${methodData.map(m => `
            <tr style="border-top:1px solid #eee">
              <td style="padding:8px;font-weight:600">${m.name}</td>
              <td style="padding:8px;text-align:left">${m.pct}%</td>
              <td style="padding:8px;text-align:left;font-weight:700">₪${fmt(m.sum)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    ` : ''}
    <div style="margin-top:28px;padding-top:14px;border-top:1px solid #ddd;font-size:11px;color:#9CA098;text-align:center">
      הופק אוטומטית על ידי מג'יק פרינט · ${new Date().toLocaleDateString('he-IL')}
    </div>
  `;

  document.body.appendChild(el);
  try {
    await html2pdf().set({
      margin: 0,
      filename: `דוח-חודשי-${monthLabel}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save();
  } finally {
    document.body.removeChild(el);
  }
}

const ScreenReports = () => {
  const { ORDERS, INVOICES, RECEIPTS, CUSTOMERS } = window.DATA;

  // ── Date helpers ─────────────────────────────────────────────────────────────
  const now = new Date();
  const CY  = now.getFullYear();
  const CM  = now.getMonth() + 1; // 1-based

  const parseDate = (s) => {
    if (!s) return null;
    const p = String(s).split('.');
    if (p.length < 3) return null;
    return { d: +p[0], m: +p[1], y: 2000 + +p[2] };
  };
  const sameMonth = (s, y, m) => { const p = parseDate(s); return p && p.y === y && p.m === m; };

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const prevM = CM === 1 ? 12 : CM - 1;
  const prevY = CM === 1 ? CY - 1 : CY;

  const monthInvs  = INVOICES.filter(i => sameMonth(i.date, CY, CM));
  const prevInvs   = INVOICES.filter(i => sameMonth(i.date, prevY, prevM));
  const monthRev   = monthInvs.reduce((s, i) => s + (i.total || 0), 0);
  const prevRev    = prevInvs.reduce((s, i) => s + (i.total || 0), 0);
  const revDelta   = prevRev > 0 ? ((monthRev - prevRev) / prevRev * 100).toFixed(1) : null;

  const monthOrds  = ORDERS.filter(o => sameMonth(o.date, CY, CM));
  const prevOrds   = ORDERS.filter(o => sameMonth(o.date, prevY, prevM));
  const ordDelta   = monthOrds.length - prevOrds.length;

  const realOrders = ORDERS.filter(o => !o.asDraft && (o.price || 0) > 0);
  const avgOrder   = realOrders.length > 0
    ? Math.round(realOrders.reduce((s, o) => s + (o.price || 0), 0) / realOrders.length) : 0;

  const paidInvs   = INVOICES.filter(i => i.status === 'paid').length;
  const colRate    = INVOICES.length > 0 ? Math.round((paidInvs / INVOICES.length) * 100) : 0;

  // ── 6-month revenue chart ────────────────────────────────────────────────────
  const HE_MONTHS = ['', 'ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יול׳', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצ׳'];
  const months6 = Array.from({ length: 6 }, (_, i) => {
    let m = CM - (5 - i); let y = CY;
    if (m <= 0) { m += 12; y -= 1; }
    const rev  = INVOICES.filter(inv => sameMonth(inv.date, y, m)).reduce((s, inv) => s + (inv.total || 0), 0);
    const coll = RECEIPTS.filter(r  => sameMonth(r.date,   y, m)).reduce((s, r)   => s + (r.amount || 0), 0);
    return { label: HE_MONTHS[m], rev, coll, current: i === 5 };
  });
  const maxBar = Math.max(...months6.map(m => Math.max(m.rev, m.coll)), 1);
  const barH   = (v) => `${Math.round((v / maxBar) * 82) + (v > 0 ? 4 : 0)}%`;

  // ── Payment method breakdown ─────────────────────────────────────────────────
  const METHOD_COLORS = { 'אשראי': 'var(--teal)', 'מזומן': '#2F9466', 'BIT': '#6E6BB8', 'העברה בנקאית': '#D89B3A' };
  const totalRcpts = RECEIPTS.reduce((s, r) => s + (r.amount || 0), 0);
  const methodData = Object.entries(METHOD_COLORS).map(([name, color]) => {
    const sum = RECEIPTS.filter(r => r.method === name).reduce((s, r) => s + (r.amount || 0), 0);
    return { name, color, sum, pct: totalRcpts > 0 ? Math.round((sum / totalRcpts) * 100) : 0 };
  }).filter(m => m.sum > 0).sort((a, b) => b.sum - a.sum);

  // ── Top 5 customers ──────────────────────────────────────────────────────────
  const top5 = [...CUSTOMERS]
    .filter(c => (c.lifetime || 0) > 0 || (c.orders_count || 0) > 0)
    .sort((a, b) => (b.lifetime || 0) - (a.lifetime || 0))
    .slice(0, 5);

  // ── Order status breakdown ───────────────────────────────────────────────────
  const STATUS_META = {
    awaiting:  { label: 'ממתין לאישור', color: '#D89B3A' },
    design:    { label: 'עיצוב',        color: '#6E6BB8' },
    printing:  { label: 'הדפסה',        color: 'var(--teal)' },
    finishing: { label: 'גימור',        color: '#2F9466' },
    ready:     { label: 'מוכן לאיסוף',  color: '#3FBFB3' },
    done:      { label: 'הושלם',        color: '#9CA098' },
    draft:     { label: 'טיוטה',        color: '#C0BCB0' },
  };
  const statusRows = Object.entries(STATUS_META).map(([k, { label, color }]) => ({
    key: k, label, color, count: ORDERS.filter(o => o.status === k).length,
  })).filter(s => s.count > 0);

  const completedOrds = ORDERS.filter(o => o.status === 'done').length;
  const totalNonDraft = ORDERS.filter(o => !o.asDraft).length;

  const fmt = n => Math.round(n || 0).toLocaleString();

  const [exporting, setExporting] = React.useState(false);

  const HE_MONTH_NAMES = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const monthLabel = `${HE_MONTH_NAMES[CM]} ${CY}`;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportMonthlyReport({ monthRev, monthInvs, colRate, paidInvs, totalInvs: INVOICES.length, avgOrder, top5, methodData, fmt, monthLabel, VAT_RATE: window.DATA.VAT_RATE });
    } catch (e) { console.error('PDF export failed:', e); }
    setExporting(false);
  };

  const sendToAccountant = async () => {
    try {
      const s = await fetch('/api/settings').then(r => r.json());
      const email = s.accountant_email || '';
      const subject = encodeURIComponent(`דוח חודשי מג'יק פרינט — ${monthLabel}`);
      const body = encodeURIComponent(
        `שלום,\n\nמצורף דוח חודשי עבור ${monthLabel}:\n\nהכנסות: ₪${fmt(monthRev)}\nשיעור גבייה: ${colRate}%\nחשבוניות: ${paidInvs}/${INVOICES.length} שולמו\n\nבברכה,\nמג'יק פרינט`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    } catch {}
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={handleExport} disabled={exporting}>
          <Icon name="download" size={14} /> {exporting ? 'מייצא...' : 'ייצא דוח PDF'}
        </button>
        <button className="btn teal" onClick={sendToAccountant}>
          <Icon name="send" size={14} /> שלח לרואה חשבון
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon teal"><Icon name="banknote" size={16} /></div>
            <div className="kpi__label">הכנסות החודש</div>
          </div>
          <div className="kpi__value">₪{fmt(monthRev)}</div>
          <div className="kpi__delta">
            {revDelta !== null
              ? <><b className={+revDelta >= 0 ? '' : 'down'}>{+revDelta >= 0 ? '▲' : '▼'} {Math.abs(revDelta)}%</b><span>מול חודש קודם</span></>
              : <span>{monthInvs.length} חשבוניות</span>}
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon success"><Icon name="check-circle" size={16} /></div>
            <div className="kpi__label">שיעור גבייה</div>
          </div>
          <div className="kpi__value">{colRate}%</div>
          <div className="kpi__delta"><span>{paidInvs} שולמו מתוך {INVOICES.length}</span></div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon violet"><Icon name="orders" size={16} /></div>
            <div className="kpi__label">הזמנות החודש</div>
          </div>
          <div className="kpi__value">{monthOrds.length}</div>
          <div className="kpi__delta">
            {prevOrds.length > 0
              ? <><b className={ordDelta >= 0 ? '' : 'down'}>{ordDelta >= 0 ? '▲' : '▼'} {Math.abs(ordDelta)}</b><span>מול חודש קודם</span></>
              : <span>סה"כ {ORDERS.length} הזמנות</span>}
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon warn"><Icon name="tag" size={16} /></div>
            <div className="kpi__label">ערך הזמנה ממוצע</div>
          </div>
          <div className="kpi__value">₪{fmt(avgOrder)}</div>
          <div className="kpi__delta"><span>{realOrders.length} הזמנות בחישוב</span></div>
        </div>

      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>

        {/* 6-month bar chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>הכנסות וגבייה · 6 חודשים</h3>
              <div className="sub">חשבוניות שהוצאו לעומת סכומים שנגבו</div>
            </div>
            <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--teal)' }}></span>
                <span>חשבוניות</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--teal-soft)' }}></span>
                <span>גבייה</span>
              </div>
            </div>
          </div>
          <div className="card-body">
            {months6.every(m => m.rev === 0 && m.coll === 0) ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#9CA098', fontSize: 13 }}>
                <Icon name="chart" size={28} />
                <span>אין נתונים — הוסף חשבוניות וקבלות כדי לראות את הגרף</span>
              </div>
            ) : (
              <div className="bar-chart" style={{ height: 220 }}>
                {months6.map(m => (
                  <div key={m.label} className="col">
                    <div style={{ position: 'relative', flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      <div title={`חשבוניות: ₪${fmt(m.rev)}`} style={{
                        flex: 1,
                        background: m.current
                          ? 'linear-gradient(180deg,var(--teal),var(--teal-2))'
                          : 'linear-gradient(180deg,#3FBFB3,#1FA89B)',
                        borderRadius: '6px 6px 2px 2px',
                        height: barH(m.rev),
                        transition: 'height .3s',
                      }} />
                      <div title={`גבייה: ₪${fmt(m.coll)}`} style={{
                        flex: 1,
                        background: 'var(--teal-soft)',
                        borderRadius: '6px 6px 2px 2px',
                        height: barH(m.coll),
                        transition: 'height .3s',
                      }} />
                    </div>
                    <div className="label" style={{ fontWeight: m.current ? 700 : 400, color: m.current ? 'var(--ink)' : '' }}>
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment method breakdown */}
        <div className="card">
          <div className="card-header">
            <h3>פילוח שיטות תשלום</h3>
            <div className="sub">לפי סכום גבייה כולל</div>
          </div>
          <div className="card-body">
            {methodData.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#9CA098', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Icon name="credit-card" size={28} />
                <span>אין קבלות עדיין</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {methodData.map(p => (
                  <div key={p.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      <span className="mono muted" style={{ marginInlineStart: 'auto' }}>{p.pct}%</span>
                      <span className="mono" style={{ fontWeight: 600, minWidth: 60, textAlign: 'left' }}>₪{fmt(p.sum)}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-deep)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${p.pct}%`, height: '100%', background: p.color, borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 4, fontSize: 12, color: '#9CA098', textAlign: 'left' }}>
                  סה"כ: ₪{fmt(totalRcpts)} · {RECEIPTS.length} קבלות
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginTop: 18 }}>

        {/* Top 5 customers */}
        <div className="card">
          <div className="card-header">
            <h3>5 לקוחות מובילים</h3>
            <div className="sub">לפי שווי עסקאות מצטבר</div>
          </div>
          <div className="card-body" style={{ padding: '8px 0' }}>
            {top5.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#9CA098', fontSize: 13 }}>
                אין לקוחות עם עסקאות עדיין
              </div>
            ) : top5.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', gap: 11, padding: '10px 22px', alignItems: 'center' }}>
                <span className="mono muted" style={{ fontSize: 12, minWidth: 16 }}>{i + 1}</span>
                <Avatar name={c.name.charAt(0)} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div className="text-xs muted">{c.orders_count || 0} הזמנות</div>
                </div>
                <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>₪{fmt(c.lifetime || 0)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Order status breakdown */}
        <div className="card">
          <div className="card-header">
            <h3>הזמנות לפי סטטוס</h3>
            <div className="sub">מצב כל ההזמנות במערכת</div>
          </div>
          <div className="card-body" style={{ padding: '8px 0' }}>
            {statusRows.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#9CA098', fontSize: 13 }}>
                אין הזמנות במערכת עדיין
              </div>
            ) : (
              <>
                {statusRows.map(s => (
                  <div key={s.key} style={{ padding: '9px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
                    <div style={{ width: 80, height: 5, background: 'var(--bg-deep)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(s.count / ORDERS.length) * 100}%`, height: '100%', background: s.color, borderRadius: 3 }} />
                    </div>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'left' }}>{s.count}</span>
                  </div>
                ))}
                <div style={{ padding: '8px 22px', fontSize: 12, color: '#9CA098', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                  סה"כ {ORDERS.length} הזמנות · {completedOrds} הושלמו
                </div>
              </>
            )}
          </div>
        </div>

        {/* Collection rate donut */}
        <div className="card">
          <div className="card-header">
            <h3>שיעור גבייה</h3>
            <div className="sub">חשבוניות שסולקו</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 140, height: 140, position: 'relative' }}>
              <svg viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="58" stroke="var(--bg-deep)" strokeWidth="14" fill="none" />
                <circle cx="70" cy="70" r="58"
                  stroke={colRate === 100 ? '#2F9466' : 'var(--teal)'}
                  strokeWidth="14" fill="none"
                  strokeDasharray={`${(colRate / 100) * 2 * Math.PI * 58} ${2 * Math.PI * 58}`}
                  strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{colRate}%</div>
                  <div className="text-xs muted">{paidInvs} / {INVOICES.length}</div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#6E7470', textAlign: 'center', lineHeight: 1.6 }}>
              {INVOICES.length === 0
                ? 'אין חשבוניות עדיין'
                : INVOICES.length - paidInvs === 0
                  ? '✓ כל החשבוניות שולמו'
                  : `${INVOICES.length - paidInvs} חשבוניות ממתינות לתשלום`}
            </div>
            {totalRcpts > 0 && (
              <div style={{ fontSize: 12, color: '#9CA098' }}>
                גבייה כוללת: ₪{fmt(totalRcpts)}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

window.ScreenReports = ScreenReports;
