<template>
    <div class="coupon-card mb-4 position-relative">
        <!-- Status badge -->
        <span class="badge position-absolute top-0 end-0 mt-2 me-2" :class="coupon.status ? 'bg-success' : 'bg-danger'">
            {{ coupon.status ? 'Activo' : 'Expirado' }}
        </span>

        <!-- Coupon header -->
        <div class="coupon-header">
            <h5 class="coupon-title">{{ coupon.name.toUpperCase() }}</h5>
        </div>

        <!-- Coupon body -->
        <div class="coupon-body">
            <!-- QR Code -->
            <div class="coupon-qr text-center mb-3">
                <img :src="coupon.qrFileUrl" alt="QR Code" class="img-fluid" @click="openImageModal(coupon.qrFileUrl)">
            </div>

            <!-- Coupon details -->
            <div class="coupon-details">
                <div class="coupon-info">
                    <span class="coupon-label">Código:</span>
                    <span class="coupon-value">{{ coupon.couponCode }}</span>
                </div>

                <div class="coupon-info">
                    <span class="coupon-label">{{ coupon.type === 'saldo' ? 'Saldo:' : 'Porcentaje:'
                        }}</span>
                    <span class="coupon-value">{{ coupon.type === 'saldo' ? '$' : '%' }}{{
                        coupon.balance
                        }}</span>
                </div>

                <div class="coupon-info">
                    <span class="coupon-label">Expiración:</span>
                    <span class="coupon-value">{{ coupon.expiration }}</span>
                </div>
            </div>
        </div>

        <!-- Coupon footer with dashed border -->
        <div class="coupon-footer">
            <div class="coupon-scissors">
                <i class="fas fa-cut"></i>
            </div>
        </div>
    </div>

    <!-- Modal for expanding coupon image -->
     <CouponImageModal :modalImageUrl="modalImageUrl" />
</template>
<script>
import CouponImageModal from './modals/CouponImageModal.vue';
import { Modal } from 'bootstrap';

export default {
    name: 'CouponCard',
    components: {
        CouponImageModal
    },
    props: {
        coupon: {
            type: Object,
            required: true,
            default: () => ({})
        },
    },
    data() {
        return {
            modalImageUrl: ''
        };
    },
    methods: {
        openImageModal(imageUrl) {
            this.modalImageUrl = imageUrl;
            new Modal(document.getElementById('qrModal')).show();
        },
    }
}
</script>
<style></style>