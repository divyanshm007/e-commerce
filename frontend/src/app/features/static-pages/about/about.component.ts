import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { NgFor, NgIf, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Title, Meta } from '@angular/platform-browser';
import { ContentService } from '../../../core/services/content.service';
import { AboutPageData, DEFAULT_ABOUT } from '../../../admin/about/admin-about-page.component';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, MatIconModule, MediaUrlPipe],
  template: `
  <!-- ── HERO ──────────────────────────────────────────────────── -->
  <section id="main-content" class="hero-section"
    [style.background-image]="d.hero.bgImage ? 'url('+d.hero.bgImage+')' : ''">
    <div class="hero-overlay"></div>
    <div class="container hero-inner">
      <span class="hero-badge" *ngIf="d.hero.badge">{{ d.hero.badge }}</span>
      <h1 class="hero-heading">{{ d.hero.heading }}</h1>
      <p  class="hero-sub">{{ d.hero.subheading }}</p>
      <a class="hero-cta" [routerLink]="d.hero.ctaUrl" *ngIf="d.hero.ctaText">
        {{ d.hero.ctaText }}
        <mat-icon>arrow_forward</mat-icon>
      </a>
    </div>
  </section>

  <!-- ── INTRO ─────────────────────────────────────────────────── -->
  <section class="intro-section section" *ngIf="d.intro.enabled">
    <div class="container intro-grid">
      <div class="intro-text">
        <span class="section-tag">{{ d.intro.tag }}</span>
        <h2 class="section-heading">{{ d.intro.heading }}</h2>
        <p *ngFor="let para of paras(d.intro.body)" class="body-para">{{ para }}</p>
      </div>
      <div class="intro-image-wrap">
        <img src="/assets/images/about-product.png" alt="Sidham Ayurvedic Products" loading="lazy" class="intro-img" />
      </div>
    </div>
  </section>

  <!-- ── STATS ─────────────────────────────────────────────────── -->
  <section class="stats-section" *ngIf="d.stats.enabled">
    <div class="container stats-inner">
      <div class="stats-header">
        <span class="section-tag light">{{ d.stats.tag }}</span>
        <h2 class="section-heading light">{{ d.stats.heading }}</h2>
      </div>
      <div class="stats-grid">
        <div class="stat-card" *ngFor="let s of d.stats.items">
          <div class="stat-icon-wrap"><mat-icon class="stat-icon">{{ s.icon }}</mat-icon></div>
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── STORY ─────────────────────────────────────────────────── -->
  <section class="story-section section" *ngIf="d.story.enabled">
    <div class="container story-grid" [class.img-left]="d.story.imagePosition==='left'">

      <div class="story-text">
        <span class="section-tag">{{ d.story.tag }}</span>
        <h2 class="section-heading">{{ d.story.heading }}</h2>
        <p *ngFor="let para of paras(d.story.body)" class="body-para">{{ para }}</p>
        <div class="story-meta">
          <div class="meta-pill" *ngIf="d.story.year">
            <mat-icon>calendar_today</mat-icon> Founded {{ d.story.year }}
          </div>
          <div class="meta-pill" *ngIf="d.story.location">
            <mat-icon>place</mat-icon> {{ d.story.location }}
          </div>
        </div>
      </div>

      <div class="story-image">
        <img *ngIf="d.story.imageUrl" [src]="d.story.imageUrl | mediaUrl" [alt]="d.story.heading" loading="lazy" width="560" height="420"/>
        <div class="img-placeholder" *ngIf="!d.story.imageUrl">
          <mat-icon>eco</mat-icon>
          <span>Sidham Pharmacy</span>
        </div>
        <div class="story-badge">
          <span class="badge-year">{{ d.story.year }}</span>
          <span class="badge-label">Est.</span>
        </div>
      </div>

    </div>
  </section>

  <!-- ── VALUES ────────────────────────────────────────────────── -->
  <section class="values-section section" *ngIf="d.values.enabled">
    <div class="container">
      <div class="section-intro">
        <span class="section-tag">{{ d.values.tag }}</span>
        <h2 class="section-heading center">{{ d.values.heading }}</h2>
        <p class="section-sub center" *ngIf="d.values.subheading">{{ d.values.subheading }}</p>
      </div>
      <div class="values-grid">
        <div class="value-card" *ngFor="let v of d.values.items">
          <div class="value-icon-wrap"><mat-icon>{{ v.icon }}</mat-icon></div>
          <h3 class="value-title">{{ v.title }}</h3>
          <p class="value-desc">{{ v.description }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── TEAM ──────────────────────────────────────────────────── -->
  <section class="team-section section" *ngIf="d.team.enabled && d.team.members.length">
    <div class="container">
      <div class="section-intro">
        <span class="section-tag">{{ d.team.tag }}</span>
        <h2 class="section-heading center">{{ d.team.heading }}</h2>
        <p class="section-sub center" *ngIf="d.team.subheading">{{ d.team.subheading }}</p>
      </div>
      <div class="team-grid">
        <div class="team-card" *ngFor="let m of d.team.members">
          <div class="team-photo" *ngIf="m.photo">
            <img [src]="m.photo" [alt]="m.name + ' – team member'" loading="lazy" width="200" height="200"/>
          </div>
          <div class="team-avatar" *ngIf="!m.photo">
            <span>{{ initials(m.name) }}</span>
          </div>
          <h3 class="team-name">{{ m.name }}</h3>
          <p class="team-role">{{ m.role }}</p>
          <div class="team-divider"></div>
          <p class="team-bio">{{ m.bio }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── MISSION ───────────────────────────────────────────────── -->
  <section class="mission-section" *ngIf="d.mission.enabled">
    <div class="container mission-inner">
      <div class="mission-left">
        <span class="section-tag light">{{ d.mission.tag }}</span>
        <h2 class="section-heading light">{{ d.mission.heading }}</h2>
        <p class="mission-body">{{ d.mission.body }}</p>
        <div class="mission-vision" *ngIf="d.mission.vision">
          <div class="mission-vision-label">Our Vision</div>
          <p class="mission-vision-text">{{ d.mission.vision }}</p>
        </div>
      </div>
      <div class="mission-right">
        <img src="/assets/images/about-mission.png" alt="Sidham Ayurveda Mission" loading="lazy" class="mission-img" />
      </div>
    </div>
  </section>

  <!-- ── CLINIC ───────────────────────────────────────────────── -->
  <section class="clinic-section section" *ngIf="d.clinic.enabled">
    <div class="container">
      <div class="clinic-header">
        <span class="section-tag">{{ d.clinic.tag }}</span>
        <h2 class="section-heading center">{{ d.clinic.heading }}</h2>
        <p class="section-sub center" *ngIf="d.clinic.intro">{{ d.clinic.intro }}</p>
      </div>

      <div class="clinic-grid">
        <!-- Services -->
        <div class="clinic-services-card">
          <h3 class="clinic-sub-heading">{{ d.clinic.servicesHeading }}</h3>
          <ul class="services-list">
            <li *ngFor="let s of d.clinic.services">
              <mat-icon class="svc-check">check_circle</mat-icon>
              <span>{{ s }}</span>
            </li>
          </ul>
          <p class="clinic-closing" *ngIf="d.clinic.closingNote">
            <mat-icon>info_outline</mat-icon> {{ d.clinic.closingNote }}
          </p>
        </div>

        <!-- Rating + Locations -->
        <div class="clinic-meta">
          <div class="rating-badge" *ngIf="d.clinic.ratingText">
            <div class="rating-text">{{ d.clinic.ratingText }}</div>
            <p class="rating-note" *ngIf="d.clinic.ratingNote">{{ d.clinic.ratingNote }}</p>
          </div>

          <div class="locations-block" *ngIf="d.clinic.locations.length">
            <h4 class="locations-title"><mat-icon>location_on</mat-icon> Our Locations</h4>
            <div class="location-pill" *ngFor="let l of d.clinic.locations">
              <mat-icon>place</mat-icon><span>{{ l }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── COMMITMENT ────────────────────────────────────────────── -->
  <section class="commitment-section" *ngIf="d.commitment.enabled">
    <div class="container commitment-inner">
      <h2 class="commitment-heading">{{ d.commitment.heading }}</h2>
      <p *ngFor="let para of paras(d.commitment.body)" class="commitment-body">{{ para }}</p>
      <a class="commitment-cta" [routerLink]="d.commitment.ctaUrl" *ngIf="d.commitment.ctaText">
        {{ d.commitment.ctaText }} <mat-icon>arrow_forward</mat-icon>
      </a>
    </div>
  </section>

  <!-- ── CONTACT ───────────────────────────────────────────────── -->
  <section class="contact-section section" *ngIf="d.contact.enabled">
    <div class="container">
      <div class="section-intro">
        <h2 class="section-heading center">{{ d.contact.heading }}</h2>
      </div>
      <div class="contact-grid">
        <div class="contact-card" *ngIf="d.contact.headOffice">
          <div class="contact-icon-wrap"><mat-icon>business</mat-icon></div>
          <h4>Head Office</h4>
          <p>{{ d.contact.headOffice }}</p>
        </div>
        <div class="contact-card" *ngIf="d.contact.clinicAddresses?.length">
          <div class="contact-icon-wrap"><mat-icon>local_hospital</mat-icon></div>
          <h4>Clinic Locations</h4>
          <p *ngFor="let a of d.contact.clinicAddresses">{{ a }}</p>
        </div>
        <div class="contact-card" *ngIf="d.contact.email">
          <div class="contact-icon-wrap"><mat-icon>email</mat-icon></div>
          <h4>Email Us</h4>
          <a [href]="'mailto:'+d.contact.email" class="contact-link">{{ d.contact.email }}</a>
        </div>
        <div class="contact-card" *ngIf="d.contact.phones?.length">
          <div class="contact-icon-wrap"><mat-icon>phone</mat-icon></div>
          <h4>Call Us</h4>
          <a *ngFor="let p of d.contact.phones" [href]="'tel:'+p" class="contact-link">{{ p }}</a>
        </div>
      </div>
    </div>
  </section>
  `,
  styles: [`
    /* ── Global helpers ───────────────────────────────────── */
    .section { padding: 80px 0; }
    .section-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--primary, #166534);
      background: rgba(61,82,160,0.08);
      padding: 4px 12px;
      border-radius: 100px;
      margin-bottom: 14px;
      &.light { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.15); }
    }
    .section-heading {
      font-size: 36px;
      font-weight: 800;
      color: #052e16;
      margin: 0 0 16px;
      line-height: 1.2;
      &.light  { color: #fff; }
      &.center { text-align: center; }
      @media (max-width: 768px) { font-size: 26px; }
    }
    .section-sub {
      font-size: 16px;
      color: #64748b;
      line-height: 1.7;
      max-width: 640px;
      margin: 0 auto;
      &.center { text-align: center; }
    }
    .section-intro { text-align: center; margin-bottom: 52px; }
    .body-para { font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 16px; }

    /* ── Hero ─────────────────────────────────────────────── */
    .hero-section {
      position: relative;
      min-height: 320px;
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, #052e16 0%, #166534 55%, #16a34a 100%);
      background-size: cover;
      background-position: center;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 70% 50%, rgba(112,145,230,0.25) 0%, transparent 70%);
      }
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background: rgba(26,26,46,0.55);
    }
    .hero-inner {
      position: relative;
      z-index: 2;
      padding: 48px 16px;
      max-width: 760px;
    }
    .hero-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #fff;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      backdrop-filter: blur(8px);
      padding: 6px 16px;
      border-radius: 100px;
      margin-bottom: 20px;
    }
    .hero-heading {
      font-size: 52px;
      font-weight: 900;
      color: #fff;
      line-height: 1.15;
      margin: 0 0 18px;
      @media (max-width: 768px) { font-size: 32px; }
    }
    .hero-sub {
      font-size: 18px;
      color: rgba(255,255,255,0.85);
      line-height: 1.7;
      margin: 0 0 36px;
      max-width: 560px;
      @media (max-width: 768px) { font-size: 15px; }
    }
    .hero-cta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      color: #052e16;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 10px;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
    }

    /* ── Intro ────────────────────────────────────────────── */
    .intro-section { background: #fff; }
    .intro-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 60px;
      align-items: center;
      @media (max-width: 960px) { grid-template-columns: 1fr; }
    }
    .intro-image-wrap { display: flex; align-items: center; justify-content: center; }
    .intro-img { width: 100%; display: block; }

    /* ── Stats ────────────────────────────────────────────── */
    .stats-section {
      background: #052e16;
      padding: 64px 0;
      position: relative;
      overflow: hidden;
      &::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse at 80% 50%, rgba(61,82,160,0.3), transparent 60%); }
    }
    .stats-inner { position: relative; z-index: 1; }
    .stats-header { text-align: center; margin-bottom: 48px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
    }
    .stat-card {
      text-align: center;
      padding: 32px 16px;
      border-radius: 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(8px);
      transition: transform 0.25s, background 0.25s;
      &:hover { transform: translateY(-4px); background: rgba(255,255,255,0.1); }
    }
    .stat-icon-wrap {
      width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    .stat-card:hover .stat-icon-wrap { transform: scale(1.1) rotate(-4deg); }
    .stat-icon { font-size: 32px; width: 32px; height: 32px; }
    /* per-card icon colours */
    .stat-card:nth-child(1) .stat-icon-wrap { background: rgba(96,165,250,0.2);  border: 1px solid rgba(96,165,250,0.35);  }
    .stat-card:nth-child(1) .stat-icon { color: #60a5fa; }
    .stat-card:nth-child(2) .stat-icon-wrap { background: rgba(192,132,252,0.2); border: 1px solid rgba(192,132,252,0.35); }
    .stat-card:nth-child(2) .stat-icon { color: #c084fc; }
    .stat-card:nth-child(3) .stat-icon-wrap { background: rgba(251,146,60,0.2);  border: 1px solid rgba(251,146,60,0.35);  }
    .stat-card:nth-child(3) .stat-icon { color: #fb923c; }
    .stat-card:nth-child(4) .stat-icon-wrap { background: rgba(251,191,36,0.2);  border: 1px solid rgba(251,191,36,0.35);  }
    .stat-card:nth-child(4) .stat-icon { color: #fbbf24; }
    .stat-value { font-size: 22px; font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 8px; }
    .stat-label { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Story ────────────────────────────────────────────── */
    .story-section { background: #f8fafc; }
    .story-grid {
      display: flex;
      gap: 64px;
      align-items: center;
      .story-text { order: 1; flex: 1; }
      .story-image { order: 2; width: 420px; flex-shrink: 0; position: relative; }
      &.img-left {
        .story-text  { order: 2; }
        .story-image { order: 1; }
      }
      @media (max-width: 960px) {
        flex-direction: column;
        .story-text,.story-image { order: unset; width: 100%; }
      }
    }
    .story-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
    .meta-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 100px;
      padding: 8px 16px; font-size: 13px; font-weight: 600; color: #475569;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .meta-pill:nth-child(1) mat-icon { color: #d97706; }
    .meta-pill:nth-child(2) mat-icon { color: #dc2626; }
    .story-image {
      img { width: 100%; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); display: block; }
    }
    .img-placeholder {
      width: 100%; height: 380px; background: linear-gradient(135deg, #166534, #4ade80);
      border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; color: rgba(255,255,255,0.8);
      mat-icon { font-size: 64px; width: 64px; height: 64px; }
      span { font-size: 18px; font-weight: 700; }
    }
    .story-badge {
      position: absolute; bottom: -16px; right: 24px;
      background: #fff; border-radius: 14px; padding: 14px 20px; text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    }
    .badge-year { display: block; font-size: 28px; font-weight: 900; color: var(--primary,#166534); line-height: 1; }
    .badge-label { display: block; font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

    /* ── Values ───────────────────────────────────────────── */
    .values-section { background: #fff; }
    .values-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      @media (max-width: 900px)  { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 480px)  { grid-template-columns: 1fr; }
    }
    .value-card {
      text-align: center; padding: 36px 24px; border-radius: 16px;
      border: 1px solid #e2e8f0; border-top: 3px solid transparent; background: #fafafa;
      transition: transform 0.25s, box-shadow 0.25s;
      &:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }
    }
    /* per-card accent stripe + icon colour */
    .value-card:nth-child(1) { border-top-color: #16a34a; }
    .value-card:nth-child(1) .value-icon-wrap { background: linear-gradient(135deg,#dcfce7,#bbf7d0); mat-icon { color: #16a34a; } }
    .value-card:nth-child(2) { border-top-color: #2563eb; }
    .value-card:nth-child(2) .value-icon-wrap { background: linear-gradient(135deg,#dbeafe,#bfdbfe); mat-icon { color: #2563eb; } }
    .value-card:nth-child(3) { border-top-color: #d97706; }
    .value-card:nth-child(3) .value-icon-wrap { background: linear-gradient(135deg,#fef3c7,#fde68a); mat-icon { color: #d97706; } }
    .value-card:nth-child(4) { border-top-color: #db2777; }
    .value-card:nth-child(4) .value-icon-wrap { background: linear-gradient(135deg,#fce7f3,#fbcfe8); mat-icon { color: #db2777; } }
    .value-icon-wrap {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 18px;
      transition: transform 0.2s;
      mat-icon { font-size: 30px; width: 30px; height: 30px; }
    }
    .value-card:hover .value-icon-wrap { transform: scale(1.12) rotate(-6deg); }
    .value-title { font-size: 17px; font-weight: 700; color: #052e16; margin: 0 0 10px; }
    .value-desc  { font-size: 14px; color: #64748b; line-height: 1.7; margin: 0; }

    /* ── Team ─────────────────────────────────────────────── */
    .team-section { background: #f8fafc; }
    .team-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 28px;
      @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 580px) { grid-template-columns: 1fr; }
    }
    .team-card {
      background: #fff; border-radius: 18px; padding: 36px 28px; text-align: center;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      transition: transform 0.25s, box-shadow 0.25s;
      position: relative; overflow: hidden;
      &::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; }
      &:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }
    }
    /* per-member accent top stripe + avatar gradient */
    .team-card:nth-child(1)::before { background: linear-gradient(90deg,#1e40af,#60a5fa); }
    .team-card:nth-child(1) .team-avatar { background: linear-gradient(135deg,#1e40af,#60a5fa); }
    .team-card:nth-child(1) .team-role  { color: #2563eb; }
    .team-card:nth-child(1) .team-divider { background: linear-gradient(90deg,#1e40af,#60a5fa); }
    .team-card:nth-child(2)::before { background: linear-gradient(90deg,#0f766e,#2dd4bf); }
    .team-card:nth-child(2) .team-avatar { background: linear-gradient(135deg,#0f766e,#2dd4bf); }
    .team-card:nth-child(2) .team-role  { color: #0d9488; }
    .team-card:nth-child(2) .team-divider { background: linear-gradient(90deg,#0f766e,#2dd4bf); }
    .team-card:nth-child(3)::before { background: linear-gradient(90deg,#9d174d,#f472b6); }
    .team-card:nth-child(3) .team-avatar { background: linear-gradient(135deg,#9d174d,#f472b6); }
    .team-card:nth-child(3) .team-role  { color: #be185d; }
    .team-card:nth-child(3) .team-divider { background: linear-gradient(90deg,#9d174d,#f472b6); }
    .team-card:nth-child(4)::before { background: linear-gradient(90deg,#78350f,#fbbf24); }
    .team-card:nth-child(4) .team-avatar { background: linear-gradient(135deg,#78350f,#fbbf24); }
    .team-card:nth-child(4) .team-role  { color: #b45309; }
    .team-card:nth-child(4) .team-divider { background: linear-gradient(90deg,#78350f,#fbbf24); }
    .team-photo {
      width: 96px; height: 96px; border-radius: 50%; overflow: hidden;
      margin: 0 auto 18px; border: 3px solid #f0fdf4;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .team-avatar {
      width: 96px; height: 96px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 18px; box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      span { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -1px; }
    }
    .team-name { font-size: 18px; font-weight: 700; color: #052e16; margin: 0 0 6px; }
    .team-role { font-size: 13px; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px; }
    .team-divider { width: 40px; height: 3px; border-radius: 2px; margin: 0 auto 16px; }
    .team-bio { font-size: 14px; color: #64748b; line-height: 1.7; margin: 0; }

    /* ── Mission ──────────────────────────────────────────── */
    .mission-section {
      background: linear-gradient(135deg, #052e16 0%, #14532d 100%);
      padding: 80px 0;
      position: relative;
      overflow: hidden;
      &::after { content:''; position:absolute; bottom:-80px; right:-80px; width:320px; height:320px; border-radius:50%; background:rgba(74,222,128,0.1); }
    }
    .mission-inner {
      display: grid; grid-template-columns: 1fr 360px; gap: 60px; align-items: center; position: relative; z-index: 1;
      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }
    .mission-body { font-size: 16px; color: rgba(255,255,255,0.8); line-height: 1.9; margin: 0 0 28px; }
    .mission-vision {
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 24px;
    }
    .mission-vision-label {
      font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
      color: #fbbf24; margin-bottom: 10px;
    }
    .mission-vision-text { font-size: 16px; color: rgba(255,255,255,0.85); line-height: 1.7; margin: 0; font-weight: 500; }
    .mission-img {
      width: 100%; display: block;
      border-radius: 24px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.35);
      transition: transform 0.5s ease;
      &:hover { transform: scale(1.02); }
    }

    /* ── Clinic ───────────────────────────────────────────── */
    .clinic-section { background: #f8fafc; }
    .clinic-header { text-align: center; margin-bottom: 52px; }
    .clinic-grid {
      display: grid; grid-template-columns: 1fr 360px; gap: 40px; align-items: start;
      @media (max-width: 960px) { grid-template-columns: 1fr; }
    }
    .clinic-services-card {
      background: #fff; border-radius: 20px; padding: 40px; border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    .clinic-sub-heading { font-size: 18px; font-weight: 700; color: #052e16; margin: 0 0 24px; }
    .services-list {
      list-style: none; padding: 0; margin: 0 0 24px;
      li {
        display: flex; align-items: flex-start; gap: 12px;
        font-size: 15px; color: #374151; line-height: 1.6; padding: 10px 0;
        border-bottom: 1px solid #f1f5f9;
        &:last-child { border-bottom: none; }
      }
    }
    .svc-check { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; }
    /* cycle 6 check-icon colours */
    .services-list li:nth-child(1) .svc-check { color: #16a34a; }
    .services-list li:nth-child(2) .svc-check { color: #2563eb; }
    .services-list li:nth-child(3) .svc-check { color: #7c3aed; }
    .services-list li:nth-child(4) .svc-check { color: #d97706; }
    .services-list li:nth-child(5) .svc-check { color: #db2777; }
    .services-list li:nth-child(6) .svc-check { color: #0d9488; }
    .clinic-closing {
      display: flex; align-items: flex-start; gap: 8px; background: #f0fdf4; border-radius: 10px;
      padding: 14px 16px; font-size: 14px; color: #166534; font-style: italic; margin: 0;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    }
    .clinic-meta { display: flex; flex-direction: column; gap: 24px; }
    .rating-badge {
      background: linear-gradient(135deg, #052e16, #166534); border-radius: 18px; padding: 32px;
      text-align: center; color: #fff;
    }
    .rating-text { font-size: 32px; font-weight: 900; color: #fbbf24; margin-bottom: 12px; }
    .rating-note { font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.6; margin: 0; }
    .locations-block {
      background: #fff; border-radius: 18px; padding: 28px; border: 1px solid #e2e8f0;
    }
    .locations-title {
      display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700;
      color: #052e16; margin: 0 0 18px;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--primary,#166534); }
    }
    .location-pill {
      display: flex; align-items: flex-start; gap: 8px; padding: 10px 0;
      font-size: 14px; color: #475569; border-bottom: 1px solid #f1f5f9; line-height: 1.5;
      &:last-child { border-bottom: none; padding-bottom: 0; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    }
    .location-pill:nth-child(1) mat-icon { color: #dc2626; }
    .location-pill:nth-child(2) mat-icon { color: #d97706; }

    /* ── Contact ──────────────────────────────────────────── */
    .contact-section { background: #fff; border-top: 1px solid #e2e8f0; }
    .contact-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
      @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .contact-card {
      background: #fafafa; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px 24px;
      text-align: center; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden;
      &::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; opacity:0; transition: opacity 0.2s; }
      &:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
      &:hover::after { opacity: 1; }
      h4 { font-size: 14px; font-weight: 700; color: #052e16; margin: 12px 0 8px; }
      p  { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 4px; }
    }
    /* per-card icon colours */
    .contact-card:nth-child(1) .contact-icon-wrap { background: linear-gradient(135deg,#dbeafe,#bfdbfe); mat-icon { color: #2563eb; } }
    .contact-card:nth-child(1)::after { background: linear-gradient(90deg,#2563eb,#60a5fa); }
    .contact-card:nth-child(2) .contact-icon-wrap { background: linear-gradient(135deg,#dcfce7,#bbf7d0); mat-icon { color: #16a34a; } }
    .contact-card:nth-child(2)::after { background: linear-gradient(90deg,#16a34a,#4ade80); }
    .contact-card:nth-child(3) .contact-icon-wrap { background: linear-gradient(135deg,#ede9fe,#ddd6fe); mat-icon { color: #7c3aed; } }
    .contact-card:nth-child(3)::after { background: linear-gradient(90deg,#7c3aed,#a78bfa); }
    .contact-card:nth-child(4) .contact-icon-wrap { background: linear-gradient(135deg,#ffedd5,#fed7aa); mat-icon { color: #ea580c; } }
    .contact-card:nth-child(4)::after { background: linear-gradient(90deg,#ea580c,#fb923c); }
    .contact-icon-wrap {
      width: 56px; height: 56px; border-radius: 16px; margin: 0 auto;
      display: flex; align-items: center; justify-content: center; transition: transform 0.2s;
      mat-icon { font-size: 26px; width: 26px; height: 26px; }
    }
    .contact-card:hover .contact-icon-wrap { transform: scale(1.1) rotate(-5deg); }
    .contact-link { display: block; font-size: 14px; color: #64748b; text-decoration: none; margin: 2px 0; &:hover { color: var(--primary,#166534); text-decoration: underline; } }

    /* ── Commitment ───────────────────────────────────────── */
    .commitment-section {
      padding: 80px 0;
      background: #fff;
      border-top: 1px solid #e2e8f0;
    }
    .commitment-inner { text-align: center; max-width: 720px; margin: 0 auto; padding: 0 16px; }
    .commitment-heading { font-size: 36px; font-weight: 800; color: #052e16; margin: 0 0 20px; @media(max-width:768px){font-size:26px;} }
    .commitment-body { font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 36px; }
    .commitment-cta {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, #166534, #4ade80);
      color: #fff; font-size: 16px; font-weight: 700;
      padding: 16px 36px; border-radius: 12px; text-decoration: none;
      box-shadow: 0 8px 24px rgba(61,82,160,0.35);
      transition: transform 0.2s, box-shadow 0.2s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(61,82,160,0.45); }
    }
  `]
})
export class AboutComponent implements OnInit, OnDestroy {
  private contentService = inject(ContentService);
  private titleSvc  = inject(Title);
  private metaSvc   = inject(Meta);
  private doc       = inject(DOCUMENT);
  d: AboutPageData = JSON.parse(JSON.stringify(DEFAULT_ABOUT));

  private jsonLdScript: HTMLScriptElement | null = null;

  ngOnInit(): void {
    this.setSeo();
    this.contentService.getPage('about').subscribe({
      next: (res) => {
        if (res?.data?.content) {
          try {
            const parsed = JSON.parse(res.data.content);
            if (parsed && typeof parsed === 'object') {
              this.d = this.deepMerge(DEFAULT_ABOUT, parsed) as AboutPageData;
              this.setSeo();
            }
          } catch { /* use defaults */ }
        }
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.jsonLdScript?.remove();
    ['description','keywords','robots','og:title','og:description','og:type',
     'og:url','og:image','og:site_name','twitter:card','twitter:title',
     'twitter:description','twitter:image'].forEach(n =>
      this.metaSvc.removeTag(n.startsWith('og:') || n.startsWith('twitter:')
        ? `property="${n}"` : `name="${n}"`)
    );
  }

  private setSeo(): void {
    const title       = `About Us | Sidham Pharmacy — Authentic Medicines & Healthcare`;
    const description = `Learn about Sidham Pharmacy — a trusted online pharmacy offering authentic Ayurvedic and allopathic medicines, healthcare essentials, and wellness products with fast delivery across India.`;
    const keywords    = `Sidham Pharmacy, online pharmacy India, authentic medicines, Ayurvedic pharmacy, healthcare essentials, buy medicines online, pharmacy about us`;
    const image       = `https://sidham.in/assets/images/about-hero.jpg`;
    const url         = `https://sidham.in/about`;

    this.titleSvc.setTitle(title);

    const tags = [
      { name: 'description',        content: description },
      { name: 'keywords',           content: keywords },
      { name: 'robots',             content: 'index, follow' },
      { name: 'author',             content: 'Sidham Pharmacy' },
      // Open Graph
      { property: 'og:type',        content: 'website' },
      { property: 'og:title',       content: title },
      { property: 'og:description', content: description },
      { property: 'og:image',       content: image },
      { property: 'og:url',         content: url },
      { property: 'og:site_name',   content: 'Sidham Pharmacy' },
      { property: 'og:locale',      content: 'en_IN' },
      // Twitter Card
      { name: 'twitter:card',        content: 'summary_large_image' },
      { name: 'twitter:title',       content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image',       content: image },
    ];

    tags.forEach(t => {
      const selector = (t as any).property
        ? `property="${(t as any).property}"`
        : `name="${t.name}"`;
      this.metaSvc.removeTag(selector);
      this.metaSvc.addTag(t as any);
    });

    // Canonical link
    let canonical = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // JSON-LD structured data
    this.jsonLdScript?.remove();
    this.jsonLdScript = this.doc.createElement('script');
    this.jsonLdScript.type = 'application/ld+json';
    this.jsonLdScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Pharmacy',
      name: 'Sidham Pharmacy',
      url: 'https://sidham.in',
      logo: 'https://sidham.in/assets/images/logo.png',
      image: image,
      description: description,
      foundingDate: this.d.story?.year || '2010',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN'
      },
      sameAs: [
        'https://www.facebook.com/sidhampharmacy',
        'https://www.instagram.com/sidhampharmacy',
        'https://www.youtube.com/sidhampharmacy'
      ],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '1200',
        bestRating: '5'
      }
    });
    this.doc.head.appendChild(this.jsonLdScript);
  }

  private deepMerge(defaults: any, override: any): any {
    const result = { ...defaults };
    for (const key of Object.keys(override ?? {})) {
      const val = override[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = this.deepMerge(defaults[key] ?? {}, val);
      } else if (val !== '' && val !== null && val !== undefined) {
        result[key] = val;
      }
      // empty string → keep the default (lets asset paths survive a re-save)
    }
    return result;
  }

  paras(text: string): string[] {
    return (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
