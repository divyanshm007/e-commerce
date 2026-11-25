import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ContentService } from '../../../core/services/content.service';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [NgFor, NgIf, MediaUrlPipe, PageHeroComponent],
  template: `
    <app-page-hero
      title="Testimonials"
      subtitle="Real stories from our customers on their journey to natural wellness."
      icon="rate_review"
      image="/uploads/heroes/hero-testimonials.jpg">
    </app-page-hero>

    <div class="container testimonials-section">

      <!-- Skeleton -->
      <div class="testimonials-grid" *ngIf="loading()">
        <div class="testimonial-card tst-skeleton" *ngFor="let i of skeletons">
          <div class="sk-line sk-w90"></div>
          <div class="sk-line sk-w80"></div>
          <div class="sk-line sk-w60"></div>
          <div class="sk-author">
            <div class="sk-avatar"></div>
            <div style="flex:1"><div class="sk-line sk-w50"></div><div class="sk-line sk-w40"></div></div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div class="tst-empty" *ngIf="!loading() && testimonials().length === 0">
        <p>No testimonials yet.</p>
      </div>

      <!-- Cards -->
      <div class="testimonials-grid" *ngIf="!loading() && testimonials().length > 0">
        <div class="testimonial-card" *ngFor="let t of testimonials()">
          <div class="quote-icon">"</div>
          <p class="testimonial-text">{{ t.message }}</p>
          <div class="testimonial-author">
            <div class="author-avatar-wrap">
              <img *ngIf="t.avatarUrl" [src]="t.avatarUrl | mediaUrl" [alt]="t.customerName" class="author-img" />
              <div *ngIf="!t.avatarUrl" class="author-initials">{{ initials(t.customerName) }}</div>
            </div>
            <div>
              <div class="author-name">{{ t.customerName }}</div>
              <div class="author-role" *ngIf="t.customerTitle">{{ t.customerTitle }}</div>
            </div>
          </div>
          <div class="stars">
            <span *ngFor="let s of starArray(t.rating)" class="star star-filled">★</span>
            <span *ngFor="let s of emptyStarArray(t.rating)" class="star star-empty">★</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, var(--primary) 0%, #3949ab 100%);
      color: #fff; padding: 64px 0; text-align: center; margin-bottom: 48px;
      h1 { font-size: 2.5rem; font-weight: 800; margin: 0 0 12px; }
      p  { font-size: 1.1rem; opacity: 0.85; margin: 0; }
    }

    .testimonials-section { margin-bottom: 64px; }

    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .testimonial-card {
      background: #fff; border-radius: 16px; padding: 32px 28px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.07); border: 1px solid #e2e8f0; position: relative;
      transition: transform 0.2s, box-shadow 0.2s;
      &:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,0,0,0.12); }
    }

    .quote-icon {
      font-size: 5rem; line-height: 1; color: var(--primary); opacity: 0.12;
      font-family: Georgia, serif; position: absolute; top: 12px; left: 20px;
    }

    .testimonial-text {
      font-size: 0.95rem; line-height: 1.7; color: #374151;
      margin: 0 0 24px; position: relative; z-index: 1;
    }

    .testimonial-author { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }

    .author-avatar-wrap { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
    .author-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .author-initials {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--accent,#3949ab));
      color: #fff; font-weight: 700; font-size: 0.9rem;
      display: flex; align-items: center; justify-content: center;
    }

    .author-name { font-weight: 700; font-size: 0.95rem; color: #052e16; }
    .author-role { font-size: 0.8rem; color: #64748b; }

    .stars { letter-spacing: 2px; font-size: 1.05rem; }
    .star-filled { color: #f59e0b; }
    .star-empty  { color: #e2e8f0; }

    /* Skeleton */
    .tst-skeleton { cursor: default; }
    .sk-line { height: 13px; border-radius: 6px; margin-bottom: 10px; background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
    .sk-w90{width:90%}.sk-w80{width:80%}.sk-w60{width:60%}.sk-w50{width:50%}.sk-w40{width:40%}
    .sk-author { display:flex; align-items:center; gap:10px; margin-top:16px; }
    .sk-avatar  { width:44px; height:44px; border-radius:50%; background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; flex-shrink:0; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .tst-empty { text-align:center; padding:60px; color:#94a3b8; }
  `]
})
export class TestimonialsComponent implements OnInit {
  private contentService = inject(ContentService);

  loading      = signal(true);
  testimonials = signal<any[]>([]);
  skeletons    = Array.from({ length: 6 }, (_, i) => i);

  ngOnInit() {
    this.contentService.getTestimonials().subscribe({
      next: res => { this.testimonials.set(res.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  starArray(rating: number)      { return Array.from({ length: Math.min(rating, 5) }); }
  emptyStarArray(rating: number) { return Array.from({ length: Math.max(0, 5 - rating) }); }
}
