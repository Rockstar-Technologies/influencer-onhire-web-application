import { FaStar, FaStarHalfStroke } from "react-icons/fa6";

export function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-star" aria-hidden>
      {Array.from({ length: full }, (_, i) => (
        <FaStar key={i} size={size} />
      ))}
      {half && <FaStarHalfStroke size={size} />}
    </span>
  );
}
