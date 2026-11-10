import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { DisciplineStore } from './discipline.store';
import { DisciplineService } from '../services/discipline.service';
import { DepartmentService } from '../../department/services/department.service';
import { AuthService } from '../../../services';

const disc = (id: string, name: string, departmentId: string | null, extra: Record<string, unknown> = {}) => ({
  id, dguid: id, organizationId: 'org-1', code: id.toUpperCase(), name, departmentId,
  department: departmentId ? { id: departmentId, name: departmentId === 'd-eng' ? 'Engineering' : 'Construction' } : undefined,
  displayOrder: 0, isActive: true, createdAt: '2026-11-01', ...extra,
});

function setup() {
  try { localStorage.removeItem('pm_discipline_view_mode'); } catch { /* ignore */ }
  const rows = [
    disc('c1', 'Civil', 'd-con'),
    disc('m1', 'Mechanical', 'd-eng'),
    disc('e1', 'Electrical', 'd-eng', { isActive: false }),
    disc('x1', 'Survey', null),
  ];
  const service = { getDisciplines: vi.fn(() => of({ data: { items: rows, total: rows.length } })) };
  TestBed.configureTestingModule({
    providers: [
      DisciplineStore,
      { provide: DisciplineService, useValue: service },
      { provide: AuthService, useValue: { user: () => ({ organizationId: 'org-1' }) } },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
      {
        provide: DepartmentService,
        useValue: {
          getActiveDepartments: () => of({
            data: [
              { id: 'd-eng', name: 'Engineering', code: 'ENG' },
              { id: 'd-con', name: 'Construction', code: 'CON' },
              { id: 'd-qa', name: 'Quality', code: 'QA' },
            ],
          }),
        },
      },
    ],
  });
  return { store: TestBed.inject(DisciplineStore), service };
}

describe('DisciplineStore — department-wise view', () => {
  it('groups every discipline under its department, departments by name, "No department" last', () => {
    const { store } = setup();
    const groups = store.departmentGroups();

    expect(groups.map((g) => g.departmentName)).toEqual(['Construction', 'Engineering', 'Quality', 'No department']);
    const eng = groups.find((g) => g.departmentId === 'd-eng')!;
    expect(eng.disciplines.map((d) => d.name)).toEqual(['Electrical', 'Mechanical']);
    expect(eng.activeCount).toBe(1);
    // With no filters on, a department without disciplines is still listed.
    expect(groups.find((g) => g.departmentId === 'd-qa')!.disciplines).toEqual([]);
  });

  it('loads every matching discipline at once in the department view, and pages in the list view', () => {
    const { store, service } = setup();
    expect(service.getDisciplines).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 10 }));

    store.setViewMode('department');
    expect(service.getDisciplines).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 1000, sortBy: 'name' }));

    store.setViewMode('list');
    expect(service.getDisciplines).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('shows only departments with matches while searching', () => {
    const { store } = setup();
    store.applySearch('mech');
    expect(store.departmentGroups().some((g) => g.departmentId === 'd-qa')).toBe(false);
  });

  it('builds the department-wise table: a heading row per department, then its disciplines', () => {
    const { store, service } = setup();
    store.setViewMode('departmentTable');
    expect(service.getDisciplines).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 1000 }));

    const rows = store.departmentTableRows().map((r) =>
      'groupHeader' in r ? `# ${r.departmentName} (${r.count})` : r.name);
    // Departments without disciplines (Quality) are left out of the table.
    expect(rows).toEqual([
      '# Construction (1)', 'Civil',
      '# Engineering (2)', 'Electrical', 'Mechanical',
      '# No department (1)', 'Survey',
    ]);
  });
});

