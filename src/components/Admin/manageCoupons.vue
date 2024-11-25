<template>
    <div class="mt-3">
        <hr />

        <!-- Filters Section -->
        <div class="row text-center">
            <label class="mb-2" for="filters"><strong>Filtros</strong></label>
        </div>

        <div class="justify-content-center mb-3">
            <div class="row g-3 justify-content-center">
                <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                    <div class="mb-3 form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="filterByDate" v-model="filterByDate" />
                        <label class="form-check-label" for="filterByDate">Filtrar por fecha</label>
                    </div>
                </div>
                <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                    <div class="mb-3 form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="filterByAffiliate"
                            v-model="filterByAffiliate" />
                        <label class="form-check-label" for="filterByAffiliate">Filtrar por Afiliado</label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filter by Affiliates -->
        <div v-if="filterByAffiliate" class="mt-3 row g-3">
            <div class="col-12">
                <h6 class="text-uppercase text-center">Comercios</h6>
            </div>
            <div class="col-12">
                <div class="nav-container">
                    <div class="overflow-auto px-3 py-2" style="max-height: 200px; overflow-x: auto;">
                        <div v-if="affiliates.length === 0" class="d-flex justify-content-center m-3">
                            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        </div>

                        <ul v-else class="nav nav-pills custom-nav-pills d-flex flex-nowrap">
                            <li class="nav-item" v-for="(affiliate, index) in affiliates" :key="affiliate.id">
                                <a class="nav-link px-3 py-2 mx-1"
                                    :class="{ 'active': affiliate.active, 'custom-active': affiliate.active }" href="#"
                                    @click.prevent="setActiveAffiliate(index)">
                                    {{ affiliate.companyName }}
                                </a>
                            </li>

                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filter by Date -->
        <div v-if="filterByDate" class="row g-3">
            <h6 class="text-uppercase text-center">Rango de fechas</h6>
            <div>
                <div class="row g-3">
                    <div class="col-12 col-sm-6 d-flex justify-content-center">
                        <input type="date" v-model="startDate" class="form-control" style="width: auto;" />
                    </div>
                    <div class="col-12 col-sm-6 d-flex justify-content-center">
                        <input type="date" v-model="endDate" class="form-control" style="width: auto;" />
                    </div>
                </div>
                <div class="d-flex justify-content-center mt-3">
                    <button type="button" class="btn btn-theme me-2" style="width: 150px;" @click="filterCouponsByDate">
                        Filtrar
                    </button>
                    <button type="button" class="btn btn-theme" style="width: 150px;" @click="clearDateFilter">
                        Limpiar filtro
                    </button>
                </div>
            </div>
        </div>

        <hr />

        <!-- Coupon Cards -->
        <div v-if="filteredAppliedCoupons.length > 0" class="mt-3 mb-3">Mostrando {{ filteredAppliedCoupons.length }} {{
            filteredAppliedCoupons.length === 1 ? 'resultado' : 'resultados' }}</div>

        <div class="text-center" v-if="loading">
            <p>Cargando cupones, espere...</p>
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        </div>

        <div v-if="filteredAppliedCoupons.length === 0 && !loading" class="d-flex justify-content-center">
            <button class="btn btn-theme" @click="fetchAllAppliedCoupons()">
                Mostrar todos
            </button>
        </div>
        <div v-else class="row">
            <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="coupon in filteredAppliedCoupons" :key="coupon.id">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <div class="img-container mb-3">
                                    <div class="img"
                                        :style="{ backgroundImage: 'url(' + coupon.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
                                    </div>
                                </div>
                                <p class="card-text"><strong>Nombre:</strong> {{ coupon.name ? coupon.name : `Cupon
                                    borrado` }}</p>
                                <p class="card-text"><strong>Código:</strong> {{ coupon.couponCode ? coupon.couponCode
                                    : `Cupon borrado`
                                    }}</p>
                                <p class="card-text"><strong>{{ coupon.type ? coupon.type.charAt(0).toUpperCase() + coupon.type.slice(1) : `Balance` }}:</strong> {{ coupon.balance ? `$${coupon.balance}` : `$0` }}

                                </p>
                                <p class="card-text"><strong>Aplicado el dia:</strong> {{ formatDate(coupon.appliedDate)
                                    }}</p>
                                <p class="card-text"><strong>Para el cliente:</strong> {{ coupon.clientName || `Aplicado
                                    sin
                                    cliente` }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { db } from '@/firebase/init';
import { ref as dbRef, get } from 'firebase/database';
import { isWithinInterval, parseISO, isSameDay } from 'date-fns';

export default {
    props: {
        affiliates: Array,
    },
    data() {
        return {
            filterByDate: false,
            filterByAffiliate: false,
            startDate: null,
            endDate: null,
            loading: false,
            displayedCoupons: [],
            allAppliedCoupons: [],
        };
    },
    watch: {
        filterByDate(newValue) {
            if (!newValue) {
                this.clearDateFilter();
            }
        },
        filterByAffiliate(newValue) {
            if (!newValue) {
                this.clearAffiliateFilter();
            }
        },
    },
    computed: {
        filteredAppliedCoupons() {
            return this.displayedCoupons;
        }
    },
    methods: {
        async fetchAllAppliedCoupons() {
            const affiliates = this.affiliates;

            try {
                this.loading = true;
                let allAppliedCoupons = [];

                // Loop through each affiliate and collect their applied coupons
                for (const affiliate of affiliates) {

                    if (affiliate.appliedCoupons && typeof affiliate.appliedCoupons === 'object') {

                        // Process each couponId in appliedCoupons
                        const couponPromises = Object.keys(affiliate.appliedCoupons).map(async (couponId) => {
                            const redemptions = affiliate.appliedCoupons[couponId];

                            // Process each redemption (that is a client id) under the couponId
                            const redemptionPromises = Object.keys(redemptions).map(async (clientId) => {
                                const couponDetails = redemptions[clientId];
                                const clientName = await this.fetchClientName(clientId); // Fetch client's name

                                // Fetch additional coupon details from the Coupons table
                                const couponRef = dbRef(db, `Coupons/${couponId}`);
                                const couponSnapshot = await get(couponRef);

                                let fullCouponData = {};
                                if (couponSnapshot.exists()) {
                                    fullCouponData = couponSnapshot.val();
                                }

                                // Return the coupon data for this redemption
                                return {
                                    couponId,
                                    clientId: clientId,
                                    clientName,
                                    appliedDate: couponDetails.appliedDate,
                                    ...fullCouponData, // Merge full coupon data from Coupons table
                                    name: fullCouponData.name || couponDetails.name,
                                    couponCode: fullCouponData.couponCode || couponDetails.couponCode,
                                    balance: fullCouponData.balance || couponDetails.balance,
                                    type: fullCouponData.type || couponDetails.type,
                                    image: fullCouponData.qrFileUrl || couponDetails.image,
                                };
                            });

                            // Wait for all redemptions for the current coupon to complete
                            const couponRedemptions = await Promise.all(redemptionPromises);
                            allAppliedCoupons.push(...couponRedemptions);
                        });

                        // Wait for all coupons for the current affiliate to complete
                        await Promise.all(couponPromises);
                    }
                }

                // Set the applied coupons to the result
                this.allAppliedCoupons = allAppliedCoupons || [];
                this.displayedCoupons = allAppliedCoupons; // Store all coupons first
                // console.log(allAppliedCoupons);
            } catch (error) {
                console.error("Error fetching applied coupons:", error);
            } finally {
                this.loading = false;
            }
        },
        async fetchClientName(clientId) {
            try {
                const clientRef = dbRef(db, `Users/${clientId}`);
                const clientSnapshot = await get(clientRef);

                if (clientSnapshot.exists()) {
                    const clientData = clientSnapshot.val();
                    return `${clientData.firstName} ${clientData.lastName}`;
                } else {
                    return 'Unknown Client';
                }
            } catch (error) {
                console.error('Error fetching client name:', error);
                return 'Unknown Client';
            }
        },

        // Applied Coupons
        setActiveAffiliate(index) {
            // Set all affiliates to inactive
            this.affiliates.forEach(affiliate => {
                affiliate.active = false;
            });
            // Set the clicked category to active
            this.affiliates[index].active = true;

            // Filter the items based on the active category
            this.filterCouponsByAffiliates(this.affiliates[index].id);
        },
        async filterCouponsByAffiliates(affiliateId) {
            try {
                this.loading = true;
                const affiliates = this.affiliates;

                // Reference to the applied coupons for the specific affiliate
                const affiliate = affiliates.find(a => a.id === affiliateId);

                if (affiliate && affiliate.appliedCoupons && typeof affiliate.appliedCoupons === 'object') {
                    let appliedCoupons = [];

                    // Process each couponId in appliedCoupons
                    const couponPromises = Object.keys(affiliate.appliedCoupons).map(async (couponId) => {
                        const redemptions = affiliate.appliedCoupons[couponId];

                        // Process each redemption (that is a client id) under the couponId
                        const redemptionPromises = Object.keys(redemptions).map(async (clientId) => {
                            const couponDetails = redemptions[clientId];
                            const clientName = await this.fetchClientName(clientId); // Fetch client's name

                            // Fetch additional coupon details from the Coupons table
                            const couponRef = dbRef(db, `Coupons/${couponId}`);
                            const couponSnapshot = await get(couponRef);

                            let fullCouponData = {};
                            if (couponSnapshot.exists()) {
                                fullCouponData = couponSnapshot.val();
                            }

                            // Return the coupon data for this redemption
                            return {
                                couponId,
                                clientId,
                                clientName,
                                appliedDate: couponDetails.appliedDate,
                                ...fullCouponData // Merge full coupon data from Coupons table
                            };
                        });

                        // Wait for all redemptions for the current coupon to complete
                        const couponRedemptions = await Promise.all(redemptionPromises);
                        appliedCoupons.push(...couponRedemptions);
                    });

                    // Wait for all coupons for the affiliate to complete
                    await Promise.all(couponPromises);

                    // Update data properties
                    this.displayedCoupons = appliedCoupons;
                } else {
                    console.log('No applied coupons found for the affiliate');
                    this.displayedCoupons = [];
                }
            } catch (error) {
                console.error('Error fetching applied coupons:', error);
                this.displayedCoupons = [];
            } finally {
                this.loading = false;
            }
        },
        filterCouponsByDate() {
            try {
                this.loading = true;

                // If either date is missing, return all coupons
                if (!this.startDate || !this.endDate) {
                    this.displayedCoupons = this.allAppliedCoupons;
                    return;
                }

                const start = parseISO(this.startDate);
                const end = parseISO(this.endDate);

                this.displayedCoupons = this.allAppliedCoupons.filter((coupon) => {
                    const appliedDate = parseISO(coupon.appliedDate);

                    // Check if the appliedDate falls on or between the selected days
                    return (
                        isSameDay(appliedDate, start) ||
                        isSameDay(appliedDate, end) ||
                        isWithinInterval(appliedDate, { start, end })
                    );
                });
            } catch (error) {
                console.error('Error filtering coupons', error);
            } finally {
                this.loading = false;
            }
        },
        clearDateFilter() {
            this.startDate = null;
            this.endDate = null;
            this.displayedCoupons = [...this.allAppliedCoupons];
        },
        clearAffiliateFilter() {
            this.affiliates.forEach((affiliate) => {
                affiliate.active = false;
            });
            this.displayedCoupons = [...this.allAppliedCoupons];
        },
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },
    },
};
</script>