<script>
import { ref as dbRef, query, orderByChild, equalTo, set, get, push, update, remove } from 'firebase/database';
import { db } from '@/firebase/init';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import { useUserStore } from "@/stores/user-role";

export default {
    data() {
        return {
            // Logged User data
            userId: '',
            role: '',

            affiliates: [],
            categories: [],
            selectedAffiliatesIds: [],
            selectedCategoriesIds: [],

            currentPage: 1,
            itemsPerPage: 4,
            loading: false,

            userSubscriptionId: null,
            userSubscriptionName: null,
            availableRequests: null,
        }
    },
    computed: {
        paginatedAffiliates() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.affiliates.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.affiliates.length / this.itemsPerPage);
        },
    },
    methods: {
        showToast(message, type) {
            let backgroundColor;

            // Set background color based on the toast type (success or error)
            if (type === 'success') {
                backgroundColor = 'linear-gradient(to right, #00b09b, #96c93d)'; // Greenish for success
            } else if (type === 'error') {
                backgroundColor = 'linear-gradient(to right, #e74c3c, #e74c3c)'; // Red for error
            } else {
                backgroundColor = 'linear-gradient(to right, #00b09b, #96c93d)'; // Default to success if no type is provided
            }

            Toastify({
                text: message,
                duration: 3000,
                close: true,
                gravity: 'top',
                position: 'right',
                stopOnFocus: true,
                style: {
                    background: backgroundColor,
                },
            }).showToast();
        },
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },

        async fetchUserSubscription() {
            try {
                const userSubscriptionRef = dbRef(db, `Users/${this.userId}/subscription/subscription_id`);
                const subscriptionSnapshot = await get(userSubscriptionRef);

                if (subscriptionSnapshot.exists()) {
                    this.userSubscriptionId = subscriptionSnapshot.val();

                    // Now, fetch the requestLimit from the user's subscription data
                    const requestLimitRef = dbRef(db, `Suscriptions/${this.userSubscriptionId}`);
                    const requestLimitSnapshot = await get(requestLimitRef);

                    if (requestLimitSnapshot.exists()) {
                        // Subscription's RequestLimit
                        const subscriptionData = requestLimitSnapshot.val();
                        const requestLimit = subscriptionData.requestLimit;
                        this.userSubscriptionName = subscriptionData.name;

                        // Reference to the user's coupon requests
                        const userRequestsRef = dbRef(db, `Users/${this.userId}/coupon_requests`);
                        const requestsSnapshot = await get(userRequestsRef);

                        if (requestsSnapshot.exists()) {
                            const requestsData = requestsSnapshot.val();
                            const currentMonth = new Date().getMonth();
                            const lastRequestDate = requestsData.lastRequestDate ? new Date(requestsData.lastRequestDate) : null;

                            if (!lastRequestDate || lastRequestDate.getMonth() !== currentMonth) {
                                this.availableRequests = requestLimit; // Reset if new month
                            } else {
                                this.availableRequests = requestLimit - (requestsData.requestCount || 0);
                            }
                        } else {
                            // No requests yet, full limit available
                            this.availableRequests = requestLimit;
                        }
                    } else {
                        console.error('No request limit found for the subscription');
                    }
                } else {
                    console.error('No subscription found for the user');
                }
            } catch (error) {
                console.error('Error fetching user subscription:', error);
            }
        },

        async fetchAffiliates() {
            const role = 'afiliado';
            const affiliateRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));
            try {
                const affiliateSnapshot = await get(affiliateRef);

                if (affiliateSnapshot.exists()) {
                    const affiliates = affiliateSnapshot.val();

                    this.affiliates = Object.keys(affiliates).map(key => ({
                        id: key,
                        ...affiliates[key]
                    }));
                } else {
                    this.affiliates = [];
                }
            } catch (error) {
                console.error("Error fetching affiliates:", error);
            }
        },
        async fetchCategories() {
            const categoryRef = dbRef(db, 'Affiliate_categories');
            try {
                const categorySnapshot = await get(categoryRef);

                if (categorySnapshot.exists()) {
                    const categories = categorySnapshot.val();

                    this.categories = Object.keys(categories).map(key => ({
                        id: key,
                        ...categories[key]
                    }));
                } else {
                    this.categories = [];
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        },

        async sendRequest() {
            // Ensure the user is logged in (has userId)
            if (!this.userId) {
                console.error('User is not logged in');
                alert('Usuario no identificado');
                return;
            }
            // Validate selected categories and affiliates
            if (this.selectedCategoriesIds.length === 0 && this.selectedAffiliatesIds.length === 0) {
                this.showToast('Error: Debe seleccionar al menos una categoría o un comercio afiliado', 'error');
                return;
            }
            const selectedAffiliates = {};
            const selectedCategories = {};

            try {
                this.loading = true;
                let subscription = null;

                // Reference to the user's subscription and coupon requests in Firebase
                const [subscriptionSnapshot, requestsSnapshot, subscriptionsSnapshot] = await Promise.all([
                    get(dbRef(db, `Users/${this.userId}/subscription`)),
                    get(dbRef(db, `Users/${this.userId}/coupon_requests`)),
                    get(dbRef(db, 'Suscriptions')) // Fetch all subscription plans
                ]);

                // Validate user subscription
                if (!subscriptionSnapshot.exists()) {
                    alert('Error: No se encontró ninguna suscripción.');
                    return;
                }

                subscription = subscriptionSnapshot.val();
                const subscriptionId = subscription.subscription_id;

                // Query the Suscriptions table to fetch the details
                const subscriptionDataRef = dbRef(db, `Suscriptions/${subscriptionId}`);
                const userSuscriptionSnapshot = await get(subscriptionDataRef);

                if (userSuscriptionSnapshot.exists()) {
                    const userSubscription = userSuscriptionSnapshot.val();
                    subscription = {
                        ...subscription,
                        ...userSubscription
                    }
                }

                if (!subscription.isPaid) {
                    alert('Error: Debe tener una suscripción activa y pagada para solicitar cupones. Recuerde pagar su suscripción.');
                    return;
                }

                // Fetch the subscription details from the database to get the request limit
                if (!subscriptionsSnapshot.exists()) {
                    alert('Error: No se encontraron planes de suscripción.');
                    return;
                }

                const subscriptionsData = subscriptionsSnapshot.val();
                const userPlan = Object.values(subscriptionsData).find(plan => plan.name.toLowerCase() === subscription.name.toLowerCase());

                if (!userPlan || !userPlan.requestLimit) {
                    alert('Error: Su plan de suscripción no tiene un límite de solicitudes definido.');
                    return;
                }

                const requestLimit = userPlan.requestLimit;

                // Process existing requests (if any)
                let existingRequests = requestsSnapshot.exists() ? Object.values(requestsSnapshot.val()) : [];
                const currentMonth = new Date().getMonth();

                const requestsThisMonth = existingRequests.filter(req => new Date(req.date).getMonth() === currentMonth);

                // Check if the user has exceeded their monthly limit
                if (requestsThisMonth.length >= requestLimit) {
                    alert(`Error: Ha alcanzado su límite de solicitudes (${requestLimit}) para este mes`);
                    return;
                }

                // Iterate over selected affiliates and categories to store them as properties
                this.selectedAffiliatesIds.forEach(affiliateId => {
                    selectedAffiliates[affiliateId] = affiliateId;
                });

                this.selectedCategoriesIds.forEach(categoryId => {
                    selectedCategories[categoryId] = categoryId;
                });

                const newRequest = {
                    selectedAffiliates,
                    selectedCategories,
                    date: new Date().toISOString()
                };

                // Push the new request to Firebase under the user's coupon requests
                await push(dbRef(db, `Users/${this.userId}/coupon_requests`), newRequest);

                // Success toast
                this.showToast('¡Solicitud enviada con éxito!', 'success');
                console.log('Request submitted successfully!');
            } catch (error) {
                console.error('Error submitting request.');
                console.error(error);
            } finally {
                this.loading = false;
            }
        },
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;

        await this.fetchAffiliates();
        await this.fetchCategories();
        await this.fetchUserSubscription();
    }
}
</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Solicitar cupones
    </h2>

    <div class="container">
        <div class="container-fluid">

            <div class="row">
                <div class="col-12 justify-content-center text-center">
                    <div class="alert alert-info d-inline-flex align-items-center mt-2" role="alert"
                        style="width: 50%;">
                        <i class="fa-solid fa-info-circle me-2"></i>
                        <div>
                            Recuerda que debes contar con una suscripción activa para solicitar cupones.
                        </div>
                    </div>
                    <div v-if="userSubscriptionId && availableRequests !== null"
                        class="alert alert-info d-inline-flex text-center align-items-center top-0 end-0 m-3"
                        role="alert" style="width: auto;">
                        <div class="me-2">
                            <strong>Suscripción:</strong> {{ userSubscriptionName.charAt(0).toUpperCase() +
                                userSubscriptionName.slice(1) }}
                        </div>
                        <div>
                            <strong>Solicitudes disponibles:</strong> {{ availableRequests }}
                        </div>
                    </div>
                </div>
            </div>

            <h3 class="mt-3">Selecciona el comercio y categoria para tu cupon</h3>

            <div class="row justify-content-center">
                <div class="col-lg-6">
                    <div class="card mt-5">
                        <div class="card-header text-center text-black">
                            <strong>Comercios Afiliados</strong>
                        </div>
                        <div class="card-body">
                            <div class="row g-4">
                                <div v-for="affiliate in paginatedAffiliates" :key="affiliate.id"
                                    class="col-12 col-md-6">
                                    <div class="card mt-3 mb-3 h-100">
                                        <div class="card-header text-center d-flex justify-content-center align-items-center"
                                            style="height: 150px; background-color: #f8f9fa;">
                                            <img class="img-fluid" :src="affiliate.image" alt="Afiliado Logo"
                                                style="max-height: 100%; max-width: 100%;">
                                        </div>
                                        <div class="card-body">
                                            <div class="form-check" style="margin: 10px;">
                                                <input type="checkbox" class="form-check-input"
                                                    :id="'check_' + affiliate.id" :value="affiliate.id"
                                                    v-model="selectedAffiliatesIds">
                                                <label class="form-check-label" :for="'check_' + affiliate.id">
                                                    {{ affiliate.companyName }}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Pagination Controls -->
                        <nav class="mt-4" v-if="totalPages > 1" aria-label="Page navigation">
                            <ul class="pagination justify-content-center">
                                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                    <button class="page-link" @click="goToPage(currentPage - 1)"
                                        :disabled="currentPage === 1">Anterior</button>
                                </li>
                                <li class="page-item" v-for="page in totalPages" :key="page"
                                    :class="{ active: page === currentPage }">
                                    <button class="page-link" @click="goToPage(page)">{{ page }}</button>
                                </li>
                                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                                    <button class="page-link" @click="goToPage(currentPage + 1)"
                                        :disabled="currentPage === totalPages">Siguiente</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="card mt-5">
                        <div class="card-header text-center text-black">
                            <strong>Categorías</strong>
                        </div>
                        <div class="card-body" style="overflow-x: auto;">
                            <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3">
                                <div class="col" v-for="(category, index) in categories" :key="category.id">
                                    <div class="form-check" style="margin: 10px;">
                                        <input type="checkbox" class="form-check-input" :id="'check_' + category.id"
                                            :value="category.id" v-model="selectedCategoriesIds">
                                        <label class="form-check-label" :for="'check_' + category.id">
                                            {{ category.name }}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button class="btn btn-outline-success mt-4 w-50" :disabled="loading" @click="sendRequest()">
                    <span v-if="loading" class="spinner-border spinner-border-sm" role="status"
                        aria-hidden="true"></span>
                    <span v-else>
                        <i class="fa fa-check"></i> Solicitar
                    </span>
                </button>
            </div>

        </div>
    </div>
</template>
<style scoped>
.img {
    position: relative;
    background-size: cover;
    background-position: center;
    width: 100%;
    height: 200px;
    border-radius: 5px;
}
</style>