#!/bin/bash
export CLEAN_REO_TOKEN=$(grep REO_PLAYER_STATS_TOKEN /opt/reo-player-stats-bridge/ecosystem.config.cjs | cut -d ':' -f2 | tr -d " ',\"" | xargs)
curl -s -H "Authorization: Bearer $CLEAN_REO_TOKEN" "http://127.0.0.1:8095/player-stats?playerName=Robert%20Lewandowski&clubName=Barcelona&selectedMetrics=goals,assists,shots,key_passes" > /tmp/curl_res.json
cat /tmp/curl_res.json
