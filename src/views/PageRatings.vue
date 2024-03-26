<script>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user-role';
import { ref as dbRef, query, orderByChild, equalTo, get } from 'firebase/database';
import { db } from '@/firebase/init';

export default {
    data() {
        return {
            ratings: [],
        };
    },
    computed: {
        currentPageName() {
            return this.$route.name;
        }
    },
    created() {
        this.fetchRatingsAndMenuItems();
    },
    methods: {
        async fetchRatingsAndMenuItems() {
            const userStore = useUserStore();
            const userId = userStore.userId;

            const ratingsRef = query(dbRef(db, 'Ratings'), orderByChild('user_id'), equalTo(userId));
            const ratingsSnapshot = await get(ratingsRef);

            if (ratingsSnapshot.exists()) {
                const ratingsData = ratingsSnapshot.val();

                for (const ratingId in ratingsData) {
                    const rating = ratingsData[ratingId];

                    let menuItemsDetails = [];

                    // Check if the rating has an order array directly
                    if (rating.order && Array.isArray(rating.order)) {
                        menuItemsDetails = await this.fetchMenuItemsDetails(rating.order);
                    }
                    // If the rating references an order_id, fetch the order and then the menu item details
                    else if (rating.order_id) {
                        const orderRef = dbRef(db, `Orders/${rating.order_id}`);
                        const orderSnapshot = await get(orderRef);
                        if (orderSnapshot.exists()) {
                            const orderData = orderSnapshot.val();
                            // Assuming orderData.menuItems is the array of menu item details
                            menuItemsDetails = await this.fetchMenuItemsDetails(orderData.menuItems);
                        }
                    }

                    const filteredMenuItems = menuItemsDetails.filter(item => item !== null);

                    // Push the assembled data into your ratings array
                    this.ratings.push({
                        id: ratingId,
                        menuItems: filteredMenuItems,
                        comment: rating.comment,
                        ratingValue: rating.ratingValue,
                        date: rating.date,
                        // Add more rating details if needed
                    });
                }
            }
        },
        async fetchMenuItemsDetails(menuItems) {
            return await Promise.all(menuItems.map(async (orderItem) => {
                const menuItemSnapshot = await get(dbRef(db, `MenuItems/${orderItem.id}`));
                if (menuItemSnapshot.exists()) {
                    return {
                        ...menuItemSnapshot.val(),
                        quantity: orderItem.quantity
                    };
                }
                return null;
            }));
        }
    },
};
</script>
<template>
    <div class="container py-5 h-100">
        <nav style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><router-link to="/page/client-portal">Portal de clientes</router-link></li>
                <li class="breadcrumb-item active" aria-current="page">{{ currentPageName }}</li>
            </ol>
        </nav>
        <div class="row">
            <div class="col-12 col-md-6" v-if="ratings.length > 0" v-for="rating in ratings" :key="rating.id">
                <div class="card shadow-lg mb-4">
                    <div class="card-body">
                        <div class="row row-cols-1 row-cols-md-3 g-4">
                            <div v-for="menuItem in rating.menuItems" :key="menuItem.id" class="col">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <img :src="menuItem.image" class="img-thumbnail" alt="..."
                                            style="max-width: 100px; max-height: 100px; object-fit: cover;">
                                        <h5 class="card-title">{{ menuItem.name }}</h5>
                                        <p class="card-text">{{ menuItem.description }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <span><b>Comentarios:</b> {{ rating.comment }}</span>
                        </div>
                        <div style="margin-top: 15px;"><b>Puntuacion: </b>
                            <i class="fa fa-star" v-for="n in parseInt(rating.ratingValue)" :key="n"
                                aria-hidden="true"></i>
                        </div>
                    </div>
                    <figcaption class="figure-caption text-end">{{ rating.date }}</figcaption>
                </div>
            </div>
            <div class="col-12 col-md-6" v-else>
                <div class="card shadow-lg mb-4">No hay Reseñas hasta ahora.</div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.fa-star {
    color: gold;
}

.fa-star-o {
    color: grey;
}
</style>