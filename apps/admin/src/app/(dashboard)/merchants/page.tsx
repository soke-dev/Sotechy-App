import { Card, PageHeader } from "@/components/ui";

export default function MerchantsPage() {
  return (
    <>
      <PageHeader title="Merchants" description="Phase 4 — marketplace for other businesses" />
      <Card>
        <p className="text-sm text-muted">
          Third-party merchant onboarding is switched off for the first release. The database already has a
          <code className="mx-1">merchants</code> table and products carry a <code className="mx-1">merchantId</code>, so
          merchant registration, approval, listings, commissions and payouts can be added once the core store, inventory and
          payment workflows are reliable.
        </p>
      </Card>
    </>
  );
}
