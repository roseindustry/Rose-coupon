<script>
import { defineComponent } from 'vue';
import { useUserStore } from '@/stores/user-role';
import { db } from '../firebase/init';
import { ref as dbRef, get } from 'firebase/database';

export default defineComponent({
    name: 'PageAffiliatePortal',
    data() {
        return {
            // data for portal items
            portalItems: [
                { title: 'Cupones', description: 'Aplique cupones para sus clientes aquí.', link: '/cupones', actionText: 'Acceder', icon: 'fa-solid fa-ticket' },
                { title: 'Giftcards', description: 'Aplique tarjetas de regalo para sus clientes aquí.', link: '/giftcards', actionText: 'Acceder', icon: 'fa-solid fa-money-bill' },
                { title: 'Suscripciones', description: 'Administre su suscripción aquí.', link: '/suscripciones', actionText: 'Acceder', icon: 'fa-solid fa-handshake', notReady: false },
                { title: 'Empleos', description: 'Publique vacantes.', link: '/jobs', actionText: 'Acceder', icon: 'fa-solid fa-suitcase' },
                { title: 'Crédito', description: 'Aquí puedes manejar el crédito de tu negocio.', notReady: false, link: '/creditos', actionText: 'Ver más', icon: 'fa-solid fa-dollar' },
                // { title: 'Encuentas de satisfacción', description: 'Ayudanos a mejorar tomando una pequeña encuesta.', notReady: true, link: '/customer-survey', actionText: 'Tomar Encuesta', icon: 'fa-solid fa-comment-dots' },
                // { title: 'Soporte', description: 'Contacta con soporte aquí.', notReady: true, link: '#', actionText: 'Ver más', icon: 'fa-solid fa-phone' }
            ],

            subscriptionPlan: {},
            userSubscriptionId: null,
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

                    // Check if the user has a subscription plan and it's an object
                    if (user.subscription && typeof user.subscription === 'object') {
                        const userSubscriptionRef = dbRef(db, `Users/${this.userId}/subscription`);
                        const subscriptionSnapshot = await get(userSubscriptionRef);

                        if (subscriptionSnapshot.exists()) {
                            const subscriptionData = subscriptionSnapshot.val();
                            this.userSubscriptionId = subscriptionData.subscription_id;

                            // Query the Suscriptions collection
                            const subscriptionDataRef = dbRef(db, `Affiliate_suscriptions/${this.userSubscriptionId}`);
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
                                    icon: userSuscription.icon || null
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

        redirectToSubs(subscriptionPlan) {
            console.log(subscriptionPlan.id);
            this.$router.push({
                path: '/suscripciones',
                query: { clientSubscriptionId: subscriptionPlan.id }
            });
        },
    },
    async mounted() {
        const userStore = useUserStore();
        userStore.fetchUser();
        //this.role = userStore.role;
        this.userId = userStore.userId;
        this.userName = userStore.userName;

        await this.fetchSubscriptionPlan();
    },
});
</script>
<template>
    <div class="container">
        <!-- Header Section -->
        <div class="portal-header mb-4">
            <div class="row align-items-center">
                <div class="col-md-7">
                    <h2 class="fw-bold mb-0">Portal de Afiliados</h2>
                    <p class="text-muted small mb-0">Herramientas para gestionar tu negocio</p>
                </div>
                <div class="col-md-5">
                    <!-- Subscription Badge (Improved) -->
                    <div class="subscription-container">
                        <div v-if="subscriptionPlan && subscriptionPlan.status && subscriptionPlan.name"
                            class="subscription-card" @click="redirectToSubs(subscriptionPlan)">
                            <div class="subscription-icon">
                                <i :class="subscriptionPlan.icon"></i>
                            </div>
                            <div class="subscription-info">
                                <div class="subscription-name">{{ subscriptionPlan.name.toUpperCase() }}</div>
                                <small class="subscription-hint">Haz clic para cambiar</small>
                            </div>
                        </div>
                        <div v-else class="subscription-card subscription-card-alert"
                            @click="$router.push('/suscripciones')">
                            <div class="subscription-icon">
                                <i class="fa-solid fa-exclamation-circle"></i>
                            </div>
                            <div class="subscription-info">
                                <div class="subscription-name">SIN SUSCRIPCIÓN</div>
                                <small class="subscription-hint">Haz clic para suscribirte</small>
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
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex align-items-center mb-3">
                            <div class="icon-circle me-3">
                                <i :class="item.icon"></i>
                            </div>
                            <h5 class="card-title mb-0">{{ item.title }}</h5>
                        </div>
                        <p class="card-text flex-grow-1">{{ item.description }}</p>
                        <div class="mt-3">
                            <router-link :to="item.link" class="btn btn-theme w-100"
                                :class="{ 'disabled': item.notReady === true }">
                                <i :class="item.icon" class="me-2"></i>
                                {{ item.actionText }}
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
/* Keep existing button styles */
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

/* Improved icon circle */
.icon-circle {
    background-color: white;
    color: #000;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
}

/* Card styling improvements */
.portal-card {
    overflow: hidden;
    transition: all 0.3s ease;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.portal-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
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
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

/* Compact subscription styles */
.subscription-container {
    display: flex;
    justify-content: flex-end;
}

.subscription-card {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 8px;
    padding: 8px 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    transition: all 0.2s ease;
    border-left: 4px solid #198754;
    max-width: 250px;
}

.subscription-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.subscription-card-alert {
    border-left: 4px solid #dc3545;
}

.subscription-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(25, 135, 84, 0.1);
    color: #198754;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    margin-right: 10px;
    flex-shrink: 0;
}

.subscription-card-alert .subscription-icon {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
}

.subscription-info {
    flex: 1;
}

.subscription-name {
    font-weight: 600;
    font-size: 0.8rem;
    color: #333;
}

.subscription-hint {
    display: block;
    color: #6c757d;
    font-size: 0.7rem;
    margin-top: 1px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .portal-header {
        padding-bottom: 0 !important;
        margin-bottom: 0 !important;
        text-align: center;
    }

    .subscription-container {
        justify-content: center;
        margin-top: 1rem;
    }

    .subscription-card {
        width: 100%;
        max-width: 250px;
    }
}

@media (max-width: 576px) {
    .row-cols-1 {
        margin: 0 !important;
    }
}
</style>