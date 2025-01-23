<template>
    <div class="modal fade" id="addSubcategoryModal" tabindex="-1" aria-labelledby="addSubcategoryModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="addSubcategoryModalLabel">Nueva Subcategoria</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <input id="newSubcategory" type="text" class="form-control" v-model="newSubcategory" aria-label="Monto" aria-describedby="value-addon">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button type="button" class="btn btn-theme" @click="submitSubcategory">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        newSubcategory: ""
      };
    },
    methods: {
      submitSubcategory() {
        this.$emit("submit-subcategory", this.newSubcategory);
        this.newSubcategory = ""; // Reset the input
      }
    }
  };
  </script>
  