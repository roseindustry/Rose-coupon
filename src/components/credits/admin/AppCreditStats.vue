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
<style>
/* Button Styles */
.btn-outline-theme, .btn-theme {
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
}

.btn-outline-danger, .btn-outline-success { 
  border-radius: 20px;
}

.btn-outline-theme {
    border-color: purple;
    color: purple;
}

.btn-outline-theme:hover {
    background-color: purple;
    color: white;
    box-shadow: 0 2px 5px rgba(128,0,128,0.3);
}

.btn-theme {
    background-color: purple;
    border-color: purple;
    color: white;
}

.btn-theme:hover {
    background-color: #8a2be2;
    border-color: #8a2be2;
    box-shadow: 0 2px 5px rgba(138,43,226,0.3);
}
</style>