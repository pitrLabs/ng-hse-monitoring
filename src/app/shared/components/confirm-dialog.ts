import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface DialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="icon-wrapper" [class.warn]="data.confirmColor === 'warn'">
          <mat-icon>{{ data.confirmColor === 'warn' ? 'warning' : 'help' }}</mat-icon>
        </div>
        <h2>{{ data.title }}</h2>
      </div>

      <div class="dialog-content">
        <p>{{ data.message }}</p>
      </div>

      <div class="dialog-actions">
        <button class="btn-glass" (click)="dialogRef.close(false)">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button
          class="btn-gradient"
          [class.warn]="data.confirmColor === 'warn'"
          (click)="dialogRef.close(true)"
        >
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      padding: 24px;
    }

    .dialog-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(0, 212, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--accent-primary);
      }

      &.warn {
        background: rgba(239, 68, 68, 0.15);

        mat-icon {
          color: var(--error);
        }
      }
    }

    .dialog-content {
      text-align: center;
      margin-bottom: 24px;

      p {
        margin: 0;
        font-size: 14px;
        color: var(--text-secondary);
        line-height: 1.6;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
      gap: 12px;

      button {
        min-width: 100px;
      }

      .btn-gradient.warn {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

        &:hover {
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
        }
      }
    }

    ::ng-deep .glass-dialog .mat-mdc-dialog-container {
      background: transparent !important;
      padding: 0 !important;
    }
  `]
})
export class ConfirmDialogComponent {
  dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  data = inject<DialogData>(MAT_DIALOG_DATA);
}
