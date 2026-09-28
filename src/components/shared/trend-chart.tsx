import { cn } from "@/lib/utils";

interface Point {
  label: string;
  value: number;
}

const PAD = { top: 16, right: 8, bottom: 28, left: 44 };
const TOOLTIP_W = 116;
// Past roughly one label per 60 units of width they collide, so only every nth one is drawn.
const MAX_AXIS_LABELS = 8;
const UNITS_PER_LABEL = 60;

// Rounds up to 1, 2, 2.5 or 5 × 10^n so gridlines land on readable numbers.
function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((multiple) => multiple * magnitude >= value) ?? 10;
  return step * magnitude;
}

export function TrendChart({
  title,
  points,
  kind,
  format,
  axisFormat = format,
  width = 400,
  height = 190,
  hideTitle = false,
}: {
  title: string;
  points: Point[];
  kind: "line" | "bar";
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  // viewBox size; text stays readable when this is close to the rendered width.
  width?: number;
  height?: number;
  hideTitle?: boolean;
}) {
  const WIDTH = width;
  const HEIGHT = height;
  const PLOT_W = WIDTH - PAD.left - PAD.right;
  const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
  const labelEvery = Math.ceil(points.length / Math.min(MAX_AXIS_LABELS, Math.floor(WIDTH / UNITS_PER_LABEL)));
  const max = niceMax(Math.max(...points.map((point) => point.value)));
  const ticks = [0, max / 2, max];
  const slot = PLOT_W / points.length;
  const x = (index: number) => PAD.left + slot * index + slot / 2;
  const y = (value: number) => PAD.top + PLOT_H - (value / max) * PLOT_H;
  const baseline = y(0);
  const barWidth = Math.min(36, slot * 0.55);
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`).join(" ");

  return (
    <figure className="min-w-0">
      <figcaption className={cn("text-sm font-semibold text-heading", hideTitle && "sr-only")}>{title}</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-3 w-full" role="img" aria-label={`${title}: ${points.map((point) => `${point.label} ${format(point.value)}`).join(", ")}`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} className={cn("stroke-border", tick !== 0 && "[stroke-dasharray:3_4]")} />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
              {axisFormat(tick)}
            </text>
          </g>
        ))}

        {kind === "line" && <path d={linePath} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-navy" />}

        {points.map((point, index) => {
          const cx = x(index);
          const cy = y(point.value);
          // Rounded 4px top only, so the bar stays anchored to the baseline.
          const barHeight = baseline - cy;
          const r = Math.min(4, barHeight);
          const left = cx - barWidth / 2;
          const barPath = `M${left},${baseline} V${cy + r} Q${left},${cy} ${left + r},${cy} H${left + barWidth - r} Q${left + barWidth},${cy} ${left + barWidth},${cy + r} V${baseline} Z`;
          return (
            <g key={point.label}>
              {kind === "bar" && barHeight > 0 && <path d={barPath} className="fill-navy" />}
              {(points.length - 1 - index) % labelEvery === 0 && (
                <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="fill-muted text-[11px]">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover layer is drawn after every mark so a tooltip never sits under a neighbouring bar. */}
        {points.map((point, index) => {
          const cx = x(index);
          const cy = y(point.value);
          const tipX = Math.min(Math.max(cx - TOOLTIP_W / 2, 0), WIDTH - TOOLTIP_W);
          const tipY = Math.max(cy - 50, 0);

          return (
            <g key={point.label} className="group">
              <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
                {kind === "line" && (
                  <>
                    <line x1={cx} x2={cx} y1={PAD.top} y2={baseline} className="stroke-muted [stroke-dasharray:2_3]" />
                    <circle cx={cx} cy={cy} r={5} strokeWidth={2} className="fill-navy stroke-surface" />
                  </>
                )}
                <rect x={tipX} y={tipY} width={TOOLTIP_W} height={40} rx={6} className="fill-heading" />
                <text x={tipX + 10} y={tipY + 16} className="fill-white/70 text-[11px]">
                  {point.label}
                </text>
                <text x={tipX + 10} y={tipY + 32} className="fill-white text-[12px] font-semibold">
                  {format(point.value)}
                </text>
              </g>

              {/* Hit area spans the whole slot, much bigger than the mark itself. */}
              <rect x={cx - slot / 2} y={PAD.top} width={slot} height={PLOT_H} fill="transparent" />
            </g>
          );
        })}
      </svg>

      <details className="mt-1 text-xs">
        <summary className="cursor-pointer text-muted hover:text-heading">View as table</summary>
        <table className="mt-2 w-full text-left">
          <tbody className="divide-y divide-border">
            {points.map((point) => (
              <tr key={point.label}>
                <th scope="row" className="py-1 font-medium text-body">
                  {point.label}
                </th>
                <td className="py-1 text-right text-heading">{format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
