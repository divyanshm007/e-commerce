import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-blogs',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, DatePipe, MediaUrlPipe, PageHeroComponent],
  template: `
    <app-page-hero
      title="Our Blog"
      subtitle="Stories, updates, and Ayurvedic insights from our team of experts."
      icon="article"
      image="/uploads/heroes/hero-blogs.jpg">
    </app-page-hero>

    <div class="container blogs-section">

      <!-- Category filter -->
      <div class="cat-filter" *ngIf="categories().length > 0">
        <button class="cat-btn" [class.active]="!activeCategory()" (click)="filterByCategory(null)">All</button>
        <button class="cat-btn" *ngFor="let cat of categories()"
          [class.active]="activeCategory() === cat"
          (click)="filterByCategory(cat)">{{ cat }}</button>
      </div>

      <!-- Skeleton loading -->
      <div class="blogs-grid" *ngIf="loading()">
        <div class="blog-card skeleton-card" *ngFor="let i of [1,2,3,4,5,6]">
          <div class="sk-img"></div>
          <div class="sk-body">
            <div class="sk-line sk-cat"></div>
            <div class="sk-line sk-title"></div>
            <div class="sk-line sk-text"></div>
            <div class="sk-line sk-text sk-short"></div>
          </div>
        </div>
      </div>

      <!-- Posts grid -->
      <div class="blogs-grid" *ngIf="!loading()">
        <article class="blog-card" *ngFor="let post of filteredPosts()">
          <div class="blog-image">
            <img *ngIf="post.coverImageUrl" [src]="post.coverImageUrl | mediaUrl" [alt]="post.title" class="cover-img" />
            <div *ngIf="!post.coverImageUrl" class="cover-placeholder">
              <i class="pi pi-book"></i>
            </div>
            <span class="cat-label" *ngIf="post.category">{{ post.category }}</span>
          </div>
          <div class="blog-body">
            <h3>{{ post.title }}</h3>
            <p class="excerpt">{{ post.excerpt }}</p>
            <div class="blog-meta">
              <span class="meta-author"><i class="pi pi-user"></i>{{ post.author }}</span>
              <span class="meta-date">{{ (post.publishedAt || post.createdAt) | date:'mediumDate' }}</span>
            </div>
            <a class="read-more" [routerLink]="['/blogs', post.slug]">Read More <i class="pi pi-arrow-right"></i></a>
          </div>
        </article>
      </div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="!loading() && filteredPosts().length === 0">
        <i class="pi pi-book"></i>
        <p>No blog posts found.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, #052e16 0%, #166534 100%);
      color: #fff;
      padding: 64px 0;
      text-align: center;
      margin-bottom: 48px;
      h1 { font-size: 2.5rem; font-weight: 800; margin: 0 0 12px; }
      p { font-size: 1.1rem; opacity: 0.85; margin: 0; }
    }

    .blogs-section { margin-bottom: 64px; }

    .cat-filter {
      display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px;
    }
    .cat-btn {
      padding: 5px 16px; border-radius: 20px; border: 1.5px solid #d1fae5;
      background: #fff; color: #166534; font-size: 0.82rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .cat-btn:hover, .cat-btn.active {
      background: #052e16; color: #fff; border-color: #052e16;
    }

    .blogs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 28px;
    }

    .blog-card {
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 2px 16px rgba(0,0,0,0.07);
      border: 1px solid #e2e8f0;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex; flex-direction: column;
      &:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,0,0,0.12); }
    }

    .blog-image {
      position: relative;
      .cover-img { width: 100%; height: 200px; object-fit: cover; display: block; }
      .cover-placeholder {
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        height: 200px;
        display: flex; align-items: center; justify-content: center;
        .pi { font-size: 3rem; color: #052e16; opacity: 0.3; }
      }
      .cat-label {
        position: absolute; top: 12px; left: 12px;
        background: rgba(5,46,22,0.85); color: #fff;
        font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
        padding: 3px 10px; border-radius: 20px; backdrop-filter: blur(4px);
      }
    }

    .blog-body {
      padding: 20px; display: flex; flex-direction: column; flex: 1;
      h3 { font-size: 1rem; font-weight: 700; margin: 0 0 8px; line-height: 1.4; color: #052e16; }
      .excerpt { font-size: 0.875rem; line-height: 1.6; color: #64748b; margin: 0 0 14px; flex: 1; }
    }

    .blog-meta {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;
      .meta-author, .meta-date { font-size: 0.78rem; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
      .meta-author .pi { font-size: 0.7rem; }
    }

    .read-more {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 0.82rem; font-weight: 600; color: #166534;
      text-decoration: none; transition: gap 0.15s;
      &:hover { gap: 8px; }
      .pi { font-size: 0.72rem; }
    }

    /* Skeleton */
    .skeleton-card { pointer-events: none; }
    .sk-img { height: 200px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .sk-body { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
    .sk-line { height: 12px; border-radius: 6px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .sk-cat   { width: 60px; height: 18px; border-radius: 10px; }
    .sk-title { width: 90%; height: 16px; }
    .sk-text  { width: 100%; }
    .sk-short { width: 70%; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .empty-state {
      text-align: center; padding: 64px 0; color: #94a3b8;
      .pi { font-size: 3rem; display: block; margin-bottom: 12px; }
      p { font-size: 1rem; }
    }
  `]
})
export class BlogsComponent implements OnInit {
  private contentService = inject(ContentService);

  loading      = signal(true);
  posts        = signal<any[]>([]);
  activeCategory = signal<string | null>(null);

  categories = (() => {
    const sig = this.posts;
    return () => [...new Set(sig().map((p: any) => p.category).filter(Boolean))] as string[];
  })();

  filteredPosts = (() => {
    const posts = this.posts;
    const cat   = this.activeCategory;
    return () => cat() ? posts().filter((p: any) => p.category === cat()) : posts();
  })();

  ngOnInit() {
    this.contentService.getBlogPosts().subscribe({
      next: res => { this.posts.set(res.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  filterByCategory(cat: string | null) { this.activeCategory.set(cat); }
}
