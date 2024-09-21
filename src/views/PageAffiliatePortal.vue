<script>
import { defineComponent } from 'vue';
import { useUserStore } from '@/stores/user-role';
import { db } from '../firebase/init';
import { ref as dbRef, get } from 'firebase/database';
import { Modal } from 'bootstrap';

export default defineComponent({
    data() {
        return {
            // data for portal items
            portalItems: [
                { title: 'Cupones', description: 'Chequee sus cupones aquí.', link: '/cupones', actionText: 'Ver cupones', icon: 'fa-solid fa-ticket' },
                { title: 'Encuentas de satisfacción', description: 'Ayudanos a mejorar tomando una pequeña encuesta.', link: '/customer-survey', actionText: 'Tomar Encuesta', icon: 'fa-solid fa-comment-dots' },
                { title: 'Crédito', description: 'Aquí puedes manejar el crédito de tu negocio.', link: '/creditos', actionText: 'Ver más', icon: 'fa-solid fa-dollar' },
                { title: 'Soporte', description: 'Contacta con soporte aquí.', link: '#', actionText: 'Ver más', icon: 'fa-solid fa-phone' }
            ],
            subscriptionPlan: '',
            subscriptionPlan: '',
            userVerified: false,
            idFrontFile: null,
            idBackFile: null,
            isSubmitting: false,
        };
    },
    methods: {
        async fetchSubscriptionPlan() {
            const userStore = useUserStore();
            await userStore.fetchUser();
            const userId = userStore.userId;

            if (userId) {
                const userRef = dbRef(db, `Users/${userId}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const user = snapshot.val();
                    this.subscriptionPlan = user.plan;
                }
            }
        },
        handleFileUpload(side) {
            // Handle the file upload for front and back
            const input = side === 'front' ? 'idFrontFile' : 'idBackFile';
            this[input] = event.target.files[0];
        },
        async submitVerification() {
            try {
                // Show the loader
                this.isSubmitting = true;

                // Simulate an upload process with a delay (replace with your upload logic)
                console.log('Uploading files...', this.idFrontFile, this.idBackFile);

                // Simulate a delay for the upload process (e.g., an API call)
                // await new Promise((resolve) => setTimeout(resolve, 2000));

                //Update user to set field user.requestedVerification = true

                // Hide the modal after submission
                const modal = new Modal(document.getElementById('verificationModal'));
                modal.hide();

                // Optionally show a success message
            } catch (error) {
                console.error('Error during verification:', error);
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        }
    },
    async mounted() {
        await this.fetchSubscriptionPlan();
    },
});
</script>
<template>
    <div class="container py-5 h-100">
        <!-- Subscription Badge -->
        <div class="subscription-badge position-absolute top-0 end-0 m-3">
            <div v-if="subscriptionPlan && subscriptionPlan.status" class="d-flex align-items-center flex-wrap">
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
                            No tiene un plan de suscripción activo.
                        </span>
                    </span>
                </div>
            </div>
        </div>
        <div class="row justify-content-center align-items-center h-100">
            <div class="col-12">
                <div class="card shadow-lg position-relative">


                    <div class="card-body pb-5 pt-5 pt-md-5 pt-lg-5">
                        <h2 class="card-title mb-4 text-center">Portal de Afiliados</h2>

                        <div class="row row-cols-1 row-cols-md-2 g-4">
                            <div class="col" v-for="item in portalItems" :key="item.title">
                                <div class="card h-100 text-dark bg-light position-relative">
                                    <div class="card-body">
                                        <h5 class="card-title">{{ item.title }}</h5>
                                        <p class="card-text">{{ item.description }}</p>
                                        <router-link :to="item.link" class="btn btn-primary"
                                            :class="{ 'disabled': item.title === 'Crédito' && !userVerified }"
                                            :aria-disabled="item.title === 'Crédito' && !userVerified"
                                            :tabindex="item.title === 'Crédito' && !userVerified ? -1 : 0">
                                            {{ item.actionText }}
                                        </router-link>
                                        <i :class="[item.icon, 'icon-circle']"></i>
                                        <!-- Tooltip or message when 'Crédito' button is disabled -->
                                        <div v-if="item.title === 'Crédito' && !userVerified" class="mt-2">
                                            <small class="text-danger">
                                                Verifique su cuenta para habilitar la opción de crédito.
                                                <a href="#" data-bs-toggle="modal"
                                                    data-bs-target="#verificationModal">Solicitar verificación.</a>
                                            </small>
                                        </div>
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
                                <input type="file" class="form-control" id="idFront" @change="handleFileUpload('front')"
                                    required>
                            </div>
                            <div class="mb-3">
                                <label for="idBack" class="form-label">Parte Trasera de la Cédula/Identificación</label>
                                <input type="file" class="form-control" id="idBack" @change="handleFileUpload('back')"
                                    required>
                            </div>

                            <!-- Loader Spinner -->
                            <div v-if="isSubmitting" class="d-flex justify-content-center my-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                </div>
                            </div>

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
<style>
/* Subscription Badge Styles */
.subscription-badge {
    font-size: 0.9rem;
    z-index: 2;
}

.icon-circle {
    position: absolute;
    right: 0;

    margin: 15px;
    top: calc(50% - 20px);

    font-size: 25px;

    background-color: white;
    color: #000;

    width: 40px;

    height: 40px;

    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.card {
    overflow: hidden;
}

/* Responsive Adjustments */
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