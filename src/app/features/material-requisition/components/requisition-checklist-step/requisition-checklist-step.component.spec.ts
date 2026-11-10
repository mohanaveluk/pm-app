import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { RequisitionChecklistStepComponent } from './requisition-checklist-step.component';
import { RequisitionFormService } from '../../services/requisition-form.service';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { ProjectService } from '../../../project/services/project.service';
import { MaterialCategoryService } from '../../../material-category/services/material-category.service';
import { MaterialGroupService } from '../../../material-group/services/material-group.service';
import { UnitOfMeasurementService } from '../../../unit-of-measurement/services/unit-of-measurement.service';
import {
  COMPLIANCE_CONFIG, checklistIssues, checklistRowErrors, checklistRowFrom, emptyChecklistRow,
} from '../../models/requisition-checklist.model';

function setup(kind: 'compliance' | 'deviation') {
  TestBed.configureTestingModule({
    imports: [RequisitionChecklistStepComponent],
    providers: [
      provideNoopAnimations(),
      RequisitionFormService,
      { provide: MaterialRequisitionService, useValue: { getWbsCostCodes: () => of({ data: [] }) } },
      { provide: ProjectService, useValue: { getActiveProjects: () => of({ data: [] }) } },
      { provide: MaterialCategoryService, useValue: { getActiveMaterialCategories: () => of({ data: [] }) } },
      { provide: MaterialGroupService, useValue: { getActiveMaterialGroups: () => of({ data: [] }) } },
      { provide: UnitOfMeasurementService, useValue: { getActiveUnitsOfMeasurement: () => of({ data: [] }) } },
    ],
  });
  const form = TestBed.inject(RequisitionFormService);
  const fixture = TestBed.createComponent(RequisitionChecklistStepComponent);
  fixture.componentRef.setInput('kind', kind);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const addButton = () => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Add'));
  const type = (row: number, value: string) => {
    const input = el.querySelectorAll('tbody tr')[row].querySelector<HTMLInputElement>('input.chk-input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, form, el, addButton, type };
}

describe('compliance rules', () => {
  it('only the requirement is required — the vendor fills Compliant and Remarks in the RFQ', () => {
    const row = emptyChecklistRow(COMPLIANCE_CONFIG);
    expect(checklistRowErrors(COMPLIANCE_CONFIG, row)).toEqual({ requirement: 'Enter the requirement' });
    row.values['requirement'] = 'ASTM A106';
    expect(checklistIssues(COMPLIANCE_CONFIG, [row])).toEqual([]);
  });

  it('keeps the vendor\'s answers when a saved row is loaded and sent back', () => {
    const row = checklistRowFrom(COMPLIANCE_CONFIG, {
      id: 'c1', sequence: 1, requirement: 'A', vendorResponse: 'Confirmed', compliant: true, remarks: 'ok',
    });
    expect(row.values).toMatchObject({ requirement: 'A', vendorResponse: 'Confirmed', compliant: true, remarks: 'ok' });
    expect(row.values['id']).toBeUndefined();
  });
});

describe('RequisitionChecklistStepComponent — Compliance', () => {
  it('has only the Requirement as an input; Compliant and Remarks are read-only', () => {
    const t = setup('compliance');
    t.addButton()!.click();
    t.fixture.detectChanges();
    const row = t.el.querySelector('tbody tr[data-row]')!;
    expect(row.querySelectorAll('input.chk-input').length).toBe(1);
    expect(row.querySelector('mat-checkbox')).toBeNull();
    expect(row.textContent).toContain('Awaiting vendor');
    expect(t.el.textContent).not.toContain('Vendor Response');
  });

  it('adds a row at the bottom and puts the cursor in it', async () => {
    const t = setup('compliance');
    t.addButton()!.click();
    t.fixture.detectChanges();
    await t.fixture.whenStable();
    const rows = t.el.querySelectorAll('tbody tr[data-row]');
    expect(rows.length).toBe(1);
    expect(document.activeElement).toBe(rows[0].querySelector('input.chk-input'));
  });

  it('only allows another row once the last one has its requirement', () => {
    const t = setup('compliance');
    t.addButton()!.click();
    t.fixture.detectChanges();
    expect(t.addButton()!.disabled).toBe(true);
    t.type(0, 'ASTM A106');
    expect(t.addButton()!.disabled).toBe(false);
  });

  it('outlines a missing requirement once the user tried to move on', () => {
    const t = setup('compliance');
    t.addButton()!.click();
    t.fixture.detectChanges();
    t.form.markChecklistAttempted('compliance');
    t.fixture.detectChanges();
    expect(t.el.querySelectorAll('.chk-input--error').length).toBe(1);
    expect(t.el.textContent).toContain('Enter the requirement');
  });

  it('renumbers Sr# when a row is removed, and sends the requirements in order', () => {
    const t = setup('compliance');
    for (const [i, text] of ['first', 'second', 'third'].entries()) {
      t.addButton()!.click();
      t.fixture.detectChanges();
      t.type(i, text);
    }
    (t.el.querySelectorAll('tbody tr')[0].querySelector('td.chk-actions button') as HTMLButtonElement).click();
    t.fixture.detectChanges();

    expect([...t.el.querySelectorAll('tbody td.chk-sr')].map((c) => c.textContent?.trim())).toEqual(['1', '2']);
    expect(t.form.toRequest(false).compliances).toEqual([
      { requirement: 'second', vendorResponse: null, compliant: false, remarks: null },
      { requirement: 'third', vendorResponse: null, compliant: false, remarks: null },
    ]);
  });
});

describe('RequisitionChecklistStepComponent — Deviation', () => {
  it('is the vendor\'s: no add button, no inputs, and never sent by the requisition', () => {
    const t = setup('deviation');
    expect(t.addButton()).toBeUndefined();
    expect(t.el.querySelectorAll('input').length).toBe(0);
    expect(t.el.textContent).toContain('the vendor enters them in the Request for Quotation');
    expect(t.form.canAddChecklistRow('deviation')).toBe(false);
    expect(Object.keys(t.form.toRequest(false))).not.toContain('deviations');
  });

  it('shows deviations the vendor entered, read-only', () => {
    const t = setup('deviation');
    t.form.load({
      projectId: 'p1', items: [], documents: [], participants: [], compliances: [], permissions: null,
      deviations: [{ id: 'd1', sequence: 1, clauseNo: '4.2.1', rfqRequirement: 'Hydrotest 1.5x', vendorDeviation: true, justification: null }],
    } as never);
    t.fixture.detectChanges();
    expect(t.el.textContent).toContain('4.2.1');
    expect(t.el.textContent).toContain('Yes');
    expect(t.el.querySelectorAll('input, td.chk-actions').length).toBe(0);
  });
});
