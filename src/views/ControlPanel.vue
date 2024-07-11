<script>
import { db, storage } from '../firebase/init';
import { ref as dbRef, push, update, get, set, remove, query, orderByChild, equalTo } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTenancyStore } from '@/stores/tenancy';
import { useUserStore } from '@/stores/user-role';
import { getSubdomain } from '@/utils/subdomain';
import navscrollto from '@/components/app/NavScrollTo.vue';
import SearchInput from '@/components/app/SearchInput.vue';
import { ScrollSpy } from 'bootstrap';
import datepicker from 'vue3-datepicker';
import 'vue-datepicker-next/index.css';
import moment from 'moment';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

export default {
    components: {
        navScrollTo: navscrollto,
        SearchInput,
        datepicker
    },
    data() {
        return {
            // Employee rol assignment search properties
            searchQuery: '',
            searchResults: [],
            selectedRole: null,
            roles: ['Gerente', 'Cajero', 'Mesero', 'Admin'],

            // Client suscription assignment search properties
            searchClientPlan: '',
            searchClientPlanResults: [],
            selectedClientPlan: null,
            selectedPlan: null,
            plans: [
                { name: 'Basico', price: 'Gratis' },
                { name: 'Plata', price: '$5' },
                { name: 'Oro', price: '$10' }
            ],

            // Client Coupon assignment search properties
            searchClientCoupon: '',
            searchClientCouponResults: [],
            selectedClientCoupon: null,
            selectedCoupon: null,

            // Other properties
            tenantName: '',
            tenantImage: null,
            uploadImage: false,
            imageFile: null,
            imagePreview: null,
            subdomain: null,
            selectedUser: null,
            selectedClient: null,
            selectedCouponOption: '',
            coupons: [],
            couponCode: '',
            couponName: '',
            couponAmount: 0,
            couponExp: '',
            qrFile: null,
            qrPreview: null,
            assignTheCoupon: false,
            selectedCoupon: null,
            editingCoupon: null,
        };
    },
    watch: {
        selectedCouponOption(newOption) {
            this.clearData(newOption);
        }
    },
    methods: {
        async getTenantId() {
            const tenancyStore = useTenancyStore();
            await tenancyStore.findOrCreateTenant();
            return tenancyStore.tenant.key;
        },
        // Tenant updates
        async updateTenant() {
            const tenancyStore = useTenancyStore();

            let imageUrl = null;
            // Check if an image was selected for update and get URL
            if (this.imageFile) {
                imageUrl = await this.uploadLogoToStorage(this.imageFile);
                // Reset input type file
                // Update tenantImage with the new URL
                this.tenantImage = imageUrl;
                this.uploadImage = null;
                this.resetFileInputAndPreview();
            }

            // Update tenant name and optionally the logo URL
            await tenancyStore.updateTenantDetails(this.tenantName, imageUrl);

            this.showToast('Información guardada con éxito!');
        },
        async uploadLogoToStorage(imageFile) {
            let imageUrl = null;

            try {
                const sRef = storageRef(storage, `tenantLogos/${imageFile.name}`);
                const uploadResult = await uploadBytes(sRef, imageFile);
                imageUrl = await getDownloadURL(uploadResult.ref);
                console.log('Logo uploaded:', imageUrl);
            } catch (error) {
                console.error('Error uploading image:', error);
            }

            return imageUrl;
        },
        previewImage(event) {
            const file = event.target.files[0];
            if (file) {
                this.imageFile = file;
                this.imagePreview = URL.createObjectURL(file);
            } else {
                this.imagePreview = null;
                this.imageFile = null;
            }
        },
        resetFileInputAndPreview() {
            const fileInput = document.getElementById('logoImg');
            fileInput.value = '';
            this.imagePreview = '';
        },
        async searchUsers(query, roleFilter, resultState) {
            if (query.length > 2) {
                const userStore = useUserStore();
                let allUsers = await userStore.searchUsers(query);
                this[resultState] = allUsers.filter(user => roleFilter(user.role));
            } else {
                this[resultState] = [];
            }
        },

        //Assign role to employees
        async searchEmployees() {
            await this.searchUsers(this.searchQuery, role => role !== 'cliente', 'searchResults');
        },
        selectUser(user) {
            this.selectedUser = user;
            this.searchQuery = '';
            this.searchResults = [];
        },
        selectRole(role) {
            this.selectedRole = role;
        },
        async assignRole() {
            if (!this.selectedUser || !this.selectedRole) {
                alert("Por favor selecciona un empleado y un rol antes de asignar.");
                return;
            }

            const userId = this.selectedUser.uid; // Ensure you have a uid property in your user objects
            const updatedRole = this.selectedRole;

            const roleRef = dbRef(db, `Users/${userId}`);

            try {
                await update(roleRef, { role: updatedRole });

                this.showToast('Rol asignado con éxito!');

                // Reset selection if needed
                this.selectedUser = null;
                this.selectedRole = null;
                this.searchQuery = '';
            } catch (error) {
                console.error("Error updating role:", error);
                alert("La asignacion de rol fallo.");
            }
        },

        //Assign Suscription to clients
        async searchClientsForPlan() {
            await this.searchUsers(this.searchClientPlan, role => role === 'cliente', 'searchClientPlanResults');
        },
        selectClientForPlan(client) {
            this.selectedClientPlan = client;
            this.searchClientPlan = '';
            this.searchClientPlanResults = [];
        },
        selectPlan(plan) {
            this.selectedPlan = plan;
            console.log('Selected Plan: ', plan);
        },
        getPlanButtonClass(plan) {
            const planColors = {
                'Basico': 'btn-basic',
                'Plata': 'btn-plata',
                'Oro': 'btn-oro'
            };
            return planColors[plan] || 'btn-secondary';
        },
        async assignClientPlan() {
            if (!this.selectedClientPlan) {
                alert('Por favor seleccione un cliente antes de asignar una suscripción.');
                return;
            }

            if (!this.selectedPlan) {
                alert('Por favor seleccione una suscripción antes de asignar.');
                return;
            }

            const clientId = this.selectedClientPlan.uid;

            try {
                // Assign the selected plan to the client
                const userPlanRef = dbRef(db, `Users/${clientId}`);
                await update(userPlanRef, { plan: this.selectedPlan });

                this.showToast('Suscripción asignada con éxito!');

                // Reset selection if needed
                this.selectedPlan = null;
                this.selectedClientPlan = null;
                this.searchClientPlan = '';
            } catch (error) {
                console.error('Error assigning plan:', error);
                alert('La asignación de la suscripción falló.');
            }
        },

        //Assign coupons to clients
        async searchClientsForCoupon() {
            await this.searchUsers(this.searchClientCoupon, role => role === 'cliente', 'searchClientCouponResults');
        },
        selectClientForCoupon(client) {
            this.selectedClientCoupon = client;
            this.searchClientCoupon = '';
            this.searchClientCouponResults = [];
        },
        selectCoupon(coupon) {
            this.selectedCoupon = coupon;
            console.log('Selected coupon:', coupon.id);
        },
        async loadCoupons() {
            const tenantId = await this.getTenantId();
            try {
                const couponsRef = query(dbRef(db, 'Coupons'), orderByChild('tenant_id'), equalTo(tenantId));;
                const snapshot = await get(couponsRef);
                if (snapshot.exists()) {
                    this.coupons = Object.entries(snapshot.val()).map(([id, coupon]) => {
                        coupon.id = id;

                        // Format the expiration date to 'DD/MM/YYYY'
                        if (moment(coupon.expiration, moment.ISO_8601, true).isValid()) {
                            coupon.expiration = moment(coupon.expiration).format('DD/MM/YYYY');
                        } else {
                            coupon.expiration = moment(coupon.expiration, 'DD/MM/YYYY').format('DD/MM/YYYY');
                        }

                        this.checkCouponStatus(coupon);
                        return coupon;
                    });
                } else {
                    console.log('No coupons available');
                }
            } catch (error) {
                console.error('Error loading coupons:', error);
            }
        },
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
        async saveCoupon() {
            try {
                // Format the date to ISO before saving to the database
                const isoDate = moment(this.editingCoupon.expiration, 'DD/MM/YYYY').toISOString();
                this.editingCoupon.expiration = isoDate;

                const couponRef = dbRef(db, `Coupons/${this.editingCoupon.id}`);
                await set(couponRef, this.editingCoupon);

                // Find the index of the coupon and update it in the local state
                const index = this.coupons.findIndex(c => c.id === this.editingCoupon.id);
                if (index !== -1) {
                    // Convert the ISO date back to DD/MM/YYYY for display purposes
                    this.coupons[index] = { ...this.editingCoupon, expiration: moment(isoDate).format('DD/MM/YYYY') };
                }

                this.showToast('Cupon actualizado con exito!');

                this.editingCoupon = null;
                this.checkCouponStatus(this.editingCoupon);
            } catch (error) {
                console.error('Error saving coupon:', error);
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
        handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                this.qrFile = file;
                this.qrPreview = URL.createObjectURL(file);
            }
        },
        async createCoupon() {
            const tenantId = await this.getTenantId();
            let qrFileUrl = '';

            if (this.qrFile) {
                const qrFileRef = storageRef(storage, `coupons/${this.couponName}`);
                await uploadBytes(qrFileRef, this.qrFile);
                qrFileUrl = await getDownloadURL(qrFileRef);
            }

            const formattedDate = moment(this.couponExp).toISOString();
            const couponData = {
                name: this.couponName,
                couponCode: this.couponCode,
                balance: this.couponAmount,
                expiration: formattedDate,
                qrFileUrl: qrFileUrl,
                status: true,
                tenant_id: tenantId
            };

            const couponsRef = dbRef(db, 'Coupons');
            const newCouponRef = push(couponsRef);
            const newCouponKey = newCouponRef.key;

            try {
                await set(newCouponRef, couponData);

                this.showToast('Cupon creado con exito!');

                // Reset form fields
                this.couponName = '';
                this.couponCode = '';
                this.couponAmount = '';
                this.couponExp = new Date();
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
            if (!this.selectedClientCoupon) {
                alert('Por favor seleccione un cliente antes de asignar un cupon.');
                return;
            }

            const clientId = this.selectedClientCoupon.uid;

            try {
                // Assign existing coupon
                const userCouponRef = dbRef(db, `Users/${clientId}/coupons/${this.selectedCoupon.id}`);
                await set(userCouponRef, { coupon_id: this.selectedCoupon.id });

                this.showToast('Cupon asignado con exito!');

                // Reset selection if needed
                this.selectedCoupon = null;
                this.selectedClientCoupon = null;
                this.searchClientCoupon = '';
            } catch (error) {
                console.error('Error assigning coupon:', error);
                alert('La asignacion de cupon fallo.');
            }
        },
        async createAndAssignCoupon() {
            const tenantId = await this.getTenantId();
            try {
                // Check required fields
                if (!this.couponName || !this.couponCode || !this.couponAmount || !this.couponExp) {
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
                const isoDate = moment(this.couponExp, 'DD/MM/YYYY').toISOString();

                // Prepare coupon data
                const couponData = {
                    name: this.couponName,
                    couponCode: this.couponCode,
                    balance: this.couponAmount,
                    expiration: isoDate,
                    status: true,
                    qrFileUrl: qrFileUrl,
                    tenant_id: tenantId
                };

                // Save coupon to database
                const couponsRef = dbRef(db, 'Coupons');
                const newCouponRef = push(couponsRef);
                const newCouponKey = newCouponRef.key;
                await set(newCouponRef, couponData);

                // Assign coupon to client if required
                if (this.assignTheCoupon && this.selectedClientCoupon) {
                    const clientId = this.selectedClientCoupon.uid;
                    const userCouponRef = dbRef(db, `Users/${clientId}/coupons/${newCouponKey}`);
                    await set(userCouponRef, { coupon_id: newCouponKey });
                    this.showToast('Cupon asignado con exito!');
                } else {
                    this.showToast('Cupon creado con exito!');
                }

                // Reset form fields and UI
                this.loadCoupons();
                this.resetForm();
            } catch (error) {
                console.error('Error creating and assigning coupon:', error);
                alert('La creación o asignación de cupón falló.');
            }
        },
        async deleteCoupon(couponId, index) {
            if (confirm("¿Desea borrar este cupon?")) {
                try {
                    const couponRef = dbRef(db, `Coupons/${couponId}`);
                    await remove(couponRef);

                    // Remove the coupon from the local state
                    this.coupons.splice(index, 1);

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
        clearData(option) {
            if (option === 'option1') {
                // Clear data for assigning an existing coupon
                this.selectedClientCoupon = null;
                this.searchClientCoupon = '';
            } else if (option === 'option2') {
                // Clear data for registering a new coupon
                this.couponName = '';
                this.couponCode = '';
                this.couponAmount = 0;
                this.couponExp = new Date();;
                this.qrFile = null;
                this.qrPreview = null;
            }
            // Clear any other shared data
            this.selectedCoupon = null;
            this.editingCoupon = null;
        },
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
        resetForm() {
            this.couponName = '';
            this.couponCode = '';
            this.couponAmount = '';
            this.couponExp = new Date();
            this.qrFileUrl = '';
            this.selectedClientCoupon = null;
            this.searchClientCoupon = '';
            this.selectedCouponOption = 'option1';
        },
    },
    async mounted() {
        const tenancyStore = useTenancyStore();
        this.subdomain = getSubdomain();
        this.loadCoupons();

        // Automatically find or create tenant upon component mount
        await tenancyStore.findOrCreateTenant(this.subdomain);

        if (tenancyStore.tenant) {
            this.tenantName = tenancyStore.tenant.name;
            this.tenantImage = tenancyStore.tenant.logoUrl;
        } else {
            console.error("Tenant could not be found or created");
        }

        new ScrollSpy(document.body, {
            target: '#sidebar-bootstrap',
            offset: 200,
        });
    },
};
</script>
<template>
    <div class="container py-5 h-100">
        <h2 class="mb-4 text-center">Panel de Administrador</h2>
        <div class="row justify-content-center align-items-center h-100">
            <div class="col-xl-9">
                <!-- edit tenant name -->
                <div id="edit-tenant" class="mb-5">
                    <h4>Editar Nombre de su Negocio</h4>
                    <p>Por defecto el Nombre de su Negocio es el subdominio que posee.</p>
                    <div class="col card shadow-lg">
                        <div class="card-body">
                            <form @submit.prevent="updateTenant">
                                <div class="mb-4">
                                    <label for="tenantName" class="form-label">Nombre del Negocio:</label>
                                    <input type="text" class="form-control" id="tenantName" v-model="tenantName"
                                        required>
                                </div>
                                <div id="tenant-logo" class="img-container mb-3">
                                    <img :src="imagePreview || tenantImage" alt="logo" class="img-fluid img-thumbnail"
                                        style="max-height: 150px;">
                                </div>
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
                                        v-model="uploadImage">
                                    <label class="form-check-label" for="uploadImageCheckbox">Subir Logo</label>
                                </div>
                                <div v-if="uploadImage" class="mb-4">
                                    <input type="file" class="form-control" id="logoImg" @change="previewImage"
                                        accept="image/*">
                                </div>
                                <button type="submit" class="btn btn-primary">Aceptar</button>
                            </form>
                        </div>
                    </div>
                </div>
                <hr>
                <!-- Assign new role to employee -->
                <div id="asign-role-employees" class="mb-5">
                    <h4 class="mb-3">Asignar nuevo rol a empleado</h4>
                    <p class="mb-3">Busque su empleado en el buscador y seleccione el rol que desea asignar.</p>
                    <div class="card shadow-lg">
                        <div class="card-body">
                            <form @submit.prevent="assignRole" class="mb-3">
                                <SearchInput v-model="searchQuery" :results="searchResults"
                                    placeholder="Busque un empleado por su cédula..." @input="searchEmployees"
                                    @select="selectUser" class="form-control mb-3" />
                                <!-- Display selected employee information -->
                                <div v-if="selectedUser" class="mb-3 p-3 border rounded">
                                    <h5>Información del empleado seleccionado</h5>
                                    <p><strong>Nombre:</strong> {{ selectedUser.firstName + ' ' + selectedUser.lastName
                                        }}</p>
                                    <p><strong>Cédula:</strong> {{ selectedUser.identification }}</p>
                                    <p><strong>Email:</strong> {{ selectedUser.email }}</p>
                                    <p><strong>Teléfono:</strong> {{ selectedUser.phoneNumber }}</p>
                                    <p><strong>Rol:</strong> {{ selectedUser.role }}</p>
                                </div>
                                <div class="mb-3">
                                    <div class="dropdown">
                                        <button class="btn btn-secondary dropdown-toggle" type="button"
                                            data-bs-toggle="dropdown" aria-expanded="false">
                                            {{ selectedRole ? selectedRole : 'Seleccione un rol...' }}
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li v-for="role in roles" :key="role">
                                                <a class="dropdown-item" href="#" @click="selectRole(role)">{{ role
                                                    }}</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary">Aceptar</button>
                            </form>
                        </div>
                    </div>
                </div>
                <hr>
                <!-- Assign new suscription to client -->
                <div id="asign-role-clients" class="mb-5">
                    <h4 class="mb-3">Asignar suscripción a cliente</h4>
                    <p class="mb-3">Busque su cliente en el buscador y seleccione la suscripción que desea asignar.</p>
                    <div class="card shadow-lg">
                        <div class="card-body">
                            <div class="mb-3">
                                <!-- Searching input -->
                                <SearchInput v-model="searchClientPlan" :results="searchClientPlanResults"
                                    placeholder="Busque un cliente por su cédula..." @input="searchClientsForPlan"
                                    @select="selectClientForPlan" class="form-control mt-3 mb-3" />
                                <!-- Display selected client information -->
                                <div v-if="selectedClientPlan" class="mb-3 p-3 border rounded">
                                    <h5>Información del cliente seleccionado</h5>
                                    <p><strong>Nombre:</strong> {{ selectedClientPlan.firstName + ' ' +
                                selectedClientPlan.lastName }}</p>
                                    <p><strong>Cédula:</strong> {{ selectedClientPlan.identification }}</p>
                                    <p><strong>Email:</strong> {{ selectedClientPlan.email }}</p>
                                    <p><strong>Teléfono:</strong> {{ selectedClientPlan.phoneNumber }}</p>
                                </div>
                                <div class="mb-3 text-center">
                                    <h5>Seleccione una suscripción</h5>
                                    <div class="d-flex justify-content-center">
                                        <button v-for="plan in plans" :key="plan.name" @click="selectPlan(plan.name)"
                                            :class="[getPlanButtonClass(plan.name), { 'selected': selectedPlan === plan.name }]"
                                            class="btn m-2 plan-button">
                                            {{ plan.name }}<br>{{ plan.price }}
                                        </button>
                                    </div>
                                </div>
                                <button class="btn btn-primary" @click="assignClientPlan()">Aceptar</button>
                            </div>
                        </div>
                    </div>
                </div>
                <hr>
                <!-- Assign coupons to clients -->
                <div id="assign-coupons" class="mb-5">
                    <h4 class="mb-3">Área de cupones para tus clientes</h4>
                    <p class="mb-3">Seleccione el cupón que desea asignar y busque el cliente en el buscador.</p>
                    <div class="card shadow-lg">
                        <div class="card-body">
                            <!-- Assign existing coupon or create coupon -->
                            <div class="mb-3 form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio1"
                                    value="option1" v-model="selectedCouponOption">
                                <label class="form-check-label" for="inlineRadio1">Asignar cupón existente</label>
                            </div>
                            <div class="mb-3 form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="couponOptions" id="inlineRadio2"
                                    value="option2" v-model="selectedCouponOption">
                                <label class="form-check-label" for="inlineRadio2">Registrar cupón nuevo</label>
                            </div>

                            <!-- Assign Existing Coupon Section -->
                            <div v-if="selectedCouponOption === 'option1'" class="mt-3">
                                <h5>Seleccione un cupón existente</h5>
                                <p v-if="coupons.length === 0">No hay cupones registrados.</p>
                                <div class="row">
                                    <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="(coupon, index) in coupons"
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
                                                        <template
                                                            v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                            <input v-model="editingCoupon.name" class="form-control" />
                                                        </template>
                                                        <template v-else>
                                                            {{ coupon.name }}
                                                        </template>
                                                    </h6>
                                                    <div class="btn-group" role="group">
                                                        <button class="btn btn-transparent btn-sm me-1"
                                                            v-if="editingCoupon && editingCoupon.id === coupon.id"
                                                            @click.prevent="saveCoupon">
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
                                                <div class="img-container text-center mb-3">
                                                    <!-- Image Display -->
                                                    <img :src="coupon.qrFileUrl" alt="QR Code"
                                                        class="img-fluid img-thumbnail" style="max-height: 150px;">
                                                </div>
                                                <p class="card-text"><strong>Código:</strong>
                                                    <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                        <input v-model="editingCoupon.couponCode"
                                                            class="form-control" />
                                                    </template>
                                                    <template v-else>
                                                        {{ coupon.couponCode }}
                                                    </template>
                                                </p>
                                                <p class="card-text"><strong>Saldo:</strong>
                                                    <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                        <input v-model="editingCoupon.balance" class="form-control" />
                                                    </template>
                                                    <template v-else>
                                                        ${{ coupon.balance }}
                                                    </template>
                                                </p>
                                                <p class="card-text">
                                                    <strong>Expiración: </strong>
                                                    <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                                        <div class="datepicker-wrapper">
                                                            <datepicker id="datepicker2"
                                                                class="form-control custom-datepicker"
                                                                v-model="editingCoupon.expiration"
                                                                aria-describedby="datepicker1-addon1">
                                                            </datepicker>
                                                        </div>
                                                    </template>
                                                    <template v-else>{{ coupon.expiration }}</template>
                                                </p>
                                                <p class="card-text"><strong>Estado:</strong></p>
                                                <div class="flex-1">
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
                                <!-- Searching input -->
                                <SearchInput v-model="searchClientCoupon" :results="searchClientCouponResults"
                                    placeholder="Busque un cliente por su cédula..." @input="searchClientsForCoupon"
                                    @select="selectClientForCoupon" class="form-control mt-3 mb-3" />
                                <!-- Display selected client information -->
                                <div v-if="selectedClientCoupon" class="mb-3 p-3 border rounded">
                                    <h5>Información del cliente seleccionado</h5>
                                    <p><strong>Nombre:</strong> {{ selectedClientCoupon.firstName + ' ' +
                                selectedClientCoupon.lastName }}</p>
                                    <p><strong>Cédula:</strong> {{ selectedClientCoupon.identification }}</p>
                                    <p><strong>Email:</strong> {{ selectedClientCoupon.email }}</p>
                                    <p><strong>Teléfono:</strong> {{ selectedClientCoupon.phoneNumber }}</p>
                                </div>
                                <button @click="assignExistingCoupon" class="btn btn-primary mt-3">Asignar cupón
                                    existente</button>
                            </div>

                            <!-- Create and Assign New Coupon Section -->
                            <div v-if="selectedCouponOption === 'option2'" class="mt-3">
                                <h5>Crear cupón</h5>
                                <div class="row mb-3">
                                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                                        <label for="couponName" class="form-label">Nombre</label>
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="couponName"
                                                v-model="couponName">
                                        </div>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                                        <label for="couponCode" class="form-label">Código</label>
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="couponCode"
                                                v-model="couponCode">
                                        </div>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                                        <label for="couponAmount" class="form-label">Saldo del cupón</label>
                                        <div class="input-group">
                                            <span class="input-group-text">$</span>
                                            <input type="number" class="form-control" id="couponAmount"
                                                v-model="couponAmount">
                                        </div>
                                    </div>
                                    <div class="col-12 col-md-6 col-lg-3 mb-3">
                                        <label for="couponExp" class="form-label">Fecha de expiración</label>
                                        <div class="datepicker-wrapper">
                                            <datepicker id="datepicker1" class="form-control custom-datepicker"
                                                v-model="couponExp" aria-describedby="datepicker1-addon1">
                                            </datepicker>
                                        </div>
                                    </div>
                                </div>
                                <label for="qrFile" class="form-label">Cargar QR</label>
                                <input type="file" id="qrFile" class="form-control" @change="handleFileUpload">
                                <div v-if="qrPreview" class="mt-2">
                                    <img :src="qrPreview" class="img-thumbnail" alt="coupon-preview"
                                        style="max-height: 200px;">
                                </div>
                                <button v-if="!assignTheCoupon" @click="createCoupon" class="btn btn-primary mt-3">Crear
                                    cupón</button>
                                <div class="mb-3 mt-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="assignCheckbox"
                                        v-model="assignTheCoupon">
                                    <label class="form-check-label" for="assignCheckbox">Asignar cupón</label>
                                </div>
                                <!-- Searching input -->
                                <SearchInput v-if="assignTheCoupon" v-model="searchClientCoupon"
                                    :results="searchClientCouponResults"
                                    placeholder="Busque un cliente por su cédula..." @input="searchClientsForCoupon"
                                    @select="selectClientForCoupon" class="form-control mt-3 mb-3" />

                                <!-- Display selected client information -->
                                <div v-if="selectedClientCoupon && assignTheCoupon" class="mb-3 p-3 border rounded">
                                    <h5>Información del cliente seleccionado</h5>
                                    <p><strong>Nombre:</strong> {{ selectedClientCoupon.firstName + ' ' +
                                selectedClientCoupon.lastName }}</p>
                                    <p><strong>Cédula:</strong> {{ selectedClientCoupon.identification }}</p>
                                    <p><strong>Email:</strong> {{ selectedClientCoupon.email }}</p>
                                    <p><strong>Teléfono:</strong> {{ selectedClientCoupon.phoneNumber }}</p>
                                </div>
                                <button v-if="assignTheCoupon" @click="createAndAssignCoupon"
                                    class="btn btn-primary mt-3">Crear
                                    y Asignar
                                    cupón</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- #sidebar-bootstrap -->
            <div class="col-xl-3">
                <nav id="sidebar-bootstrap" class="navbar navbar-sticky d-none d-xl-block">
                    <nav class="nav">
                        <nav-scroll-to target="#edit-tenant" data-toggle="scroll-to">Editar Negocio</nav-scroll-to>
                        <nav-scroll-to target="#asign-role-employees" data-toggle="scroll-to">Asignación de Roles a
                            empleadp</nav-scroll-to>
                        <nav-scroll-to target="#asign-role-clients" data-toggle="scroll-to">Asignación de Roles a
                            clientes</nav-scroll-to>
                        <nav-scroll-to target="#asign-coupons" data-toggle="scroll-to">Área de
                            cupones</nav-scroll-to>
                    </nav>
                </nav>
            </div>
        </div>
    </div>

</template>
<style>
.card-body {
    position: relative;
}

.btn-group .btn {
    background-color: transparent;
    border: none;
    margin-right: 0.2rem;
    /* Add some spacing between buttons */
    padding: 0.25rem;
    /* Add padding to make buttons more clickable */
}

.btn-group .btn i {
    font-size: 1rem;
    /* Adjust icon size if needed */
}

.btn-group .btn:last-child {
    margin-right: 0;
    /* Remove the margin for the last button */
}

.card-title {
    margin-bottom: 0.5rem;
}

.form-control-sm {
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
}

img.img-thumbnail {
    max-height: 150px;
}

.img-container {
    text-align: center;
}

.badge {
    font-size: 0.75rem;
    padding: 0.25em 0.4em;
}

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

.card:hover {
    background-color: #f0f0f0;
}

.card.selected {
    background-color: #e9ecef;
}

/* Custom styles for the plan buttons */
.btn-basic {
    background-color: #f8d1d1;
    /* Pastel color for Basico */
    color: #000;
}

.btn-plata {
    background-color: #d1e7f8;
    /* Pastel color for Plata */
    color: #000;
}

.btn-oro {
    background-color: #f8e7d1;
    /* Pastel color for Oro */
    color: #000;
}

.plan-button {
    font-size: 1.25rem;
    padding: 1rem 2rem;
    border: 2px solid transparent;
}

.selected.btn-basic {
    background-color: #007bff;
    border-color: #f8d1d1;
    color: black;
}

.selected.btn-plata {
    background-color: #007bff;
    border-color: #d1e7f8;
    color: black;
}

.selected.btn-oro {
    background-color: #007bff;
    border-color: #f8e7d1;
    color: black;
}

.btn:hover {
    color: #fff;
    background-color: #007bff;
}
</style>