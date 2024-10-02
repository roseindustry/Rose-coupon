<script>
import { db, } from '../firebase/init';
import { ref as dbRef, update, get, query, orderByChild, equalTo, push, set, remove } from 'firebase/database';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import SearchInput from '@/components/app/SearchInput.vue';
import moment from 'moment';
import { Modal } from 'bootstrap';

export default {
    components: {
        SearchInput,
    },
    data() {
        return {
            clients: [],
            plans: [],

            searchClient: '',
            searchResults: [],
            selectedClient: null,
            selectedPlan: null,

            plan: {
                order: '',
                name: '',
                desc: '',
                price: 0,
                icon: ''
            },
            editPlanData: {
                id: '',
                order: '',
                name: '',
                desc: '',
                price: 0,
                icon: ''
            },

            inputIcon: false,
            // Predetermined icons
            iconOptions: [
                { value: 'fa-solid fa-leaf', label: 'Basico' },
                { value: 'fa-solid fa-gem', label: 'Plata' },
                { value: 'fa-solid fa-crown', label: 'Oro' }
            ],
            selectedIconLabel: '',
        };
    },
    computed: {
        sortedPlans() {
            return this.plans.sort((a, b) => {
                return a.order - b.order;
            });
        },
    },
    methods: {
        showToast(message) {
            Toastify({
                text: message,
                duration: 3000,
                close: true,
                gravity: 'top',
                position: 'right',
                stopOnFocus: true,
                style: {
                    background: 'linear-gradient(to right, #00b09b, #96c93d)',
                },
            }).showToast();
        },

        async createPlan() {
            try {
                const data = {
                    order: this.plan.order,
                    name: this.plan.name,
                    desc: this.plan.desc,
                    price: this.plan.price,
                    icon: this.plan.icon,
                };
                const plansRef = dbRef(db, 'Suscriptions');
                const newPlanRef = push(plansRef);

                await set(newPlanRef, data);

                this.showToast('Suscripción creada con exito!');
                // Reset form fields
                this.plan.order = '';
                this.plan.name = '';
                this.plan.desc = '';
                this.plan.price = 0;
                this.plan.icon = '';
                this.inputIcon = false;

                console.log('Suscripción creada.');
                await this.fetchPlans();
            } catch (error) {
                console.error('Error creating subscription:', error);
                alert('La creación de la Suscripción falló.');
                return null;
            }
        },
        editPlan(plan) {
            // Populate the modal fields with the plan data
            this.editPlanData = {
                ...plan
            };
            console.log(this.editPlanData.id);

            // Open the modal
            const modal = new Modal(document.getElementById('editPlanModal'));
            modal.show();
        },
        async updatePlan(planId) {
            const planRef = dbRef(db, `Suscriptions/${planId}`);

            const updateData = {
                order: this.editPlanData.order,
                name: this.editPlanData.name,
                desc: this.editPlanData.desc,
                price: this.editPlanData.price,
                icon: this.editPlanData.icon
            };

            try {
                await update(planRef, updateData);
                console.log("Suscription updated successfully");

                // Success notification
                this.showToast('Suscripción actualizada con exito!');
                // Close the modal after saving
                const modal = Modal.getInstance(document.getElementById('editPlanModal'));
                modal.hide();
                await this.fetchPlans();
            } catch (error) {
                console.error("Error updating suscription:", error);
            }
        },
        async deletePlan(planId, index) {
            if (confirm("¿Desea borrar esta suscripcion?")) {
                try {
                    const planRef = dbRef(db, `Suscriptions/${planId}`);
                    await remove(planRef);

                    // Remove the coupon from the local state
                    this.plans.splice(index, 1);

                    Toastify({
                        text: 'Suscripcion eliminada con éxito!',
                        duration: 3000,
                        close: true,
                        gravity: 'top',
                        position: 'right',
                        stopOnFocus: true,
                        style: {
                            background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
                        },
                    }).showToast();
                } catch (error) {
                    console.error('Error deleting subscription:', error);
                    alert('La eliminación de la suscripcion falló.');
                }
            }
        },

        async fetchClients() {
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(clientRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Since Firebase data is an object, map to array for easier use
                    this.clients = Object.keys(users).map(key => ({
                        id: key,
                        ...users[key]
                    }));
                } else {
                    this.clients = [];  // No clients found
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.clients = [];
            }
        },
        async fetchPlans() {
            const plansRef = query(dbRef(db, 'Suscriptions'));
            try {
                const snapshot = await get(plansRef);

                if (snapshot.exists()) {
                    const plans = snapshot.val();

                    // Since Firebase data is an object, map to array for easier use
                    this.plans = Object.keys(plans).map(key => ({
                        id: key,
                        ...plans[key]
                    }));
                } else {
                    this.plans = [];  // No subscriptions found
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
                this.plans = [];
            }
        },

        searchClients() {
            if (!this.searchClient.trim()) {
                this.searchResults = [];
                return;
            }

            const searchInput = this.searchClient.toLowerCase();

            this.searchResults = this.clients.filter(client => {
                // Ensure client.identification and other fields are strings
                const identification = (client.identification || '').toString().toLowerCase();
                const name = (client.firstName + ' ' + client.lastName).toLowerCase();

                return identification.includes(searchInput) || name.includes(searchInput);
            });
        },
        selectClient(client) {
            this.selectedClient = client;
            console.log('Selected client:', client.identification);
            this.searchClient = '';
            this.searchResults = [];
        },
        selectPlan(planName) {
            if (this.selectedPlan === planName) {
                this.selectedPlan = ''; // Deselect the plan
            } else {
                this.selectedPlan = planName; // Select the new plan
            }
        },

        async assignClientPlan() {
            if (!this.selectedClient) {
                alert('Por favor seleccione un cliente antes de asignar una suscripción.');
                return;
            }

            if (!this.selectedPlan) {
                alert('Por favor seleccione una suscripción antes de asignar.');
                return;
            }

            const clientId = this.selectedClient.id;

            // Find the selected plan object from the plans array
            const selectedPlanDetails = this.plans.find(plan => plan.name === this.selectedPlan);

            // Calculate payDay (one month from today)
            const payDay = moment().add(1, 'month').toISOString();

            if (!selectedPlanDetails) {
                alert('Error al seleccionar el plan. Por favor, intente de nuevo.');
                return;
            }

            // Prepare subscription details
            const subscriptionData = {
                name: selectedPlanDetails.name,
                status: true, // Set the default status as true 'active'
                price: selectedPlanDetails.price,
                payDay: payDay,
                isPaid: false, // Set the default as unpaid
                icon: selectedPlanDetails.icon
            };

            try {
                // Assign the subscription details to the client's data in Firebase
                const userPlanRef = dbRef(db, `Users/${clientId}/subscription`);
                await update(userPlanRef, subscriptionData);

                this.showToast('Suscripción asignada con éxito!');
                // Reset selection after assigning the plan
                this.selectedPlan = null;
                this.selectedClient = null;
                this.searchClient = '';
            } catch (error) {
                console.error('Error assigning plan:', error);
                alert('La asignación de la suscripción falló.');
            }
        },

        toggleInputIcon() {
            this.inputIcon = true;
        },
        selectIcon(icon) {
            this.plan.icon = icon.value;
            this.selectedIconLabel = icon.label;
        }
    },
    async mounted() {
        await this.fetchClients();
        await this.fetchPlans();
    },
};
</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Suscripciones
    </h2>

    <!-- Create plan button -->
    <div class="d-flex justify-content-end align-items-center">
        <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#createPlan" style="margin: 14px;">
            <i class="fa fa-plus-circle fa-fw me-1"></i> Crear Plan
        </a>
    </div>

    <!-- Content -->
    <div class="container">
        <div class="shadow-lg p-3 mb-5 bg-body text-center">
            <div class="search-box mb-3">
                <!-- Search client bar -->
                <SearchInput v-model="searchClient" :results="searchResults"
                    placeholder="Filtrar cliente por nombre o cédula..." @input="searchClients" @select="selectClient"
                    class="form-control" />
            </div>

            <!-- Selected Client info section -->
            <div v-if="selectedClient" class="mb-3 p-3 border rounded">
                <h5>Información del cliente seleccionado</h5>
                <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' + selectedClient.lastName }}</p>
                <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                <p><strong>Email:</strong> {{ selectedClient.email }}</p>
                <p><strong>Teléfono:</strong> {{ selectedClient.phoneNumber }}</p>
            </div>

            <!-- Subscription Plan Selection -->
            <div class="mt-4 mb-3 text-center">
                <h5 class="mb-5">Seleccione una suscripción</h5>
                <div class="row justify-content-center">
                    <!-- Loop through the plans array and display buttons for each plan -->
                    <div v-for="(plan, index) in sortedPlans" :key="plan.id"
                        class="col-12 col-sm-12 col-md-6 col-lg-3 mb-4 d-flex flex-column align-items-center">
                        <!-- Plan Button (bigger) -->
                        <button @click="selectPlan(plan.name)" :class="{ 'selected': selectedPlan === plan.name }"
                            class="btn plan-button-big w-50">
                            <i :class="plan.icon"></i><br>
                            {{ plan.name }}
                            <!-- Edit and Delete Icons -->
                            <div class="d-flex justify-content-center mt-2 ">
                                <button class="btn btn-sm btn-outline-info me-1" @click="editPlan(plan)">
                                    <i class="fa-solid fa-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" @click="deletePlan(plan.id, index)">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Confirmation button to assign the selected subscription -->
            <button class="btn btn-theme mt-3" @click="assignClientPlan()">Aceptar</button>

        </div>
    </div>

    <!-- Create Plan Modal -->
    <div class="modal fade" id="createPlan" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Registra un nuevo Plan de Suscripción</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Orden <span class="text-danger">*</span></label>
                        <input v-model="plan.order" type="number" class="form-control form-control-lg fs-15px" value=""
                            required />
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Nombre <span class="text-danger">*</span></label>
                        <input v-model="plan.name" type="text" class="form-control form-control-lg fs-15px" value=""
                            required />
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Descripción <span class="text-danger">*</span></label>
                        <textarea v-model="plan.desc" class="form-control form-control-lg fs-15px" rows="5"
                            required></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Precio <span class="text-danger">*</span></label>
                        <input v-model="plan.price" type="number" class="form-control form-control-lg fs-15px" value=""
                            required />
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Icono <span class="text-danger">*</span></label>
                        <!-- Option 1: Dropdown to select a FontAwesome icon for the subscription -->
                        <div v-if="!inputIcon" class="dropdown">
                            <button class="btn btn-secondary dropdown-toggle" type="button" id="iconDropdown"
                                data-bs-toggle="dropdown" aria-expanded="false">
                                <i :class="plan.icon"></i> <!-- Display selected icon here -->
                                {{ selectedIconLabel || 'Seleccione un Icono' }}
                            </button>
                            <ul class="dropdown-menu" aria-labelledby="iconDropdown">
                                <li v-for="icon in iconOptions" :key="icon.value">
                                    <a class="dropdown-item" href="#" @click="selectIcon(icon)">
                                        <i :class="icon.value"></i> {{ icon.label }}
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div class="form-check mt-4">
                            <input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
                                v-model="inputIcon">
                            <label class="form-check-label" for="uploadImageCheckbox">Ingresar código de Icono</label>
                        </div>
                        <!-- Option 2: Insert the icon name needed from fontAwesome -->
                        <input v-if="inputIcon" v-model="plan.icon" type="text" class="form-control mt-4" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-theme" @click="createPlan()">Guardar</button>
                </div>
            </div>
        </div>
    </div>
    <!-- Edit Plan Modal -->
    <div class="modal fade" id="editPlanModal" tabindex="-1" aria-labelledby="editPlanModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editPlanModalLabel">Editar Plan</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Orden</label>
                        <input v-model="editPlanData.order" type="text" class="form-control" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Nombre del Plan</label>
                        <input v-model="editPlanData.name" type="text" class="form-control" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Descripción</label>
                        <textarea v-model="editPlanData.desc" class="form-control form-control-lg fs-15px" rows="5"
                            required></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Precio</label>
                        <input v-model="editPlanData.price" type="number" class="form-control" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Icono</label>
                        <input v-model="editPlanData.icon" type="text" class="form-control" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    <button type="button" class="btn btn-theme" @click="updatePlan(editPlanData.id)">Guardar
                        cambios</button>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.btn-theme {
    background-color: purple;
    border-color: purple;
}

.btn:hover {
    color: #fff;
    background-color: #29122f;
}

.plan-button-big {
    width: 150px;
    height: 150px;
    font-size: 18px;
    padding: 15px;
    background-color: transparent;
    border: 1px solid #ccc;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

/* Selected plan styling */
.selected {
    color: #fff;
    background-color: #29122f;
}

/* Edit and delete icons positioning */
.plan-actions {
    position: absolute;
    top: 5px;
    right: 10px;
    display: flex;
    gap: 5px;
}

.plan-actions .btn {
    font-size: 10px;
    padding: 5px;
    border-radius: 15%;
}
</style>