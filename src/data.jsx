// Data layer — fetches from Express/SQLite backend via /api/data
// Static constants that don't change between requests

const PRODUCT_TYPES = [
  { id: 'business-cards', name: 'כרטיסי ביקור', icon: 'tag' },
  { id: 'flyer',          name: 'פליירים',       icon: 'paper' },
  { id: 'brochure',       name: 'חוברות',        icon: 'paper' },
  { id: 'banner',         name: 'באנרים',        icon: 'flag' },
  { id: 'roll-up',        name: 'רול-אפ',        icon: 'flag' },
  { id: 'sticker',        name: 'מדבקות',        icon: 'sparkle' },
  { id: 'poster',         name: 'פוסטרים',       icon: 'image' },
  { id: 'invitation',     name: 'הזמנות',        icon: 'mail' },
  { id: 'envelope',       name: 'מעטפות',        icon: 'mail' },
  { id: 'bag',            name: 'שקיות נייר',    icon: 'package' },
];

const STATUS = {
  pending:   { label: 'הצעת מחיר',     chip: 'muted' },
  draft:     { label: 'טיוטה',          chip: 'muted' },
  awaiting:  { label: 'ממתינה לאישור',  chip: 'warn' },
  design:    { label: 'בעיצוב',         chip: 'violet' },
  printing:  { label: 'בדפוס',          chip: 'teal' },
  finishing: { label: 'בגימור',         chip: 'teal' },
  ready:     { label: 'מוכן לאיסוף',    chip: 'success' },
  done:      { label: 'הושלם',          chip: 'success' },
  delivered: { label: 'נמסר ללקוח',     chip: 'outline' },
  paid:      { label: 'שולם',           chip: 'success' },
};

const STATUS_FLOW = ['awaiting', 'design', 'printing', 'finishing', 'ready'];

const USERS = [
  { id: 1, name: 'אלי אליאס', role: 'בעל העסק',      avatar: 'אא', online: true },
  { id: 2, name: 'רחל פז',     role: 'מנהלת חשבונות', avatar: 'רפ', online: true },
  { id: 3, name: 'אדם קרן',    role: 'פקיד קבלה',     avatar: 'אק', online: true },
  { id: 4, name: 'מאיה רוז',   role: 'מעצבת גרפית',   avatar: 'מר', online: true },
  { id: 5, name: 'דורון עמר',  role: 'מפעיל מכונה',   avatar: 'דע', online: true },
];

// Initialize with empty arrays — will be populated by loadData()
window.DATA = {
  PRODUCT_TYPES,
  STATUS,
  STATUS_FLOW,
  USERS,
  ORDERS:           [],
  CUSTOMERS:        [],
  INVOICES:         [],
  RECEIPTS:         [],
  SUPPLIERS:        [],
  SUPPLIER_INVOICES:[],
  INVENTORY:        [],
  PRINTERS:         [],
  NOTIFICATIONS:    [],
  VAT_RATE:         18,
};

// Fetch all data from backend and populate window.DATA
window.loadData = async () => {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  Object.assign(window.DATA, data);
};
