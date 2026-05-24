// App shell: sidebar + topbar

const NAV_ITEMS = [
  { group: 'ראשי', items: [
    { id: 'dashboard',  label: 'דשבורד',              icon: 'home' },
    { id: 'orders',     label: 'הזמנות עבודה',         icon: 'orders',   dynBadge: 'active' },
    { id: 'printers',   label: 'מכונות דפוס',          icon: 'printer',  liveDot: true },
  ]},
  { group: 'כספים', items: [
    { id: 'invoices',   label: 'חשבוניות מס',          icon: 'invoice'      },
    { id: 'receipts',   label: 'קבלות',                icon: 'receipt'      },
    { id: 'credit',     label: 'ריכוז אשראי',          icon: 'credit-card'  },
    { id: 'reports',    label: 'דוחות ורווחיות',       icon: 'chart'        },
  ]},
  { group: 'בעלי עניין', items: [
    { id: 'customers',  label: 'לקוחות',               icon: 'users' },
    { id: 'suppliers',  label: 'ספקים',                icon: 'suppliers' },
  ]},
  { group: 'מלאי', items: [
    { id: 'inventory',  label: 'מלאי חומרי גלם',       icon: 'inventory' },
  ]},
  { group: 'מערכת', items: [
    { id: 'settings',   label: 'הגדרות',                icon: 'cog' },
  ]},
];

const Sidebar = ({ current, onNav }) => {
  const { ORDERS } = window.DATA;
  const badges = {
    active: ORDERS.filter(o => ['awaiting','design','printing','finishing','ready'].includes(o.status)).length || null,
  };

  return (
  <aside className="sidebar">
    <div className="sidebar__brand">
      <img src="assets/logo.jpeg" alt="מג'יק פרינט" />
    </div>
    {NAV_ITEMS.map(group => (
      <React.Fragment key={group.group}>
        <div className="sidebar__group-label">{group.group}</div>
        {group.items.map(it => (
          <button
            key={it.id}
            className={`nav-item ${current === it.id ? 'active' : ''}`}
            onClick={() => onNav(it.id)}
          >
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.liveDot && <span className="live-dot" style={{ marginInlineStart: 'auto' }}></span>}
            {it.dynBadge && badges[it.dynBadge] != null && (
              <span className="nav-badge">{badges[it.dynBadge]}</span>
            )}
          </button>
        ))}
      </React.Fragment>
    ))}
    <div className="sidebar__user">
      <div className="avatar">אא</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <b>אלי אליאס</b>
        <span>בעל העסק · מחובר</span>
      </div>
      <Icon name="cog" size={16} style={{ color: '#8B928E' }} />
    </div>
  </aside>
  );
};

const TITLES = {
  dashboard: { h: 'דשבורד', sub: 'מבט-על על היום שלך' },
  orders:    { h: 'הזמנות עבודה', sub: 'ניהול וזרימת ההזמנות במפעל' },
  printers:  { h: 'מכונות דפוס', sub: 'מצב חי - תורי הדפסה ויעדים יומיים' },
  invoices:  { h: 'חשבוניות מס', sub: 'מסונכרן עם רשות המיסים בישראל' },
  receipts:  { h: 'קבלות', sub: 'תיעוד תשלומים מלקוחות' },
  credit:    { h: 'ריכוז כרטיסי אשראי', sub: 'גביות, הפקדות ויתרות לסילוק' },
  reports:   { h: 'דוחות ורווחיות', sub: 'ניתוח ביצועי העסק' },
  customers: { h: 'לקוחות', sub: 'ספר לקוחות וכרטיסיות' },
  suppliers: { h: 'ספקים', sub: 'יתרות ותנאי תשלום מול ספקים' },
  inventory: { h: 'מלאי חומרי גלם', sub: 'מעקב נייר, דיו וחומרי גימור' },
  settings:  { h: 'הגדרות',         sub: 'פרטי עסק, מע"מ, עדכון גרסה' },
};

const Topbar = ({ section, onOpenNotif, notifCount, onNewOrder }) => {
  const t = TITLES[section] || { h: '', sub: '' };
  return (
    <header className="topbar">
      <div className="topbar__title">
        <h1>{t.h}</h1>
        <div className="crumbs">מג'יק פרינט · <b>{t.h}</b></div>
      </div>
      <div className="topbar__search">
        <Icon name="search" size={16} />
        <input placeholder="חיפוש מהיר - הזמנה, לקוח, חשבונית..." />
        <kbd>⌘K</kbd>
      </div>
      <div className="topbar__actions">
        <button className="btn teal" onClick={onNewOrder}>
          <Icon name="plus" size={15} />
          הזמנת עבודה חדשה
        </button>
        <button className="icon-btn" title="התראות" onClick={onOpenNotif}>
          <Icon name="bell" size={17} />
          {notifCount > 0 && <span className="dot"></span>}
        </button>
      </div>
    </header>
  );
};

window.Sidebar = Sidebar;
window.Topbar = Topbar;
