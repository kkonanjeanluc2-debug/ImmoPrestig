export interface AttestationWatermarkPlacementInput {
  templateType?: string;
  watermarkAngle?: string | null;
  watermarkRepeat?: boolean | null;
  watermarkPositionX?: number | null;
  watermarkPositionY?: number | null;
  watermarkRotation?: number | null;
}

export interface AttestationWatermarkPlacement {
  parsedPositionX: number | null;
  parsedPositionY: number | null;
  parsedRotation: number | null;
  hasCustomPos: boolean;
  defaultRotation: number;
  customRotation: number | null;
  hasMeaningfulCustomPlacement: boolean;
  useCustomSingle: boolean;
  isHorizontal: boolean;
}

export interface AttestationWatermarkBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface AttestationRepeatedWatermarkRatio {
  x: number;
  y: number;
}

interface AttestationWatermarkBoundsOptions {
  pageWidth: number;
  pageHeight: number;
  templateType?: string;
  pageBorderEnabled?: boolean | null;
  pageBorderStyle?: string | null;
  /**
   * Optional body content rectangle. When provided, the watermark zone is restricted
   * to the actual content area of the attestation (between header and footer,
   * inside the side margins) instead of the full page.
   */
  contentArea?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null;
}

const parseNullableNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getAttestationPageBorderContentInset = (
  pageBorderEnabled?: boolean | null,
  pageBorderStyle?: string | null,
) => {
  if (!pageBorderEnabled) return 0;

  switch (pageBorderStyle) {
    case "ornate":
      return 14;
    case "geometric":
      return 12;
    case "double":
      return 10;
    case "dashes":
      return 9;
    case "palmier":
    case "avocat":
    case "tomate":
    case "cacao":
    case "ananas":
    case "hibiscus":
    case "orange":
    case "feuille":
    case "banane":
    case "cafe":
      return 16;
    default:
      return 10;
  }
};

export const getAttestationWatermarkPlacement = ({
  templateType,
  watermarkAngle,
  watermarkRepeat,
  watermarkPositionX,
  watermarkPositionY,
  watermarkRotation,
}: AttestationWatermarkPlacementInput): AttestationWatermarkPlacement => {
  const parsedPositionX = parseNullableNumber(watermarkPositionX);
  const parsedPositionY = parseNullableNumber(watermarkPositionY);
  const parsedRotation = parseNullableNumber(watermarkRotation);
  const hasCustomPos = parsedPositionX !== null && parsedPositionY !== null;
  const defaultRotation = templateType === "cession" ? -34 : -45;
  const customRotation = parsedRotation;
  const hasMeaningfulCustomPlacement = hasCustomPos && (
    Math.abs((parsedPositionX as number) - 50) > 0.5 ||
    Math.abs((parsedPositionY as number) - 50) > 0.5 ||
    (customRotation !== null && Math.abs(customRotation - defaultRotation) > 0.5)
  );

  return {
    parsedPositionX,
    parsedPositionY,
    parsedRotation,
    hasCustomPos,
    defaultRotation,
    customRotation,
    hasMeaningfulCustomPlacement,
    useCustomSingle: !(watermarkRepeat ?? true),
    isHorizontal: watermarkAngle === "horizontal",
  };
};

export const getAttestationRepeatedWatermarkRatios = ({
  centerX = 0.5,
  centerY = 0.5,
  isHorizontal,
}: {
  centerX?: number;
  centerY?: number;
  isHorizontal: boolean;
}): AttestationRepeatedWatermarkRatio[] => {
  const offsets = isHorizontal ? [-0.3, -0.1, 0.1, 0.3] : [-0.28, 0, 0.28];

  return offsets
    .map((offset) => ({ x: centerX, y: centerY + offset }))
    .filter(({ x, y }) => x >= 0.05 && x <= 0.95 && y >= 0.08 && y <= 0.92);
};

export const getAttestationWatermarkBounds = ({
  pageWidth,
  pageHeight,
  templateType,
  pageBorderEnabled,
  pageBorderStyle,
  contentArea,
}: AttestationWatermarkBoundsOptions): AttestationWatermarkBounds => {
  const pdfBaseWidth = 210;
  const scale = pageWidth / pdfBaseWidth;
  const margin = (templateType === "cession" ? 20 : 12) * scale;
  const pageBorderInset = getAttestationPageBorderContentInset(pageBorderEnabled, pageBorderStyle) * scale;
  const edgeInset = pageBorderEnabled ? pageBorderInset + (4 * scale) : Math.max(4 * scale, margin * 0.4);
  const fallbackLeft = pageBorderEnabled ? Math.max(margin, edgeInset) : margin;
  const fallbackTop = edgeInset;
  const fallbackRight = pageWidth - fallbackLeft;
  const fallbackBottom = pageHeight - edgeInset;

  // When a content area is provided, restrict the watermark zone to it.
  // Otherwise, fall back to the full inner page area.
  const left = contentArea ? Math.max(fallbackLeft, contentArea.left) : fallbackLeft;
  const top = contentArea ? Math.max(fallbackTop, contentArea.top) : fallbackTop;
  const right = contentArea ? Math.min(fallbackRight, contentArea.right) : fallbackRight;
  const bottom = contentArea ? Math.min(fallbackBottom, contentArea.bottom) : fallbackBottom;

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};

export const estimatePreviewWatermarkTextSize = ({
  text,
  bounds,
  centerX,
  templateType,
  isHorizontal,
  hasCustomPos,
}: {
  text: string;
  bounds: AttestationWatermarkBounds;
  centerX: number;
  templateType?: string;
  isHorizontal: boolean;
  hasCustomPos: boolean;
}) => {
  const normalizedText = text.trim();
  if (!normalizedText) return 0;

  const isCession = templateType === "cession";
  const diagonalStartX = isHorizontal
    ? bounds.left + bounds.width * 0.04
    : isCession
      ? bounds.left + bounds.width * 0.01
      : bounds.left + bounds.width * 0.02;
  const diagonalStartY = isHorizontal
    ? bounds.top + bounds.height / 2
    : isCession
      ? bounds.top + bounds.height * 0.88
      : bounds.top + bounds.height * 0.95;
  const diagonalEndX = isHorizontal
    ? bounds.right - bounds.width * 0.04
    : isCession
      ? bounds.right - bounds.width * 0.01
      : bounds.right - bounds.width * 0.02;
  const diagonalEndY = isHorizontal
    ? bounds.top + bounds.height / 2
    : isCession
      ? bounds.top + bounds.height * 0.14
      : bounds.top + bounds.height * 0.05;

  const availableLength = hasCustomPos
    ? Math.max(bounds.width * 0.4, 2 * Math.min(centerX - bounds.left, bounds.right - centerX) * 0.92)
    : isHorizontal
      ? bounds.width * 0.92
      : Math.hypot(diagonalEndX - diagonalStartX, diagonalStartY - diagonalEndY) * 0.98;

  // Target the text to fill ~88% of the available length so we keep a
  // small but reasonable side padding while staying as large as possible.
  const targetLength = availableLength * 0.88;
  // Helvetica bold average glyph width ≈ 0.55 * fontSize
  const estimated = targetLength / Math.max(normalizedText.length * 0.55, 4);
  const maxFontSize = bounds.width * 0.28;
  const minFontSize = bounds.width * 0.06;

  return Math.max(minFontSize, Math.min(maxFontSize, estimated));
};

export const estimateRepeatedWatermarkTextSize = ({
  text,
  bounds,
  templateType,
  isHorizontal,
}: {
  text: string;
  bounds: AttestationWatermarkBounds;
  templateType?: string;
  isHorizontal: boolean;
}) => {
  const baseSize = estimatePreviewWatermarkTextSize({
    text,
    bounds,
    centerX: bounds.left + bounds.width / 2,
    templateType,
    isHorizontal,
    hasCustomPos: false,
  });

  return baseSize * 1.2;
};

export const estimatePreviewWatermarkImageSize = (
  bounds: AttestationWatermarkBounds,
  useCustomSingle: boolean,
) => {
  const widthRatio = useCustomSingle ? 0.43 : 0.21;
  const heightRatio = useCustomSingle ? 0.24 : 0.14;
  return Math.min(bounds.width * widthRatio, bounds.height * heightRatio);
};