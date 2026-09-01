/**
 * One past project a vendor puts forward as evidence of capability.
 *
 * Mirrors the exposed slice of `VendorProjectExperienceResponseDto`
 * (pm-api/src/modules/vendor/dto/vendor-project-experience.dto.ts) and the
 * backing `vendor_project_experiences` child table
 * (pm-api/src/modules/vendor/entities/vendor-project-experience.entity.ts).
 *
 * Replaces the deprecated vendor-level flat columns — `majorClients`
 * (one blob for every client), `projectExperience` (one narrative blob),
 * `pastPoContractReferences` and `blacklistingHistory` — with one structured
 * row per project, so a vendor can carry more than one.
 *
 * The backend entity carries many more fields (timeline, commercial value,
 * verification, evidence URLs, …) than are exposed here. Only the five the
 * Vendor Performance step actually edits are modelled; add more of the
 * entity's fields to this interface (and to `VendorProjectExperienceRequest`
 * in vendor-request.model.ts) if a later requirement needs them — nothing
 * about this shape has to change to grow that way.
 */
export interface VendorProjectExperience {
  /** Present once the record has been saved; absent for a row added in this session. */
  id?: string;
  projectName?: string;
  clientName?: string;
  projectExperience?: string;
  pastPoContractReferences?: string;
  blacklistingHistory?: string;
}
