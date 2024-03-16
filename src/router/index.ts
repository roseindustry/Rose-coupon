import { createRouter, createWebHistory } from "vue-router";
import { db } from '@/firebase/init';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'Dashboard',
			component: () => import('../views/Dashboard.vue'),
			meta: { roles: ['admin', 'superadmin'] }
		},
		{
			path: '/analytics',
			name: 'Metricas',
			component: () => import('../views/Analytics.vue'),
			meta: { roles: ['admin', 'superadmin'] }
		},
		{
			path: '/pos/customer-order',
			name: 'Nueva orden',
			component: () => import('../views/PosCustomerOrder.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/pos/kitchen-order',
			name: 'Ordenes de cocina',
			component: () => import('../views/PosKitchenOrder.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/pos/counter-checkout',
			name: 'Checkout',
			component: () => import('../views/PosCounterCheckout.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/pos/table-booking',
			name: 'Control de mesas',
			component: () => import('../views/PosTableBooking.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/pos/menu-stock',
			name: 'Menu',
			component: () => import('../views/PosMenuStock.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/page/client-portal',
			name: 'Portal de Cliente',
			component: () => import('../views/PageClientPortal.vue'),
			meta: { roles: ['cliente'] }
		},
		{
			path: '/page/customer-survey',
			name: 'Encuesta de satisfaccion',
			component: () => import('../views/Survey.vue'),
			meta: { roles: ['cliente'] }
		},
		{
			path: '/page/clients-ratings',
			name: 'Reseñas del cliente',
			component: () => import('../views/PageRatings.vue'),
			meta: { roles: ['cliente'] }
		},
		{
			path: '/page/orders',
			name: 'Ordenes del cliente',
			component: () => import('../views/PageOrder.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/page/order-details',
			name: 'Detalles de orden',
			component: () => import('../views/PageOrderDetails.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/page/reports-by-client',
			name: 'Reportes por cliente',
			component: () => import('../views/ReportsByClient.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/page/reports-by-rating',
			name: 'Reportes por actividad',
			component: () => import('../views/ReportsByActivity.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
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
			path: '/control-panel',
			name: 'Panel de control',
			component: () => import('../views/ControlPanel.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente'] }
		},
		{
			path: '/profile',
			name: 'Perfil',
			component: () => import('../views/Profile.vue'),
			meta: { roles: ['admin', 'superadmin', 'gerente', 'cliente'] }
		},
		{
			path: '/:pathMatch(.*)*',
			component: () => import('../views/PageError.vue')
		}
	],
});

// Navigation guard to check user role against route meta
router.beforeEach((to, from, next) => {
	new Promise((resolve, reject) => {
	  const auth = getAuth();
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
		  if (to.path === '/page/register' || to.path === '/page/login') {
			resolve(); // Allow access to login or register page
		  } else {
			resolve('/page/login'); // Redirect to login page
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
