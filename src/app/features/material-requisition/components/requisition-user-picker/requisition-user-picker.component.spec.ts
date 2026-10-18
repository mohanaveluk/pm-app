import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RequisitionUserPickerComponent } from './requisition-user-picker.component';

const USERS = [
  { id: 'a', name: 'Asha Nair', email: 'a@x.com', position: null, role: null },
  { id: 'b', name: 'Bilal Khan', email: 'b@x.com', position: null, role: null },
  { id: 'c', name: 'Chen Wei', email: 'c@x.com', position: null, role: null },
];

function setup(selected: string[], locked = false) {
  TestBed.configureTestingModule({
    imports: [RequisitionUserPickerComponent],
    providers: [provideNoopAnimations()],
  });
  const fixture = TestBed.createComponent(RequisitionUserPickerComponent);
  fixture.componentRef.setInput('label', 'Reviewers');
  fixture.componentRef.setInput('options', USERS);
  fixture.componentRef.setInput('selectedIds', selected);
  fixture.componentRef.setInput('locked', locked);
  fixture.componentRef.setInput('stepPrefix', 'R');
  fixture.detectChanges();
  const emitted: string[][] = [];
  fixture.componentInstance.selectedIds.subscribe((v) => emitted.push(v));
  return { fixture, cmp: fixture.componentInstance as any, el: fixture.nativeElement as HTMLElement, emitted };
}

describe('RequisitionUserPickerComponent', () => {
  it('keeps the order people were picked in', () => {
    const t = setup(['c']);
    // mat-select reports option order (a, c); the pick order is c then a.
    t.cmp.onSelectionChange(['a', 'c']);
    expect(t.emitted.at(-1)).toEqual(['c', 'a']);
  });

  it('shows numbered chips and removes one', () => {
    const t = setup(['b', 'a']);
    expect(t.el.textContent).toContain('R1');
    expect(t.el.textContent).toContain('Bilal Khan');

    t.el.querySelector<HTMLButtonElement>('.participant-chip__remove')!.click();
    expect(t.emitted.at(-1)).toEqual(['a']);
  });

  it('cannot be changed when locked', () => {
    const t = setup(['a'], true);
    expect(t.el.querySelector('.participant-chip__remove')).toBeNull();
    t.cmp.remove('a');
    expect(t.emitted).toEqual([]);
  });
});
