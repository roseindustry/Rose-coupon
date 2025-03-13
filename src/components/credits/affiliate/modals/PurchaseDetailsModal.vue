<template>
  <div class="modal fade" id="purchaseDetailsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content bg-dark">
        <div class="modal-header border-secondary">
          <h5 class="modal-title text-light">Detalles de la Venta</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Purchase Summary -->
          <div class="card mb-4">
            <div class="card-header">
              <h6 class="text-black mb-0">
                <i class="fa-solid fa-user me-2"></i>
                Información del Cliente
              </h6>
            </div>
            <div class="card-body client-info">
              <div class="row g-3">
                <div class="col-md-6">
                  <p class="text-secondary mb-1">Nombre</p>
                  <h6 class="text-light">{{ sale.clientName }}</h6>
                </div>
                <div class="col-md-6">
                  <p class="text-secondary mb-1">Fecha de Compra</p>
                  <h6 class="text-light">{{ sale.purchaseDate }}</h6>
                </div>
                <div class="col-md-6">
                  <p class="text-secondary mb-1">Producto</p>
                  <h6 class="text-light">{{ sale.productName }}</h6>
                </div>
                <div class="col-md-6">
                  <p class="text-secondary mb-1">Estado</p>
                  <span :class="['badge', sale.paid ? 'text-success' : 'text-warning']">
                    {{ sale.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Details -->
          <div class="card mb-4">
            <div class="card-header">
                <h6 class="text-black mb-0">
                  <i class="fa-solid fa-credit-card me-2"></i>
                  Detalles del Pago
                </h6>
            </div>
            <div class="card-body payment-details">              
              <div class="row g-3">
                <div class="col-md-3">
                  <p class="text-secondary mb-1">Suscripción</p>
                  <h6 class="text-light">{{ (sale.clientSubscription?.name || 'NO DISPONIBLE').toUpperCase() }}</h6>
                </div>
                <div class="col-md-3">
                  <p class="text-secondary mb-1">Precio Total</p>
                  <h6 class="text-light">${{ Number(sale.productPrice).toFixed(2) }}</h6>
                </div>
                <div class="col-md-3">
                  <p class="text-secondary mb-1">Inicial</p>
                  <h6 class="text-light">${{ Number(sale.purchaseAmount).toFixed(2) }}</h6>
                </div>
                <div class="col-md-3">
                  <p class="text-secondary mb-1">Monto Financiado</p>
                  <h6 class="text-light">${{ Number(sale.loanAmount).toFixed(2) }}</h6>
                  <small class="text-secondary" v-if="sale.clientSubscription?.id">
                    Incremento de: ${{ getPurchaseIncrement(sale.clientSubscription.id) }} por suscripción
                  </small>
                  <small class="text-secondary" v-else>Sin incremento por suscripción</small>
                </div>                  
              </div>
            </div>
          </div>

          <!-- Installments Table -->
          <div class="card">
            <div class="card-header">
              <h6 class="text-black mb-0">
                <i class="fa-solid fa-calendar-days me-2"></i>
                Cuotas
              </h6>
            </div>
            <div class="card-body installments-table">              
              <div class="table-responsive">
                <table class="table table-dark table-hover mb-0">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(cuota, index) in sale.cuotas" :key="index">
                      <td>Cuota {{ index + 1 }}</td>
                      <td>{{ cuota.date }}</td>
                      <td>${{ Number(cuota.amount).toFixed(2) }}</td>
                      <td>
                        <span :class="['badge', cuota.paid ? 'text-success' : 'text-warning']">
                          {{ cuota.paid ? 'Pagada' : 'Pendiente' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'PurchaseDetailsModal',
  props: {
    sale: {
      type: Object,
      required: true
    },
    subscriptions: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      modal: null
    }
  },
  methods: {
    show() {
      this.modal = new Modal(document.getElementById('purchaseDetailsModal'))
      this.modal.show()
    },
    hide() {
      if (this.modal) {
        this.modal.hide()
        this.$emit('close')
      }
    },
    getPurchaseIncrement(subId) {      
      if (!subId) {
        return "0.00";
      }
      
      const subData = this.subscriptions.find(sub => sub.id === subId);
      if (!subData || !subData.order) {
        return "0.00";
      }
      
      try {
        const increment = this.getTierFee(subData.order);
        return Number(increment).toFixed(2);
      } catch (error) {
        console.warn('Error getting tier fee:', error);
        return "0.00";
      }
    },
    getTierFee(tier) {
      const tierNumber = Number(tier);
      
      switch(tierNumber) {
        case 1: return 0;
        case 2: return 3;
        case 3: return 1;
        case 4: return 0;
        default: return 0;
      }
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

.client-info, .payment-details, .installments-table {
  background-color: #29122f;
  border-radius: 10px;
  padding: 20px;
}

</style> 