<template>
  <div class="card">
    <div class="card-header">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <h5 class="text-black mb-3 mb-md-0">Mis Compras</h5>
        
        <!-- Filters Container - Stack on mobile, row on larger screens -->
        <div class="d-flex flex-column flex-lg-row gap-3">
          <!-- Date Filter - Stack on mobile, side by side on larger screens -->
          <div class="date-filter d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
            <div class="w-100 w-sm-auto">
              <label class="form-label small mb-1 text-black">Desde</label>
              <input 
                type="date" 
                class="form-control form-control-sm" 
                :value="dateFilter.startDate"
                @input="handleDateChange($event, 'startDate')"
              />
            </div>
            <div class="w-100 w-sm-auto">
              <label class="form-label small mb-1 text-black">Hasta</label>
              <input 
                type="date" 
                class="form-control form-control-sm" 
                :value="dateFilter.endDate"
                @input="handleDateChange($event, 'endDate')"
              />
            </div>
          </div>

          <!-- Status and Sort Filters - Stack on mobile, side by side on larger screens -->
          <div class="d-flex flex-column flex-sm-row gap-2">
            <!-- Status Filter -->
            <div class="w-100 w-sm-auto">
              <label class="form-label small mb-1 text-black">Estado</label>
              <select 
                class="form-select form-select-sm" 
                @change="handleFilterChange($event, 'status')"
              >
                <option 
                  v-for="status in filterOptions.status" 
                  :key="status" 
                  :value="status"
                >
                  {{ status }}
                </option>
              </select>
            </div>

            <!-- Sort -->
            <div class="w-100 w-sm-auto">
              <label class="form-label small mb-1 text-black">Ordenar por</label>
              <select 
                class="form-select form-select-sm" 
                @change="$emit('sort-change', $event.target.value)"
              >
                <option 
                  v-for="option in sortOptions" 
                  :key="option.value" 
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Clear Filters Button -->
          <div class="d-flex flex-column flex-sm-row align-items-end mt-2 mt-sm-0">
            <button 
              class="btn btn-outline-theme btn-sm w-sm-auto" 
              @click="$emit('clear-filters')"
            >
              <i class="fa-solid fa-xmark me-1"></i>
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card-body">
      <div v-if="purchases && purchases.length" class="row g-4">
        <div v-for="purchase in filteredPurchases" :key="purchase.id" class="col-12">
          <div class="card bg-dark">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 class="text-light mb-1">Tienda: {{ getAffiliateName(purchase.affiliate_id) }}</h5>
                  <h6 class="text-light mb-1">Producto: {{ purchase.productName }}</h6>
                  <small class="text-secondary">Fecha de compra: {{ formatDate(purchase.purchaseDate) }}</small>
                </div>
                <span :class="getStatusClass(purchase)" class="badge">
                  {{ purchase.cuotas?.every(cuota => cuota.paid) ? 'Completado' : 'Pendiente' }}
                </span>
              </div>
              
              <div class="row g-3 mb-3">
                <div class="col-6 col-md-3">
                  <small class="text-secondary d-block">Precio Total</small>
                  <span class="text-light">${{ Number(purchase.includeCuotaAddOn ? (purchase.purchaseAmount + purchase.loanAmountWithAddOn) : purchase.productPrice).toFixed(2) }}</span>
                </div>
                <div class="col-6 col-md-3">
                  <small class="text-secondary d-block">Cuota Inicial</small>
                  <span class="text-light">${{ Number(purchase.purchaseAmount).toFixed(2) }}</span>
                </div>
                <div class="col-6 col-md-3">
                  <small class="text-secondary d-block">Monto Préstamo</small>
                  <span class="text-light">${{ Number(purchase.includeCuotaAddOn ? purchase.loanAmountWithAddOn : purchase.loanAmount).toFixed(2) }}</span>
                </div>
                <div class="col-6 col-md-3">
                  <small class="text-secondary d-block">Cuotas</small>
                  <span class="text-light">{{ purchase.cuotas.length }}</span>
                </div>  
              </div>

              <div class="d-flex justify-content-center">
                <div v-if="purchase.includeCuotaAddOn && purchase.maintenancePeriod" class="alert alert-info mt-3 alert-div" role="alert">
                  <i class="fa-solid fa-info-circle me-2"></i>
                  Mantener al día las cuotas de esta compra mantendrá activa tu suscripción de forma automática por <strong>{{ purchase.maintenancePeriod }} meses.</strong>
                </div>
              </div>
              
              <div>
                <button 
                  class="btn btn-sm btn-theme"
                  @click="$emit('view-quotas', purchase)"
                  :disabled="purchase.paid">
                  Ver Cuotas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-4">
        <p class="text-light mb-0">No hay resultados</p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
        <nav aria-label="Purchase history pagination">
          <ul class="pagination">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button 
                class="page-link" 
                @click="handlePageChange(currentPage - 1)"
                :disabled="currentPage === 1"
              >
                Anterior
              </button>
            </li>
            <li 
              v-for="page in totalPages" 
              :key="page" 
              class="page-item"
              :class="{ active: currentPage === page }"
            >
              <button 
                class="page-link" 
                @click="handlePageChange(page)"
              >
                {{ page }}
              </button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button 
                class="page-link" 
                @click="handlePageChange(currentPage + 1)"
                :disabled="currentPage === totalPages"
              >
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ClientPurchaseHistory',
  props: {
    purchases: {
      type: Array,
      default: () => []
    },
    affiliates: {
      type: Array,
      default: () => []
    },
    filterOptions: {
      type: Object,
      required: true
    },
    sortOptions: {
      type: Array,
      required: true
    },
    totalPages: {
      type: Number,
      required: true
    },
    currentPage: {
      type: Number,
      required: true
    },
    dateFilter: {
      type: Object,
      required: true
    }
  },
  computed: {
    filteredPurchases() {
      return this.purchases.filter(purchase => !purchase.deleted);
    }
  },
  emits: ['filter-change', 'sort-change', 'page-change', 'date-filter-change', 'view-quotas', 'clear-filters'],
  methods: {
    formatDate(date) {
      const dateObj = new Date(date);
      dateObj.setDate(dateObj.getDate() + 1); // Adjust for timezone
      return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    getAffiliateName(affiliateId) {
      const affiliate = this.affiliates.find(a => a.id === affiliateId);
      return affiliate ? affiliate.companyName : 'Desconocido';
    },
    getStatusClass(purchase) {
      return purchase.cuotas?.every(cuota => cuota.paid) 
        ? 'badge-success' 
        : 'badge-warning';
    },
    handleFilterChange(event, type) {
      this.$emit('filter-change', {
        ...this.filterOptions,
        [type]: event.target.value
      });
    },
    handlePageChange(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.$emit('page-change', page);
      }
    },
    handleDateChange(event, type) {
      this.$emit('date-filter-change', {
        ...this.dateFilter,
        [type]: event.target.value
      });
    }
  }
}
</script>

<style scoped>
.alert-div {
  width: auto;
  display: inline-block;
  max-width: 100%;
}
.badge {
  padding: 0.5em 1em;
  border: 1px solid;
  background-color: transparent !important;
}
.badge-success {
  color: #198754;
  border-color: #198754;
}
.badge-warning {
  color: #ffc107;
  border-color: #ffc107;
}
.btn-theme {
  background-color: #6f42c1;
  border-color: #6f42c1;
  color: white;
}
.btn-theme:hover:not(:disabled) {
  background-color: #5a32a3;
  border-color: #5a32a3;
}
.btn-theme:disabled {
  opacity: 0.65;
}

/* Pagination Styling */
.pagination {
  margin-bottom: 0;
}
.page-link {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}
.page-link:hover {
  background-color: #444;
  border-color: #666;
  color: #fff;
}
.page-item.active .page-link {
  background-color: #6f42c1;
  border-color: #6f42c1;
}
.page-item.disabled .page-link {
  background-color: #222;
  border-color: #444;
  color: #666;
}

/* Form Controls */
.form-control, .form-select {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}
.form-control:focus, .form-select:focus {
  background-color: #2d2d2d;
  border-color: #6f42c1;
  color: #fff;
  box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}
.form-select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
}
.form-label {
  color: #fff;
  margin-bottom: 0.25rem;
}

.btn-outline-theme {
  color: #6f42c1;
  border-color: #6f42c1;
}
.btn-outline-theme:hover {
  background-color: #6f42c1;
  color: white;
}
</style> 