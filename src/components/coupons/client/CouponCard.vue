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
<style scoped>
/* Responsive Grid Styles */
@media (max-width: 576px) {
    /* 1 column on small screens (phones) */
    .coupon-card {
        width: 100%;
        margin-bottom: 1rem;
    }
}

@media (min-width: 577px) and (max-width: 992px) {
    /* 2 columns on medium screens (tablets) */
    .coupon-card {
        width: calc(50% - 1rem);
        margin: 0.5rem;
    }
}

@media (min-width: 993px) {
    /* 3 columns on large screens */
    .coupon-card {
        width: calc(33.333% - 1.5rem);
        margin: 0.75rem;
    }
}

/* Existing styles */
.coupon-card {
    background-color: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    position: relative;
}

.coupon-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 15px rgba(0,0,0,0.15);
}

.coupon-header {
    background-color: #f8f9fa;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e9ecef;
}

.coupon-body {
    padding: 1rem;
}

.coupon-footer {
    position: relative;
    border-top: 2px dashed #dee2e6;
    padding: 0.5rem;
    text-align: center;
}

.coupon-scissors {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background-color: white;
    padding: 0 0.5rem;
    color: #6c757d;
}

.coupon-qr img {
    max-width: 200px;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.coupon-qr img:hover {
    transform: scale(1.05);
}

.coupon-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.coupon-info {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #e9ecef;
    padding-bottom: 0.25rem;
}

.coupon-label {
    color: #6c757d;
    font-weight: 500;
}

.coupon-value {
    color: #212529;
    font-weight: 600;
}
</style>