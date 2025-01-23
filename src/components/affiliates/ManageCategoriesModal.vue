<template>
    <div class="modal fade" id="manageCategoriesModal" tabindex="-1" aria-labelledby="manageCategoriesModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="manageCategoriesModalLabel">Administrar categorias</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="container">
              <table class="table text-center table-responsive">
                <thead>
                  <tr>
                    <th scope="col">Categoría</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="category in modalData" :key="category.id">
                    <td v-if="editingCategoryId === category.id">
                      <input type="text" class="form-control" v-model="category.name">
                    </td>
                    <td v-else>{{ category.name }}</td>
                    <td>
                      <button class="btn btn-sm btn-theme me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="Subcategorias" @click="manageSubcategories(category.id)">
                        <i class="fa-solid fa-list"></i>
                      </button>
                      <button v-if="editingCategoryId === category.id" class="btn btn-sm btn-outline-success me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="actualizar comercio" @click="updateCategory(category.id)">
                        <i class="fa-solid fa-check"></i>
                      </button>
                      <button v-else class="btn btn-sm btn-outline-success me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="Editar categoria" @click="toggleEditing(category.id)">
                        <i class="fa-solid fa-pencil"></i>
                      </button>
                      <button v-if="editingCategoryId === category.id" @click="cancelEditing()" class="btn btn-sm btn-outline-danger">
                        <i class="fa-solid fa-times"></i>
                      </button>
                      <button v-else class="btn btn-sm btn-outline-danger" @click="deleteCategory(category.id)">
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
            <button type="button" class="btn btn-theme" @click="addCategory">Agregar Categoría</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      modalData: Array,
      editingCategoryId: Number,
    },
    methods: {
      manageSubcategories(categoryId) {
        this.$emit("manage-subcategories", categoryId);
      },
      toggleEditing(categoryId) {
        this.$emit("toggle-editing", categoryId);
      },
      updateCategory(categoryId) {
        this.$emit("update-category", categoryId);
      },
      cancelEditing() {
        this.$emit("cancel-editing");
      },
      deleteCategory(categoryId) {
        this.$emit("delete-category", categoryId);
      },
      addCategory() {
        this.$emit("add-category");
      }
    }
  };
  </script>
  