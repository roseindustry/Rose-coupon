import { ref } from "vue";
import { auth, db } from "@/firebase/init";
import { ref as dbRef, update } from "firebase/database";
import { PhoneAuthProvider, signInWithPhoneNumber } from "firebase/auth";
import { toast } from "@/utils/toast";
import Swal from "sweetalert2";
import { Modal } from "bootstrap";

export function useVerification() {
  const emailCode = ref("");
  const phoneCode = ref("");
  const isEmailSending = ref(false);
  const isPhoneSending = ref(false);
  const isVerifying = ref(false);
  const emailStatus = ref(null);
  const phoneStatus = ref(null);
  const isEmailVerified = ref(false);
  const isPhoneVerified = ref(false);
  const verificationId = ref(null);
  const emailCodeSent = ref(false);
  const phoneCodeSent = ref(false);
  const verifyingField = ref(null);
  const verifyModal = ref(null);

  // Test methods for development
  const testSendEmailCode = async () => {
    try {
      isEmailSending.value = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      emailStatus.value = {
        type: "alert-success",
        message: "Código de prueba enviado: 123456",
      };
      emailCodeSent.value = true;
      emailCode.value = "123456";
    } catch (error) {
      console.error("Test error:", error);
      emailStatus.value = {
        type: "alert-danger",
        message: "Error de prueba al enviar el código",
      };
    } finally {
      isEmailSending.value = false;
    }
  };
  const testSendPhoneCode = async () => {
    try {
      isPhoneSending.value = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      phoneStatus.value = {
        type: "alert-success",
        message: "Código de prueba enviado: 654321",
      };
      phoneCodeSent.value = true;
      phoneCode.value = "654321";
    } catch (error) {
      console.error("Test error:", error);
      phoneStatus.value = {
        type: "alert-danger",
        message: "Error de prueba al enviar el código",
      };
    } finally {
      isPhoneSending.value = false;
    }
  };

  const testVerifyEmailCode = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (emailCode.value === "123456") {
        isEmailVerified.value = true;
        emailStatus.value = {
          type: "alert-success",
          message: "Correo electrónico verificado correctamente",
        };
      } else {
        throw new Error("Código incorrecto");
      }
    } catch (error) {
      console.error("Test error:", error);
      emailStatus.value = {
        type: "alert-danger",
        message: "Error de prueba al verificar el código",
      };
    }
  };
  const testVerifyPhoneCode = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (phoneCode.value === "654321") {
        isPhoneVerified.value = true;
        phoneStatus.value = {
          type: "alert-success",
          message: "Teléfono verificado correctamente",
        };
      } else {
        throw new Error("Código incorrecto");
      }
    } catch (error) {
      console.error("Test error:", error);
      phoneStatus.value = {
        type: "alert-danger",
        message: "Error de prueba al verificar el código",
      };
    }
  };

  // Real implementation methods
  const sendEmailCode = async (client) => {
    try {
      isEmailSending.value = true;
      verifyingField.value = "email";

      const modal = document.getElementById("verifyModal");
      const hasModal = modal && typeof Modal !== "undefined";

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(client.email)) {
        throw new Error("Por favor ingresa un correo electrónico válido");
      }

      const response = await fetch(
        `https://us-central1-rose-app-e062e.cloudfunctions.net/sendVerificationCode?id=${client.id}&email=${client.email}&firstName=${client.firstName}&lastName=${client.lastName}&type=email&newValue=${client.email}`
      );
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(result.message);
        }
        throw new Error(
          result.message ||
            `Error ${response.status}: Error al enviar el código`
        );
      }

      if (result && result.success) {
        // Show verification modal if applicable
        if (hasModal) {
          verifyModal.value = new Modal(modal);
          verifyModal.value.show();
        }

        emailStatus.value = {
          type: "alert-success",
          message: "Código enviado correctamente",
        };
        emailCodeSent.value = true;

        // Show remaining attempts if provided
        if (result.rateLimit?.remainingAttempts) {
          toast.info(
            `Te quedan ${result.rateLimit.remainingAttempts} intentos para hoy`
          );
        }
      } else {
        throw new Error(result.message || "Error al enviar el código");
      }
    } catch (error) {
      console.error("Error sending email code:", error);
      emailStatus.value = {
        type: "alert-danger",
        message: error.message || "Error al enviar el código",
      };
      toast.error(error.message || "Error al enviar el código");
    } finally {
      isEmailSending.value = false;
    }
  };
  const sendPhoneCode = async (client, recaptchaVerifier) => {
    try {
      isPhoneSending.value = true;
      verifyingField.value = "phone";

      const modal = document.getElementById("verifyModal");
      const hasModal = modal && typeof Modal !== "undefined";

      if (!recaptchaVerifier) {
        throw new Error("reCAPTCHA no inicializado");
      }

      // Format phone number for international format
      let rawPhone = client.phoneNumber.replace(/\D/g, "");
      let formattedPhone = client.phoneNumber;

      // Format for Firebase Auth
      if (formattedPhone.startsWith("04")) {
        // Venezuelan format (starts with 04)
        formattedPhone = "+58" + formattedPhone;
      } else if (formattedPhone.startsWith("55")) {
        // Brazilian format (starts with country code)
        formattedPhone = "+" + formattedPhone;
      } else if (!formattedPhone.startsWith("+")) {
        // Default to Venezuelan format if no country code
        formattedPhone = "+58" + formattedPhone;
      }

      // 1. Check rate limit with cloud function
      const res = await fetch(
        "https://us-central1-rose-app-e062e.cloudfunctions.net/sendPhoneRateLimitCheck",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: client.id, phone: rawPhone }),
        }
      );

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || "Error al validar el número");

      // 2. Send SMS using Firebase Auth (client-side)
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifier
      );
      verificationId.value = confirmationResult.verificationId;

      if (result && result.success) {
        // Show verification modal if applicable
        if (hasModal) {
          verifyModal.value = new Modal(modal);
          verifyModal.value.show();
        }

        phoneStatus.value = {
          type: "alert-success",
          message: "Código enviado correctamente",
        };
        phoneCodeSent.value = true;

        // Show remaining attempts if provided
        if (result.rateLimit?.remainingAttempts) {
          toast.info(
            `Te quedan ${result.rateLimit.remainingAttempts} intentos para hoy`
          );
        }

        toast.success(
          "Código de verificación enviado. Por favor revise sus mensajes."
        );
      } else {
        throw new Error(result.message || "Error al enviar el código");
      }
    } catch (error) {
      console.error("Error sending phone code:", error);
      phoneStatus.value = {
        type: "alert-danger",
        message: error.message || "Error al enviar el código de verificación",
      };
      throw error;
    } finally {
      isPhoneSending.value = false;
    }
  };

  const verifyEmailCode = async (client) => {
    try {
      isVerifying.value = true;
      if (!emailCode.value) {
        throw new Error("Por favor, ingrese el código de verificación");
      }

      const response = await fetch(
        "https://us-central1-rose-app-e062e.cloudfunctions.net/verifyCode",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: client.id,
            code: emailCode.value,
            type: "email",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al verificar el código");
      }

      const userRef = dbRef(db, `Users/${client.id}`);
      await update(userRef, {
        emailVerified: true,
      });

      isEmailVerified.value = true;
      emailStatus.value = {
        type: "alert-success",
        message: "Correo electrónico verificado correctamente",
      };

      // Close modal and show success message
      if (verifyModal.value) {
        verifyModal.value.hide();
      }

      Swal.fire({
        icon: "success",
        title: "Correo electrónico verificado correctamente",
        showConfirmButton: false,
        timer: 1500,
      });

      // Reset state
      emailCode.value = "";
      emailCodeSent.value = false;
    } catch (error) {
      console.error("Error verifying email code:", error);
      emailStatus.value = {
        type: "alert-danger",
        message: error.message || "Error al verificar el código",
      };
      Swal.fire({
        icon: "error",
        title: "Código de verificación inválido",
        text: "Por favor, inténtelo de nuevo.",
        showConfirmButton: true,
      });
    } finally {
      isVerifying.value = false;
    }
  };
  const verifyPhoneCode = async (client) => {
    try {
      isVerifying.value = true;
      if (!phoneCode.value || !verificationId.value) {
        throw new Error("Faltan datos para verificar el teléfono");
      }

      const credential = PhoneAuthProvider.credential(
        verificationId.value,
        phoneCode.value
      );
      //   await signInWithCredential(auth, credential);

      // Send backend request to mark phone as verified
      const response = await fetch(
        "https://us-central1-rose-app-e062e.cloudfunctions.net/verifyCode",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: client.id,
            code: phoneCode.value,
            type: "phone",
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Error al verificar el código");
      }

      if (result && result.success) {
        isPhoneVerified.value = true;
        phoneStatus.value = {
          type: "alert-success",
          message: "Teléfono verificado correctamente",
        };

        // Close modal and show success message
        if (verifyModal.value) {
          verifyModal.value.hide();
        }

        Swal.fire({
          icon: "success",
          title: "Teléfono verificado correctamente",
          showConfirmButton: false,
          timer: 1500,
        });

        // Reset state
        phoneCode.value = "";
        phoneCodeSent.value = false;
        verificationId.value = null;
      } else {
        throw new Error(result.message || "Código de verificación inválido");
      }
    } catch (error) {
      console.error("Error verifying phone code:", error);
      phoneStatus.value = {
        type: "alert-danger",
        message: error.message || "Error al verificar el código",
      };
      Swal.fire({
        icon: "error",
        title: "Código de verificación inválido",
        text: "Por favor, inténtelo de nuevo.",
        showConfirmButton: true,
      });
      throw error;
    } finally {
      isVerifying.value = false;
    }
  };

  return {
    // State
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

    // Methods
    sendEmailCode,
    sendPhoneCode,
    verifyEmailCode,
    verifyPhoneCode,

    // Test methods
    testSendEmailCode,
    testSendPhoneCode,
    testVerifyEmailCode,
    testVerifyPhoneCode,
  };
}
