<script>
import { RouterLink } from 'vue-router';
import { defineComponent } from 'vue';
import { useAppOptionStore } from '@/stores/app-option';
import { db } from '../firebase/init';
import { ref as dbRef, get, query, orderByChild, equalTo } from 'firebase/database';
import PageRegister from '@/views/PageRegister.vue';
import PageLogin from '@/views/PageLogin.vue';
import { Modal } from 'bootstrap';

export default defineComponent({
    components: {
        PageRegister,
    },
    data() {
        return {
            affiliates: [],
            suscriptions: []
        }
    },
    computed: {
        sortedPlans() {
            return this.suscriptions.sort((a, b) => {
                return a.order - b.order;
            });
        },
        formattedDesc() {
            return this.suscriptions.map(plan => ({
                ...plan,
                desc: plan.desc
                    .split('.')
                    .filter(sentence => sentence.trim()) // Remove any empty sentences
                    .map(sentence => `<li>${sentence.trim()}</li>`) // Wrap sentences in <li>
                    .join('') // Join the list items
            }));
        },
    },
    methods: {
        async fetchAffiliates() {
            const role = 'afiliado';
            const affiliatesRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                const affiliateSnapshot = await get(affiliatesRef);

                if (affiliateSnapshot.exists()) {
                    const affiliatesList = [];
                    affiliateSnapshot.forEach((childSnapshot) => {
                        const affiliateData = childSnapshot.val();
                        affiliatesList.push({
                            id: childSnapshot.key,
                            name: affiliateData.companyName,
                            rif: affiliateData.rif,
                            status: affiliateData.status,
                            image: affiliateData.image,
                            isSubmitting: false,
                        });
                    });

                    this.affiliates = affiliatesList;
                } else {
                    console.log("No data available.");
                }
            } catch (error) {
                console.error("Error fetching affiliates:", error);
            }
        },

        async fetchSuscriptions() {
            const suscriptionsRef = dbRef(db, 'Suscriptions');

            try {
                const suscriptionSnapshot = await get(suscriptionsRef);

                if (suscriptionSnapshot.exists()) {
                    const suscriptionList = [];
                    suscriptionSnapshot.forEach((childSnapshot) => {
                        const suscriptionData = childSnapshot.val();
                        suscriptionList.push({
                            ...suscriptionData
                        });
                    });

                    this.suscriptions = suscriptionList;
                } else {
                    console.log("No data available.");
                }
            } catch (error) {
                console.error("Error fetching suscriptions:", error);
            }
        },
    },
    async mounted() {
        const appOption = useAppOptionStore();

        appOption.appSidebarHide = true;
        appOption.appHeaderHide = true;
        const sections = document.querySelectorAll('.fade-in');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('loaded');
                }
            });
        }, { threshold: 0.1 });

        sections.forEach(section => {
            observer.observe(section);
        });
        await this.fetchAffiliates();
        await this.fetchSuscriptions()
    },
    beforeUnmount() {
        const appOption = useAppOptionStore();
        appOption.appSidebarHide = false;
        appOption.appHeaderHide = false;
        new Modal(document.getElementById('registerModal')).hide();
    }
});
</script>
<template>
    <div class="bg-image d-flex flex-column align-items-center justify-content-center fade-in"
        style="background-image: url(/assets/img/bg-coupons.jpg);">
        <div class="bg-overlay"></div>
        <div class="container text-md-left position-relative">
            <header class="row justify-content-between align-items-center">
                <!-- Logo (Left Column) -->
                <div class="col-12 col-md-6 text-start">
                    <img src="/assets/img/rose-logo.png" alt="logo" class="logo img-fluid" />
                </div>
                <!-- Button (Right Column) -->
                <div class="col-12 col-md-6 text-end">
                    <router-link to="/page/login" class="btn-registrate">Iniciar Sesión</router-link>
                </div>
            </header>

            <div class="hero-content text-center">
                <h1 class="display-2 fw-bold text-white mb-4">Bienvenido<br />a Rose Coupon</h1>
                <!-- <router-link to="/page/register" class="btn btn-registrate cta-purple">Registrate</router-link> -->
                <button type="button" class="btn btn-registrate" data-bs-toggle="modal" data-bs-target="#registerModal">
                    Registrate
                </button>
            </div>
        </div>
    </div>

    <!-- Features Section -->
    <div class="container-fluid my-5 py-2 fade-in">
        <h2 class="text-center fw-bold mb-5"><strong>Descubre los mejores descuentos</strong></h2>
        <div class="row g-4">
            <div class="col-md-4 d-flex flex-column text-center feature-item">
                <img src="/assets/img/coupon.png" alt="Cupones" class="feature-image mx-auto" />
                <h4 class="mt-3">Cupones</h4>
                <p>Al suscribirte tendras acceso a nuestros cupones para poder disfrutar de tus productos favoritos.
                </p>
            </div>
            <div class="col-md-4 d-flex flex-column text-center feature-item">
                <img src="/assets/img/event.png" alt="Eventos" class="feature-image mx-auto" />
                <h4 class="mt-3">Eventos</h4>
                <p>Disfruta de eventos con tus comercios favoritos, donde podras probar sus mejores productos,
                    patrocinados por RoseCoupon.</p>
            </div>
            <div class="col-md-4 d-flex flex-column text-center feature-item">
                <img src="/assets/img/discount.png" alt="Descuentos" class="feature-image mx-auto" />
                <h4 class="mt-3">Créditos</h4>
                <p>Al suscribirte podras realizar compras a crédito, las cuales podras pagar en comodas cuotas. <br>
                    <small class="text-muted">Debes estar verificado para disfrutar de esta opción.</small>
                </p>
            </div>
        </div>
    </div>

    <!-- Subscription Plans Section -->
    <div class="container-fluid my-4 fade-in" style="padding: 20px;" id="price-table">
        <h2 class="text-center fw-bold mb-5"><strong>Nuestros Planes</strong></h2>
        <div class="row g-4 justify-content-center">
            <div v-for="(plan, index) in sortedPlans" :key="plan.id" class="col-md-3">
                <div :class="['card h-100 text-center py-4', {
                    'border-primary': plan.name === 'plata',
                    'shadow-sm': true, // Keep shadow for all cards
                }]" :style="plan.name === 'plata' ?
                    'background-color: #b800c2; border-radius: 0.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); transition: transform 0.3s;'
                    : ''">
                    <div v-if="plan.name === 'plata'" class="ribbon">
                        <span>Popular</span>
                    </div>
                    <i class="fa-lg" :class="plan.icon"></i>
                    <h4 class="my-4 text-primary">{{ plan.name.toUpperCase() }}</h4>
                    <p class="fw-bold display-5">${{ plan.price }} <small>/ MO.</small></p>
                    <p class="form-label" v-html="formattedDesc[index].desc"></p>
                </div>
            </div>
        </div>
    </div>

    <!-- Affiliates Section -->
    <div class="bg-transparent py-4 mb-4 fade-in">
        <div class="container">
            <div class="row g-5 justify-content-center">
                <div class="col text-center" v-for="aff in affiliates" :key="aff.id">
                    <img :src="aff.image" alt="aff.name" class="client-logo mx-auto shadow-sm" />
                </div>
            </div>
        </div>
    </div>

    <!-- Footer Section -->
    <div class="text-white py-3">
        <div class="container-fluid">
            <div class="row justify-content-center justify-content-md-between align-items-center">
                <div class="col-12 col-md-6 text-center text-md-start my-2">
                    Copyright © 2024 All Rights Reserved by Rose Coupon
                </div>
                <div class="col-12 col-md-6 text-center text-md-end my-2">
                    <a href="#" class="social-icon" aria-label="Facebook">
                        <i class="fa fa-facebook"></i>
                    </a>
                    <a href="#" class="social-icon" aria-label="Twitter">
                        <i class="fa fa-twitter"></i>
                    </a>
                    <a href="#" class="social-icon" aria-label="Instagram">
                        <i class="fa fa-instagram"></i>
                    </a>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    <div class="modal fade" id="registerModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Registrate</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <PageRegister />
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Add this to your global or component-specific CSS */
.fade-in {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 1s ease-out, transform 1s ease-out;
}

.fade-in.loaded {
    opacity: 1;
    transform: translateY(0);
}

.bg-image {
    min-height: 100vh;
    /* Adjust the top padding if needed */
    position: relative;
    width: 100%;
    height: 80vh;
    background-size: cover;
    /* Ensure the image covers the entire div */
    background-position: center;
    /* Center the image */
    overflow: hidden;
    /* Prevent any overflow */
    padding: 0;
}

.bg-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    /* Adjust opacity and color as needed */
    z-index: 1;
    /* Ensure the overlay is above the background image */
}

.container {
    position: relative;
    /* Position relative to place content above overlay */
    z-index: 2;
    /* Ensure the content is above the overlay */
    display: flex;
    flex-direction: column;
    justify-content: center;
    /* Vertically center hero-content */
    align-items: center;
    /* Horizontally center hero-content */
    min-height: 100%;
}

header {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    /* Ensure header stretches across the entire width */
    padding: 10px 10px;
    /* Minimal padding for header */
    z-index: 2;
}

.logo {
    border-radius: 50%; /* Make logo circular */
    max-width: 150px;
    max-height: 150px;
    width: 100%;
    height: 100%;
    object-fit: cover; /* Ensure image covers entire circle */
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.logo:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 10px rgba(0,0,0,0.2);
}

@media (min-width: 576px) {
    .logo {
        max-height: 80px;
        /* For sm screens */
    }

    .bg-image {
        height: 60vh;
    }

}

@media (min-width: 768px) {
    .logo {
        max-height: 100px;
        /* For md screens */
    }

    .bg-image {
        height: 70vh;
    }
}

@media (min-width: 992px) {
    .logo {
        max-height: 120px;
        /* For lg screens */
    }
}

#price-table__premium {
    background-color: #b800c2;
    border-radius: 0.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s;
}

#price-table__premium:hover {
    transform: scale(1.05);
}

.feature-image {
    max-width: 80%;
    height: auto;
}

.client-logo {
    width: 100px;
    /* Set fixed width */
    height: 100px;
    /* Set fixed height */
    object-fit: cover;
    /* Ensure the image fits within the dimensions without distortion */
    border-radius: 10px;
    /* Optional: Rounded corners */
    margin: 15px;
    /* Add spacing below each image */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    /* Customize shadow */
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    /* Smooth transition for hover effects */
}

.client-logo:hover {
    transform: scale(1.05);
    /* Slight zoom effect on hover */
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
    /* Enhanced shadow on hover */
}

.btn {
    padding: 0.75rem 1.5rem;
}

.atlas-cta {
    border-radius: 50px;
}

.cta-green {
    background-color: #28a745;
    color: white;
}

.cta-ghost {
    background-color: transparent;
    border: 2px solid #28a745;
    color: #28a745;
}

.cta-ghost:hover {
    background-color: #28a745;
    color: white;
}

#copyright {
    background-color: #343a40;
}

#contact {
    background-size: cover;
    background-position: center;
    padding: 4rem 1rem;
}

form .form-control {
    border-radius: 0.3rem;
}

.social-icon {
    display: inline-block;
    text-align: center;
    margin: 0 8px;
    /* Reduced spacing between icons */
    color: #cccfd7;
    /* Default color */
    font-size: 1.5rem;
    /* Smaller icon size */
    transition: color 0.3s, transform 0.3s;
    /* Smooth transition for hover effects */
    width: 40px;
    /* Fixed width for consistent sizing */
    height: 40px;
    /* Fixed height for consistent sizing */
    line-height: 40px;
    /* Center the icon vertically */
    border-radius: 50%;
    /* Make the background circular */
}

.social-icon:hover {
    color: #b800c2;
    /* Change color on hover */
    transform: scale(1.1);
    /* Slightly enlarge on hover */
    background-color: rgba(0, 255, 173, 0.1);
    /* Light background on hover */
}

.btn-registrate {
    background-color: #b800c2;
    /* Purple color */
    color: white;
    /* Text color */
    padding: 10px 20px;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    /* Padding for button */
    border-radius: 25px;
    /* Rounded edges */
    text-decoration: none;
    /* Remove underline */
    font-weight: bold;
    /* Bold text */
    transition: background-color 0.3s ease;
    /* Transition for hover effect */
    margin-top: 20px;
}

.btn-registrate:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}

.btn-premium {
    background-color: white;
    /* Purple color */
    color: #a300b0;
    /* Text color */
    padding: 10px 20px;
    /* Padding for button */
    border-radius: 25px;
    /* Rounded edges */
    text-decoration: none;
    /* Remove underline */
    font-weight: bold;
    /* Bold text */
    transition: background-color 0.3s ease;
    /* Transition for hover effect */
    margin-top: 20px;
}

.btn-premium:hover {
    background-color: #000000;
    /* Darker purple on hover */
}

.feature-item {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    /* Ensure even spacing between items */
    height: 100%;
    /* Ensure the entire column takes up the available space */
}

.feature-image {
    max-width: 200px;
    height: auto;
}

.feature-item h4,
.feature-item p {
    margin-top: auto;
    /* Ensure margin-top flexibility */
}

.container-fluid .row {
    display: flex;
}

.card {
    padding: 15px;
    border-radius: 10px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card h4 {
    font-size: 1.75rem;
    font-weight: 700;
}

.ribbon {
    position: absolute;
    top: 10px;
    right: -10px;
    background: #007bff;
    color: #fff;
    padding: 5px 15px;
    font-size: 0.875rem;
    font-weight: bold;
    transform: rotate(45deg);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.btn {
    border-radius: 50px;
    font-size: 1rem;
}

.btn-outline-primary {
    color: #007bff;
    border-color: #007bff;
}

.btn-outline-primary:hover {
    background-color: #007bff;
    color: white;
}

.display-5 {
    font-size: 2.5rem;
    font-weight: bold;
}

#price-table {
    background: linear-gradient(135deg, #000000, #6d2c92);
}

#price-table__premium {
    border-width: 2px;
}

ul li {
    margin-bottom: 10px;
}

/* Responsive Typography */
@media (max-width: 768px) {
    .display-2 {
        font-size: 2.5rem;
    }

    .hero-content {
        padding: 0 15px;
    }

    .feature-item {
        margin-bottom: 1.5rem;
    }
}

/* Responsive Grid Adjustments */
.row.g-4 > [class*='col-'] {
    display: flex;
    flex-direction: column;
}

/* Enhanced Responsiveness for Small Screens */
@media (max-width: 576px) {
    .logo {
        max-width: 100px;
        max-height: 100px;
    }

    .btn-registrate {
        padding: 8px 15px;
        font-size: 0.8rem;
    }

    .display-2 {
        font-size: 2rem;
    }

    .feature-image {
        max-width: 120px;
    }
}

/* Smooth Responsive Transitions */
.container, .container-fluid {
    transition: padding 0.3s ease;
}

/* Enhanced Hover Effects for Feature Items */
.feature-item {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border-radius: 10px;
    padding: 15px;
}

.feature-item:hover {
    transform: translateY(-10px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
</style>