import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Input, Button, FormGrid, FormError } from './ui.jsx';
import { useForm } from './hooks.js';
import { useRouter } from './router.jsx';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/** Session handling for one product. `roles` limits who may sign in to this app. */
export function AuthProvider({ api, roles, children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!api.token.get());

  useEffect(() => {
    if (!api.token.get()) return;
    api('/auth/me').then((u) => setUser(roles.includes(u.role) ? u : null)).catch(() => api.token.set(null)).finally(() => setReady(true));
  }, [api, roles]);
  useEffect(() => api.onSessionExpired(() => setUser(null)), [api]);

  const login = useCallback(async (email, password) => {
    const res = await api('/auth/login', { method: 'POST', body: { email, password } });
    if (!roles.includes(res.user.role)) { const e = new Error('This account does not have access to this area.'); e.status = 403; throw e; }
    api.token.set(res.token); setUser(res.user); return res.user;
  }, [api, roles]);
  const logout = useCallback(() => { api.token.set(null); setUser(null); }, [api]);

  const value = useMemo(() => ({ user, ready, login, logout, can: (...r) => !!user && r.includes(user.role) }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function LoginForm({ title = 'Sign in', note, redirect }) {
  const { login } = useAuth();
  const { navigate } = useRouter();
  const f = useForm({ email: '', password: '' }, async (v) => { await login(v.email, v.password); if (redirect) navigate(redirect, { replace: true }); });
  return (
    <form className="login panel" onSubmit={f.submit} noValidate>
      <h1>{title}</h1>
      {note && <p className="muted">{note}</p>}
      <FormGrid>
        <Input label="Email" type="email" autoComplete="username" full required {...f.bind('email')} error={f.errors.email} />
        <Input label="Password" type="password" autoComplete="current-password" full required {...f.bind('password')} error={f.errors.password} />
      </FormGrid>
      <FormError error={f.formError} />
      <Button type="submit" loading={f.submitting}>Sign in</Button>
    </form>
  );
}

/** Wrap protected screens. Shows the sign-in form when logged out, a clear message when the role is wrong. */
export function RequireAuth({ roles, children, loginTitle, loginNote }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="wrap" aria-busy="true" />;
  if (!user) return <div className="wrap wrap--narrow"><LoginForm title={loginTitle} note={loginNote} /></div>;
  if (roles && !roles.includes(user.role)) return <div className="wrap wrap--narrow"><div className="empty"><h3>No access</h3><p className="muted">Your account ({user.role}) can’t open this area.</p></div></div>;
  return children;
}
