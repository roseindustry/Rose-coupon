import { defineStore } from "pinia";

export const useAppTopNavMenuStore = defineStore({
  id: "appTopNavMenu",
  state: () => {
    return [
		{
			url: '/',
			icon: 'fa fa-laptop',
			text: 'Dashboard'
		},
		{
			url: '/analytics',
			icon: 'fa fa-chart-pie',
			text: 'Analytics'
		},
		{
			url: '/email/',
			icon: 'fa fa-envelope',
			text: 'Email',
			label: '6',
			children: [
				{ url: '/email/inbox', text: 'Inbox' },
				{ url: '/email/compose', text: 'Compose' },
				{ url: '/email/detail', text: 'Detail' }
			]
		},
		{
			url: '/widgets',
			icon: 'fa fa-qrcode',
			text: 'Widgets'
		}, 
		{
			url: '/pos',
      icon: 'fa fa-wallet',
      text: 'POS System',
      children: [
      	{ url: '/pos/customer-order', text: 'Customer Order' }, 
      	{ url: '/pos/kitchen-order', text: 'Kitchen Order' }, 
      	{ url: '/pos/counter-checkout', text: 'Counter Checkout' }, 
      	{ url: '/pos/table-booking', text: 'Table Booking' }, 
      	{ url: '/pos/menu-stock', text: 'Menu Stock' }
			]
    },
		{
			url: '/ui/',
			icon: 'fa fa-heart',
			text: 'UI Kits',
			children: [
				{ url: '/ui/bootstrap', text: 'Bootstrap' },
				{ url: '/ui/buttons', text: 'Buttons' },
				{ url: '/ui/card', text: 'Card' },
				{ url: '/ui/icons', text: 'Icons' },
				{ url: '/ui/modal-notifications', text: 'Modal & Notifications' },
				{ url: '/ui/typography', text: 'Typography' },
				{ url: '/ui/tabs-accordions', text: 'Tabs & Accordions' }
			]
		},
		{
			url: '/form/',
			icon: 'fa fa-file-alt',
			text: 'Forms',
			children: [
				{ url: '/form/elements', text: 'Form Elements' },
				{ url: '/form/plugins', text: 'Form Plugins' },
				{ url: '/form/wizards', text: 'Wizards' }
			]
		},
		{
			url: '/table/',
			icon: 'fa fa-table',
			text: 'Tables',
			children: [
				{ url: '/table/elements', text: 'Table Elements' },
				{ url: '/table/plugins', text: 'Table Plugins' }
			]
		},
		{
			url: '/chart/',
			icon: 'fa fa-chart-bar',
			text: 'Charts',
			children: [
				{ url: '/chart/chart-js', text: 'Chart.js' },
				{ url: '/chart/chart-apex', text: 'Apexcharts.js' }
			]
		},
		{
			url: '/map',
			icon: 'fa fa-map-marker-alt',
			text: 'Map'
		},
		{
			url: '/layout',
			icon: 'fa fa-code-branch',
			text: 'Layout',
			children: [
				{ url: '/layout/starter-page', text: 'Starter Page' },
				{ url: '/layout/fixed-footer', text: 'Fixed Footer' },
				{ url: '/layout/full-height', text: 'Full Height' },
				{ url: '/layout/full-width', text: 'Full Width' },
				{ url: '/layout/boxed-layout', text: 'Boxed Layout' },
				{ url: '/layout/minified-sidebar', text: 'Minified Sidebar' },
				{ url: '/layout/top-nav', text: 'Top Nav' },
				{ url: '/layout/mixed-nav', text: 'Mixed Nav' }, 
				{ url: '/layout/mixed-nav-boxed-layout', text: 'Mixed Nav Boxed Layout' }
			]
		},
		{
			url: '/page/',
			icon: 'fa fa-globe',
			text: 'Pages',
			children: [
				{ url: '/page/scrum-board', text: 'Scrum Board' },
				{ url: '/page/product', text: 'Products' },
				{ url: '/page/product-details', text: 'Product Details' },
				{ url: '/page/order', text: 'Orders' },
				{ url: '/page/order-details', text: 'Order Details' },
				{ url: '/page/gallery', text: 'Gallery' },
				{ url: '/page/search-results', text: 'Search Results' },
				{ url: '/page/coming-soon', text: 'Coming Soon Page' },
				{ url: '/page/error', text: 'Error Page' },
				{ url: '/page/login', text: 'Login' },
				{ url: '/page/register', text: 'Register'},
				{ url: '/page/messenger', text: 'Messenger'},
				{ url: '/page/data-management', text: 'Data Management'},
				{ url: '/page/file-manager', text: 'File Manager'},
				{ url: '/page/pricing', text: 'Pricing Page'}
			]
		},
		{
			url: '/profile',
			icon: 'fa fa-user-circle',
			text: 'Profile'
		},
		{
			url: '/calendar',
			icon: 'fa fa-calendar',
			text: 'Calendar'
		},
		{
			url: '/settings',
			icon: 'fa fa-cog',
			text: 'Settings'
		},
		{
			url: '/helper',
			icon: 'fa fa-question-circle',
			text: 'Helper'
		}
	]}
});
