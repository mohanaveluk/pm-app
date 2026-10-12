import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClientType } from '../../models/client-type.model';

export interface ClientTypeViewDialogData {
  clientType: ClientType;
}

/** Read-only inspection dialog — no editing happens here (see item 12 of the spec). */
@Component({
  selector: 'app-client-type-view-dialog',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './client-type-view-dialog.component.html',
  styleUrl: './client-type-view-dialog.component.scss',
})
export class ClientTypeViewDialogComponent {
  protected readonly data = inject<ClientTypeViewDialogData>(MAT_DIALOG_DATA);
  protected readonly clientType = this.data.clientType;
}
