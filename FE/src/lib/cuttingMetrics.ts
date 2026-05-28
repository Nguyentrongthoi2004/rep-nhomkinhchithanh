type CutLike = {
  chieudaicat?: number | string | null;
};

type StockLike = {
  chieudaihientai?: number | string | null;
};

type PlanLike = {
  trangthai?: string | null;
  khothanhphoi?: StockLike | null;
  chitietcat?: CutLike[] | null;
};

export type SharedCuttingMetrics = {
  usedLength: number;
  inputLength: number | null;
  remainder: number | null;
  usageRate: number | null;
  cutsCount: number;
  inputSource:
    | "current-stock"
    | "reconstructed-after-complete"
    | "missing-or-inconsistent";
  isReliable: boolean;
};

const toFiniteNumber = (value: number | string | null | undefined): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function calculateCuttingPlanMetrics(plan: PlanLike): SharedCuttingMetrics {
  const cuts = Array.isArray(plan.chitietcat) ? plan.chitietcat : [];
  const usedLength = cuts.reduce((total, cut) => {
    const length = toFiniteNumber(cut.chieudaicat);
    return length && length > 0 ? total + length : total;
  }, 0);

  const currentLength = toFiniteNumber(plan.khothanhphoi?.chieudaihientai);
  const isCompleted = String(plan.trangthai || "").toUpperCase() === "HOAN_THANH";

  if (currentLength == null || currentLength < 0) {
    return {
      usedLength,
      inputLength: null,
      remainder: null,
      usageRate: null,
      cutsCount: cuts.length,
      inputSource: "missing-or-inconsistent",
      isReliable: false,
    };
  }

  const inputLength = isCompleted ? usedLength + currentLength : currentLength;

  if (inputLength <= 0 || inputLength < usedLength) {
    return {
      usedLength,
      inputLength: null,
      remainder: null,
      usageRate: null,
      cutsCount: cuts.length,
      inputSource: "missing-or-inconsistent",
      isReliable: false,
    };
  }

  const remainder = inputLength - usedLength;

  return {
    usedLength,
    inputLength,
    remainder,
    usageRate: (usedLength / inputLength) * 100,
    cutsCount: cuts.length,
    inputSource: isCompleted ? "reconstructed-after-complete" : "current-stock",
    isReliable: true,
  };
}
