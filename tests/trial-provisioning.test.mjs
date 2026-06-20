import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTrialProvisioningPlan,
  TRIAL_TEMPLATE_CATALOG,
} from '../dist-server/api/_lib/trialProvisioning.js';

const user = {
  uid: 'firebase-user-1',
  email: 'owner@example.com',
  displayName: 'REO Owner',
};

test('trial catalog contains exactly ten unique existing template ids', () => {
  const ids = TRIAL_TEMPLATE_CATALOG.map(template => template.templateId);
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
  assert.ok(ids.includes('template-lower'));
  assert.ok(ids.includes('template-mercato-x8-global-deal-probability-network'));
});

test('trial provisioning identifiers are deterministic per Firebase user', () => {
  const first = buildTrialProvisioningPlan(user, new Date('2026-06-20T00:00:00.000Z'));
  const second = buildTrialProvisioningPlan(user, new Date('2026-06-21T00:00:00.000Z'));
  const other = buildTrialProvisioningPlan({ ...user, uid: 'firebase-user-2' });

  assert.equal(first.studioId, second.studioId);
  assert.deepEqual(first.overlays.map(overlay => overlay.id), second.overlays.map(overlay => overlay.id));
  assert.notEqual(first.studioId, other.studioId);
  assert.equal(new Set(first.overlays.map(overlay => overlay.id)).size, 10);
});

test('trial duration and branding contract are server owned', () => {
  const startedAt = new Date('2026-06-20T12:00:00.000Z');
  const plan = buildTrialProvisioningPlan(user, startedAt, 14);

  assert.equal(plan.subscription.trialEndsAt.getTime() - startedAt.getTime(), 14 * 24 * 60 * 60 * 1000);
  assert.equal(plan.studio.brandingPolicy, 'REO_REQUIRED');
  assert.equal(plan.studio.templateLimit, 10);
  for (const overlay of plan.overlays) {
    assert.equal(overlay.brandingRequired, true);
    assert.equal(overlay.brandingLocked, true);
    assert.equal(overlay.seedOverrides.channelName, 'REO LIVE');
    assert.deepEqual(overlay.lockedFieldIds, ['channelName']);
  }
});

test('trial seed contains paths but no active token material', () => {
  const plan = buildTrialProvisioningPlan(user);
  const serialized = JSON.stringify(plan).toLowerCase();

  assert.equal(serialized.includes('token'), false);
  for (const overlay of plan.overlays) {
    assert.equal(overlay.outputPath, `/output/${overlay.id}`);
    assert.equal(overlay.controlPath, `/control/${overlay.id}`);
  }
});

test('an existing primary studio id is reused instead of creating a second studio', () => {
  const plan = buildTrialProvisioningPlan(user, new Date(), 14, 'studio-existing');
  assert.equal(plan.studioId, 'studio-existing');
  assert.ok(plan.overlays.every(overlay => overlay.id.startsWith('studio-existing-trial-')));
});

test('invalid existing studio ids and excessive trial durations are constrained', () => {
  assert.throws(
    () => buildTrialProvisioningPlan(user, new Date(), 14, '../other-studio'),
    error => error?.code === 'PRIMARY_STUDIO_INVALID',
  );
  const startedAt = new Date('2026-06-20T00:00:00.000Z');
  const plan = buildTrialProvisioningPlan(user, startedAt, 90);
  assert.equal(plan.subscription.trialEndsAt.getTime() - startedAt.getTime(), 30 * 24 * 60 * 60 * 1000);
});
