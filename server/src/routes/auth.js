import { verifyPassword, signToken, requireUser, rateLimit } from '../auth.js';
import { HttpError, unauthorized, validate } from '../http.js';

export function mountAuth(app, stores) {
  // The same login serves both products. `product` tells the UI which role family the account belongs to.
  const productOf = (role) => (role === 'club_admin' ? 'club' : 'league');

  app.post('/api/auth/login', async (ctx) => {
    const ip = ctx.req.socket.remoteAddress;
    if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) throw new HttpError(429, 'Too many sign-in attempts. Try again in a few minutes.');
    const { email, password } = validate(ctx.body, { email: 'email', password: { type: 'string', maxLen: 200 } });
    const user = stores.users.all({ email })[0];
    // Always run a hash comparison so response time does not reveal whether the account exists.
    const ok = await verifyPassword(password, user?.passwordHash || 'scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAA');
    if (!user || !ok) throw unauthorized('Incorrect email or password.');
    const token = signToken({ sub: user.id, role: user.role, name: user.name, scope: user.scope });
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, scope: user.scope, product: productOf(user.role) } };
  });

  app.get('/api/auth/me', requireUser, (ctx) => {
    const u = stores.users.get(ctx.user.id);
    if (!u) throw unauthorized();
    return { id: u.id, name: u.name, email: u.email, role: u.role, scope: u.scope, product: productOf(u.role) };
  });
}
