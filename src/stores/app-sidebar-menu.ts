import { defineStore } from "pinia";

export const useAppSidebarMenuStore = defineStore({
  id: "appSidebarMenu",
  state: () => {
    return [
    {
			text: 'Navegacion',
			is_header: true
		},
		{
			url: '/',
			icon: 'fa fa-laptop',
			text: 'Dashboard'
		},
		{
			url: '/analytics',
			icon: 'fa fa-chart-pie',
			text: 'Metricas'
		},
		{
			is_divider: true
		},
		{
			text: 'Sistema POS',
			is_header: true
		},
		{
			url: '#',
			icon: 'fa-solid fa-book',
			text: 'Ordenes',
			children: [
				{
					url: '/pos/customer-order',
					icon: 'fa-solid fa-pencil',
					text: 'Nueva orden'
				},
				{
					url: '/page/orders',
					icon: 'fa-solid fa-list',
					text: 'Lista de ordenes'
				}
			]
		},
		{
			url: '/pos/menu-stock',
			icon: 'fa-solid fa-book',
			text: 'Inventario / Menu'
		},
		{
			url: '/pos/table-booking',
			icon: 'fa-solid fa-chair',
			text: 'Mesas'
		},
		{
			url: '/pos/kitchen-order',
			icon: 'fa-solid fa-kitchen-set',
			text: 'Ordenes de Cocina'
		},
		{
			url: '/pos/counter-checkout',
			icon: 'fa-solid fa-cart-shopping',
			text: 'Checkout'
		},
		{
			is_divider: true
		},
		{
			text: 'Reportes',
			is_header: true
		},
		// {
		// 	url: '/page/reports-by-client',
		// 	icon: 'fa fa-clipboard',
		// 	text: 'Reportes Por cliente'
		// },
		{
			url: '/page/reports-by-rating',
			icon: 'fa fa-clipboard',
			text: 'Reportes por Encuesta'
		},
		{
			is_divider: true
		},
		{
			text: 'Usuario',
			is_header: true
		},
		{
			url: '/profile',
			icon: 'fa fa-user-circle',
			text: 'Perfil'
		},
		{
			url: '/settings',
			icon: 'fa fa-cog',
			text: 'Ajustes'
		}
	]}
});
