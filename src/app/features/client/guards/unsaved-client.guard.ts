import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Components guarded by `unsavedClientGuard` expose this contract so the guard
 * stays agnostic of the workspace's internals.
 */
export interface HasUnsavedClientChanges {
  /** False when the component wants to block navigation. */
  canDeactivate(): boolean | Observable<boolean> | Promise<boolean>;
}

/**
 * Blocks navigation away from the Client workspace while the form holds
 * unsaved edits. The component owns the confirmation prompt so it can reuse the
 * app's ConfirmDialogComponent instead of a native `confirm()`.
 */
export const unsavedClientGuard: CanDeactivateFn<HasUnsavedClientChanges> = (component) =>
  component?.canDeactivate ? component.canDeactivate() : true;
