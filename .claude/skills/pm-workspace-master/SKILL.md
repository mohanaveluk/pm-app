---
name: pm-workspace-master
description: Build a rich, route-based master or transaction screen in the PM app — list page + full-page create/edit workspace (tabs/stepper of sections) + read-only view, like Material Master, Vendor Master, Client Master, Project Master, Material Requisition. Use when asked for a "<X> Master" with many fields, sections/tabs, child lists (contacts, addresses, lines), documents, import/export, or "similar to Material Master / Vendor Master".
---

# Workspace master (list route + workspace + view)

**Read `../pm-conventions/SKILL.md` first** — the code, RBAC, store and
verification rules there apply here and are not repeated.

## Choose the variant

| Variant | Use when | Exemplar |
|---|---|---|
| **Multi-step workspace, saves per step** | 6+ sections; record should exist after step 1 so later sections can be filled any time | `features/material/` (9 steps), `features/vendor/` (+ approval, blacklist, import) |
| **Sectioned workspace + tabbed view** | Sections of one record (Overview, Addresses, Contacts, Commercial, Defaults, Documents) entered in a stepper, shown in the view as tabs incl. Audit History | `features/client/` |
| **One-page workspace** | Two or three sections fit one scrolling page | `features/project/` (`project-workspace`) |
| **Transaction wizard** | Header → lines → review & submit, with a status lifecycle | `features/material-requisition/` |

Ask the user only if the request truly doesn't indicate which; otherwise pick
and state the choice.

## Files to produce

```
features/<x>/
  <x>.routes.ts                     '', 'create', ':id/edit', ':id'
  <x>-list/<x>-list.component.{ts,html,scss}
  <x>-workspace/<x>-workspace.component.{ts,html,scss}   (providers: [XFormService])
  <x>-view/<x>-view.component.{ts,html,scss}
  components/<x>-<section>-step/…   one per section, shared stylesheet
  components/<x>-step.shared.scss
  components/<x>-status-dialog/ | <x>-import-dialog/   when needed
  services/<x>.service.ts           HTTP
  services/<x>-form.service.ts      FormGroup per section + reference data
  services/<x>.mapper.ts (+ .spec)  toFormValue / toRequest / pickSection
  store/<x>-list.store.ts
  guards/unsaved-<x>.guard.ts       CanDeactivate contract
  models/…
```

## Routes

```ts
{ path: '', loadComponent: list, data: { breadcrumb: '' } },
{ path: 'create', loadComponent: workspace, canActivate: [permissionGuard],
  canDeactivate: [unsavedXGuard], data: { breadcrumb: 'Create', mode: 'create', permission: X_CREATE } },
{ path: ':id/edit', …same, mode: 'edit', permission: X_UPDATE },
{ path: ':id', loadComponent: view, data: { breadcrumb: 'Details' } },
```
Mounted from `app.routes.ts` with `loadChildren` (static paths before `:id`).

## Form service

- `@Injectable()` (not root), provided by the workspace.
- `X_STEPS = [{ key, label, icon, title }] as const`, `XStepKey` type.
- One `FormGroup` per section inside `form`; `group(key)` accessor;
  cross-field validators at group level.
- Reference data signals loaded with `forkJoin` (`referenceLoading`,
  `referenceError` + Retry); `toSignal(control.valueChanges)` for cascades
  (category → groups, project → WBS) and derived read-only info.
- `patch(value)`, `markAllTouched()`, `value()`.
- **No `code` control in any section on create.** Show the code in the
  workspace header once saved (`NEW <X>` placeholder chip before that, with the
  hint "The number is generated when you save it").
- Defaults applied from a parent (client → project currency, time zone) only
  fill empty fields and say so ("Applied from the client: …").

## Workspace

- `mode` from `route.snapshot.data['mode']`; edit loads by id (404 message).
- Header: back button, eyebrow ("Material Master"), code + name, status chip.
- Stepper/tabs: create = linear on the mandatory first section; edit = free
  navigation. Step state icons (done / error / edit). Below 900px hide the step
  rail and show "Step N of M — Title".
- Per-step save variant: first Next POSTs, later steps PUT `pickSection(key)`;
  "Saved" indicator with time.
- Sticky footer: Cancel · spacer · Back · Save Draft/Save · Next or final action.
- Success screen after create/submit: icon, code/number, status, primary facts,
  actions (View, Create another, Back to list).
- Status is **not editable on create**; changes later via a status dialog/menu
  enforcing the transition table.
- `canDeactivate()` confirms when dirty; `bypassGuard` set right before
  deliberate navigation after a save; `beforeunload` listener.

## Step components

- `ChangeDetectionStrategy.OnPush`, inject the form service, bind the section
  group, `styleUrl: '../<x>-step.shared.scss'`.
- `readonly = input(false)` so the View screen can reuse the same steps.
- Sections use `.step-section` cards with an icon title and `.step-grid`
  (2 columns → 1). Repeating child lists use `.repeat-card` with add/remove and
  an empty state. "Create on the fly" dialogs for missing lookups
  (e.g. new category/group) refresh and select the new option.

## List

Everything in pm-conventions §7, plus for this archetype: **New** navigates to
`create`; **Import** opens an import dialog (template download → upload →
preview with row errors → confirm) or a preset wizard source; filters for the
main lookups (status, category, client, project…) in a collapsible panel; query
params can pre-filter (e.g. `?clientId=` from a parent's "View Projects");
⋮ menu with View, Edit, Clone, status actions (Mark Obsolete, Disable/Enable,
Hold/Release, Change Status), Copy code, Delete — each with an icon, disabled
with a tooltip when the status doesn't allow it.

## View

Read-only page: same header, sections as `review-fields` definition grids or
the step components with `[readonly]="true"`, child tables, documents with open
links, audit info; Edit / status actions / Delete gated by permission and status.

## Tests

Mapper spec (round-trip, empty → null, code never in request), form-service spec
(validators, cascades, defaults), and for transactions the line/selection rules.
API service spec with the transaction-manager harness for create/update/status.

## Done when

List, workspace, view, routes, guard, form service, mapper, store, specs and
the backend module exist; wiring (pm-conventions §5) is done; SQL is reported;
the verification commands pass with no warnings.
