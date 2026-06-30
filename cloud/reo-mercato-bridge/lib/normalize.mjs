/**
 * normalize.mjs
 * يحوّل صفقات FotMob الخام إلى عقد REO للانتقالات، مع روابط صور اللاعبين
 * وشعارات الأندية، وفلترة موسم 2026/27 (من 1 مايو 2026 فصاعداً).
 */

export const SEASON_START = '2026-05-01T00:00:00Z';
export const SEASON_LABEL = '2026/27';

const playerImg = (id) => id ? `https://images.fotmob.com/image_resources/playerimages/${id}.png` : '';
const teamLogo  = (id) => id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : '';

function feeLabel(t) {
  const v = t?.fee?.value;
  if (t?.onLoan) return 'إعارة';
  if (t?.contractExtension) return 'تجديد';
  if (v === 0 || t?.fee?.feeText === 'free') return 'انتقال حر';
  if (typeof v === 'number' && v > 0) {
    if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
    if (v >= 1_000) return `€${Math.round(v / 1_000)}K`;
    return `€${v}`;
  }
  return t?.fee?.feeText || '—';
}

function eur(v) {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
  if (v >= 1_000) return `€${Math.round(v / 1_000)}K`;
  return `€${v}`;
}

/** يطبّع صفقة FotMob واحدة. */
export function normalizeTransfer(t) {
  return {
    id: `${t.playerId}-${t.toClubId}-${(t.transferDate || '').slice(0, 10)}`,
    playerId: t.playerId,
    name: t.name,
    position: t.position?.label || '',
    positionKey: t.position?.key || '',
    playerImage: playerImg(t.playerId),
    fromClub: t.fromClubFullName || t.fromClub || '',
    fromClubShort: t.fromClub || '',
    fromClubId: t.fromClubId,
    fromLogo: teamLogo(t.fromClubId),
    toClub: t.toClubFullName || t.toClub || '',
    toClubShort: t.toClub || '',
    toClubId: t.toClubId,
    toLogo: teamLogo(t.toClubId),
    feeValue: typeof t.fee?.value === 'number' ? t.fee.value : null,
    feeLabel: feeLabel(t),
    marketValue: typeof t.marketValue === 'number' ? t.marketValue : null,
    marketValueLabel: eur(t.marketValue),
    transferType: t.onLoan ? 'loan' : t.contractExtension ? 'renewal' : (t.fee?.value === 0 ? 'free' : 'permanent'),
    onLoan: Boolean(t.onLoan),
    date: t.transferDate || '',
    dateLabel: (t.transferDate || '').slice(0, 10),
    contractFrom: t.fromDate || '',
    contractTo: t.toDate || '',
  };
}

/**
 * يطبّع مجموعة صفقات مع فلترة الموسم والترتيب وحدّ العدد.
 * @param {object[]} raw   صفقات FotMob الخام
 * @param {object} opts
 * @param {boolean} [opts.seasonOnly=true]  حصر موسم 2026/27
 * @param {'fee'|'date'} [opts.sort='fee']
 * @param {number} [opts.limit]
 * @param {number} [opts.minFee=0]
 */
export function normalizeTransfers(raw, opts = {}) {
  const seasonOnly = opts.seasonOnly !== false;
  let list = (raw || []).map(normalizeTransfer);

  if (seasonOnly) {
    const start = Date.parse(SEASON_START);
    list = list.filter(t => t.date && Date.parse(t.date) >= start);
  }
  if (opts.minFee) list = list.filter(t => (t.feeValue || 0) >= opts.minFee);

  if (opts.sort === 'date') list.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  else list.sort((a, b) => (b.feeValue || 0) - (a.feeValue || 0));

  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

/** يبني لقطة عقد REO جاهزة للقوالب. */
export function buildSnapshot(raw, view, meta = {}) {
  const sort = view === 'latest' ? 'date' : 'fee';
  const transfers = normalizeTransfers(raw, { sort, seasonOnly: true });
  return {
    ok: true,
    service: 'reo-fotmob-transfers-bridge',
    provider: 'fotmob',
    view,
    season: SEASON_LABEL,
    seasonStart: SEASON_START,
    sourceUrl: `https://www.fotmob.com/api/data/transfers?orderBy=${view === 'latest' ? 'lastModified' : 'amountEuro'}`,
    hits: meta.hits ?? transfers.length,
    maxFee: meta.maxFee ?? 0,
    fetchedAt: new Date().toISOString(),
    count: transfers.length,
    transfers,
  };
}
