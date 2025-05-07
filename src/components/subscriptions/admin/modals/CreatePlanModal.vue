<template>
    <div class="modal fade" id="createPlan" tabindex="-1" aria-labelledby="createPlanLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div v-if="activeTab === 'clients'" class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Nuevo Plan de Suscripción - Clientes</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="form-group mb-3">
                        <label class="form-label">Orden <span class="text-danger">*</span></label>
                        <input v-model="clientPlan.order" type="number" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Nombre <span class="text-danger">*</span></label>
                        <input v-model="clientPlan.name" type="text" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Descripción <span class="text-danger">*</span></label>
                        <textarea v-model="clientPlan.desc" class="form-control" rows="4" required></textarea>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Precio <span class="text-danger">*</span></label>
                        <div class="input-group">
                            <span class="input-group-text">$</span>
                            <input v-model="clientPlan.price" type="number" class="form-control" required />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12 col-lg-6">
                            <div class="form-group mb-3">
                                <label class="form-label">Solicitudes de Cupones</label>
                                <input v-model="clientPlan.requestLimit" type="number" class="form-control" />
                            </div>
                        </div>
                        <div class="col-12 col-lg-6">
                            <div class="form-group mb-3">
                                <label class="form-label">Aumento en pago de cuotas</label>
                                <div class="input-group">
                                    <span class="input-group-text">$</span>
                                    <input v-model="clientPlan.cuotaAddOn" type="number" class="form-control" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-group mb-4">
                        <label class="form-label">Icono <span class="text-danger">*</span></label>
                        <div v-if="!inputIcon" class="dropdown w-100">
                            <button class="btn btn-secondary dropdown-toggle w-100" type="button" id="iconDropdown"
                                data-bs-toggle="dropdown" aria-expanded="false">
                                <i :class="clientPlan.icon"></i>
                                {{ selectedIconLabel || 'Seleccione un Icono' }}
                            </button>
                            <ul class="dropdown-menu w-100" aria-labelledby="iconDropdown">
                                <li v-for="icon in iconOptions" :key="icon.value">
                                    <a class="dropdown-item" href="#" @click="selectIcon(icon)">
                                        <i :class="icon.value" class="me-2"></i>
                                        {{ icon.label }}
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="form-check mt-3">
                            <input type="checkbox" class="form-check-input" id="uploadImageCheckbox" v-model="inputIcon">
                            <label class="form-check-label" for="uploadImageCheckbox">
                                Ingresar código de Icono
                            </label>
                        </div>
                        <input v-if="inputIcon" v-model="clientPlan.icon" type="text" class="form-control mt-2"
                            placeholder="fa-solid fa-icon-name" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-theme" @click="createPlan">
                        <i class="fa-solid fa-save me-2"></i>Guardar
                    </button>
                </div>
            </div>
            <div v-else class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Nuevo Plan de Suscripción - Comercios</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="form-group mb-3">
                        <label class="form-label">Orden <span class="text-danger">*</span></label>
                        <input v-model="affiliatePlan.order" type="number" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Nombre <span class="text-danger">*</span></label>
                        <input v-model="affiliatePlan.name" type="text" class="form-control" required />
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Descripción <span class="text-danger">*</span></label>
                        <textarea v-model="affiliatePlan.desc" class="form-control" rows="4" required></textarea>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Precio <span class="text-danger">*</span></label>
                        <div class="input-group">
                            <span class="input-group-text">$</span>
                            <input v-model="affiliatePlan.price" type="number" class="form-control" required />
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-theme" @click="createPlan">
                        <i class="fa-solid fa-save me-2"></i>Guardar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { showToast } from '@/utils/toast';
import { db } from '@/firebase/init';
import { ref as dbRef, push, set } from 'firebase/database';

export default {
    name: 'CreatePlanModal',
    props: {
        activeTab: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            clientPlan: {
                order: '',
                name: '',
                desc: '',
                price: 0,
                requestLimit: 0,
                cuotaAddOn: 0,
                icon: ''
            },
            affiliatePlan: {
                order: '',
                name: '',
                desc: '',
                price: 0,
            },
            inputIcon: false,
            selectedIconLabel: '',
            iconOptions: [
                { value: 'fa-solid fa-leaf', label: 'Basico' },
                { value: 'fa-solid fa-gem', label: 'Plata' },
                { value: 'fa-solid fa-crown', label: 'Oro' }
            ]
        }
    },
    methods: {
        async createPlan() {
            if (this.activeTab === 'clients') {
                try {
                    const data = {
                        order: this.clientPlan.order,
                        name: this.clientPlan.name,
                        desc: this.clientPlan.desc,
                        price: this.clientPlan.price,
                        requestLimit: this.clientPlan.requestLimit || null,
                        cuotaAddOn: this.clientPlan.cuotaAddOn || null,
                        icon: this.clientPlan.icon,
                    };
                    const plansRef = dbRef(db, 'Suscriptions');
                    const newPlanRef = push(plansRef);

                    await set(newPlanRef, data);

                    showToast('Suscripción creada con exito!');
                    // Reset form fields
                    this.resetForm('client');
                    this.$emit('plan-created');
                } catch (error) {
                    console.error('Error creating subscription:', error);
                    alert('La creación de la Suscripción falló.');
                }
            } else {
                try {
                    const data = {
                        order: this.affiliatePlan.order,
                        name: this.affiliatePlan.name,
                        desc: this.affiliatePlan.desc,
                        price: this.affiliatePlan.price,
                    };
                    const plansRef = dbRef(db, 'Affiliate_suscriptions');
                    const newPlanRef = push(plansRef);

                    await set(newPlanRef, data);

                    showToast('Suscripción creada con exito!');
                    // Reset form fields
                    this.resetForm('affiliate');
                    this.$emit('plan-created');
                } catch (error) {
                    console.error('Error creating subscription:', error);
                    alert('La creación de la Suscripción falló.');
                }
            }
        },
        resetForm(type) {
            if (type === 'client') {
                this.clientPlan = {
                    order: '',
                    name: '',
                    desc: '',
                    price: 0,
                    requestLimit: 0,
                    cuotaAddOn: 0,
                    icon: ''
                };
                this.inputIcon = false;
                this.selectedIconLabel = '';
            } else {
                this.affiliatePlan = {
                    order: '',
                    name: '',
                    desc: '',
                    price: 0,
                };
            }
        },
        selectIcon(icon) {
            this.clientPlan.icon = icon.value;
            this.selectedIconLabel = icon.label;
        },
        toggleInputIcon() {
            this.inputIcon = !this.inputIcon;
        }
    }
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

.dropdown-menu {
    background-color: #2d2d2d;
    border-color: #444;
}

.dropdown-item {
    color: #fff;
}

.dropdown-item:hover {
    background-color: rgba(111, 66, 193, 0.1);
    color: #fff;
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