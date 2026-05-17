export type IntelligenceLevel = 1 | 2 | 3 | 4

export function getIntelligenceLevel(count: number): IntelligenceLevel {
  // MVP UI tiers (progressive disclosure):
  // 0–5   -> basic
  // 5–20  -> KPI cards
  // 20+    -> advanced insights
  if (count >= 20) return 4
  if (count >= 5) return 2
  return 1
}

// UI meter percent mapping (matches product "progressive disclosure" tiers).
export function getIntelligenceMeterPercent(count: number): number {
  if (count <= 0) return 0
  if (count <= 5) return 15
  if (count <= 20) return 70
  return 100
}

