<script>
import { RouterLink } from 'vue-router';
import { useAppOptionStore } from '@/stores/app-option';
import { useTenancyStore } from '@/stores/tenancy';
import { useUserStore } from '@/stores/user-role';
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
				stock: '',
				status: '',
				purchasePrice: '',
				sellingPrice: '',
			},
			menuItems: [],
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
	created() {
		this.fetchMenuItems();
		this.fetchMenuCategories();
	},
	mounted() {
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

			const menuItemRef = dbRef(db, `MenuItems`);
			const menuItemSnapshot = await get(menuItemRef);

			if (menuItemSnapshot.exists()) {
				menuItemSnapshot.forEach((childSnapshot) => {
					const menuItemData = childSnapshot.val();
					this.menuItems.push({
						id: childSnapshot.key,
						image: menuItemData.image,
						name: menuItemData.name,
						description: menuItemData.description,
						stock: menuItemData.stock,
						sellingPrice: menuItemData.sellingPrice,
						status: menuItemData.status
					});
				});
			} else {
				console.log("No data available");
			}
		},

		async fetchMenuCategories() {

			const categoryRef = dbRef(db, `Categories`);
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
				stock: this.menu.stock,
				status: this.menu.status,
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
			this.resetMenuItemData();
			this.resetFileInputAndPreview();
		},

		resetMenuItemData() {
			this.menu = {
				name: '',
				description: '',
				stock: '',
				status: '',
				purchasePrice: '',
				sellingPrice: '',
			};
			this.toggleCreateCategory();
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
				stock: item.stock,
				status: item.status,
				image: imageUrl
			};

			try {
				await update(menuItemRef, updateData);
				console.log("Menu item updated successfully");

				// Update local item's image to ensure UI reactivity
				item.image = imageUrl;

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

		<div class="pos-content-container d-flex justify-content-end align-items-center">
			<a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#addMenuItemModal"
				style="margin: 14px;"><i class="fa fa-plus-circle fa-fw me-1"></i> Agregar Item al Menu</a>
		</div>

		<div class="pos-container">
			<!-- BEGIN pos-header -->
			<pos-header />
			<!-- END pos-header -->
			<!-- BEGIN pos-content -->
			<div class="pos-content">
				<div class="pos-content-container p-3">
					<div class="row gx-3">
						<div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 pb-3" v-for="(menu, index) in menuItems"
							:key="menu.id">
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
									<div v-if="!menu.isEditing" class="title text-truncate">{{ menu.name }}</div>
									<input v-if="menu.isEditing" type="text" class="form-control" v-model="menu.name" />
									<div v-if="!menu.isEditing" class="desc text-truncate">{{ menu.description }}</div>
									<input v-if="menu.isEditing" type="text" class="form-control"
										v-model="menu.description" />
									<div class="d-flex align-items-center mb-3">
										<div class="w-100px">Inventario:</div>
										<div class="flex-1">
											<input type="number" class="form-control" v-model="menu.stock"
												:disabled="!menu.isEditing" />
										</div>
									</div>
									<div class="d-flex align-items-center mb-3">
										<div class="w-100px">Precio de venta:</div>
										<div class="flex-1">
											<input type="number" class="form-control" v-model="menu.sellingPrice"
												:disabled="!menu.isEditing" />
										</div>
									</div>
									<div class="d-flex align-items-center mb-3">
										<div class="w-100px">Disponible:</div>
										<div class="flex-1">
											<div class="form-check form-switch">
												<input class="form-check-input" type="checkbox"
													v-bind:id="'product' + index" v-model="menu.status"
													:disabled="!menu.isEditing" />
												<label class="form-check-label" v-bind:for="'product' + index"></label>
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
					</div>
				</div>
			</div>
			<!-- END pos-content -->
		</div>

	</div>

	<!-- MODAL -->
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
							<!-- Inventario -->
							<div class="mb-3">
								<label for="menuItemStock" class="form-label">Inventario</label>
								<input type="number" class="form-control" id="menuItemStock" v-model.number="menu.stock"
									required>
							</div>
							<!-- costos -->
							<div class="row mb-3">
								<!-- Precio de venta-->
								<div class=" col mb-3">
									<label for="menuItemPrice" class="form-label">Precio de compra</label>
									<input type="number" class="form-control" id="menuItemPrice"
										v-model.number="menu.purchasePrice" required>
								</div>
								<!-- Precio de venta-->
								<div class="col mb-3">
									<label for="menuItemPrice" class="form-label">Precio de venta</label>
									<input type="number" class="form-control" id="menuItemPrice"
										v-model.number="menu.sellingPrice" required>
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
					<button class="btn btn-primary" v-on:click="createMenuItem()">Guardar</button>
				</div>
			</div>
		</div>
	</div>
</template>
