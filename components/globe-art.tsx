/**
 * GlobeArt — motif globe dot-grid / network arcs sebagai inline SVG.
 * Monokrom (hitam di cream), tanpa file gambar eksternal, tanpa gradient.
 * Murni dekoratif (aria-hidden).
 */

const DOTS: [number, number][] = [
  [60, 60], [140, 40], [230, 55], [320, 42], [400, 70],
  [90, 130], [180, 110], [270, 125], [355, 115], [440, 135],
  [55, 205], [150, 190], [235, 200], [330, 190], [415, 210],
  [100, 280], [190, 265], [285, 280], [370, 265], [445, 285],
  [70, 350], [160, 340], [250, 355], [340, 340], [425, 355],
];

export default function GlobeArt() {
  return (
    <svg
      viewBox="0 0 500 420"
      className="h-auto w-full"
      aria-hidden="true"
      role="presentation"
    >
      {/* Busur network */}
      <g fill="none" stroke="#0c0c0c" strokeOpacity="0.28" strokeWidth="1">
        <path d="M60 205 Q 250 60, 440 205" />
        <path d="M60 205 Q 250 130, 440 205" />
        <path d="M60 205 Q 250 280, 440 205" />
        <path d="M60 205 Q 250 350, 440 205" />
        <path d="M250 30 Q 120 205, 250 380" />
        <path d="M250 30 Q 180 205, 250 380" />
        <path d="M250 30 Q 320 205, 250 380" />
        <path d="M250 30 Q 380 205, 250 380" />
      </g>
      {/* Lingkaran globe */}
      <circle cx="250" cy="205" r="175" fill="none" stroke="#0c0c0c" strokeOpacity="0.35" strokeWidth="1" />
      <ellipse cx="250" cy="205" rx="175" ry="62" fill="none" stroke="#0c0c0c" strokeOpacity="0.22" strokeWidth="1" />
      <ellipse cx="250" cy="205" rx="175" ry="118" fill="none" stroke="#0c0c0c" strokeOpacity="0.22" strokeWidth="1" />
      {/* Dot grid */}
      <g fill="#0c0c0c">
        {DOTS.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 5 === 0 ? 3.5 : 2} opacity={i % 5 === 0 ? 0.85 : 0.35} />
        ))}
      </g>
      {/* Node aktif + label mono */}
      <circle cx="250" cy="205" r="6" fill="#0c0c0c" />
      <circle cx="250" cy="205" r="12" fill="none" stroke="#0c0c0c" strokeOpacity="0.4" strokeWidth="1" />
      <text x="250" y="404" textAnchor="middle" fontFamily="monospace" fontSize="11" letterSpacing="3" fill="#8a867c">
        HYMN-ROUTER / API V1
      </text>
    </svg>
  );
}
