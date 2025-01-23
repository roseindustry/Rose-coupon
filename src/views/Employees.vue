<script>
import { ref as dbRef, query, orderByChild, equalTo, get, push, set, update, remove } from 'firebase/database';
import { ref as storageRef, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, functions } from '@/firebase/init';
import { httpsCallable } from 'firebase/functions';
import { Modal } from 'bootstrap';
import { showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'

export default {
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
        async sendEmail(payload) {
            try {
                const sendEmailFunction = httpsCallable(functions, 'sendEmail');
                await sendEmailFunction(payload);
            } catch (error) {
                console.error('Error sending email:', error);
            }
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

                // Merge mesero and promotora users
                const combinedUsers = { ...meseroUsers, ...promotoraUsers };

                // Get user details from each fetched user
                const getUserDetails = httpsCallable(functions, 'getUserDetails');
                const employeePromises = [];

                for (const [uid, user] of Object.entries(combinedUsers)) {
                    employeePromises.push(
                        getUserDetails(uid)
                            .then(authUser => {
                                if (!authUser || !authUser.data) {
                                    console.warn(`User details not found for UID: ${uid}`);
                                    return null; // Override null cases
                                }
                                return {
                                    uid,
                                    ...user,
                                    createdAt: authUser.data.creationTime
                                };
                            })
                            .catch(err => {
                                console.error(`Error fetching details for UID: ${uid}`, err);
                                return null; // Handle any errors by returning null
                            })
                    );
                }

                // Wait for all employee data to be fetched, filtering out any null values
                const employeesWithTimestamp = (await Promise.all(employeePromises)).filter(emp => emp !== null);

                // Sort employees by creation time (descending)
                this.employees = employeesWithTimestamp.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
            this.currentEditing = employee.uid;
            this.selectedEmployee = { ...employee };
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
        <h2 class="mb-4 text-center text-uppercase fw-bold">
            Empleados
        </h2>

        <div class="d-flex justify-content-end align-items-center">
            <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#addEmployeeModal"
                style="margin: 14px;">
                <i class="fa fa-plus-circle fa-fw me-1"></i> Agregar Empleado
            </a>
        </div>

        <div class="shadow-lg p-3 mb-5 bg-body rounded">
            <div class="search-box mb-3">
                <input v-model="searchQuery" placeholder="Filtrar empleado por nombre o cedula..." class="form-control">
            </div>

            <div>
                <div class="text-center" v-if="loading">
                    <p>Cargando lista de empleados, puede tardar un minuto...</p>
                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                        aria-hidden="true"></span>
                </div>
                <div v-else>
                    <div class="accordion" id="clientAccordion">
                        <div v-for="(employee, index) in paginatedFilteredUsers" :key="employee.uid"
                            class="accordion-item">
                            <h2 class="accordion-header" :id="'heading' + employee.uid">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                                    :data-bs-target="'#collapse' + employee.uid" aria-expanded="false"
                                    :aria-controls="'collapse' + employee.uid">
                                    {{ employee.firstName + " " + employee.lastName }} - <strong> V{{
                                        employee.identification
                                    }}</strong>
                                    <span v-if="employee.role === 'mesero'" class="badge ms-2">Mesero</span>
                                    <span v-else class="badge ms-2">Promotora</span>
                                </button>
                            </h2>
                            <div :id="'collapse' + employee.uid" class="accordion-collapse collapse"
                                :aria-labelledby="'heading' + employee.uid">
                                <div class="accordion-body">
                                    <div v-if="currentEditing === employee.uid">
                                        <!-- Editable Inputs -->
                                        <ul class="list-group">
                                            <li class="list-group-item">
                                                <label for="firstName">Nombre:</label>
                                                <input type="text" v-model="selectedEmployee.firstName"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label for="lastName">Apellido:</label>
                                                <input type="text" v-model="selectedEmployee.lastName"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label for="identification">Cedula:</label>
                                                <input type="text" v-model="selectedEmployee.identification"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label for="email">Email:</label>
                                                <input type="email" v-model="selectedEmployee.email"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label for="phoneNumber">Teléfono:</label>
                                                <input type="text" v-model="selectedEmployee.phoneNumber"
                                                    class="form-control" />
                                            </li>
                                            <li class="list-group-item">
                                                <label class="form-label">Estado</label>
                                                <select v-model="selectedEmployee.state"
                                                    @change="displayMunicipios(selectedEmployee.state)"
                                                    class="form-control mb-2">
                                                    <option value="" disabled selected>Selecciona un estado</option>
                                                    <option v-for="(state, index) in venezuelanStates" :key="index"
                                                        :value="state">
                                                        {{ state }}
                                                    </option>
                                                </select>
                                            </li>
                                            <li class="list-group-item">
                                                <label class="form-label">Municipio</label>
                                                <select v-model="selectedEmployee.municipio"
                                                    @change="displayParroquias(selectedEmployee.municipio)"
                                                    class="form-control mb-2">
                                                    <option value="" disabled selected>Selecciona un municipio</option>
                                                    <option v-for="(municipio, index) in municipios" :key="index"
                                                        :value="municipio">
                                                        {{ municipio }}
                                                    </option>
                                                </select>
                                            </li>
                                            <li class="list-group-item">
                                                <label class="form-label">Parroquia</label>
                                                <select v-model="selectedEmployee.parroquia" class="form-control mb-2">
                                                    <option value="" disabled selected>Selecciona una parroquia</option>
                                                    <option v-for="(parroquia, index) in parroquias" :key="index"
                                                        :value="parroquia">
                                                        {{ parroquia }}
                                                    </option>
                                                </select>
                                            </li>
                                        </ul>

                                        <!-- Save/Cancel Buttons -->
                                        <div class="d-flex justify-content-center gap-2 mt-3">
                                            <button class="btn btn-sm btn-success"
                                                @click="updateEmployee(employee)">Guardar</button>
                                            <button class="btn btn-sm btn-secondary"
                                                @click="cancelEdit()">Cancelar</button>
                                        </div>
                                    </div>

                                    <div v-else>
                                        <!-- View Mode -->
                                        <ul class="list-group">
                                            <li class="list-group-item"><strong>Nombre:</strong> {{ employee.firstName
                                                }}
                                            </li>
                                            <li class="list-group-item"><strong>Apellido:</strong> {{ employee.lastName
                                                }}
                                            </li>
                                            <li class="list-group-item"><strong>Cedula:</strong> {{
                                                employee.identification }}
                                            </li>
                                            <li class="list-group-item"><strong>Email:</strong> {{ employee.email }}
                                            </li>
                                            <li class="list-group-item"><strong>Teléfono:</strong> {{
                                                employee.phoneNumber
                                            }}</li>
                                            <li class="list-group-item"><strong>Estado:</strong> {{ employee.state }}
                                            </li>
                                            <li class="list-group-item"><strong>Municipio:</strong> {{
                                                employee.municipio
                                            }}</li>
                                            <li class="list-group-item"><strong>Parroquia:</strong> {{
                                                employee.parroquia
                                            }}</li>
                                        </ul>

                                        <!-- Action Buttons -->
                                        <div class="d-flex justify-content-end mt-2">
                                            <button class="btn btn-sm btn-outline-info me-1" data-bs-toggle="tooltip"
                                                data-bs-placement="top" title="Editar empleado"
                                                @click="editEmployee(employee)">
                                                <i class="fa-solid fa-pencil"></i>
                                            </button>
                                            <button class="btn btn-sm btn-outline-danger"
                                                @click="deleteEmployee(employee, index)">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
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
        </div>

        <!-- Modal for Adding New Client -->
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
.btn-theme {
    background-color: purple;
    border-color: purple;
}
</style>