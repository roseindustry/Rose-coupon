<script>
// Firebase imports
import { db, functions, storage } from '../firebase/init';
import { ref as dbRef, update, set, push, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';

// Third party imports
import { Modal } from 'bootstrap';
import 'toastify-js/src/toastify.css';

// Utilities
import { toast } from '@/utils/toast';
import { sendEmail } from '@/utils/emailService';
import { useUserStore } from "@/stores/user-role";

// Components
import AppCreditStats from '@/components/credits/admin/AppCreditStats.vue';
import CreditBreakdown from '@/components/credits/admin/CreditBreakdown.vue';
import LevelsModal from '@/components/credits/admin/modals/LevelsModal.vue';
import ClientCreditList from '@/components/credits/admin/ClientCreditList.vue';
import AffiliateCreditList from '@/components/credits/admin/AffiliateCreditList.vue';
import SetCreditModal from '@/components/credits/admin/modals/SetCreditModal.vue';
import EditCreditModal from '@/components/credits/admin/modals/EditCreditModal.vue';
import CreditDetailsModal from '@/components/credits/admin/modals/CreditDetailsModal.vue';
import AppCreditModal from '@/components/credits/admin/modals/AppCreditModal.vue';
import ClientCreditView from '@/components/credits/client/ClientCreditView.vue'
import AffiliateCreditView from '@/components/credits/affiliate/AffiliateCreditView.vue'

export default {
    name: 'Credits',
    components: {
        AppCreditStats,
        CreditBreakdown,
        ClientCreditList,
        AffiliateCreditList,
        LevelsModal,
        SetCreditModal,
        EditCreditModal,
        CreditDetailsModal,
        AppCreditModal,
        ClientCreditView,
        AffiliateCreditView
    },
    data() {
        return {
            //Admin data
            userId: '',
            role: '',
            userName: '',
            isProfileCompleted: null,

            level: {
                // order: 0,
                name: '',
                minPoints: 0,
                maxPoints: 0
            },
            levels: [],

            affiliates: [],
            allAffiliates: [],
            clientsWithAffiliatePurchases: [],
            clients: [],
            allClients: [],
            searchClientResults: [],
            searchEntityResults: [],
            creditType: 'client',

            selectedClient: null,
            selectedEntity: null,
            selectedEntities: [],

            searchQuery: '',
            searchClient: '',
            searchEntity: '',
            filterClients: '',
            filterAffiliates: '',

            appCreditType: '',
            editUserData: null,
            creditLine: '',

            // Main credit line data properties
            totalMainCapital: 0, // Total credit assigned to the app for Main credit lines
            mainCreditUsed: 0, // Total credit used by clients
            mainCreditAvailable: 0, // Remaining credit after usage
            mainAssignedCapital: 0, // Total assigned credit to clients
            mainAvailableToAssign: 0, // Credit still available to assign to clients

            // Plus credit line data properties
            totalPlusCapital: 0, // Total credit assigned to the app for Plus credit lines
            totalAffiliatePlusCapital: 0,
            plusCreditUsed: 0, // Total credit used by clients
            plusCreditAvailable: 0, // Remaining credit after usage
            plusAssignedCapital: 0, // Total assigned credit to clients
            plusAvailableToAssign: 0, // Credit still available to assign to clients

            // Main credit line for Affiliates  
            totalAffiliateMainCapital: 0,
            affMainCreditUsed: 0,
            affMainCreditAvailable: 0,
            affMainAssignedCapital: 0,
            affMainAvailableToAssign: 0,

            // Main credit line for Alkosto 
            totalAlkostoCapital: 0,
            alkostoCreditUsed: 0,
            alkostoCreditAvailable: 0,
            alkostoAssignedCapital: 0,
            alkostoAvailableToAssign: 0,


            clientId: '',
            clientCredit: 0,

            clientApprovedCred: null,
            clientUsedCred: null,
            requestedAmount: 0,

            activeTab: null,

            currentPage: {
                clients: 1,
                affiliates: 1
            },
            itemsPerPage: 6,

            loading: false,
            waiting: false,
            verificationRequested: false,
            verificationCode: '',

            creditAmount: 0,

            productName: '',
            productPrice: 0,

            purchaseDate: new Date().toLocaleDateString('en-CA'),
            purchaseAmount: 0,
            remainingAmount: 0,
            loanAmount: 0,
            calc: false,
            initialPercentage: "50", // Default to 50%
            customInitial: 0, // Custom value for the initial amount
            terms: 2, // default to 2 cuota
            frequency: 2, // default to bi-weekly payments
            cuotaDates: [],
            quotesAmount: [],

            clientDetails: null,
            currentClient: {
                credit: {
                    mainCredit: 0,
                    availableMainCredit: 0,
                    mainPurchases: []
                },
                level: {
                    name: 'Sin nivel',
                    minPoints: 0
                },
                points: 0
            },
            currentAffiliate: null,

            selectedAffiliate: null,
            selectedAffiliateClients: [],

            showPurchases: false,
            purchaseWithAffiliateData: [],
            showSubscription: false,

            // For client logic
            cuotaToPay: null,
            affiliateToPay: null,
            purchaseIdToPay: null,
            paymentFile: null,
            paymentPreview: null,
            paymentUrl: null,
            paymentDate: new Date().toISOString().split('T')[0],
            amountPaid: 0,
            errorMessage: '',
            showDetails: false,
            selectedUser: null,
            showPointsBreakdown: false,
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
            const start = (this.currentPage.affiliates - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredAffiliates.slice(start, end);
        },
        paginatedClients() {
            const start = (this.currentPage.clients - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredClients.slice(start, end);
        },
        totalPages() {
            return {
                clients: Math.ceil(this.filteredClients.length / this.itemsPerPage),
                affiliates: Math.ceil(this.filteredAffiliates.length / this.itemsPerPage)
            };
        }
    },
    methods: {
        goToPage(page, type) {
            this.currentPage[type] = page;
        },
        handleFilterChange(query) {
            this.filterClients = query;
            this.currentPage.clients = 1; // Reset to first page when filtering
        },
        handleFilterAffiliates(query) {
            this.filterAffiliates = query;
            this.currentPage.affiliates = 1; // Reset to first page when filtering
        },
        applyFilter(data, type) {
            let query;
            if (type === 'client') {
                query = this.filterClients?.trim().toString().toLowerCase();
            } else if (type === 'affiliate') {
                query = this.filterAffiliates?.trim().toString().toLowerCase();
            }

            if (!query) return data;

            return data.filter(item => {
                if (type === 'client') {
                    return item.firstName?.toLowerCase().includes(query) ||
                           item.lastName?.toLowerCase().includes(query) ||
                           item.identification?.toLowerCase().includes(query);
                } else if (type === 'affiliate') {
                    return item.companyName?.toLowerCase().includes(query) ||
                           item.rif?.toLowerCase().includes(query);
                }
            });
        },

        //FOR ADMIN USE
        // Levels
        async createLevel() {
            if (!this.level.name || this.level.minPoints === null || this.level.maxPoints === null) {
                alert('Todos los campos son obligatorios.');
                return;
            }

            if (this.level.minPoints >= this.level.maxPoints) {
                alert('El rango de puntos no es válido. Los puntos mínimos deben ser menores que los máximos.');
                return;
            }

            try {
                const newLevel = {
                    name: this.level.name,
                    minPoints: this.level.minPoints,
                    maxPoints: this.level.maxPoints
                };

                const levelsRef = dbRef(db, `Levels`);
                // Push the new level data to Firebase (creates a new entry with a unique ID)
                const newLevelRef = await push(levelsRef, newLevel);

                // Add the new level to the local levels array for immediate UI update
                this.levels.push({
                    id: newLevelRef.key,  // Store the unique key generated by Firebase
                    ...newLevel
                });

                toast.success(`${newLevel.name} creado con éxito.`);

                // Reset the form
                this.level = { name: '', minPoints: 0, maxPoints: 0 };
            } catch (error) {
                console.error('Error creating level:', error);
                alert('No se pudo crear el nivel.');
            }
        },
        async fetchLevels() {
            const levelsRef = dbRef(db, `Levels`);

            try {
                const snapshot = await get(levelsRef);

                if (snapshot.exists()) {
                    const levels = snapshot.val();

                    const levelPromises = Object.keys(levels).map(async key => {

                        const level = {
                            id: key,
                            ...levels[key],
                        };

                        return level;
                    });

                    this.levels = await Promise.all(levelPromises);
                } else {
                    this.levels = [];
                }
            } catch (error) {
                console.error('Error fetching levels:', error);
                this.levels = [];
            }
        },

        //Fetch data 
        async fetchCurrentTotalCredit() {
            try {
                const creditRef = dbRef(db, `AppCapital`);
                const creditSnapshot = await get(creditRef);

                if (creditSnapshot.exists()) {
                    const creditData = creditSnapshot.val();
                    this.totalMainCapital = creditData.main?.value ? Number(creditData.main.value) : 0;
                    this.totalPlusCapital = creditData.plus?.value ? Number(creditData.plus.value) : 0;
                    this.totalAffiliateMainCapital = creditData.affiliateMain?.value ? Number(creditData.affiliateMain.value) : 0;
                    this.totalAlkostoCapital = creditData.alkosto?.value ? Number(creditData.alkosto.value) : 0;
                } else {
                    console.log('No credit data found.');
                    this.totalMainCapital = 0;
                    this.totalPlusCapital = 0;
                    this.totalAffiliateMainCapital = 0;
                    this.totalAlkostoCapital = 0;
                }
            } catch (error) {
                console.error('Error fetching current capital:', error);
                this.totalMainCapital = 0;
                this.totalPlusCapital = 0;
                this.totalAffiliateMainCapital = 0;
                this.totalAlkostoCapital = 0;
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
                        const clientCredit = await this.fetchCredit(key);

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
                                    id: subId // Include the subscription ID
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

                    this.clients = allClients.filter((client) => client.credit?.mainCredit > 0 || client.credit?.plusCredit > 0 || client.credit?.mainPurchases); // || client.credit?.plusPurchases
                    // console.log('Clients with Credit:', this.clients);                 

                    this.calculateMainCredits();
                    this.calculatePlusCredits();

                } else {
                    this.allClients = [];
                    this.clients = [];
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.allClients = [];
                this.clients = [];
            }
        },
        async fetchAffiliates() {
            const role = 'afiliado';
            const affiliateRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(affiliateRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Map Firebase data to an array of promises
                    const affiliatePromises = Object.keys(users).map(async key => {
                        const affiliateCredit = await this.fetchAffiliateCreditData(key);

                        const affiliate = {
                            id: key,
                            ...users[key],
                        };

                        if (affiliate.credit) {
                            affiliate.credit = affiliateCredit
                        }

                        // Fetch the affiliate's subscription ID
                        const subRef = dbRef(db, `Users/${key}/subscription`);
                        const subSnapshot = await get(subRef);

                        if (subSnapshot.exists()) {
                            const subId = subSnapshot.val().subscription_id;
                            const isPaid = subSnapshot.val().isPaid;

                            // Fetch subscription details
                            const subDataRef = dbRef(db, `Affiliate_suscriptions/${subId}`);
                            const subDataSnapshot = await get(subDataRef);

                            if (subDataSnapshot.exists()) {
                                const subData = subDataSnapshot.val();
                                affiliate.subscription = {
                                    ...subData,
                                    id: subId, // Include the subscription ID
                                    isPaid
                                };
                            } else {
                                affiliate.subscription = null; // Handle case where subscription data is not found
                            }
                        } else {
                            affiliate.subscription = null; // Client does not have a subscription
                        }

                        return affiliate; // Return the complete client object with subscription and credit
                    });

                    // Await for all promises to resolve
                    const allAffiliates = await Promise.all(affiliatePromises);

                    this.allAffiliates = allAffiliates;

                    this.affiliates = allAffiliates.filter((aff) => aff.credit?.mainCredit > 0 || aff.credit?.plusCredit > 0);

                    this.calculateAffiliatesCredits();
                } else {
                    this.affiliates = [];
                }
            } catch (error) {
                console.error('Error fetching affiliates:', error);
                this.affiliates = [];
                this.allAffiliates = [];
            }
        },
        async fetchCredit(userId) {
            try {
                const clientCreditRef = dbRef(db, `Users/${userId}/credit`);
                const creditSnapshot = await get(clientCreditRef);

                if (creditSnapshot.exists()) {
                    const creditData = creditSnapshot.val();
                    const { main = {}, plus = {} } = creditData;

                    const mainCredit = main.totalCredit || 0;
                    const availableMainCredit = main.availableCredit || 0;
                    // Convert Firebase purchases object to array if it exists
                    const mainPurchases = main.purchases ? Object.entries(main.purchases).map(([id, purchase]) => ({
                        id,
                        ...purchase
                    })) : [];
                    const mainPoints = main.points || 0;
                    const mainLevel = main.level_id || null;

                    const plusCredit = plus.totalCredit || 0;
                    const availablePlusCredit = plus.availableCredit || 0;
                    // Convert Firebase purchases object to array if it exists
                    const plusPurchases = plus.purchases ? Object.entries(plus.purchases).map(([id, purchase]) => ({
                        id,
                        ...purchase
                    })) : [];
                    const plusPoints = plus.points || 0;
                    const plusLevel = plus.level_id || null;

                    // Only return the user credit if either credit line is assigned
                    if (mainCredit > 0 || plusCredit > 0 || mainPurchases.length || plusPurchases.length) {
                        return {
                            mainCredit,
                            availableMainCredit,
                            mainPurchases,
                            mainPoints,
                            mainLevel,
                            plusCredit,
                            availablePlusCredit,
                            plusPurchases,
                            plusPoints,
                            plusLevel
                        };
                    }
                }
                return null;
            } catch (error) {
                console.error('Error fetching users credit:', error);
                return null;
            }
        },
        async fetchAffiliateCreditData(affiliateId) {
            try {
                const affiliateCreditRef = dbRef(db, `Users/${affiliateId}/credit`);
                const creditSnapshot = await get(affiliateCreditRef);

                if (creditSnapshot.exists()) {
                    const creditData = creditSnapshot.val();

                    // Extract credit information
                    const mainCredit = creditData.main.totalCredit || 0;
                    const availableMainCredit = creditData.main.availableCredit || 0;
                    const sales = creditData.sales || {};
                    
                    // Extract client names from sales and map the sales object
                    const mappedSales = {};
                    for (const [id, sale] of Object.entries(sales)) {
                        mappedSales[id] = {
                            ...sale,
                            id,
                            clientName: sale.clientName || await this.getClientName(sale.client_id)
                        };
                    }

                    // Calculate total number of sales
                    const salesLength = Object.keys(mappedSales).length;

                    return {
                        mainCredit,
                        availableMainCredit,
                        sales: mappedSales,
                        salesLength
                    };
                }

                // Return default structure if no data exists
                return {
                    mainCredit: 0,
                    availableMainCredit: 0,
                    sales: {},
                    salesLength: 0,
                };
            } catch (error) {
                console.error('Error fetching affiliates sales:', error);
                throw error;
            }
        },
        async getClientName(clientId) {
            try {
                const clientRef = dbRef(db, `Users/${clientId}`);
                const clientSnap = await get(clientRef);
                if (clientSnap.exists()) {
                    const client = clientSnap.val();
                    return `${client.firstName} ${client.lastName}`;
                }
                return 'Cliente no encontrado';
            } catch (error) {
                console.error('Error fetching client name:', error);
                return 'Error al cargar nombre';
            }
        },

        // Calculate total credit usage, available credit, and available to assign
        calculateMainCredits() {
            // Calculate the total credit already used by clients
            this.mainCreditUsed = this.clients.reduce((total, client) => {
                const mainCreditSpent = (client.credit?.mainCredit || 0) - (client.credit?.availableMainCredit || 0);
                return total + mainCreditSpent;
            }, 0);
            // Round the value to two decimals
            this.mainCreditUsed = parseFloat(this.mainCreditUsed.toFixed(2));

            // The remaining available credit in the app
            this.mainCreditAvailable = this.totalMainCapital - this.mainCreditUsed;
            // Round the value to two decimals
            this.mainCreditAvailable = parseFloat(this.mainCreditAvailable.toFixed(2));

            // The total capital that has been assigned (but not necessarily used)
            this.mainAssignedCapital = this.clients.reduce((total, client) => {
                const mainCreditAssigned = client.credit?.mainCredit || 0;
                return total + mainCreditAssigned;
            }, 0);
            // Round the value to two decimals
            this.mainAssignedCapital = parseFloat(this.mainAssignedCapital.toFixed(2));

            // Calculate the available capital left for assignment
            this.mainAvailableToAssign = this.totalMainCapital - this.mainAssignedCapital;
            // Round the value to two decimals
            this.mainAvailableToAssign = parseFloat(this.mainAvailableToAssign.toFixed(2));
        },
        calculatePlusCredits() {
            // Calculate the total credit already used by clients
            this.plusCreditUsed = this.clients.reduce((total, client) => {
                const plusCreditSpent = (client.credit?.plusCredit || 0) - (client.credit?.availablePlusCredit || 0);
                return total + plusCreditSpent;
            }, 0);
            // Round the value to two decimals
            this.plusCreditUsed = parseFloat(this.plusCreditUsed.toFixed(2));

            // The remaining available credit in the app
            this.plusCreditAvailable = this.totalPlusCapital - this.plusCreditUsed;
            // Round the value to two decimals
            this.plusCreditAvailable = parseFloat(this.plusCreditAvailable.toFixed(2));

            // The total capital that has been assigned (but not necessarily used)
            this.plusAssignedCapital = this.clients.reduce((total, client) => {
                const plusCreditAssigned = client.credit?.plusCredit || 0;
                return total + plusCreditAssigned;
            }, 0);
            // Round the value to two decimals
            this.plusAssignedCapital = parseFloat(this.plusAssignedCapital.toFixed(2));

            // Calculate the available capital left for assignment
            this.plusAvailableToAssign = this.totalPlusCapital - this.plusAssignedCapital;
            // Round the value to two decimals
            this.plusAvailableToAssign = parseFloat(this.plusAvailableToAssign.toFixed(2));
        },
        calculateAffiliatesCredits() {
            // Calculate the total credit already used by clients
            this.affMainCreditUsed = this.affiliates.reduce((total, affiliate) => {
                const mainCreditSpent = (affiliate.credit?.mainCredit || 0) - (affiliate.credit?.availableMainCredit || 0);
                return total + mainCreditSpent;
            }, 0);
            // Round the value to two decimals
            this.affMainCreditUsed = parseFloat(this.affMainCreditUsed.toFixed(2));

            // The remaining available credit in the app
            this.affMainCreditAvailable = this.totalAffiliateMainCapital - this.affMainCreditUsed;
            // Round the value to two decimals
            this.affMainCreditAvailable = parseFloat(this.affMainCreditAvailable.toFixed(2));

            // The total capital that has been assigned (but not necessarily used)
            this.affMainAssignedCapital = this.affiliates.reduce((total, affiliate) => {
                const mainCreditAssigned = affiliate.credit?.mainCredit || 0;
                return total + mainCreditAssigned;
            }, 0);
            // Round the value to two decimals
            this.affMainAssignedCapital = parseFloat(this.affMainAssignedCapital.toFixed(2));

            // Calculate the available capital left for assignment
            this.affMainAvailableToAssign = this.totalAffiliateMainCapital - this.affMainAssignedCapital;
            // Round the value to two decimals
            this.affMainAvailableToAssign = parseFloat(this.affMainAvailableToAssign.toFixed(2));
        },
        calculateAlkostoCredits() {
            // Calculate the total credit already used by clients
            this.affMainCreditUsed = this.affiliates.reduce((total, affiliate) => {
                const mainCreditSpent = (affiliate.credit?.mainCredit || 0) - (affiliate.credit?.availableMainCredit || 0);
                return total + mainCreditSpent;
            }, 0);
            // Round the value to two decimals
            this.affMainCreditUsed = parseFloat(this.affMainCreditUsed.toFixed(2));

            // The remaining available credit in the app
            this.affMainCreditAvailable = this.totalAffiliateMainCapital - this.affMainCreditUsed;
            // Round the value to two decimals
            this.affMainCreditAvailable = parseFloat(this.affMainCreditAvailable.toFixed(2));

            // The total capital that has been assigned (but not necessarily used)
            this.affMainAssignedCapital = this.affiliates.reduce((total, affiliate) => {
                const mainCreditAssigned = affiliate.credit?.mainCredit || 0;
                return total + mainCreditAssigned;
            }, 0);
            // Round the value to two decimals
            this.affMainAssignedCapital = parseFloat(this.affMainAssignedCapital.toFixed(2));

            // Calculate the available capital left for assignment
            this.affMainAvailableToAssign = this.totalAffiliateMainCapital - this.affMainAssignedCapital;
            // Round the value to two decimals
            this.affMainAvailableToAssign = parseFloat(this.affMainAvailableToAssign.toFixed(2));
        },

        openAppCreditModal(type) {
            console.log('Opening modal with type:', type);
            this.appCreditType = type;
            this.$nextTick(() => {
                const modalElement = document.getElementById('app-credit-modal');
                if (modalElement) {
                    const modal = new Modal(modalElement);
                    modal.show();
                }
            });
        },
        async assignAppCredit({ type, amount }) {
            try {
                const creditRef = dbRef(db, `AppCapital/${type}`);
                await update(creditRef, {
                    value: amount
                });
                
                // Update local state based on type
                switch(type) {
                    case 'main':
                        this.totalMainCapital = amount;
                        break;
                    case 'plus':
                        this.totalPlusCapital = amount;
                        break;
                    case 'affiliateMain':
                        this.totalAffiliateMainCapital = amount;
                        break;
                    case 'alkosto':
                        this.totalAlkostoCapital = amount;
                        break;
                }

                // Close the modal
                const modal = Modal.getInstance(document.getElementById('app-credit-modal'));
                modal.hide();

                // Refresh credit data
                await this.fetchCurrentTotalCredit();

                // Show success message
                toast.success('Capital actualizado exitosamente');
            } catch (error) {
                console.error('Error updating app credit:', error);
                toast.error('Error al actualizar el capital');
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
        async selectClient(client) {
            try {
                this.selectedClient = client;
                this.fetchCredit(client.id);
                console.log('Selected client:', client.identification);
                this.showSubscription = true;
                this.searchClient = '';
                this.searchClientResults = [];
            } catch (error) {
                console.error("Error selecting client:", error);
            }
        },

        searchEntities(query) {
            // Clear results if the search query is empty or invalid
            if (!query || typeof query !== 'string') {
                this.searchEntityResults = [];
                return;
            }

            const searchQuery = query.toString().trim().toLowerCase();

            // Determine which list to search based on the creditType
            const userList = this.creditType === 'client' ? this.allClients : this.allAffiliates;

            // Filter by search query, applying different filters for clients and affiliates
            this.searchEntityResults = userList.filter(user => {
                let matches = false;

                // Check filters for clients
                if (this.creditType === 'client') {
                    const isVerified = user.isVerified === true;

                    // Ensure the client is verified before checking search query
                    if (!isVerified) {
                        return false;
                    }

                    // Search by identification and full name for clients
                    const identification = (user.identification || '').toString().toLowerCase();
                    const name = (user.firstName + ' ' + user.lastName).toLowerCase();
                    matches = identification.includes(searchQuery) || name.includes(searchQuery);
                }
                // Check filters for affiliates
                else if (this.creditType === 'affiliate') {
                    const hasSubscription = user.subscription && user.subscription.isPaid;

                    // Ensure the affiliate has a subscription before checking search query
                    if (!hasSubscription) {
                        return false;
                    }

                    // Search by rif and company name for affiliates
                    const rif = (user.rif || '').toString().toLowerCase();
                    const companyName = (user.companyName || '').toLowerCase();
                    matches = rif.includes(searchQuery) || companyName.includes(searchQuery);
                }

                return matches;
            });
        },
        selectEntity(user) {
            const selectedEntityId = user.id;

            if (!this.selectedEntities.some(entity => entity.id === selectedEntityId)) {
                this.selectedEntities.push({
                    id: selectedEntityId,
                    name: this.creditType === 'client'
                        ? `${user.firstName} ${user.lastName}`
                        : user.companyName,
                    identification: this.creditType === 'client'
                        ? user.identification
                        : user.rif,
                    ...user
                });

                console.log(`Selected ${this.creditType}:`, selectedEntityId);
            } else {
                console.log(`${this.creditType} already selected:`, selectedEntityId);
            }

            // Clear the search input and results after selection
            this.searchEntity = '';
            this.searchEntityResults = [];
        },
        deselectEntity(entity) {
            if (entity === 'all') {
                this.selectedEntities = [];
                return;
            }
            const index = this.selectedEntities.indexOf(entity);
            if (index > -1) {
                this.selectedEntities.splice(index, 1);
            }
        },
        showUserDetails(user) {
            this.selectedUser = {
                ...user,
                credit: {
                    ...user.credit,
                    sales: user.credit?.sales || {},  // Keep as object
                    mainPurchases: user.credit?.mainPurchases || []
                }
            };
            const modal = new Modal(document.getElementById('credit-details-modal'));
            modal.show();
        },

        // Set an affiliate or client's credit
        openCreditModal(type) {
            this.creditType = type;
            // Wait for the next tick to ensure the modal element is in the DOM
            this.$nextTick(() => {
                const modalElement = document.getElementById('set-credit-modal');
                if (modalElement) {
                    const modal = new Modal(modalElement);
                    modal.show();
                } else {
                    console.error('Modal element not found');
                }
            });
        },
        async assignCredit(creditType) {
            if (this.creditLine === 'plus') {
                // this.calculatePlusCredits()
                alert('Esta opción no está disponible por el momento.');
                return;
            }

            if (!this.selectedEntities.length || this.creditAmount <= 0) {
                const message = this.creditType === 'client'
                    ? 'Por favor seleccione al menos un cliente y un monto a asignar.'
                    : 'Por favor seleccione al menos un comercio y un monto a asignar.';
                alert(message);
                return;
            }

            // Check if there is available credit to assign in the app
            if (this.creditAmount > this.mainAvailableToAssign) {
                alert('No hay suficiente capital para asignar.');
                return;
            }

            try {
                this.loading = true;

                if (!this.creditLine) {
                    alert('Seleccione una línea de crédito para asignar');
                    return;
                }

                for (const entity of this.selectedEntities) {

                    const entityCreditPath = `Users/${entity.id}/credit/${this.creditLine}`;
                    const newEntityCredit = this.creditAmount;

                    await update(dbRef(db, entityCreditPath), {
                        totalCredit: newEntityCredit,
                        availableCredit: newEntityCredit,
                    });

                    toast.success(`Al ${this.creditType === 'client' ? 'cliente' : 'comercio'} ${entity.id} se le asignó un crédito de $${newEntityCredit}`);

                    let userName = '';

                    if (creditType === 'client') {
                        userName = `${entity.firstName} ${entity.lastName}`;
                    } else if (creditType === 'affiliate') {
                        userName = `${entity.companyName}`;
                    }

                    // Notify the user
                    const clientEmailPayload = {
                        to: entity.email,
                        message: {
                            subject: `Felicidades, se le ha asignado una línea de crédito`,
                            text: `Hola ${userName}, se le ha asignado una línea de crédito de $${newEntityCredit} en Roseapp.                        
                        Ingresa a la app.`,
                            html: `<p>Hola ${userName}, se le ha asignado una línea de crédito de $${newEntityCredit} en Roseapp.</p>
                        <p>Ingresa a la app.</p>`
                        },
                    };

                    // Send email via the utility function
                    const result = await sendEmail(clientEmailPayload);

                    if (result.success) {
                        console.log("Verification email sent successfully:", result.message);
                    } else {
                        console.error("Failed to send verification email:", result.error);
                    }
                }

                // Update UI
                this.calculateMainCredits();
                this.calculateAffiliatesCredits();

                // Reset after assignment
                this.selectedEntities = [];
                this.creditAmount = 0;

                await this.fetchClients();
                await this.fetchAffiliates();
            } catch (error) {
                console.error('Error assigning credit:', error);
                alert('No se pudo asignar el crédito.');
            } finally {
                this.loading = false;
            }
        },
        // Update an affiliate or client's credit
        editCredit(user, userType, creditLine) {
            this.editUserData = user;
            this.creditType = userType;
            this.creditLine = creditLine;
            const modal = new Modal(document.getElementById('edit-credit-modal'));
            modal.show();
        },
        async updateCredit(user, creditType, creditLine) {
            try {
                this.loading = true;

                let userName = '';

                if (creditType === 'client') {
                    userName = `${user.firstName} ${user.lastName}`;
                } else if (creditType === 'affiliate') {
                    userName = `${user.companyName}`;
                }

                const userCreditRef = dbRef(db, `Users/${user.id}/credit/${creditLine}`);

                // Fetch the current credit values
                const snapshot = await get(userCreditRef);
                if (!snapshot.exists()) {
                    throw new Error('User credit record not found.');
                }

                const currentCredit = snapshot.val();
                const currentTotalCredit = currentCredit.totalCredit || 0;
                const currentAvailableCredit = currentCredit.availableCredit || 0;

                // Get the new total credit value from the input
                const newTotalCredit = this.editUserData.credit.mainCredit;

                // Calculate the difference between new and current total credit
                const creditDifference = newTotalCredit - currentTotalCredit;

                // Update totalCredit and adjust availableCredit by the difference
                const newAvailableCredit = currentAvailableCredit + creditDifference;

                await update(userCreditRef, {
                    totalCredit: newTotalCredit,
                    availableCredit: newAvailableCredit,
                });

                toast.success('Crédito actualizado!');

                // Notify the user
                const clientEmailPayload = {
                    to: user.email,
                    message: {
                        subject: `Línea de crédito modificada`,
                        text: `Hola ${userName}, su línea de crédito en Roseapp ha sido modificada.                        
                        Ingresa a la app.`,
                        html: `<p>Hola ${userName}, su línea de crédito en Roseapp ha sido modificada.</p>
                        <p>Ingresa a la app.</p>`
                    },
                };

                // Send email via the utility function
                const result = await sendEmail(clientEmailPayload);

                if (result.success) {
                    console.log("Verification email sent successfully:", result.message);
                } else {
                    console.error("Failed to send verification email:", result.error);
                }

                this.fetchClients();
                this.fetchAffiliates();
            } catch (error) {
                console.error(`Error updating the user ${user.id} total credit assigned.`, error);
            } finally {
                this.loading = false;
            }
        },
        // Remove a user's credit line
        async removeCreditLine(user, userType, creditLine) {
            if (confirm("¿Desea cancelar el crédito de este cliente? Sus compras seguiran registradas.")) {
                try {
                    this.loading = true;

                    let userName = '';

                    if (userType === 'client') {
                        userName = `${user.firstName} ${user.lastName}`;
                    } else if (userType === 'affiliate') {
                        userName = `${user.companyName}`;
                    }

                    // Fetch the credit data for the client
                    const creditPath = `Users/${user.id}/credit/${creditLine}`;
                    const creditSnapshot = await get(dbRef(db, creditPath));

                    if (!creditSnapshot.exists()) {
                        alert('El cliente no tiene la línea de crédito especificada.');
                        return;
                    }

                    const creditData = creditSnapshot.val();

                    // Fetch purchases to check for any unpaid cuotas
                    const purchasesRef = dbRef(db, `${creditPath}/purchases`);
                    const purchasesSnapshot = await get(purchasesRef);

                    const updates = {};

                    if (purchasesSnapshot.exists()) {
                        const purchases = purchasesSnapshot.val();

                        // Move purchases to archive
                        const archivePurchasesPath = `Archive/${user.id}/purchases`;
                        updates[archivePurchasesPath] = purchases;

                        console.log(`Archived purchases for user: ${user.id}`);
                    } else {
                        console.log(`No purchases to archive for user: ${user.id}`);
                    }

                    // Archive credit line
                    const archiveCreditPath = `Archive/${user.id}/credit/${creditLine}`;
                    updates[archiveCreditPath] = {
                        totalCredit: creditData.totalCredit,
                        availableCredit: creditData.availableCredit,
                    };

                    // Record cancellation metadata
                    const archiveMainPath = `Archive/${user.id}`;
                    updates[`${archiveMainPath}/cancelledAt`] = new Date().toISOString();

                    // Execute all updates in one batch
                    await update(dbRef(db), updates);

                    // Remove the original credit line
                    await remove(dbRef(db, creditPath));

                    // Update UI
                    this.calculateMainCredits();

                    toast.success(`Línea de crédito archivada.`);

                    // Notify the user
                    const clientEmailPayload = {
                        to: user.email,
                        message: {
                            subject: `Línea de crédito cancelada en Roseapp`,
                            text: `Hola ${userName}, se le ha revocado su línea de crédito en Roseapp.                        
                        Comunícate con soporte si tienes alguna duda.`,
                            html: `<p>Hola ${userName}, se le ha revocado su línea de crédito en Roseapp.</p>
                        <p>Comunícate con soporte si tienes alguna duda.</p>`
                        },
                    };

                    // Send email via the utility function
                    const result = await sendEmail(clientEmailPayload);

                    if (result.success) {
                        console.log("Verification email sent successfully:", result.message);
                    } else {
                        console.error("Failed to send verification email:", result.error);
                    }
                } catch (error) {
                    console.error('Error removing credit line:', error);
                    alert('No se pudo cancelar la línea de crédito.');
                }
            }
        },

        // Client
        payCuota(purchaseId, cuotaIndex, affiliateId) {
            if (confirm("¿Desea pagar esta cuota? Debe subir un comprobante de Pago")) {
                this.cuotaToPay = {
                    purchaseId,
                    cuotaIndex,
                    ...this.purchaseWithAffiliateData.find(purchase => purchase.purchaseId === purchaseId).cuotas[cuotaIndex]
                };

                this.affiliateToPay = this.allAffiliates.find(aff => aff.id === affiliateId) || {};

                const modal = new Modal(document.getElementById('payCuotaModal'));
                modal.show();
            }
        },
        //File uploads
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            this.paymentFile = file;
            this.paymentPreview = URL.createObjectURL(file);
        },
        async uploadFile(file, paymentDate) {
            // Define storage reference for front or back ID file
            const fileName = `${paymentDate}-${file.name.split('.').pop()}`;
            const fileRef = storageRef(storage, `cuota-payments/${this.userId}-${this.userName}/${fileName}`);

            // Upload the file and get the download URL
            await uploadBytes(fileRef, file);
            return getDownloadURL(fileRef);
        },
        async notifyPayment() {
            if (!this.paymentFile) {
                this.errorMessage = 'El comprobante es requerido.';
                return;
            }

            try {
                this.loading = true;

                // Upload payment file and get the URL
                const paymentUrl = await this.uploadFile(this.paymentFile, this.paymentDate);
                console.log('File uploaded successfully:', paymentUrl);

                // Get the current date to set the paymentDate
                const uploadPaymentDate = new Date(this.paymentDate);
                const formattedDate = uploadPaymentDate.toISOString();

                // Build reference to the specific cuota to update its status
                const purchaseId = this.cuotaToPay.purchaseId;
                const cuotaIndex = this.cuotaToPay.cuotaIndex;
                const dueDate = new Date(this.cuotaToPay.date);

                // Update
                const cuotaRef = dbRef(db, `Users/${this.userId}/credit/main/purchases/${purchaseId}/cuotas/${cuotaIndex}`);
                await update(cuotaRef,
                    {
                        paymentUpload: true,
                        paidAt: formattedDate,
                        paymentUrl: paymentUrl
                    });

                // Points system logic
                let pointsEarned = uploadPaymentDate < dueDate ? 15 : 10;

                const userCreditRef = dbRef(db, `Users/${this.userId}/credit/main`);
                const creditSnapshot = await get(userCreditRef);

                if (creditSnapshot.exists()) {
                    const creditData = creditSnapshot.val();
                    let currentPoints = creditData.points || 0;
                    let currentLevelId = creditData.level_id || null;

                    currentPoints += pointsEarned;

                    // Evaluar si el cliente cambia de nivel
                    const levelsSnapshot = await get(dbRef(db, `Levels`));
                    if (levelsSnapshot.exists()) {
                        const levels = levelsSnapshot.val();

                        let newLevelId = currentLevelId;
                        Object.entries(levels).forEach(([levelId, levelData]) => {
                            if (currentPoints >= levelData.minPoints && currentPoints <= levelData.maxPoints) {
                                newLevelId = levelId; // Cambiar al nivel que coincida con el rango
                            }
                        });

                        if (newLevelId !== currentLevelId) {
                            const newLevel = levels[newLevelId];
                            let totalCredit = creditData.totalCredit || 0;
                            let availableCredit = creditData.availableCredit || 0;
                            totalCredit += totalCredit * 0.10; // Incrementar crédito un 10%
                            availableCredit = totalCredit;

                            await update(userCreditRef, {
                                points: currentPoints,
                                level_id: newLevelId,
                                totalCredit,
                                availableCredit
                            });

                            toast.success(`¡Felicidades! Has alcanzado el nivel ${newLevel.name}.`);
                        } else {
                            await update(userCreditRef, { points: currentPoints });
                            toast.success(`Ganaste ${pointsEarned} puntos. Total: ${currentPoints} puntos.`);
                        }
                    }
                }

                // Setup Payment data 
                const paymentDetails = {
                    purchase_id: purchaseId,
                    client_id: this.userId,
                    amount: this.amountPaid,
                    date: formattedDate,
                    method: this.paymentMethod,
                    proofUrl: this.proofUrl,
                    approved: false,
                    type: 'credit-cuota'
                }

                // Save the payment to the payments collection
                const paymentRef = dbRef(db, `Payments/${this.userId}-${formattedDate.split('T')[0]}`);
                await set(paymentRef, paymentDetails);

                //Success toast
                toast.success('Comprobante subido!');

                //reset the image previews
                this.paymentPreview = null;

                // Hide the modal after submission
                const modal = Modal.getInstance(document.getElementById('payCuotaModal'));
                modal.hide();

                this.currentClient = await this.fetchCredit(this.userId)

            } catch (error) {
                console.error('Error during uploading:', error);
                this.errorMessage = 'Error al subir el archivo, por favor intente nuevamente.';
            } finally {
                // Hide the loader
                this.loading = false;
            }
        },
        copyToClipboard(text) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    toast.success('Texto copiado!');
                })
                .catch(err => {
                    toast.error(`Error: ${err}`);
                });
        },
        
        async submitPayment(paymentData) {
            try {
                this.loading = true;
                const formattedDate = new Date().toISOString();
                const purchaseId = paymentData.purchaseId;

                // Upload payment details
                const paymentDetails = {
                    purchase_id: purchaseId,
                    client_id: this.userId,
                    amount: paymentData.amount,
                    date: formattedDate,
                    method: paymentData.paymentMethod,
                    proofUrl: paymentData.proofUrl,
                    approved: false,
                    type: 'credit-cuota'
                }

                // Save the payment to the payments collection
                const paymentRef = dbRef(db, `Payments/${this.userId}-${formattedDate.split('T')[0]}`);
                await set(paymentRef, paymentDetails);

                showToast('Comprobante subido!', 'success');

                // Hide the modal after submission
                const modal = Modal.getInstance(document.getElementById('payCuotaModal'));
                modal.hide();

                // Refresh client data
                this.currentClient = await this.fetchCredit(this.userId);
            } catch (error) {
                console.error('Error during payment:', error);
                showToast('Error al procesar el pago', 'error');
            } finally {
                this.loading = false;
            }
        },
        async fetchUserLevel(userId) {
            try {
                const creditRef = dbRef(db, `Users/${userId}/credit/main`);
                const creditSnapshot = await get(creditRef);
                
                if (creditSnapshot.exists()) {
                    const { level_id } = creditSnapshot.val();
                    
                    if (level_id) {
                        const levelRef = dbRef(db, `Levels/${level_id}`);
                        const levelSnapshot = await get(levelRef);
                        
                        if (levelSnapshot.exists()) {
                            return levelSnapshot.val();
                        }
                    }
                }
                
                return { name: 'Sin nivel', minPoints: 0 };
            } catch (error) {
                console.error('Error fetching user level:', error);
                return { name: 'Sin nivel', minPoints: 0 };
            }
        },
        async fetchUserPoints(userId) {
            try {
                const pointsRef = dbRef(db, `Users/${userId}/points`);
                const snapshot = await get(pointsRef);
                return snapshot.exists() ? snapshot.val() : 0;
            } catch (error) {
                console.error('Error fetching user points:', error);
                return 0;
            }
        },

        async registerPurchase(purchaseData) {
            try {   
                this.loading = true;
                
                // First verify the purchase code
                const verificationResult = await this.verifyCode(
                    purchaseData.clientId, 
                    purchaseData.verificationCode
                );
                
                if (!verificationResult.success) {
                    throw new Error(verificationResult.message || 'Error al verificar el código');
                }

                // Generate a unique ID for the purchase
                const purchaseId = `purchase_${Date.now()}`;

                // Create the purchase object
                const purchase = {
                    id: purchaseId,
                    clientName: purchaseData.clientName,
                    client_id: purchaseData.clientId,
                    affiliate_id: this.userId,
                    productName: purchaseData.productName,
                    productPrice: purchaseData.productPrice,
                    purchaseAmount: purchaseData.purchaseAmount,
                    remainingAmount: purchaseData.remainingAmount,
                    loanAmount: purchaseData.loanAmount,
                    includeFee: purchaseData.includeFee,
                    terms: purchaseData.terms,
                    frequency: purchaseData.frequency,
                    purchaseDate: new Date(purchaseData.purchaseDate).toISOString().split('T')[0],
                    cuotas: purchaseData.cuotas,
                };

                // Update client's credit
                const clientCreditRef = dbRef(db, `Users/${purchaseData.clientId}/credit/main`);
                const clientCreditSnapshot = await get(clientCreditRef);
                const clientCredit = clientCreditSnapshot.val() || {};

                // Get affiliate's credit
                const affiliateCreditRef = dbRef(db, `Users/${this.userId}/credit/main`);
                const affiliateCreditSnapshot = await get(affiliateCreditRef);
                const affiliateCredit = affiliateCreditSnapshot.val() || {};

                // Calculate new available credits
                const newClientAvailableCredit = (clientCredit.availableCredit || 0) - purchaseData.loanAmount;
                const newAffiliateAvailableCredit = (affiliateCredit.availableCredit || 0) - purchaseData.loanAmount;
                
                if (newClientAvailableCredit < 0) {
                    throw new Error('El restante de la compra supera el monto de crédito disponible del cliente.');
                }

                if (newAffiliateAvailableCredit < 0) {
                    throw new Error('El restante de la compra supera el monto de crédito disponible del comercio.');
                }

                const updates = {
                    [`Users/${purchaseData.clientId}/credit/main/availableCredit`]: newClientAvailableCredit,
                    [`Users/${purchaseData.clientId}/credit/main/purchases/${purchaseId}`]: purchase,
                    [`Users/${this.userId}/credit/main/availableCredit`]: newAffiliateAvailableCredit,
                    [`Users/${this.userId}/credit/sales/${purchaseId}`]: purchase
                };

                // Perform all updates atomically
                await update(dbRef(db), updates);
                
                // Return success
                return true;
                
            } catch (error) {
                console.error('Error registering purchase:', error);
                toast.error(error.message || 'Error al registrar la venta');
                throw error;
            } finally {
                this.loading = false;
            }
        },
        async verifyCode(clientId, code) {
            try {
                // Input validation
                if (!code) {
                    throw new Error('Introduzca un código');
                }

                // Call the cloud function using fetch
                const baseUrl = 'https://us-central1-rose-app-e062e.cloudfunctions.net/verifyCode';
                
                // Send data in the request body
                const response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        clientId: clientId,
                        code: code.toString(),
                        type: 'purchase'
                    })
                });

                const result = await response.json();

                // Check if the response was not ok
                if (!response.ok) {
                    throw new Error(result.message || `Error ${response.status}: ${response.statusText}`);
                }

                // Check the result directly since we're not using a callable function
                if (!result.success) {
                    throw new Error(result.message || 'Error al verificar el código');
                }

                return result;
            } catch (error) {
                console.error('Error verifying code:', error);
                throw error;
            }
        },

        handleClientPageChange(page) {
            this.currentPage.clients = page;
        },
        handleAffiliatePageChange(page) {
            this.currentPage.affiliates = page;
        },
        handleLevelCreated(newLevel) {
            this.levels.push(newLevel);
        },
        handleLevelUpdated(updatedLevel) {
            const index = this.levels.findIndex(l => l.id === updatedLevel.id);
            if (index !== -1) {
                this.levels.splice(index, 1, updatedLevel);
            }
        },
        handleLevelDeleted(levelId) {
            this.levels = this.levels.filter(l => l.id !== levelId);
        },
        openLevelsModal() {
            const modal = new Modal(document.getElementById('levels-modal'));
            modal.show();
        }
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.userId = userStore.userId;
        this.role = userStore.role;
        this.userName = userStore.userName;
        this.isProfileCompleted = userStore.isProfileCompleted;

        if (this.role === 'admin') {
            await this.fetchCurrentTotalCredit();
            await this.fetchLevels();
            await this.fetchClients();
            await this.fetchAffiliates();
        } else if (this.role === 'afiliado') {
            const creditData = await this.fetchAffiliateCreditData(this.userId);
            this.currentAffiliate = {
                companyName: this.userName,
                credit: {
                    mainCredit: creditData?.mainCredit || 0,
                    availableMainCredit: creditData?.availableMainCredit || 0,
                    sales: creditData?.sales || {}
                }
            };
            await this.fetchClients();
        } else if (this.role === 'cliente') {
            const creditData = await this.fetchCredit(this.userId);
            if (creditData) {
                this.currentClient = {
                    credit: {
                        mainCredit: creditData.mainCredit,
                        availableMainCredit: creditData.availableMainCredit,
                        mainPurchases: creditData.mainPurchases || [],
                        plusCredit: creditData.plusCredit,
                        availablePlusCredit: creditData.availablePlusCredit,
                        plusPurchases: creditData.plusPurchases || []
                    },
                    level: await this.fetchUserLevel(this.userId),
                    points: creditData.mainPoints + creditData.plusPoints
                };
            }
            await this.fetchLevels();
            await this.fetchAffiliates();
        }
    }
}

</script>
<template>
    <div class="container py-4">
        <!-- Admin View -->
        <template v-if="role === 'admin'">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4 class="mb-0 fw-500 text-theme">
                    <i class="fas fa-credit-card me-2"></i>
                    Administración de Créditos</h4>
                <a href="#" 
                    class="btn btn-sm btn-theme" @click="openLevelsModal">
                    <i class="fa-solid fa-layer-group me-1"></i>
                    Administrar Niveles
                </a>
            </div>

            <AppCreditStats
                :main-capital="Number(totalMainCapital)"
                :plus-capital="Number(totalPlusCapital)"
                :affiliate-capital="Number(totalAffiliateMainCapital)"
                :alkosto-capital="Number(totalAlkostoCapital)"
                @manage="openAppCreditModal"
            />

            <CreditBreakdown
                :main-credit-used="mainCreditUsed"
                :main-credit-available="mainCreditAvailable"
                :main-assigned-capital="mainAssignedCapital"
                :main-available-to-assign="mainAvailableToAssign"
                :plus-credit-used="plusCreditUsed"
                :plus-credit-available="plusCreditAvailable"
                :plus-assigned-capital="plusAssignedCapital"
                :plus-available-to-assign="plusAvailableToAssign"
                :aff-main-credit-used="affMainCreditUsed"
                :aff-main-credit-available="affMainCreditAvailable"
                :aff-main-assigned-capital="affMainAssignedCapital"
                :aff-main-available-to-assign="affMainAvailableToAssign"
            />

            <ClientCreditList
                :clients="paginatedClients"
                :current-page="currentPage.clients"
                :total-pages="totalPages.clients"
                :filter-clients="filterClients"
                @update:filter-clients="handleFilterChange"
                @assign-credit="openCreditModal('client')"
                @edit-credit="editCredit"
                @remove-credit="removeCreditLine"
                @view-details="showUserDetails"
                @page-change="handleClientPageChange"
            />

            <AffiliateCreditList            
                :affiliates="paginatedAffiliates"
                :current-page="currentPage.affiliates"
                :total-pages="totalPages.affiliates"
                @assign-credit="(type) => openCreditModal('affiliate')"
                @edit-credit="editCredit"
                @remove-credit="removeCreditLine"
                @view-details="showUserDetails"
                @page-change="handleAffiliatePageChange"
                :filter-affiliates="filterAffiliates"
                @update:filter-affiliates="handleFilterAffiliates"                
            />
        </template>

        <!-- Client View -->
        <ClientCreditView
            v-else-if="role === 'cliente'"
            :current-client="currentClient"
            :levels="levels"
            :affiliates="allAffiliates"
            @submit-payment="submitPayment"
        />

        <!-- Affiliate View -->
        <AffiliateCreditView
            v-else-if="role === 'afiliado'"
            :current-affiliate="currentAffiliate || {}"
            :clients="clients"
            @register-purchase="registerPurchase"
            @view-details="showUserDetails"
        />

        <!-- Modals -->
        <LevelsModal 
            :levels="levels"
            @levelCreated="handleLevelCreated"
            @levelUpdated="handleLevelUpdated"
            @levelDeleted="handleLevelDeleted"
        />

        <AppCreditModal
            :credit-type="appCreditType"
            :main-capital="Number(totalMainCapital)"
            :plus-capital="Number(totalPlusCapital)"
            :affiliate-capital="Number(totalAffiliateMainCapital)"
            :alkosto-capital="Number(totalAlkostoCapital)"
            @assign="assignAppCredit"
        />

        <SetCreditModal
            id="set-credit-modal"
            :credit-type="creditType"
            :search-results="searchEntityResults"
            :selected-entities="selectedEntities"
            @search="searchEntities"
            @select="selectEntity"
            @deselect="deselectEntity"
            @assign="assignCredit"
        />

        <EditCreditModal
            :user-data="editUserData"
            :user-type="creditType"
            :credit-line="creditLine"
            @update="updateCredit"
        />

        <CreditDetailsModal
            :user-data="selectedUser"
            :is-client="!selectedUser?.firstName || !selectedUser?.lastName"
            :is-affiliate="!!selectedUser?.companyName"
            :purchases="selectedUser?.credit?.mainPurchases || []"
            :sales="selectedUser?.credit?.sales || {}"
        />
    </div>
</template>

<style scoped>
.fw-500 {
    font-weight: 500;
    color: #fff;
}

h4 {
    color: #fff;
}

.btn-theme {
    background-color: #6f42c1;
    border-color: #6f42c1;
    color: white;
}

.btn-theme:hover {
    background-color: #5a32a3;
    border-color: #5a32a3;
    color: white;
}

.text-theme {
    color: #6f42c1;
}

/* Add some spacing between sections */
.row + .row {
    margin-top: 2rem;
}

/* Consistent card styling */
.card {
    border: none;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    background-color: #2d2d2d;
}

.card-header {
    background-color: #363636;
    border-bottom: 1px solid #444;
    color: #fff;
}

/* Consistent text sizes */
.h5, h5 {
    font-size: 1.1rem;
    color: #fff;
}

.h6, h6 {
    font-size: 0.9rem;
    color: #fff;
}
</style>