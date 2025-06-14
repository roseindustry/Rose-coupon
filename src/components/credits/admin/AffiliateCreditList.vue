<template>
  <div class="affiliate-list-container">
    <!-- Header Section -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0 text-white">Estado de crédito por Afiliado</h4>
      <CustomButton text="Asignar Crédito" button-class="btn-theme" icon="fas fa-plus-circle me-2"
        :on-click="() => $emit('assign-credit')" />
    </div>

    <!-- Search Bar -->
    <div class="search-wrapper mb-3">
      <SearchCard title="Buscar cliente" v-model="filterQuery" @input="handleFilterChange"
        placeholder="Buscar por nombre o RIF..." />
    </div>

    <!-- Button to open pending payments -->
    <div class="pending-payments-section mb-3">
      <CustomButton v-if="pendingPaymentsClients.length > 0"
        :text="`${pendingPaymentsClients.length} Clientes con Pagos Pendientes`" :button-class="{
          'btn-warning': pendingPaymentsClients.length <= 8,
          'btn-danger': pendingPaymentsClients.length > 8
        }" icon="fas fa-exclamation-triangle me-2" :on-click="showPendingPaymentsModal" />
    </div>

    <div class="affiliates-table-wrapper">
      <div class="affiliate-item" v-for="affiliate in affiliates" :key="affiliate.id">
        <div class="affiliate-header">
          <div class="affiliate-info">
            <h5 class="affiliate-name">{{ affiliate.companyName }}</h5>
            <span class="affiliate-id">RIF: {{ affiliate.rif }}</span>
          </div>
          <div class="affiliate-status">
            <span v-if="affiliate.subscription" class="status-badge" :class="{ 'active': affiliate.subscription }">
              {{ affiliate.subscription ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>

        <div class="credit-summary">
          <div class="credit-block">
            <div class="credit-type">
              <span class="label">Disponible</span>
              <div class="amount" :class="{ 'text-success': affiliate.credit.availableMainCredit }">
                ${{ affiliate.credit.availableMainCredit?.toFixed(2) || '0.00' }}
              </div>
              <div class="available-amount">
                Aprobado: ${{ affiliate.credit.mainCredit?.toFixed(2) || '0.00' }}
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
              <div class="amount" :class="{ 'text-success': affiliate.credit.plusCredit }">
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
          <CustomButton text="Ver Detalles" button-class="btn-theme" icon="fas fa-eye me-2"
            :on-click="() => $emit('view-details', affiliate)" />
          <CustomButton text="Reporte de Ventas" button-class="btn-success ms-2" icon="fas fa-file-pdf me-2"
            :on-click="() => downloadReport(affiliate.credit.sales, affiliate)" />
        </div>

        <!-- Upcoming Payments Section -->
        <div class="upcoming-payments" v-if="upcomingPayments.length">
          <div class="payments-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="fas fa-calendar-alt me-2"></i>
              Próximos Pagos
            </h6>
            <div class="payment-filter">
              <CustomSelect v-model="paymentFilter" :options="[
                {
                  text: 'Próximos 5 pagos',
                  value: 'all'
                },
                {
                  text: 'Vence hoy',
                  value: 0
                },
                {
                  text: 'En 3 días o menos',
                  value: 3
                },
                {
                  text: 'En 5 días o menos',
                  value: 5
                },
                {
                  text: 'En 7 días o menos',
                  value: 7
                },
              ]" />
              <!-- <select v-model="paymentFilter" class="form-select form-select-sm">
                <option value="all">Próximos 5 pagos</option>
                <option value="0">Vence hoy</option>
                <option value="3">En 3 días o menos</option>
                <option value="5">En 5 días o menos</option>
                <option value="7">En 7 días o menos</option>
              </select> -->
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
                    :class="{ 'table-danger': getPaymentStatus(payment.date).text === 'Hoy' }">
                    <td>{{ formatDate(payment.date) }}</td>
                    <td>
                      <span class="payment-badge" :class="getPaymentStatus(payment.date).class">
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
    <CustomPagination :current-page="currentPage" :total-pages="totalPages" @page-change="handlePageChange" />

    <!-- Pending Payments Modal -->
    <div class="modal fade" id="pendingPaymentsModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Clientes con Pagos Pendientes</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Comercio</th>
                  <th>Producto</th>
                  <th>Cuotas Vencidas</th>
                  <th>Total Vencido</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="client in pendingPaymentsClients" :key="client.clientId">
                  <td>{{ client.clientName }}</td>
                  <td>{{ client.affiliateName }}</td>
                  <td>{{ client.productName }}</td>
                  <td>
                    {{ client.pendingCuotasCount }}
                    <span class="text-danger">(Vencidas)</span>
                  </td>
                  <td>
                    ${{ client.totalPendingAmount.toFixed(2) }}
                    <div class="text-muted small mt-1">
                      Última cuota vencida:
                      {{ formatDate(client.expiredCuotas[0].date) }}
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-info" @click="$emit('view-details', client.clientDetails)">
                      <i class="fas fa-eye me-1"></i>Detalles
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CustomButton from '@/components/app/CustomButton.vue';
import CustomSelect from '@/components/app/CustomSelect.vue';
import SearchCard from '@/components/app/SearchCard.vue';
import CustomPagination from '@/components/app/CustomPagination.vue'
import { Modal } from 'bootstrap';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import 'sweetalert2/src/sweetalert2.scss';

export default {
  components: {
    CustomButton,
    CustomSelect,
    SearchCard,
    CustomPagination
  },
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
      // Handle different input types
      if (!dateString) return 'N/A';

      // If it's already a Date object, convert to string
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString('es-VE');
      }

      // If it's a timestamp or valid date string
      try {
        const date = new Date(dateString);

        // Check if the date is valid
        if (isNaN(date.getTime())) {
          return 'Fecha Inválida';
        }

        return date.toLocaleDateString('es-VE');
      } catch (error) {
        console.warn('Invalid date format:', dateString);
        return 'Fecha Inválida';
      }
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
    },
    showPendingPaymentsModal() {
      this.$nextTick(() => {
        const modalElement = document.getElementById('pendingPaymentsModal');
        if (modalElement) {
          const modal = new Modal(modalElement);
          modal.show();
        }
      });
    },
    calculateAffiliatePaymentDate(limitDate) {
      // Convert limit date to Date object
      const date = new Date(limitDate);
      let workableDays = 0;
      let paymentDate = new Date(date);

      while (workableDays < 10) {
        paymentDate.setDate(paymentDate.getDate() + 1);

        // Skip weekends
        if (paymentDate.getDay() !== 0 && paymentDate.getDay() !== 6) {
          workableDays++;
        }
      }

      return paymentDate;
    },
    downloadReport(sales, affiliate) {
      // Ensure we have sales data
      if (!sales || Object.keys(sales).length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'No hay ventas para generar el reporte.',
          confirmButtonText: 'OK'
        });
        return;
      }

      // Create a new jsPDF instance
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Helper function to safely calculate total price
      const calculateTotalPrice = (sale) => {
        const purchaseAmount = sale.purchaseAmount || 0;
        const loanAmount = sale.loanAmount || 0;
        const totalPrice = purchaseAmount + loanAmount;

        return isNaN(totalPrice) ? '0.00' : totalPrice.toFixed(2);
      };

      // Set document properties
      doc.setFontSize(12);

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Reporte de Ventas - ${affiliate.companyName}`, 148, 15, { align: 'center' });

      // Affiliate Info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RIF: ${affiliate.rif}`, 148, 22, { align: 'center' });
      doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-VE')}`, 148, 28, { align: 'center' });

      // Prepare table data
      const tableColumns = [
        'Cliente',
        'Producto',
        'Precio Total',
        'Fecha de Venta',
        'Cuota',
        'Monto Cuota',
        'Fecha Límite',
        'Fecha de Pago',
        'Estado'
      ];

      const tableRows = [];

      // Process each sale
      Object.entries(sales).forEach(([saleId, sale]) => {
        // Skip deleted sales
        if (sale.deleted || sale.deletedAt) return;

        // Add a header row for each sale
        tableRows.push([
          {
            content: `Venta: ${saleId}`, colSpan: 9, styles: {
              fillColor: [111, 66, 193],
              textColor: 255,
              halign: 'left',
              fontStyle: 'bold'
            }
          }
        ]);

        // Process cuotas for this sale
        if (sale.cuotas) {
          Object.entries(sale.cuotas).forEach(([cuotaId, cuota], index) => {
            // Calculate affiliate payment date
            const affiliatePaymentDate = this.calculateAffiliatePaymentDate(cuota.date);

            tableRows.push([
              index === 0 ? sale.clientName : '',
              index === 0 ? sale.productName : '',
              index === 0 ? `$${calculateTotalPrice(sale)}` : '',
              index === 0 ? this.formatDate(sale.purchaseDate) : '',
              `Cuota ${index + 1}`,
              `$${cuota?.amount?.toFixed(2) || '0.00'}`,
              this.formatDate(cuota.date),
              this.formatDate(affiliatePaymentDate), // Use calculated payment date
              cuota.paid ? 'Pagada' : 'Pendiente'
            ]);
          });
        }

        // Add a separator row
        tableRows.push([{ content: '', colSpan: 9 }]);
      });

      // Calculate total sales and pending amounts
      const totalSales = Object.values(sales).reduce((total, sale) =>
        sale.deleted || sale.deletedAt ? total : total + parseFloat(calculateTotalPrice(sale)), 0);
      const pendingSales = Object.values(sales).reduce((total, sale) => {
        if (sale.deleted || sale.deletedAt) return total;
        const pendingCuotas = Object.values(sale.cuotas || {}).filter(cuota => !cuota.paid);
        return total + pendingCuotas.reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
      }, 0);

      // Add table using autoTable function
      const tableConfig = {
        startY: 35,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          valign: 'middle',
          halign: 'left'
        },
        headStyles: {
          fillColor: [41, 18, 47], // Dark purple background
          textColor: [255, 255, 255], // White text
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25 },
          4: { cellWidth: 15 },
          5: { cellWidth: 20 },
          6: { cellWidth: 25 },
          7: { cellWidth: 25 },
          8: { cellWidth: 20 }
        }
      };

      // Safely add the table
      autoTable(doc, tableConfig);

      // Add summary section
      let finalY = doc.internal.pageSize.height - 30; // Default fallback position
      try {
        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
          finalY = doc.lastAutoTable.finalY;
        }
      } catch (error) {
        console.warn('Could not get finalY from autoTable', error);
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen', 15, finalY + 10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Ventas: $${totalSales.toFixed(2)}`, 15, finalY + 17);
      doc.text(`Monto Pendiente: $${pendingSales.toFixed(2)}`, 15, finalY + 24);

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Informe generado por Rose Coupon', 148, doc.internal.pageSize.height - 10, { align: 'center' });

      // Save the PDF
      doc.save(`Reporte_Ventas_${affiliate.companyName}_${new Date().toISOString().split('T')[0]}.pdf`);
    },
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
    },
    pendingPaymentsClients() {
      const pendingClients = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      this.affiliates.forEach(affiliate => {
        // Skip if no sales
        if (!affiliate.credit?.sales) return;

        // Get sales as array
        const sales = Object.entries(affiliate.credit.sales);

        sales.forEach(([saleId, sale]) => {
          // Skip if no cuotas
          if (!sale.cuotas) return;

          // Get cuotas as array
          const cuotas = Object.entries(sale.cuotas);

          // Filter unpaid and expired cuotas
          const expiredCuotas = cuotas.filter(([_, cuota]) =>
            !sale.deleted && !sale.deletedAt && !cuota.paid && new Date(cuota.date) < today
          );

          if (expiredCuotas.length > 0) {
            pendingClients.push({
              clientId: sale.client_id,
              clientName: sale.clientName || 'Cliente',
              affiliateName: affiliate.companyName,
              productName: sale.productName,
              pendingCuotasCount: expiredCuotas.length,
              totalPendingAmount: expiredCuotas.reduce((total, [_, cuota]) => total + cuota.amount, 0),
              expiredCuotas: expiredCuotas.map(([id, cuota]) => ({
                id,
                ...cuota
              })),
              clientDetails: {
                id: sale.client_id,
                name: sale.clientName || 'Cliente',
                identification: 'N/A',
                credit: {
                  mainPurchases: [sale]
                }
              }
            });
          }
        });
      });

      // Sort by total pending amount in descending order
      return pendingClients.sort((a, b) => b.totalPendingAmount - a.totalPendingAmount);
    },
  }
}
</script>

<style scoped>
.affiliate-list-container {
  padding: 0 !important;
  margin: 0 !important;
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
  background: #494545;
  border-radius: 8px;
  padding: 0.5rem;
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
  padding: 0.875rem 2rem;
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

  .payment-filter .form-select {
    background-color: #1a1a1a;
    border-color: #444;
    color: #fff;
    font-size: clamp(0.75rem, 2vw, 0.875rem);
    padding: clamp(0.5rem, 2vw, 0.875rem) clamp(1rem, 4vw, 2rem);
    width: 50%;
    max-width: 100%;
    margin: 0 auto;
    display: block;
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

/* Add some styling for the pending payments button */
.pending-payments-section {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.btn-warning {
  background-color: #ffc107;
  color: #000;
  border-color: #ffc107;
}

.btn-warning:hover {
  background-color: #ffca2c;
  border-color: #ffc720;
}

/* Modal styles */
#pendingPaymentsModal .modal-content {
  background-color: #2d2d2d;
  color: #fff;
}

#pendingPaymentsModal .table {
  color: #fff;
}

#pendingPaymentsModal .table thead {
  background-color: #6f42c1;
}

#pendingPaymentsModal .table-striped tbody tr:nth-of-type(odd) {
  background-color: rgba(111, 66, 193, 0.1);
}

#pendingPaymentsModal .table-striped tbody tr:nth-of-type(even) {
  background-color: rgba(111, 66, 193, 0.05);
}
</style>