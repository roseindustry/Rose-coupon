<script>
import ManageCategoriesModal from "@/components/affiliates/ManageCategoriesModal.vue";
import AddCategoryModal from "@/components/affiliates/AddCategoryModal.vue";
import ManageSubcategoriesModal from "@/components/affiliates/ManageSubcategoriesModal.vue";
import AddSubcategoryModal from "@/components/affiliates/AddSubcategoryModal.vue";
import AddNewAffiliate from "@/components/affiliates/AddNewAffiliate.vue";
import AffiliatesList from "@/components/affiliates/AffiliatesList.vue";
import PageHeader from "@/components/app/PageHeader.vue";
import StatCard from '@/components/app/StatCard.vue';
import SearchCard from '@/components/app/SearchCard.vue';
import CustomSelect from '@/components/app/CustomSelect.vue';
import {
  ref as dbRef,
  query,
  orderByChild,
  equalTo,
  get,
  update,
  remove,
  push,
  set,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/firebase/init";
import { Modal } from "bootstrap";
import { toast } from "@/utils/toast";
import "toastify-js/src/toastify.css";
import { useUserStore } from "@/stores/user-role";
import venezuela from "venezuela";


export default {
  components: {
    ManageCategoriesModal,
    AddCategoryModal,
    ManageSubcategoriesModal,
    AddSubcategoryModal,
    AddNewAffiliate,
    AffiliatesList,
    PageHeader,
    StatCard,
    SearchCard,
    CustomSelect
  },
  data() {
    return {
      // Logged User data
      userId: "",
      role: "",

      affiliate: {
        order: "",
        name: "",
        rif: "",
        status: false,
        email: "",
        phoneNumber: "",
        state: "",
        municipio: "",
        parroquia: "",
        address: "",
        type: "",

        // socials
        twitter: "",
        instagram: "",
        facebook: "",
        tiktok: "",
      },
      // Payment details
      paymentDetails: {
        bank: "",
        identification: "",
        phoneNumber: "",
        bankAccount: "",
      },
      editData: {
        order: "",
        name: "",
        rif: "",
        status: false,
        email: "",
        phoneNumber: "",
        state: "",
        municipio: "",
        parroquia: "",
        address: "",
        type: "",
        twitter: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        paymentDetails: {
          bank: "",
        },
      },

      affiliates: [],
      filteredAffiliates: [],
      filterAffiliates: false,
      showMunicipios: false,
      showParroquias: false,
      showCategories: false,
      selectedState: null,
      selectedMunicipio: null,
      selectedParroquia: null,
      venezuelanStates: [
        "Amazonas",
        "Anzoátegui",
        "Apure",
        "Aragua",
        "Barinas",
        "Bolívar",
        "Carabobo",
        "Cojedes",
        "Delta Amacuro",
        "Distrito Capital",
        "Falcón",
        "Guárico",
        "Lara",
        "Mérida",
        "Miranda",
        "Monagas",
        "Nueva Esparta",
        "Portuguesa",
        "Sucre",
        "Táchira",
        "Trujillo",
        "Vargas",
        "Yaracuy",
        "Zulia",
      ],
      municipios: [],
      parroquias: [],

      // imageFile: null,
      // uploadImage: false,
      // imagePreview: null,
      // updatedImagePreview: null,
      isSubmitting: false,

      //Categories
      categories: [],
      modalData: [],
      selectedCategory: null,
      selectedCategoryId: null,
      categoryName: "",
      newCategory: "",
      editingCategoryId: null,
      editCategoryName: "",

      //Subcategories
      subcategories: [],
      subcategoriesModalData: [],
      selectedSubcategory: null,
      subcategoryName: "",
      newSubcategory: "",
      editingSubcategoryId: null,
      editSubcategoryName: "",

      searchQuery: "",
    };
  },
  computed: {
    displayedAffiliates() {
      // Start with all affiliates
      let result = this.affiliates;

      // Apply location filters if active
      if (this.selectedState) {
        result = result.filter(affiliate => affiliate.state === this.selectedState);

        if (this.selectedMunicipio) {
          result = result.filter(affiliate => affiliate.municipio === this.selectedMunicipio);

          if (this.selectedParroquia) {
            result = result.filter(affiliate => affiliate.parroquia === this.selectedParroquia);
          }
        }
      }

      // Apply category filter if active
      if (this.selectedCategory) {
        console.log('category: ', this.selectedCategory)
        result = result.filter(affiliate => affiliate.category_id === this.selectedCategory.id);
        console.log('resultados: ', result);
      }

      // Apply search filter if there's a search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(affiliate =>
          affiliate.companyName?.toLowerCase().includes(query) ||
          affiliate.state?.toLowerCase().includes(query) ||
          affiliate.municipio?.toLowerCase().includes(query) ||
          affiliate.parroquia?.toLowerCase().includes(query)
        );
      }

      // Sort by order if available
      return this.sortByOrder(result);
    },

    hasFilteredResults() {
      return this.displayedAffiliates.length > 0;
    },

    noResultsMessage() {
      if (this.searchQuery) {
        return `No se encontraron comercios que coincidan con "${this.searchQuery}"`;
      }

      if (this.selectedState) {
        if (this.selectedParroquia) {
          return `No hay comercios en la parroquia ${this.selectedParroquia}`;
        }
        if (this.selectedMunicipio) {
          return `No hay comercios en el municipio ${this.selectedMunicipio}`;
        }
        return `No hay comercios en el estado ${this.selectedState}`;
      }

      if (this.selectedCategory) {
        return `No hay comercios en la categoría ${this.selectedCategory.name}`;
      }

      return "No hay Comercios Afiliados registrados.";
    },

    stateOptions() {
      return this.venezuelanStates.map(state => ({
        value: state,
        text: state,
      }));
    },
    municipioOptions() {
      return this.municipios.map(municipio => ({
        value: municipio,
        text: municipio,
      }));
    },
    parroquiaOptions() {
      return this.parroquias.map(parroquia => ({
        value: parroquia,
        text: parroquia,
      }));
    },
    categoryOptions(){
      return this.categories.map(category => ({
        value: category.id,
        text: category.name,
      }));
    }
  },
  async mounted() {
    const userStore = useUserStore();
    await userStore.fetchUser();
    this.role = userStore.role;
    this.userId = userStore.userId;

    await this.fetchAffiliates();
    await this.fetchCategories();
    this.sortAffiliatesByOrder();
  },
  methods: {
    // Fetching data functions
    async fetchAffiliates() {
      const role = "afiliado";
      const affiliatesRef = query(
        dbRef(db, "Users"),
        orderByChild("role"),
        equalTo(role)
      );

      try {
        const affiliateSnapshot = await get(affiliatesRef);

        if (affiliateSnapshot.exists()) {
          const affiliatesList = [];

          // Fetch all categories first and store them in a map for easier lookup
          const categoriesRef = dbRef(db, "Affiliate_categories");
          const categoriesSnapshot = await get(categoriesRef);
          const categoriesMap = {};

          if (categoriesSnapshot.exists()) {
            categoriesSnapshot.forEach((categorySnapshot) => {
              const categoryData = categorySnapshot.val();
              categoriesMap[categorySnapshot.key] = categoryData.name; // Assuming 'name' is the category name field
            });
          }

          affiliateSnapshot.forEach((childSnapshot) => {
            const affiliateData = childSnapshot.val();
            const categoryId = affiliateData.category_id;

            affiliatesList.push({
              id: childSnapshot.key,
              paymentDetails: affiliateData.paymentDetails || {},
              ...affiliateData,
              category_id: categoryId,
              categoryName: categoriesMap[categoryId] || "Sin categoría",
            });
          });

          this.affiliates = affiliatesList;
          this.filteredAffiliates = affiliatesList;
          this.sortAffiliatesByOrder();
        } else {
          console.log("No data available.");
        }
      } catch (error) {
        console.error("Error fetching affiliates:", error);
      }
    },
    sortAffiliatesByOrder(order = "asc") {
      this.filteredAffiliates.sort((a, b) => {
        if (order === "asc") {
          return a.order - b.order;
        } else {
          return b.order - a.order;
        }
      });
    },
    async getNextAffiliateOrder() {
      const role = "afiliado";
      try {
        // Fetch the affiliates to get the highest order value
        const affiliatesSnapshot = await get(
          query(dbRef(db, "Users"), orderByChild("role"), equalTo(role))
        );

        let maxOrder = 0;
        if (affiliatesSnapshot.exists()) {
          const affiliates = affiliatesSnapshot.val();
          // Loop through the affiliates to find the highest order number
          Object.values(affiliates).forEach((affiliate) => {
            if (affiliate.order && affiliate.order > maxOrder) {
              maxOrder = Number(affiliate.order);
            }
          });
        }

        // Increment the max order value by 1 for the new affiliate
        this.affiliate.order = maxOrder + 1;
      } catch (error) {
        console.error("Error fetching affiliates to calculate order:", error);
      }
    },

    // Filter affiliates
    displayMunicipios(state) {
      try {
        const stateData = venezuela.estado(state, { municipios: true });
        if (stateData && stateData.municipios) {
          this.municipios = stateData.municipios;
        } else {
          console.warn(`No municipios found for state: ${state}`);
          this.municipios = [];
        }
      } catch (error) {
        console.error('Error loading municipios:', error);
        this.municipios = [];
      }
    },
    displayParroquias(municipio) {
      try {
        const municipioData = venezuela.municipio(municipio, { parroquias: true });
        if (municipioData && municipioData.parroquias) {
          this.parroquias = municipioData.parroquias;
        } else {
          console.warn(`No parroquias found for municipio: ${municipio}`);
          this.parroquias = [];
        }
      } catch (error) {
        console.error('Error loading parroquias:', error);
        this.parroquias = [];
      }
    },
    setSelectedCategory(category) {
      this.selectedCategory = category;
    },
    handleStateSelect(state) {
      if (!state) {
        this.clearAllFilters();
        return;
      }
      this.selectedState = state;
      this.selectedMunicipio = null;
      this.selectedParroquia = null;
      this.showMunicipios = true;
      this.showParroquias = false;

      // Load municipios for the selected state
      this.loadMunicipios(state);
    },
    handleMunicipioSelect(municipio) {
      if (!municipio) {
        this.selectedMunicipio = null;
        this.selectedParroquia = null;
        this.showParroquias = false;
        return;
      }
      this.selectedMunicipio = municipio;
      this.selectedParroquia = null;
      this.showParroquias = true;

      // Load parroquias for the selected municipio
      this.loadParroquias(municipio);
    },
    handleParroquiaSelect(parroquia) {
      if (!parroquia) {
        this.selectedParroquia = null;
        return;
      }
      this.selectedParroquia = parroquia;
    },
    handleCategorySelect(categoryId) {
      console.log(categoryId)
      if (!categoryId) {
        this.selectedCategory = null;
        return;
      }
      // Find the full category object from categories array
      const selectedCategory = this.categories.find(cat => cat.id === categoryId);
      if (selectedCategory) {
        this.selectedCategory = selectedCategory;
      }
    },

    // Edit affiliate
    editAffiliate(affiliate) {
      // Populate the modal fields with the plan data
      this.editData = {
        ...affiliate,
      };

      // Open the modal
      const modal = new Modal(document.getElementById("editAffiliateModal"));
      modal.show();
    },
    async updateAffiliate(affiliate) {
      if (!affiliate) {
        console.error("Affiliate data is undefined.");
        return;
      }
      console.log(affiliate.id);
      try {
        this.isSubmitting = true;

        // Create an updateData object, but only include non-empty fields
        const updateData = {};

        // Conditionally update fields if they are provided
        if (affiliate.order) updateData.order = affiliate.order;
        if (affiliate.name) updateData.companyName = affiliate.name;
        if (affiliate.rif) updateData.rif = affiliate.rif;
        if (affiliate.phoneNumber)
          updateData.phoneNumber = affiliate.phoneNumber;
        if (affiliate.state) updateData.state = affiliate.state;
        if (affiliate.municipio) updateData.municipio = affiliate.municipio;
        if (affiliate.parroquia) updateData.parroquia = affiliate.parroquia;
        if (affiliate.type) updateData.type = affiliate.type;
        if (affiliate.status !== undefined)
          updateData.status = affiliate.status;

        // Payment Details
        if (affiliate.paymentDetails) {
          updateData.paymentDetails = {}; // Initialize paymentDetails object

          if (affiliate.paymentDetails.bank)
            updateData.paymentDetails.bank = affiliate.paymentDetails.bank;
          if (affiliate.paymentDetails.identification)
            updateData.paymentDetails.identification =
              affiliate.paymentDetails.identification;
          if (affiliate.paymentDetails.phoneNumber)
            updateData.paymentDetails.phoneNumber =
              affiliate.paymentDetails.phoneNumber;
          if (affiliate.paymentDetails.bankAccount)
            updateData.paymentDetails.bankAccount =
              affiliate.paymentDetails.bankAccount;
        }

        // Social media
        if (affiliate.twitter) updateData.twitter = affiliate.twitter;
        if (affiliate.instagram) updateData.instagram = affiliate.instagram;
        if (affiliate.facebook) updateData.facebook = affiliate.facebook;
        if (affiliate.tiktok) updateData.tiktok = affiliate.tiktok;

        // Update with selected category ID
        if (this.selectedCategory && this.selectedCategory.id) {
          updateData.category_id = this.selectedCategory.id; // Save the category ID
        }

        // Only proceed if there is something to update
        if (Object.keys(updateData).length > 0) {
          const userRef = dbRef(db, `Users/${affiliate.id}`);
          await update(userRef, updateData);

          // Update email via Cloud Function if the email is changed
          const newEmail = affiliate.email;
          if (newEmail && affiliate.email !== newEmail) {
            // Call the Cloud Function for updating the email
            const data = {
              uid: affiliate.id,
              newEmail: newEmail,
            };

            const response = await fetch(
              "https://us-central1-rose-app-e062e.cloudfunctions.net/updateUserEmail",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
              }
            );

            const result = await response.json();

            if (response.ok) {
              console.log(result.message); // Show success message from the response
            } else {
              console.error("Error updating email:", result.message);
              alert("Error updating email: " + result.message);
            }
          }

          // Close the modal after saving
          const modal = Modal.getInstance(
            document.getElementById("editAffiliateModal")
          );
          modal.hide();
          this.fetchAffiliates();
          this.showMunicipios = false;
          this.showParroquias = false;
          this.selectedCategory = null;

          toast.success("Comercio actualizado exitosamente");
        } else {
          alert("No hay campos para actualizar.");
        }
      } catch (error) {
        console.error("Error updating info:", error);
        alert("La actualizacion de datos falló.");
      } finally {
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
        alert("No hay imagen nueva para subir.");
        return;
      }

      try {
        affiliate.isSubmitting = true; // Show spinner

        let imageUrl = affiliate.image; // Preserve the existing image if no new image

        if (affiliate.imageFile) {
          // Upload new image
          imageUrl = await this.uploadImageToStorage(
            affiliate.imageFile,
            affiliate
          );
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
          toast.success("Imagen actualizada!");
        }
      } catch (error) {
        console.error("Error updating image:", error);
        alert("Error al actualizar la imagen.");
      } finally {
        affiliate.isSubmitting = false; // Hide spinner
      }
    },

    // Create and delete functions
    async handleNewAffiliate(affiliateData) {
      try {
        // Format the data to match what createAffiliate expects
        this.affiliate = {
          order: affiliateData.order,
          name: affiliateData.name,
          rif: affiliateData.rif,
          email: affiliateData.email,
          phoneNumber: affiliateData.phoneNumber,
          state: affiliateData.state,
          municipio: affiliateData.municipio,
          parroquia: affiliateData.parroquia,
          status: affiliateData.status,
          twitter: affiliateData.twitter,
          instagram: affiliateData.instagram,
          facebook: affiliateData.facebook,
          tiktok: affiliateData.tiktok
        };

        // Set payment details
        this.paymentDetails = affiliateData.paymentDetails;

        // Set category if present
        if (affiliateData.category) {
          this.selectedCategory = this.categories.find(cat => cat.id === affiliateData.category);
        } else {
          this.selectedCategory = null;
        }

        // Set image file if present
        if (affiliateData.imageFile) {
          this.imageFile = affiliateData.imageFile;
        }

        // Call the existing createAffiliate method
        await this.createAffiliate();

      } catch (error) {
        console.error('Error handling new affiliate data:', error);
        toast.error('Error al procesar los datos del comercio afiliado');
      }
    },
    async createAffiliate() {
      try {
        this.isSubmitting = true;

        // CategoryId
        let categoryId = this.selectedCategory
          ? this.selectedCategory.id
          : null;

        // Check if an image was selected for upload and get URL
        let imageUrl = null;
        if (this.imageFile) {
          const sanitizedAffiliateName = this.affiliate.name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");
          const fileExtension = this.imageFile.name.split(".").pop(); // Get the file extension
          const fileName = `${sanitizedAffiliateName}-logo.${fileExtension}`; // Create the final file name

          const imageFileRef = storageRef(
            storage,
            `Logos/${this.affiliate.name}/${fileName}`
          );
          await uploadBytes(imageFileRef, this.imageFile);
          imageUrl = await getDownloadURL(imageFileRef);
        }

        // Prepare the data for submission
        const userData = {
          companyName: this.affiliate.name,
          rif: this.affiliate.rif,
          email: this.affiliate.email,
          role: "afiliado",
          state: this.affiliate.state,
          municipio: this.affiliate.municipio,
          parroquia: this.affiliate.parroquia,
          order: this.affiliate.order,
          paymentDetails: this.paymentDetails,
        };

        if (categoryId) userData.category_id = categoryId;
        if (imageUrl) userData.image = imageUrl;
        if (this.affiliate.status) userData.status = this.affiliate.status;
        if (this.affiliate.phoneNumber)
          userData.phoneNumber = this.affiliate.phoneNumber;
        if (this.affiliate.twitter) userData.twitter = this.affiliate.twitter;
        if (this.affiliate.instagram)
          userData.instagram = this.affiliate.instagram;
        if (this.affiliate.facebook)
          userData.facebook = this.affiliate.facebook;
        if (this.affiliate.tiktok) userData.tiktok = this.affiliate.tiktok;

        // Call Cloud Function to create the client via onRequest
        const response = await fetch(
          "https://us-central1-rose-app-e062e.cloudfunctions.net/createUser",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userData }),
          }
        );

        const result = await response.json();

        if (result.success) {
          toast.success(
            "Nuevo Comercio Afiliado registrado con exito! Se ha enviado la contraseña al correo."
          );

          this.fetchAffiliates();
        } else {
          alert("Error al crear al afiliado: " + result.message);
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
          // Prepare the data to send to the Cloud Function
          const data = {
            uid: affiliate.id,
          };

          // Call the Cloud Function to delete the user using fetch
          const response = await fetch(
            "https://us-central1-rose-app-e062e.cloudfunctions.net/deleteUser",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            }
          );

          const result = await response.json();

          if (response.ok) {
            console.log(result.message); // Show success message from the response

            // Remove affiliate from the database
            const affiliateRef = dbRef(db, `Users/${affiliate.id}`);
            await remove(affiliateRef);

            // Remove Affiliate ImageLogo from Storage
            if (affiliate.image) {
              const fileRef = storageRef(storage, affiliate.image);
              await deleteObject(fileRef);
              console.log(`${affiliate.image} deleted successfully.`);
            }

            // Show success toast
            toast.success("Afiliado eliminado.");

            // Remove the client from the UI
            this.fetchAffiliates();
            this.affiliates.splice(index, 1);
          } else {
            console.error("Error deleting affiliate:", result.message);
            alert("Error deleting affiliate: " + result.message);
          }
        } catch (error) {
          console.error("Error deleting affiliate:", error);
        }
      }
    },

    resetForm() {
      // Reset form fields
      this.affiliate = {
        name: "",
        rif: "",
        status: false,
        email: "",
        phoneNumber: "",
        address: "",
        sector: "",
        imageFile: null,
      };
      this.paymentDetails = {
        bank: "",
        identification: "",
        phoneNumber: "",
        bankAccount: "",
      };
      // Reset image upload state if there's one
      this.uploadImage = false;
      this.imagePreview = null;
      this.selectedCategory = null;
    },

    async uploadImageToStorage(imageFile, affiliate) {
      let imageUrl = null;
      try {
        // Create a file name based on the affiliate's name
        const sanitizedAffiliateName = affiliate.companyName
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-");
        const fileName = `${sanitizedAffiliateName}-logo.${imageFile.name.split(".").pop()}`; // Keep original file extension

        const sRef = storageRef(
          storage,
          `Logos/${affiliate.companyName}/${fileName}`
        );

        const uploadResult = await uploadBytes(sRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      } catch (error) {
        console.error("Error uploading image:", error);
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

      const categoryRef = dbRef(db, "Affiliate_categories");
      const categorySnapshot = await get(categoryRef);

      if (categorySnapshot.exists()) {
        categorySnapshot.forEach((childSnapshot) => {
          const categoryData = childSnapshot.val();
          this.categories.push({
            id: childSnapshot.key,
            name: categoryData.name,
          });
        });
      } else {
        console.log("No data available");
      }
      this.modalData = [...this.categories];
    },
    async manageCategories() {
      await this.fetchCategories();

      this.modalData = this.categories.slice();

      // Open the modal
      const modal = new Modal(document.getElementById("manageCategoriesModal"));
      modal.show();
    },
    async createCategory() {
      const categoryRef = dbRef(db, "Affiliate_categories");
      try {
        // Push new category to Firebase Realtime Database
        await push(categoryRef, {
          name: this.newCategory,
        });

        // Show success notification
        toast.success("Categoria agregada con exito!");

        // Hide the 'Add Category' modal
        const addCategoryModal = Modal.getInstance(
          document.getElementById("addCategoryModal")
        );
        if (addCategoryModal) addCategoryModal.hide();

        // Show the 'Manage Categories' modal again
        const manageCategoriesModal = Modal.getOrCreateInstance(
          document.getElementById("manageCategoriesModal")
        );
        manageCategoriesModal.show();

        // Refresh categories after adding a new one
        await this.fetchCategories(); // Ensure this fetches the data correctly and updates modalData
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
        const categoryToUpdate = this.modalData.find(
          (category) => category.id === categoryId
        );
        if (categoryToUpdate) {
          await set(categoryRef, {
            name: categoryToUpdate.name,
          });
          // Show success notification
          toast.success("Categoría actualizada con éxito!");
          this.fetchCategories();
          this.editingCategoryId = false;
        }
      } catch (e) {
        console.error("Ocurrió un error al actualizar la categoría: ", e);
        toast.error("Error al actualizar la categoría.");
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
          this.modalData = this.modalData.filter(
            (cat) => cat.id !== categoryId
          );
          // Show success notification
          toast.success("Categoría eliminada con éxito!");
        } catch (e) {
          console.error("Ocurrió un error al eliminar la categoría: ", e);
          toast.error("Error al eliminar la categoría.");
        }
      }
    },
    addCategory() {
      // Open the modal
      const modal = new Modal(document.getElementById("addCategoryModal"));
      modal.show();
    },

    // Subcategories
    async fetchSubcategories(categoryId) {
      // Clear the categories array to prevent duplicates
      this.subcategories = [];
      const category = categoryId;
      const subcategoryRef = query(
        dbRef(db, "Affiliate_subcategories"),
        orderByChild("category_id"),
        equalTo(category)
      );
      const subcategorySnapshot = await get(subcategoryRef);

      if (subcategorySnapshot.exists()) {
        subcategorySnapshot.forEach((childSnapshot) => {
          const subcategoryData = childSnapshot.val();
          this.subcategories.push({
            id: childSnapshot.key,
            name: subcategoryData.name,
            category_id: subcategoryData.category_id,
          });
        });
      } else {
        console.log("No data available");
      }
      this.subcategoriesModalData = [...this.subcategories];
    },
    async manageSubcategories(categoryId) {
      this.selectedCategoryId = categoryId;
      await this.fetchSubcategories(categoryId);

      // Open the modal
      const modal = Modal.getOrCreateInstance(
        document.getElementById("manageSubcategoriesModal")
      );
      modal.show();
    },
    toggleSubEditing(subcategoryId) {
      // Set the editing subcategory to the subcategory's ID
      this.editingSubcategoryId = subcategoryId;
    },
    cancelSubEditing() {
      // Reset the editing state
      this.editingSubcategoryId = null;
    },
    addSubcategory() {
      // Open the modal
      const modal = Modal.getOrCreateInstance(
        document.getElementById("addSubcategoryModal")
      );
      modal.show();
    },
    async createSubcategory(categoryId) {
      const subcategoryRef = dbRef(db, "Affiliate_subcategories");
      try {
        // Push new subcategory to Firebase Realtime Database
        await push(subcategoryRef, {
          name: this.newSubcategory,
          category_id: categoryId,
        });

        // Show success notification
        toast.success("Subcategoria agregada con exito!");

        // Hide the 'Add Subcategory' modal
        const addSubcategoryModal = Modal.getOrCreateInstance(
          document.getElementById("addSubcategoryModal")
        );
        if (addSubcategoryModal) addSubcategoryModal.hide();

        // Show the 'Manage Subcategories' modal again
        const manageSubcategoriesModal = Modal.getOrCreateInstance(
          document.getElementById("manageSubcategoriesModal")
        );
        manageSubcategoriesModal.show();

        // Refresh subcategories after adding a new one
        await this.fetchSubcategories(categoryId); // Ensure this fetches the data correctly and updates modal's Data
      } catch (e) {
        console.error("Ocurrio un error: ", e);
        return null;
      }
    },
    async submitSubcategory() {
      if (this.selectedCategoryId) {
        await this.createSubcategory(this.selectedCategoryId);
        this.newSubcategory = ""; // Clear the input field after submission
      } else {
        console.error("No category selected for subcategory creation");
      }
    },
    async updateSubcategory(subcategoryId) {
      const subcategoryRef = dbRef(
        db,
        `Affiliate_subcategories/${subcategoryId}`
      );

      try {
        // Get the category name from the corresponding category in modalData
        const subcategoryToUpdate = this.subcategoriesModalData.find(
          (subcategory) => subcategory.id === subcategoryId
        );
        if (subcategoryToUpdate) {
          await update(subcategoryRef, {
            name: subcategoryToUpdate.name,
          });
          // Show success notification
          toast.success("Subcategoría actualizada con éxito!");
          this.editingSubcategoryId = false;
        }
      } catch (e) {
        console.error("Ocurrió un error al actualizar la subcategoría: ", e);
        toast.error("Error al actualizar la subcategoría.");
      }
    },
    async deleteSubcategory(subcategoryId) {
      // Confirmation dialog
      if (confirm("¿Desea borrar esta categoria?")) {
        // User clicked "OK"

        const subcategoryRef = dbRef(
          db,
          `Affiliate_subcategories/${subcategoryId}`
        );

        try {
          await remove(subcategoryRef);
          // Remove category from the local modalData array
          this.subcategoriesModalData = this.subcategoriesModalData.filter(
            (subcat) => subcat.id !== subcategoryId
          );
          // Show success notification
          toast.success("Subcategoría eliminada con éxito!");
        } catch (e) {
          console.error("Ocurrió un error al eliminar la Subcategoría: ", e);
          toast.error("Error al eliminar la Subcategoría.");
        }
      }
    },

    cancelImageEdit(affiliate) {
      affiliate.isEditing = false;
      affiliate.updatedImagePreview = null;
      affiliate.imageFile = null;
    },

    // Sort affiliates by order
    sortByOrder(affiliates) {
      return [...affiliates].sort((a, b) => {
        // If both have order, sort by order
        if (a.order && b.order) {
          return a.order - b.order;
        }
        // If only one has order, prioritize the one with order
        if (a.order) return -1;
        if (b.order) return 1;
        // If neither has order, sort by name
        return a.companyName?.localeCompare(b.companyName) || 0;
      });
    },

    // Toggle filters visibility
    toggleFilters() {
      this.filterAffiliates = !this.filterAffiliates;
      if (!this.filterAffiliates) {
        this.clearAllFilters();
      } else {
        this.showCategories = true;
      }
    },

    // Clear all filters
    clearAllFilters() {
      this.selectedState = null;
      this.selectedMunicipio = null;
      this.selectedParroquia = null;
      this.selectedCategory = null;
      this.searchQuery = '';
      this.showMunicipios = false;
      this.showParroquias = false;
      this.showCategories = false;
      this.filterAffiliates = false;
    },

    // Load municipios for a state
    loadMunicipios(state) {
      try {
        const stateData = venezuela.estado(state, { municipios: true });
        if (stateData && stateData.municipios) {
          this.municipios = stateData.municipios;
        } else {
          console.warn(`No municipios found for state: ${state}`);
          this.municipios = [];
        }
      } catch (error) {
        console.error('Error loading municipios:', error);
        this.municipios = [];
      }
    },

    // Load parroquias for a municipio
    loadParroquias(municipio) {
      try {
        const municipioData = venezuela.municipio(municipio, { parroquias: true });
        if (municipioData && municipioData.parroquias) {
          this.parroquias = municipioData.parroquias;
        } else {
          console.warn(`No parroquias found for municipio: ${municipio}`);
          this.parroquias = [];
        }
      } catch (error) {
        console.error('Error loading parroquias:', error);
        this.parroquias = [];
      }
    },

    async handleAddAffiliate() {
      try {
        // Show loading state if needed
        this.isSubmitting = true;

        // Get the next order number
        await this.getNextAffiliateOrder();

      } catch (error) {
        console.error('Error preparing to add affiliate:', error);
        toast.error('Error al preparar el formulario');
      } finally {
        this.isSubmitting = false;
      }
    },
  },
};
</script>
<template>
  <div class="container">
    <!-- Page Header -->
    <PageHeader :isAdmin="this.role === 'admin'" title="Comercios Afiliados" icon="fa fa-building" :actions="[
      {
        icon: 'fa fa-user-plus',
        text: 'Agregar Afiliado',
        class: 'btn-theme',
        modalToggle: 'modal',
        modalTarget: '#addAffiliateModal',
        onClick: () => { }
      },
      {
        icon: 'fa fa-list',
        text: 'Administrar categorias',
        class: 'btn-theme',
        onClick: () => manageCategories()
      }
    ]" />

    <div class="affiliates-wrapper">
      <div class="filters-wrapper p-4">
        <!-- Header with stats and actions -->
        <div class="row justify-content-between align-items-center g-3">
          <div class="col-md-4">
            <StatCard title="Total de Afiliados" icon="fa-users" :value="affiliates.length" />
          </div>

          <!-- Search Bar -->
          <div class="col-md-8">
            <SearchCard title="Buscar comercios" v-model="searchQuery" placeholder="Buscar por nombre o RIF..." />
          </div>
        </div>
        <!-- Filters Row -->
        <div class="row mt-3">
          <!-- Filters -->
          <div class="col-md-12">
            <div class="filter-card">
              <div class="custom-select-wrapper">
                <button v-if="!filterAffiliates" class="btn btn-theme" @click.prevent="toggleFilters">
                  <i class="fa-solid fa-filter"></i>
                  Activar filtros
                </button>
                <button v-if="filterAffiliates" class="btn btn-theme" @click.prevent="clearAllFilters">
                  <i class="fa-solid fa-eraser"></i>
                  Limpiar filtros
                </button>
              </div>

              <!-- State Filter -->
              <div v-if="filterAffiliates" class="custom-select-wrapper">
                <label class="form-label mb-1">Estado</label>
                <CustomSelect
                  v-model="selectedState"
                  class="me-2"
                  :options="stateOptions"
                  placeholder="Seleccionar estado"
                  @change="handleStateSelect(selectedState)"
                />
              </div>
              <div v-if="showMunicipios" class="custom-select-wrapper">
                <label class="form-label mb-1">Municipio</label>
                <CustomSelect
                  v-model="selectedMunicipio"
                  class="me-2"
                  :options="municipioOptions"
                  placeholder="Seleccionar municipio"
                  @change="handleMunicipioSelect(selectedMunicipio)"
                />
              </div>
              <div v-if="showParroquias" class="custom-select-wrapper">
                <label class="form-label mb-1">Parroquia</label>
                <CustomSelect
                  v-model="selectedParroquia"
                  class="me-2"
                  :options="parroquiaOptions"
                  placeholder="Seleccionar parroquia"
                  @change="handleParroquiaSelect(selectedParroquia)"
                />
              </div>
              <div v-if="showCategories" class="custom-select-wrapper">
                <label class="form-label mb-1">Categoría</label>
                <CustomSelect
                  v-model="selectedCategory"
                  class="me-2"
                  :options="categoryOptions"
                  placeholder="Seleccionar categoría"
                  @change="handleCategorySelect(selectedCategory)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Affiliates List -->
      <AffiliatesList :displayedAffiliates="displayedAffiliates" :role="role" :hasResults="hasFilteredResults"
        :noResultsMessage="noResultsMessage" @edit-affiliate="editAffiliate" @delete-affiliate="deleteAffiliate"
        @edit-image="editImage" @preview-image="previewUpdatedImage" @update-image="updateImage"
        @cancel-image-edit="cancelImageEdit" @clear-filters="clearAllFilters" />
    </div>

    <!-- Admin Modals -->
    <template v-if="role === 'admin'">
      <!-- Add Affiliate Modal -->
      <AddNewAffiliate :venezuelanStates="venezuelanStates" :categories="categories" :order="Number(affiliate.order)"
        @add-affiliate="handleNewAffiliate" />

      <!-- Modal for Editing Affiliate -->
      <div class="modal fade" id="editAffiliateModal" tabindex="-1" aria-labelledby="editAffiliateModalLabel"
        aria-hidden="true">
        <div class="modal-dialog modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="editAffiliateModalLabel">
                Editar Afiliado
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="container">
                <div class="row">
                  <!-- Categoria -->
                  <div class="col-6 mb-3">
                    <label for="EditCategoryDropdown" class="form-label">Categoria</label>
                    <div class="dropdown" id="EditCategoryDropdown">
                      <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownEditMenuCategory"
                        data-bs-toggle="dropdown" aria-expanded="false">
                        {{
                          selectedCategory
                            ? selectedCategory.name
                            : editData.categoryName
                        }}
                      </button>
                      <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                        <li v-if="categories.length === 0">
                          <p style="margin: 10px">
                            No hay categorias registradas.
                          </p>
                        </li>
                        <li v-for="category in categories" :key="category.id">
                          <a class="dropdown-item" href="#" @click="setSelectedCategory(category)">
                            {{ category.name }}
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <!-- Affiliate Order Number -->
                  <div class="col-6 mb-3">
                    <label for="editAffiliateOrder" class="form-label">Orden
                    </label>
                    <input type="number" class="form-control" id="editAffiliateOrder" v-model="editData.order" />
                  </div>
                  <!-- Affiliate Name -->
                  <div class="col-6 mb-3">
                    <label for="editAffiliateName" class="form-label">Nombre</label>
                    <input type="text" class="form-control" id="editAffiliateName" v-model="editData.companyName" />
                  </div>
                  <!-- RIF -->
                  <div class="col-6 mb-3">
                    <label for="editAffiliateRif" class="form-label">RIF</label>
                    <input class="form-control" id="editAffiliateRif" v-model="editData.rif" />
                  </div>
                  <!-- Email -->
                  <div class="col-6 mb-3">
                    <label for="editAffiliateEmail" class="form-label">Email</label>
                    <input class="form-control" id="editAffiliateEmail" v-model="editData.email" />
                  </div>
                  <!-- Phone Number -->
                  <div class="col-6 mb-3">
                    <label for="editAffiliatePhone" class="form-label">Teléfono</label>
                    <input class="form-control" id="editAffiliatePhone" v-model="editData.phoneNumber" />
                  </div>
                  <div class="col-6 mb-3">
                    <label class="form-label">Estado</label>
                    <select v-model="editData.state" @change="displayMunicipios(editData.state)"
                      class="form-control mb-2">
                      <option value="" disabled selected>
                        Selecciona un estado
                      </option>
                      <option v-for="(state, index) in venezuelanStates" :key="index" :value="state">
                        {{ state }}
                      </option>
                    </select>
                  </div>
                  <div class="col-6 mb-3">
                    <label class="form-label">Municipio</label>
                    <select v-model="editData.municipio" @change="displayParroquias(editData.municipio)"
                      class="form-control mb-2">
                      <option value="" disabled selected>
                        Selecciona un municipio
                      </option>
                      <option v-for="(municipio, index) in municipios" :key="index" :value="municipio">
                        {{ municipio }}
                      </option>
                    </select>
                  </div>
                  <div class="col-6 mb-3">
                    <label class="form-label">Parroquia</label>
                    <select v-model="editData.parroquia" class="form-control mb-2">
                      <option value="" disabled selected>
                        Selecciona una parroquia
                      </option>
                      <option v-for="(parroquia, index) in parroquias" :key="index" :value="parroquia">
                        {{ parroquia }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Payment details -->
                <div class="row">
                  <hr />
                  <h5 for="affiliatePaymentDetails" class="form-label text-center mb-3">
                    Datos de Pago
                  </h5>
                  <div class="col-12 mb-3">
                    <div class="input-group">
                      <span class="input-group-text"> Banco </span>
                      <input type="text" class="form-control" id="affiliateBank"
                        v-model="editData.paymentDetails.bank" />
                    </div>
                  </div>
                  <div class="col-12 mb-3">
                    <div class="input-group">
                      <span class="input-group-text"> RIF o Cédula </span>
                      <input type="text" class="form-control" id="affiliateIdentification"
                        v-model="editData.paymentDetails.identification" />
                    </div>
                  </div>
                  <div class="col-12 mb-3">
                    <div class="input-group">
                      <span class="input-group-text"> Número de Teléfono </span>
                      <input type="text" class="form-control" id="affiliatePhone"
                        v-model="editData.paymentDetails.phoneNumber" />
                    </div>
                  </div>
                  <div class="col-12 mb-3">
                    <div class="input-group">
                      <span class="input-group-text"> Número de Cuenta </span>
                      <input type="text" class="form-control" id="affiliateAccount"
                        v-model="editData.paymentDetails.bankAccount" />
                    </div>
                  </div>
                </div>

                <hr />

                <!-- Socials -->
                <div class="row">
                  <h5 for="affiliateSocials" class="form-label text-center mb-3">
                    Redes sociales
                  </h5>
                  <div class="col-6 mb-3">
                    <div class="input-group">
                      <span class="input-group-text">
                        <i class="fa-brands fa-x-twitter"></i>
                      </span>
                      <input type="text" class="form-control" id="editAffiliateTwitter" v-model="editData.twitter" />
                    </div>
                  </div>
                  <div class="col-6 mb-3">
                    <div class="input-group">
                      <span class="input-group-text">
                        <i class="fa-brands fa-instagram"></i>
                      </span>
                      <input type="text" class="form-control" id="editAffiliateInstagram"
                        v-model="editData.instagram" />
                    </div>
                  </div>
                  <div class="col-6 mb-3">
                    <div class="input-group">
                      <span class="input-group-text">
                        <i class="fa-brands fa-facebook-f"></i>
                      </span>
                      <input type="text" class="form-control" id="editAffiliateFacebook" v-model="editData.facebook" />
                    </div>
                  </div>
                  <div class="col-6 mb-3">
                    <div class="input-group">
                      <span class="input-group-text">
                        <i class="fa-brands fa-tiktok"></i>
                      </span>
                      <input type="text" class="form-control" id="editAffiliateTiktok" v-model="editData.tiktok" />
                    </div>
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
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                Cerrar
              </button>
              <button type="button" class="btn btn-theme" @click="updateAffiliate(editData)" :disabled="isSubmitting">
                Guardar
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

      <!-- Modal for Managing Categories -->
      <manage-categories-modal :modalData="categories" :editingCategoryId="editingCategoryId"
        @manage-subcategories="manageSubcategories" @toggle-editing="toggleEditing" @update-category="updateCategory"
        @cancel-editing="cancelEditing" @delete-category="deleteCategory" @add-category="addCategory">
      </manage-categories-modal>

      <!-- Add New Category -->
      <add-category-modal @create-category="createCategory"></add-category-modal>

      <!-- Modal for Managing Subcatogories -->
      <manage-subcategories-modal :subcategoriesModalData="subcategories" :editingSubcategoryId="editingSubcategoryId"
        @toggle-sub-editing="toggleSubEditing" @update-subcategory="updateSubcategory"
        @cancel-sub-editing="cancelSubEditing" @delete-subcategory="deleteSubcategory"
        @add-subcategory="addSubcategory">
      </manage-subcategories-modal>

      <!-- Add New Subcategory -->
      <add-subcategory-modal @submit-subcategory="submitSubcategory"></add-subcategory-modal>
    </template>
  </div>
</template>

<style scoped>
/* Base Container Styles */
.btn-outline-theme,
.btn-theme {
  font-size: 0.85rem;
  padding: 0.375rem 0.75rem;
  transition: all 0.2s ease;
}

.btn-outline-theme {
  border-color: purple;
  color: purple;
}

.btn-outline-theme:hover {
  background-color: purple;
  color: white;
  box-shadow: 0 2px 5px rgba(128, 0, 128, 0.3);
}

.btn-theme {
  background-color: purple;
  border-color: purple;
  color: white;
}

.btn-theme:hover {
  background-color: #8a2be2;
  border-color: #8a2be2;
  box-shadow: 0 2px 5px rgba(138, 43, 226, 0.3);
}

.container .affiliates-wrapper {
  padding: 0;
}

.affiliates-wrapper {
  background: #29122f;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filters-wrapper {
  background: linear-gradient(to bottom, rgba(41, 18, 47, 0.95), rgba(41, 18, 47, 0.98));
  border-radius: 16px;
  padding: 1.5rem !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Stats Card Styles */
.stats-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stats-icon {
  width: 48px;
  height: 48px;
  background: rgba(128, 0, 128, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-icon i {
  font-size: 1.5rem;
  color: purple;
}

.stats-info {
  flex: 1;
}

.stats-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.stats-value {
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

/* Search Card Styles */

.search-actions {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  border: none;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: translateY(-1px);
}

/* Filter Card Styles */
.filter-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-card .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.filter-card .btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.filter-card .btn i {
  font-size: 0.875rem;
  color: purple;
}

.filter-card .dropdown {
  display: inline-block;
}

/* Dropdown Styles */
.dropdown-menu {
  background: #2d2d2d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.5rem;
  margin-top: 0.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.dropdown-item {
  color: rgba(255, 255, 255, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.dropdown-item:active {
  background: purple;
  color: white;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .filters-wrapper {
    padding: 1rem !important;
  }

  .search-card {
    padding: 1rem;
  }

  .filter-card {
    flex-direction: column;
    padding: 1rem;
  }

  .filter-card .btn,
  .filter-card .dropdown {
    width: 100%;
  }

  .filter-card .dropdown .btn {
    justify-content: space-between;
  }

  .stats-icon {
    width: 40px;
    height: 40px;
  }

  .stats-icon i {
    font-size: 1.25rem;
  }

  .stats-value {
    font-size: 1.25rem;
  }

  .search-input-wrapper .form-control {
    height: 39px;
    font-size: 0.875rem;
  }
}

@media (max-width: 576px) {
  .filters-wrapper {
    padding: 0.75rem !important;
  }

  .search-input-wrapper .form-control {
    font-size: 0.875rem;
    height: 40px;
  }
}

/* Header Styles */
.affiliates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.admin-actions {
  display: flex;
  gap: 0.5rem;
}

.admin-actions .btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
}

.admin-actions .btn i {
  font-size: 1rem;
}

@media (max-width: 576px) {
  .affiliates-header {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .admin-actions {
    margin-left: auto;
  }

  .admin-actions .btn {
    padding: 0.375rem;
  }
}

/* Image and Logo Styles */
.img {
  position: relative;
  background-size: cover;
  background-position: center;
  width: 100%;
  height: 200px;
  border-radius: 5px;
}

.edit-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.w-100px {
  width: 100px;
}

.img-container {
  position: relative;
  height: 200px;
  background-color: #1a1a1a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.logo-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  padding: 0.5rem;
}

/* Image Edit Container Styles */
.edit-image-container {
  position: relative;
  width: 100%;
}

.preview-container {
  width: 120px;
  height: 120px;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

.preview-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-input-wrapper {
  margin-top: 0.5rem;
  width: 200px;
}

.file-input-wrapper .d-flex {
  gap: 0.5rem;
}

.file-input-wrapper input {
  font-size: 0.875rem;
  flex: 1;
}

.spinner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
}

/* Affiliate Header and Info Styles */
.affiliate-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1.5rem;
}

.affiliate-info .d-flex {
  gap: 1.5rem;
}

.min-vh-50 {
  min-height: 50vh;
}

/* Social Links Styles */
.social-links a {
  transition: all 0.3s ease;
}

.social-links a:hover {
  transform: translateY(-2px);
}

/* Card Styles */
.card {
  transition: transform 0.2s ease;
  background-color: #2d2d2d;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card:hover {
  transform: translateY(-5px);
}

.card-body {
  background-color: #2d2d2d;
}

.text-secondary {
  color: #adb5bd !important;
}

/* Affiliate List Styles */
.affiliates-list-wrapper {
  background: #29122f;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.affiliate-item {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.affiliate-item:last-child {
  border-bottom: none;
}

.affiliate-name {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.affiliate-location,
.affiliate-contact {
  color: #adb5bd;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

/* Status Badge Styles */
.status-badge {
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  background: #e9ecef;
  color: #666;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

/* Affiliate Social and Actions Styles */
.affiliate-social {
  margin: 1rem 0;
}

.affiliate-actions {
  display: flex;
  justify-content: flex-end;
}

/* Custom Select Styles */
.filter-card {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  padding: 1.5rem;
}

.filter-card .custom-select-wrapper {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.filter-card .form-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.filter-card .btn-theme {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.filter-card .btn-theme:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.filter-card .btn-theme i {
  font-size: 0.875rem;
  color: purple;
}

@media (max-width: 768px) {
  .filter-card {
    flex-direction: column;
    padding: 1rem;
  }

  .filter-card .custom-select-wrapper {
    width: 100%;
    max-width: none;
  }
}
</style>