<template>
  <div
    class="modal fade"
    id="notifyPaymentModal"
    tabindex="-1"
    aria-labelledby="notifyPaymentModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="notifyPaymentModalLabel">
            <i class="fas fa-money-bill-wave me-2"></i>Subir Captura de Pago
          </h5>
          <button
            type="button"
            class="btn-close btn-close-white"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <!-- Plan Details Section -->
          <div v-if="selectedPlan && Object.keys(selectedPlan).length > 0" class="plan-details mb-4">
            <div class="plan-header d-flex justify-content-center align-items-center">
              <i class="plan-icon" :class="selectedPlan.icon"></i>
              <h3 class="plan-name">{{ selectedPlan.name.toUpperCase() }}</h3>
            </div>
            <div class="price-details">
              <div class="plan-price">
                <span class="label">Precio:</span>
                <span class="value">${{ selectedPlan.isYearly ? selectedPlan.yearlyPrice : selectedPlan.price }} / {{ selectedPlan.isYearly ? 'Anual' : 'Mensual' }}</span>
              </div>
              <div class="exchange-rate">
                <span class="label">Tasa:</span>
                <span class="value">{{ exchange || 0 }} Bs</span>
              </div>
              <div class="total-amount">
                <span class="label">Monto a cancelar:</span>
                <span class="value">
                  {{
                    selectedPlan.price == 0 && role === "afiliado"
                      ? "Consultar precio"
                      : `${((selectedPlan.isYearly ? selectedPlan.yearlyPrice : selectedPlan.price || 0).toFixed(2) * (exchange || 0)).toFixed(2)} Bs`
                  }}
                </span>
              </div>
            </div>
          </div>

          <!-- No Plan Selected Message -->
          <div v-else class="alert alert-info mb-4">
            <i class="fas fa-info-circle me-2"></i>
            Seleccione un plan para continuar
          </div>

          <!-- Payment Methods Section -->
          <div class="payment-methods mb-4">
            <h4 class="text-center mb-3">Métodos de Pago</h4>
            <div class="payment-method-item">
              <h6 class="method-type">
                <i class="fas fa-mobile-alt me-2"></i>Pago Móvil
              </h6>
              <div class="method-details">
                <div class="detail-item">
                  <span class="label">Banco:</span>
                  <span class="value">Banco Provincial</span>
                </div>
                <div class="detail-item">
                  <span class="label">Teléfono:</span>
                  <span class="value">04246003370</span>
                  <button
                    class="btn btn-sm btn-outline-light ms-2"
                    @click="handleCopy('04246003370')"
                  >
                    <i class="fa fa-copy"></i>
                  </button>
                </div>
                <div class="detail-item">
                  <span class="label">RIF:</span>
                  <span class="value">J506221772</span>
                  <button
                    class="btn btn-sm btn-outline-light ms-2"
                    @click="handleCopy('J506221772')"
                  >
                    <i class="fa fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Form -->
          <form class="payment-form" @submit.prevent="handleSubmit">
            <div class="row g-3">
              <div class="col-12 d-flex justify-content-center">
                <div class="col-6">
                  <label for="amountPaid" class="form-label">
                    <i class="fas fa-coins me-2"></i>Monto Pagado
                  </label>
                  <div class="input-group">
                    <span class="input-group-text">Bs.</span>
                    <input
                      id="amountPaid"
                      class="form-control"
                      type="number"
                      step=".01"
                      v-model.number="amountPaid"
                      aria-label="Monto"
                      readonly
                    />
                  </div>
                </div>
              </div>
              <div class="col-12">
                <label for="payment" class="form-label">
                  <i class="fas fa-image me-2"></i>Captura de Pago
                </label>
                <input
                  type="file"
                  class="form-control"
                  accept="image/*"
                  @change="handleFileUpload"
                  ref="fileInput"
                />
                <div v-if="paymentPreview" class="preview-container mt-3">
                  <button 
                    type="button" 
                    class="remove-preview"
                    @click="clearPreview"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                  <img
                    :src="paymentPreview"
                    alt="payment preview"
                    class="img-preview"
                  />
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="alert alert-danger mt-3">
              <i class="fas fa-exclamation-circle me-2"></i>{{ errorMessage }}
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-outline-light"
            @click="closeModal"
          >
            <i class="fas fa-times me-2"></i>Cerrar
          </button>
          <button 
            type="button" 
            class="btn btn-theme" 
            :disabled="isSubmitting || !paymentFile"
            @click="handleSubmit"
          >
            <span
              v-if="isSubmitting"
              class="spinner-border spinner-border-sm me-2"
              role="status"
            ></span>
            <i v-else class="fas fa-upload me-2"></i>
            {{ isSubmitting ? "Subiendo..." : "Subir" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import copyToClipboard from "@/utils/copyToClipboard";
import { Modal } from 'bootstrap';

export default {
  name: "NotifyPaymentModal",
  props: {
    userId: {
      type: String,
      required: false
    },
    role: {
      type: String,
      required: true
    },
    selectedPlan: {
      type: Object,
      required: true
    },
    exchange: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      amountPaid: 0,
      paymentPreview: null,
      errorMessage: "",
      isSubmitting: false,
      modal: null,
      paymentFile: null
    };
  },
  computed: {
    calculatedAmount() {
      if (!this.selectedPlan || !this.exchange) return 0;
      return Number((this.selectedPlan.price * this.exchange).toFixed(2));
    }
  },
  watch: {
    selectedPlan: {
      immediate: true,
      handler(newPlan) {
        if (newPlan && this.exchange) {
          this.amountPaid = Number(((newPlan.isYearly ? newPlan.yearlyPrice : newPlan.price) * this.exchange).toFixed(2));
        }
      }
    },
    exchange: {
      immediate: true,
      handler(newExchange) {
        if (this.selectedPlan && newExchange) {
          this.amountPaid = Number(((this.selectedPlan.isYearly ? this.selectedPlan.yearlyPrice : this.selectedPlan.price) * newExchange).toFixed(2));
        }
      }
    }
  },
  mounted() {
    this.modal = new Modal(document.getElementById('notifyPaymentModal'));
  },
  methods: {
    handleCopy(text) {
      copyToClipboard(text);
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        // Validate file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          this.errorMessage = "El archivo es demasiado grande. Máximo 5MB permitido.";
          this.$refs.fileInput.value = '';
          return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          this.errorMessage = "Por favor seleccione una imagen válida.";
          this.$refs.fileInput.value = '';
          return;
        }

        this.errorMessage = ""; // Clear any previous error
        this.paymentPreview = URL.createObjectURL(file);
        this.paymentFile = file;
        this.$emit('file-upload', file);
      }
    },
    handleSubmit() {
      if (!this.paymentFile) {
        this.errorMessage = "Por favor seleccione una captura de pago";
        return;
      }

      this.isSubmitting = true;
      
      this.$emit("submit-payment", {
        paymentDate: new Date().toISOString(),
        exchange: this.exchange,
        planId: this.selectedPlan.id,
        planName: this.selectedPlan.name,
        isYearly: this.selectedPlan.isYearly || false,
        amountPaid: this.amountPaid,
        paymentFile: this.paymentFile
      });
    },
    clearPreview() {
      this.paymentPreview = null;
      this.$refs.fileInput.value = ''; // Reset the file input
      this.paymentFile = null;
      this.$emit('file-upload', null); // Notify parent that file was removed
    },
    openModal() {
      if (this.modal) {
        // Reset form data when opening
        this.paymentFile = null;
        this.paymentPreview = null;
        this.errorMessage = "";
        this.isSubmitting = false;
        this.modal.show();
      }
    },
    closeModal() {
      this.modal.hide();
      // Reset form data
      this.paymentFile = null;
      this.paymentPreview = null;
      this.errorMessage = "";
      this.isSubmitting = false;
    }
  },
};
</script>

<style scoped>
/* Modal Base Styles */
.modal-content {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  background-color: #29122f;
  border-bottom-color: #444;
  padding: 1rem 1.5rem;
}

.modal-body {
  padding: 1.5rem;
}

/* Plan Details Styles */
.plan-details {
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.plan-icon {
  font-size: 2rem;
  color: #6f42c1;
}

.plan-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.price-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-price,
.exchange-rate,
.total-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #aaa;
  font-weight: 500;
}

.value {
  font-weight: 600;
  color: #fff;
}

/* Payment Methods Styles */
.payment-methods {
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.method-type {
  color: #6f42c1;
  margin-bottom: 1rem;
  font-weight: 600;
}

.method-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Form Styles */
.payment-form {
  margin-top: 1.5rem;
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.form-label {
  color: #aaa;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-control {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
  padding: 0.375rem;
}

.form-control:focus {
  background-color: #2d2d2d;
  border-color: #6f42c1;
  color: #fff;
  box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

.form-control[type="file"] {
  padding: 0.375rem;
}

.form-control[type="file"]::-webkit-file-upload-button {
  background-color: #6f42c1;
  border: none;
  color: white;
  padding: 0.375rem 0.75rem;
  margin-right: 0.75rem;
  border-radius: 0.25rem;
}

.input-group-text {
  background-color: #444;
  border-color: #444;
  color: #fff;
}

.preview-container {
  border-radius: 0.5rem;
  overflow: hidden;
  max-width: 100%;
  margin-top: 1rem;
  border: 1px solid #444;
  background-color: #222;
  position: relative;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
}

.img-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain; /* Changed from cover to contain */
  background-color: #222;
  padding: 0.5rem;
}

/* Add a remove preview button */
.preview-container .remove-preview {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  z-index: 1;
  transition: all 0.3s ease;
}

.preview-container .remove-preview:hover {
  background: rgba(220, 53, 69, 0.8);
}

/* Button Styles */
.btn-theme {
  background-color: #6f42c1;
  border-color: #6f42c1;
  color: white;
  padding: 0.375rem 0.75rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-theme:hover:not(:disabled) {
  background-color: #5a32a3;
  border-color: #5a32a3;
}

.btn-theme:disabled {
  background-color: #6f42c1;
  border-color: #6f42c1;
  opacity: 0.65;
}

.btn-outline-light {
  border-color: #444;
  color: #fff;
  padding: 0.375rem 0.75rem;
}

.btn-outline-light:hover {
  background-color: #444;
  border-color: #444;
  color: #fff;
}

/* Alert Styles */
.alert-danger {
  background-color: rgba(220, 53, 69, 0.1);
  border-color: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

/* Z-index handling */
#notifyPaymentModal {
  z-index: 1060 !important;
}

.modal-backdrop.show:nth-child(2) {
  z-index: 1055;
}

/* Responsive Styles */
@media (max-width: 576px) {
  .modal-body {
    padding: 1rem;
  }

  .plan-header {
    flex-direction: column;
    text-align: center;
  }

  .price-details {
    text-align: center;
  }

  .exchange-rate,
  .total-amount {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
