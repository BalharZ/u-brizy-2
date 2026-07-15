/* Spustí všechny testy adminu:  node test/run.mjs
   Testuje kontrolu dat lístků (_validate.js) a přihlašování (_lib.js).
   Testy nesahají na síť ani na GitHub. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITES = ['validate.test.mjs', 'auth.test.mjs'];

let failed = 0;
for (const suite of SUITES) {
  console.log('\n─── ' + suite + ' ' + '─'.repeat(Math.max(0, 50 - suite.length)));
  const r = spawnSync(process.execPath, [join(HERE, suite)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

console.log('\n' + '═'.repeat(56));
console.log(failed ? failed + ' sada/sady selhaly' : 'Všechny testy prošly.');
process.exit(failed ? 1 : 0);
