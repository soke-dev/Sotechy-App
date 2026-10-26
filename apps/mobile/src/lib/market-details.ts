// Sample details for marketplace store products (description, features, specs, what's in the box),
// chosen by product type. Real stores fill these in from the merchant dashboard's product form.
import type { MarketStore, StoreProduct } from "./marketplace";

export type ProductGroup = "phones" | "computers" | "tv" | "home" | "power";

interface Details {
  group: ProductGroup;
  brand: string;
  about: string;
  features: string[];
  specs: [string, string][];
  inBox: string[];
  warranty: string;
}

const RULES: [RegExp, Omit<Details, "warranty"> & { warranty?: string }][] = [
  [/phone/i, { group: "phones", brand: "Tecno", about: "A big-battery smartphone with a sharp camera and plenty of storage. Tested in the shop before it's sent.", features: ["5,000mAh battery lasts a full day", "50MP camera with night mode", "Fast charging: 0–50% in 30 minutes"], specs: [["Storage", "128GB"], ["RAM", "8GB"], ["Screen", '6.6"'], ["Battery", "5,000mAh"], ["Network", "4G, dual SIM"]], inBox: ["Phone", "Charger", "USB-C cable", "Case", "SIM pin"] }],
  [/charger/i, { group: "phones", brand: "Oraimo", about: "A 25W fast charger with a strong braided cable. Works with Samsung, Tecno, Infinix and iPhone (with a USB-C cable).", features: ["Fast charging", "Stops when your phone is full", "Strong braided cable"], specs: [["Output", "25W"], ["Connector", "USB-C"], ["Cable length", "1m"]], inBox: ["Charger", "USB-C cable"] }],
  [/power bank/i, { group: "phones", brand: "Oraimo", about: "Charges a phone about four times. Shows how much charge is left.", features: ["20,000mAh: about 4 phone charges", "Fast charging in and out", "Charges two devices at once"], specs: [["Capacity", "20,000mAh"], ["Output", "22.5W"], ["Ports", "2 USB-A, 1 USB-C"]], inBox: ["Power bank", "Charging cable"] }],
  [/speaker/i, { group: "tv", brand: "JBL", about: "Loud, clear sound with deep bass, in a speaker you can take anywhere.", features: ["30 hours of play", "Splash-proof", "Pairs with any phone in seconds"], specs: [["Battery life", "30 hours"], ["Connection", "Bluetooth 5.3"], ["Water resistance", "IPX5"]], inBox: ["Speaker", "Charging cable"] }],
  [/sound bar/i, { group: "tv", brand: "Hisense", about: "Fuller TV sound with a wireless subwoofer. Connects with one HDMI cable.", features: ["Wireless subwoofer", "Dialogue mode for clear voices", "Bluetooth for music"], specs: [["Output power", "240W"], ["Channels", "2.1"], ["Ports", "HDMI ARC, optical"]], inBox: ["Sound bar", "Subwoofer", "Remote", "HDMI cable"] }],
  [/laptop/i, { group: "computers", brand: "HP", about: "A light 14-inch laptop for work and school, with a fast SSD that starts up in seconds.", features: ["Fast SSD: boots in seconds", "Light enough to carry all day", "Backlit keyboard"], specs: [["Processor", "Intel Core i5"], ["RAM", "8GB"], ["Storage", "256GB SSD"], ["Screen", '14" Full HD'], ["System", "Windows 11"]], inBox: ["Laptop", "Charger"] }],
  [/mouse/i, { group: "computers", brand: "Logitech", about: "A quiet wireless mouse that runs for months on one battery.", features: ["Silent clicks", "Up to 12 months per battery", "Works with laptops and desktops"], specs: [["Connection", "2.4GHz USB receiver"], ["Battery", "1 x AA"]], inBox: ["Mouse", "USB receiver", "AA battery"] }],
  [/\btv\b|smart tv/i, { group: "tv", brand: "Hisense", about: "A 43-inch smart TV with YouTube and Netflix built in. Wall bracket included.", features: ["YouTube and Netflix built in", "Sharp Full HD picture", "Works with your decoder and sound bar"], specs: [["Screen size", '43"'], ["Resolution", "Full HD"], ["Smart TV", "VIDAA"], ["Ports", "3 HDMI, 2 USB"]], inBox: ["TV", "Remote", "Stand", "Wall bracket"] }],
  [/fridge|freezer/i, { group: "home", brand: "Hisense", about: "A 200-litre double-door fridge with an inverter that uses less light.", features: ["Inverter: uses less power", "Keeps cold through outages", "Adjustable shelves"], specs: [["Capacity", "200L"], ["Type", "Double door"], ["Energy", "Inverter"]], inBox: ["Fridge", "Ice tray", "Egg tray"] }],
  [/air conditioner|\bac\b/i, { group: "home", brand: "Hisense", about: "A 1.5HP split air conditioner that cools a big room in minutes. Installation available.", features: ["Cools a big room in minutes", "Inverter: lower light bills", "Quiet enough for bedrooms"], specs: [["Capacity", "1.5HP"], ["Energy", "Inverter"], ["Gas", "R32"]], inBox: ["Indoor unit", "Outdoor unit", "Remote", "Pipes"] }],
  [/microwave/i, { group: "home", brand: "Scanfrost", about: "A 20-litre microwave with simple dials for heating and defrosting.", features: ["Heats food in seconds", "Defrost setting", "Easy-clean inside"], specs: [["Capacity", "20L"], ["Power", "700W"]], inBox: ["Microwave", "Glass plate"] }],
  [/blender/i, { group: "home", brand: "Binatone", about: "A strong blender for pepper, smoothies and grinding.", features: ["Grinds pepper and crayfish", "Sharp stainless blades", "Two speeds and pulse"], specs: [["Jug", "1.5L"], ["Power", "450W"]], inBox: ["Blender", "Grinding mill"] }],
  [/air fryer/i, { group: "home", brand: "Silver Crest", about: "Fries with little or no oil. Eight one-touch settings for chips, chicken and more.", features: ["Cooks with little or no oil", "Non-stick basket", "8 one-touch settings"], specs: [["Capacity", "4.5L"], ["Power", "1,500W"]], inBox: ["Air fryer", "Basket", "Recipe book"] }],
  [/kettle/i, { group: "home", brand: "Binatone", about: "Boils water fast and switches off by itself.", features: ["Boils in minutes", "Switches off when done", "Cordless base"], specs: [["Capacity", "1.7L"], ["Power", "2,200W"]], inBox: ["Kettle", "Base"] }],
  [/cooker|hob/i, { group: "home", brand: "Scanfrost", about: "Cook several dishes at once, with a reliable auto-ignition.", features: ["Auto ignition", "Easy-clean top", "Strong pan supports"], specs: [["Burners", "4"], ["Fuel", "Gas"]], inBox: ["Cooker", "Pan supports"] }],
  [/dispenser/i, { group: "home", brand: "Haier Thermocool", about: "Hot and cold water on tap, with child lock on the hot side.", features: ["Hot and cold water", "Child lock", "Storage cabinet"], specs: [["Taps", "Hot and cold"], ["Bottle", "Top load"]], inBox: ["Dispenser"] }],
  [/fan/i, { group: "power", brand: "Lontor", about: "A rechargeable standing fan that keeps going through outages.", features: ["Runs up to 6 hours on battery", "3 speeds", "Built-in light"], specs: [["Size", '18"'], ["Battery", "Up to 6 hours"]], inBox: ["Fan", "Charging cable"] }],
  [/generator/i, { group: "power", brand: "Firman", about: "A 3.5kVA petrol generator that powers your TV, fridge, fans and lights. Free first service.", features: ["Powers TV, fridge, fans and lights", "Key start", "Low fuel use"], specs: [["Capacity", "3.5kVA"], ["Fuel", "Petrol"], ["Runtime", "About 8 hours per tank"]], inBox: ["Generator", "Key", "Tool kit"], warranty: "1 year, free first service" }],
  [/heater/i, { group: "home", brand: "Binatone", about: "Warms a room quickly, with a safety cut-off if it tips over.", features: ["Warms a room fast", "Tip-over safety switch", "Two heat levels"], specs: [["Power", "2,000W"]], inBox: ["Heater"] }],
];

export function detailsFor(store: MarketStore, product: StoreProduct): Details {
  const rule = RULES.find(([re]) => re.test(product.name))?.[1];
  return {
    group: rule?.group ?? "home",
    brand: rule?.brand ?? store.name,
    about: rule?.about ?? `${product.name} from ${store.name}.`,
    features: rule?.features ?? [],
    specs: rule?.specs ?? [],
    inBox: rule?.inBox ?? [product.name],
    warranty: rule?.warranty ?? "6 months from the store",
  };
}

/** Which of Sotechy's top categories a store product belongs to, from the category's name */
export function groupOfCategory(name: string | undefined): ProductGroup | null {
  if (!name) return null;
  if (/phone|tablet|charger|power bank/i.test(name)) return "phones";
  if (/computer|laptop|gadget/i.test(name)) return "computers";
  if (/tv|audio|sound|speaker/i.test(name)) return "tv";
  if (/power|generator|stabil|inverter/i.test(name)) return "power";
  if (/home|appliance|cook|fan|cool|fridge|water|small/i.test(name)) return "home";
  return null;
}

export const REVIEWS = [
  { name: "Chidi O.", stars: 5, text: "Came the next day, well packed. Works perfectly.", photo: true, ago: "2 days ago" },
  { name: "Amaka N.", stars: 4, text: "Good price and they called before delivery. Box was a bit dented.", photo: false, ago: "1 week ago" },
  { name: "Tunde B.", stars: 5, text: "Picked it up myself, very friendly staff. Will buy again.", photo: true, ago: "3 weeks ago" },
];
