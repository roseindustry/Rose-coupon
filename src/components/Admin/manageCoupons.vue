<template>
    <div class="mt-4">
        <div class="coupon-form-container">
            <!-- Header Section -->
            <h5 class="text-primary mb-4">Cupones aplicados</h5>

            <!-- Search and Filters Section -->
            <div class="form-section">
                <div class="filters-container">
                    <!-- Left side: Search Bar -->
                    <div class="search-side">
                        <div class="search-container">
                            <label class="form-label">Buscar cupón</label>
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="fa fa-search"></i>
                                </span>
                                <input type="text" 
                                    class="form-control" 
                                    v-model="searchQuery"
                                    placeholder="Buscar por nombre o código..." 
                                />
                    </div>
                </div>
                    </div>

                    <!-- Right side: Filters -->
                    <div class="filters-side">
                        <div class="filters-group">
                            <!-- Affiliate Filter -->
                            <div class="filter-item">
                                <label class="form-label">Por comercio</label>
                                <div class="dropdown">
                                    <button class="btn btn-outline-theme dropdown-toggle" type="button" 
                                        data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fa fa-store me-2"></i>
                                        {{ activeAffiliate ? activeAffiliate.companyName : 'Todos los comercios' }}
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li>
                                            <a class="dropdown-item" href="#" 
                                                @click.prevent="clearAffiliateFilter"
                                                :class="{ active: !activeAffiliate }">
                                                Todos los comercios
                                            </a>
                                        </li>
                                        <li v-for="affiliate in affiliates" :key="affiliate.id">
                                            <a class="dropdown-item" href="#" 
                                                @click.prevent="setActiveAffiliate(affiliate)"
                                                :class="{ active: activeAffiliate?.id === affiliate.id }">
                                                {{ affiliate.companyName }}
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Date Filter Toggle -->
                            <div class="filter-item">
                                <label class="form-label">Por fecha</label>
                                <div class="dropdown">
                                    <div class="date-filter-toggle">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" 
                                                id="filterByDate" v-model="filterByDate">
                </div>
            </div>
        </div>
            </div>
                        </div>
                    </div>
                </div>

                <!-- Date Range Picker -->
                <div v-if="filterByDate" class="date-range-section mt-3">
                    <div class="date-range-container">
                        <div class="date-input">
                            <label class="form-label">Fecha inicial</label>
                            <input type="date" v-model="startDate" class="form-control" />
            </div>
                        <div class="date-input">
                            <label class="form-label">Fecha final</label>
                            <input type="date" v-model="endDate" class="form-control" />
        </div>
                        <button type="button" class="btn btn-outline-theme" @click="clearDateFilter">
                            <i class="fa fa-times-circle me-2"></i>Limpiar filtro
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sort Section -->
            <div class="sort-section mt-3">
                <div class="btn-group">
                    <button class="btn btn-outline-theme" 
                        :class="{ active: sortBy === 'date' }"
                        @click="toggleSort('date')">
                        <i class="fa" :class="sortBy === 'date' ? 
                            (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 
                            'fa-sort'">
                        </i>
                        Fecha
                    </button>
                    <button class="btn btn-outline-theme"
                        :class="{ active: sortBy === 'name' }"
                        @click="toggleSort('name')">
                        <i class="fa" :class="sortBy === 'name' ? 
                            (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 
                            'fa-sort'">
                        </i>
                        Nombre
                    </button>
                    <button class="btn btn-outline-theme"
                        :class="{ active: sortBy === 'code' }"
                        @click="toggleSort('code')">
                        <i class="fa" :class="sortBy === 'code' ? 
                            (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 
                            'fa-sort'">
                        </i>
                        Código
                    </button>
            </div>
        </div>

            <!-- Loading State -->
            <div class="d-flex justify-content-center align-items-center min-vh-50 mt-4" v-if="loading">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        </div>

            <!-- Empty State -->
            <div v-else-if="filteredAndSortedCoupons.length === 0" class="d-flex justify-content-center align-items-center min-vh-50">
                <div class="text-center">
                    <div class="mb-3">
                        <i class="fa fa-ticket-alt text-secondary opacity-25" style="font-size: 5em"></i>
                    </div>
                    <h5 class="text-secondary">No hay cupones aplicados</h5>
                    <div class="d-flex justify-content-center">
                        <button class="btn btn-theme mt-3" @click="fetchAllAppliedCoupons">
                        <i class="fa fa-sync-alt me-2"></i>Mostrar todos
                        </button>
                    </div>                    
                </div>
            </div>

            <!-- Results Count -->
            <div v-else class="results-count mt-4 mb-3">
                Mostrando {{ filteredAndSortedCoupons.length }} 
                {{ filteredAndSortedCoupons.length === 1 ? 'resultado' : 'resultados' }}
            </div>

            <!-- Update the error state -->
            <div v-if="fetchError" class="alert alert-danger mt-3">
                {{ fetchError }}
                <button class="btn btn-link" @click="fetchAllAppliedCoupons">
                    Reintentar
            </button>
        </div>

            <!-- Coupons Grid -->
            <div class="coupon-cards-container">
                <div v-for="coupon in filteredAndSortedCoupons" 
                    :key="`${coupon.couponId}-${coupon.clientId}`" 
                    class="coupon-payment-card"
                >
                    <div class="card-header">
                        <h6 class="mb-0 text-black">{{ coupon.name?.toUpperCase() || 'Cupón borrado' }}</h6>
                        <div class="badge rounded-pill bg-info text-black">
                            <i class="fa fa-calendar me-1"></i>
                            {{ formatDate(coupon.appliedDate) }}
                        </div>
                    </div>

                    <div class="card-body">
                        <div class="coupon-image">
                            <img :src="coupon.image" :alt="coupon.name" />
                        </div>

                        <div class="coupon-details text-black">
                            <div class="detail-item">
                                <span class="detail-label fw-bold me-1">Código:</span>
                                <span class="detail-value">{{ coupon.couponCode || 'N/A' }}</span>
                                    </div>

                            <div class="detail-item">
                                <span class="detail-label fw-bold me-1">
                                    {{ coupon.type ? coupon.type.charAt(0).toUpperCase() + coupon.type.slice(1) : 'Balance' }}:
                                </span>
                                <span class="detail-value">${{ coupon.balance || '0' }}</span>
                                </div>

                            <div class="detail-item">
                                <span class="detail-label fw-bold me-1">Cliente:</span>
                                <span class="detail-value">{{ coupon.clientName || 'Aplicado sin cliente' }}</span>
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
import { isWithinInterval, parseISO, isSameDay, isAfter, isBefore } from 'date-fns';

export default {
    props: {
        affiliates: {
            type: Array,
            required: true
        }
    },
    
    data() {
        return {
            filterByDate: false,
            startDate: null,
            endDate: null,
            loading: false,
            appliedCoupons: [],
            activeAffiliate: null,
            searchQuery: '',
            sortBy: 'date', // 'date', 'name', 'code'
            sortOrder: 'desc', // 'asc', 'desc'
            fetchError: null,
            clientsCache: new Map(), // Cache for client names
        };
    },

    computed: {
        filteredAndSortedCoupons() {
            let filtered = [...this.appliedCoupons];

            try {
                // Apply affiliate filter
                if (this.activeAffiliate) {
                    filtered = filtered.filter(coupon => 
                        coupon.affiliateId === this.activeAffiliate.id
                    );
                }

                // Apply search filter
                if (this.searchQuery.trim()) {
                    const query = this.searchQuery.toLowerCase();
                    filtered = filtered.filter(coupon => 
                        (coupon.name?.toLowerCase().includes(query)) ||
                        (coupon.couponCode?.toLowerCase().includes(query)) ||
                        (coupon.clientName?.toLowerCase().includes(query))
                    );
                }

                // Apply date filter
                if (this.filterByDate && this.startDate && this.endDate) {
                    const start = parseISO(this.startDate);
                    const end = parseISO(this.endDate);

                    filtered = filtered.filter(coupon => {
                        const appliedDate = parseISO(coupon.appliedDate);
                        return (
                            isSameDay(appliedDate, start) ||
                            isSameDay(appliedDate, end) ||
                            isWithinInterval(appliedDate, { start, end })
                        );
                    });
                }

                // Apply sorting
                filtered.sort((a, b) => {
                    switch (this.sortBy) {
                        case 'date':
                            const dateA = new Date(a.appliedDate);
                            const dateB = new Date(b.appliedDate);
                            return this.sortOrder === 'asc' 
                                ? dateA - dateB 
                                : dateB - dateA;
                        
                        case 'name':
                            const nameA = (a.name || '').toLowerCase();
                            const nameB = (b.name || '').toLowerCase();
                            return this.sortOrder === 'asc'
                                ? nameA.localeCompare(nameB)
                                : nameB.localeCompare(nameA);
                        
                        case 'code':
                            const codeA = (a.couponCode || '').toLowerCase();
                            const codeB = (b.couponCode || '').toLowerCase();
                            return this.sortOrder === 'asc'
                                ? codeA.localeCompare(codeB)
                                : codeB.localeCompare(codeA);
                            
                        default:
                            return 0;
                    }
                });

                return filtered;

            } catch (error) {
                console.error('Error in filteredAndSortedCoupons:', error);
                return [];
            }
        },

        hasFiltersApplied() {
            return this.activeAffiliate || 
                   this.searchQuery.trim() || 
                   (this.filterByDate && this.startDate && this.endDate);
        },

        sortLabel() {
            const labels = {
                date: 'Fecha',
                name: 'Nombre',
                code: 'Código'
            };
            return labels[this.sortBy] || 'Ordenar por';
        }
    },

    methods: {
        async fetchAllAppliedCoupons() {
            this.loading = true;
            this.fetchError = null;
            
            try {
                // Reset filters
                this.resetFilters();
                
                let appliedCoupons = [];

                // Process each affiliate
                for (const affiliate of this.affiliates) {
                    if (!affiliate.appliedCoupons) continue;

                    await this.processAffiliateCoupons(affiliate, appliedCoupons);
                }

                this.appliedCoupons = appliedCoupons;

            } catch (error) {
                console.error('Error fetching applied coupons:', error);
                this.fetchError = 'Error al cargar los cupones. Por favor, intente de nuevo.';
                this.appliedCoupons = [];
            } finally {
                this.loading = false;
            }
        },

        async processAffiliateCoupons(affiliate, appliedCoupons) {
            for (const [couponId, redemptions] of Object.entries(affiliate.appliedCoupons)) {
                if (typeof redemptions !== 'object') continue;

                for (const [clientId, couponDetails] of Object.entries(redemptions)) {
                    try {
                        const clientName = await this.getClientName(clientId);
                        const couponData = await this.getCouponData(couponId);

                        appliedCoupons.push({
                            ...couponData,
                            couponId,
                            clientId,
                            clientName,
                            affiliateId: affiliate.id,
                            affiliateName: affiliate.companyName,
                            appliedDate: couponDetails.appliedDate,
                            image: couponData.qrFileUrl,
                        });
                    } catch (error) {
                        console.error(`Error processing coupon ${couponId}:`, error);
                    }
                }
            }
        },

        async getClientName(clientId) {
            if (this.clientsCache.has(clientId)) {
                return this.clientsCache.get(clientId);
            }

            try {
                const clientRef = dbRef(db, `Users/${clientId}`);
                const clientSnapshot = await get(clientRef);

                if (clientSnapshot.exists()) {
                    const clientData = clientSnapshot.val();
                    const name = `${clientData.firstName} ${clientData.lastName}`;
                    this.clientsCache.set(clientId, name);
                    return name;
                }
                
                return 'Cliente no encontrado';
            } catch (error) {
                console.error('Error fetching client name:', error);
                return 'Error al cargar cliente';
            }
        },

        async getCouponData(couponId) {
            try {
                            const couponRef = dbRef(db, `Coupons/${couponId}`);
                            const couponSnapshot = await get(couponRef);
                return couponSnapshot.exists() ? couponSnapshot.val() : {};
            } catch (error) {
                console.error('Error fetching coupon data:', error);
                return {};
            }
        },

        resetFilters() {
            this.activeAffiliate = null;
            this.searchQuery = '';
            this.filterByDate = false;
            this.startDate = null;
            this.endDate = null;
            this.sortBy = 'date';
            this.sortOrder = 'desc';
        },

        toggleSort(field) {
            if (this.sortBy === field) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortBy = field;
                this.sortOrder = 'asc';
            }
        },

        formatDate(date) {
            if (!date) return '';
            try {
                const d = new Date(date);
                return d.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            } catch (error) {
                console.error('Error formatting date:', error);
                return '';
            }
        },

        clearDateFilter() {
            this.startDate = null;
            this.endDate = null;
            this.filterByDate = false;
        },

        clearAffiliateFilter() {
            this.activeAffiliate = null;
        },

        setActiveAffiliate(affiliate) {
            this.activeAffiliate = affiliate;
        },
    }
};
</script>

<style scoped>
/* Base styles */
.expiration-badge {
    position: absolute;
    top: -5px;
    right: 0;
    font-size: 0.75rem;
    padding: 3px 8px;
    border-radius: 12px;
    background-color: #e9ecef;
    color: #495057;
    font-weight: 500;
    display: flex;
    align-items: center;
}
.filters-container {
    display: flex;
    gap: 20px;
    align-items: start;
}

.search-side {
    flex: 0 0 50%;
    max-width: 50%;
}

.filters-side {
    flex: 1;
    display: flex;
    justify-content: flex-end;
}

.filters-group {
    display: flex;
    gap: 15px;
    align-items: flex-start;
    justify-content: flex-end;
}

.filter-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 200px;
}

/* Sort section styles */
.sort-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
}

.btn-group {
    display: flex;
    gap: 8px;
}

.btn-group .btn {
    border-radius: 6px !important;
    padding: 8px 16px;
}

.btn-group .btn.active {
    background-color: var(--bs-purple);
    color: white;
}

/* Large screens (≥992px) */
@media (min-width: 992px) {
    .filter-item {
        flex: 0 0 auto;
    }
    
    .btn-outline-theme {
        min-width: 180px;
    }
}

/* Medium screens (768px - 991px) */
@media (max-width: 991px) {
    .filters-container {
        flex-direction: column;
        gap: 20px;
    }
    
    .search-side {
        flex: 0 0 100%;
        max-width: 100%;
    }
    
    .filters-side {
        width: 100%;
    }
    
    .filters-group {
        justify-content: center;
        gap: 15px;
    }
    
    .filter-item {
        flex: 0 0 auto;
        min-width: 220px;
    }
    
    .sort-section {
        justify-content: center;
        margin-top: 25px;
    }
    
    .btn-group {
        gap: 10px;
    }
    
    .btn-outline-theme {
        min-width: 160px;
    }
}

/* Small screens (576px - 767px) */
@media (max-width: 767px) {
    .coupon-payment-card {
        overflow-x: auto;
    }

    .filters-group {
        flex-direction: column;
        align-items: center;
        width: 100%;
        gap: 20px;
    }
    
    .filter-item {
        width: 100%;
        max-width: 300px;
    }
    
    .btn-group {
        width: 100%;
        max-width: 300px;
    }
    
    .btn-group .btn {
        flex: 1;
        padding: 8px;
        font-size: 0.9rem;
    }
    
    .btn-outline-theme {
        width: 100%;
    }
}

/* Extra small screens (<576px) */
@media (max-width: 575px) {
    
    .filters-container {
        gap: 15px;
    }
    
    .filters-group {
        gap: 15px;
    }
    
    .filter-item {
        max-width: 100%;
    }
    
    .btn-group {
        max-width: 100%;
        flex-direction: column;
    }
    
    .btn-group .btn {
        width: 100%;
        margin: 0;
        padding: 10px;
    }
    
    .dropdown-menu {
        width: 100%;
        max-width: none;
    }
    
    .date-range-container {
        flex-direction: column;
        gap: 15px;
    }
    
    .date-range-container > * {
        width: 100%;
    }
}

/* Utility classes */
.min-vh-50 {
    min-height: 50vh;
}

.results-count {
    color: var(--bs-gray-600);
    font-size: 0.9rem;
    text-align: center;
    margin: 20px 0;
}

/* Common elements */
.dropdown-menu {
    padding: 8px;
    min-width: 200px;
    max-height: 300px;
    overflow-y: auto;
    scrollbar-width: thin;
}

.dropdown-menu::-webkit-scrollbar {
    width: 6px;
}

.dropdown-menu::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: #555;
}

.dropdown-item {
    padding: 8px 12px;
    border-radius: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dropdown-item.active {
    background-color: var(--bs-purple);
    color: white;
}

.dropdown-item:hover:not(.active) {
    background-color: rgba(111, 66, 193, 0.1);
}

.btn-outline-theme {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}
</style>