<template>
  <div class="row g-3 justify-content-center mb-3">
    <div class="col-12 col-sm-6 col-md-4" v-for="stat in creditStats" :key="stat.id">
      <CreditCard :title="stat.title" :amount="stat.amount">
        <CustomButton 
          v-if="stat.manageable" 
          text="Administrar" 
          button-class="btn-theme btn-sm px-3 mt-2 shadow-sm" 
          :on-click="() => handleManage(stat.id)" 
        />
      </CreditCard>
    </div>
  </div>
</template>

<script>
import CreditCard from '../shared/CreditCard.vue'
import CustomButton from '@/components/app/CustomButton.vue';

export default {
  name: 'AppCreditStats',
  components: {
    CreditCard,
    CustomButton
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
    }
  },
  methods: {
    handleManage(statId) {
      this.$emit('manage', statId);
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
        }
      ]
    }
  }
}
</script>