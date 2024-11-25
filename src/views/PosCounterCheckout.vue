<script>
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import { db } from '@/firebase/init';
import { ref as dbRef, get, query, orderByChild, equalTo, update } from 'firebase/database';
import { useAppOptionStore } from '@/stores/app-option';
import PosHeader from '@/components/app/PosHeader.vue';
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import moment from 'moment';

const appOption = useAppOptionStore();

// Helper function defined outside the component export
function isISODateString(dateString) {
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(dateString);
}

export default {
	data() {
		return {
			tenantId: '',
			orders: [],
			selectedTable: null,
			mobileSidebarToggled: false,
			intervalId: null
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
		this.intervalId = setInterval(this.fetchTodaysOrders, 60000);
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
		appOption.appContentFullHeight = false;
	},
	beforeDestroy() {
		clearInterval(this.intervalId);
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

					if (orderDate.isBetween(startOfDay, endOfDay, null, '[]') && orderData.type === 'DineIn' && orderData.status !== 'Pending' && orderData.status !== 'Paid') {
						// Fetch the menuItem's details
						const menuItemDetailsPromises = orderData.menuItems.map(async (menuItem) => {
							const menuItemRef = dbRef(db, `MenuItems/${menuItem.id}`);
							const snapshot = await get(menuItemRef);
							if (snapshot.exists()) {
								const menuItemDetails = snapshot.val();
								return {
									...menuItem, // id, name, price, quantity from the order
									image: menuItemDetails.image
								};
							}
							return menuItem;
						});

						const menuItemsWithDetails = await Promise.all(menuItemDetailsPromises);

						// Fetch client name
						const clientSnapshot = await get(dbRef(db, `Users/${orderData.client_id}`));
						const clientName = clientSnapshot.exists() ? clientSnapshot.val().firstName + " " + clientSnapshot.val().lastName : 'Unknown Client';

						this.orders.push({
							...orderData,
							menuItems: menuItemsWithDetails,
							clientName,
							formattedDate: orderDate.format('DD/MM/YYYY'),
						});
					}
				}
			} else {
				console.log("No data available");
				this.orders = [];
			}
		},
		checkTime(i) {
			if (i < 10) { i = "0" + i };
			return i;
		},
		getTime() {
			var today = new Date();
			var h = today.getHours();
			var m = today.getMinutes();
			var s = today.getSeconds();
			var a;
			m = this.checkTime(m);
			s = this.checkTime(s);
			a = (h > 11) ? 'pm' : 'am';
			h = (h > 12) ? h - 12 : h;

			setTimeout(this.getTime, 500);

			return h + ":" + m + a;
		},
		getTotalPrice(menuItems) {
			var total = 0;
			for (var i = 0; i < menuItems.length; i++) {
				total += parseFloat(menuItems[i].totalPricePerItem);
			}
			return total.toFixed(2);
		},
		toggleTable(event, order) {
			event.preventDefault();
			this.toggleMobileSidebar();

			if (this.selectedTable && this.selectedTable.tableNumber === order.tableNumber) {
				// If the same table is clicked, deselect it
				this.selectedTable = null;
				this.orders.forEach(o => o.selected = false);
			} else {
				// Select the new table
				this.selectedTable = { ...order };
				this.orders.forEach(o => o.selected = (o.tableNumber === order.tableNumber));
			}
		},
		getPrice(order, type) {
			let price = 0;

			if (order && order.menuItems) {
				for (const item of order.menuItems) {
					if (type === 'subtotal') {
						price += parseFloat(item.totalPricePerItem);
					} else if (type === 'taxes') {
						price += parseFloat(item.totalPricePerItem) * 0.06;
					} else if (type === 'total') {
						price += parseFloat(item.totalPricePerItem);
						price += parseFloat(item.totalPricePerItem) * 0.06;
					}
				}
				if (type === 'tip') {
					price += parseFloat(order.tip || 0);
				}
				if (type === 'total') {
					price += parseFloat(order.tip || 0);
				}
			}

			return price.toFixed(2);
		},
		async payOrder(order) {
			const isConfirmed = confirm("¿Desea marcar esta orden como pagada?");

			if (isConfirmed) {
				try {
					const orderStatusRef = dbRef(db, `Orders/${order.id}`);

					await update(orderStatusRef, { status: "Paid" });

					// Update local state
					this.orders = this.orders.filter(o => o.id !== order.id);
					if (this.selectedTable && this.selectedTable.id === order.id) {
						this.selectedTable = null;
					}
					//Success Toast
					Toastify({
						text: "Orden actualizada con éxito!",
						duration: 3000,
						close: true,
						gravity: "top",
						position: "right",
						stopOnFocus: true,
						style: {
							background: "linear-gradient(to right, #00b09b, #96c93d)",
						},
					}).showToast();
				} catch (error) {
					console.error("Error updating order status: ", error);
					alert("Error al marcar la orden como pagada.");
				}
			} else {
				console.log("Order cancelled by user.");
			}
		},
		toggleMobileSidebar() {
			this.mobileSidebarToggled = !this.mobileSidebarToggled;

			if (!this.mobileSidebarToggled) {
				this.selectedTable = '';

				for (var i = 0; i < this.orders.length; i++) {
					this.orders[i].selected = false;
				}
			}
		}
	}
}
</script>
<template>
	<div class="pos pos-vertical pos-with-header pos-with-sidebar"
		v-bind:class="{ 'pos-mobile-sidebar-toggled': mobileSidebarToggled }">
		<div class="pos-container">
			<pos-header />
			<div class="pos-content">
				<div class="pos">
					<div class="pos-container">
						<div class="pos-content h-100">
							<perfect-scrollbar class="pos-content-container p-3 h-100">
								<div class="row gx-3">
									<template v-if="orders.length">
										<div class="col-xl-3 col-lg-4 col-md-6 pb-3" v-for="order in orders"
											:key="order.id">
											<div class="pos-checkout-table" v-bind:class="{
			'selected': order.selected,
			'available': !order.menuItems.length && order.status != 'Reserved',
			'in-use': order.menuItems.length,
			'disabled': order.status == 'Reserved'
		}">
												<a href="#" class="pos-checkout-table-container"
													v-on:click="(event) => toggleTable(event, order)">
													<div class="pos-checkout-table-header">
														<div class="status">
															<i
																:class="`bi bi-circle-fill ${order.status === 'Pending' ? 'text-warning' : order.status === 'Paid' ? 'text-success' : 'text-primary'}`">
															</i>
														</div>
														<div class="fw-bold">Mesa</div>
														<div class="fw-bold display-6">{{ order.tableNumber }}</div>
														<div class="text-inverse text-opacity-50">
															<span v-if="order.menuItems.length">{{
			order.menuItems.length }} pedidos</span>
															<!-- <span v-if="!order.menuItems.length && order.status != 'Reserved'">max {{ order.totalPax }} pax</span> -->
														</div>
													</div>
													<div class="pos-checkout-table-info small">
														<div class="row">
															<div class="col-6 d-flex justify-content-center">
																<div class="w-20px"><i
																		class="bi bi-people text-inverse text-opacity-50"></i>
																</div>
																<div class="w-60px">{{ order.clientName }}</div>
															</div>
															<div class="col-6 d-flex justify-content-center">
																<div class="w-20px"><i
																		class="bi bi-clock text-inverse text-opacity-50"></i>
																</div>
																<div class="w-60px">{{ order.totalTime ? order.totalTime
			: '-' }}</div>
															</div>
														</div>
														<div class="row">
															<div class="col-6 d-flex justify-content-center">
																<div class="w-20px">
																	<i
																		class="bi bi-receipt text-inverse text-opacity-50"></i>
																</div>
																<div class="w-60px">
																	<span v-if="order.menuItems.length">${{
			getTotalPrice(order.menuItems) }}</span>
																	<span v-else>-</span>
																</div>
															</div>
															<div class="col-6 d-flex justify-content-center">
																<div class="w-20px">
																	<i
																		class="bi bi-currency-dollar text-inverse text-opacity-50"></i>
																</div>
																<div class="w-60px">
																	{{ order.status === 'Reserved' ? '-' : order.status
			=== 'Completed' ? 'Completado' : order.status }}
																</div>
															</div>
														</div>

													</div>
												</a>
											</div>
										</div>
									</template>
									<template v-else>
										<div class="col-12 pb-3 text-center">
											<i class="fas fa-exclamation-circle fa-3x text-muted"></i>
											<div class="mt-2 h5 text-muted">No hay ordenes</div>
										</div>
									</template>
								</div>
							</perfect-scrollbar>
						</div>
						<div class="pos-sidebar" id="pos-sidebar">
							<div class="pos-sidebar-header">
								<div class="back-btn">
									<button type="button" v-on:click="toggleMobileSidebar()" class="btn">
										<i class="bi bi-chevron-left"></i>
									</button>
								</div>
								<div class="icon"><i class="fa fa-plate-wheat"></i></div>
								<div class="title">Mesa {{ (selectedTable && selectedTable.tableNumber) ?
			selectedTable.tableNumber : '-' }}
								</div>
								<div class="order">Orden: <b class="text-theme">#{{ (selectedTable &&
			selectedTable.orderNumber) ?
			selectedTable.orderNumber : '-' }}</b></div>
							</div>
							<hr class="m-0 opacity-1">
							<perfect-scrollbar class="pos-sidebar-body h-100">
								<template v-if="selectedTable && selectedTable.menuItems">
									<div class="pos-order py-3" v-for="item in selectedTable.menuItems" :key="item.id">
										<div class="pos-order-product">
											<div class="img w-40px h-40px"
												:style="{ backgroundImage: 'url(' + item.image + ')' }"></div>
											<div class="flex-1">
												<div class="row">
													<div class="col-7">
														<div class="fs-6 fw-semibold">{{ item.name }}</div>
														<div class="fs-13px">${{ item.price }}</div>
													</div>
													<div class="col-2">x{{ item.quantity }}</div>
													<div class="col-3 text-body fw-semibold text-end">${{
			(parseFloat(item.price) * item.quantity).toFixed(2) }}</div>
												</div>
											</div>
										</div>
									</div>
								</template>
								<template v-else>
									<div class="p-4">No hay datos</div>
								</template>
							</perfect-scrollbar>
							<div class="pos-sidebar-footer">
								<div class="d-flex align-items-center mb-2">
									<div>Subtotal</div>
									<div class="flex-1 text-end h6 mb-0">${{ getPrice(selectedTable, 'subtotal') }}
									</div>
								</div>
								<div class="d-flex align-items-center">
									<div>IVA (6%)</div>
									<div class="flex-1 text-end h6 mb-0">${{ getPrice(selectedTable, 'taxes') }}</div>
								</div>
								<div class="d-flex align-items-center">
									<div>Tip</div>
									<div class="flex-1 text-end h6 mb-0">${{ getPrice(selectedTable, 'tip') }}</div>
								</div>
								<hr class="opacity-1 my-10px">
								<div class="d-flex align-items-center mb-2">
									<div>Total</div>
									<div class="flex-1 text-end h4 mb-0">${{ getPrice(selectedTable, 'total') }}</div>
								</div>
								<div class="mt-3">
									<div class="d-flex">
										<a href="#"
											@click.prevent="selectedTable && selectedTable.status !== 'Paid' && payOrder(selectedTable)"
											:class="`btn btn-theme flex-fill d-flex align-items-center justify-content-center ${selectedTable && selectedTable.status === 'Paid' ? 'disabled' : ''}`">
											<span>
												<i class="fa fa-wallet fa-lg my-10px d-block"></i>
												<span class="small fw-semibold">Pagado</span>
											</span>
										</a>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
