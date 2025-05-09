<script>
import { db, storage, functions } from "../firebase/init";
import {
  ref as dbRef,
  update,
  get,
  query,
  orderByChild,
  equalTo,
  push,
  set,
  remove,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import copyToClipboard from "@/utils/copyToClipboard";
import { showToast } from "@/utils/toast";
import { sendEmail } from "@/utils/emailService";
import "toastify-js/src/toastify.css";
import SearchInput from "@/components/app/SearchInput.vue";
import moment from "moment";
import { Modal } from "bootstrap";
import Swal from 'sweetalert2'
import 'sweetalert2/src/sweetalert2.scss'
import { useUserStore } from "@/stores/user-role";
import {
  CreatePlanModal,
  EditPlanModal,
  ExchangeRateModal,
  AssignSubscriptionModal,
} from "@/components/subscriptions/admin/modals";
import AdminSubscriptionsView from "@/components/subscriptions/admin/AdminSubscriptionsView.vue";
import UserSubscriptionsView from "@/components/subscriptions/UserSubscriptionsView.vue";

export default {
  name: "Subscriptions",
  components: {
    SearchInput,
    CreatePlanModal,
    EditPlanModal,
    ExchangeRateModal,
    AssignSubscriptionModal,
    AdminSubscriptionsView,
    UserSubscriptionsView,
  },
  data() {
    return {
      role: null,
      userId: null,
      userName: null,
      exchange: null,

      clientsSubscriptions: [],
      clientsNoSubscriptions: [],
      affiliatesSubscriptions: [],
      affiliatesNoSubscriptions: [],

      searchQuery: "",
      searchResults: [],
      searchAffResults: [],
      selectedClient: null,
      selectedAffiliate: null,
      selectedPlan: null,

      clientPlan: {
        order: "",
        name: "",
        desc: "",
        price: 0,
        yearlyPrice: 0,
        isYearly: false,
        requestLimit: 0,
        cuotaAddOn: 0,
        icon: "",
      },
      editClientPlanData: {
        id: "",
        order: "",
        name: "",
        desc: "",
        price: 0,
        yearlyPrice: 0,
        isYearly: false,
        requestLimit: 0,
        cuotaAddOn: 0,
        icon: "",
      },
      affiliatePlan: {
        order: "",
        name: "",
        desc: "",
        price: 0,
        yearlyPrice: 0,
        isYearly: false,
      },
      editAffiliatePlanData: {
        id: "",
        order: "",
        name: "",
        desc: "",
        price: 0,
        yearlyPrice: 0,
        isYearly: false,
      },

      inputIcon: false,

      currentPage: 1,
      itemsPerPage: 10,
      sortField: "firstName",
      sortOrder: "asc",
      filterDate: null,

      paymentFile: null,
      paymentPreview: null,
      paymentDate: null,
      paymentUrl: null,
      isSubmitting: false,
      errorMessage: "",
      paymentModal: null,

      loading: false,
      loadingPlans: false,

      currentSub: null,

      amountPaid: 0,
      payDay: null,
      isPaid: false,
      activeTab: "clients",
      plans: [],
      affiliatePlans: [],
      clients: [],
      affiliates: [],
    };
  },
  computed: {
    // Sorted subscriptions for displaying to Clients or Affiliates in their view
    sortedPlans() {
      const plans = this.role === "cliente" ? this.plans : this.affiliatePlans;

      return [...plans].sort((a, b) => a.order - b.order);
    },
    // Sorted subscriptions to display to admin
    sortedClientPlans() {
      const plans = this.plans;

      return [...plans].sort((a, b) => a.order - b.order);
    },
    sortedAffiliatePlans() {
      const plans = this.affiliatePlans;

      return [...plans].sort((a, b) => a.order - b.order);
    },
    formattedDesc() {
      return this.sortedPlans.map((plan) => ({
        ...plan,
        desc: plan.desc
          .split(".")
          .filter((sentence) => sentence.trim())
          .map((sentence) => `<li>${sentence.trim()}</li>`)
          .join(""),
      }));
    },

    // 1. Clients with subscriptions
    allFilteredClientsSubscriptions() {
      let filtered = this.clientsSubscriptions;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter((client) => {
          const fullName = (
            client.firstName +
            " " +
            client.lastName
          ).toLowerCase();
          const identification = String(client.identification).toLowerCase(); // Ensure it's a string
          const subscriptionName = client.subscriptionName
            ? client.subscriptionName.toLowerCase()
            : "";

          return (
            fullName.includes(query) ||
            identification.includes(query) ||
            subscriptionName.includes(query)
          );
        });
      }

      if (this.filterDate) {
        filtered = filtered.filter((client) => {
          const registrationDate = moment(client.createdAt).format(
            "YYYY-MM-DD"
          );
          return registrationDate === this.filterDate;
        });
      }

      return filtered;
    },
    filteredClientsSubscriptions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allFilteredClientsSubscriptions.slice(start, end);
    },

    // 2. Clients without subscriptions
    allFilteredClientsNoSubscriptions() {
      let filtered = this.clientsNoSubscriptions;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter((client) => {
          const fullName = (
            client.firstName +
            " " +
            client.lastName
          ).toLowerCase();
          const identification = String(client.identification).toLowerCase(); // Ensure it's a string
          const subscriptionName = client.subscriptionName
            ? client.subscriptionName.toLowerCase()
            : "";

          return (
            fullName.includes(query) ||
            identification.includes(query) ||
            subscriptionName.includes(query)
          );
        });
      }

      if (this.filterDate) {
        filtered = filtered.filter((client) => {
          const registrationDate = moment(client.createdAt).format(
            "YYYY-MM-DD"
          );
          return registrationDate === this.filterDate;
        });
      }

      return filtered;
    },
    filteredClientsNoSubscriptions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allFilteredClientsNoSubscriptions.slice(start, end);
    },

    // 3. Affiliates with subscriptions
    allFilteredAffiliatesSubscriptions() {
      let filtered = this.affiliatesSubscriptions;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter((affiliate) => {
          const name = affiliate.companyName.toLowerCase();
          const rif = String(affiliate.rif).toLowerCase();
          const subscriptionName = affiliate.subscriptionName
            ? affiliate.subscriptionName.toLowerCase()
            : "";

          return (
            name.includes(query) ||
            rif.includes(query) ||
            subscriptionName.includes(query)
          );
        });
      }

      if (this.filterDate) {
        filtered = filtered.filter((affiliate) => {
          const registrationDate = moment(affiliate.createdAt).format(
            "YYYY-MM-DD"
          );
          return registrationDate === this.filterDate;
        });
      }

      return filtered;
    },
    filteredAffiliatesSubscriptions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allFilteredAffiliatesSubscriptions.slice(start, end);
    },

    // 4. Affiliates without subscriptions
    allFilteredAffiliatesNoSubscriptions() {
      let filtered = this.affiliatesNoSubscriptions;

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter((affiliate) => {
          const name = affiliate.companyName.toLowerCase();
          const rif = String(affiliate.rif).toLowerCase();
          const subscriptionName = affiliate.subscriptionName
            ? affiliate.subscriptionName.toLowerCase()
            : "";

          return (
            name.includes(query) ||
            rif.includes(query) ||
            subscriptionName.includes(query)
          );
        });
      }

      if (this.filterDate) {
        filtered = filtered.filter((affiliate) => {
          const registrationDate = moment(affiliate.createdAt).format(
            "YYYY-MM-DD"
          );
          return registrationDate === this.filterDate;
        });
      }

      return filtered;
    },
    filteredAffiliatesNoSubscriptions() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.allFilteredAffiliatesNoSubscriptions.slice(start, end);
    },

    // Total pages calculation for each type
    totalPages() {
      return (type) => {
        switch (type) {
          case "clientSubscriptions":
            return Math.ceil(
              this.allFilteredClientsSubscriptions.length / this.itemsPerPage
            );
          case "clientNoSubscriptions":
            return Math.ceil(
              this.allFilteredClientsNoSubscriptions.length / this.itemsPerPage
            );
          case "affiliateSubscriptions":
            return Math.ceil(
              this.allFilteredAffiliatesSubscriptions.length / this.itemsPerPage
            );
          case "affiliateNoSubscriptions":
            return Math.ceil(
              this.allFilteredAffiliatesNoSubscriptions.length /
              this.itemsPerPage
            );
          default:
            return 0;
        }
      };
    },

    // Calculate visible pages for pagination
    visiblePages() {
      return (type) => {
        const totalPages = this.totalPages(type);
        const maxPagesToShow = window.innerWidth < 768 ? 3 : 5;
        let startPage = Math.max(
          1,
          this.currentPage - Math.floor(maxPagesToShow / 2)
        );
        let endPage = Math.min(
          totalPages,
          this.currentPage + Math.floor(maxPagesToShow / 2)
        );

        if (endPage - startPage + 1 < maxPagesToShow) {
          if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
          } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
          }
        }

        return Array.from(
          { length: endPage - startPage + 1 },
          (_, i) => startPage + i
        );
      };
    },
  },
  methods: {
    handleCopy(text) {
      copyToClipboard(text);
    },
    async sendNotificationEmail(emailPayload) {
      try {
        const result = await sendEmail(emailPayload);
        if (result.success) {
          console.log("Email sent successfully:", result.message);
        } else {
          console.error("Failed to send email:", result.error);
        }
      } catch (error) {
        console.error("Error sending email:", error);
      }
    },
    goToPage(page, type) {
      if (page >= 1 && page <= this.totalPages(type)) {
        this.currentPage = page;
      }
    },

    async fetchClients() {
      const role = "cliente";
      const clientRef = query(
        dbRef(db, "Users"),
        orderByChild("role"),
        equalTo(role)
      );

      try {
        this.loading = true;
        const snapshot = await get(clientRef);

        if (snapshot.exists()) {
          const users = snapshot.val();

          // Call the `getAllUsers` onRequest Cloud Function using an HTTP request
          const functionUrl =
            "https://us-central1-rose-app-e062e.cloudfunctions.net/getAllUsers";
          const response = await fetch(functionUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // Add an Authorization header if you require user authentication
              // "Authorization": `Bearer ${authToken}`
            },
          });

          if (!response.ok) {
            throw new Error(
              `Failed to call Cloud Function: ${response.statusText}`
            );
          }

          const data = await response.json();

          if (!data || !data.users) {
            throw new Error("Failed to retrieve users from Cloud Function");
          }

          const authUsers = data.users;

          // Create a lookup object for auth users based on UID
          const authUsersLookup = authUsers.reduce((lookup, authUser) => {
            lookup[authUser.uid] = authUser;
            return lookup;
          }, {});

          // Prepare an array of subscription IDs to batch fetch
          const subscriptionIds = Object.values(users).reduce((subs, user) => {
            if (user.subscription && user.subscription.subscription_id) {
              subs.add(user.subscription.subscription_id);
            }
            return subs;
          }, new Set());

          const subscriptionPromises = Array.from(subscriptionIds).map(
            async (subscriptionId) => {
              const subscriptionRef = dbRef(
                db,
                `Suscriptions/${subscriptionId}`
              );
              const subscriptionSnapshot = await get(subscriptionRef);
              return {
                subscriptionId,
                subscription: subscriptionSnapshot.exists()
                  ? subscriptionSnapshot.val()
                  : null,
              };
            }
          );

          // Fetch all subscriptions in parallel
          const subscriptionResults = await Promise.all(subscriptionPromises);
          const subscriptionLookup = subscriptionResults.reduce(
            (lookup, { subscriptionId, subscription }) => {
              lookup[subscriptionId] = subscription;
              return lookup;
            },
            {}
          );

          // Map clients with their corresponding data
          this.clients = Object.entries(users).map(([uid, user]) => {
            const authUser = authUsersLookup[uid];
            const subscription = user.subscription
              ? subscriptionLookup[user.subscription.subscription_id]
              : null;

            return {
              uid,
              ...user,
              createdAt: authUser ? authUser.creationTime : null,
              subscriptionName: subscription
                ? subscription.name || "Suscripción desconocida"
                : "Sin suscripción",
            };
          });

          // Separate clients with and without subscriptions
          this.clientsSubscriptions = this.clients.filter(
            (client) => client.subscriptionName !== "Sin suscripción"
          );
          this.clientsNoSubscriptions = this.clients.filter(
            (client) => client.subscriptionName === "Sin suscripción"
          );
        } else {
          this.clients = [];
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        this.clients = [];
      } finally {
        this.loading = false;
      }
    },
    async fetchAffiliates() {
      const role = "afiliado";
      const affRef = query(
        dbRef(db, "Users"),
        orderByChild("role"),
        equalTo(role)
      );

      try {
        const snapshot = await get(affRef);

        if (snapshot.exists()) {
          const affiliates = snapshot.val();

          // Since Firebase data is an object, map to array for easier use
          this.affiliates = Object.keys(affiliates).map((key) => ({
            id: key,
            ...affiliates[key],
          }));
          // Loop through each client to fetch their subscription data
          for (const aff of this.affiliates) {
            // Check if the client has a subscription object with a subscription_id
            if (aff.subscription && aff.subscription.subscription_id) {
              const subscriptionId = aff.subscription.subscription_id;
              const subscriptionRef = dbRef(
                db,
                `Affiliate_suscriptions/${subscriptionId}`
              );
              const subscriptionSnapshot = await get(subscriptionRef);

              if (subscriptionSnapshot.exists()) {
                // Add subscription name to client data
                aff.subscriptionName =
                  subscriptionSnapshot.val().name || "Suscripción desconocida";
              } else {
                console.log(
                  `Subscription with ID ${subscriptionId} not found.`
                );
                aff.subscriptionName = "Suscripción desconocida";
              }
            } else {
              aff.subscriptionName = "Sin suscripción";
            }
          }

          this.affiliatesSubscriptions = this.affiliates.filter(
            (aff) => aff.subscription
          );
          this.affiliatesNoSubscriptions = this.affiliates.filter(
            (aff) => !aff.subscription
          );
        } else {
          this.affiliates = []; // No clients found
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        this.affiliates = [];
      }
    },
    async fetchPlans() {
      try {
        this.loadingPlans = true;

        const plansRef = query(dbRef(db, "Suscriptions"));
        const snapshot = await get(plansRef);

        if (snapshot.exists()) {
          const plans = snapshot.val();

          // Since Firebase data is an object, map to array for easier use
          this.plans = Object.keys(plans).map((key) => ({
            id: key,
            ...plans[key],
          }));
        } else {
          this.plans = []; // No subscriptions found
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
        this.plans = [];
      } finally {
        this.loadingPlans = false;
      }
    },
    async fetchAffiliatePlans() {
      const plansRef = query(dbRef(db, "Affiliate_suscriptions"));
      try {
        this.loadingPlans = true;

        const snapshot = await get(plansRef);

        if (snapshot.exists()) {
          const plans = snapshot.val();

          // Since Firebase data is an object, map to array for easier use
          this.affiliatePlans = Object.keys(plans).map((key) => ({
            id: key,
            ...plans[key],
          }));
        } else {
          this.affiliatePlans = []; // No subscriptions found
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
        this.affiliatePlans = [];
      } finally {
        this.loadingPlans = false;
      }
    },

    // Clients and Affiliates can contract a subscription
    async contractPlan(plan) {
      if (
        confirm(
          `¿Seguro que desea cambiar su suscripción a ${plan.name.toUpperCase()}?`
        )
      ) {
        const userId = this.userId;
        this.selectedPlan = plan;

        if (!this.userId) {
          alert("Usuario no identificado.");
          return;
        }

        if (!this.selectedPlan) {
          alert("Por favor seleccione una suscripción antes de contratar.");
          return;
        }

        // Determine whether the user is a client or an affiliate
        let user;
        let userType = ""; // To differentiate in messages/emails
        let userName = "";

        const userRef = dbRef(db, `Users/${userId}`);
        const userSnapshot = await get(userRef);
        user = userSnapshot.exists() ? userSnapshot.val() : null;

        if (this.role === "cliente") {
          userType = "cliente";
          userName = `${user.firstName} ${user.lastName}`;
        } else if (this.role === "afiliado") {
          userType = "afiliado";
          userName = user.companyName;
        }

        if (!user) {
          alert(`No se pudo encontrar el ${userType}.`);
          return;
        }

        // Calculate payDay (one month from today)
        const payDay = moment().add(1, "month").toISOString();

        // Prepare subscription details
        const subscriptionData = {
          subscription_id: plan.id,
          status: false, // Set the default status as false 'inactive until payment confirmed'
          payDay: payDay,
        };

        // Proceed to open modal with Payment methods and payment upload
        if (plan.price === 0 && this.role === "cliente") {
          try {
            // Assign the subscription details to the client's data in Firebase
            const userPlanRef = dbRef(db, `Users/${userId}/subscription`);
            await update(userPlanRef, subscriptionData);

            // Notify user (client/affiliate)
            const appUrl = "https://app.rosecoupon.com";
            const userEmailPayload = {
              to: user.email,
              message: {
                subject: `Suscripción ${plan.name.toUpperCase()} activada`,
                text: `Hola ${userName}, se le ha activado la Suscripción ${plan.name.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
                html: `<p>Hola ${userName}, se le ha activado la Suscripción ${plan.name} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`,
              },
            };
            await this.sendNotificationEmail(userEmailPayload);

            // Notify Admin
            const adminEmailPayload = {
              to: "roseindustry11@gmail.com",
              message: {
                subject: `Nuevo cliente suscrito al Plan ${plan.name.toUpperCase()}`,
                text: `Un nuevo cliente, ${userName}, se ha suscrito al plan ${plan.name.toUpperCase()}.`,
                html: `<p>Un nuevo cliente, ${userName}, se ha suscrito al plan ${plan.name.toUpperCase()}.</p>`,
              },
            };
            await this.sendNotificationEmail(adminEmailPayload);

            showToast("Suscripción asignada con éxito!", "success");
            // Reset selection after assigning the plan
            this.selectedPlan = null;
            // Redirect to Client Panel
            this.$router.push("/client-portal");
          } catch (error) {
            console.error("Error assigning plan:", error);
            alert("La asignación de la suscripción falló.");
          }
        } else {
          this.openPaymentModal(plan);
        }
      }
    },
    openPaymentModal(plan) {
      this.selectedPlan = plan;

      const paymentModal = Modal.getOrCreateInstance(
        document.getElementById("notifyPaymentModal")
      );
      paymentModal.show();
    },
    async notifyPayment(plan) {
      if (confirm("¿Seguro que desea subir el pago?")) {
        if (!plan.paymentFile) {
          this.errorMessage = "El archivo es requerido.";
          return;
        }

        try {
          this.isSubmitting = true;
          const userId = this.userId;
          let user;
          let userType = "";
          let userName = "";
          let payDay = null;

          const currentUserRef = dbRef(db, `Users/${userId}`);
          const userSnapshot = await get(currentUserRef);
          user = userSnapshot.exists() ? userSnapshot.val() : null;

          // Calculate payDay
          if (plan.isYearly) {
            payDay = moment().add(1, "year").toISOString();
          } else {
            payDay = moment().add(1, "month").toISOString();
          }

          // Prepare subscription details
          const subscriptionData = {
            subscription_id: plan.planId,
            status: false, // Set the default status as false 'Inactive' until payment approval
            payDay: payDay,
            isPaid: false, // Set the default as unpaid
            paymentUploaded: true,
            lastPaymentDate: plan.paymentDate,
          };

          if (this.role === "cliente") {
            userType = "cliente";
            userName = `${user.firstName} ${user.lastName}`; // Full name for clients
          } else if (this.role === "afiliado") {
            userType = "afiliado";
            userName = user.companyName; // Use companyName for affiliates
          }

          // Upload capture
          const paymentUrl = await this.uploadPaymentFile(
            plan.paymentFile,
            plan.paymentDate.split("T")[0],
            userType
          );
          console.log("File uploaded successfully:", paymentUrl);

          const paymentDetails = {
            subscription_id: plan.planId,
            isYearly: plan.isYearly || false,
            client_id: userId,
            amount: plan.amountPaid,
            date: plan.paymentDate,
            approved: false,
            paymentUrl: paymentUrl,
            type: "subscription",
          };

          // Save the payment to the payments collection
          const paymentRef = dbRef(
            db,
            `Payments/${userId}-${plan.paymentDate.split("T")[0]}`
          );
          await set(paymentRef, paymentDetails);

          // Update user collection
          const userRef = dbRef(db, `Users/${userId}/subscription`);
          await update(userRef, subscriptionData);

          // Notify client
          const appUrl = "https://app.rosecoupon.com";
          const userEmailPayload = {
            to: user.email,
            message: {
              subject: `Suscripción ${plan.planName.toUpperCase()} activada`,
              text: `Hola ${userName}, se le ha activado la Suscripción ${plan.planName.toUpperCase()} in Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
              html: `<p>Hola ${userName}, se le ha activado la Suscripción ${plan.planName} in Roseapp.</p>
                        <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`,
            },
          };
          await this.sendNotificationEmail(userEmailPayload);

          // Notify Admin
          const adminEmailPayload = {
            to: "roseindustry11@gmail.com",
            message: {
              subject: `Usuario ${this.role.toUpperCase()} se ha suscrito al Plan ${plan.planName.toUpperCase()}`,
              text: `El ${this.role.toUpperCase()}, ${userName}, se ha suscrito al plan ${plan.planName.toUpperCase()}.`,
              html: `<p>El ${this.role.toUpperCase()}, ${userName}, se ha suscrito al plan ${plan.planName.toUpperCase()}.</p>`,
            },
          };
          await this.sendNotificationEmail(adminEmailPayload);

          //Success alert
          Swal.fire({
            title: '¡Comprobante enviado!',
            text: 'Nuestro equipo pronto evaluará tu pago.',
            icon: 'success',
            confirmButtonText: 'OK'
          })

          //reset the image previews
          this.paymentPreview = null;

          // Hide the modal after submission
          const paymentModal = Modal.getOrCreateInstance(
            document.getElementById("notifyPaymentModal")
          );
          paymentModal.hide();

          // Redirect to Dashboard
          if (this.role === "cliente") {
            this.$router.push("/client-portal");
          } else if (this.role === "afiliado") {
            this.$router.push("/affiliate-portal");
          }
        } catch (error) {
          console.error("Error during uploading:", error);
          this.errorMessage =
            "Error al subir el archivo, por favor intente nuevamente.";
        } finally {
          // Hide the loader
          this.isSubmitting = false;
        }
      }
    },
    async uploadPaymentFile(file, date, type) {
      // Define storage reference for front or back ID file
      const fileName = `${date}-capture.${file.name.split(".").pop()}`;
      const fileRef = storageRef(
        storage,
        `payment-captures/${type}/${this.userId}-${this.userName}/${fileName}`
      );

      // Upload the file and get the download URL
      await uploadBytes(fileRef, file);
      return getDownloadURL(fileRef);
    },

    //File uploads
    handleFileUpload(file) {
      if (!file) return;

      this.paymentFile = file;
      this.paymentPreview = URL.createObjectURL(file);
    },
    clearDateFilter() {
      this.filterDate = null;
    },

    async setExchange() {
      if (confirm("¿Desea asignar este nueva tasa de cambio a la app?")) {
        const creditRef = dbRef(db, `Exchange`);
        try {
          const value = {
            value: parseFloat(this.exchange),
          };
          await update(creditRef, value);

          showToast("Tasa actualizada!", "success");

          // Reset form fields
          await this.fetchCurrentExchange();
        } catch (error) {
          console.error("Error setting exchange value:", error);
          alert("No se pudo editar el valor.");
        }
      }
    },
    async fetchCurrentExchange() {
      try {
        const exchangeRef = dbRef(db, `Exchange`);
        const exchangeSnapshot = await get(exchangeRef);

        if (exchangeSnapshot.exists()) {
          const exchangeData = exchangeSnapshot.val();
          this.exchange = exchangeData.value;
        } else {
          console.log("No exchange value found.");
          this.exchange = 0;
        }
      } catch (error) {
        console.error("Error fetching current exchange value:", error);
        this.exchange = 0;
      }
    },

    setActiveTab(type) {
      if (type) {
        this.activeTab = type;
      }
    },

    handleExchangeUpdated() {
      showToast("Tasa de cambio actualizada", "success");
      this.fetchCurrentExchange();
    },
    handlePlanAssigned() {
      this.fetchPlans();
      this.fetchUsers();
    },
    handlePageChange({ page, section }) {
      this.goToPage(page, section);
    },

    handleSearchChange({ query, type }) {
      this.searchQuery = query;
      this.activeTab = type;
    },
    handleDateFilterChange({ date, type }) {
      this.filterDate = date;
      this.activeTab = type;
    },

    selectClient(client) {
      this.selectedClient = client;
    },
    selectAffiliate(affiliate) {
      this.selectedAffiliate = affiliate;
    },
    async fetchExchangeRate() {
      try {
        const exchangeRef = dbRef(db, `Exchange`);
        const exchangeSnapshot = await get(exchangeRef);

        if (exchangeSnapshot.exists()) {
          const exchangeData = exchangeSnapshot.val();
          this.exchange = parseFloat(exchangeData.value);
        } else {
          console.log('No exchange value found.');
          this.exchange = 0;
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        this.exchange = 0;
      }
    },
  },
  async mounted() {
    const userStore = useUserStore();
    await userStore.fetchUser();
    this.role = userStore.role;
    this.userId = userStore.userId;
    this.userName = userStore.userName;

    await this.fetchCurrentExchange();

    if (this.role === "admin") {
      // this.activeTab = 'clients';
      await this.fetchClients();
      await this.fetchAffiliates();
      await this.fetchPlans();
      await this.fetchAffiliatePlans();
    }

    if (this.role === "cliente" || this.role === "afiliado") {
      // Handle client selection from query params
      const clientSubscriptionId = this.$route.query.clientSubscriptionId;

      if (clientSubscriptionId) {
        // this.loading = true;
        this.currentSub = clientSubscriptionId;
        // await this.fetchUserSubscription(clientSubscriptionId);
      }
    }

    if (this.role === "cliente") {
      this.activeTab = "clients";
      await this.fetchPlans();
    }

    if (this.role === "afiliado") {
      this.activeTab = "affiliates";
      await this.fetchAffiliatePlans();
    }

    // Make sure this is included to properly initialize Bootstrap components
    this.$nextTick(() => {
      // Initialize Bootstrap components if needed
    });
  },
};
</script>
<template>
  <!-- Page Header -->
  <header class="page-header responsive-margin">
    <div class="container">
      <div class="header-content">
        <div class="header-title">
          <h4 class="mb-0 fw-bold text-theme">
            <i class="fa-solid fa-handshake me-2"></i>
            Suscripciones
          </h4>
        </div>
        <!-- Exchange Rate Button - Only for Admin -->
        <div v-if="role === 'admin'" class="header-actions">
          <button class="btn btn-glass" data-bs-toggle="modal" data-bs-target="#setExchange">
            <i class="fa-solid fa-money-bill-transfer me-2"></i>
            Tasa de cambio
            <span class="exchange-badge" v-if="exchange">
              {{ exchange }}$
            </span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <div class="subscriptions-view">
    <!-- Admin View -->
    <AdminSubscriptionsView v-if="role === 'admin'" :loading="loading" :plans="plans" :affiliate-plans="affiliatePlans"
      :clients="clients" :affiliates="affiliates" :filtered-clients-subscriptions="filteredClientsSubscriptions"
      :all-filtered-clients-subscriptions="allFilteredClientsSubscriptions"
      :filtered-clients-no-subscriptions="filteredClientsNoSubscriptions" :all-filtered-clients-no-subscriptions="allFilteredClientsNoSubscriptions
        " :filtered-affiliates-subscriptions="filteredAffiliatesSubscriptions" :all-filtered-affiliates-subscriptions="allFilteredAffiliatesSubscriptions
          " :filtered-affiliates-no-subscriptions="filteredAffiliatesNoSubscriptions
            " :all-filtered-affiliates-no-subscriptions="allFilteredAffiliatesNoSubscriptions
              " :current-page="currentPage" @tab-changed="setActiveTab" @search-changed="handleSearchChange"
      @date-filter-changed="handleDateFilterChange" @date-filter-cleared="clearDateFilter"
      @page-changed="handlePageChange" @plans-updated="fetchPlans" @exchange-updated="handleExchangeUpdated" />

    <!-- Client/Affiliate View -->
    <UserSubscriptionsView v-else :loading="loadingPlans" :currentUserId="userId" :plans="sortedPlans"
      :current-sub="currentSub" :user-type="role || 'cliente'" :exchange="exchange" @contract-plan="contractPlan"
      @payment-submitted="notifyPayment" @file-uploaded="handleFileUpload" />

  </div>

  <!-- Add this somewhere in your template -->
  <ExchangeRateModal @exchange-updated="fetchExchangeRate" />
</template>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.header-title h2 {
  color: white;
  font-size: 1.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header-actions {
  display: flex;
  gap: 1rem;
}

/* Glass effect button */
.btn-glass {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-glass:active {
  transform: translateY(0);
}

.exchange-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  margin-left: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .page-header {
    padding: 1rem 0;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .header-title h2 {
    font-size: 1.5rem;
  }

  .btn-glass {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}

/* Navigation Tabs */
.nav-tabs-wrapper {
  background-color: #2d2d2d;
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.nav-tabs {
  border: none;
  gap: 0.5rem;
}

.nav-tabs .nav-link {
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;
}

.nav-tabs .nav-link:hover {
  background-color: rgba(111, 66, 193, 0.1);
}

.nav-tabs .nav-link.active {
  background-color: #6f42c1;
  color: white;
  border: none;
}

/* Button Styles */
.btn-outline-theme,
.btn-theme {
  border-radius: 20px;
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

.btn-group .btn {
  flex: 1;
  font-size: 0.875rem;
  padding: 0.375rem 0.5rem;
}

/* Filter dropdown styling */
.dropdown-menu {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  padding: 8px 0;
}

.dropdown-header {
  color: #6c757d;
  font-weight: 600;
  padding: 8px 16px;
}

.dropdown-item {
  padding: 8px 16px;
  color: #495057;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background-color: #f8f0ff;
}

.dropdown-item:active {
  background-color: purple;
  color: white;
}

.dropdown-divider {
  margin: 4px 0;
}

/* Card Styles */
.card {
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
}

.card-header {
  background-color: rgba(111, 66, 193, 0.1);
  border-bottom: 1px solid #444;
}

/* Table Styles */
.table {
  color: #fff;
}

.table th {
  border-color: #444;
  background-color: #2d2d2d;
}

.table td {
  border-color: #444;
}

/* Form Controls */
.form-control,
.form-select {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.form-control:focus,
.form-select:focus {
  background-color: #2d2d2d;
  border-color: #6f42c1;
  color: #fff;
  box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

/* Pagination */
.pagination {
  gap: 0.25rem;
}

.page-link {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
}

.page-link:hover {
  background-color: #444;
  border-color: #666;
  color: #fff;
}

.page-item.active .page-link {
  background-color: #6f42c1;
  border-color: #6f42c1;
}

/* Subscription List Styles */
.subscriptions-wrapper {
  background: #29122f;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
}

.subscription-list {
  padding: 1rem;
}

.subscription-item {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.subscription-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #6f42c1;
}

.subscription-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.subscription-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.subscription-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(111, 66, 193, 0.1);
  border-radius: 12px;
  color: #6f42c1;
}

.subscription-title {
  display: flex;
  flex-direction: column;
}

.plan-name {
  color: #ffffff;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.plan-price {
  color: #6f42c1;
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.25rem;
}

.plan-price small {
  font-size: 0.875rem;
  color: #888;
  font-weight: normal;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.active {
  background: #198754;
  color: white;
}

.status-badge.popular {
  background: #6f42c1;
  color: white;
}

.subscription-body {
  margin-bottom: 1.5rem;
}

.features-list {
  color: #ffffff;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  padding: 0.5rem 0;
  display: flex;
  align-items: center;
}

.plan-features li::before {
  content: "•";
  color: #6f42c1;
  font-weight: bold;
  margin-right: 0.5rem;
}

.subscription-actions {
  display: flex;
  justify-content: flex-end;
}

.subscription-actions .btn {
  min-width: 180px;
}

@media (max-width: 768px) {
  .subscription-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .subscription-info {
    width: 100%;
  }

  .subscription-actions {
    width: 100%;
  }

  .subscription-actions .btn {
    width: 100%;
  }
}

.responsive-margin {
  margin-bottom: 1.5rem;
  /* Default margin for all screens */
}

@media (min-width: 768px) {
  .responsive-margin {
    margin-bottom: 1rem;
    /* 2rem = mb-4 in Bootstrap */
  }
}

@media (max-width: 767px) {
  .responsive-margin {
    margin-bottom: 0;
  }
}
</style>