// Stand-in pictures of a merchant's uploaded documents (ID card, utility bill, CAC certificate, shop photo),
// drawn with their details. Replaced by the real uploads once onboarding stores files.
import type { Merchant, MerchantDoc } from "@/lib/marketplace";

const font = "DM Sans, system-ui, sans-serif";

function IdCard({ m }: { m: Merchant }) {
  const [first, ...rest] = m.owner.split(" ");
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full">
      <rect x="2" y="2" width="316" height="196" rx="14" fill="#eaf4ee" stroke="#b9d9c6" />
      <rect x="2" y="2" width="316" height="38" rx="14" fill="#1c6b45" />
      <rect x="2" y="26" width="316" height="14" fill="#1c6b45" />
      <text x="18" y="27" fill="#fff" fontFamily={font} fontSize="13" fontWeight="700" letterSpacing="1.5">NATIONAL IDENTITY CARD</text>
      <rect x="18" y="54" width="84" height="104" rx="8" fill="#cfe5d8" />
      <circle cx="60" cy="92" r="20" fill="#8fb9a0" />
      <path d="M28 158 q32 -44 64 0 z" fill="#8fb9a0" />
      {[
        ["SURNAME", rest.join(" ") || first],
        ["GIVEN NAMES", first],
        ["NIN", `•••• ••• ${m.payout.last4}`],
        ["DATE OF BIRTH", "14 MAR 1994"],
      ].map(([label, value], i) => (
        <g key={label}>
          <text x="118" y={62 + i * 26} fill="#5b7a68" fontFamily={font} fontSize="8.5" fontWeight="700" letterSpacing="1">{label}</text>
          <text x="118" y={75 + i * 26} fill="#17120e" fontFamily={font} fontSize="12" fontWeight="700">{value.toUpperCase()}</text>
        </g>
      ))}
      <rect x="18" y="170" width="284" height="16" rx="4" fill="#d6eadf" />
      <text x="24" y="181.5" fill="#5b7a68" fontFamily="monospace" fontSize="8.5">IDNGA{m.payout.last4}{"<<<<<<<<<<<<<<<<<<<<<<"}</text>
    </svg>
  );
}

function Bill({ m }: { m: Merchant }) {
  return (
    <svg viewBox="0 0 240 320" className="h-full w-full">
      <rect x="2" y="2" width="236" height="316" rx="6" fill="#fff" stroke="#e9e2d9" />
      <rect x="2" y="2" width="236" height="46" rx="6" fill="#f7931e" />
      <rect x="2" y="36" width="236" height="12" fill="#f7931e" />
      <text x="16" y="24" fill="#fff" fontFamily={font} fontSize="12" fontWeight="800">ELECTRICITY BILL</text>
      <text x="16" y="38" fill="#fff" fontFamily={font} fontSize="8">Account 0{m.payout.last4}-221-09 · Oct 2026</text>
      <text x="16" y="70" fill="#7f756c" fontFamily={font} fontSize="7.5" fontWeight="700" letterSpacing="1">CUSTOMER</text>
      <text x="16" y="84" fill="#17120e" fontFamily={font} fontSize="10.5" fontWeight="700">{m.owner}</text>
      <foreignObject x="14" y="90" width="210" height="34">
        <p style={{ fontFamily: font, fontSize: 9, color: "#3a322c", margin: 0, lineHeight: 1.35 }}>{m.address}</p>
      </foreignObject>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="16" y={140 + i * 22} width={90 + (i % 2) * 30} height="7" rx="3.5" fill="#f2ede6" />
          <rect x="176" y={140 + i * 22} width="48" height="7" rx="3.5" fill="#f2ede6" />
        </g>
      ))}
      <line x1="16" x2="224" y1="236" y2="236" stroke="#e9e2d9" />
      <text x="16" y="256" fill="#7f756c" fontFamily={font} fontSize="8" fontWeight="700">AMOUNT DUE</text>
      <text x="224" y="257" fill="#17120e" fontFamily={font} fontSize="13" fontWeight="800" textAnchor="end">₦18,450</text>
      {Array.from({ length: 34 }).map((_, i) => (
        <rect key={i} x={16 + i * 6} y="278" width={i % 3 ? 2 : 3.5} height="24" fill="#3a322c" />
      ))}
    </svg>
  );
}

function Certificate({ m }: { m: Merchant }) {
  return (
    <svg viewBox="0 0 240 320" className="h-full w-full">
      <rect x="2" y="2" width="236" height="316" rx="6" fill="#fffaf1" stroke="#e7d7b8" />
      <rect x="12" y="12" width="216" height="296" rx="3" fill="none" stroke="#c9a96a" strokeWidth="1.5" />
      <rect x="17" y="17" width="206" height="286" rx="2" fill="none" stroke="#e7d7b8" />
      <circle cx="120" cy="66" r="24" fill="#1c6b45" />
      <circle cx="120" cy="66" r="17" fill="none" stroke="#eaf4ee" strokeWidth="1.5" />
      <path d="M112 66 l6 6 l11 -13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="120" y="114" fill="#7a5c22" fontFamily={font} fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="1.2">CERTIFICATE OF</text>
      <text x="120" y="128" fill="#7a5c22" fontFamily={font} fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="1.2">INCORPORATION</text>
      <text x="120" y="156" fill="#7f756c" fontFamily={font} fontSize="7.5" textAnchor="middle">This is to certify that</text>
      <foreignObject x="24" y="164" width="192" height="40">
        <p style={{ fontFamily: font, fontSize: 12, fontWeight: 800, color: "#17120e", margin: 0, textAlign: "center", lineHeight: 1.2 }}>{m.name.toUpperCase()} LIMITED</p>
      </foreignObject>
      <text x="120" y="222" fill="#7f756c" fontFamily={font} fontSize="7.5" textAnchor="middle">is incorporated as a private company</text>
      <text x="120" y="244" fill="#17120e" fontFamily={font} fontSize="10" fontWeight="700" textAnchor="middle">{m.regNumber ?? "RC —"}</text>
      <line x1="40" x2="110" y1="282" y2="282" stroke="#c9a96a" />
      <line x1="130" x2="200" y1="282" y2="282" stroke="#c9a96a" />
      <text x="75" y="294" fill="#7f756c" fontFamily={font} fontSize="6.5" textAnchor="middle">Registrar</text>
      <text x="165" y="294" fill="#7f756c" fontFamily={font} fontSize="6.5" textAnchor="middle">Date</text>
    </svg>
  );
}

export function DocArt({ doc, m }: { doc: MerchantDoc; m: Merchant }) {
  if (doc.kind === "photos") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/demo/store-inside.jpg" alt="" className="h-full w-full rounded-lg object-cover" />;
  }
  if (doc.kind === "id") return <IdCard m={m} />;
  if (doc.kind === "cac") return <Certificate m={m} />;
  return <Bill m={m} />;
}
