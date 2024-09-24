<script>
import { db } from '@/firebase/init';
import { ref as dbRef, get, orderByChild, query, equalTo } from 'firebase/database';
import { useUserStore } from "@/stores/user-role";

export default {
	data() {
		return {
			userName: '',
			clients: [],
			verifiedClients: [],
		}
	},
	methods: {
		async fetchClients() {
			const role = 'cliente';
			const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

			try {
				const snapshot = await get(clientRef);

				if (snapshot.exists()) {
					const users = snapshot.val();

					// Map Firebase data to an array of promises
					const clientPromises = Object.keys(users).map(async key => {
						return {
							id: key,
							...users[key],
						};
					});

					// Await for all promises to resolve
					this.clients = await Promise.all(clientPromises);

					const verifiedClients = this.clients.filter((client) => client.isVerified === true);
					this.verifiedClients = verifiedClients;
				} else {
					this.clients = [];
				}
			} catch (error) {
				console.error('Error fetching clients:', error);
				this.clients = [];
			}
		},
	},
	async mounted() {
		const userStore = useUserStore();
		await userStore.fetchUser();

		this.userName = userStore.userName;

		await this.fetchClients();
	}
}
</script>
<template>
	<div class="container py-4">
		<div class="card mb-4 shadow-sm">
			<div class="card-body">
				<div class="row align-items-center">
					<div class="col-md-8">
						<h1 class="h4 mb-2">Hola, {{ userName }} 🎉</h1>
						<h5 class="text-muted">Aquí está un resumen de tu App</h5>
					</div>
				</div>
			</div>
		</div>

		<div class="row g-4">
			<!-- Clientes registrados -->
			<div class="col-4">
				<div class="card custom-card h-100 text-center">
					<div class="card-body d-flex flex-column justify-content-center align-items-center">
						<div class="icon-circle bg-primary mb-3">
							<i class="fa fa-user fa-lg text-white"></i>
						</div>
						<h5 class="mb-1">Clientes registrados</h5>
						<h3>{{ clients.length || 0 }}</h3>
					</div>
				</div>
			</div>
			<!-- Clientes verificados -->
			<div class="col-4">
				<div class="card custom-card h-100 text-center">
					<div class="card-body d-flex flex-column justify-content-center align-items-center">
						<div class="icon-circle bg-success mb-3">
							<i class="fa fa-user-check fa-lg text-white"></i>
						</div>
						<h5 class="mb-1">Clientes Verificados</h5>
						<h3>{{ verifiedClients.length || 0 }}</h3>
					</div>
				</div>
			</div>
			<!-- Comercios afiliados -->
			<div class="col-4">
				<div class="card custom-card h-100 text-center">
					<div class="card-body d-flex flex-column justify-content-center align-items-center">
						<div class="icon-circle bg-info mb-3">
							<i class="fa fa-building fa-lg text-white"></i>
						</div>
						<h5 class="mb-1">Comercios Afiliados</h5>
						<h3></h3>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<style scoped>
.icon-circle {
	width: 50px;
	height: 50px;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.text-muted {
	font-size: 0.9rem;
}

.custom-card {
	transition: transform .3s ease-in-out, box-shadow .3s ease-in-out;
}

.custom-card:hover {
	transform: translateY(-5px);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.bg-gradient-custom-orange {
	background-image: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}

.custom-progress-bar {
	background-color: #fff;
}

.icon-large {
	font-size: 2rem;
}

.text-shadow {
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.card-img-overlay-enhanced {
	background-size: cover;
	background-position: center;
}

.custom-overlay-icon {
	max-height: 70px;
	transition: transform .3s ease-in-out;
}

.custom-overlay-icon:hover {
	transform: scale(1.1);
}
</style>