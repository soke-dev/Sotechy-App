/**
 * Everything sold on Sotechy, by department → section → category. Stores file products under these
 * category names (or their own under "Other"), and the app's menu browses them.
 * `sotechy`: Sotechy's own catalogue categories (slugs) that belong in the department.
 * The order is the order shoppers see: TV & audio, then AC & fans, then phones.
 */
export interface MarketDepartment {
  name: string;
  /** An Ionicons name */
  icon: string;
  sotechy?: string[];
  sections: { name: string; items: string[] }[];
}

export const MARKET_DEPARTMENTS: MarketDepartment[] = [
  {
    name: "TV & audio",
    icon: "tv-outline",
    sotechy: ["tv-audio"],
    sections: [
      { name: "TV & video", items: ["Televisions", "Projectors", "TV boxes & streaming", "Decoders", "TV mounts"] },
      { name: "Audio", items: ["Earbuds", "Headphones", "Bluetooth speakers", "Sound bars", "Home theatre", "Microphones"] },
    ],
  },

  {
    name: "AC & fans",
    icon: "snow-outline",
    sections: [
      { name: "Air conditioners", items: ["Air conditioners"] },
      { name: "Fans", items: ["Fans"] },
    ],
  },
  {
    name: "Phones & tablets",
    icon: "phone-portrait-outline",
    sotechy: ["phones-accessories"],
    sections: [
      { name: "Phones", items: ["Smartphones", "Feature phones", "Refurbished phones"] },
      { name: "Tablets", items: ["Tablets & iPads", "E-readers", "Kids' tablets"] },
      { name: "Phone accessories", items: ["Phone cases & covers", "Screen protectors", "Chargers & cables", "Power banks", "Phone holders & mounts", "Memory cards"] },
      { name: "Parts & repair", items: ["Phone parts & repair"] },
    ],
  },
  {
    name: "Computers",
    icon: "laptop-outline",
    sotechy: ["computers-gadgets"],
    sections: [
      { name: "Laptops & desktops", items: ["Laptops", "Desktops", "Monitors", "Laptop bags"] },
      { name: "Accessories", items: ["Keyboards & mice", "Webcams", "Laptop stands & coolers"] },
      { name: "Printing", items: ["Printers & ink", "Scanners"] },
      { name: "Storage & networking", items: ["Storage & flash drives", "Routers & MiFi", "Computer parts"] },
      { name: "Software", items: ["Software & antivirus"] },
    ],
  },  {
    name: "Cameras & security",
    icon: "camera-outline",
    sections: [
      { name: "Cameras", items: ["Cameras", "Drones", "Camera accessories"] },
      { name: "Security", items: ["CCTV & security", "Smart doorbells & locks", "Alarms & sensors"] },
    ],
  },

  {
    name: "Wearables & gaming",
    icon: "game-controller-outline",
    sections: [
      { name: "Wearables", items: ["Smartwatches", "Fitness bands"] },
      { name: "Gaming", items: ["Game consoles", "Video games", "Controllers", "VR headsets", "Gaming chairs"] },
    ],
  },
  {
    name: "Power & solar",
    icon: "sunny-outline",
    sections: [
      { name: "Backup power", items: ["Generators", "Inverters", "Batteries", "Stabilisers & UPS"] },
      { name: "Solar", items: ["Solar panels", "Solar lights", "Charge controllers"] },
      { name: "Rechargeables", items: ["Rechargeable lamps & fans", "Torchlights"] },
    ],
  },
  {
    name: "Home appliances",
    icon: "home-outline",
    sotechy: ["home-appliances"],
    sections: [
      { name: "Fridges & water", items: ["Fridges & freezers", "Water dispensers"] },
      { name: "Laundry & cleaning", items: ["Washing machines", "Irons", "Vacuum cleaners"] },
    ],
  },
  {
    name: "Kitchen",
    icon: "restaurant-outline",
    sections: [
      { name: "Small appliances", items: ["Blenders", "Microwaves", "Air fryers", "Electric kettles", "Toasters & sandwich makers", "Juicers", "Food processors"] },
      { name: "Cooking & dining", items: ["Cookers & gas", "Cookware", "Kitchen utensils", "Dinnerware"] },
    ],
  },
  {
    name: "Fashion",
    icon: "shirt-outline",
    sections: [
      { name: "Men", items: ["Men's clothing", "Men's shoes", "Men's accessories"] },
      { name: "Women", items: ["Women's clothing", "Dresses", "Women's shoes", "Women's accessories"] },
      { name: "Shoes & bags", items: ["Shoes", "Sneakers", "Bags"] },
      { name: "Native & fabrics", items: ["Native wear", "Ankara & fabrics", "Aso-oke & lace"] },
      { name: "Accessories", items: ["Watches", "Jewellery", "Glasses & sunglasses", "Belts & wallets", "Caps & hats"] },
    ],
  },
  {
    name: "Beauty",
    icon: "color-palette-outline",
    sections: [
      { name: "Makeup", items: ["Foundation & concealer", "Face powder", "Lipstick & lip gloss", "Eyeshadow & palettes", "Mascara & lashes", "Brows", "Makeup brushes & sponges", "Makeup sets"] },
      { name: "Skincare & body", items: ["Skincare", "Body lotions & creams", "Soaps & body wash", "Sunscreen"] },
      { name: "Hair", items: ["Hair care", "Wigs & hair extensions", "Hair dryers & straighteners"] },
      { name: "Fragrance", items: ["Perfume & body spray", "Oils & diffusers"] },
      { name: "Personal care", items: ["Nails", "Shavers & trimmers", "Oral care", "Feminine care"] },
    ],
  },
  {
    name: "Home & living",
    icon: "bed-outline",
    sections: [
      { name: "Furniture", items: ["Furniture", "Office chairs", "Mattresses"] },
      { name: "Bedding & bath", items: ["Bedding", "Towels & bath", "Curtains & blinds"] },
      { name: "Decor", items: ["Home decor", "Lighting", "Rugs & carpets", "Wall art"] },
      { name: "Storage & cleaning", items: ["Storage & organisers", "Cleaning supplies"] },
    ],
  },
  {
    name: "Food & drinks",
    icon: "fast-food-outline",
    sections: [
      { name: "Groceries", items: ["Groceries", "Rice, beans & grains", "Spices & seasoning", "Cooking oils", "Frozen foods"] },
      { name: "Drinks", items: ["Drinks", "Water", "Juices & soft drinks", "Wine & spirits"] },
      { name: "Snacks & treats", items: ["Snacks", "Cakes & pastries"] },
      { name: "Meals", items: ["Meals & restaurants"] },
    ],
  },
  {
    name: "Baby, kids & toys",
    icon: "happy-outline",
    sections: [
      { name: "Baby", items: ["Baby gear", "Diapers & wipes", "Baby food", "Baby clothing"] },
      { name: "Kids", items: ["Kids' clothing", "School bags"] },
      { name: "Toys", items: ["Toys", "Games & puzzles"] },
    ],
  },
  {
    name: "Health & sports",
    icon: "barbell-outline",
    sections: [
      { name: "Health", items: ["Supplements", "Medical devices", "First aid", "Pharmacy"] },
      { name: "Sports & fitness", items: ["Fitness equipment", "Sportswear", "Bicycles", "Sports gear"] },
    ],
  },
  {
    name: "Office, school & books",
    icon: "book-outline",
    sections: [
      { name: "School", items: ["Stationery", "Books", "Calculators", "Art supplies"] },
      { name: "Office", items: ["Office supplies", "Filing & storage"] },
    ],
  },
  {
    name: "Auto & tools",
    icon: "car-outline",
    sections: [
      { name: "Car", items: ["Car parts", "Car accessories", "Car care", "Tyres"] },
      { name: "Tools & building", items: ["Power tools", "Hand tools", "Building materials", "Plumbing & electrical"] },
    ],
  },
  {
    name: "Pets & farm",
    icon: "paw-outline",
    sections: [
      { name: "Pets", items: ["Pet food", "Pet accessories"] },
      { name: "Farm", items: ["Farm produce", "Seeds & fertiliser", "Livestock feed"] },
    ],
  },
  {
    name: "Gifts & crafts",
    icon: "gift-outline",
    sections: [
      { name: "Gifts", items: ["Gift boxes & hampers", "Flowers", "Party supplies"] },
      { name: "Art & crafts", items: ["Art & collectibles", "Handmade crafts"] },
    ],
  },
];

/** Joins categories into one `category` filter (the catalogue matches any of them) */
export const anyCategory = (...names: string[]) => names.join("|");
