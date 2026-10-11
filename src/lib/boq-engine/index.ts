// src/lib/boq-engine/index.ts
// Deterministic BOQ rule engine — pure TS, no AI, no network.
// Produces a full list of construction line items based on inputs.

export type FinishingTier = "economy" | "standard" | "premium" | "luxury";

export interface BOQInput {
  projectName: string;
  projectType: string; // villa|apartment|commercial|warehouse|renovation|landscape|other
  city: string;
  areaSqm: number;
  floors: number;
  finishingTier?: FinishingTier;
  hasBasement?: boolean;
  ceilingHeightM?: number;
  rooms?: number;
  features?: {
    ac?: boolean;
    elevator?: boolean;
    pool?: boolean;
    solar?: boolean;
    smartHome?: boolean;
    landscaping?: boolean;
    externalCladding?: boolean;
    woodenInterior?: boolean;
  };
}

export interface BOQLine {
  id: string; // stable per line
  category: string;
  categoryAr: string;
  item: string; // human-readable item name
  itemAr: string;
  searchKeyword: string; // used by the catalog matcher
  unit: string;
  quantity: number; // already includes wastage
  wastagePct: number;
}

const TIER_MULT: Record<FinishingTier, number> = {
  economy: 0.85,
  standard: 1,
  premium: 1.25,
  luxury: 1.6,
};

const TYPE_MULT: Record<string, number> = {
  villa: 1,
  apartment: 0.9,
  commercial: 1.1,
  warehouse: 0.6,
  renovation: 0.55,
  landscape: 0.3,
  other: 1,
};

const round = (n: number, step = 1) => Math.max(step, Math.round(n / step) * step);

const line = (
  id: string,
  category: [string, string],
  item: [string, string],
  keyword: string,
  unit: string,
  quantity: number,
  wastagePct = 0,
): BOQLine => ({
  id,
  category: category[0],
  categoryAr: category[1],
  item: item[0],
  itemAr: item[1],
  searchKeyword: keyword,
  unit,
  quantity: Math.max(1, Math.round(quantity * (1 + wastagePct / 100))),
  wastagePct,
});

/** Sanity ceilings — beyond this a project is an industrial tender, not a cart. */
export const MAX_AREA_SQM = 100_000;
export const MAX_FLOORS = 50;

export function buildBOQ(input: BOQInput): BOQLine[] {
  const area = Math.min(MAX_AREA_SQM, Math.max(1, Number(input.areaSqm) || 0));
  const floors = Math.min(MAX_FLOORS, Math.max(1, Number(input.floors) || 1));
  const tier: FinishingTier = input.finishingTier || "standard";
  const tierMult = TIER_MULT[tier];
  const typeMult = TYPE_MULT[input.projectType] ?? 1;
  const totalArea = area * floors;
  const perimeter = Math.sqrt(area) * 4; // rough perimeter per floor
  const rooms = Math.min(500, input.rooms || Math.max(3, Math.round(area / 40)));
  const feat = input.features || {};


  const lines: BOQLine[] = [];

  // ── Structural ──
  lines.push(
    line("cement", ["Structural", "الإنشائي"], ["Portland Cement (50kg bag)", "أسمنت بورتلاندي (كيس 50 كجم)"], "portland cement 50kg", "bag", totalArea * 0.9 * typeMult, 5),
    line("steel", ["Structural", "الإنشائي"], ["Steel Rebar (12mm)", "حديد تسليح 12 ملم"], "steel rebar 12mm", "ton", totalArea * 0.06 * typeMult, 3),
    line("sand", ["Structural", "الإنشائي"], ["Construction Sand", "رمل بناء"], "construction sand", "m3", totalArea * 0.35 * typeMult, 5),
    line("gravel", ["Structural", "الإنشائي"], ["Aggregate / Gravel", "حصى"], "aggregate gravel", "m3", totalArea * 0.4 * typeMult, 5),
    line("blocks", ["Structural", "الإنشائي"], ["Concrete Blocks", "بلوك خرساني"], "concrete block", "pcs", totalArea * 12 * typeMult, 5),
    line("readymix", ["Structural", "الإنشائي"], ["Ready-Mix Concrete", "خرسانة جاهزة"], "ready mix concrete", "m3", totalArea * 0.2 * typeMult, 3),
  );
  if (input.hasBasement) {
    lines.push(line("waterproof-basement", ["Structural", "الإنشائي"], ["Basement Waterproofing Membrane", "عزل مائي للقبو"], "waterproofing membrane bitumen", "roll", (area * 1.1) / 10, 8));
  }

  // ── MEP: Electrical ──
  lines.push(
    line("wiring", ["Electrical", "الكهرباء"], ["Electrical Wiring (2.5mm²)", "أسلاك كهربائية 2.5 ملم"], "electrical wire 2.5mm", "roll", totalArea * 0.08, 5),
    line("conduit", ["Electrical", "الكهرباء"], ["PVC Conduit Pipe", "أنبوب PVC كهرباء"], "pvc conduit pipe electrical", "m", totalArea * 3, 5),
    line("breakers", ["Electrical", "الكهرباء"], ["Circuit Breaker", "قاطع كهربائي"], "circuit breaker mcb", "pcs", Math.max(8, rooms * 2), 0),
    line("sockets", ["Electrical", "الكهرباء"], ["Wall Socket", "مفتاح كهرباء"], "wall socket switch", "pcs", rooms * 6, 5),
    line("db", ["Electrical", "الكهرباء"], ["Distribution Board", "لوحة توزيع كهرباء"], "distribution board electrical panel", "pcs", floors, 0),
  );

  // ── MEP: Plumbing ──
  lines.push(
    line("pipes", ["Plumbing", "السباكة"], ["PPR Water Pipes", "أنابيب مياه PPR"], "ppr water pipe", "m", totalArea * 1.2, 5),
    line("drainage", ["Plumbing", "السباكة"], ["PVC Drainage Pipes", "أنابيب صرف PVC"], "pvc drainage pipe", "m", totalArea * 0.9, 5),
    line("fittings", ["Plumbing", "السباكة"], ["Pipe Fittings & Valves", "وصلات ومحابس"], "pipe fittings valves", "pcs", rooms * 8, 5),
    line("tank", ["Plumbing", "السباكة"], ["Water Tank", "خزان مياه"], "water tank plastic", "pcs", Math.max(1, Math.ceil(totalArea / 250)), 0),
  );

  // ── Finishing ──
  lines.push(
    line("floor-tiles", ["Finishing", "التشطيب"], ["Floor Tiles (60x60cm)", "بلاط أرضيات 60x60"], "porcelain floor tile 60x60", "m2", totalArea * 0.95 * tierMult, 10),
    line("wall-tiles", ["Finishing", "التشطيب"], ["Wall Tiles", "بلاط جدران"], "ceramic wall tile", "m2", (rooms * 12) * tierMult, 10),
    line("paint", ["Finishing", "التشطيب"], ["Interior Wall Paint", "دهان جدران داخلي"], "interior wall paint emulsion", "gallon", totalArea * 0.09 * tierMult, 5),
    line("paint-ext", ["Finishing", "التشطيب"], ["Exterior Paint", "دهان خارجي"], "exterior paint weatherproof", "gallon", perimeter * (input.ceilingHeightM || 3) * 0.08 * tierMult, 5),
    line("gypsum", ["Finishing", "التشطيب"], ["Gypsum Board Ceiling", "أسقف جبس"], "gypsum board ceiling", "m2", totalArea * 0.7 * tierMult, 5),
    line("doors", ["Finishing", "التشطيب"], ["Interior Doors", "أبواب داخلية"], "wooden interior door", "pcs", rooms + 2, 0),
    line("windows", ["Finishing", "التشطيب"], ["Aluminum Windows", "نوافذ ألمنيوم"], "aluminum window double glazed", "pcs", Math.max(4, rooms * 2), 0),
    line("main-door", ["Finishing", "التشطيب"], ["Main Entrance Door", "باب رئيسي"], "steel main entrance door", "pcs", 1, 0),
  );

  // ── Sanitary ──
  const bathrooms = Math.max(1, Math.ceil(rooms / 2));
  lines.push(
    line("toilet", ["Sanitary", "الأدوات الصحية"], ["Toilet (WC)", "مرحاض"], "toilet wc ceramic", "pcs", bathrooms, 0),
    line("basin", ["Sanitary", "الأدوات الصحية"], ["Wash Basin", "مغسلة"], "wash basin ceramic bathroom", "pcs", bathrooms, 0),
    line("shower", ["Sanitary", "الأدوات الصحية"], ["Shower Set / Mixer", "خلاط دش"], "shower mixer set", "pcs", bathrooms, 0),
    line("kitchen-sink", ["Sanitary", "الأدوات الصحية"], ["Kitchen Sink", "حوض مطبخ"], "kitchen sink stainless steel", "pcs", 1, 0),
    line("mirror", ["Sanitary", "الأدوات الصحية"], ["Bathroom Mirror", "مرآة حمام"], "bathroom mirror", "pcs", bathrooms, 0),
  );

  // ── Optional features ──
  if (feat.ac) {
    const tons = Math.ceil(totalArea / 40);
    lines.push(line("ac", ["HVAC", "التكييف"], [`Split AC Unit (${Math.min(3, Math.max(1, Math.ceil(area / 20)))} ton)`, "مكيف سبليت"], "split air conditioner ac unit", "pcs", tons, 0));
  }
  if (feat.elevator) {
    lines.push(line("elevator", ["Elevator", "المصعد"], ["Elevator Kit", "مصعد كامل"], "elevator lift residential", "pcs", 1, 0));
  }
  if (feat.pool) {
    lines.push(
      line("pool-tile", ["Pool", "المسبح"], ["Pool Tiles", "بلاط مسبح"], "swimming pool tile", "m2", 40 * tierMult, 8),
      line("pool-waterproof", ["Pool", "المسبح"], ["Pool Waterproofing", "عزل مسبح"], "swimming pool waterproofing", "m2", 50, 5),
      line("pool-pump", ["Pool", "المسبح"], ["Pool Pump & Filter", "مضخة وفلتر مسبح"], "swimming pool pump filter", "pcs", 1, 0),
    );
  }
  if (feat.solar) {
    lines.push(
      line("solar-panel", ["Solar", "الطاقة الشمسية"], ["Solar Panel", "لوح شمسي"], "solar panel 550w monocrystalline", "pcs", Math.ceil(totalArea / 40), 0),
      line("solar-inverter", ["Solar", "الطاقة الشمسية"], ["Solar Inverter", "عاكس طاقة شمسية"], "solar inverter", "pcs", 1, 0),
    );
  }
  if (feat.smartHome) {
    lines.push(
      line("smart-switch", ["Smart Home", "المنزل الذكي"], ["Smart Switch", "مفتاح ذكي"], "smart wifi switch", "pcs", rooms * 2, 0),
      line("smart-cam", ["Smart Home", "المنزل الذكي"], ["Security Camera", "كاميرا مراقبة"], "security camera cctv wifi", "pcs", Math.max(2, floors * 2), 0),
      line("smart-lock", ["Smart Home", "المنزل الذكي"], ["Smart Door Lock", "قفل ذكي"], "smart door lock", "pcs", 1, 0),
    );
  }
  if (feat.landscaping) {
    lines.push(
      line("grass", ["Landscape", "تنسيق الحدائق"], ["Artificial Grass", "عشب صناعي"], "artificial grass turf", "m2", 60, 10),
      line("outdoor-tile", ["Landscape", "تنسيق الحدائق"], ["Outdoor Pavement Tiles", "بلاط خارجي"], "outdoor paving tile interlock", "m2", 40, 8),
    );
  }
  if (feat.externalCladding) {
    lines.push(line("cladding", ["Cladding", "الكسوة الخارجية"], ["Stone / HPL Cladding", "كسوة خارجية"], "exterior stone cladding hpl", "m2", perimeter * (input.ceilingHeightM || 3) * floors * 0.5, 5));
  }
  if (feat.woodenInterior) {
    lines.push(line("wood-flooring", ["Interior Wood", "الأخشاب"], ["Engineered Wood Flooring", "أرضيات خشبية"], "engineered wood flooring parquet", "m2", totalArea * 0.3, 8));
  }

  // Round quantities cleanly
  return lines.map((l) => ({ ...l, quantity: round(l.quantity, l.unit === "ton" ? 1 : 1) }));
}
