import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  EVALUATION_STAGE_OPTIONS, EvaluationDecision, EvaluationStage, RISK_CATEGORY_OPTIONS,
  RiskCategory, VENDOR_CLASSIFICATION_OPTIONS, VendorClassification,
} from '../../../vendor/models/vendor.model';

export interface EvaluationDecisionDialogData {
  decision: EvaluationDecision.APPROVED | EvaluationDecision.REJECTED | EvaluationDecision.RETURNED;
  vendorName: string;
  vendorCode: string;
  /** The stage the evaluator had selected in the workspace when they clicked the action. */
  defaultStage: EvaluationStage;
  defaultScore: number | null;
}

export interface EvaluationDecisionDialogResult {
  stage: EvaluationStage;
  score?: number;
  riskCategory?: RiskCategory;
  vendorClassification?: VendorClassification;
  comments?: string;
}

/**
 * One dialog, three decisions. Approve/Reject/Return share the same shape —
 * a stage, an optional score, and a reason — so this is the single place
 * that collects one, rather than three near-duplicate dialogs.
 */
@Component({
  selector: 'app-evaluation-decision-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
  ],
  templateUrl: './evaluation-decision-dialog.component.html',
  styleUrl: './evaluation-decision-dialog.component.scss',
})
export class EvaluationDecisionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<EvaluationDecisionDialogComponent, EvaluationDecisionDialogResult>);
  protected readonly data = inject<EvaluationDecisionDialogData>(MAT_DIALOG_DATA);

  protected readonly EvaluationDecision = EvaluationDecision;
  protected readonly stageOptions = EVALUATION_STAGE_OPTIONS;
  protected readonly riskOptions = RISK_CATEGORY_OPTIONS;
  protected readonly classificationOptions = VENDOR_CLASSIFICATION_OPTIONS;

  /** Approve/Reject settle the qualification outright, so they default to Final. */
  protected readonly isApprove = this.data.decision === EvaluationDecision.APPROVED;
  private readonly reasonRequired = this.data.decision !== EvaluationDecision.APPROVED;

  protected readonly form = this.fb.nonNullable.group({
    stage: [
      this.isApprove ? EvaluationStage.FINAL : this.data.defaultStage,
      [Validators.required],
    ],
    score: [this.data.defaultScore as number | null],
    riskCategory: [null as RiskCategory | null],
    vendorClassification: [null as VendorClassification | null],
    comments: [
      '',
      this.reasonRequired ? [Validators.required, Validators.minLength(5)] : [],
    ],
  });

  protected get title(): string {
    switch (this.data.decision) {
      case EvaluationDecision.APPROVED: return 'Approve Vendor';
      case EvaluationDecision.REJECTED: return 'Reject Vendor';
      default:                          return 'Return for Clarification';
    }
  }

  protected get commentsLabel(): string {
    return this.data.decision === EvaluationDecision.APPROVED ? 'Approval Remarks' : 'Reason';
  }

  protected get confirmLabel(): string {
    switch (this.data.decision) {
      case EvaluationDecision.APPROVED: return 'Approve Vendor';
      case EvaluationDecision.REJECTED: return 'Reject Vendor';
      default:                          return 'Send for Clarification';
    }
  }

  protected err(field: 'comments'): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return '';
    if (control.errors['required']) return 'A reason is required for this decision.';
    if (control.errors['minlength']) return `At least ${control.errors['minlength'].requiredLength} characters.`;
    return '';
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      stage: v.stage,
      score: v.score ?? undefined,
      riskCategory: v.riskCategory ?? undefined,
      vendorClassification: v.vendorClassification ?? undefined,
      comments: v.comments.trim() || undefined,
    });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
