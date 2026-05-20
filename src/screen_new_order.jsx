// New Order modal - single-page form with real file upload, dynamic VAT, and PDF export

function cleanPrice(v) {
  return parseFloat(String(v || '').replace(/,/g, '').replace(/\s/g, '')) || 0;
}

function fmtMoney(n) {
  return '₪ ' + n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function downloadPDF(type, orderData) {
  const isQuote = type === 'quote';
  const VAT_RATE = window.DATA.VAT_RATE || 18;
  const subtotal = cleanPrice(orderData.price);
  const vat = +(subtotal * VAT_RATE / 100).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);
  const customer = window.DATA.CUSTOMERS.find(c => c.id === orderData.customerId);
  const custName = customer?.name || '';
  const date = new Date().toLocaleDateString('he-IL');

  // Overlay covers the screen while html2canvas captures the PDF content
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#fff;overflow:hidden';
  document.body.appendChild(overlay);

  const el = document.createElement('div');
  el.style.cssText = 'width:750px;font-family:Arial,sans-serif;direction:rtl;padding:44px 48px;color:#111;background:#fff;box-sizing:border-box;line-height:1.6';
  overlay.appendChild(el);

  // Wrap each word in a span with margin to avoid html2canvas dropping spaces in RTL
  const W = (text) => String(text || '').split(' ').filter(Boolean)
    .map(w => `<span style="display:inline-block;margin-left:4px">${w}</span>`).join('');

  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:22px">
      <tr>
        <td style="vertical-align:top;text-align:right;padding-left:20px">
          <div style="font-size:28px;font-weight:800;color:#0E665E;margin-bottom:12px">${W(isQuote ? 'הצעת מחיר' : 'הזמנה')}</div>
          <table style="border-collapse:collapse;font-size:13px">
            <tr>
              <td style="color:#888;padding:3px 16px 3px 0;white-space:nowrap">מספר</td>
              <td style="font-weight:700;white-space:nowrap">${orderData.id}</td>
            </tr>
            <tr>
              <td style="color:#888;padding:3px 16px 3px 0;white-space:nowrap">תאריך</td>
              <td style="white-space:nowrap">${date}</td>
            </tr>
            ${orderData.due ? `<tr>
              <td style="color:#888;padding:3px 16px 3px 0;white-space:nowrap">אספקה</td>
              <td style="white-space:nowrap">${orderData.due}</td>
            </tr>` : ''}
          </table>
        </td>
        <td style="vertical-align:top;text-align:left;width:340px">
          <img src="assets/logo.jpeg"
               style="width:320px;height:auto;border-radius:12px;display:block"
               crossorigin="anonymous"
               onerror="this.style.display='none'" />
        </td>
      </tr>
    </table>

    <div style="border-top:2px solid #ddd;margin-bottom:20px"></div>

    ${custName ? `
    <div style="background:#f0faf9;border-radius:10px;padding:14px 18px;margin-bottom:18px">
      <div style="font-size:10.5px;color:#999;margin-bottom:5px">${W('לכבוד')}</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">${W(custName)}</div>
      <table style="border-collapse:collapse;font-size:12.5px;color:#555">
        ${customer?.phone ? `<tr><td style="padding:1px 14px 1px 0;color:#999;white-space:nowrap">טלפון</td><td>${customer.phone}</td></tr>` : ''}
        ${customer?.email ? `<tr><td style="padding:1px 14px 1px 0;color:#999;white-space:nowrap">אימייל</td><td>${customer.email}</td></tr>` : ''}
        ${customer?.vat   ? `<tr><td style="padding:1px 14px 1px 0;color:#999;white-space:nowrap">ח.פ</td><td>${customer.vat}</td></tr>` : ''}
      </table>
    </div>
    ` : ''}

    ${orderData.notes ? `
    <div style="margin-bottom:18px">
      <div style="font-size:10.5px;color:#999;margin-bottom:6px">${W('פרטי ההזמנה')}</div>
      <div style="background:#f8f8f6;border:1px solid #e8e8e8;border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.7;white-space:pre-wrap">${orderData.notes}</div>
    </div>
    ` : ''}

    ${orderData.attachments && orderData.attachments.length > 0 ? `
    <div style="font-size:11.5px;color:#666;margin-bottom:16px">${W('קבצים מצורפים:')} ${orderData.attachments.map(a => a.name).join(' · ')}</div>
    ` : ''}

    <table style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:18px">
      <tr style="background:#f5f5f3">
        <td style="padding:11px 16px;border:1px solid #ddd;text-align:right">${W('מחיר לפני מע״מ')}</td>
        <td style="padding:11px 16px;border:1px solid #ddd;text-align:left;white-space:nowrap;direction:ltr">${fmtMoney(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;border:1px solid #ddd;text-align:right">${W('מע״מ')} ${VAT_RATE}%</td>
        <td style="padding:11px 16px;border:1px solid #ddd;text-align:left;white-space:nowrap;direction:ltr">${fmtMoney(vat)}</td>
      </tr>
      <tr style="background:#eaf7f6">
        <td style="padding:13px 16px;border:1px solid #bcd;text-align:right;font-weight:700;font-size:15px">${W('סה״כ לתשלום')}</td>
        <td style="padding:13px 16px;border:1px solid #bcd;text-align:left;white-space:nowrap;direction:ltr;font-weight:700;font-size:15px">${fmtMoney(total)}</td>
      </tr>
    </table>

    ${isQuote ? `<div style="font-size:11.5px;color:#aaa;margin-top:14px">${W('הצעת מחיר זו תקפה ל-30 יום ממועד הוצאתה.')}</div>` : ''}

    <div style="margin-top:36px;padding-top:10px;border-top:1px solid #eee;font-size:10.5px;color:#ccc;text-align:center">${W("מג'יק פרינט")}</div>
  `;

  try {
    await html2pdf().set({
      margin: 0,
      filename: `${orderData.id}.pdf`,
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save();
  } finally {
    document.body.removeChild(overlay);
  }
}

const NewOrderModal = ({ open, onClose, onSubmit, prefillCustomerId }) => {
  const [data, setData] = React.useState({
    customerId: '',
    notes: '',
    due: '',
    price: '',
    priority: 'medium',
  });
  const [nextId, setNextId] = React.useState('...');
  const [attachments, setAttachments] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef();
  const imgRef = React.useRef();

  React.useEffect(() => {
    if (open) {
      setData({ customerId: prefillCustomerId || '', notes: '', due: '', price: '', priority: 'medium' });
      setAttachments([]);
      setBusy(false);
      fetch('/api/orders/next-id')
        .then(r => r.json())
        .then(d => setNextId(d.id))
        .catch(() => setNextId('PRN-' + new Date().getFullYear() + '-????'));
    }
  }, [open]);

  if (!open) return null;

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const upd = (e) => set(e.target.name, e.target.value);

  const VAT_RATE = window.DATA.VAT_RATE || 18;
  const subtotal = cleanPrice(data.price);
  const vat = +(subtotal * VAT_RATE / 100).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setBusy(true);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/uploads', { method: 'POST', body: fd });
        const j = await r.json();
        return { name: file.name, stored: j.stored };
      }));
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const handleDraft = async () => {
    setBusy(true);
    try {
      const result = await onSubmit({ ...data, asDraft: true, attachments, id: nextId });
      if (result?.id) await downloadPDF('quote', { ...data, id: result.id, attachments });
    } finally {
      setBusy(false);
    }
  };

  const handleOrder = async () => {
    setBusy(true);
    try {
      const result = await onSubmit({ ...data, attachments, id: nextId });
      if (result?.id) await downloadPDF('order', { ...data, id: result.id, attachments });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 880 }} onClick={e => e.stopPropagation()}>
      <input type="file" multiple ref={fileRef} style={{ display: 'none' }} onChange={handleFiles} />
      <input type="file" accept="image/*" ref={imgRef} style={{ display: 'none' }} onChange={handleFiles} />
        <div className="modal__head">
          <div style={{ width: 38, height: 38, background: 'var(--teal-soft)', color: 'var(--teal-3)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <Icon name="plus" size={18} />
          </div>
          <div>
            <h2>הזמנת עבודה חדשה</h2>
            <div className="sub">מספר: <span className="mono">{nextId}</span> · נוצר {new Date().toLocaleDateString('he-IL')}</div>
          </div>
          <button className="icon-btn" style={{ marginInlineStart: 'auto' }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="modal__body">
          <CustomerPicker data={data} set={set} />

          <div style={{ borderTop: '1px solid var(--border)', margin: '22px -24px', paddingTop: 22, paddingInline: 24 }}>
            <div className="section-title">
              <h2>פרטי ההזמנה</h2>
              <span className="desc">תאר בחופשיות את העבודה — סוג מוצר, כמות, מידות, נייר, צבעים, גימור והנחיות מיוחדות</span>
            </div>

            <textarea
              name="notes"
              value={data.notes}
              onChange={upd}
              placeholder='לדוגמה:&#10;&#10;500 כרטיסי ביקור 9×5 ס"מ&#10;נייר כרומו מט 350g, דו-צדדי&#10;CMYK + UV ספוט על הלוגו&#10;פינות מעוגלות 3 מ"מ&#10;&#10;לקוח מעלה קובץ בעצמו · יש לוודא קליברציית צבע מול הדגימה הקודמת'
              style={{
                width: '100%',
                minHeight: 200,
                border: '1px solid var(--border)',
                borderRadius: 11,
                padding: '14px 16px',
                fontSize: 14,
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                background: '#fff',
                fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--teal)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn sm ghost" type="button" disabled={busy} onClick={() => fileRef.current.click()}>
                <Icon name="upload" size={13} /> צרף קובץ
              </button>
              <button className="btn sm ghost" type="button" disabled={busy} onClick={() => imgRef.current.click()}>
                <Icon name="image" size={13} /> תמונה
              </button>
            </div>

            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {attachments.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--teal-softer)', border: '1px solid var(--teal)', borderRadius: 7, padding: '4px 10px', fontSize: 12 }}>
                    <Icon name="upload" size={11} />
                    <span>{a.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--ink-3)', fontSize: 14 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '22px -24px 0', paddingTop: 22, paddingInline: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>תאריך אספקה</label>
                <input type="text" name="due" value={data.due} onChange={upd} placeholder="21.05.2026" />
              </div>
              <div className="field">
                <label>מחיר לפני מע"מ</label>
                <input type="text" name="price" value={data.price} onChange={upd} placeholder="₪ 0" className="mono" />
                {subtotal > 0 && (
                  <span className="hint">
                    מע"מ {VAT_RATE}% ₪{vat.toLocaleString('he-IL')} · סה"כ <b>₪{total.toLocaleString('he-IL')}</b>
                  </span>
                )}
              </div>
              <div className="field">
                <label>עדיפות</label>
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  {[
                    { id: 'low', label: 'נמוכה', tone: '#9CA098' },
                    { id: 'medium', label: 'רגילה', tone: 'var(--teal-2)' },
                    { id: 'high', label: 'דחוף', tone: 'var(--danger)' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set('priority', p.id)}
                      style={{
                        flex: 1, padding: '8px 4px',
                        border: `1.5px solid ${data.priority === p.id ? p.tone : 'var(--border)'}`,
                        borderRadius: 8,
                        background: data.priority === p.id ? '#fff' : 'var(--surface)',
                        fontSize: 12, fontWeight: 600,
                        color: data.priority === p.id ? p.tone : 'var(--ink-2)',
                        cursor: 'pointer',
                      }}
                    >● {p.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'var(--teal-softer)', borderRadius: 10, marginTop: 14, fontSize: 12.5, color: 'var(--teal-3)' }}>
              <Icon name="shield" size={15} />
              <span>בעת סגירת ההזמנה — חשבונית תיוצא אוטומטית עם מספר הקצאה מרשות המיסים</span>
            </div>
          </div>
        </div>

        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn" disabled={busy} onClick={handleDraft}>
              <Icon name="invoice" size={14} />
              {busy ? 'שומר...' : 'שמור כהצעת מחיר'}
            </button>
            <button className="btn teal" disabled={busy} onClick={handleOrder}>
              <Icon name="check" size={14} />
              {busy ? 'שומר...' : 'צור הזמנה'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Customer picker - search + recent list, with "new customer" inline option
const CustomerPicker = ({ data, set }) => {
  const { CUSTOMERS } = window.DATA;
  const [query, setQuery] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [newCust, setNewCust] = React.useState({ name: '', phone: '', email: '', vat: '' });

  const selected = CUSTOMERS.find(c => c.id === data.customerId);
  const filtered = query
    ? CUSTOMERS.filter(c => c.name.includes(query) || c.contact.includes(query) || c.phone.includes(query)).slice(0, 5)
    : CUSTOMERS.slice(0, 5);

  if (selected) {
    return (
      <div>
        <div className="section-title">
          <h2>לקוח</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, border: '1.5px solid var(--teal)', background: 'var(--teal-softer)', borderRadius: 11 }}>
          <Avatar name={selected.name.charAt(0)} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              {selected.name}
              {selected.tag === 'VIP' && <Chip tone="warn" dot={false}>VIP</Chip>}
              {selected.tag === 'מוסדי' && <Chip tone="violet" dot={false}>מוסדי</Chip>}
            </div>
            <div className="text-xs muted" style={{ marginTop: 3 }}>
              {selected.contact} · {selected.phone} · ח.פ {selected.vat} · {selected.orders} הזמנות קודמות
            </div>
          </div>
          {selected.balance > 0 && (
            <Chip tone="warn">חוב פתוח ₪{selected.balance.toLocaleString()}</Chip>
          )}
          <button className="btn sm ghost" onClick={() => set('customerId', '')}>החלף</button>
        </div>
      </div>
    );
  }

  if (showNew) {
    return (
      <div>
        <div className="section-title">
          <h2>לקוח חדש</h2>
          <div className="right">
            <button className="btn sm ghost" onClick={() => setShowNew(false)}>
              <Icon name="arrow-right" size={13} /> חזרה לחיפוש
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>שם החברה / לקוח *</label>
            <input value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} placeholder='לדוגמה: סטודיו פז' />
          </div>
          <div className="field">
            <label>טלפון *</label>
            <input value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} placeholder="052-..." />
          </div>
          <div className="field">
            <label>אימייל</label>
            <input value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
          </div>
          <div className="field">
            <label>ח.פ / ע.מ</label>
            <input value={newCust.vat} onChange={e => setNewCust({ ...newCust, vat: e.target.value })} className="mono" />
          </div>
        </div>
        <button
          className="btn primary mt-4"
          onClick={() => { set('customerId', 'NEW'); window.DATA.CUSTOMERS.unshift({ id: 'NEW', name: newCust.name || 'לקוח חדש', contact: newCust.name || '—', phone: newCust.phone, email: newCust.email, vat: newCust.vat, orders: 0, lifetime: 0, balance: 0, tag: '' }); }}
        >
          <Icon name="check" size={14} /> שמור והמשך
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">
        <h2>לקוח</h2>
        <div className="right">
          <button className="btn sm" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={13} /> לקוח חדש
          </button>
        </div>
      </div>

      <div className="topbar__search" style={{ maxWidth: '100%', marginBottom: 10 }}>
        <Icon name="search" size={15} />
        <input
          placeholder="חפש לפי שם, איש קשר, טלפון או ח.פ..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => set('customerId', c.id)}
            style={{
              textAlign: 'right',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 9,
              background: '#fff',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--teal-softer)'; e.currentTarget.style.borderColor = 'var(--teal)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <Avatar name={c.name.charAt(0)} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                {c.name}
                {c.tag === 'VIP' && <Chip tone="warn" dot={false}>VIP</Chip>}
                {c.tag === 'מוסדי' && <Chip tone="violet" dot={false}>מוסדי</Chip>}
              </div>
              <div className="text-xs muted" style={{ marginTop: 1 }}>
                {c.contact} · {c.phone} · {c.orders} הזמנות
              </div>
            </div>
            <Icon name="arrow-left" size={14} style={{ color: 'var(--ink-4)' }} />
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 14, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
            לא נמצא לקוח · <button className="btn sm" style={{ marginInlineStart: 8 }} onClick={() => setShowNew(true)}>צור חדש</button>
          </div>
        )}
      </div>
    </div>
  );
};

window.NewOrderModal = NewOrderModal;
