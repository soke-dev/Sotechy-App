/** Product categories merchants pick from. Anything else goes under "Other" with the merchant's own name. */
export const CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  { group: "Phones & tablets", items: ["Smartphones", "Feature phones", "Tablets & iPads", "Phone cases & covers", "Screen protectors", "Chargers & cables", "Power banks", "Phone parts & repair"] },
  { group: "Computers", items: ["Laptops", "Desktops", "Monitors", "Keyboards & mice", "Printers & ink", "Storage & flash drives", "Routers & MiFi", "Computer parts", "Laptop bags"] },
  { group: "Audio", items: ["Earbuds", "Headphones", "Bluetooth speakers", "Sound bars", "Home theatre", "Microphones"] },
  { group: "TV & video", items: ["Televisions", "Projectors", "TV boxes & streaming", "Decoders", "Cameras", "Drones", "CCTV & security"] },
  { group: "Wearables & gaming", items: ["Smartwatches", "Fitness bands", "Game consoles", "Video games", "Controllers", "VR headsets"] },
  { group: "Power & solar", items: ["Generators", "Inverters", "Solar panels", "Batteries", "Stabilisers & UPS", "Rechargeable lamps & fans"] },
  { group: "Home appliances", items: ["Air conditioners", "Fans", "Fridges & freezers", "Washing machines", "Irons", "Water dispensers", "Vacuum cleaners"] },
  { group: "Kitchen", items: ["Blenders", "Microwaves", "Air fryers", "Electric kettles", "Cookers & gas", "Toasters & sandwich makers", "Cookware"] },
  { group: "Makeup", items: ["Foundation & concealer", "Face powder", "Lipstick & lip gloss", "Eyeshadow & palettes", "Mascara & lashes", "Brows", "Makeup brushes & sponges", "Makeup sets"] },
  { group: "Beauty & personal care", items: ["Skincare", "Perfume & body spray", "Hair care", "Wigs & hair extensions", "Nails", "Hair dryers & straighteners", "Shavers & trimmers", "Oral care"] },
  { group: "Fashion", items: ["Men's clothing", "Women's clothing", "Shoes", "Bags", "Watches", "Jewellery", "Glasses & sunglasses"] },
  { group: "Home & living", items: ["Furniture", "Bedding", "Lighting", "Home decor", "Storage & organisers"] },
  { group: "Baby, kids & toys", items: ["Toys", "Baby gear", "Kids' clothing"] },
  { group: "Health & sports", items: ["Fitness equipment", "Supplements", "Medical devices"] },
  { group: "Food & drinks", items: ["Groceries", "Drinks", "Snacks"] },
  { group: "Office & school", items: ["Stationery", "Books", "Calculators"] },
];

export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.items);

export const isStandardCategory = (c: string) => ALL_CATEGORIES.includes(c);

/** The group a category sits in, or "Other" for a merchant's own category. */
export const categoryGroup = (c: string) => CATEGORY_GROUPS.find((g) => g.items.includes(c))?.group ?? "Other";
