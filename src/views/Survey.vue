<script>
import 'survey-core/defaultV2.min.css';
import { Model } from 'survey-core';
import { BorderlessDarkPanelless } from "survey-core/themes/borderless-dark-panelless";
import { db } from '../firebase/init';
import { ref as dbRef, onValue, query, orderByChild, equalTo, push, set, get } from 'firebase/database';
import { useUserStore } from '@/stores/user-role';
// import { useTenancyStore } from '@/stores/tenancy';
// import { getSubdomain } from '@/utils/subdomain';
import { Collapse } from 'bootstrap';
import { showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'
import moment from 'moment';

export default {
    name: 'DropdownMenu',
    data() {
        return {
            // tenantId: null,
            menuItems: [],
            categories: [],
            categoriesWithItems: [],
            selectedMenuItem: null,
            survey: null,
            today: '',
            nextOrderNumber: null,
        };
    },
    computed: {
        currentPageName() {
            return this.$route.name;
        }
    },
    async mounted() {
        
        const now = moment();
        this.today = now.toISOString();

        const userStore = useUserStore();
        await userStore.fetchUser();

        // await this.initializeTenant();
        // this.initializeSurvey();
        this.fetchLastOrderNumber();
        this.fetchMenuItems();
        this.fetchMenuCategories();
    },
    methods: {
        // async initializeTenant() {
		// 	const tenancyStore = useTenancyStore();
		// 	this.subdomain = getSubdomain();
		// 	await tenancyStore.findOrCreateTenant(this.subdomain);
		// 	if (tenancyStore.tenant) {
		// 		this.tenantId = tenancyStore.tenant.key;
		// 	} else {
		// 		console.error("Tenant could not be found or created");
		// 	}
		// },
        async fetchMenuItems() {
            const itemsRef = query(dbRef(db, 'MenuItems'));
            onValue(itemsRef, (snapshot) => {
                const data = snapshot.val();
                this.menuItems = data ? Object.keys(data).map(key => ({
                    id: key,
                    ...data[key],
                })) : [];
            }, (error) => {
                console.error("Failed to fetch items:", error);
            }, {
                onlyOnce: true
            });
        },
        async fetchMenuCategories() {
            const categoryRef = query(dbRef(db, 'Categories'));
            const categorySnapshot = await get(categoryRef);

            if (categorySnapshot.exists()) {
                categorySnapshot.forEach((childSnapshot) => {
                    const categoryData = childSnapshot.val();
                    this.categories.push({
                        id: childSnapshot.key,
                        name: categoryData.name
                    });
                });
            } else {
                console.log("No data available");
            }
            this.structureMenuItemsByCategory();
        },
        structureMenuItemsByCategory() {
            const structured = this.categories.map(category => ({
                ...category,
                menuItems: this.menuItems.filter(item => item.category_id === category.id),
            }));
            this.categoriesWithItems = structured;
        },
        selectItem(itemName) {
            const selectedItem = this.menuItems.find(item => item.name === itemName);
            this.selectedMenuItem = selectedItem;
        },
        initializeSurvey() {
            const surveyJson = {
                title: "Encuesta de satisfaccion",
                name: "rating",
                completedHtml: "<h3>Gracias por su feedback.</h3>",
                elements: [
                    {
                        type: "rating",
                        name: "ratingValue",
                        title: "Tu Calificacion:"
                    },
                    {
                        type: "text",
                        name: "comment",
                        title: "Comentarios"
                    }
                ],
                showQuestionNumbers: "off",
            };

            this.survey = new Model(surveyJson);
            this.survey.applyTheme(BorderlessDarkPanelless);
            this.survey.onComplete.add(this.submitResults);
        },
        async fetchLastOrderNumber() {
			// if (!this.tenantId) return;

			const ordersRef = query(dbRef(db, 'Orders'));
			const snapshot = await get(ordersRef);
			let lastOrderNumber = 0;

			snapshot.forEach((childSnapshot) => {
				const order = childSnapshot.val();
				if ('orderNumber' in order) {
					lastOrderNumber = Math.max(lastOrderNumber, order.orderNumber);
				}
			});
			this.nextOrderNumber = lastOrderNumber + 1; 
		},
        async submitResults(sender) {
            const userStore = useUserStore(); // Access the user store for user_id
            const userId = userStore.userId;
            const results = sender.data;

            // Collect and prepare selected menu items
            const selectedMenuItems = this.menuItems
            .filter(item => item.selected)
            .map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: item.sellingPrice,
                totalPricePerItem: item.sellingPrice * item.quantity
            }));

            // Ensure there's at least one selected item
            if (selectedMenuItems.length === 0) {
                alert("Por favor seleccione al menos un Producto.");
                return;
            }

            // Calculate totalPricePaid
            const totalPricePaid = selectedMenuItems.reduce((acc, item) => acc + item.totalPricePerItem, 0);

            // Prepare the data for submission

            // RatingsData
            const ratingsSubmission = {
                ratingValue: results.ratingValue,
                comment: results.comment,
                date: this.today,
                user_id: userId,
                // tenant_id: this.tenantId,
            };

            // OrderData
            const OrderSubmission = {
				// tenant_id: this.tenantId,
				client_id: userId,
				orderDate: this.today,
				orderNumber: this.nextOrderNumber,
				tableNumber: 0,
				status: 'Completed',
				type: 'DineIn',
				menuItems: selectedMenuItems,
				totalPricePaid,
				tip: 0
			};

            // Submit the order to Firebase
			const newOrderRef = push(dbRef(db, 'Orders'));
            const newOrderId = newOrderRef.key;
			await set(newOrderRef, {
				id: newOrderId,
				...OrderSubmission
			});

            // Submit rating's data to Firebase
            const newRatingRef = push(dbRef(db, 'Ratings'));
            await set(newRatingRef, {
                id: newRatingRef.key,
                order_id: newOrderId,
                ...ratingsSubmission
            })
                .then(() => {
                    console.log('Data submitted successfully');
                    //Toast to show Success form Submission
                    showToast("Gracias por tu feedback!");

                    // Reset selections and UI states
                    this.resetMenuSelections();
                    this.collapseAllAccordions();
                    this.fetchLastOrderNumber();
                    // this.initializeSurvey();
                })
                .catch((error) => console.error('Error submitting data:', error));
        },
        resetMenuSelections() {
            this.menuItems = this.menuItems.map(item => ({
                ...item,
                selected: false,
                quantity: 0,
            }));
        },
        collapseAllAccordions() {
            const accordionItems = document.querySelectorAll('.accordion-collapse');
            accordionItems.forEach((item) => {
                new Collapse(item, { toggle: false }).hide();
            });
        },
    }
}
</script>

<template>
    <div class="container py-5 h-100">
        <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><router-link to="/page/client-portal">Portal de clientes</router-link></li>
                <li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
            </ol>
        </nav>
        <div class="row justify-content-center align-items-center h-100">
            <div class="col">
                <!-- PRODUCT DROPDOWN CARD -->
                <div class="card shadow-lg">
                    <div class="card-body">
                        <h5 class="card-title text-center" style="margin-bottom: 20px;">Seleccione los productos</h5>
                        <div id="menuCategoriesAccordion" class="accordion accordion-flush">
                            <div class="accordion-item" v-for="(category, cIndex) in categories" :key="category.id">
                                <h2 class="accordion-header" :id="`heading${category.id}`">
                                    <button class="accordion-button" type="button" data-bs-toggle="collapse"
                                        :data-bs-target="`#collapse${category.id}`" aria-expanded="true"
                                        :aria-controls="`collapse${category.id}`">
                                        {{ category.name }}
                                    </button>
                                </h2>
                                <div :id="`collapse${category.id}`" class="accordion-collapse collapse"
                                    :class="{ 'show': cIndex === 0 }" aria-labelledby="`heading${category.id}`">
                                    <div class="accordion-body">
                                        <div class="row">
                                            <div class="col-md-6"
                                                v-for="item in menuItems.filter(item => item.category_id === category.id)"
                                                :key="item.id">
                                                <div class="card mb-4">
                                                    <div class="card-body">
                                                        <div class="form-check">
                                                            <input class="form-check-input" type="checkbox"
                                                                :id="`check-${item.id}`" :value="item.id"
                                                                v-model="item.selected">
                                                            <label class="form-check-label" :for="`check-${item.id}`">
                                                                <b>{{ item.name }}</b>
                                                            </label>
                                                            <input v-if="item.selected" type="number"
                                                                class="form-control ms-2" placeholder="Cantidad"
                                                                v-model="item.quantity" min="1" style="width: 100px;">
                                                        </div>
                                                        <img :src="item.image || '/assets/img/Image_not_available.png'"
                                                            class="card-img-top" :alt="item.name"
                                                            style="height: 180px; object-fit: cover;">
                                                        <p class="card-text">{{ item.description }}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- SURVEY CARD -->
                <div class="container py-5 h-100">
                    <div class="row justify-content-center align-items-center h-100">
                        <div class="col">
                            <div class="card shadow-lg">
                                <div class="card-body">
                                    <SurveyComponent v-if="survey" :model="survey" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>