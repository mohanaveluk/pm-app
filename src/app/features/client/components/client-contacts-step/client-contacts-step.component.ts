import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COUNTRIES } from '../../../../shared/reference/countries';
import { CONTACT_ROLE_OPTIONS, PREFERRED_CONTACT_METHOD_OPTIONS } from '../../models/client.model';
import { ClientFormService } from '../../services/client-form.service';

/**
 * Step 3 — any number of contacts, each with the responsibilities they hold.
 * One active contact at most is the primary one; choosing a new primary clears
 * the flag on the others.
 */
@Component({
  selector: 'app-client-contacts-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatSlideToggleModule, MatTooltipModule,
  ],
  templateUrl: './client-contacts-step.component.html',
  styleUrl: '../client-step.shared.scss',
})
export class ClientContactsStepComponent {
  protected readonly formService = inject(ClientFormService);

  protected readonly countries = COUNTRIES;
  protected readonly roleOptions = CONTACT_ROLE_OPTIONS;
  protected readonly methodOptions = PREFERRED_CONTACT_METHOD_OPTIONS;

  protected get contacts(): FormGroup[] {
    return this.formService.contacts.controls;
  }

  protected addContact(): void {
    this.formService.addContact();
  }

  protected removeContact(index: number): void {
    this.formService.removeContact(index);
  }

  /** Ticking "Primary" on one contact unticks it on the others. */
  protected onPrimaryChange(index: number, checked: boolean): void {
    if (checked) this.formService.setPrimaryContact(index);
  }

  protected title(group: FormGroup, index: number): string {
    const name = (group.get('contactName')?.value as string)?.trim();
    return name || `Contact ${index + 1}`;
  }

  protected err(group: FormGroup, controlName: string): string {
    const control = group.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) return 'Contact name is required';
    if (control.errors['email']) return 'Enter a valid email address';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) return 'Enter digits, spaces, - ( ) or . only';
    return '';
  }

  protected codeError(group: FormGroup, which: 'phone' | 'mobile'): boolean {
    const touched = group.get(`${which}Number`)?.touched || group.get(`${which}Code`)?.touched;
    return !!touched && !!group.errors?.[`${which}CodeRequired`];
  }
}
