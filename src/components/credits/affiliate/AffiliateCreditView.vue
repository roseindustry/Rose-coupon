<template>
  <div class="container">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-purple" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-else>
      <!-- Header -->
      <div class="mb-4">
        <div class="credit-panel">
          <div class="credit-header mb-4">
            <h2 class="credit-title">Panel de Crédito del Comercio</h2>
            <button class="btn-history-toggle" @click="toggleSalesHistory"
              :title="showHistory ? 'Ocultar historial de ventas' : 'Mostrar historial de ventas'">
              <i class="fas" :class="showHistory ? 'fa-times' : 'fa-solid fa-clock-rotate-left'"></i>
            </button>
          </div>
          <!-- Credit Stats -->
          <div class="row g-4">
            <div class="col-md-4">
              <div class="credit-summary-card">
                <div class="credit-summary-icon">
                  <i class="fas fa-wallet"></i>
                </div>
                <div class="credit-summary-content">
                  <h6 class="credit-summary-label">Crédito Total</h6>
                  <div class="credit-summary-value">
                    ${{ creditData?.mainCredit?.toLocaleString() || 0 }}
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="credit-summary-card">
                <div class="credit-summary-icon">
                  <i class="fas fa-credit-card"></i>
                </div>
                <div class="credit-summary-content">
                  <h6 class="credit-summary-label">Crédito Disponible</h6>
                  <div class="credit-summary-value">
                    ${{ creditData?.availableMainCredit?.toLocaleString() || 0 }}
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="credit-summary-card">
                <div class="credit-summary-icon">
                  <i class="fas fa-chart-line"></i>
                </div>
                <div class="credit-summary-content">
                  <h6 class="credit-summary-label">Tasa de Uso</h6>
                  <div class="credit-summary-value">
                    {{ creditData?.mainCredit ?
                      ((creditData.mainCredit - creditData.availableMainCredit) / creditData.mainCredit * 100).toFixed(1)
                      : 0 }}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Recent activity -->
          <div class="row g-4 mt-3">
            <div class="col-md-6">
              <div class="sales-card">
                <div class="sales-card-header">
                  <h5 class="sales-card-title">Ventas Recientes</h5>
                  <span class="sales-card-badge">Últimas 5</span>
                </div>
                <div class="sales-card-body">
                  <div v-if="recentSales.length > 0" class="sales-list">
                    <div v-for="sale in recentSales" :key="sale.id" class="sales-item">
                      <div class="sales-item-info">
                        <div class="sales-item-client">{{ sale.clientName }}</div>
                        <div class="sales-item-date">{{ formatDate(sale.purchaseDate) }}</div>
                      </div>
                      <div class="sales-item-details d-flex justify-content-between align-items-center">
                        <div class="sales-item-amount me-3">${{ Number(sale.productPrice).toFixed(2) === 'NaN' ? '0.00'
                          : Number(sale.productPrice).toFixed(2) }}</div>
                        <div class="sales-item-status" :class="{
                          'status-completed': sale.paid,
                          'status-pending': !sale.paid
                        }">
                          {{ sale.paid ? 'Completado' : 'Pendiente' }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="sales-empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <p>No hay ventas registradas</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="payment-status-card">
                <div class="payment-status-header">
                  <h5 class="payment-status-title">Estado de Pagos</h5>
                </div>
                <div class="payment-status-body">
                  <div class="row g-3">
                    <div class="col-6">
                      <div class="payment-status-item payment-status-pending">
                        <div class="payment-status-icon">
                          <i class="fas fa-hourglass-half"></i>
                        </div>
                        <div class="payment-status-content">
                          <h6>Pendientes</h6>
                          <div class="payment-status-count">{{ pendingPayments.length }}</div>
                        </div>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="payment-status-item payment-status-completed">
                        <div class="payment-status-icon">
                          <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="payment-status-content">
                          <h6>Completados</h6>
                          <div class="payment-status-count">{{ paidPurchases.length }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="row g-4">
        <!-- Left Column: New Purchase Form -->
        <div v-if="!showHistory" class="col-lg-7">
          <div class="card">
            <div class="purchase-summary-header">
              <h5 class="purchase-summary-title">
                <i class="fa-solid fa-plus me-2"></i>
                Nueva Venta
              </h5>
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
                    <div class="row">
                      <div class="col-12 col-lg-6">
                        <div class="form-check">
                          <input type="checkbox" class="form-check-input" id="includeFee" v-model="includeFee">
                          <label class="form-check-label" for="includeFee">
                            Incluir cargo por gestión ($1)
                          </label>
                        </div>
                      </div>
                      <div class="col-12 col-lg-6">
                        <div class="form-check">
                          <input type="checkbox" class="form-check-input" id="includeCuotaAddOn" v-model="includeCuotaAddOn">
                          <label class="form-check-label" for="includeCuotaAddOn">
                            Incluir Mantenimiento de Suscripción
                          </label>
                        </div>
                      </div>
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
                          <div class="col-md-4">
                            <label class="text-secondary">Inicial</label>
                            <h5 class="text-light">${{ purchaseAmount.toFixed(2) }}</h5>
                            <small class="text-secondary" v-if="includeFee">
                              Incluye cargo de $1 por gestión
                            </small>
                          </div>
                          <div class="col-md-4">
                            <label class="text-secondary">Préstamo</label>
                            <h5 class="text-light">${{ loanAmount.toFixed(2) }}</h5>
                          </div>
                          <div v-if="includeCuotaAddOn" class="col-md-4">
                            <label class="text-secondary">Préstamo</label>
                            <h5 class="text-light">${{ Number(loanAmountWithAddOn).toFixed(2) }}</h5>
                            <small>Con aumento por cargo de mantenimiento</small>
                          </div>                          
                        </div>
                        <div class="row d-flex justify-content-center mt-3">
                          <div class="col-md-3 mt-2 mt-md-0">
                            <label class="text-secondary">Cuotas</label>
                            <select v-model="newPurchase.terms" @change="calcs(selectedClient)"
                              class="form-select bg-dark text-light border-secondary">
                              <option v-for="n in 12" :key="n" :value="n">{{ n }}</option>
                            </select>
                          </div>
                          <div class="col-md-4 mt-2 mt-md-0">
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
                              <th class="text-end">
                                Monto
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(amount, index) in quotesAmount" :key="index">
                              <td>Cuota {{ index + 1 }}</td>
                              <td>{{ formatDate(cuotaDates[index]) }}</td>
                              <td class="text-end">
                                ${{ amount.toFixed(2) }}                                
                              </td>
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
                    <div v-if="successMessage" class="alert alert-success mb-3">
                      <div class="alert-content">
                        <h5 class="alert-heading mb-1">¡Código Enviado!</h5>
                        <p class="mb-1">{{ successMessage }}</p>
                      </div>
                    </div>
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

        <!-- Right Column: New Purchase Summary -->
        <div v-if="!showHistory" class="col-lg-5">
          <div class="purchase-summary-card">
            <div class="purchase-summary-header">
              <h5 class="purchase-summary-title">
                <i class="fas fa-file-invoice me-2"></i>
                Resumen de Venta
              </h5>
            </div>

            <div class="purchase-summary-body">
              <!-- Client Section -->
              <div class="summary-section">
                <h6 class="summary-section-title">
                  <i class="fas fa-user me-2"></i>
                  Cliente
                </h6>
                <div v-if="selectedClient" class="summary-section-content">
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Nombre:</span>
                    <span class="summary-value">
                      {{ selectedClient.firstName }} {{ selectedClient.lastName }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Identificación:</span>
                    <span class="summary-value">
                      V{{ selectedClient.identification }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Crédito Disponible:</span>
                    <span class="summary-value">
                      ${{ selectedClient.credit?.availableMainCredit?.toLocaleString() || 0 }}
                    </span>
                  </div>
                </div>
                <div v-else class="summary-section-empty">
                  <i class="fas fa-user-plus"></i>
                  <p>Seleccione un cliente</p>
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

              <!-- Product Section -->
              <div class="summary-section">
                <h6 class="summary-section-title">
                  <i class="fas fa-box me-2"></i>
                  Producto
                </h6>
                <div v-if="newPurchase.productName && newPurchase.productPrice" class="summary-section-content">
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Nombre:</span>
                    <span class="summary-value">
                      {{ newPurchase.productName }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Precio de Contado:</span>
                    <span class="summary-value">
                      ${{ Number(newPurchase.productPrice).toFixed(2) }}
                    </span>
                  </div>
                </div>
                <div v-else class="summary-section-empty">
                  <i class="fas fa-shopping-bag"></i>
                  <p>Ingrese detalles del producto</p>
                </div>
              </div>

              <!-- Payment Plan Section -->
              <div class="summary-section">
                <h6 class="summary-section-title">
                  <i class="fas fa-credit-card me-2"></i>
                  Plan de Pagos
                </h6>
                <div v-if="calc" class="summary-section-content">
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Pago Inicial:</span>
                    <span class="summary-value">
                      ${{ purchaseAmount.toFixed(2) }}
                      <small v-if="includeFee" class="text-muted ms-1">(+$1.00 gestión)</small>
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Préstamo:</span>
                    <span class="summary-value">
                      ${{ loanAmount.toFixed(2) }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Número de Cuotas:</span>
                    <span class="summary-value">
                      {{ newPurchase.terms }} {{ newPurchase.terms > 1 ? 'cuotas' : 'cuota' }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Frecuencia:</span>
                    <span class="summary-value">
                      {{ frequency === 2 ? 'Quincenal' : 'Mensual' }}
                    </span>
                  </div>
                </div>
                <div v-else class="summary-section-empty">
                  <i class="fas fa-calculator"></i>
                  <p>Calcule el plan de pagos</p>
                </div>
              </div>

              <!-- Total Summary -->
              <div class="summary-section summary-total">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="summary-total-label">Total:</span>
                  <span class="summary-total-value">
                    ${{ (Number(purchaseAmount) + Number(loanAmount)).toFixed(2) }}
                  </span>
                </div>
              </div>

              <!-- Charge by Subscription Section -->
              <div v-if="includeCuotaAddOn" class="summary-section">
                <h6 class="summary-section-title">
                  <i class="fas fa-handshake me-2"></i>
                  Con Mantenimiento de Suscripción
                </h6>
                <div class="summary-section-content">
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Plan:</span>
                    <span class="summary-value">
                      {{ selectedClient?.subscription?.name.toUpperCase() }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Período de Mantenimiento:</span>
                    <span class="summary-value">
                      {{ subscriptionMaintenancePeriod }} 
                      {{ subscriptionMaintenancePeriod > 1 ? 'meses' : 'mes' }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Aumento Mensual por Mantenimiento:</span>
                    <span class="summary-value">
                      ${{ Number(selectedClient.subscription.cuotaAddOn).toFixed(2) }}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="summary-label">Prestamo Total:</span>
                    <span class="summary-value">
                      ${{ Number(loanAmountWithAddOn).toFixed(2) }}
                    </span>
                  </div>
                  
                </div>
              </div>

              <!-- Total with subscription addOn -->
              <div v-if="includeCuotaAddOn" class="summary-section summary-total">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="summary-total-label">Total con Cargo por Mantenimiento:</span>
                  <span class="summary-total-value">
                    ${{ Number(purchaseAmount + loanAmountWithAddOn).toFixed(2) }}
                  </span>
                </div>
              </div>              
            </div>
          </div>
        </div>

        <!-- Full Width Sales History -->
        <div v-if="showHistory" class="col-12">
          <div class="card">
            <!-- Card Header with Filters -->
            <div class="card-header">
              <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <h5 class="mb-0">Historial de Ventas</h5>
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
                      <td>${{ Number(sale.purchaseAmount + sale.loanAmount).toFixed(2) }}</td>
                      <td>${{ Number(sale.loanAmount).toFixed(2) }}</td>
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
import { db, auth } from '@/firebase/init'
import 'toastify-js/src/toastify.css'
import PurchaseDetailsModal from './modals/PurchaseDetailsModal.vue'
import { sendEmail } from '@/utils/emailService.js'
import { reactive } from 'vue'
import Swal from 'sweetalert2'

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

      includeFee: true, // Default to true to include the fee
      includeCuotaAddOn: false,

      initialPercentageWarning: '',
      initialPercentage: "50",
      customInitial: 0,
      frequency: 2, // Default to bi-weekly (2)
      cuotaDates: [],
      quotesAmount: [],

      purchaseAmount: 0,
      loanAmount: 0,
      remainingAmount: 0,
      loanAmountWithAddOn: 0,
      subscriptionMaintenancePeriod: 0,

      purchaseDate: new Date().toISOString(),
      clientVerifications: {}, // Track verification attempts per client
      selectedSale: null,
      countdownTimer: null,

      salesData: [],
      subscriptions: [],      

      rateLimitData: reactive({}),
      isSubmitting: false,
      successMessage: '',
      showHistory: false,
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
      const remaining = 15 - attempts;

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
        return `Basado en el crédito disponible ($${availableCredit}), se requiere un pago inicial de $${requiredInitial.toFixed(2)} (${requiredPercentage}% de Pago Inicial)`;
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
      return this.rateLimitData[this.selectedClient.id].attempts >= 15;
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
    'newPurchase.terms'(newVal) {
      if (newVal > 2) {
        this.includeCuotaAddOn = true;

        alert('Se activó la opción de mantenimiento de suscripción. Puede desactivarla si lo desea.');
      } else {
        this.includeCuotaAddOn = false;
      }
    },
    includeCuotaAddOn(newValue) {      
      if (this.selectedClient && this.calculationsPerformed) {
        // Recalculate with the new fee setting
        this.calcs(this.selectedClient);
      }
    },
  },
  methods: {
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
          this.successMessage = result.message;

          // toast.success(result.message);

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

        // Calculate initial amounts
        let initialPayment = (totalPrice * percentage) / 100;
        let loanAmount = totalPrice - initialPayment;

        // If loan amount exceeds available credit, adjust the amounts
        if (loanAmount > availableCredit) {
          loanAmount = availableCredit;
          initialPayment = totalPrice - loanAmount;

          // Calculate and update the actual initial percentage
          const actualPercentage = ((initialPayment / totalPrice) * 100).toFixed(1);

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

        // Subscription Maintenance Add-On Logic
        if (this.includeCuotaAddOn && client?.subscription?.cuotaAddOn) {
          const addonAmount = client.subscription.cuotaAddOn;
          
          // Dynamically calculate maintenance period based on frequency and terms
          let maintenancePeriod;
          let monthlyQuotes;

          if (this.frequency === 2) {  // Bi-weekly
            // Convert bi-weekly terms to monthly
            monthlyQuotes = Math.ceil(this.newPurchase.terms / 2);
            maintenancePeriod = Math.min(monthlyQuotes, 12);
          } else {  // Monthly
            monthlyQuotes = this.newPurchase.terms;
            maintenancePeriod = Math.min(monthlyQuotes, 12);
          }

          // Calculate total add-on amount based on maintenance period
          const totalAddonAmount = addonAmount * maintenancePeriod;

          // Calculate the additional amount to be added to each quote
          const additionalPerQuote = totalAddonAmount / this.newPurchase.terms;

          // Create a new quotes array with the add-on distributed evenly
          this.quotesAmount = this.quotesAmount.map(quote => quote + additionalPerQuote);

          // Calculate total loan amount with add-on
          this.loanAmountWithAddOn = this.loanAmount + totalAddonAmount;

          this.subscriptionMaintenancePeriod = maintenancePeriod;
        }

        this.calculationsPerformed = true;
        this.calc = true;

      } catch (error) {
        console.error('Error en cálculos:', error);
        toast.error('Error al realizar los cálculos');
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
    async updateInitial(client) {
      if (!client) return;

      // Reset warning
      this.initialPercentageWarning = '';

      try {
        const percentage = this.initialPercentage === 'custom'
          ? this.customInitial
          : Number(this.initialPercentage);

        // Perform calculations with the current percentage
        this.calcs(client);

        // Check available credit 
        const availableCredit = client.credit?.availableMainCredit || 0;
        const totalPrice = this.newPurchase.productPrice;

        // Calculate loan amount based on the current percentage
        const initialPayment = (totalPrice * percentage) / 100;
        const loanAmount = totalPrice - initialPayment;

        // Check if loan amount exceeds available credit
        if (loanAmount > availableCredit) {
          // Set warning text about credit limitation
          this.initialPercentageWarning = `
            El monto del préstamo ($${loanAmount.toFixed(2)}) 
            excede el crédito disponible ($${availableCredit.toFixed(2)}). 
            Considere aumentar el porcentaje inicial.
          `;
        }
      } catch (error) {
        console.error('Error al actualizar inicial:', error);
        this.initialPercentageWarning = 'Ocurrió un error al calcular el plan de pagos';
        this.cancelCalcs();
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
      this.successMessage = '';
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
          
          includeFee: this.includeFee, // Valor booleano si aplica Cuota adicional de mantenimiento por uso de aplicacion
          includeCuotaAddOn: this.includeCuotaAddOn, // Valor booleano si aplica aumento en cada cuota por mantenimiento de suscripción
          maintenancePeriod: this.includeCuotaAddOn ? this.subscriptionMaintenancePeriod : null, // Numero de meses de mantenimiento de suscripcion incluido con el plan de pago

          productName: this.newPurchase.productName,
          productPrice: this.newPurchase.productPrice,
          
          purchaseAmount: this.purchaseAmount, // Pago de Inicial
          remainingAmount: this.remainingAmount, // Restante
          loanAmount: this.loanAmount, // Prestamo
          loanAmountWithAddOn: this.loanAmountWithAddOn, // Prestamo con adicional de mantenimiento de suscripción
          
          terms: this.cuotaDates.length, // numero de cuotas
          frequency: this.frequency, // frecuencia de pago
          cuotas: this.cuotaDates.map((date, index) => ({
            amount: this.quotesAmount[index],
            date: date,
            paymentDate: null
          })),

          purchaseDate: this.formattedDate,
          verificationCode: this.verificationCode,
        };

        this.$emit('register-purchase', purchaseData, (success) => {
          if (success) {
            this.resetForm(); // Reset form if successful
            this.isSubmitting = false; // Stop loading           
          } else {
            this.isSubmitting = false; // Stop loading
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

      this.purchaseAmount = 0;
      this.loanAmount = 0;
      this.remainingAmount = 0;
      this.loanAmountWithAddOn = 0;
      this.subscriptionMaintenancePeriod = 0;

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

    toggleSalesHistory() {
      this.showHistory = !this.showHistory;
    },   
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
  background: #212837;

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

/* Credit Panel Styles */
.credit-panel {
  background: linear-gradient(145deg, #2d1433 0%, #29122f 100%);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.credit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.btn-history-toggle {
  background-color: rgba(111, 66, 193, 0.15);
  color: #6f42c1;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;
  outline: none;
}

.btn-history-toggle:hover {
  background-color: rgba(111, 66, 193, 0.25);
  transform: scale(1.1);
}

.btn-history-toggle:focus {
  box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.3);
}

.btn-history-toggle i {
  font-size: 1rem;
}

.credit-title {
  color: #6f42c1;
  font-weight: 600;
  font-size: 1.75rem;
  position: relative;
  display: inline-block;
}

.credit-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background-color: #6f42c1;
  border-radius: 2px;
}

.credit-summary-card {
  background: #212837;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
}

.credit-summary-card:hover {
  transform: translateY(-5px);
}

.credit-summary-icon {
  background: rgba(111, 66, 193, 0.15);
  color: #6f42c1;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 1.5rem;
}

.credit-summary-content {
  flex-grow: 1;
}

.credit-summary-label {
  color: #b8b8b8;
  margin-bottom: 8px;
  font-weight: 500;
}

.credit-summary-value {
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
}

.sales-card,
.payment-status-card {
  background: #212837;
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
}

.sales-card-header,
.payment-status-header {
  background: rgba(111, 66, 193, 0.1);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sales-card-title,
.payment-status-title {
  color: white;
  margin: 0;
  font-size: 1.1rem;
}

.sales-card-badge {
  background-color: #6f42c1;
  color: white;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
}

.sales-card-body,
.payment-status-body {
  padding: 16px;
}

.sales-list {
  max-height: 160px;
  /* Approximately 2 items height */
  overflow-y: auto;
  border-radius: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(111, 66, 193, 0.3) transparent;
}

.sales-list::-webkit-scrollbar {
  width: 8px;
}

.sales-list::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 8px;
}

.sales-list::-webkit-scrollbar-thumb {
  background-color: rgba(111, 66, 193, 0.3);
  border-radius: 8px;
}

.sales-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(111, 66, 193, 0.5);
}

.sales-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sales-item:last-child {
  border-bottom: none;
}

.sales-item-client {
  color: white;
  font-weight: 500;
}

.sales-item-date {
  color: #b8b8b8;
  font-size: 0.875rem;
}

.sales-item-amount {
  color: white;
  font-weight: 600;
}

.sales-item-status {
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-completed {
  background-color: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.status-pending {
  background-color: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.sales-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #b8b8b8;
}

.sales-empty-state i {
  font-size: 3rem;
  margin-bottom: 16px;
  color: #6f42c1;
}

.payment-status-item {
  display: flex;
  align-items: center;
  background: rgba(111, 66, 193, 0.05);
  border-radius: 8px;
  padding: 16px;
  height: 100%;
}

.payment-status-icon {
  background: rgba(111, 66, 193, 0.15);
  color: #6f42c1;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 1.25rem;
}

.payment-status-content h6 {
  color: #b8b8b8;
  margin-bottom: 8px;
}

.payment-status-count {
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
}

.payment-status-pending .payment-status-icon {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.payment-status-completed .payment-status-icon {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

@media (max-width: 768px) {
  .credit-panel {
    padding: 16px;
  }

  .credit-title {
    font-size: 1.5rem;
  }

  .credit-summary-card {
    flex-direction: column;
    text-align: center;
  }

  .credit-summary-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }
}

.purchase-summary-card {
  background: #212837;
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.purchase-summary-header,
.card-header {
  background: rgba(111, 66, 193, 0.1);
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

.purchase-summary-title {
  color: white;
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
}

.purchase-summary-title i {
  margin-right: 10px;
  color: #6f42c1;
}

.purchase-summary-body {
  padding: 16px;
}

.summary-section {
  margin-bottom: 16px;
  background: #29122f;
  border-radius: 8px;
  padding: 12px;
}

.summary-section:last-child {
  margin-bottom: 0;
}

.summary-section-title {
  color: #b8b8b8;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}

.summary-section-title i {
  margin-right: 10px;
  color: #6f42c1;
}

.summary-section-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  color: #b8b8b8;
  font-weight: 500;
}

.summary-value {
  color: white;
  font-weight: 600;
  text-align: right;
}

.summary-section-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: #b8b8b8;
  text-align: center;
}

.summary-section-empty i {
  font-size: 2rem;
  margin-bottom: 10px;
  color: #6f42c1;
  opacity: 0.6;
}

.summary-total {
  background: rgba(111, 66, 193, 0.1) !important;
  margin-top: 16px;
}

.summary-total-label {
  color: white;
  font-weight: bold;
  font-size: 1rem;
}

.summary-total-value {
  color: #6f42c1;
  font-size: 1.25rem;
  font-weight: 700;
}

@media (max-width: 991.98px) {
  .purchase-summary-card {
    margin-top: 16px;
  }
}
</style>