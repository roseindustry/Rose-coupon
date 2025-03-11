<template>
  <div class="modal fade" id="edit-level-modal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Editar Nivel</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit" class="row g-3">
            <div class="col-12">
              <label class="form-label">Nombre del Nivel</label>
              <input type="text" class="form-control" v-model="editedLevel.name" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">Puntos Mínimos</label>
              <input type="number" class="form-control" v-model.number="editedLevel.minPoints" min="0" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">Puntos Máximos</label>
              <input type="number" class="form-control" v-model.number="editedLevel.maxPoints" min="0" required>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Modal } from 'bootstrap'

export default {
  name: 'EditLevelModal',
  props: {
    level: {
      type: Object,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    otherLevels: {
      type: Array,
      required: true
    }
  },
  emits: ['update', 'validate'],
  data() {
    return {
      editedLevel: { ...this.level },
      modal: null
    }
  },
  watch: {
    level: {
      handler(newLevel) {
        this.editedLevel = { ...newLevel };
      },
      deep: true
    }
  },
  methods: {
    show() {
      this.modal = new Modal(document.getElementById('edit-level-modal'));
      this.modal.show();
    },
    hide() {
      const modalEl = document.getElementById('edit-level-modal');
      const modal = Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      }
    },
    handleSubmit() {
      this.$emit('update', this.editedLevel);
    }
  }
}
</script>

<style scoped>
.modal-content {
  background-color: #2d2d2d;
  color: #fff;
}

.modal-header, .modal-footer {
  border-color: #444;
}

.form-control {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.form-control:focus {
  background-color: #2d2d2d;
  border-color: #6f42c1;
  color: #fff;
  box-shadow: 0 0 0 0.2rem rgba(111, 66, 193, 0.25);
}
</style> 