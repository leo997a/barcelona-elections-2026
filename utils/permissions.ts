// ─── Role-Based Access Control (RBAC) ──────────────────────────────────────
// Central permissions system — all access checks go through can()

import type { LicenseRole } from '../services/licenseService';

// ── System Roles ───────────────────────────────────────────────────────────
export type SystemRole = 'OWNER' | 'ADMIN_ASSISTANT' | 'SUBSCRIBER' | 'VIEWER';

// ── Capabilities ───────────────────────────────────────────────────────────
export type Capability =
  // System-wide
  | 'SYSTEM_MANAGE_ALL'
  // Secrets
  | 'SECRETS_VIEW_METADATA'
  | 'SECRETS_TEST'
  | 'SECRETS_ROTATE'
  | 'SECRETS_DESTROY'
  // Users
  | 'USERS_MANAGE'
  // Templates
  | 'TEMPLATES_EDIT_GLOBAL'
  | 'TEMPLATES_DELETE_GLOBAL'
  | 'TEMPLATES_EDIT_OWN'
  | 'TEMPLATES_VIEW'
  // Audio
  | 'AUDIO_EDIT_GLOBAL'
  | 'AUDIO_EDIT_OWN'
  // Features
  | 'PLAYER_STATS_USE'
  | 'AI_BOX_USE'
  | 'STREAM_DECK_MANAGE'
  // Admin
  | 'LICENSE_GENERATE'
  | 'SECURITY_SETTINGS_EDIT'
  | 'READ_ONLY';

// ── Role → Capabilities Map ───────────────────────────────────────────────

const ROLE_CAPABILITIES: Record<SystemRole, readonly Capability[]> = {
  OWNER: [
    'SYSTEM_MANAGE_ALL',
    'SECRETS_VIEW_METADATA',
    'SECRETS_TEST',
    'SECRETS_ROTATE',
    'SECRETS_DESTROY',
    'USERS_MANAGE',
    'TEMPLATES_EDIT_GLOBAL',
    'TEMPLATES_DELETE_GLOBAL',
    'TEMPLATES_EDIT_OWN',
    'TEMPLATES_VIEW',
    'AUDIO_EDIT_GLOBAL',
    'AUDIO_EDIT_OWN',
    'PLAYER_STATS_USE',
    'AI_BOX_USE',
    'STREAM_DECK_MANAGE',
    'LICENSE_GENERATE',
    'SECURITY_SETTINGS_EDIT',
    'READ_ONLY',
  ],

  ADMIN_ASSISTANT: [
    'SECRETS_VIEW_METADATA',
    'SECRETS_TEST',
    'TEMPLATES_EDIT_GLOBAL',
    'TEMPLATES_EDIT_OWN',
    'TEMPLATES_VIEW',
    'AUDIO_EDIT_GLOBAL',
    'AUDIO_EDIT_OWN',
    'PLAYER_STATS_USE',
    'AI_BOX_USE',
    'STREAM_DECK_MANAGE',
    'READ_ONLY',
  ],

  SUBSCRIBER: [
    'TEMPLATES_EDIT_OWN',
    'TEMPLATES_VIEW',
    'AUDIO_EDIT_OWN',
    'PLAYER_STATS_USE',
    'AI_BOX_USE',
    'STREAM_DECK_MANAGE',
    'READ_ONLY',
  ],

  VIEWER: [
    'TEMPLATES_VIEW',
    'READ_ONLY',
  ],
} as const;

// ── License Role → System Role Mapping ────────────────────────────────────
// Backward-compatible: existing license keys keep working

export const LICENSE_TO_SYSTEM_ROLE: Record<LicenseRole, SystemRole> = {
  ADMIN: 'OWNER',
  EDITOR: 'ADMIN_ASSISTANT',
  OPERATOR: 'SUBSCRIBER',
  VIEWER: 'VIEWER',
};

// ── System Role → License Role (reverse mapping) ──────────────────────────

export const SYSTEM_TO_LICENSE_ROLE: Record<SystemRole, LicenseRole> = {
  OWNER: 'ADMIN',
  ADMIN_ASSISTANT: 'EDITOR',
  SUBSCRIBER: 'OPERATOR',
  VIEWER: 'VIEWER',
};

// ── Hierarchy ──────────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<SystemRole, number> = {
  OWNER: 3,
  ADMIN_ASSISTANT: 2,
  SUBSCRIBER: 1,
  VIEWER: 0,
};

// ── Core API ───────────────────────────────────────────────────────────────

/** Check if a role has a specific capability */
export function can(role: SystemRole, capability: Capability): boolean {
  const caps = ROLE_CAPABILITIES[role];
  if (!caps) return false;
  return caps.includes(capability);
}

/** Check if a role has ALL given capabilities */
export function canAll(role: SystemRole, capabilities: Capability[]): boolean {
  return capabilities.every(c => can(role, c));
}

/** Check if a role has ANY of the given capabilities */
export function canAny(role: SystemRole, capabilities: Capability[]): boolean {
  return capabilities.some(c => can(role, c));
}

/** Get all capabilities for a role */
export function getRoleCapabilities(role: SystemRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

/** Check if roleA is at least as privileged as roleB */
export function isAtLeast(roleA: SystemRole, roleB: SystemRole): boolean {
  return (ROLE_HIERARCHY[roleA] ?? -1) >= (ROLE_HIERARCHY[roleB] ?? 99);
}

/** Convert a LicenseRole to SystemRole */
export function toSystemRole(licenseRole: LicenseRole): SystemRole {
  return LICENSE_TO_SYSTEM_ROLE[licenseRole] ?? 'VIEWER';
}

/** Get display name (Arabic) for a system role */
export function getRoleDisplayName(role: SystemRole): string {
  const names: Record<SystemRole, string> = {
    OWNER: 'مالك النظام',
    ADMIN_ASSISTANT: 'مساعد المسؤول',
    SUBSCRIBER: 'مشترك',
    VIEWER: 'مشاهد',
  };
  return names[role] ?? role;
}
