import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProjectType } from '../../models/project-type.model';

export interface ProjectTypeDeleteDialogData {
  projectType: ProjectType;
}

@Component({
  selector: 'app-project-type-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './project-type-delete-dialog.component.html',
  styleUrl: './project-type-delete-dialog.component.scss',
})
export class ProjectTypeDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProjectTypeDeleteDialogComponent, boolean>);
  protected readonly data = inject<ProjectTypeDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
