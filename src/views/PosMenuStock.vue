<script>
import { useAppOptionStore } from '@/stores/app-option';
import { RouterLink } from 'vue-router';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import axios from 'axios';
import PosHeader from '@/components/app/PosHeader.vue'

const appOption = useAppOptionStore();

export default {

	data() {
		return {
			menu: '',
			menuItem: {
				title: '',
				description: '',
				stock: 0,
				availability: false,
				price: 0,
				category: ''
			},
			imagePreview: '',
			// successModal: null,
		}
	},
	components: {
		PosHeader,
	},
	mounted() {
		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		appOption.appContentClass = 'p-0';
		appOption.appContentFullHeight = true;

		axios.get('/assets/data/pos/menu-stock.json').then((response) => {
			this.menu = response.data.menu;
		});
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
		appOption.appContentFullHeight = false;
	},
	methods: {
		previewImage(event) {
			const file = event.target.files[0];
			this.imagePreview = URL.createObjectURL(file);
		},

		submitForm() {
			// Form submission logic
			console.log('Form submitted:', this.menuItem);

			this.resetMenuItemData(); // reset form
			this.resetFileInputAndPreview(); // Manually reset the file input and image preview

			Toastify({
				text: "Item guardado con exito!",
				duration: 3000,
				close: true,
				gravity: "top", // `top` or `bottom`
				position: "right", // `left`, `center` or `right`
				stopOnFocus: true, // Prevents dismissing of toast on hover
				style: {
					background: "linear-gradient(to right, #00b09b, #96c93d)",
				},
			}).showToast();
		},

		resetMenuItemData() {
			this.menuItem = {
				title: '',
				description: '',
				stock: 0,
				price: 0,
				availability: false,
				category: ''
			};
			this.imagePreview = '';
		},

		resetFileInputAndPreview() {
			const fileInput = document.getElementById('menuItemImg');
			fileInput.value = '';
			this.imagePreview = '';
		},

		toggleEdit(item) {
			item.isEditing = !item.isEditing;
		},
		updateItem(item) {
			// Placeholder for update logic
			console.log("Update logic goes here");

			Toastify({
				text: "Item modificado con exito!",
				duration: 3000,
				close: true,
				gravity: "top", // `top` or `bottom`
				position: "right", // `left`, `center` or `right`
				stopOnFocus: true, // Prevents dismissing of toast on hover
				style: {
					background: "linear-gradient(to right, #00b09b, #96c93d)",
				},
			}).showToast();

			// Toggle edit mode off after update
			item.isEditing = false;
		},
	}
}
</script>
<template>
	<div class="pos pos-vertical pos-with-header" id="pos">

		<div class="pos-content-container d-flex justify-content-end align-items-center">
			<button type="button" class="btn btn-theme d-block mb-2" data-bs-toggle="modal"
				data-bs-target="#addMenuItemModal" style="margin: 14px;">
				Agregar Item al Menu
			</button>
		</div>

		<div class="pos-container">
			<!-- BEGIN pos-header -->
			<pos-header />
			<!-- END pos-header -->
			<!-- BEGIN pos-content -->
			<div class="pos-content">
				<div class="pos-content-container p-3">
					<div class="row gx-3">
						<div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 pb-3" v-if="menu" v-for="(menu, index) in menu">
							<div class="pos-product">
								<div class="img" v-bind:style="{ backgroundImage: 'url(' + menu.image + ')' }"></div>
								<div class="info">
									<div class="title text-truncate">{{ menu.title }}</div>
									<div class="desc text-truncate">{{ menu.description }}</div>
									<div class="d-flex align-items-center mb-3">
										<div class="w-100px">Inventario:</div>
										<div class="flex-1">
											<input type="number" class="form-control" v-bind:value="menu.stock"
												:disabled="!menu.isEditing" />
										</div>
									</div>
									<div class="d-flex align-items-center mb-3">
										<div class="w-100px">Precio de venta:</div>
										<div class="flex-1">
											<input type="number" class="form-control" v-bind:value="menu.price"
												:disabled="!menu.isEditing" />
										</div>
									</div>
									<div class="d-flex align-items-center mb-3">
										<div class="w-100px">Disponible:</div>
										<div class="flex-1">
											<div class="form-check form-switch">
												<input class="form-check-input" type="checkbox" name="qty"
													v-bind:id="'product' + index" v-bind:checked="menu.available" value="1"
													:disabled="!menu.isEditing" />
												<label class="form-check-label" v-bind:for="'product' + index"></label>
											</div>
										</div>
									</div>
									<div>
										<!-- Add editing logic -->
										<a href="#" class="btn btn-theme d-block mb-2"
											@click.prevent="toggleEdit(menu)">Editar</a>
										<!-- Update button - Only visible when isEditing is true -->
										<a href="#" class="btn btn-success d-block mb-2" v-if="menu.isEditing"
											@click.prevent="updateItem(menu)">Actualizar</a>
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
					<h5 class="modal-title" id="addMenuItemModalLabel">Agregar item de Menu</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div class="container mt-4">
						<form v-on:submit.prevent="submitForm" id="addMenuItem">
							<!-- Categoria -->
							<div class="mb-3">
								<div class="dropdown">
									<button class="btn btn-secondary dropdown-toggle" type="button"
										id="dropdownMenuCategory" data-bs-toggle="dropdown" aria-expanded="false">
										Categoria
										<!-- {{  categories : 'Categorias' }} -->
									</button>
									<ul class="dropdown-menu" aria-labelledby="dropdownMenuButton1">
										<!-- <li v-for="category in categories"><a class="dropdown-item" href="#" @click="selectCategory(category)">{{
									table }}</a></li> -->
									</ul>
								</div>
							</div>
							<!-- Nombre -->
							<div class="mb-3">
								<label for="menuItemTitle" class="form-label">Titulo</label>
								<input type="text" class="form-control" id="menuItemTitle" v-model="menuItem.title"
									required>
							</div>
							<!-- Descripcion -->
							<div class="mb-3">
								<label for="menuItemDescription" class="form-label">Descripcion</label>
								<textarea class="form-control" id="menuItemDescription" rows="3"
									v-model="menuItem.description"></textarea>
							</div>
							<!-- Inventario -->
							<div class="mb-3">
								<label for="menuItemStock" class="form-label">Inventario</label>
								<input type="number" class="form-control" id="menuItemStock" v-model.number="menuItem.stock"
									required>
							</div>
							<!-- costos -->
							<div class="row mb-3">
								<!-- Precio de venta-->
								<div class=" col mb-3">
									<label for="menuItemPrice" class="form-label">Precio de compra</label>
									<input type="number" class="form-control" id="menuItemPrice"
										v-model.number="menuItem.price" required>
								</div>
								<!-- Precio de venta-->
								<div class="col mb-3">
									<label for="menuItemPrice" class="form-label">Precio de venta</label>
									<input type="number" class="form-control" id="menuItemPrice"
										v-model.number="menuItem.price" required>
								</div>
							</div>
							<!-- Disponibilidad -->
							<div class="mb-3 form-check">
								<input type="checkbox" class="form-check-input" id="menuItemAvailability"
									v-model="menuItem.availability">
								<label class="form-check-label" for="menuItemAvailability">Disponible</label>
							</div>
							<!-- Imagen -->
							<div class="mb-3">
								<label for="menuItemImg" class="form-label">Imagen</label>
								<input type="file" class="form-control" id="menuItemImg" @change="previewImage"
									accept="image/*">
								<div v-if="imagePreview" class="mt-2">
									<img :src="imagePreview" class="img-thumbnail" alt="preview" style="max-height: 200px;">
								</div>
							</div>
						</form>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
					<button class="btn btn-primary" v-on:click="submitForm()">Guardar</button>
				</div>
			</div>
		</div>
	</div>
</template>
