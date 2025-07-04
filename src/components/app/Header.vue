<script>
import { slideToggle } from '@/composables/slideToggle.js';
import { useAppOptionStore } from '@/stores/app-option';
import { useUserStore } from '@/stores/user-role';
import { useRouter, RouterLink } from 'vue-router';
import { auth, db } from '@/firebase/init';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { ref as dbRef, get, child } from 'firebase/database';
import { Dropdown } from 'bootstrap';

export default {
	name: 'HeaderComponent',
	data() {
		return {
			userName: '',
			isUserLoggedIn: false,
			notificationData: [],
			isLoading: true,
			showMobileMenu: false,
		};
	},
	methods: {
		fetchUserData(userId) {
			this.isLoading = true;
			const userRef = dbRef(db);
			get(child(userRef, `Users/${userId}`))
				.then((snapshot) => {
					if (snapshot.exists()) {
						const userData = snapshot.val();
						if (userData.role === 'afiliado') {
							this.userName = this.capitalizeWords(userData.companyName);
						} else {
							this.userName = `${this.capitalizeWords(userData.firstName)} ${this.capitalizeWords(userData.lastName)}`;
						}
					} else {
						console.log('No data available');
					}
				})
				.catch((error) => {
					console.error(error);
				})
				.finally(() => {
					this.isLoading = false;
				});
		},
		capitalizeWords(str) {
			if (!str) return '';
			return str.split(' ')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
				.join(' ');
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
			this.showMobileMenu = !this.showMobileMenu;
			if (this.appOption.appTopNav && this.appOption.appSidebarHide) {
				slideToggle(document.querySelector('.app-top-nav'));
				window.scrollTo(0, 0);
			} else {
				this.appOption.appSidebarMobileToggled = !this.appOption.appSidebarMobileToggled;
			}
		},
		handleOutsideClick(event) {
			// Close dropdowns when clicking outside on mobile
			if (window.innerWidth < 768) {
				const dropdowns = document.querySelectorAll('.dropdown-menu.show');
				if (dropdowns.length > 0) {
					dropdowns.forEach(dropdown => {
						if (!dropdown.contains(event.target) && 
							!event.target.classList.contains('menu-link')) {
							const bsDropdown = Dropdown.getInstance(
								dropdown.previousElementSibling
							);
							if (bsDropdown) {
								bsDropdown.hide();
							}
						}
					});
				}
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
				this.isLoading = false;
				console.log('No user logged in');
			}
		});
		this.userStore.fetchUser();
		
		// Add event listener for outside clicks
		document.addEventListener('click', this.handleOutsideClick);
		
		// Handle window resize
		window.addEventListener('resize', () => {
			if (window.innerWidth > 768 && this.showMobileMenu) {
				this.showMobileMenu = false;
				if (this.appOption.appSidebarMobileToggled) {
					this.appOption.appSidebarMobileToggled = false;
				}
			}
		});
	},
	setup() {
		return {
			appOption: useAppOptionStore(),
			userStore: useUserStore(),
			// tenancyStore: useTenancyStore(),
			router: useRouter(),
		};
	},
	beforeUnmount() {
		document.removeEventListener('click', this.handleOutsideClick);
		window.removeEventListener('resize', this.handleResize);
	}
};
</script>
<template>
	<div v-if="isUserLoggedIn">
		<div id="header" class="app-header">
			<!-- BEGIN left-section: mobile-toggler + logo -->
			<div class="header-left">
				<div class="mobile-toggler">
					<button type="button" class="menu-toggler" @click="toggleAppSidebarMobileToggled" 
							:class="{ 'active': showMobileMenu }" aria-label="Toggle menu">
						<span class="bar"></span>
						<span class="bar"></span>
					</button>
				</div>
				<div class="logo-container">
					<RouterLink to="/" class="logo-link">
						<img src="/assets/img/rose-logo.png" alt="Rose Logo" id="logo" class="site-logo" />
					</RouterLink>
				</div>
				<div class="desktop-toggler">
					<button type="button" class="menu-toggler" @click="toggleAppSidebarMinify" aria-label="Toggle sidebar">
						<span class="bar"></span>
						<span class="bar"></span>
					</button>
				</div>
			</div>
			<!-- END left-section -->

			<div class="col menu">
				<!-- BEGIN notifications menu -->
				<div class="menu-item dropdown d-flex justify-content-end align-items-center"
					v-if="userStore.role !== 'cliente'">
					<a href="#" data-bs-toggle="dropdown" data-display="static"
						class="menu-link d-flex align-items-center" aria-label="Notifications">
						<div class="menu-icon"><i class="fa fa-bell nav-icon"></i></div>
						<div class="menu-label" v-if="notificationData.length">{{ notificationData.length }}</div>
					</a>
					<div class="dropdown-menu dropdown-menu-lg-end dropdown-notification">
						<div class="dropdown-header-wrapper d-flex justify-content-between align-items-center">
							<h6 class="dropdown-header text-body-emphasis mb-0">Notificaciones</h6>
							<button type="button" class="btn-close btn-close-white btn-sm d-md-none" data-bs-dismiss="dropdown" aria-label="Close"></button>
						</div>
						<template v-if="notificationData && notificationData.length > 0">
							<a href="#" class="dropdown-notification-item"
								v-for="(notification, index) in notificationData" :key="index">
								<div class="dropdown-notification-icon">
									<i v-if="notification.icon" :class="notification.icon"></i>
									<img v-if="notification.img" :src="notification.img" width="26" alt="Notification image" />
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
							<div class="dropdown-notification-item empty-notification">
								<i class="fa fa-info-circle me-2"></i>
								No hay notificaciones.
							</div>
						</template>
						<div class="p-2 text-center mb-n1">
							<a href="#" class="text-body-emphasis text-opacity-50 text-decoration-none">Mostrar más</a>
						</div>
					</div>
				</div>
				<!-- User Settings -->
				<div class="menu-item dropdown ms-3 d-flex justify-content-end align-items-center">
					<a href="#" data-bs-toggle="dropdown" data-display="static"
						class="menu-link d-flex align-items-center" aria-label="User menu">
						<div class="menu-img online">
							<i class="fa-solid fa-user rounded-circle" aria-hidden="true"></i>
						</div>
						<div class="menu-text">
							<span v-if="isLoading" class="loading-placeholder">
								<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
							</span>
							<span v-else>{{ userName }}</span>
						</div>
					</a>
					<div class="dropdown-menu dropdown-menu-lg-end me-lg-3">
						<div class="dropdown-header-wrapper d-flex justify-content-between align-items-center d-md-none">
							<h6 class="dropdown-header text-body-emphasis mb-0">Menú</h6>
							<button type="button" class="btn-close btn-close-white btn-sm" data-bs-dismiss="dropdown" aria-label="Close"></button>
						</div>
						<RouterLink to="/profile" class="dropdown-item d-flex align-items-center">
							<span class="dropdown-item-text">Editar perfil</span>
							<i class="fa fa-wrench fa-fw ms-auto text-gray-400 fs-16px"></i>
						</RouterLink>
						<div class="dropdown-divider"></div>
						<a href="#" class="dropdown-item d-flex align-items-center" @click="signOutUser">
							<span class="dropdown-item-text">Cerrar sesión</span>
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
.app-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 0 16px;
	background: #29122f;
}
.header-left {
	display: flex;
	align-items: center;
	gap: 8px;
}
.mobile-toggler {
	display: none;
}
.desktop-toggler {
	display: flex;
	align-items: center;
}
.logo-container {
	display: flex;
	align-items: center;
	justify-content: center;
	max-width: 48px;
	min-width: 36px;
	min-height: 36px;
	margin: 0 0 0 4px;
	transition: transform 0.2s, max-width 0.2s, min-width 0.2s;
}
.logo-link {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	line-height: 0;
}
.site-logo {
	display: block;
	width: 100%;
	height: auto;
	min-width: 32px;
	min-height: 32px;
	max-width: 100%;
	max-height: 100%;
	border-radius: 50%;
	filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
	object-fit: contain;
}

/* --- User Avatar Online Indicator --- */
.menu-img.online::after {
	content: '';
	position: absolute;
	bottom: 0;
	right: 0;
	width: 8px;
	height: 8px;
	background-color: #28a745;
	border-radius: 50%;
	border: 2px solid #2d2d2d;
}

/* --- Loading State --- */
.loading-placeholder {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 60px;
}

/* --- Empty Notification Message --- */
.empty-notification {
	color: #6c757d;
	justify-content: center;
	padding: 20px;
}

/* --- Responsive Tweaks --- */
@media (max-width: 992px) {
	.logo-container {
		max-width: 40px;
		min-width: 32px;
		min-height: 32px;
	}
}
@media (max-width: 768px) {
	.app-header {
		flex-direction: row;
		align-items: center;
		padding: 0 8px;
	}
	.header-left {
		gap: 6px;
	}
	.mobile-toggler {
		display: flex;
		align-items: center;
		margin-right: 0;
	}
	.desktop-toggler {
		display: none;
	}
	.logo-container {
		max-width: 36px;
		min-width: 32px;
		min-height: 32px;
		margin: 0 0 0 2px;
	}
}
@media (max-width: 480px) {
	.logo-container {
		max-width: 32px;
		min-width: 28px;
		min-height: 28px;
	}
	.site-logo {
		min-width: 24px;
		min-height: 24px;
	}
}
</style>