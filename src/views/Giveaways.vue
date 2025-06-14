<script>
import {
  ref as dbRef,
  query,
  orderByChild,
  equalTo,
  set,
  get,
  push,
  update,
  remove,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/firebase/init";
import { Modal } from "bootstrap";
import { showToast } from "@/utils/toast";
import "toastify-js/src/toastify.css";
import { useUserStore } from "@/stores/user-role";
import PageHeader from '@/components/app/PageHeader.vue';

export default {
  components: {
    PageHeader
  },
  data() {
    return {
      // Logged User data
      userId: "",
      role: "",

      giveaways: [],

      subscriptions: [],
      affiliates: [],

      giveaway: {
        name: "",
        desc: "",
        status: false,
        date: null,
      },
      selectedAffiliateIds: [],
      selectedSubscriptionsIds: [],

      filteredGiveaways: [],

      imageFile: null,
      uploadImage: false,
      imagePreview: null,
      updatedImagePreview: null,
      isSubmitting: false,
      loading: false,
    };
  },
  async mounted() {
    const userStore = useUserStore();
    userStore.fetchUser();
    this.role = userStore.role;
    this.userId = userStore.userId;

    await this.fetchGiveaways();

    if (this.role === "cliente") {
      await this.fetchFilteredGiveaways();
    }
  },
  methods: {
    formatDate(date) {
      if (!date) return ""; // Handle invalid dates or null values
      const d = new Date(date);
      const localDateDay = new Date(
        d.getTime() + d.getTimezoneOffset() * 60000
      );
      const day = String(localDateDay.getDate()).padStart(2, "0"); // Ensure two-digit day
      const month = String(d.getUTCMonth() + 1).padStart(2, "0"); // Ensure two-digit month (months are zero-indexed)
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    },
    resetForm() {
      // Reset form fields
      this.giveaway = {
        name: "",
        desc: "",
        status: false,
        date: new Date(),
      };
      this.selectedAffiliateIds = [];
      this.selectedSubscriptionsIds = [];
      // Reset image upload state if there's one
      this.uploadImage = false;
      this.imagePreview = null;
    },
    previewImage(event) {
      const file = event.target.files[0];
      if (file) {
        this.imageFile = file;
        this.imagePreview = URL.createObjectURL(file);
      }
    },
    previewUpdatedImage(event, giveaway) {
      const file = event.target.files[0];
      if (file) {
        giveaway.imageFile = file;
        giveaway.updatedImagePreview = URL.createObjectURL(file);
      }
    },

    // Fetch data
    async fetchGiveaways() {
      const giveawaysRef = dbRef(db, "Giveaways");

      try {
        this.loading = true;

        const snapshot = await get(giveawaysRef);

        if (snapshot.exists()) {
          const giveaways = snapshot.val();

          // Fetch affiliate data for each event
          this.giveaways = await Promise.all(
            Object.keys(giveaways).map(async (key) => {
              const giveaway = {
                id: key,
                ...giveaways[key],
                date: new Date(giveaways[key].date).toISOString().split("T")[0], // Format event date
              };

              // Fetch the list of affiliate IDs from the 'Affiliate' folder for the current giveaway
              const affiliatesRef = dbRef(db, `Giveaways/${key}/Affiliates`);
              const affiliatesSnapshot = await get(affiliatesRef);

              if (affiliatesSnapshot.exists()) {
                const affiliateIds = Object.keys(affiliatesSnapshot.val());

                // Fetch data for all affiliates using their IDs
                giveaway.affiliates = await Promise.all(
                  affiliateIds.map(async (affiliateId) => {
                    const affiliateDataRef = dbRef(db, `Users/${affiliateId}`);
                    const affiliateDataSnapshot = await get(affiliateDataRef);

                    if (affiliateDataSnapshot.exists()) {
                      return affiliateDataSnapshot.val();
                    }
                    return null; // Return null if affiliate data is not found
                  })
                ).then((affiliates) =>
                  affiliates.filter((aff) => aff !== null)
                ); // Filter out any null values
              } else {
                giveaway.affiliates = []; // No affiliates found for this event
              }

              // Fetch the list of subscriptions IDs that can participate in the giveaway
              const subsRef = dbRef(db, `Giveaways/${key}/Subscriptions`);
              const subsSnapshot = await get(subsRef);

              if (subsSnapshot.exists()) {
                const subIds = Object.keys(subsSnapshot.val());

                // Fetch data for all affiliates using their IDs
                giveaway.subs = await Promise.all(
                  subIds.map(async (subId) => {
                    const subDataRef = dbRef(db, `Suscriptions/${subId}`);
                    const subDataSnapshot = await get(subDataRef);

                    if (subDataSnapshot.exists()) {
                      const subData = subDataSnapshot.val();
                      return {
                        ...subData,
                        subId, // Include the subscription ID
                      };
                    }
                    return null; // Return null if affiliate data is not found
                  })
                ).then((subscriptions) =>
                  subscriptions.filter((sub) => sub !== null)
                ); // Filter out any null values
              } else {
                giveaway.subs = []; // No affiliates found for this event
              }

              return giveaway;
            })
          );
        } else {
          this.events = []; // No events found
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        this.loading = false;
      }
    },
    async fetchAffiliates() {
      const role = "afiliado";
      const affiliatesRef = query(
        dbRef(db, "Users"),
        orderByChild("role"),
        equalTo(role)
      );

      try {
        const snapshot = await get(affiliatesRef);

        if (snapshot.exists()) {
          const affiliates = snapshot.val();

          // Since Firebase data is an object, map to array for easier use
          this.affiliates = Object.keys(affiliates).map((key) => ({
            id: key,
            ...affiliates[key],
          }));
        } else {
          this.affiliates = [];
        }
      } catch (error) {
        console.error("Error fetching affiliates:", error);
      }
    },
    async fetchSubscriptions() {
      const subscriptionsRef = dbRef(db, "Suscriptions");

      try {
        const snapshot = await get(subscriptionsRef);

        const subs = snapshot.val();

        // Since Firebase data is an object, map to array for easier use
        this.subscriptions = Object.keys(subs).map((key) => ({
          id: key,
          ...subs[key],
        }));
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      }
    },
    async fetchFilteredGiveaways() {
      const userId = this.userId;
      const userRef = dbRef(db, `Users/${userId}/subscription/subscription_id`);

      try {
        const userSnapshot = await get(userRef);
        const subId = userSnapshot.val();

        if (!subId) {
          console.warn("User does not have a valid subscription ID.");
          return;
        }

        // Filter giveaways where the 'subs' object includes the user's subscription ID
        this.filteredGiveaways = this.giveaways.filter((giveaway) => {
          return (
            giveaway.subs && giveaway.subs.some((sub) => sub.subId === subId)
          );
        });
      } catch (error) {
        console.error("Error fetching details:", error);
      }
    },

    // actions
    async createGiveaway() {
      try {
        this.isSubmitting = true;
        // Check if an image was selected for upload and get URL
        let imageUrl = null;

        if (this.imageFile) {
          const sanitizedGiveawayName = this.giveaway.name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");
          const fileExtension = this.imageFile.name.split(".").pop();
          const fileName = `${sanitizedGiveawayName}-logo.${fileExtension}`;

          const imageFileRef = storageRef(
            storage,
            `Events/${this.giveaway.name}/${fileName}`
          );
          await uploadBytes(imageFileRef, this.imageFile);
          imageUrl = await getDownloadURL(imageFileRef);
        }

        const formattedDate = new Date(this.giveaway.date).toISOString();

        // Prepare the data for submission
        const data = {
          name: this.giveaway.name,
          desc: this.giveaway.desc,
          status: this.giveaway.status,
          date: formattedDate,
        };

        if (imageUrl) {
          data.image = imageUrl;
        }

        const giveawayRef = dbRef(db, "Giveaways");
        const newGiveawayRef = push(giveawayRef);
        await set(newGiveawayRef, data);

        // Add multiple affiliates to the event
        if (this.selectedAffiliateIds.length > 0) {
          for (let affiliateId of this.selectedAffiliateIds) {
            const affiliateRef = dbRef(
              db,
              `Giveaways/${newGiveawayRef.key}/Affiliates/${affiliateId}`
            );
            await set(affiliateRef, affiliateId);
          }
        }
        // Add multiple subscriptions to the event
        if (this.selectedSubscriptionsIds.length > 0) {
          for (let subId of this.selectedSubscriptionsIds) {
            const subRef = dbRef(
              db,
              `Giveaways/${newGiveawayRef.key}/Subscriptions/${subId}`
            );
            await set(subRef, subId);
          }
        }

        showToast("Sorteo creado con exito!");
        console.log(
          "Saving Affiliates:",
          this.selectedAffiliateIds,
          "for Giveaway:",
          newGiveawayRef.key,
          "for users: ",
          this.selectedSubscriptions
        );

        //Reset form fields
        this.resetForm();
        await this.fetchGiveaways();
      } catch (error) {
        console.error("Error creating giveaway:", error);
      } finally {
        this.isSubmitting = false;
      }
    },
    async deleteGiveaway(giveawayId, index) {
      console.log(giveawayId);
      if (confirm("¿Desea borrar este sorteo?")) {
        try {
          const giveawayRef = dbRef(db, `Giveaways/${giveawayId}`);
          await remove(giveawayRef);

          // Remove the coupon from the local state
          this.giveaways.splice(index, 1);

          showToast("Sorteo eliminado!");
        } catch (error) {
          console.error("Error deleting giveaway:", error);
          alert("La eliminación del sorteo falló.");
        }
      }
    },

    handleCreateGiveaway() {
      this.fetchAffiliates();
      this.fetchSubscriptions();

      const modal = new Modal(document.getElementById('createGiveawayModal'));
      modal.show();
    },
  },
};
</script>
<template>
  <div class="container">
    <!-- Header -->
    <PageHeader :isAdmin="this.role === 'admin' ? true : false" title="Sorteos" icon="fa fa-gift" :actions="[
      {
        icon: 'fa fa-plus-circle',
        text: 'Nuevo Sorteo',
        class: 'btn-theme',
        onClick: () => handleCreateGiveaway()
      }
    ]" />

    <div v-if="this.role === 'admin'">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="giveaways.length === 0" class="text-center py-5">
        <div class="mb-3">
          <i class="fa fa-gift text-secondary opacity-25" style="font-size: 5em"></i>
        </div>
        <h5 class="text-secondary">No hay sorteos disponibles</h5>
      </div>

      <!-- Giveaways List -->
      <div v-else class="row">
        <div v-for="(giveaway, index) in giveaways" :key="giveaway.id" class="col-12 col-sm-6 col-md-4 mb-4">
          <div class="card h-100 position-relative shadow-sm">
            <!-- Participating Subscriptions -->
            <div v-if="giveaway.subs" class="text-center p-3">
              <h6><strong>Suscripciones que participan</strong></h6>
              <div class="row">
                <div v-for="sub in giveaway.subs" :key="sub.id" class="col-4 mb-2">
                  <div class="badge bg-success text-white px-2 py-1">
                    {{ sub.name.toUpperCase() }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Image Display -->
            <div class="img-container position-relative">
              <div v-if="!giveaway.isEditing" class="img" :style="{
                backgroundImage: 'url(' + giveaway.image + ')',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                height: '200px',
              }"></div>
              <div v-if="giveaway.isEditing">
                <div v-if="giveaway.updatedImagePreview" class="mt-2">
                  <img :src="giveaway.updatedImagePreview" class="img-thumbnail" alt="preview"
                    style="max-height: 200px" />
                </div>
                <input type="file" @change="(event) => previewUpdatedImage(event, giveaway)" class="form-control" />
              </div>
            </div>

            <!-- giveaway Information -->
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">{{ giveaway.name }}</h5>
              <p class="card-text">
                <strong>Fecha: </strong>{{ formatDate(giveaway.date) }}
              </p>

              <!-- giveaway's Affiliates -->
              <p class="card-text">
                <strong>Comercios Afiliados:</strong>
              </p>
              <div class="row">
                <div v-for="affiliate in giveaway.affiliates" :key="affiliate.id" class="col-6 mb-3">
                  <div class="affiliate-logo" style="max-width: 80px; margin: 0 auto">
                    <!-- Affiliate Image -->
                    <div v-if="affiliate.image" class="img-thumbnail p-1" :style="{
                      backgroundImage: 'url(' + affiliate.image + ')',
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      height: '50px',
                      width: '50px',
                      borderRadius: '50%',
                    }"></div>
                    <!-- Affiliate Info -->
                    <div class="mt-2">
                      <h6 class="small">
                        <strong>{{ affiliate.companyName }}</strong>
                      </h6>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="d-flex justify-content-end mt-3">
                <!-- <button class="btn btn-sm btn-outline-info me-1"
                                                @click="editGiveaway(), fetchAffiliates()">
                                                <i class="fa-solid fa-pencil"></i>
                                            </button> -->
                <button class="btn btn-sm btn-outline-danger" @click="deleteGiveaway(giveaway.id, index)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal for creating new event -->
      <div class="modal fade" id="createGiveawayModal" tabindex="-1" aria-labelledby="createGiveawayModalLabel"
        aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="createGiveawayModalLabel">
                Crear Sorteo
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="container">
                <!-- First Row -->
                <div class="row">
                  <!-- Select Affiliates for the giveaway -->
                  <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                    <label for="giveawayAffiliate" class="form-label">Comercios Afiliados para el Sorteo</label>
                    <div class="dropdown">
                      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuCategory"
                        data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                        {{
                          selectedAffiliateIds.length > 0
                            ? selectedAffiliateIds
                              .map(
                                (id) =>
                                  affiliates.find((aff) => aff.id === id)
                                    .companyName
                              )
                              .join(", ")
                            : "Seleccione..."
                        }}
                      </button>
                      <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                        <li v-if="affiliates.length === 0">
                          <p style="margin: 10px">
                            No hay afiliados registrados.
                          </p>
                        </li>
                        <li v-for="aff in affiliates" :key="aff.id">
                          <div class="form-check" style="margin: 10px">
                            <input type="checkbox" class="form-check-input" :id="'dropdownCheck_' + aff.id"
                              :value="aff.id" v-model="selectedAffiliateIds" />
                            <label class="form-check-label" :for="'dropdownCheck_' + aff.id">
                              {{ aff.companyName }}
                            </label>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <!-- Select Subscriptions for the giveaway -->
                  <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                    <label for="giveawaySubscriptions" class="form-label">Suscripciones permitidas</label>
                    <div class="dropdown">
                      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownSubscriptions"
                        data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                        {{
                          selectedSubscriptionsIds.length > 0
                            ? selectedSubscriptionsIds
                              .map((id) =>
                                subscriptions
                                  .find((sub) => sub.id === id)
                                  .name.toUpperCase()
                              )
                              .join(", ")
                            : "Seleccione..."
                        }}
                      </button>
                      <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                        <li v-if="subscriptions.length === 0">
                          <p style="margin: 10px">
                            No hay suscripciones registradas.
                          </p>
                        </li>
                        <li v-for="sub in subscriptions" :key="sub.id">
                          <div class="form-check" style="margin: 10px">
                            <input type="checkbox" class="form-check-input" :id="'dropdownCheck_' + sub.id"
                              :value="sub.id" v-model="selectedSubscriptionsIds" />
                            <label class="form-check-label" :for="'dropdownCheck_' + sub.id">
                              {{ sub.name.toUpperCase() }}
                            </label>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Second Row -->
                <div class="row">
                  <!-- Name -->
                  <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                    <label for="giveawayName" class="form-label">Nombre</label>
                    <input type="text" class="form-control" id="giveawayName" v-model="giveaway.name" />
                  </div>
                  <!-- Descripcion -->
                  <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                    <label for="giveawayDesc" class="form-label">Descripción</label>
                    <textarea class="form-control" id="giveawayDesc" v-model="giveaway.desc"></textarea>
                  </div>

                  <!-- Fecha -->
                  <div class="col-lg-6 col-md-6 col-sm-12 mb-3">
                    <label for="giveawayDate" class="form-label">Fecha</label>
                    <input type="date" v-model="giveaway.date" class="form-control" style="width: auto" />
                  </div>
                </div>

                <!-- Third Row -->
                <div class="row">
                  <!-- giveaway Status -->
                  <div class="col-lg-6 col-md-6 col-sm-12 mb-3 d-flex align-items-center">
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input" id="giveawayStatus" v-model="giveaway.status" />
                      <label class="form-check-label" for="giveawayStatus">Activo</label>
                    </div>
                  </div>

                  <!-- Upload Image Checkbox -->
                  <div class="col-lg-6 col-md-6 col-sm-12 mb-3 d-flex align-items-center">
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input" id="uploadImageCheckbox" v-model="uploadImage" />
                      <label class="form-check-label" for="uploadImageCheckbox">Subir imagen</label>
                    </div>
                  </div>
                </div>

                <!-- Fourth Row - Image Upload -->
                <div class="row" v-if="uploadImage">
                  <div class="col-lg-12 col-md-12 col-sm-12 mb-3">
                    <label for="menuItemImg" class="form-label">Imagen</label>
                    <input type="file" class="form-control" id="menuItemImg" @change="previewImage" accept="image/*" />
                    <div v-if="imagePreview" class="mt-2">
                      <img :src="imagePreview" class="img-thumbnail" alt="preview" style="max-height: 200px" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                Cerrar
              </button>
              <button type="button" class="btn btn-theme" @click="createGiveaway()" :disabled="isSubmitting">
                Crear
              </button>
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
    </div>

    <div v-if="this.role === 'cliente'">
      <div class="row">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredGiveaways.length === 0" class="text-center py-5">
          <div class="mb-3">
            <i class="fa fa-gift text-secondary opacity-25" style="font-size: 5em"></i>
          </div>
          <h5 class="text-secondary">No hay sorteos disponibles</h5>
        </div>

        <!-- Giveaways List -->
        <div v-else class="row">
          <div v-for="giveaway in filteredGiveaways" :key="giveaway.id" class="col-12 col-sm-6 col-md-4 mb-4">
            <div class="card h-100 position-relative">
              <div class="img-container position-relative">
                <!-- Image Display -->
                <div class="img" :style="{
                  backgroundImage: 'url(' + giveaway.image + ')',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  height: '200px',
                }"></div>
              </div>

              <div class="card-body d-flex flex-column">
                <h5 class="card-title text-truncate">{{ giveaway.name }}</h5>
                <p class="card-text">
                  <strong>Fecha: </strong>{{ formatDate(giveaway.date) }}
                </p>

                <!-- giveaway's Affiliates -->
                <p class="card-text">
                  <strong>Comercios Afiliados:</strong>
                </p>
                <div class="row">
                  <div v-for="affiliate in giveaway.affiliates" :key="affiliate.id" class="col-6 mb-3">
                    <div class="affiliate-logo" style="max-width: 80px; margin: 0 auto">
                      <!-- Affiliate Image -->
                      <div v-if="affiliate.image" class="img-thumbnail p-1" :style="{
                        backgroundImage: 'url(' + affiliate.image + ')',
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        height: '50px',
                        width: '50px',
                        borderRadius: '50%',
                      }"></div>
                      <!-- Affiliate Info -->
                      <div class="mt-2">
                        <h6 class="small">
                          <strong>{{ affiliate.companyName }}</strong>
                        </h6>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- <div class="card-footer text-center">
                                        <button class="btn btn-theme">
                                            Participar
                                        </button>
                                    </div> -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
.btn-outline-theme,
.btn-theme {
  background-color: purple;
  border-color: purple;
  border-radius: 20px;
  font-size: 0.85rem;
  padding: 0.375rem 0.75rem;
  transition: all 0.2s ease;
}

.ribbon {
  position: absolute;
  top: 10px;
  right: -10px;
  background: #007bff;
  color: #fff;
  padding: 5px 15px;
  font-size: 0.875rem;
  font-weight: bold;
  transform: rotate(45deg);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
</style>
