import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { decisionSchema, type Decision } from './model';
import { Modal } from './Modal';

export function Editor({
  decision,
  onSave,
  onClose,
}: {
  decision: Decision;
  onSave: (d: Decision) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Decision>(structuredClone(decision));
  const [error, setError] = useState('');
  return (
    <Modal title="Frame your decision" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const result = decisionSchema.safeParse(draft);
          if (!result.success) {
            setError(result.error.issues[0].message);
            return;
          }
          onSave(result.data);
        }}
      >
        <p className="muted">
          Two to four options. Two to six criteria. A question you can actually answer.
        </p>
        <label className="field">
          Your question
          <input
            autoFocus
            required
            maxLength={100}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Which direction should I take?"
          />
        </label>
        <label className="field">
          A little context <span className="optional">optional</span>
          <textarea
            maxLength={500}
            rows={2}
            value={draft.context}
            onChange={(e) => setDraft({ ...draft, context: e.target.value })}
            placeholder="What constraints make this a real tradeoff?"
          />
        </label>
        <div className="editor-columns">
          <section>
            <h3>
              The options <span className="count">{draft.options.length}/4</span>
            </h3>
            {draft.options.map((o, i) => (
              <div className="input-row" key={o.id}>
                <label className="sr-only" htmlFor={`option-${o.id}`}>
                  Option {i + 1}
                </label>
                <input
                  id={`option-${o.id}`}
                  required
                  maxLength={48}
                  value={o.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      options: draft.options.map((v) =>
                        v.id === o.id ? { ...v, name: e.target.value } : v,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  disabled={draft.options.length <= 2}
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() =>
                    setDraft({ ...draft, options: draft.options.filter((v) => v.id !== o.id) })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={draft.options.length >= 4}
              onClick={() =>
                setDraft({
                  ...draft,
                  options: [
                    ...draft.options,
                    {
                      id: crypto.randomUUID(),
                      name: `Option ${String.fromCharCode(65 + draft.options.length)}`,
                      scores: Object.fromEntries(
                        draft.criteria.map((c) => [c.id, { value: 5, uncertain: false }]),
                      ),
                    },
                  ],
                })
              }
            >
              <Plus size={16} /> Add option
            </button>
          </section>
          <section>
            <h3>
              What matters <span className="count">{draft.criteria.length}/6</span>
            </h3>
            {draft.criteria.map((c, i) => (
              <div className="input-row" key={c.id}>
                <label className="sr-only" htmlFor={`criterion-${c.id}`}>
                  Criterion {i + 1}
                </label>
                <input
                  id={`criterion-${c.id}`}
                  required
                  maxLength={48}
                  value={c.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      criteria: draft.criteria.map((v) =>
                        v.id === c.id ? { ...v, name: e.target.value } : v,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  disabled={draft.criteria.length <= 2}
                  aria-label={`Remove criterion ${i + 1}`}
                  onClick={() => {
                    const criteria = draft.criteria.filter((v) => v.id !== c.id);
                    if (!criteria.some((v) => v.weight > 0))
                      criteria.forEach((v) => (v.weight = 1));
                    setDraft({
                      ...draft,
                      criteria,
                      options: draft.options.map((o) => ({
                        ...o,
                        scores: Object.fromEntries(
                          Object.entries(o.scores).filter(([key]) => key !== c.id),
                        ),
                      })),
                    });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={draft.criteria.length >= 6}
              onClick={() => {
                const id = crypto.randomUUID();
                setDraft({
                  ...draft,
                  criteria: [...draft.criteria, { id, name: 'New criterion', weight: 20 }],
                  options: draft.options.map((o) => ({
                    ...o,
                    scores: { ...o.scores, [id]: { value: 5, uncertain: false } },
                  })),
                });
              }}
            >
              <Plus size={16} /> Add criterion
            </button>
          </section>
        </div>
        <p className="helper">
          Use criteria where higher is better: “affordability” works better than “cost”. New scores
          start at 5.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            Start comparing
          </button>
        </div>
      </form>
    </Modal>
  );
}
