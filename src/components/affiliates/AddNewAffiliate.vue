<template>
    <div class="modal fade" id="addAffiliateModal" tabindex="-1" aria-labelledby="addAffiliateModalLabel"
        aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content bg-dark">
                <div class="modal-header border-secondary">
                    <h5 class="modal-title" id="addAffiliateModalLabel">
                        <i class="fas fa-user-plus me-2"></i>
                        Agregar Afiliado
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                        @click="onClose"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-4">
                        <!-- Left Column - Main Info -->
                        <div class="col-lg-6">
                            <div class="card bg-dark border-secondary h-100">
                                <div class="card-header border-secondary">
                                    <h6 class="mb-0">Información Principal</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <!-- Category and Order -->
                                        <div class="col-md-6">
                                            <label for="categoryDropdown" class="form-label">Categoría</label>
                                            <div class="dropdown" id="categoryDropdown">
                                                <button class="btn btn-secondary dropdown-toggle w-100" type="button"
                                                    id="dropdownMenuCategory" data-bs-toggle="dropdown" aria-expanded="false">
                                                    {{ affiliate.category ? affiliate.category.name : 'Seleccione...' }}
                                                </button>
                                                <ul class="dropdown-menu w-100" aria-labelledby="dropdownMenuButton">
                                                    <li v-if="categories.length === 0">
                                                        <p class="px-3 py-2 mb-0">No hay categorías registradas.</p>
                                                    </li>
                                                    <li v-for="category in categories" :key="category.id">
                                                        <a class="dropdown-item" href="#" @click.prevent="onCategorySelect(category)">
                                                            {{ category.name }}
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="affiliateOrder" class="form-label">Orden</label>
                                            <input type="number" class="form-control" id="affiliateOrder" v-model="this.order" />
                                            <small class="text-muted">Posición en el listado</small>
                                        </div>

                                        <!-- Basic Info -->
                                        <div class="col-md-6">
                                            <label for="affiliateName" class="form-label">Nombre <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="affiliateName" v-model="affiliate.name" required />
                                        </div>
                                        <div class="col-md-6">
                                            <label for="affiliateRif" class="form-label">RIF <span class="text-danger">*</span></label>
                                            <input class="form-control" type="number" id="affiliateRif" v-model="affiliate.rif" required />
                                        </div>
                                        <div class="col-md-6">
                                            <label for="affiliateEmail" class="form-label">Email <span class="text-danger">*</span></label>
                                            <input class="form-control" id="affiliateEmail" v-model="affiliate.email" required />
                                        </div>
                                        <div class="col-md-6">
                                            <label for="affiliatePhone" class="form-label">Teléfono</label>
                                            <input class="form-control" id="affiliatePhone" v-model="affiliate.phoneNumber" />
                                        </div>

                                        <!-- Location -->
                                        <div class="col-md-4">
                                            <label class="form-label">Estado <span class="text-danger">*</span></label>
                                            <select v-model="selectedState" @change="onStateChange" class="form-select">
                                                <option value="" disabled selected>Selecciona un estado</option>
                                                <option v-for="(state, index) in venezuelanStates" :key="index" :value="state">
                                                    {{ state }}</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Municipio <span class="text-danger">*</span></label>
                                            <select v-model="selectedMunicipio" @change="onMunicipioChange" class="form-select">
                                                <option value="" disabled selected>Selecciona un municipio</option>
                                                <option v-for="(municipio, index) in municipios" :key="index" :value="municipio">
                                                    {{ municipio }}</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Parroquia <span class="text-danger">*</span></label>
                                            <select v-model="selectedParroquia" @change="onParroquiaChange" class="form-select">
                                                <option value="" disabled selected>Selecciona una parroquia</option>
                                                <option v-for="(parroquia, index) in parroquias" :key="index" :value="parroquia">
                                                    {{ parroquia }}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column - Payment & Social -->
                        <div class="col-lg-6">
                            <!-- Payment Details Card -->
                            <div class="card bg-dark border-secondary mb-4">
                                <div class="card-header border-secondary">
                                    <h6 class="mb-0">Datos de Pago</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label for="affiliateBank" class="form-label">Banco</label>
                                            <input type="text" class="form-control" id="affiliateBank" v-model="paymentDetails.bank" required />
                                        </div>
                                        <div class="col-md-6">
                                            <label for="affiliateIdentification" class="form-label">RIF o Cédula</label>
                                            <input type="text" class="form-control" id="affiliateIdentification" v-model="paymentDetails.identification" required />
                                        </div>
                                        <div class="col-md-6">
                                            <label for="affiliatePhone" class="form-label">Número de Teléfono</label>
                                            <input type="text" class="form-control" id="affiliatePhone" v-model="paymentDetails.phoneNumber" required />
                                        </div>
                                        <div class="col-md-6">
                                            <label for="affiliateAccount" class="form-label">Número de Cuenta</label>
                                            <input type="text" class="form-control" id="affiliateAccount" v-model="paymentDetails.bankAccount" required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Social Media Card -->
                            <div class="card bg-dark border-secondary mb-4">
                                <div class="card-header border-secondary">
                                    <h6 class="mb-0">Redes Sociales</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i class="fa-brands fa-x-twitter"></i>
                                                </span>
                                                <input type="text" class="form-control" id="affiliateTwitter" v-model="affiliate.twitter" placeholder="Twitter" />
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i class="fa-brands fa-instagram"></i>
                                                </span>
                                                <input type="text" class="form-control" id="affiliateInstagram" v-model="affiliate.instagram" placeholder="Instagram" />
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i class="fa-brands fa-facebook-f"></i>
                                                </span>
                                                <input type="text" class="form-control" id="affiliateFacebook" v-model="affiliate.facebook" placeholder="Facebook" />
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="input-group">
                                                <span class="input-group-text">
                                                    <i class="fa-brands fa-tiktok"></i>
                                                </span>
                                                <input type="text" class="form-control" id="affiliateTiktok" v-model="affiliate.tiktok" placeholder="TikTok" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Image Upload Card -->
                            <div class="card bg-dark border-secondary">
                                <div class="card-header border-secondary">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0">Imagen del Afiliado</h6>
                                        <div class="form-check form-switch">
                                            <input type="checkbox" class="form-check-input" id="uploadImageCheckbox" v-model="uploadImage">
                                            <label class="form-check-label" for="uploadImageCheckbox">Subir imagen</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body" v-if="uploadImage">
                                    <div class="row">
                                        <div class="col-12">
                                            <input type="file" class="form-control" id="menuItemImg" @change="previewImage" accept="image/*">
                                            <div v-if="imagePreview" class="mt-3 text-center">
                                                <img :src="imagePreview" class="img-thumbnail" alt="preview" style="max-height: 200px;">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="affiliateStatus" v-model="affiliate.status" />
                                <label class="form-check-label" for="affiliateStatus">Activo</label>
                            </div>
                            <p class="text-muted mt-2 mb-0">(<span class="text-danger">*</span>) Campos obligatorios.</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-light btn-sm" data-bs-dismiss="modal" @click="onClose">Cerrar</button>
                    <button type="button" class="btn btn-theme btn-sm" @click="onSave" :disabled="isSubmitting || !isFormValid">
                        <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span v-else>Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import venezuela from "venezuela";
import { toast } from "@/utils/toast";
import { Modal } from "bootstrap";

export default {
    props: {
        categories: {
            type: Array,
            required: true,
        },
        venezuelanStates: {
            type: Array,
            required: true,
        },
        order: {
            type: Number,
            required: false,
        },
    },
    data() {
        return {
            affiliate: {
                name: '',
                rif: '',
                status: false,
                email: '',
                phoneNumber: '',
                state: '',
                municipio: '',
                parroquia: '',
                address: '',
                order: 0,
                category: null,
                // socials
                twitter: '',
                instagram: '',
                facebook: '',
                tiktok: '',
            },
            paymentDetails: {
                bank: '',
                identification: '',
                phoneNumber: '',
                bankAccount: '',
            },
            selectedState: '',
            selectedMunicipio: '',
            selectedParroquia: '',
            municipios: [],
            parroquias: [],
            imageFile: null,
            uploadImage: false,
            imagePreview: null,
            isSubmitting: false
        };
    },
    emits: ["add-affiliate"],
    methods: {
        resetForm() {
            this.affiliate = {
                name: '',
                rif: '',
                status: false,
                email: '',
                phoneNumber: '',
                state: '',
                municipio: '',
                parroquia: '',
                address: '',
                order: this.order + 1,
                category: null,
                twitter: '',
                instagram: '',
                facebook: '',
                tiktok: '',
            };
            this.paymentDetails = {
                bank: '',
                identification: '',
                phoneNumber: '',
                bankAccount: '',
            };
            this.selectedState = '';
            this.selectedMunicipio = '';
            this.selectedParroquia = '';
            this.municipios = [];
            this.parroquias = [];
            this.imageFile = null;
            this.uploadImage = false;
            this.imagePreview = null;
        },
        onClose() {
            this.resetForm();
        },
        async onSave() {
            try {
                // Validate required fields
                if (!this.affiliate.name || !this.affiliate.rif || !this.affiliate.email) {
                    toast.error('Por favor complete los campos obligatorios');
                    return;
                }

                if (!this.selectedState || !this.selectedMunicipio || !this.selectedParroquia) {
                    toast.error('Por favor seleccione estado, municipio y parroquia');
                    return;
                }

                this.isSubmitting = true;

                // Set location data from selections
                this.affiliate.state = this.selectedState;
                this.affiliate.municipio = this.selectedMunicipio;
                this.affiliate.parroquia = this.selectedParroquia;

                // Prepare data for submission
                const affiliateData = { ...this.affiliate };

                // Handle category
                if (affiliateData.category) {
                    affiliateData.category = affiliateData.category.id;
                }

                // Add payment details
                if (this.paymentDetails) {
                    affiliateData.paymentDetails = this.paymentDetails;
                }

                // Add order number
                affiliateData.order = this.order;

                // Pass the image file directly if uploading is needed
                if (this.uploadImage && this.imageFile) {
                    affiliateData.imageFile = this.imageFile;
                }

                // Emit event with new affiliate data
                this.$emit('add-affiliate', affiliateData);

                // Reset form and close modal
                this.resetForm();

                // Close the modal
                const modal = document.getElementById('addAffiliateModal');
                if (modal) {
                    const bsModal = Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }
            } catch (error) {
                console.error('Error preparing affiliate data:', error);
                toast.error('Error al preparar los datos del comercio afiliado');
            } finally {
                this.isSubmitting = false;
            }
        },
        onCategorySelect(category) {
            this.affiliate.category = category;
        },
        onStateChange() {
            this.selectedMunicipio = '';
            this.selectedParroquia = '';
            this.municipios = [];
            this.parroquias = [];

            try {
                const stateData = venezuela.estado(this.selectedState, { municipios: true });
                if (stateData && stateData.municipios) {
                    this.municipios = stateData.municipios;
                }
            } catch (error) {
                console.error('Error loading municipios:', error);
                this.municipios = [];
            }
        },
        onMunicipioChange() {
            this.selectedParroquia = '';
            this.parroquias = [];

            try {
                const municipioData = venezuela.municipio(this.selectedMunicipio, { parroquias: true });
                if (municipioData && municipioData.parroquias) {
                    this.parroquias = municipioData.parroquias;
                }
            } catch (error) {
                console.error('Error loading parroquias:', error);
                this.parroquias = [];
            }
        },
        onParroquiaChange() {
            // Just update the selected parroquia
        },
        previewImage(event) {
            const file = event.target.files[0];
            if (file) {
                this.imageFile = file;
                this.imagePreview = URL.createObjectURL(file);
            }
        },
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
    },
    computed: {
        isFormValid() {
            return (
                this.affiliate.name &&
                this.affiliate.rif &&
                this.affiliate.email &&
                this.selectedState &&
                this.selectedMunicipio &&
                this.selectedParroquia &&
                this.isValidEmail(this.affiliate.email)
            );
        }
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

.card {
    background-color: rgba(0, 0, 0, 0.2);
}

.card-header {
    background-color: rgba(0, 0, 0, 0.3);
}

.form-control,
.form-select {
    background-color: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.form-control:focus,
.form-select:focus {
    background-color: rgba(0, 0, 0, 0.3);
    border-color: purple;
    box-shadow: 0 0 0 0.25rem rgba(128, 0, 128, 0.25);
    color: #fff;
}

.input-group-text {
    background-color: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.dropdown-menu {
    background-color: #2b2b2b;
    border-color: rgba(255, 255, 255, 0.1);
}

.dropdown-item {
    color: #fff;
}

.dropdown-item:hover {
    background-color: rgba(128, 0, 128, 0.2);
    color: #fff;
}

.btn-theme {
    background-color: purple;
    border-color: purple;
    color: #fff;
}

.btn-theme:hover {
    background-color: #800080;
    border-color: #800080;
    color: #fff;
}

.form-check-input:checked {
    background-color: purple;
    border-color: purple;
}

@media (max-width: 991.98px) {
    .modal-dialog {
        margin: 0.5rem;
    }
}
</style>