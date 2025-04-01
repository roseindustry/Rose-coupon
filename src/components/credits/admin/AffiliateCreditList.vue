<template>
  <div class="affiliate-list-container">
    <!-- Header Section -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0 text-white">Estado de crédito por Afiliado</h4>
      <button class="btn btn-theme" @click="$emit('assign-credit')">
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
          <button class="btn btn-theme" @click="$emit('view-details', affiliate)">
            <i class="fas fa-eye me-2"></i>Ver Detalles
          </button>
        </div>

        <!-- Upcoming Payments Section -->
        <div class="upcoming-payments" v-if="upcomingPayments.length">
          <div class="payments-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="fas fa-calendar-alt me-2"></i>
              Próximos Pagos
            </h6>
            <div class="payment-filter">
              <select v-model="paymentFilter" class="form-select form-select-sm">
                <option value="all">Próximos 5 pagos</option>
                <option value="0">Vence hoy</option>
                <option value="3">En 3 días o menos</option>
                <option value="5">En 5 días o menos</option>
                <option value="7">En 7 días o menos</option>
              </select>
            </div>
          </div>
          <div class="payments-table-wrapper">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Vencimiento</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Cuota</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="getAffiliatePayments(affiliate.id).length">
                  <tr v-for="payment in getAffiliatePayments(affiliate.id)" 
                      :key="`${payment.saleId}-${payment.cuotaNumber}`"
                      :class="{'table-danger': getPaymentStatus(payment.date).text === 'Hoy'}">
                    <td>{{ formatDate(payment.date) }}</td>
                    <td>
                      <span class="payment-badge" 
                            :class="getPaymentStatus(payment.date).class">
                        {{ getPaymentStatus(payment.date).text }}
                      </span>
                    </td>
                    <td>{{ payment.clientName }}</td>
                    <td>{{ payment.productName }}</td>
                    <td>{{ payment.cuotaNumber }}</td>
                    <td>${{ payment.amount.toFixed(2) }}</td>
                  </tr>
                </template>
                <tr v-else>
                  <td colspan="6" class="text-center py-3">
                    <div class="empty-payments">
                      <i class="fas fa-calendar-check text-muted mb-2"></i>
                      <p class="mb-0">No hay pagos por vencer en este período</p>
                    </div>
                  </td>
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
      filterQuery: this.filterAffiliates,
      paymentFilter: 'all'
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const affiliatePayments = this.upcomingPayments.filter(payment => 
            payment.affiliateId === affiliateId
        );
        
        // First sort by date
        const sortedPayments = affiliatePayments.sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        // Filter based on selected option
        const filteredPayments = sortedPayments.filter(payment => {
            const paymentDate = new Date(payment.date);
            // Set to noon to avoid timezone issues
            paymentDate.setHours(12, 0, 0, 0);
            
            // Calculate difference in days using getTime for consistency
            const diffTime = paymentDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Show payments due within the selected period
            if (this.paymentFilter === 'all') {
                return diffDays <= 7; // Show all payments due within 7 days
            }
            
            return diffDays <= parseInt(this.paymentFilter);
        });

        // If showing all payments, get 5 closest payments
        if (this.paymentFilter === 'all') {
            return filteredPayments.slice(0, 5);
        }

        return filteredPayments;
    },
    getPaymentStatus(date) {
        // Create dates without time component to avoid timezone issues
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Parse the date and handle timezone offset
        const paymentDate = new Date(date);
        // Adjust for timezone offset to ensure correct date comparison
        paymentDate.setHours(12, 0, 0, 0); // Set to noon to avoid any timezone issues
        
        // Calculate difference in days
        const diffTime = paymentDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return { text: 'Hoy', class: 'bg-danger text-white' };
        if (diffDays <= 3) return { text: '≤ 3 días', class: 'bg-warning text-dark' };
        if (diffDays <= 5) return { text: '≤ 5 días', class: 'bg-info text-white' };
        if (diffDays <= 7) return { text: '≤ 7 días', class: 'bg-primary text-white' };
        
        return { text: '', class: '' };
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const payments = [];

        this.affiliates.forEach(affiliate => {
            // Skip if no credit or sales
            if (!affiliate.credit?.sales) return;

            // Get sales as array
            const sales = Object.entries(affiliate.credit.sales);
            
            sales.forEach(([saleId, sale]) => {
                // Skip if no cuotas
                if (!sale.cuotas) return;

                // Get cuotas as array
                const cuotas = Object.entries(sale.cuotas);
                
                cuotas.forEach(([cuotaId, cuota]) => {
                    const cuotaDate = new Date(cuota.date);
                    
                    // Only include unpaid future cuotas
                    if (!cuota.isPaid && cuotaDate >= today) {
                        payments.push({
                            affiliateId: affiliate.id,
                            clientId: sale.clientId,
                            clientName: sale.clientName,
                            saleId: saleId,
                            productName: sale.productName,
                            date: cuota.date,
                            cuotaNumber: cuota.number,
                            amount: cuota.amount
                        });
                    }
                });
            });
        });

        // Sort by date ascending (closest first)
        return payments.sort((a, b) => new Date(a.date) - new Date(b.date));
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

.payment-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.bg-danger {
  background-color: #dc3545 !important;
}

.bg-warning {
  background-color: #ffc107 !important;
}

.bg-info {
  background-color: #0dcaf0 !important;
}

.bg-primary {
  background-color: #6f42c1 !important;
}

.table-danger {
  background-color: rgba(220, 53, 69, 0.15) !important;
}

.payments-table-wrapper td {
  vertical-align: middle;
}

@media (max-width: 768px) {
  .payment-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
}

.payment-filter {
    min-width: 140px;
}

.payment-filter .form-select {
    background-color: #1a1a1a;
    border-color: #444;
    color: #fff;
    font-size: 0.875rem;
    padding: 0.25rem 2rem 0.25rem 0.5rem;
}

.payment-filter .form-select:focus {
    border-color: #6f42c1;
    box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

.payment-filter .form-select option {
    background-color: #1a1a1a;
    color: #fff;
}

.payments-header {
    padding-bottom: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #444;
}

@media (max-width: 768px) {
    .payments-header {
        flex-direction: column;
        gap: 1rem;
    }
    
    .payment-filter {
        width: 100%;
    }
}

.empty-payments {
    padding: 1.5rem;
    text-align: center;
    color: #adb5bd;
}

.empty-payments i {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}

.empty-payments p {
    font-size: 0.875rem;
}
</style> 