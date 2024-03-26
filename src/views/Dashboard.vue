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
			userName: '',
			incomeArray: [],
			weeklyOrders: [],
			weeklyIncome: 0,
			maxWeeklyOrders: 40,
			clients: [],
			renderComponent: true,
			chart: {
				height: 256,
				series: [{
					data: [
						8107, 8128, 8122, 8165, 8340, 8423, 8423, 8514, 8481, 8487,
						8506, 8626, 8668, 8602, 8607, 8512, 8496, 8600, 8881, 9340
					]
				}],
				options: this.getChartOptions()
			},
		}
	},
	computed: {
		weeklyOrdersProgress() {
			const progress = (this.weeklyOrders.length / this.maxWeeklyOrders) * 100;
			return Math.min(progress, 100);
		},
	},
	methods: {
		async initializeData() {
			await this.fetchUserData();
			await this.fetchIncomeData();
			await this.fetchClients();
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

				const incomePromises = Object.entries(incomeData).map(async ([orderId, order]) => {
					return {
						...order,
						id: orderId,
					};
				});

				this.incomeArray = await Promise.all(incomePromises);
			} else {
				// Handle the case where no ratings are found
				this.incomeArray = [];
			}
		},
		async fetchClients() {
			const userStore = useUserStore();
			let allUsers = await userStore.searchUsers();

			// Filter users to include only those with the role 'cliente'
			this.clients = allUsers.filter(user => user.role === 'cliente');
		},
		async calculateWeeklyIncome() {
			await this.fetchIncomeData();

			let chartLabels = [];
			let chartSeriesData = [];

			const startOfWeek = moment().startOf('isoWeek');
			const endOfWeek = moment().endOf('isoWeek');

			const weeklyOrders = this.incomeArray.filter(order => {
				const orderDate = moment(order.orderDate, 'DD/MM/YYYY');
				return orderDate >= startOfWeek && orderDate <= endOfWeek;
			});

			this.weeklyOrders = weeklyOrders;

			let dailyIncome = {};

			weeklyOrders.forEach(order => {
				const orderDate = moment(order.orderDate, 'DD/MM/YYYY').format('DD/MM/YYYY'); // Format date as needed
				if (!dailyIncome[orderDate]) {
					dailyIncome[orderDate] = 0;
				}
				dailyIncome[orderDate] += parseFloat(order.totalPricePaid || 0);
			});

			this.weeklyIncome = weeklyOrders.reduce((acc, order) => acc + parseFloat(order.totalPricePaid || 0), 0);

		},
		getStartOfWeek(d) {
			const date = new Date(d);
			const day = date.getDay();
			const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
			return new Date(date.setDate(diff));
		},
		getChartOptions() {
			return {
				labels: [
					'13 Nov 2021', '14 Nov 2021', '15 Nov 2021', '16 Nov 2021',
					'17 Nov 2021', '20 Nov 2021', '21 Nov 2021', '22 Nov 2021',
					'23 Nov 2021', '24 Nov 2021', '27 Nov 2021', '28 Nov 2021',
					'29 Nov 2021', '30 Nov 2021', '01 Dec 2021', '04 Dec 2021',
					'05 Dec 2021', '06 Dec 2021', '07 Dec 2021', '08 Dec 2021'
				],
				colors: [appVariable.color.primary],
				chart: { type: 'line', toolbar: { show: false } },
				annotations: {
					yaxis: [{
						y: 8200,
						borderColor: appVariable.color.indigo,
						label: {
							borderColor: appVariable.color.indigo,
							style: {
								color: appVariable.color.white,
								background: appVariable.color.indigo,
							},
							text: 'Support',
						}
					}, {
						y: 8600,
						y2: 9000,
						borderColor: appVariable.color.orange,
						fillColor: appVariable.color.orange,
						opacity: 0.1,
						label: {
							borderColor: appVariable.color.yellow,
							style: {
								fontSize: '10px',
								color: appVariable.color.gray900,
								background: appVariable.color.yellow,
							},
							text: 'Earning',
						}
					}],
					xaxis: [{
						x: new Date('23 Nov 2021').getTime(),
						strokeDashArray: 0,
						borderColor: appVariable.color.borderColor,
						label: {
							borderColor: appVariable.color.grayborderColor900,
							style: {
								color: appVariable.color.componentBg,
								background: appVariable.color.bodyColor,
							},
							text: 'Anno Test',
						}
					}, {
						x: new Date('26 Nov 2021').getTime(),
						x2: new Date('28 Nov 2021').getTime(),
						fillColor: appVariable.color.teal,
						opacity: 0.4,
						label: {
							borderColor: appVariable.color.teal,
							style: {
								fontSize: '10px',
								color: '#fff',
								background: appVariable.color.teal,
							},
							offsetY: -7,
							text: 'X-axis range',
						}
					}],
					points: [{
						x: new Date('01 Dec 2021').getTime(),
						y: 8607.55,
						marker: {
							size: 8,
							fillColor: appVariable.color.white,
							strokeColor: appVariable.color.pink,
							radius: 2
						},
						label: {
							borderColor: appVariable.color.pink,
							offsetY: 0,
							style: {
								color: appVariable.color.white,
								background: appVariable.color.pink,
							},

							text: 'Point Annotation',
						}
					}]
				},
				dataLabels: { enabled: false },
				stroke: { curve: 'straight' },
				grid: { padding: { right: 30, left: 20 } },
				xaxis: { type: 'datetime' }
			};
		}
	},
	created() {
		this.emitter.on('theme-reload', (evt) => {
			this.renderComponent = false;

			this.$nextTick(() => {
				this.chart.options = this.getChartOptions();
			});
		})
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

		await this.initializeData();
		await this.calculateWeeklyIncome();
	}
}
</script>
<template>
	<div class="container py-4">
		<h1 class="page-header mb-4">Hola, {{ this.userName }}. <small>Aquí está un resumen de tu establecimiento
				hoy.</small></h1>
		<div class="row g-4">
			<div class="col-lg-4">
				<!-- Métricas de ventas -->
				<div class="card custom-card">
					<div class="card-body">
						<h5 class="mb-3">Métricas de ventas</h5>
						<p>Grafico de ventas semanales</p>
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
								<h5 class="text-white mb-3">Ganancias de la semana</h5>
								<h3 class="text-white">${{ weeklyIncome.toFixed(2) }}</h3>
								<div><i class="fa fa-fw fa-shopping-bag icon-large text-white"></i></div>
							</div>
						</div>
					</div>

					<div class="col-md-6">
						<!-- Ordenes nuevas -->
						<div class="card custom-card overflow-hidden fs-13px bg-gradient-custom-orange text-white"
							style="min-height: 230px;">
							<div class="card-img-overlay d-flex align-items-end justify-content-end p-3">
								<img src="/assets/img/icon/order.svg" alt="" class="custom-overlay-icon">
							</div>
							<div class="card-body">
								<h5 class="text-white mb-3 fs-16px">Ordenes de esta semana</h5>
								<h3>{{ this.weeklyOrders.length }}</h3>
								<p class="goal-description">Meta de la semana: 40 ordenes</p>
								<div class="progress bg-black bg-opacity-50 mb-2 custom-progress-bar"
									style="height: 6px; position: relative;">
									<div class="progress-bar" :style="{ width: weeklyOrdersProgress + '%' }"></div>
								</div>
								<!-- <RouterLink to="/page/orders" class="text-white text-decoration-none">
									Ver ordenes
									<i class="fa fa-chevron-right ms-2"></i>
								</RouterLink> -->
							</div>
						</div>
					</div>

					<!-- Clientes registrados -->
					<div class="col-12">
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