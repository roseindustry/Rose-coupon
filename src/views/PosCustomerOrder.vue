<script>
import { RouterLink } from 'vue-router';
import { db, auth, functions } from '@/firebase/init';
import { httpsCallable } from 'firebase/functions';
import { signOut } from 'firebase/auth';
import { ref as dbRef, query, orderByChild, equalTo, push, set, get, update } from 'firebase/database';
import { useAppOptionStore } from '@/stores/app-option';
import { useTenancyStore } from '@/stores/tenancy';
import { useUserStore } from '@/stores/user-role';
import { getSubdomain } from '@/utils/subdomain';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import moment from 'moment';
import { messaging } from '@/firebase/init';
import { getToken } from 'firebase/messaging';

const appOption = useAppOptionStore();

// Helper function defined outside the component export
function isISODateString(dateString) {
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(dateString);
}

export default {
	data() {
		return {
			menu: [],
			filteredMenuItems: [],
			categories: [],
			order: [],
			orderSummary: [],
			orderHistory: [],
			nextOrderNumber: null,
			tableNumber: '',
			modal: null,
			modalData: null,
			modalQuantity: 1,
			modalSelectedSize: '',
			modalSelectedAddon: [],
			mobileSidebarToggled: false,
			addTip: false,
			tip: null,
			isTakeaway: false,
			today: '',
			selectedMenuItems: [],
			tenantId: null,
			searchQuery: '',
			selectedClient: '',
			searchResults: [],
			addNewClient: false,
			// In case of new client
			firstName: '',
			lastName: '',
			identification: '',
			email: '',
			phoneNumber: '',
			password: '',
			role: 'cliente'
		}
	},
	async created() {
		await this.initializeTenant();
		await Promise.all([this.fetchCategories(), this.fetchMenuItems()]);
		this.fetchOrderHistory();
		this.fetchLastOrderNumber();
	},
	watch: {
		addTip(newValue) {
			if (!newValue) {
				this.tip = 0;
			}
		},
	},
	computed: {
		userRole() {
			const userStore = useUserStore();
			return userStore.role;
		},
	},
	async mounted() {
		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		appOption.appContentClass = 'p-0';
		appOption.appContentFullHeight = true;

		const now = moment();
		this.today = now.toISOString();

		const userStore = useUserStore();
		userStore.fetchUser();
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
		appOption.appContentFullHeight = false;
	},
	methods: {
		async initializeTenant() {
			const tenancyStore = useTenancyStore();
			this.subdomain = getSubdomain();
			await tenancyStore.findOrCreateTenant(this.subdomain);
			if (tenancyStore.tenant) {
				this.tenantId = tenancyStore.tenant.key;
				this.tenantName = tenancyStore.tenant.name;
			} else {
				console.error("Tenant could not be found or created");
			}
		},
		async fetchLastOrderNumber() {
			if (!this.tenantId) return;

			const ordersRef = query(dbRef(db, 'Orders'), orderByChild('tenant_id'), equalTo(this.tenantId));
			const snapshot = await get(ordersRef);
			let lastOrderNumber = 0; // set to 0 if no orders exist

			snapshot.forEach((childSnapshot) => {
				const order = childSnapshot.val();
				if ('orderNumber' in order && order.tenant_id === this.tenantId) {
					lastOrderNumber = Math.max(lastOrderNumber, order.orderNumber);
				}
			});
			this.nextOrderNumber = lastOrderNumber + 1; // Prepare for the next order number
		},
		toggleMobileSidebar: function () {
			this.mobileSidebarToggled = !this.mobileSidebarToggled;
		},
		getOrderTotal: function () {
			return (this.order) ? this.order.length : 0;
		},
		getSubTotalPrice: function () {
			var value = 0;
			for (var i = 0; i < this.order.length; i++) {
				value += parseFloat(this.order[i].price) * parseInt(this.order[i].quantity);
			}
			return value.toFixed(2);
		},
		getTaxesPrice: function () {
			var value = 0;
			for (var i = 0; i < this.order.length; i++) {
				value += parseFloat(this.order[i].price) * parseInt(this.order[i].quantity) * .06;
			}
			return value.toFixed(2);
		},
		getTotalPrice: function () {
			var value = 0;
			for (var i = 0; i < this.order.length; i++) {
				value += parseFloat(this.order[i].price) * parseInt(this.order[i].quantity);
				value += parseFloat(this.order[i].price) * parseInt(this.order[i].quantity) * .06;
			}
			if (this.tip) {
				value += this.tip;
			}
			return value.toFixed(2);
		},
		getOrderHistoryTotal: function () {
			return (this.orderHistory) ? this.orderHistory.length : 0;
		},
		deductQty: function (event, id) {
			event.preventDefault();
			for (var i = 0; i < this.order.length; i++) {
				if (this.order[i].id == id) {
					var newQty = parseInt(this.order[i].quantity) - 1;

					if (newQty < 1) {
						newQty = 1;
					}
					this.order[i].quantity = newQty;
				}
			}
		},
		addQty: function (event, id) {
			event.preventDefault();

			for (var i = 0; i < this.order.length; i++) {
				if (this.order[i].id == id) {
					var newQty = parseInt(this.order[i].quantity) + 1;

					this.order[i].quantity = newQty;
				}
			}
		},
		async fetchMenuItems() {
			const menuItemRef = query(dbRef(db, 'MenuItems'), orderByChild('tenant_id'), equalTo(this.tenantId));
			const menuItemSnapshot = await get(menuItemRef);

			if (menuItemSnapshot.exists()) {
				this.menu = [];
				const menuItemPromises = [];

				menuItemSnapshot.forEach((childSnapshot) => {
					const menuItemData = childSnapshot.val();
					const itemIngredients = menuItemData.ingredients || [];

					// Set a promise to fetch ingredients for this menuItem
					const ingredientsPromise = Promise.all(itemIngredients.map(async (ingredient) => {
						const ingredientRef = dbRef(db, `Ingredients/${ingredient.id}`);
						const ingredientSnapshot = await get(ingredientRef);
						if (ingredientSnapshot.exists()) {
							// Merge the database ingredient details with the existing ingredient data (including quantity)
							const ingredientData = ingredientSnapshot.val();
							return { ...ingredientData, quantity: ingredient.quantity };
						} else {
							return null;
						}
					})).then(ingredients => {
						return ingredients.filter(ingredient => ingredient !== null);
					});

					menuItemPromises.push(ingredientsPromise.then(ingredients => {
						return {
							id: childSnapshot.key,
							category_id: menuItemData.category_id,
							image: menuItemData.image,
							name: menuItemData.name,
							description: menuItemData.description,
							sellingPrice: menuItemData.sellingPrice,
							status: menuItemData.status,
							ingredients: ingredients
						};
					}));
				});
				// Wait for all menuItem promises to resolve
				const menuItemsWithIngredients = await Promise.all(menuItemPromises);
				this.menu = menuItemsWithIngredients;

				// Filter menu items based on the active category after fetching
				if (this.categories.length > 0) {
					const activeCategory = this.categories.find(c => c.active);
					if (activeCategory) {
						this.filterMenuItemsByCategory(activeCategory.id);
					}
				}
			} else {
				console.log("No data available");
			}
		},
		async fetchCategories() {
			const categoriesRef = query(dbRef(db, 'Categories'), orderByChild('tenant_id'), equalTo(this.tenantId));
			const categorySnapshot = await get(categoriesRef);

			if (categorySnapshot.exists()) {
				this.categories = [];
				categorySnapshot.forEach((childSnapshot) => {
					const categoryData = childSnapshot.val();
					this.categories.push({
						id: childSnapshot.key,
						name: categoryData.name,
						active: false, // Initially set all to inactive
					});
				});
				// Set the first category as active
				if (this.categories.length > 0) {
					this.categories[0].active = true;
				}
			} else {
				console.log("No data available");
			}

		},
		async fetchOrderHistory() {
			const ordersRef = query(dbRef(db, 'Orders'), orderByChild('tenant_id'), equalTo(this.tenantId));
			const ordersSnapshot = await get(ordersRef);

			if (ordersSnapshot.exists()) {
				const orderPromises = [];
				this.orderHistory = [];

				const startOfDay = moment().startOf('day');
				const endOfDay = moment().endOf('day');

				ordersSnapshot.forEach((childSnapshot) => {
					const orderData = childSnapshot.val();

					// Format date
					let orderDate;
					if (isISODateString(orderData.orderDate)) {
						// ISO string format
						orderDate = moment(orderData.orderDate);
					} else {
						// 'DD/MM/YYYY' format or other non-ISO string
						orderDate = moment(orderData.orderDate, 'DD/MM/YYYY');
					}

					if (orderDate.isBetween(startOfDay, endOfDay, null, '[]')) {
						const clientDetailsPromise = get(dbRef(db, `Users/${orderData.client_id}`)).then(clientSnapshot => {
							let clientName = 'Unknown';
							let clientCedula = '';
							if (clientSnapshot.exists()) {
								const clientData = clientSnapshot.val();
								clientName = `${clientData.firstName} ${clientData.lastName}`;
								clientCedula = clientData.identification;
							}
							return {
								...orderData,
								orderDate,
								clientName,
								clientCedula,
								id: childSnapshot.key,
							};
						});
						orderPromises.push(clientDetailsPromise);
					}
				});

				const enrichedOrders = await Promise.all(orderPromises);
				this.orderHistory = enrichedOrders.map(order => ({
					id: order.id,
					orderNumber: order.orderNumber,
					tableNumber: order.tableNumber,
					date: moment(order.orderDate).format('DD/MM/YYYY'),
					type: order.type,
					totalPricePaid: order.totalPricePaid,
					menuItems: order.menuItems,
					clientName: order.clientName,
					clientCedula: order.clientCedula,
				}));
			} else {
				console.log("No data available");
				this.orderHistory = [];
			}
		},
		setActiveCategory(index) {
			// Set all categories to inactive
			this.categories.forEach(category => {
				category.active = false;
			});
			// Set the clicked category to active
			this.categories[index].active = true;

			// Filter the menu items based on the active category
			this.filterMenuItemsByCategory(this.categories[index].id);
		},
		filterMenuItemsByCategory(categoryId) {
			this.filteredMenuItems = this.menu.filter(menuItem => menuItem.category_id === categoryId);
		},
		generateStars(rating) {
			let stars = [];
			for (let i = 1; i <= 5; i++) {
				stars.push({ filled: i <= rating });
			}
			return stars;
		},
		showFoodModal: function (event, id) {
			event.preventDefault();

			const menuItem = this.menu.find(item => item.id == id);
			if (menuItem) {
				this.modalData = menuItem;

				if (this.modalData.options && this.modalData.options.size) {
					this.modalSelectedSize = this.modalData.options.size[0].text;
				}
				this.modalQuantity = 1;
				this.modalSelectedAddon = [];
				this.modal = new Modal(this.$refs.modalPosItem);
				this.modal.show();
			}
		},
		addModalQty: function (event) {
			event.preventDefault();

			this.modalQuantity = this.modalQuantity + 1;
		},
		deductModalQty: function (event) {
			event.preventDefault();

			var newQty = parseInt(this.modalQuantity) - 1;

			if (newQty < 1) {
				newQty = 1;
			}
			this.modalQuantity = newQty;
		},
		addToOrder: function (event) {
			event.preventDefault();
			this.modal.hide();

			if (!this.modalData.status) {
				Toastify({
					text: "No disponible",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #D32E0B, #FFDBD3)",
					},
				}).showToast();
				return;
			}
			//USE THIS LOGIC IN CASE OF MENU SIZE AND ADD-ON OPTIONS 
			// var options = [];
			// var extraPrice = 0;
			// if (this.modalSelectedSize) {
			// 	var option = {
			// 		"key": "size",
			// 		"value": this.modalSelectedSize
			// 	};
			// 	options.push(option);
			// }
			// if (this.modalSelectedAddon) {
			// 	for (var i = 0; i < this.modalSelectedAddon.length; i++) {
			// 		var option = {
			// 			"key": "addon",
			// 			"value": this.modalSelectedAddon[i]
			// 		};
			// 		options.push(option);
			// 	}
			// }

			// Preparing the ingredients with the required quantity multiplied by the order quantity

			const ingredientsRequired = this.modalData.ingredients.map(ingredient => {
				return {
					id: ingredient.id,
					name: ingredient.name,
					quantityRequired: ingredient.quantity * this.modalQuantity
				};
			});

			// Add the order with ingredients included
			this.order.push({
				"id": this.modalData.id,
				"image": this.modalData.image,
				"name": this.modalData.name,
				"price": this.modalData.sellingPrice,
				"quantity": this.modalQuantity,
				"ingredients": ingredientsRequired
			});

			setTimeout(() => {
				if (this.$refs.posSidebarBody && this.$refs.posSidebarBody.$el) {
					this.$refs.posSidebarBody.$el.scrollTop = this.$refs.posSidebarBody.$el.scrollHeight;
					if (this.$refs.posSidebarBody.ps) {
						this.$refs.posSidebarBody.ps.update();
					}
				}
			}, 500);
		},
		toggleConfirmation: function (event, id, value) {
			event.preventDefault();

			for (var i = 0; i < this.order.length; i++) {
				if (this.order[i].id == id) {
					this.order[i].confirmation = value;
				}
			}
		},
		removeOrder: function (event, id) {
			event.preventDefault();

			for (var i = 0; i < this.order.length; i++) {
				if (this.order[i].id == id) {
					this.order.splice(i, 1);
				}
			}
		},
		submitOrderToKitchen() {
			// Check if the order array is empty and show a toast if true
			if (this.order.length === 0) {
				Toastify({
					text: "Orden vacía",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #ff5f6d, #ffc371)",
					},
				}).showToast();
				return;
			}

			const orderDate = this.today;
			const orderNumber = this.nextOrderNumber;
			const tableNumber = this.tableNumber;
			const totalPricePaid = parseFloat(this.getTotalPrice());
			const status = 'Pending';
			const type = this.isTakeaway ? 'Takeaway' : 'DineIn';
			const tip = this.tip;

			// Prepare the order object
			const submission = {
				tenant_id: this.tenantId,
				// client_id: clientId, // Uncomment and set accordingly
				orderDate,
				orderNumber,
				tableNumber,
				status,
				type,
				menuItems: this.order.map(item => ({
					id: item.id,
					name: item.name,
					price: item.price,
					quantity: item.quantity,
					totalPricePerItem: item.price * item.quantity,
					ingredients: item.ingredients ? item.ingredients.map(ingredient => ({
						id: ingredient.id,
						name: ingredient.name,
						quantityRequired: ingredient.quantityRequired,
					})) : [] // Default to an empty array if no ingredients are present
				})),
				totalPricePaid,
				tip
			};

			if (!this.nextOrderNumber) {
				Toastify({
					text: "Debe ingresar un numero de orden",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #000232, #96c93d)",
					},
				}).showToast();
				return; // Stop execution if validation fails
			}

			this.orderSummary = submission;
			this.showConfirmationModal();
		},
		showConfirmationModal() {
			const confirmationModal = new Modal(this.$refs.confirmationModal);
			confirmationModal.show();
		},
		confirmOrder() {
			// Validate client_id is specified
			if (!this.selectedClient || !this.selectedClient.uid) {
				console.error('Client ID is not specified.');
				// Display an error message to the user
				Toastify({
					text: "Error: Cliente no especificado.",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #D32F2F, #F44336)",
					},
				}).showToast();
				return; // Stop execution if client_id is not present
			}

			// Validate orderSummary has the necessary information (customize as needed)
			if (!this.orderSummary || Object.keys(this.orderSummary).length === 0) {
				console.error('Order summary is not properly formed.');
				// Display an error message to the user
				Toastify({
					text: "Error: Resumen de orden no válido.",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #D32F2F, #F44336)",
					},
				}).showToast();
				return; // Stop execution if orderSummary is not valid
			}
			// Prepare a list of stock update promises
			const stockUpdatePromises = this.orderSummary.menuItems.flatMap(item =>
				item.ingredients.map(ingredient => {
					const ingredientRef = dbRef(db, `Ingredients/${ingredient.id}`);
					return get(ingredientRef).then(snapshot => {
						if (snapshot.exists()) {
							const ingredientData = snapshot.val();
							const currentStock = Number(ingredientData.stock);
							const quantityRequired = Number(ingredient.quantityRequired); // Make sure to use the corrected property
							if (isNaN(currentStock) || isNaN(quantityRequired)) {
								console.error(`Error updating stock: currentStock or quantityRequired is NaN for ingredient ${ingredient.id}`);
								return Promise.reject(new Error(`Invalid stock or quantity for ingredient ${ingredient.id}`));
							}
							const newStock = currentStock - quantityRequired;

							if (newStock < 0) {
								console.warn(`Warning: Attempted to reduce stock below zero for ingredient ${ingredient.id}.`);
								return Promise.reject(new Error(`Attempted to reduce stock below zero for ingredient ${ingredient.id}`));
							}

							return update(ingredientRef, { stock: newStock });
						}
					}).catch(error => console.error('Error updating stock:', error));
				})
			);

			// Proceed with the stock updates and order submission
			Promise.all(stockUpdatePromises)
				.then(() => {
					console.log("All stock updates successful.");
					const newOrderRef = push(dbRef(db, 'Orders'));
					const newOrder = {
						id: newOrderRef.key,
						client_id: this.selectedClient.uid,
						...this.orderSummary
					};
					return set(newOrderRef, newOrder);
				})
				.then(newOrder => {
					console.log('Order submitted successfully');
					// this.notifyKitchen(newOrder.id);
					// Reload orderHistory
					this.fetchOrderHistory();

					Toastify({
						text: "Orden creada con éxito!",
						duration: 3000,
						close: true,
						gravity: "top",
						position: "right",
						style: {
							background: "linear-gradient(to right, #00b09b, #96c93d)",
						},
					}).showToast();

					// Clear selections and UI updates
					this.clearOrderSelections();
					this.fetchLastOrderNumber();
					const confirmationModal = Modal.getInstance(this.$refs.confirmationModal);
					confirmationModal.hide();
				})
				.catch((error) => {
					console.error('Error submitting data:', error);
				});
		},
		async searchClients() {
			if (this.searchQuery.length > 1) {
				const userStore = useUserStore();
				let clientes = await userStore.searchUsers(this.searchQuery);

				this.searchResults = clientes.filter(user => user.role === 'cliente');

			} else {
				this.searchResults = [];
			}
		},
		selectUser(client) {
			this.selectedClient = client;
			this.searchQuery = '';
			this.searchResults = [];
		},
		clearOrderSelections() {
			// clear order sumary
			this.order = [];
			this.orderSummary = [];
			this.tableNumber = '';
			this.tip = null;
			this.addTip = false;
			this.isTakeaway = false;
		},
		async logOut() {
			try {
				await signOut(auth);
				this.$router.push('/page/login'); // Redirect to login after sign out
			} catch (error) {
				console.error('Error signing out:', error.message);
			}

		},
		// async registerNewClient(email: String, password: string) {
		// 	const createUser = httpsCallable(functions, 'createUser');
		// 	try {

		// 		const result = await createUser({ email, password });
		// 		const newClient = result.user;

		// 		if (result.data.uid) {
		// 			console.log('User created successfully', result.data.uid);

		// 			// Now that the user is created, let's save their additional info
		// 			const clientRef = dbRef(db, `Users/${user.uid}`);
		// 			await set(clientRef, {
		// 				email: newClient.email,
		// 				firstName: this.firstName,
		// 				lastName: this.lastName,
		// 				identification: this.identification,
		// 				phoneNumber: this.phoneNumber,
		// 				role: this.role,
		// 				tenant_id: this.tenantId // Linking user to tenant by tenant's Firebase-generated key
		// 			});

		// 			//Toastify
		// 			Toastify({
		// 				text: "Nuevo cliente registrado con exito!",
		// 				duration: 3000,
		// 				close: true,
		// 				gravity: "top", // `top` or `bottom`
		// 				position: "right", // `left`, `center` or `right`
		// 				stopOnFocus: true, // Prevents dismissing of toast on hover
		// 				style: {
		// 					background: "linear-gradient(to right, #00b09b, #96c93d)",
		// 				},
		// 			}).showToast();

		// 			// After successful signup assign new client to order
		// 			this.selectedClient = result;

		// 			this.addNewClient = false;
		// 			this.firstName = '';
		// 			this.lastName = '';
		// 			this.identification = '';
		// 			this.email = '';
		// 			this.phoneNumber = '';
		// 			this.password = '';

		// 		} else if (result.data.error) {
		// 			console.error('Error creating user', result.data.error);
		// 			Toastify({
		// 				text: "Error al registrar nuevo cliente.",
		// 				duration: 3000,
		// 				close: true,
		// 				gravity: "top", // `top` or `bottom`
		// 				position: "right", // `left`, `center` or `right`
		// 				stopOnFocus: true, // Prevents dismissing of toast on hover
		// 				style: {
		// 					background: "linear-gradient(to right, #ff5f6d, #ffc371)",
		// 				},
		// 			}).showToast();
		// 		}
		// 	} catch (error) {
		// 		console.error('Error calling createUser function', error);
		// 	}
		// },

		// notifyKitchen(orderId) {
		// 	// Call Firebase Function or your API endpoint to trigger the notification
		// 	const notifyFunction = firebase.functions().httpsCallable('notifyKitchen');
		// 	notifyFunction({ orderId: orderId, tenantId: this.tenantId })
		// 		.then((result) => {
		// 			console.log('Notification sent:', result.data);
		// 		}).catch((error) => {
		// 			console.error('Error sending notification:', error);
		// 		});
		// }
	}
}
</script>
<template>
	<div class="pos pos-with-menu pos-with-sidebar"
		v-bind:class="{ 'pos-mobile-sidebar-toggled': mobileSidebarToggled }">
		<div class="pos-container">
			<div class="pos-menu">
				<div class="logo">
					<RouterLink to="#">
						<div class="logo-img"><i class="fa fa-light fa-burger"></i></div>
						<div class="logo-text">Restaurante</div>
					</RouterLink>
				</div>

				<div class="nav-container">
					<perfect-scrollbar class="h-100">
						<ul class="nav nav-tabs">
							<li class="nav-item" v-for="(category, index) in categories" :key="category.name">
								<a class="nav-link" :class="{ 'active': category.active }" href="#"
									@click.prevent="setActiveCategory(index)">
									{{ category.name }}
								</a>
							</li>
						</ul>
					</perfect-scrollbar>
				</div>

				<a href="#" class="floating-logout-btn" @click="logOut">
					<i class="fa-solid fa-right-from-bracket"></i>
				</a>

			</div>

			<div class="pos-content">
				<div class="pos-content-container h-100">
					<div class="row gx-4">
						<template v-for="food in filteredMenuItems">
							<div class="col-xxl-3 col-xl-4 col-lg-6 col-md-4 col-sm-6 pb-4" v-if="!food.hide">
								<a href="#" class="pos-product" v-bind:class="{ 'not-available': !food.status }"
									v-on:click="(event) => showFoodModal(event, food.id)">
									<div class="img" v-bind:style="{ backgroundImage: 'url(' + food.image + ')' }">
									</div>
									<div class="info">
										<div class="title">{{ food.name }}</div>
										<div class="desc">{{ food.description }}</div>
										<div class="price">${{ food.sellingPrice }}</div>
									</div>
									<div class="not-available-text" v-if="!food.status">
										<div>No disponible</div>
									</div>
								</a>
							</div>
						</template>
					</div>
				</div>
			</div>

			<!-- BEGIN pos-sidebar -->
			<div class="pos-sidebar">
				<div class="h-100 d-flex flex-column p-0">
					<!-- BEGIN pos-sidebar-header -->
					<div class="pos-sidebar-header">
						<div class="back-btn">
							<button type="button" v-on:click="toggleMobileSidebar()" class="btn">
								<i class="bi bi-chevron-left"></i>
							</button>
						</div>
						<div class="row">
							<div class="col-6 d-flex justify-content-end">
								<div class="input-group" id="order-number">
									<span class="input-group-text" id="order-addon"><i class="fa fa-plate-wheat"></i>
									</span>
									<input type="number" class="form-control" placeholder="Orden #" aria-label="order"
										aria-describedby="order-addon" v-model="nextOrderNumber">
								</div>
							</div>
							<div class="col-6 d-flex justify-content-start">
								<div class="input-group" id="table-number">
									<span class="input-group-text" id="mesa-addon"><i class="fa fa-chair"></i>
									</span>
									<input type="number" class="form-control" placeholder="Mesa #" aria-label="mesa"
										aria-describedby="mesa-addon" v-model="tableNumber">
								</div>
							</div>
						</div>
					</div>
					<!-- END pos-sidebar-header -->

					<!-- BEGIN pos-sidebar-nav -->
					<div class="pos-sidebar-nav">
						<ul class="nav nav-tabs nav-fill">
							<li class="nav-item">
								<a class="nav-link active" href="#" data-bs-toggle="tab"
									data-bs-target="#newOrderTab">Orden
									nueva ({{ getOrderTotal() }})</a>
							</li>
							<li class="nav-item">
								<a class="nav-link" href="#" data-bs-toggle="tab"
									data-bs-target="#orderHistoryTab">Ordenes de Hoy
									({{ getOrderHistoryTotal()
									}})</a>
							</li>
						</ul>
					</div>
					<!-- END pos-sidebar-nav -->

					<!-- BEGIN pos-sidebar-body -->
					<perfect-scrollbar ref="posSidebarBody" class="pos-sidebar-body tab-content">
						<!-- BEGIN #newOrderTab -->
						<div class="tab-pane fade h-100 show active" id="newOrderTab">
							<!-- BEGIN pos-order -->
							<div class="pos-order" v-if="order.length > 0" v-for="order in order">
								<div class="pos-order-product">
									<div class="img" v-bind:style="{ backgroundImage: 'url(' + order.image + ')' }">
									</div>
									<div class="flex-1">
										<div class="h6 mb-1">{{ order.name }}</div>
										<div class="small">${{ order.price }}</div>
										<!-- <div class="small mb-2">
											<div v-for="option in order.options">- {{ option.key }}: {{ option.value }}
											</div>
										</div> -->
										<div class="d-flex">
											<a href="#" class="btn btn-secondary btn-sm"
												v-on:click="(event) => deductQty(event, order.id)"><i
													class="fa fa-minus"></i></a>
											<input type="text" v-model="order.quantity"
												class="form-control w-50px form-control-sm mx-2 bg-white bg-opacity-25 text-center" />
											<a href="#" class="btn btn-secondary btn-sm"
												v-on:click="(event) => addQty(event, order.id)"><i
													class="fa fa-plus"></i></a>
										</div>
									</div>
								</div>
								<div class="pos-order-price d-flex flex-column">
									<div>${{ (order.price * order.quantity).toFixed(2) }}</div>
									<div class="text-end mt-auto"><a href="#"
											v-on:click="(event) => toggleConfirmation(event, order.id, true)"
											class="btn btn-default btn-sm"><i class="fa fa-trash"></i></a></div>
								</div>

								<div class="pos-order-confirmation text-center d-flex flex-column justify-content-center"
									v-if="order.confirmation">
									<div class="mb-1">
										<i class="fa fa-trash fs-36px lh-1"></i>
									</div>
									<div class="mb-2">¿Remover este item?</div>
									<div>
										<a href="#" v-on:click="(event) => toggleConfirmation(event, order.id, false)"
											class="btn btn-default btn-sm ms-auto me-2 width-100px">No</a>
										<a href="#" v-on:click="(event) => removeOrder(event, order.id)"
											class="btn btn-theme btn-sm width-100px">Si</a>
									</div>
								</div>
							</div>
							<!-- END pos-order -->
							<div v-else class="h-100 d-flex align-items-center justify-content-center text-center p-20">
								<div>
									<div class="mb-3 mt-n5">
										<i class="fa fa-utensils text-body text-opacity-25" style="font-size: 5em"></i>
									</div>
									<h5>Sin pedidos aún.</h5>
								</div>
							</div>
						</div>

						<!-- BEGIN #orderHistoryTab -->
						<div class="tab-pane fade h-100" id="orderHistoryTab">
							<div v-if="orderHistory && orderHistory.length" class="tab-pane active p-3"
								id="orderHistory" role="tabpanel">
								<div class="accordion" id="orderHistoryAccordion">
									<div v-for="(order, index) in orderHistory" :key="order.id || index"
										class="accordion-item">
										<h2 class="accordion-header" :id="'heading' + index">
											<button class="accordion-button collapsed" type="button"
												data-bs-toggle="collapse" :data-bs-target="'#collapse' + index"
												aria-expanded="false" :aria-controls="'collapse' + index"
												style="font-size: 1rem; overflow-y: auto;">
												<span class="text-muted me-1">Orden:</span>
												<span class="fw-bold me-3">#{{ order.orderNumber }}</span>
												<span class="text-muted me-1">Mesa:</span>
												<span class="fw-bold me-3">#{{ order.tableNumber }}</span>
												<span class="text-muted me-1">Cliente:</span>
												<span class="fw-bold me-2">{{ order.clientName }}</span>
												<span class="text-muted me-1">Fecha:</span>
												<span class="fw-bold">{{ order.date }}</span>
											</button>
										</h2>
										<div :id="'collapse' + index" class="accordion-collapse collapse"
											:aria-labelledby="'heading' + index"
											data-bs-parent="#orderHistoryAccordion">
											<div class="accordion-body text-start">
												<p><strong>Mesa:</strong> #{{ order.tableNumber }}</p>
												<p><strong>Fecha de orden:</strong> {{ order.date }}</p>
												<div>
													<p><strong>Detalles de la Orden:</strong></p>
													<ul>
														<li v-for="item in order.menuItems" :key="item.id">
															{{ item.name }} - Cantidad: {{ item.quantity }} - Subtotal:
															${{
			item.totalPricePerItem.toFixed(2) }}
														</li>
													</ul>
													<p><strong>Total a pagar:</strong> ${{
			order.totalPricePaid.toFixed(2) }}</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div v-else class="h-100 d-flex align-items-center justify-content-center text-center p-20">
								<div>
									<div class="mb-3 mt-n5">
										<i class="fa fa-shopping-bag text-body text-opacity-25"
											style="font-size: 5em;"></i>
									</div>
									<h5>No hay datos</h5>
								</div>
							</div>
						</div>

						<!-- END #orderHistoryTab -->
					</perfect-scrollbar>
					<!-- END pos-sidebar-body -->

					<!-- BEGIN pos-sidebar-footer -->
					<div class="pos-sidebar-footer">
						<div class="d-flex align-items-center mb-2">
							<div>Subtotal</div>
							<div class="flex-1 text-end h6 mb-0">${{ getSubTotalPrice() }}</div>
						</div>
						<div class="d-flex align-items-center">
							<div>Impuesto (6%)</div>
							<div class="flex-1 text-end h6 mb-0">${{ getTaxesPrice() }}</div>
						</div>
						<div class="mb-3 form-check" style="margin-top: 10px;">
							<input type="checkbox" class="form-check-input" id="tipCheckbox" v-model="addTip">
							<label class="form-check-label" for="tipCheckbox">Agregar propina</label>
						</div>
						<div v-if="addTip" class="d-flex align-items-center">
							<div>Propina</div>
							<div class="flex-1 text-end h6 mb-0">
								$<input type="number" class="form-control" v-model="tip"
									style="width: 100px; display: inline-block;" />
							</div>
						</div>
						<div class="mb-3 form-check" style="margin-top: 10px;">
							<input type="checkbox" class="form-check-input" id="typeCheckbox" v-model="isTakeaway">
							<label class="form-check-label" for="typeCheckbox">Para llevar</label>
						</div>
						<hr />
						<div class="d-flex align-items-center mb-2">
							<div>Total</div>
							<div class="flex-1 text-end h4 mb-0">${{ getTotalPrice() }}</div>
						</div>
						<div class="mt-3">
							<div class="d-flex">
								<router-link to="/" v-if="userRole === 'admin'"
									class="btn btn-default w-70px me-10px d-flex align-items-center justify-content-center">
									<span>
										<span class="small fw-semibold">Volver</span>
									</span>
								</router-link>
								<a href="#" @click.prevent="clearOrderSelections"
									class="btn btn-default w-70px me-10px d-flex align-items-center justify-content-center">
									<span>
										<span class="small fw-semibold">Cancelar Orden</span>
									</span>
								</a>
								<!-- <router-link to="/pos/kitchen-order"
									class="btn btn-default w-70px me-10px d-flex align-items-center justify-content-center">
									<span>
										<span class="small fw-semibold">Ver ordenes de cocina</span>
									</span>
								</router-link> -->
								<a href="#" @click.prevent="submitOrderToKitchen"
									class="btn btn-theme flex-fill d-flex align-items-center justify-content-center">
									<span>
										<i class="fa fa-cash-register fa-lg my-10px d-block"></i>
										<span class="small fw-semibold">Enviar Orden</span>
									</span>
								</a>
							</div>
						</div>
					</div>
					<!-- END pos-sidebar-footer -->
				</div>
			</div>
			<!-- END pos-sidebar -->
		</div>
	</div>
	<!-- END pos -->

	<!-- BEGIN pos-mobile-sidebar-toggler -->
	<a href="#" class="pos-mobile-sidebar-toggler" v-on:click="toggleMobileSidebar()">
		<i class="bi bi-bag"></i>
		<span class="badge">{{ getOrderTotal() }}</span>
	</a>
	<!-- END pos-mobile-sidebar-toggler -->

	<!-- Modal to select a food item -->
	<div class="modal modal-pos fade" ref="modalPosItem">
		<div class="modal-dialog modal-lg">
			<div class="modal-content border-0">
				<form v-on:submit.prevent="addToOrder">
					<card v-if="modalData">
						<card-body class="p-0">
							<a href="#" data-bs-dismiss="modal" class="btn-close position-absolute top-0 end-0 m-4"></a>
							<div class="modal-pos-product">
								<div class="modal-pos-product-img">
									<div class="img" v-bind:style="{ backgroundImage: 'url(' + modalData.image + ')' }">
									</div>
								</div>
								<div class="modal-pos-product-info d-flex flex-column">
									<div class="h4 mb-2">{{ modalData.name }}</div>
									<div class="text-body text-opacity-50 mb-2">
										{{ modalData.description }}
									</div>
									<div class="h4 mb-3">${{ modalData.sellingPrice }}</div>
									<div class="d-flex mb-3">
										<a href="#" class="btn btn-secondary"
											v-on:click="(event) => deductModalQty(event)"><i
												class="fa fa-minus"></i></a>
										<input type="text" class="form-control w-50px fw-bold mx-2 text-center"
											name="qty" v-bind:value="modalQuantity" />
										<a href="#" class="btn btn-secondary"
											v-on:click="(event) => addModalQty(event)"><i class="fa fa-plus"></i></a>
									</div>
									<!-- <template v-if="modalData.options">
										<hr class="opacity-1">
										<div class="mb-2" v-if="modalData.options.size">
											<div class="fw-bold">Tamaño:</div>
											<div class="option-list">
												<div class="option" v-for="(size, index) in modalData.options.size">
													<input type="radio" v-bind:id="'size[' + index + ']'" name="size"
														class="option-input" v-model="modalSelectedSize"
														v-bind:value="size.text" />
													<label class="option-label" v-bind:for="'size[' + index + ']'">
														<span class="option-text">{{ size.text }}</span>
														<span class="option-price">+{{ size.price }}</span>
													</label>
												</div>
											</div>
										</div>
										<div class="mb-2" v-if="modalData.options.addon">
											<div class="fw-bold">Adicionales:</div>
											<div class="option-list">
												<div class="option" v-for="(addon, index) in modalData.options.addon">
													<input type="checkbox" v-bind:name="'addon[' + index + ']'"
														v-bind:value="addon.text" v-model="modalSelectedAddon"
														class="option-input" v-bind:id="'addon[' + index + ']'" />
													<label class="option-label" v-bind:for="'addon[' + index + ']'">
														<span class="option-text">{{ addon.text }}</span>
														<span class="option-price">+{{ addon.price }}</span>
													</label>
												</div>
											</div>
										</div>
									</template>
									<hr class="opacity-1"> -->
									<div class="row">
										<div class="col-4">
											<a href="#" class="btn btn-default fw-semibold mb-0 d-block py-3 w-100"
												data-bs-dismiss="modal">Cancelar</a>
										</div>
										<div class="col-8">
											<button type="submit"
												class="btn btn-theme fw-semibold d-flex justify-content-center align-items-center py-3 m-0 w-100">Agregar
												al carrito <i class="fa fa-plus ms-2 my-n3"></i></button>
										</div>
									</div>
								</div>
							</div>
						</card-body>
					</card>
				</form>
			</div>
		</div>
	</div>

	<!-- Confirm order Modal -->
	<div class="modal fade" id="confirmationModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true"
		ref="confirmationModal">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="modalLabel">Confirmar Orden</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div class="container" id="searchClient">
						<div class="position-relative">
							<label for="clientSearch" class="form-label">Buscar Cliente:</label>
							<input type="text" class="form-control" id="clientSearch" v-model="searchQuery"
								@input="searchClients" autocomplete="off">

							<div class="dropdown-menu" v-show="searchResults.length > 0 || searchQuery.length > 0"
								style="display: block; width: 100%;"
								:class="{ 'show': searchResults.length > 0 || searchQuery }">
								<i class="dropdown-item text-muted" v-if="searchResults.length === 0">No se encontraron
									resultados</i>
								<button type="button" class="dropdown-item" v-for="client in searchResults"
									:key="client.uid" @click.prevent="selectUser(client)">
									{{ client.identification }} - {{ client.firstName }} {{ client.lastName }}
								</button>
							</div>
							<div class="mb-3 form-check" style="margin-top: 10px;">
								<input type="checkbox" class="form-check-input" id="newClientCheckbox"
									v-model="addNewClient">
								<label class="form-check-label" for="newClientCheckbox">Agregar cliente nuevo</label>
							</div>
						</div>
					</div>

					<div v-if="addNewClient">
						<div class="card">
							<div class="card-header">
								<h4 class="text-center">Agregar nuevo cliente</h4>
							</div>
							<div class="card-body">
								<div class="mb-3">
									<label class="form-label">Nombre <span class="text-danger">*</span></label>
									<input v-model="firstName" type="text" class="form-control form-control-lg fs-15px"
										placeholder="e.g John" value="" required />
								</div>
								<div class="mb-3">
									<label class="form-label">Apellido <span class="text-danger">*</span></label>
									<input v-model="lastName" type="text" class="form-control form-control-lg fs-15px"
										placeholder="e.g Smith" value="" required />
								</div>
								<div class="mb-3">
									<label class="form-label">Cedula / Identificacion <span
											class="text-danger">*</span></label>
									<input v-model="identification" type="number"
										class="form-control form-control-lg fs-15px" placeholder="e.g 20555444" value=""
										required />
								</div>
								<div class="mb-3">
									<label class="form-label">Correo electronico <span
											class="text-danger">*</span></label>
									<input v-model="email" type="text" class="form-control form-control-lg fs-15px"
										placeholder="username@address.com" value="" required />
								</div>
								<div class="mb-3">
									<label class="form-label">Telefono </label>
									<input type="tel" v-model="phoneNumber" class="form-control form-control-lg fs-15px"
										placeholder="0414-5555555" value="" pattern="[0-9]{4}-[0-9]{7}" />
									<small>Formato: 0424-xxxxxxx</small>
								</div>
								<div class="mb-3">
									<label class="form-label">Contraseña <span class="text-danger">*</span></label>
									<input v-model="password" type="password"
										class="form-control form-control-lg fs-15px" value="" required />
								</div>
							</div>
							<div class="card-footer text-end">
								<button type="button" class="btn btn-primary"
									@click="registerNewClient">Registrar</button>
							</div>
						</div>
					</div>

					<div v-if="selectedClient" class="selected-user-details mt-3">
						<div class="card">
							<div class="card-header">
								<h5 class="text-center">Cliente</h5>
							</div>
							<div class="card-body">
								<ul>
									<li><b>Nombre: </b>{{ selectedClient.firstName }} {{ selectedClient.lastName }}</li>
									<li><b>C.I: </b>{{ selectedClient.identification }}</li>
									<li><b>Teléfono: </b>{{ selectedClient.phoneNumber }}</li>
								</ul>
							</div>
						</div>
					</div>
					<hr>
					<div class="card">
						<div class="card-header">
							<h5 class="card-text text-center">¿Seguro que desea realizar este pedido?</h5>

						</div>
						<div class="card-body">
							<div style="margin-top: 20px;">
								<p><b>Tipo de orden: </b>
									<span class="badge bg-primary">{{ orderSummary && orderSummary.type === 'Takeaway'
			?
			'Para llevar' : 'Local' }}</span>
								</p>
							</div>

							<div>
								<b>Resumen de Orden:</b>
								<ul class="list-group list-group-flush">
									<li v-for="item in orderSummary.menuItems" :key="item.id" class="list-group-item">
										{{ item.name }} - Cantidad: <span class="badge bg-primary">{{
			item.quantity
		}}</span>
									</li>
								</ul>
							</div>

							<h5 class="text-end mt-3">Total a cancelar: <span class="badge bg-success">${{
									orderSummary.totalPricePaid }}</span></h5>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
					<button type="button" class="btn btn-primary" @click="confirmOrder">Confirmar</button>
				</div>
			</div>
		</div>
	</div>
</template>
<style scoped>
.filled {
	color: gold;
}

.nav-tabs {
	display: flex;
	flex-wrap: nowrap;
	overflow-x: auto;
	white-space: nowrap;
}

.nav-link {
	flex-grow: 1;
	text-overflow: ellipsis;
	overflow: hidden;
	display: block;
}

.floating-logout-btn {
	position: fixed;
	left: 20px;
	bottom: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 50px;
	height: 50px;
	background-color: #007bff;
	/* Change the background color as needed */
	color: white;
	border-radius: 50%;
	text-decoration: none;
	box-shadow: 0 2px 5px rgba(0, 0, 0, .3);
	z-index: 1000;
	/* Ensure it's above other content */
}

.floating-logout-btn:hover {
	background-color: #0056b3;
	/* Darker shade for hover effect */
	color: white;
	text-decoration: none;
	/* Prevent underlining the icon on hover */
}

.floating-logout-btn i {
	font-size: 20px;
	/* Adjust icon size */
}

.list-autocomplete {
	padding: 0;
}

.list-autocomplete em {
	font-style: normal;
	background-color: #e1f2f9;
}

.hasNoResults {
	color: #aaa;
	display: block;
	padding: 10px;
	color: #aaa;
}

@media (min-width: 992px) {

	/* Target large screens */
	.accordion-button {
		padding-left: 1.5rem;
		/* Increased padding for better alignment */
		padding-right: 1.5rem;
		/* Balanced padding on right */
		font-size: 1.25rem;
		/* Slightly larger font for readability */
	}

	.accordion-body {
		font-size: 1rem;
		/* Ensure text is not too small on large screens */
	}
}

/* Optional: Improve general spacing and aesthetics */
.accordion-item+.accordion-item {
	margin-top: 1rem;
	/* Add space between accordion items */
}
</style>