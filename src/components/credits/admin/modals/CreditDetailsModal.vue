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
                  <!-- <div class="info-item">
                    <strong>ID de usuario:</strong>
                    <span>{{ userData.id }}</span>
                  </div> -->
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
                  <div class="stat-row approved">
                    <span class="stat-label">Aprobado:</span>
                    <span class="stat-value">${{ userData.credit.mainCredit.toFixed(2) }}</span>
                  </div>
                  <div class="stat-row available">
                    <span class="stat-label">Disponible:</span>
                    <span class="stat-value">${{ userData.credit.availableMainCredit.toFixed(2) }}</span>
                  </div>
                  <div class="stat-row used">
                    <span class="stat-label">Usado:</span>
                    <span class="stat-value">${{ (userData.credit.mainCredit - userData.credit.availableMainCredit).toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <div class="credit-stat-card" v-if="!isAffiliate && userData.credit?.plusCredit">
                <div class="stat-header">
                  <i class="fas fa-star"></i>
                  <h6>Crédito Plus</h6>
                </div>
                <div class="stat-body">
                  <div class="stat-row approved">
                    <span class="stat-label">Aprobado:</span>
                    <span class="stat-value">${{ userData.credit.plusCredit.toFixed(2) }}</span>
                  </div>
                  <div class="stat-row available">
                    <span class="stat-label">Disponible:</span>
                    <span class="stat-value">${{ userData.credit.availablePlusCredit.toFixed(2) }}</span>
                  </div>
                  <div class="stat-row used">
                    <span class="stat-label">Usado:</span>
                    <span class="stat-value">${{ (userData.credit.plusCredit - userData.credit.availablePlusCredit).toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- History -->
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
                      <div class="purchase-header">
                        <div class="purchase-summary" @click="togglePurchase(sale.id)">
                          <div class="product-info">
                            <span class="product-name">{{ sale.productName }} - {{ sale.clientName }}</span>
                          </div>
                          <div class="purchase-details-right">
                            <span class="purchase-date badge bg-primary">{{ formatDate(sale.purchaseDate) }}</span>
                            <span class="purchase-amount">${{ sale.productPrice.toFixed(2) }}</span>
                            <span class="purchase-status" :class="sale.paid ? 'text-success' : 'text-warning'">
                              {{ sale.paid ? 'Completado' : 'En Proceso' }}
                            </span>
                          </div>
                        </div>
                        <div v-if="!sale.cuotas?.every(cuota => cuota.paid)" class="purchase-actions">
                          <button class="btn btn-sm btn-outline-danger" @click.stop="openDeleteModal(sale, 'sale')" title="Eliminar venta">
                            <i class="fas fa-trash-alt"></i>
                          </button>
                          <i class="fas" :class="selectedPurchase === sale.id ? 'fa-chevron-up' : 'fa-chevron-down'" @click.stop="togglePurchase(sale.id)"></i>
                        </div>
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
                            <table class="table table-sm text-center">
                              <thead>
                                <tr>
                                  <th>N°</th>
                                  <th>Fecha</th>
                                  <th>Monto</th>
                                  <th>Estado</th>
                                  <th>Acciones</th>
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
                                  <td>
                                    <button class="btn btn-sm btn-outline-success" @click.stop="downloadReport(sale, cuota, cuotaIndex, userData)">
                                      <i class="fas fa-download me-2"></i>Informe
                                    </button>
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
                      <div class="purchase-header">
                        <div class="purchase-summary" @click="togglePurchase(purchase.id)">
                          <div class="product-info">
                            <span class="product-name">{{ purchase.productName }}</span>
                          </div>
                          <div class="purchase-details-right">
                            <span class="purchase-date">{{ formatDate(purchase.purchaseDate) }}</span>
                            <span class="purchase-amount">${{ purchase.productPrice.toFixed(2) }}</span>
                            <span class="purchase-status" :class="purchase.paid ? 'text-success' : 'text-warning'">{{ purchase.paid ? 'Completado' : 'En Proceso' }}</span>
                          </div>
                        </div>
                        <div v-if="!purchase.cuotas?.every(cuota => cuota.paid)" class="purchase-actions">
                          <button class="btn btn-sm btn-outline-danger" @click.stop="openDeleteModal(purchase, 'purchase')" title="Eliminar compra">
                            <i class="fas fa-trash-alt"></i>
                          </button>
                          <i class="fas" :class="selectedPurchase === purchase.id ? 'fa-chevron-up' : 'fa-chevron-down'" @click.stop="togglePurchase(purchase.id)"></i>
                        </div>
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
                            <table class="table table-sm text-center">
                              <thead>
                                <tr>
                                  <th>N°</th>
                                  <th>Fecha de Vencimiento</th>
                                  <th>Fecha de Pago</th>
                                  <th>Monto</th>
                                  <th>Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-for="(cuota, cuotaIndex) in purchase.cuotas" :key="cuotaIndex">
                                  <td>{{ cuotaIndex + 1 }}</td>
                                  <td>{{ formatDate(cuota.date) }}</td>
                                  <td>
                                    {{ 
                                      cuota.paymentDate 
                                        ? formatDate(cuota.paymentDate) 
                                        : (cuota.paidAt 
                                          ? formatDate(new Date(cuota.paidAt).toISOString().split('T')[0]) 
                                          : null) 
                                    }}
                                  </td>
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

  <!-- Modal for delete confirmation -->
  <div class="modal fade" id="delete-purchase-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Confirmar Eliminación</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Esta acción eliminará la transacción y reintegrará el crédito al cliente y al afiliado.
          </div>
          
          <div class="purchase-details-summary mb-3">
            <p><strong>Producto:</strong> {{ selectedPurchaseDetails?.productName }}</p>
            <p><strong>Fecha:</strong> {{ formatDate(selectedPurchaseDetails?.purchaseDate) }}</p>
            <p><strong>Monto:</strong> ${{ selectedPurchaseDetails?.productPrice?.toFixed(2) }}</p>
            <p><strong>Préstamo:</strong> ${{ selectedPurchaseDetails?.loanAmount?.toFixed(2) }}</p>
          </div>
          
          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" v-model="hasFee" id="hasFeeCheck">
            <label class="form-check-label" for="hasFeeCheck">
              Esta transacción incluye una comisión de $1 que no debe ser reintegrada
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-danger" @click="confirmDeletePurchase" :disabled="isDeleting">
            <span v-if="isDeleting">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              Procesando...
            </span>
            <span v-else>
              <i class="fas fa-trash-alt me-2"></i>Eliminar
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap';
import { db } from '@/firebase/init';
import { ref as dbRef, get, update } from 'firebase/database';
import { toast as showToast } from '@/utils/toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

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
    },
    adminId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      dateRange: {
        from: '',
        to: new Date().toISOString().split('T')[0]
      },
      selectedPurchase: null,
      selectedSale: null,
      selectedPurchaseDetails: null,
      hasFee: false,
      isDeleting: false,
      deleteType: null,
      deleteModal: null
    }
  },
  computed: {
    salesArray() {
      const sales = this.userData?.credit?.sales;
      if (!sales || typeof sales !== 'object') return [];
      
      return Object.values(this.userData.credit.sales)
        .map(sale => ({
          ...sale,
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
      // Make sure salesArray exists and is an array
      if (!this.salesArray || !Array.isArray(this.salesArray) || !this.salesArray.length) return [];
      
      return this.salesArray.filter(sale => {
        // Filter out deleted sales
        if (sale.deleted) return false;
        
        // Apply date filters
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
      // Make sure purchasesArray exists and is an array
      if (!this.purchasesArray || !Array.isArray(this.purchasesArray) || !this.purchasesArray.length) return [];
      
      return this.purchasesArray.filter(purchase => {
        // Filter out deleted purchases
        if (purchase.deleted) return false;
        
        // Apply date filters
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
    },
    openDeleteModal(item, type) {
      this.selectedPurchaseDetails = item;
      this.deleteType = type;
      this.hasFee = false;
      
      if (!this.deleteModal) {
        const deleteModalEl = document.getElementById('delete-purchase-modal');
        if (deleteModalEl) {
          this.deleteModal = new Modal(deleteModalEl);
        }
      }
      
      if (this.deleteModal) {
        this.deleteModal.show();
      }
    },
    async confirmDeletePurchase() {
      console.log('selectedPurchaseDetails', this.selectedPurchaseDetails);
      if (confirm('¿Estás seguro de eliminar esta transacción?')) {
        if (!this.selectedPurchaseDetails) return;
        
        this.isDeleting = true;
        
        try {
          // Calculate amount to reintegrate (subtract $1 fee if checked)
          const reintegrateAmount = this.hasFee 
            ? this.selectedPurchaseDetails.loanAmount - 1 
            : this.selectedPurchaseDetails.loanAmount;
          
          // Get references to the transaction and user records
          // transactionRef
          const saleRef = dbRef(db, `Users/${this.selectedPurchaseDetails.affiliate_id}/credit/sales/${this.selectedPurchaseDetails.id}`);
          const purchaseRef = dbRef(db, `Users/${this.selectedPurchaseDetails.client_id}/credit/main/purchases/${this.selectedPurchaseDetails.id}`);
          const clientRef = dbRef(db, `Users/${this.selectedPurchaseDetails.client_id}/credit/main`);
          const affiliateRef = dbRef(db, `Users/${this.selectedPurchaseDetails.affiliate_id}/credit/main`);
          
          // Get current credit values
          const clientSnapshot = await get(clientRef);
          const affiliateSnapshot = await get(affiliateRef);
          
          if (clientSnapshot.exists() && affiliateSnapshot.exists()) {
            const clientCredit = clientSnapshot.val();
            const affiliateCredit = affiliateSnapshot.val();
            
            // Calculate new available credit values
            const newClientAvailableCredit = clientCredit.availableCredit + reintegrateAmount;
            const newAffiliateAvailableCredit = affiliateCredit.availableCredit + reintegrateAmount;                   
            
            // Update client's data
            await update(clientRef, {
              availableCredit: newClientAvailableCredit
            });

            await update(purchaseRef, {
              deleted: true,
              deletedAt: new Date().toISOString(),
              deletedBy: this.adminId,
              hasFee: this.hasFee
            });
            
            // Update affiliate's data
            await update(affiliateRef, {
              availableCredit: newAffiliateAvailableCredit
            });

            await update(saleRef, {
              deleted: true,
              deletedAt: new Date().toISOString(),
              deletedBy: this.adminId,
              hasFee: this.hasFee
            });  
            
            // Close modal and show success message
            if (this.deleteModal) {
              this.deleteModal.hide();
            }
            
            showToast.success('Transacción eliminada y crédito reintegrado correctamente');
          } else {
            throw new Error('No se pudo obtener la información de crédito');
          }
        } catch (error) {
          console.error('Error deleting purchase:', error);
          showToast.error('Error al eliminar la transacción: ' + error.message);
        } finally {
          this.isDeleting = false;
        }
      }
    },
    calculatePaymentDate(limitDate) {
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
    downloadReport(purchase, cuota, cuotaIndex, affiliate) {
      // Ensure we have a cuota and the purchase details
      if (!cuota || !purchase) {
        showToast.error('No se encontraron detalles.');
        return;
      }

      // Create a new jsPDF instance
      const doc = new jsPDF();

      // Set document properties
      doc.setFontSize(12);

      // Add logo (you'll replace this with your actual logo path)
      // doc.addImage('/path/to/logo.png', 'PNG', 10, 10, 50, 20);

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORME DE PAGO', 105, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Rose Coupon', 105, 38, { align: 'center' });

      // Prepare payment date (10 workable days after limit date)
      const paymentDate = this.calculatePaymentDate(cuota.date);
      const formattedPaymentDate = paymentDate.toLocaleDateString('es-VE');
      const generationDate = new Date().toLocaleDateString('es-VE');

      // Invoice Details
      doc.setFontSize(10);
      doc.text(`Fecha de Generación: ${generationDate}`, 10, 50);
      doc.text(`Fecha de Pago: ${formattedPaymentDate}`, 10, 56);

      // Prepare table data
      const tableColumn = ['Detalle', 'Información'];
      const tableRows = [
        ['Comercio', `${affiliate.companyName} - ${affiliate.rif}` || 'N/A'],
        ['Cliente', `${purchase.clientName} - ${purchase.clientCedula}` || 'N/A'],
        ['Producto', purchase.productName],
        ['Cuota N°', cuotaIndex + 1],
        ['Fecha Límite', this.formatDate(cuota.date)],
        ['Fecha de Pago', formattedPaymentDate],
        ['Monto de Cuota', `$${cuota.amount.toFixed(2)}`]
      ];

      // Add table using autoTable function
      const tableConfig = {
        startY: 70,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          valign: 'middle',
          halign: 'left'
        },
        headStyles: {
          fillColor: [41, 18, 47], // Dark purple background
          textColor: [255, 255, 255], // White text
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { 
            fontStyle: 'bold', 
            cellWidth: 50 
          },
          1: { 
            cellWidth: 'auto',
            halign: 'right' // Right-align the values
          }
        }
      };

      // Safely add the table
      autoTable(doc, tableConfig);

      // Get the final Y position
      let finalY = doc.internal.pageSize.height - 30; // Default fallback position
      try {
        if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
          finalY = doc.lastAutoTable.finalY;
        }
      } catch (error) {
        console.warn('Could not get finalY from autoTable', error);
      }

      // Total Amount Section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL A PAGAR', 150, finalY + 10, { align: 'right' });
      doc.text(`$${cuota.amount.toFixed(2)}`, 190, finalY + 10, { align: 'right' });

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Informe generado por Rose Coupon', 105, doc.internal.pageSize.height - 15, { align: 'center' });

      // Save the PDF
      doc.save(`Informe_Pago_Cuota_${cuotaIndex + 1}_${purchase.clientName}.pdf`);
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
  padding: 1rem;
  background: #1a1a1a;
}

.stat-row {
  padding: 1rem;
  margin: 0.5rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  border: none;
}

.stat-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  background: rgba(111, 66, 193, 0.1);
}

.stat-row.approved {
  border-left: 4px solid #6f42c1;
}

.stat-row.available {
  border-left: 4px solid #28a745;
}

.stat-row.used {
  border-left: 4px solid #dc3545;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  display: block;
  margin-top: 0.25rem;
}

.stat-label {
  color: #aaa;
  font-size: 0.9rem;
}

.purchase-history-section {
  background: #29122f;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  background: #1a1a1a;
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
  background-color: #6f42c1;
}

.purchase-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.product-info {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 10px;
}

.purchase-details-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  white-space: nowrap;
}

.purchase-date {
  min-width: 90px;
  text-align: center;
}

.purchase-amount {
  min-width: 80px;
  text-align: right;
}

.purchase-status {
  min-width: 100px;
  text-align: center;
}

.purchase-details {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  background: #1a1a1a;
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
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .product-info {
    width: 100%;
    margin-right: 0;
  }
  
  .purchase-details-right {
    width: 100%;
    justify-content: space-between;
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

.purchase-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.purchase-actions .btn-outline-danger {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  border-radius: 4px;
  background-color: transparent;
  border-color: #dc3545;
  color: #dc3545;
}

.purchase-actions .btn-outline-danger:hover {
  background-color: #dc3545;
  color: white;
}

.purchase-details-summary p {
  margin-bottom: 0.5rem;
}
</style> 