import { RiskLevel, RiskAssessment, RiskAction } from "@/types";

interface EngineInput {
  matchConfidence: number; // 0-100
  liveness: {
    isBlinking: boolean;
    isSmiling: boolean;
    ear: number;
    status: string;
  };
  loginTime: Date;
  isTrustedDevice: boolean;
  isTrustedLocation: boolean;
  failedAttempts: number;
}

export function evaluateSecurityRisk(input: EngineInput): RiskAssessment {
  let score = 0;
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let action: RiskAction = "grant_access";
  let confidence = 95;

  // 1. Face Match Confidence
  if (input.matchConfidence < 90) {
    score += 80;
    reasons.push(`Face match confidence is critically low (${input.matchConfidence}%).`);
    recommendations.push("Ensure adequate lighting and look directly at the camera.");
    action = "block_access";
  } else if (input.matchConfidence < 95) {
    score += 40;
    reasons.push(`Face match confidence is moderate (${input.matchConfidence}%).`);
    action = action === "grant_access" ? "require_pin" : action;
  } else {
    reasons.push("Face matched successfully with high confidence.");
  }

  // 2. Liveness Detection
  // Assuming a static image wouldn't blink over time, though our simple check is immediate.
  if (input.liveness.ear > 0.35 && input.matchConfidence < 95) {
    // Possibly a spoof or very wide open eyes, increase risk slightly if confidence isn't perfect
    score += 15;
    reasons.push("Liveness checks indicated possible anomaly (no blink or static expression).");
    recommendations.push("Please blink naturally during the scan.");
  }

  // 3. Trusted Device
  if (!input.isTrustedDevice) {
    score += 25;
    reasons.push("Login attempt from an unrecognized device.");
    recommendations.push("If this is your new device, add it to Trusted Devices in Settings.");
    action = action === "grant_access" ? "require_pin" : action;
  }

  // 4. Trusted Location
  if (!input.isTrustedLocation) {
    score += 20;
    reasons.push("Login attempt from an unusual location.");
    recommendations.push("Avoid accessing sensitive vault items on public networks.");
  }

  // 5. Time of Day (Anomaly Detection)
  const hour = input.loginTime.getHours();
  const isOffHours = hour < 6 || hour > 23; // Between 11PM and 6AM
  if (isOffHours) {
    score += 15;
    reasons.push("Access requested during unusual hours.");
  }

  // 6. Failed Attempts
  if (input.failedAttempts > 0) {
    score += input.failedAttempts * 15;
    reasons.push(`${input.failedAttempts} recent failed authentication attempts detected.`);
    if (input.failedAttempts >= 3) {
      action = "block_access";
      recommendations.push("Too many failed attempts. Vault access is temporarily restricted.");
    }
  }

  // Cap score at 100
  score = Math.min(100, score);

  // Determine Level
  let level: RiskLevel = "safe";
  if (score >= 80) level = "critical";
  else if (score >= 60) level = "high";
  else if (score >= 40) level = "medium";
  else if (score >= 20) level = "low";

  // Override action based on final score if not already blocked
  if (action !== "block_access") {
    if (score >= 80) {
      action = "block_access";
    } else if (score >= 60) {
      action = "require_pin";
    } else if (score >= 40 && action === "grant_access") {
      action = "require_biometric"; // Optional middle tier
    }
  }

  // If granting access but score is above 0, adjust confidence
  confidence = 100 - (score * 0.5);

  return {
    score,
    level,
    reasons,
    recommendations,
    confidence,
    action,
    timestamp: new Date().toISOString()
  };
}
