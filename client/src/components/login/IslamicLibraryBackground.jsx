// خلفية صفحة الدخول: مكتبة إسلامية — محراب مذهّب حول البطاقة، زخرفة هندسية (نجمة ثمانية)،
// رفوف مخطوطات داخل أقواس جانبية، وقناديل معلّقة. كلها SVG مرسومة بالكود (بدون صور خارجية)
// وتتبع الوضع الفاتح/الداكن عبر currentColor وأصناف Tailwind.

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

// ألوان أغلفة المخطوطات: أحمر قرمزي، أخضر، كحلي، بنّي جلدي، مغرة
const SPINES = ["#7c2d2d", "#2f5d4a", "#24365f", "#6b4a2b", "#94702f", "#4a2f4f", "#1f4d5c"];

function Shelf({ y, rand }) {
  const books = [];
  let x = 26;
  while (x < 206) {
    const w = 8 + Math.floor(rand() * 9);
    if (x + w > 214) break;
    const flat = rand() < 0.09 && x + 34 < 214;
    const color = SPINES[Math.floor(rand() * SPINES.length)];
    if (flat) {
      // كومة كتب ممددة
      const stack = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < stack; i++) {
        const c = SPINES[Math.floor(rand() * SPINES.length)];
        books.push(<rect key={`${x}-f${i}`} x={x + i} y={y - 9 * (i + 1)} width={32 - i * 2} height={8} rx={1} fill={c} />);
        books.push(<rect key={`${x}-fb${i}`} x={x + 3 + i} y={y - 9 * (i + 1) + 3.5} width={26 - i * 2} height={1} fill="#e2ad36" opacity={0.55} />);
      }
      x += 36;
      continue;
    }
    const h = 46 + Math.floor(rand() * 30);
    books.push(
      <g key={x}>
        <rect x={x} y={y - h} width={w} height={h} rx={1.5} fill={color} />
        <rect x={x} y={y - h + 6} width={w} height={1.6} fill="#e2ad36" opacity={0.75} />
        <rect x={x} y={y - 9} width={w} height={1.6} fill="#e2ad36" opacity={0.75} />
        {rand() < 0.5 && <circle cx={x + w / 2} cy={y - h / 2} r={Math.min(2.4, w / 4)} fill="#e2ad36" opacity={0.6} />}
        <rect x={x + w - 1.5} y={y - h} width={1.5} height={h} fill="#000" opacity={0.18} />
      </g>
    );
    x += w + (rand() < 0.15 ? 2 : 0.6);
  }
  return (
    <g>
      {books}
      <rect x={18} y={y} width={204} height={7} className="fill-[#8a6a3a] dark:fill-[#3a2f22]" />
      <rect x={18} y={y + 7} width={204} height={3} fill="#000" opacity={0.2} />
    </g>
  );
}

const NICHE_ARCH = "M10 520 V176 C10 96 66 44 120 12 C174 44 230 96 230 176 V520 Z";

// قوس جانبي فيه رفوف مخطوطات
function ShelfNiche({ seed, className }) {
  const rand = seeded(seed);
  const clipId = `niche-clip-${seed}`;
  return (
    <svg viewBox="0 0 240 520" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={NICHE_ARCH} />
        </clipPath>
        <linearGradient id={`niche-shade-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={NICHE_ARCH} className="fill-[#efe4c8] dark:fill-[#0b1430]" />
      <g clipPath={`url(#${clipId})`}>
        {[208, 300, 392, 484].map((y) => (
          <Shelf key={y} y={y} rand={rand} />
        ))}
        <rect width="240" height="520" fill={`url(#niche-shade-${seed})`} />
      </g>
      <path d={NICHE_ARCH} fill="none" stroke="currentColor" strokeWidth="3" />
      <path
        d="M22 520 V180 C22 106 74 58 120 28 C166 58 218 106 218 180 V520"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}

// قنديل (فانوس) معلّق
function Lantern({ className, chain = 90 }) {
  return (
    <svg viewBox={`0 0 60 ${chain + 120}`} className={className} aria-hidden="true">
      <defs>
        <radialGradient id="lantern-light" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd57a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e2ad36" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <line x1="30" y1="0" x2="30" y2={chain} stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
      <g transform={`translate(0 ${chain})`} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M30 0 L38 10 H22 Z" fill="currentColor" />
        <path d="M18 10 H42 L46 22 H14 Z" fill="currentColor" opacity="0.85" />
        <path d="M14 22 H46 L42 76 H18 Z" fill="url(#lantern-light)" />
        <path d="M30 22 V76 M22 22 L24 76 M38 22 L36 76" fill="none" opacity="0.7" />
        <path d="M30 34 L35 42 L30 50 L25 42 Z" fill="currentColor" opacity="0.6" />
        <path d="M16 76 H44 L38 88 H22 Z" fill="currentColor" opacity="0.85" />
        <path d="M30 88 V100" fill="none" />
        <circle cx="30" cy="103" r="3" fill="currentColor" />
      </g>
    </svg>
  );
}

// المحراب: قوس مدبّب مذهّب يحيط ببطاقة الدخول
const ARCH_OUTER = "M40 800 V300 C40 150 140 60 300 22 C460 60 560 150 560 300 V800";
const ARCH_INNER = "M70 800 V306 C70 172 160 90 300 58 C440 90 530 172 530 306 V800";

function Mihrab({ className }) {
  return (
    <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMax meet" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mihrab-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="[stop-color:#fffaf0] dark:[stop-color:#1a2a52]" stopOpacity="0.9" />
          <stop offset="1" className="[stop-color:#fffaf0] dark:[stop-color:#111b36]" stopOpacity="0.25" />
        </linearGradient>
        <pattern id="mihrab-band" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M8 1 L15 8 L8 15 L1 8 Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
        </pattern>
      </defs>
      {/* الشريط المزخرف بين الحدّين */}
      <path d={`${ARCH_OUTER} Z`} fill="url(#mihrab-band)" opacity="0.45" />
      <path d={`${ARCH_INNER} Z`} fill="url(#mihrab-fill)" />
      <path d={ARCH_OUTER} fill="none" stroke="currentColor" strokeWidth="3" />
      <path d={ARCH_INNER} fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M84 800 V310 C84 184 170 106 300 76 C430 106 516 184 516 310 V800"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
      {/* نجمة ثمانية في قمّة القوس */}
      <g transform="translate(300 22)" fill="currentColor">
        <rect x="-11" y="-11" width="22" height="22" />
        <rect x="-11" y="-11" width="22" height="22" transform="rotate(45)" />
        <circle r="4.5" className="fill-[#fffaf0] dark:fill-[#111b36]" />
      </g>
    </svg>
  );
}

export default function IslamicLibraryBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* الأساس: رقّ دافئ في الوضع الفاتح، كحلي ليلي في الوضع الداكن */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fbf6ea] via-[#f4ecd8] to-[#eadcb8] dark:from-[#0a1129] dark:via-primary-950 dark:to-[#070c1d]" />

      {/* زخرفة هندسية: نجوم ثمانية (خاتم) تتلاشى نحو الوسط حتى لا تزاحم النموذج */}
      <svg className="absolute inset-0 w-full h-full text-primary-800/25 dark:text-gold-400/20">
        <defs>
          <pattern id="khatam" width="80" height="80" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              {[
                [0, 0],
                [80, 0],
                [0, 80],
                [80, 80],
                [40, 40],
              ].map(([cx, cy]) => (
                <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy})`}>
                  <rect x="-14" y="-14" width="28" height="28" />
                  <rect x="-14" y="-14" width="28" height="28" transform="rotate(45)" />
                  <circle r="5" />
                </g>
              ))}
              {[
                [40, 0],
                [0, 40],
                [80, 40],
                [40, 80],
              ].map(([cx, cy]) => (
                <path key={`${cx}-${cy}`} d={`M${cx} ${cy - 7} L${cx + 7} ${cy} L${cx} ${cy + 7} L${cx - 7} ${cy} Z`} />
              ))}
            </g>
          </pattern>
          <radialGradient id="khatam-fade" cx="0.5" cy="0.55" r="0.65">
            <stop offset="0.25" stopColor="#000" />
            <stop offset="1" stopColor="#fff" />
          </radialGradient>
          <mask id="khatam-mask">
            <rect width="100%" height="100%" fill="url(#khatam-fade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#khatam)" mask="url(#khatam-mask)" />
      </svg>

      {/* توهّج دافئ خلف المحراب */}
      <div className="login-glow absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] rounded-full bg-gold-200/50 dark:bg-gold-500/10 blur-3xl" />

      {/* رفوف المخطوطات داخل أقواس جانبية (الشاشات الواسعة) */}
      <div className="hidden lg:block text-gold-600/80 dark:text-gold-500/60">
        <ShelfNiche seed={7} className="absolute bottom-0 left-[3%] xl:left-[7%] h-[72vh] max-h-[620px]" />
        <ShelfNiche seed={21} className="absolute bottom-0 right-[3%] xl:right-[7%] h-[72vh] max-h-[620px]" />
      </div>

      {/* المحراب حول البطاقة */}
      <Mihrab className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[96vh] min-h-[640px] max-w-none text-gold-600/80 dark:text-gold-400/70" />

      {/* قناديل معلّقة */}
      <div className="hidden sm:block text-gold-700 dark:text-gold-400">
        <Lantern className="login-lantern absolute top-0 left-[18%] lg:left-[24%] w-10 lg:w-12" chain={70} />
        <Lantern className="login-lantern absolute top-0 right-[18%] lg:right-[24%] w-10 lg:w-12 [animation-delay:-3s]" chain={110} />
      </div>

      {/* أرضية: ظلّ سفلي ناعم */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#d9c697]/60 to-transparent dark:from-black/50" />
    </div>
  );
}
