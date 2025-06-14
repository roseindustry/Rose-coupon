<script>
import { ref as dbRef, query, orderByChild, equalTo, set, get, push, update, remove } from 'firebase/database';
import { db } from '@/firebase/init';
import { showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css';
import { Modal } from 'bootstrap';
import { useUserStore } from "@/stores/user-role";

export default {
    data() {
        return {
            // Logged User data
            userId: null,
            role: null,

            categories: [],
            affiliates: [],
            selectedCategoriesIds: [],
            selectedAffiliatesIds: [],
            selectedCategory: null,

            currentPage: 1,
            itemsPerPage: 4,

            isSubmitting: false,
            loading: false,

            userSubscriptionId: null,
            userSubscriptionName: null,
            userSubscriptionIcon: null,
            availableRequests: null,

            // Requests History
            couponRequestsHistory: [],
            selectedHistoryMonth: null,
            availableMonths: [],
            selectedRequestDetails: null
        }
    },
    computed: {
        filteredAffiliates() {
            // If no category is selected, return an empty array
            if (!this.selectedCategory) return [];

            // Filter affiliates by the selected category
            return this.affiliates.filter(affiliate =>
                affiliate.category_id === this.selectedCategory.id
            );
        },
        paginatedAffiliates() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.filteredAffiliates.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.filteredAffiliates.length / this.itemsPerPage);
        },
        filteredCouponRequestsHistory() {
            if (!this.selectedHistoryMonth) return this.couponRequestsHistory;
            
            return this.couponRequestsHistory.filter(request => {
                const requestDate = new Date(request.date);
                return requestDate.getMonth() === this.selectedHistoryMonth;
            });
        }
    },
    methods: {
        formatDate(date) {
          const dateString = date.split("T")[0];
          const [year, month, day] = dateString.split("-");
            return `${day}/${month}/${year}`;
        },
        onCategoryChange() {
            // Reset selected affiliates when category changes
            this.selectedAffiliatesIds = [];
            this.currentPage = 1;
        },
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },
        generateAvailableMonths() {
            const months = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();
            
            this.availableMonths = this.couponRequestsHistory
                .map(request => new Date(request.date))
                .filter((date, index, self) => 
                    self.findIndex(d => d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()) === index
                )
                .map(date => ({
                    value: date.getMonth(),
                    label: months[date.getMonth()],
                    year: date.getFullYear()
                }))
                .sort((a, b) => a.value - b.value);
            
            // Set default to current month if available
            if (this.availableMonths.length > 0) {
                this.selectedHistoryMonth = currentMonth;
            }
        },
        async fetchHistoryRequests() {
            try {
                this.loading = true;
                const requestsRef = dbRef(db, `Users/${this.userId}/coupon_requests`);
                const requestsSnapshot = await get(requestsRef);

                if (requestsSnapshot.exists()) {
                    const requestsData = Object.values(requestsSnapshot.val());
                    this.couponRequestsHistory = requestsData;
                    this.generateAvailableMonths();
                    console.log(this.couponRequestsHistory);
                } else {
                    this.couponRequestsHistory = [];
                }                
            } catch (error) {
                console.error("Error fetching history requests:", error);
            } finally {
                this.loading = false;
            }
        },
        async fetchRequestDetails(request) {
            // Fetch details for selected affiliates and categories
            const affiliatePromises = Object.keys(request.selectedAffiliates || {}).map(async (affiliateId) => {
                const affiliateRef = dbRef(db, `Users/${affiliateId}`);
                const affiliateSnapshot = await get(affiliateRef);
                return affiliateSnapshot.exists() ? affiliateSnapshot.val() : null;
            });

            const categoryPromises = Object.keys(request.selectedCategories || {}).map(async (categoryId) => {
                const categoryRef = dbRef(db, `Affiliate_categories/${categoryId}`);
                const categorySnapshot = await get(categoryRef);
                return categorySnapshot.exists() ? categorySnapshot.val() : null;
            });

            const [affiliates, categories] = await Promise.all([
                Promise.all(affiliatePromises),
                Promise.all(categoryPromises)
            ]);

            return {
                date: this.formatDate(request.date),
                affiliates: affiliates.filter(a => a !== null),
                categories: categories.filter(c => c !== null)
            };
        },
        async showRequestDetails(request) {
            try {
                // Fetch detailed information about the request
                this.selectedRequestDetails = await this.fetchRequestDetails(request);
                
                // Use Bootstrap modal to show details
                const modalElement = document.getElementById('requestDetailsModal');
                const modal = new Modal(modalElement);
                modal.show();
            } catch (error) {
                console.error('Error fetching request details:', error);
                showToast('Error al cargar los detalles de la solicitud', {
                    style: {
                        background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
                    },
                });
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
                this.loading = true;
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
            } finally {
                this.loading = false;
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
                        this.userSubscriptionIcon = subscriptionData.icon;

                        // Reference to the user's coupon requests
                        const userRequestsRef = dbRef(db, `Users/${this.userId}/coupon_requests`);
                        const requestsSnapshot = await get(userRequestsRef);

                        if (requestsSnapshot.exists()) {
                            const requestsData = Object.values(requestsSnapshot.val());
                            const currentMonth = new Date().getMonth();

                            // Filter requests for the current month
                            const requestsThisMonth = requestsData.filter(request => {
                                const requestDate = new Date(request.date);
                                return requestDate.getMonth() === currentMonth;
                            });

                            // Calculate remaining requests
                            const usedRequests = requestsThisMonth.length;
                            this.availableRequests = requestLimit - usedRequests;
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

        async sendRequest() {
            // Ensure the user is logged in (has userId)
            if (!this.userId) {
                console.error('User is not logged in');
                alert('Usuario no identificado');
                return;
            }
            // Validate selected categories and affiliates
            if (this.selectedAffiliatesIds.length === 0) {
                showToast('Error: Debe seleccionar al menos un comercio', {
                    style: {
                        background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
                    },
                });
                return;
            }
            const selectedAffiliates = {};
            const selectedCategories = {};

            try {
                this.isSubmitting = true;
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

                if (this.selectedCategory) {
                    selectedCategories[this.selectedCategory.id] = this.selectedCategory.id;
                }

                const newRequest = {
                    selectedAffiliates,
                    selectedCategories,
                    date: new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString()
                };

                // Push the new request to Firebase under the user's coupon requests
                await push(dbRef(db, `Users/${this.userId}/coupon_requests`), newRequest);

                // Success toast
                showToast('¡Solicitud enviada con éxito!');
                console.log('Request submitted successfully!');

                // Reset form
                this.selectedAffiliatesIds = [];
                this.selectedCategory = null;
                this.fetchHistoryRequests();
            } catch (error) {
                console.error('Error submitting request.');
                console.error(error);
            } finally {
                this.isSubmitting = false;
            }
        },        
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;

        await this.fetchHistoryRequests();
        await this.fetchCategories();
        await this.fetchAffiliates();
        await this.fetchUserSubscription();

        // Add touch event listeners to improve dropdown interaction on mobile
        const dropdownToggle = document.getElementById('categoryDropdown');
        if (dropdownToggle) {
            dropdownToggle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropdownToggle.click();
            }, { passive: false });
        }
    }
}
</script>
<template>
    <div class="container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="mb-0 text-primary">
                <i class="fa-solid fa-file-import me-2"></i>
                Solicitar Cupones
            </h4>
        </div>

        <!-- Badges -->
        <div class="row">
            <div class="col-12 d-flex justify-content-center text-center mb-3">
                <div class="d-flex flex-wrap justify-content-center align-items-center gap-3">
                    <span class="badge bg-soft-primary d-inline-flex align-items-center py-2 px-3 gap-2">
                        <i class="fa-solid fa-info-circle text-primary fs-4"></i>
                        <span class="badge-text">
                            Requieres una suscripción activa para solicitar cupones                            
                        </span>                        
                    </span>
                </div>
            </div>
            <div class="col-12">
                <div class="d-inline-block w-100 text-center">
                    <div class="d-inline-flex justify-content-center align-items-center gap-3">
                        <div v-if="userSubscriptionId && availableRequests !== null" 
                            class="badge bg-soft-primary d-inline-flex align-items-center py-2 px-3 gap-2">
                            <i class="text-primary fs-5" :class="userSubscriptionIcon"></i>
                            <span class="badge-text">Suscripción: {{ userSubscriptionName.charAt(0).toUpperCase() + userSubscriptionName.slice(1) }}</span>
                        </div>
                        <div v-if="userSubscriptionId && availableRequests !== null" 
                            class="badge bg-soft-primary d-inline-flex align-items-center py-2 px-3 gap-2">
                            <i class="fa-solid fa-bell-concierge text-primary fs-5 me-0"></i>
                            <span class="badge-text">Solicitudes restantes: {{ availableRequests }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Requests card -->
        <div class="card mt-3">
            <div class="card-header">
                <h5 class="text-center text-black mb-0">Selecciona el comercio y categoría para tu cupón</h5>
            </div>
            <div class="card-body">
                <!-- Category Select -->
                <div class="row mb-4 justify-content-center">
                    <div class="col-12 col-md-8 col-lg-6">
                        <div class="form-group">
                            <label for="categorySelect" class="form-label">Selecciona una categoría</label>
                            <select id="categorySelect" class="form-select" v-model="selectedCategory"
                                @change="onCategoryChange">
                                <option :value="null" disabled>Selecciona una categoría</option>
                                <option v-for="category in categories" :key="category.id" :value="category">
                                    {{ category.name }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Affiliates Selection -->
                <div v-if="selectedCategory" class="row g-4">
                    <div v-for="affiliate in filteredAffiliates" :key="affiliate.id" class="col-12 col-md-6 col-lg-4">
                        <div class="card h-100">
                            <div class="card-header text-center d-flex justify-content-center align-items-center"
                                style="height: 150px; background-color: #f8f9fa;">
                                <img class="img-fluid" :src="affiliate.image" :alt="affiliate.companyName + ' Logo'"
                                    style="max-height: 100%; max-width: 100%;">
                            </div>
                            <div class="card-body">
                                <div class="form-check" style="margin: 10px;">
                                    <input type="checkbox" class="form-check-input" :id="'check_' + affiliate.id"
                                        :value="affiliate.id" v-model="selectedAffiliatesIds">
                                    <label class="form-check-label" :for="'check_' + affiliate.id">
                                        {{ affiliate.companyName }}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Affiliates Message -->
                <div v-if="selectedCategory && filteredAffiliates.length === 0"
                    class="alert alert-info text-center mt-4">
                    No hay comercios disponibles en esta categoría
                </div>
            </div>

            <div class="card-footer bg-dark text-end">
                <button class="btn btn-theme w-auto" :disabled="isSubmitting || selectedAffiliatesIds.length === 0"
                    @click="sendRequest()">
                    <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                        aria-hidden="true"></span>
                    <span v-else>
                        <i class="fa fa-check"></i> Enviar Solicitud
                    </span>
                </button>
            </div>
        </div>

        <!-- Requests History -->
        <div class="card mt-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="text-black mb-0">Historial de Solicitudes</h5>
                <div class="col-md-4">
                    <select 
                        v-if="availableMonths.length > 0"
                        class="form-select" 
                        v-model="selectedHistoryMonth"
                    >
                        <option 
                            v-for="month in availableMonths" 
                            :key="month.value" 
                            :value="month.value"
                        >
                            {{ month.label }}
                        </option>
                    </select>
                </div>
            </div>
            <div class="card-body">
                <div v-if="filteredCouponRequestsHistory.length === 0" class="text-center text-muted">
                    No hay solicitudes en este mes
                </div>
                <div v-else class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th scope="col">Fecha</th>
                                <th scope="col">Comercios</th>
                                <th scope="col">Categorías</th>
                                <th scope="col">Acciones</th>
                            </tr>                            
                        </thead>
                        <tbody>
                            <tr v-for="(request, index) in filteredCouponRequestsHistory" :key="index">
                                <td>{{ formatDate(request.date) }}</td>
                                <td>
                                    <span v-if="request.selectedAffiliates">
                                        {{ Object.keys(request.selectedAffiliates).length }} comercio(s)
                                    </span>
                                    <span v-else>-</span>
                                </td>
                                <td>
                                    <span v-if="request.selectedCategories">
                                        {{ Object.keys(request.selectedCategories).length }} categoría(s)
                                    </span>
                                    <span v-else>-</span>
                                </td>
                                <td>
                                    <button 
                                        class="btn btn-sm btn-outline-primary" 
                                        @click="showRequestDetails(request)"
                                    >
                                        <i class="fa-solid fa-eye"></i> Ver Detalles
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Request Details Modal -->
        <div class="modal fade" id="requestDetailsModal" tabindex="-1" aria-labelledby="requestDetailsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="requestDetailsModalLabel">Detalles de la Solicitud</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" v-if="selectedRequestDetails">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Comercios Seleccionados</h6>
                                <ul class="list-group">
                                    <li 
                                        v-for="(affiliate, index) in selectedRequestDetails.affiliates" 
                                        :key="index" 
                                        class="list-group-item"
                                    >
                                        {{ affiliate.companyName }}
                                    </li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <h6>Categorías Seleccionadas</h6>
                                <ul class="list-group">
                                    <li 
                                        v-for="(category, index) in selectedRequestDetails.categories" 
                                        :key="index" 
                                        class="list-group-item"
                                    >
                                        {{ category.name }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="container-fluid">
            <div class="row">
                <div class="col-12 text-center">
                    <small class="text-muted opacity-75 d-block mt-2">
                        <i class="fa-solid fa-info-circle me-1 text-muted"></i>
                        Solicitudes se resetean cada mes
                    </small>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.alert-soft-info {
    background-color: rgba(13, 110, 253, 0.1);
}
.btn-outline-theme,
.btn-theme {
    background-color: purple;
    border-color: purple;
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
}

.bg-soft-primary {
    background-color: rgba(13, 110, 253, 0.1);
    color: #0d6efd;
    border-radius: 20px;
    font-weight: 500;
}

.badge-text {
    font-size: 0.8rem;
    line-height: 1.2;
    color: #ffffff;
}

.img {
    position: relative;
    background-size: cover;
    background-position: center;
    width: 100%;
    height: 200px;
    border-radius: 5px;
}

.dropdown {
    position: relative;
}

.dropdown-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    -webkit-tap-highlight-color: transparent;
}

.dropdown-toggle::after {
    margin-left: 0.5rem;
}

.category-dropdown-menu {
    max-height: 300px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.category-dropdown-menu::-webkit-scrollbar {
    width: 8px;
}

.category-dropdown-menu::-webkit-scrollbar-track {
    background: transparent;
}

.category-dropdown-menu::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
}

@media (max-width: 576px) {
    .dropdown-toggle {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
    }

    .badge-text {
        font-size: 0.7rem;
    }

    .bg-soft-primary {
        padding: 0.25rem 0.5rem;
    }

    .bg-soft-primary i {
        font-size: 0.8rem;
        margin-right: 0.25rem;
    }
}

.form-select {
    border-radius: 20px;
    padding: 0.5rem 1rem;
    font-size: 0.95rem;
}

.form-select option {
    color: #ffffff;
}

.form-label {
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #72797f;
}
</style>