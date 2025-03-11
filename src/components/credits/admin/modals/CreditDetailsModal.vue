<template>
  <div class="modal fade" id="credit-details-modal" tabindex="-1" aria-labelledby="creditDetailsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="creditDetailsModalLabel">
            Detalles de Crédito
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <!-- Only show content if userData exists -->
        <template v-if="userData">
          <div class="modal-body">
            <!-- User Info -->
            <div class="card mb-4">
              <div class="card-body">
                <h6 class="card-title">
                  {{ isClient ? 'Información del Cliente' : 'Información del Comercio' }}
                </h6>
                <p class="mb-1">
                  <strong>{{ isClient ? 'Nombre:' : 'Empresa:' }}</strong>
                  {{ isClient ? 
                    `${userData.firstName} ${userData.lastName}` : 
                    userData.companyName }}
                </p>
                <p class="mb-1">
                  <strong>{{ isClient ? 'CI:' : 'RIF:' }}</strong>
                  {{ isClient ? userData.identification : userData.rif }}
                </p>
                <p class="mb-1">
                  <strong>Email:</strong> {{ userData.email }}
                </p>
              </div>
            </div>

            <!-- Credit Stats -->
            <div class="row g-3 mb-4">
              <div class="col-md-6" v-if="userData.credit?.mainCredit">
                <div class="card">
                  <div class="card-header bg-primary text-white">
                    <h6 class="mb-0">Crédito Principal</h6>
                  </div>
                  <div class="card-body">
                    <p class="mb-1">
                      <strong>Aprobado:</strong> ${{ userData.credit.mainCredit.toFixed(2) }}
                    </p>
                    <p class="mb-1">
                      <strong>Disponible:</strong> ${{ userData.credit.availableMainCredit.toFixed(2) }}
                    </p>
                    <p class="mb-0">
                      <strong>Usado:</strong> 
                      ${{ (userData.credit.mainCredit - userData.credit.availableMainCredit).toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="col-md-6" v-if="isClient && userData.credit?.plusCredit">
                <div class="card">
                  <div class="card-header bg-primary text-white">
                    <h6 class="mb-0">Crédito Plus</h6>
                  </div>
                  <div class="card-body">
                    <p class="mb-1">
                      <strong>Aprobado:</strong> ${{ userData.credit.plusCredit.toFixed(2) }}
                    </p>
                    <p class="mb-1">
                      <strong>Disponible:</strong> ${{ userData.credit.availablePlusCredit.toFixed(2) }}
                    </p>
                    <p class="mb-0">
                      <strong>Usado:</strong> 
                      ${{ (userData.credit.plusCredit - userData.credit.availablePlusCredit).toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Purchase History -->
            <div class="card">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0">Historial de Compras</h6>
              </div>
              <div class="card-body">
                <div v-if="purchases && purchases.length" class="accordion" id="purchasesAccordion">
                  <div v-for="(purchase, index) in purchases" :key="purchase.purchaseId" class="accordion-item">
                    <h2 class="accordion-header">
                      <button class="accordion-button collapsed" type="button" 
                              :data-bs-target="`#purchase-${index}`"
                              data-bs-toggle="collapse">
                        {{ purchase.productName }} - {{ formatDate(purchase.purchaseDate) }}
                      </button>
                    </h2>
                    <div :id="`purchase-${index}`" class="accordion-collapse collapse" data-bs-parent="#purchasesAccordion">
                      <div class="accordion-body">
                        <p><strong>Producto:</strong> {{ purchase.productName }}</p>
                        <p><strong>Precio:</strong> ${{ purchase.productPrice.toFixed(2) }}</p>
                        <p><strong>Inicial:</strong> ${{ purchase.purchaseAmount.toFixed(2) }}</p>
                        <p><strong>Préstamo:</strong> ${{ purchase.loanAmount.toFixed(2) }}</p>
                        <p><strong>Plazo:</strong> {{ purchase.terms }} cuotas</p>
                        <p><strong>Frecuencia:</strong> {{ purchase.frequency === 2 ? 'Quincenal' : 'Mensual' }}</p>
                        
                        <h6 class="mt-3">Cuotas:</h6>
                        <div class="table-responsive">
                          <table class="table table-sm">
                            <thead>
                              <tr>
                                <th>N°</th>
                                <th>Fecha</th>
                                <th>Monto</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(cuota, cuotaIndex) in purchase.cuotas" :key="cuotaIndex">
                                <td>{{ cuotaIndex + 1 }}</td>
                                <td>{{ formatDate(cuota.date) }}</td>
                                <td>${{ cuota.amount.toFixed(2) }}</td>
                                <td>
                                  <span :class="cuota.paid ? 'text-success' : 'text-danger'">
                                    {{ cuota.paid ? 'Pagado' : 'Pendiente' }}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="text-center text-muted my-3">
                  No hay compras registradas
                </p>
              </div>
            </div>
          </div>
        </template>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreditDetailsModal',
  props: {
    userData: {
      type: Object,
      required: false,
      default: null
    },
    isClient: {
      type: Boolean,
      required: true,
      default: true
    },
    purchases: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) return '';
      const [year, month, day] = dateString.split("-");
      return `${day}-${month}-${year}`;
    }
  }
}
</script> 