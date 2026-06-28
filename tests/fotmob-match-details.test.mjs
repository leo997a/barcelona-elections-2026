import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  lineupsToPlayersJson,
  matchDetailsToFields,
  normalizeFotMobMatchDetails,
} from '../dist-server/utils/mondialMatchDetails.js';

const readSource = async path => readFile(new URL(path, import.meta.url), 'utf8');

const rawMatchDetails = {
  general: {
    matchId: 4667751,
    leagueName: 'World Cup',
    leagueRoundName: 'Group A',
    matchTimeUTCDate: '2026-06-25T18:00:00Z',
    teamColors: { darkMode: { home: '#00843d', away: '#da291c' } },
  },
  header: {
    teams: [
      { id: 1, name: 'Mexico', score: 2, imageUrl: 'https://example.com/mex.png' },
      { id: 2, name: 'South Africa', score: 1, imageUrl: 'https://example.com/rsa.png' },
    ],
    status: {
      finished: true,
      scoreStr: '2 - 1',
      reason: { short: 'FT' },
    },
  },
  content: {
    matchFacts: {
      events: {
        events: [{
          time: 23,
          type: 'Goal',
          isHome: true,
          player: { name: 'Santiago Gimenez' },
          homeScore: 1,
          awayScore: 0,
        }],
      },
      playerOfTheMatch: {
        id: 100,
        teamId: 1,
        teamName: 'Mexico',
        name: 'Santiago Gimenez',
        playerRatingRounded: 8.7,
        stats: [{
          title: 'Top stats',
          key: 'top_stats',
          stats: {
            'FotMob rating': {
              key: 'rating_title',
              stat: { value: 8.7, type: 'double' },
            },
            Goals: {
              key: 'goals',
              stat: { value: 2, type: 'integer' },
            },
            'Accurate passes': {
              key: 'accurate_passes',
              stat: { value: 21, total: 25, type: 'fractionWithPercentage' },
            },
          },
        }],
      },
      topPlayers: {
        homeTopPlayers: [],
        awayTopPlayers: [],
      },
    },
    playerStats: {
      100: { rating: 8.7 },
      200: { rating: 7.2 },
    },
    lineup: {
      homeTeam: {
        id: 1,
        name: 'Mexico',
        formation: '4-3-3',
        coach: { name: 'Javier Aguirre' },
        starters: [{
          id: 100,
          name: 'Santiago Gimenez',
          shirtNumber: 9,
          positionLabel: 'FW',
          horizontalLayout: { x: 50, y: 18 },
        }],
        subs: [],
      },
      awayTeam: {
        id: 2,
        name: 'South Africa',
        formation: '4-2-3-1',
        coach: { name: 'Hugo Broos' },
        starters: [{
          id: 200,
          name: 'Ronwen Williams',
          shirtNumber: 1,
          positionLabel: 'GK',
          horizontalLayout: { x: 50, y: 85 },
        }],
        subs: [],
      },
    },
    stats: {
      Periods: {
        All: {
          stats: [{
            title: 'Top stats',
            stats: [
              { key: 'BallPossesion', title: 'Ball possession', stats: ['55%', '45%'] },
              { key: 'expected_goals', title: 'Expected goals (xG)', stats: [1.8, 0.7] },
              { key: 'TotalShots', title: 'Total shots', stats: [13, 8] },
              { key: 'ShotsOnTarget', title: 'Shots on target', stats: [6, 3] },
              { key: 'ShotAccuracy', title: 'Shot accuracy', stats: ['46%', '38%'] },
              { key: 'HighTurnovers', title: 'High turnovers', stats: [9, 5] },
              { key: 'FieldTilt', title: 'Field tilt', stats: ['62%', '38%'] },
              { key: 'Recoveries', title: 'Ball recoveries', stats: [44, 39] },
              { key: 'DuelsWon', title: 'Duels won', stats: ['54%', '46%'] },
              { key: 'Corners', title: 'Corners', stats: [7, 2] },
              { key: 'Fouls', title: 'Fouls committed', stats: [11, 15] },
              { key: 'YellowCards', title: 'Yellow cards', stats: [1, 3] },
              { key: 'AccuratePasses', title: 'Accurate passes', stats: ['373/450', '76%'] },
            ],
          }],
        },
      },
    },
  },
};

test('normalizes current FotMob match details into the REO contract', () => {
  const details = normalizeFotMobMatchDetails(rawMatchDetails, {
    sourceMode: 'direct',
    sourceUrl: 'https://www.fotmob.com/api/data/matchDetails?matchId=4667751',
  });

  assert.equal(details.schemaVersion, 'reo-match-details-v1');
  assert.equal(details.match.id, '4667751');
  assert.equal(details.match.status, 'finished');
  assert.equal(details.match.home.name, 'Mexico');
  assert.equal(details.match.away.name, 'South Africa');
  assert.equal(details.events[0].player, 'Santiago Gimenez');
  assert.equal(details.lineups.home.formation, '4-3-3');
  assert.equal(details.lineups.away.coach, 'Hugo Broos');
  assert.equal(details.teamStats.length, 13);
  assert.equal(details.playerOfTheMatch.rating, 8.7);
  assert.equal(details.playerOfTheMatch.stats[0].label, 'Rating');
  assert.equal(details.playerOfTheMatch.stats[1].key, 'goals');
  assert.equal(details.availability.lineups, true);
  assert.equal(details.availability.teamStats, true);
});

test('maps match details to legacy fields consumed by existing templates', () => {
  const details = normalizeFotMobMatchDetails(rawMatchDetails);
  const fields = matchDetailsToFields(details);

  assert.equal(fields.selectedMatchId, '4667751');
  assert.equal(fields.homeTeam, 'Mexico');
  assert.equal(fields.awayTeam, 'South Africa');
  assert.equal(fields.homeScore, 2);
  assert.equal(fields.momName, 'Santiago Gimenez');
  assert.deepEqual(JSON.parse(fields.statsJson).slice(0, 2), [
    { label: 'الأهداف', value: 2 },
    { label: 'التمريرات الدقيقة', value: '21/25' },
  ]);
  assert.equal(fields.statPossessionHome, 55);
  assert.equal(fields.statPossessionAway, 45);
  assert.equal(fields.statXgHome, 1.8);
  assert.equal(fields.statXgAway, 0.7);
  assert.equal(fields.statShotsHome, 13);
  assert.equal(fields.statOnTargetAway, 3);
  assert.equal(fields.statShotAccuracyHome, 46);
  assert.equal(fields.statPressureHome, 9);
  assert.equal(fields.statFieldTiltAway, 38);
  assert.equal(fields.statRecoveriesHome, 44);
  assert.equal(fields.statDuelsAway, 46);
  assert.equal(fields.statCornersHome, 7);
  assert.equal(fields.statFoulsAway, 15);
  assert.equal(fields.statYellowAway, 3);
  assert.equal(fields.statPassHome, 83);
  assert.equal(JSON.parse(fields.playersJson)[0].name, 'Santiago Gimenez');
  assert.equal(lineupsToPlayersJson(details, 'away')[0].name, 'Ronwen Williams');
});

test('editor, operator and OBS variants expose live match selection and details', async () => {
  const [picker, editor, operator, renderer, obs, templates, api] = await Promise.all([
    readSource('../components/editor/MondialMatchPicker.tsx'),
    readSource('../pages/Editor.tsx'),
    readSource('../pages/Operator.tsx'),
    readSource('../components/renderers/Mondial2026Renderer.tsx'),
    readSource('../components/renderers/MondialObsTemplates.tsx'),
    readSource('../components/renderers/MondialTemplates.ts'),
    readSource('../api/reo-match.ts'),
  ]);

  assert.match(picker, /selectedMatchToFields/);
  assert.match(picker, /matchPickMode: 'match_id'/);
  assert.match(editor, /<MondialMatchPicker/);
  assert.match(operator, /<MondialMatchPicker/);
  assert.match(renderer, /action=match-details/);
  assert.match(renderer, /matchDetailsToFields/);
  assert.match(renderer, /\^\\d\{4,\}\$/);
  assert.match(obs, /findDetailStat\(matchDetails/);
  assert.match(obs, /lineupsToPlayersJson\(matchDetails, lineupSide\)/);
  assert.match(obs, /matchDetails\?\.playerOfTheMatch/);
  assert.match(templates, /id: 'lineupSide'/);
  assert.match(api, /action === 'match-details'/);
});
