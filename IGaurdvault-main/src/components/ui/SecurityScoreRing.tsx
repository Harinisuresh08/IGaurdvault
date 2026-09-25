import { motion } from "framer-motion";
import clsx from "clsx";
import { colorForTier, labelForTier, tierFromScore } from "@/lib/securityEngine";
import { Shield } from "lucide-react";

export function SecurityScoreRing({
  score,
  size = 180,
  showLabel = true,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
}) {
  const tier = tierFromScore(score);
  const color = colorForTier(tier);
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#22304A"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <Shield size={20} style={{ color }} className="mb-1" />
        <motion.span
          className="font-mono text-4xl font-bold text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {score}
        </motion.span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          / 100
        </span>
        {showLabel && (
          <span
            className="mt-2 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: `${color}1a`, color }}
          >
            {labelForTier(tier)}
          </span>
        )}
      </div>
    </div>
  );
}

export function MiniScoreBar({ score }: { score: number }) {
  const tier = tierFromScore(score);
  const color = colorForTier(tier);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-base-elevated">
        <motion.div
          className={clsx("h-full rounded-full")}
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <span className="font-mono text-xs text-muted-light">{score}</span>
    </div>
  );
}
