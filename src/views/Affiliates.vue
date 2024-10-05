<script>
import { ref as dbRef, query, orderByChild, equalTo, get, update, remove, push, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, functions } from '@/firebase/init';
import { httpsCallable } from 'firebase/functions';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'
import { useUserStore } from "@/stores/user-role";
import venezuela from 'venezuela';

export default {
    data() {
        return {
            // Logged User data
            userId: '',
            role: '',

            affiliate: {
                name: '',
                rif: '',
                status: false,
                email: '',
                phoneNumber: '',
                state: '',
                municipio: '',
                parroquia: '',
                address: '',
                type: '',
            },
            editData: {
                name: '',
                rif: '',
                status: false,
                email: '',
                phoneNumber: '',
                state: '',
                municipio: '',
                parroquia: '',
                address: '',
                type: '',
            },
            modalData: [],
            affiliates: [],
            filteredAffiliates: [],
            categories: [],
            filterAffiliates: false,
            showMunicipios: false,
            showParroquias: false,
            showCategories: false,
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

            imageFile: null,
            uploadImage: false,
            imagePreview: null,
            updatedImagePreview: null,
            isSubmitting: false,

            selectedCategory: null,
            categoryName: '',
            newCategory: '',
            editingCategoryId: null,
            editCategoryName: '',
        }
    },
    async mounted() {
        const userStore = useUserStore();
        await userStore.fetchUser();
        this.role = userStore.role;
        this.userId = userStore.userId;
        console.log('This user ID: ', this.userId, 'Has a role of: ', this.role);

        await this.fetchAffiliates();
        await this.fetchCategories();
    },
    methods: {
        // Fetching data functions
        async fetchAffiliates() {
            const role = 'afiliado';
            const affiliatesRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const affiliateSnapshot = await get(affiliatesRef);

                if (affiliateSnapshot.exists()) {
                    const affiliatesList = [];

                    // Fetch all categories first and store them in a map for easier lookup
                    const categoriesRef = dbRef(db, 'Affiliate_categories');
                    const categoriesSnapshot = await get(categoriesRef);
                    const categoriesMap = {};

                    if (categoriesSnapshot.exists()) {
                        categoriesSnapshot.forEach((categorySnapshot) => {
                            const categoryData = categorySnapshot.val();
                            categoriesMap[categorySnapshot.key] = categoryData.name;  // Assuming 'name' is the category name field
                        });
                    }

                    affiliateSnapshot.forEach((childSnapshot) => {
                        const affiliateData = childSnapshot.val();
                        const categoryId = affiliateData.category_id;

                        affiliatesList.push({
                            id: childSnapshot.key,
                            name: affiliateData.companyName,
                            rif: affiliateData.rif,
                            status: affiliateData.status,
                            email: affiliateData.email,
                            phoneNumber: affiliateData.phoneNumber,
                            image: affiliateData.image,
                            state: affiliateData.state,
                            municipio: affiliateData.municipio,
                            parroquia: affiliateData.parroquia,
                            address: affiliateData.address,
                            type: affiliateData.type,
                            category_id: categoryId,
                            categoryName: categoriesMap[categoryId] || 'Sin categoría'
                        });
                    });

                    this.affiliates = affiliatesList;
                    this.filteredAffiliates = affiliatesList;
                } else {
                    console.log("No data available.");
                }
            } catch (error) {
                console.error("Error fetching affiliates:", error);
            }
        },

        // Filter affiliates
        habilitateFilters() {
            if (this.filterAffiliates) {
                this.filterAffiliates = false;
                this.showMunicipios = false;
                this.showParroquias = false;
                this.showCategories = false;
                this.clearFilter();
            } else {
                this.filterAffiliates = true;
                this.showCategories = true;
            }
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
            this.filteredAffiliates = this.affiliates.filter(affiliate =>
                affiliate.state === state
            );
        },
        filterByMunicipio(municipio) {
            this.filteredAffiliates = this.affiliates.filter(affiliate =>
                affiliate.municipio === municipio
            );
            console.log(this.filteredAffiliates);
        },
        filterByParroquia(parroquia) {
            this.filteredAffiliates = this.affiliates.filter(affiliate =>
                affiliate.parroquia === parroquia
            );
            console.log(this.filteredAffiliates);
        },
        filterByCategory(category) {
            this.filteredAffiliates = this.affiliates.filter(affiliate =>
                affiliate.category_id === category.id
            );
        },

        // Select options
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
        clearFilter() {
            this.selectedState = '';
            this.selectedMunicipio = '';
            this.selectedParroquia = '';
            this.selectedCategory = '';
            this.filteredAffiliates = this.affiliates;
        },

        // Edit affiliate
        editAffiliate(affiliate) {
            // Populate the modal fields with the plan data
            this.editData = {
                ...affiliate
            };

            // Open the modal
            const modal = new Modal(document.getElementById('editAffiliateModal'));
            modal.show();
        },
        async updateAffiliate(affiliate) {
            if (!affiliate) {
                console.error('Affiliate data is undefined.');
                return;
            }
            console.log(affiliate.id);
            try {
                this.isSubmitting = true;

                // Create an updateData object, but only include non-empty fields
                const updateData = {};

                // Conditionally update fields if they are provided
                if (affiliate.name) updateData.companyName = affiliate.name;
                if (affiliate.rif) updateData.rif = affiliate.rif;
                if (affiliate.phoneNumber) updateData.phoneNumber = affiliate.phoneNumber;
                if (affiliate.state) updateData.state = affiliate.state;
                if (affiliate.municipio) updateData.municipio = affiliate.municipio;
                if (affiliate.parroquia) updateData.parroquia = affiliate.parroquia;
                if (affiliate.type) updateData.type = affiliate.type;
                if (affiliate.status !== undefined) updateData.status = affiliate.status;

                // Update with selected category ID
                if (this.selectedCategory && this.selectedCategory.id) {
                    updateData.category_id = this.selectedCategory.id;  // Save the category ID
                }

                // Only proceed if there is something to update
                if (Object.keys(updateData).length > 0) {
                    const userRef = dbRef(db, `Users/${affiliate.id}`);
                    await update(userRef, updateData);

                    // Update email via Cloud Function if the email is changed
                    const newEmail = affiliate.email;
                    if (newEmail) {

                        const updateEmailFunction = httpsCallable(functions, 'updateUserEmail');
                        await updateEmailFunction({ uid: affiliate.id, newEmail });
                    }

                    // Close the modal after saving
                    const modal = Modal.getInstance(document.getElementById('editAffiliateModal'));
                    modal.hide();
                    this.fetchAffiliates();

                    Toastify({
                        text: "Información actualizada!",
                        duration: 3000,
                        close: true,
                        gravity: 'top',
                        position: 'right',
                        stopOnFocus: true,
                        style: {
                            background: 'linear-gradient(to right, #00b09b, #96c93d)',
                        },
                    }).showToast();
                    this.selectedCategory = null;
                } else {
                    alert('No hay campos para actualizar.');
                }
            } catch (error) {
                console.error('Error updating info:', error);
                alert('La actualizacion de datos falló.');
            }
            finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        editImage(affiliate) {
            affiliate.isEditing = !affiliate.isEditing; // Toggle the editing state
            if (!affiliate.isEditing) {
                affiliate.updatedImagePreview = null; // Clear the preview if toggled off
                affiliate.imageFile = null; // Clear the file if toggled off
            }
        },
        async updateImage(affiliate) {
            if (!affiliate.imageFile) {
                alert('No hay imagen nueva para subir.');
                return;
            }

            try {
                affiliate.isSubmitting = true; // Show spinner

                let imageUrl = affiliate.image; // Preserve the existing image if no new image

                if (affiliate.imageFile) {
                    // Delete the old image from storage if it exists
                    if (imageUrl) {
                        const oldImagePath = imageUrl.split('?')[0]; // Remove query params
                        const oldImageFileName = oldImagePath.substring(oldImagePath.lastIndexOf('/') + 1);

                        const oldImageRef = storageRef(storage, `Logos/${affiliate.name}/${oldImageFileName}`);
                        try {
                            await deleteObject(oldImageRef); // delete the old image 
                            console.log(`Deleted old image: ${oldImageFileName}`);
                        } catch (deleteError) {
                            console.warn(`Failed to delete old image: ${deleteError.message}`);
                        }
                    }

                    // Upload new image
                    imageUrl = await this.uploadImageToStorage(affiliate.imageFile, affiliate);
                }

                if (imageUrl) {
                    // Update the affiliate data with the new image URL
                    const userRef = dbRef(db, `Users/${affiliate.id}`);
                    await update(userRef, { image: imageUrl });

                    // Reset fields after successful upload
                    affiliate.image = imageUrl;
                    affiliate.isEditing = false;
                    affiliate.updatedImagePreview = null;
                    affiliate.imageFile = null;

                    // Optionally, display a success message
                    Toastify({
                        text: "Imagen actualizada!",
                        duration: 3000,
                        close: true,
                        gravity: 'top',
                        position: 'right',
                        stopOnFocus: true,
                        style: {
                            background: 'linear-gradient(to right, #00b09b, #96c93d)',
                        },
                    }).showToast();
                }
            } catch (error) {
                console.error('Error updating image:', error);
                alert('Error al actualizar la imagen.');
            } finally {
                affiliate.isSubmitting = false; // Hide spinner
            }
        },

        // Create and delete functions
        async createAffiliate() {
            if (!this.affiliate.name || !this.affiliate.rif || !this.affiliate.email || !this.affiliate.state || !this.affiliate.municipio || !this.affiliate.parroquia) {
                alert('Por favor, complete todos los campos obligatorios.');
                return;
            }

            try {
                this.isSubmitting = true;

                // CategoryId
                let categoryId = this.selectedCategory ? this.selectedCategory.id : null;

                // Check if an image was selected for upload and get URL
                let imageUrl = null;
                if (this.imageFile) {
                    const sanitizedAffiliateName = this.affiliate.name.trim().toLowerCase().replace(/\s+/g, '-');
                    const fileExtension = this.imageFile.name.split('.').pop(); // Get the file extension
                    const fileName = `${sanitizedAffiliateName}-logo.${fileExtension}`; // Create the final file name

                    const imageFileRef = storageRef(storage, `Logos/${this.affiliate.name}/${fileName}`);
                    await uploadBytes(imageFileRef, this.imageFile);
                    imageUrl = await getDownloadURL(imageFileRef);
                }

                // Prepare the data for submission
                const userData = {
                    companyName: this.affiliate.name,
                    rif: this.affiliate.rif,
                    email: this.affiliate.email,
                    role: 'afiliado',
                    state: this.affiliate.state,
                    municipio: this.affiliate.municipio,
                    parroquia: this.affiliate.parroquia
                };

                if (categoryId) {
                    userData.category_id = categoryId;
                }
                if (imageUrl) {
                    userData.image = imageUrl;
                }
                if (this.affiliate.status) {
                    userData.status = this.affiliate.status;
                }
                if (this.affiliate.phoneNumber) {
                    userData.phoneNumber = this.affiliate.phoneNumber;
                }

                // Call Cloud Function to create the client
                const createAffiliateFunction = httpsCallable(functions, 'createUser');
                const response = await createAffiliateFunction({ userData });

                if (response.data.success) {
                    Toastify({
                        text: "Nuevo Comercio Afiliado registrado con exito! Se ha enviado la contraseña al correo.",
                        duration: 3000,
                        close: true,
                        gravity: "top",
                        position: "right",
                        stopOnFocus: true,
                        style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
                    }).showToast();

                    // Reset form
                    this.resetForm();
                    this.fetchAffiliates();
                } else {
                    alert('Error al crear al afiliado: ' + response.data.message);
                }
            } catch (error) {
                console.error("Error creating affiliate:", error);
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        async deleteAffiliate(affiliate, index) {
            console.log(affiliate.id);
            // Confirmation dialog
            if (confirm("¿Desea borrar este afiliado?")) {
                // User clicked "OK"

                try {
                    // Call the Cloud Function to delete the user from Authentication
                    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
                    deleteUserFunction({ uid: affiliate.id });

                    // Remove affiliate from the database
                    const affiliateRef = dbRef(db, `Users/${affiliate.id}`);
                    remove(affiliateRef);

                    // Remove Affiliate ImageLogo from Storage
                    if (affiliate.image) {
                        const fileRef = storageRef(storage, affiliate.image);
                        await deleteObject(fileRef);
                        console.log(`${affiliate.image} deleted successfully.`);
                    }

                    // Show success toast
                    Toastify({
                        text: "Afiliado eliminado.",
                        duration: 3000,
                        close: true,
                        gravity: "top",
                        position: "right",
                        stopOnFocus: true,
                        style: {
                            background: "linear-gradient(to right, #db231d, #96c93d)",
                        },
                    }).showToast();

                    // Remove the client from the UI
                    this.fetchAffiliates();
                    this.affiliates.splice(index, 1);

                } catch (error) {
                    console.error('Error deleting affiliate:', error);
                }
            }
        },

        resetForm() {
            // Reset form fields
            this.affiliate = {
                name: '',
                rif: '',
                status: false,
                email: '',
                phoneNumber: '',
                address: '',
                sector: '',
                imageFile: null
            };
            // Reset image upload state if there's one
            this.uploadImage = false;
            this.imagePreview = null;
            this.selectedCategory = null;
        },

        // Handle image upload
        previewImage(event) {
            const file = event.target.files[0];
            if (file) {
                this.imageFile = file;
                this.imagePreview = URL.createObjectURL(file);
            }
        },
        async uploadImageToStorage(imageFile, affiliate) {
            let imageUrl = null;
            try {
                // Create a file name based on the affiliate's name
                const sanitizedAffiliateName = affiliate.name.trim().toLowerCase().replace(/\s+/g, '-');
                const fileName = `${sanitizedAffiliateName}-logo.${imageFile.name.split('.').pop()}`; // Keep original file extension

                const sRef = storageRef(storage, `Logos/${affiliate.name}/${fileName}`);

                const uploadResult = await uploadBytes(sRef, imageFile);
                imageUrl = await getDownloadURL(uploadResult.ref);
            } catch (error) {
                console.error('Error uploading image:', error);
            }

            return imageUrl;
        },
        previewUpdatedImage(event, affiliate) {
            const file = event.target.files[0];
            if (file) {
                affiliate.imageFile = file;
                affiliate.updatedImagePreview = URL.createObjectURL(file);
            }
        },

        // Categories
        async fetchCategories() {
            // Clear the categories array to prevent duplicates
            this.categories = [];

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
                // Set the first category as active
                // if (this.categories.length > 0) {
                // 	this.categories[0].active = true;
                // }
            } else {
                console.log("No data available");
            }
            this.modalData = [...this.categories];
        },
        async manageCategories() {

            await this.fetchCategories();

            this.modalData = this.categories.slice();

            // Open the modal
            const modal = new Modal(document.getElementById('manageCategoriesModal'));
            modal.show();
        },
        async createCategory() {

            const categoryRef = dbRef(db, 'Affiliate_categories');
            try {
                // Push new category to Firebase Realtime Database
                await push(categoryRef, {
                    name: this.newCategory,
                });

                // Show success notification
                Toastify({
                    text: "Categoria agregada con exito!",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    stopOnFocus: true,
                    style: {
                        background: "linear-gradient(to right, #00b09b, #96c93d)",
                    },
                }).showToast();

                // Hide the 'Add Category' modal
                const addCategoryModal = Modal.getInstance(document.getElementById('addCategoryModal'));
                if (addCategoryModal) addCategoryModal.hide();

                // Show the 'Manage Categories' modal again
                const manageCategoriesModal = Modal.getOrCreateInstance(document.getElementById('manageCategoriesModal'));
                manageCategoriesModal.show();

                // Refresh categories after adding a new one
                await this.fetchCategories();  // Ensure this fetches the data correctly and updates modalData

            } catch (e) {
                console.error("Ocurrio un error: ", e);
                return null;
            }
        },
        toggleEditing(categoryId) {
            // Set the editing category to the category's ID
            this.editingCategoryId = categoryId;
        },
        cancelEditing() {
            // Reset the editing state
            this.editingCategoryId = null;
        },
        async updateCategory(categoryId) {
            const categoryRef = dbRef(db, `Affiliate_categories/${categoryId}`);

            try {
                // Get the category name from the corresponding category in modalData
                const categoryToUpdate = this.modalData.find(category => category.id === categoryId);
                if (categoryToUpdate) {
                    await set(categoryRef, {
                        name: categoryToUpdate.name,
                    });
                    // Show success notification
                    Toastify({
                        text: "Categoría actualizada con éxito!",
                        duration: 3000,
                        close: true,
                        gravity: "top",
                        position: "right",
                        stopOnFocus: true,
                        style: {
                            background: "linear-gradient(to right, #00b09b, #96c93d)",
                        },
                    }).showToast();
                    this.fetchCategories();
                    this.editingCategoryId = false;
                }
            } catch (e) {
                console.error("Ocurrió un error al actualizar la categoría: ", e);
                Toastify({
                    text: "Error al actualizar la categoría.",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    stopOnFocus: true,
                    style: {
                        background: "linear-gradient(to right, #ff0000, #ff7f50)", // Red gradient for error
                    },
                }).showToast();
            }
        },
        async deleteCategory(categoryId) {
            // Confirmation dialog
            if (confirm("¿Desea borrar esta categoria?")) {
                // User clicked "OK"

                const categoryRef = dbRef(db, `Affiliate_categories/${categoryId}`);

                try {
                    await remove(categoryRef);
                    // Remove category from the local modalData array
                    this.modalData = this.modalData.filter(cat => cat.id !== categoryId);
                    // Show success notification
                    Toastify({
                        text: "Categoría eliminada con éxito!",
                        duration: 3000,
                        close: true,
                        gravity: "top",
                        position: "right",
                        stopOnFocus: true,
                        style: {
                            background: "linear-gradient(to right, #00b09b, #ff0000)", // Red gradient for success
                        },
                    }).showToast();

                } catch (e) {
                    console.error("Ocurrió un error al eliminar la categoría: ", e);
                    Toastify({
                        text: "Error al eliminar la categoría.",
                        duration: 3000,
                        close: true,
                        gravity: "top",
                        position: "right",
                        stopOnFocus: true,
                        style: {
                            background: "linear-gradient(to right, #ff0000, #ff7f50)", // Red gradient for error
                        },
                    }).showToast();
                }
            }

        },
        addCategory() {
            // Open the modal
            const modal = new Modal(document.getElementById('addCategoryModal'));
            modal.show();
        },
    }
}
</script>
<template>
    <h2 class="mb-4 text-center text-uppercase fw-bold">
        Comercios Afiliados
    </h2>

    <div v-if="this.role === 'admin'" class="container">
        <div class="row">
            <div class="col justify-content-start align-items-center">
                <a href="#" class="btn btn-theme" style="margin: 14px;" @click="manageCategories()">
                    <i class="fa fa-list fa-fw me-1"></i> Administrar categorias
                </a>
            </div>

            <div class="col d-flex justify-content-end align-items-center">
                <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#addAffiliateModal"
                    style="margin: 14px;">
                    <i class="fa fa-plus-circle fa-fw me-1"></i> Agregar Afiliado
                </a>
            </div>
        </div>

        <!-- Display Affiliates -->
        <div class="container-fluid mt-2">
            <div class="row">

                <div v-if="affiliates.length === 0" class="d-flex justify-content-center align-items-center"
                    style="height: 100vh;">
                    <div class="text-center">
                        <div class="mb-3 mt-5">
                            <i class="fa fa-building text-body text-opacity-25" style="font-size: 5em"></i>
                        </div>
                        <h5>No hay Comercios Afiliados registrados.</h5>
                    </div>
                </div>
                <div v-else>

                    <!-- Filters -->
                    <div class="row mb-4">
                        <!-- Filters -->
                        <div class="d-flex justify-content-end flex-wrap mt-3">
                            <div v-if="!filterAffiliates" class="btn btn-theme me-2 mb-2"
                                @click.prevent="habilitateFilters()">
                                <i class="fa-solid fa-filter"></i>
                                Filtrar comercios
                            </div>
                            <div v-else class="btn btn-theme me-2 mb-2" @click.prevent="habilitateFilters()">
                                <i class="fa-solid fa-filter"></i>
                                Limpiar filtros
                            </div>

                            <div v-if="filterAffiliates" class="dropdown mb-2 me-2">
                                <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                                    id="filterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
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
                                <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                                    id="filterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
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

                    <div class="row">
                        <div v-for="(affiliate, index) in filteredAffiliates" :key="affiliate.id"
                            class="col-12 col-sm-6 col-md-4 mb-4">
                            <div class="card h-100 position-relative">
                                <div class="img-container position-relative">
                                    <!-- Image Display -->
                                    <div v-if="!affiliate.updatedImagePreview" class="img"
                                        :style="{ backgroundImage: 'url(' + affiliate.image + ')' }">
                                        <button class="btn btn-sm btn-outline-info me-1 edit-button"
                                            data-bs-toggle="tooltip" data-bs-placement="top" title="Editar imagen"
                                            @click="editImage(affiliate)">
                                            <i class="fa-solid fa-pencil"></i>
                                        </button>
                                    </div>

                                    <!-- Image Edit: File Input -->
                                    <div v-if="affiliate.isEditing">
                                        <div v-if="affiliate.updatedImagePreview" class="mt-2">
                                            <img :src="affiliate.updatedImagePreview" class="img" alt="preview">
                                            <!-- Button to confirm the image update -->
                                            <button class="btn btn-sm btn-outline-success mt-2 mb-2 edit-button"
                                                @click="updateImage(affiliate)" :disabled="affiliate.isSubmitting">
                                                <i class="fa-solid fa-check"></i>
                                            </button>
                                        </div>
                                        <input type="file" @change="event => previewUpdatedImage(event, affiliate)"
                                            class="form-control" />
                                    </div>
                                    <!-- Loader Spinner for only the current affiliate being updated -->
                                    <div v-if="affiliate.isSubmitting"
                                        class="spinner-overlay d-flex justify-content-center align-items-center">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Cargando...</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title text-truncate">{{ affiliate.name }}</h5>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" :id="'affiliate' + index"
                                                v-model="affiliate.status" disabled />
                                            <label class="form-check-label" :for="'affiliate' + index">
                                                {{ affiliate.status ? 'Activo' : 'Inactivo' }}
                                            </label>
                                        </div>
                                    </div>
                                    <div class="d-flex justify-content-end mt-2">
                                        <button class="btn btn-sm btn-outline-info me-1" data-bs-toggle="tooltip"
                                            data-bs-placement="top" title="Editar comercio"
                                            @click="editAffiliate(affiliate), fetchCategories()">
                                            <i class="fa-solid fa-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger"
                                            @click="deleteAffiliate(affiliate, index)">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for Adding New Affiliate -->
        <div class="modal fade" id="addAffiliateModal" tabindex="-1" aria-labelledby="addAffiliateModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addAffiliateModalLabel">Agregar Afiliado</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
                            @click="resetForm()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container">
                            <div class="row">
                                <!-- Categoria -->
                                <div class="mb-3">
                                    <div class="dropdown">
                                        <button class="btn btn-secondary dropdown-toggle" type="button"
                                            id="dropdownMenuCategory" data-bs-toggle="dropdown" aria-expanded="false">
                                            {{ selectedCategory ? selectedCategory.name : 'Seleccione...' }}
                                        </button>
                                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                                            <li v-if="categories.length === 0">
                                                <p style="margin: 10px;">No hay categorias registradas.</p>
                                            </li>
                                            <li v-for="category in categories" :key="category.id">
                                                <a class="dropdown-item" href="#"
                                                    @click="setSelectedCategory(category)">
                                                    {{ category.name }}
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <!-- Affiliate Name -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="affiliateName" class="form-label">Nombre <span
                                            class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="affiliateName" v-model="affiliate.name"
                                        required />
                                </div>
                                <!-- RIF -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="affiliateRif" class="form-label">RIF <span
                                            class="text-danger">*</span></label>
                                    <input class="form-control" id="affiliateRif" v-model="affiliate.rif" required />
                                </div>
                                <!-- Email -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="affiliateEmail" class="form-label">Email <span
                                            class="text-danger">*</span></label>
                                    <input class="form-control" id="affiliateEmail" v-model="affiliate.email"
                                        required />
                                </div>
                            </div>
                            <div class="row">
                                <!-- Phone Number -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="affiliatePhone" class="form-label">Teléfono</label>
                                    <input class="form-control" id="affiliatePhone" v-model="affiliate.phoneNumber" />
                                </div>
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label class="form-label">Estado <span class="text-danger">*</span></label>
                                    <select v-model="affiliate.state" @change="displayMunicipios(affiliate.state)"
                                        class="form-control mb-2">
                                        <option value="" disabled selected>Selecciona un estado</option>
                                        <option v-for="(state, index) in venezuelanStates" :key="index" :value="state">
                                            {{ state }}
                                        </option>
                                    </select>
                                    <label class="form-label">Municipio <span class="text-danger">*</span></label>
                                    <select v-model="affiliate.municipio"
                                        @change="displayParroquias(affiliate.municipio)" class="form-control mb-2">
                                        <option value="" disabled selected>Selecciona un municipio</option>
                                        <option v-for="(municipio, index) in municipios" :key="index"
                                            :value="municipio">
                                            {{ municipio }}
                                        </option>
                                    </select>
                                    <label class="form-label">Parroquia <span class="text-danger">*</span></label>
                                    <select v-model="affiliate.parroquia" class="form-control mb-2">
                                        <option value="" disabled selected>Selecciona una parroquia</option>
                                        <option v-for="(parroquia, index) in parroquias" :key="index"
                                            :value="parroquia">
                                            {{ parroquia }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <p>(<span class="text-danger">*</span>) Campos obligatorios.</p>
                            <div class="row">
                                <!-- Affiliate Status -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <div class="form-check mt-4">
                                        <input type="checkbox" class="form-check-input" id="affiliateStatus"
                                            v-model="affiliate.status" />
                                        <label class="form-check-label" for="affiliateStatus">Activo</label>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <!-- Upload Image Checkbox -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
                                            v-model="uploadImage">
                                        <label class="form-check-label" for="uploadImageCheckbox">Subir imagen</label>
                                    </div>
                                </div>
                            </div>

                            <!-- Image Upload -->
                            <div class="row" v-if="uploadImage">
                                <div class="col-md-12 mb-3">
                                    <label for="menuItemImg" class="form-label">Imagen</label>
                                    <input type="file" class="form-control" id="menuItemImg" @change="previewImage"
                                        accept="image/*">
                                    <div v-if="imagePreview" class="mt-2">
                                        <img :src="imagePreview" class="img-thumbnail" alt="preview"
                                            style="max-height: 200px;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
                            @click="resetForm()">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="createAffiliate()"
                            :disabled="isSubmitting">Guardar</button>
                        <!-- Loader Spinner -->
                        <div v-if="isSubmitting" class="d-flex justify-content-center my-3">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for Editing Affiliate -->
        <div class="modal fade" id="editAffiliateModal" tabindex="-1" aria-labelledby="editAffiliateModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editAffiliateModalLabel">Editar Afiliado</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container">
                            <div class="row">
                                <!-- Categoria -->
                                <div class="mb-3">
                                    <label for="categoryDropdown" class="form-label">Categoria</label>
                                    <div class="dropdown" id="categoryDropdown">
                                        <button class="btn btn-secondary dropdown-toggle" type="button"
                                            id="dropdownEditMenuCategory" data-bs-toggle="dropdown"
                                            aria-expanded="false">
                                            {{ selectedCategory ? selectedCategory.name : editData.categoryName }}
                                        </button>
                                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                                            <li v-if="categories.length === 0">
                                                <p style="margin: 10px;">No hay categorias registradas.</p>
                                            </li>
                                            <li v-for="category in categories" :key="category.id">
                                                <a class="dropdown-item" href="#"
                                                    @click="setSelectedCategory(category)">
                                                    {{ category.name }}
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <!-- Affiliate Name -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="editAffiliateName" class="form-label">Nombre</label>
                                    <input type="text" class="form-control" id="editAffiliateName"
                                        v-model="editData.name" />
                                </div>
                                <!-- RIF -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="editAffiliateRif" class="form-label">RIF</label>
                                    <input class="form-control" id="editAffiliateRif" v-model="editData.rif" />
                                </div>
                                <!-- Email -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="editAffiliateEmail" class="form-label">Email</label>
                                    <input class="form-control" id="editAffiliateEmail" v-model="editData.email" />
                                </div>
                                <!-- Phone Number -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="editAffiliatePhone" class="form-label">Teléfono</label>
                                    <input class="form-control" id="editAffiliatePhone"
                                        v-model="editData.phoneNumber" />
                                </div>
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label class="form-label">Estado</label>
                                    <select v-model="editData.state" @change="displayMunicipios(editData.state)"
                                        class="form-control mb-2">
                                        <option value="" disabled selected>Selecciona un estado</option>
                                        <option v-for="(state, index) in venezuelanStates" :key="index" :value="state">
                                            {{ state }}
                                        </option>
                                    </select>
                                    <label class="form-label">Municipio</label>
                                    <select v-model="editData.municipio" @change="displayParroquias(editData.municipio)"
                                        class="form-control mb-2">
                                        <option value="" disabled selected>Selecciona un municipio</option>
                                        <option v-for="(municipio, index) in municipios" :key="index"
                                            :value="municipio">
                                            {{ municipio }}
                                        </option>
                                    </select>
                                    <label class="form-label">Parroquia</label>
                                    <select v-model="editData.parroquia" class="form-control mb-2">
                                        <option value="" disabled selected>Selecciona una parroquia</option>
                                        <option v-for="(parroquia, index) in parroquias" :key="index"
                                            :value="parroquia">
                                            {{ parroquia }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <!-- Affiliate Status -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <div class="form-check mt-4">
                                        <input type="checkbox" class="form-check-input" id="editAffiliateStatus"
                                            v-model="editData.status" />
                                        <label class="form-check-label" for="editAffiliateStatus">Activo</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="updateAffiliate(editData)"
                            :disabled="isSubmitting">Guardar</button>
                        <!-- Loader Spinner -->
                        <div v-if="isSubmitting" class="d-flex justify-content-center my-3">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for Managing Categories -->
        <div class="modal fade" id="manageCategoriesModal" tabindex="-1" aria-labelledby="editAffiliateModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="manageCategoriesModalLabel">Administrar categorias</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container">
                            <table class="table text-center table-responsive">
                                <thead>
                                    <tr>
                                        <th scope="col">Categoría</th>
                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="category in modalData" :key="category.id">
                                        <td v-if="editingCategoryId === category.id"><input type="text"
                                                class="form-control" v-model="category.name"></td>
                                        <td v-else>{{ category.name }}</td>
                                        <td>
                                            <button v-if="editingCategoryId === category.id"
                                                class="btn btn-sm btn-outline-success me-1" data-bs-toggle="tooltip"
                                                data-bs-placement="top" title="actualizar comercio"
                                                @click="updateCategory(category.id)">
                                                <i class="fa-solid fa-check"></i>
                                            </button>
                                            <button v-else class="btn btn-sm btn-outline-success me-1"
                                                data-bs-toggle="tooltip" data-bs-placement="top"
                                                title="Editar categoria" @click="toggleEditing(category.id)">
                                                <i class="fa-solid fa-pencil"></i>
                                            </button>
                                            <button v-if="editingCategoryId === category.id" @click="cancelEditing()"
                                                class="btn btn-sm btn-outline-danger">
                                                <i class="fa-solid fa-times"></i>
                                            </button>
                                            <button v-else class="btn btn-sm btn-outline-danger"
                                                @click="deleteCategory(category.id, index)">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-primary" @click="addCategory">Agregar Categoría</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal to add new category -->
        <div class="modal fade" id="addCategoryModal" tabindex="-1" aria-labelledby="addCategoryModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addCategoryModalLabel">Nueva categoria</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <input id="newCategory" type="text" class="form-control" v-model="newCategory"
                                aria-label="Monto" aria-describedby="value-addon">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="createCategory()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="this.role === 'cliente'" class="container">
        <!-- Display Affiliates -->
        <div class="container-fluid">
            <div class="row">
                <div class="col-12 justify-content-center text-center">
                    <div class="alert alert-info d-inline-flex align-items-center mt-2" role="alert"
                        style="width: 50%;">
                        <i class="fa-solid fa-info-circle me-2"></i>
                        <div>
                            Aca puedes explorar los Comercios en los que puedes canjear tus cupones proporcionados por
                            Rose App.
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-5">
                <!-- Filters -->
                <div class="d-flex justify-content-end flex-wrap mt-3">
                    <div v-if="!filterAffiliates" class="btn btn-theme me-2 mb-2" @click.prevent="habilitateFilters()">
                        <i class="fa-solid fa-filter"></i>
                        Filtrar comercios
                    </div>
                    <div v-else class="btn btn-theme me-2 mb-2" @click.prevent="habilitateFilters()">
                        <i class="fa-solid fa-filter"></i>
                        Limpiar filtros
                    </div>

                    <div v-if="filterAffiliates" class="dropdown mb-2 me-2">
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                            id="filterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
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
                        <button class="btn btn-theme dropdown-toggle me-2 w-100 w-md-auto" type="button"
                            id="filterDropdown" data-bs-toggle="dropdown" aria-expanded="false">
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

            <div class="row">
                <div v-if="filteredAffiliates.length === 0" class="d-flex justify-content-center align-items-center"
                    style="height: 100vh;">
                    <div class="text-center">
                        <div class="mb-3 mt-n5">
                            <i class="fa fa-building text-body text-opacity-25" style="font-size: 5em"></i>
                        </div>
                        <h5>No hay Comercios Afiliados registrados en el estado seleccionado.</h5>
                    </div>
                </div>

                <div v-else>
                    <!-- Loop through filtered affiliates -->
                    <div class="row">
                        <div v-for="affiliate in filteredAffiliates" :key="affiliate.id"
                            class="col-12 col-sm-6 col-md-4 mb-4">
                            <div class="card h-100 position-relative">
                                <div class="img-container position-relative">
                                    <div class="img" :style="{ backgroundImage: 'url(' + affiliate.image + ')' }"></div>
                                </div>
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title text-truncate">{{ affiliate.name }}</h5>
                                    <p class="card-text text-truncate flex-grow-1">
                                        <i class="fa-brands fa-whatsapp fa-lg"></i>
                                        {{ affiliate.phoneNumber }}
                                    </p>
                                    <p class="card-text text-truncate flex-grow-1">{{ affiliate.state }}</p>
                                    <p class="card-text text-truncate flex-grow-1">
                                        <i class="fa-solid fa-location-dot"></i>
                                        {{ affiliate.address ? affiliate.address : affiliate.municipio }}
                                    </p>
                                </div>
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
}

.img {
    position: relative;
    background-size: cover;
    background-position: center;
    width: 100%;
    height: 200px;
    border-radius: 5px;
}

/* Edit button just for images */
.edit-button {
    position: absolute;
    top: 10px;
    /* Adjust this value to control vertical spacing */
    right: 10px;
    /* Adjust this value to control horizontal spacing */
    z-index: 1;
    /* Ensure the button is above the image */
}

.w-100px {
    width: 100px;
}

.img-container {
    position: relative;
    height: 200px;
    background-size: cover;
    background-position: center;
}

.spinner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.6);
    /* Light overlay to make spinner visible */
    z-index: 10;
    /* Ensure the spinner is on top of the image */
}
</style>