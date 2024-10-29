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
                { title: 'Cupones', description: 'Aplique cupones para sus clientes aquí.', link: '/cupones', actionText: 'Acceder', icon: 'fa-solid fa-ticket' },
                { title: 'Giftcards', description: 'Aplique tarjetas de regalo para sus clientes aquí.', link: '/giftcards', actionText: 'Acceder', icon: 'fa-solid fa-money-bill' },
                { title: 'Suscripciones', description: 'Administre su suscripción aquí.', link: '/suscripciones', actionText: 'Acceder', icon: 'fa-solid fa-handshake', notReady: false },
                { title: 'Empleos', description: 'Publique vacantes.', link: '/jobs', actionText: 'Acceder', icon: 'fa-solid fa-suitcase' },
                // { title: 'Encuentas de satisfacción', description: 'Ayudanos a mejorar tomando una pequeña encuesta.', notReady: true, link: '/customer-survey', actionText: 'Tomar Encuesta', icon: 'fa-solid fa-comment-dots' },
                { title: 'Crédito', description: 'Aquí puedes manejar el crédito de tu negocio.', notReady: false, link: '/creditos', actionText: 'Ver más', icon: 'fa-solid fa-dollar' },
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
        await userStore.fetchUser();
        //this.role = userStore.role;
        this.userId = userStore.userId;
        this.userName = userStore.userName;

        await this.fetchSubscriptionPlan();
    },
});
</script>
<template>
    <div class="container py-5 h-100">

        <!-- Badges -->
        <div class="subscription-badge-container position-absolute text-muted text-center top-0 end-0 m-3">
            <div class="align-items-center">

                <!-- Subscription Plan Badge (Left) -->
                <div v-if="subscriptionPlan && subscriptionPlan.status && subscriptionPlan.name"
                    class="d-flex align-items-center ms-3">
                    <a href="#" @click.prevent="redirectToSubs(subscriptionPlan)" id="subscription-button" class="btn">
                        <span
                            class="badge bg-light border border-success text-success d-flex align-items-center px-3 py-2 shadow-sm rounded-pill"
                            style="width: auto;">
                            <i :class="subscriptionPlan.icon" class="me-2" style="font-size: 1.2rem;"></i>
                            {{ subscriptionPlan.name.toUpperCase() }}
                        </span>
                    </a>
                    <small class="text-muted d-block ms-2">Haz clic para cambiar tu suscripción</small>
                </div>
                <div v-else class="d-flex align-items-center">
                    <RouterLink to="/suscripciones" class="btn">
                        <span
                            class="badge bg-light border border-danger text-danger d-flex align-items-center px-3 py-2 shadow-sm rounded-pill"
                            style="width: auto;">
                            <i class="me-2 fa-solid fa-exclamation-circle" style="font-size: 1.2rem;"></i>
                            Click para suscribirte
                        </span>
                    </RouterLink>
                </div>
            </div>
        </div>

        <div class="row justify-content-center align-items-center h-100">
            <div class="col-12">
                <div class="pb-5 pt-5 pt-md-5 pt-lg-5">
                    <h2 class="mb-4 text-center">Portal de Afiliados</h2>

                    <div class="row row-cols-1 row-cols-md-2 g-4">
                        <div class="col" v-for="item in portalItems" :key="item.title">
                            <div class="card h-100 position-relative">
                                <div class="card-body">
                                    <h5 class="card-title">{{ item.title }}</h5>
                                    <div v-if="item.notReady === true" class="ribbon">
                                        <span>Proximamente</span>
                                    </div>
                                    <p class="card-text">{{ item.description }}</p>
                                    <router-link :to="item.link" class="btn btn-theme"
                                        :class="{ 'disabled': item.notReady === true }">
                                        {{ item.actionText }}
                                    </router-link>
                                    <i :class="[item.icon, 'icon-circle']"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
.btn-theme {
    background-color: purple;
    border-color: purple;
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

.ribbon {
    position: absolute;
    top: 25px;
    right: -20px;
    background: #8c042c;
    color: #fff;
    padding: 5px 15px;
    font-size: 0.875rem;
    font-weight: bold;
    transform: rotate(45deg);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
</style>