// Icon library - simple inline SVGs, lucide-style
const Icon = ({ name, size = 18, ...rest }) => {
  const props = {
    width: size, height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...rest,
  };
  switch (name) {
    case 'home': return <svg {...props}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>;
    case 'orders': return <svg {...props}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
    case 'users': return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5c2.7 0 5.5 1.7 5.5 4.5"/></svg>;
    case 'invoice': return <svg {...props}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
    case 'receipt': return <svg {...props}><path d="M5 3h14v18l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3"/></svg>;
    case 'suppliers': return <svg {...props}><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/></svg>;
    case 'inventory': return <svg {...props}><path d="M3 8 12 4l9 4-9 4-9-4z"/><path d="M3 8v9l9 4 9-4V8"/><path d="M12 12v9"/></svg>;
    case 'printer': return <svg {...props}><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><rect x="6" y="14" width="12" height="7" rx="1"/><circle cx="18" cy="12.5" r=".7" fill="currentColor"/></svg>;
    case 'design': return <svg {...props}><path d="M12 19l7-7 3 3-7 7-3 0z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18"/><circle cx="6" cy="6" r="2"/></svg>;
    case 'chart': return <svg {...props}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 2 5-6"/></svg>;
    case 'calendar': return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'bell': return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'plus': return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'check': return <svg {...props}><path d="M5 12l5 5 9-11"/></svg>;
    case 'check-circle': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>;
    case 'x': return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'filter': return <svg {...props}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>;
    case 'dots': return <svg {...props}><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/></svg>;
    case 'arrow-down': return <svg {...props}><path d="M12 5v14M6 13l6 6 6-6"/></svg>;
    case 'arrow-up': return <svg {...props}><path d="M12 19V5M6 11l6-6 6 6"/></svg>;
    case 'arrow-left': return <svg {...props}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>;
    case 'arrow-right': return <svg {...props}><path d="M5 12h14M13 18l6-6-6-6"/></svg>;
    case 'shield': return <svg {...props}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'money': return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v.01M18 14v.01"/></svg>;
    case 'package': return <svg {...props}><path d="m12 3 9 5v8l-9 5-9-5V8z"/><path d="m3 8 9 5 9-5M12 13v10"/></svg>;
    case 'truck': return <svg {...props}><path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
    case 'phone': return <svg {...props}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>;
    case 'mail': return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>;
    case 'user': return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case 'edit': return <svg {...props}><path d="M15 4 4 15v5h5L20 9z"/><path d="m13 6 5 5"/></svg>;
    case 'trash': return <svg {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>;
    case 'download': return <svg {...props}><path d="M12 4v12M6 11l6 6 6-6M4 20h16"/></svg>;
    case 'upload': return <svg {...props}><path d="M12 20V8M6 13l6-6 6 6M4 20h16"/></svg>;
    case 'eye': return <svg {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'palette': return <svg {...props}><path d="M12 3a9 9 0 1 0 0 18 3 3 0 0 1 0-6c4 0 8-2 8-6 0-3.5-3-6-8-6z"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/></svg>;
    case 'cog': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2"/></svg>;
    case 'sparkle': return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'lock': return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'logout': return <svg {...props}><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9"/></svg>;
    case 'clock': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'warning': return <svg {...props}><path d="M12 3 2 21h20z"/><path d="M12 10v4M12 18v.01"/></svg>;
    case 'flag': return <svg {...props}><path d="M4 21V4l8 2 8-2v11l-8 2-8-2z"/></svg>;
    case 'tag': return <svg {...props}><path d="M3 13V4h9l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/></svg>;
    case 'image': return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/></svg>;
    case 'paper': return <svg {...props}><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></svg>;
    case 'box': return <svg {...props}><path d="m12 3 9 4-9 4-9-4 9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>;
    case 'cube': return <svg {...props}><path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg>;
    case 'wallet': return <svg {...props}><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/></svg>;
    case 'building': return <svg {...props}><path d="M4 21V5l8-2v18M12 9h6v12M8 7v.01M8 11v.01M8 15v.01M15 13v.01M15 17v.01"/></svg>;
    case 'qr': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 17v4M14 19h3M17 21h4"/></svg>;
    case 'play': return <svg {...props}><path d="M7 4v16l13-8z" fill="currentColor"/></svg>;
    case 'pause': return <svg {...props}><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>;
    case 'paint': return <svg {...props}><rect x="5" y="3" width="14" height="6" rx="1"/><path d="M5 9v3h14V9M12 12v4a2 2 0 0 0 2 2v3"/></svg>;
    case 'banknote': return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'credit-card': return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h2M12 15h4"/></svg>;
    case 'transfer': return <svg {...props}><path d="M4 6h16M4 12h10M4 18h7"/><path d="M17 15l4-3-4-3"/></svg>;
    case 'refresh': return <svg {...props}><path d="M3 12a9 9 0 0 1 15.5-6L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6L3 16M3 21v-5h5"/></svg>;
    case 'send': return <svg {...props}><path d="m21 3-9 18-2-8-8-2z"/></svg>;
    case 'help': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.6V14M12 17v.01"/></svg>;
    case 'star': return <svg {...props}><path d="m12 3 2.9 6.3 6.6.8-4.9 4.5 1.4 6.6L12 18l-6 3.2 1.4-6.6-4.9-4.5 6.6-.8z"/></svg>;
    case 'menu': return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'fire': return <svg {...props}><path d="M12 3c2 4 6 5 6 11a6 6 0 0 1-12 0c0-3 1.5-4 2.5-5.5C9 12 11 11 12 3z"/></svg>;
    case 'info': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 11v5"/></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

window.Icon = Icon;
