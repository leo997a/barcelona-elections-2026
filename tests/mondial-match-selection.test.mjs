import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fixturesFromWorldCupData,
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

test('uses live FotMob scorers before manual fallback data', () => {
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
