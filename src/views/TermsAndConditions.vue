<template>
    <div class="terms-conditions-container">
        <div class="content-wrapper">
            <h1 class="page-title">Términos y Condiciones de Rose Coupon</h1>
            <p class="last-updated">Última actualización: Febrero 2025</p>

            <section class="terms-section">
                <h2 class="section-title">
                    <i class="fas fa-info-circle"></i>
                    1. Introducción
                </h2>
                <p>
                    Rose Coupon es una plataforma innovadora que conecta comercios con clientes, 
                    ofreciendo descuentos y beneficios exclusivos que mejoran la experiencia de compra.
                </p>
            </section>

            <section class="terms-section">
                <h2 class="section-title">
                    <i class="fas fa-user-shield"></i>
                    2. Uso de la Plataforma
                </h2>
                <ul>
                    <li>Los usuarios deben proporcionar información precisa y actualizada</li>
                    <li>Queda prohibido el uso fraudulento o malicioso de la plataforma</li>
                    <li>Rose Coupon se reserva el derecho de suspender cuentas que violen estos términos</li>
                    <li>El incumplimiento de estas normas puede resultar en la cancelación de la cuenta</li>
                </ul>
            </section>

            <section class="terms-section">
                <h2 class="section-title">
                    <i class="fas fa-lock"></i>
                    3. Privacidad
                </h2>
                <p>
                    Respetamos tu privacidad. Los datos personales se manejarán conforme a nuestra 
                    Política de Privacidad, garantizando la confidencialidad y seguridad de tu información.
                </p>
            </section>

            <section class="terms-section">
                <h2 class="section-title">
                    <i class="fas fa-ticket-alt"></i>
                    4. Cupones y Promociones
                </h2>
                <ul>
                    <li>Los cupones tienen términos y condiciones específicos</li>
                    <li>Rose Coupon no garantiza la disponibilidad permanente de promociones</li>
                    <li>Los comercios son responsables de los términos de sus cupones</li>
                    <li>Las promociones pueden modificarse sin previo aviso</li>
                </ul>
            </section>

            <section class="terms-section">
                <h2 class="section-title">
                    <i class="fas fa-balance-scale"></i>
                    5. Responsabilidad
                </h2>
                <p>
                    Rose Coupon actúa como intermediario. No nos hacemos responsables de la calidad 
                    de productos o servicios ofrecidos por los comercios afiliados. Recomendamos 
                    siempre verificar los detalles de cada oferta antes de realizar una compra.
                </p>
            </section>

            <section class="terms-section">
                <h2 class="section-title">
                    <i class="fas fa-edit"></i>
                    6. Modificaciones
                </h2>
                <p>
                    Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                    Las modificaciones serán notificadas a través de la plataforma y entrarán 
                    en vigor inmediatamente después de su publicación.
                </p>
            </section>

            <section class="terms-section contact-section">
                <h2 class="section-title">
                    <i class="fas fa-envelope"></i>
                    Contacto
                </h2>
                <div class="contact-info">
                    <p>
                        Si tienes preguntas o necesitas ayuda, puedes escribirnos a:
                    </p>
                    <p>
                        <strong>Correo electrónico:</strong> 
                        <a href="mailto:soporte@rosecoupon.com">soporte@rosecoupon.com</a>
                    </p>
                </div>
            </section>

            <div class="disclaimer">
                <p>
                    Al utilizar Rose Coupon, aceptas estos términos y condiciones. 
                    Te recomendamos leerlos detenidamente.
                </p>
            </div>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';

export default defineComponent({
  name: 'TermsAndConditions',
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
.terms-conditions-container {
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

.terms-section {
    margin-bottom: 2rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    transition: background-color 0.3s ease;
}

.terms-section:hover {
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