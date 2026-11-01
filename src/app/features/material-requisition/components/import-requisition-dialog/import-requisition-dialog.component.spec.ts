import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ImportRequisitionDialogComponent } from './import-requisition-dialog.component';
import { MaterialRequisitionService } from '../../services/material-requisition.service';

const row = (id: string, mrNumber: string) => ({
  id, mrNumber, code: mrNumber, status: 'APPROVED', projectCode: '0042', projectName: 'Unit 4',
  clientName: 'Acme', shortDescription: 'CS pipes', itemCount: 3, createdAt: '2026-10-01',
});

function setup() {
  const service = {
    getRequisitions: vi.fn(() => of({ data: { items: [row('mr-1', 'MR-0001'), row('mr-2', 'MR-0002')], total: 2 } })),
  };
  const dialogRef = { close: vi.fn() };
  TestBed.configureTestingModule({
    imports: [ImportRequisitionDialogComponent],
    providers: [
      provideNoopAnimations(),
      { provide: MaterialRequisitionService, useValue: service },
      { provide: MatDialogRef, useValue: dialogRef },
    ],
  });
  const fixture = TestBed.createComponent(ImportRequisitionDialogComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any, service, dialogRef, el: fixture.nativeElement as HTMLElement };
}

describe('ImportRequisitionDialogComponent', () => {
  it('lists previous requisitions once that source is chosen, and imports the picked one', () => {
    const t = setup();
    expect(t.service.getRequisitions).not.toHaveBeenCalled();

    t.cmp.chooseSource('mr');
    t.fixture.detectChanges();
    expect(t.service.getRequisitions).toHaveBeenCalledWith(expect.objectContaining({ page: 1, sortOrder: 'DESC' }));
    expect(t.el.textContent).toContain('MR-0002');

    t.cmp.pick(t.cmp.rows()[1]);
    t.cmp.confirm();
    expect(t.dialogRef.close).toHaveBeenCalledWith({ source: 'mr', id: 'mr-2', label: 'MR-0002' });
  });

  it('searches on the server', async () => {
    vi.useFakeTimers();
    const t = setup();
    t.cmp.chooseSource('mr');
    t.cmp.onSearch({ target: { value: 'pipes' } } as unknown as Event);
    vi.advanceTimersByTime(350);
    expect(t.service.getRequisitions).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'pipes', page: 1 }));
    vi.useRealTimers();
  });

  it('explains that purchase orders are not available yet, and cannot import from them', () => {
    const t = setup();
    t.cmp.chooseSource('po');
    t.fixture.detectChanges();
    expect(t.el.textContent).toContain("Purchase orders aren't available yet");
    t.cmp.confirm();
    expect(t.dialogRef.close).not.toHaveBeenCalled();
  });
});
