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
            exchange: null,

            clients: [],
            clientsSubscriptions: [],
            clientsNoSubscriptions: [],
            affiliates: [],
            affiliatesSubscriptions: [],
            affiliatesNoSubscriptions: [],
            plans: [],
            affiliatePlans: [],

            searchQuery: '',
            searchClient: '',
            searchAffiliate: '',
            searchResults: [],
            searchAffResults: [],
            selectedClient: null,
            selectedAffiliate: null,
            selectedPlan: null,

            clientPlan: {
                order: '',
                name: '',
                desc: '',
                price: 0,
                requestLimit: 0,
                icon: ''
            },
            editClientPlanData: {
                id: '',
                order: '',
                name: '',
                desc: '',
                price: 0,
                requestLimit: 0,
                icon: ''
            },
            affiliatePlan: {
                order: '',
                name: '',
                desc: '',
                price: 0,
            },
            editAffiliatePlanData: {
                id: '',
                order: '',
                name: '',
                desc: '',
                price: 0,
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
            filterDate: null,

            paymentFile: null,
            paymentPreview: null,
            paymentDate: null,
            paymentUrl: null,
            isSubmitting: false,
            errorMessage: '',
            paymentModal: null,
            activeTab: 'null',

            loading: false,
            loadingPlans: false,

            currentSub: null,

            amountPaid: 0,
            payDay: null,
            isPaid: false
        };
    },

    computed: {
        // Sorted subscriptions for displaying to Clients or Affiliates in their view
        sortedPlans() {
            const plans = this.role === 'cliente' ? this.plans : this.affiliatePlans;

            return [...plans].sort((a, b) => a.order - b.order);
        },
        // Sorted subscriptions to display to admin
        sortedClientPlans() {
            const plans = this.plans;

            return [...plans].sort((a, b) => a.order - b.order);
        },
        sortedAffiliatePlans() {
            const plans = this.affiliatePlans;

            return [...plans].sort((a, b) => a.order - b.order);
        },
        formattedDesc() {
            return this.sortedPlans.map(plan => ({
                ...plan,
                desc: plan.desc
                    .split('.')
                    .filter(sentence => sentence.trim())
                    .map(sentence => `<li>${sentence.trim()}</li>`)
                    .join('')
            }));
        },

        // 1. Clients with subscriptions
        allFilteredClientsSubscriptions() {
            let filtered = this.clientsSubscriptions;

            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(client => {
                    const fullName = (client.firstName + ' ' + client.lastName).toLowerCase();
                    const identification = String(client.identification).toLowerCase();  // Ensure it's a string
                    const subscriptionName = client.subscriptionName ? client.subscriptionName.toLowerCase() : '';

                    return fullName.includes(query) ||
                        identification.includes(query) ||
                        subscriptionName.includes(query);
                });
            }

            if (this.filterDate) {
                filtered = filtered.filter(client => {
                    const registrationDate = moment(client.createdAt).format('YYYY-MM-DD');
                    return registrationDate === this.filterDate;
                });
            }

            return filtered;
        },
        filteredClientsSubscriptions() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.allFilteredClientsSubscriptions.slice(start, end);
        },

        // 2. Clients without subscriptions
        allFilteredClientsNoSubscriptions() {
            let filtered = this.clientsNoSubscriptions;

            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(client => {
                    const fullName = (client.firstName + ' ' + client.lastName).toLowerCase();
                    const identification = String(client.identification).toLowerCase();  // Ensure it's a string
                    const subscriptionName = client.subscriptionName ? client.subscriptionName.toLowerCase() : '';

                    return fullName.includes(query) ||
                        identification.includes(query) ||
                        subscriptionName.includes(query);
                });
            }

            if (this.filterDate) {
                filtered = filtered.filter(client => {
                    const registrationDate = moment(client.createdAt).format('YYYY-MM-DD');
                    return registrationDate === this.filterDate;
                });
            }

            return filtered;
        },
        filteredClientsNoSubscriptions() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.allFilteredClientsNoSubscriptions.slice(start, end);
        },

        // 3. Affiliates with subscriptions
        allFilteredAffiliatesSubscriptions() {
            let filtered = this.affiliatesSubscriptions;

            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(affiliate => {
                    const name = affiliate.companyName.toLowerCase();
                    const rif = String(affiliate.rif).toLowerCase();
                    const subscriptionName = affiliate.subscriptionName ? affiliate.subscriptionName.toLowerCase() : '';

                    return name.includes(query) ||
                        rif.includes(query) ||
                        subscriptionName.includes(query);
                });
            }

            if (this.filterDate) {
                filtered = filtered.filter(affiliate => {
                    const registrationDate = moment(affiliate.createdAt).format('YYYY-MM-DD');
                    return registrationDate === this.filterDate;
                });
            }

            return filtered;
        },
        filteredAffiliatesSubscriptions() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.allFilteredAffiliatesSubscriptions.slice(start, end);
        },

        // 4. Affiliates without subscriptions
        allFilteredAffiliatesNoSubscriptions() {
            let filtered = this.affiliatesNoSubscriptions;

            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(affiliate => {
                    const name = affiliate.companyName.toLowerCase();
                    const rif = String(affiliate.rif).toLowerCase();
                    const subscriptionName = affiliate.subscriptionName ? affiliate.subscriptionName.toLowerCase() : '';

                    return name.includes(query) ||
                        rif.includes(query) ||
                        subscriptionName.includes(query);
                });
            }

            if (this.filterDate) {
                filtered = filtered.filter(affiliate => {
                    const registrationDate = moment(affiliate.createdAt).format('YYYY-MM-DD');
                    return registrationDate === this.filterDate;
                });
            }

            return filtered;
        },
        filteredAffiliatesNoSubscriptions() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.allFilteredAffiliatesNoSubscriptions.slice(start, end);
        },

        // Total pages calculation for each type
        totalPages() {
            return (type) => {
                switch (type) {
                    case 'clientSubscriptions':
                        return Math.ceil(this.allFilteredClientsSubscriptions.length / this.itemsPerPage);
                    case 'clientNoSubscriptions':
                        return Math.ceil(this.allFilteredClientsNoSubscriptions.length / this.itemsPerPage);
                    case 'affiliateSubscriptions':
                        return Math.ceil(this.allFilteredAffiliatesSubscriptions.length / this.itemsPerPage);
                    case 'affiliateNoSubscriptions':
                        return Math.ceil(this.allFilteredAffiliatesNoSubscriptions.length / this.itemsPerPage);
                    default:
                        return 0;
                }
            };
        },

        // Calculate visible pages for pagination
        visiblePages() {
            return (type) => {
                const totalPages = this.totalPages(type);
                const maxPagesToShow = window.innerWidth < 768 ? 3 : 5;
                let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
                let endPage = Math.min(totalPages, this.currentPage + Math.floor(maxPagesToShow / 2));

                if (endPage - startPage + 1 < maxPagesToShow) {
                    if (startPage === 1) {
                        endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                    } else if (endPage === totalPages) {
                        startPage = Math.max(1, endPage - maxPagesToShow + 1);
                    }
                }

                return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
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
        goToPage(page, type) {
            if (page >= 1 && page <= this.totalPages(type)) {
                this.currentPage = page;
            }
        },

        async createPlan(type) {
            if (type === 'clients') {
                try {
                    const data = {
                        order: this.clientPlan.order,
                        name: this.clientPlan.name,
                        desc: this.clientPlan.desc,
                        price: this.clientPlan.price,
                        requestLimit: this.clientPlan.requestLimit || null,
                        icon: this.clientPlan.icon,
                    };
                    const plansRef = dbRef(db, 'Suscriptions');
                    const newPlanRef = push(plansRef);

                    await set(newPlanRef, data);

                    this.showToast('Suscripción creada con exito!');
                    // Reset form fields
                    this.clientPlan.order = '';
                    this.clientPlan.name = '';
                    this.clientPlan.desc = '';
                    this.clientPlan.price = 0;
                    this.clientPlan.requestLimit = 0;
                    this.clientPlan.icon = '';
                    this.inputIcon = false;

                    console.log('Suscripción creada.');
                    await this.fetchPlans();
                } catch (error) {
                    console.error('Error creating subscription:', error);
                    alert('La creación de la Suscripción falló.');
                    return null;
                }
            } else {
                try {
                    const data = {
                        order: this.affiliatePlan.order,
                        name: this.affiliatePlan.name,
                        desc: this.affiliatePlan.desc,
                        price: this.affiliatePlan.price,
                    };
                    const plansRef = dbRef(db, 'Affiliate_suscriptions');
                    const newPlanRef = push(plansRef);

                    await set(newPlanRef, data);

                    this.showToast('Suscripción creada con exito!');
                    // Reset form fields
                    this.affiliatePlan.order = '';
                    this.affiliatePlan.name = '';
                    this.affiliatePlan.desc = '';
                    this.affiliatePlan.price = 0;

                    console.log('Suscripción creada.');
                    await this.fetchAffiliatePlans();
                } catch (error) {
                    console.error('Error creating subscription:', error);
                    alert('La creación de la Suscripción falló.');
                    return null;
                }
            }
        },
        editPlan(plan, type) {
            // Populate the modal fields with the plan data
            if (type === 'clients') {
                this.editClientPlanData = {
                    ...plan
                };
            } else if (type === 'affiliates') {
                this.editAffiliatePlanData = {
                    ...plan
                };
            }

            // Hide current modal
            const currentModal = Modal.getInstance(document.getElementById('assignModal'));
            currentModal.hide();

            // Open the edit modal
            const modal = new Modal(document.getElementById('editPlanModal'));
            modal.show();
        },
        async updatePlan(planId, type) {
            try {
                let planRef;
                const updateData = {};

                if (type === 'clients') {
                    planRef = dbRef(db, `Suscriptions/${planId}`);

                    if (this.editClientPlanData.order) updateData.order = this.editClientPlanData.order;
                    if (this.editClientPlanData.name) updateData.name = this.editClientPlanData.name;
                    if (this.editClientPlanData.desc) updateData.desc = this.editClientPlanData.desc;
                    if (this.editClientPlanData.price) updateData.price = this.editClientPlanData.price;
                    if (this.editClientPlanData.requestLimit) updateData.requestLimit = this.editClientPlanData.requestLimit;
                    if (this.editClientPlanData.icon) updateData.icon = this.editClientPlanData.icon;
                } else if (type === 'affiliates') {
                    planRef = dbRef(db, `Affiliate_suscriptions/${planId}`);

                    if (this.editAffiliatePlanData.order) updateData.order = this.editAffiliatePlanData.order;
                    if (this.editAffiliatePlanData.name) updateData.name = this.editAffiliatePlanData.name;
                    if (this.editAffiliatePlanData.desc) updateData.desc = this.editAffiliatePlanData.desc;
                    if (this.editAffiliatePlanData.price) updateData.price = this.editAffiliatePlanData.price;
                } else {
                    throw new Error("Invalid subscription type");
                }



                if (Object.keys(updateData).length === 0) {
                    throw new Error("No se introdujo data para actualizar");
                }

                await update(planRef, updateData);
                console.log("Suscription updated successfully");

                // Success notification
                this.showToast('Suscripción actualizada con exito!');
                // Close the modal after saving
                const modal = Modal.getInstance(document.getElementById('editPlanModal'));
                modal.hide();
                // Open assignModal back
                const assignModal = Modal.getInstance(document.getElementById('assignModal'));
                assignModal.show();

                if (type === 'clients') {
                    await this.fetchPlans();
                } else if (type === 'affiliates') {
                    await this.fetchAffiliatePlans();
                }

            } catch (error) {
                console.error("Error updating suscription:", error);
            }
        },
        async deletePlan(planId, index) {
            console.log(planId);

            // Ask for confirmation
            if (!confirm("¿Desea borrar esta suscripción?")) {
                return; // Exit if the user cancels the action
            }

            try {
                // Check if we're deleting a client or affiliate plan
                let planRef;
                if (this.activeTab === 'clients') {
                    planRef = dbRef(db, `Suscriptions/${planId}`);
                    await remove(planRef);
                    // Remove the plan from local state (clients)
                    this.plans.splice(index, 1);
                } else {
                    planRef = dbRef(db, `Affiliate_suscriptions/${planId}`);
                    await remove(planRef);
                    // Remove the plan from local state (affiliates)
                    this.affiliatePlans.splice(index, 1);
                }

                // Show success message after deletion
                this.showToast('Suscripción eliminada');

            } catch (error) {
                console.error('Error deleting subscription:', error);
                alert('La eliminación de la suscripción falló.');
            }
        },

        async fetchClients() {
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                this.loading = true;
                const snapshot = await get(clientRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Call the HTTP-triggered Cloud Function using fetch
                    const response = await fetch("https://us-central1-rose-app-e062e.cloudfunctions.net/getAllUsers", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });

                    // Check if the response is okay
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // Parse the response data
                    const authUsers = await response.json();

                    this.clients = Object.entries(users).map(([uid, user]) => {
                        const authUser = authUsers.users.find(auth => auth.uid === uid);
                        return {
                            uid,
                            ...user,
                            createdAt: authUser ? authUser.creationTime : null,
                        };
                    });

                    // const clientsToday = this.clients.filter(client =>
                    //     client.createdAt.isSame(moment(), 'day')
                    // );

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
            } finally {
                this.loading = false;
            }
        },
        async fetchAffiliates() {
            const role = 'afiliado';
            const affRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(affRef);

                if (snapshot.exists()) {
                    const affiliates = snapshot.val();

                    // Since Firebase data is an object, map to array for easier use
                    this.affiliates = Object.keys(affiliates).map(key => ({
                        id: key,
                        ...affiliates[key]
                    }));
                    // Loop through each client to fetch their subscription data
                    for (const aff of this.affiliates) {
                        // Check if the client has a subscription object with a subscription_id
                        if (aff.subscription && aff.subscription.subscription_id) {
                            const subscriptionId = aff.subscription.subscription_id;
                            const subscriptionRef = dbRef(db, `Affiliate_suscriptions/${subscriptionId}`);
                            const subscriptionSnapshot = await get(subscriptionRef);

                            if (subscriptionSnapshot.exists()) {
                                // Add subscription name to client data
                                aff.subscriptionName = subscriptionSnapshot.val().name || "Suscripción desconocida";
                            } else {
                                console.log(`Subscription with ID ${subscriptionId} not found.`);
                                aff.subscriptionName = "Suscripción desconocida";
                            }
                        } else {
                            aff.subscriptionName = "Sin suscripción";
                        }
                    }

                    this.affiliatesSubscriptions = this.affiliates.filter((aff) => aff.subscription);
                    this.affiliatesNoSubscriptions = this.affiliates.filter((aff) => !aff.subscription);
                } else {
                    this.affiliates = [];  // No clients found
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.affiliates = [];
            }
        },

        async fetchPlans() {
            try {
                this.loadingPlans = true;

                const plansRef = query(dbRef(db, 'Suscriptions'));
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
            } finally {
                this.loadingPlans = false;
            }
        },
        async fetchAffiliatePlans() {
            const plansRef = query(dbRef(db, 'Affiliate_suscriptions'));
            try {
                this.loadingPlans = true;

                const snapshot = await get(plansRef);

                if (snapshot.exists()) {
                    const plans = snapshot.val();

                    // Since Firebase data is an object, map to array for easier use
                    this.affiliatePlans = Object.keys(plans).map(key => ({
                        id: key,
                        ...plans[key]
                    }));
                } else {
                    this.affiliatePlans = [];  // No subscriptions found
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
                this.affiliatePlans = [];
            } finally {
                this.loadingPlans = false;
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
            console.log('Selected client:', client.uid);
            this.searchClient = '';
            this.searchResults = [];
        },
        searchAffiliates() {
            if (!this.searchAffiliate.trim()) {
                this.searchAffResults = [];
                this.searchResultsSubscriptions = [];
                this.searchResultsNoSubscriptions = [];
                return;
            }

            const searchInput = this.searchAffiliate.toLowerCase();

            // Search in ALL affiliates
            this.searchAffResults = this.affiliates.filter(affiliate => {
                // Ensure affiliate.rif and other fields are strings
                const rif = (affiliate.rif || '').toString().toLowerCase();
                const name = (affiliate.companyName).toLowerCase();

                return rif.includes(searchInput) || name.includes(searchInput);
            });
            // Search in affiliates with subscriptions
            this.searchResultsSubscriptions = this.affiliatesSubscriptions.filter(affiliate => {
                const rif = (affiliate.rif || '').toString().toLowerCase();
                const name = (affiliate.companyName).toLowerCase();
                return rif.includes(searchInput) || name.includes(searchInput);
            });

            // Search in affiliates without subscriptions
            this.searchResultsNoSubscriptions = this.affiliatesNoSubscriptions.filter(affiliate => {
                const rif = (affiliate.rif || '').toString().toLowerCase();
                const name = (affiliate.companyName).toLowerCase();
                return rif.includes(searchInput) || name.includes(searchInput);
            });
        },
        selectAffiliate(affiliate) {
            this.selectedAffiliate = affiliate;
            console.log('Selected affiliate:', affiliate.id);
            this.searchAffiliate = '';
            this.searchAffResults = [];
        },
        selectPlan(planName) {
            if (this.selectedPlan === planName) {
                this.selectedPlan = ''; // Deselect the plan
            } else {
                this.selectedPlan = planName; // Select the new plan
            }
        },

        openAssignModal(user, type) {
            if (type === 'client') {
                this.selectedClient = user;
                this.searchClient = '';
                this.searchResults = [];
            } else {
                this.selectedAffiliate = user;
                this.searchAffiliate = '';
                this.searchAffResults = [];
            }

            // Open the modal by triggering the Bootstrap modal show method
            const assignModal = new Modal(document.getElementById('assignModal'));
            assignModal.show();
        },

        // Admin can assign a subscription
        async assignPlan(type) {
            let user = null;
            let userId = null;
            let userName;
            let selectedPlanDetails;

            if (!this.selectedPlan) {
                alert('Por favor seleccione una suscripción antes de asignar.');
                return;
            }

            if (type === 'clients') {
                if (!this.selectedClient) {
                    alert('Por favor seleccione un cliente antes de asignar una suscripción.');
                    return;
                }

                userId = this.selectedClient.uid;
                // Find the selected client's data from the clients array
                user = this.clients.find(client => client.uid === userId);
                userName = `${user.firstName} ${user.lastName}`;

                // Find the selected plan object from the plans array
                selectedPlanDetails = this.plans.find(plan => plan.name === this.selectedPlan);
            } else if (type === 'affiliates') {
                if (!this.selectedAffiliate) {
                    alert('Por favor seleccione un afiliado antes de asignar una suscripción.');
                    return;
                }

                userId = this.selectedAffiliate.id;
                // Find the selected client's data from the clients array
                user = this.affiliates.find(aff => aff.id === userId);
                userName = `${user.companyName}`;

                // Find the selected plan object from the plans array
                selectedPlanDetails = this.affiliatePlans.find(plan => plan.name === this.selectedPlan);
            }



            if (!selectedPlanDetails) {
                alert('Error al seleccionar el plan. Por favor, intente de nuevo.');
                return;
            }

            // Prepare subscription details
            const subscriptionData = {
                subscription_id: selectedPlanDetails.id,
                status: true,
                payDay: new Date(this.payDay).toISOString(),
                isPaid: this.isPaid,
            };

            try {
                this.loading = true;

                // Assign the subscription details to the client's data in Firebase
                const userPlanRef = dbRef(db, `Users/${userId}/subscription`);
                await update(userPlanRef, subscriptionData);

                // Notify Client
                const appUrl = 'https://app.rosecoupon.com';
                const clientEmailPayload = {
                    to: user.email,
                    message: {
                        subject: `Suscripción ${selectedPlanDetails.name.toUpperCase()} activada`,
                        text: `Hola ${userName}, se le ha activado la Suscripción ${selectedPlanDetails.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
                        html: `<p>Hola ${userName}, se le ha activado la Suscripción ${selectedPlanDetails.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`
                    },
                };
                await this.sendNotificationEmail(clientEmailPayload);

                // Notify Admin
                const adminEmailPayload = {
                    to: 'roseindustry11@gmail.com',
                    message: {
                        subject: `Nuevo cliente suscrito al Plan ${selectedPlanDetails.name.toUpperCase()}`,
                        text: `Un nuevo cliente, ${userName}, se ha suscrito al plan ${selectedPlanDetails.name.toUpperCase()}.`,
                        html: `<p>Un nuevo cliente, ${userName}, se ha suscrito al plan ${selectedPlanDetails.name.toUpperCase()}.</p>`
                    },
                };
                await this.sendNotificationEmail(adminEmailPayload);

                this.showToast('Suscripción asignada con éxito!');
                // Reset selection after assigning the plan
                this.selectedPlan = null;
                this.selectedClient = null;
                this.selectedAffiliate = null;
                this.searchClient = '';
                this.searchAffiliate = '';
                this.payDay = null;
                this.isPaid = false;
                this.fetchClients();
                this.fetchAffiliates();
            } catch (error) {
                console.error('Error assigning plan:', error);
                alert('La asignación de la suscripción falló.');
            } finally {
                this.loading = false;
            }
        },
        // Clients and Affiliates can contract a subscription
        async contractPlan(plan) {
            if (confirm(`¿Seguro que desea cambiar su suscripción a ${plan.name.toUpperCase()}?`)) {
                const userId = this.userId;
                this.selectedPlan = plan;

                if (!this.userId) {
                    alert('Usuario no identificado.');
                    return;
                }

                if (!this.selectedPlan) {
                    alert('Por favor seleccione una suscripción antes de contratar.');
                    return;
                }

                // Determine whether the user is a client or an affiliate                               
                let user;
                let userType = ''; // To differentiate in messages/emails
                let userName = '';

                const userRef = dbRef(db, `Users/${userId}`);
                const userSnapshot = await get(userRef);
                user = userSnapshot.exists() ? userSnapshot.val() : null;

                if (this.role === 'cliente') {
                    userType = 'cliente';
                    userName = `${user.firstName} ${user.lastName}`;
                } else if (this.role === 'afiliado') {
                    userType = 'afiliado';
                    userName = user.companyName;
                }

                if (!user) {
                    alert(`No se pudo encontrar el ${userType}.`);
                    return;
                }

                // Calculate payDay (one month from today)
                const payDay = moment().add(1, 'month').toISOString();

                // Prepare subscription details
                const subscriptionData = {
                    subscription_id: plan.id,
                    status: false, // Set the default status as false 'inactive until payment confirmed'
                    payDay: payDay,
                };

                // Proceed to open modal with Payment methods and payment upload
                if (plan.price === 0 && this.role === 'cliente') {
                    try {
                        // Assign the subscription details to the client's data in Firebase
                        const userPlanRef = dbRef(db, `Users/${userId}/subscription`);
                        await update(userPlanRef, subscriptionData);

                        // Notify user (client/affiliate)
                        const appUrl = 'https://app.rosecoupon.com';
                        const userEmailPayload = {
                            to: user.email,
                            message: {
                                subject: `Suscripción ${plan.name.toUpperCase()} activada`,
                                text: `Hola ${userName}, se le ha activado la Suscripción ${plan.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
                                html: `<p>Hola ${userName}, se le ha activado la Suscripción ${plan.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`
                            },
                        };
                        await this.sendNotificationEmail(userEmailPayload);

                        // Notify Admin
                        const adminEmailPayload = {
                            to: 'roseindustry11@gmail.com',
                            message: {
                                subject: `Nuevo cliente suscrito al Plan ${plan.name.toUpperCase()}`,
                                text: `Un nuevo cliente, ${userName}, se ha suscrito al plan ${plan.name.toUpperCase()}.`,
                                html: `<p>Un nuevo cliente, ${userName}, se ha suscrito al plan ${plan.name.toUpperCase()}.</p>`
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
                const userId = this.userId;
                let user;
                let userType = '';
                let userName = '';

                const currentUserRef = dbRef(db, `Users/${userId}`);
                const userSnapshot = await get(currentUserRef);
                user = userSnapshot.exists() ? userSnapshot.val() : null;

                // Calculate payDay (one month from today)
                const payDay = moment().add(1, 'month').toISOString();

                // Get the current date to set the paymentDate
                const uploadPaymentDate = new Date(this.paymentDate);
                const formattedDate = uploadPaymentDate.toISOString();

                // Prepare subscription details
                const subscriptionData = {
                    subscription_id: plan.id,
                    status: false, // Set the default status as false 'Inactive' until payment approval
                    payDay: payDay,
                    isPaid: false, // Set the default as unpaid
                    paymentUploaded: true,
                    lastPaymentDate: formattedDate,
                };

                const paymentDetails = {
                    subscription_id: plan.id,
                    client_id: userId,
                    amount: this.amountPaid,
                    date: formattedDate,
                    approved: false,
                    type: 'subscription'
                }

                if (this.role === 'cliente') {
                    userType = 'cliente';
                    userName = `${user.firstName} ${user.lastName}`;  // Full name for clients
                } else if (this.role === 'afiliado') {
                    userType = 'afiliado';
                    userName = user.companyName;  // Use companyName for affiliates
                }

                // Upload capture
                const paymentUrl = await this.uploadPaymentFile(this.paymentFile, this.paymentDate, userType);
                console.log('File uploaded successfully:', paymentUrl);

                // Save the payment to the payments collection
                const paymentRef = dbRef(db, `Payments/${userId}-${formattedDate.split('T')[0]}`);
                await set(paymentRef, paymentDetails);

                // Update user collection
                const userRef = dbRef(db, `Users/${userId}/subscription`);
                await update(userRef, subscriptionData);

                // Notify client
                const appUrl = 'https://app.rosecoupon.com';
                const userEmailPayload = {
                    to: user.email,
                    message: {
                        subject: `Suscripción ${plan.name.toUpperCase()} activada`,
                        text: `Hola ${userName}, se le ha activado la Suscripción ${plan.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
                        html: `<p>Hola ${userName}, se le ha activado la Suscripción ${plan.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`
                    },
                };
                await this.sendNotificationEmail(userEmailPayload);

                // Notify Admin
                const adminEmailPayload = {
                    to: 'roseindustry11@gmail.com',
                    message: {
                        subject: `Usuario ${this.role.toUpperCase()} se ha suscrito al Plan ${plan.name.toUpperCase()}`,
                        text: `El ${this.role.toUpperCase()}, ${userName}, se ha suscrito al plan ${plan.name.toUpperCase()}.`,
                        html: `<p>El ${this.role.toUpperCase()}, ${userName}, se ha suscrito al plan ${plan.name.toUpperCase()}.</p>`
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

                // Redirect to Dashboard
                if (this.role === 'cliente') {
                    this.$router.push('/client-portal');
                } else if (this.role === 'afiliado') {
                    this.$router.push('/affiliate-portal');
                }

            } catch (error) {
                console.error('Error during uploading:', error);
                this.errorMessage = 'Error al subir el archivo, por favor intente nuevamente.';
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        async uploadPaymentFile(file, date, type) {
            // Define storage reference for front or back ID file
            const fileName = `${date}-capture.${file.name.split('.').pop()}`;
            const fileRef = storageRef(storage, `payment-captures/${type}/${this.userId}-${this.userName}/${fileName}`);

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
            this.selectedAffiliate = null;
            this.selectedPlan = null;
        },
        deselectClient() {
            this.selectedClient = null;
        },
        deselectAffiliate() {
            this.selectedAffiliate = null;
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
        clearDateFilter() {
            this.filterDate = null;
        },

        async setExchange() {
            if (confirm("¿Desea asignar este nueva tasa de cambio a la app?")) {
                const creditRef = dbRef(db, `Exchange`);
                try {
                    const value = {
                        value: parseFloat(this.exchange),
                    }
                    await update(creditRef, value);

                    this.showToast('Tasa actualizada!');

                    // Reset form fields
                    await this.fetchCurrentExchange();
                } catch (error) {
                    console.error('Error setting exchange value:', error);
                    alert('No se pudo editar el valor.');
                }
            }
        },
        async fetchCurrentExchange() {
            try {
                const exchangeRef = dbRef(db, `Exchange`);
                const exchangeSnapshot = await get(exchangeRef);

                if (exchangeSnapshot.exists()) {
                    const exchangeData = exchangeSnapshot.val();
                    this.exchange = parseFloat(exchangeData.value).toFixed(2);
                } else {
                    console.log('No exchange value found.');
                    this.exchange = 0;
                }
            } catch (error) {
                console.error('Error fetching current exchange value:', error);
                this.exchange = 0;
            }
        },

        setActiveTab(type) {
            if (type) {
                this.activeTab = type;
                console.log(this.activeTab)
            }
        },
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;

        await this.fetchCurrentExchange();

        if (this.role === 'admin') {
            this.activeTab = 'clients';
            await this.fetchClients();
            await this.fetchAffiliates();
            await this.fetchPlans();
            await this.fetchAffiliatePlans();
        }

        if (this.role === 'cliente' || this.role === 'afiliado') {
            // Handle client selection from query params
            const clientSubscriptionId = this.$route.query.clientSubscriptionId;

            if (clientSubscriptionId) {
                // this.loading = true;
                this.currentSub = clientSubscriptionId;
                console.log(clientSubscriptionId);
                // await this.fetchUserSubscription(clientSubscriptionId);
            }
        }

        if (this.role === 'cliente') {
            await this.fetchPlans();
        }

        if (this.role === 'afiliado') {
            await this.fetchAffiliatePlans();
        }

    },
};
</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Suscripciones
    </h2>

    <!-- Admin view -->
    <div v-if="this.role === 'admin'" class="container">

        <div class="d-flex justify-content-center">
            <a href="#" class="btn btn-theme me-2 mb-3 d-inline-flex justify-content-center" data-bs-toggle="modal"
                data-bs-target="#setExchange" style="width: auto;">
                <i class="fa fa-calculator fa-fw me-1"></i> Tasa de cambio
            </a>
        </div>


        <!-- Tabs to toggle between Clients and Affiliates subscriptios -->
        <div>
            <ul class="nav nav-tabs nav-fill">
                <li class="nav-item">
                    <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#clients"
                        @click="setActiveTab('clients')">
                        Clientes
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#affiliates"
                        @click="setActiveTab('affiliates')">
                        Comercios
                    </a>
                </li>
            </ul>
        </div>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="clients">
                <!-- Buttons -->
                <div class="d-flex justify-content-end align-items-center mt-5 mb-5">
                    <a href="#" class="btn btn-theme me-2" data-bs-toggle="modal" data-bs-target="#assignModal">
                        <i class="fa fa-circle-check fa-fw me-1"></i> Ver planes
                    </a>
                </div>

                <!-- Tabs -->
                <div>
                    <ul class="nav nav-tabs nav-fill">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#subscriptions">
                                Con Suscripción
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#noSubscriptions">
                                Sin Suscripción
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

                            <div class="d-flex justify-content-center align-items-center m-4">
                                <input type="date" v-model="filterDate" class="form-control me-2"
                                    style="width: auto;" />
                                <button class="btn btn-theme" @click="clearDateFilter">Limpiar filtro</button>
                            </div>

                            <div class="results-info text-center mb-3"
                                v-if="!loading && filteredClientsSubscriptions.length">
                                <p>Mostrando {{ filteredClientsSubscriptions.length }} resultados de
                                    {{ allFilteredClientsSubscriptions.length }}</p>
                            </div>

                            <table class="table text-center table-responsive">
                                <thead>
                                    <tr>
                                        <th scope="col">Status</th>
                                        <th scope="col">Cliente</th>
                                        <th scope="col">Email</th>
                                        <th scope="col">Cédula</th>
                                        <th scope="col">Suscripción</th>
                                    </tr>
                                </thead>
                                <tbody v-if="!loading">
                                    <tr v-for="client in filteredClientsSubscriptions" :key="client.id">
                                        <td
                                            :class="{ 'text-success': client.isVerified, 'text-danger': !client.isVerified }">
                                            <i
                                                :class="client.isVerified ? 'fa-solid fa-user-check' : 'fa-solid fa-user-times'"></i>
                                        </td>
                                        <td>{{ client.firstName + ' ' + client.lastName }}</td>
                                        <td>{{ client.email }}</td>
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
                                <div v-if="loading" class="d-flex justify-content-center align-items-center m-4">
                                    <span class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true"></span>
                                </div>
                            </table>
                            <!-- Pagination Controls -->
                            <nav class="mt-4" v-if="totalPages('clientSubscriptions') > 1" aria-label="Page navigation">
                                <ul class="pagination justify-content-center flex-wrap">
                                    <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                        <button class="page-link"
                                            @click="goToPage(currentPage - 1, 'clientSubscriptions')"
                                            :disabled="currentPage === 1">Anterior</button>
                                    </li>
                                    <li v-for="page in visiblePages('clientSubscriptions')" :key="page"
                                        class="page-item" :class="{ active: page === currentPage }">
                                        <button class="page-link" @click="goToPage(page, 'clientSubscriptions')">{{ page
                                            }}</button>
                                    </li>
                                    <li class="page-item"
                                        :class="{ disabled: currentPage === totalPages('clientSubscriptions') }">
                                        <button class="page-link"
                                            @click="goToPage(currentPage + 1, 'clientSubscriptions')"
                                            :disabled="currentPage === totalPages('clientSubscriptions')">Siguiente</button>
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

                            <div class="results-info text-center mb-3"
                                v-if="!loading && filteredClientsNoSubscriptions.length">
                                <p>Mostrando {{ filteredClientsNoSubscriptions.length }} resultados de
                                    {{ allFilteredClientsNoSubscriptions.length }}</p>
                            </div>

                            <table class="table text-center table-responsive">
                                <thead>
                                    <tr>
                                        <th scope="col">Cliente</th>
                                        <th scope="col">Cédula</th>
                                        <th scope="col">Suscripción</th>
                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody v-if="!loading">
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
                                            <button v-if="!client.subscription"
                                                class="btn btn-outline-success btn-assign"
                                                @click.prevent="openAssignModal(client, 'client')">
                                                Asignar suscripción
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                                <div v-if="loading" class="d-flex justify-content-center align-items-center m-4">
                                    <span class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true"></span>
                                </div>
                            </table>
                            <!-- Pagination Controls -->
                            <nav class="mt-4" v-if="totalPages('clientNoSubscriptions') > 1"
                                aria-label="Page navigation">
                                <ul class="pagination justify-content-center flex-wrap">
                                    <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                        <button class="page-link"
                                            @click="goToPage(currentPage - 1, 'clientNoSubscriptions')"
                                            :disabled="currentPage === 1">Anterior</button>
                                    </li>
                                    <li v-for="page in visiblePages('clientNoSubscriptions')" :key="page"
                                        class="page-item" :class="{ active: page === currentPage }">
                                        <button class="page-link" @click="goToPage(page, 'clientNoSubscriptions')">{{
                                            page }}</button>
                                    </li>
                                    <li class="page-item"
                                        :class="{ disabled: currentPage === totalPages('clientNoSubscriptions') }">
                                        <button class="page-link"
                                            @click="goToPage(currentPage + 1, 'clientNoSubscriptions')"
                                            :disabled="currentPage === totalPages('clientNoSubscriptions')">Siguiente</button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tab-pane fade" id="affiliates">
                <!-- Buttons -->
                <div class="d-flex justify-content-end align-items-center mt-5 mb-5">

                    <a href="#" class="btn btn-theme me-2" data-bs-toggle="modal" data-bs-target="#assignModal">
                        <i class="fa fa-circle-check fa-fw me-1"></i> Ver planes
                    </a>
                </div>

                <!-- Tabs -->
                <div>
                    <ul class="nav nav-tabs nav-fill">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" data-bs-toggle="tab"
                                data-bs-target="#affiliateSubscriptions">
                                Con Suscripción
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-bs-toggle="tab"
                                data-bs-target="#affiliateNoSubscriptions">
                                Sin Suscripción
                            </a>
                        </li>
                    </ul>
                </div>

                <!-- Affiliates -->
                <div class="tab-content">
                    <!-- with subscriptions -->
                    <div class="tab-pane fade h-100 show active" id="affiliateSubscriptions">
                        <div class="container mt-4">
                            <input v-model="searchQuery" placeholder="Filtrar comercio por nombre o rif..."
                                class="form-control mb-3" />

                            <div class="results-info text-center mb-3"
                                v-if="!loading && filteredAffiliatesSubscriptions.length">
                                <p>Mostrando {{ filteredAffiliatesSubscriptions.length }} resultados de
                                    {{ allFilteredAffiliatesSubscriptions.length }}</p>
                            </div>

                            <table class="table text-center table-responsive">
                                <thead>
                                    <tr>
                                        <th scope="col">Comercio</th>
                                        <th scope="col">RIF</th>
                                        <th scope="col">Suscripción</th>
                                    </tr>
                                </thead>
                                <tbody v-if="!loading">
                                    <tr v-for="aff in filteredAffiliatesSubscriptions" :key="aff.id">
                                        <td>{{ aff.companyName }}</td>
                                        <td>{{ aff.rif }}</td>
                                        <td>
                                            <span v-if="aff.subscription" class="badge bg-success">
                                                {{ aff.subscriptionName.charAt(0).toUpperCase() +
                                                    aff.subscriptionName.slice(1) }}
                                            </span>
                                            <span v-else class="badge bg-danger">
                                                Sin suscripción
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                                <div v-if="loading" class="d-flex justify-content-center align-items-center m-4">
                                    <span class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true"></span>
                                </div>
                            </table>
                            <!-- Pagination Controls -->
                            <nav class="mt-4" v-if="totalPages('affiliateSubscriptions') > 1"
                                aria-label="Page navigation">
                                <ul class="pagination justify-content-center flex-wrap">
                                    <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                        <button class="page-link"
                                            @click="goToPage(currentPage - 1, 'affiliateSubscriptions')"
                                            :disabled="currentPage === 1">Anterior</button>
                                    </li>
                                    <li v-for="page in visiblePages('affiliateSubscriptions')" :key="page"
                                        class="page-item" :class="{ active: page === currentPage }">
                                        <button class="page-link" @click="goToPage(page, 'affiliateSubscriptions')">{{
                                            page }}</button>
                                    </li>
                                    <li class="page-item"
                                        :class="{ disabled: currentPage === totalPages('affiliateSubscriptions') }">
                                        <button class="page-link"
                                            @click="goToPage(currentPage + 1, 'affiliateSubscriptions')"
                                            :disabled="currentPage === totalPages('affiliateSubscriptions')">Siguiente</button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <!-- without subscriptions -->
                    <div class="tab-pane fade h-100" id="affiliateNoSubscriptions">
                        <div class="container mt-4">
                            <input v-model="searchQuery" placeholder="Filtrar cliente por nombre o cédula..."
                                class="form-control mb-3" />

                            <div class="results-info text-center mb-3"
                                v-if="!loading && filteredAffiliatesNoSubscriptions.length">
                                <p>Mostrando {{ filteredAffiliatesNoSubscriptions.length }} resultados de
                                    {{ allFilteredAffiliatesNoSubscriptions.length }}</p>
                            </div>

                            <table class="table text-center table-responsive">
                                <thead>
                                    <tr>
                                        <th scope="col">Comercio</th>
                                        <th scope="col">RIF</th>
                                        <th scope="col">Suscripción</th>

                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody v-if="!loading">
                                    <tr v-for="aff in filteredAffiliatesNoSubscriptions" :key="aff.id">
                                        <td>{{ aff.companyName }}</td>
                                        <td>{{ aff.rif }}</td>
                                        <td>
                                            <span v-if="aff.subscription" class="badge bg-success">
                                                {{ aff.subscriptionName.charAt(0).toUpperCase() +
                                                    aff.subscriptionName.slice(1) }}
                                            </span>
                                            <span v-else class="badge bg-danger">
                                                Sin suscripción
                                            </span>
                                        </td>
                                        <td>
                                            <button v-if="!aff.subscription" class="btn btn-outline-success"
                                                @click.prevent="openAssignModal(aff, 'affiliate')">
                                                Asignar suscripción
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                                <div v-if="loading" class="d-flex justify-content-center align-items-center m-4">
                                    <span class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true"></span>
                                </div>
                            </table>
                            <!-- Pagination Controls -->
                            <nav class="mt-4" v-if="totalPages('affiliateNoSubscriptions') > 1"
                                aria-label="Page navigation">
                                <ul class="pagination justify-content-center flex-wrap">
                                    <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                        <button class="page-link"
                                            @click="goToPage(currentPage - 1, 'affiliateNoSubscriptions')"
                                            :disabled="currentPage === 1">Anterior</button>
                                    </li>
                                    <li v-for="page in visiblePages('affiliateNoSubscriptions')" :key="page"
                                        class="page-item" :class="{ active: page === currentPage }">
                                        <button class="page-link" @click="goToPage(page, 'affiliateNoSubscriptions')">{{
                                            page }}</button>
                                    </li>
                                    <li class="page-item"
                                        :class="{ disabled: currentPage === totalPages('affiliateNoSubscriptions') }">
                                        <button class="page-link"
                                            @click="goToPage(currentPage + 1, 'affiliateNoSubscriptions')"
                                            :disabled="currentPage === totalPages('affiliateNoSubscriptions')">Siguiente</button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ADMIN MODALS -->
        <!-- Create Plan Modal -->
        <div class="modal fade" id="createPlan" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div v-if="this.activeTab === 'clients'" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Registra un nuevo Plan de Suscripción para clientes</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Orden <span class="text-danger">*</span></label>
                            <input v-model="clientPlan.order" type="number" class="form-control form-control-lg fs-15px"
                                value="" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre <span class="text-danger">*</span></label>
                            <input v-model="clientPlan.name" type="text" class="form-control form-control-lg fs-15px"
                                value="" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción <span class="text-danger">*</span></label>
                            <textarea v-model="clientPlan.desc" class="form-control form-control-lg fs-15px" rows="5"
                                required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Precio <span class="text-danger">*</span></label>
                            <input v-model="clientPlan.price" type="number" class="form-control form-control-lg fs-15px"
                                value="" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Número de Solicitudes de Cupones <span
                                    class="text-danger">*</span></label>
                            <input v-model="clientPlan.requestLimit" type="number"
                                class="form-control form-control-lg fs-15px" value="" />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Icono <span class="text-danger">*</span></label>
                            <!-- Option 1: Dropdown to select a FontAwesome icon for the subscription -->
                            <div v-if="!inputIcon" class="dropdown">
                                <button class="btn btn-secondary dropdown-toggle" type="button" id="iconDropdown"
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                    <i :class="clientPlan.icon"></i> <!-- Display selected icon here -->
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
                            <input v-if="inputIcon" v-model="clientPlan.icon" type="text" class="form-control mt-4" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="createPlan(this.activeTab)">Guardar</button>
                    </div>
                </div>
                <div v-else class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Registra un nuevo Plan de Suscripción para Comercios</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Orden <span class="text-danger">*</span></label>
                            <input v-model="affiliatePlan.order" type="number"
                                class="form-control form-control-lg fs-15px" value="" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre <span class="text-danger">*</span></label>
                            <input v-model="affiliatePlan.name" type="text" class="form-control form-control-lg fs-15px"
                                value="" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción <span class="text-danger">*</span></label>
                            <textarea v-model="affiliatePlan.desc" class="form-control form-control-lg fs-15px" rows="5"
                                required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Precio <span class="text-danger">*</span></label>
                            <input v-model="affiliatePlan.price" type="number"
                                class="form-control form-control-lg fs-15px" value="" required />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="createPlan(this.activeTab)">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Edit Plan Modal -->
        <div class="modal fade" id="editPlanModal" tabindex="-1" aria-labelledby="editPlanModalLabel"
            aria-hidden="true">
            <div class="modal-dialog">
                <div v-if="this.activeTab === 'clients'" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editPlanModalLabel">Editar Plan para Clientes</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Orden</label>
                            <input v-model="editClientPlanData.order" type="text" class="form-control" />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre</label>
                            <input v-model="editClientPlanData.name" type="text" class="form-control" />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción</label>
                            <textarea v-model="editClientPlanData.desc" class="form-control form-control-lg fs-15px"
                                rows="5" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Precio</label>
                            <input v-model="editClientPlanData.price" type="number" class="form-control" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme"
                            @click="updatePlan(editClientPlanData.id, 'clients')">Guardar
                            cambios</button>
                    </div>
                </div>
                <div v-else class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Plan para Comercios</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Orden</label>
                            <input v-model="editAffiliatePlanData.order" type="number"
                                class="form-control form-control-lg fs-15px" value="" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nombre</label>
                            <input v-model="editAffiliatePlanData.name" type="text"
                                class="form-control form-control-lg fs-15px" value="" required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción</label>
                            <textarea v-model="editAffiliatePlanData.desc" class="form-control form-control-lg fs-15px"
                                rows="5" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Precio</label>
                            <input v-model="editAffiliatePlanData.price" type="number"
                                class="form-control form-control-lg fs-15px" value="" required />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme"
                            @click="updatePlan(editAffiliatePlanData.id, 'affiliates')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Open assign subscription to client -->
        <div class="modal fade" id="assignModal" tabindex="-1" aria-labelledby="assignModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div v-if="this.activeTab === 'clients'" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Asignar Suscripción a Cliente</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                            @click="resetModalData()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="p-3 bg-body" style="border-radius: 10px;">
                            <div class="row justify-content-end">
                                <div class="alert alert-info d-inline-flex align-items-center mt-2" role="alert"
                                    style="width: auto;">
                                    <i class="fa-solid fa-info-circle me-2"></i>
                                    <div>
                                        <strong>Funciones:</strong> Puedes seleccionar un plan y buscar el cliente en
                                        el buscador para asignar una suscripción.
                                    </div>
                                </div>
                                <a href="#" class="btn btn-theme me-2" data-bs-toggle="modal"
                                    data-bs-target="#createPlan" style="width: auto;">
                                    <i class="fa fa-plus-circle fa-fw me-1"></i> Crear Plan
                                </a>
                            </div>

                            <!-- Search client bar -->
                            <div class="search-box mb-4 mt-4">
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
                                <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                                    selectedClient.lastName
                                    }}
                                </p>
                                <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>

                                <label for="payDay">Fecha de Corte:</label>
                                <div class="d-flex justify-content-center align-items-center m-2">
                                    <input type="date" v-model="payDay" class="form-control" id="payDay"
                                        style="width: auto;">
                                </div>

                                <div class="form-check mt-4">
                                    <input type="checkbox" class="form-check-input" id="isPaid" v-model="isPaid" />
                                    <label class="form-check-label" for="isPaid">Pagado</label>
                                </div>
                            </div>

                            <!-- Subscription Plan Selection -->
                            <div class="mt-4 mb-3 text-center">
                                <h5 class="mb-4">Seleccione una suscripción</h5>
                                <div class="row justify-content-center">
                                    <!-- Loop through the plans array and display buttons for each plan -->
                                    <div v-for="(plan, index) in sortedClientPlans" :key="plan.id"
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
                                                    @click="editPlan(plan, 'clients')">
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
                        <button :disabled="loading" class="btn btn-theme" @click="assignPlan('clients')">
                            <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                aria-hidden="true"></span>
                            <span>Asignar</span>
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
                            @click="resetModalData()">Cerrar</button>
                    </div>
                </div>
                <div v-else class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Asignar Suscripción a Comercio</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                            @click="resetModalData()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="p-3 bg-body" style="border-radius: 10px;">
                            <div class="row justify-content-end">
                                <div class="alert alert-info d-inline-flex align-items-center mt-2" role="alert"
                                    style="width: auto;">
                                    <i class="fa-solid fa-info-circle me-2"></i>
                                    <div>
                                        <strong>Funciones:</strong> Puedes seleccionar un plan y buscar el comercio en
                                        el buscador para asignar una suscripción.
                                    </div>
                                </div>
                                <a href="#" class="btn btn-theme me-2" data-bs-toggle="modal"
                                    data-bs-target="#createPlan" style="width: auto;">
                                    <i class="fa fa-plus-circle fa-fw me-1"></i> Crear Plan
                                </a>
                            </div>

                            <div class="search-box mb-4 mt-4">
                                <SearchInput v-model="searchAffiliate" :results="searchAffResults"
                                    placeholder="Filtrar comercio por nombre o rif..." @input="searchAffiliates"
                                    @select="selectAffiliate" class="form-control" />
                                <button v-if="selectedAffiliate" class="btn btn-danger mt-3" style="margin: 5px;"
                                    @click.prevent="deselectAffiliate">
                                    {{ selectedAffiliate.companyName }}
                                    <i class="fa fa-times fa-sm"></i>
                                </button>
                            </div>

                            <div v-if="selectedAffiliate" class="mb-3 p-3 border rounded">
                                <h5>Información del Comercio seleccionado</h5>
                                <p><strong>Nombre:</strong> {{ selectedAffiliate.companyName }}
                                </p>
                                <p><strong>RIF:</strong> {{ selectedAffiliate.rif }}</p>

                                <label for="payDay">Fecha de Corte:</label>
                                <div class="d-flex justify-content-center align-items-center m-2">
                                    <input type="date" v-model="payDay" class="form-control" id="payDay"
                                        style="width: auto;">
                                </div>

                                <div class="form-check mt-4">
                                    <input type="checkbox" class="form-check-input" id="isPaid" v-model="isPaid" />
                                    <label class="form-check-label" for="isPaid">Pagado</label>
                                </div>
                            </div>

                            <!-- Subscription Plan Selection -->
                            <div class="mt-4 mb-3 text-center">
                                <h5 class="mb-4">Seleccione una suscripción</h5>
                                <div class="row justify-content-center">
                                    <!-- Loop through the plans array and display buttons for each plan -->
                                    <div v-for="(plan, index) in sortedAffiliatePlans" :key="plan.id"
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
                                                    @click="editPlan(plan, 'affiliates')">
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
                            @click="resetModalData()">Cerrar</button>
                        <button :disabled="loading" class="btn btn-theme" @click="assignPlan('affiliates')">
                            <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                aria-hidden="true"></span>
                            <span>Asignar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Modal to set the company's exchange ammount -->
        <div class="modal fade" id="setExchange" tabindex="-1" aria-labelledby="setExchangeModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="setExchangeModalLabel">Editar Tasa</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <div class="input-group">
                                <span class="input-group-text text-wrap" id="value-addon">Bs</span>
                                <input id="exchangeValue" type="number" class="form-control" v-model.number="exchange"
                                    aria-label="Monto" aria-describedby="value-addon" min="0">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="setExchange()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="role === 'cliente' || role === 'afiliado'">

        <!-- Client view -->
        <div v-if="role === 'cliente'" class="container">
            <div class="bg-body rounded" style="padding: 20px;" id="price-table">

                <div v-if="loadingPlans" class="text-center">
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                </div>

                <div v-if="!loadingPlans" class="row g-4 justify-content-center">
                    <!-- Lista de suscripciones -->
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

                            <div v-if="plan.id === currentSub"
                                class="badge border border-success text-success align-items-center px-3 py-2 shadow-sm rounded-pill mb-3"
                                style="width: auto; display: inline-flex; max-width: fit-content;">
                                <span>Suscripción actual</span>
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

        </div>

        <!-- Affiliate view -->
        <div v-if="role === 'afiliado'" class="container">

            <div class="bg-body rounded" style="padding: 20px;" id="price-table">

                <div v-if="loadingPlans" class="text-center">
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                </div>

                <div v-if="!loadingPlans" class="row g-4 justify-content-center">
                    <!-- Lista de suscripciones -->
                    <div v-for="(plan, index) in sortedPlans" :key="plan.id" class="col-md-4">
                        <div :class="['card h-100 text-center py-4 d-flex flex-column justify-content-between', {
                            'border-primary': plan.name === 'Intermedio',
                            'shadow-sm': true,
                        }]" :style="plan.name === 'Intermedio' ?
                            'background-color: #b800c2; border-radius: 0.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); transition: transform 0.3s;'
                            : ''">
                            <div v-if="plan.name === 'Intermedio'" class="ribbon">
                                <span>Popular</span>
                            </div>

                            <div v-if="plan.id === currentSub"
                                class="badge border border-success text-success align-items-center px-3 py-2 shadow-sm rounded-pill mb-3"
                                style="width: auto; display: inline-flex; max-width: fit-content;">
                                <span>Suscripción actual</span>
                            </div>

                            <i class="fa-lg" :class="plan.icon"></i>
                            <h4 class="my-4 text-primary">{{ plan.name.toUpperCase() }}</h4>
                            <p class="fw-bold display-5">{{ plan.price === 0 ? 'Precio a consultar' : `$${plan.price} /
                                Mensual` }} <small></small></p>

                            <div class="description mb-4" style="min-height: 120px;">
                                <p class="form-label" v-html="formattedDesc[index].desc"></p>
                            </div>

                            <div class="mt-auto">
                                <button class="btn btn-theme mt-3 w-50" @click.prevent="contractPlan(plan)">
                                    Contratar
                                </button>
                            </div>
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
                        <div v-if="selectedPlan">
                            <h3 class="mb-3">
                                <i :class="selectedPlan.icon"></i>
                                {{ selectedPlan.name.toUpperCase() }}
                            </h3>
                            <h5 class="mb-3">
                                <strong>Tasa: {{ exchange }} Bs</strong>
                            </h5>
                            <h5 class="mb-3">
                                <strong>Monto a cancelar:
                                    {{ selectedPlan.price == 0 && this.role === 'afiliado' ? 'Consultar precio' :
                                        `${((selectedPlan.price.toFixed(2)) * exchange).toFixed(2)} Bs` }}
                                </strong>
                            </h5>
                        </div>

                        <!-- Metodos de pago -->
                        <div class="card">
                            <h4 class="text-center">Métodos de Pago</h4>
                            <h6><u>Pago Móvil</u></h6>
                            <div class="card-text">
                                <strong>Banco: </strong>Banco Provincial
                            </div>
                            <div class="card-text">
                                <strong>Teléfono: </strong>04246003370
                                <button class="btn btn-sm btn-secondary ms-2" @click="copyToClipboard('04246003370')">
                                    <i class="fa fa-copy"></i>
                                </button>
                            </div>
                            <div class="card-text">
                                <strong>RIF: </strong>J506221772
                                <button class="btn btn-sm btn-secondary ms-2" @click="copyToClipboard('J506221772')">
                                    <i class="fa fa-copy"></i>
                                </button>
                            </div>
                        </div>

                        <form class="mt-3" @submit.prevent="notifyPayment">
                            <div class="row g-3">
                                <div class="col-6">
                                    <label for="paymentDate" class="form-label">Fecha de Pago</label>
                                    <input type="date" class="form-control" v-model="paymentDate" style="width: auto;">
                                </div>
                                <div class="col-6">
                                    <label for="amountPaid" class="form-label">Monto Pagado</label>
                                    <div class="input-group">
                                        <span class="input-group-text text-wrap" id="assign-addon">Bs.</span>
                                        <input id="amountPaid" class="form-control" type="number" step=".01"
                                            v-model="amountPaid" aria-label="Monto" aria-describedby="assign-addon">
                                    </div>
                                </div>
                                <div class="col-12 mb-3">
                                    <label for="payment" class="form-label">Captura de Pago</label>
                                    <input type="file" class="form-control" id="payment"
                                        @change="handleFileUpload($event, 'payment')" required>
                                    <img v-if="paymentPreview" :src="paymentPreview" alt="payment preview"
                                        class="img-fluid mt-2" />
                                </div>
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

.btn-assign {
    font-size: 0.6rem
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

/* .container-fluid {
    display: flex;
} */

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