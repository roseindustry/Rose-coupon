<script>
import {
  ref as dbRef,
  query,
  orderByChild,
  equalTo,
  get,
  push,
  set,
  update,
  remove,
} from "firebase/database";
import {
  ref as storageRef,
  listAll,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage, functions } from "@/firebase/init";
import { useUserStore } from "@/stores/user-role";
import { Modal } from "bootstrap";
import { showToast } from "@/utils/toast";
import { sendEmail } from "@/utils/emailService";
import "toastify-js/src/toastify.css";

export default {
  data() {
    return {
      clients: [],
      affiliates: [],
      subscriptions: [],
      payments: [],
      approvedClientPayments: [],
      pendingClientPayments: [],
      approvedAffiliatePayments: [],
      pendingAffiliatePayments: [],
      pendingInstallments: [],
      approvedInstallments: [],
      filteredInstallments: [],

      paymentModalData: null,
      modalImageUrl: "",
      paymentType: "",
      isSubmitting: false,
      isLoading: false,
      activeFilter: "subscriptions",
      userType: "clients",
      historyFilter: "subscriptions",
      dateRange: {
        from: "",
        to: "",
      },
      filteredClientPayments: [],
      filteredAffiliatePayments: [],
      sortOrder: "newest",
      purchaseDataMap: new Map(),
      isFromHistory: false,
      searchQuery: "",
    };
  },
  async mounted() {
    await this.fetchClients();
    await this.fetchAffiliates();
    await this.fetchSubscriptions();
    await this.fetchPayments(this.historyFilter);
  },
  methods: {
    formatDate(date) {
      const dateString = date.split("T")[0];
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    },

    async fetchClients() {
      const role = "cliente";
      const clientRef = query(
        dbRef(db, "Users"),
        orderByChild("role"),
        equalTo(role)
      );

      try {
        const snapshot = await get(clientRef);

        if (snapshot.exists()) {
          const users = snapshot.val();

          // Map Firebase data to an array of promises
          const clientPromises = Object.keys(users).map(async (key) => {
            const clientData = {
              id: key,
              ...users[key],
              subscription: users[key].subscription || {},
              credit: users[key].credit || null,
            };

            return clientData;
          });

          // Await for all promises to resolve
          this.clients = await Promise.all(clientPromises);
        } else {
          this.clients = [];
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        this.clients = [];
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
        const affiliateSnapshot = await get(affiliatesRef);

        if (affiliateSnapshot.exists()) {
          const affiliates = affiliateSnapshot.val();

          this.affiliates = Object.keys(affiliates).map((key) => ({
            id: key,
            ...affiliates[key],
            subscription: affiliates[key].subscription || {},
          }));
        } else {
          console.log("No data available.");
        }
      } catch (error) {
        console.error("Error fetching affiliates:", error);
      }
    },
    async fetchSubscriptions() {
      try {
        const subscriptionRef = dbRef(db, `Suscriptions`);
        const subscriptionSnapshot = await get(subscriptionRef);

        if (subscriptionSnapshot.exists()) {
          const subscriptions = subscriptionSnapshot.val();

          const subPromises = Object.keys(subscriptions).map(async (key) => {
            const subData = {
              id: key,
              ...subscriptions[key],
            };
            return subData;
          });
          this.subscriptions = await Promise.all(subPromises);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
        return "Error al obtener la suscripción";
      }
    },

    // For subscriptions payments
    async fetchSubscription(user, role) {
      if (!user.subscription || !user.subscription.lastPaymentDate) {
        console.warn(
          `Skipping user ${user.id} due to missing subscription data.`
        );
        return;
      }

      try {
        const subscriptionRef = dbRef(db, `Users/${user.id}/subscription`);
        const subscriptionSnapshot = await get(subscriptionRef);

        if (subscriptionSnapshot.exists()) {
          user.subscription = subscriptionSnapshot.val();
          const subscriptionId = user.subscription.subscription_id;

          // Query the Suscriptions table to fetch the details
          let subscriptionDataRef;
          if (role === "cliente") {
            subscriptionDataRef = dbRef(db, `Suscriptions/${subscriptionId}`);
          } else if (role === "afiliado") {
            subscriptionDataRef = dbRef(
              db,
              `Affiliate_suscriptions/${subscriptionId}`
            );
          }

          const userSuscriptionSnapshot = await get(subscriptionDataRef);

          if (userSuscriptionSnapshot.exists()) {
            const userSubscription = userSuscriptionSnapshot.val();
            // Merge the userSubscription into the user's subscription object
            user.subscription = {
              ...user.subscription,
              ...userSubscription,
            };
            if (user.subscription.lastPaymentDate) {
              // In case the user made a payment
              const paymentDate =
                user.subscription.lastPaymentDate.split("T")[0];

              await this.fetchPaymentFiles(user, paymentDate, role);
            }
          }
        } else {
          // Set a default empty subscription if none exist
          user.subscription = null;
        }
      } catch (error) {
        console.error(
          `Error fetching subscription for user ${user.id}:`,
          error.message || error
        );
      }
    },

    // Fetch Payment Files for subscription payments
    async fetchPaymentFiles(user, date, role) {
      try {
        let userName;
        if (role === "cliente") {
          userName = `${user.firstName} ${user.lastName}`;
        } else if (role === "afiliado") {
          userName = `${user.companyName}`;
        }

        const folderRef = storageRef(
          storage,
          `payment-captures/${role}/${user.id}-${userName}`
        );

        // List all files in the user's payment-captures folder
        const fileList = await listAll(folderRef);

        // Filter files by date (ignoring extension)
        const matchingFile = fileList.items.find((fileRef) =>
          fileRef.name.startsWith(date)
        );

        if (matchingFile) {
          // Get the download URL for the matched file
          const paymentUrl = await getDownloadURL(matchingFile);

          // Assign the URL to the user object
          user.paymentUrl = paymentUrl;
        } else {
          if (role === "cliente") {
            console.warn(
              "No payment file found for the given date for the user: ",
              user.firstName,
              user.lastName,
              `(${user.role})`
            );
          } else if (role === "afiliado") {
            console.warn(
              "No payment file found for the given date for the user: ",
              user.companyName,
              `(${user.role})`
            );
          }
          user.paymentUrl = null;
        }
      } catch (error) {
        console.error("Error fetching payment file:", error.message || error);
        user.paymentUrl = null;
      }
    },

    // Fetch Payment History
    async fetchPayments(type) {
      this.isLoading = true;
      try {
        const paymentsRef = dbRef(db, "Payments");
        const snapshot = await get(paymentsRef);

        if (snapshot.exists()) {
          const payments = snapshot.val();
          const paymentsList = Object.entries(payments).map(
            ([id, payment]) => ({
              id,
              ...payment,
            })
          );

          // Separate pending and approved payments
          const pendingPayments = paymentsList.filter((p) => !p.approved);
          const approvedPayments = paymentsList.filter((p) => p.approved);

          // Process all approved payments first (both subscriptions and credit-cuota)
          const approvedWithData = await Promise.all(
            approvedPayments.map(async (payment) => {
              if (payment.type === "credit-cuota") {
                const purchaseRef = dbRef(
                  db,
                  `Users/${payment.client_id}/credit/main/purchases/${payment.purchase_id}`
                );
                const purchaseSnap = await get(purchaseRef);
                if (purchaseSnap.exists()) {
                  payment.purchaseData = purchaseSnap.val();
                }
              }
              return payment;
            })
          );

          // Store approved payments by type
          this.approvedInstallments = approvedWithData.filter(
            (p) => p.type === "credit-cuota"
          );
          this.approvedClientPayments = approvedWithData.filter(
            (p) => p.type === "subscription" && p.client_id
          );
          this.approvedAffiliatePayments = approvedWithData.filter(
            (p) => p.type === "subscription" && p.affiliate_id
          );

          // Handle pending payments based on type
          if (type === "credit-cuota") {
            this.pendingInstallments = await Promise.all(
              pendingPayments
                .filter((p) => p.type === "credit-cuota")
                .map(async (payment) => {
                  const purchaseRef = dbRef(
                    db,
                    `Users/${payment.client_id}/credit/main/purchases/${payment.purchase_id}`
                  );
                  const purchaseSnap = await get(purchaseRef);
                  if (purchaseSnap.exists()) {
                    payment.purchaseData = purchaseSnap.val();
                  }
                  return payment;
                })
            );
          } else {
            this.pendingClientPayments = pendingPayments.filter(
              (p) => p.type === "subscription" && p.client_id
            );
            this.pendingAffiliatePayments = pendingPayments.filter(
              (p) => p.type === "subscription" && p.affiliate_id
            );
          }

          // Initialize filtered lists based on current filter
          if (this.historyFilter === "credit-cuota") {
            this.filteredClientPayments = [...this.approvedInstallments];
            this.filteredAffiliatePayments = [];
          } else {
            this.filteredClientPayments = [...this.approvedClientPayments];
            this.filteredAffiliatePayments = [
              ...this.approvedAffiliatePayments,
            ];
          }
        }
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        this.isLoading = false;
      }
    },

    // Fetch purchase data
    fetchPurchaseData(clientId, purchaseId) {
      // Check cache first
      const cacheKey = `${clientId}-${purchaseId}`;
      if (this.purchaseDataMap.has(cacheKey)) {
        return this.purchaseDataMap.get(cacheKey);
      }

      // If not in cache, set initial value and start fetch
      this.purchaseDataMap.set(cacheKey, {
        productName: "Cargando...",
        terms: "N/A",
      });

      // Start async fetch
      this.fetchPurchaseDataAsync(clientId, purchaseId);

      // Return current value
      return this.purchaseDataMap.get(cacheKey);
    },

    // Fetch purchase data
    async fetchPurchaseDataAsync(clientId, purchaseId) {
      const cacheKey = `${clientId}-${purchaseId}`;
      try {
        // Check active purchases first
        const activeRef = dbRef(
          db,
          `Users/${clientId}/credit/main/purchases/${purchaseId}`
        );
        let purchaseSnapshot = await get(activeRef);

        if (purchaseSnapshot.exists()) {
          const data = purchaseSnapshot.val();
          this.purchaseDataMap.set(cacheKey, {
            productName: data.productName || "Producto sin nombre",
            terms: data.terms || "N/A",
          });
          return;
        }

        // If not found, check archived purchases
        const archiveRef = dbRef(
          db,
          `Archive/${clientId}/purchases/${purchaseId}`
        );
        purchaseSnapshot = await get(archiveRef);

        if (purchaseSnapshot.exists()) {
          const data = purchaseSnapshot.val();
          this.purchaseDataMap.set(cacheKey, {
            productName: data.productName || "Producto sin nombre",
            terms: data.terms || "N/A",
          });
          return;
        }

        // If not found anywhere, cache null result
        this.purchaseDataMap.set(cacheKey, {
          productName: "Producto no encontrado",
          terms: "N/A",
        });
      } catch (error) {
        console.error(`Error fetching purchase data for ${purchaseId}:`, error);
        this.purchaseDataMap.set(cacheKey, {
          productName: "Error al cargar producto",
          terms: "N/A",
        });
      }
    },

    async openImgModal(
      payment,
      url,
      type,
      purchaseId = null,
      cuotaId = null,
      fromHistory = false
    ) {
      this.paymentModalData = payment;
      this.modalImageUrl = url;
      this.paymentType = type;
      this.isFromHistory = fromHistory;

      // Set selected purchase and cuota IDs for cuota payment validation
      if (type === "credit-cuota") {
        this.paymentModalData.selectedPurchaseId = purchaseId;
        this.paymentModalData.selectedCuotaId = cuotaId;
      }

      new Modal(document.getElementById("idImgModal")).show();
    },

    async validateSubscriptionPayment(userId) {
      const user = this.clients.find((client) => client.id === userId);

      if (!confirm("¿Está seguro de que desea aprobar este pago?")) {
        return;
      }

      let userName;
      if (user.role === "cliente") {
        userName = `${user.firstName} ${user.lastName}`;
      } else if (user.role === "afiliado") {
        userName = `${user.companyName}`;
      }

      const paymentDate = this.formatDate(user.subscription.lastPaymentDate);

      try {
        // Show the loader
        this.isSubmitting = true;

        // Mark client's subscription as paid and active
        const userRef = dbRef(db, `Users/${user.id}/subscription`);
        await update(userRef, {
          isPaid: true,
          paymentVerified: true,
          status: true,
        });

        // Mark Payment as approved for bookeeping
        const paymentRef = dbRef(db, `Payments`);
        const paymentSnapshot = await get(paymentRef);
        if (paymentSnapshot.exists()) {
          const payments = paymentSnapshot.val();

          // Find and update the relevant payment
          Object.entries(payments).forEach(async ([paymentId, payment]) => {
            const clientId = paymentId.split("-")[0];
            const date = payment.date.split("T")[0];
            const comparableDate = payment.date.split("T")[0];

            if (clientId === user.id && date === comparableDate) {
              const specificPaymentRef = dbRef(db, `Payments/${paymentId}`);
              await update(specificPaymentRef, { approved: true });
            }
          });
        }

        // Send an email notification to the user through Firebase Cloud Functions
        const emailPayload = {
          to: user.email,
          message: {
            subject: "Su pago de Suscripción ha sido aprobado en Rose App",
            text: `Hola ${userName}, tu pago del día ${paymentDate} ha sido aprobado.`,
          },
        };

        // Send email via the utility function
        const result = await sendEmail(emailPayload);

        if (result.success) {
          console.log("Email sent successfully:", result.message);
        } else {
          console.error("Failed to send email:", result.error);
        }

        showToast("Pago aprobado. Se ha notificado al cliente.");
        //Close Payment modal after approval
        const modal = Modal.getOrCreateInstance(
          document.getElementById("idImgModal")
        );
        modal.hide();
        this.fetchClients();
        this.fetchAffiliates();
      } catch (error) {
        console.error("Error approving ID:", error);
      } finally {
        // Hide the loader
        this.isSubmitting = false;
      }
    },
    async deletePayment(paymentId) {
      if (!confirm("¿Está seguro de que desea eliminar este pago?")) {
        return;
      }
      const paymentRef = dbRef(db, `Payments/${paymentId}`);
      await remove(paymentRef);
      await this.fetchPayments(this.historyFilter);
    },

    async validateCuotaPayment(payment) {
      if (!confirm("¿Está seguro de que desea aprobar este pago?")) {
        return;
      }

      try {
        this.isSubmitting = true;

        // Get purchase data first
        const purchaseRef = dbRef(
          db,
          `Users/${payment.client_id}/credit/main/purchases/${payment.purchase_id}`
        );
        const purchaseSnap = await get(purchaseRef);

        if (!purchaseSnap.exists()) {
          throw new Error("Datos de compra no encontrados");
        }

        const purchaseData = purchaseSnap.val();

        // Get the cuota data to get the correct USD amount
        const cuotaRef = dbRef(
          db,
          `Users/${payment.client_id}/credit/main/purchases/${payment.purchase_id}/cuotas/${payment.cuota_id}`
        );
        const cuotaSnap = await get(cuotaRef);

        if (!cuotaSnap.exists()) {
          throw new Error("Datos de cuota no encontrados");
        }

        const cuotaData = cuotaSnap.val();
        const cuotaAmountUSD = Number(cuotaData.amount); // This is the USD amount to use for credit updates

        // Calculate points based on payment timing
        let pointsToAdd = 10; // Default points
        const paymentDate = new Date(payment.date);
        const cuotaDueDate = new Date(cuotaData.date);
        
        // Calculate days before due date
        const timeDiff = cuotaDueDate.getTime() - paymentDate.getTime();
        const daysDifference = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Add 5 extra points if paid 3 or more days before due date
        if (daysDifference >= 3) {
          pointsToAdd = 15;
        }

        // Update client's points
        const clientPointsRef = dbRef(
          db,
          `Users/${payment.client_id}/credit/main/points`
        );
        const pointsSnap = await get(clientPointsRef);
        const currentPoints = pointsSnap.exists() ? pointsSnap.val() : 0;
        const newPoints = currentPoints + pointsToAdd;

        await set(clientPointsRef, newPoints);

        // Update client's cuota status
        await update(cuotaRef, {
          paid: true,
          paymentDate: payment.date.split('T')[0]
        });

        // Update affiliate's cuota status
        const affiliateCuotaRef = dbRef(
          db,
          `Users/${purchaseData.affiliate_id}/credit/sales/${payment.purchase_id}/cuotas/${payment.cuota_id}`
        );
        await update(affiliateCuotaRef, {
          paid: true,
          paymentDate: payment.date.split('T')[0]
        });

        // Update client's available credit - using cuota amount in USD
        const clientCreditRef = dbRef(
          db,
          `Users/${payment.client_id}/credit/main`
        );
        const clientCreditSnap = await get(clientCreditRef);

        if (clientCreditSnap.exists()) {
          const currentCredit = clientCreditSnap.val().availableCredit || 0;
          const newCredit = currentCredit + cuotaAmountUSD;
          await update(clientCreditRef, { availableCredit: newCredit });
        }

        // Update affiliate's available credit - using cuota amount in USD
        const affiliateCreditRef = dbRef(
          db,
          `Users/${purchaseData.affiliate_id}/credit/main`
        );
        const affiliateCreditSnap = await get(affiliateCreditRef);

        if (affiliateCreditSnap.exists()) {
          const currentCredit = affiliateCreditSnap.val().availableCredit || 0;
          const newCredit = currentCredit + cuotaAmountUSD;
          await update(affiliateCreditRef, { availableCredit: newCredit });
        }

        // Mark payment as approved
        const paymentRef = dbRef(db, `Payments/${payment.id}`);
        await update(paymentRef, {
          approved: true,
          approvedDate: new Date().toISOString().split('T')[0]
        });

        // Get client data for email
        const clientRef = dbRef(db, `Users/${payment.client_id}`);
        const clientSnap = await get(clientRef);
        const clientData = clientSnap.val();

        // Send email notification
        const emailPayload = {
          to: clientData.email,
          message: {
            subject: `El pago de su cuota por la compra de (${purchaseData.productName}) ha sido aprobado en Rose App`,
            text: `Hola ${clientData.firstName} ${clientData.lastName}, tu pago del día ${payment.date.split("T")[0]} ha sido aprobado.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #6f42c1;">Pago Aprobado</h2>
                <p>Hola ${clientData.firstName} ${clientData.lastName},</p>
                <p>Tu pago del día ${payment.date.split("T")[0]} por la compra de <strong>${purchaseData.productName}</strong> ha sido aprobado.</p>
                <p>Detalles del pago:</p>
                <ul>
                  <li>Monto pagado: ${payment.amount} VES</li>
                  <li>Cuota: ${Number(cuotaAmountUSD).toFixed(2)} USD</li>
                  <li>Fecha de pago: ${payment.date.split("T")[0]}</li>
                  <li>Puntos ganados: ${pointsToAdd} puntos</li>
                  ${daysDifference >= 3 ? '<li><strong>¡Bonus!</strong> Puntos extra por pago anticipado</li>' : ''}
                </ul>
                <p>Gracias por usar Rose App.</p>
              </div>
            `
          },
        };

        const emailResult = await sendEmail(emailPayload);
        if (!emailResult.success) {
          console.error("Error sending email:", emailResult.error);
        }

        showToast("Pago aprobado. Se ha notificado al cliente.");
        const modal = Modal.getOrCreateInstance(
          document.getElementById("idImgModal")
        );
        modal.hide();

        await this.fetchPayments("credit-cuota");
      } catch (error) {
        console.error("Error approving payment:", error);
        showToast("Error al aprobar el pago: " + error.message, "error");
      } finally {
        this.isSubmitting = false;
      }
    },
    async disapproveCuotaPayment(user) {
      const selectedPurchase =
        user.credit.main.purchases[user.selectedPurchaseId];
      if (!selectedPurchase) {
        console.error("Purchase not found for ID:", user.selectedPurchaseId);
        return;
      }

      const selectedCuota = selectedPurchase.cuotas.find(
        (cuota) => cuota.cuote == user.selectedCuotaId
      );
      if (!selectedCuota) {
        console.error("Cuota not found for ID:", user.selectedCuotaId);
        return;
      }

      if (confirm("¿Está seguro de que desea desaprobar este pago?")) {
        try {
          this.isSubmitting = true;

          // Mark payment as disapproved in the client's cuotas
          const cuotaRef = dbRef(
            db,
            `Users/${user.id}/credit/main/purchases/${selectedPurchase.purchaseId}/cuotas/${selectedCuota.cuotaId}`
          );
          await update(cuotaRef, { paid: false });

          // Mark payment as disapproved in the affiliate's cuotas
          const AffiliateCuotaRef = dbRef(
            db,
            `Users/${selectedPurchase.affiliate_id}/credit/sales/${selectedPurchase.purchaseId}/cuotas/${selectedCuota.cuotaId}`
          );
          await update(AffiliateCuotaRef, { paid: false, disapproved: true });

          // Optional: You may want to send a notification or email to the client
          const emailPayload = {
            to: user.email,
            message: {
              subject: `El pago de su cuota ha sido negado`,
              text: `Hola ${user.firstName}, lamentamos informarte que tu pago del ${selectedCuota.paidAt.split("T")[0]} ha sido desaprobado. Vuelve a subir tu captura de pago en la app.`,
            },
          };
          // Send email via the utility function
          const result = await sendEmail(emailPayload);

          if (result.success) {
            console.log("Email sent successfully:", result.message);
          } else {
            console.error("Failed to send email:", result.error);
          }

          showToast("Pago desaprobado. Se ha notificado al cliente.");
          const modal = Modal.getOrCreateInstance(
            document.getElementById("idImgModal")
          );
          modal.hide();

          // Optionally refresh data
          this.fetchClients();
          this.fetchAffiliates();
        } catch (error) {
          console.error("Error disapproving cuota payment:", error);
        } finally {
          this.isSubmitting = false;
        }
      }
    },

    // Match data
    getClient(clientId) {
      if (!clientId || !this.clients) {
        return { firstName: "Cliente", lastName: "No Disponible", id: null };
      }
      const client = this.clients.find((client) => client.id === clientId);
      return (
        client || {
          firstName: "Cliente",
          lastName: "No Encontrado",
          id: clientId,
        }
      );
    },
    getAffiliate(affiliateId) {
      if (!affiliateId || !this.affiliates) {
        return { companyName: "Comercio no disponible", id: null };
      }
      const affiliate = this.affiliates.find(
        (affiliate) => affiliate.id === affiliateId
      );
      return (
        affiliate || { companyName: "Comercio no encontrado", id: affiliateId }
      );
    },
    getSubscriptionData(subscription_id) {
      if (!subscription_id || !this.subscriptions) {
        return { name: "No disponible", price: 0 };
      }
      const subscription = this.subscriptions.find(
        (subscription) => subscription.id === subscription_id
      );
      return subscription || { name: "Suscripción no encontrada", price: 0 };
    },
    getCuotaData(payment) {
      try {
        // Check if payment has purchaseData and cuotas
        if (!payment.purchaseData?.cuotas) {
          return { amount: "N/A" };
        }

        // Get the cuotas array
        const cuotas = payment.purchaseData.cuotas;

        // Since cuotas is an array and cuota_id represents the index
        const cuota = cuotas[payment.cuota_id];

        if (!cuota) {
          return { amount: "N/A", date: null };
        }

        // Return the amount formatted to 2 decimal places
        return {
          amount: cuota.amount?.toFixed(2) || "N/A",
          date: cuota.date
        };
      } catch (error) {
        console.error("Error getting cuota data:", error);
        return { amount: "Error" };
      }
    },

    // Filter logic
    async setHistoryFilter(filter) {
      try {
        this.isLoading = true;
        this.historyFilter = filter;
        this.userType = "clients";
        await this.fetchPayments(filter);
      } catch (error) {
        console.error("Error setting history filter:", error);
      } finally {
        this.isLoading = false;
      }
    },
    filterHistoryByType(type) {
      this.historyFilter = type;

      if (type === "subscriptions") {
        // Show subscription payments for current user type
        if (this.userType === "clients") {
          this.filteredClientPayments = [...this.approvedClientPayments];
          this.filteredAffiliatePayments = [];
        } else {
          this.filteredClientPayments = [];
          this.filteredAffiliatePayments = [...this.approvedAffiliatePayments];
        }
      } else if (type === "credit-cuota") {
        // Show credit-cuota payments (only for clients)
        this.filteredClientPayments = [...this.approvedInstallments];
        this.filteredAffiliatePayments = [];
      }

      // Apply date filter after setting the lists
      this.filterPaymentsByDate();
    },
    filterPaymentsByDate() {
      this.applyFilters();
    },
    clearDateFilter() {
      this.dateRange.from = "";
      this.dateRange.to = "";
      this.filterPaymentsByDate(); // This will now respect the historyFilter
    },
    filterDisplayedPayments() {
      this.applyFilters();
    },
    // Add helper method for date filtering
    isWithinDateRange(paymentDate, fromDate, toDate) {
      const date = new Date(paymentDate.split("T")[0]);

      if (fromDate && toDate) {
        return date >= fromDate && date <= toDate;
      } else if (fromDate) {
        return date >= fromDate;
      } else if (toDate) {
        return date <= toDate;
      }
      return true;
    },
    sortPayments(payments) {
      return [...payments].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return this.sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
    },
    // Main filtering method that handles all cases
    applyFilters() {
      let filteredPayments = [];

      // Get the base array depending on payment type
      if (this.historyFilter === "credit-cuota") {
        filteredPayments = [...this.approvedInstallments];
      } else {
        filteredPayments = [...this.approvedClientPayments];
      }

      // Apply date filter if exists
      if (this.hasDateFilter) {
        const fromDate = this.dateRange.from
          ? new Date(this.dateRange.from)
          : null;
        const toDate = this.dateRange.to ? new Date(this.dateRange.to) : null;

        filteredPayments = filteredPayments.filter((payment) =>
          this.isWithinDateRange(payment.date, fromDate, toDate)
        );
      }

      // Apply search filter if exists
      if (this.searchQuery.trim()) {
        const searchTerm = this.searchQuery.toLowerCase().trim();

        filteredPayments = filteredPayments.filter((payment) => {
          const client = this.clients.find((c) => c.id === payment.client_id);
          if (!client) return false;

          const fullName =
            `${client.firstName} ${client.lastName}`.toLowerCase();
          return (
            fullName.includes(searchTerm) ||
            client.identification.toString().toLowerCase().includes(searchTerm)
          );
        });
      }

      // Sort the filtered results
      filteredPayments = this.sortPayments(filteredPayments);

      // Update the filtered arrays
      if (this.historyFilter === "credit-cuota") {
        this.filteredClientPayments = filteredPayments;
        this.filteredAffiliatePayments = [];
      } else {
        // Handle affiliate payments for subscriptions
        let filteredAffiliatePayments = [...this.approvedAffiliatePayments];

        if (this.hasDateFilter) {
          const fromDate = this.dateRange.from
            ? new Date(this.dateRange.from)
            : null;
          const toDate = this.dateRange.to ? new Date(this.dateRange.to) : null;

          filteredAffiliatePayments = filteredAffiliatePayments.filter(
            (payment) => this.isWithinDateRange(payment.date, fromDate, toDate)
          );
        }

        if (this.searchQuery.trim()) {
          const searchTerm = this.searchQuery.toLowerCase().trim();

          filteredAffiliatePayments = filteredAffiliatePayments.filter(
            (payment) => {
              const affiliate = this.affiliates.find(
                (a) => a.id === payment.affiliate_id
              );
              if (!affiliate) return false;

              return (
                affiliate.companyName.toLowerCase().includes(searchTerm) ||
                affiliate.rif.toString().toLowerCase().includes(searchTerm)
              );
            }
          );
        }

        this.filteredClientPayments = filteredPayments;
        this.filteredAffiliatePayments = this.sortPayments(
          filteredAffiliatePayments
        );
      }
    },
    hasDateFilter() {
      return this.dateRange.from || this.dateRange.to;
    },
  },

  watch: {
    approvedClientPayments: {
      handler() {
        this.filterPaymentsByDate();
      },
      immediate: true,
    },
    approvedAffiliatePayments: {
      handler() {
        this.filterPaymentsByDate();
      },
      immediate: true,
    },
    sortOrder() {
      this.filterPaymentsByDate();
    },
    historyFilter(newVal) {
      this.filterHistoryByType(newVal);
    },
    userType() {
      this.filterHistoryByType(this.historyFilter);
    },
  },

  computed: {
    displayedPayments() {
      // If viewing credit-cuota payments
      if (this.historyFilter === "credit-cuota") {
        return this.filteredClientPayments; // Only show client cuota payments
      }

      // If viewing subscription payments
      if (this.historyFilter === "subscriptions") {
        // Show payments based on selected user type
        return this.userType === "clients"
          ? this.filteredClientPayments
          : this.filteredAffiliatePayments;
      }

      // Default case
      return [];
    },
    hasActiveFilters() {
      return this.dateRange.from || this.dateRange.to;
    },
  },
};
</script>
<template>
  <div class="payments-view">
    <!-- Header Section -->
    <div class="d-flex justify-content-between gap-4 align-items-center mb-4">
      <h4 class="mb-0 fw-bold text-theme">
        <i class="fas fa-money-bill-wave me-2"></i>
        Pagos
      </h4>
      <div class="payment-filters">
        <div class="btn-group" role="group">
          <button class="btn btn-outline-theme" :class="{ active: activeFilter === 'subscriptions' }" @click="
            (activeFilter = 'subscriptions'), fetchPayments('subscriptions')
            ">
            <i class="fas fa-handshake me-2"></i>
            <span class="d-none d-sm-inline">Suscripciones</span>
            <span class="d-sm-none ms-1">Susc.</span>
          </button>

          <button class="btn btn-outline-theme" :class="{ active: activeFilter === 'installments' }" @click="
            (activeFilter = 'installments'), fetchPayments('credit-cuota')
            ">
            <i class="fas fa-credit-card me-2"></i>
            <span class="d-none d-sm-inline">Cuotas a Crédito</span>
            <span class="d-sm-none ms-1">Cuotas</span>
          </button>
          <button class="btn btn-outline-theme" :class="{ active: activeFilter === 'history' }"
            @click="activeFilter = 'history'">
            <i class="fas fa-history me-2"></i>
            <span class="d-none d-sm-inline">Historial</span>
            <span class="d-sm-none ms-1">Hist.</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Subscription Section -->
    <div v-show="activeFilter === 'subscriptions'" class="payment-section">
      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="card-title mb-0">
              <i class="fas fa-users me-2"></i>
              Pendientes por Aprobación
            </h5>
            <div class="d-flex gap-3">
              <div class="filter-select-container">
                <div class="select-wrapper">
                  <i class="fas fa-filter filter-icon"></i>
                  <select class="form-select form-select-sm" v-model="sortOrder">
                    <option value="newest">Más recientes</option>
                    <option value="oldest">Más antiguos</option>
                  </select>
                </div>
              </div>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-theme" :class="{ active: userType === 'clients' }"
                  @click="userType = 'clients'">
                  <i class="fas fa-users me-sm-2"></i>
                  <span class="d-none d-sm-inline">Clientes</span>
                  <span v-if="pendingClientPayments.length" class="badge bg-theme ms-1">
                    {{ pendingClientPayments.length || 0 }}
                  </span>
                </button>
                <button class="btn btn-sm btn-outline-theme" :class="{ active: userType === 'affiliates' }"
                  @click="userType = 'affiliates'">
                  <i class="fas fa-store me-sm-2"></i>
                  <span class="d-none d-sm-inline">Comercios</span>
                  <span class="badge bg-theme ms-1">
                    {{ pendingAffiliatePayments.length || 0 }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Payment Cards Grid -->
          <div v-if="isLoading" class="row g-4">
            <div class="col-12">
              <div class="d-flex justify-content-center align-items-center">
                <div class="text-center">
                  <div class="mb-3 mt-5">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="row g-4">
            <div v-if="userType === 'clients'" class="col-12">
              <div v-if="pendingClientPayments.length > 0" class="row g-3">
                <div v-for="payment in sortPayments(
                  pendingClientPayments.filter(
                    (p) => p.type === 'subscription'
                  )
                )" :key="payment.id" class="col-12 col-lg-4">
                  <div class="card custom-card payment-card h-100">
                    <div class="card-body d-flex flex-column">
                      <!-- Header Section -->
                      <div class="card-header-custom mb-3">
                        <div class="icon-wrapper mb-2">
                          <i class="fas fa-handshake"></i>
                        </div>
                        <h5 class="card-title mb-1">
                          {{ getClient(payment.client_id).firstName }}
                          {{ getClient(payment.client_id).lastName }}
                        </h5>
                        <div class="payment-status" v-if="payment.approved">
                          <span class="badge bg-success">Aprobado</span>
                        </div>
                      </div>

                      <!-- Payment Details Section -->
                      <div class="payment-details">
                        <!-- Subscription Specific Info -->
                        <div v-if="payment.type === 'subscription'" class="info-group">
                          <div class="info-item">
                            <span class="info-label">Suscripción:</span>
                            <span class="info-value">{{
                              getSubscriptionData(
                                payment.subscription_id
                              ).name.toUpperCase()
                            }}</span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">Monto en USD:</span>
                            <span class="info-value">${{
                              getSubscriptionData(payment.subscription_id)
                                .price
                            }}</span>
                          </div>
                        </div>

                        <!-- Common Payment Info -->
                        <div class="info-group">
                          <div class="info-item">
                            <span class="info-label">Monto Pagado:</span>
                            <span class="info-value">Bs.{{ payment.amount }}</span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">Fecha:</span>
                            <span class="info-value">{{
                              formatDate(payment.date)
                              }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Actions Section -->
                      <div v-if="payment.paymentUrl || payment.proofUrl" class="payment-actions mt-auto pt-3">
                        <div class="d-flex justify-content-center">
                          <button class="btn btn-sm btn-outline-success w-auto" @click="openImgModal(
                            payment,
                            payment.paymentUrl,
                            payment.type,
                            null,
                            null,
                            false)">
                            <i class="fas fa-receipt me-2"></i>
                            Ver Comprobante
                          </button>
                        </div>
                        <small class="d-flex justify-content-center text-muted mt-2">
                          Haga clic en "Ver Comprobante" para validar el pago.
                        </small>
                      </div>
                      <div v-else class="payment-actions mt-auto pt-3">
                        <div class="d-flex justify-content-center gap-2">
                          <button class="btn btn-sm btn-outline-success" @click="
                            validateSubscriptionPayment(
                              getClient(payment.client_id)
                            )
                            ">
                            <i class="fas fa-check me-2"></i>
                            Aprobar
                          </button>
                          <button class="btn btn-sm btn-outline-danger" @click="deletePayment(payment.id)">
                            <i class="fas fa-times me-2"></i>
                            Cancelar
                          </button>
                        </div>
                        <small class="d-flex justify-content-center text-muted mt-2">
                          Hubo un error al obtener la captura de pago.
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="d-flex justify-content-center align-items-center">
                <div class="text-center">
                  <div class="mb-3 mt-5">
                    <i class="fa-solid fa-hand-holding-dollar text-body text-opacity-25" style="font-size: 5em"></i>
                  </div>
                  <h5>No hay Pagos.</h5>
                </div>
              </div>
            </div>
            <div v-if="userType === 'affiliates'" class="col-12">
              <div class="row g-3">
                <div v-if="pendingAffiliatePayments.length > 0">
                  <div v-for="payment in sortPayments(pendingAffiliatePayments)" :key="payment.id"
                    class="col-sm-6 col-lg-4 mb-4">
                    <div class="card custom-card payment-card h-100">
                      <div class="card-body d-flex flex-column">
                        <!-- Header Section -->
                        <div class="card-header-custom mb-3">
                          <div class="icon-wrapper mb-2">
                            <i class="fas fa-handshake"></i>
                          </div>
                          <h5 class="card-title mb-1">
                            {{ getAffiliate(payment.affiliate_id).companyName }}
                          </h5>
                          <div class="payment-status" v-if="payment.approved">
                            <span class="badge bg-success">Aprobado</span>
                          </div>
                        </div>

                        <!-- Payment Details Section -->
                        <div class="payment-details">
                          <!-- Credit Cuota Specific Info -->
                          <div v-if="payment.type === 'credit-cuota'" class="info-group">
                            <div class="info-item">
                              <span class="info-label">Suscripción:</span>
                              <span class="info-value">{{
                                getSubscriptionData(
                                  payment.subscription_id
                                ).name.toUpperCase()
                              }}</span>
                            </div>
                            <div class="info-item">
                              <span class="info-label">Monto en USD:</span>
                              <span class="info-value">${{
                                getSubscriptionData(payment.subscription_id)
                                  .price
                              }}</span>
                            </div>
                          </div>

                          <!-- Common Payment Info -->
                          <div class="info-group">
                            <div class="info-item">
                              <span class="info-label">Monto Pagado:</span>
                              <span class="info-value">Bs.{{ payment.amount }}</span>
                            </div>
                            <div class="info-item">
                              <span class="info-label">Fecha:</span>
                              <span class="info-value">{{
                                formatDate(payment.date)
                                }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- Actions Section -->
                        <div class="payment-actions mt-auto pt-3">
                          <div class="d-flex flex-column gap-2">
                            <button v-if="payment.paymentUrl" class="btn btn-outline-theme btn-sm w-auto" @click="
                              openImgModal(
                                payment,
                                payment.paymentUrl,
                                payment.type,
                                null,
                                null,
                                false
                              )
                              ">
                              <i class="fas fa-receipt me-2"></i>Ver Comprobante
                            </button>
                            <small class="text-muted">
                              Haga clic en "Ver Comprobante" para validar el
                              pago
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="d-flex justify-content-center align-items-center">
                  <div class="text-center">
                    <div class="mb-3 mt-5">
                      <i class="fa-solid fa-hand-holding-dollar text-body text-opacity-25" style="font-size: 5em"></i>
                    </div>
                    <h5>No hay Pagos.</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Installments Section -->
    <div v-show="activeFilter === 'installments'" class="payment-section">
      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="card-title mb-0">
              <i class="fas fa-credit-card me-2"></i>
              Pendientes por Aprobación
            </h5>
            <div class="filter-select-container">
              <div class="select-wrapper">
                <i class="fas fa-filter filter-icon"></i>
                <select class="form-select form-select-sm" v-model="sortOrder">
                  <option value="newest">Más recientes</option>
                  <option value="oldest">Más antiguos</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Payment Cards Grid -->
          <div v-if="isLoading" class="row g-4">
            <div class="col-12">
              <div class="d-flex justify-content-center align-items-center">
                <div class="text-center">
                  <div class="mb-3 mt-5">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="row g-4">
            <div class="col-12">
              <div v-if="pendingInstallments.length > 0" class="row g-3">
                <div v-for="payment in sortPayments(pendingInstallments)" :key="payment.id" class="col-12 col-lg-4">
                  <div class="card custom-card payment-card h-100">
                    <div class="card-body d-flex flex-column">
                      <!-- Header Section -->
                      <div class="card-header-custom mb-3">
                        <div class="icon-wrapper mb-2">
                          <i class="fas fa-credit-card"></i>
                        </div>
                        <div class="d-flex justify-content-between">
                          <h5 class="card-title mb-1">
                            {{ getClient(payment.client_id).firstName }}
                            {{ getClient(payment.client_id).lastName }}
                          </h5>
                          <span v-if="payment.isLatePayment" class="badge rounded-pill bg-danger w-auto">Pago
                            Atrasado</span>
                        </div>
                      </div>

                      <!-- Payment Details Section -->
                      <div class="payment-details">
                        <!-- Credit Cuota Specific Info -->
                        <div v-if="payment.type === 'credit-cuota'" class="info-group">
                          <div class="info-item">
                            <span class="info-label">Comercio:</span>
                            <span class="info-value">{{
                              getAffiliate(payment.purchaseData?.affiliate_id)
                                .companyName || "N/A"
                            }}</span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">Producto:</span>
                            <span class="info-value">
                              <template v-if="
                                !purchaseDataMap.has(
                                  `${payment.client_id}-${payment.purchase_id}`
                                )
                              ">
                                <i class="fas fa-spinner fa-spin me-1"></i>Cargando...
                              </template>
                              <template v-else>
                                {{
                                  fetchPurchaseData(
                                    payment.client_id,
                                    payment.purchase_id
                                  ).productName
                                }}
                              </template>
                            </span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">Cuota:</span>
                            <span class="info-value">{{ Number(payment.cuota_id) + 1 || "N/A" }} de
                              {{
                                fetchPurchaseData(
                                  payment.client_id,
                                  payment.purchase_id
                                ).terms
                              }}</span>
                          </div>
                        </div>

                        <!-- Common Payment Info -->
                        <div class="info-group">
                          <div class="info-item">
                            <span class="info-label">Monto VES:</span>
                            <span class="info-value">Bs.{{ Number(payment.amount).toFixed(2) }}</span>
                          </div>
                          <div class="info-item" v-if="payment.isLatePayment">
                            <span class="info-label">Monto Original:</span>
                            <span class="info-value">
                              ${{ payment.originalAmount }}
                            </span>
                          </div>
                          <div class="info-item" v-if="payment.isLatePayment">
                            <span class="info-label">Cargo:</span>
                            <span class="info-value">
                              ${{ payment.lateFee }} adicional por pago atrasado
                            </span>
                          </div>
                          <div class="info-item" v-if="payment.type === 'credit-cuota'">
                            <span class="info-label">Monto USD:</span>
                            <span class="info-value">
                              <template v-if="payment.purchaseData">
                                ${{ payment.totalAmount || getCuotaData(payment).amount }}
                              </template>
                              <template v-else>
                                <i class="fas fa-spinner fa-spin me-1"></i>Cargando...
                              </template>
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Due date and payment date -->
                      <div class="date-details">
                        <div class="info-group">
                          <div class="info-item">
                            <span class="info-label">Fecha límite de Pago:</span>
                            <span class="info-value">{{
                              formatDate(getCuotaData(payment).date)
                              }}</span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">Fecha de Pago:</span>
                            <span class="info-value">{{
                              formatDate(payment.date)
                              }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Actions Section -->
                      <div class="payment-actions mt-auto pt-3">
                        <div class="d-flex flex-column gap-2">
                          <button v-if="payment.paymentUrl || payment.proofUrl"
                            class="btn btn-outline-theme btn-sm w-auto" @click="
                              openImgModal(
                                payment,
                                payment.paymentUrl || payment.proofUrl,
                                payment.type,
                                null,
                                null,
                                false
                              )
                              ">
                            <i class="fas fa-receipt me-2"></i>Ver Comprobante
                          </button>
                          <small class="text-muted">
                            Haga clic en "Ver Comprobante" para validar el pago
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="d-flex justify-content-center align-items-center">
                <div class="text-center">
                  <div class="mb-3 mt-5">
                    <i class="fa-solid fa-credit-card text-body text-opacity-25" style="font-size: 5em"></i>
                  </div>
                  <h5>No hay pagos de cuotas pendientes.</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- History Section -->
    <div v-show="activeFilter === 'history'" class="payment-section">
      <div class="card mb-4">
        <div class="card-body">
          <!-- Header with filters -->
          <div class="history-header">
            <!-- Title and User Type Filter -->
            <div class="header-main py-3 rounded-3">
              <div class="d-flex flex-wrap align-items-center gap-3">
                <h6 class="mb-0 text-theme">
                  <i class="fas fa-user me-2"></i>Tipo de Usuario
                </h6>
                <div class="ms-auto d-flex gap-3 align-items-center">
                  <div class="user-filter">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-theme" :class="{ active: userType === 'clients' }"
                        @click="userType = 'clients'">
                        <i class="fas fa-users me-2 d-none d-sm-inline"></i>
                        Clientes
                      </button>
                      <button class="btn btn-outline-theme" :class="{ active: userType === 'affiliates' }"
                        @click="userType = 'affiliates'">
                        <i class="fas fa-store me-2 d-none d-sm-inline"></i>
                        Comercios
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Type Filters -->
            <div class="payment-filters py-3 rounded-3">
              <div class="d-flex flex-wrap align-items-center gap-3">
                <h6 class="mb-0 text-theme">
                  <i class="fas fa-credit-card me-2"></i>Tipo de Pago
                </h6>
                <div class="ms-auto d-flex gap-3 align-items-center">
                  <div class="user-filter">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-sm btn-outline-theme" :class="{
                        active: historyFilter === 'subscriptions',
                      }" @click="
                        setHistoryFilter('subscriptions'),
                        filterHistoryByType('subscriptions')
                        ">
                        <i class="fas fa-handshake me-2"></i>Suscripciones
                      </button>
                      <button class="btn btn-sm btn-outline-theme" :class="{ active: historyFilter === 'credit-cuota' }"
                        @click="
                          setHistoryFilter('credit-cuota'),
                          filterHistoryByType('credit-cuota')
                          ">
                        <i class="fas fa-credit-card me-2"></i>Cuotas
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Search and Filter Section -->
            <div class="card filters-section py-3 rounded-3">
              <h5 class="card-subtitle mb-3 text-theme px-2 py-2">
                <i class="fa-solid fa-filter me-2"></i>Filtrar
              </h5>
              <div class="card-body">
                <div class="row g-3">
                  <!-- Search Filter -->
                  <div class="col-12 col-md-6">
                    <h6 class="card-subtitle mb-2 text-white py-1">
                      <i class="fa-solid fa-search me-2"></i>Buscar
                    </h6>
                    <div class="input-group">
                      <input type="text" class="form-control" v-model="searchQuery"
                        placeholder="Buscar por nombre o identificación..." @input="filterDisplayedPayments()" />
                    </div>
                  </div>

                  <!-- Date Range Filter -->
                  <div class="col-12 col-md-6">
                    <h6 class="card-subtitle mb-2 text-white py-1">
                      <i class="fa-solid fa-calendar me-2"></i>Filtrar por fecha
                    </h6>
                    <div class="d-flex gap-2">
                      <div class="input-group">
                        <span class="input-group-text">Desde</span>
                        <input type="date" class="form-control" v-model="dateRange.from"
                          @change="filterPaymentsByDate" />
                      </div>
                      <div class="input-group">
                        <span class="input-group-text">Hasta</span>
                        <input type="date" class="form-control" v-model="dateRange.to" @change="filterPaymentsByDate" />
                      </div>
                      <button class="btn btn-outline-theme clear-date-filter w-auto" @click="clearDateFilter"
                        :disabled="!hasActiveFilters">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Display filtered payments -->
          <div class="row g-3">
            <div v-if="isLoading" class="col-12">
              <div class="d-flex justify-content-center align-items-center">
                <div class="text-center">
                  <div class="mb-3 mt-5">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                  </div>
                </div>
              </div>
            </div>
            <template v-else>
              <div v-if="displayedPayments.length === 0" class="col-12 text-center">
                <p class="text-muted">No hay pagos para mostrar</p>
              </div>

              <div v-for="payment in displayedPayments" :key="payment.id" class="col-12 col-lg-4">
                <div class="card custom-card payment-card h-100">
                  <div class="card-body d-flex flex-column">
                    <!-- Header Section -->
                    <div class="card-header-custom mb-3">
                      <div class="icon-wrapper mb-2">
                        <i class="fas" :class="payment.type === 'credit-cuota'
                          ? 'fa-credit-card'
                          : 'fa-handshake'
                          "></i>
                      </div>
                      <h5 class="card-title mb-1">
                        {{
                          payment.affiliate_id
                            ? getAffiliate(payment.affiliate_id).companyName
                            : `${getClient(payment.client_id).firstName} ${getClient(payment.client_id).lastName}`
                        }}
                      </h5>
                      <small class="text-muted mb-2">
                        V-{{
                          payment.affiliate_id
                            ? getAffiliate(payment.affiliate_id).rif
                            : getClient(payment.client_id).identification
                        }}
                      </small>
                      <!-- <small>
                        {{ payment.client_id }}
                      </small> -->
                      <div class="payment-status mt-2">
                        <span class="badge bg-success">Aprobado</span>
                      </div>
                    </div>

                    <!-- Payment Details Section -->
                    <div class="payment-details">
                      <!-- Credit-cuota specific info -->
                      <div v-if="
                        payment.type === 'credit-cuota' &&
                        payment.purchaseData
                      " class="info-group">
                        <div class="info-item">
                          <span class="info-label">Comercio:</span>
                          <span class="info-value">{{
                            getAffiliate(payment.purchaseData?.affiliate_id)
                              .companyName
                          }}</span>
                        </div>
                        <div class="info-item">
                          <span class="info-label">Producto:</span>
                          <span class="info-value">{{
                            payment.purchaseData?.productName
                            }}</span>
                        </div>
                        <div class="info-item">
                          <span class="info-label">Cuota:</span>
                          <span class="info-value">{{ Number(payment.cuota_id) + 1 }} de
                            {{ payment.purchaseData?.terms }}</span>
                        </div>
                      </div>

                      <!-- Subscription specific info -->
                      <div v-if="payment.type === 'subscription'" class="info-group">
                        <div class="info-item">
                          <span class="info-label">Suscripción:</span>
                          <span class="info-value">{{
                            getSubscriptionData(
                              payment.subscription_id
                            ).name.toUpperCase()
                          }}</span>
                        </div>
                        <div class="info-item">
                          <span class="info-label">Monto en USD:</span>
                          <span class="info-value">${{
                            getSubscriptionData(payment.subscription_id).price
                          }}</span>
                        </div>
                      </div>

                      <!-- Common payment info -->
                      <div class="info-group">
                        <div class="info-item">
                          <span class="info-label">Monto Pagado:</span>
                          <span class="info-value">Bs.{{ Number(payment.amount).toFixed(2) }}</span>
                        </div>
                        <div class="info-item">
                          <span class="info-label">Fecha:</span>
                          <span class="info-value">{{
                            formatDate(payment.date)
                            }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="payment-actions mt-auto pt-3">
                      <div class="d-flex flex-column gap-2">
                        <button v-if="payment.paymentUrl" class="btn btn-outline-theme btn-sm w-auto" @click="
                          openImgModal(
                            payment,
                            payment.paymentUrl,
                            payment.type,
                            payment.purchase_id,
                            payment.cuota_id,
                            true
                          )
                          ">
                          <i class="fas fa-receipt me-2"></i>Ver Comprobante
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal for opening payment capture -->
  <div class="modal fade" id="idImgModal" tabindex="-1" aria-labelledby="idImgModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Comprobante de Pago</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body text-center">
          <img v-if="modalImageUrl" :src="modalImageUrl" alt="Comprobante" class="img-fluid" />
          <div v-else>
            <i class="fas fa-exclamation-triangle text-warning"></i>
            <p class="text-muted">
              No se pudo cargar el comprobante de pago o no existe.
            </p>
          </div>
        </div>

        <!-- Show footer only for pending payments -->
        <div class="modal-footer" v-if="!isFromHistory">
          <!-- Subscription payment buttons -->
          <div v-if="paymentType === 'subscription'" class="d-flex gap-2 justify-content-end w-100">
            <button class="btn btn-outline-success btn-sm"
              @click.prevent="validateSubscriptionPayment(paymentModalData.client_id)" :disabled="isSubmitting">
              <span v-if="isSubmitting">
                <i class="fas fa-spinner fa-spin me-2"></i>
              </span>
              <span v-else> <i class="fas fa-check me-2"></i>Aprobar </span>
            </button>
          </div>

          <!-- Credit cuota payment buttons -->
          <div v-if="paymentType === 'credit-cuota'" class="d-flex gap-2 justify-content-end w-100">
            <button class="btn btn-outline-success btn-sm" @click="validateCuotaPayment(paymentModalData)"
              :disabled="isSubmitting">
              <span v-if="isSubmitting">
                <i class="fas fa-spinner fa-spin me-2"></i>
              </span>
              <span v-else>
                <i class="fas fa-check me-2"></i>Aprobar Pago
              </span>
            </button>
            <button class="btn btn-outline-danger btn-sm" @click.prevent="disapproveCuotaPayment(paymentModalData)"
              :disabled="isSubmitting">
              <span v-if="isSubmitting">
                <i class="fas fa-spinner fa-spin me-2"></i>
              </span>
              <span v-else> <i class="fas fa-times me-2"></i>Denegar </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.payments-view {
  min-height: 100vh;
}

.text-theme {
  color: purple;
}

.bg-theme {
  background-color: purple;
  color: white;
}

/* Button Styles */
.btn-outline-theme,
.btn-theme {
  border-radius: 20px;
  font-size: 0.85rem;
  padding: 0.375rem 0.75rem;
  transition: all 0.2s ease;
}

.btn-outline-danger,
.btn-outline-success {
  border-radius: 20px;
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

.card.custom-card {
  border: none;
  background-color: #29122f;
  border-radius: 15px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  color: white;
}

.custom-card:hover {
  transform: translateY(-5px);
}

.card-body {
  padding: 0rem;
}

.card.custom-card .card-body {
  color: white;
}

.card.custom-card .text-muted {
  color: #b8b8b8 !important;
}

.payment-section>.card {
  background-color: transparent;
  border: none;
  border-radius: 15px;
}

.payment-filters {
  background: transparent;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.icon-circle {
  width: 60px;
  height: 60px;
  background: rgba(111, 66, 193, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.icon-circle i {
  color: #6f42c1;
  font-size: 1.5rem;
}

.payment-card {
  background: #29122f;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  height: 100%;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  .card-header-custom {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .icon-wrapper {
      width: 40px;
      height: 40px;
      background: rgba(111, 66, 193, 0.15);
      border-radius: 50%;
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;

      i {
        color: #6f42c1;
        font-size: 1.2rem;
      }
    }

    .card-title {
      color: white;
      font-size: 1rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .payment-status {
      .badge {
        font-size: 0.75rem;
        padding: 0.35em 0.65em;
      }
    }
  }

  .payment-details,
  .date-details {
    padding: 1rem;

    .info-group {
      background: rgba(111, 66, 193, 0.05);
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 1rem;

      &:last-child {
        margin-bottom: 0;
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;

        &:last-child {
          margin-bottom: 0;
        }

        .info-label {
          color: #b8b8b8;
          font-weight: 500;
        }

        .info-value {
          color: white;
          font-weight: 600;
        }
      }
    }
  }

  .payment-actions {
    padding: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    .btn-outline-theme {
      color: #6f42c1;
      border-color: #6f42c1;
      background: transparent;
      transition: all 0.2s ease;
      width: auto;

      &:hover {
        background: #6f42c1;
        color: white;
      }

      i {
        margin-right: 0.5rem;
      }
    }
  }
}

.form-select {
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid purple;
  padding: 8px;
  color: purple;
}

.form-select option {
  color: white;
}

// Responsive styles
@media (max-width: 768px) {
  .payment-section {

    .form-select,
    .btn-group {
      margin-top: 1rem;
    }
  }

  .payment-card {
    .card-header-custom {
      padding: 0.75rem;

      .icon-wrapper {
        width: 32px;
        height: 32px;
        margin-bottom: 0.75rem;

        i {
          font-size: 1rem;
        }
      }

      .card-title {
        font-size: 0.9rem;
      }
    }

    .payment-details {
      padding: 0.75rem;

      .info-group {
        padding: 0.5rem;

        .info-item {
          font-size: 0.8rem;
        }
      }
    }

    .payment-actions {
      padding: 0.75rem;

      .btn-outline-theme {
        font-size: 0.875rem;
        padding: 0.375rem 0.75rem;
        width: auto;
      }
    }
  }
}

// Dark theme enhancements
.payment-card {
  background: linear-gradient(145deg, #2d1433 0%, #29122f 100%);

  &:hover {
    background: linear-gradient(145deg, #321637 0%, #2d1433 100%);
  }

  .info-group {
    background: rgba(255, 255, 255, 0.03);
  }

  .badge {
    background: #6f42c1;
    color: white;
  }
}

.history-header {
  .header-main {
    background: transparent;
    border: 1px solid rgba(111, 66, 193, 0.1);
  }

  .filters-section {
    background: transparent;
    border: 1px solid rgba(111, 66, 193, 0.1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .card-body {
    padding: 0rem;
  }

  h4 {
    color: #6f42c1;
    font-weight: 600;
  }

  .form-label {
    color: #b8b8b8;
    font-weight: 500;
  }

  .input-group-text {
    background-color: #29122f;
    color: #b8b8b8;
  }

  .form-control {
    background-color: #29122f;
    color: white;

    &:focus {
      background-color: #29122f;
      border-color: #6f42c1;
      box-shadow: 0 0 0 0.2rem rgba(111, 66, 193, 0.25);
      color: white;
    }
  }

  .btn-outline-theme {
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .history-header {
    .header-main {
      .user-filter {
        width: 100%;

        .btn-group {
          width: 100%;

          .btn {
            flex: 1;
          }
        }
      }
    }

    .filters-section {
      .d-flex.gap-2 {
        gap: 0.5rem !important;
      }

      .input-group {
        width: 100%;
      }

      .btn-outline-theme {
        width: 100%;
        margin-top: 0;
      }
    }

    .filters-section .clear-date-filter {
      width: auto !important;
      flex: 0 0 auto;
      margin: 0 auto;
      display: flex;
      justify-content: center;
    }
  }
}

@media (min-width: 769px) {
  .filters-section {
    .d-flex.gap-2 {
      gap: 0.5rem !important;
    }

    .input-group {
      flex: 1;
    }
  }
}

@media (max-width: 575.98px) {
  .d-flex {
    flex-wrap: wrap;

    .input-group {
      flex: 1 1 auto;
      min-width: 140px;
      /* Minimum width for date inputs */
    }

    .clear-date-filter {
      width: auto !important;
      /* Force auto width on mobile */
      flex: 0 0 auto;
      /* Prevent flex growth/shrink */
    }
  }
}

/* Add these styles */
.filter-select-container {
  position: relative;
  display: inline-block;
}

.select-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.filter-icon {
  position: absolute;
  left: 12px;
  color: purple;
  font-size: 0.875rem;
  z-index: 2;
  pointer-events: none;
}

.form-select {
  border-radius: 20px;
  padding: 6px 36px;
  font-size: 0.875rem;
  border: 1px solid purple;
  color: purple;
  background-color: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='purple'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
}

.form-select:focus {
  box-shadow: 0 0 0 2px rgba(128, 0, 128, 0.2);
  border-color: purple;
  outline: none;
}

.form-select option {
  background-color: #1a1a1a;
  color: white;
  padding: 8px;
}

/* Responsive styles */
@media (max-width: 768px) {
  .form-select {
    width: 100%;
    min-width: 160px;
  }
}
</style>
