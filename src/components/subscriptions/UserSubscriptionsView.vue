<template>
  <div class="user-view">
    <div class="container">
      <div class="subscriptions-wrapper">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span class="ms-2">Cargando planes...</span>
        </div>

        <!-- Subscription List -->
        <div v-else class="subscription-list">
          <div class="subscription-item" v-for="(plan, index) in sortedPlans" :key="plan.id">
            <div class="subscription-header">
              <div class="subscription-info">
                <div class="subscription-icon">
                  <i class="fa-2x" :class="plan.icon"></i>
                </div>
                <div class="subscription-title">
                  <h4 class="plan-name">{{ plan.name.toUpperCase() }}</h4>
                  <span class="plan-price">
                    <template v-if="isAffiliate && plan.price === 0">
                      Precio a consultar
                    </template>
                    <template v-else>
                      ${{ plan.isYearly ? plan.yearlyPrice : plan.price }} <small>{{ plan.isYearly ? 'Anual' : 'Mensual' }}</small>
                    </template>
                  </span>
                </div>
              </div>
              <div class="subscription-status d-flex align-items-center gap-2">
                <span v-if="plan.id === currentSub" class="status-badge active me-2">
                  Suscripción actual
                </span>
                <span v-if="plan.isPopular" class="status-badge popular">
                  <i class="fa-solid fa-star me-1"></i>Popular
                </span>
              </div>
            </div>

            <div class="subscription-body">
              <div class="features-list">
                <ul class="plan-features" v-html="formattedDesc[index].desc"></ul>
              </div>
            </div>

            <div class="subscription-actions">
              <div v-if="currentSub && hasapplicablePurchase" class="subscription-info-alert">
                <div class="alert alert-warning d-flex align-items-center p-2 mt-2">
                  <i class="fas fa-exclamation-triangle me-2 text-warning"></i>
                  <div class="d-flex flex-column align-items-start w-100">
                    <div class="mb-1 me-sm-2">
                      <small class="d-block fw-bold text-warning">Cambio de Plan Restringido</small>
                      <small class="text-black">Usted tiene una compra a credito activa. Debe completarla antes de poder cambiar su suscripcion. Contacte a soporte si el cambio de suscripcion es necesario.</small>
                    </div>
                  </div>
                </div>
              </div>
              <button v-else class="btn btn-theme" @click="handleContractPlan(plan)">
                <i class="fas fa-check-circle me-2"></i>
                {{ isAffiliate ? 'Contratar Plan' : 'Seleccionar Plan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <NotifyPaymentModal :selected-plan="selectedPlan" :exchange="exchange" :role="userType"
      @submit-payment="handlePaymentSubmit" @file-upload="handleFileUpload" />
  </div>
</template>

<script>
import NotifyPaymentModal from './userModals/NotifyPaymentModal.vue';
import { db } from "@/firebase/init";
import { ref as dbRef, get } from "firebase/database";

export default {
  name: "UserSubscriptionsView",
  components: {
    NotifyPaymentModal
  },
  emits: ['contract-plan', 'payment-submitted', 'file-uploaded'],
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    plans: {
      type: Array,
      default: () => []
    },
    currentUserId: {
      type: String,
      required: true,
      validator: (value) => value && value.trim() !== ''
    },
    currentSub: {
      type: String,
      default: null
    },
    userType: {
      type: String,
      default: 'cliente',
      validator: (value) => ['cliente', 'afiliado'].includes(value)
    },
    exchange: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      selectedPlan: null,
      hasapplicablePurchase: false,
      purchasesLoading: true,
      loadingError: null
    }
  },
  watch: {
    // Watch for changes in currentUserId to reload purchases
    currentUserId: {
      immediate: true,
      handler(newUserId) {
        if (newUserId) {
          this.loadUserPurchases();
        }
      }
    }
  },
  methods: {
    async loadUserPurchases() {
      // Validate user ID before attempting to load
      if (!this.currentUserId) {
        console.warn('No user ID provided for loading purchases');
        this.hasapplicablePurchase = false;
        this.purchasesLoading = false;
        return;
      }

      try {
        // Reset flags before checking
        this.hasapplicablePurchase = false;
        this.loadingError = null;
        this.purchasesLoading = true;

        // Check credit purchase payments for the current month
        const purchasesRef = dbRef(db, `Users/${this.currentUserId}/credit/main/purchases`);
        const purchasesSnapshot = await get(purchasesRef);

        if (purchasesSnapshot.exists()) {
          const purchases = purchasesSnapshot.val();

          // Find first applicable ongoing purchase
          const applicablePurchase = Object.values(purchases).find(purchase => {
            // Check if purchase is ongoing (not all cuotas are paid)
            const isPurchaseOngoing = purchase.cuotas && 
              Object.values(purchase.cuotas).some(cuota => !cuota.paid);

            // Check for purchases with subscription maintenance add-on
            return purchase.includeCuotaAddOn && isPurchaseOngoing;
          });

          // Set flag based on finding an applicable purchase
          this.hasapplicablePurchase = !!applicablePurchase;
        } else {
          // No purchases found
          this.hasapplicablePurchase = false;
        }
      } catch (error) {
        console.error('Error loading user purchases:', error);
        this.hasapplicablePurchase = false;
        this.loadingError = error;
      } finally {
        this.purchasesLoading = false;
      }
    },
    handleContractPlan(plan) {
      this.selectedPlan = plan;
      this.$emit('contract-plan', plan);
    },
    handlePaymentSubmit(paymentData) {
      this.$emit('payment-submitted', paymentData);
    },
    handleFileUpload(fileData) {
      this.$emit('file-uploaded', fileData);
    }
  },
  computed: {
    isAffiliate() {
      return this.userType === 'afiliado';
    },
    sortedPlans() {
      if (!this.plans) return [];
      return [...this.plans].sort((a, b) => a.order - b.order).filter((plan) => plan.isHidden !== true);
    },
    formattedDesc() {
      return this.sortedPlans.map((plan) => ({
        ...plan,
        desc: plan.desc
          ?.split(".")
          .filter((sentence) => sentence?.trim())
          .map((sentence) => `<li>${sentence.trim()}</li>`)
          .join("") || "",
      }));
    }
  }
};
</script>

<style scoped>
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
  background-color: #6f42c1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  padding: 0.15rem 0.35rem;
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

.btn-theme {
  background-color: #6f42c1;
  border-color: #6f42c1;
  color: white;
  padding: 0.375rem 0.75rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-theme:hover {
  background-color: #5a32a3;
  border-color: #5a32a3;
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
</style>