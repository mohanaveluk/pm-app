import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MaterialGroupStore } from './material-group.store';
import { MaterialGroupService } from '../services/material-group.service';
import { MaterialCategoryService } from '../../material-category/services/material-category.service';

const group = (id: string, name: string, categoryId: string, categoryName: string, extra: Record<string, unknown> = {}) => ({
  id, dguid: id, organizationId: 'org-1', code: id.toUpperCase(), name,
  materialCategoryId: categoryId, materialCategoryCode: categoryId.toUpperCase(), materialCategoryName: categoryName,
  displayOrder: 0, isSystem: false, isActive: true, createdAt: '2026-11-01', ...extra,
});

function setup() {
  try { localStorage.removeItem('pm_material_group_view_mode'); } catch { /* ignore */ }
  const rows = [
    group('g1', 'Valves', 'cat-p', 'Piping'),
    group('g2', 'Fittings', 'cat-p', 'Piping', { displayOrder: 1, isActive: false }),
    group('g3', 'Pipes', 'cat-p', 'Piping', { displayOrder: 1 }),
    group('g4', 'Cables', 'cat-e', 'Electrical'),
    group('g5', 'Misc', '', ''),
  ];
  const service = {
    getMaterialGroups: vi.fn(() => of({ data: { items: rows, total: rows.length, totalPages: 1 } })),
  };
  TestBed.configureTestingModule({
    providers: [
      MaterialGroupStore,
      { provide: MaterialGroupService, useValue: service },
      {
        provide: MaterialCategoryService,
        useValue: { getActiveMaterialCategories: () => of({ data: [{ id: 'cat-q', code: 'Q', name: 'Quality', displayOrder: 0 }] }) },
      },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
    ],
  });
  return { store: TestBed.inject(MaterialGroupStore), service };
}

describe('MaterialGroupStore — material-category-wise table', () => {
  it('puts a heading row per category in name order, groups by display order then name, "No Material Category" last', () => {
    const { store } = setup();
    const rows = store.categoryTableRows().map((r) =>
      'groupHeader' in r ? `# ${r.categoryName} (${r.count} · ${r.activeCount} active)` : r.name);

    expect(rows).toEqual([
      '# Electrical (1 · 1 active)', 'Cables',
      '# Piping (3 · 2 active)', 'Valves', 'Fittings', 'Pipes',
      '# No Material Category (1 · 1 active)', 'Misc',
    ]);
    // A category without groups (Quality) is left out.
    expect(rows.some((r) => r.includes('Quality'))).toBe(false);
    expect(store.categoryCount()).toBe(3);
  });

  it('loads every matching group at once in the category-wise view, and pages in the regular view', () => {
    const { store, service } = setup();
    expect(service.getMaterialGroups).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 20 }));

    store.setViewMode('categoryTable');
    expect(service.getMaterialGroups).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 1000, sortBy: 'name' }));

    store.setViewMode('list');
    expect(service.getMaterialGroups).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 20 }));
  });
});
