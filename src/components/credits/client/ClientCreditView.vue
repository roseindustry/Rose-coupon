<template>
  <div class="container py-4">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-purple" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    <div v-else>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-0 fw-500 text-theme">
            <i class="fas fa-credit-card me-2"></i>
            Mi Crédito</h4>
          <small class="text-light">
            Nivel: {{ currentClient?.level?.name || 'Sin nivel' }} 
            ({{ currentClient?.points || 0 }} puntos)
          </small>
        </div>
        <button class="btn btn-sm btn-theme" @click="showPointsSystem">
          <i class="fa-solid fa-star me-1"></i>
          Mis Puntos
        </button>
      </div>

      <ClientCreditStats
        :main-credit="currentClient?.credit?.mainCredit"
        :available-credit="currentClient?.credit?.availableMainCredit"
        :plus-credit="currentClient?.credit?.plusCredit"
        :available-plus-credit="currentClient?.credit?.availablePlusCredit"
      />

      <ClientPurchaseHistory
        :purchases="paginatedPurchases"
        :affiliates="affiliates"
        :filter-options="filterOptions"
        :sort-options="sortOptions"
        :total-pages="totalPages"
        :current-page="currentPage"
        :date-filter="dateFilter"
        @filter-change="handleFilterChange"
        @sort-change="handleSortChange"
        @page-change="handlePageChange"
        @date-filter-change="handleDateFilterChange"
        @clear-filters="clearFilters"
        @view-quotas="showQuotas"
      />

      <!-- Modals -->
      <QuotasModal
        v-if="selectedPurchase"        
        :purchase="selectedPurchase"
        ref="quotasModal"
        @pay-quota="payCuota"
      />
      
      <PayCuotaModal
        v-if="selectedPurchase"
        ref="payCuotaModal"
        :purchase="selectedPurchase"
        :selected-cuota-id="selectedCuotaId"
        @payment-success="handlePaymentSuccess"
      />
      
      <PointsSystemModal
        :current-client="currentClient"
        :levels="levels"
      />
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase/init'
import { ref as dbRef } from 'firebase/database'
import { showToast } from '@/utils/toast'
import ClientCreditStats from './ClientCreditStats.vue'
import ClientPurchaseHistory from './ClientPurchaseHistory.vue'
import PayCuotaModal from './modals/PayCuotaModal.vue'
import PointsSystemModal from './modals/PointsSystemModal.vue'
import QuotasModal from './modals/QuotasModal.vue'
import { Modal } from 'bootstrap'

export default {
  name: 'ClientCreditView',
  components: {
    ClientCreditStats,
    ClientPurchaseHistory,
    PayCuotaModal,
    PointsSystemModal,
    QuotasModal
  },
  props: {
    currentClient: {
      type: Object,
      required: true,
      default: () => ({
        credit: {
          mainCredit: 0,
          availableMainCredit: 0,
          plusCredit: 0,
          availablePlusCredit: 0,
          mainPurchases: []
        },
        level: {
          name: '',
          minPoints: 0
        },
        points: 0
      })
    },
    levels: {
      type: Array,
      required: true,
      default: () => []
    },
    affiliates: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  data() {
    return {
      loading: true,
      selectedPurchase: null,
      selectedCuotaId: null,
      quotasModal: null,
      payCuotaModal: null,
      currentPage: 1,
      itemsPerPage: 5,
      dateFilter: {
        startDate: '',
        endDate: new Date().toISOString().split('T')[0]
      },
      filterOptions: {
        status: ['Todos', 'Pendiente', 'Pagado', 'Atrasado'],
        date: ['Último mes', 'Últimos 3 meses', 'Último año', 'Todos']
      },
      sortOptions: [
        { value: 'date-desc', label: 'Más recientes' },
        { value: 'date-asc', label: 'Más antiguos' },
        { value: 'amount-desc', label: 'Mayor monto' },
        { value: 'amount-asc', label: 'Menor monto' }
      ],
      activeFilters: {
        status: 'Todos',
        date: 'Todos'
      },
      activeSort: 'date-desc'
    }
  },
  computed: {
    filteredPurchases() {
      if (!this.currentClient?.credit?.mainPurchases) return [];
      
      let purchases = [...this.currentClient.credit.mainPurchases];

      // Apply date filter
      if (this.dateFilter.startDate && this.dateFilter.endDate) {
        purchases = purchases.filter(purchase => {
          const purchaseDate = new Date(purchase.purchaseDate);
          const startDate = new Date(this.dateFilter.startDate);
          const endDate = new Date(this.dateFilter.endDate);
          return purchaseDate >= startDate && purchaseDate <= endDate;
        });
      }

      // Apply status filter
      if (this.activeFilters.status !== 'Todos') {
        purchases = purchases.filter(purchase => {
          const isPaid = purchase.cuotas?.every(cuota => cuota.paid);
          switch (this.activeFilters.status) {
            case 'Pagado':
              return isPaid;
            case 'Pendiente':
              return !isPaid;
            case 'Atrasado':
              return purchase.cuotas?.some(cuota => 
                !cuota.paid && new Date(cuota.date) < new Date()
              );
            default:
              return true;
          }
        });
      }

      // Apply sorting
      purchases.sort((a, b) => {
        switch (this.activeSort) {
          case 'date-desc':
            return new Date(b.purchaseDate) - new Date(a.purchaseDate);
          case 'date-asc':
            return new Date(a.purchaseDate) - new Date(b.purchaseDate);
          case 'amount-desc':
            return b.productPrice - a.productPrice;
          case 'amount-asc':
            return a.productPrice - b.productPrice;
          default:
            return 0;
        }
      });

      return purchases;
    },
    totalPages() {
      return Math.ceil(this.filteredPurchases.length / this.itemsPerPage);
    },
    paginatedPurchases() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredPurchases.slice(start, end);
    }
  },
  methods: {
    showPointsSystem() {
      this.$nextTick(() => {
        const modalElement = document.getElementById('pointsSystemModal');
        if (modalElement) {
          const modal = new Modal(modalElement);
          modal.show();
        }
      })
    },
    showQuotas(purchase) {
      this.selectedPurchase = purchase;
      this.$nextTick(() => {
        if (this.$refs.quotasModal) {
          this.$refs.quotasModal.show();
        } else {
          console.warn('QuotasModal ref not found');
        }
      });
    },
    hideQuotasModal() {
      if (this.$refs.quotasModal) {
        this.$refs.quotasModal.hide();
      }
    },
    payCuota(quotaData) {
      this.selectedPurchase = quotaData.purchase;
      this.selectedCuotaId = quotaData.cuotaId;
      this.$nextTick(() => {
        // Hide quotas modal first
        this.hideQuotasModal();
        
        // Then show payment modal
        if (this.$refs.payCuotaModal) {
          this.$refs.payCuotaModal.show();
        }
      });
    },
    handlePaymentSuccess() {
      // Show quotas modal again to reflect changes
      this.$nextTick(() => {
        this.showQuotas(this.selectedPurchase);
      });
    },
    handleFilterChange(filters) {
      this.activeFilters = { ...filters };
      this.currentPage = 1; // Reset to first page when filter changes
    },
    handleSortChange(sortOption) {
      this.activeSort = sortOption;
      this.currentPage = 1; // Reset to first page when sort changes
    },
    handlePageChange(page) {
      this.currentPage = page;
    },
    handleDateFilterChange(dates) {
      this.dateFilter = { ...dates };
      this.currentPage = 1; // Reset to first page when date filter changes
    },
    clearFilters() {
      // Reset all filters to default values
      this.activeFilters = {
        status: 'Todos',
        date: 'Todos'
      };
      this.activeSort = 'date-desc';
      this.currentPage = 1;
      
      // Reset date filter to show all dates
      const today = new Date();
      this.dateFilter = {
        startDate: '',
        endDate: today.toISOString().split('T')[0]
      };
    },
    setDefaultDateFilter() {
      const today = new Date();
      
      this.dateFilter = {
        startDate: '',
        endDate: today.toISOString().split('T')[0]
      };
    }
  },
  async mounted() {
    await this.$nextTick();
    this.loading = false;
    this.setDefaultDateFilter();
  },
  watch: {
    currentClient: {
      immediate: true,
      handler(newValue) {
        if (newValue?.credit?.mainPurchases) {
          newValue.credit.mainPurchases.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
          );
        }
      }
    }
  }
}
</script>

<style scoped>
h4 {
  color: #fff;
}

.btn-theme {
  background-color: #6f42c1;
  border-color: #6f42c1;
  color: white;
}

.text-theme {
  color: #6f42c1;
}
</style> 