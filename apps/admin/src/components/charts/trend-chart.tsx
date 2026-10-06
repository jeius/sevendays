// The dashboard's trend chart (#186): the shadcn chart component
// (ChartContainer over recharts) — the owner's 2026-10-06 ruling —
// app-local per the #93 reversal. Colors come from the admin-local
// --chart-* tokens (the exact CSS-variable contract ChartContainer
// themes by). Animations are disabled: deterministic SSR/hydration and
// stable screenshot frames.
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';

export type TrendDatum = { bucketStart: string; value: number };

export function TrendChart({
  data,
  variant = 'bars',
  color = 'var(--chart-1)',
  ariaLabel,
}: {
  data: TrendDatum[];
  variant?: 'bars' | 'line';
  color?: string;
  ariaLabel: string;
}) {
  if (data.length === 0) {
    return <p className='text-muted-foreground h-16 text-xs'>No data in this window.</p>;
  }
  const config = { series: { label: ariaLabel, color } } satisfies ChartConfig;
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
      <XAxis dataKey='bucketStart' hide />
      <YAxis hide domain={[0, 'dataMax']} />
      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
    </>
  );
  return (
    <ChartContainer
      config={config}
      className='h-16 w-full'
      aria-label={`${ariaLabel} — latest ${String(data.at(-1)?.value ?? 0)}, peak ${String(Math.max(...data.map((datum) => datum.value)))}`}
    >
      {variant === 'bars' ? (
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {axes}
          <Bar dataKey='value' fill={color} radius={2} isAnimationActive={false} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {axes}
          <Line
            dataKey='value'
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </ChartContainer>
  );
}
