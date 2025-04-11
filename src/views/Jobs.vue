<script>
import { db } from '../firebase/init';
import { ref as dbRef, update, get, query, push, set, remove } from 'firebase/database';
import { showToast } from '@/utils/toast';
import 'toastify-js/src/toastify.css'
import SearchInput from '@/components/app/SearchInput.vue';
import { Modal } from 'bootstrap';
import { useUserStore } from "@/stores/user-role";
import venezuela from 'venezuela';

export default {
    components: {
        SearchInput,
    },
    data() {
        return {
            userId: null,
            role: null,
            userName: null,

            job: {
                title: '',
                desc: '',
                modalidad: '',
                type: '',
                offer: null,
                publishedAt: null,
            },
            editJobData: {},

            jobs: [],
            filteredJobs: [],
            currentUserJobs: [],
            categories: [],

            filterByDate: false,
            startDate: null,
            endDate: null,

            filterJobs: false,
            showMunicipios: false,
            showParroquias: false,
            showCategories: false,
            selectedCategory: null,
            selectedState: null,
            selectedMunicipio: null,
            selectedParroquia: null,
            venezuelanStates: [
                "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas",
                "Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital",
                "Falcón", "Guárico", "Lara", "Mérida", "Miranda",
                "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira",
                "Trujillo", "Vargas", "Yaracuy", "Zulia"
            ],
            municipios: [],
            parroquias: [],

            filterDropdowns: {
                state: {
                    selectedLabel: 'Filtrar por Estado',
                    items: []
                },
                municipio: {
                    selectedLabel: 'Filtrar por Municipio',
                    items: []
                },
                parroquia: {
                    selectedLabel: 'Filtrar por Parroquia',
                    items: []
                },
                category: {
                    selectedLabel: 'Filtrar por Categoria',
                    items: []
                }
            }
        }
    },
    methods: {
        // filters
        applyFilter(filterKey, value) {
            this.filteredJobs = this.jobs.filter(job =>
                job.affiliate && job.affiliate[filterKey] === value
            );
        },
        applyDateRangeFilter() {
            if (!this.startDate || !this.endDate) {
                showToast('Por favor, seleccione un rango de fechas', {
                    style: {
                        background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
                    },
                });
                return;
            }

            const localStart = new Date(this.startDate);
            localStart.setHours(0, 0, 0, 0);

            const localEnd = new Date(this.endDate);
            localEnd.setHours(23, 59, 59, 999);

            this.filteredJobs = this.jobs.filter(job => {
                if (!job.publishedAt) return false;

                const jobDate = new Date(job.publishedAt);
                const adjustedJobDate = new Date(jobDate.getTime() + jobDate.getTimezoneOffset() * 60000);

                return adjustedJobDate >= localStart && adjustedJobDate <= localEnd;
            });
        },

        // Selection
        setSelectedFilter(filterType, value) {
            this[`selected${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`] = value;

            switch (filterType) {
                case 'state':
                    this.applyFilter('state', value);
                    this.displayMunicipios(value);
                    break;
                case 'municipio':
                    this.applyFilter('municipio', value);
                    this.displayParroquias(value);
                    break;
                case 'parroquia':
                    this.applyFilter('parroquia', value);
                    break;
                case 'category':
                    this.applyFilter('category_id', value.id);
                    break;
            }
        },

        // helper methods
        displayMunicipios(state) {
            const z = venezuela.estado(state, { municipios: true });
            const munis = z.municipios;
            if (munis) {
                this.showMunicipios = true;
                this.municipios = munis;

                // Update filterDropdowns
                this.filterDropdowns.state.selectedLabel = state;
                this.filterDropdowns.municipio.items = munis;
                this.filterDropdowns.municipio.selectedLabel = 'Filtrar por Municipio';
            }
        },
        displayParroquias(municipio) {
            const y = venezuela.municipio(municipio, { parroquias: true });
            this.parroquias = y.parroquias;
            if (this.parroquias) {
                this.showParroquias = true;

                // Update filterDropdowns
                this.filterDropdowns.municipio.selectedLabel = municipio;
                this.filterDropdowns.parroquia.items = this.parroquias;
                this.filterDropdowns.parroquia.selectedLabel = 'Filtrar por Parroquia';
            }
        },

        // filter toggle and clear methods
        toggleFilters() {
            if (this.filterJobs) {
                this.filterJobs = false;
                this.showMunicipios = false;
                this.showParroquias = false;
                this.showCategories = false;
                this.clearFilter();
            } else {
                this.filterJobs = true;
                this.showCategories = true;

                // Populate state and category dropdowns
                this.filterDropdowns.state.items = this.venezuelanStates;
                this.filterDropdowns.category.items = this.categories;
            }
        },
        clearFilter() {
            this.selectedState = '';
            this.selectedMunicipio = '';
            this.selectedParroquia = '';
            this.selectedCategory = '';
            this.filterByDate = false;
            this.filteredJobs = this.jobs;

            // Reset filterDropdowns
            this.filterDropdowns = {
                state: {
                    selectedLabel: 'Filtrar por Estado',
                    items: this.venezuelanStates
                },
                municipio: {
                    selectedLabel: 'Filtrar por Municipio',
                    items: []
                },
                parroquia: {
                    selectedLabel: 'Filtrar por Parroquia',
                    items: []
                },
                category: {
                    selectedLabel: 'Filtrar por Categoria',
                    items: this.categories
                }
            };
        },

        async fetchJobs() {
            const jobsRef = query(dbRef(db, 'Jobs'));
            try {
                const snapshot = await get(jobsRef);

                if (snapshot.exists()) {
                    const jobs = snapshot.val();

                    // Since Firebase data is an object, map to array for easier use
                    this.jobs = await Promise.all(
                        Object.keys(jobs).map(async key => {
                            const job = {
                                id: key,
                                ...jobs[key]
                            };

                            // Format publishedAt to a Spanish date string
                            if (job.publishedAt) {
                                const date = new Date(job.publishedAt)

                                // Adjust for the local timezone
                                const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);

                                job.publishedAtFormatted = localDate.toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                });
                            }

                            // Fetch affiliate data based on 'affiliate_id'
                            if (job.affiliate_id) {
                                const affiliateRef = dbRef(db, `Users/${job.affiliate_id}`);
                                const affiliateSnapshot = await get(affiliateRef);

                                if (affiliateSnapshot.exists()) {
                                    job.affiliate = affiliateSnapshot.val();
                                } else {
                                    job.affiliate = null;  // Handle case where affiliate not found
                                }
                            }

                            return job;
                        })
                    );
                    this.filteredJobs = this.jobs;
                    this.currentUserJobs = this.jobs.filter((job) => job.affiliate_id === this.userId);
                } else {
                    this.jobs = [];  // No jobs found
                }
            } catch (error) {
                console.error('Error fetching jobs:', error);
                this.jobs = [];
            }
        },
        async fetchCategories() {

            const categoryRef = dbRef(db, 'Affiliate_categories');
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
        },

        async createJob() {
            try {
                const data = {
                    title: this.job.title,
                    desc: this.job.desc,
                    modalidad: this.job.modalidad,
                    type: this.job.type,
                    affiliate_id: this.userId,
                    publishedAt: new Date().toISOString(),
                    // offer: this.job.offer
                };
                const jobsRef = dbRef(db, 'Jobs');
                const newJobRef = push(jobsRef);

                await set(newJobRef, data);

                showToast('Vacante registrada con éxito!');
                // Reset form fields
                this.job.title = '';
                this.job.desc = '';
                this.job.modalidad = '';
                this.job.type = '';
                this.job.publishedAt = new Date();
                // this.job.offer = null;

                console.log('Vacante creada.');
                await this.fetchJobs();
            } catch (error) {
                console.error('Error creating job:', error);
                alert('La creación de la vacante falló.');
                return null;
            }
        },
        editJob(job) {
            // Populate the modal fields with the plan data
            this.editJobData = {
                ...job
            };
            console.log(this.editJobData.id);

            // Open the modal
            const modal = new Modal(document.getElementById('editJob'));
            modal.show();
        },
        async updateJob(jobId) {
            const jobRef = dbRef(db, `Jobs/${jobId}`);

            const updateData = {
                title: this.editJobData.title,
                desc: this.editJobData.desc,
                modalidad: this.editJobData.modalidad,
                type: this.editJobData.type,
                // offer: this.editJobData.offer,
            };

            if (this.editJobData.publishedAt) {
                updateData.publishedAt = new Date(this.editJobData.publishedAt).toISOString();
            }

            try {
                await update(jobRef, updateData);
                console.log("Job updated successfully");

                // Success notification
                showToast('Vacante actualizada con exito!');
                // Close the modal after saving
                const modal = Modal.getInstance(document.getElementById('editJob'));
                modal.hide();
                await this.fetchJobs();
            } catch (error) {
                console.error("Error updating job:", error);
            }
        },
        async deleteJob(jobId, index) {
            console.log(jobId);
            if (confirm("¿Desea borrar esta vacante?")) {
                try {
                    const jobRef = dbRef(db, `Jobs/${jobId}`);
                    await remove(jobRef);

                    // Remove the job from the local state
                    this.jobs.splice(index, 1);
                    this.fetchJobs();

                    showToast('Vacante eliminada con éxito!')
                } catch (error) {
                    console.error('Error deleting job:', error);
                    alert('Error al eliminar la vacante.');
                }
            }
        },
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;
        this.userName = userStore.userName;

        await this.fetchJobs();
        await this.fetchCategories();
    }
}
</script>
<template>
    <div class="container">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="mb-0 text-primary">
                <i class="fa-solid fa-gift me-2"></i>
                Empleos
            </h4>

            <!-- Affiliate Job Creation Button -->
            <div v-if="this.role === 'afiliado'" class="d-flex gap-2">
                <button class="btn btn-theme btn-sm" data-bs-toggle="modal" data-bs-target="#createJob">
                    <i class="fa fa-plus-circle fa-fw me-1"></i> Nueva Vacante
                </button>
            </div>

            <!-- Filters for Clients and Admins -->
            <div v-if="this.role === 'cliente' || this.role === 'admin'" class="d-flex gap-2">
                <!-- Filter Toggle -->
                <button class="btn btn-theme mb-2" @click.prevent="toggleFilters()">
                    <i class="fa-solid fa-filter"></i>
                    {{ filterJobs ? 'Limpiar filtros' : 'Filtrar' }}
                </button>
            </div>
        </div>

        <!-- Affiliate Job Management -->
        <div v-if="this.role === 'afiliado'">
            <div class="d-flex justify-content-center align-items-center mt-2">
                <div class="alert alert-info" role="alert">
                    <i class="fa-solid fa-info-circle me-2"></i>
                    Publica aqui tus vacantes.
                </div>
            </div>

            <div v-if="currentUserJobs.length === 0" class="text-center">
                <i class="fa-solid fa-suitcase text-body text-opacity-25 mb-3" style="font-size: 5em"></i>
                <h5>No hay Vacantes registradas.</h5>
            </div>

            <div v-else class="d-flex flex-column align-items-center">
                <div v-for="(job, index) in currentUserJobs" :key="job.id" class="card job-card p-4 mb-4 w-100"
                    style="max-width: 800px; position: relative;">

                    <!-- Job Management Buttons -->
                    <div class="d-flex justify-content-end" style="position: relative; z-index: 10;">
                        <button class="btn btn-sm btn-outline-info me-1" @click="editJob(job)">
                            <i class="fa-solid fa-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click="deleteJob(job.id, index)">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>

                    <!-- Job Content -->
                    <div class="row g-4">
                        <div class="col-12 col-md-8 d-flex align-items-center">
                            <img class="flex-shrink-0 img-fluid border rounded" :src="job.affiliate.image"
                                alt="comercio" style="width: 80px; height: 80px;">
                            <div class="text-start ps-4">
                                <h5 class="mb-3">{{ job.title.charAt(0).toUpperCase() + job.title.slice(1) }}</h5>
                                <span class="text-truncate me-3">
                                    <i class="far fa-clock text-primary me-2"></i>
                                    {{ job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : `Sin
                                    especificar` }}
                                </span>
                            </div>
                        </div>
                        <div
                            class="col-12 col-md-4 d-flex flex-column align-items-start align-items-md-end justify-content-center">
                            <p>{{ job.desc }}</p>
                            <small class="text-truncate">
                                <i class="far fa-calendar-alt text-primary me-2"></i>
                                Publicado el día: {{ job.publishedAtFormatted }}
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modals for Create and Edit Jobs -->
            <!-- Create Job Modal -->
            <div class="modal fade" id="createJob" tabindex="-1" aria-labelledby="createJobModalLabel"
                aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Registrar Nueva Vacante</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Título <span class="text-danger">*</span></label>
                                <input v-model="job.title" type="text" class="form-control form-control-lg fs-15px"
                                    value="" required />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Descripción <span class="text-danger">*</span></label>
                                <textarea v-model="job.desc" class="form-control form-control-lg fs-15px" rows="5"
                                    required></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Modalidad </label>
                                <select v-model="job.modalidad" class="form-control form-control-lg fs-15px">
                                    <option class="text-black" value="" selected disabled>Seleccione una opcion...
                                    </option>
                                    <option value="remoto">Remoto</option>
                                    <option value="presencial">Presencial</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Tipo </label>
                                <select v-model="job.type" class="form-control form-control-lg fs-15px">
                                    <option class="text-black" value="" selected disabled>Seleccione una opcion...
                                    </option>
                                    <option value="full-time">Full time</option>
                                    <option value="part-time">Part time</option>
                                </select>
                            </div>
                            <!-- <div class="mb-3">
                                <label class="form-label">Oferta <span class="text-danger">*</span></label>
                                <input v-model="job.offer" type="number" class="form-control form-control-lg fs-15px"
                                    value="" required />
                            </div> -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-theme" @click="createJob()">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Edit Plan Modal -->
            <div class="modal fade" id="editJob" tabindex="-1" aria-labelledby="editJobModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editJobModalLabel">Editar Vacante</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Título</label>
                                <input v-model="editJobData.title" type="text" class="form-control" />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Descripción</label>
                                <textarea v-model="editJobData.desc" class="form-control form-control-lg fs-15px"
                                    rows="5" required></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Modalidad </label>
                                <select v-model="editJobData.modalidad" class="form-control form-control-lg fs-15px">
                                    <option class="text-black" value="" selected disabled>Seleccione una opción...
                                    </option>
                                    <option value="remoto">Remoto</option>
                                    <option value="presencial">Presencial</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Tipo </label>
                                <select v-model="editJobData.type" class="form-control form-control-lg fs-15px">
                                    <option class="text-black" value="" selected disabled>Seleccione una opción...
                                    </option>
                                    <option value="full-time">Full time</option>
                                    <option value="part-time">Part time</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="publishedAt" class="form-label">Fecha de Publicación</label>
                                <input type="date" class="form-control" v-model="editJobData.publishedAt"
                                    style="width: auto;">
                            </div>
                            <!-- <div class="mb-3">
                                <label class="form-label">Oferta</label>
                                <input v-model="editJobData.offer" type="number" class="form-control" />
                            </div> -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-theme" @click="updateJob(editJobData.id)">Guardar
                                cambios</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main content -->
        <div v-if="this.role === 'cliente' || this.role === 'admin'">
            <!-- Date Filter switch -->
            <div class="mb-3 form-check form-switch">
                <input class="form-check-input" type="checkbox" id="dateFilter" v-model="filterByDate">
                <label class="form-check-label" for="dateFilter">Filtrar por fecha de Publicación</label>
            </div>
            <!-- Date filter -->
            <template v-if="filterByDate">
                <hr>
                <div class="justify-content-center mb-4">
                    <h5 class="mb-4 text-center">Filtrar por rango de fecha</h5>
                    <div class="row g-3 justify-content-center">
                        <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                            <input type="date" v-model="startDate" class="form-control" />
                        </div>
                        <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                            <input type="date" v-model="endDate" class="form-control" />
                        </div>
                    </div>

                    <div class="d-flex justify-content-center mt-3">
                        <button type="button" class="btn btn-theme me-2" style="width: 150px;"
                            @click="applyDateRangeFilter">
                            Filtrar
                        </button>
                        <button type="button" class="btn btn-theme" style="width: 150px;" @click="clearFilter">
                            Cerrar
                        </button>
                    </div>
                </div>
                <hr>
            </template>

            <!-- Filter Dropdowns -->
            <template v-if="filterJobs">
                <hr>
                <div class="d-flex gap-2 justify-content-center align-items-center">
                    <!-- State Filter -->
                    <div v-if="filterJobs" class="dropdown mb-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                            id="filterState" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fa-solid fa-filter"></i>
                            {{ selectedState || 'Filtrar por Estado' }}
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="filterState"
                            style="max-height: 200px; overflow-y: auto;">
                            <li v-for="state in venezuelanStates" :key="state">
                                <a class="dropdown-item" href="#" @click.prevent="setSelectedFilter('state', state)">
                                    {{ state }}
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#" @click.prevent="clearFilter">Ver todos</a>
                            </li>
                        </ul>
                    </div>

                    <!-- Municipio Filter -->
                    <div v-if="showMunicipios" class="dropdown mb-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                            id="filterMunicipios" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fa-solid fa-filter"></i>
                            {{ selectedMunicipio || 'Filtrar por Municipio' }}
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="filterMunicipios"
                            style="max-height: 200px; overflow-y: auto;">
                            <li v-for="municipio in municipios" :key="municipio">
                                <a class="dropdown-item" href="#"
                                    @click.prevent="setSelectedFilter('municipio', municipio)">
                                    {{ municipio }}
                                </a>
                            </li>
                        </ul>
                    </div>

                    <!-- Parroquia Filter -->
                    <div v-if="showParroquias" class="dropdown mb-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                            id="filterParroquias" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fa-solid fa-filter"></i>
                            {{ selectedParroquia || 'Filtrar por Parroquia' }}
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="filterParroquias"
                            style="max-height: 200px; overflow-y: auto;">
                            <li v-for="parroquia in parroquias" :key="parroquia">
                                <a class="dropdown-item" href="#"
                                    @click.prevent="setSelectedFilter('parroquia', parroquia)">
                                    {{ parroquia }}
                                </a>
                            </li>
                        </ul>
                    </div>

                    <!-- Category Filter -->
                    <div v-if="showCategories" class="dropdown mb-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                            id="filterCategory" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fa-solid fa-filter"></i>
                            {{ selectedCategory ? selectedCategory.name : 'Filtrar por Categoria' }}
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="filterCategory"
                            style="max-height: 200px; overflow-y: auto;">
                            <li v-for="category in categories" :key="category.id">
                                <a class="dropdown-item" href="#"
                                    @click.prevent="setSelectedFilter('category', category)">
                                    {{ category.name }}
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#" @click.prevent="clearFilter">Ver todos</a>
                            </li>
                        </ul>
                    </div>
                </div>
                <hr>
            </template>

            <!-- Jobs List -->
            <div v-for="job in filteredJobs" :key="job.id" class="card p-4 mb-4">
                <span class="d-flex justify-content-start">
                    <strong class="me-2">Publicado por: </strong> {{ job.affiliate.companyName }}
                </span>
                <div class="row mt-2 g-4">
                    <div class="col-sm-12 col-md-8 d-flex align-items-center">
                        <img class="flex-shrink-0 img-fluid border rounded" :src="job.affiliate.image" alt="comercio"
                            style="width: 80px; height: 80px;">
                        <div class="text-start ps-4">
                            <h5 class="mb-3">{{ job.title.charAt(0).toUpperCase() + job.title.slice(1) }}</h5>
                            <span class="text-truncate me-3">
                                <i class="far fa-clock text-primary me-2"></i>
                                {{ job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : 'Sin especificar'
                                }}
                            </span>
                        </div>
                    </div>
                    <div
                        class="col-sm-12 col-md-4 d-flex flex-column align-items-start align-items-md-end justify-content-center">
                        <p>{{ job.desc }}</p>
                        <a v-if="job.affiliate && job.affiliate.phoneNumber"
                            :href="`https://wa.me/${job.affiliate.phoneNumber}?text=Hola,%20estoy%20interesado%20en%20la%20oferta%20de%20trabajo%20de%20${job.title}`"
                            target="_blank" class="btn btn-outline-success mb-3">
                            <i class="fa-brands fa-whatsapp"></i> Contactar
                        </a>
                        <small class="text-truncate">
                            <i class="far fa-calendar-alt text-primary me-2"></i>
                            Publicado el día: {{ job.publishedAtFormatted }}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.btn-outline-theme,
.btn-theme {
    background-color: purple;
    border-color: purple;
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
}
</style>