<script>
import { db, functions, storage } from '../firebase/init';
import { ref as dbRef, update, set, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
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
            userName: '',

            affiliates: [],
            allAffiliates: [],
            clientsWithAffiliatePurchases: [],
            clients: [],
            allClients: [],
            searchClientResults: [],
            searchEntityResults: [],
            creditType: '',

            selectedClient: null,
            selectedEntity: null,

            searchQuery: '',
            searchClient: '',
            searchEntity: '',
            filterClients: '',

            appCreditType: '',
            creditValue: 0, // data to assign credit to the App

            // For clients 
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

            // For affiliates
            // Main credit line  
            totalAffiliateMainCapital: 0,
            affMainCreditUsed: 0, // Total credit used by clients
            affMainCreditAvailable: 0, // Remaining credit after usage
            affMainAssignedCapital: 0, // Total assigned credit to clients
            affMainAvailableToAssign: 0, // Credit still available to assign to clients

            clientId: '',
            clientCredit: 0,

            clientApprovedCred: null,
            clientUsedCred: null,
            requestedAmount: 0,

            activeTab: null,

            currentPage: 1,
            itemsPerPage: 9,

            loading: false,
            waiting: false,
            verificationRequested: false,
            verificationCode: '',

            creditAmount: 0,
            creditLine: '',

            productName: '',
            productPrice: 0,

            purchaseDate: new Date().toLocaleDateString('en-CA'),
            purchaseAmount: 0,
            remainingAmount: 0,
            loanAmount: 0,
            calc: false,
            terms: 2, // default to 2 cuota
            frequency: 2, // default to bi-weekly payments
            cuotaDates: [],
            quotesAmount: [],

            clientDetails: null,
            currentClient: null,
            currentAffiliate: null,

            selectedAffiliate: null,
            selectedAffiliateClients: [],

            pendingPayments: [],
            paidPurchases: [],

            showPurchases: false,
            purchaseWithAffiliateData: [],
            showSubscription: false,

            // For client logic
            cuotaToPay: null,
            purchaseIdToPay: null,
            paymentFile: null,
            paymentPreview: null,
            paymentUrl: null,
            paymentDate: new Date().toISOString().split('T')[0],
            amountPaid: 0,
            errorMessage: '',
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
        formatDate(dateString) {
            const [year, month, day] = dateString.split("-");
            return `${day}-${month}-${year}`;
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

        //FOR ADMIN USE
        //Fetch data 
        async fetchCurrentTotalCredit() {
            try {
                const creditRef = dbRef(db, `AppCapital`);
                const creditSnapshot = await get(creditRef);

                if (creditSnapshot.exists()) {
                    const creditData = creditSnapshot.val();
                    this.totalMainCapital = creditData.main?.value ? parseFloat(creditData.main.value).toFixed(2) : 0;
                    this.totalPlusCapital = creditData.plus?.value ? parseFloat(creditData.plus.value).toFixed(2) : 0;
                    this.totalAffiliateMainCapital = creditData.affiliateMain?.value ? parseFloat(creditData.affiliateMain.value).toFixed(2) : 0;
                } else {
                    console.log('No credit data found.');
                    this.totalMainCapital = 0;
                    this.totalPlusCapital = 0;
                    this.totalAffiliateMainCapital = 0;
                }
            } catch (error) {
                console.error('Error fetching current capital:', error);
                this.totalMainCapital = 0;
                this.totalPlusCapital = 0;
                this.totalAffiliateMainCapital = 0;
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
                        const affiliateCredit = await this.fetchCredit(key);

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
                                    subId, // Include the subscription ID
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

                    // Check if the mainCredit and plusCredit exist and are greater than 0
                    const mainCredit = creditData?.main?.totalCredit || null;
                    const availableMainCredit = creditData?.main?.availableCredit || null;
                    const mainPurchases = creditData?.main?.purchases || null;

                    const plusCredit = creditData?.plus?.totalCredit || null;
                    const availablePlusCredit = creditData?.plus?.availableCredit || null;
                    const plusPurchases = creditData?.plus?.purchases || null;

                    // Only return the user credit if either credit line is assigned
                    if (mainCredit > 0 || plusCredit > 0 || mainPurchases || plusPurchases) {
                        return {
                            mainCredit,
                            availableMainCredit,
                            mainPurchases,
                            plusCredit,
                            availablePlusCredit,
                            plusPurchases
                        };
                    }
                }
                return null; // No credit assigned, return null
            } catch (error) {
                console.error('Error fetching users credit:', error);
                return null;
            }
        },
        async fetchAffiliateSales(affiliateId) {
            try {
                const affiliateSalesRef = dbRef(db, `Users/${affiliateId}/credit/sales`);
                const affiliateSnapshot = await get(affiliateSalesRef);

                if (affiliateSnapshot.exists()) {
                    const saleData = affiliateSnapshot.val();

                    // Check if the sales exist, if no return an empty object
                    const sales = saleData || {};

                    // Only return the sales if they exist
                    if (sales) {
                        return {
                            sales
                        };
                    }
                }
                return null; // No sales made, return null
            } catch (error) {
                console.error('Error fetching affiliates sales:', error);
                return null;
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

        // Set App's total credit capital
        initializeCreditValue(creditType) {
            // Set the input value in the modal to reflect the current credit
            if (creditType === 'main') {
                this.creditValue = parseFloat(this.totalMainCapital);
            } else if (creditType === 'plus') {
                this.creditValue = parseFloat(this.totalPlusCapital);
            } else if (creditType === 'affiliateMain') {
                this.creditValue = parseFloat(this.totalAffiliateMainCapital);
            }
            // else if (creditType === 'affiliatePlus') {
            //     this.creditValue = parseFloat(this.totalAffiliatePlusCapital);
            // }

        },
        openAppCreditModal(creditLine) {
            this.appCreditType = creditLine;

            const modal = new Modal(document.getElementById('set-credit'));
            modal.show();
        },
        async setCredit(creditLine) {
            if (confirm("¿Desea asignar este nuevo capital a la App?")) {

                const creditRef = dbRef(db, `AppCapital/${creditLine}`);
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

        searchEntities() {
            // Clear results if the search query is empty
            if (!this.searchEntity.trim()) {
                this.searchEntityResults = [];
                return;
            }

            const searchQuery = this.searchEntity.toLowerCase();

            // Determine which list to search based on the creditType ('client' or 'affiliate')
            const userList = this.creditType === 'client' ? this.allClients : this.allAffiliates;

            // Filter by search query, applying different filters for clients and affiliates
            this.searchEntityResults = userList.filter(user => {
                let matches = false;

                // Check filters for clients
                if (this.creditType === 'client') {
                    const isVerified = user.isVerified === true;
                    const hasSubscription = user.subscription && user.subscription.price > 0;

                    // Ensure the client is verified and has a subscription before checking search query
                    if (!isVerified || !hasSubscription) {
                        return false;
                    }

                    // Search by identification and full name for clients
                    const identification = (user.identification || '').toString().toLowerCase();
                    const name = (user.firstName + ' ' + user.lastName).toLowerCase();
                    matches = identification.includes(searchQuery) || name.includes(searchQuery);

                }
                // Check only subscription filter for affiliates
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
            // Set selected client or affiliate based on userType
            if (this.creditType === 'client') {
                this.selectedEntity = {
                    name: `${user.firstName} ${user.lastName}`,
                    identification: user.identification,
                    ...user
                };

            } else if (this.creditType === 'affiliate') {
                this.selectedEntity = {
                    name: user.companyName,
                    identification: user.rif,
                    ...user
                };
                // this.selectedEntity.credit = this.fetchAffiliateCredit(user.id);
            }

            console.log(`Selected ${this.creditType}:`, user.id);

            // Clear the search input and results after selection
            this.searchEntity = '';
            this.searchEntityResults = [];
        },

        // Set an affiliate or client's credit
        openCreditModal(type) {
            this.creditType = type;
            const modal = new Modal(document.getElementById('set-credit-modal'));
            modal.show();
        },
        async assignCredit() {
            if (this.creditLine === 'plus') {
                // this.calculatePlusCredits()
                alert('Esta opción no está disponible por el momento.');
                return;
            }

            if (!this.selectedEntity || this.creditAmount <= 0) {
                if (this.creditType === 'client') {
                    alert('Por favor seleccione un cliente y un monto a asignar.');
                    return;
                } else {
                    alert('Por favor seleccione un comercio y un monto a asignar.');
                    return;
                }

            }

            // REMOVE THIS VALIDATIONS, ONLY ASSIGN TO SUBSCRIBED AND VERIFIED USERS
            // Check if selected entity is verified and has a subscription if it's a client
            if (this.creditType === 'client') {
                if (!this.selectedEntity.isVerified) {
                    alert('El cliente no está verificado.');
                    return;
                }

                if (!this.selectedEntity.subscription) {
                    alert('El cliente no cuenta con una suscripción.');
                    return;
                }

                if (this.selectedEntity.subscription.price <= 0) {
                    alert('El cliente no cuenta con una suscripción paga.');
                    return;
                }
            }

            // Check if there is available credit to assign in the app
            if (this.creditAmount > this.mainAvailableToAssign) {
                alert('No hay suficiente capital para asignar.');
                return;
            }

            try {
                if (!this.creditLine) {
                    alert('Seleccione una linea de credito para asignar');
                    return;
                }

                // Determine credit path based on entity type
                const entityCreditPath = `Users/${this.selectedEntity.id}/credit/${this.creditLine}`;

                // Update the selected entity's credit
                const newEntityCredit = this.creditAmount;

                await update(dbRef(db, entityCreditPath), {
                    totalCredit: newEntityCredit,
                    availableCredit: newEntityCredit
                });

                this.calculateMainCredits();
                this.calculateAffiliatesCredits();

                this.showToast(`Al ${this.creditType === 'client' ? 'cliente' : 'comercio'} ${this.selectedEntity.name} se le asigno un credito de $${newEntityCredit}`);

                // Reset after assignment
                this.selectedEntity = null;
                this.creditAmount = 0;
                await this.fetchClients();
                await this.fetchAffiliates();
            } catch (error) {
                console.error('Error assigning credit:', error);
                alert('No se pudo asignar el crédito.');
            }
        },

        calcs(client) {
            if (this.productPrice <= 0) {
                alert('Ingrese el precio del producto para calcular.');
                return;
            }

            if (!client) {
                alert('Debe seleccionar un cliente para calcular sus cuotas.');
                return;
            }

            if (client.credit.availableMainCredit <= 0) {
                alert('El cliente no tiene crédito disponible.');
                return;
            }

            // Toggle on: perform calculations
            this.calc = true;

            // Calculate half the product price and set variables for initial payment and remaining amount
            const halfProductPrice = this.productPrice / 2;
            let initial = 0;
            let remainingAmount = 0;

            // Condition 1: If available credit is greater than half the product price
            if (client.credit.availableMainCredit > halfProductPrice) {
                initial = halfProductPrice;
                remainingAmount = halfProductPrice;

                // Condition 2: If available credit is less than half the product price
            } else {
                initial = this.productPrice - client.credit.availableMainCredit;
                remainingAmount = client.credit.availableMainCredit;
            }

            // Set initial purchase amount and quotes
            this.purchaseAmount = initial;
            this.remainingAmount = remainingAmount;

            // Adjust the fixed addOn amount based on the client's subscription tier
            let additionalAmount = 0;
            if (client.subscription.order == 2) {
                additionalAmount = 2;
            } else if (client.subscription.order == 3) {
                additionalAmount = 1;
            }

            // Calculate the remaining amount with the subscription adjustment
            const adjustedRemainingAmount = remainingAmount + additionalAmount;
            this.loanAmount = adjustedRemainingAmount;

            // Divide the adjusted remaining amount into terms and set quotesAmount array
            this.quotesAmount = Array(this.terms).fill(adjustedRemainingAmount / this.terms);

            // Calculate the payment dates based on frequency
            this.cuotaDates = this.calculatePaymentDates(this.purchaseDate, this.terms, this.frequency);
        },
        calculatePaymentDates(startDate, terms, frequency) {
            let paymentDates = [];
            let paymentDate = new Date(new Date(startDate).toISOString());

            for (let i = 0; i < terms; i++) {
                if (frequency == '2') { // Bi-weekly (quincenal)
                    paymentDate.setUTCDate(paymentDate.getUTCDate() + 15); // Add 15 days for each term
                } else if (frequency == '1') { // Monthly (mensual)
                    paymentDate.setUTCMonth(paymentDate.getUTCMonth() + 1); // Add 1 month for each term
                }

                // Convert to local date in YYYY-MM-DD format for display
                const localDate = new Date(paymentDate.getTime() - paymentDate.getTimezoneOffset() * 60000)
                    .toISOString().split('T')[0];

                paymentDates.push(localDate);
            }

            return paymentDates;
        },
        cancelCals() {
            // Toggle off: reset the fields
            this.calc = false;
            this.selectedClient = null;
            this.showSubscription = false;
            this.purchaseAmount = 0;
            this.loanAmount = 0;
            this.productPrice = 0;
            this.productName = '';
            this.quotesAmount = [];
            this.cuotaDates = [];
            this.verificationRequested = false;
        },

        // Make purchase logic
        async generateAndStoreCode(clientId) {
            const verificationCode = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit code

            // Store the code temporarily in Firebase
            await set(dbRef(db, `verificationCodes/${clientId}`), {
                code: verificationCode,
                createdAt: Date.now()
            });

            return verificationCode;
        },
        async askForCode(client) {
            try {
                this.waiting = true;

                if (!client) {
                    alert('Primero seleccione un cliente');
                    return;
                }

                if (client.credit.availableMainCredit <= 0) {
                    alert('El cliente no tiene crédito disponible.');
                    return;
                }

                // Send the verification code to the selected client
                if (!this.verificationRequested) {
                    await this.sendVerificationCode(client);
                    this.verificationRequested = true;
                    alert("El Código de verificación se ha enviado al correo del cliente. Espere el código para proceder.");
                }
            } catch (error) {
                console.error('Error sending the verification code to the client.', error);
            } finally {
                this.waiting = false;
            }
        },
        async sendVerificationCode(client) {
            const verificationCode = await this.generateAndStoreCode(client.id);

            const payload = {
                to: client.email,
                message: {
                    subject: `Su Código de verificación`,
                    text: `Hola ${client.firstName}, tu código de verificación de RoseCoupon es: ${verificationCode}.`,
                    html: `<p>Hola ${client.firstName}, tu código de verificación de RoseCoupon es: ${verificationCode}.</p>`
                },
            };

            // Send via Email
            if (client.email) {
                await this.sendEmail(payload);
            }
        },
        async verifyCode(clientId, enteredCode) {
            try {
                const snapshot = await get(dbRef(db, `verificationCodes/${clientId}`));

                if (!snapshot.exists()) {
                    alert("El código no existe. Por favor, solicite uno nuevo.");
                    return false;
                }

                const { code: storedCode, createdAt: codeTimestamp } = snapshot.val();

                // Check if the entered code matches the stored code
                if (storedCode !== enteredCode) {
                    alert('Código incorrecto.');
                    return false;
                }

                // Check if the code is within the 5-minute validity window
                const fiveMinutes = 5 * 60 * 1000;
                if (Date.now() - codeTimestamp > fiveMinutes) {
                    alert("El código de verificación ha expirado. Por favor, solicite uno nuevo.");
                    return false;
                }

                // If both checks pass, verification is successful
                return true;

            } catch (error) {
                console.error("Error verifying code:", error);
                alert("Error al verificar el código. Inténtelo de nuevo.");
                return false;
            }
        },
        async savePurchase() {
            try {
                this.loading = true;

                // Check if the required fields are present and the purchase amount is positive
                if (!this.selectedClient || this.purchaseAmount <= 0) {
                    alert('Por favor seleccione un cliente y un monto de compra.');
                    this.loading = false;
                    return;
                }

                // Prompt for verification code input
                const isVerified = await this.verifyCode(this.selectedClient.id, this.verificationCode);

                if (!isVerified) {
                    this.loading = false;
                    return;
                }

                // Verify that the affiliates's available credit can cover the purchase
                if (this.currentAffiliate.availableMainCredit < this.purchaseAmount) {
                    alert('El valor de la compra supera el monto de crédito disponible del comercio.');
                    this.loading = false;
                    return;
                }

                // Verify that the client's available credit is sufficient for the purchase
                if (this.selectedClient.credit.availableMainCredit < this.remainingAmount) {
                    alert('El restante de la compra supera el monto de crédito disponible del cliente.');
                    this.loading = false;
                    return;
                }

                // Deduct the purchase amount from the client's available credit
                const clientCreditsRef = dbRef(db, `Users/${this.selectedClient.id}/credit/main`);
                const snapshot = await get(clientCreditsRef);

                if (snapshot.exists()) {
                    const availableCredit = snapshot.val().availableCredit;

                    const updatedCredit = availableCredit - this.remainingAmount;
                    await update(clientCreditsRef,
                        {
                            availableCredit: updatedCredit,
                        });

                }

                // Deduct the purchase amount from the affiliates's available credit
                const affCreditsRef = dbRef(db, `Users/${this.userId}/credit/main`);
                const affSnapshot = await get(affCreditsRef);

                if (affSnapshot.exists()) {
                    const availableAffCredit = affSnapshot.val().availableCredit;

                    const updatedCredit = availableAffCredit - this.remainingAmount;
                    await update(affCreditsRef,
                        {
                            availableCredit: updatedCredit,
                        });
                }

                // Generate a unique purchase ID for tracking
                const purchaseId = `purchase_${Date.now()}`;

                // Format cuotas as an array of objects with amount, date, and paid fields
                const cuotas = this.quotesAmount.map((amount, index) => ({
                    cuote: index + 1,
                    amount: amount,
                    date: this.cuotaDates[index],
                    paid: false // default unpaid
                }));

                // Create a purchase object with necessary details
                const purchaseData = {
                    affiliate_id: this.userId,
                    client_id: this.selectedClient.id,
                    productName: this.productName,
                    productPrice: this.productPrice,
                    purchaseAmount: this.purchaseAmount, // Initial
                    remainingAmount: this.remainingAmount, // Remaining
                    loanAmount: this.loanAmount, // total loan with fixed addOn based on subscription
                    terms: this.terms,
                    frequency: this.frequency,
                    cuotas: cuotas,
                    purchaseDate: new Date(this.purchaseDate).toISOString().split('T')[0],
                    paid: false // default status
                };

                // Register the purchase in the client's purchases collection
                const clientPurchaseRef = dbRef(db, `Users/${this.selectedClient.id}/credit/main/purchases/${purchaseId}`);
                await set(clientPurchaseRef, purchaseData);

                // Register the purchase in the affiliate's sales collection
                const affiliatePurchaseRef = dbRef(db, `Users/${this.userId}/credit/sales/${purchaseId}`);
                await set(affiliatePurchaseRef, purchaseData);

                this.showToast('Compra registrada!');

                // Reset form fields
                this.selectedClient = null;
                this.showSubscription = false;
                this.productName = '';
                this.productPrice = 0;
                this.fetchClients();

            } catch (error) {
                console.error('Error making purchase:', error);
                alert('No se pudo registrar la compra.');
            } finally {
                this.loading = false;
                this.verificationCode = '';
                this.verificationRequested = false;
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
        getAffiliateName(affiliateId) {
            const affiliate = this.allAffiliates.find(a => a.id === affiliateId);
            return affiliate ? affiliate.companyName : "Unknown Affiliate";
        },
        getClientName(clientId) {
            const client = this.allClients.find(c => c.id === clientId);
            return client ? client.firstName + ' ' + client.lastName : "Unknown Client";
        },

        async cancelCredit(user, userType, creditLine) {
            if (confirm("¿Desea revocar el crédito de este cliente? Sus compras seguiran registradas.")) {
                try {
                    this.loading = true;
                    let userName = '';

                    if (userType === 'client') {
                        userName = `${user.firstName} ${user.lastName}`;
                    } else if (userType === 'affiliate') {
                        userName = `${user.companyName}`;
                    }

                    const clientRef = dbRef(db, `Users/${user.id}/credit/${creditLine}`);
                    await update(clientRef, {
                        deletedAt: new Date().toISOString()
                    });

                    this.showToast(`Línea de crédito removida para ${userName}`);
                    if (userType === 'client') {
                        this.fetchClients();
                    } else if (userType === 'affiliate') {
                        this.fetchAffiliates();
                    }

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
                    await this.sendEmail(clientEmailPayload);
                } catch (error) {
                    console.error('Error cancelling credit:', error);
                } finally {
                    this.loading = false;
                }
            }
        },

        async affiliateActivity(affiliate) {
            this.clientsWithAffiliatePurchases = [];
            this.selectedAffiliate = affiliate;

            // Fetch sales data for the affiliate from their 'credit' object
            const affiliateSalesData = await this.fetchAffiliateSales(affiliate.id);

            if (affiliateSalesData && affiliateSalesData.sales) {
                for (const [purchaseId, purchase] of Object.entries(affiliateSalesData.sales)) {
                    // Find client details based on clientId in each purchase
                    const client = this.allClients.find(c => c.id === purchase.client_id);

                    if (client) {
                        // Group purchases by client
                        let clientPurchases = this.clientsWithAffiliatePurchases.find(c => c.client_id === client.id);

                        // If client not already added, initialize their purchases array
                        if (!clientPurchases) {
                            clientPurchases = {
                                clientId: client.id,
                                clientName: `${client.firstName} ${client.lastName}`,
                                purchases: []
                            };
                            this.clientsWithAffiliatePurchases.push(clientPurchases);
                        }

                        // Push purchase details with the client name and purchase date
                        clientPurchases.purchases.push({
                            purchaseId,
                            productName: purchase.productName,
                            productPrice: purchase.productPrice,
                            purchaseAmount: purchase.purchaseAmount,
                            purchaseDate: purchase.purchaseDate,
                            terms: purchase.terms,
                            frequency: purchase.frequency,
                            cuotas: purchase.cuotas
                        });
                    }
                }
            }

            this.selectedAffiliateClients = this.clientsWithAffiliatePurchases;

            const modal = new Modal(document.getElementById('affiliatesActivityModal'));
            modal.show();
        },
        async markPaid(purchaseId, purchaseData) {
            if (confirm("¿Desea marcar como pagado?")) {
                try {
                    const affiliateId = this.selectedAffiliate.id;

                    const purchaseRef = dbRef(db, `Users/${affiliateId}/credit/sales/${purchaseId}`);

                    // Update the 'paid' field to true
                    await update(purchaseRef, { paid: true });

                    // Optionally update the UI to reflect the change
                    purchaseData.paid = true;

                    this.showToast("Purchase marked as paid successfully.");
                } catch (error) {
                    console.error("Error marking purchase as paid:", error);
                    alert("An error occurred while marking the purchase as paid.");
                }
            }
        },

        async setActiveTab(type) {
            if (!type) return;

            this.activeTab = type;
            console.log(this.activeTab);

            // Fetch and filter sales based on tab type
            const sales = await this.fetchAffiliateSales(this.userId);

            if (sales) {
                const salesArray = Object.entries(sales.sales || {}).map(([purchaseId, purchaseData]) => ({
                    purchaseId,
                    ...purchaseData,
                }));

                // Filter sales based on paid status
                this[type === 'pendingPayments' ? 'pendingPayments' : 'paidPurchases'] =
                    salesArray.filter((purchase) => (type === 'pendingPayments' ? !purchase.paid : purchase.paid));
            }
        },
        resetModal() {
            this.selectedEntity = null;
            this.creditAmount = 0;
        },

        openPurchases(purchases) {
            this.showPurchases = !this.showPurchases;

            if (this.showPurchases) {
                this.purchaseWithAffiliateData = Object.entries(purchases).map(([purchaseId, purchaseData]) => {
                    // Find affiliate data based on affiliate_id
                    const affiliate = this.allAffiliates.find(aff => aff.id === purchaseData.affiliate_id) || {};

                    // Merge purchase data with affiliate details
                    return {
                        purchaseId,
                        ...purchaseData,
                        affiliateName: affiliate.companyName || 'Desconocido',
                        affiliateImage: affiliate.image || ''
                    };
                });

                console.log(this.purchaseWithAffiliateData); // Verify enriched data
            }
        },

        // Client
        payCuota(purchaseId, cuotaIndex) {
            if (confirm("¿Desea pagar esta cuota? Debe subir un comprobante de Pago")) {
                this.cuotaToPay = {
                    purchaseId,
                    cuotaIndex,
                    ...this.purchaseWithAffiliateData.find(purchase => purchase.purchaseId === purchaseId).cuotas[cuotaIndex]
                };

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

                // Update
                const cuotaRef = dbRef(db, `Users/${this.userId}/credit/main/purchases/${purchaseId}/cuotas/${cuotaIndex}`);
                await update(cuotaRef,
                    {
                        paymentUpload: true,
                        paidAt: formattedDate,
                        paymentUrl: paymentUrl
                    });

                const paymentDetails = {
                    purchase_id: purchaseId,
                    client_id: this.userId,
                    amount: this.amountPaid,
                    date: formattedDate,
                    approved: false,
                    type: 'credit-cuota'
                }

                // Save the payment to the payments collection
                const paymentRef = dbRef(db, `Payments/${this.userId}-${formattedDate.split('T')[0]}`);
                await set(paymentRef, paymentDetails);

                //Success toast
                this.showToast('Comprobante subido!');

                //reset the image previews
                this.paymentPreview = null;

                // Hide the modal after submission
                const modal = Modal.getInstance(document.getElementById('payCuotaModal'));
                modal.hide();

            } catch (error) {
                console.error('Error during uploading:', error);
                this.errorMessage = 'Error al subir el archivo, por favor intente nuevamente.';
            } finally {
                // Hide the loader
                this.loading = false;
            }
        },

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
        this.userName = userStore.userName;

        if (this.role === 'admin') {
            await this.fetchCurrentTotalCredit();
            await this.fetchClients();
            await this.fetchAffiliates();
        } else if (this.role === 'afiliado') {
            this.currentAffiliate = await this.fetchCredit(this.userId) || {};
            await this.fetchClients();
        } else if (this.role === 'cliente') {
            this.currentClient = await this.fetchCredit(this.userId) || {};
            await this.fetchAffiliates();
        }
    }
}

</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Crédito
    </h2>

    <div v-if="this.role === 'admin'" class="container">
        <!-- App's Predefined Credit -->
        <div class="row g-3 justify-content-center mb-3">
            <!-- Capital de Rose Credit -->
            <div class="col-12 col-sm-6 col-md-4">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-4 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital de Rose Credit</h6>
                        <h4 class="mb-3"><strong>${{ this.totalMainCapital }}</strong></h4>
                        <a href="#" class="btn btn-theme btn-sm px-3 mt-2 shadow-sm"
                            @click="initializeCreditValue('main'), openAppCreditModal('main')">Administrar</a>
                    </div>
                </div>
            </div>

            <!-- Capital de Rose Credit Plus -->
            <div class="col-12 col-sm-6 col-md-4">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-4 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital de Rose Credit Plus</h6>
                        <h4 class="mb-3"><strong>${{ this.totalPlusCapital }}</strong></h4>
                        <a href="#" class="btn btn-theme btn-sm px-3 mt-2 shadow-sm"
                            @click="initializeCreditValue('plus'), openAppCreditModal('plus')">Administrar</a>
                    </div>
                </div>
            </div>

            <!-- Capital de Rose Credit para Comercios -->
            <div class="col-12 col-sm-6 col-md-4">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-4 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital de Rose Credit para Comercios</h6>
                        <h4 class="mb-3"><strong>${{ this.totalAffiliateMainCapital }}</strong></h4>
                        <a href="#" class="btn btn-theme btn-sm px-3 mt-2 shadow-sm"
                            @click="initializeCreditValue('affiliateMain'), openAppCreditModal('affiliateMain')">Administrar</a>
                    </div>
                </div>
            </div>
        </div>

        <hr class="mt-5">

        <!-- Credit breakdown -->
        <!-- Main line -->
        <div class="row g-3 mb-3">
            <h6 class="ps-2">Línea Rose Credit</h6>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Usado</h6>
                        <h5><strong>${{ mainCreditUsed }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Disponible</h6>
                        <h5><strong>${{ mainCreditAvailable }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Asignado</h6>
                        <h5><strong>${{ mainAssignedCapital }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Disponible para Asignar</h6>
                        <h5><strong>${{ mainAvailableToAssign }}</strong></h5>
                    </div>
                </div>
            </div>
        </div>

        <!-- Plus line -->
        <div class="row g-3 mb-3">
            <h6 class="ps-2">Línea Rose Credit Plus</h6>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Usado</h6>
                        <h5><strong>${{ plusCreditUsed }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Disponible</h6>
                        <h5><strong>${{ plusCreditAvailable }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Asignado</h6>
                        <h5><strong>${{ plusAssignedCapital }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Disponible para Asignar</h6>
                        <h5><strong>${{ plusAvailableToAssign }}</strong></h5>
                    </div>
                </div>
            </div>
        </div>

        <!-- Affiliates line -->
        <div class="row g-3 mb-3">
            <h6 class="ps-2">Línea para Comercios</h6>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Usado</h6>
                        <h5><strong>${{ affMainCreditUsed }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Disponible</h6>
                        <h5><strong>${{ affMainCreditAvailable }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Asignado</h6>
                        <h5><strong>${{ affMainAssignedCapital }}</strong></h5>
                    </div>
                </div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                    <div class="card-body text-center py-3 px-2">
                        <h6 class="card-title mb-2 text-muted">Capital Disponible para Asignar</h6>
                        <h5><strong>${{ affMainAvailableToAssign }}</strong></h5>
                    </div>
                </div>
            </div>
        </div>

        <hr class="mt-5">

        <!-- Credit status for Clients -->
        <div class="row">

            <h5>Estado de crédito por Cliente</h5>

            <div class="d-flex justify-content-end align-items-center mb-4 mt-3">
                <a href="#" class="btn btn-theme me-2" @click.prevent="openCreditModal('client')">Asignar Credito a
                    Cliente
                </a>
            </div>

            <!-- Search Bar to Filter clients -->
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

                            <h5 class="card-title text-center mb-3">
                                {{ client.firstName }} {{ client.lastName }}
                            </h5>

                            <p class="card-text"><strong>Cédula: </strong> V{{ client.identification }}</p>

                            <!-- Crédito aprobado -->
                            <div class="row">
                                <!-- Main approved Credit Card -->
                                <div class="col-6 d-flex">
                                    <div class="card text-center w-100 equal-height">
                                        <div class="card-header text-center py-3 px-2">
                                            <h6><strong>Crédito Principal Aprobado</strong></h6>
                                        </div>
                                        <div class="card-body">
                                            <p v-if="client.credit.mainCredit">
                                                <span class="badge"
                                                    :class="client.credit.mainCredit.isDeleted ? 'bg-danger' : 'bg-success'"
                                                    style="font-size: 1rem;">
                                                    ${{ client.credit.mainCredit }}
                                                </span>

                                            <div class="d-flex justify-content-center mt-2"
                                                style="position: relative; z-index: 10;">
                                                <button class="btn btn-sm btn-outline-info me-1"
                                                    @click="editCredit(client, 'main')">
                                                    <i class="fa-solid fa-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger"
                                                    @click="cancelCredit(client, 'client', 'main')">
                                                    <i class="fa-solid fa-times"></i>
                                                </button>
                                            </div>
                                            </p>
                                            <p v-else>
                                                <span class="badge bg-secondary text-black text-center p-2"
                                                    style="font-size: 0.7rem; word-break: break-word; white-space: normal;">
                                                    Sin Crédito aprobado
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Plus approved Credit Card -->
                                <div class="col-6 d-flex">
                                    <div class="card text-center w-100 equal-height">
                                        <div class="card-header text-center py-3 px-2">
                                            <h6><strong>Crédito Plus Aprobado</strong></h6>
                                        </div>
                                        <div class="card-body">
                                            <p v-if="client.credit.plusCredit">
                                                <span class="badge"
                                                    :class="client.credit.mainCredit.isDeleted ? 'bg-danger' : 'bg-success'"
                                                    style="font-size: 1rem;">
                                                    ${{ client.credit.plusCredit }}
                                                </span>

                                            <div class="d-flex justify-content-center mt-2"
                                                style="position: relative; z-index: 10;">
                                                <button class="btn btn-sm btn-outline-info me-1"
                                                    @click="editCredit(client, 'plus')">
                                                    <i class="fa-solid fa-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger"
                                                    @click="cancelCredit(client, 'client', 'plus')">
                                                    <i class="fa-solid fa-times"></i>
                                                </button>
                                            </div>
                                            </p>
                                            <p v-else>
                                                <span class="badge bg-secondary text-black text-center p-2"
                                                    style="font-size: 0.7rem; word-break: break-word; white-space: normal;">
                                                    Sin Crédito Plus aprobado
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Crédito restante -->
                            <div class="row mt-3">
                                <!-- Main available Credit Card -->
                                <div class="col-6 d-flex">
                                    <div class="card text-center w-100 equal-height">
                                        <div class="card-header text-center py-3 px-2">
                                            <h6><strong>Crédito Principal Restante</strong></h6>
                                        </div>
                                        <div class="card-body">
                                            <h5 v-if="client.credit.availableMainCredit">
                                                <span class="badge"
                                                    :class="client.credit.mainCredit.isDeleted ? 'bg-danger' : 'bg-success'"
                                                    style="font-size: 1rem;">
                                                    ${{ client.credit.availableMainCredit }}
                                                </span>
                                            </h5>
                                            <p v-else>
                                                <span class="badge bg-secondary text-black text-center p-2"
                                                    style="font-size: 0.7rem; word-break: break-word; white-space: normal;">
                                                    Crédito consumido
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Plus available Credit Card -->
                                <div class="col-6 d-flex">
                                    <div class="card text-center w-100 equal-height">
                                        <div class="card-header text-center py-3 px-2">
                                            <h6><strong>Crédito Plus Restante</strong></h6>
                                        </div>
                                        <div class="card-body">
                                            <h5 v-if="client.credit.availablePlusCredit">
                                                <span class="badge"
                                                    :class="client.credit.mainCredit.isDeleted ? 'bg-danger' : 'bg-success'"
                                                    style="font-size: 1rem;">
                                                    ${{ client.credit.availablePlusCredit }}
                                                </span>
                                            </h5>
                                            <p v-else>
                                                <span class="badge bg-secondary text-black text-center p-2"
                                                    style="font-size: 0.7rem; word-break: break-word; white-space: normal;">
                                                    Sin Crédito Plus aprobado
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- action buttons -->
                            <div class="row justify-content-center">
                                <button class="btn btn-outline-success btn-md mt-3 me-2" @click="openDetails(client)"
                                    style="width: auto;">
                                    Ver Actividad
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
                    <h5>No hay Clientes con credito aprobado.</h5>
                </div>
            </div>
        </div>

        <hr class="mt-5">

        <!-- Credit status for Affiliates -->
        <div class="row">
            <h5 class="mb-4">Estado de Crédito por Comercio Afiliado</h5>

            <div class="d-flex justify-content-end align-items-center mb-4 mt-3">
                <a href="#" class="btn btn-theme me-2" @click.prevent="openCreditModal('affiliate')">Asignar Credito a
                    Comercio
                </a>
            </div>

            <!-- Search Bar to Filter Affiliates -->
            <div>
                <input type="text" class="form-control" v-model="searchQuery"
                    placeholder="Buscar comercio por nombre o RIF..." />
            </div>

            <div class="row mt-4">
                <div class="col-12 col-md-12 col-lg-4 mb-3" v-for="(aff, index) in paginatedAffiliates" :key="aff.id">
                    <div class="card h-100">
                        <div class="card-body d-flex flex-column position-relative">

                            <h5 class="card-title text-center mb-3">
                                {{ aff.companyName }}
                            </h5>

                            <!-- Circular Image Display with Fixed Dimensions -->
                            <div class="img-container justify-content-center mb-3 d-flex align-items-center"
                                v-if="aff.image">
                                <img :src="aff.image" alt="logo" class="img-fluid img-thumbnail rounded-circle"
                                    style="width: 120px; height: 120px; object-fit: cover;">
                            </div>

                            <p class="card-text"><strong>RIF: </strong> {{ aff.rif }}</p>

                            <!-- Crédito aprobado -->
                            <div class="row">
                                <!-- Main approved Credit Card -->
                                <div class="col-6 d-flex">
                                    <div class="card text-center w-100 equal-height">
                                        <div class="card-header">
                                            <h6><strong>Crédito Principal Aprobado</strong></h6>
                                        </div>
                                        <div class="card-body">
                                            <p v-if="aff.credit.mainCredit">
                                                <span class="badge"
                                                    :class="aff.credit.mainCredit.isDeleted ? 'bg-danger' : 'bg-success'"
                                                    style="font-size: 1rem;">
                                                    ${{ aff.credit.mainCredit }}
                                                </span>

                                            <div class="d-flex justify-content-center mt-2"
                                                style="position: relative; z-index: 10;">
                                                <button class="btn btn-sm btn-outline-info me-1"
                                                    @click="editCredit(aff, 'main')">
                                                    <i class="fa-solid fa-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger"
                                                    @click="cancelCredit(aff, 'affiliate', 'main')">
                                                    <i class="fa-solid fa-times"></i>
                                                </button>
                                            </div>
                                            </p>
                                            <p v-else>
                                                <span class="badge bg-secondary text-black text-center p-2"
                                                    style="font-size: 0.7rem; word-break: break-word; white-space: normal;">
                                                    Sin Crédito aprobado
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Main available Credit Card -->
                                <div class="col-6 d-flex">
                                    <div class="card text-center w-100 equal-height">
                                        <div class="card-header">
                                            <h6><strong>Crédito Principal Restante</strong></h6>
                                        </div>
                                        <div class="card-body">
                                            <p v-if="aff.credit.availableMainCredit">
                                                <span class="badge"
                                                    :class="aff.credit.mainCredit.isDeleted ? 'bg-danger' : 'bg-success'"
                                                    style="font-size: 1rem;">
                                                    ${{ aff.credit.availableMainCredit }}
                                                </span>
                                            </p>
                                            <p v-else>
                                                <span class="badge bg-secondary text-black text-center p-2"
                                                    style="font-size: 0.7rem; word-break: break-word; white-space: normal;">
                                                    Crédito consumido
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Align button to the bottom -->
                            <div class="row justify-content-center">
                                <button class="btn btn-outline-success btn-md mt-3 me-2" @click="affiliateActivity(aff)"
                                    style="width: auto;">
                                    Ver Actividad
                                </button>
                            </div>
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
                    <h5>No hay Comercios con crédito aprobado.</h5>
                </div>
            </div>
        </div>

        <!-- Modal to set the company's Credit capital -->
        <div class="modal fade" id="set-credit" tabindex="-1" aria-labelledby="setCreditModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="setCreditModalLabel">Editar Crédito {{ this.appCreditType === 'main'
                            || this.appCreditType === 'affiliateMain'
                            ? 'Principal' : 'Plus' }} {{ this.appCreditType === 'affiliateMain' ? 'de Comercio' : '' }}
                        </h5>
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
                        <button type="button" class="btn btn-theme"
                            @click="setCredit(this.appCreditType)">Guardar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to set client's credit -->
        <div class="modal fade" id="set-credit-modal" tabindex="-1" aria-labelledby="setCreditModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header text-center">
                        <h5 class="modal-title" id="setCreditModalLabel">Asignar crédito a {{ creditType === 'client' ?
                            'Cliente' : 'Comercio' }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                            @click="resetModal()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <!-- Searching input -->
                            <SearchInput v-model="searchEntity" :results="searchEntityResults"
                                :placeholder="creditType === 'client' ? 'Busque un cliente por su cédula...' : 'Busque un comercio por su nombre...'"
                                @input="searchEntities" @select="selectEntity" class="form-control mb-3" />
                            <!-- Display selected entity information -->
                            <div v-if="selectedEntity" class="mb-3 p-3 border rounded">
                                <h5>Información del {{ creditType === 'client' ? 'cliente' : 'comercio' }} seleccionado
                                </h5>
                                <p><strong>Nombre:</strong> {{ selectedEntity.name }}</p>
                                <p><strong>{{ creditType === 'client' ? 'Identificación' : 'RIF' }}</strong> {{
                                    selectedEntity.identification }}</p>

                                <div v-if="selectedEntity.credit">
                                    <hr>

                                    <h6>
                                        <strong>Crédito actual Aprobado</strong>
                                    </h6>
                                    <p>
                                        <strong>Línea Principal: </strong> {{ selectedEntity.credit.mainCredit ?
                                            `$${selectedEntity.credit.mainCredit}` : 'No posee línea de Rose Credit' }}
                                    </p>
                                    <p>
                                        <strong>Disponible: </strong> {{ selectedEntity.credit.availableMainCredit ?
                                            `$${selectedEntity.credit.availableMainCredit}` :
                                            `No posee línea de Rose Credit` }}
                                    </p>
                                    <p>
                                        <strong>Línea Plus: </strong> {{ selectedEntity.credit.plusCredit ?
                                            `$${selectedEntity.credit.plusCredit}` : 'No posee línea de Rose Credit Plus' }}
                                    </p>
                                    <p>
                                        <strong>Disponible: </strong> {{ selectedEntity.credit.availablePlusCredit ?
                                            `$${selectedEntity.credit.availablePlusCredit}` : '$0' }}
                                    </p>
                                </div>
                                <div v-else>
                                    <hr>

                                    <p class="text-center">El cliente no posee Líneas de Crédito.</p>
                                </div>
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
                        <button type="button" class="btn btn-theme" @click="assignCredit()">Guardar</button>
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
                        <h3 class="text-center">Compras realizadas</h3>
                        <div class="row g-3">
                            <div class="col-12">
                                <div
                                    v-if="clientDetails.credit.mainPurchases && Object.keys(clientDetails.credit.mainPurchases).length">
                                    <div v-for="(purchase, purchaseId) in clientDetails.credit.mainPurchases"
                                        :key="purchaseId">
                                        <div class="card m-3 shadow-sm">
                                            <div class="card-body">
                                                <h5 class="card-title mb-3"><strong>Nombre del producto: </strong>{{
                                                    purchase.productName }}</h5>

                                                <div class="row mb-2">
                                                    <div class="col-md-6">
                                                        <p class="mb-1"><strong>Fecha de compra:</strong> {{
                                                            formatDate(purchase.purchaseDate) }}</p>
                                                        <p class="mb-1"><strong>Comercio:</strong> {{
                                                            getAffiliateName(purchase.affiliate_id) }}</p>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <p class="mb-1"><strong>Precio del producto:</strong> ${{
                                                            purchase.productPrice }}</p>
                                                        <p class="mb-1"><strong>Precio de compra:</strong> ${{
                                                            purchase.purchaseAmount }}</p>
                                                    </div>
                                                </div>

                                                <div class="row mb-3">
                                                    <div class="col-md-6">
                                                        <p class="mb-1"><strong>Plazo:</strong> {{ purchase.terms }}
                                                            cuotas</p>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <p class="mb-1"><strong>Frecuencia de pago:</strong> {{
                                                            purchase.frequency === 2 ? 'Quincenal' : 'Mensual' }}</p>
                                                    </div>
                                                </div>

                                                <h6><strong>Plan de Pago:</strong></h6>
                                                <ul class="list-group list-group-flush">
                                                    <li v-for="(cuota, index) in purchase.cuotas" :key="index"
                                                        class="list-group-item d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <strong>Cuota {{ index + 1 }}:</strong> ${{
                                                                cuota.amount.toFixed(2) }}
                                                        </div>
                                                        <div>
                                                            <strong>Fecha:</strong> {{ formatDate(cuota.date) }}
                                                        </div>
                                                        <div>
                                                            <strong>Pagado:</strong> {{ cuota.paid ? 'Sí' : 'No' }}
                                                        </div>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else>
                                    <p>El cliente aun no tiene compras.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to see Client's purchases in the selected affiliate -->
        <div v-if="selectedAffiliateClients" class="modal fade" id="affiliatesActivityModal" tabindex="-1"
            aria-labelledby="affiliatesActivityModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header text-center">
                        <h5 class="modal-title" id="affiliatesActivityModalLabel">Actividad</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div v-if="selectedAffiliateClients.length">
                            <div class="accordion" id="clientsAccordion">
                                <div v-for="(client, clientIndex) in selectedAffiliateClients" :key="client.clientId"
                                    class="accordion-item">
                                    <h2 class="accordion-header" :id="`heading-${clientIndex}`">
                                        <button class="accordion-button collapsed" type="button"
                                            data-bs-toggle="collapse" :data-bs-target="`#collapse-${clientIndex}`"
                                            aria-expanded="false" :aria-controls="`collapse-${clientIndex}`">
                                            {{ client.clientName }}
                                        </button>
                                    </h2>
                                    <div :id="`collapse-${clientIndex}`" class="accordion-collapse collapse"
                                        :aria-labelledby="`heading-${clientIndex}`" data-bs-parent="#clientsAccordion">
                                        <div class="accordion-body">
                                            <div v-if="client.purchases.length">
                                                <div class="accordion" :id="`purchasesAccordion-${client.clientId}`">
                                                    <div v-for="(purchase, purchaseIndex) in client.purchases"
                                                        :key="purchase.purchaseId" class="accordion-item">
                                                        <h2 class="accordion-header"
                                                            :id="`purchase-heading-${clientIndex}-${purchaseIndex}`">
                                                            <button class="accordion-button collapsed" type="button"
                                                                data-bs-toggle="collapse"
                                                                :data-bs-target="`#purchase-collapse-${clientIndex}-${purchaseIndex}`"
                                                                aria-expanded="false"
                                                                :aria-controls="`purchase-collapse-${clientIndex}-${purchaseIndex}`">
                                                                {{ purchase.productName }} / {{
                                                                    formatDate(purchase.purchaseDate) }}
                                                            </button>
                                                        </h2>
                                                        <div :id="`purchase-collapse-${clientIndex}-${purchaseIndex}`"
                                                            class="accordion-collapse collapse"
                                                            :aria-labelledby="`purchase-heading-${clientIndex}-${purchaseIndex}`"
                                                            :data-bs-parent="`#purchasesAccordion-${client.clientId}`">
                                                            <div class="accordion-body">
                                                                <p><strong>Nombre del producto:</strong> {{
                                                                    purchase.productName }}</p>
                                                                <p><strong>Fecha de compra:</strong> {{
                                                                    formatDate(purchase.purchaseDate) }}</p>
                                                                <p><strong>Precio del producto:</strong> ${{
                                                                    purchase.productPrice }}</p>
                                                                <hr>
                                                                <p><strong>Precio de la compra:</strong> ${{
                                                                    purchase.purchaseAmount }}</p>
                                                                <p><strong>Plazo:</strong> {{ purchase.terms }} cuotas
                                                                </p>
                                                                <p><strong>Frecuencia de pago:</strong> {{
                                                                    purchase.frequency === 2 ? 'Quincenal' : 'Mensual'
                                                                    }}</p>
                                                                <h6><strong>Plan de Pago:</strong></h6>
                                                                <ul class="list-group list-group-flush">
                                                                    <li v-for="(cuota, index) in purchase.cuotas"
                                                                        :key="index"
                                                                        class="list-group-item d-flex justify-content-between align-items-center">
                                                                        <div>
                                                                            <strong>Cuota {{ index + 1 }}:</strong> ${{
                                                                                cuota.amount.toFixed(2) }}
                                                                        </div>
                                                                        <div>
                                                                            <strong>Fecha:</strong> {{
                                                                                formatDate(cuota.date) }}
                                                                        </div>
                                                                        <div>
                                                                            <strong>Pagado:</strong> {{ cuota.paid ?
                                                                                'Sí' : 'No' }}
                                                                        </div>
                                                                    </li>
                                                                </ul>
                                                                <button v-if="!purchase.paid"
                                                                    class="btn btn-outline-success mt-3"
                                                                    @click="markPaid(purchase.purchaseId, purchase)">
                                                                    Marcar Pagado
                                                                </button>
                                                                <button v-else class="btn btn-outline-success mt-3"
                                                                    disabled>
                                                                    Pagado
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div v-else>
                                                <p>Este cliente no ha hecho compras en este comercio.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <p>Clientes no han hecho compras a cuotas en este comercio.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <div v-if="this.role === 'cliente'" class="container">
        <div v-if="!currentClient">
            <h3 class="text-center">Loading...</h3>
        </div>
        <div v-else>
            <div v-if="!currentClient.mainCredit && !currentClient.plusCredit">
                <h3 class="text-center">Usted no posee una linea de credito aprovada</h3>
            </div>
            <div v-else>
                <!-- Tabs to toggle between main credit line and plus line -->
                <div class="mb-4">
                    <ul class="nav nav-tabs nav-fill">
                        <li class="nav-item">
                            <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#main">
                                Principal
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#plus">
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
                                        <h5 class="card-title mb-3">Crédito Aprobado</h5>
                                        <h3><strong>${{ currentClient.mainCredit || 0 }}</strong></h3>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 mt-3">
                                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                                    <div class="card-body text-center py-5">
                                        <h5 class="card-title mb-3">Crédito Disponible</h5>
                                        <h3><strong>${{ currentClient.availableMainCredit || 0 }}</strong></h3>
                                        <button v-if="currentClient.mainPurchases" class="btn btn-info mt-3"
                                            @click="openPurchases(currentClient.mainPurchases)">
                                            <span v-if="this.showPurchases">
                                                Ocultar
                                            </span>
                                            <span v-else>
                                                Mis compras
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="showPurchases">
                            <hr>
                            <h2 class="text-center">Mis Compras a Cuotas</h2>

                            <!-- tabs -->
                            <div class="mb-4 mt-4">
                                <ul class="nav nav-tabs nav-fill">
                                    <li class="nav-item">
                                        <a class="nav-link active" href="#" data-bs-toggle="tab"
                                            data-bs-target="#toPay">
                                            Por pagar
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#paid">
                                            Finalizadas
                                        </a>
                                    </li>
                                    <!-- <li class="nav-item">
                                        <a class="nav-link" href="#"
                                            data-bs-toggle="tab" data-bs-target="#cancelledPurchases">
                                            Canceladas
                                        </a>
                                    </li> -->
                                </ul>
                            </div>

                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="toPay">
                                    <div class="row mt-4">
                                        <div class="col-12 col-lg-6">
                                            <div v-for="purchase in purchaseWithAffiliateData"
                                                :key="purchase.purchaseId" class="card m-3 shadow-sm">
                                                <div class="card-body">
                                                    <h5 class="card-title text-end mb-3">{{
                                                        formatDate(purchase.purchaseDate) }}</h5>

                                                    <div class="img-container justify-content-center mb-3 d-flex align-items-center"
                                                        v-if="purchase.affiliateImage">
                                                        <img :src="purchase.affiliateImage" alt="logo"
                                                            class="img-fluid img-thumbnail rounded-circle"
                                                            style="width: 120px; height: 120px; object-fit: cover;" />

                                                    </div>
                                                    <h4 class="text-center">{{ purchase.affiliateName }}</h4>

                                                    <!-- Details -->
                                                    <div class="accordion accordion-flush" id="accordionDetails">
                                                        <div class="accordion-item">
                                                            <h2 class="accordion-header">
                                                                <button
                                                                    class="accordion-button collapsed text-center custom-accordion-button"
                                                                    type="button" data-bs-toggle="collapse"
                                                                    data-bs-target="#flush-collapseOne"
                                                                    aria-expanded="false"
                                                                    aria-controls="flush-collapseOne">
                                                                    <strong>Detalles</strong>
                                                                </button>
                                                            </h2>
                                                            <div id="flush-collapseOne"
                                                                class="accordion-collapse collapse"
                                                                data-bs-parent="#accordionDetails">
                                                                <div class="accordion-body">
                                                                    <div class="row mt-4">
                                                                        <div class="col-6">
                                                                            <div class="card text-center mb-2">
                                                                                <div class="card-header">
                                                                                    Nombre del
                                                                                    producto
                                                                                </div>
                                                                                <div class="card-body p-2">
                                                                                    {{ purchase.productName }}
                                                                                </div>
                                                                            </div>
                                                                            <div class="card text-center mb-2">
                                                                                <div class="card-header">
                                                                                    Plazo
                                                                                </div>
                                                                                <div class="card-body p-2">
                                                                                    {{ purchase.terms }} cuotas
                                                                                </div>
                                                                            </div>
                                                                            <div class="card  text-center mb-2">
                                                                                <div class="card-header">
                                                                                    Frecuencia
                                                                                </div>
                                                                                <div class="card-body p-2">
                                                                                    {{ purchase.frequency === 2 ?
                                                                                        'Quincenal' :
                                                                                        'Mensual' }}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div class="col-6">
                                                                            <div class="card text-center mb-2">
                                                                                <div class="card-header">
                                                                                    Precio del Producto
                                                                                </div>
                                                                                <div class="card-body p-2">
                                                                                    ${{ purchase.productPrice.toFixed(2)
                                                                                    }}
                                                                                </div>
                                                                            </div>
                                                                            <div class="card text-center mb-2">
                                                                                <div class="card-header">
                                                                                    Inicial
                                                                                </div>
                                                                                <div class="card-body p-2">
                                                                                    ${{
                                                                                        purchase.purchaseAmount.toFixed(2)
                                                                                    }}
                                                                                </div>
                                                                            </div>
                                                                            <div class="card text-center mb-2">
                                                                                <div class="card-header">
                                                                                    Restante
                                                                                </div>
                                                                                <div class="card-body p-2">
                                                                                    ${{
                                                                                        purchase.remainingAmount.toFixed(2)
                                                                                    }}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div class="row justify-content-center">
                                                                        <div class="col-6">
                                                                            <div class="card text-center mb-2">
                                                                                <div class="card-header">
                                                                                    Préstamo
                                                                                </div>
                                                                                <div class="card-body p-2">
                                                                                    ${{ purchase.loanAmount.toFixed(2)
                                                                                    }}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Cuotas -->
                                                    <h6 class="text-center mt-4 mb-4"><strong>Plan de Pago:</strong>
                                                    </h6>
                                                    <div class="row">
                                                        <div v-for="(cuota, index) in purchase.cuotas" :key="index"
                                                            class="col-lg-6 col-md-12 col-sm-12 mb-4">
                                                            <div class="card shadow-sm">
                                                                <div class="card-header">
                                                                    <h5 class="card-title text-center">Cuota {{
                                                                        index +
                                                                        1 }}</h5>
                                                                </div>
                                                                <div class="card-body">
                                                                    <div class="row">
                                                                        <p class="card-text">
                                                                            <strong>Monto:</strong> ${{
                                                                                cuota.amount.toFixed(2) }}
                                                                        </p>
                                                                        <p class="card-text">
                                                                            <strong>Fecha límite:</strong> {{
                                                                                formatDate(cuota.date) }}
                                                                        </p>
                                                                        <p class="card-text">
                                                                            <strong>Pagado:</strong>
                                                                            <span
                                                                                :class="{ 'text-success': cuota.paid, 'text-danger': !cuota.paid }">
                                                                                {{ cuota.paid ? ` Sí` : ` No` }}
                                                                            </span>
                                                                            <span class="text-muted text-small"
                                                                                v-if="cuota.paymentUpload && !cuota.paid">
                                                                                (En espera de confirmación)
                                                                            </span>
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <button
                                                                            v-if="!cuota.paid && !cuota.paymentUpload"
                                                                            class="btn btn-theme btn-block mt-3"
                                                                            @click="payCuota(purchase.purchaseId, index)">
                                                                            Pagar
                                                                        </button>
                                                                        <button
                                                                            v-else-if="!cuota.paid && cuota.paymentUpload"
                                                                            class="btn btn-success btn-block mt-3"
                                                                            disabled>
                                                                            Pagado, en espera de aprobación
                                                                        </button>
                                                                        <button v-if="cuota.paid"
                                                                            class="btn btn-secondary btn-block mt-3"
                                                                            disabled>
                                                                            Pagado
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
                                </div>

                                <div class="tab-pane fade" id="paid">

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
                                        <h3><strong>${{ currentClient.plusCredit || 0 }}</strong></h3>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12 col-md-6 col-lg-4 mt-3">
                                <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                                    <div class="card-body text-center py-5">
                                        <h5 class="card-title mb-3">Crédito Restante</h5>
                                        <h3><strong>${{ currentClient.availablePlusCredit || 0 }}</strong></h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal for Cuota Payment upload -->
                <div class="modal fade" id="payCuotaModal" tabindex="-1" aria-labelledby="payCuotaModalLabel"
                    aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="payCuotaModalLabel">Subir Captura de Pago</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"
                                    aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <!-- Metodos de pago -->
                                <div class="card" style="padding: 15px; margin: 10px;">
                                    <h4 class="text-center">Métodos de Pago</h4>
                                    <h6><u>Pago Móvil</u></h6>
                                    <div class="card-text">
                                        <strong>Banco: </strong>Banco Provincial
                                    </div>
                                    <div class="card-text">
                                        <strong>Teléfono: </strong>04246003370
                                        <button class="btn btn-sm btn-secondary ms-2"
                                            @click="copyToClipboard('04246003370')">
                                            <i class="fa fa-copy"></i>
                                        </button>
                                    </div>
                                    <div class="card-text">
                                        <strong>RIF: </strong>J506221772
                                        <button class="btn btn-sm btn-secondary ms-2"
                                            @click="copyToClipboard('J506221772')">
                                            <i class="fa fa-copy"></i>
                                        </button>
                                    </div>
                                </div>

                                <form @submit.prevent="notifyPayment">
                                    <div class="row g-3">
                                        <div class="col-6">
                                            <label for="paymentDate" class="form-label">Fecha de Pago</label>
                                            <input type="date" class="form-control" v-model="paymentDate"
                                                style="width: auto;">
                                        </div>
                                        <div class="col-6">
                                            <label for="amountPaid" class="form-label">Monto Pagado</label>
                                            <div class="input-group">
                                                <span class="input-group-text text-wrap" id="assign-addon">Bs.</span>
                                                <input id="amountPaid" type="number" step=".01" class="form-control"
                                                    v-model="amountPaid" aria-label="Monto"
                                                    aria-describedby="assign-addon">
                                            </div>
                                        </div>
                                        <div class="col-12 mb-3">
                                            <label for="payment" class="form-label">Captura de Pago</label>
                                            <input type="file" class="form-control" id="payment"
                                                @change="handleFileUpload($event)" required>
                                            <img v-if="paymentPreview" :src="paymentPreview" alt="payment preview"
                                                class="img-fluid mt-2" />
                                        </div>
                                    </div>

                                    <!-- Error Message -->
                                    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

                                    <button type="button" class="btn btn-secondary me-2"
                                        data-bs-dismiss="modal">Cerrar</button>
                                    <!-- Submit Button is disabled during submission -->
                                    <button type="submit" class="btn btn-theme" :disabled="loading">
                                        <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                            aria-hidden="true"></span>
                                        <span>Subir</span>
                                    </button>
                                </form>
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
                                <button type="button" class="btn-close" data-bs-dismiss="modal"
                                    aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <div class="input-group">
                                        <span class="input-group-text text-wrap" id="value-addon">$</span>
                                        <input id="requestedCredit" type="number" class="form-control"
                                            v-model.number="requestedAmount" aria-label="Monto"
                                            aria-describedby="value-addon" min="0">
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
        </div>
    </div>

    <div v-if="this.role === 'afiliado'" class="container">
        <div v-if="!currentAffiliate">
            <h3 class="text-center">Loading...</h3>
        </div>
        <div v-else>
            <div class="row g-4 justify-content-center mb-4">
                <div class="col-6 col-md-6 col-lg-4">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-5">
                            <h5 class="card-title mb-3">Crédito Aprobado</h5>
                            <h3><strong>${{ currentAffiliate.mainCredit }}</strong></h3>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-6 col-lg-4">
                    <div class="card custom-card h-100 shadow-lg border-0 rounded-lg">
                        <div class="card-body text-center py-5">
                            <h5 class="card-title mb-3">Crédito Disponible</h5>
                            <h3><strong>${{ currentAffiliate.availableMainCredit }}</strong></h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs to toggle between the form to apply a purchase and pending payments -->
        <div class="mt-3 mb-4">
            <ul class="nav nav-tabs nav-fill">
                <li class="nav-item">
                    <a @click.prevent="setActiveTab('applyPurchase')" class="nav-link active" href="#"
                        data-bs-toggle="tab" data-bs-target="#applyCredit">
                        Aplicar
                    </a>
                </li>
                <li class="nav-item">
                    <a @click.prevent="setActiveTab('pendingPayments')" class="nav-link" href="#" data-bs-toggle="tab"
                        data-bs-target="#pendingPayments">
                        Prestamos pendientes
                    </a>
                </li>
                <li class="nav-item">
                    <a @click.prevent="setActiveTab('paidPurchases')" class="nav-link" href="#" data-bs-toggle="tab"
                        data-bs-target="#paidPurchases">
                        Prestamos pagados
                    </a>
                </li>
            </ul>
        </div>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="applyCredit">
                <h4 class="text-center mb-4">Registrar Compra a Crédito</h4>
                <div class="row justify-content-center">
                    <!-- Adjust column width for different screen sizes -->
                    <div class="col-lg-6 col-12">
                        <div class="mb-3 mt-3">
                            <!-- Searching input -->
                            <SearchInput v-model="searchClient" :results="searchClientResults"
                                placeholder="Busque un cliente por su cédula..." @input="searchClients"
                                @select="selectClient" class="form-control mb-3" />
                            <!-- Display selected client information -->
                            <div v-if="selectedClient" class="mb-3 p-3 border rounded">
                                <h5>Información del cliente seleccionado</h5>
                                <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                                    selectedClient.lastName
                                    }}</p>
                                <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                                <hr>
                                <p><strong>Crédito actual</strong></p>
                                <p><strong>Disponible: </strong> ${{ selectedClient.credit.availableMainCredit ?
                                    selectedClient.credit.availableMainCredit : 0 }}</p>
                                <!-- <p><strong>Linea Plus: </strong> ${{ selectedClient.credit ?
                                    selectedClient.credit.availablePlusCredit : 0 }}</p> -->
                            </div>

                            <div v-if="verificationRequested" class="row justify-content-center">
                                <div class="col-6 mb-3">
                                    <label for="verificationCode">Código de verificación</label>
                                    <input id="verificationCode" type="number" class="form-control mt-2"
                                        v-model="verificationCode">
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-6 mb-3">
                                    <label for="productName">Nombre del Producto</label>
                                    <input id="productName" type="text" class="form-control mt-2" v-model="productName">
                                </div>
                                <div class="col-6 mb-3">
                                    <label for="productPrice">Precio del Producto</label>
                                    <div class="input-group mt-2">
                                        <span class="input-group-text text-wrap" id="assign-addon">$</span>
                                        <input id="productPrice" type="number" class="form-control"
                                            v-model="productPrice" aria-label="Monto" aria-describedby="assign-addon">
                                    </div>
                                </div>
                                <div class="col-6 mb-3">
                                    <label for="purchaseDate">Fecha de compra</label>
                                    <input type="date" name="purchaseDate" class="form-control mt-2"
                                        v-model="purchaseDate">
                                </div>
                                <div class="col-6 mb-3 d-flex align-items-end">
                                    <button class="btn btn-theme" @click="calcs(selectedClient)">Calcular
                                        cuotas</button>
                                </div>

                                <hr>

                                <div v-if="calc">
                                    <div class="row">
                                        <div class="col-4 mb-3">
                                            <label for="purchaseAmount">Inicial</label>
                                            <div class="input-group mt-2">
                                                <span class="input-group-text text-wrap" id="assign-addon">$</span>
                                                <input id="purchaseAmount" type="number" class="form-control"
                                                    v-model="purchaseAmount" aria-label="Monto"
                                                    aria-describedby="assign-addon" disabled>
                                            </div>
                                        </div>
                                        <div class="col-4 mb-3">
                                            <label for="term">Plazo</label>
                                            <div class="input-group mt-2">
                                                <span class="input-group-text text-wrap" id="term-addon">Cuotas</span>
                                                <input id="term" type="number" class="form-control" v-model="terms"
                                                    aria-label="terms" aria-describedby="term-addon"
                                                    @change="calcs(selectedClient)">
                                            </div>
                                        </div>
                                        <div class="col-4 mb-3">
                                            <label for="frequency">Frecuencia</label>
                                            <select v-model="frequency" @change="calcs(selectedClient)"
                                                class="form-control mt-2">
                                                <option class="text-black" value="" disabled selected>Selecciona una
                                                    opcion
                                                </option>
                                                <option value="2">Quincenal</option>
                                                <option value="1">Mensual</option>
                                            </select>
                                        </div>

                                        <hr>

                                        <h4 class="text-center mt-3 mb-3">Plan de Pagos</h4>

                                        <div class="row justify-content-center">
                                            <div class="col-4 mb-3">
                                                <label for="addOn">Restante</label>
                                                <div class="input-group mt-2">
                                                    <span class="input-group-text text-wrap" id="assign-addon">$</span>
                                                    <input id="addOn" class="form-control" v-model="remainingAmount"
                                                        aria-label="Monto" aria-describedby="assign-addon" disabled>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="row justify-content-center">
                                            <div v-if="showSubscription" class="col-4 mb-3 text-center">
                                                <label for="clientSubscription">Suscripción</label>
                                                <h6 class="mt-2 text-success">{{ selectedClient.subscription.name ?
                                                    selectedClient.subscription.name.toUpperCase() : null }}
                                                </h6>
                                            </div>
                                            <div class="col-4 mb-3">
                                                <label for="addOn">Aumento Fijo</label>
                                                <div class="input-group mt-2">
                                                    <span class="input-group-text text-wrap" id="assign-addon">$</span>
                                                    <input id="addOn" class="form-control"
                                                        :value="`${selectedClient.subscription.order == 2 ? 2 : 1}`"
                                                        aria-label="Monto" aria-describedby="assign-addon" disabled>
                                                </div>
                                            </div>
                                            <div class="col-4 mb-3">
                                                <label for="loanAmount">Monto a Prestar</label>
                                                <div class="input-group mt-2">
                                                    <span class="input-group-text text-wrap" id="assign-addon">$</span>
                                                    <input id="loanAmount" type="number" class="form-control"
                                                        v-model="loanAmount" aria-label="Monto"
                                                        aria-describedby="assign-addon" disabled>
                                                </div>
                                            </div>
                                        </div>

                                        <div v-for="(quote, index) in terms" :key="index" class="col-6 mb-3">
                                            <label :for="'quotesAmount-' + index">Cuota {{ index + 1 }}</label>
                                            <div class="input-group mt-2">
                                                <span class="input-group-text text-wrap" id="quote-addon">$</span>
                                                <input :id="'quotesAmount-' + index" type="number" class="form-control"
                                                    v-model="quotesAmount[index]" aria-label="quotesAmount"
                                                    aria-describedby="quote-addon" disabled>
                                            </div>
                                        </div>

                                        <!-- Render payment dates based on frequency -->
                                        <div v-for="(date, index) in cuotaDates" :key="index" class="col-6 mb-3">
                                            <label :for="'cuotaDate-' + index">Fecha de Cuota {{ index + 1
                                                }}</label>
                                            <input :id="'cuotaDate-' + index" type="date" class="form-control mt-2"
                                                v-model="cuotaDates[index]" disabled>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button :disabled="waiting" class="btn btn-theme me-2" @click="askForCode(selectedClient)">
                            <span v-if="waiting" class="spinner-border spinner-border-sm" role="status"
                                aria-hidden="true"></span>
                            <span>Solicitar Código</span>
                        </button>
                        <button v-if="verificationRequested" :disabled="loading" class="btn btn-theme me-2"
                            @click="savePurchase()">
                            <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                aria-hidden="true"></span>
                            <span>Aceptar</span>
                        </button>
                        <button class="btn btn-danger me-2" @click="cancelCals()">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>

            <div v-for="tab in ['pendingPayments', 'paidPurchases']" :key="tab" class="tab-pane fade"
                :class="{ show: activeTab === tab, active: activeTab === tab }" :id="tab">

                <div v-if="(tab === 'pendingPayments' ? pendingPayments : paidPurchases).length === 0"
                    class="text-center mt-4">
                    <p class="text-muted">
                        {{ tab === 'pendingPayments' ?
                            'No hay pagos pendientes de parte de RoseCoupon.' : 'No hay pagos de parte de RoseCoupon.'
                        }}
                    </p>
                </div>

                <div v-else class="row g-4 mt-4">
                    <div class="col-12 col-md-6"
                        v-for="purchase in tab === 'pendingPayments' ? pendingPayments : paidPurchases"
                        :key="purchase.purchaseId">
                        <div class="card shadow-sm">
                            <div class="card-header text-center"
                                style="background-color: #1a1a1a; border-color: #b800c2;">
                                <h5 class="text-light">{{ getClientName(purchase.client_id) }}</h5>
                            </div>
                            <div class="card-body">
                                <div class="purchase-details mb-3">
                                    <p><strong class="me-2">Estado:</strong>
                                        <span :class="purchase.paid ? 'text-success' : 'text-danger'">
                                            {{ purchase.paid ? 'Pagado' : 'Pendiente' }}
                                        </span>
                                    </p>
                                    <p><strong>Fecha de compra:</strong> {{ formatDate(purchase.purchaseDate) }}</p>
                                    <p><strong>Nombre:</strong> {{ purchase.productName }}</p>
                                    <p><strong>Precio del producto:</strong> ${{ purchase.productPrice.toFixed(2) }}
                                    </p>
                                    <p><strong>Inicial:</strong> ${{ purchase.purchaseAmount.toFixed(2) }}</p>
                                    <p><strong>Restante:</strong> ${{ purchase.remainingAmount.toFixed(2) }}</p>
                                    <p><strong>Préstamo:</strong> ${{ purchase.loanAmount.toFixed(2) }}</p>
                                </div>

                                <div class="row mb-2">
                                    <div class="col-6 text-center">
                                        <p><strong>Plazo:</strong> {{ purchase.terms }} cuotas</p>
                                    </div>
                                    <div class="col-6 text-center">
                                        <p><strong>Frecuencia:</strong> {{ purchase.frequency === 2 ? 'Quincenal' :
                                            'Mensual' }}</p>
                                    </div>
                                </div>

                                <h6><strong>Plan de Pago:</strong></h6>
                                <ul class="list-group list-group-flush">
                                    <li v-for="(cuota, index) in purchase.cuotas" :key="index"
                                        class="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Cuota {{ index + 1 }}:</strong> ${{ cuota.amount.toFixed(2) }}
                                        </div>
                                        <div>
                                            <strong>Fecha:</strong> {{ formatDate(cuota.date) }}
                                        </div>
                                        <div>
                                            <strong>Pagado:</strong> {{ !cuota.paid ? 'No' : 'Si' }}
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
.custom-accordion-button {
    justify-content: center;
    text-align: center;
}

.equal-height .card-body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 150px;
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

.card {
    border-radius: 8px;
    border: 1px solid #ddd;
    transition: transform 0.2s ease;
}

.card:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
    padding: 0.75rem 1rem;
    background: #1a1a1a;
    border-bottom: 2px solid #b800c2;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}

.card-body {
    padding: 1rem 1.25rem;
}

.purchase-details p {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.list-group-item {
    font-size: 0.85rem;
}

.text-danger {
    color: #dc3545;
}

.text-success {
    color: #28a745;
}
</style>