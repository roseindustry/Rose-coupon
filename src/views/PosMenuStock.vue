<script>
import { computed } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import PosHeader from '@/components/app/PosHeader.vue'
import { ref as dbRef, query, orderByChild, equalTo, get, push, set, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/init';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

const appOption = useAppOptionStore();

export default {
	data() {
		return {
			menu: {
				name: '',
				description: '',
				status: '',
				purchasePrice: '',
				sellingPrice: '',
				iva: 16
			},
			stock: {
				name: '',
				status: '',
				purchasePrice: '',
				sellingPrice: '',
				stock: 0,
			},
			menuItems: [],
			stockItems: [],
			categories: [],
			selectedIngredients: [],
			ingredientQuantities: {},
			selectedCategory: null,
			categoryName: '',
			newCategory: false,
			uploadImage: false,
			imageFile: null,
			imagePreview: null,
			updatedImagePreview: null,
			modalIngredients: [],
			currentEditingMenu: null,
			showAddIngredientModal: false,
		}
	},
	components: {
		PosHeader,
	},
	computed: {
		categorizedMenuItems() {
			const grouped = {};
			this.menuItems.forEach(item => {
				if (!grouped[item.category_id]) {
					grouped[item.category_id] = [];
				}
				grouped[item.category_id].push(item);
			});
			return grouped;
		}
	},
	watch: {
		// Assuming categories is reactive
		categories(newVal, oldVal) {
			if (newVal.length !== oldVal.length) {
				this.initializeScrollSpy();
			}
		}
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

		this.fetchMenuItems();
		this.fetchStockItems();
		this.fetchMenuCategories();

		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		appOption.appContentClass = 'p-0';
		appOption.appContentFullHeight = true;
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
		appOption.appContentFullHeight = false;
	},
	methods: {
		scrollToCategory(categoryId) {
			const element = document.getElementById(categoryId);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth' });
			}
		},
		async fetchMenuItems() {
			const tenancyStore = useTenancyStore();
			const tenantId = tenancyStore.tenant.key;

			const menuItemRef = query(dbRef(db, 'MenuItems'), orderByChild('tenant_id'), equalTo(tenantId));
			const menuItemSnapshot = await get(menuItemRef);

			if (menuItemSnapshot.exists()) {
				const menuItemsPromises = [];
				menuItemSnapshot.forEach((childSnapshot) => {
					const menuItemData = childSnapshot.val();
					const ingredientsPromise = menuItemData.ingredients ? Promise.all(
						menuItemData.ingredients.map(async (ingredient) => {
							try {
								const ingredientRef = dbRef(db, `Ingredients/${ingredient.id}`);
								const ingredientSnapshot = await get(ingredientRef);
								if (ingredientSnapshot.exists()) {
									const ingredientData = ingredientSnapshot.val();
									return { ...ingredientData, quantity: ingredient.quantity };
								}
							} catch (error) {
								console.error("Error fetching ingredient details:", error);
							}
							return null;
						})
					) : Promise.resolve([]);

					menuItemsPromises.push(
						ingredientsPromise.then((ingredients) => ({
							id: childSnapshot.key,
							category_id: menuItemData.category_id,
							image: menuItemData.image,
							name: menuItemData.name,
							description: menuItemData.description,
							sellingPrice: menuItemData.sellingPrice,
							iva: menuItemData.iva,
							status: menuItemData.status,
							ingredients,
							showIngredients: false,
						}))
					);
				});

				this.menuItems = await Promise.all(menuItemsPromises);
			} else {
				console.log("No data available.");
			}
		},

		async fetchStockItems() {
			const tenancyStore = useTenancyStore();
			const tenantId = tenancyStore.tenant.key;

			const stockItemRef = query(dbRef(db, 'Ingredients'), orderByChild('tenant_id'), equalTo(tenantId));
			const stockItemSnapshot = await get(stockItemRef);

			if (stockItemSnapshot.exists()) {
				stockItemSnapshot.forEach((childSnapshot) => {
					const stockItemData = childSnapshot.val();
					this.stockItems.push({
						id: childSnapshot.key,
						name: stockItemData.name,
						sellingPrice: stockItemData.sellingPrice,
						status: stockItemData.status,
						stock: stockItemData.stock
					});
				});
			} else {
				console.log("No data available");
			}
		},

		async fetchMenuCategories() {
			const tenancyStore = useTenancyStore();
			const tenantId = tenancyStore.tenant.key;

			const categoryRef = query(dbRef(db, 'Categories'), orderByChild('tenant_id'), equalTo(tenantId));
			const categorySnapshot = await get(categoryRef);

			if (categorySnapshot.exists()) {
				categorySnapshot.forEach((childSnapshot) => {
					const categoryData = childSnapshot.val();
					this.categories.push({
						id: childSnapshot.key,
						name: categoryData.name
					});
				});
			} else {
				console.log("No data available");
			}
		},

		async uploadImageToStorage(imageFile) {
			let imageUrl = null;

			try {
				const sRef = storageRef(storage, `menuItemsImages/${imageFile.name}`);
				const uploadResult = await uploadBytes(sRef, imageFile);
				imageUrl = await getDownloadURL(uploadResult.ref);
				console.log('Image uploaded:', imageUrl);
			} catch (error) {
				console.error('Error uploading image:', error);
			}

			return imageUrl;
		},

		selectCategory(categoryName) {
			const selectedCategory = this.categories.find(item => item.name === categoryName);
			this.selectedCategory = selectedCategory;
		},

		async createCategory(categoryName) {
			const tenancyStore = useTenancyStore();
			const tenantId = tenancyStore.tenant.key; // Link this action to the current Tenant

			const categoryRef = dbRef(db, 'Categories');
			try {
				const newCategoryRef = await push(categoryRef, {
					name: categoryName,
					tenant_id: tenantId,
					//add icon
				});
				//Toastify
				Toastify({
					text: "Categoria agregada con exito!",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #00b09b, #96c93d)",
					},
				}).showToast();
				return newCategoryRef.key;

			} catch (e) {
				console.error("Ocurrio un error: ", e);
				return null;
			}
		},

		previewImage(event) {
			const file = event.target.files[0];
			if (file) {
				this.imageFile = file;
				this.imagePreview = URL.createObjectURL(file);
			}
		},

		previewUpdatedImage(event, item) {
			const file = event.target.files[0];
			if (file) {
				this.imageFile = file;
				const updatedImagePreviewUrl = URL.createObjectURL(file);
				// Update the specific item's preview URL
				item.updatedImagePreview = updatedImagePreviewUrl;
			}
		},

		async createMenuItem() {
			// Tenant id
			const tenancyStore = useTenancyStore();
			await tenancyStore.findOrCreateTenant();
			const tenantId = tenancyStore.tenant.key;

			// Check if an image was selected for upload and get URL
			let imageUrl = null;
			if (this.imageFile) {
				imageUrl = await this.uploadImageToStorage(this.imageFile);
			}

			// MenuItem's category
			let categoryId = this.selectedCategory ? this.selectedCategory.id : null;

			// MenuItem's ingredients
			const ingredientsWithQuantities = this.selectedIngredients.map(id => ({
				id: id,
				quantity: this.ingredientQuantities[id] || 0 // Default to 0 if no quantity specified
			}));

			// If a new category is being created, create it and use its ID.
			if (this.newCategory) {
				if (!this.categoryName.trim()) {
					throw new Error("Category name is required");
				}
				categoryId = await this.createCategory(this.categoryName);
			} else if (!categoryId) {
				throw new Error("Category is required");
			}

			if (!this.menu.name.trim()) {
				throw new Error("Menu item name is required");
			}

			if (this.menu.purchasePrice <= 0 || this.menu.sellingPrice <= 0) {
				throw new Error("Prices must be greater than 0");
			}

			// Prepare the data for submission
			const submission = {
				category_id: categoryId,
				name: this.menu.name,
				description: this.menu.description,
				ingredients: ingredientsWithQuantities,
				purchasePrice: this.menu.purchasePrice,
				sellingPrice: this.menu.sellingPrice,
				status: this.menu.status,
				iva: this.menu.iva,
				image: imageUrl,
				tenant_id: tenantId
			};

			// Submit the data to Firebase
			const newMenuItemRef = push(dbRef(db, 'MenuItems'));
			set(newMenuItemRef, {
				id: newMenuItemRef.key,
				...submission
			})
				.then(() => {
					console.log('Platillo fue agregado al menu.');

					// Update the UI to display new menuItem
					const newMenuItem = { id: newMenuItemRef.key, ...submission };
					this.menuItems.push(newMenuItem);

					//Toast to show Success form Submission
					Toastify({
						text: "Nuevo Item registrado con exito!",
						duration: 3000,
						close: true,
						gravity: "top",
						position: "right",
						stopOnFocus: true,
						style: {
							background: "linear-gradient(to right, #00b09b, #96c93d)",
						},
					}).showToast();
				})
				.catch((error) => console.error('Error submitting data:', error));

			// Reset form
			this.resetMenuItemData();
			this.resetFileInputAndPreview();
		},

		async createIngredient() {
			// Tenant id
			const tenancyStore = useTenancyStore();
			await tenancyStore.findOrCreateTenant();
			const tenantId = tenancyStore.tenant.key;

			if (!this.stock.name.trim()) {
				throw new Error("Ingredient name is required");
			}

			if (this.stock.purchasePrice <= 0 || this.stock.sellingPrice <= 0) {
				throw new Error("Prices must be greater than 0");
			}

			// Prepare the data for submission
			const submission = {
				name: this.stock.name,
				purchasePrice: this.stock.purchasePrice,
				sellingPrice: this.stock.sellingPrice,
				status: this.stock.status,
				stock: this.stock.stock,
				tenant_id: tenantId
			};

			// Submit the data to Firebase
			const newStockItemRef = push(dbRef(db, 'Ingredients'));
			set(newStockItemRef, {
				id: newStockItemRef.key,
				...submission
			})
				.then(() => {
					console.log('Ingrediente fue agregado al menu.');

					// Update the UI to display new menuItem
					const newStockItem = { id: newStockItemRef.key, ...submission };
					this.stockItems.push(newStockItem);
					this.modalIngredients.push(newStockItem);

					//Toast to show Success form Submission
					Toastify({
						text: "Nuevo Ingrediente registrado con exito!",
						duration: 3000,
						close: true,
						gravity: "top",
						position: "right",
						stopOnFocus: true,
						style: {
							background: "linear-gradient(to right, #00b09b, #96c93d)",
						},
					}).showToast();
				})
				.catch((error) => console.error('Error submitting data:', error));

			// Reset form
			this.resetStockItemData();
		},

		resetMenuItemData() {
			// Reset menu item details
			this.menu = {
				name: '',
				description: '',
				status: false,
				purchasePrice: '',
				sellingPrice: '',
				iva: '',
			};
			// Reset category selection
			this.selectedCategory = null;
			this.newCategory = false;
			this.categoryName = '';
			// Reset selected ingredients
			this.selectedIngredients = [];
			this.ingredientQuantities = {};
			// Reset image upload state if there's one
			this.uploadImage = false;
			this.imagePreview = null;
		},

		resetStockItemData() {
			this.stock = {
				name: '',
				status: '',
				purchasePrice: '',
				sellingPrice: '',
				stock: 0,
			};
		},

		resetFileInputAndPreview() {
			const fileInput = document.getElementById('menuItemImg');
			fileInput.value = '';
			this.imagePreview = '';
		},

		toggleEdit(item) {
			item.isEditing = !item.isEditing;
		},

		toggleCreateCategory() {
			this.newCategory = !this.newCategory;
			this.selectedCategory = null;
		},

		toggleIngredientsVisibility(menu) {
			menu.showIngredients = !menu.showIngredients;
		},

		async updateMenuItem(item) {
			const menuItemRef = dbRef(db, `MenuItems/${item.id}`);

			// Check if an image was selected for update and get URL
			let imageUrl = item.image;
			if (this.imageFile) {
				imageUrl = await this.uploadImageToStorage(this.imageFile);
				this.imageFile = null;
				this.updatedImagePreview = null;
			}

			const updateData = {
				// category_id: item.category_id,
				name: item.name,
				description: item.description,
				sellingPrice: item.sellingPrice,
				iva: item.iva,
				status: item.status,
			};

			// Add the image to updateData if imageUrl is defined
			if (imageUrl) {
				updateData.image = imageUrl;
			}

			// Add ingredients to the update if required and they have been modified
			if (item.ingredientsModified) {
				updateData.ingredients = item.ingredients.map(ingredient => ({
					id: ingredient.id,
					quantity: ingredient.quantity
				}));
			}

			try {
				await update(menuItemRef, updateData);
				console.log("Menu item updated successfully");

				// Post-update actions

				// Update the item's image property for UI reactivity
				if (imageUrl) {
					item.image = imageUrl;
				}

				// Success notification
				Toastify({
					text: "Modificado con exito!",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #00b09b, #96c93d)",
					},
				}).showToast();

				item.isEditing = false;
			} catch (error) {
				console.error("Error updating menu item:", error);
			}
		},

		async updateIngredient(item) {
			const ingredientRef = dbRef(db, `Ingredients/${item.id}`);

			const updateData = {
				// category_id: item.category_id,
				name: item.name,
				sellingPrice: item.sellingPrice,
				stock: item.stock,
				status: item.status
			};

			try {
				await update(ingredientRef, updateData);
				console.log("Ingredient updated successfully");

				Toastify({
					text: "Modificado con exito!",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #00b09b, #96c93d)",
					},
				}).showToast();

				item.isEditing = false;
			} catch (error) {
				console.error("Error updating menu item:", error);
			}
		},

		deleteItem(menu, index) {
			// Confirmation dialog
			if (confirm("¿Desea borrar este producto?")) {
				// User clicked "OK"

				// Remove MenuItem from the UI
				this.menuItems.splice(index, 1);

				// Remove MenuItem from the database
				const menuItemRef = dbRef(db, `MenuItems/${menu.id}`);
				remove(menuItemRef)
					.then(() => {
						console.log('Deleted: ', menu.name);
						Toastify({
							text: "Borrado " + menu.name + " del Menu",
							duration: 3000,
							close: true,
							gravity: "top",
							position: "right",
							stopOnFocus: true,
							style: {
								background: "linear-gradient(to right, #db231d, #96c93d)",
							},
						}).showToast();
					})
					.catch((error) => {
						console.error('Error deleting menu item:', error);
					});
			}
		},

		openAddStockItemModal() {
			// Get the modal element by ID
			let modalElement = document.getElementById('addStockItemModal');
			// Create a Bootstrap modal instance on this element
			let addStockItemModal = new Modal(modalElement);
			// Show the modal
			addStockItemModal.show();
		},

		openIngredientModal(menu) {
			this.currentEditingMenu = menu;
			this.showAddIngredientModal = true;
			// Initialize modalIngredients
			this.modalIngredients = this.stockItems.map(ingredient => ({
				...ingredient,
				selected: false,
				quantity: 1
			}));

			if (menu.ingredients) {
				menu.ingredients.forEach((menuIngredient) => {
					const modalIngredient = this.modalIngredients.find(ingredient => ingredient.id === menuIngredient.id);
					if (modalIngredient) {
						modalIngredient.selected = true;
						modalIngredient.quantity = menuIngredient.quantity || 1;
					}
				});
			}
		},

		addSelectedIngredients() {
			const selectedIngredients = this.modalIngredients.filter(ingredient => ingredient.selected);
			let ingredientsModified = false;

			if (this.currentEditingMenu) {
				// Filter out any existing ingredients to avoid duplicates
				selectedIngredients.forEach(ingredient => {
					// Check if the ingredient is already present in the currentEditingMenu
					const existingIngredientIndex = this.currentEditingMenu.ingredients.findIndex(i => i.id === ingredient.id);

					if (existingIngredientIndex > -1) {
						// If the ingredient is already present, update its quantity
						if (this.currentEditingMenu.ingredients[existingIngredientIndex].quantity !== ingredient.quantity) {
							this.currentEditingMenu.ingredients[existingIngredientIndex].quantity = ingredient.quantity;
							ingredientsModified = true; // Quantity has been updated, set flag to true
						}
					} else {
						// If the ingredient is not present, add it to the list
						const newIngredient = {
							id: ingredient.id,
							name: ingredient.name,
							quantity: ingredient.quantity
						};
						this.currentEditingMenu.ingredients.push(newIngredient);
						ingredientsModified = true;
					}
				});
				if (ingredientsModified) {
					// Set a property on currentEditingMenu to indicate modifications
					this.currentEditingMenu.ingredientsModified = true;
				}
			}
			this.showAddIngredientModal = false;
		},

		removeIngredient(menu, index) {
			menu.ingredients.splice(index, 1);
		},

		closeIngredientModal() {
			this.modalIngredients.forEach(ingredient => {
				ingredient.selected = false;
				ingredient.quantity = 1;
			});
			this.showAddIngredientModal = false;
		},

	}
}
</script>
<template>
	<div class="pos pos-vertical pos-with-header" id="pos">
		<!-- BEGIN pos-header -->
		<pos-header />
		<!-- END pos-header -->

		<div>
			<ul class="nav nav-tabs nav-fill">
				<li class="nav-item">
					<a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#menu">
						Menú
					</a>
				</li>
				<li class="nav-item">
					<a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#stock">
						Ingredientes
					</a>
				</li>
			</ul>
		</div>

		<div class="tab-content">
			<!-- Menu items -->
			<div class="tab-pane fade h-100 show active" id="menu">
				<div class="pos-content-container d-flex justify-content-end align-items-center">
					<a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#addMenuItemModal"
						style="margin: 14px;"><i class="fa fa-plus-circle fa-fw me-1"></i> Agregar Item al Menu</a>
				</div>

				<div class="container-fluid">
					<div class="row">

						<div class="col-md-2">
							<nav id="categoryNavbar" class="navbar navbar-sticky d-none d-xl-block">
								<nav class="nav flex-column">
									<a v-for="category in categories" :href="'#' + category.id" class="nav-link"
										:key="category.id" @click.prevent="scrollToCategory(category.id)">
										{{ category.name }}
									</a>
								</nav>
							</nav>
						</div>

						<div class="col-md-10 scrollspy-example" data-bs-spy="scroll" data-bs-target="#categoryNavbar"
							data-bs-offset="0">
							<div v-for="category in categories" :id="category.id" :key="category.id">
								<h5>{{ category.name }}</h5>
								<div class="row gx-3">
									<div class="col-md-6 col-lg-4 col-xl-3"
										v-for="(menu, index) in categorizedMenuItems[category.id]" :key="menu.id">
										<div class="card mb-3">
											<div class="card-body">
												<div class="pos-product">
													<div class="img-container position-relative">
														<!-- Image Display -->
														<div v-if="!updatedImagePreview" class="img"
															v-bind:style="{ backgroundImage: 'url(' + menu.image + ')' }">
														</div>

														<!-- Image Edit: File Input -->
														<div v-if="menu.isEditing">
															<div v-if="updatedImagePreview" class="mt-2">
																<img :src="updatedImagePreview" class="img-thumbnail"
																	alt="preview" style="max-height: 200px;">
															</div>
															<input type="file"
																@change="event => previewUpdatedImage(event, menu)"
																class="form-control" />
														</div>
														<button class="btn btn-danger position-absolute top-0 end-0"
															@click.prevent="deleteItem(menu, index)">
															<i class="fa-solid fa-trash fa-sm"></i>
														</button>
													</div>
													<div class="info">
														<h6 v-if="!menu.isEditing" class="card-title">{{ menu.name }}
														</h6>
														<input v-if="menu.isEditing" type="text" class="form-control"
															v-model="menu.name" />
														<p v-if="!menu.isEditing" class="card-text">{{ menu.description
															}}</p>
														<input v-if="menu.isEditing" type="text" class="form-control"
															v-model="menu.description" />
														<!-- Toggle Ingredients Link -->
														<a href="#" class="mb-3 mt-3"
															v-if="menu.ingredients && menu.ingredients.length > 0"
															@click.prevent="toggleIngredientsVisibility(menu)">Mostrar
															Ingredientes</a>
														<!-- Ingredients List -->
														<div v-if="menu.showIngredients || menu.isEditing"
															class="ingredients-list bg-light border rounded p-3 mb-3 mt-3"
															:style="menu.ingredients.length > 3 ? 'max-height: 200px; overflow-y: auto;' : ''">
															<ul class="list-group">
																<li v-for="(ingredient, i) in menu.ingredients"
																	:key="`ingredient-${i}`"
																	class="list-group-item d-flex justify-content-between align-items-center">
																	{{ ingredient.name }}
																	<small>Cantidad: {{ ingredient.quantity }}</small>
																	<button v-if="menu.isEditing"
																		class="btn btn-danger btn-sm"
																		@click="removeIngredient(menu, i)"><i
																			class="fa-solid fa-trash fa-sm"></i></button>
																</li>
															</ul>
															<!-- Add Ingredient Button -->
															<button v-if="menu.isEditing" class="btn btn-theme mt-2"
																@click="openIngredientModal(menu)">Agregar
																Ingrediente</button>
														</div>
														<!-- Selling Price Input Group -->
														<label for="sellingPrice">Precio de Venta:</label>
														<div class="mb-3">
															<div class="input-group">
																<span class="input-group-text"
																	id="sellingPrice-addon">$</span>
																<input id="sellingPrice" type="number"
																	class="form-control" v-model="menu.sellingPrice"
																	:disabled="!menu.isEditing"
																	aria-label="Precio de venta"
																	aria-describedby="sellingPrice-addon">
															</div>
														</div>
														<!-- IVA -->
														<label for="iva">IVA:</label>
														<div class="mb-3">
															<div class="input-group">
																<span class="input-group-text" id="iva-addon">%</span>
																<input id="iva" type="number" class="form-control"
																	v-model="menu.iva" :disabled="!menu.isEditing"
																	aria-label="IVA" aria-describedby="iva-addon">
															</div>
														</div>
														<!-- Disponibilidad -->
														<div class="d-flex align-items-center mb-3">
															<div class="w-100px">Disponible:</div>
															<div class="flex-1">
																<div class="form-check form-switch">
																	<input class="form-check-input" type="checkbox"
																		v-bind:id="'product' + index"
																		v-model="menu.status"
																		:disabled="!menu.isEditing" />
																	<label class="form-check-label"
																		v-bind:for="'product' + index"></label>
																</div>
															</div>
														</div>
														<div>
															<!-- editing button -->
															<a href="#" class="btn btn-theme d-block mb-2"
																@click.prevent="toggleEdit(menu)">Editar</a>
															<a href="#" class="btn btn-success d-block mb-2"
																v-if="menu.isEditing"
																@click.prevent="updateMenuItem(menu)">Actualizar</a>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Stock items -->
			<div class="tab-pane fade h-100" id="stock">
				<div class="pos-content-container d-flex justify-content-end align-items-center">
					<a href="#" class="btn btn-theme" @click="openAddStockItemModal"
						style="margin: 14px;"><i class="fa fa-plus-circle fa-fw me-1"></i> Agregar ingrediente</a>
				</div>

				<div class="pos-container">
					<!-- BEGIN pos-content -->
					<div class="pos-content">
						<div class="pos-content-container p-3">
							<div class="row gx-3">
								<div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 pb-3" v-if="stockItems.length > 0"
									v-for="(stock, index) in stockItems" :key="menu.id">
									<div class="pos-product">
										<div class="info">
											<div v-if="!stock.isEditing" class="title text-truncate text-center mb-3">{{
										stock.name }}
											</div>
											<input v-if="stock.isEditing" type="text" class="form-control"
												v-model="stock.name" />

											<!-- Selling Price Input Group -->
											<label for="stockSellingPrice">Precio de Venta:</label>
											<div class="mb-3">
												<div class="input-group">
													<span class="input-group-text text-wrap"
														id="sellingPrice-addon">$</span>
													<input id="stockSellingPrice" type="number" class="form-control"
														v-model="stock.sellingPrice" :disabled="!stock.isEditing"
														aria-label="Precio de venta"
														aria-describedby="sellingPrice-addon">
												</div>
											</div>

											<!-- Inventory Input Group -->
											<label for="stock">Inventario:</label>
											<div class="mb-3">
												<div class="input-group">
													<span class="input-group-text text-wrap" id="inventory-addon"><i
															class="fa-solid fa-cubes-stacked"></i></span>
													<input type="number" class="form-control" v-model="stock.stock"
														:disabled="!stock.isEditing" aria-label="Inventario"
														aria-describedby="inventory-addon">
												</div>
											</div>

											<div class="d-flex align-items-center mb-3">
												<div class="w-100px">Disponible:</div>
												<div class="flex-1">
													<div class="form-check form-switch">
														<input class="form-check-input" type="checkbox"
															v-bind:id="'product' + index" v-model="stock.status"
															:disabled="!stock.isEditing" />
														<label class="form-check-label"
															v-bind:for="'product' + index"></label>
													</div>
												</div>
											</div>
											<div>
												<!-- Add editing logic -->
												<a href="#" class="btn btn-theme d-block mb-2"
													@click.prevent="toggleEdit(stock)">Editar</a>
												<a href="#" class="btn btn-success d-block mb-2" v-if="stock.isEditing"
													@click.prevent="updateIngredient(stock)">Actualizar</a>
											</div>
										</div>
									</div>
								</div>
								<div v-else>
									<p class="text-center">No hay datos aún.</p>
								</div>
							</div>
						</div>
					</div>
					<!-- END pos-content -->
				</div>
			</div>
		</div>

	</div>

	<!-- MODALS -->

	<!-- Create New MenuItem MODAL -->
	<div class="modal modal-pos fade" tabindex="-1" id="addMenuItemModal" aria-labelledby="addMenuItemModalLabel"
		aria-hidden="true">
		<div class="modal-dialog">
			<div class="modal-content border-0">
				<div class="modal-header">
					<h5 class="modal-title" id="addMenuItemModalLabel">Agregar item al Menu</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" v-on:click="resetMenuItemData()"
						aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div class="container mt-4">
						<form v-on:submit.prevent="createMenuItem" id="addMenuItem">
							<!-- Categoria -->
							<div class="mb-3">
								<div class="dropdown">
									<button class="btn btn-secondary dropdown-toggle" type="button"
										id="dropdownMenuCategory" data-bs-toggle="dropdown" aria-expanded="false">
										{{ selectedCategory ? selectedCategory.name : 'Seleccione...' }}
									</button>
									<ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
										<li v-for="category in categories" :key="category.id">
											<a class="dropdown-item" href="#" @click="selectCategory(category.name)">
												{{ category.name }}
											</a>
										</li>
									</ul>
									<a href="#" style="margin: 10px;" @click="toggleCreateCategory()"><i
											class="fa-solid fa-plus"></i> Crear nueva categoria</a>
								</div>
							</div>
							<div class="mb-3" v-if="newCategory">
								<label for="CategoryName" class="form-label">Nueva categoria</label>
								<input type="text" class="form-control" id="CategoryName" v-model="categoryName">
							</div>
							<!-- Nombre -->
							<div class="mb-3">
								<label for="menuItemName" class="form-label">Nombre</label>
								<input type="text" class="form-control" id="menuItemName" v-model="menu.name" required>
							</div>
							<!-- Descripcion -->
							<div class="mb-3">
								<label for="menuItemDescription" class="form-label">Descripcion</label>
								<textarea class="form-control" id="menuItemDescription" rows="3"
									v-model="menu.description"></textarea>
							</div>
							<!-- Ingredientes -->
							<div class="mb-3">
								<label for="ingredientCheckbox" class="form-label">Ingredientes</label>
								<div class="ingredient-list-container border rounded p-2"
									style="height: 150px; overflow-y: auto;">
									<div v-for="ingredient in this.stockItems" :key="ingredient.id"
										class="d-flex align-items-center mb-2">
										<input class="form-check-input me-2" type="checkbox" :value="ingredient.id"
											:id="`ingredient-${ingredient.id}`" v-model="selectedIngredients">
										<label class="form-check-label me-2" :for="`ingredient-${ingredient.id}`">{{
										ingredient.name }}</label>
										<input type="number" class="form-control" style="width: 80px;"
											v-model="ingredientQuantities[ingredient.id]"
											:disabled="!selectedIngredients.includes(ingredient.id)" placeholder="Qty">
									</div>
								</div>
							</div>

							<!-- costos -->
							<div class="row mb-3">
								<!-- Precio de venta-->
								<div class="col mb-3">
									<label for="menuItemPrice" class="form-label">Precio de compra</label>
									<div class="input-group">
										<span class="input-group-text">$</span>
										<input type="number" class="form-control" id="menuItemPrice"
											v-model.number="menu.purchasePrice" required>
									</div>
								</div>
								<!-- Precio de venta-->
								<div class="col mb-3">
									<label for="menuItemPrice" class="form-label">Precio de venta</label>
									<div class="input-group">
										<span class="input-group-text">$</span>
										<input type="number" class="form-control" id="menuItemPrice"
											v-model.number="menu.sellingPrice" required>
									</div>
								</div>
							</div>
							<!-- IVA -->
							<div class="row mb-3">
								<div class=" col mb-3">
									<label for="menuItemIva" class="form-label">IVA</label>
									<div class="input-group" style="width: 30%;">
										<span class="input-group-text">%</span>
										<input type="number" class="form-control" id="menuItemIva"
											v-model.number="menu.iva" required>
									</div>

								</div>
							</div>
							<!-- Disponibilidad -->
							<div class="mb-3 form-check">
								<input type="checkbox" class="form-check-input" id="menuItemAvailability"
									v-model="menu.status">
								<label class="form-check-label" for="menuItemAvailability">Disponible</label>
							</div>
							<!-- Imagen -->
							<div class="mb-3 form-check">
								<input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
									v-model="uploadImage">
								<label class="form-check-label" for="uploadImageCheckbox">Subir imagen</label>
							</div>

							<div v-if="uploadImage" class="mb-3">
								<label for="menuItemImg" class="form-label">Imagen</label>
								<input type="file" class="form-control" id="menuItemImg" @change="previewImage"
									accept="image/*">
								<div v-if="imagePreview" class="mt-2">
									<img :src="imagePreview" class="img-thumbnail" alt="preview"
										style="max-height: 200px;">
								</div>
							</div>
						</form>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" v-on:click="resetMenuItemData()"
						data-bs-dismiss="modal">Cerrar</button>
					<button class="btn btn-theme" v-on:click="createMenuItem()">Guardar</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Create New Ingredient MODAL -->
	<div class="modal modal-pos fade" tabindex="-1" id="addStockItemModal" aria-labelledby="addStockItemModal"
		aria-hidden="true">
		<div class="modal-dialog">
			<div class="modal-content border-0">
				<div class="modal-header">
					<h5 class="modal-title" id="addMenuItemModalLabel">Agregar item al Inventario</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div class="container mt-4">
						<form v-on:submit.prevent="createStockItem" id="addStockItem">
							<!-- Nombre -->
							<div class="mb-3">
								<label for="stockItemName" class="form-label">Nombre</label>
								<input type="text" class="form-control" id="stockItemName" v-model="stock.name"
									required>
							</div>
							<!-- costos -->
							<div class="row mb-3">
								<!-- Precio de venta-->
								<div class="col mb-3">
									<label for="stockItemPrice" class="form-label">Precio de compra</label>
									<div class="input-group">
										<span class="input-group-text">$</span>
										<input type="number" class="form-control" id="stockItemPrice"
											v-model.number="stock.purchasePrice" required>
									</div>
								</div>
								<!-- Precio de venta-->
								<div class="col mb-3">
									<label for="stockItemPrice" class="form-label">Precio de venta</label>
									<div class="input-group">
										<span class="input-group-text">$</span>
										<input type="number" class="form-control" id="stockItemPrice"
											v-model.number="stock.sellingPrice" required>
									</div>
								</div>
							</div>
							<!-- Inventario -->
							<div class="row mb-3">
								<div class=" col mb-3">
									<label for="stockItemStock" class="form-label">Inventario</label>
									<div class="input-group" style="width: 30%;">
										<span class="input-group-text"><i class="fa-solid fa-cubes-stacked"></i></span>
										<input type="number" class="form-control" id="stockItemStock"
											v-model.number="stock.stock" required>
									</div>

								</div>
							</div>
							<!-- Disponibilidad -->
							<div class="mb-3 form-check">
								<input type="checkbox" class="form-check-input" id="stockItemAvailability"
									v-model="stock.status">
								<label class="form-check-label" for="stockItemAvailability">Disponible</label>
							</div>
						</form>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
					<button class="btn btn-theme" v-on:click="createIngredient()">Guardar</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Add Ingredient from the List Modal -->
	<div v-if="showAddIngredientModal" id="addIngredients" class="modal fade show" tabindex="-1" aria-labelledby="addIngredients"
		aria-modal="true" style="display: block; background-color: rgba(0, 0, 0, 0.5);">
		<div class="modal-dialog modal-dialog-centered modal-sm" role="document">
			<div class="modal-content bg-light">
				<div class="modal-header">
					<h5 class="modal-title" id="modalLabel">Selecciona uno o mas ingredientes</h5>
					<button type="button" class="btn-close" @click="closeIngredientModal" aria-label="Close"></button>
				</div>
				<div class="modal-body" style="max-height: 300px; overflow-y: auto;">
					<ul class="list-group">
						<li v-for="ingredient in modalIngredients" :key="ingredient.id"
							class="list-group-item d-flex align-items-center">
							<input type="checkbox" v-model="ingredient.selected" class="form-check-input me-2">
							{{ ingredient.name }}
							<input type="number" min="1" class="form-control ms-auto" placeholder="Qty"
								style="width: 70px;" v-model.number="ingredient.quantity"
								:disabled="!ingredient.selected">
						</li>
					</ul>
					<!-- Add New Ingredient Button -->
					<button class="btn btn-theme mt-2" @click="openAddStockItemModal">Crear
						Ingrediente Nuevo</button>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" @click="closeIngredientModal">Cerrar</button>
					<button type="button" class="btn btn-theme" @click="addSelectedIngredients">Agregar
						selección
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
<style scoped>
#addStockItemModal {
    z-index: 1070; /* Default is 1050 for modals */
}
</style>