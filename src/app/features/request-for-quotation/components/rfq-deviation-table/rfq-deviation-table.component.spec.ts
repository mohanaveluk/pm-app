import { TestBed } from '@angular/core/testing';
import { RfqDeviationTableComponent, deviationErrors, deviationIssues } from './rfq-deviation-table.component';

describe('RFQ deviation rules', () => {
  it('requires the clause no. and the RFQ requirement', () => {
    const errors = deviationErrors({ clauseNo: ' ', rfqRequirement: '', vendorDeviation: true, justification: null });
    expect(errors.clauseNo).toBeTruthy();
    expect(errors.rfqRequirement).toBeTruthy();
    expect(errors.justification).toBeUndefined();
  });

  it('requires a justification only when Vendor Deviation is not ticked', () => {
    expect(deviationErrors({ clauseNo: '4.1', rfqRequirement: 'X', vendorDeviation: false, justification: '' }).justification).toBeTruthy();
    expect(deviationErrors({ clauseNo: '4.1', rfqRequirement: 'X', vendorDeviation: true, justification: '' })).toEqual({});
  });

  it('numbers the issues by position', () => {
    const issues = deviationIssues([
      { clauseNo: '1', rfqRequirement: 'A', vendorDeviation: true, justification: null },
      { clauseNo: '', rfqRequirement: 'B', vendorDeviation: true, justification: null },
    ]);
    expect(issues).toEqual(['Deviation item 2: enter the clause no..']);
  });
});

describe('RfqDeviationTableComponent', () => {
  it('adds a row only when the last one is valid, and renumbers on delete', () => {
    TestBed.configureTestingModule({ imports: [RfqDeviationTableComponent] });
    const fixture = TestBed.createComponent(RfqDeviationTableComponent);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { add(): void; remove(i: number): void; rows: () => unknown[] };

    cmp.add();
    expect(cmp.rows().length).toBe(1);
    cmp.add(); // the first row is still empty
    expect(cmp.rows().length).toBe(1);

    fixture.componentInstance.rows.set([
      { clauseNo: '1', rfqRequirement: 'A', vendorDeviation: true, justification: null },
      { clauseNo: '2', rfqRequirement: 'B', vendorDeviation: true, justification: null },
    ]);
    cmp.add();
    expect(cmp.rows().length).toBe(3);
    cmp.remove(0);
    fixture.detectChanges();
    const srs = Array.from(fixture.nativeElement.querySelectorAll('td.rg-sr')).map((td) => (td as HTMLElement).textContent?.trim());
    expect(srs).toEqual(['1', '2']);
  });
});
