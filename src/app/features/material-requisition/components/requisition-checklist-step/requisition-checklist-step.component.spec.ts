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
  COMPLIANCE_CONFIG, DEVIATION_CONFIG, checklistIssues, checklistRowErrors, emptyChecklistRow,
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
  const addButton = () => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Add'))!;
  const type = (row: number, col: number, value: string) => {
    const input = el.querySelectorAll('tbody tr')[row].querySelectorAll<HTMLInputElement>('input.chk-input')[col];
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, form, el, addButton, type };
}

describe('checklist rules', () => {
  it('compliance: requirement and vendor response are required, remarks too when not compliant', () => {
    const row = emptyChecklistRow(COMPLIANCE_CONFIG);
    expect(Object.keys(checklistRowErrors(COMPLIANCE_CONFIG, row)).sort()).toEqual(['remarks', 'requirement', 'vendorResponse']);

    row.values['requirement'] = 'ASTM A106';
    row.values['vendorResponse'] = 'Confirmed';
    row.values['compliant'] = true;
    expect(checklistRowErrors(COMPLIANCE_CONFIG, row)).toEqual({});

    row.values['compliant'] = false;
    expect(checklistRowErrors(COMPLIANCE_CONFIG, row)).toEqual({ remarks: 'Required when Compliant is not ticked' });
  });

  it('deviation: clause no. and RFQ requirement are required, justification too when Vendor Deviation is not ticked', () => {
    const row = emptyChecklistRow(DEVIATION_CONFIG);
    row.values['clauseNo'] = '4.2.1';
    row.values['rfqRequirement'] = 'Hydrotest 1.5x';
    expect(checklistIssues(DEVIATION_CONFIG, [row])).toEqual(['Deviation item 1: required when Vendor Deviation is not ticked.']);
    row.values['vendorDeviation'] = true;
    expect(checklistIssues(DEVIATION_CONFIG, [row])).toEqual([]);
  });
});

describe('RequisitionChecklistStepComponent', () => {
  it('adds a row at the bottom and puts the cursor in it', async () => {
    const t = setup('compliance');
    t.addButton().click();
    t.fixture.detectChanges();
    await t.fixture.whenStable();

    const rows = t.el.querySelectorAll('tbody tr[data-row]');
    expect(rows.length).toBe(1);
    expect(document.activeElement).toBe(rows[0].querySelector('input.chk-input'));
  });

  it('only allows another row once the last one is valid', () => {
    const t = setup('compliance');
    t.addButton().click();
    t.fixture.detectChanges();
    expect(t.addButton().disabled).toBe(true);

    t.type(0, 0, 'ASTM A106');
    t.type(0, 1, 'Confirmed');
    expect(t.addButton().disabled).toBe(true);   // not compliant, no remarks yet
    t.type(0, 2, 'Partial shipment');
    expect(t.addButton().disabled).toBe(false);
  });

  it('outlines the missing fields once the user tried to move on', () => {
    const t = setup('deviation');
    t.addButton().click();
    t.fixture.detectChanges();
    expect(t.el.querySelectorAll('.chk-input--error').length).toBe(0);

    t.form.markChecklistAttempted('deviation');
    t.fixture.detectChanges();
    expect(t.el.querySelectorAll('.chk-input--error').length).toBe(3);
    expect(t.el.textContent).toContain('Enter the clause no.');
    expect(t.el.textContent).toContain('1 deviation item is incomplete');
  });

  it('renumbers Sr# when a row is removed', () => {
    const t = setup('compliance');
    const fill = (i: number, text: string) => { t.type(i, 0, text); t.type(i, 1, 'ok'); t.type(i, 2, 'r'); };
    t.addButton().click(); t.fixture.detectChanges(); fill(0, 'first');
    t.addButton().click(); t.fixture.detectChanges(); fill(1, 'second');
    t.addButton().click(); t.fixture.detectChanges(); fill(2, 'third');

    (t.el.querySelectorAll('tbody tr')[0].querySelector('td.chk-actions button') as HTMLButtonElement).click();
    t.fixture.detectChanges();

    const srs = [...t.el.querySelectorAll('tbody td.chk-sr')].map((c) => c.textContent?.trim());
    expect(srs).toEqual(['1', '2']);
    expect(t.form.toRequest(false).compliances?.map((c) => c.requirement)).toEqual(['second', 'third']);
  });

  it('sends trimmed values, with empty remarks as null', () => {
    const t = setup('compliance');
    t.addButton().click(); t.fixture.detectChanges();
    t.type(0, 0, '  ASTM A106 ');
    t.type(0, 1, ' Confirmed ');
    t.form.setChecklistValue('compliance', t.form.compliances()[0].key, 'compliant', true);

    expect(t.form.toRequest(false).compliances).toEqual([
      { requirement: 'ASTM A106', vendorResponse: 'Confirmed', compliant: true, remarks: null },
    ]);
    expect(t.form.submitIssues().some((i) => i.startsWith('Compliance item'))).toBe(false);
  });
});
