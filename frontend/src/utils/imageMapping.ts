/**
 * imageMapping.ts
 *
 * Fallback image resolution for Marketplace product cards.
 * Priority:
 *   1. imagen_url from the database  ← handled in MarketplaceProductCard.tsx
 *   2. Keyword / category match from this utility
 *   3. Generic dental premium default
 *
 * All images are permanent Unsplash URLs (format-controlled, no redirects).
 * Aesthetic: Studio Medical — clean white/grey backgrounds, professional
 * lighting, sharp product focus. Aligned with dentalq.es catalogue style.
 */

/** Build a permanent, formatted Unsplash URL */
const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`;

interface ImageCategory {
  /** Keyword list matched against lowercased product name */
  keys: string[];
  /** Pool of images — at least 10 per category to minimize repetition */
  images: string[];
}

const IMAGE_MAP: ImageCategory[] = [
  // ── Adhesivos / Bonding ───────────────────────────────────────────────────
  {
    keys: ['adhesivo', 'bonding', 'grabado', 'ácido', 'acido', 'primer'],
    images: [
      u('1584308666744-24d5c474f2ae'),
      u('1579154204601-01588f351e67'),
      u('1581595219315-a187dd40c322'),
      u('1606811841689-23dfddce3e95'),
      u('1628177142898-93e46e48d5f5'),
      u('1629909615184-74f495363b67'),
      u('1576091160550-2173dba999ef'),
      u('1666214280327-249d26c0d5f2'),
      u('1584982751601-97d8cb0f308d'),
      u('1609840114035-3c981b782dfe'),
    ],
  },

  // ── Anestesia / Fungible quirúrgico ──────────────────────────────────────
  {
    keys: ['anestesia', 'aguja', 'cartucho', 'jeringa', 'local', 'quirúrgico', 'quiru'],
    images: [
      u('1584362917165-526a968579e8'),
      u('1579165466741-7f35e4755660'),
      u('1631815588090-d4bfec5b1ccb'),
      u('1581595219315-a187dd40c322'),
      u('1576091160550-2173dba999ef'),
      u('1666214280327-249d26c0d5f2'),
      u('1629909615184-74f495363b67'),
      u('1606811841689-23dfddce3e95'),
      u('1580281657527-47f249e8f4df'),
      u('1584308666744-24d5c474f2ae'),
    ],
  },

  // ── Profilaxis / Higiene ──────────────────────────────────────────────────
  {
    keys: ['profilaxis', 'airflow', 'scaler', 'limpieza', 'cepillo', 'higiene', 'pasta'],
    images: [
      u('1609840114035-3c981b782dfe'),
      u('1629909615184-74f495363b67'),
      u('1588776813677-77d6f4efb09f'),
      u('1584982751601-97d8cb0f308d'),
      u('1519494026892-80bbd2d6fd0d'),
      u('1576091160399-112ba8d25d1d'),
      u('1580281657527-47f249e8f4df'),
      u('1582719508461-905c673771fd'),
      u('1609207825181-52d3214556df'),
      u('1629909613654-28e377c37b09'),
    ],
  },

  // ── Blanqueamiento / Estética ─────────────────────────────────────────────
  {
    keys: ['blanquea', 'estétic', 'estetic', 'carilla', 'composite', 'opalescence', 'carbamida', 'peróxido'],
    images: [
      u('1606265752439-1f18756aa5fc'),
      u('1588776814127-3a8c47f6a07e'),
      u('1584362917165-526a968579e8'),
      u('1609207825181-52d3214556df'),
      u('1581093458791-9f3c3900df4b'),
      u('1516549655169-df83a0774514'),
      u('1606811842303-2f6d9d97f0c6'),
      u('1629909615184-74f495363b67'),
      u('1580281657527-47f249e8f4df'),
      u('1584308666744-24d5c474f2ae'),
    ],
  },

  // ── Implantología / Cirugía ───────────────────────────────────────────────
  {
    keys: ['implant', 'pilar', 'cirugía', 'sutura', 'hueso', 'membrana', 'colgajo', 'abutment', 'implante'],
    images: [
      u('1606811841689-23dfddce3e95'),
      u('1628177142898-93e46e48d5f5'),
      u('1576091160550-2173dba999ef'),
      u('1666214280327-249d26c0d5f2'),
      u('1629909615184-74f495363b67'),
      u('1631815588090-d4bfec5b1ccb'),
      u('1559757175-9b22e16cb03b'),
      u('1530026405186-ed1f139313f8'),
      u('1623945581257-8e8e8bcd4895'),
      u('1581595219315-a187dd40c322'),
    ],
  },

  // ── EPIs / Barrera ────────────────────────────────────────────────────────
  {
    keys: ['guante', 'mascarilla', 'desechable', 'esteriliz', 'bata', 'barrera', 'epi', 'fungible'],
    images: [
      u('1584982751601-97d8cb0f308d'),
      u('1583912267550-d4bcdd38a65a'),
      u('1582719478250-c89cae4dc85b'),
      u('1631815588090-d4bfec5b1ccb'),
      u('1576091160399-112ba8d25d1d'),
      u('1584362917165-526a968579e8'),
      u('1580281657527-47f249e8f4df'),
      u('1609840114035-3c981b782dfe'),
      u('1606265752439-1f18756aa5fc'),
      u('1519494026892-80bbd2d6fd0d'),
    ],
  },

  // ── Instrumental Rotatorio ───────────────────────────────────────────────
  {
    keys: ['rotatorio', 'turbina', 'micromotor', 'contraángulo', 'fresa', 'instrumental'],
    images: [
      u('1598256989800-fea5f6c8d0b8'),
      u('1588776814546-daab30f310ce'),
      u('1606811842303-2f6d9d97f0c6'),
      u('1582719508461-905c673771fd'),
      u('1576091160550-2173dba999ef'),
      u('1629909613654-28e377c37b09'),
      u('1609207825181-52d3214556df'),
      u('1631815588090-d4bfec5b1ccb'),
      u('1580281657527-47f249e8f4df'),
      u('1666214280327-249d26c0d5f2'),
    ],
  },

  // ── Radiología / Diagnóstico ──────────────────────────────────────────────
  {
    keys: ['radiolog', 'rayos x', 'cbct', 'sensor', 'fósforo', 'rvg', 'ortopantom', 'dosimetr'],
    images: [
      u('1559757175-9b22e16cb03b'),
      u('1530026405186-ed1f139313f8'),
      u('1579684453423-f84349ef60b0'),
      u('1551884170-a11ca28e2c6d'),
      u('1612277795421-9bc7706a4a34'),
      u('1585771724684-38269d6639fd'),
      u('1516549655169-df83a0774514'),
      u('1623946989125-a8da1f35c014'),
      u('1582719478250-c89cae4dc85b'),
      u('1576091160399-112ba8d25d1d'),
    ],
  },

  // ── Laboratorio / CAD-CAM / Prótesis ─────────────────────────────────────
  {
    keys: ['laboratorio', 'cad', 'cam', 'yeso', 'escáner', 'protésis', 'protesis', 'articulador', 'cerámica', 'ceramica'],
    images: [
      u('1581093458791-9f3c3900df4b'),
      u('1582719508461-905c673771fd'),
      u('1516549655169-df83a0774514'),
      u('1584308666744-24d5c474f2ae'),
      u('1606811842303-2f6d9d97f0c6'),
      u('1559757175-9b22e16cb03b'),
      u('1629909615184-74f495363b67'),
      u('1609207825181-52d3214556df'),
      u('1514590734756-1ada1b699b77'),
      u('1629909613654-28e377c37b09'),
    ],
  },

  // ── Sillón / Unidad / Mobiliario ─────────────────────────────────────────
  {
    keys: ['sillón', 'sillonn', 'unidad dental', 'lámpara', 'taburete', 'mobiliario', 'equipamiento'],
    images: [
      u('1588776814546-daab30f310ce'),
      u('1519494026892-80bbd2d6fd0d'),
      u('1576091160399-112ba8d25d1d'),
      u('1598256989800-fea5f6c8d0b8'),
      u('1584982751601-97d8cb0f308d'),
      u('1629909613654-28e377c37b09'),
      u('1609840114035-3c981b782dfe'),
      u('1631815588090-d4bfec5b1ccb'),
      u('1580281657527-47f249e8f4df'),
      u('1576091160550-2173dba999ef'),
    ],
  },

  // ── Impresión / Silicona / Alginato ──────────────────────────────────────
  {
    keys: ['impresión', 'impresion', 'silicona', 'alginato', 'cubeta', 'obturac', 'ionóme'],
    images: [
      u('1579567761406-4684ee0c75b6'),
      u('1588776813677-77d6f4efb09f'),
      u('1580281657527-47f249e8f4df'),
      u('1516549655169-df83a0774514'),
      u('1582719508461-905c673771fd'),
      u('1584308666744-24d5c474f2ae'),
      u('1581093458791-9f3c3900df4b'),
      u('1629909615184-74f495363b67'),
      u('1606811842303-2f6d9d97f0c6'),
      u('1609840114035-3c981b782dfe'),
    ],
  },

  // ── Ortodoncia ────────────────────────────────────────────────────────────
  {
    keys: ['ortodoncia', 'aligner', 'alineador', 'bracket', 'arco', 'tubo', 'retenedor', 'autoligado'],
    images: [
      u('1571772996211-2f02c9727629'),
      u('1606265752439-1f18756aa5fc'),
      u('1609207825181-52d3214556df'),
      u('1534438327276-14e5300c3a48'),
      u('1588776814127-3a8c47f6a07e'),
      u('1580281657527-47f249e8f4df'),
      u('1614534929993-75a0b84a6b04'),
      u('1631815588090-d4bfec5b1ccb'),
      u('1629909613654-28e377c37b09'),
      u('1609840114035-3c981b782dfe'),
    ],
  },

  // ── Software / Digital / IA ───────────────────────────────────────────────
  {
    keys: ['software', 'digital', 'ia', 'inteligencia artificial', 'app', 'crm', 'erp', 'gestión clínica', 'his', 'pms', 'firma digital', 'seo', 'monitoriz'],
    images: [
      u('1550751827-4bd374c3f58b'),
      u('1518770660439-4636190af475'),
      u('1551434678-e076c223a692'),
      u('1555949963-ff9fe0c870ba'),
      u('1517694712202-14dd9538aa97'),
      u('1504639725590-34d0984388bd'),
      u('1556761175-b413da4baf72'),
      u('1562813733-3c6ca4d7efb1'),
      u('1460925895917-afdab827c52f'),
      u('1516321318423-f06f85e504b3'),
    ],
  },

  // ── Gestión / Marketing / RRHH ────────────────────────────────────────────
  {
    keys: ['gestión', 'gestion', 'marketing', 'consultoría', 'consultoria', 'headhunting', 'personal', 'rrhh', 'formación', 'recuperaci'],
    images: [
      u('1460925895917-afdab827c52f'),
      u('1504639725590-34d0984388bd'),
      u('1556761175-b413da4baf72'),
      u('1517694712202-14dd9538aa97'),
      u('1573164713988-8665fc963095'),
      u('1499750310107-5fef28a66643'),
      u('1516321318423-f06f85e504b3'),
      u('1555949963-ff9fe0c870ba'),
      u('1551434678-e076c223a692'),
      u('1507679799987-c73779587ccf'),
    ],
  },

  // ── Financiero / Seguros / Gestoría ──────────────────────────────────────
  {
    keys: ['financ', 'seguro', 'gestoría', 'gestoria', 'leasing', 'renting', 'moroso', 'deuda', 'contabilidad', 'fiscal'],
    images: [
      u('1554224155-8d04cb21cd6c'),
      u('1579621970563-ebec7560ff3e'),
      u('1450101499163-c8848c66ca85'),
      u('1507679799987-c73779587ccf'),
      u('1521791136064-7986c2920216'),
      u('1453928582365-b6ad33cbcf64'),
      u('1434626881859-5684a5154f96'),
      u('1560472354-b33ff0ad5a87'),
      u('1497366216548-37526070297c'),
      u('1486406146926-c627a92ad1ab'),
    ],
  },

  // ── Servicios / Prevención / PRL ──────────────────────────────────────────
  {
    keys: ['servicio', 'prevención', 'prevencion', 'prl', 'ergonomía', 'ergonom', 'mantenimiento', 'lotes'],
    images: [
      u('1507679799987-c73779587ccf'),
      u('1521791136064-7986c2920216'),
      u('1516321318423-f06f85e504b3'),
      u('1581093458791-9f3c3900df4b'),
      u('1453928582365-b6ad33cbcf64'),
      u('1560472354-b33ff0ad5a87'),
      u('1499750310107-5fef28a66643'),
      u('1504639725590-34d0984388bd'),
      u('1486312338219-ce68d2c6f44d'),
      u('1573164713988-8665fc963095'),
    ],
  },
];

/** Generic premium dental pool — last resort fallback */
const GENERIC_POOL = [
  u('1629909613654-28e377c37b09'),
  u('1609840114035-3c981b782dfe'),
  u('1588776813677-77d6f4efb09f'),
  u('1606265752439-1f18756aa5fc'),
  u('1584308666744-24d5c474f2ae'),
  u('1629909615184-74f495363b67'),
  u('1581595219315-a187dd40c322'),
  u('1576091160550-2173dba999ef'),
  u('1666214280327-249d26c0d5f2'),
  u('1584982751601-97d8cb0f308d'),
  u('1630406152820-d75fe87eb36'),
  u('1607990281966-1a6d0f4b3c09'),
];

/**
 * Returns a premium fallback image URL for a product.
 *
 * This function should ONLY be called when `imagen_url` from the database
 * is empty or has failed to load. See `MarketplaceProductCard.tsx` for
 * the primary URL resolution logic.
 *
 * @param productName  - The product's `nombre` field
 * @param productIndex - Card index used to cycle images within a category
 */
export const getPremiumImage = (productName: string, productIndex: number = 0): string => {
  const name = productName.toLowerCase();

  const matched = IMAGE_MAP.find((cat) => cat.keys.some((key) => name.includes(key)));

  if (matched) {
    return matched.images[productIndex % matched.images.length];
  }

  return GENERIC_POOL[productIndex % GENERIC_POOL.length];
};