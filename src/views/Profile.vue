<script>
import { defineComponent, computed } from 'vue';
import navscrollto from '@/components/app/NavScrollTo.vue';
import { ScrollSpy } from 'bootstrap';
import { useUserStore } from '@/stores/user-role';
import { auth, db, storage } from '../firebase/init';
import { ref as dbRef, update, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import { Modal } from 'bootstrap';
import venezuela from 'venezuela';

export default defineComponent({
	components: {
		navScrollTo: navscrollto
	},
	data() {
		return {
			userId: '',
			role: '',
			userName: '',
			requestSent: '',

			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
			userVerified: null,

			// Common fields
			phoneNumber: '',
			email: '',
			state: '',
			municipio: '',
			parroquia: '',

			// Address info
			venezuelanStates: [
				"Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas",
				"Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital",
				"Falcón", "Guárico", "Lara", "Mérida", "Miranda",
				"Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira",
				"Trujillo", "Vargas", "Yaracuy", "Zulia"
			],
			municipios: [],
			parroquias: [],
			showMunicipios: false,
			showParroquias: false,

			// Cliente-specific fields
			firstName: '',
			lastName: '',
			identification: '',

			// Afiliado-specific fields
			companyName: '',
			rif: '',
			address: '',

			// Edit states
			editStates: {
				phoneNumber: false,
				email: false,
				password: false,
				state: false,
				municipio: false,
				parroquia: false,
				firstName: false,
				lastName: false,
				identification: false,
				companyName: false,
				rif: false,
				address: false,
			},

			//Verification data
			idFrontFile: null,
			idBackFile: null,
			selfieFile: null,
			idFrontPreview: null,
			idBackPreview: null,
			selfiePreview: null,

			isSubmitting: false,
			errorMessage: '',
			verificationModal: null,
		};
	},
	setup() {
		const userStore = useUserStore();

		// Expose userStore's state to the template
		const role = computed(() => userStore.role);

		return {
			role,
		};
	},
	mounted() {

		const userStore = useUserStore();
		const userId = userStore.userId;
		const role = userStore.role;
		this.userId = userId;
		this.role = role;
		this.userName = userStore.userName;
		const isVerified = userStore.isVerified;
		this.userVerified = isVerified;

		if (isVerified && !role === 'admin') {
			console.log('Usuario verificado')
		} else if (!role === 'admin') {
			console.log('No verificado')
		}

		// Immediately invoked async function within mounted
		(async () => {
			await userStore.fetchUser(); // Await the fetching of the user
			this.fetchUserData(userId);
		})();

		new ScrollSpy(document.body, {
			target: '#sidebar-bootstrap',
			offset: 200,
		});
		this.verificationModal = new Modal(document.getElementById('verificationModal'));

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

		fetchUserData(userId) {
			const userRef = dbRef(db, `Users/${userId}`);

			get(userRef)
				.then((snapshot) => {
					if (snapshot.exists()) {
						const userData = snapshot.val();
						this.requestSent = userData.requestedVerification;

						// Assign user data to field values
						for (let key in userData) {
							if (this[key] !== undefined) {
								this[key] = userData[key]; // Update the reactive data fields directly
							}
						}
					} else {
						console.log("No data available");
					}
				}).catch((error) => {
					console.error('Error fetching user data:', error);
				});
		},
		toggleEdit(fieldName) {
			// Toggle the edit state for the given fieldName
			this.editStates[fieldName] = !this.editStates[fieldName];
		},
		handleEditClick(fieldName) {
			// If editing 'municipio' or 'parroquia', trigger the respective function
			if (fieldName === 'municipio') {
				this.displayMunicipios(this.state); // Pass the current state
			} else if (fieldName === 'parroquia') {
				this.displayParroquias(this.municipio); // Pass the current municipio
			}
		},
		async updateField(fieldName) {
			const userStore = useUserStore();
			const userId = userStore.userId;

			// Reference the specific user data
			const userDataRef = dbRef(db, `Users/${userId}`);

			// Use the data property directly
			const updateData = {
				[fieldName]: this[fieldName] // this[fieldName] contains the updated value
			};

			try {
				// Perform the update operation and log the result
				await update(userDataRef, updateData);

				// Success notification
				Toastify({
					text: "Datos actualizados con éxito!",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					stopOnFocus: true,
					style: {
						background: "linear-gradient(to right, #00b09b, #96c93d)",
					},
				}).showToast();

				// Toggle off edit mode for this field
				this.toggleEdit(fieldName);
			} catch (error) {
				console.error("Error updating user data:", error);
			}
		},
		async changePassword() {
			if (this.newPassword !== this.confirmPassword) {
				alert('La nueva contraseña y la confirmación de contraseña no coinciden.');
				return;
			}

			const user = auth.currentUser;
			console.log(user);
			const credential = EmailAuthProvider.credential(user.email, this.currentPassword);

			try {
				await reauthenticateWithCredential(user, credential);
				await updatePassword(user, this.newPassword);
				Toastify({
					text: 'contraseña actualizada con éxito.',
					duration: 3000,
					close: true,
					gravity: 'top',
					position: 'right',
					stopOnFocus: true,
					style: {
						background: 'linear-gradient(to right, #00b09b, #96c93d)',
					},
				}).showToast();
				this.currentPassword = '';
				this.newPassword = '';
				this.confirmPassword = '';
			} catch (error) {
				console.error('Error updating password:', error);
				alert('Error al actualizar la contraseña. Inténtalo de nuevo.');
			}
		},

		//File uploads
		handleFileUpload(event, type) {
			const file = event.target.files[0];
			if (!file) return;

			// Update the correct file and preview based on the side
			if (type === 'front') {
				this.idFrontFile = file;
				this.idFrontPreview = URL.createObjectURL(file);
			} else if (type === 'back') {
				this.idBackFile = file;
				this.idBackPreview = URL.createObjectURL(file);
			} else if (type === 'selfie') {
				this.selfieFile = file;
				this.selfiePreview = URL.createObjectURL(file);
			}
		},
		async uploadFile(file, type) {
			// Define storage reference for front or back ID file
			const fileName = `${type === 'selfie' ? 'selfie' : `${type}-ID`}.${file.name.split('.').pop()}`;
			const fileRef = storageRef(storage, `verification-files/${this.userId}-${this.userName}/${fileName}`);

			// Upload the file and get the download URL
			await uploadBytes(fileRef, file);
			return getDownloadURL(fileRef);
		},

		// User verification
		async submitVerification() {
			if (!this.idFrontFile || !this.idBackFile || !this.selfieFile) {
				this.errorMessage = 'Todos los archivos de identificación son requeridos.';
				return;
			}

			try {
				// Show the loader
				this.isSubmitting = true;
				this.errorMessage = '';

				// Upload files
				const frontUrl = await this.uploadFile(this.idFrontFile, 'front');
				const backUrl = await this.uploadFile(this.idBackFile, 'back');
				const selfieUrl = await this.uploadFile(this.selfieFile, 'selfie');

				console.log('Files uploaded successfully:', frontUrl, backUrl, selfieUrl);

				//Update user to set field user.requestedVerification = true
				const userRef = dbRef(db, `Users/${this.userId}`);
				await update(userRef,
					{
						'verificationFiles/Front-ID': frontUrl,
						'verificationFiles/Back-ID': backUrl,
						'verificationFiles/Selfie': selfieUrl,
						requestedVerification: true
					});

				//Success toast
				this.showToast('Archivos subidos!');

				//reset the image previews
				this.idFrontPreview = null;
				this.idBackPreview = null;
				this.selfiePreview = null;
				this.verificationStatus = 'pending';
				this.requestSent = true;

				// Hide the modal after submission
				this.verificationModal.hide();
			} catch (error) {
				console.error('Error during verification:', error);
				this.errorMessage = 'Error al subir los archivos, por favor intente nuevamente.';
			} finally {
				// Hide the loader
				this.isSubmitting = false;
			}
		},

		//Address info
		displayMunicipios(state) {
			const z = venezuela.estado(state, { municipios: true });
			const munis = z.municipios;
			if (munis) {
				this.municipios = munis;
				this.showMunicipios = true;
			}
		},
		displayParroquias(municipio) {
			const y = venezuela.municipio(municipio, { parroquias: true });
			this.parroquias = y.parroquias;
			if (this.parroquias) {
				this.showParroquias = true;
			}
		},
	},
	computed: {
		currentPageName() {
			return this.$route.name;
		},
		// Dynamically determine which fields to display based on user role
		displayedFields() {
			if (this.role === 'afiliado') {
				return [
					{ name: 'companyName', label: 'Nombre del Comercio', value: this.companyName },
					{ name: 'rif', label: 'RIF', value: this.rif },
					{ name: 'phoneNumber', label: 'Telefono', value: this.phoneNumber },
					{ name: 'email', label: 'Correo electronico', value: this.email },
					{ name: 'state', label: 'Estado', value: this.state },
					{ name: 'municipio', label: 'Municipio', value: this.municipio },
					{ name: 'parroquia', label: 'Parroquia', value: this.parroquia },
					{ name: 'address', label: 'Dirección', value: this.address, special: true },
				];
			} else {
				return [
					{ name: 'firstName', label: 'Nombre', value: this.firstName },
					{ name: 'lastName', label: 'Apellido', value: this.lastName },
					{ name: 'identification', label: 'Cedula', value: this.identification },
					{ name: 'phoneNumber', label: 'Telefono', value: this.phoneNumber },
					{ name: 'email', label: 'Correo electronico', value: this.email },
					{ name: 'state', label: 'Estado', value: this.state },
					{ name: 'municipio', label: 'Municipio', value: this.municipio },
					{ name: 'parroquia', label: 'Parroquia', value: this.parroquia }
				];
			}
		},
		isProfileIncomplete() {
			if (this.role === 'afiliado') {
				return !this.state || !this.municipio || !this.parroquia || !this.address;
			} else {
				return !this.state || !this.municipio || !this.parroquia;
			}

		},
	},
});
</script>
<template>
	<!-- BEGIN container -->
	<div class="container py-5 h-100">
		<!-- Breadcrumbs -->
		<nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
			<ol class="breadcrumb">
				<li class="breadcrumb-item">
					<router-link v-if="this.role === 'admin'" to="/">
						Dashboard
					</router-link>
					<router-link v-else-if="this.role === 'cliente'" to="/client-portal">
						Portal de Cliente
					</router-link>
					<router-link v-else to="/affiliate-portal">
						Portal de Afiliado
					</router-link>
				</li>
				<li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
			</ol>
		</nav>

		<!-- Info div for completing profile -->
		<div v-if="(role === 'cliente' || role === 'afiliado') && isProfileIncomplete"
			class="alert alert-info d-inline-flex align-items-center mt-2" role="alert" style="width: auto;">
			<i class="fa-solid fa-info-circle me-2"></i>
			<div>
				<strong>Completa tu perfil:</strong> Para disfrutar de los beneficios de promociones y
				descuentos
				exclusivos, completa toda la información de tu perfil.
			</div>
		</div>
		<div v-else-if="(role === 'cliente' || role === 'afiliado') && !isProfileIncomplete">
			<div class="alert alert-success d-inline-flex align-items-center" style="width: auto;">
				<div class="text-muted">
					<span class="text-success d-inline-flex justify-content-center align-items-center"
						style="font-size: 0.9rem;">
						<i class="fa fa-check me-2" style="font-size: 1.25rem;"></i>
						<strong>Perfil completo.</strong>
					</span>
				</div>
			</div>
		</div>
		<!-- Request Verification -->
		<div v-if="(role === 'cliente') && !this.userVerified"
			class="alert alert-warning d-inline-flex align-items-center mb-5" role="alert" style="width: auto;">
			<i class="fa-solid fa-exclamation-circle me-2"></i>
			<div>
				<strong>Verifica tu cuenta:</strong> Para asegurar la seguridad de tu cuenta y acceder a todas
				las
				funcionalidades, solicita la verificación de tu cuenta.
				<button v-if="!this.requestSent" class="btn btn-warning btn-sm ms-3" data-bs-toggle="modal"
					data-bs-target="#verificationModal">
					Solicitar Verificación
				</button>
				<button v-else class="btn btn-secondary btn-sm ms-3" disabled>
					Solicitud enviada
				</button>
			</div>
		</div>

		<div class="row">
			<div class="col-xl-9">
				<!-- General user info -->
				<div id="general" class="mb-5 mt-3">
					<h4><i class="far fa-user fa-fw"></i> General <span
							v-if="(role === 'cliente' || role === 'afiliado') && this.userVerified"
							class="badge text-bg-success">Verificado</span></h4>
					<p>Puedes actualizar tus datos de usuario aqui.</p>
					<div class="card shadow-sm">
						<div class="list-group list-group-flush">
							<div class="list-group-item" v-for="field in displayedFields" :key="field.name">
								<div class="d-flex justify-content-between align-items-center flex-wrap">
									<div class="flex-fill pe-2">
										<div class="fw-bold">{{ field.label }}</div>

										<!-- Display field value when not in edit mode -->
										<div v-if="!editStates[field.name]"
											:class="{ 'text-danger': field.name === 'address' && !field.value, 'text-secondary': field.value }">
											{{ field.value || (field.name === 'address' ? 'Completa este campo para que tus clientes te encuentren mejor.' : '') }}
										</div>

										<!-- Check if in edit mode and show appropriate input based on field.name -->
										<template v-if="editStates[field.name]">
											<select v-if="field.name === 'state'" v-model="state"
												@change="displayMunicipios(state)" class="form-control mt-2">
												<option value="" disabled selected>Selecciona un estado</option>
												<option v-for="(state, index) in venezuelanStates" :key="index"
													:value="state">
													{{ state }}
												</option>
											</select>
											<select v-else-if="field.name === 'municipio' && showMunicipios"
												v-model="municipio" @change="displayParroquias(municipio)"
												class="form-control mt-2">
												<option value="" disabled selected>Selecciona un municipio</option>
												<option v-for="(municipio, index) in municipios" :key="index"
													:value="municipio">
													{{ municipio }}
												</option>
											</select>
											<select v-else-if="field.name === 'parroquia' && showParroquias"
												v-model="parroquia" class="form-control mt-2">
												<option value="" disabled selected>Selecciona una parroquia</option>
												<option v-for="(parroquia, index) in parroquias" :key="index"
													:value="parroquia">
													{{ parroquia }}
												</option>
											</select>
											<!-- Use a dynamic v-model for text fields -->
											<input v-else v-model="this[field.name]" type="text"
												class="form-control mt-2">
										</template>
									</div>

									<!-- Botones -->
									<div class="btn-group" role="group">
										<!-- Show "Edit" button when not in edit mode -->
										<button class="btn btn-transparent btn-sm me-1" v-if="!editStates[field.name]"
											@click.prevent="toggleEdit(field.name); handleEditClick(field.name)">
											<i class="fa-solid fa-pencil text-primary"></i>
										</button>

										<!-- Show "Save" and "Cancel" buttons when in edit mode -->
										<button class="btn btn-transparent btn-sm me-1" v-if="editStates[field.name]"
											@click.prevent="updateField(field.name)">
											<i class="fa-solid fa-save text-success"></i>
										</button>
										<button class="btn btn-transparent btn-sm me-1" v-if="editStates[field.name]"
											@click.prevent="toggleEdit(field.name)">
											<i class="fa-solid fa-times text-secondary"></i>
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Change Password Section -->
				<div id="change-password" class="mb-5">
					<h4><i class="fas fa-key fa-fw"></i> Cambiar Contraseña</h4>
					<p>Actualiza tu contraseña aquí.</p>
					<div class="card shadow-sm">
						<div class="card-body">
							<div class="mb-3">
								<label for="currentPassword" class="form-label">Contraseña Actual</label>
								<input type="password" class="form-control" id="currentPassword"
									v-model="currentPassword">
							</div>
							<div class="mb-3">
								<label for="newPassword" class="form-label">Nueva Contraseña</label>
								<input type="password" class="form-control" id="newPassword" v-model="newPassword">
							</div>
							<div class="mb-3">
								<label for="confirmPassword" class="form-label">Confirmar Nueva Contraseña</label>
								<input type="password" class="form-control" id="confirmPassword"
									v-model="confirmPassword">
							</div>
							<button class="btn btn-theme" @click.prevent="changePassword">Actualizar
								Contraseña</button>
						</div>
					</div>
				</div>

				<!-- <div id="notifications" class="mb-5">
					<h4><i class="far fa-bell fa-fw"></i> Notificaciones</h4>
					<p>Habilite o deshabilite las notificaciones que desea recibir.</p>
					<div class="card">
						<div class="list-group list-group-flush">
							<div class="list-group-item d-flex align-items-center">
								<div class="flex-fill">
									<div>Comments</div>
									<div class="text-gray-500 d-flex align-items-center">
										<i class="fa fa-circle fs-8px fa-fw text-success me-1"></i> Enabled
										(Push, SMS)
									</div>
								</div>
								<div>
									<a class="btn btn-default w-100px">Editar</a>
								</div>
							</div>
							<div class="list-group-item d-flex align-items-center">
								<div class="flex-fill">
									<div>Tags</div>
									<div class="text-gray-500 d-flex align-items-center">
										<i class="fa fa-circle fs-8px fa-fw text-muted me-1"></i> Disabled
									</div>
								</div>
								<div>
									<a class="btn btn-default w-100px">Editar</a>
								</div>
							</div>
							<div class="list-group-item d-flex align-items-center">
								<div class="flex-fill">
									<div>Reminders</div>
									<div class="text-gray-500 d-flex align-items-center">
										<i class="fa fa-circle fs-8px fa-fw text-success me-1"></i> Enabled
										(Push, Email, SMS)
									</div>
								</div>
								<div>
									<a class="btn btn-default w-100px">Editar</a>
								</div>
							</div>
							<div class="list-group-item d-flex align-items-center">
								<div class="flex-fill">
									<div>New orders</div>
									<div class="text-gray-500 d-flex align-items-center">
										<i class="fa fa-circle fs-8px fa-fw text-success me-1"></i> Enabled
										(Push, Email, SMS)
									</div>
								</div>
								<div>
									<a class="btn btn-default w-100px">Editar</a>
								</div>
							</div>
						</div>
					</div>
				</div> -->
			</div>
			<div class="col-xl-3">
				<nav id="sidebar-bootstrap" class="navbar navbar-sticky d-none d-xl-block">
					<nav class="nav">
						<nav-scroll-to target="#general" data-toggle="scroll-to">General</nav-scroll-to>
						<nav-scroll-to target="#change-password" data-toggle="scroll-to">Cambiar
							contraseña</nav-scroll-to>
						<!-- <nav-scroll-to target="#notifications" data-toggle="scroll-to">Notifications</nav-scroll-to> -->
					</nav>
				</nav>
			</div>
		</div>

		<!-- Modal for ID upload -->
		<div class="modal fade" id="verificationModal" tabindex="-1" aria-labelledby="verificationModalLabel"
			aria-hidden="true">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="verificationModalLabel">Subir Documento de Identificación</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<form @submit.prevent="submitVerification">
							<div class="mb-3">
								<label for="idFront" class="form-label">Frontal de la Cédula/Identificación</label>
								<input type="file" class="form-control" id="idFront"
									@change="handleFileUpload($event, 'front')" required>
								<img v-if="idFrontPreview" :src="idFrontPreview" alt="Front ID Preview"
									class="img-fluid mt-2" />
							</div>
							<div class="mb-3">
								<label for="idBack" class="form-label">Parte Trasera de la Cédula/Identificación</label>
								<input type="file" class="form-control" id="idBack"
									@change="handleFileUpload($event, 'back')" required>
								<img v-if="idBackPreview" :src="idBackPreview" alt="Back ID Preview"
									class="img-fluid mt-2" />
							</div>
							<div class="mb-3">
								<label for="selfie" class="form-label">Foto Selfie con Cédula visible</label>
								<input type="file" class="form-control" id="selfie"
									@change="handleFileUpload($event, 'selfie')" required>
								<img v-if="selfiePreview" :src="selfiePreview" alt="Selfie Preview"
									class="img-fluid mt-2" />
							</div>

							<!-- Error Message -->
							<div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

							<!-- Loader Spinner -->
							<div v-if="isSubmitting" class="d-flex justify-content-center my-3">
								<div class="spinner-border text-primary" role="status">
									<span class="visually-hidden">Cargando...</span>
								</div>
							</div>
							<button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cerrar</button>
							<!-- Submit Button is disabled during submission -->
							<button type="submit" class="btn btn-primary" :disabled="isSubmitting">
								Subir y Solicitar Verificación
							</button>
						</form>
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

.btn-transparent {
	background-color: transparent;
	border: none;
	padding: 0.5rem;
}

.btn-transparent:hover {
	background-color: #f0f0f0;
	border-radius: 5px;
}

.card {
	background-color: #29122f;
}

.list-group-item {
	background-color: #29122f;
}
</style>