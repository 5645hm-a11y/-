// Customers screen — full functionality

// ── Customer form modal (new + edit) ─────────────────────────────────────────
const CustomerFormModal = ({ initial, onClose, onSaved }) => {
  const isEdit = !!initial;
  const blank  = { name:'', contact:'', phone:'', email:'', city:'', vat:'', tag:'' };
  const [form, setForm]   = React.useState(initial ? { ...blank, ...initial } : blank);
  const [busy, setBusy]   = React.useState(false);
  const [err,  setErr]    = React.useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { setErr('שם הלקוח הוא שדה חובה'); return; }
    setBusy(true); setErr('');
    try {
      const url    = isEdit ? `/api/customers/${initial.id}` : '/api/customers';
      const method = isEdit ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      await window.refreshData();
      onSaved();
    } catch (e) {
      setErr('שגיאה בשמירה. נסה שנית.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal__head">
          <h2>{isEdit ? 'עריכת לקוח' : 'לקוח חדש'}</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal__body" style={{ display:'flex', flexDirection:'column', gap:14 }}>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label className="field-label">שם עסק / לקוח <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="שם מלא של העסק או הלקוח" autoFocus />
            </div>
            <div>
              <label className="field-label">איש קשר</label>
              <input className="input" value={form.contact} onChange={e=>set('contact',e.target.value)} placeholder="שם איש הקשר" />
            </div>
            <div>
              <label className="field-label">טלפון</label>
              <input className="input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="05X-XXXXXXX" />
            </div>
            <div>
              <label className="field-label">אימייל</label>
              <input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <label className="field-label">עיר</label>
              <input className="input" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="תל אביב" />
            </div>
            <div>
              <label className="field-label">ח.פ / ע.מ</label>
              <input className="input" value={form.vat} onChange={e=>set('vat',e.target.value)} placeholder="123456789" />
            </div>
            <div>
              <label className="field-label">תיוג</label>
              <select className="select" value={form.tag} onChange={e=>set('tag',e.target.value)}>
                <option value="">— ללא —</option>
                <option value="VIP">VIP</option>
                <option value="מוסדי">מוסדי</option>
              </select>
            </div>
          </div>

          {err && <div style={{color:'var(--danger)',fontSize:13}}>{err}</div>}
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>
          <button className="btn teal" onClick={save} disabled={busy || !form.name.trim()}>
            {busy ? 'שומר...' : isEdit ? '✓ שמור שינויים' : '✓ צור לקוח'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete confirmation modal ─────────────────────────────────────────────────
const DeleteConfirmModal = ({ customer, onClose, onDeleted }) => {
  const [busy, setBusy] = React.useState(false);
  const del = async () => {
    setBusy(true);
    await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
    await window.refreshData();
    onDeleted();
  };
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal__head">
          <h2>מחיקת לקוח</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal__body">
          <p style={{fontSize:14, lineHeight:1.7}}>
            האם למחוק את <b>{customer.name}</b>?<br/>
            <span style={{color:'var(--danger)', fontSize:13}}>פעולה זו אינה ניתנת לביטול.</span>
          </p>
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>
          <button className="btn" style={{background:'var(--danger)',color:'#fff'}} onClick={del} disabled={busy}>
            {busy ? 'מוחק...' : 'מחק לקוח'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Detail row helper ─────────────────────────────────────────────────────────
const CustDetailRow = ({ icon, label, value, mono, href }) => {
  if (!value) return null;
  return (
    <div style={{ display:'flex', gap:10, padding:'6px 0', alignItems:'center' }}>
      <Icon name={icon} size={14} style={{color:'var(--ink-3)', flexShrink:0}} />
      <span className="text-xs muted" style={{minWidth:60}}>{label}</span>
      {href
        ? <a href={href} style={{fontSize:12.5, fontWeight:500, color:'var(--teal-3)', textDecoration:'none'}}>{value}</a>
        : <span className={mono ? 'mono' : ''} style={{fontSize:12.5, fontWeight:500}}>{value}</span>}
    </div>
  );
};

// ── Customer detail panel ─────────────────────────────────────────────────────
const CustomerDetail = ({ customer: c, onEdit, onDelete }) => {
  if (!c) return (
    <div className="card" style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:300, color:'#9CA098', fontSize:13}}>
      בחר לקוח מהרשימה
    </div>
  );

  const orders   = (window.DATA.ORDERS   || []).filter(o => o.customer === c.name);
  const invoices = (window.DATA.INVOICES || []).filter(i => i.customer    === c.name);
  const openInvTotal = invoices.filter(i => i.status !== 'paid').reduce((s,i) => s+(i.total||0), 0);

  return (
    <div className="card" style={{position:'sticky', top:80, height:'fit-content', maxHeight:'calc(100vh - 110px)', overflowY:'auto'}}>
      <div className="card-header" style={{paddingBlock:20}}>
        <Avatar name={c.name.charAt(0)} size={46} />
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex', alignItems:'center', gap:7}}>
            <h3 style={{fontSize:15, marginBottom:0}}>{c.name}</h3>
            {c.tag === 'VIP'    && <Chip tone="warn"   dot={false}>VIP</Chip>}
            {c.tag === 'מוסדי'  && <Chip tone="violet" dot={false}>מוסדי</Chip>}
          </div>
          <div className="sub" style={{marginTop:2}}>{c.contact || c.id}</div>
        </div>
        <div className="actions" style={{flexDirection:'column', gap:5, alignItems:'flex-start'}}>
          <div style={{display:'flex', gap:5}}>
            {c.phone && (
              <a href={`tel:${c.phone}`} className="btn sm ghost" style={{textDecoration:'none'}}>
                <Icon name="phone" size={13}/>חיוג
              </a>
            )}
            <button className="btn sm teal" onClick={() => window.openNewOrder && window.openNewOrder(c.id)}>
              <Icon name="plus" size={13}/>הזמנה
            </button>
          </div>
          <div style={{display:'flex', gap:5}}>
            <button className="btn sm ghost" onClick={onEdit}><Icon name="edit" size={13}/>עריכה</button>
            <button className="btn sm ghost" style={{color:'var(--danger)'}} onClick={onDelete}><Icon name="trash" size={13}/>מחיקה</button>
          </div>
        </div>
      </div>

      <div className="card-body">
        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18}}>
          {[
            { label:'הזמנות',      value: c.orders_count || orders.length },
            { label:'הכנסה כוללת', value: `₪${Math.round(c.lifetime||0).toLocaleString()}` },
            { label:'חוב פתוח',    value: openInvTotal > 0 ? `₪${Math.round(openInvTotal).toLocaleString()}` : '—',
              warn: openInvTotal > 0 },
          ].map(s => (
            <div key={s.label} style={{background:'var(--bg-deep)', borderRadius:8, padding:'10px 12px'}}>
              <div className="text-xs muted" style={{marginBottom:3}}>{s.label}</div>
              <div style={{fontWeight:700, fontSize:14, color: s.warn ? 'var(--warn)' : 'var(--ink)'}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Contact details */}
        <div style={{borderTop:'1px solid var(--border)', paddingTop:14, marginBottom:14}}>
          <div className="text-xs muted" style={{marginBottom:6}}>פרטי קשר</div>
          <CustDetailRow icon="phone"    label="טלפון"    value={c.phone}  href={c.phone ? `tel:${c.phone}` : null} />
          <CustDetailRow icon="mail"     label="אימייל"   value={c.email}  href={c.email ? `mailto:${c.email}` : null} />
          <CustDetailRow icon="building" label="עיר"      value={c.city} />
          <CustDetailRow icon="shield"   label="ח.פ/ע.מ"  value={c.vat}   mono />
        </div>

        {/* Recent orders */}
        <div style={{borderTop:'1px solid var(--border)', paddingTop:14, marginBottom:14}}>
          <div className="text-xs muted" style={{marginBottom:8}}>הזמנות אחרונות</div>
          {orders.length === 0
            ? <div className="text-xs muted">אין הזמנות עדיין</div>
            : orders.slice(0, 5).map(o => (
              <div key={o.id} style={{display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px dashed var(--border)'}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {o.notes || o.id}
                  </div>
                  <div className="text-xs mono muted">{o.id}</div>
                </div>
                <StatusChip status={o.status} />
                <div className="mono" style={{fontSize:12, fontWeight:600, minWidth:55, textAlign:'left'}}>
                  ₪{(o.price||0).toLocaleString()}
                </div>
              </div>
            ))}
        </div>

        {/* Invoices */}
        {invoices.length > 0 && (
          <div style={{borderTop:'1px solid var(--border)', paddingTop:14}}>
            <div className="text-xs muted" style={{marginBottom:8}}>חשבוניות</div>
            {invoices.slice(0,4).map(inv => (
              <div key={inv.id} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px dashed var(--border)'}}>
                <div style={{flex:1}}>
                  <div className="mono" style={{fontSize:12.5, fontWeight:600}}>{inv.id}</div>
                  <div className="text-xs muted">{inv.date}</div>
                </div>
                <span className={`badge ${inv.status==='paid'?'success':'warn'}`} style={{fontSize:10}}>
                  {inv.status==='paid'?'שולמה':'פתוחה'}
                </span>
                <div className="mono" style={{fontSize:12, fontWeight:600, minWidth:60, textAlign:'left'}}>
                  ₪{(inv.total||0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
const ScreenCustomers = () => {
  const { CUSTOMERS } = window.DATA;

  const [search,   setSearch]   = React.useState('');
  const [tab,      setTab]      = React.useState('all');
  const [selected, setSelected] = React.useState(null);
  const [newOpen,  setNewOpen]  = React.useState(false);
  const [editCust, setEditCust] = React.useState(null);
  const [delCust,  setDelCust]  = React.useState(null);

  // Keep selected in sync after refresh
  React.useEffect(() => {
    if (selected) {
      const fresh = CUSTOMERS.find(c => c.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [CUSTOMERS]);

  // Filters
  const q = search.toLowerCase();
  const filtered = CUSTOMERS
    .filter(c => {
      if (tab === 'vip')     return c.tag === 'VIP';
      if (tab === 'mosadi')  return c.tag === 'מוסדי';
      if (tab === 'debt')    return (c.balance||0) > 0;
      return true;
    })
    .filter(c => !q ||
      c.name.toLowerCase().includes(q)    ||
      (c.phone||'').includes(q)           ||
      (c.email||'').toLowerCase().includes(q) ||
      (c.vat||'').includes(q)             ||
      (c.city||'').toLowerCase().includes(q)
    );

  const vipCount  = CUSTOMERS.filter(c => c.tag === 'VIP').length;
  const mosCount  = CUSTOMERS.filter(c => c.tag === 'מוסדי').length;
  const debtCount = CUSTOMERS.filter(c => (c.balance||0) > 0).length;

  const onSaved = () => {
    setNewOpen(false);
    setEditCust(null);
  };

  const onDeleted = () => {
    setDelCust(null);
    if (selected && delCust && selected.id === delCust.id) setSelected(null);
  };

  return (
    <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:18}}>

      {/* ── Left: list ── */}
      <div>
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={15} />
            <input
              placeholder="חפש לפי שם, טלפון, ח.פ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filters">
            <button className={`filter-btn ${tab==='all'?'active':''}`}    onClick={()=>setTab('all')}>
              הכל · {CUSTOMERS.length}
            </button>
            {vipCount > 0 && (
              <button className={`filter-btn ${tab==='vip'?'active':''}`}  onClick={()=>setTab('vip')}>
                VIP · {vipCount}
              </button>
            )}
            {mosCount > 0 && (
              <button className={`filter-btn ${tab==='mosadi'?'active':''}`} onClick={()=>setTab('mosadi')}>
                מוסדי · {mosCount}
              </button>
            )}
            {debtCount > 0 && (
              <button className={`filter-btn ${tab==='debt'?'active':''}`} onClick={()=>setTab('debt')}>
                חוב פתוח · {debtCount}
              </button>
            )}
          </div>
          <div style={{marginInlineStart:'auto'}}>
            <button className="btn teal" onClick={()=>setNewOpen(true)}>
              <Icon name="plus" size={14}/> לקוח חדש
            </button>
          </div>
        </div>

        <div className="card">
          {filtered.length === 0 ? (
            <div style={{padding:'48px 0', textAlign:'center', color:'#8B928E'}}>
              <Icon name="users" size={32}/>
              <p style={{marginTop:12}}>
                {search || tab !== 'all' ? 'אין לקוחות התואמים את הסינון' : 'אין לקוחות עדיין'}
              </p>
              {!search && tab === 'all' && (
                <button className="btn teal" style={{marginTop:8}} onClick={()=>setNewOpen(true)}>
                  <Icon name="plus" size={14}/> הוסף לקוח ראשון
                </button>
              )}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>לקוח</th>
                  <th>איש קשר</th>
                  <th>עיר</th>
                  <th>הזמנות</th>
                  <th>סה"כ</th>
                  <th>יתרה</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={()=>setSelected(c)}
                    style={{cursor:'pointer', background: selected?.id===c.id ? 'var(--surface-alt)' : ''}}
                  >
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <Avatar name={c.name.charAt(0)} size={32}/>
                        <div>
                          <div className="name">{c.name}</div>
                          <div className="text-xs mono muted">{c.id}{c.vat ? ` · ח.פ ${c.vat}` : ''}</div>
                        </div>
                        {c.tag === 'VIP'   && <Chip tone="warn"   dot={false}>VIP</Chip>}
                        {c.tag === 'מוסדי' && <Chip tone="violet" dot={false}>מוסדי</Chip>}
                      </div>
                    </td>
                    <td>
                      <div>{c.contact}</div>
                      <div className="text-xs muted">{c.phone}</div>
                    </td>
                    <td>{c.city || '—'}</td>
                    <td className="mono">{c.orders_count || 0}</td>
                    <td className="mono">₪{Math.round(c.lifetime||0).toLocaleString()}</td>
                    <td className="mono" style={{color: (c.balance||0)>0 ? 'var(--warn)' : 'var(--ink-2)', fontWeight: (c.balance||0)>0 ? 600 : 400}}>
                      {(c.balance||0) > 0 ? `₪${(c.balance).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: detail ── */}
      <CustomerDetail
        customer={selected}
        onEdit={()  => setEditCust(selected)}
        onDelete={()=> setDelCust(selected)}
      />

      {/* Modals */}
      {newOpen  && <CustomerFormModal onClose={()=>setNewOpen(false)} onSaved={onSaved} />}
      {editCust && <CustomerFormModal initial={editCust} onClose={()=>setEditCust(null)} onSaved={onSaved} />}
      {delCust  && <DeleteConfirmModal customer={delCust} onClose={()=>setDelCust(null)} onDeleted={onDeleted} />}
    </div>
  );
};

window.ScreenCustomers = ScreenCustomers;
