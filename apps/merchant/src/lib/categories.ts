import { MARKET_DEPARTMENTS } from "@sotechy/shared";

/** Product categories merchants pick from. Anything else goes under "Other" with the merchant's own name. */
export const CATEGORY_GROUPS: { group: string; items: string[] }[] = MARKET_DEPARTMENTS.map((d) => ({ group: d.name, items: d.sections.flatMap((x) => x.items) }));

export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.items);

export const isStandardCategory = (c: string) => ALL_CATEGORIES.includes(c);

/** The group a category sits in, or "Other" for a merchant's own category. */
export const categoryGroup = (c: string) => CATEGORY_GROUPS.find((g) => g.items.includes(c))?.group ?? "Other";

/** What a store sells, chosen when it's set up (broader than product categories). "Other" lets them type it. */
export const STORE_KINDS = [
  "Phones & tablets",
  "Computers & laptops",
  "Gadgets & accessories",
  "TV, audio & cameras",
  "Gaming",
  "Power & solar",
  "Home appliances",
  "Kitchen & cookware",
  "Furniture & home decor",
  "Fashion & clothing",
  "Shoes & bags",
  "Jewellery & watches",
  "Beauty & makeup",
  "Hair, wigs & extensions",
  "Skincare & personal care",
  "Perfume & fragrance",
  "Groceries",
  "Food & restaurants",
  "Drinks",
  "Baby & kids",
  "Toys & games",
  "Health & pharmacy",
  "Sports & fitness",
  "Books & stationery",
  "Office supplies",
  "Auto parts & accessories",
  "Building & hardware",
  "Agriculture & farm produce",
  "Pets",
  "Gifts & crafts",
  "Art & collectibles",
  "Repairs & services",
];
