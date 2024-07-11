<script>
import { defineComponent } from 'vue';
import { useUserStore } from '@/stores/user-role';
import { db } from '../firebase/init';
import { ref as dbRef, get } from 'firebase/database';

export default defineComponent({
    data() {
        return {
            // data for portal items
            portalItems: [
                { title: 'Ordenes recientes (Coming soon)', description: 'Ver sus ordenes recientes en este negocio.', link: '#', actionText: 'Ver órdenes', icon: 'fa-solid fa-book-open' },
                { title: 'Encuenta de satisfaccion', description: 'Ayudanos a mejorar tomando una pequeña encuesta.', link: '/page/customer-survey', actionText: 'Tomar Encuesta', icon: 'fa-solid fa-comment-dots' },
                { title: 'Mis reseñas', description: 'Aqui se muestran tus reseñas a nuestros productos.', link: '/page/clients-ratings', actionText: 'Ver más', icon: 'fa-solid fa-star' },
                { title: 'Ajustes de perfil', description: 'Actualiza tus datos aqui.', link: '/profile', actionText: 'Editar Perfil', icon: 'fa-solid fa-user' },
                { title: 'Cupones', description: 'Descubre tus cupones aquí.', link: '/page/coupons', actionText: 'Ver más', icon: 'fa-solid fa-ticket' }
            ],
            subscriptionPlan: '',
        };
    },
    methods: {
        getPlanCardClass(plan) {
            const planClasses = {
                'Basico': 'bg-basic',
                'Plata': 'bg-plata',
                'Oro': 'bg-oro'
            };
            return planClasses[plan] || 'bg-secondary';
        },
        getPlanIcon(plan) {
            const planIcons = {
                'Basico': 'fa fa-leaf',
                'Plata': 'fa fa-gem',
                'Oro': 'fa fa-crown'
            };
            return planIcons[plan] || 'fa fa-question';
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
                    this.subscriptionPlan = user.plan;
                }
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
        <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item active"><a href="/page/client-portal">Portal de clientes</a></li>
            </ol>
        </nav>
        <div class="row justify-content-center align-items-center h-100">
            <div class="col">
                <div class="card shadow-lg">
                    <div class="card-body">
                        <h2 class="card-title mb-4 text-center">Portal de Clientes</h2>
                        <div v-if="subscriptionPlan" class="card mb-3 subscription-card" :class="getPlanCardClass(subscriptionPlan)">
                            <div class="card-body text-center">
                                <i :class="getPlanIcon(subscriptionPlan)" class="plan-icon"></i>
                                <h5 class="form-label" style="color: black;">Suscripción</h5>
                                <p class="plan-name">{{ subscriptionPlan }}</p>
                            </div>
                        </div>
                        <div class="row row-cols-1 row-cols-md-2 g-4">
                            <div class="col" v-for="item in portalItems" :key="item.title">
                                <div class="card h-100 text-dark bg-light position-relative">
                                    <div class="card-body">
                                        <h5 class="card-title">{{ item.title }}</h5>
                                        <p class="card-text">{{ item.description }}</p>
                                        <router-link :to="item.link" class="btn btn-primary">{{ item.actionText }}</router-link>
                                        <i :class="[item.icon, 'icon-circle']"></i>
                                    </div>
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
/* Card styling for subscription section */
.subscription-card {
    max-width: 200px; 
    margin: 0 auto;
}

.plan-name {
    font-size: 1.5rem;
    font-weight: bold;
    color: black;
}
.plan-icon {
    font-size: 2.5rem;
    margin-bottom: 10px;
    color: #9fc5e8;
}
.bg-basic {
    background-color: #f8d1d1; 
    color: #000;
}

.bg-plata {
    background-color: #d1e7f8;
    color: #000;
}

.bg-oro {
    background-color: #f8e7d1; 
    color: #000;
}

</style>