import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Clock, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, KeyRound, Shield, Activity, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { computeSecurityScore, riskColor, riskLabel } from "@/lib/securityEngine";
import { detectDuplicates } from "@/lib/vaultService";
import { logSecurityEvent, logSecurityScore } from "@/lib/securityService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, Badge } from "@/components/ui";
import { format } from "date-fns";

export default function ReportsPage() {
  const { user, profile } = useAuthStore();
  const { vaultItems, passwordEntries, intruderEvents, securityEvents, behaviorSamples, recommendations } = useDataStore();

  const { score, summary } = useMemo(() => {
    const weak = passwordEntries.filter((p) => p.is_weak);
    const dups = detectDuplicates(passwordEntries);
    const dupCount = passwordEntries.filter((p) => dups.has(p.id)).length;
    const recentIntruders = intruderEvents.filter((i) => (Date.now() - new Date(i.created_at).getTime()) / 86400000 <= 7).length;
    const behaviorAnomaly = behaviorSamples.length > 5 ? behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length / behaviorSamples.length : 0;

    const s = computeSecurityScore({
      faceMatched: true, faceConfidence: 0.95, isTrustedLocation: true, isTrustedDevice: true,
      failedAttempts: 0, hasWeakPasswords: weak.length > 0, hasDuplicatePasswords: dupCount > 0,
      recentIntruders, backupCompletedDays: null, behaviorAnomaly, hourOfDay: new Date().getHours(),
    });

    return {
      score: s,
      summary: {
        vaultItems: vaultItems.length, passwords: passwordEntries.length,
        weakPasswords: weak.length, duplicatePasswords: dupCount,
        intruderEvents: intruderEvents.length, recentIntruders,
        securityEvents: securityEvents.length, activeRecommendations: recommendations.filter((r) => !r.is_resolved).length,
        behaviorSamples: behaviorSamples.length, avgPasswordStrength: passwordEntries.length > 0 ? Math.round(passwordEntries.reduce((a, p) => a + p.strength_score, 0) / passwordEntries.length) : 0,
      },
    };
  }, [vaultItems, passwordEntries, intruderEvents, securityEvents, behaviorSamples, recommendations]);

  const generateReport = () => {
    if (!user) return;
    const reportData = {
      title: "iGuard One Security Report",
      generated: new Date().toISOString(),
      user: profile?.display_name,
      score: score.score,
      level: score.level,
      factors: score.factors,
      summary,
      events: securityEvents.slice(0, 20),
      intruders: intruderEvents.slice(0, 10),
      recommendations: recommendations.filter((r) => !r.is_resolved),
    };

    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iguard-report-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);

    logSecurityEvent({ user_id: user.id, type: "report_generated", severity: "info", title: "Security Report Generated", description: `Report generated with score ${score.score}/100` });
    logSecurityScore({ user_id: user.id, score: score.score, risk_tier: score.level, factors: { factors: score.factors } });
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <PageHeader title="Reports" subtitle="Generate and export professional security reports" action={<Button icon={<Download className="w-4 h-4" />} onClick={generateReport}>Export Report</Button>} />

      {/* Report Preview */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-base-border">
            <div>
              <h2 className="text-lg font-bold text-white">iGuard One Security Report</h2>
              <p className="text-xs text-muted">{format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <Shield className="w-8 h-8 text-accent" />
          </div>

          {/* Score Section */}
          <div className="flex items-center gap-6 mb-6">
            <div className="text-center">
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ border: `8px solid ${riskColor(score.level)}33` }}>
                <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ border: `2px solid ${riskColor(score.level)}` }}>
                  <span className="text-2xl font-bold text-white">{score.score}</span>
                </div>
              </div>
              <p className="text-xs text-muted mt-2">Security Score</p>
            </div>
            <div className="flex-1">
              <Badge color={riskColor(score.level)}>{riskLabel(score.level)}</Badge>
              <p className="text-sm text-muted mt-2">{score.factors.length} factors analyzed including face recognition, location trust, device trust, behavior analysis, and password health</p>
            </div>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <SummaryCard icon={<FileText className="w-4 h-4" />} label="Vault Items" value={summary.vaultItems} color="#00E5FF" />
            <SummaryCard icon={<KeyRound className="w-4 h-4" />} label="Passwords" value={summary.passwords} color="#22C55E" />
            <SummaryCard icon={<AlertTriangle className="w-4 h-4" />} label="Intruder Events" value={summary.intruderEvents} color="#EF4444" />
            <SummaryCard icon={<Activity className="w-4 h-4" />} label="Security Events" value={summary.securityEvents} color="#F59E0B" />
            <SummaryCard icon={<KeyRound className="w-4 h-4" />} label="Weak Passwords" value={summary.weakPasswords} color={summary.weakPasswords > 0 ? "#EF4444" : "#22C55E"} />
            <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="Avg Pwd Strength" value={`${summary.avgPasswordStrength}%`} color={summary.avgPasswordStrength >= 70 ? "#22C55E" : "#F59E0B"} />
            <SummaryCard icon={<AlertTriangle className="w-4 h-4" />} label="Recent Intruders" value={summary.recentIntruders} color={summary.recentIntruders > 0 ? "#EF4444" : "#22C55E"} />
            <SummaryCard icon={<CheckCircle2 className="w-4 h-4" />} label="Active Recs" value={summary.activeRecommendations} color="#F59E0B" />
          </div>

          {/* Factor Breakdown */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Security Factors</h3>
            <div className="space-y-2">
              {score.factors.map((f) => (
                <div key={f.key} className="flex items-center justify-between p-2.5 rounded-lg bg-base-surface">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: f.status === "good" ? "#22C55E" : f.status === "warning" ? "#F59E0B" : "#EF4444" }} />
                    <span className="text-sm text-white">{f.label}</span>
                  </div>
                  <span className="text-xs text-muted">{f.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {securityEvents.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center gap-3 py-2 border-b border-base-border last:border-0">
                  <Clock className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  <p className="text-sm text-white flex-1 truncate">{event.title}</p>
                  <span className="text-xs text-muted">{format(new Date(event.created_at), "MMM d, h:mm a")}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      <p className="text-xs text-muted-faint text-center">Reports are generated locally and include your security score, risk factors, activity timeline, and recommendations.</p>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-base-surface rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <div style={{ color }}>{icon}</div>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
