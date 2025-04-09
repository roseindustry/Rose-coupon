<template>
  <div class="modal fade" :id="$attrs.id" tabindex="-1" aria-labelledby="setCreditModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="setCreditModalLabel">
            Asignar crédito a {{ creditType === 'client' ? 'Cliente' : 'Comercio' }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Search Input -->
          <div class="mb-3">
            <label class="form-label">Buscar {{ creditType === 'client' ? 'Cliente' : 'Comercio' }}</label>
            <input type="text" 
                   class="form-control" 
                   v-model="searchEntity"
                   :placeholder="`Buscar por ${creditType === 'client' ? 'cédula' : 'RIF'}...`"
                   @input="handleSearch" />
          </div>

          <!-- Search Results -->
          <div v-if="searchResults.length > 0" class="mb-3">
            <div v-for="entity in searchResults" :key="entity.id" class="card mb-2">
              <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="mb-0">
                    {{ creditType === 'client' ? 
                      `${entity.firstName} ${entity.lastName}` : 
                      entity.companyName }}
                  </h6>
                  <small>
                    {{ creditType === 'client' ? 
                      `CI: ${entity.identification}` : 
                      `RIF: ${entity.rif}` }}
                  </small>
                </div>
                <button class="btn btn-sm btn-theme" @click="handleSelect(entity)">
                  Seleccionar
                </button>
              </div>
            </div>
          </div>

          <!-- Selected Entities -->
          <div v-if="selectedEntities.length > 0">
            <h6>{{ creditType === 'client' ? 'Clientes' : 'Comercios' }} Seleccionados:</h6>
            <div class="list-group mb-3">
              <div v-for="entity in selectedEntities" :key="entity.id" 
                   class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <div class="d-flex flex-column">
                    <span class="entity-name">
                      {{ creditType === 'client' ? 
                        `${entity.firstName} ${entity.lastName}` : 
                        entity.companyName }}
                    </span>
                    <small v-if="entity.subscription" class="text-muted subscription-info">
                      <i class="fas fa-tag me-1"></i>{{ entity.subscription.name.toUpperCase() || 'Plan básico' }}
                    </small>
                    <small v-else class="text-muted subscription-info">
                      <i class="fas fa-exclamation-circle me-1"></i>Sin plan asignado
                    </small>
                  </div>
                </div>
                <div class="d-flex align-items-center">
                  <span v-if="entity.creditLimit" class="badge bg-info me-2">
                    Límite: ${{ entity.creditLimit }}
                  </span>
                  <button class="btn btn-sm btn-danger" @click="$emit('deselect', entity)">
                    <i class="fa-solid fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Credit Amount -->
          <div class="mb-3">
            <label class="form-label">Monto a Asignar</label>
            <div class="input-group">
              <span class="input-group-text">$</span>
              <input type="number" 
                     class="form-control" 
                     v-model.number="creditAmount"
                     min="0"
                     step="0.01" />
            </div>
          </div>

          <!-- Credit Line Selection -->
          <div class="mb-3">
            <label class="form-label">Línea de Crédito</label>
            <select class="form-select" v-model="creditLine">
              <option value="">Seleccione una línea</option>
              <option value="main">Principal</option>
              <option value="plus" v-if="creditType === 'client'">Plus</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="clearForm">
            Cerrar
          </button>
          <button type="button" 
                  class="btn btn-theme" 
                  @click="handleAssign"
                  :disabled="!creditLine || creditAmount <= 0 || selectedEntities.length === 0">
            Asignar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap';

export default {
  name: 'SetCreditModal',
  inheritAttrs: false,
  data() {
    return {
      searchEntity: '',
      creditAmount: 0,
      creditLine: '',
      modalInstance: null
    }
  },
  mounted() {
    // Get modal instance
    const modalEl = document.getElementById('set-credit-modal');
    if (modalEl) {
      this.modalInstance = new Modal(modalEl);
      modalEl.addEventListener('hide.bs.modal', this.clearForm);
      modalEl.addEventListener('hidden.bs.modal', this.clearForm);
    }
  },
  beforeUnmount() {
    // Clean up event listener
    const modalEl = document.getElementById('set-credit-modal');
    if (modalEl) {
      modalEl.removeEventListener('hide.bs.modal', this.clearForm);
      modalEl.removeEventListener('hidden.bs.modal', this.clearForm);
    }
  },
  props: {
    creditType: {
      type: String,
      required: true,
      default: '',
      validator: value => ['client', 'affiliate', ''].includes(value)
    },
    searchResults: {
      type: Array,
      required: true,
      default: () => []
    },
    selectedEntities: {
      type: Array,
      required: true,
      default: () => [],
    }
  },
  methods: {
    handleSearch() {
      this.$emit('search', this.searchEntity);
    },
    handleSelect(entity) {
      this.$emit('select', entity);
      this.searchEntity = '';
    },
    clearForm() {
      this.searchEntity = '';      
      this.creditAmount = 0;
      this.creditLine = '';
      // Emit event to clear selected entities
      this.$emit('deselect', 'all');
    },
    handleAssign() {
      this.$emit('assign', { 
        creditLine: this.creditLine,
        selectedEntities: this.selectedEntities,
        creditType: this.creditType,
        amount: this.creditAmount 
      });
      this.clearForm();
      if (this.modalInstance) {
        this.modalInstance.hide();
      }
    }
  },
  watch: {
    // Reset search when creditType changes
    creditType() {
      this.searchEntity = '';
    }
  }
}
</script>

<style scoped>
.form-control {
  font-size: 0.9rem;
}

.form-select {
  font-size: 0.9rem;
  background-color: #29122f;
  color: white;
}

.form-select option {
  background-color: #29122f;
  color: white;
}

.list-group-item {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.entity-name {
  font-weight: 500;
}

.subscription-info {
  font-size: 0.8rem;
}

.badge {
  font-weight: normal;
  font-size: 0.75rem;
}
</style> 