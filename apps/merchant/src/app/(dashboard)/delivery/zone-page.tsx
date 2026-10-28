"use client";

// Adding or editing one delivery area, as its own page.
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeliveryZone } from "@sotechy/shared";
import { Card, PageHeader } from "@/components/ui";
import { ZoneForm } from "@/components/zone-form";

export function ZonePage({ zone }: { zone?: DeliveryZone }) {
  const router = useRouter();
  const back = () => {
    router.push("/delivery");
    router.refresh();
  };
  return (
    <>
      <Link href="/delivery" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} /> Delivery
      </Link>
      <PageHeader
        illo="bike"
        title={zone ? "Edit delivery area" : "Add delivery area"}
        description={zone ? "Prices and times save straight away. A change of state, cities or pickup points goes back to Sotechy for approval." : "Sotechy checks you can really deliver here before customers see it, usually within a day."}
      />
      <Card className="max-w-2xl">
        <ZoneForm zone={zone} onSave={back} onDelete={zone ? back : undefined} />
      </Card>
    </>
  );
}
