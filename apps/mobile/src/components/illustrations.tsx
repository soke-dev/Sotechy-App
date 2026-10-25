// Illustrated icon set in the same style as the tab bar: soft two-tone fills in Sotechy colours.
// Use for feature spots (menus, lists, empty states). Keep plain line icons for small UI glyphs.
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { AccountIcon, CartIcon, HomeIcon, OrdersIcon, ShopIcon } from "./tab-icons";

const C = {
  orange: "#F7931E",
  orangeDark: "#E07F0C",
  yellow: "#FDB913",
  cream: "#FFE3B3",
  paper: "#FFF6E8",
  ink: "#3A322C",
  sky: "#5CB8F2",
  coral: "#F0603F",
  white: "#FFFFFF",
};

type P = { size?: number };
const S = ({ size = 40, children }: P & { children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    {children}
  </Svg>
);

const Tag = ({ size }: P) => (
  <S size={size}>
    <Path d="M7.5 22.5 L23.5 6.5 H39 a2.5 2.5 0 0 1 2.5 2.5 V24.5 L25.5 40.5 a3 3 0 0 1 -4.2 0 L7.5 26.7 a3 3 0 0 1 0 -4.2 Z" fill={C.orange} />
    <Circle cx={34} cy={14} r={3.2} fill={C.paper} />
    <Circle cx={19.5} cy={23} r={2.4} fill={C.white} />
    <Circle cx={28} cy={31.5} r={2.4} fill={C.white} />
    <Path d="M29.5 21 L18 33.5" stroke={C.white} strokeWidth={2.6} strokeLinecap="round" />
  </S>
);

const Sparkle = ({ size }: P) => (
  <S size={size}>
    <Path d="M21 8 C22.6 19 25 21.4 36 23 C25 24.6 22.6 27 21 38 C19.4 27 17 24.6 6 23 C17 21.4 19.4 19 21 8 Z" fill={C.yellow} />
    <Path d="M37 5 C37.7 9.6 38.4 10.3 43 11 C38.4 11.7 37.7 12.4 37 17 C36.3 12.4 35.6 11.7 31 11 C35.6 10.3 36.3 9.6 37 5 Z" fill={C.orange} />
    <Circle cx={38} cy={36} r={3} fill={C.orange} />
  </S>
);

const Store = ({ size }: P) => (
  <S size={size}>
    <Rect x={8} y={19} width={32} height={22} rx={2.5} fill={C.cream} />
    <Rect x={20} y={28} width={8} height={13} rx={1.5} fill={C.ink} />
    <Rect x={11} y={27} width={6.5} height={6} rx={1.2} fill={C.sky} />
    <Rect x={30.5} y={27} width={6.5} height={6} rx={1.2} fill={C.sky} />
    <Rect x={5} y={10} width={38} height={10} rx={2.5} fill={C.orange} />
    {[11, 23, 35].map((x) => (
      <Rect key={x} x={x - 2} y={10} width={4} height={10} fill={C.yellow} />
    ))}
    {[8.2, 14.6, 21, 27.4, 33.8, 40.2].map((x, i) => (
      <Circle key={x} cx={x} cy={20} r={3.2} fill={i % 2 ? C.yellow : C.orange} />
    ))}
  </S>
);

const Bike = ({ size }: P) => (
  <S size={size}>
    <Rect x={24} y={11} width={15} height={12} rx={2} fill={C.yellow} />
    <Rect x={30.2} y={11} width={2.6} height={12} fill={C.orange} />
    <Path d="M11 34 L19 24 H33 L37 34" stroke={C.orange} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Path d="M19 24 L15 13 H11" stroke={C.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Circle cx={11} cy={35} r={6.5} fill={C.ink} />
    <Circle cx={37} cy={35} r={6.5} fill={C.ink} />
    <Circle cx={11} cy={35} r={2.4} fill={C.cream} />
    <Circle cx={37} cy={35} r={2.4} fill={C.cream} />
  </S>
);

const Shield = ({ size }: P) => (
  <S size={size}>
    <Path d="M24 5 L39.5 10.5 V22.5 C39.5 32 33 39 24 43.5 C15 39 8.5 32 8.5 22.5 V10.5 Z" fill={C.orange} />
    <Path d="M24 5 V43.5 C15 39 8.5 32 8.5 22.5 V10.5 Z" fill={C.orangeDark} opacity={0.35} />
    <Path d="M16.5 24 L22 29.5 L32 18.5" stroke={C.white} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </S>
);

const Wallet = ({ size }: P) => (
  <S size={size}>
    <Rect x={11} y={7} width={24} height={13} rx={2.5} fill={C.sky} />
    <Rect x={5.5} y={14} width={37} height={27} rx={5} fill={C.orange} />
    <Rect x={5.5} y={14} width={37} height={6} rx={3} fill={C.orangeDark} opacity={0.5} />
    <Rect x={28} y={23.5} width={15.5} height={10} rx={3.5} fill={C.yellow} />
    <Circle cx={33.5} cy={28.5} r={2.2} fill={C.ink} />
  </S>
);

const Heart = ({ size }: P) => (
  <S size={size}>
    <Path d="M24 41.5 C14 34.5 6.5 27.8 6.5 19.5 C6.5 13.4 11 8.8 16.8 8.8 C20 8.8 22.5 10.4 24 13 C25.5 10.4 28 8.8 31.2 8.8 C37 8.8 41.5 13.4 41.5 19.5 C41.5 27.8 34 34.5 24 41.5 Z" fill={C.coral} />
    <Circle cx={15.5} cy={17} r={3.2} fill={C.white} opacity={0.55} />
  </S>
);

const Receipt = ({ size }: P) => (
  <S size={size}>
    <Path d="M10 5 H38 V42.5 L34 40 L30 42.5 L26 40 L22 42.5 L18 40 L14 42.5 L10 40 Z" fill={C.paper} stroke={C.cream} strokeWidth={1.5} />
    <Rect x={10} y={5} width={28} height={8} fill={C.orange} />
    <Rect x={15} y={18} width={18} height={2.6} rx={1.3} fill={C.ink} opacity={0.75} />
    <Rect x={15} y={24} width={13} height={2.6} rx={1.3} fill={C.ink} opacity={0.45} />
    <Rect x={15} y={30} width={16} height={2.6} rx={1.3} fill={C.ink} opacity={0.45} />
    <Circle cx={36} cy={36} r={7} fill={C.yellow} />
    <Path d="M32.8 36 L35.2 38.4 L39.4 33.8" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </S>
);

const Chat = ({ size }: P) => (
  <S size={size}>
    <Path d="M18 9 H38 a5 5 0 0 1 5 5 V24 a5 5 0 0 1 -5 5 H36 V34 L30 29 H18 a5 5 0 0 1 -5 -5 V14 a5 5 0 0 1 5 -5 Z" fill={C.yellow} />
    <Path d="M10 17 H28 a5 5 0 0 1 5 5 V31 a5 5 0 0 1 -5 5 H17 L11 41 V36 H10 a5 5 0 0 1 -5 -5 V22 a5 5 0 0 1 5 -5 Z" fill={C.orange} />
    {[13, 19, 25].map((x) => (
      <Circle key={x} cx={x} cy={26.5} r={2.1} fill={C.white} />
    ))}
  </S>
);

const Pin = ({ size }: P) => (
  <S size={size}>
    <Path d="M14 42 a10 3 0 0 0 20 0 a10 3 0 0 0 -20 0 Z" fill={C.cream} />
    <Path d="M24 4.5 C16 4.5 10.5 10.5 10.5 18 C10.5 28 24 41 24 41 C24 41 37.5 28 37.5 18 C37.5 10.5 32 4.5 24 4.5 Z" fill={C.orange} />
    <Circle cx={24} cy={18} r={6} fill={C.paper} />
    <Circle cx={24} cy={18} r={2.6} fill={C.ink} />
  </S>
);

const Card = ({ size }: P) => (
  <S size={size}>
    <Rect x={4.5} y={11} width={39} height={27} rx={4.5} fill={C.ink} />
    <Rect x={4.5} y={17} width={39} height={5} fill="#4E4540" />
    <Rect x={9.5} y={27} width={9} height={6.5} rx={1.6} fill={C.yellow} />
    <Circle cx={32} cy={30.5} r={4.5} fill={C.orange} />
    <Circle cx={37} cy={30.5} r={4.5} fill={C.yellow} opacity={0.9} />
  </S>
);

const Bank = ({ size }: P) => (
  <S size={size}>
    <Path d="M24 4 L43 14 V17 H5 V14 Z" fill={C.orange} />
    {[10, 19, 28, 37].map((x) => (
      <Rect key={x} x={x - 1} y={19} width={4} height={15} rx={1} fill={C.cream} />
    ))}
    <Rect x={6} y={34} width={36} height={4} rx={1} fill={C.yellow} />
    <Rect x={4} y={38.5} width={40} height={4.5} rx={1.5} fill={C.ink} />
    <Circle cx={24} cy={11.5} r={2.4} fill={C.paper} />
  </S>
);

const Coin = ({ size }: P) => (
  <S size={size}>
    <Circle cx={27} cy={27} r={15} fill={C.orange} />
    <Circle cx={21} cy={21} r={15} fill={C.yellow} />
    <Circle cx={21} cy={21} r={10.5} fill="none" stroke="#E9A12A" strokeWidth={2} />
    <Path d="M22.5 13.5 L16.5 22.5 H21.5 L19.5 28.5 L25.5 19.5 H20.5 Z" fill={C.white} />
  </S>
);

const Doc = ({ size }: P) => (
  <S size={size}>
    <Path d="M11 4.5 H29 L38 13.5 V41 a2.5 2.5 0 0 1 -2.5 2.5 H11 a2.5 2.5 0 0 1 -2.5 -2.5 V7 a2.5 2.5 0 0 1 2.5 -2.5 Z" fill={C.paper} stroke={C.cream} strokeWidth={1.5} />
    <Path d="M29 4.5 V11 a2.5 2.5 0 0 0 2.5 2.5 H38 Z" fill={C.orange} />
    <Rect x={14} y={20} width={18} height={2.6} rx={1.3} fill={C.ink} opacity={0.7} />
    <Rect x={14} y={26} width={14} height={2.6} rx={1.3} fill={C.ink} opacity={0.4} />
    <Rect x={14} y={32} width={16} height={2.6} rx={1.3} fill={C.ink} opacity={0.4} />
  </S>
);

const Logout = ({ size }: P) => (
  <S size={size}>
    <Rect x={7} y={6} width={22} height={36} rx={3} fill={C.cream} />
    <Path d="M7 9 a3 3 0 0 1 3 -3 H22 L22 42 H10 a3 3 0 0 1 -3 -3 Z" fill={C.coral} />
    <Circle cx={18} cy={24} r={1.6} fill={C.white} />
    <Path d="M27 24 H42 M36.5 18.5 L42 24 L36.5 29.5" stroke={C.ink} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </S>
);

const Search = ({ size }: P) => (
  <S size={size}>
    <Path d="M29 29 L40.5 40.5" stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
    <Circle cx={20.5} cy={20.5} r={14} fill={C.orange} />
    <Circle cx={20.5} cy={20.5} r={9.5} fill={C.sky} />
    <Path d="M15 17 a7 7 0 0 1 6 -4" stroke={C.white} strokeWidth={2.4} strokeLinecap="round" fill="none" />
  </S>
);

const Phone = ({ size }: P) => (
  <S size={size}>
    <Rect x={13} y={4} width={22} height={40} rx={5} fill={C.ink} />
    <Rect x={15.5} y={8.5} width={17} height={28} rx={2} fill={C.sky} />
    <Rect x={20} y={5.8} width={8} height={1.6} rx={0.8} fill="#5A514A" />
    <Circle cx={24} cy={40.2} r={1.7} fill={C.cream} />
    <Path d="M19 24 L23 28 L30 19" stroke={C.white} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </S>
);

const Mail = ({ size }: P) => (
  <S size={size}>
    <Rect x={5} y={11} width={38} height={27} rx={4} fill={C.yellow} />
    <Path d="M6 13.5 L24 27 L42 13.5" stroke={C.orange} strokeWidth={3.4} strokeLinejoin="round" fill="none" />
    <Circle cx={40} cy={12} r={5.5} fill={C.coral} />
  </S>
);

export const ILLUSTRATIONS = {
  home: ({ size }: P) => <HomeIcon active size={size} />,
  bag: ({ size }: P) => <ShopIcon active size={size} />,
  cart: ({ size }: P) => <CartIcon active size={size} />,
  box: ({ size }: P) => <OrdersIcon active size={size} />,
  user: ({ size }: P) => <AccountIcon active size={size} />,
  tag: Tag,
  sparkle: Sparkle,
  store: Store,
  bike: Bike,
  shield: Shield,
  wallet: Wallet,
  heart: Heart,
  receipt: Receipt,
  chat: Chat,
  pin: Pin,
  card: Card,
  bank: Bank,
  coin: Coin,
  doc: Doc,
  logout: Logout,
  search: Search,
  phone: Phone,
  mail: Mail,
};

export type IlloName = keyof typeof ILLUSTRATIONS;

export function Illo({ name, size = 40 }: { name: IlloName; size?: number }) {
  const Art = ILLUSTRATIONS[name];
  return <Art size={size} />;
}
