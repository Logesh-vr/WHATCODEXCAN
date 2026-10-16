import { useState } from 'react';
import { LockKeyhole, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { supabase } from './storage';

export function Auth({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  return (
    <Modal title="A place for your reasoning." onClose={onClose}>
      <div className="auth-symbol">
        <LockKeyhole size={28} />
      </div>
      {!supabase ? (
        <>
          <p>
            Account storage isn’t connected yet. You can still compare, save in this browser, and
            export your reasoning.
          </p>
          <p className="helper">
            To enable accounts, follow the Supabase setup in the project README, then restart the
            app.
          </p>
          <button className="button primary" onClick={onClose}>
            Continue in this browser <ArrowRight size={16} />
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            {mode === 'signin'
              ? 'Open your private decision notebook.'
              : 'Keep your decisions together. Your notebook is private to your account.'}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase) return;
              setBusy(true);
              setError('');
              setMessage('');
              try {
                const result =
                  mode === 'signin'
                    ? await supabase.auth.signInWithPassword({ email, password })
                    : await supabase.auth.signUp({ email, password });
                if (result.error) throw result.error;
                if (result.data.session) onClose();
                else
                  setMessage(
                    'Check your email to confirm your account, then return here to sign in.',
                  );
              } catch (e) {
                setError(e instanceof Error ? e.message : 'We couldn’t reach sign-in. Try again.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                autoFocus
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="success">
                {message}
              </p>
            )}
            <button className="button primary full-width" disabled={busy}>
              {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}{' '}
              <ArrowRight size={16} />
            </button>
          </form>
          <button
            className="text-button auth-switch"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
          <p className="helper">
            Browser-only decisions stay separate. Open one before signing in, then save a copy to
            your account.
          </p>
        </>
      )}
    </Modal>
  );
}
