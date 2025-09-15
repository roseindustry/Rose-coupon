<script>
import { defineComponent, computed } from "vue";
import { useUserStore } from "@/stores/user-role";
import { auth, db } from "../firebase/init";
import { ref as dbRef, update, get, set } from "firebase/database";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  RecaptchaVerifier,
} from "firebase/auth";
import { sendEmail } from "@/utils/emailService";
import { toast as showToast } from "@/utils/toast";
import "toastify-js/src/toastify.css";
import Swal from 'sweetalert2';
import 'sweetalert2/src/sweetalert2.scss';
import { Modal } from "bootstrap";
import venezuela from "venezuela";
import NotifyPaymentModal from "@/components/subscriptions/userModals/NotifyPaymentModal.vue";
import { useFileUpload } from '@/composables/useFileUpload';
import { useVerification } from '@/composables/useVerification';
import { useSubscription } from '@/composables/useSubscription';
import { useExchange } from '@/composables/useExchange';
import VerificationModal from '@/components/clients/VerificationModal.vue';

export default defineComponent({
  components: {
    NotifyPaymentModal,
    VerificationModal
  },
  setup() {
    // File Uploads
    const { isUploading, errorMessage, processFile, processVerification, processPayment } = useFileUpload();

    // Id Verification
    const {
      emailCode,
      phoneCode,
      isEmailSending,
      isPhoneSending,
      isVerifying,
      emailStatus,
      phoneStatus,
      isEmailVerified,
      isPhoneVerified,
      emailCodeSent,
      phoneCodeSent,
      verifyingField,
      verifyModal,
      sendEmailCode,
      sendPhoneCode,
      verifyEmailCode,
      verifyPhoneCode
    } = useVerification();

    const {
      subscriptionPlan,
      userSubscriptionId,
      isLoading: subscriptionLoading,
      error: subscriptionError,
      fetchSubscriptionPlan,
      isFreeSubscription
    } = useSubscription();

    const {
      exchange,
      isLoading: exchangeLoading,
      error: exchangeError,
      fetchCurrentExchange
    } = useExchange();

    const verificationCode = computed({
      get() {
        return verifyingField.value === "email"
          ? emailCode.value
          : phoneCode.value;
      },
      set(value) {
        if (verifyingField.value === "email") {
          emailCode.value = value;
        } else {
          phoneCode.value = value;
        }
      },
    });

    return {
      isUploading,
      errorMessage,
      processFile,
      processVerification,
      processPayment,
      emailCode,
      phoneCode,
      isEmailSending,
      isPhoneSending,
      isVerifying,
      emailStatus,
      phoneStatus,
      isEmailVerified,
      isPhoneVerified,
      emailCodeSent,
      phoneCodeSent,
      verifyingField,
      verifyModal,
      sendEmailCode,
      sendPhoneCode,
      verifyEmailCode,
      verifyPhoneCode,
      verificationCode,

      subscriptionPlan,
      userSubscriptionId,
      isLoading: subscriptionLoading,
      error: subscriptionError,
      fetchSubscriptionPlan,
      isFreeSubscription,

      exchange,
      exchangeLoading,
      exchangeError,
      fetchCurrentExchange
    };
  },
  data() {
    return {
      userId: "",
      role: "",
      userName: "",
      userEmail: "",
      requestSent: "",
      userSubscriptionId: "",
      subscriptionPlan: null,

      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      userVerified: null,

      newValue: "",

      // Common fields
      phoneNumber: "",
      email: "",
      state: "",
      municipio: "",
      parroquia: "",

      // Address info
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
      showMunicipios: false,
      showParroquias: false,

      // Cliente-specific fields
      firstName: "",
      lastName: "",
      identification: "",

      // Afiliado-specific fields
      companyName: "",
      rif: "",
      address: "",
      twitter: "",
      instagram: "",
      facebook: "",
      tiktok: "",
      paymentDetails: {
        bank: "",
        phoneNumber: "",
        identification: "",
        bankAccount: "",
      },

      // Edit states
      editStates: {
        phoneNumber: false,
        email: false,
        password: false,
        state: false,
        municipio: false,
        parroquia: false,
        firstName: false,
        lastName: false,
        identification: false,
        companyName: false,
        rif: false,
        address: false,
        twitter: false,
        instagram: false,
        facebook: false,
        tiktok: false,
        paymentDetails: false,
      },

      //Verification data
      idFrontFile: null,
      idBackFile: null,
      selfieFile: null,
      paymentFile: null,
      idFrontPreview: null,
      idBackPreview: null,
      selfiePreview: null,
      paymentPreview: null,

      paymentDate: null,
      isSubmitting: false,
      verificationModal: null,
      paymentModal: null,
      modalImageUrl: null,
      paymentUrl: null,
      amountPaid: 0,

      emailVerified: false,
      phoneVerified: false,
      verifyingField: null,
      updatingField: null,
      phoneVerificationLoading: false,
      verifyModal: null,
      recaptchaVerifier: null,
      originalData: {
        email: '',
        phoneNumber: '',
      },
      editingEmail: false,
      editingPhone: false,
      isRequestPending: false,
      hasapplicablePurchase: false,
      hasCurrentMonthPayment: false
    };
  },
  async mounted() {
    const userStore = useUserStore();

    // Load user details
    this.userId = userStore.userId;
    this.role = userStore.role;
    this.userName = userStore.userName;
    this.userEmail = userStore.userEmail;
    this.userIdentification = userStore.userIdentification;
    this.userVerified = userStore.isVerified;
    this.emailVerified = userStore.isEmailVerified || false;
    this.phoneVerified = userStore.isPhoneVerified || false;

    if (!this.userId || !this.role) {
      console.error("User ID or role is missing.");
      return;
    }

    console.log('User ID: ', this.userId);

    try {
      this.initializeUserData();
      this.initUI();
      this.loadLocationData();
      this.cacheOriginalData();
      await this.checkDeletionRequest();
    } catch (err) {
      console.error("Error during mounted lifecycle:", err);
    }
  },
  beforeUnmount() {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
    }
  },
  methods: {
    initializeUserData() {
      this.fetchUserData(this.userId);

      if (this.role === 'cliente') {
        this.fetchSubscriptionPlan(this.userId);
      } else if (this.role === 'afiliado') {
        this.fetchAffiliatePlan();
      }

      this.checkPaymentReset();
    },
    initUI() {
      this.$nextTick(() => {
        if (this.role !== 'cliente') return;

        const verifyModalEl = document.getElementById("verifyModal");
        const paymentModalEl = document.getElementById("notifyPaymentModal");

        if (verifyModalEl) {
          this.verifyModal = new Modal(verifyModalEl);
        }

        if (paymentModalEl) {
          this.paymentModal = new Modal(paymentModalEl);
        }

        setTimeout(() => {
          this.initRecaptcha();
        }, 1000);
      });
    },
    loadLocationData() {
      if (this.state) {
        this.displayMunicipios(this.state);
        if (this.municipio) {
          this.displayParroquias(this.municipio);
        }
      }
    },
    cacheOriginalData() {
      this.originalData = {
        email: this.email,
        phoneNumber: this.phoneNumber,
      };
    },
    async checkDeletionRequest() {
      if (!this.userId) {
        console.log('No user ID provided, skipping deletion request check');
        return;
      }

      try {
        const delRequestRef = dbRef(db, `deletionRequests/${this.userId}`);
        const snapshot = await get(delRequestRef);

        if (snapshot.exists()) {
          const deletionRequestData = snapshot.val();
          // console.log('Deletion request found:', deletionRequestData);

          if (deletionRequestData.status === 'pending') {
            // console.log('Deletion request is in pending status');
            this.isRequestPending = true;
          }
        }
      } catch (error) {
        console.error('Error checking deletion request:', error);
      }
    },
    async checkPaymentReset() {
      const userRef = dbRef(db, `Users/${this.userId}/subscription`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const subscriptionData = snapshot.val();
        const payDay = new Date(subscriptionData.payDay);
        const currentDate = new Date();

        // Check both subscription payment and credit purchase payments
        try {
          // Check subscription payment
          const isSubscriptionPaid = subscriptionData.isPaid || subscriptionData.paymentVerified;

          // Check credit purchase payments for the current month
          const purchasesRef = dbRef(db, `Users/${this.userId}/credit/main/purchases`);
          const purchasesSnapshot = await get(purchasesRef);

          if (purchasesSnapshot.exists()) {
            const purchases = purchasesSnapshot.val();

            // Reset flags before checking
            this.hasapplicablePurchase = false;
            this.hasCurrentMonthPayment = false;

            // Iterate through purchases to find ongoing purchases
            Object.values(purchases).forEach(purchase => {
              // Check if purchase is ongoing (not all cuotas are paid)
              const isPurchaseOngoing = purchase.cuotas && Object.values(purchase.cuotas).some(cuota => !cuota.paid);

              // Check for purchases with subscription maintenance add-on
              if (purchase.includeCuotaAddOn && isPurchaseOngoing) {
                this.hasapplicablePurchase = true;

                // Check for current month payment in ongoing purchases
                if (purchase.cuotas) {
                  Object.values(purchase.cuotas).forEach(cuota => {
                    if (cuota.paid) {
                      const cuotaDate = new Date(cuota.paymentDate);
                      if (cuotaDate.getMonth() === currentDate.getMonth() &&
                        cuotaDate.getFullYear() === currentDate.getFullYear()) {
                        this.hasCurrentMonthPayment = true;
                      }
                    }
                  });
                }
              }
            });
          }

          // Reset if no payment was made this month (either subscription or credit purchase)
          if (currentDate >= payDay &&
            (!isSubscriptionPaid ||
              (this.hasapplicablePurchase && !this.hasCurrentMonthPayment))) {
            await update(userRef, {
              isPaid: false, // Reset to mark unpaid month
              status: false,
              paymentUploaded: false,
              paymentVerified: false,
              paymentUrl: null,
            });

            Swal.fire({
              title: 'Debes ponerte al día con el pago de tu suscripción.',
              text: 'Recuerda estar solvente con el pago de tu suscripción para poder optar por compras a crédito.',
              icon: 'info',
              confirmButtonText: 'OK'
            });
          }

          // console.log(this.hasapplicablePurchase, this.hasCurrentMonthPayment);

          // if (this.applicablePurchase) {
          //   console.log('Este usuario tiene una compra a credito activa');
          // } else if (this.applicablePurchase && this.hasCurrentMonthPayment) {
          //   console.log('Este usuario tiene una compra a credito activa Y pagó este mes');
          // } else {
          //   console.log('Usuario sin compra aplicable.');
          // }

        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }
    },

    // Fetch data
    fetchUserData(userId) {
      const userRef = dbRef(db, `Users/${userId}`);

      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            this.requestSent = userData.requestedVerification;

            // Assign user data to field values
            for (let key in userData) {
              if (this[key] !== undefined) {
                this[key] = userData[key]; // Update the reactive data fields directly
              }
            }

            // Update originalData after the data is fetched
            this.originalData = {
              email: this.email,
              phoneNumber: this.phoneNumber,
            };
          } else {
            console.log("No data available");
          }
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
        });
    },
    async fetchAffiliatePlan() {
      const userId = this.userId;

      if (userId) {
        const userRef = dbRef(db, `Users/${userId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const user = snapshot.val();

          // Check if the user has a subscription plan and it's an object
          if (user.subscription) {
            const userSubscriptionRef = dbRef(
              db,
              `Users/${this.userId}/subscription`
            );
            const subscriptionSnapshot = await get(userSubscriptionRef);

            if (subscriptionSnapshot.exists()) {
              const subscriptionData = subscriptionSnapshot.val();
              this.userSubscriptionId = subscriptionData.subscription_id;

              // Query the Suscriptions collection
              const subscriptionDataRef = dbRef(
                db,
                `Affiliate_suscriptions/${this.userSubscriptionId}`
              );
              const userSuscriptionSnapshot = await get(subscriptionDataRef);

              if (userSuscriptionSnapshot.exists()) {
                const userSuscription = userSuscriptionSnapshot.val();

                this.subscriptionPlan = {
                  name: userSuscription.name || "Sin suscripcion",
                  status: subscriptionData.status || "No Status",
                  price: userSuscription.price || "Consultar precio",
                  payDay: subscriptionData.payDay || "No PayDay",
                  lastPaymentDate: subscriptionData.lastPaymentDate || null,
                  isPaid: subscriptionData.isPaid || false,
                  paymentUploaded: subscriptionData.paymentUploaded || null,
                  paymentVerified: subscriptionData.paymentVerified || null,
                };
                // console.log('Plan details: ', this.subscriptionPlan)
              } else {
                // Handle case where there is no subscription plan
                this.subscriptionPlan = {
                  status: "Sin suscripcion",
                  price: 0,
                };
              }
            }
          }
        }
      }
    },

    //Address info methods
    displayMunicipios(state) {
      if (!state) return;

      const z = venezuela.estado(state, { municipios: true });
      const munis = z.municipios;
      if (munis) {
        this.municipios = munis;
        this.showMunicipios = true;
      }
    },
    displayParroquias(municipio) {
      if (!municipio) return;

      const y = venezuela.municipio(municipio, { parroquias: true });
      if (y?.parroquias) {
        this.parroquias = y.parroquias;
        this.showParroquias = true;
      }
    },
    isAddressField(fieldName) {
      return ["state", "municipio", "parroquia"].includes(fieldName);
    },

    // Edit fields (admins)
    isFieldChanged(fieldName) {
      return this[fieldName] !== this.originalData[fieldName];
    },
    async saveField(fieldName) {
      try {
        // Validate field value
        if (fieldName === 'email' && !this.validateEmail(this.email)) {
          showToast.error('Por favor ingresa un correo electrónico válido');
          return;
        }

        if (fieldName === 'phoneNumber' && !this.phoneNumber) {
          showToast.error('Por favor ingresa un número de teléfono válido');
          return;
        }

        // Update database
        const userRef = dbRef(db, `Users/${this.userId}`);
        const updateData = {};
        updateData[fieldName] = this[fieldName];

        await update(userRef, updateData);

        // If updating email, also update in Auth
        if (fieldName === 'email' && this.email !== this.originalData.email) {
          try {
            // Call the cloud function to update email in Auth
            const authUpdateResponse = await fetch('https://us-central1-rose-app-e062e.cloudfunctions.net/updateUserEmail', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                uid: this.userId,
                newEmail: this.email
              })
            });

            const authUpdateResult = await authUpdateResponse.json();

            if (authUpdateResult.message) {
              console.log("Auth email update:", authUpdateResult.message);
            }
          } catch (authError) {
            console.error("Error updating auth email:", authError);
            // Continue with the flow even if auth update fails
          }
        }

        // Update original data
        this.originalData[fieldName] = this[fieldName];

        showToast.success('Información actualizada correctamente');
      } catch (error) {
        console.error(`Error updating ${fieldName}:`, error);
        showToast.error('Error al guardar los cambios. Por favor intenta de nuevo.');
      }
    },
    startEditing(field) {
      if (field === 'email') {
        this.editingEmail = true;
        // Store the current value before editing
        this.originalData.email = this.email;
      } else if (field === 'phone') {
        this.editingPhone = true;
        // Store the current value before editing
        this.originalData.phoneNumber = this.phoneNumber;
      }
    },
    cancelEditing(field) {
      if (field === 'email') {
        this.email = this.originalData.email;
        this.editingEmail = false;
      } else if (field === 'phone') {
        this.phoneNumber = this.originalData.phoneNumber;
        this.editingPhone = false;
      }
    },
    // Edit fields (clients and affiliates)
    toggleEdit(fieldName) {
      // Only allow toggling edit state for address fields
      if (this.isAddressField(fieldName)) {
        this.editStates[fieldName] = !this.editStates[fieldName];
      }
    },
    handleEditClick(fieldName) {
      // If editing 'municipio' or 'parroquia', trigger the respective function
      if (fieldName === "municipio") {
        this.displayMunicipios(this.state); // Pass the current state
      } else if (fieldName === "parroquia") {
        this.displayParroquias(this.municipio); // Pass the current municipio
      }
    },
    async updateField(field) {
      // if (this.role !== 'admin') return;

      try {
        const updates = {};
        updates[field.name] = field.value;

        await update(dbRef(db, `Users/${this.userId}`), updates);
        this.toggleEdit(field.name);
        showToast.success('Campo actualizado exitosamente');
      } catch (error) {
        console.error('Error updating field:', error);
        showToast.error('Error al actualizar el campo');
      }
    },
    async changePassword() {
      if (this.newPassword !== this.confirmPassword) {
        alert(
          "La nueva contraseña y la confirmación de contraseña no coinciden."
        );
        return;
      }

      if ((this.newPassword && this.confirmPassword) === this.currentPassword) {
        alert("La nueva contraseña no puede ser igual a la contraseña actual.");
        return;
      }

      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        this.currentPassword
      );

      try {
        this.isSubmitting = true;
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, this.newPassword);
        showToast.success("Contraseña actualizada con éxito.");
        this.currentPassword = "";
        this.newPassword = "";
        this.confirmPassword = "";
      } catch (error) {
        console.error("Error updating password:", error);
        showToast.error("Error al actualizar la contraseña. Inténtalo de nuevo.");
      } finally {
        this.isSubmitting = false;
      }
    },
    async updatePaymentDetails() {
      try {
        if (!this.userId) return;

        const userRef = dbRef(db, `Users/${this.userId}/paymentDetails`);
        await update(userRef, this.paymentDetails);

        showToast.success('Datos de pago actualizados correctamente');
      } catch (error) {
        console.error('Error updating payment details:', error);
        showToast.error('Error al actualizar los datos de pago');
      }
    },
    async updateSocialMedia() {
      try {
        if (!this.userId) return;

        // Create an object with all social media fields
        const socialMediaUpdates = {
          twitter: this.twitter,
          instagram: this.instagram,
          facebook: this.facebook,
          tiktok: this.tiktok
        };

        // Update all social media fields at once
        const userRef = dbRef(db, `Users/${this.userId}`);
        await update(userRef, socialMediaUpdates);

        showToast.success('Redes sociales actualizadas correctamente');
      } catch (error) {
        console.error('Error updating social media:', error);
        showToast.error('Error al actualizar redes sociales');
      }
    },

    //File uploads
    async handleFileUpload(event, type) {
      const file = event.target.files[0];
      if (!file) return;

      const result = await this.processFile(file, type);
      if (result) {
        switch (type) {
          case 'front':
            this.idFrontFile = file;
            this.idFrontPreview = result;
            break;
          case 'back':
            this.idBackFile = file;
            this.idBackPreview = result;
            break;
          case 'selfie':
            this.selfieFile = file;
            this.selfiePreview = result;
            break;
          case 'payment':
            this.paymentFile = file;
            this.paymentPreview = result;
            break;
        }
      }
    },

    // User verification submit
    async submitVerification() {
      if (!this.idFrontFile || !this.idBackFile || !this.selfieFile) {
        this.errorMessage = "Todos los archivos de identificación son requeridos.";
        return;
      }

      try {
        this.isSubmitting = true;
        this.errorMessage = "";

        const result = await this.processVerification(
          {
            front: this.idFrontPreview,
            back: this.idBackPreview,
            selfie: this.selfiePreview
          },
          this.userId
        );

        if (result.success) {
          // Send an email notification to the admin through Firebase Cloud Functions				
          const appUrl = "https://app.rosecoupon.com";
          const emailPayload = {
            to: "roseindustry11@gmail.com",
            message: {
              subject: "Usuario solicitó verificación",
              text: `Hola administrador, el usuario ${this.userName} ha solicitado verificación de identidad en Rose Coupon.
                      Para verificar el usuario, abre la app en el siguiente enlace: ${appUrl}`,
              html: `<p>Hola administrador,</p>
              <p>El usuario <strong>${this.userName}</strong> ha solicitado verificación de identidad en Rose Coupon.</p>
              <p>Para verificar el usuario, por favor <a href="${appUrl}" target="_blank">abre la app</a>.</p>`,
            },
          };

          // Send email via the utility function
          const emailResult = await sendEmail(emailPayload);

          if (emailResult.success) {
            console.log("Verification email sent successfully:", emailResult.message);
          } else {
            console.error("Failed to send verification email:", emailResult.error);
          }

          //reset the image previews
          this.idFrontPreview = null;
          this.idBackPreview = null;
          this.selfiePreview = null;
          this.verificationStatus = "pending";
          this.requestSent = true;

          // Hide the modal after submission
          this.verificationModal.hide();
        }
      } catch (error) {
        console.error("Error during verification:", error);
        this.errorMessage = "Error al subir los archivos, por favor intente nuevamente.";
      } finally {
        this.isSubmitting = false;
      }
    },

    // // Subscription Payment submit
    // async submitPayment(paymentData) {
    //   if (confirm("¿Seguro que desea subir su comprobante de pago?")) {
    //     try {
    //       this.isUploading = true;

    //       // Upload payment file
    //       const result = await this.processPayment(
    //         this.userId,
    //         paymentData,
    //         this.role,
    //         this.userName
    //       );

    //       if (result.success) {
    //         console.log("Payment file uploaded successfully");
    //         // Close modal and show success message
    //         this.$refs.paymentModal.closeModal();
    //         // Refresh subscription data
    //         await this.fetchClientPlan();
    //       }
    //     } catch (error) {
    //       console.error("Error notifying payment:", error);
    //       Swal.fire({
    //         title: 'Error al subir el comprobante 😕',
    //         text: error,
    //         icon: 'error',
    //         confirmButtonText: 'OK'
    //       })
    //     } finally {
    //       this.isUploading = false;
    //     }
    //   }
    // },

    // Modal logic
    openPaymentModal() {
      this.fetchCurrentExchange();
      if (this.$refs.paymentModal) {
        this.$refs.paymentModal.openModal();
      }
    },
    openImgModal() {
      if (this.subscriptionPlan?.paymentUrl) {
        this.modalImageUrl = this.subscriptionPlan.paymentUrl;
        const imgModalEl = document.getElementById("imgModal");
        if (imgModalEl) {
          new Modal(imgModalEl).show();
        }
      }
    },
    updateFieldModal(field) {
      this.updatingField = field;

      const modal = new Modal(document.getElementById("updateFieldModal"));
      modal.show();
    },

    // Requests
    async requestFieldUpdate(field) {
      try {
        this.isSubmitting = true;

        const requestData = {
          userId: this.userId,
          userName: this.userName,
          userIdentification: this.userIdentification,
          userEmail: this.email,
          userPhone: this.phoneNumber,
          fieldName: field.name,
          fieldLabel: field.label,
          currentValue: this[field.name],
          newValue: this.newValue
        };

        const response = await fetch(
          "https://us-central1-rose-app-e062e.cloudfunctions.net/requestFieldUpdate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
          }
        );

        const result = await response.json();

        if (result.success) {
          showToast.success(
            "Solicitud enviada correctamente.",
          );

          // Reset state
          this.newValue = "";
          const modal = Modal.getOrCreateInstance(document.getElementById("updateFieldModal"));
          modal.hide();
        } else {
          throw new Error(result.message || "Error al enviar la solicitud");
        }
      } catch (error) {
        console.error("Error requesting field update:", error);
        showToast.error(
          "Error al enviar la solicitud. Por favor intenta de nuevo.",
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    async requestDeleteAccount() {
      if (!confirm("¿Seguro que desea eliminar su cuenta?")) {
        return;
      }

      this.isRequestPending = true;

      try {
        const requestRef = dbRef(db, `deletionRequests/${this.userId}`);
        await set(requestRef, {
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        // Send an email notification to the admin through Firebase Cloud Functions
        const appUrl = "https://app.rosecoupon.com/clientes";
        const emailPayload = {
          to: "joselinq38@gmail.com", // Admin email
          message: {
            subject: "Usuario solicitó eliminación de cuenta",
            text: `Hola administrador, el usuario ${this.userName} ha solicitado la eliminación de su cuenta en Rose Coupon.
                        Para verificar el usuario, abre la app en el siguiente enlace: ${appUrl}`,
            html: `<html>
                    <head>
                      <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .container { background-color: #f4f4f4; border-radius: 10px; padding: 20px; }
                        .header { background-color: #29122f; color: white; text-align: center; padding: 15px; border-radius: 5px 5px 0 0; }
                        .content { background-color: white; padding: 20px; border-radius: 0 0 5px 5px; }
                        .footer { text-align: center; color: #666; margin-top: 20px; font-size: 0.8em; }
                        a { color: #6f42c1; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h1>Solicitud de Eliminación de Cuenta</h1>
                        </div>
                        <div class="content">
                          <p>Hola administrador,</p>
                          <p>El usuario <strong>${this.userName}</strong> ha solicitado la eliminación de su cuenta en Rose Coupon.</p>
                          
                          <h3>Detalles de la Solicitud:</h3>
                          <ul>
                            <li><strong>Nombre de Usuario:</strong> ${this.userName}</li>
                            <li><strong>Cédula:</strong> ${this.userIdentification}</li>
                            <li><strong>Fecha de Solicitud:</strong> ${new Date().toLocaleDateString()}</li>
                          </ul>
                          
                          <p>Para procesar la solicitud, por favor <a href="${appUrl}" target="_blank">acceda al panel de administración</a>.</p>
                          
                          <p><em>Nota: Esta solicitud requiere revisión y confirmación manual.</em></p>
                        </div>
                        <div class="footer">
                          <p>© ${new Date().getFullYear()} Rose Coupon. Todos los derechos reservados.</p>
                        </div>
                      </div>
                    </body>
                  </html>`,
          },
        };
        // Send email via the utility function
        const result = await sendEmail(emailPayload);
        if (result.success) {
          console.log("Verification email sent successfully:", result.message);
        } else {
          console.error("Failed to send verification email:", result.error);
        }

        // Success toast
        showToast.success("Solicitud enviada para revisión.");
      } catch (error) {
        console.error("Error submitting request:", error);
        showToast.error("Error al enviar la solicitud. Por favor intenta de nuevo.");
      } finally {
        this.isRequestPending = false;
      }
    },

    // Email input validation
    validateEmail(email) {
      // Validate email in format example@example.com
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },

    // Handle email and phone verification requests
    handleVerification(fieldName) {
      if (fieldName === "email") {
        // If email has changed, update the original data after verification
        if (this.editingEmail) {
          this.originalData.email = this.email;
          this.emailVerified = false; // Reset verification status
        }
        this.sendEmailCode({
          id: this.userId,
          email: this.email,
          firstName: this.firstName,
          lastName: this.lastName
        });
      } else if (fieldName === "phone") {
        // If phone has changed, update the original data after verification
        if (this.editingPhone) {
          this.originalData.phoneNumber = this.phoneNumber;
          this.phoneVerified = false; // Reset verification status
        }
        this.handleSendPhoneCode();
      }
    },
    // Phone verification using Firebase
    async handleSendPhoneCode() {
      try {
        this.phoneVerificationLoading = true;

        // Check if recaptcha has been verified
        if (!this.recaptchaVerifier) {
          showToast.error('Por favor complete el captcha antes de solicitar el código de verificación');
          this.phoneVerificationLoading = false;
          return;
        }

        await this.sendPhoneCode({
          id: this.userId,
          email: this.email,
          firstName: this.firstName,
          lastName: this.lastName,
          phoneNumber: this.phoneNumber
        }, this.recaptchaVerifier);
      } catch (error) {
        console.error('Error sending phone verification code:', error);
        showToast.error(error.message || 'Error al enviar el código de verificación. Intente nuevamente.');
      } finally {
        this.phoneVerificationLoading = false;
      }
    },
    // Verify code (handles both email and phone)
    async verifyCode(code) {
      try {
        if (this.verifyingField === 'phone') {
          await this.verifyPhoneCode({
            id: this.userId,
            phoneNumber: this.phoneNumber
          });

          // Update iu state
          this.phoneVerified = this.isPhoneVerified;

          if (this.editingPhone && this.phoneNumber !== this.originalData.phoneNumber) {
            // Update the database
            const userRef = dbRef(db, `Users/${this.userId}`);
            await update(userRef, {
              phoneNumber: this.phoneNumber
            });
          }

          // Reset editing state
          this.editingPhone = false;
        } else {
          await this.verifyEmailCode({
            id: this.userId,
            email: this.email
          });

          // Update iu state
          this.emailVerified = this.isEmailVerified;

          // If email was edited
          if (this.editingEmail && this.email !== this.originalData.email) {
            try {
              // Update the database
              const userRef = dbRef(db, `Users/${this.userId}`);
              await update(userRef, {
                email: this.email
              });

              // Call the cloud function to update email in Auth
              const authUpdateResponse = await fetch('https://us-central1-rose-app-e062e.cloudfunctions.net/updateUserEmail', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  uid: this.userId,
                  newEmail: this.email
                })
              });

              const authUpdateResult = await authUpdateResponse.json();

              if (authUpdateResult.message) {
                console.log("Auth email update:", authUpdateResult.message);
              }
            } catch (authError) {
              console.error("Error updating auth email:", authError);
            }

            // Reset editing state
            this.editingEmail = false;
          }
        }
      } catch (error) {
        console.error('Error verifying code:', error);
        showToast.error(error.message || 'Error al verificar el código');
      }
    },

    // helpers
    scrollToSection(sectionId) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.classList.add('highlight-section');
        setTimeout(() => {
          element.classList.remove('highlight-section');
        }, 2000);
      }
    },
    formatDate(date) {
      const dateString = date.split("T")[0];
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    },
    initRecaptcha() {
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }

      try {
        const container = document.getElementById('recaptcha-container');

        if (!container) {
          console.error('reCAPTCHA container not found');
          return;
        }

        this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            console.log('reCAPTCHA verified');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
            this.recaptchaVerifier = null;
            showToast.error('El captcha ha expirado. Por favor, inténtelo de nuevo.');
          }
        });
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
        showToast.error('Error al inicializar reCAPTCHA. Por favor, recargue la página.');
      }
    },
  },
  computed: {
    currentPageName() {
      return this.$route.name;
    },
    // Dynamically determine which fields to display based on user role
    displayedFields() {
      if (this.role === "afiliado") {
        return [
          {
            name: "companyName",
            label: "Nombre del Comercio",
            value: this.companyName,
          },
          { name: "rif", label: "RIF", value: this.rif },
          { name: "phoneNumber", label: "Telefono", value: this.phoneNumber },
          { name: "email", label: "Correo electronico", value: this.email },
          { name: "state", label: "Estado", value: this.state },
          { name: "municipio", label: "Municipio", value: this.municipio },
          { name: "parroquia", label: "Parroquia", value: this.parroquia },
          {
            name: "address",
            label: "Dirección",
            value: this.address,
            special: true,
          },
        ];
      } else {
        return [
          { name: "firstName", label: "Nombre", value: this.firstName },
          { name: "lastName", label: "Apellido", value: this.lastName },
          {
            name: "identification",
            label: "Cedula",
            value: this.identification,
          },
          { name: "phoneNumber", label: "Telefono", value: this.phoneNumber },
          { name: "email", label: "Correo electronico", value: this.email },
          { name: "state", label: "Estado", value: this.state },
          { name: "municipio", label: "Municipio", value: this.municipio },
          { name: "parroquia", label: "Parroquia", value: this.parroquia },
        ];
      }
    },
    isProfileComplete() {
      if (this.role === 'afiliado') {
        // Check basic profile info
        const hasBasicInfo = this.state && this.municipio && this.parroquia && this.address;

        // Check if at least one social media is filled
        const hasSocialMedia = this.twitter || this.instagram || this.facebook || this.tiktok;

        // Check if payment details are filled
        const hasPaymentDetails = this.paymentDetails.bank &&
          this.paymentDetails.phoneNumber &&
          this.paymentDetails.bankAccount;

        return hasBasicInfo && hasSocialMedia && hasPaymentDetails;
      } else {
        // For regular clients, just check basic info
        return this.state && this.municipio && this.parroquia;
      }
    },
  },
  watch: {
    state(newState) {
      if (newState) {
        this.displayMunicipios(newState);
      } else {
        this.municipios = [];
        this.parroquias = [];
        this.municipio = '';
        this.parroquia = '';
      }
    },
    municipio(newMunicipio) {
      if (newMunicipio) {
        this.displayParroquias(newMunicipio);
      } else {
        this.parroquias = [];
        this.parroquia = '';
      }
    }
  }
});
</script>
<template>
  <div class="profile-container">
    <h4 class="mb-3 text-theme">
      <i class="fas fa-wrench me-2"></i>
      Perfil
    </h4> 
    <div class="row">
      <div class="col-12">
        <!-- Profile Completion Warning for Affiliates -->
        <div v-if="role === 'afiliado' && !isProfileComplete" class="alert alert-warning mb-4" role="alert">
          <div class="d-flex align-items-center">
            <i class="fas fa-exclamation-triangle me-3 fs-4"></i>
            <div>
              <h5 class="alert-heading mb-1">¡Completa tu perfil!</h5>
              <p class="mb-0">
                Para brindar una mejor experiencia a tus clientes, por favor completa tus datos de redes sociales y
                detalles de pago.
                Esto ayudará a generar más confianza y facilitar las transacciones.
              </p>
            </div>
          </div>
          <div v-if="!isProfileComplete" class="mt-3">
            <button class="btn btn-sm btn-warning" @click="scrollToSection('social-media')">
              <i class="fas fa-share-alt me-1"></i> Completar Redes Sociales
            </button>
            <button class="btn btn-sm btn-warning ms-2" @click="scrollToSection('payment-details')">
              <i class="fas fa-money-check-alt me-1"></i> Completar Datos de Pago
            </button>
          </div>
        </div>

        <!-- Verification Warning for Clients -->
        <div v-if="role === 'cliente' && (!emailVerified || !phoneVerified)" class="alert alert-warning mb-4"
          role="alert">
          <div class="d-flex align-items-center">
            <i class="fas fa-exclamation-circle me-3 fs-4"></i>
            <div>
              <h5 class="alert-heading mb-1">¡Verifica tu cuenta!</h5>
              <p class="mb-0">
                Para poder realizar compras y acceder a todas las funcionalidades, necesitas verificar:
              </p>
              <ul class="list-unstyled mt-2 mb-0">
                <li v-if="!emailVerified" class="d-flex align-items-center mb-1">
                  <i class="fas fa-times-circle text-danger me-2"></i>
                  <span>Tu correo electrónico</span>
                </li>
                <li v-if="!phoneVerified" class="d-flex align-items-center">
                  <i class="fas fa-times-circle text-danger me-2"></i>
                  <span>Tu número de teléfono</span>
                </li>
              </ul>
            </div>
          </div>
          <div class="mt-3">
            <button v-if="!emailVerified" class="btn btn-sm btn-warning" @click="scrollToSection('contact-info')">
              <i class="fas fa-envelope me-1"></i> Verificar Correo
            </button>
            <button v-if="!phoneVerified" class="btn btn-sm btn-warning ms-2" @click="scrollToSection('contact-info')">
              <i class="fas fa-phone me-1"></i> Verificar Teléfono
            </button>
          </div>
        </div>

        <!-- Personal Information Section -->
        <div class="card section-card mb-4">
          <div class="card-body">
            <h4 class="mb-3 card-title">
              <i class="fas fa-user me-2"></i>
              Información Personal
            </h4>
            <div class="row">
              <div v-for="field in displayedFields.filter(
                (f) =>
                  ![
                    'state',
                    'municipio',
                    'parroquia',
                    'email',
                    'phoneNumber',
                  ].includes(f.name)
              )" :key="field.name" class="col-md-6 mb-3">
                <label :for="field.name" class="form-label">{{
                  field.label
                }}</label>
                <div class="d-flex align-items-center gap-2">
                  <input :type="field.name.includes('password') ? 'password' : 'text'" :id="field.name"
                    v-model="field.value" class="form-control" :disabled="role === 'cliente'" />
                  <button v-if="role === 'cliente' && !isAddressField(field.name)" class="btn btn-transparent btn-sm"
                    @click.prevent="updateFieldModal(field)"
                    :title="'Solicitar actualización de ' + field.label.toLowerCase()">
                    <i class="fa-solid fa-envelope text-theme"></i>
                  </button>
                  <!-- Admin direct edit button -->
                  <button v-if="role === 'admin' || role === 'afiliado'" class="btn btn-transparent btn-sm"
                    @click.prevent="updateField(field)" :title="'Actualizar ' + field.label.toLowerCase()">
                    <i class="fas fa-save text-theme"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Information Section -->
        <div class="card section-card contact-info mb-4" id="contact-info">
          <div class="card-body">
            <h4 class="mb-3 card-title">
              <i class="fas fa-address-card me-2"></i>
              Información de Contacto
            </h4>
            <div class="row">
              <!-- Email Field -->
              <div class="col-md-6 mb-3">
                <label for="email" class="form-label">Correo Electrónico</label>
                <div class="input-group">
                  <input type="email" id="email" v-model="email"
                    class="form-control bg-dark text-light border-secondary" placeholder="correo@ejemplo.com"
                    :disabled="role === 'cliente' && emailVerified && !editingEmail" />
                  <!-- Verification for clients -->
                  <template v-if="role === 'cliente'">
                    <button v-if="!emailVerified" class="btn btn-outline-warning" @click="handleVerification('email')"
                      title="Verificar correo">

                      <span v-if="isEmailSending">
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      </span>

                      <span v-else>
                        <i class="fas fa-envelope me-1"></i>
                        Verificar
                      </span>

                    </button>

                    <template v-else>
                      <span v-if="!editingEmail && emailVerified"
                        class="input-group-text bg-success border-secondary text-light">
                        <i class="fas fa-check-circle"></i>
                      </span>

                      <button v-if="!editingEmail" class="btn btn-outline-secondary" @click="startEditing('email')"
                        title="Editar correo">
                        <i class="fas fa-edit"></i>
                      </button>

                      <template v-else>
                        <button v-if="email !== originalData.email" class="btn btn-outline-warning"
                          @click="handleVerification('email')" title="Verificar nuevo correo">
                          <span v-if="isEmailSending">
                            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          </span>

                          <span v-else>
                            <i class="fas fa-envelope me-1"></i>
                            Verificar
                          </span>
                        </button>

                        <!-- Always show cancel while editing -->
                        <button class="btn btn-outline-danger" @click="cancelEditing('email')" title="Cancelar edición">
                          <i class="fas fa-times"></i>
                        </button>
                      </template>
                    </template>
                  </template>
                  <!-- Save button for affiliates and admins -->
                  <template v-else>
                    <button class="btn btn-outline-primary" @click="saveField('email')"
                      :disabled="!isFieldChanged('email')" title="Guardar cambios">
                      <i class="fas fa-save me-1"></i>
                    </button>
                  </template>
                </div>
              </div>

              <!-- Phone Field -->
              <div class="col-md-6 mb-3">
                <label for="phoneNumber" class="form-label">Teléfono</label>
                <div class="input-group">
                  <input type="tel" id="phoneNumber" v-model="phoneNumber"
                    class="form-control bg-dark text-light border-secondary" placeholder="04241234567"
                    :disabled="role === 'cliente' && phoneVerified && !editingPhone" />
                  <!-- Verification for clients -->
                  <template v-if="role === 'cliente'">
                    <button v-if="!phoneVerified" class="btn btn-outline-warning" @click="handleVerification('phone')"
                      title="Verificar teléfono" :disabled="phoneVerificationLoading">

                      <span v-if="isPhoneSending">
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      </span>

                      <span v-else>
                        <i class="fas fa-phone me-1"></i>
                        Verificar
                      </span>

                    </button>

                    <template v-else>
                      <span v-if="!editingPhone && phoneVerified"
                        class="input-group-text bg-success border-secondary text-light">
                        <i class="fas fa-check-circle me-1"></i>
                      </span>

                      <button v-if="!editingPhone" class="btn btn-outline-secondary" @click="startEditing('phone')"
                        title="Editar teléfono">
                        <i class="fas fa-edit"></i>
                      </button>

                      <template v-else>
                        <button v-if="phoneNumber !== originalData.phoneNumber" class="btn btn-outline-warning"
                          @click="handleVerification('phone')" title="Verificar nuevo teléfono"
                          :disabled="phoneVerificationLoading">

                          <span v-if="isPhoneSending">
                            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          </span>

                          <span v-else>
                            <i class="fas fa-phone me-1"></i>
                            Verificar
                          </span>

                        </button>

                        <!-- Always show cancel while editing -->
                        <button class="btn btn-outline-danger" @click="cancelEditing('phone')" title="Cancelar edición">
                          <i class="fas fa-times"></i>
                        </button>
                      </template>
                    </template>
                  </template>
                  <!-- Save button for affiliates and admins -->
                  <template v-else>
                    <button class="btn btn-outline-primary" @click="saveField('phoneNumber')"
                      :disabled="!isFieldChanged('phoneNumber')" title="Guardar cambios">
                      <i class="fas fa-save me-1"></i>
                    </button>
                  </template>
                </div>

                <!-- Captcha container for phone verification -->
                <div v-if="role === 'cliente' && (!phoneVerified || editingPhone)"
                  class="mt-2 phone-verification-notice">
                  <!-- <div class="alert alert-info py-2">
                    <i class="fas fa-info-circle me-2"></i>
                    <span>Complete el captcha y presione "Verificar" para recibir un código por SMS.</span>
                  </div> -->

                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Address Section -->
        <div class="card section-card mb-4">
          <div class="card-body">
            <h4 class="mb-3 card-title">
              <i class="fas fa-map-marker-alt me-2"></i>
              Dirección
            </h4>
            <div class="row">
              <div v-for="field in displayedFields.filter((f) =>
                ['state', 'municipio', 'parroquia'].includes(f.name)
              )" :key="field.name" class="col-md-4 mb-3">
                <label :for="field.name" class="form-label">{{
                  field.label
                }}</label>
                <div class="d-flex align-items-center gap-2">
                  <select v-if="field.name === 'state'" class="form-control" v-model="state"
                    :disabled="!editStates.state" @change="displayMunicipios($event.target.value)">
                    <option value="">Seleccionar Estado</option>
                    <option v-for="state in venezuelanStates" :key="state" :value="state">
                      {{ state }}
                    </option>
                  </select>
                  <select v-else-if="field.name === 'municipio'" class="form-control" v-model="municipio"
                    :disabled="!editStates.municipio" @change="displayParroquias($event.target.value)">
                    <option value="">Seleccionar Municipio</option>
                    <option v-for="mun in municipios" :key="mun" :value="mun">
                      {{ mun }}
                    </option>
                  </select>
                  <select v-else-if="field.name === 'parroquia'" class="form-control" v-model="parroquia"
                    :disabled="!editStates.parroquia">
                    <option value="">Seleccionar Parroquia</option>
                    <option v-for="parr in parroquias" :key="parr" :value="parr">
                      {{ parr }}
                    </option>
                  </select>
                  <div class="btn-group" role="group">
                    <button v-if="!editStates[field.name]" class="btn btn-transparent btn-sm" @click.prevent="
                      toggleEdit(field.name);
                    handleEditClick(field.name);
                    ">
                      <i class="fa-solid fa-pencil text-primary"></i>
                    </button>
                    <template v-else>
                      <button class="btn btn-transparent btn-sm" @click.prevent="updateField(field)">
                        <i class="fa-solid fa-save text-success"></i>
                      </button>
                      <button class="btn btn-transparent btn-sm" @click.prevent="toggleEdit(field.name)">
                        <i class="fa-solid fa-times text-secondary"></i>
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Security Section -->
        <div class="card section-card mb-4">
          <div class="card-body">
            <h4 class="mb-3 card-title">
              <i class="fas fa-lock me-2"></i>
              Seguridad
            </h4>
            <form @submit.prevent="changePassword" class="row">
              <div class="col-md-4">
                <div class="mb-3">
                  <label for="currentPassword" class="form-label">Contraseña Actual</label>
                  <input type="password" class="form-control password-field" id="currentPassword"
                    v-model="currentPassword" />
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label for="newPassword" class="form-label">Nueva Contraseña</label>
                  <input type="password" class="form-control password-field" id="newPassword" v-model="newPassword" />
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label for="confirmPassword" class="form-label">Confirmar Nueva Contraseña</label>
                  <input type="password" class="form-control password-field" id="confirmPassword"
                    v-model="confirmPassword" />
                </div>
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-theme-success" :disabled="isSubmitting">
                  <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                    aria-hidden="true"></span>
                  <span v-else>Actualizar Contraseña</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Subscription Section (if applicable) -->
        <div v-if="role === 'cliente' || role === 'afiliado'" class="card section-card mb-4">
          <div class="card-body">
            <h4 class="mb-3 card-title">
              <i class="fas fa-handshake me-2"></i>
              Suscripción
            </h4>
            <div v-if="isFreeSubscription" class="row">
              <div class="col-12">
                <div class="alert alert-info d-flex align-items-center">
                  <i class="fas fa-info-circle me-3 fa-2x"></i>
                  <div>
                    <h5 class="text-black mb-1">Suscripción Gratuita</h5>
                    <p class="mb-0">
                      Explora nuestros planes para disfrutar de todo lo que tenemos para ti.
                    </p>
                    <div class="mt-2">
                      <router-link to="/suscripciones" class="btn btn-sm btn-outline-info">
                        <i class="fas fa-star me-1"></i>
                        Actualizar Suscripción
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!subscriptionPlan" class="row">
              <div class="col-12">
                <div class="alert alert-info d-flex align-items-center">
                  <i class="fas fa-info-circle me-3 fa-2x"></i>
                  <div>
                    <h5 class="text-black mb-1">Sin Suscripción Activa</h5>
                    <p class="mb-0">
                      Actualmente no tienes una suscripción activa. Explora nuestros planes para disfrutar de todos los
                      beneficios.
                    </p>
                    <div class="mt-2">
                      <!-- TODO: Update this link to the actual subscription plans page -->
                      <router-link to="/suscripciones" class="btn btn-sm btn-outline-info">
                        <i class="fas fa-star me-1"></i>
                        Ver Planes de Suscripción
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="subscriptionPlan && !isFreeSubscription && !hasapplicablePurchase" class="row">
              <div class="col-md-6">
                <div class="d-flex align-items-center gap-2 mb-3">
                  <p class="mb-0">
                    <strong>Plan:</strong>
                    {{ subscriptionPlan.name ? subscriptionPlan?.name.toUpperCase() : 'No disponible' }}
                  </p>
                  <!-- Payment Status Badge -->
                  <span class="payment-badge" :class="{
                    paid: subscriptionPlan.paymentVerified,
                    pending:
                      subscriptionPlan.paymentUploaded &&
                      !subscriptionPlan.paymentVerified,
                    unpaid: !subscriptionPlan.paymentUploaded,
                  }">
                    <i class="fas" :class="{
                      'fa-check-circle': subscriptionPlan.paymentVerified,
                      'fa-clock':
                        subscriptionPlan.paymentUploaded &&
                        !subscriptionPlan.paymentVerified,
                      'fa-exclamation-circle':
                        !subscriptionPlan.paymentUploaded,
                    }"></i>
                    {{
                      subscriptionPlan.paymentVerified
                        ? "Pago Verificado"
                        : subscriptionPlan.paymentUploaded
                          ? "Pago en Revisión"
                          : "Pago Pendiente"
                    }}
                  </span>
                </div>
                <p><strong>Precio:</strong> ${{ subscriptionPlan.price }} / <small>{{ subscriptionPlan.isYearly ?
                  'Anual' :
                  'Mensual' }}</small></p>
                <p>
                  <strong>Fecha de Corte:</strong>
                  {{ subscriptionPlan.payDay ? formatDate(subscriptionPlan.payDay) : 'No disponible' }}
                </p>
                <!-- Add subscription buttons -->
                <div class="mt-3 d-flex gap-2 flex-wrap">
                  <button v-if="!subscriptionPlan.paymentUploaded" class="btn btn-theme-warning"
                    @click="openPaymentModal">
                    <i class="fas fa-money-bill me-2"></i>Notificar Pago
                  </button>
                  <button v-if="
                    subscriptionPlan.paymentUploaded &&
                    subscriptionPlan.paymentUrl
                  " class="btn btn-theme-success" @click="openImgModal">
                    <i class="fas fa-receipt me-2"></i>
                    <span class="d-none d-sm-inline">Ver </span>Comprobante
                  </button>
                  <router-link to="/suscripciones" class="btn btn-theme-info">
                    <i class="fas fa-arrow-up me-2"></i>Cambiar Plan
                  </router-link>
                </div>
              </div>
            </div>
            <div v-else-if="subscriptionPlan && !isFreeSubscription && hasapplicablePurchase && hasCurrentMonthPayment"
              class="row">
              <div class="col-12">
                <div class="alert alert-success d-flex align-items-center">
                  <i class="fas fa-check-circle me-3 fa-2x"></i>
                  <div>
                    <h5 class="mb-1">Suscripción Activa</h5>
                    <p class="mb-0">Estás al día con el pago de cuotas de tu compra más reciente. Tu suscripción está
                      activa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="subscriptionPlan && !isFreeSubscription && hasapplicablePurchase && !hasCurrentMonthPayment"
              class="row">
              <div class="col-12">
                <div class="alert alert-warning d-flex align-items-center">
                  <i class="fas fa-exclamation-triangle me-3 fa-2x"></i>
                  <div>
                    <h5 class="mb-1">Suscripción Pendiente</h5>
                    <p class="mb-0">
                      Para mantener tu suscripción activa, asegúrate de estar al día con los pagos de tus cuotas.
                      Cada pago puntual de tus compras a crédito ayuda a mantener tu suscripción vigente.
                    </p>
                    <div class="mt-2">
                      <router-link to="/creditos" class="btn btn-sm btn-outline-warning">
                        <i class="fas fa-credit-card me-1"></i>
                        Ver Mis Compras recientes
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Social Media Section -->
    <div v-if="role === 'afiliado'" id="social-media" class="card section-card mb-4">
      <div class="card-body">
        <h4 class="mb-3 card-title">
          <i class="fas fa-share-alt me-2"></i>
          Redes Sociales
        </h4>
        <div class="row">
          <!-- Instagram -->
          <div class="col-md-6 mb-3">
            <label class="form-label">Instagram</label>
            <div class="input-group">
              <span class="input-group-text bg-dark text-light border-secondary">
                <i class="fab fa-instagram"></i>
              </span>
              <input type="text" class="form-control bg-dark text-light border-secondary" v-model="instagram"
                placeholder="@usuario">
            </div>
          </div>

          <!-- Facebook -->
          <div class="col-md-6 mb-3">
            <label class="form-label">Facebook</label>
            <div class="input-group">
              <span class="input-group-text bg-dark text-light border-secondary">
                <i class="fab fa-facebook"></i>
              </span>
              <input type="text" class="form-control bg-dark text-light border-secondary" v-model="facebook"
                placeholder="facebook.com/pagina">
            </div>
          </div>

          <!-- Twitter -->
          <div class="col-md-6 mb-3">
            <label class="form-label">Twitter</label>
            <div class="input-group">
              <span class="input-group-text bg-dark text-light border-secondary">
                <i class="fab fa-twitter"></i>
              </span>
              <input type="text" class="form-control bg-dark text-light border-secondary" v-model="twitter"
                placeholder="@usuario">
            </div>
          </div>

          <!-- TikTok -->
          <div class="col-md-6 mb-3">
            <label class="form-label">TikTok</label>
            <div class="input-group">
              <span class="input-group-text bg-dark text-light border-secondary">
                <i class="fab fa-tiktok"></i>
              </span>
              <input type="text" class="form-control bg-dark text-light border-secondary" v-model="tiktok"
                placeholder="@usuario">
            </div>
          </div>

          <!-- Save button -->
          <div class="d-flex">
            <button class="btn btn-theme-success" :disabled="isSubmitting" @click.prevent="updateSocialMedia">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                aria-hidden="true"></span>
              <span v-else>Guardar</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Details Section -->
    <div v-if="role === 'afiliado'" id="payment-details" class="card section-card mb-4">
      <div class="card-body">
        <h4 class="mb-3 card-title">
          <i class="fas fa-money-check-alt me-2"></i>
          Datos de Pago
        </h4>
        <div class="row">
          <!-- Bank -->
          <div class="col-md-6 mb-3">
            <label class="form-label">Banco</label>
            <input type="text" class="form-control bg-dark text-light border-secondary" v-model="paymentDetails.bank"
              placeholder="Nombre del banco">
          </div>

          <!-- Bank Account -->
          <div class="col-md-6 mb-3">
            <label class="form-label">Número de Cuenta</label>
            <input type="text" class="form-control bg-dark text-light border-secondary"
              v-model="paymentDetails.bankAccount" placeholder="0000-0000-0000-0000">
          </div>

          <!-- Phone Number for Payments -->
          <div class="col-md-6 mb-3">
            <label class="form-label">Teléfono para Pagos Móviles</label>
            <input type="tel" class="form-control bg-dark text-light border-secondary"
              v-model="paymentDetails.phoneNumber" placeholder="04XX-XXX-XXXX">
          </div>

          <!-- Document ID -->
          <div class="col-md-6 mb-3">
            <label class="form-label">Documento de Identidad</label>
            <input type="text" class="form-control bg-dark text-light border-secondary"
              v-model="paymentDetails.identification" placeholder="V-XXXXXXXX">
          </div>

          <!-- save button -->
          <div class="d-flex">
            <button class="btn btn-theme-success" :disabled="isSubmitting" @click.prevent="updatePaymentDetails">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                aria-hidden="true"></span>
              <span v-else>Guardar</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Request delete account -->
    <div class="mt-3 d-flex flex-wrap">
      <button class="btn btn-danger" @click="requestDeleteAccount" :disabled="isRequestPending">
        <span v-if="isRequestPending" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span v-else>Solicitar eliminar cuenta</span>
      </button>
      <!-- <p class="text-danger" v-if="isRequestPending">Tu solicitud ha sido enviada.</p> -->
    </div>

    <!-- Verification Modal -->
    <div class="modal fade" id="verifyModal" tabindex="-1" aria-labelledby="verifyModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="verifyModalLabel">
              <i class="fas fa-shield-alt me-2"></i>
              Verificar {{ verifyingField === 'email' ? 'Correo Electrónico' : 'Teléfono' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="text-center mb-3">
              Hemos enviado un código de verificación a tu {{ verifyingField === 'email' ? 'correo electrónico' :
                'teléfono'
              }}.
              Por favor, ingrésalo a continuación:
            </p>

            <div class="verification-code-input">
              <label for="verificationCode" class="form-label">Código de Verificación</label>
              <input type="text" id="verificationCode"
                class="form-control bg-dark text-light border-secondary text-center" v-model="verificationCode"
                placeholder="Ingresa el código de 6 dígitos" maxlength="6" autocomplete="off" />
            </div>

            <div class="text-center mt-3">
              <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Si no recibes el código, verifica tu {{ verifyingField === 'email' ? 'bandeja de spam' : 'teléfono' }} o
                solicita uno nuevo.
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" @click="verifyCode(verificationCode)"
              :disabled="!verificationCode">
              <span v-if="isVerifying">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              </span>
              <span v-else>Verificar</span>
            </button>

          </div>
        </div>
      </div>
    </div>

    <!-- Request update field Modal -->
    <div class="modal fade" id="updateFieldModal" tabindex="-1" aria-labelledby="updateFieldModalLabel"
      aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="updateFieldModalLabel">
              <i class="fa-solid fa-rotate me-2"></i>
              Actualizar {{ updatingField?.label }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="update-field-input">
              <label for="verificationCode" class="form-label">Ingresa el nuevo valor</label>
              <input type="text" id="newValue" v-model="newValue"
                class="form-control bg-dark text-light border-secondary text-center" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Cancelar
            </button>
            <button type="button" class="btn btn-primary" @click="requestFieldUpdate(updatingField)"
              :disabled="(isSubmitting || !newValue)">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                aria-hidden="true"></span>
              <span v-else>Enviar solicitud</span>
            </button>
          </div>+
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <NotifyPaymentModal 
      :user-id="userId"
      :userName="userName"
      :userEmail="userEmail"
      :role="role"
      :selected-plan="subscriptionPlan"
      :exchange="exchange"
      ref="paymentModal"
      @close="$refs.paymentModal.closeModal()"
    />

    <!-- Payment capture Modal -->
    <div class="modal fade" id="imgModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Comprobante de Pago</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center">
            <img :src="modalImageUrl" alt="comprobante" class="img-fluid" />
          </div>
        </div>
      </div>
    </div>

    <!-- recaptcha container -->
    <div id="recaptcha-container"></div>

  </div>
</template>
<style scoped>
/* #recaptcha-container {
  width: 100%;
  height: 78px;
  display: flex;
  justify-content: center;
  margin: 10px 0;
  overflow: visible;
}

#recaptcha-container div {
  display: inline-block;
}

#recaptcha-container iframe {
  width: 100%;
  height: 100%;
} */

.text-theme {
  color: var(--accent-color);
}

/* Update the card styles */
.section-card {
  background-color: #2d2d2d !important;
  /* Override any other background colors */
  border: 1px solid var(--border-color);
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.section-card:hover {
  transform: none;
  /* Remove hover effect */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Update the container styles */
.profile-container {
  max-width: 1200px;
  margin: 0 auto;

}

/* Remove scrollspy-related styles */
.navbar-sticky {
  display: none;
}

/* Update spacing between sections */
.mb-4 {
  margin-bottom: 2rem !important;
}

/* Update card body padding */
.card-body {
  padding: 2rem;
}

/* Update form group spacing */
.form-group {
  margin-bottom: 1.5rem;
}

/* Add section dividers */
.section-card+.section-card {
  margin-top: 2rem;
}

/* Subscription Section Styles */
.btn-theme-success {
  color: #198754;
  border: 1px solid #198754;
  background-color: transparent;
  transition: all 0.2s ease;
}

.btn-theme-success:hover {
  background-color: #198754;
  color: #fff;
}

.btn-theme-warning {
  color: #ffc107;
  border: 1px solid #ffc107;
  background-color: transparent;
  transition: all 0.2s ease;
}

.btn-theme-warning:hover {
  background-color: #ffc107;
  color: #000;
}

.btn-theme-info {
  color: var(--bs-primary);
  border: 1px solid var(--bs-primary);
  background-color: transparent;
  transition: all 0.2s ease;
}

.btn-theme-info:hover {
  background-color: var(--bs-primary);
  color: white;
}

/* Modal Styles */
.modal-content {
  background-color: #29122f;
  border: 1px solid var(--border-color);
}

.modal-header {
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(0, 0, 0, 0.2);
}

.modal-body {
  background-color: #2d2d2d;
}

.modal-footer {
  border-top: 1px solid var(--border-color);
  background-color: rgba(0, 0, 0, 0.2);
}

.modal-title {
  color: var(--text-primary);
}

/* Improve button spacing in subscription section */
.subscription-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.subscription-buttons .btn {
  min-width: fit-content;
}

/* File Input Styles */
input[type="file"] {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border-color: var(--border-color);
}

input[type="file"]::-webkit-file-upload-button {
  background-color: var(--accent-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  margin-right: 1rem;
}

/* Image Preview */
.img-fluid {
  max-height: 70vh;
  object-fit: contain;
}

/* Payment Status Badge Styles */
.payment-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.payment-badge i {
  font-size: 1rem;
}

.payment-badge.paid {
  background-color: rgba(25, 135, 84, 0.1);
  color: #198754;
  border: 1px solid rgba(25, 135, 84, 0.2);
}

.payment-badge.pending {
  background-color: rgba(255, 193, 7, 0.1);
  color: #ffc107;
  border: 1px solid rgba(255, 193, 7, 0.2);
}

.payment-badge.unpaid {
  background-color: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.2);
}

/* Improve subscription info layout */
.subscription-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subscription-info p {
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .payment-badge {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}

/* Add to your existing styles */
.highlight-section {
  animation: highlight-pulse 2s ease;
}

@keyframes highlight-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(255, 193, 7, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);
  }
}

.alert {
  border-radius: 8px;
}

.alert-warning {
  background-color: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.3);
  color: #f8f9fa;
}

.alert ul {
  margin-left: 1rem;
}

.alert li {
  font-size: 0.9rem;
}

.btn-warning {
  background-color: #ffc107;
  border-color: #ffc107;
  color: #000;
}

.btn-warning:hover {
  background-color: #e0a800;
  border-color: #d39e00;
  color: #000;
}

@media (max-width: 576px) {
  .alert .d-flex {
    flex-direction: column;
    text-align: center;
  }

  .alert i.fs-4 {
    margin-bottom: 1rem;
  }

  .alert .mt-3 {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .alert .btn {
    width: 100%;
    margin-left: 0 !important;
  }
}

/* Social Media and Payment Details sections */
.input-group-text {
  min-width: auto;
  justify-content: center;
}

.input-group-text i {
  font-size: 1.1rem;
}

.fa-instagram {
  background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.fa-facebook {
  color: #1877f2;
}

.fa-twitter {
  color: #1da1f2;
}

.fa-tiktok {
  color: #ff0050;
}

.section-card {
  transition: all 0.3s ease;
}

.section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .card-body {
    padding: 1rem;
  }

  .input-group {
    margin-bottom: 0.5rem;
  }
}

/* Verification button styles */
.input-group .btn-outline-warning {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  min-width: 100px;
}

.input-group .input-group-text {
  width: auto;
}

.input-group .form-control:disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.input-group .spinner-border-sm {
  width: 1rem;
  height: 1rem;
  margin-right: 0.25rem;
}

/* Ensure consistent height */
.input-group>* {
  height: 38px;
}

/* Adjust spacing for loading state */
.btn-outline-warning span {
  display: inline-flex;
  align-items: center;
}

/* Success state styling */
.input-group-text.bg-success {
  font-size: 0.875rem;
}

@media (max-width: 576px) {
  .input-group {
    flex-wrap: nowrap;
  }

  .input-group .btn-outline-warning,
  .input-group .input-group-text {
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
  }
}

/* Phone Verification Notice Styles */
.phone-verification-notice {
  margin-top: 0.75rem;
}

.phone-verification-notice .alert {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
}

/* #recaptcha-container {
  transform-origin: left top;
  overflow: hidden;
}

#recaptcha-container iframe {
  max-width: 100%;
} */

@media (max-width: 576px) {
  .phone-verification-notice .alert {
    font-size: 0.8rem;
    text-align: center;
  }

  /* #recaptcha-container {
    transform: scale(0.85);
    margin: 0 auto;
  } */
}

/* Verification Modal Styles */
.verification-code-input .update-field-input {
  max-width: 250px;
  margin: 0 auto;
}

.verification-code-input input {
  font-size: 1.25rem;
  letter-spacing: 0.25rem;
  text-align: center;
  font-weight: 500;
}

.modal-content {
  background-color: #2d2d2d;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.modal-footer {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.btn-primary {
  background-color: #6f42c1;
  border-color: #6f42c1;
}

.btn-primary:hover:not(:disabled) {
  background-color: #5a32a3;
  border-color: #5a32a3;
}

.recaptcha-container {
  min-height: 78px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 10px 0;
  overflow: visible;
}

.recaptcha-container>div {
  display: inline-block;
}

.recaptcha-container iframe {
  width: 100%;
  height: 100%;
}
</style>