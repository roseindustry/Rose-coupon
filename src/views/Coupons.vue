<script>
import { db, storage } from '../firebase/init';
import { ref as dbRef, push, update, get, set, remove, query, orderByChild, equalTo, child } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import SearchInput from '@/components/app/SearchInput.vue';
import AppliedCoupons from '@/components/coupons/admin/AppliedCoupons.vue';
import CouponCard from '@/components/coupons/client/CouponCard.vue';
import AssignCoupons from '@/components/coupons/admin/AssignCoupons.vue';
import ConfirmDeleteCoupons from '@/components/coupons/admin/modals/ConfirmDeleteCoupons.vue';
import AppliedCouponsHistory from '@/components/coupons/affiliate/AppliedCouponsHistory.vue';
import PendingCoupons from '@/components/coupons/affiliate/PendingCoupons.vue';
import { toast as showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'
import datepicker from 'vue3-datepicker';
import 'vue-datepicker-next/index.css';
import { Modal } from 'bootstrap';
import { useUserStore } from "@/stores/user-role";

export default {
    components: {
        SearchInput,
        datepicker,
        AppliedCoupons,
        CouponCard,
        AssignCoupons,
        ConfirmDeleteCoupons,
        AppliedCouponsHistory,
        PendingCoupons
    },
    data() {
        return {
            // Logged User data
            userId: '',
            role: '',

            // Search data
            searchClient: '',
            searchCoupon: '',

            // Filter data
            selectedClient: null,
            selectedCoupon: null,
            selectedCouponOption: '',
            selectedFilterOption: '',


            // Fetching data
            clients: [],
            selectedClients: [],
            selectedCoupons: [],
            affiliates: [],
            categories: [],
            coupons: [],
            allCoupons: [],
            appliedCoupons: [],
            pendingPaymentCoupons: [],
            searchClientResults: [],

            // Assigning data
            couponCode: '',
            couponName: '',
            couponType: '',
            redeemCount: 0,
            onlyInStore: false,
            couponAmount: 0,
            couponExp: '',
            qrFile: null,
            qrPreview: null,
            assignTheCoupon: false,
            editingCoupon: null,
            modalImageUrl: '',

            appliedCode: '',
            clientId: '',
            itemName: '',
            itemPrice: 0,
            discount: 0,
            discountType: '',
            discountedPrice: 0,
            assignedCount: null,

            selectedCouponDetails: [],
            allAppliedCoupons: [],
            assignedCoupons: [],
            filteredAppliedCoupons: [],

            filterByDate: false,
            filterByAffiliate: false,
            startDate: null,
            endDate: null,

            isSubmitting: false,
            loading: false,
            loadingCoupons: false,
            currentPage: 1,
            itemsPerPage: 6,

            clientPreferences: {},
            plans: [],

            accordionOpen: {},
            currentFilter: '',
            errorMessage: ''
        }
    },
    watch: {
        selectedCouponOption(newOption) {
            this.clearData(newOption);
        },
    },
    computed: {
        // Admin
        filteredCoupons() {
            let filtered = [...this.coupons];

            // Apply search filter
            if (this.searchCoupon.trim()) {
                const searchQuery = this.searchCoupon.toLowerCase();
                filtered = filtered.filter(coupon =>
                    coupon.name.toLowerCase().includes(searchQuery) ||
                    coupon.couponCode.toLowerCase().includes(searchQuery)
                );
            }

            // Apply expiration/status filter
            switch (this.currentFilter) {
                case 'expiring-soon':
                    // Sort by expiration date (ascending)
                    filtered.sort((a, b) => new Date(a.expiration) - new Date(b.expiration));
                    // Only include active coupons
                    filtered = filtered.filter(coupon => coupon.status);
                    break;

                case 'newest':
                    // Sort by expiration date (descending)
                    filtered.sort((a, b) => new Date(b.expiration) - new Date(a.expiration));
                    break;

                case 'active':
                    filtered = filtered.filter(coupon => coupon.status);
                    break;

                case 'expired':
                    filtered = filtered.filter(coupon => !coupon.status);
                    break;
            }

            // Filter for payable-only coupons if `option3` (Admin) is selected in `selectedCouponOption`
            if (this.selectedCouponOption === 'option3') {
                filtered = filtered.filter(coupon => coupon.onlyInStore === true);
            }

            // Apply filtering based on the `selectedFilterOption` in the Affiliate's view (for non-applied coupons)
            switch (this.selectedFilterOption) {
                case 'option1':
                    // No additional filtering required as this case shows all coupons
                    break;
                case 'option2':
                    // Show paid coupons
                    filtered = filtered.filter(coupon => coupon.applied === true && coupon.isPaid === true);
                    break;
                case 'option3':
                    // Show unpaid coupons
                    filtered = filtered.filter(coupon => coupon.applied === true && coupon.isPaid === false);
                    break;
                default:
                    break;
            }

            return filtered;
        },
        paginatedFilteredCoupons() {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            return this.filteredCoupons.slice(startIndex, endIndex);
        },
        totalPages() {
            return Math.ceil(this.filteredCoupons.length / this.itemsPerPage);
        },
        currentPageName() {
            return this.$route.name;
        },
        isFormValid() {
            return this.couponName.trim() && this.couponCode.trim() && this.couponType && this.couponAmount && this.couponExp;
        },
        formattedCouponCode: {
            get() {
                return this.couponCode.toUpperCase(); // Transform to uppercase
            },
            set(value) {
                this.couponCode = value.toUpperCase(); // Update the original property
            },
        },

        // Affiliate
        formattedCode: {
            get() {
                return this.appliedCode.toUpperCase(); // Transform to uppercase
            },
            set(value) {
                this.appliedCode = value.toUpperCase(); // Update the original property
            },
        },

        filterLabel() {
            switch (this.currentFilter) {
                case 'expiring-soon': return 'Próximos a expirar';
                case 'newest': return 'Más nuevos';
                case 'active': return 'Solo activos';
                case 'expired': return 'Solo expirados';
                default: return 'Filtrar';
            }
        },
        getPaymentFilterLabel() {
            switch (this.selectedFilterOption) {
                case 'option1': return 'Todos';
                case 'option2': return 'Pagados';
                case 'option3': return 'Sin pagar';
                default: return 'Estado de pago';
            }
        }
    },
    methods: {
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },

        //Fetch data
        async fetchClients() {
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(clientRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Initialize client array
                    this.clients = Object.keys(users).map(key => ({
                        id: key,
                        ...users[key]
                    }));

                    // Fetch preferences and subscription details concurrently for all clients
                    const clientPromises = this.clients.map(async (client) => {
                        // Initialize the coupons array for each client
                        this.clientPreferences[client.id] = {};

                        // Fetch preferences for the client
                        const preferences = await this.fetchClientPreferences(client.id);
                        if (preferences) {
                            this.clientPreferences[client.id] = preferences;
                        }

                        // Fetch the client's subscription details, if it exists
                        if (client.subscription && client.subscription.subscription_id) {
                            const subscriptionId = client.subscription.subscription_id;
                            const subscriptionDataRef = dbRef(db, `Suscriptions/${subscriptionId}`);
                            const userSuscriptionSnapshot = await get(subscriptionDataRef);

                            if (userSuscriptionSnapshot.exists()) {
                                const userSubscription = userSuscriptionSnapshot.val();
                                // Merge existing subscription with the new data
                                client.subscription = { ...client.subscription, ...userSubscription };
                                client.subscriptionId = subscriptionId;
                            } else {
                                console.error('Subscription not found.');
                                client.subscription = 'Sin suscripción';
                                client.subscriptionId = null;
                            }
                        }
                    });

                    // Wait for all client promises to resolve
                    await Promise.all(clientPromises);
                } else {
                    this.clients = [];
                    this.clientPreferences = {};
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.clients = [];
                this.clientPreferences = {};
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
                    }))
                        .sort((a, b) => a.order - b.order);
                } else {
                    this.plans = [];  // No subscriptions found
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
                this.plans = [];
            }
        },
        async fetchAffiliates() {
            const role = 'afiliado';
            const affRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(affRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    // Since Firebase data is an object, map to array for easier use
                    this.affiliates = Object.keys(users).map(key => ({
                        id: key,
                        ...users[key]
                    }));
                } else {
                    this.affiliates = [];  // No clients found
                }
            } catch (error) {
                console.error('Error fetching affiliates:', error);
                this.affiliates = [];
            }
        },
        async fetchCategories() {
            const categoryRef = dbRef(db, 'Affiliate_categories');
            try {
                const categorySnapshot = await get(categoryRef);

                if (categorySnapshot.exists()) {
                    const categories = categorySnapshot.val();

                    this.categories = Object.keys(categories).map(key => ({
                        id: key,
                        ...categories[key]
                    }));
                } else {
                    this.categories = [];
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
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
        async fetchUserCoupons() {
            try {
                const couponsRef = dbRef(db, `Users/${this.userId}/coupons`);
                const couponsSnapshot = await get(couponsRef);

                if (couponsSnapshot.exists()) {
                    const couponsData = couponsSnapshot.val();
                    const couponsList = [];

                    for (const couponId in couponsData) {
                        const couponRef = await get(child(dbRef(db), `Coupons/${couponId}`));
                        if (couponRef.exists()) {
                            couponsList.push({
                                id: couponId,
                            });
                        }
                    }
                    return couponsList;
                } else {
                    // console.log('No coupons found for the user');
                    return [];
                }
            }
            catch (error) {
                console.error('Error fetching coupons:', error);
                return [];
            }

        },
        async fetchUserAppliedCoupons() {
            try {
                this.loadingCoupons = true;

                const couponsRef = dbRef(db, `Users/${this.userId}/appliedCoupons`);
                const couponsSnapshot = await get(couponsRef);

                if (couponsSnapshot.exists()) {
                    const couponsData = couponsSnapshot.val();

                    const appliedCoupons = Object.entries(couponsData).flatMap(([couponId, clientData]) =>
                        Object.entries(clientData).map(([clientId, couponDetails]) => ({
                            id: couponId,
                            name: couponDetails.name || 'cupon borrado',
                            couponCode: couponDetails.couponCode || 'XXXX',
                            type: couponDetails.type || 'cupon borrado',
                            balance: couponDetails.balance || 0,
                            appliedDate: couponDetails.appliedDate || null,
                            clientName: this.getClientFullName(clientId) || 'Cliente',
                            itemPrice: couponDetails.itemPrice || 0,
                            discountedPrice: couponDetails.discountedPrice || 0,
                            image: couponDetails.image || null,
                        }))
                    );

                    this.appliedCoupons = appliedCoupons;
                } else {
                    console.log('No applied coupons found for the user');
                    this.appliedCoupons = [];
                }
            } catch (error) {
                console.error('Error fetching applied coupons:', error);
                this.appliedCoupons = [];
            } finally {
                this.loadingCoupons = false;
            }
        },
        async loadCoupons() {
            try {
                this.loadingCoupons = true;

                const userRole = this.role;
                let userCouponIds = [];

                // Role: cliente
                if (userRole === 'cliente') {
                    userCouponIds = await this.fetchUserCoupons();
                    //console.log(userCouponIds);
                    if (userCouponIds.length === 0) {
                        console.log('No coupons assigned to this user');
                        this.coupons = [];
                        return;
                    }

                    // Fetch each coupon by its ID from the Coupons node concurrently
                    const couponsPromises = userCouponIds.map(async (coupon) => {
                        const couponRef = dbRef(db, `Coupons/${coupon.id}`);
                        const snapshot = await get(couponRef);

                        if (snapshot.exists()) {
                            const couponData = snapshot.val();
                            couponData.id = coupon.id;
                            if (couponData.expiration) {
                                couponData.expiration = new Date(couponData.expiration).toISOString().split('T')[0]; // Format to YYYY-MM-DD
                            }
                            return couponData;
                        } else {
                            console.log(`Coupon with ID ${coupon.id} does not exist.`);
                            return null;
                        }
                    });

                    this.coupons = (await Promise.all(couponsPromises)).filter(coupon => coupon !== null);
                    //console.log(this.coupons)
                }
                // Role: afiliado
                else if (userRole === 'afiliado') {
                    this.loading = true;

                    const couponsRef = dbRef(db, `Coupons`);

                    try {
                        const couponsSnapshot = await get(couponsRef);

                        if (couponsSnapshot.exists()) {
                            const couponsData = couponsSnapshot.val();
                            let allCoupons = [];
                            const pendingPaymentCoupons = [];

                            allCoupons = Object.keys(couponsData).map(couponId => ({
                                id: couponId,
                                ...couponsData[couponId],
                            }));

                            this.allCoupons = allCoupons;

                            for (const appliedCoupon of this.appliedCoupons) {
                                // Find the corresponding coupon in allCoupons
                                const coupon = allCoupons.find(c => c.id === appliedCoupon.id);

                                if (coupon) {
                                    // Check for pending payment
                                    if (coupon.onlyInStore === true && coupon.isPaid === false) {
                                        pendingPaymentCoupons.push({
                                            ...coupon,
                                            appliedDate: appliedCoupon.appliedDate,
                                            clientName: appliedCoupon.clientName,
                                        });
                                    }
                                } else {
                                    // Log or handle the case where the coupon has been deleted
                                    console.warn(`Coupon with ID ${appliedCoupon.id} was deleted from the database.`);
                                }
                            }

                            // Display filtered coupons based on the selected option
                            if (this.selectedCouponOption === 'option2') {
                                // Pending Payment Coupons
                                this.pendingPaymentCoupons = pendingPaymentCoupons;
                                console.log('pending Payment coupons:', this.pendingPaymentCoupons);
                            }
                        } else {
                            console.log('No coupons found.');
                        }
                    } catch (error) {
                        console.error('Error fetching coupons.', error);
                    } finally {
                        this.loading = false;
                    }
                }
                // General coupon fetch for admin users
                else {
                    const couponsRef = dbRef(db, 'Coupons');
                    const snapshot = await get(couponsRef);

                    if (snapshot.exists()) {
                        const couponsData = snapshot.val();
                        const allCoupons = Object.entries(couponsData).map(([couponId, coupon]) => {
                            coupon.id = couponId;
                            if (coupon.expiration) {
                                coupon.expiration = new Date(coupon.expiration).toISOString().split('T')[0]; // Format to YYYY-MM-DD
                            }
                            return coupon;
                        });

                        // Fetch assigned count and update each coupon
                        const couponsWithAssignedCount = await Promise.all(
                            allCoupons.map(async (coupon) => {
                                const assignedCount = await this.queryCoupons(coupon.id); // Fetch the assigned count
                                coupon.assignedCount = assignedCount; // Add the assigned count to the coupon
                                return coupon;
                            })
                        );

                        this.coupons = couponsWithAssignedCount;
                    } else {
                        console.log('No coupons available');
                        this.coupons = [];
                    }
                }
            } catch (error) {
                console.error('Error loading coupons:', error);
                this.coupons = [];
            } finally {
                this.loadingCoupons = false;
            }
        },
        async fetchAllAppliedCoupons() {
            const affiliates = this.affiliates;

            try {
                this.loading = true;
                let allAppliedCoupons = [];

                // Loop through each affiliate and collect their applied coupons
                for (const affiliate of affiliates) {

                    if (affiliate.appliedCoupons && typeof affiliate.appliedCoupons === 'object') {

                        // Process each couponId in appliedCoupons
                        const couponPromises = Object.keys(affiliate.appliedCoupons).map(async (couponId) => {
                            const redemptions = affiliate.appliedCoupons[couponId];

                            // Process each redemption (that is a client id) under the couponId
                            const redemptionPromises = Object.keys(redemptions).map(async (clientId) => {
                                const couponDetails = redemptions[clientId];
                                const clientName = await this.fetchClientName(clientId); // Fetch client's name

                                // Fetch additional coupon details from the Coupons table
                                const couponRef = dbRef(db, `Coupons/${couponId}`);
                                const couponSnapshot = await get(couponRef);

                                let fullCouponData = {};
                                if (couponSnapshot.exists()) {
                                    fullCouponData = couponSnapshot.val();
                                }

                                // Return the coupon data for this redemption
                                return {
                                    couponId,
                                    clientId: clientId,
                                    clientName,
                                    appliedDate: couponDetails.appliedDate,
                                    ...fullCouponData // Merge full coupon data from Coupons table
                                };
                            });

                            // Wait for all redemptions for the current coupon to complete
                            const couponRedemptions = await Promise.all(redemptionPromises);
                            allAppliedCoupons.push(...couponRedemptions);
                        });

                        // Wait for all coupons for the current affiliate to complete
                        await Promise.all(couponPromises);
                    }
                }

                // Set the applied coupons to the result
                this.allAppliedCoupons = allAppliedCoupons; // Store all coupons first
                this.filteredAppliedCoupons = allAppliedCoupons; // Initially set filtered coupons as all coupons
            } catch (error) {
                console.error("Error fetching applied coupons:", error);
            } finally {
                this.loading = false;
            }
        },
        async fetchClientPreferences(clientId) {
            try {
                // Reference to the client's preferences in Firebase
                const preferencesRef = dbRef(db, `Users/${clientId}/preferences`);
                const preferencesSnapshot = await get(preferencesRef);

                if (preferencesSnapshot.exists()) {
                    const preferences = preferencesSnapshot.val();
                    const clientPreferences = {};

                    // Fetch categories for the selectedCategories
                    if (preferences.selectedCategories) {
                        for (const categoryId of preferences.selectedCategories) {
                            const categoryRef = dbRef(db, `Affiliate_categories/${categoryId}`);
                            const categoryDetailsSnapshot = await get(categoryRef);

                            if (categoryDetailsSnapshot.exists()) {
                                const categoryDetails = categoryDetailsSnapshot.val();

                                // Initialize the category in clientPreferences
                                clientPreferences[categoryId] = {
                                    category: categoryDetails.name,
                                    subcategories: [] // Initialize subcategories
                                };
                            }
                        }
                    }

                    // Fetch subcategories for the selectedSubcategories
                    if (preferences.selectedSubcategories) {
                        for (const subcategoryId of preferences.selectedSubcategories) {
                            const subcategoryRef = dbRef(db, `Affiliate_subcategories/${subcategoryId}`);
                            const subcategoryDetailsSnapshot = await get(subcategoryRef);

                            if (subcategoryDetailsSnapshot.exists()) {
                                const subcategoryDetails = subcategoryDetailsSnapshot.val();

                                // Find the correct category to add this subcategory to
                                const categoryId = subcategoryDetails.category_id;

                                if (clientPreferences[categoryId]) {
                                    // Add subcategory to the corresponding category
                                    clientPreferences[categoryId].subcategories.push(subcategoryDetails.name);
                                }
                            }
                        }
                    }

                    return clientPreferences; // Return the formatted preferences
                } else {
                    return {}; // Return empty if no preferences exist
                }
            } catch (error) {
                console.error('Error fetching client preferences:', error);
                return {};
            }
        },

        getClientFullName(clientId) {
            // Check in selectedClients first, in case it's a client passed via query
            let client = this.selectedClients.find(client => client.id === clientId);

            if (!client) {
                // Fallback to check in clients array
                client = this.clients.find(client => client.id === clientId);
            }
            return client ? `${client.firstName} ${client.lastName}` : 'Nombre no disponible';
        },
        getClientIdentification(clientId) {
            // Check in selectedClients first, in case it's a client passed via query
            let client = this.selectedClients.find(client => client.id === clientId);

            if (!client) {
                // Fallback to check in clients array
                client = this.clients.find(client => client.id === clientId);
            }

            return client ? client.identification : 'Cédula no disponible';
        },
        //Assign coupon to clients 
        searchClientsForCoupon() {
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
        // Method for selecting a client for a coupon being applied
        selectClientForApply(client) {
            this.selectedClient = client;

            console.log('Selected client:', client.id);
            this.searchClient = '';
            this.searchClientResults = [];
        },
        // Method for selecting a single client to assign coupons
        selectClientForCoupon(client) {
            if (!this.selectedClients.includes(client.id)) {
                this.selectedClients.push(client.id);
            } else {
                this.selectedClients = this.selectedClients.filter(id => id !== client.id);
            }

            if (this.role === 'admin') {
                // Hide the modal after selecting the single client
                const modal = Modal.getOrCreateInstance(document.getElementById('clientsModal'));
                modal.hide();
            }

            this.searchClient = '';
            this.searchClientResults = [];
        },
        deselectClient(clientId) {
            this.selectedClients = this.selectedClients.filter(id => id !== clientId);
            console.log('DeSelected client: ', clientId);
        },

        //Update status of expired coupons
        checkCouponStatus(coupon) {
            const today = new Date();
            const expirationDate = new Date(coupon.expiration);

            if (expirationDate < today) {
                coupon.status = false; // Set the coupon to inactive if expiration date is before today
                this.updateCouponStatusInDB(coupon); // Update status in the database
            }
        },
        updateCouponStatusInDB(coupon) {
            const couponRef = dbRef(db, `Coupons/${coupon.id}`);
            update(couponRef, { status: coupon.status });
        },

        async updateCouponIsPaid(coupon) {
            try {
                const couponRef = dbRef(db, `Coupons/${coupon.id}`);
                await update(couponRef, { isPaid: coupon.isPaid });

                showToast.success('Cupon pagado!');
            } catch (error) {
                console.error('Error updating coupon payment status:', error);
                alert('La actualización del estado de pago falló.');
            }
        },

        //File uploads
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                this.qrFile = file;
                this.qrPreview = URL.createObjectURL(file);
            }
        },

        //Create and Assign coupons
        async createCoupon() {
            let qrFileUrl = '';

            // Check if the coupon code already exists
            const existingCouponsRef = dbRef(db, 'Coupons');
            const existingCouponsSnapshot = await get(existingCouponsRef);
            const existingCoupons = existingCouponsSnapshot.val();

            // Iterate through existing coupons to check for duplicate couponCode
            const couponExists = Object.values(existingCoupons || {}).some(coupon => coupon.couponCode === this.couponCode);
            if (couponExists) {
                alert('El código de cupón ya existe. Por favor, elija otro código.');
                return null;
            }

            if (this.qrFile) {
                const qrFileRef = storageRef(storage, `coupons/${this.couponName}`);
                await uploadBytes(qrFileRef, this.qrFile);
                qrFileUrl = await getDownloadURL(qrFileRef);
            }

            const formattedDate = new Date(this.couponExp).toISOString();

            const couponData = {
                name: this.couponName,
                couponCode: this.couponCode,
                type: this.couponType,
                balance: this.couponAmount,
                expiration: formattedDate,
                qrFileUrl: qrFileUrl,
                status: true,
                redeemCount: this.redeemCount,
                onlyInStore: this.onlyInStore,
                isPaid: false
            };
            console.log(couponData);

            const couponsRef = dbRef(db, 'Coupons');
            const newCouponRef = push(couponsRef);
            const newCouponKey = newCouponRef.key;

            try {
                await set(newCouponRef, couponData);

                showToast.success('Cupon creado con exito!');

                // Reset form fields
                this.couponName = '';
                this.couponCode = '';
                this.couponType = '';
                this.couponAmount = '';
                this.couponExp = new Date();
                this.redeemCount = 0,
                    this.onlyInStore = false
                const QRInput = document.getElementById('qrFile');
                QRInput.value = '';
                this.qrPreview = '';
                this.loadCoupons();
                return newCouponKey;
            } catch (error) {
                console.error('Error creating coupon:', error);
                alert('La creación de cupon falló.');
                return null;
            }
        },
        async assignExistingCoupon(data) {
            console.log('selected coupons: ', data.selectedCoupons);
            console.log('selected clients: ', data.selectedClients);
            if (!confirm("¿Desea asignar estos cupones?")) {
                return;
            }
            if (data.selectedClients.length === 0) {
                alert('Por favor seleccione al menos un cliente antes de asignar un cupon.');
                return;
            }

            if (data.selectedCoupons.length === 0) {
                alert('Por favor seleccione al menos un cupón antes de asignar.');
                return;
            }

            try {
                this.loading = true;

                for (const coupon of data.selectedCoupons) {
                    const today = new Date();
                    const expiration = new Date(coupon.expiration);
                    const localExpiration = new Date(expiration.getTime() + expiration.getTimezoneOffset() * 60000);
                    const couponId = coupon.id;

                    // Fetch the selected coupon's redeemCount and timesUsed
                    const couponRef = dbRef(db, `Coupons/${couponId}`);
                    const couponSnapshot = await get(couponRef);

                    // Check to see if coupon exists in database
                    if (!couponSnapshot.exists()) {
                        alert('El cupón seleccionado no existe.');
                        return;
                    }

                    // Check to see if coupon is valid or expired
                    if (localExpiration < today) {
                        alert('No puede asignar un cupón expirado.');
                        return;
                    }

                    const couponData = couponSnapshot.val();
                    const redeemCount = couponData.redeemCount || 0;

                    // Query Users to find how many clients already have this coupon assigned
                    const role = 'cliente';
                    const usersRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));
                    const usersSnapshot = await get(usersRef);

                    let couponAssignedCount = 0;

                    if (usersSnapshot.exists()) {
                        const users = usersSnapshot.val();

                        // Loop through each user and check if they have the coupon assigned
                        for (const userId in users) {
                            const userCoupons = users[userId].coupons || {};

                            // Increment the count if this user has the coupon assigned
                            if (userCoupons[couponId]) {
                                couponAssignedCount++;
                            }
                        }
                    }

                    // Check if the coupon has reached its redeem limit
                    if (couponAssignedCount >= redeemCount) {
                        alert(`El cupón ha alcanzado su límite de ${redeemCount} usos. No se puede asignar a más clientes.`);
                        return;
                    }

                    // Assign coupon to selected clients
                    for (const clientId of data.selectedClients) {
                        const userCouponRef = dbRef(db, `Users/${clientId}/coupons/${couponId}`);
                        await set(userCouponRef, couponId);
                    }
                }

                showToast.success('Cupones asignados con éxito!');

                // Reset state
                data.selectedCoupons = []; // Clear selected coupons
                data.selectedClients = []; // Clear selected clients
            } catch (error) {
                console.error('Error assigning coupons:', error);
                alert('La asignacion de cupones fallo.');
            } finally {
                this.loading = false;
            }
        },
        // Query aid function to fetch the clients who have the selected coupon
        async queryCoupons(couponId) {
            // Query Users to find how many clients already have this coupon assigned
            const role = 'cliente';
            const usersRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));
            const usersSnapshot = await get(usersRef);

            let couponAssignedCount = 0;

            if (usersSnapshot.exists()) {
                const users = usersSnapshot.val();

                // Loop through each user and check if they have the coupon assigned
                for (const userId in users) {
                    const userCoupons = users[userId].coupons || {};

                    // Increment the count if this user has the coupon assigned
                    if (userCoupons[couponId]) {
                        couponAssignedCount++;
                    }
                }
            }

            // Return the coupon with the assigned count included
            return couponAssignedCount;
        },
        async createAndAssignCoupon() {

            try {
                // Check required fields
                if (!this.couponName || !this.couponType || !this.couponCode || !this.couponAmount || !this.couponExp) {
                    alert('Por favor complete todos los campos del formulario antes de crear el cupón.');
                    return;
                }

                // Check if the coupon code already exists
                const existingCouponsRef = dbRef(db, 'Coupons');
                const existingCouponsSnapshot = await get(existingCouponsRef);
                const existingCoupons = existingCouponsSnapshot.val();

                // Iterate through existing coupons to check for duplicate couponCode
                const couponExists = Object.values(existingCoupons || {}).some(coupon => coupon.couponCode === this.couponCode);
                if (couponExists) {
                    alert('El código de cupón ya existe. Por favor, elija otro código.');
                    return null;
                }

                // Upload QR file if present
                let qrFileUrl = '';
                if (this.qrFile) {
                    const qrFileRef = storageRef(storage, `coupons/${this.couponName}`);
                    await uploadBytes(qrFileRef, this.qrFile);
                    qrFileUrl = await getDownloadURL(qrFileRef);
                }

                // Convert couponExp to ISO format
                const isoDate = new Date(this.couponExp).toISOString();

                // Prepare coupon data
                const couponData = {
                    name: this.couponName,
                    type: this.couponType,
                    couponCode: this.couponCode,
                    balance: this.couponAmount,
                    expiration: isoDate,
                    status: true,
                    qrFileUrl: qrFileUrl,
                    redeemCount: this.redeemCount,
                    onlyInStore: this.onlyInStore,
                    isPaid: false
                };

                // Save coupon to database
                const couponsRef = dbRef(db, 'Coupons');
                const newCouponRef = push(couponsRef);
                const newCouponKey = newCouponRef.key;
                await set(newCouponRef, couponData);

                // Assign coupon to client if required

                // Validations



                if (this.assignTheCoupon && this.selectedClients) {
                    for (const clientId of this.selectedClients) {
                        // Assign existing coupon
                        const userCouponRef = dbRef(db, `Users/${clientId}/coupons/${newCouponKey}`);
                        await set(userCouponRef, newCouponKey);
                        showToast.success('Cupon asignado con exito!');
                    }
                } else {
                    showToast.success('Cupon creado con exito!');
                }

                // Reset form fields and UI
                this.resetForm();
                this.loadCoupons();
            } catch (error) {
                console.error('Error creating and assigning coupon:', error);
                alert('La creación o asignación de cupón falló.');
            }
        },

        //Reset state
        clearData(option) {
            if (option === 'option1') {
                // Clear data for assigning an existing coupon
                this.selectedClient = null;
                this.searchClient = '';
            } else if (option === 'option2') {
                // Clear data for registering a new coupon
                this.couponName = '';
                this.couponCode = '';
                this.couponAmount = 0;
                this.couponExp = new Date(); // Reset to current date
                this.qrFile = null;
                this.qrPreview = null;
            }

            // Clear shared or common data
            this.selectedCoupon = null;
            this.editingCoupon = null;
            this.searchCoupon = '';  // Clear any search query
            this.selectedFilterOption = '';  // Reset filter selection
            this.filterByAffiliate = false;
            this.filterByDate = false;
        },
        resetForm() {
            this.couponName = '';
            this.couponCode = '';
            this.couponAmount = '';
            this.couponExp = new Date();
            this.qrFileUrl = '';
            this.selectedClient = null;
            this.searchClient = '';
            this.selectedCouponOption = 'option1';
        },
        updateUI(freshCoupons) {
            this.selectedCoupons = [];
            this.coupons = freshCoupons;
        },

        //Others
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },

        async applyCoupon() {
            const client = this.selectedClient;
            const coupons = this.allCoupons;
            let selectedCoupon = null;

            // Alert if the coupon code was not entered
            if (!this.formattedCode) {
                alert('Primero ingrese un código de cupón válido.');
                this.loading = false;
                return;
            }

            // Find the coupon by its code
            coupons.forEach(coupon => {
                if (coupon.couponCode === this.formattedCode) {
                    selectedCoupon = coupon;
                }
            });

            try {
                this.loading = true;

                // Alert if coupon doesnt exists anymore
                if (!selectedCoupon) {
                    alert('El Cupón ya no existe.');
                    console.log('This coupon does not exists or its been deleted.');
                    this.loading = false;
                    return;
                }

                // Check if the coupon its still valid
                const today = new Date();
                const expiration = new Date(selectedCoupon.expiration);
                const localExpiration = new Date(expiration.getTime() + expiration.getTimezoneOffset() * 60000);
                if (today > localExpiration) {
                    alert('Este cupón ya expiró.');
                    this.loading = false;
                    return;
                }

                // Check if the coupon can still be redeemed
                const redeemCount = selectedCoupon.redeemCount;
                const timesUsed = selectedCoupon.hasOwnProperty('timesUsed') ? selectedCoupon.timesUsed : 0;
                if (timesUsed >= redeemCount) {
                    alert('Este cupón ya fue aplicado las veces permitidas.');
                    this.loading = false;
                    return;
                }

                // Check if the client has the coupon assigned
                if (!client.coupons || !client.coupons[selectedCoupon.id]) {
                    console.error('Client does not have this coupon assigned');
                    alert('El cliente no tiene el cupon asignado');
                    this.loading = false;
                    return;
                }

                // Check if the coupon has already been applied (client can apply only once)
                const appliedCouponRef = dbRef(db, `Users/${this.userId}/appliedCoupons`);
                const appliedCouponsSnapshot = await get(appliedCouponRef);

                if (appliedCouponsSnapshot.exists()) {
                    const appliedCoupons = appliedCouponsSnapshot.val();

                    // Iterate through the entries of appliedCoupons to check for the selectedCoupon and selectedClient
                    const couponAlreadyApplied = Object.keys(appliedCoupons).some(couponId => {
                        // Check if couponId matches selectedCoupon.id and the client id (redemption entry key) matches selectedClient.id
                        const coupon = appliedCoupons[couponId];
                        return couponId === selectedCoupon.id && coupon.hasOwnProperty(client.id);
                    });


                    if (couponAlreadyApplied) {
                        console.error('Coupon already applied by this client');
                        alert('El cliente ya usó este cupon.');
                        this.loading = false;
                        return;
                    }
                }

                // Apply the coupon to the affiliate's 'appliedCoupons' object                
                const newAppliedCouponRef = dbRef(db, `Users/${this.userId}/appliedCoupons/${selectedCoupon.id}/${client.id}`);
                await set(newAppliedCouponRef, {
                    appliedDate: new Date().toISOString(),
                    name: selectedCoupon.name,
                    couponCode: selectedCoupon.couponCode,
                    balance: selectedCoupon.balance,
                    type: selectedCoupon.type,
                    image: selectedCoupon.qrFileUrl,
                    itemPrice: this.itemPrice,
                    discountedPrice: this.discountedPrice,
                    itemName: this.itemName,
                });

                // Remove the coupon from the client's 'coupons' object
                await this.removeCouponFromClients(selectedCoupon.id, client.id);

                // Check if the coupon was successfully added to 'appliedCoupons' and removed from the client
                const checkAppliedCoupon = await get(newAppliedCouponRef);
                if (checkAppliedCoupon.exists()) {
                    showToast.success('Cupón aplicado con éxito.');
                } else {
                    console.error('Failed to apply coupon');
                    alert('Error al aplicar el cupón');
                }
                // Clear the input after applying
                this.appliedCode = '';
                this.selectedClient = '';
                this.itemName = '';
                this.itemPrice = 0;

                // Fetch user applied coupons to update the UI
                this.fetchUserAppliedCoupons();

            } catch (error) {
                console.error('Error applying coupon:', error);
            } finally {
                this.loading = false;
            }
        },
        async removeCouponFromClients(couponId, clientId) {
            try {
                // Fetch the specific client
                const clientRef = dbRef(db, `Users/${clientId}/coupons/${couponId}`);

                // Check if the coupon exists for the selected client
                const couponSnapshot = await get(clientRef);
                if (couponSnapshot.exists()) {
                    // Remove the coupon from the client's 'coupons' object
                    await remove(clientRef);
                    console.log(`Coupon with ID: ${couponId} removed from client with ID: ${clientId}`);
                } else {
                    console.error(`Coupon not found for client with ID: ${clientId}`);
                }
            } catch (error) {
                console.error('Error removing coupon from clients:', error);
            }
        },

        clearSelectedClients() {
            this.selectedClients = [];
        },
        clearSelectedCoupons() {
            this.selectedCoupons = [];
        },
        toggleAccordion(couponId) {
            // Initialize the object if it doesn't exist
            if (!this.accordionOpen) {
                this.accordionOpen = {};
            }

            // Toggle only the specific coupon's accordion
            this.accordionOpen = {
                ...this.accordionOpen,
                [`coupon_${couponId}`]: !this.accordionOpen[`coupon_${couponId}`]
            };
        },

        calculateDiscount() {
            if (this.itemPrice > 0) {
                const coupons = this.allCoupons;
                const coupon = coupons.find(coupon => coupon.couponCode === this.formattedCode);
                // console.log(coupon)
                if (coupon) {
                    this.errorMessage = null;
                    this.discount = coupon.balance;
                    this.discountType = coupon.type;

                    if (this.discountType === 'porcentaje') {
                        this.discountedPrice = this.itemPrice - (this.itemPrice * (coupon.balance / 100));
                    } else {
                        this.discountedPrice = this.itemPrice - coupon.balance;
                    }
                } else {
                    this.errorMessage = 'Cupon no encontrado.';
                    this.discount = null;
                    this.discountType = null;
                    this.discountedPrice = 0;
                }
            }
        },
        handleCouponReload(couponId) {
            this.coupons = this.coupons.filter(coupon => coupon.id !== couponId);
        }
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;

        // Handle client selection from query params
        const clientId = this.$route.query.clientId;

        if (clientId) {
            // Set loading to true only if clientId is present
            this.loading = true;

            try {
                // Fetch required data based on role
                await this.loadCoupons();
                await this.fetchAffiliates();

                if (this.role === 'admin' || this.role === 'afiliado') {
                    await this.fetchClients();
                }

                if (this.role === 'admin') {
                    await this.fetchCategories();
                }

                // Check coupon status
                this.coupons.forEach(coupon => {
                    this.checkCouponStatus(coupon);
                });

                // Fetch and add the full client data to selectedClients
                const client = this.clients.find(c => c.id === clientId);
                if (client) {
                    this.selectedClients.push(clientId);
                    this.selectedCouponOption = 'option1';
                    await this.loadCoupons();
                }

                // Fetch client preferences once the clients have been loaded
                if (this.selectedClients.length > 0) {
                    for (const clientId of this.selectedClients) {
                        const preferences = await this.fetchClientPreferences(clientId);
                        if (preferences) {
                            this.clientPreferences[clientId] = preferences;
                        }
                    }
                }
            } catch (error) {
                console.error('Error during data fetching:', error);
                // Handle any error that occurs during data fetching
            } finally {
                // Set loading to false when done
                this.loading = false;
            }
        } else {
            // If no clientId, just load other data without a loading state
            await this.loadCoupons();
            await this.fetchAffiliates();
            await this.fetchPlans();

            if (this.role === 'admin' || this.role === 'afiliado') {
                await this.fetchClients();
            }

            if (this.role === 'admin') {
                await this.fetchCategories();
            }

            // Check coupon status
            this.coupons.forEach(coupon => {
                this.checkCouponStatus(coupon);
            });
        }
    },
}
</script>
<template>
    <div class="container">
        <!-- Header Actions -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="mb-0 text-primary">
                <i class="fa fa-ticket-alt me-2"></i>
                Cupones
            </h4>
        </div>

        <!-- Admin view -->
        <div v-if="this.role === 'admin'">
            <div class="card">
                <div class="card-header">
                    <!-- Options -->
                    <div class="options-container d-flex justify-content-center">
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio1"
                                value="option1" v-model="selectedCouponOption" @click="loadCoupons()">
                            <label class="form-check-label" for="inlineRadio1">Asignar cupón</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio2"
                                value="option2" v-model="selectedCouponOption">
                            <label class="form-check-label" for="inlineRadio2">Registrar cupón</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio3"
                                value="option3" v-model="selectedCouponOption">
                            <label class="form-check-label" for="inlineRadio3">Administrar Pagos</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio4"
                                value="option4" v-model="selectedCouponOption">
                            <label class="form-check-label" for="inlineRadio4">Aplicados</label>
                        </div>
                    </div>
                </div>
                <div v-if="selectedCouponOption" class="card-body">
                    <div class="text-center" v-if="loading">
                        <p>Cargando...</p>
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    </div>
                    <div v-else>
                        <!-- Option 1 = Assign Existing Coupon Section -->
                        <div v-if="selectedCouponOption === 'option1'" class="mt-3">
                            <AssignCoupons :coupons="filteredCoupons" :clients="clients" :affiliates="affiliates"
                                :categories="categories" :subscriptions="plans"
                                @clearSelectedClients="clearSelectedClients" @assign-coupon="assignExistingCoupon"
                                @fetch-client-preferences="fetchClientPreferences" @reload="handleCouponReload" />
                        </div>

                        <!-- Option 2 = Create/Assign New Coupon Section -->
                        <div v-if="selectedCouponOption === 'option2'" class="mt-4">
                            <div class="coupon-form-container">
                                <!-- Form Header -->
                                <h5 class="text-primary mb-4">Registrar nuevo cupón</h5>

                                <div class="form-grid">
                                    <!-- Basic Info Section -->
                                    <div class="form-section">
                                        <h6 class="section-title">Información básica</h6>
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label for="couponName" class="form-label">Nombre</label>
                                                <div class="input-group">
                                                    <input type="text" class="form-control" id="couponName"
                                                        v-model="couponName">
                                                </div>
                                            </div>

                                            <div class="form-group">
                                                <label for="couponCode" class="form-label">Código</label>
                                                <div class="input-group">
                                                    <input type="text" class="form-control" id="couponCode"
                                                        v-model="formattedCouponCode">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Value Section -->
                                    <div class="form-section">
                                        <h6 class="section-title">Valor del cupón</h6>
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label class="form-label">Tipo <span
                                                        class="text-danger">*</span></label>
                                                <select v-model="couponType" class="form-select text-white">
                                                    <option class="text-white" value="saldo">Saldo ($)</option>
                                                    <option class="text-white" value="porcentaje">Porcentaje (%)
                                                    </option>
                                                </select>
                                            </div>

                                            <div class="form-group">
                                                <label for="couponAmount" class="form-label">
                                                    {{ couponType === 'saldo' ? 'Monto' : 'Porcentaje' }}
                                                </label>
                                                <div class="input-group">
                                                    <span class="input-group-text">{{ couponType === 'saldo' ? '$' : '%'
                                                    }}</span>
                                                    <input type="number" class="form-control" id="couponAmount"
                                                        v-model="couponAmount">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Settings Section -->
                                    <div class="form-section">
                                        <h6 class="section-title">Configuración</h6>
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label for="redeemCount" class="form-label">Límite de usos</label>
                                                <div class="input-group">
                                                    <input type="number" class="form-control" id="redeemCount"
                                                        v-model="redeemCount">
                                                </div>
                                            </div>

                                            <div class="form-group">
                                                <label for="couponExp" class="form-label">Fecha de expiración</label>
                                                <input type="date" v-model="couponExp" class="form-control" />
                                            </div>
                                        </div>

                                        <div class="form-check mt-3">
                                            <input type="checkbox" class="form-check-input" id="storeCheckbox"
                                                v-model="onlyInStore">
                                            <label class="form-check-label text-black" for="storeCheckbox">Cupón
                                                pagable</label>
                                        </div>
                                    </div>

                                    <!-- Image Section -->
                                    <div class="form-section">
                                        <h6 class="section-title">Imagen</h6>
                                        <div class="qr-upload-container">
                                            <input type="file" id="qrFile" class="form-control"
                                                @change="handleFileUpload">
                                            <div v-if="qrPreview" class="qr-preview mt-3">
                                                <img :src="qrPreview" alt="Vista previa QR">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="form-actions mt-4">
                                    <button v-if="!assignTheCoupon" @click="createCoupon" :disabled="!isFormValid"
                                        class="btn btn-theme">
                                        <i class="fa fa-plus-circle me-2"></i>Crear cupón
                                    </button>

                                    <div class="form-check mt-3">
                                        <input type="checkbox" class="form-check-input" id="assignCheckbox"
                                            v-model="assignTheCoupon">
                                        <label class="form-check-label" for="assignCheckbox">Asignar cupón al
                                            crearlo</label>
                                    </div>
                                </div>

                                <!-- Client Selection Section -->
                                <div v-if="assignTheCoupon" class="client-selection-section mt-4">
                                    <div class="section-header d-flex justify-content-between align-items-center">
                                        <h6 class="section-title mb-0">Seleccionar clientes</h6>
                                        <div class="selected-count">
                                            <span class="badge bg-theme rounded-pill">
                                                {{ selectedClients.length }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Search Input -->
                                    <SearchInput v-model="searchClient" :results="searchClientResults"
                                        placeholder="Busque un cliente por su cédula..." @input="searchClientsForCoupon"
                                        @select="selectClientForCoupon" class="form-control mb-3" />

                                    <!-- Selected Clients List -->
                                    <div v-if="selectedClients.length > 0" class="selected-clients-container">
                                        <div class="selected-clients-header">
                                            <h6 class="section-subtitle">Clientes seleccionados</h6>
                                            <button @click="clearSelectedClients" class="btn btn-outline-danger btn-sm">
                                                <i class="fa fa-times-circle me-2"></i>
                                                <span>Limpiar selección</span>
                                            </button>
                                        </div>

                                        <div class="selected-clients-list">
                                            <div v-for="clientId in selectedClients" :key="clientId"
                                                class="selected-client-item">
                                                <div class="client-info">
                                                    <span class="client-name">{{ getClientFullName(clientId) }}</span>
                                                    <span class="client-id">V-{{ getClientIdentification(clientId)
                                                    }}</span>
                                                </div>
                                                <button @click="deselectClient(clientId)"
                                                    class="btn btn-icon btn-outline-danger btn-sm">
                                                    <i class="fa fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Action Button -->
                                    <button v-if="selectedClients.length > 0" @click="createAndAssignCoupon"
                                        :disabled="!isFormValid" class="btn btn-theme mt-3">
                                        <i class="fa fa-share me-2"></i>Crear y asignar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Option 3 = Manage Coupon payments -->
                        <div v-if="selectedCouponOption === 'option3'" class="mt-4">
                            <div class="coupon-form-container">
                                <!-- Header Section -->
                                <h5 class="text-primary mb-4">Administrar pagos de cupones</h5>

                                <!-- Search and Filters Section -->
                                <div class="form-section">
                                    <div class="filters-container">
                                        <!-- Left side: Search Bar -->
                                        <div class="search-side">
                                            <div class="search-container">
                                                <label class="form-label">Buscar cupón por nombre o código</label>
                                                <div class="input-group">
                                                    <span class="input-group-text">
                                                        <i class="fa fa-search"></i>
                                                    </span>
                                                    <input type="text" class="form-control" v-model="searchCoupon"
                                                        placeholder="Buscar cupón por nombre o código..." />
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Right side: Filters -->
                                        <div class="filters-side">
                                            <div class="filters-group">
                                                <!-- Payment Status Filter -->
                                                <div class="dropdown">
                                                    <label class="form-label">Por estado</label>
                                                    <button class="btn btn-outline-theme dropdown-toggle" type="button"
                                                        data-bs-toggle="dropdown" aria-expanded="false">
                                                        <i class="fa fa-filter me-2"></i>
                                                        {{ getPaymentFilterLabel }}
                                                    </button>
                                                    <ul class="dropdown-menu">
                                                        <li>
                                                            <a class="dropdown-item" href="#"
                                                                @click.prevent="selectedFilterOption = 'option1'"
                                                                :class="{ active: selectedFilterOption === 'option1' }">
                                                                Todos
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a class="dropdown-item" href="#"
                                                                @click.prevent="selectedFilterOption = 'option2'"
                                                                :class="{ active: selectedFilterOption === 'option2' }">
                                                                Pagados
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a class="dropdown-item" href="#"
                                                                @click.prevent="selectedFilterOption = 'option3'"
                                                                :class="{ active: selectedFilterOption === 'option3' }">
                                                                Sin pagar
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>

                                                <!-- Expiration Filter -->
                                                <div class="dropdown">
                                                    <label class="form-label">Por expiración</label>
                                                    <button class="btn btn-outline-theme dropdown-toggle" type="button"
                                                        data-bs-toggle="dropdown" aria-expanded="false">
                                                        <i class="fa fa-clock me-2"></i>
                                                        {{ filterLabel }}
                                                    </button>
                                                    <ul class="dropdown-menu">
                                                        <li>
                                                            <a class="dropdown-item" href="#"
                                                                @click.prevent="currentFilter = ''"
                                                                :class="{ active: currentFilter === '' }">
                                                                Todos
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a class="dropdown-item" href="#"
                                                                @click.prevent="currentFilter = 'expiring-soon'"
                                                                :class="{ active: currentFilter === 'expiring-soon' }">
                                                                Próximos a expirar
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a class="dropdown-item" href="#"
                                                                @click.prevent="currentFilter = 'newest'"
                                                                :class="{ active: currentFilter === 'newest' }">
                                                                Más nuevos
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a class="dropdown-item" href="#"
                                                                @click.prevent="currentFilter = 'active'"
                                                                :class="{ active: currentFilter === 'active' }">
                                                                Solo activos
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a class="dropdown-item" href="#"
                                                                @click.prevent="currentFilter = 'expired'"
                                                                :class="{ active: currentFilter === 'expired' }">
                                                                Solo expirados
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>

                                                <!-- Date Filter Toggle -->
                                                <label class="form-label">Por fecha</label>
                                                <div class="date-filter-toggle">

                                                    <div class="form-check form-switch">
                                                        <input class="form-check-input" type="checkbox"
                                                            id="flexSwitchCheckDefault" v-model="filterByDate">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Date Range Picker -->
                                    <div v-if="filterByDate" class="date-range-section mt-3">
                                        <div class="date-range-container">
                                            <div class="date-input">
                                                <label class="form-label">Fecha inicial</label>
                                                <input type="date" v-model="startDate" class="form-control" />
                                            </div>
                                            <div class="date-input">
                                                <label class="form-label">Fecha final</label>
                                                <input type="date" v-model="endDate" class="form-control" />
                                            </div>
                                            <button type="button" class="btn btn-outline-theme"
                                                @click="clearDateFilter">
                                                <i class="fa fa-times-circle me-2"></i>Limpiar filtro
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Coupons Grid -->
                                <div class="coupon-cards-container mt-4">
                                    <div v-if="filteredCoupons.length > 0" v-for="(coupon, index) in filteredCoupons"
                                        :key="coupon.id" class="coupon-payment-card">
                                        <div class="card-header">
                                            <h6 class="mb-0 text-black">{{ coupon.name.toUpperCase() }}</h6>
                                            <div class="status-badges">
                                                <span class="badge" :class="coupon.status ? 'bg-success' : 'bg-danger'">
                                                    {{ coupon.status ? 'Activo' : 'Expirado' }}
                                                </span>
                                                <span class="badge ms-2"
                                                    :class="coupon.isPaid ? 'bg-success' : 'bg-danger'">
                                                    {{ coupon.isPaid ? 'Pagado' : 'Sin pagar' }}
                                                </span>
                                            </div>
                                        </div>

                                        <div class="card-body">
                                            <div class="coupon-image">
                                                <img :src="coupon.qrFileUrl" alt="logo">
                                            </div>

                                            <div class="coupon-details">
                                                <div class="detail-item">
                                                    <span class="detail-label">Código:</span>
                                                    <span class="detail-value">{{ coupon.couponCode }}</span>
                                                </div>

                                                <div class="accordion-section">
                                                    <div class="accordion-header" @click="toggleAccordion(coupon.id)">
                                                        <span>Detalles adicionales</span>
                                                        <i class="fa"
                                                            :class="accordionOpen[`coupon_${coupon.id}`] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                                                    </div>

                                                    <div class="accordion-content"
                                                        :class="{ 'open': accordionOpen[`coupon_${coupon.id}`] }">
                                                        <div class="details-grid">
                                                            <div class="detail-item">
                                                                <span class="detail-label">{{ coupon.type === 'saldo' ?
                                                                    'Saldo' : 'Porcentaje'
                                                                }}:</span>
                                                                <span class="detail-value">{{ coupon.type === 'saldo' ?
                                                                    '$' : '%' }}{{
                                                                        coupon.balance }}</span>
                                                            </div>

                                                            <div class="detail-item">
                                                                <span class="detail-label">Número de usos:</span>
                                                                <span class="detail-value">{{ coupon.redeemCount
                                                                }}</span>
                                                            </div>

                                                            <div class="detail-item">
                                                                <span class="detail-label">Solo en tienda:</span>
                                                                <span class="detail-value">
                                                                    <span class="badge"
                                                                        :class="coupon.onlyInStore ? 'bg-success' : 'bg-secondary'">
                                                                        {{ coupon.onlyInStore ? 'Sí' : 'No' }}
                                                                    </span>
                                                                </span>
                                                            </div>

                                                            <div class="detail-item">
                                                                <span class="detail-label">Expiración:</span>
                                                                <span class="detail-value">{{
                                                                    formatDate(coupon.expiration) }}</span>
                                                            </div>

                                                            <div class="detail-item">
                                                                <span class="detail-label">Pagado al comercio:</span>
                                                                <div class="form-check form-switch">
                                                                    <input class="form-check-input" type="checkbox"
                                                                        v-bind:id="'couponPaid' + coupon.id"
                                                                        v-model="coupon.isPaid"
                                                                        @change="updateCouponIsPaid(coupon)">
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="!filteredCoupons || filteredCoupons.length === 0"
                                    class="d-flex justify-content-center align-items-center min-vh-50">
                                    <div class="text-center">
                                        <div class="mb-3">
                                            <i class="fa fa-ticket-alt text-secondary opacity-25"
                                                style="font-size: 5em"></i>
                                        </div>
                                        <h5 class="text-secondary">Sin resultados</h5>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Option 4 = Applied Coupons -->
                        <div v-if="selectedCouponOption === 'option4'" class="mt-3">
                            <AppliedCoupons :affiliates="affiliates" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Confirm delete selected coupons -->
            <ConfirmDeleteCoupons :selectedCoupons="selectedCoupons" :coupons="coupons" @update-ui="updateUI" />
        </div>

        <!-- Client view -->
        <div v-if="this.role === 'cliente'">
            <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><router-link to="/client-portal">Portal de clientes</router-link></li>
                    <li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
                </ol>
            </nav>

            <div class="text-center" v-if="loadingCoupons">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            </div>
            <div v-else class="row">
                <div class="col-12 col-md-3" v-if="coupons.length > 0" v-for="coupon in coupons" :key="coupon.id">
                    <CouponCard :coupon="coupon" :key="coupon.id" />
                </div>
                <div class="col-12" v-else>
                    <!-- empty state -->
                    <div class="empty-state-container text-center py-5">
                        <div class="empty-state-icon mb-4">
                            <i class="fa fa-ticket-alt fa-4x text-muted"></i>
                        </div>
                        <h4 class="text-muted mb-3">No hay cupones asignados</h4>
                        <p class="text-muted mb-4">Los cupones aparecerán aquí cuando estén disponibles.</p>
                        <div class="empty-state-action">
                            <button class="btn btn-outline-primary" @click="loadCoupons">
                                <i class="fa fa-sync-alt me-2"></i>Actualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Afilliate view -->
        <div v-if="this.role === 'afiliado'">
            <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb" class="mb-4">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><router-link to="/affiliate-portal">Portal de afiliados</router-link>
                    </li>
                    <li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
                </ol>
            </nav>

            <div class="row">
                <div id="apply-coupon">
                    <div class="row justify-content-center mb-4">
                        <div class="col-12 col-md-8 col-lg-6">
                            <div class="card coupon-apply-card shadow-lg border-0 rounded-lg overflow-hidden">
                                <div class="card-header bg-gradient-primary text-white py-3">
                                    <h5 class="card-title mb-0 text-center">
                                        <i class="fa fa-ticket-alt me-2"></i>Aplicar Cupón
                                    </h5>
                                </div>
                                <div class="card-body p-4">
                                    <div class="text-center mb-4">
                                        <p class="text-muted">Seleccione un cliente e ingrese el código del cupón que
                                            desea
                                            aplicar</p>
                                    </div>

                                    <!-- Client search -->
                                    <div class="form-group mb-4">
                                        <label class="form-label fw-bold mb-2">
                                            <i class="fa fa-search me-1"></i>Buscar Cliente
                                        </label>
                                        <div class="search-container position-relative">
                                            <SearchInput v-model="searchClient" :results="searchClientResults"
                                                placeholder="Busque un cliente por su cédula..."
                                                @input="searchClientsForCoupon" @select="selectClientForApply"
                                                class="form-control form-control-lg rounded-pill" />
                                        </div>
                                    </div>

                                    <!-- Selected client information -->
                                    <div v-if="selectedClient" class="selected-client-info mb-4">
                                        <div class="card border-0 bg-light">
                                            <div class="card-header bg-light border-bottom-0 py-2">
                                                <h6 class="mb-0 text-primary">
                                                    <i class="fa fa-user-check me-2"></i>Cliente Seleccionado
                                                </h6>
                                            </div>
                                            <div class="card-body py-3">
                                                <div class="row g-3">
                                                    <div class="col-md-6">
                                                        <div class="client-info-item">
                                                            <span class="info-label">Nombre:</span>
                                                            <span class="info-value">{{ selectedClient.firstName + ' ' +
                                                                selectedClient.lastName }}</span>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="client-info-item">
                                                            <span class="info-label">Cédula:</span>
                                                            <span class="info-value">{{ selectedClient.identification
                                                            }}</span>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="client-info-item">
                                                            <span class="info-label">Email:</span>
                                                            <span class="info-value">{{ selectedClient.email }}</span>
                                                        </div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <div class="client-info-item">
                                                            <span class="info-label">Teléfono:</span>
                                                            <span class="info-value">{{ selectedClient.phoneNumber
                                                            }}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Purchased Item info -->
                                    <div class="d-flex justify-content-between gap-2 mt-4">
                                        <div class="form-group mb-4 w-50">
                                            <label class="form-label fw-bold mb-2">
                                                Pedido
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i class="fa fa-shopping-cart"></i>
                                                </span>
                                                <input type="text" class="form-control" v-model="itemName" />
                                            </div>
                                        </div>

                                        <div class="form-group mb-4 w-50">
                                            <label class="form-label fw-bold mb-2">
                                                Monto
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i class="fa-solid fa-file-invoice-dollar"></i>
                                                </span>
                                                <input type="number" class="form-control" v-model="itemPrice"
                                                    placeholder="Monto pagado" />
                                            </div>
                                        </div>
                                    </div>
                                    <!-- Coupon input -->
                                    <div class="d-flex justify-content-between gap-2">
                                        <!-- Coupon code input -->
                                        <div class="form-group mb-4 w-50">
                                            <label class="form-label fw-bold mb-2">
                                                Código del Cupón
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i class="fa fa-barcode me-1"></i>
                                                </span>
                                                <input type="text" class="form-control" v-model="formattedCode"
                                                    placeholder="Ingrese el código del cupón"
                                                    @change="calculateDiscount()" />
                                            </div>
                                            <small v-if="errorMessage" class="text-danger">{{ errorMessage }}</small>
                                        </div>

                                        <div class="form-group mb-4 w-50">
                                            <label class="form-label fw-bold mb-2">
                                                Descuento
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i
                                                        :class="discountType === 'porcentaje' ? 'fa fa-percent' : 'fa fa-dollar'"></i>
                                                </span>
                                                <input type="number" class="form-control border-secondary"
                                                    v-model="discount" disabled />
                                            </div>
                                        </div>
                                    </div>
                                    <!-- disabled inputs -->
                                    <div class="d-flex flex-column align-items-end">
                                        <div class="form-group mb-4 w-50">
                                            <label class="form-label fw-bold mb-2">
                                                Monto a Pagar
                                            </label>
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i class="fa-solid fa-hand-holding-dollar"></i>
                                                </span>
                                                <input type="number" class="form-control border-secondary"
                                                    v-model="discountedPrice" disabled />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Apply button -->
                                    <div class="text-center mt-4">
                                        <button :disabled="loading"
                                            class="btn btn-primary btn-lg rounded-pill px-5 shadow-sm"
                                            @click="applyCoupon()">
                                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"
                                                role="status" aria-hidden="true"></span>
                                            <i v-else class="fa fa-check-circle me-2"></i>
                                            Aplicar Cupón
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr>

                <!-- Options -->
                <div class="d-flex justify-content-center">
                    <div class="custom-nav-pills nav nav-pills">
                        <div class="nav-item me-3">
                            <input class="form-check-input d-none" type="radio" name="couponOptions" id="inlineRadio1"
                                value="option1" v-model="selectedCouponOption" @click="fetchUserAppliedCoupons()">
                            <label class="nav-link px-4 py-2" :class="{ 'active': selectedCouponOption === 'option1' }"
                                for="inlineRadio1">
                                <i class="fa fa-check-circle me-2"></i>Cupones Aplicados
                            </label>
                        </div>
                        <div class="nav-item">
                            <input class="form-check-input d-none" type="radio" name="couponOptions" id="inlineRadio2"
                                value="option2" v-model="selectedCouponOption" @click="loadCoupons()">
                            <label class="nav-link px-4 py-2" :class="{ 'active': selectedCouponOption === 'option2' }"
                                for="inlineRadio2">
                                <i class="fa fa-clock me-2"></i>Cupones pendiente por Pago
                            </label>
                        </div>
                    </div>
                </div>

                <div class="text-center" v-if="loadingCoupons">
                    <div class="spinner-container py-5">
                        <span class="spinner-border text-primary" role="status" aria-hidden="true"></span>
                        <p class="mt-3 text-muted">Cargando cupones...</p>
                    </div>
                </div>
                <div v-else>
                    <!-- Option 1 = Applied coupons -->
                    <div v-if="selectedCouponOption === 'option1'" class="mt-3">
                        <AppliedCouponsHistory :appliedCoupons="appliedCoupons" @reload="fetchUserAppliedCoupons" />
                    </div>

                    <!-- Option 2 = Pending payment coupons -->
                    <div v-if="selectedCouponOption === 'option2'" class="mt-3">
                        <PendingCoupons :pendingPaymentCoupons="pendingPaymentCoupons" @reload="loadCoupons" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
.form-select {
    color: white;
}

.btn-theme {
    background-color: purple;
    border-color: purple;
}

.btn-outline-theme {
    background-color: transparent;
    border-color: purple;
    color: purple;
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
}

.btn-outline-theme:hover {
    background-color: purple;
    color: white;
    box-shadow: 0 2px 5px rgba(108, 117, 125, 0.3);
}

.custom-btn {
    width: 120px;
    /* Smaller fixed width for small screens */
    padding: 6px 10px;
    /* Reduced padding for a compact look */
    text-align: center;
    font-size: 0.8rem;
    /* Smaller font size */
}

@media (min-width: 768px) {
    .custom-btn {
        width: 150px;
        /* Slightly wider for larger screens */
        font-size: 0.85rem;
        /* Slightly larger font for better readability on larger screens */
    }
}

.list-autocomplete {
    padding: 0;
}

.list-autocomplete em {
    font-style: normal;
}

.card {
    cursor: pointer;
    transition: background-color 0.3s;
}

.card.selected {
    background-color: darkblue;
}

.vertical-separator {
    border-left: 1px solid #ccc;
    height: 100%;
    margin-left: 15px;
}

.custom-nav-pills .nav-link {
    border-radius: 20px;
    background-color: #f8f9fa;
    /* Light background for pills */
    color: #29122f;
    margin-right: 10px;
    padding: 10px 20px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    font-weight: 500;
}

.custom-nav-pills .nav-link:hover {
    background-color: #e2e6ea;
    /* Slightly darker on hover */
    color: #0056b3;
    /* Darker blue on hover */
}

.custom-nav-pills .nav-link.active,
.custom-nav-pills .custom-active {
    background-color: #007bff;
    /* Active state color */
    color: white;
    /* White text for active pills */
}

.custom-nav-pills .nav-link.active:hover {
    background-color: #0056b3;
    /* Darker blue on active hover */
}

/* Empty state styling */

.empty-state-icon {
    color: #adb5bd;
}

/* Coupon card styling */
.coupon-card {
    background-color: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    border: 1px solid #e9ecef;
    position: relative;
}

.coupon-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.coupon-header {
    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
    color: white;
    padding: 15px;
    text-align: center;
    position: relative;
}

.coupon-title {
    margin: 0;
    font-weight: 600;
    font-size: 1.2rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.coupon-body {
    padding: 20px;
    background-color: white;
}

.coupon-qr {
    background-color: white;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    margin-bottom: 15px;
}

.coupon-qr img {
    max-height: 150px;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.coupon-qr img:hover {
    transform: scale(1.05);
}

.coupon-details {
    padding-top: 10px;
}

.coupon-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #e9ecef;
}

.coupon-info:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.coupon-label {
    font-weight: 600;
    color: #495057;
}

.coupon-value {
    color: #212529;
}

.coupon-footer {
    position: relative;
    height: 30px;
    background-color: #f8f9fa;
    border-top: 2px dashed #dee2e6;
}

.coupon-scissors {
    position: absolute;
    top: -10px;
    right: 20px;
    color: #adb5bd;
    font-size: 1.2rem;
}

/* Badge styling */
.badge {
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 30px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* Empty state container styling */
.empty-state-container {
    background-color: transparent;
    border-radius: 12px;
    border: 1px dashed #dee2e6;
}

/* Spinner container */
.spinner-container {
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

/* Improved nav pills */
.custom-nav-pills {
    display: flex;
    background-color: #f8f9fa;
    border-radius: 30px;
    padding: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.custom-nav-pills .nav-link {
    border-radius: 25px;
    transition: all 0.3s ease;
    color: #495057;
    font-weight: 500;
}

.custom-nav-pills .nav-link.active {
    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

/* Coupon client section */
.coupon-client {
    background-color: grey;
    padding: 10px;
    border-radius: 8px;
    text-align: center;
}

/* Responsive grid adjustments */
.row.g-4 {
    margin-right: -12px;
    margin-left: -12px;
}

.row.g-4>[class*="col-"] {
    padding-right: 12px;
    padding-left: 12px;
}

/* Apply Coupon Card Styling */
.coupon-apply-card {
    transition: all 0.3s ease;
    border-radius: 15px !important;
}

.coupon-apply-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1) !important;
}

.bg-gradient-primary {
    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
}

.selected-client-info {
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.3s ease;
}

.selected-client-info:hover {
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.client-info-item {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5rem;
}

.info-label {
    font-size: 0.8rem;
    color: #6c757d;
    margin-bottom: 0.25rem;
}

.info-value {
    font-weight: 500;
    color: #212529;
}

/* Fix for coupon client section */
.coupon-client {
    background-color: rgba(0, 0, 0, 0.03);
    padding: 10px;
    border-radius: 8px;
    text-align: center;
    color: #212529;
}

.coupon-client .badge {
    background-color: #17a2b8 !important;
}

.coupon-client .fw-bold {
    color: #212529;
}

.options-container {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px;
    background-color: transparent;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.options-container .form-check-inline {
    margin-right: 0;
    margin-bottom: 5px;
    background-color: transparent;
    border-radius: 30px;
    padding: 10px 29px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
}

.options-container .form-check-inline:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.options-container .form-check-input {
    margin-right: 8px;
}

.options-container .form-check-label {
    font-weight: 500;
    color: #495057;
    cursor: pointer;
}

.options-container .form-check-input:checked+.form-check-label {
    color: #007bff;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .options-container {
        flex-direction: column;
        align-items: stretch;
    }

    .options-container .form-check-inline {
        width: 100%;
        text-align: center;
        margin-right: 0;
    }
}

@media (min-width: 769px) and (max-width: 991px) {
    .options-container {
        flex-wrap: wrap;
        justify-content: center;
    }

    .options-container .form-check-inline {
        flex: 0 0 calc(50% - 10px);
        margin-right: 0;
        text-align: center;
    }
}

/* Add icon support for options */
.options-container .form-check-label::before {
    font-family: "Font Awesome 5 Free";
    margin-right: 8px;
    font-weight: 900;
}

.options-container .form-check-inline:nth-child(1) .form-check-label::before {
    color: #28a745;
}

.options-container .form-check-inline:nth-child(2) .form-check-label::before {
    color: #007bff;
}

.options-container .form-check-inline:nth-child(3) .form-check-label::before {
    color: #ffc107;
}

.options-container .form-check-inline:nth-child(4) .form-check-label::before {
    color: #17a2b8;
}

/* Search and actions container */
.search-and-actions {
    background-color: #f8f9fa;
    border-radius: 10px;
    padding: 15px;
    margin-bottom: 20px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.search-container {
    position: relative;
}

.search-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
    pointer-events: none;
}

.filter-controls {
    min-height: 38px;
}

/* Make buttons more consistent */
.btn-outline-theme,
.btn-theme {
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
}

.btn-outline-theme {
    border-color: purple;
    color: purple;
}

.btn-outline-theme:hover {
    background-color: purple;
    color: white;
    box-shadow: 0 2px 5px rgba(128, 0, 128, 0.3);
}

.btn-theme {
    background-color: purple;
    border-color: purple;
    color: white;
}

.btn-theme:hover {
    background-color: #8a2be2;
    border-color: #8a2be2;
    box-shadow: 0 2px 5px rgba(138, 43, 226, 0.3);
}

/* Responsive adjustments */
@media (max-width: 767.98px) {
    .search-and-actions {
        padding: 12px;
    }

    .filter-controls {
        margin-top: 5px;
        justify-content: center !important;
    }

    .btn-outline-theme,
    .btn-theme {
        width: 100%;
        margin-bottom: 5px;
    }
}

@media (min-width: 768px) and (max-width: 991.98px) {
    .filter-controls {
        justify-content: flex-end;
    }
}

/* Selected clients container */
.selected-container {
    margin-top: 1rem;
}

.badge.rounded-pill {
    padding: 0.5rem 0.75rem;
    font-weight: 500;
    font-size: 0.85rem;
}

/* Responsive adjustments */
@media (max-width: 767.98px) {
    .search-and-actions .d-flex {
        flex-wrap: wrap;
    }

    .search-and-actions .btn {
        flex: 1 0 auto;
        margin-top: 0.5rem;
    }
}

@media (min-width: 768px) {
    .search-container {
        max-width: 100%;
    }
}

/* Improved selected clients container styling */
.selected-container {
    background-color: #20262b;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.badge.bg-theme {
    background-color: purple;
    color: white;
    font-size: 1rem;
    height: 28px;
    width: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Grid layout for client cards */
.selected-clients-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

/* Client card styling */
.client-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: all 0.3s ease;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.client-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.client-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background-color: #f0f0f0;
    border-bottom: 1px solid #e0e0e0;
}

.client-info {
    overflow: hidden;
}

.client-name {
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.client-id {
    font-size: 0.8rem;
    color: #666;
}

.btn-remove {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.btn-remove:hover {
    background-color: rgba(220, 53, 69, 0.1);
}

.client-card-body {
    padding: 15px;
    flex: 1;
}

/* Preferences styling */
.preferences-section {
    height: 100%;
}

.preferences-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 10px;
    color: #555;
    display: flex;
    align-items: center;
}

.preferences-list {
    max-height: 200px;
    overflow-y: auto;
}

.preference-category {
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #e0e0e0;
}

.preference-category:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.category-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: #444;
    margin-bottom: 5px;
    background-color: #f0f0f0;
    padding: 4px 8px;
    border-radius: 4px;
}

.subcategories {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.subcategory-tag {
    font-size: 0.75rem;
    background-color: #e9ecef;
    color: #495057;
    padding: 2px 8px;
    border-radius: 12px;
}

.no-preferences {
    color: #6c757d;
    font-size: 0.85rem;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
    text-align: center;
}

/* Empty state styling */
.empty-selection {
    background-color: transparent;
    border-radius: 8px;
    border: 1px dashed #dee2e6;
}

.empty-icon {
    opacity: 0.5;
}

/* Responsive adjustments */
@media (max-width: 767.98px) {
    .selected-clients-grid {
        grid-template-columns: 1fr;
    }

    .selected-container {
        padding: 15px;
    }
}

/* Coupon Cards Styling */
.coupon-cards-container {
    display: grid;
    overflow-x: auto;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.coupon-card {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    border: 2px solid transparent;
    height: fit-content;
    display: flex;
    flex-direction: column;
}

.coupon-payment-card {
    height: fit-content;
}

.coupon-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.coupon-card.selected {
    border-color: purple;
}

/* Card Header */
.coupon-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-bottom: 1px solid #dee2e6;
}

.coupon-title-section {
    flex: 1;
    min-width: 0;
    position: relative;
}

.coupon-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.status-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 0.7rem;
    padding: 3px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.status-active {
    background-color: #28a745;
    color: white;
}

.status-expired {
    background-color: #dc3545;
    color: white;
}

.coupon-actions {
    display: flex;
    gap: 5px;
    margin-left: 10px;
}

.action-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background-color: white;
}

.edit-btn {
    color: #007bff;
}

.edit-btn:hover {
    background-color: #007bff;
    color: white;
}

.cancel-btn {
    color: #6c757d;
}

.cancel-btn:hover {
    background-color: #6c757d;
    color: white;
}

.delete-btn {
    color: #dc3545;
}

.delete-btn:hover {
    background-color: #dc3545;
    color: white;
}

/* Card Body */
.coupon-card-body {
    padding: 15px;
}

.coupon-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.coupon-main-info {
    display: flex;
    gap: 15px;
}

.coupon-qr {
    width: 100px;
    height: 100px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    border-radius: 8px;
    border: 1px solid #dee2e6;
    overflow: hidden;
}

.qr-image {
    max-width: 100%;
    max-height: 100%;
    cursor: zoom-in;
}

.coupon-basic-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.info-label {
    font-size: 0.75rem;
    color: #6c757d;
    margin-bottom: 2px;
}

.info-value {
    font-weight: 500;
    color: #212529;
}

.code-value {
    font-family: monospace;
    font-size: 1.1rem;
    letter-spacing: 1px;
}

.value-highlight {
    font-size: 1.2rem;
    color: #28a745;
    font-weight: 600;
}

/* Expiration date badge */
.expiration-badge {
    position: absolute;
    top: -5px;
    right: 0;
    font-size: 0.75rem;
    padding: 3px 8px;
    border-radius: 12px;
    background-color: #e9ecef;
    color: #495057;
    font-weight: 500;
    display: flex;
    align-items: center;
}

.expiration-badge.expiring-soon {
    background-color: #fff3cd;
    color: #856404;
}

.usage-stats {
    display: flex;
    gap: 15px;
    margin-top: 5px;
}

/* Accordion Styling */
.coupon-details-accordion {
    border-top: 1px solid #dee2e6;
    margin-top: 10px;
    flex-shrink: 0;
    /* Add this line */
}

.accordion-header {
    padding: 10px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-weight: 500;
    color: #495057;
}

.accordion-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    color: #495057;
    position: relative;
    /* Add this line */
    z-index: 1;
    /* Add this line */
}

.accordion-content.open {
    max-height: 350px;
    overflow-y: auto;
}

.details-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 15px 0;
}

/* Responsive adjustments */
@media (max-width: 767.98px) {
    .coupon-main-info {
        flex-direction: column;
        align-items: center;
    }

    .coupon-qr {
        width: 120px;
        height: 120px;
        margin-bottom: 10px;
    }

    .coupon-basic-info {
        width: 100%;
        padding-top: 20px;
        /* Make room for the expiration badge */
    }

    .expiration-badge {
        top: -10px;
        right: auto;
        left: 50%;
        transform: translateX(-50%);
    }

    .usage-stats {
        flex-direction: column;
        gap: 8px;
    }
}

@media (min-width: 768px) and (max-width: 991.98px) {
    .usage-stats {
        flex-direction: row;
    }

    .details-grid {
        flex-direction: row;
        flex-wrap: wrap;
    }

    .detail-item {
        width: calc(50% - 8px);
    }
}

/* Improved selection indicator for coupon cards */
.coupon-card.selected {
    border-color: purple;
    background-color: rgba(128, 0, 128, 0.05);
    position: relative;
}

.coupon-card.selected::before {
    content: "✓";
    position: absolute;
    top: -10px;
    right: -10px;
    width: 25px;
    height: 25px;
    background-color: purple;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    z-index: 10;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.coupon-card.selected .coupon-card-header {
    background: linear-gradient(135deg, #f8f0ff 0%, #f0e6ff 100%);
    border-bottom-color: purple;
}

.coupon-card.selected .coupon-title {
    color: purple;
}

/* Add a subtle animation for selection */
@keyframes pulse-select {
    0% {
        box-shadow: 0 0 0 0 rgba(128, 0, 128, 0.4);
    }

    70% {
        box-shadow: 0 0 0 10px rgba(128, 0, 128, 0);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(128, 0, 128, 0);
    }
}

.coupon-card.selected {
    animation: pulse-select 1s ease-out 1;
}

/* Filter dropdown styling */
.dropdown-menu {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid #e9ecef;
    padding: 8px 0;
}

.dropdown-header {
    color: #6c757d;
    font-weight: 600;
    padding: 8px 16px;
}

.dropdown-item {
    padding: 8px 16px;
    color: #495057;
    transition: all 0.2s ease;
}

.dropdown-item:hover {
    background-color: #f8f0ff;
}

.dropdown-item:active {
    background-color: purple;
    color: white;
}

.dropdown-divider {
    margin: 4px 0;
}

/* Delete button styling */
.btn-outline-danger {
    border-color: #dc3545;
    color: #dc3545;
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
}

.btn-outline-danger:hover:not(:disabled) {
    background-color: #dc3545;
    color: white;
    box-shadow: 0 2px 5px rgba(220, 53, 69, 0.3);
}

.btn-outline-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Responsive styling for selected coupons action buttons */
.selected-container .d-flex {
    flex-wrap: wrap;
    gap: 8px;
}

.selected-container .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
}

/* Media queries for small screens */
@media (max-width: 767.98px) {
    .selected-container .d-flex {
        justify-content: center;
        margin-top: 10px;
    }

    .selected-container .d-flex button {
        flex: 1 1 auto;
        min-width: 120px;
    }
}

@media (max-width: 575.98px) {
    .selected-container .d-flex {
        flex-direction: column;
        width: 100%;
    }

    .selected-container .d-flex button {
        width: 100%;
    }

    .selected-container .d-flex {
        margin-top: 15px;
    }

    .selected-container .d-flex button+button {
        margin-left: 0 !important;
    }
}

/* Add these styles */
.coupon-form-container {
    background-color: #20262b;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.form-grid {
    display: grid;
    gap: 25px;
}

.form-section {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
}

.section-title {
    color: #495057;
    font-weight: 600;
    margin-bottom: 15px;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
}

.form-group {
    margin-bottom: 0;
}

.form-label {
    font-size: 0.85rem;
    color: #6c757d;
    margin-bottom: 5px;
}

.qr-upload-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.qr-preview {
    width: 120px;
    height: 120px;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
}

.qr-preview img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.form-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
}

.client-selection-section {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
}

.selected-clients-count {
    font-size: 0.9rem;
    color: #6c757d;
    margin: 10px 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .form-grid {
        gap: 15px;
    }

    .form-section {
        padding: 15px;
    }

    .form-row {
        grid-template-columns: 1fr;
    }
}

/* Add these styles */
.selected-clients-container {
    background-color: #ffffff;
    border-radius: 8px;
    padding: 15px;
    margin-top: 15px;
    border: 1px solid #dee2e6;
}

.selected-clients-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.section-subtitle {
    font-size: 0.85rem;
    color: #495057;
    margin: 0;
}

.selected-clients-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
}

.selected-client-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: #f8f9fa;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.selected-client-item:hover {
    background-color: #e9ecef;
}

.client-info {
    display: flex;
    flex-direction: column;
}

.client-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: #212529;
}

.client-id {
    font-size: 0.8rem;
    color: #6c757d;
}

.btn-icon {
    padding: 4px 8px;
    line-height: 1;
    display: flex;
    align-items: center;
    gap: 4px;
}

.btn-icon i {
    font-size: 0.9rem;
}

.btn-icon span {
    display: inline;
}

/* Update the existing styles */
.section-header {
    margin-bottom: 15px;
}

.selected-count {
    display: flex;
    align-items: center;
}

.selected-count .badge {
    font-size: 0.85rem;
    padding: 0.35em 0.65em;
}

/* Scrollbar styling for the clients list */
.selected-clients-list::-webkit-scrollbar {
    width: 6px;
}

.selected-clients-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.selected-clients-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.selected-clients-list::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* Responsive adjustments for buttons */
@media (max-width: 768px) {
    .selected-clients-header .btn-outline-danger span {
        display: none;
    }

    .selected-clients-header .btn-outline-danger {
        padding: 6px 8px;
    }

    .selected-clients-header .btn-outline-danger i {
        margin: 0;
    }
}

/* Update the selected clients container for mobile */
@media (max-width: 576px) {
    .selected-clients-container {
        padding: 10px;
    }

    .selected-clients-header {
        margin-bottom: 10px;
    }

    .selected-client-item {
        padding: 6px 10px;
    }
}

/* Add these styles for Option 3 */
.filter-options {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: center;
    margin-top: 10px;
}

.filter-group {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.date-range-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    align-items: end;
}

.date-input {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.coupon-payment-card {
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid #dee2e6;
}

.coupon-payment-card .card-header {
    background: #f8f9fa;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #dee2e6;
}

.coupon-payment-card .card-body {
    padding: 15px;
}

.coupon-image {
    width: 120px;
    height: 120px;
    margin: 0 auto 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    overflow: hidden;
}

.coupon-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.status-badges {
    display: flex;
    gap: 8px;
}

.search-container {
    max-width: 500px;
}

/* Update existing styles */
.coupon-cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .filter-options {
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
    }

    .filter-group {
        justify-content: center;
    }

    .date-range-container {
        grid-template-columns: 1fr;
    }

    .coupon-payment-card .card-header {
        flex-direction: column;
        gap: 10px;
        text-align: center;
    }
}

/* Update the filter styles */
.filters-container {
    display: flex;
    gap: 20px;
    align-items: start;
}

.search-side {
    flex: 0 0 50%;
    max-width: 50%;
}

.filters-side {
    flex: 1;
    display: flex;
    justify-content: flex-end;
}

.filters-group {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: flex-end;
}

.search-container {
    width: 100%;
    max-width: 100%;
}

/* Update responsive styles */
@media (max-width: 992px) {
    .filters-container {
        flex-direction: column;
        gap: 15px;
    }

    .search-side {
        flex: 0 0 100%;
        max-width: 100%;
    }

    .filters-side {
        width: 100%;
    }

    .filters-group {
        flex-wrap: wrap;
        justify-content: space-between;
    }

    .dropdown {
        flex: 1;
        min-width: 150px;
        margin: 0 5px;
    }

    .date-filter-toggle {
        width: 100%;
        margin-top: 10px;
        display: flex;
        justify-content: center;
    }
}

@media (max-width: 576px) {
    .filters-group {
        flex-direction: column;
        align-items: stretch;
    }

    .dropdown {
        width: 100%;
        margin: 5px 0;
    }

    .btn-outline-theme {
        width: auto;
        display: flex;
        align-items: center;
    }
}

/* Update button styles */
.btn-outline-theme {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Update responsive styles */
@media (max-width: 992px) {
    .filters-container {
        flex-direction: column;
        gap: 15px;
    }

    .search-side {
        flex: 0 0 100%;
        max-width: 100%;
    }

    .filters-side {
        width: 100%;
    }

    .filters-group {
        flex-wrap: wrap;
        justify-content: center;
        gap: 15px;
    }

    .filter-item {
        flex: 0 0 auto;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .dropdown {
        width: 100%;
    }

    .btn-outline-theme {
        width: auto;
        min-width: 200px;
        justify-content: center;
    }

    .date-range-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    }

    .date-range-container .btn-outline-theme {
        width: auto;
        min-width: 200px;
    }
}

@media (max-width: 576px) {
    .filters-group {
        flex-direction: column;
        align-items: center;
        width: 100%;
    }

    .filter-item {
        width: 100%;
        max-width: 300px;
        margin: 5px 0;
    }

    .btn-outline-theme {
        width: 100%;
        justify-content: center;
    }

    .dropdown-menu {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
    }

    .date-range-container {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
    }

    .date-range-container .btn-outline-theme {
        width: 100%;
    }

    .date-input {
        width: 100%;
    }
}

/* Add these styles for action buttons */
.form-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

@media (max-width: 992px) {
    .form-actions {
        justify-content: center;
    }

    .form-actions .btn {
        min-width: 200px;
    }
}

@media (max-width: 576px) {
    .form-actions {
        flex-direction: column;
        max-width: 300px;
        margin: 0 auto;
        width: 100%;
    }

    .form-actions .btn {
        width: 100%;
    }
}
</style>