import type { SecurityScore, ScoreFactor, RiskLevel, RiskAssessment, RiskAction, AIInsight, ScoreInput } from "@/types";

export function riskLevelFromScore(score: number): RiskLevel {
  if (score < 20) return "safe";
  if (score < 40) return "low";
  if (score < 60) return "medium";
  if (score < 80) return "high";
  return "critical";
}

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "safe": return "#22C55E";
    case "low": return "#84CC16";
    case "medium": return "#F59E0B";
    case "high": return "#F97316";
    case "critical": return "#EF4444";
  }
}

export function riskLabel(level: RiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1) + " Risk";
}

export function colorForTier(level: RiskLevel): string {
  return riskColor(level);
}

export function labelForTier(level: RiskLevel): string {
  return riskLabel(level);
}

export function tierFromScore(score: number): RiskLevel {
  return riskLevelFromScore(score);
}

export function isLocationTrusted(lat: number | null, lng: number | null, trustedLocations?: any[]): { trusted: boolean; nearest?: any } {
  return { trusted: lat !== null && lng !== null }; // Stub implementation
}

export type { ScoreInput };

export function computeSecurityScore(input: ScoreInput): SecurityScore {
  const {
    faceMatched = false,
    faceConfidence = 0,
    isTrustedLocation = false,
    isTrustedDevice = false,
    failedAttempts = 0,
    hasWeakPasswords = false,
    hasDuplicatePasswords = false,
    recentIntruders = 0,
    backupCompletedDays = null,
    behaviorAnomaly = 0,
    hourOfDay = 12,
  } = input;

  const factors: ScoreFactor[] = [];
  let score = 100;

  if (!faceMatched) {
    score -= 40;
    factors.push({ key: "face", label: "Face Recognition", status: "danger", penalty: 40, detail: "Face not matched — unauthorized access attempt" });
  } else if (faceConfidence < 0.85) {
    score -= 10;
    factors.push({ key: "face", label: "Face Confidence", status: "warning", penalty: 10, detail: `Low confidence (${Math.round(faceConfidence * 100)}%)` });
  } else {
    factors.push({ key: "face", label: "Face Recognition", status: "good", penalty: 0, detail: `Face matched with ${Math.round(faceConfidence * 100)}% confidence` });
  }

  if (!isTrustedLocation) {
    score -= 15;
    factors.push({ key: "location", label: "Location Trust", status: "warning", penalty: 15, detail: "Vault accessed from an unknown location" });
  } else {
    factors.push({ key: "location", label: "Location Trust", status: "good", penalty: 0, detail: "Accessed from a trusted location" });
  }

  if (!isTrustedDevice) {
    score -= 12;
    factors.push({ key: "device", label: "Device Trust", status: "warning", penalty: 12, detail: "Accessed from an unrecognized device" });
  } else {
    factors.push({ key: "device", label: "Device Trust", status: "good", penalty: 0, detail: "Accessed from a trusted device" });
  }

  if (failedAttempts >= 5) {
    score -= 20;
    factors.push({ key: "attempts", label: "Failed Attempts", status: "danger", penalty: 20, detail: `${failedAttempts} failed login attempts detected` });
  } else if (failedAttempts >= 2) {
    score -= 8;
    factors.push({ key: "attempts", label: "Failed Attempts", status: "warning", penalty: 8, detail: `${failedAttempts} recent failed attempts` });
  } else {
    factors.push({ key: "attempts", label: "Login Attempts", status: "good", penalty: 0, detail: "No suspicious login attempts" });
  }

  if (hasWeakPasswords) {
    score -= 12;
    factors.push({ key: "passwords", label: "Password Health", status: "warning", penalty: 12, detail: "Weak passwords detected in vault" });
  } else {
    factors.push({ key: "passwords", label: "Password Health", status: "good", penalty: 0, detail: "All passwords meet strength requirements" });
  }

  if (hasDuplicatePasswords) {
    score -= 8;
    factors.push({ key: "duplicates", label: "Duplicate Passwords", status: "warning", penalty: 8, detail: "Duplicate passwords found across accounts" });
  } else {
    factors.push({ key: "duplicates", label: "Duplicate Passwords", status: "good", penalty: 0, detail: "No duplicate passwords" });
  }

  if (recentIntruders >= 3) {
    score -= 18;
    factors.push({ key: "intruders", label: "Intruder Activity", status: "danger", penalty: 18, detail: `${recentIntruders} intruder attempts in recent history` });
  } else if (recentIntruders >= 1) {
    score -= 8;
    factors.push({ key: "intruders", label: "Intruder Activity", status: "warning", penalty: 8, detail: `${recentIntruders} intruder attempt(s) detected` });
  } else {
    factors.push({ key: "intruders", label: "Intruder Activity", status: "good", penalty: 0, detail: "No recent intruder attempts" });
  }

  if (backupCompletedDays === null) {
    score -= 10;
    factors.push({ key: "backup", label: "Backup Status", status: "warning", penalty: 10, detail: "No backup has been performed yet" });
  } else if (backupCompletedDays > 30) {
    score -= 7;
    factors.push({ key: "backup", label: "Backup Status", status: "warning", penalty: 7, detail: `Last backup was ${backupCompletedDays} days ago` });
  } else {
    factors.push({ key: "backup", label: "Backup Status", status: "good", penalty: 0, detail: "Backup is up to date" });
  }

  if (behaviorAnomaly > 0.6) {
    score -= 15;
    factors.push({ key: "behavior", label: "Behavior Analysis", status: "danger", penalty: 15, detail: `Anomalous access pattern (${Math.round(behaviorAnomaly * 100)}% deviation)` });
  } else if (behaviorAnomaly > 0.3) {
    score -= 7;
    factors.push({ key: "behavior", label: "Behavior Analysis", status: "warning", penalty: 7, detail: `Slightly unusual access pattern (${Math.round(behaviorAnomaly * 100)}% deviation)` });
  } else {
    factors.push({ key: "behavior", label: "Behavior Analysis", status: "good", penalty: 0, detail: "Access pattern matches your normal behavior" });
  }

  if (hourOfDay >= 1 && hourOfDay <= 5) {
    score -= 5;
    factors.push({ key: "time", label: "Access Time", status: "warning", penalty: 5, detail: "Vault accessed during unusual hours (1 AM - 5 AM)" });
  } else {
    factors.push({ key: "time", label: "Access Time", status: "good", penalty: 0, detail: "Access during normal hours" });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, level: riskLevelFromScore(100 - score), factors, updated_at: new Date().toISOString() };
}

export function assessRisk(input: ScoreInput): RiskAssessment {
  const {
    faceMatched = false,
    faceConfidence = 0,
    isTrustedLocation = false,
    isTrustedDevice = false,
    failedAttempts = 0,
    hasWeakPasswords = false,
    backupCompletedDays = null,
    behaviorAnomaly = 0,
    hourOfDay = 12,
  } = input;

  const reasons: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  if (!faceMatched) {
    riskScore += 50;
    reasons.push("Face does not match stored embeddings");
    recommendations.push("Register your face if this is a new device or appearance change");
  } else if (faceConfidence < 0.85) {
    riskScore += 10;
    reasons.push(`Low face confidence (${Math.round(faceConfidence * 100)}%)`);
    recommendations.push("Ensure good lighting and face the camera directly");
  }

  if (!isTrustedLocation) {
    riskScore += 15;
    reasons.push("Access from unknown location");
    recommendations.push("Add this location to trusted zones if you recognize it");
  }
  if (!isTrustedDevice) {
    riskScore += 12;
    reasons.push("Access from unrecognized device");
    recommendations.push("Verify this is your device and add to trusted devices");
  }
  if (failedAttempts >= 5) {
    riskScore += 25;
    reasons.push(`${failedAttempts} failed login attempts`);
    recommendations.push("Review recent activity and consider changing your PIN");
  } else if (failedAttempts >= 2) {
    riskScore += 8;
    reasons.push(`${failedAttempts} recent failed attempts`);
  }
  if (hourOfDay >= 1 && hourOfDay <= 5) {
    riskScore += 10;
    reasons.push("Late night login (1 AM - 5 AM)");
    recommendations.push("Enable Two-Factor Authentication for off-hours access");
  }
  if (behaviorAnomaly > 0.5) {
    riskScore += 15;
    reasons.push(`Anomalous behavior pattern (${Math.round(behaviorAnomaly * 100)}% deviation)`);
    recommendations.push("Review your recent login history for unfamiliar activity");
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  let action: RiskAction;
  if (riskScore < 20) action = "grant_access";
  else if (riskScore < 50) action = "require_pin";
  else if (riskScore < 75) action = "require_biometric";
  else action = "block_access";

  if (hasWeakPasswords) recommendations.push("Update weak passwords to improve your security score");
  if (backupCompletedDays === null || (backupCompletedDays ?? 0) > 30)
    recommendations.push("Perform a vault backup to secure your data");
  if (recommendations.length === 0) recommendations.push("Your security posture is strong. Keep it up!");

  return {
    score: riskScore,
    level: riskLevelFromScore(riskScore),
    reasons,
    recommendations,
    confidence: faceMatched ? Math.max(0.5, 1 - riskScore / 100) : 0.1,
    action,
    timestamp: new Date().toISOString(),
  };
}

export function generateInsights(params: {
  vaultItemCount: number;
  passwordCount: number;
  weakPasswords: number;
  duplicatePasswords: number;
  recentIntruders: number;
  securityScore: number;
  backupDays: number | null;
  expiringItems: number;
}): AIInsight[] {
  const insights: AIInsight[] = [];
  if (params.weakPasswords > 0)
    insights.push({ type: "warning", title: "Weak Passwords Detected", message: `${params.weakPasswords} password(s) are weak. Update them to improve your security score.`, action: "Review Passwords", icon: "KeyRound" });
  if (params.duplicatePasswords > 0)
    insights.push({ type: "warning", title: "Duplicate Passwords", message: `${params.duplicatePasswords} duplicate password(s) found. Use unique passwords for each account.`, action: "Review Passwords", icon: "Copy" });
  if (params.recentIntruders > 0)
    insights.push({ type: "danger", title: "Intruder Attempts", message: `${params.recentIntruders} unauthorized access attempt(s) detected. Review the Intruder Center.`, action: "View Intruder Center", icon: "ShieldAlert" });
  if (params.securityScore < 60)
    insights.push({ type: "warning", title: "Security Score Needs Attention", message: `Your security score is ${params.securityScore}. Review the Security Center for recommendations.`, action: "Open Security Center", icon: "ShieldCheck" });
  if (params.backupDays === null)
    insights.push({ type: "warning", title: "Backup Overdue", message: "You have not backed up your vault yet. Create an encrypted backup in Settings.", action: "Backup Now", icon: "Download" });
  else if (params.backupDays > 30)
    insights.push({ type: "warning", title: "Backup Overdue", message: `Your last backup was ${params.backupDays} days ago. Regular backups protect your data.`, action: "Backup Now", icon: "Download" });
  if (params.expiringItems > 0)
    insights.push({ type: "warning", title: "Documents Expiring Soon", message: `${params.expiringItems} document(s) expire within 30 days. Renew them in time.`, action: "View Vault", icon: "Calendar" });
  if (params.vaultItemCount === 0)
    insights.push({ type: "info", title: "Vault is Empty", message: "Start adding documents, passwords, and cards to your secure vault.", action: "Add Item", icon: "Lock" });
  if (params.securityScore >= 80 && params.recentIntruders === 0)
    insights.push({ type: "success", title: "Excellent Security Posture", message: "Your vault is well-protected. Keep maintaining strong passwords and regular backups.", icon: "ShieldCheck" });
  return insights;
}

export function buildRiskSummary(scoreLogs: any[], threatEvents: any[], intruderEvents: any[], behaviorSamples: any[], trustedLocations: any[]) {
  return {
    totalEvents: threatEvents.length,
    intruderCount: intruderEvents.length,
    behaviorAnomalies: behaviorSamples.length
  };
}

export function analyzeBehavior(params: any): { label: string; confidence: number; explanation: string; factors: string[] } {
  if (params.repeatedFailures > 0) return { label: "suspicious", confidence: 0.8, explanation: "Repeated failures detected", factors: ["Failed login attempts"] };
  if (params.isKnownLocation === false) return { label: "suspicious", confidence: 0.6, explanation: "Unknown location", factors: ["Location anomaly"] };
  return { label: "normal", confidence: 0.9, explanation: "Behavior matches baseline", factors: ["Normal usage pattern"] };
}
