<template>
    <div class="container mt-4">
      <h2>Add Menu Item</h2>
      <form @submit.prevent="submitForm">
        <div class="mb-3">
          <label for="menuItemTitle" class="form-label">Title</label>
          <input type="text" class="form-control" id="menuItemTitle" v-model="menuItem.title" required>
        </div>
        <div class="mb-3">
          <label for="menuItemDescription" class="form-label">Description</label>
          <textarea class="form-control" id="menuItemDescription" rows="3" v-model="menuItem.description" required></textarea>
        </div>
        <div class="mb-3">
          <label for="menuItemStock" class="form-label">Stock</label>
          <input type="number" class="form-control" id="menuItemStock" v-model.number="menuItem.stock" required>
        </div>
        <div class="mb-3 form-check">
          <input type="checkbox" class="form-check-input" id="menuItemAvailability" v-model="menuItem.availability">
          <label class="form-check-label" for="menuItemAvailability">Available</label>
        </div>
        <div class="mb-3">
          <label for="menuItemImg" class="form-label">Image</label>
          <input type="file" class="form-control" id="menuItemImg" @change="previewImage" accept="image/*">
          <div v-if="imagePreview" class="mt-2">
            <img :src="imagePreview" class="img-thumbnail" alt="preview" style="max-height: 200px;">
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Submit</button>
      </form>

      <!-- Bootstrap Modal-->
    <div class="modal fade" id="successModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true" ref="successModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modalLabel">Success</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            Menu item added successfully!
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>

    </div>
  </template>
  
  <script>
  import { ref } from 'vue'
  import { Modal } from 'bootstrap';
  
  export default {
    name: 'PosEditMenu',
    setup() {
      const menuItem = ref({
        title: '',
        description: '',
        stock: 0,
        availability: false
      });
      const imagePreview = ref('');
      const successModal = ref(null);
  
      const previewImage = event => {
        const file = event.target.files[0];
        imagePreview.value = URL.createObjectURL(file);
      };
  
      const submitForm = () => {
        // Here, you would handle form submission, like sending data to a server
        console.log('Form submitted:', menuItem.value);
        // Reset form or navigate to another page after submission as needed
        // Show the success modal after form submission
        let modal = new Modal(successModal.value);
        modal.show();
      };
  
      return {
        menuItem,
        imagePreview,
        previewImage,
        submitForm,
        successModal
      };
    },
    mounted() {
    successModal.value = this.$refs.successModal;
    }

  }
  </script>
  