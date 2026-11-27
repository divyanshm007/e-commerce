import { Component, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ContentService } from '../../core/services/content.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

// ── Exported interfaces (used by frontend about.component.ts) ──────────────
export interface StatItem   { id: string; icon: string; value: string; label: string; }
export interface TeamMember { id: string; name: string; role: string; bio: string; photo: string; }
export interface ValueItem  { id: string; icon: string; title: string; description: string; }

export interface AboutPageData {
  hero:       { heading: string; subheading: string; badge: string; ctaText: string; ctaUrl: string; bgImage: string; };
  intro:      { enabled: boolean; tag: string; heading: string; body: string; highlight: string; };
  story:      { enabled: boolean; tag: string; heading: string; body: string; imageUrl: string; imagePosition: 'left'|'right'; year: string; location: string; };
  stats:      { enabled: boolean; tag: string; heading: string; items: StatItem[]; };
  team:       { enabled: boolean; tag: string; heading: string; subheading: string; members: TeamMember[]; };
  clinic:     { enabled: boolean; tag: string; heading: string; intro: string; ratingText: string; ratingNote: string; servicesHeading: string; services: string[]; locations: string[]; closingNote: string; };
  values:     { enabled: boolean; tag: string; heading: string; subheading: string; items: ValueItem[]; };
  mission:    { enabled: boolean; tag: string; heading: string; body: string; vision: string; };
  commitment: { enabled: boolean; heading: string; body: string; ctaText: string; ctaUrl: string; };
  contact:    { enabled: boolean; heading: string; headOffice: string; clinicAddresses: string[]; email: string; phones: string[]; };
}

export const DEFAULT_ABOUT: AboutPageData = {
  hero: {
    heading: 'We Are Sidham Pharmacy',
    subheading: 'Rooted in ancient Ayurvedic wisdom, committed to modern wellness for every family.',
    badge: 'Trusted Since 2018',
    ctaText: 'Explore Our Products',
    ctaUrl: '/products',
    bgImage: '/assets/images/about-hero.jpg'
  },
  intro: {
    enabled: true,
    tag: 'WHO WE ARE',
    heading: 'A Family-Founded Ayurvedic Wellness Brand',
    body: 'Welcome to Sidham Pharmacy, the proud Ayurvedic brand of M/S Ganpati Herbal Ayurveda, situated in Phalsanda Jattan, Kurukshetra, Haryana, India — a land enriched with spiritual heritage and the timeless science of Ayurveda. M/S Ganpati Herbal Ayurveda manufactures its own products under GMP and Ministry of AYUSH guidelines — including classical medicines, herbal tonics, tablets, and supplements — crafted from the finest herbs and minerals.\n\nWe are a family-founded and family-run Ayurvedic company dedicated to preserving the authentic traditions of Ayurveda while meeting the needs of modern healthcare. Our aim is to make pure, affordable, and high-quality Ayurvedic medicines accessible to every individual — blending ancient wisdom with modern standards of excellence.',
    highlight: 'Where Nature Heals Naturally'
  },
  story: {
    enabled: true,
    tag: 'OUR FOUNDING STORY',
    heading: 'A Vision Born from Faith in Nature',
    body: 'The roots of Sidham Pharmacy trace back to Mr. Jitender Singh, whose deep knowledge and faith in Ayurveda inspired the birth of this enterprise. With his vast experience and passion for healing, he envisioned a place where true Ayurvedic medicines could reach everyone, not just the privileged few. He obtained the manufacturing license for Ayurvedic medicines, ensuring that every patient could afford authentic, potent, and safe herbal formulations prepared with pure herbs, minerals, bhasmas, and natural extracts.',
    imageUrl: '/assets/images/about-story.jpg',
    imagePosition: 'right',
    year: '2018',
    location: 'Kurukshetra, Haryana'
  },
  stats: {
    enabled: true,
    tag: 'BY THE NUMBERS',
    heading: 'Trusted by Thousands Across India',
    items: [
      { id: 's1', icon: 'people', value: '50K+', label: 'Happy Customers' },
      { id: 's2', icon: 'inventory_2', value: '200+', label: 'Ayurvedic Products' },
      { id: 's3', icon: 'local_shipping', value: '1 Lakh+', label: 'Orders Delivered' },
      { id: 's4', icon: 'star', value: '4.9★', label: 'Google Rating' }
    ]
  },
  team: {
    enabled: true,
    tag: 'OUR LEADERSHIP',
    heading: 'Tradition Meets Vision',
    subheading: 'A dedicated team blending family values, medical excellence, and spiritual commitment — a rare combination in today\'s healthcare world.',
    members: [
      { id: 't1', name: 'Mr. Bhupinder Singh', role: 'Chief Executive Officer', bio: 'Guides the company\'s progress with a strong focus on innovation, operational excellence, and customer satisfaction. His leadership is shaping Sidham Pharmacy into a brand that stands for trust, integrity, and growth.', photo: '' },
      { id: 't2', name: 'Dr. Gourav', role: 'Managing Director & Research Head', bio: 'Managing Director (MD) of Sidham Pharmacy and Ganpati Herbal Ayurveda, is the driving force behind research and product innovation. With a strong background in Ayurvedic medicine, he has been instrumental in developing new formulations, herbal supplements, and therapeutic products designed for today\'s health challenges.', photo: '' },
      { id: 't3', name: 'Dr. Aarti Saini', role: 'B.A.M.S., M.S. — Ayurvedic Doctor', bio: 'A highly qualified Ayurvedic doctor, contributes her expertise in women\'s wellness, and chronic disease management. Her patient-centered approach and gentle guidance reflect the healing power of Ayurveda in every consultation.', photo: '' },
      { id: 't4', name: 'Mrs. Pooja Saini', role: 'Operations & Administration', bio: 'A vital pillar of the organization, manages all computer operations, accounting, and workforce supervision. Her dedication ensures that every process — from production to administration — runs smoothly, efficiently, and transparently.', photo: '' }
    ]
  },
  values: {
    enabled: true,
    tag: 'WHAT WE STAND FOR',
    heading: 'Our Core Values',
    subheading: 'The principles that guide every product we craft and every life we touch.',
    items: [
      { id: 'v1', icon: 'eco', title: 'Purity', description: 'Using only natural, high-grade ingredients sourced ethically.' },
      { id: 'v2', icon: 'verified', title: 'Authenticity', description: 'Honoring classical Ayurvedic principles in every process.' },
      { id: 'v3', icon: 'handshake', title: 'Integrity', description: 'Maintaining transparency and honesty in every transaction.' },
      { id: 'v4', icon: 'self_improvement', title: 'Wellness', description: 'Promoting balance, vitality, and harmony in every life we touch.' }
    ]
  },
  mission: {
    enabled: true,
    tag: 'OUR PURPOSE',
    heading: 'Our Mission',
    body: 'To promote Ayurveda as a complete system of health and wellness, offering affordable, authentic, and effective herbal solutions.',
    vision: 'To become a globally recognized Ayurvedic brand and healing center, delivering nature-based healthcare rooted in Indian tradition.'
  },
  clinic: {
    enabled: true,
    tag: 'OUR CLINIC',
    heading: 'Ganpati Herbal Ayurveda Clinic',
    intro: 'Our Ganpati Herbal Ayurveda Clinic, located at 4072, Block E, Sushant City, Kurukshetra, and Phalsanda Jattan, Kurukshetra, Haryana, is a trusted center for complete Ayurvedic and natural healing. Led by Dr. Gourav and Dr. Aarti Saini (B.A.M.S., M.S.), the clinic offers authentic Ayurvedic consultations, and Physiotherapy treatments — blending traditional Ayurveda with modern rehabilitation techniques.',
    ratingText: '4.9★ Google Rating',
    ratingNote: 'Recognized for its compassionate care, personalized treatments, and holistic healing approach — serving patients across Kurukshetra and Haryana with trust and dedication.',
    servicesHeading: 'Specialized Ayurvedic Care For',
    services: [
      'PCOD / PCOS and menstrual disorders',
      'Kidney stones and urinary tract health',
      'Blood pressure and diabetes (sugar) management',
      'Joint pain, arthritis, and spine problems',
      'Children\'s immunity and digestive issues',
      'Paralysis recovery, sports injuries, and post-surgery rehabilitation'
    ],
    locations: [
      '4072, Block E, Sushant City, Kurukshetra, Haryana',
      'Phalsanda Jattan, Kurukshetra, Haryana, India'
    ],
    closingNote: 'By combining herbal formulations and physiotherapy techniques, we offer customized, result-oriented treatments focused on root-cause healing — not just symptom relief.'
  },
  commitment: {
    enabled: true,
    heading: 'Our Commitment',
    body: 'At Sidham Pharmacy & Ganpati Herbal Ayurveda, we see Ayurveda not just as medicine, but as a way of life. Our purpose goes beyond selling products — we aim to restore trust in natural healing, educate people about holistic living, and create a healthier, more conscious society. We invite you to experience the timeless healing touch of Ayurveda with us — where nature, science, and compassion come together for your well-being.\n\nAt Sidham Pharmacy & Ganpati Herbal Ayurveda, we don\'t just make medicines — we cultivate wellness. United as a family, we serve humanity through Ayurveda — Where Nature Heals Naturally.',
    ctaText: 'Shop Our Products',
    ctaUrl: '/products'
  },
  contact: {
    enabled: true,
    heading: 'Find Us',
    headOffice: 'Phalsanda Jattan, Kurukshetra, Haryana, India',
    clinicAddresses: [
      '4072, Block E, Sushant City, Kurukshetra, Haryana',
      'Phalsanda Jattan, Kurukshetra, Haryana, India'
    ],
    email: 'sidhampharmacy@gmail.com',
    phones: ['+91 8570031091', '+91 9588383903']
  },
};

@Component({
  selector: 'app-admin-about-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService],
  imports: [NgFor, NgIf, FormsModule, InputTextModule, TextareaModule, SkeletonModule, ToastModule, MediaUrlPipe],
  template: `
<p-toast />

<div class="ab-page">

  <!-- Page Header -->
  <div class="ab-page-header">
    <div>
      <h1 class="ab-page-title">About Page Editor</h1>
      <p class="ab-page-sub">All changes are reflected live on <strong>/about</strong>. No hardcoded content.</p>
    </div>
    <div class="ab-header-actions">
      <a class="ab-preview-link" href="/about" target="_blank"><i class="pi pi-external-link"></i> Preview Page</a>
      <button class="ab-save-btn" [disabled]="saving || loading" (click)="save()">
        <i [class]="saving ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
        {{ saving ? 'Saving…' : 'Save All Changes' }}
      </button>
    </div>
  </div>

  <!-- Loading -->
  <div class="ab-loader" *ngIf="loading">
    <i class="pi pi-spin pi-spinner"></i><span>Loading page content…</span>
  </div>

  <!-- Editor -->
  <div class="ab-editor-card" *ngIf="!loading">

    <!-- Tab bar -->
    <div class="ab-tab-nav">
      <button *ngFor="let t of tabs" class="ab-tab-btn" [class.ab-tab-active]="activeTab === t.key" (click)="activeTab = t.key">
        <i [class]="'pi ' + t.icon"></i><span>{{ t.label }}</span>
      </button>
    </div>

    <div class="ab-tab-body">

      <!-- ═══ HERO ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'hero'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-blue"><i class="pi pi-desktop"></i></div>
            <div><div class="ab-sc-title">Hero Banner</div><div class="ab-sc-sub">The full-width banner at the top of the About page.</div></div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-field">
              <label class="ab-label">Heading <span class="ab-req">*</span></label>
              <div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.hero.heading" name="hero_h" class="ab-inp ab-inp-icon" placeholder="We Are Sidham Pharmacy"/></div>
            </div>
            <div class="ab-field">
              <label class="ab-label">Subheading</label>
              <div class="ab-input-wrap"><i class="pi pi-align-left ab-input-icon"></i><input pInputText [(ngModel)]="data.hero.subheading" name="hero_sh" class="ab-inp ab-inp-icon" placeholder="Rooted in Ayurvedic wisdom…"/></div>
            </div>
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Badge Text</label><div class="ab-input-wrap"><i class="pi pi-tag ab-input-icon"></i><input pInputText [(ngModel)]="data.hero.badge" name="hero_badge" class="ab-inp ab-inp-icon" placeholder="Trusted Since 2018"/></div></div>
              <div class="ab-field"><label class="ab-label">Background Image URL</label><div class="ab-input-wrap"><i class="pi pi-image ab-input-icon"></i><input pInputText [(ngModel)]="data.hero.bgImage" name="hero_bg" class="ab-inp ab-inp-icon" placeholder="https://…"/></div></div>
            </div>
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">CTA Button Text</label><div class="ab-input-wrap"><i class="pi pi-link ab-input-icon"></i><input pInputText [(ngModel)]="data.hero.ctaText" name="hero_ctat" class="ab-inp ab-inp-icon" placeholder="Explore Our Products"/></div></div>
              <div class="ab-field"><label class="ab-label">CTA Button URL</label><div class="ab-input-wrap"><i class="pi pi-external-link ab-input-icon"></i><input pInputText [(ngModel)]="data.hero.ctaUrl" name="hero_ctau" class="ab-inp ab-inp-icon" placeholder="/products"/></div></div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ═══ INTRO ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'intro'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-teal"><i class="pi pi-file-edit"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Introduction</div><div class="ab-sc-sub">Two-column introduction section.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.intro.enabled" (click)="data.intro.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.intro.enabled" (click)="data.intro.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Section Tag</label><div class="ab-input-wrap"><i class="pi pi-tag ab-input-icon"></i><input pInputText [(ngModel)]="data.intro.tag" name="in_tag" class="ab-inp ab-inp-icon" placeholder="WHO WE ARE"/></div></div>
              <div class="ab-field"><label class="ab-label">Heading</label><div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.intro.heading" name="in_h" class="ab-inp ab-inp-icon" placeholder="A Family-Founded Ayurvedic Brand"/></div></div>
            </div>
            <div class="ab-field"><label class="ab-label">Body Text</label><p class="ab-hint">Use a blank line between paragraphs.</p><textarea pTextarea [(ngModel)]="data.intro.body" name="in_body" rows="7" class="ab-textarea" placeholder="Enter your introduction text…"></textarea></div>
            <div class="ab-field"><label class="ab-label">Highlight / Quote</label><div class="ab-input-wrap"><i class="pi pi-comment ab-input-icon"></i><input pInputText [(ngModel)]="data.intro.highlight" name="in_hl" class="ab-inp ab-inp-icon" placeholder="Where Nature Heals Naturally"/></div></div>
          </div>
        </div>
      </ng-container>

      <!-- ═══ STORY ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'story'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-amber"><i class="pi pi-book"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Founding Story</div><div class="ab-sc-sub">Split-layout section with image and story text.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.story.enabled" (click)="data.story.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.story.enabled" (click)="data.story.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Section Tag</label><div class="ab-input-wrap"><i class="pi pi-tag ab-input-icon"></i><input pInputText [(ngModel)]="data.story.tag" name="st_tag" class="ab-inp ab-inp-icon" placeholder="OUR FOUNDING STORY"/></div></div>
              <div class="ab-field"><label class="ab-label">Heading</label><div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.story.heading" name="st_h" class="ab-inp ab-inp-icon" placeholder="A Vision Born from Faith in Nature"/></div></div>
            </div>
            <div class="ab-field"><label class="ab-label">Story Text</label><textarea pTextarea [(ngModel)]="data.story.body" name="st_body" rows="7" class="ab-textarea" placeholder="Tell your founding story…"></textarea></div>
            <div class="ab-field">
              <label class="ab-label">Image URL</label>
              <div class="ab-img-row">
                <div class="ab-input-wrap ab-input-grow"><i class="pi pi-image ab-input-icon"></i><input pInputText [(ngModel)]="data.story.imageUrl" name="st_img" class="ab-inp ab-inp-icon" placeholder="https://…"/></div>
                <div class="ab-img-thumb" *ngIf="data.story.imageUrl"><img [src]="data.story.imageUrl | mediaUrl" alt=""/></div>
              </div>
            </div>
            <div class="ab-2col">
              <div class="ab-field">
                <label class="ab-label">Image Position</label>
                <div class="ab-tog-group">
                  <button class="ab-tog-btn" [class.ab-tog-on]="data.story.imagePosition==='left'"  (click)="data.story.imagePosition='left'"><i class="pi pi-align-left"></i> Left</button>
                  <button class="ab-tog-btn" [class.ab-tog-on]="data.story.imagePosition==='right'" (click)="data.story.imagePosition='right'"><i class="pi pi-align-right"></i> Right</button>
                </div>
              </div>
              <div class="ab-2col">
                <div class="ab-field"><label class="ab-label">Founded Year</label><div class="ab-input-wrap"><i class="pi pi-calendar ab-input-icon"></i><input pInputText [(ngModel)]="data.story.year" name="st_yr" class="ab-inp ab-inp-icon" placeholder="2018"/></div></div>
                <div class="ab-field"><label class="ab-label">Location</label><div class="ab-input-wrap"><i class="pi pi-map-marker ab-input-icon"></i><input pInputText [(ngModel)]="data.story.location" name="st_loc" class="ab-inp ab-inp-icon" placeholder="Kurukshetra, Haryana"/></div></div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ═══ STATS ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'stats'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-purple"><i class="pi pi-chart-bar"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Statistics</div><div class="ab-sc-sub">Number showcase strip.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.stats.enabled" (click)="data.stats.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.stats.enabled" (click)="data.stats.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Section Tag</label><div class="ab-input-wrap"><i class="pi pi-tag ab-input-icon"></i><input pInputText [(ngModel)]="data.stats.tag" name="st2_tag" class="ab-inp ab-inp-icon" placeholder="BY THE NUMBERS"/></div></div>
              <div class="ab-field"><label class="ab-label">Heading</label><div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.stats.heading" name="st2_h" class="ab-inp ab-inp-icon" placeholder="Trusted by Thousands"/></div></div>
            </div>
            <label class="ab-label" style="display:block;margin-bottom:8px">Stat Items</label>
            <div class="ab-list-items">
              <div class="ab-list-item" *ngFor="let s of data.stats.items; let i=index; trackBy: trackId">
                <span class="ab-item-num">{{ i+1 }}</span>
                <div class="ab-input-wrap" style="width:130px;flex-shrink:0"><input pInputText [(ngModel)]="s.icon" [name]="'si_'+s.id+'_icon'" class="ab-inp" placeholder="pi-users"/></div>
                <div class="ab-input-wrap" style="width:100px;flex-shrink:0"><input pInputText [(ngModel)]="s.value" [name]="'si_'+s.id+'_val'" class="ab-inp" placeholder="50,000+"/></div>
                <div class="ab-input-wrap ab-input-grow"><input pInputText [(ngModel)]="s.label" [name]="'si_'+s.id+'_lbl'" class="ab-inp" placeholder="Happy Customers"/></div>
                <button type="button" class="ab-del-btn" (click)="removeStat(i)"><i class="pi pi-trash"></i></button>
              </div>
            </div>
            <button type="button" class="ab-add-btn" (click)="addStat()"><i class="pi pi-plus"></i> Add Stat</button>
          </div>
        </div>
      </ng-container>

      <!-- ═══ TEAM ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'team'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-teal"><i class="pi pi-users"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Team / Leadership</div><div class="ab-sc-sub">Cards grid showcasing your leadership team.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.team.enabled" (click)="data.team.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.team.enabled" (click)="data.team.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Section Tag</label><div class="ab-input-wrap"><i class="pi pi-tag ab-input-icon"></i><input pInputText [(ngModel)]="data.team.tag" name="tm_tag" class="ab-inp ab-inp-icon" placeholder="OUR LEADERSHIP"/></div></div>
              <div class="ab-field"><label class="ab-label">Heading</label><div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.team.heading" name="tm_h" class="ab-inp ab-inp-icon" placeholder="The Minds Behind SIDHAM"/></div></div>
            </div>
            <div class="ab-field"><label class="ab-label">Subheading</label><div class="ab-input-wrap"><i class="pi pi-align-left ab-input-icon"></i><input pInputText [(ngModel)]="data.team.subheading" name="tm_sh" class="ab-inp ab-inp-icon" placeholder="A dedicated team blending values and expertise…"/></div></div>
            <label class="ab-label" style="display:block;margin-bottom:8px">Team Members</label>
            <div class="ab-team-cards">
              <div class="ab-team-card" *ngFor="let m of data.team.members; let i=index; trackBy: trackId">
                <div class="ab-tc-top">
                  <span class="ab-item-num">{{ i+1 }}</span>
                  <button type="button" class="ab-del-btn" (click)="removeMember(i)"><i class="pi pi-trash"></i></button>
                </div>
                <div class="ab-2col">
                  <div class="ab-field"><label class="ab-label">Name</label><div class="ab-input-wrap"><i class="pi pi-user ab-input-icon"></i><input pInputText [(ngModel)]="m.name" [name]="'tm_n_'+m.id" class="ab-inp ab-inp-icon" placeholder="Mr. Bhupinder Singh"/></div></div>
                  <div class="ab-field"><label class="ab-label">Role / Title</label><div class="ab-input-wrap"><i class="pi pi-briefcase ab-input-icon"></i><input pInputText [(ngModel)]="m.role" [name]="'tm_r_'+m.id" class="ab-inp ab-inp-icon" placeholder="Chief Executive Officer"/></div></div>
                </div>
                <div class="ab-field"><label class="ab-label">Short Bio</label><textarea pTextarea [(ngModel)]="m.bio" [name]="'tm_b_'+m.id" rows="3" class="ab-textarea" placeholder="Brief description…"></textarea></div>
                <div class="ab-field">
                  <label class="ab-label">Photo</label>
                  <div class="ab-photo-row">
                    <div class="ab-photo-box">
                      <img *ngIf="m.photo" [src]="m.photo | mediaUrl" alt=""/>
                      <i *ngIf="!m.photo" class="pi pi-user"></i>
                    </div>
                    <div class="ab-photo-actions">
                      <input type="file" #pf accept="image/png,image/jpeg,image/webp" style="display:none" (change)="onPhotoSelected($event, m)"/>
                      <button type="button" class="ab-add-btn" [disabled]="uploadingId === m.id" (click)="pf.click()">
                        <i [class]="uploadingId === m.id ? 'pi pi-spin pi-spinner' : 'pi pi-upload'"></i>
                        {{ uploadingId === m.id ? 'Uploading…' : (m.photo ? 'Change photo' : 'Upload photo') }}
                      </button>
                      <button type="button" class="ab-del-btn" *ngIf="m.photo" (click)="m.photo = ''" title="Remove photo"><i class="pi pi-trash"></i></button>
                      <span class="ab-photo-hint">PNG, JPG or WebP, up to 5 MB. Click Save to publish.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button type="button" class="ab-add-btn" (click)="addMember()"><i class="pi pi-user-plus"></i> Add Team Member</button>
          </div>
        </div>
      </ng-container>

      <!-- ═══ VALUES ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'values'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-amber"><i class="pi pi-star-fill"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Core Values</div><div class="ab-sc-sub">Icon cards grid highlighting your brand's principles.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.values.enabled" (click)="data.values.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.values.enabled" (click)="data.values.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Section Tag</label><div class="ab-input-wrap"><i class="pi pi-tag ab-input-icon"></i><input pInputText [(ngModel)]="data.values.tag" name="val_tag" class="ab-inp ab-inp-icon" placeholder="WHAT WE STAND FOR"/></div></div>
              <div class="ab-field"><label class="ab-label">Heading</label><div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.values.heading" name="val_h" class="ab-inp ab-inp-icon" placeholder="Our Core Values"/></div></div>
            </div>
            <div class="ab-field"><label class="ab-label">Subheading</label><div class="ab-input-wrap"><i class="pi pi-align-left ab-input-icon"></i><input pInputText [(ngModel)]="data.values.subheading" name="val_sh" class="ab-inp ab-inp-icon" placeholder="The principles that guide us…"/></div></div>
            <label class="ab-label" style="display:block;margin-bottom:8px">Values</label>
            <div class="ab-list-items">
              <div class="ab-list-item ab-list-top" *ngFor="let v of data.values.items; let i=index; trackBy: trackId">
                <span class="ab-item-num">{{ i+1 }}</span>
                <div class="ab-input-wrap" style="width:130px;flex-shrink:0"><input pInputText [(ngModel)]="v.icon" [name]="'vi_'+v.id+'_icon'" class="ab-inp" placeholder="pi-leaf"/></div>
                <div class="ab-input-wrap" style="width:130px;flex-shrink:0"><input pInputText [(ngModel)]="v.title" [name]="'vi_'+v.id+'_ti'" class="ab-inp" placeholder="Purity"/></div>
                <div class="ab-input-wrap ab-input-grow"><textarea pTextarea [(ngModel)]="v.description" [name]="'vi_'+v.id+'_d'" rows="2" class="ab-inp ab-ta-inline" placeholder="Short description…"></textarea></div>
                <button type="button" class="ab-del-btn" (click)="removeValue(i)"><i class="pi pi-trash"></i></button>
              </div>
            </div>
            <button type="button" class="ab-add-btn" (click)="addValue()"><i class="pi pi-plus"></i> Add Value</button>
          </div>
        </div>
      </ng-container>

      <!-- ═══ MISSION ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'mission'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-blue"><i class="pi pi-bullseye"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Mission & Vision</div><div class="ab-sc-sub">Full-width section with mission statement and vision line.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.mission.enabled" (click)="data.mission.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.mission.enabled" (click)="data.mission.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Section Tag</label><div class="ab-input-wrap"><i class="pi pi-tag ab-input-icon"></i><input pInputText [(ngModel)]="data.mission.tag" name="ms_tag" class="ab-inp ab-inp-icon" placeholder="OUR PURPOSE"/></div></div>
              <div class="ab-field"><label class="ab-label">Heading</label><div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.mission.heading" name="ms_h" class="ab-inp ab-inp-icon" placeholder="Mission & Vision"/></div></div>
            </div>
            <div class="ab-field"><label class="ab-label">Mission Statement</label><textarea pTextarea [(ngModel)]="data.mission.body" name="ms_body" rows="5" class="ab-textarea" placeholder="To promote Ayurveda as a complete system…"></textarea></div>
            <div class="ab-field"><label class="ab-label">Vision Statement</label><div class="ab-input-wrap"><i class="pi pi-eye ab-input-icon"></i><input pInputText [(ngModel)]="data.mission.vision" name="ms_vis" class="ab-inp ab-inp-icon" placeholder="To make Ayurvedic healthcare accessible to every household…"/></div></div>
          </div>
        </div>
      </ng-container>

      <!-- ═══ COMMITMENT ══════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'commitment'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-teal"><i class="pi pi-handshake"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Commitment / Closing CTA</div><div class="ab-sc-sub">Final closing section with a CTA button.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.commitment.enabled" (click)="data.commitment.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.commitment.enabled" (click)="data.commitment.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-field"><label class="ab-label">Heading</label><div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.commitment.heading" name="cm_h" class="ab-inp ab-inp-icon" placeholder="Our Commitment to You"/></div></div>
            <div class="ab-field"><label class="ab-label">Body Text</label><textarea pTextarea [(ngModel)]="data.commitment.body" name="cm_body" rows="5" class="ab-textarea" placeholder="Closing statement…"></textarea></div>
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">CTA Button Text</label><div class="ab-input-wrap"><i class="pi pi-link ab-input-icon"></i><input pInputText [(ngModel)]="data.commitment.ctaText" name="cm_ctat" class="ab-inp ab-inp-icon" placeholder="Shop Our Products"/></div></div>
              <div class="ab-field"><label class="ab-label">CTA Button URL</label><div class="ab-input-wrap"><i class="pi pi-external-link ab-input-icon"></i><input pInputText [(ngModel)]="data.commitment.ctaUrl" name="cm_ctau" class="ab-inp ab-inp-icon" placeholder="/products"/></div></div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ═══ CLINIC ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'clinic'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-red"><i class="pi pi-heart"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Clinic Section</div><div class="ab-sc-sub">Showcase your physical clinic with services and locations.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.clinic.enabled" (click)="data.clinic.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.clinic.enabled" (click)="data.clinic.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Section Tag</label><div class="ab-input-wrap"><i class="pi pi-tag ab-input-icon"></i><input pInputText [(ngModel)]="data.clinic.tag" name="cl_tag" class="ab-inp ab-inp-icon" placeholder="OUR CLINIC"/></div></div>
              <div class="ab-field"><label class="ab-label">Clinic Name / Heading</label><div class="ab-input-wrap"><i class="pi pi-building ab-input-icon"></i><input pInputText [(ngModel)]="data.clinic.heading" name="cl_h" class="ab-inp ab-inp-icon" placeholder="Ganpati Herbal Ayurveda Clinic"/></div></div>
            </div>
            <div class="ab-field"><label class="ab-label">Introduction Paragraph</label><textarea pTextarea [(ngModel)]="data.clinic.intro" name="cl_intro" rows="3" class="ab-textarea" placeholder="Brief description of the clinic…"></textarea></div>
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Google Rating Text</label><div class="ab-input-wrap"><i class="pi pi-star ab-input-icon"></i><input pInputText [(ngModel)]="data.clinic.ratingText" name="cl_rt" class="ab-inp ab-inp-icon" placeholder="4.9★ Google Rating"/></div></div>
              <div class="ab-field"><label class="ab-label">Rating Note</label><div class="ab-input-wrap"><i class="pi pi-info-circle ab-input-icon"></i><input pInputText [(ngModel)]="data.clinic.ratingNote" name="cl_rn" class="ab-inp ab-inp-icon" placeholder="Recognized for compassionate care…"/></div></div>
            </div>
            <div class="ab-field"><label class="ab-label">Services Section Heading</label><div class="ab-input-wrap"><i class="pi pi-list ab-input-icon"></i><input pInputText [(ngModel)]="data.clinic.servicesHeading" name="cl_sh" class="ab-inp ab-inp-icon" placeholder="Specialized Ayurvedic Care For"/></div></div>
            <div class="ab-field">
              <label class="ab-label">Services / Conditions Treated</label>
              <div class="ab-list-items">
                <div class="ab-list-item" *ngFor="let s of data.clinic.services; let i=index">
                  <span class="ab-item-num">{{ i+1 }}</span>
                  <div class="ab-input-wrap ab-input-grow"><input pInputText [(ngModel)]="data.clinic.services[i]" [name]="'cl_svc_'+i" class="ab-inp" placeholder="Service or condition…"/></div>
                  <button type="button" class="ab-del-btn" (click)="removeService(i)"><i class="pi pi-trash"></i></button>
                </div>
              </div>
              <button type="button" class="ab-add-btn" (click)="addService()"><i class="pi pi-plus"></i> Add Service</button>
            </div>
            <div class="ab-field">
              <label class="ab-label">Clinic Locations</label>
              <div class="ab-list-items">
                <div class="ab-list-item" *ngFor="let l of data.clinic.locations; let i=index">
                  <span class="ab-item-num">{{ i+1 }}</span>
                  <div class="ab-input-wrap ab-input-grow"><input pInputText [(ngModel)]="data.clinic.locations[i]" [name]="'cl_loc_'+i" class="ab-inp" placeholder="Address…"/></div>
                  <button type="button" class="ab-del-btn" (click)="removeLocation(i)"><i class="pi pi-trash"></i></button>
                </div>
              </div>
              <button type="button" class="ab-add-btn" (click)="addLocation()"><i class="pi pi-plus"></i> Add Location</button>
            </div>
            <div class="ab-field"><label class="ab-label">Closing Note</label><div class="ab-input-wrap"><i class="pi pi-comment ab-input-icon"></i><input pInputText [(ngModel)]="data.clinic.closingNote" name="cl_cn" class="ab-inp ab-inp-icon" placeholder="Customized, result-oriented treatments…"/></div></div>
          </div>
        </div>
      </ng-container>

      <!-- ═══ CONTACT ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="activeTab === 'contact'">
        <div class="ab-section-card">
          <div class="ab-sc-head">
            <div class="ab-sc-head-icon ab-icon-blue"><i class="pi pi-map-marker"></i></div>
            <div class="ab-sc-head-text"><div class="ab-sc-title">Contact / Find Us</div><div class="ab-sc-sub">Head office, clinic addresses, email, and phone numbers.</div></div>
            <div class="ab-vis-toggle">
              <button class="ab-vis-btn" [class.ab-vis-on]="data.contact.enabled" (click)="data.contact.enabled=true"><i class="pi pi-eye"></i> Visible</button>
              <button class="ab-vis-btn ab-vis-off" [class.ab-vis-on]="!data.contact.enabled" (click)="data.contact.enabled=false"><i class="pi pi-eye-slash"></i> Hidden</button>
            </div>
          </div>
          <div class="ab-sc-body">
            <div class="ab-field"><label class="ab-label">Section Heading</label><div class="ab-input-wrap"><i class="pi pi-heading ab-input-icon"></i><input pInputText [(ngModel)]="data.contact.heading" name="ct_h" class="ab-inp ab-inp-icon" placeholder="Find Us"/></div></div>
            <div class="ab-field"><label class="ab-label">Head Office Address</label><div class="ab-input-wrap"><i class="pi pi-building ab-input-icon"></i><input pInputText [(ngModel)]="data.contact.headOffice" name="ct_ho" class="ab-inp ab-inp-icon" placeholder="Phalsanda Jattan, Kurukshetra, Haryana, India"/></div></div>
            <div class="ab-field">
              <label class="ab-label">Clinic Addresses</label>
              <div class="ab-list-items">
                <div class="ab-list-item" *ngFor="let a of data.contact.clinicAddresses; let i=index">
                  <span class="ab-item-num">{{ i+1 }}</span>
                  <div class="ab-input-wrap ab-input-grow"><input pInputText [(ngModel)]="data.contact.clinicAddresses[i]" [name]="'ct_ca_'+i" class="ab-inp" placeholder="Clinic address…"/></div>
                  <button type="button" class="ab-del-btn" (click)="removeClinicAddress(i)"><i class="pi pi-trash"></i></button>
                </div>
              </div>
              <button type="button" class="ab-add-btn" (click)="addClinicAddress()"><i class="pi pi-plus"></i> Add Address</button>
            </div>
            <div class="ab-2col">
              <div class="ab-field"><label class="ab-label">Email Address</label><div class="ab-input-wrap"><i class="pi pi-envelope ab-input-icon"></i><input pInputText [(ngModel)]="data.contact.email" name="ct_em" type="email" class="ab-inp ab-inp-icon" placeholder="contact@example.com"/></div></div>
              <div class="ab-field">
                <label class="ab-label">Phone Numbers</label>
                <div class="ab-list-items">
                  <div class="ab-list-item" *ngFor="let p of data.contact.phones; let i=index">
                    <span class="ab-item-num">{{ i+1 }}</span>
                    <div class="ab-input-wrap ab-input-grow"><input pInputText [(ngModel)]="data.contact.phones[i]" [name]="'ct_ph_'+i" class="ab-inp" placeholder="+91 XXXXXXXXXX"/></div>
                    <button type="button" class="ab-del-btn" (click)="removePhone(i)"><i class="pi pi-trash"></i></button>
                  </div>
                </div>
                <button type="button" class="ab-add-btn" (click)="addPhone()"><i class="pi pi-plus"></i> Add Phone</button>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

    </div><!-- ab-tab-body -->
  </div><!-- ab-editor-card -->
</div><!-- ab-page -->
  `,
  styles: [`

/* ================================================================
   ABOUT PAGE EDITOR — ViewEncapsulation.None, all selectors .ab-*
================================================================ */

.ab-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; gap: 16px; }

.ab-page-header   { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.ab-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.ab-page-sub      { font-size: 13px; color: #64748B; margin: 2px 0 0; }
.ab-page-sub strong { color: #0F172A; }
.ab-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.ab-preview-link { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #0F766E; font-size: 12px; font-weight: 600; text-decoration: none; }
.ab-preview-link:hover { background: #F0FDFA; border-color: #CCFBF1; }
.ab-save-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 14px; border-radius: 7px; border: none; background: #0F766E; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 4px rgba(15,118,110,0.25); transition: background 0.13s; }
.ab-save-btn:hover:not(:disabled) { background: #115E59; }
.ab-save-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.ab-save-btn .pi { font-size: 11px; }

.ab-loader { display: flex; align-items: center; gap: 10px; padding: 32px; color: #64748B; font-size: 13px; }
.ab-loader .pi { font-size: 22px; color: #0F766E; }

/* Editor card */
.ab-editor-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.04); flex: 1; }

/* Tab nav */
.ab-tab-nav { display: flex; overflow-x: auto; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; scrollbar-width: thin; }
.ab-tab-btn { display: flex; align-items: center; gap: 6px; padding: 12px 16px; background: none; border: none; border-bottom: 3px solid transparent; font-size: 12.5px; font-weight: 600; color: #64748B; cursor: pointer; white-space: nowrap; margin-bottom: -1px; transition: color 0.13s,border-color 0.13s,background 0.13s; }
.ab-tab-btn .pi { font-size: 13px; }
.ab-tab-btn:hover:not(.ab-tab-active) { color: #0F172A; background: #F1F5F9; }
.ab-tab-active { color: #0F766E !important; border-bottom-color: #0F766E !important; background: #fff !important; }

.ab-tab-body { padding: 20px 22px; }

/* Section card */
.ab-section-card { border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
.ab-sc-head { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; flex-wrap: wrap; }
.ab-sc-head-text { flex: 1; min-width: 0; }
.ab-sc-title { font-size: 14px; font-weight: 700; color: #0F172A; }
.ab-sc-sub   { font-size: 11.5px; color: #64748B; margin-top: 1px; }
.ab-sc-head-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.ab-icon-blue   { background: #EFF6FF; color: #2563EB; }
.ab-icon-teal   { background: #F0FDFA; color: #0F766E; }
.ab-icon-amber  { background: #FFFBEB; color: #D97706; }
.ab-icon-purple { background: #F5F3FF; color: #7C3AED; }
.ab-icon-red    { background: #FEF2F2; color: #DC2626; }

/* Visibility toggle */
.ab-vis-toggle { display: flex; gap: 5px; margin-left: auto; }
.ab-vis-btn { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border: 1px solid #E2E8F0; border-radius: 6px; background: #F1F5F9; color: #94A3B8; font-size: 11px; font-weight: 600; cursor: pointer; }
.ab-vis-btn .pi { font-size: 11px; }
.ab-vis-on { background: #F0FDF9 !important; border-color: #CCFBF1 !important; color: #0F766E !important; }
.ab-vis-off.ab-vis-on { background: #FEF2F2 !important; border-color: #FECACA !important; color: #DC2626 !important; }

.ab-sc-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }

/* Fields */
.ab-field { display: flex; flex-direction: column; gap: 5px; }
.ab-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.ab-req   { color: #DC2626; }
.ab-hint  { font-size: 11px; color: #94A3B8; margin: 0; }
.ab-2col  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.ab-input-wrap { position: relative; display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; transition: border-color 0.15s,box-shadow 0.15s; min-width: 0; }
.ab-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.ab-input-grow { flex: 1; }
.ab-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; flex-shrink: 0; z-index: 1; }
.ab-inp { width: 100%; height: 36px; border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important; border-radius: 8px !important; }
.ab-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.ab-inp-icon { padding-left: 30px !important; }
.ab-ta-inline { height: auto !important; resize: vertical; padding: 8px 10px !important; line-height: 1.5 !important; min-height: 36px; }
.ab-textarea { width: 100% !important; box-sizing: border-box; resize: vertical; padding: 9px 11px !important; font-size: 13px !important; color: #0F172A !important; border: 1px solid #E2E8F0 !important; border-radius: 8px !important; background: #fff !important; line-height: 1.6; box-shadow: none !important; outline: none !important; font-family: inherit !important; }
.ab-textarea:focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; }
.ab-textarea::placeholder { color: #CBD5E1 !important; }

/* Team photo */
.ab-photo-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.ab-photo-box { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; border: 2px solid #E2E8F0; background: #F1F5F9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #94A3B8; font-size: 26px; }
.ab-photo-box img { width: 100%; height: 100%; object-fit: cover; }
.ab-photo-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ab-photo-hint { font-size: 11px; color: #64748B; flex-basis: 100%; }
/* Image row */
.ab-img-row   { display: flex; align-items: flex-start; gap: 10px; }
.ab-img-thumb { width: 68px; height: 68px; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden; flex-shrink: 0; }
.ab-img-sm    { width: 48px; height: 48px; }
.ab-img-thumb img { width: 100%; height: 100%; object-fit: cover; }

/* Toggle group */
.ab-tog-group { display: flex; gap: 6px; margin-top: 6px; }
.ab-tog-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px; border: 1px solid #E2E8F0; border-radius: 7px; background: #F8FAFC; color: #64748B; font-size: 12px; font-weight: 600; cursor: pointer; }
.ab-tog-btn .pi { font-size: 12px; }
.ab-tog-on { background: #F0FDF9 !important; border-color: #0F766E !important; color: #0F766E !important; }

/* List items */
.ab-list-items { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.ab-list-item  { display: flex; align-items: center; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; }
.ab-list-top   { align-items: flex-start; padding-top: 12px; }
.ab-item-num   { width: 22px; height: 22px; border-radius: 50%; background: #0F766E; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ab-del-btn    { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: 1px solid #FECACA; background: #fff; color: #F87171; cursor: pointer; font-size: 11px; flex-shrink: 0; }
.ab-del-btn:hover { background: #FEF2F2; color: #DC2626; }
.ab-del-btn .pi { font-size: 11px; }
.ab-add-btn    { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1.5px solid #0F766E; border-radius: 7px; color: #0F766E; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 2px; }
.ab-add-btn:hover { background: #F0FDF9; }
.ab-add-btn .pi { font-size: 10px; }

/* Team cards */
.ab-team-cards { display: flex; flex-direction: column; gap: 14px; }
.ab-team-card  { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.ab-tc-top     { display: flex; align-items: center; justify-content: space-between; }

  `]
})
export class AdminAboutPageComponent implements OnInit {
  private contentService = inject(ContentService);
  private toast          = inject(MessageService);

  loading  = false;
  saving   = false;
  activeTab = 'hero';

  tabs = [
    { key: 'hero',       label: 'Hero',         icon: 'pi-desktop'    },
    { key: 'intro',      label: 'Introduction',  icon: 'pi-file-edit'  },
    { key: 'story',      label: 'Our Story',     icon: 'pi-book'        },
    { key: 'stats',      label: 'Statistics',    icon: 'pi-chart-bar'  },
    { key: 'team',       label: 'Team',          icon: 'pi-users'      },
    { key: 'clinic',     label: 'Clinic',        icon: 'pi-heart'      },
    { key: 'values',     label: 'Values',        icon: 'pi-star-fill'  },
    { key: 'mission',    label: 'Mission',       icon: 'pi-bullseye'   },
    { key: 'commitment', label: 'Commitment',    icon: 'pi-handshake'  },
    { key: 'contact',    label: 'Contact',       icon: 'pi-map-marker' },
  ];

  data: AboutPageData = JSON.parse(JSON.stringify(DEFAULT_ABOUT));
  private idCounter = 100;

  ngOnInit(): void {
    this.loading = true;
    this.contentService.getPage('about').subscribe({
      next: (res) => {
        if (res?.data?.content) {
          try {
            const saved = JSON.parse(res.data.content);
            this.data = this.deepMerge(DEFAULT_ABOUT, saved) as AboutPageData;
          } catch { /* use defaults */ }
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private deepMerge(defaults: any, override: any): any {
    const result = { ...defaults };
    for (const key of Object.keys(override ?? {})) {
      if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.deepMerge(defaults[key] ?? {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }

  addStat():              void { this.data.stats.items.push({ id: `s_${this.idCounter++}`, icon: 'pi-users', value: '0', label: 'Label' }); }
  removeStat(i: number):  void { this.data.stats.items.splice(i, 1); }
  addMember():              void { this.data.team.members.push({ id: `t_${this.idCounter++}`, name: '', role: '', bio: '', photo: '' }); }
  removeMember(i: number):  void { this.data.team.members.splice(i, 1); }

  uploadingId: string | null = null;

  /** Photo chosen from the computer: uploaded to the server, then shown in the card (Save publishes it on /about). */
  onPhotoSelected(event: Event, m: TeamMember): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      this.toast.add({ severity: 'warn', summary: 'Wrong file type', detail: 'Choose a PNG, JPG or WebP image.', life: 3500 });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.add({ severity: 'warn', summary: 'Image too large', detail: 'The photo must be 5 MB or smaller.', life: 3500 });
      return;
    }
    this.uploadingId = m.id;
    this.contentService.uploadFile(file, 'team').subscribe({
      next: (r: any) => {
        this.uploadingId = null;
        const url: string | undefined = r?.data?.url ?? r?.url;
        if (url) { m.photo = url; this.toast.add({ severity: 'success', summary: 'Photo uploaded', detail: 'Click Save to publish it on the About page.', life: 3500 }); }
        else this.toast.add({ severity: 'error', summary: 'Upload failed', detail: 'The server did not return the image address.', life: 4000 });
      },
      error: () => { this.uploadingId = null; this.toast.add({ severity: 'error', summary: 'Upload failed', detail: 'Could not upload the photo. Please try again.', life: 4000 }); }
    });
  }
  addValue():               void { this.data.values.items.push({ id: `v_${this.idCounter++}`, icon: 'pi-star', title: '', description: '' }); }
  removeValue(i: number):   void { this.data.values.items.splice(i, 1); }
  addService():              void { this.data.clinic.services.push(''); }
  removeService(i: number):  void { this.data.clinic.services.splice(i, 1); }
  addLocation():             void { this.data.clinic.locations.push(''); }
  removeLocation(i: number): void { this.data.clinic.locations.splice(i, 1); }
  addClinicAddress():              void { this.data.contact.clinicAddresses.push(''); }
  removeClinicAddress(i: number):  void { this.data.contact.clinicAddresses.splice(i, 1); }
  addPhone():              void { this.data.contact.phones.push(''); }
  removePhone(i: number):  void { this.data.contact.phones.splice(i, 1); }
  trackId(_: number, item: { id: string }): string { return item.id; }

  save(): void {
    this.saving = true;
    this.contentService.upsertPage('about', {
      title:   this.data.hero.heading || 'About SIDHAM',
      content: JSON.stringify(this.data),
    }).subscribe({
      next: () => { this.toast.add({ severity: 'success', summary: 'Saved', detail: 'About page saved!', life: 3000 }); this.saving = false; },
      error: () => { this.toast.add({ severity: 'error', summary: 'Error', detail: 'Save failed. Please try again.', life: 4000 }); this.saving = false; }
    });
  }
}
