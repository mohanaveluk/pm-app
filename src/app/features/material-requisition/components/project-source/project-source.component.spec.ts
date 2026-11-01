import { TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProjectSourceComponent } from './project-source.component';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { RequisitionFormService } from '../../services/requisition-form.service';
import { CandidateListComponent } from '../candidate-list/candidate-list.component';

const OTHER = [
  { id: 'p-2', code: '0002', projectName: 'Plant B', clientName: 'Zenith', status: 'ACTIVE', materialCount: 4, requisitionCount: 2 },
  { id: 'p-3', code: '0003', projectName: 'Jetty', clientName: 'Acme', status: 'COMPLETED', materialCount: 1, requisitionCount: 1 },
];

function setup() {
  const current = signal<{ id: string; code: string; projectName: string } | null>({ id: 'p-1', code: '0001', projectName: 'Tower A' });
  const service = {
    getSourceProjects: vi.fn(() => of({ data: OTHER })),
    getProjectItems: vi.fn(() => of({ data: [{ materialId: 'm1', code: 'PIP-001', description: 'Pipe', referenceQty: 40 }] })),
  };
  TestBed.configureTestingModule({
    imports: [ProjectSourceComponent],
    providers: [
      provideNoopAnimations(),
      { provide: MaterialRequisitionService, useValue: service },
      { provide: RequisitionFormService, useValue: { selectedProject: current } },
    ],
  });
  // The candidate list (and the form state it edits) is not under test here.
  TestBed.overrideComponent(ProjectSourceComponent, {
    remove: { imports: [CandidateListComponent] },
    add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
  });
  const fixture = TestBed.createComponent(ProjectSourceComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any, service, current, el: fixture.nativeElement as HTMLElement };
}

describe('ProjectSourceComponent (Other Projects)', () => {
  it('lists the other projects, leaving out the requisition\'s own project', () => {
    const t = setup();
    expect(t.service.getSourceProjects).toHaveBeenCalledWith('p-1');
    expect(t.cmp.visibleProjects().map((p: any) => p.code)).toEqual(['0002', '0003']);
    expect(t.service.getProjectItems).not.toHaveBeenCalled();
  });

  it('searches the list by code, name or client', () => {
    const t = setup();
    t.cmp.term.set('acme');
    expect(t.cmp.visibleProjects().map((p: any) => p.code)).toEqual(['0003']);
  });

  it('shows the materials of the chosen project, not the current one', () => {
    const t = setup();
    t.cmp.choose('p-2');
    t.fixture.detectChanges();
    expect(t.service.getProjectItems).toHaveBeenCalledWith('p-2');
    expect(t.cmp.candidates().length).toBe(1);
    expect(t.el.textContent).toContain('0002 — Plant B');
  });

  it('reloads the list when the requisition\'s project changes', () => {
    const t = setup();
    t.current.set({ id: 'p-2', code: '0002', projectName: 'Plant B' });
    t.fixture.detectChanges();
    expect(t.service.getSourceProjects).toHaveBeenLastCalledWith('p-2');
  });
});
