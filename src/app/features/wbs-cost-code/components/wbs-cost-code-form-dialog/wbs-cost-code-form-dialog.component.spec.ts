import { vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { WbsCostCodeFormDialogComponent, WbsCostCodeFormDialogData } from './wbs-cost-code-form-dialog.component';
import { WbsCostCodeStore } from '../../store/wbs-cost-code.store';
import { DisciplineOption, ProjectOption, WbsCostCode } from '../../models/wbs-cost-code.model';

const ACTIVE_DISCIPLINES: DisciplineOption[] = [
  { id: 'd-civil', code: '0001', name: 'Civil', department: { id: 'dep-eng', name: 'Engineering' } },
  { id: 'd-mech', code: '0002', name: 'Mechanical', department: { id: 'dep-ops', name: 'Operations' } },
];

const OPEN_PROJECTS: ProjectOption[] = [
  { id: 'p1', code: '0042', projectName: 'Unit 4 Expansion', clientId: 'c1', clientCode: '0007', clientName: 'Gulf Petrochemical Holdings', status: 'ACTIVE' as ProjectOption['status'], currencyCode: 'USD' },
  { id: 'p2', code: '0043', projectName: 'Tank Farm Revamp', clientId: 'c2', clientCode: '0008', clientName: 'Coastal Energy', status: 'PLANNED' as ProjectOption['status'], currencyCode: null },
];

const RECORD: WbsCostCode = {
  id: 'w1', dguid: 'g1', organizationId: 'org-1', code: '0007',
  projectDetails: 'Unit 100 civil works',
  areaFacility: 'Process Area 1', systemSubsystem: 'Cooling Water',
  projectId: 'p1', projectCode: '0042', projectName: 'Unit 4 Expansion',
  clientId: 'c1', clientCode: '0007', clientName: 'Gulf Petrochemical Holdings',
  disciplineId: 'd-civil', disciplineName: 'Civil', departmentName: 'Engineering',
  workPackage: 'WP-110', activities: 'Excavation, rebar, pour',
  isActive: true, createdAt: '2026-01-01T00:00:00Z',
};

async function setup(data: WbsCostCodeFormDialogData, record: WbsCostCode = RECORD) {
  const store = {
    saving: signal(false),
    disciplines: signal<DisciplineOption[]>(ACTIVE_DISCIPLINES),
    disciplinesLoading: signal(false),
    projects: signal<ProjectOption[]>(OPEN_PROJECTS),
    projectsLoading: signal(false),
    getWbsCostCodeById: vi.fn(async () => record),
    createWbsCostCode: vi.fn(async (p: object) => ({ ...RECORD, ...p, id: 'new' })),
    updateWbsCostCode: vi.fn(async (_id: string, p: object) => ({ ...RECORD, ...p })),
  };
  const dialogRef = { close: vi.fn() };

  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      { provide: WbsCostCodeStore, useValue: store },
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: data },
    ],
  });

  const fixture = TestBed.createComponent(WbsCostCodeFormDialogComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();

  // `form` and `disciplineOptions` are protected members the template binds to;
  // the tests drive and read them directly.
  const cmp = fixture.componentInstance as any;
  return { fixture, cmp, store, dialogRef };
}

describe('WbsCostCodeFormDialogComponent', () => {
  it('requires the project details and rejects whitespace-only input', async () => {
    const { cmp } = await setup({ mode: 'create' });
    expect(cmp.form.invalid).toBe(true);

    cmp.form.patchValue({ projectId: 'p1', projectDetails: '    ' });
    expect(cmp.form.controls.projectDetails.errors?.['pattern']).toBeTruthy();
    expect(cmp.form.invalid).toBe(true);

    cmp.form.patchValue({ projectId: 'p1', projectDetails: 'Unit 100' });
    expect(cmp.form.valid).toBe(true);
  });

  it('creates with trimmed text, null for blank optional fields and no code', async () => {
    const { cmp, store, dialogRef } = await setup({ mode: 'create' });

    cmp.form.patchValue({ projectId: 'p1', projectDetails: '  Unit 100  ', areaFacility: '  ', workPackage: ' WP-1 ' });
    await cmp.save(false);

    expect(store.createWbsCostCode).toHaveBeenCalledWith({
      projectDetails: 'Unit 100',
      projectId: 'p1',
      areaFacility: null,
      systemSubsystem: null,
      disciplineId: null,
      workPackage: 'WP-1',
      activities: null,
      isActive: true,
    });
    expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({ action: 'saved' }));
  });

  it('sends the chosen discipline', async () => {
    const { cmp, store } = await setup({ mode: 'create' });

    cmp.form.patchValue({ projectId: 'p1', projectDetails: 'Unit 100', disciplineId: 'd-mech' });
    await cmp.save(false);

    expect(store.createWbsCostCode).toHaveBeenCalledWith(expect.objectContaining({ disciplineId: 'd-mech' }));
  });

  it('stays open and keeps the form after "Save & New" resets it', async () => {
    const { cmp, store, dialogRef } = await setup({ mode: 'create' });

    cmp.form.patchValue({ projectId: 'p1', projectDetails: 'Unit 100', workPackage: 'WP-1' });
    await cmp.save(true);

    expect(store.createWbsCostCode).toHaveBeenCalledOnce();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(cmp.form.getRawValue().projectDetails).toBe('');
    expect(cmp.form.controls.isActive.value).toBe(true);
  });

  it('does not submit an invalid form', async () => {
    const { cmp, store } = await setup({ mode: 'create' });
    await cmp.save(false);
    expect(store.createWbsCostCode).not.toHaveBeenCalled();
  });

  it('loads the record in edit mode, with the code shown read-only', async () => {
    const { cmp, store } = await setup({ mode: 'edit', wbsCostCodeId: 'w1' });

    expect(store.getWbsCostCodeById).toHaveBeenCalledWith('w1');
    expect(cmp.form.controls.code.disabled).toBe(true);
    expect(cmp.form.getRawValue()).toMatchObject({
      code: '0007',
      projectDetails: 'Unit 100 civil works',
      areaFacility: 'Process Area 1',
      disciplineId: 'd-civil',
      workPackage: 'WP-110',
    });
  });

  it('clears a field and the discipline by sending null on update, never the code', async () => {
    const { cmp, store } = await setup({ mode: 'edit', wbsCostCodeId: 'w1' });

    cmp.form.patchValue({ areaFacility: '', disciplineId: '' });
    await cmp.save(false);

    const [id, payload] = store.updateWbsCostCode.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('w1');
    expect(payload['areaFacility']).toBeNull();
    expect(payload['disciplineId']).toBeNull();
    expect(payload['systemSubsystem']).toBe('Cooling Water');
    expect(payload).not.toHaveProperty('code');
  });

  it('keeps the discipline of the record selectable when it is no longer active', async () => {
    const { cmp } = await setup(
      { mode: 'edit', wbsCostCodeId: 'w1' },
      { ...RECORD, disciplineId: 'd-retired', disciplineName: 'Retired Discipline' },
    );

    const options = cmp.disciplineOptions() as DisciplineOption[];
    expect(options.map((d) => d.id)).toEqual(['d-retired', 'd-civil', 'd-mech']);
    expect(cmp.form.controls.disciplineId.value).toBe('d-retired');
  });

  it('does not duplicate the discipline option when it is already active', async () => {
    const { cmp } = await setup({ mode: 'edit', wbsCostCodeId: 'w1' });
    expect((cmp.disciplineOptions() as DisciplineOption[]).map((d) => d.id)).toEqual(['d-civil', 'd-mech']);
  });

  describe('project', () => {
    it('is required', async () => {
      const { cmp } = await setup({ mode: 'create' });

      cmp.form.patchValue({ projectDetails: 'Unit 100' });
      expect(cmp.form.controls.projectId.errors?.['required']).toBeTruthy();
      expect(cmp.form.valid).toBe(false);

      cmp.form.patchValue({ projectId: 'p1' });
      expect(cmp.form.valid).toBe(true);
    });

    it('is sent as an id, with no client name or code', async () => {
      const { cmp, store } = await setup({ mode: 'create' });
      cmp.form.patchValue({ projectId: 'p2', projectDetails: 'Unit 100' });

      await cmp.save(false);

      const body = store.createWbsCostCode.mock.calls[0][0] as Record<string, unknown>;
      expect(body['projectId']).toBe('p2');
      expect(body).not.toHaveProperty('clientName');
      expect(body).not.toHaveProperty('clientCode');
      expect(body).not.toHaveProperty('projectCode');
    });

    it('finds projects by number, name or client', async () => {
      const { cmp } = await setup({ mode: 'create' });
      const ids = () => (cmp.visibleProjects() as ProjectOption[]).map((p) => p.id);

      expect(ids()).toEqual(['p1', 'p2']);

      cmp.projectSearch.set('0043');
      expect(ids()).toEqual(['p2']);

      cmp.projectSearch.set('tank');
      expect(ids()).toEqual(['p2']);

      cmp.projectSearch.set('gulf');
      expect(ids()).toEqual(['p1']);

      cmp.projectSearch.set('0008');
      expect(ids()).toEqual(['p2']);

      cmp.projectSearch.set('nothing');
      expect(ids()).toEqual([]);
    });

    it('caps a long list and says so', async () => {
      const many: ProjectOption[] = Array.from({ length: 250 }, (_, i) => ({
        id: 'x' + i, code: String(i).padStart(4, '0'), projectName: 'Project ' + i, clientId: 'c',
        clientCode: '0001', clientName: 'Client', status: 'ACTIVE' as ProjectOption['status'], currencyCode: null,
      }));
      const { cmp, store } = await setup({ mode: 'create' });
      store.projects.set(many);

      expect(cmp.visibleProjects()).toHaveLength(100);
      expect(cmp.hiddenProjectCount()).toBe(150);

      cmp.projectSearch.set('Project 24');
      expect(cmp.hiddenProjectCount()).toBe(0);
    });

    it('shows the client of the chosen project for information', async () => {
      const { cmp } = await setup({ mode: 'create' });
      expect(cmp.clientText()).toBe('');

      cmp.form.controls.projectId.setValue('p2');

      expect(cmp.clientText()).toBe('0008 — Coastal Energy');
    });

    it('keeps the own project of the record when it is no longer open', async () => {
      const { cmp } = await setup(
        { mode: 'edit', wbsCostCodeId: 'w1' },
        { ...RECORD, projectId: 'p-done', projectCode: '0009', projectName: 'Old Plant', clientName: 'Legacy Co', clientCode: '0003' },
      );

      expect((cmp.visibleProjects() as ProjectOption[]).map((p) => p.id)).toContain('p-done');
      expect(cmp.form.controls.projectId.value).toBe('p-done');
      expect(cmp.clientText()).toBe('0003 — Legacy Co');
    });

    it('is dropped from a duplicate when that project is no longer open', async () => {
      const { cmp } = await setup({ mode: 'create' });

      cmp.prefill({ projectId: 'p2' });
      expect(cmp.form.controls.projectId.value).toBe('p2');

      cmp.prefill({ projectId: 'p-done' });
      expect(cmp.form.controls.projectId.value).toBe('');
    });
  });

  describe('department', () => {
    it('shows the department of the chosen discipline for information', async () => {
      const { cmp } = await setup({ mode: 'create' });
      expect(cmp.departmentText()).toBe('');

      cmp.form.controls.disciplineId.setValue('d-mech');
      expect(cmp.departmentText()).toBe('Operations');

      cmp.form.controls.disciplineId.setValue('d-civil');
      expect(cmp.departmentText()).toBe('Engineering');

      cmp.form.controls.disciplineId.setValue('');
      expect(cmp.departmentText()).toBe('');
    });

    it('still shows it for a discipline that has since been deactivated', async () => {
      const { cmp } = await setup(
        { mode: 'edit', wbsCostCodeId: 'w1' },
        { ...RECORD, disciplineId: 'd-retired', disciplineName: 'Retired', departmentName: 'Legacy Dept' },
      );

      expect(cmp.departmentText()).toBe('Legacy Dept');
    });

    it('is never sent to the API', async () => {
      const { cmp, store } = await setup({ mode: 'create' });
      cmp.form.patchValue({ projectId: 'p1', projectDetails: 'Unit 100', disciplineId: 'd-civil' });

      await cmp.save(false);

      expect(store.createWbsCostCode.mock.calls[0][0]).not.toHaveProperty('departmentName');
    });
  });

  describe('status', () => {
    it('is not asked for when creating — a new entry is Active', async () => {
      const { fixture, cmp } = await setup({ mode: 'create' });

      expect(fixture.nativeElement.textContent).not.toContain('Inactive');
      expect(fixture.nativeElement.querySelector('mat-slide-toggle')).toBeNull();
      expect(cmp.form.controls.isActive.value).toBe(true);
    });

    it('is still sent as active on create', async () => {
      const { cmp, store } = await setup({ mode: 'create' });
      cmp.form.patchValue({ projectId: 'p1', projectDetails: 'Unit 100' });

      await cmp.save(false);

      expect(store.createWbsCostCode.mock.calls[0][0]).toMatchObject({ isActive: true });
    });

    it('can be changed when editing', async () => {
      const { fixture } = await setup({ mode: 'edit', wbsCostCodeId: 'w1' });
      expect(fixture.nativeElement.querySelector('mat-slide-toggle')).not.toBeNull();
    });
  });

  it('labels the name field WBS / Cost Name', async () => {
    const { fixture } = await setup({ mode: 'create' });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('WBS / Cost Name');
    expect(text).not.toContain('Details of Project');
  });

  it('prefill keeps an active discipline but drops one that is no longer selectable', async () => {
    const { cmp } = await setup({ mode: 'create' });

    cmp.prefill({ projectDetails: 'Unit 100 (Copy)', disciplineId: 'd-mech' });
    expect(cmp.form.controls.disciplineId.value).toBe('d-mech');

    cmp.prefill({ disciplineId: 'd-retired' });
    expect(cmp.form.controls.disciplineId.value).toBe('');
  });
});
