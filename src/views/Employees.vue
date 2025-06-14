<script>
import { ref as dbRef, query, orderByChild, equalTo, get, update, remove } from 'firebase/database';
import { db, functions } from '@/firebase/init';
import { httpsCallable } from 'firebase/functions';
import PageHeader from "@/components/app/PageHeader.vue";
import StatCard from '@/components/app/StatCard.vue';
import SearchCard from '@/components/app/SearchCard.vue';
import { Modal } from 'bootstrap';
import { showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'

export default {
    components: {
        PageHeader,
        StatCard,
        SearchCard,
    },
    data() {
        return {
            employee: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
                role: '',
            },
            selectedEmployee: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
                state: '',
                municipio: '',
                parroquia: '',
                role: '',
            },

            venezuelanStates: [
                "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas",
                "Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital",
                "Falcón", "Guárico", "Lara", "Mérida", "Miranda",
                "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira",
                "Trujillo", "Vargas", "Yaracuy", "Zulia"
            ],
            municipios: [],
            parroquias: [],

            employees: [],

            currentEditing: null,
            searchQuery: null,

            loading: false,
            currentPage: 1,
            itemsPerPage: 10,
        }
    },
    async mounted() {
        await this.fetchEmployees();
    },
    computed: {
        filteredUsers() {
            // Filter clients by search input
            const trimmedSearchQuery = this.searchQuery?.trim().toString().toLowerCase();
            if (!trimmedSearchQuery) {
                return this.employees;
            }
            return this.employees.filter(employee => {
                const identification = employee.identification?.toString().toLowerCase() || '';
                const firstName = employee.firstName?.toLowerCase() || '';
                const lastName = employee.lastName?.toLowerCase() || '';

                return (
                    identification.includes(trimmedSearchQuery) ||
                    firstName.includes(trimmedSearchQuery) ||
                    lastName.includes(trimmedSearchQuery)
                );
            });
        },
        paginatedFilteredUsers() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.filteredUsers.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        }
    },
    methods: {
        displayMunicipios(state) {
            const z = venezuela.estado(state, { municipios: true });
            const munis = z.municipios;
            if (munis) {
                this.municipios = munis;
            }
        },
        displayParroquias(municipio) {
            const y = venezuela.municipio(municipio, { parroquias: true });
            this.parroquias = y.parroquias;
        },
        resetForm() {
            // Reset form fields
            this.employee = {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
                sector: '',
                address: ''
            };
        },
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const localDateDay = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
            const day = String(localDateDay.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        },
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },

        async fetchEmployees() {
            this.loading = true;

            try {
                const usersRef = dbRef(db, 'Users');

                // Query users with the 'mesero' role
                const meseroQuery = query(usersRef, orderByChild('role'), equalTo('mesero'));
                const meseroSnapshot = await get(meseroQuery);
                const meseroUsers = meseroSnapshot.exists() ? meseroSnapshot.val() : {};

                // Query users with the 'promotora' role
                const promotoraQuery = query(usersRef, orderByChild('role'), equalTo('promotora'));
                const promotoraSnapshot = await get(promotoraQuery);
                const promotoraUsers = promotoraSnapshot.exists() ? promotoraSnapshot.val() : {};

                // Merge mesero and promotora users and transform to array
                const combinedUsers = { ...meseroUsers, ...promotoraUsers };
                this.employees = Object.entries(combinedUsers).map(([uid, user]) => ({
                    uid,
                    ...user
                }));

            } catch (error) {
                console.error('Error fetching employees:', error);
                this.employees = [];
            } finally {
                this.loading = false;
            }
        },

        async createEmployee() {
            if (!this.employee.firstName || !this.employee.lastName || !this.employee.identification || !this.employee.email) {
                alert('Por favor, complete todos los campos obligatorios: Nombre, Apellido, cedula o email.');
                return;
            }

            try {
                this.loading = true;

                const userData = {
                    firstName: this.employee.firstName,
                    lastName: this.employee.lastName,
                    identification: this.employee.identification,
                    email: this.employee.email,
                    role: this.employee.role,
                };

                if (this.employee.phoneNumber) {
                    userData.phoneNumber = this.employee.phoneNumber;
                }

                // Call Cloud Function to create the employee
                const createClientFunction = httpsCallable(functions, 'createUser');
                const response = await createClientFunction({ userData });

                if (response.data.success) {
                    showToast("Nuevo empleado registrado con exito! Se ha enviado la contraseña al correo.");

                    // Reset form
                    this.resetForm();
                    this.fetchEmployees();
                } else {
                    alert('Error al crear al empleado: ' + response.data.message);
                }

            } catch (error) {
                console.error('Error creating employee:', error);
                alert('Error creating employee.');
            } finally {
                this.loading = false;
            }
        },
        editEmployee(employee) {
            // Set current employee to edit mode
            this.selectedEmployee = { ...employee };
            // Show the edit modal
            const editModal = new Modal(document.getElementById('editEmployeeModal'));
            editModal.show();
        },
        cancelEdit() {
            // Reset editing state
            this.currentEditing = null;
        },
        async updateEmployee(employee) {
            const employeeId = employee.uid;

            try {
                this.loading = true;

                // Create an updateData object, but only include non-empty fields
                const updateData = {};

                if (this.selectedEmployee.firstName) updateData.firstName = this.selectedEmployee.firstName;
                if (this.selectedEmployee.lastName) updateData.lastName = this.selectedEmployee.lastName;
                if (this.selectedEmployee.identification) updateData.identification = this.selectedEmployee.identification;
                if (this.selectedEmployee.phoneNumber) updateData.phoneNumber = this.selectedEmployee.phoneNumber;
                if (this.selectedEmployee.state) updateData.state = this.selectedEmployee.state;
                if (this.selectedEmployee.municipio) updateData.municipio = this.selectedEmployee.municipio;
                if (this.selectedEmployee.parroquia) updateData.parroquia = this.selectedEmployee.parroquia;

                // Only proceed if there is something to update
                if (Object.keys(updateData).length > 0) {
                    const userRef = dbRef(db, `Users/${employeeId}`);
                    await update(userRef, updateData);

                    // Update email via Cloud Function if the email is changed
                    const newEmail = this.selectedEmployee.email;
                    if (newEmail && employee.email !== newEmail) {

                        const updateEmailFunction = httpsCallable(functions, 'updateUserEmail');
                        await updateEmailFunction({ uid: employeeId, newEmail });
                    }

                    this.cancelEdit();
                    this.fetchEmployees();

                    showToast("Información actualizada!");
                } else {
                    alert('No hay campos para actualizar.');
                }
            } catch (error) {
                console.error('Error updating info:', error);
                alert('La actualizacion de datos falló.');
            } finally {
                // Hide the loader
                this.loading = false;
            }
        },
        deleteEmployee(employee, index) {
            console.log(employee.uid);
            // Confirmation dialog
            if (confirm("¿Desea borrar este empleado?")) {
                // User clicked "OK"

                try {
                    // Call the Cloud Function to delete the user from Authentication
                    const deleteClientFunction = httpsCallable(functions, 'deleteUser');
                    deleteClientFunction({ uid: employee.uid });
                    console.log('Deleted from authentication: ', employee.email);

                    // Remove employee from the database
                    const employeeRef = dbRef(db, `Users/${employee.uid}`);

                    remove(employeeRef);
                    console.log('Deleted from database: ', employee.firstName + ' ' + employee.lastName);

                    // Show success toast
                    showToast("Borrado del registro y autenticación.");

                    // Remove the employee from the UI
                    this.employees.splice(index, 1);
                } catch (error) {
                    console.error('Error deleting employee:', error);
                }
            }
        },
    }
}
</script>
<template>
    <div class="container">
        <!-- Header -->
        <PageHeader :isAdmin="true" title="Empleados" icon="fa fa-hammer" :actions="[
            {
                icon: 'fa fa-user-plus',
                text: 'Agregar Empleado',
                class: 'btn-theme',
                modalToggle: 'modal',
                modalTarget: '#addEmployeeModal',
                onClick: () => { }
            }
        ]" />

        <div class="employees-wrapper">
            <div class="filters-wrapper p-4">
                <!-- Header with stats and actions -->
                <div class="row justify-content-between align-items-center g-3">
                    <div class="col-md-4">
                        <StatCard title="Total de Empleados" icon="fa-users" :value="employees.length" />
                    </div>

                    <!-- Search Bar -->
                    <div class="col-md-8">
                        <SearchCard title="Buscar empleado" v-model="searchQuery" placeholder="Buscar por nombre o cedula..." />
                    </div>
                </div>
            </div>

            <!-- Employees List -->
            <div class="affiliates-list-wrapper">
                <!-- Empty State -->
                <div v-if="!paginatedFilteredUsers" class="d-flex justify-content-center align-items-center min-vh-50">
                    <div class="text-center">
                        <div class="mb-3">
                            <i class="fa fa-users text-secondary opacity-25" style="font-size: 5em"></i>
                        </div>
                        <h5 class="text-secondary">No hay empleados registrados.</h5>
                    </div>
                </div>

                <template v-else>
                    <div class="employee-item" v-for="(employee, index) in paginatedFilteredUsers" :key="employee.uid">
                        <div class="employee-header justify-content-between">
                            <div class="employee-info">
                                <div class="d-flex align-items-center gap-3">
                                    <!-- Logo -->
                                    <div class="employee-logo">
                                        <!-- Image Display -->
                                        <div class="employee-avatar">
                                            <i class="fas fa-user"></i>
                                        </div>

                                        <!-- Loading Spinner -->
                                        <div v-if="loading"
                                            class="spinner-overlay d-flex justify-content-center align-items-center">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Cargando...</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Info -->
                                    <div class="employee-details">
                                        <h5 class="employee-name">{{ employee.firstName }} {{ employee.lastName }}</h5>
                                        <!-- {{ affiliate.id }} -->
                                        <div class="employee-location">
                                            <i class="fas fa-map-marker-alt me-2"></i>
                                            {{ employee.state }}, {{ employee.municipio }}
                                        </div>
                                        <div class="employee-contact">
                                            <i class="fab fa-whatsapp me-2"></i>
                                            {{ employee.phoneNumber }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Admin Actions -->
                        <div class="admin-actions">
                            <button class="btn btn-sm btn-outline-info" data-bs-toggle="tooltip" data-bs-placement="top"
                                title="Editar empleado" @click="editEmployee(employee)">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" @click="deleteEmployee(employee, index)">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </template>
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

        <!-- Edit Employee Modal -->
        <div class="modal fade" id="editEmployeeModal" tabindex="-1" aria-labelledby="editEmployeeModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editEmployeeModalLabel">Editar Empleado</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="editFirstName" class="form-label">Nombre <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="editFirstName"
                                    v-model="selectedEmployee.firstName" required />
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="editLastName" class="form-label">Apellido <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="editLastName"
                                    v-model="selectedEmployee.lastName" required />
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="editIdentification" class="form-label">Cédula <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="editIdentification"
                                    v-model="selectedEmployee.identification" required />
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="editEmail" class="form-label">Email <span
                                        class="text-danger">*</span></label>
                                <input type="email" class="form-control" id="editEmail" v-model="selectedEmployee.email"
                                    required />
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="editPhoneNumber" class="form-label">Teléfono</label>
                                <input type="text" class="form-control" id="editPhoneNumber"
                                    v-model="selectedEmployee.phoneNumber" />
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="editRole" class="form-label">Rol <span class="text-danger">*</span></label>
                                <select v-model="selectedEmployee.role" class="form-control" required>
                                    <option value="mesero">Mesero</option>
                                    <option value="promotora">Promotora</option>
                                </select>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Estado</label>
                                <select v-model="selectedEmployee.state"
                                    @change="displayMunicipios(selectedEmployee.state)" class="form-control">
                                    <option value="" disabled selected>Selecciona un estado</option>
                                    <option v-for="state in venezuelanStates" :key="state" :value="state">
                                        {{ state }}
                                    </option>
                                </select>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Municipio</label>
                                <select v-model="selectedEmployee.municipio"
                                    @change="displayParroquias(selectedEmployee.municipio)" class="form-control">
                                    <option value="" disabled selected>Selecciona un municipio</option>
                                    <option v-for="municipio in municipios" :key="municipio" :value="municipio">
                                        {{ municipio }}
                                    </option>
                                </select>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Parroquia</label>
                                <select v-model="selectedEmployee.parroquia" class="form-control">
                                    <option value="" disabled selected>Selecciona una parroquia</option>
                                    <option v-for="parroquia in parroquias" :key="parroquia" :value="parroquia">
                                        {{ parroquia }}
                                    </option>
                                </select>
                            </div>
                        </div>
                        <p class="text-muted"><span class="text-danger">*</span> Campos obligatorios</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-theme" @click="updateEmployee(selectedEmployee)"
                            :disabled="loading">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status"
                                aria-hidden="true"></span>
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Employee Modal -->
        <div class="modal fade" id="addEmployeeModal" tabindex="-1" aria-labelledby="addEmployeeModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addEmployeeModalLabel">Agregar Empleado</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-6 mb-3">
                                <label for="employeeRole">Rol <span class="text-danger">*</span></label>
                                <select v-model="employee.role" class="form-control mt-2" required>
                                    <option value="" disabled selected>Selecciona un rol</option>
                                    <option value="mesero">Mesero</option>
                                    <option value="promotora">Promotora</option>
                                </select>
                            </div>
                            <div class="col-6 mb-3">
                                <label for="empleadoFirstName" class="form-label">Nombre <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="empleadoFirstName"
                                    v-model="employee.firstName" required />
                            </div>
                            <div class="col-6 mb-3">
                                <label for="empleadoLastName" class="form-label">Apellido <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="empleadoLastName"
                                    v-model="employee.lastName" required />
                            </div>
                            <div class="col-6 mb-3">
                                <label for="empleadoIdentification" class="form-label">Cédula <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="empleadoIdentification"
                                    v-model="employee.identification" required />
                            </div>
                            <div class="col-6 mb-3">
                                <label for="empleadoEmail" class="form-label">Email <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="empleadoEmail" v-model="employee.email"
                                    required />
                            </div>
                            <div class="col-6 mb-3">
                                <label for="empleadoPhoneNumber" class="form-label">Teléfono</label>
                                <input type="text" class="form-control" id="empleadoPhoneNumber"
                                    v-model="employee.phoneNumber" />
                            </div>
                        </div>
                        <p>(<span class="text-danger">*</span>) Campos obligatorios.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button :disabled="loading" class="btn btn-theme" @click="createEmployee()">
                            <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                                aria-hidden="true"></span>
                            <span>Guardar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.container .employees-wrapper {
    padding: 0;
}

.employees-wrapper {
    background: #29122f;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filters-wrapper {
    background: linear-gradient(to bottom, rgba(41, 18, 47, 0.95), rgba(41, 18, 47, 0.98));
    border-radius: 16px;
    padding: 1.5rem !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Header Styles */
.employees-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.admin-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}

.admin-actions .btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
}

.admin-actions .btn i {
    font-size: 1rem;
}

/* Stats Card Styles */
.stats-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stats-icon {
    width: 48px;
    height: 48px;
    background: rgba(128, 0, 128, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.stats-icon i {
    font-size: 1.5rem;
    color: purple;
}

.stats-info {
    flex: 1;
}

.stats-label {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
}

.stats-value {
    color: white;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}

.btn-theme {
    background-color: purple;
    border-color: purple;
}

.employee-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #adb5bd;
    font-size: 1.5rem;
}

.employees-list-wrapper {
    background: #29122f;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.employee-item {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.employee-item:last-child {
    border-bottom: none;
}

.employee-name {
    color: #ffffff;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.employee-location,
.employee-contact {
    color: #adb5bd;
    font-size: 0.9rem;
    margin-top: 0.25rem;
}

.employee-actions {
    display: flex;
    justify-content: flex-end;
}

.search-input-wrapper .form-control {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 0.75rem 1rem;
    padding-right: 3rem;
    height: 48px;
    font-size: 1rem;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.search-input-wrapper .form-control:focus {
    background: rgba(0, 0, 0, 0.3);
    border-color: purple;
    box-shadow: 0 0 0 0.25rem rgba(128, 0, 128, 0.25);
}

.search-input-wrapper .form-control::placeholder {
    color: rgba(255, 255, 255, 0.5);
}

@media (max-width: 768px) {
    .filters-wrapper {
        padding: 1rem !important;
    }

    .stats-card {
        padding: 1rem;
        margin-left: 6rem;
        margin-right: 6rem;
    }

    .search-card {
        padding: 1rem;
    }

    .filter-card {
        flex-direction: column;
        padding: 1rem;
    }

    .filter-card .btn,
    .filter-card .dropdown {
        width: 100%;
    }

    .filter-card .dropdown .btn {
        justify-content: space-between;
    }

    .stats-icon {
        width: 40px;
        height: 40px;
    }

    .stats-icon i {
        font-size: 1.25rem;
    }

    .stats-value {
        font-size: 1.25rem;
    }

    .search-input-wrapper .form-control {
        height: 39px;
        font-size: 0.875rem;
    }

    .employee-header {
        flex-direction: column;
        gap: 1rem;
    }

    .employee-info .d-flex {
        width: 100%;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
    }

    .employee-logo {
        width: 90px;
        height: 90px;
        flex-shrink: 0;
    }

    .employee-status {
        position: absolute;
        top: 0;
        right: 0;
    }

    .employee-social {
        flex-wrap: wrap;
    }

    .employee-actions {
        margin-top: 1rem;
    }

    .file-input-wrapper {
        width: 100%;
        max-width: 250px;
    }
}

@media (max-width: 576px) {
    .filters-wrapper {
        padding: 0.75rem !important;
    }

    .search-input-wrapper .form-control {
        font-size: 0.875rem;
        height: 40px;
    }
}

@media (max-width: 480px) {
    .employee-item {
        padding: 1rem;
    }

    .employee-info .d-flex {
        gap: 0.75rem;
    }

    .employee-logo {
        width: 70px;
        height: 70px;
    }
}
</style>