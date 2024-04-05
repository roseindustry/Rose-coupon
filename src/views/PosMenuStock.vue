<script>
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
			selectedCategory: null,
			categoryName: '',
			newCategory: false,
			uploadImage: false,
			imageFile: null,
			imagePreview: null,
			updatedImagePreview: null
		}
	},
	components: {
		PosHeader,
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
		async fetchMenuItems() {
			const tenancyStore = useTenancyStore();
			const tenantId = tenancyStore.tenant.key;

			const menuItemRef = query(dbRef(db, 'MenuItems'), orderByChild('tenant_id'), equalTo(tenantId));
			const menuItemSnapshot = await get(menuItemRef);

			if (menuItemSnapshot.exists()) {
				menuItemSnapshot.forEach((childSnapshot) => {
					const menuItemData = childSnapshot.val();
					this.menuItems.push({
						id: childSnapshot.key,
						image: menuItemData.image,
						name: menuItemData.name,
						description: menuItemData.description,
						sellingPrice: menuItemData.sellingPrice,
						status: menuItemData.status
					});
				});
			} else {
				console.log("No data available");
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

			let categoryId = this.selectedCategory ? this.selectedCategory.id : null;

			// If a new category is being created, create it and use its ID.
			if (this.newCategory && this.categoryName.trim() !== '') {
				categoryId = await this.createCategory(this.categoryName);
			}

			// Prepare the data for submission
			const submission = {
				category_id: categoryId,
				name: this.menu.name,
				description: this.menu.description,
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
			this.selectedCategory = null;
			this.categoryName = "";
			this.resetMenuItemData();
			this.resetFileInputAndPreview();
		},

		async createIngredient() {
			// Tenant id
			const tenancyStore = useTenancyStore();
			await tenancyStore.findOrCreateTenant();
			const tenantId = tenancyStore.tenant.key;

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
			this.menu = {
				name: '',
				description: '',
				status: '',
				purchasePrice: '',
				sellingPrice: '',
			};
			this.toggleCreateCategory();
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
				status: item.status
			};

			// Only add the image to updateData if imageUrl is defined
			if (imageUrl) {
				updateData.image = imageUrl;
			}

			try {
				await update(menuItemRef, updateData);
				console.log("Menu item updated successfully");

				// Update the item's image property for UI reactivity
				if (imageUrl) {
					item.image = imageUrl;
				}

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
		}
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

				<div class="pos-container">
					<!-- BEGIN pos-content -->
					<div class="pos-content">
						<div class="pos-content-container p-3">
							<div class="row gx-3">
								<div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 pb-3" v-if="menuItems"
									v-for="(menu, index) in menuItems" :key="menu.id">
									<div class="pos-product">
										<div class="img-container position-relative">
											<!-- Image Display -->
											<div v-if="!updatedImagePreview" class="img"
												v-bind:style="{ backgroundImage: 'url(' + menu.image + ')' }">
											</div>

											<!-- Image Edit: File Input -->
											<div v-if="menu.isEditing">
												<div v-if="updatedImagePreview" class="mt-2">
													<img :src="updatedImagePreview" class="img-thumbnail" alt="preview"
														style="max-height: 200px;">
												</div>
												<input type="file" @change="event => previewUpdatedImage(event, menu)"
													class="form-control" />
											</div>

											<button class="btn btn-danger position-absolute top-0 end-0"
												@click.prevent="deleteItem(menu, index)">
												<i class="fa-solid fa-trash"></i>
											</button>
										</div>
										<div class="info">
											<div v-if="!menu.isEditing" class="title text-truncate">{{ menu.name }}
											</div>
											<input v-if="menu.isEditing" type="text" class="form-control"
												v-model="menu.name" />
											<div v-if="!menu.isEditing" class="desc text-truncate">{{ menu.description
												}}
											</div>
											<input v-if="menu.isEditing" type="text" class="form-control"
												v-model="menu.description" />
											<!-- Selling Price Input Group -->
											<div class="mb-3">
												<div class="input-group">
													<span class="input-group-text w-100px text-wrap"
														id="sellingPrice-addon">Precio de venta $</span>
													<input type="number" class="form-control"
														v-model="menu.sellingPrice" :disabled="!menu.isEditing"
														aria-label="Precio de venta"
														aria-describedby="sellingPrice-addon">
												</div>
											</div>

											<!-- IVA Input Group -->
											<div class="mb-3">
												<div class="input-group">
													<span class="input-group-text w-100px" id="iva-addon">IVA %</span>
													<input type="number" class="form-control" v-model="menu.iva"
														:disabled="!menu.isEditing" aria-label="IVA"
														aria-describedby="iva-addon">
												</div>
											</div>

											<div class="d-flex align-items-center mb-3">
												<div class="w-100px">Disponible:</div>
												<div class="flex-1">
													<div class="form-check form-switch">
														<input class="form-check-input" type="checkbox"
															v-bind:id="'product' + index" v-model="menu.status"
															:disabled="!menu.isEditing" />
														<label class="form-check-label"
															v-bind:for="'product' + index"></label>
													</div>
												</div>
											</div>
											<div>
												<!-- Add editing logic -->
												<a href="#" class="btn btn-theme d-block mb-2"
													@click.prevent="toggleEdit(menu)">Editar</a>
												<a href="#" class="btn btn-success d-block mb-2" v-if="menu.isEditing"
													@click.prevent="updateMenuItem(menu)">Actualizar</a>
											</div>
										</div>
									</div>
								</div>
								<div v-else>
									<p>No hay datos aún.</p>
								</div>
							</div>
						</div>
					</div>
					<!-- END pos-content -->
				</div>
			</div>

			<!-- Stock items -->
			<div class="tab-pane fade h-100" id="stock">
				<div class="pos-content-container d-flex justify-content-end align-items-center">
					<a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#addStockItemModal"
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
											<div v-if="!stock.isEditing" class="title text-truncate text-center mb-3">{{ stock.name }}
											</div>
											<input v-if="stock.isEditing" type="text" class="form-control"
												v-model="stock.name" />

											<!-- Selling Price Input Group -->
											<div class="mb-3">
												<div class="input-group">
													<span class="input-group-text text-wrap" id="sellingPrice-addon">Precio de
														venta:</span>
													<input type="number" class="form-control"
														v-model="stock.sellingPrice" :disabled="!stock.isEditing"
														aria-label="Precio de venta"
														aria-describedby="sellingPrice-addon">
												</div>
											</div>

											<!-- Inventory Input Group -->
											<div class="mb-3">
												<div class="input-group">
													<span class="input-group-text text-wrap"
														id="inventory-addon">Inventario:</span>
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
													@click.prevent="updateMenuItem(stock)">Actualizar</a>
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

	<!-- MenuItems MODAL -->
	<div class="modal modal-pos fade" tabindex="-1" id="addMenuItemModal" aria-labelledby="addMenuItemModalLabel"
		aria-hidden="true">
		<div class="modal-dialog">
			<div class="modal-content border-0">
				<div class="modal-header">
					<h5 class="modal-title" id="addMenuItemModalLabel">Agregar item al Menu</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
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

	<!-- StockItems MODAL -->
	<div class="modal modal-pos fade" tabindex="-1" id="addStockItemModal" aria-labelledby="addMenuItemModalLabel"
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
</template>
