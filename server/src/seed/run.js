import { openDb, createStores } from '../db.js';
import { seedAll } from './index.js';
import { config } from '../config.js';

const force = process.argv.includes('--force');
const stores = createStores(openDb());
const res = await seedAll(stores, { force });
if (res.skipped) console.log('Database already has data. Use `npm run reseed` to wipe and reseed.');
else {
  console.log(`Seeded ${config.dbFile}`);
  console.log(`Demo accounts (password: ${config.demoPassword}):`);
  res.users.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}`));
}
