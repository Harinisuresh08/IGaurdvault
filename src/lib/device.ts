/** Information about the current device/browser environment. Mimics the
 * telemetry a native security app would collect (battery, network, GPS,
 * device model, OS). Falls back gracefully when an API is unavailable. */

export interface DeviceInfo {
  deviceName: string;
  phoneModel: string;
  osVersion: string;
  networkType: string;
  wifiStatus: string;
  bluetoothStatus: string;
  batteryPercentage: number | null;
  chargingStatus: string;
}

export interface GeoInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  label: string;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const ua = navigator.userAgent;
  let phoneModel = "Web Browser";
  let osVersion = "Unknown";
  if (/iPhone/.test(ua)) {
    phoneModel = "iPhone";
    osVersion = /OS (\d+[._]\d+)/.exec(ua)?.[1]?.replace("_", ".") ?? "iOS";
  } else if (/Android/.test(ua)) {
    phoneModel = "Android Device";
    osVersion = /Android (\d+\.?\d*)/.exec(ua)?.[1] ?? "Android";
  } else if (/Windows/.test(ua)) {
    phoneModel = "Windows PC";
    osVersion = /Windows NT (\d+\.\d+)/.exec(ua)?.[1] ?? "Windows";
  } else if (/Mac/.test(ua)) {
    phoneModel = "Mac";
    osVersion = /Mac OS X (\d+[._]\d+)/.exec(ua)?.[1]?.replace("_", ".") ?? "macOS";
  } else if (/Linux/.test(ua)) {
    phoneModel = "Linux Machine";
    osVersion = "Linux";
  }

  let battery: number | null = null;
  let charging = "Unknown";
  try {
    if ("getBattery" in navigator) {
      const bat = await (navigator as Navigator & {
        getBattery: () => Promise<{ level: number; charging: boolean }>;
      }).getBattery();
      battery = Math.round(bat.level * 100);
      charging = bat.charging ? "Charging" : "On Battery";
    }
  } catch {
    /* not supported */
  }

  const connection =
    (navigator as Navigator & {
      connection?: { effectiveType?: string; type?: string };
    }).connection ?? null;
  const networkType = connection?.effectiveType ?? "wifi";

  return {
    deviceName: phoneModel,
    phoneModel,
    osVersion,
    networkType: networkType.toUpperCase(),
    wifiStatus: navigator.onLine ? "Connected" : "Offline",
    bluetoothStatus: "Unknown (Web)",
    batteryPercentage: battery,
    chargingStatus: charging,
  };
}

export async function getGeoInfo(): Promise<GeoInfo | null> {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          label: "Current Location",
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  });
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
