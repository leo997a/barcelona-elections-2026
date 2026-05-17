#!/bin/bash
export CLEAN_REO_TOKEN=$(grep REO_PLAYER_STATS_TOKEN /opt/reo-player-stats-bridge/.env | cut -d '=' -f2)

echo "--- LOCAL 8095 ---"
curl -s -H "Authorization: Bearer $CLEAN_REO_TOKEN" 'http://127.0.0.1:8095/player-stats?playerName=Lamine%20Yamal&clubName=Barcelona&selectedMetrics=goals,assists,shots,key_passes' | jq .

echo "--- NGINX ---"
curl -s -H "Authorization: Bearer $CLEAN_REO_TOKEN" 'http://127.0.0.1/reo-player-stats/player-stats?playerName=Lamine%20Yamal&clubName=Barcelona&selectedMetrics=goals,assists,shots,key_passes' | jq .
