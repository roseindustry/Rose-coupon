<script>
import { ref as dbRef, query, orderByChild, equalTo, set, get, push, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
			selectedAffiliateId: '',
			editEventData: {
				id: '',
				name: '',
				desc: '',
				status: false,
				date: new Date(),
			},
			events: [],
			affiliates: [],

			imageFile: null,
			uploadImage: false,
			imagePreview: null,
			updatedImagePreview: null,
			isSubmitting: false,
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
		setSelectedAffiliate(affiliate) {
			this.selectedAffiliateId = affiliate;
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
						Object.keys(events).map(async key => {
							const event = { id: key, ...events[key] };

							// Format the event date
							event.date = this.formatDate(event.date);
							console.log(event.date);
							// Fetch the affiliateId from the 'Affiliate' folder for the current event
							const affiliateRef = dbRef(db, `Events/${key}/Affiliate`);
							const affiliateSnapshot = await get(affiliateRef);

							if (affiliateSnapshot.exists()) {
								const affiliateId = Object.keys(affiliateSnapshot.val())[0];
								console.log(affiliateId);

								// fetch the affiliate data using the affiliateId
								const affiliateDataRef = dbRef(db, `Users/${affiliateId}`);
								const affiliateDataSnapshot = await get(affiliateDataRef);

								if (affiliateDataSnapshot.exists()) {
									event.affiliate = affiliateDataSnapshot.val();
								}
							}
							return event;
						})
					);
				} else {
					this.events = [];  // No events found
				}
			} catch (error) {
				console.error("Error fetching events:", error);
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
					console.log(this.affiliates);
				} else {
					this.affiliates = [];
				}
			} catch (error) {
				console.error("Error fetching affiliates:", error);
			}
		},

		//Create and delete events
		async createEvent() {
			try {
				this.isSubmitting = true;
				// Check if an image was selected for upload and get URL
				let imageUrl = null;
				let affiliateId = this.selectedAffiliateId || null;

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

				if (affiliateId) {
					const affiliateRef = dbRef(db, `Events/${newEventRef.key}/Affiliate/${affiliateId}`);
					await set(affiliateRef, affiliateId);
				}

				this.showToast('Evento creado con exito!');
				console.log('Saving Affiliate:', affiliateId, 'for Event:', newEventRef.key);

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
				...event
			};

			// Open the modal
			const modal = new Modal(document.getElementById('editEventModal'));
			modal.show();
		},
		async updateEvent(eventId) {
			const eventRef = dbRef(db, `Events/${eventId}`);

			const formattedDate = new Date(this.editEventData.date).toISOString();

			const updateData = {
				name: this.editEventData.name,
				desc: this.editEventData.desc,
				status: this.editEventData.status,
				date: formattedDate,
			};

			try {
				await update(eventRef, updateData);
				console.log("Event updated successfully");

				// Success notification
				this.showToast('Evento actualizado con exito!');
				// Close the modal after saving
				const modal = Modal.getInstance(document.getElementById('editEventModal'));
				modal.hide();
				await this.fetchEvents();
			} catch (error) {
				console.error("Error updating event:", error);
			}
		},

		resetForm() {
			// Reset form fields
			this.event = {
				name: '',
				desc: '',
				status: false,
				date: new Date(),
			};
			this.selectedAffiliateId = null;
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

		<!-- Display Events -->
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
						<div v-for="(evento, index) in events" :key="evento.id" class="col-12 col-sm-6 col-md-4 mb-4">
							<div class="card h-100 position-relative">
								<div class="img-container position-relative">
									<!-- Image Display -->
									<div v-if="!evento.isEditing" class="img"
										:style="{ backgroundImage: 'url(' + evento.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
									</div>
									<!-- Image Edit: File Input -->
									<div v-if="evento.isEditing">
										<div v-if="evento.updatedImagePreview" class="mt-2">
											<img :src="evento.updatedImagePreview" class="img-thumbnail" alt="preview"
												style="max-height: 200px;">
										</div>
										<input type="file" @change="event => previewUpdatedImage(event, evento)"
											class="form-control" />
									</div>
								</div>

								<div class="card-body d-flex flex-column">
									<h5 class="card-title text-truncate">{{ evento.name }}</h5>
									<p class="card-text"><strong>Fecha: </strong>{{ evento.date }}</p>
									<p class="card-text"><strong>Comercio Afiliado: </strong>{{
										evento.affiliate.companyName }}</p>
									<div v-if="evento.affiliate" class="img"
										:style="{ backgroundImage: 'url(' + evento.affiliate.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
									</div>
									<div class="d-flex justify-content-end mt-2">
										<button class="btn btn-sm btn-outline-info me-1" @click="editEvent(evento)">
											<i class="fa-solid fa-pencil"></i>
										</button>
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
							<div class="row">
								<!-- Select Affiliate comerce for event -->
								<div class="col-md-4 col-sm-6 mb-3">
									<label for="eventAffiliate" class="form-label">Comercios Afiliados para el
										Evento</label>

									<div class="dropdown">
										<button class="btn btn-secondary dropdown-toggle" type="button"
											id="dropdownMenuCategory" data-bs-toggle="dropdown" aria-expanded="false">
											{{ selectedAffiliateId.companyName ? selectedAffiliateId.companyName :
											'Seleccione...' }}
										</button>
										<ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
											<li v-if="affiliates.length === 0">
												<p style="margin: 10px;">No hay afiliados registrados.</p>
											</li>
											<li v-for="aff in affiliates" :key="aff.id">

												<div class="form-check" style="margin: 10px;">
													<input type="checkbox" class="form-check-input" id="dropdownCheck2">
													<label class="form-check-label" for="dropdownCheck2" @select="setSelectedAffiliate(aff)">
														{{ aff.companyName }}
													</label>
												</div>

												<!-- <a class="dropdown-item" href="#" @click="setSelectedAffiliate(aff)">
													{{ aff.companyName }}
												</a> -->
											</li>
										</ul>
									</div>
								</div>
								<!-- Name -->
								<div class="col-md-4 col-sm-6 mb-3">
									<label for="eventName" class="form-label">Nombre</label>
									<input type="text" class="form-control" id="eventName" v-model="event.name" />
								</div>
								<!-- Descripcion -->
								<div class="col-md-4 col-sm-6 mb-3">
									<label for="eventDesc" class="form-label">Descripción</label>
									<textarea class="form-control" id="eventDesc" v-model="event.desc"></textarea>
								</div>
								<!-- Fecha -->
								<div class="col-md-4 col-sm-6 mb-3">
									<label for="eventDate" class="form-label">Fecha</label>
									<input type="date" v-model="event.date" class="form-control" />
								</div>
							</div>
							<div class="row">
								<!-- Event Status -->
								<div class="col-md-4 col-sm-6 mb-3">
									<div class="form-check mt-4">
										<input type="checkbox" class="form-check-input" id="eventStatus"
											v-model="event.status" />
										<label class="form-check-label" for="eventStatus">Activo</label>
									</div>
								</div>
							</div>
							<div class="row">
								<!-- Upload Image Checkbox -->
								<div class="col-md-4 col-sm-6 mb-3">
									<div class="form-check">
										<input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
											v-model="uploadImage">
										<label class="form-check-label" for="uploadImageCheckbox">Subir imagen</label>
									</div>
								</div>
							</div>

							<!-- Image Upload -->
							<div class="row" v-if="uploadImage">
								<div class="col-md-12 mb-3">
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
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
						<button type="button" class="btn btn-theme" @click="updateEvent(editEventData.id)">Guardar
							cambios</button>
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
									<p class="card-text"><strong>Fecha: </strong>{{ evento.date }}</p>
									<p class="card-text"><strong>Comercio Afiliado: </strong>{{
										evento.affiliate.companyName }}</p>
									<div v-if="evento.affiliate" class="img"
										:style="{ backgroundImage: 'url(' + evento.affiliate.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
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