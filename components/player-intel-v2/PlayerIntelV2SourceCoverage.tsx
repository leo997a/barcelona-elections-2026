/**
 * Source Coverage panel — shows whether FotMob & FBref were available, plus
 * per-stat-group matching status.
 */
import React from 'react';
import { CheckCircle2, XCircle, Activity } from 'lucide-react';
import { LAB_LABELS, fbrefGroupAr } from './playerIntelV2Labels';
import type { PlayerIntelMasterSummary } from './playerIntelV2Types';

interface Props {
  summary: PlayerIntelMasterSummary | null;
}

const SourceBadge: React.FC<{ available: boolean | undefined; label: string }> = ({
  available,
  label,
}) => (
  <div
    className={[
      'flex items-center gap-2 rounded-xl px-3 py-2 border',
      available
        ? 'bg-green-900/20 border-green-700/40 text-green-300'
        : 'bg-gray-800/40 border-gray-700/40 text-gray-500',
    ].join(' ')}
  >
    {available ? (
      <CheckCircle2 className="w-4 h-4" />
    ) : (
      <XCircle className="w-4 h-4" />
    )}
    <span className="text-sm font-bold">{label}</span>
    <span className="text-xs">
      {available ? LAB_LABELS.sourceAvailable : LAB_LABELS.sourceMissing}
    </span>
  </div>
);

const PlayerIntelV2SourceCoverage: React.FC<Props> = ({ summary }) => {
  if (!summary) return null;

  const fotmob = summary.sources?.fotmob;
  const fbref = summary.sources?.fbref;
  const matched = summary.fbrefGroupsMatched || [];
  const missing = summary.fbrefGroupsMissingPlayer || [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-blue-400" />
        <h3 className="text-base font-black text-white">
          {LAB_LABELS.sourceCoverage}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <SourceBadge available={fotmob} label={LAB_LABELS.sourceFotmob} />
        <SourceBadge available={fbref} label={LAB_LABELS.sourceFbref} />
      </div>

      {(matched.length > 0 || missing.length > 0) && (
        <div className="space-y-3">
          {matched.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">
                {LAB_LABELS.fbrefGroupsMatched} ({matched.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matched.map((g) => (
                  <span
                    key={g}
                    className="text-[11px] bg-green-900/20 border border-green-800/40 text-green-300 rounded-md px-2 py-0.5 font-mono"
                  >
                    {fbrefGroupAr(g)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {missing.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">
                {LAB_LABELS.fbrefGroupsMissing} ({missing.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((g) => (
                  <span
                    key={g}
                    className="text-[11px] bg-gray-800/60 border border-gray-700/40 text-gray-400 rounded-md px-2 py-0.5 font-mono"
                  >
                    {fbrefGroupAr(g)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerIntelV2SourceCoverage;
