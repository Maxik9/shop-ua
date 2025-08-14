// src/utils/sorters.js
// Спільне сортування: спочатку в наявності, потім за пріоритетом/датою/ID (спадання)
export function stockFirst(a, b) {
  const ai = a?.in_stock ? 1 : 0
  const bi = b?.in_stock ? 1 : 0
  if (ai !== bi) return bi - ai // true (1) перед false (0)
  const aid = Number(a?.priority ?? a?.created_at ?? a?.id ?? 0)
  const bid = Number(b?.priority ?? b?.created_at ?? b?.id ?? 0)
  return (bid || 0) - (aid || 0)
}
