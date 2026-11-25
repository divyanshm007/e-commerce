import { Component, Input } from '@angular/core';
import { mediaUrl } from '../../../core/utils/media';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [NgIf, MatIconModule],
  template: `
<div class="ph-wrap" [style.background-image]="'url(' + resolvedImage + ')'">
  <div class="ph-overlay"></div>
  <div class="ph-inner">
    <div class="ph-icon-wrap" *ngIf="icon">
      <mat-icon class="ph-icon">{{ icon }}</mat-icon>
    </div>
    <p class="ph-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</p>
    <h1 class="ph-title">{{ title }}</h1>
    <p class="ph-sub" *ngIf="subtitle">{{ subtitle }}</p>
  </div>
</div>
  `,
  styles: [`
:host { display: block; }
.ph-wrap {
  position: relative; min-height: 300px;
  background-size: cover; background-position: center; background-color: #062918;
  display: flex; align-items: center;
}
.ph-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to right, rgba(5,42,22,0.92) 0%, rgba(5,42,22,0.72) 55%, rgba(5,42,22,0.42) 100%);
}
.ph-inner {
  position: relative; z-index: 2;
  max-width: 1280px; width: 100%; margin: 0 auto;
  padding: 72px 32px; display: flex; flex-direction: column; gap: 10px;
}
.ph-icon-wrap {
  width: 68px; height: 68px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,255,255,0.12); backdrop-filter: blur(8px);
  border: 1.5px solid rgba(255,255,255,0.28);
  display: flex; align-items: center; justify-content: center; margin-bottom: 4px;
}
.ph-icon { font-size: 34px !important; width: 34px !important; height: 34px !important; color: #fff; }
.ph-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase;
  color: rgba(181,220,170,0.85); margin: 0;
}
.ph-title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 44px; font-weight: 600; color: #fff;
  margin: 0; line-height: 1.08; letter-spacing: -.01em;
}
.ph-sub {
  font-size: 16px; color: rgba(255,255,255,0.75);
  margin: 0; max-width: 540px; line-height: 1.6;
}
@media (max-width: 640px) {
  .ph-inner { padding: 56px 20px; }
  .ph-title { font-size: 32px; }
}
  `]
})
export class PageHeroComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() eyebrow = 'Siddham Pharmacy';
  @Input() image = '/uploads/heroes/hero-ayurveda.jpg';
  get resolvedImage(): string { return mediaUrl(this.image); }
}
