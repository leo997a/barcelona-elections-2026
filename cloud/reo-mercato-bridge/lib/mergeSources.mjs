/**
 * mergeSources.mjs — «الدمج العبقري» بين FotMob و Transfermarkt
 * ────────────────────────────────────────────────────────────────────────────
 * المبدأ: كل مصدر يُستخدم فيما يتفوّق فيه، ويُوسَم مصدر كل حقل للشفافية.
 *
 *   FotMob (حيّ + بصري):   playerImage, fromLogo, toLogo, fee, date, type, "تمت اليوم"
 *   Transfermarkt (مرجعي): تاريخ القيمة السوقية، Δ سنة، تاريخ الانتقالات، المشاركات، مستوى الدوري
 *
 * القاعدة:
 *   - الهوية والبصريات والحدث  → FotMob (الأدقّ للصور والشعارات والصفقة اللحظية).
 *   - القيمة السوقية الحالية   → Transfermarkt إن وُجد، وإلا marketValue من FotMob (تدرّج آمن).
 *   - الاتجاه/التاريخ/المسيرة  → Transfermarkt فقط (FotMob لا يوفّرها).
 *
 * يُرجِع «بطاقة REO موحّدة» لكل حقل فيها {value, _src}.
 */

const tag = (value, src) => ({ value, _src: src });

function buildMemoryCard(tmStore, query) {
  const players = Array.isArray(tmStore?.players) ? tmStore.players : [];
  const needle = String(query?.name || '').trim().toLowerCase();
  const player = players.find((item) => String(item?.name || '').trim().toLowerCase() === needle);
  if (!player) {
    return { matchQuality: 'missing', realDataAvailable: false, player: { dataStatus: 'missing' } };
  }
  return {
    matchQuality: 'local',
    realDataAvailable: true,
    player: {
      dataStatus: 'available',
      ...player,
      market: player.market || {},
      transfers: player.transfers || {},
      appearances: player.appearances || {},
    },
  };
}

function eurLabel(v) {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
  if (v >= 1_000) return `€${Math.round(v / 1_000)}K`;
  return `€${v}`;
}

/**
 * يدمج صفقة FotMob مطبّعة مع مرجع Transfermarkt (إن وُجد في المتجر).
 * @param {object} ft   صفقة FotMob مطبّعة (من normalize.mjs)
 * @param {object} tmStore  متجر Transfermarkt { players, clubs }
 */
export function mergeTransferCard(ft, tmStore) {
  // مرجع Transfermarkt بالاسم (+ نادي الوجهة لرفع دقة المطابقة)
  const tm = tmStore
    ? buildMemoryCard(tmStore, { name: ft.name, club: ft.toClub, mode: 'full' })
    : { matchQuality: 'missing', realDataAvailable: false, player: { dataStatus: 'missing' } };

  const tmHit = tm.realDataAvailable && tm.player?.dataStatus !== 'missing';
  const tmMarket = tmHit ? (tm.player.market || {}) : {};
  const tmTransfers = tmHit ? (tm.player.transfers || {}) : {};
  const tmApps = tmHit ? (tm.player.appearances || {}) : {};

  // القيمة السوقية: Transfermarkt أولاً، ثم FotMob كتدرّج آمن
  let currentValue, currentValueLabel, valueSrc;
  if (tmHit && typeof tmMarket.currentValueEur === 'number') {
    currentValue = tmMarket.currentValueEur;
    currentValueLabel = tmMarket.currentValueLabel;
    valueSrc = 'transfermarkt';
  } else {
    currentValue = ft.marketValue;
    currentValueLabel = ft.marketValueLabel;
    valueSrc = 'fotmob';
  }

  // ── الرسوم الرسمية: Transfermarkt أولاً (الأدقّ)، ثم FotMob كتدرّج آمن ──
  // نطابق هذه الصفقة بتاريخ انتقالات Transfermarkt عبر نادي الوجهة، وإلا أحدث انتقال.
  const norm = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
  let officialFeeLabel = ft.feeLabel, officialFeeValue = ft.feeValue, feeSrc = 'fotmob';
  if (tmHit && Array.isArray(tmTransfers.history) && tmTransfers.history.length) {
    const toN = norm(ft.toClub);
    const match = tmTransfers.history.find(h => norm(h.to).includes(toN) || toN.includes(norm(h.to)))
      || tmTransfers.history[tmTransfers.history.length - 1];
    if (match && match.feeLabel && match.feeLabel !== 'pending') {
      officialFeeLabel = match.feeLabel;
      officialFeeValue = typeof match.feeEur === 'number' ? match.feeEur : ft.feeValue;
      feeSrc = 'transfermarkt';
    }
  }

  return {
    id: ft.id,
    // ── الهوية والبصريات (FotMob) ──
    name: tag(ft.name, 'fotmob'),
    playerImage: tag(ft.playerImage, 'fotmob'),
    position: tag(ft.position, 'fotmob'),
    fromClub: tag(ft.fromClub, 'fotmob'),
    fromLogo: tag(ft.fromLogo, 'fotmob'),
    toClub: tag(ft.toClub, 'fotmob'),
    toLogo: tag(ft.toLogo, 'fotmob'),

    // ── حدث الصفقة (FotMob) ──
    fee: tag(officialFeeLabel, feeSrc),
    feeValue: tag(officialFeeValue, feeSrc),
    feeFotmob: tag(ft.feeLabel, 'fotmob'),
    transferType: tag(ft.transferType, 'fotmob'),
    date: tag(ft.dateLabel, 'fotmob'),
    isToday: tag(ft.dateLabel === new Date().toISOString().slice(0, 10), 'fotmob'),

    // ── القيمة الحالية (Transfermarkt → FotMob) ──
    marketValue: tag(currentValueLabel || eurLabel(currentValue), valueSrc),

    // ── العمق المرجعي (Transfermarkt فقط) ──
    age: tmHit ? tag(tm.player.age, 'transfermarkt') : tag(null, 'missing'),
    nationality: tmHit ? tag(tm.player.nationality, 'transfermarkt') : tag(null, 'missing'),
    valueTrendPct: tmHit ? tag(tmMarket.valueDeltaYearPct, 'transfermarkt') : tag(null, 'missing'),
    valueHistory: tmHit ? tag(tmMarket.history || [], 'transfermarkt') : tag([], 'missing'),
    lastFee: tmHit ? tag(tmTransfers.lastFeeLabel, 'transfermarkt') : tag(null, 'missing'),
    transferHistory: tmHit ? tag(tmTransfers.history || [], 'transfermarkt') : tag([], 'missing'),
    seasonStats: tmHit ? tag({
      matches: tmApps.matches, goals: tmApps.goals, assists: tmApps.assists, minutes: tmApps.minutes,
    }, 'transfermarkt') : tag(null, 'missing'),
    leagueLevel: tmHit ? tag(tmApps.leagueLevel, 'transfermarkt') : tag(null, 'missing'),

    // ── ميتا الدمج ──
    _enriched: tmHit,
    _matchQuality: tm.matchQuality,
    _sources: tmHit ? ['fotmob', 'transfermarkt'] : ['fotmob'],
  };
}

/** يدمج لقطة كاملة من خلاصة FotMob مع متجر Transfermarkt. */
export function mergeSnapshot(fotmobSnapshot, tmStore) {
  const transfers = (fotmobSnapshot.transfers || []).map(ft => mergeTransferCard(ft, tmStore));
  const enrichedCount = transfers.filter(t => t._enriched).length;
  return {
    ok: true,
    service: 'reo-unified-transfers',
    strategy: 'fotmob(visual+live) + transfermarkt(reference depth)',
    view: fotmobSnapshot.view,
    season: fotmobSnapshot.season,
    fetchedAt: fotmobSnapshot.fetchedAt,
    sources: {
      fotmob: { role: 'صور/شعارات/حدث الصفقة', sourceUrl: fotmobSnapshot.sourceUrl },
      transfermarkt: { role: 'القيمة المرجعية/الاتجاه/المسيرة', enriched: enrichedCount },
    },
    count: transfers.length,
    enrichedCount,
    transfers,
  };
}
