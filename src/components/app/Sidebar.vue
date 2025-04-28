<script setup lang="ts">
import { useAppSidebarMenuStore } from '@/stores/app-sidebar-menu';
import { useAppOptionStore } from '@/stores/app-option';
import { useUserStore } from '@/stores/user-role';
import { onMounted, ref, computed, watch } from 'vue';
import { slideToggle } from '@/composables/slideToggle.js';
import { slideUp } from '@/composables/slideUp.js';
import { slideDown } from '@/composables/slideDown.js';
import SidebarNav from '@/components/app/SidebarNav.vue';

// Declare BeforeInstallPromptEvent type
declare global {
	interface BeforeInstallPromptEvent extends Event {
		readonly platforms: Array<string>;
		readonly userChoice: Promise<{
			outcome: 'accepted' | 'dismissed';
			platform: string;
		}>;
		prompt(): Promise<void>;
	}
}

const appSidebarMenu = useAppSidebarMenuStore();
const appOption = useAppOptionStore();
const userStore = useUserStore();
const isMenuLoaded = ref(false);

var appSidebarFloatSubmenuTimeout = '';
var appSidebarFloatSubmenuDom = '';

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const showInstallButton = ref(false);

function appSidebarMobileToggled() {
	appOption.appSidebarMobileToggled = !appOption.appSidebarMobileToggled;
}

function handleSidebarMinifyFloatMenuClick() {
	var elms = [].slice.call(document.querySelectorAll('.app-float-submenu .menu-item.has-sub > .menu-link'));
	if (elms) {
		elms.map(function (elm) {
			elm.onclick = function (e) {
				e.preventDefault();
				var targetItem = this.closest('.menu-item');
				var target = targetItem.querySelector('.menu-submenu');
				var targetStyle = getComputedStyle(target);
				var close = (targetStyle.getPropertyValue('display') != 'none') ? true : false;
				var expand = (targetStyle.getPropertyValue('display') != 'none') ? false : true;

				slideToggle(target);

				var loopHeight = setInterval(function () {
					var targetMenu = document.querySelector('.app-float-submenu');
					var targetHeight = targetMenu.clientHeight;
					var targetOffset = targetMenu.getBoundingClientRect();
					var targetOriTop = targetMenu.getAttribute('data-offset-top');
					var targetMenuTop = targetMenu.getAttribute('data-menu-offset-top');
					var targetTop = targetOffset.top;
					var windowHeight = document.body.clientHeight;
					if (close) {
						if (targetTop > targetOriTop) {
							targetTop = (targetTop > targetOriTop) ? targetOriTop : targetTop;
							targetMenu.style.top = targetTop + 'px';
							targetMenu.style.bottom = 'auto';
						}
					}
					if (expand) {
						if ((windowHeight - targetTop) < targetHeight) {
							var arrowBottom = (windowHeight - targetMenuTop) - 22;
							targetMenu.style.top = 'auto';
							targetMenu.style.bottom = 0;
						}
						var floatSubmenuElm = document.querySelector('.app-float-submenu');
						if (targetHeight > windowHeight) {
							if (floatSubmenuElm) {
								var splitClass = ('overflow-scroll mh-100vh').split(' ');
								for (var i = 0; i < splitClass.length; i++) {
									floatSubmenuElm.classList.add(splitClass[i]);
								}
							}
						}
					}
				}, 1);
				setTimeout(function () {
					clearInterval(loopHeight);
				}, 250);
			}
		});
	}
}

function handleSidebarMinifyFloatMenu() {
	var elms = [].slice.call(document.querySelectorAll('.app-sidebar .menu > .menu-item.has-sub > .menu-link'));
	if (elms) {
		elms.map(function (elm) {
			elm.onmouseenter = function () {
				var appElm = document.querySelector('.app');
				if (appElm && appElm.classList.contains('app-sidebar-minified')) {
					clearTimeout(appSidebarFloatSubmenuTimeout);
					var targetMenu = this.closest('.menu-item').querySelector('.menu-submenu');
					if (appSidebarFloatSubmenuDom == this && document.querySelector('.app-float-submenu')) {
						return;
					} else {
						appSidebarFloatSubmenuDom = this;
					}
					var targetMenuHtml = targetMenu.innerHTML;
					if (targetMenuHtml) {
						var bodyStyle = getComputedStyle(document.body);
						var sidebarOffset = document.querySelector('.app-sidebar').getBoundingClientRect();
						var sidebarWidth = parseInt(document.querySelector('.app-sidebar').clientWidth);
						var sidebarX = (bodyStyle.getPropertyValue('direction') != 'rtl') ? (sidebarOffset.left + sidebarWidth) : (document.body.clientWidth - sidebarOffset.left);
						var targetHeight = handleGetHiddenMenuHeight(targetMenu);
						var targetOffset = this.getBoundingClientRect();
						var targetTop = targetOffset.top;
						var targetLeft = (bodyStyle.getPropertyValue('direction') != 'rtl') ? sidebarX : 'auto';
						var targetRight = (bodyStyle.getPropertyValue('direction') != 'rtl') ? 'auto' : sidebarX;
						var windowHeight = document.body.clientHeight;

						if (!document.querySelector('.app-float-submenu')) {
							var overflowClass = '';
							if (targetHeight > windowHeight) {
								overflowClass = 'overflow-scroll mh-100vh';
							}
							var html = document.createElement('div');
							html.setAttribute('id', 'app-float-submenu');
							html.setAttribute('class', 'app-float-submenu ' + overflowClass);
							html.setAttribute('data-offset-top', targetTop);
							html.setAttribute('data-menu-offset-top', targetTop);
							html.innerHTML = targetMenuHtml;
							appElm.appendChild(html);

							var elm = document.getElementById('app-float-submenu');
							elm.onmouseover = function () {
								clearTimeout(appSidebarFloatSubmenuTimeout);
							};
							elm.onmouseout = function () {
								appSidebarFloatSubmenuTimeout = setTimeout(() => {
									document.querySelector('.app-float-submenu').remove();
								}, 250);
							};
						} else {
							var floatSubmenu = document.querySelector('.app-float-submenu');
							var floatSubmenuElm = document.querySelector('.app-float-submenu');

							if (targetHeight > windowHeight) {
								if (floatSubmenuElm) {
									var splitClass = ('overflow-scroll mh-100vh').split(' ');
									for (var i = 0; i < splitClass.length; i++) {
										floatSubmenuElm.classList.add(splitClass[i]);
									}
								}
							}
							floatSubmenu.setAttribute('data-offset-top', targetTop);
							floatSubmenu.setAttribute('data-menu-offset-top', targetTop);
							floatSubmenuElm.innerHTML = targetMenuHtml;
						}

						var targetHeight = document.querySelector('.app-float-submenu').clientHeight;
						var floatSubmenuElm = document.querySelector('.app-float-submenu');
						if ((windowHeight - targetTop) > targetHeight) {
							if (floatSubmenuElm) {
								floatSubmenuElm.style.top = targetTop + 'px';
								floatSubmenuElm.style.left = targetLeft + 'px';
								floatSubmenuElm.style.bottom = 'auto';
								floatSubmenuElm.style.right = targetRight + 'px';
							}
						} else {
							var arrowBottom = (windowHeight - targetTop) - 21;
							if (floatSubmenuElm) {
								floatSubmenuElm.style.top = 'auto';
								floatSubmenuElm.style.left = targetLeft + 'px';
								floatSubmenuElm.style.bottom = 0;
								floatSubmenuElm.style.right = targetRight + 'px';
							}
						}
						handleSidebarMinifyFloatMenuClick();
					} else {
						appSidebarFloatSubmenuDom = '';
						document.querySelector('.app-float-submenu').remove();
					}
				}
			}
			elm.onmouseleave = function () {
				var elm = document.querySelector('.app');
				if (elm && elm.classList.contains('app-sidebar-minified')) {
					appSidebarFloatSubmenuTimeout = setTimeout(() => {
						appSidebarFloatSubmenuDom = '';
						document.querySelector('.app-float-submenu').remove();
					}, 250);
				}
			}
		});
	}
}

function handleGetHiddenMenuHeight(elm) {
	elm.setAttribute('style', 'position: absolute; visibility: hidden; display: block !important');
	var targetHeight = elm.clientHeight;
	elm.removeAttribute('style');
	return targetHeight;
}

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

	// Ensure user role is fetched before generating the menu
	watch(
		() => userStore.role,
		async (newRole) => {
			if (newRole) {
				await appSidebarMenu.generateMenu();
				isMenuLoaded.value = true;
			}
		},
		{ immediate: true }
	);

	// Sidebar interaction logic
	var handleSidebarMenuToggle = function (menus, expandTime) {
		menus.map(function (menu) {
			menu.onclick = function (e) {
				e.preventDefault();
				var target = this.nextElementSibling;

				menus.map(function (m) {
					var otherTarget = m.nextElementSibling;
					if (otherTarget !== target) {
						slideUp(otherTarget, expandTime);
						otherTarget.closest('.menu-item').classList.remove('expand');
						otherTarget.closest('.menu-item').classList.add('closed');
					}
				});

				var targetItemElm = target.closest('.menu-item');

				if (targetItemElm.classList.contains('expand') || (targetItemElm.classList.contains('active') && !target.style.display)) {
					targetItemElm.classList.remove('expand');
					targetItemElm.classList.add('closed');
					slideToggle(target, expandTime);
				} else {
					targetItemElm.classList.add('expand');
					targetItemElm.classList.remove('closed');
					slideToggle(target, expandTime);
				}
			}
		});
	};

	var menuBaseSelector = '.app-sidebar .menu > .menu-item.has-sub';
	var submenuBaseSelector = ' > .menu-submenu > .menu-item.has-sub';

	// menu
	var menuLinkSelector = menuBaseSelector + ' > .menu-link';
	var menus = [].slice.call(document.querySelectorAll(menuLinkSelector));
	handleSidebarMenuToggle(menus);

	// submenu lvl 1
	var submenuLvl1Selector = menuBaseSelector + submenuBaseSelector;
	var submenusLvl1 = [].slice.call(document.querySelectorAll(submenuLvl1Selector + ' > .menu-link'));
	handleSidebarMenuToggle(submenusLvl1);

	// submenu lvl 2
	var submenuLvl2Selector = menuBaseSelector + submenuBaseSelector + submenuBaseSelector;
	var submenusLvl2 = [].slice.call(document.querySelectorAll(submenuLvl2Selector + ' > .menu-link'));
	handleSidebarMenuToggle(submenusLvl2);

	handleSidebarMinifyFloatMenu();
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
</script>

<template>
	<div id="sidebar" class="app-sidebar" v-if="isMenuLoaded">
		<perfect-scrollbar class="app-sidebar-content">
			<div class="menu">
				<!-- Iterate over top-level menu items -->
				<template v-for="(menu, index) in appSidebarMenu.getMenuItems()" :key="index">
					<!-- Render menu header if it's a header -->
					<div class="menu-header" v-if="menu.is_header">{{ menu.text }}</div>

					<!-- Render a divider if it's a divider -->
					<div class="menu-divider" v-else-if="menu.is_divider"></div>

					<!-- Render regular menu items -->
					<sidebar-nav v-else :menu="menu"></sidebar-nav>
				</template>
			</div>
			<!-- New Bottom Navigation Button -->
			<div class="sidebar-bottom-nav">
				<div class="bottom-nav-links">
					<a class="btn btn-outline-theme btn-sm mb-2" id="app-button" v-if="showInstallButton"
						@click="installPWA">
						<i class="fas fa-life-ring me-2"></i>
						Descarga la App
					</a>

					<div class="legal-links mt-3">
						<router-link to="/terms-and-conditions" class="legal-link" target="_blank">
							<i class="fas fa-file-alt me-2"></i>
							Términos y Condiciones
						</router-link>
						<router-link to="/privacy-policy" class="legal-link" target="_blank">
							<i class="fas fa-shield-alt me-2"></i>
							Política de Privacidad
						</router-link>
						<router-link to="/delete-account-info" class="legal-link" target="_blank">
							<i class="fas fa-user-times me-2"></i>
							Información de Cierre de Cuenta
						</router-link>
					</div>
				</div>
			</div>
		</perfect-scrollbar>
		<button class="app-sidebar-mobile-backdrop" @click="appSidebarMobileToggled"></button>


	</div>
</template>

<style scoped>
.sidebar-bottom-nav {
	position: absolute;
	bottom: 20px;
	left: 0;
	width: 100%;
	display: flex;
	justify-content: center;
	padding: 0 15px;
}

.bottom-nav-links {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 80%;
	gap: 1rem;
}

.legal-links {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	gap: 0.5rem;
}

.legal-link {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	padding: 8px 12px;
	text-decoration: none;
	color: #6c757d;
	font-size: 0.85rem;
	border-radius: 20px;
	transition: all 0.3s ease;
	background-color: rgba(108, 117, 125, 0.1);
}

.legal-link:hover {
	color: #b800c2;
	background-color: rgba(184, 0, 194, 0.1);
	transform: translateY(-2px);
}

.legal-link i {
	margin-right: 0.5rem;
	color: #b800c2;
}

.sidebar-bottom-nav .btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	padding: 10px;
	margin-bottom: 10px;
	border-radius: 25px;
	transition: all 0.3s ease;
}

.sidebar-bottom-nav .btn:hover {
	transform: translateY(-3px);
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
	.sidebar-bottom-nav {
		bottom: 10px;
	}

	.bottom-nav-links {
		width: 90%;
	}

	.sidebar-bottom-nav .btn {
		padding: 8px;
		font-size: 0.9rem;
	}

	.legal-link {
		font-size: 0.8rem;
		padding: 6px 10px;
	}
}
</style>