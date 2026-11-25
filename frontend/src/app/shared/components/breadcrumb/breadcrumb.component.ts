import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface BreadcrumbItem {
  label: string;
  link?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, MatIconModule],
  template: `
    <nav class="breadcrumb-nav" aria-label="breadcrumb">
      <ol class="breadcrumb-list">
        <li *ngFor="let item of items; let last = last" class="breadcrumb-item" [class.active]="last">
          <a *ngIf="item.link && !last" [routerLink]="item.link">{{ item.label }}</a>
          <span *ngIf="!item.link || last">{{ item.label }}</span>
          <mat-icon *ngIf="!last" class="sep">chevron_right</mat-icon>
        </li>
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumb-nav {
      padding: 12px 0;
    }

    .breadcrumb-list {
      list-style: none;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      padding: 0;
      margin: 0;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      font-size: 13px;

      a {
        color: var(--primary);
        &:hover { text-decoration: underline; }
      }

      span { color: var(--text-secondary); }

      &.active span { color: var(--text-primary); font-weight: 500; }
    }

    .sep {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      margin: 0 2px;
    }
  `]
})
export class BreadcrumbComponent {
  @Input({ required: true }) items: BreadcrumbItem[] = [];
}
