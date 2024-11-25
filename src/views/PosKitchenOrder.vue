<script>
import { useAppOptionStore } from '@/stores/app-option';
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import { db } from '@/firebase/init';
import {
	ref as dbRef,
	query,
	orderByChild,
	equalTo,
	update,
	get
} from 'firebase/database';
import PosHeader from '@/components/app/PosHeader.vue'
import moment from 'moment';

const appOption = useAppOptionStore();

// Helper function defined outside the component export
function isISODateString(dateString) {
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(dateString);
}

export default {
	data() {
		return {
			orders: [],
			tenantId: null,
		}
	},
	components: {
		PosHeader,
	},
	async mounted() {
		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		appOption.appContentClass = 'p-0';
		appOption.appContentFullHeight = true;

		await this.initializeTenant();
		await this.fetchTodaysOrders();
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
		appOption.appContentFullHeight = false;
	},
	methods: {
		async initializeTenant() {
			const tenancyStore = useTenancyStore();
			this.subdomain = getSubdomain();
			await tenancyStore.findOrCreateTenant(this.subdomain);
			if (tenancyStore.tenant) {
				this.tenantId = tenancyStore.tenant.key;
			} else {
				console.error("Tenant could not be found or created");
			}
		},
		async fetchTodaysOrders() {
			const ordersRef = query(dbRef(db, 'Orders'), orderByChild('tenant_id'), equalTo(this.tenantId));
			const ordersSnapshot = await get(ordersRef);

			if (ordersSnapshot.exists()) {
				this.orders = [];

				const startOfDay = moment().startOf('day');
				const endOfDay = moment().endOf('day');

				const orders = [];
				ordersSnapshot.forEach(childSnapshot => {
					orders.push({ id: childSnapshot.key, ...childSnapshot.val() });
				});

				for (const orderData of orders) {
					// Determine if the date is in ISO format
					let orderDate;
					if (isISODateString(orderData.orderDate)) {
						// ISO string format
						orderDate = moment(orderData.orderDate);
					} else {
						// 'DD/MM/YYYY' format
						orderDate = moment(orderData.orderDate, 'DD/MM/YYYY');
					}

					if (orderDate.isBetween(startOfDay, endOfDay, null, '[]')) {
						// Fetch client name
						const clientSnapshot = await get(dbRef(db, `Users/${orderData.client_id}`));
						const clientName = clientSnapshot.exists() ? clientSnapshot.val().firstName + " " + clientSnapshot.val().lastName : 'Unknown Client';

						// Fetch the menuItem's details
						const menuItemDetailsPromises = orderData.menuItems.map(async (menuItem) => {
							const menuItemRef = dbRef(db, `MenuItems/${menuItem.id}`);
							const snapshot = await get(menuItemRef);
							if (snapshot.exists()) {
								const menuItemDetails = snapshot.val();
								return {
									...menuItem, // id, price, quantity from the order
									name: menuItemDetails.name,
									image: menuItemDetails.image
								};
							}
							return menuItem;
						});

						const menuItemsWithDetails = await Promise.all(menuItemDetailsPromises);

						this.orders.push({
							...orderData,
							clientName,
							menuItems: menuItemsWithDetails,
							formattedDate: orderDate.format('DD/MM/YYYY'),
							id: orderData.id
						});
					}
				}
			} else {
				console.log("No data available");
				this.orders = [];
			}
		},
		async markOrderAsCompleted(orderId) {
			const isConfirmed = confirm("¿Desea marcar esta orden como completada?");

			if (isConfirmed) {
				try {
					const orderStatusRef = dbRef(db, `Orders/${orderId}`);

					await update(orderStatusRef, { status: "Completed" });

					const orderToUpdate = this.orders.find(order => order.id === orderId);
					if (orderToUpdate) {
						orderToUpdate.status = "Completed";
					}

					// Notify the user or perform other actions as needed
					console.log(`Order ${orderId} marked as completed.`);
				} catch (error) {
					console.error("Error updating order status: ", error);
					// Handle errors, such as by displaying a notification to the user
				}
			} else {
				// The user clicked 'Cancel', so you might want to do something here or simply do nothing
				console.log("Order completion cancelled by user.");
			}
		},
	}
}
</script>
<template>
	<div class="pos pos-vertical pos-with-header" id="pos">
		<div class="pos-container">
			<pos-header />
			<div class="pos-content">
				<perfect-scrollbar class="pos-content-container h-100 p-0">
					<!-- Iterate over orders array -->
					<div v-if="orders.length > 0" v-for="order in orders" :key="order.id" class="pos-task"
						:class="{ 'order-completed': order.status === 'Completed' }">
						<div class="pos-task-info">
							<div class="h3 mb-1">Mesa {{ order.tableNumber }}</div>
							<div class="mb-3">Orden No: #{{ order.orderNumber }}</div>
							<div class="mb-2">
								<span class="badge fs-14px"
									:class="{ 'bg-theme text-theme-color': order.status !== 'Completed', 'bg-gray-500 text-white': order.status === 'Completed' }">
									{{ order.type === 'DineIn' ? 'Local' : order.type === 'Takeaway' ? 'Para llevar' :
						'' }}
								</span>
							</div>
							<div class="mb-3">Cliente: {{ order.clientName }}</div>
						</div>
						<div class="pos-task-body">
							<div class="row gx-4">
								<div class="col-lg-3 pb-4" v-for="item in order.menuItems" :key="item.id">
									<div class="pos-task-product"
										:class="{ 'completed': item.status === 'Completed' || item.status === 'Cancelled' }">
										<div class="pos-task-product-img">
											<div class="cover" :style="{ backgroundImage: 'url(' + item.image + ')' }">
											</div>
											<div class="caption" v-if="item.status === 'Completed'">
												<div>Completado</div>
											</div>
											<div class="caption" v-if="item.status === 'Cancelled'">
												<div>Cancelado</div>
											</div>
										</div>
										<div class="pos-task-product-info">
											<div class="flex-1">
												<div class="d-flex mb-2">
													<div class="fs-5 mb-0 fw-semibold flex-1">{{ item.name }}</div>
													<div class="fs-5 mb-0 fw-semibold">x{{ item.quantity }}</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<!-- Order Completion Button -->
							<div class="d-flex justify-content-center justify-content-md-start">
								<div class="text-center" style="flex: 0 0 50%; max-width: 50%;">
									<button class="btn btn-success" @click="markOrderAsCompleted(order.id)"
										:disabled="order.status === 'Completed'">
										{{ order.status === 'Completed' ? 'Orden Completada' : 'Marcar Orden Como Completada' }}
									</button>
								</div>
							</div>
						</div>
					</div>
					<div class="px-3 py-5 text-center" v-else>
						No hay ordenes el dia de hoy.
					</div>
				</perfect-scrollbar>
			</div>
		</div>
	</div>
</template>
<style scoped>
.order-completed {
	background-color: #95c193;
	/* Light grey background for completed orders */
}
</style>