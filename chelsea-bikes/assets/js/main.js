/* Chelsea Bikes redesign prototype — shared behaviour
   Header/footer injection, product rendering, filters, multi-step forms. */

// ---------------------------------------------------------------
// Shared business facts (single source of truth for the prototype)
// ---------------------------------------------------------------
const SHOP = {
  name: "Chelsea Bikes",
  address: "427 Kings Road, Chelsea, London SW10 0LR",
  phone: "020 7376 3700",
  phoneHref: "tel:+442073763700",
  whatsapp: "+44 7305 842553",
  whatsappHref: "https://wa.me/447305842553",
  email: "info@chelseabikes.co.uk",
  hours: [
    ["Monday – Friday", "9:00 – 19:00"],
    ["Saturday", "9:00 – 18:30"],
    ["Sunday", "11:00 – 17:00"],
  ],
};

// ---------------------------------------------------------------
// Live opening status, computed from the real trading hours above.
// Day index 0 = Sunday. Times in minutes from midnight.
// ---------------------------------------------------------------
const TRADING = {
  0: [11 * 60, 17 * 60],          // Sunday      11:00 – 17:00
  1: [9 * 60, 19 * 60],           // Monday       9:00 – 19:00
  2: [9 * 60, 19 * 60],
  3: [9 * 60, 19 * 60],
  4: [9 * 60, 19 * 60],
  5: [9 * 60, 19 * 60],           // Friday
  6: [9 * 60, 18 * 60 + 30],      // Saturday     9:00 – 18:30
};
function hhmm(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}` + ":00" : `${h}:${String(m).padStart(2, "0")}`;
}

function shopStatus(now = new Date()) {
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [open, close] = TRADING[day];

  if (mins >= open && mins < close) {
    const left = close - mins;
    return {
      open: true,
      label: left <= 60 ? `Open · closing at ${hhmm(close)}` : `Open now · until ${hhmm(close)}`,
    };
  }
  // Before opening today
  if (mins < open) {
    return { open: false, label: `Closed · opens ${hhmm(open)} today` };
  }
  // Shut for the day. The shop trades every day, so tomorrow always opens.
  const [nextOpen] = TRADING[(day + 1) % 7];
  return { open: false, label: `Closed · opens ${hhmm(nextOpen)} tomorrow` };
}

// ---------------------------------------------------------------
// Inline SVG art — self-contained placeholder imagery.
// Swap for real shop/product photography before the live build.
// ---------------------------------------------------------------
const PALETTES = {
  teal: ["#0e7c86", "#12919c", "#0b1f30"],
  navy: ["#16344e", "#10293e", "#0e7c86"],
  amber: ["#f59e0b", "#d97706", "#0b1f30"],
  slate: ["#4d6274", "#37485a", "#f59e0b"],
  green: ["#2f8a4c", "#247040", "#0b1f30"],
  rose: ["#c05270", "#a13e5a", "#0b1f30"],
};

/* Frame silhouettes per bike type. A single generic outline recoloured twelve
   times reads as clip-art on the listing page; a road bike with drop bars and a
   folder with small wheels reads as a real range. Coordinates share one 300×175
   box so every drawing sits consistently in the tile. */
const FRAMES = {
  Road: `
    <circle cx="55" cy="115" r="46"/><circle cx="225" cy="115" r="46"/>
    <path d="M55 115 L112 42 L190 42 L225 115"/>
    <path d="M55 115 L130 115 L112 42"/><path d="M130 115 L190 42"/>
    <path d="M106 26 L124 26 M112 42 L106 26"/>
    <path d="M190 42 L198 20 Q214 20 212 34 L206 42"/>`,
  Hybrid: `
    <circle cx="55" cy="115" r="46"/><circle cx="225" cy="115" r="46"/>
    <path d="M55 115 L112 42 L190 42 L225 115"/>
    <path d="M55 115 L130 115 L112 42"/><path d="M130 115 L190 42"/>
    <path d="M104 24 L124 24 M112 42 L104 24"/>
    <path d="M172 34 L208 34"/>`,
  Mountain: `
    <circle cx="55" cy="112" r="50"/><circle cx="228" cy="112" r="50"/>
    <path d="M55 112 L112 44 L188 44 L228 112"/>
    <path d="M55 112 L132 112 L112 44"/><path d="M132 112 L188 44"/>
    <path d="M104 26 L126 26 M112 44 L104 26"/>
    <path d="M170 36 L210 36"/><path d="M228 112 L214 62"/>`,
  Folding: `
    <circle cx="70" cy="130" r="32"/><circle cx="212" cy="130" r="32"/>
    <path d="M70 130 L118 78 L180 78 L212 130"/>
    <path d="M70 130 L141 130 L118 78"/>
    <path d="M118 78 L112 40 L96 40"/>
    <path d="M180 78 L186 44"/><path d="M170 44 L202 44"/>`,
  Kids: `
    <circle cx="80" cy="132" r="34"/><circle cx="212" cy="132" r="34"/>
    <path d="M80 132 L128 84 L182 84 L212 132"/>
    <path d="M80 132 L146 132 L128 84"/>
    <path d="M128 84 L122 52 M108 52 L140 52"/>
    <path d="M182 84 L188 58 L206 58"/>`,
  Electric: `
    <circle cx="55" cy="115" r="46"/><circle cx="225" cy="115" r="46"/>
    <path d="M55 115 L112 42 L190 42 L225 115"/>
    <path d="M55 115 L130 115 L112 42"/>
    <rect x="126" y="56" width="56" height="26" rx="6"/>
    <path d="M148 62 L140 72 L154 72 L146 82"/>
    <path d="M104 24 L126 24 M112 42 L104 24"/>
    <path d="M190 42 L196 20 L214 20"/>`,
  Classic: `
    <circle cx="58" cy="115" r="46"/><circle cx="226" cy="115" r="46"/>
    <path d="M58 115 L132 115 L114 44"/>
    <path d="M114 44 Q150 92 190 44"/>
    <path d="M132 115 L190 44 L226 115"/>
    <path d="M108 28 L128 28 M114 44 L108 28"/>
    <path d="M190 44 Q196 22 176 20 Q206 14 210 34"/>`,
  Touring: `
    <circle cx="55" cy="115" r="46"/><circle cx="225" cy="115" r="46"/>
    <path d="M55 115 L112 42 L190 42 L225 115"/>
    <path d="M55 115 L130 115 L112 42"/><path d="M130 115 L190 42"/>
    <path d="M106 26 L124 26 M112 42 L106 26"/>
    <path d="M190 42 L198 20 Q214 20 212 34"/>
    <path d="M206 66 L246 66 M226 66 L226 92"/>`,
  Scooter: `
    <circle cx="72" cy="140" r="26"/><circle cx="226" cy="140" r="26"/>
    <path d="M72 140 L210 140"/>
    <path d="M210 140 L210 46"/>
    <path d="M186 46 L234 46"/>
    <path d="M96 140 L186 140"/>`,
};

function bikeArt(palette, id, type) {
  const [c1, c2] = PALETTES[palette] || PALETTES.teal;
  const gid = "g" + String(id).replace(/[^a-z0-9]/gi, "") + palette;
  const frame = FRAMES[type] || FRAMES.Hybrid;
  const label = !type
    ? "Bicycle illustration"
    : type === "Scooter"
    ? "Scooter illustration"
    : `${type} bicycle illustration`;
  return `<svg viewBox="0 0 400 300" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#${gid})"/>
    <circle cx="330" cy="60" r="90" fill="#ffffff" opacity="0.06"/>
    <circle cx="40" cy="260" r="70" fill="#ffffff" opacity="0.05"/>
    <g transform="translate(58 68)" fill="none" stroke="#ffffff" stroke-width="7"
       stroke-linecap="round" stroke-linejoin="round" opacity="0.95">${frame}</g>
  </svg>`;
}

/* ---------------------------------------------------------------
   Photo drop-in.

   Drop a file into assets/photos/ and it replaces the illustration —
   no code change, no manifest to maintain:

     assets/photos/products/<product-id>.jpg   e.g. roux-hb10.jpg
     assets/photos/shop/<slot>.jpg             e.g. hero.jpg, workshop.jpg

   Each illustration is wrapped in a slot carrying the candidate paths.
   On load we try each; the first that decodes replaces the SVG. If none
   exist (the normal case today) the drawing simply stays, so the demo
   still works with an empty photos folder and no internet.
   --------------------------------------------------------------- */
/* photos.js is generated by serve.py at startup and declares PHOTO_MANIFEST.
   Reading it means we request only files that exist. The earlier version probed
   four extensions per image, which cost 48 failed requests per page — and made
   the "3 requests vs their 61" claim in the pitch untrue. */
function photoFor(folder, name) {
  try {
    return (PHOTO_MANIFEST[folder] || {})[name] || null;
  } catch (e) {
    return null; // photos.js absent (e.g. opened straight off disk)
  }
}

function photoSlot(svg, folder, name, alt) {
  const src = photoFor(folder, name);
  const attrs = src
    ? ` data-photo="${src}" data-alt="${String(alt).replace(/"/g, "&quot;")}"`
    : "";
  return `<span class="art-slot"${attrs}>${svg}</span>`;
}

function hydratePhotos(root = document) {
  root.querySelectorAll(".art-slot[data-photo]").forEach((slot) => {
    if (slot.dataset.done) return;
    slot.dataset.done = "1";
    const img = new Image();
    img.onload = () => {
      img.alt = slot.dataset.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      slot.innerHTML = "";
      slot.appendChild(img);
    };
    // A listed file that fails to load simply leaves the illustration in place.
    img.src = slot.dataset.photo;
  });
}

function sceneArt(palette, id, motif) {
  const [c1, c2, accent] = PALETTES[palette] || PALETTES.teal;
  const gid = "s" + id + palette;
  const motifs = {
    wrench: `<g transform="translate(150 90)" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round">
      <path d="M20 100 L80 40" /><circle cx="95" cy="25" r="22" /><circle cx="8" cy="112" r="22"/></g>`,
    tag: `<g transform="translate(140 80)" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 60 L60 10 L120 10 L120 70 L70 120 Z"/><circle cx="98" cy="32" r="9"/></g>`,
    leaf: `<g transform="translate(150 80)" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round">
      <path d="M50 130 C-10 70 30 0 110 5 C115 85 90 120 50 130 Z"/><path d="M50 130 C60 80 80 50 105 15"/></g>`,
    map: `<g transform="translate(140 80)" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M60 130 C10 85 5 45 30 22 C55 0 95 8 105 40 C112 65 90 100 60 130 Z"/><circle cx="62" cy="45" r="14"/></g>`,
    helmet: `<g transform="translate(135 85)" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round">
      <path d="M10 80 C10 30 55 5 85 5 C115 5 145 30 145 70 L140 90 L15 95 Z"/><path d="M45 12 L55 85 M85 6 L88 88 M118 18 L112 88"/></g>`,
  };
  return `<svg viewBox="0 0 400 300" role="img" aria-label="Illustration" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="400" height="300" fill="url(#${gid})"/>
    <circle cx="60" cy="50" r="80" fill="#ffffff" opacity="0.06"/>
    <circle cx="350" cy="250" r="100" fill="${accent}" opacity="0.18"/>
    ${motifs[motif] || motifs.wrench}
  </svg>`;
}

// ---------------------------------------------------------------
// Demo product catalogue (representative of real stock lines)
// ---------------------------------------------------------------
const PRODUCTS = [
  { id: "roux-hb10", brand: "Roux", name: "Roux HB 1.0 Hybrid", type: "Hybrid", condition: "New", price: 429, was: null, palette: "teal", desc: "The shop favourite — a do-everything hybrid that suits both gents and ladies. Light alloy frame, 21-speed Shimano drivetrain and an upright, comfortable ride for London streets.", specs: { Frame: "6061 alloy, step-through options", Gears: "Shimano Tourney 21-speed", Brakes: "Alloy V-brakes", Wheels: "700c double-wall", Sizes: "S / M / L" } },
  { id: "bikesport-tempo", brand: "BikeSport", name: "Tempo Race Bike", type: "Road", condition: "New", price: 339.99, was: 350, palette: "navy", desc: "An accessible drop-bar road bike with a fast, lively feel. Ideal first road bike for commuting and weekend rides.", specs: { Frame: "Alloy race geometry", Gears: "Shimano 14-speed", Brakes: "Dual-pivot calliper", Wheels: "700c", Sizes: "52 / 54 / 56cm" } },
  { id: "engwe-ep2", brand: "ENGWE", name: "EP-2 Pro Folding E-Bike", type: "Electric", condition: "New", price: 999, was: 1099, palette: "amber", desc: "A folding fat-tyre e-bike with 250W motor and removable battery — perfect for mixed commutes and small flats.", specs: { Motor: "250W rear hub", Battery: "13Ah removable", Range: "Up to 75km", Folded: "Yes — fits under a desk", Sizes: "One size" } },
  { id: "tern-link", brand: "Tern", name: "Link B7 Folding Bike", type: "Folding", condition: "New", price: 650, was: null, palette: "slate", desc: "The commuter's classic. Folds in ten seconds, rides like a full-size bike, and loves the train.", specs: { Frame: "Alloy folding", Gears: "Shimano 7-speed", Fold: "10 seconds", Weight: "12.6kg", Sizes: "One size" } },
  { id: "squish-24", brand: "Squish", name: "Squish 24 Kids Bike", type: "Kids", condition: "New", price: 399, was: null, palette: "green", desc: "Ultra-light kids bike that makes riding easy — just 9kg, with child-sized brake levers and grips.", specs: { Frame: "Lightweight alloy", Gears: "8-speed", Weight: "9.0kg", Age: "7–11 years", Wheel: "24 inch" } },
  { id: "pashley-britannia", brand: "Pashley", name: "Britannia Classic", type: "Classic", condition: "New", price: 745, was: null, palette: "rose", desc: "Hand-built in England. A timeless loop-frame classic with wicker basket mounts, hub gears and full chaincase.", specs: { Frame: "Hand-brazed steel", Gears: "Sturmey Archer 5-speed hub", Extras: "Basket mounts, chaincase", Colour: "Buckingham Black", Sizes: "17.5 / 20 in" } },
  { id: "used-spec-sirrus", brand: "Specialized", name: "Sirrus Hybrid (Used)", type: "Hybrid", condition: "Used", price: 265, was: null, palette: "teal", desc: "Fully workshop-refurbished Sirrus with new cables, tuned gears and fresh tyres. PNC-checked, 3-month warranty.", specs: { Condition: "Refurbished — very good", Gears: "Shimano 24-speed", Checked: "PNC / CheckMEND verified", Warranty: "3 months", Sizes: "M" } },
  { id: "used-dawes-galaxy", brand: "Dawes", name: "Galaxy Touring (Used)", type: "Touring", condition: "Used", price: 340, was: null, palette: "slate", desc: "A much-loved steel tourer, serviced and ready for adventures. Rack and mudguards included.", specs: { Condition: "Refurbished — good", Frame: "Reynolds steel", Extras: "Rack + mudguards", Checked: "PNC / CheckMEND verified", Sizes: "54cm" } },
  { id: "used-brompton", brand: "Brompton", name: "M3L Folding (Used)", type: "Folding", condition: "Used", price: 795, was: null, palette: "navy", desc: "The iconic London folder, fully serviced in our workshop with new tyres and gear service. PNC-checked.", specs: { Condition: "Refurbished — excellent", Gears: "3-speed hub", Fold: "Classic Brompton", Checked: "PNC / CheckMEND verified", Sizes: "One size" } },
  { id: "lectro-glide", brand: "Lectro", name: "Glide Step-Through E-Bike", type: "Electric", condition: "New", price: 899, was: 949, palette: "green", desc: "Easy-mount step-through e-bike with pedal assist up to 15.5mph — town riding without the sweat.", specs: { Motor: "250W front hub", Battery: "36V 8Ah", Range: "Up to 50km", Style: "Step-through", Sizes: "One size" } },
  { id: "falcon-explorer", brand: "Falcon", name: "Explorer Mountain Bike", type: "Mountain", condition: "New", price: 285, was: null, palette: "amber", desc: "Front-suspension hardtail with 18 speeds — a solid, honest mountain bike for park and towpath.", specs: { Frame: "Alloy hardtail", Gears: "18-speed", Fork: "Suspension 80mm", Wheels: "27.5 inch", Sizes: "M / L" } },
  { id: "viking-scooter", brand: "Viking", name: "City Glide Scooter", type: "Scooter", condition: "New", price: 129, was: 149, palette: "rose", desc: "Robust adult kick scooter with big wheels and quick-fold — great for short hops and the school run.", specs: { Wheels: "200mm PU", Fold: "Quick-fold", "Max load": "100kg", Brake: "Rear fender", Sizes: "Adjustable bar" } },
];

// ---------------------------------------------------------------
// Header / footer injection
// ---------------------------------------------------------------
const NAV_LINKS = [
  ["index.html", "Home"],
  ["bikes.html", "Bikes"],
  ["services.html", "Repairs & Servicing"],
  ["hire.html", "Bike Hire"],
  ["cash-for-bikes.html", "Cash for Bikes"],
  ["cycle-scheme.html", "Cycle to Work"],
  ["blog.html", "News"],
  ["contact.html", "Contact"],
];

const icon = {
  bike: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>',
  phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  cart: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  user: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  search: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
  menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  wa: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>',
  pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  wrench: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  pound: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7c0-5.333-8-5.333-8 0v7a4 4 0 0 1-1 3h9M6 14h8"/></svg>',
};

function buildHeader() {
  const path = location.pathname.split("/").pop() || "index.html";
  const nav = NAV_LINKS.map(([href, label]) =>
    `<a href="${href}" class="${href === path ? "is-active" : ""}">${label}</a>`).join("");
  const status = shopStatus();
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="util-bar">
    <div class="container">
      <span class="util-hours"><span class="util-dot${status.open ? "" : " is-shut"}"></span><strong>${status.label}</strong> · ${SHOP.address}</span>
      <span class="util-extra">Call <a href="${SHOP.phoneHref}">${SHOP.phone}</a> · WhatsApp <a href="${SHOP.whatsappHref}">${SHOP.whatsapp}</a></span>
    </div>
  </div>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="index.html" aria-label="Chelsea Bikes home">
        <span class="brand-mark">${icon.bike}</span>
        <span class="brand-name">Chelsea Bikes<small>Kings Road · Since 2011</small></span>
      </a>
      <nav class="main-nav" aria-label="Primary">${nav}</nav>
      <div class="header-actions">
        <button class="icon-btn" aria-label="Search the shop" data-open-search>${icon.search}</button>
        <button class="icon-btn" aria-label="Account" title="Account (demo)">${icon.user}</button>
        <button class="icon-btn" aria-label="Open basket" data-open-basket>${icon.cart}<span class="cart-count" id="cartCount">0</span></button>
        <button class="icon-btn nav-toggle" aria-label="Menu" aria-expanded="false" id="navToggle">${icon.menu}</button>
      </div>
    </div>
    <nav class="mobile-nav" id="mobileNav" aria-label="Mobile">${nav}</nav>
  </header>`;
}

// Basket drawer, search overlay and cookie banner — injected once per page.
function buildOverlays() {
  return `
  <div class="scrim" id="drawerScrim"></div>

  <aside class="drawer" id="basketDrawer" aria-hidden="true" aria-label="Basket">
    <div class="drawer-head">
      <h2>Your basket</h2>
      <button class="drawer-close" aria-label="Close basket">&times;</button>
    </div>
    <div class="drawer-body" id="drawerBody"></div>
    <div class="drawer-foot" id="drawerFoot">
      <div class="drawer-total"><span>Subtotal</span><strong id="drawerTotal">£0</strong></div>
      <p class="drawer-note">Reserve online and collect at 427 Kings Road — we'll size and set the bike up before you ride away.</p>
      <a class="btn btn-primary btn-block" href="basket.html">View basket &amp; checkout</a>
    </div>
  </aside>

  <div class="search-overlay" id="searchOverlay" aria-hidden="true">
    <div class="search-panel" role="dialog" aria-label="Search the shop">
      <div class="search-row">
        <input type="search" id="searchInput" placeholder="Search bikes, brands, types…" aria-label="Search">
        <button class="btn btn-outline btn-sm" id="searchClose">Close</button>
      </div>
      <div class="search-results" id="searchResults"></div>
    </div>
  </div>

  <div class="cookie-bar" id="cookieBar" role="region" aria-label="Cookie choices">
    <div>
      <strong>Cookies</strong>
      <p>We use only the cookies this site needs to work, plus anything you agree to. You can change your mind any time.</p>
    </div>
    <div class="cookie-actions">
      <button class="btn btn-outline btn-sm" data-cookie="essential">Essential only</button>
      <button class="btn btn-primary btn-sm" data-cookie="all">Accept all</button>
    </div>
  </div>`;
}

function buildFooter() {
  return `
  <footer class="site-footer">
    <div class="container footer-main">
      <div class="footer-brand">
        <h2>Chelsea Bikes</h2>
        <p>Independent bike shop on the Kings Road since 2011. New &amp; refurbished bikes, expert same-day repairs, hire and cash for bikes — open 7 days a week.</p>
        <div class="social-row" aria-label="Social media">
          <a href="#" aria-label="Instagram"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
          <a href="#" aria-label="Facebook"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
          <a href="#" aria-label="TikTok"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg></a>
          <a href="#" aria-label="YouTube"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg></a>
        </div>
      </div>
      <div>
        <h2>Shop</h2>
        <ul>
          <li><a href="bikes.html">New bikes</a></li>
          <li><a href="bikes.html?cond=Used">Used bikes</a></li>
          <li><a href="bikes.html?type=Electric">Electric bikes</a></li>
          <li><a href="bikes.html?type=Scooter">Scooters</a></li>
          <li><a href="bikes.html">Parts &amp; accessories</a></li>
          <li><a href="info.html?page=gift-vouchers">Gift vouchers</a></li>
        </ul>
      </div>
      <div>
        <h2>Services</h2>
        <ul>
          <li><a href="services.html">Repairs &amp; servicing</a></li>
          <li><a href="hire.html">Bike hire</a></li>
          <li><a href="cash-for-bikes.html">Cash for bikes</a></li>
          <li><a href="cycle-scheme.html">Cycle to Work</a></li>
          <li><a href="services.html#workplace">Workplace repair days</a></li>
          <li><a href="info.html?page=lock-cutting">Lock cutting service</a></li>
        </ul>
      </div>
      <div>
        <h2>Visit us</h2>
        <ul>
          <li>${SHOP.address}</li>
          <li><a href="${SHOP.phoneHref}">${SHOP.phone}</a></li>
          <li><a href="mailto:${SHOP.email}">${SHOP.email}</a></li>
          <li>Mon–Fri 9–7 · Sat 9–6:30 · Sun 11–5</li>
          <li><a href="about.html">About us</a> · <a href="contact.html">Contact</a> · <a href="reviews.html">Reviews</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
        <span>© ${new Date().getFullYear()} Chelsea Bikes. Redesign concept prototype.</span>
        <span><a href="info.html?page=delivery">Delivery</a> · <a href="info.html?page=returns">Returns</a> · <a href="info.html?page=terms">Terms</a> · <a href="info.html?page=privacy">Privacy</a> · <a href="info.html?page=sitemap">Sitemap</a></span>
      </div>
    </div>
  </footer>
  <a class="wa-fab" href="${SHOP.whatsappHref}" aria-label="Chat on WhatsApp">${icon.wa}<span>WhatsApp us</span></a>`;
}

// ---------------------------------------------------------------
// Product rendering helpers
// ---------------------------------------------------------------
function money(n) {
  return "£" + (Number.isInteger(n) ? n.toLocaleString("en-GB") : n.toFixed(2));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function productCard(p) {
  const badge = p.was ? '<span class="badge badge-sale">Offer</span>'
    : p.condition === "Used" ? '<span class="badge badge-used">Refurbished</span>'
    : '<span class="badge badge-new">New</span>';
  return `<article class="card product-card">
    <a href="product.html?id=${p.id}" class="product-media" aria-label="${p.name}">
      ${photoSlot(bikeArt(p.palette, p.id, p.type), "products", p.id, p.name)}${badge}
    </a>
    <div class="product-body">
      <span class="product-brand">${p.brand} · ${p.type}</span>
      <a class="product-name" href="product.html?id=${p.id}">${p.name}</a>
      <div class="product-price">
        <span class="price-now">${money(p.price)}</span>
        ${p.was ? `<span class="price-was">${money(p.was)}</span>` : ""}
      </div>
    </div>
  </article>`;
}

function renderProducts(el, list) {
  el.innerHTML = list.map(productCard).join("");
  hydratePhotos(el);
}

// ---------------------------------------------------------------
// Basket — persisted in localStorage so it survives navigation.
// Demo only: no payment is taken anywhere in this prototype.
// ---------------------------------------------------------------
const BASKET_KEY = "cb_basket";

function basketLoad() {
  try {
    return JSON.parse(localStorage.getItem(BASKET_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function basketSave(b) {
  try {
    localStorage.setItem(BASKET_KEY, JSON.stringify(b));
  } catch (e) {
    /* private browsing — basket just won't persist */
  }
  basketRender();
}
function basketAdd(id, qty = 1) {
  const b = basketLoad();
  b[id] = (b[id] || 0) + qty;
  basketSave(b);
}
function basketSet(id, qty) {
  const b = basketLoad();
  if (qty <= 0) delete b[id];
  else b[id] = qty;
  basketSave(b);
}
function basketCount() {
  return Object.values(basketLoad()).reduce((a, n) => a + n, 0);
}
function basketLines() {
  const b = basketLoad();
  return Object.keys(b)
    .map((id) => ({ product: PRODUCTS.find((p) => p.id === id), qty: b[id] }))
    .filter((l) => l.product);
}
function basketTotal() {
  return basketLines().reduce((sum, l) => sum + l.product.price * l.qty, 0);
}

function basketRender() {
  const n = basketCount();
  document.querySelectorAll("#cartCount").forEach((el) => {
    el.textContent = n;
    el.style.display = n ? "grid" : "none";
  });

  const body = document.getElementById("drawerBody");
  if (body) {
    const lines = basketLines();
    body.innerHTML = lines.length
      ? lines
          .map(
            (l) => `<div class="dl" data-line="${l.product.id}">
        <div class="dl-art">${photoSlot(bikeArt(l.product.palette, "dl" + l.product.id, l.product.type), "products", l.product.id, l.product.name)}</div>
        <div class="dl-info">
          <strong>${l.product.name}</strong>
          <span>${l.product.brand} · ${money(l.product.price)}</span>
          <div class="qty">
            <button class="qty-btn" data-qty="-1" aria-label="Reduce quantity">−</button>
            <span class="qty-n">${l.qty}</span>
            <button class="qty-btn" data-qty="1" aria-label="Increase quantity">+</button>
            <button class="dl-remove" data-remove aria-label="Remove ${l.product.name}">Remove</button>
          </div>
        </div>
        <div class="dl-price">${money(l.product.price * l.qty)}</div>
      </div>`
          )
          .join("")
      : `<div class="drawer-empty">
           <p>Your basket is empty.</p>
           <a class="btn btn-primary" href="bikes.html" data-close-drawer>Browse bikes</a>
         </div>`;
    hydratePhotos(body);
    const foot = document.getElementById("drawerFoot");
    if (foot) foot.style.display = lines.length ? "block" : "none";
    const tot = document.getElementById("drawerTotal");
    if (tot) tot.textContent = money(basketTotal());
  }

  // Full basket page, if we're on it
  const page = document.getElementById("basketPage");
  if (page) renderBasketPage(page);
}

function openDrawer(open) {
  const d = document.getElementById("basketDrawer");
  const s = document.getElementById("drawerScrim");
  if (!d) return;
  d.classList.toggle("open", open);
  s.classList.toggle("show", open);
  d.setAttribute("aria-hidden", String(!open));
  if (open) d.querySelector(".drawer-close")?.focus();
}

// ---------------------------------------------------------------
// Structured data — lets Google show hours, services and prices
// directly in local search results. Injected on every page.
// ---------------------------------------------------------------
function injectStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "BicycleStore",
    name: "Chelsea Bikes",
    description:
      "Independent bicycle shop on the Kings Road since 2011. New and refurbished bikes, expert repairs and servicing, bike hire and cash for bikes.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "427 Kings Road",
      addressLocality: "Chelsea, London",
      postalCode: "SW10 0LR",
      addressCountry: "GB",
    },
    telephone: "+44-20-7376-3700",
    email: SHOP.email,
    url: "https://chelseabikes.co.uk/",
    priceRange: "££",
    currenciesAccepted: "GBP",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "19:00",
      },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "18:30" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "11:00", closes: "17:00" },
    ],
    makesOffer: [
      ["Standard Service", 45, "32-point safety check, brakes and gears tuned, chain and cables lubricated."],
      ["General Service", 65, "Standard service plus brake blocks, pads and cables replaced where needed."],
      ["Full Service", 90, "Bottom bracket, headset and hubs stripped, cleaned and rebuilt; fresh cables."],
      ["Kids / BMX Service", 40, "Full safety service for children's and 24-inch bikes."],
    ].map(([n, p, d]) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: n, description: d },
      price: String(p),
      priceCurrency: "GBP",
    })),
  };

  const el = document.createElement("script");
  el.type = "application/ld+json";
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);

  // Product pages additionally describe the specific bike.
  const id = new URLSearchParams(location.search).get("id");
  const p = id && PRODUCTS.find((x) => x.id === id);
  if (p) {
    const prod = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      brand: { "@type": "Brand", name: p.brand },
      category: p.type,
      itemCondition:
        p.condition === "Used"
          ? "https://schema.org/RefurbishedCondition"
          : "https://schema.org/NewCondition",
      description: p.desc,
      offers: {
        "@type": "Offer",
        price: String(p.price),
        priceCurrency: "GBP",
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: "Chelsea Bikes" },
      },
    };
    const el2 = document.createElement("script");
    el2.type = "application/ld+json";
    el2.textContent = JSON.stringify(prod);
    document.head.appendChild(el2);
  }
}

// ---------------------------------------------------------------
// Search over the catalogue
// ---------------------------------------------------------------
function toggleSearch(open) {
  const o = document.getElementById("searchOverlay");
  if (!o) return;
  o.classList.toggle("show", open);
  o.setAttribute("aria-hidden", String(!open));
  if (open) {
    const i = document.getElementById("searchInput");
    i.value = "";
    runSearch("");
    setTimeout(() => i.focus(), 30);
  }
}

function runSearch(q) {
  const out = document.getElementById("searchResults");
  if (!out) return;
  const term = q.trim().toLowerCase();

  if (!term) {
    out.innerHTML = `<p class="search-hint">Try “electric”, “Brompton”, “kids” or “folding”.</p>`;
    return;
  }
  const hits = PRODUCTS.filter((p) =>
    [p.name, p.brand, p.type, p.condition].join(" ").toLowerCase().includes(term)
  );
  out.innerHTML = hits.length
    ? hits
        .map(
          (p) => `<a class="sr" href="product.html?id=${p.id}">
            <span class="sr-art">${photoSlot(bikeArt(p.palette, "sr" + p.id, p.type), "products", p.id, p.name)}</span>
            <span class="sr-txt"><strong>${p.name}</strong><small>${p.brand} · ${p.type} · ${p.condition}</small></span>
            <span class="sr-price">${money(p.price)}</span>
          </a>`
        )
        .join("")
    : `<p class="search-hint">Nothing matched “${escapeHtml(q)}”. Stock changes daily — call
       <a href="${SHOP.phoneHref}">${SHOP.phone}</a> and we'll check the shop floor.</p>`;
  hydratePhotos(out);
}

// ---------------------------------------------------------------
// Full basket page
// ---------------------------------------------------------------
function renderBasketPage(page) {
  const lines = basketLines();
  if (!lines.length) {
    page.innerHTML = `<div class="card" style="padding:3rem;text-align:center;">
      <h2>Your basket is empty</h2>
      <p class="lede">Nothing reserved yet.</p>
      <a class="btn btn-primary btn-lg" href="bikes.html">Browse bikes</a>
    </div>`;
    return;
  }
  page.innerHTML = `
    <div class="basket-grid">
      <div>
        ${lines
          .map(
            (l) => `<div class="card basket-row" data-line="${l.product.id}">
          <div class="br-art">${photoSlot(bikeArt(l.product.palette, "br" + l.product.id, l.product.type), "products", l.product.id, l.product.name)}</div>
          <div class="br-info">
            <a class="product-name" href="product.html?id=${l.product.id}">${l.product.name}</a>
            <span class="product-brand">${l.product.brand} · ${l.product.type} · ${l.product.condition}</span>
            <div class="qty">
              <button class="qty-btn" data-qty="-1" aria-label="Reduce quantity">−</button>
              <span class="qty-n">${l.qty}</span>
              <button class="qty-btn" data-qty="1" aria-label="Increase quantity">+</button>
              <button class="dl-remove" data-remove>Remove</button>
            </div>
          </div>
          <div class="br-price">${money(l.product.price * l.qty)}</div>
        </div>`
          )
          .join("")}
      </div>
      <aside class="card" style="padding:1.5rem;position:sticky;top:96px;">
        <h2 style="font-size:1.2rem;">Summary</h2>
        <div class="pd-meta" style="border-top:none;">
          <li style="display:flex;justify-content:space-between;padding:.5em 0;"><span>Items</span><span>${basketCount()}</span></li>
          <li style="display:flex;justify-content:space-between;padding:.5em 0;border-top:1px solid var(--line);"><span><strong>Subtotal</strong></span><span><strong>${money(basketTotal())}</strong></span></li>
        </div>
        <p style="font-size:.85rem;color:var(--ink-soft);">Collection from 427 Kings Road is free, and we set the bike up properly before you ride away. Delivery is costed at checkout.</p>
        <button class="btn btn-primary btn-block btn-lg" id="checkoutBtn">Checkout</button>
        <p style="font-size:.78rem;color:var(--ink-faint);margin-top:.8rem;margin-bottom:0;">
          Prototype demo — no payment is taken and no card details are collected.
        </p>
      </aside>
    </div>`;

  hydratePhotos(page);

  document.getElementById("checkoutBtn")?.addEventListener("click", function () {
    this.textContent = "Demo only — no payment taken";
    this.disabled = true;
    setTimeout(() => { this.textContent = "Checkout"; this.disabled = false; }, 2200);
  });
}

// ---------------------------------------------------------------
// Favicon + social sharing preview
// ---------------------------------------------------------------
function injectBranding() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="14" fill="#0e7c86"/>' +
    '<g fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="20" cy="42" r="11"/><circle cx="44" cy="42" r="11"/>' +
    '<path d="M20 42 L30 24 L42 24 L44 42"/><path d="M20 42 L33 42 L30 24"/>' +
    "</g></svg>";
  const href = "data:image/svg+xml," + encodeURIComponent(svg);

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = href;
  document.head.appendChild(link);

  const title = document.title;
  const desc =
    document.querySelector('meta[name="description"]')?.content ||
    "Independent bike shop on the Kings Road since 2011 — new and refurbished bikes, expert repairs, hire and cash for bikes.";
  [
    ["og:title", title],
    ["og:description", desc],
    ["og:type", "website"],
    ["og:site_name", "Chelsea Bikes"],
    ["og:locale", "en_GB"],
    ["twitter:card", "summary_large_image"],
    ["twitter:title", title],
    ["twitter:description", desc],
  ].forEach(([k, v]) => {
    const m = document.createElement("meta");
    m.setAttribute(k.startsWith("og:") ? "property" : "name", k);
    m.content = v;
    document.head.appendChild(m);
  });
}

// ---------------------------------------------------------------
// Page boot
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  injectStructuredData();
  injectBranding();
  setTimeout(() => hydratePhotos(), 0);
  document.getElementById("app-header").innerHTML = buildHeader();
  document.getElementById("app-footer").innerHTML = buildFooter() + buildOverlays();

  // Mobile nav
  const toggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");
  toggle?.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Featured products on home
  const featuredEl = document.getElementById("featuredProducts");
  if (featuredEl) {
    renderProducts(featuredEl, PRODUCTS.filter(p => ["roux-hb10", "engwe-ep2", "used-brompton", "bikesport-tempo"].includes(p.id)));
  }
  const offersEl = document.getElementById("offerProducts");
  if (offersEl) renderProducts(offersEl, PRODUCTS.filter(p => p.was).slice(0, 4));

  // Bikes listing page with filters
  const listEl = document.getElementById("productList");
  if (listEl) {
    const params = new URLSearchParams(location.search);
    const state = { cond: params.get("cond") || "All", type: params.get("type") || "All" };
    const conds = ["All", "New", "Used"];
    const types = ["All", ...new Set(PRODUCTS.map(p => p.type))];

    const condBar = document.getElementById("condFilters");
    const typeBar = document.getElementById("typeFilters");
    const countEl = document.getElementById("filterCount");

    function apply() {
      const out = PRODUCTS.filter(p =>
        (state.cond === "All" || p.condition === state.cond) &&
        (state.type === "All" || p.type === state.type));
      renderProducts(listEl, out);
      countEl.textContent = out.length + (out.length === 1 ? " bike" : " bikes");
      condBar.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === state.cond));
      typeBar.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === state.type));
    }
    condBar.innerHTML = conds.map(v => `<button class="chip" data-v="${v}">${v === "All" ? "New & used" : v}</button>`).join("");
    typeBar.innerHTML = types.map(v => `<button class="chip" data-v="${v}">${v}</button>`).join("");
    condBar.addEventListener("click", e => { if (e.target.dataset.v) { state.cond = e.target.dataset.v; apply(); } });
    typeBar.addEventListener("click", e => { if (e.target.dataset.v) { state.type = e.target.dataset.v; apply(); } });
    apply();
  }

  // Product detail page
  const pdEl = document.getElementById("productDetail");
  if (pdEl) {
    const id = new URLSearchParams(location.search).get("id");
    const p = PRODUCTS.find(x => x.id === id);

    // An unknown id used to silently render a different bike — the same
    // "dead link shows the wrong thing" fault we're citing on their site.
    if (!p) {
      document.title = "Bike not found — Chelsea Bikes";
      pdEl.innerHTML = `
        <div class="card" style="padding:3rem;text-align:center;max-width:620px;margin:0 auto;">
          <span class="kicker">Not found</span>
          <h1>That bike has gone</h1>
          <p class="lede">It may have sold — used stock moves quickly, and we only ever have one
          of most things. Have a look at what's in now, or call and we'll check the shop floor.</p>
          <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem;">
            <a class="btn btn-primary btn-lg" href="bikes.html">Browse bikes</a>
            <a class="btn btn-outline btn-lg" href="${SHOP.phoneHref}">Call ${SHOP.phone}</a>
          </div>
        </div>`;
    } else {
    document.title = p.name + " — Chelsea Bikes";
    pdEl.innerHTML = `
      <div class="pd-grid">
        <div class="pd-media">${photoSlot(bikeArt(p.palette, "pd" + p.id, p.type), "products", p.id, p.name)}</div>
        <div>
          <span class="kicker">${p.brand} · ${p.condition === "Used" ? "Workshop refurbished" : "Brand new"}</span>
          <h1>${p.name}</h1>
          <p class="lede">${p.desc}</p>
          <div class="pd-price">${money(p.price)} ${p.was ? `<span class="price-was" style="font-size:1.1rem;">${money(p.was)}</span>` : ""}</div>
          <ul class="pd-meta">
            ${Object.entries(p.specs).map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join("")}
          </ul>
          <div class="pd-actions">
            <button class="btn btn-primary btn-lg" data-add-cart>Add to basket</button>
            <a class="btn btn-outline btn-lg" href="contact.html">Ask about this bike</a>
          </div>
          <p class="hint" style="margin-top:1rem;font-size:0.85rem;color:var(--ink-faint);">
            Free in-store collection · Test rides welcome at 427 Kings Road · Used bikes are PNC-checked with 3-month warranty.
          </p>
        </div>
      </div>
      <section class="section-tight" style="margin-top:3.5rem;">
        <h2 style="font-size:1.4rem;">You might also like</h2>
        <div class="grid grid-4" id="pdRelated"></div>
      </section>`;
    renderProducts(document.getElementById("pdRelated"),
      PRODUCTS.filter(x => x.id !== p.id && x.type === p.type).concat(PRODUCTS.filter(x => x.id !== p.id)).slice(0, 4));
    }
  }

  // ---- Basket -------------------------------------------------
  basketRender();

  document.body.addEventListener("click", (e) => {
    // Add to basket
    const add = e.target.closest("[data-add-cart]");
    if (add) {
      const id = add.dataset.addCart || new URLSearchParams(location.search).get("id");
      if (id) {
        basketAdd(id);
        const label = add.textContent;
        add.textContent = "Added ✓";
        setTimeout(() => (add.textContent = label), 1400);
        openDrawer(true);
      }
      return;
    }
    // Open the drawer from the header basket button
    if (e.target.closest("[data-open-basket]")) { openDrawer(true); return; }
    if (e.target.closest(".drawer-close") || e.target.closest("[data-close-drawer]") ||
        e.target.id === "drawerScrim") { openDrawer(false); return; }

    // Quantity controls (drawer and basket page share these hooks)
    const q = e.target.closest("[data-qty]");
    if (q) {
      const id = q.closest("[data-line]").dataset.line;
      basketSet(id, (basketLoad()[id] || 0) + Number(q.dataset.qty));
      return;
    }
    const rm = e.target.closest("[data-remove]");
    if (rm) { basketSet(rm.closest("[data-line]").dataset.line, 0); return; }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { openDrawer(false); toggleSearch(false); }
  });

  // ---- Search -------------------------------------------------
  document.querySelectorAll("[data-open-search]").forEach((b) =>
    b.addEventListener("click", () => toggleSearch(true))
  );
  document.getElementById("searchClose")?.addEventListener("click", () => toggleSearch(false));
  document.getElementById("searchOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "searchOverlay") toggleSearch(false);
  });
  document.getElementById("searchInput")?.addEventListener("input", (e) => runSearch(e.target.value));

  // ---- Cookie banner ------------------------------------------
  const bar = document.getElementById("cookieBar");
  let choice = null;
  try { choice = localStorage.getItem("cb_cookies"); } catch (e) { /* ignore */ }
  if (bar && !choice) {
    setTimeout(() => {
      bar.classList.add("show");
      document.body.classList.add("cookie-open");
    }, 700);
  }
  bar?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cookie]");
    if (!btn) return;
    try { localStorage.setItem("cb_cookies", btn.dataset.cookie); } catch (e) { /* ignore */ }
    bar.classList.remove("show");
    document.body.classList.remove("cookie-open");
  });

  // Date pickers shouldn't offer yesterday — you can't book a service in the past.
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((d) => {
    if (!d.getAttribute("min")) d.setAttribute("min", iso);
  });

  // Multi-step forms (services booking, cash-for-bikes valuation, hire enquiry)
  document.querySelectorAll("[data-multistep]").forEach(form => {
    const steps = [...form.querySelectorAll(".form-step")];
    const bar = form.querySelector(".form-steps-bar");
    bar.innerHTML = steps.map(() => "<span></span>").join("");
    const dots = [...bar.children];
    let i = 0;
    function show(n) {
      i = n;
      steps.forEach((s, k) => s.classList.toggle("active", k === i));
      dots.forEach((d, k) => d.classList.toggle("done", k <= i));
      form.querySelector("[data-prev]").style.visibility = i === 0 ? "hidden" : "visible";
      form.querySelector("[data-next]").textContent = i === steps.length - 1 ? form.dataset.submitLabel || "Submit request" : "Continue";
    }
    form.querySelector("[data-prev]").addEventListener("click", e => { e.preventDefault(); if (i > 0) show(i - 1); });
    form.querySelector("[data-next]").addEventListener("click", e => {
      e.preventDefault();
      // validate visible required fields
      const invalid = [...steps[i].querySelectorAll("[required]")].find(f => !f.reportValidity());
      if (invalid) return;
      if (i < steps.length - 1) show(i + 1);
      else {
        form.querySelector(".form-steps-wrap").style.display = "none";
        form.querySelector(".form-success").classList.add("show");
      }
    });
    show(0);
  });
});
