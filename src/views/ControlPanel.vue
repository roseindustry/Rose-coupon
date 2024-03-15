<script>
import { ref } from 'vue';
import { db, storage } from '../firebase/init';
import { ref as dbRef, push, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTenancyStore } from '@/stores/tenancy';
import { useUserStore } from '@/stores/user-role';
import { getSubdomain } from '@/utils/subdomain';
import navscrollto from '@/components/app/NavScrollTo.vue';
import { ScrollSpy } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

export default {
    components: {
        navScrollTo: navscrollto
    },
    data() {
        return {
            searchQuery: '',
            searchResults: [],
            tenantName: '',
            uploadImage: false,
            imageFile: null,
            imagePreview: null,
            subdomain: null,
            selectedRole: null,
            selectedUser: null,
            roles: ['Gerente', 'Cajero', 'Mesero'],
        };
    },
    methods: {
        // Tenant updates
        async updateTenant() {
            const tenancyStore = useTenancyStore();

            let imageUrl = null;
            // Check if an image was selected for update and get URL
            if (this.imageFile) {
                imageUrl = await this.uploadLogoToStorage(this.imageFile);
                // Reset input type file
                this.resetFileInputAndPreview();
            }

            // Update tenant name and optionally the logo URL
            await tenancyStore.updateTenantDetails(this.tenantName, imageUrl);

            Toastify({
                text: "Informacion guardada con exito!",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                stopOnFocus: true,
                style: {
                    background: "linear-gradient(to right, #00b09b, #96c93d)",
                },
            }).showToast();
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
            }
        },
        resetFileInputAndPreview() {
            const fileInput = document.getElementById('logoImg');
            fileInput.value = '';
            this.imagePreview = '';
        },
        // Employees roles
        async searchUsers() {
            if (this.searchQuery.length > 2) {
                const userStore = useUserStore();
                let allUsers = await userStore.searchUsers(this.searchQuery);

                this.searchResults = allUsers.filter(user => user.role !== 'cliente');
            } else {
                this.searchResults = [];
            }
        },
        selectUser(user) {
            console.log(user);
            this.selectedUser = user;
            this.searchQuery = '';
            this.searchResults = [];
        },
        selectRole(role) {
            this.selectedRole = role;
            // You can do other stuff here like making API calls or updating other parts of your component
            console.log(`Selected role: ${role}`);
        },
        async asignRole() {
            if (!this.selectedUser || !this.selectedRole) {
                alert("Please select a user and a role before assigning.");
                return;
            }

            const userId = this.selectedUser.uid; // Ensure you have a uid property in your user objects
            const updatedRole = this.selectedRole;

            const roleRef = dbRef(db, `Users/${userId}`);

            try {
                await update(roleRef, { role: updatedRole });

                Toastify({
                    text: "Rol asignado con exito!",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    stopOnFocus: true,
                    style: {
                        background: "linear-gradient(to right, #00b09b, #96c93d)",
                    },
                }).showToast();

                // Reset selection if needed
                this.selectedUser = null;
                this.selectedRole = null;
                this.searchQuery = '';
            } catch (error) {
                console.error("Error updating role:", error);
                alert("La asignacion de rol fallo.");
            }
        },

    },
    async mounted() {
        const tenancyStore = useTenancyStore();
        this.subdomain = getSubdomain();

        // Automatically find or create tenant upon component mount
        await tenancyStore.findOrCreateTenant(this.subdomain);

        if (tenancyStore.tenant) {
            this.tenantName = tenancyStore.tenant.name;
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
                <!-- Add new tenant -->
                <div id="add-tenant" class="mb-5">
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
                                <div class="mb-3 form-check">
                                    <input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
                                        v-model="uploadImage">
                                    <label class="form-check-label" for="uploadImageCheckbox">Subir Logo</label>
                                </div>
                                <div v-if="uploadImage" class="mb-4">
                                    <label for="menuItemImg" class="form-label">Imagen</label>
                                    <input type="file" class="form-control" id="logoImg" @change="previewImage"
                                        accept="image/*">
                                    <div v-if="imagePreview" class="mt-2">
                                        <img :src="imagePreview" class="img-thumbnail" alt="preview"
                                            style="max-height: 200px;">
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Aceptar</button>
                            </form>
                        </div>
                    </div>
                </div>
                <!-- Asign new role to employee -->
                <div id="asign-role" class="mb-5">
                    <h4>Asignar nuevo role a empleado</h4>
                    <p>Busque su empleado en el buscador y seleccione el role que desea asignar.</p>
                    <div class="col card shadow-lg">
                        <div class="card-body">
                            <form @submit.prevent="asignRole" class="mb-3">
                                <div class="mb-3" id="search-employee">
                                    <input type="text" v-model="searchQuery" @input="searchUsers"
                                        placeholder="Busque un empleado por su cedula..." class="form-control"
                                        autocomplete="off">
                                    <div class="dropdown-menu"
                                        v-show="searchResults.length > 0 || searchQuery.length > 0"
                                        style="display: block;">
                                        <i class="hasNoResults" v-if="searchResults.length === 0">No se encontraron
                                            resultados</i>
                                        <div class="list-autocomplete">
                                            <button type="button" class="dropdown-item" v-for="user in searchResults"
                                                :key="user.uid" @click.prevent="selectUser(user)">
                                                {{ user.identification }} - {{ user.firstName }} {{ user.lastName }}
                                            </button>
                                        </div>

                                    </div>
                                    <div v-if="selectedUser" class="selected-user-details">
                                        Usuario seleccionado: {{ selectedUser.identification }} - {{
                                selectedUser.firstName }}
                                        {{ selectedUser.lastName }}
                                    </div>
                                </div>
                                <div class="dropdown mb-3">
                                    <button class="btn btn-secondary dropdown-toggle" type="button"
                                        data-bs-toggle="dropdown" aria-expanded="false">
                                        {{ selectedRole ? selectedRole : 'Seleccione un rol...' }}
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li v-for="role in roles" :key="role" @click="selectRole(role)">
                                            <a class="dropdown-item" href="#">{{ role }}</a>
                                        </li>
                                    </ul>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Aceptar</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <!-- #sidebar-bootstrap -->
            <div class="col-xl-3">
                <nav id="sidebar-bootstrap" class="navbar navbar-sticky d-none d-xl-block">
                    <nav class="nav">
                        <nav-scroll-to target="#add-tenant" data-toggle="scroll-to">Nuevo Tenant</nav-scroll-to>
                        <nav-scroll-to target="#asign-role" data-toggle="scroll-to">Asignar rol a
                            empleado</nav-scroll-to>
                    </nav>
                </nav>
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
</style>