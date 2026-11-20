import { PERMISSIONS } from './permissions.const';

/**
 * What external (vendor) accounts may use — the one place to open or close a
 * feature for them.
 *
 * Default-deny: an external account gets ONLY the permissions listed in
 * EXTERNAL_ALLOWED_PERMISSIONS, whatever its role grants. Every other feature —
 * including any added later — is internal-only until it is listed here.
 *
 * INTERNAL_ONLY_PERMISSIONS is the explicit "never for external users" list: a
 * permission in it is withheld from external accounts even if it is also added
 * to the allowed list by mistake.
 *
 * Menu items without a permission are hidden from external accounts too,
 * unless the item sets `externalAccess: true` (see MenuItem).
 *
 * The API enforces the same rule with @InternalOnly() (pm-api
 * src/common/decorators/internal-only.decorator.ts) — keep both in step.
 */
export const EXTERNAL_ALLOWED_PERMISSIONS: readonly string[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.PROFILE_VIEW,
  // Requests for Quotation issued to the vendor: acknowledge and respond.
  PERMISSIONS.RFQ_RESPOND,
  // The RFQ menu entry (granted once the vendor has acknowledged an RFQ).
  PERMISSIONS.RFQ_VENDOR_MENU,
];

export const INTERNAL_ONLY_PERMISSIONS: readonly string[] = [
  // Material requisitions: reviewers and approvers are always company users.
  PERMISSIONS.MATERIAL_REQUISITIONS_VIEW,
  PERMISSIONS.MATERIAL_REQUISITIONS_CREATE,
  PERMISSIONS.MATERIAL_REQUISITIONS_UPDATE,
  PERMISSIONS.MATERIAL_REQUISITIONS_DELETE,
  PERMISSIONS.MATERIAL_REQUISITIONS_SUBMIT,
  PERMISSIONS.MATERIAL_REQUISITIONS_EXPORT,
  PERMISSIONS.MATERIAL_REQUISITIONS_REVIEW,
  PERMISSIONS.MATERIAL_REQUISITIONS_APPROVE,
  // The buyer's RFQ screens (vendors use /vendor-rfqs).
  PERMISSIONS.RFQ_VIEW,
  PERMISSIONS.RFQ_MANAGE,
];

/** An external account's permissions: what its role and the vendor features grant, limited by the lists above. */
export function externalPermissions(granted: readonly string[]): string[] {
  return [...new Set(granted)].filter(
    (p) => EXTERNAL_ALLOWED_PERMISSIONS.includes(p) && !INTERNAL_ONLY_PERMISSIONS.includes(p),
  );
}
