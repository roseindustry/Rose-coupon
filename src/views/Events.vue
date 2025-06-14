<script>
import { ref as dbRef, query, orderByChild, equalTo, set, get, push, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/init';
import { Modal } from 'bootstrap';
import { showToast } from '@/utils/toast';
import { sendEmail } from '@/utils/emailService';
import 'toastify-js/src/toastify.css'
import { useUserStore } from "@/stores/user-role";
import { isAfter, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import PageHeader from '@/components/app/PageHeader.vue';

export default {
	name: 'Events',
	components: {
		PageHeader
	},
	data() {
		return {
			// Logged User data
			userId: '',
			role: '',
			userName: '',

			event: {
				order: 0,
				name: '',
				desc: '',
				status: false,
				date: null,
				type: '',
				raffle: {
					ticketLimit: null,
					purchaseDeadline: null,
					ticketPrice: null,
					soldTickets: [],
					affiliateId: null,
				},
			},
			selectedAffiliateIds: [],
			editEventData: {
				affiliates: [],
				displayedAffiliates: []
			},
			events: [],
			raffleTickets: [],

			affiliates: [],
			eventTypes: ['Fiesta', 'Rifa'],

			imageFile: null,
			uploadImage: false,
			imagePreview: null,
			updatedImagePreview: null,
			isSubmitting: false,

			modalEvent: null,
			soldTicketsListener: null,
			selectedTickets: [],
			totalInBolivares: 0,
			showPaymentMethods: false,

			exchange: 0,
			paymentFile: null,
			paymentPreview: null,
			paymentDate: null,

			clientTickets: [],

			loading: false
		}
	},
	methods: {
		async fetchCurrentExchange() {
			try {
				const exchangeRef = dbRef(db, `Exchange`);
				const exchangeSnapshot = await get(exchangeRef);

				if (exchangeSnapshot.exists()) {
					const exchangeData = exchangeSnapshot.val();
					this.exchange = parseFloat(exchangeData.value).toFixed(2);
				} else {
					console.log('No exchange value found.');
					this.exchange = 0;
				}
			} catch (error) {
				console.error('Error fetching current exchange value:', error);
				this.exchange = 0;
			}
		},
		handleFileUpload(event) {
			const file = event.target.files[0];
			if (!file) return;

			this.paymentFile = file;
			this.paymentPreview = URL.createObjectURL(file);
		},
		sortEventsByOrder(order = 'asc') {
			this.events.sort((a, b) => {
				if (order === 'asc') {
					return a.order - b.order;
				} else {
					return b.order - a.order;
				}
			});

		},
		async getNextEventOrder() {
			try {
				// Fetch the events to get the highest order value
				const eventsSnapshot = await get(query(dbRef(db, 'Events')));

				let maxOrder = 0;
				if (eventsSnapshot.exists()) {
					const events = eventsSnapshot.val();
					// Loop through the events to find the highest order number
					Object.values(events).forEach(event => {
						if (event.order && event.order > maxOrder) {
							maxOrder = event.order;
						}
					});
				}

				// Increment the max order value by 1 for the new affiliate
				this.event.order = maxOrder + 1;
			} catch (error) {
				console.error("Error fetching events to calculate order:", error);
			}
		},
		async sendNotificationEmail(emailPayload) {
			try {
				// Send email via the utility function
                const result = await sendEmail(emailPayload);

                if (result.success) {
                    console.log("Email sent successfully:", result.message);
                } else {
                    console.error("Failed to send email:", result.error);
                }
			} catch (error) {
				console.error('Error sending email:', error);
			}
		},

		// Fetch data
		async fetchEvents() {
			const eventsRef = dbRef(db, 'Events');

			try {
				this.loading = true;

				const snapshot = await get(eventsRef);

				if (snapshot.exists()) {
					const events = snapshot.val();

					// Fetch affiliate data for each event
					this.events = await Promise.all(
						Object.keys(events).map(async (key) => {
							const event = {
								id: key,
								...events[key],
								date: new Date(events[key].date).toISOString().split('T')[0], // Format event date
							};

							// Fetch the list of affiliate IDs from the 'Affiliate' folder for the current event
							const affiliatesRef = dbRef(db, `Events/${key}/Affiliates`);
							const affiliatesSnapshot = await get(affiliatesRef);

							if (affiliatesSnapshot.exists()) {
								const affiliateIds = Object.keys(affiliatesSnapshot.val());

								// Fetch data for all affiliates using their IDs
								event.affiliates = await Promise.all(
									affiliateIds.map(async (affiliateId) => {
										const affiliateDataRef = dbRef(db, `Users/${affiliateId}`);
										const affiliateDataSnapshot = await get(affiliateDataRef);

										if (affiliateDataSnapshot.exists()) {
											// Return the affiliate data along with the affiliateId
											return {
												id: affiliateId, // Add the affiliateId field
												...affiliateDataSnapshot.val(),
											};
										}
										return null; // Return null if affiliate data is not found
									})
								).then((affiliates) => affiliates.filter((aff) => aff !== null)); // Filter out any null values
							} else {
								event.affiliates = []; // No affiliates found for this event
							}

							// Additional logic for raffle events
							if (event.type === 'Rifa') {
								const raffleRef = dbRef(db, `Events/${key}/raffle`);
								const raffleSnapshot = await get(raffleRef);

								if (raffleSnapshot.exists()) {
									const raffleData = raffleSnapshot.val();
									if (this.role === 'cliente') {
										// For the client view, only show the ticketNumber
										event.raffle = {
											...raffleData,
											soldTickets: raffleData.soldTickets
												? Object.keys(raffleData.soldTickets).map((key) => raffleData.soldTickets[key].ticketNumber)
												: [],
										};
									} else if (this.role === 'admin') {
										// For the admin view, show ticketNumber, clientId, and purchase date
										event.raffle = {
											...raffleData,
											soldTickets: raffleData.soldTickets
												? Object.keys(raffleData.soldTickets).map((key) => ({
													ticketNumber: raffleData.soldTickets[key].ticketNumber,
													clientId: raffleData.soldTickets[key].clientId,
													paymentDate: raffleData.soldTickets[key].paymentDate,
												}))
												: [],
										};
									}
								} else {
									event.raffle = { soldTickets: [] }; // Default value if no raffle data exists
								}

								const raffleAffiliateIdRef = dbRef(db, `Events/${key}/raffle/affiliateId`);
								const raffleAffiliateIdSnapshot = await get(raffleAffiliateIdRef);

								if (raffleAffiliateIdSnapshot.exists()) {
									const raffleAffiliateId = raffleAffiliateIdSnapshot.val();

									// Fetch data for the raffle event's affiliateId
									const raffleAffiliateDataRef = dbRef(db, `Users/${raffleAffiliateId}`);
									const raffleAffiliateDataSnapshot = await get(raffleAffiliateDataRef);

									if (raffleAffiliateDataSnapshot.exists()) {
										event.raffleAffiliate = {
											id: raffleAffiliateId, // Add the raffleAffiliateId field
											...raffleAffiliateDataSnapshot.val(),
										};
									} else {
										event.raffleAffiliate = null; // Raffle affiliate data not found
									}
								} else {
									event.raffleAffiliate = null; // No raffle affiliateId found
								}
							}

							return event;
						})
					);
				} else {
					this.events = []; // No events found
				}
			} catch (error) {
				console.error('Error fetching events:', error);
			} finally {
				this.loading = false;
			}
		},
		async fetchAffiliates() {
			const role = 'afiliado';
			const affiliatesRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

			try {
				const snapshot = await get(affiliatesRef);

				if (snapshot.exists()) {
					const affiliates = snapshot.val();

					// Since Firebase data is an object, map to array for easier use
					this.affiliates = Object.keys(affiliates).map(key => ({
						id: key,
						...affiliates[key]
					}));
				} else {
					this.affiliates = [];
				}
			} catch (error) {
				console.error("Error fetching affiliates:", error);
			}
		},

		handleCreateEvent(){
			this.fetchAffiliates();
			this.getNextEventOrder();

			const modal = new Modal(document.getElementById('createEventModal'));
			modal.show();
		},

		//CRUD methods for events
		// Normal event (party)
		async createEvent() {
			try {
				this.isSubmitting = true;

				// Validate fields
				if (!this.event.name) throw new Error('El nombre del evento es obligatorio.');
				if (!this.event.date) throw new Error('La fecha del evento es obligatoria.');

				// Handle image upload
				let imageUrl = null;
				if (this.imageFile) {
					const sanitizedEventName = this.event.name.trim().toLowerCase().replace(/\s+/g, '-');
					const fileExtension = this.imageFile.name.split('.').pop();
					const fileName = `${sanitizedEventName}-logo.${fileExtension}`;

					const imageFileRef = storageRef(storage, `Events/${this.event.name}/${fileName}`);
					await uploadBytes(imageFileRef, this.imageFile);
					imageUrl = await getDownloadURL(imageFileRef);
				}

				const formattedDate = new Date(this.event.date).toISOString();

				// Prepare event data
				const data = {
					order: this.event.order,
					name: this.event.name,
					desc: this.event.desc,
					status: this.event.status,
					date: formattedDate,
					type: this.event.type,
				};

				if (imageUrl) data.image = imageUrl;

				// Save event data
				const eventRef = dbRef(db, 'Events');
				const newEventRef = push(eventRef);
				await set(newEventRef, data);

				// Add selected affiliates to the event
				if (this.selectedAffiliateIds.length > 0) {
					for (let affiliateId of this.selectedAffiliateIds) {
						const affiliateRef = dbRef(db, `Events/${newEventRef.key}/Affiliates/${affiliateId}`);
						await set(affiliateRef, affiliateId);
					}
				}

				showToast('Evento creado con éxito!');
				this.resetForm();
				await this.fetchEvents();
			} catch (error) {
				console.error('Error creating event:', error);
				showToast(error.message || 'Error al crear el evento.', {
					style: {
						background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
					},
				});
			} finally {
				this.isSubmitting = false;
			}
		},
		// Raffle event
		async createRaffle() {
			try {
				this.isSubmitting = true;

				// Validate fields
				if (!this.event.name) throw new Error('El nombre de la rifa es obligatorio.');
				if (!this.event.date) throw new Error('La fecha límite de la rifa es obligatoria.');
				if (!this.event.raffle.ticketLimit || this.event.raffle.ticketLimit <= 0) {
					throw new Error('El límite de boletos debe ser mayor a 0.');
				}
				if (!this.event.raffle.purchaseDeadline) {
					throw new Error('Debe establecer la fecha límite para la compra de boletos.');
				}
				if (!this.event.raffle.affiliateId) throw new Error('Debe seleccionar un afiliado para la rifa.');

				// Handle image upload
				let imageUrl = null;
				if (this.imageFile) {
					const sanitizedEventName = this.event.name.trim().toLowerCase().replace(/\s+/g, '-');
					const fileExtension = this.imageFile.name.split('.').pop();
					const fileName = `${sanitizedEventName}-logo.${fileExtension}`;

					const imageFileRef = storageRef(storage, `Raffles/${this.event.name}/${fileName}`);
					await uploadBytes(imageFileRef, this.imageFile);
					imageUrl = await getDownloadURL(imageFileRef);
				}

				const formattedDate = new Date(this.event.date).toISOString();
				const purchaseDeadline = new Date(this.event.raffle.purchaseDeadline).toISOString();

				// Prepare raffle data
				const data = {
					order: this.event.order,
					name: this.event.name,
					desc: this.event.desc,
					status: this.event.status,
					date: formattedDate,
					type: 'Rifa',
					raffle: {
						affiliateId: this.event.raffle.affiliateId,
						ticketLimit: this.event.raffle.ticketLimit,
						purchaseDeadline,
						ticketPrice: this.event.raffle.ticketPrice || null,
						soldTickets: [],
					},
				};

				if (imageUrl) data.image = imageUrl;

				// Save raffle data
				const raffleRef = dbRef(db, 'Events');
				const newRaffleRef = push(raffleRef);
				await set(newRaffleRef, data);

				showToast('Rifa creada con éxito!');
				this.resetForm();
				await this.fetchEvents();
			} catch (error) {
				console.error('Error creating raffle:', error);
				showToast(error.message || 'Error al crear la rifa.', {
					style: {
						background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
					},
				});
			} finally {
				this.isSubmitting = false;
			}
		},
		async deleteEvent(eventId, index) {
			console.log(eventId);
			if (confirm("¿Desea borrar este evento?")) {
				try {
					const eventRef = dbRef(db, `Events/${eventId}`);
					await remove(eventRef);

					// Remove the coupon from the local state
					this.events.splice(index, 1);

					showToast('Evento eliminado con éxito!');
				} catch (error) {
					console.error('Error deleting event:', error);
					alert('La eliminación del evento falló.');
				}
			}
		},

		// Edit events
		editEvent(event) {
			// Populate the modal fields with the plan data
			this.editEventData = {
				...event,
			};

			if (this.editEventData.type === 'Rifa') {
				this.editEventData.raffle.purchaseDeadline = new Date(this.editEventData.raffle.purchaseDeadline).toISOString().split('T')[0];
			}

			if (this.editEventData.type === 'Fiesta') {
				// Initialize selectedAffiliateIds from the event's affiliates
				this.selectedAffiliateIds = event.affiliates.map(aff => aff.id);
			}

			// Open the modal
			const modal = new Modal(document.getElementById('editEventModal'));
			modal.show();
		},
		async updateEvent(eventId) {
			try {
				this.isSubmitting = false;

				const eventRef = dbRef(db, `Events/${eventId}`);
				const eventSnapshot = await get(eventRef);

				if (!eventSnapshot.exists()) {
					console.error('Event not found');
					return;
				}

				const existingEventData = eventSnapshot.val();

				// Prepare the data for update
				const updateData = { ...existingEventData };

				// Update only changed fields for general event data
				if (this.editEventData.order !== undefined && this.editEventData.order !== existingEventData.order) {
					updateData.order = this.editEventData.order;
				}

				if (this.editEventData.name !== undefined && this.editEventData.name !== existingEventData.name) {
					updateData.name = this.editEventData.name;
				}

				if (this.editEventData.desc !== undefined && this.editEventData.desc !== existingEventData.desc) {
					updateData.desc = this.editEventData.desc;
				}

				if (this.editEventData.date !== undefined && this.editEventData.date !== existingEventData.date) {
					updateData.date = new Date(this.editEventData.date).toISOString();
				}

				if (this.editEventData.status !== undefined && this.editEventData.status !== existingEventData.status) {
					updateData.status = this.editEventData.status;
				}

				if (this.editEventData.type !== undefined && this.editEventData.type !== existingEventData.type) {
					updateData.type = this.editEventData.type;
				}

				// Update raffle-specific fields only if they change
				if (this.editEventData.type === "Rifa") {
					updateData.raffle = { ...existingEventData.raffle };

					if (
						this.editEventData.raffle.purchaseDeadline !== undefined &&
						this.editEventData.raffle.purchaseDeadline !== existingEventData.raffle?.purchaseDeadline
					) {
						updateData.raffle.purchaseDeadline = new Date(this.editEventData.raffle.purchaseDeadline).toISOString();
					}

					if (
						this.editEventData.raffle.ticketLimit !== undefined &&
						this.editEventData.raffle.ticketLimit !== existingEventData.raffle?.ticketLimit
					) {
						updateData.raffle.ticketLimit = this.editEventData.raffle.ticketLimit;
					}

					if (
						this.editEventData.raffle.ticketPrice !== undefined &&
						this.editEventData.raffle.ticketPrice !== existingEventData.raffle?.ticketPrice
					) {
						updateData.raffle.ticketPrice = this.editEventData.raffle.ticketPrice;
					}

					if (
						this.editEventData.raffle.affiliateId !== undefined &&
						this.editEventData.raffle.affiliateId !== existingEventData.raffle?.affiliateId
					) {
						updateData.raffle.affiliateId = this.editEventData.raffle.affiliateId;
					}
				}

				// Update only if there are changes
				if (JSON.stringify(updateData) !== JSON.stringify(existingEventData)) {
					await update(eventRef, updateData);
					console.log("Event updated successfully");
				}

				// Check if affiliates have changed in case of a 'Fiesta' event (handles multiple affiliates)
				const originalAffiliateIds = existingEventData.Affiliates ? Object.keys(existingEventData.Affiliates) : [];
				const affiliatesHaveChanged =
					originalAffiliateIds.length !== this.selectedAffiliateIds.length ||
					!this.selectedAffiliateIds.every((id) => originalAffiliateIds.includes(id));

				if (affiliatesHaveChanged) {
					await this.updateAffiliates(eventId);
				}

				// Success notification
				showToast('Evento actualizado con exito!');

				// Close the modal after saving
				const modal = Modal.getInstance(document.getElementById('editEventModal'));
				modal.hide();

				await this.fetchEvents();
			} catch (error) {
				console.error("Error creating event:", error);
			} finally {
				this.isSubmitting = false;
			}
		},
		async updateAffiliates(eventId) {
			try {
				const affiliatesRef = dbRef(db, `Events/${eventId}/Affiliates`);
				const affiliatesSnapshot = await get(affiliatesRef);

				const existingAffiliates = affiliatesSnapshot.exists() ? Object.keys(affiliatesSnapshot.val()) : [];

				// Prepare new and removed affiliates
				const newAffiliateIds = this.selectedAffiliateIds;
				const affiliatesToRemove = existingAffiliates.filter(id => !newAffiliateIds.includes(id));
				const affiliatesToAdd = newAffiliateIds.filter(id => !existingAffiliates.includes(id));

				// Remove affiliates that are no longer selected
				for (const affiliateId of affiliatesToRemove) {
					const affiliateRef = dbRef(db, `Events/${eventId}/Affiliates/${affiliateId}`);
					await set(affiliateRef, null); // Remove the affiliate
				}

				// Add newly selected affiliates
				for (const affiliateId of affiliatesToAdd) {
					const affiliateRef = dbRef(db, `Events/${eventId}/Affiliates/${affiliateId}`);
					await set(affiliateRef, affiliateId); // Set true or any relevant data for the affiliate
				}

				console.log("Affiliates updated successfully");
			} catch (error) {
				console.error("Error updating affiliates:", error);
			}
		},

		// Helper method to find an affiliate by ID
		getAffiliateById(affiliateId) {
			return this.affiliates.find(affiliate => affiliate.id === affiliateId) || { companyName: '' }; // Default to empty object if not found
		},

		selectEventType(type) {
			this.event.type = type;
		},
		editEventType(type) {
			this.editEventData.type = type;
		},
		selectRaffleAffiliate(affiliateId) {
			this.event.raffle.affiliateId = affiliateId;
		},
		editRaffleAffiliate(affiliateId) {
			this.editEventData.raffle.affiliateId = affiliateId;
		},
		openSoldTicketsModal(evento) {
			this.raffleTickets = evento.raffle.soldTickets;

			this.modalEvent = {
				...evento
			}

			// Fetch client data for each sold ticket
			const ticketPromises = this.raffleTickets.map(async (ticket) => {
				try {
					// Fetch client data based on clientId (assuming clientId is stored in Users/${clientId})
					const clientRef = dbRef(db, `Users/${ticket.clientId}`);
					const clientSnapshot = await get(clientRef);

					if (clientSnapshot.exists()) {
						const clientData = clientSnapshot.val();
						ticket.clientName = clientData.firstName + ' ' + clientData.lastName;  // Assuming client has firstName and lastName fields
						ticket.cedula = clientData.identification;  // Assuming cedula is stored as 'identification'
					} else {
						console.error(`Client data not found for clientId: ${ticket.clientId}`);
					}
					return ticket;
				} catch (error) {
					console.error('Error fetching client data:', error);
					return ticket;  // In case of error, return ticket without client data
				}
			});

			Promise.all(ticketPromises).then((updatedTickets) => {
				// Update raffleTickets with the client data
				this.raffleTickets = updatedTickets;

				// Once the data is updated, show the modal
				this.$nextTick(() => {
					const modalElement = document.getElementById('TicketsModal');
					if (modalElement) {
						const modal = Modal.getOrCreateInstance(modalElement);
						modal.show();
					} else {
						console.error('Modal element not found in the DOM');
					}
				});
			});
		},
		resetForm() {
			// Reset form fields
			this.event = {
				name: '',
				desc: '',
				status: false,
				date: new Date(),
			};
			this.selectedAffiliateIds = null;
			// Reset image upload state if there's one
			this.uploadImage = false;
			this.imagePreview = null;
		},
		previewImage(event) {
			const file = event.target.files[0];
			if (file) {
				this.imageFile = file;
				this.imagePreview = URL.createObjectURL(file);
			}
		},
		previewUpdatedImage(event, evento) {
			const file = event.target.files[0];
			if (file) {
				evento.imageFile = file;
				evento.updatedImagePreview = URL.createObjectURL(file);
			}
		},
		formatDate(date) {
			if (!date) return ''; // Handle invalid dates or null values
			const d = new Date(date);
			const localDateDay = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
			const day = String(localDateDay.getDate()).padStart(2, '0'); // Ensure two-digit day
			const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Ensure two-digit month (months are zero-indexed)
			const year = d.getUTCFullYear();
			return `${day}/${month}/${year}`;
		},

		// Client's view
		// Format date for better readability
		formattedDate(date) {
			return format(parseISO(date), "PPPP", { locale: es });
		},
		// Check if date has passed
		isPastDate(date) {
			return !isAfter(parseISO(date), new Date());
		},

		copyToClipboard(text) {
			navigator.clipboard.writeText(text)
				.then(() => {
					showToast('Texto copiado!');
				})
				.catch(err => {
					showToast.error('Error: ', err);
				});
		},
		togglePaymentMethods() {
			this.showPaymentMethods = !this.showPaymentMethods;
		},

		// Handle ticket selection
		selectTicket(ticket) {
			if (this.modalEvent.raffle.soldTickets.includes(ticket)) {
				return; // Ignore selection if ticket is sold
			}

			const index = this.selectedTickets.indexOf(ticket);
			if (index > -1) {
				// Remove the ticket
				this.selectedTickets.splice(index, 1); // Direct mutation
			} else {
				// Add the ticket
				this.selectedTickets.push(ticket); // Direct mutation
			}
			this.updateTotal();
		},
		buyTicket(evento) {
			this.modalEvent = {
				...evento
			}
			this.totalInBolivares = (
				this.modalEvent.raffle.ticketPrice * this.selectedTickets.length * this.exchange
			).toFixed(2);

			this.$nextTick(() => {
				const modalElement = document.getElementById('buyTicketModal');
				if (modalElement) {
					const modal = Modal.getOrCreateInstance(modalElement);
					modal.show();
				} else {
					console.error('Modal element not found in the DOM');
				}
			});
		},
		updateTotal() {
			this.totalInBolivares = (
				(this.modalEvent.raffle.ticketPrice * this.selectedTickets.length) * this.exchange
			).toFixed(2);
		},

		async notifyTicketPayment(evento) {
			try {
				// Validation
				if (!this.paymentFile) {
					throw new Error('La captura de pago es requerida.');
				}
				if (!this.selectedTickets || this.selectedTickets.length === 0) {
					throw new Error('Debe seleccionar al menos un boleto.');
				}

				this.isSubmitting = true;

				// Fetch user details
				const userId = this.userId;
				const userRef = dbRef(db, `Users/${userId}`);
				const userSnapshot = await get(userRef);
				if (!userSnapshot.exists()) {
					throw new Error('Usuario no encontrado.');
				}
				const user = userSnapshot.val();

				// Get the current date to set the paymentDate
				const uploadPaymentDate = new Date();
				const formattedDate = uploadPaymentDate.toISOString();

				// Upload payment file
				const paymentUrl = await this.uploadPaymentFile(this.paymentFile, this.paymentDate);
				console.log('File uploaded successfully:', paymentUrl);

				// Update raffle's sold tickets
				const raffleRef = dbRef(db, `Events/${evento.id}`);
				const raffleSnapshot = await get(raffleRef);
				if (!raffleSnapshot.exists()) {
					throw new Error('Rifa no encontrada.');
				}
				const raffle = raffleSnapshot.val();

				const newTickets = this.selectedTickets.map(ticket => ({
					ticketNumber: ticket,
					clientId: userId,
					paymentDate: formattedDate,
				}));

				const updatedSoldTickets = raffle.raffle.soldTickets
					? [...raffle.raffle.soldTickets, ...newTickets]
					: newTickets;

				await update(raffleRef, {
					'raffle/soldTickets': updatedSoldTickets,
				});

				const paymentDetails = {
					raffle_id: evento.id,
					client_id: userId,
					amountPaid: this.totalInBolivares,
					date: formattedDate,
					paymentUrl: paymentUrl,
					approved: false,
					type: 'raffle'
				}

				// Save the payment to the payments collection
				const paymentRef = dbRef(db, `Payments/${userId}-${formattedDate.split('T')[0]}`);
				await set(paymentRef, paymentDetails);

				// Update the user's raffle record
				const userRaffleData = {
					raffle_id: evento.id,
					ticketsBought: this.selectedTickets,
					paymentUploaded: true,
					paymentDate: formattedDate,
					paymentUrl: paymentUrl,
				};
				const userRaffleRef = dbRef(db, `Users/${userId}/raffles/${evento.id}`);
				await update(userRaffleRef, userRaffleData);

				// // Notify client
				// const appUrl = 'https://app.rosecoupon.com';
				// const userEmailPayload = {
				//     to: user.email,
				//     message: {
				//         subject: `Suscripción ${plan.name.toUpperCase()} activada`,
				//         text: `Hola ${userName}, se le ha activado la Suscripción ${plan.name.toUpperCase()} in Roseapp.
				//         Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
				//         html: `<p>Hola ${userName}, se le ha activado la Suscripción ${plan.name} in Roseapp.</p>
				//         <p>Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}</p>`
				//     },
				// };
				// await this.sendNotificationEmail(userEmailPayload);

				// Notify Admin
				// const adminEmailPayload = {
				//     to: 'roseindustry11@gmail.com',
				//     message: {
				//         subject: `Un usuario compró tickets!`,
				//         text: `El ${this.role.toUpperCase()}, ${this.userName}, ha comprado ${this.selectedTickets.length} tickets para la rifa ${evento.name}.`,
				//         html: `<p>El ${this.role.toUpperCase()}, ${this.userName}, ha comprado ${this.selectedTickets.length} tickets para la rifa ${evento.name}.</p>`
				//     },
				// };
				// await this.sendNotificationEmail(adminEmailPayload);

				//Success toast

				showToast('Boletos comprados exitosamente!');

				//reset the image previews
				this.paymentPreview = null;

				// Hide the modal after submission
				const paymentModal = Modal.getOrCreateInstance(document.getElementById('buyTicketModal'));
				paymentModal.hide();

			} catch (error) {
				console.error('Error during uploading:', error);
				alert("Error al subir el archivo, por favor intente nuevamente.");
			} finally {
				// Hide the loader
				this.isSubmitting = false;
			}
		},
		async uploadPaymentFile(file, date) {
			// Define storage reference for front or back ID file
			const fileName = `${date}-capture.${file.name.split('.').pop()}`;
			const fileRef = storageRef(storage, `raffle-payments/${this.userId}-${this.userName}/${fileName}`);

			// Upload the file and get the download URL
			await uploadBytes(fileRef, file);
			return getDownloadURL(fileRef);
		},

		// Fetch client's raffle tickets
		async fetchClientTickets(evento) {
			try {
				const ticketsRef = dbRef(db, `Users/${this.userId}/raffles/${evento.id}/ticketsBought`);
				const ticketsSnapshot = await get(ticketsRef);
				const tickets = ticketsSnapshot.val();

				// Check if tickets exist and set them accordingly
				if (tickets && Object.keys(tickets).length > 0) {
					this.clientTickets = tickets; // Client has tickets
				} else {
					this.clientTickets = []; // No tickets
				}

			} catch (error) {
				console.error('Error fetching tickets:', error);
				this.clientTickets = [];
			}
		},
		async openTicketsModal(evento) {
			await this.fetchClientTickets(evento);

			if (this.clientTickets.length === 0) {
				this.noTicketsMessage = "No has comprado tickets para este evento aún."; // Message for no tickets
			} else {
				this.noTicketsMessage = ""; // Clear the message if tickets are found
			}

			this.$nextTick(() => {
				const modalElement = document.getElementById('myTicketsModal');
				if (modalElement) {
					const modal = Modal.getOrCreateInstance(modalElement);
					modal.show();
				} else {
					console.error('Modal element not found in the DOM');
				}
			});
		}
	},
	watch: {
		selectedTickets() {
			this.updateTotal();
		},
	},
	async mounted() {
		const userStore = useUserStore();
		userStore.fetchUser();
		this.role = userStore.role;
		this.userId = userStore.userId;
		this.userName = userStore.userName;

		await this.fetchEvents();
		await this.fetchCurrentExchange();
		this.sortEventsByOrder();
	}
}
</script>
<template>
	<div class="container">
		<!-- Header -->
		<PageHeader :isAdmin="this.role === 'admin' ? true : false" title="Eventos" icon="fa fa-calendar-days" :actions="[
            {
                icon: 'fa fa-plus-circle',
                text: 'Nuevo Evento',
                class: 'btn-theme',
                onClick: () => handleCreateEvent()
            }
        ]" />

		<!-- Admin view -->
		<div v-if="this.role === 'admin'">
			<!-- Loading State -->
			<div v-if="loading" class="text-center py-5">
				<div class="spinner-border text-primary" role="status">
					<span class="visually-hidden">Cargando...</span>
				</div>
			</div>

			<!-- Empty State -->
			<div v-else-if="events.length === 0" class="text-center py-5">
				<div class="mb-3">
					<i class="fa fa-calendar-days text-secondary opacity-25" style="font-size: 5em"></i>
				</div>
				<h5 class="text-secondary">No hay Eventos disponibles</h5>
			</div>

			<!-- Events list -->
			<div v-else class="row">
				<!-- Loop through events and display them in cards -->
				<div class="row">
							<div v-for="(evento, index) in events" :key="evento.id" class="col-12 col-sm-6 col-md-4 mb-4">
								<div class="card h-100 position-relative">

									<!-- Image Display -->
									<div class="img-container position-relative">
										<div v-if="!evento.isEditing" class="img"
											:style="{ backgroundImage: 'url(' + evento.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
										</div>
										<div v-if="evento.isEditing">
											<div v-if="evento.updatedImagePreview" class="mt-2">
												<img :src="evento.updatedImagePreview" class="img-thumbnail" alt="preview"
													style="max-height: 200px;">
											</div>
											<input type="file" @change="event => previewUpdatedImage(event, evento)"
												class="form-control" />
										</div>
									</div>

									<!-- Event Information -->
									<div class="card-body d-flex flex-column">
										<h5 class="card-title text-truncate">{{ evento.name }}</h5>
										<p class="card-text"><strong>Fecha: </strong>{{ formatDate(evento.date) }}</p>
										<p class="card-text"><strong>Tipo de Evento: </strong>{{
											evento.type.charAt(0).toUpperCase() + evento.type.slice(1) }}</p>

										<!-- Event's Affiliates -->
										<div v-if="evento.type === 'Rifa' && evento.raffleAffiliate">
											<p class="card-text"><strong>{{ evento.type === 'Rifa' ? `Comercio Afiliado:` :
												`Comercios Afiliados` }}</strong></p>
											<div class="row">
												<div class="col mb-3">
													<div class="affiliate-logo" style="max-width: 80px; margin: 0 auto;">
														<!-- Affiliate Image -->
														<div class="img-thumbnail p-1"
															:style="{ backgroundImage: 'url(' + evento.raffleAffiliate.image + ')', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', height: '50px', width: '50px', borderRadius: '50%' }">
														</div>
														<!-- Affiliate Info -->
														<div class="mt-2">
															<h6 class="small">
																<strong>{{ evento.raffleAffiliate.companyName }}</strong>
															</h6>
														</div>
													</div>
												</div>
											</div>
										</div>
										<div v-else class="row">
											<div v-for="affiliate in evento.affiliates" :key="affiliate.id"
												class="col mb-3">
												<div class="affiliate-logo" style="max-width: 80px; margin: 0 auto;">
													<!-- Affiliate Image -->
													<div v-if="affiliate.image" class="img-thumbnail p-1"
														:style="{ backgroundImage: 'url(' + affiliate.image + ')', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', height: '50px', width: '50px', borderRadius: '50%' }">
													</div>
													<!-- Affiliate Info -->
													<div class="mt-2">
														<h6 class="small">
															<strong>{{ affiliate.companyName }}</strong>
														</h6>
													</div>
												</div>
											</div>
										</div>

										<!-- Action Buttons -->
										<div class="d-flex justify-content-end mt-2">
											<button class="btn btn-sm btn-theme me-1" @click="openSoldTicketsModal(evento)">
												<i class="fa-solid fa-list"></i> Tickets
											</button>
											<button class="btn btn-sm btn-outline-info me-1"
												@click="editEvent(evento), fetchAffiliates()">
												<i class="fa-solid fa-pencil"></i>
											</button>
											<button class="btn btn-sm btn-outline-danger"
												@click="deleteEvent(evento.id, index)">
												<i class="fa-solid fa-trash"></i>
											</button>
										</div>
									</div>
								</div>
							</div>
				</div>
			</div>

			<!-- Modal for creating new event -->
			<div class="modal fade" id="createEventModal" tabindex="-1" aria-labelledby="createEventModalLabel"
				aria-hidden="true">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="createEventModalLabel">Crear Evento</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							<div class="container">
								<!-- Event Type -->
								<div class="row justify-content-center mb-3">
									<div class="col-12">
										<label for="eventType" class="form-label">Tipo de Evento</label>
										<div class="dropdown">
											<button class="btn btn-secondary dropdown-toggle" type="button"
												id="dropdownTypeButton" data-bs-toggle="dropdown" aria-expanded="false">
												{{ event.type || 'Seleccione...' }}
											</button>
											<ul class="dropdown-menu" aria-labelledby="dropdownTypeButton">
												<li v-for="type in eventTypes" :key="type">
													<a class="dropdown-item" href="#" @click="selectEventType(type)">
														{{ type }}
													</a>
												</li>
											</ul>
										</div>
									</div>
								</div>

								<!-- Shared Fields -->
								<div class="row">
									<div class="col-lg-6 mb-3">
										<label for="eventName" class="form-label">Nombre</label>
										<input type="text" class="form-control" id="eventName" v-model="event.name" />
									</div>
									<div class="col-lg-6 mb-3">
										<label for="eventOrder" class="form-label">Orden</label>
										<input type="number" class="form-control" id="eventOrder" v-model="event.order" />
									</div>
								</div>
								<div class="row">
									<div class="col-lg-6 mb-3">
										<label for="eventDate" class="form-label">Fecha</label>
										<input type="date" v-model="event.date" class="form-control" />
									</div>
									<div class="col-lg-6 mb-3">
										<label for="eventStatus" class="form-label">Estado</label>
										<select class="form-select" v-model="event.status">
											<option value="true">Activo</option>
											<option value="false">Inactivo</option>
										</select>
									</div>
								</div>
								<div class="row">
									<div class="col-lg-12 mb-3">
										<label for="eventDesc" class="form-label">Descripción</label>
										<textarea class="form-control" id="eventDesc" v-model="event.desc"></textarea>
									</div>
								</div>

								<!-- Rifa Specific Fields -->
								<div v-if="event.type === 'Rifa'">
									<div class="row">
										<div class="col-lg-6 mb-3">
											<label for="raffleAffiliate" class="form-label">Comercio Afiliado</label>
											<div class="dropdown">
												<button class="btn btn-secondary dropdown-toggle" type="button"
													id="dropdownRaffleAffiliate" data-bs-toggle="dropdown"
													aria-expanded="false">
													{{ event.raffle.affiliateId ? affiliates.find(a => a.id ===
														event.raffle.affiliateId).companyName : 'Seleccione...' }}
												</button>
												<ul class="dropdown-menu scrollable-dropdown"
													aria-labelledby="dropdownRaffleAffiliate">
													<li v-for="aff in affiliates" :key="aff.id">
														<a class="dropdown-item" href="#"
															@click="selectRaffleAffiliate(aff.id)">
															{{ aff.companyName }}
														</a>
													</li>
												</ul>
											</div>
										</div>
									</div>
									<div class="row">
										<div class="col-lg-4 mb-3">
											<label for="raffleLimitDate" class="form-label">Fecha límite para comprar
												números</label>
											<input type="date" v-model="event.raffle.purchaseDeadline" class="form-control"
												id="raffleLimitDate" />
										</div>
										<div class="col-lg-4 mb-3">
											<label for="raffleticketLimit" class="form-label">Total de números</label>
											<input type="number" v-model="event.raffle.ticketLimit" class="form-control"
												id="raffleticketLimit" />
										</div>
										<div class="col-lg-4 mb-3">
											<label for="rafflePrice" class="form-label">Precio por número</label>
											<div class="input-group mt-2">
												<span class="input-group-text text-wrap" id="price-addon">$</span>
												<input id="rafflePrice" type="number" class="form-control"
													v-model="event.raffle.ticketPrice" aria-label="Monto"
													aria-describedby="price-addon">
											</div>
										</div>
									</div>
								</div>

								<!-- Fiesta Specific Fields -->
								<div v-if="event.type === 'Fiesta'">
									<div class="row">
										<div class="col-lg-6 mb-3">
											<label for="eventAffiliate" class="form-label">Comercios Afiliados</label>
											<div class="dropdown">
												<button class="btn btn-secondary dropdown-toggle" type="button"
													id="dropdownMenuCategory" data-bs-toggle="dropdown"
													data-bs-auto-close="false" aria-expanded="false">
													{{ selectedAffiliateIds.length > 0 ? selectedAffiliateIds.map(id =>
														affiliates.find(aff => aff.id === id).companyName).join(', ') :
														'Seleccione...' }}
												</button>
												<ul class="dropdown-menu" aria-labelledby="dropdownMenuCategory">
													<li v-if="affiliates.length === 0">
														<p style="margin: 10px;">No hay afiliados registrados.</p>
													</li>
													<li v-for="aff in affiliates" :key="aff.id">
														<div class="form-check" style="margin: 10px;">
															<input type="checkbox" class="form-check-input"
																:id="'dropdownCheck_' + aff.id" :value="aff.id"
																v-model="selectedAffiliateIds">
															<label class="form-check-label"
																:for="'dropdownCheck_' + aff.id">
																{{ aff.companyName }}
															</label>
														</div>
													</li>
												</ul>
											</div>
										</div>
									</div>
								</div>

								<!-- Upload Image -->
								<div class="row" v-if="uploadImage">
									<div class="col-lg-12 mb-3">
										<label for="eventImg" class="form-label">Imagen</label>
										<input type="file" class="form-control" id="eventImg" @change="previewImage"
											accept="image/*" />
										<div v-if="imagePreview" class="mt-2">
											<img :src="imagePreview" class="img-thumbnail" alt="preview"
												style="max-height: 200px;" />
										</div>
									</div>
								</div>
								<div class="form-check">
									<input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
										v-model="uploadImage">
									<label class="form-check-label" for="uploadImageCheckbox">Subir imagen del
										evento</label>
								</div>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>

							<button v-if="event.type === 'Rifa'" type="button" :disabled="isSubmitting"
								@click="createRaffle()" class="btn btn-theme">
								<span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<span v-else>Crear Rifa</span>
							</button>

							<button v-if="event.type === 'Fiesta'" type="button" :disabled="isSubmitting"
								@click="createEvent()" class="btn btn-theme">
								<span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<span v-else>Crear Fiesta</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Modal for editing an event -->
			<div class="modal fade" id="editEventModal" tabindex="-1" aria-labelledby="editEventModalLabel"
				aria-hidden="true">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="editEventModalLabel">Editar Evento</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							<div class="container">
								<!-- Event Type -->
								<div class="row justify-content-center mb-3">
									<div class="col-12">
										<label for="eventType" class="form-label">Tipo de Evento</label>
										<div class="dropdown">
											<button class="btn btn-secondary dropdown-toggle" type="button"
												id="dropdownTypeButton" data-bs-toggle="dropdown" aria-expanded="false">
												{{ editEventData.type || 'Seleccione...' }}
											</button>
											<ul class="dropdown-menu" aria-labelledby="dropdownTypeButton">
												<li v-for="type in eventTypes" :key="type">
													<a class="dropdown-item" href="#" @click="editEventType(type)">
														{{ type }}
													</a>
												</li>
											</ul>
										</div>
									</div>
								</div>

								<!-- Shared Fields -->
								<div class="row">
									<div class="col-lg-6 mb-3">
										<label for="eventName" class="form-label">Nombre</label>
										<input type="text" class="form-control" id="eventName"
											v-model="editEventData.name" />
									</div>
									<div class="col-lg-6 mb-3">
										<label for="eventOrder" class="form-label">Orden</label>
										<input type="number" class="form-control" id="eventOrder"
											v-model="editEventData.order" />
									</div>
								</div>
								<div class="row">
									<div class="col-lg-6 mb-3">
										<label for="eventDate" class="form-label">Fecha</label>
										<input type="date" v-model="editEventData.date" class="form-control" />
									</div>
									<div class="col-lg-6 mb-3">
										<label for="eventStatus" class="form-label">Estado</label>
										<select class="form-select" v-model="editEventData.status">
											<option value="true">Activo</option>
											<option value="false">Inactivo</option>
										</select>
									</div>
								</div>
								<div class="row">
									<div class="col-lg-12 mb-3">
										<label for="eventDesc" class="form-label">Descripción</label>
										<textarea class="form-control" id="eventDesc"
											v-model="editEventData.desc"></textarea>
									</div>
								</div>

								<!-- Raffle Specific Fields -->
								<div v-if="editEventData.type === 'Rifa'">
									<div class="row">
										<div class="col-lg-6 mb-3">
											<label for="raffleAffiliate" class="form-label">Comercio Afiliado</label>
											<div class="dropdown">
												<button class="btn btn-secondary dropdown-toggle" type="button"
													id="dropdownRaffleAffiliate" data-bs-toggle="dropdown"
													aria-expanded="false">
													{{ editEventData.raffle?.affiliateId ? affiliates.find(a => a.id ===
														editEventData.raffle.affiliateId)?.companyName : 'Seleccione...' }}
												</button>
												<ul class="dropdown-menu" aria-labelledby="dropdownRaffleAffiliate">
													<li v-for="aff in affiliates" :key="aff.id">
														<a class="dropdown-item" href="#"
															@click="editRaffleAffiliate(aff.id)">
															{{ aff.companyName }}
														</a>
													</li>
												</ul>
											</div>
										</div>
									</div>
									<div class="row">
										<div class="col-lg-4 mb-3">
											<label for="raffleLimitDate" class="form-label">Fecha límite para comprar
												números</label>
											<input type="date" v-model="editEventData.raffle.purchaseDeadline"
												class="form-control" id="raffleLimitDate" />
										</div>
										<div class="col-lg-4 mb-3">
											<label for="raffleTicketLimit" class="form-label">Total de números</label>
											<input type="number" v-model="editEventData.raffle.ticketLimit"
												class="form-control" id="raffleTicketLimit" />
										</div>
										<div class="col-lg-4 mb-3">
											<label for="rafflePrice" class="form-label">Precio por número</label>
											<div class="input-group mt-2">
												<span class="input-group-text text-wrap" id="price-addon">$</span>
												<input id="rafflePrice" type="number" class="form-control"
													v-model="editEventData.raffle.ticketPrice" aria-label="Monto"
													aria-describedby="price-addon">
											</div>
										</div>
									</div>
								</div>

								<!-- Fiesta Specific Fields -->
								<div v-if="editEventData.type === 'Fiesta'">
									<div class="row">
										<div class="col-lg-6 mb-3">
											<label for="eventAffiliate" class="form-label">Comercios Afiliados</label>
											<div class="dropdown">
												<button class="btn btn-secondary dropdown-toggle" type="button"
													id="dropdownMenuAffiliate" data-bs-toggle="dropdown"
													data-bs-auto-close="false" aria-expanded="false">
													{{ selectedAffiliateIds.length > 0 ? selectedAffiliateIds.map(id =>
														affiliates.find(aff => aff.id === id).companyName).join(', ') :
														'Seleccione...' }}
												</button>
												<ul class="dropdown-menu dropdown-toggle"
													aria-labelledby="dropdownMenuAffiliate">
													<li v-for="aff in affiliates" :key="aff.id">
														<div class="form-check" style="margin: 10px;">
															<input type="checkbox" class="form-check-input"
																:id="'dropdownCheck_' + aff.id" :value="aff.id"
																v-model="selectedAffiliateIds">
															<label class="form-check-label"
																:for="'dropdownCheck_' + aff.id">
																{{ aff.companyName }}
															</label>
														</div>
													</li>
												</ul>
											</div>
										</div>
									</div>
								</div>

								<!-- Upload Image -->
								<!-- <div class="row" v-if="uploadImage">
									<div class="col-lg-12 mb-3">
										<label for="eventImg" class="form-label">Imagen</label>
										<input type="file" class="form-control" id="eventImg" @change="previewImage"
											accept="image/*" />
										<div v-if="imagePreview" class="mt-2">
											<img :src="imagePreview" class="img-thumbnail" alt="preview"
												style="max-height: 200px;" />
										</div>
									</div>
								</div>
								<div class="form-check">
									<input type="checkbox" class="form-check-input" id="uploadImageCheckbox"
										v-model="uploadImage">
									<label class="form-check-label" for="uploadImageCheckbox">Subir imagen del
										evento</label>
								</div> -->
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
							<button type="button" class="btn btn-theme" @click="updateEvent(editEventData.id)"
								:disabled="isSubmitting">Guardar Cambios</button>
							<div v-if="isSubmitting" class="d-flex justify-content-center my-3">
								<div class="spinner-border text-primary" role="status">
									<span class="visually-hidden">Cargando...</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- ADMIN Visualize bought Tickets -->
			<div v-if="raffleTickets" class="modal fade" id="TicketsModal" tabindex="-1" aria-labelledby="TicketsModalLabel"
				aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="TicketsModalLabel">Tickets comprados</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							<!-- Tickets -->
							<div class="d-flex justify-content-center flex-wrap gap-2 mb-3">
								<button v-for="ticket in modalEvent?.raffle?.ticketLimit" :key="ticket"
									:disabled="raffleTickets.some(soldTicket => soldTicket.ticketNumber === ticket)" :class="[
										'btn',
										'rounded-circle',
										'ticket-button',
										'btn-outline-secondary',
										{
											'btn-disabled': raffleTickets.some(soldTicket => soldTicket.ticketNumber === ticket)
										}]" style="width: 50px; height: 50px;">
									{{ ticket }}
								</button>
							</div>
							<div class="table-responsive">
								<!-- For admins: show ticketNumber, clientId, and purchasedDate -->
								<table class="table table-bordered table-responsive text-center">
									<thead>
										<tr>
											<th>Número de Ticket</th>
											<th>Cliente</th>
											<th>Cédula</th>
											<th>Fecha de Compra</th>
										</tr>
									</thead>
									<tbody>
										<tr v-if="raffleTickets.length === 0">
											<td colspan="4" class="text-center">
												<i class="fas fa-exclamation-circle"></i> No hay tickets comprados aún.
											</td>
										</tr>
										<tr v-for="ticket in raffleTickets" :key="ticket.ticketNumber">
											<td>{{ ticket.ticketNumber }}</td>
											<td>{{ ticket.clientName }}</td>
											<td>{{ ticket.cedula }}</td>
											<td>{{ formatDate(ticket.paymentDate) }}</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Client view -->
		<div v-if="this.role === 'cliente'">
			<div class="row">
				<!-- Loading State -->
				<div v-if="loading" class="text-center py-5">
					<div class="spinner-border text-primary" role="status">
						<span class="visually-hidden">Cargando...</span>
					</div>
				</div>

				<!-- Empty State -->
				<div v-else-if="events.length === 0" class="text-center py-5">
						<div class="mb-3">
							<i class="fa fa-calendar-days text-secondary opacity-25" style="font-size: 5em"></i>
						</div>
						<h5 class="text-secondary">No hay Eventos disponibles</h5>
				</div>

				<!-- Events list -->
				<div v-else class="row">
						<div v-for="evento in events" :key="evento.id" class="col-12 col-sm-6 col-md-4 mb-4">
								<div class="card h-100 position-relative">
									<div class="img-container position-relative">
										<!-- Image Display -->
										<div class="img"
											:style="{ backgroundImage: 'url(' + evento.image + ')', backgroundSize: 'cover', backgroundPosition: 'center', height: '200px' }">
										</div>
									</div>

									<div class="card-body d-flex flex-column">
										<h5 class="card-title text-truncate">{{ evento.name }}</h5>
										<p class="card-text"><strong>Fecha: </strong>{{ formatDate(evento.date) }}</p>
										<p class="card-text"><strong>Tipo de Evento: </strong>{{
											evento.type.charAt(0).toUpperCase() + evento.type.slice(1) }}</p>

										<!-- Event's Affiliates -->
										<p class="card-text"><strong>{{ evento.type === 'Rifa' ? `Comercio Afiliado:` :
											`Comercios Afiliados` }}</strong></p>
										<div v-if="evento.type === 'Fiesta'" class="row">
											<div v-for="affiliate in evento.affiliates" :key="affiliate.id"
												class="col mb-3">
												<div class="affiliate-logo" style="max-width: 80px; margin: 0 auto;">
													<!-- Affiliate Image -->
													<div v-if="affiliate.image" class="img-thumbnail p-1"
														:style="{ backgroundImage: 'url(' + affiliate.image + ')', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', height: '50px', width: '50px', borderRadius: '50%' }">
													</div>
													<!-- Affiliate Info -->
													<div class="mt-2">
														<h6 class="small">
															<strong>{{ affiliate.companyName }}</strong>
														</h6>
													</div>
												</div>
											</div>
										</div>
										<div v-if="evento.type === 'Rifa' && evento.raffleAffiliate">
											<div class="row">
												<div class="col mb-3">
													<div class="affiliate-logo" style="max-width: 80px; margin: 0 auto;">
														<!-- Affiliate Image -->
														<div class="img-thumbnail p-1"
															:style="{ backgroundImage: 'url(' + evento.raffleAffiliate.image + ')', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', height: '50px', width: '50px', borderRadius: '50%' }">
														</div>
														<!-- Affiliate Info -->
														<div class="mt-2">
															<h6 class="small">
																<strong>{{ evento.raffleAffiliate.companyName }}</strong>
															</h6>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>

									<div v-if="evento.type === 'Rifa'" class="card-footer text-center">
										<a href="#" @click.prevent="buyTicket(evento)" class="btn btn-outline-success me-2">
											<i class="fa-solid fa-ticket"></i> Comprar Ticket
										</a>
										<a href="#" @click.prevent="openTicketsModal(evento)"
											class="btn btn-outline-success">
											<i class="fa-solid fa-ticket"></i> Mis Tickets
										</a>
									</div>

									<div v-if="evento.type === 'Fiesta'" class="card-footer text-center">
										<a :href="`https://wa.me/${evento.raffleAffiliate.phoneNumber}?text=Hola,%20deseo%20realizar%20una%20reserva.%20Y%20obtener%20mi%20cupon%20de%20rose%20app`"
											target="_blank" class="btn btn-outline-success">
											<i class="fa-brands fa-whatsapp"></i> Comprar entrada
										</a>
									</div>
								</div>
						</div>
				</div>
			</div>

			<!-- Modals -->
			<!-- Purchase tickets -->
			<div v-if="modalEvent" class="modal fade" id="buyTicketModal" tabindex="-1"
				aria-labelledby="buyTicketModalLabel" aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="buyTicketModalLabel">Selecciona uno o mas Tickets</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							<!-- Event Details -->
							<div class="mb-3">
								<p class="mb-1 text-muted">Descripción:</p>
								<p>{{ modalEvent.desc }}</p>
							</div>
							<div class="row">
								<div class="col-md-12 mb-3">
									<p class="mb-1 text-muted">Fecha:</p>
									<div :class="isPastDate(modalEvent.date) ? 'text-danger' : 'text-success'">
										<span>{{ formattedDate(modalEvent.date) }}</span>
									</div>
								</div>
								<div class="col-md-6 mb-3">
									<p class="mb-1 text-muted">Precio por Ticket:</p>
									<p class="text-primary fw-bold">{{ modalEvent.raffle.ticketPrice.toFixed(2) }} USD</p>
								</div>
								<div class="col-md-6 mb-3">
									<p class="mb-1 text-muted">Tasa:</p>
									<p class="text-primary fw-bold">{{ exchange }} Bs</p>
								</div>
								<div class="col-md-6 mb-3">
									<p class="mb-1 text-muted">Total en Divisas:</p>
									<p class="text-primary fw-bold">{{ (modalEvent.raffle.ticketPrice *
										selectedTickets.length).toFixed(2) }} USD</p>
								</div>
								<div class="col-md-6 mb-3">
									<p class="mb-1 text-muted">Total en Bolívares:</p>
									<input type="number" class="form-control text-primary fw-bold"
										v-model="totalInBolivares" style="width: auto;" disabled />
								</div>

								<div class="d-flex justify-contents-center mb-3">
									<a href="#" @click.prevent="togglePaymentMethods">
										{{ showPaymentMethods ? "Ocultar métodos de pago" : "Mostrar métodos de pago" }}
									</a>
								</div>

								<!-- Payment methods -->
								<div v-if="showPaymentMethods" class="card mb-3">
									<h4 class="text-center">Métodos de Pago</h4>
									<h6><u>Pago Móvil</u></h6>
									<div class="card-text">
										<strong>Banco: </strong>Banco Provincial
									</div>
									<div class="card-text">
										<strong>Teléfono: </strong>04246003370
										<button class="btn btn-sm btn-secondary ms-2"
											@click="copyToClipboard('04246003370')">
											<i class="fa fa-copy"></i>
										</button>
									</div>
									<div class="card-text">
										<strong>RIF: </strong>J506221772
										<button class="btn btn-sm btn-secondary ms-2"
											@click="copyToClipboard('J506221772')">
											<i class="fa fa-copy"></i>
										</button>
									</div>
								</div>

								<div class="col-12 mb-3">
									<label for="payment" class="form-label">Captura de Pago</label>
									<input type="file" class="form-control" id="payment" @change="handleFileUpload($event)"
										required style="width: auto;">
									<img v-if="paymentPreview" :src="paymentPreview" alt="payment preview"
										class="img-fluid mt-2" />
								</div>
							</div>
							<hr />

							<!-- Tickets -->
							<p class="mb-3 text-muted">Selecciona tu(s) ticket(s):</p>
							<div class="d-flex flex-wrap gap-2">
								<button v-for="ticket in modalEvent.raffle.ticketLimit" :key="ticket"
									:disabled="modalEvent.raffle.soldTickets.includes(ticket)" @click="selectTicket(ticket)"
									:class="[
										'btn',
										'rounded-circle',
										'ticket-button',
										{
											'btn-primary': selectedTickets.includes(ticket),
											'btn-outline-secondary': !selectedTickets.includes(ticket),
											'btn-disabled': modalEvent.raffle.soldTickets.includes(ticket),
										}]" style="width: 50px; height: 50px;">
									{{ ticket }}
								</button>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>

							<button type="button" :disabled="isSubmitting || selectedTickets.length === 0"
								@click="notifyTicketPayment(modalEvent)" class="btn btn-theme">
								<span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
									aria-hidden="true"></span>
								<span v-else>Notificar Pago</span>
							</button>
						</div>
					</div>
				</div>
			</div>
			<!-- Display tickets bought -->
			<div v-if="clientTickets" class="modal fade" id="myTicketsModal" tabindex="-1"
				aria-labelledby="myTicketsModalLabel" aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="myTicketsModalLabel">Tickets comprados</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							<!-- If no tickets are purchased, show the no tickets message -->
							<div v-if="clientTickets.length === 0" class="text-center">
								<i class="fas fa-exclamation-circle"></i>
								<p>No hay tickets comprados aún</p>
							</div>
							<!-- If tickets are purchased, display them -->
							<div v-else class="d-flex justify-content-center flex-wrap gap-2">
								<button v-for="ticket in clientTickets" :key="ticket"
									:class="['btn', 'btn-disabled', 'rounded-circle', 'ticket-button']"
									style="width: 50px; height: 50px;">
									{{ ticket }}
								</button>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<style>
.ticket-button.btn-disabled {
	background-color: #ddd;
	color: #999;
	pointer-events: none;
}

.card {
	padding: 15px;
	border-radius: 10px;
	transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.scrollable-dropdown {
	max-height: 200px;
	/* Adjust the height as needed */
	overflow-y: auto;
	/* Enable vertical scrolling */
}

.btn-theme {
	background-color: purple;
	border-color: purple;
}
.btn-outline-theme, .btn-theme {
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
}
</style>