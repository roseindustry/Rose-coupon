<script>
import { defineComponent } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';
import { RouterLink } from 'vue-router';
import { auth, db, functions } from '@/firebase/init';
import { createUserWithEmailAndPassword, PhoneAuthProvider, signInWithPhoneNumber, signInWithCredential } from 'firebase/auth';
import { ref as dbRef, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { showToast } from '@/utils/toast';
import { sendEmail } from '@/utils/emailService';
import 'toastify-js/src/toastify.css'
import venezuela from 'venezuela';
import { RecaptchaVerifier } from 'firebase/auth';

const appOption = useAppOptionStore();

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
			loading: false,
			showPassword: false,
			showReferralField: false,
			formErrors: {
				emailUsed: false,
				rifUsed: false,
				identificationUsed: false,
				passwordMismatch: false,
				passwordTooShort: false,
				maxAttempts: false
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
			phoneVerified: false,
			verificationId: '',
			verificationCode: '',
			showVerificationInput: false,
			phoneVerificationLoading: false,
			recaptchaVerifier: null,
			recaptchaWidgetId: null,
			isDevelopmentMode: process.env.NODE_ENV === 'development',
			termsAccepted: false,
		};
	},
	mounted() {
		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		// Initialize reCAPTCHA when component is mounted
		this.$nextTick(() => {
			this.initRecaptcha();
		});
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
		if (this.recaptchaVerifier) {
			this.recaptchaVerifier.clear();
		}
	},
	computed: {
		formattedReferralCode() {
			return this.referralCode ? `REF-${this.referralCode.toUpperCase()}` : '';
		},
		isFormValid() {
			// Common required fields for all roles
			const commonFieldsValid =
				this.email.trim() !== '' &&
				this.password.trim() !== '' &&
				this.confirmPassword.trim() !== '' &&
				this.password.length >= 6 &&
				this.password === this.confirmPassword &&
				this.phoneNumber.trim() !== '' &&
				this.termsAccepted &&
				(this.phoneVerified || process.env.NODE_ENV === 'development');

			// Role-specific validation
			if (this.role === 'afiliado') {
				return commonFieldsValid &&
					this.businessName.trim() !== '' &&
					this.rif.trim() !== '';
			} else {
				return commonFieldsValid &&
					this.firstName.trim() !== '' &&
					this.lastName.trim() !== '' &&
					// Check identification as a string or number
					(typeof this.identification === 'string' ?
						this.identification.trim() !== '' :
						this.identification !== '' && this.identification !== null && this.identification !== undefined);
			}
		},
		formattedPhoneNumber() {
			if (!this.phoneNumber) return '';

			// Handle different country codes
			if (this.phoneNumber.startsWith('0')) {
				// Venezuelan format (starts with 0)
				return `+58${this.phoneNumber.substring(1)}`;
			} else if (this.phoneNumber.startsWith('55')) {
				// Brazilian format (starts with country code)
				return `+${this.phoneNumber}`;
			} else if (this.phoneNumber.startsWith('+')) {
				// Already has + prefix
				return this.phoneNumber;
			} else {
				// Default to Venezuelan format if no country code
				return `+58${this.phoneNumber}`;
			}
		}
	},
	methods: {
		changeRole(newRole) {
			// Only reset if the role is actually changing
			if (this.role !== newRole) {
				// Reset all form fields
				this.resetForm();
				// Set the new role
				this.role = newRole;
			}
		},

		resetForm() {
			// Reset common fields
			this.email = '';
			this.password = '';
			this.confirmPassword = '';
			this.phoneNumber = '';

			// Reset role-specific fields
			this.firstName = '';
			this.lastName = '';
			this.identification = '';
			this.businessName = '';
			this.rif = '';

			// Reset referral code fields
			this.referralCode = '';
			this.showReferralField = false;

			// Reset form errors
			Object.keys(this.formErrors).forEach(key => {
				this.formErrors[key] = false;
			});
		},

		initRecaptcha() {
			if (this.recaptchaVerifier) {
				this.recaptchaVerifier.clear();
				this.recaptchaVerifier = null;
			}

			try {
				this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
					'size': 'invisible',
					'callback': () => {
						console.log('reCAPTCHA verified');
					},
					'expired-callback': () => {
						this.recaptchaVerifier = null;
						showToast('El captcha ha expirado. Por favor, inténtelo de nuevo.', 'error');
					},
					'error-callback': (error) => {
						console.error('reCAPTCHA error:', error);
						showToast('Error en la verificación de reCAPTCHA. Por favor, recargue la página.', 'error');
						this.recaptchaVerifier = null;
					}
				});

				// Render the reCAPTCHA widget
				this.recaptchaVerifier.render().then((widgetId) => {
					this.recaptchaWidgetId = widgetId;
				}).catch(error => {
					console.error('Error rendering reCAPTCHA:', error);
					showToast('Error al cargar el captcha. Por favor, recargue la página.', 'error');
				});
			} catch (error) {
				console.error('Error initializing reCAPTCHA:', error);
				showToast('Error al inicializar reCAPTCHA. Por favor, recargue la página.', 'error');
			}
		},

		async sendVerificationCode() {
			if (!this.phoneNumber) {
				showToast('Por favor, ingrese un número de teléfono válido', 'error');
				return;
			}

			// In-memory rate limiting
			const now = Date.now();
			const rateLimitKey = `phoneVerification_${this.formattedPhoneNumber}`;
			const storedAttempts = localStorage.getItem(rateLimitKey);
			
			try {
				if (storedAttempts) {
					const { attempts, firstAttempt, lastAttempt } = JSON.parse(storedAttempts);

					// Reset if it's been more than 24 hours
					if (now - firstAttempt > 24 * 60 * 60 * 1000) {
						localStorage.setItem(rateLimitKey, JSON.stringify({
							attempts: 1,
							firstAttempt: now,
							lastAttempt: now
						}));
					} else {
						// Check max attempts (3 per 24h)
						if (attempts >= 3) {
							this.formErrors.maxAttempts = true;
							// showToast('Ha excedido el límite de intentos. Por favor, intente de nuevo mañana.', 'error');
							return;
						}

						// Check cooldown period (2 min between attempts)
						const timeSinceLastAttempt = now - lastAttempt;
						if (timeSinceLastAttempt < 2 * 60 * 1000) {
							const waitTime = Math.ceil((2 * 60 * 1000 - timeSinceLastAttempt) / 1000);
							showToast(`Por favor espere ${waitTime} segundos antes de solicitar otro código.`, 'error');
							return;
						}

						// Update attempts
						localStorage.setItem(rateLimitKey, JSON.stringify({
							attempts: attempts + 1,
							firstAttempt,
							lastAttempt: now
						}));
					}
				} else {
					// First attempt
					localStorage.setItem(rateLimitKey, JSON.stringify({
						attempts: 1,
						firstAttempt: now,
						lastAttempt: now
					}));
				}

				this.phoneVerificationLoading = true;

				// Initialize reCAPTCHA if not already done
				if (!this.recaptchaVerifier) {
					this.initRecaptcha();
				}

				// Send verification code
				const confirmationResult = await signInWithPhoneNumber(
					auth,
					this.formattedPhoneNumber,
					this.recaptchaVerifier
				);

				// Store verification ID
				this.verificationId = confirmationResult.verificationId;
				this.showVerificationInput = true;

				showToast('Código de verificación enviado. Por favor revise sus mensajes.', 'success');
			} catch (error) {
				console.error('Error sending verification code:', error);

				// Handle specific error codes
				if (error.code === 'auth/operation-not-allowed') {
					showToast('La verificación por SMS no está habilitada en este momento. Por favor, contacte al administrador.', 'error');
				} else if (error.code === 'auth/invalid-phone-number') {
					showToast('El número de teléfono no es válido. Asegúrese de usar el formato correcto.', 'error');
				} else if (error.code === 'auth/error-code:-39') {
					showToast('Se ha excedido el límite de verificaciones. Por favor, intente más tarde.', 'error');
				} else if (error.code === 'auth/captcha-check-failed') {
					showToast('Verificación de reCAPTCHA fallida. Por favor, intente de nuevo.', 'error');
				} else {
					showToast(`Error al enviar el código: ${error.message}`, 'error');
				}

				// Reset reCAPTCHA on error
				if (this.recaptchaVerifier) {
					this.recaptchaVerifier.clear();
					this.recaptchaVerifier = null;
				}
			} finally {
				this.phoneVerificationLoading = false;
			}
		},

		async verifyCode() {
			if (!this.verificationCode) {
				showToast('Por favor, ingrese el código de verificación', 'error');
				return;
			}

			try {
				this.phoneVerificationLoading = true;

				// Create credential with verification ID and code
				const credential = PhoneAuthProvider.credential(
					this.verificationId,
					this.verificationCode
				);

				// Mark phone as verified
				this.phoneVerified = true;
				this.showVerificationInput = false;

				showToast('Número de teléfono verificado correctamente', 'success');
			} catch (error) {
				console.error('Error verifying code:', error);
				showToast('Código de verificación inválido. Por favor, inténtelo de nuevo.', 'error');
			} finally {
				this.phoneVerificationLoading = false;
			}
		},

		async submitForm() {
			// Trim fields to avoid unnecessary spaces
			this.email = this.email.trim();
			this.password = this.password.trim();
			this.confirmPassword = this.confirmPassword.trim();

			// Reset form errors
			Object.keys(this.formErrors).forEach(key => {
				this.formErrors[key] = false;
			});

			// Password length validation
			if (this.password.length < 6) {
				this.formErrors.passwordTooShort = true;
				return;
			}

			// Password mismatch Validation
			if (this.password !== this.confirmPassword) {
				this.formErrors.passwordMismatch = true;
				return;
			}

			// Check if phone is verified
			if (!this.phoneVerified && this.phoneNumber) {
				showToast('Por favor, verifique su número de teléfono', 'error');
				return;
			}

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
							showToast("El usuario que intenta registrar ya existe.");
							this.loading = false; // Hide loader
							return;
						}
					}
				}

				// Referral code validation: Fetch users with role 'mesero' or 'promotora'
				let referredByEmployee = null;
				if (this.showReferralField && this.formattedReferralCode) {
					const employees = ['mesero', 'promotora'];

					// Query for 'mesero' role users
					const meseroQuery = query(dbRef(db, `Users`), orderByChild('role'), equalTo('mesero'));
					const meseroSnapshot = await get(meseroQuery);

					// Query for 'promotora' role users
					const promotoraQuery = query(usersRef, orderByChild('role'), equalTo('promotora'));
					const promotoraSnapshot = await get(promotoraQuery);

					// Combine results from both queries
					const employeeResults = {
						...(meseroSnapshot.exists() ? meseroSnapshot.val() : {}),
						...(promotoraSnapshot.exists() ? promotoraSnapshot.val() : {})
					};

					// Check if referral code matches any employee
					for (const empUid in employeeResults) {
						if (employeeResults[empUid].codigoReferido === this.formattedReferralCode) {
							referredByEmployee = empUid;
							break;
						}
					}

					if (!referredByEmployee) {
						// Invalid referral code
						showToast("Código de referido inválido.");
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
							rif: this.rif
						}
						: {
							firstName: this.firstName,
							lastName: this.lastName,
							identification: this.identification
						}),
					phoneNumber: this.phoneNumber,
					phoneVerified: true,
					role: this.role,
				});

				// If the user was referred, update the referred employee's 'referidos' list
				if (referredByEmployee) {
					const referidosRef = dbRef(db, `Users/${referredByEmployee}/referidos/${user.uid}`);
					await set(referidosRef, {
						referredAt: new Date().toISOString(),
					});
				}

				// Send an email notification to the admin
				const emailPayload = {
					to: 'roseindustry11@gmail.com',
					message: {
						subject: `Nuevo ${this.role.charAt(0).toUpperCase() + this.role.slice(1)} registrado`,
						text: `Hola administrador, el ${this.role.charAt(0).toUpperCase() + this.role.slice(1)} ${this.firstName} ${this.lastName} se ha registrado en Roseapp.`,
					},
				};

				const result = await sendEmail(emailPayload);

				// Toastify success message
				showToast('¡Bienvenido a bordo!');

				// After successful signup and data storage, redirect based on role
				if (this.role === 'cliente') {
					this.$router.push('/client-portal');
				} else if (this.role === 'admin') {
					this.$router.push('/');
				} else if (this.role === 'afiliado') {
					this.$router.push('/affiliate-portal');
				}

			} catch (error) {
				console.error('Error signing up', error);
				showToast("Error al registrarse. Inténtalo de nuevo.");
			} finally {
				this.loading = false;
			}
		},
		bypassPhoneVerification() {
			if (process.env.NODE_ENV === 'development') {
				this.phoneVerified = true;
				showToast('Verificación omitida (modo desarrollo)', 'info');
			}
		},
	},
	watch: {
		// Alternative approach using a watcher if you prefer
		role(newRole, oldRole) {
			if (newRole !== oldRole) {
				this.resetForm();
			}
		}
	}
});
</script>
<template>
	<!-- BEGIN register -->
	<div class="register">
		<!-- BEGIN register-content -->
		<div class="register-content">
			<form @submit.prevent="submitForm" class="register-form">
				<div class="text-center mb-4">
					<h1 class="fw-bold">Registro</h1>
					<p class="text-muted">Crea tu cuenta en Rose App</p>
				</div>

				<!-- Role Selection -->
				<div class="mb-4">
					<div class="role-selector d-flex">
						<div class="role-option flex-fill text-center p-3" :class="{ 'active': role === 'cliente' }"
							@click="changeRole('cliente')">
							<i class="fas fa-user mb-2"></i>
							<div>Cliente</div>
						</div>
						<div class="role-option flex-fill text-center p-3" :class="{ 'active': role === 'afiliado' }"
							@click="changeRole('afiliado')">
							<i class="fas fa-store mb-2"></i>
							<div>Afiliado</div>
						</div>
					</div>
				</div>

				<!-- Referral Code Toggle -->
				<div v-if="role === 'cliente'" class="form-check mb-3">
					<input class="form-check-input" type="checkbox" id="showReferralCode" v-model="showReferralField">
					<label class="form-check-label" for="showReferralCode">
						Tengo un código de referido
					</label>
				</div>

				<!-- Referral Code Field (conditionally shown) -->
				<div v-if="role === 'cliente' && showReferralField" class="mb-3">
					<label class="form-label">Código de referido</label>
					<div class="input-group">
						<span class="input-group-text bg-dark">REF-</span>
						<input v-model="referralCode" class="form-control form-control-lg"
							placeholder="Ingrese su código" @input="referralCode = referralCode.toUpperCase()" />
					</div>
					<small class="form-text text-muted">Si fue referido por un mesero o promotora, ingrese su código
						aquí.</small>
				</div>

				<!-- Conditional fields based on the selected role -->
				<div v-if="role === 'afiliado'" class="card border-0 shadow-sm mb-4">
					<div class="card-header bg-dark">
						<h5 class="mb-0">Información del Comercio</h5>
					</div>
					<div class="card-body">
						<div class="mb-3">
							<label class="form-label">Nombre del Comercio <span class="text-danger">*</span></label>
							<input v-model="businessName" type="text" class="form-control form-control-lg"
								placeholder="Ej: Mi Comercio" required />
						</div>
						<div class="mb-3">
							<label class="form-label">RIF <span class="text-danger">*</span></label>
							<input v-model="rif" type="text" class="form-control form-control-lg"
								placeholder="Ej: J-12345678-9" required />
							<small v-if="formErrors.rifUsed" class="text-danger">El RIF ya está en uso.</small>
						</div>
					</div>
				</div>

				<!-- Client Information -->
				<div v-else class="card border-0 shadow-sm mb-4">
					<div class="card-header bg-dark">
						<h5 class="mb-0">Información Personal</h5>
					</div>
					<div class="card-body">
						<div class="row">
							<div class="col-md-6 mb-3">
								<label class="form-label">Nombre <span class="text-danger">*</span></label>
								<input v-model="firstName" type="text" class="form-control form-control-lg"
									placeholder="Ej: Juan" required />
							</div>
							<div class="col-md-6 mb-3">
								<label class="form-label">Apellido <span class="text-danger">*</span></label>
								<input v-model="lastName" type="text" class="form-control form-control-lg"
									placeholder="Ej: Pérez" required />
							</div>
						</div>
						<div class="mb-3">
							<label class="form-label">Cédula / Identificación <span class="text-danger">*</span></label>
							<div class="input-group">
								<span class="input-group-text bg-dark">V</span>
								<input v-model="identification" type="text" class="form-control form-control-lg"
									placeholder="Ej: 20555444" required />
							</div>
							<small v-if="formErrors.identificationUsed" class="text-danger">La identificación ya está en
								uso.</small>
						</div>
					</div>
				</div>

				<!-- Contact Information -->
				<div class="card border-0 shadow-sm mb-4">
					<div class="card-header bg-dark">
						<h5 class="mb-0">Información de Contacto</h5>
					</div>
					<div class="card-body">
						<div class="mb-3">
							<label class="form-label">Correo electrónico <span class="text-danger">*</span></label>
							<div class="input-group">
								<span class="input-group-text bg-dark"><i class="fas fa-envelope"></i></span>
								<input v-model="email" type="email" class="form-control form-control-lg"
									placeholder="Ej: usuario@correo.com" required />
							</div>
							<small v-if="formErrors.emailUsed" class="text-danger">El correo electrónico ya está en
								uso.</small>
						</div>
						<div class="mb-3">
							<label class="form-label">Teléfono <span class="text-danger">*</span></label>
							<div class="input-group">
								<span class="input-group-text bg-dark"><i class="fas fa-phone"></i></span>
								<input type="tel" v-model="phoneNumber" class="form-control form-control-lg"
									placeholder="Ej: 04145555555" :disabled="phoneVerified || showVerificationInput"
									required />
								<button type="button" class="btn btn-outline-primary" @click="sendVerificationCode"
									:disabled="!phoneNumber || phoneVerified || phoneVerificationLoading || showVerificationInput">
									<i class="fas fa-sms me-1"></i>
									{{ phoneVerified ? 'Verificado' : 'Verificar' }}
								</button>
							</div>
							<!-- Phone Formats -->
							<div class="mt-2">
								<small class="form-text text-muted d-block">
									<i class="fas fa-info-circle me-1"></i> Formatos de teléfono aceptados:
								</small>
								<small class="form-text text-muted d-block">
									• Venezuela: <span class="text-success">04145555555</span> (se añadirá +58)
								</small>
								<!-- <small class="form-text text-muted d-block">
									• Brasil: <span class="text-success">5511987654321</span> (incluya el código de país 55)
								</small> -->
								<small v-if="formErrors.maxAttempts" class="text-danger">
									Superó su límite de intentos de verificación. Por favor, inténtelo de nuevo mañana o utilice otro Numero de Teléfono.
								</small>
							</div>

							<!-- Phone number preview -->
							<div v-if="phoneNumber && !phoneVerified" class="mt-2 alert alert-info py-2">
								<small>
									<i class="fas fa-check me-1"></i> El código se enviará a: <strong>{{
										formattedPhoneNumber }}</strong>
								</small>
							</div>

							<!-- reCAPTCHA container -->
							<div id="recaptcha-container"></div>

							<!-- Verification code input (shown after sending code) -->
							<div v-if="showVerificationInput" class="mt-3">
								<label class="form-label">Código de verificación</label>
								<div class="input-group">
									<input type="text" v-model="verificationCode" class="form-control form-control-lg"
										placeholder="Ingrese el código recibido por SMS" />
									<button type="button" class="btn btn-outline-success" @click="verifyCode"
										:disabled="!verificationCode || phoneVerificationLoading">
										<i class="fas fa-check me-1"></i>
										Confirmar
									</button>
								</div>
								<small class="form-text text-muted">
									Ingrese el código de 6 dígitos enviado a su teléfono
								</small>
							</div>

							<!-- Verification status -->
							<div v-if="phoneVerified" class="mt-2 text-success">
								<i class="fas fa-check-circle me-1"></i>
								Número verificado correctamente: <strong>{{ formattedPhoneNumber }}</strong>
							</div>
						</div>
					</div>
				</div>

				<!-- Security -->
				<div class="card border-0 shadow-sm mb-4">
					<div class="card-header bg-dark">
						<h5 class="mb-0">Seguridad</h5>
					</div>
					<div class="card-body">
						<div class="mb-3">
							<label class="form-label">Contraseña <span class="text-danger">*</span></label>
							<div class="input-group">
								<span class="input-group-text bg-dark"><i class="fas fa-lock"></i></span>
								<input v-model="password" :type="showPassword ? 'text' : 'password'"
									class="form-control form-control-lg" required />
								<button type="button" class="btn btn-outline-secondary"
									@click="showPassword = !showPassword">
									<i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
								</button>
							</div>
							<small v-if="formErrors.passwordTooShort" class="text-danger">
								La contraseña debe tener al menos 6 caracteres.
							</small>
						</div>

						<div class="mb-3">
							<label class="form-label">Confirmar Contraseña <span class="text-danger">*</span></label>
							<div class="input-group">
								<span class="input-group-text bg-dark"><i class="fas fa-lock"></i></span>
								<input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'"
									class="form-control form-control-lg" required />
							</div>
							<small v-if="formErrors.passwordMismatch" class="text-danger">Las contraseñas no
								coinciden.</small>
							<small v-else-if="password && confirmPassword && password !== confirmPassword"
								class="text-danger">
								Las contraseñas no coinciden.
							</small>
						</div>
					</div>
				</div>
				<!-- Terms and Conditions Checkbox-->
				<div class="form-check mb-3">
					<input type="checkbox" class="form-check-input" id="termsAcceptance" v-model="termsAccepted">
					<label class="form-check-label" for="termsAcceptance">
						He leído y acepto los
						<a href="#" data-bs-toggle="modal" data-bs-target="#termsModal" class="text-theme">
							Términos y Condiciones
						</a>
					</label>
				</div>

				<p class="text-muted mb-4">(<span class="text-danger">*</span>) Campos obligatorios.</p>

				<button type="submit" :disabled="loading || !isFormValid || !termsAccepted"
					class="btn btn-theme btn-lg d-block w-100 mb-3">
					<span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"
						aria-hidden="true"></span>
					<span v-else><i class="fas fa-user-plus me-2"></i></span>
					{{ loading ? "Procesando..." : "Crear Cuenta" }}
				</button>

				<div class="text-center mt-4">
					¿Ya estás registrado? <router-link style="color: purple;" to="/page/login">Iniciar
						sesión</router-link>
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
						<h5>Términos y Condiciones de Rose Coupon</h5>
						<p>Última actualización: Junio 2024</p>

						<h6>1. Introducción</h6>
						<p>Rose Coupon es una plataforma que conecta comercios con clientes, ofreciendo descuentos y
							beneficios exclusivos.</p>

						<h6>2. Uso de la Plataforma</h6>
						<ul>
							<li>Los usuarios deben proporcionar información precisa y actualizada.</li>
							<li>Queda prohibido el uso fraudulento o malicioso de la plataforma.</li>
							<li>Rose Coupon se reserva el derecho de suspender cuentas que violen estos términos.</li>
						</ul>

						<h6>3. Privacidad</h6>
						<p>Respetamos tu privacidad. Los datos personales se manejarán conforme a nuestra Política de
							Privacidad.</p>

						<h6>4. Cupones y Promociones</h6>
						<ul>
							<li>Los cupones tienen términos y condiciones específicos.</li>
							<li>Rose Coupon no garantiza la disponibilidad permanente de promociones.</li>
							<li>Los comercios son responsables de los términos de sus cupones.</li>
						</ul>

						<h6>5. Responsabilidad</h6>
						<p>Rose Coupon actúa como intermediario. No nos hacemos responsables de la calidad de productos
							o servicios ofrecidos por los comercios afiliados.</p>

						<h6>6. Modificaciones</h6>
						<p>Nos reservamos el derecho de modificar estos términos. Las modificaciones serán notificadas a
							través de la plataforma.</p>

						<div class="alert alert-info mt-3">
							<strong>Al aceptar, confirmas que:</strong>
							<ul class="mb-0">
								<li>Has leído y comprendido estos términos</li>
								<li>Aceptas cumplir con las condiciones establecidas</li>
								<li>Eres mayor de edad</li>
							</ul>
						</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Development bypass button -->
		<!-- <div v-if="isDevelopmentMode && !phoneVerified" class="mt-2 alert alert-warning">
			<small>
				<i class="fas fa-code me-1"></i> Modo desarrollo: 
				<button 
					type="button" 
					class="btn btn-sm btn-warning ms-2" 
					@click="bypassPhoneVerification"
				>
					Omitir verificación (solo desarrollo)
				</button>
			</small>
		</div> -->

	</div>
</template>
<style>
/* Base theme colors */
.btn-theme {
	background-color: purple;
	border-color: purple;
	transition: all 0.2s ease;
}

.btn-theme:hover:not(:disabled) {
	background-color: #8a2be2;
	border-color: #8a2be2;
}

/* Compact form styling */
.register {
	padding: 1rem 0;
}

.register-content {
	max-width: 650px;
	margin: 0 auto;
}

.register-form {
	font-size: 0.9rem;
}

/* Card styling */
.card {
	margin-bottom: 1rem !important;
	box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;
}

.card-header {
	padding: 0.5rem 1rem !important;
}

.card-header h5 {
	font-size: 1rem !important;
	margin-bottom: 0 !important;
}

.card-body {
	padding: 1rem !important;
}

/* Form controls */
.form-label {
	font-size: 0.85rem;
	margin-bottom: 0.25rem;
}

.form-control-lg {
	font-size: 0.9rem !important;
	padding: 0.375rem 0.75rem !important;
	height: auto !important;
	min-height: 38px !important;
}

.input-group-text {
	padding: 0.375rem 0.75rem !important;
	font-size: 0.9rem !important;
}

.form-text,
small {
	font-size: 0.75rem !important;
}

/* Spacing adjustments */
.mb-3 {
	margin-bottom: 0.75rem !important;
}

.mb-4 {
	margin-bottom: 1rem !important;
}

/* Role selector */
.role-selector {
	margin-bottom: 1rem !important;
}

.role-option {
	padding: 0.5rem !important;
	font-size: 0.9rem;
}

.role-option i {
	font-size: 1.2rem;
	margin-bottom: 0.25rem;
}

/* Alert boxes */
.alert {
	padding: 0.5rem 0.75rem !important;
	font-size: 0.8rem !important;
}

/* Button adjustments */
.btn {
	font-size: 0.9rem !important;
	padding: 0.375rem 0.75rem !important;
}

.btn-lg {
	padding: 0.5rem 1rem !important;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.register-form {
		font-size: 0.85rem;
	}

	.card-body {
		padding: 0.75rem !important;
	}

	.form-control-lg,
	.input-group-text,
	.btn {
		font-size: 0.85rem !important;
	}
}

/* Page title */
h1.fw-bold {
	font-size: 1.75rem !important;
}

p.text-muted {
	font-size: 0.9rem !important;
}
</style>