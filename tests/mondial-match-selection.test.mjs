import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fixturesFromWorldCupData,
  normalizeWorldCupScorers,
  pickWorldCupMatch,
  scorersFromWorldCupData,
  selectedMatchToFields,
} from '../dist-server/utils/mondialLiveSelectors.js';

const team = (id, name, shortName, countryCode, color) => ({
  id,
  name,
  shortName,
  countryCode,
  color,
  flagUrl: `https://flagcdn.com/${countryCode}.svg`,
});

test('normalizes scorer metric aliases from bridge payloads', () => {
  const scorers = normalizeWorldCupScorers({
    topScorers: [{
      ParticipantId: 42,
      ParticipantName: 'Alias Player',
      TeamName: 'Alias FC',
      ParticipantCountryCode: 'fr',
      StatValue: 7,
      goal_assist: 3,
      total_scoring_att: 22,
      ontargetScoringAtt: 12,
      FotMobRating: 8.8,
      createdChances: 9,
      Apps: 5,
      Minutes: 410,
      StatLabel: 'Goals',
      PlayerImage: 'https://example.com/player.png',
    }],
  });

  assert.equal(scorers[0].id, 42);
  assert.equal(scorers[0].name, 'Alias Player');
  assert.equal(scorers[0].goals, 7);
  assert.equal(scorers[0].assists, 3);
  assert.equal(scorers[0].shots, 22);
  assert.equal(scorers[0].shotsOnTarget, 12);
  assert.equal(scorers[0].rating, 8.8);
  assert.equal(scorers[0].keyPasses, 9);
  assert.equal(scorers[0].appearances, 5);
  assert.equal(scorers[0].minutesPlayed, 410);
  assert.equal(scorers[0].metricLabel, 'Goals');
  assert.equal(scorers[0].image, 'https://example.com/player.png');
});

const payload = {
  competition: 'World Cup',
  fixtures: [{
    id: 'scheduled-a',
    group: 'A',
    status: 'scheduled',
    date: '2026-06-26T18:00:00Z',
    home: team(1, 'Mexico', 'MEX', 'mx'),
    away: team(2, 'South Africa', 'RSA', 'za'),
  }, {
    id: 'live-b',
    group: 'B',
    status: 'live',
    statusLabel: "67'",
    minute: '67',
    date: '2026-06-25T18:00:00Z',
    homeScore: 1,
    awayScore: 0,
    home: team(3, 'Canada', 'CAN', 'ca', '#d80027'),
    away: team(4, 'Qatar', 'QAT', 'qa', '#7b1735'),
  }, {
    id: 'finished-c',
    group: 'C',
    status: 'finished',
    date: '2026-06-24T18:00:00Z',
    homeScore: 2,
    awayScore: 1,
    home: team(5, 'Brazil', 'BRA', 'br'),
    away: team(6, 'Morocco', 'MAR', 'ma'),
  }, {
    id: 'penalty-d',
    stage: 'R32',
    status: 'finished',
    statusLabel: 'Pen',
    date: '2026-06-30T18:00:00Z',
    homeScore: 1,
    awayScore: 1,
    homePenaltyScore: 4,
    awayPenaltyScore: 3,
    winnerId: 8,
    home: team(7, 'Germany', 'GER', 'de'),
    away: team(8, 'Paraguay', 'PAR', 'py'),
  }],
  rounds: [{
    stage: 'R32',
    matches: [{
      id: 'M73',
      status: 'scheduled',
      date: '2026-06-28T18:00:00Z',
      homePlaceholder: '2A',
      awayPlaceholder: '2B',
    }],
  }],
  topScorers: [{
    id: 30981,
    name: 'Lionel Messi',
    teamName: 'Argentina',
    countryCode: 'ar',
    goals: 5,
    assists: 0,
    rank: 1,
  }],
};

test('prefers the currently live match and supports exact match selection', () => {
  const fixtures = fixturesFromWorldCupData(payload, []);
  assert.equal(pickWorldCupMatch(fixtures, { mode: 'next' }).id, 'live-b');
  assert.equal(pickWorldCupMatch(fixtures, { mode: 'match_id', selectedMatchId: 'finished-c' }).id, 'finished-c');
});

test('selects matches by team, group, round and status', () => {
  const fixtures = fixturesFromWorldCupData(payload, []);
  assert.equal(pickWorldCupMatch(fixtures, { mode: 'team', teamCode: 'BRA' }).id, 'finished-c');
  assert.equal(pickWorldCupMatch(fixtures, { mode: 'group', groupCode: 'A' }).id, 'scheduled-a');
  assert.equal(pickWorldCupMatch(fixtures, { mode: 'round', roundStage: 'R32', statusFilter: 'scheduled' }).id, 'M73');
  assert.equal(pickWorldCupMatch(fixtures, { mode: 'latest', statusFilter: 'finished' }).id, 'penalty-d');
});

test('does not treat the stats period field as match status', () => {
  const [fixture] = fixturesFromWorldCupData({
    fixtures: [{
      id: 'period-only',
      status: 'scheduled',
      period: 'FirstHalf',
      home: team(10, 'Spain', 'ESP', 'es'),
      away: team(11, 'Canada', 'CAN', 'ca'),
    }],
  }, []);

  assert.equal(fixture.status, 'scheduled');
  assert.equal(fixture.statusCode, 'PRE');
});

test('maps the selected fixture to legacy template fields', () => {
  const fixtures = fixturesFromWorldCupData(payload, []);
  const selected = pickWorldCupMatch(fixtures, { mode: 'match_id', selectedMatchId: 'live-b' });
  const fields = selectedMatchToFields(selected, 'World Cup');
  assert.equal(fields.homeTeam, 'Canada');
  assert.equal(fields.homeShort, 'CAN');
  assert.equal(fields.awayTeam, 'Qatar');
  assert.equal(fields.homeScore, 1);
  assert.equal(fields.minute, '67');
  assert.equal(fields.period, 'FULL');
  assert.equal(fields.statsPeriod, 'FULL');
  assert.equal(fields.matchStatus, 'LIVE');
  assert.equal(fields.statusLabel, "67'");
  assert.equal(fields.matchPeriodLabel, "67'");
  assert.equal(fields.homeLogo, 'https://flagcdn.com/ca.svg');
  assert.equal(fields.awayLogo, 'https://flagcdn.com/qa.svg');
  assert.equal(fields.homeColor, '#d80027');
  assert.equal(fields.awayColor, '#7b1735');
  assert.equal(fields.groupBadge, 'المجموعة B');
});

test('maps penalty shootout matches with winner and score detail', () => {
  const fixtures = fixturesFromWorldCupData(payload, []);
  const selected = pickWorldCupMatch(fixtures, { mode: 'match_id', selectedMatchId: 'penalty-d' });
  const fields = selectedMatchToFields(selected, 'World Cup');
  assert.equal(fields.matchStatus, 'PEN');
  assert.equal(fields.period, 'PEN');
  assert.equal(fields.statsPeriod, 'PEN');
  assert.equal(fields.isPenaltyShootout, true);
  assert.equal(fields.penaltyScoreText, '4 : 3');
  assert.equal(fields.winnerTeam, 'Paraguay');
  assert.match(String(fields.resultNote), /Paraguay/);
  assert.match(String(fields.scoreDetail), /4 : 3/);
});

test('uses live scorer data before manual fallback data', () => {
  const scorers = scorersFromWorldCupData(payload, JSON.stringify([{
    name: 'Manual Player',
    team: 'Manual Team',
    code: 'xx',
    goals: 99,
  }]));
  assert.equal(scorers.length, 1);
  assert.equal(scorers[0].name, 'Lionel Messi');
  assert.equal(scorers[0].goals, 5);
});

test('keeps scorer metadata and resolves equal goals by assists then minutes', () => {
  const scorers = normalizeWorldCupScorers({
    topScorers: [{
      id: 1,
      name: 'Player A',
      teamName: 'Alpha',
      countryCode: 'aa',
      imageUrl: 'https://example.com/a.png',
      flagUrl: 'https://example.com/aa.png',
      goals: 4,
      assists: 1,
      appearances: 3,
      minutesPlayed: 210,
      rank: 2,
    }, {
      id: 2,
      name: 'Player B',
      teamName: 'Beta',
      countryCode: 'bb',
      goals: 4,
      assists: 2,
      appearances: 3,
      minutesPlayed: 250,
      rank: 1,
    }],
  });

  assert.equal(scorers[0].name, 'Player B');
  assert.equal(scorers[1].appearances, 3);
  assert.equal(scorers[1].minutesPlayed, 210);
  assert.equal(scorers[1].image, 'https://example.com/a.png');
  assert.equal(scorers[1].flagUrl, 'https://example.com/aa.png');
});

test('preserves rich live scorer fields and tie-breaks equal goal totals', () => {
  const scorers = scorersFromWorldCupData({
    topScorers: [{
      id: 1,
      name: 'Player A',
      nameAr: 'اللاعب أ',
      teamName: 'Team A',
      countryCode: 'aa',
      flagUrl: 'https://example.com/aa.svg',
      imageUrl: 'https://example.com/a.png',
      goals: 4,
      assists: 1,
      appearances: 5,
      minutesPlayed: 360,
      rank: 2,
    }, {
      id: 2,
      name: 'Player B',
      teamName: 'Team B',
      countryCode: 'bb',
      goals: 4,
      assists: 2,
      appearances: 4,
      minutesPlayed: 400,
      rank: 1,
    }, {
      id: 3,
      name: 'Player C',
      teamName: 'Team C',
      countryCode: 'cc',
      goals: 4,
      assists: 1,
      appearances: 5,
      minutesPlayed: 320,
      rank: 3,
    }],
  }, []);

  assert.deepEqual(scorers.map(scorer => scorer.name), ['Player B', 'Player C', 'Player A']);
  assert.equal(scorers[2].nameAr, 'اللاعب أ');
  assert.equal(scorers[2].flagUrl, 'https://example.com/aa.svg');
  assert.equal(scorers[2].appearances, 5);
  assert.equal(scorers[2].minutesPlayed, 360);
  assert.equal(scorers[2].image, 'https://example.com/a.png');
});

test('normalizes additional scorer metrics for reusable ranking templates', () => {
  const scorers = normalizeWorldCupScorers({
    topScorers: [{
      id: 7,
      name: 'Creative Player',
      teamName: 'Team C',
      countryCode: 'tc',
      goals: 2,
      assists: 6,
      shots: 14,
      shotsOnTarget: 8,
      rating: 8.6,
      keyPasses: 11,
      appearances: 4,
      minutesPlayed: 350,
      metricLabel: 'تقييم',
    }],
  });

  assert.equal(scorers[0].assists, 6);
  assert.equal(scorers[0].shots, 14);
  assert.equal(scorers[0].shotsOnTarget, 8);
  assert.equal(scorers[0].rating, 8.6);
  assert.equal(scorers[0].keyPasses, 11);
  assert.equal(scorers[0].metricLabel, 'تقييم');
});
