<template>
    <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="deleteConfirmModalLabel">Confirmar eliminación</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>¿Está seguro que desea eliminar los {{ selectedCoupons.length }} cupones seleccionados?</p>
                    <p class="text-danger"><strong>Esta acción no se puede deshacer.</strong></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" :disabled="isDeleting" class="btn btn-danger" @click="deleteSelectedCoupons">
                        <span v-if="isDeleting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span v-else>
                            <i class="fa fa-trash me-1"></i>
                            Eliminar
                        </span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import { toast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'
import { db } from '@/firebase/init';
import { ref as dbRef, remove } from 'firebase/database';
import { Modal } from 'bootstrap';

export default {
    name: 'ConfirmDeleteCoupons',
    props: {
        selectedCoupons: {
            type: Array,
            required: true
        },
        coupons: {
            type: Array,
            required: true
        }
    },
    data() {
        return {
            isDeleting: false
        };
    },
    methods: {
        async deleteSelectedCoupons() {
            if (this.isDeleting || this.selectedCoupons.length === 0) return;

            this.isDeleting = true;

            try {
                // Create an array of promises for each delete operation
                const deletePromises = this.selectedCoupons.map(coupon => {
                    return remove(dbRef(db, `Coupons/${coupon.id}`));
                });

                // Wait for all delete operations to complete
                await Promise.all(deletePromises);                

                // Close the modal
                const modal = Modal.getInstance(document.getElementById('deleteConfirmModal'));
                modal.hide();

                // Show success message
                toast.success('Cupones eliminados correctamente');

                // Update UI
                const deletedIds = this.selectedCoupons.map(coupon => coupon.id);
                const coupons = this.coupons.filter(coupon => !deletedIds.includes(coupon.id));
                this.$emit('update-ui', coupons);
            } catch (error) {
                console.error('Error deleting coupons:', error);
                toast.error('Error al eliminar los cupones');
            } finally {
                this.isDeleting = false;
            }
        },
    }
}
</script>