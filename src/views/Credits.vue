<script>
import { db } from '../firebase/init';
import { ref as dbRef, update, get, set, query, orderByChild, equalTo } from 'firebase/database';
import SearchInput from '@/components/app/SearchInput.vue';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import { useUserStore } from "@/stores/user-role";

export default {
    components: {
        SearchInput
    },
    data() {
        return {
            //Admin data
            userId: '',
            role: '',

            affiliates: [],
            clients: [],
            selectedClient: null,
            searchClientResults: [],

            searchQuery: '',
            searchClient: '',

            creditValue: 0, // data to assign credit to the App
            totalCapital: 0, // Total credit assigned to the app for display

            creditUsed: 0, // Total credit used by clients
            creditAvailable: 0, // Remaining credit after usage
            assignedCapital: 0, // Total assigned credit to clients
            availableToAssign: 0, // Credit still available to assign to clients


            clientId: '',
            clientCredit: 0,
            assignAmount: 0,

            //Client data
            clientApprovedCred: 0,
            clientUsedCred: 0,
            requestedAmount: 0,
        }
    },
    computed: {
        filteredAffiliates() {
            let filteredAffiliates = this.affiliates;

            // Apply search query filter for all options
            if (this.searchQuery) {
                filteredAffiliates = filteredAffiliates.filter(aff =>
                    aff.companyName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    aff.rif.toLowerCase().includes(this.searchQuery.toLowerCase())
                );
            }

            return filteredAffiliates;
        }
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

        //FOR ADMIN USE
        //Fetch data 
        async fetchCurrentTotalCredit() {
            try {
                const creditRef = dbRef(db, `Users/${this.userId}/credit`);
                const creditSnapshot = await get(creditRef);

                if (creditSnapshot.exists()) {
                    const creditData = creditSnapshot.val();
                    this.totalCapital = parseFloat(creditData.value).toFixed(2);
                } else {
                    console.log('No credit data found for the user.');
                    this.totalCapital = 0;
                }
            } catch (error) {
                console.error('Error fetching current credit:', error);
                this.totalCapital = 0;
            }
        },
        async fetchClients() {
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(clientRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Map Firebase data to an array of promises
                    const clientPromises = Object.keys(users).map(async key => {
                        const clientCredit = await this.fetchClientCredit(key);
                        return {
                            id: key,
                            credit: parseFloat(clientCredit) || 0,
                            ...users[key],
                        };
                    });

                    // Await for all promises to resolve
                    this.clients = await Promise.all(clientPromises);

                    // After resolving all promises, calculate the total assigned credit
                    // const totalCreditUsed = this.clients
                    //     .reduce((total, client) => total + (client.credit?.value || 0), 0);
                    // this.creditUsed = totalCreditUsed.toFixed(2) ?? 0;
                    this.calculateCredits();
                } else {
                    this.clients = [];
                    this.creditUsed = 0;
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.clients = [];
                this.creditUsed = 0;
            }
        },
        async fetchClientCredit(clientId) {
            try {
                const clientCreditRef = dbRef(db, `Users/${clientId}/credit`);
                const creditSnapshot = await get(clientCreditRef);

                if (creditSnapshot.exists()) {
                    return creditSnapshot.val().value || 0;
                } else {
                    return 0;
                }
            } catch (error) {
                console.error('Error fetching client credit:', error);
                return 0;
            }
        },
        async fetchAffiliates() {
            const role = 'afiliado';
            const affiliateRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(affiliateRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Since Firebase data is an object, map to array for easier use
                    this.affiliates = Object.keys(users).map(key => ({
                        id: key,
                        ...users[key]
                    }));
                } else {
                    this.affiliates = [];
                }
            } catch (error) {
                console.error('Error fetching affiliates:', error);
                this.affiliates = [];
            }
        },

        // Calculate total credit usage, available credit, and available to assign
        calculateCredits() {
            // Calculate the total credit already used by clients
            this.creditUsed = this.clients.reduce((total, client) => total + (client.credit?.value || 0), 0); //Edit to reference the credit SPENT by clients

            // The remaining available credit in the app
            this.creditAvailable = this.totalCapital - this.creditUsed;

            // The total capital that has been assigned (but not necessarily used)
            this.assignedCapital = this.clients.reduce((total, client) => total + (client.credit?.value || 0), 0);

            // Calculate the available capital left for assignment
            this.availableToAssign = this.totalCapital - this.assignedCapital;
        },

        searchClients() {
            if (!this.searchClient.trim()) {
                this.searchClientResults = [];
                return;
            }

            const searchQuery = this.searchClient.toLowerCase();

            this.searchClientResults = this.clients.filter(client => {
                // Ensure client.identification and other fields are strings
                const identification = (client.identification || '').toString().toLowerCase();
                const name = (client.firstName + ' ' + client.lastName).toLowerCase();

                return identification.includes(searchQuery) || name.includes(searchQuery);
            });
        },
        selectClient(client) {
            this.selectedClient = client;
            this.fetchClientCredit(client.id);
            console.log('Selected client:', client.identification);
            this.searchClient = '';
            this.searchClientResults = [];
        },

        initializeCreditValue() {
            // Set the input value in the modal to reflect the current credit
            this.creditValue = parseFloat(this.totalCapital); // Ensure it's a number
        },

        async setCredit() {
            if (confirm("¿Desea asignar este nuevo monto a la App?")) {
                const creditRef = dbRef(db, `Users/${this.userId}/credit`);
                try {
                    const value = {
                        value: parseFloat(this.creditValue),
                    }
                    await update(creditRef, value);

                    this.showToast('Valor actualizado!');

                    // Reset form fields
                    this.creditValue = 0;
                    await this.fetchCurrentTotalCredit();
                } catch (error) {
                    console.error('Error setting credit value:', error);
                    alert('No se pudo editar el valor.');
                }
            }
        },
        async assignCreditToClient() {
            if (!this.selectedClient || this.assignAmount <= 0) {
                alert('Please select a valid client and assign a valid amount.');
                return;
            }

            if (this.assignAmount > this.availableToAssign) {
                alert('No hay suficiente capital para asignar.');
                return;
            }

            try {
                // Fetch client's current credit
                const clientCreditsRef = dbRef(db, `Users/${this.selectedClient.id}/credit`);
                const clientSnapshot = await get(clientCreditsRef);
                let currentClientCredit = 0;
                if (clientSnapshot.exists()) {
                    currentClientCredit = clientSnapshot.val().value || 0;
                }

                // Update client's credit
                const newClientCredit = currentClientCredit + this.assignAmount;
                await update(clientCreditsRef, { value: newClientCredit });

                // Update the company's assigned capital (deduct the assigned amount from available to assign)
                const newAssignedCapital = this.assignedCapital + this.assignAmount;
                this.assignedCapital = newAssignedCapital;

                // Update available to assign
                this.availableToAssign = this.totalCapital - newAssignedCapital;

                // Save updated available credit to the database
                const companyCreditRef = dbRef(db, `Users/${this.userId}/credit`);
                await update(companyCreditRef, { availableCredit: this.availableToAssign });

                this.showToast(`Credit of $${this.assignAmount} assigned to ${this.selectedClient.firstName}`);

                // Reset after assignment
                this.selectedClient = null;
                this.assignAmount = 0;
                await this.fetchClients();
            } catch (error) {
                console.error('Error assigning credit:', error);
                alert('No se pudo asignar el crédito.');
            }
        },

        //FOR CLIENT USE
        async requestCredit(){
            if (confirm("¿Desea solicitar este monto a Rose App?")) {
                //If the answer is Yes

                const creditRef = dbRef(db, `Users/${this.userId}/credit`);
                try {
                    const value = {
                        value: parseFloat(this.creditValue),
                    }
                    await set(creditRef, value);

                    this.showToast('Valor actualizado!');

                    // Reset form fields
                    this.requestedAmount = 0;
                } catch (error) {
                    console.error('Error setting credit value:', error);
                    alert('No se pudo enviar la solicitud.');
                }
            }
        },
    },
    async created() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.userId = userStore.userId;
        this.role = userStore.role;

        if (this.role === 'admin') {
            try {
                await this.fetchCurrentTotalCredit();
                await this.fetchClients();
                await this.fetchAffiliates();
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        }
    }
}

</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold" style="color: #343a40;">
        Crédito
    </h2>

    <div v-if="this.role === 'admin'" class="container">
        <div class="container my-5">
            <div class="row justify-content-center mb-4">
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-5">
                            <h5 class="card-title mb-3">Capital Total</h5>
                            <h3><strong>${{ this.totalCapital }}</strong></h3>
                            <a href="#" class="btn btn-theme btn-lg px-4 mt-3 shadow-sm" data-bs-toggle="modal"
                                data-bs-target="#set-credit" @click="initializeCreditValue">Administrar</a>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="mt-5">

            <div class="d-flex justify-content-end align-items-center">
                <a href="#" class="btn btn-theme me-2" data-bs-toggle="modal"
                    data-bs-target="#set-credit-toclient">Asignar a Cliente
                </a>
                <a href="#" class="btn btn-theme" data-bs-toggle="modal"
                    data-bs-target="#set-credit-toaffiliate">Asignar a Comercio
                </a>
            </div>

            <!-- Credit breakdown -->
            <div class="row g-4">
                <h5>Desglose de Crédito</h5>
                <div class="col-12 col-md-6 col-lg-3">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-4">
                            <h5 class="card-title mb-3">Capital Usado</h5>
                            <h3><strong>${{ this.creditUsed }}</strong></h3>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-4">
                            <h5 class="card-title mb-3">Capital Disponible</h5>
                            <h3><strong>${{ creditAvailable }}</strong></h3>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-4">
                            <h5 class="card-title mb-3">Capital Asignado</h5>
                            <h3><strong>${{ assignedCapital }}</strong></h3>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6 col-lg-3">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-4">
                            <h5 class="card-title mb-3">Capital Disponible para Asignar</h5>
                            <h3><strong>${{ availableToAssign }}</strong></h3>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="mt-5">

            <!-- Credit status for Affiliates -->
            <div class="row">
                <h5>Estado de crédito por Comercio Afiliado</h5>
                <p v-if="affiliates.length === 0">No hay comercios registrados.</p>

                <!-- Search Bar to Filter Affiliates -->
                <div>
                    <input type="text" class="form-control" v-model="searchQuery"
                        placeholder="Buscar comercio por nombre o RIF..." />
                </div>

                <div class="row mt-4">
                    <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="(aff, index) in filteredAffiliates" :key="aff.id">
                        <div class="card h-100">
                            <div class="card-body position-relative">
                                <!-- Badge for status -->
                                <span v-if="aff.status" class="badge position-absolute top-0 start-100 translate-middle"
                                    :class="aff.status ? 'bg-success' : 'bg-danger'">
                                    {{ aff.status ? 'Activo' : 'Inactivo' }}
                                </span>

                                <div class="d-flex justify-content-between mb-3">
                                    <h6 class="card-title mb-0">
                                        {{ aff.companyName }}
                                    </h6>
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-transparent btn-md me-1">
                                            <!-- @click.prevent="enableEditMode(aff)" -->
                                            <i class="fa-solid fa-check text-success"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Image Display -->
                                <div class="img-container justify-content-end mb-3" v-if="aff.qrFileUrl">
                                    <img :src="aff.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                        style="max-height: 150px;">
                                </div>

                                <p class="card-text"><strong>RIF: </strong> {{ aff.rif }}</p>
                                <h3 v-if="aff.approvedCredit"><strong>Credito aprovado: $</strong>{{ aff.approvedCredit
                                    }}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to set the company's Credit -->
        <div class="modal fade" id="set-credit" tabindex="-1" aria-labelledby="setCreditModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="setCreditModalLabel">Editar crédito</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <div class="input-group">
                                <span class="input-group-text text-wrap" id="value-addon">$</span>
                                <input id="creditValue" type="number" class="form-control" v-model.number="creditValue"
                                    aria-label="Monto" aria-describedby="value-addon" min="0">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="setCredit()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to set client's credit -->
        <div class="modal fade" id="set-credit-toclient" tabindex="-1" aria-labelledby="setClientCreditModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="setClientCreditModalLabel">Asignar crédito</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <!-- Searching input -->
                            <SearchInput v-model="searchClient" :results="searchClientResults"
                                placeholder="Busque un cliente por su cédula..." @input="searchClients"
                                @select="selectClient" class="form-control mb-3" />
                            <!-- Display selected client information -->
                            <div v-if="selectedClient" class="mb-3 p-3 border rounded">
                                <h5>Información del cliente seleccionado</h5>
                                <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                                    selectedClient.lastName }}</p>
                                <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                                <p><strong>Crédito actual:</strong> ${{ selectedClient.credit.value }}</p>
                            </div>

                            <div class="input-group">
                                <span class="input-group-text text-wrap" id="assign-addon">$</span>
                                <input id="assignAmount" type="number" class="form-control" v-model="assignAmount"
                                    aria-label="Monto" aria-describedby="assign-addon">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="assignCreditToClient()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to set affiliate's credit -->

    </div>

    <div v-if="this.role === 'cliente'" class="container">
        <div class="container my-5">
            <div class="row justify-content-center mb-4">
                <div class="col-12 col-md-6 col-lg-4 mt-3">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-5">
                            <h5 class="card-title mb-3">Crédito aprobado</h5>
                            <h3><strong>${{ this.clientApprovedCred }}</strong></h3>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6 col-lg-4 mt-3">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-5">
                            <h5 class="card-title mb-3">Crédito Usado</h5>
                            <h3><strong>${{ this.clientUsedCred }}</strong></h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to request Credit to Rose Coupon -->
        <div class="modal fade" id="request-credit" tabindex="-1" aria-labelledby="requestCreditModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="requestCreditModalLabel">Solicitar crédito</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <div class="input-group">
                                <span class="input-group-text text-wrap" id="value-addon">$</span>
                                <input id="requestedCredit" type="number" class="form-control" v-model.number="requestedAmount"
                                    aria-label="Monto" aria-describedby="value-addon" min="0">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="requestCredit()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="this.role === 'afiliado'" class="container">
        <p>coming soon</p>
    </div>
</template>
<style>
.custom-card {
    transition: transform .3s ease-in-out, box-shadow .3s ease-in-out;
}

.custom-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>