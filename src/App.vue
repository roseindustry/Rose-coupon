<script setup lang="ts">
import { getCurrentInstance, onMounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useAppOptionStore } from '@/stores/app-option';
import { useUserStore } from '@/stores/user-role';
import { ProgressFinisher, useProgress } from '@marcoschulte/vue3-progress';
import AppSidebar from '@/components/app/Sidebar.vue';
import AppHeader from '@/components/app/Header.vue';
import AppTopNav from '@/components/app/TopNav.vue';
import AppFooter from '@/components/app/Footer.vue';
import AppThemePanel from '@/components/app/ThemePanel.vue';
import router from './router';

const appOption = useAppOptionStore();
const userStore = useUserStore();
const internalInstance = getCurrentInstance();

// Install PWA app prompt
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const showInstallButton = ref(false);

const progresses = [] as ProgressFinisher[];

onMounted(() => {
	// Listen for the beforeinstallprompt event
	window.addEventListener('beforeinstallprompt', (event: BeforeInstallPromptEvent) => {
		// Prevent the mini-infobar from appearing
		event.preventDefault();
		// Store the event so it can be triggered later
		deferredPrompt.value = event;
		// Show your custom install button
		showInstallButton.value = true;
	});

	userStore.fetchUser();
});

const installPWA = async () => {
	if (deferredPrompt.value) {
		// Show the prompt
		deferredPrompt.value.prompt();

		// Wait for the user to respond to the prompt
		const { outcome } = await deferredPrompt.value.userChoice;

		// Optionally, handle the outcome
		if (outcome === 'accepted') {
			console.log('User accepted the PWA install prompt');
		} else {
			console.log('User dismissed the PWA install prompt');
		}

		// Reset the prompt variable, it can't be used again
		deferredPrompt.value = null;
		showInstallButton.value = false;
	}
};

router.beforeEach(async (to, from) => {
	progresses.push(useProgress().start());
	appOption.appSidebarMobileToggled = false;
	document.body.scrollTop = 0;
	document.documentElement.scrollTop = 0;

	var targetElm = [].slice.call(document.querySelectorAll('.app-sidebar .menu-submenu'));
	targetElm.map(function (elm) {
		elm.style.display = '';
	});
})
router.afterEach(async (to, from) => {
	progresses.pop()?.finish();
})

document.querySelector('body').classList.add('app-init');
</script>

<template>
	<div class="app" v-bind:class="{
		'app-header-menu-search-toggled': appOption.appHeaderSearchToggled,
		'app-sidebar-minified': appOption.appSidebarMinified,
		'app-sidebar-collapsed': appOption.appSidebarCollapsed,
		'app-sidebar-mobile-toggled': appOption.appSidebarMobileToggled,
		'app-sidebar-mobile-closed': appOption.appSidebarMobileClosed,
		'app-content-full-height': appOption.appContentFullHeight,
		'app-content-full-width': appOption.appSidebarHide,
		'app-with-top-nav': appOption.appTopNav,
		'app-without-sidebar': appOption.appSidebarHide,
		'app-without-header': appOption.appHeaderHide,
		'app-boxed-layout': appOption.appBoxedLayout,
		'app-footer-fixed': appOption.appFooterFixed,
	}">
		<vue3-progress-bar />
		<app-header v-if="!appOption.appHeaderHide" />
		<app-top-nav v-if="appOption.appTopNav" />
		<app-sidebar v-if="!appOption.appSidebarHide" />
		<div class="app-content" v-bind:class="appOption.appContentClass, { 'no-sidebar': appOption.appSidebarHide }">
			<router-view></router-view>
		</div>
		<app-footer v-if="appOption.appFooter" />
		<app-theme-panel />
	</div>
	<div v-if="showInstallButton">
		<button @click="installPWA" class="btn btn-primary">Instale Rose App</button>
	</div>
</template>
