<template>
    <div class="modal fade" id="idUploadModal" tabindex="-1" aria-labelledby="idUploadModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark">
                <div class="modal-header border-secondary">
                    <h5 class="modal-title text-light" id="idUploadModalLabel">
                        <i class="fas fa-id-card me-2"></i>
                        Documentos de Identidad
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"
                        @click="handleClose"></button>
                </div>
                <div class="modal-body">
                    <!-- Front ID Upload -->
                    <div class="upload-section mb-4">
                        <h6 class="text-light mb-3">
                            <i class="fas fa-id-card me-2"></i>
                            Cédula (Frente)
                        </h6>
                        <div class="upload-area" @dragover.prevent @drop.prevent="handleFileDrop($event, 'front')"
                            :class="{ 'is-dragging': isDraggingFront }">
                            <input type="file" ref="frontInput" class="d-none" accept="image/*"
                                @change="handleFileSelect($event, 'front')" />
                            <div v-if="!frontImage" class="upload-placeholder">
                                <i class="fas fa-cloud-upload-alt fa-2x mb-2"></i>
                                <p>Arrastre y suelte o haga clic para seleccionar</p>
                                <button class="btn btn-sm btn-theme" @click="$refs.frontInput.click()">
                                    Seleccionar Archivo
                                </button>
                            </div>
                            <div v-else class="upload-preview">
                                <img :src="frontImage" alt="Front ID" class="img-fluid rounded" />
                                <button class="btn btn-sm btn-danger mt-2" @click="removeImage('front')">
                                    <i class="fas fa-trash me-1"></i>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Back ID Upload -->
                    <div class="upload-section">
                        <h6 class="text-light mb-3">
                            <i class="fas fa-id-card me-2"></i>
                            Cédula (Reverso)
                        </h6>
                        <div class="upload-area" @dragover.prevent @drop.prevent="handleFileDrop($event, 'back')"
                            :class="{ 'is-dragging': isDraggingBack }">
                            <input type="file" ref="backInput" class="d-none" accept="image/*"
                                @change="handleFileSelect($event, 'back')" />
                            <div v-if="!backImage" class="upload-placeholder">
                                <i class="fas fa-cloud-upload-alt fa-2x mb-2"></i>
                                <p>Arrastre y suelte o haga clic para seleccionar</p>
                                <button class="btn btn-sm btn-theme" @click="$refs.backInput.click()">
                                    Seleccionar Archivo
                                </button>
                            </div>
                            <div v-else class="upload-preview">
                                <img :src="backImage" alt="Back ID" class="img-fluid rounded" />
                                <button class="btn btn-sm btn-danger mt-2" @click="removeImage('back')">
                                    <i class="fas fa-trash me-1"></i>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Selfie Upload -->
                    <div class="upload-section mb-4">
                        <h6 class="text-light mb-3">
                            <i class="fas fa-camera me-2"></i>
                            Selfie
                        </h6>
                        <div class="upload-area" @dragover.prevent @drop.prevent="handleFileDrop($event, 'selfie')"
                            :class="{ 'is-dragging': isDraggingSelfie }">
                            <input type="file" ref="selfieInput" class="d-none" accept="image/*"
                                @change="handleFileSelect($event, 'selfie')" />
                            <div v-if="!selfieImage" class="upload-placeholder">
                                <i class="fas fa-camera fa-2x mb-2"></i>
                                <p>Arrastre y suelte o haga clic para seleccionar</p>
                                <button class="btn btn-sm btn-theme" @click="$refs.selfieInput.click()">
                                    Seleccionar Archivo
                                </button>
                            </div>
                            <div v-else class="upload-preview">
                                <img :src="selfieImage" alt="Selfie" class="img-fluid rounded" />
                                <button class="btn btn-sm btn-danger mt-2" @click="removeImage('selfie')">
                                    <i class="fas fa-trash me-1"></i>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-secondary">
                    <button type="button" class="btn btn-outline-light" @click="skipUpload">
                        Omitir
                    </button>
                    <button type="button" class="btn btn-theme" @click="uploadDocuments"
                        :disabled="!frontImage || !backImage || !selfieImage || isUploading">
                        <span v-if="isUploading" class="spinner-border spinner-border-sm" role="status"></span>
                        <span v-else>Subir Documentos</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { Modal } from 'bootstrap';
import { useFileUpload } from '@/composables/useFileUpload';

// import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { ref as dbRef, update } from 'firebase/database';
// import { storage, db } from '@/firebase';

export default {
    name: 'IdUploadModal',
    props: {
        client: {
            type: Object,
            required: true
        }
    },
    setup() {
        const { isUploading, errorMessage, processFile, processVerification } = useFileUpload();
        return {
            isUploading,
            errorMessage,
            processFile,
            processVerification
        };
    },
    data() {
        return {
            modal: null,
            frontImage: null,
            backImage: null,
            selfieImage: null,
            isDraggingFront: false,
            isDraggingBack: false,
            isDraggingSelfie: false
        }
    },
    methods: {
        show() {
            if (!this.modal) {
                this.modal = new Modal(document.getElementById('idUploadModal'));
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
            this.$emit('skip-upload');
        },
        handleFileDrop(event, side) {
            const file = event.dataTransfer.files[0];
            if (file) {
                this.handleFile(file, side);
            }
        },
        handleFileSelect(event, side) {
            const file = event.target.files[0];
            if (file) {
                this.handleFile(file, side);
            }
        },
        async handleFile(file, side) {
            const result = await this.processFile(file, side);
            if (result) {
                switch (side) {
                    case 'front':
                        this.frontImage = result;
                        this.$refs.frontInput.value = '';
                        break;
                    case 'back':
                        this.backImage = result;
                        this.$refs.backInput.value = '';
                        break;
                    case 'selfie':
                        this.selfieImage = result;
                        this.$refs.selfieInput.value = '';
                        break;
                }
            }
        },
        removeImage(side) {
            switch (side) {
                case 'front':
                    this.frontImage = null;
                    this.$refs.frontInput.value = '';
                    break;
                case 'back':
                    this.backImage = null;
                    this.$refs.backInput.value = '';
                    break;
                case 'selfie':
                    this.selfieImage = null;
                    this.$refs.selfieInput.value = '';
                    break;
            }
        },
        async uploadDocuments() {
            try {
                const result = await this.processVerification({
                    front: this.frontImage,
                    back: this.backImage,
                    selfie: this.selfieImage
                }, this.client.id);

                if (result.success) {
                    this.$emit('upload-complete');
                    this.hide();
                }
            } catch (error) {
                console.error('Error uploading documents:', error);
            }
        },
        skipUpload() {
            this.$emit('skip-upload');
            this.hide();
        },
    },
    mounted() {
        this.modal = new Modal(document.getElementById('idUploadModal'));
    }
}
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

.upload-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1rem;
}

.upload-area {
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    transition: all 0.3s ease;
    cursor: pointer;
}

.upload-area.is-dragging {
    border-color: #6f42c1;
    background: rgba(111, 66, 193, 0.1);
}

.upload-placeholder {
    color: #adb5bd;
}

.upload-placeholder i {
    color: #6f42c1;
}

.upload-preview {
    max-width: 100%;
}

.upload-preview img {
    max-height: 200px;
    object-fit: contain;
}

@media (max-width: 576px) {
    .modal-dialog {
        margin: 0.5rem;
    }

    .upload-section {
        padding: 0.75rem;
    }

    .upload-area {
        padding: 1rem;
    }
}
</style>