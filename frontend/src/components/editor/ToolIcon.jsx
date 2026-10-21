const S = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };

export function ToolIcon({ type, className = "w-5 h-5" }) {
  const v = "0 0 24 24";
  switch (type) {
    case "move":
      return (<svg viewBox={v} className={className}><path {...S} d="M4 19 C8 14 12 13 18 7" /><path d="M20 5 l-1.5 6 -4.5 -4.5z" fill="currentColor" /></svg>);
    case "offball":
      return (<svg viewBox={v} className={className}><path {...S} strokeWidth={1.6} d="M4 19 Q10 8 18 7" /><path {...S} strokeWidth={1.6} d="M14 4.5 L19.5 7 L15.5 11.5" /></svg>);
    case "dribble":
      return (<svg viewBox={v} className={className}><path {...S} d="M3 16 l2 -3 2 3 2 -3 2 3 2 -3 2 3 3 -5" /><path d="M21 8 l-1 5 -3.6 -2.6z" fill="currentColor" /></svg>);
    case "pass":
      return (<svg viewBox={v} className={className}><path {...S} strokeDasharray="3 3" d="M3 18 L17 8" /><path d="M20 6 l-2.2 5.5 -3.3 -4.5z" fill="currentColor" /></svg>);
    case "screen":
      return (<svg viewBox={v} className={className}><path {...S} d="M4 19 L15 9" /><path {...S} strokeWidth={3} d="M11.5 5.5 L18.5 12.5" /></svg>);
    case "line":
      return (<svg viewBox={v} className={className}><path {...S} d="M4 19 L20 5" /></svg>);
    case "zone":
      return (<svg viewBox={v} className={className}><ellipse cx="12" cy="12" rx="9" ry="6" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" /></svg>);
    case "zoneRect":
      return (<svg viewBox={v} className={className}><rect x="3" y="6" width="18" height="12" rx="2.5" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" /></svg>);
    case "symbol":
      return (<svg viewBox={v} className={className}><circle cx="12" cy="12" r="9" fill="currentColor" /><text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0B111C" fontFamily="Barlow Condensed">B</text></svg>);
    default:
      return null;
  }
}
