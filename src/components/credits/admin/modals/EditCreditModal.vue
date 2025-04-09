<template>
  <div class="modal fade" id="edit-credit-modal" tabindex="-1" aria-labelledby="editCreditModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="editCreditModalLabel">
            Editar Crédito {{ creditLine === 'main' ? 'Principal' : 'Plus' }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        
        <!-- Only show content if userData exists -->
        <template v-if="userData">
          <div class="modal-body">
            <div class="mb-3">
              <h6>{{ userType === 'client' ? 'Cliente' : 'Comercio' }}</h6>
              <p>
                {{ userType === 'client' ? 
                  `${userData.firstName} ${userData.lastName}` : 
                  userData.companyName }}
              </p>
              <p>
                <strong>{{ userType === 'client' ? 'CI: ' : 'RIF: ' }}</strong>
                {{ userType === 'client' ? userData.identification : userData.rif }}
              </p>
            </div>

            <div class="mb-3">
              <label class="form-label">Nuevo Monto</label>
              <div class="input-group">
                <span class="input-group-text">$</span>
                <input type="number" 
                       class="form-control" 
                       v-model.number="newCreditAmount"
                       min="0"
                       step="0.01" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button type="button" 
                    class="btn btn-theme" 
                    @click="updateCredit"
                    :disabled="!newCreditAmount || newCreditAmount <= 0">
              Actualizar
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EditCreditModal',
  props: {
    userData: {
      type: Object,
      required: false,
      default: null
    },
    userType: {
      type: String,
      required: true,
      default: 'client',
      validator: value => ['client', 'affiliate'].includes(value)
    },
    creditLine: {
      type: String,
      required: true,
      default: '',
      validator: value => ['main', 'plus', ''].includes(value)
    }
  },
  data() {
    return {
      newCreditAmount: 0
    }
  },
  watch: {
    userData: {
      immediate: true,
      handler(newVal) {
        if (newVal?.credit) {
          this.newCreditAmount = this.creditLine === 'main' ? 
            newVal.credit.mainCredit : 
            newVal.credit.plusCredit;
        }
      }
    }
  },
  methods: {
    updateCredit() {
      if (!this.userData) return;
      
      this.$emit('update', {
        clientName: this.userData.firstName + ' ' + this.userData.lastName,
        affiliateName: this.userData.companyName,
        email: this.userData.email,
        userId: this.userData.id,
        creditLine: this.creditLine,
        creditType: this.userType,
        amount: this.newCreditAmount
      });
    }
  }
}
</script> 