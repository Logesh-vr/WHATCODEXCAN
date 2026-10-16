import { z } from 'zod';

export const criterionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(48),
  weight: z.number().finite().min(0).max(100),
});
export const scoreSchema = z.object({
  value: z.number().finite().min(0).max(10),
  uncertain: z.boolean(),
});
export const optionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(48),
  scores: z.record(z.string().uuid(), scoreSchema),
});
export const decisionSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().trim().min(1).max(100),
    context: z.string().max(500),
    criteria: z.array(criterionSchema).min(2).max(6),
    options: z.array(optionSchema).min(2).max(4),
    notes: z.string().max(3000),
  })
  .superRefine((d, ctx) => {
    const ids = d.criteria.map((c) => c.id);
    if (
      new Set(ids).size !== ids.length ||
      new Set(d.options.map((o) => o.id)).size !== d.options.length
    )
      ctx.addIssue({ code: 'custom', message: 'Each option and criterion needs its own ID.' });
    if (d.criteria.reduce((sum, c) => sum + c.weight, 0) <= 0)
      ctx.addIssue({ code: 'custom', message: 'Give at least one criterion a weight above zero.' });
    for (const o of d.options)
      if (Object.keys(o.scores).length !== ids.length || ids.some((id) => !o.scores[id]))
        ctx.addIssue({ code: 'custom', message: 'Each option needs a score for every criterion.' });
  });

export type Decision = z.infer<typeof decisionSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
export type Option = z.infer<typeof optionSchema>;
export type SavedDecision = { id: string; payload: Decision; revision: number; updated_at: string };
export const savedSchema = z.object({
  id: z.string().uuid(),
  payload: decisionSchema,
  revision: z.number().int().positive(),
  updated_at: z.string().datetime({ offset: true }),
});

export function example(): Decision {
  const criteria = ['Time to first user', 'Enjoyment', 'Learning', 'Low running cost'].map(
    (name, i) => ({ id: crypto.randomUUID(), name, weight: [35, 30, 20, 15][i] }),
  );
  const values = [
    [9, 6, 8, 8],
    [7, 9, 6, 8],
    [4, 9, 9, 5],
  ];
  return {
    schemaVersion: 1,
    title: 'What should I build next?',
    context: 'A small product, a real constraint: six hours a week. Find the choice that holds up.',
    criteria,
    options: ['Browser extension', 'Weekend workshop', 'Mobile game'].map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      scores: Object.fromEntries(
        criteria.map((c, j) => [
          c.id,
          { value: values[i][j], uncertain: (i === 0 && j === 0) || (i === 1 && j === 1) },
        ]),
      ),
    })),
    notes: '',
  };
}

export function blankDecision(): Decision {
  const criteria = ['Impact', 'Feasibility', 'Enjoyment'].map((name) => ({
    id: crypto.randomUUID(),
    name,
    weight: 1,
  }));
  return {
    schemaVersion: 1,
    title: 'An untitled decision',
    context: '',
    criteria,
    options: ['Option A', 'Option B'].map((name) => ({
      id: crypto.randomUUID(),
      name,
      scores: Object.fromEntries(criteria.map((c) => [c.id, { value: 5, uncertain: false }])),
    })),
    notes: '',
  };
}
