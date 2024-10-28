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

            paymentFile: null,
            paymentPreview: null,
            paymentDate: null,
            paymentUrl: null,
            isSubmitting: false,
            errorMessage: '',
            paymentModal: null,
            activeTab: 'null',
        };
    },
    computed: {
        sortedPlans() {
            if (this.activeTab === 'clients' || this.role === 'cliente') {
                // Return a new sorted array to avoid mutating the original array
                return [...this.plans].sort((a, b) => a.order - b.order);
            } else if (this.activeTab === 'affiliates' || this.role === 'afiliado') {
                return [...this.affiliatePlans].sort((a, b) => a.order - b.order);
            }
        },
        formattedDesc() {
            if (this.role === 'cliente') {
                return this.plans.map(plan => ({
                    ...plan,
                    desc: plan.desc
                        .split('.')
                        .filter(sentence => sentence.trim()) // Remove any empty sentences
                        .map(sentence => `<li>${sentence.trim()}</li>`) // Wrap sentences in <li>
                        .join('') // Join the list items
                }));
            }
            else if (this.role === 'afiliado') {
                return this.affiliatePlans.map(plan => ({
                    ...plan,
                    desc: plan.desc
                        .split('.')
                        .filter(sentence => sentence.trim()) // Remove any empty sentences
                        .map(sentence => `<li>${sentence.trim()}</li>`) // Wrap sentences in <li>
                        .join('') // Join the list items
                }));
            }

        },

        // Clients with subscriptions (search and sorting)
        filteredClientsSubscriptions() {
            return this.applyFilterAndSort(this.paginatedClientsSubscriptions, 'client');
        },

        // Clients without subscriptions (search and sorting)
        filteredClientsNoSubscriptions() {
            return this.applyFilterAndSort(this.paginatedClientsNoSubscriptions, 'client');
        },

        // Affiliates with subscriptions (search and sorting)
        filteredAffiliatesSubscriptions() {
            return this.applyFilterAndSort(this.paginatedAffiliatesSubscriptions, 'affiliate');
        },

        // Affiliates without subscriptions (search and sorting)
        filteredAffiliatesNoSubscriptions() {
            return this.applyFilterAndSort(this.paginatedAffiliatesNoSubscriptions, 'affiliate');
        },

        // Paginated clients with subscriptions
        paginatedClientsSubscriptions() {
            return this.paginate(this.clientsSubscriptions);
        },

        // Paginated clients without subscriptions
        paginatedClientsNoSubscriptions() {
            return this.paginate(this.clientsNoSubscriptions);
        },

        // Paginated affiliates with subscriptions
        paginatedAffiliatesSubscriptions() {
            return this.paginate(this.affiliatesSubscriptions);
        },

        // Paginated affiliates without subscriptions
        paginatedAffiliatesNoSubscriptions() {
            return this.paginate(this.affiliatesNoSubscriptions);
        },

        totalPages() {
            return Math.ceil(this.clients.length / this.itemsPerPage);
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
        applyFilterAndSort(data, type) {
            const trimmedSearchQuery = this.searchQuery?.trim().toString().toLowerCase();
            let filteredData = [...data];

            // Apply search filter
            if (trimmedSearchQuery) {
                filteredData = filteredData.filter(item => {
                    let identification, name;
                    if (type === 'client') {
                        identification = item.identification?.toString().toLowerCase() || '';
                        name = (item.firstName + ' ' + item.lastName).toLowerCase();
                    } else if (type === 'affiliate') {
                        identification = item.rif?.toString().toLowerCase() || '';
                        name = item.companyName?.toLowerCase() || '';
                    }
                    return identification.includes(trimmedSearchQuery) || name.includes(trimmedSearchQuery);
                });
            }

            // Apply sorting
            return filteredData.sort((a, b) => {
                let fieldA = a[this.sortField]?.toString().toLowerCase() || '';
                let fieldB = b[this.sortField]?.toString().toLowerCase() || '';

                if (this.sortOrder === 'asc') {
                    return fieldA > fieldB ? 1 : fieldA < fieldB ? -1 : 0;
                } else {
                    return fieldA < fieldB ? 1 : fieldA > fieldB ? -1 : 0;
                }
            });
        },

        paginate(data) {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return data.slice(start, end);
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
        editPlan(plan) {
            // Populate the modal fields with the plan data
            this.editClientPlanData = {
                ...plan
            };
            console.log(this.editClientPlanData.id);

            // Hide current modal
            const currentModal = Modal.getInstance(document.getElementById('assignModal'));
            currentModal.hide();

            // Open the edit modal
            const modal = new Modal(document.getElementById('editPlanModal'));
            modal.show();
        },
        async updatePlan(planId) {
            const planRef = dbRef(db, `Suscriptions/${planId}`);

            const updateData = {
                order: this.editClientPlanData.order,
                name: this.editClientPlanData.name,
                desc: this.editClientPlanData.desc,
                price: this.editClientPlanData.price,
                requestLimit: this.editClientPlanData.requestLimit || null,
                icon: this.editClientPlanData.icon
            };

            try {
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

                await this.fetchPlans();
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
        async fetchAffiliatePlans() {
            const plansRef = query(dbRef(db, 'Affiliate_suscriptions'));
            try {
                const snapshot = await get(plansRef);

                if (snapshot.exists()) {
                    const plans = snapshot.val();

                    // Since Firebase data is an object, map to array for easier use
                    this.affiliatePlans = Object.keys(plans).map(key => ({
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
        searchAffiliates() {
            if (!this.searchAffiliate.trim()) {
                this.searchAffResults = [];
                this.searchResultsSubscriptions = [];
                this.searchResultsNoSubscriptions = [];
                return;
            }

            const searchInput = this.searchAffiliate.toLowerCase();
            console.log(this.searchAffiliate);

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
            console.log('Selected affiliate:', affiliate.rif);
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
                    to: 'roseindustry11@gmail.com',
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
        // Clients and Affiliates can contract a subscription
        async contractPlan(plan) {
            console.log(plan.id)
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

                if (this.role === 'cliente') {
                    user = this.clients.find(client => client.id === userId);
                    userType = 'cliente';
                    userName = `${user.firstName} ${user.lastName}`;
                } else if (this.role === 'afiliado') {
                    user = this.affiliates.find(affiliate => affiliate.id === userId);
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
                    status: true, // Set the default status as true 'active'
                    payDay: payDay,
                };

                // Proceed to open modal with Payment methods and payment upload
                if (plan.price === 0) {
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
                    lastPaymentDate: formattedDate,
                };

                if (this.role === 'cliente') {
                    user = this.clients.find(client => client.id === userId);
                    userType = 'cliente';
                    this.userName = `${user.firstName} ${user.lastName}`;  // Full name for clients
                } else if (this.role === 'afiliado') {
                    user = this.affiliates.find(affiliate => affiliate.id === userId);
                    userType = 'afiliado';
                    this.userName = user.companyName;  // Use companyName for affiliates
                }

                // Upload capture
                const paymentUrl = await this.uploadPaymentFile(this.paymentFile, this.paymentDate, userType);
                console.log('File uploaded successfully:', paymentUrl);

                // Update user to set field user.requestedVerification = true
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
            if (type === 'clients') {
                this.activeTab = type;
                console.log(this.activeTab)
            } else {
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

        if (this.role === 'admin') {
            this.activeTab = 'clients';
        }

        await this.fetchClients();
        await this.fetchAffiliates();
        await this.fetchPlans();
        await this.fetchAffiliatePlans();
        await this.fetchCurrentExchange();
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
                                                @click.prevent="openAssignModal(client, 'client')">
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
                            <table class="table text-center table-responsive">
                                <thead>
                                    <tr>
                                        <th scope="col">Comercio</th>
                                        <th scope="col">RIF</th>
                                        <th scope="col">Suscripción</th>
                                    </tr>
                                </thead>
                                <tbody>
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
                            </table>
                            <!-- Pagination Controls -->
                            <nav class="mt-4" v-if="totalPages > 1" aria-label="Page navigation">
                                <ul class="pagination justify-content-center">
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
                    <!-- without subscriptions -->
                    <div class="tab-pane fade h-100" id="affiliateNoSubscriptions">
                        <div class="container mt-4">
                            <input v-model="searchQuery" placeholder="Filtrar cliente por nombre o cédula..."
                                class="form-control mb-3" />
                            <table class="table text-center table-responsive">
                                <thead>
                                    <tr>
                                        <th scope="col">Comercio</th>
                                        <th scope="col">RIF</th>
                                        <th scope="col">Suscripción</th>

                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
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
                            </table>
                            <!-- Pagination Controls -->
                            <nav class="mt-4" v-if="totalPages > 1" aria-label="Page navigation">
                                <ul class="pagination justify-content-center">
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
                        <button type="button" class="btn btn-theme" @click="updatePlan(editClientPlanData.id)">Guardar
                            cambios</button>
                    </div>
                </div>
                <div v-else class="modal-content">
                    <div class="modal-header">
                        soon
                    </div>
                    <div class="modal-body">
                        soon
                    </div>
                    <div class="modal-footer">
                        soon
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
                            @click="resetModalData()">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="assignClientPlan()">Asignar</button>
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
                            @click="resetModalData()">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="assignAffiliatePlan()">Asignar</button>
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

    <!-- Client view -->
    <div v-if="this.role === 'cliente'" class="container">

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
    </div>

    <!-- Affiliate view -->
    <div v-if="this.role === 'afiliado'" class="container">

        <!-- Lista de suscripciones -->
        <div class="container-fluid my-4 fade-in" style="padding: 20px;" id="price-table">
            <div class="row g-4 justify-content-center">
                <div v-for="(plan, index) in sortedPlans" :key="plan.id" class="col-md-3">
                    <div :class="['card h-100 text-center py-4 d-flex flex-column justify-content-between', {
                        'border-primary': plan.name === 'Intermedio',
                        'shadow-sm': true,
                    }]" :style="plan.name === 'Intermedio' ?
                        'background-color: #b800c2; border-radius: 0.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); transition: transform 0.3s;'
                        : ''">
                        <div v-if="plan.name === 'Intermedio'" class="ribbon">
                            <span>Popular</span>
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
                    <h3 v-if="selectedPlan" class="mb-3">
                        <i :class="selectedPlan.icon"></i>
                        {{ selectedPlan.name.toUpperCase() }}
                    </h3>
                    <h5 v-if="selectedPlan" class="mb-3">
                        <strong>Tasa: {{ exchange }} Bs</strong>
                    </h5>
                    <h5 v-if="selectedPlan" class="mb-3">
                        <strong>Monto a cancelar: {{ ((selectedPlan.price.toFixed(2)) * exchange).toFixed(2) }}
                            Bs</strong>
                    </h5>

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