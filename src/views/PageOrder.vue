
<template>
	<div class="d-flex align-items-center mb-3">
		<div class="ms-auto">
			<RouterLink to="/pos/customer-order" class="nav-link">
				<a href="#" class="btn btn-theme"><i class="fa fa-plus-circle fa-fw me-1"></i> Crear nueva orden</a>
			</RouterLink>
		</div>
	</div>

	<div class="mb-md-4 mb-3 d-md-flex">
		<div class="mt-md-0 mt-2"><a href="#" class="text-body text-decoration-none"><i
					class="fa fa-download fa-fw me-1 text-muted"></i> Export</a></div>
		<div class="ms-md-4 mt-md-0 mt-2 dropdown-toggle">
			<a href="#" data-bs-toggle="dropdown" class="text-body text-decoration-none">More Actions</a>
			<div class="dropdown-menu">
				<a class="dropdown-item" href="#">Action</a>
				<a class="dropdown-item" href="#">Another action</a>
				<a class="dropdown-item" href="#">Something else here</a>
				<div role="separator" class="dropdown-divider"></div>
				<a class="dropdown-item" href="#">Separated link</a>
			</div>
		</div>
	</div>

	<card>
		<ul class="nav nav-tabs nav-tabs-v2 px-4">
			<li class="nav-item me-3"><a href="#allTab" class="nav-link active px-2" data-bs-toggle="tab">Todas</a></li>
			<li class="nav-item me-3"><a href="#expiredTab" class="nav-link px-2" data-bs-toggle="tab">Completadas</a></li>
			<li class="nav-item me-3"><a href="#deletedTab" class="nav-link px-2" data-bs-toggle="tab">Sin pagar</a></li>
		</ul>
		<div class="tab-content p-4">
			<div class="tab-pane fade show active" id="allTab">
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
					<button class="btn btn-default dropdown-toggle rounded-0" type="button" data-bs-toggle="dropdown"><span
							class="d-none d-md-inline">Payment Status</span><span class="d-inline d-md-none"><i
								class="fa fa-credit-card"></i></span> &nbsp;</button>
					<div class="dropdown-menu">
						<a class="dropdown-item" href="#">Action</a>
						<a class="dropdown-item" href="#">Another action</a>
						<a class="dropdown-item" href="#">Something else here</a>
						<div role="separator" class="dropdown-divider"></div>
						<a class="dropdown-item" href="#">Separated link</a>
					</div>
					<button class="btn btn-default dropdown-toggle" type="button" data-bs-toggle="dropdown"><span
							class="d-none d-md-inline">Fulfillment status</span><span class="d-inline d-md-none"><i
								class="fa fa-check"></i></span></button>
					<div class="dropdown-menu dropdown-menu-end">
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
								<th class="border-top-0 pt-0 pb-2"></th>
								<th class="border-top-0 pt-0 pb-2">Orden</th>
								<th class="border-top-0 pt-0 pb-2">Fecha</th>
								<th class="border-top-0 pt-0 pb-2">Cliente</th>
								<th class="border-top-0 pt-0 pb-2">Total</th>
								<th class="border-top-0 pt-0 pb-2">Estado de pago</th>
								<th class="border-top-0 pt-0 pb-2">Cantidad</th>
								<th class="border-top-0 pt-0 pb-2">Tipo de pedido</th>
								<th class="border-top-0 pt-0 pb-2">Feedback</th>
							</tr>
						</thead>
						<tbody>
							<!-- <tr v-for="(order, index) in orders" :key="index"> -->
							<tr>
								<td class="w-10px align-middle">
									<div class="form-check">
										<input type="checkbox" class="form-check-input" id="product1">
										<label class="form-check-label" for="product1"></label>
									</div>
								</td>
								<td class="align-middle">
									<RouterLink to="/page/order-details">#1950</RouterLink>
									<!-- <RouterLink to="/page/order-details">{{order.orderNo}}</RouterLink> -->
								</td>
								<td class="align-middle">Thu 26 Nov, 12:23pm</td>
								<!-- <td class="align-middle">{{ order.date }}</td> -->
								<td class="align-middle">Amanda Lee</td>
								<!-- <td class="align-middle">{{ order.customer_id.name }}</td> -->
								<td>$398.00</td>
								<!-- <td>{{order.amount}}</td> -->
								<td class="py-1 align-middle">
									<span class="badge bg-teal text-teal-800 bg-opacity-25 px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">
										<i class="fa fa-circle text-teal fs-9px fa-fw me-5px"></i> 
										Paid
									</span>
								</td>
								<!-- <td class="py-1 align-middle">
									<span class="badge bg-teal text-teal-800 bg-opacity-25 px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">
										<i class="fa fa-circle text-teal fs-9px fa-fw me-5px"></i> 
										{{order.status}}
									</span>
								</td> -->
								<td class="align-middle">3 items</td>
								<!-- <td class="align-middle">{{ order.quantity }}</td> -->
								<td class="align-middle">Para llevar</td>
								<!-- <td class="align-middle">{{ order.type }}</td> -->
								<td class="align-middle">
									<RouterLink to="/customer-survey">
										<a href="#" class="btn btn-theme"><i
												class="fa-solid fa-comment-dots fa-fw me-1"></i>Encuesta de satisfaccion</a>
									</RouterLink>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<!-- END table -->

				<div class="d-md-flex align-items-center">
					<div class="me-md-auto text-md-left text-center mb-2 mb-md-0">
						Showing 1 to 10 of 57 entries
					</div>
					<ul class="pagination mb-0 justify-content-center">
						<li class="page-item disabled"><a class="page-link">Previous</a></li>
						<li class="page-item"><a class="page-link" href="#">1</a></li>
						<li class="page-item active"><a class="page-link" href="#">2</a></li>
						<li class="page-item"><a class="page-link" href="#">3</a></li>
						<li class="page-item"><a class="page-link" href="#">4</a></li>
						<li class="page-item"><a class="page-link" href="#">5</a></li>
						<li class="page-item"><a class="page-link" href="#">6</a></li>
						<li class="page-item"><a class="page-link" href="#">Next</a></li>
					</ul>
				</div>
			</div>
		</div>
	</card>
</template>