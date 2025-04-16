<template>
    <div class="coupon-card" @click="selectCoupon(coupon); queryCoupons(coupon.id)"
        :class="{ 'selected': selectedCoupons.some(selectedCoupon => selectedCoupon.id === coupon.id) }">

        <!-- Card Header -->
        <div class="coupon-card-header">
            <!-- Card title -->
            <div class="coupon-title-section">
                <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                    <input v-model="editingCoupon.name" class="form-control" @click.stop />
                </template>
                <template v-else>
                    <h5 class="coupon-title">{{ coupon.name.toUpperCase() }}</h5>
                </template>

                <!-- Status Badge -->
                <span class="status-badge me-3" :class="coupon.status ? 'status-active' : 'status-expired'">
                    {{ coupon.status ? 'Activo' : 'Expirado' }}
                </span>
            </div>

            <!-- Action Buttons -->
            <div class="coupon-actions" @click.stop>
                <button class="action-btn edit-btn" v-if="editingCoupon && editingCoupon.id === coupon.id"
                    @click.prevent="handleUpdate">
                    <i class="fa fa-save"></i>
                </button>
                <button class="action-btn cancel-btn" v-if="editingCoupon && editingCoupon.id === coupon.id"
                    @click.prevent="cancelEdit">
                    <i class="fa fa-times"></i>
                </button>
                <button class="action-btn edit-btn" v-else @click.prevent="enableEditMode(coupon)">
                    <i class="fa fa-pencil"></i>
                </button>
                <button class="action-btn delete-btn" @click.prevent="deleteCoupon(coupon.id, index)">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>

        <!-- Card Body -->
        <div class="coupon-card-body">
            <div class="coupon-content">
                <!-- QR Code and Basic Info -->
                <div class="coupon-main-info">
                    <div class="coupon-qr">
                        <img :src="coupon.qrFileUrl" alt="logo" class="qr-image">
                    </div>

                    <div class="coupon-basic-info">
                        <!-- Add expiration date badge -->
                        <div class="expiration-badge" :class="isExpiringSoon(coupon.expiration) ? 'expiring-soon' : ''">
                            <i class="fa fa-calendar me-1"></i>
                            {{ formatDate(coupon.expiration) }}
                        </div>

                        <!-- Coupon Code -->
                        <div class="info-item">
                            <span class="info-label">Código:</span>
                            <span class="info-value code-value">
                                <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                    <input v-model="editingCoupon.couponCode" class="form-control" @click.stop />
                                </template>
                                <template v-else>
                                    {{ coupon.couponCode }}
                                </template>
                            </span>
                        </div>

                        <!-- Value/Percentage -->
                        <div class="info-item">
                            <span class="info-label">
                                <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                    <select v-model="editingCoupon.type" class="form-select form-select-sm" @click.stop>
                                        <option value="saldo">Saldo ($)</option>
                                        <option value="porcentaje">Porcentaje (%)
                                        </option>
                                    </select>
                                </template>
                                <template v-else>
                                    {{ coupon.type === 'saldo' ? 'Saldo:' :
                                        'Porcentaje:' }}
                                </template>
                            </span>
                            <span class="info-value value-highlight">
                                <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                    <input v-model="editingCoupon.balance" class="form-control" @click.stop />
                                </template>
                                <template v-else>
                                    {{ coupon.type === 'saldo' ? '$' : '%' }}{{
                                        coupon.balance }}
                                </template>
                            </span>
                        </div>

                        <!-- Usage Stats -->
                        <div class="usage-stats">
                            <div class="info-item">
                                <span class="info-label">Asignado a:</span>
                                <span class="info-value">{{ coupon.assignedCount }}
                                    clientes</span>
                            </div>

                            <div class="info-item">
                                <span class="info-label">Canjeado:</span>
                                <span class="info-value">{{ coupon.timesUsed || 0 }}
                                    veces</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Accordion for Additional Details -->
                <div class="coupon-details-accordion">
                    <div class="accordion-header" @click.stop="toggleAccordion(coupon.id)">
                        <span>Detalles adicionales</span>
                        <i class="fa"
                            :class="accordionOpen[`coupon_${coupon.id}`] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                    </div>

                    <div class="accordion-content" :class="{ 'open': accordionOpen[`coupon_${coupon.id}`] }">
                        <div class="details-grid">
                            <!-- Redeem Count -->
                            <div class="detail-item">
                                <span class="detail-label">Número de usos:</span>
                                <span class="detail-value ms-2">
                                    <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                        <input v-model.number="editingCoupon.redeemCount" type="number"
                                            class="form-control" @click.stop />
                                    </template>
                                    <template v-else>
                                        {{ coupon.redeemCount }}
                                    </template>
                                </span>
                            </div>

                            <!-- Payable -->
                            <div class="detail-item">
                                <span class="detail-label">Cupón pagable:</span>
                                <span class="detail-value ms-2">
                                    <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                        <div class="form-check form-switch">
                                            <input type="checkbox" class="form-check-input"
                                                v-model="editingCoupon.onlyInStore" @click.stop />
                                        </div>
                                    </template>
                                    <template v-else>
                                        <span class="badge" :class="coupon.onlyInStore ? 'bg-success' : 'bg-secondary'">
                                            {{ coupon.onlyInStore ? 'Sí' : 'No' }}
                                        </span>
                                    </template>
                                </span>
                            </div>

                            <!-- Expiration -->
                            <div class="detail-item">
                                <span class="detail-label">Expiración:</span>
                                <span class="detail-value ms-2">
                                    <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                        <input type="date" v-model="editingCoupon.expiration" class="form-control"
                                            @click.stop />
                                    </template>
                                    <template v-else>
                                        {{ formatDate(coupon.expiration) }}
                                    </template>
                                </span>
                            </div>

                            <!-- Status Toggle -->
                            <div class="detail-item">
                                <span class="detail-label">Estado:</span>
                                <span class="detail-value ms-2">
                                    <template v-if="editingCoupon && editingCoupon.id === coupon.id">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox"
                                                v-bind:id="'coupon' + coupon.id" v-model="coupon.status"
                                                @change="updateCouponStatus(coupon)" @click.stop>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <span class="badge" :class="coupon.status ? 'bg-success' : 'bg-danger'">
                                            {{ coupon.status ? 'Activo' : 'Expirado' }}
                                        </span>
                                    </template>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import {db} from '@/firebase/init';
import { ref as dbRef, query, get, update, orderByChild, equalTo, remove } from 'firebase/database';
import { toast as showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'

export default {
    name: 'CouponCard',
    props: {
        coupon: {
            type: Object,
            required: true,
            default: () => ({})
        },
        selectedCoupons: {
            type: Array,
            required: true,
            default: () => []
        }
    },
    data(){
        return {
            editingCoupon: null,
            accordionOpen: false
        }
    },
    methods: {
        isExpiringSoon(expiration) {
            const today = new Date();
            const expirationDate = new Date(expiration);
            const diffTime = Math.abs(expirationDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30;
        },
        selectCoupon(coupon) {
            const index = this.selectedCoupons.findIndex(selectedCoupon => selectedCoupon.id === coupon.id);
            if (index === -1) {
                this.selectedCoupons.push(coupon); // Add coupon to selected list
            } else {
                this.selectedCoupons.splice(index, 1); // Remove coupon if already selected
            }
        },
        async queryCoupons(couponId) {
            // Query Users to find how many clients already have this coupon assigned
            const role = 'cliente';
            const usersRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));
            const usersSnapshot = await get(usersRef);

            let couponAssignedCount = 0;

            if (usersSnapshot.exists()) {
                const users = usersSnapshot.val();

                // Loop through each user and check if they have the coupon assigned
                for (const userId in users) {
                    const userCoupons = users[userId].coupons || {};

                    // Increment the count if this user has the coupon assigned
                    if (userCoupons[couponId]) {
                        couponAssignedCount++;
                    }
                }
            }

            // Return the coupon with the assigned count included
            return couponAssignedCount;
        },
        enableEditMode(coupon) {
            this.editingCoupon = { ...coupon, expiration: new Date(coupon.expiration) }; // Ensure expiration is a Date object
        },
        async updateCoupon() {
            try {
                if (!this.editingCoupon) return;

                const couponRef = dbRef(db, `Coupons/${this.editingCoupon.id}`);
                const updateData = {
                    name: this.editingCoupon.name,
                    couponCode: this.editingCoupon.couponCode,
                    balance: this.editingCoupon.balance,
                    expiration: this.editingCoupon.expiration,
                    redeemCount: this.editingCoupon.redeemCount,
                    onlyInStore: this.editingCoupon.onlyInStore,
                    type: this.editingCoupon.type
                };
                await update(couponRef, updateData);

                // Find the index of the coupon and update it in the local state
                const index = this.coupons.findIndex(c => c.id === this.editingCoupon.id);
                if (index !== -1) {
                    // Update the coupon in the local array
                    this.coupons[index] = { ...this.editingCoupon };
                }

                // Show success message
                showToast.success('Cupon actualizado con éxito!');

                // Clear the editingCoupon state after saving
                this.editingCoupon = null;
            } catch (error) {
                console.error('Error saving coupon:', error);
                showToast.error('Error al actualizar el cupon. Inténtalo de nuevo.');
            }
        },
        cancelEdit() {
            this.editingCoupon = null; // Exit edit mode without saving
        },
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },
        async deleteCoupon(couponId) {
            if (confirm("¿Desea borrar este cupon?")) {
                try {
                    const couponRef = dbRef(db, `Coupons/${couponId}`);
                    await remove(couponRef);

                    showToast.success('Cupon eliminado con éxito!');

                    this.$emit('reload-coupon-list', couponId);
                } catch (error) {
                    console.error('Error deleting coupon:', error);
                    alert('La eliminación del cupon falló.');
                }
            }
        },
        toggleAccordion(couponId) {
            // Initialize the object if it doesn't exist
            if (!this.accordionOpen) {
                this.accordionOpen = {};
            }

            // Toggle only the specific coupon's accordion
            this.accordionOpen = {
                ...this.accordionOpen,
                [`coupon_${couponId}`]: !this.accordionOpen[`coupon_${couponId}`]
            };
        },
    }
}
</script>