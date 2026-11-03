import { ToggleRight } from "lucide-react";
import type { AppFeatures } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { LiveSwitch } from "@/components/switch";
import { Card, ErrorNote, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { saveFeatureText, setFeature } from "../actions";

type Switch = { [K in keyof AppFeatures]: AppFeatures[K] extends boolean ? K : never }[keyof AppFeatures];

const GROUPS: { title: string; items: { key: Switch; label: string; description: string }[] }[] = [
  {
    title: "Selling",
    items: [
      { key: "ordering", label: "Online ordering", description: "Off: customers can browse and fill their cart, but can't place orders." },
      { key: "delivery", label: "Delivery", description: "Offer delivery at checkout." },
      { key: "pickup", label: "Store pickup", description: "Offer pickup at a branch at checkout." },
      { key: "promoCodes", label: "Promo codes", description: "Show the promo code box at checkout and accept codes." },
    ],
  },
  {
    title: "Shopping",
    items: [
      { key: "reviews", label: "Product reviews", description: "Show star ratings and the Reviews tab, and accept new reviews." },
      { key: "usdPrices", label: "Dollar estimates", description: "Show “≈ $” next to naira prices on products and at checkout." },
      { key: "lowStockBadges", label: "Low-stock badges", description: "Show “Only 3 left” on products running low." },
      { key: "earnBanner", label: "“Earn while you shop” banner", description: "The first slide at the top of Home, about earning store tokens." },
      { key: "earnCard", label: "“Earn while you shop” card", description: "The card about store tokens further down Home." },
    ],
  },
  {
    title: "Help and contact",
    items: [
      { key: "liveChat", label: "Live chat button", description: "The floating support button on Home and Shop." },
      { key: "whatsapp", label: "WhatsApp ordering", description: "“Order on WhatsApp” buttons on Home and product pages." },
    ],
  },
  {
    title: "Stores",
    items: [
      {
        key: "diditIdCheck",
        label: "Use Didit for ID checks",
        description: "Off: store owners send their ID photo, a selfie and a smile video, and you approve each one in Merchants → ID checks. Switching only changes new checks; ones already started finish the way they began.",
      },
    ],
  },
  {
    title: "Accounts",
    items: [
      { key: "signups", label: "New sign-ups", description: "Off: only existing customers can sign in." },
      { key: "googleSignIn", label: "Google sign-in", description: "The “Continue with Google” button." },
    ],
  },
];

export default async function SwitchesPage() {
  const { data, error } = await load<{ features: AppFeatures }>("/admin/features");
  if (!data) return <ErrorNote error={error} />;
  const f = data.features;

  return (
    <>
      <PageHeader icon={ToggleRight} title="App switches" description="Turn parts of the customer app on or off. Changes save straight away and reach the app within a minute." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Maintenance mode">
          <LiveSwitch
            label="Maintenance mode"
            description="The app stays open for browsing with a notice showing this message; new orders and new accounts are paused."
            initial={f.maintenance}
            onChange={setFeature.bind(null, "maintenance")}
            danger
          />
          <ActionForm action={saveFeatureText} submitLabel="Save message" className="flex flex-col gap-2">
            <input type="hidden" name="field" value="maintenanceMessage" />
            <textarea name="value" rows={2} maxLength={300} defaultValue={f.maintenanceMessage} className={inputClass} />
          </ActionForm>
        </Card>

        <Card title="Announcement bar">
          <LiveSwitch label="Show on the home screen" description="A short strip at the top of Home, e.g. delivery times or a sale." initial={f.announcementOn} onChange={setFeature.bind(null, "announcementOn")} />
          <ActionForm action={saveFeatureText} submitLabel="Save text" className="flex flex-col gap-2">
            <input type="hidden" name="field" value="announcement" />
            <input name="value" maxLength={160} defaultValue={f.announcement} placeholder="Free delivery in Benin City this week" className={inputClass} />
          </ActionForm>
        </Card>

        {GROUPS.map((g) => (
          <Card key={g.title} title={g.title}>
            <div className="divide-y divide-line">
              {g.items.map((s) => (
                <LiveSwitch key={s.key} label={s.label} description={s.description} initial={f[s.key]} onChange={setFeature.bind(null, s.key)} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
