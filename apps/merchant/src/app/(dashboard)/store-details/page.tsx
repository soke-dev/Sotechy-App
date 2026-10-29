import { Card, PageHeader } from "@/components/ui";
import { StoreDetails } from "@/components/store-details";

export default function StoreDetailsPage() {
  return (
    <>
      <PageHeader illo="doc" title="Store details" description="Your store's name, about line, what you sell, socials and website. Sotechy checks changes before customers see them." />
      <Card>
        <StoreDetails />
      </Card>
    </>
  );
}
