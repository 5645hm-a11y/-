// Full inventory & raw materials management screen

const INV_CATS  = ['נייר', 'דיו / טונר', 'ויניל', 'גימור', 'חומרי אריזה', 'ציוד משרד', 'אחר'];
const INV_UNITS = ["יח'", 'גליל', 'ריים', "ק''ג", 'ליטר', 'מ"ר', 'מ"ל', 'קופסה'];

// ── helpers ──────────────────────────────────────────────────────────────────
function invTodayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2,'0'), String(d.getMonth()+1).padStart(2,'0'), String(d.getFullYear()).slice(2)].join('.');
}

// ── Item Form Modal (create / edit) ──────────────────────────────────────────
const ItemFormModal = ({ item, busy, onSave, onClose }) => {
  const isNew = !item?.sku;
  const [f, setF] = React.useState({
    sku:       item?.sku       || '',
    name:      item?.name      || '',
    category:  item?.category  || '',
    size:      item?.size      || '',
    unit:      item?.unit      || "יח'",
    stock:     item?.stock     != null ? String(item.stock)     : '0',
    min_stock: item?.min_stock != null ? String(item.min_stock) : '5',
    supplier:  item?.supplier  || '',
    cost:      item?.cost      != null ? String(item.cost)      : '0',
  });

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const inp = {
    padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7,
    fontSize: 14, fontFamily: "'Heebo',sans-serif", direction: 'rtl',
    background: 'var(--bg-card)', color: 'var(--text)', width: '100%', boxSizing: 'border-box',
  };
  const lbl = { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 };
  const row = { display: 'flex', flexDirection: 'column' };

  const submit = () => {
    if (!f.name.trim()) return;
    onSave({
      ...f,
      stock:     parseInt(f.stock)     || 0,
      min_stock: parseInt(f.min_stock) || 0,
      cost:      parseFloat(f.cost)    || 0,
    }, isNew);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal__head">
          <b>{isNew ? 'פריט חדש' : `עריכה — ${item.name}`}</b>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            <div style={{ ...row, gridColumn: '1/-1' }}>
              <label style={lbl}>שם פריט *</label>
              <input style={inp} value={f.name} onChange={e => set('name', e.target.value)}
                placeholder="למשל: נייר A4 80g" autoFocus />
            </div>

            <div style={row}>
              <label style={lbl}>קטגוריה</label>
              <select style={inp} value={f.category} onChange={e => set('category', e.target.value)}>
                <option value="">-- בחר --</option>
                {INV_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={row}>
              <label style={lbl}>גודל / תיאור</label>
              <input style={inp} value={f.size} onChange={e => set('size', e.target.value)}
                placeholder="למשל: A4, 70×100" />
            </div>

            <div style={row}>
              <label style={lbl}>יחידת מידה</label>
              <select style={inp} value={f.unit} onChange={e => set('unit', e.target.value)}>
                {INV_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div style={row}>
              <label style={lbl}>SKU {isNew && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ריק = אוטומטי)</span>}</label>
              <input style={{ ...inp, background: !isNew ? 'var(--bg-deep)' : inp.background }}
                value={f.sku} onChange={e => isNew && set('sku', e.target.value)}
                readOnly={!isNew} placeholder={isNew ? 'INV-0001' : ''} />
            </div>

            <div style={row}>
              <label style={lbl}>מלאי נוכחי</label>
              <input style={inp} type="number" min="0" value={f.stock}
                onChange={e => set('stock', e.target.value)} />
            </div>

            <div style={row}>
              <label style={lbl}>סף מינ' להזמנה</label>
              <input style={inp} type="number" min="0" value={f.min_stock}
                onChange={e => set('min_stock', e.target.value)} />
            </div>

            <div style={row}>
              <label style={lbl}>ספק</label>
              <input style={inp} value={f.supplier} onChange={e => set('supplier', e.target.value)}
                placeholder="שם הספק" />
            </div>

            <div style={row}>
              <label style={lbl}>עלות ליחידה (₪)</label>
              <input style={inp} type="number" min="0" step="0.01" value={f.cost}
                onChange={e => set('cost', e.target.value)} />
            </div>

          </div>
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose}>ביטול</button>
          <button className="btn teal" onClick={submit} disabled={busy || !f.name.trim()}>
            {busy ? '...' : isNew ? 'הוסף פריט' : 'שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Adjust Stock Modal ────────────────────────────────────────────────────────
const AdjustStockModal = ({ item, busy, onSave, onClose }) => {
  const [mode, setMode]     = React.useState('add'); // 'add' | 'use' | 'set'
  const [amount, setAmount] = React.useState('');

  const current  = item.stock || 0;
  const parsed   = parseInt(amount) || 0;
  const newStock = mode === 'set'
    ? Math.max(0, parsed)
    : mode === 'add'
    ? current + Math.abs(parsed)
    : Math.max(0, current - Math.abs(parsed));

  const actualDelta = newStock - current;
  const isLow       = newStock < (item.min_stock || 0);

  const submit = () => {
    if (!amount) return;
    onSave(item.sku, actualDelta);
  };

  const tabStyle = (m) => ({
    flex: 1, padding: '8px 4px', border: '1px solid var(--border)', borderRadius: 7,
    cursor: 'pointer', fontSize: 13, fontFamily: "'Heebo',sans-serif",
    background: mode === m ? 'var(--teal)' : 'var(--bg-card)',
    color:      mode === m ? '#fff' : 'var(--text)',
    fontWeight: mode === m ? 600 : 400,
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 380 }}>
        <div className="modal__head">
          <b>עדכון מלאי — {item.name}</b>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal__body">

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button style={tabStyle('add')} onClick={() => setMode('add')}>+ קבלת סחורה</button>
            <button style={tabStyle('use')} onClick={() => setMode('use')}>− שימוש / יציאה</button>
            <button style={tabStyle('set')} onClick={() => setMode('set')}>✎ תיקון ידני</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              {mode === 'add' ? 'כמות שהתקבלה' : mode === 'use' ? 'כמות שיצאה' : 'מלאי חדש (ערך מדויק)'}
            </label>
            <input
              type="number" min="0" value={amount} autoFocus
              onChange={e => setAmount(e.target.value)}
              placeholder={mode === 'set' ? String(current) : '0'}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px', textAlign: 'center',
                fontSize: 24, fontWeight: 700, border: '2px solid var(--teal)', borderRadius: 10,
                background: 'var(--bg-card)', color: 'var(--text)', fontFamily: "'Heebo',sans-serif",
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: 'var(--bg-deep)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>מלאי נוכחי</div>
              <b style={{ fontSize: 18 }}>{current} <span style={{ fontSize: 12, fontWeight: 400 }}>{item.unit}</span></b>
            </div>
            {amount ? (
              <div style={{
                flex: 1, borderRadius: 10, padding: '10px 14px',
                background: isLow ? 'var(--warn-soft)' : 'var(--success-soft)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>לאחר עדכון</div>
                <b style={{ fontSize: 18, color: isLow ? 'var(--warn)' : 'var(--success)' }}>
                  {newStock} <span style={{ fontSize: 12, fontWeight: 400 }}>{item.unit}</span>
                </b>
              </div>
            ) : <div style={{ flex: 1 }} />}
          </div>

          {isLow && amount ? (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="warning" size={13} /> מתחת לסף המינימום ({item.min_stock} {item.unit})
            </div>
          ) : null}

        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose}>ביטול</button>
          <button className="btn teal" onClick={submit} disabled={busy || !amount}>
            {busy ? '...' : 'עדכן מלאי'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
const DeleteInvModal = ({ item, busy, onDelete, onClose }) => (
  <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ width: 360 }}>
      <div className="modal__head">
        <b>מחיקת פריט</b>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
      </div>
      <div className="modal__body" style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--danger-soft)', display: 'grid', placeItems: 'center',
          margin: '0 auto 16px', color: 'var(--danger)',
        }}>
          <Icon name="trash" size={24} />
        </div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>מחיקת "{item.name}"</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>פריט זה יוסר לצמיתות מהמלאי. לא ניתן לשחזר.</div>
        {item.stock > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>
            שים לב: יש {item.stock} יחידות במלאי
          </div>
        )}
      </div>
      <div className="modal__foot">
        <button className="btn ghost" onClick={onClose}>ביטול</button>
        <button className="btn" style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
          onClick={() => onDelete(item.sku)} disabled={busy}>
          {busy ? '...' : 'מחק פריט'}
        </button>
      </div>
    </div>
  </div>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const ScreenInventory = () => {
  const [search,      setSearch]      = React.useState('');
  const [catFilter,   setCatFilter]   = React.useState('הכל');
  const [showLow,     setShowLow]     = React.useState(false);
  const [formItem,    setFormItem]    = React.useState(null);   // null=closed, {}=new, item=edit
  const [adjustItem,  setAdjustItem]  = React.useState(null);
  const [deleteItem,  setDeleteItem]  = React.useState(null);
  const [busy,        setBusy]        = React.useState(false);

  const { INVENTORY } = window.DATA;

  // ── Computed ────────────────────────────────────────────────────────────────
  const totalValue = INVENTORY.reduce((s, i) => s + (i.stock * (i.cost || 0)), 0);
  const lowStock   = INVENTORY.filter(i => i.stock <= i.min_stock);
  const cats       = ['הכל', ...[...new Set(INVENTORY.map(i => i.category).filter(Boolean))].sort()];

  const filtered = INVENTORY.filter(item => {
    if (showLow && item.stock > item.min_stock) return false;
    if (catFilter !== 'הכל' && item.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (item.name     || '').toLowerCase().includes(q) ||
             (item.sku      || '').toLowerCase().includes(q) ||
             (item.supplier || '').toLowerCase().includes(q) ||
             (item.category || '').toLowerCase().includes(q);
    }
    return true;
  });

  // ── Actions ─────────────────────────────────────────────────────────────────
  const saveItem = async (data, isNew) => {
    setBusy(true);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const url    = isNew ? '/api/inventory' : `/api/inventory/${data.sku}`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await window.refreshData();
      setFormItem(null);
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const adjustStock = async (sku, delta) => {
    setBusy(true);
    const item     = INVENTORY.find(i => i.sku === sku);
    const newStock = Math.max(0, (item?.stock || 0) + delta);
    await fetch(`/api/inventory/${sku}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock, last: invTodayStr() }),
    });
    await window.refreshData();
    setAdjustItem(null);
    setBusy(false);
  };

  const deleteItemFn = async (sku) => {
    setBusy(true);
    await fetch(`/api/inventory/${sku}`, { method: 'DELETE' });
    await window.refreshData();
    setDeleteItem(null);
    setBusy(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{
          background: '#FEF5E7', border: '1px solid #F4D9A0', borderRadius: 12,
          padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div style={{ width: 36, height: 36, background: '#F4D9A0', borderRadius: 9, display: 'grid', placeItems: 'center', color: '#92651D', flexShrink: 0 }}>
            <Icon name="warning" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: '#7A5417' }}>{lowStock.length} פריטים מתחת לסף מלאי</div>
            <div style={{ fontSize: 12, color: '#92651D', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lowStock.map(i => i.name).join(' · ')}
            </div>
          </div>
          <button className="btn sm" style={{ background: '#7A5417', color: '#fff', borderColor: '#7A5417', flexShrink: 0 }}
            onClick={() => { setCatFilter('הכל'); setShowLow(true); setSearch(''); }}>
            <Icon name="warning" size={13} />
            הצג בלבד
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon teal"><Icon name="inventory" size={16} /></div><div className="kpi__label">סה"כ פריטים</div></div>
          <div className="kpi__value">{INVENTORY.length}</div>
          <div className="kpi__delta"><span>SKU פעילים</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon warn"><Icon name="warning" size={16} /></div><div className="kpi__label">מתחת לסף</div></div>
          <div className="kpi__value" style={{ color: lowStock.length > 0 ? 'var(--warn)' : '' }}>{lowStock.length}</div>
          <div className="kpi__delta"><span>{lowStock.length > 0 ? 'דורש הזמנה' : 'מלאי תקין'}</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon violet"><Icon name="money" size={16} /></div><div className="kpi__label">שווי מלאי</div></div>
          <div className="kpi__value">₪{Math.round(totalValue).toLocaleString('he-IL')}</div>
          <div className="kpi__delta"><span>עלות ספק</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon success"><Icon name="money" size={16} /></div><div className="kpi__label">ממוצע לפריט</div></div>
          <div className="kpi__value">₪{INVENTORY.length ? Math.round(totalValue / INVENTORY.length).toLocaleString() : 0}</div>
          <div className="kpi__delta"><span>ערך ממוצע</span></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={15} />
          <input placeholder="חפש לפי שם, SKU, ספק..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters">
          {cats.map(c => (
            <button key={c}
              className={'filter-btn' + (catFilter === c && !showLow ? ' active' : '')}
              onClick={() => { setCatFilter(c); setShowLow(false); }}>
              {c}
            </button>
          ))}
          <button className={'filter-btn' + (showLow ? ' active' : '')}
            onClick={() => setShowLow(v => !v)}>
            <Icon name="warning" size={13} />
            מתחת לסף · {lowStock.length}
          </button>
        </div>
        <div style={{ marginInlineStart: 'auto', flexShrink: 0 }}>
          <button className="btn teal" onClick={() => setFormItem({})}>
            <Icon name="plus" size={14} />
            פריט חדש
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="inventory" size={40} />
            <div style={{ marginTop: 14, fontWeight: 600, fontSize: 16 }}>אין פריטים</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              {search || catFilter !== 'הכל' || showLow
                ? 'נסה לשנות את הסינון'
                : 'לחץ על "פריט חדש" להוספת הפריט הראשון'}
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>פריט</th>
                <th>SKU</th>
                <th>קטגוריה</th>
                <th>מלאי</th>
                <th>סף מינ'</th>
                <th>ספק</th>
                <th>עלות יח'</th>
                <th>שווי מלאי</th>
                <th>קבלה אחרונה</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => {
                const low    = it.stock <= it.min_stock;
                const maxBar = it.min_stock * 2 || 10;
                const pct    = Math.min(100, (it.stock / maxBar) * 100);
                const value  = (it.cost || 0) * it.stock;
                return (
                  <tr key={it.sku}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {[it.size, it.unit].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="mono text-xs">{it.sku}</td>
                    <td>
                      {it.category
                        ? <Chip tone="muted" dot={false}>{it.category}</Chip>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="mono" style={{ fontWeight: 700, fontSize: 15, minWidth: 28, color: low ? 'var(--danger)' : '' }}>
                          {it.stock}
                        </div>
                        <div style={{ width: 55, height: 5, background: 'var(--bg-deep)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: low ? 'var(--danger)' : 'var(--teal)', borderRadius: 4 }} />
                        </div>
                        {low && (
                          <div style={{ fontSize: 10, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
                            נמוך
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="mono muted">{it.min_stock}</td>
                    <td style={{ color: it.supplier ? '' : 'var(--text-muted)' }}>{it.supplier || '—'}</td>
                    <td className="mono">₪{(it.cost || 0).toLocaleString()}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>₪{value.toLocaleString()}</td>
                    <td className="mono muted">{it.last || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn sm ghost" title="עדכן מלאי"
                          onClick={() => setAdjustItem(it)}>
                          <Icon name="refresh" size={12} />
                        </button>
                        <button className="btn sm ghost" title="ערוך פריט"
                          onClick={() => setFormItem(it)}>
                          <Icon name="edit" size={12} />
                        </button>
                        <button className="btn sm ghost" title="מחק"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteItem(it)}>
                          <Icon name="trash" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-deep)', fontWeight: 600 }}>
                <td colSpan={7} style={{ padding: '10px 14px', fontSize: 13 }}>
                  סה"כ {filtered.length} פריטים
                </td>
                <td className="mono" style={{ padding: '10px 14px', fontSize: 13 }}>
                  ₪{filtered.reduce((s, i) => s + (i.cost||0)*i.stock, 0).toLocaleString()}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Modals */}
      {formItem !== null && (
        <ItemFormModal item={formItem} busy={busy} onSave={saveItem} onClose={() => setFormItem(null)} />
      )}
      {adjustItem && (
        <AdjustStockModal item={adjustItem} busy={busy} onSave={adjustStock} onClose={() => setAdjustItem(null)} />
      )}
      {deleteItem && (
        <DeleteInvModal item={deleteItem} busy={busy} onDelete={deleteItemFn} onClose={() => setDeleteItem(null)} />
      )}

    </div>
  );
};

window.ScreenInventory = ScreenInventory;
