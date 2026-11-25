import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [NgFor, PageHeroComponent],
  template: `
    <app-page-hero
      title="Our Activities"
      subtitle="Explore our wellness initiatives, workshops, and community programmes."
      icon="event"
      image="/uploads/heroes/hero-activities.jpg">
    </app-page-hero>

    <div class="container activities-section">
      <div class="activities-grid">
        <div class="activity-card" *ngFor="let activity of activities">
          <div class="activity-icon">{{ activity.icon }}</div>
          <h3>{{ activity.title }}</h3>
          <p>{{ activity.desc }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-banner {
      background: linear-gradient(135deg, var(--primary) 0%, #3949ab 100%);
      color: #fff;
      padding: 64px 0;
      text-align: center;
      margin-bottom: 48px;
      h1 { font-size: 2.5rem; font-weight: 800; margin: 0 0 12px; }
      p { font-size: 1.1rem; opacity: 0.85; margin: 0; }
    }

    .activities-section { margin-bottom: 64px; }

    .activities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }

    .activity-card {
      background: #fff;
      border-radius: 14px;
      padding: 32px 24px;
      text-align: center;
      box-shadow: 0 2px 16px rgba(0,0,0,0.07);
      border: 1px solid #e2e8f0;
      transition: transform 0.2s, box-shadow 0.2s;
      &:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,0,0,0.12); }

      .activity-icon { font-size: 2.8rem; margin-bottom: 16px; }
      h3 { font-size: 1.1rem; font-weight: 700; margin: 0 0 10px; color: var(--primary); }
      p { font-size: 0.9rem; line-height: 1.6; color: #64748b; margin: 0; }
    }
  `]
})
export class ActivitiesComponent {
  activities = [
    { icon: '🌱', title: 'Community Outreach', desc: 'Engaging with communities to provide support, education and essential resources.' },
    { icon: '🎓', title: 'Skill Development', desc: 'Running training programs to empower individuals with practical skills.' },
    { icon: '🤝', title: 'Partnerships', desc: 'Building partnerships with organizations that share our vision and values.' },
    { icon: '🏥', title: 'Health Initiatives', desc: 'Organizing health camps and awareness drives for underserved populations.' },
    { icon: '📚', title: 'Education Programs', desc: 'Supporting educational initiatives through scholarships and learning materials.' },
    { icon: '🌍', title: 'Sustainability', desc: 'Driving sustainable practices in everything we do, for a better tomorrow.' },
  ];
}
