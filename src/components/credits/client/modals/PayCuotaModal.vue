<template>
  <div class="modal fade" id="payCuotaModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content bg-dark">
        <div class="modal-header border-secondary">
          <h5 class="modal-title text-light">Pagar Cuota</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-purple" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          
          <!-- Purchase Details -->
          <div class="mb-3">
            <h6 class="text-light">Detalles de la Compra</h6>
            <div class="text-light small">
              <p class="mb-1">Producto: {{ purchase.productName }}</p>
              <p class="mb-0" v-if="currentCuota">Cuota a pagar: ${{ Number(currentCuota.amount).toFixed(2) }}</p>
              <p class="mb-0 text-warning" v-else>No hay cuotas pendientes por pagar</p>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label text-light">Monto a Pagar en Bs.</label>
            <div class="input-group">
              <span class="input-group-text bg-dark text-light border-secondary">Bs.</span>
              <input 
                type="number" 
                class="form-control bg-dark text-light border-secondary" 
                v-model.number="amountPaid"
                :min="0"
                :value="cuotaInBs"
                readonly
                required />
            </div>
            <small class="text-secondary mt-1 d-block">
              Tasa de cambio: {{ exchangeRate }} Bs.
            </small>
          </div>

          <div class="payment-details mb-4">
            <h6 class="text-light mb-3">Datos de Pago</h6>
            <div v-if="affiliatePaymentDetails" class="bg-dark-subtle p-3 rounded border border-secondary">
              <div class="row g-3">
                <div class="col-sm-6">
                  <small class="text-secondary d-block">Banco</small>
                  <span class="text-light">{{ affiliatePaymentDetails.bank }}</span>
                </div>
                <div class="col-sm-6">
                  <small class="text-secondary d-block">Número de Cuenta</small>
                  <span class="text-light">{{ affiliatePaymentDetails.bankAccount }}</span>
                </div>
                <div class="col-sm-6">
                  <small class="text-secondary d-block">Teléfono</small>
                  <span class="text-light">{{ affiliatePaymentDetails.phoneNumber }}</span>
                </div>
                <div class="col-sm-6">
                  <small class="text-secondary d-block">Cédula / RIF</small>
                  <span class="text-light">{{ affiliatePaymentDetails.identification }}</span>
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

          <div class="mb-3">
            <label class="form-label text-light">Comprobante de Pago</label>
            <input 
              type="file" 
              class="form-control bg-dark text-light border-secondary"
              accept="image/*"
              @change="handleFileUpload"
              required />
          </div>

          <div v-if="paymentPreview" class="mb-3">
            <img :src="paymentPreview" class="img-fluid rounded" alt="Preview" />
          </div>

          <div v-if="errorMessage" class="alert alert-danger">
            {{ errorMessage }}
          </div>
        </div>
        <div class="modal-footer border-secondary">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            Cerrar
          </button>
          <button 
            type="button" 
            class="btn btn-theme" 
            @click="submitPayment"
            :disabled="!isValid || loading">
            Pagar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref as dbRef, get } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/firebase/init'

export default {
  name: 'PayCuotaModal',
  props: {
    purchase: {
      type: Object,
      required: true
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
      currentCuota: null
    }
  },
  computed: {
    isValid() {
      return this.amountPaid > 0 && 
             this.paymentFile
    },
    cuotaInBs() {
      const amount = (this.currentCuota?.amount || 0) * this.exchangeRate;
      return Number(amount.toFixed(2));
    },
    nextUnpaidCuota() {
      if (!this.purchase.cuotas) return null;
      return this.purchase.cuotas.find(cuota => !cuota.paid);
    }
  },
  methods: {
    async fetchExchangeRate() {
      try {
        const exchangeRef = dbRef(db, 'Exchange');
        const snapshot = await get(exchangeRef);
        if (snapshot.exists()) {
          this.exchangeRate = Number(snapshot.val().value.toFixed(2));
          // Set the initial amount to pay in Bs
          this.amountPaid = (this.currentCuota?.amount || 0) * this.exchangeRate;
          
        } else {
          this.errorMessage = 'No se encontró la tasa de cambio';
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        this.errorMessage = 'Error al cargar la tasa de cambio';
      }
    },
    async fetchAffiliateDetails() {
      try {
        this.loading = true;
        const affiliateRef = dbRef(db, `Users/${this.purchase.affiliate_id}`);
        const snapshot = await get(affiliateRef);
        
        if (snapshot.exists()) {
          const affiliate = snapshot.val();
          this.affiliatePaymentDetails = affiliate.paymentDetails || null;
        } else {
          this.errorMessage = 'No se encontraron los datos de pago del afiliado';
        }
      } catch (error) {
        console.error('Error fetching affiliate details:', error);
        this.errorMessage = 'Error al cargar los datos de pago';
      } finally {
        this.loading = false;
      }
    },

    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.includes('image/')) {
        this.errorMessage = 'Por favor seleccione una imagen';
        return;
      }

      this.paymentFile = file;
      this.createPreview(file);
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

        // Upload payment proof
        const fileName = `payments/${this.purchase.id}/${Date.now()}-${this.paymentFile.name}`;
        const fileRef = storageRef(storage, fileName);
        await uploadBytes(fileRef, this.paymentFile);
        const downloadURL = await getDownloadURL(fileRef);

        // Prepare payment data
        const paymentData = {
          purchaseId: this.purchase.id,
          amount: this.amountPaid,
          paymentMethod: 'pago movil',
          proofUrl: downloadURL,
          purchaseDate: this.purchase.purchaseDate,
          frequency: this.purchase.frequency,
          date: new Date().toISOString()
        };

        this.$emit('submit-payment', paymentData);
      } catch (error) {
        console.error('Error submitting payment:', error);
        this.errorMessage = 'Error al procesar el pago. Por favor intente nuevamente.';
      } finally {
        this.loading = false;
      }
    }
  },
  async mounted() {
    this.currentCuota = this.nextUnpaidCuota;
    if (!this.currentCuota) {
      this.errorMessage = 'No hay cuotas pendientes por pagar';
    }
    await Promise.all([
      this.fetchAffiliateDetails(),
      this.fetchExchangeRate()
    ]);
  }
}
</script>

<style scoped>
.modal-header {
  background-color: #29122f;
}
.text-purple {
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

.bg-dark-subtle {
  background-color: #2d2d2d !important;
}
</style> 