<script>
import { ref as dbRef, query, orderByChild, equalTo, get, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, functions } from '@/firebase/init';
import { httpsCallable } from 'firebase/functions';
import { Modal } from 'bootstrap';
import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

export default {
    data() {
        return {
            affiliate: {
                name: '',
                rif: '',
                status: false,
                email: '',
                phoneNumber: '',
                // address: '',
                // sector: '',
            },
            // sectores:
            //     [
            //         "Santa Lucía",
            //         "Veritas",
            //         "Cecilio Acosta",
            //         "La Lago",
            //         "El Milagro",
            //         "La Paragua",
            //         "El Tránsito",
            //         "Amparo",
            //         "Grano de Oro",
            //         "Cañada Honda"
            //     ],
            affiliates: [],
            currentEditing: null,
            imageFile: null,
            uploadImage: false,
            imagePreview: null,
            updatedImagePreview: null,
        }
    },
    async mounted() {
        this.fetchAffiliates();
    },
    methods: {
        async fetchAffiliates() {
            const role = 'afiliado';
            const affiliatesRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const affiliateSnapshot = await get(affiliatesRef);

                if (affiliateSnapshot.exists()) {
                    const affiliatesList = [];
                    affiliateSnapshot.forEach((childSnapshot) => {
                        const affiliateData = childSnapshot.val();
                        affiliatesList.push({
                            id: childSnapshot.key,
                            name: affiliateData.companyName,
                            rif: affiliateData.rif,
                            status: affiliateData.status,
                            image: affiliateData.image,
                            isSubmitting: false,
                        });
                    });

                    this.affiliates = affiliatesList;
                } else {
                    console.log("No data available.");
                }
            } catch (error) {
                console.error("Error fetching affiliates:", error);
            }
        },
        async createAffiliate() {
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
                status: this.affiliate.status,
                email: this.affiliate.email,
                phoneNumber: this.affiliate.phoneNumber,
                // address: this.affiliate.address,
                // sector: this.affiliate.sector,
                role: 'afiliado'
            };

            if (imageUrl) {
                userData.image = imageUrl;
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

            // Reset form
            this.resetForm();
        },
        async updateAffiliate(affiliate) {
            try {
                affiliate.isSubmitting = true;

                // Create an updateData object, but only include non-empty fields
                const updateData = {};
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
                    affiliate.imageFile = null; // Clear the file after upload
                }

                // Conditionally update fields if they are provided
                if (affiliate.name) updateData.companyName = affiliate.name;
                if (affiliate.rif) updateData.rif = affiliate.rif;
                if (affiliate.status !== undefined) updateData.status = affiliate.status;
                if (imageUrl) updateData.image = imageUrl; // Include image URL if updated

                // Only proceed if there is something to update
                if (Object.keys(updateData).length > 0) {
                    const userRef = dbRef(db, `Users/${affiliate.id}`);
                    await update(userRef, updateData);

                    this.toggleEdit(affiliate);
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
                } else {
                    alert('No hay campos para actualizar.');
                }
            } catch (error) {
                console.error('Error updating info:', error);
                alert('La actualizacion de datos falló.');
            }
            finally {
                // Hide the loader
                affiliate.isSubmitting = false;
            }
        },
        deleteAffiliate(affiliate, index) {
            // Confirmation dialog
            if (confirm("¿Desea borrar este afiliado?")) {
                // User clicked "OK"

                try {
                    // Call the Cloud Function to delete the user from Authentication
                    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
                    deleteUserFunction({ uid: affiliate.uid });
                    console.log('Deleted from authentication: ', affiliate.email);

                    // Remove affiliate from the database
                    const affiliateRef = dbRef(db, `Users/${affiliate.uid}`);

                    remove(affiliateRef);
                    console.log('Deleted from database: ', affiliate.companyName);

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
        },
        toggleEdit(affiliate) {
            affiliate.isEditing = !affiliate.isEditing;
            if (!affiliate.isEditing) {
                affiliate.imageFile = null; // Reset the imageFile when exiting edit mode
                affiliate.updatedImagePreview = null;
            }
        },
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
    }
}
</script>
<template>
    <div class="container">
        <h2 class="mb-4 text-center text-uppercase fw-bold">
            Comercios Afiliados
        </h2>

        <div class="d-flex justify-content-end align-items-center">
            <a href="#" class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#addAffiliateModal"
                style="margin: 14px;">
                <i class="fa fa-plus-circle fa-fw me-1"></i> Agregar Afiliado
            </a>
        </div>

        <!-- Display Affiliates -->
        <div class="container-fluid">
            <div class="row">
                <div v-if="affiliates.length === 0" class="d-flex justify-content-center align-items-center"
                    style="height: 100vh;">
                    <div class="text-center">
                        <div class="mb-3 mt-n5">
                            <i class="fa fa-building text-body text-opacity-25" style="font-size: 5em"></i>
                        </div>
                        <h5>No hay Comercios Afiliados registrados.</h5>
                    </div>
                </div>
                <div v-else>
                    <!-- Loop through affiliates and display them in cards -->
                    <div class="row">
                        <div v-for="(affiliate, index) in affiliates" :key="affiliate.id"
                            class="col-12 col-sm-6 col-md-4 mb-4">
                            <div class="card h-100 position-relative">
                                <div class="img-container position-relative">
                                    <!-- Image Display -->
                                    <div v-if="!affiliate.updatedImagePreview" class="img"
                                        :style="{ backgroundImage: 'url(' + affiliate.image + ')' }"></div>

                                    <!-- Image Edit: File Input -->
                                    <div v-if="affiliate.isEditing">
                                        <div v-if="affiliate.updatedImagePreview" class="mt-2">
                                            <img :src="affiliate.updatedImagePreview" class="img-thumbnail"
                                                alt="preview" style="max-height: 200px;">
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
                                    <p class="card-text text-truncate flex-grow-1">{{ affiliate.rif }}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" :id="'affiliate' + index"
                                                v-model="affiliate.status" :disabled="!affiliate.isEditing" />
                                            <label class="form-check-label" :for="'affiliate' + index">
                                                {{ affiliate.status ? 'Activo' : 'Inactivo' }}
                                            </label>
                                        </div>
                                        <div>
                                            <button class="btn btn-sm btn-primary w-100 mb-1"
                                                @click="toggleEdit(affiliate)">
                                                <i class="fa-solid fa-pen-to-square"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger w-100"
                                                @click="deleteAffiliate(affiliate, index)">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Edit Mode -->
                                <div v-if="affiliate.isEditing" class="p-3">
                                    <input v-model="affiliate.name" class="form-control mb-2"
                                        placeholder="Nombre del afiliado" />
                                    <input v-model="affiliate.rif" class="form-control mb-2"
                                        placeholder="RIF del afiliado" />
                                    <button class="btn btn-sm btn-success w-100" @click="updateAffiliate(affiliate)"
                                        :disabled="affiliate.isSubmitting">Actualizar</button>
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
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container">
                            <div class="row">
                                <!-- Affiliate Name -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="affiliateName" class="form-label">Nombre</label>
                                    <input type="text" class="form-control" id="affiliateName"
                                        v-model="affiliate.name" />
                                </div>
                                <!-- RIF -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="affiliateRif" class="form-label">RIF</label>
                                    <input class="form-control" id="affiliateRif" v-model="affiliate.rif" />
                                </div>
                                <!-- Email -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="affiliateEmail" class="form-label">Email</label>
                                    <input class="form-control" id="affiliateEmail" v-model="affiliate.email" />
                                </div>
                            </div>
                            <div class="row">
                                <!-- Phone Number -->
                                <div class="col-md-4 col-sm-6 mb-3">
                                    <label for="affiliatePhone" class="form-label">Teléfono</label>
                                    <input class="form-control" id="affiliatePhone" v-model="affiliate.phoneNumber" />
                                </div>
                            </div>
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
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-theme" @click="createAffiliate()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.img {
    background-size: cover;
    background-position: center;
    width: 100%;
    height: 200px;
    border-radius: 5px;
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