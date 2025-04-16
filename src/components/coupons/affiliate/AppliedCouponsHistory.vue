<template>
    <div class="row g-4">
        <div class="col-12 col-md-6 col-lg-4" v-if="appliedCoupons.length > 0" v-for="coupon in appliedCoupons"
            :key="coupon.id">
            <div class="coupon-card h-100">
                <div class="coupon-header">
                    <h5 class="coupon-title">{{ coupon.name.toUpperCase() }}</h5>
                </div>
                <div class="coupon-body">
                    <div class="coupon-client mb-3">
                        <span class="badge bg-info text-white mb-2">
                            <i class="fa fa-user me-1"></i> Cliente
                        </span>
                        <div class="fw-bold">{{ coupon.clientName }}</div>
                    </div>
                    <div class="coupon-qr text-center mb-3">
                        <img :src="coupon.image" alt="logo" class="img-fluid">
                    </div>
                    <div class="coupon-details">
                        <div class="coupon-info">
                            <span class="coupon-label">Código:</span>
                            <span class="coupon-value">{{ coupon.couponCode }}</span>
                        </div>
                        <div class="coupon-info">
                            <span v-if="coupon.type === 'porcentaje'" class="coupon-label">
                                Porcentaje:
                            </span>
                            <span v-else class="coupon-label">
                                Saldo:
                            </span>
                            <span v-if="coupon.type === 'porcentaje'" class="coupon-value fw-bold text-success">
                                %{{ coupon.balance }}
                            </span>
                            <span v-else class="coupon-value fw-bold text-success">
                                ${{ coupon.balance }}
                            </span>
                        </div>
                        <div class="coupon-info">
                            <span class="coupon-label">Aplicado:</span>
                            <span class="coupon-value">{{ formatDate(coupon.appliedDate) }}</span>
                        </div>
                        <div class="coupon-info">
                            <span class="coupon-label">Precio de Compra:</span>
                            <span class="coupon-value">{{ coupon.itemPrice ? `$${coupon.itemPrice}` : `$0` }}</span>
                        </div>
                        <div class="coupon-info">
                            <span class="coupon-label">Pagado:</span>
                            <span class="coupon-value">{{ coupon.discountedPrice ? `$${coupon.discountedPrice}` : `$0`
                                }}</span>
                        </div>
                        <!-- <div class="coupon-info">
                                                <span class="coupon-label">Usos actuales:</span>
                                                <span class="coupon-value">{{ coupon.timesUsed }}</span>
                                            </div> -->
                    </div>
                </div>
                <div class="coupon-footer">
                    <div class="coupon-scissors">
                        <i class="fas fa-cut"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-12" v-else>
            <div class="empty-state-container text-center py-5">
                <div class="empty-state-icon mb-4">
                    <i class="fa fa-ticket-alt fa-4x text-muted"></i>
                </div>
                <h4 class="text-muted mb-3">No hay cupones aplicados</h4>
                <p class="text-muted mb-4">Los cupones aplicados aparecerán aquí cuando estén
                    disponibles.
                </p>
                <div class="empty-state-action">
                    <button class="btn btn-outline-primary" @click="reload">
                        <i class="fa fa-sync-alt me-2"></i>Actualizar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    props: {
        appliedCoupons: {
            type: Array,
            required: true
        }
    },
    methods: {
        reload(){
            this.$emit('reload');
        },
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },
    }
}
</script>