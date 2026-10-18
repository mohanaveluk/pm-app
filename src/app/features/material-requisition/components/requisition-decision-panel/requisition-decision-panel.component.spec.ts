import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RequisitionDecisionPanelComponent, RequisitionDecisionSubmit } from './requisition-decision-panel.component';
import { REVIEW_DECISION_OPTIONS, RequisitionDecision } from '../../models/material-requisition.model';

function setup(commentsRequired = false) {
  TestBed.configureTestingModule({
    imports: [RequisitionDecisionPanelComponent],
    providers: [provideNoopAnimations()],
  });
  const fixture = TestBed.createComponent(RequisitionDecisionPanelComponent);
  fixture.componentRef.setInput('options', REVIEW_DECISION_OPTIONS);
  fixture.componentRef.setInput('commentsRequired', commentsRequired);
  fixture.detectChanges();

  const emitted: RequisitionDecisionSubmit[] = [];
  fixture.componentInstance.submitted.subscribe((e) => emitted.push(e));
  const el: HTMLElement = fixture.nativeElement;

  const choose = (label: string) => {
    const option = [...el.querySelectorAll<HTMLButtonElement>('.decision-option')]
      .find((b) => b.textContent?.includes(label))!;
    option.click();
    fixture.detectChanges();
  };
  const type = (text: string) => {
    const area = el.querySelector('textarea')!;
    area.value = text;
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = () => {
    const button = [...el.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.includes('Submit'))!;
    button.click();
    fixture.detectChanges();
  };
  return { el, emitted, choose, type, submit };
}

describe('RequisitionDecisionPanelComponent', () => {
  it('submits a review without comments', () => {
    const t = setup();
    t.choose('Reviewed');
    t.submit();
    expect(t.emitted).toEqual([{ decision: RequisitionDecision.REVIEWED, comments: '' }]);
  });

  it('needs comments to return, reject or cancel', () => {
    const t = setup();
    t.choose('Return for Clarification');
    t.submit();
    expect(t.emitted).toEqual([]);
    expect(t.el.textContent).toContain('Please add a comment');

    t.type('  Add the P&ID reference  ');
    t.submit();
    expect(t.emitted).toEqual([{ decision: RequisitionDecision.RETURNED, comments: 'Add the P&ID reference' }]);
  });

  it('needs comments for any decision once the reviewer edited the requisition', () => {
    const t = setup(true);
    t.choose('Reviewed');
    t.submit();
    expect(t.emitted).toEqual([]);
  });

  it('asks for a decision first', () => {
    const t = setup();
    t.submit();
    expect(t.emitted).toEqual([]);
    expect(t.el.textContent).toContain('Choose a decision');
  });
});
