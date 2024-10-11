import { createRouter, createWebHistory } from "vue-router";
import { db, auth } from '@/firebase/init';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		// Admin routes
		{
			path: '/',
			name: 'Dashboard',
			component: () => import('../views/Dashboard.vue'),
			meta: { roles: ['admin', 'mesero', 'promotora'] }
		},
		{
			path: '/comercios-afiliados',
			name: 'Comercios Afiliados',
			component: () => import('../views/Affiliates.vue'),
			meta: { roles: ['admin', 'cliente', 'afiliado'] }
		},
		{
			path: '/clientes',
			name: 'Clientes',
			component: () => import('../views/Clients.vue'),
			meta: { roles: ['admin'] }
		},
		{
			path: '/creditos',
			name: 'Créditos',
			component: () => import('../views/Credits.vue'),
			meta: { roles: ['admin', 'cliente', 'afiliado'] }
		},
		{
			path: '/suscripciones',
			name: 'Suscripciones',
			component: () => import('../views/Subscriptions.vue'),
			meta: { roles: ['admin'] }
		},

		// User's routes
		{
			path: '/client-portal',
			name: 'Portal de Cliente',
			component: () => import('../views/PageClientPortal.vue'),
			meta: { roles: ['cliente'] }
		},
		{
			path: '/affiliate-portal',
			name: 'Portal de Afiliado',
			component: () => import('../views/PageAffiliatePortal.vue'),
			meta: { roles: ['afiliado'] }
		},

		// Customer satisfaction survey routes
		{
			path: '/customer-survey',
			name: 'Encuesta de satisfaccion',
			component: () => import('../views/Survey.vue'),
			meta: { roles: ['admin', 'cliente', 'afiliado'] }
		},
		{
			path: '/clients-ratings',
			name: 'Reseñas del cliente',
			component: () => import('../views/PageRatings.vue'),
			meta: { roles: ['cliente', 'afiliado'] }
		},

		// Coupons routes
		{
			path: '/cupones',
			name: 'Cupones',
			component: () => import('../views/Coupons.vue'),
			meta: { roles: ['admin', 'cliente', 'afiliado'] }
		},
		{
			path: '/preferencias',
			name: 'Preferencias de cupones',
			component: () => import('../views/CouponPreferences.vue'),
			meta: { roles: ['cliente'] }
		},
		{
			path: '/request-coupons',
			name: 'Solicitar cupones',
			component: () => import('../views/RequestCoupons.vue'),
			meta: { roles: ['cliente'] }
		},

		// Events routes
		{
			path: '/events',
			name: 'Eventos',
			component: () => import('../views/Events.vue'),
			meta: { roles: ['admin', 'cliente', 'afiliado'] }
		},
		
		// Reports routes
		{
			path: '/page/reports-by-client',
			name: 'Reportes por cliente',
			component: () => import('../views/ReportsByClient.vue'),
			meta: { roles: ['admin'] }
		},
		{
			path: '/page/reports-by-rating',
			name: 'Reportes por actividad',
			component: () => import('../views/ReportsByActivity.vue'),
			meta: { roles: ['admin'] }
		},

		// Generic routes
		{
			path: '/page/coming-soon',
			name: 'Coming soon',
			component: () => import('../views/PageComingSoon.vue')
		},
		{
			path: '/page/error',
			component: () => import('../views/PageError.vue')
		},
		{
			path: '/page/login',
			name: 'Login',
			component: () => import('../views/PageLogin.vue')
		},
		{
			path: '/page/register',
			name: 'Registro',
			component: () => import('../views/PageRegister.vue')
		},
		{
			path: '/page/register-employee',
			name: 'Registro de empleado',
			component: () => import('../views/PageRegisterEmpleado.vue')
		},
		{
			path: '/profile',
			name: 'Perfil',
			component: () => import('../views/Profile.vue'),
			meta: { roles: ['admin', 'afiliado', 'cliente', 'mesero', 'promotora'] }
		},
		{
			path: '/:pathMatch(.*)*',
			component: () => import('../views/PageError.vue')
		},
		{
			path: '/landing',
			name: 'Landing Page',
			component: () => import('../views/Landing.vue')
		},

		// {
		// 	path: '/analytics',
		// 	name: 'Metricas',
		// 	component: () => import('../views/Analytics.vue'),
		// 	meta: { roles: ['admin', 'superadmin'] }
		// },

		// POS routes
		// {
		// 	path: '/pos/customer-order',
		// 	name: 'Nueva orden',
		// 	component: () => import('../views/PosCustomerOrder.vue'),
		// 	meta: { roles: ['admin', 'superadmin', 'gerente', 'mesero'] }
		// },
		// {
		// 	path: '/pos/kitchen-order',
		// 	name: 'Ordenes de cocina',
		// 	component: () => import('../views/PosKitchenOrder.vue'),
		// 	meta: { roles: ['admin', 'superadmin', 'gerente', 'mesero'] }
		// },
		// {
		// 	path: '/pos/counter-checkout',
		// 	name: 'Checkout',
		// 	component: () => import('../views/PosCounterCheckout.vue'),
		// 	meta: { roles: ['admin', 'superadmin', 'gerente', 'mesero', 'cajero'] }
		// },
		// {
		// 	path: '/pos/table-booking',
		// 	name: 'Control de mesas',
		// 	component: () => import('../views/PosTableBooking.vue'),
		// 	meta: { roles: ['admin', 'superadmin', 'gerente', 'mesero'] }
		// },
		// {
		// 	path: '/pos/menu-stock',
		// 	name: 'Menu',
		// 	component: () => import('../views/PosMenuStock.vue'),
		// 	meta: { roles: ['admin', 'superadmin', 'gerente'] }
		// },
		// {
		// 	path: '/page/orders',
		// 	name: 'Ordenes del cliente',
		// 	component: () => import('../views/PageOrder.vue'),
		// 	meta: { roles: ['admin', 'superadmin', 'gerente'] }
		// },
		// {
		// 	path: '/page/order-details',
		// 	name: 'Detalles de orden',
		// 	component: () => import('../views/PageOrderDetails.vue'),
		// 	meta: { roles: ['admin', 'superadmin', 'gerente'] }
		// },
	],
});

// Navigation guard to check user role against route meta
router.beforeEach((to, from, next) => {
	new Promise((resolve) => {
	  onAuthStateChanged(auth, (user) => {
		if (user) {
		  // User is signed in, fetch the role
		  const userRoleRef = ref(db, `Users/${user.uid}/role`);
		  get(userRoleRef).then((snapshot) => {
			if (snapshot.exists()) {
			  const userRole = snapshot.val();
			  const routeAllowedRoles = to.meta.roles as string[];
			  if (!routeAllowedRoles || routeAllowedRoles.includes(userRole)) {
				resolve(); 
			  } else {
				// User role not allowed for this route
				resolve('/page/login'); // Resolve with redirect route
			  }
			} else {
			  resolve('/page/login'); // No role assigned, redirect to login
			}
		  }).catch((error) => {
			resolve('/page/error'); // Error occurred, redirect to an error page
		  });
		} else {
		  // No user signed in
		  if (to.path === '/page/register' || to.path === '/page/register-employee' || to.path === '/page/login' || to.path === '/landing') {
			resolve(); // Allow access to landing, login or register page
		  } else {
			resolve('/landing'); // Redirect to landing page
		  }
		}
	  });
	}).then((route) => {
		next(route);
	}).catch(() => {
	  next('/page/error'); // In case of promise rejection, navigate to error page
	});
  });

export default router;
