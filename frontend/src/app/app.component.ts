import { Component, inject, OnInit, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { WishlistService } from './core/services/wishlist.service';
import { CartService } from './core/services/cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private wishlist = inject(WishlistService);
  private cartService = inject(CartService);

  constructor() {
    // Reload wishlist + cart whenever login state changes
    effect(() => {
      this.cartService.loadCart().subscribe();
      if (this.auth.isLoggedIn()) this.wishlist.load();
    });
  }

  ngOnInit(): void {
    // Always load cart (works for guests too via session)
    this.cartService.loadCart().subscribe();
    if (this.auth.isLoggedIn()) this.wishlist.load();
  }
}
