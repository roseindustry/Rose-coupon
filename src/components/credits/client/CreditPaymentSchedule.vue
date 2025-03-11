<template>
  <div class="card">
    <div class="card-header">
      <h5 class="mb-0">Plan de Pagos</h5>
    </div>
    <div class="card-body">
      <div class="product-details mb-3">
        <h6 class="text-light">{{ productName }}</h6>
        <p class="mb-0 text-light">Monto total: ${{ totalAmount }}</p>
      </div>

      <div class="table-responsive">
        <table class="table table-dark">
          <thead>
            <tr>
              <th>Cuota</th>
              <th>Fecha</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(payment, index) in schedule" :key="index">
              <td>{{ index + 1 }}</td>
              <td>{{ formatDate(payment.date) }}</td>
              <td>${{ payment.amount.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="text-end mt-3">
        <button class="btn btn-theme" @click="confirmPurchase">
          Confirmar Compra
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreditPaymentSchedule',
  props: {
    schedule: {
      type: Array,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    }
  },
  methods: {
    formatDate(date) {
      return new Date(date).toLocaleDateString()
    },
    confirmPurchase() {
      this.$emit('confirm', {
        productName: this.productName,
        totalAmount: this.totalAmount,
        schedule: this.schedule
      })
    }
  }
}
</script>

<style scoped>
.product-details {
  padding: 1rem;
  background-color: #363636;
  border-radius: 0.375rem;
}

.table {
  margin-bottom: 0;
}

.btn-theme {
  background-color: #6f42c1;
  border-color: #6f42c1;
  color: white;
}

.btn-theme:hover {
  background-color: #5a32a3;
  border-color: #5a32a3;
}
</style> 