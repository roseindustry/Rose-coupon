<script>
import { ref, computed } from 'vue';
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import { db } from '@/firebase/init';
import { ref as dbRef, get, child, query, orderByChild, equalTo } from 'firebase/database';
import datepicker from 'vue3-datepicker';
import { Modal } from 'bootstrap';
import 'vue-datepicker-next/index.css';
import * as XLSX from 'xlsx';

export default {
    components: {
        datepicker: datepicker
    },
    data() {
        return {
            users: [],
            ratings: [],
            selectedRatingMenuItems: [],
            searchQuery: null,
            picked: new Date(),
            today: '',
            // For filtering based on dates
            filterByDate: false,
            startDate: null,
            endDate: null,
            sortOrder: 'desc',
        };
    },
    computed: {
        filteredRatings() {
            if (!this.filterByDate || !this.startDate || !this.endDate) return this.ratings;

            const start = this.startDate;
            const end = new Date(this.endDate);
            end.setHours(23, 59, 59, 999);

            let filtered = this.ratings.filter(rating => {
                const ratingDateParts = rating.date.split('/');
                const ratingDate = new Date(ratingDateParts[2], ratingDateParts[1] - 1, ratingDateParts[0]);
                return ratingDate >= start && ratingDate <= end;
            });

            // Sorting logic
            filtered.sort((a, b) => {
                return this.sortOrder === 'desc' ? b.totalPaid - a.totalPaid : a.totalPaid - b.totalPaid;
            });

            return filtered;
        },
        totalInvoice() {
            return this.selectedRatingMenuItems.reduce((total, item) => total + item.quantity * item.price, 0).toFixed(2);
        },
    },
    methods: {
        async fetchRatingsAndUserDetails() {
            const ratingsRef = dbRef(db, 'Ratings');
            const ratingsSnapshot = await get(ratingsRef);

            if (ratingsSnapshot.exists()) {
                const ratingsData = ratingsSnapshot.val();

                const ratingsPromises = Object.keys(ratingsData).map(async (ratingId) => {
                    const rating = ratingsData[ratingId];

                    // Fetch related user details
                    const userSnapshot = await get(dbRef(db, `Users/${rating.user_id}`));
                    let userName = 'Unknown';
                    let cedula = '';
                    if (userSnapshot.exists()) {
                        const user = userSnapshot.val();
                        userName = `${user.firstName} ${user.lastName}`; // Assuming these fields exist
                        cedula = user.identification;
                    }

                    let totalPaid = 0;

                    // Fetch MenuItem details
                    const menuItemsDetails = await Promise.all(rating.order.map(async (orderItem) => {
                        totalPaid += orderItem.price * orderItem.quantity;
                        const menuItemSnapshot = await get(dbRef(db, `MenuItems/${orderItem.MenuItem_id}`));
                        if (menuItemSnapshot.exists()) {
                            return {
                                ...menuItemSnapshot.val(),
                                quantity: orderItem.quantity,
                                price: orderItem.price
                            };
                        }
                        return null;
                    }));

                    const filteredMenuItems = menuItemsDetails.filter(item => item !== null);

                    return {
                        ...rating,
                        id: ratingId,
                        menuItems: filteredMenuItems,
                        userName,
                        cedula,
                        totalPaid,
                    };
                });

                this.ratings = await Promise.all(ratingsPromises);
            }
        },
        clearDateFilter() {
            this.startDate = null;
            this.endDate = null;
        },
        openOrderModal(rating) {
            this.selectedRatingMenuItems = rating.menuItems;
            new Modal(document.getElementById('orderModal')).show();
        },
        toggleSortOrder() {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        }
    },
    async mounted() {
        const tenancyStore = useTenancyStore();
        this.subdomain = getSubdomain();

        // Automatically find or create tenant upon component mount
        await tenancyStore.findOrCreateTenant(this.subdomain);

        if (tenancyStore.tenant) {
            this.tenantName = tenancyStore.tenant.name;
        } else {
            console.error("Tenant could not be found or created");
        }

        await this.fetchRatingsAndUserDetails();
    }
};
</script>
<template>
    <div class="container py-5">
        <h2 class="mb-5 text-center">Apartado de consumo por Clientes</h2>
        <div class="shadow-lg p-3 mb-5 bg-body rounded">
            <div class="search-box mb-3">
                <input v-model="searchQuery" placeholder="Buscar cliente por cedula..." class="form-control">
                <button class="btn btn-outline-secondary" type="button">
                    <i class="fa-solid fa-search"></i>
                </button>
                <button class="btn btn-outline-secondary">Limpiar filtro</button>
            </div>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="flexSwitchCheckDefault" v-model="filterByDate">
                <label class="form-check-label" for="flexSwitchCheckDefault">Filtrar por fecha</label>
            </div>
            <div v-if="filterByDate" style="margin-bottom: 20px;">
                <div class="row g-3 align-items-center justify-content-center">
                    <!-- Start Date Picker Column -->
                    <div class="col-4">
                        <div class="datepicker-wrapper">
                            <div class="datepicker-icon">
                                <i class="fa fa-fw fa-calendar"></i>
                            </div>
                            <datepicker id="datepicker1" class="form-control custom-datepicker" v-model="startDate"
                                aria-describedby="datepicker1-addon1"></datepicker>
                        </div>
                    </div>
                    <!-- End Date Picker Column -->
                    <div class="col-4">
                        <div class="datepicker-wrapper">
                            <div class="datepicker-icon">
                                <i class="fa fa-fw fa-calendar"></i>
                            </div>
                            <datepicker id="datepicker2" class="form-control custom-datepicker" v-model="endDate"
                                aria-describedby="datepicker2-addon2"></datepicker>
                        </div>
                    </div>
                    <!-- Clear Filter Button Column -->
                    <div class="col-4">
                        <button type="button" class="btn btn-warning btn-block" @click="clearDateFilter">Limpiar
                            filtro</button>
                    </div>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-bordered table-hover shadow-sm text-center">
                    <thead class="table-dark">
                        <tr>
                            <th>Fecha de Visita</th>
                            <th>Puntuacion</th>
                            <th>Comentarios</th>
                            <th>Cliente</th>
                            <th>Cedula</th>
                            <th>Total gastado en el negocio <a href="#" class="btn" data-toggle="tooltip"
                                    data-placement="top" title="Ordenar" @click="toggleSortOrder"><i
                                        class="fa-solid fa-sort"></i></a></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="rating in filteredRatings" :key="rating.id">
                            <td>{{ rating.date }}</td>
                            <td><i class="fa fa-star" v-for="n in parseInt(rating.ratingValue)" :key="n"
                                    aria-hidden="true"></i><a href="#" @click="openOrderModal(rating)"><i
                                        class="fa-solid fa-magnifying-glass" style="margin-left: 5px;"></i></a></td>
                            <td>{{ rating.comment }}</td>
                            <td>{{ rating.userName }}</td>
                            <td>{{ rating.cedula }}</td>
                            <td>${{ rating.totalPaid }}</td>
                        </tr>
                    </tbody>
                </table>
                <button type="button" class="btn btn-primary">Descargar reporte</button>
            </div>
        </div>

        <!-- Order Modal -->
        <div class="modal fade" id="orderModal" tabindex="-1" aria-labelledby="orderModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="orderModalLabel">Orden Completa</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Cantidad</th>
                                    <th>Precio por unidad</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="menuItem in selectedRatingMenuItems" :key="menuItem.id">
                                    <td>{{ menuItem.name }}</td>
                                    <td>{{ menuItem.quantity }}</td>
                                    <td>{{ menuItem.price.toFixed(2) }}</td>
                                    <td>{{ (menuItem.quantity * menuItem.price).toFixed(2) }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th colspan="3">Total pagado en factura</th>
                                    <th>{{ totalInvoice }}</th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
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

.input-group-text {
    background-color: #5145f4;
}

.datepicker {
    cursor: pointer;
}

.datepicker-wrapper {
    display: flex;
    align-items: center;
}

.datepicker-icon {
    font-size: 0.8rem;
    margin-right: 8px;
}

.custom-datepicker {
    flex-grow: 1;
}

.custom-datepicker {
    height: calc(1.5em + 0.75rem + 2px);
}

.input-group-text {
    background-color: transparent;
    border: none;
}

.form-switch {
    margin-bottom: 10px;
}
</style>