import { ref } from 'vue';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, update } from 'firebase/database';
import { storage, db } from '../firebase/init';
import Swal from 'sweetalert2';
import { sendEmail } from '@/utils/emailService';

export function useFileUpload() {
    const isUploading = ref(false);
    const errorMessage = ref('');

    const processFile = async (file, type) => {
        if (!file.type.startsWith('image/')) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor, selecciona un archivo de imagen válido.',
                showConfirmButton: false,
                timer: 1500
            });
            return null;
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };

    const base64ToFile = async (base64String, fileName) => {
        const res = await fetch(base64String);
        const blob = await res.blob();
        return new File([blob], fileName, { type: blob.type });
    };

    const uploadFile = async (file, type, userId) => {
        const fileName = `${type === 'selfie' ? 'selfie' : `${type}-ID`}.${file.name.split('.').pop()}`;
        const fileRef = storageRef(storage, `verification-files/${userId}/${fileName}`);
        await uploadBytes(fileRef, file);
        return getDownloadURL(fileRef);
    };

    // ID Verification submit
    const uploadVerificationFiles = async (files, userId) => {
        if (!userId) {
            throw new Error('User ID is required');
        }

        try {
            isUploading.value = true;
            errorMessage.value = '';

            if (!files.front || !files.back || !files.selfie) {
                errorMessage.value = 'Por favor, selecciona todos los archivos requeridos.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage.value,
                    showConfirmButton: false,
                    timer: 1500
                });
                return;
            }

            // Convert base64 to files
            const frontFile = await base64ToFile(files.front, 'front-id.jpg');
            const backFile = await base64ToFile(files.back, 'back-id.jpg');
            const selfieFile = await base64ToFile(files.selfie, 'selfie.jpg');

            // Upload files to Firebase Storage
            const [frontUrl, backUrl, selfieUrl] = await Promise.all([
                uploadFile(frontFile, 'front', userId),
                uploadFile(backFile, 'back', userId),
                uploadFile(selfieFile, 'selfie', userId)
            ]);

            // Update user document in realtime Database
            await update(dbRef(db, `Users/${userId}`), {
                'verificationFiles/Front-ID': frontUrl,
                'verificationFiles/Back-ID': backUrl,
                'verificationFiles/Selfie': selfieUrl,
                requestedVerification: true
            });

            // Send email notification
            const appUrl = 'https://app.rosecoupon.com';
            await sendEmail({
                to: 'roseindustry11@gmail.com',
                message: {
                    subject: "Usuario solicitó verificación",
                    text: `Hola administrador, un usuario ha solicitado verificación de identidad en Roseapp.
                    Para verificar el usuario, abre la app en el siguiente enlace: ${appUrl}`,
                    html: `<p>Hola administrador,</p>
                    <p>Un usuario ha solicitado verificación de identidad en Roseapp.</p>
                    <p>Para verificar el usuario, por favor <a href="${appUrl}" target="_blank">abre la app</a>.</p>`
                },
            });

            Swal.fire({
                icon: 'success',
                title: 'Documentos subidos exitosamente',
                showConfirmButton: false,
                timer: 1500
            });

            return {
                success: true,
                data: { frontUrl, backUrl, selfieUrl }
            };
        } catch (error) {
            console.error('Error uploading documents:', error);
            errorMessage.value = error.message || 'Error al subir los documentos';
            Swal.fire({
                icon: 'error',
                title: 'Error al subir los documentos',
                text: error.message,
                showConfirmButton: false,
                timer: 1500
            });
            return {
                success: false,
                error
            };
        } finally {
            isUploading.value = false;
        }
    };

    return {
        isUploading,
        errorMessage,
        processFile,
        uploadVerificationFiles
    };
} 