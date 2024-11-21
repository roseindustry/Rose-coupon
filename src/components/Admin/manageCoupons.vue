<template>
  <div class="mt-3">
    <hr />
    <h5 class="text-center text-uppercase mb-4">Administrar Cupones</h5>
    <hr />

    <!-- Tabs -->
    <div class="mb-4">
      <ul class="nav nav-tabs nav-fill">
        <li class="nav-item">
          <a class="nav-link active" href="#" data-bs-toggle="tab" data-bs-target="#assigned-coupons">
            Cupones Asignados
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" data-bs-toggle="tab" data-bs-target="#applied-coupons">
            Cupones Aplicados
          </a>
        </li>
      </ul>
    </div>

    <div class="tab-content">
      <div class="tab-pane fade show active" id="assigned-coupons">

      </div>
      <div class="tab-pane fade" id="applied-coupons">
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
                <input class="form-check-input" type="checkbox" id="filterByAffiliate" v-model="filterByAffiliate" />
                <label class="form-check-label" for="filterByAffiliate">Filtrar por Afiliado</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter by Affiliates -->
        <div v-if="filterByAffiliate" class="mt-3 row g-3" style="background-color: darkblue; border-radius: 15px">
          <div class="col-12">
            <h6 class="text-uppercase text-center mb-3">Comercios</h6>
          </div>
          <div class="col-12">
            <div class="nav-container">
              <div class="overflow-auto px-3 py-2" style="max-height: 200px; overflow-x: auto;">
                <ul class="nav nav-pills custom-nav-pills d-flex flex-nowrap">
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
        <div v-if="filterByDate" class="mt-3 p-3 row g-3" style="background-color: darkblue; border-radius: 15px">
          <div class="col-12">
            <h6 class="text-uppercase text-center mb-3">Rango de fechas</h6>
          </div>
          <div class="col-12">
            <div class="row g-3 justify-content-center">
              <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                <input type="date" v-model="startDate" class="form-control" style="width: auto;" />
              </div>
              <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
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

        <!-- Coupon Cards -->
        <div class="mt-3 mb-3">Mostrando {{ filteredAppliedCoupons.length }} {{
          filteredAppliedCoupons.length === 1 ? 'resultado' : 'resultados' }}</div>

        <div class="text-center" v-if="loading">
          <p>Cargando cupones, espere...</p>
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        </div>

        <div class="row">
          <div class="col-12 col-md-6 col-lg-4 mb-3" v-for="coupon in filteredAppliedCoupons" :key="coupon.id">
            <div class="card h-100">
              <div class="card-body">
                <div class="row">
                  <div class="col">
                    <div class="img-container mb-3">
                      <div class="img"
                        :style="{ backgroundImage: 'url(' + coupon.qrFileUrl + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
                      </div>
                    </div>
                    <p class="card-text"><strong>Nombre:</strong> {{ coupon.name ? coupon.name : 'Cupon borrado' }}</p>
                    <p class="card-text"><strong>Código:</strong> {{ coupon.couponCode ? coupon.couponCode : `Cupon
                      borrado`
                      }}</p>
                    <p class="card-text"><strong>Aplicado el dia:</strong> {{ formatDate(coupon.appliedDate) }}</p>
                    <p class="card-text"><strong>Para el cliente:</strong> {{ coupon.clientName || `Aplicado sin
                      cliente` }}
                    </p>
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

<script>
import { db } from '@/firebase/init';
import { ref as dbRef, get } from 'firebase/database';

export default {
  props: {
    allAppliedCoupons: Array,
    assignedCoupons: Array,
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
    },
  },
  methods: {
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

    // Assigned Coupons


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

        // Reference to the applied coupons for the affiliate
        const couponsRef = dbRef(db, `Users/${affiliateId}/appliedCoupons`);
        const couponsSnapshot = await get(couponsRef);

        if (couponsSnapshot.exists()) {
          const couponsData = couponsSnapshot.val();

          // Fetch applied coupon details and reference coupon data from the Coupons table
          const appliedCoupons = await Promise.all(Object.keys(couponsData).flatMap(couponId =>
            Object.keys(couponsData[couponId]).map(async (redemptionId) => {
              const couponDetails = couponsData[couponId][redemptionId];
              const clientName = await this.fetchClientName(couponDetails.client_id); // Fetch client's name

              // Fetch additional coupon details from the Coupons table
              const couponRef = dbRef(db, `Coupons/${couponId}`);
              const couponSnapshot = await get(couponRef);

              let fullCouponData = {};
              if (couponSnapshot.exists()) {
                fullCouponData = couponSnapshot.val();
              }

              return {
                couponId,  // Coupon reference
                clientId: couponDetails.client_id,
                appliedDate: couponDetails.appliedDate,
                clientName: clientName,
                ...fullCouponData // Merge full coupon data from Coupons table
              };
            })
          ));

          // Update data properties
          this.displayedCoupons = appliedCoupons;
          console.log(this.displayedCoupons);
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

        // Set start and end date
        const start = new Date(this.startDate);
        const localStart = new Date(start.getTime() + start.getTimezoneOffset() * 60000);
        localStart.setHours(0, 0, 0, 0);

        const end = new Date(this.endDate);
        const localEnd = new Date(end.getTime() + end.getTimezoneOffset() * 60000);
        localEnd.setHours(23, 59, 59, 999); // Include the entire end date

        const filteredCoupons = this.allAppliedCoupons.filter((coupon) => {
          const couponDate = new Date(coupon.appliedDate);
          return couponDate >= start && couponDate <= end;
        });

        this.displayedCoupons = [...filteredCoupons];
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
  mounted() {
    this.displayedCoupons = this.allAppliedCoupons;
  }
};
</script>