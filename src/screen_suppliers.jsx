// Suppliers screen — full functionality + supplier invoices

// ── Supplier form modal ───────────────────────────────────────────────────────
const SupplierFormModal = ({ initial, onClose, onSaved }) => {
  const isEdit = !!initial;
  const blank  = { name:'', category:'', contact:'', phone:'', email:'', city:'', payment:'שוטף+30', rating:3 };
  const [form, setForm] = React.useState(initial ? { ...blank, ...initial } : blank);
  const [busy, setBusy] = React.useState(false);
  const [err,  setErr]  = React.useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const CATEGORIES = ['נייר', 'דיו', 'גימור', 'תחזוקה', 'ציוד', 'אריזה', 'אחר'];
  const PAYMENT_TERMS = ['שוטף', 'שוטף+30', 'שוטף+45', 'שוטף+60', 'מזומן', 'אשראי'];

  const save = async () => {
    if (!form.name.trim()) { setErr('שם הספק הוא שדה חובה'); return; }
    setBusy(true); setErr('');
    try {
      const url    = isEdit ? `/api/suppliers/${initial.id}` : '/api/suppliers';
      const method = isEdit ? 'PUT' : 'POST';
      await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      await window.refreshData();
      onSaved();
    } catch { setErr('שגיאה בשמירה. נסה שנית.'); }
    finally  { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{width:540}}>
        <div className="modal__head">
          <h2>{isEdit ? 'עריכת ספק' : 'ספק חדש'}</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div className="modal__body" style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}>
              <label className="field-label">שם הספק <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="שם מלא של הספק" autoFocus />
            </div>
            <div>
              <label className="field-label">קטגוריה</label>
              <select className="select" value={form.category} onChange={e=>set('category',e.target.value)}>
                <option value="">— בחר —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">תנאי תשלום</label>
              <select className="select" value={form.payment} onChange={e=>set('payment',e.target.value)}>
                {PAYMENT_TERMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
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
              <label className="field-label">דירוג</label>
              <div style={{display:'flex',gap:4,marginTop:6}}>
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={()=>set('rating',i)} style={{background:'none',border:'none',cursor:'pointer',padding:2,color:'var(--warn)'}}>
                    <Icon name="star" size={20} style={{opacity: i<=form.rating?1:.25, fill: i<=form.rating?'currentColor':'none'}}/>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {err && <div style={{color:'var(--danger)',fontSize:13}}>{err}</div>}
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>
          <button className="btn teal" onClick={save} disabled={busy||!form.name.trim()}>
            {busy ? 'שומר...' : isEdit ? '✓ שמור שינויים' : '✓ הוסף ספק'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Supplier invoice form modal ───────────────────────────────────────────────
const SupplierInvModal = ({ initial, suppliers, onClose, onSaved }) => {
  const isEdit = !!initial;
  const VAT_RATE = window.DATA.VAT_RATE || 18;
  const blank = { supplier_id:'', supplier:'', inv_number:'', date:'', desc:'', amount:'', vat_included: true };
  const [form, setForm] = React.useState(initial ? {
    supplier_id: initial.supplier_id, supplier: initial.supplier,
    inv_number: initial.inv_number, date: initial.date,
    desc: initial.desc, amount: String(initial.total), vat_included: true,
  } : blank);
  const [busy, setBusy] = React.useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const amount = parseFloat(form.amount) || 0;
  const vatAmt = form.vat_included
    ? +(amount - amount / (1 + VAT_RATE/100)).toFixed(2)
    : +(amount * VAT_RATE / 100).toFixed(2);
  const total  = form.vat_included ? amount : +(amount + vatAmt).toFixed(2);
  const base   = form.vat_included ? +(amount / (1 + VAT_RATE/100)).toFixed(2) : amount;

  const onPickSupplier = (id) => {
    const s = suppliers.find(s => s.id === id);
    set('supplier_id', id);
    set('supplier', s ? s.name : '');
  };

  const save = async () => {
    if (!form.supplier && !form.supplier_id) return;
    if (!form.amount) return;
    setBusy(true);
    try {
      await fetch('/api/supplier-invoices', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, amount: base }),
      });
      await window.refreshData();
      onSaved();
    } catch { /* ignore */ }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{width:500}}>
        <div className="modal__head">
          <h2>חשבונית ספק חדשה</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div className="modal__body" style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label className="field-label">ספק <span style={{color:'var(--danger)'}}>*</span></label>
            <select className="select" value={form.supplier_id} onChange={e=>onPickSupplier(e.target.value)}>
              <option value="">— בחר ספק —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label className="field-label">מספר חשבונית</label>
              <input className="input" value={form.inv_number} onChange={e=>set('inv_number',e.target.value)} placeholder="INV-12345" />
            </div>
            <div>
              <label className="field-label">תאריך</label>
              <input className="input" type="date" value={form.date}
                onChange={e => {
                  const d = new Date(e.target.value);
                  const he = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(-2)}`;
                  set('date', he);
                }} />
            </div>
          </div>
          <div>
            <label className="field-label">פירוט / תיאור</label>
            <textarea className="input" rows={2} value={form.desc} onChange={e=>set('desc',e.target.value)} placeholder="תיאור הרכש או השירות..." style={{resize:'vertical'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'flex-end'}}>
            <div>
              <label className="field-label">
                {form.vat_included ? `סכום כולל מע"מ ${VAT_RATE}%` : `סכום לפני מע"מ`}
                <span style={{color:'var(--danger)'}}> *</span>
              </label>
              <input className="input" type="number" min="0" step="0.01" value={form.amount}
                onChange={e=>set('amount',e.target.value)} placeholder="0.00" />
            </div>
            <button className={`btn sm ${form.vat_included?'teal':'ghost'}`} style={{marginBottom:1}}
              onClick={()=>set('vat_included',!form.vat_included)}>
              {form.vat_included ? `כולל מע"מ` : `לפני מע"מ`}
            </button>
          </div>
          {amount > 0 && (
            <div style={{background:'var(--bg-deep)',borderRadius:8,padding:'10px 14px',fontSize:13,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <div><div className="text-xs muted">לפני מע"מ</div><b>₪{base.toLocaleString()}</b></div>
              <div><div className="text-xs muted">מע"מ {VAT_RATE}%</div><b>₪{vatAmt.toLocaleString()}</b></div>
              <div><div className="text-xs muted">סה"כ לתשלום</div><b style={{color:'var(--teal-3)'}}>₪{total.toLocaleString()}</b></div>
            </div>
          )}
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>
          <button className="btn teal" disabled={busy||!form.supplier_id||!form.amount} onClick={save}>
            {busy ? 'שומר...' : '✓ הוסף חשבונית'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete confirm ────────────────────────────────────────────────────────────
const SupplierDeleteModal = ({ supplier, onClose, onDeleted }) => {
  const [busy, setBusy] = React.useState(false);
  const del = async () => {
    setBusy(true);
    await fetch(`/api/suppliers/${supplier.id}`, { method:'DELETE' });
    await window.refreshData();
    onDeleted();
  };
  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{width:400}}>
        <div className="modal__head"><h2>מחיקת ספק</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div className="modal__body">
          <p style={{fontSize:14,lineHeight:1.7}}>האם למחוק את <b>{supplier.name}</b>?<br/>
            <span style={{color:'var(--danger)',fontSize:13}}>פעולה זו אינה ניתנת לביטול.</span></p>
        </div>
        <div className="modal__foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>ביטול</button>
          <button className="btn" style={{background:'var(--danger)',color:'#fff'}} onClick={del} disabled={busy}>
            {busy ? 'מוחק...' : 'מחק ספק'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
const ScreenSuppliers = () => {
  const { SUPPLIERS, SUPPLIER_INVOICES = [], VAT_RATE } = window.DATA;

  const [tab,       setTab]       = React.useState('suppliers'); // 'suppliers' | 'invoices'
  const [search,    setSearch]    = React.useState('');
  const [catFilter, setCat]       = React.useState('הכל');
  const [newOpen,   setNewOpen]   = React.useState(false);
  const [editSupp,  setEditSupp]  = React.useState(null);
  const [delSupp,   setDelSupp]   = React.useState(null);
  const [newInvOpen,setNewInvOpen]= React.useState(false);
  const [invSearch, setInvSearch] = React.useState('');
  const [invFilter, setInvFilter] = React.useState('הכל'); // 'הכל'|'פתוחות'|'שולמו'
  const [togglingId, setTogglingId] = React.useState(null);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalDebt       = SUPPLIERS.reduce((s, x) => s + Math.min(x.balance||0, 0), 0);
  const openInvs        = SUPPLIER_INVOICES.filter(i => !i.paid);
  const openInvTotal    = openInvs.reduce((s,i) => s+(i.total||0), 0);
  const paidThisMonth   = (() => {
    const now = new Date();
    const sfx = `.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getFullYear()).slice(-2)}`;
    return SUPPLIER_INVOICES.filter(i => i.paid && (i.date||'').endsWith(sfx))
      .reduce((s,i)=>s+(i.total||0),0);
  })();

  // ── Category filter options ────────────────────────────────────────────────
  const allCats = ['הכל', ...Array.from(new Set(SUPPLIERS.map(s=>s.category).filter(Boolean)))];

  // ── Filtered suppliers ─────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filteredSuppliers = SUPPLIERS
    .filter(s => catFilter==='הכל' || s.category===catFilter)
    .filter(s => !q || s.name.toLowerCase().includes(q) || (s.contact||'').toLowerCase().includes(q)
                    || (s.phone||'').includes(q) || (s.category||'').toLowerCase().includes(q));

  // ── Filtered supplier invoices ─────────────────────────────────────────────
  const qi = invSearch.toLowerCase();
  const filteredInvs = SUPPLIER_INVOICES
    .filter(i => invFilter==='פתוחות' ? !i.paid : invFilter==='שולמו' ? i.paid : true)
    .filter(i => !qi || i.supplier.toLowerCase().includes(qi)
                     || (i.inv_number||'').toLowerCase().includes(qi)
                     || (i.desc||'').toLowerCase().includes(qi));

  const togglePaid = async (inv) => {
    setTogglingId(inv.id);
    await fetch(`/api/supplier-invoices/${inv.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ paid: inv.paid ? 0 : 1 }),
    });
    await window.refreshData();
    setTogglingId(null);
  };

  const deleteInv = async (inv) => {
    if (!confirm(`מחק חשבונית ${inv.inv_number || inv.id}?`)) return;
    await fetch(`/api/supplier-invoices/${inv.id}`, { method:'DELETE' });
    await window.refreshData();
  };

  return (
    <div>
      {/* ── KPIs ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon teal"><Icon name="suppliers" size={16}/></div><div className="kpi__label">ספקים פעילים</div></div>
          <div className="kpi__value">{SUPPLIERS.length}</div>
          <div className="kpi__delta"><span>{allCats.length-1} קטגוריות</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon warn"><Icon name="wallet" size={16}/></div><div className="kpi__label">חשבוניות פתוחות</div></div>
          <div className="kpi__value">₪{Math.round(openInvTotal).toLocaleString()}</div>
          <div className="kpi__delta"><span>{openInvs.length} חשבוניות ממתינות</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon success"><Icon name="check-circle" size={16}/></div><div className="kpi__label">שולם החודש</div></div>
          <div className="kpi__value">₪{Math.round(paidThisMonth).toLocaleString()}</div>
          <div className="kpi__delta"><span>{SUPPLIER_INVOICES.filter(i=>i.paid).length} חשבוניות שולמו</span></div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><div className="kpi__icon violet"><Icon name="invoice" size={16}/></div><div className="kpi__label">סה"כ חשבוניות</div></div>
          <div className="kpi__value">{SUPPLIER_INVOICES.length}</div>
          <div className="kpi__delta"><span>₪{Math.round(SUPPLIER_INVOICES.reduce((s,i)=>s+(i.total||0),0)).toLocaleString()} סה"כ</span></div>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <button className={`btn ${tab==='suppliers'?'teal':'ghost'}`} onClick={()=>setTab('suppliers')}>
          <Icon name="suppliers" size={14}/> ספקים
        </button>
        <button className={`btn ${tab==='invoices'?'teal':'ghost'}`} onClick={()=>setTab('invoices')}>
          <Icon name="invoice" size={14}/> חשבוניות ספקים
          {openInvs.length > 0 && <span className="nav-badge" style={{marginInlineStart:6}}>{openInvs.length}</span>}
        </button>
      </div>

      {/* ════════════ SUPPLIERS TAB ════════════ */}
      {tab === 'suppliers' && (
        <>
          <div className="toolbar">
            <div className="search">
              <Icon name="search" size={15}/>
              <input placeholder="חפש לפי שם ספק, קטגוריה..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="filters">
              {allCats.map(c => (
                <button key={c} className={`filter-btn ${catFilter===c?'active':''}`} onClick={()=>setCat(c)}>{c}</button>
              ))}
            </div>
            <div style={{marginInlineStart:'auto',display:'flex',gap:6}}>
              <button className="btn teal" onClick={()=>setNewOpen(true)}>
                <Icon name="plus" size={14}/> ספק חדש
              </button>
            </div>
          </div>

          <div className="card">
            {filteredSuppliers.length === 0 ? (
              <div style={{padding:'48px 0',textAlign:'center',color:'#8B928E'}}>
                <Icon name="suppliers" size={32}/>
                <p style={{marginTop:12}}>{search||catFilter!=='הכל' ? 'אין ספקים התואמים את הסינון' : 'אין ספקים עדיין'}</p>
                {!search && catFilter==='הכל' && (
                  <button className="btn teal" style={{marginTop:8}} onClick={()=>setNewOpen(true)}>
                    <Icon name="plus" size={14}/> הוסף ספק ראשון
                  </button>
                )}
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>ספק</th><th>קטגוריה</th><th>איש קשר</th>
                    <th>תנאי תשלום</th><th>יתרה</th><th>דירוג</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:36,height:36,background:'var(--bg-deep)',borderRadius:9,display:'grid',placeItems:'center',color:'var(--ink-2)'}}>
                            <Icon name="building" size={16}/>
                          </div>
                          <div>
                            <div className="name">{s.name}</div>
                            <div className="text-xs muted">{s.city || s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{s.category ? <Chip tone="muted" dot={false}>{s.category}</Chip> : '—'}</td>
                      <td>
                        <div>{s.contact || '—'}</div>
                        {s.phone && <div className="text-xs muted mono">{s.phone}</div>}
                      </td>
                      <td className="mono">{s.payment || '—'}</td>
                      <td className="mono" style={{fontWeight:600, color:(s.balance||0)<0?'var(--warn)':'var(--ink-2)'}}>
                        {(s.balance||0) < 0 ? `(₪${Math.abs(s.balance).toLocaleString()})` : '—'}
                      </td>
                      <td>
                        <div style={{display:'flex',gap:2,color:'var(--warn)'}}>
                          {[1,2,3,4,5].map(i => (
                            <Icon key={i} name="star" size={13}
                              style={{opacity:i<=(s.rating||3)?1:.2, fill:i<=(s.rating||3)?'currentColor':'none'}}/>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn sm ghost" onClick={()=>{ setNewInvOpen(true); }}>
                            <Icon name="invoice" size={12}/>חשבונית
                          </button>
                          <button className="btn sm ghost" onClick={()=>setEditSupp(s)}>
                            <Icon name="edit" size={12}/>
                          </button>
                          <button className="btn sm ghost" style={{color:'var(--danger)'}} onClick={()=>setDelSupp(s)}>
                            <Icon name="trash" size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ════════════ INVOICES TAB ════════════ */}
      {tab === 'invoices' && (
        <>
          <div className="toolbar">
            <div className="search">
              <Icon name="search" size={15}/>
              <input placeholder="חפש לפי ספק, מספר חשבונית, פירוט..."
                value={invSearch} onChange={e=>setInvSearch(e.target.value)}/>
            </div>
            <div className="filters">
              {['הכל','פתוחות','שולמו'].map(f => (
                <button key={f} className={`filter-btn ${invFilter===f?'active':''}`} onClick={()=>setInvFilter(f)}>{f}</button>
              ))}
            </div>
            <div style={{marginInlineStart:'auto'}}>
              <button className="btn teal" onClick={()=>setNewInvOpen(true)}>
                <Icon name="plus" size={14}/> חשבונית ספק חדשה
              </button>
            </div>
          </div>

          <div className="card">
            {filteredInvs.length === 0 ? (
              <div style={{padding:'48px 0',textAlign:'center',color:'#8B928E'}}>
                <Icon name="invoice" size={32}/>
                <p style={{marginTop:12}}>{invSearch||invFilter!=='הכל' ? 'אין חשבוניות התואמות את הסינון' : 'אין חשבוניות ספקים עדיין'}</p>
                {!invSearch && invFilter==='הכל' && (
                  <button className="btn teal" style={{marginTop:8}} onClick={()=>setNewInvOpen(true)}>
                    <Icon name="plus" size={14}/> הוסף חשבונית ראשונה
                  </button>
                )}
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>מספר חשבונית</th>
                    <th>שם ספק</th>
                    <th>תאריך</th>
                    <th>פירוט</th>
                    <th>לפני מע"מ</th>
                    <th>מע"מ {VAT_RATE}%</th>
                    <th>סה"כ</th>
                    <th>שולם</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvs.map(inv => (
                    <tr key={inv.id} style={{opacity: togglingId===inv.id ? .5 : 1}}>
                      <td className="mono name">{inv.inv_number || inv.id}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:28,height:28,background:'var(--bg-deep)',borderRadius:7,display:'grid',placeItems:'center'}}>
                            <Icon name="building" size={13}/>
                          </div>
                          {inv.supplier}
                        </div>
                      </td>
                      <td className="mono">{inv.date}</td>
                      <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {inv.desc || '—'}
                      </td>
                      <td className="mono">₪{(inv.amount||0).toLocaleString()}</td>
                      <td className="mono" style={{color:'#8B928E'}}>₪{(inv.vat||0).toLocaleString()}</td>
                      <td className="mono" style={{fontWeight:700}}>₪{(inv.total||0).toLocaleString()}</td>
                      <td>
                        <button
                          className={`btn sm ${inv.paid ? 'success' : 'ghost'}`}
                          style={{minWidth:72, color: inv.paid ? '#1F633E' : ''}}
                          onClick={()=>togglePaid(inv)}
                          disabled={togglingId===inv.id}
                        >
                          {inv.paid ? '✓ שולם' : 'לא שולם'}
                        </button>
                      </td>
                      <td>
                        <button className="btn sm ghost" style={{color:'var(--danger)'}} onClick={()=>deleteInv(inv)}>
                          <Icon name="trash" size={12}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary footer */}
          {filteredInvs.length > 0 && (
            <div style={{display:'flex',gap:24,padding:'12px 4px',fontSize:13,color:'#6E7470'}}>
              <span>{filteredInvs.length} חשבוניות</span>
              <span>סה"כ: <b>₪{Math.round(filteredInvs.reduce((s,i)=>s+(i.total||0),0)).toLocaleString()}</b></span>
              <span>פתוחות: <b style={{color:'var(--warn)'}}>₪{Math.round(filteredInvs.filter(i=>!i.paid).reduce((s,i)=>s+(i.total||0),0)).toLocaleString()}</b></span>
              <span>שולמו: <b style={{color:'#1F633E'}}>₪{Math.round(filteredInvs.filter(i=>i.paid).reduce((s,i)=>s+(i.total||0),0)).toLocaleString()}</b></span>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {newOpen   && <SupplierFormModal onClose={()=>setNewOpen(false)} onSaved={()=>setNewOpen(false)} suppliers={SUPPLIERS}/>}
      {editSupp  && <SupplierFormModal initial={editSupp} onClose={()=>setEditSupp(null)} onSaved={()=>setEditSupp(null)}/>}
      {delSupp   && <SupplierDeleteModal supplier={delSupp} onClose={()=>setDelSupp(null)} onDeleted={()=>setDelSupp(null)}/>}
      {newInvOpen && <SupplierInvModal suppliers={SUPPLIERS} onClose={()=>setNewInvOpen(false)} onSaved={()=>{ setNewInvOpen(false); setTab('invoices'); }}/>}
    </div>
  );
};

window.ScreenSuppliers = ScreenSuppliers;
