import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbService } from '../../core/navigation/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb',
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
})
export class BreadcrumbComponent {
  private readonly breadcrumbService = inject(BreadcrumbService);
  readonly breadcrumbs = this.breadcrumbService.breadcrumbs;
}
