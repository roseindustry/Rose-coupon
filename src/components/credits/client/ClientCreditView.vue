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
          <h4 class="mb-0 fw-500">Mi Crédito</h4>
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
        :purchases="currentClient?.credit?.mainPurchases"
        :filter-options="filterOptions"
        :sort-options="sortOptions"
        @filter-change="handleFilterChange"
        @sort-change="handleSortChange"
        @view-quotas="showQuotas"
      />

      <PayCuotaModal
        v-if="selectedPurchase"
        :purchase="selectedPurchase"
        :payment-methods="paymentMethods"
        @submit-payment="submitPayment"
      />
      
      <QuotasModal
        v-if="selectedPurchase"
        :purchase="selectedPurchase"
        ref="quotasModal"
        @pay-quota="payCuota"
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
    }
  },
  data() {
    return {
      loading: true,
      selectedPurchase: null,
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
      paymentMethods: [
        { id: 'transfer', name: 'Transferencia Bancaria' },
        { id: 'nequi', name: 'Nequi' },
        { id: 'daviplata', name: 'Daviplata' }
      ]
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
    payCuota(quotaData) {
      this.selectedPurchase = quotaData.purchase;
      this.$nextTick(() => {
        const modalElement = document.getElementById('payCuotaModal');
        if (modalElement) {
          const modal = new Modal(modalElement);
          modal.show();
        }
      });
    },
    submitPayment(paymentData) {
      this.$emit('submit-payment', paymentData)
    },
    handleFilterChange(filters) {
      // Implementation for filtering purchases
    },
    handleSortChange(sortOption) {
      // Implementation for sorting purchases
    },
  },
  async mounted() {
    await this.$nextTick();
    this.loading = false;
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
</style> 