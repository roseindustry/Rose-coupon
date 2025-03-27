<script>
import { defineComponent, computed } from "vue";
import { useUserStore } from "@/stores/user-role";
import { auth, db, storage, functions } from "../firebase/init";
import { ref as dbRef, update, get, set } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  listAll,
} from "firebase/storage";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { toast as showToast } from "@/utils/toast";
import { sendEmail } from "@/utils/emailService";
import "toastify-js/src/toastify.css";
import { Modal } from "bootstrap";
import moment from "moment";
import venezuela from "venezuela";
import NotifyPaymentModal from "@/components/subscriptions/userModals/NotifyPaymentModal.vue";

export default defineComponent({
	components: {
    NotifyPaymentModal,
	},
	data() {
		return {
      userId: "",
      role: "",
      userName: "",
      requestSent: "",
      userSubscriptionId: "",
			subscriptionPlan: null,

      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
			userVerified: null,

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
      errorMessage: "",
			verificationModal: null,
			paymentModal: null,
			modalImageUrl: null,
			paymentUrl: null,
			amountPaid: 0,

      emailVerified: false,
      phoneVerified: false,
      verifyingField: null,
      emailVerificationCode: "",
      phoneVerificationCode: "",
      phoneVerificationLoading: false,
      phoneVerificationRequested: false,
      recaptchaVisible: false,
      verificationId: null,
      showVerificationInput: false,
      verifyModal: null,
      recaptchaVerifier: null,
      exchange: 0,
      captchaVerified: false,
		};
	},
	async mounted() {
		const userStore = useUserStore();
		const userId = userStore.userId;
		const role = userStore.role;
		this.userId = userId;
		this.role = role;
		this.userName = userStore.userName;
		const isVerified = userStore.isVerified;
		this.userVerified = isVerified;

    // Fetch user data first
    await this.fetchUserData(userId);

    // Only set up verification for clients
    if (role === 'cliente') {
        if (isVerified) {
            console.log("Usuario verificado");
        } else {
            console.log("No verificado");
        }
        
			await this.fetchClientPlan();
        this.fetchVerificationStatus();
		} else if (role === 'afiliado') {
			await this.fetchAffiliatePlan();
		}

		await this.checkPaymentReset();

    // Initialize modals after a brief delay to ensure DOM is ready
    this.$nextTick(() => {
        // Initialize only if elements exist and user is not admin
        if (this.role === 'cliente') {
            const verifyModalEl = document.getElementById("verifyModal");
            const paymentModalEl = document.getElementById("notifyPaymentModal");

            if (verifyModalEl) {
                this.verifyModal = new Modal(verifyModalEl);
            }

            if (paymentModalEl) {
                this.paymentModal = new Modal(paymentModalEl);
            }
        }
        // Initialize reCAPTCHA when component is mounted
			this.initRecaptcha();
    });

    // Load location data if needed
    if (this.state) {
        await this.displayMunicipios(this.state);
        if (this.municipio) {
            await this.displayParroquias(this.municipio);
        }
    }
	},
	beforeUnmount() {
		if (this.recaptchaVerifier) {
			this.recaptchaVerifier.clear();
		}
	},
	methods: {
		formatDate(date) {
      const dateString = date.split("T")[0];
      const [year, month, day] = dateString.split("-");
			return `${day}/${month}/${year}`;
		},

    // Fetch data
		async fetchClientPlan() {
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
                `Suscriptions/${this.userSubscriptionId}`
              );
							const userSuscriptionSnapshot = await get(subscriptionDataRef);

							if (userSuscriptionSnapshot.exists()) {
								const userSuscription = userSuscriptionSnapshot.val();

								this.subscriptionPlan = {
                  name: userSuscription.name || "Sin suscripcion",
                  price: userSuscription.price || "No Price",
                  payDay: subscriptionData.payDay || "No PayDay",
									lastPaymentDate: subscriptionData.lastPaymentDate || null,
									isPaid: subscriptionData.isPaid || false,
									paymentUploaded: subscriptionData.paymentUploaded || null,
									paymentVerified: subscriptionData.paymentVerified || null,
                  paymentUrl: subscriptionData.paymentUrl || null,
                  icon: userSuscription.icon || "fa fa-times",
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
					} else {
						console.log("No data available");
					}
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
				});
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

    // Edit fields
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
			if (this.role !== 'admin') return;

			try {
				const updates = {};
				updates[field.name] = field.value;

				await update(dbRef(db, `Users/${this.userId}`), updates);
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

			const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        this.currentPassword
      );

			try {
				await reauthenticateWithCredential(user, credential);
				await updatePassword(user, this.newPassword);
        showToast.success("Contraseña actualizada con éxito.");
        this.currentPassword = "";
        this.newPassword = "";
        this.confirmPassword = "";
			} catch (error) {
        console.error("Error updating password:", error);
        showToast.error("Error al actualizar la contraseña. Inténtalo de nuevo.");
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
		handleFileUpload(event, type) {
			const file = event.target.files[0];
			if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast.error("Por favor, selecciona un archivo de imagen válido.");
        event.target.value = ""; // Clear the invalid file
				return;
			}

			// Update the correct file and preview based on the side
      if (type === "front") {
				this.idFrontFile = file;
				this.idFrontPreview = URL.createObjectURL(file);
      } else if (type === "back") {
				this.idBackFile = file;
				this.idBackPreview = URL.createObjectURL(file);
      } else if (type === "selfie") {
				this.selfieFile = file;
				this.selfiePreview = URL.createObjectURL(file);
      } else if (type === "payment") {
				this.paymentFile = file;
				this.paymentPreview = URL.createObjectURL(file);
			}
		},
		async uploadFile(file, type) {
			// Define storage reference for front or back ID file
      const fileName = `${type === "selfie" ? "selfie" : `${type}-ID`}.${file.name.split(".").pop()}`;
      const fileRef = storageRef(
        storage,
        `verification-files/${this.userId}-${this.userName}/${fileName}`
      );

			// Upload the file and get the download URL
			await uploadBytes(fileRef, file);
			return getDownloadURL(fileRef);
		},
		async uploadPaymentFile(file, date, role) {
			// Define storage reference for front or back ID file
      const fileName = `${date}-capture.${file.name.split(".").pop()}`;
      const fileRef = storageRef(
        storage,
        `payment-captures/${role}/${this.userId}-${this.userName}/${fileName}`
      );

			// Upload the file and get the download URL
			await uploadBytes(fileRef, file);
			return getDownloadURL(fileRef);
		},

    // User verification and subscription payment logic
		async submitVerification() {
			if (!this.idFrontFile || !this.idBackFile || !this.selfieFile) {
        this.errorMessage =
          "Todos los archivos de identificación son requeridos.";
				return;
			}

			try {
				// Show the loader
				this.isSubmitting = true;
        this.errorMessage = "";

				// Upload files
        const frontUrl = await this.uploadFile(this.idFrontFile, "front");
        const backUrl = await this.uploadFile(this.idBackFile, "back");
        const selfieUrl = await this.uploadFile(this.selfieFile, "selfie");

        console.log(
          "Files uploaded successfully:",
          frontUrl,
          backUrl,
          selfieUrl
        );

				//Update user to set field user.requestedVerification = true
				const userRef = dbRef(db, `Users/${this.userId}`);
        await update(userRef, {
          "verificationFiles/Front-ID": frontUrl,
          "verificationFiles/Back-ID": backUrl,
          "verificationFiles/Selfie": selfieUrl,
          requestedVerification: true,
					});

				// Send an email notification to the admin through Firebase Cloud Functions				
        const appUrl = "https://app.rosecoupon.com";
				const emailPayload = {
          to: "roseindustry11@gmail.com",
					message: {
						subject: "Usuario solicitó verificación",
						text: `Hola administrador, el usuario ${this.userName} ha solicitado verificación de identidad en Roseapp.
                        Para verificar el usuario, abre la app en el siguiente enlace: ${appUrl}`,
						html: `<p>Hola administrador,</p>
						<p>El usuario <strong>${this.userName}</strong> ha solicitado verificación de identidad en Roseapp.</p>
						<p>Para verificar el usuario, por favor <a href="${appUrl}" target="_blank">abre la app</a>.</p>`,
					},
				};
				// Send email via the utility function
				const result = await sendEmail(emailPayload);

				if (result.success) {
					console.log("Verification email sent successfully:", result.message);
				} else {
					console.error("Failed to send verification email:", result.error);
				}

				//Success toast
        showToast.success("Archivos subidos!");

				//reset the image previews
				this.idFrontPreview = null;
				this.idBackPreview = null;
				this.selfiePreview = null;
        this.verificationStatus = "pending";
				this.requestSent = true;

				// Hide the modal after submission
				this.verificationModal.hide();
			} catch (error) {
        console.error("Error during verification:", error);
        this.errorMessage =
          "Error al subir los archivos, por favor intente nuevamente.";
			} finally {
				// Hide the loader
				this.isSubmitting = false;
			}
		},
    async notifyPayment(paymentData) {
      try {
        const { amountPaid, paymentFile } = paymentData;
        const today = new Date();
        const paymentDate = today.toISOString();
        const formattedDate = paymentDate.split("T")[0];

        // Calculate payDay (one month from today)
        const payDay = moment().add(1, "month").toISOString();

        if (!paymentFile) {
          showToast.error("Por favor seleccione una captura de pago");
				return;
			}

		// Upload payment file
        const paymentUrl = await this.uploadPaymentFile(
          paymentFile,
          formattedDate,
          this.role
        );
        console.log("File uploaded successfully:", paymentUrl);

		// Update subscription info
        const subscriptionData = {
          lastPaymentDate: paymentDate,
          paymentUploaded: true,
          paymentVerified: false,
          paymentUrl: paymentUrl,
          amountPaid: amountPaid,
          payDay: payDay,
        };
        
        const userSubscriptionRef = dbRef(
          db,
          `Users/${this.userId}/subscription`
        );
        await update(userSubscriptionRef, subscriptionData);


				// Save the payment to the payments collection
		const paymentDetails = {
					subscription_id: this.userSubscriptionId,
					client_id: this.userId,
			amount: amountPaid,
			date: paymentDate,
					approved: false,
			paymentUrl: paymentUrl,			
			type: "subscription",
		}

        const paymentRef = dbRef(
          db,
          `Payments/${this.userId}-${formattedDate}`
        );
        await set(paymentRef, paymentDetails);		

        // Close modal and show success message
        this.$refs.paymentModal.closeModal();
        showToast.success("Pago notificado exitosamente");

        // Refresh subscription data
        await this.fetchClientPlan();
			} catch (error) {
        console.error("Error notifying payment:", error);
        showToast.error("Error al notificar el pago");
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
		async checkPaymentReset() {
			const userRef = dbRef(db, `Users/${this.userId}/subscription`);
			const snapshot = await get(userRef);

			if (snapshot.exists()) {
				const subscriptionData = snapshot.val();
        const lastPaymentDate = new Date(
          subscriptionData.lastPaymentDate || null
        );
				const payDay = new Date(subscriptionData.payDay); // Assuming payDay is a stored date
				const currentDate = new Date();

				// Reset if the current date is past the payDay and payment was not uploaded for this month
        if (
          currentDate >= payDay &&
          lastPaymentDate.getMonth() !== currentDate.getMonth()
        ) {
					await update(userRef, {
						isPaid: false, // Reset to mark unpaid month
						status: false,
						paymentUploaded: false,
					});

          showToast.error("Debes subir tu comprobante de pago para este mes.");
				}
			}
		},

		// User payment
		openPaymentModal() {
      if (this.$refs.paymentModal) {
        this.$refs.paymentModal.openModal();
      }
		},
		async fetchPaymentFiles(date) {
			const currentUserRef = dbRef(db, `Users/${this.userId}`);
			let currentUser = null;

			try {
				const snapshot = await get(currentUserRef);

				if (snapshot.exists()) {
					currentUser = snapshot.val();
				} else {
					currentUser = null;
				}
			} catch (error) {
				console.error("Error fetching current user details:", error);
			}

			try {
				const userName = `${currentUser.firstName} ${currentUser.lastName}`;
        const folderRef = storageRef(
          storage,
          `payment-captures/${this.role}/${this.userId}-${userName}`
        );

				// List all files in the client's payment-captures folder
				const fileList = await listAll(folderRef);

				// Filter files by date (ignoring extension)
        const matchingFile = fileList.items.find((fileRef) =>
          fileRef.name.startsWith(date)
        );

				if (matchingFile) {
					// Get the download URL for the payment file
					const paymentUrl = await getDownloadURL(matchingFile);

					// Assign the URL to the client object if it exists
					this.paymentUrl = paymentUrl || null;
          console.log("Payment file fetched:", paymentUrl);
				} else {
          console.log("No payment file found for the given date");
					this.paymentUrl = null;
				}
			} catch (error) {
        console.error("Error fetching payment file:", error.message || error);
				this.paymentUrl = null;
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

		//Address info
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

    // Field updates
    async requestFieldUpdate(field) {
      try {
        const requestData = {
          userId: this.userId,
          userName: this.userName,
          fieldName: field.name,
          fieldLabel: field.label,
          currentValue: this[field.name],
          userEmail: this.email,
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
            "Solicitud enviada correctamente. Te notificaremos por correo.",
          );
        } else {
          throw new Error(result.message || "Error al enviar la solicitud");
        }
      } catch (error) {
        console.error("Error requesting field update:", error);
        showToast.error(
          "Error al enviar la solicitud. Por favor intenta de nuevo.",
        );
      }
    },

    // Handle verification requests
    handleVerification(fieldName) {
      if (fieldName === "email") {
        this.requestEmailVerification();
      } else {
        this.sendPhoneVerificationCode();
      }
    },
    requestEmailVerification() {
      this.sendVerificationCode("email");
    },
    // requestPhoneVerification() {
    //   this.sendPhoneVerificationCode();
    //   // this.phoneVerificationRequested = true;
    // },

    // Email validation
    validateEmail(email) {
      // Validate email in format example@example.com
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },
    async sendVerificationCode(type) {
      try {
        // Validate the field value before sending code
        if (type === "email" && !this.validateEmail(this.email)) {
          showToast.error("Por favor ingresa un correo electrónico válido");
          return;
        }

        this.verifyingField = type;

        // Base URL for the cloud function
        const baseUrl = 'https://us-central1-rose-app-e062e.cloudfunctions.net/sendVerificationCode';
        // Prepare parameters based on verification type
        const params = new URLSearchParams({
          id: this.userId,
          email: this.email,
          firstName: this.firstName,
          lastName: this.lastName,
          type: type === "phoneNumber" ? "phone" : type, // Convert phoneNumber to phone for API
          newValue: type === "email" ? this.email : this.phoneNumber
        });

        const response = await fetch(`${baseUrl}?${params.toString()}`);

        const result = await response.json();

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            throw new Error(result.message);
          }
          throw new Error(result.message || `Error ${response.status}: Error al enviar el código`);
        }

        if (result && result.success) {
          this.verifyModal = new Modal(document.getElementById("verifyModal"));
          this.verifyModal.show();
          showToast.success("Código enviado correctamente");

          // Show remaining attempts if provided
          if (result.rateLimit?.remainingAttempts) {
            showToast.info(`Te quedan ${result.rateLimit.remainingAttempts} intentos para hoy`);
          }
        } else {
          throw new Error(result.message || "Error al enviar el código");
        }
      } catch (error) {
        console.error("Error sending verification code:", error);
        showToast.error(error.message || "Error al enviar el código");
      }
    },    
    async verifyCode(clientId, code) {
      try {
        // Input validation
        if (!code || !this.verifyingField) {
          throw new Error('Código inválido o tipo de verificación no especificado');
        }

        // Convert verification field type
        const verificationType = this.verifyingField === "phoneNumber" ? "phone" : this.verifyingField;

        // Call the cloud function using fetch
        const baseUrl = 'https://us-central1-rose-app-e062e.cloudfunctions.net/verifyCode';
        
        // Send data in the request body, not as query params
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId: clientId,
            code: code.toString(),
            type: verificationType
          })
        });

        const result = await response.json();

        // Handle the response
        if (result && result.success) {
          // Update local state
          if (verificationType === "email") {
            this.emailVerified = true;
          } else if (verificationType === "phone") {
            this.phoneVerified = true;
          }

          // Update the database
          const userRef = dbRef(db, `Users/${this.userId}`);
          await update(userRef, {
            [`${verificationType}Verified`]: true
          });

          // Close modal and show success message
          if (this.verifyModal) {
            this.verifyModal.hide();
          }
          showToast.success("Verificación exitosa");
        } else {
          throw new Error(result.message || 'Error al verificar el código');
        }
      } catch (error) {
        console.error("Error verifying code:", error);
        showToast.error(
          error.message || "Error al verificar el código. Por favor intente nuevamente"
        );
      }
    },

    // Phone validation
    initRecaptcha() {
			if (this.recaptchaVerifier) {
				this.recaptchaVerifier.clear();
				this.recaptchaVerifier = null;
			}
			
			try {
				this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
					'size': 'normal',
					'callback': () => {
						console.log('reCAPTCHA verified');
						// Set a flag to indicate the captcha has been verified
						this.captchaVerified = true;
					},
					'expired-callback': () => {
						this.recaptchaVerifier = null;
						this.recaptchaVisible = false;
						this.captchaVerified = false;
						showToast.error('El captcha ha expirado. Por favor, inténtelo de nuevo.');
					},
					'error-callback': (error) => {
						console.error('reCAPTCHA error:', error);
						showToast.error('Error en la verificación de reCAPTCHA. Por favor, recargue la página.');
						this.recaptchaVerifier = null;
						this.recaptchaVisible = false;
						this.captchaVerified = false;
					}
				});

        // Show the reCAPTCHA widget when initialized
        this.recaptchaVisible = true;
				
				// Render the reCAPTCHA widget
				this.recaptchaVerifier.render().then((widgetId) => {
					this.recaptchaWidgetId = widgetId;
				}).catch(error => {
					console.error('Error rendering reCAPTCHA:', error);
					showToast.error('Error al cargar el captcha. Por favor, recargue la página.');
				});
			} catch (error) {
				console.error('Error initializing reCAPTCHA:', error);
				showToast.error('Error al inicializar reCAPTCHA. Por favor, recargue la página.');
			}
		},		
		async sendPhoneVerificationCode() {
			try {
				this.phoneVerificationLoading = true;
				
				// Check if recaptcha has been verified
				if (!this.recaptchaVerifier) {
					showToast.error('Por favor complete el captcha antes de solicitar el código de verificación');
					this.phoneVerificationLoading = false;
					return;
				}
				
				// Check if the reCAPTCHA widget is visible and not yet verified
				if (this.recaptchaVisible && !grecaptcha.getResponse(this.recaptchaWidgetId)) {
					showToast.error('Por favor complete el captcha antes de solicitar el código de verificación');
					this.phoneVerificationLoading = false;
					return;
				}
				
				// Format phone number for international format
				let formattedPhone = this.phoneNumber;
				if (formattedPhone.startsWith('04')) {
					formattedPhone = '+58' + formattedPhone;
				}
				
				// Send verification code
				const appVerifier = this.recaptchaVerifier;
				const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
				
				this.verificationId = confirmationResult.verificationId;
				this.showVerificationInput = true;
				
				showToast.success('Código de verificación enviado. Por favor revise sus mensajes.');
			} catch (error) {
				console.error('Error sending phone verification code:', error);
				
				// Show specific error messages based on error code
				if (error.code === 'auth/invalid-phone-number') {
					showToast.error('Número de teléfono inválido. Verifique el formato.');
				} else if (error.code === 'auth/captcha-check-failed') {
					showToast.error('Verificación de captcha fallida. Por favor intente nuevamente.');
				} else {
					showToast.error('Error al enviar el código de verificación. Intente nuevamente.');
				}
				
				// Reset captcha if there was an error
				if (window.recaptchaWidgetId) {
					grecaptcha.reset(window.recaptchaWidgetId);
				}
			} finally {
				this.phoneVerificationLoading = false;
			}
		},		
		async verifyPhoneCode() {
			if (!this.phoneVerificationCode) {
				showToast.error('Por favor, ingrese el código de verificación');
				return;
			}
			
			try {
				this.phoneVerificationLoading = true;
				
				// Create credential with verification ID and code
				const credential = PhoneAuthProvider.credential(
					this.verificationId, 
					this.phoneVerificationCode
				);
				
				// Mark phone as verified
				this.phoneVerified = true;
				this.showVerificationInput = false;

        // Update the database
        const userRef = dbRef(db, `Users/${this.userId}`);
        await update(userRef, {
          phoneNumber: this.formattedPhoneNumber,
          phoneVerified: true
        });
				
				showToast.success('Número de teléfono verificado correctamente');
			} catch (error) {
				console.error('Error verifying code:', error);
				showToast.error('Código de verificación inválido. Por favor, inténtelo de nuevo.');
			} finally {
				this.phoneVerificationLoading = false;
			}
		},
    
    // Check verification status
    async fetchVerificationStatus() {
      try {
        const userRef = dbRef(db, `Users/${this.userId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();
          this.emailVerified = userData.emailVerified || false;
          this.phoneVerified = userData.phoneVerified || false;
        }
      } catch (error) {
        console.error("Error fetching verification status:", error);
      }
    },

    // Scroll to section
    scrollToSection(sectionId) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Add a highlight effect
        element.classList.add('highlight-section');
        setTimeout(() => {
          element.classList.remove('highlight-section');
        }, 2000);
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
		isProfileIncomplete() {
      if (this.role === "afiliado") {
        return (
          !this.state || !this.municipio || !this.parroquia || !this.address
        );
			} else {
				return !this.state || !this.municipio || !this.parroquia;
			}
    },
    isVerified() {
      return (fieldName) => {
        return fieldName === "email" ? this.emailVerified : this.phoneVerified;
      };
		},
    isProfileComplete() {
      // Check if social media fields are filled
      const hasSocialMedia = this.twitter || this.instagram || this.facebook || this.tiktok;
      
      // Check if payment details are filled
      const hasPaymentDetails = this.paymentDetails.bank && 
                               this.paymentDetails.phoneNumber && 
                               this.paymentDetails.bankAccount;
      
      return hasSocialMedia && hasPaymentDetails;
    },
    formattedPhoneNumber() {
			if (!this.phoneNumber) return '';
			
			// Handle different country codes
			if (this.phoneNumber.startsWith('0')) {
				// Venezuelan format (starts with 0)
				return `+58${this.phoneNumber.substring(1)}`;
			} else if (this.phoneNumber.startsWith('55')) {
				// Brazilian format (starts with country code)
				return `+${this.phoneNumber}`;
			} else if (this.phoneNumber.startsWith('+')) {
				// Already has + prefix
				return this.phoneNumber;
			} else {
				// Default to Venezuelan format if no country code
				return `+58${this.phoneNumber}`;
			}
		}
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
                Para brindar una mejor experiencia a tus clientes, por favor completa tus datos de redes sociales y detalles de pago.
                Esto ayudará a generar más confianza y facilitar las transacciones.
              </p>
			</div>
		</div>
          <div class="mt-3">
            <button class="btn btn-sm btn-warning" @click="scrollToSection('social-media')">
              <i class="fas fa-share-alt me-1"></i> Completar Redes Sociales
            </button>
            <button class="btn btn-sm btn-warning ms-2" @click="scrollToSection('payment-details')">
              <i class="fas fa-money-check-alt me-1"></i> Completar Datos de Pago
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
              <div
                v-for="field in displayedFields.filter(
                  (f) =>
                    ![
                      'state',
                      'municipio',
                      'parroquia',
                      'email',
                      'phoneNumber',
                    ].includes(f.name)
                )"
                :key="field.name"
                class="col-md-6 mb-3"
              >
                <label :for="field.name" class="form-label">{{
                  field.label
                }}</label>
                <div class="d-flex align-items-center gap-2">
                  <input
                    :type="field.name.includes('password') ? 'password' : 'text'"
                    :id="field.name"
                    v-model="field.value"
                    class="form-control"
                    :disabled="role === 'cliente'"
                  />
                  <button
                    v-if="role === 'cliente' && !isAddressField(field.name)"
                    class="btn btn-transparent btn-sm"
                    @click.prevent="requestFieldUpdate(field)"
                    :title="'Solicitar actualización de ' + field.label.toLowerCase()"
                  >
                    <i class="fa-solid fa-envelope text-theme"></i>
                  </button>
                  <!-- Admin direct edit button -->
                  <button
                    v-if="role === 'admin'"
                    class="btn btn-transparent btn-sm"
                    @click.prevent="updateField(field)"
                    :title="'Actualizar ' + field.label.toLowerCase()"
                  >
                    <i class="fas fa-save text-theme"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Information Section -->
        <div class="card section-card mb-4">
          <div class="card-body">
            <h4 class="mb-3 card-title">
              <i class="fas fa-address-card me-2"></i>
              Información de Contacto
            </h4>
            <div class="row">
              <!-- Email Field (Always First) -->
              <div class="col-md-6 mb-3">
                <label for="email" class="form-label">Correo Electrónico</label>
                <div class="d-flex align-items-center gap-2">
                  <input
                    type="email"
                    id="email"
                    v-model="email"
                    class="form-control"
                    placeholder="correo@ejemplo.com"
                    :disabled="role === 'cliente' && emailVerified"
                  />
                  
                  <!-- Verification for clients -->
                  <template v-if="role === 'cliente'">
                    <button
                      v-if="!emailVerified"
                      class="btn btn-outline-warning"
                      @click="handleVerification('email')"
                      title="Verificar correo"
                    >
                      <i class="fas fa-envelope me-1"></i>
                      Verificar
                    </button>
                    <span v-else class="badge bg-success py-2 px-3">
                      <i class="fas fa-check-circle me-1"></i>
                      Verificado
                    </span>
                  </template>
                  
                  <!-- Admin/Affiliate save button -->
                  <button
                    v-if="role === 'admin' || role === 'afiliado'"
                    class="btn btn-outline-primary"
                    @click.prevent="updateField({name: 'email', label: 'Correo Electrónico'})"
                    title="Actualizar correo electrónico"
                  >
                    <i class="fas fa-save me-1"></i>
                    Guardar
                  </button>
                </div>
                
                <!-- Verification status for clients -->
                <small v-if="role === 'cliente'" class="text-muted">
                  {{ emailVerified ? "Correo verificado" : "Correo sin verificar" }}
                </small>
              </div>

              <!-- Phone Field (Always Second) -->
              <div class="col-md-6 mb-3">
                <label for="phoneNumber" class="form-label">Teléfono</label>
                <div class="d-flex align-items-center gap-2">
                  <input
                    type="tel"
                    id="phoneNumber"
                    v-model="phoneNumber"
                    class="form-control"
                    placeholder="04241234567"
                    :disabled="role === 'cliente' && phoneVerified"
                  />
                  
                  <!-- Verification for clients -->
                  <template v-if="role === 'cliente'">
                    <button
                      v-if="!phoneVerified"
                      class="btn btn-outline-warning"
                      @click="handleVerification('phoneNumber')"
                      title="Verificar teléfono"
                      :disabled="phoneVerificationLoading"
                    >
                      <i class="fas fa-sms me-1"></i>
                      <span v-if="phoneVerificationLoading">
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Enviando...
                      </span>
                      <span v-else>Verificar</span>
                    </button>
                    <span v-else class="badge bg-success py-2 px-3">
                      <i class="fas fa-check-circle me-1"></i>
                      Verificado
                    </span>
                  </template>
                  
                  <!-- Admin/Affiliate save button -->
                  <button
                    v-if="role === 'admin' || role === 'afiliado'"
                    class="btn btn-outline-primary"
                    @click.prevent="updateField({name: 'phoneNumber', label: 'Teléfono'})"
                    title="Actualizar teléfono"
                  >
                    <i class="fas fa-save me-1"></i>
                    Guardar
                  </button>
                </div>
                
                <!-- Verification status for clients -->
                <small v-if="role === 'cliente'" class="text-muted">
                  {{ phoneVerified ? "Teléfono verificado" : "Teléfono sin verificar" }}
                </small>
                
                <!-- Phone format help text -->
                <div>
                  <small class="form-text text-muted d-block">
                    <i class="fas fa-info-circle me-1"></i> Formatos de teléfono aceptados: 
                  </small>
                  <small class="form-text text-muted d-block">
                    • Venezuela: <span class="text-success">04145555555</span> (se añadirá +58)
                  </small>
                </div>
                
                <!-- Add a more prominent captcha verification notice -->
                <div v-if="role === 'cliente' && !phoneVerified" class="mt-2 phone-verification-notice">
                  <div class="alert alert-info py-2">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Importante:</strong> Complete el captcha abajo y luego presione "Verificar" para recibir un código por SMS.
                  </div>
                  
                  <!-- reCAPTCHA container -->
                  <div id="recaptcha-container" class="mt-2 d-flex justify-content-center"></div>
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
              <div
                v-for="field in displayedFields.filter((f) =>
                  ['state', 'municipio', 'parroquia'].includes(f.name)
                )"
                :key="field.name"
                class="col-md-4 mb-3"
              >
                <label :for="field.name" class="form-label">{{
                  field.label
                }}</label>
                <div class="d-flex align-items-center gap-2">
                  <select
                    v-if="field.name === 'state'"
                    class="form-control"
                    v-model="state"
                    :disabled="!editStates.state"
                    @change="displayMunicipios($event.target.value)"
                  >
                    <option value="">Seleccionar Estado</option>
                    <option
                      v-for="state in venezuelanStates"
                      :key="state"
                      :value="state"
                    >
                      {{ state }}
                    </option>
                  </select>
                  <select
                    v-else-if="field.name === 'municipio'"
                    class="form-control"
                    v-model="municipio"
                    :disabled="!editStates.municipio"
                    @change="displayParroquias($event.target.value)"
                  >
                    <option value="">Seleccionar Municipio</option>
                    <option v-for="mun in municipios" :key="mun" :value="mun">
                      {{ mun }}
                    </option>
                  </select>
                  <select
                    v-else-if="field.name === 'parroquia'"
                    class="form-control"
                    v-model="parroquia"
                    :disabled="!editStates.parroquia"
                  >
                    <option value="">Seleccionar Parroquia</option>
                    <option
                      v-for="parr in parroquias"
                      :key="parr"
                      :value="parr"
                    >
                      {{ parr }}
                    </option>
                  </select>
                  <div class="btn-group" role="group">
                    <button
                      v-if="!editStates[field.name]"
                      class="btn btn-transparent btn-sm"
                      @click.prevent="
                        toggleEdit(field.name);
                        handleEditClick(field.name);
                      "
                    >
                      <i class="fa-solid fa-pencil text-primary"></i>
                    </button>
                    <template v-else>
                      <button
                        class="btn btn-transparent btn-sm"
                        @click.prevent="updateField(field)"
                      >
                        <i class="fa-solid fa-save text-success"></i>
                      </button>
                      <button
                        class="btn btn-transparent btn-sm"
                        @click.prevent="toggleEdit(field.name)"
                      >
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
            <form @submit.prevent="updatePassword" class="row">
              <div class="col-md-4">
                <div class="mb-3">
                  <label for="currentPassword" class="form-label"
                    >Contraseña Actual</label
                  >
                  <input
                    type="password"
                    class="form-control password-field"
                    id="currentPassword"
                    v-model="currentPassword"
                  />
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label for="newPassword" class="form-label"
                    >Nueva Contraseña</label
                  >
                  <input
                    type="password"
                    class="form-control password-field"
                    id="newPassword"
                    v-model="newPassword"
                  />
                </div>
              </div>
              <div class="col-md-4">
                <div class="mb-3">
                  <label for="confirmPassword" class="form-label"
                    >Confirmar Nueva Contraseña</label
                  >
                  <input
                    type="password"
                    class="form-control password-field"
                    id="confirmPassword"
                    v-model="confirmPassword"
                  />
                </div>
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-theme-success">
                  Actualizar Contraseña
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
            <div v-if="subscriptionPlan" class="row">
              <div class="col-md-6">
                <div class="d-flex align-items-center gap-2 mb-3">
                  <p class="mb-0">
                    <strong>Plan:</strong>
                    {{ subscriptionPlan.name.toUpperCase() }}
                  </p>
                  <!-- Payment Status Badge -->
                  <span
                    class="payment-badge"
                    :class="{
                      paid: subscriptionPlan.paymentVerified,
                      pending:
                        subscriptionPlan.paymentUploaded &&
                        !subscriptionPlan.paymentVerified,
                      unpaid: !subscriptionPlan.paymentUploaded,
                    }"
                  >
                    <i
                      class="fas"
                      :class="{
                        'fa-check-circle': subscriptionPlan.paymentVerified,
                        'fa-clock':
                          subscriptionPlan.paymentUploaded &&
                          !subscriptionPlan.paymentVerified,
                        'fa-exclamation-circle':
                          !subscriptionPlan.paymentUploaded,
                      }"
                    ></i>
                    {{
                      subscriptionPlan.paymentVerified
                        ? "Pago Verificado"
                        : subscriptionPlan.paymentUploaded
                          ? "Pago en Revisión"
                          : "Pago Pendiente"
                    }}
                  </span>
                </div>
                <p><strong>Precio:</strong> ${{ subscriptionPlan.price }}</p>
                <p>
                  <strong>Fecha de Corte:</strong>
                  {{ formatDate(subscriptionPlan.payDay) }}
                </p>
                <!-- Add subscription buttons -->
                <div class="mt-3 d-flex gap-2 flex-wrap">
                  <button
                    v-if="!subscriptionPlan.paymentUploaded"
                    class="btn btn-theme-warning"
                    @click="openPaymentModal"
                  >
                    <i class="fas fa-money-bill me-2"></i>Notificar Pago
                  </button>
                  <button
                    v-if="
                      subscriptionPlan.paymentUploaded &&
                      subscriptionPlan.paymentUrl
                    "
                    class="btn btn-theme-success"
                    @click="openImgModal"
                  >
                    <i class="fas fa-receipt me-2"></i>Ver Comprobante
                  </button>
                  <router-link to="/suscripciones" class="btn btn-theme-info">
                    <i class="fas fa-arrow-up me-2"></i>Cambiar Plan
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Verification Modal -->
    <div class="modal fade" id="verifyModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              Verificar {{ verifyingField === "email" ? "Correo" : "Teléfono" }}
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>
          <div class="modal-body">
            <p>
              Se ha enviado un código de verificación a tu
              {{
                verifyingField === "email" ? "correo" : "correo electrónico"
              }}.
            </p>
            <div class="form-group">
              <label class="form-label"
                >Ingresa el código de verificación:</label
              >
              <input
                type="text"
                v-model="emailVerificationCode"
                class="form-control"
                maxlength="6"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Cerrar
            </button>
            <button type="button" class="btn btn-primary" @click="verifyCode(this.userId, this.emailVerificationCode)">
              Verificar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <NotifyPaymentModal
      :user-id="userId"
      :role="role"
      :selected-plan="subscriptionPlan"
      :exchange="exchange"
      ref="paymentModal"
      @submit-payment="notifyPayment"
      @close="$refs.paymentModal.closeModal()"
    />

    <!-- Payment capture Modal -->
    <div class="modal fade" id="imgModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Comprobante de Pago</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>
          <div class="modal-body text-center">
            <img :src="modalImageUrl" alt="comprobante" class="img-fluid" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#recaptcha-container {
  transform: scale(0.9);
  transform-origin: 0 0;
  margin-bottom: 0.5rem;
}
.text-theme {
  color: var(--accent-color);
}

/* Update the card styles */
.section-card {
  background-color: #2d2d2d !important; /* Override any other background colors */
  border: 1px solid var(--border-color);
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.section-card:hover {
  transform: none; /* Remove hover effect */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Update the container styles */
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
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
.section-card + .section-card {
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
  0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
}

.alert-warning {
  background-color: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.3);
  color: #ffc107;
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

/* Add these styles to make the verification UI more user-friendly */
.phone-verification-notice {
  border-radius: 8px;
  overflow: hidden;
}

.btn-outline-warning {
  color: #ffc107;
  border-color: #ffc107;
}

.btn-outline-warning:hover {
  color: #212529;
  background-color: #ffc107;
  border-color: #ffc107;
}

.alert-info {
  background-color: rgba(13, 202, 240, 0.1);
  border-color: rgba(13, 202, 240, 0.2);
  color: #0dcaf0;
}

#recaptcha-container {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;
}

.verification-code-container {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
}

.verification-code-container .form-label {
  font-weight: 500;
}

/* Fine-tune the input group styles to ensure perfect alignment */
.d-flex.align-items-center.gap-2 {
  display: flex;
  flex-wrap: nowrap;
  gap: 0 !important; /* Remove any gap */
}

.d-flex.align-items-center.gap-2 .form-control {
  flex: 1;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  margin-right: 0;
  position: relative;
  z-index: 1;
  height: 38px; /* Explicitly set height to match buttons */
}

.d-flex.align-items-center.gap-2 .btn,
.d-flex.align-items-center.gap-2 .badge {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: -1px; /* Create overlap for borders */
  height: 38px !important; /* Force exact same height as inputs */
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  z-index: 2; /* Place above the input for proper border overlap */
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

/* Specific styles for verification buttons */
.btn-outline-warning,
.btn-outline-primary {
  line-height: 38px; /* Match the height */
  min-width: 100px; /* Ensure buttons have reasonable width */
  padding: 0 0.75rem !important; /* Override padding to use line-height instead */
}

/* Badge styles for verified status */
.badge.bg-success {
  line-height: 38px; /* Match the height */
  padding: 0 0.75rem !important; /* Override padding to use line-height instead */
  margin-left: -1px;
  font-weight: normal;
  font-size: 0.875rem;
}

/* Ensure content is vertically centered */
.btn i, .badge i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>