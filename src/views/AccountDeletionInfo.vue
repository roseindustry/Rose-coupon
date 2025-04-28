<template>
    <div class="account-deletion-container">
        <div class="content-wrapper">
            <h1 class="page-title">Cómo Eliminar Tu Cuenta</h1>
            
            <div class="info-section">
                <div class="icon-wrapper">
                    <i class="fas fa-user-times"></i>
                </div>
                <p>
                    Puedes solicitar la eliminación de tu cuenta desde la aplicación, dirigiéndote a la página de 
                    <strong>Perfil</strong> y haciendo clic en el botón 
                    <strong>"Solicitar Eliminación de Cuenta"</strong>.
                </p>
            </div>

            <div class="info-section">
                <div class="icon-wrapper">
                    <i class="fas fa-search"></i>
                </div>
                <p>
                    Las solicitudes de eliminación son revisadas manualmente. Si tienes pagos pendientes o 
                    suscripciones activas, tu cuenta será suspendida en lugar de eliminada hasta que 
                    se cumplan todas tus obligaciones.
                </p>
            </div>

            <div class="info-section">
                <div class="icon-wrapper">
                    <i class="fas fa-envelope"></i>
                </div>
                <p>
                    Si no puedes acceder a la aplicación, también puedes solicitar la eliminación de tu cuenta 
                    contactándonos por correo electrónico a: 
                    <a href="mailto:soporte@rosecoupon.com" class="contact-email">soporte@rosecoupon.com</a>
                </p>
            </div>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';

export default defineComponent({
  name: 'AccountDeleteInfo',
  async mounted() {
    const appOption = useAppOptionStore();

    appOption.appSidebarHide = true;
    appOption.appHeaderHide = true;
  },
  beforeUnmount() {
    const appOption = useAppOptionStore();
    appOption.appSidebarHide = false;
    appOption.appHeaderHide = false;
  }
});
</script>

<style scoped>
.account-deletion-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 2rem 0;
}

.content-wrapper {
    width: 800px;
    max-width: 95%;
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2.5rem;
    color: #333;
}

.page-title {
    text-align: center;
    color: #6a1b9a;
    margin-bottom: 2rem;
    font-weight: 700;
    font-size: 2.5rem;
}

.info-section {
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    transition: background-color 0.3s ease;
}

.info-section:hover {
    background-color: #f1f3f5;
}

.icon-wrapper {
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    background-color: #6a1b9a;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1.5rem;
    font-size: 1.5rem;
}

.info-section p {
    margin: 0;
    line-height: 1.6;
}

.contact-email {
    color: #6a1b9a;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.3s ease;
}

.contact-email:hover {
    color: #4a148c;
    text-decoration: underline;
}

.warning-section {
    background-color: #ffebee;
    border-left: 4px solid #d32f2f;
    padding: 1rem;
    margin-top: 2rem;
    display: flex;
    align-items: center;
    border-radius: 4px;
}

.warning-section i {
    color: #d32f2f;
    font-size: 1.5rem;
    margin-right: 1rem;
}

.warning-section p {
    margin: 0;
    color: #333;
    line-height: 1.6;
}

@media (max-width: 768px) {
    .info-section {
        flex-direction: column;
        text-align: center;
    }

    .icon-wrapper {
        margin-right: 0;
        margin-bottom: 1rem;
    }
}
</style>