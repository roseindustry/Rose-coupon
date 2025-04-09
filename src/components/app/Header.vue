<script>
import { slideToggle } from '@/composables/slideToggle.js';
import { useAppOptionStore } from '@/stores/app-option';
import { useUserStore } from '@/stores/user-role';
// import { useTenancyStore } from '@/stores/tenancy';
import { useRouter, RouterLink } from 'vue-router';
import { auth, db } from '@/firebase/init';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { ref as dbRef, get, child } from 'firebase/database';
import { Dropdown } from 'bootstrap';

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
			<!-- BEGIN mobile-toggler -->
			<div class="mobile-toggler">
				<button type="button" class="menu-toggler" @click="toggleAppSidebarMobileToggled" 
						:class="{ 'active': showMobileMenu }" aria-label="Toggle menu">
					<span class="bar"></span>
					<span class="bar"></span>
				</button>
			</div>
			<!-- END mobile-toggler -->

			<!-- BEGIN brand -->
			<div class="col brand">
				<div class="desktop-toggler">
					<button type="button" class="menu-toggler" @click="toggleAppSidebarMinify" aria-label="Toggle sidebar">
						<span class="bar"></span>
						<span class="bar"></span>
					</button>
				</div>

				<div class="logo-container">
					<RouterLink to="/" class="logo-link">
						<img src="/assets/img/rose-logo.png" alt="Rose Logo" id="logo" class="site-logo" />
					</RouterLink>
				</div>
			</div>
			<!-- END brand -->

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
.logo-container {
	flex: 1;
	max-width: 60px;
	min-width: 60px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: transform 0.2s ease;
}

.logo-container:hover {
	transform: scale(1.05);
}

.logo-link {
	display: block;
	line-height: 0;
}

.site-logo {
	width: 100%;
	height: auto;
	border-radius: 50%;
	filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* Menu toggler improvements */
.menu-toggler {
	position: relative;
	transition: all 0.2s ease;
	border: none;
	background: transparent;
	padding: 10px;
	outline: none;
}

.menu-toggler:hover {
	transform: scale(1.1);
}

.menu-toggler:focus {
	outline: none;
}

.menu-toggler .bar {
	transition: all 0.3s ease;
}

.menu-toggler.active .bar:first-child {
	transform: rotate(45deg) translate(2px, 2px);
}

.menu-toggler.active .bar:last-child {
	transform: rotate(-45deg) translate(2px, -2px);
}

/* Menu item improvements */
.menu-item {
	position: relative;
}

.menu-link {
	transition: all 0.2s ease;
	border-radius: 4px;
	padding: 6px 10px;
}

.menu-link:hover {
	background-color: rgba(255, 255, 255, 0.1);
}

.menu-icon {
	position: relative;
}

.menu-label {
	position: absolute;
	top: -5px;
	right: -5px;
	background-color: #dc3545;
	color: white;
	border-radius: 50%;
	min-width: 18px;
	height: 18px;
	font-size: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: bold;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.menu-img {
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

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

.menu-text {
	margin-left: 8px;
	font-weight: 500;
	max-width: 150px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Dropdown improvements */
.dropdown-menu {
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	border: 1px solid rgba(255, 255, 255, 0.1);
	padding: 8px 0;
}

.dropdown-header {
	font-weight: 600;
	padding: 8px 16px;
}

.dropdown-item {
	padding: 10px 16px;
	transition: all 0.2s ease;
}

.dropdown-item:hover {
	background-color: rgba(111, 66, 193, 0.1);
}

.dropdown-item-text {
	flex: 1;
}

.dropdown-divider {
	margin: 4px 0;
	opacity: 0.1;
}

/* Notification dropdown */
.dropdown-notification {
	width: 300px;
	max-height: 400px;
	overflow-y: auto;
}

.dropdown-notification-item {
	display: flex;
	align-items: center;
	padding: 10px 16px;
	text-decoration: none;
	color: inherit;
	transition: all 0.2s ease;
}

.dropdown-notification-item:hover {
	background-color: rgba(111, 66, 193, 0.1);
}

.dropdown-notification-icon {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(111, 66, 193, 0.1);
	border-radius: 50%;
	margin-right: 12px;
	flex-shrink: 0;
}

.dropdown-notification-info {
	flex: 1;
	min-width: 0;
}

.dropdown-notification-info .title {
	font-weight: 500;
	margin-bottom: 2px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dropdown-notification-info .time {
	font-size: 12px;
	opacity: 0.7;
}

.dropdown-notification-arrow {
	margin-left: 8px;
	opacity: 0.5;
}

.empty-notification {
	color: #6c757d;
	justify-content: center;
	padding: 20px;
}

/* Loading state */
.loading-placeholder {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 60px;
}

/* Responsive adjustments */
@media (max-width: 992px) {
	.app-header {
		padding: 0 15px;
	}
	
	.menu-text {
		max-width: 120px;
	}
	
	.dropdown-notification {
		width: 280px;
		max-height: 350px;
	}
}

@media (max-width: 768px) {
	.app-header {
		padding: 0 10px;
	}
	
	.menu-text {
		max-width: 100px;
	}
	
	.menu-item {
		margin-left: 5px !important;
	}
	
	.menu-link {
		padding: 5px 8px;
	}
	
	.dropdown-notification {
		width: 260px;
		right: -70px;
		position: fixed;
	}
	
	.dropdown-menu-lg-end {
		right: -10px;
	}
}

@media (max-width: 576px) {
	.logo-container {
		max-width: 50px;
		min-width: 50px;
	}
	
	.menu-text {
		max-width: 80px;
	}
	
	.menu-item.dropdown {
		position: static;
	}
	
	.dropdown-notification {
		width: calc(100vw - 30px);
		left: 15px;
		right: 15px;
		position: fixed;
		top: 60px;
	}
	
	.dropdown-menu-lg-end {
		width: 200px;
	}
	
	.menu-img.online::after {
		width: 6px;
		height: 6px;
	}
}

/* Improved mobile menu toggle */
@media (max-width: 767.98px) {
	.menu-toggler {
		padding: 8px;
	}
	
	.menu-toggler .bar {
		width: 20px;
		height: 2px;
	}
	
	.mobile-toggler {
		margin-right: 5px;
	}
	
	.desktop-toggler {
		display: none;
	}
}

/* Fix for very small screens */
@media (max-width: 360px) {
	.menu-text {
		max-width: 60px;
	}
	
	.menu-icon {
		font-size: 14px;
	}
	
	.menu-label {
		min-width: 16px;
		height: 16px;
		font-size: 9px;
	}
}

/* Better touch targets for mobile */
@media (max-width: 767.98px) {
	.dropdown-item {
		padding: 12px 16px;
	}
	
	.menu-link {
		padding: 10px;
	}
	
	.dropdown-notification-item {
		padding: 12px 16px;
	}
	
	.btn-close {
		padding: 10px;
	}
}

/* Dropdown header wrapper */
.dropdown-header-wrapper {
	padding: 8px 16px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Fix for iOS Safari */
@supports (-webkit-touch-callout: none) {
	.dropdown-menu {
		transform: translate3d(0, 0, 0);
	}
	
	.menu-link:active {
		background-color: rgba(111, 66, 193, 0.2);
	}
}
</style>
