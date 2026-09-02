interface BarChartDatum {
  label: string;
  value: number;
}

export function AdminBarChart({
  data,
  tone = "#8d7ea8",
  valueColor = "#5b5872",
  labelColor = "#9b96a9",
  axisColor = "#eee9f1",
}: {
  data: BarChartDatum[];
  tone?: string;
  valueColor?: string;
  labelColor?: string;
  axisColor?: string;
}) {
  const max = Math.max(1, ...data.map((point) => point.value));
  const width = 560;
  const height = 200;
  const paddingBottom = 28;
  const paddingTop = 12;
  const chartHeight = height - paddingBottom - paddingTop;
  const barGap = 14;
  const barWidth = data.length > 0 ? (width - barGap * (data.length + 1)) / data.length : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Reports per month">
      <line x1={0} y1={height - paddingBottom} x2={width} y2={height - paddingBottom} stroke={axisColor} strokeWidth={1} />
      {data.map((point, index) => {
        const barHeight = max > 0 ? (point.value / max) * chartHeight : 0;
        const x = barGap + index * (barWidth + barGap);
        const y = height - paddingBottom - barHeight;
        return (
          <g key={point.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={tone} opacity={index === data.length - 1 ? 1 : 0.55} />
            {point.value > 0 && (
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={11} fill={valueColor} fontFamily="inherit">{point.value}</text>
            )}
            <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize={11} fill={labelColor} fontFamily="inherit">{point.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function DonutSplit({ resolved, pending }: { resolved: number; pending: number }) {
  const total = Math.max(1, resolved + pending);
  const resolvedRatio = resolved / total;
  const circumference = 2 * Math.PI * 42;
  const resolvedLength = circumference * resolvedRatio;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
        <circle cx={50} cy={50} r={42} fill="none" stroke="#faf1da" strokeWidth={12} />
        <circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke="#85b595"
          strokeWidth={12}
          strokeDasharray={`${resolvedLength} ${circumference - resolvedLength}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#85b595]" /> <span className="text-[#5b5872]">Resolved</span> <strong className="text-[#403f58]">{resolved}</strong></div>
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#f6efd8]" /> <span className="text-[#5b5872]">Pending</span> <strong className="text-[#403f58]">{pending}</strong></div>
      </div>
    </div>
  );
}
