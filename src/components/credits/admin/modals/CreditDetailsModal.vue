<template>
  <div class="modal fade" id="credit-details-modal" tabindex="-1" aria-labelledby="creditDetailsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <div class="d-flex justify-content-between align-items-center w-100">
            <h5 class="modal-title" id="creditDetailsModalLabel">
              Detalles de Crédito
            </h5>            
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <!-- Only show content if userData exists -->
        <template v-if="userData">
          <div class="modal-body">
            <!-- User Info -->
            <div class="user-info-section mb-4">
              <div class="stat-header">                  
                <h6 class="card-title">
                  <i class="fas fa-user me-2"></i>
                  {{ isAffiliate ? 'Información del Comercio' : 'Información del Cliente' }}
                </h6>
              </div>
              <div class="info-content">
                <div class="info-grid">
                  <div class="info-item">
                    <strong>{{ isAffiliate ? 'Empresa:' : 'Nombre:' }}</strong>
                    <span>{{ isAffiliate ? userData.companyName.charAt(0).toUpperCase() + userData.companyName.slice(1) : `${userData.firstName.charAt(0).toUpperCase() + userData.firstName.slice(1)} ${userData.lastName.charAt(0).toUpperCase() + userData.lastName.slice(1)}` }}</span>
                  </div>
                  <div class="info-item">
                    <strong>{{ isAffiliate ? 'RIF:' : 'CI:' }}</strong>
                    <span>{{ isAffiliate ? userData.rif : userData.identification }}</span>
                  </div>
                  <div class="info-item">
                    <strong>Email:</strong>
                    <span>{{ userData.email }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Credit Stats -->
            <div class="credit-stats-grid mb-4">
              <div class="credit-stat-card" v-if="userData.credit?.mainCredit">
                <div class="stat-header">                  
                  <h6>
                    <i class="fas fa-wallet me-2"></i>
                    Crédito Principal
                  </h6>
                </div>
                <div class="stat-body">
                  <div class="stat-row">
                    <p class="mb-1">
                      <strong>Aprobado:</strong> ${{ userData.credit.mainCredit.toFixed(2) }}
                    </p>
                  </div>
                  <div class="stat-row">
                    <p class="mb-1">
                      <strong>Disponible:</strong> ${{ userData.credit.availableMainCredit.toFixed(2) }}
                    </p>
                  </div>
                  <div class="stat-row">
                    <p class="mb-0">
                      <strong>Usado:</strong> 
                      ${{ (userData.credit.mainCredit - userData.credit.availableMainCredit).toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="credit-stat-card" v-if="!isAffiliate && userData.credit?.plusCredit">
                <div class="stat-header">
                  <i class="fas fa-star"></i>
                  <h6>Crédito Plus</h6>
                </div>
                <div class="stat-body">
                  <div class="stat-row">
                    <p class="mb-1">
                      <strong>Aprobado:</strong> ${{ userData.credit.plusCredit.toFixed(2) }}
                    </p>
                  </div>
                  <div class="stat-row">
                    <p class="mb-1">
                      <strong>Disponible:</strong> ${{ userData.credit.availablePlusCredit.toFixed(2) }}
                    </p>
                  </div>
                  <div class="stat-row">
                    <p class="mb-0">
                      <strong>Usado:</strong> 
                      ${{ (userData.credit.plusCredit - userData.credit.availablePlusCredit).toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Purchase History -->
            <div class="purchase-history-section">
              <div class="section-header">
                <div class="d-flex justify-content-between align-items-center">                  
                  <h6 class="mb-0"><i class="fas fa-receipt me-2"></i>
                    {{ isAffiliate ? 'Historial de Ventas' : 'Historial de Compras' }}
                  </h6>
                  <div class="date-filters d-flex gap-2 align-items-center">
                    <div class="input-group input-group-sm">
                      <span class="input-group-text">Desde</span>
                      <input type="date" class="form-control" v-model="dateRange.from">
                    </div>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text">Hasta</span>
                      <input type="date" class="form-control" v-model="dateRange.to">
                    </div>
                    <button class="btn btn-sm btn-outline-secondary" 
                            @click="clearFilters" 
                            :disabled="!dateRange.from && !dateRange.to">
                      <i class="fas fa-times me-1"></i>
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
              <div class="history-content">
                <div v-if="isAffiliate ? filteredSales.length : filteredPurchases.length" class="purchase-list">
                  <!-- Show affiliate sales -->
                  <template v-if="isAffiliate">
                    <div v-for="sale in filteredSales" 
                         :key="sale.id" 
                         class="purchase-item">
                      <div class="purchase-header" @click="togglePurchase(sale.id)">
                        <div class="purchase-summary">
                          <span class="product-name">{{ sale.productName }}</span>
                          <span class="purchase-date">{{ formatDate(sale.purchaseDate) }}</span>
                          <span class="purchase-amount">${{ sale.productPrice.toFixed(2) }}</span>
                          <span class="purchase-status" :class="sale.paid ? 'text-success' : 'text-warning'">{{ sale.paid ? 'Completado' : 'En Proceso' }}</span>
                        </div>
                        <i class="fas" :class="selectedPurchase === sale.id ? 
                           'fa-chevron-up' : 'fa-chevron-down'"></i>
                      </div>
                      <transition name="slide">
                        <div class="purchase-details" 
                             v-if="selectedPurchase === sale.id">
                          <div class="details-grid">
                            <div class="detail-item">
                              <span class="label me-2">Cliente:</span>
                              <span class="value">{{ sale.clientName }}</span>
                            </div>
                            <div class="detail-item">
                              <span class="label me-2">Estado:</span>
                              <span class="value" :class="sale.paid ? 'text-success' : 'text-warning'">
                                {{ sale.paid ? 'Completado' : 'En Proceso' }}
                              </span>
                            </div>
                            <div class="detail-item">
                              <span class="label me-2">Inicial:</span>
                              <span class="value">${{ sale.purchaseAmount.toFixed(2) }}</span>
                            </div>
                            <div class="detail-item">
                              <span class="label me-2">Préstamo:</span>
                              <span class="value">${{ sale.loanAmount.toFixed(2) }}</span>
                            </div>
                          </div>
                          <div class="installments-table" v-if="sale.cuotas">
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
                                <tr v-for="(cuota, cuotaIndex) in sale.cuotas" :key="cuotaIndex">
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
                      </transition>
                    </div>
                  </template>
                  <!-- Show client purchases -->
                  <template v-else>
                    <div v-for="purchase in filteredPurchases" 
                         :key="purchase.id" 
                         class="purchase-item">
                      <div class="purchase-header" @click="togglePurchase(purchase.id)">
                        <div class="purchase-summary">
                          <span class="product-name">{{ purchase.productName }}</span>
                          <span class="purchase-date">{{ formatDate(purchase.purchaseDate) }}</span>
                          <span class="purchase-amount">${{ purchase.productPrice.toFixed(2) }}</span>
                          <span class="purchase-status" :class="purchase.paid ? 'text-success' : 'text-warning'">{{ purchase.paid ? 'Completado' : 'En Proceso' }}</span>
                        </div>
                        <i class="fas" :class="selectedPurchase === purchase.id ? 
                           'fa-chevron-up' : 'fa-chevron-down'"></i>
                      </div>
                      <transition name="slide">
                        <div class="purchase-details" 
                             v-if="selectedPurchase === purchase.id">
                          <div class="details-grid">
                            <div class="detail-item">
                              <span class="label me-2">Inicial:</span>
                              <span class="value">${{ purchase.purchaseAmount.toFixed(2) }}</span>
                            </div>
                            <div class="detail-item">
                              <span class="label me-2">Préstamo:</span>
                              <span class="value">${{ purchase.loanAmount.toFixed(2) }}</span>
                            </div>
                            <div class="detail-item">
                              <span class="label me-2">Plazo:</span>
                              <span class="value">{{ purchase.terms }} cuotas</span>
                            </div>
                            <div class="detail-item">
                              <span class="label me-2">Frecuencia:</span>
                              <span class="value">{{ purchase.frequency === 2 ? 'Quincenal' : 'Mensual' }}</span>
                            </div>
                          </div>
                          <div class="installments-table">
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
                      </transition>
                    </div>
                  </template>
                </div>
                <div v-else class="no-purchases">
                  <i class="fas fa-receipt"></i>
                  <p>{{ isAffiliate ? 'No hay ventas' : 'No hay compras' }} en el período seleccionado</p>
                </div>
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
      required: false,
      default: true
    },
    isAffiliate: {
      type: Boolean,
      required: false,
      default: false
    },
    purchases: {
      type: Array,
      default: () => []
    },
    sales: {
      type: [Array, Object],
      default: () => ({})
    }
  },
  data() {
    return {
      dateRange: {
        from: '',
        to: new Date().toISOString().split('T')[0]
      },
      selectedPurchase: null,
      selectedSale: null
    }
  },
  computed: {
    salesArray() {
      const sales = this.userData?.credit?.sales;
      if (!sales || typeof sales !== 'object') return [];
      
      return Object.values(this.userData.credit.sales)
        .map(sale => ({
          ...sale,
          // clientName: sale.clientName ? sale.clientName : this.getClientName(sale.client_id),
          purchaseDate: sale.purchaseDate || new Date().toISOString().split('T')[0],
          paid: sale.cuotas?.every(cuota => cuota.paid) || false
        }))
        .sort((a, b) => {
          const dateA = new Date(a.purchaseDate);
          const dateB = new Date(b.purchaseDate);
          return dateB - dateA;
        });
    },
    purchasesArray() {
      const purchases = this.purchases;
      if (!purchases || typeof purchases !== 'object') return [];
      
      return this.purchases
        .map(purchase => ({ 
          ...purchase,
          purchaseDate: purchase.purchaseDate || new Date().toISOString().split('T')[0],
          paid: purchase.cuotas?.every(cuota => cuota.paid) || false
        }))
        .sort((a, b) => {
          const dateA = new Date(a.purchaseDate); 
          const dateB = new Date(b.purchaseDate);
          return dateB - dateA;
        });
    },
    filteredSales() {
      if (!this.salesArray.length) return [];

      return this.salesArray.filter(sale => {
        if (!this.dateRange.from && !this.dateRange.to) return true;
        const saleDate = new Date(sale.purchaseDate);
        const fromDate = this.dateRange.from ? new Date(this.dateRange.from) : null;
        const toDate = this.dateRange.to ? new Date(this.dateRange.to) : null;
        
        if (fromDate && toDate) {
          return saleDate >= fromDate && saleDate <= toDate;
        } else if (fromDate) {
          return saleDate >= fromDate;
        } else if (toDate) {
          return saleDate <= toDate;
        }
        return true;
      }).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    },
    filteredPurchases() {
      if (!this.purchasesArray.length) return [];
        return this.purchasesArray.filter(purchase => {
        if (!this.dateRange.from && !this.dateRange.to) return true;
        const purchaseDate = new Date(purchase.purchaseDate);
        const fromDate = this.dateRange.from ? new Date(this.dateRange.from) : null;
        const toDate = this.dateRange.to ? new Date(this.dateRange.to) : null;
        
        if (fromDate && toDate) {
          return purchaseDate >= fromDate && purchaseDate <= toDate;
        } else if (fromDate) {
          return purchaseDate >= fromDate;
        } else if (toDate) {
          return purchaseDate <= toDate;
        }
        return true;
      }).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    }
  },
  methods: {
    togglePurchase(purchaseId) {
      this.selectedPurchase = this.selectedPurchase === purchaseId ? null : purchaseId;
    },
    toggleSale(saleId) {
      this.selectedSale = this.selectedSale === saleId ? null : saleId;
    },
    clearFilters() {
      this.dateRange = {
        from: '',
        to: new Date().toISOString().split('T')[0]
      };
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
  }
}
</script>

<style scoped>
/* Add new styles */
.user-info-section {
  background: #29122f;
  border-radius: 12px;
  overflow: hidden;
}

.info-content {
  padding: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.credit-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.credit-stat-card {
  background: #29122f;
  border-radius: 12px;
  overflow: hidden;
}

.stat-header {
  background: #6f42c1;
  color: white;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-body {
  padding: 1.5rem;
}

.stat-row {
  padding: 0.75rem;
  border-bottom: 1px solid #dee2e6;
}

.stat-row:last-child {
  border-bottom: none;
}

.purchase-history-section {
  background: #29122f;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  background: #6f42c1;
  color: white;
  padding: 1rem;
  padding-right: 1.5rem;
}

.purchase-list {
  padding: 1rem;
}

.purchase-item {
  background: black;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.purchase-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.purchase-header:hover {
  background-color: ##6f42c1;
}

.purchase-summary {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 1rem;
  align-items: center;
}

.purchase-details {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  background: ##6f42c1;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  justify-content: center;
  align-items: center;
}

.no-purchases {
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
}

.no-purchases i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.date-filters .input-group {
  width: auto;
}

.date-filters input[type="date"] {
  width: 130px;
  height: 31px;
}

.date-filters .input-group-text {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .credit-stats-grid {
    grid-template-columns: 1fr;
  }
  
  .purchase-summary {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .date-filters {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  
  .date-filters .input-group {
    width: 100%;
  }
  
  .date-filters input[type="date"] {
    width: 100%;
  }
  
  .section-header > div {
    flex-direction: column;
    gap: 1rem;
  }
}

.btn-outline-secondary {
  color: #fff;
  border-color: #6c757d;
}

.btn-outline-secondary:hover:not(:disabled) {
  background-color: #6c757d;
  color: #fff;
}

.btn-outline-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transition animations */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}
</style> 