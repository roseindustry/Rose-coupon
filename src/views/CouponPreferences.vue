<script>
import { ref as dbRef, query, orderByChild, equalTo, set, get, push, update, remove } from 'firebase/database';
import { db } from '@/firebase/init';
import { showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'
import { useUserStore } from "@/stores/user-role";

export default {
    data() {
        return {
            // Logged User data
            userId: null,
            role: null,

            categories: [],
            selectedCategoriesIds: [],
            selectedSubcategoriesIds: [],
        }
    },
    methods: {
        async fetchCategories() {
            const categoryRef = dbRef(db, 'Affiliate_categories');
            try {
                const categorySnapshot = await get(categoryRef);

                if (categorySnapshot.exists()) {
                    const categories = categorySnapshot.val();

                    this.categories = Object.keys(categories).map(key => ({
                        id: key,
                        ...categories[key],
                        subcategories: []
                    }));
                } else {
                    this.categories = [];
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        },
        async fetchSubcategories(categoryId) {
            this.showSubcategories = true;

            const subcategoryRef = query(dbRef(db, 'Affiliate_subcategories'), orderByChild('category_id'), equalTo(categoryId));
            try {
                const subcategorySnapshot = await get(subcategoryRef);

                if (subcategorySnapshot.exists()) {
                    const subcategories = subcategorySnapshot.val();
                    const newSubcategories = Object.keys(subcategories).map(key => ({
                        id: key,
                        ...subcategories[key]
                    }));

                    // Find the category and update its subcategories without affecting others
                    const category = this.categories.find(cat => cat.id === categoryId);
                    if (category) {
                        category.subcategories = newSubcategories;
                    }
                } else {
                    // No subcategories found, do nothing
                    console.log(`No subcategories for category ID ${categoryId}`);
                }
            } catch (error) {
                console.error("Error fetching subcategories:", error);
            }
        },
        toggleSubcategories(categoryId) {
            if (this.selectedCategoriesIds.includes(categoryId)) {
                this.fetchSubcategories(categoryId); // Fetch subcategories if the category is selected
            } else {
                // Deselect: clear the subcategories for this specific category
                const category = this.categories.find(cat => cat.id === categoryId);
                if (category) {
                    category.subcategories = [];
                }
            }
        },
        async fetchUserPreferences() {
            // Ensure the user is logged in (has userId)
            if (!this.userId) {
                console.error('User is not logged in');
                return;
            }

            try {
                // Reference to the user's preferences in Firebase
                const userRef = dbRef(db, `Users/${this.userId}/preferences`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    const preferences = snapshot.val();
                    this.selectedCategoriesIds = preferences.selectedCategories || [];
                    this.selectedSubcategoriesIds = preferences.selectedSubcategories || [];

                    // Toggle subcategories for each selected category
                    this.selectedCategoriesIds.forEach(categoryId => {
                        this.toggleSubcategories(categoryId);
                    });
                } else {
                    console.log("No preferences found for this user.");
                }
            } catch (error) {
                console.error("Error fetching user preferences:", error);
            }
        },
        async savePreferences() {
            // Confirm
            if (!confirm("¿Desea guardar estas opciones?")) {
                return;
            }

            // Ensure the user is logged in (has userId)
            if (!this.userId) {
                console.error('User is not logged in');
                return;
            }
            // Validate selected categories and affiliates
            if (this.selectedCategoriesIds.length === 0 || this.selectedSubcategoriesIds.length === 0) {
                showToast('Error: Debe seleccionar al menos una categoría', {
                    style: {
                        background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
                    },
                });

                return;
            }

            try {
                // Reference to the user's preferences in Firebase
                const userRef = dbRef(db, `Users/${this.userId}/preferences`);

                // Fetch existing preferences
                const snapshot = await get(userRef);
                let existingPreferences = {
                    selectedCategories: [],
                    selectedSubcategories: []
                };

                if (snapshot.exists()) {
                    existingPreferences = snapshot.val();
                }

                // Update the preferences with the selected categories and subcategories
                const updatedPreferences = {
                    selectedCategories: this.selectedCategoriesIds,
                    selectedSubcategories: this.selectedSubcategoriesIds
                };

                // Save the updated preferences back to Firebase
                await set(userRef, updatedPreferences);
                //Success toast
                showToast('Preferencias guardadas!');
                console.log('Preferences updated successfully!');
            } catch (error) {
                console.error('Error saving preferences:', error);
            }
        }
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;

        await this.fetchCategories();
        await this.fetchUserPreferences();
    }
}

</script>
<template>
    <div class="coupon-preferences container py-5">
        <div class="row justify-content-center">
            <div class="col-12 col-md-10 col-lg-8 col-xl-6">
                <div class="preferences-header mb-5">
                    <div class="d-flex align-items-center mb-4">
                        <div class="flex-shrink-0 me-3">
                            <span class="icon-wrapper bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center">
                                <i class="fa-solid fa-heart fs-4"></i>
                            </span>
                        </div>
                        <div>
                            <h3 class="text-light mb-2 fw-bold">Tus Preferencias de Cupones</h3>
                            <p class="text-muted mb-0">Personaliza tus intereses para recibir cupones relevantes</p>
                        </div>
                    </div>

                    <div class="alert alert-soft-info p-3 rounded-3 border-0 shadow-sm" role="alert">
                        <div class="d-flex align-items-center">
                            <i class="fa-solid fa-info-circle me-3 text-primary fs-4"></i>
                            <p class="text-light mb-0">
                                Selecciona las categorías que más te interesan para recibir cupones personalizados.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="preferences-card card border-0 shadow-lg rounded-4 overflow-hidden">
                    <div class="card-header bg-dark text-white py-4 text-center">
                        <h4 class="mb-0 fw-bold">
                            <i class="fa-solid fa-tags me-2"></i>
                            Categorías de Interés
                        </h4>
                    </div>

                    <div class="card-body p-0">
                        <div v-if="categories.length === 0" class="p-4 text-center">
                            <i class="fa-solid fa-box-open fs-1 mb-3 text-muted"></i>
                            <p class="text-muted">No hay categorías disponibles</p>
                        </div>

                        <div class="list-group list-group-flush">
                            <div 
                                v-for="category in categories" 
                                :key="category.id" 
                                class="list-group-item list-group-item-action px-4 py-3"
                            >
                                <div class="d-flex align-items-center">
                                    <div class="form-check flex-grow-1">
                                        <input 
                                            type="checkbox" 
                                            class="form-check-input category-checkbox" 
                                            :id="'category_' + category.id"
                                            :value="category.id" 
                                            @change="toggleSubcategories(category.id)"
                                            v-model="selectedCategoriesIds"
                                        >
                                        <label 
                                            class="form-check-label fw-bold text-light" 
                                            :for="'category_' + category.id"
                                        >
                                            {{ category.name }}
                                        </label>
                                    </div>
                                </div>

                                <div 
                                    v-if="category.subcategories && category.subcategories.length > 0" 
                                    class="subcategories-container mt-3 ps-4"
                                >
                                    <div 
                                        v-for="subcategory in category.subcategories" 
                                        :key="subcategory.id" 
                                        class="form-check mb-2"
                                    >
                                        <input 
                                            type="checkbox" 
                                            class="form-check-input subcategory-checkbox" 
                                            :id="'subcategory_' + subcategory.id" 
                                            :value="subcategory.id"
                                            v-model="selectedSubcategoriesIds"
                                        >
                                        <label 
                                            class="form-check-label text-light" 
                                            :for="'subcategory_' + subcategory.id"
                                        >
                                            {{ subcategory.name }}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer bg-light py-3 px-4">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="w-50 text-start">
                                <small class="text-dark">
                                    <i class="fa-solid fa-info-circle me-2"></i>
                                    {{ selectedCategoriesIds.length }} categorías seleccionadas
                                </small>
                            </div>
                            <div class="w-auto text-end">
                                <button 
                                    class="btn btn-theme btn-sm w-100" 
                                    @click="savePreferences()"
                                    :disabled="selectedCategoriesIds.length === 0">
                                    <i class="fa-solid fa-save me-2"></i>
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.btn-theme {
	background-color: purple;
	border-color: purple;
    border-radius: 20px;
}
.coupon-preferences {
    min-height: 100vh;
}

.icon-wrapper {
    width: 50px;
    height: 50px;
}

.preferences-card {
    transition: all 0.3s ease;
}

.category-checkbox:checked + label,
.subcategory-checkbox:checked + label {
    color: #ffffff !important;
    font-weight: 700;
}

.list-group-item:hover {
    background-color: rgba(0, 0, 0, 0.05);
}

.alert-soft-info {
    background-color: rgba(13, 110, 253, 0.1);
}

@media (max-width: 768px) {
    .coupon-preferences {
        padding: 1rem !important;
    }

    .preferences-header .icon-wrapper {
        width: 40px;
        height: 40px;
    }

    .preferences-header h2 {
        font-size: 1.5rem;
    }
}
</style>