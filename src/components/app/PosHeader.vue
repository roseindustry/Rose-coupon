<script>
import { computed, defineComponent } from 'vue';
import { RouterLink } from 'vue-router';
import { useUserStore } from '@/stores/user-role';
import { useTenancyStore } from '@/stores/tenancy';

export default defineComponent({
	name: 'PosHeader',
	computed: {
		currentPageName() {
			const routeNameToPageName = {
				'/pos/customer-order': 'Orden nueva',
				'/pos/kitchen-order': 'Orden de Cocina',
				'/pos/menu-stock': 'Menú / Inventario',
				'/pos/counter-checkout': 'Checkout',
				'/': 'Dashboard',
			};
			return routeNameToPageName[this.$route.path] || 'Unknown Page';
		},
		userRole() {
			const userStore = useUserStore();
			return userStore.role;
		},
		// tenant() {
		//     const tenancyStore = useTenancyStore();
		//     return tenancyStore.tenant;
		// },
	},
	mounted() {
		const userStore = useUserStore();

		userStore.fetchUser();
	},
});
</script>

<template>
	<div class="pos-header">
		<nav class="navbar bg-body-primary fixed-top">
			<div class="container-fluid">
				<!-- Restaurant branding -->
				<div class="col-4 d-flex justify-content-start">
					<div class="brand">
						<i class="fa fa-solid fa-utensils fa-2x"></i>
					</div>
				</div>

				<!-- Display current Page Name -->
				<div class="col-4 d-flex justify-content-center">
					<b>{{ currentPageName }}</b>
				</div>

				<!-- Offcanvas Navigation menu -->
				<div class="col-4 d-flex justify-content-end">
					<button class="navbar-toggler" type="button" data-bs-toggle="offcanvas"
						data-bs-target="#offcanvasNavbar" aria-controls="offcanvasNavbar"
						aria-label="Toggle navigation">
						<span class="navbar-toggler-icon"></span>
					</button>
				</div>
				<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasNavbar"
					aria-labelledby="offcanvasNavbarLabel">
					<div class="offcanvas-header">
						<h5 class="offcanvas-title" id="offcanvasNavbarLabel">Menu de Navegacion</h5>
						<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
					</div>
					<div class="offcanvas-body">
						<ul class="navbar-nav justify-content-end flex-grow-1 pe-3">
							<!-- Only admins -->
							<li v-if="userRole === 'admin'" class="nav-item">
								<RouterLink to="/" class="nav-link" aria-current="page">
									<i class="fa-solid fa-house fa-fw me-1" title="Dashboard"></i>
									Regresar al Dashboard
								</RouterLink>
							</li>
							<li class="nav-item">
								<RouterLink to="/pos/customer-order" class="nav-link">
									<i class="fa fa-pencil nav-icon fa-fw me-1" title="Nueva orden"></i>
									Nueva orden
								</RouterLink>
							</li>
							<li class="nav-item">
								<RouterLink to="/pos/kitchen-order" class="nav-link">
									<i class="fa fa-kitchen-set nav-icon fa-fw me-1" title="Ordenes de cocina"></i>
									Ordenes de Cocina
								</RouterLink>
							</li>
							<li class="nav-item">
								<RouterLink to="/pos/menu-stock" class="nav-link">
									<i class="fa fa-book nav-icon fa-fw me-1" title="Menu"></i>
									Menu / Inventario
								</RouterLink>
							</li>
							<li class="nav-item">
								<RouterLink to="/pos/counter-checkout" class="nav-link">
									<i class="fa fa-cart-shopping nav-icon fa-fw me-1" title="Checkout"></i>
									Checkout
								</RouterLink>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</nav>
	</div>
</template>

<style scoped>
.pos-header .container-fluid {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.brand {
	margin-left: 1rem;
	/* Adjust left margin for branding */
}

.navbar-toggler {
	margin-right: 1rem;
	/* Adjust right margin for toggle button */
}
</style>