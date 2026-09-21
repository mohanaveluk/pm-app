import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { OrganizationDocument, OrganizationService } from '../../../services/organization.service';
import { trigger, style, animate, transition } from '@angular/animations';

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria','Bangladesh',
  'Belgium','Brazil','Canada','Chile','China','Colombia','Croatia','Czech Republic',
  'Denmark','Egypt','Ethiopia','Finland','France','Germany','Ghana','Greece',
  'Hong Kong','Hungary','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Japan','Jordan','Kenya','Malaysia','Mexico','Morocco','Netherlands',
  'New Zealand','Nigeria','Norway','Pakistan','Peru','Philippines','Poland',
  'Portugal','Romania','Russia','Saudi Arabia','Singapore','South Africa',
  'South Korea','Spain','Sri Lanka','Sweden','Switzerland','Taiwan','Thailand',
  'Turkey','UAE','Ukraine','United Kingdom','United States','Vietnam','Other',
];

// Mirrors what pm-api's CloudStorageService accepts.
const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp';
const DOC_EXTENSIONS = DOC_ACCEPT.split(',');
const MAX_DOC_MB = 5;

@Component({
  selector: 'app-organization-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDividerModule, MatSnackBarModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './organization-profile.component.html',
  styleUrl:    './organization-profile.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(18px)' }),
        animate('380ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class OrganizationProfileComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly orgSvc = inject(OrganizationService);
  private readonly snack  = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly loading  = signal(true);
  readonly saving   = signal(false);
  readonly saved    = signal(false);
  readonly loadErr  = signal('');

  readonly countries = COUNTRIES;

  // ── Documents ───────────────────────────────────────────────────
  // Held in the form until Save Changes, which sends the whole list; the API
  // then syncs organization_documents (insert new, update replaced, delete removed).
  readonly documents = signal<OrganizationDocument[]>([]);
  readonly docsLoading = signal(true);
  readonly docsError = signal('');
  readonly uploading = signal(false);
  readonly busyKey = signal<number | null>(null);
  readonly dragging = signal(false);
  readonly docAccept = DOC_ACCEPT;
  readonly maxDocMb = MAX_DOC_MB;
  private pendingReplaceIndex: number | null = null;

  readonly form = this.fb.group({
    organizationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    legalName:        [''],
    email:            ['', [Validators.required, Validators.email]],
    phoneNumber:      ['', [Validators.pattern(/^\+?[\d\s\-()]{7,20}$/)]],
    website:          ['', [Validators.pattern(/^(https?:\/\/)?([\w\-]+\.)+[\w]{2,}(\/.*)?$/)]],
    addressLine1:     [''],
    addressLine2:     [''],
    city:             [''],
    state:            [''],
    country:          [''],
    postalCode:       [''],
    taxNumber:        [''],
  });

  ngOnInit(): void {
    this.loadProfile();
    this.loadDocuments();
  }

  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.loadErr.set('');
    try {
      const org = await this.orgSvc.getProfile().toPromise();
      if (org) {
        this.form.patchValue({
          organizationName: org.organizationName ?? '',
          legalName:        org.legalName        ?? '',
          email:            org.email            ?? '',
          phoneNumber:      org.phoneNumber      ?? '',
          website:          org.website          ?? '',
          addressLine1:     org.addressLine1     ?? '',
          addressLine2:     org.addressLine2     ?? '',
          city:             org.city             ?? '',
          state:            org.state            ?? '',
          country:          org.country          ?? '',
          postalCode:       org.postalCode       ?? '',
          taxNumber:        org.taxNumber        ?? '',
        });
      }
    } catch (e: any) {
      this.loadErr.set(e?.error?.message || 'Failed to load organisation profile.');
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.saved.set(false);
    try {
      await this.orgSvc.updateProfile({ ...(this.form.value as any), documents: this.documents().map((d) => ({
          id: d.id,
          title: d.title,
          documentUrl: d.documentUrl,
          fileName: d.fileName,
          mimeType: d.mimeType ?? undefined,
          fileSizeBytes: d.fileSizeBytes != null ? Number(d.fileSizeBytes) : undefined,
        })),
      }).toPromise();
      this.saved.set(true);
      this.loadDocuments();
      this.snack.open('Organisation profile updated successfully.', 'OK', { duration: 4000 });
      // Reset dirty/pristine so the "unsaved changes" indicator clears
      this.form.markAsPristine();
    } catch (e: any) {
      const msg = e?.error?.message || 'Failed to save changes. Please try again.';
      this.snack.open(msg, 'Dismiss', { duration: 6000, panelClass: ['snack-error'] });
    } finally {
      this.saving.set(false);
    }
  }

  // ── Documents ───────────────────────────────────────────────────

  loadDocuments(): void {
    this.docsLoading.set(true);
    this.docsError.set('');
    this.orgSvc.getDocuments().subscribe({
      next: (docs) => { this.documents.set(docs ?? []); this.docsLoading.set(false); },
      error: () => { this.docsError.set('Unable to load documents.'); this.docsLoading.set(false); },
    });
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    void this.uploadFiles(files);
  }

  onReplacePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const index = this.pendingReplaceIndex;
    this.pendingReplaceIndex = null;
    if (index !== null && file) void this.replaceFile(index, file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    void this.uploadFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  startReplace(index: number, input: HTMLInputElement): void {
    this.pendingReplaceIndex = index;
    input.click();
  }

  private validate(file: File): boolean {
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!DOC_EXTENSIONS.includes(ext)) {
      this.snack.open(`${file.name}: type not allowed. Allowed: ${DOC_ACCEPT}`, 'Close', { duration: 6000 });
      return false;
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      this.snack.open(`${file.name} exceeds the ${MAX_DOC_MB} MB limit.`, 'Close', { duration: 6000 });
      return false;
    }
    return true;
  }

  private touch(): void {
    // Documents travel with the form, so changing them makes it "dirty" and enables Save Changes.
    this.form.markAsDirty();
    this.saved.set(false);
  }

  private async uploadFiles(files: File[]): Promise<void> {
    const valid = files.filter((f) => this.validate(f));
    if (!valid.length) return;
    this.uploading.set(true);
    const added: OrganizationDocument[] = [];
    for (const file of valid) {
      try {
        const up = await firstValueFrom(this.orgSvc.uploadDocument(file));
        added.push({ ...up, title: file.name.replace(/\.[^.]+$/, '') || file.name });
      } catch (e) {
        this.snack.open(`${file.name}: ${this.errorMessage(e, 'Upload failed.')}`, 'Close', { duration: 7000 });
      }
    }
    this.uploading.set(false);
    if (added.length) {
      this.documents.update((list) => [...added, ...list]);
      this.touch();
    }
  }

  private async replaceFile(index: number, file: File): Promise<void> {
    if (!this.validate(file)) return;
    this.busyKey.set(index);
    try {
      const up = await firstValueFrom(this.orgSvc.uploadDocument(file));
      this.documents.update((list) => list.map((d, i) => (i === index ? { ...d, ...up } : d)));
      this.touch();
    } catch (e) {
      this.snack.open(this.errorMessage(e, 'Unable to replace the document.'), 'Close', { duration: 7000 });
    } finally {
      this.busyKey.set(null);
    }
  }

  renameDocument(index: number, title: string): void {
    const next = title.trim();
    const current = this.documents()[index];
    if (!current || !next || next === current.title) return;
    this.documents.update((list) => list.map((d, i) => (i === index ? { ...d, title: next } : d)));
    this.touch();
  }

  async viewDocument(index: number): Promise<void> {
    const doc = this.documents()[index];
    // Opened synchronously so the browser doesn't treat it as a blocked popup.
    const tab = window.open('', '_blank');
    this.busyKey.set(index);
    try {
      const blob = await firstValueFrom(this.orgSvc.getDocumentFile(doc, true));
      const url = URL.createObjectURL(new Blob([blob], { type: doc.mimeType || blob.type }));
      if (tab) tab.location.href = url; else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      this.snack.open(this.errorMessage(e, 'Unable to open the document.'), 'Close', { duration: 6000 });
    } finally {
      this.busyKey.set(null);
    }
  }

  async downloadDocument(index: number): Promise<void> {
    const doc = this.documents()[index];
    this.busyKey.set(index);
    try {
      const blob = await firstValueFrom(this.orgSvc.getDocumentFile(doc, false));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.snack.open(this.errorMessage(e, 'Unable to download the document.'), 'Close', { duration: 6000 });
    } finally {
      this.busyKey.set(null);
    }
  }

  async deleteDocument(index: number): Promise<void> {
    const doc = this.documents()[index];
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Remove document?',
          message: `Remove "${doc.title}"? It is deleted when you save the profile.`,
          confirmText: 'Remove',
          cancelText: 'Keep',
          color: 'warn',
          icon: 'warning',
        },
      }).afterClosed(),
    );
    if (!confirmed) return;
    this.documents.update((list) => list.filter((_, i) => i !== index));
    this.touch();
  }

  docIcon(doc: OrganizationDocument): string {
    const m = doc.mimeType ?? '';
    if (m.startsWith('image/')) return 'image';
    if (m === 'application/pdf') return 'picture_as_pdf';
    if (m.includes('word')) return 'description';
    if (m.includes('excel') || m === 'text/csv') return 'table_chart';
    return 'insert_drive_file';
  }

  sizeLabel(bytes: number | string | null | undefined): string {
    const n = Number(bytes);
    if (!n) return '';
    return n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
  }

  private errorMessage(e: unknown, fallback: string): string {
    const msg = (e as HttpErrorResponse)?.error?.message;
    return (Array.isArray(msg) ? msg.join(' · ') : msg) || fallback;
  }

  onReset(): void {
    this.loadProfile();
    this.loadDocuments();
    this.form.markAsPristine();
  }

  err(field: string): string {
    const c: AbstractControl | null = this.form.get(field);
    if (!c?.touched) return '';
    if (c.hasError('required'))   return 'This field is required';
    if (c.hasError('email'))      return 'Enter a valid email address';
    if (c.hasError('pattern'))    return 'Invalid format';
    if (c.hasError('minlength'))  return `Minimum ${c.errors?.['minlength']?.requiredLength} characters`;
    if (c.hasError('maxlength'))  return `Maximum ${c.errors?.['maxlength']?.requiredLength} characters`;
    return '';
  }
}
