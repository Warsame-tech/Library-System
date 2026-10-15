// لوحة فنية لصفحة الدخول: مكتبة إسلامية — خزانة مخطوطات بشكل محراب، زخرفة النجمة الثمانية،
// قناديل معلّقة، وآية «اقرأ». ألوانها ثابتة (كحلي وذهبي) في الوضعين لتطابق الشريط الجانبي للنظام.
// كلها SVG مرسومة بالكود بدون صور خارجية.

const GOLD = "#e2ad36";

// مولّد أرقام شبه عشوائية ثابت حتى تبقى الرفوف نفسها في كل مرة
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ألوان أغلفة المخطوطات: قرمزي، أخضر، كحلي، بنّي جلدي، مغرة، بنفسجي، أزرق مخضرّ
const SPINES = ["#8a3232", "#2f6a52", "#2b4374", "#7a5530", "#a07a32", "#563761", "#22596a"];

function Shelf({ y, x0, x1, rand }) {
  const items = [];
  let x = x0;
  while (x < x1 - 6) {
    const pick = () => SPINES[Math.floor(rand() * SPINES.length)];
    // أحياناً كومة كتب ممددة
    if (rand() < 0.1 && x + 30 < x1) {
      const stack = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < stack; i++) {
        const top = y - 8 * (i + 1);
        items.push(<rect key={`${x}-s${i}`} x={x + i} y={top} width={28 - i * 2} height={7.2} rx={1} fill={pick()} />);
        items.push(<rect key={`${x}-sb${i}`} x={x + 3 + i} y={top + 3} width={22 - i * 2} height={0.9} fill={GOLD} opacity={0.6} />);
      }
      x += 32;
      continue;
    }
    const w = 7 + Math.floor(rand() * 8);
    if (x + w > x1) break;
    const h = 38 + Math.floor(rand() * 24);
    items.push(
      <g key={x}>
        <rect x={x} y={y - h} width={w} height={h} rx={1.2} fill={pick()} />
        <rect x={x} y={y - h + 5} width={w} height={1.4} fill={GOLD} opacity={0.8} />
        <rect x={x} y={y - 8} width={w} height={1.4} fill={GOLD} opacity={0.8} />
        {rand() < 0.5 && <circle cx={x + w / 2} cy={y - h / 2} r={Math.min(2, w / 4)} fill={GOLD} opacity={0.65} />}
        <rect x={x + w - 1.3} y={y - h} width={1.3} height={h} fill="#000" opacity={0.2} />
      </g>
    );
    x += w + (rand() < 0.12 ? 2.5 : 0.6);
  }
  return (
    <g>
      {items}
      <rect x={x0 - 8} y={y} width={x1 - x0 + 16} height={6} fill="#4a3a25" />
      <rect x={x0 - 8} y={y} width={x1 - x0 + 16} height={1.2} fill={GOLD} opacity={0.5} />
    </g>
  );
}

const ARCH = "M24 420 V160 C24 88 92 40 150 14 C208 40 276 88 276 160 V420 Z";

// خزانة كتب بشكل محراب
function ArchBookcase({ className }) {
  const rand = seeded(11);
  return (
    <svg viewBox="0 0 300 432" className={className} aria-hidden="true">
      <defs>
        <clipPath id="bookcase-clip">
          <path d={ARCH} />
        </clipPath>
        <linearGradient id="bookcase-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1228" />
          <stop offset="1" stopColor="#131f40" />
        </linearGradient>
        <radialGradient id="bookcase-light" cx="0.5" cy="0.05" r="0.7">
          <stop offset="0" stopColor="#ffd57a" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffd57a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={ARCH} fill="url(#bookcase-inner)" />
      <g clipPath="url(#bookcase-clip)">
        {/* زخرفة مشبّكة في رأس القوس */}
        <g fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.35">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx="150" cy="150" r={22 + i * 16} />
          ))}
        </g>
        {[196, 268, 340, 412].map((y) => (
          <Shelf key={y} y={y} x0={42} x1={258} rand={rand} />
        ))}
        <rect width="300" height="432" fill="url(#bookcase-light)" />
      </g>
      <path d={ARCH} fill="none" stroke={GOLD} strokeWidth="3.5" />
      <path d="M34 420 V164 C34 98 98 54 150 30 C202 54 266 98 266 164 V420" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.6" />
      {/* قاعدة الخزانة */}
      <rect x="14" y="418" width="272" height="10" rx="2" fill={GOLD} />
      {/* نجمة ثمانية في قمّة القوس */}
      <g transform="translate(150 14)" fill={GOLD}>
        <rect x="-10" y="-10" width="20" height="20" />
        <rect x="-10" y="-10" width="20" height="20" transform="rotate(45)" />
        <circle r="4" fill="#111b36" />
      </g>
    </svg>
  );
}

// قنديل (فانوس) معلّق
function Lantern({ className, chain = 80 }) {
  return (
    <svg viewBox={`0 0 60 ${chain + 108}`} className={className} aria-hidden="true">
      <defs>
        <radialGradient id="lantern-glass" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#ffe3a1" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <line x1="30" y1="0" x2="30" y2={chain} stroke={GOLD} strokeWidth="1.2" strokeDasharray="3 2" />
      <g transform={`translate(0 ${chain})`} stroke={GOLD} strokeWidth="1.4" strokeLinejoin="round">
        <path d="M30 0 L38 10 H22 Z" fill={GOLD} />
        <path d="M18 10 H42 L46 22 H14 Z" fill={GOLD} />
        <path d="M14 22 H46 L42 76 H18 Z" fill="url(#lantern-glass)" />
        <path d="M30 22 V76 M22 22 L24 76 M38 22 L36 76" fill="none" opacity="0.7" />
        <path d="M16 76 H44 L38 88 H22 Z" fill={GOLD} />
        <circle cx="30" cy="96" r="3" fill={GOLD} />
      </g>
    </svg>
  );
}

// نقش النجمة الثمانية (خاتم) كخلفية متكررة
function KhatamPattern({ id, className }) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={GOLD} strokeWidth="0.9">
            {[
              [0, 0],
              [64, 0],
              [0, 64],
              [64, 64],
              [32, 32],
            ].map(([cx, cy]) => (
              <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy})`}>
                <rect x="-11" y="-11" width="22" height="22" />
                <rect x="-11" y="-11" width="22" height="22" transform="rotate(45)" />
              </g>
            ))}
            {[
              [32, 0],
              [0, 32],
              [64, 32],
              [32, 64],
            ].map(([cx, cy]) => (
              <path key={`${cx}-${cy}`} d={`M${cx} ${cy - 5} L${cx + 5} ${cy} L${cx} ${cy + 5} L${cx - 5} ${cy} Z`} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export default function LoginArtwork() {
  return (
    <div className="relative overflow-hidden h-full bg-gradient-to-b from-primary-800 via-primary-900 to-primary-950 text-center">
      <KhatamPattern id="login-khatam" className="absolute inset-0 w-full h-full opacity-[0.13]" />
      {/* توهّج دافئ خلف الخزانة */}
      <div aria-hidden="true" className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gold-400/15 blur-3xl" />

      {/* قناديل معلّقة (الشاشات الواسعة) */}
      <Lantern className="login-lantern hidden lg:block absolute top-0 left-[13%] w-9" chain={60} />
      <Lantern className="login-lantern hidden lg:block absolute top-0 right-[13%] w-9 [animation-delay:-2.5s]" chain={95} />

      <div className="relative h-full flex flex-col items-center justify-center gap-4 lg:gap-6 px-6 py-6 lg:py-12">
        <ArchBookcase className="w-28 sm:w-32 lg:w-56 xl:w-60 drop-shadow-[0_12px_30px_rgba(0,0,0,0.45)]" />

        <div>
          <p dir="rtl" lang="ar" className="font-amiri text-[1.35rem] lg:text-[1.85rem] leading-relaxed font-bold text-gold-300">
            ﴿ اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ ﴾
          </p>
          <p className="mt-1 text-xs lg:text-sm font-medium text-primary-100/75">
            “Read in the name of your Lord who created” — Al-ʿAlaq 96:1
          </p>
        </div>

        {/* فاصل زخرفي */}
        <div aria-hidden="true" className="hidden lg:flex items-center gap-3 text-gold-400/70">
          <span className="h-px w-16 bg-gradient-to-l from-gold-400/70 to-transparent" />
          <svg viewBox="-12 -12 24 24" className="w-4 h-4" fill="currentColor">
            <rect x="-7" y="-7" width="14" height="14" />
            <rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" />
          </svg>
          <span className="h-px w-16 bg-gradient-to-r from-gold-400/70 to-transparent" />
        </div>
      </div>
    </div>
  );
}
