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
                  {{ creditType === 'client' ? 
                    `${entity.firstName} ${entity.lastName}` : 
                    entity.companyName }}
                </div>
                <button class="btn btn-sm btn-danger" @click="$emit('deselect', entity)">
                  <i class="fa-solid fa-times"></i>
                </button>
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
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          <button type="button" 
                  class="btn btn-theme" 
                  @click="$emit('assign', { creditLine, amount: creditAmount })"
                  :disabled="!creditLine || creditAmount <= 0 || selectedEntities.length === 0">
            Asignar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SetCreditModal',
  inheritAttrs: false,
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
      default: () => []
    }
  },
  data() {
    return {
      searchEntity: '',
      creditAmount: 0,
      creditLine: ''
    }
  },
  methods: {
    handleSearch() {
      // Emit the search event with the current search value
      this.$emit('search', this.searchEntity);
    },
    handleSelect(entity) {
      // Emit the select event with the selected entity
      this.$emit('select', entity);
      // Clear the search input
      this.searchEntity = '';
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

.list-group-item {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
</style> 