<script>
import { ref as dbRef, query, orderByChild, equalTo, set, get, push, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/firebase/init';
import { Modal } from 'bootstrap';
import { showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'
import { useUserStore } from "@/stores/user-role";
import SearchInput from '@/components/app/SearchInput.vue';

export default {
    components: {
        SearchInput
    },
    data() {
        return {
            // Logged User data
            userId: '',
            role: '',

            giftcards: [],
            appliedGiftcards: [],
            unpaidGiftcards: [],
            clients: [],

            giftcard: {
                name: '',
                code: '',
                balance: 0,
                status: false,
                expiration: null,
            },
            addExpiration: false,
            editGiftcardData: '',

            filteredGiveaways: [],

            // imageFile: null,
            // uploadImage: false,
            // imagePreview: null,
            // updatedImagePreview: null,
            isSubmitting: false,

            searchClient: '',
            searchClientResults: [],
            selectedClient: null,
            selectedGiftcardOption: '',
            giftcardCode: '',

            currentPage: 1,
            itemsPerPage: 6,
            loading: false,

        }
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;

        await this.fetchGiftcards();

        if (this.role === 'afiliado') {
            await this.fetchClients();
        }
    },
    computed: {
        currentPageName() {
            return this.$route.name;
        },

        formattedCode: {
            get() {
                // Always return the value in uppercase
                return this.giftcard.code ? this.giftcard.code.toUpperCase() : '';
            },
            set(value) {
                // Update giftcard.code with the uppercase value
                this.giftcard.code = value.toUpperCase();
            }
        },
        formattedEditCode: {
            get() {
                // Always return the value in uppercase
                return this.editGiftcardData.code ? this.editGiftcardData.code.toUpperCase() : '';
            },
            set(value) {
                // Update giftcard.code with the uppercase value
                this.editGiftcardData.code = value.toUpperCase();
            }
        },
        formattedGiftcardCode: {
            get() {
                // Always return the value in uppercase
                return this.giftcardCode ? this.giftcardCode.toUpperCase() : '';
            },
            set(value) {
                // Update giftcard.code with the uppercase value
                this.giftcardCode = value.toUpperCase();
            }
        },

        totalPages() {
            return Math.ceil(this.giftcards.length / this.itemsPerPage);
        },
        visiblePages() {
            // Adjust the number of visible page links based on screen width
            const totalPages = this.totalPages;
            const currentPage = this.currentPage;
            const maxPagesToShow = window.innerWidth < 768 ? 3 : 5;

            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(totalPages, currentPage + Math.floor(maxPagesToShow / 2));

            // Adjust the start and end if they go out of bounds
            if (endPage - startPage + 1 < maxPagesToShow) {
                if (currentPage < totalPages / 2) {
                    endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                } else {
                    startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }
            }

            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
        }
    },
    methods: {
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const localDateDay = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
            const day = String(localDateDay.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        },
        resetForm() {
            // Reset form fields
            this.giftcard = {
                name: '',
                code: '',
                status: false,
                expiration: new Date(),
            };
            this.addExpiration = false;
        },
        paginate(data) {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return data.slice(start, end);
        },
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },

        // Fetch data
        async fetchGiftcards() {
            const giftcardRef = dbRef(db, 'Giftcards');
            try {
                const snapshot = await get(giftcardRef);

                if (snapshot.exists()) {
                    const giftcards = snapshot.val();

                    // Fetch affiliate data for each event
                    this.giftcards = await Promise.all(
                        Object.keys(giftcards).map(async (key) => {
                            const giftcard =
                            {
                                id: key,
                                ...giftcards[key],
                                expiration: new Date(giftcards[key].expiration).toISOString().split('T')[0],
                            };

                            return giftcard;
                        })
                    );
                } else {
                    this.giftcards = []; // No giftcards found
                }
            } catch (error) {
                console.error('Error fetching giftcards:', error);
            }
        },
        async fetchAffiliateAppliedGiftcards() {
            try {
                const giftcardsRef = dbRef(db, `Users/${this.userId}/appliedGiftcards`);
                const snapshot = await get(giftcardsRef);

                if (snapshot.exists()) {
                    const giftcardsData = snapshot.val();

                    // Fetch details for each applied gift card
                    const appliedGiftcards = await Promise.all(
                        Object.keys(giftcardsData).flatMap(gcId =>
                            Object.keys(giftcardsData[gcId]).map(async (clientId) => {
                                const gcDetails = giftcardsData[gcId][clientId];
                                const clientName = await this.fetchClientName(clientId); // Fetch client's name

                                // Fetch gift card details
                                const gcRef = dbRef(db, `Giftcards/${gcId}`);
                                const gcSnapshot = await get(gcRef);

                                if (gcSnapshot.exists()) {
                                    const giftcard = gcSnapshot.val();

                                    return {
                                        id: gcId,  // Gift card ID
                                        code: giftcard.code,  // Gift card code
                                        name: giftcard.name,  // Gift card name
                                        balance: giftcard.balance,
                                        expiration: giftcard.expiration,  // Expiration date
                                        date: gcDetails.date,  // Applied date
                                        clientName: clientName,  // Client's name
                                    };
                                } else {
                                    console.warn(`Gift card ${gcId} details not found`);
                                    return null;
                                }
                            })
                        )
                    );
                    this.appliedGiftcards = appliedGiftcards.filter(gc => gc !== null);
                    // Filter out any null entries (in case a gift card detail is missing)
                    // return appliedGiftcards.filter(gc => gc !== null);
                } else {
                    console.log('No applied giftcards found for the user');
                    return [];
                }
            } catch (error) {
                console.error('Error fetching applied giftcards:', error);
                return [];
            }
        },
        async fetchUnpaidGiftcards() {
            try {
                const giftcardsRef = dbRef(db, `Users/${this.userId}/appliedGiftcards`);
                const snapshot = await get(giftcardsRef);

                if (snapshot.exists()) {
                    const giftcardsData = snapshot.val();

                    // Fetch details for each applied gift card
                    const unpaidGiftcards = await Promise.all(
                        Object.keys(giftcardsData).flatMap(gcId =>
                            Object.keys(giftcardsData[gcId]).map(async (clientId) => {
                                const gcDetails = giftcardsData[gcId][clientId];
                                const clientName = await this.fetchClientName(clientId); // Fetch client's name

                                // Fetch gift card details
                                const gcRef = dbRef(db, `Giftcards/${gcId}`);
                                const gcSnapshot = await get(gcRef);

                                if (gcSnapshot.exists()) {
                                    const giftcard = gcSnapshot.val();

                                    if (!giftcard.paid) {
                                        return {
                                            id: gcId,  // Gift card ID
                                            code: giftcard.code,  // Gift card code
                                            name: giftcard.name,  // Gift card name
                                            balance: giftcard.balance,
                                            expiration: giftcard.expiration,  // Expiration date
                                            date: gcDetails.date,  // Applied date
                                            clientName: clientName,  // Client's name
                                        };
                                    } else {
                                        console.log(`No pending payment giftcards.`);
                                        return null;
                                    }

                                } else {
                                    console.warn(`Gift card ${gcId} details not found`);
                                    return null;
                                }
                            })
                        )
                    );
                    this.unpaidGiftcards = unpaidGiftcards.filter(gc => gc !== null);
                } else {
                    console.log('No unpaid giftcards found for the user');
                    return [];
                }
            } catch (error) {
                console.error('Error fetching unpaid coupons:', error);
                return [];
            }
        },
        async fetchClients() {
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(clientRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

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
        async fetchClientName(clientId) {
            try {
                const clientRef = dbRef(db, `Users/${clientId}`);
                const clientSnapshot = await get(clientRef);

                if (clientSnapshot.exists()) {
                    const clientData = clientSnapshot.val();
                    return `${clientData.firstName} ${clientData.lastName}`;
                } else {
                    return 'Unknown Client';
                }
            } catch (error) {
                console.error('Error fetching client name:', error);
                return 'Unknown Client';
            }
        },

        // actions
        async createGiftcard() {
            if (!this.giftcard.code || !this.giftcard.balance) {
                alert('Por favor, complete los campos obligatorios.');
                return;
            }

            try {
                this.isSubmitting = true;

                // Prepare the data for submission
                const data = {
                    code: this.giftcard.code,
                    balance: this.giftcard.balance,
                    status: this.giftcard.status,
                    paid: false,
                };
                if (this.giftcard.name) {
                    data.name = this.giftcard.name;
                }
                if (this.giftcard.expiration) {
                    data.expiration = new Date(this.giftcard.expiration).toISOString();
                }

                const giftcardRef = dbRef(db, 'Giftcards');
                const newGiftcardRef = push(giftcardRef);
                await set(newGiftcardRef, data);

                showToast('Giftcard creada!');

                //Reset form fields
                this.resetForm();
                await this.fetchGiftcards();
            } catch (error) {
                console.error("Error creating giftcard:", error);
            } finally {
                this.isSubmitting = false;
            }
        },
        async editGiftcard(giftcard) {
            this.editGiftcardData = giftcard;

            const modal = Modal.getOrCreateInstance(document.getElementById('editGiftcardModal'));
            modal.show();
        },
        async deleteGiftcard(giftcardId, index) {
            console.log(giftcardId);
            if (confirm("¿Desea borrar esta giftcard?")) {
                try {
                    const giftcardRef = dbRef(db, `Giftcards/${giftcardId}`);
                    await remove(giftcardRef);

                    // Remove the coupon from the local state
                    this.giftcards.splice(index, 1);

                    showToast('Giftcard eliminada!', {
                        style: {
                            background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
                        },
                    });
                } catch (error) {
                    console.error('Error deleting Giftcard:', error);
                    alert('La eliminación de la giftcard falló.');
                }
            }
        },
        async updateGiftcard(giftcardId) {
            const giftcardRef = dbRef(db, `Giftcards/${giftcardId}`);

            const updateData = {};

            if (this.editGiftcardData.name) {
                updateData.name = this.editGiftcardData.name;
            }
            if (this.editGiftcardData.code) {
                updateData.code = this.editGiftcardData.code;
            }
            if (this.editGiftcardData.balance) {
                updateData.balance = this.editGiftcardData.balance;
            }
            if (this.editGiftcardData.status) {
                updateData.status = this.editGiftcardData.status;
            }
            if (this.editGiftcardData.expiration) {
                updateData.expiration = new Date(this.editGiftcardData.expiration).toISOString();
            }
            if (!this.editGiftcardData.expiration) {
                updateData.expiration = null;
            }

            try {
                await update(giftcardRef, updateData);
                console.log("Giftcard updated successfully");

                // Success notification
                showToast('Giftcard actualizada con exito!');
                // Close the modal after saving
                const modal = Modal.getInstance(document.getElementById('editGiftcardModal'));
                modal.hide();
                await this.fetchGiftcards();
            } catch (error) {
                console.error("Error updating giftcard:", error);
            }
        },
        removeExpField() {
            this.editGiftcardData.expiration = null;
        },

        async payGiftcard(giftcardId) {
            if (confirm("¿Desea marcar esta giftcard como pagada?")) {
                if (!giftcardId) {
                    alert('Giftcard no existe.');
                    return;
                }

                const giftRef = dbRef(db, `Giftcards/${giftcardId}`);

                try {

                    await update(giftRef, { paid: true });
                    console.log("Giftcard marked as paid.");

                    // Success notification
                    showToast('Giftcard se marco como Pagada!');


                } catch (error) {
                    console.error('Error at marking this giftcard as paid.', error);
                }
            }
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
            console.log('Selected client:', client.id);
            this.searchClient = '';
            this.searchClientResults = [];
        },

        async applyGiftcard() {
            const client = this.selectedClient;
            const giftcards = this.giftcards;
            let selectedGiftcard = null;

            // Find the giftcard by its code
            giftcards.forEach(giftcard => {
                if (giftcard.code === this.giftcardCode) {
                    selectedGiftcard = giftcard;
                }
            });
            if (!selectedGiftcard) {
                alert('Código ingresado no existe.');
                return;
            }

            try {
                this.loading = true;

                // Alert if the coupon code was not entered
                if (!this.giftcardCode) {
                    alert('Ingrese un código válido.');
                    console.log('No giftcard code entered');
                    return;
                }

                // Check if the client has the coupon assigned
                if (!client) {
                    alert('El cliente debe estar registrado.');
                    return;
                }

                // Check if the gc has already been applied (client can apply only once)
                const appliedGcRef = dbRef(db, `Users/${this.userId}/appliedGiftcards`);
                const snapshot = await get(appliedGcRef);

                if (snapshot.exists()) {
                    const appliedGc = snapshot.val();

                    // Iterate through the entries of appliedGc to check for the selectedGiftcard and selectedClient
                    const gcAlreadyApplied = Object.keys(appliedGc).some(gcId => {
                        // Check if gcId matches selectedCoupon.id and client_id matches selectedClient.id
                        const gc = appliedGc[gcId];
                        return gcId === selectedGiftcard.id && gc.hasOwnProperty(client.id);
                    });


                    if (gcAlreadyApplied) {
                        console.error('Giftcard already applied by this client');
                        alert('El cliente ya usó esta giftcard.');
                        return;
                    }
                }

                // Apply the gc to the affiliate's 'appliedGiftcards' object                
                const newAppliedGiftcardRef = dbRef(db, `Users/${this.userId}/appliedGiftcards/${selectedGiftcard.id}/${client.id}`);
                await set(newAppliedGiftcardRef, {
                    date: new Date().toISOString(),
                });

                // Check if the giftcard was successfully added to 'appliedGiftcards'
                const checkAppliedCoupon = await get(newAppliedGiftcardRef);
                if (checkAppliedCoupon.exists()) {
                    showToast('Giftcard aplicada con éxito.');
                } else {
                    console.error('Failed to apply coupon');
                    alert('Error al aplicar la giftcard');
                }
                // Clear the input after applying
                this.giftcardCode = '';
                this.selectedClient = '';

            } catch (error) {
                console.error('Error applying giftcard:', error);
            } finally {
                this.loading = false;
            }
        },
    }
}
</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Giftcards
    </h2>

    <div v-if="this.role === 'admin'" class="container">
        <div class="d-flex justify-content-end align-items-center">
            <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#createGiftcardModal"
                style="margin: 14px;">
                <i class="fa fa-plus-circle fa-fw me-1"></i> Crear Giftcard
            </a>
        </div>

        <div class="container-fluid">
            <div class="row">
                <div v-if="giftcards.length === 0" class="d-flex justify-content-center align-items-center">
                    <div class="d-flex justify-content-center align-items-center">
                        <div class="text-center">
                            <div class="mb-3 mt-n5">
                                <i class="fa-solid fa-money-bill text-body text-opacity-25" style="font-size: 5em"></i>
                            </div>
                            <h5>No hay Giftcards registradas.</h5>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <div class="row">
                        <div v-for="(giftcard, index) in giftcards" :key="giftcard.id" class="col-12 col-md-6 mb-4">
                            <div class="card p-4 shadow-sm border-0 rounded-lg">
                                <!-- Edit and Delete Icons -->
                                <div class="d-flex justify-content-end">
                                    <button class="btn btn-sm btn-outline-info me-2" @click="editGiftcard(giftcard)"
                                        title="Edit Gift Card">
                                        <i class="fa-solid fa-pencil-alt"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger"
                                        @click="deleteGiftcard(giftcard.id, index)" title="Delete Gift Card">
                                        <i class="fa-solid fa-trash-alt"></i>
                                    </button>
                                </div>

                                <!-- Gift Card Content -->
                                <div class="d-flex flex-column align-items-start">
                                    <!-- Gift Card Name -->
                                    <h5 class="text-light fw-bold">{{ giftcard.name || 'Gift Card' }}</h5>

                                    <!-- Gift Card Code -->
                                    <div class="mt-2 d-flex align-items-center">
                                        <span class="badge bg-secondary text-dark p-2 fs-6 me-2">{{ giftcard.code
                                            }}</span>
                                        <small class="text-muted ms-2">Código</small>
                                    </div>

                                    <!-- Gift Card Balance -->
                                    <div class="mt-2 d-flex align-items-center">
                                        <span class="badge bg-secondary text-dark p-2 fs-6 me-2">${{ giftcard.balance
                                            }}</span>
                                        <small class="text-muted ms-2">Balance</small>
                                    </div>

                                    <!-- Expiration Date -->
                                    <div class="d-flex mt-3 align-items-center text-muted">
                                        <i class="far fa-calendar-alt text-primary me-2"></i>
                                        <span>Válido hasta: {{ formatDate(giftcard.expiration) || 'Ilimitado' }}</span>
                                    </div>
                                </div>
                                <!-- Paid button -->
                                <div v-if="!giftcard.paid" class="d-flex justify-content-end">
                                    <button class="btn btn-sm btn-outline-success me-2"
                                        @click="payGiftcard(giftcard.id)" title="Pay Gift Card">
                                        Marcar pagada
                                    </button>
                                </div>
                                <div v-else class="d-flex justify-content-end">
                                    <button disabled class="btn btn-sm btn-outline-success me-2">
                                        Pagada
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Pagination Controls -->
                <nav class="mt-4" v-if="totalPages > 1" aria-label="Page navigation">
                    <ul class="pagination justify-content-center flex-wrap">
                        <li class="page-item" :class="{ disabled: currentPage === 1 }">
                            <button class="page-link" @click="goToPage(currentPage - 1)"
                                :disabled="currentPage === 1">Anterior</button>
                        </li>
                        <li v-for="page in visiblePages" :key="page" class="page-item"
                            :class="{ active: page === currentPage }">
                            <button class="page-link" @click="goToPage(page)">{{ page }}</button>
                        </li>
                        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                            <button class="page-link" @click="goToPage(currentPage + 1)"
                                :disabled="currentPage === totalPages">Siguiente</button>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>

        <!-- Modals -->
        <!-- Create Giftcard Modal -->
        <div class="modal fade" id="createGiftcardModal" tabindex="-1" aria-labelledby="createGiftcardModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Nueva Giftcard</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                            @click="resetForm()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-6 mb-3">
                                <label class="form-label">Código <span class="text-danger">*</span></label>
                                <input v-model="formattedCode" type="text" class="form-control form-control-lg fs-15px"
                                    required />
                            </div>
                            <div class="col-6 mb-3">
                                <label for="giftcardBalance">Balance <span class="text-danger">*</span></label>
                                <div class="input-group mt-2">
                                    <span class="input-group-text text-wrap" id="quote-addon">$</span>
                                    <input id="giftcardBalance" type="number" class="form-control"
                                        v-model="giftcard.balance" aria-label="giftcardBalance"
                                        aria-describedby="quote-addon" required />
                                </div>
                            </div>
                            <div class="col-6 mb-3">
                                <label class="form-label">Nombre</label>
                                <input v-model="giftcard.name" type="text"
                                    class="form-control form-control-lg fs-15px" />
                            </div>
                            <div class="mb-3">
                                <div class="form-check mt-4">
                                    <input type="checkbox" class="form-check-input" id="giftcardexpiration"
                                        v-model="addExpiration" />
                                    <label class="form-check-label" for="giftcardexpiration">Agregar fecha de
                                        expiración</label>
                                </div>
                            </div>
                            <div v-if="addExpiration" class="col-6 mb-3">
                                <label class="form-label">Válido Hasta</label>
                                <input v-model="giftcard.expiration" type="date" class="form-control" />
                            </div>
                            <div class="mb-3">
                                <div class="form-check mt-4">
                                    <input type="checkbox" class="form-check-input" id="giftcardStatus"
                                        v-model="giftcard.status" />
                                    <label class="form-check-label" for="giftcardStatus">Activo</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
                            @click="resetForm()">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="createGiftcard()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Plan Modal -->
        <div class="modal fade" id="editGiftcardModal" tabindex="-1" aria-labelledby="editGiftcardModalLabel"
            aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editJobModalLabel">Editar Giftcard</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="col-6 mb-3">
                            <label class="form-label">Código <span class="text-danger">*</span></label>
                            <input v-model="formattedEditCode" type="text" class="form-control form-control-lg fs-15px"
                                required />
                        </div>
                        <div class="col-6 mb-3">
                            <label for="editGiftcardBalance">Balance <span class="text-danger">*</span></label>
                            <div class="input-group mt-2">
                                <span class="input-group-text text-wrap" id="editQuote-addon">$</span>
                                <input id="editGiftcardBalance" type="number" class="form-control"
                                    v-model="editGiftcardData.balance" aria-label="editGiftcardBalance"
                                    aria-describedby="quote-addon" required />
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <label class="form-label">Nombre</label>
                            <input v-model="editGiftcardData.name" type="text"
                                class="form-control form-control-lg fs-15px" />
                        </div>
                        <div class="col-6 mb-3">
                            <label class="form-label">Válido Hasta</label>
                            <div class="d-flex align-items-center">
                                <input v-model="editGiftcardData.expiration" type="date" class="form-control me-2" />

                                <button class="btn p-0 text-danger" @click="removeExpField" title="Remove Date">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="form-check mt-4">
                                <input type="checkbox" class="form-check-input" id="editGiftcardStatus"
                                    v-model="editGiftcardData.status" />
                                <label class="form-check-label" for="giftcardStatus">Activo</label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="updateGiftcard(editGiftcardData.id)">Guardar
                            cambios</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="this.role === 'afiliado'" class="container">
        <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><router-link to="/affiliate-portal">Portal de Afiliados</router-link></li>
                <li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
            </ol>
        </nav>

        <div class="row">
            <div class="mb-5">
                <div class="row justify-content-center mb-4">
                    <div class="col-12 col-md-6">
                        <div class="card custom-card h-100 shadow-sm border-0 rounded-lg">
                            <div class="card-body text-center py-4">
                                <h5 class="card-title mb-4 font-weight-bold text-primary">Código de Giftcard</h5>
                                <p class="card-text text-muted mb-4">Ingrese el código de la giftcard que desea aplicar.
                                </p>
                                <div class="input-group mb-4">
                                    <SearchInput v-model="searchClient" :results="searchClientResults"
                                        placeholder="Busque un cliente por su cédula..." @input="searchClients"
                                        @select="selectClient"
                                        class="form-control form-control-lg rounded-pill text-center" />
                                </div>
                                <!-- Display selected client information -->
                                <div v-if="selectedClient" class="mb-3 p-3 border rounded text-start">
                                    <h5>Información del cliente</h5>
                                    <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                                        selectedClient.lastName }}</p>
                                    <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                                </div>
                                <div class="input-group mb-4">
                                    <input type="text" class="form-control form-control-lg rounded-pill text-center"
                                        v-model="formattedGiftcardCode" placeholder="Código de giftcard" />
                                </div>
                                <button :disabled="loading"
                                    class="btn btn-secondary btn-lg rounded-pill px-5 shadow-sm mt-3"
                                    @click="applyGiftcard()">
                                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true"></span>
                                    <span v-else>Canjear</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <hr class="mt-5">

                <!-- Options -->
                <div class="mb-3 form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="giftcardOptions" id="inlineRadio1"
                        value="option1" v-model="selectedGiftcardOption" @click="fetchAffiliateAppliedGiftcards()">
                    <label class="form-check-label" for="inlineRadio1">Giftcards aplicadas</label>
                </div>
                <div class="mb-3 form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="giftcardOptions" id="inlineRadio2"
                        value="option2" v-model="selectedGiftcardOption" @click="fetchUnpaidGiftcards()">
                    <label class="form-check-label" for="inlineRadio2">Giftcards pendiente por Pago</label>
                </div>

                <!-- Option 1 = Applied giftcards -->
                <div v-if="selectedGiftcardOption === 'option1'" class="mt-3">
                    <div class="col-12 col-md-3" v-if="appliedGiftcards.length > 0" v-for="giftcard in appliedGiftcards"
                        :key="giftcard.id">
                        <div class="card mb-3 position-relative">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mb-3">
                                    <h6 class="card-title mb-0">{{ giftcard.name }}</h6>
                                </div>
                                <div class="card-title"><strong>Cliente: </strong>
                                    {{ giftcard.clientName }}
                                </div>
                                <hr>
                                <p class="card-text"><strong>Código:</strong> {{ giftcard.code }}</p>
                                <p class="card-text"><strong>Balance:</strong> ${{ giftcard.balance }}</p>
                                <p class="card-text"><strong>Aplicado el dia: </strong>{{ formatDate(giftcard.date)
                                    }}
                                </p>
                                <p class="card-text"><strong>Expiración:</strong> {{ formatDate(giftcard.expiration) }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p v-else>No hay giftcards aplicadas.</p>
                </div>

                <!-- Option 2 = Pending payment coupons -->
                <div v-if="selectedGiftcardOption === 'option2'" class="mt-3">
                    <div class="col-12 col-md-3" v-if="unpaidGiftcards.length > 0" v-for="giftcard in unpaidGiftcards"
                        :key="giftcard.id">
                        <div class="card mb-3 position-relative">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mb-3">
                                    <h6 class="card-title mb-0">{{ giftcard.name }}</h6>
                                </div>
                                <div class="card-title"><strong>Cliente: </strong>
                                    {{ giftcard.clientName }}
                                </div>
                                <hr>
                                <p class="card-text"><strong>Código:</strong> {{ giftcard.code }}</p>
                                <p class="card-text"><strong>Balance:</strong> ${{ giftcard.balance }}</p>
                                <p class="card-text"><strong>Aplicado el dia: </strong>{{ formatDate(giftcard.date) }}
                                </p>
                                <p class="card-text"><strong>Expiración:</strong> {{ formatDate(giftcard.expiration) }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p v-else>No hay giftcards pendientes por pago.</p>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
.btn-theme {
    background-color: purple;
    border-color: purple;
}

.card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
    transform: translateY(-3px);
    box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.1);
}

.badge {
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.5px;
}
</style>