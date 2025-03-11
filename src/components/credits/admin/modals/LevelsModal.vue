<template>
  <div class="modal fade" id="levelsModal" tabindex="-1" aria-labelledby="levelsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Administrar Niveles</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- List of Levels -->
          <div class="row">
            <div class="mb-3">
              <h5>Lista de Niveles</h5>
              <div v-if="levels.length > 0" class="table-responsive text-center">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th scope="col">Nombre</th>
                      <th scope="col">Puntos</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="level in levels" :key="level.id">
                      <td>{{ level.name }}</td>
                      <td>{{ level.minPoints }} - {{ level.maxPoints }}</td>
                      <td>
                        <button class="btn btn-info btn-sm me-2" @click="$emit('edit', level)">
                          <i class="fa-solid fa-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" @click="$emit('delete', level.id)">
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else>
                <p>No hay niveles registrados.</p>
              </div>
            </div>
          </div>

          <!-- Create a New Level -->
          <div class="row">
            <h5>Crear Nuevo Nivel</h5>
            <div class="mb-3">
              <label class="form-label">Nombre <span class="text-danger">*</span></label>
              <input v-model="newLevel.name" type="text" class="form-control form-control-lg fs-15px" required />
            </div>
            <div class="col-6 mb-3">
              <label class="form-label">Puntos Mínimos <span class="text-danger">*</span></label>
              <input v-model.number="newLevel.minPoints" type="number" class="form-control form-control-lg fs-15px" required />
            </div>
            <div class="col-6 mb-3">
              <label class="form-label">Puntos Máximos <span class="text-danger">*</span></label>
              <input v-model.number="newLevel.maxPoints" type="number" class="form-control form-control-lg fs-15px" required />
            </div>
            <button type="button" class="btn btn-theme d-inline-flex justify-content-center" 
                    @click="createLevel" style="width: auto;">
              Guardar
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LevelsModal',
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
      }
    }
  },
  methods: {
    createLevel() {
      if (!this.newLevel.name || this.newLevel.minPoints === null || this.newLevel.maxPoints === null) {
        alert('Todos los campos son obligatorios.');
        return;
      }

      if (this.newLevel.minPoints >= this.newLevel.maxPoints) {
        alert('El rango de puntos no es válido. Los puntos mínimos deben ser menores que los máximos.');
        return;
      }

      this.$emit('create', { ...this.newLevel });
      
      // Reset form
      this.newLevel = {
        name: '',
        minPoints: 0,
        maxPoints: 0
      };
    }
  }
}
</script> 