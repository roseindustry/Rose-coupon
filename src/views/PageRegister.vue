<script>
import { defineComponent } from 'vue';
import { storeToRefs } from 'pinia'
import { useAppOptionStore } from '@/stores/app-option';
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import { useRouter, RouterLink } from 'vue-router';
import { auth, db } from '@/firebase/init';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref as dbRef, set, get, child, push } from 'firebase/database';
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
			subdomain: ''
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
		

			try {
				const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
				const user = userCredential.user;

				// Ensure tenant is available (it should be set by now if the component was mounted properly)
				if (!tenancyStore.tenant) {
					console.error('Tenant information is missing.');
					return;
				}

				// Now that the user is created, let's save their additional info
				const userRef = dbRef(db, `Users/${user.uid}`);
				await set(userRef, {
					email: user.email,
					firstName: this.firstName,
					lastName: this.lastName,
					identification: this.identification,
					phoneNumber: this.phoneNumber,
					role: this.role,
					tenant_id: tenancyStore.tenant.key // Linking user to tenant by tenant's Firebase-generated key
				});

				console.log('User created and linked to tenant:', user.uid, tenancyStore.tenant.key);
				
				//Toastify
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
				console.error(error)
			}
		},
		resetForm() {
			this.firstName = '';
			this.lastName = '';
			this.identification = '';
			this.email = '';
			this.phoneNumber = '';
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
						placeholder="username@address.com" value="" required />
				</div>
				<div class="mb-3">
					<label class="form-label">Telefono </label>
					<input type="tel" v-model="phoneNumber" class="form-control form-control-lg fs-15px"
						placeholder="0414-5555555" value="" pattern="[0-9]{4}-[0-9]{7}" />
						<small>Formato: 0424-xxxxxxx</small>
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