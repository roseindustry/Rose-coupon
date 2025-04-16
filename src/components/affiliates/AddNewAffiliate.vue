<template>
    <div class="modal fade" id="addAffiliateModal" tabindex="-1" aria-labelledby="addAffiliateModalLabel"
        aria-hidden="true">
        <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="addAffiliateModalLabel">Agregar Afiliado</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                        @click="onClose"></button>
                </div>
                <div class="modal-body">
                    <div class="container">
                        <!-- Form Content -->
                        <div class="row">
                            <!-- Categoria -->
                            <div class="col-6 mb-3">
                                <label for="categoryDropdown" class="form-label">Categoría</label>
                                <div class="dropdown" id="categoryDropdown">
                                    <button class="btn btn-secondary dropdown-toggle" type="button"
                                        id="dropdownMenuCategory" data-bs-toggle="dropdown" aria-expanded="false">
                                        {{ affiliate.category ? affiliate.category.name : 'Seleccione...' }}
                                    </button>
                                    <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                                        <li v-if="categories.length === 0">
                                            <p style="margin: 10px;">No hay categorías registradas.</p>
                                        </li>
                                        <li v-for="category in categories" :key="category.id">
                                            <a class="dropdown-item" href="#"
                                                @click.prevent="onCategorySelect(category)">
                                                {{ category.name }}
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <!-- Affiliate Order Number -->
                            <div class="col-6 mb-3">
                                <label for="affiliateOrder" class="form-label">
                                    Orden                                    
                                </label>                                
                                <input type="number" class="form-control" id="affiliateOrder"
                                    v-model="this.order" />
                                    <small class="text-muted">
                                    Este número determinará la posición en que aparezca listado el Comercio
                                    </small>
                            </div>
                            <div class="col-6 mb-3">
                                <label for="affiliateName" class="form-label">Nombre <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="affiliateName" v-model="affiliate.name"
                                    required />
                            </div>
                            <div class="col-6 mb-3">
                                <label for="affiliateRif" class="form-label">RIF <span
                                        class="text-danger">*</span></label>
                                <input class="form-control" type="number" id="affiliateRif" v-model="affiliate.rif" required />
                            </div>
                            <div class="col-6 mb-3">
                                <label for="affiliateEmail" class="form-label">Email <span
                                        class="text-danger">*</span></label>
                                <input class="form-control" id="affiliateEmail" v-model="affiliate.email" required />
                            </div>
                            <div class="col-6 mb-3">
                                <label for="affiliatePhone" class="form-label">Teléfono</label>
                                <input class="form-control" id="affiliatePhone" v-model="affiliate.phoneNumber" />
                            </div>
                            <!-- State -->
                            <div class="col-6 mb-3">
                                <label class="form-label">Estado <span class="text-danger">*</span></label>
                                <select v-model="selectedState" @change="onStateChange" class="form-control mb-2">
                                    <option value="" disabled selected>Selecciona un estado</option>
                                    <option v-for="(state, index) in venezuelanStates" :key="index" :value="state">
                                        {{ state }}</option>
                                </select>
                            </div>
                            <!-- Municipality -->
                            <div class="col-6 mb-3">
                                <label class="form-label">Municipio <span class="text-danger">*</span></label>
                                <select v-model="selectedMunicipio" @change="onMunicipioChange"
                                    class="form-control mb-2">
                                    <option value="" disabled selected>Selecciona un municipio</option>
                                    <option v-for="(municipio, index) in municipios" :key="index" :value="municipio">{{
                                        municipio }}</option>
                                </select>
                            </div>
                            <!-- Parroquia -->
                            <div class="col-6 mb-3">
                                <label class="form-label">Parroquia <span class="text-danger">*</span></label>
                                <select v-model="selectedParroquia" @change="onParroquiaChange"
                                    class="form-control mb-2">
                                    <option value="" disabled selected>Selecciona una parroquia</option>
                                    <option v-for="(parroquia, index) in parroquias" :key="index" :value="parroquia">{{
                                        parroquia }}</option>
                                </select>
                            </div>
                        </div>

                        <hr>

                        <!-- Payment details -->
                        <div class="row">
                            <h5 for="affiliatePaymentDetails" class="form-label text-center mb-3">Datos de Pago</h5>
                            <div class="col-12 mb-3">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        Banco
                                    </span>
                                    <input type="text" class="form-control" id="affiliateBank"
                                        v-model="paymentDetails.bank" required />
                                </div>
                            </div>
                            <div class="col-12 mb-3">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        RIF o Cédula
                                    </span>
                                    <input type="text" class="form-control" id="affiliateIdentification"
                                        v-model="paymentDetails.identification" required />
                                </div>
                            </div>
                            <div class="col-12 mb-3">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        Número de Teléfono
                                    </span>
                                    <input type="text" class="form-control" id="affiliatePhone"
                                        v-model="paymentDetails.phoneNumber" required />
                                </div>
                            </div>
                            <div class="col-12 mb-3">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        Número de Cuenta
                                    </span>
                                    <input type="text" class="form-control" id="affiliateAccount"
                                        v-model="paymentDetails.bankAccount" required />
                                </div>
                            </div>
                        </div>

                        <hr>

                        <!-- Socials -->
                        <div class="row">
                            <h5 for="affiliateSocials" class="form-label text-center mb-3">Redes sociales</h5>
                            <div class="col-6 mb-3">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        <i class="fa-brands fa-x-twitter"></i>
                                    </span>
                                    <input type="text" class="form-control" id="affiliateTwitter"
                                        v-model="affiliate.twitter" />
                                </div>
                            </div>
                            <div class="col-6 mb-3">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        <i class="fa-brands fa-instagram"></i>
                                    </span>
                                    <input type="text" class="form-control" id="affiliateInstagram"
                                        v-model="affiliate.instagram" />
                                </div>
                            </div>
                            <div class="col-6 mb-3">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        <i class="fa-brands fa-facebook-f"></i>
                                    </span>
                                    <input type="text" class="form-control" id="affiliateFacebook"
                                        v-model="affiliate.facebook" />
                                </div>
                            </div>
                            <div class="col-6 mb-3">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        <i class="fa-brands fa-tiktok"></i>
                                    </span>
                                    <input type="text" class="form-control" id="affiliateTiktok"
                                        v-model="affiliate.tiktok" />
                                </div>
                            </div>
                        </div>

                        <hr>

                        <p>(<span class="text-danger">*</span>) Campos obligatorios.</p>

                        <div class="row">
                            <!-- Affiliate Status -->
                            <div class="col-12 mb-3">
                                <div class="form-check mt-4">
                                    <input type="checkbox" class="form-check-input" id="affiliateStatus"
                                        v-model="affiliate.status" />
                                    <label class="form-check-label" for="affiliateStatus">Activo</label>
                                </div>
                            </div>
                            <!-- Upload Image Checkbox -->
                            <div class="col-12 mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
                                        v-model="uploadImage">
                                    <label class="form-check-label" for="uploadImageCheckbox">Subir imagen</label>
                                </div>
                            </div>
                        </div>

                        <!-- Image Upload -->
                        <div class="row" v-if="uploadImage">
                            <div class="col-12 mb-3">
                                <label for="menuItemImg" class="form-label">Imagen</label>
                                <input type="file" class="form-control" id="menuItemImg" @change="previewImage"
                                    accept="image/*">
                                <div v-if="imagePreview" class="mt-2">
                                    <img :src="imagePreview" class="img-thumbnail" alt="preview"
                                        style="max-height: 200px;">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
                        @click="onClose">Cerrar</button>
                    <button type="button" class="btn btn-theme" @click="onSave"
                        :disabled="isSubmitting || !isFormValid">
                        <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span v-else>Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase/init";
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