import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProjectType } from '../../models/project-type.model';

export interface ProjectTypeViewDialogData {
  projectType: ProjectType;
}

/** Read-only inspection dialog — no editing happens here (see item 12 of the spec). */
@Component({
  selector: 'app-project-type-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './project-type-view-dialog.component.html',
  styleUrl: './project-type-view-dialog.component.scss',
})
export class ProjectTypeViewDialogComponent {
  protected readonly data = inject<ProjectTypeViewDialogData>(MAT_DIALOG_DATA);
  protected readonly projectType = this.data.projectType;
}
