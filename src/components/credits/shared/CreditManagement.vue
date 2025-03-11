<template>
  <div class="card custom-card h-100 shadow-sm border-0 rounded-lg">
    <div class="card-body text-center py-4">
      <h6 class="card-title mb-3 fs-6">{{ title }}</h6>
      <h4 class="mb-0"><strong>${{ amount.toFixed(2) }}</strong></h4>
      <slot></slot>
    </div>
  </div>
</template>
<script>
export default {
  name: 'CreditManagement',
  props: {
    title: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      default: 0
    }
  }
}
</script> 
<style scoped>
.custom-card {
  transition: transform .2s ease-in-out, box-shadow .2s ease-in-out;
  background-color: #2d2d2d;
}

.custom-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

.card-title {
  font-weight: 500;
  letter-spacing: 0.3px;
  color: #adb5bd;
}

h4 {
  color: #fff;
}
</style> 