<script>
import navscrollto from '@/components/app/NavScrollTo.vue';
import { ScrollSpy } from 'bootstrap';

export default {
	components: {
		navScrollTo: navscrollto
	},
	mounted() {
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
						<!-- BEGIN #general -->
						<div id="general" class="mb-5">
							<h4><i class="far fa-user fa-fw"></i> General</h4>
							<p>View and update your general account information and settings.</p>
							<div class="card">
								<div class="list-group list-group-flush">
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Name</div>
											<div class="text-gray-500">Sean Ngu</div>
										</div>
										<div class="w-100px">
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Username</div>
											<div class="text-gray-500">@seantheme</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Phone</div>
											<div class="text-gray-500">+1-202-555-0183</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Email address</div>
											<div class="text-gray-500">support@vue-studio.com</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Password</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
								</div>
							</div>
						</div>
						<!-- END #general -->
						
						<!-- BEGIN #notifications -->
						<div id="notifications" class="mb-5">
							<h4><i class="far fa-bell fa-fw"></i> Notifications</h4>
							<p>Enable or disable what notifications you want to receive.</p>
							<div class="card">
								<div class="list-group list-group-flush">
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Comments</div>
											<div class="text-gray-500 d-flex align-items-center">
												<i class="fa fa-circle fs-8px fa-fw text-success me-1"></i> Enabled (Push, SMS)
											</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Tags</div>
											<div class="text-gray-500 d-flex align-items-center">
												<i class="fa fa-circle fs-8px fa-fw text-muted me-1"></i> Disabled
											</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Reminders</div>
											<div class="text-gray-500 d-flex align-items-center">
												<i class="fa fa-circle fs-8px fa-fw text-success me-1"></i> Enabled (Push, Email, SMS)
											</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>New orders</div>
											<div class="text-gray-500 d-flex align-items-center">
												<i class="fa fa-circle fs-8px fa-fw text-success me-1"></i> Enabled (Push, Email, SMS)
											</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
								</div>
							</div>
						</div>
						<!-- END #notifications -->
						
						<!-- BEGIN #privacyAndSecurity -->
						<div id="privacyAndSecurity" class="mb-5">
							<h4><i class="far fa-copyright fa-fw"></i> Privacy and security</h4>
							<p>Limit the account visibility and the security settings for your website.</p>
							<div class="card">
								<div class="list-group list-group-flush">
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Who can see your future posts?</div>
											<div class="text-gray-500 d-flex align-items-center">
												Friends only
											</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Photo tagging</div>
											<div class="text-gray-500 d-flex align-items-center">
												<i class="fa fa-circle fs-8px fa-fw text-success me-1"></i> Enabled
											</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Location information</div>
											<div class="text-gray-500 d-flex align-items-center">
												<i class="fa fa-circle fs-8px fa-fw text-muted me-1"></i> Disabled
											</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
									<div class="list-group-item d-flex align-items-center">
										<div class="flex-fill">
											<div>Firewall</div>
											<div class="text-gray-500 d-block d-xl-flex align-items-center">
												<div class="d-flex align-items-center"><i class="fa fa-circle fs-8px fa-fw text-muted me-1"></i> Disabled</div>
												<span class="bg-warning bg-opacity-10 text-warning ms-xl-3 mt-1 d-inline-block mt-xl-0 px-1 rounded-sm">
													<i class="fa fa-exclamation-circle text-warning fs-12px me-1"></i> 
													<span class="text-warning">Please enable the firewall for your website</span>
												</span>
											</div>
										</div>
										<div>
											<a href="#modalEdit" data-bs-toggle="modal" class="btn btn-default w-100px">Edit</a>
										</div>
									</div>
								</div>
							</div>
						</div>
						<!-- END #privacyAndSecurity -->
					</div>
					<!-- END col-9-->
					<!-- BEGIN col-3 -->
					<div class="col-xl-3">
						<!-- BEGIN #sidebar-bootstrap -->
						<nav id="sidebar-bootstrap" class="navbar navbar-sticky d-none d-xl-block">
							<nav class="nav">
								<nav-scroll-to target="#general" data-toggle="scroll-to">General</nav-scroll-to>
								<nav-scroll-to target="#notifications" data-toggle="scroll-to">Notifications</nav-scroll-to>
								<nav-scroll-to target="#privacyAndSecurity" data-toggle="scroll-to">Privacy and security</nav-scroll-to>
							</nav>
						</nav>
						<!-- END #sidebar-bootstrap -->
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
	
	<!-- BEGIN #modalEdit -->
	<div class="modal fade" id="modalEdit">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Edit name</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
				</div>
				<div class="modal-body">
					<div class="mb-3">
						<label class="form-label">Name</label>
						<div class="row">
							<div class="col-4">
								<input class="form-control" placeholder="First" value="Sean">
							</div>
							<div class="col-4">
								<input class="form-control" placeholder="Middle" value="">
							</div>
							<div class="col-4">
								<input class="form-control" placeholder="Last" value="Ngu">
							</div>
						</div>
					</div>
					<div class="alert bg-body">
						<b>Please note:</b> 
						If you change your name, you can't change it again for 60 days. 
						Don't add any unusual capitalization, punctuation, characters or random words. 
						<a href="#" class="alert-link">Learn more.</a>
					</div>
					<div class="mb-3">
						<label class="form-label">Other Names</label>
						<div>
							<a href="#" class="btn btn-outline-default"><i class="fa fa-plus fa-fw"></i> Add other names</a>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-bs-dismiss="modal">Close</button>
					<button type="button" class="btn btn-theme">Save changes</button>
				</div>
			</div>
		</div>
	</div>
	<!-- END #modalEdit -->
</template>