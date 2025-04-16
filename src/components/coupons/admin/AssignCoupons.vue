<template>
    <!-- CLIENT TO ASSIGN -->
    <div class="container">
        <h5 class="text-primary mb-4">Seleccione un cliente</h5>
        <!-- Searching input -->
        <div class="search-and-actions">
            <div class="row g-3 align-items-center">
                <!-- Searching input -->
                <div class="col-12 col-md-6">
                    <div class="search-container position-relative">
                        <SearchInput v-model="searchClient" :results="searchClientResults"
                            placeholder="Busque un cliente por su cédula..." @input="searchClientsForCoupon"
                            @select="selectClientForCoupon" class="form-control" />
                    </div>
                </div>

                <!-- Trigger Modal Buttons -->
                <div class="col-12 col-md-6" v-if="!selectedClient">
                    <div class="d-flex gap-2 justify-content-md-end justify-content-center">
                        <button class="btn btn-outline-theme btn-sm"
                            @click.prevent="openClientsModal('withoutCoupons')">
                            <i class="fa fa-users me-1"></i>
                            Clientes sin Cupones
                        </button>
                        <button class="btn btn-outline-theme btn-sm" @click.prevent="openClientsModal('withRequests')">
                            <i class="fa fa-clipboard-list me-1"></i>
                            Clientes con Solicitudes
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Display selected client information -->
        <div class="selected-container mt-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex align-items-center">
                    <span class="badge bg-theme rounded-pill me-2">
                        {{ selectedClients.length }}
                    </span>
                    <h5 class="mb-0 text-secondary">Clientes seleccionados</h5>
                </div>
                <button v-if="selectedClients.length > 0" @click="clearSelectedClients"
                    class="btn btn-outline-danger btn-sm">
                    <i class="fa fa-times-circle me-2"></i>
                    <span>Limpiar selección</span>
                </button>
            </div>

            <!-- Selected clients cards -->
            <div v-if="selectedClients.length > 0 && !showClientsWithRequests" class="selected-clients-grid">
                <div class="client-card" v-for="clientId in selectedClients" :key="clientId">
                    <div class="client-card-header">
                        <div class="client-info">
                            <h6 class="client-name mb-0">{{ getClientFullName(clientId) }}</h6>
                            <span class="client-id">V-{{ getClientIdentification(clientId)
                            }}</span>
                        </div>
                        <button @click="deselectClient(clientId)" class="btn btn-icon btn-outline-danger btn-sm">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>

                    <div class="client-card-body">
                        <div class="preferences-section">
                            <h6 class="preferences-title">
                                <i class="fa fa-star me-1 text-warning"></i>
                                Preferencias
                            </h6>

                            <div v-if="Object.keys(clientPreferences[clientId] || {}).length > 0"
                                class="preferences-list">
                                <div v-for="(pref, categoryId) in clientPreferences[clientId]" :key="categoryId"
                                    class="preference-category">
                                    <div class="category-name">{{ pref.category }}</div>
                                    <div class="subcategories">
                                        <span v-for="(subcategory, index) in pref.subcategories" :key="index"
                                            class="subcategory-tag">
                                            {{ subcategory }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="no-preferences">
                                <i class="fa fa-info-circle me-1"></i>
                                Sin preferencias especificadas
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Empty state when no clients are selected -->
            <div v-if="selectedClients.length === 0" class="empty-selection text-center py-4">
                <div class="empty-icon mb-3">
                    <i class="fa fa-users text-muted fa-3x"></i>
                </div>
                <p class="text-muted">Seleccione clientes utilizando la búsqueda o los botones
                    de acción</p>
            </div>
        </div>
    </div>

    <!-- COUPONS TO ASSIGN -->
    <div class="container">
        <h5 class="text-primary mt-4 mb-4">Seleccione los cupones</h5>
        <!-- Search Bar and Filter for Coupons -->
        <div class="search-and-actions">
            <div class="row g-3 align-items-center">
                <!-- Search Input -->
                <div class="col-12 col-md-6 col-lg-7">
                    <div class="search-container position-relative">
                        <input type="text" class="form-control" v-model="searchCoupon"
                            placeholder="Buscar cupón por nombre o código..." />
                        <i class="fa fa-search search-icon"></i>
                    </div>
                </div>

                <!-- Filter Dropdown -->
                <div class="col-12 col-md-6 col-lg-5">
                    <div class="filter-controls d-flex flex-wrap gap-2 justify-content-md-end justify-content-center">
                        <div class="dropdown">
                            <button class="btn btn-outline-theme btn-sm dropdown-toggle" type="button"
                                id="filterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fa fa-filter me-1"></i>
                                {{ filterLabel }}
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="filterDropdown">
                                <li>
                                    <h6 class="dropdown-header">Ordenar por expiración</h6>
                                </li>
                                <li>
                                    <button class="dropdown-item" @click="setFilter('expiring-soon')">
                                        <i class="fa fa-clock-o me-2 text-warning"></i>Próximos
                                        a expirar
                                    </button>
                                </li>
                                <li>
                                    <button class="dropdown-item" @click="setFilter('newest')">
                                        <i class="fa fa-calendar-plus-o me-2 text-success"></i>Más
                                        nuevos
                                    </button>
                                </li>
                                <li>
                                    <h6 class="dropdown-header">Filtrar por estado</h6>
                                </li>
                                <li>
                                    <button class="dropdown-item" @click="setFilter('active')">
                                        <i class="fa fa-check-circle me-2 text-primary"></i>Solo
                                        activos
                                    </button>
                                </li>
                                <li>
                                    <button class="dropdown-item" @click="setFilter('expired')">
                                        <i class="fa fa-times-circle me-2 text-danger"></i>Solo
                                        expirados
                                    </button>
                                </li>
                                <li>
                                    <hr class="dropdown-divider">
                                </li>
                                <li>
                                    <button class="dropdown-item" @click="setFilter('')">
                                        <i class="fa fa-refresh me-2"></i>Mostrar todos
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="selected-container mt-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex align-items-center">
                    <span class="badge bg-theme rounded-pill me-2">
                        {{ selectedCoupons.length }}
                    </span>
                    <h5 class="mb-0 text-secondary">Cupones seleccionados</h5>
                </div>
                <div v-if="selectedCoupons.length > 0" class="d-flex justify-content-md-end justify-content-center">
                    <button @click="clearSelectedCoupons" class="btn btn-outline-danger btn-sm me-2"
                        :disabled="selectedCoupons.length === 0">
                        <i class="fa fa-times-circle me-1"></i>
                        Limpiar selección
                    </button>
                    <button class="btn btn-outline-danger btn-sm" @click="confirmDeleteSelected"
                        :disabled="selectedCoupons.length === 0">
                        <i class="fa fa-trash me-1"></i>
                        Eliminar seleccionados
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="(!filteredCoupons || filteredCoupons.length === 0)"
            class="d-flex justify-content-center align-items-center min-vh-50">
            <div class="text-center">
                <div class="mb-3">
                    <i class="fa fa-ticket-alt text-secondary opacity-25" style="font-size: 5em"></i>
                </div>
                <h5 class="text-secondary">Sin resultados</h5>
            </div>
        </div>
        <!-- Coupon List -->
        <div v-else class="coupon-cards-container">
            <div v-for="coupon in filteredCoupons" :key="coupon.id">
                <CouponCard :coupon="coupon" :selectedCoupons="selectedCoupons"
                    @select-coupon="selectedCoupons = $event" @reload-coupon-list="reload" />
            </div>
        </div>
    </div>

    <!-- ASSIGN BUTTON -->
    <button @click="assignExistingCoupon" class="btn btn-outline-theme text-white"
        :disabled="selectedClients.length === 0 || selectedCoupons.length === 0">
        Asignar cupón
    </button>

    <!-- Clients Modal -->
    <div class="modal fade" id="clientsModal" tabindex="-1" aria-labelledby="clientsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content bg-dark text-light">
                <div class="modal-header border-secondary d-flex justify-content-between align-items-center">
                    <h5 class="modal-title text-theme mx-auto" id="clientsModalLabel">
                        <i class="fa fa-users me-2"></i>{{ modalTitle }}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="container-fluid">
                        <!-- Filters Row -->
                        <div class="row mb-4 g-3" v-if="!showRequestsColumn">
                            <!-- Subscription filter -->
                            <div class="col-12 col-md-6">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="show-filter"
                                            v-model="activateFilter">
                                        <label class="form-check-label" for="show-filter">
                                            Filtrar por Suscripción
                                        </label>
                                    </div>

                                    <div v-if="activateFilter" class="d-flex align-items-center gap-2">
                                        <select v-model="clientSubscription" id="subscription-select"
                                            class="form-select form-select-sm bg-theme text-light"
                                            @change="filterBySubscription">
                                            <option value="" disabled>Suscripciones</option>
                                            <option v-for="plan in subscriptions" :key="plan.id" :value="plan.id">
                                                {{ plan.name.toUpperCase() }}
                                            </option>
                                        </select>
                                        <button class="btn btn-outline-theme btn-sm"
                                            @click.prevent="clearSubscriptionFilter">
                                            <i class="fa fa-refresh me-1"></i>Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <!-- Show All Clients switch -->
                            <div class="col-12 col-md-6">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="show-allClientes"
                                        v-model="displayAllClients" @change="toggleClients()">
                                    <label v-if="!displayAllClients" class="form-check-label" for="show-allClientes">
                                        Mostrar todos los Clientes
                                    </label>
                                    <label v-else class="form-check-label" for="show-allClientes">Mostrar Clientes sin Cupones</label>
                                </div>
                            </div>
                        </div>

                        <!-- Results Count -->
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <p class="text-muted mb-0">
                                <i class="fa fa-list-alt me-2"></i>
                                {{ modalClients.length }} resultados
                            </p>
                        </div>

                        <!-- Clients Table -->
                        <div class="table-responsive">
                            <table class="table table-dark table-hover text-center">
                                <thead class="table-secondary">
                                    <tr>
                                        <th scope="col" class="align-middle">
                                            <input class="form-check-input" type="checkbox" @click="toggleSelectAll"
                                                :checked="allSelected">
                                        </th>
                                        <th scope="col" @click="sortClients('firstName')" class="cursor-pointer">
                                            Cliente
                                            <i class="fa fa-sort ms-1"></i>
                                        </th>
                                        <th scope="col" @click="sortClients('identification')" class="cursor-pointer">
                                            Cédula
                                            <i class="fa fa-sort ms-1"></i>
                                        </th>
                                        <th scope="col">Suscripción</th>
                                        <th scope="col" v-if="showRequestsColumn">Solicitud</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="client in modalClients" :key="client.id">
                                        <td class="align-middle">
                                            <input class="form-check-input" type="checkbox" :value="client.id"
                                                v-model="selectedClients"
                                                :disabled="this.selectedClients.includes(client.id)">
                                        </td>
                                        <td>{{ client.firstName + ' ' + client.lastName }}</td>
                                        <td>{{ client.identification }}</td>
                                        <td>
                                            <span class="badge rounded-pill" :class="client.subscription?.name === 'gratis' ? 'text-bg-success' : client.subscription?.name === 'bronce' ? 'bronce-badge' : client.subscription?.name === 'plata' ? 'silver-badge' : client.subscription?.name === 'oro' ? 'gold-badge' : 'no-subscription-badge'">
                                                {{ client.subscription ? client?.subscription?.name.toUpperCase() : 'Sin suscripción' }}
                                            </span>
                                        </td>
                                        <td v-if="showRequestsColumn">
                                            <button class="btn btn-outline-info btn-sm"
                                                @click.prevent="showCouponRequest(client)">
                                                <i class="fa fa-search me-1"></i>Ver solicitud
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-secondary">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Coupon Request Modal -->
    <div class="modal fade" id="couponRequestModal" tabindex="-1" aria-labelledby="couponRequestModalLabel"
        aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content bg-dark text-light">
                <div class="modal-header border-secondary">
                    <h5 class="modal-title text-theme" id="couponRequestModalLabel">
                        <i class="fa fa-clipboard-list me-2"></i>Solicitud de Cupón
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Client Information -->
                    <div class="card bg-secondary mb-4">
                        <div class="card-body bg-custom-theme">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="card-title text-theme mb-1">
                                        {{ selectedRequestsClient.firstName + ' ' + selectedRequestsClient.lastName }}
                                    </h5>
                                    <p class="card-text text-light">
                                        <strong>Cédula:</strong> {{ selectedRequestsClient.identification }}
                                    </p>
                                </div>
                                <span class="badge rounded-pill fs-6" :class="selectedRequestsClient.subscription?.name === 'gratis' ? 'text-bg-success' : selectedRequestsClient.subscription?.name === 'bronce' ? 'bronce-badge' : selectedRequestsClient.subscription?.name === 'plata' ? 'silver-badge' : selectedRequestsClient.subscription?.name === 'oro' ? 'gold-badge' : 'no-subscription-badge'">
                                    {{ selectedRequestsClient.subscription ? selectedRequestsClient.subscription?.name.toUpperCase() :
                                    'Sin suscripción' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Coupon Requests -->
                    <div v-for="(request, index) in selectedRequestsClient.coupon_requests" :key="request.id"
                        class="card bg-custom-theme mb-3">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="text-theme mb-0">
                                <i class="fa fa-ticket-alt me-2"></i>Solicitud #{{ index + 1 }}
                            </h6>
                            <small class="text-light">
                                <i class="fa fa-calendar me-1"></i>
                                {{ formatDate(request.date) }}
                            </small>
                        </div>

                        <div class="card-body">
                            <!-- Affiliates Section -->
                            <div v-if="request.selectedAffiliates" class="mb-3">
                                <h6 class="text-theme">
                                    <i class="fa fa-store me-2"></i>Afiliados
                                </h6>
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item bg-dark text-light"
                                        v-for="(affiliateId, idx) in Object.keys(request.selectedAffiliates)"
                                        :key="idx">
                                        {{ getAffiliateNameById(affiliateId) }}
                                    </li>
                                </ul>
                            </div>

                            <!-- Categories Section -->
                            <div v-if="request.selectedCategories">
                                <h6 class="text-theme">
                                    <i class="fa fa-tags me-2"></i>Categorías
                                </h6>
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item bg-dark text-light"
                                        v-for="(categoryId, idx) in Object.keys(request.selectedCategories)" :key="idx">
                                        {{ getCategoryNameById(categoryId) }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import CouponCard from './CouponCard.vue';
import SearchInput from '@/components/app/SearchInput.vue';
import { Modal } from 'bootstrap';
import { db } from '../../../firebase/init';
import { ref as dbRef, get, query, orderByChild, equalTo } from 'firebase/database';

export default {
    name: 'AssignCoupons',
    components: {
        CouponCard,
        SearchInput
    },
    props: {
        coupons: {
            type: Array,
            required: true
        },
        clients: {
            type: Array,
            required: true
        },
        affiliates: {
            type: Array,
            required: true
        },
        categories: {
            type: Array,
            required: true
        },
        subscriptions: {
            type: Array,
            required: true
        }
    },
    emits: [
        'assign-coupon',
        'clearSelectedClients',
        'fetch-client-preferences',
        'reload'
    ],
    data() {
        return {
            searchClient: '',
            searchCoupon: '',
            searchClientResults: [],
            selectedClient: null,
            selectedClients: [],
            selectedCoupons: [],
            displayAllClients: false,
            currentFilter: '',
            currentPage: 1,
            totalPages: 1,
            loadingCoupons: false,
            clientPreferences: {},
            modalClients: [],
            modalTitle: '',
            showRequestsColumn: false,
            selectedRequestsClient: {},
            isDeleting: false,
            filterLabel: 'Filtrar',
            showClientsWithRequests: false,
            filteredCoupons: [],
            loadingPreferences: false,
            activateFilter: false,
            sortField: 'firstName',
            sortOrder: 'asc',
            clientSubscription: '', // Filter by Subscription
        };
    },
    watch: {
        searchCoupon(newValue) {
            this.filterCoupons(newValue);
        },
        currentFilter(newValue) {
            this.filterCoupons(this.searchCoupon);
        }
    },
    created() {
        this.filteredCoupons = [...this.coupons];
    },
    computed: {
        allSelected() {
            // Check if the number of selected clients matches the total number of clients
            return this.selectedClients.length === this.modalClients.length && this.modalClients.length > 0;
        },
    },
    methods: {
        toggleSelectAll(event) {
            const isChecked = event.target.checked;
            this.selectedClients = isChecked ? this.modalClients.map(client => client.id) : [];
        },
        sortClients(field) {
            if (this.sortField === field) {
                // If already sorted by this field, toggle sort order
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                // Otherwise, set the field and default to ascending order
                this.sortField = field;
                this.sortOrder = 'asc';
            }

            // Sort the modalClients array
            this.modalClients.sort((a, b) => {
                let fieldA = a[field].toString().toLowerCase();
                let fieldB = b[field].toString().toLowerCase();

                if (this.sortOrder === 'asc') {
                    return fieldA > fieldB ? 1 : fieldA < fieldB ? -1 : 0;
                } else {
                    return fieldA < fieldB ? 1 : fieldA > fieldB ? -1 : 0;
                }
            });
        },
        filterCoupons(searchQuery = '') {
            let filtered = [...this.coupons];

            // Apply search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(coupon =>
                    coupon.name.toLowerCase().includes(query) ||
                    coupon.couponCode.toLowerCase().includes(query)
                );
            }

            // Apply expiration/status filter
            switch (this.currentFilter) {
                case 'expiring-soon':
                    filtered.sort((a, b) => new Date(a.expiration) - new Date(b.expiration));
                    filtered = filtered.filter(coupon => coupon.status);
                    this.filterLabel = 'Próximos a expirar';
                    break;
                case 'newest':
                    filtered.sort((a, b) => new Date(b.expiration) - new Date(a.expiration));
                    this.filterLabel = 'Más nuevos';
                    break;
                case 'active':
                    filtered = filtered.filter(coupon => coupon.status);
                    this.filterLabel = 'Solo activos';
                    break;
                case 'expired':
                    filtered = filtered.filter(coupon => !coupon.status);
                    this.filterLabel = 'Solo expirados';
                    break;
                default:
                    this.filterLabel = 'Filtrar';
            }

            this.filteredCoupons = filtered;
        },
        setFilter(filter) {
            this.currentFilter = filter;
            this.currentPage = 1;
        },
        formatDate(date) {
            if (!date) return ''; // Handle invalid dates or null values
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },
        getAffiliateNameById(affiliateId) {
            const affiliate = this.affiliates.find(affiliate => affiliate.id === affiliateId);
            // If the affiliate is found, return the companyName, otherwise return 'Unknown Affiliate'
            return affiliate ? affiliate.companyName : 'Unknown Affiliate';
        },
        getCategoryNameById(categoryId) {
            const category = this.categories.find(category => category.id === categoryId);
            // If the category is found, return the name, otherwise return 'Unknown Category'
            return category ? category.name : 'Unknown Category';
        },
        getClientFullName(clientId) {
            const client = this.clients.find(c => c.id === clientId);
            return client ? `${client.firstName} ${client.lastName}` : 'Nombre no disponible';
        },
        getClientIdentification(clientId) {
            const client = this.clients.find(c => c.id === clientId);
            return client ? client.identification : 'Cédula no disponible';
        },
        confirmDeleteSelected() {
            if (this.selectedCoupons.length === 0) return;

            const modal = new Modal(document.getElementById('deleteConfirmModal'));
            modal.show();
        },
        deselectClient(clientId) {
            this.selectedClients = this.selectedClients.filter(id => id !== clientId);
        },
        searchClientsForCoupon() {
            if (!this.searchClient.trim()) {
                this.searchClientResults = [];
                return;
            }

            const searchQuery = this.searchClient.toLowerCase();

            this.searchClientResults = this.clients.filter(client => {
                const identification = (client.identification || '').toString().toLowerCase();
                const name = (client.firstName + ' ' + client.lastName).toLowerCase();

                return identification.includes(searchQuery) || name.includes(searchQuery);
            });
        },
        async selectClientForCoupon(client) {
            if (!this.selectedClients.includes(client.id)) {
                this.selectedClients.push(client.id);
            } else {
                this.selectedClients = this.selectedClients.filter(id => id !== client.id);
            }

            // Fetch client preferences once the clients have been loaded
            if (this.selectedClients.length > 0) {
                for (const clientId of this.selectedClients) {
                    this.clientPreferences[clientId] = {};
                    const preferences = await this.fetchClientPreferences(clientId);
                    if (preferences) {
                        this.clientPreferences[clientId] = preferences;
                    }
                    console.log('Client preferences fetched for client ID:', clientId);
                    console.log('Client preferences:', this.clientPreferences[clientId]);
                }
            }

            this.searchClient = '';
            this.searchClientResults = [];
        },
        async fetchClientPreferences(clientId) {
            try {
                this.loadingPreferences = true;
                // Reference to the client's preferences in Firebase
                const preferencesRef = dbRef(db, `Users/${clientId}/preferences`);
                const preferencesSnapshot = await get(preferencesRef);

                if (preferencesSnapshot.exists()) {
                    const preferences = preferencesSnapshot.val();
                    const clientPreferences = {};

                    // Fetch categories for the selectedCategories
                    if (preferences.selectedCategories) {
                        for (const categoryId of preferences.selectedCategories) {
                            const categoryRef = dbRef(db, `Affiliate_categories/${categoryId}`);
                            const categoryDetailsSnapshot = await get(categoryRef);

                            if (categoryDetailsSnapshot.exists()) {
                                const categoryDetails = categoryDetailsSnapshot.val();

                                // Initialize the category in clientPreferences
                                clientPreferences[categoryId] = {
                                    category: categoryDetails.name,
                                    subcategories: [] // Initialize subcategories
                                };
                            }
                        }
                    }

                    // Fetch subcategories for the selectedSubcategories
                    if (preferences.selectedSubcategories) {
                        for (const subcategoryId of preferences.selectedSubcategories) {
                            const subcategoryRef = dbRef(db, `Affiliate_subcategories/${subcategoryId}`);
                            const subcategoryDetailsSnapshot = await get(subcategoryRef);

                            if (subcategoryDetailsSnapshot.exists()) {
                                const subcategoryDetails = subcategoryDetailsSnapshot.val();

                                // Find the correct category to add this subcategory to
                                const categoryId = subcategoryDetails.category_id;

                                if (clientPreferences[categoryId]) {
                                    // Add subcategory to the corresponding category
                                    clientPreferences[categoryId].subcategories.push(subcategoryDetails.name);
                                }
                            }
                        }
                    }

                    return clientPreferences; // Return the formatted preferences
                } else {
                    return {}; // Return empty if no preferences exist
                }
            } catch (error) {
                console.error('Error fetching client preferences:', error);
                return {};
            } finally {
                this.loadingPreferences = false;
            }
        },
        async openClientsModal(type) {
            try {
                if (type === 'withoutCoupons') {
                    // Filter clients without coupons from the existing clients prop
                    this.modalClients = this.clients.filter((client) => !client.coupons);
                    this.modalTitle = 'Clientes sin Cupones';
                    this.showRequestsColumn = false;
                } else if (type === 'withRequests') {
                    // Filter clients with coupon requests from the existing clients prop
                    this.modalClients = this.clients.filter((client) => client.coupon_requests);
                    this.modalTitle = 'Clientes con Solicitudes';
                    this.showRequestsColumn = true;
                }

                // Show the modal
                new Modal(document.getElementById('clientsModal')).show();
            } catch (error) {
                console.error('Error opening clients modal:', error);
                this.modalClients = [];
            }
        },
        showCouponRequest(client) {
            if (!client.coupon_requests) {
                console.error("No coupon requests found for this client");
                return;
            }
            // Convert coupon_requests object into an array with the keys
            const requests = Object.keys(client.coupon_requests).map(key => ({
                id: key,
                ...client.coupon_requests[key]
            }));

            this.selectedRequestsClient = { ...client, coupon_requests: requests };

            const modal = Modal.getOrCreateInstance(document.getElementById('couponRequestModal'));
            modal.show();
        },
        clearSelectedClients() {
            this.selectedClients = [];
            this.$emit('clearSelectedClients');
        },
        clearSelectedCoupons() {
            this.selectedCoupons = [];
        },
        filterBySubscription() {
            if (this.clientSubscription) {
                // Filter clients based on the selected subscription ID
                this.modalClients = this.clients.filter(client => 
                    client.subscriptionId === this.clientSubscription
                );
            }
        },
        clearSubscriptionFilter() {
            this.clientSubscription = '';
            
            // Reset to original filtered list based on the current modal type
            if (this.modalTitle === 'Clientes sin Cupones') {
                this.modalClients = this.clients.filter((client) => !client.coupons);
            } else if (this.modalTitle === 'Clientes con Solicitudes') {
                this.modalClients = this.clients.filter((client) => client.coupon_requests);
            } else {
                // Fallback to all clients if no specific filter is applied
                this.modalClients = this.clients.slice();
            }
        },
        toggleClients() {
            if (this.displayAllClients) {
                // Show all clients
                this.modalClients = this.clients.slice();
            } else {
                this.modalClients = this.clients.filter((client) => !client.coupons).slice();
            }
        },

        assignExistingCoupon() {
            if (this.selectedClients.length === 0 || this.selectedCoupons.length === 0) {
                return;
            }

            this.$emit('assign-coupon', {
                selectedClients: this.selectedClients,
                selectedCoupons: this.selectedCoupons,
            });
        },

        reload(couponId){
            // Remove the coupon with the specified ID from filteredCoupons
            this.filteredCoupons = this.filteredCoupons.filter(coupon => coupon.id !== couponId);
            
            // Emit a reload event to the parent component
            this.$emit('reload', couponId);
        }
    }
}
</script>
<style scoped>
.cursor-pointer {
    cursor: pointer;
}

.bg-custom-theme {
    background-color: #29122f;
}

.form-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 10px;
    font-size: 0.8rem;
    cursor: pointer;
}

.no-subscription-badge {
    background-color: red;
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
}
.bronce-badge {
    background-color: #CD7F32;
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
}
.silver-badge {
    background-color: #C0C0C0;
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
}
.gold-badge {
    background-color: #FFD700;
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .modal-dialog {
        margin: 1.75rem 0.5rem;
        max-width: calc(100% - 1rem);
    }

    .table-responsive {
        font-size: 0.9rem;
    }

    .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }

    /* Compact form elements */
    .form-check-input,
    .form-select {
        transform: scale(0.9);
    }
}

/* Adaptive typography for smaller screens */
@media (max-width: 576px) {
    .modal-body {
        font-size: 0.9rem;
    }

    .table th,
    .table td {
        padding: 0.5rem;
    }
}
</style>