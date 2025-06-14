<script>
import { defineComponent } from 'vue';
import { useUserStore } from '@/stores/user-role';
import { Modal } from 'bootstrap';
import { useFileUpload } from '@/composables/useFileUpload';
import { useSubscription } from '@/composables/useSubscription';

export default defineComponent({
    setup() {
        const { isUploading, errorMessage, processFile, processVerification } = useFileUpload();
        const { 
            subscriptionPlan, 
            userSubscriptionId, 
            isLoading: subscriptionLoading, 
            error: subscriptionError, 
            fetchSubscriptionPlan,
            isFreeSubscription
        } = useSubscription();

        return {
            isUploading,
            errorMessage,
            processFile,
            processVerification,
            subscriptionPlan,
            userSubscriptionId,
            subscriptionLoading,
            subscriptionError,
            fetchSubscriptionPlan,
            isFreeSubscription
        };
    },
    data() {
        return {
            userId: '',
            userName: '',
            requestedVerification: false,
            userVerified: false,
            verificationStatus: 'unverified',

            // File Uploads
            idFrontFile: null,
            idBackFile: null,
            selfieFile: null,
            idFrontPreview: null,
            idBackPreview: null,
            selfiePreview: null,


            // data for portal items
            portalItems: [
                {
                    title: 'Compra en RoseMarket',
                    description: 'El primer supermercado con pagos a Cuotas.',
                    link: 'https://rossemarket.com/',
                    actionText: 'Descubre más',
                    bgImage: '/assets/img/rose_imgs/2.png'
                },                
                { title: 'Cupones', description: 'Descubre tus cupones aquí.', link: '/cupones', actionText: 'Ver más', bgImage: '/assets/img/rose_imgs/1.png' },
                {
                    title: 'Crédito',
                    description: 'Descubre tu línea de crédito aquí.',
                    link: '/creditos',
                    actionText: 'Ver más',
                    notReady: false,
                    bgImage: '/assets/img/rose_imgs/2.png'
                },
                {
                    title: 'Comercios Afiliados',
                    description: 'Aquí puede ver los comercios donde puede usar su crédito.',
                    link: '/comercios-afiliados',
                    actionText: 'Ver más',
                    bgImage: '/assets/img/rose_imgs/3.png'
                },
                { title: 'Cupones que te interesan', description: 'Cuentanos que te gusta.', link: '/preferencias', actionText: 'Cuentanos', notReady: false, bgImage: '/assets/img/rose_imgs/1.png' },
                { title: 'Solicitar cupón', description: 'Solicita los cupones que deseas.', link: '/request-coupons', actionText: 'Solicitar', notReady: false, bgImage: '/assets/img/rose_imgs/1.png' },
                { title: 'Suscripciones', description: 'Administra tu suscripcion aqui.', link: '/suscripciones', actionText: 'Ver más', notReady: false, bgImage: '/assets/img/rose_imgs/5.png' },
                { title: 'Eventos', description: 'Descubre nuestros próximos eventos.', link: '/events', actionText: 'Ver más', notReady: false, bgImage: '/assets/img/rose_imgs/3.png' },
                { title: 'Sorteos', description: 'Descubre nuestros próximos sorteos.', link: '/giveaways', actionText: 'Ver más', notReady: false, bgImage: '/assets/img/rose_imgs/3.png' },
                { title: 'Vacantes', description: 'Descubre vacantes aquí.', link: '/jobs', actionText: 'Ver más', notReady: false, bgImage: '/assets/img/rose_imgs/3.png' },

                // { title: 'Compras recientes', description: 'Ver sus compras recientes.', link: '#', actionText: 'Ver más', notReady: true, bgImage: '/assets/img/rose_imgs/5.png' },
                
                // { title: 'Mis Opiniones', description: 'Aqui se muestran tus reseñas y opiniones de lo que consumes.', link: '/clients-ratings', actionText: 'Ver más', notReady: true, bgImage: '/assets/img/rose_imgs/6.png' },
                // { title: 'Encuestas', description: 'Ayudanos a mejorar tomando una pequeña encuesta.', link: '/customer-survey', actionText: 'Tomar Encuesta', notReady: true, bgImage: '/assets/img/rose_imgs/6.png' },
            ],            
        };
    },
    methods: {
        //File uploads
        async handleFileUpload(event, type) {
            const file = event.target.files[0];
            if (!file) return;

            const result = await this.processFile(file, type);
            if (result) {
                switch(type) {
                    case 'front':
                        this.idFrontFile = file;
                        this.idFrontPreview = result;
                        break;
                    case 'back':
                        this.idBackFile = file;
                        this.idBackPreview = result;
                        break;
                    case 'selfie':
                        this.selfieFile = file;
                        this.selfiePreview = result;
                        break;
                }
            }
        },        

        // ID Verification
        async submitVerification() {
            if (!this.idFrontPreview || !this.idBackPreview || !this.selfiePreview) {
                this.errorMessage = 'Por favor, selecciona todos los archivos requeridos.';
                return;
            }

            try {
                const result = await this.processVerification({
                    front: this.idFrontPreview,
                    back: this.idBackPreview,
                    selfie: this.selfiePreview
                }, this.userId);

                if (result.success) {
                    this.requestedVerification = true;
                }

                //reset the image previews
                this.idFrontPreview = null;
                this.idBackPreview = null;
                this.selfiePreview = null;
                this.verificationStatus = 'pending';

                // Hide the modal after submission
                this.verificationModal.hide();
            } catch (error) {
                console.error('Error during verification:', error);
                this.errorMessage = 'Error al subir los archivos, por favor intente nuevamente.';
            }
        },

        redirectToSubs(subscriptionPlan) {
            this.$router.push({
                path: '/suscripciones',
                query: { clientSubscriptionId: subscriptionPlan.id }
            });
        },
    },
    async mounted() {
        if (!sessionStorage.getItem('reloaded')) {
            sessionStorage.setItem('reloaded', 'true');
            window.location.reload();
        } else {
            sessionStorage.removeItem('reloaded');
        }

        const userStore = useUserStore();
        await userStore.fetchUser();
        this.userId = userStore.userId;
        this.userName = userStore.userName;
        this.requestedVerification = userStore.requestedVerification;
        this.userVerified = userStore.isVerified;

        // console.log(this.userId);

        this.verificationModal = new Modal(document.getElementById('verificationModal'));

        // Use the composable's fetchSubscriptionPlan
        await this.fetchSubscriptionPlan(this.userId);
    },
});

</script>
<template>
    <div class="container">
        <!-- Header Section -->
        <div class="portal-header">
            <div class="row align-items-center">
                <div class="col-md-7">
                    <h2 class="fw-bold mb-0">Portal de Clientes</h2>
                    <p class="text-muted small mb-0">Accede a todos los servicios disponibles</p>
                </div>
                <div class="col-md-5">
                    <!-- User Status Badges -->
                    <div class="badges-container">
                        <!-- Subscription Badge -->
                        <div v-if="subscriptionPlan && subscriptionPlan.status && subscriptionPlan.name"
                            class="status-card subscription-card" @click="redirectToSubs(subscriptionPlan)">
                            <div class="status-icon subscription-icon">
                                <i :class="subscriptionPlan.icon"></i>
                            </div>
                            <div class="status-info">
                                <div class="status-name">{{ subscriptionPlan.name.toUpperCase() }}</div>
                                <small class="status-hint fw-bold" :class="subscriptionPlan.isPaid ? 'text-success' : 'text-warning'"
                                    v-if="!isFreeSubscription">
                                    {{ subscriptionPlan.isPaid ? 'Suscripción activa' : subscriptionPlan.isPaid === false && subscriptionPlan.paymentUploaded ? 'Pago recibido. Pendiente por aprobación' : 'Pago pendiente. Recuerde estar al día' }}
                                </small>
                                <small class="status-hint" v-else>Haz clic para mejorar tu suscripción</small>
                            </div>
                        </div>
                        <div v-else class="status-card subscription-card-alert" @click="$router.push('/suscripciones')">
                            <div class="status-icon">
                                <i class="fa-solid fa-exclamation-circle"></i>
                            </div>
                            <div class="status-info">
                                <div class="status-name">SIN SUSCRIPCIÓN</div>
                                <small class="status-hint">Haz clic para suscribirte</small>
                            </div>
                        </div>

                        <!-- Verification Badge -->
                        <div v-if="!userVerified && !requestedVerification" class="status-card verification-card-alert mt-2"
                            data-bs-toggle="modal" data-bs-target="#verificationModal">
                            <div class="status-icon">
                                <i class="fa-solid fa-user-xmark"></i>
                            </div>
                            <div class="status-info">
                                <div class="status-name">CUENTA SIN VERIFICAR</div>
                                <small class="status-hint">Haz clic para verificar tu cuenta</small>
                            </div>
                        </div>
                        <div v-else-if="requestedVerification && !userVerified" class="status-card verification-card-pending mt-2">
                            <div class="status-icon">
                                <i class="fa-solid fa-user-clock"></i>
                            </div>
                            <div class="status-info">
                                <div class="status-name">VERIFICACIÓN PENDIENTE</div>
                                <small class="status-hint">Tu verificación está pendiente por aprobación</small>
                            </div>
                        </div>
                        <div v-else-if="userVerified" class="status-card verification-card mt-2">
                            <div class="status-icon">
                                <i class="fa-solid fa-user-check"></i>
                            </div>
                            <div class="status-info">
                                <div class="status-name">CUENTA VERIFICADA</div>
                                <small class="status-hint">Tu cuenta está verificada</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            <div class="col" v-for="item in portalItems" :key="item.title">
                <div class="card h-100 portal-card position-relative">
                    <div v-if="item.notReady === true" class="ribbon">
                        <span>Proximamente</span>
                    </div>
                    <div class="card-body d-flex flex-column" :style="{
                        backgroundImage: `url(${item.bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }">
                        <div class="card-content">
                            <h5 class="card-title mb-3">{{ item.title }}</h5>
                            <p class="card-text">{{ item.description }}</p>

                            <div class="mt-auto pt-3">
                                <a v-if="item.title.includes('RoseMarket')" :href="item.link" class="btn btn-theme w-100" target="_blank">
                                    {{ item.actionText }}
                                </a>
                                <router-link v-else :to="item.link" class="btn btn-theme w-100" :class="{
                                    'disabled': (item.title === 'Crédito' && !userVerified) ||
                                        (item.title === 'Solicitar cupón' && subscriptionPlan.price === 0) ||
                                        item.notReady === true
                                }" :aria-disabled="item.title === 'Crédito' && !userVerified"
                                    :tabindex="item.title === 'Crédito' && !userVerified ? -1 : 0">
                                    {{ item.actionText }}
                                </router-link>

                                <!-- Warning messages -->
                                <div v-if="item.title === 'Crédito' && !userVerified" class="warning-message mt-2">
                                    <small class="text-danger">
                                        <span v-if="verificationStatus === 'unverified'">
                                            Verifique su cuenta para habilitar la opción de crédito.
                                        </span>
                                        <span v-else-if="verificationStatus === 'pending'">
                                            Verificación pendiente por Aprobación.
                                        </span>
                                    </small>
                                </div>

                                <div class="warning-message mt-2"
                                    v-if="item.title === 'Solicitar cupón' && subscriptionPlan.price === 0">
                                    <small class="text-danger">
                                        <span>Debes contar con suscripción Bronce en adelante para este
                                            beneficio.</span>
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Verification Modal -->
        <div class="modal fade" id="verificationModal" tabindex="-1" aria-labelledby="verificationModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content verification-modal">
                    <div class="modal-header">
                        <div class="modal-title-container">
                            <h5 class="modal-title" id="verificationModalLabel">
                                <i class="fas fa-id-card me-2"></i>Verificación de Identidad
                            </h5>
                            <p class="modal-subtitle">Sube tus documentos para completar tu verificación</p>
                        </div>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form @submit.prevent="submitVerification" class="verification-form">
                            <div class="document-upload-section">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <div class="document-upload-card">
                                            <div class="document-upload-icon">
                                                <i class="fas fa-id-card"></i>
                                            </div>
                                            <label for="idFront" class="form-label">Frontal de Cédula</label>
                                            <input type="file" class="form-control" id="idFront" accept="image/*"
                                                @change="handleFileUpload($event, 'front')" required>
                                            <div class="preview-container">
                                                <img v-if="idFrontPreview" :src="idFrontPreview" alt="Front ID Preview"
                                                    class="img-preview" />
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-md-4">
                                        <div class="document-upload-card">
                                            <div class="document-upload-icon">
                                                <i class="fas fa-id-card-alt"></i>
                                            </div>
                                            <label for="idBack" class="form-label">Reverso de Cédula</label>
                                            <input type="file" class="form-control" id="idBack" accept="image/*"
                                                @change="handleFileUpload($event, 'back')" required>
                                            <div class="preview-container">
                                                <img v-if="idBackPreview" :src="idBackPreview" alt="Back ID Preview"
                                                    class="img-preview" />
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-md-4">
                                        <div class="document-upload-card">
                                            <div class="document-upload-icon">
                                                <i class="fas fa-id-card"></i>
                                            </div>
                                            <label for="selfie" class="form-label">Selfie con Cédula</label>
                                            <input type="file" class="form-control" id="selfie" accept="image/*"
                                                @change="handleFileUpload($event, 'selfie')" required>
                                            <div class="preview-container">
                                                <img v-if="selfiePreview" :src="selfiePreview" alt="Selfie Preview"
                                                    class="img-preview" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Error Message -->
                            <div v-if="errorMessage" class="alert alert-danger mt-3">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                {{ errorMessage }}
                            </div>

                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary" :disabled="isUploading">
                                    <span v-if="!isUploading">
                                        <i class="fas fa-upload me-2"></i>Subir Documentos
                                    </span>
                                    <span v-else>
                                        <span class="spinner-border spinner-border-sm me-2" role="status"
                                            aria-hidden="true"></span>
                                        Procesando...
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
/* Base styles */
.btn-theme {
    background-color: purple;
    border-color: purple;
    transition: all 0.2s ease;
}

.btn-theme:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Header Section */
.portal-header {
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* Status Badges */
.badges-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.status-card {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 8px;
    padding: 8px 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    transition: all 0.2s ease;
    max-width: 250px;
    width: 100%;
}

.status-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.status-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    margin-right: 10px;
    flex-shrink: 0;
}

.status-info {
    flex: 1;
}

.status-name {
    font-weight: 600;
    font-size: 0.8rem;
    color: #333;
}

.status-hint {
    display: block;
    color: #6c757d;
    font-size: 0.7rem;
    margin-top: 1px;
}

/* Subscription Card Variants */
.subscription-card {
    border-left: 4px solid #198754;
}

.subscription-card-alert {
    border-left: 4px solid #dc3545;
}

.subscription-icon {
    background: rgba(25, 135, 84, 0.1);
    color: #198754;
}

.subscription-card-alert .status-icon {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
}

/* Verification Card Variants */
.verification-card {
    border-left: 4px solid #198754;
}

.verification-card-pending {
    border-left: 4px solid #f0ad4e;
}

.verification-card-pending .status-icon {
    background: rgba(240, 173, 78, 0.1);
    color: #f0ad4e;
}

.verification-card-alert {
    border-left: 4px solid #dc3545;
}

.verification-card .status-icon {
    background: rgba(25, 135, 84, 0.1);
    color: #198754;
}

.verification-card-alert .status-icon {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
}

/* Portal Cards */
.portal-card {
    overflow: hidden;
    transition: all 0.3s ease;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    height: 100%;
}

.portal-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.card-body {
    position: relative;
    height: 100%;
}

.card-content {
    background-color: transparent;
    border-radius: 8px;
    padding: 0.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
}

/* Ribbon */
.ribbon {
    position: absolute;
    top: 15px;
    right: -30px;
    background: #8c042c;
    color: #fff;
    padding: 5px 30px;
    font-size: 0.75rem;
    font-weight: bold;
    transform: rotate(45deg);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    z-index: 10;
}

/* Warning Messages */
.warning-message {
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    padding: 0.5rem;
}

/* Verification Modal */
.verification-modal .modal-content {
    background-color: #2d2d2d;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
}

.modal-header {
    background-color: #29122f;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.5rem;
}

.modal-title-container {
    flex-grow: 1;
}

.modal-title {
    color: #ffffff;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
}

.modal-subtitle {
    color: #aaa;
    font-size: 0.9rem;
    margin-bottom: 0;
}

/* Document Upload Section */
.document-upload-section {
    padding: 1.5rem;
}

.document-upload-card {
    background-color: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
    transition: all 0.3s ease;
}

.document-upload-card:hover {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    transform: translateY(-5px);
}

.document-upload-icon {
    font-size: 3rem;
    color: #6f42c1;
    margin-bottom: 1rem;
}

.form-label {
    color: #aaa;
    margin-bottom: 0.75rem;
}

.preview-container {
    margin-top: 1rem;
    max-height: 200px;
    overflow: hidden;
    border-radius: 8px;
}

.img-preview {
    width: 100%;
    height: auto;
    object-fit: cover;
    border-radius: 8px;
    transition: transform 0.3s ease;
}

.img-preview:hover {
    transform: scale(1.05);
}

.modal-footer {
    background-color: #1e1e1e;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem 1.5rem;
}

/* Modal Buttons */
.btn-primary {
    background-color: #6f42c1;
    border-color: #6f42c1;
    transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
    background-color: #5a32a3;
    border-color: #5a32a3;
    transform: translateY(-2px);
}

.btn-secondary {
    background-color: #444;
    border-color: #444;
    color: #aaa;
}

/* Responsive Styles */
@media (max-width: 768px) {
    .portal-header {
        text-align: center;
    }

    .badges-container {
        flex-direction: row;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }

    .status-card {
        max-width: 200px;
        padding: 6px 10px;
        margin: 0;
    }

    .status-icon {
        width: 24px;
        height: 24px;
        font-size: 0.8rem;
        margin-right: 8px;
    }

    .status-name {
        font-size: 0.7rem;
    }

    .status-hint {
        font-size: 0.65rem;
    }

    .mt-2 {
        margin-top: 0 !important;
    }

    .modal-dialog {
        margin: 1.75rem 0.5rem;
    }

    .document-upload-section {
        padding: 1rem;
    }

    .document-upload-card {
        margin-bottom: 1rem;
    }

    .document-upload-icon {
        font-size: 2.5rem;
    }
}

@media (max-width: 576px) {
    .badges-container {
        flex-direction: row;
        justify-content: center;
        gap: 0.25rem;
    }

    .status-card {
        max-width: 180px;
        padding: 4px 8px;
    }

    .status-icon {
        width: 20px;
        height: 20px;
        font-size: 0.7rem;
        margin-right: 6px;
    }

    .status-name {
        font-size: 0.65rem;
    }

    .status-hint {
        font-size: 0.6rem;
    }
}
</style>