<script>
import { useAppVariableStore } from '@/stores/app-variable';
import apexchart from '@/components/plugins/Apexcharts.vue';

const appVariable = useAppVariableStore();

export default {
	components: {
		apexchart: apexchart
	},
	data() {
		return {
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
	methods: {
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
	}
}
</script>
<template>
	<h1 class="page-header mb-3">
		Hi, User. <small>here's what's happening with your store today.</small>
	</h1>
	
	<!-- BEGIN row -->
	<div class="row">
		<!-- BEGIN col-6 -->
		<!-- Ganancias semanales -->
		<div class="col-xl-6 mb-3">
			<card class="h-100 overflow-hidden">
				<card-img-overlay class="d-block d-lg-none bg-blue rounded"></card-img-overlay>
				
				<card-img-overlay class="d-none d-md-block bg-blue rounded mb-n1 mx-n1" style="background-image: url(/assets/img/bg/wave-bg.png); background-position: right bottom; background-repeat: no-repeat; background-size: 100%;"></card-img-overlay>
				
				<card-img-overlay class="d-none d-md-block bottom-0 top-auto">
					<div class="row">
						<div class="col-md-8 col-xl-6"></div>
						<div class="col-md-4 col-xl-6 mb-n2">
							<img src="/assets/img/page/dashboard.svg" alt="" class="d-block ms-n3 mb-5" style="max-height: 310px">
						</div>
					</div>
				</card-img-overlay>
				
				<card-body class="position-relative text-white text-opacity-70">
					<!-- BEGIN row -->
					<div class="row">
						<!-- BEGIN col-8 -->
						<div class="col-md-8">
							<!-- stat-top -->
							<div class="d-flex">
								<div class="me-auto">
									<h5 class="text-white text-opacity-80 mb-3">Weekly Earning</h5>
									<h3 class="text-white mt-n1 mb-1">$2,999.80</h3>
									<p class="mb-1 text-white text-opacity-60 text-truncate">
										<i class="fa fa-caret-up"></i> <b>32%</b> increase compare to last week
									</p>
								</div>
							</div>
							
							<hr class="bg-white bg-opacity-75 mt-3 mb-3">
							
							<!-- stat-bottom -->
							<div class="row">
								<div class="col-6 col-lg-5">
									<div class="mt-1">
										<i class="fa fa-fw fa-shopping-bag fs-28px text-black text-opacity-50"></i>
									</div>
									<div class="mt-1">
										<div>Store Sales</div>
										<div class="fw-600 text-white">$1,629.80</div>
									</div>
								</div>
								<div class="col-6 col-lg-5">
									<div class="mt-1">
										<i class="fa fa-fw fa-retweet fs-28px text-black text-opacity-50"></i>
									</div>
									<div class="mt-1">
										<div>Referral Sales</div>
										<div class="fw-600 text-white">$700.00</div>
									</div>
								</div>
							</div>
							
						</div>
						<!-- END col-8 -->
						
						<!-- BEGIN col-4 -->
						<div class="col-md-4 d-none d-md-block" style="min-height: 380px;"></div>
						<!-- END col-4 -->
					</div>
					<!-- END row -->
				</card-body>
			</card>
		</div>
		<!-- END col-6 -->
		
		<!-- BEGIN col-6 -->
		<div class="col-xl-6">
					<card class="mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-orange" style="min-height: 414px;">
						<card-img-overlay class="mb-n4 me-n4 d-flex" style="bottom: 0; top: auto;">
							<img src="/assets/img/icon/order.svg" alt="" class="ms-auto d-block mb-n3" style="max-height: 105px">
						</card-img-overlay>
						
						<card-body class="position-relative">
							<h5 class="text-white text-opacity-80 mb-3 fs-16px">New Orders</h5>
							<h3 class="text-white mt-n1">56</h3>
							<div class="progress bg-black bg-opacity-50 mb-2" style="height: 6px">
								<div class="progrss-bar progress-bar-striped bg-white" style="width: 80%"></div>
							</div>
							<div class="text-white text-opacity-80 mb-4"><i class="fa fa-caret-up"></i> 16% increase <br>compare to last week</div>
							<div><a href="#" class="text-white d-flex align-items-center text-decoration-none">View report <i class="fa fa-chevron-right ms-2 text-white text-opacity-50"></i></a></div>
						</card-body>
					</card>
		</div>
		<!-- END col-6 -->
	</div>
	<!-- END row -->
	
	<!-- BEGIN row -->
	<div class="row">
		<!-- BEGIN col-6 -->
		<div class="col-xl-6 mb-3">
					<card class="h-100">
						<card-body>
							<div class="d-flex mb-3">
								<div class="flex-grow-1">
									<h5 class="mb-1">Total Users</h5>
									<div>Store user account registration</div>
								</div>
								<a href="javascript:;" class="text-secondary"><i class="fa fa-redo"></i></a>
							</div>
							
							<div class="d-flex">
								<div class="flex-grow-1">
									<h3 class="mb-1">184,593</h3>
									<div class="text-success fw-600 fs-13px">
										<i class="fa fa-caret-up"></i> +3.59%
									</div>
								</div>
								<div class="w-50px h-50px bg-primary bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center">
									<i class="fa fa-user fa-lg text-primary"></i>
								</div>
							</div>
						</card-body>
					</card>
		</div>
		<!-- END col-6 -->
		
		<!-- BEGIN col-6 -->
		<div class="col-xl-6 mb-3">
			<!-- BEGIN card -->
			<card class="h-100">
				<!-- BEGIN card-body -->
				<card-body>
					<div class="d-flex mb-3">
						<div class="flex-grow-1">
							<h5 class="mb-1">Sales Analytics</h5>
							<div class="fs-13px">Weekly sales performance chart</div>
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
	</div>
	<!-- END row -->
</template>