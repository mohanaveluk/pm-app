import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { UserProjectMappingDrawerComponent, UserProjectMappingDrawerData } from './user-project-mapping-drawer.component';
import { UserProjectMappingStore } from '../../store/user-project-mapping.store';
import { EligibleUser, UserProjectMapping } from '../../models/user-project-mapping.model';

const users: EligibleUser[] = [
  { id: 'u1', name: 'Arjun Rao', email: 'arjun@x.com', position: 'Engineer', role: 'User' },
  { id: 'u2', name: 'Maya Iyer', email: 'maya@x.com', position: 'Planner', role: 'User' },
  { id: 'u3', name: 'John Smith', email: 'john@x.com', position: null, role: 'Manager' },
];
const projects = [
  { id: 'p1', code: '0001', projectName: 'Tower A', clientId: 'c1', clientCode: 'CL-1', clientName: 'Acme', status: 'ACTIVE', currencyCode: null },
  { id: 'p2', code: '0002', projectName: 'Plant B', clientId: 'c2', clientCode: 'CL-2', clientName: 'Zenith', status: 'ACTIVE', currencyCode: null },
];
const mapping = (extra: Partial<UserProjectMapping> = {}): UserProjectMapping => ({
  projectId: 'p1', projectCode: '0001', projectName: 'Tower A', projectStatus: 'ACTIVE', clientId: 'c1',
  clientCode: 'CL-1', clientName: 'Acme', status: 'ACTIVE', userCount: 1, activeUserCount: 1, trackingId: null,
  users: [{ mappingId: 'm1', userId: 'u1', name: 'Arjun Rao', email: 'arjun@x.com', position: null, status: 'ACTIVE', userActive: true, assignedBy: null, assignedAt: null }],
  createdBy: null, createdAt: '2026-10-01', updatedBy: null, updatedAt: '2026-10-01', ...extra,
});

function setup(data: UserProjectMappingDrawerData = {}, confirmAnswer: boolean | undefined = true) {
  const store = {
    projects: signal(projects),
    users: signal(users),
    usersLoading: signal(false),
    usersError: signal<string | null>(null),
    saving: signal(false),
    loadUsers: vi.fn(),
    findExisting: vi.fn(async () => null as any),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
  };
  const dialogRef = { close: vi.fn(), backdropClick: () => new Subject(), keydownEvents: () => new Subject() };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(confirmAnswer) })) };
  TestBed.configureTestingModule({
    imports: [UserProjectMappingDrawerComponent],
    providers: [
      provideNoopAnimations(),
      { provide: UserProjectMappingStore, useValue: store },
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MatDialog, useValue: dialog },
      { provide: MAT_DIALOG_DATA, useValue: data },
    ],
  });
  // MatDialogModule in the component's imports provides its own MatDialog.
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  const fixture = TestBed.createComponent(UserProjectMappingDrawerComponent);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  return { fixture, cmp, store, dialogRef, dialog, el: fixture.nativeElement as HTMLElement };
}

describe('UserProjectMappingDrawerComponent', () => {
  it('keeps selected users when the search hides them', () => {
    const t = setup();
    t.cmp.toggleUser(users[0]);
    t.cmp.userSearch.set('maya');
    expect(t.cmp.visibleUsers().map((u: EligibleUser) => u.id)).toEqual(['u2']);
    expect([...t.cmp.selected()]).toEqual(['u1']);
  });

  it('"select all" adds only the users the search shows, and clears only those', () => {
    const t = setup();
    t.cmp.toggleUser(users[2]);
    t.cmp.userSearch.set('a');                     // Arjun, Maya
    t.cmp.toggleAllVisible();
    expect([...t.cmp.selected()].sort()).toEqual(['u1', 'u2', 'u3']);
    t.cmp.userSearch.set('maya');
    t.cmp.toggleAllVisible();                      // all shown are selected → clear them
    expect([...t.cmp.selected()].sort()).toEqual(['u1', 'u3']);
  });

  it('shows the client of the chosen project, read only', async () => {
    const t = setup();
    await t.cmp.onProjectChange('p2');
    t.fixture.detectChanges();
    expect(t.el.textContent).toContain('Zenith');
    expect(t.el.textContent).toContain('CL-2');
  });

  it('asks before carrying selected users over to another project, and clears them when told to', async () => {
    const t = setup({}, false);
    await t.cmp.onProjectChange('p1');
    t.cmp.toggleUser(users[0]);
    await t.cmp.onProjectChange('p2');
    expect(t.dialog.open).toHaveBeenCalled();
    expect(t.cmp.selected().size).toBe(0);
  });

  it('will not save without a project and at least one user', async () => {
    const t = setup();
    await t.cmp.save();
    t.fixture.detectChanges();
    expect(t.store.create).not.toHaveBeenCalled();
    expect(t.el.textContent).toContain('Select a project');
    expect(t.el.textContent).toContain('Select at least one user');
  });

  it('assigns a new project to the selected users', async () => {
    const t = setup();
    await t.cmp.onProjectChange('p2');
    t.cmp.toggleUser(users[1]);
    t.cmp.toggleUser(users[2]);
    await t.cmp.save();
    expect(t.store.create).toHaveBeenCalledWith('p2', ['u2', 'u3']);
    expect(t.dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('offers to edit the mapping a chosen project already has, keeping both selections', async () => {
    const t = setup();
    t.store.findExisting.mockResolvedValueOnce({ ...mapping(), history: [] });
    t.cmp.toggleUser(users[2]);
    await t.cmp.onProjectChange('p1');
    t.fixture.detectChanges();
    expect(t.el.textContent).toContain('already has 1 user mapped');

    await t.cmp.save();
    expect(t.store.create).not.toHaveBeenCalled();

    t.cmp.editExisting();
    await t.cmp.save();
    expect(t.store.update).toHaveBeenCalledWith('p1', expect.arrayContaining(['u1', 'u3']));
  });

  it('edits from the mapped users, and keeps a mapped user whose account was deactivated', async () => {
    const stale = mapping({
      users: [
        ...mapping().users,
        { mappingId: 'm9', userId: 'u9', name: 'Old User', email: 'old@x.com', position: null, status: 'ACTIVE', userActive: false, assignedBy: null, assignedAt: null },
      ],
    });
    const t = setup({ mapping: stale });
    expect(t.cmp.isEdit()).toBe(true);
    t.fixture.detectChanges();
    expect(t.el.textContent).toContain('Account inactive');

    t.cmp.removeUser('u1');
    t.cmp.toggleUser(users[1]);
    await t.cmp.save();
    expect(t.store.update).toHaveBeenCalledWith('p1', ['u9', 'u2']);
  });

  it('confirms before discarding changes', async () => {
    const t = setup({}, false);
    t.cmp.toggleUser(users[0]);
    await t.cmp.cancel();
    expect(t.dialog.open).toHaveBeenCalled();
    expect(t.dialogRef.close).not.toHaveBeenCalled();
  });
});
