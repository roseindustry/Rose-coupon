<script>
import { db, } from '../firebase/init';
import { ref as dbRef, update, get, query, orderByChild, equalTo } from 'firebase/database';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import SearchInput from '@/components/app/SearchInput.vue';
import moment from 'moment';

export default {
    components: {
        SearchInput,
    },
    data() {
        return {
            clients: [],

            searchClient: '',
            searchResults: [],
            selectedClient: null,
            selectedPlan: null,
            plans: [
                { name: 'Basico', text: '$0', price: 0, icon: 'fa fa-leaf' },
                { name: 'Plata', text: '$5', price: 5, icon: 'fa fa-gem' },
                { name: 'Oro', text: '$10', price: 10, icon: 'fa fa-crown' }
            ],

        };
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

        createPlan(){
            console.log('coming soon');
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
        async fetchPlans(){
            console.log('coming soon');
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
        selectPlan(plan) {
            this.selectedPlan = plan;
            console.log('Selected Plan: ', plan);
        },

        getPlanButtonClass(plan) {
            const planColors = {
                'Basico': 'btn-basic',
                'Plata': 'btn-plata',
                'Oro': 'btn-oro'
            };
            return planColors[plan] || 'btn-secondary';
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
    },
    async mounted() {
        await this.fetchClients();
    },
};
</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Suscripciones
    </h2>

    <div class="d-flex justify-content-end align-items-center">
        <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#createPlan" style="margin: 14px;">
            <i class="fa fa-plus-circle fa-fw me-1"></i> Crear Plan
        </a>
    </div>

    <div class="container">
        <div class="shadow-lg p-3 mb-5 bg-body rounded">
            <div class="search-box mb-3">
                <SearchInput v-model="searchClient" :results="searchResults"
                    placeholder="Filtrar cliente por nombre o cedula..." @input="searchClients" @select="selectClient"
                    class="form-control" />
            </div>

            <div v-if="selectedClient" class="mb-3 p-3 border rounded">
                <h5>Información del cliente seleccionado</h5>
                <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                    selectedClient.lastName }}</p>
                <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                <p><strong>Email:</strong> {{ selectedClient.email }}</p>
                <p><strong>Teléfono:</strong> {{ selectedClient.phoneNumber }}</p>
            </div>

            <!-- Subscription Plan Selection -->
            <div class="mb-3 text-center">
                <h5>Seleccione una suscripción</h5>
                <div class="d-flex justify-content-center">
                    <!-- Loop through the plans array and display buttons for each plan -->
                    <button v-for="plan in plans" :key="plan.name" @click="selectPlan(plan.name)"
                        :class="[getPlanButtonClass(plan.name), { 'selected': selectedPlan === plan.name }]"
                        class="btn m-2 plan-button">
                        {{ plan.name }}<br>{{ plan.text }}
                    </button>
                </div>
            </div>

            <!-- Confirmation button to assign the selected subscription -->
            <button class="btn btn-primary" @click="assignClientPlan()">Aceptar</button>
        </div>
    </div>
</template>
<style scoped>
/* Custom styles for the plan buttons */
.btn-basic {
    background-color: #f8d1d1;
    /* Pastel color for Basico */
    color: #000;
}

.btn-plata {
    background-color: #d1e7f8;
    /* Pastel color for Plata */
    color: #000;
}

.btn-oro {
    background-color: #f8e7d1;
    /* Pastel color for Oro */
    color: #000;
}

.plan-button {
    font-size: 1.25rem;
    padding: 1rem 2rem;
    border: 2px solid transparent;
}

.selected.btn-basic {
    background-color: #007bff;
    border-color: #f8d1d1;
    color: black;
}

.selected.btn-plata {
    background-color: #007bff;
    border-color: #d1e7f8;
    color: black;
}

.selected.btn-oro {
    background-color: #007bff;
    border-color: #f8e7d1;
    color: black;
}

.btn:hover {
    color: #fff;
    background-color: #007bff;
}
</style>