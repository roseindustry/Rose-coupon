<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'PosHeader',

	computed: {
    // Using Vue Router's route object to determine the current page
    currentPageName() {
      // You can use either `this.$route.name` or `this.$route.path`
      // and map it to the desired page name. This is a basic example.
      const routeNameToPageName = {
        '/pos/customer-order': 'Orden nueva',
        '/pos/kitchen-order': 'Orden de Cocina',
        '/pos/menu-stock': 'Menu',
        '/pos/counter-checkout': 'Checkout',
      };

      // Returning the current page name based on the current route.
      // You might need to adjust this based on your routing setup.
      return routeNameToPageName[this.$route.path] || 'Unknown Page';
    }
  }
};
</script>

<template>
	<div class="pos-header">
		<div class="col brand">
			<div><i class="fa fa-solid fa-burger" style="font-size: 1.5rem;"></i></div>
			<span style=" color: azure;"><b>Restaurante</b></span>
		</div>

		<!-- Displaying current page name -->
		<div class="col text-center">
			<b>{{ currentPageName }}</b>
		</div>

		<div class="col nav" id="navigation">
			<div class="nav-item">
				<RouterLink to="/pos/customer-order" class="nav-link">
					<i class="fa fa-pencil nav-icon" data-bs-toggle="tooltip" data-bs-placement="bottom"
						title="Nueva orden"></i>
				</RouterLink>
			</div>
			<div class="nav-item">
				<RouterLink to="/pos/kitchen-order" class="nav-link">
					<i class="fa fa-kitchen-set nav-icon" title="Ordenes de cocina"></i>
				</RouterLink>
			</div>
			<div class="nav-item">
				<RouterLink to="/pos/menu-stock" class="nav-link">
					<i class="fa fa-book nav-icon" title="Menu"></i>
				</RouterLink>
			</div>
			<div class="nav-item">
				<RouterLink to="/pos/counter-checkout" class="nav-link">
					<i class="fa fa-cart-shopping nav-icon" title="Checkout"></i>
				</RouterLink>
			</div>
		</div>
	</div>
</template>