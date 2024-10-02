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
                { title: 'Cupones', description: 'Aplique cupones para sus clientes aquí.', link: '/cupones', actionText: 'Ver cupones', icon: 'fa-solid fa-ticket' },
                { title: 'Encuentas de satisfacción', description: 'Ayudanos a mejorar tomando una pequeña encuesta.', notReady: true, link: '/customer-survey', actionText: 'Tomar Encuesta', icon: 'fa-solid fa-comment-dots' },
                { title: 'Crédito', description: 'Aquí puedes manejar el crédito de tu negocio.', notReady: true, link: '/creditos', actionText: 'Ver más', icon: 'fa-solid fa-dollar' },
                { title: 'Soporte', description: 'Contacta con soporte aquí.', notReady: true, link: '#', actionText: 'Ver más', icon: 'fa-solid fa-phone' }
            ],
        };
    },
    methods: {

    },
    async mounted() {

    },
});
</script>
<template>
    <div class="container py-5 h-100">
        <div class="row justify-content-center align-items-center h-100">
            <div class="col-12">
                <div class="pb-5 pt-5 pt-md-5 pt-lg-5">
                    <h2 class="mb-4 text-center">Portal de Afiliados</h2>

                    <div class="row row-cols-1 row-cols-md-2 g-4">
                        <div class="col" v-for="item in portalItems" :key="item.title">
                            <div class="card h-100 position-relative">
                                <div class="card-body">
                                    <h5 class="card-title">{{ item.title }} {{ item.notReady === true ?
                                        `(Proximamente)` : '' }}</h5>
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
</style>