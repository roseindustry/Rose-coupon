<script>
import { ref as dbRef, get, update, remove } from 'firebase/database';
import { db } from '@/firebase/init';
import { useClientManagement } from '@/composables/Clients/useClientManagement';
import { useClientDetails } from '@/composables/Clients/useClientDetails';
import { useClientRequests } from '@/composables/Clients/useClientRequests';
import { Modal } from 'bootstrap';
import { toast as showToast } from '@/utils/toast';
import Swal from 'sweetalert2';
import 'sweetalert2/src/sweetalert2.scss';
import { sendEmail } from '@/utils/emailService';
import 'toastify-js/src/toastify.css'
import * as XLSX from "xlsx";
import venezuela from 'venezuela';
import AddClientModal from '@/components/clients/AddClientModal.vue';
import PageHeader from '@/components/app/PageHeader.vue';
import StatCard from '@/components/app/StatCard.vue';
import SearchCard from '@/components/app/SearchCard.vue';
import CustomNav from '@/components/app/CustomNav.vue';
import CustomSelect from '@/components/app/CustomSelect.vue';

const clientDetails = useClientDetails();
const clientManagement = useClientManagement();
const clientRequests = useClientRequests();

export default {
    components: {
        AddClientModal,
        PageHeader,
        StatCard,
        SearchCard,
        CustomNav,
        CustomSelect,
    },
    data() {
        return {
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
            clientCoupons: {},
            clientPreferences: {},
            updateRequests: [],
            deleteRequests: [],
            currentEditing: null,
            searchQuery: '',
            modalImageUrl: '',
            paymentUrl: null,
            isSubmitting: false,
            loading: false,
            loadingRequests: false,

            currentPage: 1,
            itemsPerPage: 10,
            paymentClient: '',
            verificationFilter: 'all',

            displayRequests: false,
            userDetailsModal: {
                isLoading: false,
                userData: null,
                error: null
            },
        }
    },
    computed: {
        filteredUsers() {
            const { clients } = clientManagement
            let filtered = this.clients.length ? this.clients : clients.value

            // Search filter
            const trimmedSearchQuery = this.searchQuery?.trim().toLowerCase()
            if (trimmedSearchQuery) {
                filtered = filtered.filter(client => {
                    const identification = client.identification?.toString().toLowerCase() || ''
                    const firstName = client.firstName?.toLowerCase() || ''
                    const lastName = client.lastName?.toLowerCase() || ''
                    const fullName = `${firstName} ${lastName}`.toLowerCase()
                    const reversedFullName = `${lastName} ${firstName}`.toLowerCase()

                    return identification.includes(trimmedSearchQuery) ||
                        firstName.includes(trimmedSearchQuery) ||
                        lastName.includes(trimmedSearchQuery) ||
                        fullName.includes(trimmedSearchQuery) ||
                        reversedFullName.includes(trimmedSearchQuery)
                })
            }

            // Verification filter
            if (this.verificationFilter !== 'all') {
                filtered = filtered.filter(client => {
                    switch (this.verificationFilter) {
                        case 'verified': return client.isVerified === true
                        case 'pending': return client.requestedVerification === true && client.isVerified !== true
                        case 'unverified': return !client.requestedVerification && !client.isVerified
                        default: return true
                    }
                })
            }

            return filtered
        },
        paginatedFilteredUsers() {
            const start = (this.currentPage - 1) * this.itemsPerPage
            const end = this.currentPage * this.itemsPerPage
            return this.filteredUsers.slice(start, end)
        },
        totalPages() {
            return Math.ceil(this.filteredUsers.length / this.itemsPerPage)
        },
        visiblePages() {
            const totalPages = this.totalPages
            const currentPage = this.currentPage
            const maxPagesToShow = window.innerWidth < 768 ? 3 : 5

            let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
            let endPage = Math.min(totalPages, currentPage + Math.floor(maxPagesToShow / 2))

            // Adjust the start and end if they go out of bounds
            if (endPage - startPage + 1 < maxPagesToShow) {
                if (currentPage < totalPages / 2) {
                    endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)
                } else {
                    startPage = Math.max(1, endPage - maxPagesToShow + 1)
                }
            }

            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
        },
        verificationCounts() {
            const counts = {
                all: this.clients.length,
                verified: 0,
                pending: 0,
                unverified: 0
            }

            this.clients.forEach(client => {
                if (client.isVerified) {
                    counts.verified++
                } else if (client.requestedVerification) {
                    counts.pending++
                } else {
                    counts.unverified++
                }
            })

            return counts
        },
        expandedClients() {
            return clientDetails.expandedClients.value
        },
        loadingStates() {
            return clientDetails.loadingStates.value
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
            const { fetchClients, clients } = clientManagement
            await fetchClients()
            this.clients = clients.value
        },

        async fetchClientDetails(client) {
            const { fetchingClientDetails } = clientDetails
            try {
                await fetchingClientDetails(client)
            } catch (error) {
                console.error('Error fetching client details:', error)
                // Optionally show a toast or error message
                showToast.error('No se pudieron cargar los detalles del cliente')
            }
        },

        toggleClientDetails(client) {
            const { togglingClientDetails, fetchingClientDetails } = clientDetails

            // If the client details are not loaded, fetch them first
            if (!client._detailsLoaded) {
                fetchingClientDetails(client).then(() => {
                    togglingClientDetails(client)
                }).catch(error => {
                    console.error('Error fetching client details:', error)
                    showToast.error('No se pudieron cargar los detalles del cliente')
                })
            } else {
                togglingClientDetails(client)
            }
        },

        async fetchPaymentFiles(client, date) {
            const { fetchPaymentFiles } = clientDetails
            await fetchPaymentFiles(client, date)
        },

        async fetchUpdateRequests() {
            const { fetchUpdateRequests, updateRequests } = clientRequests
            await fetchUpdateRequests(this.clients)
            this.updateRequests = updateRequests.value
        },

        async fetchDeleteRequests() {
            const { fetchDeleteRequests, deleteRequests } = clientRequests
            await fetchDeleteRequests(this.clients)
            this.deleteRequests = deleteRequests.value
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

                    const userSnapshot = await get(userRef);
                    const userEmail = userSnapshot.val().email;

                    // Update email via Cloud Function if the email is changed
                    const newEmail = client.email;
                    if (newEmail && userEmail !== newEmail) {
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
        async deleteClient(client, index = null) {
            // Confirmation dialog
            if (confirm(`¿Está seguro de que desea eliminar al cliente ${client.firstName} ${client.lastName}? Esta acción es irreversible y eliminará todos los datos asociados al cliente.`)) {
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
            } finally {
                this.isSubmitting = false;
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
        openAddClientModal() {
            this.resetForm();
            const modal = new Modal(document.getElementById('addClientModal'));
            modal.show();
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
        },

        // Requests for approval
        async approveUpdate(request) {
            if (confirm('¿Se comunicó con el cliente y ya actualizó sus datos acorde a su solicitud?')) {
                try {
                    this.isSubmitting = true;

                    const requestsRef = dbRef(db, `updateRequests/${request.userId}/${request.id}`);
                    const requestSnapshot = await get(requestsRef);

                    if (requestSnapshot.exists()) {
                        await update(requestsRef, { status: 'approved' });
                        showToast.success('Solicitud aprobada');
                        await this.fetchUpdateRequests();
                    } else {
                        console.error('Solicitud no encontrada.');
                    }
                } catch (error) {
                    console.error('Error approving request:', error);
                } finally {
                    this.isSubmitting = false;
                }
            }
        },
        async handleDeleteRequest(requestId) {
            try {
                this.isSubmitting = true;

                // Find the client object using the requestId (which is the user's UID)
                const clientObject = this.clients.find((c) => c.uid === requestId);

                // Check if the client was found in the local list
                if (!clientObject) {
                    console.error(`Client with ID ${requestId} not found in local clients list.`);
                    showToast.error(`Error interno: No se encontró el cliente con ID ${requestId} en la lista local.`);
                    this.isSubmitting = false; // Reset submitting state
                    return; // Stop the function execution
                }

                // Construct the client's full name and get identification
                const clientName = `${clientObject.firstName || ''} ${clientObject.lastName || ''}`.trim();
                const clientIdentification = clientObject.identification || 'N/A'; // Handle missing identification

                console.log('Processing deletion for client:', clientObject, 'Name:', clientName, 'ID:', clientIdentification);

                // Update the deletion request in the database
                const requestRef = dbRef(db, `deletionRequests/${requestId}`);
                await update(requestRef, {
                    status: 'approved',
                    clientId: requestId,
                    clientName: clientName,
                    clientIdentification: clientIdentification,
                    approvedAt: new Date().toISOString() // Timestamp of approval
                });

                // Send an email to the user about the request processing
                const emailPayload = {
                    to: client.email,
                    message: {
                        subject: "Solicitud de Eliminación de Cuenta Procesada",
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
                                <div style="background-color: #29122f; color: white; text-align: center; padding: 15px; border-radius: 5px 5px 0 0;">
                                    <h2>Solicitud de Eliminación Aprobada</h2>
                                </div>
                                <div style="background-color: white; padding: 20px; border-radius: 0 0 5px 5px;">
                                    <p>Hola ${client.firstName} ${client.lastName},</p>
                                    <p>Su solicitud de eliminación de cuenta ha sido revisada y aprobada.</p>
                                    <p>Lamentamos mucho verte ir. Tus datos han sido eliminados de nuestra web.</p>
                                    <hr style="border: none; border-top: 1px solid #ddd;">
                                    <p style="font-size: 0.8em; color: #666;">Si no solicitó esta acción, por favor contacte a nuestro equipo de soporte.</p>
                                </div>
                                <div style="text-align: center; color: #666; margin-top: 20px; font-size: 0.8em;">
                                    © ${new Date().getFullYear()} Rose Coupon. Todos los derechos reservados.
                                </div>
                            </div>
                        `
                    }
                };

                // Send notification email
                await sendEmail(emailPayload);

                // Process delete 
                await this.deleteClient(clientObject);

                // success swal
                Swal.fire
                    ({
                        icon: 'success',
                        title: 'Solicitud Aprobada',
                        text: 'Usuario eliminado.',
                        confirmButtonColor: '#29122f'
                    });

                // Refresh the delete requests list
                await this.fetchDeleteRequests();
                await this.fetchClients();

                showToast.success('Solicitud de eliminación procesada');
            } catch (error) {
                console.error('Error processing delete request:', error);
                showToast.error('Error al procesar la solicitud de eliminación');
            } finally {
                this.isSubmitting = false;
            }
        },
        async processDeleteRequest(request) {
            // Reset previous modal state
            this.userDetailsModal.isLoading = true;
            this.userDetailsModal.userData = null;
            this.userDetailsModal.error = null;

            try {
                // Open the modal
                const modal = new Modal(document.getElementById('userDetailsModal'));
                modal.show();

                // Fetch user details
                await this.fetchUserDetailsForDeletion(request);
            } catch (error) {
                console.error('Error processing delete request:', error);
                this.userDetailsModal.error = 'No se pudieron cargar los detalles del usuario';
            } finally {
                this.userDetailsModal.isLoading = false;
            }
        },

        async fetchUserDetailsForDeletion(request) {
            try {
                // Find the full client object
                const client = this.clients.find(c => c.uid === request.id);

                if (!client) {
                    throw new Error('Cliente no encontrado');
                }

                // Fetch additional details
                await Promise.all([
                    this.fetchClientCredit(client),
                    this.fetchClientSubscription(client)
                ]);

                // Check for active purchases and outstanding payments
                const activePurchasesDetails = await this.checkActivePurchases(client);

                // Prepare user details for modal
                this.userDetailsModal.userData = {
                    basicInfo: {
                        uid: client.uid,
                        name: `${client.firstName} ${client.lastName}`,
                        email: client.email,
                        identification: client.identification,
                        phoneNumber: client.phoneNumber
                    },
                    credit: {
                        ...client.credit,
                        activePurchases: activePurchasesDetails.activePurchases,
                        totalOutstandingPayments: activePurchasesDetails.totalOutstandingPayments,
                        canBeDeleted: activePurchasesDetails.canBeDeleted
                    },
                    subscription: client.subscription || {},
                    deleteRequest: request
                };
            } catch (error) {
                console.error('Error fetching user details:', error);
                this.userDetailsModal.error = 'No se pudieron cargar los detalles del usuario';
            }
        },

        async checkActivePurchases(client) {
            try {
                const purchasesRef = dbRef(db, `Users/${client.uid}/credit/main/purchases`);
                const snapshot = await get(purchasesRef);

                let activePurchases = [];
                let totalOutstandingPayments = 0;

                if (snapshot.exists()) {
                    const purchases = snapshot.val();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    // Iterate through purchases
                    Object.entries(purchases).forEach(([purchaseId, purchase]) => {
                        if (purchase.cuotas) {
                            const unpaidCuotas = Object.values(purchase.cuotas).filter(cuota => {
                                const cuotaDate = new Date(cuota.date);
                                const isUnpaid = !cuota.paid;
                                const isOverdue = cuotaDate <= today;
                                return isUnpaid;
                            });

                            if (unpaidCuotas.length > 0) {
                                const outstandingAmountForPurchase = unpaidCuotas.reduce((sum, cuota) => sum + cuota.amount, 0);
                                const purchaseDetails = {
                                    id: purchaseId,
                                    productName: purchase.productName,
                                    totalPrice: purchase.productPrice,
                                    unpaidCuotasCount: unpaidCuotas.length, // Renamed for clarity
                                    outstandingAmount: outstandingAmountForPurchase
                                };

                                activePurchases.push(purchaseDetails);
                                totalOutstandingPayments += purchaseDetails.outstandingAmount;
                            }
                        } else {
                            console.log(`[checkActivePurchases] Purchase ${purchaseId} has no cuotas field.`);
                        }
                    });
                } else {
                    console.log('[checkActivePurchases] No purchases found for this client.');
                }

                const result = {
                    activePurchases,
                    totalOutstandingPayments,
                    canBeDeleted: activePurchases.length === 0 && totalOutstandingPayments === 0 // Ensure both are zero
                };
                // console.log('[checkActivePurchases] Final result:', result);
                return result;
            } catch (error) {
                console.error('[checkActivePurchases] Error checking active purchases:', error);
                return {
                    activePurchases: [],
                    totalOutstandingPayments: 0,
                    canBeDeleted: false // Default to false on error, safer
                };
            }
        },
        async confirmDeleteUser() {
            if (!this.userDetailsModal.userData) return;

            const userId = this.userDetailsModal.userData.basicInfo.uid;

            try {
                // Check if the user can be deleted
                if (!this.userDetailsModal.userData.credit.canBeDeleted) {
                    showToast.error('No se puede eliminar el usuario. Tiene compras activas pendientes.');
                    return;
                }

                // Show confirmation dialog
                if (!confirm(`¿Está seguro de que desea eliminar definitivamente la cuenta de ${this.userDetailsModal.userData.basicInfo.name}?`)) {
                    return;
                }

                // Perform deletion logic
                await this.handleDeleteRequest(userId);

                // Close the modal
                const modal = Modal.getInstance(document.getElementById('userDetailsModal'));
                modal.hide();
            } catch (error) {
                console.error('Error deleting user:', error);
                showToast.error('No se pudo eliminar el usuario');
            }
        },

        // Notify user if request denied
        async sendNotification(client) {
            console.log(client);
            if (!confirm(`¿Está seguro de que desea enviar una notificación por correo electrónico a ${client.basicInfo.name} (${client.basicInfo.email})?`)) {
                return; // Stop if user cancels
            }
            try {
                const emailPayload = {
                    to: client.basicInfo.email, // Corrected: Use client.basicInfo.email
                    message: {
                        subject: "Su Solicitud de Eliminación de Cuenta No fue aprobada",
                        text: `
                            Hola ${client.basicInfo.name},

                            Hemos revisado su solicitud para eliminar su cuenta. Lamentablemente, en este momento no podemos procesarla.

                            Esto se debe a que hemos identificado compras a crédito activas asociadas a su cuenta. Para poder proceder con la eliminación de su cuenta, es necesario que primero complete todos los pagos pendientes y liquide cualquier saldo deudor relacionado con estas compras.

                            Le pedimos amablemente que revise el estado de sus compras y pagos pendientes accediendo a su perfil en nuestra plataforma. Una vez que todas sus obligaciones crediticias hayan sido resueltas, podrá enviar una nueva solicitud de eliminación de cuenta y con gusto la procesaremos.

                            Si tiene alguna pregunta sobre sus compras pendientes o necesita asistencia, por favor, no dude en contactar a nuestro equipo de soporte.

                            ---
                            Si no solicitó esta acción o si considera que esto es un error, por favor contacte a nuestro equipo de soporte inmediatamente.

                            © ${new Date().getFullYear()} Rose Coupon. Todos los derechos reservados.
                        `,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
                                <div style="background-color: #29122f; color: white; text-align: center; padding: 15px; border-radius: 5px 5px 0 0;">
                                    <h2>Su Solicitud de Eliminación de Cuenta No fue aprobada</h2>
                                </div>
                                <div style="background-color: white; padding: 20px; border-radius: 0 0 5px 5px;">
                                    <p>Hola ${client.basicInfo.name},</p>
                                    <p>Hemos revisado su solicitud para eliminar su cuenta. Lamentablemente, en este momento no podemos procesarla.</p>
                                    <p>Esto se debe a que hemos identificado compras a crédito activas asociadas a su cuenta. Para poder proceder con la eliminación de su cuenta, es necesario que primero complete todos los pagos pendientes y liquide cualquier saldo deudor relacionado con estas compras.</p>
                                    <p>Le pedimos amablemente que revise el estado de sus compras y pagos pendientes accediendo a su perfil en nuestra plataforma. Una vez que todas sus obligaciones crediticias hayan sido resueltas, podrá enviar una nueva solicitud de eliminación de cuenta y con gusto la procesaremos.</p>
                                    <p>Si tiene alguna pregunta sobre sus compras pendientes o necesita asistencia, por favor, no dude en contactar a nuestro equipo de soporte.</p>
                                    <hr style="border: none; border-top: 1px solid #ddd;">
                                    <p style="font-size: 0.8em; color: #666;">Si no solicitó esta acción o si considera que esto es un error, por favor contacte a nuestro equipo de soporte inmediatamente.</p>
                                </div>
                                <div style="text-align: center; color: #666; margin-top: 20px; font-size: 0.8em;">
                                    © ${new Date().getFullYear()} Rose Coupon. Todos los derechos reservados.
                                </div>
                            </div>
                        `
                    }
                };

                // Send notification email
                await sendEmail(emailPayload);

                // Show success alert
                Swal.fire({
                    icon: 'success',
                    title: 'Notificación Enviada',
                    text: `Se ha enviado un correo electrónico a ${client.email} informando sobre el estado de su solicitud.`,
                    confirmButtonColor: '#29122f'
                });

            } catch (error) {
                console.error('Error sending notification:', error);
                showToast.error('Error al enviar la notificación');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo enviar la notificación por correo electrónico.',
                    confirmButtonColor: '#d33'
                });
            }
        },

        initializeComposableComputed() {
            return {
                filteredUsers() {
                    // You can keep the existing filtering logic or use the composable's computed
                    const trimmedQuery = this.searchQuery?.trim().toLowerCase()
                    let filtered = this.clients

                    if (trimmedQuery) {
                        filtered = filtered.filter(client => {
                            const identification = client.identification?.toString().toLowerCase() || ''
                            const firstName = client.firstName?.toLowerCase() || ''
                            const lastName = client.lastName?.toLowerCase() || ''
                            const fullName = `${firstName} ${lastName}`.toLowerCase()
                            const reversedFullName = `${lastName} ${firstName}`.toLowerCase()

                            return identification.includes(trimmedQuery) ||
                                firstName.includes(trimmedQuery) ||
                                lastName.includes(trimmedQuery) ||
                                fullName.includes(trimmedQuery) ||
                                reversedFullName.includes(trimmedQuery)
                        })
                    }

                    if (this.verificationFilter !== 'all') {
                        filtered = filtered.filter(client => {
                            switch (this.verificationFilter) {
                                case 'verified': return client.isVerified === true
                                case 'pending': return client.requestedVerification === true && client.isVerified !== true
                                case 'unverified': return !client.requestedVerification && !client.isVerified
                                default: return true
                            }
                        })
                    }

                    return filtered
                }
            }
        },
    },
    created() {
        // Initial data fetch
        this.fetchClients()
        this.fetchUpdateRequests()
        this.fetchDeleteRequests()
        this.initializeComposableComputed()
    }
}
</script>
<template>
    <div class="container">
        <!-- Page Header -->
        <PageHeader :isAdmin="true" title="Clientes Registrados" icon="fa fa-users" :actions="[
            {
                icon: 'fa fa-user-plus',
                text: 'Agregar Cliente',
                class: 'btn-theme',
                modalToggle: 'modal',
                modalTarget: '#addClientModal',
                onClick: () => { }
            },
            {
                icon: 'fa fa-download',
                text: 'Exportar clientes',
                class: 'btn-theme',
                onClick: downloadClients
            }
        ]" />

        <div class="clients-wrapper">
            <div class="search-section p-4">
                <!-- Header with stats and actions -->
                <div class="row justify-content-between align-items-center g-3">
                    <div class="col-md-4">
                        <StatCard title="Total de Clientes" icon="fa-users" :value="clients.length" />
                    </div>
                    <!-- Search bar -->
                    <div class="col-md-8">
                        <SearchCard title="Buscar cliente" v-model="searchQuery"
                            placeholder="Buscar por nombre o cedula..." />
                    </div>
                </div>

                <!-- Search and filters -->
                <div class="row client-options mt-md-3">
                    <!-- Client's requests buttons -->
                    <div class="col-md-9">
                        <CustomNav :actions="[
                            {
                                text: 'Clientes',
                                icon: 'fa-list',
                                isActive: displayRequests === false,
                                onClick: () => displayRequests = false
                            },
                            {
                                text: 'Actualizar',
                                icon: 'fa-sync',
                                badge: updateRequests.length,
                                isActive: displayRequests === 'update',
                                onClick: () => displayRequests = 'update'
                            },
                            {
                                text: 'Eliminar',
                                icon: 'fa-trash',
                                badge: deleteRequests.length,
                                isActive: displayRequests === 'delete',
                                onClick: () => displayRequests = 'delete'
                            },
                        ]" />
                    </div>
                    <!-- Filter by verification -->
                    <div class="col-md-3">
                        <div class="filter-card">
                            <label class="form-label">
                                <i class="fas fa-filter me-2"></i>
                                Estado de verificación
                            </label>
                            <CustomSelect v-model="verificationFilter" :options="[
                                {
                                    text: 'Todos',
                                    value: 'all',
                                    count: verificationCounts.all
                                },
                                {
                                    text: 'Verificados',
                                    value: 'verified',
                                    count: verificationCounts.verified
                                },
                                {
                                    text: 'Pendientes',
                                    value: 'pending',
                                    count: verificationCounts.pending
                                },
                                {
                                    text: 'No verificados',
                                    value: 'unverified',
                                    count: verificationCounts.unverified
                                }
                            ]" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clients List -->
            <div v-if="!displayRequests" class="clients-list">
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
                                    <!-- avatar -->
                                    <div class="client-avatar">
                                        <i class="fas fa-user"></i>
                                    </div>

                                    <!-- info -->
                                    <div class="client-info-content">
                                        <div class="d-flex align-items-center">
                                            <h6 class="mb-0">{{ client.firstName }} {{ client.lastName }}</h6>
                                            <!-- <h6>{{ client.uid }}</h6> -->
                                        </div>
                                        <div class="client-contact">
                                            <div class="text-secondary small">
                                                <i class="fas fa-id-card me-2"></i>{{ client.identification }}
                                            </div>
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
                            <div class="client-status">
                                <span
                                    :class="['status-badge badge', client.isVerified ? 'bg-success' : client.requestedVerification ? 'bg-warning' : 'bg-danger']"
                                    :title="client.isVerified ? 'Cliente verificado' : client.requestedVerification ? 'Verificación pendiente' : 'No verificado'">
                                    <i
                                        :class="client.isVerified ? 'fas fa-check-circle' : client.requestedVerification ? 'fas fa-clock' : 'fas fa-times-circle'"></i>
                                </span>
                            </div>

                        </div>

                        <div class="client-actions">
                            <button class="btn btn-sm btn-outline-primary me-2" @click.stop="toggleEdit(client)"
                                :title="client.isEditing ? 'Cancelar edición' : 'Editar cliente'">
                                <i :class="client.isEditing ? 'fas fa-times' : 'fas fa-edit'"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" @click.stop="deleteClient(client, index)"
                                title="Eliminar cliente">
                                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"
                                    aria-hidden="true"></span>
                                <i class="fas fa-trash" v-else></i>
                            </button>
                        </div>

                        <!-- Edit Form -->
                        <div v-if="client.isEditing" class="edit-form mt-3">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Nombre</label>
                                        <input type="text" class="form-control form-control-sm rounded-0"
                                            v-model="client.firstName">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Apellido</label>
                                        <input type="text" class="form-control form-control-sm rounded-0"
                                            v-model="client.lastName">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Cédula</label>
                                        <input type="text" class="form-control form-control-sm rounded-0"
                                            v-model="client.identification">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control form-control-sm rounded-0"
                                            v-model="client.email">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Teléfono</label>
                                        <input type="text" class="form-control form-control-sm rounded-0"
                                            v-model="client.phoneNumber">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label class="form-label">Estado</label>
                                        <select class="form-select form-select-sm rounded-0" v-model="client.state"
                                            @change="displayMunicipios(client.state)">
                                            <option v-for="state in venezuelanStates" :key="state" :value="state">{{
                                                state }}</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6" v-if="municipios.length">
                                    <div class="form-group">
                                        <label class="form-label">Municipio</label>
                                        <select class="form-select form-select-sm rounded-0" v-model="client.municipio"
                                            @change="displayParroquias(client.municipio)">
                                            <option v-for="municipio in municipios" :key="municipio" :value="municipio">
                                                {{ municipio }}</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6" v-if="parroquias.length">
                                    <div class="form-group">
                                        <label class="form-label">Parroquia</label>
                                        <select class="form-select form-select-sm rounded-0" v-model="client.parroquia">
                                            <option v-for="parroquia in parroquias" :key="parroquia" :value="parroquia">
                                                {{ parroquia }}</option>
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
                                            <div class="ms-3">{{ client.municipio }}{{ client.parroquia ? `,
                                                ${client.parroquia}` : '' }}</div>
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
                                                        <span class="text-success">${{ client.credit.mainCredit
                                                            }}</span>
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
                                                        <span class="text-primary">${{ client.credit.plusCredit
                                                            }}</span>
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
                                                <div v-if="!client.credit.mainCredit && !client.credit.plusCredit"
                                                    class="text-center py-2">
                                                    <p class="text-secondary mb-0">Sin crédito asignado</p>
                                                </div>
                                            </div>
                                            <div v-else class="text-center py-3">
                                                <i class="fas fa-exclamation-circle text-warning mb-2"
                                                    style="font-size: 1.5rem;"></i>
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
                                                    <span>{{ client.subscription?.name?.toUpperCase() || 'Básico'
                                                        }}</span>
                                                </div>
                                                <div class="d-flex justify-content-start gap-2 align-items-center mb-2">
                                                    <span class="fw-bold">Estado:</span>
                                                    <span
                                                        :class="client.subscription?.isPaid ? 'text-success' : 'text-danger'">
                                                        {{ client.subscription?.isPaid ? 'Activa' : 'Inactiva' }}
                                                    </span>
                                                </div>
                                                <div v-if="client.subscription?.lastPaymentDate"
                                                    class="small text-muted">
                                                    Último pago: {{ formatDate(client.subscription.lastPaymentDate) }}
                                                </div>
                                                <div v-if="client.subscription?.paymentUrl" class="mt-2">
                                                    <div class="d-flex justify-content-center align-items-center mb-2">
                                                        <button class="btn btn-sm btn-theme"
                                                            @click="openImageInNewTab(client.subscription.paymentUrl)">
                                                            <i class="fa fa-eye"></i>
                                                            Ver pago
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div v-else class="text-center py-3">
                                                <i class="fas fa-exclamation-circle text-warning mb-2"
                                                    style="font-size: 1.5rem;"></i>
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
                                                <i class="fas fa-exclamation-circle text-warning mb-2"
                                                    style="font-size: 2rem;"></i>
                                                <p class="text-secondary mb-0">Este cliente no ha solicitado
                                                    verificación de identidad.</p>
                                            </div>

                                            <!-- Show verification status if requested but not approved -->
                                            <div v-else-if="client.requestedVerification && !client.isVerified"
                                                class="text-center py-3">
                                                <i class="fas fa-clock text-info mb-2" style="font-size: 2rem;"></i>
                                                <p class="text-secondary mb-0">Este cliente ha solicitado verificación
                                                    pero aún no ha sido aprobada.</p>
                                                <div class="mt-3">
                                                    <button class="btn btn-sm btn-success me-2"
                                                        @click="approveID(client)" :disabled="isSubmitting">
                                                        <span v-if="isSubmitting"
                                                            class="spinner-border spinner-border-sm" role="status"
                                                            aria-hidden="true"></span>
                                                        <span v-else>
                                                            <i class="fas fa-check me-1"></i>Aprobar
                                                        </span>
                                                    </button>
                                                    <button class="btn btn-sm btn-danger" @click="dissapproveID(client)"
                                                        :disabled="isSubmitting">
                                                        <span v-if="isSubmitting"
                                                            class="spinner-border spinner-border-sm" role="status"
                                                            aria-hidden="true"></span>
                                                        <span v-else>
                                                            <i class="fas fa-times me-1"></i>Rechazar
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>

                                            <!-- Show ID documents if client is verified -->
                                            <div v-if="client.isVerified || client.requestedVerification"
                                                class="row g-3">
                                                <div v-if="loadingStates[client.uid + '_files']"
                                                    class="text-center py-3">
                                                    <div class="spinner-border spinner-border-sm text-secondary"
                                                        role="status">
                                                        <span class="visually-hidden">Cargando...</span>
                                                    </div>
                                                    <p class="text-secondary mt-2 mb-0">Cargando documentos...</p>
                                                </div>
                                                <template v-else>
                                                    <div v-if="client.idFiles && client.idFiles.length > 0"
                                                        class="row g-3">
                                                        <div v-for="(file, index) in client.idFiles" :key="index"
                                                            class="col-md-4">
                                                            <div class="id-file-card">
                                                                <div class="id-file-preview"
                                                                    @click="openIDImage(file.url)">
                                                                    <img :src="file.url" alt="ID Document"
                                                                        class="img-fluid">
                                                                </div>
                                                                <div class="id-file-info">
                                                                    <span class="id-file-type">{{ file.type }}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div v-else class="text-center py-3">
                                                        <i class="fas fa-folder-open text-secondary mb-2"
                                                            style="font-size: 2rem;"></i>
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
                <nav v-if="totalPages > 1 && !displayRequests" class="mt-4 p-2" aria-label="Page navigation">
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
            <div v-else-if="displayRequests === 'update'" class="requests-wrapper">
                <!-- Existing update requests list content -->
                <div class="requests-list">
                    <!-- Loading State -->
                    <div v-if="loadingRequests" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden"></span>
                        </div>
                        <p class="mt-2 text-secondary">Cargando lista de Solicitudes...</p>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="updateRequests.length === 0" class="text-center py-5">
                        <div class="mb-3">
                            <i class="fa fa-users text-secondary opacity-25" style="font-size: 5em"></i>
                        </div>
                        <h5 class="text-secondary">No se encontraron clientes</h5>
                    </div>

                    <!-- Requests Grid -->
                    <div v-else class="request-items">
                        <div class="request-item" v-for="request in updateRequests" :key="request.id">
                            <!-- Header Section -->
                            <div class="requests-header">
                                <div class="request-info">
                                    <div class="d-flex align-items-center gap-3">
                                        <div class="request-avatar">
                                            <i class="fa-solid fa-bell"></i>
                                        </div>
                                        <div>
                                            <div class="d-flex align-items-center">
                                                <h6 class="mb-0">{{ request.userName }}</h6>
                                            </div>
                                            <div class="client-contact">
                                                <div class="text-secondary fs-5">
                                                    {{ request.fieldLabel }}
                                                </div>
                                                <div class="text-secondary small">
                                                    <strong>Valor actual: </strong>{{ request.currentValue }}
                                                </div>
                                                <div class="text-secondary small">
                                                    <strong>Valor solicitado: </strong>{{ request.newValue }}
                                                </div>
                                                <div class="text-secondary small">
                                                    <strong>Solicitado el dia: </strong>{{
                                                        formatDate(request.requestedAt)
                                                    }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="request-actions-group">
                                    <div class="request-actions">
                                        <button class="btn btn-sm btn-outline-success me-2"
                                            @click.stop="approveUpdate(request)">
                                            <i class="fa-solid fa-check"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="displayRequests === 'delete'" class="requests-wrapper">
                <div class="requests-list">
                    <!-- Loading State -->
                    <div v-if="loadingRequests" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden"></span>
                        </div>
                        <p class="mt-2 text-secondary">Cargando lista de Solicitudes...</p>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="deleteRequests.length === 0" class="text-center py-5">
                        <div class="mb-3">
                            <i class="fa fa-trash text-secondary opacity-25" style="font-size: 5em"></i>
                        </div>
                        <h5 class="text-secondary">No hay solicitudes de eliminación de cuenta</h5>
                    </div>

                    <!-- Requests Grid -->
                    <div v-else class="request-items">
                        <div class="request-item" v-for="request in deleteRequests" :key="request.id">
                            <!-- Header Section -->
                            <div class="requests-header">
                                <div class="request-info">
                                    <div class="d-flex align-items-center gap-3">
                                        <div class="request-avatar">
                                            <i class="fa-solid fa-user-times"></i>
                                        </div>
                                        <div>
                                            <div class="d-flex align-items-center">
                                                <h6 class="mb-0">{{ request.userName }}</h6>
                                            </div>
                                            <div class="client-contact">
                                                <div class="text-secondary small">
                                                    <strong>Email: </strong>{{ request.userEmail }}
                                                </div>
                                                <div class="text-secondary small">
                                                    <strong>Solicitado el: </strong>{{ formatDate(request.createdAt) }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="request-actions-group">
                                    <div class="request-actions">
                                        <button class="btn btn-outline-info me-2"
                                            @click.stop="processDeleteRequest(request)" title="Chequear Usuario">
                                            Chequear Usuario
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Client Modal Component -->
        <AddClientModal @client-created="fetchClients" />

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

        <!-- Modal for User Details in Delete Requests -->
        <div class="modal fade" id="userDetailsModal" tabindex="-1" aria-labelledby="userDetailsModalLabel"
            aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content bg-dark">
                    <div class="modal-header border-secondary">
                        <h5 class="modal-title text-light" id="userDetailsModalLabel">
                            <i class="fas fa-user-shield me-2"></i>
                            Detalles del Usuario
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Loading State -->
                        <div v-if="userDetailsModal.isLoading" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                            <p class="mt-2 text-secondary">Cargando detalles del usuario...</p>
                        </div>

                        <!-- Error State -->
                        <div v-else-if="userDetailsModal.error" class="alert alert-danger">
                            {{ userDetailsModal.error }}
                        </div>

                        <!-- User Details -->
                        <div v-else-if="userDetailsModal.userData" class="user-details">
                            <div class="row g-4">
                                <!-- Basic Information -->
                                <div class="col-md-6">
                                    <div class="info-card">
                                        <h6 class="text-secondary mb-3">
                                            <i class="fas fa-user me-2"></i>Información Básica
                                        </h6>
                                        <div class="details-list">
                                            <div class="detail-item">
                                                <strong>Nombre:</strong>
                                                <span>{{ userDetailsModal.userData.basicInfo.name }}</span>
                                            </div>
                                            <div class="detail-item scrollable-row">
                                                <strong>Email:</strong>
                                                <span>{{ userDetailsModal.userData.basicInfo.email }}</span>
                                            </div>
                                            <div class="detail-item">
                                                <strong>Cédula:</strong>
                                                <span>{{ userDetailsModal.userData.basicInfo.identification }}</span>
                                            </div>
                                            <div class="detail-item">
                                                <strong>Teléfono:</strong>
                                                <span>{{ userDetailsModal.userData.basicInfo.phoneNumber || `No
                                                    disponible`
                                                }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Credit Information -->
                                <div class="col-md-6">
                                    <div class="info-card">
                                        <h6 class="text-secondary mb-3">
                                            <i class="fas fa-credit-card me-2"></i>Información de Crédito
                                        </h6>
                                        <div class="details-list">
                                            <div class="detail-item">
                                                <strong>Crédito Principal:</strong>
                                                <span>${{ userDetailsModal.userData.credit.mainCredit || 0 }}</span>
                                            </div>
                                            <div class="detail-item">
                                                <strong>Crédito Principal Disponible:</strong>
                                                <span>${{ userDetailsModal.userData.credit.availableMainCredit || 0
                                                    }}</span>
                                            </div>
                                            <div class="detail-item">
                                                <strong>Crédito Plus:</strong>
                                                <span>${{ userDetailsModal.userData.credit.plusCredit || 0 }}</span>
                                            </div>
                                            <div class="detail-item">
                                                <strong>Crédito Plus Disponible:</strong>
                                                <span>${{ userDetailsModal.userData.credit.availablePlusCredit || 0
                                                    }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Active Purchases Section -->
                                <div class="col-md-12">
                                    <div class="info-card">
                                        <h6 class="text-secondary mb-3">
                                            <i class="fas fa-shopping-cart me-2"></i>Compras Activas
                                        </h6>
                                        <div v-if="userDetailsModal.userData.credit.activePurchases.length > 0"
                                            class="details-list">
                                            <div v-for="purchase in userDetailsModal.userData.credit.activePurchases"
                                                :key="purchase.id" class="detail-item">
                                                <div class="d-flex justify-content-between w-100">
                                                    <div>
                                                        <strong>{{ purchase.productName }}</strong>
                                                        <div class="text-warning small">
                                                            {{ purchase.unpaidCuotasCount }} cuotas pendientes
                                                        </div>
                                                    </div>
                                                    <div class="text-danger">
                                                        ${{ purchase.outstandingAmount.toFixed(2) }}
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="detail-item total-outstanding">
                                                <strong>Total Pendiente:</strong>
                                                <strong class="text-danger">
                                                    ${{
                                                        userDetailsModal.userData.credit.totalOutstandingPayments.toFixed(2)
                                                    }}
                                                </strong>
                                            </div>
                                        </div>
                                        <div v-else class="text-center text-success">
                                            <i class="fas fa-check-circle me-2"></i>
                                            Sin compras activas pendientes
                                        </div>
                                    </div>
                                </div>

                                <!-- Subscription Information -->
                                <div class="col-md-12">
                                    <div class="info-card">
                                        <h6 class="text-secondary mb-3">
                                            <i class="fas fa-clock me-2"></i>Información de Suscripción
                                        </h6>
                                        <div class="details-list">
                                            <div class="detail-item">
                                                <strong>Nivel de Suscripción:</strong>
                                                <span>{{ userDetailsModal.userData.subscription.name || 'No disponible'
                                                    }}</span>
                                            </div>
                                            <div class="detail-item">
                                                <strong>Estado de Pago:</strong>
                                                <span
                                                    :class="userDetailsModal.userData.subscription.isPaid ? 'text-success' : 'text-danger'">
                                                    {{ userDetailsModal.userData.subscription.isPaid ? 'Pagado' :
                                                        'Pendiente' }}
                                                </span>
                                            </div>
                                            <div v-if="userDetailsModal.userData.subscription.lastPaymentDate"
                                                class="detail-item">
                                                <strong>Último Pago:</strong>
                                                <span>{{
                                                    formatDate(userDetailsModal.userData.subscription.lastPaymentDate)
                                                    }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Delete Request Details -->
                            <div class="mt-4">
                                <div class="info-card">
                                    <h6 class="text-secondary mb-3">
                                        <i class="fas fa-trash-alt me-2"></i>Detalles de Solicitud de Eliminación
                                    </h6>
                                    <div class="details-list">
                                        <div class="detail-item">
                                            <strong>Fecha de Solicitud:</strong>
                                            <span>{{ formatDate(userDetailsModal.userData.deleteRequest.createdAt)
                                                }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-secondary">
                        <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">
                            Cerrar
                        </button>

                        <button
                            v-if="!userDetailsModal?.userData?.credit?.canBeDeleted && userDetailsModal?.userData?.basicInfo?.email"
                            type="button" class="btn btn-info" @click="sendNotification(userDetailsModal.userData)"
                            title="Notificar Usuario">
                            <i class="fa-solid fa-paper-plane me-2"></i> Contactar Usuario
                        </button>

                        <button type="button" class="btn btn-danger" @click="confirmDeleteUser"
                            :disabled="!userDetailsModal?.userData?.credit?.canBeDeleted">
                            <span v-if="!userDetailsModal?.userData?.credit?.canBeDeleted">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                Tiene pagos pendientes
                            </span>
                            <span v-else>
                                <i class="fas fa-trash-alt me-2"></i>
                                Procesar Eliminación
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.clients-wrapper,
.requests-wrapper {
    background: #29122f;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-section {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.client-item,
.request-item {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: background-color 0.2s ease;
}

.client-item:hover,
.request-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

.client-item:last-child,
.request-item:last-child {
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

.client-status {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
}

.status-badge {
    padding: 0.4rem 0.5rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
}

.status-badge.active {
    background: #d4edda;
    color: #155724;
}

.client-header,
.requests-header {
    cursor: pointer;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    position: relative;
    padding-top: 0.5rem;
}

.client-actions-group,
.request-actions-group {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
}

.client-actions,
.request-actions {
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

.btn-outline-theme,
.btn-theme {
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
    box-shadow: 0 2px 5px rgba(128, 0, 128, 0.3);
}

.btn-theme {
    background-color: purple;
    border-color: purple;
    color: white;
}

.btn-theme:hover {
    background-color: #8a2be2;
    border-color: #8a2be2;
    box-shadow: 0 2px 5px rgba(138, 43, 226, 0.3);
}

.clients-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.admin-actions {
    display: flex;
    gap: 0.5rem;
}

.admin-actions .btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
}

.admin-actions .btn i {
    font-size: 1rem;
}

/* Mobile Styles */
@media (max-width: 768px) {
    .client-header {
        flex-direction: column;
    }

    .client-actions-group {
        margin-top: 1rem;
    }

    .verification-status {
        margin-bottom: 0.5rem;
    }

    .btn-theme.btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }
}

@media (max-width: 576px) {
    .clients-header {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
    }

    .admin-actions {
        margin-left: auto;
    }

    .admin-actions .btn {
        padding: 0.375rem;
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

.form-control,
.form-select {
    background-color: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.form-control:focus,
.form-select:focus {
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
    padding-top: 60%;
    /* 3:5 aspect ratio */
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

/* Delete Requests Styles */
.request-items {
    background-color: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    overflow: hidden;
}

.request-item {
    transition: background-color 0.3s ease;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.request-item:last-child {
    border-bottom: none;
}

.request-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

.request-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: rgba(255, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff6b6b;
    font-size: 1.5rem;
}

.request-actions-group {
    display: flex;
    align-items: center;
}

.request-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.request-actions .btn-sm {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 35px;
    height: 35px;
    padding: 0;
}

.request-actions .btn-outline-info {
    color: #17a2b8;
    border-color: #17a2b8;
}

.request-actions .btn-outline-info:hover {
    background-color: rgba(23, 162, 184, 0.1);
}

.request-actions .btn-outline-danger {
    color: #dc3545;
    border-color: #dc3545;
}

.request-actions .btn-outline-danger:hover {
    background-color: rgba(220, 53, 69, 0.1);
}

/* Empty State Improvements */
.requests-wrapper .text-center {
    background-color: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    padding: 3rem;
}

.requests-wrapper .text-center i {
    color: rgba(255, 255, 255, 0.1);
    margin-bottom: 1rem;
}

.requests-wrapper .text-center h5 {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 300;
}

/* User Details Modal Styles */
.user-details .info-card {
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
}

.user-details .details-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.detail-item.scrollable-row {
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: thin;
    /* Optional for Firefox */
}

.detail-item.scrollable-row::-webkit-scrollbar {
    height: 6px;
    /* Optional for Chrome */
}

.user-details .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.user-details .detail-item:last-child {
    border-bottom: none;
}

.user-details .detail-item strong {
    color: #adb5bd;
    margin-right: 1rem;
    min-width: 200px;
}

.user-details .detail-item span {
    text-align: right;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .user-details .detail-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .user-details .detail-item strong {
        margin-right: 0;
        margin-bottom: 0.25rem;
    }

    .client-options {
        gap: 2rem;
    }
}

.filter-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-actions {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 0.5rem;
}

.btn-icon {
    width: 32px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: #adb5bd;
    border: none;
    transition: all 0.2s ease;
}

.btn-icon:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
}

.form-select {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    height: 48px;
    font-size: 1rem;
}

.form-select:focus {
    background: rgba(0, 0, 0, 0.3);
    border-color: #6f42c1;
    box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

.form-label {
    color: #adb5bd;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
}
</style>