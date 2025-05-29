<template>
    <div class="modal fade" id="verificationModal" tabindex="-1" aria-labelledby="verificationModalLabel"
        aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark">
                <div class="modal-header border-secondary">
                    <h5 class="modal-title text-light" id="verificationModalLabel">
                        <i class="fas fa-shield-check me-2"></i>
                        Verificación de Contacto
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"
                        @click="handleClose"></button>
                </div>
                <div class="modal-body">
                    <!-- reCAPTCHA Container -->
                    <div id="recaptcha-container"></div>

                    <!-- Email Verification -->
                    <div class="verification-section mb-4">
                        <h6 class="text-light mb-3">
                            <i class="fas fa-envelope me-2"></i>
                            Verificación de Email
                        </h6>

                        <div v-if="client.email" class="mb-2">
                            Enviar a: {{ client.email }}
                        </div>

                        <div v-if="!isEmailVerified" class="email-verification-container">
                            <div class="input-group mb-3">
                                <input type="text" class="form-control bg-dark text-light border-secondary"
                                    v-model="emailCode" placeholder="Ingrese el código de verificación" />
                                <button class="btn" :class="{
                                    'btn-theme': !emailCodeSent,
                                    'btn-success': emailCodeSent
                                }" @click="emailCodeSent ? handleVerifyEmailCode() : handleSendEmailCode()"
                                    :disabled="isEmailSending || isEmailVerified">
                                    <span v-if="isEmailSending" class="spinner-border spinner-border-sm"
                                        role="status"></span>
                                    <span v-else>{{ emailCodeSent ? 'Verificar' : 'Enviar' }}</span>
                                </button>
                            </div>

                            <small>Recuerda presionar el botón de "Enviar" código de verificación y esperar a que se
                                envíe el código.</small>
                            <div v-if="emailStatus" :class="['alert', emailStatus.type]">
                                {{ emailStatus.message }}
                            </div>
                        </div>
                        <div v-else class="email-verified-container d-flex align-items-center">
                            <i class="fas fa-check-circle text-success me-2 fs-4"></i>
                            <p class="text-success mb-0 fw-bold">Email verificado correctamente</p>
                        </div>
                    </div>

                    <!-- Phone Verification -->
                    <div class="verification-section">
                        <h6 class="text-light mb-3">
                            <i class="fas fa-phone me-2"></i>
                            Verificación de Teléfono
                        </h6>

                        <div v-if="client.phoneNumber" class="mb-2">
                            Enviar a: {{ client.phoneNumber }}
                        </div>

                        <div v-if="!isPhoneVerified" class="phone-verification-wrapper">
                            <div class="input-group mb-3">
                                <input type="text" class="form-control bg-dark text-light border-secondary"
                                    v-model="phoneCode" placeholder="Ingrese el código de verificación" />
                                <button class="btn" :class="{
                                    'btn-theme': !phoneCodeSent,
                                    'btn-success': phoneCodeSent
                                }" @click="phoneCodeSent ? handleVerifyPhoneCode() : handleSendPhoneCode()"
                                    :disabled="isPhoneSending || isPhoneVerified">
                                    <span v-if="isPhoneSending" class="spinner-border spinner-border-sm"
                                        role="status"></span>
                                    <span v-else>{{ phoneCodeSent ? 'Verificar' : 'Enviar' }}</span>
                                </button>
                            </div>

                            <small>Recuerda presionar el botón de "Enviar" código de verificación y esperar a que se
                                envíe el código.</small>
                            <div v-if="phoneStatus" :class="['alert', phoneStatus.type]">
                                {{ phoneStatus.message }}
                            </div>
                        </div>
                        <div v-else class="phone-verified-container d-flex align-items-center">
                            <i class="fas fa-check-circle text-success me-2 fs-4"></i>
                            <p class="text-success mb-0 fw-bold">Teléfono verificado correctamente</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-secondary">
                    <button type="button" class="btn btn-outline-light" @click="skipVerification">
                        Omitir
                    </button>
                    <button type="button" class="btn btn-theme" @click="proceedToNextStep"
                        :disabled="!isEmailVerified && !isPhoneVerified">
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import { Modal } from 'bootstrap';
import { useVerification } from '@/composables/useVerification';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/firebase/init';
import { toast } from '@/utils/toast';

export default defineComponent({
    name: 'VerificationModal',
    props: {
        client: {
            type: Object,
            required: true
        }
    },
    setup() {
        const {
            emailCode,
            phoneCode,
            isEmailSending,
            isPhoneSending,
            emailStatus,
            phoneStatus,
            isEmailVerified,
            isPhoneVerified,
            emailCodeSent,
            phoneCodeSent,
            sendEmailCode,
            sendPhoneCode,
            verifyEmailCode,
            verifyPhoneCode,
            testSendEmailCode,
            testSendPhoneCode,
            testVerifyEmailCode,
            testVerifyPhoneCode
        } = useVerification();

        return {
            emailCode,
            phoneCode,
            isEmailSending,
            isPhoneSending,
            emailStatus,
            phoneStatus,
            isEmailVerified,
            isPhoneVerified,
            emailCodeSent,
            phoneCodeSent,
            sendEmailCode,
            sendPhoneCode,
            verifyEmailCode,
            verifyPhoneCode,
            testSendEmailCode,
            testSendPhoneCode,
            testVerifyEmailCode,
            testVerifyPhoneCode
        };
    },
    data() {
        return {
            modal: null,
            recaptchaVerifier: null
        }
    },
    methods: {
        initRecaptcha() {
            console.log('Initializing reCAPTCHA in modal');

            if (this.recaptchaVerifier) {
                console.log('Clearing existing reCAPTCHA verifier');
                this.recaptchaVerifier.clear();
                this.recaptchaVerifier = null;
            }

            try {
                const container = document.getElementById('recaptcha-container');

                if (!container) {
                    console.error('reCAPTCHA container not found');
                    return;
                }

                console.log('Creating new RecaptchaVerifier');
                this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => {
                        console.log('reCAPTCHA verified');
                    },
                    'expired-callback': () => {
                        console.log('reCAPTCHA expired');
                        this.recaptchaVerifier = null;
                        toast.error('El captcha ha expirado. Por favor, inténtelo de nuevo.');
                    }
                });
            } catch (error) {
                console.error('Error initializing reCAPTCHA:', error);
                toast.error('Error al inicializar reCAPTCHA. Por favor, recargue la página.');
            }
        },
        show() {
            if (!this.modal) {
                this.modal = new Modal(document.getElementById('verificationModal'));
            }
            this.modal.show();

            // Initialize reCAPTCHA after modal is shown and DOM is updated
            this.$nextTick(() => {
                setTimeout(() => {
                    this.initRecaptcha();
                }, 500); // Add a small delay to ensure modal is fully rendered
            });
        },
        hide() {
            if (this.modal) {
                this.modal.hide();
            }
        },
        handleClose() {
            this.hide();
            this.$emit('skip-verification');
        },
        skipVerification() {
            this.$emit('skip-verification');
            this.hide();
        },
        proceedToNextStep() {
            if (!this.isEmailVerified && !this.isPhoneVerified) {
                return;
            }

            this.$emit('verification-complete', {
                emailVerified: this.isEmailVerified,
                phoneVerified: this.isPhoneVerified,
                client: this.client
            });
            this.hide();
        },

        // Real logic
        async handleSendEmailCode() {
            try {
                await this.sendEmailCode(this.client);
            } catch (error) {
                console.error('Error sending email code:', error);
                toast.error(error.message || 'Error al enviar el código de verificación');
            }
        },
        async handleSendPhoneCode() {
            try {
                await this.sendPhoneCode(this.client, this.recaptchaVerifier);
            } catch (error) {
                console.error('Error sending phone code:', error);
                toast.error(error.message || 'Error al enviar el código de verificación');
            }
        },

        async handleVerifyEmailCode() {
            try {
                await this.verifyEmailCode(this.client);
            } catch (error) {
                console.error('Error verifying email code:', error);
                toast.error(error.message || 'Error al verificar el código de verificación');
            }
        },
        async handleVerifyPhoneCode() {
            try {
                await this.verifyPhoneCode(this.client);
            } catch (error) {
                console.error('Error verifying phone code:', error);
                toast.error(error.message || 'Error al verificar el código de verificación');
            }
        },

        // Testing logic
        async testSendEmailCode() {
            try {
                await this.testSendEmailCode();
            } catch (error) {
                console.error('Error sending email code:', error);
                toast.error(error.message || 'Error al enviar el código de verificación');
            }
        },
        async testSendPhoneCode() {
            try {
                await this.testSendPhoneCode();
            } catch (error) {
                console.error('Error sending phone code:', error);
                toast.error(error.message || 'Error al enviar el código de verificación');
            }
        },
        async testVerifyEmailCode() {
            try {
                await this.testVerifyEmailCode();
            } catch (error) {
                console.error('Error verifying email code:', error);
                toast.error(error.message || 'Error al verificar el código de verificación');
            }
        },
        async testVerifyPhoneCode() {
            try {
                await this.testVerifyPhoneCode();
            } catch (error) {
                console.error('Error verifying phone code:', error);
                toast.error(error.message || 'Error al verificar el código de verificación');
            }
        }
    },
    mounted() {
        this.modal = new Modal(document.getElementById('verificationModal'));
        this.$emit('mounted');
    },
    beforeUnmount() {
        if (this.recaptchaVerifier) {
            this.recaptchaVerifier.clear();
        }
    }
});
</script>

<style scoped>
.modal-content {
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
    padding: 1rem 1.5rem;
}

.modal-body {
    padding: 1.5rem;
}

.modal-footer {
    padding: 1rem 1.5rem;
}

.verification-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1rem;
}

.alert {
    margin-bottom: 0;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
}

.alert-success {
    background-color: rgba(40, 167, 69, 0.15);
    border-color: rgba(40, 167, 69, 0.3);
    color: #28a745;
}

.alert-danger {
    background-color: rgba(220, 53, 69, 0.15);
    border-color: rgba(220, 53, 69, 0.3);
    color: #dc3545;
}

@media (max-width: 576px) {
    .modal-dialog {
        margin: 0.5rem;
    }

    .verification-section {
        padding: 0.75rem;
    }
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