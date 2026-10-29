import { Card, PageHeader } from "@/components/ui";
import { StoreDetails } from "@/components/store-details";

export default function StoreDetailsPage() {
  return (
    <>
      <PageHeader illo="store" title="Storefront" description="Your store's name, about line, what you sell, socials and website. Sotechy checks changes before customers see them." />
      <Card className="max-w-2xl">
        <StoreDetails />
      </Card>
    </>
  );
}
