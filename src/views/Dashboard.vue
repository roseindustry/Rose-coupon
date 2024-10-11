<script>
import { db } from '@/firebase/init';
import { RouterLink } from "vue-router";
import { ref as dbRef, get, orderByChild, query, equalTo } from 'firebase/database';
import { useUserStore } from "@/stores/user-role";
import { Modal } from 'bootstrap';

export default {
	data() {
		return {
			userName: '',
			userId: '',
			role: '',
			userDetails: null,
			userReferralsLength: null,
			clients: [],
			verifiedClients: [],
			affiliates: [],
			appliedCoupons: 0,
			clientsWithRequests: [],
			referralClients: [],
			clientsModalData: '',
			sortField: 'firstName',
            sortOrder: 'asc',
		}
	},
	methods: {
		async fetchClients() {
			const role = 'cliente';
			const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

			try {
				const snapshot = await get(clientRef);

				if (snapshot.exists()) {
					const users = snapshot.val();

					// Map Firebase data to an array of promises
					const clientPromises = Object.keys(users).map(async key => {
						return {
							id: key,
							...users[key],
						};
					});

					// Await for all promises to resolve
					this.clients = await Promise.all(clientPromises);

					const verifiedClients = this.clients.filter((client) => client.isVerified === true);
					const clientsWithRequests = this.clients.filter((client) => client.coupon_requests);

					this.verifiedClients = verifiedClients;
					this.clientsWithRequests = clientsWithRequests;
				} else {
					this.clients = [];
				}
			} catch (error) {
				console.error('Error fetching clients:', error);
				this.clients = [];
			}
		},
		async fetchAffiliates() {
			const role = 'afiliado';
			const affiliatesRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

			try {
				const affiliateSnapshot = await get(affiliatesRef);

				if (affiliateSnapshot.exists()) {
					const affiliatesList = [];
					affiliateSnapshot.forEach((childSnapshot) => {
						const affiliateData = childSnapshot.val();
						affiliatesList.push({
							...affiliateData
						});
					});

					this.affiliates = affiliatesList;
				} else {
					console.log("No data available.");
				}
			} catch (error) {
				console.error("Error fetching affiliates:", error);
			}
		},
		async fetchCoupons() {
			const affiliates = this.affiliates;

			try {
				let totalCouponsApplied = 0;

				// Loop through each affiliate and collect their applied coupons
				for (const affiliate of affiliates) {
					if (affiliate.appliedCoupons) {
						if (Array.isArray(affiliate.appliedCoupons)) {
							// If it's an array, just add the length
							totalCouponsApplied += affiliate.appliedCoupons.length;
						} else if (typeof affiliate.appliedCoupons === 'object') {
							// If it's an object, count the total number of redemptions for each coupon
							Object.keys(affiliate.appliedCoupons).forEach(couponId => {
								// For each couponId, count the redemption entries (which are the nested keys)
								totalCouponsApplied += Object.keys(affiliate.appliedCoupons[couponId]).length;
							});
						}
					}
				}

				// Set the total applied coupons count
				this.appliedCoupons = totalCouponsApplied;
			} catch (error) {
				console.error("Error fetching applied coupons:", error);
			}
		},
		async fetchCurrentUserData() {
			// Ensure that userId is set before proceeding
			if (!this.userId) {
				console.error("User ID is not defined.");
				return;
			}

			const userRef = dbRef(db, `Users/${this.userId}`);
			this.userDetails = {};
			try {
				const snapshot = await get(userRef);

				if (snapshot.exists()) {
					this.userDetails = snapshot.val();

					// Check if 'referidos' exists and is an object
					if (this.userDetails.referidos && typeof this.userDetails.referidos === 'object') {
						// Count the number of entries in the referidos object
						const referralIds = Object.keys(this.userDetails.referidos);
						this.userReferralsLength = referralIds.length;

						this.referralClients = [];
						// Loop through each referralId and fetch corresponding user data
						for (const referralId of referralIds) {
							const referralUserRef = dbRef(db, `Users/${referralId}`);
							const referralSnapshot = await get(referralUserRef);

							if (referralSnapshot.exists()) {
								const referralData = referralSnapshot.val();
								this.referralClients.push(referralData); 								
							} else {
								console.log(`Referral client with ID ${referralId} not found.`);
							}
						}
					} else {
						this.userReferralsLength = 0; // If 'referidos' is missing or not an object
					}
				} else {
					console.log("No user data found");
					this.userDetails = {};
				}
			} catch (error) {
				console.error("Error fetching data:", error);
			}
		},
		openClientsModal() {
			this.clientsModalData = this.referralClients;

			// Show the modal
			new Modal(document.getElementById('clientsModal')).show();
		},
		sortClients(field) {
            if (this.sortField === field) {
                // If already sorted by this field, toggle sort order
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                // Otherwise, set the field and default to ascending order
                this.sortField = field;
                this.sortOrder = 'asc';
            }

            // Sort the clientsModalData array
            this.clientsModalData.sort((a, b) => {
                let fieldA = a[field].toString().toLowerCase();
                let fieldB = b[field].toString().toLowerCase();

                if (this.sortOrder === 'asc') {
                    return fieldA > fieldB ? 1 : fieldA < fieldB ? -1 : 0;
                } else {
                    return fieldA < fieldB ? 1 : fieldA > fieldB ? -1 : 0;
                }
            });
        },
	},
	async mounted() {
		const userStore = useUserStore();
		await userStore.fetchUser();

		this.userName = userStore.userName;
		this.role = userStore.role;
		this.userId = userStore.userId;

		if (this.role === 'admin') {
			await this.fetchClients();
			await this.fetchAffiliates();
			await this.fetchCoupons();
		}

		if (this.role === 'mesero' || this.role === 'promotora') {
			await this.fetchCurrentUserData();
		}

	}
}
</script>
<template>
	<div v-if="this.role === 'admin'">
		<div class="container py-4">
			<div class="card mb-4 shadow-sm">
				<div class="card-body">
					<div class="row align-items-center">
						<div class="col-md-8">
							<h1 class="h4 mb-2">Hola, {{ userName }} 🎉</h1>
							<h5 class="text-muted">Aquí está un resumen de tu App</h5>
						</div>
					</div>
				</div>
			</div>

			<div class="row g-4">
				<!-- Clientes registrados -->
				<div class="col-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-primary mb-3">
								<i class="fa fa-user fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Clientes registrados</h5>
							<h3>{{ clients.length || 0 }}</h3>
						</div>
					</div>
				</div>
				<!-- Clientes verificados -->
				<div class="col-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-success mb-3">
								<i class="fa fa-user-check fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Clientes Verificados</h5>
							<h3>{{ verifiedClients.length || 0 }}</h3>
						</div>
					</div>
				</div>
				<!-- Solicitudes de cupones por Clientes -->
				<div class="col-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-primary mb-3">
								<i class="fa-solid fa-bell-concierge fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Solicitudes de Cupones</h5>
							<h3>{{ clientsWithRequests.length || 0 }}</h3>
							<router-link to="#">Ver</router-link>
						</div>
					</div>
				</div>
				<!-- Comercios afiliados -->
				<div class="col-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-success mb-3">
								<i class="fa fa-building fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Comercios Afiliados</h5>
							<h3>{{ affiliates.length || 0 }}</h3>
						</div>
					</div>
				</div>
				<!-- Cupones aplicados -->
				<div class="col-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-primary mb-3">
								<i class="fa fa-ticket fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Cupones Usados</h5>
							<h3>{{ appliedCoupons || 0 }}</h3>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div v-if="this.role === 'mesero' || this.role === 'promotora'">
		<div class="container py-4">
			<div class="row justify-content-center g-4 mb-4">
				<div class="col-12 col-md-6">
					<div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
						<div class="card-body text-center py-5">
							<h5 class="card-title mb-3">Tu código de Referido</h5>
							<h3><strong>{{ this.userDetails.codigoReferido }}</strong></h3>
							<h5 class="card-title mt-3 mb-3">Rol</h5>
							<h3><strong>{{ this.role.charAt(0).toUpperCase() + this.role.slice(1) }}</strong></h3>
						</div>
					</div>
				</div>
				<div class="col-12 col-md-6">
					<div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
						<div class="card-body text-center py-5">
							<h5 class="card-title mb-3">Clientes referidos</h5>
							<h3><strong>{{ this.userReferralsLength || 0 }}</strong></h3>
							<a href="#" class="btn btn-theme btn-lg px-4 mt-3 shadow-sm" @click.prevent="openClientsModal()">Ver lista de referidos</a>
						</div>
					</div>
				</div>
			</div>

			<!-- Clients Modal -->
			<div class="modal fade" id="clientsModal" tabindex="-1" aria-labelledby="clientsRequestsModalLabel"
				aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="clientsRequestsModalLabel">Clientes referidos</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body text-center">
							<div class="container">
								<table class="table text-center table-responsive">
									<thead>
										<tr>
											<th scope="col" @click="sortClients('firstName')">Cliente
												<i class="fa-solid fa-sort"></i>
											</th>
											<th scope="col" @click="sortClients('identification')">Cédula
												<i class="fa-solid fa-sort"></i>
											</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="client in clientsModalData" :key="client.id">
											<td>{{ client.firstName + ' ' + client.lastName }}</td>
											<td>{{ client.identification }}</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<style scoped>
.btn-theme {
	background-color: purple;
	border-color: purple;
}

.icon-circle {
	width: 50px;
	height: 50px;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.text-muted {
	font-size: 0.9rem;
}

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