---
name: pm-conventions
description: House rules for the Project Management app (Angular 20 pm-app + NestJS pm-api) — auto-generated codes, workflow_events + notifications for every user action (review/approve/reject/cancel/hold/enable/disable/delete…), RBAC/menu/route wiring, API envelope, error handling, signals/OnPush, forms, dates, responsive layout, verification. Read this before building or changing any feature in pm-app or pm-api; the pm-simple-master and pm-workspace-master skills build on it.
---

# Project Management app — conventions

Repos (siblings):
- Frontend: `D:\projects\project-management\pm-app` (Angular 20, standalone components, Angular Material, vitest)
- Backend: `D:\projects\project-management\pm-api` (NestJS, TypeORM + MySQL, class-validator, Swagger, jest)

Every feature ships **both sides**: API module + Angular feature. Match the
surrounding code — comment density, naming, idiom. Clone the exemplar named in
the archetype skill rather than inventing structure.

## 1. The `code` property (non-negotiable)

- `code` is **server-generated**: a per-organization, zero-padded sequence
  `0001, 0002, …` produced by `MasterCodeService.withGeneratedCode(org, MasterSequenceKey.X, cb)`
  (`pm-api/src/common/services/master-code.service.ts`). Add a new
  `MasterSequenceKey` entry for each new master.
- `code` is **never** in the Create DTO / create request model, never sent by the
  client, and immutable on update (reject a changed code with 409).
- **Create screens show no code field at all.** Not disabled, not "Auto Generated"
  placeholder — absent. After save it appears read-only: in the list (copyable),
  the view, and the edit header/title (e.g. `<span class="pw-code">0007</span>`).
  Dialogs that still carry a `code` control keep it `disable()`d and out of the
  template.
- Unique index `(organizationId, code)`; catch `ER_DUP_ENTRY` → `ConflictException`.
- A second, user-facing number (e.g. MR Number, Project No.) is a *different*
  field: if left empty it defaults to `code`, otherwise the typed value is stored
  (uniqueness checked → 409).

## 2. Other "don't show it on create" rules

- **Status** that defaults on create (Active, Planned, Draft…) is not shown as a
  control on create. Edit shows it read-only or behind its own action
  (toggle / Change Status dialog).
- **Organization** is resolved from the JWT (`req.user.organizationId`) — never a
  form field, never in the DTO.
- Audit fields (createdBy/At, updatedBy/At) are display-only (view/audit tab).

## 3. Backend module pattern (`pm-api/src/modules/<feature>/`)

`<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`,
`<feature>.service.spec.ts`, `entity/<feature>.entity.ts` (or `entities/`),
`dto/create-*.dto.ts`, `dto/update-*.dto.ts` (`PartialType`, OmitType status when
status has its own endpoint), `dto/*-query.dto.ts`, `dto/*-response.dto.ts`, `enums/` when needed.
Register the module in `app.module.ts`.

Entity: `id` uuid, unique `dguid`, `organizationId` + `ManyToOne(Organization)`,
`code` (length 20), business columns, `isActive` (or a status enum), soft delete
(`is_deleted`, `deletedAt`, `deletedBy`), `createdBy`, `updatedBy`,
`@CreateDateColumn createdAt`, `@UpdateDateColumn updatedAt`. Name the table
plural snake_case; check it doesn't already exist (e.g. `projects` was taken →
`project_masters`).

Controller: `@ApiTags`, `@ApiBearerAuth('JWT-auth')`, `@UseGuards(JwtAuthGuard, RolesGuard)`,
`@Roles(...)` per route (READERS/WRITERS arrays), `ParseUUIDPipe` on ids, every
response wrapped in `ResponseDto.created/success/updated/deleted`. Static routes
(`active`, `summary`, `import`, `export`) are declared **before** `:id`.

Standard endpoints: `POST /`, `GET /` (page, limit, sortBy, sortOrder ASC|DESC,
search, filters), `GET /active` (dropdown options), `GET /:id`, `PUT /:id`,
`DELETE /:id` (soft). Status changes: either `isActive` through PUT, or
`PATCH /:id/enable|disable`, or `PATCH /:id/status` with a transition table when
there is a lifecycle.

Service: sort-field whitelist (`ALLOWED_SORT_FIELDS`), escape `%`/`_` in LIKE
searches, `findActiveOrThrow` for org scoping + `isDeleted: false`, explicit
`toResponse()` mapper, `CustomLoggerService` for errors (`logger.error(msg, stack)`).
Relations (client of a project, department of a discipline) are **read through
the relation**, never copied into the child record.

DTOs: class-validator on every field; `null` must clear optional fields on
update (`@IsOptional()` already allows null); Swagger `@ApiProperty` examples.

Schema: TypeORM `synchronize` is not relied on — **list every new table/column/
enum change as SQL in the final report** for the user to run.

## 3a. Workflow events & notifications (every action, every time)

Applies to Material Master, Vendor Master, Material Requisition, RFQ, Purchase
Order and **any new module or endpoint**. You do not need to be asked: every
user action that creates, changes, decides on or removes a record is written to
`workflow_events`, and that write fans out to the `notifications` table.

What counts as an action: create / clone, update, submit / resubmit, review,
approve, reject, return, cancel / withdraw, request (maker–checker), hold /
release, enable / disable, obsolete, lock, delete. Reads, exports and uploads
of a file are not actions.

**Backend checklist**

1. Entity type — add the document to `WorkflowEntityType`
   (`pm-api/src/modules/workflow-tracking/enums/workflow-tracking.enums.ts`).
   Existing: MATERIAL_REQUISITION, MR_REVIEW, MR_APPROVAL, RFQ, RFQ_APPROVAL,
   PURCHASE_ORDER, GOODS_RECEIPT, INVOICE, MATERIAL, VENDOR, PROJECT_ASSIGNMENT.
2. Actions — reuse `WorkflowAction`: CREATED, UPDATED, SUBMITTED,
   RESUBMITTED, EDITED_IN_REVIEW, REVIEWED, REVIEW_COMPLETED, APPROVED,
   APPROVAL_COMPLETED, RETURNED, REJECTED, CANCELLED, REQUESTED, DELETED,
   ASSIGNED, UNASSIGNED, STATUS_CHANGED, LOCKED, NOTIFIED. Enable / disable / obsolete / hold /
   release are **STATUS_CHANGED with fromStatus → toStatus** (no new action).
   Add a new action only for a genuinely new kind of step, and give it a phrase
   in `ACTION_PHRASES` (notification.service.ts).
3. trackingId — every step needs one.
   - Procurement documents (RFQ, PO, GRN, invoice) **copy the trackingId of the
     document they were raised from** (the MR's); never generate their own.
   - Records with their own history (masters, MR) get a nullable
     `trackingId varchar(30)` column, assigned on the first step. Strip it in
     `clone()` so a clone starts its own history.
4. Record the step —
   - Record with its own trackingId column: inject
     `@Optional() private readonly workflow?: WorkflowTrackingService` and call
     `this.workflow.track(Entity, record, { entityType, entityReference: record.code,
     action, fromStatus, toStatus, comments, actor, metadata })`. It assigns the
     trackingId when missing. Wrap it in a private `trackX()` helper that
     resolves the actor (`{ userId, name, email }`) and never throws — copy
     `trackVendor` (vendor.service.ts) / `trackMaterial` (material.service.ts).
   - Inside a transaction (MR style): `ensureTrackingId` then
     `this.tracking.record({...}, manager)` so the step and the notification
     roll back with the change.
   - Record **after** the change is saved, capturing `fromStatus` before it.
5. Audience — the module registers who is concerned, once, in `onModuleInit`:
   `this.notifications?.registerWorkflowAudience([WorkflowEntityType.X], async (event, manager) => userIds)`
   (creator / requester / participants / owners). The actor is always excluded
   automatically. Per-step extras go in the step's `metadata`:
   - `notifyUserIds: string[]`, `notifyEmails: string[]` — extra recipients
     (e.g. the nominated approvers of a request);
   - `emailedTo: string[]` — people who were emailed about this same step
     (via EmailService); they already get the email's notification, so the
     workflow one is not repeated for them.
6. Link — add the document's route to `linkFor()` in notification.service.ts
   (MATERIAL → /admin/materials/:id, VENDOR → /vendors/:id/view,
   MR → /material-requisitions/:id, RFQ → /rfqs/:id, PO → /purchase-orders/:id)
   and its display name to `DOCUMENT_LABELS`.
7. Emails — send through `EmailService.sendEmail` with an `EmailType` value
   (add one to `email.enums.ts` if missing), `reference: { type, id }` and
   `metadata.trackingId`; it lands in `email_history` and becomes **two**
   notifications by itself: the EMAIL one (opens the email) and an in-app item
   of the same type (WORKFLOW for document emails, SYSTEM for account mail,
   sourceType EMAIL_WORKFLOW) that still reaches the user if delivery fails.
   Register `notifications.registerEmailDescriber([referenceType], fn)` in
   `onModuleInit` so that item carries the document details (message +
   `metadata.details: [{ label, value }]`) — copy `describeForEmail` in
   material-requisition-workflow.service.ts (project, description, client, WBS).
8. Module — import `WorkflowTrackingModule` and `NotificationModule`; keep the
   injections `@Optional()` so specs that don't provide them still compile.
9. Silent steps — CREATED, REVIEW_COMPLETED, APPROVAL_COMPLETED and NOTIFIED are
   recorded but never notified (`SILENT_ACTIONS`).
10. Spec — assert the step is recorded (entityType, action, from/to status) for
    each status/decision method.
11. SQL — `entityType` and `action` are MySQL ENUM columns: a new value means
    an `ALTER TABLE workflow_events MODIFY ...` in the report, plus
    `ALTER TABLE <table> ADD COLUMN trackingId varchar(30) NULL` for a new
    tracked record. Dev synchronizes; production does not.

**Frontend**: nothing per feature — the drawer and `/notifications` read the
feed. Only add an icon rule in `notificationVisual()` (models/notification.model.ts)
when you add a new WorkflowAction, and keep the document's `link` route valid.

## 3b. Project visibility (every project-scoped read)

Non-administrators see only the projects they are actively mapped to
(`user_project_mappings`), manage, or created; OrganizationAdmin / SuperAdmin
see all. Any new endpoint that lists, returns or accepts a project must apply
`UserProjectAccessService` (import `UserProjectMappingModule`): `scope(qb, alias, viewer)`
for lists/dropdowns, `assertCanSee` (404) for one project, `canSee` before
accepting a projectId. The viewer is `{ userId, email, role }` from `req.user`.
Visibility never replaces role permissions.

## 4. Frontend feature layout (`pm-app/src/app/features/<feature>/`)

`models/<f>.model.ts` (domain interfaces mirroring the response DTO, sort-field
union, filter + `DEFAULT_*_FILTER`, option lists, label helpers),
`models/<f>-request.model.ts` (mirrors Create/Update/Query DTOs — note `limit`
and `sortOrder: 'ASC'|'DESC'`), `models/<f>-response.model.ts`
(`ApiEnvelope<T>`, `Paged<T>` aliases), `services/<f>.service.ts`
(`providedIn: 'root'`, thin HttpClient, one method per endpoint, base
`${environment.apiUrl}/v1/<route>`), `store/<f>.store.ts` (page-level signal store).

Components: standalone, `ChangeDetectionStrategy.OnPush`, `inject()`, signals +
`computed`; `protected readonly` for template members. Never write a signal from
a method the template calls. Page stores / form services are provided at the
component (`providers: [XStore]`), not root.

Store pattern: `reload$` Subject → `switchMap(fetch)` with `catchError` returning
`of(void 0)` (keeps the stream alive); debounced `searchInput$` (350 ms);
`page/pageSize/sortBy/sortDirection/filter` signals; `isEmpty`, `hasActiveFilters`
computeds; CRUD methods set `saving`, snack on success, `reload$.next()`, and on
failure `throw this.toStoreError(err, fallback, {409: …})` which shows an
`error-snackbar`. Callers `try { await store.x() } catch { /* already surfaced */ }`.

Error messages: map 0/400/401/403/404/409/422/500 to friendly text
(`messageForStatus`); only show API text when the backend sent a deliberate
`message` (join arrays).

## 5. RBAC, menu, routes (all four, every time)

1. `src/app/core/rbac/permissions.const.ts` (**CRLF file**): `<F>_VIEW/CREATE/UPDATE/DELETE/EXPORT` (+ `_STATUS`, `_SUBMIT` as needed).
2. `src/app/core/rbac/role-permissions.config.ts`: OrganizationAdmin gets all; grant other roles deliberately.
3. `src/app/core/navigation/config/super-admin-menu.config.ts`: menu entry with `permission`.
4. `src/app/app.routes.ts` (**CRLF file**): simple masters → `loadComponent` under `admin` children; workspace masters → `loadChildren` of `<F>_ROUTES` with `canActivate: [permissionGuard]` and `data: { breadcrumb, title, icon, permission }`.

Templates gate every action with `can(PERMISSIONS.X)`.

## 6. Forms & UX rules

- Reactive forms; `err(control)` helper returns one message, shown only when touched.
- Required marked with `required`; Save disabled while `saving()`.
- **Searchable dropdowns** for any list that can grow (projects, clients,
  WBS, currencies, time zones): `<mat-option>` containing an
  `input.select-search` bound to a search signal with `(click)` and `(keydown)`
  `stopPropagation()`; filter with a `computed`.
- Show related master data **read-only for information** next to the select
  (client of the chosen project, department of the chosen discipline).
- Dates: `MatDatepickerModule` + `MatNativeDateModule`, input `readonly`,
  `(click)="picker.open()"`, `mat-datepicker-toggle matSuffix`; cross-field rules
  (end > start) via group validator **and** `[min]`. Treat dates as calendar
  days — use `parseIsoDate` / `toIsoDate` (`features/project/services/project.mapper.ts`), never `toISOString()`.
- Unsaved changes: Cancel on a dirty dialog confirms via `ConfirmDialogComponent`;
  routed editors use a `CanDeactivate` guard + `@HostListener('window:beforeunload')`.
- NG8011: a projected node (`matSuffix`, `mat-hint`, `mat-error`) must be the
  single root of its `@if` block.
- Uploads: card ("doc-slot") with icon + title + subtitle, dashed dropzone with
  `add_circle_outline` "Add New Document", accepted types hint, list of files with
  view / replace / remove, italic "No documents uploaded yet." when empty. Allow
  multiple where it makes sense.

## 7. List page standard

Header (title + one-line purpose) → toolbar: **New**, **Refresh**, **Import**
(if supported), **Export** menu (CSV client-side, Excel "coming soon", Print),
**Filters** toggle with badge → spacer → column chooser (checkbox menu, reset,
persisted to localStorage), density toggle, fullscreen (Esc exits) → search field
(+ clear) and count → collapsible filter panel → table card with skeleton
loading, error + Retry, empty and no-match states, sticky header, sortable
columns limited to the API whitelist, status chips with dot, row click = view,
action column (View, Edit, ⋮ menu: Copy code, Duplicate/Clone, status actions,
Delete in warn style, each with an icon) → **mobile cards** (`<details>` for
secondary fields) → `mat-paginator` `[10, 20, 50, 100]`.

## 8. Responsive

Two-column grids collapse to one at ~860px; three/four-column info grids step
down at 1100/640px; no horizontal page scroll; dialogs `width` + `maxWidth: '95vw'`;
tables in an `overflow-x: auto` wrapper; stepper headers hidden below 900px with
a "Step N of M — Title" line instead.

## 9. Verify before reporting

```bash
npx tsc --noEmit -p tsconfig.app.json
npx ng build --configuration development
npx ng test --watch=false --include="src/app/features/<feature>/**/*.spec.ts"
npx ng test --watch=false
```
In pm-api: `npx tsc --noEmit -p tsconfig.json` and `npx jest src/modules/<feature>`.
The build must have **no warnings** (unused imports such as RouterLink = NG8113).
Known pre-existing failures to ignore: AppController "Hello World!", two
VendorService.update guard tests.

Final report: what was built, decisions/interpretations, which actions now
record workflow steps (§3a), SQL to run, anything not done.

## 10. Tooling quirks (Windows / Git Bash)

- Prefer the Write/Edit tools over heredocs or `node -e` for multi-line code —
  escapes get mangled. For scripted multi-file edits, write a `.js` file to the
  scratchpad and run it.
- `app.routes.ts` and `permissions.const.ts` are CRLF: normalise to `\n`, edit,
  write back with `\r\n`.
