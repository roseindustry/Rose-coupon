<script>
import { useTenancyStore } from '@/stores/tenancy';
import { getSubdomain } from '@/utils/subdomain';
import { db } from '@/firebase/init';
import { ref as dbRef, get, query, orderByChild, equalTo } from 'firebase/database';
import { Modal } from 'bootstrap';
import datepicker from 'vue3-datepicker';
import 'vue-datepicker-next/index.css';
import * as XLSX from 'xlsx';

export default {
    components: {
        datepicker: datepicker,
    },
    data() {
        return {
            users: [],
            ratings: [],
            selectedRatingMenuItems: [],
            searchQuery: null,
            picked: new Date(),
            today: '',
            filterByDate: false,
            startDate: null,
            endDate: null,
            sortOrder: 'desc',
            currentPage: 1,
            pageSize: 10
        };
    },
    watch: {
        currentPage(newVal, oldVal) {
            if (newVal < 1) {
                this.currentPage = 1;
            } else if (newVal > this.totalPages) {
                this.currentPage = this.totalPages;
            }
        }
    },
    computed: {
        paginatedRatings() {
            let start = (this.currentPage - 1) * this.pageSize;
            let end = start + this.pageSize;
            return this.filteredRatings.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.filteredRatings.length / this.pageSize);
        },
        filteredRatings() {
            let filtered = this.ratings;

            const searchQueryString = this.searchQuery?.toString().trim();
            if (searchQueryString) {
                filtered = filtered.filter(rating =>
                    rating.cedula.toString().includes(searchQueryString)
                );
            }

            // Filter by date if enabled and valid dates are selected
            if (this.filterByDate && this.startDate && this.endDate) {
                const start = new Date(this.startDate);
                const end = new Date(this.endDate);
                end.setHours(23, 59, 59, 999);

                filtered = filtered.filter(rating => {
                    const ratingDateParts = rating.date.split('/');
                    const ratingDate = new Date(ratingDateParts[2], ratingDateParts[1] - 1, ratingDateParts[0]);
                    return ratingDate >= start && ratingDate <= end;
                });
            }

            // Sorting logic
            filtered.sort((a, b) => {
                if (this.sortOrder === 'desc') {
                    return b.totalPaid - a.totalPaid;
                } else {
                    return a.totalPaid - b.totalPaid;
                }
            });

            return filtered;
        },
        totalPaidOnStore() {
            return this.filteredRatings.reduce((acc, rating) => {
                // Convert rating.totalPaid to a number and use 0 if it's NaN
                const totalPaid = Number(rating.totalPaid) || 0;
                return acc + totalPaid;
            }, 0).toFixed(2);
        },
        totalInvoice() {
            return this.selectedRatingMenuItems.reduce((total, item) => total + item.quantity * item.price, 0).toFixed(2);
        },
    },
    methods: {
        async fetchRatingsAndUserDetails() {
            const tenancyStore = useTenancyStore();
            const tenantId = tenancyStore.tenant.key;

            const ratingsRef = query(dbRef(db, 'Ratings'), orderByChild('tenant_id'), equalTo(tenantId));
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
                        userName = `${user.firstName} ${user.lastName}`;
                        cedula = user.identification;
                    }

                    let totalPaid = 0;
                    let menuItemsWithDetails = [];

                    if (rating.order_id) {
                        const orderSnapshot = await get(dbRef(db, `Orders/${rating.order_id}`));
                        if (orderSnapshot.exists()) {
                            const order = orderSnapshot.val();
                            totalPaid = order.totalPricePaid || 0;

                            // Fetch the menuItem's details
                            const menuItemDetailsPromises = order.menuItems.map(async (menuItem) => {
                                const menuItemRef = dbRef(db, `MenuItems/${menuItem.id}`);
                                const snapshot = await get(menuItemRef);
                                if (snapshot.exists()) {
                                    const menuItemDetails = snapshot.val();
                                    return {
                                        ...menuItem, // id, price, quantity from the order
                                        name: menuItemDetails.name,
                                        image: menuItemDetails.image,
                                    };
                                }
                                return menuItem; // Return original menuItem if details not found
                            });

                            menuItemsWithDetails = await Promise.all(menuItemDetailsPromises);
                        }
                    }

                    return {
                        ...rating,
                        id: ratingId,
                        orderItems: menuItemsWithDetails,
                        userName,
                        cedula,
                        totalPaid,
                    };
                });

                this.ratings = await Promise.all(ratingsPromises);
            }
        },

        formatTotalPaid(value) {
            return isNaN(value) || value === undefined ? 0 : value;
        },
        clearDateFilter() {
            this.startDate = null;
            this.endDate = null;
        },
        openOrderModal(rating) {
            this.selectedRatingMenuItems = rating.orderItems;
            new Modal(document.getElementById('orderModal')).show();
        },
        toggleSortOrder() {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        },
        exportToExcel() {
            let worksheet_data = this.filteredRatings.map(rating => ({
                'Fecha de Visita': rating.date,
                'Puntuacion': rating.ratingValue,
                'Comentarios': rating.comment,
                'Cliente': rating.userName,
                'Cedula': rating.cedula,
                'Total gastado en el negocio': rating.totalPaid,
            }));

            // Adding the footer
            worksheet_data.push({
                'Fecha de Visita': 'Total pagado en tienda',
                'Puntuacion': null,
                'Comentarios': null,
                'Cliente': null,
                'Cedula': null,
                'Total gastado en el negocio': this.totalPaidOnStore,
            });

            // Convert the data to a worksheet
            const worksheet = XLSX.utils.json_to_sheet(worksheet_data, { skipHeader: true });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

            // Export the workbook
            XLSX.writeFile(workbook, 'report.xlsx');
        },

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
    <div class="mb-md-4 mb-3 d-md-flex">
        <div class="mt-md-0 mt-2"><a href="#" class="text-body text-decoration-none" @click="exportToExcel">
                <i class="fa fa-download fa-fw me-1 text-muted"></i> Exportar</a>
        </div>
    </div>
    <div class="shadow-lg p-3 mb-5 bg-body rounded">
        <div class="search-box mb-3">
            <input v-model="searchQuery" placeholder="Buscar cliente por cedula..." class="form-control">
        </div>
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="flexSwitchCheckDefault" v-model="filterByDate">
            <label class="form-check-label" for="flexSwitchCheckDefault">Filtrar por fecha</label>
        </div>
        <div v-if="filterByDate" style="margin-bottom: 20px;">
            <div class="row g-3 align-items-center">
                <!-- Start Date Picker Column -->
                <div class="col-4 d-flex justify-content-center">
                    <div class="datepicker-wrapper">
                        <div class="datepicker-icon">
                            <i class="fa fa-fw fa-calendar"></i>
                        </div>
                        <datepicker id="datepicker1" class="form-control custom-datepicker" v-model="startDate"
                            aria-describedby="datepicker1-addon1"></datepicker>
                    </div>
                </div>
                <!-- End Date Picker Column -->
                <div class="col-4 d-flex justify-content-center">
                    <div class="datepicker-wrapper">
                        <div class="datepicker-icon">
                            <i class="fa fa-fw fa-calendar"></i>
                        </div>
                        <datepicker id="datepicker2" class="form-control custom-datepicker" v-model="endDate"
                            aria-describedby="datepicker2-addon2"></datepicker>
                    </div>
                </div>
                <!-- Clear Filter Button Column -->
                <div class="col-4 d-flex justify-content-center">
                    <button type="button" class="btn btn-theme btn-block" @click="clearDateFilter">Limpiar
                        filtro</button>
                </div>
            </div>
        </div>
        <div class="table-responsive">
            <table class="table table-hover text-nowrap">
                <thead class="table-dark">
                    <tr>
                        <th>Fecha de Visita</th>
                        <th>Puntuacion</th>
                        <th>Comentarios</th>
                        <th>Cliente</th>
                        <th>Cedula</th>
                        <th>Total pagado <a href="#" class="btn" data-toggle="tooltip" data-placement="top"
                                title="Ordenar" @click.prevent="toggleSortOrder"><i class="fa-solid fa-sort"></i></a>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="rating in paginatedRatings" :key="rating.id">
                        <td>{{ rating.date }}</td>
                        <td><i class="fa fa-star" v-for="n in parseInt(rating.ratingValue)" :key="n"
                                aria-hidden="true"></i><a href="#" @click.prevent="openOrderModal(rating)"><i
                                    class="fa-solid fa-magnifying-glass" style="margin-left: 5px;"></i></a></td>
                        <td>{{ rating.comment }}</td>
                        <td>{{ rating.userName }}</td>
                        <td>{{ rating.cedula }}</td>
                        <td>${{ formatTotalPaid(rating.totalPaid).toFixed(2) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="5">Total</th>
                        <th>${{ totalPaidOnStore }}</th>
                    </tr>
                </tfoot>
            </table>
            <nav aria-label="Page navigation">
                <ul class="pagination">
                    <li class="page-item" :class="{ disabled: currentPage === 1 }">
                        <a class="page-link" href="#" @click.prevent="currentPage--" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                    <!-- Dynamic page links could go here -->
                    <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                        <a class="page-link" href="#" @click.prevent="currentPage++" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
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