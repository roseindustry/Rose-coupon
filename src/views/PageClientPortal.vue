<script>
import { defineComponent } from 'vue';
import { useUserStore } from '@/stores/user-role';
import { db, storage } from '../firebase/init';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, get, update } from 'firebase/database';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

export default defineComponent({
    data() {
        return {
            // deferredPrompt: null,

            userId: '',
            userName: '',

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
                { title: 'Eventos', description: 'Descubre nuestros próximos eventos.', link: '/events', actionText: 'Ver más', notReady: false, bgImage: '/assets/img/rose_imgs/3.png' },
                { 
                    title: 'Crédito', 
                    description: 'Solicite o modifique su crédito aquí.', 
                    link: '/creditos', 
                    actionText: 'Ver más', 
                    notReady: true, 
                    bgImage: '/assets/img/rose_imgs/2.png' 
                },
                { title: 'Compras recientes', description: 'Ver sus compras recientes.', link: '#', actionText: 'Ver más', notReady: true, bgImage: '/assets/img/rose_imgs/5.png' },
                { title: 'Mis Opiniones', description: 'Aqui se muestran tus reseñas y opiniones de lo que consumes.', link: '/clients-ratings', actionText: 'Ver más', notReady: true, bgImage: '/assets/img/rose_imgs/6.png' },
                { title: 'Encuestas', description: 'Ayudanos a mejorar tomando una pequeña encuesta.', link: '/customer-survey', actionText: 'Tomar Encuesta', notReady: true, bgImage: '/assets/img/rose_imgs/6.png' },
            ],

            subscriptionPlan: '',
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

        async fetchSubscriptionPlan() {
            const userStore = useUserStore();
            await userStore.fetchUser();
            const userId = userStore.userId;

            if (userId) {
                const userRef = dbRef(db, `Users/${userId}`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    const user = snapshot.val();

                    this.userVerified = user.isVerified || false;

                    // Check if the user has a subscription plan and it's an object
                    if (user.subscription && typeof user.subscription === 'object') {
                        this.subscriptionPlan = {
                            name: user.subscription.name || 'Sin suscripcion',
                            status: user.subscription.status || 'No Status',
                            price: user.subscription.price || 'No Price',
                            payDay: user.subscription.payDay || 'No PayDay',
                            isPaid: user.subscription.isPaid || false,
                            icon: user.subscription.icon
                        };
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

                //Success toast
                this.showToast('Archivos subidos!');

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

        //Promt the user to download the shortcut to the app on their phone
        // handleBeforeInstallPrompt(event) {
        //     console.log('beforeinstallprompt event fired');
        //     event.preventDefault();
        //     this.deferredPrompt = event;

        //     const installButton = document.getElementById('install-button');
        //     if (installButton) {
        //         // Show the install button
        //         installButton.style.display = 'block';

        //         // Add click event to trigger the prompt
        //         installButton.addEventListener('click', this.triggerInstall);
        //     }
        // },
        // triggerInstall() {
        //     const installButton = document.getElementById('install-button');
        //     installButton.style.display = 'none'; // Hide the button after it's clicked

        //     if (this.deferredPrompt) {
        //         this.deferredPrompt.prompt();
        //         this.deferredPrompt.userChoice.then((choiceResult) => {
        //             if (choiceResult.outcome === 'accepted') {
        //                 console.log('User accepted the install prompt');
        //             } else {
        //                 console.log('User dismissed the install prompt');
        //             }
        //             this.deferredPrompt = null;
        //         });
        //     }
        // },
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
        this.userName = userStore.userName;

        this.verificationModal = new Modal(document.getElementById('verificationModal'));

        await this.fetchSubscriptionPlan();
        window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt());
    },
});

</script>
<template>
    <div class="container py-5 h-100">
        <!-- Add an install button in your template
        <button id="install-button" style="display: none;">Instale acceso a Rose Coupon</button> -->

        <!-- Subscription Badge -->
        <div class="subscription-badge position-absolute text-muted text-center top-0 end-0 m-3">
            <div v-if="subscriptionPlan && subscriptionPlan.status && subscriptionPlan.name"
                class="d-flex align-items-center flex-wrap">
                <h5 class="m-0">
                    <div class="subscription-badge mb-4">
                        <span
                            class="badge bg-transparent border border-success text-success d-flex flex-column align-items-start p-2">
                            <span class="d-flex align-items-center">
                                <i :class="subscriptionPlan.icon" class="me-2" style="font-size: 1.5rem;"></i>
                                {{ subscriptionPlan.name }}
                            </span>
                            <span :class="subscriptionPlan.isPaid ? 'text-success mt-2' : 'text-danger mt-2'">
                                {{ subscriptionPlan.isPaid ? 'Pagado' : 'Pago Pendiente' }}
                            </span>
                        </span>
                    </div>
                </h5>
            </div>
            <div v-else>
                <div class="subscription-badge text-muted">
                    <span
                        class="badge bg-transparent border border-danger text-danger d-flex flex-column align-items-start p-2">
                        <span class="d-flex align-items-center">
                            <i class="me-2" style="font-size: 1.5rem;"></i>
                            No tiene una suscripción activa.
                        </span>
                    </span>
                </div>
            </div>
            <span v-if="userVerified"
                class="badge bg-transparent border border-success text-success d-flex flex-column align-items-center p-2">
                <span class="d-flex align-items-center">
                    <i class="fa-solid fa-user-check me-2"></i>
                    Usuario verificado
                </span>
            </span>
            <span v-else
                class="badge bg-transparent border border-danger text-danger d-flex flex-column align-items-center p-2">
                <span class="d-flex align-items-center">
                    <i class="fa-solid fa-user-xmark me-2"></i>
                    Usuario no Verificado
                </span>
            </span>
        </div>

        <div class="row justify-content-center align-items-center h-100 mt-5">
            <div class="col-12">
                <div class="pb-5 pt-5 pt-md-5 pt-lg-5">
                    <h2 class="mb-4 text-center">Portal de Clientes</h2>

                    <div class="row row-cols-1 row-cols-md-2 g-4">
                        <div class="col" v-for="item in portalItems" :key="item.title">
                            <div class="card h-100 text-dark bg-light position-relative" :style="{
                                backgroundImage: `url(${item.bgImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                paddingTop: '45%'
                            }">
                                <div class="card-body"
                                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                                    <h5 class="card-title">{{ item.title }} {{ item.notReady === true ?
                                        `(Proximamente)` : '' }}</h5>
                                    <p class="card-text">{{ item.description }}</p>
                                    <router-link :to="item.link" class="btn btn-theme"
                                        :class="{ 'disabled': (item.title === 'Crédito' && !userVerified) || item.notReady === true }"
                                        :aria-disabled="item.title === 'Crédito' && !userVerified"
                                        :tabindex="item.title === 'Crédito' && !userVerified ? -1 : 0">
                                        {{ item.actionText }}
                                    </router-link>
                                    <!-- Tooltip or message when 'Crédito' button is disabled -->
                                    <div v-if="item.title === 'Crédito' && !userVerified" class="mt-2">
                                        <small class="text-danger">
                                            <span v-if="verificationStatus === 'unverified'">
                                                Verifique su cuenta para habilitar la opción de crédito.
                                                <a href="#" class="text-white" data-bs-toggle="modal"
                                                    data-bs-target="#verificationModal">
                                                    <br>
                                                    Solicitar verificación.</a>
                                            </span>
                                            <span v-else-if="verificationStatus === 'pending'">
                                                Verificación pendiente por Aprobación.
                                            </span>
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <!-- Modal for ID upload -->
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
                                    @change="handleFileUpload($event, 'front')" required>
                                <img v-if="idFrontPreview" :src="idFrontPreview" alt="Front ID Preview"
                                    class="img-fluid mt-2" />
                            </div>
                            <div class="mb-3">
                                <label for="idBack" class="form-label">Parte Trasera de la Cédula/Identificación</label>
                                <input type="file" class="form-control" id="idBack"
                                    @change="handleFileUpload($event, 'back')" required>
                                <img v-if="idBackPreview" :src="idBackPreview" alt="Back ID Preview"
                                    class="img-fluid mt-2" />
                            </div>
                            <div class="mb-3">
                                <label for="selfie" class="form-label">Foto Selfie con Cédula visible</label>
                                <input type="file" class="form-control" id="selfie"
                                    @change="handleFileUpload($event, 'selfie')" required>
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
.btn-theme{
	background-color: purple;
	border-color: purple;
}
/* Subscription Badge Styles */
.subscription-badge {
    font-size: 0.9rem;
    z-index: 2;
}

.card {
    overflow: hidden;
}

@media (max-width: 767.98px) {

    .subscription-badge {
        margin-bottom: 1rem;
    }

    .subscription-badge h5 {
        font-size: 0.85rem;
    }

    .subscription-badge i {
        font-size: 1.2rem;
    }
}
</style>