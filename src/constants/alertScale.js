export const ALERT_SCALE = [
  { level: 0, name: "No Stress", dhwThreshold: "< 0", status: "🟢 Safe" },
  { level: 1, name: "Watch", dhwThreshold: "0–4", status: "🟡 Monitor" },
  { level: 2, name: "Warning", dhwThreshold: "4–8", status: "🟠 Caution" },
  { level: 3, name: "Alert 1", dhwThreshold: "8–12", status: "🔴 Bleaching Likely" },
  { level: 4, name: "Alert 2", dhwThreshold: "12–16", status: "🔴 Bleaching & Mortality" },
  { level: 5, name: "Alert 2+", dhwThreshold: "> 16", status: "☠️ Severe Mortality" }
];
