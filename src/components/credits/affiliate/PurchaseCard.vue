<template>
  <div class="card shadow-sm">
    <div class="card-header text-center" style="background-color: #1a1a1a; border-color: #b800c2;">
      <h5 class="text-light">{{ clientName }}</h5>
    </div>
    <div class="card-body">
      <div class="purchase-details mb-3">
        <p><strong class="me-2">Estado:</strong>
          <span :class="purchase.paid ? 'text-success' : 'text-danger'">
            {{ purchase.paid ? 'Pagado' : 'Pendiente' }}
          </span>
        </p>
        <p><strong>Fecha de compra:</strong> {{ formatDate(purchase.purchaseDate) }}</p>
        <p><strong>Nombre:</strong> {{ purchase.productName }}</p>
        <p><strong>Precio del producto:</strong> ${{ purchase.productPrice.toFixed(2) }}</p>
        <p><strong>Inicial:</strong> ${{ purchase.purchaseAmount.toFixed(2) }}</p>
        <p><strong>Restante:</strong> ${{ purchase.remainingAmount.toFixed(2) }}</p>
        <p><strong>Préstamo:</strong> ${{ purchase.loanAmount.toFixed(2) }}</p>
      </div>

      <div class="row mb-2">
        <div class="col-6 text-center">
          <p><strong>Plazo:</strong> {{ purchase.terms }} cuotas</p>
        </div>
        <div class="col-6 text-center">
          <p><strong>Frecuencia:</strong> {{ purchase.frequency === 2 ? 'Quincenal' : 'Mensual' }}</p>
        </div>
      </div>

      <h6><strong>Plan de Pago:</strong></h6>
      <ul class="list-group list-group-flush">
        <li v-for="(cuota, index) in purchase.cuotas" :key="index"
          class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>Cuota {{ index + 1 }}:</strong> ${{ cuota.amount.toFixed(2) }}
          </div>
          <div>
            <strong>Fecha:</strong> {{ formatDate(cuota.date) }}
          </div>
          <div>
            <strong>Pagado:</strong> {{ !cuota.paid ? 'No' : 'Si' }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PurchaseCard',
  props: {
    purchase: {
      type: Object,
      required: true
    },
    clientName: {
      type: String,
      required: true
    }
  },
  methods: {
    formatDate(date) {
      return new Date(date).toLocaleDateString();
    }
  }
}
</script>

<style scoped>
.list-group-item {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.text-success {
  color: #198754 !important;
}

.text-danger {
  color: #dc3545 !important;
}
</style> 