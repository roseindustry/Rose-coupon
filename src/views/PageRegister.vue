<script>
import { defineComponent } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';
import { RouterLink } from 'vue-router';
import { auth, db, functions } from '@/firebase/init';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref as dbRef, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import venezuela from 'venezuela';

export default defineComponent({
	name: 'PageRegister',
	data() {
		return {
			referralCode: '',
			firstName: '',
			lastName: '',
			identification: '',
			email: '',
			phoneNumber: '',
			password: '',
			confirmPassword: '',
			role: 'cliente',
			subdomain: '',
			state: '',
			municipio: '',
			parroquia: '',
			businessName: '',
			rif: '',
			//acceptTerms: false,
			loading: false,
			formErrors: {
				emailUsed: false,
				rifUsed: false,
				identificationUsed: false,
				passwordMismatch: false,
				passwordTooShort: false,
			},
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
		};
	},
	beforeUnmount() {
		const appOption = useAppOptionStore();
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
	},
	computed: {
        formattedReferralCode: {
            get() {
                // Always return the value prefixed with 'REF-'
                return `REF-${this.referralCode.toUpperCase()}`;
            },
            set(value) {
                // Ensure only the part after 'REF-' is processed, and keep only valid characters
        const cleanedValue = value.replace(/^REF-/, ''); // Remove 'REF-' if it exists
        this.referralCode = cleanedValue.toUpperCase(); // Store the rest in uppercase
            }
        }
    },
	methods: {
		async sendEmail(payload) {
            try {
                const sendEmailFunction = httpsCallable(functions, 'sendEmail');
                await sendEmailFunction(payload);
            } catch (error) {
                console.error('Error sending email:', error);
            }
        },

		async submitForm() {
			// Password length validation
			if (this.password.length < 6) {
				this.formErrors.passwordTooShort = true;
				return;
			}

			// Password mismatch Validation
			if (this.password !== this.confirmPassword) {
				this.passwordMismatch = true;
				return;
			}
			this.formErrors.passwordMismatch = false;
			this.formErrors.passwordTooShort = false;

			try {

				this.loading = true; // Show loader

				// Query Users to check if email or identification is already used
				const usersRef = dbRef(db, `Users`);
				const snapshot = await get(usersRef);
				if (snapshot.exists()) {
					const users = snapshot.val();
					for (const uid in users) {
						if (users[uid].email === this.email || users[uid].identification === this.identification || users[uid].rif === this.rif) {
							this.formErrors.emailUsed = users[uid].email === this.email;
							this.formErrors.identificationUsed = users[uid].identification === this.identification;
							this.formErrors.rifUsed = users[uid].rif === this.rif;

							// Show a Toastify notification if the email, rif or cedula is already in use
							Toastify({
								text: "El usuario que intenta registrar ya existe.",
								duration: 3000,
								close: true,
								gravity: "top", // `top` or `bottom`
								position: "right", // `left`, `center` or `right`
								stopOnFocus: true, // Prevents dismissing of toast on hover
								style: {
									background: "linear-gradient(to right, #ff5f6d, #ffc371)",
								},
							}).showToast();
							this.loading = false; // Hide loader
							return;
						}
					}
				}

				// Referral code validation: Fetch users with role 'mesero' or 'promotora'
				let referredByEmployee = null;
				if (this.referralCode) {
					const employees = ['mesero', 'promotora'];

					// Query for 'mesero' role users
					const meseroQuery = query(dbRef(db, `Users`), orderByChild('role'), equalTo('mesero'));
					const meseroSnapshot = await get(meseroQuery);

					// Query for 'promotora' role users
					const promotoraQuery = query(usersRef, orderByChild('role'), equalTo('promotora'));
					const promotoraSnapshot = await get(promotoraQuery);

					// Combine results from both queries
					const employeeResults = { ...(meseroSnapshot.exists() ? meseroSnapshot.val() : {}), ...(promotoraSnapshot.exists() ? promotoraSnapshot.val() : {}) };

					// Check if referral code matches any employee
					for (const empUid in employeeResults) {
						if (employeeResults[empUid].codigoReferido === this.referralCode) {
							referredByEmployee = empUid;
							break;
						}
					}

					if (!referredByEmployee) {
						// Invalid referral code
						Toastify({
							text: "Código de referido inválido.",
							duration: 3000,
							close: true,
							gravity: "top",
							position: "right",
							stopOnFocus: true,
							style: {
								background: "linear-gradient(to right, #ff5f6d, #ffc371)",
							},
						}).showToast();
						this.loading = false;
						return;
					}

				}

				// Create the user
				const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
				const user = userCredential.user;

				// Set the user data in the database
				const userRef = dbRef(db, `Users/${user.uid}`);
				await set(userRef, {
					email: user.email,
					...(this.role === 'afiliado'
						? {
							companyName: this.businessName,
							rif: this.identification
						}
						: {
							firstName: this.firstName,
							lastName: this.lastName,
							identification: this.identification
						}),
					phoneNumber: this.phoneNumber,
					state: this.state,
					municipio: this.municipio,
					parroquia: this.parroquia,
					role: this.role,
				});

				console.log('User created:', user.uid);

				// If the user was referred, update the referred employee's 'referidos' list
				if (referredByEmployee) {
					const referidosRef = dbRef(db, `Users/${referredByEmployee}/referidos/${user.uid}`);
					await set(referidosRef, {
						referredAt: new Date().toISOString(),
					});
					console.log(`User referred by employee: ${referredByEmployee}`);
				}

				// Send an email notification to the admin through Firebase Cloud Functions
                const emailPayload = {
                    to: 'roseindustry11@gmail.com',
                    message: {
                        subject: `Nuevo ${this.role.charAt(0).toUpperCase() + this.role.slice(1)} registrado`,
                        text: `Hola administrador, el ${this.role.charAt(0).toUpperCase() + this.role.slice(1)} ${this.firstName} ${this.lastName} se ha registrado en Roseapp.`,
                    },
                };
                await this.sendEmail(emailPayload);

				// Toastify success message
				Toastify({
					text: "Bienvenido a bordo!",
					duration: 3000,
					close: true,
					gravity: "top", // `top` or `bottom`
					position: "right", // `left`, `center` or `right`
					stopOnFocus: true, // Prevents dismissing of toast on hover
					style: {
						background: "linear-gradient(to right, #00b09b, #96c93d)",
					},
				}).showToast();

				// After successful signup and data storage, redirect based on role
				if (this.role === 'cliente') {
					this.$router.push('/client-portal');
				} else if (this.role === 'admin') {
					this.$router.push('/');
				} else if (this.role === 'afiliado') {
					this.$router.push('/affiliate-portal');
				}

			} catch (error) {
				console.error('Error signing up');
				console.error(error);

				// Check for other errors
				Toastify({
					text: "Error al registrarse. Inténtalo de nuevo.",
					duration: 3000,
					close: true,
					gravity: "top", // `top` or `bottom`
					position: "right", // `left`, `center` or `right`
					stopOnFocus: true, // Prevents dismissing of toast on hover
					style: {
						background: "linear-gradient(to right, #ff5f6d, #ffc371)",
					},
				}).showToast();
			}

			// // Validation of Terms and conditions
			// if (this.acceptTerms === true) {

			// } else {
			// 	alert('Debes aceptar nuestros terminos para proceder.');
			// 	return;
			// }
		},
		resetForm() {
			this.firstName = '';
			this.lastName = '';
			this.identification = '';
			this.email = '';
			this.phoneNumber = '';
			// this.sector = '';
			// this.address = '';
			this.password = '';
			this.confirmPassword = '';
			this.role = 'cliente';
			this.passwordMismatch = false;
		},

		venezuelanStatesInfo(state) {
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
	}

});
</script>
<template>
	<!-- BEGIN register -->
	<div class="register">
		<!-- BEGIN register-content -->
		<div class="register-content">
			<form @submit.prevent="submitForm">
				<h1 class="text-center mb-4">Registro</h1>

				<!-- Conditional fields based on the selected role -->
				<div v-if="role === 'afiliado'">
					<div class="mb-3">
						<label class="form-label">Nombre del Comercio <span class="text-danger">*</span></label>
						<input v-model="businessName" type="text" class="form-control form-control-lg fs-15px"
							placeholder="e.g. Mi Comercio" required />
					</div>
					<div class="mb-3">
						<label class="form-label">RIF <span class="text-danger">*</span></label>
						<input v-model="rif" type="text" class="form-control form-control-lg fs-15px"
							placeholder="e.g. J-12345678-9" required />
						<small v-if="formErrors.rifUsed" class="text-danger">El RIF ya está en uso.</small>
					</div>
				</div>

				<div v-else>
					<div class="mb-3">
						<label class="form-label">Código de referido </label>
						<input v-model="formattedReferralCode" class="form-control form-control-lg fs-15px"
							value="" />
					</div>
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
						<label class="form-label">Cedula / Identificacion <span class="text-danger">*</span></label>
						<input v-model="identification" type="number" class="form-control form-control-lg fs-15px"
							placeholder="e.g 20555444" value="" required />
						<small v-if="formErrors.identificationUsed" class="text-danger">La identificación ya está en
							uso.</small>
					</div>
				</div>

				<div class="mb-3">
					<label class="form-label">Correo electronico <span class="text-danger">*</span></label>
					<input v-model="email" type="text" class="form-control form-control-lg fs-15px"
						placeholder="e.g username@address.com" value="" required />
					<small v-if="formErrors.emailUsed" class="text-danger">El correo electrónico ya está en uso.</small>
				</div>
				<div class="mb-3">
					<label class="form-label">Telefono <span class="text-secondary">(Opcional)</span></label>
					<input type="tel" v-model="phoneNumber" class="form-control form-control-lg fs-15px"
						placeholder="e.g 04145555555" value="" pattern="[0-9]{4}[0-9]{7}" />
				</div>
				<div class="mb-3">
					<label class="form-label">Estado</label>
					<select v-model="state" @change="venezuelanStatesInfo(state)"
						class="form-control form-control-lg fs-15px" placeholder="Seleccione un Estado">
						<option value="" disabled selected>Selecciona un estado</option>
						<option v-for="state in venezuelanStates" :key="state" :value="state">
							{{ state }}
						</option>
					</select>
				</div>
				<div v-if="showMunicipios" class="mb-3">
					<label class="form-label">Municipio</label>
					<select v-model="municipio" @change="displayParroquias(municipio)"
						class="form-control form-control-lg fs-15px" placeholder="Seleccione un Estado">
						<option value="" disabled selected>Selecciona un municipio</option>
						<option v-for="municipio in municipios" :key="municipio" :value="municipio">
							{{ municipio }}
						</option>
					</select>
				</div>
				<div v-if="showParroquias" class="mb-3">
					<label class="form-label">Parroquia</label>
					<select v-model="parroquia" class="form-control form-control-lg fs-15px"
						placeholder="Seleccione un Estado">
						<option value="" disabled selected>Selecciona una parroquia</option>
						<option v-for="parroquia in parroquias" :key="parroquia" :value="parroquia">
							{{ parroquia }}
						</option>
					</select>
				</div>
				<div class="mb-3">
					<label class="form-label">Contraseña <span class="text-danger">*</span></label>
					<input v-model="password" type="password" class="form-control form-control-lg fs-15px" value=""
						required />
					<small v-if="formErrors.passwordTooShort" class="text-danger">
						La contraseña debe tener al menos 6 caracteres.
					</small>
				</div>

				<div class="mb-3">
					<label class="form-label">Confirmar Contraseña <span class="text-danger">*</span></label>
					<input v-model="confirmPassword" type="password" class="form-control form-control-lg fs-15px"
						value="" required />
					<small v-if="formErrors.passwordMismatch" class="text-danger">Las contraseñas no coinciden.</small>
				</div>
				<p class="text-muted">(<span class="text-danger">*</span>) Campos obligatorios.</p>

				<!-- <div class="form-check mt-4 mb-3">
					<input type="checkbox" class="form-check-input" id="terms" v-model="acceptTerms" />
					<label class="form-check-label" for="terms">Acepto <a href="#" data-bs-toggle="modal"
							data-bs-target="#termsModal">Terminos y Condiciones</a>.</label>
				</div> -->
				<button type="submit" :disabled="loading" class="btn btn-theme btn-lg fs-15px fw-500 d-block w-100">
					<span v-if="loading" class="spinner-border spinner-border-sm" role="status"
						aria-hidden="true"></span>
					<span v-else>Registrar</span>
				</button>

				<div class="text-muted text-center mt-2">
					¿Ya estas registrado? <router-link style="color: purple;" to="/page/login">Iniciar
						sesion</router-link>
				</div>
			</form>
		</div>

		<!-- Modal for Terminos y condiciones -->
		<div class="modal fade" id="termsModal" tabindex="-1" aria-labelledby="termsModalLabel" aria-hidden="true">
			<div class="modal-dialog modal-lg modal-dialog-scrollable">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="termsModalLabel">Nuestros Términos y Condiciones</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<p>Conditions</p>
					</div>
				</div>
			</div>
		</div>

	</div>
</template>
<style>
.btn-theme {
	background-color: purple;
	border-color: purple;
}
</style>