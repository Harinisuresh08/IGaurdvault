import { supabase } from "@/lib/supabase";
import type { EventType, SecurityEvent, AppNotification } from "@/types";

export async function logSecurityEvent(params: {
  user_id: string;
  type?: EventType;
  event_type?: EventType;
  severity?: SecurityEvent["severity"];
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  location?: string | null;
  device_info?: string | null;
  risk_score?: number | null;
}): Promise<void> {
  const { error } = await supabase.from("threat_events").insert({
    user_id: params.user_id,
    event_type: params.type ?? params.event_type ?? "login_success",
    severity: params.severity ?? "info",
    title: params.title,
    description: params.description,
    metadata: params.metadata ?? {},
    risk_score: params.risk_score ?? null,
    location: params.location ?? null,
    device_info: params.device_info ?? null,
  });
  if (error) console.error("Failed to log event:", error.message);
}

export async function logThreatEvent(params: any): Promise<void> {
  return logSecurityEvent(params);
}

export async function logIntruderEvent(params: {
  user_id: string;
  photo_base64?: string | null;
  location_label?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  device_name?: string | null;
  network_type?: string | null;
  confidence_score?: number;
  threat_level?: string;
  ai_explanation?: string;
  evidence?: Record<string, unknown>;
  [key: string]: any;
}): Promise<void> {
  const { error } = await supabase.from("intruder_events").insert({
    user_id: params.user_id,
    photo_base64: params.photo_base64 ?? null,
    location_label: params.location_label ?? null,
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    device_name: params.device_name ?? null,
    network_type: params.network_type ?? null,
    confidence_score: params.confidence_score ?? 0,
    threat_level: params.threat_level ?? "medium",
    status: "new",
    ai_explanation: params.ai_explanation ?? "",
    evidence: params.evidence ?? {},
  });
  if (error) console.error("Failed to log intruder:", error.message);
}

export async function pushNotification(params: {
  user_id: string;
  title: string;
  message?: string;
  body?: string;
  type?: AppNotification["type"];
  action_url?: string | null;
  [key: string]: any;
}): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.user_id,
    title: params.title,
    body: params.message ?? params.body ?? "",
    type: params.type ?? "info",
    is_read: false,
    action_url: params.action_url ?? null,
  });
  if (error) console.error("Failed to push notification:", error.message);
}

export async function logBehaviorSample(params: {
  user_id: string;
  unlock_time?: string;
  usage_pattern?: string;
  repeated_failures?: number;
  anomaly_label?: string;
  confidence?: number;
  explanation?: string;
}): Promise<void> {
  const { error } = await supabase.from("behavior_samples").insert({
    user_id: params.user_id,
    unlock_time: params.unlock_time ?? new Date().toISOString(),
    usage_pattern: params.usage_pattern ?? "normal",
    repeated_failures: params.repeated_failures ?? 0,
    anomaly_label: params.anomaly_label ?? "normal",
    confidence: params.confidence ?? 1.0,
    explanation: params.explanation ?? null,
  });
  if (error) console.error("Failed to log behavior:", error.message);
}

export async function logChatMessage(params: {
  user_id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("chat_messages").insert({
    user_id: params.user_id,
    role: params.role,
    content: params.content,
    metadata: params.metadata ?? {},
  });
  if (error) console.error("Failed to log chat:", error.message);
}

export async function createRecommendation(params: {
  user_id: string;
  title: string;
  description: string;
  category: "password" | "vault" | "security" | "backup" | "behavior";
  priority: "low" | "medium" | "high" | "critical";
  action_url?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("recommendations").insert({
    user_id: params.user_id,
    title: params.title,
    description: params.description,
    category: params.category,
    priority: params.priority,
    action_url: params.action_url ?? null,
    is_resolved: false,
  });
  if (error) console.error("Failed to create recommendation:", error.message);
}

export async function logSecurityScore(params: {
  user_id: string;
  score: number;
  risk_tier: string;
  factors: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("security_score_log").insert({
    user_id: params.user_id,
    score: params.score,
    risk_tier: params.risk_tier,
    factors: params.factors,
  });
  if (error) console.error("Failed to log score:", error.message);
}

export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let browser = "Unknown", os = "Unknown";
  if (/Chrome\/[\d.]+/.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
  else if (/Firefox\/[\d.]+/.test(ua)) browser = "Firefox";
  else if (/Safari\/[\d.]+/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/Edg\/[\d.]+/.test(ua)) browser = "Edge";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return `${browser} on ${os}`;
}
