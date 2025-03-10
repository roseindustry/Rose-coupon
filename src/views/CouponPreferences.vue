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
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Tus Preferencias
    </h2>

    <div class="container">

        <div class="container-fluid">
            <div class="row">
                <div class="col-12 justify-content-center text-center">
                    <div class="alert alert-info d-inline-flex align-items-center mt-2" role="alert"
                        style="width: 50%;">
                        <i class="fa-solid fa-info-circle me-2"></i>
                        <div>
                            Aca puedes indicarnos las categorias que te interesan para recibir cupones.
                        </div>
                    </div>
                </div>
            </div>

            <div class="row justify-content-center">
                <div class="col-lg-6">
                    <div class="card mt-5">
                        <div class="card-header text-center text-black">
                            <strong>Categorias</strong>
                        </div>
                        <div class="card-body">
                            <ul class="list-unstyled">
                                <li v-if="categories.length === 0">
                                    <p style="margin: 10px;">No hay categorias registradas.</p>
                                </li>
                                <li v-for="category in categories" :key="category.id">
                                    <div class="form-check" style="margin: 10px;">
                                        <input type="checkbox" class="form-check-input" :id="'check_' + category.id"
                                            :value="category.id" @change="toggleSubcategories(category.id)"
                                            v-model="selectedCategoriesIds">
                                        <label class="form-check-label" :for="'check_' + category.id">
                                            {{ category.name }}
                                        </label>
                                    </div>

                                    <div v-if="category.subcategories && category.subcategories.length > 0" class="col"
                                        style="margin-left: 20px;">
                                        <ul class="list-unstyled">
                                            <li v-for="subcategory in category.subcategories" :key="subcategory.id">
                                                <div class="form-check" style="margin: 10px;">
                                                    <input type="checkbox" class="form-check-input"
                                                        :id="'check_' + subcategory.id" :value="subcategory.id"
                                                        v-model="selectedSubcategoriesIds">
                                                    <label class="form-check-label" :for="'check_' + subcategory.id">
                                                        {{ subcategory.name }}
                                                    </label>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div class="card-footer text-end">
                            <button class="btn btn-outline-success" @click="savePreferences()">
                                <i class="fa fa-check"></i> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>
</template>