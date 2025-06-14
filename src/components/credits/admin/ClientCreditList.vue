<template>
  <div class="client-list-container">
    <!-- Header Section -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0 text-white">Estado de crédito por Cliente</h4>
      <CustomButton text="Asignar Crédito" button-class="btn-theme" icon="fas fa-plus-circle me-2"
        :on-click="() => $emit('assign-credit')" />
    </div>

    <!-- Search Bar -->
    <div class="search-wrapper mb-3">
      <SearchCard title="Buscar cliente" v-model="filterQuery" @input="handleFilterChange" placeholder="Buscar por nombre o cedula..." />
    </div>

    <div class="clients-table-wrapper">
      <div class="client-item" v-for="client in clients" :key="client.id">
        <div class="client-header">
          <div class="client-info">
            <h5 class="client-name">{{ client.firstName }} {{ client.lastName }}</h5>
            <span class="client-id">CI: {{ client.identification }}</span>
          </div>
          <div class="client-status">
            <span v-if="client.subscription" class="status-badge" :class="{ 'active': client.subscription }">
              {{ client.subscription ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>

        <div class="credit-summary">
          <div class="credit-block">
            <div class="credit-type">
              <span class="label">Disponible</span>
              <div class="amount" :class="{ 'text-success': client.credit.mainCredit }">
                ${{ client.credit.availableMainCredit?.toFixed(2) || '0.00' }}
              </div>
              <div class="available-amount">
                Aprobado: ${{ client.credit.mainCredit?.toFixed(2) || '0.00' }}
              </div>
            </div>
            <div class="credit-actions" v-if="client.credit.mainCredit">
              <button class="btn btn-icon" @click="$emit('edit-credit', client, 'client', 'main')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-icon text-danger" @click="$emit('remove-credit', client, 'client', 'main')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="credit-block">
            <div class="credit-type">
              <span class="label">Disponible</span>
              <div class="amount" :class="{ 'text-success': client.credit.plusCredit }">
                ${{ client.credit.availablePlusCredit?.toFixed(2) || '0.00' }}
              </div>
              <div class="available-amount">
                Aprobado: ${{ client.credit.plusCredit?.toFixed(2) || '0.00' }}
              </div>
            </div>
            <div class="credit-actions" v-if="client.credit.plusCredit">
              <button class="btn btn-icon" @click="$emit('edit-credit', client, 'client', 'plus')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-icon text-danger" @click="$emit('remove-credit', client, 'client', 'plus')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="client-actions">
          <CustomButton text="Ver Detalles" button-class="btn-theme" icon="fas fa-eye me-2"
            :on-click="() => $emit('view-details', client)" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="clients.length === 0" class="empty-state">
      <i class="fas fa-users text-muted mb-3"></i>
      <h5>No hay clientes con crédito asignado</h5>
      <p class="text-muted">Asigne crédito a un cliente para comenzar</p>
    </div>

    <!-- Pagination -->
    <CustomPagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="handlePageChange"
    />
  </div>
</template>

<script>
import CustomButton from '@/components/app/CustomButton.vue';
import SearchCard from '@/components/app/SearchCard.vue';
import CustomPagination from '@/components/app/CustomPagination.vue'

export default {
  components: {
    CustomButton,
    SearchCard,
    CustomPagination
  },
  name: 'ClientCreditList',
  props: {
    clients: {
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
    filterClients: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      filterQuery: this.filterClients
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
      this.$emit('update:filter-clients', this.filterQuery);
    }
  },
  watch: {
    filterClients: {
      immediate: true,
      handler(newVal) {
        this.filterQuery = newVal;
      }
    }
  }
}
</script>

<style scoped>
.client-list-container {
  padding: 0 !important;
  margin: 0 !important;
}

.clients-table-wrapper {
  background: #29122f;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.client-item {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.client-item:last-child {
  border-bottom: none;
}

.client-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.client-info {
  flex: 1;
}

.client-name {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.client-id {
  color: #ffffff;
  font-size: 0.9rem;
  display: block;
  margin-top: 0.25rem;
}

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
  justify-content: flex-end;
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

  .client-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .status-badge {
    align-self: flex-start;
  }
}
</style>