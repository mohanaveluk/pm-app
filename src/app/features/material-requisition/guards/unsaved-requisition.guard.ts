import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Components guarded by `unsavedRequisitionGuard` expose this contract so the
 * guard stays agnostic of the wizard's internals.
 */
export interface HasUnsavedRequisitionChanges {
  /** False when the component wants to block navigation. */
  canDeactivate(): boolean | Observable<boolean> | Promise<boolean>;
}

/**
 * Blocks navigation away from the requisition wizard while it holds work that
 * has not been saved. The component owns the confirmation prompt.
 */
export const unsavedRequisitionGuard: CanDeactivateFn<HasUnsavedRequisitionChanges> = (component) =>
  component?.canDeactivate ? component.canDeactivate() : true;
