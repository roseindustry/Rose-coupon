<script>
import { slideToggle } from '@/composables/slideToggle.js';
import { useAppOptionStore } from '@/stores/app-option';
import { useUserStore } from '@/stores/user-role';
// import { useTenancyStore } from '@/stores/tenancy';
import { useRouter, RouterLink } from 'vue-router';
import { auth, db } from '@/firebase/init';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { ref as dbRef, get, child } from 'firebase/database';

export default {
	name: 'HeaderComponent',
	components: {
		RouterLink,
	},
	data() {
		return {
			userName: '',
			isUserLoggedIn: false,
			notificationData: [],
		};
	},
	methods: {
		fetchUserData(userId) {
			const userRef = dbRef(db);
			get(child(userRef, `Users/${userId}`))
				.then((snapshot) => {
					if (snapshot.exists()) {
						const userData = snapshot.val();
						if (userData.role === 'afiliado') {
							this.userName = userData.companyName;
						} else {
							this.userName = `${userData.firstName} ${userData.lastName}`;
						}
					} else {
						console.log('No data available');
					}
				})
				.catch((error) => {
					console.error(error);
				});
		},

		async signOutUser() {
			try {
				await signOut(auth);
				this.$router.push('/page/login'); // Redirect to login after sign out
			} catch (error) {
				console.error('Error signing out:', error.message);
			}
		},
		toggleAppSidebarMinify() {
			if (!(this.appOption.appTopNav && this.appOption.appSidebarHide)) {
				this.appOption.appSidebarMinified = !this.appOption.appSidebarMinified;
			}
		},
		toggleAppSidebarMobileToggled() {
			if (this.appOption.appTopNav && this.appOption.appSidebarHide) {
				slideToggle(document.querySelector('.app-top-nav'));
				window.scrollTo(0, 0);
			} else {
				this.appOption.appSidebarMobileToggled = !this.appOption.appSidebarMobileToggled;
			}
		},
	},
	mounted() {
		onAuthStateChanged(auth, (user) => {
			if (user) {
				// User is signed in, now fetch user's data from the database
				this.isUserLoggedIn = true;
				const userId = user.uid;
				this.fetchUserData(userId);
			} else {
				// No user is signed in.
				this.isUserLoggedIn = false;
				console.log('No user logged in');
			}
		});
		this.userStore.fetchUser();
	},
	setup() {
		return {
			appOption: useAppOptionStore(),
			userStore: useUserStore(),
			// tenancyStore: useTenancyStore(),
			router: useRouter(),
		};
	},
};
</script>

<template>
	<div v-if="isUserLoggedIn">
		<div id="header" class="app-header">
			<!-- BEGIN mobile-toggler -->
			<div class="mobile-toggler">
				<button type="button" class="menu-toggler" @click="toggleAppSidebarMobileToggled">
					<span class="bar"></span>
					<span class="bar"></span>
				</button>
			</div>
			<!-- END mobile-toggler -->

			<!-- BEGIN brand -->
			<div class="col brand">
				<div class="desktop-toggler">
					<button type="button" class="menu-toggler" @click="toggleAppSidebarMinify">
						<span class="bar"></span>
						<span class="bar"></span>
					</button>
				</div>

				<div class="logo-container">
					<img src="/assets/img/rose-logo.png" alt="Logo" id="logo" class="site-logo" />
					<!-- <div class="menu-text" style="margin: 5px; color: darkgrey;">{{ tenant.name }}</div> -->
				</div>
			</div>
			<!-- END brand -->

			<div class="col menu">
				<!-- BEGIN notifications menu -->
				<div class="menu-item dropdown d-flex justify-content-end align-items-center"
					v-if="userStore.role !== 'cliente'">
					<a href="#" data-bs-toggle="dropdown" data-display="static"
						class="menu-link d-flex align-items-center">
						<div class="menu-icon"><i class="fa fa-bell nav-icon"></i></div>
						<div class="menu-label">{{ notificationData.length }}</div>
					</a>
					<div class="dropdown-menu dropdown-menu-lg-end dropdown-notification">
						<h6 class="dropdown-header text-body-emphasis mb-1">Notifications</h6>
						<template v-if="notificationData && notificationData.length > 0">
							<a href="#" class="dropdown-notification-item"
								v-for="(notification, index) in notificationData" :key="index">
								<div class="dropdown-notification-icon">
									<i v-if="notification.icon" :class="notification.icon"></i>
									<img v-if="notification.img" :src="notification.img" width="26" />
								</div>
								<div class="dropdown-notification-info">
									<div class="title">{{ notification.title }}</div>
									<div class="time">{{ notification.time }}</div>
								</div>
								<div class="dropdown-notification-arrow">
									<i class="fa fa-chevron-right"></i>
								</div>
							</a>
						</template>
						<template v-else>
							<div class="dropdown-notification-item">
								No hay datos.
							</div>
						</template>
						<div class="p-2 text-center mb-n1">
							<a href="#" class="text-body-emphasis text-opacity-50 text-decoration-none">Mostrar mas</a>
						</div>
					</div>
				</div>
				<!-- User Settings -->
				<div class="menu-item dropdown ms-3 d-flex justify-content-end align-items-center">
					<a href="#" data-bs-toggle="dropdown" data-display="static"
						class="menu-link d-flex align-items-center">
						<div class="menu-img online">
							<i class="fa-solid fa-user rounded-circle" style="margin: 5px;"></i>
						</div>
						<div class="menu-text">{{ userName }}</div>
					</a>
					<div class="dropdown-menu dropdown-menu-lg-end me-lg-3">
						<RouterLink to="/profile" class="dropdown-item d-flex align-items-center">
							Editar perfil <i class="fa fa-wrench fa-fw ms-auto text-gray-400 fs-16px"></i>
						</RouterLink>
						<div class="dropdown-divider"></div>
						<a href="#" class="dropdown-item d-flex align-items-center" @click="signOutUser">
							Cerrar sesion
							<i class="fa fa-toggle-off fa-fw ms-auto text-gray-400 fs-16px"></i>
						</a>
					</div>
				</div>
			</div>
			<!-- END menu -->
		</div>
	</div>
</template>

<style scoped>
.logo-container {
	flex: 1;
	max-width: 60px;
	min-width: 60px;
}

.site-logo {
	width: 100%;
	height: auto;
}
</style>
