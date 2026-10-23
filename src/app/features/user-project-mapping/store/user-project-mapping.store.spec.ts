import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { UserProjectMappingStore } from './user-project-mapping.store';
import { UserProjectMappingService } from '../services/user-project-mapping.service';
import { ProjectService } from '../../project/services/project.service';
import { ClientService } from '../../client/services/client.service';

function setup() {
  const service = {
    getMappings: vi.fn(() => of({ data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 } })),
    getEligibleUsers: vi.fn(() => of({ data: [] })),
    getMapping: vi.fn(),
    createMapping: vi.fn(() => of({ data: {} })),
    updateMapping: vi.fn(),
    setStatus: vi.fn(),
    deleteMapping: vi.fn(),
  };
  const snack = { open: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      UserProjectMappingStore,
      { provide: UserProjectMappingService, useValue: service },
      { provide: ProjectService, useValue: { getActiveProjects: () => of({ data: [] }) } },
      { provide: ClientService, useValue: { getActiveClients: () => of({ data: [] }) } },
      { provide: MatSnackBar, useValue: snack },
    ],
  });
  return { store: TestBed.inject(UserProjectMappingStore), service, snack };
}

describe('UserProjectMappingStore', () => {
  it('asks the server for one page of projects, with only the filters that are set', () => {
    const t = setup();
    expect(t.service.getMappings).toHaveBeenLastCalledWith({
      page: 1, limit: 10, sortBy: 'projectCode', sortOrder: 'ASC',
      search: undefined, projectId: undefined, clientId: undefined, userId: undefined, status: undefined,
    });

    t.store.setPage(2, 20);
    t.store.setFilter({ userId: 'u1', status: 'INACTIVE' });
    expect(t.store.page()).toBe(0);
    expect(t.service.getMappings).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1, limit: 20, userId: 'u1', status: 'INACTIVE',
    }));
    expect(t.store.hasActiveFilters()).toBe(true);

    t.store.setSort('updatedAt', 'desc');
    expect(t.service.getMappings).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'updatedAt', sortOrder: 'DESC' }));
  });

  it('treats a project without a mapping as "none yet", not as an error', async () => {
    const t = setup();
    t.service.getMapping.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(await t.store.findExisting('p1')).toBeNull();
    expect(t.snack.open).not.toHaveBeenCalled();
  });

  it("shows the server's reason when a save is refused", async () => {
    const t = setup();
    t.service.createMapping.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'Only internal users can be assigned projects: Vendor Rep' },
    })));
    await expect(t.store.create('p1', ['u1'])).rejects.toThrow('Only internal users');
    expect(t.snack.open).toHaveBeenCalledWith(
      'Only internal users can be assigned projects: Vendor Rep', 'Close', expect.anything(),
    );
    expect(t.store.saving()).toBe(false);
  });
});
