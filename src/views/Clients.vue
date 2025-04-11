<script>
import { ref as dbRef, query, orderByChild, equalTo, get, push, set, update, remove } from 'firebase/database';
import { ref as storageRef, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, functions } from '@/firebase/init';
import { httpsCallable } from 'firebase/functions';
import { Modal } from 'bootstrap';
import { toast as showToast } from '@/utils/toast';
import { sendEmail } from '@/utils/emailService';
import 'toastify-js/src/toastify.css'
import * as XLSX from "xlsx";
import venezuela from 'venezuela';

export default {
    data() {
        return {
            client: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
            },
            selectedClient: {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
                state: '',
                municipio: '',
                parroquia: ''
            },

            venezuelanStates: [
                "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas",
                "Bolívar", "Carabobo", "Cojedes", "Delta Amacuro", "Distrito Capital",
                "Falcón", "Guárico", "Lara", "Mérida", "Miranda",
                "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira",
                "Trujillo", "Vargas", "Yaracuy", "Zulia"
            ],
            municipios: [],
            parroquias: [],

            clients: [],
            clientCoupons: [],
            clientPreferences: [],
            currentEditing: null,
            searchQuery: null,
            modalImageUrl: '',
            paymentUrl: null,
            isSubmitting: false,
            loading: false,

            currentPage: 1,
            itemsPerPage: 10,
            paymentClient: '',
            expandedClients: new Set(),
            loadingStates: {},
            verificationFilter: 'all'
        }
    },
    async mounted() {
        await this.fetchClients();
        
    },
    computed: {
        filteredUsers() {
            // Start with search filter
            const trimmedSearchQuery = this.searchQuery?.trim().toLowerCase();
            let filtered = this.clients;
            
            if (trimmedSearchQuery) {
                filtered = this.clients.filter(client => {
                    // Basic fields search
                const identification = client.identification?.toString().toLowerCase() || '';
                const firstName = client.firstName?.toLowerCase() || '';
                const lastName = client.lastName?.toLowerCase() || '';

                    // Combined full name (both firstName + lastName)
                    const fullName = `${firstName} ${lastName}`.toLowerCase();
                    const reversedFullName = `${lastName} ${firstName}`.toLowerCase();

                    // Search in individual fields and combined names
                    return identification.includes(trimmedSearchQuery) ||
                    firstName.includes(trimmedSearchQuery) ||
                           lastName.includes(trimmedSearchQuery) ||
                           fullName.includes(trimmedSearchQuery) ||
                           reversedFullName.includes(trimmedSearchQuery);
                });
            }
            
            // Apply verification filter
            if (this.verificationFilter !== 'all') {
                filtered = filtered.filter(client => {
                    switch (this.verificationFilter) {
                        case 'verified':
                            return client.isVerified === true;
                        case 'pending':
                            return client.requestedVerification === true && client.isVerified !== true;
                        case 'unverified':
                            return !client.requestedVerification && !client.isVerified;
                        default:
                            return true;
                    }
                });
            }
            
            return filtered;
        },
        paginatedFilteredUsers() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.filteredUsers.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        },

        visiblePages() {
            // Adjust the number of visible page links based on screen width
            const totalPages = this.totalPages;
            const currentPage = this.currentPage;
            const maxPagesToShow = window.innerWidth < 768 ? 3 : 5;

            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(totalPages, currentPage + Math.floor(maxPagesToShow / 2));

            // Adjust the start and end if they go out of bounds
            if (endPage - startPage + 1 < maxPagesToShow) {
                if (currentPage < totalPages / 2) {
                    endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                } else {
                    startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }
            }

            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
        },
        verificationCounts() {
            const counts = {
                all: this.clients.length,
                verified: 0,
                pending: 0,
                unverified: 0
            };
            
            this.clients.forEach(client => {
                if (client.isVerified) {
                    counts.verified++;
                } else if (client.requestedVerification) {
                    counts.pending++;
                } else {
                    counts.unverified++;
                }
            });
            
            return counts;
        }
    },
    methods: {
        displayMunicipios(state) {
            const z = venezuela.estado(state, { municipios: true });
            const munis = z.municipios;
            if (munis) {
                this.municipios = munis;
            }
        },
        displayParroquias(municipio) {
            const y = venezuela.municipio(municipio, { parroquias: true });
            this.parroquias = y.parroquias;
        },

        async fetchClients() {
            const role = 'cliente';
            const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo(role));

            try {
                this.loading = true;
                const snapshot = await get(clientRef);
                
                if (!snapshot.exists()) {
                    this.clients = [];
                    return;
                }
                
                // Only fetch basic information initially
                this.clients = Object.entries(snapshot.val()).map(([uid, user]) => ({
                    uid,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    identification: user.identification,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    state: user.state,
                    municipio: user.municipio,
                    parroquia: user.parroquia,
                    isVerified: user.isVerified || false,
                    requestedVerification: user.requestedVerification || false,
                    verificationFiles: user.verificationFiles || null,
                    _detailsLoaded: false // Flag to track if details are loaded
                }));

            } catch (error) {
                console.error('Error fetching clients:', error);
                this.clients = [];
            } finally {
                this.loading = false;
            }
        },

        async toggleClientDetails(client) {
            // Toggle expanded state
            if (this.expandedClients.has(client.uid)) {
                this.expandedClients.delete(client.uid);
                return;
            }

            this.expandedClients.add(client.uid);

            // If details are already loaded, don't fetch again
            if (client._detailsLoaded) return;

            // Set loading state for this client
            this.loadingStates = {
                ...this.loadingStates,
                [client.uid]: true
            };

            try {
                // Fetch all details in parallel
                await Promise.all([
                    this.fetchClientCredit(client),
                    this.fetchClientSubscription(client),
                    this.fetchClientPreferences(client),
                    this.fetchClientCoupons(client),
                    this.fetchIdFiles(client)
                ]);

                // Mark details as loaded
                client._detailsLoaded = true;
            } catch (error) {
                console.error('Error loading client details:', error);
                showToast.error('Error al cargar los detalles del cliente');
            } finally {
                this.loadingStates = {
                    ...this.loadingStates,
                    [client.uid]: false
                };
            }
        },

        async fetchClientCoupons(client) {
            const couponsRef = dbRef(db, `Users/${client.uid}/coupons`);
            const couponsSnapshot = await get(couponsRef);
            this.clientCoupons[client.uid] = couponsSnapshot.exists() ? Object.keys(couponsSnapshot.val()) : [];

            // Further optimize fetching coupon details
            if (this.clientCoupons[client.uid].length > 0) {
                const couponPromises = this.clientCoupons[client.uid].map(async couponId => {
                    const couponRef = dbRef(db, `Coupons/${couponId}`);
                    const couponDetailsSnapshot = await get(couponRef);
                    return couponDetailsSnapshot.exists() ? { id: couponId, ...couponDetailsSnapshot.val() } : null;
                });
                this.clientCoupons[client.uid] = (await Promise.all(couponPromises)).filter(Boolean);
            }
        },

        async fetchClientSubscription(client) {
            try {
            const subscriptionRef = dbRef(db, `Users/${client.uid}/subscription`);
            const subscriptionSnapshot = await get(subscriptionRef);

            if (subscriptionSnapshot.exists()) {
                client.subscription = subscriptionSnapshot.val();
                const subscriptionId = client.subscription.subscription_id;

                    if (subscriptionId) {
                // Query the Suscriptions table to fetch the details
                const subscriptionDataRef = dbRef(db, `Suscriptions/${subscriptionId}`);
                const userSuscriptionSnapshot = await get(subscriptionDataRef);

                if (userSuscriptionSnapshot.exists()) {
                    const userSubscription = userSuscriptionSnapshot.val();
                    // Merge the userSubscription into the client's subscription object
                    client.subscription = {
                        ...client.subscription,
                        ...userSubscription
                    };
                    if (client.subscription.lastPaymentDate) {
                        // In case the client made a payment
                        const paymentDate = (client.subscription.lastPaymentDate).split('T')[0];
                        this.fetchPaymentFiles(client, paymentDate);
                            }
                    }
                }
            } else {
                // Set a default empty subscription if none exist
                    client.subscription = null;
                }
            } catch (error) {
                console.error('Error fetching client subscription:', error);
                client.subscription = null;
            }
        },

        async fetchClientCredit(client) {
            try {
                const creditRef = dbRef(db, `Users/${client.uid}/credit`);
                const creditSnapshot = await get(creditRef);

                if (creditSnapshot.exists()) {
                    const creditData = creditSnapshot.val();

                    // Set default values for missing credit data
                        client.credit = {
                        mainCredit: creditData.main?.totalCredit || 0,
                        availableMainCredit: creditData.main?.availableCredit || 0,
                        plusCredit: creditData.plus?.totalCredit || 0,
                        availablePlusCredit: creditData.plus?.availableCredit || 0
                    };
                } else {
                    // Set default empty credit if none exists
                    client.credit = {
                        mainCredit: 0,
                        availableMainCredit: 0,
                        plusCredit: 0,
                        availablePlusCredit: 0
                    };
                }
            } catch (error) {
                console.error('Error fetching client credit:', error);
                // Set default empty credit on error
                client.credit = {
                    mainCredit: 0,
                    availableMainCredit: 0,
                    plusCredit: 0,
                    availablePlusCredit: 0
                };
            }
        },

        async fetchClientPreferences(client) {
            try {
                // Initialize the preferences array for each client
                this.clientPreferences[client.uid] = {};

                // Fetch the preferences from the user's data in Firebase Realtime Database
                const preferencesRef = dbRef(db, `Users/${client.uid}/preferences`);
                const prefSnapshot = await get(preferencesRef);

                if (prefSnapshot.exists()) {
                    const preferences = prefSnapshot.val();

                    // Fetch categories for the selectedCategories
                    if (preferences.selectedCategories) {
                        const selectedCategories = preferences.selectedCategories;

                        // Initialize each category in clientPreferences
                        for (const categoryId of selectedCategories) {
                            const categoryRef = dbRef(db, `Affiliate_categories/${categoryId}`);
                            const categoryDetailsSnapshot = await get(categoryRef);

                            if (categoryDetailsSnapshot.exists()) {
                                const categoryDetails = categoryDetailsSnapshot.val();
                                // Store the category details in clientPreferences
                                this.clientPreferences[client.uid][categoryId] = {
                                    category: categoryDetails.name,
                                    subcategories: [] // Initialize subcategories
                                };
                            }
                        }
                    }

                    // Fetch subcategories for the selectedSubcategories
                    if (preferences.selectedSubcategories) {
                        const selectedSubcategories = preferences.selectedSubcategories;

                        for (const subcategoryId of selectedSubcategories) {
                            const subcategoryRef = dbRef(db, `Affiliate_subcategories/${subcategoryId}`);
                            const subcategoryDetailsSnapshot = await get(subcategoryRef);

                            if (subcategoryDetailsSnapshot.exists()) {
                                const subcategoryDetails = subcategoryDetailsSnapshot.val();
                                // Find the category to add the subcategory to
                                for (const categoryId in this.clientPreferences[client.uid]) {
                                    // Assuming subcategory is related to its category
                                    if (subcategoryDetails.category_id === categoryId) {
                                        this.clientPreferences[client.uid][categoryId].subcategories.push(subcategoryDetails.name);
                                        break; // Break after adding to the correct category
                                    }
                                }
                            }
                        }
                    }
                } else {
                    this.clientPreferences[client.uid] = {};
                }

            } catch (error) {
                console.error("Error fetching client preferences: ", error);
                this.clientPreferences[client.uid] = {};  // Ensure empty preferences on error
            }
        },
        async fetchIdFiles(client) {
            // Skip fetching if client hasn't requested verification
            if (!client.requestedVerification && !client.verificationFiles) {
                return;
            }
            
            try {
                // Set loading state
                this.loadingStates = {
                    ...this.loadingStates,
                    [client.uid + '_files']: true
                };
                
                // Check if verification files exist in the database
                const verificationFilesRef = dbRef(db, `Users/${client.uid}/verificationFiles`);
                const snapshot = await get(verificationFilesRef);
                
                if (!snapshot.exists()) {
                    // No verification files found
                    client.idFiles = [];
                    return;
                }
                
                const verificationFiles = snapshot.val();
                const idFiles = [];
                
                // Process each file type
                for (const [type, path] of Object.entries(verificationFiles)) {
                    if (path) {
                        try {
                            const url = await getDownloadURL(storageRef(storage, path));
                            idFiles.push({
                                type,
                                url
                            });
                        } catch (error) {
                            console.error(`Error fetching ${type} file:`, error);
                        }
                    }
                }
                
                // Set the ID files on the client object
                client.idFiles = idFiles;
            } catch (error) {
                console.error('Error fetching ID files:', error);
            } finally {
                // Clear loading state
                this.loadingStates = {
                    ...this.loadingStates,
                    [client.uid + '_files']: false
                };
            }
        },
        async fetchPaymentFiles(client, date) {
            try {
                const userName = `${client.firstName} ${client.lastName}`;
                const folderRef = storageRef(storage, `payment-captures/${client.role}/${client.uid}-${userName}`);

                // List all files in the client's payment-captures folder
                const fileList = await listAll(folderRef);

                // Filter files by date (ignoring extension)
                const matchingFile = fileList.items.find(fileRef => fileRef.name.startsWith(date));

                if (matchingFile) {
                    // Get the download URL for the matched file
                    const paymentUrl = await getDownloadURL(matchingFile);

                    // Assign the URL to the client object
                    client.paymentUrl = paymentUrl;
                    console.log('Payment file fetched:', paymentUrl);
                } else {
                    console.log('No payment file found for the given date');
                    client.paymentUrl = null;
                }
            } catch (error) {
                console.error('Error fetching payment file:', error.message || error);
                client.paymentUrl = null;
            }
        },

        async createClient() {
            if (!this.client.firstName || !this.client.lastName || !this.client.identification || !this.client.email) {
                alert('Por favor, complete todos los campos obligatorios: Nombre, Apellido, cedula o email.');
                return;
            }

            try {
                this.isSubmitting = true;

                const userData = {
                    firstName: this.client.firstName,
                    lastName: this.client.lastName,
                    identification: this.client.identification,
                    email: this.client.email,
                    role: 'cliente',
                };

                if (this.client.phoneNumber) {
                    userData.phoneNumber = this.client.phoneNumber;
                }

                // Call Cloud Function to create the client via onRequest
                const response = await fetch('https://us-central1-rose-app-e062e.cloudfunctions.net/createUser', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userData }),
                });

                const result = await response.json();

                if (result.success) {
                    showToast.success("Nuevo Cliente registrado con exito! Se ha enviado la contraseña al correo.");

                    // Reset form
                    this.resetForm();
                    this.fetchClients();
                } else {
                    alert('Error al crear al cliente: ' + result.message);
                }

            } catch (error) {
                console.error('Error creating client:', error);
                alert('Error creating client.');
            } finally {
                this.isSubmitting = false;
            }
        },
        cancelEdit(client) {
            // Reset editing state
            client.isEditing = false;
        },
        async updateClient(client) {
            const clientId = client.uid;

            try {
                this.isSubmitting = true;

                // Create an updateData object, but only include non-empty fields
                const updateData = {};

                if (client.firstName) updateData.firstName = client.firstName;
                if (client.lastName) updateData.lastName = client.lastName;
                if (client.identification) updateData.identification = client.identification;
                if (client.phoneNumber) updateData.phoneNumber = client.phoneNumber;
                if (client.state) updateData.state = client.state;
                if (client.municipio) updateData.municipio = client.municipio;
                if (client.parroquia) updateData.parroquia = client.parroquia;

                // Only proceed if there is something to update
                if (Object.keys(updateData).length > 0) {
                    const userRef = dbRef(db, `Users/${clientId}`);
                    await update(userRef, updateData);

                    // Update email via Cloud Function if the email is changed
                    const newEmail = client.email;
                    if (newEmail && client.email !== newEmail) {
                        // Call the Cloud Function for updating the email
                        const data = {
                            uid: clientId,
                            newEmail: newEmail,
                        };

                        const response = await fetch('https://us-central1-rose-app-e062e.cloudfunctions.net/updateUserEmail', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(data),
                        });

                        const result = await response.json();

                        if (response.ok) {
                            console.log(result.message); // Show success message from the response
                        } else {
                            console.error('Error updating email:', result.message);
                            alert('Error updating email: ' + result.message);
                        }
                    }

                    this.cancelEdit(client);
                    this.fetchClients();

                    showToast.success("Información actualizada!");
                } else {
                    alert('No hay campos para actualizar.');
                }
            } catch (error) {
                console.error('Error updating info:', error);
                alert('La actualizacion de datos falló.');
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        async deleteClient(client, index) {
            console.log(client.uid);
            // Confirmation dialog
            if (confirm("¿Desea borrar este cliente?")) {
                // User clicked "OK"

                try {
                    // Prepare the data to send to the Cloud Function
                    const data = {
                        uid: client.uid,
                    };

                    // Show the loader
                    this.isSubmitting = true;

                    // Call the Cloud Function to delete the user using fetch
                    const response = await fetch('https://us-central1-rose-app-e062e.cloudfunctions.net/deleteUser', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data),
                    });

                    const result = await response.json();

                    if (response.ok) {
                        console.log(result.message); // Show success message from the response

                        // Remove affiliate from the database
                        const clientRef = dbRef(db, `Users/${client.uid}`);
                        await remove(clientRef);

                        // Show success toast
                        showToast.success("Cliente eliminado.");

                        // Remove the client from the UI
                        this.fetchClients();
                        this.clients.splice(index, 1);
                    } else {
                        console.error('Error deleting client:', result.message);
                        alert('Error deleting client: ' + result.message);
                    }
                } catch (error) {
                    console.error('Error deleting client:', error);
                } finally {
                    // Hide the loader
                    this.isSubmitting = false;
                }
            }
        },

        resetForm() {
            // Reset form fields
            this.client = {
                firstName: '',
                lastName: '',
                identification: '',
                email: '',
                phoneNumber: '',
                sector: '',
                address: ''
            };
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

        async approveID(client) {
                const validationErrors = [];
                    
                if (!client) {
                    showToast.error('No se ha seleccionado un cliente válido.');
                    validationErrors.push('No se ha seleccionado un cliente válido.');
                    return;
			    }
                // Fetch ID files if they haven't been loaded yet
                if (!client.idFiles) {
                    validationErrors.push('No se encontraron archivos de verificación.');
                    await this.fetchIdFiles(client);
                }

                // Check for required verification files
                if (!client.idFiles) {
                    validationErrors.push('No se encontraron archivos de verificación.');
                }

                if (validationErrors.length > 0) {
                    showToast.error('Error al aprobar la verificación: ' + validationErrors.join(', '));
                    return;
                }

            try {

                if (!confirm('¿Estás seguro de que deseas aprobar la verificación?')) {
                        return;
                    }


                this.isSubmitting = true;

                // Prepare update data
				const updateData = { 
					isVerified: true,
					verificationApprovedAt: new Date().toISOString()
				};
                
                // Update the client's verification status in the database
                const clientRef = dbRef(db, `Users/${client.uid}`);
                await update(clientRef, updateData);
                
                // Update the local client object
                client.isVerified = true;

                // Prepare email notification
                    const emailPayload = {
                        to: client.email,
                        message: {
						subject: 'Verificación de Identidad Aprobada',
						html: `
							<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
								<h2 style="color: #6f42c1;">¡Verificación Aprobada!</h2>
								<p>Hola ${client.firstName.charAt(0).toUpperCase() + client.firstName.slice(1)},</p>
								<p>Nos complace informarte que tu verificación de identidad ha sido aprobada exitosamente.</p>
								<p>Ahora tienes acceso completo a todos los servicios de Rose Coupon.</p>
								<hr style="border: none; border-top: 1px solid #ddd;">
								<p style="font-size: 0.8em; color: #666;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
							</div>
						`,
						text: `Hola ${client.firstName}, tu verificación de identidad ha sido aprobada exitosamente.`
					}
				};

				// Send notification email
				await sendEmail(emailPayload);
                
                // Show success message
                showToast.success('Verificación de identidad aprobada');
                    this.fetchClients();
            } catch (error) {
                console.error('Error approving ID verification:', error);
                showToast.error('Error al aprobar la verificación');
            }
        },
        async dissapproveID(client) {
            try {
                // Update the client's verification status in the database
                const clientRef = dbRef(db, `Users/${client.uid}`);
                await update(clientRef, {
                    isVerified: false,
                    requestedVerification: false
                });
                
                // Update the local client object
                client.isVerified = false;
                client.requestedVerification = false;
                
                // Show success message
                showToast.warning('Verificación de identidad rechazada');
                } catch (error) {
                console.error('Error disapproving ID verification:', error);
                showToast.error('Error al rechazar la verificación');
            }
        },
        async approvePayment(client) {
            const userName = client.firstName + ' ' + client.lastName;
            const paymentDate = this.formatDate(client.subscription.lastPaymentDate);

            try {
                // Show the loader
                this.isSubmitting = true;

                const userRef = dbRef(db, `Users/${client.uid}/subscription`);
                await update(userRef, { isPaid: true });

                // Send an email notification to the client through Firebase Cloud Functions
                const emailPayload = {
                    to: client.email,
                    message: {
                        subject: "Pago de Suscripción Aprobado",
                        text: `Hola ${userName}, tu pago del día ${paymentDate} ha sido aprobado.`,
                    },
                };
                // Send email via the utility function
                const result = await sendEmail(emailPayload);

                if (result.success) {
                    console.log("Email sent successfully:", result.message);
                } else {
                    console.error("Failed to send email:", result.error);
                }

                showToast.success('Pago aprobado. Se ha notificado al cliente.');
                //Close Payment modal after approval
                const modal = Modal.getOrCreateInstance(document.getElementById('validateModal'));
                modal.hide();
                this.fetchClients();
            } catch (error) {
                console.error("Error approving ID:", error);
            } finally {
                // Hide the loader
                this.isSubmitting = false;
            }
        },
        goToPage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
            }
        },
        openImageInNewTab(url) {
            window.open(url, '_blank');
        },

        // Export clientos to xlsx file
        async downloadClients() {
            if (!this.clients || !this.clients.length) {
                alert('No hay datos para descargar.');
                return;
            }

            const formattedClients = this.clients.map(client => ({
                Nombre: `${client.firstName} ${client.lastName}` || "Desconocido",
                Cedula: client.identification,
                Email: client.email || "Sin Email",
                Telefono: client.phoneNumber || "Sin telefono",
                // Fecha de Registro: new Date(client.createdAt).toLocaleDateString(), // Format date
            }));

            // Convert to worksheet and download
            const worksheet = XLSX.utils.json_to_sheet(formattedClients);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
            XLSX.writeFile(workbook, 'Clients.xlsx');
        },
        toggleEdit(client) {
            // If already editing, cancel edit
            if (client.isEditing) {
                this.cancelEdit(client);
                return;
            }

            // Close any other open edit forms
            this.clients.forEach(c => {
                if (c.isEditing) this.cancelEdit(c);
            });

            // Store original values and enable editing
            client._original = { ...client };
            client.isEditing = true;

            // Load location data if needed
            if (client.state) {
                this.displayMunicipios(client.state);
                if (client.municipio) {
                    this.displayParroquias(client.municipio);
                }
            }
        },
        openIDImage(url) {
            if (!url) return;
            
            // Open the image in a new tab
            window.open(url, '_blank');
        }
    }
}
</script>
<template>
    <div class="container">
        <!-- Header Actions -->
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="mb-0 text-primary">
                <i class="fa fa-users me-2"></i>
                Clientes Registrados
            </h4>
            <div class="d-flex gap-2">
                <button class="btn btn-theme btn-sm" data-bs-toggle="modal" data-bs-target="#addClientModal">
                <i class="fa fa-plus-circle fa-fw me-1"></i> Agregar Cliente
                </button>
                <button class="btn btn-theme btn-sm" @click="downloadClients()">
                <i class="fa fa-download fa-fw me-1"></i> Exportar clientes
                </button>
            </div>
        </div>

        <div class="clients-wrapper">
            <div class="search-section p-3">
                <div class="row align-items-center mb-3">
                    <div class="col-md-4 mt-3 mt-md-0">
                        <span class="badge bg-dark fs-6 p-2">
                            {{ clients.length }} Clientes registrados
                        </span>
                </div>
                </div>
                <div class="row align-items-center">
                    <!-- Search bar -->
                    <div class="col-md-9 mb-3">
                        <label class="form-label">Buscar cliente</label>
                        <div class="input-group">
                            <span class="input-group-text bg-dark border-secondary">
                                <i class="fas fa-search text-light"></i>
                            </span>
                            <input v-model="searchQuery" class="form-control form-control-sm bg-dark text-light border-secondary" 
                            placeholder="Buscar por nombre o cédula...">
                        </div>
                    </div>
                    <!-- Filter by verification -->
                    <div class="col-md-3 mb-3">
                        <label class="form-label">Filtrar por verificación</label>
                        <select class="form-select form-select-sm bg-dark text-light border-secondary" v-model="verificationFilter">
                            <option value="all">Todos los clientes ({{ verificationCounts.all }})</option>
                            <option value="verified">Verificados ({{ verificationCounts.verified }})</option>
                            <option value="pending">Pendientes de verificación ({{ verificationCounts.pending }})</option>
                            <option value="unverified">No verificados ({{ verificationCounts.unverified }})</option>
                        </select>
                    </div>                    
                </div>
            </div>

            <!-- Clients List -->
            <div class="clients-list">
                <!-- Loading State -->
                <div v-if="loading" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2 text-secondary">Cargando lista de clientes...</p>
                </div>

                <!-- Empty State -->
                <div v-else-if="paginatedFilteredUsers.length === 0" class="text-center py-5">
                    <div class="mb-3">
                        <i class="fa fa-users text-secondary opacity-25" style="font-size: 5em"></i>
                    </div>
                    <h5 class="text-secondary">No se encontraron clientes</h5>
                </div>

                <!-- Clients Grid -->
                <div v-else class="client-items">
                    <div class="client-item" v-for="(client, index) in paginatedFilteredUsers" :key="client.uid">
                        <!-- Header Section -->
                        <div class="client-header" @click="!client.isEditing && toggleClientDetails(client)">
                            <div class="client-info">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="client-avatar">
                                        <i class="fas fa-user"></i>
                                                        </div>
                                    <div>
                                        <div class="d-flex align-items-center">
                                            <h6 class="mb-0">{{ client.firstName }} {{ client.lastName }}</h6>
                                            <span v-if="client.isVerified" 
                                                  class="ms-2 badge bg-success" 
                                                  title="Cliente verificado">
                                                <i class="fas fa-check-circle"></i>
                                            </span>
                                            <span v-else-if="client.requestedVerification" 
                                                  class="ms-2 badge bg-warning" 
                                                  title="Verificación pendiente">
                                                <i class="fas fa-clock"></i>
                                            </span>
                                                    </div>
                                        <div class="client-contact">
                                            <div class="text-secondary small">
                                                <i class="fas fa-envelope me-2"></i>{{ client.email }}
                                                </div>
                                            <div class="text-secondary small">
                                                <i class="fas fa-phone me-2"></i>{{ client.phoneNumber }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="client-actions-group">
                                <div class="client-actions">
                                    <button class="btn btn-sm btn-outline-primary me-2" 
                                            @click.stop="toggleEdit(client)"
                                            :title="client.isEditing ? 'Cancelar edición' : 'Editar cliente'">
                                        <i :class="client.isEditing ? 'fas fa-times' : 'fas fa-edit'"></i>
                                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" 
                                            @click.stop="deleteClient(client, index)"
                                            title="Eliminar cliente">
                                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            <i class="fas fa-trash" v-else></i>
                                    </button>
                                                                        </div>
                                                                        </div>
                                                                    </div>

                        <!-- Edit Form -->
                        <div v-if="client.isEditing" class="edit-form mt-3">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Nombre</label>
                                        <input type="text" class="form-control form-control-sm rounded-0" v-model="client.firstName">
                                                                </div>
                                                            </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Apellido</label>
                                        <input type="text" class="form-control form-control-sm rounded-0" v-model="client.lastName">
                                                        </div>
                                                    </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Cédula</label>
                                        <input type="text" class="form-control form-control-sm rounded-0" v-model="client.identification">
                                                </div>
                                            </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control form-control-sm rounded-0" v-model="client.email">
                                                                        </div>
                                                                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Teléfono</label>
                                        <input type="text" class="form-control form-control-sm rounded-0" v-model="client.phoneNumber">
                                                                            </div>
                                                                        </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Estado</label>
                                        <select class="form-select form-select-sm rounded-0" v-model="client.state" @change="displayMunicipios(client.state)">
                                            <option v-for="state in venezuelanStates" :key="state" :value="state">{{ state }}</option>
                                        </select>
                                                                    </div>
                                                                </div>
                                <div class="col-md-6" v-if="municipios.length">
                                    <div class="form-group">
                                        <label class="form-label">Municipio</label>
                                        <select class="form-select form-select-sm rounded-0" v-model="client.municipio" @change="displayParroquias(client.municipio)">
                                            <option v-for="municipio in municipios" :key="municipio" :value="municipio">{{ municipio }}</option>
                                        </select>
                                                            </div>
                                                        </div>
                                <div class="col-md-6" v-if="parroquias.length">
                                    <div class="form-group">
                                        <label class="form-label">Parroquia</label>
                                        <select class="form-select form-select-sm rounded-0" v-model="client.parroquia">
                                            <option v-for="parroquia in parroquias" :key="parroquia" :value="parroquia">{{ parroquia }}</option>
                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                            <div class="mt-3 text-end">
                                <button class="btn btn-sm btn-outline-secondary me-2" @click="cancelEdit(client)">
                                    Cancelar
                                                    </button>
                                <button class="btn btn-sm btn-theme" @click="updateClient(client)">
                                    Guardar cambios
                                </button>
                            </div>
                        </div>

                        <!-- Expanded Details -->
                        <div v-else-if="expandedClients.has(client.uid)" class="client-details mt-3">
                            <!-- Loading State -->
                            <div v-if="loadingStates[client.uid]" class="text-center py-3">
                                <div class="spinner-border spinner-border-sm text-primary" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                                                </div>
                                <p class="text-secondary small mb-0">Cargando detalles...</p>
                                                                </div>

                            <!-- Details Content -->
                            <div v-else class="row g-4">
                                <!-- Location Info -->
                                <div class="col-md-4">
                                    <div class="info-card">
                                        <h6 class="text-secondary mb-2">
                                            <i class="fas fa-map-marker-alt me-2"></i>Ubicación
                                        </h6>
                                        <div class="location-info">
                                            <div class="mb-1">{{ client.state }}</div>
                                            <div class="ms-3">{{ client.municipio }}{{ client.parroquia ? `, ${client.parroquia}` : '' }}</div>
                                                    </div>
                                                </div>
                                            </div>

                                <!-- Credits Info -->
                                <div class="col-md-4">
                                    <div class="info-card">
                                        <h6 class="text-secondary mb-2">
                                            <i class="fas fa-credit-card me-2"></i>Créditos
                                        </h6>
                                        <div class="credit-info">
                                            <div v-if="client.credit">
                                                <div v-if="client.credit?.mainCredit" class="mb-2">
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <span>Rose Credit:</span>
                                                        <span class="text-success">${{ client.credit.mainCredit }}</span>
                                                        </div>
                                                    <div class="progress" style="height: 6px;">
                                                        <div class="progress-bar bg-success" 
                                                             :style="{ width: `${(client.credit.availableMainCredit / client.credit.mainCredit) * 100}%` }">
                                                                    </div>
                                                                </div>
                                                    <small class="text-muted">
                                                        Disponible: ${{ client.credit.availableMainCredit }}
                                                    </small>
                                                            </div>
                                                <div v-if="client.credit?.plusCredit">
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <span>Rose Credit Plus:</span>
                                                        <span class="text-primary">${{ client.credit.plusCredit }}</span>
                                                                    </div>
                                                    <div class="progress" style="height: 6px;">
                                                        <div class="progress-bar bg-primary" 
                                                             :style="{ width: `${(client.credit.availablePlusCredit / client.credit.plusCredit) * 100}%` }">
                                                                </div>
                                                            </div>
                                                    <small class="text-muted">
                                                        Disponible: ${{ client.credit.availablePlusCredit }}
                                                    </small>
                                                                    </div>
                                                <div v-if="!client.credit.mainCredit && !client.credit.plusCredit" class="text-center py-2">
                                                    <p class="text-secondary mb-0">Sin crédito asignado</p>
                                                                </div>
                                                            </div>
                                            <div v-else class="text-center py-3">
                                                <i class="fas fa-exclamation-circle text-warning mb-2" style="font-size: 1.5rem;"></i>
                                                <p class="text-secondary mb-0">Sin crédito asignado</p>
                                                        </div>
                                                            </div>
                                                                </div>
                                                            </div>

                                <!-- Subscription Info -->
                                <div class="col-md-4">
                                    <div class="info-card">
                                        <h6 class="text-secondary mb-2">
                                            <i class="fas fa-clock me-2"></i>Suscripción
                                        </h6>
                                        <div class="subscription-info">
                                            <div v-if="client.subscription">
                                                <div class="d-flex justify-content-start gap-2 align-items-center mb-2">
                                                    <span class="fw-bold">Nivel:</span>
                                                    <span>{{ client.subscription?.name?.toUpperCase() || 'Básico' }}</span>
                                                        </div>
                                                <div class="d-flex justify-content-start gap-2 align-items-center mb-2">                                                
                                                    <span class="fw-bold">Estado:</span>
                                                    <span :class="client.subscription?.isPaid ? 'text-success' : 'text-danger'">
                                                        {{ client.subscription?.isPaid ? 'Activa' : 'Inactiva' }}
                                                                </span>
                                                            </div>
                                                <div v-if="client.subscription?.lastPaymentDate" class="small text-muted">
                                                    Último pago: {{ formatDate(client.subscription.lastPaymentDate) }}
                                                        </div>
                                                <div v-if="client.subscription?.paymentUrl" class="mt-2">
                                                    <div class="d-flex justify-content-center align-items-center mb-2">
                                                        <button class="btn btn-sm btn-theme" @click="openImageInNewTab(client.subscription.paymentUrl)">
                                                            <i class="fa fa-eye"></i>
                                                            Ver pago
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div v-else class="text-center py-3">
                                                <i class="fas fa-exclamation-circle text-warning mb-2" style="font-size: 1.5rem;"></i>
                                                <p class="text-secondary mb-0">Sin suscripción activa</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                <!-- ID Verification Section -->
                                <div class="col-md-12 mt-4">
                                    <div class="info-card">
                                        <h6 class="text-secondary mb-3">
                                            <i class="fas fa-id-card me-2"></i>Documentos de Identidad
                                        </h6>
                                        <div class="id-documents">
                                            <!-- Show message if client is not verified -->
                                            <div v-if="!client.requestedVerification" class="text-center py-3">
                                                <i class="fas fa-exclamation-circle text-warning mb-2" style="font-size: 2rem;"></i>
                                                <p class="text-secondary mb-0">Este cliente no ha solicitado verificación de identidad.</p>
                                            </div>
                                            
                                            <!-- Show verification status if requested but not approved -->
                                            <div v-else-if="client.requestedVerification && !client.isVerified" class="text-center py-3">
                                                <i class="fas fa-clock text-info mb-2" style="font-size: 2rem;"></i>
                                                <p class="text-secondary mb-0">Este cliente ha solicitado verificación pero aún no ha sido aprobada.</p>
                                                <div class="mt-3">
                                                    <button class="btn btn-sm btn-success me-2" @click="approveID(client)" :disabled="isSubmitting">
                                                        <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        <span v-else>
                                                            <i class="fas fa-check me-1"></i>Aprobar
                                                        </span>
                                            </button>
                                                    <button class="btn btn-sm btn-danger" @click="dissapproveID(client)" :disabled="isSubmitting">
                                                        <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        <span v-else>
                                                            <i class="fas fa-times me-1"></i>Rechazar
                                                        </span>
                                            </button>
                                        </div>
                                    </div>
                                            
                                            <!-- Show ID documents if client is verified -->
                                            <div v-if="client.isVerified || client.requestedVerification" class="row g-3">
                                                <div v-if="loadingStates[client.uid + '_files']" class="text-center py-3">
                                                    <div class="spinner-border spinner-border-sm text-secondary" role="status">
                                                        <span class="visually-hidden">Cargando...</span>
                                </div>
                                                    <p class="text-secondary mt-2 mb-0">Cargando documentos...</p>
                            </div>
                                                <template v-else>
                                                    <div v-if="client.idFiles && client.idFiles.length > 0" class="row g-3">
                                                        <div v-for="(file, index) in client.idFiles" :key="index" class="col-md-4">
                                                            <div class="id-file-card">
                                                                <div class="id-file-preview" @click="openIDImage(file.url)">
                                                                    <img :src="file.url" alt="ID Document" class="img-fluid">
                                                                </div>
                                                                <div class="id-file-info">
                                                                    <span class="id-file-type">{{ file.type }}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div v-else class="text-center py-3">
                                                        <i class="fas fa-folder-open text-secondary mb-2" style="font-size: 2rem;"></i>
                                                        <p class="text-secondary mb-0">No se encontraron documentos.</p>
                                                    </div>
                                                </template>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                </div>

                <!-- Pagination -->
                <nav v-if="totalPages > 1" class="mt-4 p-2" aria-label="Page navigation">
                        <ul class="pagination justify-content-center">
                            <li class="page-item" :class="{ disabled: currentPage === 1 }">
                            <button class="page-link" @click="goToPage(currentPage - 1)">Anterior</button>
                            </li>
                            <li class="page-item" v-for="page in visiblePages" :key="page"
                                :class="{ active: page === currentPage }">
                                <button class="page-link" @click="goToPage(page)">{{ page }}</button>
                            </li>
                            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                            <button class="page-link" @click="goToPage(currentPage + 1)">Siguiente</button>
                            </li>
                        </ul>
                </nav>
            </div>
        </div>

        <!-- Modal for Adding New Client -->
        <div class="modal fade" id="addClientModal" tabindex="-1" aria-labelledby="addClientModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content bg-dark">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title text-light" id="addClientModalLabel">
                            <i class="fas fa-user-plus me-2"></i>
                            Agregar Cliente
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="clientFirstName" class="form-label">
                                        Nombre <span class="text-danger">*</span>
                                    </label>
                                    <input type="text" 
                                           class="form-control form-control-sm rounded-0" 
                                           id="clientFirstName" 
                                           v-model="client.firstName"
                                           placeholder="Ingrese el nombre"
                                required />
                        </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="clientLastName" class="form-label">
                                        Apellido <span class="text-danger">*</span>
                                    </label>
                                    <input type="text" 
                                           class="form-control form-control-sm rounded-0" 
                                           id="clientLastName" 
                                           v-model="client.lastName"
                                           placeholder="Ingrese el apellido"
                                required />
                        </div>
                        </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="clientIdentification" class="form-label">
                                        Cédula <span class="text-danger">*</span>
                                    </label>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-dark border-secondary text-light">V-</span>
                                        <input type="text" 
                                               class="form-control form-control-sm rounded-0" 
                                               id="clientIdentification"
                                               v-model="client.identification"
                                               placeholder="Ingrese la cédula"
                                               required />
                        </div>
                        </div>
                    </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="clientEmail" class="form-label">
                                        Email <span class="text-danger">*</span>
                                    </label>
                                    <input type="email" 
                                           class="form-control form-control-sm rounded-0" 
                                           id="clientEmail" 
                                           v-model="client.email"
                                           placeholder="ejemplo@correo.com"
                                           required />
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="form-group">
                                    <label for="clientPhoneNumber" class="form-label">
                                        Teléfono
                                    </label>
                                    <input type="tel" 
                                           class="form-control form-control-sm rounded-0" 
                                           id="clientPhoneNumber"
                                           v-model="client.phoneNumber"
                                           placeholder="XXXX-XXXXXXX" />
                                </div>
                            </div>
                        </div>
                        <div class="alert alert-secondary mt-3 py-2 rounded-0">
                            <small>
                                <i class="fas fa-info-circle me-2"></i>
                                Los campos marcados con <span class="text-danger">*</span> son obligatorios
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-sm btn-outline-light" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Cancelar
                        </button>
                        <button type="button" class="btn btn-sm btn-theme" @click="createClient()">
                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span v-else>
                                <i class="fas fa-save me-2"></i>Guardar
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Modal for opening ID img -->
        <div class="modal fade" id="idImgModal" tabindex="-1" aria-labelledby="qrModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="qrModalLabel">ID</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img :src="modalImageUrl" alt="QR Code" class="img-fluid">
                    </div>
                </div>
            </div>
        </div>
        <!-- Modal for validating payment -->
        <!-- <div class="modal fade" id="validateModal" tabindex="-1" aria-labelledby="validateModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="validateModalLabel">Captura de Pago de Suscripción</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="text-muted mb-3">
                            <strong>Nota:</strong> Las imágenes pueden tardar unos
                            segundos en
                            cargar. Por favor, espere...
                        </div>
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-header">
                                <h5 class="card-title text-black">Realizado el día:
                                    {{ formatDate(this.paymentClient.subscription?.lastPaymentDate) ||
                                        'Fecha no disponible' }}</h5>
                            </div>
                            <div class="card-body text-center">
                                <img :src="this.paymentClient.paymentUrl" class="img-fluid rounded" alt="comprobante"
                                    v-if="this.paymentClient.paymentUrl"
                                    @click="openImageInNewTab(this.paymentClient.paymentUrl)"
                                    style="cursor: pointer; max-height: 200px;">

                                <p v-else class="text-muted">No se encontró
                                    captura de pago.</p>
                            </div>
                            <span class="text-muted">Click en la imagen para ampliar</span>
                            <div class="card-footer text-end">
                                <button v-if="!this.paymentClient.subscription?.isPaid" class="btn btn-outline-success"
                                    @click.prevent="approvePayment(this.paymentClient)" :disabled="isSubmitting">
                                    <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                                        aria-hidden="true">
                                    </span>
                                    <span v-else>
                                        <i class="fa-solid fa-check"></i>
                                        Aprobar pago
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div> -->
    </div>
</template>
<style scoped>
.clients-wrapper {
    background: #29122f;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-section {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.client-item {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: background-color 0.2s ease;
}

.client-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

.client-item:last-child {
    border-bottom: none;
}

.client-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #adb5bd;
    font-size: 1.5rem;
}

.client-name {
    color: #ffffff;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.client-contact {
    margin-top: 0.25rem;
}

.status-badge {
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    background: #e9ecef;
    color: #666;
}

.status-badge.active {
    background: #d4edda;
    color: #155724;
}

.client-header {
    cursor: pointer;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.client-actions-group {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
}

.client-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.expand-indicator {
    transition: transform 0.2s ease;
}

.expand-indicator.expanded {
    transform: rotate(180deg);
}

.location-info {
    color: #adb5bd;
    font-size: 0.9rem;
}

.credit-info {
    font-size: 0.9rem;
}

.progress {
    background-color: rgba(255, 255, 255, 0.1);
    margin-top: 0.5rem;
}

.btn-outline-theme, .btn-theme {
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
}

.btn-outline-theme {
    border-color: purple;
    color: purple;
}

.btn-outline-theme:hover {
    background-color: purple;
    color: white;
    box-shadow: 0 2px 5px rgba(128,0,128,0.3);
}

.btn-theme {
    background-color: purple;
    border-color: purple;
    color: white;
}

.btn-theme:hover {
    background-color: #8a2be2;
    border-color: #8a2be2;
    box-shadow: 0 2px 5px rgba(138,43,226,0.3);
}

/* Mobile Styles */
@media (max-width: 768px) {
    .client-header {
        flex-direction: column;
    }

    .client-actions-group {
        width: 100%;
        flex-direction: column;
        align-items: flex-end;
    }

    .verification-status {
        margin-bottom: 0.5rem;
    }
    .btn-theme.btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    }
}

@media (max-width: 480px) {
    .client-actions-group {
        gap: 0.5rem;
    }

    .verification-status .status-badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
    }
}

.info-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1rem;
    height: 100%;
}

.edit-form {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1.5rem;
    margin-top: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-label {
    color: #adb5bd;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}

.form-control, .form-select {
    background-color: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.form-control:focus, .form-select:focus {
    background-color: #1a1a1a;
    border-color: purple;
    color: #fff;
    box-shadow: 0 0 0 0.25rem rgba(128, 0, 128, 0.25);
}

.form-select option {
    background-color: #1a1a1a;
    color: #fff;
}

.client-actions {
    display: flex;
    justify-content: flex-end;
}

.document-card {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 1rem;
    height: 100%;
}

.document-preview {
    cursor: pointer;
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    aspect-ratio: 3/2;
    background: #1a1a1a;
}

.preview-container {
    width: 100%;
    height: 100%;
}

.preview-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.preview-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.preview-overlay i {
    color: white;
    font-size: 1.5rem;
}

.document-preview:hover .preview-overlay {
    opacity: 1;
}

.no-document {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #666;
    gap: 0.5rem;
}

.no-document i {
    font-size: 2rem;
}

.no-document span {
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    .document-card {
        margin-bottom: 1rem;
    }

    .search-section {
    padding: 1rem;
  }
  
  .row.align-items-center {
    row-gap: 0.5rem;
  }
  
  .d-flex.justify-content-between.align-items-center.mb-4 {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 1rem;
  }
  
  .d-flex.justify-content-between.align-items-center.mb-4 .btn-group {
    width: 100%;
    justify-content: center;
  }

  .badge.fs-6 {
    font-size: 0.75rem !important;
    display: inline-block;
    width: auto;
    text-align: center;
    margin-bottom: 0.5rem;
  }
}

/* Modal Styles */
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

.form-control::placeholder,
.form-select::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.alert-secondary {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: #adb5bd;
}

.input-group-text {
    font-size: 0.875rem;
}

/* Improve focus states */
.form-control:focus,
.form-select:focus {
    border-color: purple;
    box-shadow: 0 0 0 0.25rem rgba(128, 0, 128, 0.25);
}

/* Button hover states */
.btn-outline-light:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
}

.id-file-card {
    background-color: #2a2a2a;
    border-radius: 8px;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.id-file-preview {
    cursor: pointer;
    position: relative;
    overflow: hidden;
    padding-top: 60%; /* 3:5 aspect ratio */
}

.id-file-preview img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.id-file-preview:hover img {
    transform: scale(1.05);
}

.id-file-info {
    padding: 0.75rem;
    background-color: #333;
}

.id-file-type {
    font-size: 0.875rem;
    color: #ddd;
    font-weight: 500;
}
</style>