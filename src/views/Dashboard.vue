<script>
import { db } from '@/firebase/init';
import { ref as dbRef, get, update, orderByChild, query, equalTo } from 'firebase/database';
import { useUserStore } from "@/stores/user-role";
import { Modal } from 'bootstrap';
import { toast as showToast } from '@/utils/toast';
import { sendEmail } from '@/utils/emailService';
import 'toastify-js/src/toastify.css'
import moment from 'moment';
import DashboardCard from '@/components/app/DashboardCard.vue';

export default {
	components: {
		DashboardCard
	},
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
			cachedAuthUsers: null,
			selectedCouponRequest: null,
			selectedCouponClient: null,
			selectedCouponRequestId: null
		}
	},
	computed: {
		filteredClients() {
			// If no data is provided, return empty array
			if (!this.clientsModalData) return [];

			// Create a copy of the data to filter
			let filtered = Array.isArray(this.clientsModalData)
				? [...this.clientsModalData]
				: [];

			// Apply search filter if query exists
			if (this.searchQuery) {
				const query = this.searchQuery.toLowerCase();
				filtered = filtered.filter(client => {
					// Get all searchable fields
					const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
					const identification = String(client.identification || '').toLowerCase();
					const subscriptionName = client.subscriptionName
						? client.subscriptionName.toLowerCase()
						: '';
					const email = (client.email || '').toLowerCase();

					// Return true if any field matches the search query
					return fullName.includes(query) ||
						identification.includes(query) ||
						subscriptionName.includes(query) ||
						email.includes(query);
				});
			}

			return filtered;
		},

		// Add a new computed property specifically for the requests modal
		filteredRequestsData() {
			if (!this.requestsModalData) return [];

			let filtered = [...this.requestsModalData];

			if (this.searchQuery) {
				const query = this.searchQuery.toLowerCase();
				filtered = filtered.filter(client => {
					const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
					const identification = String(client.identification || '').toLowerCase();

					return fullName.includes(query) || identification.includes(query);
				});
			}

			return filtered;
		}
	},
	methods: {
		getVenezuelanDate() {
			const venezuelanTimeZone = 'America/Caracas';
			const date = new Date().toLocaleDateString('en-CA', { timeZone: venezuelanTimeZone });
			return date; // Outputs in 'yyyy-mm-dd' format
		},
		formatDate(date) {
			if (!date) return ''; // Handle invalid dates or null values
			const d = new Date(date);
			const day = String(d.getDate()).padStart(2, '0'); // Ensure two-digit day
			const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
			const year = d.getFullYear();
			return `${day}/${month}/${year}`;
		},
		async sendNotificationEmail(emailPayload) {
			try {
				// Send email via the utility function
				const result = await sendEmail(emailPayload);

				if (result.success) {
					console.log("Email sent successfully:", result.message);
				} else {
					console.error("Failed to send email:", result.error);
				}
			} catch (error) {
				console.error('Error sending email:', error);
			}
		},
		clearDateFilter() {
			this.filterDate = null;
		},

		async fetchClients() {
			const role = 'cliente';
			const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

			try {
				this.loading = true;

				// Fetch clients from Firebase
				const snapshot = await get(clientRef);
				if (snapshot.exists()) {
					const users = snapshot.val();

					// Check if we have cached auth users
					const cachedAuthUsers = localStorage.getItem('authUsers');
					let authUsers = [];

					if (cachedAuthUsers) {
						authUsers = JSON.parse(cachedAuthUsers);
					} else {
						// Fetch auth users if not cached
						const response = await fetch("https://us-central1-rose-app-e062e.cloudfunctions.net/getAllUsers", {
							method: "GET",
							headers: {
								"Content-Type": "application/json",
							},
						});

						if (!response.ok) {
							throw new Error(`HTTP error! status: ${response.status}`);
						}

						const data = await response.json();
						authUsers = data.users;

						// Cache auth users for future use
						localStorage.setItem('authUsers', JSON.stringify(authUsers));
					}

					// Merge users from Firebase and authUsers
					this.clients = Object.entries(users).map(([uid, user]) => {
						const authUser = authUsers.find(auth => auth.uid === uid);
						return {
							uid,
							...user,
							createdAt: authUser ? authUser.creationTime : null,
						};
					});

					// Filter the clients based on different conditions
					this.verifiedClients = this.clients.filter(client => client.isVerified === true);
					this.clientsWithRequests = this.clients.filter(client => client.coupon_requests);
					this.clientsVerifyRequests = this.clients.filter(client => client.requestedVerification && !client.isVerified);
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

		// Method to filter clients by the day they were created
		fetchDayClients() {
			try {
				if (this.filterDate) {
					const day = moment(this.filterDate).startOf('day').toISOString();

					// Filter clients registered today
					this.clientsRegisteredDay = this.clients.filter(client => {
						const clientCreationDate = moment(client.createdAt);
						return clientCreationDate.isSame(day, 'day');
					});
				} else {
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
		async approveVerification(client) {
			// Comprehensive validation checks
			if (!client) {
				showToast.error('No se ha seleccionado un cliente válido.');
				return;
			}

			// Confirm action with user
			if (!confirm(`¿Está seguro de que desea verificar la identidad de ${client.firstName.charAt(0).toUpperCase() + client.firstName.slice(1)} ${client.lastName.charAt(0).toUpperCase() + client.lastName.slice(1)}?`)) {
				return;
			}

			// Validation checks before proceeding
			const validationErrors = [];

			// Check for required verification files
			if (!client.verificationFiles) {
				validationErrors.push('No se encontraron archivos de verificación.');
			} else {
				if (!client.verificationFiles['Front-ID']) {
					validationErrors.push('Falta la foto del frente de la identificación.');
				}
				if (!client.verificationFiles['Back-ID']) {
					validationErrors.push('Falta la foto del reverso de la identificación.');
				}
				if (!client.verificationFiles['Selfie']) {
					validationErrors.push('Falta la foto selfie.');
				}
			}

			// Check for valid user information
			if (!client.firstName || !client.lastName) {
				validationErrors.push('Información del usuario incompleta.');
			}

			if (!client.email) {
				validationErrors.push('No se encontró un correo electrónico para el usuario.');
			}

			// If there are validation errors, show them and stop
			if (validationErrors.length > 0) {
				const errorMessage = validationErrors.map(err => `• ${err}`).join('\n');
				showToast.error(`No se puede aprobar la verificación:\n${errorMessage}`);
				return;
			}

			try {
				// Show the loader
				this.isSubmitting = true;
				this.selectedClientId = client.uid;

				// Additional safety check
				if (!client.uid) {
					throw new Error('ID de usuario no válido');
				}

				// Prepare update data
				const updateData = {
					isVerified: true,
					verificationApprovedAt: new Date().toISOString()
				};

				// Reference to the user in the database
				const userRef = dbRef(db, `Users/${client.uid}`);

				// Perform the update
				await update(userRef, updateData);

				// Prepare email notification
				const emailPayload = {
					to: client.email,
					message: {
						subject: 'Verificación de Identidad Aprobada',
						html: `
							<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
								<h2 style="color: #6f42c1;">¡Verificación Aprobada!</h2>
								<p>Hola ${client.firstName.charAt(0).toUpperCase() + client.firstName.slice(1)},</p>
								<p>Nos complace informarte que tu verificación de identidad ha sido aprobada exitosamente.</p>
								<p>Ahora tienes acceso completo a todos los servicios de Rose Coupon.</p>
								<hr style="border: none; border-top: 1px solid #ddd;">
								<p style="font-size: 0.8em; color: #666;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
							</div>
						`,
						text: `Hola ${client.firstName}, tu verificación de identidad ha sido aprobada exitosamente.`
					}
				};

				// Send notification email
				await sendEmail(emailPayload);

				// hide modal method
				const modal = Modal.getInstance(document.getElementById('idImgModal'));
				if (modal) {
					modal.hide();
				}

				// Success toast
				showToast.success(`Verificación de ${client.firstName.charAt(0).toUpperCase() + client.firstName.slice(1)} ${client.lastName.charAt(0).toUpperCase() + client.lastName.slice(1)} aprobada.`);

				// Refresh the verification requests list
				await this.fetchClients();
				this.requestsModalData = this.clientsVerifyRequests.filter(client => client.requestedVerification === true && !client.isVerified);

			} catch (error) {
				console.error("Error approving verification:", error);

				// Detailed error handling
				const errorMessage = error.message || 'Error desconocido al aprobar la verificación';
				showToast.error(`No se pudo completar la verificación: ${errorMessage}`);

			} finally {
				// Always reset these states
				this.isSubmitting = false;
				this.selectedClientId = null;
			}
		},
		async rejectVerification(client) {
			try {
				this.isSubmitting = true;
				this.selectedClientId = client.uid;

				// Update verification status in the database
				const userRef = dbRef(db, `Users/${client.uid}`);
				await update(userRef, {
					requestedVerification: null,
					// Don't change isVerified status if it was already verified
				});

				// Send an email notification to the client
				const emailPayload = {
					to: client.email,
					message: {
						subject: "Verificación Denegada",
						text: `Hola ${client.firstName}, tu solicitud de verificación ha sido denegada. Por favor, intenta nuevamente con documentos más claros.`,
					},
				};
				await this.sendNotificationEmail(emailPayload);

				// Hide the modal if it's open
				const modal = Modal.getOrCreateInstance(document.getElementById('clientImgModal'));
				if (modal._isShown) {
					modal.hide();
				}

				showToast.success('Verificación denegada.');

				// Refresh the verification requests list
				await this.fetchClients();
				this.clientsVerifyRequests = this.clients.filter(client => client.requestedVerification === true);

				// Update the modal data if it's open
				if (this.requestsModalTitle === 'Solicitudes de Verificación') {
					this.requestsModalData = this.clientsVerifyRequests;
				}
			} catch (error) {
				console.error("Error rejecting verification:", error);
				showToast.error('Error al denegar la verificación');
			} finally {
				this.isSubmitting = false;
				this.selectedClientId = null;
			}
		},

		showCouponRequest(client) {
			if (!client.coupon_requests) {
				console.error("No coupon requests found for this client");
				return;
			}
			// Convert coupon_requests object into an array with the keys
			const requests = Object.keys(client.coupon_requests).map(key => ({
				id: key,
				...client.coupon_requests[key]
			}));

			this.selectedRequestsClient = { ...client, coupon_requests: requests };

			const modal = Modal.getOrCreateInstance(document.getElementById('couponRequestModal'));
			modal.show();
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

						// Check if cached auth users are available
						if (this.cachedAuthUsers) {
							// Use cached data if it's available
							this.processReferralClients(referralIds, this.cachedAuthUsers);
						} else {
							// If not cached, call the function once and cache the result
							const cachedAuthUsers = await this.fetchAuthUsers();
							this.processReferralClients(referralIds, cachedAuthUsers);
						}
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
		async fetchAuthUsers() {
			const cachedUsers = localStorage.getItem('authUsers');
			if (cachedUsers) {
				// If cached data exists, parse and use it
				this.cachedAuthUsers = JSON.parse(cachedUsers);
				return this.cachedAuthUsers;
			}

			// Fetch data from the cloud function if no cached data
			const response = await fetch("https://us-central1-rose-app-e062e.cloudfunctions.net/getAllUsers", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const authUsers = await response.json();
			this.cachedAuthUsers = authUsers.users;

			// Store the fetched data in localStorage for persistent caching
			localStorage.setItem('authUsers', JSON.stringify(this.cachedAuthUsers));

			return this.cachedAuthUsers;
		},
		async processReferralClients(referralIds, cachedAuthUsers) {
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

						// Find the corresponding auth user data
						const authUser = cachedAuthUsers.find(user => user.uid === referralId);

						if (authUser) {
							referralData.createdAt = authUser.creationTime;  // Using the data from auth
						}

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

			// Await all referral promises and filter out nulls
			this.referralClients = (await Promise.all(referralPromises)).filter(client => client !== null);
		},
		// Method to filter referrals by date
		async fetchDayReferrals() {
			try {
				if (this.filterDate) {
					// Normalize the filter date to the start of the day
					const day = moment(this.filterDate).startOf('day').toISOString();

					// Filter referral clients based on createdAt date
					const filteredReferrals = this.referralClients.filter(client => {
						// Check if createdAt exists and is a valid date
						const clientCreationDate = moment(client.createdAt);

						// Ensure client has a valid creation date
						return clientCreationDate.isValid() && clientCreationDate.isSame(day, 'day');
					});

					// Update the referrals list
					this.dayReferrals = filteredReferrals;
				} else {
					// If no filter date is selected, clear the filtered list
					this.dayReferrals = [];
				}
			} catch (error) {
				console.error('Error filtering referrals:', error);
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

				showToast.success('Suscripción activada!');

				// Reset state
				this.resetModal();
				const modal = Modal.getOrCreateInstance(document.getElementById('clientsModal'));
				modal.hide();

			} catch (error) {
				console.error('Error assigning plan:', error);
				showToast.error('La activación de la suscripción falló.');
			} finally {
				this.isSubmitting = false;
			}

		},
		resetModal() {
			this.assigningSubscription = false;
			this.fetchCurrentUserData();
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
			this.fetchDayClients();
			await this.fetchAffiliates();
			await this.fetchCoupons();
		}

		if (this.role === 'mesero' || this.role === 'promotora') {
			await this.fetchCurrentUserData();
			this.fetchDayReferrals();
		}
	}
}
</script>
<template>
	<div class="container">
		<!-- Admin Dashboard -->
		<div v-if="this.role === 'admin'">
			<!-- Header Section -->
			<div class="dashboard-header mb-4">
				<div class="row align-items-center">
					<div class="col-md-8">
						<h2 class="fw-bold mb-0">Hola, {{ userName }} 🎉</h2>
						<p class="text-muted small mb-0">Aquí está un resumen de tu App</p>
					</div>
				</div>
			</div>

			<!-- Stats Cards -->
			<div class="row g-3">
				<!-- Total Clients Card -->
				<div class="col-12 col-sm-6 col-lg-4">
					<DashboardCard :loading="loading" title="Total de Clientes" icon="fa-user" :value="clients.length"
						:actions="[
							{
								text: 'Ir a Clientes',
								isRoute: true,
								route: '/clientes'
							}
						]" />
				</div>

				<!-- Clientes registrados el dia... -->
				<div class="col-12 col-sm-6 col-lg-4">
					<div class="dashboard-card">
						<div class="icon-container">
							<i class="fa fa-user"></i>
						</div>
						<h6 class="card-title text-white mb-2">Clientes Registrados El Día</h6>
						<div class="date-filter mb-3">
							<input type="date" v-model="filterDate" class="form-control" @change="fetchDayClients" />
						</div>
						<div class="mt-1">
							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
							<h4 v-else class="fw-bold mb-2">{{ clientsRegisteredDay.length || 0 }}</h4>
						</div>
					</div>
				</div>

				<!-- Clientes verificados -->
				<div class="col-12 col-sm-6 col-lg-4">
					<DashboardCard :loading="loading" title="Clientes Verificados" icon="fa-check-circle"
						:value="verifiedClients.length" :actions="[
							{
								text: 'Ir a Clientes',
								isRoute: true,
								route: '/clientes'
							}
						]" />
				</div>

				<!-- Comercios Afiliados -->
				<div class="col-12 col-sm-6 col-lg-4">
					<DashboardCard :loading="loading" title="Comercios Afiliados" icon="fa-store"
						:value="affiliates.length" :actions="[
							{
								text: 'Ir a Comercios',
								isRoute: true,
								route: '/comercios-afiliados'
							}
						]" />
				</div>

				<!-- Cupones aplicados -->
				<div class="col-12 col-sm-6 col-lg-4">
					<DashboardCard :loading="loading" title="Cupones Aplicados" icon="fa-ticket-alt"
						:value="appliedCoupons" />
				</div>

				<!-- Solicitudes de cupones -->
				<div class="col-12 col-sm-6 col-lg-4">
					<DashboardCard :loading="loading" title="Solicitudes de Cupones" icon="fa-bell"
						:value="clientsWithRequests.length" :actions="[
							{
								text: 'Ver solicitudes',
								isButton: true,
								class: 'btn-theme btn-sm',
								onClick: () => openRequestsModal('couponRequests')
							}
						]" />
				</div>

				<!-- Verification Requests Card -->
				<div class="col-12 col-sm-6 col-lg-4">
					<DashboardCard :loading="loading" title="Solicitudes de Verificación" icon="fa-id-card"
						:value="clientsVerifyRequests.length" :actions="[
							{
								text: 'Ver solicitudes',
								isButton: true,
								class: 'btn-theme btn-sm',
								onClick: () => openRequestsModal('verificationRequests')
							}
						]" />
				</div>
			</div>
		</div>

		<!-- Mesero/Promotora Dashboard -->
		<div v-if="this.role === 'mesero' || this.role === 'promotora'">
			<!-- Header Section -->
			<div class="dashboard-header mb-4">
				<div class="row align-items-center">
					<div class="col-md-8">
						<h2 class="fw-bold mb-0">Hola, trabajador 🎉</h2>
						<p class="text-muted small mb-0">Aquí está un resumen de tu actividad</p>
					</div>
				</div>
			</div>

			<!-- Stats Cards -->
			<div class="row g-3">
				<!-- Código de Referido -->
				<div class="col-12 col-sm-6 col-lg-3">
					<div class="dashboard-card">
						<div class="icon-container">
							<i class="fa fa-qrcode"></i>
						</div>
						<h6 class="card-title text-white mb-2">Tu código de Referido</h6>
						<div class="mt-1">
							<h4 class="fw-bold mb-2">{{ this.userDetails?.codigoReferido || 'N/A' }}</h4>
						</div>
						<div class="mt-2">
							<h6 class="text-muted">Rol</h6>
							<span class="badge bg-success px-3 py-2 fs-5">
								{{ this.role.charAt(0).toUpperCase() + this.role.slice(1) }}
							</span>
						</div>
					</div>
				</div>

				<!-- Clientes Referidos -->
				<div class="col-12 col-sm-6 col-lg-3">
					<DashboardCard :loading="loading" title="Clientes Referidos" icon="fa-users"
						:value="referralClients.length" 
						:actions="[
							{
								text: 'Ver lista',
								isButton: true,
								class: 'btn-theme btn-sm',
								onClick: () => openClientsModal('referralClients')
							}
						]" />
				</div>

				<!-- Clientes Referidos el día -->
				<div class="col-12 col-sm-6 col-lg-3">
					<div class="dashboard-card">
						<div class="icon-container">
							<i class="fa fa-calendar-day"></i>
						</div>
						<h6 class="card-title text-white mb-2">Clientes Referidos el día</h6>
						<div class="date-filter mb-3">
							<input type="date" v-model="filterDate" class="form-control" @change="fetchDayReferrals" />
						</div>
						<div class="mt-1">
							<span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
							<h4 v-else class="fw-bold mb-2">{{ this.dayReferrals.length || 0 }}</h4>
						</div>
						<div class="mt-2">
							<a href="#" class="btn btn-theme btn-sm" @click.prevent="openClientsModal('dayReferrals')">
								Ver lista
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Clients Modal -->
		<div class="modal fade" id="clientsModal" tabindex="-1" aria-labelledby="clientsModalLabel" aria-hidden="true">
			<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="clientsModalLabel">Clientes referidos</h5>
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
											suscripcion` }}
										</td>
										<td v-else-if="selectedClientId === client.id">
											<select v-model="subToAssign" class="form-control mb-2">
												<option value="" disabled selected>Suscripciones</option>
												<option v-for="sub in subscriptions" :key="sub.id" :value="sub">
													{{ sub.name.toUpperCase() }}
												</option>
											</select>
										</td>
										<td v-if="!this.assigningSubscription">
											<button v-if="!client.subscription" class="btn btn-outline-theme btn-sm"
												@click.prevent="loadSubscriptions(client)">
												Asignar suscripción
											</button>
										</td>
										<td v-if="this.assigningSubscription && selectedClientId === client.id">
											<button :disabled="isSubmitting" class="btn btn-outline-theme btn-sm"
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
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal" aria-label="Close"
							@click.prevent="resetModal()">Cerrar</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Requests Modal -->
		<div class="modal fade" id="requestsModal" tabindex="-1" aria-labelledby="requestsModalLabel"
			aria-hidden="true">
			<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="requestsModalLabel">
							<i class="fas"
								:class="requestsModalTitle.includes('Cupones') ? 'fa-ticket-alt' : 'fa-id-card'"></i>
							{{ requestsModalTitle }}
						</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<!-- Search Bar -->
						<div class="search-bar mb-4">
							<div class="input-group">
								<span class="input-group-text">
									<i class="fas fa-search"></i>
								</span>
								<input type="text" class="form-control" v-model="searchQuery"
									placeholder="Buscar por nombre o cédula..." />
							</div>
						</div>

						<!-- Requests Table/Cards -->
						<div class="requests-container">
							<!-- Desktop Table View -->
							<div class="table-responsive d-none d-md-block">
								<table class="table align-middle">
									<thead>
										<tr>
											<th>Cliente</th>
											<th>Cédula</th>
											<th>Acciones</th>
										</tr>
									</thead>
									<tbody>
										<template v-if="filteredRequestsData.length">
											<tr v-for="client in filteredRequestsData" :key="client.uid">
												<td>{{ client.firstName + ' ' + client.lastName }}</td>
												<td>V-{{ client.identification }}</td>
												<td>
													<div class="d-flex gap-2">
														<!-- Verification Actions -->
														<template
															v-if="requestsModalTitle === 'Solicitudes de Verificación'">
															<button class="btn btn-outline-info btn-sm"
																@click.prevent="showIDfiles(client)">
																<i class="fas fa-id-card me-1"></i>
																Ver documentos
															</button>
														</template>

														<!-- Coupon Actions -->
														<template
															v-else-if="requestsModalTitle === 'Solicitudes de Cupones'">
															<button class="btn btn-outline-info btn-sm"
																@click.prevent="showCouponRequest(client)">
																<i class="fas fa-search me-1"></i>
																Ver solicitud
															</button>
															<button class="btn btn-outline-success btn-sm"
																@click.prevent="assignCoupon(client)">
																<i class="fas fa-check me-1"></i>
																Asignar
															</button>
														</template>
													</div>
												</td>
											</tr>
										</template>
										<tr v-else>
											<td colspan="3" class="text-center py-4">
												<div class="empty-state">
													<i class="fas fa-inbox mb-3"></i>
													<h6 class="mb-1">No hay solicitudes</h6>
													<p class="text-muted mb-0">
														{{ searchQuery ? `No se encontraron resultados` : `No hay
														solicitudes pendientes` }}
													</p>
												</div>
											</td>
										</tr>
									</tbody>
								</table>
							</div>

							<!-- Mobile Card View -->
							<div class="d-md-none">
								<template v-if="filteredRequestsData.length">
									<div class="request-card" v-for="client in filteredRequestsData" :key="client.uid">
										<div class="card mb-3">
											<div class="card-body">
												<h6 class="card-title">
													{{ client.firstName + ' ' + client.lastName }}
												</h6>
												<p class="card-subtitle mb-3">V-{{ client.identification }}</p>

												<div class="d-flex gap-2 justify-content-center">
													<!-- Verification Actions -->
													<template
														v-if="requestsModalTitle === 'Solicitudes de Verificación'">
														<button class="btn btn-outline-info btn-sm"
															@click.prevent="showIDfiles(client)">
															<i class="fas fa-id-card"></i>
															Ver
														</button>
													</template>

													<!-- Coupon Actions -->
													<template
														v-else-if="requestsModalTitle === 'Solicitudes de Cupones'">
														<button class="btn btn-outline-info btn-sm"
															@click.prevent="showCouponRequest(client)">
															<i class="fas fa-search"></i>
															Ver
														</button>
														<button class="btn btn-outline-success btn-sm"
															@click.prevent="assignCoupon(client)">
															<i class="fas fa-check"></i>
															Asignar
														</button>
													</template>
												</div>
											</div>
										</div>
									</div>
								</template>
								<div v-else class="empty-state-mobile text-center py-4">
									<i class="fas fa-inbox mb-3"></i>
									<h6 class="mb-1">No hay solicitudes</h6>
									<p class="text-muted mb-0">
										{{ searchQuery ? `No se encontraron resultados` : `No hay solicitudes
										pendientes` }}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal for opening image -->
		<div v-if="clientImgModal" class="modal fade" id="idImgModal" tabindex="-1" aria-labelledby="idImgModalLabel"
			aria-hidden="true">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="idImgModalLabel">{{ clientImgModal.firstName }} {{
							clientImgModal.lastName }}
						</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
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
					<div class="modal-footer">
						<div class="d-flex justify-content-center gap-3">
							<button class="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
								@click="approveVerification(clientImgModal)" :disabled="isSubmitting">
								<i class="fa-solid fa-check"></i>
								<span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<span v-else>Aprobar</span>
							</button>
							<button class="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
								@click="rejectVerification(clientImgModal)" :disabled="isSubmitting">
								<i class="fa-solid fa-times"></i>
								<span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<span v-else>Denegar</span>
							</button>
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
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<style scoped>
/* icon circle */
.icon-circle {
	width: 64px;
	height: 64px;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
	transition: all 0.3s ease;
}

.icon-circle:hover {
	transform: scale(1.05);
}

/* Dashboard header styles */
.dashboard-header {
	padding-bottom: 1rem;
	margin-bottom: 1.5rem;
	border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* Card styling improvements */
.dashboard-card {
	background-color: #2d2d2d;
	border-radius: 12px;
	padding: 1.25rem;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	transition: transform 0.2s ease;
}

.dashboard-card:hover {
	transform: translateY(-2px);
}

.dashboard-card .icon-container {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background-color: rgba(128, 0, 128, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 0.75rem;
}

.dashboard-card .icon-container i {
	font-size: 1rem;
	color: purple;
}

.dashboard-card h6 {
	font-size: 0.875rem;
	margin-bottom: 0.5rem;
}

.dashboard-card h4 {
	font-size: 1.5rem;
	margin-bottom: 0.75rem;
}

/* Date filter styling */
.date-filter {
	width: 100%;
	max-width: 200px;
}

.date-filter .form-control {
	border-radius: 8px;
	border: 1px solid rgba(0, 0, 0, 0.1);
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

/* Modal styling */
.modal-content {
	border: none;
	border-radius: 12px;
	background-color: #1a1a1a;
}

.modal-header {
	border-bottom: 1px solid #333;
	padding: 1rem 1.5rem;
}

.modal-header .modal-title {
	display: flex;
	align-items: center;
	gap: 10px;
	color: #fff;
}

.modal-body {
	padding: 1.5rem;
}

/* Search Bar */
.search-bar .input-group {
	border-radius: 8px;
	overflow: hidden;
}

.search-bar .input-group-text {
	background-color: #333;
	border: none;
	color: #fff;
}

.search-bar .form-control {
	background-color: #333;
	border: none;
	color: #fff;
}

.search-bar .form-control:focus {
	box-shadow: none;
	background-color: #444;
}

/* Table Styles */
.table {
	color: #fff;
}

.table> :not(caption)>*>* {
	background-color: transparent;
	border-bottom-color: #333;
}

.table thead th {
	background-color: #333;
	border: none;
	padding: 1rem;
}

/* Card Styles for Mobile */
.request-card .card {
	background-color: #333;
	border: none;
	border-radius: 8px;
}

.request-card .card-body {
	padding: 1rem;
}

.request-card .card-title {
	color: #fff;
	margin-bottom: 0.5rem;
}

.request-card .card-subtitle {
	color: #aaa;
	font-size: 0.9rem;
}

/* Responsive Adjustments */
@media (max-width: 992px) {
	.dashboard-card {
		padding: 1rem;
	}

	.dashboard-card .icon-container {
		width: 36px;
		height: 36px;
	}

	.dashboard-card .icon-container i {
		font-size: 0.875rem;
	}

	.dashboard-card h4 {
		font-size: 1.25rem;
	}
}

@media (max-width: 576px) {
	.dashboard-card {
		padding: 0.875rem;
	}

	.dashboard-card .icon-container {
		width: 32px;
		height: 32px;
	}

	.dashboard-card h6 {
		font-size: 0.8125rem;
	}
}

/* Scrollbar Styles */
.modal-dialog-scrollable .modal-content {
	max-height: 85vh;
}

.modal-body::-webkit-scrollbar {
	width: 6px;
}

.modal-body::-webkit-scrollbar-track {
	background: #1a1a1a;
}

.modal-body::-webkit-scrollbar-thumb {
	background: #444;
	border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
	background: #555;
}

/* Empty state styles */
.empty-state,
.empty-state-mobile {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 2rem 1rem;
}

.empty-state i,
.empty-state-mobile i {
	font-size: 2rem;
	color: #666;
	margin-bottom: 1rem;
}

.empty-state h6,
.empty-state-mobile h6 {
	color: #fff;
	font-size: 1rem;
	margin-bottom: 0.5rem;
}

.empty-state p,
.empty-state-mobile p {
	color: #888;
	font-size: 0.875rem;
}

/* Mobile specific styles */
.empty-state-mobile {
	background-color: #2d2d2d;
	border-radius: 8px;
	margin: 0.5rem;
}

/* Table empty state specific */
.table td.text-center .empty-state {
	padding: 1.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.empty-state-mobile {
		padding: 1.5rem 1rem;
	}

	.empty-state-mobile i {
		font-size: 1.75rem;
	}

	.empty-state-mobile h6 {
		font-size: 0.9375rem;
	}

	.empty-state-mobile p {
		font-size: 0.8125rem;
	}
}
</style>