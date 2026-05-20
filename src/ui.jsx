// Tiny UI primitives shared across screens.

const Chip = ({ tone = 'muted', dot = true, children }) => (
  <span className={`chip ${tone}`}>
    {dot && <span className="dot"></span>}
    {children}
  </span>
);

const Avatar = ({ name, size = 28, tone = 'teal' }) => (
  <span
    className="avatar-sm"
    style={{ width: size, height: size, fontSize: size * 0.4 }}
  >
    {name}
  </span>
);

const StatusChip = ({ status }) => {
  const s = window.DATA.STATUS[status];
  if (!s) return null;
  return <Chip tone={s.chip}>{s.label}</Chip>;
};

const Spark = ({ data = [], lit = -1 }) => (
  <div className="spark">
    {data.map((v, i) => (
      <div key={i} className={`b ${i === lit ? 'lit' : ''}`} style={{ height: `${Math.max(8, v)}%` }}></div>
    ))}
  </div>
);

function detectBrand(name, model) {
  const s = ((name || '') + ' ' + (model || '')).toLowerCase();
  if (s.includes('hp') || s.includes('indigo'))       return { label: 'HP',            color: '#0096D6' };
  if (s.includes('canon'))                            return { label: 'Canon',          color: '#CC0000' };
  if (s.includes('epson'))                            return { label: 'Epson',          color: '#003087' };
  if (s.includes('brother'))                          return { label: 'Brother',        color: '#00539F' };
  if (s.includes('konica') || s.includes('minolta'))  return { label: 'Konica Minolta', color: '#EE1C25' };
  if (s.includes('ricoh'))                            return { label: 'Ricoh',          color: '#004B87' };
  if (s.includes('xerox'))                            return { label: 'Xerox',          color: '#EE1C25' };
  if (s.includes('roland'))                           return { label: 'Roland',         color: '#003087' };
  if (s.includes('heidelberg'))                       return { label: 'Heidelberg',     color: '#D40000' };
  if (s.includes('microsoft') || s.includes('onenote')) return { label: 'Microsoft',   color: '#00A4EF' };
  if (s.includes('kyocera'))                          return { label: 'Kyocera',        color: '#CC0000' };
  if (s.includes('sharp'))                            return { label: 'Sharp',          color: '#0047BB' };
  return null;
}

const BrandBadge = ({ name, model }) => {
  const brand = detectBrand(name, model);
  if (!brand) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 5,
      fontSize: 10.5,
      fontWeight: 700,
      background: brand.color,
      color: '#fff',
      letterSpacing: '.02em',
      marginTop: 3,
    }}>{brand.label}</span>
  );
};

window.Chip = Chip;
window.Avatar = Avatar;
window.StatusChip = StatusChip;
window.Spark = Spark;
window.BrandBadge = BrandBadge;
