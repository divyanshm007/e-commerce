import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private api    = inject(ApiService);
  private auth   = inject(AuthService);
  private snack  = inject(MatSnackBar);
  private router = inject(Router);

  private _ids = signal<Set<string>>(new Set());

  readonly ids = computed(() => this._ids());
  readonly count = computed(() => this._ids().size);

  isWishlisted(productId: string): boolean {
    return this._ids().has(productId);
  }

  load(): void {
    if (!this.auth.isLoggedIn()) return;
    this.api.get<any[]>('customers/wishlist').subscribe(res => {
      if (res?.data) this._ids.set(new Set(res.data.map((p: any) => p.id as string)));
    });
  }

  toggle(productId: string): void {
    if (!this.auth.isLoggedIn()) {
      this.snack.open('Please login to save to wishlist', 'Login', { duration: 3000 })
        .onAction().subscribe(() => this.router.navigate(['/auth/login']));
      return;
    }
    const cur = this._ids();
    if (cur.has(productId)) {
      this.api.delete(`customers/wishlist/${productId}`).subscribe(() => {
        const next = new Set(cur); next.delete(productId);
        this._ids.set(next);
        this.snack.open('Removed from wishlist', undefined, { duration: 2000 });
      });
    } else {
      this.api.post('customers/wishlist', { productId }).subscribe(() => {
        const next = new Set(cur); next.add(productId);
        this._ids.set(next);
        this.snack.open('Added to wishlist!', 'View', { duration: 2500 })
          .onAction().subscribe(() => this.router.navigate(['/wishlist']));
      });
    }
  }
}
