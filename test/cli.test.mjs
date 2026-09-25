import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../bin/kh.mjs', import.meta.url));
function setup(t) {
  // realpath handles macOS /var -> /private/var before symlink checks.
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kh-test-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const home = path.join(base, 'private');
  function call(...args) { return spawnSync(process.execPath, [cli, ...args], { env: { ...process.env, KH_HOME: home }, encoding: 'utf8' }); }
  function run(...args) { const result = call(...args); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); }
  run('init', '--timezone', 'Australia/Melbourne', '--rhythm', 'Weekdays at 19:30');
  return { base, home, run, call };
}
test('capture preserves original text, deduplicates, and requires exact review digest', t => {
  const { base, home, run, call } = setup(t);
  const file = path.join(base, 'transcript.txt'), text = '  Original words.\nSecond line.\n';
  fs.writeFileSync(file, text);
  run('source', 'add', '--id', 'journal', '--kind', 'file', '--locator', file, '--scope', 'Only this file');
  const first = run('collect', '--source', 'journal').results[0];
  assert.equal(run('collect', '--source', 'journal').results[0].duplicate, true);
  const record = run('inbox', 'show', '--id', first.id);
  assert.equal(record.originalText, text);
  assert.equal(record.eventAt, null);
  assert.equal(record.approval, null);
  assert.notEqual(call('review', '--id', first.id, '--digest', 'wrong', '--decision', 'approve').status, 0);
  assert.equal(run('review', '--id', first.id, '--digest', first.digest, '--decision', 'approve').uploaded, false);
  assert.equal(run('status').approvedLocal, 1);
  assert.equal(run('status').server, 'not-connected');
  const p = path.join(home, 'inbox', `${first.id}.json`);
  const edited = JSON.parse(fs.readFileSync(p)); edited.originalText += ' altered'; fs.writeFileSync(p, JSON.stringify(edited));
  assert.notEqual(call('review', '--id', first.id, '--digest', first.digest, '--decision', 'approve').status, 0);
});
test('empty inbox still invites reflection; schedule is chosen and never falsely registered', t => {
  const { run, call } = setup(t);
  assert.match(run('check-in').invitation, /What stayed with you/);
  const prompt = run('schedule-prompt');
  assert.equal(prompt.rhythm, 'Weekdays at 19:30');
  assert.equal(prompt.registered, false);
  assert.match(prompt.prompt, /every scheduled run/);
  assert.notEqual(call('init', '--timezone', 'UTC', '--rhythm', 'daily').status, 0);
});
test('collection stays in selected folder and records unavailable source', t => {
  const { base, run, call } = setup(t);
  const folder = path.join(base, 'drop'); fs.mkdirSync(folder);
  fs.mkdirSync(path.join(folder, 'nested')); fs.writeFileSync(path.join(folder, 'nested', 'private.txt'), 'not selected');
  fs.writeFileSync(path.join(folder, 'a.txt'), 'selected');
  fs.writeFileSync(path.join(folder, 'image.png'), 'not text');
  fs.symlinkSync(path.join(folder, 'a.txt'), path.join(folder, 'link.txt'));
  run('source', 'add', '--id', 'drop', '--kind', 'folder', '--locator', folder, '--scope', 'Top-level text only');
  assert.equal(run('collect', '--source', 'drop').results.length, 1);
  fs.rmSync(folder, { recursive: true });
  assert.notEqual(call('collect', '--source', 'drop').status, 0);
  assert.equal(run('check-in').sourceErrors.length, 1);
});
test('connector registration never claims that a remote source has been connected', t => {
  const { run, call } = setup(t);
  run('source', 'add', '--id', 'reading', '--kind', 'web', '--locator', 'https://example.com/saved', '--scope', 'Selected saved posts');
  assert.notEqual(call('collect', '--source', 'reading').status, 0);
  assert.equal(run('source', 'list')[0].lastReadAt, null);
});
test('paused sources cannot be read or captured until explicitly resumed', t => {
  const { base, run, call } = setup(t);
  const file = path.join(base, 'note.txt'); fs.writeFileSync(file, 'A selected note.');
  run('source', 'add', '--id', 'note', '--kind', 'file', '--locator', file, '--scope', 'This note');
  run('source', 'pause', '--id', 'note');
  assert.notEqual(call('collect', '--source', 'note').status, 0);
  assert.notEqual(call('capture', '--source', 'note', '--file', file, '--origin', file).status, 0);
  run('source', 'resume', '--id', 'note');
  assert.equal(run('collect', '--source', 'note').results.length, 1);
});
test('installer previews and refuses to overwrite existing skills', t => {
  const { base, run, call } = setup(t);
  const project = path.join(base, 'project');
  const preview = run('install', '--agent', 'all', '--project', project, '--dry-run');
  assert.ok(preview.planned.length >= 9);
  assert.equal(fs.existsSync(project), false);
  const installed = run('install', '--agent', 'all', '--project', project);
  assert.equal(installed.installed.length, preview.planned.length);
  assert.notEqual(call('install', '--agent', 'all', '--project', project).status, 0);
  const cursor = run('install', '--agent', 'cursor', '--project', path.join(base, 'cursor'));
  assert.ok(cursor.installed.every(p => p.includes('.cursor/skills')));
});
test('path traversal IDs, symlink state, and concurrent mutation are refused', t => {
  const { base, home, call } = setup(t);
  assert.notEqual(call('inbox', 'show', '--id', '../config').status, 0);
  fs.writeFileSync(path.join(home, '.lock'), 'busy');
  assert.notEqual(call('check-in').status, 0);
  fs.unlinkSync(path.join(home, '.lock'));
  const alias = path.join(base, 'alias'); fs.symlinkSync(home, alias);
  assert.notEqual(call('status', '--home', alias).status, 0);
});
