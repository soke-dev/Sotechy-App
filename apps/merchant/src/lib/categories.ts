import { MARKET_DEPARTMENTS } from "@sotechy/shared";

/** Product categories merchants pick from. Anything else goes under "Other" with the merchant's own name. */
export const CATEGORY_GROUPS: { group: string; items: string[] }[] = MARKET_DEPARTMENTS.map((d) => ({ group: d.name, items: d.sections.flatMap((x) => x.items) }));

export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.items);

export const isStandardCategory = (c: string) => ALL_CATEGORIES.includes(c);

/** The group a category sits in, or "Other" for a merchant's own category. */
export const categoryGroup = (c: string) => CATEGORY_GROUPS.find((g) => g.items.includes(c))?.group ?? "Other";

/** What a store sells, chosen when it's set up (broader than product categories), in groups. "Other" lets them type it. */
export const STORE_KIND_GROUPS: { group: string; items: string[] }[] = [
  {
    group: "Electronics",
    items: ["Phones & tablets", "Computers & laptops", "TV & audio", "Cameras & drones", "CCTV & security", "Gaming", "Gadgets & accessories", "Phone & laptop repairs"],
  },
  {
    group: "Home & appliances",
    items: ["Home appliances", "Air conditioners & fans", "Kitchen & cookware", "Power & solar", "Lighting & electricals", "Furniture & home decor", "Bedding & curtains", "Building & hardware"],
  },
  {
    group: "Fashion",
    items: ["Fashion & clothing", "Native wear & fabrics", "Shoes & bags", "Jewellery & watches", "Eyewear", "Tailoring"],
  },
  {
    group: "Beauty & health",
    items: ["Beauty & makeup", "Hair, wigs & extensions", "Skincare & personal care", "Perfume & fragrance", "Health & pharmacy", "Supplements & wellness"],
  },
  {
    group: "Food & drinks",
    items: ["Groceries", "Food & restaurants", "Drinks", "Cakes & pastries", "Agriculture & farm produce"],
  },
  {
    group: "Family & leisure",
    items: ["Baby & kids", "Toys & games", "Sports & fitness", "Books & stationery", "Gifts & crafts", "Art & collectibles", "Pets", "Events & party supplies"],
  },
  {
    group: "Business & auto",
    items: ["Office supplies", "Printing & branding", "Auto parts & accessories", "Cars & motorbikes", "Tools & industrial"],
  },
  {
    group: "Services",
    items: ["Repairs & services", "Installation & maintenance", "Cleaning & laundry", "Logistics & delivery"],
  },
];

export const STORE_KINDS = STORE_KIND_GROUPS.flatMap((g) => g.items);
