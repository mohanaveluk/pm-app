import { TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RequisitionDecisionPageComponent } from './requisition-decision-page.component';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { AuthService } from '../../../../services';
import { RequisitionParticipantRole } from '../../models/material-requisition.model';

const approver = (extra: Record<string, unknown> = {}) => ({
  id: 'p-a1', role: 'APPROVER', userId: 'u-a1', userName: 'Approver One', userEmail: 'a1@x.com', sequence: 1,
  decision: null, decisionComments: null, decidedAt: null, editedInRound: false, ...extra,
});
const requisition = (extra: Record<string, unknown> = {}, me = approver()) => ({
  id: 'mr-1', mrNumber: '0007', projectCode: 'PRJ-01', projectName: 'Tower A', status: 'REVIEWED',
  lockedAt: null, trackingId: 'TRK-1', history: [], participants: [me],
  permissions: { canEdit: true, canSubmit: false, canReview: false, canApprove: true, canEditReviewers: false, canEditApprovers: false, myRoles: ['APPROVER'] },
  ...extra,
});

function setup(mr: any) {
  const router = { navigate: vi.fn() };
  TestBed.configureTestingModule({
    imports: [RequisitionDecisionPageComponent],
    providers: [
      provideNoopAnimations(),
      { provide: MaterialRequisitionService, useValue: { getRequisitionById: vi.fn(() => of({ data: mr })) } },
      { provide: AuthService, useValue: { user: signal({ email: 'a1@x.com' }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'mr-1']]) } } },
      { provide: Router, useValue: router },
    ],
  });
  // The details / participants / history panels are not under test here.
  TestBed.overrideComponent(RequisitionDecisionPageComponent, {
    set: {
      imports: [CommonModule, MatButtonModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    },
  });
  const fixture = TestBed.createComponent(RequisitionDecisionPageComponent);
  fixture.componentRef.setInput('role', RequisitionParticipantRole.APPROVER);
  fixture.detectChanges();
  return { fixture, router, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance as any };
}

const editButton = (el: HTMLElement) =>
  [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Edit Requisition'));

describe('RequisitionDecisionPageComponent (approver)', () => {
  it('lets a pending approver edit, and comes back to the approval screen after saving', async () => {
    const t = setup(requisition());
    await t.fixture.whenStable();
    t.fixture.detectChanges();

    const button = editButton(t.el);
    expect(button).toBeTruthy();
    button!.click();
    expect(t.router.navigate).toHaveBeenCalledWith(
      ['/material-requisitions', 'mr-1', 'edit'], { queryParams: { returnTo: 'approval' } },
    );
  });

  it('asks the approver who edited it to describe the changes', async () => {
    const t = setup(requisition({}, approver({ editedInRound: true })));
    await t.fixture.whenStable();
    expect(t.cmp.editedByMe()).toBe(true);
  });

  it('offers no editing once the approver has decided or the requisition is approved', async () => {
    const decided = setup(requisition(
      { permissions: { ...requisition().permissions, canApprove: false, canEdit: false } },
      approver({ decision: 'APPROVED' }),
    ));
    await decided.fixture.whenStable();
    decided.fixture.detectChanges();
    expect(editButton(decided.el)).toBeUndefined();

    TestBed.resetTestingModule();
    const approved = setup(requisition({
      status: 'APPROVED',
      permissions: { ...requisition().permissions, canApprove: false, canEdit: false },
    }));
    await approved.fixture.whenStable();
    approved.fixture.detectChanges();
    expect(editButton(approved.el)).toBeUndefined();
    expect(approved.el.textContent).toContain('approved and locked');
  });
});
