<script>
import { db, storage, functions } from '../firebase/init';
import { ref as dbRef, update, get, query, orderByChild, equalTo, push, set, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import SearchInput from '@/components/app/SearchInput.vue';
import moment from 'moment';
import { Modal } from 'bootstrap';
import { useUserStore } from "@/stores/user-role";

export default {
    components: {
        SearchInput,
    },
    data() {
        return {
            role: null,
            userId: null,
            userName: null,

            clients: [],
            clientsSubscriptions: [],
            clientsNoSubscriptions: [],
            plans: [],

            searchQuery: '',
            searchClient: '',
            searchResults: [],
            selectedClient: null,
            selectedPlan: null,

            plan: {
                order: '',
                name: '',
                desc: '',
                price: 0,
                requestLimit: 0,
                icon: ''
            },
            editPlanData: {
                id: '',
                order: '',
                name: '',
                desc: '',
                price: 0,
                requestLimit: 0,
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

            currentPage: 1,
            itemsPerPage: 10,
            sortField: 'firstName',
            sortOrder: 'asc',

            paymentFile: null,
            paymentPreview: null,
            paymentDate: null,
            paymentUrl: null,
            isSubmitting: false,
            errorMessage: '',
            paymentModal: null
        };
    },
    computed: {
        sortedPlans() {
            return this.plans.sort((a, b) => {
                return a.order - b.order;
            });
        },
        formattedDesc() {
            return this.plans.map(plan => ({
                ...plan,
                desc: plan.desc
                    .split('.')
                    .filter(sentence => sentence.trim()) // Remove any empty sentences
                    .map(sentence => `<li>${sentence.trim()}</li>`) // Wrap sentences in <li>
                    .join('') // Join the list items
            }));
        },
        filteredClientsSubscriptions() {
            // Filter clients by search input
            const trimmedSearchQuery = this.searchQuery?.trim().toString().toLowerCase();
            let filteredClients = this.paginatedClientsSubscriptions;

            // Apply search filter
            if (trimmedSearchQuery) {
                filteredClients = filteredClients.filter(client => {
                    const identification = client.identification?.toString().toLowerCase() || '';
                    const firstName = client.firstName?.toLowerCase() || '';
                    const lastName = client.lastName?.toLowerCase() || '';

                    return (
                        identification.includes(trimmedSearchQuery) ||
                        firstName.includes(trimmedSearchQuery) ||
                        lastName.includes(trimmedSearchQuery)
                    );
                });
            }

            // Apply sorting
            return filteredClients.sort((a, b) => {
                let fieldA = a[this.sortField]?.toString().toLowerCase() || '';
                let fieldB = b[this.sortField]?.toString().toLowerCase() || '';

                if (this.sortOrder === 'asc') {
                    return fieldA > fieldB ? 1 : fieldA < fieldB ? -1 : 0;
                } else {
                    return fieldA < fieldB ? 1 : fieldA > fieldB ? -1 : 0;
                }
            });
        },
        filteredClientsNoSubscriptions() {
            // Filter clients by search input
            const trimmedSearchQuery = this.searchQuery?.trim().toString().toLowerCase();
            let filteredClients = this.paginatedClientsNoSubscriptions;

            // Apply search filter
            if (trimmedSearchQuery) {
                filteredClients = filteredClients.filter(client => {
                    const identification = client.identification?.toString().toLowerCase() || '';
                    const firstName = client.firstName?.toLowerCase() || '';
                    const lastName = client.lastName?.toLowerCase() || '';

                    return (
                        identification.includes(trimmedSearchQuery) ||
                        firstName.includes(trimmedSearchQuery) ||
                        lastName.includes(trimmedSearchQuery)
                    );
                });
            }

            // Apply sorting
            return filteredClients.sort((a, b) => {
                let fieldA = a[this.sortField]?.toString().toLowerCase() || '';
                let fieldB = b[this.sortField]?.toString().toLowerCase() || '';

                if (this.sortOrder === 'asc') {
                    return fieldA > fieldB ? 1 : fieldA < fieldB ? -1 : 0;
                } else {
                    return fieldA < fieldB ? 1 : fieldA > fieldB ? -1 : 0;
                }
            });
        },
        // Clients with subscriptions paginated
        paginatedClientsSubscriptions() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.clientsSubscriptions.slice(start, end);
        },
        // Clients without subscriptions paginated
        paginatedClientsNoSubscriptions() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.clientsNoSubscriptions.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.clients.length / this.itemsPerPage);
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
        async sendEmail(payload) {
            try {
                const sendEmailFunction = httpsCallable(functions, 'sendEmail');
                await sendEmailFunction(payload);
            } catch (error) {
                console.error('Error sending email:', error);
            }
        },
        async sendNotificationEmail(emailPayload) {
            try {
                await this.sendEmail(emailPayload);
            } catch (error) {
                console.error('Error sending email:', error);
            }
        },


        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },

        async createPlan() {
            try {
                const data = {
                    order: this.plan.order,
                    name: this.plan.name,
                    desc: this.plan.desc,
                    price: this.plan.price,
                    requestLimit: this.plan.requestLimit || null,
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
                this.plan.requestLimit = 0;
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
                requestLimit: this.editPlanData.requestLimit || null,
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
                    // Loop through each client to fetch their subscription data
                    for (const client of this.clients) {
                        // Check if the client has a subscription object with a subscription_id
                        if (client.subscription && client.subscription.subscription_id) {
                            const subscriptionId = client.subscription.subscription_id;
                            const subscriptionRef = dbRef(db, `Suscriptions/${subscriptionId}`);
                            const subscriptionSnapshot = await get(subscriptionRef);

                            if (subscriptionSnapshot.exists()) {
                                // Add subscription name to client data
                                client.subscriptionName = subscriptionSnapshot.val().name || "Suscripción desconocida";
                            } else {
                                console.log(`Subscription with ID ${subscriptionId} not found.`);
                                client.subscriptionName = "Suscripción desconocida";
                            }
                        } else {
                            client.subscriptionName = "Sin suscripción";
                        }
                    }

                    this.clientsSubscriptions = this.clients.filter((client) => client.subscription);
                    this.clientsNoSubscriptions = this.clients.filter((client) => !client.subscription);
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
                this.searchResultsSubscriptions = [];
                this.searchResultsNoSubscriptions = [];
                return;
            }

            const searchInput = this.searchClient.toLowerCase();

            // Search in ALL clients
            this.searchResults = this.clients.filter(client => {
                // Ensure client.identification and other fields are strings
                const identification = (client.identification || '').toString().toLowerCase();
                const name = (client.firstName + ' ' + client.lastName).toLowerCase();

                return identification.includes(searchInput) || name.includes(searchInput);
            });
            // Search in clients with subscriptions
            this.searchResultsSubscriptions = this.clientsSubscriptions.filter(client => {
                const identification = (client.identification || '').toString().toLowerCase();
                const name = (client.firstName + ' ' + client.lastName).toLowerCase();
                return identification.includes(searchInput) || name.includes(searchInput);
            });

            // Search in clients without subscriptions
            this.searchResultsNoSubscriptions = this.clientsNoSubscriptions.filter(client => {
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

        openAssignModal(client) {
            this.selectedClient = client;
            this.searchClient = '';
            this.searchResults = [];

            // Open the modal by triggering the Bootstrap modal show method
            const assignModal = new Modal(document.getElementById('assignModal'));
            assignModal.show();
        },

        // Admin can assign a subscription
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

            // Find the selected client's data from the clients array
            const client = this.clients.find(client => client.id === clientId);

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
                subscription_id: selectedPlanDetails.id,
                status: true, // Set the default status as true 'active'
                payDay: payDay,
                isPaid: false, // Set the default as unpaid
            };

            try {
                // Assign the subscription details to the client's data in Firebase
                const userPlanRef = dbRef(db, `Users/${clientId}/subscription`);
                await update(userPlanRef, subscriptionData);

                // Notify Client
                const appUrl = 'https://app.rosecoupon.com';
                const clientEmailPayload = {
                    to: client.email,
                    message: {
                        subject: `Suscripción ${selectedPlanDetails.name.toUpperCase()} activada`,
                        text: `Hola ${client.firstName}, se le ha activado la Suscripción ${selectedPlanDetails.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
                        html: `<p>Hola ${client.firstName}, se le ha activado la Suscripción ${suscription.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`
                    },
                };
                await this.sendNotificationEmail(clientEmailPayload);

                // Notify Admin
                const adminEmailPayload = {
                    to: 'joselinq38@gmail.com',
                    message: {
                        subject: `Nuevo cliente suscrito al Plan ${selectedPlanDetails.name.toUpperCase()}`,
                        text: `Un nuevo cliente, ${client.firstName} ${client.lastName}, se ha suscrito al plan ${selectedPlanDetails.name.toUpperCase()}.`,
                        html: `<p>Un nuevo cliente, ${client.firstName} ${client.lastName}, se ha suscrito al plan ${selectedPlanDetails.name.toUpperCase()}.</p>`
                    },
                };
                await this.sendNotificationEmail(adminEmailPayload);

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
        // Clients can contract a subscription
        async contractPlan(plan) {
            if (confirm(`¿Seguro que desea cambiar su suscripción a ${plan.name.toUpperCase()}?`)) {
                const clientId = this.userId;
                this.selectedPlan = plan;

                if (!this.userId) {
                    alert('Usuario no identificado.');
                    return;
                }

                if (!this.selectedPlan) {
                    alert('Por favor seleccione una suscripción antes de contratar.');
                    return;
                }

                // Find the selected client's data from the clients array
                const client = this.clients.find(client => client.id === clientId);

                // Find the selected plan object from the plans array
                const selectedPlanDetails = this.plans.find(plan => plan.name === this.selectedPlan.name);

                // Calculate payDay (one month from today)
                const payDay = moment().add(1, 'month').toISOString();

                if (!selectedPlanDetails) {
                    alert('Error al seleccionar el plan. Por favor, intente de nuevo.');
                    return;
                }

                // Prepare subscription details
                const subscriptionData = {
                    subscription_id: selectedPlanDetails.id,
                    status: true, // Set the default status as true 'active'
                    payDay: payDay,
                };

                // Proceed to open modal with Payment methods and payment upload
                if (plan.price === 0) {
                    try {
                        // Assign the subscription details to the client's data in Firebase
                        const userPlanRef = dbRef(db, `Users/${clientId}/subscription`);
                        await update(userPlanRef, subscriptionData);

                        // Notify client
                        const appUrl = 'https://app.rosecoupon.com';
                        const clientEmailPayload = {
                            to: client.email,
                            message: {
                                subject: `Suscripción ${plan.name.toUpperCase()} activada`,
                                text: `Hola ${client.firstName}, se le ha activado la Suscripción ${plan.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
                                html: `<p>Hola ${client.firstName}, se le ha activado la Suscripción ${plan.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`
                            },
                        };
                        await this.sendNotificationEmail(clientEmailPayload);

                        // Notify Admin
                        const adminEmailPayload = {
                            to: 'joselinq38@gmail.com',
                            message: {
                                subject: `Nuevo cliente suscrito al Plan ${selectedPlanDetails.name.toUpperCase()}`,
                                text: `Un nuevo cliente, ${client.firstName} ${client.lastName}, se ha suscrito al plan ${selectedPlanDetails.name.toUpperCase()}.`,
                                html: `<p>Un nuevo cliente, ${client.firstName} ${client.lastName}, se ha suscrito al plan ${selectedPlanDetails.name.toUpperCase()}.</p>`
                            },
                        };
                        await this.sendNotificationEmail(adminEmailPayload);

                        this.showToast('Suscripción asignada con éxito!');
                        // Reset selection after assigning the plan
                        this.selectedPlan = null;
                        // Redirect to Client Panel
                        this.$router.push('/client-portal');
                    } catch (error) {
                        console.error('Error assigning plan:', error);
                        alert('La asignación de la suscripción falló.');
                    }
                } else {
                    this.openPaymentModal(plan)
                }
            }
        },
        openPaymentModal(plan) {
            this.selectedPlan = plan;

            const paymentModal = Modal.getOrCreateInstance(document.getElementById('notifyPaymentModal'));
            paymentModal.show();
        },
        async notifyPayment(plan) {
            if (!this.paymentFile) {
                this.errorMessage = 'El archivo es requerido.';
                return;
            }

            try {
                this.isSubmitting = true;
                const clientId = this.userId;

                // Upload capture
                const paymentUrl = await this.uploadPaymentFile(this.paymentFile, this.paymentDate);
                console.log('File uploaded successfully:', paymentUrl);

                // Calculate payDay (one month from today)
                const payDay = moment().add(1, 'month').toISOString();

                // Get the current date to set the paymentDate
                const uploadPaymentDate = new Date(this.paymentDate);
                const formattedDate = uploadPaymentDate.toISOString();

                // Prepare subscription details
                const subscriptionData = {
                    subscription_id: plan.id,
                    status: true, // Set the default status as true 'active'
                    payDay: payDay,
                    isPaid: false, // Set the default as unpaid
                    paymentUploaded: true,
                    lastPaymentDate: formattedDate
                };

                // Find the client's data from the clients array
                const client = this.clients.find(client => client.id === clientId);

                // Update user to set field user.requestedVerification = true
                const userRef = dbRef(db, `Users/${this.userId}/subscription`);
                await update(userRef, subscriptionData);

                // Notify client
                const appUrl = 'https://app.rosecoupon.com';
                const clientEmailPayload = {
                    to: client.email,
                    message: {
                        subject: `Suscripción ${plan.name.toUpperCase()} activada`,
                        text: `Hola ${client.firstName}, se le ha activado la Suscripción ${plan.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
                        html: `<p>Hola ${client.firstName}, se le ha activado la Suscripción ${plan.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`
                    },
                };
                await this.sendNotificationEmail(clientEmailPayload);

                // Notify Admin
                const adminEmailPayload = {
                    to: 'joselinq38@gmail.com',
                    message: {
                        subject: `Nuevo cliente suscrito al Plan ${plan.name.toUpperCase()}`,
                        text: `Un nuevo cliente, ${client.firstName} ${client.lastName}, se ha suscrito al plan ${plan.name.toUpperCase()}.`,
                        html: `<p>Un nuevo cliente, ${client.firstName} ${client.lastName}, se ha suscrito al plan ${plan.name.toUpperCase()}.</p>`
                    },
                };
                await this.sendNotificationEmail(adminEmailPayload);

                //Success toast
                this.showToast('Archivo subido!');

                //reset the image previews
                this.paymentPreview = null;

                // Hide the modal after submission
                const paymentModal = Modal.getOrCreateInstance(document.getElementById('notifyPaymentModal'));
                paymentModal.hide();

                // Redirect to Client Panel
                this.$router.push('/client-portal');

            } catch (error) {
                console.error('Error during uploading:', error);
                this.errorMessage = 'Error al subir el archivo, por favor intente nuevamente.';
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        async uploadPaymentFile(file, date) {
            // Define storage reference for front or back ID file
            const fileName = `${date}-capture.${file.name.split('.').pop()}`;
            const fileRef = storageRef(storage, `payment-captures/${this.userId}-${this.userName}/${fileName}`);

            // Upload the file and get the download URL
            await uploadBytes(fileRef, file);
            return getDownloadURL(fileRef);
        },

        toggleInputIcon() {
            this.inputIcon = true;
        },
        selectIcon(icon) {
            this.plan.icon = icon.value;
            this.selectedIconLabel = icon.label;
        },
        sortClients(field) {
            if (this.sortField === field) {
                // Toggle sort order if already sorted by this field
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                // Otherwise, set the field and default to ascending order
                this.sortField = field;
                this.sortOrder = 'asc';
            }
        },
        resetModalData() {
            this.selectedClient = null;
            this.selectedPlan = null;
        },
        deselectClient() {
            this.selectedClient = null;
            console.log('Selected client: none');
        },
        copyToClipboard(text) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    this.showToast('Texto copiado!');
                })
                .catch(err => {
                    this.showToast.error('Error: ', err);
                });
        },
        //File uploads
        handleFileUpload(event, type) {
            const file = event.target.files[0];
            if (!file) return;

            // Update the correct file and preview based on the side
            if (type === 'payment') {
                this.paymentFile = file;
                this.paymentPreview = URL.createObjectURL(file);
            }
        },
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;
        this.userName = userStore.userName;

        await this.fetchClients();
        await this.fetchPlans();
    },
};
</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Suscripciones
    </h2>

    <div v-if="this.role === 'admin'" class="container">
        <!-- Button -->
        <div class="d-flex justify-content-end align-items-center">
            <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#createPlan" style="margin: 14px;">
                <i class="fa fa-plus-circle fa-fw me-1"></i> Crear Plan
            </a>
            <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#assignModal"
                style="margin: 14px;">
                <i class="fa fa-circle-check fa-fw me-1"></i> Asignar Plan
            </a>
        </div>

        <!-- Tabs -->
        <div>
            <ul class="nav nav-tabs nav-fill">
                <li class="nav-item">
                    <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#subscriptions">
                        Clientes con Suscripción
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#noSubscriptions">
                        Clientes sin Suscripción
                    </a>
                </li>
            </ul>
        </div>

        <!-- Clients -->
        <div class="tab-content">
            <!-- with subscriptions -->
            <div class="tab-pane fade h-100 show active" id="subscriptions">
                <div class="container mt-4">
                    <input v-model="searchQuery" placeholder="Filtrar cliente por nombre o cédula..."
                        class="form-control mb-3" />
                    <table class="table text-center table-responsive">
                        <thead>
                            <tr>
                                <th scope="col">Cliente</th>
                                <th scope="col">Cédula</th>
                                <th scope="col">Suscripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="client in filteredClientsSubscriptions" :key="client.id">
                                <td>{{ client.firstName + ' ' + client.lastName }}</td>
                                <td>{{ client.identification }}</td>
                                <td>
                                    <span v-if="client.subscription" class="badge bg-success">
                                        {{ client.subscriptionName.charAt(0).toUpperCase() +
                                            client.subscriptionName.slice(1) }}
                                    </span>
                                    <span v-else class="badge bg-danger">
                                        Sin suscripción
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!-- Pagination Controls -->
                    <nav class="mt-4" v-if="totalPages > 1" aria-label="Page navigation">
                        <ul class="pagination justify-content-center">
                            <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                <button class="page-link" @click="goToPage(currentPage - 1)"
                                    :disabled="currentPage === 1">Anterior</button>
                            </li>
                            <li class="page-item" v-for="page in totalPages" :key="page"
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
            <!-- without subscriptions -->
            <div class="tab-pane fade h-100" id="noSubscriptions">
                <div class="container mt-4">
                    <input v-model="searchQuery" placeholder="Filtrar cliente por nombre o cédula..."
                        class="form-control mb-3" />
                    <table class="table text-center table-responsive">
                        <thead>
                            <tr>
                                <th scope="col">Cliente</th>
                                <th scope="col">Cédula</th>
                                <th scope="col">Suscripción</th>
                                <th scope="col">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="client in filteredClientsNoSubscriptions" :key="client.id">
                                <td>{{ client.firstName + ' ' + client.lastName }}</td>
                                <td>{{ client.identification }}</td>
                                <td>
                                    <span v-if="client.subscription" class="badge bg-success">
                                        {{ client.subscriptionName.charAt(0).toUpperCase() +
                                            client.subscriptionName.slice(1) }}
                                    </span>
                                    <span v-else class="badge bg-danger">
                                        Sin suscripción
                                    </span>
                                </td>
                                <td>
                                    <button v-if="!client.subscription" class="btn btn-outline-success"
                                        @click.prevent="openAssignModal(client)">
                                        Asignar suscripción
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!-- Pagination Controls -->
                    <nav class="mt-4" v-if="totalPages > 1" aria-label="Page navigation">
                        <ul class="pagination justify-content-center">
                            <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                <button class="page-link" @click="goToPage(currentPage - 1)"
                                    :disabled="currentPage === 1">Anterior</button>
                            </li>
                            <li class="page-item" v-for="page in totalPages" :key="page"
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
                            <input v-model="plan.order" type="number" class="form-control form-control-lg fs-15px"
                                value="" required />
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
                            <input v-model="plan.price" type="number" class="form-control form-control-lg fs-15px"
                                value="" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Número de Solicitudes de Cupones <span
                                    class="text-danger">*</span></label>
                            <input v-model="plan.requestLimit" type="number"
                                class="form-control form-control-lg fs-15px" value="" />
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
                                <label class="form-check-label" for="uploadImageCheckbox">Ingresar código de
                                    Icono</label>
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
        <div class="modal fade" id="editPlanModal" tabindex="-1" aria-labelledby="editPlanModalLabel"
            aria-hidden="true">
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
                            <label class="form-label">Número de Solicitudes de Cupones</label>
                            <input v-model="editPlanData.requestLimit" type="number" class="form-control" />
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
        <!-- Open assign subscription to client -->
        <div class="modal fade" id="assignModal" tabindex="-1" aria-labelledby="assignModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Asignar Suscripción</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                            @click="resetModalData()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="p-3 bg-body" style="border-radius: 10px;">
                            <div class="search-box mb-3">
                                <!-- Search client bar -->
                                <SearchInput v-model="searchClient" :results="searchResults"
                                    placeholder="Filtrar cliente por nombre o cédula..." @input="searchClients"
                                    @select="selectClient" class="form-control" />
                                <button v-if="selectedClient" class="btn btn-danger mt-3" style="margin: 5px;"
                                    @click.prevent="deselectClient">
                                    {{ selectedClient.firstName + ' ' + selectedClient.lastName }}
                                    <i class="fa fa-times fa-sm"></i>
                                </button>
                            </div>

                            <!-- Selected Client info section -->
                            <div v-if="selectedClient" class="mb-3 p-3 border rounded">
                                <h5>Información del cliente seleccionado</h5>
                                <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' + selectedClient.lastName
                                    }}
                                </p>
                                <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                                <p><strong>Email:</strong> {{ selectedClient.email }}</p>
                                <p><strong>Teléfono:</strong> {{ selectedClient.phoneNumber }}</p>
                            </div>

                            <!-- Subscription Plan Selection -->
                            <div class="mt-4 mb-3 text-center">
                                <h5 class="mb-4">Seleccione una suscripción</h5>
                                <div class="row justify-content-center">
                                    <!-- Loop through the plans array and display buttons for each plan -->
                                    <div v-for="(plan, index) in sortedPlans" :key="plan.id"
                                        class="col-12 col-sm-12 col-md-6 col-lg-3 mb-4 d-flex flex-column align-items-center">
                                        <!-- Plan Button (bigger) -->
                                        <button @click="selectPlan(plan.name)"
                                            :class="{ 'selected': selectedPlan === plan.name }"
                                            class="btn plan-button-big text-uppercase">
                                            <i :class="plan.icon"></i><br>
                                            {{ plan.name }}
                                            <!-- Edit and Delete Icons -->
                                            <div class="d-flex justify-content-center mt-2 ">
                                                <button class="btn btn-sm btn-outline-info me-1"
                                                    @click="editPlan(plan)">
                                                    <i class="fa-solid fa-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger"
                                                    @click="deletePlan(plan.id, index)">
                                                    <i class="fa-solid fa-trash"></i>
                                                </button>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
                            @click="resetModalData()">Close</button>
                        <button type="button" class="btn btn-theme" @click="assignClientPlan()">Asignar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="this.role === 'cliente' || this.role === 'afiliado'" class="container">

        <!-- Lista de suscripciones -->
        <div class="container-fluid my-4 fade-in" style="padding: 20px;" id="price-table">
            <div class="row g-4 justify-content-center">
                <div v-for="(plan, index) in sortedPlans" :key="plan.id" class="col-md-3">
                    <div :class="['card h-100 text-center py-4 d-flex flex-column justify-content-between', {
                        'border-primary': plan.name === 'plata',
                        'shadow-sm': true,
                    }]" :style="plan.name === 'plata' ?
                        'background-color: #b800c2; border-radius: 0.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); transition: transform 0.3s;'
                        : ''">
                        <div v-if="plan.name === 'plata'" class="ribbon">
                            <span>Popular</span>
                        </div>

                        <i class="fa-lg" :class="plan.icon"></i>
                        <h4 class="my-4 text-primary">{{ plan.name.toUpperCase() }}</h4>
                        <p class="fw-bold display-5">${{ plan.price }} <small>/ MO.</small></p>

                        <div class="description mb-4" style="min-height: 120px;">
                            <p class="form-label" v-html="formattedDesc[index].desc"></p>
                        </div>

                        <div class="mt-auto">
                            <button class="btn btn-theme mt-3 w-50" @click.prevent="contractPlan(plan)">
                                Seleccionar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for Payment upload -->
        <div class="modal fade" id="notifyPaymentModal" tabindex="-1" aria-labelledby="notifyPaymentModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="notifyPaymentModalLabel">Subir Captura de Pago</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <h3 v-if="selectedPlan" class="mb-3">
                            <i :class="selectedPlan.icon"></i>
                            {{ selectedPlan.name.toUpperCase() }}
                        </h3>

                        <!-- Metodos de pago -->
                        <div class="card">
                            <h4 class="text-center">Métodos de Pago</h4>
                            <h6><u>Pago Móvil</u></h6>
                            <div class="card-text">
                                <strong>Banco: </strong>Banco de Venezuela
                            </div>
                            <div class="card-text">
                                <strong>Teléfono: </strong>04122204114
                                <button class="btn btn-sm btn-secondary ms-2" @click="copyToClipboard('04122204114')">
                                    <i class="fa fa-copy"></i>
                                </button>
                            </div>
                            <div class="card-text">
                                <strong>Cédula: </strong>26522446
                                <button class="btn btn-sm btn-secondary ms-2" @click="copyToClipboard('26522446')">
                                    <i class="fa fa-copy"></i>
                                </button>
                            </div>
                        </div>

                        <form class="mt-3" @submit.prevent="notifyPayment">
                            <div class="mb-3">
                                <label for="paymentDate" class="form-label">Fecha de Pago</label>
                                <input type="date" class="form-control" v-model="paymentDate" style="width: auto;">
                            </div>
                            <div class="mb-3">
                                <label for="payment" class="form-label">Captura de Pago</label>
                                <input type="file" class="form-control" id="payment"
                                    @change="handleFileUpload($event, 'payment')" required>
                                <img v-if="paymentPreview" :src="paymentPreview" alt="payment preview"
                                    class="img-fluid mt-2" />
                            </div>

                            <!-- Error Message -->
                            <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

                            <!-- Loader Spinner -->
                            <div v-if="isSubmitting" class="d-flex justify-content-center my-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cerrar</button>
                            <!-- Submit Button is disabled during submission -->
                            <button type="submit" class="btn btn-theme" :disabled="isSubmitting"
                                @click.prevent="notifyPayment(selectedPlan)">
                                Subir
                            </button>
                        </form>
                    </div>
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

#price-table {
    background: linear-gradient(135deg, #000000, #6d2c92);
}

.container-fluid {
    display: flex;
}

.card {
    padding: 15px;
    border-radius: 10px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.ribbon {
    position: absolute;
    top: 10px;
    right: -10px;
    background: #007bff;
    color: #fff;
    padding: 5px 15px;
    font-size: 0.875rem;
    font-weight: bold;
    transform: rotate(45deg);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Vertically center content in table cells */
table th,
table td {
    vertical-align: middle;
}

/* Optional: Styling to make table responsive */
.table-responsive {
    overflow-x: auto;
}

/* Badge and button adjustments */
.badge {
    font-size: 0.9rem;
    padding: 0.5rem;
}

button {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
}
</style>