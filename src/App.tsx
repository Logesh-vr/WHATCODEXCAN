import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  FlaskConical,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { blankDecision, example, type Decision, type SavedDecision } from './model';
import {
  decisionBrief,
  EPSILON,
  hinges,
  isTie,
  normalizedWeights,
  ranking,
  withWeight,
} from './engine';
import {
  clearDraft,
  deleteDecision,
  listDecisions,
  readDraft,
  saveDecision,
  supabase,
  writeDraft,
} from './storage';
import { copy } from './copy';
import { Editor } from './Editor';
import { Auth } from './Auth';
import { Modal } from './Modal';
import { optionColors, StressChart } from './StressChart';

type Dialog = 'edit' | 'auth' | 'library' | 'help' | null;
function initialDecision() {
  try {
    return { decision: readDraft() || example(), error: '' };
  } catch {
    return {
      decision: example(),
      error:
        'Your browser draft couldn’t be read. An example is open; saved notebook entries have not been changed.',
    };
  }
}

export default function App() {
  const [initial] = useState(initialDecision);
  const [decision, setDecision] = useState(initial.decision);
  const [checkpoint, setCheckpoint] = useState(JSON.stringify(initial.decision));
  const [current, setCurrent] = useState<SavedDecision | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(initial.error);
  const [noticeError, setNoticeError] = useState(!!initial.error);
  const [library, setLibrary] = useState<SavedDecision[]>([]);
  const [loading, setLoading] = useState(false),
    [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<'scores' | 'stress' | 'brief'>('scores');
  const [criterionId, setCriterionId] = useState(decision.criteria[0].id);
  const [scenarioPercent, setScenarioPercent] = useState(normalizedWeights(decision)[0] * 100);
  const pendingHinge = useRef<{ criterionId: string; percent: number } | null>(null);
  const [welcome, setWelcome] = useState(() => {
    try {
      return !localStorage.getItem('faultline-welcome-dismissed');
    } catch {
      return true;
    }
  });
  const authId = useRef<string | undefined>(undefined);
  const accountGeneration = useRef(0);
  const persistenceFailed = useRef(false);
  const ranks = useMemo(() => ranking(decision), [decision]);
  const tippingPoints = useMemo(() => hinges(decision), [decision]);
  const hinge = tippingPoints[0];
  const weights = normalizedWeights(decision),
    tied = isTie(decision);
  const dirty = JSON.stringify(decision) !== checkpoint;
  const selectedCriterion =
    decision.criteria.find((c) => c.id === criterionId) || decision.criteria[0];
  const scenario = withWeight(decision, selectedCriterion.id, scenarioPercent);
  const scenarioRanks = ranking(scenario);
  const uncertaintyOverlaps = ranks.slice(1).some((o) => o.high >= ranks[0].low - EPSILON);
  const hasUncertainty = decision.options.some((o) =>
    Object.values(o.scores).some((s) => s.uncertain),
  );

  function inform(text: string, error = false) {
    setNotice(text);
    setNoticeError(error);
  }
  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user;
      if (authId.current !== next?.id) {
        accountGeneration.current++;
        setCurrent(null);
        setLibrary([]);
        setCheckpoint('');
        // Account changes in another tab must not leave the previous account's draft visible.
        if (authId.current) {
          const clean = example();
          setDecision(clean);
          setCheckpoint(JSON.stringify(clean));
          setDialog(null);
        }
      }
      authId.current = next?.id;
      setUser(next || null);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        setNotice('Sign-in couldn’t be restored. You can keep working in this browser.');
        setNoticeError(true);
        setAuthReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || user) return;
    const timer = setTimeout(() => {
      try {
        writeDraft(decision);
        persistenceFailed.current = false;
      } catch {
        if (!persistenceFailed.current) {
          inform(
            'Browser storage is full or unavailable. Export your brief before closing this tab.',
            true,
          );
          persistenceFailed.current = true;
        }
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [decision, user, authReady]);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty && (user || persistenceFailed.current)) e.preventDefault();
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, user]);
  useEffect(() => {
    if (!decision.criteria.some((c) => c.id === criterionId))
      setCriterionId(decision.criteria[0].id);
  }, [decision.criteria, criterionId]);
  useEffect(() => {
    const pending = pendingHinge.current;
    pendingHinge.current = null;
    setScenarioPercent(
      pending?.criterionId === selectedCriterion.id
        ? pending.percent
        : normalizedWeights(decision)[
            decision.criteria.findIndex((c) => c.id === selectedCriterion.id)
          ] * 100,
    );
  }, [decision, selectedCriterion.id]);

  async function refreshLibrary() {
    const generation = accountGeneration.current;
    setLoading(true);
    setLoadError('');
    try {
      const list = await listDecisions(user?.id);
      if (generation === accountGeneration.current) setLibrary(list);
    } catch {
      setLoadError(copy.loadError);
    } finally {
      setLoading(false);
    }
  }
  async function save(asCopy = false) {
    if (busy || !authReady) return;
    setBusy(true);
    const snapshot = structuredClone(decision),
      generation = accountGeneration.current;
    try {
      const saved = await saveDecision(snapshot, asCopy ? null : current, user?.id);
      if (generation === accountGeneration.current) {
        setCurrent(saved);
        setCheckpoint(JSON.stringify(snapshot));
        inform(user ? 'Saved to your private notebook.' : 'Saved in this browser.');
      }
    } catch (e) {
      inform(e instanceof Error && e.message === copy.conflict ? e.message : copy.saveError, true);
    } finally {
      setBusy(false);
    }
  }
  function replace(next: Decision, saved: SavedDecision | null = null) {
    if (
      dirty &&
      !window.confirm('Replace this draft? Any changes since your last save will be lost.')
    )
      return false;
    setDecision(next);
    setCurrent(saved);
    setCheckpoint(JSON.stringify(next));
    setTab('scores');
    setCriterionId(next.criteria[0].id);
    setNotice('');
    return true;
  }
  function exportBrief() {
    const blob = new Blob([decisionBrief(decision)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `faultline-${
      decision.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 60) || 'decision'
    }.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    inform('Your decision brief is ready.');
  }
  async function signOut() {
    if (dirty && !window.confirm('Sign out and discard your unsaved account draft?')) return;
    const { error } = await supabase!.auth.signOut({ scope: 'local' });
    if (error) {
      inform('Sign-out didn’t finish. Try again.', true);
      return;
    }
    try {
      clearDraft();
    } catch {
      /* Nothing to clear if storage is blocked. */
    }
    const next = example();
    setDecision(next);
    setCurrent(null);
    setCheckpoint(JSON.stringify(next));
    setLibrary([]);
    inform('Signed out. An example is open.');
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to workspace
      </a>
      <header className="header">
        <div className="header-inner">
          <a className="brand" href="#main" aria-label="Faultline workspace">
            <img src="/faultline-canva.jpg" alt="" width="38" height="38" />
            <span>
              faultline<span className="brand-dot">.</span>
            </span>
          </a>
          <nav aria-label="Main navigation">
            <span className="nav-active">Workspace</span>
            <button onClick={() => setDialog('help')}>
              How it works <CircleHelp size={14} />
            </button>
          </nav>
          <div className="header-actions">
            <button
              className="button secondary notebook-button"
              aria-label="My notebook"
              disabled={!authReady}
              onClick={() => {
                setDialog('library');
                void refreshLibrary();
              }}
            >
              <BookOpen size={16} />
              <span>My notebook</span>
            </button>
            {user ? (
              <button
                className="icon-button"
                onClick={() => void signOut()}
                title={`Sign out ${user.email}`}
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <button className="sign-in" disabled={!authReady} onClick={() => setDialog('auth')}>
                {authReady ? 'Sign in' : 'Connecting…'} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="workspace">
        <div className="eyebrow-row">
          <span className="eyebrow">
            <span className="live-dot" /> A LAB FOR BETTER DECISIONS
          </span>
          <span className="storage-label">
            <ShieldCheck size={13} />
            {user ? 'Private notebook' : copy.local}
          </span>
        </div>
        <div className="title-row">
          <div className="decision-heading">
            <h1>{decision.title}</h1>
            <p>{decision.context || copy.subtitle}</p>
          </div>
          <button
            className="icon-button edit-title"
            onClick={() => setDialog('edit')}
            aria-label="Edit decision"
          >
            <Pencil size={19} />
          </button>
        </div>
        <div className="toolbar">
          <div className="decision-meta">
            <span>{decision.options.length} options</span>
            <span>{decision.criteria.length} criteria</span>
            <span className="save-state">
              {busy
                ? 'Saving…'
                : dirty
                  ? 'Unsaved changes'
                  : current
                    ? 'Saved'
                    : 'Ready to explore'}
            </span>
          </div>
          <div className="toolbar-actions">
            <button
              className="text-button"
              onClick={() => {
                if (replace(blankDecision())) setDialog('edit');
              }}
            >
              <Plus size={16} /> New
            </button>
            <button className="button secondary export-button" onClick={exportBrief}>
              <ArrowDownToLine size={15} /> Export brief
            </button>
            <button
              className="button primary"
              disabled={busy || !authReady}
              onClick={() => void save()}
            >
              {busy ? <span className="spinner" /> : <Save size={15} />}{' '}
              {busy ? 'Saving…' : 'Save decision'}
            </button>
          </div>
        </div>
        {welcome && (
          <div className="welcome">
            <div className="welcome-icon">
              <FlaskConical size={18} />
            </div>
            <p>
              <strong>A decision is only as solid as its assumptions.</strong> Start with the
              example. Change a score or move a weight, then look for the tipping point.
            </p>
            <button
              className="icon-button"
              aria-label="Dismiss introduction"
              onClick={() => {
                setWelcome(false);
                try {
                  localStorage.setItem('faultline-welcome-dismissed', '1');
                } catch {
                  /* Optional preference. */
                }
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div
            className={`notice ${noticeError ? 'notice-error' : ''}`}
            role={noticeError ? 'alert' : 'status'}
          >
            {noticeError ? <TriangleAlert size={17} /> : <Check size={17} />}
            <span>{notice}</span>
            <button
              className="icon-button"
              onClick={() => setNotice('')}
              aria-label="Dismiss message"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="workbench">
          <aside className="weights-panel panel">
            <div className="section-top">
              <span className="step">01</span>
              <h2>What matters</h2>
              <button
                className="icon-button"
                onClick={() => setDialog('edit')}
                aria-label="Edit criteria"
              >
                <Pencil size={15} />
              </button>
            </div>
            <p className="section-description">Give your priorities some weight.</p>
            <div className="weights-list">
              {decision.criteria.map((c, i) => (
                <div className="weight-control" key={c.id}>
                  <label htmlFor={`weight-${c.id}`}>
                    <span>{c.name}</span>
                    <strong>
                      {Math.round(weights[i] * 100)}
                      <small>%</small>
                    </strong>
                  </label>
                  <input
                    id={`weight-${c.id}`}
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={weights[i] * 100}
                    onChange={(e) =>
                      setDecision(withWeight(decision, c.id, Number(e.target.value)))
                    }
                    style={{ '--range-progress': `${weights[i] * 100}%` } as React.CSSProperties}
                  />
                  <div className="weight-ticks" aria-hidden="true">
                    <span>Less</span>
                    <span>More</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="weight-footer">
              <span>Always adds up to 100%*</span>
              <button
                className="text-button"
                onClick={() =>
                  setDecision({
                    ...decision,
                    criteria: decision.criteria.map((c) => ({ ...c, weight: 1 })),
                  })
                }
              >
                <RotateCcw size={13} /> Equalize
              </button>
            </div>
            <p className="tiny">
              *Displayed values are rounded. Other weights adjust proportionally.
            </p>
            <div className="aside-note">
              <span className="mini-label">A USEFUL QUESTION</span>
              <p>“If I could only get one thing right, which would it be?”</p>
            </div>
          </aside>
          <div className="main-panel">
            <div className="section-top compare-heading">
              <span className="step">02</span>
              <h2>The current picture</h2>
              <span className="mini-label">LIVE AS YOU EDIT</span>
            </div>
            <div
              className="option-cards"
              style={{ '--option-count': decision.options.length } as React.CSSProperties}
            >
              {ranks.map((o, i) => {
                const color = optionColors[decision.options.findIndex((x) => x.id === o.id)];
                const topTie = Math.abs(o.total - ranks[0].total) < EPSILON;
                return (
                  <article
                    className={`option-card ${i === 0 ? 'leading' : ''}`}
                    key={o.id}
                    style={{ '--option-color': color } as React.CSSProperties}
                  >
                    <div className="option-status">
                      <span className="option-dot" />
                      <span>
                        {topTie && tied
                          ? 'JOINT LEAD'
                          : i === 0
                            ? 'CURRENT LEAD'
                            : i === 1
                              ? 'RUNNER-UP'
                              : `OPTION ${i + 1}`}
                      </span>
                      {i === 0 && <span className="small-arrow">↗</span>}
                    </div>
                    <h3>{o.name}</h3>
                    <div className="score-number">
                      {o.total.toFixed(2)}
                      <span>/ 10</span>
                    </div>
                    <div className="score-bar">
                      <span style={{ width: `${o.total * 10}%` }} />
                    </div>
                    <p className="score-range">
                      {hasUncertainty ? (
                        <>
                          {o.low.toFixed(1)}–{o.high.toFixed(1)} <span>with uncertainty</span>
                        </>
                      ) : (
                        <span>Weighted fit, given your scores</span>
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
            <section
              className={`hinge-card ${!hinge ? 'steady' : ''}`}
              aria-labelledby="hinge-title"
            >
              <div className="hinge-icon">
                {hinge ? <FlaskConical size={21} /> : <ShieldCheck size={21} />}
              </div>
              <div>
                <div className="mini-label">THE FAULT LINE</div>
                <h3 id="hinge-title">
                  {tied
                    ? 'A tie. The tradeoff is yours.'
                    : hinge && hinge.distance < 10
                      ? 'A close call. Here’s the hinge.'
                      : hinge
                        ? 'A lead, with a tipping point.'
                        : 'This lead holds across weight changes.'}
                </h3>
                <p>
                  {hinge ? (
                    <>
                      <strong>{hinge.challenger}</strong> overtakes the current leader if{' '}
                      <strong>{hinge.criterion.toLowerCase()}</strong> goes {hinge.direction}{' '}
                      <strong>{hinge.threshold.toFixed(1)}%</strong>. That’s a{' '}
                      {hinge.distance.toFixed(1)} percentage-point shift.
                    </>
                  ) : (
                    'No single weight change gives another option a strict lead. Different scores could still change the result.'
                  )}
                </p>
                {hasUncertainty && (
                  <p className="uncertainty-note">
                    {uncertaintyOverlaps
                      ? 'The score ranges overlap. Check the uncertain scores before committing.'
                      : 'Even the marked score ranges leave the current leader ahead.'}
                  </p>
                )}
              </div>
              <button
                className="icon-button hinge-action"
                aria-label="Explore tipping point"
                onClick={() => {
                  setTab('stress');
                  if (hinge) {
                    if (hinge.criterionId !== criterionId)
                      pendingHinge.current = {
                        criterionId: hinge.criterionId,
                        percent: hinge.threshold,
                      };
                    setCriterionId(hinge.criterionId);
                    setScenarioPercent(hinge.threshold);
                  }
                }}
              >
                <ArrowRight size={22} />
              </button>
            </section>
            <section className="detail-panel panel">
              <div className="tab-bar" role="tablist" aria-label="Decision tools">
                {(['scores', 'stress', 'brief'] as const).map((id, i) => (
                  <button
                    key={id}
                    id={`tab-${id}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    aria-controls={`panel-${id}`}
                    tabIndex={tab === id ? 0 : -1}
                    onKeyDown={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                        e.preventDefault();
                        const tabs = ['scores', 'stress', 'brief'] as const;
                        const next =
                          e.key === 'Home'
                            ? 0
                            : e.key === 'End'
                              ? 2
                              : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
                        setTab(tabs[next]);
                        document.getElementById(`tab-${tabs[next]}`)?.focus();
                      }
                    }}
                    onClick={() => setTab(id)}
                  >
                    {id === 'scores'
                      ? 'Score the options'
                      : id === 'stress'
                        ? 'Stress test'
                        : 'Decision brief'}
                  </button>
                ))}
              </div>
              <div
                id={`panel-${tab}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
                className="tab-content"
              >
                {tab === 'scores' && (
                  <>
                    <div className="tab-intro">
                      <p>
                        Score each option from <strong>0 to 10</strong>. Higher is better.
                      </p>
                      <button className="text-button" onClick={() => setDialog('edit')}>
                        <Pencil size={14} /> Edit options
                      </button>
                    </div>
                    <div className="table-scroll">
                      <table className="score-table">
                        <caption className="sr-only">
                          Option scores and uncertainty for each criterion
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">CRITERION</th>
                            {decision.options.map((o, i) => (
                              <th scope="col" key={o.id}>
                                <span
                                  className="table-option-dot"
                                  style={{ background: optionColors[i] }}
                                />
                                {o.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {decision.criteria.map((c) => (
                            <tr key={c.id}>
                              <th scope="row">{c.name}</th>
                              {decision.options.map((o) => (
                                <td key={o.id}>
                                  <div className="score-cell">
                                    <input
                                      aria-label={`${o.name}: ${c.name} score`}
                                      type="number"
                                      min="0"
                                      max="10"
                                      step="0.5"
                                      value={o.scores[c.id].value}
                                      onChange={(e) => {
                                        const n = e.target.valueAsNumber;
                                        if (Number.isFinite(n) && n >= 0 && n <= 10)
                                          setDecision({
                                            ...decision,
                                            options: decision.options.map((v) =>
                                              v.id === o.id
                                                ? {
                                                    ...v,
                                                    scores: {
                                                      ...v.scores,
                                                      [c.id]: { ...v.scores[c.id], value: n },
                                                    },
                                                  }
                                                : v,
                                            ),
                                          });
                                      }}
                                    />
                                    <button
                                      className={`uncertain-toggle ${o.scores[c.id].uncertain ? 'active' : ''}`}
                                      aria-label={`${o.name}: ${c.name} uncertain`}
                                      aria-pressed={o.scores[c.id].uncertain}
                                      title="Mark uncertain: test ±2 points"
                                      onClick={() =>
                                        setDecision({
                                          ...decision,
                                          options: decision.options.map((v) =>
                                            v.id === o.id
                                              ? {
                                                  ...v,
                                                  scores: {
                                                    ...v.scores,
                                                    [c.id]: {
                                                      ...v.scores[c.id],
                                                      uncertain: !v.scores[c.id].uncertain,
                                                    },
                                                  },
                                                }
                                              : v,
                                          ),
                                        })
                                      }
                                    >
                                      ±
                                    </button>
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="table-footnote">
                      <span className="uncertain-sample">±</span>
                      <p>{copy.uncertainty} Ranges stop at 0 and 10.</p>
                    </div>
                  </>
                )}
                {tab === 'stress' && (
                  <>
                    <div className="stress-intro">
                      <div>
                        <h3>Find where the answer changes.</h3>
                        <p className="muted">
                          Move one priority. The others keep their proportions.
                        </p>
                      </div>
                      <label className="sr-only" htmlFor="stress-criterion">
                        Criterion to stress test
                      </label>
                      <select
                        id="stress-criterion"
                        value={selectedCriterion.id}
                        onChange={(e) => setCriterionId(e.target.value)}
                      >
                        {decision.criteria.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <StressChart
                      decision={decision}
                      criterionId={selectedCriterion.id}
                      percent={scenarioPercent}
                      onChange={setScenarioPercent}
                    />
                    <div className="scenario-result" aria-live="polite">
                      <span>
                        {isTie(scenario) ? (
                          'A tie at these weights.'
                        ) : (
                          <>
                            <strong>{scenarioRanks[0].name}</strong> leads at these weights.
                          </>
                        )}
                      </span>
                      <button
                        className="button secondary"
                        onClick={() => {
                          setDecision(scenario);
                          inform('Scenario applied to your decision.');
                        }}
                      >
                        Use these weights <ArrowRight size={14} />
                      </button>
                    </div>
                    <p className="tiny">
                      Dashed vertical line: your current weight. Solid vertical line: this scenario.
                      This test holds scores fixed.
                    </p>
                  </>
                )}
                {tab === 'brief' && (
                  <>
                    <div className="brief-summary">
                      <span className="mini-label">THE REASONING SO FAR</span>
                      <h3>
                        {tied
                          ? 'There isn’t a single winner yet.'
                          : `${ranks[0].name} fits your current priorities best.`}
                      </h3>
                      <p>
                        {hinge
                          ? `The nearest weight tipping point is ${hinge.distance.toFixed(1)} percentage points away. Before deciding, check how much ${hinge.criterion.toLowerCase()} really matters.`
                          : 'Your current leader survives every single-criterion weight change. Review the scores and anything the model leaves out.'}
                      </p>
                    </div>
                    <label className="field notes-field">
                      What does the model miss?
                      <textarea
                        rows={4}
                        maxLength={3000}
                        placeholder="A deal-breaker, a gut feeling, a fact to check. Keep it with the decision."
                        value={decision.notes}
                        onChange={(e) => setDecision({ ...decision, notes: e.target.value })}
                      />
                    </label>
                    <div className="brief-actions">
                      <button className="button primary" onClick={exportBrief}>
                        <ArrowDownToLine size={16} /> Download Markdown
                      </button>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => void save(true)}
                      >
                        <Copy size={15} /> Save a copy
                      </button>
                    </div>
                    <p className="helper">
                      Your export includes every score, weight, uncertainty range, tipping point,
                      and note.
                    </p>
                  </>
                )}
              </div>
            </section>
            <div className="below-workspace">
              <span>
                <span className="step">03</span> Change an assumption before you change your mind.
              </span>
              <button className="text-button" onClick={() => setDialog('help')}>
                About the method <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
        <footer>
          <span>
            FAULTLINE <span className="footer-slash">/</span> {copy.tagline}
          </span>
          <span>Reasoning aid. Not a prediction.</span>
        </footer>
      </main>
      {dialog === 'edit' && (
        <Editor
          decision={decision}
          onClose={() => setDialog(null)}
          onSave={(d) => {
            setDecision(d);
            setDialog(null);
          }}
        />
      )}
      {dialog === 'auth' && <Auth onClose={() => setDialog(null)} />}
      {dialog === 'library' && (
        <Modal title="Your decision notebook" onClose={() => setDialog(null)} wide>
          <p className="muted">
            {user
              ? `Signed in as ${user.email}. Only you can read these decisions.`
              : 'Saved on this browser. Sign in to use an account notebook.'}
          </p>
          {loading ? (
            <div className="empty-state" role="status">
              <span className="spinner" />
              <p>Opening your notebook…</p>
            </div>
          ) : loadError ? (
            <div className="empty-state">
              <TriangleAlert size={28} />
              <p role="alert">{loadError}</p>
              <button className="button secondary" onClick={() => void refreshLibrary()}>
                Try again
              </button>
            </div>
          ) : library.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={32} />
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyBody}</p>
              <button
                className="button primary"
                onClick={() => {
                  setDialog(null);
                  void save();
                }}
              >
                Save this decision
              </button>
            </div>
          ) : (
            <div className="library-list">
              {library.map((item) => (
                <article key={item.id}>
                  <button
                    className="library-open"
                    onClick={() => {
                      if (replace(item.payload, item)) setDialog(null);
                    }}
                  >
                    <h3>{item.payload.title}</h3>
                    <p>
                      {item.payload.options.length} options · {item.payload.criteria.length}{' '}
                      criteria ·{' '}
                      {new Date(item.updated_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Delete ${item.payload.title}`}
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete “${item.payload.title}” from this notebook? This cannot be undone.`,
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        await deleteDecision(item.id, user?.id);
                        if (current?.id === item.id) setCurrent(null);
                        await refreshLibrary();
                        inform('Decision deleted from your notebook.');
                      } catch {
                        inform('The decision couldn’t be deleted. Try again.', true);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
          )}
          <div className="modal-actions">
            <button
              className="text-button"
              onClick={() => {
                if (replace(example())) setDialog(null);
              }}
            >
              Open the example <ArrowRight size={15} />
            </button>
            <button
              className="button secondary"
              onClick={() => {
                if (replace(blankDecision())) setDialog('edit');
              }}
            >
              <Plus size={16} /> New decision
            </button>
          </div>
        </Modal>
      )}
      {dialog === 'help' && (
        <Modal title="A model you can question." onClose={() => setDialog(null)} wide>
          <div className="help-content">
            <p className="help-lead">
              Faultline makes your assumptions visible, so you can disagree with them.
            </p>
            <ol>
              <li>
                <h3>Frame a real choice.</h3>
                <p>
                  Add 2–4 options and 2–6 criteria. Use positive criteria such as affordability or
                  ease of maintenance.
                </p>
              </li>
              <li>
                <h3>Give priorities a weight.</h3>
                <p>
                  Weights add to 100%. Moving one redistributes the rest proportionally. When all
                  other weights are zero, they restart equally.
                </p>
              </li>
              <li>
                <h3>Score, then question.</h3>
                <p>
                  Score each option from 0 to 10, higher is better. The total is the sum of each
                  score multiplied by its normalized weight. The ± button tests a two-point range
                  either side, clipped to 0–10.
                </p>
              </li>
              <li>
                <h3>Look for the hinge.</h3>
                <p>
                  The tipping point is the exact weight at which another option ties the current
                  leader. It overtakes just beyond that value. The smallest change across all
                  criteria is highlighted.
                </p>
              </li>
            </ol>
            <div className="method-note">
              <strong>What this doesn’t tell you</strong>
              <p>
                These scores are judgments, not measured probabilities. Ranges assume every marked
                score can reach its bound at once. The model assumes tradeoffs are compensatory: a
                good score can offset a bad one. Remove options that fail a non-negotiable
                requirement before comparing. Weight tests change one criterion at a time.
              </p>
            </div>
            <p className="helper">
              Browser mode stores drafts and saved decisions locally. Account mode saves only when
              you click Save and clears the account draft when you sign out. No AI calls, trackers,
              or third-party analytics.
            </p>
            <button className="button primary" onClick={() => setDialog(null)}>
              Back to the decision <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
