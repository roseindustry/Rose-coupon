<template>
  <div class="container">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-purple" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else>
      <!-- Header with Credit Stats -->
      <div class="mb-4">
        <h2 class="mb-3 fw-500 text-center text-primary">Panel de Crédito del Comercio</h2>
        <div class="row g-3">
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body text-center">
                <h6 class="text-secondary mb-2">Crédito Total</h6>
                <h4 class="text-light">${{ creditData?.mainCredit?.toLocaleString() || 0 }}</h4>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-body text-center">
                <h6 class="text-secondary mb-2">Crédito Disponible</h6>
                <h4 class="text-light">${{ creditData?.availableMainCredit?.toLocaleString() || 0 }}</h4>
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
              <form @submit.prevent="handlePurchase">
                <!-- Step 1: Client Selection -->
                <div class="form-section mb-4">
                  <h6 class="text-light mb-3">1. Selección del Cliente</h6>
                  <div class="row">
                    <div class="col-md-12 mb-3">
                      <SearchInput v-model="searchClient" placeholder="Buscar cliente por nombre o cédula..."
                        :results="searchClientResults" @select="selectClient"
                        @blur="() => !selectedClient && clearSearchResults()">
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
                  <div v-if="selectedClient" class="selected-client-info p-3 border rounded bg-dark">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 class="text-light mb-2">{{ selectedClient.firstName }} {{ selectedClient.lastName }}</h6>
                        <p class="text-secondary mb-2">V{{ selectedClient.identification }}</p>
                      </div>
                      <div class="text-end">
                        <p class="text-light mb-1">Crédito Disponible</p>
                        <h5 class="text-success">${{ selectedClient.credit?.availableMainCredit?.toLocaleString() || 0
                          }}</h5>
                      </div>
                    </div>
                  </div>

                  <!-- Warning for unverified user -->
                  <div v-if="selectedClient && (!selectedClient.emailVerified || !selectedClient.phoneVerified)"
                    class="alert alert-danger mt-3">
                    <div class="d-flex align-items-start">
                      <i class="fas fa-exclamation-circle fa-2x me-2 text-danger"></i>
                      <div>
                        <h5 class="mb-1">Cliente no verificado</h5>
                        <p class="mb-0">El cliente no ha verificado su correo electrónico o número de teléfono.</p>
                        <p class="mb-0">No se puede proceder con la compra hasta que el cliente verifique su cuenta.</p>
                      </div>
                    </div>
                  </div>

                  <!-- Warning for unpaid cuotas -->
                  <div v-if="selectedClient && selectedClient.hasUnpaidCuotas" class="mt-3"
                    :class="selectedClient.unpaidCuotasCount > 2 ? 'alert alert-danger' : 'alert alert-warning'">
                    <div class="d-flex align-items-start">
                      <i
                        :class="selectedClient.unpaidCuotasCount > 2 ? 'fas fa-exclamation-circle fa-2x me-2 text-danger' : 'fas fa-exclamation-triangle fa-2x me-2 text-warning'"></i>
                      <div>
                        <h5 class="mb-1">Cliente con pagos pendientes</h5>
                        <p class="mb-1">Este cliente tiene {{ selectedClient.unpaidCuotasCount }} cuota{{
                          selectedClient.unpaidCuotasCount
                          !== 1 ? 's' : '' }} vencida{{ selectedClient.unpaidCuotasCount !== 1 ? 's' : '' }} sin pagar.
                        </p>
                        <p v-if="selectedClient.unpaidCuotasCount > 2" class="mb-0 fw-bold">
                          No se puede proceder con la compra hasta que el cliente regularice sus pagos.
                        </p>
                        <p v-else class="mb-0">
                          El cliente puede proceder con la compra, pero se recomienda regularizar los pagos pendientes.
                        </p>
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
                        <input type="number" step="0.01" v-model.number="newPurchase.productPrice"
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
                        v-model="formattedDate">
                    </div>
                    <div class="col-md-6 mb-3 d-flex align-items-end">
                      <button type="button" class="btn btn-theme w-100" @click="calcs(selectedClient)"
                        :disabled="!canCalculate"
                        :title="!canCalculate ? 'Verifique el monto y el crédito disponible' : ''">
                        <i class="fas fa-calculator me-2"></i>
                        Calcular cuotas
                      </button>
                    </div>
                  </div>
                  <div class="mb-3">
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input" id="includeFee" v-model="includeFee">
                      <label class="form-check-label" for="includeFee">
                        Incluir cargo por gestión ($1)
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Payment Plan -->
                <div v-if="calc" class="form-section mb-4">
                  <h6 class="text-light mb-3">3. Plan de Pagos</h6>
                  <div class="row">
                    <!-- Initial Payment Options -->
                    <div class="col-12 mb-4">
                      <div class="payment-options p-3 border rounded bg-dark">
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
                            <input class="form-check-input" type="radio" id="initial-custom" value="custom"
                              v-model="initialPercentage" />
                            <label class="form-check-label text-light" for="initial-custom">
                              Personalizado
                            </label>
                          </div>
                        </div>
                        <div v-if="initialPercentage === 'custom'" class="mt-3">
                          <div class="input-group percentage-input">
                            <input type="number" class="form-control bg-dark text-light border-secondary"
                              placeholder="Ingrese el porcentaje" min="1" max="99" v-model="customInitial"
                              @input="updateInitial(selectedClient)" />
                            <span class="input-group-text bg-dark text-light border-secondary">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Payment Summary -->
                    <div class="col-12 mb-4">
                      <div class="payment-summary p-3 border rounded bg-dark">
                        <div class="row">
                          <div class="col-md-3">
                            <label class="text-secondary">Inicial</label>
                            <h5 class="text-light">${{ purchaseAmount.toLocaleString() }}</h5>
                            <small class="text-secondary" v-if="includeFee">
                              Incluye cargo de $1 por gestión
                            </small>
                          </div>
                          <div class="col-md-4">
                            <label class="text-secondary">Préstamo</label>
                            <h5 class="text-light">${{ loanAmount.toLocaleString() }}</h5>
                          </div>
                          <div class="col-md-2 mt-2 mt-md-0">
                            <label class="text-secondary">Cuotas</label>
                            <select v-model="newPurchase.terms" @change="calcs(selectedClient)"
                              class="form-select bg-dark text-light border-secondary">
                              <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                            </select>
                          </div>
                          <div class="col-md-3 mt-2 mt-md-0">
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
                  <div class="verification-code p-3 border rounded bg-dark">
                    <label class="form-label text-light">Código de verificación</label>
                    <input type="number" class="form-control bg-dark text-light border-secondary"
                      v-model="verificationCode" placeholder="Ingrese el código">
                  </div>
                </div>

                <!-- Form Actions -->
                <div class="text-end mt-4">
                  <!-- Rate Limit Info -->
                  <div v-if="shouldShowVerificationMessages" class="text-start mb-3">
                    <div v-if="hasExceededAttempts" class="d-flex align-items-center text-danger">
                      <i class="fas fa-ban me-2"></i>
                      <small>Cliente superó los intentos permitidos para hoy</small>
                    </div>
                    <template v-else>
                      <div v-if="cooldownMessage" class="d-flex align-items-center text-warning mb-2">
                        <i class="fas fa-clock me-2"></i>
                        <small>{{ cooldownMessage }}</small>
                      </div>
                      <div v-if="attemptsMessage" class="d-flex align-items-center" :class="{
                        'text-danger': rateLimitData[selectedClient?.id]?.attempts >= 4,
                        'text-warning': rateLimitData[selectedClient?.id]?.attempts < 4
                      }">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <small>{{ attemptsMessage }}</small>
                      </div>
                    </template>
                  </div>

                  <!-- Form Buttons -->
                  <div class="d-flex justify-content-between">
                    <div class="d-flex justify-content-between gap-2">
                      <button v-if="!verificationRequested" type="button" class="btn btn-outline-secondary"
                        @click="sendDummyCode(selectedClient)"
                        :disabled="!selectedClient || hasExceededAttempts || clientHasTooManyUnpaidCuotas || isSubmitting">
                        <span v-if="isSubmitting">
                          <i class="fas fa-spinner fa-spin me-2"></i>
                        </span>
                        <span v-else>
                          <i class="fas fa-wrench me-2"></i>
                          Mantenimiento
                        </span>
                      </button>
                      <button type="button" class="btn btn-outline-light me-2" @click="cancelPurchase"
                        :disabled="!selectedClient">
                        Cancelar
                      </button>
                    </div>
                    <div class="d-flex justify-content-between gap-2">
                      <!-- <button v-if="!selectedClient" @click="resetClientAttempts" class="btn btn-theme">
                      <i class="fas fa-check me-2"></i>
                        Resetear intentos
                      </button> -->
                      <button v-if="calc && !verificationRequested" type="button" class="btn btn-theme"
                        @click="requestVerification" :disabled="!canRequestVerification || waiting">
                        <span v-if="waiting">
                          <i class="fas fa-spinner fa-spin me-2"></i>
                        </span>
                        <span v-else>
                          <i class="fas fa-key me-2"></i>
                          Solicitar Código
                        </span>
                      </button>
                      <button v-if="verificationRequested" type="submit" class="btn btn-theme"
                        :disabled="!verificationCode || clientHasTooManyUnpaidCuotas || isSubmitting">
                        <span v-if="isSubmitting">
                          <i class="fas fa-spinner fa-spin me-2"></i>
                        </span>
                        <span v-else>
                          <i class="fas fa-check me-2"></i>
                          Confirmar Venta
                        </span>
                      </button>
                    </div>
                  </div>
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
              <div v-if="recentSales.length > 0" class="list-group list-group-flush">
                <div v-for="sale in recentSales" :key="sale.id" class="list-group-item bg-dark border-secondary">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-1 text-light text-truncate" style="max-width: 100px;">{{ sale.clientName }}</h6>
                      <small class="text-secondary">{{ formatDate(sale.purchaseDate) }}</small>
                    </div>

                    <div class="text-light">${{ Number(sale.productPrice).toFixed(2) }}</div>
                    <div class="text-end">
                      <span :class="['badge', sale.paid ? 'text-success' : 'text-warning']">
                        {{ sale.paid ? 'Completado' : 'Pendiente' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else>
                <p class="text-center fw-bold py-4">No hay ventas registradas</p>
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
            <!-- Card Header with Filters -->
            <div class="card-header">
              <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <h5 class="text-black mb-0">Historial de Ventas</h5>
                <div class="d-flex flex-column flex-sm-row gap-3 align-items-stretch align-items-sm-center">
                  <!-- Status Filter -->
                  <select v-model="salesFilter" class="form-select bg-dark text-light border-secondary">
                    <option value="all">Todas las ventas</option>
                    <option value="pending">Pendientes</option>
                    <option value="completed">Completadas</option>
                  </select>

                  <!-- Search Bar -->
                  <div class="search-container">
                    <div class="input-group">
                      <span class="input-group-text bg-dark border-secondary">
                        <i class="fas fa-search text-secondary"></i>
                      </span>
                      <input type="text" class="form-control bg-dark text-light border-secondary" v-model="searchSales"
                        placeholder="Buscar por cliente, producto o fecha...">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Date Filter Section -->
            <div class="card-body border-bottom border-secondary pb-3">
              <div
                class="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-center gap-3">
                <div class="d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center">
                  <div class="d-flex flex-column">
                    <small class="text-secondary mb-1">Desde</small>
                    <input type="date" class="form-control bg-dark text-light border-secondary"
                      v-model="dateRange.start">
                  </div>
                  <div class="d-flex flex-column">
                    <small class="text-secondary mb-1">Hasta</small>
                    <input type="date" class="form-control bg-dark text-light border-secondary" v-model="dateRange.end">
                  </div>
                </div>
                <button class="btn btn-outline-secondary align-self-sm-end mt-2 mt-sm-0" @click="clearDateFilter"
                  v-if="dateRange.start || dateRange.end">
                  Limpiar
                </button>
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

    <PurchaseDetailsModal v-if="selectedSale" :sale="selectedSale" @close="closeModal" ref="purchaseModal" />
  </div>
</template>

<script>
import SearchInput from '@/components/app/SearchInput.vue'
import { toast } from '@/utils/toast.js'
import { ref as dbRef, get, push, update, set } from 'firebase/database'
import { db } from '@/firebase/init'
import 'toastify-js/src/toastify.css'
import PurchaseDetailsModal from './modals/PurchaseDetailsModal.vue'
import { sendEmail } from '@/utils/emailService.js'
import { auth } from '@/firebase/init'
import { reactive } from 'vue'

export default {
  name: 'AffiliateCreditView',
  components: {
    SearchInput,
    PurchaseDetailsModal
  },
  props: {
    currentAffiliate: {
      type: Object,
      required: false,
      default: () => ({
        id: '',
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
      calculationsPerformed: false,
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
      purchaseDate: new Date().toISOString(),
      purchaseAmount: 0,
      clientVerifications: {}, // Track verification attempts per client
      selectedSale: null,
      countdownTimer: null,
      salesData: [],
      subscriptions: [],
      includeFee: true, // Default to true to include the fee
      rateLimitData: reactive({}),
      isSubmitting: false
    }
  },
  computed: {
    formattedDate() {
      const originalDate = new Date(this.purchaseDate);

      const correctedDate = new Date(
        originalDate.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate()
      );

      // Convert to ISO string
      const paymentDate = correctedDate.toISOString();
      const formattedDate = paymentDate.split("T")[0];
      return formattedDate;
    },
    isFormValid() {
      // Basic form validation
      const hasBasicInfo = this.selectedClient &&
        this.newPurchase.productName &&
        this.newPurchase.productPrice > 0;

      // Payment plan validation
      const hasPaymentPlan = this.purchaseAmount > 0 &&
        this.loanAmount > 0 &&
        this.quotesAmount.length > 0 &&
        this.cuotaDates.length > 0;

      // Verification attempts validation - only check for cooldown period
      // We don't track attempts locally anymore, we rely on the cloud function
      const isNotInCooldown = !this.selectedClient ||
        !this.clientVerifications[this.selectedClient.id] ||
        this.clientVerifications[this.selectedClient.id].cooldownEnds <= Date.now();

      return hasBasicInfo && hasPaymentPlan && isNotInCooldown;
    },
    canCalculate() {
      return (
        this.selectedClient &&
        this.newPurchase.productPrice > 0
      );
    },
    creditData() {
      return this.currentAffiliate?.credit;
    },
    salesArray() {
      const sales = this.currentAffiliate?.credit?.sales;
      if (!sales || typeof sales !== 'object') return [];

      // Convert to array and sort by date in descending order
      return Object.entries(sales).map(([id, sale]) => ({
        ...sale,
        id, // Keep the sale ID
        clientName: sale.clientName ? sale.clientName : this.getClientName(sale.client_id),
        clientSubscription: this.getClientSubscription(sale.client_id),
        purchaseDate: sale.purchaseDate || new Date().toISOString().split('T')[0],
        paid: sale.cuotas?.every(cuota => cuota.paid) || false
      })).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
        .filter(sale => !sale.deleted);
    },
    filteredSales() {
      let filtered = this.salesArray;

      // Filter by date range
      if (this.dateRange.start && this.dateRange.end) {
        const startDate = new Date(this.dateRange.start);
        const endDate = new Date(this.dateRange.end);
        endDate.setHours(23, 59, 59);

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
      if (!this.selectedClient) return '';

      const cooldownEnds = this.clientVerifications[this.selectedClient.id]?.cooldownEnds || 0;
      if (cooldownEnds > Date.now()) {
        const secondsLeft = Math.ceil((cooldownEnds - Date.now()) / 1000);
        return `Espera ${secondsLeft} segundos antes de solicitar otro código`;
      }

      return '';
    },
    attemptsMessage() {
      if (!this.selectedClient || !this.rateLimitData[this.selectedClient.id]) return '';

      const attempts = this.rateLimitData[this.selectedClient.id].attempts || 0;
      const remaining = 5 - attempts;

      if (remaining <= 0) return 'Sin';

      return `${remaining} intentos restantes para hoy`;
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

      const totalPrice = this.newPurchase.productPrice;
      const availableCredit = this.selectedClient.credit?.availableMainCredit || 0;
      const loanAmount = totalPrice - ((totalPrice * (this.initialPercentage === 'custom' ? this.customInitial : Number(this.initialPercentage))) / 100);

      if (loanAmount > availableCredit) {
        const requiredInitial = totalPrice - availableCredit;
        const requiredPercentage = ((requiredInitial / totalPrice) * 100).toFixed(1);
        return `Basado en el crédito disponible ($${availableCredit}), se requiere un pago inicial de $${requiredInitial.toFixed(2)} (${requiredPercentage}%)`;
      }

      return '';
    },
    hasExceededAttempts() {
      if (!this.selectedClient) return false;

      // Check if we have rate limit data from the server
      const rateLimitRef = dbRef(db, `rateLimits/verificationCodes/${this.selectedClient.id}/purchase`);

      if (!this.rateLimitData[this.selectedClient.id]) {
        // Fetch the data if we don't have it yet
        get(rateLimitRef).then(snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const now = Date.now();
            const lastAttempt = data.lastAttempt || now;

            // Check if it's a new day
            const isNewDay = new Date(now).getDate() !== new Date(lastAttempt).getDate();

            // If it's a new day, reset attempts
            if (isNewDay) {
              set(rateLimitRef, {
                attempts: 0,
                firstAttempt: now,
                lastAttempt: now
              });
            }

            // Use Vue 3 reactivity
            this.rateLimitData[this.selectedClient.id] = {
              attempts: isNewDay ? 0 : (data.attempts || 0),
              firstAttempt: data.firstAttempt || now,
              lastAttempt: now
            };
          } else {
            // No rate limit data exists yet
            this.rateLimitData[this.selectedClient.id] = {
              attempts: 0,
              firstAttempt: Date.now(),
              lastAttempt: 0
            };
          }
        }).catch(error => {
          console.error('Error fetching rate limit data:', error);
        });

        // Return false while we're loading
        return false;
      }

      // Check if attempts have exceeded the limit
      return this.rateLimitData[this.selectedClient.id].attempts >= 5;
    },
    shouldShowVerificationMessages() {
      if (!this.selectedClient) return false;

      // Check if we have cooldown information
      const hasCooldown = this.clientVerifications[this.selectedClient.id]?.cooldownEnds > Date.now();

      // Check if we have rate limit data
      const hasRateLimitData = !!this.rateLimitData[this.selectedClient.id];

      // If we have either, show messages
      return hasCooldown || hasRateLimitData;
    },
    clientHasTooManyUnpaidCuotas() {
      return this.selectedClient &&
        this.selectedClient.hasUnpaidCuotas &&
        this.selectedClient.unpaidCuotasCount > 2;
    },
    canRequestVerification() {
      return this.calc &&
        this.selectedClient &&
        (!this.selectedClient.hasUnpaidCuotas ||
          this.selectedClient.unpaidCuotasCount <= 2);
    },
  },
  watch: {
    frequency(newVal) {
      // Ensure frequency is always a number
      this.frequency = Number(newVal);
    },
    'newPurchase.productPrice'(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.calculationsPerformed = false;
        this.calc = false;
      }
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
    includeFee(newValue) {
      if (this.calculationsPerformed) {
        // Recalculate with the new fee setting
        this.calcs(this.selectedClient);
      }
    },
    // verificationRequested(newVal, oldVal) {
    //   console.log(`verificationRequested changed from ${oldVal} to ${newVal}`);
    // }
  },
  methods: {
    // async applyCredit(userId) {
    //   try {
    //     const userPath = `Users/${userId}/credit/main`;

    //     await update(dbRef(db, userPath), {
    //       totalCredit: 100,
    //       availableCredit: 100,
    //     });

    //     console.log('Credit assigned to: ', userId);
    //   } catch (error) {
    //     console.error('Error assigning credit:', error);
    //   }
    // },
    formatDate(date) {
      const dateObj = new Date(date);
      dateObj.setDate(dateObj.getDate() + 1); // Adjust for timezone
      return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    performValidations(client) {
      if (!client || !client.id) {
        toast.error('Primero seleccione un cliente');
        return;
      }

      if (!client.email) {
        toast.error('El cliente no tiene email registrado. Por favor actualice los datos del cliente.');
        return;
      }

      if (!client.emailVerified) {
        toast.error('El cliente debe tener su email verificado para solicitar un código');
        return;
      }

      if (client.credit?.availableMainCredit <= 0) {
        toast.error('El cliente no tiene crédito disponible.');
        return;
      }

      if (client.hasUnpaidCuotas && client.unpaidCuotasCount > 2) {
        toast.error(`El cliente tiene ${client.unpaidCuotasCount} pagos pendientes. No se puede proceder con la compra. Regularice sus pagos pendientes.`);
        return;
      }
    },
    validateInputs() {
      // Check if product name is provided
      if (!this.newPurchase.productName || this.newPurchase.productName.trim() === '') {
        toast.error('Por favor ingrese el nombre del producto');
        return false;
      }

      // Check if product price is valid
      if (!this.newPurchase.productPrice || this.newPurchase.productPrice <= 0) {
        toast.error('Por favor ingrese un precio válido');
        return false;
      }

      // Check if verification code is provided when required
      if (this.verificationRequested && (!this.verificationCode)) {
        toast.error('Por favor ingrese el código de verificación');
        return false;
      }

      // Check if payment plan calculations have been performed
      if (!this.calc) {
        toast.error('Por favor calcule el plan de pagos');
        return false;
      }

      return true;
    },

    async checkClientUnpaidCuotas(client) {
      try {
        // Get client purchases from database
        const clientRef = dbRef(db, `Users/${client.id}/credit/main/purchases`);
        const snapshot = await get(clientRef);

        if (snapshot.exists()) {
          const purchases = snapshot.val();
          let unpaidCuotasCount = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Check each purchase for unpaid expired cuotas
          Object.values(purchases).forEach(purchase => {
            if (purchase.cuotas) {
              Object.values(purchase.cuotas).forEach(cuota => {
                const cuotaDate = new Date(cuota.date);
                if (!cuota.paid && cuotaDate < today) {
                  unpaidCuotasCount++;
                }
              });
            }
          });

          // Update client object with unpaid cuotas info
          this.selectedClient = {
            ...this.selectedClient,
            hasUnpaidCuotas: unpaidCuotasCount > 0,
            unpaidCuotasCount: unpaidCuotasCount
          };

          // console.log(`Client ${client.firstName} ${client.lastName} has ${unpaidCuotasCount} unpaid expired cuotas`);
        } else {
          // No purchases found
          this.selectedClient = {
            ...this.selectedClient,
            hasUnpaidCuotas: false,
            unpaidCuotasCount: 0
          };
        }
      } catch (error) {
        console.error("Error checking unpaid cuotas:", error);
        // Default to allowing purchase if there's an error checking
        this.selectedClient = {
          ...this.selectedClient,
          hasUnpaidCuotas: false,
          unpaidCuotasCount: 0
        };
      }
    },
    async selectClient(client) {
      try {
        if (!client.emailVerified || !client.phoneVerified) {
          toast.error('El cliente no ha verificado su correo electrónico o número de teléfono.');
          return;
        } else {
          // console.log('Selecting client:', client.id);
          this.selectedClient = client;
          this.searchClient = '';
          this.searchClientResults = [];

          // Check for unpaid cuotas
          await this.checkClientUnpaidCuotas(client);

          // Reset client attempts if a new day
          await this.resetClientAttempts(client);

          // Reset other fields
          this.newPurchase.productName = '';
          this.newPurchase.productPrice = '';
          this.calc = false;
          this.verificationRequested = false;
          this.verificationCode = '';
        }
      } catch (error) {
        console.error("Error selecting client:", error);
      }
    },
    async requestVerification() {
      try {
        // Validate inputs first
        if (!this.validateInputs()) return;

        // Call for verification code
        await this.askForCode(this.selectedClient);

      } catch (error) {
        console.error('Error requesting verification:', error);
        toast.error('Error al solicitar verificación');
      }
    },
    async askForCode(client) {
      try {
        this.waiting = true;

        // validations
        this.performValidations(client);

        // Make the cloud function request with type=purchase
        const baseUrl = 'https://us-central1-rose-app-e062e.cloudfunctions.net/sendVerificationCode';
        const params = new URLSearchParams({
          id: client.id,
          email: client.email,
          firstName: client.firstName || '',
          lastName: client.lastName || '',
          type: 'purchase'
        });

        const response = await fetch(`${baseUrl}?${params.toString()}`);
        const result = await response.json();

        if (result.rateLimit) {
          // Store only cooldown information for UI
          this.clientVerifications[client.id] = {
            cooldownEnds: result.rateLimit.cooldownEnds
          };
        }

        if (!response.ok) {
          // Handle rate limiting responses
          if (response.status === 429) {
            if (result.message.includes('límite de intentos')) {
              toast.error('Has excedido el número máximo de intentos para hoy');
            } else if (result.message.includes('espera')) {
              // Extract seconds from message
              const seconds = parseInt(result.message.match(/\d+/)[0]) || 120;
              this.clientVerifications[client.id] = {
                cooldownEnds: Date.now() + (seconds * 1000)
              };
              this.startCooldownTimer();
              toast.error(result.message);
            }
          }
          throw new Error(result.message || `Error ${response.status}: Error al enviar el código`);
        }

        if (result && result.success) {
          this.verificationRequested = true;

          toast.success(result.message);

          // Update remaining attempts display if provided
          if (result.rateLimit?.remainingAttempts) {
            toast.info(`Te quedan ${result.rateLimit.remainingAttempts} intentos para hoy`);
          }

          // Start the cooldown timer
          this.startCooldownTimer();
        } else {
          throw new Error(result.message || 'Error al enviar el código');
        }
      } catch (error) {
        console.error('Error sending code:', error);
        toast.error(`Error: ${error.message}`);
        this.verificationRequested = false;
      } finally {
        this.waiting = false;
      }
    },

    startCooldownTimer() {
      // Clear any existing timer
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }

      // Start a new countdown timer
      this.countdownTimer = setInterval(() => {
        if (!this.selectedClient) {
          clearInterval(this.countdownTimer);
          return;
        }

        const clientInfo = this.clientVerifications[this.selectedClient.id];
        if (!clientInfo || clientInfo.cooldownEnds <= Date.now()) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          return;
        }

        // Update the countdown message
        const secondsLeft = Math.ceil((clientInfo.cooldownEnds - Date.now()) / 1000);
        if (secondsLeft <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
      }, 1000);
    },

    async calcs(client) {
      try {
        if (!client || !this.newPurchase.productPrice) {
          toast.error('Por favor complete los datos del cliente y el producto');
          return;
        }

        const totalPrice = this.newPurchase.productPrice;
        const availableCredit = client.credit?.availableMainCredit || 0;

        // Get the initial percentage (either from radio buttons or custom input)
        let percentage = this.initialPercentage === 'custom'
          ? this.customInitial
          : Number(this.initialPercentage);

        if (percentage <= 0 || percentage >= 100) {
          toast.error('El porcentaje inicial debe estar entre 0 y 100');
          return;
        }

        // Calculate initial amounts
        let initialPayment = (totalPrice * percentage) / 100;
        let loanAmount = totalPrice - initialPayment;

        // If loan amount exceeds available credit, adjust the amounts
        if (loanAmount > availableCredit) {
          loanAmount = availableCredit;
          initialPayment = totalPrice - loanAmount;

          // Calculate and update the actual initial percentage
          const actualPercentage = ((initialPayment / totalPrice) * 100).toFixed(1);

          // Show info to user about the adjusted amounts
          // toast.info(
          //     `Basado en el crédito disponible ($${availableCredit}), ` +
          //     `se requiere un pago inicial de $${initialPayment.toFixed(2)} (${actualPercentage}%)`,
          //     { duration: 5000 }
          // );

          // Update the UI to show the new percentage
          if (this.initialPercentage !== 'custom') {
            this.initialPercentage = 'custom';
          }
          this.customInitial = Number(actualPercentage);
        }

        // Update the amounts
        this.purchaseAmount = initialPayment;
        this.loanAmount = loanAmount;
        this.remainingAmount = loanAmount;

        // Add fee if applicable
        if (this.includeFee) {
          const additionalAmount = this.includeFee ? 1 : 0;
          this.purchaseAmount += additionalAmount;
          this.remainingAmount = this.loanAmount;
        }

        // Calculate dates and quotes
        this.cuotaDates = this.calculateDates(
          this.purchaseDate,
          this.newPurchase.terms,
          this.frequency
        );

        // Calculate quote amounts
        const quoteAmount = this.loanAmount / this.newPurchase.terms;
        this.quotesAmount = Array(this.newPurchase.terms).fill(quoteAmount);

        this.calculationsPerformed = true;
        this.calc = true;

      } catch (error) {
        console.error('Error en cálculos:', error);
        toast.error('Error al realizar los cálculos');
        this.cancelCalcs();
      }
    },
    async updateInitial(client) {
      if (!client) return;

      try {
        const percentage = this.initialPercentage === 'custom'
          ? this.customInitial
          : Number(this.initialPercentage);

        if (percentage <= 0 || percentage >= 100) {
          throw new Error('El porcentaje inicial debe estar entre 0 y 100');
        }

        // Calculate base amounts
        this.purchaseAmount = (this.newPurchase.productPrice * percentage) / 100;
        this.loanAmount = this.newPurchase.productPrice - this.purchaseAmount;
        this.remainingAmount = this.loanAmount;

        // Update initial amount with included fee if applicable
        if (this.includeFee) {
          const additionalAmount = this.includeFee ? 1 : 0;
          this.purchaseAmount += additionalAmount;
          this.remainingAmount = this.loanAmount;
        }

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
        // Create a new Date object from the purchase date
        let currentDate = new Date(startDate);

        if (isNaN(currentDate.getTime())) {
          throw new Error('Fecha de compra inválida');
        }

        // Set the first payment date based on frequency
        // First, advance the date by the frequency period
        if (frequency === 2) {
          // Bi-weekly: Add 14 days for the first payment
          currentDate.setDate(currentDate.getDate() + 14);
        } else {
          // Monthly: Add 1 month for the first payment
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Now generate all payment dates
        for (let i = 0; i < terms; i++) {
          // Add the date to our array
          dates.push(currentDate.toISOString().split('T')[0]);

          // Move to the next payment date
          if (frequency === 2) {
            // Bi-weekly: Add 14 days for each subsequent payment
            currentDate.setDate(currentDate.getDate() + 14);
          } else {
            // Monthly: Add 1 month for each subsequent payment
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
      this.calculationsPerformed = false;
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

    async handlePurchase() {
      try {
        this.isSubmitting = true;

        // Validate inputs
        if (!this.validateInputs()) {
          this.isSubmitting = false;
          return;
        }

        // Create the purchase data object to pass to the parent component
        const purchaseData = {
          clientId: this.selectedClient.uid || this.selectedClient.id,
          clientName: `${this.selectedClient.firstName} ${this.selectedClient.lastName}`,
          productName: this.newPurchase.productName,
          productPrice: this.newPurchase.productPrice,
          purchaseAmount: this.purchaseAmount,
          remainingAmount: this.remainingAmount,
          loanAmount: this.loanAmount,
          includeFee: this.includeFee,
          terms: this.cuotaDates.length,
          frequency: this.frequency,
          purchaseDate: this.formattedDate,
          verificationCode: this.verificationCode,
          cuotas: this.cuotaDates.map((date, index) => ({
            amount: this.quotesAmount[index],
            date: date,
            paymentDate: null
          }))
        };

        this.$emit('register-purchase', purchaseData, (success) => {
          this.isSubmitting = false; // Stop loading

          if (success) {
            this.resetForm(); // Reset form if successful
          }
        });

      } catch (error) {
        console.error('Error preparing purchase data:', error);
        toast.error(error.message || 'Error al preparar los datos de la compra');
      }
    },

    viewPurchaseDetails(sale) {
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

      this.$nextTick(() => {
        this.$refs.purchaseModal.show();
      });
    },
    closeModal() {
      this.selectedSale = null;
    },
    getClientSubscription(clientId) {
      if (!clientId || !this.clients) {
        return {
          name: "No disponible",
          id: null,
          order: null
        };
      }

      const client = this.clients.find(c => c.id === clientId || c.uid === clientId);
      if (!client) {
        return {
          name: "Cliente no encontrado",
          id: null,
          order: null
        };
      }

      if (!client.subscription) {
        return {
          name: "Sin suscripción",
          id: null,
          order: null
        };
      }

      return client ? client.subscription : null;
    },
    async fetchSubscriptions() {
      const subscriptionsRef = dbRef(db, 'Suscriptions');
      const snapshot = await get(subscriptionsRef);
      if (snapshot.exists()) {
        // Convert to array and add IDs
        this.subscriptions = Object.entries(snapshot.val()).map(([id, data]) => ({
          ...data,
          id
        }));
      } else {
        this.subscriptions = [];
      }
    },

    clearSearchResults() {
      // Only clear results if no client is selected
      if (!this.selectedClient) {
        setTimeout(() => {
          this.searchClientResults = [];
        }, 200);
      }
    },
    clearDateFilter() {
      this.dateRange.start = '';
      this.dateRange.end = '';
    },
    resetForm() {
      this.calculationsPerformed = false;
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
      this.purchaseAmount = 0;

      this.$emit('refresh-data');

      // Reset verification state for current client
      if (this.selectedClient && this.clientVerifications[this.selectedClient.id]) {
        this.clientVerifications[this.selectedClient.id] = {
          cooldownEnds: 0
        };
      }
    },

    async sendDummyCode(client) {
      try {
        this.isSubmitting = true;
        if (!client || !client.email) {
          toast.error('Cliente no válido o sin dirección de correo electrónico.');
          return;
        }

        const emailContent = 'Nuestro sistema se encuentra en mantenimiento en este momento. Intente más tarde.';
        const emailHeader = `Notificación de Mantenimiento`;
        const emailFooter = 'Gracias por usar Rose App.';
        const emailData = {
          to: client.email,
          message: {
            subject: emailHeader,
            text: emailContent
            ,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                            <h2 style="color: #6f42c1;">${emailHeader}<i class="fas fa-wrench me-2"></i></h2>
                            <p>Hola ${client.firstName} ${client.lastName},</p>
                            <p>${emailContent}</p>
                            <p>${emailFooter}</p>
                          </div>`
          }
        };

        const result = await sendEmail(emailData);

        if (result.success) {
          toast.success('Correo de mantenimiento enviado exitosamente.');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error al enviar el correo:', error);
        toast.error('Error al enviar el correo de mantenimiento.');
      } finally {
        this.isSubmitting = false;
      }
    },
    async resetClientAttempts(client) {
      try {
        if (!client || !client.id) {
          toast.error('No hay cliente seleccionado');
          return;
        }

        // Reference to the rate limit for purchase verification
        const rateLimitRef = dbRef(db, `rateLimits/verificationCodes/${client.id}/purchase`);

        // Get the current rate limit data
        const snapshot = await get(rateLimitRef);

        if (snapshot.exists()) {
          const rateLimitData = snapshot.val();
          const now = Date.now();
          const lastAttempt = rateLimitData.lastAttempt || now;

          // Or check if it's a new day
          const isNewDay = new Date(now).getDate() !== new Date(lastAttempt).getDate();

          if (isNewDay) {
            // Reset attempts
            await set(rateLimitRef, {
              attempts: 0,
              firstAttempt: now,
              lastAttempt: now
            });

            // Reset local tracking
            this.clientVerifications[client.id] = {
              cooldownEnds: 0
            };

            // Clear any active cooldown timer
            if (this.countdownTimer) {
              clearInterval(this.countdownTimer);
              this.countdownTimer = null;
            }

            toast.success('Intentos de verificación reiniciados');
          }
        }
      } catch (error) {
        console.error('Error resetting attempts:', error);
        toast.error('Error al reiniciar intentos');
      }
    },

    // currently not used
    // getTierFee(tier) {
    //   // Convert tier to number since it might come as a string
    //   const tierNumber = Number(tier);

    //   switch(tierNumber) {
    //     case 1: // Free tier
    //       return 0; // Just return 0 for display purposes
    //     case 2: // bronce tier
    //       return 3;  // $3 increment
    //     case 3: // silver tier
    //       return 1;  // $1 increment
    //     case 4: // Gold tier
    //       return 0;  // No increment
    //     default:
    //       return 0; // Default to 0 for invalid tiers
    //   }
    // },
    // async getSubscriptionDetails(subId) {
    //   try {
    //     const subRef = dbRef(db, `Suscriptions/${subId}`);
    //     const snapshot = await get(subRef);

    //     if (snapshot.exists()) {
    //       const subscription = snapshot.val();
    //       return {
    //         name: subscription.name,
    //         order: subscription.order
    //       };
    //     }
    //     return null;
    //   } catch (error) {
    //     console.error('Error fetching subscription:', error);
    //     return null;
    //   }
    // },
  },
  async mounted() {
    await this.$nextTick();

    await this.fetchSubscriptions();
    this.loading = false;
  },
  beforeUnmount() {
    // Clean up the timer when component is destroyed
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }
}
</script>

<style lang="scss" scoped>
.card-header {
  .form-select {
    min-width: 150px;

    @media (max-width: 575.98px) {
      width: 100%;
    }
  }

  .search-container {
    @media (min-width: 576px) {
      width: 300px;
    }

    @media (max-width: 575.98px) {
      width: 100%;
    }
  }
}

.card-body {
  input[type="date"] {
    @media (max-width: 575.98px) {
      width: 100%;
    }

    @media (min-width: 576px) {
      width: 140px;
    }
  }
}

/* Adjust spacing */
@media (max-width: 575.98px) {
  .card-header {
    padding-bottom: 1rem;
  }

  .gap-3 {
    gap: 0.75rem !important;
  }
}

.alert-danger {
  background-color: rgba(220, 53, 69, 0.15);
  border-color: rgba(220, 53, 69, 0.3);
  color: #f8f9fa;
}

.alert-warning {
  background-color: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.3);
  color: #f8f9fa;
}

/* Add these styles */
.percentage-input {
  max-width: 150px;
  margin: 0 auto;
}

.percentage-input .form-control {
  text-align: center;
  padding-right: 0;
}

.percentage-input .input-group-text {
  min-width: 35px;
  justify-content: center;
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .percentage-input {
    max-width: 120px;
  }

  .payment-options {
    padding: 1rem;
  }

  .payment-options .d-flex {
    gap: 0.5rem;
  }

  .form-check-label {
    font-size: 0.875rem;
  }
}
</style>