<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { slideToggle } from '@/composables/slideToggle.js';
import { useAppOptionStore } from '@/stores/app-option';
import { useUserStore } from '@/stores/user-role';
import { useTenancyStore } from '@/stores/tenancy';
import { useRouter, RouterLink } from 'vue-router';
import { auth, db } from '@/firebase/init';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { ref as dbRef, get, child } from 'firebase/database';

const appOption = useAppOptionStore();
const userStore = useUserStore();
const tenancyStore = useTenancyStore();
const router = useRouter();
const userName = ref('');
const tenant = computed(() => tenancyStore.tenant);
// This variable will be true if the user is logged in and false otherwise
const isUserLoggedIn = ref(false);

const notificationData = [];

onMounted(() => {
	onAuthStateChanged(auth, (user) => {
		if (user) {
			// User is signed in, now fetch user's data from the database
			isUserLoggedIn.value = true;
			const userId = user.uid;
			fetchUserData(userId);
		} else {
			// No user is signed in.
			isUserLoggedIn.value = false;
			console.log('No user logged in');
		}
	});
	userStore.fetchUser();
});

const fetchUserData = (userId) => {
	const userRef = dbRef(db);
	get(child(userRef, `Users/${userId}`))
		.then((snapshot) => {
			if (snapshot.exists()) {
				userName.value = snapshot.val().firstName + ' ' + snapshot.val().lastName;
			} else {
				console.log("No data available");
			}
		}).catch((error) => {
			console.error(error);
		});
};

const signOutUser = async () => {
	try {
		await signOut(auth);
		router.push('/page/login'); // Redirect to login after sign out
	} catch (error) {
		console.error('Error signing out:', error.message);
	}
};

function toggleAppSidebarMinify() {
	if (!(appOption.appTopNav && appOption.appSidebarHide)) {
		appOption.appSidebarMinified = !appOption.appSidebarMinified;
	}
}
function toggleAppSidebarMobileToggled() {
	if (appOption.appTopNav && appOption.appSidebarHide) {
		slideToggle(document.querySelector('.app-top-nav'));
		window.scrollTo(0, 0);
	} else {
		appOption.appSidebarMobileToggled = !appOption.appSidebarMobileToggled;
	}
}
</script>
<template>
	<div v-if="isUserLoggedIn">
		<div id="header" class="app-header">
			<!-- BEGIN mobile-toggler -->
			<div class="mobile-toggler" v-if="userStore.role !== 'cliente'">
				<button type="button" class="menu-toggler" v-on:click="toggleAppSidebarMobileToggled">
					<span class="bar"></span>
					<span class="bar"></span>
				</button>
			</div>
			<!-- END mobile-toggler -->

			<!-- BEGIN brand -->
			<div class="col brand">
				<div class="desktop-toggler" :class="{'no-toggler': userStore.role === 'cliente'}">
					<button type="button" class="menu-toggler" v-on:click="toggleAppSidebarMinify">
						<span class="bar"></span>
						<span class="bar"></span>
					</button>
				</div>

				<div class="logo-container">
					<img v-if="tenant && tenant.logoUrl" :src="tenant.logoUrl" alt="Logo" id="logo" class="site-logo">
					<!-- <div class="menu-text" style="margin: 5px; color: darkgrey;">{{ tenant.name }}</div> -->
				</div>
			</div>
			<!-- END brand -->

			<div class="col menu">
				<!-- BEGIN notifications menu -->
				<div class="menu-item dropdown d-flex justify-content-end align-items-center" v-if="userStore.role !== 'cliente'">
					<a href="#" data-bs-toggle="dropdown" data-display="static"
						class="menu-link d-flex align-items-center">
						<div class="menu-icon"><i class="fa fa-bell nav-icon"></i></div>
						<div class="menu-label">{{ notificationData.length }}</div>
					</a>
					<div class="dropdown-menu dropdown-menu-lg-end dropdown-notification">
						<h6 class="dropdown-header text-body-emphasis mb-1">Notifications</h6>
						<template v-if="notificationData && notificationData.length > 0">
							<a href="#" class="dropdown-notification-item"
								v-for="(notification, index) in notificationData" v-bind:key="index">
								<div class="dropdown-notification-icon">
									<i v-if="notification.icon" v-bind:class="notification.icon"></i>
									<img v-if="notification.img" v-bind:src="notification.img" width="26">
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
						<RouterLink v-if="userStore.role !== 'cliente'" to="/control-panel" class="dropdown-item d-flex align-items-center">Panel de control <i
								class="fa fa-user-circle fa-fw ms-auto text-gray-400 fs-16px"></i></RouterLink>
						<RouterLink to="/profile" class="dropdown-item d-flex align-items-center">Editar perfil <i
								class="fa fa-wrench fa-fw ms-auto text-gray-400 fs-16px"></i></RouterLink>
						<div class="dropdown-divider"></div>
						<a href="#" class="dropdown-item d-flex align-items-center" @click="signOutUser">Cerrar sesion
							<i class="fa fa-toggle-off fa-fw ms-auto text-gray-400 fs-16px"></i></a>
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
