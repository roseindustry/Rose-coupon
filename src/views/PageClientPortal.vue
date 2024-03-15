<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
    components: {
    },
    data() {
        return {
            // data for portal items
            portalItems: [
                { title: 'Ordenes recientes (Coming soon)', description: 'Ver sus ordenes recientes en este negocio.', link: '#', actionText: 'Ver ordenes', icon: 'fa-solid fa-book-open' },
                { title: 'Encuenta de satisfaccion', description: 'Ayudanos a mejorar tomando una pequeña encuesta.', link: '/page/customer-survey', actionText: 'Tomar Encuesta', icon: 'fa-solid fa-comment-dots' },
                { title: 'Mis reseñas', description: 'Aqui se muestran tus reseñas a nuestros productos.', link: '/page/clients-ratings', actionText: 'Ver mas', icon: 'fa-solid fa-star' },
                { title: 'Ajustes de perfil', description: 'Actualiza tus datos aqui.', link: '/profile', actionText: 'Editar Perfil', icon: 'fa-solid fa-user' }
            ]
        };
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
</style>