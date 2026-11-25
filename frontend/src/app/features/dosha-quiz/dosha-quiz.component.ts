import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { QuizService } from '../../core/services/quiz.service';
import { mediaUrl } from '../../core/utils/media';

@Component({
  selector: 'app-dosha-quiz',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, NgClass, MatButtonModule, MatIconModule, BreadcrumbComponent, PageHeroComponent],
  template: `
    <div class="container" style="padding-top:24px">
      <app-breadcrumb [items]="[{label:'Home',link:'/'},{label: quiz()?.title || 'Quiz'}]" />
    </div>

    <!-- Loading -->
    <div class="quiz-loading" *ngIf="loading()">
      <div class="sk-hero"></div>
      <div class="container sk-body">
        <div class="sk-line sk-w60"></div>
        <div class="sk-line sk-w90"></div>
        <div class="sk-cards">
          <div class="sk-card" *ngFor="let i of [1,2,3]"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div class="quiz-error" *ngIf="!loading() && !quiz()">
      <i class="pi pi-exclamation-circle"></i>
      <h2>Quiz not found</h2>
      <p>This quiz doesn't exist or is currently unavailable.</p>
    </div>

    <ng-container *ngIf="!loading() && quiz()">

      <app-page-hero
        [title]="quiz()!.title"
        [subtitle]="quiz()!.description || 'Discover your unique Ayurvedic body constitution.'"
        icon="self_improvement"
        image="/uploads/heroes/hero-dosha-quiz.jpg">
      </app-page-hero>

      <div class="container quiz-container">

        <!-- Intro -->
        <div class="quiz-intro" *ngIf="!started && !result()">
          <div class="dosha-cards" [class.two-col]="quiz()!.resultTypes.length === 2">
            <div class="dosha-intro-card" *ngFor="let rt of quiz()!.resultTypes"
              [style.background-image]="'url(' + doshaPhoto(rt.key) + ')'"
              [class]="'dosha-intro-card dosha-card-' + rt.key">
              <div class="di-overlay"></div>
              <div class="di-content">
                <div class="di-icon-wrap">
                  <mat-icon class="di-icon">{{ doshaIcon(rt.key) }}</mat-icon>
                </div>
                <h3>{{ rt.title }}</h3>
                <p *ngIf="rt.description">{{ rt.description.split('.')[0] + '.' }}</p>
              </div>
            </div>
          </div>
          <button mat-flat-button color="primary" class="start-btn" (click)="start()">
            <mat-icon>play_arrow</mat-icon> Start the Quiz ({{ quiz()!.questions.length }} Questions)
          </button>
        </div>

        <!-- Quiz -->
        <div class="quiz-body" *ngIf="started && !result()">
          <div class="quiz-progress">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="((currentQ + 1) / quiz()!.questions.length) * 100"></div>
            </div>
            <span class="q-counter">Question {{ currentQ + 1 }} of {{ quiz()!.questions.length }}</span>
          </div>

          <div class="question-card">
            <h2>{{ quiz()!.questions[currentQ].text }}</h2>
            <div class="options-grid">
              <button class="option-btn"
                *ngFor="let opt of quiz()!.questions[currentQ].options"
                [class.selected]="answers[currentQ] === opt.resultTypeKey"
                (click)="selectAnswer(opt.resultTypeKey)">
                {{ opt.text }}
              </button>
            </div>
          </div>

          <div class="quiz-nav">
            <button mat-stroked-button (click)="prev()" [disabled]="currentQ === 0">
              <mat-icon>arrow_back</mat-icon> Previous
            </button>
            <button mat-flat-button color="primary" (click)="next()" [disabled]="!answers[currentQ]">
              {{ currentQ === quiz()!.questions.length - 1 ? 'See My Results' : 'Next' }}
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>

        <!-- Result -->
        <div class="quiz-result" *ngIf="result()">
          <div class="result-header" [class]="'result-header result-header-' + result()!.key"
            [style.background-image]="'url(' + doshaPhoto(result()!.key) + ')'">
            <div class="rh-overlay"></div>
            <div class="rh-content">
              <div class="rh-icon-wrap">
                <mat-icon class="rh-icon">{{ doshaIcon(result()!.key) }}</mat-icon>
              </div>
              <p class="rh-eyebrow">Your Dosha Type</p>
              <h2>{{ result()!.title }}</h2>
              <p class="rh-desc" *ngIf="result()!.description">{{ result()!.description }}</p>
            </div>
          </div>

          <div class="result-body">
            <div class="result-section" *ngIf="traits().length">
              <h3>Your Key Traits</h3>
              <div class="traits-grid">
                <span class="trait-chip" *ngFor="let t of traits()">{{ t }}</span>
              </div>
            </div>

            <div class="result-section" *ngIf="recommendations().length">
              <h3>Ayurvedic Recommendations for You</h3>
              <ul class="rec-list">
                <li *ngFor="let r of recommendations()">{{ r }}</li>
              </ul>
            </div>

            <div class="result-section" *ngIf="searchTerms().length">
              <h3>Shop Products for Your Type</h3>
              <div class="search-links">
                <a *ngFor="let term of searchTerms()"
                  [routerLink]="['/products']" [queryParams]="{search: term}"
                  mat-stroked-button color="primary">
                  {{ term }}
                </a>
              </div>
            </div>

            <div class="result-cta">
              <button mat-stroked-button (click)="restart()"><mat-icon>refresh</mat-icon> Retake Quiz</button>
              <a mat-flat-button color="primary" routerLink="/consultation">
                <mat-icon>event</mat-icon> Book Consultation
              </a>
            </div>
          </div>
        </div>

      </div>
    </ng-container>
  `,
  styles: [`
    /* Loading skeleton */
    .quiz-loading { }
    .sk-hero { height: 240px; background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .sk-body { padding: 40px 16px; max-width: 760px; margin: 0 auto; }
    .sk-line { height: 16px; border-radius: 8px; margin-bottom: 14px; background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .sk-w60 { width: 60%; } .sk-w90 { width: 90%; }
    .sk-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-top: 24px; }
    .sk-card { height: 140px; border-radius: 12px; background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .quiz-error { text-align: center; padding: 80px 16px; color: #64748b;
      .pi { font-size: 3rem; color: #cbd5e1; display: block; margin-bottom: 16px; }
      h2 { font-size: 1.5rem; color: #0f172a; margin: 0 0 8px; }
      p { margin: 0; }
    }

    .quiz-container { padding: 40px 16px 80px; max-width: 760px; margin: 0 auto; }

    /* Intro */
    .dosha-cards {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;
      &.two-col { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 640px) { grid-template-columns: 1fr; gap: 14px; }
    }
    .dosha-intro-card {
      position: relative; border-radius: 16px; overflow: hidden;
      min-height: 280px; cursor: default;
      background-size: cover; background-position: center;
      display: flex; flex-direction: column; justify-content: flex-end;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 36px rgba(0,0,0,0.28);
        .di-overlay { background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.08) 100%); }
      }
    }
    .dosha-card-vata   { background-color: #2B3A6E; }
    .dosha-card-pitta  { background-color: #7B2E00; }
    .dosha-card-kapha  { background-color: #1A3D27; }

    .di-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.12) 100%);
      transition: background 0.3s ease;
    }
    .di-content {
      position: relative; z-index: 2;
      padding: 24px 22px 26px; text-align: center; color: #fff;
    }
    .di-icon-wrap {
      width: 60px; height: 60px; border-radius: 50%;
      background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
      border: 1.5px solid rgba(255,255,255,0.3);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px;
    }
    .di-icon { font-size: 30px !important; width: 30px !important; height: 30px !important; color: #fff; }

    .dosha-intro-card h3 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 22px; font-weight: 700; margin: 0 0 8px; color: #fff; letter-spacing: 0.02em;
    }
    .dosha-intro-card p { font-size: 13px; margin: 0; color: rgba(255,255,255,0.82); line-height: 1.5; }

    .start-btn { height: 52px; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; margin: 0 auto; padding: 0 40px; }

    /* Quiz */
    .quiz-progress { margin-bottom: 32px; }
    .progress-bar { height: 8px; background: var(--border,#e2e8f0); border-radius: 100px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; background: var(--primary,#166534); border-radius: 100px; transition: width 0.3s ease; }
    .q-counter { font-size: 13px; color: var(--text-muted,#64748b); font-weight: 500; }
    .question-card {
      background: var(--surface,#fff); border-radius: var(--radius-lg,12px); padding: 32px;
      box-shadow: var(--shadow-sm,0 1px 8px rgba(0,0,0,0.06)); margin-bottom: 24px;
      h2 { font-size: 22px; font-weight: 700; margin: 0 0 24px; line-height: 1.4; }
    }
    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; @media (max-width: 600px) { grid-template-columns: 1fr; } }
    .option-btn {
      padding: 16px 20px; border: 2px solid var(--border,#e2e8f0); border-radius: var(--radius-md,8px);
      background: transparent; cursor: pointer; text-align: left; font-size: 14px;
      transition: all 0.2s; line-height: 1.4;
      &:hover { border-color: var(--primary,#166534); background: var(--primary-light,#f0fdf4); }
      &.selected { border-color: var(--primary,#166534); background: var(--primary-light,#f0fdf4); color: var(--primary,#166534); font-weight: 600; }
    }
    .quiz-nav { display: flex; justify-content: space-between; }

    /* Result header */
    .result-header {
      position: relative; border-radius: 18px; overflow: hidden;
      min-height: 360px; margin-bottom: 36px;
      background-size: cover; background-position: center;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 40px rgba(0,0,0,0.22);
    }
    .result-header-vata  { background-color: #2B3A6E; }
    .result-header-pitta { background-color: #7B2E00; }
    .result-header-kapha { background-color: #1A3D27; }

    .rh-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%);
    }
    .rh-content {
      position: relative; z-index: 2;
      text-align: center; color: #fff; padding: 48px 32px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .rh-icon-wrap {
      width: 88px; height: 88px; border-radius: 50%;
      background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
      border: 2px solid rgba(255,255,255,0.35);
      display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
    }
    .rh-icon { font-size: 44px !important; width: 44px !important; height: 44px !important; color: #fff; }
    .rh-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,0.7); margin: 0; }
    .result-header h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 40px; font-weight: 600; margin: 0; color: #fff; letter-spacing: -.01em; line-height: 1.1;
    }
    .rh-desc { font-size: 15px; margin: 4px 0 0; color: rgba(255,255,255,0.88); max-width: 520px; line-height: 1.6; }
    .result-body { display: flex; flex-direction: column; gap: 32px; }
    .result-section { h3 { font-size: 18px; font-weight: 700; margin: 0 0 16px; } }
    .traits-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .trait-chip { background: var(--primary-light,#f0fdf4); color: var(--primary,#166534); padding: 8px 16px; border-radius: 100px; font-size: 13px; font-weight: 600; }
    .rec-list { margin: 0; padding: 0 0 0 20px; display: flex; flex-direction: column; gap: 8px; li { font-size: 14px; color: var(--text-secondary,#475569); line-height: 1.6; } }
    .search-links { display: flex; flex-wrap: wrap; gap: 10px; }
    .result-cta { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; padding-top: 16px; }
  `]
})
export class DoshaQuizComponent implements OnInit {
  private quizService = inject(QuizService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  quiz    = signal<any>(null);
  result  = signal<any>(null);

  started  = false;
  currentQ = 0;
  answers: string[] = [];

  private readonly DOSHA_PHOTOS: Record<string, string> = {
    vata:  mediaUrl('/uploads/heroes/hero-vata.jpg'),  // misty mountains / sky
    pitta: mediaUrl('/uploads/heroes/hero-pitta.jpg'),  // fire / flames
    kapha: mediaUrl('/uploads/heroes/hero-kapha.jpg'),  // lush green forest
  };

  private readonly DOSHA_ICONS: Record<string, string> = {
    vata:  'air',
    pitta: 'local_fire_department',
    kapha: 'terrain',
  };

  doshaPhoto(key: string): string {
    return this.DOSHA_PHOTOS[key?.toLowerCase()] ?? mediaUrl('/uploads/heroes/hero-dosha-result.jpg');
  }

  doshaIcon(key: string): string {
    return this.DOSHA_ICONS[key?.toLowerCase()] ?? 'spa';
  }

  traits        = () => (this.result()?.traits ?? '').split('\n').filter((t: string) => t.trim());
  recommendations = () => (this.result()?.recommendations ?? '').split('\n').filter((r: string) => r.trim());
  searchTerms   = () => (this.result()?.searchTerms ?? '').split('\n').filter((s: string) => s.trim());

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug')
              ?? this.route.snapshot.data['slug']
              ?? 'dosha-quiz';

    this.quizService.getQuizBySlug(slug).subscribe({
      next: res => {
        this.quiz.set(res.data ?? null);
        if (res.data) this.answers = Array(res.data.questions.length).fill('');
        this.loading.set(false);
      },
      error: () => { this.quiz.set(null); this.loading.set(false); }
    });
  }

  start() { this.started = true; }

  selectAnswer(key: string) { this.answers[this.currentQ] = key; }

  next() {
    const questions = this.quiz()?.questions ?? [];
    if (this.currentQ < questions.length - 1) {
      this.currentQ++;
    } else {
      this.calculateResult();
    }
  }

  prev() { if (this.currentQ > 0) this.currentQ--; }

  calculateResult() {
    const counts: Record<string, number> = {};
    for (const answer of this.answers) {
      if (answer) counts[answer] = (counts[answer] ?? 0) + 1;
    }
    const dominant = Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b, '');
    const resultType = this.quiz()?.resultTypes?.find((rt: any) => rt.key === dominant) ?? null;
    this.result.set(resultType);
  }

  restart() {
    this.started  = false;
    this.currentQ = 0;
    this.answers  = Array(this.quiz()?.questions?.length ?? 0).fill('');
    this.result.set(null);
  }
}
