<template>
  <div class="row g-3 justify-content-center mb-3">
    <div class="col-12 col-sm-6 col-md-4" v-for="stat in creditStats" :key="stat.id">
      <CreditManagement :title="stat.title" :amount="stat.amount">
        <a v-if="stat.manageable" 
           href="#" 
           class="btn btn-theme btn-sm px-3 mt-2 shadow-sm"
           @click.prevent="$emit('manage', stat.id)">
          Administrar
        </a>
      </CreditManagement>
    </div>
  </div>
</template>

<script>
import CreditManagement from '../shared/CreditManagement.vue'

export default {
  name: 'AppCreditStats',
  components: {
    CreditManagement
  },
  props: {
    mainCapital: {
      type: Number,
      required: true,
      default: 0
    },
    plusCapital: {
      type: Number,
      required: true,
      default: 0  
    },
    affiliateCapital: {
      type: Number,
      required: true,
      default: 0
    },
    alkostoCapital: {
      type: Number,
      required: true,
      default: 0
    }
  },
  computed: {
    creditStats() {
      return [
        {
          id: 'main',
          title: 'Capital de Rose Credit',
          amount: Number(this.mainCapital) || 0,
          manageable: true
        },
        {
          id: 'plus', 
          title: 'Capital de Rose Credit Plus',
          amount: Number(this.plusCapital) || 0,
          manageable: true
        },
        {
          id: 'affiliateMain',
          title: 'Capital de Rose Credit para Comercios',
          amount: Number(this.affiliateCapital) || 0,
          manageable: true
        },
        {
          id: 'alkosto',
          title: 'Capital de Rose Alkosto y Familia',
          amount: Number(this.alkostoCapital) || 0,
          manageable: true
        }
      ]
    }
  }
}
</script> 