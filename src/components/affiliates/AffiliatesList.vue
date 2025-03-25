<template>
    <div class="container">
        <!-- Search and Filters Row -->
        <div class="row mb-3">
            <!-- Search Bar -->
            <div class="col-md-6 mb-2">
                <div class="input-group">
                    <span class="input-group-text bg-dark border-secondary">
                        <i class="fas fa-search text-light"></i>
                    </span>
                    <input 
                        type="text" 
                        class="form-control bg-dark text-light border-secondary" 
                        v-model="searchQuery"
                        placeholder="Buscar comercios..."
                    >
                </div>
            </div>
            
            <!-- Filters -->
            <div class="col-md-6">
                <div class="d-flex justify-content-end flex-wrap">
                    <div v-if="!filterAffiliates" 
                         class="btn btn-theme me-2 mb-2" 
                         @click.prevent="$emit('habilitate-filters')">
                        <i class="fa-solid fa-filter"></i>
                        Filtrar comercios
                    </div>
                    <div v-if="filterAffiliates" 
                         class="btn btn-theme me-2 mb-2" 
                         @click.prevent="$emit('habilitate-filters')">
                        <i class="fa-solid fa-filter"></i>
                        Limpiar filtros
                    </div>

                    <!-- State Filter -->
                    <div v-if="filterAffiliates" class="dropdown mb-2 me-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" 
                                type="button"
                                id="filterDropdown" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false">
                            <i class="fa-solid fa-filter"></i>
                            {{ selectedState ? selectedState : 'Filtrar por Estado' }}
                        </button>
                        <ul class="dropdown-menu" 
                            aria-labelledby="filterDropdown"
                            style="max-height: 200px; overflow-y: auto;">
                            <li v-for="state in venezuelanStates" :key="state">
                                <a class="dropdown-item" 
                                   href="#"
                                   @click.prevent="handleStateSelect(state)">
                                    {{ state }}
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" 
                                   href="#" 
                                   @click.prevent="$emit('clear-filter')">Ver todos</a>
                            </li>
                        </ul>
                    </div>

                    <!-- Municipio Filter -->
                    <div v-if="showMunicipios" class="dropdown mb-2 me-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" 
                                type="button"
                                id="filterMunicipios" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false">
                            <i class="fa-solid fa-filter"></i>
                            {{ selectedMunicipio ? selectedMunicipio : 'Filtrar por Municipio' }}
                        </button>
                        <ul class="dropdown-menu" 
                            aria-labelledby="filterDropdown"
                            style="max-height: 200px; overflow-y: auto;">
                            <li v-for="municipio in municipios" :key="municipio">
                                <a class="dropdown-item" 
                                   href="#"
                                   @click.prevent="handleMunicipioSelect(municipio)">
                                    {{ municipio }}
                                </a>
                            </li>
                        </ul>
                    </div>

                    <!-- Parroquia Filter -->
                    <div v-if="showParroquias" class="dropdown mb-2 me-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" 
                                type="button"
                                id="filterParroquias" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false">
                            <i class="fa-solid fa-filter"></i>
                            {{ selectedParroquia ? selectedParroquia : 'Filtrar por Parroquia' }}
                        </button>
                        <ul class="dropdown-menu" 
                            aria-labelledby="filterDropdown"
                            style="max-height: 200px; overflow-y: auto;">
                            <li v-for="parroquia in parroquias" :key="parroquia">
                                <a class="dropdown-item" 
                                   href="#"
                                   @click.prevent="handleParroquiaSelect(parroquia)">
                                    {{ parroquia }}
                                </a>
                            </li>
                        </ul>
                    </div>

                    <!-- Category Filter -->
                    <div v-if="showCategories" class="dropdown mb-2 me-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" 
                                type="button"
                                id="filterDropdown" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false">
                            <i class="fa-solid fa-filter"></i>
                            {{ selectedCategory ? selectedCategory.name : 'Filtrar por Categoria' }}
                        </button>
                        <ul class="dropdown-menu" 
                            aria-labelledby="filterDropdown"
                            style="max-height: 200px; overflow-y: auto;">
                            <li v-for="category in categories" :key="category">
                                <a class="dropdown-item" 
                                   href="#"
                                   @click.prevent="handleCategorySelect(category)">
                                    {{ category.name }}
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" 
                                   href="#" 
                                   @click.prevent="$emit('clear-filter')">Ver todos</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Affiliates List -->
        <div class="affiliates-list-wrapper">
            <!-- Empty State -->
            <div v-if="displayedAffiliates.length === 0" class="d-flex justify-content-center align-items-center min-vh-50">
                <div class="text-center">
                    <div class="mb-3">
                        <i class="fa fa-building text-secondary opacity-25" style="font-size: 5em"></i>
                    </div>
                    <h5 class="text-secondary">No hay Comercios Afiliados registrados.</h5>
                </div>
            </div>

            <template v-else>
                <div class="affiliate-item" v-for="(affiliate, index) in displayedAffiliates" :key="affiliate.id">
                    <div class="affiliate-header">
                        <div class="affiliate-info">
                            <div class="d-flex align-items-center gap-3">
                                <!-- Logo -->
                                <div class="affiliate-logo">
                                    <!-- Image Display -->
                                    <div v-if="!affiliate.updatedImagePreview" class="logo-container">
                                        <img :src="affiliate.image" 
                                             :alt="affiliate.companyName"
                                             @error="e => e.target.src = '/placeholder-logo.png'">
                                    </div>

                                    <!-- Image Edit: File Input -->
                                    <div v-if="affiliate.isEditing" class="edit-image-container">
                                        <div v-if="affiliate.updatedImagePreview" class="preview-container mb-2">
                                            <img :src="affiliate.updatedImagePreview" alt="preview">
                                            <div class="edit-actions position-absolute top-0 end-0 m-2">
                                                <button class="btn btn-sm btn-outline-success me-1"
                                                        @click="$emit('update-image', affiliate)" 
                                                        :disabled="affiliate.isSubmitting">
                                                    <i class="fa-solid fa-check"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger"
                                                        @click="$emit('cancel-image-edit', affiliate)">
                                                    <i class="fa-solid fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div v-else class="file-input-wrapper">
                                            <div class="d-flex align-items-center gap-2">
                                                <input type="file" 
                                                       @change="event => $emit('preview-image', event, affiliate)"
                                                       class="form-control" />
                                                <button class="btn btn-sm btn-outline-danger"
                                                        @click="$emit('cancel-image-edit', affiliate)">
                                                    <i class="fa-solid fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Loading Spinner -->
                                    <div v-if="affiliate.isSubmitting"
                                         class="spinner-overlay d-flex justify-content-center align-items-center">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Cargando...</span>
                                        </div>
                                    </div>

                                    <!-- Edit Button -->
                                    <button v-if="isAdmin && !affiliate.isEditing"
                                            class="btn btn-sm btn-dark position-absolute top-0 end-0 m-2"
                                            @click="$emit('edit-image', affiliate)"
                                            title="Editar imagen">
                                        <i class="fas fa-pencil"></i>
                                    </button>
                                </div>
                                
                                <!-- Info -->
                                <div class="affiliate-details">
                                    <h5 class="affiliate-name">{{ affiliate.companyName }}</h5>
                                    <div class="affiliate-location">
                                        <i class="fas fa-map-marker-alt me-2"></i>
                                        {{ affiliate.state }}, {{ affiliate.municipio }}
                                    </div>
                                    <div class="affiliate-contact">
                                        <i class="fab fa-whatsapp me-2"></i>
                                        {{ affiliate.phoneNumber }}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="affiliate-status">
                            <span :class="['status-badge', affiliate.status ? 'active' : '']">
                                {{ affiliate.status ? 'Activo' : 'Inactivo' }}
                            </span>
                        </div>
                    </div>

                    <!-- Social Media Links (Client View Only) -->
                    <div v-if="!isAdmin" class="affiliate-social">
                        <a v-if="affiliate.facebook" :href="affiliate.facebook" target="_blank" 
                           class="btn btn-sm btn-outline-primary me-1">
                            <i class="fab fa-facebook"></i>
                        </a>
                        <a v-if="affiliate.instagram" :href="affiliate.instagram" target="_blank"
                           class="btn btn-sm btn-outline-danger me-1">
                            <i class="fab fa-instagram"></i>
                        </a>
                        <a v-if="affiliate.twitter" :href="affiliate.twitter" target="_blank"
                           class="btn btn-sm btn-outline-info me-1">
                            <i class="fab fa-twitter"></i>
                        </a>
                        <a v-if="affiliate.tiktok" :href="affiliate.tiktok" target="_blank"
                           class="btn btn-sm btn-outline-dark">
                            <i class="fab fa-tiktok"></i>
                        </a>
                    </div>

                    <!-- Admin Actions -->
                    <div v-if="isAdmin" class="affiliate-actions">
                        <button class="btn btn-sm btn-outline-primary me-2" 
                                @click="$emit('edit-affiliate', affiliate)"
                                title="Editar comercio">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                @click="$emit('delete-affiliate', affiliate, index)"
                                title="Eliminar comercio">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
export default {
    name: 'AffiliatesList',
    props: {
        affiliates: {
            type: Array,
            required: true
        },
        isAdmin: {
            type: Boolean,
            default: false
        },
        filteredAffiliates: {
            type: Array,
            default: () => []
        },
        venezuelanStates: {
            type: Array,
            required: true
        },
        municipios: {
            type: Array,
            default: () => []
        },
        parroquias: {
            type: Array,
            default: () => []
        },
        categories: {
            type: Array,
            default: () => []
        },
        showMunicipios: Boolean,
        showParroquias: Boolean,
        showCategories: Boolean,
        selectedState: String,
        selectedMunicipio: String,
        selectedParroquia: String,
        selectedCategory: Object,
        filterAffiliates: Boolean
    },
    data() {
        return {
            searchQuery: ''
        }
    },
    computed: {
        displayedAffiliates() {
                if (!this.searchQuery) {
                    return this.filteredAffiliates.length ? this.filteredAffiliates : this.affiliates;
                }
                
                const query = this.searchQuery.toLowerCase();
                const affiliates = this.filteredAffiliates.length ? this.filteredAffiliates : this.affiliates;
                
                return affiliates.filter(affiliate => 
                    affiliate.companyName?.toLowerCase().includes(query) ||
                    affiliate.state?.toLowerCase().includes(query) ||
                    affiliate.municipio?.toLowerCase().includes(query) ||
                    affiliate.parroquia?.toLowerCase().includes(query)
                );
            return this.affiliates;
        }
    },
    methods: {
        handleSearch() {
            this.$emit('search', this.searchQuery);
        },
        handleStateSelect(state) {
            this.$emit('filter-by-state', state);
            this.$emit('display-municipios', state);
            this.$emit('set-selected-state', state);
        },
        handleMunicipioSelect(municipio) {
            this.$emit('filter-by-municipio', municipio);
            this.$emit('display-parroquias', municipio);
            this.$emit('set-selected-municipio', municipio);
        },
        handleParroquiaSelect(parroquia) {
            this.$emit('filter-by-parroquia', parroquia);
            this.$emit('set-selected-parroquia', parroquia);
        },
        handleCategorySelect(category) {
            this.$emit('filter-by-category', category);
            this.$emit('set-selected-category', category);
        }
    }
}
</script>

<style scoped>
.container {
    padding: 0;
}
.btn-theme {
    background-color: purple;
    border-color: purple;
}

.img {
    position: relative;
    background-size: cover;
    background-position: center;
    width: 100%;
    height: 200px;
    border-radius: 5px;
}

/* Edit button just for images */
.edit-button {
    position: absolute;
    top: 10px;
    /* Adjust this value to control vertical spacing */
    right: 10px;
    /* Adjust this value to control horizontal spacing */
    z-index: 1;
    /* Ensure the button is above the image */
}

.w-100px {
    width: 100px;
}

.img-container {
    position: relative;
    height: 200px;
    background-color: #1a1a1a;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.affiliate-logo {
    position: relative;
    width: 120px;
    height: 120px;
    border-radius: 8px;
    background-color: #1a1a1a;
    overflow: visible; /* Changed from hidden to allow file input to show below */
}

.logo-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 8px;
}

.logo-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    padding: 0.5rem;
}

.edit-image-container {
    position: relative;
    width: 100%;
}

.preview-container {
    width: 120px;
    height: 120px;
    position: relative;
    overflow: hidden;
    border-radius: 8px;
}

.preview-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.file-input-wrapper {
    margin-top: 0.5rem;
    width: 200px;
}

.file-input-wrapper .d-flex {
    gap: 0.5rem;
}

.file-input-wrapper input {
    font-size: 0.875rem;
    flex: 1;
}

.spinner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 2;
}

/* Update header spacing for larger logo */
.affiliate-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start; /* Changed from center to better align with larger logo */
    margin-bottom: 1rem;
    gap: 1.5rem;
}

.affiliate-info .d-flex {
    gap: 1.5rem; /* Increased from 0.5rem */
}

.min-vh-50 {
    min-height: 50vh;
}

.social-links a {
    transition: all 0.3s ease;
}

.social-links a:hover {
    transform: translateY(-2px);
}

.card {
    transition: transform 0.2s ease;
}

.card:hover {
    transform: translateY(-5px);
}

/* Dark theme adjustments */
.card {
    background-color: #2d2d2d;
    border: 1px solid rgba(255,255,255,0.1);
}

.card-body {
    background-color: #2d2d2d;
}

.text-secondary {
    color: #adb5bd !important;
}

.affiliates-list-wrapper {
    background: #29122f;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.affiliate-item {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.affiliate-item:last-child {
    border-bottom: none;
}

.affiliate-name {
    color: #ffffff;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.affiliate-location, .affiliate-contact {
    color: #adb5bd;
    font-size: 0.9rem;
    margin-top: 0.25rem;
}

.status-badge {
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    background: #e9ecef;
    color: #666;
}

.status-badge.active {
    background: #d4edda;
    color: #155724;
}

.affiliate-social {
    margin: 1rem 0;
}

.affiliate-actions {
    display: flex;
    justify-content: flex-end;
}

.btn-outline-primary, .btn-outline-danger {
    border-width: 1px;
}

@media (max-width: 768px) {
    .affiliate-header {
        flex-direction: column;
        gap: 1rem;
    }

    .affiliate-info .d-flex {
        width: 100%;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
    }

    .affiliate-logo {
        width: 90px;
        height: 90px;
        flex-shrink: 0;
    }

    .affiliate-status {
        align-self: flex-start;
        margin-top: 0.5rem;
    }

    .affiliate-social {
        flex-wrap: wrap;
    }

    .affiliate-actions {
        margin-top: 1rem;
    }

    .file-input-wrapper {
        width: 100%;
        max-width: 250px;
    }
}

@media (max-width: 480px) {
    .affiliate-item {
        padding: 1rem;
    }

    .affiliate-info .d-flex {
        gap: 0.75rem;
    }

    .affiliate-logo {
        width: 70px;
        height: 70px;
    }

    .status-badge {
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
    }

    .affiliate-social .btn {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
    }
}
</style>