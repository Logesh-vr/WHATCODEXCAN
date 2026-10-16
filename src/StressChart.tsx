import { lineFor, normalizedWeights, optionScore, withWeight } from './engine';
import type { Decision } from './model';

export const optionColors = ['#386853', '#b94322', '#516da0', '#846197'];
export function StressChart({
  decision,
  criterionId,
  percent,
  onChange,
}: {
  decision: Decision;
  criterionId: string;
  percent: number;
  onChange: (v: number) => void;
}) {
  const name = decision.criteria.find((c) => c.id === criterionId)!.name;
  const w = normalizedWeights(decision),
    baseline = w[decision.criteria.findIndex((c) => c.id === criterionId)] * 100;
  const scenario = withWeight(decision, criterionId, percent);
  const W = 640,
    H = 220,
    left = 34,
    right = 16,
    top = 18,
    bottom = 34;
  const x = (v: number) => left + (v / 100) * (W - left - right);
  const y = (v: number) => H - bottom - (v / 10) * (H - top - bottom);
  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="stress-chart"
        role="img"
        aria-labelledby="chart-title chart-description"
      >
        <title id="chart-title">How {name.toLowerCase()} changes the ranking</title>
        <desc id="chart-description">
          Lines show each option’s weighted score as this criterion goes from zero to one hundred
          percent. A dashed line marks the saved weights. Use the slider below to explore exact
          values.
        </desc>
        {[0, 2, 4, 6, 8, 10].map((n) => (
          <g key={n}>
            <line
              x1={left}
              x2={W - right}
              y1={y(n)}
              y2={y(n)}
              stroke="#dedfd6"
              strokeDasharray={n === 0 ? undefined : '3 5'}
            />
            <text x={left - 12} y={y(n) + 4} textAnchor="end">
              {n}
            </text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((n) => (
          <text key={n} x={x(n)} y={H - 8} textAnchor="middle">
            {n}%
          </text>
        ))}
        <line
          x1={x(baseline)}
          x2={x(baseline)}
          y1={top}
          y2={H - bottom}
          stroke="#777c70"
          strokeDasharray="4 4"
        />
        <line
          x1={x(percent)}
          x2={x(percent)}
          y1={top}
          y2={H - bottom}
          stroke="#22251f"
          strokeWidth="1.5"
        />
        {decision.options.map((o, i) => {
          const line = lineFor(decision, o, criterionId);
          return (
            <g key={o.id}>
              <path
                d={`M ${x(0)} ${y(line.start)} L ${x(100)} ${y(line.end)}`}
                stroke={optionColors[i]}
                fill="none"
                strokeWidth="2.5"
                strokeDasharray={['', '7 3', '2 4', '9 3 2 3'][i]}
              />
              <circle
                cx={x(percent)}
                cy={y(optionScore(scenario, o))}
                r="5"
                fill={optionColors[i]}
                stroke="#fffefa"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
      <label className="scenario-label" htmlFor="scenario-weight">
        <span>{name}</span>
        <strong>
          {percent.toFixed(1)}
          <small>%</small>
        </strong>
      </label>
      <input
        id="scenario-weight"
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={percent}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="range-ends">
        <span>Doesn’t matter</span>
        <span>Only thing that matters</span>
      </div>
      <div className="chart-legend">
        {decision.options.map((o, i) => (
          <div key={o.id}>
            <span className="legend-marker" style={{ background: optionColors[i] }} />
            <span>{o.name}</span>
            <strong>{optionScore(scenario, o).toFixed(2)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
