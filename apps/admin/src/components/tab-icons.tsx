// Illustrated icons from the customer app (ported from react-native-svg to web SVG).
// Illustrated tab icons (custom vector art). Inactive = soft greys, active = full Sotechy colours.

type Props = { active: boolean; size?: number };

const grey = { light: "#E4DED7", mid: "#C6BDB3", dark: "#958B81", ink: "#7D746B" };
const pick = (active: boolean, on: string, off: string) => (active ? on : off);

export function HomeIcon({ active, size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* chimney */}
      <rect x={31} y={9} width={5} height={9} rx={1} fill={pick(active, "#C2410C", grey.dark)} />
      {/* walls */}
      <rect x={9} y={21} width={30} height={20} rx={3} fill={pick(active, "#FFE3B3", grey.light)} />
      {/* roof */}
      <path d="M4.5 23.5 L24 8 L43.5 23.5 C44.6 24.4 44 26 42.6 26 H5.4 C4 26 3.4 24.4 4.5 23.5 Z" fill={pick(active, "#F7931E", grey.mid)} />
      {/* door */}
      <rect x={20} y={29} width={8} height={12} rx={2} fill={pick(active, "#3A322C", grey.ink)} />
      <circle cx={26} cy={35.5} r={0.9} fill={pick(active, "#FDB913", grey.light)} />
      {/* window */}
      <rect x={30.5} y={29} width={5.5} height={5.5} rx={1.2} fill={pick(active, "#5CB8F2", grey.mid)} />
      <rect x={12} y={29} width={5.5} height={5.5} rx={1.2} fill={pick(active, "#5CB8F2", grey.mid)} />
      {/* ground */}
      <rect x={6} y={40} width={36} height={2.5} rx={1.25} fill={pick(active, "#E07F0C", grey.mid)} />
    </svg>
  );
}

export function ShopIcon({ active, size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* handle */}
      <path d="M17 19 V14.5 a7 7 0 0 1 14 0 V19" stroke={pick(active, "#3A322C", grey.ink)} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* bag */}
      <path d="M9.5 18 H38.5 L36.6 39.5 a3 3 0 0 1 -3 2.7 H14.4 a3 3 0 0 1 -3 -2.7 Z" fill={pick(active, "#F7931E", grey.mid)} />
      {/* fold */}
      <path d="M9.5 18 H38.5 L38.1 22.5 H9.9 Z" fill={pick(active, "#E07F0C", grey.dark)} />
      {/* handle rivets */}
      <circle cx={17} cy={20.5} r={1.5} fill={pick(active, "#3A322C", grey.ink)} />
      <circle cx={31} cy={20.5} r={1.5} fill={pick(active, "#3A322C", grey.ink)} />
      {/* sparkle tag */}
      <path d="M24 26.5 l1.9 4 4 1.9 -4 1.9 -1.9 4 -1.9 -4 -4 -1.9 4 -1.9 Z" fill={pick(active, "#FFF4D6", grey.light)} />
    </svg>
  );
}

export function CartIcon({ active, size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* parcel peeking out */}
      <rect x={20} y={9} width={12} height={11} rx={1.5} fill={pick(active, "#F7931E", grey.mid)} />
      <rect x={25} y={9} width={2.5} height={11} fill={pick(active, "#FFD27A", grey.light)} />
      {/* basket */}
      <path d="M13.5 17 H42 a1.5 1.5 0 0 1 1.4 1.9 L39.6 31.4 a2.5 2.5 0 0 1 -2.4 1.8 H18.6 Z" fill={pick(active, "#FDB913", grey.light)} />
      {/* frame */}
      <path d="M5 10 H10.5 L16.5 33.2 H38" stroke={pick(active, "#3A322C", grey.ink)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* wheels */}
      <circle cx={19.5} cy={39} r={3.2} fill={pick(active, "#3A322C", grey.ink)} />
      <circle cx={35} cy={39} r={3.2} fill={pick(active, "#3A322C", grey.ink)} />
    </svg>
  );
}

export function OrdersIcon({ active, size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* box */}
      <rect x={8} y={18} width={32} height={23} rx={2.5} fill={pick(active, "#F6B23A", grey.light)} />
      {/* stripes */}
      <rect x={8} y={26} width={32} height={2} fill={pick(active, "#E9A12A", grey.mid)} />
      <rect x={8} y={32} width={32} height={2} fill={pick(active, "#E9A12A", grey.mid)} />
      {/* lid */}
      <rect x={5.5} y={11} width={37} height={9} rx={2.5} fill={pick(active, "#F7931E", grey.mid)} />
      {/* tape */}
      <rect x={21} y={11} width={6} height={30} fill={pick(active, "#FFE3A3", grey.light)} opacity={0.95} />
      {/* label */}
      <rect x={29.5} y={34} width={7} height={4} rx={1} fill={pick(active, "#FFFFFF", grey.light)} />
    </svg>
  );
}

export function AccountIcon({ active, size = 40 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* badge */}
      <circle cx={24} cy={24} r={19} fill={pick(active, "#FDB913", grey.light)} />
      {/* shoulders */}
      <path d="M10.5 37.5 a13.5 11 0 0 1 27 0 a19 19 0 0 1 -27 0 Z" fill={pick(active, "#3A322C", grey.dark)} />
      {/* head */}
      <circle cx={24} cy={20} r={7.5} fill={pick(active, "#FFF4E0", grey.mid)} />
      {/* eyes and smile */}
      <circle cx={21.4} cy={19.4} r={1.1} fill={pick(active, "#3A322C", grey.ink)} />
      <circle cx={26.6} cy={19.4} r={1.1} fill={pick(active, "#3A322C", grey.ink)} />
      <path d="M21.2 22.6 a3.2 3.2 0 0 0 5.6 0" stroke={pick(active, "#3A322C", grey.ink)} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Illustrated menu icon: three rounded bars in Sotechy colours with a sparkle. */
export function MenuIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      {/* bars */}
      <rect x={7} y={10} width={34} height={7} rx={3.5} fill="#F7931E" />
      <rect x={7} y={20.5} width={23} height={7} rx={3.5} fill="#C2410C" />
      <rect x={7} y={31} width={29} height={7} rx={3.5} fill="#FDB913" />
      {/* highlights */}
      <rect x={10} y={11.6} width={10} height={2} rx={1} fill="#FFD9A8" />
      <rect x={10} y={22.1} width={7} height={2} rx={1} fill="#E8692E" />
      <rect x={10} y={32.6} width={8} height={2} rx={1} fill="#FFF0C2" />
      {/* sparkle */}
      <path d="M38 19.5 l1.4 2.9 2.9 1.4 -2.9 1.4 -1.4 2.9 -1.4 -2.9 -2.9 -1.4 2.9 -1.4 Z" fill="#FDB913" />
    </svg>
  );
}

/** Friendly support agent with a headset, used for the live-chat launcher. */
export function SupportAgentArt({ size = 60 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={32} fill="#FDB913" />
      {/* shoulders / top */}
      <path d="M12 58 C13 46 21 41 32 41 C43 41 51 46 52 58 C46 62.5 39.5 64 32 64 C24.5 64 18 62.5 12 58 Z" fill="#3A322C" />
      <path d="M27 41.5 L32 47 L37 41.5 Z" fill="#FFF4E0" />
      {/* neck + head */}
      <rect x={28.5} y={33} width={7} height={8} rx={3} fill="#F3DFC4" />
      <circle cx={32} cy={26} r={11} fill="#FFF4E0" />
      {/* hair */}
      <path d="M21 25 C21 16.5 26 13 32.5 13 C39 13 43.5 17 43 24.5 C40 21 35 19.5 29 20.5 C26 21 23 22.5 21 25 Z" fill="#3A322C" />
      {/* face */}
      <circle cx={28} cy={27} r={1.3} fill="#3A322C" />
      <circle cx={36} cy={27} r={1.3} fill="#3A322C" />
      <path d="M28.6 31 a3.8 3.8 0 0 0 6.8 0" stroke="#3A322C" strokeWidth={1.6} strokeLinecap="round" fill="none" />
      {/* headset */}
      <path d="M19.5 27 C19.5 17.5 25 11.5 32 11.5 C39 11.5 44.5 17.5 44.5 27" stroke="#F7931E" strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <rect x={16.5} y={23.5} width={6} height={9.5} rx={3} fill="#F7931E" />
      <rect x={41.5} y={23.5} width={6} height={9.5} rx={3} fill="#F7931E" />
      <path d="M19.5 32.5 C19.5 36.5 22.5 38 27 37.5" stroke="#F7931E" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <circle cx={27.8} cy={37.3} r={2} fill="#E07F0C" />
    </svg>
  );
}

/** Soft scalloped burst drawn behind the active icon. */
export function Burst({ size = 64, color = "#FFE9BD" }: { size?: number; color?: string }) {
  const points = 12;
  const outer = 31;
  const inner = 26.5;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(32 + r * Math.cos(a)).toFixed(2)} ${(32 + r * Math.sin(a)).toFixed(2)} `;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d={`${d}Z`} fill={color} strokeLinejoin="round" stroke={color} strokeWidth={4} />
    </svg>
  );
}
