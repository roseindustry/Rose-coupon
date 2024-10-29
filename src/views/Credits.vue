<script>
import { db, functions } from '../firebase/init';
import { ref as dbRef, update, set, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import SearchInput from '@/components/app/SearchInput.vue';
import { Modal } from 'bootstrap';
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
            allClients: [],
            selectedClient: null,
            searchClientResults: [],

            searchQuery: '',
            searchClient: '',
            filterClients: '',

            creditValue: 0, // data to assign credit to the App
            totalCapital: 0, // Total credit assigned to the app for display

            creditUsed: 0, // Total credit used by clients
            creditAvailable: 0, // Remaining credit after usage
            assignedCapital: 0, // Total assigned credit to clients
            availableToAssign: 0, // Credit still available to assign to clients


            clientId: '',
            clientCredit: 0,

            //Client data
            clientApprovedCred: null,
            clientUsedCred: null,
            requestedAmount: 0,

            activeTab: null,

            currentPage: 1,
            itemsPerPage: 9,

            loading: false,

            creditAmount: 0,
            creditLine: '',

            purchaseName: '',
            purchaseDate: '',
            purchaseAmount: 0,
            calc: false,
            quotesAmount: 0,
            terms: 2, // default to 2 cuota
            frequency: 2,
            cuotaDates: [],

            clientDetails: null,
        }
    },
    watch: {
        terms(newValue) {
            this.updateCuotaDates();
        }
    },
    computed: {
        filteredAffiliates() {
            return this.applyFilter(this.affiliates, 'affiliate');
        },
        filteredClients() {
            return this.applyFilter(this.clients, 'client');
        },
        paginatedAffiliates() {
            return this.paginate(this.filteredAffiliates);
        },
        paginatedClients() {
            return this.paginate(this.filteredClients);
        },

        totalPages() {
            // Compute total pages based on filtered data length
            const totalClientsPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
            const totalAffiliatesPages = Math.ceil(this.filteredAffiliates.length / this.itemsPerPage);

            // Return an object that has both total pages
            return {
                clients: totalClientsPages,
                affiliates: totalAffiliatesPages,
            };
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
        goToPage(page, type) {
            if (type === 'client') {
                if (page >= 1 && page <= this.totalPages.clients) {
                    this.currentPage = page;
                }
            } else if (type === 'affiliate') {
                if (page >= 1 && page <= this.totalPages.affiliates) {
                    this.currentPage = page;
                }
            }
        },
        applyFilter(data, type) {
            let query;
            if (type === 'client') {
                query = this.filterClients?.trim().toString().toLowerCase();
            } else if (type === 'affiliate') {
                query = this.searchQuery?.trim().toString().toLowerCase();
            }

            let filteredData = [...data];

            // Apply search filter
            if (query) {
                filteredData = filteredData.filter(item => {
                    let identification, name;
                    if (type === 'client') {
                        identification = item.identification?.toString().toLowerCase() || '';
                        name = (item.firstName + ' ' + item.lastName).toLowerCase();
                    } else if (type === 'affiliate') {
                        identification = item.rif?.toString().toLowerCase() || '';
                        name = item.companyName?.toLowerCase() || '';
                    }
                    return identification.includes(query) || name.includes(query);
                });

            }
            return filteredData;
        },
        paginate(data) {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return data.slice(start, end);
        },
        async sendEmail(payload) {
            try {
                const sendEmailFunction = httpsCallable(functions, 'sendEmail');
                await sendEmailFunction(payload);
            } catch (error) {
                console.error('Error sending email:', error);
            }
        },
        updateCuotaDates() {
            const newTerms = parseInt(this.terms);

            // If the terms number has increased, add more date placeholders
            if (newTerms > this.cuotaDates.length) {
                for (let i = this.cuotaDates.length; i < newTerms; i++) {
                    this.cuotaDates.push(''); // add an empty date input
                }
            } else if (newTerms < this.cuotaDates.length) {
                // If the terms number has decreased, remove excess date fields
                this.cuotaDates.splice(newTerms);
            }
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

                        const client = {
                            id: key,
                            ...users[key],
                        };

                        if (client.credit) {
                            client.credit = clientCredit
                        }

                        // Fetch the client's subscription ID
                        const subRef = dbRef(db, `Users/${key}/subscription/subscription_id`);
                        const subSnapshot = await get(subRef);

                        if (subSnapshot.exists()) {
                            const subId = subSnapshot.val();

                            // Fetch subscription details
                            const subDataRef = dbRef(db, `Suscriptions/${subId}`);
                            const subDataSnapshot = await get(subDataRef);

                            if (subDataSnapshot.exists()) {
                                const subData = subDataSnapshot.val();
                                client.subscription = {
                                    ...subData,
                                    subId // Include the subscription ID
                                };
                            } else {
                                client.subscription = null; // Handle case where subscription data is not found
                            }
                        } else {
                            client.subscription = null; // Client does not have a subscription
                        }

                        return client; // Return the complete client object with subscription and credit
                    });

                    // Await for all promises to resolve
                    const allClients = await Promise.all(clientPromises);

                    this.allClients = allClients;

                    this.clients = allClients.filter((client) => client.credit?.mainCredit > 0 || client.credit?.plusCredit > 0);

                    // console.log('Clients with Credit:', this.clients); // Debugging: clients with credit

                    this.calculateCredits();
                } else {
                    this.allClients = [];
                    this.clients = [];
                    this.creditUsed = 0;
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.allClients = [];
                this.clients = [];
                this.creditUsed = 0;
            }
        },
        async fetchClientCredit(clientId) {
            try {
                const clientCreditRef = dbRef(db, `Users/${clientId}/credit`);
                const creditSnapshot = await get(clientCreditRef);

                if (creditSnapshot.exists()) {
                    const creditData = creditSnapshot.val();

                    // Check if the mainCredit and plusCredit exist and are greater than 0
                    const mainCredit = creditData?.main?.totalCredit || 0;
                    const availableMainCredit = creditData?.main?.availableCredit || 0;

                    const plusCredit = creditData?.plus?.totalCredit || 0;
                    const availablePlusCredit = creditData?.plus?.availableCredit || 0;

                    // Only return the client credit if either credit line is assigned
                    if (mainCredit > 0 || plusCredit > 0) {
                        return {
                            mainCredit,
                            availableMainCredit,
                            plusCredit,
                            availablePlusCredit
                        };
                    } else {
                        return null; // No credit assigned, skip this client
                    }
                } else {
                    return null; // No credit assigned
                }
            } catch (error) {
                console.error('Error fetching client credit:', error);
                return null;
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
                    const allAffiliates = Object.keys(users).map(key => ({
                        id: key,
                        ...users[key]
                    }));

                    this.affiliates = allAffiliates.filter((aff) => aff.credit);
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
            this.creditUsed = this.clients.reduce((total, client) => {
                const mainCreditSpent = (client.credit?.mainCredit || 0) - (client.credit?.availableMainCredit || 0);
                // const plusCreditSpent = (client.credit?.main?.totalCredit || 0) - (client.credit?.plus?.availableCredit || 0);

                return total + mainCreditSpent; // + plusCreditSpent
            }, 0);

            // The remaining available credit in the app
            this.creditAvailable = this.totalCapital - this.creditUsed;

            // The total capital that has been assigned (but not necessarily used)
            this.assignedCapital = this.clients.reduce((total, client) => {
                const mainCreditAssigned = client.credit?.mainCredit || 0;
                // const plusCreditAssigned = client.credit?.plus?.totalCredit || 0;

                return total + mainCreditAssigned; // + plusCreditAssigned
            }, 0);

            // Calculate the available capital left for assignment
            this.availableToAssign = this.totalCapital - this.assignedCapital;
        },

        searchClients() {
            if (!this.searchClient.trim()) {
                this.searchClientResults = [];
                return;
            }

            const searchQuery = this.searchClient.toLowerCase();

            this.searchClientResults = this.allClients.filter(client => {
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
            // Check if the fields are empty
            if (!this.selectedClient || this.creditAmount <= 0) {
                alert('Por favor seleccione un cliente y un monto a asignar.');
                return;
            }

            // Check if the client has verified their account
            if (!this.selectedClient.isVerified) {
                alert('El cliente no está verificado.');
            }

            // Check if the client has a subscription
            if (!this.selectedClient.subscription) {
                alert('El cliente no cuenta con una suscripción.');
                return;
            }

            // If the client has a subscription, then check if it's paid
            if (this.selectedClient.subscription.price <= 0) {
                alert('El cliente no cuenta con una suscripción paga.');
                return;
            }

            // Check if there is available credit to assign in the app
            if (this.creditAmount > this.availableToAssign) {
                alert('No hay suficiente capital para asignar.');
                return;
            }

            try {
                if (!this.creditLine) {
                    alert('Seleccione una linea de credito para asignar');
                    return;
                }

                let clientCreditsRef;
                if (this.creditLine === 'main') {
                    clientCreditsRef = dbRef(db, `Users/${this.selectedClient.id}/credit/main`);
                } else if (this.creditLine === 'plus') {
                    clientCreditsRef = dbRef(db, `Users/${this.selectedClient.id}/credit/plus`);
                }

                // Update client's credit
                const newClientCredit = this.creditAmount;
                await set(clientCreditsRef,
                    {
                        totalCredit: newClientCredit,
                        availableCredit: newClientCredit
                    });

                // Update the company's assigned capital (deduct the assigned amount from available to assign)
                const newAssignedCapital = this.assignedCapital + this.creditAmount;
                this.assignedCapital = newAssignedCapital;

                // Update available to assign
                this.availableToAssign = this.totalCapital - newAssignedCapital;

                // Save updated available credit to the database
                const companyCreditRef = dbRef(db, `Users/${this.userId}/credit`);
                await update(companyCreditRef,
                    {
                        availableCredit: this.availableToAssign,
                    });

                this.showToast(`Al cliente ${this.selectedClient.firstName} ${this.selectedClient.lastName} se le asigno un credito de $${newClientCredit}`);

                // Reset after assignment
                this.selectedClient = null;
                this.creditAmount = 0;
                await this.fetchClients();
            } catch (error) {
                console.error('Error assigning credit:', error);
                alert('No se pudo asignar el crédito.');
            }
        },
        async savePurchase() {
            // Check if the fields are empty
            if (!this.selectedClient || this.purchaseAmount <= 0) {
                alert('Por favor seleccione un cliente y un monto a prestar.');
                return;
            }

            // Check if the client has available credit
            if (this.selectedClient.credit.availableMainCredit < this.purchaseAmount) {
                alert('El valor de la compra supera el monto de crédito disponible.');
                return;
            }

            try {

                const clientCreditsRef = dbRef(db, `Users/${this.selectedClient.id}/credit/main`);
                const snapshot = await get(clientCreditsRef);

                if (snapshot.exists()) {
                    const availableCredit = snapshot.val().availableCredit;

                    // Update client's credit
                    const purchase = this.purchaseAmount;
                    await update(clientCreditsRef,
                        {
                            availableCredit: availableCredit - purchase,
                        });

                    // Register the purchase in the client's collection
                    const purchaseDate = new Date().toISOString().split('T')[0];

                    const clientPurchaseRef = dbRef(db, `Users/${this.selectedClient.id}/credit/main/purchases/${purchaseDate}`);
                    await update(clientPurchaseRef,
                        {
                            affiliate_id: this.userId,
                            quotesAmount: this.quotesAmount,
                            terms: this.terms,
                            frequency: this.frequency,
                            cuotaDates: this.cuotaDates
                        });
                }

            } catch (error) {
                console.error('Error making purchase:', error);
                alert('No se pudo registrar la compra.');
            }

        },

        openDetails(client) {
            this.clientDetails = client;

            this.$nextTick(() => {
                const modalElement = document.getElementById('creditDetailsModal');
                const modal = new Modal(modalElement);
                modal.show();
            });
        },
        async cancelCredit(client) {
            if (confirm("¿Desea revocar el crédito de este cliente?")) {
                try {
                    this.loading = true;

                    const clientRef = dbRef(db, `Users/${client.id}/credit`);
                    await remove(clientRef);

                    this.showToast(`Línea de crédito removida para ${client.firstName} ${client.lastName}`)
                    this.fetchClients();

                    // Notify the client
                    const clientEmailPayload = {
                        to: client.email,
                        message: {
                            subject: `Línea de crédito cancelada en Roseapp`,
                            text: `Hola ${client.firstName} ${client.lastName}, se le ha revocado su línea de crédito en Roseapp.                        
                        Comunícate con soporte si tienes alguna duda.`,
                            html: `<p>Hola ${client.firstName} ${client.lastName}, se le ha revocado su línea de crédito en Roseapp.</p>
                        <p>Comunícate con soporte si tienes alguna duda.</p>`
                        },
                    };
                    await this.sendEmail(clientEmailPayload);
                } catch (error) {
                    console.error('Error cancelling credit:', error);
                } finally {
                    this.loading = false;
                }
            }
        },
        calcTerms() {
            if (this.purchase > 0) {
                this.calc = true;
            } else {
                alert('Ingrese un monto para calcular.');
                return;
            }
        },

        setActiveTab(type) {
            if (type === 'main') {
                this.activeTab = type;
                console.log(this.activeTab)
            } else if ('plus') {
                this.activeTab = type;
                console.log(this.activeTab)
            }
        },
        resetModal() {
            this.selectedClient = null;
            this.creditAmount = 0;
        }

        //FOR CLIENT USE
        // async requestCredit() {
        //     if (confirm("¿Desea solicitar este monto a Rose App?")) {
        //         //If the answer is Yes

        //         const creditRef = dbRef(db, `Users/${this.userId}/credit`);
        //         try {
        //             const value = {
        //                 value: parseFloat(this.creditValue),
        //             }
        //             await set(creditRef, value);

        //             this.showToast('Valor actualizado!');

        //             // Reset form fields
        //             this.requestedAmount = 0;
        //         } catch (error) {
        //             console.error('Error setting credit value:', error);
        //             alert('No se pudo enviar la solicitud.');
        //         }
        //     }
        // },
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.userId = userStore.userId;
        this.role = userStore.role;

        if (this.role === 'admin') {
            await this.fetchCurrentTotalCredit();
            await this.fetchClients();
            await this.fetchAffiliates();
        } else if (this.role === 'afiliado') {
            await this.fetchClients();
        }

    }
}

</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Crédito
    </h2>

    <div v-if="this.role === 'admin'" class="container">
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

        <!-- Credit status for Clients -->
        <div class="row">

            <h5>Estado de crédito por Cliente</h5>

            <div class="d-flex justify-content-end align-items-center mb-4 mt-3">
                <a href="#" class="btn btn-theme me-2" data-bs-toggle="modal" @click="updateCuotaDates"
                    data-bs-target="#set-credit-toclient">Asignar Credito a Cliente
                </a>
            </div>

            <!-- Search Bar to Filter Affiliates -->
            <div>
                <input type="text" class="form-control" v-model="filterClients"
                    placeholder="Buscar cliente por nombre o cedula..." />
            </div>

            <div class="row mt-4">
                <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="(client, index) in paginatedClients" :key="client.id">
                    <div class="card h-100">
                        <div class="card-body position-relative">
                            <!-- Badge for Subscription -->
                            <span v-if="client.subscription"
                                class="badge position-absolute top-0 start-100 translate-middle"
                                :class="client.subscription ? 'bg-success' : 'bg-danger'">
                                {{ client.subscription ? client.subscription.name.toUpperCase() : 'Sin suscripcion'
                                }}
                            </span>

                            <h5 class="card-title mb-3">
                                {{ client.firstName }} {{ client.lastName }}
                            </h5>

                            <p class="card-text"><strong>Cédula: </strong> V{{ client.identification }}</p>

                            <div class="row">
                                <!-- Main Credit Card -->
                                <div class="col-6 d-flex">
                                    <div class="card text-center w-100 equal-height">
                                        <div class="card-body">
                                            <h5 class="card-title"><strong>Crédito Principal Aprovado</strong></h5>
                                            <h5 class="text-success" v-if="client.credit.mainCredit">
                                                ${{ client.credit.mainCredit || client.credit.value }}
                                            </h5>
                                            <h5 v-else class="text-muted">No credit available</h5>
                                            <!-- Optional message for no credit -->
                                        </div>
                                    </div>
                                </div>

                                <!-- Plus Credit Card -->
                                <div class="col-6 d-flex">
                                    <div class="card text-center w-100 equal-height">
                                        <div class="card-body">
                                            <h5 class="card-title"><strong>Crédito Plus Aprovado</strong></h5>
                                            <h5 class="text-success" v-if="client.credit.plusCredit">
                                                ${{ client.credit.plusCredit || client.credit.value }}
                                            </h5>
                                            <h5 v-else class="text-muted">No credit available</h5>
                                            <!-- Optional message for no credit -->
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="row justify-content-center">
                                <button class="btn btn-outline-success btn-md mt-3 me-2" @click="openDetails(client)"
                                    style="width: auto;">
                                    Ver detalles
                                </button>
                                <button :disabled="loading" class="btn btn-outline-primary btn-md mt-3 me-2"
                                    @click.prevent="editCredit(client)" style="width: auto;">
                                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true"></span>
                                    <span>Ajustar</span>
                                </button>
                                <button :disabled="loading" class="btn btn-outline-danger btn-md mt-3"
                                    @click.prevent="cancelCredit(client)" style="width: auto;">
                                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true"></span>
                                    <span>Cancelar crédito</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Pagination Controls -->
                <nav class="mt-4" v-if="totalPages.clients > 1" aria-label="Page navigation">
                    <ul class="pagination justify-content-center">
                        <li class="page-item" :class="{ disabled: currentPage === 1 }">
                            <button class="page-link" @click="goToPage(currentPage - 1, 'client')"
                                :disabled="currentPage === 1">Anterior</button>
                        </li>
                        <li class="page-item" v-for="page in totalPages.clients" :key="page"
                            :class="{ active: page === currentPage }">
                            <button class="page-link" @click="goToPage(page, 'client')">{{ page }}</button>
                        </li>
                        <li class="page-item" :class="{ disabled: currentPage === totalPages.clients }">
                            <button class="page-link" @click="goToPage(currentPage + 1, 'client')"
                                :disabled="currentPage === totalPages.clients">Siguiente</button>
                        </li>
                    </ul>
                </nav>
            </div>

            <div v-if="clients.length === 0" class="d-flex justify-content-center align-items-center">
                <div class="text-center">
                    <div class="mb-3">
                        <i class="fa-solid fa-buildings text-body text-opacity-25" style="font-size: 5em"></i>
                    </div>
                    <h5>No hay Clientes con credito aprovado.</h5>
                </div>
            </div>
        </div>

        <hr class="mt-5">

        <!-- Payment status for Affiliates -->
        <div class="row">
            <h5 class="mb-4">Pago de Creditos por Comercio Afiliado</h5>
            <!-- Search Bar to Filter Affiliates -->
            <div>
                <input type="text" class="form-control" v-model="searchQuery"
                    placeholder="Buscar comercio por nombre o RIF..." />
            </div>

            <div class="row mt-4">
                <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="(aff, index) in paginatedAffiliates" :key="aff.id">
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
                            <div class="img-container justify-content-end mb-3" v-if="aff.image">
                                <img :src="aff.image" alt="logo" class="img-fluid img-thumbnail"
                                    style="max-height: 150px;">
                            </div>

                            <p class="card-text"><strong>RIF: </strong> {{ aff.rif }}</p>
                            <h3 v-if="aff.approvedCredit"><strong>Credito aprovado: </strong>
                                ${{ aff.credit.value || 0 }}</h3>
                        </div>
                    </div>
                </div>
                <!-- Pagination Controls -->
                <nav class="mt-4" v-if="totalPages.affiliates > 1" aria-label="Page navigation">
                    <ul class="pagination justify-content-center">
                        <li class="page-item" :class="{ disabled: currentPage === 1 }">
                            <button class="page-link" @click="goToPage(currentPage - 1, 'affiliate')"
                                :disabled="currentPage === 1">Anterior</button>
                        </li>
                        <li class="page-item" v-for="page in totalPages.affiliates" :key="page"
                            :class="{ active: page === currentPage }">
                            <button class="page-link" @click="goToPage(page, 'affiliate')">{{ page }}</button>
                        </li>
                        <li class="page-item" :class="{ disabled: currentPage === totalPages.affiliates }">
                            <button class="page-link" @click="goToPage(currentPage + 1, 'affiliate')"
                                :disabled="currentPage === totalPages.affiliates">Siguiente</button>
                        </li>
                    </ul>
                </nav>
            </div>

            <div v-if="affiliates.length === 0" class="d-flex justify-content-center align-items-center">
                <div class="text-center">
                    <div class="mb-3">
                        <i class="fa-solid fa-buildings text-body text-opacity-25" style="font-size: 5em"></i>
                    </div>
                    <h5>No hay Comercios pendientes por pago.</h5>
                </div>
            </div>
        </div>

        <!-- Modal to set the company's Credit loan -->
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
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header text-center">
                        <h5 class="modal-title" id="setClientCreditModalLabel">Asignar crédito a Cliente</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                            @click="resetModal()"></button>
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
                                <hr>
                                <p>
                                    <strong>Crédito actual</strong>
                                </p>
                                <p>
                                    <strong>Linea Principal: </strong> ${{ selectedClient.credit ?
                                        selectedClient.credit.mainCredit : 0 }}
                                </p>
                                <p>
                                    <strong>Linea Plus: </strong> ${{ selectedClient.credit ?
                                        selectedClient.credit.plusCredit : 0 }}
                                </p>
                            </div>

                            <div class="mb-3">
                                <!-- Radio Buttons for Line of Credit -->
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="radio" id="mainLine" value="main"
                                        v-model="creditLine">
                                    <label class="form-check-label" for="mainLine">Principal</label>
                                </div>
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="radio" id="plusLine" value="plus"
                                        v-model="creditLine">
                                    <label class="form-check-label" for="plusLine">Plus</label>
                                </div>

                                <div class="input-group mt-3">
                                    <span class="input-group-text text-wrap" id="value-addon">$</span>
                                    <input id="loanAmount" type="number" class="form-control"
                                        v-model.number="creditAmount" aria-label="Monto" aria-describedby="value-addon"
                                        min="0">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
                            @click="resetModal()">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="assignCreditToClient()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Modal to see client's credit details -->
        <div v-if="clientDetails" class="modal fade" id="creditDetailsModal" tabindex="-1"
            aria-labelledby="creditDetailsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header text-center">
                        <h5 class="modal-title" id="creditDetailsModalLabel">Detalles de {{ clientDetails.firstName }}
                            {{ clientDetails.lastName }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-3">
                            <div class="col-12">
                                <div class="card text-center m-3" style="width: auto;">
                                    ${{ clientDetails.credit.value }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to set affiliate's credit -->

    </div>

    <div v-if="this.role === 'cliente'" class="container">

        <!-- Tabs to toggle between main credit line and plus line -->
        <div class="mb-4">
            <ul class="nav nav-tabs nav-fill">
                <li class="nav-item">
                    <a @click.prevent="setActiveTab('main')" class="nav-link active" href="#" data-bs-toggle="tab"
                        data-bs-target="#main">
                        Principal
                    </a>
                </li>
                <li class="nav-item">
                    <a @click.prevent="setActiveTab('plus')" class="nav-link" href="#" data-bs-toggle="tab"
                        data-bs-target="#plus">
                        Plus
                    </a>
                </li>
            </ul>
        </div>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="main">
                <div class="row justify-content-center mb-4">
                    <div class="col-12 col-md-6 col-lg-4 mt-3">
                        <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                            <div class="card-body text-center py-5">
                                <h5 class="card-title mb-3">Crédito aprobado</h5>
                                <h3><strong>${{ this.clientApprovedCred || 0 }}</strong></h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 mt-3">
                        <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                            <div class="card-body text-center py-5">
                                <h5 class="card-title mb-3">Crédito Usado</h5>
                                <h3><strong>${{ this.clientUsedCred || 0 }}</strong></h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tab-pane fade" id="plus">
                <div class="row justify-content-center mb-4">
                    <div class="col-12 col-md-6 col-lg-4 mt-3">
                        <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                            <div class="card-body text-center py-5">
                                <h5 class="card-title mb-3">Crédito aprobado</h5>
                                <h3><strong>${{ this.clientApprovedCred || 0 }}</strong></h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-lg-4 mt-3">
                        <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                            <div class="card-body text-center py-5">
                                <h5 class="card-title mb-3">Crédito Usado</h5>
                                <h3><strong>${{ this.clientUsedCred || 0 }}</strong></h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to request Credit to Rose Coupon -->
        <div class="modal fade" id="request-credit" tabindex="-1" aria-labelledby="requestCreditModalLabel"
            aria-hidden="true">
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
                                <input id="requestedCredit" type="number" class="form-control"
                                    v-model.number="requestedAmount" aria-label="Monto" aria-describedby="value-addon"
                                    min="0">
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

        <!-- Tabs to toggle between main credit line and plus line -->
        <div class="mb-4">
            <ul class="nav nav-tabs nav-fill">
                <li class="nav-item">
                    <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#applyCredit">
                        Aplicar
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#pendingPayments">
                        Pagos pendientes
                    </a>
                </li>
            </ul>
        </div>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="applyCredit">
                <h4 class="text-center mb-4">Registrar Compra a Crédito</h4>
                <div class="mb-3 mt-3">
                    <!-- Searching input -->
                    <SearchInput v-model="searchClient" :results="searchClientResults"
                        placeholder="Busque un cliente por su cédula..." @input="searchClients" @select="selectClient"
                        class="form-control mb-3" />
                    <!-- Display selected client information -->
                    <div v-if="selectedClient" class="mb-3 p-3 border rounded">
                        <h5>Información del cliente seleccionado</h5>
                        <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                            selectedClient.lastName }}</p>
                        <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                        <hr>
                        <p>
                            <strong>Crédito actual</strong>
                        </p>
                        <p>
                            <strong>Linea Principal: </strong> ${{ selectedClient.credit ?
                                selectedClient.credit.mainCredit : 0 }}
                        </p>
                        <p>
                            <strong>Linea Plus: </strong> ${{ selectedClient.credit ? selectedClient.credit.plusCredit :
                                0 }}
                        </p>
                    </div>

                    <div class="row">
                        <div class="col-6 mb-3">
                            <label for="purchaseAmount">Nombre del producto</label>
                            <input id="purchaseAmount" type="text" class="form-control mt-2" v-model="purchaseName">
                        </div>
                        <div class="col-6 mb-3">
                            <label for="purchaseDate">Fecha de compra</label>
                            <input type="date" name="purchaseDate" class="form-control mt-2" v-model="purchaseDate">
                        </div>
                        <hr>
                        <div class="col-6 mb-3">
                            <label for="purchaseAmount">Monto de compra</label>
                            <div class="input-group mt-2">
                                <span class="input-group-text text-wrap" id="assign-addon">$</span>
                                <input id="purchaseAmount" type="number" class="form-control" v-model="purchaseAmount"
                                    aria-label="Monto" aria-describedby="assign-addon">
                            </div>
                        </div>
                        <div class="col-6 mb-3 d-flex align-items-end">
                            <button class="btn btn-theme" @click="calcTerms()">
                                Calcular cuotas
                            </button>
                        </div>

                        <div v-if="calc">
                            <div class="col-6 mb-3">
                                <label for="quotesAmount">Monto de Cuota</label>
                                <div class="input-group mt-2">
                                    <span class="input-group-text text-wrap" id="quote-addon">$</span>
                                    <input id="quotesAmount" type="number" class="form-control" v-model="quotesAmount"
                                        aria-label="quotesAmount" aria-describedby="quote-addon">
                                </div>
                            </div>
                            <div class="col-6 mb-3">
                                <label for="term">Plazo</label>
                                <div class="input-group mt-2">
                                    <span class="input-group-text text-wrap" id="term-addon">
                                        Cuotas
                                    </span>
                                    <input id="term" type="number" class="form-control" v-model="terms"
                                        aria-label="terms" aria-describedby="term-addon">
                                </div>
                            </div>
                            <div class="col-6 mb-3">
                                <label for="frequency">Frecuencia</label>
                                <select v-model="frequency" class="form-control mt-2">
                                    <option class="text-black" value="" disabled selected>Selecciona una opcion
                                    </option>
                                    <option value="2">Quincenal</option>
                                    <option value="1">Mensual</option>
                                </select>
                            </div>
                            <div v-for="(date, index) in cuotaDates" :key="index" class="col-6 mb-3">
                                <label :for="'cuotaDate-' + index">Fecha de Cuota {{ index + 1 }}</label>
                                <input :id="'cuotaDate-' + index" type="date" class="form-control mt-2"
                                    v-model="cuotaDates[index]">
                            </div>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-theme" @click="savePurchase()">Aplicar</button>
            </div>

            <div class="tab-pane fade" id="pendingPayments">
            </div>
        </div>

    </div>
</template>
<style>
.equal-height {
    display: flex;
    align-items: stretch;
    /* Ensures all cards have equal height */
}

.btn-theme {
    background-color: purple;
    border-color: purple;
}

.custom-card {
    transition: transform .3s ease-in-out, box-shadow .3s ease-in-out;
}

.custom-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>