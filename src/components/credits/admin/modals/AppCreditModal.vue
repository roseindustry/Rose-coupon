<template>
  <div class="modal fade" id="app-credit-modal" tabindex="-1" aria-labelledby="appCreditModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="appCreditModalLabel">
            Administrar Capital de {{ getCapitalTitle }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Monto a Asignar</label>
            <div class="input-group">
              <span class="input-group-text">$</span>
              <input type="number" 
                     class="form-control" 
                     v-model.number="creditAmount"
                     min="0"
                     step="0.01" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          <button type="button" 
                  class="btn btn-theme" 
                  @click="$emit('assign', { type: creditType, amount: creditAmount })"
                  :disabled="creditAmount <= 0">
            Asignar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppCreditModal',
  props: {
    creditType: {
      type: String,
      default: '',
      validator: function(value) {
        console.log('Validating creditType:', value);
        return value === '' || ['main', 'plus', 'affiliateMain', 'alkosto'].includes(value);
      }
    },
    mainCapital: {
      type: Number,
      default: 0
    },
    plusCapital: {
      type: Number,
      default: 0
    },
    affiliateCapital: {
      type: Number,
      default: 0
    },
    alkostoCapital: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      creditAmount: 0
    }
  },
  computed: {
    getCapitalTitle() {
      switch(this.creditType) {
        case 'main':
          return 'Rose Credit';
        case 'plus':
          return 'Rose Credit Plus';
        case 'affiliateMain':
          return 'Rose Credit para Comercios';
        case 'alkosto':
          return 'Rose Alkosto y Familia';
        default:
          return 'Rose Credit';
      }
    }
  },
  watch: {
    creditType: {
      immediate: true,
      handler(newType) {
        switch(newType) {
          case 'main':
            this.creditAmount = this.mainCapital;
            break;
          case 'plus':
            this.creditAmount = this.plusCapital;
            break;
          case 'affiliateMain':
            this.creditAmount = this.affiliateCapital;
            break;
          case 'alkosto':
            this.creditAmount = this.alkostoCapital;
            break;
          default:
            this.creditAmount = 0;
        }
      }
    }
  }
}
</script>

<style scoped>
.btn-theme {
  background-color: #6f42c1;
  border-color: #6f42c1;
  color: white;
}

.btn-theme:hover {
  background-color: #5a32a3;
  border-color: #5a32a3;
  color: white;
}
</style> 