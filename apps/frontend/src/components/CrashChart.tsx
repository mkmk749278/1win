type Props = {
  points: number[];
};

export function CrashChart({ points }: Props) {
  const safePoints = points.length > 1 ? points : [1, ...points];
  const maxValue = Math.max(...safePoints, 1.2);
  const polylinePoints = safePoints
    .map((point, index) => {
      const x = (index / Math.max(safePoints.length - 1, 1)) * 100;
      const y = 100 - (point / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <h3>Crash graph</h3>
        <span>{safePoints.length} samples</span>
      </div>
      <svg viewBox="0 0 100 100" className="chart" preserveAspectRatio="none" aria-label="Crash multiplier graph">
        <polyline fill="none" stroke="url(#lineGradient)" strokeWidth="2" points={polylinePoints} />
        <defs>
          <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
    </section>
  );
}
