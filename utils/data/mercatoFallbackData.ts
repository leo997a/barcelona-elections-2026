export type MercatoSourceName = 'fotmob' | 'transfermarkt' | 'fallback' | 'manual' | 'computed' | string;

export interface TaggedValue<T = string | number | boolean | unknown[]> {
  value: T;
  _src: MercatoSourceName;
  status?: string;
}

export interface MercatoSourceItem {
  name: string;
  reliability?: number;
  status?: string;
  url?: string;
}

export interface MercatoChatLine {
  side: 'reporter' | 'agent' | 'source' | 'club' | string;
  text: string;
}

export interface MercatoTransferCard {
  id: string;
  name: TaggedValue<string>;
  playerImage?: TaggedValue<string>;
  position?: TaggedValue<string>;
  age?: TaggedValue<string | number>;
  nationality?: TaggedValue<string>;
  fromClub?: TaggedValue<string>;
  fromLogo?: TaggedValue<string>;
  toClub?: TaggedValue<string>;
  toLogo?: TaggedValue<string>;
  fee?: TaggedValue<string>;
  feeValue?: TaggedValue<number>;
  marketValue?: TaggedValue<string>;
  date?: TaggedValue<string>;
  status?: TaggedValue<string>;
  transferType?: TaggedValue<string>;
  probability?: TaggedValue<number>;
  oldProbability?: TaggedValue<number>;
  primarySource?: TaggedValue<string>;
  sourceText?: TaggedValue<string>;
  sources?: TaggedValue<MercatoSourceItem[]>;
  chatLines?: TaggedValue<MercatoChatLine[]>;
  clauseTitle?: TaggedValue<string>;
  clauseBody?: TaggedValue<string>;
  clauseValue?: TaggedValue<string>;
  salary?: TaggedValue<string>;
  contractYears?: TaggedValue<string | number>;
  agentFee?: TaggedValue<string>;
  medicalStage?: TaggedValue<string>;
  riskLevel?: TaggedValue<string>;
  hijackClub?: TaggedValue<string>;
  transferHistory?: TaggedValue<unknown[]>;
  valueHistory?: TaggedValue<unknown[]>;
  seasonStats?: TaggedValue<unknown>;
  _sources?: MercatoSourceItem[];
}

export const tag = <T>(value: T, _src: MercatoSourceName = 'fallback', status?: string): TaggedValue<T> => ({
  value,
  _src,
  ...(status ? { status } : {}),
});

export const MERCATO_FALLBACK_TRANSFERS: MercatoTransferCard[] = [
  {
    id: 'fallback-nico-williams',
    name: tag('Nico Williams'),
    position: tag('LW'),
    fromClub: tag('Athletic Club'),
    toClub: tag('Barcelona'),
    fee: tag('EUR58M + bonuses'),
    marketValue: tag('EUR70M'),
    date: tag('2026-06-30'),
    status: tag('Advanced talks'),
    probability: tag(78),
    oldProbability: tag(62),
    primarySource: tag('REO fallback sample'),
    sourceText: tag('REO fallback sample'),
    sources: tag([
      { name: 'REO fallback sample', reliability: 72, status: 'demo' },
      { name: 'Bridge not configured', reliability: 40, status: 'waiting' },
    ]),
    chatLines: tag([
      { side: 'reporter', text: 'Is the agreement close?' },
      { side: 'source', text: 'Club-to-club talks are active. Waiting for final confirmation.' },
    ]),
    clauseTitle: tag('Release clause / deal package'),
    clauseBody: tag('Fallback data only. Configure REO_TRANSFERS_BRIDGE_URL for verified live mercato details.'),
    medicalStage: tag('travel'),
    riskLevel: tag('medium'),
    salary: tag('Pending'),
    contractYears: tag('5'),
    agentFee: tag('Pending'),
    _sources: [{ name: 'fallback', status: 'demo' }],
  },
  {
    id: 'fallback-victor-osimhen',
    name: tag('Victor Osimhen'),
    position: tag('ST'),
    fromClub: tag('Napoli'),
    toClub: tag('Chelsea'),
    fee: tag('EUR75M'),
    marketValue: tag('EUR85M'),
    date: tag('2026-06-30'),
    status: tag('Monitoring'),
    probability: tag(61),
    oldProbability: tag(55),
    primarySource: tag('REO fallback sample'),
    sourceText: tag('REO fallback sample'),
    sources: tag([{ name: 'REO fallback sample', reliability: 65, status: 'demo' }]),
    riskLevel: tag('low'),
    _sources: [{ name: 'fallback', status: 'demo' }],
  },
  {
    id: 'fallback-joao-neves',
    name: tag('Joao Neves'),
    position: tag('CM'),
    fromClub: tag('PSG'),
    toClub: tag('Manchester United'),
    fee: tag('EUR90M'),
    marketValue: tag('EUR100M'),
    date: tag('2026-06-30'),
    status: tag('Rumour radar'),
    probability: tag(42),
    oldProbability: tag(35),
    primarySource: tag('REO fallback sample'),
    sourceText: tag('REO fallback sample'),
    sources: tag([{ name: 'REO fallback sample', reliability: 58, status: 'demo' }]),
    riskLevel: tag('medium'),
    _sources: [{ name: 'fallback', status: 'demo' }],
  },
  {
    id: 'fallback-jamal-musiala',
    name: tag('Jamal Musiala'),
    position: tag('AM'),
    fromClub: tag('Bayern Munich'),
    toClub: tag('Real Madrid'),
    fee: tag('Not disclosed'),
    marketValue: tag('EUR140M'),
    date: tag('2026-06-30'),
    status: tag('Early interest'),
    probability: tag(28),
    oldProbability: tag(22),
    primarySource: tag('REO fallback sample'),
    sourceText: tag('REO fallback sample'),
    sources: tag([{ name: 'REO fallback sample', reliability: 46, status: 'demo' }]),
    riskLevel: tag('low'),
    _sources: [{ name: 'fallback', status: 'demo' }],
  },
];
