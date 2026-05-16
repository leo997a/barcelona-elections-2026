// ─── Workspace & Template Ownership ────────────────────────────────────────
// Types and utilities for multi-workspace template ownership.
// Currently used for type-safety; full multi-tenant enforcement is future work.

import type { SystemRole } from './permissions';
import { can } from './permissions';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
}

export interface TemplateOwnership {
  templateId: string;
  workspaceId: string;
  isGlobal: boolean;       // true = shared system template
  createdBy: string;       // ownerId of creator
}

// ── Access Checks ──────────────────────────────────────────────────────────

/**
 * Check if a user with a given role can edit a specific template.
 *
 * Rules:
 * - OWNER: can edit everything (global + any workspace)
 * - ADMIN_ASSISTANT: can edit global templates + own workspace
 * - SUBSCRIBER: can edit own workspace templates only
 * - VIEWER: cannot edit anything
 */
export function canEditTemplate(
  role: SystemRole,
  template: TemplateOwnership,
  userWorkspaceId: string,
): boolean {
  // OWNER can do anything
  if (can(role, 'SYSTEM_MANAGE_ALL')) return true;

  // VIEWER cannot edit
  if (!can(role, 'TEMPLATES_EDIT_OWN')) return false;

  // ADMIN_ASSISTANT can edit global templates
  if (template.isGlobal && can(role, 'TEMPLATES_EDIT_GLOBAL')) return true;

  // Own workspace check
  return template.workspaceId === userWorkspaceId;
}

/**
 * Check if a user can delete a specific template.
 *
 * Rules:
 * - OWNER: can delete anything (has TEMPLATES_DELETE_GLOBAL)
 * - ADMIN_ASSISTANT: can delete OWN workspace templates only — NOT global
 * - SUBSCRIBER: can delete own workspace templates only
 * - VIEWER: cannot delete
 */
export function canDeleteTemplate(
  role: SystemRole,
  template: TemplateOwnership,
  userWorkspaceId: string,
): boolean {
  // OWNER can do anything
  if (can(role, 'SYSTEM_MANAGE_ALL')) return true;

  // VIEWER cannot delete
  if (!can(role, 'TEMPLATES_EDIT_OWN')) return false;

  // Global templates: only roles with TEMPLATES_DELETE_GLOBAL can delete
  if (template.isGlobal) return can(role, 'TEMPLATES_DELETE_GLOBAL');

  // Own workspace check
  return template.workspaceId === userWorkspaceId;
}

/**
 * Check if a user can view a template.
 * Everyone with TEMPLATES_VIEW can view.
 */
export function canViewTemplate(role: SystemRole): boolean {
  return can(role, 'TEMPLATES_VIEW');
}
