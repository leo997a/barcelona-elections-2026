import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { TrialOverlaySummary, TrialStudioSummary } from '../../types/trial.js';

export const TRIAL_TEMPLATE_CATALOG = Object.freeze([
  { templateId: 'template-lower', type: 'LOWER_THIRD', name: 'الشريط التعريفي العربي' },
  { templateId: 'template-exclusive-alert', type: 'EXCLUSIVE_ALERT', name: 'تنبيه حصري وعاجل' },
  { templateId: 'template-news', type: 'NEWS_TICKER', name: 'شريط الأخبار' },
  { templateId: 'template-soccer', type: 'SOCCER_SCOREBOARD', name: 'لوحة نتائج كرة القدم' },
  { templateId: 'template-football-smart-match-stats', type: 'SMART_MATCH_STATS', name: 'إحصائيات المباراة' },
  { templateId: 'template-leaderboard-ribbon', type: 'LEADERBOARD_RIBBON', name: 'شريط الداعمين' },
  { templateId: 'template-top-viewers', type: 'TOP_VIEWERS', name: 'أفضل المشاهدين' },
  { templateId: 'template-player-profile', type: 'PLAYER_PROFILE', name: 'بطاقة اللاعب الأساسية' },
  { templateId: 'template-mercato-x6-deal-radar', type: 'MERCATO_UNIFIED', name: 'رادار صفقات الميركاتو' },
  {
    templateId: 'template-mercato-x8-global-deal-probability-network',
    type: 'MERCATO_UNIFIED',
    name: 'شبكة احتمالات الصفقات العالمية',
  },
] as const);

const TRIAL_TEMPLATE_LIMIT = 10 as const;
const PROVISIONING_VERSION = 1;

export class TrialProvisioningError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = 'TrialProvisioningError';
    this.code = code;
    this.status = status;
  }
}

export interface TrialProvisioningUser {
  uid: string;
  email: string;
  displayName?: string | null;
}

export interface TrialOverlaySeed extends TrialOverlaySummary {
  type: string;
  createdBy: string;
  trialTemplate: true;
  brandingLabel: 'REO LIVE';
  brandingLocked: true;
  lockedFieldIds: readonly ['channelName'];
  seedOverrides: { channelName: 'REO LIVE' };
}

export interface TrialProvisioningPlan {
  studioId: string;
  studio: {
    ownerUid: string;
    name: string;
    slug: string;
    status: 'ACTIVE';
    trialProvisioned: true;
    provisioningVersion: 1;
    brandingPolicy: 'REO_REQUIRED';
    templateLimit: 10;
  };
  membership: {
    uid: string;
    role: 'OWNER';
    status: 'ACTIVE';
    invitedBy: null;
  };
  subscription: {
    planId: 'trial';
    status: 'TRIALING';
    trialStartedAt: Date;
    trialEndsAt: Date;
    provider: 'manual';
    providerSubscriptionId: null;
    adminOverride: null;
  };
  overlays: TrialOverlaySeed[];
}

export interface TrialProvisioningResult {
  provisioned: boolean;
  created: {
    studio: boolean;
    membership: boolean;
    subscription: boolean;
    overlays: number;
  };
  studio: TrialStudioSummary;
}

const hashIdentifier = (value: string, length = 24) => createHash('sha256').update(value).digest('hex').slice(0, length);

const normalizeExistingStudioId = (value: string | undefined) => {
  const normalized = value?.trim() ?? '';
  if (!normalized) return '';
  if (!/^[A-Za-z0-9_-]{3,128}$/.test(normalized)) {
    throw new TrialProvisioningError('PRIMARY_STUDIO_INVALID', 'The primary studio identifier is invalid.', 409);
  }
  return normalized;
};

const normalizeStudioName = (user: TrialProvisioningUser) => {
  const preferred = user.displayName?.trim() || user.email.split('@')[0]?.trim() || 'REO';
  const compact = preferred.replace(/\s+/g, ' ').slice(0, 48);
  return `${compact || 'REO'} Studio`;
};

export const buildTrialProvisioningPlan = (
  user: TrialProvisioningUser,
  now = new Date(),
  trialDays = 14,
  existingStudioId?: string,
): TrialProvisioningPlan => {
  const studioId = normalizeExistingStudioId(existingStudioId) || `studio_${hashIdentifier(user.uid)}`;
  const trialStartedAt = new Date(now.getTime());
  const boundedTrialDays = Math.min(30, Math.max(1, Math.trunc(trialDays) || 14));
  const trialEndsAt = new Date(now.getTime() + boundedTrialDays * 24 * 60 * 60 * 1000);
  const overlays = TRIAL_TEMPLATE_CATALOG.map((template, index): TrialOverlaySeed => {
    const order = index + 1;
    const id = `${studioId}-trial-${String(order).padStart(2, '0')}`;
    return {
      id,
      templateId: template.templateId,
      type: template.type,
      name: template.name,
      order,
      outputPath: `/output/${encodeURIComponent(id)}`,
      controlPath: `/control/${encodeURIComponent(id)}`,
      createdBy: user.uid,
      trialTemplate: true,
      brandingRequired: true,
      brandingLabel: 'REO LIVE',
      brandingLocked: true,
      lockedFieldIds: ['channelName'],
      seedOverrides: { channelName: 'REO LIVE' },
    };
  });

  return {
    studioId,
    studio: {
      ownerUid: user.uid,
      name: normalizeStudioName(user),
      slug: `trial-${hashIdentifier(user.uid, 16)}`,
      status: 'ACTIVE',
      trialProvisioned: true,
      provisioningVersion: PROVISIONING_VERSION,
      brandingPolicy: 'REO_REQUIRED',
      templateLimit: TRIAL_TEMPLATE_LIMIT,
    },
    membership: {
      uid: user.uid,
      role: 'OWNER',
      status: 'ACTIVE',
      invitedBy: null,
    },
    subscription: {
      planId: 'trial',
      status: 'TRIALING',
      trialStartedAt,
      trialEndsAt,
      provider: 'manual',
      providerSubscriptionId: null,
      adminOverride: null,
    },
    overlays,
  };
};

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return null;
};

const requireString = (value: unknown, code: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TrialProvisioningError(code, 'Trial studio data is incomplete.', 409);
  }
  return value.trim();
};

const buildStudioSummary = (
  plan: TrialProvisioningPlan,
  trialEndsAt: unknown,
  overlays: TrialOverlaySummary[],
): TrialStudioSummary => ({
  id: plan.studioId,
  name: plan.studio.name,
  status: 'ACTIVE',
  membershipRole: 'OWNER',
  subscriptionStatus: 'TRIALING',
  trialEndsAt: toIsoString(trialEndsAt),
  brandingPolicy: 'REO_REQUIRED',
  templateLimit: TRIAL_TEMPLATE_LIMIT,
  overlays: overlays.sort((left, right) => left.order - right.order),
});

export const provisionTrialStudio = async (
  firestore: Firestore,
  user: TrialProvisioningUser,
  trialDays: number,
  now = new Date(),
): Promise<TrialProvisioningResult> => firestore.runTransaction(async transaction => {
  const profileRef = firestore.collection('users').doc(user.uid);
  const profileSnapshot = await transaction.get(profileRef);
  if (!profileSnapshot.exists) {
    throw new TrialProvisioningError('IDENTITY_PROFILE_REQUIRED', 'The identity profile must exist before trial provisioning.', 409);
  }
  const primaryStudioId = profileSnapshot.exists && typeof profileSnapshot.get('primaryStudioId') === 'string'
    ? String(profileSnapshot.get('primaryStudioId')).trim()
    : '';
  const plan = buildTrialProvisioningPlan(user, now, trialDays, primaryStudioId || undefined);
  const studioRef = firestore.collection('studios').doc(plan.studioId);
  const membershipRef = studioRef.collection('members').doc(user.uid);
  const subscriptionRef = studioRef.collection('subscription').doc('current');
  const overlayRefs = plan.overlays.map(overlay => studioRef.collection('overlays').doc(overlay.id));

  const [studioSnapshot, membershipSnapshot, subscriptionSnapshot, ...overlaySnapshots] = await transaction.getAll(
    studioRef,
    membershipRef,
    subscriptionRef,
    ...overlayRefs,
  );

  if (studioSnapshot.exists && studioSnapshot.get('ownerUid') !== user.uid) {
    throw new TrialProvisioningError('STUDIO_OWNERSHIP_CONFLICT', 'The primary studio belongs to another account.', 409);
  }
  if (studioSnapshot.exists
      && studioSnapshot.get('brandingPolicy') !== undefined
      && studioSnapshot.get('brandingPolicy') !== 'REO_REQUIRED') {
    throw new TrialProvisioningError('STUDIO_BRANDING_CONFLICT', 'The trial studio branding policy is invalid.', 409);
  }
  if (membershipSnapshot.exists && membershipSnapshot.get('role') !== 'OWNER') {
    throw new TrialProvisioningError('MEMBERSHIP_CONFLICT', 'The current membership is not an owner membership.', 409);
  }
  if (subscriptionSnapshot.exists) {
    const planId = subscriptionSnapshot.get('planId');
    const status = subscriptionSnapshot.get('status');
    if (planId !== 'trial' || status !== 'TRIALING') {
      throw new TrialProvisioningError('SUBSCRIPTION_CONFLICT', 'The studio already has a non-trial subscription.', 409);
    }
  }
  overlaySnapshots.forEach((snapshot, index) => {
    if (snapshot.exists && snapshot.get('templateId') !== plan.overlays[index].templateId) {
      throw new TrialProvisioningError('OVERLAY_SEED_CONFLICT', 'A trial overlay seed has conflicting data.', 409);
    }
    if (snapshot.exists && snapshot.get('brandingRequired') !== true) {
      throw new TrialProvisioningError('OVERLAY_BRANDING_CONFLICT', 'A trial overlay cannot disable REO branding.', 409);
    }
  });

  const serverNow = FieldValue.serverTimestamp();
  transaction.set(profileRef, {
    primaryStudioId: plan.studioId,
    onboardingStatus: 'TRIAL_READY',
    updatedAt: serverNow,
  }, { merge: true });

  if (!studioSnapshot.exists) {
    transaction.create(studioRef, { ...plan.studio, createdAt: serverNow, updatedAt: serverNow });
  } else {
    transaction.set(studioRef, {
      trialProvisioned: true,
      provisioningVersion: PROVISIONING_VERSION,
      updatedAt: serverNow,
    }, { merge: true });
  }
  if (!membershipSnapshot.exists) {
    transaction.create(membershipRef, { ...plan.membership, joinedAt: serverNow, createdAt: serverNow });
  }
  if (!subscriptionSnapshot.exists) {
    transaction.create(subscriptionRef, {
      ...plan.subscription,
      trialStartedAt: Timestamp.fromDate(plan.subscription.trialStartedAt),
      trialEndsAt: Timestamp.fromDate(plan.subscription.trialEndsAt),
      createdAt: serverNow,
      updatedAt: serverNow,
    });
  }

  let createdOverlays = 0;
  overlaySnapshots.forEach((snapshot, index) => {
    if (snapshot.exists) return;
    const overlay = plan.overlays[index];
    transaction.create(overlayRefs[index], { ...overlay, createdAt: serverNow, updatedAt: serverNow });
    createdOverlays += 1;
  });

  const trialEndsAt = subscriptionSnapshot.exists
    ? subscriptionSnapshot.get('trialEndsAt')
    : Timestamp.fromDate(plan.subscription.trialEndsAt);
  return {
    provisioned: true,
    created: {
      studio: !studioSnapshot.exists,
      membership: !membershipSnapshot.exists,
      subscription: !subscriptionSnapshot.exists,
      overlays: createdOverlays,
    },
    studio: buildStudioSummary(plan, trialEndsAt, plan.overlays),
  };
});

export const getTrialStudio = async (
  firestore: Firestore,
  user: TrialProvisioningUser,
): Promise<TrialStudioSummary> => {
  const profileSnapshot = await firestore.collection('users').doc(user.uid).get();
  const studioId = requireString(profileSnapshot.get('primaryStudioId'), 'TRIAL_STUDIO_NOT_FOUND');
  const studioRef = firestore.collection('studios').doc(studioId);
  const [studioSnapshot, membershipSnapshot, subscriptionSnapshot, overlaysSnapshot] = await Promise.all([
    studioRef.get(),
    studioRef.collection('members').doc(user.uid).get(),
    studioRef.collection('subscription').doc('current').get(),
    studioRef.collection('overlays').get(),
  ]);

  if (!studioSnapshot.exists || studioSnapshot.get('ownerUid') !== user.uid) {
    throw new TrialProvisioningError('TRIAL_STUDIO_NOT_FOUND', 'No trial studio is available for this account.', 404);
  }
  if (studioSnapshot.get('brandingPolicy') !== 'REO_REQUIRED') {
    throw new TrialProvisioningError('STUDIO_BRANDING_INVALID', 'The trial studio branding policy is invalid.', 409);
  }
  if (!membershipSnapshot.exists || membershipSnapshot.get('role') !== 'OWNER') {
    throw new TrialProvisioningError('MEMBERSHIP_INVALID', 'The trial studio membership is invalid.', 403);
  }
  if (!subscriptionSnapshot.exists
      || subscriptionSnapshot.get('planId') !== 'trial'
      || subscriptionSnapshot.get('status') !== 'TRIALING') {
    throw new TrialProvisioningError('TRIAL_SUBSCRIPTION_NOT_FOUND', 'The trial subscription is unavailable.', 404);
  }

  const plan = buildTrialProvisioningPlan(user, new Date(), 14, studioId);
  const name = studioSnapshot.get('name');
  if (typeof name === 'string' && name.trim()) plan.studio.name = name.trim();
  const overlays = overlaysSnapshot.docs
    .filter(snapshot => snapshot.get('trialTemplate') === true)
    .map((snapshot): TrialOverlaySummary => ({
      id: snapshot.id,
      templateId: requireString(snapshot.get('templateId'), 'TRIAL_OVERLAY_INVALID'),
      name: requireString(snapshot.get('name'), 'TRIAL_OVERLAY_INVALID'),
      order: Number(snapshot.get('order')) || 0,
      outputPath: requireString(snapshot.get('outputPath'), 'TRIAL_OVERLAY_INVALID'),
      controlPath: requireString(snapshot.get('controlPath'), 'TRIAL_OVERLAY_INVALID'),
      brandingRequired: snapshot.get('brandingRequired') === true,
    }));

  if (overlays.length !== TRIAL_TEMPLATE_LIMIT || overlays.some(overlay => !overlay.brandingRequired)) {
    throw new TrialProvisioningError('TRIAL_OVERLAYS_INCOMPLETE', 'The trial overlay catalog is incomplete.', 409);
  }

  return buildStudioSummary(plan, subscriptionSnapshot.get('trialEndsAt'), overlays);
};
