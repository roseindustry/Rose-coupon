<script>
import { useUserStore } from '@/stores/user-role';
import { ref as dbRef, child, get } from 'firebase/database';
import { db } from '@/firebase/init';
import { Modal } from 'bootstrap';
import moment from 'moment';

export default {
    data() {
        return {
            coupons: [],
            modalImageUrl: '',
        };
    },
    computed: {
        currentPageName() {
            return this.$route.name;
        }
    },
    created() {
        this.fetchCoupons();
    },
    methods: {
        async fetchCoupons() {
            try {
                const userStore = useUserStore();
                const userId = userStore.userId;

                if (!userId) {
                    console.error('User ID not found');
                    return;
                }

                const couponsRef = dbRef(db, `Users/${userId}/coupons`);
                const couponsSnapshot = await get(couponsRef);

                if (couponsSnapshot.exists()) {
                    const couponsData = couponsSnapshot.val();
                    const couponsList = [];

                    for (const couponId in couponsData) {
                        const couponRef = await get(child(dbRef(db), `Coupons/${couponId}`));
                        if (couponRef.exists()) {
                            const coupon = couponRef.val();
                            let couponExp;
                            // Format the expiration date to 'DD/MM/YYYY'
                            if (moment(coupon.expiration, moment.ISO_8601, true).isValid()) {
                                couponExp = coupon.expiration = moment(coupon.expiration).format('DD/MM/YYYY');
                            } else {
                                couponExp = coupon.expiration = moment(coupon.expiration, 'DD/MM/YYYY').format('DD/MM/YYYY');
                            }
                            couponsList.push({
                                id: couponId,
                                name: coupon.name,
                                couponCode: coupon.couponCode,
                                balance: coupon.balance,
                                expiration: couponExp,
                                status: coupon.status,
                                qrFileUrl: coupon.qrFileUrl
                            });
                        }
                    }

                    this.coupons = couponsList;
                } else {
                    console.log('No coupons found for the user');
                }
            } catch (error) {
                console.error('Error fetching coupons:', error);
            }
        },
        openModal(imageUrl) {
            this.modalImageUrl = imageUrl;
            new Modal(document.getElementById('qrModal')).show();
        },
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
            <div class="col-12 col-md-3" v-if="coupons.length > 0" v-for="coupon in coupons" :key="coupon.id">
                <div class="card mb-3 position-relative">
                    <div class="card-body">
                        <!-- Badge for status -->
                        <span class="badge position-absolute top-0 start-100 translate-middle"
                            :class="coupon.status ? 'bg-success' : 'bg-danger'">
                            {{ coupon.status ? 'Activo' : 'Inactivo' }}
                        </span>
                        <div class="d-flex justify-content-between mb-3">
                            <h6 class="card-title mb-0">{{ coupon.name }}</h6>
                        </div>
                        <div class="img-container text-center mb-3">
                            <!-- Image Display -->
                            <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid img-thumbnail"
                                style="max-height: 150px;" @click="openModal(coupon.qrFileUrl)">
                        </div>
                        <p class="card-text"><strong>Código:</strong> {{ coupon.couponCode }}</p>
                        <p class="card-text"><strong>Saldo:</strong> ${{ coupon.balance }}</p>
                        <p class="card-text"><strong>Expiración:</strong> {{ coupon.expiration }}</p>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6" v-else>
                <div class="card shadow-lg mb-4">No hay cupones.</div>
            </div>
        </div>
    </div>
    <!-- Modal -->
    <div class="modal fade" id="qrModal" tabindex="-1" aria-labelledby="qrModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="qrModalLabel">QR Code</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                    <img :src="modalImageUrl" alt="QR Code" class="img-fluid">
                </div>
            </div>
        </div>
    </div>
</template>