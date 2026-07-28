import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ServiceGroupStore } from '../../store/service-group.store';
import { PermissionMatrix } from '../../models/service-group.model';

export interface ServiceGroupPermissionMatrixData {
  serviceGroupId: string;
  serviceGroupName: string;
}

@Component({
  selector: 'app-service-group-permission-matrix',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTableModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './service-group-permission-matrix.component.html',
  styleUrl: './service-group-permission-matrix.component.scss',
})
export class ServiceGroupPermissionMatrixComponent implements OnInit {
  protected readonly store = inject(ServiceGroupStore);
  protected readonly data = inject<ServiceGroupPermissionMatrixData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly matrix = signal<PermissionMatrix | null>(null);

  protected readonly displayedColumns = signal<string[]>(['activity']);

  ngOnInit(): void {
    this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const matrix = await this.store.getPermissionMatrix(this.data.serviceGroupId);
      this.matrix.set(matrix);
      this.displayedColumns.set(['activity', ...matrix.columns]);
    } catch {
      this.loadError.set('Unable to load the permission matrix. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    this.load();
  }
}
