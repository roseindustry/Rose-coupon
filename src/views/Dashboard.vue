<script>
import { useAppVariableStore } from '@/stores/app-variable';
import { useUserStore } from '@/stores/user-role';
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import apexchart from '@/components/plugins/Apexcharts.vue';
import { db } from '@/firebase/init';
import { ref as dbRef, get, child, query, orderByChild, equalTo } from 'firebase/database';

const appVariable = useAppVariableStore();
const userStore = useUserStore();
const tenancyStore = useTenancyStore();

export default {
	components: {
		apexchart: apexchart
	},
	data() {
		return {
			userName: '',
			ratingsData: [],
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
		weeklyIncome() {
			return this.getThisWeeksRatings().reduce((acc, curr) => {
				return acc + parseFloat(curr.totalPaid);
			}, 0);
		},
	},
	methods: {
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
		async fetchRatingsData() {
			const tenantId = tenancyStore.tenant.key;

			const ratingsRef = query(dbRef(db, 'Ratings'), orderByChild('tenant_id'), equalTo(tenantId));
			const ratingsSnapshot = await get(ratingsRef);

			if (ratingsSnapshot.exists()) {
				const ratingsData = ratingsSnapshot.val();

				const ratingsPromises = Object.keys(ratingsData).map(async (ratingId) => {
					const rating = ratingsData[ratingId];

					let totalPaid = 0;

					// Fetch MenuItem details
					const menuItemsDetails = await Promise.all(rating.order.map(async (orderItem) => {
						totalPaid += orderItem.price * orderItem.quantity;
						const menuItemSnapshot = await get(dbRef(db, `MenuItems/${orderItem.MenuItem_id}`));
						if (menuItemSnapshot.exists()) {
							return {
								...menuItemSnapshot.val(),
								quantity: orderItem.quantity,
								price: orderItem.price
							};
						}
						return null;
					}));

					return {
						...rating,
						id: ratingId,
						totalPaid
					};
				});

				this.ratingsData = await Promise.all(ratingsPromises);
			}
		},
		async fetchClients() {
			const userStore = useUserStore();
			let allUsers = await userStore.searchUsers();

			// Filter users to include only those with the role 'cliente'
			this.clients = allUsers.filter(user => user.role === 'cliente');
		},
		getThisWeeksRatings() {
			const startOfWeek = this.getStartOfWeek(new Date());
			const endOfWeek = new Date(startOfWeek.getTime() + (6 * 24 * 60 * 60 * 1000)); // 6 days later

			return this.ratingsData.filter(rating => {
				const ratingDate = new Date(rating.date);
				return ratingDate >= startOfWeek && ratingDate <= endOfWeek;
			});
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

		this.fetchUserData();
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

		await this.fetchRatingsData();
		await this.fetchClients();
	}
}
</script>
<template>
	<h1 class="page-header mb-3">
		Hola, {{ this.userName }}. <small>Aquí esta un resumen de tu establecimiento hoy.</small>
	</h1>

	<!-- BEGIN row -->
	<div class="row">
		<!-- BEGIN col-6 -->
		<!-- Ganancias semanales -->
		<div class="col-lg-4 mb-3">
			<card class="h-100 overflow-hidden">
				<card-img-overlay class="d-block d-lg-none bg-blue rounded"></card-img-overlay>

				<card-img-overlay class="d-none d-md-block bg-blue rounded mb-n1 mx-n1"
					style="background-image: url(/assets/img/bg/wave-bg.png); background-position: right bottom; background-repeat: no-repeat; background-size: 100%;"></card-img-overlay>

				<card-img-overlay class="d-none d-md-block bottom-0 top-auto">
					<div class="row">
						<div class="col-md-8 col-xl-6"></div>
						<div class="col-md-4 col-xl-6 mb-n2">
							<img src="/assets/img/page/dashboard.svg" alt="" class="d-block ms-n3 mb-5"
								style="max-height: 310px">
						</div>
					</div>
				</card-img-overlay>

				<card-body class="position-relative text-white text-opacity-70">
					<!-- BEGIN row -->
					<div class="row">
						<!-- BEGIN col-8 -->
						<div class="col-md-8">

							<div class="d-flex">
								<div class="me-auto">
									<h5 class="text-white text-opacity-80 mb-3">Ganancias semanales</h5>
									<h3 class="text-white mt-n1 mb-1">${{ weeklyIncome.toFixed(2) }}</h3>
									<div class="mt-1">
										<i class="fa fa-fw fa-shopping-bag fs-28px text-black text-opacity-50"></i>
									</div>
								</div>
							</div>

							<!-- <hr class="bg-white bg-opacity-75 mt-3 mb-3">

							<div class="row">
								<div class="col-6 col-lg-5">
									<div class="mt-1">
										<i class="fa fa-fw fa-shopping-bag fs-28px text-black text-opacity-50"></i>
									</div>
									<div class="mt-1">
										<div>Ventas del local</div>
										<div class="fw-600 text-white">$1,629.80</div>
									</div>
								</div>
							</div> -->

						</div>
						<!-- END col-8 -->
					</div>
					<!-- END row -->
				</card-body>
			</card>
		</div>
		<!-- END col-6 -->

		<!-- BEGIN col-6 -->
		<div class="col-lg-4 mb-3">
			<!-- BEGIN card -->
			<card class="h-100">
				<!-- BEGIN card-body -->
				<card-body>
					<div class="d-flex mb-3">
						<div class="flex-grow-1">
							<h5 class="mb-1">Metricas de ventas</h5>
							<div class="fs-13px">Grafico de ventales semanales</div>
						</div>
						<a href="#" data-bs-toggle="dropdown" class="text-muted"><i class="fa fa-redo"></i></a>
					</div>
					<apexchart :height="chart.height" :options="chart.options" :series="chart.series"></apexchart>
				</card-body>
				<!-- END card-body -->
			</card>
			<!-- END card -->
		</div>
		<!-- END col-6 -->
		<!-- BEGIN col-6 -->
		<div class="col-lg-4">
			<card class="mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-orange" style="min-height: 414px;">
				<card-img-overlay class="mb-n4 me-n4 d-flex" style="bottom: 0; top: auto;">
					<img src="/assets/img/icon/order.svg" alt="" class="ms-auto d-block mb-n3"
						style="max-height: 105px">
				</card-img-overlay>

				<card-body class="position-relative">
					<h5 class="text-white text-opacity-80 mb-3 fs-16px">Ordenes nuevas</h5>
					<h3 class="text-white mt-n1">56</h3>
					<div class="progress bg-black bg-opacity-50 mb-2" style="height: 6px">
						<div class="progrss-bar progress-bar-striped bg-white" style="width: 80%"></div>
					</div>
					<div class="text-white text-opacity-80 mb-4"><i class="fa fa-caret-up"></i> 16% de incremento
						<br>comparado a la semana anterior
					</div>
					<div><a href="#" class="text-white d-flex align-items-center text-decoration-none">Ver reporte <i
								class="fa fa-chevron-right ms-2 text-white text-opacity-50"></i></a></div>
				</card-body>
			</card>
		</div>
		<!-- END col-6 -->
	</div>
	<!-- END row -->

	<!-- BEGIN row -->
	<div class="row justify-content-center">
		<!-- BEGIN col-6 -->
		<div class="col-xl-6 mb-3">
			<card class="h-100">
				<card-body>
					<div class="d-flex mb-3">
						<div class="flex-grow-1">
							<h5 class="mb-1">Clientes registrados</h5>
						</div>
						<a href="javascript:;" class="text-secondary"><i class="fa fa-redo"></i></a>
					</div>

					<div class="d-flex">
						<div class="flex-grow-1">
							<h3 class="mb-1">{{ this.clients ? this.clients.length : 0 }}</h3>
						</div>
						<div
							class="w-50px h-50px bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center">
							<i class="fa fa-user fa-lg text-primary"></i>
						</div>
					</div>
				</card-body>
			</card>
		</div>
		<!-- END col-6 -->
	</div>
	<!-- END row -->
</template>