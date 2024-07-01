<script>
import { useUserStore } from '@/stores/user-role';
import { ref as dbRef, query, orderByChild, equalTo, get } from 'firebase/database';
import { db } from '@/firebase/init';

export default {
    data() {
        return {
            coupons: [],
        };
    },
    computed: {
        currentPageName() {
            return this.$route.name;
        }
    },
    created() {
        // this.fetchcoupons();
    },
    methods: {
        
    },
};
</script>
<template>
    <div class="container py-5 h-100">
        <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><router-link to="/page/client-portal">Portal de clientes</router-link></li>
                <li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
            </ol>
        </nav>
        <div class="row">
            <div class="col-12 col-md-6" v-if="coupons.length > 0" v-for="coupon in coupons" :key="coupon.id">
                <div class="card shadow-lg mb-4">
                    <div class="card-body">
                        <!-- <div class="row row-cols-1 row-cols-md-3 g-4">
                            <div v-for="menuItem in rating.menuItems" :key="menuItem.id" class="col">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <img :src="menuItem.image" class="img-thumbnail" alt="..."
                                            style="max-width: 100px; max-height: 100px; object-fit: cover;">
                                        <h5 class="card-title">{{ menuItem.name }}</h5>
                                        <p class="card-text">{{ menuItem.description }}</p>
                                    </div>
                                </div>
                            </div>
                        </div> -->
                        <!-- <div>
                            <span><b>Comentarios:</b> {{ rating.comment }}</span>
                        </div>
                        <div style="margin-top: 15px;"><b>Puntuacion: </b>
                            <i class="fa fa-star" v-for="n in parseInt(rating.ratingValue)" :key="n"
                                aria-hidden="true"></i>
                        </div> -->
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6" v-else>
                <div class="card shadow-lg mb-4">No hay cupones hasta ahora.</div>
            </div>
        </div>
    </div>
</template>