export type QuotePricingLine = {
  name?: string | null;
  unit?: string | null;
  length?: number | null;
  w?: number | null;
  h?: number | null;
  qty?: number | null;
};

export const LABOR_PRICING = {
  fabricationPerLinearMeter: 32000,
  glassHandlingPerSqm: 25000,
  installationPerSqm: 120000,
  siteSetup: 150000,
};

const DIMENSION_RE = /\((\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*mm\)/i;

function dimFromText(text?: string | null) {
  const match = (text ?? "").match(DIMENSION_RE);
  if (!match) return null;
  return { w: Number(match[1]), h: Number(match[2]) };
}

function isSheetLine(line: QuotePricingLine) {
  const text = `${line.name ?? ""} ${line.unit ?? ""}`.toLowerCase();
  return text.includes("kinh") || text.includes("glass") || text.includes("m2") || text.includes("m²");
}

export function calculateQuoteLabor(lines: QuotePricingLine[], doorAreaSqm = 0) {
  let linearMeters = 0;
  let sheetSqm = 0;

  for (const line of lines) {
    const qty = Math.max(0, Number(line.qty || 0));
    if (!qty) continue;

    const explicitDim = line.w != null && line.h != null ? { w: Number(line.w), h: Number(line.h) } : null;
    const dim = explicitDim ?? dimFromText(line.name);
    const sheet = isSheetLine(line) || explicitDim != null;

    if (sheet && dim && dim.w > 0 && dim.h > 0) {
      sheetSqm += (dim.w * dim.h * qty) / 1_000_000;
      continue;
    }

    const length = Number(line.length || 0);
    if (length > 0) linearMeters += (length * qty) / 1000;
  }

  const installationAreaSqm = Math.max(Number(doorAreaSqm || 0), sheetSqm);
  const hasProductionScope = linearMeters > 0 || sheetSqm > 0 || installationAreaSqm > 0;

  const fabrication = Math.round(linearMeters * LABOR_PRICING.fabricationPerLinearMeter);
  const glassHandling = Math.round(sheetSqm * LABOR_PRICING.glassHandlingPerSqm);
  const installation = Math.round(installationAreaSqm * LABOR_PRICING.installationPerSqm);
  const siteSetup = hasProductionScope ? LABOR_PRICING.siteSetup : 0;
  const total = fabrication + glassHandling + installation + siteSetup;

  return {
    linearMeters,
    sheetSqm,
    installationAreaSqm,
    fabrication,
    glassHandling,
    installation,
    siteSetup,
    total,
  };
}
