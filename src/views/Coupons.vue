<script>
import { db, storage } from '../firebase/init';
import { ref as dbRef, push, update, get, set, remove, query, orderByChild, equalTo, child } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import SearchInput from '@/components/app/SearchInput.vue';
import moment from 'moment';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import datepicker from 'vue3-datepicker';
import 'vue-datepicker-next/index.css';
import { Modal } from 'bootstrap';
import { useUserStore } from "@/stores/user-role";

export default {
    components: {
        SearchInput,
        datepicker
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
            showClientsWithRequests: false,
            selectedRequestsClient: {},

            // Fetching data
            clients: [],
            selectedClients: [],
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
            assignedCount: null,

            selectedCouponDetails: [],
            allAppliedCoupons: [],
            filteredAppliedCoupons: [],
            filterByDate: false,
            filterByAffiliate: false,
            startDate: null,
            endDate: null,

            isSubmitting: false,
            loading: false,
            currentPage: 1,
            itemsPerPage: 6,
            clientPreferences: {},
            clientsModalData: [],
            requestsModalData: '',
            modalTitle: '',
            showRequestsColumn: false,
            sortField: 'firstName',
            sortOrder: 'asc',
        }
    },
    watch: {
        selectedCouponOption(newOption) {
            this.clearData(newOption);
        },
        filterByDate(newValue) {
            if (!newValue) {
                this.clearDateFilter();
            }
        },
        filterByAffiliate(newValue) {
            if (!newValue) {
                this.clearAffiliateFilter();
            }
        },
    },
    computed: {
        filteredCoupons() {
            let filteredCoupons = this.coupons;

            // Filter for payable-only coupons if `option3` is selected in `selectedCouponOption`
            if (this.selectedCouponOption === 'option3') {
                filteredCoupons = filteredCoupons.filter(coupon => coupon.onlyInStore === true);
            }

            // Apply filtering based on the `selectedFilterOption` (for non-applied coupons)
            switch (this.selectedFilterOption) {
                case 'option1':
                    // No additional filtering required as this case shows all coupons
                    break;
                case 'option2':
                    // Show paid coupons
                    filteredCoupons = filteredCoupons.filter(coupon => coupon.applied === true && coupon.isPaid === true);
                    break;
                case 'option3':
                    // Show unpaid coupons
                    filteredCoupons = filteredCoupons.filter(coupon => coupon.applied === true && coupon.isPaid === false);
                    break;
                default:
                    break;
            }

            // Apply search query filter
            if (this.searchCoupon) {
                const searchQuery = this.searchCoupon.toLowerCase();
                filteredCoupons = filteredCoupons.filter(coupon =>
                    coupon.name.toLowerCase().includes(searchQuery) ||
                    coupon.couponCode.toLowerCase().includes(searchQuery)
                );
            }

            return filteredCoupons;
        },
        paginatedFilteredCoupons() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.filteredCoupons.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.filteredCoupons.length / this.itemsPerPage);
        },
        currentPageName() {
            return this.$route.name;
        },
        allSelected() {
            // Check if the number of selected clients matches the total number of clients
            return this.selectedClients.length === this.clientsModalData.length && this.clientsModalData.length > 0;
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
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },
        toggleSelectAll(event) {
            const isChecked = event.target.checked;
            this.selectedClients = isChecked ? this.clientsModalData.map(client => client.id) : [];
        },

        //Fetch data
        async fetchClients() {
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const snapshot = await get(clientRef);

                if (snapshot.exists()) {
                    const users = snapshot.val();

                    this.clients = Object.keys(users).map(key => ({
                        id: key,
                        ...users[key]
                    }));

                    this.clientPreferences = {};

                    for (const client of this.clients) {
                        // Initialize the coupons array for each client
                        this.clientPreferences[client.id] = {};

                        // Fetch preferences for the client
                        const preferences = await this.fetchClientPreferences(client.id);

                        if (preferences) {
                            this.clientPreferences[client.id] = preferences;
                        }
                    }
                } else {
                    this.clients = [];  // No clients found
                    this.clientPreferences = {}; // Reset preferences
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.clients = [];
                this.clientPreferences = {};
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
                const couponsRef = dbRef(db, `Users/${this.userId}/appliedCoupons`);
                const couponsSnapshot = await get(couponsRef);

                if (couponsSnapshot.exists()) {
                    const couponsData = couponsSnapshot.val();

                    // Object.keys(couponsData).flatMap(couponId =>
                    //     Object.keys(couponsData[couponId]).map(async (redemptionId) => {
                    //     const couponDetails = couponsData[couponId][redemptionId];
                    //     const clientName = await this.fetchClientName(couponDetails.client_id); // Fetch client's name

                    //     return {
                    //         couponId,  // Coupon reference
                    //         couponCode: couponDetails.couponCode,
                    //         clientId: couponDetails.client_id,
                    //         appliedDate: couponDetails.appliedDate,
                    //         clientName: clientName,
                    //     };
                    // })

                    // Fetch details for each applied coupon
                    const appliedCoupons = await Promise.all(
                        Object.keys(couponsData).flatMap(couponId =>
                            Object.keys(couponsData[couponId]).map(async (clientId) => {
                                const couponDetails = couponsData[couponId][clientId];
                                const clientName = await this.fetchClientName(clientId); // Fetch client's name

                                // Fetch coupon details
                                const couponRef = dbRef(db, `Coupons/${couponId}`);
                                const couponSnapshot = await get(couponRef);

                                if (couponSnapshot.exists()) {
                                    const coupon = couponSnapshot.val();

                                    return {
                                        id: couponId,  // Coupon reference
                                        ...coupon,
                                        appliedDate: couponDetails.appliedDate,
                                        clientName: clientName,
                                    };
                                } else {
                                    console.warn(`Coupon ${couponId} details not found`);
                                    return null;
                                }
                            })
                        ));
                    this.appliedCoupons = appliedCoupons.filter(gc => gc !== null);
                } else {
                    console.log('No applied coupons found for the user');
                    return [];
                }
            } catch (error) {
                console.error('Error fetching applied coupons:', error);
                return [];
            }
        },
        async loadCoupons() {
            try {
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
                        this.coupons = Object.entries(snapshot.val()).map(([id, coupon]) => {
                            coupon.id = id;
                            if (coupon.expiration) {
                                coupon.expiration = new Date(coupon.expiration).toISOString().split('T')[0]; // Format to YYYY-MM-DD
                            }
                            return coupon;
                        });
                    } else {
                        console.log('No coupons available');
                        this.coupons = [];
                    }
                }
            } catch (error) {
                console.error('Error loading coupons:', error);
                this.coupons = [];
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

            console.log('Selected client:', client.id);
            this.searchClient = '';
            this.searchClientResults = [];
        },
        // Method for selecting multiple clients (applies to button "Asignar Cupon a Seleccionados")
        selectMultipleClientsForCoupon() {
            if (this.selectedClients.length > 0) {
                console.log('Selected clients:', this.selectedClients);

                // Hide the modal after selecting multiple clients
                const modal = Modal.getOrCreateInstance(document.getElementById('clientsModal'));
                modal.hide();
            } else {
                console.warn('No clients selected');
            }
        },
        deselectClient(clientId) {
            this.selectedClients = this.selectedClients.filter(id => id !== clientId);
            console.log('DeSelected client: ', clientId);
        },
        selectCoupon(coupon) {
            this.selectedCoupon = coupon;
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
        enableEditMode(coupon) {
            this.editingCoupon = { ...coupon, expiration: new Date(coupon.expiration) }; // Ensure expiration is a Date object
        },
        async updateCoupon() {
            try {
                if (!this.editingCoupon) return;

                const couponRef = dbRef(db, `Coupons/${this.editingCoupon.id}`);
                const updateData = {
                    name: this.editingCoupon.name,
                    couponCode: this.editingCoupon.couponCode,
                    balance: this.editingCoupon.balance,
                    expiration: this.editingCoupon.expiration,
                    redeemCount: this.editingCoupon.redeemCount,
                    onlyInStore: this.editingCoupon.onlyInStore,
                    type: this.editingCoupon.type
                };
                await update(couponRef, updateData);

                // Find the index of the coupon and update it in the local state
                const index = this.coupons.findIndex(c => c.id === this.editingCoupon.id);
                if (index !== -1) {
                    // Update the coupon in the local array
                    this.coupons[index] = { ...this.editingCoupon };
                }

                // Show success message
                this.showToast('Cupon actualizado con éxito!');

                // Clear the editingCoupon state after saving
                this.editingCoupon = null;
            } catch (error) {
                console.error('Error saving coupon:', error);
                this.showToast('Error al actualizar el cupon. Inténtalo de nuevo.');
            }
        },
        cancelEdit() {
            this.editingCoupon = null; // Exit edit mode without saving
        },
        async updateCouponStatus(coupon) {
            try {
                const couponRef = dbRef(db, `Coupons/${coupon.id}`);
                await update(couponRef, { status: coupon.status });

                this.showToast('Estado del cupon actualizado con exito!');
            } catch (error) {
                console.error('Error updating coupon status:', error);
                alert('La actualización del estado del cupon falló.');
            }
        },
        async updateCouponIsPaid(coupon) {
            try {
                const couponRef = dbRef(db, `Coupons/${coupon.id}`);
                await update(couponRef, { isPaid: coupon.isPaid });

                this.showToast('Cupon pagado!');
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

                this.showToast('Cupon creado con exito!');

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
        async assignExistingCoupon() {
            if (this.selectedClients.length === 0) {
                alert('Por favor seleccione al menos un cliente antes de asignar un cupon.');
                return;
            }

            try {
                const today = new Date();
                const expiration = new Date(this.selectedCoupon.expiration);
                const localExpiration = new Date(expiration.getTime() + expiration.getTimezoneOffset() * 60000);
                const couponId = this.selectedCoupon.id;

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

                for (const clientId of this.selectedClients) {
                    // Assign existing coupon
                    const userCouponRef = dbRef(db, `Users/${clientId}/coupons/${couponId}`);
                    await set(userCouponRef, couponId);
                }

                this.showToast('Cupones asignados con exito!');

                // Reset selection if needed
                this.selectedCoupon = null;
                this.selectedClients = [];
                this.searchClient = '';
            } catch (error) {
                console.error('Error assigning coupons:', error);
                alert('La asignacion de cupones fallo.');
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
            this.assignedCount = couponAssignedCount;
            console.log('El cupon: ', couponId, 'Lo tienen asignado: ', couponAssignedCount, 'clientes, sin usar.');
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
                        this.showToast('Cupon asignado con exito!');
                    }
                } else {
                    this.showToast('Cupon creado con exito!');
                }

                // Reset form fields and UI
                this.resetForm();
                this.loadCoupons();
            } catch (error) {
                console.error('Error creating and assigning coupon:', error);
                alert('La creación o asignación de cupón falló.');
            }
        },

        //Delete coupons
        async deleteCoupon(couponId, index) {
            if (confirm("¿Desea borrar este cupon?")) {
                try {
                    const couponRef = dbRef(db, `Coupons/${couponId}`);
                    await remove(couponRef);

                    // Remove the coupon from the local state
                    this.filteredCoupons.splice(index, 1);

                    Toastify({
                        text: 'Cupon eliminado con éxito!',
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
                    console.error('Error deleting coupon:', error);
                    alert('La eliminación del cupon falló.');
                }
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

        //Others
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },
        openImageModal(imageUrl) {
            this.modalImageUrl = imageUrl;
            new Modal(document.getElementById('qrModal')).show();
        },
        openClientsModal(type) {
            if (type === 'withoutCoupons') {
                // Data for clients without coupons
                this.clientsModalData = this.clients.filter((client) => !client.coupons).slice();
                this.modalTitle = 'Clientes sin Cupones';
                this.showRequestsColumn = false; // Hide 'Solicitud' column
            } else if (type === 'withRequests') {
                // Data for clients with coupon requests
                this.clientsModalData = this.clients.filter((client) => client.coupon_requests).slice();
                this.modalTitle = 'Clientes con Solicitudes';
                this.showRequestsColumn = true; // Show 'Solicitud' column
            }

            // Show the modal
            new Modal(document.getElementById('clientsModal')).show();
        },
        sortClients(field) {
            if (this.sortField === field) {
                // If already sorted by this field, toggle sort order
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                // Otherwise, set the field and default to ascending order
                this.sortField = field;
                this.sortOrder = 'asc';
            }

            // Sort the clientsModalData array
            this.clientsModalData.sort((a, b) => {
                let fieldA = a[field].toString().toLowerCase();
                let fieldB = b[field].toString().toLowerCase();

                if (this.sortOrder === 'asc') {
                    return fieldA > fieldB ? 1 : fieldA < fieldB ? -1 : 0;
                } else {
                    return fieldA < fieldB ? 1 : fieldA > fieldB ? -1 : 0;
                }
            });
        },
        showCouponRequest(client) {
            if (!client.coupon_requests) {
                console.error("No coupon requests found for this client");
                return;
            }
            console.log(client);
            // Convert coupon_requests object into an array with the keys
            const requests = Object.keys(client.coupon_requests).map(key => ({
                id: key,
                ...client.coupon_requests[key]
            }));

            this.selectedRequestsClient = { ...client, coupon_requests: requests };
            console.log(this.selectedRequestsClient);

            const modal = Modal.getOrCreateInstance(document.getElementById('couponRequestModal'));
            modal.show();
        },
        getAffiliateNameById(affiliateId) {
            const affiliate = this.affiliates.find(affiliate => affiliate.id === affiliateId);
            // If the affiliate is found, return the companyName, otherwise return 'Unknown Affiliate'
            return affiliate ? affiliate.companyName : 'Unknown Affiliate';
        },

        getCategoryNameById(categoryId) {
            const category = this.categories.find(category => category.id === categoryId);
            // If the category is found, return the name, otherwise return 'Unknown Category'
            return category ? category.name : 'Unknown Category';
        },
        async applyCoupon() {
            const client = this.selectedClient;
            const coupons = this.allCoupons;
            let selectedCoupon = null;

            // Alert if the coupon code was not entered
            if (!this.appliedCode) {
                alert('Primero ingrese un código de cupón válido.');
                console.log('No coupon code entered');
                this.loading = false;
                return;
            }

            // Find the coupon by its code
            coupons.forEach(coupon => {
                if (coupon.couponCode === this.appliedCode) {
                    selectedCoupon = coupon;
                    console.log(selectedCoupon)
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
                });

                // Remove the coupon from the client's 'coupons' object
                await this.removeCouponFromClients(selectedCoupon.id, client.id);

                // Check if the coupon was successfully added to 'appliedCoupons' and removed from the client
                const checkAppliedCoupon = await get(newAppliedCouponRef);
                if (checkAppliedCoupon.exists()) {
                    this.showToast('Cupón aplicado con éxito.');
                } else {
                    console.error('Failed to apply coupon');
                    alert('Error al aplicar el cupón');
                }
                // Clear the input after applying
                this.appliedCode = '';
                this.selectedClient = '';

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
        setActiveAffiliate(index) {
            // Set all affiliates to inactive
            this.affiliates.forEach(affiliate => {
                affiliate.active = false;
            });
            // Set the clicked category to active
            this.affiliates[index].active = true;

            // Filter the items based on the active category
            this.filterCouponsByAffiliates(this.affiliates[index].id);
        },
        async filterCouponsByAffiliates(affiliateId) {
            try {
                // Reference to the applied coupons for the affiliate
                const couponsRef = dbRef(db, `Users/${affiliateId}/appliedCoupons`);
                const couponsSnapshot = await get(couponsRef);

                if (couponsSnapshot.exists()) {
                    const couponsData = couponsSnapshot.val();

                    // Fetch applied coupon details and reference coupon data from the Coupons table
                    const appliedCoupons = await Promise.all(Object.keys(couponsData).flatMap(couponId =>
                        Object.keys(couponsData[couponId]).map(async (redemptionId) => {
                            const couponDetails = couponsData[couponId][redemptionId];
                            const clientName = await this.fetchClientName(couponDetails.client_id); // Fetch client's name

                            // Fetch additional coupon details from the Coupons table
                            const couponRef = dbRef(db, `Coupons/${couponId}`);
                            const couponSnapshot = await get(couponRef);

                            let fullCouponData = {};
                            if (couponSnapshot.exists()) {
                                fullCouponData = couponSnapshot.val();
                            }

                            return {
                                couponId,  // Coupon reference
                                clientId: couponDetails.client_id,
                                appliedDate: couponDetails.appliedDate,
                                clientName: clientName,
                                ...fullCouponData // Merge full coupon data from Coupons table
                            };
                        })
                    ));

                    // Set the filtered applied coupons to the result
                    this.filteredAppliedCoupons = appliedCoupons;
                    console.log(this.filteredAppliedCoupons);
                } else {
                    console.log('No applied coupons found for the affiliate');
                    this.filteredAppliedCoupons = [];
                }
            } catch (error) {
                console.error('Error fetching applied coupons:', error);
                this.filteredAppliedCoupons = [];
            }
        },
        filterCouponsByDate() {
            let appliedCoupons;

            // If either date is missing, return all coupons
            if (!this.startDate || !this.endDate) {
                this.filteredAppliedCoupons = this.allAppliedCoupons;
                return;
            }

            // Set start and end date
            const start = new Date(this.startDate);
            const localStart = new Date(start.getTime() + start.getTimezoneOffset() * 60000);
            localStart.setHours(0, 0, 0, 0);
            console.log(localStart)

            const end = new Date(this.endDate);
            const localEnd = new Date(end.getTime() + end.getTimezoneOffset() * 60000);
            localEnd.setHours(23, 59, 59, 999); // Include the entire end date
            console.log(localEnd)

            // Filter coupons based on the appliedDate
            appliedCoupons = this.allAppliedCoupons.filter(coupon => {
                const couponDate = new Date(coupon.appliedDate); // Convert ISOString to Date object
                return couponDate >= localStart && couponDate <= localEnd;
            });

            // Assign the filtered coupons
            this.filteredAppliedCoupons = appliedCoupons;
            console.log(this.filteredAppliedCoupons);
        },
        clearDateFilter() {
            this.startDate = null;
            this.endDate = null;
            this.filteredAppliedCoupons = this.allAppliedCoupons;
        },
        clearAffiliateFilter() {
            this.affiliates.forEach((affiliate) => {
                affiliate.active = false;
            });
            this.filteredAppliedCoupons = this.allAppliedCoupons;
        },
        async fetchClientData(clientId) {
            try {
                const clientRef = dbRef(db, `Users/${clientId}`);
                const clientSnapshot = await get(clientRef);
                return clientSnapshot.exists() ? clientSnapshot.val() : null;
            } catch (error) {
                console.error("Error fetching client data:", error);
                return null;
            }
        },

        // Fetch client preferences
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

    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;

        // Set loading to false initially
        this.loading = false;

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
                const clientData = await this.fetchClientData(clientId);
                if (clientData) {
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
    <h2 class="mb-4 text-center">CUPONES</h2>
    <!-- Admin view -->
    <div v-if="this.role === 'admin'" class="container">

        <div id="assign-coupons" class="mb-5">
            <div class="card shadow-lg">
                <div class="card-body">

                    <!-- Options -->
                    <div class="mb-3 form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio1"
                            value="option1" v-model="selectedCouponOption" @click="loadCoupons()">
                        <label class="form-check-label" for="inlineRadio1">Asignar cupón existente</label>
                    </div>
                    <div class="mb-3 form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio2"
                            value="option2" v-model="selectedCouponOption">
                        <label class="form-check-label" for="inlineRadio2">Registrar cupón nuevo</label>
                    </div>
                    <div class="mb-3 form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio3"
                            value="option3" v-model="selectedCouponOption">
                        <label class="form-check-label" for="inlineRadio3">Administrar Pago de cupones</label>
                    </div>
                    <div class="mb-3 form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio4"
                            value="option4" v-model="selectedCouponOption" @click="fetchAllAppliedCoupons()">
                        <label class="form-check-label" for="inlineRadio4">Ver cupones aplicados</label>
                    </div>

                    <div class="text-center" v-if="loading">
                        <p>Cargando...</p>
                        <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                            aria-hidden="true"></span>
                    </div>
                    <div v-else>
                        <!-- Option 1 = Assign Existing Coupon Section -->
                        <div v-if="selectedCouponOption === 'option1'" class="mt-3">

                            <hr>

                            <!-- CLIENT TO ASSIGN -->
                            <div class="container">
                                <h5 class="text-center text-uppercase mt-4 mb-4">Seleccione un Cliente para asignar
                                    cupón
                                </h5>
                                <!-- Searching input -->
                                <SearchInput v-model="searchClient" :results="searchClientResults"
                                    placeholder="Busque un cliente por su cédula..." @input="searchClientsForCoupon"
                                    @select="selectClientForCoupon" class="form-control mb-3" />

                                <!-- Display selected client information -->
                                <p>{{ selectedClients.length }} Clientes seleccionados</p>
                                <div v-if="selectedClients.length > 0 && !showClientsWithRequests"
                                    class="border rounded">
                                    <div class="row mb-2" v-for="clientId in selectedClients" :key="clientId">
                                        <div class="col-12 col-md-6">
                                            <h5><strong>Información del cliente seleccionado:</strong></h5>
                                            <div class="card shadow-sm">
                                                <div class="card-header">
                                                    <!-- Deselect button -->
                                                    <button class="btn btn-sm btn-danger"
                                                        @click="deselectClient(clientId)">
                                                        <i class="fa-solid fa-times"></i>
                                                    </button>
                                                    <h5 class="card-title text-center text-black">
                                                        {{ getClientFullName(clientId) }}
                                                    </h5>

                                                    <h6 class="text-center text-black">V-{{
                                                        getClientIdentification(clientId) }}</h6>
                                                </div>
                                                <div class="card-body">
                                                    <h5><strong>Preferencias para cupones:</strong></h5>
                                                    <div
                                                        v-if="Object.keys(clientPreferences[clientId] || {}).length > 0">

                                                        <div v-for="(pref, categoryId) in clientPreferences[clientId]"
                                                            :key="categoryId">
                                                            <div class="card shadow-sm">
                                                                <div class="card-header">
                                                                    <h5 class="card-title text-center text-black">
                                                                        {{ pref.category }}</h5>
                                                                </div>
                                                                <div class="card-body">
                                                                    <ul>
                                                                        <li v-for="(subcategory, index) in pref.subcategories"
                                                                            :key="index">
                                                                            {{ subcategory }}</li>
                                                                    </ul>
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>
                                                    <p v-else class="text-center">El cliente no ha especificado sus
                                                        preferencias.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Trigger Modal -->
                                <div v-if="!selectedClient" class="row justify-content-center">
                                    <div class="col d-flex justify-content-center align-items-center">
                                        <button class="btn btn-theme"
                                            @click.prevent="openClientsModal('withoutCoupons')" style="width: auto;">
                                            Mostrar Clientes sin cupones
                                        </button>
                                    </div>
                                    <div class="col d-flex justify-content-center align-items-center">
                                        <button class="btn btn-theme" @click.prevent="openClientsModal('withRequests')"
                                            style="width: auto;">
                                            Mostrar Clientes con Solicitudes
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <hr>

                            <!-- COUPON TO ASSIGN -->
                            <div class="container">
                                <h5 class="text-center text-uppercase mt-4 mb-4">Seleccione un cupón existente</h5>
                                <p v-if="coupons.length === 0">No hay cupones registrados.</p>

                                <!-- Search Bar to Filter Coupons -->
                                <div class="mb-3">
                                    <input type="text" class="form-control" v-model="searchCoupon"
                                        placeholder="Buscar cupón por nombre o código..." />
                                </div>

                                <!-- Coupon List -->
                                <div class="row">
                                    <div class="col-12 col-md-6 col-lg-4 mb-3"
                                        v-for="(coupon, index) in paginatedFilteredCoupons" :key="coupon.id">
                                        <div class="card h-100" @click="selectCoupon(coupon), queryCoupons(coupon.id)"
                                            :class="{ 'selected': coupon === selectedCoupon }">
                                            <div class="card-body position-relative d-flex flex-column">
                                                <!-- Badge for status -->
                                                <span class="badge position-absolute top-0 start-100 translate-middle"
                                                    :class="coupon.status ? 'bg-success' : 'bg-danger'">
                                                    {{ coupon.status ? 'Activo' : 'Expirado' }}
                                                </span>

                                                <div class="d-flex justify-content-between mb-3">
                                                    <h6 class="card-title mb-0 flex-grow-1">
                                                        <template
                                                            v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                            <input v-model="editingCoupon.name" class="form-control" />
                                                        </template>
                                                        <template v-else>
                                                            {{ coupon.name }}
                                                        </template>
                                                    </h6>

                                                    <!-- Buttons -->
                                                    <div class="btn-group ms-2" role="group">
                                                        <button class="btn btn-transparent btn-sm me-1"
                                                            v-if="editingCoupon && editingCoupon.id === coupon.id"
                                                            @click.prevent="updateCoupon">
                                                            <i class="fa-solid fa-save text-success"></i>
                                                        </button>
                                                        <button class="btn btn-transparent btn-sm me-1"
                                                            v-if="editingCoupon && editingCoupon.id === coupon.id"
                                                            @click.prevent="cancelEdit">
                                                            <i class="fa-solid fa-times text-secondary"></i>
                                                        </button>
                                                        <button class="btn btn-transparent btn-sm me-1" v-else
                                                            @click.prevent="enableEditMode(coupon)">
                                                            <i class="fa-solid fa-pencil text-primary"></i>
                                                        </button>
                                                        <button class="btn btn-transparent btn-sm me-1"
                                                            @click.prevent="deleteCoupon(coupon.id, index)">
                                                            <i class="fa-solid fa-trash text-danger"></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                <!-- Image Display -->
                                                <div class="img-container text-center mb-3">
                                                    <img :src="coupon.qrFileUrl" alt="QR Code"
                                                        class="img-fluid img-thumbnail"
                                                        style="max-height: 150px; width: auto;">
                                                </div>

                                                <!-- Coupon Code -->
                                                <p class="card-text"><strong>Código: </strong>
                                                    <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                        <input v-model="editingCoupon.couponCode"
                                                            class="form-control" />
                                                    </template>
                                                    <template v-else>
                                                        {{ coupon.couponCode }}
                                                    </template>
                                                </p>

                                                <!-- Bootstrap Accordion for Coupon Details -->
                                                <div class="accordion mt-2" :id="'couponAccordion' + index">
                                                    <div class="accordion-item">
                                                        <h2 class="accordion-header" :id="'heading' + index">
                                                            <button class="accordion-button" type="button"
                                                                data-bs-toggle="collapse"
                                                                :data-bs-target="'#collapseDetails' + index"
                                                                aria-expanded="true"
                                                                :aria-controls="'collapseDetails' + index">
                                                                Ver Detalles
                                                            </button>
                                                        </h2>
                                                        <div :id="'collapseDetails' + index"
                                                            class="accordion-collapse collapse"
                                                            :class="{ show: coupon === selectedCoupon }"
                                                            :aria-labelledby="'heading' + index"
                                                            :data-bs-parent="'#couponAccordion' + index">
                                                            <div class="accordion-body">
                                                                <!-- Cantidad de clientes que tienen el cupon asignado -->
                                                                <!-- <p class="card-text">
                                                                    <strong>Clientes con este cupon: </strong>
                                                                    {{ assignedCount ? assignedCount : 0 }}
                                                                </p> -->
                                                                <!-- Cantidad de veces que ha sido usado -->
                                                                <p class="card-text">
                                                                    <strong>Veces canjeado: </strong>
                                                                    {{ coupon.timesUsed ? coupon.timesUsed : 0 }}
                                                                </p>

                                                                <!-- Conditional Balance / Percentage -->
                                                                <p class="card-text d-flex align-items-center">
                                                                    <!-- Coupon Type (Dropdown) -->
                                                                    <template
                                                                        v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                                        <select v-model="editingCoupon.type"
                                                                            class="form-control me-2" id="editType"
                                                                            style="width: auto;">
                                                                            <option value="saldo">Saldo</option>
                                                                            <option value="porcentaje">Porcentaje
                                                                            </option>
                                                                        </select>
                                                                    </template>
                                                                    <template v-else>
                                                                        <strong class="me-2">
                                                                            {{ coupon.type === 'saldo' ? 'Saldo: $' :
                                                                                'Porcentaje: %' }}
                                                                        </strong>
                                                                    </template>

                                                                    <!-- Coupon Balance (Input) -->
                                                                    <template
                                                                        v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                                        <input v-model="editingCoupon.balance"
                                                                            class="form-control" id="editAmount" />
                                                                    </template>
                                                                    <template v-else>
                                                                        {{ coupon.balance }}
                                                                    </template>
                                                                </p>

                                                                <!-- Redeem Count -->
                                                                <p class="card-text"><strong>Número de usos: </strong>
                                                                    <template
                                                                        v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                                        <input
                                                                            v-model.number="editingCoupon.redeemCount"
                                                                            type="number" class="form-control" />
                                                                    </template>
                                                                    <template v-else>
                                                                        {{ coupon.redeemCount }}
                                                                    </template>
                                                                </p>

                                                                <!-- Cupones pagables por RoseApp -->
                                                                <p class="card-text"><strong>Cupon pagable: </strong>
                                                                    <template
                                                                        v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                                        <input type="checkbox"
                                                                            v-model="editingCoupon.onlyInStore" />
                                                                    </template>
                                                                    <template v-else>
                                                                        <span>{{ coupon.onlyInStore ? 'Sí' : 'No'
                                                                            }}</span>
                                                                    </template>
                                                                </p>

                                                                <!-- Expiration Date -->
                                                                <p class="card-text"><strong>Expiración: </strong>
                                                                    <template
                                                                        v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                                        <input type="date"
                                                                            v-model="editingCoupon.expiration"
                                                                            class="form-control" />
                                                                    </template>
                                                                    <template v-else>{{ formatDate(coupon.expiration)
                                                                        }}</template>
                                                                </p>

                                                                <!-- Status Switch -->
                                                                <div class="d-flex align-items-center">
                                                                    <p class="card-text mb-0 me-2">
                                                                        <strong>Estado:</strong>
                                                                    </p>
                                                                    <div class="form-check form-switch">
                                                                        <input class="form-check-input" type="checkbox"
                                                                            v-bind:id="'coupon' + index"
                                                                            v-model="coupon.status"
                                                                            @change="updateCouponStatus(coupon)">
                                                                        <label class="form-check-label"
                                                                            v-bind:for="'coupon' + index"></label>
                                                                    </div>
                                                                </div>
                                                            </div>
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

                            <!-- ASSIGN BUTTON -->
                            <button @click="assignExistingCoupon" class="btn btn-theme mt-3">Asignar cupón
                                existente</button>

                        </div>
                    </div>

                    <!-- Option 2 = Create/Assign New Coupon Section -->
                    <div v-if="selectedCouponOption === 'option2'" class="mt-3">

                        <hr>

                        <h5 class="text-center text-uppercase mb-4">Crear cupón</h5>
                        <div class="row mb-3">
                            <div class="col-12 col-md-6 col-lg-3 mb-3">
                                <label for="couponName" class="form-label">Nombre</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="couponName" v-model="couponName">
                                </div>
                            </div>
                            <div class="col-12 col-md-6 col-lg-3 mb-3">
                                <label for="couponCode" class="form-label">Código</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="couponCode" v-model="couponCode">
                                </div>
                            </div>
                            <div class="col-12 col-md-6 col-lg-3 mb-3">
                                <label class="form-label">Tipo de cupón <span class="text-danger">*</span></label>
                                <select v-model="couponType" class="form-select text-white"
                                    aria-label="Default select example">
                                    <option class=" text-white" value="saldo">Saldo</option>
                                    <option class=" text-white" value="porcentaje">Porcentaje</option>
                                </select>
                            </div>
                            <div class="col-12 col-md-6 col-lg-3 mb-3">
                                <label for="couponAmount" class="form-label">
                                    {{ couponType === 'saldo' ? 'Saldo del cupón' : 'Porcentaje del cupón' }}
                                </label>
                                <div class="input-group">
                                    <span class="input-group-text">
                                        {{ couponType === 'saldo' ? '$' : '%' }}
                                    </span>
                                    <input type="number" class="form-control" id="couponAmount" v-model="couponAmount">
                                </div>
                            </div>
                            <div class="col-12 col-md-6 col-lg-3 mb-3">
                                <label for="redeemCount" class="form-label">Cantidad de Usos</label>
                                <div class="input-group">
                                    <input type="number" class="form-control" id="redeemCount" v-model="redeemCount">
                                </div>
                            </div>
                            <div class="col-12 col-md-6 col-lg-3 mb-3">
                                <label for="couponExp" class="form-label">Fecha de expiración</label>
                                <div>
                                    <input type="date" v-model="couponExp" class="form-control" />
                                </div>
                            </div>
                            <div class="mb-3 mt-3 form-check">
                                <input type="checkbox" class="form-check-input" id="storeCheckbox"
                                    v-model="onlyInStore">
                                <label class="form-check-label" for="storeCheckbox">Cupón pagable</label>
                            </div>
                        </div>
                        <label for="qrFile" class="form-label">Cargar QR</label>
                        <input type="file" id="qrFile" class="form-control" @change="handleFileUpload">
                        <div v-if="qrPreview" class="mt-2">
                            <img :src="qrPreview" class="img-thumbnail" alt="coupon-preview" style="max-height: 200px;">
                        </div>
                        <button v-if="!assignTheCoupon" @click="createCoupon" class="btn btn-primary mt-3">Crear
                            cupón</button>
                        <div class="mb-3 mt-3 form-check">
                            <input type="checkbox" class="form-check-input" id="assignCheckbox"
                                v-model="assignTheCoupon">
                            <label class="form-check-label" for="assignCheckbox">Asignar cupón</label>
                        </div>
                        <!-- Searching input -->
                        <SearchInput v-if="assignTheCoupon" v-model="searchClient" :results="searchClientResults"
                            placeholder="Busque un cliente por su cédula..." @input="searchClientsForCoupon"
                            @select="selectClientForCoupon" class="form-control mt-3 mb-3" />

                        <p>{{ selectedClients.length }} Clientes seleccionados</p>

                        <!-- Display selected client information -->
                        <div v-if="selectedClients.length > 0 && assignTheCoupon" class="mb-3 p-3 border rounded">
                            <div class="row mb-2" v-for="clientId in selectedClients" :key="clientId">
                                <div class="col-12 col-md-6">
                                    <h5><strong>Información del cliente seleccionado:</strong></h5>
                                    <div class="card shadow-sm">
                                        <div class="card-header">
                                            <!-- Deselect button -->
                                            <button class="btn btn-sm btn-danger" @click="deselectClient(clientId)">
                                                <i class="fa-solid fa-times"></i>
                                            </button>
                                            <h5 class="card-title text-center text-black">
                                                {{ getClientFullName(clientId) }}
                                            </h5>

                                            <h6 class="text-center text-black">V-{{
                                                getClientIdentification(clientId) }}</h6>
                                        </div>
                                        <div class="card-body">
                                            <h5><strong>Preferencias para cupones:</strong></h5>
                                            <div v-if="Object.keys(clientPreferences[clientId]).length > 0">

                                                <div v-for="(pref, categoryId) in clientPreferences[clientId]"
                                                    :key="categoryId">
                                                    <div class="card shadow-sm">
                                                        <div class="card-header">
                                                            <h5 class="card-title text-center text-black">
                                                                {{ pref.category }}</h5>
                                                        </div>
                                                        <div class="card-body">
                                                            <ul>
                                                                <li v-for="(subcategory, index) in pref.subcategories"
                                                                    :key="index">
                                                                    {{ subcategory }}</li>
                                                            </ul>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                            <p v-else class="text-center">El cliente no ha especificado sus
                                                preferencias.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button v-if="assignTheCoupon" @click="createAndAssignCoupon" class="btn btn-theme mt-3">Crear
                            y Asignar
                            cupón</button>
                    </div>

                    <!-- Option 3 = Manage Coupon payments -->
                    <div v-if="selectedCouponOption === 'option3'" class="mt-3">

                        <hr>

                        <h5 class="text-center text-uppercase mb-4">Administrar Cupones</h5>
                        <p v-if="coupons.length === 0">No hay cupones registrados.</p>

                        <!-- Search Bar to Filter Coupons -->
                        <div class="mb-3">
                            <input type="text" class="form-control" v-model="searchCoupon"
                                placeholder="Buscar cupón por nombre o código..." />
                        </div>

                        <!-- Filters by option -->
                        <div class="mb-3 form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="filterOptions" id="allCoupons"
                                value="option1" v-model="selectedFilterOption">
                            <label class="form-check-label" for="allCoupons">Todos</label>
                        </div>
                        <div class="mb-3 form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="filterOptions" id="paidCoupons"
                                value="option2" v-model="selectedFilterOption">
                            <label class="form-check-label" for="paidCoupons">Pagados</label>
                        </div>
                        <div class="mb-3 form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="filterOptions" id="notPaidCoupons"
                                value="option3" v-model="selectedFilterOption">
                            <label class="form-check-label" for="notPaidCoupons">Sin pagar</label>
                        </div>

                        <!-- Filters by date range -->
                        <div class="mb-3 form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="flexSwitchCheckDefault"
                                v-model="filterByDate">
                            <label class="form-check-label" for="flexSwitchCheckDefault">Filtrar por fecha</label>
                        </div>

                        <hr v-if="filterByDate">

                        <div v-if="filterByDate" class="justify-content-center" style="margin-bottom: 20px;">
                            <h5 class="mb-4 text-center">Filtrar por rango de fecha</h5>
                            <div class="row g-3 justify-content-center">
                                <!-- Start Date Picker -->
                                <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                                    <input type="date" v-model="startDate" class="form-control" />
                                </div>
                                <!-- End Date Picker -->
                                <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                                    <input type="date" v-model="endDate" class="form-control" />
                                </div>
                            </div>

                            <div class="d-flex justify-content-center mt-3">
                                <button type="button" class="btn btn-theme" style="width: 150px;"
                                    @click="clearDateFilter">
                                    Limpiar filtro
                                </button>
                            </div>
                        </div>

                        <hr v-if="filterByDate">

                        <div class="row">
                            <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="(coupon, index) in filteredCoupons"
                                :key="coupon.id">
                                <div class="card h-100">
                                    <div class="card-body position-relative">
                                        <!-- Badge for status -->
                                        <span class="badge position-absolute top-0 start-100 translate-middle"
                                            :class="coupon.status ? 'bg-success' : 'bg-danger'">
                                            {{ coupon.status ? 'Activo' : 'Expirado' }}
                                        </span>
                                        <!-- Badge for isPaid status -->
                                        <span class="badge position-absolute top-0 start-0 translate-middle"
                                            :class="coupon.isPaid ? 'bg-success' : 'bg-danger'">
                                            {{ coupon.isPaid ? 'Pagado' : 'Sin pagar' }}
                                        </span>

                                        <div class="d-flex justify-content-between mb-3">
                                            <h6 class="card-title mb-0">
                                                {{ coupon.name }}
                                            </h6>
                                        </div>

                                        <!-- Image Display -->
                                        <div class="img-container text-center mb-3">
                                            <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                                style="max-height: 150px;">
                                        </div>

                                        <div class="row">
                                            <div class="col">
                                                <!-- Coupon Code -->
                                                <p class="card-text"><strong>Código:</strong>
                                                    {{ coupon.couponCode }}
                                                </p>

                                                <!-- Bootstrap Accordion for Coupon Details -->
                                                <div class="accordion" :id="'couponAccordion' + index">
                                                    <div class="accordion-item">
                                                        <h2 class="accordion-header" :id="'heading' + index">
                                                            <button class="accordion-button" type="button"
                                                                data-bs-toggle="collapse"
                                                                :data-bs-target="'#collapseDetails' + index"
                                                                aria-expanded="true"
                                                                :aria-controls="'collapseDetails' + index">
                                                                Ver Detalles
                                                            </button>
                                                        </h2>
                                                        <div :id="'collapseDetails' + index"
                                                            class="accordion-collapse collapse"
                                                            :class="{ show: coupon === selectedCoupon }"
                                                            :aria-labelledby="'heading' + index"
                                                            :data-bs-parent="'#couponAccordion' + index">
                                                            <div class="accordion-body">
                                                                <!-- Conditional Balance / Percentage -->
                                                                <p class="card-text">
                                                                    <strong>{{ coupon.type === 'saldo' ? 'Saldo: $' :
                                                                        'Porcentaje: %' }}</strong>
                                                                    {{ coupon.balance }}
                                                                </p>

                                                                <!-- Redeem Count -->
                                                                <p class="card-text">
                                                                    <strong>Número de usos: </strong>
                                                                    {{ coupon.redeemCount }}
                                                                </p>

                                                                <!-- Store Only Coupon -->
                                                                <p class="card-text">
                                                                    <strong>Solo en tienda: </strong>
                                                                    <span>{{ coupon.onlyInStore ? 'Sí' : 'No' }}</span>
                                                                </p>

                                                                <!-- Expiration Date -->
                                                                <p class="card-text">
                                                                    <strong>Expiración: </strong>
                                                                    {{ formatDate(coupon.expiration) }}
                                                                </p>

                                                                <!-- Check paid to the store -->
                                                                <div class="d-flex align-items-center">
                                                                    <p class="card-text mb-0 me-2"><strong>Pagado al
                                                                            comercio: </strong></p>
                                                                    <div class="form-check form-switch">
                                                                        <input class="form-check-input" type="checkbox"
                                                                            v-bind:id="'couponPaid' + index"
                                                                            v-model="coupon.isPaid"
                                                                            @change="updateCouponIsPaid(coupon)">
                                                                        <label class="form-check-label"
                                                                            v-bind:for="'couponPaid' + index"></label>
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
                            </div>
                        </div>
                    </div>

                    <!-- Option 4 = Visualize applied coupons -->
                    <div v-if="selectedCouponOption === 'option4'" class="mt-3">

                        <hr>

                        <h5 class="text-center text-uppercase mb-4">Cupones Aplicados</h5>
                        <p v-if="coupons.length === 0">No hay cupones registrados.</p>

                        <!-- Search Bar to Filter Coupons -->
                        <!-- <div class="mb-3">
                            <input type="text" class="form-control" v-model="searchCoupon"
                                placeholder="Buscar cupón por nombre o código..." />
                        </div> -->

                        <hr>

                        <div class="row text-center">
                            <label class="mb-2" for="filters"><strong>Filtros</strong></label>
                        </div>

                        <!-- Filters OJO: CLEAR FILTER WHEN TOGGLED -->
                        <div class="justify-content-center" style="margin-bottom: 20px;">
                            <div class="row g-3 justify-content-center">
                                <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                                    <!-- Filters by date range -->
                                    <div class="mb-3 form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="flexSwitchCheckDefault"
                                            v-model="filterByDate" />
                                        <label class="form-check-label" for="flexSwitchCheckDefault">Filtrar por
                                            fecha</label>
                                    </div>
                                </div>
                                <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                                    <!-- Filters by affiliate -->
                                    <div class="mb-3 form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="flexSwitchCheck"
                                            v-model="filterByAffiliate" />
                                        <label class="form-check-label" for="flexSwitchCheck">Filtrar por
                                            Afiliado</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Filter by affiliates -->
                        <div v-if="filterByAffiliate" class="mt-3 row g-3"
                            style="background-color: darkblue; border-radius: 15px">
                            <div class="col-12">
                                <h6 class="text-uppercase text-center mb-3">Comercios</h6>
                            </div>

                            <div class="col-12">
                                <div class="nav-container">
                                    <!-- Make the container responsive and apply good padding/margin -->
                                    <div class="overflow-auto px-3 py-2" style="max-height: 200px; overflow-x: auto;">
                                        <ul class="nav nav-pills custom-nav-pills d-flex flex-nowrap">
                                            <li class="nav-item" v-for="(affiliate, index) in affiliates"
                                                :key="affiliate.id">
                                                <a class="nav-link px-3 py-2 mx-1"
                                                    :class="{ 'active': affiliate.active, 'custom-active': affiliate.active }"
                                                    href="#" @click.prevent="setActiveAffiliate(index)">
                                                    {{ affiliate.companyName }}
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Filter by date range -->
                        <div v-if="filterByDate" class="mt-3 row g-3"
                            style="background-color: darkblue; border-radius: 15px">
                            <div class="col-12">
                                <h6 class="text-uppercase text-center mb-3">Rango de fechas</h6>
                            </div>

                            <div class="col-12">
                                <div v-if="filterByDate" class="justify-content-center" style="margin-bottom: 20px;">
                                    <div class="row g-3 justify-content-center">
                                        <!-- Start Date Picker -->
                                        <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                                            <input type="date" v-model="startDate" class="form-control" />
                                        </div>
                                        <!-- End Date Picker -->
                                        <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                                            <input type="date" v-model="endDate" class="form-control" />
                                        </div>
                                    </div>

                                    <div class="d-flex justify-content-center mt-3">
                                        <button type="button" class="btn btn-theme me-2" style="width: 150px;"
                                            @click="filterCouponsByDate">
                                            Filtrar
                                        </button>
                                        <button type="button" class="btn btn-theme" style="width: 150px;"
                                            @click="clearDateFilter">
                                            Limpiar filtro
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mt-3 mb-3">Mostrando {{ filteredAppliedCoupons.length }} {{
                            filteredAppliedCoupons.length === 1 ?
                                'resultado' : 'resultados' }}</div>

                        <div class="text-center" v-if="loading">
                            <p>Cargando cupones, espere...</p>
                            <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                aria-hidden="true"></span>
                        </div>

                        <div class="row">
                            <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="coupon in filteredAppliedCoupons"
                                :key="coupon.id">
                                <div class="card h-100">
                                    <div class="card-body position-relative">
                                        <div class="row">
                                            <div class="col">
                                                <div class="img-container position-relative mb-3">
                                                    <!-- Image Display -->
                                                    <div class="img"
                                                        :style="{ backgroundImage: 'url(' + coupon.qrFileUrl + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
                                                    </div>
                                                </div>
                                                <p class="card-text"><strong>Nombre:</strong>
                                                    {{ coupon.name ? coupon.name : 'Cupon borrado' }}
                                                </p>
                                                <p class="card-text"><strong>Código:</strong>
                                                    {{ coupon.couponCode ? coupon.couponCode : 'Cupon borrado' }}
                                                </p>
                                                <p class="card-text"><strong>Aplicado el dia:</strong>
                                                    {{ formatDate(coupon.appliedDate) }}
                                                </p>
                                                <p class="card-text"><strong>Para el cliente:</strong>
                                                    {{ coupon.clientName ? coupon.clientName : 'Aplicado sin cliente' }}
                                                </p>
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
        <!-- Clients Modal -->
        <div class="modal fade" id="clientsModal" tabindex="-1" aria-labelledby="clientsRequestsModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title text-center" id="clientsRequestsModalLabel">{{ modalTitle }}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="container">
                            <table class="table text-center table-responsive">
                                <thead>
                                    <tr>
                                        <th scope="col">
                                            <input class="form-check" type="checkbox" @click="toggleSelectAll"
                                                :checked="allSelected">
                                        </th>
                                        <th scope="col" @click="sortClients('firstName')">Cliente <i
                                                class="fa-solid fa-sort"></i></th>
                                        <th scope="col" @click="sortClients('identification')">Cédula <i
                                                class="fa-solid fa-sort"></i></th>
                                        <th scope="col" v-if="showRequestsColumn">Solicitud</th>
                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="client in clientsModalData" :key="client.id">
                                        <td>
                                            <input class="form-check" type="checkbox" :value="client.id"
                                                v-model="selectedClients">
                                        </td>
                                        <td>{{ client.firstName + ' ' + client.lastName }}</td>
                                        <td>{{ client.identification }}</td>
                                        <td v-if="showRequestsColumn">
                                            <button class="btn btn-sm btn-info me-1" data-bs-toggle="tooltip"
                                                data-bs-placement="top" title="Seleccionar cliente"
                                                @click.prevent="showCouponRequest(client)">
                                                <i class="fa-solid fa-search me-2"></i>Ver solicitud
                                            </button>
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-success me-1" data-bs-toggle="tooltip"
                                                data-bs-placement="top" title="Seleccionar cliente"
                                                @click.prevent="selectClientForCoupon(client)">
                                                <i class="fa-solid fa-check me-2"></i>Seleccionar
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-theme" @click="selectMultipleClientsForCoupon()">Asignar Cupon a
                            Seleccionados</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Coupon Request Modal -->
        <div class="modal fade" id="couponRequestModal" tabindex="-1" aria-labelledby="couponRequestModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="couponRequestModalLabel">Detalles de la Solicitud de Cupón</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Client Information -->
                        <div class="mb-4">
                            <h5><strong>Cliente:</strong> {{ selectedRequestsClient.firstName + ' ' +
                                selectedRequestsClient.lastName }}</h5>
                            <p><strong>Cédula:</strong> {{ selectedRequestsClient.identification }}</p>
                        </div>

                        <!-- Loop through all coupon requests -->
                        <div v-for="(request, index) in selectedRequestsClient.coupon_requests" :key="request.id"
                            class="card mb-3">
                            <div class="card-header">
                                <h6 class="text-black"><strong>Solicitud #{{ index + 1 }}</strong></h6>
                            </div>

                            <div class="card-body">
                                <!-- Request Date -->
                                <p><strong>Fecha de solicitud:</strong> {{ formatDate(request.date) }}</p>

                                <!-- Affiliates Section -->
                                <div v-if="request.selectedAffiliates">
                                    <strong>Afiliados:</strong>
                                    <ul class="list-group list-group-flush">
                                        <li class="list-group-item" style="background-color: transparent;"
                                            v-for="(affiliateId, index) in Object.keys(request.selectedAffiliates)"
                                            :key="index">
                                            {{ getAffiliateNameById(affiliateId) }}
                                        </li>
                                    </ul>
                                </div>

                                <!-- Categories Section -->
                                <div v-if="request.selectedCategories" class="mt-3">
                                    <strong>Categorías:</strong>
                                    <ul class="list-group list-group-flush">
                                        <li class="list-group-item" style="background-color: transparent;"
                                            v-for="(categoryId, index) in Object.keys(request.selectedCategories)"
                                            :key="index">
                                            {{ getCategoryNameById(categoryId) }}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <!-- <div class="card-footer text-end">
                                <button class="btn btn-outline-success">
                                    <i class="fa-solid fa-check"></i> Asignar cupon
                                </button>
                            </div> -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Client view -->
    <div v-if="this.role === 'cliente'" class="container">
        <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><router-link to="/client-portal">Portal de clientes</router-link></li>
                <li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
            </ol>
        </nav>
        <div class="row">
            <div class="col-12 col-md-3" v-if="coupons.length > 0" v-for="coupon in coupons" :key="coupon.id">
                <div class="card mb-3 position-relative">
                    <div class="card-body">
                        <!-- Badge for status -->
                        <span class="badge position-absolute top-0 start-100 translate-middle"
                            :class="coupon.status ? 'bg-success' : 'bg-danger'">
                            {{ coupon.status ? 'Activo' : 'Expirado' }}
                        </span>
                        <div class="d-flex justify-content-between mb-3">
                            <h6 class="card-title mb-0">{{ coupon.name }}</h6>
                        </div>
                        <div class="img-container text-center mb-3">
                            <!-- Image Display -->
                            <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                style="max-height: 150px;" @click="openImageModal(coupon.qrFileUrl)">
                        </div>
                        <p class="card-text"><strong>Código:</strong> {{ coupon.couponCode }}</p>
                        <p class="card-text">
                            <strong>{{ coupon.type === 'saldo' ? 'Saldo: $' :
                                'Porcentaje: %' }}</strong>
                            {{ coupon.balance }}
                        </p>
                        <p class="card-text"><strong>Expiración:</strong> {{ coupon.expiration }}</p>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6" v-else>
                <div class="card shadow-lg mb-4">No hay cupones.</div>
            </div>
        </div>

        <!-- IMAGE Modal -->
        <div class="modal fade" id="qrModal" tabindex="-1" aria-labelledby="qrModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="qrModalLabel">QR Code</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img :src="modalImageUrl" alt="QR Code" class="img-fluid">
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Afilliate view -->
    <div v-if="this.role === 'afiliado'" class="container">
        <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><router-link to="/affiliate-portal">Portal de Afiliados</router-link></li>
                <li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
            </ol>
        </nav>
        <div class="row">

            <div id="apply-coupon" class="mb-5">
                <div class="row justify-content-center mb-4">
                    <div class="col-12 col-md-6">
                        <div class="card custom-card h-100 shadow-sm border-0 rounded-lg">
                            <div class="card-body text-center py-4">
                                <h5 class="card-title mb-4 font-weight-bold text-primary">Aplicar Cupón</h5>
                                <p class="card-text text-muted mb-4">Ingrese el código del cupón que desea aplicar.</p>
                                <div class="input-group mb-4">
                                    <SearchInput v-model="searchClient" :results="searchClientResults"
                                        placeholder="Busque un cliente por su cédula..." @input="searchClientsForCoupon"
                                        @select="selectClientForApply"
                                        class="form-control form-control-lg rounded-pill text-center" />
                                </div>
                                <!-- Display selected client information -->
                                <div v-if="selectedClient" class="mb-3 p-3 border rounded text-start">
                                    <h5>Información del cliente seleccionado</h5>
                                    <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                                        selectedClient.lastName }}</p>
                                    <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                                    <p><strong>Email:</strong> {{ selectedClient.email }}</p>
                                    <p><strong>Teléfono:</strong> {{ selectedClient.phoneNumber }}</p>
                                </div>
                                <div class="input-group mb-4">
                                    <input type="text" class="form-control form-control-lg rounded-pill text-center"
                                        v-model="appliedCode" placeholder="Código del cupón" />
                                </div>
                                <button :disabled="loading"
                                    class="btn btn-secondary btn-lg rounded-pill px-5 shadow-sm mt-3"
                                    @click="applyCoupon()">
                                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true"></span>
                                    <span v-else>Aplicar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <hr class="mt-5">

                <!-- Options -->
                <div class="mb-3 form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio1" value="option1"
                        v-model="selectedCouponOption" @click="fetchUserAppliedCoupons()">
                    <label class="form-check-label" for="inlineRadio1">Cupones aplicados</label>
                </div>
                <div class="mb-3 form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio2" value="option2"
                        v-model="selectedCouponOption" @click="loadCoupons()">
                    <label class="form-check-label" for="inlineRadio2">Cupones pendiente por Pago</label>
                </div>

                <!-- Option 1 = Applied coupons -->
                <div v-if="selectedCouponOption === 'option1'" class="mt-3">
                    <div class="col-12 col-md-3" v-if="appliedCoupons.length > 0" v-for="coupon in appliedCoupons"
                        :key="coupon.id">
                        <div class="card mb-3 position-relative">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mb-3">
                                    <h6 class="card-title mb-0">{{ coupon.name }}</h6>
                                </div>
                                <div class="img-container text-center mb-3">
                                    <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                        style="max-height: 150px;">
                                </div>
                                <div class="card-title"><strong>Cliente: </strong>
                                    {{ coupon.clientName }}
                                </div>
                                <hr>
                                <p class="card-text"><strong>Código:</strong> {{ coupon.couponCode }}</p>
                                <p class="card-text">
                                    <strong>Saldo:</strong>
                                    ${{ coupon.balance }}
                                </p>
                                <p class="card-text"><strong>Aplicado el dia: </strong>{{ formatDate(coupon.appliedDate)
                                    }}
                                </p>
                                <p class="card-text"><strong>Expiración:</strong> {{ formatDate(coupon.expiration) }}
                                </p>
                                <p class="card-text"><strong>Veces que se puede aplicar: </strong>{{ coupon.redeemCount
                                    }}
                                </p>
                                <p class="card-text"><strong>Veces aplicado: </strong>{{ coupon.timesUsed }}</p>
                            </div>
                        </div>
                    </div>
                    <p v-else>No hay cupones aplicados.</p>
                </div>

                <!-- Option 2 = Pending payment coupons -->
                <div v-if="selectedCouponOption === 'option2'" class="mt-3">
                    <div class="col-12 col-md-3" v-if="pendingPaymentCoupons.length > 0"
                        v-for="coupon in pendingPaymentCoupons" :key="coupon.id">
                        <div class="card mb-3 position-relative">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mb-3">
                                    <h6 class="card-title mb-0">{{ coupon.name }}</h6>
                                    <h6 class="text-muted"><strong>Cliente: </strong>{{ coupon.clientName }}</h6>
                                </div>
                                <div class="img-container text-center mb-3">
                                    <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                        style="max-height: 150px;">
                                </div>
                                <p class="card-text"><strong>Código:</strong> {{ coupon.code }}</p>
                                <p class="card-text">
                                    <strong>Saldo:</strong>
                                    ${{ coupon.balance }}
                                </p>
                                <p class="card-text"><strong>Aplicado el dia: </strong>{{ formatDate(coupon.appliedDate)
                                    }}
                                </p>
                                <p class="card-text"><strong>Expiración:</strong> {{ formatDate(coupon.expiration) }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p v-else>No hay cupones pendientes por pago.</p>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
.btn-theme {
    background-color: purple;
    border-color: purple;
}

.card {
    margin: 15px;
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
</style>