<script>
import { useAppOptionStore } from '@/stores/app-option';
import { RouterLink } from 'vue-router';
import { auth, db } from '@/firebase/init';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { get, ref as dbRef } from 'firebase/database';
// import { useTenancyStore } from '@/stores/tenancy';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

const appOption = useAppOptionStore();

export default {
	data() {
		return {
			loginForm: {
				email: '',
				password: ''
			},
		};
	},
	mounted() {
		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		appOption.appContentClass = 'p-0';
		// this.getTenantId();
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
	},
	methods: {
		// async getTenantId() {
		// 	const tenancyStore = useTenancyStore();
		// 	await tenancyStore.findOrCreateTenant();
		// 	return tenancyStore.tenant.key;
		// },
		async submitForm() {
			const { email, password } = this.loginForm;
			try {
				const userCredential = await signInWithEmailAndPassword(auth, email, password);
				const user = userCredential.user;

				const userRef = dbRef(db, `Users/${user.uid}`);
				const snapshot = await get(userRef);

				if (!snapshot.exists()) {
					console.log('No user data found in the database.');
					return;
				}

				const userData = snapshot.val();
				// const currentTenantId = await this.getTenantId();
				// if (userData.tenant_id !== currentTenantId) {
				// 	alert('Usuario no pertenece a este Tenant.');
				// 	return;
				// }

				// Success Toastify
				Toastify({
					text: userData.role === 'afiliado'
						? `Bienvenido ${userData.companyName} (${userData.role})!`
						: `Bienvenido ${userData.firstName} (${userData.role})!`,
					duration: 3000,
					close: true,
					gravity: "top", // `top` or `bottom`
					position: "right", // `left`, `center` or `right`
					stopOnFocus: true, // Prevents dismissing of toast on hover
					style: {
						background: "linear-gradient(to right, #00b09b, #96c93d)",
					},
				}).showToast();

				// Tenant exists, proceed with redirection based on role
				switch (userData.role) {
					case 'admin':
						this.$router.push('/');
						break;
					case 'cliente':
						this.$router.push('/client-portal');
						break;
					case 'afiliado':
						this.$router.push('/affiliate-portal');
						break;
					// case 'mesero':
					// 	this.$router.push('/pos/customer-order');
					// 	break;
					default:
						console.log('User role is not defined or user is not authorized for access.');
				}
			} catch (error) {
				console.error('Error signing in');
				console.error(error);

				const errorMessage = error.code === 'auth/invalid-credential'
					? "Correo o Contraseña incorrecta."
					: "Error al Iniciar Sesión. Inténtalo de nuevo.";

				// Error Toastify
				Toastify({
					text: errorMessage,
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
		async forgotPassword() {
			const email = this.loginForm.email;
			if (email) {
				try {
					await sendPasswordResetEmail(auth, email);
					Toastify({
						text: "Reset password link sent! Check your email.",
						duration: 5000,
						close: true,
						gravity: "top",
						position: "right",
						style: {
							background: "linear-gradient(to right, #56ccf2, #2f80ed)",
						},
					}).showToast();
				} catch (error) {
					console.error("Failed to send password reset email:", error);
					Toastify({
						text: "Failed to send password reset email. Please try again.",
						duration: 5000,
						close: true,
						gravity: "top",
						position: "right",
						style: {
							background: "linear-gradient(to right, #e74c3c, #c0392b)",
						},
					}).showToast();
				}
			} else {
				Toastify({
					text: "Please enter your email address.",
					duration: 3000,
					close: true,
					gravity: "top",
					position: "right",
					style: {
						background: "linear-gradient(to right, #f7b733, #fc4a1a)",
					},
				}).showToast();
			}
		},
	}
}
</script>
<template>
	<!-- BEGIN login -->
	<div class="login d-flex flex-row">
		<!-- BEGIN login-content -->
		<div class="login-content w-50 p-4">
			<form v-on:submit.prevent="submitForm()">
				<h1 class="text-center">Iniciar sesión</h1>
				<div class="text-muted text-center mb-4">
					Para tu protección, por favor identifícate.
				</div>

				<div class="mb-3">
					<label class="form-label">Correo electrónico</label>
					<input type="email" class="form-control form-control-lg fs-15px" v-model="loginForm.email"
						placeholder="username@address.com" />
				</div>

				<div class="mb-3">
					<div class="d-flex">
						<label class="form-label">Contraseña</label>
						<a href="#" class="ms-auto text-muted" data-bs-toggle="modal"
							data-bs-target="#passwordModal">¿Olvidó su contraseña?</a>
					</div>
					<input type="password" class="form-control form-control-lg fs-15px" v-model="loginForm.password"
						placeholder="Ingrese su contraseña" />
				</div>

				<button type="submit" class="btn btn-theme btn-lg d-block w-100 fw-500 mb-3">Iniciar sesión</button>

				<div class="text-center text-muted">
					¿No tienes una cuenta? <router-link to="/page/register">Regístrate</router-link>.
				</div>
			</form>
		</div>
		<!-- END login-content -->
	</div>
	<!-- END login -->

	<!-- Forgot password Modal -->
	<div class="modal fade" id="passwordModal" tabindex="-1" aria-labelledby="passwordModalLabel" aria-hidden="true">
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content">
				<div class="modal-header">
					<h1 class="modal-title fs-5" id="passwordModalLabel">Recuperar Contraseña</h1>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<input class="form-control" v-model="loginForm.email" type="email" placeholder="Enter your email" />
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
					<button type="button" class="btn btn-primary" @click="forgotPassword">Enviar</button>
				</div>
			</div>
		</div>
	</div>
</template>
<style>
.btn-theme{
	background-color: purple;
	border-color: purple;
}
</style>