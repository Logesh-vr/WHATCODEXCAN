import type { Decision, Option } from './model';

export const EPSILON = 1e-8;
export function normalizedWeights(d: Decision): number[] {
  const total = d.criteria.reduce((s, c) => s + c.weight, 0);
  return d.criteria.map((c) => (total > 0 ? c.weight / total : 1 / d.criteria.length));
}
export function withWeight(d: Decision, criterionId: string, percent: number): Decision {
  const index = d.criteria.findIndex((c) => c.id === criterionId);
  if (index < 0) return d;
  const w = normalizedWeights(d),
    target = Math.min(100, Math.max(0, percent));
  const remaining = 1 - w[index];
  return {
    ...d,
    criteria: d.criteria.map((c, i) => ({
      ...c,
      weight:
        i === index
          ? target
          : remaining > EPSILON
            ? (w[i] / remaining) * (100 - target)
            : (100 - target) / (w.length - 1),
    })),
  };
}
export function optionScore(d: Decision, o: Option, weights = normalizedWeights(d)): number {
  return d.criteria.reduce((sum, c, i) => sum + o.scores[c.id].value * weights[i], 0);
}
export function ranking(d: Decision) {
  const weights = normalizedWeights(d);
  return d.options
    .map((o) => ({
      ...o,
      total: optionScore(d, o, weights),
      low: d.criteria.reduce(
        (sum, c, i) =>
          sum + Math.max(0, o.scores[c.id].value - (o.scores[c.id].uncertain ? 2 : 0)) * weights[i],
        0,
      ),
      high: d.criteria.reduce(
        (sum, c, i) =>
          sum +
          Math.min(10, o.scores[c.id].value + (o.scores[c.id].uncertain ? 2 : 0)) * weights[i],
        0,
      ),
    }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        d.options.findIndex((o) => o.id === a.id) - d.options.findIndex((o) => o.id === b.id),
    );
}

// Each score is affine in x when one criterion changes and the others retain their proportions.
export function lineFor(d: Decision, o: Option, criterionId: string) {
  const zero = withWeight(d, criterionId, 0);
  return { start: optionScore(zero, o), end: o.scores[criterionId].value };
}
export type Hinge = {
  criterionId: string;
  criterion: string;
  challenger: string;
  challengerId: string;
  threshold: number;
  distance: number;
  direction: 'above' | 'below';
};
export function hinges(d: Decision): Hinge[] {
  const ranks = ranking(d),
    leader = ranks[0];
  const weights = normalizedWeights(d),
    found: Hinge[] = [];
  for (const [i, c] of d.criteria.entries()) {
    const a = lineFor(d, leader, c.id);
    for (const bOption of ranks.slice(1)) {
      const b = lineFor(d, bOption, c.id);
      const intercept = b.start - a.start;
      const slope = b.end - b.start - (a.end - a.start);
      if (Math.abs(slope) < EPSILON) continue;
      const x = -intercept / slope;
      // A tie at an extreme is not a strict lead inside the valid domain.
      if (
        x < -EPSILON ||
        x > 1 + EPSILON ||
        (slope > 0 && x >= 1 - EPSILON) ||
        (slope < 0 && x <= EPSILON)
      )
        continue;
      const threshold = Math.min(1, Math.max(0, x)) * 100;
      found.push({
        criterionId: c.id,
        criterion: c.name,
        challenger: bOption.name,
        challengerId: bOption.id,
        threshold,
        distance: Math.abs(threshold - weights[i] * 100),
        direction: slope > 0 ? 'above' : 'below',
      });
    }
  }
  return found.sort((a, b) => a.distance - b.distance);
}

export function isTie(d: Decision) {
  const r = ranking(d);
  return Math.abs(r[0].total - r[1].total) < EPSILON;
}
export function escapeMarkdown(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/[\\`*_{}\[\]()#+.!|>~-]/g, '\\$&')
    .replace(/\r?\n/g, ' ');
}
export function decisionBrief(d: Decision): string {
  const r = ranking(d),
    h = hinges(d)[0],
    w = normalizedWeights(d);
  return (
    `# ${escapeMarkdown(d.title)}\n\n${escapeMarkdown(d.context)}\n\n## Current result\n\n${isTie(d) ? 'There is a tie at the top.' : `${escapeMarkdown(r[0].name)} leads at ${r[0].total.toFixed(2)}/10.`}\n\n` +
    r
      .map(
        (o) =>
          `- ${escapeMarkdown(o.name)}: ${o.total.toFixed(2)}/10; score range ${o.low.toFixed(2)}–${o.high.toFixed(2)}`,
      )
      .join('\n') +
    `\n\n## What matters\n\n` +
    d.criteria
      .map((c, i) => `- ${escapeMarkdown(c.name)}: ${(w[i] * 100).toFixed(1)}%`)
      .join('\n') +
    `\n\n## Scores\n\n| Option | ${d.criteria.map((c) => escapeMarkdown(c.name)).join(' | ')} |\n| --- | ${d.criteria.map(() => '---').join(' | ')} |\n` +
    d.options
      .map(
        (o) =>
          `| ${escapeMarkdown(o.name)} | ${d.criteria.map((c) => `${o.scores[c.id].value}${o.scores[c.id].uncertain ? ' (±2, clipped to 0–10)' : ''}`).join(' | ')} |`,
      )
      .join('\n') +
    `\n\n## Closest tipping point\n\n${h ? `${escapeMarkdown(h.challenger)} beats the current leader when ${escapeMarkdown(h.criterion)} goes ${h.direction} ${h.threshold.toFixed(1)}%. Other weights keep their proportions; another option may lead earlier.` : 'No single-criterion weight change produces a strict lead over the current leader.'}\n\n## My reasoning\n\n${escapeMarkdown(d.notes) || 'No notes yet.'}\n\n## Method\n\nWeighted sum of scores from 0 to 10. Higher always means better. Uncertain scores use a ±2 interval clipped to 0–10. Ranges are bounds, not probabilities. Weight sensitivity changes one criterion at a time. This model does not capture all real-world tradeoffs.\n`
  );
}
