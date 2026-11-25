import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sb = inject(MatSnackBar);

  private show(message: string, panelClass: string, duration: number) {
    this.sb.open(message, '✕', {
      duration,
      panelClass: [panelClass],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  success(msg: string, duration = 3500) { this.show(msg, 'toast-success', duration); }
  error(msg: string, duration = 5000)   { this.show(msg, 'toast-error',   duration); }
  warning(msg: string, duration = 4000) { this.show(msg, 'toast-warning', duration); }
  info(msg: string, duration = 3500)    { this.show(msg, 'toast-info',    duration); }
}
