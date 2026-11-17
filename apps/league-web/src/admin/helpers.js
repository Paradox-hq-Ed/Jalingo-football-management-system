import { api } from '../api.js';

/** Runs a write. If the API answers 409 with `canForce`, asks the admin whether to proceed and retries with ?force=1. */
export async function writeWithOverride(path, opts, confirm) {
  try { return await api(path, opts); }
  catch (e) {
    if (e.status === 409 && e.details?.canForce) {
      const lines = (e.details.conflicts || []).map((c) => c.msg).filter(Boolean);
      const ok = await confirm({ title: 'Proceed anyway?', message: [e.message, ...lines].join(' '), confirmLabel: 'Proceed anyway' });
      if (!ok) return undefined;
      return api(`${path}${path.includes('?') ? '&' : '?'}force=1`, opts);
    }
    throw e;
  }
}
export const conflictsOf = (e) => e?.details?.conflicts || [];
