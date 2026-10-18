---
name: pm-simple-master
description: Build a small lookup/master screen in the PM app — one list page with create/edit/view/delete dialogs, like Department, Material Category, Project Type, Vendor Type, Client Type, WBS. Use when asked for a "<X> Master" or "<X> Type" with a handful of fields (name, short name, description, display order, status), or "similar to Vendor Type / Project Type / Department".
---

# Simple master (list page + dialogs)

**Read `../pm-conventions/SKILL.md` first** — the code, RBAC, store and
verification rules there apply here and are not repeated.

## When this archetype fits

- ≤ ~12 fields that fit one dialog (two short sections).
- No child collections, no multi-step entry, no per-record documents.
- Used mostly as dropdown options for other screens (`GET /active`).

If the record has sections, child lists (contacts, addresses, lines) or
documents, use **pm-workspace-master** instead.

## Exemplars — clone, then rename

| Need | Copy from |
|---|---|
| Plain master, `isActive` via PUT | `pm-app/src/app/features/project-type/` + `pm-api/src/modules/project-type/` |
| Dedicated `PATCH :id/enable|disable`, status dialog, `isSystem` filter | `features/material-category/` |
| Parent dropdown + derived read-only info (project → client, discipline → department) | `features/wbs-cost-code/` |
| Oldest form of the pattern | `features/department/` |

Rename consistently: `ProjectType` → `Xxx`, `projectType` → `xxx`,
`project-type` → `xxx`, `PROJECT_TYPES` → `XXXS`, CSS prefix `pt-` → a new
two-letter prefix, `/project-types` → `/xxxs`.

## Files to produce

```
pm-app/src/app/features/<x>/
  <x>.component.{ts,html,scss}            list page (providers: [XStore])
  store/<x>.store.ts
  services/<x>.service.ts
  models/<x>.model.ts, <x>-request.model.ts, <x>-response.model.ts
  components/<x>-form-dialog/              create + edit (+ duplicate via prefill)
  components/<x>-view-dialog/              read-only, re-fetched by id
  components/<x>-delete-dialog/            confirm, 409 "in use" message
  components/<x>-status-dialog/            only if enable/disable endpoints exist

pm-api/src/modules/<x>/
  <x>.module.ts, <x>.controller.ts, <x>.service.ts, <x>.service.spec.ts
  entity/<x>.entity.ts
  dto/create-<x>.dto.ts, update-<x>.dto.ts, <x>-query.dto.ts, <x>-response.dto.ts
```
Plus: `MasterSequenceKey.<X>`, `app.module.ts`, permissions, role grants, menu
(under the Organization/admin group), route under `admin` children
(`loadComponent`, `data: { breadcrumb, permission }`).

## List page specifics

- `COLUMN_DEFS` with `alwaysVisible` for actions/code/name/status;
  `sortField` only on columns in the API's sort whitelist;
  `DEFAULT_HIDDEN_COLUMNS` for description and audit columns.
- Status filter `all | active | inactive`; status chip is clickable to toggle
  when the user has UPDATE.
- Row ⋮ menu: Duplicate (opens the form dialog in create mode and calls
  `componentInstance.prefill({... name: '<name> (Copy)'})`), Copy Code,
  Activate/Deactivate, Delete.
- Dialog sizes: form `760px`, view `600px`, delete `460px`, all `maxWidth: '95vw'`,
  form `disableClose: true`, pass `viewContainerRef` so the dialog injects the
  page store.

## Form dialog specifics

- `ProjectTypeFormDialogData { mode: 'create'|'edit'; id?: string }`, result
  `{ action: 'saved'; record; saveAndNew } | undefined`.
- Title: `New <X>` / `Edit <X>`; in edit, show the code read-only in the title
  area (e.g. "Edit Project Type · 0007"), **never as an input on create**.
- Sections: "General Information" (name, short name, parent selects, display
  order) and "Additional Information" (description, remarks).
- **No Status toggle on create** (defaults to Active); show it in edit only.
- No Organization field.
- Edit loads by id (`loading` spinner, `loadError`), `patchValue`, `markAsPristine`.
- Payload trims strings and sends `undefined` for empty optionals; `code` never sent.
- Actions: Reset, Cancel (confirm if dirty), **Save & New** (create only), Save
  (spinner while saving). Keep the dialog open on failure — the store already
  showed the snackbar.
- Character counters via `mat-hint align="end"` for length-limited fields.

## Backend specifics

- `create` wraps insert in `withGeneratedCode`; `isActive ?? true`,
  `displayOrder ?? 0`.
- `findAll` default sort `displayOrder ASC` (or `createdAt DESC`), returns
  `{ items, total, page, limit, totalPages }`.
- `findActive` for dropdowns ordered by displayOrder, name.
- `remove` soft-deletes; 409 when referenced by other data.
- Every create / update / enable / disable / status change / delete records a
  workflow step and notifies (pm-conventions §3a): `trackingId` column,
  `trackX()` helper around `WorkflowTrackingService.track`, audience registered
  in `onModuleInit`, `linkFor` route, new `WorkflowEntityType` value.
- Spec covers: code generation call, duplicate → 409, org scoping, code
  immutability, soft delete, sort whitelist fallback.

## Done when

All files above exist, the four wiring points are done, every action records a
workflow step (pm-conventions §3a), the new table SQL is in
the report, and the pm-conventions verification commands pass with no warnings.
