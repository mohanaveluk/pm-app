import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Components guarded by `unsavedVendorGuard` expose this contract so the guard
 * stays agnostic of the workspace's internals.
 */
export interface HasUnsavedChanges {
  /** False when the component wants to block navigation. */
  canDeactivate(): boolean | Observable<boolean> | Promise<boolean>;
}

/**
 * Blocks navigation away from the Vendor workspace while the form holds unsaved
 * edits. The component owns the confirmation prompt so it can reuse the app's
 * ConfirmDialogComponent instead of a native `confirm()`.
 */
export const unsavedVendorGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  component?.canDeactivate ? component.canDeactivate() : true;
