<template>
  <div class="row g-3 mb-4">
    <!-- Main Credit -->
    <div class="col-12 col-md-6">
      <CreditManagement 
        title="Crédito Principal Disponible"
        :amount="availableCredit || 0">
        <div class="mt-2">
          <small class="text-light">Aprobado:</small>
          <h5 class="mb-0">${{ mainCredit || 0 }}</h5>
        </div>
      </CreditManagement>
    </div>

    <!-- Plus Credit -->
    <div class="col-12 col-md-6">
      <CreditManagement 
        title="Crédito Plus Disponible"
        :amount="availablePlusCredit || 0">
        <div class="mt-2">
          <small class="text-light">Aprobado:</small>
          <h5 class="mb-0">${{ plusCredit || 0 }}</h5>
        </div>
      </CreditManagement>
    </div>
  </div>
</template>

<script>
import CreditManagement from '../shared/CreditManagement.vue'

export default {
  name: 'ClientCreditStats',
  components: {
    CreditManagement
  },
  props: {
    mainCredit: Number,
    availableCredit: Number,
    plusCredit: Number,
    availablePlusCredit: Number
  }
}
</script> 