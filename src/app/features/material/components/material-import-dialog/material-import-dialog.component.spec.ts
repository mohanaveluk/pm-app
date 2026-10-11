import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { MaterialImportDialogComponent } from './material-import-dialog.component';
import { MaterialService } from '../../services/material.service';

const FILE = new File(['x'], 'materials.csv', { type: 'text/csv' });

function previewOf(toCreate: number, toUpdate: number) {
  return {
    data: {
      total: toCreate + toUpdate, toCreate, toUpdate,
      existing: Array.from({ length: toUpdate }, (_, i) => ({ row: i + 2, name: `Item ${i}`, code: `RAW00000${i}` })),
    },
  };
}

async function setup(preview: ReturnType<typeof previewOf>, answer: unknown) {
  const material = {
    previewImport: vi.fn(() => of(preview)),
    importMaterials: vi.fn((_f: File, update: boolean) => of({
      data: {
        total: preview.data.total,
        created: preview.data.toCreate,
        updated: update ? preview.data.toUpdate : 0,
        skipped: update ? 0 : preview.data.toUpdate,
        items: [],
      },
    })),
  };
  const open = vi.fn(() => ({ afterClosed: () => of(answer) }));
  const close = vi.fn();

  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      { provide: MaterialService, useValue: material },
      { provide: MatDialogRef, useValue: { close } },
    ],
  });
  // Component-level provider: MatDialogModule (imported by the component) would otherwise
  // supply its own MatDialog ahead of the TestBed-level one.
  TestBed.overrideComponent(MaterialImportDialogComponent, {
    set: { providers: [{ provide: MatDialog, useValue: { open } }] },
  });

  const fixture = TestBed.createComponent(MaterialImportDialogComponent);
  const cmp: any = fixture.componentInstance;
  cmp.file.set(FILE);
  return { cmp, material, open, close, fixture };
}

describe('MaterialImportDialogComponent — existing materials', () => {
  it('imports straight away, without asking, when every row is new', async () => {
    const { cmp, material, open } = await setup(previewOf(3, 0), true);

    await cmp.startImport();

    expect(open).not.toHaveBeenCalled();
    expect(material.importMaterials).toHaveBeenCalledWith(FILE, true);
    expect(cmp.phase()).toBe('success');
    expect(cmp.result()).toMatchObject({ created: 3, updated: 0, skipped: 0 });
  });

  it('asks first, and updates the existing materials when the user says yes', async () => {
    const { cmp, material, open } = await setup(previewOf(2, 3), true);

    await cmp.startImport();

    expect(open).toHaveBeenCalledTimes(1);
    const data = (open.mock.calls[0] as any)[1].data;
    expect(data.message).toContain('3 of the 5 materials');
    expect(material.importMaterials).toHaveBeenCalledWith(FILE, true);
    expect(cmp.result()).toMatchObject({ created: 2, updated: 3, skipped: 0 });
  });

  it('leaves existing materials alone, but still adds new ones, when the user says no', async () => {
    const { cmp, material } = await setup(previewOf(2, 3), false);

    await cmp.startImport();

    expect(material.importMaterials).toHaveBeenCalledWith(FILE, false);
    expect(cmp.phase()).toBe('success');
    expect(cmp.result()).toMatchObject({ created: 2, updated: 0, skipped: 3 });
  });

  it('writes nothing and returns to file selection when the question is dismissed', async () => {
    const { cmp, material } = await setup(previewOf(2, 3), undefined);

    await cmp.startImport();

    expect(material.importMaterials).not.toHaveBeenCalled();
    expect(cmp.phase()).toBe('select');
  });

  it('closes with "changed" only when something was added or updated', async () => {
    const changed = await setup(previewOf(2, 3), false);
    await changed.cmp.startImport();
    changed.cmp.close();
    expect(changed.close).toHaveBeenCalledWith(true);
    TestBed.resetTestingModule();

    const unchanged = await setup(previewOf(0, 3), false);
    await unchanged.cmp.startImport();
    unchanged.cmp.close();
    expect(unchanged.close).toHaveBeenCalledWith(false);
  });
});
