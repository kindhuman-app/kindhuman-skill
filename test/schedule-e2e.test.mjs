import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/kh.mjs', import.meta.url));

function homeHarness(t, rhythm = 'Weekdays at 19:30') {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kh-sched-')));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const home = path.join(base, 'private');
  function call(...args) {
    return spawnSync(process.execPath, [cli, ...args], {
      env: { ...process.env, KH_HOME: home },
      encoding: 'utf8',
    });
  }
  function run(...args) {
    const result = call(...args);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  }
  const init = run('init', '--timezone', 'Australia/Melbourne', '--rhythm', rhythm, '--style', 'gentle', '--lens', 'self-reflection');
  return { base, home, run, call, init };
}

test('e2e: chosen rhythm becomes a due local plan, never a false host registration', t => {
  const { init, run } = homeHarness(t);
  assert.equal(init.schedule.state, 'local-plan');
  assert.equal(init.schedule.hostRegistered, false);
  assert.ok(init.schedule.nextDueAt);

  const prompt = run('schedule-prompt');
  assert.equal(prompt.registered, false);
  assert.equal(prompt.hostRegistered, false);
  assert.equal(prompt.plan.state, 'local-plan');
  assert.equal(prompt.plan.due, true);

  const status = run('schedule', 'status');
  assert.equal(status.hostRegistered, false);
  assert.equal(status.due, true);
  assert.equal(status.preference, 'Weekdays at 19:30');
});

test('e2e: scheduled check-in invites, advances next due, and refuses pileup', t => {
  const { run, call } = homeHarness(t);

  const first = run('check-in', '--as-scheduled');
  assert.equal(first.scheduled, true);
  assert.match(first.invitation, /what stayed with you/i);
  assert.equal(first.hostRegistered, false);
  assert.ok(first.lastFiredAt);
  assert.ok(first.nextDueAt);
  assert.ok(new Date(first.nextDueAt).getTime() > new Date(first.lastFiredAt).getTime());

  const piled = call('check-in', '--as-scheduled');
  assert.notEqual(piled.status, 0);
  assert.match(piled.stderr, /already ran|Not due yet|No piled/i);

  // On-demand visit still works without advancing a second fire.
  const visit = run('check-in');
  assert.equal(visit.scheduled, false);
  assert.match(visit.invitation, /what stayed with you/i);
});

test('e2e: pause blocks scheduled fire; resume restores due behavior after confirm', t => {
  const { run, call } = homeHarness(t);

  assert.equal(run('schedule', 'pause').paused, true);
  const blocked = call('check-in', '--as-scheduled');
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /paused/i);

  // Human can still visit without claiming a scheduled run.
  assert.match(run('check-in').invitation, /what stayed with you/i);

  const resumed = run('schedule', 'resume');
  assert.equal(resumed.paused, false);
  assert.equal(resumed.due, true);

  const nextRun = new Date(Date.now() + 60_000).toISOString();
  const confirmed = run('schedule', 'confirm', '--next-run', nextRun, '--host', 'cursor');
  assert.equal(confirmed.registered, true);
  assert.equal(confirmed.hostRegistered, true);

  const prompt = run('schedule-prompt');
  assert.equal(prompt.registered, true);
  assert.equal(prompt.hostRegistered, true);
  assert.equal(prompt.plan.state, 'host-confirmed');

  // Confirmed future next-run is not due yet.
  const early = call('check-in', '--as-scheduled');
  assert.notEqual(early.status, 0);
  assert.match(early.stderr, /Not due yet/i);
});

test('e2e: on-demand preference never pretends to be scheduled', t => {
  const { init, run, call } = homeHarness(t, 'On demand');
  assert.equal(init.schedule.state, 'on-demand');
  assert.equal(init.schedule.hostRegistered, false);
  assert.equal(init.schedule.nextDueAt, null);

  assert.equal(run('schedule-prompt').registered, false);
  assert.equal(run('schedule', 'status').state, 'on-demand');

  const asScheduled = call('check-in', '--as-scheduled');
  assert.notEqual(asScheduled.status, 0);
  assert.match(asScheduled.stderr, /on-demand/i);

  assert.match(run('check-in').invitation, /what stayed with you/i);
});

test('e2e: legacy not-registered config migrates into a local plan from rhythm', t => {
  const { home, run } = homeHarness(t, 'daily');
  const cfgPath = path.join(home, 'config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  cfg.schedule = { state: 'not-registered' };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

  const status = run('status');
  assert.equal(status.schedule.state, 'local-plan');
  assert.equal(status.schedule.hostRegistered, false);
  assert.equal(status.schedule.due, true);
  assert.equal(run('schedule-prompt').registered, false);
});
