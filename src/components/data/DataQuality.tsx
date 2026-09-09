import type { DataQualityScore } from '@/types/dataset';
import { cn } from '@/lib/utils';

interface DataQualityProps {
  score: DataQualityScore;
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  const color =
    value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function DataQuality({ score }: DataQualityProps) {
  const ringColor =
    score.overall >= 80
      ? 'text-green-600'
      : score.overall >= 60
      ? 'text-amber-500'
      : 'text-red-500';

  const gradeColor =
    score.grade === 'Excellent'
      ? 'text-green-700 bg-green-50 border-green-200'
      : score.grade === 'Good'
      ? 'text-blue-700 bg-blue-50 border-blue-200'
      : score.grade === 'Fair'
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-red-700 bg-red-50 border-red-200';

  // SVG ring
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (score.overall / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* Score ring */}
      <div className="flex items-center gap-5">
        <div className="relative flex items-center justify-center">
          <svg width="96" height="96" className="-rotate-90">
            <circle cx="48" cy="48" r={r} stroke="#f1f5f9" strokeWidth="8" fill="none" />
            <circle
              cx="48"
              cy="48"
              r={r}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={cn('transition-all', ringColor)}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={cn('text-2xl font-bold', ringColor)}>{score.overall}</span>
            <span className="text-[10px] text-slate-400">/ 100</span>
          </div>
        </div>

        <div>
          <span
            className={cn(
              'inline-block rounded border px-2.5 py-1 text-sm font-semibold mb-1',
              gradeColor,
            )}
          >
            {score.grade}
          </span>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[160px]">
            Data quality score based on completeness, validity, and field coverage.
          </p>
        </div>
      </div>

      {/* Factor bars */}
      <div className="space-y-2.5">
        <ScoreBar value={score.factors.completeness} label="Completeness" />
        <ScoreBar value={score.factors.uniqueness} label="Uniqueness" />
        <ScoreBar value={score.factors.validity} label="Validity" />
        <ScoreBar value={score.factors.consistency} label="Consistency" />
        <ScoreBar value={score.factors.requiredFields} label="Required Field Coverage" />
      </div>
    </div>
  );
}
