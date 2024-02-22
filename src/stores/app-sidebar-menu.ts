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
			url: '/pos/menu-stock',
			icon: 'fa-solid fa-book',
			text: 'Menu'
		},
		{
			url: '/pos/table-booking',
			icon: 'fa-solid fa-chair',
			text: 'Mesas'
		},
		{
			url: '/pos/customer-order',
			icon: 'fa-solid fa-book-open',
			text: 'Ordenes'
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
