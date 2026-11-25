import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Customer website
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
      { path: 'products', loadComponent: () => import('./features/products/product-list/product-list.component').then(m => m.ProductListComponent) },
      { path: 'products/category/:categorySlug', loadComponent: () => import('./features/products/category-page/category-page.component').then(m => m.CategoryPageComponent) },
      { path: 'products/:slug', loadComponent: () => import('./features/products/product-detail/product-detail.component').then(m => m.ProductDetailComponent) },
      { path: 'cart', loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent) },
      { path: 'checkout', loadComponent: () => import('./features/checkout/checkout.component').then(m => m.CheckoutComponent) },
      { path: 'order-confirmation/:orderNumber', loadComponent: () => import('./features/checkout/order-confirmation.component').then(m => m.OrderConfirmationComponent) },
      { path: 'compare', loadComponent: () => import('./features/compare/compare.component').then(m => m.CompareComponent) },
      { path: 'dosha-quiz', loadComponent: () => import('./features/dosha-quiz/dosha-quiz.component').then(m => m.DoshaQuizComponent), data: { slug: 'dosha-quiz' } },
      { path: 'quiz/:slug', loadComponent: () => import('./features/dosha-quiz/dosha-quiz.component').then(m => m.DoshaQuizComponent) },
      { path: 'consultation', loadComponent: () => import('./features/consultation/consultation.component').then(m => m.ConsultationComponent) },
      { path: 'wishlist', loadComponent: () => import('./features/wishlist/wishlist.component').then(m => m.WishlistComponent), canActivate: [authGuard] },
      { path: 'track-order', loadComponent: () => import('./features/track-order/track-order.component').then(m => m.TrackOrderComponent) },
      { path: 'contact', loadComponent: () => import('./features/static-pages/contact/contact.component').then(m => m.ContactComponent) },
      { path: 'about', loadComponent: () => import('./features/static-pages/about/about.component').then(m => m.AboutComponent) },
      { path: 'gallery', loadComponent: () => import('./features/static-pages/gallery/gallery.component').then(m => m.GalleryComponent) },
      { path: 'activities', loadComponent: () => import('./features/static-pages/activities/activities.component').then(m => m.ActivitiesComponent) },
      { path: 'blogs', loadComponent: () => import('./features/static-pages/blogs/blogs.component').then(m => m.BlogsComponent) },
      { path: 'blogs/:slug', loadComponent: () => import('./features/static-pages/blogs/blog-detail/blog-detail.component').then(m => m.BlogDetailComponent) },
      { path: 'testimonials', loadComponent: () => import('./features/static-pages/testimonials/testimonials.component').then(m => m.TestimonialsComponent) },
      { path: 'faqs', loadComponent: () => import('./features/static-pages/faqs/faqs.component').then(m => m.FaqsComponent) },
      { path: 'page/:slug', loadComponent: () => import('./features/static-pages/page/page.component').then(m => m.PageComponent) },
      // Trust-building pages
      { path: 'why-choose-us', loadComponent: () => import('./features/trust/trust-pages.component').then(m => m.TrustPagesComponent), data: { page: 'why-choose-us' } },
      { path: 'quality-assurance', loadComponent: () => import('./features/trust/trust-pages.component').then(m => m.TrustPagesComponent), data: { page: 'quality-assurance' } },
      { path: 'manufacturing', loadComponent: () => import('./features/trust/trust-pages.component').then(m => m.TrustPagesComponent), data: { page: 'manufacturing' } },
      { path: 'certifications', loadComponent: () => import('./features/trust/trust-pages.component').then(m => m.TrustPagesComponent), data: { page: 'certifications' } },
      { path: 'lab-testing', loadComponent: () => import('./features/trust/trust-pages.component').then(m => m.TrustPagesComponent), data: { page: 'lab-testing' } },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () => import('./features/account/account-layout.component').then(m => m.AccountLayoutComponent),
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', loadComponent: () => import('./features/account/dashboard/account-dashboard.component').then(m => m.AccountDashboardComponent) },
          { path: 'profile', loadComponent: () => import('./features/account/profile/profile.component').then(m => m.ProfileComponent) },
          { path: 'orders', loadComponent: () => import('./features/account/orders/orders.component').then(m => m.OrdersComponent) },
          { path: 'orders/:id', loadComponent: () => import('./features/account/order-detail/order-detail.component').then(m => m.OrderDetailComponent) },
          { path: 'addresses', loadComponent: () => import('./features/account/addresses/addresses.component').then(m => m.AddressesComponent) },
          { path: 'change-password', loadComponent: () => import('./features/account/change-password/change-password.component').then(m => m.ChangePasswordComponent) },
          { path: 'returns', loadComponent: () => import('./features/account/returns/returns.component').then(m => m.ReturnsComponent) },
          { path: 'referral', loadComponent: () => import('./features/account/referral/referral.component').then(m => m.ReferralComponent) },
        ]
      }
    ]
  },

  // Auth
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      // the reset link flow was replaced by the emailed-code flow on /auth/forgot-password
      { path: 'reset-password', redirectTo: 'forgot-password', pathMatch: 'full' },
    ]
  },

  // Admin login (public — no guards)
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
  },
  {
    path: 'admin/forgot-password',
    loadComponent: () => import('./admin/admin-forgot-password/admin-forgot-password.component').then(m => m.AdminForgotPasswordComponent)
  },

  // Admin panel
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'products', loadComponent: () => import('./admin/products/product-list/admin-product-list.component').then(m => m.AdminProductListComponent) },
      { path: 'products/new', loadComponent: () => import('./admin/products/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent) },
      { path: 'products/:id/edit', loadComponent: () => import('./admin/products/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent) },
      { path: 'categories', loadComponent: () => import('./admin/categories/admin-categories.component').then(m => m.AdminCategoriesComponent) },
      { path: 'orders', loadComponent: () => import('./admin/orders/admin-order-list.component').then(m => m.AdminOrderListComponent) },
      { path: 'orders/:id', loadComponent: () => import('./admin/orders/admin-order-detail.component').then(m => m.AdminOrderDetailComponent) },
      { path: 'cancel-requests', loadComponent: () => import('./admin/cancel-requests/admin-cancel-requests.component').then(m => m.AdminCancelRequestsComponent) },
      { path: 'fulfilment', loadComponent: () => import('./admin/fulfilment/admin-fulfilment.component').then(m => m.AdminFulfilmentComponent) },
      { path: 'customers', loadComponent: () => import('./admin/customers/admin-customers.component').then(m => m.AdminCustomersComponent) },
      { path: 'reviews', loadComponent: () => import('./admin/reviews/admin-reviews.component').then(m => m.AdminReviewsComponent) },
      { path: 'coupons', loadComponent: () => import('./admin/coupons/admin-coupons.component').then(m => m.AdminCouponsComponent) },
      { path: 'payments', loadComponent: () => import('./admin/payments/admin-payments.component').then(m => m.AdminPaymentsComponent) },
      { path: 'banners', loadComponent: () => import('./admin/banners/admin-banners.component').then(m => m.AdminBannersComponent) },
      { path: 'faqs', loadComponent: () => import('./admin/faqs/admin-faqs.component').then(m => m.AdminFaqsComponent) },
      { path: 'blogs', loadComponent: () => import('./admin/blogs/admin-blogs.component').then(m => m.AdminBlogsComponent) },
      { path: 'quizzes', loadComponent: () => import('./admin/quizzes/admin-quizzes.component').then(m => m.AdminQuizzesComponent) },
      { path: 'gallery', loadComponent: () => import('./admin/gallery/admin-gallery.component').then(m => m.AdminGalleryComponent) },
      { path: 'testimonials', loadComponent: () => import('./admin/testimonials/admin-testimonials.component').then(m => m.AdminTestimonialsComponent) },
      { path: 'newsletter', loadComponent: () => import('./admin/newsletter/admin-newsletter.component').then(m => m.AdminNewsletterComponent) },
      { path: 'settings', loadComponent: () => import('./admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent) },
      { path: 'reports', loadComponent: () => import('./admin/reports/admin-reports.component').then(m => m.AdminReportsComponent) },
      { path: 'pages', loadComponent: () => import('./admin/pages/admin-pages.component').then(m => m.AdminPagesComponent) },
      { path: 'about-page', loadComponent: () => import('./admin/about/admin-about-page.component').then(m => m.AdminAboutPageComponent) },
      { path: 'consultations', loadComponent: () => import('./admin/consultation/admin-consultation.component').then(m => m.AdminConsultationComponent) },
      { path: 'returns', loadComponent: () => import('./admin/returns/admin-returns.component').then(m => m.AdminReturnsComponent) },
      { path: 'referrals', loadComponent: () => import('./admin/referrals/admin-referrals.component').then(m => m.AdminReferralsComponent) },
      { path: 'trust-pages', loadComponent: () => import('./admin/trust-pages/admin-trust-pages.component').then(m => m.AdminTrustPagesComponent) },
      { path: 'carts', loadComponent: () => import('./admin/carts/admin-carts.component').then(m => m.AdminCartsComponent) },
      { path: 'contact-messages', loadComponent: () => import('./admin/contact/admin-contact-messages.component').then(m => m.AdminContactMessagesComponent) },
    ]
  },

  { path: '**', redirectTo: '' }
];
