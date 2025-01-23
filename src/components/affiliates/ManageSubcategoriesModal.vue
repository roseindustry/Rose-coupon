<template>
    <div class="modal fade" id="manageSubcategoriesModal" tabindex="-1" aria-labelledby="manageSubcategoriesModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="manageSubcategoriesModalLabel">Administrar Subcategorias</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="container">
              <table class="table text-center table-responsive">
                <thead>
                  <tr>
                    <th scope="col">Subcategoria</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="subcategory in subcategoriesModalData" :key="subcategory.id">
                    <td v-if="editingSubcategoryId === subcategory.id">
                      <input type="text" class="form-control" v-model="subcategory.name">
                    </td>
                    <td v-else>{{ subcategory.name }}</td>
                    <td>
                      <button v-if="editingSubcategoryId === subcategory.id" class="btn btn-sm btn-outline-success me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="actualizar comercio" @click="updateSubcategory(subcategory.id)">
                        <i class="fa-solid fa-check"></i>
                      </button>
                      <button v-else class="btn btn-sm btn-outline-success me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="Editar subcategoria" @click="toggleSubEditing(subcategory.id)">
                        <i class="fa-solid fa-pencil"></i>
                      </button>
                      <button v-if="editingSubcategoryId === subcategory.id" @click="cancelSubEditing" class="btn btn-sm btn-outline-danger">
                        <i class="fa-solid fa-times"></i>
                      </button>
                      <button v-else class="btn btn-sm btn-outline-danger" @click="deleteSubcategory(subcategory.id)">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button type="button" class="btn btn-theme" :disabled="editingSubcategoryId" @click="addSubcategory">Agregar Subcategoría</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      subcategoriesModalData: Array,
      editingSubcategoryId: Number
    },
    methods: {
      toggleSubEditing(subcategoryId) {
        this.$emit("toggle-sub-editing", subcategoryId);
      },
      updateSubcategory(subcategoryId) {
        this.$emit("update-subcategory", subcategoryId);
      },
      cancelSubEditing() {
        this.$emit("cancel-sub-editing");
      },
      deleteSubcategory(subcategoryId) {
        this.$emit("delete-subcategory", subcategoryId);
      },
      addSubcategory() {
        this.$emit("add-subcategory");
      }
    }
  };
  </script>
  