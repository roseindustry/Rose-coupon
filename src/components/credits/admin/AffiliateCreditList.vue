<template>
  <div class="row">
    <h5>Estado de crédito por Comercio</h5>

    <div class="d-flex justify-content-end align-items-center mb-4 mt-3">
      <button class="btn btn-theme me-2" @click="$emit('assign-credit')">
        Asignar Credito a Comercio
      </button>
    </div>

    <!-- Search Bar -->
    <div>
      <input type="text" 
             class="form-control" 
             v-model="filterQuery"
             placeholder="Buscar comercio por nombre o RIF..." 
             @input="$emit('update:searchQuery', filterQuery)" />
    </div>

    <div class="row mt-4">
      <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="affiliate in paginatedAffiliates" :key="affiliate.id">
        <div class="card h-100">
          <div class="card-body position-relative">
            <!-- Subscription Badge -->
            <span v-if="affiliate.subscription"
                  class="badge position-absolute top-0 start-100 translate-middle"
                  style="font-size: 0.75rem; transform: translate(25%, -25%);"
                  :class="affiliate.subscription.isPaid ? 'bg-success' : 'bg-danger'">
              {{ affiliate.subscription ? affiliate.subscription.name.toUpperCase() : 'Sin suscripcion' }}
            </span>

            <h5 class="card-title text-light text-center mb-3">
              {{ affiliate.companyName }}
            </h5>

            <p class="card-text text-light"><strong>RIF: </strong> {{ affiliate.rif }}</p>

            <!-- Credit Cards -->
            <div class="row">
              <!-- Main Credit -->
              <div class="col-6 d-flex">
                <div class="card text-center w-100 equal-height">
                  <div class="card-header text-center py-3 px-2">
                    <h6><strong>Crédito Principal Aprobado</strong></h6>
                  </div>
                  <div class="card-body">
                    <p v-if="affiliate.credit?.mainCredit">
                      <span class="badge bg-success" style="font-size: 1rem;">
                        ${{ affiliate.credit.mainCredit.toFixed(2) }}
                      </span>
                      <div class="d-flex justify-content-center mt-2" style="position: relative; z-index: 10;">
                        <button class="btn btn-sm btn-outline-info me-1"
                                @click="$emit('edit-credit', affiliate, 'affiliate', 'main')">
                          <i class="fa-solid fa-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger"
                                @click="$emit('remove-credit', affiliate, 'affiliate', 'main')">
                          <i class="fa-solid fa-times"></i>
                        </button>
                      </div>
                    </p>
                    <p v-else>
                      <span class="badge bg-secondary text-black text-center p-2"
                            style="width: 100%; display: block;">
                        Sin Crédito aprobado
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Available Credit -->
              <div class="col-6 d-flex">
                <div class="card text-center w-100 equal-height">
                  <div class="card-header text-center py-3 px-2">
                    <h6><strong>Crédito Principal Restante</strong></h6>
                  </div>
                  <div class="card-body">
                    <h5 v-if="affiliate.credit?.availableMainCredit">
                      <span class="badge bg-success" style="font-size: 1rem;">
                        ${{ affiliate.credit.availableMainCredit.toFixed(2) }}
                      </span>
                    </h5>
                    <p v-else>
                      <span class="badge bg-secondary text-black text-center p-2"
                            style="font-size: 0.7rem;">
                        Crédito consumido
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="row justify-content-center">
              <button class="btn btn-outline-success btn-md mt-3 me-2" 
                      @click="showSalesDetails(affiliate)"
                      style="width: auto;">
                Ver Actividad
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="affiliates.length === 0" class="d-flex justify-content-center align-items-center">
      <div class="text-center">
        <div class="mb-3">
          <i class="fa-solid fa-store text-body text-opacity-25" style="font-size: 5em"></i>
        </div>
        <h5>No hay Comercios con credito aprobado.</h5>
      </div>
    </div>

    <!-- Pagination -->
    <nav class="mt-4" v-if="totalPages > 1" aria-label="Page navigation">
      <ul class="pagination justify-content-center">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <button class="page-link" 
                  @click="$emit('page-change', currentPage - 1)"
                  :disabled="currentPage === 1">
            Anterior
          </button>
        </li>
        <li class="page-item" 
            v-for="page in totalPages" 
            :key="page"
            :class="{ active: page === currentPage }">
          <button class="page-link" 
                  @click="$emit('page-change', page)">
            {{ page }}
          </button>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <button class="page-link" 
                  @click="$emit('page-change', currentPage + 1)"
                  :disabled="currentPage === totalPages">
            Siguiente
          </button>
        </li>
      </ul>
    </nav>

    <AffiliateSalesModal :affiliate-data="selectedAffiliate" />
  </div>
</template>

<script>
import { Modal } from 'bootstrap';
import AffiliateSalesModal from './modals/AffiliateSalesModal.vue';

export default {
  name: 'AffiliateCreditList',
  components: {
    AffiliateSalesModal
  },
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
    searchQuery: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      filterQuery: this.searchQuery,
      selectedAffiliate: null
    }
  },
  computed: {
    paginatedAffiliates() {
      return this.affiliates
    }
  },
  methods: {
    showSalesDetails(affiliate) {
      this.selectedAffiliate = affiliate;
      this.$nextTick(() => {
        const modal = new Modal(document.getElementById('affiliate-sales-modal'));
        modal.show();
      });
    }
  }
}
</script>

<style scoped>
.equal-height .card-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
}

.card {
  border-radius: 8px;
  border: 1px solid #ddd;
  transition: transform 0.2s ease;
}

.card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.badge {
  font-size: 0.85rem;
  padding: 0.35em 0.65em;
  white-space: normal;
  height: auto;
  line-height: 1.2;
}

.badge.bg-secondary {
  background-color: #f8f9fa !important;
  color: #212529 !important;
  border: 1px solid #dee2e6;
}

.badge.bg-success {
  background-color: #198754 !important;
  color: white !important;
}

.badge.bg-danger {
  background-color: #dc3545 !important;
  color: white !important;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: #212529;
}

.card-text {
  color: #212529;
}

.card-header h6 {
  font-size: 0.9rem;
  margin-bottom: 0;
  color: #212529;
}

.equal-height .card-body {
  min-height: 120px;
  padding: 1rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
</style> 