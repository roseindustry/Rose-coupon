import { defineStore } from "pinia";

export const useAppOptionStore = defineStore({
	id: "appOption",
	state: () => {
		return {
			appMode: '',
			appThemeClass: '',
			appCoverClass: '',
			appBoxedLayout: false,
			appHeaderHide: false,
			appHeaderSearchToggled: false,
			appSidebarCollapsed: false,
			appSidebarMobileToggled: false,
			appSidebarMobileClosed: false,
			appSidebarHide: false,
			appContentFullHeight: false,
			appContentClass: '',
			appTopNav: false,
			appFooter: false,
			appFooterFixed: false,
			appThemePanelToggled: false,
			// appDarkMode: false
		}
	},
	// actions: {
	// 	// You could add an action to toggle dark mode if needed
	// 	toggleDarkMode() {
	// 		this.appDarkMode = !this.appDarkMode;
	// 		// Optionally, store this in localStorage
	// 		if (localStorage) {
	// 			localStorage.setItem('appDarkMode', this.appDarkMode.toString());
	// 		}
	// 	},
	// 	// Method to initialize dark mode based on stored preference
	// 	initializeDarkMode() {
	// 		if (localStorage && localStorage.getItem('appDarkMode')) {
	// 			this.appDarkMode = localStorage.getItem('appDarkMode') === 'true';
	// 		}
	// 	}
	// }
});
