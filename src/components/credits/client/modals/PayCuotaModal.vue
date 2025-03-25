<template>
  <div class="modal fade" id="payCuotaModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title text-light">
            <i class="fas fa-money-bill-wave me-2"></i>Pagar Cuota
          </h5>
          <button
            type="button"
            class="btn-close btn-close-white"
            data-bs-dismiss="modal"
          ></button>
        </div>
        <div class="modal-body">
          
          <!-- Loading Section -->
          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-purple" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          
          <!-- Purchase Details -->
          <div class="purchase-details mb-4">
            <div class="purchase-header d-flex justify-content-center align-items-center">
              <i class="purchase-icon fas fa-shopping-cart me-2"></i>
              <h3 class="text-light">Detalles de la Compra</h3>
            </div>
            <div class="details">
              <div class="detail-item">
                <span class="label">Producto:</span>
                <span class="value">{{ purchase.productName }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Cuota a pagar:</span>
                <span class="value">${{ Number(currentCuota.amount).toFixed(2) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Fecha de pago:</span>
                <span class="value">{{ formattedCuotaDate }}</span>
              </div>
              
              <!-- Late Payment Fee Section -->
              <div v-if="isLatePayment" class="detail-item late-payment mt-2">
                <span class="label text-warning">Cargo por pago tardío:</span>
                <span class="value text-warning">$4.00</span>
              </div>
              <div v-if="isLatePayment" class="detail-item late-payment">
                <span class="label text-warning">Total a pagar:</span>
                <span class="value text-warning">${{ totalAmountWithLateFee.toFixed(2) }}</span>
              </div>
              <div v-if="isLatePayment" class="late-payment-notice mt-2 p-2 border border-warning rounded">
                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                <small class="text-warning">El pago está retrasado por {{ daysLate }} días. Se ha aplicado un cargo adicional de $4.00 por pago tardío.</small>
              </div>
            </div>
          </div>

          <!-- Amount to Pay Section -->
          <div class="amount-to-pay mb-4">
            <h4 class="text-center mb-3">
              <i class="purchase-icon fas fa-money-bill-wave me-2"></i>
              Monto a Pagar en Bs.</h4>
            <div class="input-group">
              <span class="input-group-text text-light border-secondary">Bs.</span>
              <input 
                type="number" 
                class="form-control text-light border-secondary" 
                v-model.number="amountPaid"
                :min="0"
                :step="0.01"
                :value="cuotaInBs"
                readonly
                required />
            </div>
            <small class="text-secondary mt-1 d-block">
              Tasa de cambio: {{ exchangeRate }} Bs.
            </small>
          </div>

          <!-- Payment Methods Section -->
          <div class="payment-methods mb-4">
            <h4 class="text-center mb-3">
              <i class="purchase-icon fas fa-money-bill-transfer me-2"></i>
              Métodos de Pago</h4>
            <div v-if="affiliatePaymentDetails" class="payment-method-item">
              <h5 class="method-type text-light text-center mb-3">{{ affiliateName }}</h5>
              <h6 class="method-type">
                <i class="fas fa-mobile-alt me-2"></i>Pago Móvil
              </h6>
              <div class="method-details">
                <div class="detail-item">
                  <span class="label">Banco:</span>
                  <span class="value">{{ affiliatePaymentDetails.bank }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Número de Cuenta:</span>
                  <span class="value">{{ affiliatePaymentDetails.bankAccount }}</span>
                  <button class="btn btn-sm btn-outline-light ms-2" @click="handleCopy(affiliatePaymentDetails.bankAccount)">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
                <div class="detail-item">
                  <span class="label">Teléfono:</span>
                  <span class="value">{{ affiliatePaymentDetails.phoneNumber }}</span>
                  <button class="btn btn-sm btn-outline-light ms-2" @click="handleCopy(affiliatePaymentDetails.phoneNumber)">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
                <div class="detail-item">
                  <span class="label">Cédula / RIF:</span>
                  <span class="value">{{ affiliatePaymentDetails.identification }}</span>
                  <button class="btn btn-sm btn-outline-light ms-2" @click="handleCopy(affiliatePaymentDetails.identification)">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>

            <div v-else-if="!loading" class="text-warning">
              <small>
                <i class="fas fa-exclamation-triangle me-2"></i>
                No se encontraron los datos de pago del afiliado
              </small>
            </div>
          </div>

          <!-- Payment Proof Section -->
          <div class="payment-proof mb-3">
            <h4 class="text-center mb-3">Comprobante de Pago</h4>
            <input 
              type="file" 
              class="form-control text-light border-secondary"
              accept="image/*"
              @change="handleFileUpload"
              required />

              <!-- Payment Preview Section -->
            <div v-if="paymentPreview" class="mb-3 mt-3">
              <img :src="paymentPreview" class="img-fluid rounded" alt="Preview" />
            </div>

            <!-- Error Message Section -->
            <div v-if="errorMessage" class="alert alert-danger">
              {{ errorMessage }}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">
            <i class="fas fa-times me-2"></i>Cerrar
          </button>
          <button 
            type="button" 
            class="btn btn-theme" 
            @click="submitPayment"
            :disabled="!isValid || loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            <i v-else class="fas fa-upload me-2"></i>
            {{ loading ? "Subiendo..." : "Pagar" }}
          </button>
        </div>
      </div>
    </div>    
  </div>
</template>

<script>
import { ref as dbRef, get, set, update } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/firebase/init'
import copyToClipboard from '@/utils/copyToClipboard'
import { Modal } from 'bootstrap'
import { showToast } from '@/utils/toast'

export default {
  name: 'PayCuotaModal',
  expose: ['show', 'hide'],
  emits: ['payment-success'],
  props: {
    purchase: {
      type: Object,
      required: true
    },
    selectedCuotaId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      amountPaid: 0,
      paymentFile: null,
      paymentPreview: null,
      errorMessage: '',
      loading: false,
      affiliatePaymentDetails: null,
      exchangeRate: 0,
      currentCuota: null,
      affiliateName: '',
      modal: null,
      lateFee: 4, // $4 USD late fee
    }
  },
  computed: {
    isValid() {
      return this.amountPaid > 0 && 
             this.paymentFile
    },
    cuotaInBs() {
      // Make sure we have valid values before calculating
      if (!this.currentCuota || !this.exchangeRate) return 0;
      
      // Use totalAmountWithLateFee which already handles both normal and late payments
      const usdAmount = this.totalAmountWithLateFee;
      const bsAmount = usdAmount * this.exchangeRate;
      
      // Set the amountPaid value whenever this is recalculated
      this.$nextTick(() => {
        this.amountPaid = Number(bsAmount.toFixed(2));
      });
      
      return Number(bsAmount.toFixed(2));
    },
    selectedCuota() {
      // If a specific cuota ID is provided, use that
      if (this.selectedCuotaId !== null && this.purchase.cuotas) {
        // Always treat cuotas as an object with IDs as keys
        const cuotas = typeof this.purchase.cuotas === 'object' && !Array.isArray(this.purchase.cuotas) 
          ? this.purchase.cuotas 
          : Object.fromEntries(this.purchase.cuotas.map((cuota, index) => [index.toString(), cuota]));

        const selectedCuota = cuotas[this.selectedCuotaId];
        return selectedCuota ? { ...selectedCuota, id: this.selectedCuotaId } : null;
      }
      
      // Fallback to finding next unpaid cuota
      if (!this.purchase.cuotas) return null;
      
      // Convert to entries for consistent handling
      const cuotasEntries = typeof this.purchase.cuotas === 'object' && !Array.isArray(this.purchase.cuotas)
        ? Object.entries(this.purchase.cuotas)
        : this.purchase.cuotas.map((cuota, index) => [index.toString(), cuota]);

      // Find first unpaid cuota
      const unpaidEntry = cuotasEntries.find(([id, cuota]) => !cuota.paid);
      return unpaidEntry ? { ...unpaidEntry[1], id: unpaidEntry[0] } : null;
    },
    formattedCuotaDate() {
      const date = new Date(this.currentCuota.date);
      date.setDate(date.getDate() + 1); // Adjust for timezone
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    isLatePayment() {
      if (!this.currentCuota || !this.currentCuota.date) return false;
      
      // Get the due date from the cuota
      const dueDate = new Date(this.currentCuota.date);
      dueDate.setDate(dueDate.getDate() + 1); // Adjust for timezone
      
      // Get current date (without time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate days difference
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Return true if payment is 2 or more days late
      return diffDays >= 2;
    },
    daysLate() {
      if (!this.currentCuota || !this.currentCuota.date) return 0;
      
      const dueDate = new Date(this.currentCuota.date);
      dueDate.setDate(dueDate.getDate() + 1); // Adjust for timezone
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - dueDate.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    totalAmountWithLateFee() {
      if (!this.currentCuota) return 0;
      const baseAmount = Number(this.currentCuota.amount) || 0;
      return this.isLatePayment ? baseAmount + this.lateFee : baseAmount;
    }
  },
  watch: {
    selectedCuota: {
      immediate: true,
      handler(newCuota) {
        this.currentCuota = newCuota;
        if (!newCuota) {
          this.errorMessage = 'No hay cuotas pendientes por pagar';
        }
      }
    },
    exchangeRate: {
      handler(newRate) {
        if (newRate > 0 && this.currentCuota) {
          const bsAmount = this.totalAmountWithLateFee * newRate;
          this.amountPaid = Number(bsAmount.toFixed(2));
        }
      }
    },
    totalAmountWithLateFee: {
      handler(newAmount) {
        if (newAmount > 0 && this.exchangeRate > 0) {
          const bsAmount = newAmount * this.exchangeRate;
          this.amountPaid = Number(bsAmount.toFixed(2));
        }
      }
    }
  },
  methods: {
    handleCopy(text) {
      copyToClipboard(text)
    },
    async fetchExchangeRate() {
      try {
        const exchangeRef = dbRef(db, 'Exchange');
        const snapshot = await get(exchangeRef);
        
        if (snapshot.exists()) {
          // Make sure we get a valid number for the exchange rate
          const rateData = snapshot.val();
          this.exchangeRate = rateData.rate || rateData.value || 0;
          
          if (this.exchangeRate <= 0) {
            this.errorMessage = 'Tasa de cambio inválida';
            console.error('Invalid exchange rate:', this.exchangeRate);
          }
        } else {
          this.exchangeRate = 0;
          this.errorMessage = 'No se pudo obtener la tasa de cambio';
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        this.errorMessage = 'Error al obtener la tasa de cambio';
        this.exchangeRate = 0;
      }
    },
    async fetchAffiliateDetails() {
      try {
        if (!this.purchase || !this.purchase.affiliate_id) {
          this.errorMessage = 'No se encontró información del afiliado';
          return;
        }

        const affiliateRef = dbRef(db, `Users/${this.purchase.affiliate_id}`);
        const snapshot = await get(affiliateRef);
        
        if (snapshot.exists()) {
          const affiliateData = snapshot.val();
          this.affiliateName = affiliateData.companyName || `${affiliateData.firstName || ''} ${affiliateData.lastName || ''}`;
          
          // Get payment details
          if (affiliateData.paymentDetails) {
            this.affiliatePaymentDetails = affiliateData.paymentDetails;
          } else {
            this.errorMessage = 'El afiliado no ha configurado sus datos de pago';
          }
        } else {
          this.errorMessage = 'No se encontró información del afiliado';
        }
      } catch (error) {
        console.error('Error fetching affiliate details:', error);
        this.errorMessage = 'Error al obtener los datos del afiliado';
      }
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // Validate file type
      if (!file.type.match('image.*')) {
        this.errorMessage = 'Por favor seleccione una imagen';
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'La imagen no debe exceder 5MB';
        return;
      }
      
      this.paymentFile = file;
      this.createPreview(file);
      this.errorMessage = '';
    },
    createPreview(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.paymentPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    async submitPayment() {
      try {
        this.loading = true;
        this.errorMessage = '';
        // Get current date for payment record
        const formattedDate = new Date().toISOString();        

        // Upload payment proof
        const fileName = `cuota-payments/${this.purchase.client_id}-${this.purchase.clientName}/${formattedDate.split('T')[0]}`;
        const fileRef = storageRef(storage, fileName);
        await uploadBytes(fileRef, this.paymentFile);
        const downloadURL = await getDownloadURL(fileRef);        

        // Setup Payment data for the Payments collection
        const paymentDetails = {
          purchase_id: this.purchase.id,
          client_id: this.purchase.client_id,
          amount: this.amountPaid,
          date: formattedDate,
          method: 'pago_movil',
          proofUrl: downloadURL,
          approved: false,
          type: 'credit-cuota',
          cuota_id: this.selectedCuotaId || null,
          isLatePayment: this.isLatePayment,
          daysLate: this.isLatePayment ? this.daysLate : 0,
          lateFee: this.isLatePayment ? this.lateFee : 0,
          originalAmount: Number(this.currentCuota.amount) || 0,
          totalAmount: this.totalAmountWithLateFee
        };

        // Save the payment to the payments collection
        const paymentRef = dbRef(db, `Payments/${this.purchase.client_id}-${formattedDate.split('T')[0]}`);
        await set(paymentRef, paymentDetails);

        // Update the cuota's payment status
        if (this.currentCuota) {
          const cuotaRef = dbRef(db, `Users/${this.purchase.client_id}/credit/main/purchases/${this.purchase.id}/cuotas/${this.selectedCuotaId}`);
          await update(cuotaRef, {
            paymentUpload: true,
            paidAt: formattedDate,
            paymentUrl: downloadURL,
            isLatePayment: this.isLatePayment,
            lateFee: this.isLatePayment ? this.lateFee : 0,
            totalAmount: this.totalAmountWithLateFee
          });
        }

        // Reset the form
        this.amountPaid = 0;
        this.paymentFile = null;
        this.paymentPreview = null;

        // Hide this modal
        const modal = Modal.getInstance(document.getElementById('payCuotaModal'));
        if (modal) {
          modal.hide();
        }

        // Emit success event for parent components to handle UI updates
        this.$emit('payment-success', {
          purchaseId: this.purchase.id,
          cuotaId: this.selectedCuotaId,
          paymentDate: formattedDate,
          isLatePayment: this.isLatePayment,
          lateFee: this.isLatePayment ? this.lateFee : 0,
          totalAmount: this.totalAmountWithLateFee
        });

        showToast('Comprobante subido exitosamente', 'success');
      } catch (error) {
        console.error('Error submitting payment:', error);
        this.errorMessage = 'Error al procesar el pago. Por favor intente nuevamente.';
        showToast('Error al procesar el pago', 'error');
      } finally {
        this.loading = false;
      }
    },
    show() {
      if (!this.modal) {
        const modalElement = document.getElementById('payCuotaModal');
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
  async mounted() {
    await Promise.all([
      this.fetchAffiliateDetails(),
      this.fetchExchangeRate()
    ]);
  },
  unmounted() {
    if (this.modal) {
      this.modal.dispose();
    }
  }
}
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

.purchase-details {
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.purchase-header {
  margin-bottom: 1.5rem;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  gap: 0.5rem;
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

.late-payment-notice {
  background-color: rgba(255, 193, 7, 0.1);
}

.amount-to-pay {
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
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

.payment-proof {
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.text-purple {
  color: #6f42c1;
}

.purchase-icon {
  font-size: 2rem;
  color: #6f42c1;
}

/* Add higher z-index for this modal */
#payCuotaModal {
  z-index: 1060 !important;
}

.modal-backdrop.show:nth-child(2) {
  z-index: 1055;
}

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

/* Custom file input styling */
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
</style> 