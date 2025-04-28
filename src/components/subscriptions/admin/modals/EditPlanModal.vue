<template>
    <div class="modal fade" id="editPlanModal" tabindex="-1" aria-labelledby="editPlanModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div v-if="activeTab === 'clients'" class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-edit me-2"></i>Editar Plan - Clientes
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="form-group mb-3">
                        <label class="form-label">Orden</label>
                        <input v-model="localClientData.order" type="number" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Nombre</label>
                        <input v-model="localClientData.name" type="text" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Descripción</label>
                        <textarea v-model="localClientData.desc" class="form-control" rows="4" required></textarea>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Precio</label>
                        <div class="input-group">
                            <span class="input-group-text">$</span>
                            <input v-model.number="localClientData.price" type="number" class="form-control" required />
                        </div>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Límite de Solicitudes de Cupones</label>
                        <input v-model="localClientData.requestLimit" type="number" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <div class="form-check">
                            <input 
                                type="checkbox" 
                                class="form-check-input" 
                                v-model="localClientData.isPopular"
                                id="clientIsPopular"
                            >
                            <label class="form-check-label" for="clientIsPopular">
                                Marcar como Popular
                            </label>
                        </div>
                    </div>
                    <div class="form-group mb-3">
                        <div class="form-check">
                            <input 
                                type="checkbox" 
                                class="form-check-input" 
                                v-model="localClientData.isHidden"
                                id="hidePlan"
                            >
                            <label class="form-check-label" for="hidePlan">
                                Ocultar
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-theme" @click="updatePlan">
                        <i class="fa-solid fa-save me-2"></i>Guardar cambios
                    </button>
                </div>
            </div>
            <div v-else class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-edit me-2"></i>Editar Plan - Comercios
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="form-group mb-3">
                        <label class="form-label">Orden</label>
                        <input v-model="localAffiliateData.order" type="number" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Nombre</label>
                        <input v-model="localAffiliateData.name" type="text" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Descripción</label>
                        <textarea v-model="localAffiliateData.desc" class="form-control" rows="4" required></textarea>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Precio</label>
                        <div class="input-group">
                            <span class="input-group-text">$</span>
                            <input v-model.number="localAffiliateData.price" type="number" class="form-control" required />
                        </div>
                    </div>
                    <div class="form-group mb-3">
                        <div class="form-check">
                            <input 
                                type="checkbox" 
                                class="form-check-input" 
                                v-model="localAffiliateData.isPopular"
                                id="affiliateIsPopular"
                            >
                            <label class="form-check-label" for="affiliateIsPopular">
                                Marcar como Popular
                            </label>
                        </div>
                    </div>
                    <div class="form-group mb-3">
                        <div class="form-check">
                            <input 
                                type="checkbox" 
                                class="form-check-input" 
                                v-model="localAffiliateData.isHidden"
                                id="hideAffiliatePlan"
                            >
                            <label class="form-check-label" for="hideAffiliatePlan">
                                Ocultar
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-theme" @click="updatePlan">
                        <i class="fa-solid fa-save me-2"></i>Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { showToast } from '@/utils/toast';
import { db } from '@/firebase/init';
import { ref as dbRef, update } from 'firebase/database';
import { Modal } from 'bootstrap';

export default {
    name: 'EditPlanModal',
    emits: ['plan-updated'],
    props: {
        activeTab: {
            type: String,
            required: true
        },
        editClientPlanData: {
            type: Object,
            required: true,
            default: () => ({
                id: null,
                name: '',
                price: 0,
                desc: '',
                order: 0,
                requestLimit: 0,
                isPopular: false,
                isHidden: false,
                icon: ''
            })
        },
        editAffiliatePlanData: {
            type: Object,
            required: true,
            default: () => ({
                id: null,
                name: '',
                price: 0,
                desc: '',
                order: 0,
                isPopular: false,
                isHidden: false
            })
        }
    },
    data() {
        return {
            localClientData: {},
            localAffiliateData: {}
        };
    },
    watch: {
        editClientPlanData: {
            handler(newVal) {
                this.localClientData = { ...newVal };
            },
            deep: true,
            immediate: true
        },
        editAffiliatePlanData: {
            handler(newVal) {
                this.localAffiliateData = { ...newVal };
            },
            deep: true,
            immediate: true
        }
    },
    methods: {
        async updatePlan() {
            try {
                const planData = this.activeTab === 'clients' ? 
                    { ...this.localClientData } : 
                    { ...this.localAffiliateData };

                if (!planData.id) {
                    throw new Error("ID del plan no encontrado");
                }

                const { id, ...updateData } = planData;

                const planRef = dbRef(
                    db, 
                    `${this.activeTab === 'clients' ? 'Suscriptions' : 'Affiliate_suscriptions'}/${id}`
                );

                await update(planRef, updateData);
                
                showToast('Plan actualizado exitosamente');
                
                const editModal = Modal.getInstance(document.getElementById('editPlanModal'));
                editModal.hide();

                this.$emit('plan-updated');

            } catch (error) {
                console.error("Error updating plan:", error);
                showToast('Error al actualizar el plan', 'error');
            }
        }
    },
}
</script>

<style scoped>
/* Inherit the dark theme styles from parent */
.modal-content {
    background-color: #2d2d2d;
    border-color: #444;
    color: #fff;
}

.modal-header {
    border-bottom-color: #444;
    background-color: rgba(111, 66, 193, 0.1);
}

.modal-footer {
    border-top-color: #444;
}

.form-control, .form-select {
    background-color: #2d2d2d;
    border-color: #444;
    color: #fff;
}

.form-control:focus, .form-select:focus {
    background-color: #2d2d2d;
    border-color: #6f42c1;
    color: #fff;
    box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

.btn-theme {
    background-color: #6f42c1;
    border-color: #6f42c1;
    color: white;
}

.btn-theme:hover {
    background-color: #5a32a3;
    border-color: #5a32a3;
}

.input-group-text {
    background-color: #444;
    border-color: #444;
    color: #fff;
}

.btn-close-white {
    filter: invert(1) grayscale(100%) brightness(200%);
}
</style> 