<script>
import { ref as dbRef, query, orderByChild, equalTo, get, push, set, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, functions } from '@/firebase/init';
import { httpsCallable } from 'firebase/functions';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import * as XLSX from 'xlsx';
import moment from 'moment';
import venezuela from 'venezuela';

export default {
    data() {
        return {
            client: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
            },
            selectedClient: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
                state: '',
                municipio: '',
                parroquia: ''
            },

            venezuelanStates: [
                "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas",
                "Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital",
                "Falcón", "Guárico", "Lara", "Mérida", "Miranda",
                "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira",
                "Trujillo", "Vargas", "Yaracuy", "Zulia"
            ],
            municipios: [],
            parroquias: [],

            clients: [],
            clientCoupons: [],
            clientPreferences: [],
            currentEditing: null,
            searchQuery: null,
            modalImageUrl: '',
            paymentUrl: null,
            isSubmitting: false,
            loading: false,

            currentPage: 1,
            itemsPerPage: 10,
            paymentClient: ''
        }
    },
    async created() {
        await this.fetchClients();
    },
    computed: {
        filteredUsers() {
            // Filter clients by search input
            const trimmedSearchQuery = this.searchQuery?.trim().toString().toLowerCase();
            if (!trimmedSearchQuery) {
                return this.clients;
            }
            return this.clients.filter(client => {
                const identification = client.identification?.toString().toLowerCase() || '';
                const firstName = client.firstName?.toLowerCase() || '';
                const lastName = client.lastName?.toLowerCase() || '';

                return (
                    identification.includes(trimmedSearchQuery) ||
                    firstName.includes(trimmedSearchQuery) ||
                    lastName.includes(trimmedSearchQuery)
                );
            });
        },
        paginatedFilteredUsers() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.filteredUsers.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
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
        displayMunicipios(state) {
            const z = venezuela.estado(state, { municipios: true });
            const munis = z.municipios;
            if (munis) {
                this.municipios = munis;
            }
        },
        displayParroquias(municipio) {
            const y = venezuela.municipio(municipio, { parroquias: true });
            this.parroquias = y.parroquias;
        },

        async fetchClients() {
            this.loading = true;
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(clientRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Create an array to hold clients and their creation timestamps
                    const clientsWithTimestamp = [];
                    const getUserDetails = httpsCallable(functions, 'getUserDetails');

                    // Fetch authentication details for each user
                    for (const [uid, user] of Object.entries(users)) {
                        // Call Cloud Function to get user details
                        const authUser = await getUserDetails(uid);

                        // Push the user along with the creation timestamp
                        clientsWithTimestamp.push({
                            uid,
                            ...user,
                            createdAt: authUser.data.creationTime // Use the creationTime from the function
                        });
                    }

                    // Sort clients by createdAt in descending order
                    this.clients = clientsWithTimestamp.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    this.clientCoupons = {};
                    this.clientPreferences = {};

                    // Fetch coupons, subscriptions and Preferences for each client
                    for (const client of this.clients) {

                        // Initialize the coupons array for each client
                        this.clientCoupons[client.uid] = [];

                        // Fetch coupons for the client
                        const couponsRef = dbRef(db, `Users/${client.uid}/coupons`);
                        const couponsSnapshot = await get(couponsRef);

                        if (couponsSnapshot.exists()) {
                            const couponIds = couponsSnapshot.val(); // Coupon IDs

                            // Check if Object.keys(couponIds) contains any keys
                            const couponIdKeys = Object.keys(couponIds);

                            // Fetch the details for each coupon ID from the Coupons table
                            for (const couponId of couponIdKeys) {

                                const couponRef = dbRef(db, `Coupons/${couponId}`);
                                const couponDetailsSnapshot = await get(couponRef);

                                if (couponDetailsSnapshot.exists()) {
                                    const details = couponDetailsSnapshot.val();
                                    // Add the actual coupon details to the client's coupons
                                    this.clientCoupons[client.uid].push({ id: couponId, ...couponDetailsSnapshot.val() });
                                }
                            }
                        } else {
                            this.clientCoupons[client.uid] = []; // If no coupons, set an empty array
                        }

                        // Fetch subscription details for the client
                        const subscriptionRef = dbRef(db, `Users/${client.uid}/subscription`);
                        const subscriptionSnapshot = await get(subscriptionRef);

                        if (subscriptionSnapshot.exists()) {
                            client.subscription = subscriptionSnapshot.val();
                            const subscriptionId = client.subscription.subscription_id;

                            // Query the Suscriptions table to fetch the details
                            const subscriptionDataRef = dbRef(db, `Suscriptions/${subscriptionId}`);
                            const userSuscriptionSnapshot = await get(subscriptionDataRef);

                            if (userSuscriptionSnapshot.exists()) {
                                const userSubscription = userSuscriptionSnapshot.val();
                                // Merge the userSubscription into the client's subscription object
                                client.subscription = {
                                    ...client.subscription,
                                    ...userSubscription
                                };
                                if (client.subscription.lastPaymentDate) {
                                    // In case the client made a payment
                                    const paymentDate = (client.subscription.lastPaymentDate).split('T')[0];
                                    this.fetchPaymentFiles(client, paymentDate);
                                }
                            }
                        } else {
                            // Set a default empty subscription if none exist
                            client.subscription = null;
                        }

                        // Initialize the preferences array for each client
                        this.clientPreferences[client.uid] = {};

                        // Fetch preferences for the client
                        const preferencesRef = dbRef(db, `Users/${client.uid}/preferences`);
                        const prefSnapshot = await get(preferencesRef);

                        if (prefSnapshot.exists()) {
                            const preferences = prefSnapshot.val();

                            // Fetch categories for the selectedCategories
                            if (preferences.selectedCategories) {
                                const selectedCategories = preferences.selectedCategories;

                                // Initialize each category in clientPreferences
                                for (const categoryId of selectedCategories) {
                                    const categoryRef = dbRef(db, `Affiliate_categories/${categoryId}`);
                                    const categoryDetailsSnapshot = await get(categoryRef);

                                    if (categoryDetailsSnapshot.exists()) {
                                        const categoryDetails = categoryDetailsSnapshot.val();
                                        // Store the category details in clientPreferences
                                        this.clientPreferences[client.uid][categoryId] = {
                                            category: categoryDetails.name,
                                            subcategories: [] // Initialize subcategories
                                        };
                                    }
                                }
                            }

                            // Fetch subcategories for the selectedSubcategories
                            if (preferences.selectedSubcategories) {
                                const selectedSubcategories = preferences.selectedSubcategories;

                                for (const subcategoryId of selectedSubcategories) {
                                    const subcategoryRef = dbRef(db, `Affiliate_subcategories/${subcategoryId}`);
                                    const subcategoryDetailsSnapshot = await get(subcategoryRef);

                                    if (subcategoryDetailsSnapshot.exists()) {
                                        const subcategoryDetails = subcategoryDetailsSnapshot.val();
                                        // Find the category to add the subcategory to
                                        for (const categoryId in this.clientPreferences[client.uid]) {
                                            // Assuming subcategory is related to its category
                                            if (subcategoryDetails.category_id === categoryId) {
                                                this.clientPreferences[client.uid][categoryId].subcategories.push(subcategoryDetails.name);
                                                break; // Break after adding to the correct category
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            this.clientPreferences[client.uid] = {};
                        }
                    }
                } else {
                    this.clients = [];
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.clients = [];
            } finally {
                this.loading = false;
            }
        },
        async fetchIdFiles(client) {
            try {
                // Fetch verification files data from the user's collection in the Realtime Database
                const userRef = dbRef(db, `Users/${client.uid}/verificationFiles`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    const verificationFiles = snapshot.val();

                    // Set the URLs for front and back ID images if they exist
                    client.idFrontUrl = verificationFiles['Front-ID'] || null;
                    client.idBackUrl = verificationFiles['Back-ID'] || null;
                    client.selfieUrl = verificationFiles['Selfie'] || null;

                    console.log('Verification files fetched:', verificationFiles);
                } else {
                    console.warn(`No verification files found for ${client.uid}`);
                }
            } catch (error) {
                console.error('Error fetching ID files:', error.message || error);
            }
        },
        async fetchPaymentFiles(client, date) {
            try {
                const userName = `${client.firstName} ${client.lastName}`;
                const fileName = `${date}-capture.png`;

                // Reference to the storage file
                const fileRef = storageRef(storage, `payment-captures/${client.uid}-${userName}/${fileName}`);

                // Get the download URL for the payment file
                const paymentUrl = await getDownloadURL(fileRef);

                // Assign the URL to the client object if it exists
                client.paymentUrl = paymentUrl || null;
                console.log('Payment file fetched:', paymentUrl);
            } catch (error) {
                console.error('Error fetching payment file:', error.message || error);
                client.paymentUrl = null;
            }
        },
        openPaymentModal(client) {
            this.paymentClient = client;
            // Ensure paymentClient and subscription data are available before showing the modal

            const modal = new Modal(document.getElementById('validateModal'));

            modal.show();
        },
        async createClient() {
            if (!this.client.firstName || !this.client.lastName || !this.client.identification || !this.client.email) {
                alert('Por favor, complete todos los campos obligatorios: Nombre, Apellido, cedula o email.');
                return;
            }

            try {
                this.isSubmitting = true;

                const userData = {
                    firstName: this.client.firstName,
                    lastName: this.client.lastName,
                    identification: this.client.identification,
                    email: this.client.email,
                    role: 'cliente',
                };

                if (this.client.phoneNumber) {
                    userData.phoneNumber = this.client.phoneNumber;
                }

                // Call Cloud Function to create the client
                const createClientFunction = httpsCallable(functions, 'createUser');
                const response = await createClientFunction({ userData });

                if (response.data.success) {
                    Toastify({
                        text: "Nuevo Cliente registrado con exito! Se ha enviado la contraseña al correo.",
                        duration: 3000,
                        close: true,
                        gravity: "top",
                        position: "right",
                        stopOnFocus: true,
                        style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
                    }).showToast();

                    // Reset form
                    this.resetForm();
                    this.fetchClients();
                } else {
                    alert('Error al crear al cliente: ' + response.data.message);
                }

            } catch (error) {
                console.error('Error creating client:', error);
                alert('Error creating client.');
            }
        },
        editClient(client) {
            // Set current client to edit mode
            this.currentEditing = client.uid;
            this.selectedClient = { ...client };
        },
        cancelEdit() {
            // Reset editing state
            this.currentEditing = null;
        },
        async updateClient(client) {
            const clientId = client.uid;

            try {
                this.isSubmitting = true;

                // Create an updateData object, but only include non-empty fields
                const updateData = {};

                if (this.selectedClient.firstName) updateData.firstName = this.selectedClient.firstName;
                if (this.selectedClient.lastName) updateData.lastName = this.selectedClient.lastName;
                if (this.selectedClient.identification) updateData.identification = this.selectedClient.identification;
                if (this.selectedClient.phoneNumber) updateData.phoneNumber = this.selectedClient.phoneNumber;
                if (this.selectedClient.state) updateData.state = this.selectedClient.state;
                if (this.selectedClient.municipio) updateData.municipio = this.selectedClient.municipio;
                if (this.selectedClient.parroquia) updateData.parroquia = this.selectedClient.parroquia;

                // Only proceed if there is something to update
                if (Object.keys(updateData).length > 0) {
                    const userRef = dbRef(db, `Users/${clientId}`);
                    await update(userRef, updateData);

                    // Update email via Cloud Function if the email is changed
                    const newEmail = this.selectedClient.email;
                    if (newEmail && client.email !== newEmail) {

                        const updateEmailFunction = httpsCallable(functions, 'updateUserEmail');
                        await updateEmailFunction({ uid: clientId, newEmail });
                    }

                    this.cancelEdit();
                    this.fetchClients();

                    Toastify({
                        text: "Información actualizada!",
                        duration: 3000,
                        close: true,
                        gravity: 'top',
                        position: 'right',
                        stopOnFocus: true,
                        style: {
                            background: 'linear-gradient(to right, #00b09b, #96c93d)',
                        },
                    }).showToast();
                } else {
                    alert('No hay campos para actualizar.');
                }
            } catch (error) {
                console.error('Error updating info:', error);
                alert('La actualizacion de datos falló.');
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        deleteClient(client, index) {
            console.log(client.uid);
            // Confirmation dialog
            if (confirm("¿Desea borrar este cliente?")) {
                // User clicked "OK"

                try {
                    // Call the Cloud Function to delete the user from Authentication
                    const deleteClientFunction = httpsCallable(functions, 'deleteUser');
                    deleteClientFunction({ uid: client.uid });
                    console.log('Deleted from authentication: ', client.email);

                    // Remove Client from the database
                    const clientRef = dbRef(db, `Users/${client.uid}`);

                    remove(clientRef);
                    console.log('Deleted from database: ', client.firstName + ' ' + client.lastName);

                    // Show success toast
                    Toastify({
                        text: "Borrado del registro y autenticación.",
                        duration: 3000,
                        close: true,
                        gravity: "top",
                        position: "right",
                        stopOnFocus: true,
                        style: {
                            background: "linear-gradient(to right, #db231d, #96c93d)",
                        },
                    }).showToast();

                    // Remove the client from the UI
                    this.clients.splice(index, 1);
                } catch (error) {
                    console.error('Error deleting client:', error);
                }
            }
        },
        resetForm() {
            // Reset form fields
            this.client = {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
                sector: '',
                address: ''
            };
        },
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const day = String(d.getUTCDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        },
        openImgModal(imageUrl) {
            this.modalImageUrl = imageUrl;
            new Modal(document.getElementById('idImgModal')).show();
        },
        async approveID(client) {
            const userName = client.firstName + ' ' + client.lastName;
            try {
                // Show the loader
                this.isSubmitting = true;

                const userRef = dbRef(db, `Users/${client.uid}`);
                await update(userRef, { isVerified: true });

                // Send an email notification to the client through Firebase Cloud Functions
                const emailPayload = {
                    to: client.email,
                    message: {
                        subject: "Verificación Aprobada en Rose App",
                        text: `Hola ${userName}, tu solicitud de verificación ha sido aprobada.`,
                    },
                };
                await this.sendEmail(emailPayload);

                this.showToast('Usuario verificado con éxito.');
                this.fetchIdFiles(client);
            } catch (error) {
                console.error("Error approving ID:", error);
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        async dissapproveID(client) {
            // Confirmation dialog
            if (confirm("¿Desea borrar este cliente?")) {
                // User clicked "OK"
                try {
                    this.isSubmitting = true;

                    // Fetch the user's verification files from the Database
                    const userRef = dbRef(db, `Users/${client.uid}`);
                    const snapshot = await get(dbRef(db, `Users/${client.uid}/verificationFiles`));

                    if (!snapshot.exists()) {
                        console.warn(`No verification files found for ${client.uid}, skipping deletion.`);
                        return;
                    }

                    const verificationFiles = snapshot.val();
                    const filePaths = [
                        verificationFiles['Front-ID'] || null,
                        verificationFiles['Back-ID'] || null,
                        verificationFiles['Selfie'] || null
                    ].filter(Boolean); // Filter out null values

                    // Function to delete files from Firebase Storage
                    const deleteFile = async (fileUrl) => {
                        try {
                            const fileRef = storageRef(storage, fileUrl);
                            await deleteObject(fileRef);
                            console.log(`${fileUrl} deleted successfully.`);
                        } catch (error) {
                            if (error.code === 'storage/object-not-found') {
                                console.warn(`${fileUrl} not found, skipping deletion.`);
                            } else {
                                console.error(`Error deleting ${fileUrl}:`, error);
                            }
                        }
                    };

                    // Delete the files
                    for (const filePath of filePaths) {
                        await deleteFile(filePath);
                    }

                    // Clear verification status and files from the user's database entry
                    await update(userRef, {
                        isVerified: null,
                        requestedVerification: null,
                        verificationFiles: null, // Clear verification files in the database
                    });

                    // Send an email notification to the client via Firebase Cloud Functions
                    const emailPayload = {
                        to: client.email,
                        message: {
                            subject: "Verificación Denegada",
                            text: `Hola ${client.firstName}, tu solicitud de verificación ha sido denegada. Por favor, sube nuevamente tus archivos de verificación.`,
                        },
                    };
                    await this.sendEmail(emailPayload);

                    // Show a success toast and refresh client list
                    this.showToast('Verificación denegada y archivos eliminados.');
                    this.fetchClients();

                } catch (error) {
                    console.error("Error disapproving verification:", error);
                    this.showToast('Error al denegar la verificación. Por favor, inténtelo nuevamente.');
                } finally {
                    // Hide the loader
                    this.isSubmitting = false;
                }
            }
        },
        async approvePayment(client) {
            const userName = client.firstName + ' ' + client.lastName;
            const paymentDate = this.formatDate(client.subscription.lastPaymentDate);

            try {
                // Show the loader
                this.isSubmitting = true;

                const userRef = dbRef(db, `Users/${client.uid}/subscription`);
                await update(userRef, { isPaid: true });

                // Send an email notification to the client through Firebase Cloud Functions
                const emailPayload = {
                    to: client.email,
                    message: {
                        subject: "Su pago de Suscripción ha sido aprobado en Rose App",
                        text: `Hola ${userName}, tu pago del día ${paymentDate} ha sido aprobado.`,
                    },
                };
                await this.sendEmail(emailPayload);

                this.showToast('Pago aprobado. Se ha notificado al cliente.');
                //Close Payment modal after approval
                const modal = Modal.getOrCreateInstance(document.getElementById('validateModal'));
                modal.hide();
                this.fetchClients();
            } catch (error) {
                console.error("Error approving ID:", error);
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        async sendEmail(payload) {
            try {
                const sendEmailFunction = httpsCallable(functions, 'sendEmail');
                await sendEmailFunction(payload);
            } catch (error) {
                console.error('Error sending email:', error);
            }
        },
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },
        openImageInNewTab(url) {
            window.open(url, '_blank');
        },
    }
}
</script>
<template>
    <div class="container">
        <h2 class="mb-4 text-center text-uppercase fw-bold">
            Clientes
        </h2>

        <div class="d-flex justify-content-end align-items-center">
            <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#addClientModal"
                style="margin: 14px;">
                <i class="fa fa-plus-circle fa-fw me-1"></i> Agregar Cliente
            </a>
        </div>

        <div class="shadow-lg p-3 mb-5 bg-body rounded">

            <div class="search-box mb-3">
                <input v-model="searchQuery" placeholder="Filtrar cliente por nombre o cedula..." class="form-control">
            </div>
            <div>
                <div class="text-center" v-if="loading">
                    <p>Cargando clientes, puede tardar un minuto...</p>
                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                        aria-hidden="true"></span>
                </div>
                <div v-else>
                    <div class="accordion" id="clientAccordion">
                        <div v-for="(client, index) in paginatedFilteredUsers" :key="client.uid" class="accordion-item">
                            <h2 class="accordion-header" :id="'heading' + client.uid">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                                    :data-bs-target="'#collapse' + client.uid" aria-expanded="false"
                                    :aria-controls="'collapse' + client.uid">
                                    {{ client.firstName + " " + client.lastName }} - <strong> V{{ client.identification
                                        }}</strong>
                                    <span v-if="client.isVerified === true"
                                        class="badge bg-success ms-2">Verificado</span>
                                    <span v-else class="badge bg-danger ms-2">Sin verificar</span>
                                </button>
                            </h2>
                            <div :id="'collapse' + client.uid" class="accordion-collapse collapse"
                                :aria-labelledby="'heading' + client.uid">
                                <div class="accordion-body">
                                    <div v-if="currentEditing === client.uid">
                                        <!-- Editable Inputs -->
                                        <ul class="list-group">
                                            <li class="list-group-item">
                                                <label for="firstName">Nombre:</label>
                                                <input type="text" v-model="selectedClient.firstName"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label for="lastName">Apellido:</label>
                                                <input type="text" v-model="selectedClient.lastName"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label for="identification">Cedula:</label>
                                                <input type="text" v-model="selectedClient.identification"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label for="email">Email:</label>
                                                <input type="email" v-model="selectedClient.email"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label for="phoneNumber">Teléfono:</label>
                                                <input type="text" v-model="selectedClient.phoneNumber"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label class="form-label">Estado</label>
                                                <select v-model="selectedClient.state"
                                                    @change="displayMunicipios(selectedClient.state)"
                                                    class="form-control mb-2">
                                                    <option value="" disabled selected>Selecciona un estado</option>
                                                    <option v-for="(state, index) in venezuelanStates" :key="index"
                                                        :value="state">
                                                        {{ state }}
                                                    </option>
                                                </select>
                                            </li>
                                            <li class="list-group-item">
                                                <label class="form-label">Municipio</label>
                                                <select v-model="selectedClient.municipio"
                                                    @change="displayParroquias(selectedClient.municipio)"
                                                    class="form-control mb-2">
                                                    <option value="" disabled selected>Selecciona un municipio</option>
                                                    <option v-for="(municipio, index) in municipios" :key="index"
                                                        :value="municipio">
                                                        {{ municipio }}
                                                    </option>
                                                </select>
                                            </li>
                                            <li class="list-group-item">
                                                <label class="form-label">Parroquia</label>
                                                <select v-model="selectedClient.parroquia" class="form-control mb-2">
                                                    <option value="" disabled selected>Selecciona una parroquia</option>
                                                    <option v-for="(parroquia, index) in parroquias" :key="index"
                                                        :value="parroquia">
                                                        {{ parroquia }}
                                                    </option>
                                                </select>
                                            </li>
                                        </ul>

                                        <!-- Save/Cancel Buttons -->
                                        <div class="d-flex justify-content-center gap-2 mt-3">
                                            <button class="btn btn-sm btn-success"
                                                @click="updateClient(client)">Guardar</button>
                                            <button class="btn btn-sm btn-secondary"
                                                @click="cancelEdit()">Cancelar</button>
                                        </div>
                                    </div>

                                    <div v-else>
                                        <!-- View Mode -->
                                        <ul class="list-group">
                                            <li class="list-group-item"><strong>Nombre:</strong> {{ client.firstName }}
                                            </li>
                                            <li class="list-group-item"><strong>Apellido:</strong> {{ client.lastName }}
                                            </li>
                                            <li class="list-group-item"><strong>Cedula:</strong> {{
                                                client.identification }}
                                            </li>
                                            <li class="list-group-item"><strong>Email:</strong> {{ client.email }}</li>
                                            <li class="list-group-item"><strong>Teléfono:</strong> {{ client.phoneNumber
                                                }}</li>
                                            <li class="list-group-item"><strong>Estado:</strong> {{ client.state }}</li>
                                            <li class="list-group-item"><strong>Municipio:</strong> {{ client.municipio
                                                }}</li>
                                            <li class="list-group-item"><strong>Parroquia:</strong> {{ client.parroquia
                                                }}</li>
                                        </ul>

                                        <!-- Nested Accordions for Crédito, Cupones, Suscripción and Verification-->
                                        <div class="accordion mt-3">
                                            <!-- Crédito Accordion -->
                                            <div class="accordion-item">
                                                <h2 class="accordion-header" :id="'headingCredit' + client.uid">
                                                    <button class="accordion-button collapsed text-primary"
                                                        type="button" data-bs-toggle="collapse"
                                                        :data-bs-target="'#collapseCredit' + client.uid"
                                                        aria-expanded="false"
                                                        :aria-controls="'collapseCredit' + client.uid">
                                                        <i class="fa-solid fa-dollar me-2"></i>Crédito
                                                    </button>
                                                </h2>
                                                <div :id="'collapseCredit' + client.uid"
                                                    class="accordion-collapse collapse"
                                                    :aria-labelledby="'headingCredit' + client.uid">
                                                    <div class="accordion-body">
                                                        <ul class="list-group" v-if="client.credit">
                                                            <li class="list-group-item"><strong>Crédito aprobado
                                                                    :</strong>
                                                            </li>
                                                            <li class="list-group-item"><strong>Saldo activo:</strong>
                                                            </li>
                                                            <li class="list-group-item"><strong>Saldo usado:</strong>
                                                            </li>
                                                            <li class="list-group-item"><strong>Fecha de corte:</strong>
                                                            </li>
                                                            <li class="list-group-item"><strong>Lista de productos
                                                                    adquiridos a
                                                                    crédito:</strong>
                                                            </li>
                                                            <!-- <a href="#" @click="openProductsModal()">Lista de productos</a> -->
                                                        </ul>
                                                        <!-- Fallback message if no subscription is found -->
                                                        <p v-else class="text-center">Este cliente no tiene una
                                                            línea de crédito activa.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Preferences Accordion -->
                                            <div class="accordion-item">
                                                <h2 class="accordion-header" :id="'headingPreferences' + client.uid">
                                                    <button class="accordion-button collapsed text-primary"
                                                        type="button" data-bs-toggle="collapse"
                                                        :data-bs-target="'#collapsePreferences' + client.uid"
                                                        aria-expanded="false"
                                                        :aria-controls="'collapsePreferences' + client.uid">
                                                        <i class="fa-solid fa-heart me-2"></i>Preferencias de
                                                        Categorias para cupones
                                                    </button>
                                                </h2>

                                                <div :id="'collapsePreferences' + client.uid"
                                                    class="accordion-collapse collapse"
                                                    :aria-labelledby="'headingPreferences' + client.uid">
                                                    <div class="accordion-body">
                                                        <div
                                                            v-if="Object.keys(clientPreferences[client.uid]).length > 0">
                                                            <div
                                                                class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-4">
                                                                <div class="col"
                                                                    v-for="(pref, categoryId) in clientPreferences[client.uid]"
                                                                    :key="categoryId">
                                                                    <div class="card h-100 shadow-sm">
                                                                        <div class="card-header">
                                                                            <h5
                                                                                class="card-title text-center text-black">
                                                                                {{ pref.category }}</h5>
                                                                        </div>
                                                                        <div class="card-body">
                                                                            <ul>
                                                                                <li v-for="(subcategory, index) in pref.subcategories"
                                                                                    :key="index">{{ subcategory }}</li>
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p v-else class="text-center">El cliente no ha especificado sus
                                                            preferencias.</p>
                                                    </div>
                                                </div>

                                            </div>

                                            <!-- Cupones Accordion -->
                                            <div class="accordion-item">
                                                <h2 class="accordion-header" :id="'headingCoupons' + client.uid">
                                                    <button class="accordion-button collapsed text-primary"
                                                        type="button" data-bs-toggle="collapse"
                                                        :data-bs-target="'#collapseCoupons' + client.uid"
                                                        aria-expanded="false"
                                                        :aria-controls="'collapseCoupons' + client.uid">
                                                        <i class="fa-solid fa-ticket me-2"></i>Cupones
                                                    </button>
                                                </h2>

                                                <div :id="'collapseCoupons' + client.uid"
                                                    class="accordion-collapse collapse"
                                                    :aria-labelledby="'headingCoupons' + client.uid">
                                                    <div class="accordion-body">
                                                        <!-- Check if coupons exist -->
                                                        <div
                                                            v-if="clientCoupons[client.uid] && clientCoupons[client.uid].length > 0">
                                                            <!-- Responsive grid of coupons -->
                                                            <div
                                                                class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-4">
                                                                <!-- Coupon card -->
                                                                <div class="col"
                                                                    v-for="coupon in clientCoupons[client.uid]"
                                                                    :key="coupon.id">
                                                                    <div class="card h-100 shadow-sm">
                                                                        <div class="card-header">
                                                                            <h5
                                                                                class="card-title text-center text-black">
                                                                                Cupón
                                                                            </h5>
                                                                            <h6 class="text-center text-primary">{{
                                                                                coupon.name
                                                                                }}</h6>
                                                                        </div>
                                                                        <div class="card-body">

                                                                            <p class="card-text">
                                                                                <strong class="me-2">
                                                                                    {{ coupon.type === 'saldo' ? 'Saldo: $' : 'Porcentaje: % ' }}{{
                                                                                        coupon.balance }}
                                                                                </strong>
                                                                                <br>
                                                                                <strong>Válido hasta:</strong> {{
                                                                                    formatDate(coupon.expiration) }} <br>
                                                                                <strong>Estado: </strong>
                                                                                <span v-if="coupon.applied === false"
                                                                                    class="badge bg-success">Sin
                                                                                    usar</span>
                                                                                <span v-else
                                                                                    class="badge bg-danger">Usado</span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <!-- Show "No hay cupones" if no coupons are available -->
                                                        <p v-else class="text-center">No hay cupones.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Suscripción Accordion -->
                                            <div class="accordion-item">
                                                <h2 class="accordion-header" :id="'headingSubscription' + client.uid">
                                                    <button class="accordion-button collapsed text-primary"
                                                        type="button" data-bs-toggle="collapse"
                                                        :data-bs-target="'#collapseSubscription' + client.uid"
                                                        aria-expanded="false"
                                                        :aria-controls="'collapseSubscription' + client.uid">
                                                        <i class="fa-solid fa-handshake me-2"></i>Suscripción
                                                    </button>
                                                </h2>
                                                <div :id="'collapseSubscription' + client.uid"
                                                    class="accordion-collapse collapse"
                                                    :aria-labelledby="'headingSubscription' + client.uid">
                                                    <div class="accordion-body">
                                                        <ul class="list-group" v-if="client.subscription">
                                                            <!-- Subscription Name -->
                                                            <li class="list-group-item">
                                                                <strong>Nivel: </strong> {{ client.subscription.name }}
                                                            </li>

                                                            <!-- Subscription Status -->
                                                            <li class="list-group-item">
                                                                <strong>Estado: </strong>
                                                                <span v-if="client.subscription.status === true"
                                                                    class="badge bg-success ms-2">
                                                                    Activo
                                                                </span>
                                                                <span v-else class="badge bg-danger ms-2">
                                                                    Inactivo
                                                                </span>
                                                            </li>

                                                            <!-- Subscription Price -->
                                                            <li class="list-group-item">
                                                                <strong>Monto: </strong> ${{ client.subscription.price
                                                                }}
                                                            </li>

                                                            <!-- Subscription Payment Status -->
                                                            <li class="list-group-item">
                                                                <strong>Pago: </strong>
                                                                <span v-if="client.subscription.isPaid"
                                                                    class="badge bg-success ms-2">
                                                                    Pagado
                                                                </span>
                                                                <span v-else-if="client.subscription.paymentUploaded">
                                                                    <span class="badge bg-success ms-2">
                                                                        Pago realizado
                                                                    </span>
                                                                    <a class="validate btn mw-2" href="#"
                                                                        @click.prevent="openPaymentModal(client)">Validar</a>
                                                                </span>
                                                                <span v-else class="badge bg-danger ms-2">
                                                                    Sin pagar
                                                                </span>
                                                            </li>

                                                            <!-- Subscription Renewal Date -->
                                                            <li class="list-group-item">
                                                                <strong>Fecha de Renovación: </strong>
                                                                {{ formatDate(client.subscription.payDay) }}
                                                            </li>
                                                        </ul>
                                                        <!-- Fallback message if no subscription is found -->
                                                        <p v-else class="text-center">Este cliente no tiene una
                                                            suscripción
                                                            activa.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Verificación Accordion -->
                                            <div v-if="client.requestedVerification" class="accordion-item">
                                                <h2 class="accordion-header" :id="'headingVerification' + client.uid">
                                                    <button class="accordion-button collapsed text-primary"
                                                        type="button" data-bs-toggle="collapse"
                                                        :data-bs-target="'#collapseVerification' + client.uid"
                                                        aria-expanded="false"
                                                        :aria-controls="'collapseVerification' + client.uid"
                                                        @click="fetchIdFiles(client)">
                                                        <i class="fa-solid fa-user-check me-2"></i> Petición de
                                                        Verificación
                                                    </button>
                                                </h2>
                                                <div :id="'collapseVerification' + client.uid"
                                                    class="accordion-collapse collapse"
                                                    :aria-labelledby="'headingVerification' + client.uid">
                                                    <div class="card accordion-body shadow-lg p-3">
                                                        <div class="text-muted mb-3">
                                                            <strong>Nota:</strong> Las imágenes pueden tardar unos
                                                            segundos en
                                                            cargar. Por favor, espere...
                                                        </div>
                                                        <div class="row g-4">
                                                            <!-- ID card - Front -->
                                                            <div class="col-md-6">
                                                                <div class="card h-100 border-0 shadow-sm">
                                                                    <div class="card-body text-center">
                                                                        <h5 class="card-title">ID Frontal</h5>
                                                                        <img :src="client.idFrontUrl"
                                                                            class="img-fluid rounded" alt="ID Front"
                                                                            v-if="client.idFrontUrl"
                                                                            @click="openImgModal(client.idFrontUrl)"
                                                                            style="cursor: pointer; max-height: 200px;">
                                                                        <p v-else class="text-muted">No se encontró
                                                                            imagen
                                                                            frontal de la ID.</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <!-- ID card - Back -->
                                                            <div class="col-md-6">
                                                                <div class="card h-100 border-0 shadow-sm">
                                                                    <div class="card-body text-center">
                                                                        <h5 class="card-title">ID Reverso</h5>
                                                                        <img :src="client.idBackUrl"
                                                                            class="img-fluid rounded" alt="ID Back"
                                                                            v-if="client.idBackUrl"
                                                                            @click="openImgModal(client.idBackUrl)"
                                                                            style="cursor: pointer; max-height: 200px;">
                                                                        <p v-else class="text-muted">No se encontró
                                                                            imagen
                                                                            trasera de la ID.</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <!-- ID card - Selfie -->
                                                            <div class="col-md-6">
                                                                <div class="card h-100 border-0 shadow-sm">
                                                                    <div class="card-body text-center">
                                                                        <h5 class="card-title">Selfie</h5>
                                                                        <img :src="client.selfieUrl"
                                                                            class="img-fluid rounded" alt="Selfie"
                                                                            v-if="client.selfieUrl"
                                                                            @click="openImgModal(client.selfieUrl)"
                                                                            style="cursor: pointer; max-height: 200px;">
                                                                        <p v-else class="text-muted">No se encontró
                                                                            imagen
                                                                            selfie.</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div v-if="!client.isVerified"
                                                            class="card-footer text-center mt-3">
                                                            <!-- Approve and Disapprove buttons -->
                                                            <div class="d-flex justify-content-center gap-3">
                                                                <button
                                                                    class="btn btn-outline-success d-flex align-items-center gap-1"
                                                                    @click="approveID(client)" :disabled="isSubmitting">
                                                                    <i class="fa-solid fa-check"></i> Aprobar
                                                                </button>
                                                                <button
                                                                    class="btn btn-outline-danger d-flex align-items-center gap-1"
                                                                    @click="dissapproveID(client)"
                                                                    :disabled="isSubmitting">
                                                                    <i class="fa-solid fa-times"></i> Denegar
                                                                </button>
                                                            </div>
                                                            <!-- Loader Spinner -->
                                                            <div v-if="isSubmitting"
                                                                class="d-flex justify-content-center my-3">
                                                                <div class="spinner-border text-primary" role="status">
                                                                    <span class="visually-hidden">Cargando...</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div v-else class="mt-4">
                                                            <div class="text-muted">
                                                                <span
                                                                    class="text-success d-flex justify-content-end align-items-center"
                                                                    style="font-size: 0.9rem;">
                                                                    <i class="fa fa-check me-2"
                                                                        style="font-size: 1.25rem;"></i>
                                                                    <strong>Cliente verificado.</strong>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Action Buttons -->
                                        <div class="d-flex justify-content-end mt-2">
                                            <button class="btn btn-sm btn-outline-info me-1" data-bs-toggle="tooltip"
                                                data-bs-placement="top" title="Editar comercio"
                                                @click="editClient(client)">
                                                <i class="fa-solid fa-pencil"></i>
                                            </button>
                                            <button class="btn btn-sm btn-outline-danger"
                                                @click="deleteClient(client, index)">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

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

        <!-- Modal for Adding New Client -->
        <div class="modal fade" id="addClientModal" tabindex="-1" aria-labelledby="addClientModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addClientModalLabel">Agregar Cliente</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="clientFirstName" class="form-label">Nombre <span
                                    class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clientFirstName" v-model="client.firstName"
                                required />
                        </div>
                        <div class="mb-3">
                            <label for="clientLastName" class="form-label">Apellido <span
                                    class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clientLastName" v-model="client.lastName"
                                required />
                        </div>
                        <div class="mb-3">
                            <label for="clientIdentification" class="form-label">Cédula <span
                                    class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clientIdentification"
                                v-model="client.identification" required />
                        </div>
                        <div class="mb-3">
                            <label for="clientEmail" class="form-label">Email <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clientEmail" v-model="client.email" required />
                        </div>
                        <div class="mb-3">
                            <label for="clientPhoneNumber" class="form-label">Teléfono</label>
                            <input type="text" class="form-control" id="clientPhoneNumber"
                                v-model="client.phoneNumber" />
                        </div>
                        <p>(<span class="text-danger">*</span>) Campos obligatorios.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="createClient()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Modal for opening ID img -->
        <div class="modal fade" id="idImgModal" tabindex="-1" aria-labelledby="qrModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="qrModalLabel">ID</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img :src="modalImageUrl" alt="QR Code" class="img-fluid">
                    </div>
                </div>
            </div>
        </div>
        <!-- Modal for validating payment -->
        <div class="modal fade" id="validateModal" tabindex="-1" aria-labelledby="validateModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="validateModalLabel">Captura de Pago de Suscripción</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="text-muted mb-3">
                            <strong>Nota:</strong> Las imágenes pueden tardar unos
                            segundos en
                            cargar. Por favor, espere...
                        </div>
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-header">
                                <h5 class="card-title text-black">Realizado el día:
                                    {{ formatDate(this.paymentClient.subscription?.lastPaymentDate) ||
                                        'Fecha no disponible' }}</h5>
                            </div>
                            <div class="card-body text-center">
                                <img :src="this.paymentClient.paymentUrl" class="img-fluid rounded" alt="comprobante"
                                    v-if="this.paymentClient.paymentUrl"
                                    @click="openImageInNewTab(this.paymentClient.paymentUrl)"
                                    style="cursor: pointer; max-height: 200px;">

                                <p v-else class="text-muted">No se encontró
                                    captura de pago.</p>
                            </div>
                            <span class="text-muted">Click en la imagen para ampliar</span>
                            <div class="card-footer text-end">
                                <button class="btn btn-outline-success"
                                    @click.prevent="approvePayment(this.paymentClient)" :disabled="isSubmitting">
                                    <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true">
                                    </span>
                                    <span v-else>
                                        <i class="fa-solid fa-check"></i>
                                        Aprobar pago
                                    </span>
                                </button>
                            </div>
                        </div>
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

.validate:hover {
    color: green;
}

#idImgModal {
    z-index: 1055;
    /* Higher than other elements */
    position: fixed;
}
</style>