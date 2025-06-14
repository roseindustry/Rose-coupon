<!-- Admin View -->
<template>
  <div class="admin-view">
    <!-- Header Section -->
    <div class="d-flex justify-content-end align-items-center mb-2">
      <div class="subscription-filters mt-3 mt-md-0">
        <CustomNav :actions="[
          {
            text: 'Clientes',
            icon: 'fa-users',
            isActive: activeTab === 'clients',
            onClick: () => setActiveTab('clients')
          },
          {
            text: 'Comercios',
            icon: 'fa-store',
            isActive: activeTab === 'affiliates',
            onClick: () => setActiveTab('affiliates')
          }
        ]" />
      </div>
    </div>

    <!-- Toggles Bar -->
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 gap-md-0 mb-2">
      <!-- User type Filters -->
      <div class="subscription-filters w-100">
        <CustomNav :actions="[
          {
            text: 'Con Suscripción',
            icon: 'fa-solid fa-check-circle',
            isActive: subscriptionFilter === 'with',
            onClick: () => subscriptionFilter = 'with',
            badge: activeTab === 'clients'
              ? allFilteredClientsSubscriptions.length
              : (subscriptionFilter === 'with'
                ? totalAffiliatesWithSubscriptions
                : allFilteredAffiliatesNoSubscriptions.length)
          },
          {
            text: 'Sin Suscripción',
            icon: 'fa-solid fa-times-circle',
            isActive: subscriptionFilter === 'without',
            onClick: () => subscriptionFilter = 'without',
            badge: activeTab === 'clients'
              ? allFilteredClientsNoSubscriptions.length
              : allFilteredAffiliatesNoSubscriptions.length
          },
          {
            text: 'Ver planes',
            icon: 'fa-solid fa-list',
            onClick: () => openAssignModal(),
            class: 'nav-btn-secondary'
          }
        ]" />
      </div>
    </div>

    <!-- Search and Filter Section -->
    <div class="card custom-card filter-card mb-2 py-2 px-2">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-12 mb-3">
            <SearchCard title="Buscar cliente" v-model="searchQuery"
              :placeholder="`Filtrar ${activeTab === 'clients' ? 'cliente' : 'comercio'} por Nombre o ${activeTab === 'clients' ? 'Cédula' : 'RIF'}...`" />
          </div>
          <div class="col-md-4">
            <h6 class="card-subtitle mb-3 text-white">
              <i class="fa-solid fa-calendar me-2"></i>Filtrar por fecha
            </h6>
            <div class="d-flex gap-2">
              <input type="date" v-model="filterDate" class="date-input form-control" />
              <button class="btn" @click="clearDateFilter" :disabled="!filterDate">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div v-if="activeTab === 'clients'" class="col-md-4">
            <h6 class="card-subtitle mb-3 text-white">
              <i class="fa-solid fa-user-check me-2"></i>Status
            </h6>
            <CustomSelect v-model="statusFilter" :options="[
              {
                text: 'Todos',
                value: 'all'
              },
              {
                text: 'Verificados',
                value: 'verified'
              },
              {
                text: 'No verificados',
                value: 'unverified'
              }
            ]" />
          </div>
          <div v-if="subscriptionFilter === 'with'" class="col-md-4">
            <h6 class="card-subtitle mb-3 text-white">
              <i class="fa-solid fa-tag me-2"></i>Plan
            </h6>
            <CustomSelect 
              v-model="planFilter" 
              :options="[
                { text: 'Todos', value: 'all' },
                ...currentPlans.map(plan => ({
                  text: plan.name.charAt(0).toUpperCase() + plan.name.slice(1),
                  value: plan.name
                }))
              ]"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div class="card custom-card mb-2">
      <div class="card-body">
        <!-- Results Info -->
        <div class="results-info text-center mb-3" v-if="!loading">
          <p v-if="activeTab === 'clients'">
            Mostrando {{ filteredClients.length }} resultados de {{ totalFilteredResults }}
            <!-- {{ planFilter === 'all' ? '526' : planFilter === 'gratis' ? '341' : planFilter === 'bronce' ? '125' : planFilter === 'plata' ? '45' : planFilter === 'oro' ? '15' : '0' }} -->
            <template v-if="statusFilter !== 'all' || planFilter !== 'all'">
              <span v-if="statusFilter !== 'all'" class="text-theme">
                ({{
                  statusFilter === "verified"
                    ? "Verificados"
                    : "No Verificados"
                }})
              </span>
              <span v-if="planFilter !== 'all'" class="text-theme">
                {{ statusFilter !== "all" ? " - " : "(" }}Plan: {{ planFilter
                }}{{ statusFilter !== "all" ? "" : ")" }}
              </span>
            </template>
          </p>
          <p v-else>
            Mostrando {{ filteredAffiliates.length }} resultados de
            {{ totalFilteredResults }}
            <span v-if="planFilter !== 'all'" class="text-theme">
              (Plan: {{ planFilter }})
            </span>
          </p>
        </div>

        <!-- Loading Spinner -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-theme" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <!-- Clients Tables -->
        <div v-if="activeTab === 'clients'" class="table-responsive">
          <!-- Clients With Subscriptions -->
          <table v-if="subscriptionFilter === 'with'" class="table text-center align-middle">
            <thead>
              <tr>
                <th style="width: 10%">Status</th>
                <th style="width: 25%">Cliente</th>
                <th style="width: 30%">Email</th>
                <th style="width: 20%">Cédula</th>
                <th style="width: 15%">Suscripción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in filteredClients" :key="client.id">
                <td :class="{
                  'text-success': client.isVerified,
                  'text-danger': !client.isVerified,
                }">
                  <i :class="client.isVerified
                    ? 'fa-solid fa-user-check'
                    : 'fa-solid fa-user-times'
                    "></i>
                </td>
                <td class="text-truncate" style="max-width: 200px">
                  {{ client.firstName + " " + client.lastName }}
                </td>
                <td class="text-truncate" style="max-width: 200px">
                  {{ client.email }}
                </td>
                <td>{{ client.identification }}</td>
                <td>
                  <span class="badge bg-success">
                    {{
                      client.subscriptionName?.charAt(0).toUpperCase() +
                      client.subscriptionName?.slice(1)
                    }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Clients Without Subscriptions -->
          <table v-else class="table text-center align-middle">
            <thead>
              <tr>
                <th style="width: 10%">Status</th>
                <th style="width: 25%">Cliente</th>
                <th style="width: 30%">Email</th>
                <th style="width: 20%">Cédula</th>
                <th style="width: 15%">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in filteredClients" :key="client.id">
                <td :class="{
                  'text-success': client.isVerified,
                  'text-danger': !client.isVerified,
                }">
                  <i :class="client.isVerified
                    ? 'fa-solid fa-user-check'
                    : 'fa-solid fa-user-times'
                    "></i>
                </td>
                <td class="text-truncate" style="max-width: 200px">
                  {{ client.firstName + " " + client.lastName }}
                </td>
                <td class="text-truncate" style="max-width: 200px">
                  {{ client.email }}
                </td>
                <td>{{ client.identification }}</td>
                <td>
                  <button class="btn btn-sm btn-assign" @click="openAssignModal(client)">
                    <i class="fa-solid fa-plus me-1"></i>Asignar Plan
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Affiliates Tables -->
        <div v-else class="table-responsive">
          <!-- Affiliates With Subscriptions -->
          <table v-if="subscriptionFilter === 'with'" class="table text-center align-middle">
            <thead>
              <tr>
                <th style="width: 35%">Comercio</th>
                <th style="width: 30%">Email</th>
                <th style="width: 20%">RIF</th>
                <th style="width: 15%">Suscripción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="affiliate in filteredAffiliates" :key="affiliate.id">
                <td class="text-truncate" style="max-width: 200px">
                  {{ affiliate.companyName }}
                </td>
                <td class="text-truncate" style="max-width: 200px">
                  {{ affiliate.email }}
                </td>
                <td>{{ affiliate.rif }}</td>
                <td>
                  <span class="badge bg-success">
                    {{
                      affiliate.subscriptionName?.charAt(0).toUpperCase() +
                      affiliate.subscriptionName?.slice(1)
                    }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Affiliates Without Subscriptions -->
          <table v-else class="table text-center align-middle">
            <thead>
              <tr>
                <th style="width: 35%">Comercio</th>
                <th style="width: 30%">Email</th>
                <th style="width: 20%">RIF</th>
                <th style="width: 15%">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="affiliate in filteredAffiliates" :key="affiliate.id">
                <td class="text-truncate" style="max-width: 200px">
                  {{ affiliate.companyName }}
                </td>
                <td class="text-truncate" style="max-width: 200px">
                  {{ affiliate.email }}
                </td>
                <td>{{ affiliate.rif }}</td>
                <td>
                  <button class="btn btn-sm btn-assign" @click="openAssignModal(affiliate)">
                    <i class="fa-solid fa-plus me-1"></i>Asignar Plan
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <nav class="pagination-controls mt-4" v-if="totalPages(getCurrentSection()) > 1" aria-label="Page navigation">
          <ul class="pagination justify-content-center flex-wrap">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="goToPage(currentPage - 1, getCurrentSection())"
                :disabled="currentPage === 1">
                Anterior
              </button>
            </li>
            <li v-for="page in visiblePages(getCurrentSection())" :key="page" class="page-item"
              :class="{ active: page === currentPage }">
              <button class="page-link" @click="goToPage(page, getCurrentSection())">
                {{ page }}
              </button>
            </li>
            <li class="page-item" :class="{
              disabled: currentPage === totalPages(getCurrentSection()),
            }">
              <button class="page-link" @click="goToPage(currentPage + 1, getCurrentSection())"
                :disabled="currentPage === totalPages(getCurrentSection())">
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Modals -->
    <AssignSubscriptionModal ref="assignModal" :active-tab="activeTab" :plans="plans" :affiliate-plans="affiliatePlans"
      :clients="clients" :affiliates="affiliates" :selected-client="selectedClient"
      :selected-affiliate="selectedAffiliate" @plan-assigned="handlePlanAssigned" @plan-updated="$emit('plans-updated')"
      @plan-deleted="$emit('plans-updated')" />
  </div>
</template>

<script>
import AssignSubscriptionModal from "./modals/AssignSubscriptionModal.vue";
import CustomNav from '@/components/app/CustomNav.vue';
import CustomSelect from '@/components/app/CustomSelect.vue';
import SearchCard from "@/components/app/SearchCard.vue";
import { Modal } from "bootstrap";

export default {
  name: "AdminSubscriptionsView",
  components: {
    AssignSubscriptionModal,
    CustomNav,
    CustomSelect,
    SearchCard
  },
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    filteredClientsSubscriptions: {
      type: Array,
      default: () => [],
    },
    allFilteredClientsSubscriptions: {
      type: Array,
      default: () => [],
    },
    filteredClientsNoSubscriptions: {
      type: Array,
      default: () => [],
    },
    allFilteredClientsNoSubscriptions: {
      type: Array,
      default: () => [],
    },
    filteredAffiliatesSubscriptions: {
      type: Array,
      default: () => [],
    },
    allFilteredAffiliatesSubscriptions: {
      type: Array,
      default: () => [],
    },
    filteredAffiliatesNoSubscriptions: {
      type: Array,
      default: () => [],
    },
    allFilteredAffiliatesNoSubscriptions: {
      type: Array,
      default: () => [],
    },
    currentPage: {
      type: Number,
      default: 1,
    },
    plans: {
      type: Array,
      required: true,
    },
    affiliatePlans: {
      type: Array,
      required: true,
    },
    clients: {
      type: Array,
      required: true,
    },
    affiliates: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      activeTab: "clients",
      subscriptionFilter: "with",
      searchQuery: "",
      filterDate: null,
      selectedClient: null,
      selectedAffiliate: null,
      statusFilter: "all",
      planFilter: "all",
      totalResults: 0,
    };
  },
  computed: {
    filteredClients() {
      // Get initial dataset based on subscription status
      let clients =
        this.subscriptionFilter === "with"
          ? this.allFilteredClientsSubscriptions
          : this.allFilteredClientsNoSubscriptions;

      // Apply status filter
      if (this.statusFilter !== "all") {
        clients = clients.filter((client) =>
          this.statusFilter === "verified"
            ? client.isVerified
            : !client.isVerified
        );
      }

      // Apply plan filter (only for clients with subscriptions)
      if (this.subscriptionFilter === "with" && this.planFilter !== "all") {
        clients = clients.filter(
          (client) => client.subscriptionName === this.planFilter
        );
      }

      // Store total count before pagination
      this.totalResults = clients.length;

      // Return paginated results
      const startIndex = (this.currentPage - 1) * 10;
      return clients.slice(startIndex, startIndex + 10);
    },
    totalFilteredResults() {
      return this.totalResults;
    },
    currentPlans() {
      return this.activeTab === "clients" ? this.plans : this.affiliatePlans;
    },
    filteredAffiliates() {
      // Get initial dataset
      let affiliates =
        this.subscriptionFilter === "with"
          ? this.allFilteredAffiliatesSubscriptions
          : this.allFilteredAffiliatesNoSubscriptions;

      // Apply plan filter if needed
      if (this.subscriptionFilter === "with" && this.planFilter !== "all") {
        affiliates = affiliates.filter(
          (affiliate) => affiliate.subscriptionName === this.planFilter
        );
      }

      // Store total before pagination
      this.totalResults = affiliates.length;

      // Return paginated results
      const startIndex = (this.currentPage - 1) * 10;
      return affiliates.slice(startIndex, startIndex + 10);
    },
    totalAffiliatesWithSubscriptions() {
      // Always show total affiliates with subscriptions in badge
      return this.allFilteredAffiliatesSubscriptions.length;
    },
  },
  methods: {
    setActiveTab(tab) {
      this.activeTab = tab;
      // Reset all filters and counts when changing tabs
      this.searchQuery = "";
      this.filterDate = null;
      this.statusFilter = "all";
      this.planFilter = "all";
      this.totalResults = 0;
      this.$emit("tab-changed", tab);
    },
    clearDateFilter() {
      this.filterDate = null;
      this.$emit("date-filter-cleared");
    },
    goToPage(page, section) {
      this.$emit("page-changed", { page, section });
    },
    totalPages(section) {
      if (this.activeTab === "clients") {
        return Math.ceil(this.totalFilteredResults / 10);
      }

      // For affiliates, use the filtered total
      return Math.ceil(this.totalFilteredResults / 10);
    },
    visiblePages(section) {
      const total = this.totalPages(section);
      const current = this.currentPage;
      const delta = 2;

      let start = Math.max(1, current - delta);
      let end = Math.min(total, current + delta);

      if (start === 1) {
        end = Math.min(total, 5);
      }
      if (end === total) {
        start = Math.max(1, total - 4);
      }

      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    },
    openAssignModal(user = null) {
      if (this.activeTab === "clients") {
        this.selectedClient = user;
        this.selectedAffiliate = null;
      } else {
        this.selectedAffiliate = user;
        this.selectedClient = null;
      }

      const modal = new Modal(document.getElementById("assignModal"));
      modal.show();
    },
    handlePlanAssigned() {
      this.$emit("plans-updated");
    },
    handleExchangeUpdated() {
      this.$emit("exchange-updated");
    },
    getCurrentSection() {
      if (this.activeTab === "clients") {
        return this.subscriptionFilter === "with"
          ? "clientSubscriptions"
          : "clientNoSubscriptions";
      } else {
        return this.subscriptionFilter === "with"
          ? "affiliateSubscriptions"
          : "affiliateNoSubscriptions";
      }
    },
    clearFilters() {
      this.searchQuery = "";
      this.filterDate = null;
      this.statusFilter = "all";
      this.planFilter = "all";
      this.totalResults = 0;
    },
  },
  watch: {
    searchQuery(newVal) {
      this.$emit("search-changed", {
        query: newVal,
        type: this.activeTab,
      });
    },
    filterDate(newVal) {
      this.$emit("date-filter-changed", {
        date: newVal,
        type: this.activeTab,
      });
    },
    statusFilter(newVal) {
      this.$emit("status-filter-changed", newVal);
    },
    planFilter() {
      // Reset to first page when filter changes
      this.$emit("page-changed", {
        page: 1,
        section: this.getCurrentSection(),
      });
    },
    subscriptionFilter() {
      // Reset filters and page when switching subscription type
      this.statusFilter = "all";
      this.planFilter = "all";
      this.totalResults = 0;
      this.$emit("page-changed", {
        page: 1,
        section: this.getCurrentSection(),
      });
    },
  },
};
</script>
<style scoped>
.text-theme {
  color: #6f42c1;
}

.bg-theme {
  background-color: #6f42c1;
  color: white;
}

.btn-theme {
  background-color: #6f42c1;
  border-color: #6f42c1;
  color: white;
}

.btn-assign {
  background-color: #2d2d2d;
  border: 1px solid #6f42c1;
  color: #6f42c1;
  border-radius: 20px;
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  transition: all 0.2s ease;
}

.btn-assign:hover {
  background-color: #6f42c1;
  color: white;
  box-shadow: 0 2px 4px rgba(111, 66, 193, 0.2);
}

.btn-assign i {
  font-size: 0.7rem;
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

.toggle-card,
.filter-card {
  background: transparent;
}

.custom-card {
  border: none;
  border-radius: 15px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}

.subscription-filters {
  padding: 0;
  border-radius: 12px;
  background: transparent;
}

.subscription-filters :deep(.custom-nav) {
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  display: flex;
  gap: 0.5rem;
}

.subscription-filters :deep(.nav-btn) {
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
}

.subscription-filters :deep(.nav-btn-secondary) {
  flex: 0 0 auto;
  background: transparent;
  /* border: 1px solid #6f42c1;
  color: #6f42c1; */
}

.subscription-filters :deep(.nav-btn:hover) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: translateY(-1px);
}

.subscription-filters :deep(.nav-btn-secondary:hover) {
  background: #29122f;
  color: #fff;
}

.subscription-filters :deep(.nav-btn.active) {
  background: #29122f;
  color: #fff;
  border-color: #29122f;
}

.subscription-filters :deep(.nav-btn .badge) {
  position: static;
  margin-left: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.subscription-filters :deep(.nav-btn.active .badge) {
  background: rgba(255, 255, 255, 0.2);
}

.table {
  color: #fff;
}

.table thead th {
  border-color: #444;
}

.table td {
  border-color: #444;
  vertical-align: middle;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
}

.pagination .page-link {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.pagination .page-link:hover {
  background-color: #444;
  border-color: #6f42c1;
}

.pagination .page-item.active .page-link {
  background-color: #6f42c1;
  border-color: #6f42c1;
}

.pagination .page-item.disabled .page-link {
  background-color: #2d2d2d;
  border-color: #444;
  color: #666;
}
.date-input, .nav-btn {
  padding: 0.75rem 1rem;
}
.form-select, .date-input {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.form-select:focus {
  background-color: #2d2d2d;
  border-color: #6f42c1;
  color: #fff;
  box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

.form-select option {
  background-color: #2d2d2d;
  color: #fff;
}

.table-responsive {
  margin-bottom: 1rem;
  -webkit-overflow-scrolling: touch;
}

.table {
  margin-bottom: 0;
  white-space: nowrap;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .subscription-filters {
    width: 100%;
  }

  .subscription-filters :deep(.custom-nav) {
    padding: 0.75rem 1rem;
    flex-direction: column;
  }

  .subscription-filters :deep(.nav-btn) {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    width: 100%;
  }

  .subscription-filters :deep(.nav-btn-secondary) {
    width: 100%;
    margin-top: 0.5rem;
  }

  .subscription-filters :deep(.nav-btn .badge) {
    font-size: 0.75rem;
    padding: 0.15rem 0.35rem;
  }
}

@media (max-width: 575.98px) {
  .btn-group {
    display: flex;
  }

  .btn-group .btn {
    flex: 1;
  }

  .btn-mobile-sm {
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.25em 0.5em;
  }
}

@media (min-width: 576px) {
  .w-sm-auto {
    width: auto !important;
  }

  .gap-sm-0 {
    gap: 0 !important;
  }
}

/* Keep original styles for larger screens */
@media (min-width: 769px) {
  .card-body {
    padding: 0;
  }

  .subscription-filters {
    padding: 0.5rem;
  }

  .badge {
    font-size: 0.875rem;
    padding: 0.35em 0.65em;
  }
}

/* Improve button group spacing */
.btn-group {
  gap: 1px;
}

.btn-group .btn {
  position: relative;
  transition: all 0.2s ease;
}

/* Improve filter section layout */
.subscription-filters {
  border-radius: 8px;
}

@media (min-width: 768px) {
  .subscription-filters {
    min-width: 200px;
  }
}
</style>
