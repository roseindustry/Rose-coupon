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
import { formatDate } from '@fullcalendar/core/index.js';

export default {
    data() {
        return {
            client: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                password: '',
                confirmPassword: '',
                phoneNumber: '',
                address: '',
                sector: '',
            },
            selectedClient: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
                address: '',
                sector: '',
            },
            sectores:
                [
                    "Santa Lucía",
                    "Veritas",
                    "Cecilio Acosta",
                    "La Lago",
                    "El Milagro",
                    "La Paragua",
                    "El Tránsito",
                    "Amparo",
                    "Grano de Oro",
                    "Cañada Honda"
                ],
            clients: [],
            clientCoupons: [],
            currentEditing: null,
            searchQuery: null,
            modalImageUrl: '',
        }
    },
    async created() {
        await this.fetchClients();
    },
    computed: {
        filteredUsers() {
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

        async fetchClients() {
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(clientRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Map the clients to your desired format
                    this.clients = Object.entries(users).map(([uid, user]) => ({ uid, ...user }));
                    this.clientCoupons = {};

                    // Fetch coupons and subscriptions for each client
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
                            // Assign subscription details to the client
                            client.subscription = subscriptionSnapshot.val();
                        } else {
                            // Set a default empty subscription if none exist
                            client.subscription = null;
                        }
                    }
                } else {
                    this.clients = [];
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.clients = [];
            }
        },
        async fetchIdFiles(client) {
            const userName = client.firstName + ' ' + client.lastName;
            try {
                // Construct the file paths
                const frontFileName = `front-ID.png`;
                const backFileName = `back-ID.png`;

                // Define storage references for both front and back ID files
                const frontFileRef = storageRef(storage, `verification-files/${client.uid}-${userName}/${frontFileName}`);
                const backFileRef = storageRef(storage, `verification-files/${client.uid}-${userName}/${backFileName}`);

                // Fetch the download URLs
                const frontUrl = await getDownloadURL(frontFileRef);
                const backUrl = await getDownloadURL(backFileRef);

                // Store the URLs in the client reactive property
                client.idFrontUrl = frontUrl;
                client.idBackUrl = backUrl;

            } catch (error) {
                console.error('Error fetching ID files:', error);
            }
        },
        async createClient() {
            try {
                const userData = {
                    firstName: this.client.firstName,
                    lastName: this.client.lastName,
                    identification: this.client.identification,
                    email: this.client.email,
                    phoneNumber: this.client.phoneNumber,
                    sector: this.client.sector,
                    address: this.client.address,
                    role: 'cliente'
                };

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
                // Create an updateData object, but only include non-empty fields
                const updateData = {};

                if (this.selectedClient.firstName) updateData.firstName = this.selectedClient.firstName;
                if (this.selectedClient.lastName) updateData.lastName = this.selectedClient.lastName;
                if (this.selectedClient.identification) updateData.identification = this.selectedClient.identification;
                if (this.selectedClient.email) updateData.email = this.selectedClient.email;
                if (this.selectedClient.phoneNumber) updateData.phoneNumber = this.selectedClient.phoneNumber;
                if (this.selectedClient.address) updateData.address = this.selectedClient.address;
                if (this.selectedClient.sector) updateData.sector = this.selectedClient.sector;

                // Only proceed if there is something to update
                if (Object.keys(updateData).length > 0) {
                    const userRef = dbRef(db, `Users/${clientId}`);
                    await update(userRef, updateData);

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
            }

            // Cloud functions way
            // const updateData = {
            //     firstName: this.selectedClient.firstName,
            //     lastName: this.selectedClient.lastName,
            //     identification: this.selectedClient.identification,
            //     email: this.selectedClient.email,
            //     phoneNumber: this.selectedClient.phoneNumber,
            //     address: this.selectedClient.address,
            //     sector: this.selectedClient.sector
            // };

            // try {
            //     const result = await httpsCallable('updateUser')({
            //         clientId: this.selectedClient.id,
            //         updateData,
            //     });

            //     console.log(result.data.message);
            //     // Apply changes to the original client data
            //     Object.assign(client, this.selectedClient);
            //     this.currentEditing = null; // Exit edit mode
            // } catch (error) {
            //     console.error('Error updating client data:', error);
            // }
        },
        deleteClient(client, index) {
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
            return moment(date).format('DD/MM/YYYY');
        },
        openImgModal(imageUrl) {
            this.modalImageUrl = imageUrl;
            new Modal(document.getElementById('idImgModal')).show();
        },
        async approveID(client) {
            const userName = client.firstName + ' ' + client.lastName;
            try {
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
                this.fetchClients();
            } catch (error) {
                console.error("Error approving ID:", error);
            }
            // Update the client's 'isVerified' field to true
            // hide the buttons for approving or dissaproving and add a message
            // Send an email through firebase to notify the user of their verification status
        },
        async dissapproveID(client) {
            const userName = client.firstName + ' ' + client.lastName;
            try {
                const userRef = dbRef(db, `Users/${client.uid}`);
                await update(userRef, { isVerified: false, requestedVerification: null });

                // Remove the current image files from Firebase Storage
                const frontFileRef = storageRef(storage, `verification-files/${client.uid}-${userName}/front-ID.png`);
                const backFileRef = storageRef(storage, `verification-files/${client.uid}-${userName}/back-ID.png`);
                await deleteObject(frontFileRef);
                await deleteObject(backFileRef);

                // Send an email notification to the client through Firebase Cloud Functions
                const emailPayload = {
                    to: client.email,
                    message: {
                        subject: "Verificación Denegada",
                        text: `Hola ${client.name}, tu solicitud de verificación ha sido denegada. Por favor, sube nuevamente tus archivos de verificación.`,
                    },
                };
                await this.sendEmail(emailPayload);

                this.showToast('Verificación denegada y archivos eliminados.');
                this.fetchClients();
            } catch (error) {
                console.error("Error disapproving ID:", error);
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
    }
}
</script>
<template>
    <div class="container">
        <div class="d-flex justify-content-end align-items-center">
            <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#addClientModal"
                style="margin: 14px;">
                <i class="fa fa-plus-circle fa-fw me-1"></i> Agregar Cliente
            </a>
        </div>

        <h2 class="mb-4 text-center text-uppercase fw-bold" style="color: #343a40;">
            Clientes
        </h2>

        <div class="shadow-lg p-3 mb-5 bg-body rounded">
            <div class="search-box mb-3">
                <input v-model="searchQuery" placeholder="Filtrar cliente por cedula..." class="form-control">
            </div>
            <div class="accordion" id="clientAccordion">
                <div v-for="(client, index) in filteredUsers" :key="client.uid" class="accordion-item">
                    <h2 class="accordion-header" :id="'heading' + client.uid">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                            :data-bs-target="'#collapse' + client.uid" aria-expanded="false"
                            :aria-controls="'collapse' + client.uid">
                            {{ client.firstName + " " + client.lastName }} - {{ client.identification }}
                            <span v-if="client.isVerified === true" class="badge bg-success ms-2">Verificado</span>
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
                                        <input type="text" v-model="selectedClient.firstName" class="form-control" />
                                    </li>
                                    <li class="list-group-item">
                                        <label for="lastName">Apellido:</label>
                                        <input type="text" v-model="selectedClient.lastName" class="form-control" />
                                    </li>
                                    <li class="list-group-item">
                                        <label for="identification">Cedula:</label>
                                        <input type="text" v-model="selectedClient.identification"
                                            class="form-control" />
                                    </li>
                                    <li class="list-group-item">
                                        <label for="email">Email:</label>
                                        <input type="email" v-model="selectedClient.email" class="form-control" />
                                    </li>
                                    <li class="list-group-item">
                                        <label for="phoneNumber">Teléfono:</label>
                                        <input type="text" v-model="selectedClient.phoneNumber" class="form-control" />
                                    </li>
                                    <li class="list-group-item">
                                        <label for="sector">Sector:</label>
                                        <select v-model="selectedClient.sector" class="form-control">
                                            <option v-for="sector in sectores" :key="sector">{{ sector }}</option>
                                        </select>
                                    </li>
                                    <li class="list-group-item">
                                        <label for="address">Dirección:</label>
                                        <textarea v-model="selectedClient.address" class="form-control"></textarea>
                                    </li>
                                </ul>

                                <!-- Save/Cancel Buttons -->
                                <div class="d-flex justify-content-center gap-2 mt-3">
                                    <button class="btn btn-sm btn-success"
                                        @click="updateClient(client)">Guardar</button>
                                    <button class="btn btn-sm btn-secondary" @click="cancelEdit()">Cancelar</button>
                                </div>
                            </div>

                            <div v-else>
                                <!-- View Mode -->
                                <ul class="list-group">
                                    <li class="list-group-item"><strong>Nombre:</strong> {{ client.firstName }}</li>
                                    <li class="list-group-item"><strong>Apellido:</strong> {{ client.lastName }}</li>
                                    <li class="list-group-item"><strong>Cedula:</strong> {{ client.identification }}
                                    </li>
                                    <li class="list-group-item"><strong>Email:</strong> {{ client.email }}</li>
                                    <li class="list-group-item"><strong>Teléfono:</strong> {{ client.phoneNumber }}</li>
                                    <li class="list-group-item"><strong>Sector:</strong> {{ client.sector }}</li>
                                    <li class="list-group-item"><strong>Dirección:</strong> {{ client.address }}</li>
                                </ul>

                                <!-- Nested Accordions for Crédito, Cupones, Suscripción and Verification-->
                                <div class="accordion mt-3">
                                    <!-- Crédito Accordion -->
                                    <div class="accordion-item">
                                        <h2 class="accordion-header" :id="'headingCredit' + client.uid">
                                            <button class="accordion-button collapsed text-primary" type="button"
                                                data-bs-toggle="collapse"
                                                :data-bs-target="'#collapseCredit' + client.uid" aria-expanded="false"
                                                :aria-controls="'collapseCredit' + client.uid">
                                                <i class="fa-solid fa-dollar me-2"></i>Crédito
                                            </button>
                                        </h2>
                                        <div :id="'collapseCredit' + client.uid" class="accordion-collapse collapse"
                                            :aria-labelledby="'headingCredit' + client.uid">
                                            <div class="accordion-body">
                                                <ul class="list-group">
                                                    <li class="list-group-item"><strong>Crédito aprobado :</strong>
                                                    </li>
                                                    <li class="list-group-item"><strong>Saldo activo:</strong> </li>
                                                    <li class="list-group-item"><strong>Saldo usado:</strong> </li>
                                                    <li class="list-group-item"><strong>Fecha de corte:</strong> </li>
                                                    <li class="list-group-item"><strong>Lista de productos adquiridos a
                                                            crédito:</strong>
                                                    </li>
                                                    <!-- <a href="#" @click="openProductsModal()">Lista de productos</a> -->
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Cupones Accordion -->
                                    <div class="accordion-item">
                                        <h2 class="accordion-header" :id="'headingCoupons' + client.uid">
                                            <button class="accordion-button collapsed text-primary" type="button"
                                                data-bs-toggle="collapse"
                                                :data-bs-target="'#collapseCoupons' + client.uid" aria-expanded="false"
                                                :aria-controls="'collapseCoupons' + client.uid">
                                                <i class="fa-solid fa-ticket me-2"></i>Cupones
                                            </button>
                                        </h2>

                                        <div :id="'collapseCoupons' + client.uid" class="accordion-collapse collapse"
                                            :aria-labelledby="'headingCoupons' + client.uid">
                                            <div class="accordion-body">
                                                <!-- Check if coupons exist -->
                                                <div
                                                    v-if="clientCoupons[client.uid] && clientCoupons[client.uid].length > 0">
                                                    <!-- Responsive grid of coupons -->
                                                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                                                        <!-- Coupon card -->
                                                        <div class="col" v-for="coupon in clientCoupons[client.uid]"
                                                            :key="coupon.id">
                                                            <div class="card h-100 shadow-sm">
                                                                <div class="card-body">
                                                                    <h5 class="card-title text-center">Cupón</h5>
                                                                    <p class="card-text">
                                                                        <strong class="me-2">
                                                                            {{ coupon.type === 'saldo' ? 'Saldo: $' :
                                                                                'Porcentaje: %' }}{{ coupon.balance }}
                                                                        </strong>
                                                                        <br>
                                                                        <strong>Válido hasta:</strong> {{
                                                                            formatDate(coupon.expiration) }} <br>
                                                                        <strong>Estado:</strong>
                                                                        <span v-if="coupon.status === true"
                                                                            class="badge bg-success">Sin usar</span>
                                                                        <span v-else
                                                                            class="badge bg-danger">Usado</span>
                                                                    </p>
                                                                </div>
                                                                <div class="card-footer">
                                                                    <small class="text-muted">
                                                                        {{ coupon.status ? 'Cupón disponible' :
                                                                            'Cupón usado' }}
                                                                    </small>
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
                                            <button class="accordion-button collapsed text-primary" type="button"
                                                data-bs-toggle="collapse"
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
                                                        <strong>Monto: </strong> ${{ client.subscription.price }}
                                                    </li>

                                                    <!-- Subscription Payment Status -->
                                                    <li class="list-group-item">
                                                        <strong>Pago: </strong>
                                                        <span v-if="client.subscription.isPaid"
                                                            class="badge bg-success ms-2">
                                                            Pagado
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
                                                <p v-else class="text-center">Este cliente no tiene una suscripción
                                                    activa.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Verificación Accordion -->
                                    <div v-if="client.requestedVerification" class="accordion-item">
                                        <h2 class="accordion-header" :id="'headingVerification' + client.uid">
                                            <button class="accordion-button collapsed text-primary" type="button"
                                                data-bs-toggle="collapse"
                                                :data-bs-target="'#collapseVerification' + client.uid"
                                                aria-expanded="false"
                                                :aria-controls="'collapseVerification' + client.uid"
                                                @click="fetchIdFiles(client)">
                                                <i class="fa-solid fa-user-check me-2"></i> Petición de Verificación
                                            </button>
                                        </h2>
                                        <div :id="'collapseVerification' + client.uid"
                                            class="accordion-collapse collapse"
                                            :aria-labelledby="'headingVerification' + client.uid">
                                            <div class="card accordion-body shadow-lg p-3">
                                                <div class="row g-4">
                                                    <!-- ID card - Front -->
                                                    <div class="col-md-6">
                                                        <div class="card h-100 border-0 shadow-sm">
                                                            <div class="card-body text-center">
                                                                <h5 class="card-title">ID Frontal</h5>
                                                                <img :src="client.idFrontUrl" class="img-fluid rounded"
                                                                    alt="ID Front" v-if="client.idFrontUrl"
                                                                    @click="openImgModal(client.idFrontUrl)"
                                                                    style="cursor: pointer; max-height: 200px;">
                                                                <p v-else class="text-muted">No se encontró imagen
                                                                    frontal de la ID.</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- ID card - Back -->
                                                    <div class="col-md-6">
                                                        <div class="card h-100 border-0 shadow-sm">
                                                            <div class="card-body text-center">
                                                                <h5 class="card-title">ID Reverso</h5>
                                                                <img :src="client.idBackUrl" class="img-fluid rounded"
                                                                    alt="ID Back" v-if="client.idBackUrl"
                                                                    @click="openImgModal(client.idBackUrl)"
                                                                    style="cursor: pointer; max-height: 200px;">
                                                                <p v-else class="text-muted">No se encontró imagen
                                                                    trasera de la ID.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div v-if="!client.isVerified" class="card-footer text-center mt-3">
                                                    <!-- Approve and Disapprove buttons -->
                                                    <div class="d-flex justify-content-center gap-3">
                                                        <button
                                                            class="btn btn-outline-success d-flex align-items-center gap-1"
                                                            @click="approveID(client)">
                                                            <i class="fa-solid fa-check"></i> Aprobar
                                                        </button>
                                                        <button
                                                            class="btn btn-outline-danger d-flex align-items-center gap-1"
                                                            @click="dissapproveID(client)">
                                                            <i class="fa-solid fa-times"></i> Denegar
                                                        </button>
                                                    </div>
                                                </div>
                                                <div v-else class="mt-3">
                                                    <div class="text-muted">
                                                        <span
                                                            class="text-success d-flex justify-content-end align-items-center"
                                                            style="font-size: 0.9rem;">
                                                            <i class="fa fa-check me-2" style="font-size: 1.25rem;"></i>
                                                           <strong>Cliente verificado.</strong> 
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="d-flex justify-content-end gap-2 mt-3">
                                    <!-- Edit Client Button -->
                                    <button class="btn btn-outline-primary d-flex align-items-center gap-1"
                                        @click="editClient(client)">
                                        <i class="fa-solid fa-pencil"></i> Editar
                                    </button>

                                    <!-- Delete Client Button -->
                                    <button class="btn btn-outline-danger d-flex align-items-center gap-1"
                                        @click="deleteClient(client, index)">
                                        <i class="fa-solid fa-trash"></i> Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
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
                            <input type="text" class="form-control" id="clientFirstName" v-model="client.firstName" />
                        </div>
                        <div class="mb-3">
                            <label for="clientLastName" class="form-label">Apellido <span
                                    class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clientLastName" v-model="client.lastName" />
                        </div>
                        <div class="mb-3">
                            <label for="clientIdentification" class="form-label">Cédula <span
                                    class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clientIdentification"
                                v-model="client.identification" />
                        </div>
                        <div class="mb-3">
                            <label for="clientEmail" class="form-label">Email <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clientEmail" v-model="client.email" />
                        </div>
                        <div class="mb-3">
                            <label for="clientPhoneNumber" class="form-label">Teléfono <span
                                    class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="clientPhoneNumber"
                                v-model="client.phoneNumber" />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Sector <span class="text-danger">*</span></label>
                            <select v-model="client.sector" class="form-control form-control-lg fs-15px">
                                <option value="" disabled selected>Selecciona un sector</option>
                                <option v-for="(sector, index) in sectores" :key="index" :value="sector">
                                    {{ sector }}
                                </option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Dirección <span class="text-secondary">(Opcional)</span></label>
                            <input v-model="client.address" type="text" class="form-control form-control-lg fs-15px"
                                value="" />
                        </div>
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
    </div>
</template>