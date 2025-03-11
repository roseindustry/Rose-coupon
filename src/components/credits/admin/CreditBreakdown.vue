<template>
  <div>
    <!-- Main line -->
    <div class="row g-3 mb-4">
      <h6 class="ps-2 text-muted fw-500 mb-2">Línea Rose Credit Principal</h6>
      <div v-for="stat in mainLineStats" :key="stat.title" class="col-12 col-sm-6 col-md-3">
        <CreditManagement :title="stat.title" :amount="stat.amount" />
      </div>
    </div>

    <!-- Plus line -->
    <div class="row g-3 mb-4">
      <h6 class="ps-2 text-muted fw-500 mb-2">Línea Rose Credit Plus</h6>
      <div v-for="stat in plusLineStats" :key="stat.title" class="col-12 col-sm-6 col-md-3">
        <CreditManagement :title="stat.title" :amount="stat.amount" />
      </div>
    </div>

    <!-- Affiliates line -->
    <div class="row g-3 mb-4">
      <h6 class="ps-2 text-muted fw-500 mb-2">Línea para Comercios</h6>
      <div v-for="stat in affiliateLineStats" :key="stat.title" class="col-12 col-sm-6 col-md-3">
        <CreditManagement :title="stat.title" :amount="stat.amount" />
      </div>
    </div>
  </div>
</template>

<script>
import CreditManagement from '../shared/CreditManagement.vue'

export default {
  name: 'CreditBreakdown',
  components: {
    CreditManagement
  },
  props: {
    // Main line stats
    mainCreditUsed: Number,
    mainCreditAvailable: Number,
    mainAssignedCapital: Number,
    mainAvailableToAssign: Number,
    
    // Plus line stats
    plusCreditUsed: Number,
    plusCreditAvailable: Number,
    plusAssignedCapital: Number,
    plusAvailableToAssign: Number,
    
    // Affiliate line stats
    affMainCreditUsed: Number,
    affMainCreditAvailable: Number,
    affMainAssignedCapital: Number,
    affMainAvailableToAssign: Number
  },
  computed: {
    mainLineStats() {
      return [
        { title: 'Capital Usado', amount: this.mainCreditUsed },
        { title: 'Capital Disponible', amount: this.mainCreditAvailable },
        { title: 'Capital Asignado', amount: this.mainAssignedCapital },
        { title: 'Capital Disponible para Asignar', amount: this.mainAvailableToAssign }
      ]
    },
    plusLineStats() {
      return [
        { title: 'Capital Usado', amount: this.plusCreditUsed },
        { title: 'Capital Disponible', amount: this.plusCreditAvailable },
        { title: 'Capital Asignado', amount: this.plusAssignedCapital },
        { title: 'Capital Disponible para Asignar', amount: this.plusAvailableToAssign }
      ]
    },
    affiliateLineStats() {
      return [
        { title: 'Capital Usado', amount: this.affMainCreditUsed },
        { title: 'Capital Disponible', amount: this.affMainCreditAvailable },
        { title: 'Capital Asignado', amount: this.affMainAssignedCapital },
        { title: 'Capital Disponible para Asignar', amount: this.affMainAvailableToAssign }
      ]
    }
  }
}
</script>

<style scoped>
.fw-500 {
  font-weight: 500;
}

h6 {
  color: #212529;
}

.text-muted {
  color: #6c757d !important;
}
</style> 