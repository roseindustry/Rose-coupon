<script>
import { db } from "../firebase/init";
import {
  ref as dbRef,
  update,
  get,
  query,
  orderByChild,
  equalTo
} from "firebase/database";
import copyToClipboard from "@/utils/copyToClipboard";
import { showToast } from "@/utils/toast";
import { sendEmail } from "@/utils/emailService";
import "toastify-js/src/toastify.css";
import SearchInput from "@/components/app/SearchInput.vue";
import moment from "moment";
import { Modal } from "bootstrap";
import { useUserStore } from "@/stores/user-role";
import {
  CreatePlanModal,
  EditPlanModal,
  ExchangeRateModal,
  AssignSubscriptionModal,
} from "@/components/subscriptions/admin/modals";
import AdminSubscriptionsView from "@/components/subscriptions/admin/AdminSubscriptionsView.vue";
import UserSubscriptionsView from "@/components/subscriptions/UserSubscriptionsView.vue";
import PageHeader from "@/components/app/PageHeader.vue";
import { useFileUpload } from '@/composables/useFileUpload';
import { useExchange } from '@/composables/useExchange';

export default {
  name: "Subscriptions",
  components: {
    SearchInput,
    CreatePlanModal,
    EditPlanModal,
    ExchangeRateModal,
    AssignSubscriptionModal,
    AdminSubscriptionsView,
    UserSubscriptionsView,
    PageHeader
  },
  setup() {
    const {
      isUploading,
      errorMessage,
      processFile,
      processPayment
    } = useFileUpload();

    const {
      exchange,
      isLoading: exchangeLoading,
      error: exchangeError,
      fetchCurrentExchange
    } = useExchange();

    return {
      isUploading,
      errorMessage,
      processFile,
      processPayment,

      exchange,
      exchangeLoading,
      exchangeError,
      fetchCurrentExchange
    };
  },
  data() {
    return {
      role: null,
      userId: null,
      userName: null,
      userEmail: null,
      fetchedExchange: 0,

      clientsSubscriptions: [],
      clientsNoSubscriptions: [],
      affiliatesSubscriptions: [],
      affiliatesNoSubscriptions: [],

      searchQuery: "",
      searchResults: [],
      searchAffResults: [],
      selectedClient: null,
      selectedAffiliate: null,
      selectedPlan: {},

      clientPlan: {
        order: "",
        name: "",
        desc: "",
        price: 0,
        yearlyPrice: 0,
        isYearly: false,
        requestLimit: 0,
        cuotaAddOn: 0,
        icon: "",
      },
      editClientPlanData: {
        id: "",
        order: "",
        name: "",
        desc: "",
        price: 0,
        yearlyPrice: 0,
        isYearly: false,
        requestLimit: 0,
        cuotaAddOn: 0,
        icon: "",
      },
      affiliatePlan: {
        order: "",
        name: "",
        desc: "",
        price: 0,
        yearlyPrice: 0,
        isYearly: false,
      },
      editAffiliatePlanData: {
        id: "",
        order: "",
        name: "",
        desc: "",
        price: 0,
        yearlyPrice: 0,
        isYearly: false,
      },

      inputIcon: false,

      currentPage: 1,
      itemsPerPage: 10,
      sortField: "firstName",
      sortOrder: "asc",
      filterDate: null,

      paymentFile: null,
      paymentPreview: null,
      paymentDate: null,
      paymentUrl: null,
      isSubmitting: false,
      errorMessage: "",
      paymentModal: null,

      loading: false,
      loadingPlans: false,

      currentSub: "",

      amountPaid: 0,
      payDay: null,
      isPaid: false,
      activeTab: "clients",
      plans: [],
      affiliatePlans: [],
      clients: [],
      affiliates: [],
    };
  },
  computed: {
    // Sorted subscriptions for displaying to Clients or Affiliates in their view
    sortedPlans() {
      const plans = this.role === "cliente" ? this.plans : this.affiliatePlans;

      return [...plans].sort((a, b) => a.order - b.order);
    },
    // Sorted subscriptions to display to admin
    sortedClientPlans() {
      const plans = this.plans;

      return [...plans].sort((a, b) => a.order - b.order);
    },
    sortedAffiliatePlans() {
      const plans = this.affiliatePlans;

      return [...plans].sort((a, b) => a.order - b.order);
    },
    formattedDesc() {
      return this.sortedPlans.map((plan) => ({
        ...plan,
        desc: plan.desc
          .split(".")
          .filter((sentence) => sentence.trim())
          .map((sentence) => `<li>${sentence.trim()}</li>`)
          .join(""),
      }));
    },

    // 1. Clients with subscriptions
    allFilteredClientsSubscriptions() {
      let filtered = this.clientsSubscriptions;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter((client) => {
          const fullName = (
            client.firstName +
            " " +
            client.lastName
          ).toLowerCase();
          const identification = String(client.identification).toLowerCase(); // Ensure it's a string
          const subscriptionName = client.subscriptionName
            ? client.subscriptionName.toLowerCase()
            : "";

          return (
            fullName.includes(query) ||
            identification.includes(query) ||
            subscriptionName.includes(query)
          );
        });
      }

      if (this.filterDate) {
        filtered = filtered.filter((client) => {
          const registrationDate = moment(client.createdAt).format(
            "YYYY-MM-DD"
          );
          return registrationDate === this.filterDate;
        });
      }

      return filtered;
    },
    filteredClientsSubscriptions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allFilteredClientsSubscriptions.slice(start, end);
    },

    // 2. Clients without subscriptions
    allFilteredClientsNoSubscriptions() {
      let filtered = this.clientsNoSubscriptions;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter((client) => {
          const fullName = (
            client.firstName +
            " " +
            client.lastName
          ).toLowerCase();
          const identification = String(client.identification).toLowerCase(); // Ensure it's a string
          const subscriptionName = client.subscriptionName
            ? client.subscriptionName.toLowerCase()
            : "";

          return (
            fullName.includes(query) ||
            identification.includes(query) ||
            subscriptionName.includes(query)
          );
        });
      }

      if (this.filterDate) {
        filtered = filtered.filter((client) => {
          const registrationDate = moment(client.createdAt).format(
            "YYYY-MM-DD"
          );
          return registrationDate === this.filterDate;
        });
      }

      return filtered;
    },
    filteredClientsNoSubscriptions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allFilteredClientsNoSubscriptions.slice(start, end);
    },

    // 3. Affiliates with subscriptions
    allFilteredAffiliatesSubscriptions() {
      let filtered = this.affiliatesSubscriptions;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter((affiliate) => {
          const name = affiliate.companyName.toLowerCase();
          const rif = String(affiliate.rif).toLowerCase();
          const subscriptionName = affiliate.subscriptionName
            ? affiliate.subscriptionName.toLowerCase()
            : "";

          return (
            name.includes(query) ||
            rif.includes(query) ||
            subscriptionName.includes(query)
          );
        });
      }

      if (this.filterDate) {
        filtered = filtered.filter((affiliate) => {
          const registrationDate = moment(affiliate.createdAt).format(
            "YYYY-MM-DD"
          );
          return registrationDate === this.filterDate;
        });
      }

      return filtered;
    },
    filteredAffiliatesSubscriptions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allFilteredAffiliatesSubscriptions.slice(start, end);
    },

    // 4. Affiliates without subscriptions
    allFilteredAffiliatesNoSubscriptions() {
      let filtered = this.affiliatesNoSubscriptions;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter((affiliate) => {
          const name = affiliate.companyName.toLowerCase();
          const rif = String(affiliate.rif).toLowerCase();
          const subscriptionName = affiliate.subscriptionName
            ? affiliate.subscriptionName.toLowerCase()
            : "";

          return (
            name.includes(query) ||
            rif.includes(query) ||
            subscriptionName.includes(query)
          );
        });
      }

      if (this.filterDate) {
        filtered = filtered.filter((affiliate) => {
          const registrationDate = moment(affiliate.createdAt).format(
            "YYYY-MM-DD"
          );
          return registrationDate === this.filterDate;
        });
      }

      return filtered;
    },
    filteredAffiliatesNoSubscriptions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allFilteredAffiliatesNoSubscriptions.slice(start, end);
    },

    // Total pages calculation for each type
    totalPages() {
      return (type) => {
        switch (type) {
          case "clientSubscriptions":
            return Math.ceil(
              this.allFilteredClientsSubscriptions.length / this.itemsPerPage
            );
          case "clientNoSubscriptions":
            return Math.ceil(
              this.allFilteredClientsNoSubscriptions.length / this.itemsPerPage
            );
          case "affiliateSubscriptions":
            return Math.ceil(
              this.allFilteredAffiliatesSubscriptions.length / this.itemsPerPage
            );
          case "affiliateNoSubscriptions":
            return Math.ceil(
              this.allFilteredAffiliatesNoSubscriptions.length /
              this.itemsPerPage
            );
          default:
            return 0;
        }
      };
    },

    // Calculate visible pages for pagination
    visiblePages() {
      return (type) => {
        const totalPages = this.totalPages(type);
        const maxPagesToShow = window.innerWidth < 768 ? 3 : 5;
        let startPage = Math.max(
          1,
          this.currentPage - Math.floor(maxPagesToShow / 2)
        );
        let endPage = Math.min(
          totalPages,
          this.currentPage + Math.floor(maxPagesToShow / 2)
        );

        if (endPage - startPage + 1 < maxPagesToShow) {
          if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
          } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
          }
        }

        return Array.from(
          { length: endPage - startPage + 1 },
          (_, i) => startPage + i
        );
      };
    },
  },
  methods: {
    handleCopy(text) {
      copyToClipboard(text);
    },
    async sendNotificationEmail(emailPayload) {
      try {
        const result = await sendEmail(emailPayload);
        if (result.success) {
          console.log("Email sent successfully:", result.message);
        } else {
          console.error("Failed to send email:", result.error);
        }
      } catch (error) {
        console.error("Error sending email:", error);
      }
    },
    goToPage(page, type) {
      if (page >= 1 && page <= this.totalPages(type)) {
        this.currentPage = page;
      }
    },

    async fetchClients() {
      const role = "cliente";
      const clientRef = query(
        dbRef(db, "Users"),
        orderByChild("role"),
        equalTo(role)
      );

      try {
        this.loading = true;
        const snapshot = await get(clientRef);

        if (snapshot.exists()) {
          const users = snapshot.val();

          // Call the `getAllUsers` onRequest Cloud Function using an HTTP request
          const functionUrl =
            "https://us-central1-rose-app-e062e.cloudfunctions.net/getAllUsers";
          const response = await fetch(functionUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // Add an Authorization header if you require user authentication
              // "Authorization": `Bearer ${authToken}`
            },
          });

          if (!response.ok) {
            throw new Error(
              `Failed to call Cloud Function: ${response.statusText}`
            );
          }

          const data = await response.json();

          if (!data || !data.users) {
            throw new Error("Failed to retrieve users from Cloud Function");
          }

          const authUsers = data.users;

          // Create a lookup object for auth users based on UID
          const authUsersLookup = authUsers.reduce((lookup, authUser) => {
            lookup[authUser.uid] = authUser;
            return lookup;
          }, {});

          // Prepare an array of subscription IDs to batch fetch
          const subscriptionIds = Object.values(users).reduce((subs, user) => {
            if (user.subscription && user.subscription.subscription_id) {
              subs.add(user.subscription.subscription_id);
            }
            return subs;
          }, new Set());

          const subscriptionPromises = Array.from(subscriptionIds).map(
            async (subscriptionId) => {
              const subscriptionRef = dbRef(
                db,
                `Suscriptions/${subscriptionId}`
              );
              const subscriptionSnapshot = await get(subscriptionRef);
              return {
                subscriptionId,
                subscription: subscriptionSnapshot.exists()
                  ? subscriptionSnapshot.val()
                  : null,
              };
            }
          );

          // Fetch all subscriptions in parallel
          const subscriptionResults = await Promise.all(subscriptionPromises);
          const subscriptionLookup = subscriptionResults.reduce(
            (lookup, { subscriptionId, subscription }) => {
              lookup[subscriptionId] = subscription;
              return lookup;
            },
            {}
          );

          // Map clients with their corresponding data
          this.clients = Object.entries(users).map(([uid, user]) => {
            const authUser = authUsersLookup[uid];
            const subscription = user.subscription
              ? subscriptionLookup[user.subscription.subscription_id]
              : null;

            return {
              uid,
              ...user,
              createdAt: authUser ? authUser.creationTime : null,
              subscriptionName: subscription
                ? subscription.name || "Suscripción desconocida"
                : "Sin suscripción",
            };
          });

          // Separate clients with and without subscriptions
          this.clientsSubscriptions = this.clients.filter(
            (client) => client.subscriptionName !== "Sin suscripción"
          );
          this.clientsNoSubscriptions = this.clients.filter(
            (client) => client.subscriptionName === "Sin suscripción"
          );
        } else {
          this.clients = [];
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        this.clients = [];
      } finally {
        this.loading = false;
      }
    },
    async fetchAffiliates() {
      const role = "afiliado";
      const affRef = query(
        dbRef(db, "Users"),
        orderByChild("role"),
        equalTo(role)
      );

      try {
        const snapshot = await get(affRef);

        if (snapshot.exists()) {
          const affiliates = snapshot.val();

          // Since Firebase data is an object, map to array for easier use
          this.affiliates = Object.keys(affiliates).map((key) => ({
            id: key,
            ...affiliates[key],
          }));
          // Loop through each client to fetch their subscription data
          for (const aff of this.affiliates) {
            // Check if the client has a subscription object with a subscription_id
            if (aff.subscription && aff.subscription.subscription_id) {
              const subscriptionId = aff.subscription.subscription_id;
              const subscriptionRef = dbRef(
                db,
                `Affiliate_suscriptions/${subscriptionId}`
              );
              const subscriptionSnapshot = await get(subscriptionRef);

              if (subscriptionSnapshot.exists()) {
                // Add subscription name to client data
                aff.subscriptionName =
                  subscriptionSnapshot.val().name || "Suscripción desconocida";
              } else {
                console.log(
                  `Subscription with ID ${subscriptionId} not found.`
                );
                aff.subscriptionName = "Suscripción desconocida";
              }
            } else {
              aff.subscriptionName = "Sin suscripción";
            }
          }

          this.affiliatesSubscriptions = this.affiliates.filter(
            (aff) => aff.subscription
          );
          this.affiliatesNoSubscriptions = this.affiliates.filter(
            (aff) => !aff.subscription
          );
        } else {
          this.affiliates = []; // No clients found
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        this.affiliates = [];
      }
    },
    async fetchPlans() {
      try {
        this.loadingPlans = true;

        const plansRef = query(dbRef(db, "Suscriptions"));
        const snapshot = await get(plansRef);

        if (snapshot.exists()) {
          const plans = snapshot.val();

          // Since Firebase data is an object, map to array for easier use
          this.plans = Object.keys(plans).map((key) => ({
            id: key,
            ...plans[key],
          }));
        } else {
          this.plans = []; // No subscriptions found
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
        this.plans = [];
      } finally {
        this.loadingPlans = false;
      }
    },
    async fetchAffiliatePlans() {
      const plansRef = query(dbRef(db, "Affiliate_suscriptions"));
      try {
        this.loadingPlans = true;

        const snapshot = await get(plansRef);

        if (snapshot.exists()) {
          const plans = snapshot.val();

          // Since Firebase data is an object, map to array for easier use
          this.affiliatePlans = Object.keys(plans).map((key) => ({
            id: key,
            ...plans[key],
          }));
        } else {
          this.affiliatePlans = []; // No subscriptions found
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
        this.affiliatePlans = [];
      } finally {
        this.loadingPlans = false;
      }
    },

    // Clients and Affiliates can contract a subscription
    async contractPlan(plan) {
      if (confirm(`¿Seguro que desea cambiar su suscripción a ${plan.name.toUpperCase()}?`)) {
        const userId = this.userId;
        this.selectedPlan = plan;

        if (!userId) {
          alert("Usuario no identificado.");
          return;
        }

        if (!plan) {
          alert("Por favor seleccione una suscripción antes de contratar.");
          return;
        }

        // Calculate payDay
        let payDay;
        if (plan.isYearly) {
          payDay = moment().add(1, "year").toISOString();
        } else {
          payDay = moment().add(1, "month").toISOString();
        }

        // Prepare subscription details
        const subscriptionData = {
          subscription_id: plan.id,
          status: false, // Set the default status as false 'inactive until payment confirmed'
          payDay: payDay,
        };

        // Proceed to open modal with Payment methods and payment upload
        if (plan.price === 0 && this.role === "cliente") {
          try {
            // Assign the subscription details to the client's data in Firebase
            const userPlanRef = dbRef(db, `Users/${userId}/subscription`);
            await update(userPlanRef, subscriptionData);

            // Notify user (client/affiliate)
            const appUrl = "https://app.rosecoupon.com";
            const userEmailPayload = {
              to: this.userEmail,
              message: {
                subject: `Suscripción ${plan.name.toUpperCase()} activada`,
                text: `Hola ${this.userName}, se le ha activado la Suscripción ${plan.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
                html: `<p>Hola ${this.userName}, se le ha activado la Suscripción ${plan.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`,
              },
            };
            await this.sendNotificationEmail(userEmailPayload);

            // Notify Admin
            const adminEmailPayload = {
              to: "roseindustry11@gmail.com",
              message: {
                subject: `Nuevo cliente suscrito al Plan ${plan.name.toUpperCase()}`,
                text: `Un nuevo cliente, ${this.userName}, se ha suscrito al plan ${plan.name.toUpperCase()}.`,
                html: `<p>Un nuevo cliente, ${this.userName}, se ha suscrito al plan ${plan.name.toUpperCase()}.</p>`,
              },
            };
            await this.sendNotificationEmail(adminEmailPayload);

            showToast("Suscripción asignada con éxito!", "success");
            // Reset selection after assigning the plan
            this.selectedPlan = null;
            // Redirect to Client Panel
            this.$router.push("/client-portal");
          } catch (error) {
            console.error("Error assigning plan:", error);
            alert("La asignación de la suscripción falló.");
          }
        } else {
          this.openPaymentModal(plan);
        }
      }
    },
    openPaymentModal(plan) {
      this.selectedPlan = plan;

      const paymentModal = Modal.getOrCreateInstance(
        document.getElementById("notifyPaymentModal")
      );
      paymentModal.show();
    },

    //File uploads
    async handleFileUpload(file) {
      if (!file) return;

      const result = await this.processFile(file);
      if (result) {
        this.paymentFile = file;
        this.paymentPreview = result;
      }
    },

    clearDateFilter() {
      this.filterDate = null;
    },

    async setExchange() {
      if (confirm("¿Desea asignar este nueva tasa de cambio a la app?")) {
        const creditRef = dbRef(db, `Exchange`);
        try {
          const value = {
            value: parseFloat(this.exchange),
          };
          await update(creditRef, value);

          showToast("Tasa actualizada!", "success");

          // Update UI
          await this.fetchCurrentExchange();
        } catch (error) {
          console.error("Error setting exchange value:", error);
          alert("No se pudo editar el valor.");
        }
      }
    },

    setActiveTab(type) {
      if (type) {
        this.activeTab = type;
      }
    },

    handleExchangeUpdated() {
      showToast("Tasa de cambio actualizada", "success");
      this.fetchCurrentExchange();
    },
    handlePlanAssigned() {
      this.fetchPlans();
      this.fetchUsers();
    },
    handlePageChange({ page, section }) {
      this.goToPage(page, section);
    },

    handleSearchChange({ query, type }) {
      this.searchQuery = query;
      this.activeTab = type;
    },
    handleDateFilterChange({ date, type }) {
      this.filterDate = date;
      this.activeTab = type;
    },

    selectClient(client) {
      this.selectedClient = client;
    },
    selectAffiliate(affiliate) {
      this.selectedAffiliate = affiliate;
    },

    async initializeAdminView() {
      this.activeTab = "clients";
      await Promise.all([
        this.fetchClients(),
        this.fetchAffiliates(),
        this.fetchPlans(),
        this.fetchAffiliatePlans()
      ]);
    },

    async initializeClientView() {
      this.activeTab = "clients";
      await this.fetchPlans();
    },

    async initializeAffiliateView() {
      this.activeTab = "affiliates";
      await this.fetchAffiliatePlans();
    },

    async handleQueryParams() {
      const clientSubscriptionId = this.$route.query.clientSubscriptionId;
      if (clientSubscriptionId && (this.role === "cliente" || this.role === "afiliado")) {
        this.currentSub = clientSubscriptionId;
      }
    }
  },
  async mounted() {

    try {
      const userStore = useUserStore();

      // Load user details
      this.role = userStore.role;
      this.userId = userStore.userId;
      this.userName = userStore.userName;
      this.userEmail = userStore.userEmail;

      await this.fetchCurrentExchange();
      this.fetchedExchange = this.exchange;

      switch (this.role) {
        case "admin":
          await this.initializeAdminView();
          break;
        case "cliente":
          await this.initializeClientView();
          break;
        case "afiliado":
          await this.initializeAffiliateView();
          break;
        default:
          console.warn("Unknown role:", this.role);
          break;
      }

      await this.handleQueryParams();
    } catch (err) {
      console.error("Error initializing component:", err);
    }
  },
};
</script>
<template>
  <!-- Page Header -->
  <PageHeader :isAdmin="this.role === 'admin' ? true : false" title="Suscripciones" icon="fa fa-handshake" :actions="[
    {
      icon: 'fa fa-money-bill-transfer',
      text: 'Tasa de cambio',
      class: 'btn-glass',
      modalToggle: 'modal',
      modalTarget: '#setExchange',
      onClick: () => { }
    }
  ]" />

  <div class="subscriptions-view">
    <!-- Admin View -->
    <AdminSubscriptionsView v-if="role === 'admin'" :loading="loading" :plans="plans" :affiliate-plans="affiliatePlans"
      :clients="clients" :affiliates="affiliates" :filtered-clients-subscriptions="filteredClientsSubscriptions"
      :all-filtered-clients-subscriptions="allFilteredClientsSubscriptions"
      :filtered-clients-no-subscriptions="filteredClientsNoSubscriptions"
      :all-filtered-clients-no-subscriptions="allFilteredClientsNoSubscriptions"
      :filtered-affiliates-subscriptions="filteredAffiliatesSubscriptions"
      :all-filtered-affiliates-subscriptions="allFilteredAffiliatesSubscriptions"
      :filtered-affiliates-no-subscriptions="filteredAffiliatesNoSubscriptions"
      :all-filtered-affiliates-no-subscriptions="allFilteredAffiliatesNoSubscriptions" :current-page="currentPage"
      @tab-changed="setActiveTab" @search-changed="handleSearchChange" @date-filter-changed="handleDateFilterChange"
      @date-filter-cleared="clearDateFilter" @page-changed="handlePageChange" @plans-updated="fetchPlans"
      @exchange-updated="handleExchangeUpdated" />

    <!-- Client/Affiliate View -->
    <UserSubscriptionsView v-else :loading="loadingPlans" :currentUserId="userId" :userName="userName || ''"
      :userEmail="userEmail || ''" :plans="sortedPlans" :current-sub="currentSub" :user-type="role || 'cliente'"
      :exchange="fetchedExchange" @contract-plan="contractPlan" />

  </div>

  <!-- Add this somewhere in your template -->
  <ExchangeRateModal @exchange-updated="fetchCurrentExchange" />
</template>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.header-title h4 {
  font-size: 1.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-actions {
  display: flex;
  gap: 1rem;
}

/* Glass effect button */
.btn-glass {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-glass:active {
  transform: translateY(0);
}

.exchange-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  margin-left: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .page-header {
    padding: 0.5rem 0;
  }

  .header-title h4 {
    font-size: 1.5rem;
  }

  .btn-glass {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}

/* Navigation Tabs */
.nav-tabs-wrapper {
  background-color: #2d2d2d;
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.nav-tabs {
  border: none;
  gap: 0.5rem;
}

.nav-tabs .nav-link {
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;
}

.nav-tabs .nav-link:hover {
  background-color: rgba(111, 66, 193, 0.1);
}

.nav-tabs .nav-link.active {
  background-color: #6f42c1;
  color: white;
  border: none;
}

/* Button Styles */
.btn-outline-theme,
.btn-theme {
  border-radius: 20px;
  font-size: 0.85rem;
  padding: 0.375rem 0.75rem;
  transition: all 0.2s ease;
}

.btn-outline-theme {
  border-color: purple;
  color: purple;
}

.btn-outline-theme:hover {
  background-color: purple;
  color: white;
  box-shadow: 0 2px 5px rgba(128, 0, 128, 0.3);
}

.btn-theme {
  background-color: purple;
  border-color: purple;
  color: white;
}

.btn-theme:hover {
  background-color: #8a2be2;
  border-color: #8a2be2;
  box-shadow: 0 2px 5px rgba(138, 43, 226, 0.3);
}

.btn-group .btn {
  flex: 1;
  font-size: 0.875rem;
  padding: 0.375rem 0.5rem;
}

/* Filter dropdown styling */
.dropdown-menu {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  padding: 8px 0;
}

.dropdown-header {
  color: #6c757d;
  font-weight: 600;
  padding: 8px 16px;
}

.dropdown-item {
  padding: 8px 16px;
  color: #495057;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background-color: #f8f0ff;
}

.dropdown-item:active {
  background-color: purple;
  color: white;
}

.dropdown-divider {
  margin: 4px 0;
}

/* Card Styles */
.card {
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
}

.card-header {
  background-color: rgba(111, 66, 193, 0.1);
  border-bottom: 1px solid #444;
}

/* Table Styles */
.table {
  color: #fff;
}

.table th {
  border-color: #444;
  background-color: #2d2d2d;
}

.table td {
  border-color: #444;
}

/* Form Controls */
.form-control,
.form-select {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.form-control:focus,
.form-select:focus {
  background-color: #2d2d2d;
  border-color: #6f42c1;
  color: #fff;
  box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

/* Pagination */
.pagination {
  gap: 0.25rem;
}

.page-link {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
}

.page-link:hover {
  background-color: #444;
  border-color: #666;
  color: #fff;
}

.page-item.active .page-link {
  background-color: #6f42c1;
  border-color: #6f42c1;
}

/* Subscription List Styles */
.subscriptions-wrapper {
  background: #29122f;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
}

.subscription-list {
  padding: 1rem;
}

.subscription-item {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.subscription-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #6f42c1;
}

.subscription-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.subscription-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.subscription-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(111, 66, 193, 0.1);
  border-radius: 12px;
  color: #6f42c1;
}

.subscription-title {
  display: flex;
  flex-direction: column;
}

.plan-name {
  color: #ffffff;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.plan-price {
  color: #6f42c1;
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.25rem;
}

.plan-price small {
  font-size: 0.875rem;
  color: #888;
  font-weight: normal;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.active {
  background: #198754;
  color: white;
}

.status-badge.popular {
  background: #6f42c1;
  color: white;
}

.subscription-body {
  margin-bottom: 1.5rem;
}

.features-list {
  color: #ffffff;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  padding: 0.5rem 0;
  display: flex;
  align-items: center;
}

.plan-features li::before {
  content: "•";
  color: #6f42c1;
  font-weight: bold;
  margin-right: 0.5rem;
}

.subscription-actions {
  display: flex;
  justify-content: flex-end;
}

.subscription-actions .btn {
  min-width: 180px;
}

@media (max-width: 768px) {
  .subscription-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .subscription-info {
    width: 100%;
  }

  .subscription-actions {
    width: 100%;
  }

  .subscription-actions .btn {
    width: 100%;
  }
}

.responsive-margin {
  margin-bottom: 1.5rem;
  /* Default margin for all screens */
}

@media (min-width: 768px) {
  .responsive-margin {
    margin-bottom: 1rem;
    /* 2rem = mb-4 in Bootstrap */
  }
}

@media (max-width: 767px) {
  .responsive-margin {
    margin-bottom: 0;
  }
}
</style>