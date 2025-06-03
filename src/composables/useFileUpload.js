import { ref } from "vue";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { ref as dbRef, update, set } from "firebase/database";
import { storage, db } from "../firebase/init";
import Swal from "sweetalert2";
import moment from "moment";

export function useFileUpload() {
  const isUploading = ref(false);
  const errorMessage = ref("");
  const previewUrl = ref(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const validateImageFile = (file) => {
    if (!file) return { valid: false, message: "No file provided" };

    if (!file.type.startsWith("image/")) {
      return { valid: false, message: "Por favor, selecciona un archivo de imagen válido." };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, message: "El archivo es demasiado grande. Máximo 5MB permitido." };
    }

    return { valid: true };
  };

  const getPreviewURL = (file) => {
    return URL.createObjectURL(file);
  };

  const processFile = async (file) => {    
    const validation = validateImageFile(file);
    
    if (!validation.valid) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: validation.message,
        showConfirmButton: false,
        timer: 1500,
      });
      return null;
    }

    return getPreviewURL(file);
  };

  const base64ToFile = async (base64String, fileName) => {
    const res = await fetch(base64String);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
  };

  const uploadFile = async (file, type, userId) => {
    if (!file) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Por favor, selecciona un archivo de imagen válido.",
        showConfirmButton: false,
        timer: 1500,
      });
      return null;
    }

    const fileName = `${type === "selfie" ? "selfie" : `${type}-ID`}.${file.name.split(".").pop()}`;
    const fileRef = storageRef(
      storage,
      `verification-files/${userId}/${fileName}`
    );
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  const uploadPaymentFile = async (file, date, role, userId, userName) => {
    if (!file) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Por favor, selecciona un archivo de imagen válido.",
        showConfirmButton: false,
        timer: 1500,
      });
      return null;
    }
    const fileName = `${date}-capture.${file.name.split(".").pop()}`;
    const fileRef = storageRef(
      storage,
      `payment-captures/${role}/${userId}-${userName}/${fileName}`
    );

    // Upload the file and get the download URL
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  };

  // ID Verification submit
  const processVerification = async (files, userId) => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      isUploading.value = true;
      errorMessage.value = "";

      if (!files.front || !files.back || !files.selfie) {
        errorMessage.value =
          "Por favor, selecciona todos los archivos requeridos.";
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorMessage.value,
          showConfirmButton: false,
          timer: 1500,
        });
        return;
      }

      // Convert base64 to files
      const frontFile = await base64ToFile(files.front, "front-id.jpg");
      const backFile = await base64ToFile(files.back, "back-id.jpg");
      const selfieFile = await base64ToFile(files.selfie, "selfie.jpg");

      // Upload files to Firebase Storage
      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        uploadFile(frontFile, "front", userId),
        uploadFile(backFile, "back", userId),
        uploadFile(selfieFile, "selfie", userId),
      ]);

      // Update user document in realtime Database
      await update(dbRef(db, `Users/${userId}`), {
        "verificationFiles/Front-ID": frontUrl,
        "verificationFiles/Back-ID": backUrl,
        "verificationFiles/Selfie": selfieUrl,
        requestedVerification: true,
      });

      // Success message
      Swal.fire({
        icon: "success",
        title: "Documentos subidos exitosamente",
        showConfirmButton: false,
        timer: 1500,
      });

      return {
        success: true,
        data: { frontUrl, backUrl, selfieUrl },
      };
    } catch (error) {
      console.error("Error uploading documents:", error);
      errorMessage.value = error.message || "Error al subir los documentos";
      Swal.fire({
        icon: "error",
        title: "Error al subir los documentos",
        text: error.message,
        showConfirmButton: false,
        timer: 1500,
      });
      return {
        success: false,
        error,
      };
    } finally {
      isUploading.value = false;
    }
  };

  // Subscription payment submit
  const processPayment = async (userId,  paymentData, role, userName) => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      isUploading.value = true;
      errorMessage.value = "";

      // Correct the timezone issue
      const originalDate = new Date(paymentData.paymentDate);
      // Adjust the date to local timezone and set to start of the day
      const correctedDate = new Date(
        originalDate.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate()
      );
      // Convert to ISO string
      const paymentDate = correctedDate.toISOString();
      const formattedDate = paymentDate.split("T")[0];

      const { amountPaid, paymentFile, planId, isYearly } = paymentData;
      let payDay = null;

      // Calculate payDay
      if (isYearly) {
        payDay = moment().add(1, "year").toISOString();
      } else {
        payDay = moment().add(1, "month").toISOString();
      }

      if (!paymentFile) {
        errorMessage.value =
          "Por favor, selecciona un archivo de imagen válido.";
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorMessage.value,
          showConfirmButton: false,
          timer: 1500,
        });
        return;
      }

      // Upload files to Firebase Storage
      const [paymentUrl] = await Promise.all([
        uploadPaymentFile(paymentFile, formattedDate, role, userId, userName),
      ]);

      // Update subscription info
      const subscriptionData = {
        subscription_id: planId,
        lastPaymentDate: paymentDate,
        paymentUploaded: true,
        paymentVerified: false,
        paymentUrl: paymentUrl,
        amountPaid: amountPaid,
        payDay: payDay,
      };

      const userSubscriptionRef = dbRef(db, `Users/${userId}/subscription`);
      await update(userSubscriptionRef, subscriptionData);

      // Save the payment to the payments collection
      const paymentDetails = {
        subscription_id: planId,
        isYearly: isYearly || false,
        client_id: userId,
        amount: amountPaid,
        date: paymentDate,
        approved: false,
        paymentUrl: paymentUrl,
        type: "subscription",
      };

      const paymentRef = dbRef(db, `Payments/${userId}-${formattedDate}`);
      await set(paymentRef, paymentDetails);

      // Success message
      Swal.fire({
        title: '¡Comprobante enviado!',
        text: 'Nuestro equipo pronto evaluará tu pago.',
        icon: 'success',
        confirmButtonText: 'OK'
      });

      return {
        success: true,
        data: { paymentUrl },
      };
    } catch (error) {
      console.error("Error uploading payment file:", error);
      errorMessage.value = error.message || "Error al subir el archivo de pago";
      Swal.fire({
        icon: "error",
        title: "Error al subir el archivo de pago: " + error.message,
      });
    } finally {
      isUploading.value = false;
    }
  };

  return {
    isUploading,
    errorMessage,
    processFile,
    processVerification,
    processPayment,
  };
}