<template>
  <div class="container py-4">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-purple" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else>
      <!-- Header with Credit Stats -->
      <div class="mb-4">
        <h2 class="mb-3 fw-500 text-center">{{ currentAffiliate?.companyName }}</h2>
        <div class="row g-3">
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body text-center">
                <h6 class="text-secondary mb-2">Crédito Total</h6>
                <h4 class="text-light">${{ currentAffiliate?.credit?.mainCredit?.toLocaleString() || 0 }}</h4>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body text-center">
                <h6 class="text-secondary mb-2">Crédito Disponible</h6>
                <h4 class="text-light">${{ currentAffiliate?.credit?.availableMainCredit?.toLocaleString() || 0 }}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="row g-4">
        <!-- Left Column: New Purchase Form -->
        <div class="col-lg-7">
          <div class="card">
            <div class="card-header">
              <h5 class="text-black mb-0">Nueva Venta</h5>
            </div>
            <div class="card-body">
              <form @submit.prevent="registerPurchase">
                <!-- Step 1: Client Selection -->
                <div class="form-section mb-4">
                  <h6 class="text-light mb-3">1. Selección del Cliente</h6>
                  <div class="row">
                    <div class="col-md-12 mb-3">
                      <SearchInput
                        v-model="searchClient"
                        placeholder="Buscar cliente por nombre o cédula..."
                        :results="searchClientResults"
                        @select="selectClient"
                        @blur="() => !selectedClient && clearSearchResults()"
                      >
                        <template #result="{ result }">
                          <div>
                            <strong>{{ result.firstName }} {{ result.lastName }}</strong>
                            <br>
                            <small>V{{ result.identification }}</small>
                          </div>
                        </template>
                      </SearchInput>
                    </div>
                  </div>
                  
                  <!-- Selected Client Info -->
                  <div v-if="selectedClient" class="selected-client-info p-3 border rounded bg-dark-subtle">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 class="text-light mb-2">{{ selectedClient.firstName }} {{ selectedClient.lastName }}</h6>
                        <p class="text-secondary mb-2">V{{ selectedClient.identification }}</p>
                      </div>
                      <div class="text-end">
                        <p class="text-light mb-1">Crédito Disponible</p>
                        <h5 class="text-success">${{ selectedClient.credit?.availableMainCredit?.toLocaleString() || 0 }}</h5>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 2: Purchase Details -->
                <div class="form-section mb-4">
                  <h6 class="text-light mb-3">2. Detalles de la Compra</h6>
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label text-light">Producto</label>
                      <input type="text" v-model="newPurchase.productName" 
                        class="form-control bg-dark text-light border-secondary" required>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label text-light">Precio Total</label>
                      <div class="input-group">
                        <span class="input-group-text bg-dark text-light border-secondary">$</span>
                        <input type="number" v-model.number="newPurchase.productPrice" 
                          class="form-control bg-dark text-light border-secondary" required>
                      </div>
                      <div v-if="priceWarning" class="price-warning mt-2">
                        <small class="text-warning">
                          <i class="fas fa-exclamation-triangle me-1"></i>
                          {{ priceWarning }}
                        </small>
                      </div>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label text-light">Fecha de compra</label>
                      <input type="date" class="form-control bg-dark text-light border-secondary"
                        v-model="purchaseDate">
                    </div>
                    <div class="col-md-6 mb-3 d-flex align-items-end">
                      <button type="button" class="btn btn-theme w-100" 
                        @click="calcs(selectedClient)"
                        :disabled="!canCalculate"
                        :title="!canCalculate ? 'Verifique el monto y el crédito disponible' : ''">
                        <i class="fas fa-calculator me-2"></i>
                        Calcular cuotas
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Payment Plan -->
                <div v-if="calc" class="form-section mb-4">
                  <h6 class="text-light mb-3">3. Plan de Pagos</h6>
                  <div class="row">
                    <!-- Initial Payment Options -->
                    <div class="col-12 mb-4">
                      <div class="payment-options p-3 border rounded bg-dark-subtle">
                        <h6 class="text-light mb-3">Cuota Inicial</h6>
                        <div class="d-flex justify-content-around">
                          <div class="form-check">
                            <input class="form-check-input" type="radio" id="initial-50" value="50"
                              v-model="initialPercentage" @change="updateInitial(selectedClient)" />
                            <label class="form-check-label text-light" for="initial-50">50%</label>
                          </div>
                          <div class="form-check">
                            <input class="form-check-input" type="radio" id="initial-25" value="25"
                              v-model="initialPercentage" @change="updateInitial(selectedClient)" />
                            <label class="form-check-label text-light" for="initial-25">25%</label>
                          </div>
                          <div class="form-check">
                            <input class="form-check-input" type="radio" id="initial-custom"
                              value="custom" v-model="initialPercentage" />
                            <label class="form-check-label text-light" for="initial-custom">
                              Personalizado
                            </label>
                          </div>
                        </div>
                        <div v-if="initialPercentage === 'custom'" class="mt-3">
                          <input type="number" class="form-control bg-dark text-light border-secondary"
                            placeholder="Ingrese el porcentaje" min="1" max="99"
                            v-model="customInitial" @input="updateInitial(selectedClient)" />
                        </div>
                      </div>
                    </div>

                    <!-- Payment Summary -->
                    <div class="col-12 mb-4">
                      <div class="payment-summary p-3 border rounded bg-dark-subtle">
                        <div class="row">
                          <div class="col-md-3">
                            <label class="text-secondary">Inicial</label>
                            <h5 class="text-light">${{ purchaseAmount.toLocaleString() }}</h5>
                          </div>
                          <div class="col-md-4">
                            <label class="text-secondary">Préstamo</label>
                            <h5 class="text-light">${{ loanAmount.toLocaleString() }}</h5>
                            <small class="text-secondary" v-if="selectedClient?.subscription">
                              Incluye cargo por suscripción {{ selectedClient.subscription.name.charAt(0).toUpperCase() + selectedClient.subscription.name.slice(1) }}: 
                              ${{ getTierFee(selectedClient.subscription.order) }}
                            </small>
                          </div>
                          <div class="col-md-2">
                            <label class="text-secondary">Cuotas</label>
                            <select v-model="newPurchase.terms" @change="calcs(selectedClient)"
                              class="form-select bg-dark text-light border-secondary">
                              <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                            </select>
                          </div>
                          <div class="col-md-3">
                            <label class="text-secondary">Frecuencia</label>
                            <select v-model="frequency" @change="calcs(selectedClient)"
                              class="form-select bg-dark text-light border-secondary">
                              <option :value="2">Quincenal</option>
                              <option :value="1">Mensual</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Quotes Table -->
                    <div class="col-12">
                      <div class="table-responsive">
                        <table class="table table-dark table-hover">
                          <thead>
                            <tr>
                              <th>Cuota</th>
                              <th>Fecha</th>
                              <th class="text-end">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(amount, index) in quotesAmount" :key="index">
                              <td>Cuota {{ index + 1 }}</td>
                              <td>{{ formatDate(cuotaDates[index]) }}</td>
                              <td class="text-end">${{ amount.toFixed(2) }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 4: Verification -->
                <div v-if="verificationRequested" class="form-section mb-4">
                  <h6 class="text-light mb-3">4. Verificación</h6>
                  <div class="verification-code p-3 border rounded bg-dark-subtle">
                    <label class="form-label text-light">Código de verificación</label>
                    <input type="number" class="form-control bg-dark text-light border-secondary"
                      v-model="verificationCode" placeholder="Ingrese el código">
                  </div>
                </div>

                <!-- Form Actions -->
                <div class="text-end mt-4">
                  <!-- Rate Limit Info -->
                  <div v-if="cooldownMessage || attemptsMessage" class="text-start mb-3">
                    <div v-if="cooldownMessage" class="d-flex align-items-center text-warning mb-2">
                      <i class="fas fa-clock me-2"></i>
                      <small>{{ cooldownMessage }}</small>
                    </div>
                    <div v-if="attemptsMessage" class="d-flex align-items-center" 
                      :class="{'text-danger': codeRequestInfo.attemptsLeft === 0, 'text-warning': codeRequestInfo.attemptsLeft > 0}">
                      <i class="fas fa-exclamation-triangle me-2"></i>
                      <small>{{ attemptsMessage }}</small>
                    </div>
                  </div>
                  <button type="button" class="btn btn-danger me-2" @click="cancelPurchase">
                    <i class="fas fa-times me-2"></i>Cancelar
                  </button>
                  <button type="button" class="btn btn-theme me-2" 
                    @click="askForCode(selectedClient)"
                    :disabled="waiting || !isFormValid || codeRequestInfo.cooldownEnds > Date.now()">
                    <span v-if="waiting" class="spinner-border spinner-border-sm me-2"></span>
                    <i v-else class="fas fa-sms me-2"></i>
                    Solicitar Código
                  </button>
                  <button v-if="verificationRequested" type="submit" 
                    class="btn btn-success" :disabled="!verificationCode || loading">
                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                    <i v-else class="fas fa-check me-2"></i>
                    Confirmar Venta
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Right Column: Recent Activity -->
        <div class="col-lg-5">
          <!-- Recent Sales Summary -->
          <div class="card mb-2">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="text-black mb-0">Ventas Recientes</h5>
              <span class="badge bg-secondary text-black">Últimas 5</span>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush">
                <div v-for="sale in recentSales" :key="sale.id" 
                     class="list-group-item bg-dark border-secondary">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-1 text-light text-truncate" style="max-width: 100px;">{{ sale.clientName }}</h6>
                      <small class="text-secondary">{{ formatDate(sale.purchaseDate) }}</small>
                    </div>
                    
                    <div class="text-light">${{ sale.productPrice.toLocaleString() }}</div>
                    <div class="text-end">                      
                      <span :class="['badge', sale.paid ? 'text-success' : 'text-warning']">
                        {{ sale.paid ? 'Completado' : 'Pendiente' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Status Summary -->
          <div class="card">
            <div class="card-header">
              <h5 class="text-black mb-0">Estado de Pagos</h5>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-6">
                  <div class="p-3 border border-warning rounded text-center">
                    <h6 class="text-warning mb-1">Pendientes</h6>
                    <h4 class="mb-0">{{ pendingPayments.length }}</h4>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-3 border border-success rounded text-center">
                    <h6 class="text-success mb-1">Completados</h6>
                    <h4 class="mb-0">{{ paidPurchases.length }}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Full Width Sales History -->
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="text-black mb-0">Historial de Ventas</h5>
              <div class="d-flex gap-3 align-items-center">
                <!-- Status Filter -->
                <select 
                  v-model="salesFilter"
                  class="form-select bg-dark text-light border-secondary"
                  style="width: 150px;"
                >
                  <option value="all">Todas las ventas</option>
                  <option value="pending">Pendientes</option>
                  <option value="completed">Completadas</option>
                </select>
                
                <!-- Search Bar -->
                <div class="search-container" style="width: 300px;">
                  <div class="input-group">
                    <span class="input-group-text bg-dark border-secondary">
                      <i class="fas fa-search text-secondary"></i>
                    </span>
                    <input 
                      type="text" 
                      class="form-control bg-dark text-light border-secondary" 
                      v-model="searchSales"
                      placeholder="Buscar por cliente, producto o fecha..."
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Date Filter Section -->
            <div class="card-body border-bottom border-secondary pb-3">
              <div class="d-flex align-items-center">
                <label class="text-light me-3">Filtrar por fecha:</label>
                <div class="d-flex gap-2 align-items-center">
                  <div class="d-flex flex-column">
                    <small class="text-secondary mb-1">Desde</small>
                    <input 
                      type="date" 
                      class="form-control bg-dark text-light border-secondary" 
                      v-model="dateRange.start"
                    >
                  </div>
                  <div class="d-flex flex-column">
                    <small class="text-secondary mb-1">Hasta</small>
                    <input 
                      type="date" 
                      class="form-control bg-dark text-light border-secondary" 
                      v-model="dateRange.end"
                    >
                  </div>
                  <button 
                    class="btn btn-outline-secondary mt-4" 
                    @click="clearDateFilter"
                    v-if="dateRange.start || dateRange.end">
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div v-if="filteredSales.length > 0" class="table-responsive">
                <table class="table table-dark table-hover">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Producto</th>
                      <th>Monto Total</th>
                      <th>Monto Préstamo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="sale in filteredSales" :key="sale.id">
                      <td>{{ formatDate(sale.purchaseDate) }}</td>
                      <td>{{ sale.clientName }}</td>
                      <td>{{ sale.productName || 'N/A' }}</td>
                      <td>${{ (sale.productPrice || 0).toLocaleString() }}</td>
                      <td>${{ (sale.loanAmount || 0).toLocaleString() }}</td>
                      <td>
                        <span :class="['badge', sale.paid ? 'text-success' : 'text-warning']">
                          {{ sale.paid ? 'Completado' : 'Pendiente' }}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-sm btn-theme" @click="viewPurchaseDetails(sale)">
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-center py-4">
                <p class="text-secondary mb-0">
                  {{ searchSales ? 'No se encontraron resultados' : 'No hay ventas registradas' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Purchase Details Modal -->
    <div class="modal fade" id="purchaseDetailsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content bg-dark">
          <div class="modal-header border-secondary">
            <h5 class="modal-title text-light">Detalles de la Venta</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" v-if="selectedSale">
            <!-- Purchase Summary -->
            <div class="card bg-dark-subtle mb-4">
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <p class="text-secondary mb-1">Cliente</p>
                    <h6 class="text-light">{{ selectedSale.clientName }}</h6>
                  </div>
                  <div class="col-md-6">
                    <p class="text-secondary mb-1">Fecha de Compra</p>
                    <h6 class="text-light">{{ selectedSale.purchaseDate }}</h6>
                  </div>
                  <div class="col-md-6">
                    <p class="text-secondary mb-1">Producto</p>
                    <h6 class="text-light">{{ selectedSale.productName }}</h6>
                  </div>
                  <div class="col-md-6">
                    <p class="text-secondary mb-1">Estado</p>
                    <span :class="['badge', selectedSale.paid ? 'text-success' : 'text-warning']">
                      {{ selectedSale.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Details -->
            <div class="card bg-dark-subtle mb-4">
              <div class="card-body">
                <h6 class="text-light mb-3">Detalles del Pago</h6>
                <div class="row g-3">
                  <div class="col-md-4">
                    <p class="text-secondary mb-1">Precio Total</p>
                    <h6 class="text-light">${{ selectedSale.productPrice }}</h6>
                  </div>
                  <div class="col-md-4">
                    <p class="text-secondary mb-1">Inicial</p>
                    <h6 class="text-light">${{ selectedSale.purchaseAmount }}</h6>
                  </div>
                  <div class="col-md-4">
                    <p class="text-secondary mb-1">Monto Financiado</p>
                    <h6 class="text-light">${{ selectedSale.loanAmount }}</h6>
                  </div>
                </div>
              </div>
            </div>

            <!-- Installments Table -->
            <div class="card bg-dark-subtle">
              <div class="card-body">
                <h6 class="text-light mb-3">Cuotas</h6>
                <div class="table-responsive">
                  <table class="table table-dark table-hover mb-0">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(cuota, index) in selectedSale.cuotas" :key="index">
                        <td>Cuota {{ index + 1 }}</td>
                        <td>{{ cuota.date }}</td>
                        <td>${{ cuota.amount }}</td>
                        <td>
                          <span :class="['badge', cuota.paid ? 'text-success' : 'text-warning']">
                            {{ cuota.paid ? 'Pagada' : 'Pendiente' }}
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
      </div>
    </div>
  </div>
</template>

<script>
import SearchInput from '@/components/app/SearchInput.vue'
import { toast } from '@/utils/toast'
import { Modal } from 'bootstrap'
import { ref as dbRef, get } from 'firebase/database'
import { db } from '@/firebase/init'
import 'toastify-js/src/toastify.css'

export default {
  name: 'AffiliateCreditView',
  components: {
    SearchInput
  },
  props: {
    currentAffiliate: {
      type: Object,
      required: false,
      default: () => ({
        companyName: '',
        credit: {
          mainCredit: 0,
          availableMainCredit: 0,
          sales: []
        }
      })
    },
    clients: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  data() {
    return {
      loading: true,
      waiting: false,
      searchSales: '',
      salesFilter: 'all', // 'all', 'pending', 'completed'
      dateRange: {
        start: '',
        end: ''
      },
      selectedClient: null,
      searchClient: '',
      searchClientResults: [],
      verificationRequested: false,
      verificationCode: '',
      newPurchase: {
        clientId: '',
        clientName: '',
        productName: '',
        productPrice: 0,
        purchaseAmount: 0,
        terms: 2 // Default to 2 terms
      },
      calc: false,
      initialPercentage: "50",
      customInitial: 0,
      frequency: 2, // Default to bi-weekly (2)
      cuotaDates: [],
      quotesAmount: [],
      loanAmount: 0,
      remainingAmount: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseAmount: 0,
      codeRequestInfo: {
        attemptsLeft: 5,
        cooldownEnds: null,
        resetTime: null,
      },
      selectedSale: null,
    }
  },
  computed: {
    isFormValid() {
      // Basic form validation
      const hasBasicInfo = this.newPurchase.clientId && 
                          this.newPurchase.productName && 
                          this.newPurchase.productPrice > 0;
      
      // Payment plan validation
      const hasPaymentPlan = this.purchaseAmount > 0 &&
                            this.loanAmount > 0 &&
                            this.quotesAmount.length > 0 &&
                            this.cuotaDates.length > 0;
      
      // Only return true if we have both basic info and a generated payment plan
      return hasBasicInfo && hasPaymentPlan;
    },
    canCalculate() {
      return this.selectedClient && 
             this.newPurchase.productPrice > 0 &&
             this.selectedClient.credit?.availableMainCredit >= 
               (this.newPurchase.productPrice * 0.75); // Maximum loan amount
    },
    salesArray() {
      const sales = this.currentAffiliate?.credit?.sales;
      if (!sales || typeof sales !== 'object') return [];
      
      return Object.values(this.currentAffiliate.credit.sales)
        .map(sale => ({
          ...sale,
          clientName: sale.clientName ? sale.clientName : this.getClientName(sale.client_id),
          purchaseDate: sale.purchaseDate || new Date().toISOString().split('T')[0],
          paid: sale.cuotas?.every(cuota => cuota.paid) || false
        }))
        .sort((a, b) => {
          const dateA = new Date(a.purchaseDate);
          const dateB = new Date(b.purchaseDate);
          return dateB - dateA;
        });
    },
    filteredSales() {
      let filtered = this.salesArray;
      
      // Filter by date range
      if (this.dateRange.start && this.dateRange.end) {
        const startDate = new Date(this.dateRange.start);
        const endDate = new Date(this.dateRange.end);
        endDate.setHours(23, 59, 59); // Include the entire end date
        
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.purchaseDate);
          return saleDate >= startDate && saleDate <= endDate;
        });
      }
      
      // Filter by status
      if (this.salesFilter === 'pending') {
        filtered = filtered.filter(sale => !sale.paid);
      } else if (this.salesFilter === 'completed') {
        filtered = filtered.filter(sale => sale.paid);
      }
      
      // Filter by search term
      if (this.searchSales) {
        const searchTerm = this.searchSales.toLowerCase();
        filtered = filtered.filter(sale => 
          sale.clientName.toLowerCase().includes(searchTerm) ||
          sale.productName.toLowerCase().includes(searchTerm) ||
          sale.purchaseDate.includes(searchTerm)
        );
      }
      
      return filtered;
    },
    recentSales() {
      return this.salesArray.slice(0, 5);
    },
    pendingPayments() {
      return this.salesArray.filter(sale => !sale.paid);
    },
    paidPurchases() {
      return this.salesArray.filter(sale => sale.paid);
    },
    cooldownMessage() {
      if (!this.codeRequestInfo.cooldownEnds) return '';
      const now = Date.now();
      const timeLeft = Math.max(0, this.codeRequestInfo.cooldownEnds - now);
      const seconds = Math.ceil(timeLeft / 1000);
      if (seconds <= 0) return '';
      if (this.codeRequestInfo.attemptsLeft === 0) {
        return 'Has alcanzado el límite de intentos por hoy';
      }
      return `Espere ${seconds} segundos para solicitar otro código`;
    },
    attemptsMessage() {
      const { attemptsLeft, resetTime } = this.codeRequestInfo;
      if (attemptsLeft === 0 && resetTime) {
        const resetDate = new Date(resetTime);
        return `Intente de nuevo después de las ${resetDate.toLocaleTimeString()}`;
      }
      return attemptsLeft < 5 ? `${attemptsLeft} intentos restantes hoy` : '';
    },
    paymentStats() {
      const totalSales = this.salesArray.length;
      const paidSales = this.paidPurchases.length;
      
      return {
        total: totalSales,
        paid: paidSales,
        pending: totalSales - paidSales,
        completionRate: totalSales ? ((paidSales / totalSales) * 100).toFixed(1) : 0
      };
    },
    getClientName() {
      return (clientId) => {
        const client = this.clients.find(c => c.id === clientId);
        return client ? `${client.firstName} ${client.lastName}` : 'Cliente Desconocido';
      };
    },
    priceWarning() {
      if (!this.selectedClient || !this.newPurchase.productPrice) return '';
      
      const availableCredit = this.selectedClient.credit?.availableMainCredit || 0;
      const maxPurchaseAmount = availableCredit * 2; // Client can finance up to 50%
      
      if (this.newPurchase.productPrice > maxPurchaseAmount) {
        const maxAmount = maxPurchaseAmount.toLocaleString();
        return `El precio excede el monto máximo permitido ($${maxAmount}). El cliente puede financiar hasta el 50% del precio total.`;
      }
      
      return '';
    },
  },
  watch: {
    frequency(newVal) {
      // Ensure frequency is always a number
      this.frequency = Number(newVal);
    },
    searchClient(query) {
      if (!query.trim()) {
        this.searchClientResults = [];
        return;
      }
      const searchQuery = query.toLowerCase();
      this.searchClientResults = this.clients.filter(client => {
        const identification = (client.identification || '').toString().toLowerCase();
        const name = (client.firstName + ' ' + client.lastName).toLowerCase();
        return identification.includes(searchQuery) || name.includes(searchQuery);
      });
    },
  },
  methods: {
    async askForCode(client) {
      
      try {
        this.waiting = true;
        
        // Initial validations
        if (!client || !client.id) {
          throw new Error('Primero seleccione un cliente');
        }

        if (client.credit?.availableMainCredit <= 0) {
          console.log('Client has no available credit:', client.credit);
          throw new Error('El cliente no tiene crédito disponible.');
        }

        if (!client.email) {
          console.log('Client has no email:', client);
          throw new Error('El cliente no tiene email registrado. Por favor actualice los datos del cliente.');
        }

        // Prepare request URL with validation
        const baseUrl = 'https://us-central1-rose-app-e062e.cloudfunctions.net/sendPurchaseCode';
        const params = new URLSearchParams();
        
        // Add required parameters with validation
        params.append('id', client.id);
        params.append('email', client.email);
        params.append('firstName', client.firstName || '');
        params.append('lastName', client.lastName || '');
        
        const url = `${baseUrl}?${params.toString()}`;

        // Make the request
        const response = await fetch(url);

        const result = await response.json();

        // Handle non-200 responses with error messages
        if (!response.ok) {
          throw new Error(result.message || `Error ${response.status}: Error al enviar el código`);
        }

        // Validate success response
        if (result && result.success) {
          console.log('Code sent successfully');
          this.verificationRequested = true;
          
          if (result.rateLimit) {
            this.codeRequestInfo = {
              attemptsLeft: result.rateLimit.remainingAttempts,
              cooldownEnds: result.rateLimit.cooldownEnds,
              resetTime: result.rateLimit.resetTime
            };
          }
          
          // Only show success toast after everything is done
          toast.success(result.message);
        } else {
          console.error('Request succeeded but response indicates failure:', result);
          throw new Error(result.message || 'Error al enviar el código');
        }

      } catch (error) {
        console.error('Error sending code:', error);
        // Reset state on error
        this.verificationRequested = false;
        this.codeRequestInfo = {};
        
        // Show error message
        toast.error(`Error al enviar el código: ${error.message}`);
      } finally {
        this.waiting = false;
      }
    },
    async selectClient(client) {
      // First set the selected client
      this.selectedClient = client;
      // Clear the search input
      this.searchClient = '';

      try {
        // Get full client data including email
        const clientRef = dbRef(db, `Users/${client.id}`);
        const clientSnapshot = await get(clientRef);
        
        if (!clientSnapshot.exists()) {
          throw new Error('Cliente no encontrado');
        }
        
        const clientData = clientSnapshot.val();
        
        // Ensure we have all required fields
        if (!clientData.email) {
          throw new Error('El cliente no tiene email registrado');
        }
        
        this.newPurchase.clientId = client.id;
        this.newPurchase.clientName = `${client.firstName} ${client.lastName}`;
        this.searchClientResults = [];
      } catch (error) {
        console.error('Error selecting client:', error);
        toast.error('Error al seleccionar el cliente');
      }
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    async registerPurchase() {
      try {
        if (!this.verificationCode) {
          throw new Error('Debe ingresar el código de verificación');
        }

        this.loading = true;

        // Emit purchase data to parent
        await this.$emit('register-purchase', {
          clientId: this.selectedClient.id,
          clientName: `${this.selectedClient.firstName} ${this.selectedClient.lastName}`,
          productName: this.newPurchase.productName,
          productPrice: this.newPurchase.productPrice,
          purchaseAmount: this.purchaseAmount,
          remainingAmount: this.remainingAmount,
          loanAmount: this.loanAmount,
          terms: this.newPurchase.terms,
          frequency: this.frequency,
          purchaseDate: this.purchaseDate,
          verificationCode: this.verificationCode,
          cuotas: this.cuotaDates.map((date, index) => ({
            date,
            amount: this.quotesAmount[index],
            paid: false
          }))
        });

        // Show success message with specific options
        toast.success('Venta registrada exitosamente', {
          duration: 4000,
          gravity: 'top',
          position: 'center',
          style: {
            background: 'linear-gradient(to right, #00b09b, #96c93d)',
            color: 'white',
            fontSize: '16px'
          }
        });

        // Refresh the sales data
        await this.fetchSales();
        
        // Reset form after successful registration
        this.resetForm();
        
      } catch (error) {
        console.error('Error registering purchase:', error);
        toast.error(error.message || 'Error al registrar la compra', {
          duration: 5000,
          gravity: 'top',
          position: 'center',
          style: {
            background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
            color: 'white',
            fontSize: '16px'
          }
        });
      } finally {
        this.loading = false;
      }
    },
    async fetchSales() {
      try {
        const salesRef = dbRef(db, `Users/${this.currentAffiliate.id}/credit/sales`);
        const snapshot = await get(salesRef);
        
        if (snapshot.exists()) {
          const sales = Object.values(snapshot.val());
          this.salesArray = sales.map(sale => ({
            ...sale,
            clientName: sale.clientName ? sale.clientName : this.getClientName(sale.client_id),
            purchaseDate: sale.purchaseDate || new Date().toISOString().split('T')[0],
            paid: sale.cuotas?.every(cuota => cuota.paid) || false
          }));
        }
      } catch (error) {
        console.error('Error fetching sales:', error);
        toast.error('Error al actualizar las ventas');
      }
    },
    async calcs(client) {
      try {
        if (!client) {
          throw new Error('Debe seleccionar un cliente para calcular sus cuotas.');
        }

        if (this.newPurchase.productPrice <= 0) {
          throw new Error('Ingrese el precio del producto para calcular.');
        }

        if (client.credit.availableMainCredit <= 0) {
          throw new Error('El cliente no tiene crédito disponible.');
        }

        // Get subscription details
        let subscriptionDetails = null;
        if (client.subscription?.subId) {
          subscriptionDetails = await this.getSubscriptionDetails(client.subscription.subId);
        }
        
        if (!subscriptionDetails) {
          throw new Error('El cliente debe tener una suscripción activa para realizar compras a crédito');
        }
        
        // Toggle on: perform calculations
        this.calc = true;

        // Calculate initial payment based on percentage
        this.updateInitial(client);

        // Adjust loan amount based on subscription tier
        const tier = subscriptionDetails.order;
        const additionalAmount = this.getTierFee(tier);
        
        // Add the tier-based additional amount to the remaining amount
        this.loanAmount = this.remainingAmount + additionalAmount;      

        // Calculate dates based on selected terms and frequency
        this.cuotaDates = this.calculateDates(this.purchaseDate, this.newPurchase.terms, this.frequency);
        
        // Calculate quote amounts with adjusted loan amount
        this.quotesAmount = Array(this.newPurchase.terms).fill(this.loanAmount / this.newPurchase.terms);

      } catch (error) {
        console.error('Error en cálculos:', error);
        toast.error(error.message || 'Error al calcular las cuotas');
        this.cancelCalcs();
      }
    },
    updateInitial(client) {
      if (!client) return;
      
      try {
        const percentage = this.initialPercentage === 'custom' 
          ? this.customInitial 
          : Number(this.initialPercentage);
        
        if (percentage <= 0 || percentage >= 100) {
          throw new Error('El porcentaje inicial debe estar entre 0 y 100');
        }

        this.purchaseAmount = (this.newPurchase.productPrice * percentage) / 100;
        this.loanAmount = this.newPurchase.productPrice - this.purchaseAmount;
        this.remainingAmount = this.loanAmount;
        
        if (this.loanAmount > client.credit?.availableMainCredit) {
          throw new Error('El monto del préstamo excede el crédito disponible del cliente');
        }

        this.calculateQuotes();
      } catch (error) {
        console.error('Error al actualizar inicial:', error);
        toast.error(error.message);
        this.cancelCalcs();
      }
    },
    calculateQuotes() {
      try {
        const quoteAmount = this.loanAmount / this.newPurchase.terms;
        if (isNaN(quoteAmount) || quoteAmount <= 0) {
          throw new Error('Error al calcular el monto de las cuotas');
        }
        this.quotesAmount = Array(this.newPurchase.terms).fill(quoteAmount);
      } catch (error) {
        console.error('Error al calcular cuotas:', error);
        toast.error(error.message);
        this.cancelCalcs();
      }
    },
    calculateDates(startDate, terms, frequency) {
      try {
        const dates = [];
        let currentDate = new Date(startDate);
        
        if (isNaN(currentDate.getTime())) {
          throw new Error('Fecha de compra inválida');
        }
        
        for(let i = 0; i < terms; i++) {
          dates.push(currentDate.toISOString().split('T')[0]);
          if (frequency === 2) {
            currentDate.setDate(currentDate.getDate() + 14);
          } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        }
        
        return dates;
      } catch (error) {
        console.error('Error al calcular fechas:', error);
        this.cancelCalcs();
        return [];
      }
    },
    cancelCalcs() {
      this.calc = false;
      // Clear calculation data but keep client and product info
      this.initialPercentage = "50";
      this.customInitial = 0;
      this.frequency = 2;
      this.cuotaDates = [];
      this.quotesAmount = [];
      this.loanAmount = 0;
      this.remainingAmount = 0;
      this.purchaseAmount = 0;
    },
    cancelPurchase() {
      // Reset all form data and calculations
      this.resetForm();
      // Clear calculation flags and data
      this.calc = false;
      this.initialPercentage = "50";
      this.customInitial = 0;
      this.frequency = 2;
      this.cuotaDates = [];
      this.quotesAmount = [];
      this.loanAmount = 0;
      this.remainingAmount = 0;
      this.purchaseAmount = 0;
      // Clear client selection
      this.selectedClient = null;
      this.searchClient = '';
      // Clear verification
      this.verificationRequested = false;
      this.verificationCode = '';
    },
    resetForm() {
      this.newPurchase = {
        clientId: '',
        clientName: '',
        productName: '',
        productPrice: 0,
        purchaseAmount: 0,
        terms: 2 // Default to 2 terms
      };
      this.selectedClient = null;
      this.verificationRequested = false;
      this.verificationCode = '';
      this.searchClient = '';
      this.calc = false;
      this.initialPercentage = "50";
      this.customInitial = 0;
      this.frequency = 2;
      this.cuotaDates = [];
      this.quotesAmount = [];
      this.loanAmount = 0;
      this.remainingAmount = 0;
      this.purchaseDate = new Date().toISOString().split('T')[0];
      this.purchaseAmount = 0;
    },
    viewPurchaseDetails(sale) {
      // Show modal with purchase details
      const modal = new Modal(document.getElementById('purchaseDetailsModal'));
      
      // Store selected sale details for modal
      this.selectedSale = {
        ...sale,
        purchaseDate: this.formatDate(sale.purchaseDate),
        productPrice: (sale.productPrice || 0).toLocaleString(),
        loanAmount: (sale.loanAmount || 0).toLocaleString(),
        initialAmount: (sale.initialAmount || 0).toLocaleString(),
        status: sale.paid ? 'Completado' : 'Pendiente',
        cuotas: sale.cuotas?.map(cuota => ({
          ...cuota,
          date: this.formatDate(cuota.date),
          amount: cuota.amount.toLocaleString()
        })) || []
      };

      modal.show();
    },
    clearSearchResults() {
      // Only clear results if no client is selected
      if (!this.selectedClient) {
        setTimeout(() => {
          this.searchClientResults = [];
        }, 200);
      }
    },
    async getSubscriptionDetails(subId) {
      try {
        const subRef = dbRef(db, `Suscriptions/${subId}`);
        const snapshot = await get(subRef);
        
        if (snapshot.exists()) {
          const subscription = snapshot.val();
          return {
            name: subscription.name,
            order: subscription.order
          };
        }
        return null;
      } catch (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
    },
    getTierFee(tier) {
      // Convert tier to number since it might come as a string
      const tierNumber = Number(tier);
      
      switch(tierNumber) {
        case 1: // Free tier
          throw new Error('Los usuarios con suscripción gratuita no pueden realizar compras a crédito');
        case 2: // bronce tier
          return 3;  // $3 increment
        case 3: // silver tier
          return 1;  // $1 increment
        case 4: // Gold tier
          return 0;  // No increment
        default:
          throw new Error(`Tipo de suscripción no válida: ${tier}`);
      }
    },
    clearDateFilter() {
      this.dateRange.start = '';
      this.dateRange.end = '';
    },
  },
  async mounted() {
    await this.$nextTick();
    this.loading = false;
  }
}
</script>

<style scoped>
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

.text-purple {
  color: #6f42c1;
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

.form-section {
  position: relative;
  padding-top: 1rem;
}

.form-section h6 {
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #444;
}

.bg-dark-subtle {
  background-color: #2d2d2d !important;
}

.selected-client-info,
.payment-options,
.payment-summary,
.verification-code {
  transition: all 0.3s ease;
}

.selected-client-info:hover,
.payment-options:hover,
.payment-summary:hover {
  border-color: #6f42c1 !important;
}

.form-check-input:checked {
  background-color: #6f42c1;
  border-color: #6f42c1;
}

.table-dark {
  background-color: transparent;
}

.table-dark td, 
.table-dark th {
  border-color: #444;
}

/* Modal styles */
.modal-content {
  border: 1px solid #444;
}

.modal-header {
  background-color: #2d2d2d;
}

.modal-body {
  background-color: #222;
}

.card.bg-dark-subtle {
  background-color: #2d2d2d !important;
  border: 1px solid #444;
}

.badge {
  font-size: 0.875rem;
}

.search-container .input-group-text {
  color: #6c757d;
}

.search-container .form-control:focus {
  border-color: #6f42c1;
  box-shadow: 0 0 0 0.2rem rgba(111, 66, 193, 0.25);
}

.form-select {
  cursor: pointer;
}

.form-select:focus {
  border-color: #6f42c1;
  box-shadow: 0 0 0 0.2rem rgba(111, 66, 193, 0.25);
}

.gap-3 {
  gap: 1rem !important;
}

.price-warning {
  font-size: 0.875rem;
}

.price-warning .fa-exclamation-triangle {
  color: #ffc107;
}

input[type="date"] {
  cursor: pointer;
  width: 140px;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}

input[type="date"]:focus {
  border-color: #6f42c1;
  box-shadow: 0 0 0 0.2rem rgba(111, 66, 193, 0.25);
}

.card-body.border-bottom {
  background-color: #2d2d2d;
}
</style> 