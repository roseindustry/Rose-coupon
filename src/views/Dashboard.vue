<script>
import { db, functions } from '@/firebase/init';
import { ref as dbRef, get, update, orderByChild, query, equalTo } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { useUserStore } from "@/stores/user-role";
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import moment from 'moment';

export default {
	data() {
		return {
			userName: '',
			userId: '',
			role: '',
			userDetails: null,
			userReferralsLength: null,
			clients: [],
			clientsRegisteredDay: [],
			verifiedClients: [],
			affiliates: [],
			categories: [],
			subscriptions: [],
			appliedCoupons: 0,
			clientsWithRequests: [],
			clientsVerifyRequests: [],
			referralClients: [],
			dayReferrals: [],
			clientsModalData: '',
			requestsModalTitle: '',
			requestsModalData: '',
			selectedRequestsClient: {},
			clientImgModal: null,
			sortField: 'firstName',
			sortOrder: 'asc',
			isSubmitting: false,
			assigningSubscription: false,
			selectedClientId: null,
			subToAssign: '',
			filterDate: this.getVenezuelanDate(),
			loading: false,
			searchQuery: '',
		}
	},
	computed: {
		filteredClients() {
			let filtered = this.clientsModalData;

			if (this.searchQuery) {
				const query = this.searchQuery.toLowerCase();
				filtered = filtered.filter(client => {
					const fullName = (client.firstName + ' ' + client.lastName).toLowerCase();
					const identification = String(client.identification).toLowerCase();  // Ensure it's a string
					const subscriptionName = client.subscriptionName ? client.subscriptionName.toLowerCase() : '';

					return fullName.includes(query) ||
						identification.includes(query) ||
						subscriptionName.includes(query);
				});
			}

			return filtered;
		},
	},
	methods: {
		getVenezuelanDate() {
			const venezuelanTimeZone = 'America/Caracas';
			const date = new Date().toLocaleDateString('en-CA', { timeZone: venezuelanTimeZone });
			return date; // Outputs in 'yyyy-mm-dd' format
		},
		showToast(message) {
			Toastify({
				text: message,
				duration: 3000,
				close: true,
				gravity: 'top',
				position: 'right',
				stopOnFocus: true,
				style: {
					background: 'linear-gradient(to right, #00b09b, #96c93d)',
				},
			}).showToast();
		},
		formatDate(date) {
			if (!date) return ''; // Handle invalid dates or null values
			const d = new Date(date);
			const day = String(d.getDate()).padStart(2, '0'); // Ensure two-digit day
			const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
			const year = d.getFullYear();
			return `${day}/${month}/${year}`;
		},
		async sendEmail(payload) {
			try {
				const sendEmailFunction = httpsCallable(functions, 'sendEmail');
				await sendEmailFunction(payload);
			} catch (error) {
				console.error('Error sending email:', error);
			}
		},
		async sendNotificationEmail(emailPayload) {
			try {
				await this.sendEmail(emailPayload);
			} catch (error) {
				console.error('Error sending email:', error);
			}
		},
		clearDateFilter() {
			this.filterDate = null;
		},

		// Admin's
		async fetchClients() {
			const role = 'cliente';
			const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

			try {
				this.loading = true;

				const snapshot = await get(clientRef);

				if (snapshot.exists()) {
					const users = snapshot.val();

					const getUserDetails = httpsCallable(functions, 'getUserDetails');
					const clientPromises = [];

					// Map Firebase data to an array of promises
					for (const [uid, user] of Object.entries(users)) {
						clientPromises.push(
							getUserDetails(uid).then(authUser => ({
								uid,
								...user,
								createdAt: authUser.data.creationTime
							}))
						);
					}

					// Await for all promises to resolve
					this.clients = await Promise.all(clientPromises);

					const verifiedClients = this.clients.filter((client) => client.isVerified === true);
					const clientsWithRequests = this.clients.filter((client) => client.coupon_requests);
					const clientsVerifyRequests = this.clients.filter((client) => client.requestedVerification && !client.isVerified);

					this.verifiedClients = verifiedClients;
					this.clientsWithRequests = clientsWithRequests;
					this.clientsVerifyRequests = clientsVerifyRequests;
				} else {
					this.clients = [];
				}
			} catch (error) {
				console.error('Error fetching clients:', error);
				this.clients = [];
			} finally {
				this.loading = false;
			}
		},
		fetchDayClients() {
			try {
				if (this.filterDate) {
					const day = moment(this.filterDate).startOf('day').toISOString();

					// Filter clients registered today
					const filteredClients = this.clients.filter(client => {
						const clientCreationDate = moment(client.createdAt);
						return clientCreationDate.isSame(day, 'day');
					});

					this.clientsRegisteredDay = filteredClients;
				} else {
					// If no date is selected, clear the filtered list
					this.clientsRegisteredDay = [];
				}
			} catch (error) {
				console.error('Error filtering clients.', error);
			}
		},
		async fetchAffiliates() {
			const role = 'afiliado';
			const affiliatesRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

			try {
				const affiliateSnapshot = await get(affiliatesRef);

				if (affiliateSnapshot.exists()) {
					const affiliates = affiliateSnapshot.val();

					this.affiliates = Object.keys(affiliates).map(key => ({
						id: key,
						...affiliates[key]
					}));
				} else {
					console.log("No data available.");
				}
			} catch (error) {
				console.error("Error fetching affiliates:", error);
			}
		},
		async fetchCategories() {
			const categoryRef = dbRef(db, 'Affiliate_categories');
			try {
				const categorySnapshot = await get(categoryRef);

				if (categorySnapshot.exists()) {
					const categories = categorySnapshot.val();

					this.categories = Object.keys(categories).map(key => ({
						id: key,
						...categories[key]
					}));
				} else {
					this.categories = [];
				}
			} catch (error) {
				console.error("Error fetching categories:", error);
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
		async fetchSubscriptions() {
			const plansRef = query(dbRef(db, 'Suscriptions'));
			try {
				const snapshot = await get(plansRef);

				if (snapshot.exists()) {
					const plans = snapshot.val();

					// Since Firebase data is an object, map to array for easier use
					this.subscriptions = Object.keys(plans).map(key => ({
						id: key,
						...plans[key]
					}));
				} else {
					this.subscriptions = [];  // No subscriptions found
				}
			} catch (error) {
				console.error('Error fetching subscriptions:', error);
				this.subscriptions = [];
			}
		},

		openRequestsModal(type) {
			if (type === 'verificationRequests') {
				this.requestsModalTitle = 'Solicitudes de Verificación';
				this.requestsModalData = this.clientsVerifyRequests;
			} else if (type === 'couponRequests') {
				this.requestsModalTitle = 'Solicitudes de Cupones'
				this.requestsModalData = this.clientsWithRequests;
			}

			// Show the modal
			new Modal(document.getElementById('requestsModal')).show();
		},
		showIDfiles(client) {
			this.fetchIdFiles(client).then(() => {
				// Show the image Modal after fetching files
				const modal = Modal.getOrCreateInstance(document.getElementById('idImgModal'));
				modal.show();
			});
			this.clientImgModal = client;
		},
		async fetchIdFiles(client) {
			try {
				// Fetch verification files data from the user's collection in the Realtime Database
				const userRef = dbRef(db, `Users/${client.uid}/verificationFiles`);
				const snapshot = await get(userRef);

				if (snapshot.exists()) {
					const verificationFiles = snapshot.val();

					// Set the URLs for front and back ID images if they exist
					client.idFrontUrl = verificationFiles['Front-ID'] || null;
					client.idBackUrl = verificationFiles['Back-ID'] || null;
					client.selfieUrl = verificationFiles['Selfie'] || null;

				} else {
					console.warn(`No verification files found for ${client.uid}`);
				}
			} catch (error) {
				console.error('Error fetching ID files:', error.message || error);
			}
		},
		async approveID(client) {
			const userName = client.firstName + ' ' + client.lastName;
			try {
				// Show the loader
				this.isSubmitting = true;

				const userRef = dbRef(db, `Users/${client.uid}`);
				await update(userRef, { isVerified: true });

				// Send an email notification to the client through Firebase Cloud Functions
				const emailPayload = {
					to: client.email,
					message: {
						subject: "Verificación Aprobada en Rose App",
						text: `Hola ${userName}, tu solicitud de verificación ha sido aprobada.`,
					},
				};
				await this.sendEmail(emailPayload);

				// Hide the image Modal after approving
				const modal = Modal.getOrCreateInstance(document.getElementById('idImgModal'));
				modal.hide();

				this.showToast('Usuario verificado con éxito.');
				this.fetchIdFiles(client);
			} catch (error) {
				console.error("Error approving ID:", error);
			} finally {
				// Hide the loader
				this.isSubmitting = false;
			}
		},
		async dissapproveID(client) {
			// Confirmation dialog
			if (confirm("¿Desea borrar este cliente?")) {
				// User clicked "OK"
				try {
					this.isSubmitting = true;

					// Fetch the user's verification files from the Database
					const userRef = dbRef(db, `Users/${client.uid}`);
					const snapshot = await get(dbRef(db, `Users/${client.uid}/verificationFiles`));

					if (!snapshot.exists()) {
						console.warn(`No verification files found for ${client.uid}, skipping deletion.`);
						return;
					}

					const verificationFiles = snapshot.val();
					const filePaths = [
						verificationFiles['Front-ID'] || null,
						verificationFiles['Back-ID'] || null,
						verificationFiles['Selfie'] || null
					].filter(Boolean); // Filter out null values

					// Function to delete files from Firebase Storage
					const deleteFile = async (fileUrl) => {
						try {
							const fileRef = storageRef(storage, fileUrl);
							await deleteObject(fileRef);
							console.log(`${fileUrl} deleted successfully.`);
						} catch (error) {
							if (error.code === 'storage/object-not-found') {
								console.warn(`${fileUrl} not found, skipping deletion.`);
							} else {
								console.error(`Error deleting ${fileUrl}:`, error);
							}
						}
					};

					// Delete the files
					for (const filePath of filePaths) {
						await deleteFile(filePath);
					}

					// Clear verification status and files from the user's database entry
					await update(userRef, {
						isVerified: null,
						requestedVerification: null,
						verificationFiles: null, // Clear verification files in the database
					});

					// Send an email notification to the client via Firebase Cloud Functions
					const emailPayload = {
						to: client.email,
						message: {
							subject: "Verificación Denegada",
							text: `Hola ${client.firstName}, tu solicitud de verificación ha sido denegada. Por favor, sube nuevamente tus archivos de verificación.`,
						},
					};
					await this.sendEmail(emailPayload);

					// Show a success toast and refresh client list
					this.showToast('Verificación denegada y archivos eliminados.');
					this.fetchClients();

				} catch (error) {
					console.error("Error disapproving verification:", error);
					this.showToast('Error al denegar la verificación. Por favor, inténtelo nuevamente.');
				} finally {
					// Hide the loader
					this.isSubmitting = false;
				}
			}
		},
		showCouponRequest(client) {
			if (!client.coupon_requests) {
				console.error("No coupon requests found for this client");
				return;
			}
			console.log(client);
			// Convert coupon_requests object into an array with the keys
			const requests = Object.keys(client.coupon_requests).map(key => ({
				id: key,
				...client.coupon_requests[key]
			}));

			this.selectedRequestsClient = { ...client, coupon_requests: requests };
			console.log(this.selectedRequestsClient);

			const modal = Modal.getOrCreateInstance(document.getElementById('couponRequestModal'));
			modal.show();
		},
		getAffiliateNameById(affiliateId) {
			this.fetchAffiliates();
			const affiliate = this.affiliates.find(affiliate => affiliate.id === affiliateId);
			// If the affiliate is found, return the companyName, otherwise return 'Unknown Affiliate'
			return affiliate ? affiliate.companyName : 'Unknown Affiliate';
		},
		getCategoryNameById(categoryId) {
			this.fetchCategories();
			const category = this.categories.find(category => category.id === categoryId);
			// If the category is found, return the name, otherwise return 'Unknown Category'
			return category ? category.name : 'Unknown Category';
		},
		assignCoupon(client) {
			// Hide the modal 
			const modal = Modal.getInstance(document.getElementById('requestsModal'));
			if (modal) {
				modal.hide();
			}

			this.$router.push({
				path: '/cupones',
				query: { clientId: client.uid } // Pass the client's ID
			});

		},

		// Employee's
		async fetchCurrentUserData() {
			if (!this.userId) {
				console.error("User ID is not defined.");
				return;
			}

			const userRef = dbRef(db, `Users/${this.userId}`);
			this.userDetails = {};

			try {
				this.loading = true;

				const snapshot = await get(userRef);

				if (snapshot.exists()) {
					this.userDetails = snapshot.val();

					if (this.userDetails.referidos && typeof this.userDetails.referidos === 'object') {
						const referralIds = Object.keys(this.userDetails.referidos);
						this.referralClients = [];

						const getUserDetails = httpsCallable(functions, 'getUserDetails');
						const referralPromises = referralIds.map(async (referralId) => {
							try {
								const referralUserRef = dbRef(db, `Users/${referralId}`);
								const referralSnapshot = await get(referralUserRef);

								if (referralSnapshot.exists()) {
									const referralData = { id: referralId, ...referralSnapshot.val() };

									// Fetch subscription if exists
									if (referralData.subscription && referralData.subscription.subscription_id) {
										const subscriptionId = referralData.subscription.subscription_id;
										const subscriptionRef = dbRef(db, `Suscriptions/${subscriptionId}`);
										const subscriptionSnapshot = await get(subscriptionRef);

										referralData.subscription = subscriptionSnapshot.exists()
											? { ...referralData.subscription, ...subscriptionSnapshot.val() }
											: null;
									} else {
										referralData.subscription = null;
									}

									// Fetch auth user details using Cloud Function
									const authUser = await getUserDetails(referralId);
									referralData.createdAt = authUser.data.creationTime;

									return referralData;
								} else {
									console.log(`Referral client with ID ${referralId} not found.`);
									return null;
								}
							} catch (err) {
								console.error(`Error fetching referral ${referralId}:`, err);
								return null;
							}
						});

						// Await all referral promises
						this.referralClients = (await Promise.all(referralPromises)).filter(client => client !== null);
					} else {
						this.referralClients = [];
					}
				} else {
					console.log("No user data found.");
					this.userDetails = {};
				}
			} catch (error) {
				console.error("Error fetching data:", error);
			} finally {
				this.loading = false;
			}
		},
		openClientsModal(dataType = 'referralClients') {
			this.clientsModalData = dataType === 'dayReferrals' ? this.dayReferrals : this.referralClients;

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
		async loadSubscriptions(client) {
			this.fetchSubscriptions();
			this.assigningSubscription = true;
			this.selectedClientId = client.id;
		},
		async assignSubscription(client) {
			if (!confirm('¿Asegura que el cliente ha pagado su suscripción?')) {
				return;
			}

			if (!client.id) {
				alert('Por favor seleccione un cliente antes de asignar una suscripción.');
				return;
			}

			if (!this.subToAssign) {
				alert('Por favor seleccione una suscripción antes de asignar.');
				return;
			}

			// Calculate payDay (one month from today)
			const payDay = moment().add(1, 'month').toISOString();

			// Prepare subscription details
			const subscriptionData = {
				subscription_id: this.subToAssign.id,
				status: true,
				payDay: payDay,
				isPaid: true,
			};

			try {
				this.isSubmitting = true;

				// Assign the subscription details to the client's data in Firebase
				const userPlanRef = dbRef(db, `Users/${client.id}/subscription`);
				await update(userPlanRef, subscriptionData);

				// Notify Client
				const appUrl = 'https://app.rosecoupon.com';
				const clientEmailPayload = {
					to: client.email,
					message: {
						subject: `Suscripción ${this.subToAssign.name.toUpperCase()} activada`,
						text: `Hola ${client.firstName}, se le ha activado la Suscripción ${this.subToAssign.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
						html: `<p>Hola ${client.firstName}, se le ha activado la Suscripción ${this.subToAssign.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`
					},
				};
				await this.sendNotificationEmail(clientEmailPayload);

				// Notify Admin
				const adminEmailPayload = {
					to: 'roseindustry11@gmail.com',
					message: {
						subject: `Nuevo cliente suscrito al Plan ${this.subToAssign.name.toUpperCase()}`,
						text: `Un nuevo cliente, ${client.firstName} ${client.lastName}, se ha suscrito al plan ${this.subToAssign.name.toUpperCase()}.`,
						html: `<p>Un nuevo cliente, ${client.firstName} ${client.lastName}, se ha suscrito al plan ${this.subToAssign.name.toUpperCase()}.</p>`
					},
				};
				await this.sendNotificationEmail(adminEmailPayload);

				this.showToast('Suscripción activada!');

				// Reset state
				this.resetModal();
				const modal = Modal.getOrCreateInstance(document.getElementById('clientsModal'));
				modal.hide();

			} catch (error) {
				console.error('Error assigning plan:', error);
				alert('La activación de la suscripción falló.');
			} finally {
				this.isSubmitting = false;
			}

		},
		fetchDayReferrals() {
			try {
				if (this.filterDate) {
					const day = moment(this.filterDate).startOf('day').toISOString();

					// Filter clients registered today
					const filteredReferrals = this.referralClients.filter(client => {
						const clientCreationDate = moment(client.createdAt);
						return clientCreationDate.isSame(day, 'day');
					});

					this.dayReferrals = filteredReferrals;
				} else {
					// If no date is selected, clear the filtered list
					this.dayReferrals = [];
				}
			} catch (error) {
				console.error('Error filtering clients.', error);
			}
		},
		resetModal() {
			this.assigningSubscription = false;
			this.fetchCurrentUserData();
		}
	},
	async mounted() {
		const userStore = useUserStore();
		await userStore.fetchUser();

		this.userName = userStore.userName;
		this.role = userStore.role;
		this.userId = userStore.userId;

		if (this.role === 'admin') {
			await this.fetchClients();
			this.fetchDayClients();
			await this.fetchAffiliates();
			await this.fetchCoupons();
		}

		if (this.role === 'mesero' || this.role === 'promotora') {
			await this.fetchCurrentUserData();
			this.fetchDayReferrals();
		}
		// console.log(this.userId)
	}
}
</script>
<template>
	<div v-if="this.role === 'admin'">
		<div class="container py-2">
			<div class="card mb-3 shadow-sm">
				<div class="card-body">
					<div class="row align-items-center">
						<div class="col-md-8">
							<h1 class="h4 mb-2">Hola, {{ userName }} 🎉</h1>
							<h5 class="text-muted">Aquí está un resumen de tu App</h5>
						</div>
					</div>
				</div>
			</div>

			<div class="row g-3">
				<!-- Clientes registrados -->
				<div class="col-sm-6 col-lg-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-primary mb-3">
								<i class="fa fa-user fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Total de Clientes Registrados</h5>
							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
								aria-hidden="true"></span>
							<div v-if="clients && !loading">
								<h3>{{ clients.length || 0 }}</h3>
							</div>
						</div>
					</div>
				</div>
				<!-- Clientes registrados el dia... -->
				<div class="col-sm-6 col-lg-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-primary mb-3">
								<i class="fa fa-user fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Clientes Registrados El Día</h5>

							<div class="d-flex justify-content-center align-items-center m-3">
								<input type="date" v-model="filterDate" class="form-control me-2" style="width: auto;"
									@change="fetchDayClients" />
							</div>

							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
								aria-hidden="true"></span>
							<div v-if="clientsRegisteredDay && !loading">
								<h3>{{ clientsRegisteredDay.length || 0 }}</h3>
							</div>
						</div>
					</div>
				</div>
				<!-- Clientes verificados -->
				<div class="col-sm-6 col-lg-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-success mb-3">
								<i class="fa fa-user-check fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Clientes Verificados</h5>
							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
								aria-hidden="true"></span>
							<div v-if="verifiedClients && !loading">
								<h3>{{ verifiedClients.length || 0 }}</h3>
							</div>
						</div>
					</div>
				</div>
				<!-- Comercios afiliados -->
				<div class="col-sm-6 col-lg-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-success mb-3">
								<i class="fa fa-building fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Comercios Afiliados</h5>
							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
								aria-hidden="true"></span>
							<div v-if="affiliates && !loading">
								<h3>{{ affiliates.length || 0 }}</h3>
							</div>
						</div>
					</div>
				</div>
				<!-- Cupones aplicados -->
				<div class="col-sm-6 col-lg-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-primary mb-3">
								<i class="fa fa-ticket fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Cupones Usados</h5>
							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
								aria-hidden="true"></span>
							<div v-if="appliedCoupons && !loading">
								<h3>{{ appliedCoupons || 0 }}</h3>
							</div>
						</div>
					</div>
				</div>
				<!-- Solicitudes de cupones por Clientes -->
				<div class="col-sm-6 col-lg-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-primary mb-3">
								<i class="fa-solid fa-bell-concierge fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Solicitudes de Cupones</h5>
							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
								aria-hidden="true"></span>
							<div v-if="clientsWithRequests && !loading">
								<h3>{{ clientsWithRequests.length || 0 }}</h3>
								<a v-if="clientsWithRequests.length" href="#"
									@click.prevent="openRequestsModal('couponRequests')">Ver</a>
							</div>
						</div>
					</div>
				</div>
				<!-- Solicitudes de verificacion por Clientes -->
				<div class="col-sm-6 col-lg-4">
					<div class="card custom-card h-100 text-center">
						<div class="card-body d-flex flex-column justify-content-center align-items-center">
							<div class="icon-circle bg-primary mb-3">
								<i class="fa-solid fa-bell-concierge fa-lg text-white"></i>
							</div>
							<h5 class="mb-1">Solicitudes de Verificacion</h5>
							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
								aria-hidden="true"></span>
							<div v-if="clientsVerifyRequests && !loading">
								<h3>{{ clientsVerifyRequests.length || 0 }}</h3>
								<a v-if="clientsVerifyRequests.length" href="#"
									@click.prevent="openRequestsModal('verificationRequests')">Ver</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal for requests -->
		<div class="modal fade" id="requestsModal" tabindex="-1" aria-labelledby="verifyClientsModalLabel"
			aria-hidden="true">
			<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="verifyClientsModalLabel">{{ requestsModalTitle }}</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body text-center">
						<div class="container">
							<table class="table text-center table-responsive">
								<thead>
									<tr>
										<th scope="col">Cliente</th>
										<th scope="col">Cédula</th>
										<template v-if="requestsModalTitle === 'Solicitudes de Verificación'">
											<th scope="col">Acciones</th>
										</template>
										<template v-else-if="requestsModalTitle === 'Solicitudes de Cupones'">
											<th scope="col">Solicitus</th>
											<th scope="col">Acciones</th>
										</template>
									</tr>
								</thead>
								<tbody>
									<tr v-for="client in requestsModalData" :key="client.uid">
										<td>{{ client.firstName + ' ' + client.lastName }}</td>
										<td>V-{{ client.identification }}</td>
										<td>
											<template v-if="requestsModalTitle === 'Solicitudes de Verificación'">
												<button class="btn btn-outline-info me-2"
													@click.prevent="showIDfiles(client)">
													<i class="fa-solid fa-id-card"></i>
												</button>
											</template>
											<template v-else-if="requestsModalTitle === 'Solicitudes de Cupones'">
												<button class="btn btn-sm btn-info me-1" data-bs-toggle="tooltip"
													data-bs-placement="top" title="Seleccionar cliente"
													@click.prevent="showCouponRequest(client)">
													<i class="fa-solid fa-search me-2"></i>Ver solicitud
												</button>
											</template>
										</td>
										<td>
											<template v-if="requestsModalTitle === 'Solicitudes de Cupones'">
												<button class="btn btn-sm btn-success me-1" data-bs-toggle="tooltip"
													data-bs-placement="top" title="Seleccionar cliente"
													@click.prevent="assignCoupon(client)">
													<i class="fa-solid fa-check me-2"></i>Asignar
												</button>
											</template>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
		<!-- Modal for opening image -->
		<div v-if="clientImgModal" class="modal fade" id="idImgModal" tabindex="-1" aria-labelledby="qrModalLabel"
			aria-hidden="true">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="qrModalLabel">{{ clientImgModal.firstName }} {{
							clientImgModal.lastName }}
						</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<div class="d-flex justify-content-center gap-3">
							<button class="btn btn-outline-success d-flex align-items-center gap-1"
								@click="approveID(clientImgModal)" :disabled="isSubmitting">
								<i class="fa-solid fa-check"></i>
								<span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<span v-else>Aprobar</span>
							</button>
							<button class="btn btn-outline-danger d-flex align-items-center gap-1"
								@click="dissapproveID(clientImgModal)" :disabled="isSubmitting">
								<i class="fa-solid fa-times"></i>
								<span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<span v-else>Denegar</span>
							</button>
						</div>
						<div class="mb-4">
							<label for="idFrontUrl" class="form-label">Parte frontal</label>
							<div class="image-container">
								<img v-if="clientImgModal.idFrontUrl" :src="clientImgModal.idFrontUrl" alt="front"
									class="img-fluid rounded border border-primary">
								<p v-else class="text-muted">No hay imagen disponible.</p>
							</div>
						</div>

						<div class="mb-4">
							<label for="idBackUrl" class="form-label">Parte trasera</label>
							<div class="image-container">
								<img v-if="clientImgModal.idBackUrl" :src="clientImgModal.idBackUrl" alt="back"
									class="img-fluid rounded border border-primary">
								<p v-else class="text-muted">No hay imagen disponible.</p>
							</div>
						</div>

						<div class="mb-4">
							<label for="selfieUrl" class="form-label">Foto con Cédula visible</label>
							<div class="image-container">
								<img v-if="clientImgModal.selfieUrl" :src="clientImgModal.selfieUrl" alt="selfie"
									class="img-fluid rounded border border-primary">
								<p v-else class="text-muted">No hay imagen disponible.</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<!-- Coupon Request Modal -->
		<div class="modal fade" id="couponRequestModal" tabindex="-1" aria-labelledby="couponRequestModalLabel"
			aria-hidden="true">
			<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="couponRequestModalLabel">Detalles de la Solicitud de Cupón</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<!-- Client Information -->
						<div class="mb-4">
							<h5><strong>Cliente:</strong> {{ selectedRequestsClient.firstName + ' ' +
								selectedRequestsClient.lastName }}</h5>
							<p><strong>Cédula:</strong> {{ selectedRequestsClient.identification }}</p>
						</div>

						<!-- Loop through all coupon requests -->
						<div v-for="(request, index) in selectedRequestsClient.coupon_requests" :key="request.id"
							class="card mb-3">
							<div class="card-header">
								<h6 class="text-black"><strong>Solicitud #{{ index + 1 }}</strong></h6>
							</div>

							<div class="card-body">
								<!-- Request Date -->
								<p><strong>Fecha de solicitud:</strong> {{ formatDate(request.date) }}</p>

								<!-- Affiliates Section -->
								<div v-if="request.selectedAffiliates">
									<strong>Comercios Afiliados:</strong>
									<ul class="list-group list-group-flush">
										<li class="list-group-item" style="background-color: transparent;"
											v-for="(affiliateId, index) in Object.keys(request.selectedAffiliates)"
											:key="index">
											{{ getAffiliateNameById(affiliateId) }}
										</li>
									</ul>
								</div>

								<!-- Categories Section -->
								<div v-if="request.selectedCategories" class="mt-3">
									<strong>Categorías:</strong>
									<ul class="list-group list-group-flush">
										<li class="list-group-item" style="background-color: transparent;"
											v-for="(categoryId, index) in Object.keys(request.selectedCategories)"
											:key="index">
											{{ getCategoryNameById(categoryId) }}
										</li>
									</ul>
								</div>
							</div>
							<!-- <div class="card-footer text-end">
                                <button class="btn btn-outline-success">
                                    <i class="fa-solid fa-check"></i> Asignar cupon
                                </button>
                            </div> -->
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
							<h5 class="card-title mb-3">Clientes Referidos</h5>

							<div>
								<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<div v-if="referralClients && !loading">
									<h3><strong>{{ this.referralClients.length || 0 }}</strong></h3>
								</div>
							</div>

							<a href="#" class="btn btn-theme btn-lg px-4 mt-3 shadow-sm"
								@click.prevent="openClientsModal('referralClients')">Ver lista</a>
						</div>
					</div>
				</div>
				<div class="col-12 col-md-6">
					<div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
						<div class="card-body text-center py-5">
							<h5 class="card-title mb-3">Clientes Referidos el día</h5>

							<div class="d-flex justify-content-center align-items-center m-3">
								<input type="date" v-model="filterDate" class="form-control me-2" style="width: auto;"
									@change="fetchDayReferrals" />
							</div>

							<div>
								<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<div v-if="dayReferrals && !loading">
									<h3><strong>{{ this.dayReferrals.length || 0 }}</strong></h3>
								</div>
							</div>

							<a href="#" class="btn btn-theme btn-lg px-4 mt-3 shadow-sm"
								@click.prevent="openClientsModal('dayReferrals')">Ver lista</a>
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
						<div class="modal-body">
							<div class="container">

								<input v-model="searchQuery" placeholder="Filtrar cliente por nombre o cédula..."
									class="form-control mb-3" />

								<p>Mostrando {{ filteredClients.length }} resultados</p>

								<table class="table text-center table-responsive">
									<thead>
										<tr>
											<th scope="col" @click="sortClients('firstName')">Cliente
												<i class="fa-solid fa-sort"></i>
											</th>
											<th scope="col" @click="sortClients('identification')">Cédula
												<i class="fa-solid fa-sort"></i>
											</th>
											<th scope="col">Suscripción</th>
											<th scope="col">Acciones</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="client in filteredClients" :key="client.id">
											<td>{{ client.firstName + ' ' + client.lastName }}</td>
											<td>{{ client.identification }}</td>
											<td v-if="!this.assigningSubscription || selectedClientId !== client.id">
												{{ client.subscription ? client.subscription.name.toUpperCase() : `Sin
												suscripcion` }}</td>
											<td v-else-if="selectedClientId === client.id">
												<select v-model="subToAssign" class="form-control mb-2">
													<option value="" disabled selected>Suscripciones</option>
													<option v-for="sub in subscriptions" :key="sub.id" :value="sub">
														{{ sub.name.toUpperCase() }}</option>
												</select>
											</td>
											<td v-if="!this.assigningSubscription">
												<button v-if="!client.subscription" class="btn btn-theme btn-sm"
													@click.prevent="loadSubscriptions(client)">
													Asignar suscripción
												</button>
											</td>
											<td v-if="this.assigningSubscription && selectedClientId === client.id">
												<button :disabled="isSubmitting" class="btn btn-theme btn-sm"
													@click.prevent="assignSubscription(client)">
													<span v-if="isSubmitting" class="spinner-border spinner-border-sm"
														role="status" aria-hidden="true"></span>
													<span v-else>Asignar</span>
												</button>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn" data-bs-dismiss="modal" aria-label="Close"
								@click.prevent="resetModal()">Cerrar</button>
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