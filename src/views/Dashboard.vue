<script>
import { RouterLink } from 'vue-router';
import { useAppVariableStore } from '@/stores/app-variable';
import { useUserStore } from '@/stores/user-role';
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import apexchart from '@/components/plugins/Apexcharts.vue';
import moment from 'moment';
import { db } from '@/firebase/init';
import { ref as dbRef, get, child, query, orderByChild, equalTo } from 'firebase/database';

const appVariable = useAppVariableStore();
const userStore = useUserStore();
const tenancyStore = useTenancyStore();

export default {
	components: {
		apexchart
	},
	data() {
		return {
			selectedPeriod: 'esta semana',
			selectedColor: '#0069d9',
			userName: '',
			incomeArray: [],
			orders: 0,
			openOrders: 0,
			completedOrders: 0,
			soldOutIngredients: 0,
			income: 0,
			maxOrders: 40,
			clients: [],
			regularClients: [],
			stockItems: [],
			lowStockItems: [],
			soldOutIngredients: 0,
			renderComponent: true,
			chart: {
				options: {
					chart: {
						type: 'bar',
						zoom: {
							enabled: false
						}
					},
					xaxis: {
						categories: [],
					},
					stroke: {
						curve: 'smooth'
					},
					title: {
						text: 'Ventas',
						align: 'left'
					},
					grid: {
						borderColor: '#e7e7e7',
						row: {
							colors: ['#f3f3f3', 'transparent'],
							opacity: 0.5
						},
					},
					markers: {
						size: 1
					},
				},
				series: [
					{
						name: 'Data',
						data: []
					}
				],
				height: 290
			},
		}
	},
	computed: {
		weeklyOrdersProgress() {
			return Math.min((this.orders / this.maxOrders) * 100, 100);
		},
	},
	methods: {
		async initializeData() {
			await this.fetchUserData();
			await this.fetchClients();
			await this.fetchIngredients();
			await this.calculateIncomeAndOrders();
		},
		normalizeDate(date) {
			if (!date) return null;
			// Check if date is already in ISO format (YYYY-MM-DD)
			if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
				return date;
			}
			// Convert DD/MM/YYYY to ISO format
			if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
				return moment(date, "DD/MM/YYYY").format("YYYY-MM-DD");
			}
			return date; // Return the original date if it doesn't match expected formats
		},
		updateContent(period, color) {
			this.selectedPeriod = period; // This assignment seems redundant since it's updated below
			this.selectedColor = color;

			// Call calculateIncomeAndOrders with the updated period
			this.calculateIncomeAndOrders(period);
		},
		fetchUserData() {
			const userId = userStore.userId;
			const userRef = dbRef(db);
			get(child(userRef, `Users/${userId}`))
				.then((snapshot) => {
					if (snapshot.exists()) {
						this.userName = snapshot.val().firstName + ' ' + snapshot.val().lastName;

					} else {
						console.log("No data available");
					}
				}).catch((error) => {
					console.error(error);
				});
		},
		async fetchIncomeData() {
			const tenantId = tenancyStore.tenant.key;

			const incomeRef = query(dbRef(db, 'Orders'), orderByChild('tenant_id'), equalTo(tenantId));
			const incomeSnapshot = await get(incomeRef);

			if (incomeSnapshot.exists()) {
				const incomeData = incomeSnapshot.val();

				// Initialize an object to count orders per client
				const orderCountsPerClient = {};

				const incomePromises = Object.entries(incomeData).map(async ([orderId, order]) => {
					// Count the orders for each client
					if (order.client_id) {
						orderCountsPerClient[order.client_id] = (orderCountsPerClient[order.client_id] || 0) + 1;
					}

					return {
						...order,
						id: orderId,
					};
				});

				this.incomeArray = await Promise.all(incomePromises);
				const regularThreshold = 5;
				const regularClientIds = Object.keys(orderCountsPerClient).filter(clientId => orderCountsPerClient[clientId] > regularThreshold);
				this.regularClients = this.clients.filter(client => regularClientIds.includes(client.id));

			} else {
				this.incomeArray = [];
				this.regularClients = [];
			}
		},
		async fetchClients() {
			const userStore = useUserStore();
			let allUsers = await userStore.searchUsers();

			// Filter users to include only those with the role 'cliente'
			this.clients = allUsers.filter(user => user.role === 'cliente');
		},
		async fetchIngredients() {
			const tenantId = tenancyStore.tenant.key;

			const stockItemRef = query(dbRef(db, 'Ingredients'), orderByChild('tenant_id'), equalTo(tenantId));
			const stockItemSnapshot = await get(stockItemRef);

			if (stockItemSnapshot.exists()) {
				stockItemSnapshot.forEach((childSnapshot) => {
					const stockItemData = childSnapshot.val();
					if (stockItemData.stock <= 10) {
						this.lowStockItems.push({
							id: childSnapshot.key,
							stock: stockItemData.stock,
							name: stockItemData.name
						});
					}

					if (stockItemData.stock === 0) {
						this.soldOutIngredients++;
					}
				});
			}
		},
		async calculateIncomeAndOrders(period = this.selectedPeriod) {
			await this.fetchIncomeData();

			let chartLabels = [];
			let chartSeriesData = [];
			let income = 0;
			let orderCount = 0;
			let pendingOrdersCount = 0;
			let completedOrdersCount = 0;

			let startOfPeriod, endOfPeriod;

			if (this.selectedPeriod === 'el día de hoy') {
				startOfPeriod = moment().startOf('day');
				endOfPeriod = moment().endOf('day');
				chartLabels.push(moment().format('ddd, MMM Do'));
				chartSeriesData = [0];
			} else if (this.selectedPeriod === 'esta semana') {
				startOfPeriod = moment().startOf('isoWeek');
				endOfPeriod = moment().endOf('isoWeek');
				for (let date = moment(startOfPeriod); date.isBefore(endOfPeriod); date.add(1, 'days')) {
					chartLabels.push(date.format('MMM D'));
				}
			} else if (this.selectedPeriod === 'este mes') {
				startOfPeriod = moment().startOf('month');
				endOfPeriod = moment().endOf('month');
				let dayCount = endOfPeriod.diff(startOfPeriod, 'days');
				for (let i = 0; i <= dayCount; i++) {
					chartLabels.push(moment(startOfPeriod).add(i, 'days').format('MMM D'));
				}
			} else if (this.selectedPeriod === 'este año') {
				startOfPeriod = moment().startOf('year');
				endOfPeriod = moment().endOf('year');
				for (let i = 0; i < 12; i++) {
					chartLabels.push(moment().month(i).format('MMM'));
				}
			}

			const filteredOrders = this.incomeArray.filter(order => {
				const normalizedOrderDate = this.normalizeDate(order.orderDate);
				const orderMoment = moment(normalizedOrderDate, 'YYYY-MM-DD');
				return orderMoment.isBetween(startOfPeriod, endOfPeriod, undefined, '[]');
			});


			// Initialize chartSeriesData based on chartLabels length
			chartSeriesData = new Array(chartLabels.length).fill(0);

			filteredOrders.forEach(order => {
				const totalPricePaid = parseFloat(order.totalPricePaid || 0);
				income += totalPricePaid;
				orderCount++;

				const normalizedOrderDate = this.normalizeDate(order.orderDate);
				const orderMoment = moment(normalizedOrderDate, 'YYYY-MM-DD');
				let index;
				if (this.selectedPeriod === 'el día de hoy') {
					index = 0; // Since there's only one label for "today"
				} else {
					index = chartLabels.findIndex(label => label === orderMoment.format(this.selectedPeriod === 'este año' ? 'MMM' : 'MMM D'));
				}

				if (index !== -1) {
					chartSeriesData[index] += totalPricePaid;
				}

				if (order.status === 'Pending') {
					pendingOrdersCount++;
				} else if (order.status === 'Completed') {
					completedOrdersCount++;
				}
			});

			chartSeriesData = chartSeriesData.map(value => parseFloat(value.toFixed(2)));
			
			this.updateChartData(chartLabels, chartSeriesData);

			this.income = income;
			this.orders = orderCount;
			this.openOrders = pendingOrdersCount;
			this.completedOrders = completedOrdersCount;

		},
		updateChartData(chartLabels, chartSeriesData) {
			this.chart.options.xaxis.categories = [...chartLabels];
			this.chart.series = [{
				name: 'Ganancia',
				data: [...chartSeriesData]
			}];
		},
		getStartOfWeek(d) {
			const date = new Date(d);
			const day = date.getDay();
			const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
			return new Date(date.setDate(diff));
		},
	},
	async mounted() {
		this.subdomain = getSubdomain();

		// Automatically find or create tenant upon component mount
		await tenancyStore.findOrCreateTenant(this.subdomain);

		if (tenancyStore.tenant) {
			this.tenantName = tenancyStore.tenant.name;
		} else {
			console.error("Tenant could not be found or created");
		}

		await this.initializeData();
	}
}
</script>
<template>
	<div class="container">

		<div class="card mb-4 shadow-sm">
			<div class="card-body">
				<div class="row">
					<div class="col-12 col-md-8">
						<h1 class="h4 mb-2 mb-md-0">Hola, {{ userName }} 🎉</h1>
						<h5 class="text-muted">Aquí está un resumen de tu establecimiento
							<span :style="{ color: selectedColor }">{{ selectedPeriod }}</span>.
						</h5>
					</div>
					<div class="col-12 col-md-4 text-center text-md-end mt-3 mt-md-0">
						<button class="btn"
							:class="{ 'btn-success': selectedPeriod === 'el día de hoy', 'me-2': true, 'mb-2': true, 'mb-md-0': true }"
							@click="updateContent('el día de hoy', '#28a745')">Hoy</button>
						<button class="btn"
							:class="{ 'btn-primary': selectedPeriod === 'esta semana', 'me-2': true, 'mb-2': true, 'mb-md-0': true }"
							@click="updateContent('esta semana', '#0069d9')">Semana</button>
						<button class="btn"
							:class="{ 'btn-info': selectedPeriod === 'este mes', 'me-2': true, 'mb-2': true, 'mb-md-0': true }"
							@click="updateContent('este mes', '#17a2b8')">Mes</button>
						<button class="btn"
							:class="{ 'btn-warning': selectedPeriod === 'este año', 'me-2': true, 'mb-2': true, 'mb-md-0': true }"
							@click="updateContent('este año', '#ffc107')">Año</button>
					</div>
				</div>
			</div>
		</div>

		<div class="row g-4">
			<div class="col-lg-4">
				<!-- Métricas de ventas -->
				<div class="card custom-card">
					<div class="card-body">
						<h5 class="mb-3">Métricas de ventas</h5>
						<apexchart :height="chart.height" :options="chart.options" :series="chart.series"></apexchart>
					</div>
				</div>
			</div>

			<div class="col-lg-8">
				<div class="row g-4">
					<div class="col-md-6">
						<!-- Ganancias semanales -->
						<div class="card custom-card overflow-hidden" style="min-height: 230px;">
							<div class="card-img-overlay card-img-overlay-enhanced"
								style="background-image: url('/assets/img/bg/wave-bg.png');"></div>
							<div class="card-img-overlay d-flex align-items-end justify-content-end p-3">
								<img src="/assets/img/page/dashboard.svg" alt="" class="custom-overlay-icon">
							</div>
							<div class="card-body text-white" style="background: rgba(0,0,0,0.5);">
								<h5 class="text-white mb-3">Ganancias</h5>
								<h3 class="text-white">${{ this.income.toFixed(2) }}</h3>
								<div><i class="fa fa-fw fa-shopping-bag icon-large text-white"></i></div>
							</div>
						</div>
					</div>

					<!-- Ingredientes con poco stock -->
					<div class="col-lg-6">
						<div class="card custom-card fs-13px bg-gradient-custom-orange text-white"
							style="max-height: 230px; overflow-y: auto;">
							<div class="card-body">
								<div class="d-flex justify-content-between align-items-start">
									<h5 class="text-white mb-3 fs-16px">Ingredientes con poco stock</h5>
									<i class="fa-solid fa-boxes-stacked fa-lg text-white"></i>
								</div>
								<ul class="list-group list-group-flush text-white">
									<li v-for="item in lowStockItems" :key="item.id"
										class="list-group-item bg-transparent border-0 p-2">
										{{ item.name }} <span class="badge bg-danger rounded-pill">{{ item.stock
											}}</span>
									</li>
								</ul>
								<div class="d-flex align-items-center mt-3">
									<div class="flex-grow-1">
										<h5 class="mb-2 text-white">Agotados</h5>
										<h3>{{ soldOutIngredients }}</h3>
									</div>
									<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
										style="width: 50px; height: 50px;">
										<i class="fa-solid fa-store-slash fa-lg text-white"></i>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Clientes registrados -->
					<div class="col-6">
						<div class="card custom-card h-100">
							<div class="card-body">
								<h5 class="mb-3">Clientes registrados</h5>
								<div class="d-flex align-items-center">
									<div class="flex-grow-1">
										<h3>{{ this.clients ? this.clients.length : 0 }}</h3>
									</div>
									<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
										style="width: 50px; height: 50px;">
										<i class="fa fa-user fa-lg text-primary"></i>
									</div>
								</div>
							</div>
						</div>
					</div>
					<!-- Clientes regulares -->
					<div class="col-6">
						<div class="card custom-card h-100">
							<div class="card-body">
								<h5 class="mb-3">Clientes recurrentes</h5>
								<div class="d-flex align-items-center">
									<div class="flex-grow-1">
										<h3>{{ this.regularClients.length }}</h3>
									</div>
									<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
										style="width: 50px; height: 50px;">
										<i class="fa fa-user fa-lg text-primary"></i>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="row mt-0 g-4">

			<div class="col-lg-4" style="height: 150px;">
				<div class="card custom-card">
					<div class="card-body">
						<h5 class="mb-3">Órdenes totales</h5>
						<div class="d-flex align-items-center">
							<div class="flex-grow-1">
								<h3>{{ this.orders }}</h3>
							</div>
							<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
								style="width: 50px; height: 50px;">
								<i class="fa-solid fa-pencil fa-lg text-primary"></i>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="col-lg-4" style="height: 150px;">
				<div class="card custom-card">
					<div class="card-body">
						<h5 class="mb-3">Órdenes pendientes</h5>
						<div class="d-flex align-items-center">
							<div class="flex-grow-1">
								<h3>{{ this.openOrders }}</h3>
							</div>
							<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
								style="width: 50px; height: 50px;">
								<i class="fa-regular fa-hourglass-half fa-lg text-primary"></i>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="col-lg-4" style="height: 150px;">
				<div class="card custom-card">
					<div class="card-body">
						<h5 class="mb-3">Órdenes completadas</h5>
						<div class="d-flex align-items-center">
							<div class="flex-grow-1">
								<h3>{{ this.completedOrders }}</h3>
							</div>
							<div class="bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center"
								style="width: 50px; height: 50px;">
								<i class="fa-solid fa-circle-check fa-lg text-primary"></i>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<style scoped>
.custom-card {
	transition: transform .3s ease-in-out, box-shadow .3s ease-in-out;
}

.custom-card:hover {
	transform: translateY(-5px);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.bg-gradient-custom-orange {
	background-image: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}

.custom-progress-bar {
	background-color: #fff;
}

.icon-large {
	font-size: 2rem;
}

.text-shadow {
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.card-img-overlay-enhanced {
	background-size: cover;
	background-position: center;
}

.custom-overlay-icon {
	max-height: 70px;
	transition: transform .3s ease-in-out;
}

.custom-overlay-icon:hover {
	transform: scale(1.1);
}
</style>