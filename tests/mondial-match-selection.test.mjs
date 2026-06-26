import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fixturesFromWorldCupData,
  normalizeWorldCupScorers,
  pickWorldCupMatch,
  scorersFromWorldCupData,
  selectedMatchToFields,
} from '../dist-server/utils/mondialLiveSelectors.js';

const team = (id, name, shortName, countryCode) => ({
  id,
  name,
  shortName,
  countryCode,
  flagUrl: `https://flagcdn.com/${countryCode}.svg`,
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
    home: team(3, 'Canada', 'CAN', 'ca'),
    away: team(4, 'Qatar', 'QAT', 'qa'),
  }, {
    id: 'finished-c',
    group: 'C',
    status: 'finished',
    date: '2026-06-24T18:00:00Z',
    homeScore: 2,
    awayScore: 1,
    home: team(5, 'Brazil', 'BRA', 'br'),
    away: team(6, 'Morocco', 'MAR', 'ma'),
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
  assert.equal(pickWorldCupMatch(fixtures, { mode: 'round', roundStage: 'R32' }).id, 'M73');
  assert.equal(pickWorldCupMatch(fixtures, { mode: 'latest', statusFilter: 'finished' }).id, 'finished-c');
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
  assert.equal(fields.matchStatus, 'LIVE');
  assert.equal(fields.groupBadge, 'المجموعة B');
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
