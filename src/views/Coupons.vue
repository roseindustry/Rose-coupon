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

            // Fetching data
            clients: [],
            coupons: [],
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

            appliedCode: ''
        }
    },
    watch: {
        selectedCouponOption(newOption) {
            this.clearData(newOption);
        },
    },
    computed: {
        filteredCoupons() {
            let filteredCoupons = this.coupons;

            // Filter for store-only coupons if `option3` is selected in `selectedCouponOption`
            if (this.selectedCouponOption === 'option3') {
                filteredCoupons = filteredCoupons.filter(coupon => coupon.onlyInStore === true);
            }

            // Apply filtering based on the `selectedFilterOption`
            switch (this.selectedFilterOption) {
                case 'option1':
                    // No additional filtering required as this case shows all coupons
                    break;
                case 'option2':
                    // Show paid coupons
                    filteredCoupons = filteredCoupons.filter(coupon => coupon.isPaid === true);
                    break;
                case 'option3':
                    // Show unpaid coupons
                    filteredCoupons = filteredCoupons.filter(coupon => coupon.isPaid === false);
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
        currentPageName() {
            return this.$route.name;
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

        //Fetch data
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
                } else {
                    this.clients = [];  // No clients found
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
                this.clients = [];
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
                    const couponIds = Object.keys(couponsData);  // Fetch only IDs
                    return couponIds; // Return array of coupon IDs
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
                    const couponsRef = dbRef(db, `Coupons`);
                    const couponsSnapshot = await get(couponsRef);
                    const userAppliedCouponIds = await this.fetchUserAppliedCoupons(); // Coupon IDs applied by the affiliate

                    if (couponsSnapshot.exists()) {
                        const couponsData = couponsSnapshot.val();
                        let allCoupons = [];
                        const appliedCoupons = [];
                        const pendingPaymentCoupons = [];

                        allCoupons = Object.keys(couponsData).map(couponId => ({
                            id: couponId,
                            ...couponsData[couponId],
                        }));

                        // Applied coupons
                        allCoupons.forEach((coupon) => {
                            if (coupon.storeApplied === true && userAppliedCouponIds.includes(coupon.id)) {
                                appliedCoupons.push(coupon);
                            }
                        });

                        // Pending payment coupons
                        allCoupons.forEach((coupon) => {
                            if (userAppliedCouponIds.includes(coupon.id) && coupon.isPaid === false) {
                                pendingPaymentCoupons.push(coupon);
                            }
                        });

                        // Display filtered coupons based on the selected option
                        if (this.selectedCouponOption === 'option1') {
                            this.coupons = appliedCoupons;
                        } else if (this.selectedCouponOption === 'option2') {
                            this.coupons = pendingPaymentCoupons;
                        } else {
                            this.coupons = allCoupons;
                        }
                    } else {
                        console.log('No coupons found for afiliado');
                        this.coupons = [];
                    }
                }
                // General coupon fetch for all users
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
        async loadCouponsWithRedemptions() {
            try {
                // First fetch the list of coupons
                await this.loadCoupons();

                // Loop through coupons and count redemptions
                for (const coupon of this.coupons) {
                    const couponRedemptionsRef = dbRef(db, `Users/${this.userId}/appliedCoupons/${coupon.id}`);
                    const snapshot = await get(couponRedemptionsRef);

                    // Count the number of redemptions
                    if (snapshot.exists()) {
                        coupon.redeemedCount = Object.keys(snapshot.val()).length;
                    } else {
                        coupon.redeemedCount = 0; // No redemptions found
                    }
                }

                // The coupon data will now have the redemption count
            } catch (error) {
                console.error('Error loading coupons with redemption count:', error);
            }
        },

        //Assign coupon to clients 
        // OJO: Modify so many coupons can be assigned at the same time
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
        selectClientForCoupon(client) {
            this.selectedClient = client;
            console.log('Selected client:', client.identification);
            this.searchClient = '';
            this.searchClientResults = [];
        },
        selectCoupon(coupon) {
            this.selectedCoupon = coupon;
            console.log('Selected coupon:', coupon.id);
        },

        //Update coupons
        checkCouponStatus(coupon) {
            const today = moment();

            const expirationDate = moment(coupon.expiration, 'DD/MM/YYYY');

            if (expirationDate.isBefore(today, 'day')) {
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
            // const tenantId = await this.getTenantId();
            let qrFileUrl = '';

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

                // tenant_id: tenantId
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
            if (!this.selectedClient) {
                alert('Por favor seleccione un cliente antes de asignar un cupon.');
                return;
            }

            const clientId = this.selectedClient.id;

            try {
                // Assign existing coupon
                const userCouponRef = dbRef(db, `Users/${clientId}/coupons/${this.selectedCoupon.id}`);
                await set(userCouponRef, this.selectedCoupon.id);

                this.showToast('Cupon asignado con exito!');

                // Reset selection if needed
                this.selectedCoupon = null;
                this.selectedClient = null;
                this.searchClient = '';
            } catch (error) {
                console.error('Error assigning coupon:', error);
                alert('La asignacion de cupon fallo.');
            }
        },
        async createAndAssignCoupon() {

            try {
                // Check required fields
                if (!this.couponName || !this.couponType || !this.couponCode || !this.couponAmount || !this.couponExp) {
                    alert('Por favor complete todos los campos del formulario antes de crear el cupón.');
                    return;
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
                if (this.assignTheCoupon && this.selectedClient) {
                    const clientId = this.selectedClient.id;
                    const userCouponRef = dbRef(db, `Users/${clientId}/coupons/${newCouponKey}`);
                    await set(userCouponRef, newCouponKey);
                    this.showToast('Cupon asignado con exito!');
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
                    this.coupons.splice(index, 1);
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
        openModal(imageUrl) {
            this.modalImageUrl = imageUrl;
            new Modal(document.getElementById('qrModal')).show();
        },
        async applyCoupon() {
            try {
                if (!this.appliedCode) {
                    console.log('No coupon code entered');
                    return;
                }

                // Load coupons (assuming this.loadCoupons returns an array)
                const coupons = await this.loadCoupons();
                let selectedCoupon = null;

                // Find the coupon by its code
                coupons.forEach(coupon => {
                    if (coupon.couponCode === this.appliedCode) {
                        selectedCoupon = coupon;
                    }
                });

                if (!selectedCoupon) {
                    alert('El cupón no existe.');
                    return;
                }

                // Check if the coupon has any redeemCount left
                if (selectedCoupon.redeemCount === 0) {
                    alert('Este cupón ya fue aplicado las veces permitidas.');
                    return;
                }

                // Generate a unique key for each redemption (using timestamp here for simplicity)
                const redemptionId = new Date().getTime();

                // Save each redemption as a separate entry
                const userCouponRef = dbRef(db, `Users/${this.userId}/appliedCoupons/${selectedCoupon.id}/${redemptionId}`);
                await set(userCouponRef, {
                    couponCode: selectedCoupon.couponCode,
                    appliedDate: new Date().toISOString(),
                    storeId: this.userId, // Affiliate store applying the coupon
                });

                // Decrease redeem count
                const updatedRedeemCount = selectedCoupon.redeemCount > 0 ? selectedCoupon.redeemCount - 1 : 0;
                const couponUpdateRef = dbRef(db, `Coupons/${selectedCoupon.id}`);
                await update(couponUpdateRef, {
                    redeemCount: updatedRedeemCount,
                    storeApplied: true
                });

                console.log(`Coupon with ID: ${selectedCoupon.id} applied by store: ${this.userId}`);

                // Show success message
                this.showToast('Cupón aplicado con éxito!');

                // Clear the input after applying
                this.appliedCode = '';

            } catch (error) {
                console.error('Error applying coupon:', error);
            }
        },
    },
    async created() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;
        console.log('This user ID: ', this.userId, 'Has a role of: ', this.role);

        if (this.role !== 'afiliado') {
            await this.loadCoupons();
        }

        if (this.role === 'admin') {
            await this.fetchClients();
        }

    }
}
</script>
<template>
    <!-- Admin view -->
    <div v-if="this.role === 'admin'" class="container">
        <h2 class="mb-4 text-center">CUPONES</h2>

        <div id="assign-coupons" class="mb-5">
            <p class="mb-3">Busque y seleccione el cliente y el cupon que desea asignar.</p>
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
                        <label class="form-check-label" for="inlineRadio3">Administrar cupones de Tienda</label>
                    </div>

                    <!-- Option 1 = Assign Existing Coupon Section -->
                    <div v-if="selectedCouponOption === 'option1'" class="mt-3">
                        <h5>Seleccione un cupón existente</h5>
                        <p v-if="coupons.length === 0">No hay cupones registrados.</p>

                        <!-- Search Bar to Filter Coupons -->
                        <div class="mb-3">
                            <input type="text" class="form-control" v-model="searchCoupon"
                                placeholder="Buscar cupón por nombre o código..." />
                        </div>

                        <div class="row">
                            <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="(coupon, index) in filteredCoupons"
                                :key="coupon.id">
                                <div class="card h-100" @click="selectCoupon(coupon)"
                                    :class="{ 'selected': coupon === selectedCoupon }">
                                    <div class="card-body position-relative">
                                        <!-- Badge for status -->
                                        <span class="badge position-absolute top-0 start-100 translate-middle"
                                            :class="coupon.status ? 'bg-success' : 'bg-danger'">
                                            {{ coupon.status ? 'Activo' : 'Inactivo' }}
                                        </span>

                                        <div class="d-flex justify-content-between mb-3">
                                            <h6 class="card-title mb-0">
                                                <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                    <input v-model="editingCoupon.name" class="form-control" />
                                                </template>
                                                <template v-else>
                                                    {{ coupon.name }}
                                                </template>
                                            </h6>
                                            <div class="btn-group" role="group">
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
                                            <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                                style="max-height: 150px;">
                                        </div>

                                        <!-- Coupon Code -->
                                        <p class="card-text"><strong>Código: </strong>
                                            <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                <input v-model="editingCoupon.couponCode" class="form-control" />
                                            </template>
                                            <template v-else>
                                                {{ coupon.couponCode }}
                                            </template>
                                        </p>

                                        <!-- Bootstrap Accordion for Coupon Details -->
                                        <div class="accordion" :id="'couponAccordion' + index">
                                            <div class="accordion-item">
                                                <h2 class="accordion-header" :id="'heading' + index">
                                                    <button class="accordion-button" type="button"
                                                        data-bs-toggle="collapse"
                                                        :data-bs-target="'#collapseDetails' + index"
                                                        aria-expanded="true" :aria-controls="'collapseDetails' + index">
                                                        Ver Detalles
                                                    </button>
                                                </h2>
                                                <div :id="'collapseDetails' + index" class="accordion-collapse collapse"
                                                    :class="{ show: coupon === selectedCoupon }"
                                                    :aria-labelledby="'heading' + index"
                                                    :data-bs-parent="'#couponAccordion' + index">
                                                    <div class="accordion-body">
                                                        <!-- Conditional Balance / Percentage -->
                                                        <p class="card-text d-flex align-items-center">
                                                            <!-- Coupon Type (Dropdown) -->
                                                            <template
                                                                v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                                <select v-model="editingCoupon.type"
                                                                    class="form-control me-2" id="editType"
                                                                    style="width: auto;">
                                                                    <option value="saldo">Saldo</option>
                                                                    <option value="porcentaje">Porcentaje</option>
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
                                                                <input v-model.number="editingCoupon.redeemCount"
                                                                    type="number" class="form-control" />
                                                            </template>
                                                            <template v-else>
                                                                {{ coupon.redeemCount }}
                                                            </template>
                                                        </p>

                                                        <!-- Store Only Coupon -->
                                                        <p class="card-text"><strong>Solo en tienda: </strong>
                                                            <template
                                                                v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                                <input type="checkbox"
                                                                    v-model="editingCoupon.onlyInStore" />
                                                            </template>
                                                            <template v-else>
                                                                <span>{{ coupon.onlyInStore ? 'Sí' : 'No' }}</span>
                                                            </template>
                                                        </p>

                                                        <!-- Expiration Date -->
                                                        <p class="card-text"><strong>Expiración: </strong>
                                                            <template
                                                                v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                                <input type="date" v-model="editingCoupon.expiration"
                                                                    class="form-control" />
                                                            </template>
                                                            <template v-else>{{ formatDate(coupon.expiration)
                                                                }}</template>
                                                        </p>

                                                        <!-- Status Switch -->
                                                        <div class="d-flex align-items-center">
                                                            <p class="card-text mb-0 me-2"><strong>Estado:</strong></p>
                                                            <div class="form-check form-switch">
                                                                <input class="form-check-input" type="checkbox"
                                                                    v-bind:id="'coupon' + index" v-model="coupon.status"
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
                        </div>

                        <h5 class="mt-4">Seleccione un Cliente</h5>

                        <!-- Searching input -->
                        <SearchInput v-model="searchClient" :results="searchClientResults"
                            placeholder="Busque un cliente por su cédula..." @input="searchClientsForCoupon"
                            @select="selectClientForCoupon" class="form-control mb-3" />
                        <!-- Display selected client information -->
                        <div v-if="selectedClient" class="mb-3 p-3 border rounded">
                            <h5>Información del cliente seleccionado</h5>
                            <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                                selectedClient.lastName }}</p>
                            <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                            <p><strong>Email:</strong> {{ selectedClient.email }}</p>
                            <p><strong>Teléfono:</strong> {{ selectedClient.phoneNumber }}</p>
                        </div>

                        <button @click="assignExistingCoupon" class="btn btn-primary mt-3">Asignar cupón
                            existente</button>
                    </div>

                    <!-- Option 2 = Create/Assign New Coupon Section -->
                    <div v-if="selectedCouponOption === 'option2'" class="mt-3">
                        <h5>Crear cupón</h5>
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
                                <select v-model="couponType" class="form-select" aria-label="Default select example">
                                    <option value="saldo">Saldo</option>
                                    <option value="porcentaje">Porcentaje</option>
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
                                <label class="form-check-label" for="storeCheckbox">Cupón de Tienda</label>
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

                        <!-- Display selected client information -->
                        <div v-if="selectedClient && assignTheCoupon" class="mb-3 p-3 border rounded">
                            <h5>Información del cliente seleccionado</h5>
                            <p><strong>Nombre:</strong> {{ selectedClient.firstName + ' ' +
                                selectedClient.lastName }}</p>
                            <p><strong>Cédula:</strong> {{ selectedClient.identification }}</p>
                            <p><strong>Email:</strong> {{ selectedClient.email }}</p>
                            <p><strong>Teléfono:</strong> {{ selectedClient.phoneNumber }}</p>
                        </div>
                        <button v-if="assignTheCoupon" @click="createAndAssignCoupon" class="btn btn-primary mt-3">Crear
                            y Asignar
                            cupón</button>
                    </div>

                    <!-- Option 3 = Manage InStore Coupons -->
                    <div v-if="selectedCouponOption === 'option3'" class="mt-3">
                        <h5>Cupones solo disponibles en Tienda</h5>
                        <p v-if="coupons.length === 0">No hay cupones registrados.</p>

                        <!-- Search Bar to Filter Coupons -->
                        <div class="mb-3">
                            <input type="text" class="form-control" v-model="searchCoupon"
                                placeholder="Buscar cupón por nombre o código..." />
                        </div>

                        <!-- Filters -->
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

                        <div class="row">
                            <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="(coupon, index) in filteredCoupons"
                                :key="coupon.id">
                                <div class="card h-100">
                                    <div class="card-body position-relative">
                                        <!-- Badge for status -->
                                        <span class="badge position-absolute top-0 start-100 translate-middle"
                                            :class="coupon.status ? 'bg-success' : 'bg-danger'">
                                            {{ coupon.status ? 'Activo' : 'Inactivo' }}
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
                                                    <template>
                                                        {{ coupon.couponCode }}
                                                    </template>
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
            <h2 class="mb-4 text-center">CUPONES</h2>
            <div class="col-12 col-md-3" v-if="coupons.length > 0" v-for="coupon in coupons" :key="coupon.id">
                <div class="card mb-3 position-relative">
                    <div class="card-body">
                        <!-- Badge for status -->
                        <span class="badge position-absolute top-0 start-100 translate-middle"
                            :class="coupon.status ? 'bg-success' : 'bg-danger'">
                            {{ coupon.status ? 'Activo' : 'Inactivo' }}
                        </span>
                        <div class="d-flex justify-content-between mb-3">
                            <h6 class="card-title mb-0">{{ coupon.name }}</h6>
                        </div>
                        <div class="img-container text-center mb-3">
                            <!-- Image Display -->
                            <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                style="max-height: 150px;" @click="openModal(coupon.qrFileUrl)">
                        </div>
                        <p class="card-text"><strong>Código:</strong> {{ coupon.couponCode }}</p>
                        <p class="card-text"><strong>Saldo:</strong> ${{ coupon.balance }}</p>
                        <p class="card-text"><strong>Expiración:</strong> {{ coupon.expiration }}</p>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6" v-else>
                <div class="card shadow-lg mb-4">No hay cupones.</div>
            </div>
        </div>
        <!-- Modal -->
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
            <h2 class="mb-4 text-center">CUPONES</h2>

            <div id="apply-coupon" class="mb-5">
                <div class="row justify-content-center mb-4">
                    <div class="col-12 col-md-6 col-lg-4">
                        <div class="card custom-card h-100 shadow-sm border-0 rounded-lg">
                            <div class="card-body text-center py-4">
                                <h5 class="card-title mb-4 font-weight-bold text-primary">Aplicar Cupón</h5>
                                <p class="card-text text-muted mb-4">Ingrese el código del cupón que desea aplicar.</p>
                                <div class="input-group mb-4">
                                    <input type="text" class="form-control form-control-lg rounded-pill"
                                        v-model="appliedCode" placeholder="Código del cupón" />
                                </div>
                                <button class="btn btn-success btn-lg rounded-pill px-5 shadow-sm mt-3"
                                    @click="applyCoupon()">Aplicar</button>
                            </div>
                        </div>
                    </div>
                </div>

                <hr class="mt-5">

                <!-- Options -->
                <div class="mb-3 form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio1" value="option1"
                        v-model="selectedCouponOption" @click="loadCoupons(), loadCouponsWithRedemptions()">
                    <label class="form-check-label" for="inlineRadio1">Cupones aplicados</label>
                </div>
                <div class="mb-3 form-check form-check-inline">
                    <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio2" value="option2"
                        v-model="selectedCouponOption" @click="loadCoupons()">
                    <label class="form-check-label" for="inlineRadio2">Cupones pendiente por Pago</label>
                </div>

                <!-- Option 1 = Applied coupons -->
                <div v-if="selectedCouponOption === 'option1'" class="mt-3">
                    <div class="col-12 col-md-3" v-if="coupons.length > 0" v-for="coupon in coupons" :key="coupon.id">
                        <div class="card mb-3 position-relative">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mb-3">
                                    <h6 class="card-title mb-0">{{ coupon.name }}</h6>
                                </div>
                                <div class="img-container text-center mb-3">
                                    <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                        style="max-height: 150px;">
                                </div>
                                <p class="card-text"><strong>Código:</strong> {{ coupon.couponCode }}</p>
                                <p class="card-text"><strong>Saldo:</strong> ${{ coupon.balance }}</p>
                                <p class="card-text"><strong>Expiración:</strong> {{ formatDate(coupon.expiration) }}
                                </p>
                                <p class="card-text"><strong>Veces aplicado: </strong>{{ coupon.redeemedCount }}</p>
                            </div>
                        </div>
                    </div>
                    <p v-else>No hay cupones aplicados.</p>
                </div>

                <!-- Option 2 = Pending payment coupons -->
                <div v-if="selectedCouponOption === 'option2'" class="mt-3">
                    <div class="col-12 col-md-3" v-if="coupons.length > 0" v-for="coupon in coupons" :key="coupon.id">
                        <div class="card mb-3 position-relative">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mb-3">
                                    <h6 class="card-title mb-0">{{ coupon.name }}</h6>
                                </div>
                                <div class="img-container text-center mb-3">
                                    <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                        style="max-height: 150px;">
                                </div>
                                <p class="card-text"><strong>Código:</strong> {{ coupon.couponCode }}</p>
                                <p class="card-text"><strong>Saldo:</strong> ${{ coupon.balance }}</p>
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
.card {
    margin: 15px;
}

.list-autocomplete {
    padding: 0;
}

.list-autocomplete em {
    font-style: normal;
    background-color: #e1f2f9;
}

.hasNoResults {
    color: #aaa;
    display: block;
    padding: 10px;
    color: #aaa;
}

.card {
    cursor: pointer;
    transition: background-color 0.3s;
}

.card.selected {
    background-color: #e9ecef;
}

.vertical-separator {
    border-left: 1px solid #ccc;
    height: 100%;
    margin-left: 15px;
}
</style>