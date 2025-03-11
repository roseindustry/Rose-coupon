<template>
  <div class="card">
    <div class="card-header text-center">
      <h5 class="text-black">Mis Compras</h5>
    </div>
    <div class="card-body">
      <div v-if="purchases && purchases.length" class="row g-4">
        <div v-for="purchase in purchases" :key="purchase.id" class="col-12">
          <div class="card bg-dark">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 class="text-light mb-1">{{ purchase.productName }}</h6>
                  <small class="text-secondary">{{ formatDate(purchase.purchaseDate) }}</small>
                </div>
                <span :class="getStatusClass(purchase)" class="badge">
                  {{ purchase.cuotas?.every(cuota => cuota.paid) ? 'Completado' : 'Pendiente' }}
                </span>
              </div>
              
              <div class="row g-3 mb-3">
                <div class="col-6 col-md-3">
                  <small class="text-secondary d-block">Precio Total</small>
                  <span class="text-light">${{ purchase.productPrice.toLocaleString() }}</span>
                </div>
                <div class="col-6 col-md-3">
                  <small class="text-secondary d-block">Cuota Inicial</small>
                  <span class="text-light">${{ purchase.purchaseAmount.toLocaleString() }}</span>
                </div>
                <div class="col-6 col-md-3">
                  <small class="text-secondary d-block">Monto Préstamo</small>
                  <span class="text-light">${{ purchase.loanAmount.toLocaleString() }}</span>
                </div>
                <div class="col-6 col-md-3">
                  <small class="text-secondary d-block">Monto Restante</small>
                  <span class="text-light">${{ purchase.remainingAmount.toLocaleString() }}</span>
                </div>
              </div>
              
              <button 
                class="btn btn-sm btn-theme"
                @click="$emit('view-quotas', purchase)"
                :disabled="purchase.paid">
                Ver Cuotas
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-4">
        <p class="text-light mb-0">No hay compras registradas</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ClientPurchaseHistory',
  props: {
    purchases: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  methods: {
    formatDate(date) {
      return new Date(date).toLocaleDateString();
    },
    getStatusClass(purchase) {
      const allPaid = purchase.cuotas?.every(cuota => cuota.paid) ?? false;
      return {
        'text-success': allPaid,
        'text-warning': !allPaid
      };
    }
  }
}
</script>

<style scoped>
.badge {
  padding: 0.5em 1em;
  border: 1px solid;
  background-color: transparent !important;
}

.text-success {
  color: #198754;
  border-color: #198754;
}

.text-warning {
  color: #ffc107;
  border-color: #ffc107;
}

.bg-dark {
  background-color: #363636 !important;
}
</style> 