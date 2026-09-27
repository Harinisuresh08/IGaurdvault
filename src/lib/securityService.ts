import type { EventType, SecurityEvent, AppNotification } from "@/types";

export async function logSecurityEvent(params: {
  user_id: string;
  type: EventType;
  severity?: SecurityEvent["severity"];
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  location?: string | null;
  device_info?: string | null;
  risk_score?: number | null;
}): Promise<void> {
  console.log("[Demo Mode] logSecurityEvent", params);
}

export async function logThreatEvent(params: {
  user_id: string;
  type?: EventType;
  severity?: SecurityEvent["severity"];
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  location?: string | null;
  device_info?: string | null;
  risk_score?: number | null;
}): Promise<void> {
  return logSecurityEvent(params as any);
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
  phone_model?: string | null;
  os_version?: string | null;
  wifi_status?: string | null;
  bluetooth_status?: string | null;
  battery_percentage?: number | null;
  charging_status?: string | null;
}): Promise<void> {
  console.log("[Demo Mode] logIntruderEvent", params);
}

export async function pushNotification(params: {
  user_id: string;
  title: string;
  message: string;
  type?: AppNotification["type"];
  action_url?: string | null;
}): Promise<void> {
  console.log("[Demo Mode] pushNotification", params);
}

export async function logBehaviorSample(params: {
  user_id: string;
  unlock_time?: string;
  usage_pattern?: string;
  repeated_failures?: number;
  anomaly_label?: string;
  confidence?: number;
  explanation?: string;
  screen_on_duration_min?: number;
  motion_acceleration?: number;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<void> {
  console.log("[Demo Mode] logBehaviorSample", params);
}

export async function logChatMessage(params: {
  user_id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  console.log("[Demo Mode] logChatMessage", params);
}

export async function createRecommendation(params: {
  user_id: string;
  title: string;
  description: string;
  category: "password" | "vault" | "security" | "backup" | "behavior";
  priority: "low" | "medium" | "high" | "critical";
  action_url?: string | null;
}): Promise<void> {
  console.log("[Demo Mode] createRecommendation", params);
}

export async function logSecurityScore(params: {
  user_id: string;
  score: number;
  risk_tier: string;
  factors: Record<string, unknown>;
}): Promise<void> {
  console.log("[Demo Mode] logSecurityScore", params);
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
