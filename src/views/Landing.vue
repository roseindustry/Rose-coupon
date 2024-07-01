<script>
import { defineComponent } from 'vue';
import { RouterLink } from 'vue-router';
import { useAppOptionStore } from '@/stores/app-option';

export default defineComponent({
    mounted() {
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
<template>
    <div>
        <!-- Navigation -->
        <nav class="navbar navbar-expand-lg navbar-light bg-light fixed-top">
            <div class="container-fluid ps-lg-3 pe-lg-3">
                <a class="navbar-brand ms-2" href="#page-top">
                    <img src="../assets/Logo.png" alt="Rose Industry" class="header-logo img-fluid">
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                    data-bs-target="#navbarResponsive">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse justify-content-center" id="navbarResponsive">
                    <ul class="navbar-nav" style="font-weight: bold;">
                        <li class="nav-item"><a class="nav-link" href="#solutions">Soluciones</a></li>
                        <li class="nav-item"><a class="nav-link" href="#nichos">Tipos de comercios</a></li>
                        <li class="nav-item"><a class="nav-link" href="#pricing">Precios</a></li>
                        <li class="nav-item"><a class="nav-link" href="#contact">Contacto</a></li>
                    </ul>
                </div>
                <div class="ms-auto d-none d-lg-flex me-2">
                    <RouterLink to="/page/login" class="btn landing-color me-2">Iniciar Sesión</RouterLink>
                    <RouterLink to="/page/register" class="btn btn-outline-primary landing-color">Registrarse
                    </RouterLink>
                </div>
            </div>
        </nav>

        <!-- Page Content -->
        <div id="page-top" class="container-fluid pt-5">
            <!-- Solutions Section -->
            <section id="solutions" class="pt-4">
                <div class="container py-5">
                    <h2 class="mb-4 text-center">Soluciones</h2>
                    <div class="row">
                        <div class="col-md-6">
                            <!-- Solution 1 -->
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">POS para restaurantes</h5>
                                    <p class="card-text">Descripción breve de la solución 1.</p>
                                    <a href="#" class="btn landing-color">Más info</a>
                                </div>
                            </div>
                            <!-- Solution 2 -->
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">POS para comercios</h5>
                                    <p class="card-text">Descripción breve de la solución 2.</p>
                                    <a href="#" class="btn landing-color">Más info</a>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <img id="pos-img" src="/assets/img/pos.jpg" alt="pos" class="img-fluid rounded">
                        </div>
                    </div>
                </div>
            </section>
            <hr>
            <!-- Nichos Section -->
            <section id="nichos" class="pt-4 bg-transparent">
                <div class="container py-5">
                    <h2 class="mb-4 text-center">Tipos de comercios</h2>
                    <div class="row">
                        <!-- Nicho 1 -->
                        <div class="col-md-3 d-flex align-items-stretch">
                            <div class="card bg-light text-dark">
                                <div class="card-body d-flex flex-column justify-content-between">
                                    <h5 class="card-title text-center">Restaurantes</h5>
                                    <i class="fas fa-utensils fa-3x text-center landing-color"></i>
                                    <p class="card-text">Descripción breve del nicho 1.</p>
                                </div>
                            </div>
                        </div>
                        <!-- Nicho 2 -->
                        <div class="col-md-3 d-flex align-items-stretch">
                            <div class="card bg-light text-dark">
                                <div class="card-body d-flex flex-column justify-content-between">
                                    <h5 class="card-title text-center">Cafeterías</h5>
                                    <i class="fas fa-coffee fa-3x text-center landing-color"></i>
                                    <p class="card-text">Descripción breve del nicho 2.</p>
                                </div>
                            </div>
                        </div>
                        <!-- Nicho 3 -->
                        <div class="col-md-3 d-flex align-items-stretch">
                            <div class="card bg-light text-dark">
                                <div class="card-body d-flex flex-column justify-content-between">
                                    <h5 class="card-title text-center">Peluquerías</h5>
                                    <i class="fas fa-cut fa-3x text-center landing-color"></i>
                                    <p class="card-text">Descripción breve del nicho 3.</p>
                                </div>
                            </div>
                        </div>
                        <!-- Nicho 4 -->
                        <div class="col-md-3 d-flex align-items-stretch">
                            <div class="card bg-light text-dark">
                                <div class="card-body d-flex flex-column justify-content-between">
                                    <h5 class="card-title text-center">Tiendas departamentales</h5>
                                    <i class="fas fa-store fa-3x text-center landing-color"></i>
                                    <p class="card-text">Descripción breve del nicho 3.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <hr>
            <!-- Pricing Section -->
            <section id="pricing" class="pt-4">
                <div class="container py-5 text-center">
                    <h2 class="mb-4">Precios</h2>
                    <div class="row">
                        <div class="col-6">
                            <img class="img-fluid rounded" src="/assets/img/limited.jpg" alt="Oferta limitada">
                        </div>
                        <div class="col-6">
                            <div class="card mx-auto" style="max-width: 18rem;">
                                <div class="card-header">Oferta Especial Limitada</div>
                                <div class="card-body">
                                    <h5 class="card-title">$50 para nuevos clientes</h5>
                                    <p class="card-text">Aprovecha nuestra oferta exclusiva para nuevos clientes y
                                        empieza a
                                        transformar tu negocio hoy.</p>
                                    <a href="https://wa.me/5804246026142?text=Me%20interesa%20la%20oferta%20especial%20de%20$50%20para%20nuevos%20clientes."
                                        class="btn landing-color">
                                        <i class="fab fa-whatsapp"></i> Obtener Oferta
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>
            <hr>
            <!-- Contact Section -->
            <section id="contact" class="pt-4 bg-transparent">
                <div class="container py-5">
                    <div class="row justify-content-center align-items-center">
                        <div class="col-md-6">
                            <form>
                                <h2 class="mb-4 text-center">Contacto</h2>
                                <h5 class="text-muted text-center">¿Tienes preguntas o dudas para nosotros?</h5>
                                <div class="mb-3">
                                    <label for="name" class="form-label">Nombre</label>
                                    <input type="text" class="form-control" id="name" placeholder="Tu nombre">
                                </div>
                                <div class="mb-3">
                                    <label for="email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="email"
                                        placeholder="tuemail@ejemplo.com">
                                </div>
                                <div class="mb-3">
                                    <label for="message" class="form-label">Mensaje</label>
                                    <textarea class="form-control" id="message" rows="3"></textarea>
                                </div>
                                <button type="submit" class="btn landing-color">Enviar Mensaje</button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<style scoped>
.landing-color {
    color: rgb(92, 10, 92);
}

.btn.landing-color:not(.btn-outline-primary) {
    background-color: rgb(92, 10, 92);
    color: #fff;
    border: 1px solid rgb(92, 10, 92);
}

.btn.landing-color:not(.btn-outline-primary):hover {
    background-color: rgb(72, 0, 72);
    border-color: rgb(72, 0, 72);
}

.btn-outline-primary.landing-color {
    color: rgb(92, 10, 92);
    background-color: transparent;
    border: 1px solid rgb(92, 10, 92);
}

.btn-outline-primary.landing-color:hover {
    color: #fff;
    background-color: rgb(92, 10, 92);
    border-color: rgb(92, 10, 92);
}

#pos-img {
    height: 500px;
}

.container-fluid {
    padding-right: 0;
    padding-left: 0;
    margin-right: auto;
    margin-left: auto;
}

/* Global Styles */
#solutions,
#nichos,
#pricing,
#contact {
    padding: 60px 15px;
    /* Adjusted padding for full-width layout */
}

.card {
    margin: 20px;
    /* Increased margin for better spacing */
}

/* Responsive Adjustments */
@media (max-width: 992px) {
    .card {
        margin: 10px 0;
        /* Adjust spacing for smaller screens */
    }

    /* Adjust navbar for better mobile experience */
    .navbar-nav .nav-item {
        margin-bottom: 1rem;
    }
}

@media (max-width: 768px) {
    .navbar-nav {
        margin-top: 0;
    }

    .navbar-nav .nav-link {
        margin-right: 0;
        text-align: center;
    }
}

/* Ensure full width for sections if needed */
.full-width {
    width: 100%;
    max-width: 100%;
}

.header-logo {
    width: 150px;
    /* Adjust the width as needed */
    height: auto;
    /* Keeps the aspect ratio */
}

/* Add any page-specific styling here */
.navbar-nav .nav-link {
    text-transform: uppercase;
    margin-right: 1rem;
    /* Ensures a bit of spacing between navigation items for better readability */
}

.navbar-brand {
    font-weight: bold;
    /* Makes the brand name stand out */
}

.btn-primary {
    background-color: #0056b3;
    /* Example primary color */
}

.btn-outline-primary {
    border-color: #0056b3;
    color: #0056b3;
}

.btn-outline-primary:hover {
    background-color: #0056b3;
    color: white;
}

/* Improve the readability and spacing */
section {
    padding-top: 2rem;
    padding-bottom: 1rem;
}

h2 {
    font-size: 2rem;
    /* Larger headings */
}

p {
    font-size: 1rem;
    /* Optimal reading size */
    line-height: 1.6;
    /* Improve readability */
}

/* Adjustments for smaller screens */
@media (max-width: 768px) {
    .navbar-nav {
        margin-top: 1rem;
    }

    .navbar-nav .nav-link {
        margin-right: 0;
        text-align: center;
        /* Center navigation links */
    }
}
</style>