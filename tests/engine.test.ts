import { describe, expect, it } from 'vitest';
import { blankDecision, decisionSchema, example } from '../src/model';
import {
  decisionBrief,
  hinges,
  isTie,
  normalizedWeights,
  optionScore,
  ranking,
  withWeight,
} from '../src/engine';

describe('weighted decision engine', () => {
  it('matches a hand-calculated example', () => {
    const d = example(),
      r = ranking(d);
    expect(r[0].name).toBe('Browser extension');
    expect(r[0].total).toBeCloseTo(7.75, 10);
    expect(r[1].total).toBeCloseTo(7.55, 10);
    expect(r[2].total).toBeCloseTo(6.65, 10);
  });
  it('finds the exact closest crossover and verifies either side', () => {
    const d = example(),
      h = hinges(d)[0];
    expect(h.criterion).toBe('Enjoyment');
    expect(h.threshold).toBeCloseTo(34.375, 8);
    const at = withWeight(d, h.criterionId, h.threshold);
    expect(isTie(at)).toBe(true);
    expect(ranking(withWeight(d, h.criterionId, h.threshold + 0.01))[0].name).toBe(
      'Weekend workshop',
    );
    expect(ranking(withWeight(d, h.criterionId, h.threshold - 0.01))[0].name).toBe(
      'Browser extension',
    );
  });
  it('preserves proportions and stays normalized at the endpoints', () => {
    const d = example(),
      id = d.criteria[0].id;
    const changed = withWeight(d, id, 70),
      w = normalizedWeights(changed);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(w[1] / w[2]).toBeCloseTo(1.5, 12);
    const only = withWeight(d, id, 100);
    expect(normalizedWeights(only)).toEqual([1, 0, 0, 0]);
    const back = normalizedWeights(withWeight(only, id, 40));
    expect(back[0]).toBeCloseTo(0.4);
    expect(back[1]).toBeCloseTo(0.2);
    expect(ranking(only).every((o) => Number.isFinite(o.total))).toBe(true);
  });
  it('bounds uncertainty at 0 and 10', () => {
    const d = blankDecision();
    for (const c of d.criteria) d.options[0].scores[c.id] = { value: 1, uncertain: true };
    for (const c of d.criteria) d.options[1].scores[c.id] = { value: 9, uncertain: true };
    const r = ranking(d);
    expect(r[0].low).toBeCloseTo(7);
    expect(r[0].high).toBeCloseTo(10);
    expect(r[1].low).toBe(0);
    expect(r[1].high).toBeCloseTo(3);
  });
  it('distinguishes identical options from a unique winner', () => {
    const d = blankDecision();
    expect(isTie(d)).toBe(true);
    expect(hinges(d)).toEqual([]);
    for (const c of d.criteria) d.options[0].scores[c.id].value = 8;
    expect(isTie(d)).toBe(false);
    expect(hinges(d)).toEqual([]);
  });
  it('does not call an endpoint tie an overtake', () => {
    const d = blankDecision();
    d.options[0].scores[d.criteria[0].id].value = 8;
    expect(hinges(d)).toEqual([]);
  });
  it('validates all reported crossovers in deterministic generated decisions', () => {
    let seed = 41;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let n = 0; n < 100; n++) {
      const d = example();
      d.criteria.forEach((c) => (c.weight = random() * 100));
      d.options.forEach((o) => Object.values(o.scores).forEach((s) => (s.value = random() * 10)));
      const leader = ranking(d)[0];
      for (const h of hinges(d)) {
        const at = withWeight(d, h.criterionId, h.threshold),
          challenger = d.options.find((o) => o.id === h.challengerId)!;
        expect(optionScore(at, leader)).toBeCloseTo(optionScore(at, challenger), 8);
        expect(h.threshold).toBeGreaterThanOrEqual(0);
        expect(h.threshold).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('validation and export', () => {
  it('rejects zero weights, missing scores, duplicate IDs and oversized content', () => {
    for (const mutate of [
      (d: ReturnType<typeof example>) => d.criteria.forEach((c) => (c.weight = 0)),
      (d: ReturnType<typeof example>) => {
        delete d.options[0].scores[d.criteria[0].id];
      },
      (d: ReturnType<typeof example>) => {
        d.options[1].id = d.options[0].id;
      },
      (d: ReturnType<typeof example>) => {
        d.notes = 'x'.repeat(3001);
      },
      (d: ReturnType<typeof example>) => {
        d.options[0].scores[d.criteria[0].id].value = Infinity;
      },
    ]) {
      const d = example();
      mutate(d);
      expect(decisionSchema.safeParse(d).success).toBe(false);
    }
  });
  it('exports the actual inputs and escapes Markdown delimiters', () => {
    const d = example();
    d.title = 'Pick [a](javascript:alert) | b';
    d.notes = '<img src=x onerror=alert(1)> & keep this literal';
    const brief = decisionBrief(d);
    expect(brief).toContain('7.75/10');
    expect(brief).toContain('34.4%');
    expect(brief).toContain('35.0%');
    expect(brief).toContain('±2, clipped to 0–10');
    expect(brief).toContain('\\[a\\]\\(javascript:alert\\) \\| b');
    expect(brief).not.toContain('<img');
    expect(brief).toContain('&lt;img');
    expect(brief).toContain('&amp; keep this literal');
  });
});
