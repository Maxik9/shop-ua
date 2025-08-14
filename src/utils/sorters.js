// src/utils/sorters.js
// stock first (true comes first), then by created/id desc as a tie-breaker
export function stockFirst(a, b) {
  const ai = a?.in_stock ? 1 : 0
  const bi = b?.in_stock ? 1 : 0
  if (ai !== bi) return bi - ai // true (1) before false (0)
  const aid = Number(a?.priority ?? a?.created_at ?? a?.id ?? 0)
  const bid = Number(b?.priority ?? b?.created_at ?? b?.id ?? 0)
  return (bid || 0) - (aid || 0)
}
