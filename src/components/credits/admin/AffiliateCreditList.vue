<template>
  <div class="affiliate-list-container">
    <!-- Header Section -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0 text-white">Estado de crédito por Afiliado</h4>
      <button class="btn btn-outline-primary" @click="$emit('assign-credit')">
        <i class="fas fa-plus-circle me-2"></i>
        Asignar Crédito
      </button>
    </div>

    <!-- Search Bar -->
    <div class="search-wrapper mb-4">
      <div class="search-container">
        <i class="fas fa-search search-icon"></i>
        <input type="text" 
               class="form-control search-input" 
               v-model="filterQuery"
               placeholder="Buscar afiliado por nombre o RIF..." 
               @input="handleFilterChange">
      </div>
    </div>

    <div class="affiliates-table-wrapper">
      <div class="affiliate-item" v-for="affiliate in affiliates" :key="affiliate.id">
        <div class="affiliate-header">
          <div class="affiliate-info">
            <h5 class="affiliate-name">{{ affiliate.companyName }}</h5>
            <span class="affiliate-id">RIF: {{ affiliate.rif }}</span>
          </div>
          <div class="affiliate-status">
            <span v-if="affiliate.subscription" 
                  class="status-badge"
                  :class="{ 'active': affiliate.subscription }">
              {{ affiliate.subscription ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>

        <div class="credit-summary">
          <div class="credit-block">
            <div class="credit-type">
              <span class="label">Principal</span>
              <div class="amount" :class="{'text-success': affiliate.credit.mainCredit}">
                ${{ affiliate.credit.mainCredit?.toFixed(2) || '0.00' }}
              </div>
              <div class="available-amount">
                Disponible: ${{ affiliate.credit.availableMainCredit?.toFixed(2) || '0.00' }}
              </div>
              <div class="sales-info mt-2" v-if="affiliate.credit.sales?.length">
                <small class="text-muted">
                  Total ventas: {{ affiliate.credit.sales.length }}
                </small>
              </div>
            </div>
            <div class="credit-actions" v-if="affiliate.credit.mainCredit">
              <button class="btn btn-icon" @click="$emit('edit-credit', affiliate, 'affiliate', 'main')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-icon text-danger" @click="$emit('remove-credit', affiliate, 'affiliate', 'main')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="credit-block">
            <div class="credit-type">
              <span class="label">Plus</span>
              <div class="amount" :class="{'text-success': affiliate.credit.plusCredit}">
                ${{ affiliate.credit.plusCredit?.toFixed(2) || '0.00' }}
              </div>
              <div class="available-amount">
                Disponible: ${{ affiliate.credit.availablePlusCredit?.toFixed(2) || '0.00' }}
              </div>
            </div>
            <div class="credit-actions" v-if="affiliate.credit.plusCredit">
              <button class="btn btn-icon" @click="$emit('edit-credit', affiliate, 'affiliate', 'plus')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-icon text-danger" @click="$emit('remove-credit', affiliate, 'affiliate', 'plus')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="affiliate-actions">
          <button class="btn btn-outline-primary" @click="$emit('view-details', affiliate)">
            <i class="fas fa-eye me-2"></i>Ver Detalles
          </button>
        </div>

        <!-- Upcoming Payments Section -->
        <div class="upcoming-payments" v-if="getAffiliatePayments(affiliate.id).length">
          <div class="payments-header">
            <h6 class="mb-3">
              <i class="fas fa-calendar-alt me-2"></i>
              Próximos Pagos
            </h6>
          </div>
          <div class="payments-table-wrapper">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Cuota</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="payment in getAffiliatePayments(affiliate.id).slice(0, 5)" 
                    :key="`${payment.saleId}-${payment.cuotaNumber}`">
                  <td>{{ formatDate(payment.date) }}</td>
                  <td>{{ payment.clientName }}</td>
                  <td>{{ payment.productName }}</td>
                  <td>{{ payment.cuotaNumber }}</td>
                  <td>${{ payment.amount.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="affiliates.length === 0" class="empty-state">
      <i class="fas fa-store text-muted mb-3"></i>
      <h5>No hay afiliados con crédito asignado</h5>
      <p class="text-muted">Asigne crédito a un afiliado para comenzar</p>
    </div>

    <!-- Pagination -->
    <nav class="my-5" v-if="totalPages > 1" aria-label="Page navigation">
      <ul class="pagination justify-content-center custom-pagination">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <button class="page-link" 
                  @click="handlePageChange(currentPage - 1)"
                  :disabled="currentPage === 1">
            Anterior
          </button>
        </li>
        <li class="page-item" 
            v-for="page in totalPages" 
            :key="page"
            :class="{ active: page === currentPage }">
          <button class="page-link" 
                  @click="handlePageChange(page)">
            {{ page }}
          </button>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <button class="page-link" 
                  @click="handlePageChange(currentPage + 1)"
                  :disabled="currentPage === totalPages">
            Siguiente
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script>
export default {
  name: 'AffiliateCreditList',
  props: {
    affiliates: {
      type: Array,
      required: true
    },
    currentPage: {
      type: Number,
      required: true
    },
    totalPages: {
      type: Number,
      required: true
    },
    filterAffiliates: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      filterQuery: this.filterAffiliates
    }
  },
  methods: {
    handlePageChange(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.$emit('page-change', page);
      }
    },
    handleFilterChange(event) {
      this.filterQuery = event.target.value;
      this.$emit('update:filter-affiliates', this.filterQuery);
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    },
    getAffiliatePayments(affiliateId) {
      return this.upcomingPayments.filter(payment => payment.affiliateId === affiliateId);
    }
  },
  watch: {
    filterAffiliates: {
      immediate: true,
      handler(newVal) {
        this.filterQuery = newVal;
      }
    }
  },
  computed: {
    upcomingPayments() {
      // Get current month's start and end dates
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const allPayments = this.affiliates.reduce((payments, affiliate) => {
        if (!affiliate.credit?.sales) return payments;
        
        // Group payments by client
        const clientPayments = {};
        
        const salesPayments = Object.entries(affiliate.credit.sales)
          .flatMap(sale => {
            const [saleId, saleData] = sale;
            if (!saleData.cuotas) return [];
            
            // Find the next unpaid cuota for this sale
            const nextUnpaidCuota = saleData.cuotas
              .map((cuota, index) => ({ ...cuota, index }))
              .filter(cuota => {
                const cuotaDate = new Date(cuota.date);
                return !cuota.paid && 
                       cuotaDate >= startOfMonth && 
                       cuotaDate <= endOfMonth;
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
            
            if (!nextUnpaidCuota) return [];
            
            const payment = {
              affiliateId: affiliate.id,
              affiliateName: affiliate.companyName,
              saleId,
              clientName: saleData.clientName,
              clientId: saleData.client_id,
              productName: saleData.productName,
              cuotaNumber: nextUnpaidCuota.index + 1,
              date: nextUnpaidCuota.date,
              amount: nextUnpaidCuota.amount,
              paid: nextUnpaidCuota.paid
            };
            
            // Keep only the earliest payment for each client
            if (!clientPayments[saleData.client_id] || 
                new Date(payment.date) < new Date(clientPayments[saleData.client_id].date)) {
              clientPayments[saleData.client_id] = payment;
            }
            
            return [];
          });
        
        return [...payments, ...Object.values(clientPayments)];
      }, []).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return allPayments;
    }
  }
}
</script>

<style scoped>
/* Use the same styles as ClientCreditList but replace client- with affiliate- */
.affiliate-list-container {
  padding: 1rem;
}

.affiliates-table-wrapper {
  background: #29122f;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.affiliate-item {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.affiliate-item:last-child {
  border-bottom: none;
}

.affiliate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.affiliate-info {
  flex: 1;
}

.affiliate-name {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.affiliate-id {
  color: #ffffff;
  font-size: 0.9rem;
  display: block;
  margin-top: 0.25rem;
}

/* Rest of the styles remain the same as ClientCreditList */
.status-badge {
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: #e9ecef;
  color: #666;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

/* ... Copy the rest of the styles from ClientCreditList ... */

.credit-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.credit-block {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.credit-type {
  flex: 1;
}

.label {
  color: #666;
  font-size: 0.9rem;
  display: block;
  margin-bottom: 0.5rem;
}

.amount {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d2d2d;
  margin-bottom: 0.25rem;
}

.available-amount {
  color: #666;
  font-size: 0.85rem;
}

.credit-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  padding: 0.5rem;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #6c757d;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e9ecef;
  color: #2d2d2d;
}

.affiliate-actions {
  display: flex;
  justify-content: flex-end;
}

.search-wrapper {
  background: #fff;
  border-radius: 8px;
  padding: 0.5rem;
}

.search-input {
  border: none;
  background: transparent;
  color: #000000;
  height: 40px;  
}

.search-input::placeholder {
  color: #999999;
}

.search-input:focus {
  box-shadow: none;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  margin: 2rem 0;
}

.empty-state i {
  font-size: 3rem;
  display: block;
}

.custom-pagination .page-link {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.custom-pagination .page-link:hover {
  background-color: #6f42c1;
  border-color: #6f42c1;
}

.custom-pagination .page-item.active .page-link {
  background-color: #6f42c1;
  border-color: #6f42c1;
}

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

.btn-outline-info,
.btn-outline-primary {
  color: #fff;
  border-width: 1px;
}

.btn-outline-info:hover,
.btn-outline-primary:hover {
  color: #000;
}

@media (max-width: 768px) {
  .credit-summary {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .affiliate-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .status-badge {
    align-self: flex-start;
  }
}

.upcoming-payments {
  margin-top: 1.5rem;
  background: #29122f;
  border-radius: 8px;
  padding: 1rem;
}

.payments-header {
  color: white;
  border-bottom: 1px solid #444;
  margin-bottom: 1rem;
}

.payments-table-wrapper {
  overflow-x: auto;
}

.payments-table-wrapper table {
  color: #fff;
  margin-bottom: 0;
}

.payments-table-wrapper th {
  background: #6f42c1;
  color: white;
  border-color: #444;
}

.payments-table-wrapper td {
  border-color: #444;
  vertical-align: middle;
}

@media (max-width: 768px) {
  .payments-table-wrapper {
    margin: 0 -1rem;
  }
  
  .payments-table-wrapper table {
    font-size: 0.875rem;
  }
}
</style> 