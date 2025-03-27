<script>
import { defineComponent } from 'vue';
import { useUserStore } from '@/stores/user-role';
import { db, storage, functions } from '../firebase/init';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, get, update } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { Modal } from 'bootstrap';
import { showToast } from '@/utils/toast';
import { sendEmail } from '@/utils/emailService';
import 'toastify-js/src/toastify.css'

export default defineComponent({
    data() {
        return {
            // deferredPrompt: null,

            userId: '',
            userName: '',
            userSubscriptionId: '',

            // data for portal items
            portalItems: [
                {
                    title: 'Comercios Afiliados',
                    description: 'Aquí puede ver los comercios donde puede usar su crédito.',
                    link: '/comercios-afiliados',
                    actionText: 'Ver más',
                    bgImage: '/assets/img/rose_imgs/3.png'
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

            subscriptionPlan: {},
            userVerified: false,
            verificationStatus: 'unverified', // Possible values: 'unverified', 'pending', 'verified'

            idFrontFile: null,
            idBackFile: null,
            selfieFile: null,
            idFrontPreview: null,
            idBackPreview: null,
            selfiePreview: null,

            isSubmitting: false,
            errorMessage: '',
            verificationModal: null,
        };
    },
    methods: {
        async fetchSubscriptionPlan() {
            const userId = this.userId;

            if (userId) {
                const userRef = dbRef(db, `Users/${userId}`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    const user = snapshot.val();

                    this.userVerified = user.isVerified || false;

                    // Check if the user has a subscription plan and it's an object
                    if (user.subscription && typeof user.subscription === 'object') {
                        const userSubscriptionRef = dbRef(db, `Users/${this.userId}/subscription`);
                        const subscriptionSnapshot = await get(userSubscriptionRef);

                        if (subscriptionSnapshot.exists()) {
                            const subscriptionData = subscriptionSnapshot.val();
                            this.userSubscriptionId = subscriptionData.subscription_id;

                            // Query the Suscriptions collection
                            const subscriptionDataRef = dbRef(db, `Suscriptions/${this.userSubscriptionId}`);
                            const userSuscriptionSnapshot = await get(subscriptionDataRef);

                            if (userSuscriptionSnapshot.exists()) {
                                const userSuscription = userSuscriptionSnapshot.val();

                                this.subscriptionPlan = {
                                    id: this.userSubscriptionId,
                                    name: userSuscription.name || 'Sin suscripcion',
                                    status: subscriptionData.status || 'No Status',
                                    price: userSuscription.price || 'No Price',
                                    payDay: subscriptionData.payDay || 'No PayDay',
                                    isPaid: subscriptionData.isPaid || false,
                                    icon: userSuscription.icon || 'fa fa-times'
                                };
                            }
                        }

                    } else {
                        // Handle case where there is no subscription plan
                        this.subscriptionPlan = {
                            status: 'No Subscription',
                            price: 0,
                            payDay: 'N/A',
                            isPaid: false
                        };
                    }
                }
            }
        },
        //File uploads
        handleFileUpload(event, type) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
				alert('Por favor, selecciona un archivo de imagen válido.');
				event.target.value = ''; // Clear the invalid file
				return;
			}

            // Update the correct file and preview based on the side
            if (type === 'front') {
                this.idFrontFile = file;
                this.idFrontPreview = URL.createObjectURL(file);
            } else if (type === 'back') {
                this.idBackFile = file;
                this.idBackPreview = URL.createObjectURL(file);
            } else if (type === 'selfie') {
                this.selfieFile = file;
                this.selfiePreview = URL.createObjectURL(file);
            }
        },

        async uploadFile(file, type) {
            // Define storage reference for front or back ID file
            const fileName = `${type === 'selfie' ? 'selfie' : `${type}-ID`}.${file.name.split('.').pop()}`;
            const fileRef = storageRef(storage, `verification-files/${this.userId}-${this.userName}/${fileName}`);

            // Upload the file and get the download URL
            await uploadBytes(fileRef, file);
            return getDownloadURL(fileRef);
        },

        redirectToSubs(subscriptionPlan) {
            console.log(subscriptionPlan.id);
            this.$router.push({
                path: '/suscripciones',
                query: { clientSubscriptionId: subscriptionPlan.id }
            });
        },

        async submitVerification() {
            if (!this.idFrontFile || !this.idBackFile || !this.selfieFile) {
                this.errorMessage = 'Ambos archivos de la identificación son requeridos.';
                return;
            }

            try {
                // Show the loader
                this.isSubmitting = true;
                this.errorMessage = '';

                // Upload both files
                const frontUrl = await this.uploadFile(this.idFrontFile, 'front');
                const backUrl = await this.uploadFile(this.idBackFile, 'back');
                const selfieUrl = await this.uploadFile(this.selfieFile, 'selfie');

                console.log('Files uploaded successfully:', frontUrl, backUrl, selfieUrl);

                //Update user to set field user.requestedVerification = true
                const userRef = dbRef(db, `Users/${this.userId}`);
                await update(userRef,
                    {
                        'verificationFiles/Front-ID': frontUrl,
                        'verificationFiles/Back-ID': backUrl,
                        'verificationFiles/Selfie': selfieUrl,
                        requestedVerification: true
                    });

                // Send an email notification to the admin through Firebase Cloud Functions				
                const appUrl = 'https://app.rosecoupon.com';
                const emailPayload = {
                    to: 'roseindustry11@gmail.com',
                    message: {
                        subject: "Usuario solicitó verificación",
                        text: `Hola administrador, el usuario ${this.userName} ha solicitado verificación de identidad en Roseapp.
                        Para verificar el usuario, abre la app en el siguiente enlace: ${appUrl}`,
                        html: `<p>Hola administrador,</p>
               <p>El usuario <strong>${this.userName}</strong> ha solicitado verificación de identidad en Roseapp.</p>
               <p>Para verificar el usuario, por favor <a href="${appUrl}" target="_blank">abre la app</a>.</p>`
                    },
                };
                
                // Send email via the utility function
                const result = await sendEmail(emailPayload);

                if (result.success) {
                    console.log("Verification email sent successfully:", result.message);
                } else {
                    console.error("Failed to send verification email:", result.error);
                }

                //Success toast
                showToast('Archivos subidos!');

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
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
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
        //this.role = userStore.role;
        this.userId = userStore.userId;
        console.log(this.userId)
        this.userName = userStore.userName;

        this.verificationModal = new Modal(document.getElementById('verificationModal'));

        await this.fetchSubscriptionPlan();
        window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt());
    },
});

</script>
<template>
    <div class="container">
        <!-- Header Section -->
        <div class="portal-header mb-4">
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
                                <small class="status-hint">
                                    {{ subscriptionPlan.isPaid ? 'Suscripción activa' : 'Pago pendiente' }}
                                </small>
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
                        <div v-if="!userVerified" class="status-card verification-card-alert mt-2" 
                            data-bs-toggle="modal" data-bs-target="#verificationModal">
                            <div class="status-icon">
                                <i class="fa-solid fa-user-xmark"></i>
                            </div>
                            <div class="status-info">
                                <div class="status-name">CUENTA SIN VERIFICAR</div>
                                <small class="status-hint">Haz clic para verificar tu cuenta</small>
                            </div>
                        </div>
                        <div v-else class="status-card verification-card mt-2">
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
                    <div class="card-body d-flex flex-column" 
                        :style="{
                            backgroundImage: `url(${item.bgImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }">
                        <div class="card-content">
                            <h5 class="card-title mb-3">{{ item.title }}</h5>
                            <p class="card-text">{{ item.description }}</p>
                            
                            <div class="mt-auto pt-3">
                                <router-link :to="item.link" class="btn btn-theme w-100"
                                    :class="{ 
                                        'disabled': (item.title === 'Crédito' && !userVerified) || 
                                                  (item.title === 'Solicitar cupón' && subscriptionPlan.price === 0) || 
                                                  item.notReady === true 
                                    }"
                                    :aria-disabled="item.title === 'Crédito' && !userVerified"
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
                                        <span>Debes contar con suscripción Bronce en adelante para este beneficio.</span>
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Verification Modal (Keep existing) -->
        <div class="modal fade" id="verificationModal" tabindex="-1" aria-labelledby="verificationModalLabel"
            aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="verificationModalLabel">Subir Documento de Identificación</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form @submit.prevent="submitVerification">
                            <div class="mb-3">
                                <label for="idFront" class="form-label">Frontal de la Cédula/Identificación</label>
                                <input type="file" class="form-control" id="idFront"
                                accept="image/*" @change="handleFileUpload($event, 'front')" required>
                                <img v-if="idFrontPreview" :src="idFrontPreview" alt="Front ID Preview"
                                    class="img-fluid mt-2" />
                            </div>
                            <div class="mb-3">
                                <label for="idBack" class="form-label">Parte Trasera de la Cédula/Identificación</label>
                                <input type="file" class="form-control" id="idBack"
                                accept="image/*" @change="handleFileUpload($event, 'back')" required>
                                <img v-if="idBackPreview" :src="idBackPreview" alt="Back ID Preview"
                                    class="img-fluid mt-2" />
                            </div>
                            <div class="mb-3">
                                <label for="selfie" class="form-label">Foto Selfie con Cédula visible</label>
                                <input type="file" class="form-control" id="selfie"
                                accept="image/*" @change="handleFileUpload($event, 'selfie')" required>
                                <img v-if="selfiePreview" :src="selfiePreview" alt="Selfie Preview"
                                    class="img-fluid mt-2" />
                            </div>

                            <!-- Error Message -->
                            <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

                            <!-- Loader Spinner -->
                            <div v-if="isSubmitting" class="d-flex justify-content-center my-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cerrar</button>
                            <!-- Submit Button is disabled during submission -->
                            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                                Subir y Solicitar Verificación
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
/* Keep existing button color */
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

/* Card styling improvements */
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
    background-color:transparent;
    border-radius: 8px;
    padding: 0.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
}

/* Improved ribbon */
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

/* Compact header styles */
.portal-header {
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid rgba(0,0,0,0.1);
}

/* Status badges container */
.badges-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

/* Status card styles (for both subscription and verification) */
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

/* Subscription specific styles */
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

/* Verification specific styles */
.verification-card {
    border-left: 4px solid #198754;
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

/* Common status icon styles */
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

/* Warning message styles */
.warning-message {
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    padding: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .portal-header {
        text-align: center;
    }
    
    .badges-container {
        align-items: center;
        margin-top: 1rem;
    }
    
    .status-card {
        max-width: 250px;
    }
}

@media (max-width: 576px) {
    .row-cols-1 {
        margin: 0 0.5rem;
    }
    
    .card-content {
        padding: 1rem;
    }
}
</style>