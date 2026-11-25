import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ContentService } from '../../../../core/services/content.service';
import { MediaUrlPipe } from '../../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [NgIf, RouterLink, DatePipe, MediaUrlPipe],
  template: `
    <!-- Loading -->
    <div class="bd-loader" *ngIf="loading()">
      <div class="bd-loader-inner">
        <div class="sk-cover"></div>
        <div class="sk-content">
          <div class="sk-line sk-cat"></div>
          <div class="sk-line sk-h1 w90"></div>
          <div class="sk-line sk-h1 w70"></div>
          <div class="sk-meta"></div>
          <div class="sk-line w100"></div>
          <div class="sk-line w100"></div>
          <div class="sk-line w80"></div>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div class="bd-not-found" *ngIf="!loading() && !post()">
      <i class="pi pi-exclamation-circle"></i>
      <h2>Post not found</h2>
      <p>This blog post doesn't exist or has been removed.</p>
      <a routerLink="/blogs" class="bd-back-btn"><i class="pi pi-arrow-left"></i> Back to Blog</a>
    </div>

    <!-- Post -->
    <article class="bd-article" *ngIf="!loading() && post()">

      <!-- Hero cover -->
      <div class="bd-hero" *ngIf="post().coverImageUrl">
        <img [src]="post().coverImageUrl | mediaUrl" [alt]="post().title" class="bd-hero-img" />
        <div class="bd-hero-overlay"></div>
      </div>
      <div class="bd-hero bd-hero-placeholder" *ngIf="!post().coverImageUrl"></div>

      <div class="container bd-container">

        <!-- Back link -->
        <a routerLink="/blogs" class="bd-back"><i class="pi pi-arrow-left"></i> Back to Blog</a>

        <!-- Meta header -->
        <div class="bd-meta-header">
          <span class="bd-cat" *ngIf="post().category">{{ post().category }}</span>
          <h1 class="bd-title">{{ post().title }}</h1>
          <p class="bd-excerpt" *ngIf="post().excerpt">{{ post().excerpt }}</p>
          <div class="bd-byline">
            <div class="bd-author-avatar">{{ post().author?.charAt(0)?.toUpperCase() }}</div>
            <div class="bd-author-info">
              <span class="bd-author-name">{{ post().author }}</span>
              <span class="bd-date">{{ (post().publishedAt || post().createdAt) | date:'longDate' }}</span>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="bd-content" [innerHTML]="post().content"></div>

        <!-- Footer nav -->
        <div class="bd-footer">
          <a routerLink="/blogs" class="bd-back-btn"><i class="pi pi-arrow-left"></i> All Posts</a>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .bd-loader { max-width: 780px; margin: 0 auto; padding: 32px 16px; }
    .bd-loader-inner { display: flex; flex-direction: column; gap: 20px; }
    .sk-cover { height: 360px; border-radius: 16px; background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .sk-content { display: flex; flex-direction: column; gap: 12px; }
    .sk-line { height: 14px; border-radius: 7px; background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .sk-cat { width: 80px; height: 20px; border-radius: 10px; }
    .sk-h1 { height: 28px; }
    .sk-meta { height: 40px; border-radius: 8px; width: 240px; background: #f1f5f9; animation: shimmer 1.4s infinite; }
    .w90 { width: 90%; } .w70 { width: 70%; } .w80 { width: 80%; } .w100 { width: 100%; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .bd-not-found {
      text-align: center; padding: 80px 16px; color: #64748b;
      .pi { font-size: 3.5rem; display: block; margin-bottom: 16px; color: #cbd5e1; }
      h2 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
      p { margin: 0 0 24px; }
    }
    .bd-back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 20px; border-radius: 8px; background: #052e16; color: #fff;
      font-size: 0.85rem; font-weight: 600; text-decoration: none; transition: background 0.15s;
      &:hover { background: #14532d; }
      .pi { font-size: 0.78rem; }
    }

    .bd-hero {
      width: 100%; height: 420px; position: relative; overflow: hidden;
      background: linear-gradient(135deg, #052e16 0%, #166534 100%);
      &.bd-hero-placeholder { height: 140px; }
    }
    .bd-hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .bd-hero-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, transparent 40%, rgba(5,46,22,0.65) 100%);
    }

    .bd-container { max-width: 780px; padding: 0 16px 80px; }

    .bd-back {
      display: inline-flex; align-items: center; gap: 6px; margin: 28px 0 24px;
      font-size: 0.82rem; font-weight: 600; color: #166534; text-decoration: none;
      &:hover { color: #052e16; }
      .pi { font-size: 0.72rem; }
    }

    .bd-meta-header { margin-bottom: 36px; border-bottom: 1px solid #e2e8f0; padding-bottom: 28px; }

    .bd-cat {
      display: inline-block; padding: 3px 12px; border-radius: 20px;
      background: #d1fae5; color: #052e16;
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 12px;
    }

    .bd-title {
      font-size: 2rem; font-weight: 800; line-height: 1.25; color: #052e16;
      margin: 0 0 14px;
      @media (max-width: 600px) { font-size: 1.5rem; }
    }

    .bd-excerpt {
      font-size: 1.05rem; color: #475569; line-height: 1.65; margin: 0 0 20px;
    }

    .bd-byline {
      display: flex; align-items: center; gap: 10px;
    }
    .bd-author-avatar {
      width: 38px; height: 38px; border-radius: 50%; background: #052e16; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
    }
    .bd-author-info { display: flex; flex-direction: column; gap: 2px; }
    .bd-author-name { font-size: 0.88rem; font-weight: 600; color: #0f172a; }
    .bd-date { font-size: 0.78rem; color: #94a3b8; }

    .bd-content {
      font-size: 1rem; line-height: 1.8; color: #334155;
      h1,h2,h3,h4 { color: #052e16; margin-top: 1.8em; margin-bottom: 0.6em; font-weight: 700; }
      h2 { font-size: 1.4rem; }
      h3 { font-size: 1.15rem; }
      p { margin: 0 0 1.2em; }
      img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
      ul, ol { padding-left: 1.6em; margin: 0 0 1.2em; }
      li { margin-bottom: 0.4em; }
      blockquote {
        border-left: 4px solid #86efac; padding: 12px 20px; margin: 1.5em 0;
        background: #f0fdf4; border-radius: 0 8px 8px 0; color: #166534; font-style: italic;
      }
      a { color: #166534; text-decoration: underline; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
      pre { background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 10px; overflow-x: auto; margin: 1.5em 0; }
    }

    .bd-footer { margin-top: 48px; padding-top: 28px; border-top: 1px solid #e2e8f0; }
  `]
})
export class BlogDetailComponent implements OnInit {
  private contentService = inject(ContentService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  post    = signal<any>(null);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.contentService.getBlogBySlug(slug).subscribe({
      next: res => { this.post.set(res.data ?? null); this.loading.set(false); },
      error: () => { this.post.set(null); this.loading.set(false); }
    });
  }
}
