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
				text: 'Metricas del día'
			},
			{
				is_divider: true
			},
			{
				text: 'POS para Restaurantes',
				icon: 'fa-solid fa-cash-register',
				is_header: false,
				collapsed: true,
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
					},
					{
						url: '/pos/table-booking',
						icon: 'fa-solid fa-chair',
						text: 'Reserva de Mesas'
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
						url: '/pos/menu-stock',
						icon: 'fa-solid fa-burger',
						text: 'Inventario'
					},
				]
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
		]}
});
