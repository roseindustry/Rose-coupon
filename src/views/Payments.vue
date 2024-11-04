<script>
import { ref as dbRef, query, orderByChild, equalTo, get, push, set, update, remove } from 'firebase/database';
import { ref as storageRef, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, functions } from '@/firebase/init';
import { httpsCallable } from 'firebase/functions';
import { useUserStore } from '@/stores/user-role';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

export default {
    data() {
        return {
            clients: [],
            clientsWithPayments: [],
            affiliates: [],
            affiliatesWithPayments: [],

            userModalData: '',
            modalImageUrl: null,
            isSubmitting: false,
        }
    },
    async mounted() {
        await this.fetchClients();
        await this.fetchAffiliates();
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
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const localDateDay = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
            const day = String(localDateDay.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
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
                        return {
                            id: key,
                            ...users[key],
                            subscription: users[key].subscription || {},
                        };
                    });

                    // Await for all promises to resolve
                    this.clients = await Promise.all(clientPromises);

                    // Filter only clients with a paid subscription and check for lastPaymentDate
                    this.clientsWithPayments = this.clients.filter((client) => {
                        return (
                            client.subscription &&                // Check if subscription exists
                            client.subscription.paymentUploaded === true && // Payment has been provided
                            client.subscription.isPaid === false && // The payment hasnt been checked
                            client.subscription.lastPaymentDate    // Ensure lastPaymentDate exists for paid subs
                        );
                    });

                    for (const client of this.clientsWithPayments) {
                        if (client.subscription && client.subscription.lastPaymentDate) {
                            await this.fetchSubscription(client, role); // Only fetch if lastPaymentDate exists
                        } else {
                            console.warn(`Client ${client.id} has no valid lastPaymentDate or subscription.`);
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
        async fetchAffiliates() {
            const role = 'afiliado';
            const affiliatesRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const affiliateSnapshot = await get(affiliatesRef);

                if (affiliateSnapshot.exists()) {
                    const affiliates = affiliateSnapshot.val();

                    this.affiliates = Object.keys(affiliates).map(key => ({
                        id: key,
                        ...affiliates[key],
                        subscription: affiliates[key].subscription || {},
                    }));

                    // Filter only clients with a paid subscription and check for lastPaymentDate
                    this.affiliatesWithPayments = this.affiliates.filter((affiliate) => {
                        return (
                            affiliate.subscription && // Check if subscription exists
                            affiliate.subscription.paymentUploaded === true && // Payment has been provided
                            !affiliate.subscription.isPaid && // The payment hasnt been checked
                            affiliate.subscription.lastPaymentDate // Ensure lastPaymentDate exists for paid subs
                        );
                    });

                    for (const affiliate of this.affiliatesWithPayments) {
                        if (affiliate.subscription && affiliate.subscription.lastPaymentDate) {
                            await this.fetchSubscription(affiliate, role); // Only fetch if lastPaymentDate exists
                        } else {
                            console.warn(`Affiliate ${affiliate.id} has no valid lastPaymentDate or subscription.`);
                        }
                    }

                } else {
                    console.log("No data available.");
                }
            } catch (error) {
                console.error("Error fetching affiliates:", error);
            }
        },

        async fetchSubscription(user, role) {
            if (!user.subscription || !user.subscription.lastPaymentDate) {
                console.warn(`Skipping user ${user.id} due to missing subscription data.`);
                return;
            }

            try {
                const subscriptionRef = dbRef(db, `Users/${user.id}/subscription`);
                const subscriptionSnapshot = await get(subscriptionRef);

                if (subscriptionSnapshot.exists()) {
                    user.subscription = subscriptionSnapshot.val();
                    const subscriptionId = user.subscription.subscription_id;

                    // Query the Suscriptions table to fetch the details
                    let subscriptionDataRef;
                    if (role === 'cliente') {
                        subscriptionDataRef = dbRef(db, `Suscriptions/${subscriptionId}`);
                    } else if (role === 'afiliado') {
                        subscriptionDataRef = dbRef(db, `Affiliate_suscriptions/${subscriptionId}`);
                    }

                    const userSuscriptionSnapshot = await get(subscriptionDataRef);

                    if (userSuscriptionSnapshot.exists()) {
                        const userSubscription = userSuscriptionSnapshot.val();
                        // Merge the userSubscription into the user's subscription object
                        user.subscription = {
                            ...user.subscription,
                            ...userSubscription
                        };
                        if (user.subscription.lastPaymentDate) {
                            // In case the user made a payment
                            const paymentDate = (user.subscription.lastPaymentDate).split('T')[0];

                            await this.fetchPaymentFiles(user, paymentDate, role);
                        }
                    }
                } else {
                    // Set a default empty subscription if none exist
                    user.subscription = null;
                }
            } catch (error) {
                console.error(`Error fetching subscription for user ${user.id}:`, error.message || error);
            }

        },
        async fetchPaymentFiles(user, date, role) {
            try {
                let userName;
                if (role === 'cliente') {
                    userName = `${user.firstName} ${user.lastName}`;
                } else if (role === 'afiliado') {
                    userName = `${user.companyName}`;
                }

                const folderRef = storageRef(storage, `payment-captures/${role}/${user.id}-${userName}`);

                // List all files in the user's payment-captures folder
                const fileList = await listAll(folderRef);

                // Filter files by date (ignoring extension)
                const matchingFile = fileList.items.find(fileRef => fileRef.name.startsWith(date));

                if (matchingFile) {
                    // Get the download URL for the matched file
                    const paymentUrl = await getDownloadURL(matchingFile);

                    // Assign the URL to the user object
                    user.paymentUrl = paymentUrl;
                } else {
                    if (role === 'cliente') {
                        console.warn('No payment file found for the given date for the user: ', user.firstName, user.lastName, `(${user.role})`);
                    } else if (role === 'afiliado') {
                        console.warn('No payment file found for the given date for the user: ', user.companyName, `(${user.role})`);
                    }
                    user.paymentUrl = null;
                }
            } catch (error) {
                console.error('Error fetching payment file:', error.message || error);
                user.paymentUrl = null;
            }
        },
        openImgModal(user, url) {
            this.userModalData = user;
            this.modalImageUrl = url;
            new Modal(document.getElementById('idImgModal')).show();
        },

        async validatePayment(user) {
            let userName;
            if (user.role === 'cliente') {
                userName = `${user.firstName} ${user.lastName}`;
            } else if (user.role === 'afiliado') {
                userName = `${user.companyName}`;
            }
            const paymentDate = this.formatDate(user.subscription.lastPaymentDate);

            try {
                // Show the loader
                this.isSubmitting = true;

                const userRef = dbRef(db, `Users/${user.id}/subscription`);
                await update(userRef, { 
                    isPaid: true,
                    status: true,
                });

                // Send an email notification to the user through Firebase Cloud Functions
                const emailPayload = {
                    to: user.email,
                    message: {
                        subject: "Su pago de Suscripción ha sido aprobado en Rose App",
                        text: `Hola ${userName}, tu pago del día ${paymentDate} ha sido aprobado.`,
                    },
                };
                await this.sendEmail(emailPayload);

                this.showToast('Pago aprobado. Se ha notificado al cliente.');
                //Close Payment modal after approval
                const modal = Modal.getOrCreateInstance(document.getElementById('idImgModal'));
                modal.hide();
                this.fetchClients();
                this.fetchAffiliates();
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
    },
}
</script>
<template>
    <div class="container">
        <h2 class="mb-4 text-center text-uppercase fw-bold">
            Notificaciones de Pago
        </h2>

        <!-- Tabs to toggle between Clients and Affiliates payments -->
        <div class="mb-4">
            <ul class="nav nav-tabs nav-fill">
                <li class="nav-item">
                    <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#clients">
                        Clientes
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#affiliates">
                        Comercios
                    </a>
                </li>
            </ul>
        </div>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="clients">

                <div class="row g-3">

                    <div v-if="clientsWithPayments.length > 0">
                        <div v-for="client in clientsWithPayments" :key="client.id" class="col-sm-6 col-lg-4 mb-4">
                            <div class="card custom-card h-100 text-center">
                                <div class="card-body d-flex flex-column justify-content-center align-items-center">
                                    <div class="icon-circle mb-3">
                                        <i class="fa-solid fa-file-invoice-dollar"></i>
                                    </div>
                                    <h5 class="mb-3">{{ client.firstName }} {{ client.lastName }}</h5>
                                    <p v-if="client.subscription?.name">
                                        <strong>Suscripción: </strong>
                                        {{ client.subscription.name.charAt(0).toUpperCase() +
                                            client.subscription.name.slice(1) }}
                                    </p>
                                    <p v-if="client.subscription?.lastPaymentDate">
                                        <strong>Fecha: </strong>
                                        {{ formatDate(client.subscription.lastPaymentDate) }}
                                    </p>
                                    <button class="btn btn-outline-success" v-if="client.paymentUrl"
                                        @click="openImgModal(client, client.paymentUrl)">
                                        Ver Comprobante
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="d-flex justify-content-center align-items-center">
                        <div class="text-center">
                            <div class="mb-3 mt-5">
                                <i class="fa-solid fa-hand-holding-dollar text-body text-opacity-25"
                                    style="font-size: 5em"></i>
                            </div>
                            <h5>No hay Pagos.</h5>
                        </div>
                    </div>

                </div>

            </div>
            <div class="tab-pane fade" id="affiliates">

                <div class="row g-3">

                    <div v-if="affiliatesWithPayments.length > 0">
                        <div v-for="affiliate in affiliatesWithPayments" :key="affiliate.id"
                            class="col-sm-6 col-lg-4 mb-4">
                            <div class="card custom-card h-100 text-center">
                                <div class="card-body d-flex flex-column justify-content-center align-items-center">
                                    <div class="icon-circle mb-3">
                                        <i class="fa-solid fa-file-invoice-dollar"></i>
                                    </div>
                                    <h5 class="mb-3">{{ affiliate.companyName }}</h5>
                                    <p v-if="affiliate.subscription?.name">
                                        <strong>Suscripción: </strong>
                                        {{ affiliate.subscription.name.charAt(0).toUpperCase() +
                                            affiliate.subscription.name.slice(1) }}
                                    </p>
                                    <p v-if="affiliate.subscription?.lastPaymentDate">
                                        <strong>Fecha: </strong>
                                        {{ formatDate(affiliate.subscription.lastPaymentDate) }}
                                    </p>
                                    <button class="btn btn-outline-success" v-if="affiliate.paymentUrl"
                                        @click="openImgModal(affiliate, affiliate.paymentUrl)">
                                        Ver Comprobante
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="d-flex justify-content-center align-items-center">
                        <div class="text-center">
                            <div class="mb-3 mt-5">
                                <i class="fa-solid fa-hand-holding-dollar text-body text-opacity-25"
                                    style="font-size: 5em"></i>
                            </div>
                            <h5>No hay Pagos.</h5>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </div>

    <!-- Modal for opening payment capture -->
    <div class="modal fade" id="idImgModal" tabindex="-1" aria-labelledby="qrModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="qrModalLabel">ID</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                    <img :src="modalImageUrl" alt="QR Code" class="img-fluid">
                    <a class="validate btn btn-outline-success btn-sm m-3" href="#"
                        @click.prevent="validatePayment(userModalData)" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                            aria-hidden="true"></span>
                        <span v-else>Validar</span>
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>