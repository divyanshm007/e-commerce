import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-rating',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, MatIconModule],
  template: `
    <div class="rating-wrapper" [class.interactive]="interactive">
      <span
        *ngFor="let star of stars; let i = index"
        class="star"
        [class.filled]="i < (hovered || value)"
        (mouseenter)="interactive && (hovered = i + 1)"
        (mouseleave)="interactive && (hovered = 0)"
        (click)="interactive && rate(i + 1)">
        <mat-icon>{{ i < (hovered || value) ? 'star' : 'star_border' }}</mat-icon>
      </span>
      <span *ngIf="showCount && count" class="count">({{ count }})</span>
    </div>
  `,
  styles: [`
    .rating-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .star {
      color: #bbb;
      line-height: 1;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    .star.filled { color: #ffc107; }

    .interactive .star {
      cursor: pointer;
      transition: transform 0.1s;
      &:hover { transform: scale(1.2); }
    }

    .count {
      font-size: 13px;
      color: var(--text-muted);
      margin-left: 4px;
    }
  `]
})
export class RatingComponent {
  @Input() value = 0;
  @Input() count = 0;
  @Input() showCount = false;
  @Input() interactive = false;
  @Output() rated = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];
  hovered = 0;

  rate(n: number): void {
    this.rated.emit(n);
  }
}
