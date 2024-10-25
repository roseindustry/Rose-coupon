import { defineStore } from "pinia";
import { useUserStore } from "@/stores/user-role";

export const useAppSidebarMenuStore = defineStore({
  id: "appSidebarMenu",
  state: () => ({
    adminMenu: [
      {
        text: "Navegacion",
        is_header: true,
      },
      {
        url: "/",
        icon: "fa fa-laptop",
        text: "Dashboard",
      },
      {
        url: "/comercios-afiliados",
        icon: "fa fa-building",
        text: "Comercios Afiliados",
      },
      {
        url: "/clientes",
        icon: "fa fa-users",
        text: "Clientes",
      },
      {
        url: "/cupones",
        icon: "fa fa-ticket",
        text: "Cupones",
      },      
      {
        url: "/suscripciones",
        icon: "fa fa-handshake",
        text: "Suscripciones",
      },
      {
        url: "/payments",
        icon: "fa-solid fa-file-invoice-dollar",
        text: "Notificaciones de Pago",
      },
      {
        url: "/creditos",
        icon: "fa fa-dollar",
        text: "Créditos",
      },
      {
        url: "/events",
        icon: "fa fa-pizza-slice",
        text: "Eventos",
      },
      {
        url: "/giveaways",
        icon: "fa fa-gift",
        text: "Sorteos",
      },
      // {
      //   is_divider: true,
      // },
      // {
      //   text: "Reportes",
      //   is_header: true,
      // },
      // {
      //   url: "/reports-by-rating",
      //   icon: "fa fa-clipboard",
      //   text: "Reportes por Encuesta",
      // },
      {
        is_divider: true,
      },
      {
        text: "Usuario",
        is_header: true,
      },
      {
        url: "/profile",
        icon: "fa fa-user-circle",
        text: "Ajustes",
      },
    ],
    clientMenu: [
      {
        text: "Navegacion",
        is_header: true,
      },
      {
        url: "/client-portal",
        icon: "fa fa-laptop",
        text: "Home",
      },
      {
        url: "/comercios-afiliados",
        icon: "fa fa-building",
        text: "Comercios Afiliados",
      },
      {
        url: "/cupones",
        icon: "fa fa-ticket",
        text: "Mis cupones",
      },
      {
        url: "/preferencias",
        icon: "fa fa-heart",
        text: "Preferencias",
      },
      {
        url: "/request-coupons",
        icon: "fa-solid fa-bell-concierge",
        text: "Solicitar cupones",
      },
      // {
      //   url: "/clients-ratings",
      //   icon: "fa fa-star",
      //   text: "Mis opiniones",
      // },
      // {
      //   url: "/creditos",
      //   icon: "fa fa-dollar",
      //   text: "Crédito",
      // },
      // {
      //   url: "#",
      //   icon: "fa fa-shopping-cart",
      //   text: "Compras",
      // },
      {
        is_divider: true,
      },
      {
        text: "Usuario",
        is_header: true,
      },
      {
        url: "/profile",
        icon: "fa fa-user-circle",
        text: "Perfil",
      },
    ],
    affiliateMenu: [
      {
        text: "Navegacion",
        is_header: true,
      },
      {
        url: "/affiliate-portal",
        icon: "fa fa-building",
        text: "Dashboard",
      },
      {
        is_divider: true,
      },
      {
        url: "/cupones",
        icon: "fa fa-ticket",
        text: "Cupones",
      },
      {
        url: "/clients-ratings",
        icon: "fa fa-comment-dots",
        text: "Opiniones",
      },
      {
        url: "/creditos",
        icon: "fa fa-dollar",
        text: "Crédito",
      },
      {
        is_divider: true,
      },
      {
        text: "Usuario",
        is_header: true,
      },
      {
        url: "/profile",
        icon: "fa fa-user-circle",
        text: "Perfil",
      },
    ],
    menuItems: [],
  }),
  actions: {
    async generateMenu() {
      const userStore = useUserStore();
      await userStore.fetchUser();
      const role = userStore.role;

      if (role === "admin") {
        this.menuItems = this.adminMenu;
      } else if (role === "cliente") {
        this.menuItems = this.clientMenu;
      } else if (role === "afiliado") {
        this.menuItems = this.affiliateMenu;
      } else {
        this.menuItems = [];
      }
    },
    getMenuItems() {
      return this.menuItems;
    }
  },
});
