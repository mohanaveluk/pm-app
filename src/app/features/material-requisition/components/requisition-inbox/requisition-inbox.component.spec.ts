import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { RequisitionInboxComponent } from './requisition-inbox.component';
import { MaterialRequisitionService } from '../../services/material-requisition.service';
import { AuthService } from '../../../../services';
import { RequisitionParticipantRole } from '../../models/material-requisition.model';

const ME = 'u-me';
const MY_EMAIL = 'me@x.com';
const row = (id: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, mrNumber: id.toUpperCase(), status, projectCode: '0042', projectName: 'Unit 4', clientName: 'Acme',
  itemCount: 2, requiredOnSiteDate: null, submittedAt: null, submittedBy: null, createdBy: 'req@x.com',
  reviewRound: 1, trackingId: null, lockedAt: null,
  reviewers: [{ userId: ME, name: 'Me', email: MY_EMAIL, decision: null }],
  approvers: [{ userId: ME, name: 'Me', email: MY_EMAIL, decision: null }],
  ...extra,
});

function setup(role: RequisitionParticipantRole, rows: unknown[]) {
  const page = { data: { items: rows, total: rows.length } };
  TestBed.configureTestingModule({
    imports: [RequisitionInboxComponent],
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      { provide: MaterialRequisitionService, useValue: { getMyReviews: vi.fn(() => of(page)), getMyApprovals: vi.fn(() => of(page)) } },
      // As in a real session: "id" is the uguid, so only the email identifies the reviewer.
      { provide: AuthService, useValue: { user: () => ({ id: 'some-uguid', email: 'ME@x.com' }) } },
    ],
  });
  const fixture = TestBed.createComponent(RequisitionInboxComponent);
  fixture.componentRef.setInput('role', role);
  fixture.detectChanges();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const editButtons = () => fixture.nativeElement.querySelectorAll('td.inbox-edit-col button') as NodeListOf<HTMLButtonElement>;
  return { fixture, cmp: fixture.componentInstance as any, navigate, editButtons };
}

describe('RequisitionInboxComponent — edit icon', () => {
  it('shows edit first for a reviewer whose review is due, and opens the wizard returning to the review', () => {
    const t = setup(RequisitionParticipantRole.REVIEWER, [row('mr-1', 'UNDER_REVIEW')]);
    expect(t.cmp.columns[0]).toBe('edit');
    expect(t.editButtons().length).toBe(1);

    t.editButtons()[0].click();
    expect(t.navigate).toHaveBeenCalledWith(['/material-requisitions', 'mr-1', 'edit'], { queryParams: { returnTo: 'review' } });
  });

  it('hides it for a reviewer once reviewed (by them or anyone), or when locked', () => {
    const t = setup(RequisitionParticipantRole.REVIEWER, [
      row('mr-1', 'UNDER_REVIEW', { reviewers: [{ userId: ME, name: 'Me', email: MY_EMAIL, decision: 'REVIEWED' }] }),
      row('mr-2', 'REVIEWED'),
      row('mr-3', 'UNDER_REVIEW', { lockedAt: '2026-10-01' }),
    ]);
    expect(t.editButtons().length).toBe(0);
  });

  it('shows edit for an approver while reviewed and their approval is due, and hides it once approved', () => {
    const t = setup(RequisitionParticipantRole.APPROVER, [
      row('mr-1', 'REVIEWED'),
      row('mr-2', 'APPROVED', { approvers: [{ userId: ME, name: 'Me', email: MY_EMAIL, decision: 'APPROVED' }] }),
      row('mr-3', 'UNDER_REVIEW'),
    ]);
    expect(t.editButtons().length).toBe(1);
    t.editButtons()[0].click();
    expect(t.navigate).toHaveBeenCalledWith(['/material-requisitions', 'mr-1', 'edit'], { queryParams: { returnTo: 'approval' } });
  });
});
