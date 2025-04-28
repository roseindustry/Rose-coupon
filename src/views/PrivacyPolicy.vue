<template>
    <div class="privacy-policy-container">
        <div class="content-wrapper">
            <h1 class="page-title">Política de Privacidad de Rose Coupon</h1>
            <p class="last-updated">Última actualización: Junio 2024</p>

            <section class="policy-section">
                <h2 class="section-title">
                    <i class="fas fa-shield-alt"></i>
                    Introducción
                </h2>
                <p>
                    En Rose Coupon, nos comprometemos a proteger tu privacidad. Esta política explica cómo 
                    recopilamos, usamos, almacenamos y protegemos tu información personal.
                </p>
            </section>

            <section class="policy-section">
                <h2 class="section-title">
                    <i class="fas fa-info-circle"></i>
                    Información que Recopilamos
                </h2>
                <ul>
                    <li>Nombre completo</li>
                    <li>Dirección de correo electrónico</li>
                    <li>Número de teléfono</li>
                    <li>Información de identificación</li>
                    <li>Datos de transacciones y compras</li>
                    <li>Información de ubicación</li>
                </ul>
            </section>

            <section class="policy-section">
                <h2 class="section-title">
                    <i class="fas fa-lock"></i>
                    Cómo Usamos tu Información
                </h2>
                <ul>
                    <li>Procesar transacciones y pagos</li>
                    <li>Personalizar tu experiencia de usuario</li>
                    <li>Comunicar promociones y actualizaciones</li>
                    <li>Mejorar nuestros servicios</li>
                    <li>Cumplir obligaciones legales</li>
                </ul>
            </section>

            <section class="policy-section">
                <h2 class="section-title">
                    <i class="fas fa-share-alt"></i>
                    Compartir Información
                </h2>
                <p>
                    No vendemos ni alquilamos información personal. Podemos compartir datos con:
                </p>
                <ul>
                    <li>Proveedores de servicios autorizados</li>
                    <li>Autoridades legales cuando sea requerido</li>
                    <li>Comercios afiliados para procesar cupones</li>
                </ul>
            </section>

            <section class="policy-section">
                <h2 class="section-title">
                    <i class="fas fa-user-shield"></i>
                    Tus Derechos
                </h2>
                <p>Tienes derecho a:</p>
                <ul>
                    <li>Acceder a tu información personal</li>
                    <li>Solicitar corrección de datos</li>
                    <li>Solicitar eliminación de cuenta</li>
                    <li>Oponerte al procesamiento de datos</li>
                    <li>Retirar consentimiento en cualquier momento</li>
                </ul>
            </section>

            <section class="policy-section">
                <h2 class="section-title">
                    <i class="fas fa-lock-open"></i>
                    Seguridad de Datos
                </h2>
                <p>
                    Implementamos medidas de seguridad técnicas y organizativas para proteger 
                    tu información personal contra acceso no autorizado, alteración, divulgación o destrucción.
                </p>
            </section>

            <section class="policy-section">
                <h2 class="section-title">
                    <i class="fas fa-cookie"></i>
                    Uso de Cookies
                </h2>
                <p>
                    Utilizamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar contenido. 
                    Puedes configurar tu navegador para rechazar cookies.
                </p>
            </section>

            <section class="policy-section contact-section">
                <h2 class="section-title">
                    <i class="fas fa-envelope"></i>
                    Contacto
                </h2>
                <p>
                    Para cualquier duda sobre esta política, contáctanos:
                </p>
                <div class="contact-info">
                    <p>
                        <strong>Correo electrónico:</strong> 
                        <a href="mailto:soporte@rosecoupon.com">soporte@rosecoupon.com</a>
                    </p>
                    <p>
                        <strong>Dirección:</strong> 
                        Maracaibo, Venezuela
                    </p>
                </div>
            </section>

            <div class="disclaimer">
                <p>
                    Rose Coupon se reserva el derecho de modificar esta política. 
                    Cualquier cambio será publicado en esta página.
                </p>
            </div>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';

export default defineComponent({
  name: 'PrivacyPolicy',
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
.privacy-policy-container {
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
    margin-bottom: 1rem;
    font-weight: 700;
    font-size: 2.5rem;
}

.last-updated {
    text-align: center;
    color: #6c757d;
    margin-bottom: 2rem;
    font-style: italic;
}

.policy-section {
    margin-bottom: 2rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    transition: background-color 0.3s ease;
}

.policy-section:hover {
    background-color: #f1f3f5;
}

.section-title {
    color: #6a1b9a;
    border-bottom: 2px solid #6a1b9a;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
}

.section-title i {
    margin-right: 0.75rem;
    color: #6a1b9a;
}

ul {
    list-style-type: none;
    padding-left: 1rem;
}

ul li {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.5rem;
}

ul li::before {
    content: '•';
    color: #6a1b9a;
    position: absolute;
    left: 0;
}

.contact-section {
    background-color: #f0e6f6;
}

.contact-info a {
    color: #6a1b9a;
    text-decoration: none;
    transition: color 0.3s ease;
}

.contact-info a:hover {
    color: #4a148c;
    text-decoration: underline;
}

.disclaimer {
    background-color: #ffebee;
    border-left: 4px solid #d32f2f;
    padding: 1rem;
    margin-top: 2rem;
    font-size: 0.9rem;
    color: #333;
}

@media (max-width: 768px) {
    .content-wrapper {
        padding: 1.5rem;
    }

    .page-title {
        font-size: 2rem;
    }

    .section-title {
        font-size: 1.2rem;
    }
}
</style>
