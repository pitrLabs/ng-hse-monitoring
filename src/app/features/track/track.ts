import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule
  ],
  template: `
    <div class="coming-soon-container">
      <div class="coming-soon-card glass-card-static">
        <div class="icon-wrapper">
          <mat-icon>route</mat-icon>
        </div>
        <h1 class="title">GPS Tracking</h1>
        <div class="badge">Coming Soon</div>
        <p class="description">
          Real-time GPS tracking for field personnel and safety teams. Monitor locations, view historical routes, and ensure team safety.
        </p>
        <div class="features">
          <div class="feature-item">
            <mat-icon>person_pin_circle</mat-icon>
            <span>Personnel Tracking</span>
          </div>
          <div class="feature-item">
            <mat-icon>timeline</mat-icon>
            <span>Route History</span>
          </div>
          <div class="feature-item">
            <mat-icon>my_location</mat-icon>
            <span>Live Location</span>
          </div>
          <div class="feature-item">
            <mat-icon>fence</mat-icon>
            <span>Geofencing</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .coming-soon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 150px);
      padding: 20px;
    }

    .coming-soon-card {
      max-width: 500px;
      width: 100%;
      padding: 48px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .icon-wrapper {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(124, 58, 237, 0.15));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        background: var(--accent-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }

    .title {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .badge {
      display: inline-block;
      padding: 8px 24px;
      background: var(--accent-gradient);
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      color: white;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .description {
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 8px 0;
    }

    .features {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 24px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--glass-border);
    }

    .feature-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--accent-primary);
      }

      span {
        font-size: 12px;
        font-weight: 500;
      }
    }
  `]
})
export class TrackComponent {}
