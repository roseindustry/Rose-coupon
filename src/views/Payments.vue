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
            clientsWithInstallments: [],
            approvedPayments: [],

            userModalData: null,
            modalImageUrl: '',
            paymentType: '',
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
                        const clientData = {
                            id: key,
                            ...users[key],
                            subscription: users[key].subscription || {},
                            credit: users[key].credit || null
                        };

                        return clientData;
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

                    // Filter clients with credit purchases
                    this.clientsWithInstallments = [];

                    for (const client of this.clients) {
                        if (client.credit && client.credit.main && client.credit.main.purchases) {
                            const purchasesWithPendingCuotas = Object.entries(client.credit.main.purchases).map(([purchaseId, purchase]) => {
                                // Filter cuotas within each purchase
                                const pendingCuotas = purchase.cuotas
                                    ? Object.entries(purchase.cuotas).filter(([cuotaId, cuota]) =>
                                        cuota.paid === false &&
                                        cuota.paymentUpload === true &&
                                        cuota.paidAt
                                    ).map(([cuotaId, cuota]) => ({ ...cuota, cuotaId }))
                                    : [];

                                // Return only purchases with pending cuotas
                                return pendingCuotas.length > 0 ? { ...purchase, purchaseId, cuotas: pendingCuotas } : null;
                            }).filter(Boolean);

                            // If there are any purchases with pending cuotas, add the client to clientsWithInstallments
                            if (purchasesWithPendingCuotas.length > 0) {
                                this.clientsWithInstallments.push({
                                    ...client,
                                    credit: {
                                        main: {
                                            purchases: Object.fromEntries(purchasesWithPendingCuotas.map(p => [p.purchaseId, p]))
                                        }
                                    }
                                });
                            }
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

        // For subscriptions payments
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

        // For credit cuota payments
        async fetchInstallmentsForClient(clientId) {
            try {
                const purchasesRef = dbRef(db, `Users/${clientId}/credit/main/purchases`);
                const snapshot = await get(purchasesRef);

                if (snapshot.exists()) {
                    const purchases = snapshot.val();

                    // Map purchases to include cuotas (installments)
                    return Object.keys(purchases).map(purchaseId => {
                        const purchaseData = purchases[purchaseId];
                        return {
                            purchaseId,
                            productName: purchaseData.productName || 'Unknown Product',
                            cuotas: purchaseData.cuotas || [],
                        };
                    });
                } else {
                    console.warn(`No purchases found for client ${clientId}`);
                    return [];
                }
            } catch (error) {
                console.error(`Error fetching installments for client ${clientId}:`, error);
                return [];
            }
        },

        // Fetch Payment History
        async fetchPaymentHistory(type) {

        },

        openImgModal(user, url, type, purchaseId = null, cuotaId = null) {
            this.userModalData = user;
            this.modalImageUrl = url;
            this.paymentType = type;

            // Set selected purchase and cuota IDs for cuota payment validation
            this.userModalData.selectedPurchaseId = purchaseId;
            this.userModalData.selectedCuotaId = cuotaId;

            new Modal(document.getElementById('idImgModal')).show();
        },

        async validateSubscriptionPayment(user) {
            if (!confirm("¿Está seguro de que desea aprobar este pago?")) {
                return;
            }

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
        async validateCuotaPayment(user) {

            // Directly access the purchase and cuota using the selected IDs as keys
            const selectedPurchase = user.credit.main.purchases[user.selectedPurchaseId];

            if (!selectedPurchase) {
                console.error("Purchase not found for ID:", user.selectedPurchaseId);
                return;
            }

            const selectedCuota = selectedPurchase.cuotas.find(cuota => cuota.cuote == user.selectedCuotaId);;

            if (!selectedCuota) {
                console.error("Cuota not found for ID:", user.selectedCuotaId);
                return;
            }

            if (confirm("¿Está seguro de que desea aprobar este pago?")) {
                try {
                    this.isSubmitting = true;

                    const cuotaRef = dbRef(db, `Users/${user.id}/credit/main/purchases/${selectedPurchase.purchaseId}/cuotas/${selectedCuota.cuotaId}`);
                    await update(cuotaRef, { paid: true });

                    // // Push to approvedPayments history
                    // const selectedPurchase = user.credit.main.purchases[user.selectedPurchaseIndex];
                    // const selectedCuota = selectedPurchase.cuotas[user.selectedCuotaIndex];
                    // this.approvedPayments.push({
                    //     clientName: `${user.firstName} ${user.lastName}`,
                    //     type: 'Cuota',
                    //     amount: selectedCuota.amount,
                    //     dateApproved: new Date().toISOString(),
                    //     paymentDate: this.formatDate(selectedCuota.paidAt),
                    //     details: {
                    //         productName: selectedPurchase.productName,
                    //         cuotaIndex: parseInt(user.selectedCuotaIndex) + 1, // 1-based index for display
                    //     }
                    // });

                    const clientCreditRef = dbRef(db, `Users/${user.id}/credit/main`);

                    // Retrieve the existing availableCredit
                    const clientCreditSnapshot = await get(clientCreditRef);

                    if (clientCreditSnapshot.exists()) {
                        const clientCreditData = clientCreditSnapshot.val();
                        const currentAvailableCredit = clientCreditData.availableCredit || 0; // Default to 0 if it doesn't exist

                        // Calculate the new available credit
                        const newAvailableCredit = currentAvailableCredit + selectedCuota.amount;

                        // Update the availableCredit in the database
                        await update(clientCreditRef, { availableCredit: newAvailableCredit });

                        this.showToast('Pago de Cuota Aprobado.');
                        const modal = Modal.getOrCreateInstance(document.getElementById('idImgModal'));
                        modal.hide();
                        this.fetchClients();
                    }
                } catch (error) {
                    console.error("Error approving cuota payment:", error);
                } finally {
                    this.isSubmitting = false;
                }
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

        <!-- Tabs to toggle between subscriptions and credit cuotas payments -->
        <div class="mb-4">
            <ul class="nav nav-tabs nav-fill">
                <li class="nav-item">
                    <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#suscriptions">
                        Suscripciones
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#installments">
                        Crédito (cuotas) ({{ clientsWithInstallments.length }})
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#history">
                        Historial ({{ approvedPayments.length }})
                    </a>
                </li>
            </ul>
        </div>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="suscriptions">
                <!-- Tabs to toggle between Clients and Affiliates payments -->
                <div class="mb-4">
                    <ul class="nav nav-tabs nav-fill">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#clients">
                                Clientes ({{ clientsWithPayments.length }})
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#affiliates">
                                Comercios ({{ affiliatesWithPayments.length }})
                            </a>
                        </li>
                    </ul>
                </div>

                <div class="tab-content">
                    <div class="tab-pane fade show active" id="clients">
                        <div class="row g-3">
                            <div v-if="clientsWithPayments.length > 0">
                                <div v-for="client in clientsWithPayments" :key="client.id"
                                    class="col-sm-6 col-lg-4 mb-4">
                                    <div class="card custom-card h-100 text-center">
                                        <div
                                            class="card-body d-flex flex-column justify-content-center align-items-center">
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
                                                @click="openImgModal(client, client.paymentUrl, 'subscription')">
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
                                        <div
                                            class="card-body d-flex flex-column justify-content-center align-items-center">
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
                                                @click="openImgModal(affiliate, affiliate.paymentUrl, 'subscription')">
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

            <div class="tab-pane fade" id="installments">
                <div class="row g-3">
                    <div v-if="clientsWithInstallments.length > 0">
                        <div v-for="client in clientsWithInstallments" :key="client.id" class="col-sm-6 col-lg-4 mb-4">
                            <div class="card custom-card h-100 text-center">
                                <div class="card-body d-flex flex-column justify-content-center align-items-center">
                                    <div class="icon-circle mb-3">
                                        <i class="fa-solid fa-file-invoice-dollar"></i>
                                    </div>
                                    <h5 class="mb-3">{{ client.firstName }} {{ client.lastName }}</h5>

                                    <!-- Check if there are any purchases in client.credit.main -->
                                    <div
                                        v-if="client.credit && client.credit.main && Object.keys(client.credit.main.purchases).length > 0">
                                        <div v-for="(purchase, purchaseId) in client.credit.main.purchases"
                                            :key="purchaseId" class="purchase-card mb-4">
                                            <h6 class="text-primary">Producto: {{ purchase.productName }}</h6>

                                            <!-- Iterate over cuotas within each purchase -->
                                            <div v-for="(cuota, cuotaId) in purchase.cuotas" :key="cuotaId">
                                                <div v-if="cuota.paymentUpload && cuota.paymentUrl"
                                                    class="card mb-3 cuota-card">
                                                    <div class="card-body">
                                                        <p class="mb-2">
                                                            <strong>Cuota {{ parseInt(cuotaId) + 1 }}:</strong> ${{
                                                                cuota.amount.toFixed(2) }}
                                                        </p>
                                                        <p class="mb-2">
                                                            <strong>Fecha límite:</strong> {{ formatDate(cuota.date) }}
                                                        </p>
                                                        <p class="mb-3">
                                                            <strong>Fecha de Pago:</strong> {{ formatDate(cuota.paidAt)
                                                            }}
                                                        </p>
                                                        <button class="btn btn-outline-success btn-sm"
                                                            @click="openImgModal(client, cuota.paymentUrl, 'cuota', purchaseId, cuota.cuote)">
                                                            Ver Comprobante
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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
                            <h5>No hay Pagos de cuotas.</h5>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-pane fade" id="history">

                <!-- tabs -->
                <div class="mb-4">
                    <ul class="nav nav-tabs nav-fill">
                        <li class="nav-item">
                            <a class="nav-link active" @click="fetchPaymentHistory('subscriptions')" href="#"
                                data-bs-toggle="tab" data-bs-target="#subsPayments">
                                Pago de Suscripciones
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" @click="fetchPaymentHistory('credit-cuotas')" href="#"
                                data-bs-toggle="tab" data-bs-target="#cuotaPayments">
                                Pago de Cuotas de Crédito
                            </a>
                        </li>
                    </ul>
                </div>

                <div class="tab-content">
                    <div class="tab-pane fade show active" id="subsPayments">
                        <div class="row g-3">
                            <div v-if="approvedPayments.length > 0">
                                <h5>Historial de Pagos Aprobados</h5>
                                <div v-for="payment in approvedPayments" :key="index" class="col-sm-6 col-lg-4 mb-4">
                                    <div class="card custom-card h-100 text-center">

                                        <!-- ADD A BADGE FOR PAYMENT.TYPE 'SUBSCRIPTION OR CUOTA' -->

                                        <div
                                            class="card-body d-flex flex-column justify-content-center align-items-center">
                                            <div class="icon-circle mb-3">
                                                <i class="fa-solid fa-check text-success"></i>
                                            </div>
                                            <h5 class="mb-3">{{ payment.clientName }}</h5>
                                            <h5 class="mb-3">{{ payment.date }}</h5>

                                            <h5 class="mb-3">{{ payment.amount }}</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="tab-pane fade show active" id="cuotaPayments">
                        <div class="row g-3">
                            <div v-if="approvedPayments.length > 0">
                                <h5>Historial de Pagos Aprobados</h5>
                                <div v-for="payment in approvedPayments" :key="index" class="col-sm-6 col-lg-4 mb-4">
                                    <div class="card custom-card h-100 text-center">

                                        <!-- ADD A BADGE FOR PAYMENT.TYPE 'SUBSCRIPTION OR CUOTA' -->

                                        <div
                                            class="card-body d-flex flex-column justify-content-center align-items-center">
                                            <div class="icon-circle mb-3">
                                                <i class="fa-solid fa-check text-success"></i>
                                            </div>
                                            <h5 class="mb-3">{{ payment.clientName }}</h5>
                                            <h5 class="mb-3">{{ payment.date }}</h5>

                                            <h5 class="mb-3">{{ payment.amount }}</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal for opening payment capture -->
    <div class="modal fade" id="idImgModal" tabindex="-1" aria-labelledby="idImgModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="idImgModalLabel">Comprobante</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                    <img :src="modalImageUrl" alt="Comprobante" class="img-fluid">

                    <!-- Conditional button based on payment type -->
                    <a class="validate btn btn-outline-success btn-sm m-3" href="#"
                        v-if="paymentType === 'subscription'"
                        @click.prevent="validateSubscriptionPayment(userModalData)" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                            aria-hidden="true"></span>
                        <span v-else>Aprobar Pago</span>
                    </a>

                    <a class="validate btn btn-outline-success btn-sm m-3" href="#" v-if="paymentType === 'cuota'"
                        @click.prevent="validateCuotaPayment(userModalData)" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                            aria-hidden="true"></span>
                        <span v-else>Aprobar Pago</span>
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>