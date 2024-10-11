<script>
import { ref as dbRef, query, orderByChild, equalTo, set, get, push, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/init';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import { useUserStore } from "@/stores/user-role";

export default {
	data() {
		return {
			// Logged User data
			userId: '',
			role: '',

			event: {
				name: '',
				desc: '',
				status: false,
				date: null,
			},
			selectedAffiliateIds: [],
			editEventData: {
				affiliates: [], // Array to hold only IDs for Firebase
				displayedAffiliates: [] // Array to hold affiliate objects for display
			},
			events: [],
			affiliates: [],

			imageFile: null,
			uploadImage: false,
			imagePreview: null,
			updatedImagePreview: null,
			isSubmitting: false,
			affiliatesChanged: false,
		}
	},
	methods: {
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

		// Fetch data
		async fetchEvents() {
			const eventsRef = dbRef(db, 'Events');

			try {
				const snapshot = await get(eventsRef);

				if (snapshot.exists()) {
					const events = snapshot.val();

					// Fetch affiliate data for each event
					this.events = await Promise.all(
						Object.keys(events).map(async (key) => {
							const event =
							{
								id: key,
								...events[key],
								date: new Date(events[key].date).toISOString().split('T')[0], // Format event date
							};

							// Fetch the list of affiliate IDs from the 'Affiliate' folder for the current event
							const affiliatesRef = dbRef(db, `Events/${key}/Affiliates`);
							const affiliatesSnapshot = await get(affiliatesRef);

							if (affiliatesSnapshot.exists()) {
								const affiliateIds = Object.keys(affiliatesSnapshot.val());

								// Fetch data for all affiliates using their IDs
								event.affiliates = await Promise.all(
									affiliateIds.map(async (affiliateId) => {
										const affiliateDataRef = dbRef(db, `Users/${affiliateId}`);
										const affiliateDataSnapshot = await get(affiliateDataRef);

										if (affiliateDataSnapshot.exists()) {
											return affiliateDataSnapshot.val();
										}
										return null; // Return null if affiliate data is not found
									})
								).then((affiliates) => affiliates.filter((aff) => aff !== null)); // Filter out any null values

							} else {
								event.affiliates = []; // No affiliates found for this event
							}

							return event;
						})
					);
				} else {
					this.events = []; // No events found
				}
			} catch (error) {
				console.error('Error fetching events:', error);
			}
		},
		async fetchAffiliates() {
			const role = 'afiliado';
			const affiliatesRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

			try {
				const snapshot = await get(affiliatesRef);

				if (snapshot.exists()) {
					const affiliates = snapshot.val();

					// Since Firebase data is an object, map to array for easier use
					this.affiliates = Object.keys(affiliates).map(key => ({
						id: key,
						...affiliates[key]
					}));
				} else {
					this.affiliates = [];
				}
			} catch (error) {
				console.error("Error fetching affiliates:", error);
			}
		},

		//CRUD methods for events
		async createEvent() {
			try {
				this.isSubmitting = true;
				// Check if an image was selected for upload and get URL
				let imageUrl = null;

				if (this.imageFile) {
					const sanitizedEventName = this.event.name.trim().toLowerCase().replace(/\s+/g, '-');
					const fileExtension = this.imageFile.name.split('.').pop();
					const fileName = `${sanitizedEventName}-logo.${fileExtension}`;

					const imageFileRef = storageRef(storage, `Events/${this.event.name}/${fileName}`);
					await uploadBytes(imageFileRef, this.imageFile);
					imageUrl = await getDownloadURL(imageFileRef);
				}

				const formattedDate = new Date(this.event.date).toISOString();

				// Prepare the data for submission
				const data = {
					name: this.event.name,
					desc: this.event.desc,
					status: this.event.status,
					date: formattedDate
				};

				if (imageUrl) {
					data.image = imageUrl;
				}

				const eventRef = dbRef(db, 'Events');
				const newEventRef = push(eventRef);
				await set(newEventRef, data);

				// Add multiple affiliates to the event
				if (this.selectedAffiliateIds.length > 0) {
					for (let affiliateId of this.selectedAffiliateIds) {
						const affiliateRef = dbRef(db, `Events/${newEventRef.key}/Affiliates/${affiliateId}`);
						await set(affiliateRef, affiliateId);
					}
				}

				this.showToast('Evento creado con exito!');
				console.log('Saving Affiliates:', this.selectedAffiliateIds, 'for Event:', newEventRef.key);

				//Reset form fields
				this.resetForm();
				await this.fetchEvents();
			} catch (error) {
				console.error("Error creating event:", error);
			} finally {
				this.isSubmitting = false;
			}
		},
		async deleteEvent(eventId, index) {
			console.log(eventId);
			if (confirm("¿Desea borrar este evento?")) {
				try {
					const eventRef = dbRef(db, `Events/${eventId}`);
					await remove(eventRef);

					// Remove the coupon from the local state
					this.events.splice(index, 1);

					Toastify({
						text: 'Evento eliminado con éxito!',
						duration: 3000,
						close: true,
						gravity: 'top',
						position: 'right',
						stopOnFocus: true,
						style: {
							background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
						},
					}).showToast();
				} catch (error) {
					console.error('Error deleting event:', error);
					alert('La eliminación del evento falló.');
				}
			}
		},

		// Edit events
		editEvent(event) {
			// Populate the modal fields with the plan data
			this.editEventData = {
				...event,
			};

			// Open the modal
			const modal = new Modal(document.getElementById('editEventModal'));
			modal.show();
		},
		async updateEvent(eventId) {
			try {
				this.isSubmitting = false;

				const eventRef = dbRef(db, `Events/${eventId}`);
				const eventSnapshot = await get(eventRef);

				if (!eventSnapshot.exists()) {
					console.error('Event not found');
					return;
				}

				const existingEventData = eventSnapshot.val();

				// Prepare the data for update
				const updateData = {};

				// Check for changes in the fields
				if (this.editEventData.name !== existingEventData.name) {
					updateData.name = this.editEventData.name;
				}

				if (this.editEventData.desc !== existingEventData.desc) {
					updateData.desc = this.editEventData.desc;
				}

				if (this.editEventData.date !== existingEventData.date) {
					updateData.date = new Date(this.editEventData.date).toISOString();
				}

				if (this.editEventData.status !== existingEventData.status) {
					updateData.status = this.editEventData.status;
				}

				// Update event data if there are any changes
				if (Object.keys(updateData).length > 0) {
					await update(eventRef, updateData);
					console.log("Event updated successfully");
				}

				// Only handle affiliates if they've been changed
				if (this.affiliatesChanged) {
					await this.updateAffiliates(eventId);
					this.affiliatesChanged = false;
				}

				// Success notification
				this.showToast('Evento actualizado con exito!');

				// Close the modal after saving
				const modal = Modal.getInstance(document.getElementById('editEventModal'));
				modal.hide();

				await this.fetchEvents();
			} catch (error) {
				console.error("Error creating event:", error);
			} finally {
				this.isSubmitting = false;
			}
		},
		// Affiliate update logic moved into its own method
		async updateAffiliates(eventId) {
			try {
				// If affiliates have changed, update them in Firebase
				if (this.affiliatesChanged) {
					const affiliatesRef = dbRef(db, `Events/${eventId}/Affiliates`);

					// Clear existing affiliates in Firebase (optional, if you want to remove old affiliates)
					//await set(affiliatesRef, null);

					// Add new affiliate IDs as properties with the same value
					if (this.editEventData.affiliates.length > 0) {
						for (let affiliateId of this.editEventData.affiliates) {
							const affiliateRef = dbRef(db, `Events/${eventId}/Affiliates/${affiliateId}`);
							await set(affiliateRef, affiliateId); // Store just the ID as both key and value
						}
					}
				}

				console.log("Affiliates updated successfully");
			} catch (error) {
				console.error("Error updating affiliates:", error);
			}
		},

		// Add affiliate and track changes
		addSelectedAffiliate() {
			this.selectedAffiliateIds.forEach(id => {
				if (!this.editEventData.affiliates.includes(id)) {
					this.editEventData.affiliates.push(id); // Only store the ID
					this.affiliatesChanged = true; // Mark affiliates as changed
				}
			});
			this.selectedAffiliateIds = []; // Clear selection after adding
		},

		// Remove affiliate and track changes
		removeAffiliate(index) {
			// Remove the affiliate from the local list to update the UI
			this.editEventData.affiliates.splice(index, 1);

			// Mark affiliates as changed so the updateEvent method knows there's a change
			this.affiliatesChanged = true;
		},

		resetForm() {
			// Reset form fields
			this.event = {
				name: '',
				desc: '',
				status: false,
				date: new Date(),
			};
			// Reset image upload state if there's one
			this.uploadImage = false;
			this.imagePreview = null;
		},
		previewImage(event) {
			const file = event.target.files[0];
			if (file) {
				this.imageFile = file;
				this.imagePreview = URL.createObjectURL(file);
			}
		},
		previewUpdatedImage(event, evento) {
			const file = event.target.files[0];
			if (file) {
				evento.imageFile = file;
				evento.updatedImagePreview = URL.createObjectURL(file);
			}
		},
		formatDate(date) {
			if (!date) return ''; // Handle invalid dates or null values
			const d = new Date(date);
			const day = String(d.getUTCDate()).padStart(2, '0'); // Ensure two-digit day
			const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
			const year = d.getUTCFullYear();
			return `${day}/${month}/${year}`;
		},
	},
	async mounted() {
		const userStore = useUserStore();
		await userStore.fetchUser();
		this.role = userStore.role;
		this.userId = userStore.userId;

		await this.fetchEvents();
	}
}
</script>
<template>
	<h2 class="mb-4 text-center text-uppercase fw-bold">
		eventos
	</h2>

	<!-- Admin view -->
	<div v-if="this.role === 'admin'" class="container">
		<div class="d-flex justify-content-end align-items-center">
			<a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#createEventModal"
				style="margin: 14px;" @click.prevent="fetchAffiliates()">
				<i class="fa fa-plus-circle fa-fw me-1"></i> Crear Evento
			</a>
		</div>

		<div class="container-fluid">
			<div class="row">
				<!-- No Events Registered -->
				<div v-if="events.length === 0" class="d-flex justify-content-center align-items-center"
					style="height: 100vh;">
					<div class="text-center">
						<div class="mb-3 mt-n5">
							<i class="fa-solid fa-pizza-slice text-body text-opacity-25" style="font-size: 5em"></i>
						</div>
						<h5>No hay Eventos registrados.</h5>
					</div>
				</div>

				<!-- Events Registered -->
				<div v-else>
					<!-- Loop through events and display them in cards -->
					<div class="row">
						<div v-for="(evento, index) in events" :key="evento.id" class="col-12 col-sm-6 col-md-4 mb-4">
							<div class="card h-100 position-relative">

								<!-- Image Display -->
								<div class="img-container position-relative">
									<div v-if="!evento.isEditing" class="img"
										:style="{ backgroundImage: 'url(' + evento.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
									</div>
									<div v-if="evento.isEditing">
										<div v-if="evento.updatedImagePreview" class="mt-2">
											<img :src="evento.updatedImagePreview" class="img-thumbnail" alt="preview"
												style="max-height: 200px;">
										</div>
										<input type="file" @change="event => previewUpdatedImage(event, evento)"
											class="form-control" />
									</div>
								</div>

								<!-- Event Information -->
								<div class="card-body d-flex flex-column">
									<h5 class="card-title text-truncate">{{ evento.name }}</h5>
									<p class="card-text"><strong>Fecha: </strong>{{ formatDate(evento.date) }}</p>

									<!-- Event's Affiliates -->
									<p class="card-text"><strong>Comercios Afiliados:</strong></p>
									<div class="row">
										<div v-for="affiliate in evento.affiliates" :key="affiliate.id"
											class="col-sm-6 mb-3">
											<div class="card h-100">
												<!-- Affiliate Image -->
												<div v-if="affiliate.image" class="card-img-top"
													:style="{ backgroundImage: 'url(' + affiliate.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '100px' }">
												</div>

												<!-- Affiliate Info -->
												<div class="card-body p-2">
													<h6 class="card-title text-center text-truncate">
														<strong>{{ affiliate.companyName }}</strong>
													</h6>
												</div>
											</div>
										</div>
									</div>

									<!-- Action Buttons -->
									<div class="d-flex justify-content-end mt-2">
										<!-- <button class="btn btn-sm btn-outline-info me-1"
											@click="editEvent(evento), fetchAffiliates()">
											<i class="fa-solid fa-pencil"></i>
										</button> -->
										<button class="btn btn-sm btn-outline-danger"
											@click="deleteEvent(evento.id, index)">
											<i class="fa-solid fa-trash"></i>
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal for creating new event -->
		<div class="modal fade" id="createEventModal" tabindex="-1" aria-labelledby="createEventModalLabel"
			aria-hidden="true">
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="createEventModalLabel">Crear Evento</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<div class="container">
							<!-- First Row -->
							<div class="row">
								<!-- Select Affiliates for the event -->
								<div class="col-lg-6 col-md-6 col-sm-12 mb-3">
									<label for="eventAffiliate" class="form-label">Comercios Afiliados para el
										Evento</label>
									<div class="dropdown">
										<button class="btn btn-secondary dropdown-toggle" type="button"
											id="dropdownMenuCategory" data-bs-toggle="dropdown"
											data-bs-auto-close="false" aria-expanded="false">
											{{ selectedAffiliateIds.length > 0 ? selectedAffiliateIds.map(id =>
												affiliates.find(aff => aff.id === id).companyName).join(', ') :
												'Seleccione...' }}
										</button>
										<ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
											<li v-if="affiliates.length === 0">
												<p style="margin: 10px;">No hay afiliados registrados.</p>
											</li>
											<li v-for="aff in affiliates" :key="aff.id">
												<div class="form-check" style="margin: 10px;">
													<input type="checkbox" class="form-check-input"
														:id="'dropdownCheck_' + aff.id" :value="aff.id"
														v-model="selectedAffiliateIds">
													<label class="form-check-label" :for="'dropdownCheck_' + aff.id">
														{{ aff.companyName }}
													</label>
												</div>
											</li>
										</ul>
									</div>
								</div>

								<!-- Name -->
								<div class="col-lg-6 col-md-6 col-sm-12 mb-3">
									<label for="eventName" class="form-label">Nombre</label>
									<input type="text" class="form-control" id="eventName" v-model="event.name" />
								</div>
							</div>

							<!-- Second Row -->
							<div class="row">
								<!-- Descripcion -->
								<div class="col-lg-6 col-md-6 col-sm-12 mb-3">
									<label for="eventDesc" class="form-label">Descripción</label>
									<textarea class="form-control" id="eventDesc" v-model="event.desc"></textarea>
								</div>

								<!-- Fecha -->
								<div class="col-lg-6 col-md-6 col-sm-12 mb-3">
									<label for="eventDate" class="form-label">Fecha</label>
									<input type="date" v-model="event.date" class="form-control" />
								</div>
							</div>

							<!-- Third Row -->
							<div class="row">
								<!-- Event Status -->
								<div class="col-lg-6 col-md-6 col-sm-12 mb-3 d-flex align-items-center">
									<div class="form-check">
										<input type="checkbox" class="form-check-input" id="eventStatus"
											v-model="event.status" />
										<label class="form-check-label" for="eventStatus">Activo</label>
									</div>
								</div>

								<!-- Upload Image Checkbox -->
								<div class="col-lg-6 col-md-6 col-sm-12 mb-3 d-flex align-items-center">
									<div class="form-check">
										<input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
											v-model="uploadImage">
										<label class="form-check-label" for="uploadImageCheckbox">Subir imagen</label>
									</div>
								</div>
							</div>

							<!-- Fourth Row - Image Upload -->
							<div class="row" v-if="uploadImage">
								<div class="col-lg-12 col-md-12 col-sm-12 mb-3">
									<label for="menuItemImg" class="form-label">Imagen</label>
									<input type="file" class="form-control" id="menuItemImg" @change="previewImage"
										accept="image/*">
									<div v-if="imagePreview" class="mt-2">
										<img :src="imagePreview" class="img-thumbnail" alt="preview"
											style="max-height: 200px;">
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
						<button type="button" class="btn btn-theme" @click="createEvent()"
							:disabled="isSubmitting">Crear</button>
						<!-- Loader Spinner -->
						<div v-if="isSubmitting" class="d-flex justify-content-center my-3">
							<div class="spinner-border text-primary" role="status">
								<span class="visually-hidden">Cargando...</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal for editing an event -->
		<div class="modal fade" id="editEventModal" tabindex="-1" aria-labelledby="editEventModalLabel"
			aria-hidden="true">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="editEventModalLabel">Editar Evento</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<div class="mb-3">
							<label class="form-label">Nombre</label>
							<input v-model="editEventData.name" type="text" class="form-control" />
						</div>
						<div class="mb-3">
							<label class="form-label">Descripción</label>
							<textarea v-model="editEventData.desc" class="form-control form-control-lg fs-15px" rows="5"
								required></textarea>
						</div>
						<div class="mb-3">
							<label class="form-label">Fecha</label>
							<input v-model="editEventData.date" type="date" class="form-control" />
						</div>
						<div class="mb-3">
							<div class="form-check mt-4">
								<input type="checkbox" class="form-check-input" v-model="editEventData.status" />
								<label class="form-check-label" for="eventStatus">Activo</label>
							</div>
						</div>

						<!-- Affiliates Dropdown -->
						<div class="mb-3">
							<label for="eventAffiliate" class="form-label">Agregar Comercios Afiliados</label>
							<div class="dropdown">
								<button class="btn btn-secondary dropdown-toggle" type="button"
									id="dropdownMenuAffiliate" data-bs-toggle="dropdown" data-bs-auto-close="false"
									aria-expanded="false">
									{{ selectedAffiliateIds.length > 0 ? selectedAffiliateIds.map(id =>
										affiliates.find(aff => aff.id === id).companyName).join(', ') : 'Seleccione...' }}
								</button>
								<ul class="dropdown-menu" aria-labelledby="dropdownMenuAffiliate">
									<li v-if="affiliates.length === 0">
										<p style="margin: 10px;">No hay afiliados registrados.</p>
									</li>
									<li v-for="aff in affiliates" :key="aff.id">
										<div class="form-check" style="margin: 10px;">
											<input type="checkbox" class="form-check-input"
												:id="'dropdownCheck_' + aff.id" :value="aff.id"
												v-model="selectedAffiliateIds">
											<label class="form-check-label" :for="'dropdownCheck_' + aff.id">{{
												aff.companyName }}</label>
										</div>
									</li>
								</ul>
							</div>
							<button @click.prevent="addSelectedAffiliate()" class="btn btn-theme btn-sm mt-2">Agregar
								Afiliado</button>
						</div>

						<!-- Display selected affiliates -->
						<div class="mb-3">
							<label class="form-label">Comercios Afiliados</label>
							<div v-for="(affiliate, index) in editEventData.affiliates" :key="index"
								class="d-flex align-items-center mb-2">
								<input v-model="affiliate.companyName" type="text" class="form-control me-2"
									style="width: auto;" disabled />
								<button @click="removeAffiliate(index)" class="btn btn-outline-danger btn-sm">
									<i class="fa-solid fa-trash"></i>
								</button>
							</div>
						</div>

					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
						<button type="button" class="btn btn-theme" @click="updateEvent(editEventData.id)">Guardar
							cambios</button>
						<!-- Loader Spinner -->
						<div v-if="isSubmitting" class="d-flex justify-content-center my-3">
							<div class="spinner-border text-primary" role="status">
								<span class="visually-hidden">Cargando...</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Client view -->
	<div v-if="this.role === 'cliente'" class="container">
		<h4 class="mb-4 fw-bold">Próximos eventos</h4>

		<div class="container-fluid">
			<div class="row">
				<div v-if="events.length === 0" class="d-flex justify-content-center align-items-center"
					style="height: 100vh;">
					<div class="text-center">
						<div class="mb-3 mt-n5">
							<i class="fa-solid fa-pizza-slice text-body text-opacity-25" style="font-size: 5em"></i>
						</div>
						<h5>No hay Eventos registrados.</h5>
					</div>
				</div>
				<div v-else>
					<!-- Loop through affiliates and display them in cards -->
					<div class="row">
						<div v-for="evento in events" :key="evento.id" class="col-12 col-sm-6 col-md-4 mb-4">
							<div class="card h-100 position-relative">
								<div class="img-container position-relative">
									<!-- Image Display -->
									<div class="img"
										:style="{ backgroundImage: 'url(' + evento.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
									</div>
								</div>

								<div class="card-body d-flex flex-column">
									<h5 class="card-title text-truncate">{{ evento.name }}</h5>
									<p class="card-text"><strong>Fecha: </strong>{{ formatDate(evento.date) }}</p>
									
									<!-- Event's Affiliates -->
									<p class="card-text"><strong>Comercios Afiliados:</strong></p>
									<div class="row">
										<div v-for="affiliate in evento.affiliates" :key="affiliate.id"
											class="col-sm-6 mb-3">
											<div class="card h-100">
												<!-- Affiliate Image -->
												<div v-if="affiliate.image" class="card-img-top"
													:style="{ backgroundImage: 'url(' + affiliate.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '100px' }">
												</div>

												<!-- Affiliate Info -->
												<div class="card-body p-2">
													<h6 class="card-title text-center text-truncate">
														<strong>{{ affiliate.companyName }}</strong>
													</h6>
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

	<!-- Affiliate view -->
	<div v-if="this.role === 'afiliado'" class="container">

	</div>
</template>
<style>
.btn-theme {
	background-color: purple;
	border-color: purple;
}
</style>