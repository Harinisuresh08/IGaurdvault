import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, KeyRound, TriangleAlert as AlertTriangle, Activity, TrendingUp, Clock, FileText, Brain, ArrowRight, CircleCheck as CheckCircle2, Circle as XCircle, Lightbulb, Zap, Copy, ShieldAlert, ShieldCheck, Download, Calendar } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";
import { computeSecurityScore, generateInsights, riskColor, riskLabel } from "@/lib/securityEngine";
import { detectDuplicates } from "@/lib/vaultService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, ProgressRing, Badge } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<string, typeof Shield> = {
  Shield, Lock, KeyRound, AlertTriangle, Activity, FileText, Brain,
  CheckCircle2, XCircle, Lightbulb, ShieldCheck, ShieldAlert, Copy, Download, Calendar,
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const {
    vaultItems, passwordEntries, intruderEvents, securityEvents,
    recommendations, behaviorSamples,
  } = useDataStore();

  const hourOfDay = new Date().getHours();

  const { scoreData, insights, weakCount, duplicateCount, expiringCount } = useMemo(() => {
    const weak = passwordEntries.filter((p) => p.is_weak);
    const dups = detectDuplicates(passwordEntries);
    const dupCount = passwordEntries.filter((p) => dups.has(p.id)).length;
    const expiring = vaultItems.filter((v) => {
      if (!v.expires_at) return false;
      const days = (new Date(v.expires_at).getTime() - Date.now()) / 86400000;
      return days <= 30 && days >= 0;
    });

    const recentIntruders = intruderEvents.filter((i) => {
      const days = (Date.now() - new Date(i.created_at).getTime()) / 86400000;
      return days <= 7;
    }).length;

    const behaviorAnomaly = behaviorSamples.length > 5
      ? behaviorSamples.filter((s) => s.anomaly_label === "anomaly").length / behaviorSamples.length
      : 0;

    const sd = computeSecurityScore({
      faceMatched: true,
      faceConfidence: 0.95,
      isTrustedLocation: true,
      isTrustedDevice: true,
      failedAttempts: 0,
      hasWeakPasswords: weak.length > 0,
      hasDuplicatePasswords: dupCount > 0,
      recentIntruders,
      backupCompletedDays: null,
      behaviorAnomaly,
      hourOfDay,
    });

    const ins = generateInsights({
      vaultItemCount: vaultItems.length,
      passwordCount: passwordEntries.length,
      weakPasswords: weak.length,
      duplicatePasswords: dupCount,
      recentIntruders,
      securityScore: sd.score,
      backupDays: null,
      expiringItems: expiring.length,
    });

    return { scoreData: sd, insights: ins, weakCount: weak.length, duplicateCount: dupCount, expiringCount: expiring.length };
  }, [vaultItems, passwordEntries, intruderEvents, behaviorSamples, hourOfDay]);

  const greeting = hourOfDay < 12 ? "Good Morning" : hourOfDay < 18 ? "Good Afternoon" : "Good Evening";
  const firstName = profile?.display_name?.split(" ")[0] ?? "User";

  const recentEvents = securityEvents.slice(0, 5);
  const activeRecs = recommendations.filter((r) => !r.is_resolved).slice(0, 3);

  const categoryGroups = {
    documents: vaultItems.filter((v) => ["document", "certificate"].includes(v.category)).length,
    identity: vaultItems.filter((v) => ["passport", "pan_card", "aadhaar", "driving_license"].includes(v.category)).length,
    financial: vaultItems.filter((v) => v.category === "card").length,
    personal: vaultItems.filter((v) => ["medical", "note", "image", "video"].includes(v.category)).length,
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        subtitle="Your AI Digital Guardian is actively monitoring your security"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Security Score */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="h-full flex flex-col items-center justify-center" glow>
            <div className="text-center mb-3">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">AI Security Score</p>
            </div>
            <ProgressRing
              value={scoreData.score}
              size={140}
              stroke={10}
              color={riskColor(scoreData.level)}
              label={`${scoreData.score}`}
              sublabel="out of 100"
            />
            <div className="mt-3 flex items-center gap-2">
              <Badge color={riskColor(scoreData.level)}>{riskLabel(scoreData.level)}</Badge>
              <span className="text-xs text-muted">{scoreData.factors.length} factors analyzed</span>
            </div>
            <button
              onClick={() => navigate("/app/security")}
              className="mt-3 text-xs text-accent hover:underline flex items-center gap-1"
            >
              View details <ArrowRight className="w-3 h-3" />
            </button>
          </Card>
        </motion.div>

        {/* Vault Summary */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Vault Summary</h3>
              <Lock className="w-4 h-4 text-accent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Documents", value: categoryGroups.documents, icon: FileText, color: "#00E5FF" },
                { label: "Identity", value: categoryGroups.identity, icon: Shield, color: "#3B82F6" },
                { label: "Cards", value: categoryGroups.financial, icon: Lock, color: "#EC4899" },
                { label: "Personal", value: categoryGroups.personal, icon: Activity, color: "#22C55E" },
              ].map((stat) => (
                <div key={stat.label} className="bg-base-surface rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-xs text-muted">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/app/vault")}
              className="mt-3 text-xs text-accent hover:underline flex items-center gap-1"
            >
              Open vault <ArrowRight className="w-3 h-3" />
            </button>
          </Card>
        </motion.div>

        {/* Password Health */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Password Health</h3>
              <KeyRound className="w-4 h-4 text-accent" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-light">Total Passwords</span>
                <span className="text-lg font-bold text-white">{passwordEntries.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-light">Weak</span>
                <span className="text-lg font-bold" style={{ color: weakCount > 0 ? "#EF4444" : "#22C55E" }}>{weakCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-light">Duplicates</span>
                <span className="text-lg font-bold" style={{ color: duplicateCount > 0 ? "#F59E0B" : "#22C55E" }}>{duplicateCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-light">Expiring Soon</span>
                <span className="text-lg font-bold" style={{ color: expiringCount > 0 ? "#F59E0B" : "#22C55E" }}>{expiringCount}</span>
              </div>
            </div>
            <button
              onClick={() => navigate("/app/passwords")}
              className="mt-3 text-xs text-accent hover:underline flex items-center gap-1"
            >
              Review passwords <ArrowRight className="w-3 h-3" />
            </button>
          </Card>
        </motion.div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent" /> AI Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.slice(0, 6).map((insight, i) => {
              const Icon = (insight.icon && iconMap[insight.icon]) || Lightbulb;
              const color = insight.type === "danger" ? "#EF4444" : insight.type === "warning" ? "#F59E0B" : insight.type === "success" ? "#22C55E" : "#00E5FF";
              return (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                  <Card className="h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
                        <Icon className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{insight.title}</p>
                        <p className="text-xs text-muted mt-1">{insight.message}</p>
                        {insight.action && (
                          <button className="text-xs text-accent hover:underline mt-2">{insight.action}</button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" /> Recent Activity
            </h3>
            <button onClick={() => navigate("/app/timeline")} className="text-xs text-accent hover:underline">View all</button>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 pb-3 border-b border-base-border last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-base-elevated flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-muted-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{event.title}</p>
                    <p className="text-xs text-muted">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                  </div>
                  <Badge color={
                    event.severity === "critical" ? "#EF4444" :
                    event.severity === "high" ? "#F97316" :
                    event.severity === "medium" ? "#F59E0B" :
                    event.severity === "low" ? "#84CC16" : "#22C55E"
                  }>{event.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Recommendations
            </h3>
            <button onClick={() => navigate("/app/security")} className="text-xs text-accent hover:underline">View all</button>
          </div>
          {activeRecs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-sm text-muted">All clear! No active recommendations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRecs.map((rec) => (
                <div key={rec.id} className="flex items-start gap-3 pb-3 border-b border-base-border last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                    background: rec.priority === "critical" ? "#EF444422" : rec.priority === "high" ? "#F9731622" : rec.priority === "medium" ? "#F59E0B22" : "#22C55E22",
                  }}>
                    <Lightbulb className="w-4 h-4" style={{
                      color: rec.priority === "critical" ? "#EF4444" : rec.priority === "high" ? "#F97316" : rec.priority === "medium" ? "#F59E0B" : "#22C55E",
                    }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{rec.title}</p>
                    <p className="text-xs text-muted mt-0.5">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Threat Level Banner */}
      {intruderEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4"
          onClick={() => navigate("/app/intruders")}
        >
          <div className="glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-base-card transition-all border border-danger/20" style={{ borderColor: intruderEvents.length > 2 ? "#EF444433" : "#F59E0B33" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: intruderEvents.length > 2 ? "#EF444422" : "#F59E0B22" }}>
              <AlertTriangle style={{ width: 24, height: 24, color: intruderEvents.length > 2 ? "#EF4444" : "#F59E0B" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{intruderEvents.length} Intruder Event{intruderEvents.length !== 1 ? "s" : ""} Detected</p>
              <p className="text-xs text-muted">Review the Intruder Center for details and evidence</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
