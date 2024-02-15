<script>
import 'lity';
import 'lity/dist/lity.min.css';
import highlightjs from '@/components/plugins/Highlightjs.vue';
import chartjs from '@/components/plugins/Chartjs.vue';
import navscrollto from '@/components/app/NavScrollTo.vue';
import axios from 'axios';
import Chart from 'chart.js/auto';
import { useAppVariableStore } from '@/stores/app-variable';
import { ScrollSpy } from 'bootstrap';

const appVariable = useAppVariableStore();

export default {
	data () {
		return {
			code1: '',
			code2: '',
			code3: '',
			code4: '',
			code5: '',
			code6: '',
			code7: '',
			code8: '',
			code9: '',
			code10: '',
			code11: '',
			chart: {
				type: 'bar',
				data: {
					labels: ['S','M','T','W','T','F','S'],
					datasets: [{
						label: 'Total Visitors',
						data: [37,31,36,34,43,31,50],
						backgroundColor: appVariable.color.theme,
						borderColor: 'transparent'
					}, {
						label: 'Returning Visitors',
						data: [27,21,16,14,23,11,30],
						backgroundColor: 'rgba('+ appVariable.color.bodyColorRgb +', .5)',
						borderColor: 'transparent'
					}]
				}
			}
		}
	},
	components: {
		highlightjs: highlightjs,
		chartjs: chartjs,
		navScrollTo: navscrollto
	},
	mounted() {
		axios.get('/assets/data/widgets/widget-code-1.json').then((response) => {
			this.code1 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-2.json').then((response) => {
			this.code2 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-3.json').then((response) => {
			this.code3 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-4.json').then((response) => {
			this.code4 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-5.json').then((response) => {
			this.code5 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-6.json').then((response) => {
			this.code6 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-7.json').then((response) => {
			this.code7 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-8.json').then((response) => {
			this.code8 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-9.json').then((response) => {
			this.code9 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-10.json').then((response) => {
			this.code10 = response.data;
		});
		axios.get('/assets/data/widgets/widget-code-11.json').then((response) => {
			this.code11 = response.data;
		});
		
		new ScrollSpy(document.body, {
			target: '#sidebar-bootstrap',
			offset: 200
		})
	}
}
</script>
<template>
	<!-- BEGIN container -->
	<div class="container">
		<!-- BEGIN row -->
		<div class="row justify-content-center">
			<!-- BEGIN col-10 -->
			<div class="col-xl-10">
				<!-- BEGIN row -->
				<div class="row">
					<!-- BEGIN col-9 -->
					<div class="col-xl-9">
						<h1 class="page-header">
							Widgets <small>page header description goes here...</small>
						</h1>
						<hr class="mb-4" />
						
						<!-- BEGIN #cardWidget -->
						<div id="cardWidget" class="mb-5">
							<h4>Card widget</h4>
							<p>Card widget is created by using existing Bootstrap <code>.card</code> component with <code>.card-img</code>, <code>.card-img-overlay</code> and <code>.d-flex</code> utilities.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-8">
											<card class="border-0 overflow-hidden rounded" data-bs-theme="dark">
												<div class="h-250px d-flex align-items-center">
													<img src="/assets/img/gallery/widget-cover-1.jpg" alt="" class="card-img">
												</div>
												<card-img-overlay class="d-flex flex-column bg-black bg-opacity-60 rounded">
													<div class="flex-fill">
														<div class="d-flex align-items-center">
															<h6 class="m-0">Youtube</h6>
															<div class="dropdown ms-auto">
																<a href="#" class="text-white" data-bs-toggle="dropdown"><i class="fa fa-ellipsis-h"></i></a>
																<div class="dropdown-menu dropdown-menu-end">
																	<a href="//www.youtube.com/watch?v=_AS5nu4u1ss" class="dropdown-item">View</a>
																</div>
															</div>
														</div>
													</div>
													<div>
														<a href="//www.youtube.com/watch?v=_AS5nu4u1ss" data-lity class="text-white text-decoration-none d-flex align-items-center">
															<div class="bg-theme bg-gradient text-theme-color w-50px h-50px rounded-3 d-flex align-items-center justify-content-center">
																<i class="fa fa-play fa-lg"></i>
															</div>
															<div class="ms-3 flex-1">
																<div class="fw-semibold">New Videos - Behind The Forest Tours</div>
																<div class="fs-13px text-white text-opacity-50">
																	<i class="far fa-eye"></i> 892 views 
																	<i class="far fa-clock ms-3"></i> 39min ago
																</div>
															</div>
														</a>
													</div>
												</card-img-overlay>
											</card>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code1" />
							</card>
						</div>
						<!-- END #cardWidget -->
						
						<!-- BEGIN #listWidget -->
						<div id="listWidget" class="mb-5">
							<h4>List widget</h4>
							<p>List widget is created by using existing Bootstrap <code>.list-group</code> component with <code>.d-flex</code> and hud utilities css classes.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-6">
											<div class="text-body mb-2 fw-bold">With icon</div>
											<div class="list-group mb-3">
												<div class="list-group-item d-flex align-items-center">
													<div class="w-40px h-40px d-flex align-items-center justify-content-center bg-gradient-indigo-blue text-white rounded-2 ms-n1">
														<i class="fab fa-apple fa-lg"></i>
													</div>
													<div class="flex-fill px-3 py-1">
														<div class="fw-semibold">Apps Store</div>
														<div class="small text-body text-opacity-50">102 new download</div>
													</div>
													<div class="dropdown">
														<a href="#" data-bs-toggle="dropdown" class="text-body text-opacity-50"><i class="fa fa-ellipsis-h"></i></a>
														<div class="dropdown-menu dropdown-menu-end">
															<a href="#" class="dropdown-item">View</a>
															<a href="#" class="dropdown-item">Analytics</a>
															<a href="#" class="dropdown-item">Report</a>
														</div>
													</div>
												</div>
												<div class="list-group-item d-flex align-items-center">
													<div class="w-40px h-40px d-flex align-items-center justify-content-center bg-gradient-red-orange text-white rounded ms-n1">
														<i class="fa fa-book fa-lg"></i>
													</div>
													<div class="flex-fill px-3 py-1">
														<div class="fw-semibold">iBooks App</div>
														<div class="small text-body text-opacity-50">32 new download</div>
													</div>
													<div class="dropdown">
														<a href="#" data-bs-toggle="dropdown" class="text-body text-opacity-50"><i class="fa fa-ellipsis-h"></i></a>
														<div class="dropdown-menu dropdown-menu-end">
															<a href="#" class="dropdown-item">View</a>
															<a href="#" class="dropdown-item">Analytics</a>
															<a href="#" class="dropdown-item">Report</a>
														</div>
													</div>
												</div>
											</div>
											<div class="text-body mb-2 fw-bold">With image</div>
											<div class="list-group mb-3">
												<a href="#" class="list-group-item list-group-item-action d-flex align-items-center text-body">
													<div class="w-40px h-40px d-flex align-items-center justify-content-center ms-n1">
														<img src="/assets/img/user/user.jpg" alt="" class="ms-100 mh-100 rounded-circle">
													</div>
													<div class="flex-fill ps-3">
														<div class="fw-semibold d-flex align-items-center">
															Isaiah Hughes <span class="fa fa-circle text-success fs-6px ms-2"></span>
														</div>
													</div>
												</a>
												<a href="#" class="list-group-item list-group-item-action d-flex align-items-center text-body">
													<div class="w-40px h-40px d-flex align-items-center justify-content-center ms-n1">
														<img src="/assets/img/user/user-2.jpg" alt="" class="ms-100 mh-100 rounded-circle">
													</div>
													<div class="flex-fill ps-3">
														<div class="fw-semibold d-flex align-items-center">
															Ryan Turner <span class="fa fa-circle text-body text-opacity-50 fs-6px ms-2"></span>
														</div>
													</div>
												</a>
											</div>
										</div>
										<div class="col-xl-6">
											<div class="text-body mb-2 fw-bold">With settings</div>
											<div class="list-group">
												<div class="list-group-item d-flex align-items-center">
													<div class="flex-fill py-1">
														<div class="fw-semibold">Server auto backup</div>
														<div class="small text-body text-opacity-50">last backup since yesterday</div>
													</div>
													<div>
														<div class="form-check me-n1">
															<input type="checkbox" class="form-check-input" id="customSwitch1" checked>
															<label class="form-check-label" for="customSwitch1"></label>
														</div>
													</div>
												</div>
												<div class="list-group-item d-flex align-items-center">
													<div class="flex-fill py-1">
														<div class="fw-semibold">Analytics enabled</div>
														<div class="small text-body text-opacity-50">3,392 data collected</div>
													</div>
													<div>
														<div class="form-switch me-n1">
															<input type="checkbox" class="form-check-input" id="customSwitch2" >
															<label class="form-check-label" for="customSwitch2"></label>
														</div>
													</div>
												</div>
												<a href="#" class="list-group-item list-group-item-action d-flex align-items-center">
													<div class="flex-fill py-1">
														<div class="fw-semibold">Link with arrow</div>
													</div>
													<div>
														<i class="fa fa-chevron-right"></i>
													</div>
												</a>
												<a href="#" class="list-group-item list-group-item-action d-flex align-items-center">
													<div class="flex-fill py-1">
														<div class="fw-semibold">Link with arrow</div>
													</div>
													<div>
														<i class="fa fa-chevron-right"></i>
													</div>
												</a>
											</div>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code2" />
							</card>
						</div>
						<!-- END #listWidget -->
						
						<!-- BEGIN #statsWidget -->
						<div id="statsWidget" class="mb-5">
							<h4>Stats widget</h4>
							<p>States widget is created by using Bootstrap <code>.card</code> component with <code>.d-flex</code> and <code>background-color</code> utilities.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-8">
											<card>
												<card-body>
													<div class="mb-2 fw-semibold d-flex align-items-center">
														<div class="flex-fill">Total Orders</div>
														<div>
															<a href="#" data-bs-toggle="dropdown" class="text-body"><i class="bi bi-three-dots-vertical"></i></a>
															<div class="dropdown-menu dropdown-menu-end" data-bs-theme="light">
																<a href="#" class="dropdown-item">View full report</a>
																<a href="#" class="dropdown-item">Reload</a>
																<a href="#" class="dropdown-item">Export Data</a>
															</div>
														</div>
													</div>
													<div class="row mb-1">
														<div class="col-lg-12 position-relative">
															<h1 class="mb-0 d-flex align-items-center text-theme">
																302
																<span class="text-body fs-10px badge bg-body rounded-pill pe-2 ps-1 py-6px d-flex align-items-center ms-3">
																	<i class="fa fa-exclamation-circle fa-fw fa-lg me-1 text-theme"></i> 
																	3 pending orders
																</span>
															</h1>
															<div class="fs-13px mt-1"><span class="badge bg-theme bg-opacity-15 text-theme py-5px me-1">+12%</span> compare to last week</div>
															<i class="fab fa-google-wallet display-3 lh-1 mt-n2 text-body text-opacity-20 me-3 position-absolute end-0 top-0"></i>
														</div>
													</div>
													<div class="mt-3 fs-11px">
														<div class="text-body text-opacity-50">last updated on</div>
														<div class="fw-600 text-body text-opacity-50">Feb 3, 4:09:57 AM UTC</div>
													</div>
												</card-body>
											</card>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code3" />
							</card>
						</div>
						<!-- END #statsWidget -->
						
						<!-- BEGIN #chartWidget -->
						<div id="chartWidget" class="mb-5">
							<h4>Chart widget</h4>
							<p>Chart widget created by using Bootstrap <code>.card</code> and <code>.list-group</code> component combined with Chart.js plugins.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-8">
											<card>
												<card-body class="text-body text-center">
													<div class="fs-16px fw-bold">Weekly Web Analytics</div>
													<div class="fs-13px mb-3 text-body text-opacity-50">Week 11 May - 17 May</div>
													<chartjs :type="chart.type" :data="chart.data" :options="chart.options"></chartjs>
												</card-body>
												<hr class="m-0">
												<div class="list-group list-group-flush">
													<div class="list-group-item border-top-0 rounded-top-0 d-flex align-items-center p-3">
														<div class="w-40px h-40px bg-theme bg-opacity-15 text-theme d-flex align-items-center justify-content-center">
															<i class="fa fa-user fa-lg"></i>
														</div>
														<div class="flex-fill px-3">
															<div class="fw-bold">Total Visitors</div>
															<div class="small text-body text-opacity-50">11 May - 17 May</div>
														</div>
														<div>
															<h2 class="mb-0">1.3m</h2>
														</div>
													</div>
												</div>
											</card>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code4" />
							</card>
						</div>
						<!-- END #chartWidget -->
						
						<!-- BEGIN #userListWidget -->
						<div id="userListWidget" class="mb-5">
							<h4>User list widget</h4>
							<p>User list widget used to display people who participate in a project or a group.</p>
							<card>
								<card-body>
									<div class="widget-user-list">
										<div class="widget-user-list-item"><a href="#" class="widget-user-list-link"><img src="/assets/img/user/user-1.jpg" alt="" /></a></div>
										<div class="widget-user-list-item"><a href="#" class="widget-user-list-link"><img src="/assets/img/user/user-2.jpg" alt="" /></a></div>
										<div class="widget-user-list-item"><a href="#" class="widget-user-list-link"><img src="/assets/img/user/user-3.jpg" alt="" /></a></div>
										<div class="widget-user-list-item"><a href="#" class="widget-user-list-link"><img src="/assets/img/user/user-4.jpg" alt="" /></a></div>
										<div class="widget-user-list-item"><a href="#" class="widget-user-list-link"><img src="/assets/img/user/user-5.jpg" alt="" /></a></div>
										<div class="widget-user-list-item"><a href="#" class="widget-user-list-link"><img src="/assets/img/user/user-6.jpg" alt="" /></a></div>
										<div class="widget-user-list-item"><a href="#" class="widget-user-list-link"><img src="/assets/img/user/user-7.jpg" alt="" /></a></div>
										<div class="widget-user-list-item"><a href="#" class="widget-user-list-link bg-gray-200 text-gray-500 fs-12px fw-bold">+26</a></div>
									</div>
								</card-body>
								<highlightjs :code="code5" />
							</card>
						</div>
						<!-- END #userListWidget -->
						
						<!-- BEGIN #mapWidget -->
						<div id="mapWidget" class="mb-5">
							<h4>Map widget</h4>
							<p>Map widget created with Bootstrap <code>.card</code> and <code>.list-group</code> component twitted with helper css classes.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-8">
											<card>
												<card-header class="fw-600 bg-none border-0">Google Map</card-header>
												<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d960.5886473867613!2d-122.41743634015282!3d37.776451983493104!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085809c6c8f4459%3A0xb10ed6d9b5050fa5!2sTwitter+HQ!5e0!3m2!1sen!2s!4v1495935122933" style="border:0; width: 100%; height: 10rem;" allowfullscreen></iframe>
												<div class="list-group list-group-flush">
													<div class="list-group-item d-flex">
														<div class="w-30px h-40px d-flex align-items-center justify-content-center">
															<i class="fa fa-car fa-2x text-gray-300"></i>
														</div>
														<div class="flex-fill ps-3 pe-3">
															<div class="fw-600">via Road I-88E</div>
															<div class="fs-12px">Fastest route, the usual traffic</div>
														</div>
														<div class="text-nowrap">
															<div class="text-success fw-600">3h 54min</div>
															<div class="fs-12px">393km</div>
														</div>
													</div>
												</div>
											</card>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code6" />
							</card>
						</div>
						<!-- END #mapWidget -->
						
						<!-- BEGIN #chatWidget -->
						<div id="chatWidget" class="mb-5">
							<h4>Chat widget</h4>
							<p>Chat widget created by using Bootstrap <code>.card</code> component with custom created bubble chat ui.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-8">
											<card>
												<card-header class="bg-none fw-bold d-flex align-items-center">Discussion group <span class="ms-auto"><card-expand-toggler /></span></card-header>
												<perfect-scrollbar class="h-200px">
													<card-body class="bg-light">
														<div class="widget-chat">
															<div class="widget-chat-item">
																<div class="widget-chat-media"><img src="/assets/img/user/user-2.jpg" alt="" /></div>
																<div class="widget-chat-content">
																	<div class="widget-chat-name">Roberto Lambert</div>
																	<div class="widget-chat-message last">
																		Hey, I'm testing out group messaging.
																	</div>
																</div>
															</div>
															<div class="widget-chat-item reply">
																<div class="widget-chat-content">
																	<div class="widget-chat-message last">
																		Cool
																	</div>
																	<div class="widget-chat-status"><b>Read</b> 16:26</div>
																</div>
															</div>
															<div class="widget-chat-date">Today 14:21</div>
															<div class="widget-chat-item">
																<div class="widget-chat-media"><img src="/assets/img/user/user-3.jpg" alt="" /></div>
																<div class="widget-chat-content">
																	<div class="widget-chat-name">Rick Powell</div>
																	<div class="widget-chat-message last">
																		Awesome! What's new?
																	</div>
																</div>
															</div>
															<div class="widget-chat-item">
																<div class="widget-chat-media"><img src="/assets/img/user/user-2.jpg" alt="" /></div>
																<div class="widget-chat-content">
																	<div class="widget-chat-name">Roberto Lambert</div>
																	<div class="widget-chat-message">
																		Not much, It's got a new look, contact pics show up in group messaging, some other small stuff.
																	</div>
																	<div class="widget-chat-message last">
																		How's crusty old iOS 6 treating you?
																	</div>
																</div>
															</div>
															<div class="widget-chat-item reply">
																<div class="widget-chat-content">
																	<div class="widget-chat-message last">
																		Sucks
																	</div>
																	<div class="widget-chat-status"><b>Read</b> 16:30</div>
																</div>
															</div>
														</div>
													</card-body>
												</perfect-scrollbar>
												<card-footer class="bg-none">
													<div class="input-group">
														<input type="text" class="form-control" placeholder="Search for...">
														<button class="btn btn-outline-default" type="button"><i class="fa fa-paper-plane text-muted"></i></button>
													</div>
												</card-footer>
											</card>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code7" />
							</card>
						</div>
						<!-- END #chatWidget -->
						
						<!-- BEGIN #profileWidget -->
						<div id="profileWidget" class="mb-5">
							<h4>Profile widget</h4>
							<p>Profile widget created by using Bootstrap <code>.card</code> component with Bootstrap grid.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-8">
											<card class="border-0 overflow-hidden rounded-0 rounded-top" style="height: 165px">
												<img src="/assets/img/gallery/widget-cover-1.jpg" class="card-img rounded-0" alt="" />
												<card-img-overlay class="text-white text-center bg-gray-800 bg-opacity-50">
													<div class="mb-2">
														<img src="/assets/img/user/user-5.jpg" alt="" width="80" class="rounded-circle" />
													</div>
													<div>
														<div class="fw-600">Maurice Patterson</div>
														<div class="fs-12px">Never give up</div>
													</div>
												</card-img-overlay>
											</card>
											<card class="border-top-0 rounded-0 rounded-bottom">
												<card-body class="py-2 px-3">
													<div class="row text-center">
														<div class="col-4">
															<div class="fw-600">415</div>
															<div class="fs-12px">posts</div>
														</div>
														<div class="col-4">
															<div class="fw-600">140k</div>
															<div class="fs-12px">followers</div>
														</div>
														<div class="col-4">
															<div class="fw-600">697</div>
															<div class="fs-12px">following</div>
														</div>
													</div>
												</card-body>
											</card>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code8" />
							</card>
						</div>
						<!-- END #profileWidget -->
						
						<!-- BEGIN #productWidget -->
						<div id="productWidget" class="mb-5">
							<h4>Product widget</h4>
							<p>Product widget created by using Bootstrap <code>.list-group</code> component with <code>.d-flex</code> utilities.</p>
							<card>
								<card-body>
									<div class="list-group">
										<a href="#" class="list-group-item list-group-item-action d-flex align-items-center text-body">
											<div class="w-60px h-60px d-flex align-items-center justify-content-center bg-body rounded p-2">
												<img src="/assets/img/product/product-1.png" alt="" class="mw-100 mh-100">
											</div>
											<div class="flex-fill px-3 py-1">
												<div class="fw-semibold">iPhone 14 Pro Max</div>
												<div class="small text-body text-opacity-50">Apple</div>
												<div class="d-flex align-items-center small">
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="far fa-star text-body text-opacity-25 fa-fw me-1"></i>
													(128)
												</div>
											</div>
											<div>
												<span class="badge text-theme bg-theme bg-opacity-15 fs-12px py-7px px-2 fw-semibold rounded-1 d-block">
													$999.00
												</span>
											</div>
										</a>
										<a href="#" class="list-group-item list-group-item-action d-flex align-items-center text-body">
											<div class="w-60px h-60px d-flex align-items-center justify-content-center bg-body rounded p-2">
												<img src="/assets/img/product/product-2.png" alt="" class="mw-100 mh-100">
											</div>
											<div class="flex-fill px-3 py-1">
												<div class="fw-semibold">One Plus 10 Pro</div>
												<div class="small text-body text-opacity-50">OnePlus</div>
												<div class="d-flex align-items-center small">
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="far fa-star text-body text-opacity-25 fa-fw me-1"></i>
													(93)
												</div>
											</div>
											<div>
												<span class="badge text-theme bg-theme bg-opacity-15 fs-12px py-7px px-2 fw-semibold rounded-1 d-block">
													$599.00
												</span>
											</div>
										</a>
										<a href="#" class="list-group-item list-group-item-action d-flex align-items-center text-body">
											<div class="w-60px h-60px d-flex align-items-center justify-content-center bg-body rounded p-2">
												<img src="/assets/img/product/product-3.png" alt="" class="mw-100 mh-100">
											</div>
											<div class="flex-fill px-3 py-1">
												<div class="fw-semibold">Galaxy S23</div>
												<div class="small text-body text-opacity-50">Samsung</div>
												<div class="d-flex align-items-center small">
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="fa fa-star text-warning me-2px"></i>
													<i class="far fa-star text-body text-opacity-25 fa-fw me-1"></i>
													(41)
												</div>
											</div>
											<div>
												<span class="badge text-theme bg-theme bg-opacity-15 fs-12px py-7px px-2 fw-semibold rounded-1 d-block">
													$399.00
												</span>
											</div>
										</a>
									</div>
								</card-body>
								<highlightjs :code="code9" />
							</card>
						</div>
						<!-- END #productWidget -->
						
						<!-- BEGIN #reminderWidget -->
						<div id="reminderWidget" class="mb-5">
							<h4>Reminder widget</h4>
							<p>Reminder widget used to create a simple calendar to notify the user upcoming events or task.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-8">
											<card>
												<card-header class="fw-bold">Today, Nov 4</card-header>
												<div class="widget-reminder">
													<div class="widget-reminder-item">
														<div class="widget-reminder-time">09:00<br>12:00</div>
														<div class="widget-reminder-divider bg-success"></div>
														<div class="widget-reminder-content">
															<div class="fw-bold">Meeting with HR</div>
															<div class="fs-13px"> - Conference Room</div>
														</div>
													</div>
													<div class="widget-reminder-item">
														<div class="widget-reminder-time">20:00<br>23:00</div>
														<div class="widget-reminder-divider bg-primary"></div>
														<div class="widget-reminder-content">
															<div class="fw-bold">Dinner with Richard</div>
															<div class="fs-13px"> - Tom's Too Restaurant</div>
															<div class="d-flex align-items-center fs-13px mt-2">
																<div class="flex-fill d-flex align-items-center">
																	<img src="/assets/img/user/user-3.jpg" alt="" width="16" class="rounded-circle me-2" /> Richard Leong
																</div>
																<a href="#" class="ms-auto">Contact</a>
															</div>
														</div>
													</div>
												</div>
												<card-header class="fw-bold">Tomorrow, Nov 5</card-header>
												<div class="widget-reminder">
													<div class="widget-reminder-item">
														<div class="widget-reminder-time">All day</div>
														<div class="widget-reminder-divider bg-gray-300"></div>
														<div class="widget-reminder-content">
															<div class="fw-bold">Terry Birthday</div>
														</div>
													</div>
													<div class="widget-reminder-item">
														<div class="widget-reminder-time">08:00</div>
														<div class="widget-reminder-divider bg-gray-300"></div>
														<div class="widget-reminder-content">
															<div class="fw-bold">Meeting</div>
														</div>
													</div>
													<div class="widget-reminder-item">
														<div class="widget-reminder-time">00:00<br />00:30</div>
														<div class="widget-reminder-divider bg-gray-300"></div>
														<div class="widget-reminder-content">
															<div class="fw-bold">Server Maintenance</div>
															<div class="fs-13px"> - Data Centre</div>
														</div>
													</div>
												</div>
											</card>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code10" />
							</card>
						</div>
						<!-- END #reminderWidget -->
						
						<!-- BEGIN #imageListWidget -->
						<div id="imageListWidget" class="mb-5">
							<h4>Image list widget</h4>
							<p>Image list widget created by using Bootstrap <code>.card</code> and <code>.list-group</code> component with <code>.d-flex</code> utilities.</p>
							<card>
								<card-body>
									<div class="row">
										<div class="col-xl-8">
											<card>
												<div class="list-group list-group-flush">
													<a href="#" class="list-group-item list-group-item-action d-flex align-items-center text-body">
														<div class="flex-fill pe-3">
															<div class="fw-600">Library (20)</div>
															<div class="fs-12px">3,192 Image Found</div>
														</div>
														<div>
															<i class="fa fa-chevron-right fa-lg text-muted"></i>
														</div>
													</a>
												</div>
												<card-body>
													<div class="widget-img-list">
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-1.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-1.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-2.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-2.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-3.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-3.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-4.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-4.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-5.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-5.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-21.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-21.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-22.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-22.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-23.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-23.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-24.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-24.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-25.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-25.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-26.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-26.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-27.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-27.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-28.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-28.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-29.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-29.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-30.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-30.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-31.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-31.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-32.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-32.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-33.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-33.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-34.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-34.jpg)"></span></a></div>
														<div class="widget-img-list-item"><a href="/assets/img/gallery/gallery-35.jpg" data-lity><span class="img" style="background-image: url(/assets/img/gallery/gallery-35.jpg)"></span></a></div>
													</div>
												</card-body>
											</card>
										</div>
									</div>
								</card-body>
								<highlightjs :code="code11" />
							</card>
						</div>
						<!-- END #imageListWidget -->
					</div>
					<!-- END col-9 -->
					
					<!-- BEGIN col-3 -->
					<div class="col-xl-3">
						<!-- BEGIN #sidebarBootstrap -->
						<nav id="sidebar-bootstrap" class="navbar navbar-sticky d-none d-xl-block">
							<nav class="nav">
								<nav-scroll-to target="#cardWidget">Card widget</nav-scroll-to>
								<nav-scroll-to target="#listWidget">List widget</nav-scroll-to>
								<nav-scroll-to target="#statsWidget">Stats widget</nav-scroll-to>
								<nav-scroll-to target="#chartWidget">Chart widget</nav-scroll-to>
								<nav-scroll-to target="#userListWidget">User list widget</nav-scroll-to>
								<nav-scroll-to target="#mapWidget">Map widget</nav-scroll-to>
								<nav-scroll-to target="#chatWidget">Chat widget</nav-scroll-to>
								<nav-scroll-to target="#profileWidget">Profile widget</nav-scroll-to>
								<nav-scroll-to target="#productWidget">Product widget</nav-scroll-to>
								<nav-scroll-to target="#reminderWidget">Reminder widget</nav-scroll-to>
								<nav-scroll-to target="#imageListWidget">Image list widget</nav-scroll-to>
							</nav>
						</nav>
						<!-- END #sidebarBootstrap -->
					</div>
					<!-- END col-3 -->
				</div>
				<!-- END row -->
			</div>
			<!-- END col-10 -->
		</div>
		<!-- END row -->
	</div>
	<!-- END container -->
</template>