<template>
    <div class="modal fade" id="addClientModal" tabindex="-1" aria-labelledby="addClientModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content bg-dark">
                <div class="modal-header border-secondary">
                    <h5 class="modal-title text-light" id="addClientModalLabel">
                        <i class="fas fa-user-plus me-2"></i>
                        Agregar Cliente
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" @click="handleClose"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="clientFirstName" class="form-label">
                                    Nombre <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control form-control-sm rounded-0" id="clientFirstName"
                                    v-model="client.firstName" placeholder="Ingrese el nombre" required />
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="clientLastName" class="form-label">
                                    Apellido <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control form-control-sm rounded-0" id="clientLastName"
                                    v-model="client.lastName" placeholder="Ingrese el apellido" required />
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="clientIdentification" class="form-label">
                                    Cédula <span class="text-danger">*</span>
                                </label>
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text bg-dark border-secondary text-light">V-</span>
                                    <input type="text" class="form-control form-control-sm rounded-0" id="clientIdentification"
                                        v-model="client.identification" placeholder="Ingrese la cédula" required />
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="clientEmail" class="form-label">
                                    Email <span class="text-danger">*</span>
                                </label>
                                <input type="email" class="form-control form-control-sm rounded-0" id="clientEmail"
                                    v-model="client.email" placeholder="ejemplo@correo.com" required />
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="form-group">
                                <label for="clientPhoneNumber" class="form-label">
                                    Teléfono <span class="text-danger">*</span>
                                </label>
                                <input type="tel" class="form-control form-control-sm rounded-0" id="clientPhoneNumber"
                                    v-model="client.phoneNumber" placeholder="XXXX-XXXXXXX" required />
                            </div>
                        </div>
                    </div>
                    <div class="alert alert-secondary mt-3 py-2 rounded-0">
                        <small>
                            <i class="fas fa-info-circle me-2"></i>
                            Los campos marcados con <span class="text-danger">*</span> son obligatorios
                        </small>
                    </div>
                </div>
                <div class="modal-footer border-secondary">
                    <button type="button" class="btn btn-sm btn-outline-light" data-bs-dismiss="modal">
                        <i class="fas fa-times me-2"></i>Cancelar
                    </button>
                    <button type="button" class="btn btn-sm btn-theme" @click="createClient" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span v-else>
                            <i class="fas fa-save me-2"></i>Guardar
                        </span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { Modal } from 'bootstrap';
import Swal from 'sweetalert2';

export default {
    name: 'AddClientModal',
    emits: ['client-created'],
    data() {
        return {
            client: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
            },
            isSubmitting: false,
            modal: null
        }
    },
    methods: {
        show() {
            if (!this.modal) {
                this.modal = new Modal(document.getElementById('addClientModal'));
            }
            this.modal.show();
        },
        hide() {
            if (this.modal) {
                this.modal.hide();
            }
        },
        handleClose() {
            this.hide();
            this.resetForm();
        },
        resetForm() {
            this.client = {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
            };
        },
        // Test method to simulate user creation
        async testCreateClient() {
            try {
                this.isSubmitting = true;

                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Create a test user with the form data
                const testUser = {
                    id: 'test-' + Date.now(), // Generate a unique test ID
                    firstName: this.client.firstName,
                    lastName: this.client.lastName,
                    identification: this.client.identification,
                    email: this.client.email,
                    phoneNumber: this.client.phoneNumber,
                    role: 'cliente',
                };

                this.resetForm();
                this.hide();

                // Ask if user wants to continue with verification
                const { isConfirmed } = await Swal.fire({
                    title: '¡Cliente creado exitosamente!',
                    text: '¿Desea continuar con la verificación de contacto y documentos?',
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, continuar',
                    cancelButtonText: 'No, finalizar',
                    confirmButtonColor: '#6f42c1',
                    cancelButtonColor: '#6c757d',
                    reverseButtons: true
                });

                // Emit the event with the test user data
                this.$emit('client-created', {
                    ...testUser,
                    continueVerification: isConfirmed
                });

            } catch (error) {
                console.error('Test error:', error);
                alert('Test error occurred.');
            } finally {
                this.isSubmitting = false;
            }
        },
        async createClient() {
            if (!this.client.firstName || !this.client.lastName || !this.client.identification || !this.client.email || !this.client.phoneNumber) {
                alert('Por favor, complete todos los campos obligatorios: Nombre, Apellido, cedula, email y telefono.');
                return;
            }

            // Test method
            // await this.testCreateClient();
            
            try {
                this.isSubmitting = true;

                const userData = {
                    firstName: this.client.firstName,
                    lastName: this.client.lastName,
                    identification: this.client.identification,
                    email: this.client.email,
                    phoneNumber: this.client.phoneNumber,
                    role: 'cliente',
                };

                // Call Cloud Function to create the client via onRequest
                const response = await fetch('https://us-central1-rose-app-e062e.cloudfunctions.net/createUser', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userData }),
                });

                const result = await response.json();

                if (result.success) {
                    this.resetForm();
                    this.hide();

                    // Ask if user wants to continue with verification
                    const { isConfirmed } = await Swal.fire({
                        title: '¡Cliente creado exitosamente!',
                        text: '¿Desea continuar con la verificación de contacto y documentos?',
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, continuar',
                        cancelButtonText: 'No, finalizar',
                        confirmButtonColor: '#6f42c1',
                        cancelButtonColor: '#6c757d',
                        reverseButtons: true
                    });

                    // Emit the event with the client data
                    this.$emit('client-created', {
                        id: result.userId,
                        ...userData,
                        continueVerification: isConfirmed
                    });
                } else {
                    alert('Error al crear al cliente: ' + result.message);
                }

            } catch (error) {
                console.error('Error creating client:', error);
                alert('Error creating client.');
            } finally {
                this.isSubmitting = false;
            }
        }
    },
    mounted() {
        this.modal = new Modal(document.getElementById('addClientModal'));
    }
};
</script>

<style scoped>
.modal-content {
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
    padding: 1rem 1.5rem;
}

.modal-body {
    padding: 1.5rem;
}

.modal-footer {
    padding: 1rem 1.5rem;
}

.form-control::placeholder,
.form-select::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.alert-secondary {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: #adb5bd;
}

.input-group-text {
    font-size: 0.875rem;
}

.form-control:focus,
.form-select:focus {
    border-color: purple;
    box-shadow: 0 0 0 0.25rem rgba(128, 0, 128, 0.25);
}

.btn-outline-light:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
}
</style> 