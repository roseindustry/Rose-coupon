<script>
import { useUserStore } from '@/stores/user-role';
// import { useTenancyStore } from '@/stores/tenancy';
// import { getSubdomain } from '@/utils/subdomain';
import { db } from '@/firebase/init';
import { ref as dbRef, get, query, orderByChild, equalTo } from 'firebase/database';
import { Modal } from 'bootstrap';
import datepicker from 'vue3-datepicker';
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
            // displayedUsers: [],
            searchQuery: null,
            currentUser: null,
            picked: new Date(),
            today: '',
            filterByDate: false,
            startDate: null,
            endDate: null,
        };
    },
    computed: {
        filteredUsers() {
            const trimmedSearchQuery = this.searchQuery?.trim().toString().toLowerCase();
            if (!trimmedSearchQuery) {
                return this.users;
            }
            return this.users.filter(user =>
                // Assuming 'identification' is a string; adjust if it's not
                user.identification.toString().toLowerCase().includes(trimmedSearchQuery)
            );
        },
        filteredRatings() {
            if (!this.filterByDate || !this.startDate || !this.endDate) return this.ratings;

            const start = this.startDate;
            const end = new Date(this.endDate);
            end.setHours(23, 59, 59, 999);

            return this.ratings.filter(rating => {
                const ratingDateParts = rating.date.split('/'); // DD/MM/YYYY
                const ratingDate = new Date(ratingDateParts[2], ratingDateParts[1] - 1, ratingDateParts[0]);
                return ratingDate >= start && ratingDate <= end;
            });
        },
        totalPaidOnStore() {
            return this.filteredRatings.reduce((acc, rating) => acc + rating.totalPaid, 0).toFixed(2);
        },
        totalInvoice() {
            return this.selectedRatingMenuItems.reduce((total, item) => total + item.quantity * item.price, 0).toFixed(2);
        },
    },
    methods: {
        async fetchUsers() {
            const userStore = useUserStore();
            let allUsers = await userStore.searchUsers(this.searchQuery);

            // Filter users to include only those with the role 'cliente'
            this.users = allUsers.filter(user => user.role === 'cliente');

        },
        clearDateFilter() {
            this.startDate = null;
            this.endDate = null;
        },
        async openModal(user) {
            this.currentUser = user;
            this.ratings = [];
            await this.fetchRatingsAndMenuItems(user);
            new Modal(document.getElementById('infoModal')).show();
        },
        async fetchRatingsAndMenuItems(user) {
            const userId = user.uid;

            const ratingsRef = query(dbRef(db, 'Ratings'), orderByChild('user_id'), equalTo(userId));
            const ratingsSnapshot = await get(ratingsRef);

            if (ratingsSnapshot.exists()) {
                const ratingsData = ratingsSnapshot.val();
                for (const ratingId in ratingsData) {
                    const rating = ratingsData[ratingId];

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

                    this.ratings.push({
                        id: ratingId,
                        menuItems: filteredMenuItems,
                        comment: rating.comment,
                        ratingValue: rating.ratingValue,
                        date: rating.date,
                        totalPaid: totalPaid
                    });
                }
            }
        },
        openOrderModal(rating) {
            this.selectedRatingMenuItems = rating.menuItems;
            new Modal(document.getElementById('orderModal')).show();
        },
        exportUsers() {
            const ws = XLSX.utils.json_to_sheet(this.users);

            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_col(C) + "1";
                if (!ws[address]) continue;
                ws[address].s = {
                    font: {
                        name: "Arial",
                        sz: 14,
                        bold: true,
                        color: { rgb: "FFFFFF" }
                    },
                    fill: {
                        fgColor: { rgb: "0000FF" }
                    },
                    alignment: {
                        horizontal: "center",
                        vertical: "center"
                    }
                };
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Users");
            XLSX.writeFile(wb, "users.xlsx");
        },
    },
    async mounted() {
        // const tenancyStore = useTenancyStore();
        // this.subdomain = getSubdomain();

        // // Automatically find or create tenant upon component mount
        // await tenancyStore.findOrCreateTenant(this.subdomain);

        // if (tenancyStore.tenant) {
        //     this.tenantName = tenancyStore.tenant.name;
        // } else {
        //     console.error("Tenant could not be found or created");
        // }

        await this.fetchUsers();
        this.displayedUsers = this.users;
    }
};
</script>
<template>
    <div class="container">

        <h2 class="mb-5 text-center">Apartado de consumo por Cliente</h2>

        <div class="shadow-lg p-3 mb-5 bg-body rounded">
            <div class="search-box mb-3">
                <input v-model="searchQuery" placeholder="Filtrar cliente por cedula..." class="form-control">
            </div>
            <div class="table-responsive">
                <table class="table table-bordered table-hover shadow-sm">
                    <thead class="table-dark">
                        <tr>
                            <th>Nombre</th>
                            <th>Cedula</th>
                            <th class="actions-column">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="user in filteredUsers" :key="user.uid">
                            <td>{{ user.firstName + " " + user.lastName }}</td>
                            <td>{{ user.identification }}</td>
                            <td class="actions-column text-center">
                                <button @click="openModal(user)" class="btn btn-primary text-white">Ver mas</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- User InfoModal -->
        <div class="modal fade" id="infoModal" tabindex="-1" aria-labelledby="infoModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="infoModalLabel">Informacion del Cliente</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="flexSwitchCheckDefault"
                            v-model="filterByDate">
                        <label class="form-check-label" for="flexSwitchCheckDefault">Filtrar por fecha</label>
                    </div>
                    <div class="modal-body">
                        <div v-if="filterByDate">
                            <div class="row g-3 align-items-center">
                                <!-- Start Date Picker Column -->
                                <div class="col-4 d-flex justify-content-center">
                                    <div class="datepicker-wrapper">
                                        <div class="datepicker-icon">
                                            <i class="fa fa-fw fa-calendar"></i>
                                        </div>
                                        <datepicker id="datepicker1" class="form-control custom-datepicker"
                                            v-model="startDate" aria-describedby="datepicker1-addon1"></datepicker>
                                    </div>
                                </div>
                                <!-- End Date Picker Column -->
                                <div class="col-4 d-flex justify-content-center">
                                    <div class="datepicker-wrapper">
                                        <div class="datepicker-icon">
                                            <i class="fa fa-fw fa-calendar"></i>
                                        </div>
                                        <datepicker id="datepicker2" class="form-control custom-datepicker"
                                            v-model="endDate" aria-describedby="datepicker2-addon2"></datepicker>
                                    </div>
                                </div>
                                <!-- Clear Filter Button Column -->
                                <div class="col-4 d-flex justify-content-center">
                                    <button type="button" class="btn btn-warning btn-block"
                                        @click="clearDateFilter">Limpiar filtro</button>
                                </div>
                            </div>
                        </div>
                        <div class="table-responsive mt-4">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Fecha de visita</th>
                                        <th>Orden</th>
                                        <th>Puntuacion</th>
                                        <th>Comentarios</th>
                                        <th>Total pagado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="rating in filteredRatings" :key="rating.id">
                                        <td>{{ rating.date }}</td>
                                        <td>
                                            <a href="#" @click.prevent="openOrderModal(rating)">Ver orden</a>
                                        </td>
                                        <td><i class="fa fa-star" v-for="n in parseInt(rating.ratingValue)" :key="n"
                                                aria-hidden="true"></i></td>
                                        <td>{{ rating.comment }}</td>
                                        <td>{{ rating.totalPaid.toFixed(2) }}</td>
                                    </tr>
                                    <tr v-if="ratings.length === 0">
                                        <td colspan="5">No hay datos disponibles</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colspan="4">Total pagado en tienda</th>
                                        <th>{{ totalPaidOnStore }}</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-theme btn-primary">Descargar reporte</button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
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

.actions-column {
    width: 120px;
    min-width: 120px;
}

.actions-column .btn {
    transition: background-color 0.3s, border-color 0.3s;
}

.actions-column .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
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
</style>