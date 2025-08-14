// src/components/AvailabilityBadge.jsx
export default function AvailabilityBadge({ in_stock }){
  return in_stock ? (
    <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">В наявності</span>
  ) : (
    <span className="inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">Немає в наявності</span>
  );
}
