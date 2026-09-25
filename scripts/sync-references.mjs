// Keep each portable skill self-contained using maintained canonical references.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
for (const skill of fs.readdirSync(path.join(root, 'skills'))) {
  for (const name of ['contract', 'sources', 'agents']) {
    const source = fs.readFileSync(path.join(root, 'docs', `${name}.md`), 'utf8');
    const target = path.join(root, 'skills', skill, 'references', `${name}.md`);
    if (check) {
      if (fs.readFileSync(target, 'utf8') !== source) throw new Error(`Reference drift: ${target}`);
    } else fs.writeFileSync(target, source);
  }
}
