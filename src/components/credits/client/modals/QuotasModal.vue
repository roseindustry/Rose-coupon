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
                <tr v-for="(cuota, id) in mappedCuotas" :key="id">
                  <td>{{ formatDate(cuota.date) }}</td>
                  <td>${{ Number(cuota.amount).toFixed(2) }}</td>
                  <td>
                    <span class="badge" :class="getBadgeClass(cuota)">
                      {{ getStatusText(cuota) }}
                    </span>
                  </td>
                  <td>
                    <button 
                      v-if="!cuota.paymentUpload"
                      class="btn btn-sm btn-theme"
                      @click="payQuota(id)"
                      :disabled="cuota.paid">
                      Pagar
                    </button>
                    <button 
                      v-else
                      class="btn btn-sm btn-secondary"
                      @click="viewPaymentProof(cuota.paymentUrl)">
                      <i class="fas fa-receipt me-1"></i>
                      Ver Comprobante
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

  <!-- Payment Proof Modal -->
  <div class="modal fade" id="paymentProofModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content bg-dark">
        <div class="modal-header border-secondary">
          <h5 class="modal-title text-light">Comprobante de Pago</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body text-center">
          <img :src="selectedPaymentUrl" class="img-fluid rounded" alt="Comprobante de pago" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'QuotasModal',
  expose: ['show', 'hide'],
  emits: ['pay-quota'],
  props: {
    purchase: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      selectedPaymentUrl: null,
      paymentProofModal: null,
      modal: null
    }
  },
  computed: {
    mappedCuotas() {
      if (!this.purchase.cuotas) return {};
      // If cuotas is already an object with IDs as keys, return as is
      if (typeof this.purchase.cuotas === 'object' && !Array.isArray(this.purchase.cuotas)) {
        return this.purchase.cuotas;
      }
      // If cuotas is an array, convert to object with indices as keys
      return Object.fromEntries(
        this.purchase.cuotas.map((cuota, index) => [index.toString(), cuota])
      );
    }
  },
  methods: {
    formatDate(date) {
      const dateObj = new Date(date);
      dateObj.setDate(dateObj.getDate() + 1); // Adjust for timezone
      return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    getBadgeClass(cuota) {
      if (cuota.paid) return 'badge-success';
      if (cuota.paymentUpload) return 'badge-info';
      return 'badge-warning';
    },
    getStatusText(cuota) {
      if (cuota.paid) return 'Pagado';
      if (cuota.paymentUpload) return 'Esperando aprobación';
      return 'Pendiente';
    },
    payQuota(cuotaId) {
      this.$emit('pay-quota', {
        purchase: this.purchase,
        cuotaId: cuotaId,
        amount: this.purchase.loanAmount / this.purchase.terms
      });
    },
    viewPaymentProof(paymentUrl) {
      this.selectedPaymentUrl = paymentUrl;
      this.$nextTick(() => {
        if (!this.paymentProofModal) {
          this.paymentProofModal = new Modal(document.getElementById('paymentProofModal'));
        }
        this.paymentProofModal.show();
      });
    },
    show() {
      if (!this.modal) {
        const modalElement = document.getElementById('quotasModal');
        if (modalElement) {
          this.modal = new Modal(modalElement);
        }
      }
      if (this.modal) {
        this.modal.show();
      }
    },
    hide() {
      if (this.modal) {
        this.modal.hide();
      }
    }
  },
  unmounted() {
    if (this.modal) {
      this.modal.dispose();
    }
    if (this.paymentProofModal) {
      this.paymentProofModal.dispose();
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
.badge-info {
  color: #0dcaf0;
  border-color: #0dcaf0;
}
.modal-header {
  background-color: #29122f;
  border-color: #29122f;
}

/* Add higher z-index for payment proof modal */
#paymentProofModal {
  z-index: 1070 !important;
}

.modal-backdrop.show:nth-child(3) {
  z-index: 1065;
}
</style> 