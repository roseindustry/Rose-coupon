<template>
  <div class="modal fade" id="quotasModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content bg-dark">
        <div class="modal-header border-secondary">
          <h5 class="modal-title text-light">Cuotas - {{ purchase?.productName }}</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="table-responsive">
            <table class="table table-dark table-hover">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(cuota, index) in purchase.cuotas" :key="index">
                  <td>{{ formatDate(new Date(cuota.date)) }}</td>
                  <td>${{ Number(purchase.loanAmount / purchase.terms).toFixed(2) }}</td>
                  <td>
                    <span class="badge" :class="cuota.paid ? 'badge-success' : 'badge-warning'">
                      {{ cuota.paid ? 'Pagado' : 'Pendiente' }}
                    </span>
                  </td>
                  <td>
                    <button 
                      class="btn btn-sm btn-theme"
                      @click="payQuota(index)"
                      :disabled="cuota.paid">
                      Pagar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'QuotasModal',
  expose: ['show'],
  props: {
    purchase: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatDate(date) {
      return new Date(date).toLocaleDateString();
    },
    payQuota(index) {
      this.$emit('pay-quota', {
        purchase: this.purchase,
        quotaIndex: index,
        amount: this.purchase.loanAmount / this.purchase.terms
      });
    },
    show() {
      const modalElement = this.$el;
      if (modalElement) {
        const modal = new Modal(modalElement);
        modal.show();
      }
    }
  }
}
</script>

<style scoped>
.btn-theme {
  background-color: #6f42c1;
  border-color: #6f42c1;
  color: white;
}

.btn-theme:hover:not(:disabled) {
  background-color: #5a32a3;
  border-color: #5a32a3;
}

.btn-theme:disabled {
  opacity: 0.65;
}

.badge {
  padding: 0.5em 1em;
  border: 1px solid;
  background-color: transparent !important;
}
.badge-success {
  color: #198754;
  border-color: #198754;
}
.badge-warning {
  color: #ffc107;
  border-color: #ffc107;
}
</style> 