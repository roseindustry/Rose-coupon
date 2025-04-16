<template>
  <div class="container py-4">
    <h1 class="text-center mb-4">Términos y Condiciones</h1>

    <section class="mb-4">
      <h5>1. Introducción</h5>
      <p>
        Bienvenido a nuestra aplicación. Al utilizar nuestros servicios, usted acepta los presentes Términos y
        Condiciones. Nuestra plataforma permite a los usuarios obtener cupones de descuento y realizar compras en cuotas
        para ahorrar dinero.
      </p>
    </section>

    <section class="mb-4">
      <h5>2. Elegibilidad</h5>
      <p>
        Para utilizar esta aplicación, debe tener al menos 18 años y residir en un área donde nuestros servicios estén
        disponibles.
      </p>
    </section>

    <section class="mb-4">
      <h5>3. Registro de Cuenta</h5>
      <p>
        Los usuarios son responsables de proporcionar información veraz al registrarse. No está permitido compartir
        credenciales de acceso con terceros.
      </p>
    </section>

    <section class="mb-4">
      <h5>4. Cupones</h5>
      <p>
        Los cupones ofrecidos en la plataforma son personales, intransferibles y pueden tener restricciones específicas
        según cada comercio afiliado. La vigencia de los cupones puede variar, y es responsabilidad del usuario
        utilizarlos antes de su vencimiento.
      </p>
    </section>

    <section class="mb-4">
      <h5>5. Pagos en Cuotas</h5>
      <p>
        Algunas compras pueden ser realizadas a través de pagos en cuotas, un servicio exclusivo que te ofrece Rose
        Coupon. Las condiciones, fechas de pago y consecuencias por pagos atrasados pueden resultar en la eliminación de
        la cuenta de usuario y baneo de nuestros servicios en el futuro. Los usuarios deben asegurarse de que los pagos
        en cuotas sean realizados de manera segura y que los datos de pago sean veraz.
      </p>
    </section>

    <section class="mb-4">
      <h5>6. Responsabilidades del Usuario</h5>
      <p>
        El usuario se compromete a hacer uso correcto de la plataforma, no cometer fraudes y respetar los términos de
        los cupones. El mal uso de la app puede resultar en la suspensión o eliminación de la cuenta.
      </p>
    </section>

    <section class="mb-4">
      <h5>7. Responsabilidad de los Comercios Afiliados</h5>
      <p>
        Cada comercio afiliado es responsable por la calidad de los productos y servicios ofrecidos, así como por
        cumplir con las condiciones de los cupones o pagos en cuotas que ofrece.
      </p>
    </section>

    <section class="mb-4">
      <h5>8. Limitación de Responsabilidad</h5>
      <p>
        No nos hacemos responsables por pérdidas de cupones, fallas en transacciones o cualquier inconveniente
        relacionado directamente con los comercios afiliados.
      </p>
    </section>

    <section class="mb-4">
      <h5>9. Modificaciones</h5>
      <p>
        Nos reservamos el derecho de actualizar estos Términos y Condiciones en cualquier momento. Notificaremos a los
        usuarios en caso de cambios importantes.
      </p>
    </section>

    <section class="mb-4">
      <h5>10. Contacto</h5>
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