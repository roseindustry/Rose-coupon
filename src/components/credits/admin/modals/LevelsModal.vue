<template>
  <div class="modal fade" id="levels-modal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Administrar Niveles</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <!-- Create New Level Form -->
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h6 class="mb-0">Crear Nuevo Nivel</h6>
            </div>
            <div class="card-body">
              <form @submit.prevent="createLevel" class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">Nombre del Nivel</label>
                  <input type="text" class="form-control" v-model="newLevel.name" required>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Puntos Mínimos</label>
                  <input type="number" class="form-control" v-model.number="newLevel.minPoints" min="0" required>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Puntos Máximos</label>
                  <input type="number" class="form-control" v-model.number="newLevel.maxPoints" min="0" required>
                </div>
                <div class="col-12 text-end">
                  <button type="submit" class="btn btn-primary" :disabled="loading">
                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                    Crear Nivel
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Existing Levels Table -->
          <div class="card">
            <div class="card-header bg-primary text-white">
              <h6 class="mb-0">Niveles Existentes</h6>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Puntos Mínimos</th>
                      <th>Puntos Máximos</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="level in sortedLevels" :key="level.id">
                      <td>{{ level.name }}</td>
                      <td>{{ level.minPoints }}</td>
                      <td>{{ level.maxPoints }}</td>
                      <td>
                        <button class="btn btn-sm btn-outline-info me-2" @click="editLevel(level)">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(level)">
                          <i class="fas fa-trash"></i>
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
    </div>
  </div>

  <EditLevelModal
    v-if="selectedLevel"
    :level="selectedLevel"
    :loading="loading"
    :other-levels="levels.filter(l => l.id !== selectedLevel?.id)"
    @update="updateSelectedLevel"
    ref="editModal"
  />
</template>

<script>
import { Modal } from 'bootstrap'
import { db } from '@/firebase/init'
import { ref as dbRef, push, update, remove } from 'firebase/database'
import { toast } from '@/utils/toast'
import 'toastify-js/src/toastify.css'
import EditLevelModal from './EditLevelModal.vue'

export default {
  name: 'LevelsModal',
  components: {
    EditLevelModal
  },
  emits: ['levelCreated', 'levelUpdated', 'levelDeleted'],
  props: {
    levels: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      newLevel: {
        name: '',
        minPoints: 0,
        maxPoints: 0
      },
      selectedLevel: null,
      loading: false
    }
  },
  computed: {
    sortedLevels() {
      return [...this.levels].sort((a, b) => a.minPoints - b.minPoints);
    }
  },
  methods: {
    async createLevel() {
      if (!this.validateLevel(this.newLevel)) return;

      try {
        this.loading = true;
        const levelsRef = dbRef(db, 'Levels');
        const newLevelRef = await push(levelsRef, this.newLevel);

        toast.success('Nivel creado exitosamente');
        this.$emit('levelCreated', { id: newLevelRef.key, ...this.newLevel });

        // Reset form
        this.newLevel = {
          name: '',
          minPoints: 0,
          maxPoints: 0
        };
      } catch (error) {
        console.error('Error creating level:', error);
        toast.error('Error al crear el nivel');
      } finally {
        this.loading = false;
      }
    },

    editLevel(level) {
      this.selectedLevel = { ...level };
      this.$nextTick(() => {
        this.$refs.editModal.show();
      });
    },

    async updateSelectedLevel(updatedLevel) {
      if (!this.validateLevel(this.selectedLevel)) return;

      try {
        this.loading = true;
        const levelRef = dbRef(db, `Levels/${updatedLevel.id}`);
        await update(levelRef, {
          name: updatedLevel.name,
          minPoints: updatedLevel.minPoints,
          maxPoints: updatedLevel.maxPoints
        });

        toast.success('Nivel actualizado exitosamente');
        this.$emit('levelUpdated', updatedLevel);
        this.$refs.editModal.hide();
        this.selectedLevel = null;
      } catch (error) {
        console.error('Error updating level:', error);
        toast.error('Error al actualizar el nivel');
      } finally {
        this.loading = false;
      }
    },

    async confirmDelete(level) {
      if (!confirm(`¿Está seguro de eliminar el nivel ${level.name}?`)) return;

      try {
        this.loading = true;
        const levelRef = dbRef(db, `Levels/${level.id}`);
        await remove(levelRef);

        toast.success('Nivel eliminado exitosamente');
        this.$emit('levelDeleted', level.id);
      } catch (error) {
        console.error('Error deleting level:', error);
        toast.error('Error al eliminar el nivel');
      } finally {
        this.loading = false;
      }
    },

    validateLevel(level) {
      if (!level.name.trim()) {
        toast.error('El nombre del nivel es requerido');
        return false;
      }

      if (level.minPoints >= level.maxPoints) {
        toast.error('Los puntos mínimos deben ser menores que los máximos');
        return false;
      }

      // Check for overlapping ranges with other levels
      const otherLevels = this.levels.filter(l => l.id !== level.id);
      const hasOverlap = otherLevels.some(l => {
        return (level.minPoints >= l.minPoints && level.minPoints <= l.maxPoints) ||
               (level.maxPoints >= l.minPoints && level.maxPoints <= l.maxPoints);
      });

      if (hasOverlap && level.maxPoints !== this.selectedLevel?.maxPoints) {
        
        toast.error('El rango de puntos se superpone con otro nivel existente');
        return false;
      }

      return true;
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

.card {
  background-color: #363636;
  border: 1px solid #444;
}

.table {
  color: #fff;
}

.table td, .table th {
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

.btn-outline-info, .btn-outline-danger {
  color: #fff;
}

.btn-outline-info:hover {
  color: #000;
}
</style> 