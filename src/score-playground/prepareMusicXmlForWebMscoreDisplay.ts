/**
 * MuseScore exporta `<print new-page="yes">` em quase cada sistema — no webmscore vira
 * uma página SVG por linha. Neutralizamos quebras e alargamos a página para layout web.
 *
 * Partituras grandes (ex. Africa, banda completa): só remove `new-page`. Compactar demais
 * (sem new-system + página larga) estoura a memória do WASM no layout.
 */
/** Página de referência (~4 compassos por linha no playground). */
const DEFAULT_PAGE_WIDTH_TENTHS = 1100;
const DEFAULT_PAGE_HEIGHT_TENTHS = 2200;
const MIN_PAGE_WIDTH_TENTHS = 520;
const MAX_PAGE_WIDTH_TENTHS = 2400;

const LARGE_SCORE_XML_BYTES = 1_400_000;
const LARGE_SCORE_MEASURE_COUNT = 96;

export type WebMscoreDisplayLayout = {
  measuresPerLine: number;
  baselineMeasures: number;
  engravingZoom: number;
};

export function isLargeScoreForWebMscoreLayout(xml: string): boolean {
  if (!xml.includes('<score')) return false;
  if (xml.length >= LARGE_SCORE_XML_BYTES) return true;
  const measures = xml.match(/<measure[\s>]/gi);
  return (measures?.length ?? 0) >= LARGE_SCORE_MEASURE_COUNT;
}

export function prepareMusicXmlForWebMscoreDisplay(
  xml: string,
  layout?: WebMscoreDisplayLayout,
): string {
  if (!xml.includes('<score')) return xml;

  let out = xml.replace(/\bnew-page="yes"/gi, 'new-page="no"');
  const compact = !isLargeScoreForWebMscoreLayout(xml);

  if (compact) {
    out = out.replace(/\bnew-system="yes"/gi, 'new-system="no"');
    out = applyPageLayoutForZoom(out, layout);
    if (layout && layout.engravingZoom !== 1) {
      out = applyDefaultLayoutScaling(out, layout.engravingZoom);
    }
  }

  return out;
}

function pageWidthForMeasures(
  measuresPerLine: number,
  baselineMeasures: number,
): number {
  const base = Math.max(1, baselineMeasures);
  const m = Math.max(1, measuresPerLine);
  const width = DEFAULT_PAGE_WIDTH_TENTHS * (m / base);
  return Math.round(
    Math.min(MAX_PAGE_WIDTH_TENTHS, Math.max(MIN_PAGE_WIDTH_TENTHS, width)),
  );
}

function applyPageLayoutForZoom(
  xml: string,
  layout?: WebMscoreDisplayLayout,
): string {
  const pageLayoutBlock = /<page-layout>[\s\S]*?<\/page-layout>/i.exec(xml);
  if (!pageLayoutBlock) return xml;

  const width =
    layout != null
      ? pageWidthForMeasures(layout.measuresPerLine, layout.baselineMeasures)
      : DEFAULT_PAGE_WIDTH_TENTHS;

  let block = pageLayoutBlock[0];
  block = replaceTagNumber(block, 'page-width', width);
  block = replaceTagNumber(block, 'page-height', DEFAULT_PAGE_HEIGHT_TENTHS);

  return xml.replace(pageLayoutBlock[0], block);
}

/** Reduz millimeters no scaling padrão — notas e símbolos menores ao “afastar”. */
function applyDefaultLayoutScaling(xml: string, engravingZoom: number): string {
  const layoutBlock = /<layout>[\s\S]*?<\/layout>/i.exec(xml);
  if (!layoutBlock) return xml;

  let block = layoutBlock[0];
  const scaling = /<scaling>[\s\S]*?<\/scaling>/i.exec(block);
  if (!scaling) return xml;

  let scalingBlock = scaling[0];
  const mmMatch = /<millimeters>([\d.]+)<\/millimeters>/i.exec(scalingBlock);
  if (!mmMatch) return xml;

  const mm = Number(mmMatch[1]);
  if (!Number.isFinite(mm) || mm <= 0) return xml;

  const next = Math.round(mm * engravingZoom * 1000) / 1000;
  scalingBlock = scalingBlock.replace(
    /<millimeters>[\d.]+<\/millimeters>/i,
    `<millimeters>${next}</millimeters>`,
  );
  block = block.replace(scaling[0], scalingBlock);
  return xml.replace(layoutBlock[0], block);
}

function replaceTagNumber(block: string, tag: string, value: number): string {
  const pattern = new RegExp(`(<${tag}>)[\\d.]+(</${tag}>)`, 'i');
  if (pattern.test(block)) {
    return block.replace(pattern, `$1${value}$2`);
  }
  return block;
}
