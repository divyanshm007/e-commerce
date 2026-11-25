import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ContentService } from '../../../core/services/content.service';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [NgFor, NgIf, MediaUrlPipe, PageHeroComponent],
  template: `
    <app-page-hero
      title="Gallery"
      subtitle="A glimpse into our world — products, events, and Ayurvedic moments."
      icon="photo_library"
      image="/uploads/heroes/hero-gallery.jpg">
    </app-page-hero>

    <div class="container gallery-section">

      <!-- Skeleton -->
      <div class="gallery-grid" *ngIf="loading()">
        <div class="gallery-item gallery-skeleton" *ngFor="let i of skeletons"></div>
      </div>

      <!-- Empty -->
      <div class="gallery-empty" *ngIf="!loading() && images().length === 0">
        <span class="gallery-empty-icon">🖼️</span>
        <p>No images yet — check back soon.</p>
      </div>

      <!-- Grid -->
      <div class="gallery-grid" *ngIf="!loading() && images().length > 0">
        <div class="gallery-item" *ngFor="let img of images()" (click)="openLightbox(img)">
          <div class="gallery-img-wrap">
            <img [src]="img.imageUrl | mediaUrl" [alt]="img.title" loading="lazy" />
            <div class="gallery-overlay">
              <span class="gallery-zoom">🔍</span>
            </div>
          </div>
          <div class="gallery-caption" *ngIf="img.title">
            <div class="gallery-cap-title">{{ img.title }}</div>
            <div class="gallery-cap-sub" *ngIf="img.subtitle">{{ img.subtitle }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <div class="lightbox" *ngIf="lightboxImg()" (click)="closeLightbox()">
      <button class="lb-close" (click)="closeLightbox()">✕</button>
      <div class="lb-content" (click)="$event.stopPropagation()">
        <img [src]="lightboxImg()!.imageUrl | mediaUrl" [alt]="lightboxImg()!.title" />
        <div class="lb-caption" *ngIf="lightboxImg()!.title">
          <div class="lb-title">{{ lightboxImg()!.title }}</div>
          <div class="lb-sub" *ngIf="lightboxImg()!.subtitle">{{ lightboxImg()!.subtitle }}</div>
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

    .gallery-section { margin-bottom: 64px; }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }

    .gallery-item {
      border-radius: 12px; overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      background: #f8fafc;
      &:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
      &:hover .gallery-overlay { opacity: 1; }
    }

    .gallery-img-wrap { position: relative; aspect-ratio: 4/3; overflow: hidden; }
    .gallery-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
    .gallery-item:hover .gallery-img-wrap img { transform: scale(1.04); }

    .gallery-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
    }
    .gallery-zoom { font-size: 2rem; }

    .gallery-caption { padding: 10px 14px 12px; }
    .gallery-cap-title { font-size: 13px; font-weight: 700; color: #0f172a; }
    .gallery-cap-sub   { font-size: 11.5px; color: #64748b; margin-top: 2px; }

    .gallery-skeleton {
      aspect-ratio: 4/3;
      background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      cursor: default;
      &:hover { transform: none; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .gallery-empty {
      text-align: center; padding: 80px 16px; color: #94a3b8;
      .gallery-empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
      p { margin: 0; font-size: 1rem; }
    }

    /* Lightbox */
    .lightbox {
      position: fixed; inset: 0; background: rgba(0,0,0,0.88);
      z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .lb-close {
      position: absolute; top: 16px; right: 20px; background: none; border: none;
      color: #fff; font-size: 22px; cursor: pointer; z-index: 1; opacity: 0.75;
      &:hover { opacity: 1; }
    }
    .lb-content { max-width: min(860px, 95vw); width: 100%; }
    .lb-content img { width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; display: block; }
    .lb-caption { padding: 10px 4px 0; text-align: center; color: #fff; }
    .lb-title { font-size: 15px; font-weight: 700; }
    .lb-sub   { font-size: 12.5px; opacity: 0.7; margin-top: 3px; }
  `]
})
export class GalleryComponent implements OnInit {
  private contentService = inject(ContentService);

  loading   = signal(true);
  images    = signal<any[]>([]);
  lightboxImg = signal<any>(null);
  skeletons = Array.from({ length: 12 }, (_, i) => i);

  ngOnInit() {
    this.contentService.getGalleryImages().subscribe({
      next: res => { this.images.set(res.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openLightbox(img: any) { this.lightboxImg.set(img); }
  closeLightbox()         { this.lightboxImg.set(null); }
}
