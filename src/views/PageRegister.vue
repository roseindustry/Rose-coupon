<script>
import { defineComponent } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import { RouterLink } from 'vue-router';
import { auth, db } from '@/firebase/init';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref as dbRef, set, get } from 'firebase/database';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

export default defineComponent({
	name: 'PageRegister',
	data() {
		return {
			firstName: '',
			lastName: '',
			identification: '',
			email: '',
			phoneNumber: '',
			password: '',
			confirmPassword: '',
			role: 'cliente',
			passwordMismatch: false,
			subdomain: '',
			address: '',
			sector: '',
			sectores:
				[
					"Santa Lucía",
					"Veritas",
					"Cecilio Acosta",
					"La Lago",
					"El Milagro",
					"La Paragua",
					"El Tránsito",
					"Amparo",
					"Grano de Oro",
					"Cañada Honda"
				],
		};
	},
	async mounted() {
		const appOption = useAppOptionStore();
		const tenancyStore = useTenancyStore();

		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		appOption.appContentClass = 'p-0';
		this.subdomain = getSubdomain();

		// Automatically find or create tenant upon component mount
		await tenancyStore.findOrCreateTenant(this.subdomain);
	},
	beforeUnmount() {
		const appOption = useAppOptionStore();
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
	},
	methods: {
		async submitForm() {
			if (this.password !== this.confirmPassword) {
				this.passwordMismatch = true;
				return;
			}
			this.passwordMismatch = false;

			const tenancyStore = useTenancyStore();
			const tenantId = tenancyStore.tenant.key;

			try {
				// Query Users to check if email is already used by another user in the same tenant
				const usersRef = dbRef(db, `Users`);
				const snapshot = await get(usersRef);
				if (snapshot.exists()) {
					const users = snapshot.val();
					for (const uid in users) {
						if (users[uid].email === this.email && users[uid].tenant_id === tenantId) {
							// Show a Toastify notification if the email is already in use
							Toastify({
								text: "El correo electrónico ya está en uso.",
								duration: 3000,
								close: true,
								gravity: "top", // `top` or `bottom`
								position: "right", // `left`, `center` or `right`
								stopOnFocus: true, // Prevents dismissing of toast on hover
								style: {
									background: "linear-gradient(to right, #ff5f6d, #ffc371)",
								},
							}).showToast();
							return;
						}
					}
				}

				const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
				const user = userCredential.user;

				// Save user info under the Users table with tenant_id
				const userRef = dbRef(db, `Users/${user.uid}`);
				await set(userRef, {
					email: user.email,
					firstName: this.firstName,
					lastName: this.lastName,
					identification: this.identification,
					phoneNumber: this.phoneNumber,
					sector: this.sector,
					address: this.address,
					role: this.role,
					tenant_id: tenantId // Linking user to tenant by tenant's Firebase-generated key
				});

				console.log('User created and linked to tenant:', user.uid, tenantId);

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
					this.$router.push('/page/client-portal');
				} else if (this.role === 'admin') {
					this.$router.push('/');
				} else if (this.role === 'mesero') {
					this.$router.push('/pos/customer-order');
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
		},
		resetForm() {
			this.firstName = '';
			this.lastName = '';
			this.identification = '';
			this.email = '';
			this.phoneNumber = '';
			this.sector = '';
			this.address = '';
			this.password = '';
			this.confirmPassword = '';
			this.role = 'cliente';
			this.passwordMismatch = false;
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
				<h1 class="text-center">Registro</h1>
				<p class="text-muted text-center">Necesitas ser Admin para acceder a todos los servicios.</p>
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
				</div>
				<div class="mb-3">
					<label class="form-label">Correo electronico <span class="text-danger">*</span></label>
					<input v-model="email" type="text" class="form-control form-control-lg fs-15px"
						placeholder="e.g username@address.com" value="" required />
				</div>
				<div class="mb-3">
					<label class="form-label">Telefono <span class="text-secondary">(Opcional)</span></label>
					<input type="tel" v-model="phoneNumber" class="form-control form-control-lg fs-15px"
						placeholder="e.g 04145555555" value="" pattern="[0-9]{4}[0-9]{7}" />
				</div>
				<div class="mb-3">
					<label class="form-label">Sector <span class="text-danger">*</span></label>
					<select v-model="sector" class="form-control form-control-lg fs-15px">
						<option value="" disabled selected>Selecciona un sector</option>
						<option v-for="(sector, index) in sectores" :key="index" :value="sector">
							{{ sector }}
						</option>
					</select>
				</div>
				<div class="mb-3">
					<label class="form-label">Dirección <span class="text-secondary">(Opcional)</span></label>
					<input v-model="address" type="text" class="form-control form-control-lg fs-15px" value="" />
				</div>
				<div class="mb-3">
					<label class="form-label">Contraseña <span class="text-danger">*</span></label>
					<input v-model="password" type="password" class="form-control form-control-lg fs-15px" value=""
						required />
				</div>
				<div class="mb-3">
					<label class="form-label">Confirmar Contraseña <span class="text-danger">*</span></label>
					<input v-model="confirmPassword" type="password" class="form-control form-control-lg fs-15px"
						value="" required />
				</div>
				<div class="mb-3">
					<label class="form-label">Tipo de usuario <span class="text-danger">*</span></label>
					<select v-model="role" class="form-control form-control-lg fs-15px">
						<option value="admin">Admin</option>
						<option value="super_admin">Super Admin</option>
						<option value="cliente">Cliente</option>
						<option value="gerente">Gerente</option>
						<option value="mesero">Mesero</option>
						<option value="cajero">Cajero</option>
					</select>
				</div>
				<div class="mb-3">
					<button type="submit" class="btn btn-theme btn-lg fs-15px fw-500 d-block w-100">Registrar</button>
				</div>
				<div class="text-muted text-center">
					¿Ya estas registrado? <router-link to="/page/login">Iniciar sesion</router-link>
				</div>
			</form>
			<p class="text-center justify-content-center" v-if="passwordMismatch">Las Contraseñas no coinciden.</p>
		</div>
	</div>
</template>