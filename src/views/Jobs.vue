<script>
import { db } from '../firebase/init';
import { ref as dbRef, update, get, query, orderByChild, equalTo, push, set, remove } from 'firebase/database';
import Toastify from 'toastify-js'
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
        }
    },
    methods: {
        showToast(message) {
            Toastify({
                text: message,
                duration: 3000,
                close: true,
                gravity: 'top',
                position: 'right',
                stopOnFocus: true,
                style: {
                    background: 'linear-gradient(to right, #00b09b, #96c93d)',
                },
            }).showToast();
        },

        // Filters
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
            }
        },
        clearFilter() {
            this.selectedState = '';
            this.selectedMunicipio = '';
            this.selectedParroquia = '';
            this.selectedCategory = '';
            this.filterByDate = false;
            this.filteredJobs = this.jobs;
        },

        displayMunicipios(state) {
            const z = venezuela.estado(state, { municipios: true });
            const munis = z.municipios;
            if (munis) {
                this.showMunicipios = true;
                this.municipios = munis;
            }
        },
        displayParroquias(municipio) {
            const y = venezuela.municipio(municipio, { parroquias: true });
            this.parroquias = y.parroquias;
            if (this.parroquias) {
                this.showParroquias = true;
            }
        },
        filterByState(state) {
            this.filteredJobs = this.jobs.filter(job =>
                job.affiliate.state === state
            );
        },
        filterByMunicipio(municipio) {
            this.filteredJobs = this.jobs.filter(job =>
                job.affiliate.municipio === municipio
            );
        },
        filterByParroquia(parroquia) {
            this.filteredJobs = this.jobs.filter(job =>
                job.affiliate.parroquia === parroquia
            );
        },
        filterByCategory(category) {
            this.filteredJobs = this.jobs.filter(job =>
                job.affiliate.category_id === category.id
            );
        },
        filterJobsByDate() {
            if (!this.startDate || !this.endDate) {
                alert('Ingrese un rango de fecha');
            }

            // Set start and end date
            const start = new Date(this.startDate);
            const localStart = new Date(start.getTime() + start.getTimezoneOffset() * 60000);
            localStart.setHours(0, 0, 0, 0);
            console.log(localStart)

            const end = new Date(this.endDate);
            const localEnd = new Date(end.getTime() + end.getTimezoneOffset() * 60000);
            localEnd.setHours(23, 59, 59, 999); // Include the entire end
            console.log(localEnd)

            this.filteredJobs = this.filteredJobs.filter(job => {
                if (!job.publishedAt) return false; // Skip jobs without a publishedAt date

                // Adjust the job published date for timezone
                const jobDate = new Date(job.publishedAt);
                const adjustedJobDate = new Date(jobDate.getTime() + jobDate.getTimezoneOffset() * 60000);

                return adjustedJobDate >= localStart && adjustedJobDate <= localEnd;
            });

            console.log(this.filteredJobs);
        },

        // Selections
        setSelectedState(state) {
            this.selectedState = state;
        },
        setSelectedMunicipio(municipio) {
            this.selectedMunicipio = municipio;
        },
        setSelectedParroquia(parroquia) {
            this.selectedParroquia = parroquia;
        },
        setSelectedCategory(category) {
            this.selectedCategory = category;
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

                this.showToast('Vacante registrada con éxito!');
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
                this.showToast('Vacante actualizada con exito!');
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

                    this.showToast('Vacante eliminada con éxito!')
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
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Empleos
    </h2>

    <!-- Comercios (publican vacantes) -->
    <div v-if="this.role === 'afiliado'" class="container">
        <div class="d-flex justify-content-center align-items-center mt-2">
            <div class="alert alert-info" role="alert">
                <i class="fa-solid fa-info-circle me-2"></i>
                Publica aqui tus vacantes.
            </div>
        </div>

        <!-- Button to add new job -->
        <div class="d-flex justify-content-end align-items-center mt-5 mb-5">
            <a href="#" class="btn btn-theme me-2" data-bs-toggle="modal" data-bs-target="#createJob">
                <i class="fa fa-plus-circle fa-fw me-1"></i> Nueva Vacante
            </a>
        </div>

        <div v-if="currentUserJobs.length === 0" class="d-flex justify-content-center align-items-center">
            <div class="text-center">
                <div class="mb-3 mt-n5">
                    <i class="fa-solid fa-suitcase text-body text-opacity-25" style="font-size: 5em"></i>
                </div>
                <h5>No hay Vacantes registradas.</h5>
            </div>
        </div>

        <div v-else class="d-flex flex-column align-items-center">
            <!-- Jobs list -->
            <div v-for="(job, index) in currentUserJobs" :key="job.id" class="card job-card p-4 mb-4 w-100"
                style="max-width: 800px; position: relative;">
                <!-- Edit and Delete buttons -->
                <div class="d-flex justify-content-end" style="position: relative; z-index: 10;">
                    <button class="btn btn-sm btn-outline-info me-1" @click="editJob(job)">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="deleteJob(job.id, index)">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>

                <!-- Job content -->
                <div class="row g-4">
                    <div class="col-12 col-md-8 d-flex align-items-center">
                        <img class="flex-shrink-0 img-fluid border rounded" :src="job.affiliate.image"
                                alt="comercio" style="width: 80px; height: 80px;">
                        <div class="text-start ps-4">
                            <h5 class="mb-3">{{ job.title.charAt(0).toUpperCase() + job.title.slice(1) }}</h5>
                            <span class="text-truncate me-3">
                                <i class="far fa-clock text-primary me-2"></i>
                                {{ job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) :
                                    'Sin especificar' }}
                            </span>
                            <!-- <span class="text-truncate me-0">
                                <i class="far fa-money-bill-alt text-primary me-2"></i>
                                ${{ job.offer }}
                            </span> -->
                        </div>
                    </div>
                    <div class="col-12 col-md-4 d-flex flex-column align-items-start align-items-md-end justify-content-center">
                        <!-- <div class="d-flex mb-3">
                            <a class="btn btn-light btn-square me-3" href=""><i
                                    class="far fa-heart text-primary"></i></a>
                            <a class="btn btn-primary" href="">Apply Now</a>
                        </div> -->
                        <p>
                            {{ job.desc }}
                        </p>
                        <small class="text-truncate">
                            <i class="far fa-calendar-alt text-primary me-2"></i>
                            Publicado el día: {{ job.publishedAtFormatted }}
                        </small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modals -->
        <!-- Create Job Modal -->
        <div class="modal fade" id="createJob" tabindex="-1" aria-labelledby="createJobModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Registrar Nueva Vacante</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Título <span class="text-danger">*</span></label>
                            <input v-model="job.title" type="text" class="form-control form-control-lg fs-15px" value=""
                                required />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción <span class="text-danger">*</span></label>
                            <textarea v-model="job.desc" class="form-control form-control-lg fs-15px" rows="5"
                                required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Modalidad </label>
                            <select v-model="job.modalidad" class="form-control form-control-lg fs-15px">
                                <option class="text-black" value="" selected disabled>Seleccione una opcion...</option>
                                <option value="remoto">Remoto</option>
                                <option value="presencial">Presencial</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Tipo </label>
                            <select v-model="job.type" class="form-control form-control-lg fs-15px">
                                <option class="text-black" value="" selected disabled>Seleccione una opcion...</option>
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
                            <textarea v-model="editJobData.desc" class="form-control form-control-lg fs-15px" rows="5"
                                required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Modalidad </label>
                            <select v-model="editJobData.modalidad" class="form-control form-control-lg fs-15px">
                                <option class="text-black" value="" selected disabled>Seleccione una opción...</option>
                                <option value="remoto">Remoto</option>
                                <option value="presencial">Presencial</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Tipo </label>
                            <select v-model="editJobData.type" class="form-control form-control-lg fs-15px">
                                <option class="text-black" value="" selected disabled>Seleccione una opción...</option>
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

    <!-- Admins y clientes pueden ver las vacantes -->
    <div v-if="this.role === 'cliente' || this.role === 'admin'" class="container">

        <!-- Filters -->
        <div class="row mb-5">
            <!-- Filters -->
            <div class="d-flex justify-content-end flex-wrap mt-3">
                <div v-if="!filterJobs" class="btn btn-theme me-2 mb-2" @click.prevent="toggleFilters()">
                    <i class="fa-solid fa-filter"></i>
                    Filtrar Empleos
                </div>
                <div v-else class="btn btn-theme me-2 mb-2" @click.prevent="toggleFilters()">
                    <i class="fa-solid fa-filter"></i>
                    Limpiar filtros
                </div>

                <div v-if="filterJobs" class="dropdown mb-2 me-2">
                    <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button" id="filterDropdown"
                        data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fa-solid fa-filter"></i>
                        {{ selectedState ? selectedState : 'Filtrar por Estado' }}
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="filterDropdown"
                        style="max-height: 200px; overflow-y: auto;">
                        <li v-for="state in venezuelanStates" :key="state">
                            <a class="dropdown-item" href="#"
                                @click.prevent="filterByState(state), displayMunicipios(state), setSelectedState(state)">
                                {{ state }}</a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" @click.prevent="clearFilter">Ver todos</a>
                        </li>
                    </ul>
                </div>
                <div v-if="showMunicipios" class="dropdown mb-2 me-2">
                    <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                        id="filterMunicipios" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fa-solid fa-filter"></i>
                        {{ selectedMunicipio ? selectedMunicipio : 'Filtrar por Municipio' }}
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="filterDropdown"
                        style="max-height: 200px; overflow-y: auto;">
                        <li v-for="municipio in municipios" :key="municipio">
                            <a class="dropdown-item" href="#"
                                @click.prevent="filterByMunicipio(municipio), displayParroquias(municipio), setSelectedMunicipio(municipio)">
                                {{ municipio }}</a>
                        </li>
                    </ul>
                </div>
                <div v-if="showParroquias" class="dropdown mb-2 me-2">
                    <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                        id="filterParroquias" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fa-solid fa-filter"></i>
                        {{ selectedParroquia ? selectedParroquia : 'Filtrar por Parroquia' }}
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="filterDropdown"
                        style="max-height: 200px; overflow-y: auto;">
                        <li v-for="parroquia in parroquias" :key="parroquia">
                            <a class="dropdown-item" href="#"
                                @click.prevent="filterByParroquia(parroquia), setSelectedParroquia(parroquia)">
                                {{ parroquia }}</a>
                        </li>
                    </ul>
                </div>
                <div v-if="showCategories" class="dropdown mb-2 me-2">
                    <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button" id="filterDropdown"
                        data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fa-solid fa-filter"></i>
                        {{ selectedCategory ? selectedCategory.name : 'Filtrar por Categoria' }}
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="filterDropdown"
                        style="max-height: 200px; overflow-y: auto;">
                        <li v-for="category in categories" :key="category">
                            <a class="dropdown-item" href="#"
                                @click.prevent="filterByCategory(category), setSelectedCategory(category)">
                                {{ category.name }}</a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" @click.prevent="clearFilter">Ver todos</a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <!-- Filters by date range -->
        <div class="mb-3 form-check form-switch">
            <input class="form-check-input" type="checkbox" id="flexSwitchCheckDefault" v-model="filterByDate">
            <label class="form-check-label" for="flexSwitchCheckDefault">Filtrar por fecha de Publicación</label>
        </div>

        <hr v-if="filterByDate">

        <div v-if="filterByDate" class="justify-content-center" style="margin-bottom: 20px;">
            <h5 class="mb-4 text-center">Filtrar por rango de fecha</h5>
            <div class="row g-3 justify-content-center">
                <!-- Start Date Picker -->
                <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                    <input type="date" v-model="startDate" class="form-control" />
                </div>
                <!-- End Date Picker -->
                <div class="col-12 col-sm-6 col-md-4 d-flex justify-content-center">
                    <input type="date" v-model="endDate" class="form-control" />
                </div>
            </div>

            <div class="d-flex justify-content-center mt-3">
                <button type="button" class="btn btn-theme me-2" style="width: 150px;" @click="filterJobsByDate">
                    Filtrar
                </button>
                <button type="button" class="btn btn-theme" style="width: 150px;" @click="clearFilter">
                    Limpiar filtro
                </button>
            </div>
        </div>

        <hr v-if="filterByDate">

        <!-- Jobs list -->
        <div v-for="job in filteredJobs" :key="job.id">
            <div class="card p-4 mb-4" style="position: relative; z-index: 0;">
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
                            <!-- <span class="text-truncate me-0">
                                <i class="far fa-money-bill-alt text-primary me-2"></i>
                                ${{ job.offer }}
                            </span> -->
                        </div>
                    </div>
                    <div
                        class="col-sm-12 col-md-4 d-flex flex-column align-items-start align-items-md-end justify-content-center">
                        <!-- <div class="d-flex mb-3">
                            <a class="btn btn-light btn-square me-3" href=""><i
                                    class="far fa-heart text-primary"></i></a>
                            <a class="btn btn-primary" href="">Apply Now</a>
                        </div> -->
                        <p>{{ job.desc }}</p>
                        <a v-if="job.affiliate && job.affiliate.phoneNumber"
                            :href="`https://wa.me/${job.affiliate.phoneNumber}?text=Hola,%20estoy%20interesado%20en%20la%20oferta%20de%20trabajo%20de%20${job.title}`"
                            target="_blank" class="btn btn-outline-success mb-3">
                            <i class="fa-brands fa-whatsapp"></i> Contactar por WhatsApp
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
.btn-theme {
    background-color: purple;
    border-color: purple;
}

.btn:hover {
    color: #fff;
    background-color: #29122f;
}
</style>