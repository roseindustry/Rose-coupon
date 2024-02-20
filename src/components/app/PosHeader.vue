<script>
import { ref } from 'vue'
import { Modal } from 'bootstrap';

export default {
  name: 'PosHeader',
  data () {
    return {
      menuItem: {
        title: '',
        description: '',
        stock: 0,
        availability: false
      },
      imagePreview: null
    };
  },
  methods: {
    goBack() {
		this.$router.back();
    },
    submitForm() {
      // Implement the logic to submit your form here
      // For demonstration, we'll just log to the console
      console.log("Form submitted", this.menuItem);
      // Show success modal here if you have a method or direct manipulation
      // For Bootstrap 5, you may need to instantiate the modal via JavaScript to show it
      let successModal = new bootstrap.Modal(document.getElementById('successModal'));
      successModal.show();
      
      // Reset form after submission
      this.resetForm();
    },
    previewImage(event) {
      const input = event.target;
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreview = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
      }
    },
    resetForm() {
      this.menuItem = { title: '', description: '', stock: 0, availability: false };
      this.imagePreview = null;
      // Reset the file input if necessary
    }
  }
}
</script>

<template>
	<div class="row pos-header">
		<div class="col back-button" @click="goBack" style="cursor: pointer;">
			<i class="fa-solid fa-chevron-left" title="Volver" style="font-size: 1.5rem;"></i>
		</div>

		<div class="col d-flex justify-content-center align-items-center brand">
			<div><i class="fa fa-solid fa-burger" style="font-size: 1.5rem;"></i></div>
			<!-- <div>{{Restaurant}}</div> -->
		</div>

		<div class="col nav">
			<!-- configure just for Admins -->
			<div class="nav-item">
				<button type="button" class="nav-link" data-bs-toggle="modal" data-bs-target="#addMenuItemModal">
					<i class="fa fa-plus nav-icon" title="Agregar Item al Menu"></i>
				</button>
			</div>
			<!-- configure just for Admins -->
			<div class="nav-item">
				<RouterLink to="/pos/kitchen-order" class="nav-link">
					<i class="fa fa-kitchen-set nav-icon" title="Ordenes de cocina"></i>
				</RouterLink>
			</div>
			<div class="nav-item">
				<RouterLink to="/pos/menu-stock" class="nav-link">
					<i class="fa fa-book nav-icon" title="Menu"></i>
				</RouterLink>
			</div>
			<div class="nav-item">
				<RouterLink to="/pos/counter-checkout" class="nav-link">
					<i class="fa fa-cart-shopping nav-icon" title="Checkout"></i>
				</RouterLink>
			</div>
		</div>

		<!-- MODAL -->
		<div class="modal fade" id="addMenuItemModal" tabindex="-1" aria-labelledby="addMenuItemModalLabel" aria-hidden="true">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="addMenuItemModalLabel">Add Menu Item</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<div class="container mt-4">
							<form @submit.prevent="submitForm">
								<div class="mb-3">
									<label for="menuItemTitle" class="form-label">Title</label>
									<input type="text" class="form-control" id="menuItemTitle" v-model="menuItem.title"
										required>
								</div>
								<div class="mb-3">
									<label for="menuItemDescription" class="form-label">Description</label>
									<textarea class="form-control" id="menuItemDescription" rows="3"
										v-model="menuItem.description" required></textarea>
								</div>
								<div class="mb-3">
									<label for="menuItemStock" class="form-label">Stock</label>
									<input type="number" class="form-control" id="menuItemStock"
										v-model.number="menuItem.stock" required>
								</div>
								<div class="mb-3 form-check">
									<input type="checkbox" class="form-check-input" id="menuItemAvailability"
										v-model="menuItem.availability">
									<label class="form-check-label" for="menuItemAvailability">Available</label>
								</div>
								<div class="mb-3">
									<label for="menuItemImg" class="form-label">Image</label>
									<input type="file" class="form-control" id="menuItemImg" @change="previewImage"
										accept="image/*">
									<div v-if="imagePreview" class="mt-2">
										<img :src="imagePreview" class="img-thumbnail" alt="preview"
											style="max-height: 200px;">
									</div>
								</div>
							</form>
						</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
						<button type="submit" class="btn btn-primary">Save</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal for sucessful form submit-->
		<div class="modal fade" id="successModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true"
			ref="successModal">
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