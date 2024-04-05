<script>
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import { db } from '@/firebase/init';
import { ref as dbRef, get, query, orderByChild, equalTo } from 'firebase/database';
import { Modal } from 'bootstrap';
import datepicker from 'vue3-datepicker';
import 'vue-datepicker-next/index.css';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import * as XLSX from 'xlsx';
import moment from 'moment';

// Helper function defined outside the component export
function isISODateString(dateString) {
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(dateString);
}

export default {
	data() {
		return {
			currentPage: 1,
			pageSize: 10,
			orders: [],
			modalOrder: '',
			activeTab: 'allTab',
			rating: null,
			searchQuery: null,
			selectedOrderMenuItems: []
		}
	},
	watch: {
		currentPage(newVal, oldVal) {
			if (newVal < 1) {
				this.currentPage = 1;
			} else if (newVal > this.totalPages) {
				this.currentPage = this.totalPages;
			}
		}
	},
	computed: {
		filteredOrders() {
			let filtered = this.orders;
			// Filter orders by the search input
			const searchQueryString = this.searchQuery?.toString().trim();
			if (searchQueryString) {
				filtered = filtered.filter(order =>
					order.clientName.toString().includes(searchQueryString)
				);
			}

			// Tab filter
			switch (this.activeTab) {
				case 'allTab':
					return filtered;
				case 'pendingTab':
					return filtered.filter(order => order.status === 'Pending');
				case 'completedTab':
					return filtered.filter(order => order.status === 'Completed');
				default:
					return filtered;
			}
		},
		paginatedRatings() {
			let start = (this.currentPage - 1) * this.pageSize;
			let end = start + this.pageSize;
			return this.orders.slice(start, end);
		},
		totalPages() {
			return Math.ceil(this.filteredOrders.length / this.pageSize);
		},
		totalInvoice() {
			return this.selectedOrderMenuItems.reduce((total, item) => total + item.quantity * item.price, 0).toFixed(2);
		},
	},
	methods: {
		async fetchOrders(orderId = null) {
			const tenancyStore = useTenancyStore();
			const tenantId = tenancyStore.tenant.key;
			let ordersRef;

			if (orderId) {
				// Query for a single order with the provided orderId
				ordersRef = query(dbRef(db, `Orders/${orderId}`));
			} else {
				// Query for all orders
				ordersRef = query(dbRef(db, 'Orders'), orderByChild('tenant_id'), equalTo(tenantId));
			}

			const snapshot = await get(ordersRef);

			if (snapshot.exists()) {
				if (orderId) {
					// Handling a single order
					const orderData = snapshot.val();
					const clientSnapshot = await get(dbRef(db, `Users/${orderData.client_id}`));
					const clientName = clientSnapshot.exists() ? clientSnapshot.val().firstName + " " + clientSnapshot.val().lastName : 'Unknown Client';
					const menuItems = orderData.menuItems;

					// Format date
					let orderDate;
					if (isISODateString(orderData.orderDate)) {
						// ISO string format
						orderDate = moment(orderData.orderDate).format('DD/MM/YYYY');
					} else {
						// 'DD/MM/YYYY' format or other non-ISO string
						orderDate = moment(orderData.orderDate, 'DD/MM/YYYY').format('DD/MM/YYYY');
					}

					this.modalOrder = {
						id: orderId,
						...orderData,
						clientName,
						orderDate,
						menuItems,
					};
				} else {
					// Handling multiple orders, as before
					this.modalOrder = null;
					const ordersData = snapshot.val();

					const ordersPromises = Object.keys(ordersData).map(async (key) => {
						const order = ordersData[key];

						// Format date
						let orderDate;
						if (isISODateString(order.orderDate)) {
							// ISO string format
							orderDate = moment(order.orderDate).format('DD/MM/YYYY');
						} else {
							// 'DD/MM/YYYY' format or other non-ISO string
							orderDate = moment(order.orderDate, 'DD/MM/YYYY').format('DD/MM/YYYY');
						}

						// Fetch client name
						const clientSnapshot = await get(dbRef(db, `Users/${order.client_id}`));
						const clientName = clientSnapshot.exists() ? clientSnapshot.val().firstName + " " + clientSnapshot.val().lastName : 'Unknown Client';

						// Calculate total and item count
						let itemsCount = 0;
						if (order.menuItems && Array.isArray(order.menuItems)) {
							order.menuItems.forEach(item => {
								itemsCount += item.quantity;
							});
						}

						// Fetch the menuItem's details
						const menuItemDetailsPromises = order.menuItems.map(async (menuItem) => {
							const menuItemRef = dbRef(db, `MenuItems/${menuItem.id}`);
							const snapshot = await get(menuItemRef);
							if (snapshot.exists()) {
								const menuItemDetails = snapshot.val();
								return {
									...menuItem, // id, price, quantity from the order
									name: menuItemDetails.name,
								};
							}
							return menuItem; // Return original menuItem if details not found
						});

						const menuItemsWithDetails = await Promise.all(menuItemDetailsPromises);

						return {
							id: key,
							...order,
							orderDate,
							clientName,
							itemsCount,
							menuItems: menuItemsWithDetails,
						};
					});

					this.orders = await Promise.all(ordersPromises);
				}
			} else {
				this.orders = [];
			}
		},
		async openRating(orderId) {
			try {
				// Fetch the specific order to get menuItems
				await this.fetchOrders(orderId);
				const order = this.modalOrder;

				// Fetch the menuItem's details
				const menuItemDetailsPromises = order.menuItems.map(async (menuItem) => {
					const menuItemRef = dbRef(db, `MenuItems/${menuItem.id}`);
					const snapshot = await get(menuItemRef);
					if (snapshot.exists()) {
						const menuItemDetails = snapshot.val();
						return {
							...menuItem, // id, price, quantity from the order
							name: menuItemDetails.name,
							image: menuItemDetails.image,
						};
					}
					return menuItem; // Return original menuItem if details not found
				});

				const menuItemsWithDetails = await Promise.all(menuItemDetailsPromises);

				const ratingsRef = dbRef(db, 'Ratings');
				const ratingsQuery = query(ratingsRef, orderByChild('order_id'), equalTo(orderId));
				const snapshot = await get(ratingsQuery);

				if (snapshot.exists()) {
					let ratingData = null;
					let ratingDate = null;
					snapshot.forEach((childSnapshot) => {
						if (!ratingData) {
							ratingData = childSnapshot.val();

							// Format date
							if (isISODateString(ratingData.date)) {
								// ISO string format
								ratingDate = moment(ratingData.date).format('DD/MM/YYYY');
							} else {
								// 'DD/MM/YYYY' format or other non-ISO string
								ratingDate = moment(ratingData.date, 'DD/MM/YYYY').format('DD/MM/YYYY');
							}

							ratingData.date = ratingDate;
							ratingData.id = childSnapshot.key;
						}
					});

					// Include detailed menuItems in the rating data
					ratingData.menuItems = menuItemsWithDetails;

					// Update rating data property
					this.rating = ratingData;

					// Open the modal
					const modalElement = new Modal(document.getElementById('ratingModal'));
					modalElement.show();
				} else {
					Toastify({
						text: "No tiene reseñas aún.",
						duration: 3000,
						close: true,
						gravity: "top",
						position: "right",
						stopOnFocus: true,
						style: {
							background: "linear-gradient(to right, #ff5f6d, #ffc371)",
						},
					}).showToast();
				}
			} catch (error) {
				console.error("Error fetching rating: ", error);
			}
		},
		openOrderModal(order) {
			this.selectedOrderMenuItems = order.menuItems;
			console.log(this.selectedOrderMenuItems);
			new Modal(document.getElementById('orderModal')).show();
		},
		setActiveTab(tabId) {
			this.activeTab = tabId;
		},
		exportToExcel() {
			let worksheet_data = this.orders.map(order => ({
				'# de Orden': order.orderNumber,
				'Fecha': order.orderDate,
				'Cliente': order.clientName,
				'Total': order.totalPricePaid.toFixed(2),
				'Estado de pago': order.status === 'Completed' ? 'Completada' : order.status === 'Pending' ? 'Pendiente' : order.status,
				'Cantidad': order.itemsCount,
				'Tipo de pedido': order.type === 'DineIn' ? 'Local' : order.type === 'Takeaway' ? 'Para llevar' : order.type
			}));

			// Convert the data to a worksheet
			const worksheet = XLSX.utils.json_to_sheet(worksheet_data, { skipHeader: false });
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte-ordenes');

			// Export the workbook
			XLSX.writeFile(workbook, 'reporte-ordenes-de-hoy.xlsx');
		},
	},
	async mounted() {
		const tenancyStore = useTenancyStore();
		this.subdomain = getSubdomain();

		// Automatically find or create tenant upon component mount
		await tenancyStore.findOrCreateTenant(this.subdomain);

		if (tenancyStore.tenant) {
			this.tenantName = tenancyStore.tenant.name;
		} else {
			console.error("Tenant could not be found or created");
		}

		await this.fetchOrders();
	},
}
</script>
<template>
	<div class="d-flex align-items-center mb-3">
		<div class="ms-auto">
			<RouterLink to="/pos/customer-order" class="nav-link">
				<a href="#" class="btn btn-theme"><i class="fa fa-plus-circle fa-fw me-1"></i> Crear nueva orden</a>
			</RouterLink>
		</div>
	</div>

	<div class="mb-md-4 mb-3 d-md-flex">
		<div class="mt-md-0 mt-2">
			<a href="#" class="text-body text-decoration-none" @click="exportToExcel">
				<i class="fa fa-download fa-fw me-1 text-muted"></i>
				Exportar
			</a>
		</div>
	</div>

	<div class="shadow-lg p-3 mb-5 bg-body rounded">
		<ul class="nav nav-tabs nav-tabs-v2 px-4">
			<li class="nav-item me-3"><a href="#allTab" class="nav-link" data-bs-toggle="tab"
					:class="{ 'active': activeTab === 'allTab' }" @click.prevent="setActiveTab('allTab')">Todas</a></li>
			<li class="nav-item me-3"><a href="#pendingTab" class="nav-link" data-bs-toggle="tab"
					:class="{ 'active': activeTab === 'pendingTab' }" @click.prevent="setActiveTab('pendingTab')">Sin
					pagar</a>
			</li>
			<li class="nav-item me-3"><a href="#completedTab" class="nav-link" data-bs-toggle="tab"
					:class="{ 'active': activeTab === 'completedTab' }"
					@click.prevent="setActiveTab('completedTab')">Completadas</a>
			</li>
		</ul>
		<div class="tab-content p-4">
			<div class="tab-pane fade show active" id="allTab">
				<!-- BEGIN input-group -->
				<div class="input-group mb-4">
					<div class="flex-fill position-relative">
						<div class="input-group">
							<input type="text" v-model="searchQuery" class="form-control ps-35px"
								placeholder="Filter orders" />
							<div class="input-group-text position-absolute top-0 bottom-0 bg-none border-0"
								style="z-index: 1020;">
								<i class="fa fa-search opacity-5"></i>
							</div>
						</div>
					</div>
					<button class="btn btn-default dropdown-toggle rounded-0" type="button"
						data-bs-toggle="dropdown"><span class="d-none d-md-inline">Payment Status</span><span
							class="d-inline d-md-none"><i class="fa fa-credit-card"></i></span> &nbsp;</button>
					<div class="dropdown-menu">
						<a class="dropdown-item" href="#">Action</a>
						<a class="dropdown-item" href="#">Another action</a>
						<a class="dropdown-item" href="#">Something else here</a>
						<div role="separator" class="dropdown-divider"></div>
						<a class="dropdown-item" href="#">Separated link</a>
					</div>
				</div>
				<!-- END input-group -->

				<!-- BEGIN table -->
				<div class="table-responsive">
					<table class="table table-hover text-nowrap">
						<thead>
							<tr>
								<th class="border-top-0 pt-0 pb-2">Orden #</th>
								<th class="border-top-0 pt-0 pb-2">Fecha</th>
								<th class="border-top-0 pt-0 pb-2">Cliente</th>
								<th class="border-top-0 pt-0 pb-2">Total</th>
								<th class="border-top-0 pt-0 pb-2">Estado de pago</th>
								<th class="border-top-0 pt-0 pb-2">Cantidad</th>
								<th class="border-top-0 pt-0 pb-2">Tipo de pedido</th>
								<th class="border-top-0 pt-0 pb-2">Acciones</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(order, index) in filteredOrders" :key="index">
								<td class="align-middle">
									<a href="#" @click.prevent="openOrderModal(order)">#{{ order.orderNumber }}
									</a>
								</td>
								<td class="align-middle">{{ order.orderDate }}</td>
								<td class="align-middle">{{ order.clientName }}</td>
								<td>${{ order.totalPricePaid.toFixed(2) }}</td>
								<td class="py-1 align-middle">
									<span
										:class="`badge ${order.status === 'Completed' ? 'bg-teal' : 'bg-danger'} text-white-800 bg-opacity-25 px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center`">
										<i class="fa fa-circle text-white fs-9px fa-fw me-5px"></i>
										{{ order.status === 'Completed' ? 'Completada' : order.status === 'Pending' ?
				'Pendiente' : order.status }}
									</span>
								</td>
								<td class="align-middle">{{ order.itemsCount }} items</td>
								<td class="align-middle">{{ order.type === 'DineIn' ? 'Local' : order.type ===
				'Takeaway' ? 'Para llevar' :
				'' }}</td>
								<td class="align-middle">
									<a href="#" class="btn btn-theme" @click.prevent="openRating(order.id)"><i
											class="fa-solid fa-comment"></i> Ver reseña</a>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<!-- END table -->

				<nav aria-label="Page navigation">
					<ul class="pagination">
						<li class="page-item" :class="{ disabled: currentPage === 1 }">
							<a class="page-link" href="#" @click.prevent="currentPage--" aria-label="Previous">
								<span aria-hidden="true">&laquo;</span>
							</a>
						</li>
						<!-- Dynamic page links could go here -->
						<li class="page-item" :class="{ disabled: currentPage === totalPages }">
							<a class="page-link" href="#" @click.prevent="currentPage++" aria-label="Next">
								<span aria-hidden="true">&raquo;</span>
							</a>
						</li>
					</ul>
				</nav>
			</div>
			<div class="tab-pane fade" id="pendingTab">
				<!-- BEGIN input-group -->
				<div class="input-group mb-4">
					<div class="flex-fill position-relative">
						<div class="input-group">
							<input type="text" class="form-control ps-35px" placeholder="Filter orders" />
							<div class="input-group-text position-absolute top-0 bottom-0 bg-none border-0"
								style="z-index: 1020;">
								<i class="fa fa-search opacity-5"></i>
							</div>
						</div>
					</div>
					<button class="btn btn-default dropdown-toggle rounded-0" type="button"
						data-bs-toggle="dropdown"><span class="d-none d-md-inline">Payment Status</span><span
							class="d-inline d-md-none"><i class="fa fa-credit-card"></i></span> &nbsp;</button>
					<div class="dropdown-menu">
						<a class="dropdown-item" href="#">Action</a>
						<a class="dropdown-item" href="#">Another action</a>
						<a class="dropdown-item" href="#">Something else here</a>
						<div role="separator" class="dropdown-divider"></div>
						<a class="dropdown-item" href="#">Separated link</a>
					</div>
				</div>
				<!-- END input-group -->

				<!-- BEGIN table -->
				<div class="table-responsive">
					<table class="table table-hover text-nowrap">
						<thead>
							<tr>
								<th class="border-top-0 pt-0 pb-2">Orden #</th>
								<th class="border-top-0 pt-0 pb-2">Fecha</th>
								<th class="border-top-0 pt-0 pb-2">Cliente</th>
								<th class="border-top-0 pt-0 pb-2">Total</th>
								<th class="border-top-0 pt-0 pb-2">Estado de pago</th>
								<th class="border-top-0 pt-0 pb-2">Cantidad</th>
								<th class="border-top-0 pt-0 pb-2">Tipo de pedido</th>
								<th class="border-top-0 pt-0 pb-2">Acciones</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(order, index) in filteredOrders" :key="index">
								<td class="align-middle">
									<RouterLink :to="`/page/order-details/${order.id}`">#{{ order.orderNumber }}
									</RouterLink>
								</td>
								<td class="align-middle">{{ order.orderDate }}</td>
								<td class="align-middle">{{ order.clientName }}</td>
								<td>${{ order.totalPricePaid.toFixed(2) }}</td>
								<td class="py-1 align-middle">
									<span
										:class="`badge ${order.status === 'Completed' ? 'bg-teal' : 'bg-danger'} text-white-800 bg-opacity-25 px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center`">
										<i class="fa fa-circle text-white fs-9px fa-fw me-5px"></i>
										{{ order.status === 'Completed' ? 'Completada' : order.status === 'Pending' ?
				'Pendiente' : order.status }}
									</span>
								</td>
								<td class="align-middle">{{ order.itemsCount }} items</td>
								<td class="align-middle">{{ order.type === 'DineIn' ? 'Local' : order.type ===
				'Takeaway' ? 'Para llevar' :
				'' }}</td>
								<td class="align-middle">
									<a href="#" class="btn btn-theme" @click.prevent="openRating(order.id)"><i
											class="fa-solid fa-comment"></i> Ver reseña</a>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<!-- END table -->

				<nav aria-label="Page navigation">
					<ul class="pagination">
						<li class="page-item" :class="{ disabled: currentPage === 1 }">
							<a class="page-link" href="#" @click.prevent="currentPage--" aria-label="Previous">
								<span aria-hidden="true">&laquo;</span>
							</a>
						</li>
						<!-- Dynamic page links could go here -->
						<li class="page-item" :class="{ disabled: currentPage === totalPages }">
							<a class="page-link" href="#" @click.prevent="currentPage++" aria-label="Next">
								<span aria-hidden="true">&raquo;</span>
							</a>
						</li>
					</ul>
				</nav>
			</div>
			<div class="tab-pane fade" id="completedTab">
				<!-- BEGIN input-group -->
				<div class="input-group mb-4">
					<div class="flex-fill position-relative">
						<div class="input-group">
							<input type="text" class="form-control ps-35px" placeholder="Filter orders" />
							<div class="input-group-text position-absolute top-0 bottom-0 bg-none border-0"
								style="z-index: 1020;">
								<i class="fa fa-search opacity-5"></i>
							</div>
						</div>
					</div>
					<button class="btn btn-default dropdown-toggle rounded-0" type="button"
						data-bs-toggle="dropdown"><span class="d-none d-md-inline">Payment Status</span><span
							class="d-inline d-md-none"><i class="fa fa-credit-card"></i></span> &nbsp;</button>
					<div class="dropdown-menu">
						<a class="dropdown-item" href="#">Action</a>
						<a class="dropdown-item" href="#">Another action</a>
						<a class="dropdown-item" href="#">Something else here</a>
						<div role="separator" class="dropdown-divider"></div>
						<a class="dropdown-item" href="#">Separated link</a>
					</div>
				</div>
				<!-- END input-group -->

				<!-- BEGIN table -->
				<div class="table-responsive">
					<table class="table table-hover text-nowrap">
						<thead>
							<tr>
								<th class="border-top-0 pt-0 pb-2">Orden #</th>
								<th class="border-top-0 pt-0 pb-2">Fecha</th>
								<th class="border-top-0 pt-0 pb-2">Cliente</th>
								<th class="border-top-0 pt-0 pb-2">Total</th>
								<th class="border-top-0 pt-0 pb-2">Estado de pago</th>
								<th class="border-top-0 pt-0 pb-2">Cantidad</th>
								<th class="border-top-0 pt-0 pb-2">Tipo de pedido</th>
								<th class="border-top-0 pt-0 pb-2">Acciones</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(order, index) in filteredOrders" :key="index">
								<td class="align-middle">
									<RouterLink :to="`/page/order-details/${order.id}`">#{{ order.orderNumber }}
									</RouterLink>
								</td>
								<td class="align-middle">{{ order.orderDate }}</td>
								<td class="align-middle">{{ order.clientName }}</td>
								<td>${{ order.totalPricePaid.toFixed(2) }}</td>
								<td class="py-1 align-middle">
									<span
										:class="`badge ${order.status === 'Completed' ? 'bg-teal' : 'bg-danger'} text-white-800 bg-opacity-25 px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center`">
										<i class="fa fa-circle text-white fs-9px fa-fw me-5px"></i>
										{{ order.status === 'Completed' ? 'Completada' : order.status === 'Pending' ?
				'Pendiente' : order.status }}
									</span>
								</td>
								<td class="align-middle">{{ order.itemsCount }} items</td>
								<td class="align-middle">{{ order.type === 'DineIn' ? 'Local' : order.type ===
				'Takeaway' ? 'Para llevar' :
				'' }}</td>
								<td class="align-middle">
									<a href="#" class="btn btn-theme" @click.prevent="openRating(order.id)"><i
											class="fa-solid fa-comment"></i> Ver reseña</a>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<!-- END table -->

				<nav aria-label="Page navigation">
					<ul class="pagination">
						<li class="page-item" :class="{ disabled: currentPage === 1 }">
							<a class="page-link" href="#" @click.prevent="currentPage--" aria-label="Previous">
								<span aria-hidden="true">&laquo;</span>
							</a>
						</li>
						<!-- Dynamic page links could go here -->
						<li class="page-item" :class="{ disabled: currentPage === totalPages }">
							<a class="page-link" href="#" @click.prevent="currentPage++" aria-label="Next">
								<span aria-hidden="true">&raquo;</span>
							</a>
						</li>
					</ul>
				</nav>
			</div>
		</div>
	</div>

	<!-- Feedback modal -->
	<div class="modal fade" id="ratingModal" tabindex="-1" aria-labelledby="ratingModalLabel" aria-hidden="true">
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="ratingModalLabel">Feedback</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div v-if="rating" class="card shadow-lg">
						<div class="card-body">
							<h6 class="text-center mb-4">Detalles de orden</h6>
							<div class="row">
								<div v-for="menuItem in rating.menuItems" :key="menuItem.id"
									class="col-12 col-md-4 d-flex align-items-stretch mb-4">
									<div class="card text-center" style="width: 100%;">
										<img :src="menuItem.image" class="card-img-top" alt="menuItem.name"
											style="height: 160px; object-fit: cover;">
										<div class="card-body">
											<h6 class="card-title">{{ menuItem.name }}</h6>
										</div>
									</div>
								</div>
							</div>
							<div class="mt-4">
								<h6>Comentarios:</h6>
								<p>{{ rating.comment }}</p>
							</div>
							<div class="mt-3">
								<h6>Puntuación:</h6>
								<span>
									<i class="fa fa-star text-warning" v-for="n in parseInt(rating.ratingValue)"
										:key="n"></i>
								</span>
							</div>
						</div>
						<div class="card-footer text-muted text-end">
							{{ rating.date }}
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Order Modal -->
	<div class="modal fade" id="orderModal" tabindex="-1" aria-labelledby="orderModalLabel" aria-hidden="true">
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="orderModalLabel">Orden Completa</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<table class="table">
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Cantidad</th>
								<th>Precio por unidad</th>
								<th>Total</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="menuItem in selectedOrderMenuItems" :key="menuItem.id">
								<td>{{ menuItem.name }}</td>
								<td>{{ menuItem.quantity }}</td>
								<td>{{ menuItem.price.toFixed(2) }}</td>
								<td>{{ (menuItem.quantity * menuItem.price).toFixed(2) }}</td>
							</tr>
						</tbody>
						<tfoot>
							<tr>
								<th colspan="3">Total pagado en factura</th>
								<th>{{ totalInvoice }}</th>
							</tr>
						</tfoot>
					</table>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
				</div>
			</div>
		</div>
	</div>
</template>