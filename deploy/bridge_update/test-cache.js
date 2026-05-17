import { routePlayerStats } from './providers/router.js';

async function runTest() {
  const input = {
    player: {
      name: 'Lamine Yamal',
      club: 'Barcelona',
      season: '2025-26'
    },
    selectedMetrics: ['goals', 'assists', 'shots', 'key_passes']
  };

  const auth = { required: true, provided: true, valid: true };

  console.log("=== TEST 1: Requesting goals, assists, shots, key_passes ===");
  try {
    const result = await routePlayerStats(input, auth);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Test 1 failed:", e);
  }

  console.log("\n=== TEST 2: Unknown Player ===");
  const input2 = {
    player: {
      name: 'NonExistent Player',
      club: 'UnknownFC',
      season: '2025-26'
    },
    selectedMetrics: ['goals']
  };
  try {
    const result2 = await routePlayerStats(input2, auth);
    console.log(JSON.stringify(result2.players[0].metrics, null, 2));
  } catch (e) {
    console.error("Test 2 failed:", e);
  }
}

runTest();
