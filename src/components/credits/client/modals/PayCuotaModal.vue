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
              <p class="mb-1">Monto del préstamo: ${{ purchase.loanAmount?.toLocaleString() }}</p>
              <p class="mb-1">Monto restante: ${{ purchase.remainingAmount?.toLocaleString() }}</p>
              <p class="mb-0">Cuotas: {{ purchase.terms }}</p>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label text-light">Monto a Pagar</label>
            <div class="input-group">
              <span class="input-group-text bg-dark text-light border-secondary">$</span>
              <input 
                type="number" 
                class="form-control bg-dark text-light border-secondary" 
                v-model.number="amountPaid"
                :min="0"
                :max="purchase.remainingAmount"
                required />
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label text-light">Método de Pago</label>
            <select 
              class="form-select bg-dark text-light border-secondary"
              v-model="selectedMethod"
              required>
              <option value="">Seleccionar método</option>
              <option v-for="method in paymentMethods" 
                :key="method.id" 
                :value="method.id">
                {{ method.name }}
              </option>
            </select>
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
import { storage } from '@/firebase/init'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

export default {
  name: 'PayCuotaModal',
  props: {
    purchase: {
      type: Object,
      required: true
    },
    paymentMethods: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      amountPaid: 0,
      selectedMethod: '',
      paymentFile: null,
      paymentPreview: null,
      errorMessage: '',
      loading: false
    }
  },
  computed: {
    isValid() {
      return this.amountPaid > 0 && 
             this.amountPaid <= this.purchase.remainingAmount &&
             this.selectedMethod &&
             this.paymentFile
    }
  },
  methods: {
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
          paymentMethod: this.selectedMethod,
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
  }
}
</script>

<style scoped>
.text-purple {
  color: #6f42c1;
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
</style> 