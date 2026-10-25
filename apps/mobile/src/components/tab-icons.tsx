// Illustrated tab icons (custom vector art). Inactive = soft greys, active = full Sotechy colours.
import Svg, { Circle, Path, Rect } from "react-native-svg";

type Props = { active: boolean; size?: number };

const grey = { light: "#E4DED7", mid: "#C6BDB3", dark: "#958B81", ink: "#7D746B" };
const pick = (active: boolean, on: string, off: string) => (active ? on : off);

export function HomeIcon({ active, size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* chimney */}
      <Rect x={31} y={9} width={5} height={9} rx={1} fill={pick(active, "#C2410C", grey.dark)} />
      {/* walls */}
      <Rect x={9} y={21} width={30} height={20} rx={3} fill={pick(active, "#FFE3B3", grey.light)} />
      {/* roof */}
      <Path d="M4.5 23.5 L24 8 L43.5 23.5 C44.6 24.4 44 26 42.6 26 H5.4 C4 26 3.4 24.4 4.5 23.5 Z" fill={pick(active, "#F7931E", grey.mid)} />
      {/* door */}
      <Rect x={20} y={29} width={8} height={12} rx={2} fill={pick(active, "#3A322C", grey.ink)} />
      <Circle cx={26} cy={35.5} r={0.9} fill={pick(active, "#FDB913", grey.light)} />
      {/* window */}
      <Rect x={30.5} y={29} width={5.5} height={5.5} rx={1.2} fill={pick(active, "#5CB8F2", grey.mid)} />
      <Rect x={12} y={29} width={5.5} height={5.5} rx={1.2} fill={pick(active, "#5CB8F2", grey.mid)} />
      {/* ground */}
      <Rect x={6} y={40} width={36} height={2.5} rx={1.25} fill={pick(active, "#E07F0C", grey.mid)} />
    </Svg>
  );
}

export function ShopIcon({ active, size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* handle */}
      <Path d="M17 19 V14.5 a7 7 0 0 1 14 0 V19" stroke={pick(active, "#3A322C", grey.ink)} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* bag */}
      <Path d="M9.5 18 H38.5 L36.6 39.5 a3 3 0 0 1 -3 2.7 H14.4 a3 3 0 0 1 -3 -2.7 Z" fill={pick(active, "#F7931E", grey.mid)} />
      {/* fold */}
      <Path d="M9.5 18 H38.5 L38.1 22.5 H9.9 Z" fill={pick(active, "#E07F0C", grey.dark)} />
      {/* handle rivets */}
      <Circle cx={17} cy={20.5} r={1.5} fill={pick(active, "#3A322C", grey.ink)} />
      <Circle cx={31} cy={20.5} r={1.5} fill={pick(active, "#3A322C", grey.ink)} />
      {/* sparkle tag */}
      <Path d="M24 26.5 l1.9 4 4 1.9 -4 1.9 -1.9 4 -1.9 -4 -4 -1.9 4 -1.9 Z" fill={pick(active, "#FFF4D6", grey.light)} />
    </Svg>
  );
}

export function CartIcon({ active, size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* parcel peeking out */}
      <Rect x={20} y={9} width={12} height={11} rx={1.5} fill={pick(active, "#F7931E", grey.mid)} />
      <Rect x={25} y={9} width={2.5} height={11} fill={pick(active, "#FFD27A", grey.light)} />
      {/* basket */}
      <Path d="M13.5 17 H42 a1.5 1.5 0 0 1 1.4 1.9 L39.6 31.4 a2.5 2.5 0 0 1 -2.4 1.8 H18.6 Z" fill={pick(active, "#FDB913", grey.light)} />
      {/* frame */}
      <Path d="M5 10 H10.5 L16.5 33.2 H38" stroke={pick(active, "#3A322C", grey.ink)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* wheels */}
      <Circle cx={19.5} cy={39} r={3.2} fill={pick(active, "#3A322C", grey.ink)} />
      <Circle cx={35} cy={39} r={3.2} fill={pick(active, "#3A322C", grey.ink)} />
    </Svg>
  );
}

export function OrdersIcon({ active, size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* box */}
      <Rect x={8} y={18} width={32} height={23} rx={2.5} fill={pick(active, "#F6B23A", grey.light)} />
      {/* stripes */}
      <Rect x={8} y={26} width={32} height={2} fill={pick(active, "#E9A12A", grey.mid)} />
      <Rect x={8} y={32} width={32} height={2} fill={pick(active, "#E9A12A", grey.mid)} />
      {/* lid */}
      <Rect x={5.5} y={11} width={37} height={9} rx={2.5} fill={pick(active, "#F7931E", grey.mid)} />
      {/* tape */}
      <Rect x={21} y={11} width={6} height={30} fill={pick(active, "#FFE3A3", grey.light)} opacity={0.95} />
      {/* label */}
      <Rect x={29.5} y={34} width={7} height={4} rx={1} fill={pick(active, "#FFFFFF", grey.light)} />
    </Svg>
  );
}

export function AccountIcon({ active, size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* badge */}
      <Circle cx={24} cy={24} r={19} fill={pick(active, "#FDB913", grey.light)} />
      {/* shoulders */}
      <Path d="M10.5 37.5 a13.5 11 0 0 1 27 0 a19 19 0 0 1 -27 0 Z" fill={pick(active, "#3A322C", grey.dark)} />
      {/* head */}
      <Circle cx={24} cy={20} r={7.5} fill={pick(active, "#FFF4E0", grey.mid)} />
      {/* eyes and smile */}
      <Circle cx={21.4} cy={19.4} r={1.1} fill={pick(active, "#3A322C", grey.ink)} />
      <Circle cx={26.6} cy={19.4} r={1.1} fill={pick(active, "#3A322C", grey.ink)} />
      <Path d="M21.2 22.6 a3.2 3.2 0 0 0 5.6 0" stroke={pick(active, "#3A322C", grey.ink)} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </Svg>
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
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d={`${d}Z`} fill={color} strokeLinejoin="round" stroke={color} strokeWidth={4} />
    </Svg>
  );
}
