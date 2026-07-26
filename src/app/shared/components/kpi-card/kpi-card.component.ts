import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-kpi-card',
  imports: [CommonModule, MatIconModule, MatCardModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
})
export class KpiCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input({ required: true }) icon!: string;
  @Input() color = 'var(--primary)';
  @Input() trend?: string;
}
