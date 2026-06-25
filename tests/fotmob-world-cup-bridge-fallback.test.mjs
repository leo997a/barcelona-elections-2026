import assert from 'node:assert/strict';
import test from 'node:test';
import { getWorldCupSnapshot } from '../dist-server/api/_lib/fotmobWorldCup.js';

const standing = (name, id, idx) => ({
  name,
  shortName: name.slice(0, 3).toUpperCase(),
  id,
  idx,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  scoresStr: '0-0',
  goalConDiff: 0,
  pts: 0,
});

const table = Array.from({ length: 12 }, (_, groupIndex) => ({
  leagueName: `Grp. ${String.fromCharCode(65 + groupIndex)}`,
  table: {
    all: [
      standing(groupIndex === 0 ? 'Mexico' : `Team ${groupIndex}-1`, groupIndex * 10 + 1, 1),
      standing(groupIndex === 0 ? 'South Africa' : `Team ${groupIndex}-2`, groupIndex * 10 + 2, 2),
      standing(groupIndex === 0 ? 'Korea Republic' : `Team ${groupIndex}-3`, groupIndex * 10 + 3, 3),
      standing(groupIndex === 0 ? 'Czechia' : `Team ${groupIndex}-4`, groupIndex * 10 + 4, 4),
    ],
  },
}));

const matchup = {
  tbdTeam1: true,
  tbdTeam2: true,
  homeTeam: '2A',
  awayTeam: '2B',
  matches: [{
    matchId: 73,
    home: { id: 1, name: '2A', shortName: '2A' },
    away: { id: 2, name: '2B', shortName: '2B' },
    status: { utcTime: '2026-06-28T22:00:00Z', started: false, finished: false },
    venueInfo: { name: 'Inglewood' },
  }],
};

const pageProps = {
  details: { selectedSeason: 2026 },
  table: [{ data: { tables: table } }],
  playoff: {
    rounds: [
      { stage: '1/16', participantCount: 32, matchups: [matchup] },
    ],
  },
  fixtures: {
    allMatches: [{
      id: 1,
      group: 'A',
      home: { id: 1, name: 'Mexico', shortName: 'MEX' },
      away: { id: 2, name: 'South Africa', shortName: 'RSA' },
      status: { utcTime: '2026-06-11T19:00:00Z', started: false, finished: false },
    }],
  },
};

test('uses the REO bridge when the direct FotMob request fails', async () => {
  const originalFetch = globalThis.fetch;
  const originalBridgeUrl = process.env.REO_BRIDGE_URL;
  const originalBridgeToken = process.env.REO_BRIDGE_TOKEN;
  const calls = [];

  process.env.REO_BRIDGE_URL = 'https://bridge.example.test/';
  process.env.REO_BRIDGE_TOKEN = 'test-token';

  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    calls.push({ url: target, headers: init.headers });

    if (target.includes('fotmob.com/leagues/77/overview/world-cup')) {
      throw new Error('simulated FotMob outage');
    }

    if (target === 'https://bridge.example.test/api/world-cup') {
      return new Response(JSON.stringify({ provider: 'fotmob', pageProps }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected request: ${target}`);
  };

  try {
    const snapshot = await getWorldCupSnapshot();

    assert.equal(snapshot.sourceMode, 'bridge-fallback');
    assert.equal(snapshot.sourceStatus, 'live');
    assert.equal(snapshot.groups.length, 12);
    assert.equal(snapshot.rounds[0].matches[0].matchNo, 73);
    assert.match(snapshot.dataVersion, /^reo-wc-/);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://www.fotmob.com/leagues/77/overview/world-cup');
    assert.equal(calls[1].url, 'https://bridge.example.test/api/world-cup');
    assert.equal(calls[1].headers.Authorization, 'Bearer test-token');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBridgeUrl === undefined) delete process.env.REO_BRIDGE_URL;
    else process.env.REO_BRIDGE_URL = originalBridgeUrl;
    if (originalBridgeToken === undefined) delete process.env.REO_BRIDGE_TOKEN;
    else process.env.REO_BRIDGE_TOKEN = originalBridgeToken;
  }
});
