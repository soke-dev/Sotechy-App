// DEMO CONTENT — product copy, specs and reviews for demo mode only (not real Sotechy data).

export interface DemoDetails {
  about: string;
  highlights: string[];
  box: string[];
  specs: Record<string, string>;
}

export const DEMO_DETAILS: Record<string, DemoDetails> = {
  "Spark 20 Smartphone 128GB": {
    about:
      "A big, bright everyday phone with all-day battery life. The 6.6\" display is great for video calls and streaming, the 50MP main camera takes sharp photos in daylight, and 128GB of storage leaves room for apps, photos and music.\n\nFace unlock and a side fingerprint sensor keep it secure, and dual SIM lets you use two lines on one phone.",
    highlights: ["6.6\" HD+ 90Hz display", "50MP main camera + 8MP selfie", "5000mAh battery with 18W charging", "128GB storage, 8GB RAM (4GB + 4GB extended)", "Dual SIM, side fingerprint sensor"],
    box: ["Phone", "18W charger", "USB-C cable", "Protective case", "SIM ejector pin", "Quick start guide"],
    specs: { Display: "6.6\" HD+ IPS, 90Hz", Processor: "Octa-core 2.0GHz", Memory: "8GB (4GB + 4GB extended)", Storage: "128GB, microSD up to 1TB", "Rear camera": "50MP + AI lens", "Front camera": "8MP", Battery: "5000mAh", Charging: "18W wired, USB-C", SIM: "Dual nano-SIM", OS: "Android 13", Weight: "190g", Colours: "Black, Blue" },
  },
  "Fast Charger 25W": {
    about: "A compact 25W wall charger with a 3-pin UK/Nigeria plug. It charges most Android phones from 0 to 50% in about 30 minutes and has built-in protection against overheating and power surges.",
    highlights: ["25W fast charging (PD 3.0)", "3-pin UK/Nigeria plug", "Surge and over-heat protection", "Includes 1m USB-C cable"],
    box: ["25W charger", "1m USB-C to USB-C cable"],
    specs: { Output: "25W max (PD 3.0 / PPS)", Input: "100–240V AC", Plug: "3-pin UK (BS 1363)", Port: "1 × USB-C", Cable: "1m USB-C to USB-C", Protection: "Over-voltage, over-current, over-heat", Colour: "White" },
  },
  "Power Bank 20,000mAh": {
    about: "Keep your phone going for days. This 20,000mAh power bank charges a typical phone 4–5 times and can charge two devices at once. The LED dots show how much power is left.",
    highlights: ["20,000mAh capacity", "22.5W fast charging", "Charge 2 devices at once", "LED power indicator"],
    box: ["Power bank", "USB-A to USB-C cable", "User manual"],
    specs: { Capacity: "20,000mAh (74Wh)", Output: "22.5W max", Ports: "2 × USB-A, 1 × USB-C (in/out)", Recharge: "About 6 hours with an 18W charger", Indicator: "4 LED dots", Weight: "380g", Colour: "Black" },
  },
  "14\" Laptop 8GB / 256GB": {
    about:
      "A light, reliable laptop for school, office work and everyday browsing. The fast SSD means it boots in seconds, and the 14\" Full HD screen is comfortable for long documents and video calls.\n\nComes with Windows 11 ready to set up.",
    highlights: ["14\" Full HD display", "8GB RAM, 256GB SSD", "Up to 8 hours battery", "Windows 11 Home", "Weighs about 1.4kg"],
    box: ["Laptop", "65W charger", "Quick start guide"],
    specs: { Display: "14\" FHD (1920 × 1080) anti-glare", Processor: "Intel Core i3, 12th gen", Memory: "8GB DDR4", Storage: "256GB NVMe SSD", Graphics: "Intel UHD", Battery: "Up to 8 hours", Ports: "USB-C, 2 × USB-A, HDMI, headphone jack", Wireless: "Wi-Fi 6, Bluetooth 5.1", OS: "Windows 11 Home", Weight: "1.4kg" },
  },
  "Wireless Mouse": {
    about: "A quiet, comfortable wireless mouse with a plug-and-play USB receiver. One AA battery lasts up to 12 months.",
    highlights: ["Plug-and-play USB receiver", "Up to 12 months battery", "Quiet clicks", "Works with Windows, macOS and ChromeOS"],
    box: ["Mouse", "USB receiver", "AA battery"],
    specs: { Connection: "2.4GHz wireless", Range: "Up to 10m", Sensor: "Optical, 1000 DPI", Battery: "1 × AA (included)", Buttons: "3", Colour: "Graphite" },
  },
  "4-Burner Gas Cooker": {
    about:
      "A full-size gas cooker with four burners, a glass lid and a spacious oven for baking and grilling. Auto-ignition lights the burners with a turn of the knob, and the enamel top wipes clean easily.",
    highlights: ["4 burners with auto-ignition", "Gas oven with grill", "Tempered glass lid", "Easy-clean enamel top", "Oven light and timer"],
    box: ["Cooker", "Oven tray", "Wire rack", "Gas regulator and hose", "User manual"],
    specs: { Burners: "4 (1 rapid, 2 semi-rapid, 1 auxiliary)", Ignition: "Automatic", Oven: "Gas, 60 litres with grill", Lid: "Tempered glass", Size: "60 × 60 × 85 cm", Finish: "Stainless steel", Colour: "Silver" },
  },
  "Double Door Refrigerator 350L": {
    about:
      "A roomy double-door fridge for family shopping. Frost-free cooling means no manual defrosting, and the inverter compressor keeps running costs low and copes better with power fluctuations.\n\nAdjustable glass shelves and a large vegetable crisper make it easy to organise.",
    highlights: ["350 litres total capacity", "Frost-free cooling", "Inverter compressor saves energy", "Adjustable tempered-glass shelves", "Works with stabilizer-free voltage range"],
    box: ["Refrigerator", "Ice tray", "Egg tray", "User manual and warranty card"],
    specs: { Capacity: "350L (fridge 260L / freezer 90L)", Type: "Top freezer, double door", Cooling: "Frost-free", Compressor: "Inverter", "Energy rating": "A+", Voltage: "150–260V", Dimensions: "60 × 65 × 170 cm", Colour: "Silver" },
  },
  "Microwave Oven 20L": {
    about: "A 20-litre microwave for reheating, defrosting and quick meals. Five power levels and simple dials make it easy to use, and the turntable cooks food evenly.",
    highlights: ["20 litre capacity", "700W, 5 power levels", "Defrost setting", "Easy dial controls"],
    box: ["Microwave", "Glass turntable", "Roller ring", "User manual"],
    specs: { Capacity: "20 litres", Power: "700W", Levels: "5", Controls: "Mechanical dials", Timer: "Up to 35 minutes", Dimensions: "44 × 34 × 26 cm", Colour: "Silver" },
  },
  "Split Air Conditioner 1.5HP": {
    about: "A 1.5HP inverter split AC that cools a room of up to 20m² quickly and quietly. The inverter adjusts the compressor speed to save power, and the anti-corrosion copper coil is built for humid weather.",
    highlights: ["1.5HP inverter", "Cools rooms up to 20m²", "Copper condenser, anti-corrosion coating", "Sleep mode and 24-hour timer", "Remote control"],
    box: ["Indoor unit", "Outdoor unit", "Remote control", "Installation kit"],
    specs: { Capacity: "1.5HP (12,000 BTU)", Type: "Split, inverter", Refrigerant: "R32", Coverage: "Up to 20m²", Noise: "From 24dB (indoor)", Modes: "Cool, dry, fan, sleep", Voltage: "150–260V" },
  },
  "Standing Fan 18\"": {
    about: "A tall 18\" standing fan with five blades and three speeds. The head oscillates to spread air across the room, and the height adjusts for sitting or standing.",
    highlights: ["18\" five-blade fan", "3 speed settings", "Wide oscillation", "Adjustable height"],
    box: ["Fan head", "Pole", "Base", "User manual"],
    specs: { "Blade size": "18 inches", Speeds: "3", Power: "60W", Oscillation: "Yes, 90°", Height: "Adjustable up to 1.35m", Colour: "White" },
  },
  "Water Dispenser": {
    about: "A tabletop water dispenser with hot and cold taps. Ideal for homes and offices, with a child-safety lock on the hot tap.",
    highlights: ["Hot and cold water", "Child-safety lock on hot tap", "Fits standard 18.9L bottles", "Removable drip tray"],
    box: ["Dispenser", "User manual"],
    specs: { Type: "Tabletop, top-loading", Temperatures: "Hot ~90°C, cold ~10°C", Bottle: "18.9L (5 gallon)", Power: "Heating 500W, cooling 90W", Colour: "White" },
  },
  "3.5kVA Generator": {
    about: "A dependable 3.5kVA petrol generator for home backup. It runs lights, fans, a TV and a fridge, has an electric key start, and the large fuel tank gives long running time.",
    highlights: ["3.5kVA rated output", "Key and recoil start", "Large fuel tank for long run time", "Voltage meter and circuit breaker"],
    box: ["Generator", "Battery", "Ignition keys", "Tool kit", "User manual"],
    specs: { "Rated output": "3.0kVA", "Max output": "3.5kVA", Fuel: "Petrol", "Fuel tank": "15 litres", "Run time": "Up to 10 hours at half load", Start: "Electric key + recoil", Outputs: "2 × 220V sockets, 12V DC", Weight: "48kg" },
  },
  "Electric Kettle 1.7L": {
    about: "A stainless-steel cordless kettle that boils a full 1.7 litres in minutes. It switches off automatically when the water boils or if it runs dry.",
    highlights: ["1.7 litre capacity", "Fast boil, 2200W", "Auto shut-off and boil-dry protection", "360° cordless base"],
    box: ["Kettle", "Power base"],
    specs: { Capacity: "1.7 litres", Power: "2200W", Material: "Stainless steel", Safety: "Auto shut-off, boil-dry protection", Base: "360° cordless" },
  },
  "43\" Smart TV": {
    about:
      "A 43\" Full HD smart TV with Netflix, YouTube and Prime Video built in. Stream your favourite shows without a decoder, mirror your phone, and connect a sound bar or console through HDMI.\n\nSlim bezels and a sleek stand look good in any living room.",
    highlights: ["43\" Full HD LED display", "Smart TV with Netflix, YouTube and Prime Video", "Screen mirroring from your phone", "2 × HDMI, 2 × USB", "Dolby Audio"],
    box: ["TV", "Remote control with batteries", "Table stand and screws", "Power cable", "User manual"],
    specs: { Screen: "43\" LED", Resolution: "Full HD 1920 × 1080", "Smart platform": "VIDAA", Apps: "Netflix, YouTube, Prime Video and more", Audio: "2 × 8W, Dolby Audio", Connectivity: "Wi-Fi, 2 × HDMI, 2 × USB, optical", "Wall mount": "VESA 200 × 200", Voltage: "100–240V" },
  },
  "Sound Bar": {
    about: "A 2.1 sound bar with a wireless subwoofer for fuller TV sound. Connect by HDMI ARC, optical or Bluetooth, and use the movie and music modes.",
    highlights: ["2.1 channel with wireless subwoofer", "120W total power", "HDMI ARC, optical and Bluetooth", "Movie, music and news modes"],
    box: ["Sound bar", "Subwoofer", "Remote control", "HDMI cable", "Wall mount kit"],
    specs: { Channels: "2.1", Power: "120W total", Subwoofer: "Wireless, 6.5\" driver", Connections: "HDMI ARC, optical, Bluetooth 5.0, USB", Modes: "Movie, music, news" },
  },
  "Bluetooth Speaker": {
    about: "A splash-resistant Bluetooth speaker with big bass and up to 12 hours of playtime. Pair two speakers for stereo sound.",
    highlights: ["Up to 12 hours playtime", "IPX5 splash resistant", "Deep bass", "Pair two for stereo"],
    box: ["Speaker", "USB-C charging cable", "User manual"],
    specs: { Output: "10W", Battery: "Up to 12 hours", Charging: "USB-C, about 3 hours", Bluetooth: "5.3, range up to 10m", "Water resistance": "IPX5", Weight: "420g" },
  },
  "Digital Air Fryer 4.5L": {
    about: "Crispy chips, chicken and plantain with little or no oil. The 4.5L basket feeds a family, and eight one-touch presets make cooking easy.",
    highlights: ["4.5L non-stick basket", "8 one-touch presets", "Up to 80% less oil", "Digital touch display with timer"],
    box: ["Air fryer", "Non-stick basket", "Recipe booklet"],
    specs: { Capacity: "4.5 litres", Power: "1500W", Temperature: "80–200°C", Timer: "Up to 60 minutes", Presets: "8", Colour: "Black" },
  },
  "Instant Water Heater 15L": {
    about: "A compact 15-litre water heater for bathrooms and kitchens. It heats water quickly and has a safety valve and thermostat for worry-free use.",
    highlights: ["15 litre tank", "Fast heating", "Adjustable thermostat", "Safety valve included"],
    box: ["Water heater", "Safety valve", "Wall mounting kit"],
    specs: { Capacity: "15 litres", Power: "1500W", "Max temperature": "75°C", Mounting: "Wall", Protection: "Thermostat, safety valve" },
  },
  "Table Blender 1.5L": {
    about: "A powerful blender for smoothies, pepper and soups. The 1.5L jar has stainless-steel blades and a pulse setting for coarse grinding.",
    highlights: ["1.5 litre jar", "Stainless-steel blades", "2 speeds + pulse", "Includes grinder mill"],
    box: ["Blender base", "1.5L jar with lid", "Grinder mill"],
    specs: { Capacity: "1.5 litres", Power: "500W", Speeds: "2 + pulse", Blades: "Stainless steel", Jar: "Unbreakable plastic" },
  },
  "Built-in Gas Hob, 4 Burners": {
    about: "A sleek built-in gas hob with a tempered-glass top and cast-iron pan supports. Auto-ignition and flame-failure safety make it a great kitchen upgrade.",
    highlights: ["4 gas burners", "Tempered-glass top", "Cast-iron pan supports", "Auto-ignition", "Flame-failure safety device"],
    box: ["Hob", "Pan supports", "Burner caps", "Installation kit"],
    specs: { Burners: "4", Top: "Black tempered glass", Ignition: "Automatic", Safety: "Flame-failure device", "Cut-out size": "56 × 48 cm" },
  },
};

export interface DemoReview {
  author: string;
  avatar: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  daysAgo: number;
}

export const DEMO_REVIEWS: Record<string, DemoReview[]> = {
  "43\" Smart TV": [
    { author: "Chidi O.", avatar: "m2", rating: 5, title: "Great picture for the price", body: "Netflix and YouTube work straight away. Picked it up at Etete Road the same day.", verified: true, daysAgo: 3 },
    { author: "Amaka N.", avatar: "f1", rating: 4, title: "Very good", body: "Picture is sharp and the remote is easy. Sound is okay, I added a sound bar.", verified: true, daysAgo: 11 },
    { author: "Tunde A.", avatar: "m1", rating: 5, title: "Smooth smart features", body: "Screen mirroring from my phone works well. Staff set it up for me in store.", verified: false, daysAgo: 20 },
    { author: "Blessing E.", avatar: "f2", rating: 4, title: "Happy with it", body: "Good value. Took a few minutes to log into the apps but works fine now.", verified: true, daysAgo: 34 },
  ],
  "Double Door Refrigerator 350L": [
    { author: "Ngozi I.", avatar: "f1", rating: 5, title: "Cools fast even with NEPA", body: "Freezer gets cold quickly and it handles our voltage well. Delivery was on time.", verified: true, daysAgo: 6 },
    { author: "Ibrahim S.", avatar: "m3", rating: 4, title: "Spacious", body: "Lots of space for a family of five. A bit noisy the first day, fine now.", verified: true, daysAgo: 25 },
  ],
  "Spark 20 Smartphone 128GB": [
    { author: "Ese O.", avatar: "f3", rating: 5, title: "Battery lasts all day", body: "I use it for business WhatsApp all day and still have charge at night.", verified: true, daysAgo: 2 },
    { author: "Femi B.", avatar: "m1", rating: 4, title: "Good camera", body: "Daylight photos are very clear. Night photos are average.", verified: true, daysAgo: 9 },
    { author: "Grace U.", avatar: "f2", rating: 3, title: "Okay phone", body: "Does the job, but it gets warm when gaming.", verified: false, daysAgo: 18 },
  ],
  "Microwave Oven 20L": [
    { author: "Kemi A.", avatar: "f3", rating: 5, title: "Simple and works", body: "Easy dials, my mum uses it without any wahala.", verified: true, daysAgo: 7 },
    { author: "Samuel O.", avatar: "m2", rating: 4, title: "Good size", body: "Fits a big plate. Defrost works well.", verified: true, daysAgo: 15 },
  ],
  "3.5kVA Generator": [
    { author: "Musa D.", avatar: "m3", rating: 5, title: "Carries my fridge and TV", body: "Starts with the key every time and fuel lasts long.", verified: true, daysAgo: 4 },
    { author: "Patience K.", avatar: "f1", rating: 4, title: "Strong gen", body: "A bit loud but very reliable. Staff explained everything at pickup.", verified: true, daysAgo: 22 },
  ],
  "Power Bank 20,000mAh": [
    { author: "Daniel E.", avatar: "m1", rating: 5, title: "Charges my phone 4 times", body: "Very useful during light outages.", verified: true, daysAgo: 5 },
  ],
  "Digital Air Fryer 4.5L": [
    { author: "Funke A.", avatar: "f2", rating: 5, title: "Best kitchen buy", body: "Plantain and chicken come out crispy with almost no oil.", verified: true, daysAgo: 8 },
    { author: "Victor N.", avatar: "m2", rating: 4, title: "Very good", body: "Easy to clean. The basket could be a bit bigger for my family.", verified: false, daysAgo: 30 },
  ],
  "4-Burner Gas Cooker": [
    { author: "Rita O.", avatar: "f3", rating: 4, title: "Solid cooker", body: "Auto-ignition works well and the oven bakes evenly.", verified: true, daysAgo: 13 },
  ],
};
