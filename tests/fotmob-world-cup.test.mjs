import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFotMobWorldCup } from '../dist-server/api/_lib/fotmobWorldCup.js';

const standing = (name, id, idx, scoresStr = '2-1', qualColor = null) => ({
  name,
  shortName: name,
  id,
  idx,
  played: 1,
  wins: 1,
  draws: 0,
  losses: 0,
  scoresStr,
  goalConDiff: 1,
  pts: 3,
  qualColor,
});

const table = Array.from({ length: 12 }, (_, groupIndex) => ({
  leagueName: `Grp. ${String.fromCharCode(65 + groupIndex)}`,
  table: {
    all: [
      standing(groupIndex === 0 ? 'Mexico' : `Team ${groupIndex}-1`, groupIndex * 10 + 1, 1, '3-0', '#2AD572'),
      standing(groupIndex === 0 ? 'Scotland' : `Team ${groupIndex}-2`, groupIndex * 10 + 2, 2, '2-1', '#2AD572'),
      standing(`Team ${groupIndex}-3`, groupIndex * 10 + 3, 3, '1-1', '#FFD908'),
      standing(`Team ${groupIndex}-4`, groupIndex * 10 + 4, 4, '0-4'),
    ],
  },
}));

table.push({
  leagueName: 'Best 3rd placed teams',
  table: { all: [standing('Iraq', 999, 1, '4-2', '#2AD572')] },
});

const matchup = (matchId, homeName, awayName, homeId, awayId, tbd = false) => ({
  tbdTeam1: tbd,
  tbdTeam2: tbd,
  homeTeam: homeName,
  awayTeam: awayName,
  matches: [{
    matchId,
    home: { id: homeId, name: homeName, shortName: homeName.slice(0, 3).toUpperCase(), score: 2, winner: true },
    away: { id: awayId, name: awayName, shortName: awayName.slice(0, 3).toUpperCase(), score: 1, winner: false },
    status: { utcTime: '2026-07-01T18:00:00Z', started: !tbd, finished: !tbd },
  }],
});

const payload = {
  details: { selectedSeason: 2026 },
  stats: {
    players: [{
      name: 'goals',
      fetchAllUrl: 'https://data.fotmob.com/stats/77/season/24254/goals.json',
      topThree: [{
        id: 30981,
        name: 'Lionel Messi',
        teamId: 6706,
        teamName: 'Argentina',
        value: 5,
        rank: 1,
      }, {
        id: 846033,
        name: 'Vinícius Júnior',
        teamId: 8256,
        teamName: 'Brazil',
        value: 4,
        rank: 2,
      }],
    }],
  },
  table: [{ data: { tables: table } }],
  playoff: {
    rounds: [
      { stage: '1/16', participantCount: 32, matchups: [matchup(1, 'Mexico', 'Scotland', 1, 2)] },
      { stage: '1/8', participantCount: 16, matchups: [matchup(2, 'Winner 1', 'Winner 2', 3, 4, true)] },
      { stage: '1/4', participantCount: 8, matchups: [matchup(3, 'Winner 3', 'Winner 4', 5, 6, true)] },
      { stage: '1/2', participantCount: 4, matchups: [matchup(4, 'Winner 5', 'Winner 6', 7, 8, true)] },
      { stage: 'final', participantCount: 2, matchups: [matchup(5, 'Winner SF 1', 'Winner SF 2', 9, 10, true)] },
    ],
    bronzeFinal: matchup(6, 'Loser SF 1', 'Loser SF 2', 11, 12, true),
  },
  fixtures: {
    allMatches: [{
      id: '100',
      group: 'A',
      home: { id: '1', name: 'Mexico', shortName: 'MEX' },
      away: { id: '2', name: 'Scotland', shortName: 'SCO' },
      status: { utcTime: '2026-06-11T19:00:00Z', started: true, finished: true, scoreStr: '3 - 1' },
    }, {
      id: '101',
      group: 'B',
      home: { id: '3', name: 'Canada', shortName: 'CAN' },
      away: { id: '4', name: 'Bosnia and Herzegovina', shortName: 'BIH' },
      status: {
        utcTime: '2026-06-12T19:00:00Z',
        started: true,
        finished: false,
        scoreStr: '1 - 0',
        liveTime: { short: "67'" },
        reason: { short: '2H' },
      },
    }, {
      id: '102',
      group: 'D',
      home: { id: '7', name: 'Germany', shortName: 'GER' },
      away: { id: '8', name: 'Paraguay', shortName: 'PAR' },
      status: {
        utcTime: '2026-06-30T18:00:00Z',
        started: true,
        finished: true,
        scoreStr: '1 - 1 (3 - 4)',
        reason: { short: 'Pen' },
      },
    }],
  },
};

test('normalizes all 12 groups, flags and standings', () => {
  const snapshot = normalizeFotMobWorldCup(payload);
  assert.equal(snapshot.groups.length, 12);
  assert.equal(snapshot.provider, 'fotmob');
  assert.equal(snapshot.sourceMode, 'direct');
  assert.match(snapshot.dataVersion, /^reo-wc-/);
  assert.equal(snapshot.groups[0].teams[0].countryCode, 'mx');
  assert.equal(snapshot.groups[0].teams[1].countryCode, 'gb-sct');
  assert.equal(snapshot.groups[0].teams[0].goalsFor, 3);
  assert.equal(snapshot.groups[0].teams[0].goalsAgainst, 0);
  assert.equal(snapshot.bestThird[0].countryCode, 'iq');
});

test('keeps the complete 2026 knockout order including bronze', () => {
  const snapshot = normalizeFotMobWorldCup(payload);
  assert.deepEqual(snapshot.rounds.map((round) => round.stage), ['R32', 'R16', 'QF', 'SF', 'F', 'BRONZE']);
  assert.equal(snapshot.rounds[0].participantCount, 32);
  assert.equal(snapshot.rounds[0].matches[0].winnerId, 1);
  assert.equal(snapshot.rounds[0].matches[0].matchNo, 73);
  assert.equal(snapshot.rounds[0].matches[0].routeLabel, '2A vs 2B');
  assert.equal(snapshot.rounds[1].matches[0].home, null);
  assert.equal(snapshot.rounds[1].matches[0].homePlaceholder, 'Winner 1');
  assert.equal(snapshot.rounds[1].matches[0].matchNo, 89);
  assert.equal(snapshot.rounds[4].matches[0].matchNo, 104);
  assert.equal(snapshot.rounds[5].matches[0].matchNo, 103);
});

test('keeps a stable data version until football data changes', () => {
  const first = normalizeFotMobWorldCup(payload);
  const repeated = normalizeFotMobWorldCup(payload);
  assert.equal(first.dataVersion, repeated.dataVersion);

  const changedPayload = structuredClone(payload);
  changedPayload.fixtures.allMatches[0].status.scoreStr = '4 - 1';
  const changed = normalizeFotMobWorldCup(changedPayload);
  assert.notEqual(first.dataVersion, changed.dataVersion);
});

test('normalizes played fixture scores without inventing scheduled scores', () => {
  const snapshot = normalizeFotMobWorldCup(payload);
  assert.equal(snapshot.fixtures[0].homeScore, 3);
  assert.equal(snapshot.fixtures[0].awayScore, 1);
  assert.equal(snapshot.fixtures[0].status, 'finished');
});

test('keeps live fixture minute for template live badges', () => {
  const snapshot = normalizeFotMobWorldCup(payload);
  const live = snapshot.fixtures.find((fixture) => fixture.id === '101');
  assert.ok(live);
  assert.equal(live.status, 'live');
  assert.equal(live.homeScore, 1);
  assert.equal(live.awayScore, 0);
  assert.equal(live.minute, '67');
  assert.equal(live.statusLabel, "67'");
});

test('normalizes penalty shootout scores and winner from FotMob score strings', () => {
  const snapshot = normalizeFotMobWorldCup(payload);
  const penalty = snapshot.fixtures.find((fixture) => fixture.id === '102');
  assert.ok(penalty);
  assert.equal(penalty.status, 'finished');
  assert.equal(penalty.homeScore, 1);
  assert.equal(penalty.awayScore, 1);
  assert.equal(penalty.homePenaltyScore, 3);
  assert.equal(penalty.awayPenaltyScore, 4);
  assert.equal(penalty.winnerId, '8');
  assert.equal(penalty.statusLabel, 'Pen');
});

test('normalizes the live Golden Boot leaders from FotMob player stats', () => {
  const snapshot = normalizeFotMobWorldCup(payload);
  assert.equal(snapshot.topScorers.length, 2);
  assert.equal(snapshot.topScorers[0].name, 'Lionel Messi');
  assert.equal(snapshot.topScorers[0].teamName, 'Argentina');
  assert.equal(snapshot.topScorers[0].countryCode, 'ar');
  assert.equal(snapshot.topScorers[0].goals, 5);
  assert.match(snapshot.topScorers[0].imageUrl, /30981\.png$/);
});
