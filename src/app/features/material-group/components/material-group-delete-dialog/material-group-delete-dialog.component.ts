import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaterialGroup } from '../../models/material-group.model';

export interface MaterialGroupDeleteDialogData {
  materialGroup: MaterialGroup;
}

@Component({
  selector: 'app-material-group-delete-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './material-group-delete-dialog.component.html',
  styleUrl: './material-group-delete-dialog.component.scss',
})
export class MaterialGroupDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<MaterialGroupDeleteDialogComponent, boolean>);
  protected readonly data = inject<MaterialGroupDeleteDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
