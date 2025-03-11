<template>
  <div class="modal fade" id="affiliate-sales-modal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            Historial de Ventas - {{ affiliateData?.companyName }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <!-- Sales Summary -->
          <div class="card mb-4">
            <div class="card-body">
              <div class="row text-center">
                <div class="col-md-3">
                  <h6>Crédito Asignado</h6>
                  <p class="h4">${{ affiliateData?.credit?.mainCredit?.toFixed(2) || 0 }}</p>
                </div>
                <div class="col-md-3">
                  <h6>Crédito Disponible</h6>
                  <p class="h4">${{ affiliateData?.credit?.availableMainCredit?.toFixed(2) || 0 }}</p>
                </div>
                <div class="col-md-3">
                  <h6>Ventas</h6>
                  <p class="h4">{{ salesCount }}</p>
                </div>
                <div class="col-md-3">
                  <h6>Total Ventas</h6>
                  <p class="h4">${{ totalSales.toFixed(2) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Sales List -->
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th @click="sortBy('purchaseDate')" class="sortable">
                    Fecha <i :class="getSortIcon('purchaseDate')"></i>
                  </th>
                  <th @click="sortBy('clientName')" class="sortable">
                    Cliente <i :class="getSortIcon('clientName')"></i>
                  </th>
                  <th @click="sortBy('productName')" class="sortable">
                    Producto <i :class="getSortIcon('productName')"></i>
                  </th>
                  <th @click="sortBy('productPrice')" class="sortable">
                    Monto <i :class="getSortIcon('productPrice')"></i>
                  </th>
                  <th @click="sortBy('paid')" class="sortable">
                    Estado <i :class="getSortIcon('paid')"></i>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sale in sortedSales" :key="sale.id">
                  <td>{{ formatDate(sale.purchaseDate) }}</td>
                  <td>{{ sale.clientName }}</td>
                  <td>{{ sale.productName }}</td>
                  <td>${{ sale.productPrice.toFixed(2) }}</td>
                  <td>
                    <span :class="['badge', sale.paid ? 'text-success' : 'text-warning']">
                      {{ sale.paid ? 'Completado' : 'Pendiente' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- No Sales Message -->
          <div v-if="!sortedSales.length" class="text-center py-4">
            <p>No hay ventas registradas</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AffiliateSalesModal',
  props: {
    affiliateData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      sortKey: 'purchaseDate',
      sortOrder: -1 // -1 for descending, 1 for ascending
    }
  },
  computed: {
    sales() {
      const salesData = this.affiliateData?.credit?.sales || {};
      return Object.entries(salesData).map(([id, sale]) => ({
        id,
        ...sale,
        paid: sale.cuotas?.every(cuota => cuota.paid) || false
      }));
    },
    sortedSales() {
      return [...this.sales].sort((a, b) => {
        let aVal = a[this.sortKey];
        let bVal = b[this.sortKey];
        
        // Handle dates
        if (this.sortKey === 'purchaseDate') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        
        // Handle strings
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return -1 * this.sortOrder;
        if (aVal > bVal) return 1 * this.sortOrder;
        return 0;
      });
    },
    totalSales() {
      return this.sales.reduce((total, sale) => total + (sale.productPrice || 0), 0);
    },
    salesCount() {
      return this.sales.length;
    }
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) return '';
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    },
    sortBy(key) {
      if (this.sortKey === key) {
        this.sortOrder *= -1;
      } else {
        this.sortKey = key;
        this.sortOrder = 1;
      }
    },
    getSortIcon(key) {
      if (this.sortKey !== key) return 'fas fa-sort';
      return this.sortOrder === 1 ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
  }
}
</script>

<style scoped>
.modal-content {
  background-color: #2d2d2d;
  color: #fff;
}

.modal-header {
  border-bottom: 1px solid #444;
}

.modal-title {
  color: #fff;
}

.card {
  background-color: #363636;
  border: 1px solid #444;
}

.table {
  color: #fff;
}

.table thead th {
  border-bottom: 2px solid #444;
  padding: 12px 8px;
  position: relative;
}

.table td {
  padding: 12px 8px;
  border-top: 1px solid #444;
}

.badge {
  padding: 0.5em 1em;
  border: 1px solid;
  background-color: transparent !important;
}

.text-success {
  color: #198754;
  border-color: #198754;
}

.text-warning {
  color: #ffc107;
  border-color: #ffc107;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background-color: #363636;
}

.fa-sort {
  color: #6c757d;
}

.fa-sort-up,
.fa-sort-down {
  color: #fff;
}
</style> 