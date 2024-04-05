<script>
import { useAppVariableStore } from '@/stores/app-variable';
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import apexchart from '@/components/plugins/Apexcharts.vue';
import datepicker from 'vue3-datepicker';
import moment from 'moment';
import { db } from '@/firebase/init';
import { ref as dbRef, get, query, orderByChild, equalTo } from 'firebase/database';

const appVariable = useAppVariableStore();
const tenancyStore = useTenancyStore();

export default {
	components: {
		apexchart,
		datepicker
	},
	data() {
		return {
			renderComponent: true,
			picked: new Date(),
			nextDay: moment().format('D MMM'),
			selectedDay: moment().format('YYYY-MM-DD'),
			prevDay: moment().add(-1, 'd').format('YYYY-MM-DD'),
			orders: [],
			ratings: [],
			currentDayOrders: 0,
			dailyIncome: 0,
			dailySurveys: 0,
			averageOrderValue: 0,
			recurrentPercentage: 0,
			bestSellingProducts: [],
			chart1Options: {
				chart: {
					type: 'line',
					toolbar: {
						show: false
					}
				},
				xaxis: {
					categories: [],
				},
			},
			chart1Series: [
				{
					name: 'Ventas del dia',
					data: []
				}
			],
			chart2Options: {
				chart: {
					type: 'bar',
					toolbar: {
						show: false
					}
				},
				plotOptions: {
					bar: {
						horizontal: true,
					}
				},
				xaxis: {
					categories: ['Clientes'],
				},
			},
			chart2Series: [],
		}
	},
	watch: {
		selectedDay(newVal, oldVal) {
			if (newVal !== oldVal) {
				console.log("selectedDay changed from", oldVal, "to", newVal);
				this.fetchOrders();
			}
		}
	},
	methods: {
		async fetchOrders() {
			const tenantId = tenancyStore.tenant.key;

			const orderRef = query(dbRef(db, 'Orders'), orderByChild('tenant_id'), equalTo(tenantId));
			const orderSnapshot = await get(orderRef);

			// Reset values here to ensure they're set to 0 if there are no orders
			this.orders = [];
			this.currentDayOrders = 0;
			this.dailyIncome = 0;
			this.bestSellingProducts = [];

			if (orderSnapshot.exists()) {
				const orderData = orderSnapshot.val();

				// Convert orderData to an array of orders with additional details fetched for menuItems
				const ordersPromise = Object.entries(orderData).map(async ([orderId, order]) => {
					// Skip orders that don't match the selected day early
					let orderDate = order.orderDate;
					let format = orderDate.includes('/') ? 'DD/MM/YYYY' : 'YYYY-MM-DD';
					let parsedDate = moment(orderDate, format);
					if (parsedDate.format('YYYY-MM-DD') !== this.selectedDay) return null;

					// Fetch details for each menuItem within the order if it exists
					const menuItemsWithDetails = order.menuItems ? await Promise.all(order.menuItems.map(async (menuItem) => {
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
						return menuItem;
					})) : [];

					return {
						...order,
						id: orderId,
						menuItems: menuItemsWithDetails,
					};
				});

				// Wait for all orders' promises to resolve and filter out any nulls from orders that were skipped
				this.orders = (await Promise.all(ordersPromise)).filter(order => order !== null);
				this.currentDayOrders = this.orders.length;
			} else {
				this.orders = [];
				console.log("No orders found for the day:", this.selectedDay);
			}
			this.updateChartsData();
			this.updateRecurrentClientChart();
			this.updateBestSellingProducts();
		},
		async fetchRatings() {
			const tenantId = tenancyStore.tenant.key;

			const ratingsRef = query(dbRef(db, 'Ratings'), orderByChild('tenant_id'), equalTo(tenantId));
			const ratingsSnapshot = await get(ratingsRef);

			// Reset values here to ensure they're set to 0 if there are no orders
			this.dailySurveys = 0;

			if (ratingsSnapshot.exists()) {
				const ratingData = ratingsSnapshot.val();

				const ratingsPromise = Object.entries(ratingData).map(async ([ratingId, rating]) => {
					let ratingDate = rating.date;
					let format = ratingDate.includes('/') ? 'DD/MM/YYYY' : 'YYYY-MM-DD';
					let parsedDate = moment(ratingDate, format);
					if (parsedDate.format('YYYY-MM-DD') !== this.selectedDay) return null;

					return {
						...rating,
						id: ratingId,
					};
				});

				this.ratings = (await Promise.all(ratingsPromise)).filter(rating => rating !== null);
				
				this.dailySurveys = this.ratings.length;
				
			} else {
				this.ratings = [];
				console.log("No ratings found for the day:", this.selectedDay);
			}
		},
		updateRecurrentClientChart() {
			const clientOccurrences = this.orders.reduce((acc, order) => {
				acc[order.client_id] = (acc[order.client_id] || 0) + 1;
				return acc;
			}, {});

			const totalCount = this.orders.length;
			const recurrentCount = Object.values(clientOccurrences).filter(count => count > 1).length;
			const newClientCount = totalCount - recurrentCount;

			const recurrentPercentage = totalCount > 0 ? (recurrentCount / totalCount) * 100 : 0;
			const newClientPercentage = totalCount > 0 ? 100 - recurrentPercentage : 0;
			this.recurrentPercentage = recurrentPercentage;

			// Assuming you want to show both percentages in a single bar chart
			this.chart2Series = [{
				name: 'Primera vez',
				data: [newClientPercentage]
			}, {
				name: 'Recurrente',
				data: [recurrentPercentage]
			}];
		},
		updateBestSellingProducts() {
			this.bestSellingProducts = this.calculateBestSellingProducts();
		},
		calculateBestSellingProducts() {
			if (!this.orders || this.orders.length === 0) {
				console.log("No orders available to determine best-selling products.");
				return [];
			}

			const productSales = {};

			this.orders.forEach(order => {
				if (Array.isArray(order.menuItems) && order.menuItems.length > 0) {

					order.menuItems.forEach(item => {
						if (productSales[item.name]) {
							productSales[item.name].count += item.quantity;
						} else {
							productSales[item.name] = { count: item.quantity };
						}
					});
				} else {
					console.log("Order has no menu items:", order);
				}
			});

			const sortedProducts = Object.entries(productSales).map(([name, data]) => ({
				name,
				count: data.count,
			})).sort((a, b) => b.count - a.count);

			// Display the top 5 products
			return sortedProducts.slice(0, 5);
		},
		updateChartsData() {
			const totalRevenue = this.orders.reduce((acc, order) => acc + parseFloat(order.totalPricePaid), 0);
			const averageOrderValue = this.orders.length > 0 ? totalRevenue / this.orders.length : 0;
			this.averageOrderValue = parseFloat(averageOrderValue.toFixed(2));
			this.dailyIncome = totalRevenue;

			// Update chart data
			this.chart1Series = [{
				name: 'Precio de orden promedio',
				data: [averageOrderValue]
			}];
			this.chart1Options.xaxis.categories = [this.selectedDay];
		},
		getPrevDay() {
			return this.prevDay;
		},
		getSelectedDay() {
			return this.selectedDay;
		},
		updateDate(newDate) {
			this.prevDay = moment(newDate).add(-1, 'd').format('YYYY-MM-DD');
			this.selectedDay = moment(newDate).format('YYYY-MM-DD');
			// Trigger data fetch and update on date change
			this.fetchOrders();
			this.fetchRatings();
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
		await this.fetchRatings();
	},
}
</script>
<template>
	<!-- BEGIN page-header -->
	<h1 class="page-header">
		Métricas <small>estadísticas, resumen & desempeño.</small>
	</h1>
	<!-- END page-header -->

	<!-- BEGIN daterangepicker -->
	<div class="d-flex align-items-center mb-3">
		<div class="btn btn-default d-flex align-items-center">
			<label for="datepicker" class="">
				<i class="fa fa-fw fa-calendar"></i>
			</label>
			<datepicker id="datepicker" class="bg-none text-reset shadow-none border-0 ps-2 w-100px p-0 outline-none"
				@update:modelValue="updateDate" v-model="picked" />
			<label for="datepicker" class="">
				<i class="fa fa-fw fa-caret-down me-n1"></i>
			</label>
		</div>
	</div>
	<!-- END daterangepicker -->

	<!-- BEGIN row -->
	<div class="row" v-if="renderComponent">

		<!-- BEGIN col-4 -->
		<div class="col-lg-6 col-xl-4 mb-4">
			<!-- BEGIN card -->
			<card class="custom-card">
				<card-body>
					<!-- title -->
					<div class="d-flex align-items-center mb-2">
						<div class="flex-fill fw-bold fs-16px">VALOR DE ORDEN PROMEDIO</div>
					</div>

					<!-- stats -->
					<div class="d-flex align-items-center h3 mb-3">
						<div>${{ this.averageOrderValue }}</div>
						<!-- <small class="fw-400 ms-auto text-danger">-3.2%</small> -->
					</div>
					<!-- chart -->
					<div>
						<div class="chart mb-2" style="height: 190px">
							<apexchart type="line" :options="chart1Options" :series="chart1Series" height="190">
							</apexchart>
						</div>
						<div class="d-flex align-items-center justify-content-center fw-bold text-muted">
							<i class="fa fa-square text-theme me-2"></i>
							<span class="fs-12px">{{ getSelectedDay() }}</span>
						</div>
					</div>
				</card-body>
			</card>
			<!-- END card -->
		</div>
		<!-- END col-4 -->

		<!-- BEGIN col-4 -->
		<div class="col-lg-6 col-xl-4 mb-4">
			<!-- BEGIN card -->
			<card class="custom-card">
				<card-body>
					<!-- title -->
					<div class="d-flex align-items-center mb-2">
						<div class="flex-fill fs-16px fw-bold">PORCENTAJE DE RECURRENCIA DE CLIENTES</div>
					</div>

					<!-- stats -->
					<div class="d-flex align-items-center h3 mb-3">
						<div>{{ this.recurrentPercentage }}%</div>
					</div>

					<!-- chart -->
					<div>
						<div class="chart mb-2" style="height: 205px">
							<apexchart type="line" :options="chart2Options" :series="chart2Series" height="190">
							</apexchart>
						</div>
					</div>
				</card-body>
			</card>
			<!-- END card -->
		</div>
		<!-- END col-4 -->

		<!-- BEGIN col-4 -->
		<div class="col-lg-6 col-xl-4 mb-4">
			<!-- BEGIN card -->
			<card class="custom-card" style="height: 325px;">
				<card-body>
					<!-- title -->
					<div class="d-flex align-items-center mb-3">
						<div class="flex-fill fw-bold fs-16px">TOP 5 PRODUCTOS MAS VENDIDO DEL MENÚ</div>
					</div>

					<!-- list -->
					<div v-if="this.bestSellingProducts.length > 0">
						<!-- list header -->
						<div class="row mb-2">
							<div class="col-6"><strong>Producto</strong></div>
							<div class="col-3 text-end"><strong>Cantidad</strong></div>
						</div>

						<div v-for="(product, index) in this.bestSellingProducts" :key="index" class="row mb-2">
							<div class="col-6">{{ product.name }}</div>
							<div class="col-3 text-end">{{ product.count }}</div>
						</div>
					</div>
					<div v-else>
						<p class="text-center">No se encontraron datos.</p>
					</div>
				</card-body>
			</card>
			<!-- END card -->
		</div>
		<!-- END col-4 -->

		<!-- BEGIN col-4 -->
		<div class="col-lg-6 col-xl-4 mb-4">
			<div class="card custom-card">
				<div class="card-body">
					<h5 class="mb-3">ORDENES TOTALES</h5>
					<div class="d-flex align-items-center">
						<div class="flex-grow-1">
							<h3>{{ this.currentDayOrders }}</h3>
						</div>
						<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
							style="width: 50px; height: 50px;">
							<i class="fa-solid fa-store-slash fa-lg text-primary"></i>
						</div>
					</div>
				</div>
			</div>
		</div>
		<!-- END col-4 -->

		<!-- BEGIN col-4 -->
		<div class="col-lg-6 col-xl-4 mb-4">
			<div class="card custom-card">
				<div class="card-body">
					<div class="d-flex align-items-center mb-2">
						<div class="flex-fill fw-bold fs-16px">GANANCIAS DEL DÍA</div>
						<a href="#" class="text-decoration-none text-muted">Ver reporte</a>
					</div>
					<div class="d-flex align-items-center">
						<div class="flex-grow-1">
							<h3>${{ this.dailyIncome }}</h3>
						</div>
						<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
							style="width: 50px; height: 50px;">
							<i class="fa-solid fa-store-slash fa-lg text-primary"></i>
						</div>
					</div>
				</div>
			</div>
		</div>
		<!-- END col-4 -->

		<!-- BEGIN col-4 -->
		<div class="col-lg-6 col-xl-4 mb-4">
			<div class="card custom-card">
				<div class="card-body">
					<div class="d-flex align-items-center mb-2">
						<div class="flex-fill fw-bold fs-16px">ENCUESTAS DEL DÍA</div>
						<a href="#" class="text-decoration-none text-muted">Ver reporte</a>
					</div>
					<div class="d-flex align-items-center">
						<div class="flex-grow-1">
							<h3>{{ this.dailySurveys }}</h3>
						</div>
						<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
							style="width: 50px; height: 50px;">
							<i class="fa-solid fa-store-slash fa-lg text-primary"></i>
						</div>
					</div>
				</div>
			</div>
		</div>
		<!-- END col-4 -->

	</div>
	<!-- END row -->
</template>
<style scoped>
.custom-card {
	transition: transform .3s ease-in-out, box-shadow .3s ease-in-out;
}

.custom-card:hover {
	transform: translateY(-5px);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>