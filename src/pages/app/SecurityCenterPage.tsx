import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Shield, ShieldCheck, ShieldAlert, Activity, MapPin, Smartphone, Clock, KeyRound, Copy, TriangleAlert as AlertTriangle, TrendingUp, CircleCheck as CheckCircle2, Circle as XCircle, Lightbulb, Eye } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { computeSecurityScore, riskColor, riskLabel } from "@/lib/securityEngine";
import { detectDuplicates } from "@/lib/vaultService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, ProgressRing, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

export default function SecurityCenterPage() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { vaultItems, passwordEntries, intruderEvents, securityEvents, behaviorSamples, recommendations, trustedDevices, trustedLocations } = useDataStore();

  const hourOfDay = new Date().getHours();

  const { score, assessment } = useMemo(() => {
    const weak = passwordEntries.filter((p) => p.is_weak);
    const dups = detectDuplicates(passwordEntries);
    const dupCount = passwordEntries.filter((p) => dups.has(p.id)).length;
    const recentIntruders = intruderEvents.filter((i) => (Date.now() - new Date(i.created_at).getTime()) / 86400000 <= 7).length;
    const behaviorAnomaly = behaviorSamples.length > 5
      ? behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length / behaviorSamples.length
      : 0;

    const s = computeSecurityScore({
      faceMatched: true, faceConfidence: 0.95, isTrustedLocation: true, isTrustedDevice: true,
      failedAttempts: 0, hasWeakPasswords: weak.length > 0, hasDuplicatePasswords: dupCount > 0,
      recentIntruders, backupCompletedDays: null, behaviorAnomaly, hourOfDay,
    });

    return { score: s, assessment: null };
  }, [passwordEntries, intruderEvents, behaviorSamples, hourOfDay]);

  const activeRecs = recommendations.filter((r) => !r.is_resolved);
  const goodFactors = score.factors.filter((f) => f.status === "good");
  const warningFactors = score.factors.filter((f) => f.status === "warning");
  const dangerFactors = score.factors.filter((f) => f.status === "danger");

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="AI Security Center" subtitle="Explainable AI risk analysis and security recommendations" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Main Score */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="h-full flex flex-col items-center justify-center" glow>
            <p className="text-xs text-muted uppercase tracking-wider mb-3">AI Security Score</p>
            <ProgressRing value={score.score} size={160} stroke={12} color={riskColor(score.level)} label={`${score.score}`} sublabel="out of 100" />
            <div className="mt-4 flex items-center gap-2">
              <Badge color={riskColor(score.level)}>{riskLabel(score.level)}</Badge>
            </div>
            <p className="text-xs text-muted mt-3 text-center max-w-xs">Computed from {score.factors.length} factors including face match, location, device trust, behavior analysis, and password health</p>
          </Card>
        </motion.div>

        {/* Factor Summary */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-accent" /> Factor Summary</h3>
            <div className="space-y-3">
              <FactorSummaryRow icon={<CheckCircle2 className="w-4 h-4 text-success" />} label="Good" count={goodFactors.length} color="#22C55E" />
              <FactorSummaryRow icon={<AlertTriangle className="w-4 h-4 text-warning" />} label="Warnings" count={warningFactors.length} color="#F59E0B" />
              <FactorSummaryRow icon={<XCircle className="w-4 h-4 text-danger" />} label="Critical" count={dangerFactors.length} color="#EF4444" />
            </div>
            <div className="mt-4 pt-4 border-t border-base-border space-y-2">
              <StatRow icon={<MapPin className="w-4 h-4 text-muted" />} label="Trusted Locations" value={trustedLocations.length} />
              <StatRow icon={<Smartphone className="w-4 h-4 text-muted" />} label="Trusted Devices" value={trustedDevices.length} />
              <StatRow icon={<Eye className="w-4 h-4 text-muted" />} label="Behavior Samples" value={behaviorSamples.length} />
            </div>
          </Card>
        </motion.div>

        {/* Recommendations */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-accent" /> AI Recommendations</h3>
            {activeRecs.length === 0 ? (
              <div className="text-center py-8"><CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" /><p className="text-sm text-muted">All clear! No active recommendations.</p></div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar">
                {activeRecs.map((rec) => (
                  <div key={rec.id} className="flex items-start gap-3 pb-3 border-b border-base-border last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: rec.priority === "critical" ? "#EF444422" : rec.priority === "high" ? "#F9731622" : rec.priority === "medium" ? "#F59E0B22" : "#22C55E22" }}>
                      <Lightbulb className="w-4 h-4" style={{ color: rec.priority === "critical" ? "#EF4444" : rec.priority === "high" ? "#F97316" : rec.priority === "medium" ? "#F59E0B" : "#22C55E" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{rec.title}</p>
                      <p className="text-xs text-muted mt-0.5">{rec.description}</p>
                      <Badge color={rec.priority === "critical" ? "#EF4444" : rec.priority === "high" ? "#F97316" : rec.priority === "medium" ? "#F59E0B" : "#22C55E"}>{rec.priority}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Explainable AI — Factor Breakdown */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" /> Explainable AI — Factor Breakdown
        </h3>
        <div className="space-y-3">
          {score.factors.map((factor, i) => (
            <motion.div key={factor.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-3 rounded-xl bg-base-surface">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: factor.status === "good" ? "#22C55E22" : factor.status === "warning" ? "#F59E0B22" : "#EF444422",
              }}>
                {factor.status === "good" ? <ShieldCheck className="w-5 h-5 text-success" /> : factor.status === "warning" ? <AlertTriangle className="w-5 h-5 text-warning" /> : <ShieldAlert className="w-5 h-5 text-danger" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{factor.label}</p>
                  {factor.penalty > 0 && <span className="text-xs text-danger font-mono">-{factor.penalty} pts</span>}
                </div>
                <p className="text-xs text-muted mt-0.5">{factor.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Security Timeline</h3>
          <button onClick={() => navigate("/app/timeline")} className="text-xs text-accent hover:underline">View all</button>
        </div>
        {securityEvents.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">No security events recorded</p>
        ) : (
          <div className="space-y-2">
            {securityEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="flex items-center gap-3 py-2 border-b border-base-border last:border-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: event.severity === "critical" ? "#EF4444" : event.severity === "high" ? "#F97316" : event.severity === "medium" ? "#F59E0B" : event.severity === "low" ? "#84CC16" : "#22C55E" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{event.title}</p>
                  <p className="text-xs text-muted">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                </div>
                <Badge color={event.severity === "critical" ? "#EF4444" : event.severity === "high" ? "#F97316" : event.severity === "medium" ? "#F59E0B" : event.severity === "low" ? "#84CC16" : "#22C55E"}>{event.severity}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function FactorSummaryRow({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-base-surface">
      <div className="flex items-center gap-2">{icon}<span className="text-sm text-muted-light">{label}</span></div>
      <span className="text-lg font-bold" style={{ color }}>{count}</span>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">{icon}<span className="text-xs text-muted">{label}</span></div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
