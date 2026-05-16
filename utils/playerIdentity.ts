export type ClubIdentity = {
  id: string;
  displayName: string;
  arabicNames: string[];
  aliases: string[];
  league: string;
  logo: string;
};

export type PlayerIdentity = {
  id: string;
  displayName: string;
  arabicNames: string[];
  aliases: string[];
  club: string;
  clubArabic: string;
  position: string;
  smallImage: string;
  renderImage: string;
  clubLogo: string;
};

export type PlayerIdentityResolution = {
  player: PlayerIdentity;
  club: ClubIdentity | null;
  confidence: number;
  matched: string[];
};

const raw = (path: string) => `https://raw.githubusercontent.com/leo997a/graphicsplayer2026/main/${path}`;
const laLigaLogo = (file: string) => raw(`La%20Liga/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%A8%D8%A7%D9%86%D9%8A/${file}`);
const premierLogo = (file: string) => raw(`Premier%20League/%D9%84%D9%88%D8%BA%D9%88%20%D8%A7%D9%84%D8%A7%D9%86%D8%AF%D9%8A%D8%A9%20%D8%A7%D9%84%D8%A7%D9%86%D8%AC%D9%84%D9%8A%D8%B2%D9%8A%D8%A9/${file}`);
const barcaPlayer = (file: string) => raw(`La%20Liga/Barcelona/${file}`);
const chelseaPlayer = (file: string) => raw(`Premier%20League/Players/Chelsea/${file}`);

export const CLUB_IDENTITIES: ClubIdentity[] = [
  {
    id: 'barcelona',
    displayName: 'Barcelona',
    arabicNames: ['\u0628\u0631\u0634\u0644\u0648\u0646\u0629', '\u0627\u0644\u0628\u0627\u0631\u0633\u0627'],
    aliases: ['barcelona', 'fc barcelona', 'barca', 'fcb'],
    league: 'la-liga',
    logo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'chelsea',
    displayName: 'Chelsea',
    arabicNames: ['\u062A\u0634\u064A\u0644\u0633\u064A'],
    aliases: ['chelsea', 'chelsea fc', 'cfc'],
    league: 'premier-league',
    logo: premierLogo('Chelsea%20FC.png'),
  },
  {
    id: 'real-madrid',
    displayName: 'Real Madrid',
    arabicNames: ['\u0631\u064A\u0627\u0644 \u0645\u062F\u0631\u064A\u062F'],
    aliases: ['real madrid', 'madrid'],
    league: 'la-liga',
    logo: laLigaLogo('Real%20Madrid.png'),
  },
  {
    id: 'deportivo-alaves',
    displayName: 'Deportivo Alaves',
    arabicNames: ['\u0623\u0644\u0627\u0641\u064A\u0633', '\u0627\u0644\u0627\u0641\u064A\u0633'],
    aliases: ['deportivo alaves', 'alaves', 'alaves fc'],
    league: 'la-liga',
    logo: laLigaLogo('Deportivo%20Alav%C3%A9s.png'),
  },
];

export const PLAYER_IDENTITIES: PlayerIdentity[] = [
  {
    id: 'cole-palmer',
    displayName: 'Cole Palmer',
    arabicNames: ['\u0643\u0648\u0644 \u0628\u0627\u0644\u0645\u0631', '\u0628\u0627\u0644\u0645\u0631'],
    aliases: ['cole palmer', 'palmer', 'c palmer', 'c. palmer'],
    club: 'chelsea',
    clubArabic: '\u062A\u0634\u064A\u0644\u0633\u064A',
    position: 'AM/RW',
    smallImage: chelseaPlayer('Cole_Palmer_3.png'),
    renderImage: chelseaPlayer('Cole_Palmer_5.png'),
    clubLogo: premierLogo('Chelsea%20FC.png'),
  },
  {
    id: 'enzo-fernandez',
    displayName: 'Enzo Fernandez',
    arabicNames: ['\u0625\u0646\u0632\u0648 \u0641\u064A\u0631\u0646\u0627\u0646\u062F\u064A\u0632', '\u0627\u0646\u0632\u0648 \u0641\u064A\u0631\u0646\u0627\u0646\u062F\u064A\u0632'],
    aliases: ['enzo fernandez', 'enzo fernandez', 'enzo', 'e fernandez'],
    club: 'chelsea',
    clubArabic: '\u062A\u0634\u064A\u0644\u0633\u064A',
    position: 'CM',
    smallImage: chelseaPlayer('Enzo_Fernandez_5.png'),
    renderImage: chelseaPlayer('Enzo_Fernandez_5.png'),
    clubLogo: premierLogo('Chelsea%20FC.png'),
  },
  {
    id: 'moises-caicedo',
    displayName: 'Moises Caicedo',
    arabicNames: ['\u0645\u0648\u064A\u0633\u064A\u0633 \u0643\u0627\u064A\u0633\u064A\u062F\u0648', '\u0643\u0627\u064A\u0633\u064A\u062F\u0648'],
    aliases: ['moises caicedo', 'moises caicedo', 'caicedo', 'm caicedo'],
    club: 'chelsea',
    clubArabic: '\u062A\u0634\u064A\u0644\u0633\u064A',
    position: 'DM/CM',
    smallImage: chelseaPlayer('Moises_Caicedo.png'),
    renderImage: chelseaPlayer('Moises_Caicedo.png'),
    clubLogo: premierLogo('Chelsea%20FC.png'),
  },
  {
    id: 'reece-james',
    displayName: 'Reece James',
    arabicNames: ['\u0631\u064A\u0633 \u062C\u064A\u0645\u0633', '\u062C\u064A\u0645\u0633'],
    aliases: ['reece james', 'r james', 'james'],
    club: 'chelsea',
    clubArabic: '\u062A\u0634\u064A\u0644\u0633\u064A',
    position: 'RB',
    smallImage: chelseaPlayer('Reece_James_2.png'),
    renderImage: chelseaPlayer('Reece_James_2.png'),
    clubLogo: premierLogo('Chelsea%20FC.png'),
  },
  {
    id: 'lamine-yamal',
    displayName: 'Lamine Yamal',
    arabicNames: ['\u0644\u0627\u0645\u064A\u0646 \u064A\u0627\u0645\u0627\u0644', '\u064A\u0627\u0645\u0627\u0644'],
    aliases: ['lamine yamal', 'yamal'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'RW',
    smallImage: barcaPlayer('Lamine%20Yamal.png'),
    renderImage: barcaPlayer('Lamine%20Yamal.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'robert-lewandowski',
    displayName: 'Robert Lewandowski',
    arabicNames: ['\u0631\u0648\u0628\u0631\u062A \u0644\u064A\u0641\u0627\u0646\u062F\u0648\u0641\u0633\u0643\u064A', '\u0644\u064A\u0641\u0627\u0646\u062F\u0648\u0641\u0633\u0643\u064A'],
    aliases: ['robert lewandowski', 'lewandowski'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'ST',
    smallImage: barcaPlayer('Robert%20Lewandowski.png'),
    renderImage: barcaPlayer('Robert%20Lewandowski.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'pedri',
    displayName: 'Pedri',
    arabicNames: ['\u0628\u064A\u062F\u0631\u064A'],
    aliases: ['pedri'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'CM/AM',
    smallImage: barcaPlayer('Pedri.png'),
    renderImage: barcaPlayer('Pedri.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'dani-olmo',
    displayName: 'Dani Olmo',
    arabicNames: ['\u062F\u0627\u0646\u064A \u0623\u0648\u0644\u0645\u0648', '\u0623\u0648\u0644\u0645\u0648'],
    aliases: ['dani olmo', 'olmo'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'AM/FW',
    smallImage: barcaPlayer('Dani%20Olmo.png'),
    renderImage: barcaPlayer('Dani%20Olmo.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'gavi',
    displayName: 'Gavi',
    arabicNames: ['\u063A\u0627\u0641\u064A'],
    aliases: ['gavi', 'pablo gavi'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'CM',
    smallImage: barcaPlayer('Gavi.png'),
    renderImage: barcaPlayer('Gavi.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'raphinha',
    displayName: 'Raphinha',
    arabicNames: ['\u0631\u0627\u0641\u064A\u0646\u064A\u0627'],
    aliases: ['raphinha', 'raphael dias belloli'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'RW/LW',
    smallImage: barcaPlayer('Raphinha.png'),
    renderImage: barcaPlayer('Raphinha.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'ronald-araujo',
    displayName: 'Ronald Araujo',
    arabicNames: ['\u0631\u0648\u0646\u0627\u0644\u062F \u0623\u0631\u0627\u0648\u062E\u0648', '\u0623\u0631\u0627\u0648\u062E\u0648'],
    aliases: ['ronald araujo', 'araujo'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'CB',
    smallImage: barcaPlayer('Ronald%20Araujo.png'),
    renderImage: barcaPlayer('Ronald%20Araujo.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'alejandro-balde',
    displayName: 'Alejandro Balde',
    arabicNames: ['\u0628\u0627\u0644\u062F\u064A', '\u0627\u0644\u064A\u062E\u0627\u0646\u062F\u0631\u0648 \u0628\u0627\u0644\u062F\u064A'],
    aliases: ['alejandro balde', 'balde', 'a balde'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'LB',
    smallImage: barcaPlayer('Alejandro%20Balde.png'),
    renderImage: barcaPlayer('Alejandro%20Balde.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'frenkie-de-jong',
    displayName: 'Frenkie de Jong',
    arabicNames: ['\u0641\u0631\u064A\u0646\u0643\u064A \u062F\u064A \u064A\u0648\u0646\u062C', '\u062F\u064A \u064A\u0648\u0646\u062C'],
    aliases: ['frenkie de jong', 'de jong', 'f de jong'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'CM/DM',
    smallImage: barcaPlayer('Frenkie%20De%20Jong.png'),
    renderImage: barcaPlayer('Frenkie%20De%20Jong.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'jules-kounde',
    displayName: 'Jules Kounde',
    arabicNames: ['\u062C\u0648\u0644 \u0643\u0648\u0646\u062F\u064A', '\u0643\u0648\u0646\u062F\u064A'],
    aliases: ['jules kounde', 'kounde', 'j kounde'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'CB/RB',
    smallImage: barcaPlayer('Jules%20Kounde.png'),
    renderImage: barcaPlayer('Jules%20Kounde.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'marc-casado',
    displayName: 'Marc Casado',
    arabicNames: ['\u0645\u0627\u0631\u0643 \u0643\u0627\u0633\u0627\u062F\u0648', '\u0643\u0627\u0633\u0627\u062F\u0648'],
    aliases: ['marc casado', 'casado'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'DM',
    smallImage: barcaPlayer('Marc%20Casado.png'),
    renderImage: barcaPlayer('Marc%20Casado.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'fermin-lopez',
    displayName: 'Fermin Lopez',
    arabicNames: ['\u0641\u064A\u0631\u0645\u064A\u0646 \u0644\u0648\u0628\u064A\u0632', '\u0641\u064A\u0631\u0645\u064A\u0646'],
    aliases: ['fermin lopez', 'fermin'],
    club: 'barcelona',
    clubArabic: '\u0628\u0631\u0634\u0644\u0648\u0646\u0629',
    position: 'AM/CM',
    smallImage: barcaPlayer('Fermin%20Lopez.png'),
    renderImage: barcaPlayer('Fermin%20Lopez.png'),
    clubLogo: laLigaLogo('Barcelona.png'),
  },
  {
    id: 'nico-williams',
    displayName: 'Nico Williams',
    arabicNames: ['\u0646\u064A\u0643\u0648 \u0648\u064A\u0644\u064A\u0627\u0645\u0632', '\u0648\u064A\u0644\u064A\u0627\u0645\u0632'],
    aliases: ['nico williams', 'williams', 'n williams'],
    club: 'athletic',
    clubArabic: '\u0623\u062B\u0644\u062A\u064A\u0643',
    position: 'LW',
    smallImage: '',
    renderImage: '',
    clubLogo: laLigaLogo('Athletic%20Club%20Bilbao.png'),
  },
  {
    id: 'joshua-kimmich',
    displayName: 'Joshua Kimmich',
    arabicNames: ['\u062C\u0648\u0634\u0648\u0627 \u0643\u064A\u0645\u064A\u0634', '\u0643\u064A\u0645\u064A\u0634'],
    aliases: ['joshua kimmich', 'kimmich'],
    club: 'bayern',
    clubArabic: '\u0628\u0627\u064A\u0631\u0646',
    position: 'DM/RB',
    smallImage: '',
    renderImage: '',
    clubLogo: '',
  },
];

export const normalizeIdentityText = (text: unknown) => String(text ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
  .replace(/\u0629/g, '\u0647')
  .replace(/\u0649/g, '\u064A')
  .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const includesTerm = (haystack: string, term: string) => {
  const normalizedTerm = normalizeIdentityText(term);
  return Boolean(normalizedTerm && haystack.includes(normalizedTerm));
};

const clubTerms = (club: ClubIdentity) => [
  club.displayName,
  club.id.replace(/-/g, ' '),
  ...club.aliases,
  ...club.arabicNames,
];

const playerTerms = (player: PlayerIdentity) => [
  player.displayName,
  player.id.replace(/-/g, ' '),
  ...player.aliases,
  ...player.arabicNames,
];

export const resolveClubIdentity = (input: string): { club: ClubIdentity; confidence: number } | null => {
  const normalized = normalizeIdentityText(input);
  if (!normalized) return null;

  const scored = CLUB_IDENTITIES
    .map(club => {
      const matches = clubTerms(club).filter(term => includesTerm(normalized, term));
      const confidence = matches.length ? Math.min(98, 58 + matches.length * 14) : 0;
      return { club, confidence };
    })
    .filter(item => item.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  return scored[0] || null;
};

export const resolvePlayerIdentity = (input: string, preferredClub?: string): PlayerIdentityResolution | null => {
  const normalized = normalizeIdentityText(`${input} ${preferredClub || ''}`);
  if (!normalized) return null;
  const preferredClubMatch = preferredClub ? resolveClubIdentity(preferredClub) : null;

  const scored = PLAYER_IDENTITIES
    .map(player => {
      const matched = playerTerms(player).filter(term => includesTerm(normalized, term));
      const club = CLUB_IDENTITIES.find(candidate => candidate.id === player.club) || null;
      const clubMatched = club ? clubTerms(club).some(term => includesTerm(normalized, term)) : false;
      const preferredClubBonus = preferredClubMatch?.club.id === player.club ? 12 : 0;
      const exactNameBonus = normalizeIdentityText(player.displayName) === normalized ? 18 : 0;
      const confidence = matched.length
        ? Math.min(99, 62 + matched.length * 12 + (clubMatched ? 14 : 0) + preferredClubBonus + exactNameBonus)
        : 0;
      return { player, club, confidence, matched };
    })
    .filter(item => item.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  return scored[0] || null;
};

export const identityToAssetFields = (
  resolution: PlayerIdentityResolution | null,
  useRender = true
): Record<string, string | number> => {
  if (!resolution) return {};
  const { player, club, confidence } = resolution;
  const image = useRender ? player.renderImage || player.smallImage : player.smallImage || player.renderImage;
  return {
    playerId: player.id,
    playerName: player.displayName,
    playerTeam: club?.displayName || player.club,
    playerPosition: player.position,
    playerImage: image,
    playerImageLarge: player.renderImage || image,
    clubLogo: player.clubLogo || club?.logo || '',
    identityConfidence: confidence,
  };
};
