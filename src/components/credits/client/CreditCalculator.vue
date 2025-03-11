<template>
  <div class="card">
    <div class="card-header">
      <h5 class="mb-0">Calculadora de Crédito</h5>
    </div>
    <div class="card-body">
      <form @submit.prevent="calculate">
        <div class="mb-3">
          <label class="form-label">Nombre del Producto</label>
          <input 
            type="text" 
            class="form-control bg-dark text-light border-secondary" 
            v-model="form.productName"
            required
          />
        </div>

        <div class="mb-3">
          <label class="form-label">Monto Total</label>
          <div class="input-group">
            <span class="input-group-text bg-dark text-light border-secondary">$</span>
            <input 
              type="number" 
              class="form-control bg-dark text-light border-secondary"
              v-model.number="form.amount"
              :max="availableCredit"
              min="0"
              step="0.01"
              required
            />
          </div>
          <small class="text-light">Crédito disponible: ${{ availableCredit }}</small>
        </div>

        <div class="mb-3">
          <label class="form-label">Pago Inicial (%)</label>
          <select 
            class="form-select bg-dark text-light border-secondary"
            v-model="form.initialPercentage"
          >
            <option value="0">Sin pago inicial</option>
            <option value="10">10%</option>
            <option value="20">20%</option>
            <option value="30">30%</option>
            <option value="40">40%</option>
            <option value="50">50%</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label">Número de Cuotas</label>
          <select 
            class="form-select bg-dark text-light border-secondary"
            v-model="form.terms"
          >
            <option value="2">2 cuotas</option>
            <option value="3">3 cuotas</option>
            <option value="4">4 cuotas</option>
            <option value="6">6 cuotas</option>
            <option value="12">12 cuotas</option>
          </select>
        </div>

        <button 
          type="submit" 
          class="btn btn-theme w-100"
          :disabled="!isValid">
          Calcular Cuotas
        </button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreditCalculator',
  props: {
    availableCredit: {
      type: Number,
      required: true,
      default: 0
    }
  },
  data() {
    return {
      form: {
        productName: '',
        amount: 0,
        initialPercentage: '0',
        terms: 2
      }
    }
  },
  computed: {
    isValid() {
      return this.form.productName && 
             this.form.amount > 0 && 
             this.form.amount <= this.availableCredit
    }
  },
  methods: {
    calculate() {
      const initialPayment = (this.form.amount * parseInt(this.form.initialPercentage)) / 100
      this.$emit('calculate', {
        ...this.form,
        initialPayment
      })
    }
  }
}
</script>

<style scoped>
.form-control:focus, .form-select:focus {
  background-color: #2d2d2d;
  color: #fff;
  border-color: #6f42c1;
  box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
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
  background-color: #6f42c1;
  border-color: #6f42c1;
  opacity: 0.65;
}
</style> 