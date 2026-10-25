// Illustrated profile character, generated from the user's id so each person always gets the same look.
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from "react-native-svg";

const BACKGROUNDS = ["#FDB913", "#F7931E", "#5CB8F2", "#8BD3A8", "#F59BB0", "#B9A4F5", "#FFD27A", "#7FD1C7"];
const SKIN = ["#5A3825", "#6F4426", "#8D5524", "#A0663A", "#C68642", "#E0AC69", "#8D5524", "#6F4426"]; // weighted to darker tones
const HAIR = ["#1E1714", "#2B1E17", "#3D2A1E", "#5A3A22"];
const OUTFIT = ["#3A322C", "#2F6FDE", "#E0533D", "#1C8A4C", "#7A4FD0", "#F7931E", "#0F766E"];
const WRAP = ["#E0533D", "#7A4FD0", "#0F766E", "#2F6FDE", "#F7931E"];

/** Small deterministic hash (FNV-1a) of the seed. */
function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarTraits(seed: string) {
  const h = hash(seed || "guest");
  const pick = <T,>(list: T[], shift: number) => list[(h >>> shift) % list.length];
  return {
    bg: pick(BACKGROUNDS, 0),
    skin: pick(SKIN, 3),
    hair: pick(HAIR, 6),
    outfit: pick(OUTFIT, 9),
    wrap: pick(WRAP, 12),
    style: (h >>> 15) % 6, // 0 short, 1 afro, 2 bun, 3 headwrap, 4 bald + beard, 5 fade with top
    accessory: (h >>> 18) % 4, // 0 none, 1 glasses, 2 headphones, 3 earrings
    mouth: (h >>> 21) % 3,
  };
}

export function UserAvatar({ seed, size = 56 }: { seed: string; size?: number }) {
  const t = avatarTraits(seed);
  const clipId = `av-${hash(seed).toString(36)}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={32} cy={32} r={32} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect width={64} height={64} fill={t.bg} />
        <Circle cx={50} cy={12} r={10} fill="#FFFFFF" opacity={0.18} />

        {/* back hair layers */}
        {t.style === 1 && <Circle cx={32} cy={25} r={17} fill={t.hair} />}
        {t.style === 2 && <Circle cx={32} cy={9} r={6.5} fill={t.hair} />}

        {/* body */}
        <Path d="M10 66 C10 52 19 45 32 45 C45 45 54 52 54 66 Z" fill={t.outfit} />
        <Path d="M26.5 45.5 L32 51.5 L37.5 45.5 Z" fill="#FFFFFF" opacity={0.9} />
        <Rect x={28} y={36} width={8} height={10} rx={3.5} fill={t.skin} />
        <Path d="M28 42 C30 44 34 44 36 42 V45 H28 Z" fill="#000000" opacity={0.12} />

        {/* head */}
        <Ellipse cx={32} cy={28} rx={11.5} ry={12.5} fill={t.skin} />
        <Ellipse cx={20.8} cy={29} rx={2} ry={3} fill={t.skin} />
        <Ellipse cx={43.2} cy={29} rx={2} ry={3} fill={t.skin} />

        {/* front hair */}
        {t.style === 0 && <Path d="M20.5 26 C20.5 17.5 25.5 14 32 14 C38.5 14 43.5 17.5 43.5 26 C40.5 21.5 36 20 32 20 C28 20 23.5 21.5 20.5 26 Z" fill={t.hair} />}
        {t.style === 1 && <Path d="M20.6 27 C21 19 25.5 15.5 32 15.5 C38.5 15.5 43 19 43.4 27 C40 23 36 21.8 32 21.8 C28 21.8 24 23 20.6 27 Z" fill={t.hair} />}
        {t.style === 2 && <Path d="M20.5 27 C20.5 18.5 25.5 15 32 15 C38.5 15 43.5 18.5 43.5 27 C41.5 22 37 20.5 32 20.5 C27 20.5 22.5 22 20.5 27 Z" fill={t.hair} />}
        {t.style === 3 && (
          <>
            <Path d="M18 25 C17 14 24 8.5 32 8.5 C40 8.5 47 14 46 25 C42 21.5 37 20 32 20 C27 20 22 21.5 18 25 Z" fill={t.wrap} />
            <Path d="M40 11 C47 7 52 10 50 16 C47 13 43 13 40 15 Z" fill={t.wrap} />
            <Path d="M22 18 C27 15.5 37 15.5 42 18" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.5} fill="none" />
          </>
        )}
        {t.style === 4 && <Path d="M22 31 C23 39 27 42.5 32 42.5 C37 42.5 41 39 42 31 C40 35 37 36.5 32 36.5 C27 36.5 24 35 22 31 Z" fill={t.hair} />}
        {t.style === 5 && (
          <>
            <Path d="M21 24 C21.5 18 26 15 32 15 C38 15 42.5 18 43 24 C39 21 25 21 21 24 Z" fill={t.hair} />
            <Rect x={25} y={12} width={14} height={6} rx={3} fill={t.hair} />
          </>
        )}

        {/* face */}
        <Circle cx={27.8} cy={28.5} r={1.4} fill="#1E1714" />
        <Circle cx={36.2} cy={28.5} r={1.4} fill="#1E1714" />
        <Circle cx={25.5} cy={32.5} r={1.8} fill="#F59BB0" opacity={0.35} />
        <Circle cx={38.5} cy={32.5} r={1.8} fill="#F59BB0" opacity={0.35} />
        {t.mouth === 0 && <Path d="M28.5 33 C30 35.5 34 35.5 35.5 33" stroke="#1E1714" strokeWidth={1.5} strokeLinecap="round" fill="none" />}
        {t.mouth === 1 && <Path d="M28 32.6 C29.5 36.8 34.5 36.8 36 32.6 Z" fill="#1E1714" />}
        {t.mouth === 2 && <Path d="M29.5 33.6 C31 34.8 33 34.8 34.5 33.6" stroke="#1E1714" strokeWidth={1.5} strokeLinecap="round" fill="none" />}

        {/* accessories */}
        {t.accessory === 1 && (
          <>
            <Circle cx={27.8} cy={28.5} r={3.6} stroke="#1E1714" strokeWidth={1.3} fill="#FFFFFF" fillOpacity={0.15} />
            <Circle cx={36.2} cy={28.5} r={3.6} stroke="#1E1714" strokeWidth={1.3} fill="#FFFFFF" fillOpacity={0.15} />
            <Path d="M31.4 28.5 H32.6" stroke="#1E1714" strokeWidth={1.3} />
          </>
        )}
        {t.accessory === 2 && (
          <>
            <Path d="M19.5 28 C19.5 17 25 12 32 12 C39 12 44.5 17 44.5 28" stroke="#3A322C" strokeWidth={2.6} fill="none" strokeLinecap="round" />
            <Rect x={16.5} y={25} width={6} height={9} rx={3} fill="#F7931E" />
            <Rect x={41.5} y={25} width={6} height={9} rx={3} fill="#F7931E" />
          </>
        )}
        {t.accessory === 3 && (
          <>
            <Circle cx={20.8} cy={33.5} r={1.6} fill="#FDB913" />
            <Circle cx={43.2} cy={33.5} r={1.6} fill="#FDB913" />
          </>
        )}
      </G>
    </Svg>
  );
}
