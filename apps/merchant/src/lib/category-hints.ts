// Suggestions for the product details, based on the category the merchant picked:
// which specs customers look for (with an example value), feature ideas and what's usually in the box.
import { categoryGroup } from "./categories";

export interface Hints {
  /** What to mention, in a sentence */
  tip: string;
  specs: [label: string, example: string][];
  features: string[];
  inBox: string;
}

const GENERIC: Hints = {
  tip: "Say what makes it worth buying: quality, size, what it's for.",
  specs: [["Size", "Medium"], ["Colour", "Black"], ["Material", "Plastic"], ["Weight", "1kg"]],
  features: ["Strong and well made", "Easy to use", "Great value for the price"],
  inBox: "Item, user guide",
};

const BY_GROUP: Record<string, Hints> = {
  "Phones & tablets": {
    tip: "Customers compare storage, RAM, battery, camera and network.",
    specs: [["Storage", "128GB"], ["RAM", "8GB"], ["Screen size", '6.6"'], ["Battery", "5,000mAh"], ["Main camera", "50MP"], ["SIM", "Dual SIM"], ["Network", "4G"], ["Colour", "Black"]],
    features: ["5,000mAh battery lasts a full day", "50MP camera with night mode", "Fast charging: 0–50% in 30 minutes"],
    inBox: "Phone, charger, USB-C cable, case, SIM pin",
  },
  Computers: {
    tip: "Mention the processor, RAM, storage and screen. Say if it's new or UK-used.",
    specs: [["Processor", "Intel Core i5, 12th gen"], ["RAM", "8GB"], ["Storage", "256GB SSD"], ["Screen size", '14"'], ["Graphics", "Intel Iris Xe"], ["Battery life", "Up to 8 hours"], ["Operating system", "Windows 11"]],
    features: ["Fast SSD: boots in seconds", "Light enough to carry all day", "Backlit keyboard for night work"],
    inBox: "Laptop, charger, user guide",
  },
  Audio: {
    tip: "Battery life, connection and sound are what buyers ask about.",
    specs: [["Battery life", "30 hours"], ["Connection", "Bluetooth 5.3"], ["Output power", "20W"], ["Noise cancelling", "Yes"], ["Water resistance", "IPX5"], ["Colour", "Black"]],
    features: ["Deep bass, clear vocals", "30 hours of play on one charge", "Pairs with any phone in seconds"],
    inBox: "Speaker, charging cable, user guide",
  },
  "TV & video": {
    tip: "Screen size, resolution and smart features matter most.",
    specs: [["Screen size", '43"'], ["Resolution", "Full HD 1080p"], ["Smart TV", "Android TV"], ["Ports", "3 HDMI, 2 USB"], ["Sound", "20W speakers"], ["Wall mount", "Included"]],
    features: ["YouTube and Netflix built in", "Sharp picture, even in bright rooms", "Works with your decoder and sound bar"],
    inBox: "TV, remote, stand, power cable, wall bracket",
  },
  "Wearables & gaming": {
    tip: "Battery life, what it works with and what's included.",
    specs: [["Battery life", "7 days"], ["Works with", "Android & iPhone"], ["Water resistance", "5ATM"], ["Storage", "1TB"], ["Controllers", "1 included"]],
    features: ["Tracks steps, sleep and heart rate", "Get calls and WhatsApp alerts on your wrist", "Comes with 2 games"],
    inBox: "Watch, charging cable, user guide",
  },
  "Power & solar": {
    tip: "Buyers want to know what it can power and for how long.",
    specs: [["Capacity", "3.5kVA"], ["Battery", "220Ah"], ["Solar panel", "400W"], ["Fuel", "Petrol"], ["Runtime", "8 hours on a full tank"], ["Noise level", "Quiet"]],
    features: ["Powers TV, fridge, fans and lights", "Runs quietly through the night", "Key start and remote start"],
    inBox: "Generator, key, tool kit, user guide",
  },
  "Home appliances": {
    tip: "Capacity, power use and energy saving help people choose.",
    specs: [["Capacity", "1.5HP"], ["Power", "1,200W"], ["Energy saving", "Inverter"], ["Size", '18"'], ["Speeds", "3"], ["Colour", "White"]],
    features: ["Inverter: uses less light", "Cools a big room in minutes", "Quiet enough for bedrooms"],
    inBox: "Indoor unit, outdoor unit, remote, pipes",
  },
  Kitchen: {
    tip: "Capacity, power and settings are what cooks look for.",
    specs: [["Capacity", "4.5L"], ["Power", "1,500W"], ["Settings", "8 presets"], ["Material", "Stainless steel"], ["Colour", "Black"]],
    features: ["Cooks with little or no oil", "Easy to clean, non-stick basket", "8 one-touch settings"],
    inBox: "Air fryer, basket, recipe book",
  },
  Makeup: {
    tip: "Say the shade, finish and size. Mention skin types it suits.",
    specs: [["Shade", "Warm Beige 220"], ["Finish", "Matte"], ["Size", "30ml"], ["Coverage", "Full"], ["Skin type", "Oily & combination"], ["Wear time", "Up to 16 hours"]],
    features: ["Long-wearing, up to 16 hours", "Won't crease or cake", "Shades for deep and medium skin tones"],
    inBox: "Foundation 30ml",
  },
  "Beauty & personal care": {
    tip: "Size, what it's for and key ingredients. For hair, say length and type.",
    specs: [["Size", "100ml"], ["Skin or hair type", "All types"], ["Scent", "Vanilla"], ["Key ingredients", "Shea butter"], ["Use", "Daily"]],
    features: ["Soft, natural-looking finish", "Gentle on sensitive skin", "Lasts all day"],
    inBox: "Bottle 100ml",
  },
  Fashion: {
    tip: "Give sizes, colours and material so buyers get the right fit.",
    specs: [["Size", "M / UK 12"], ["Colour", "Navy"], ["Material", "100% cotton"], ["Fit", "Regular"], ["Shoe size", "EU 42"], ["Strap", "Leather"]],
    features: ["Soft, breathable fabric", "True to size", "Easy to wash, keeps its colour"],
    inBox: "1 item",
  },
  "Home & living": {
    tip: "Size and material help people picture it in their home.",
    specs: [["Dimensions", "120 x 60 x 75cm"], ["Material", "Wood"], ["Colour", "Walnut"], ["Assembly", "Needed, tools included"]],
    features: ["Solid and built to last", "Easy to put together", "Fits small spaces"],
    inBox: "Parts, screws, assembly guide",
  },
  "Baby, kids & toys": {
    tip: "Say the age it's for and whether it needs batteries.",
    specs: [["Age", "3+ years"], ["Material", "BPA-free plastic"], ["Batteries", "3 x AA, not included"], ["Size", "Medium"]],
    features: ["Safe for little hands", "Helps learning and play", "Easy to clean"],
    inBox: "Toy, user guide",
  },
  "Health & sports": {
    tip: "Size, limits and how it's used.",
    specs: [["Max weight", "120kg"], ["Dimensions", "140 x 60cm"], ["Power", "Battery"], ["Pack size", "60 tablets"]],
    features: ["Use it at home, no gym needed", "Folds away to save space", "Clear, easy-to-read display"],
    inBox: "Item, user guide",
  },
  "Food & drinks": {
    tip: "Give the weight or pack size and the expiry date.",
    specs: [["Weight", "1kg"], ["Pack size", "12 x 50cl"], ["Expiry", "Dec 2027"], ["Ingredients", "Rice"]],
    features: ["Fresh stock", "Sealed and well packed", "Good for the whole family"],
    inBox: "1 pack",
  },
  "Office & school": {
    tip: "Say the type, size and quantity.",
    specs: [["Pack size", "12 pieces"], ["Pages", "200"], ["Author", "Chinua Achebe"], ["Type", "Scientific calculator"]],
    features: ["Good for school and office", "Strong and long-lasting", "Value pack"],
    inBox: "1 pack",
  },
};

/** A few categories need their own specs, not their group's. */
const BY_CATEGORY: Record<string, Partial<Hints>> = {
  "Chargers & cables": { specs: [["Output", "25W"], ["Connector", "USB-C"], ["Cable length", "1m"], ["Works with", "Samsung, Tecno, iPhone"]], features: ["Fast charging", "Strong braided cable", "Safe: stops when full"], inBox: "Charger, USB-C cable" },
  "Power banks": { specs: [["Capacity", "20,000mAh"], ["Output", "22.5W"], ["Ports", "2 USB-A, 1 USB-C"], ["Charges a phone", "About 4 times"]], features: ["Charges a phone about 4 times", "Fast charging", "Shows battery level"], inBox: "Power bank, charging cable" },
  "Phone cases & covers": { specs: [["Fits", "iPhone 13"], ["Material", "Silicone"], ["Colour", "Black"]], features: ["Protects from drops", "Slim, doesn't add bulk"], inBox: "1 case" },
  "Screen protectors": { specs: [["Fits", "Galaxy A15"], ["Type", "Tempered glass"], ["Pack", "2 pieces"]], features: ["Scratch resistant", "Easy, bubble-free fit"], inBox: "2 screen protectors, cleaning kit" },
  Monitors: { specs: [["Screen size", '24"'], ["Resolution", "Full HD"], ["Refresh rate", "75Hz"], ["Ports", "HDMI, VGA"]] },
  "Printers & ink": { specs: [["Type", "Inkjet"], ["Prints", "Colour"], ["Connectivity", "Wi-Fi, USB"], ["Functions", "Print, scan, copy"]] },
  "Storage & flash drives": { specs: [["Capacity", "64GB"], ["Type", "USB 3.0 flash"], ["Speed", "100MB/s"]] },
  "Routers & MiFi": { specs: [["Network", "4G LTE"], ["Max users", "10"], ["Battery", "3,000mAh"], ["Works with", "MTN, Airtel, Glo, 9mobile"]] },
  Cameras: { specs: [["Megapixels", "24MP"], ["Video", "4K"], ["Lens", "18–55mm"]] },
  "CCTV & security": { specs: [["Cameras", "4"], ["Resolution", "1080p"], ["Night vision", "Yes, 20m"], ["Storage", "1TB"]] },
  Fans: { specs: [["Size", '18"'], ["Speeds", "3"], ["Rechargeable", "Yes, 6 hours"], ["Type", "Standing"]] },
  "Fridges & freezers": { specs: [["Capacity", "200L"], ["Type", "Double door"], ["Energy saving", "Inverter"], ["Colour", "Silver"]] },
  "Washing machines": { specs: [["Capacity", "7kg"], ["Type", "Front load"], ["Programmes", "12"]] },
  "Wigs & hair extensions": { specs: [["Length", '20"'], ["Hair type", "Human hair, bone straight"], ["Lace", "13x4 frontal"], ["Density", "180%"], ["Colour", "Natural black"]], features: ["Soft, natural-looking hairline", "Can be dyed and styled", "Lasts with good care"], inBox: "Wig, wig cap" },
  "Perfume & body spray": { specs: [["Size", "100ml"], ["Scent", "Woody, vanilla"], ["Type", "Eau de parfum"], ["For", "Men"]], features: ["Lasts all day", "Fresh, not too strong"], inBox: "Perfume 100ml" },
  Skincare: { specs: [["Size", "50ml"], ["Skin type", "Oily & acne-prone"], ["Key ingredients", "Niacinamide"], ["Use", "Morning and night"]] },
  "Lipstick & lip gloss": { specs: [["Shade", "Ruby Red"], ["Finish", "Matte"], ["Wear time", "Up to 12 hours"]] },
  "Makeup brushes & sponges": { specs: [["Pieces", "12"], ["Bristles", "Synthetic"], ["Case", "Included"]] },
  Shoes: { specs: [["Size", "EU 42"], ["Colour", "White"], ["Material", "Leather"], ["Sole", "Rubber"]] },
  Watches: { specs: [["Strap", "Leather"], ["Water resistance", "3ATM"], ["Movement", "Quartz"], ["Case size", "42mm"]] },
};

export function hintsFor(category: string): Hints {
  const base = BY_GROUP[categoryGroup(category)] ?? GENERIC;
  return { ...base, ...BY_CATEGORY[category] };
}
