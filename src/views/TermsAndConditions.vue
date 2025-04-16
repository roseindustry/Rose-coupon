<template>
  <div class="container py-4">

    <h5>Términos y Condiciones de Rose Coupon</h5>
    <p>Última actualización: Febrero 2025</p>

    <h6>1. Introducción</h6>
    <p>Rose Coupon es una plataforma que conecta comercios con clientes, ofreciendo descuentos y
      beneficios exclusivos.</p>

    <h6>2. Uso de la Plataforma</h6>
    <ul>
      <li>Los usuarios deben proporcionar información precisa y actualizada.</li>
      <li>Queda prohibido el uso fraudulento o malicioso de la plataforma.</li>
      <li>Rose Coupon se reserva el derecho de suspender cuentas que violen estos términos.</li>
    </ul>

    <h6>3. Privacidad</h6>
    <p>Respetamos tu privacidad. Los datos personales se manejarán conforme a nuestra Política de
      Privacidad.</p>

    <h6>4. Cupones y Promociones</h6>
    <ul>
      <li>Los cupones tienen términos y condiciones específicos.</li>
      <li>Rose Coupon no garantiza la disponibilidad permanente de promociones.</li>
      <li>Los comercios son responsables de los términos de sus cupones.</li>
    </ul>

    <h6>5. Responsabilidad</h6>
    <p>Rose Coupon actúa como intermediario. No nos hacemos responsables de la calidad de productos
      o servicios ofrecidos por los comercios afiliados.</p>

    <h6>6. Modificaciones</h6>
    <p>Nos reservamos el derecho de modificar estos términos. Las modificaciones serán notificadas a
      través de la plataforma.</p>

    <section class="mb-4">
      <h5>Contacto</h5>
      <p>
        Si tienes preguntas o necesitas ayuda, puedes escribirnos a <strong>soporte@rosecoupon.com</strong>.
      </p>
    </section>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';

export default defineComponent({
  name: 'Terms',
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
.container {
  max-width: 800px;
  margin: auto;
}
</style>