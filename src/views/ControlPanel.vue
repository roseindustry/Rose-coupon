<script>
import { db, storage } from '../firebase/init';
import { ref as dbRef, push, update, get, set, remove, query, orderByChild, equalTo } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { useTenancyStore } from '@/stores/tenancy';
// import { useUserStore } from '@/stores/user-role';
// import { getSubdomain } from '@/utils/subdomain';
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
            // searchQuery: '',
            // searchResults: [],
            clients: [],
            // selectedRole: null,
            // roles: ['Gerente', 'Cajero', 'Mesero', 'Admin'],

            // Client suscription assignment search properties
            searchClientPlan: '',
            searchClientPlanResults: [],
            selectedClientPlan: null,
            selectedPlan: null,
            plans: [
                { name: 'Basico', text: '$0', price: 0, icon: 'fa fa-leaf' },
                { name: 'Plata', text: '$5', price: 5, icon: 'fa fa-gem' },
                { name: 'Oro', text: '$10', price: 10, icon: 'fa fa-crown' }
            ],

            // Client Coupon assignment search properties
            searchClientCoupon: '',
            searchClientCouponResults: [],
            selectedClientCoupon: null,
            selectedCoupon: null,
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

            // Other properties
            tenantName: '',
            tables: 0,
            tenantImage: null,
            uploadImage: false,
            imageFile: null,
            imagePreview: null,
            subdomain: null,
            selectedUser: null,
            selectedClient: null,
        };
    },
    watch: {
        selectedCouponOption(newOption) {
            this.clearData(newOption);
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
        // async getTenantId() {
        //     const tenancyStore = useTenancyStore();
        //     await tenancyStore.findOrCreateTenant();
        //     return tenancyStore.tenant.key;
        // },
        // Tenant updates
        // async updateTenant() {
        //     const tenancyStore = useTenancyStore();

        //     let imageUrl = null;
        //     // Check if an image was selected for update and get URL
        //     if (this.imageFile) {
        //         imageUrl = await this.uploadLogoToStorage(this.imageFile);
        //         // Reset input type file
        //         // Update tenantImage with the new URL
        //         this.tenantImage = imageUrl;
        //         this.uploadImage = null;
        //         this.resetFileInputAndPreview();
        //     }

        //     // Update tenant name and optionally the logo URL
        //     await tenancyStore.updateTenantDetails(this.tenantName, imageUrl);

        //     this.showToast('Información guardada con éxito!');
        // },
        // async uploadLogoToStorage(imageFile) {
        //     let imageUrl = null;

        //     try {
        //         const sRef = storageRef(storage, `tenantLogos/${imageFile.name}`);
        //         const uploadResult = await uploadBytes(sRef, imageFile);
        //         imageUrl = await getDownloadURL(uploadResult.ref);
        //         console.log('Logo uploaded:', imageUrl);
        //     } catch (error) {
        //         console.error('Error uploading image:', error);
        //     }

        //     return imageUrl;
        // },
        // previewImage(event) {
        //     const file = event.target.files[0];
        //     if (file) {
        //         this.imageFile = file;
        //         this.imagePreview = URL.createObjectURL(file);
        //     } else {
        //         this.imagePreview = null;
        //         this.imageFile = null;
        //     }
        // },
        // resetFileInputAndPreview() {
        //     const fileInput = document.getElementById('logoImg');
        //     fileInput.value = '';
        //     this.imagePreview = '';
        // },       

        //Assign role to employees
        // async searchEmployees() {
        //     await this.searchUsers(this.searchQuery, role => role !== 'cliente', 'searchResults');
        // },
        // selectUser(user) {
        //     this.selectedUser = user;
        //     this.searchQuery = '';
        //     this.searchResults = [];
        // },
        // selectRole(role) {
        //     this.selectedRole = role;
        // },
        // async assignRole() {
        //     if (!this.selectedUser || !this.selectedRole) {
        //         alert("Por favor selecciona un empleado y un rol antes de asignar.");
        //         return;
        //     }

        //     const userId = this.selectedUser.uid; // Ensure you have a uid property in your user objects
        //     const updatedRole = this.selectedRole;

        //     const roleRef = dbRef(db, `Users/${userId}`);

        //     try {
        //         await update(roleRef, { role: updatedRole });

        //         this.showToast('Rol asignado con éxito!');

        //         // Reset selection if needed
        //         this.selectedUser = null;
        //         this.selectedRole = null;
        //         this.searchQuery = '';
        //     } catch (error) {
        //         console.error("Error updating role:", error);
        //         alert("La asignacion de rol fallo.");
        //     }
        // },

        // async searchUsers(query, roleFilter, resultState) {
        //     if (query.length > 2) {
        //         const userStore = useUserStore();
        //         let allUsers = await userStore.searchUsers(query);
        //         this[resultState] = allUsers.filter(user => roleFilter(user.role));
        //     } else {
        //         this[resultState] = [];
        //     }
        // },

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

        //Credit section
        async approveCredit(client) {
            console.log("Credit of $500 approved for: ", client.firstName + " " + client.lastName);
        },
        async disapproveCredit(client) {
            console.log("Credit of $500 dissapproved for: ", client.firstName + " " + client.lastName)
        },

        //Assign Suscription to clients
        searchClientsForPlan() {
            if (!this.searchClientPlan.trim()) {
                this.searchClientPlanResults = [];
                return;
            }

            const searchInput = this.searchClientPlan.toLowerCase();

            this.searchClientPlanResults = this.clients.filter(client => {
                // Ensure client.identification and other fields are strings
                const identification = (client.identification || '').toString().toLowerCase();
                const name = (client.firstName + ' ' + client.lastName).toLowerCase();

                return identification.includes(searchInput) || name.includes(searchInput);
            });
        },
        selectClientForPlan(client) {
            this.selectedClientPlan = client;
            this.searchClientPlan = '';
            this.searchClientPlanResults = [];
        },
        selectPlan(plan) {
            this.selectedPlan = plan;
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

            const clientId = this.selectedClientPlan.id;

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
                name: selectedPlanDetails.name,
                status: true, // Set the default status as true 'active'
                price: selectedPlanDetails.price,
                payDay: payDay,
                isPaid: false, // Set the default as unpaid
                icon: selectedPlanDetails.icon
            };

            try {
                // Assign the subscription details to the client's data in Firebase
                const userPlanRef = dbRef(db, `Users/${clientId}/subscription`);
                await update(userPlanRef, subscriptionData);

                this.showToast('Suscripción asignada con éxito!');
                // Reset selection after assigning the plan
                this.selectedPlan = null;
                this.selectedClientPlan = null;
                this.searchClientPlan = '';
            } catch (error) {
                console.error('Error assigning plan:', error);
                alert('La asignación de la suscripción falló.');
            }
        },
    },
    async mounted() {
        // const tenancyStore = useTenancyStore();
        // this.subdomain = getSubdomain();
        this.fetchClients();

        // // Automatically find or create tenant upon component mount
        // await tenancyStore.findOrCreateTenant(this.subdomain);

        // if (tenancyStore.tenant) {
        //     this.tenantName = tenancyStore.tenant.name;
        //     this.tenantImage = tenancyStore.tenant.logoUrl;
        // } else {
        //     console.error("Tenant could not be found or created");
        // }

        new ScrollSpy(document.body, {
            target: '#sidebar-bootstrap',
            offset: 200,
        });
    },
};
</script>
<template>
    <div class="container py-5 h-100">
        <h2 class="mb-4 text-center">PANEL DE ADMINISTRADOR</h2>
        <div class="row justify-content-center align-items-center h-100">
            <div class="col-xl-9">
                <!-- edit tenant name -->
                <!-- <div id="edit-tenant" class="mb-5">
                    <h4>Editar su Negocio</h4>
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
                                not working yet -->
                <!-- <hr>
                                <div class="mb-4">
                                    <label for="tenantTables" class="form-label"># de Mesas del Negocio:</label>
                                    <input type="number" class="form-control" id="tenantTables" v-model="tables"
                                        required>
                                </div>
                                <button type="submit" class="btn btn-primary">Actualizar</button>
                            </form>
                        </div>
                    </div>
                </div>
                <hr> -->
                <!-- Assign new role to employee -->
                <!-- <div id="asign-role-employees" class="mb-5">
                    <h4 class="mb-3">Asignar nuevo rol a empleado</h4>
                    <p class="mb-3">Busque su empleado en el buscador y seleccione el rol que desea asignar.</p>
                    <div class="card shadow-lg">
                        <div class="card-body">
                            <form @submit.prevent="assignRole" class="mb-3">
                                <SearchInput v-model="searchQuery" :results="searchResults"
                                    placeholder="Busque un empleado por su cédula..." @input="searchEmployees"
                                    @select="selectUser" class="form-control mb-3" />
                                 Display selected employee information -->
                <!-- <div v-if="selectedUser" class="mb-3 p-3 border rounded">
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
                <hr>  -->
                
                <!-- Assign new subscription to client -->
                <div id="assign-role-clients" class="mb-5">
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

                                <!-- Subscription Plan Selection -->
                                <div class="mb-3 text-center">
                                    <h5>Seleccione una suscripción</h5>
                                    <div class="d-flex justify-content-center">
                                        <!-- Loop through the plans array and display buttons for each plan -->
                                        <button v-for="plan in plans" :key="plan.name" @click="selectPlan(plan.name)"
                                            :class="[getPlanButtonClass(plan.name), { 'selected': selectedPlan === plan.name }]"
                                            class="btn m-2 plan-button">
                                            {{ plan.name }}<br>{{ plan.text }}
                                        </button>
                                    </div>
                                </div>

                                <!-- Confirmation button to assign the selected subscription -->
                                <button class="btn btn-primary" @click="assignClientPlan()">Aceptar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- #sidebar-bootstrap -->
            <div class="col-xl-3">
                <nav id="sidebar-bootstrap" class="navbar navbar-sticky d-none d-xl-block">
                    <nav class="nav">
                        <!-- <nav-scroll-to target="#edit-tenant" data-toggle="scroll-to">Editar Negocio</nav-scroll-to>
                        <nav-scroll-to target="#asign-role-employees" data-toggle="scroll-to">Asignación de Roles a
                            empleado</nav-scroll-to> -->
                        <nav-scroll-to target="#asign-role-clients" data-toggle="scroll-to">Asignar Suscripción a
                            cliente</nav-scroll-to>
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