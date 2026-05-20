// Receipts screen — full functionality with real data

// ── Helpers ───────────────────────────────────────────────────────────────────
function rcptTodayString() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(-2)}`;
}

function rcptMonthSuffix() {
  const d = new Date();
  return `.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(-2)}`;
}

function W2(text, maxLen = 60) {
  if (!text) return '';
  const words = String(text).split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + (cur ? ' ' : '') + w).length > maxLen) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.join('<br/>');
}

// ── Download receipt PDF ──────────────────────────────────────────────────────
async function downloadReceiptPDF(receipt) {
  let bizVat = '';
  try {
    const s = await fetch('/api/settings').then(r => r.json());
    bizVat = s.business_vat || '';
  } catch {}

  const sp = (s) => String(s || '').replace(/ /g, '&nbsp;');

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.97);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-size:18px;color:#333';
  overlay.textContent = 'מכין קובץ PDF...';
  document.body.appendChild(overlay);

  const el = document.createElement('div');
  el.style.cssText = 'font-family:Arial,sans-serif;direction:rtl;padding:44px;color:#111;max-width:680px;background:#fff;word-spacing:2px;letter-spacing:0.01px';
  el.innerHTML = `
    <div style="text-align:center;margin-bottom:28px;padding-bottom:22px;border-bottom:2px solid #1FA89B">
      <img src="assets/logo.jpeg" style="height:90px;object-fit:contain;border-radius:12px" crossorigin="anonymous" />
    </div>

    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:28px;font-weight:700;color:#181C1B;margin-bottom:6px">קבלה</div>
      <div style="font-size:14px;color:#555">
        מספר:&nbsp;<b>${sp(receipt.id)}</b>&nbsp;&nbsp;·&nbsp;&nbsp;תאריך:&nbsp;${sp(receipt.date)}
      </div>
      ${bizVat ? `<div style="font-size:12px;color:#888;margin-top:4px">ח.פ.&nbsp;/&nbsp;ע.מ.:&nbsp;${sp(bizVat)}</div>` : ''}
    </div>

    <div style="margin-bottom:18px;font-size:14px;padding:12px 16px;background:#f4f2ec;border-radius:8px">
      <b>לכבוד:</b>&nbsp;${sp(receipt.customer)}
    </div>

    <hr style="border:none;border-top:1px solid #ddd;margin:0 0 18px"/>

    <div style="background:#f8f8f6;border-radius:8px;padding:16px;margin-bottom:18px;font-size:14px;line-height:1.9">
      <div><b>אופן&nbsp;תשלום:</b>&nbsp;${sp(receipt.method)}${receipt.card ? `&nbsp;·&nbsp;כרטיס&nbsp;···${sp(receipt.card)}` : ''}</div>
      ${receipt.invoice ? `<div><b>לכיסוי&nbsp;חשבונית:</b>&nbsp;#${sp(receipt.invoice)}</div>` : ''}
    </div>

    <div style="background:#eaf7f6;border-radius:10px;padding:24px 20px;text-align:center;margin-bottom:20px">
      <div style="font-size:13px;color:#2B7B74;margin-bottom:6px;letter-spacing:0.5px">סכום&nbsp;שהתקבל</div>
      <div style="font-size:36px;font-weight:700;color:#1FA89B">&#8362;${parseFloat(receipt.amount).toLocaleString()}</div>
    </div>

    <div style="margin-top:36px;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:10px;text-align:center">
      ${sp(receipt.id)}&nbsp;·&nbsp;${sp(receipt.date)}
    </div>
  `;
  document.body.appendChild(el);
  try {
    await html2pdf().set({
      margin: 10,
      filename: `${receipt.id}.pdf`,
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save();
  } finally {
    document.body.removeChild(el);
    document.body.removeChild(overlay);
  }
}
window.downloadReceiptPDF = downloadReceiptPDF;

// ── New Receipt Modal ─────────────────────────────────────────────────────────
const NewReceiptModal = ({ open, onClose, onSubmit, busy }) => {
  const { INVOICES } = window.DATA;
  const openInvoices = INVOICES.filter(inv => inv.status !== 'paid');

  const initForm = { invoiceId: '', customer: '', method: 'אשראי', amount: '', card: '' };
  const [form, setForm]         = React.useState(initForm);
  const [selectedInv, setSelInv] = React.useState(null);

  React.useEffect(() => {
    if (!open) { setForm(initForm); setSelInv(null); }
  }, [open]);

  const onSelectInvoice = (id) => {
    const inv = INVOICES.find(i => i.id === id) || null;
    setSelInv(inv);
    setForm(f => ({
      ...f,
      invoiceId: id,
      customer:  inv ? inv.customer : f.customer,
      amount:    inv ? String(inv.total) : f.amount,
    }));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSubmit = form.customer.trim() && parseFloat(form.amount) > 0 && form.method;

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 500 }}>
        <div className="modal__head">
          <h2>קבלה חדשה</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label className="field-label">קישור לחשבונית (אופציונלי)</label>
            <select className="select" value={form.invoiceId} onChange={e => onSelectInvoice(e.target.value)}>
              <option value="">— ללא קישור לחשבונית ספציפית —</option>
              {openInvoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} · {inv.customer} · ₪{parseFloat(inv.total).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">שם לקוח <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input className="input" value={form.customer}
              onChange={e => set('customer', e.target.value)} placeholder="שם הלקוח" />
          </div>

          <div>
            <label className="field-label">אופן תשלום</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'אשראי',          icon: 'credit-card' },
                { id: 'מזומן',          icon: 'banknote'    },
                { id: 'BIT',            icon: 'phone'       },
                { id: 'העברה בנקאית',  icon: 'transfer'    },
              ].map(({ id, icon }) => (
                <button key={id}
                  className={`btn sm ${form.method === id ? 'teal' : 'ghost'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  onClick={() => set('method', id)}>
                  <Icon name={icon} size={14} />{id}
                </button>
              ))}
            </div>
          </div>

          {form.method === 'אשראי' && (
            <div>
              <label className="field-label">4 ספרות אחרונות של הכרטיס</label>
              <input className="input" maxLength={4} value={form.card}
                onChange={e => set('card', e.target.value.replace(/\D/g, ''))}
                placeholder="1234" style={{ maxWidth: 120 }} />
            </div>
          )}

          <div>
            <label className="field-label">סכום שהתקבל (₪) <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input className="input" type="number" min="0" step="0.01"
              value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            {selectedInv && (
              <div style={{ fontSize: 12, color: 'var(--teal-3)', marginTop: 4 }}>
                סכום החשבונית: ₪{parseFloat(selectedInv.total).toLocaleString()}
              </div>
            )}
          </div>

        </div>

        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>
          <button className="btn teal" disabled={!canSubmit || busy} onClick={() => onSubmit(form)}>
            {busy ? 'שומר...' : '✓ הפק קבלה'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Receipt detail modal ──────────────────────────────────────────────────────
const ReceiptDetailModal = ({ receipt, onClose }) => {
  if (!receipt) return null;
  const { INVOICES } = window.DATA;
  const linkedInv = receipt.invoice ? INVOICES.find(i => i.id === receipt.invoice) : null;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal__head">
          <h2>{receipt.id}</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--teal-soft)', borderRadius: 10, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--teal-3)', marginBottom: 4 }}>סכום שהתקבל</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--teal-3)' }}>
              ₪{parseFloat(receipt.amount).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#6E7470', marginTop: 4 }}>{receipt.date}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['לקוח',          receipt.customer],
              ['אופן תשלום',    receipt.method + (receipt.card ? ` ···${receipt.card}` : '')],
              ['תאריך',         receipt.date],
              ['מספר קבלה',     receipt.id],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bg-deep)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#6E7470', marginBottom: 2 }}>{k}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
              </div>
            ))}
          </div>

          {linkedInv && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#6E7470', marginBottom: 6 }}>חשבונית מקושרת</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{linkedInv.id}</div>
                  <div style={{ fontSize: 12, color: '#6E7470' }}>{linkedInv.type}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: 'var(--teal-3)' }}>
                    ₪{parseFloat(linkedInv.total).toLocaleString()}
                  </div>
                  <span className={`badge ${linkedInv.status === 'paid' ? 'success' : 'warn'}`} style={{ fontSize: 10 }}>
                    {linkedInv.status === 'paid' ? 'שולמה' : 'פתוחה'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose}>סגור</button>
          <button className="btn" onClick={() => downloadReceiptPDF(receipt)}>
            <Icon name="download" size={14} />
            הורד PDF
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const ScreenReceipts = () => {
  const { RECEIPTS, INVOICES } = window.DATA;

  const [search,       setSearch]  = React.useState('');
  const [methodFilter, setMethod]  = React.useState('הכל');
  const [newOpen,      setNewOpen] = React.useState(false);
  const [busy,         setBusy]    = React.useState(false);
  const [detail,       setDetail]  = React.useState(null);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const today    = rcptTodayString();
  const monthSfx = rcptMonthSuffix();

  const monthRecs  = RECEIPTS.filter(r => r.date && r.date.endsWith(monthSfx));
  const todayRecs  = RECEIPTS.filter(r => r.date === today);
  const totalMonth = monthRecs.reduce((s, r) => s + (r.amount || 0), 0);
  const totalToday = todayRecs.reduce((s, r) => s + (r.amount || 0), 0);

  const METHODS = ['אשראי', 'מזומן', 'BIT', 'העברה בנקאית'];
  const methodTotals = Object.fromEntries(
    METHODS.map(m => [m, monthRecs.filter(r => r.method === m).reduce((s, r) => s + (r.amount || 0), 0)])
  );
  const topMethod = totalMonth > 0
    ? METHODS.reduce((a, b) => methodTotals[a] >= methodTotals[b] ? a : b)
    : null;
  const topPct = topMethod && totalMonth > 0
    ? Math.round((methodTotals[topMethod] / totalMonth) * 100) : 0;
  const otherSummary = topMethod
    ? METHODS.filter(m => m !== topMethod && methodTotals[m] > 0)
        .map(m => `${Math.round((methodTotals[m] / totalMonth) * 100)}% ${m}`)
        .join(' · ')
    : '';

  const paidInvoices = INVOICES.filter(i => i.status === 'paid').length;

  // ── Filter ──────────────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = RECEIPTS
    .filter(r => methodFilter === 'הכל' || r.method === methodFilter)
    .filter(r => !q || r.id.toLowerCase().includes(q) || (r.customer || '').toLowerCase().includes(q));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (form) => {
    setBusy(true);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: form.customer,
          amount:   parseFloat(form.amount) || 0,
          method:   form.method,
          invoice:  form.invoiceId || '',
          card:     form.card || '',
        }),
      });
      const j = await res.json();
      await window.refreshData();
      setNewOpen(false);
      const newRec = window.DATA.RECEIPTS.find(r => r.id === j.id);
      if (newRec) await downloadReceiptPDF(newRec);
    } catch (err) {
      console.error('Receipt creation failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const methodIcon = { 'אשראי': 'credit-card', 'מזומן': 'banknote', 'BIT': 'phone', 'העברה בנקאית': 'transfer' };

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon teal"><Icon name="banknote" size={16} /></div>
            <div className="kpi__label">סה"כ החודש</div>
          </div>
          <div className="kpi__value">₪{Math.round(totalMonth).toLocaleString()}</div>
          <div className="kpi__delta"><span>{monthRecs.length} קבלות</span></div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon success"><Icon name="check-circle" size={16} /></div>
            <div className="kpi__label">קבלות היום</div>
          </div>
          <div className="kpi__value">₪{Math.round(totalToday).toLocaleString()}</div>
          <div className="kpi__delta"><span>{todayRecs.length} תשלומים</span></div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon violet"><Icon name="money" size={16} /></div>
            <div className="kpi__label">אמצעי תשלום מוביל</div>
          </div>
          <div className="kpi__value">{topMethod || '—'}</div>
          <div className="kpi__delta">
            <span>{topMethod ? `${topPct}%${otherSummary ? ` · ${otherSummary}` : ''}` : 'אין נתונים'}</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__icon warn"><Icon name="invoice" size={16} /></div>
            <div className="kpi__label">חשבוניות שולמו</div>
          </div>
          <div className="kpi__value">{paidInvoices}</div>
          <div className="kpi__delta"><span>מתוך {INVOICES.length} חשבוניות</span></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={15} />
          <input placeholder="חפש לפי מספר קבלה, לקוח..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters">
          {['הכל', ...METHODS].map(m => (
            <button key={m} className={`filter-btn ${methodFilter === m ? 'active' : ''}`}
              onClick={() => setMethod(m)}>{m}</button>
          ))}
        </div>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn teal" onClick={() => setNewOpen(true)}>
            <Icon name="plus" size={14} />
            קבלה חדשה
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#8B928E' }}>
            <Icon name="receipt" size={32} />
            <p style={{ marginTop: 12 }}>
              אין קבלות{search || methodFilter !== 'הכל' ? ' התואמות את הסינון' : ' עדיין'}
            </p>
            {!search && methodFilter === 'הכל' && (
              <button className="btn teal" style={{ marginTop: 8 }} onClick={() => setNewOpen(true)}>
                <Icon name="plus" size={14} />
                הפק קבלה ראשונה
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>קבלה</th>
                <th>לקוח</th>
                <th>תאריך</th>
                <th>אופן תשלום</th>
                <th>פרטים</th>
                <th>חשבונית</th>
                <th>סכום</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(r)}>
                  <td className="mono name">{r.id}</td>
                  <td>{r.customer}</td>
                  <td className="mono">{r.date}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, background: 'var(--bg-deep)', borderRadius: 7, display: 'grid', placeItems: 'center' }}>
                        <Icon name={methodIcon[r.method] || 'credit-card'} size={13} />
                      </div>
                      <span>{r.method}</span>
                    </div>
                  </td>
                  <td className="mono text-xs muted">{r.card ? `···${r.card}` : '—'}</td>
                  <td className="mono">{r.invoice ? `#${r.invoice}` : '—'}</td>
                  <td className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
                    ₪{parseFloat(r.amount).toLocaleString()}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn sm ghost" title="פרטים" onClick={() => setDetail(r)}>
                        <Icon name="eye" size={13} />
                      </button>
                      <button className="btn sm ghost" title="הורד PDF" onClick={() => downloadReceiptPDF(r)}>
                        <Icon name="download" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NewReceiptModal open={newOpen} onClose={() => setNewOpen(false)} onSubmit={onSubmit} busy={busy} />
      <ReceiptDetailModal receipt={detail} onClose={() => setDetail(null)} />
    </div>
  );
};

window.ScreenReceipts = ScreenReceipts;
