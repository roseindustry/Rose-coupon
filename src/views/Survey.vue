<script>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import 'survey-core/defaultV2.min.css';
import { Model } from 'survey-core';
import { BorderlessDarkPanelless } from "survey-core/themes/borderless-dark-panelless";
import { db } from '../firebase/init';
import { ref as dbRef, onValue, off, push, set } from 'firebase/database';
import { useUserStore } from '@/stores/user-role';
import { useTenancyStore } from '@/stores/tenancy';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import moment from 'moment';

export default {
    name: 'DropdownMenu',
    data() {
        return {
            menuItems: [],
            selectedMenuItem: null,
            survey: null,
            today: '',
        };
    },
    computed: {
        currentPageName() {
            return this.$route.name;
        }
    },
    methods: {
        async fetchMenuItems() {
            const itemsRef = dbRef(db, 'MenuItems');
            onValue(itemsRef, (snapshot) => {
                const data = snapshot.val();
                this.menuItems = data ? Object.keys(data).map(key => ({
                    id: key,
                    ...data[key],
                    selected: false,
                    quantity: 0,
                })) : [];
            }, (error) => {
                console.error("Failed to fetch items:", error);
            }, {
                onlyOnce: true
            });
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
        async submitResults(sender) {
            const userStore = useUserStore(); // Access the user store for user_id
            const tenancyStore = useTenancyStore(); // Access the tenancy store for tenant_id

            // Ensure tenant data is ready, especially useful if tenant_id is critical for the submission
            await tenancyStore.findOrCreateTenant();

            const userId = userStore.userId;
            const tenantId = tenancyStore.tenant.key;
            const results = sender.data;

            // Collect selected menu items and their quantities
            const selectedMenuItems = this.menuItems.filter(item => item.selected).map(item => ({
                MenuItem_id: item.id,
                quantity: item.quantity,
                price: item.sellingPrice
            }));

            // Ensure there's at least one selected item
            if (selectedMenuItems.length === 0) {
                alert("Por favor seleccione al menos un Producto.");
                return;
            }

            // Prepare the data for submission
            const submission = {
                ratingValue: results.ratingValue,
                comment: results.comment,
                date: this.today,
                user_id: userId,
                tenant_id: tenantId,
                // Include the array of selected items and their quantities
                order: selectedMenuItems,
            };

            // Submit the data to Firebase
            const newRatingRef = push(dbRef(db, 'Ratings'));
            set(newRatingRef, {
                id: newRatingRef.key,
                ...submission
            })
                .then(() => {
                    console.log('Data submitted successfully');
                    //Toast to show Success form Submission
                    Toastify({
                        text: "Gracias por tu feedback!",
                        duration: 3000,
                        close: true,
                        gravity: "top",
                        position: "right",
                        stopOnFocus: true,
                        style: {
                            background: "linear-gradient(to right, #00b09b, #96c93d)",
                        },
                    }).showToast();

                    this.resetMenuSelections();
                    this.initializeSurvey();

                    // Reset the selectedMenuItem after successful submission
                    // this.selectedMenuItem = null;
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
    },
    created() {
        this.fetchMenuItems();
    },
    mounted() {
        const userStore = useUserStore();
        const tenancyStore = useTenancyStore();
        const now = moment();
        this.today = now.format('DD/MM/YYYY');

        (async () => {
            await userStore.fetchUser();
            await tenancyStore.findOrCreateTenant();
        })();

        this.initializeSurvey();
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
                        <h5 class="card-title">Seleccione los productos</h5>
                        <div v-for="item in menuItems" :key="item.id" class="form-check">
                            <input class="form-check-input" type="checkbox" :id="`check-${item.id}`"
                                v-model="item.selected">
                            <label class="form-check-label" :for="`check-${item.id}`">
                                {{ item.name }}
                            </label>
                            <input v-if="item.selected" type="number" class="form-control ms-2"
                                placeholder="Cantidad" v-model="item.quantity" min="1" style="width: 100px;">
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