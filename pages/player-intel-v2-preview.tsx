/**
 * Player Intel V2 — standalone preview page.
 *
 * Reachable via hash route #/player-intel-v2-preview, intentionally bypassing
 * the license gate so we can iterate quickly. It renders ONLY the V2 lab and
 * never touches the legacy Player Stats Lab.
 */
import React from 'react';
import PlayerIntelV2Preview from '../components/player-intel-v2/PlayerIntelV2Preview';

const PlayerIntelV2PreviewPage: React.FC = () => {
  return <PlayerIntelV2Preview />;
};

export default PlayerIntelV2PreviewPage;
