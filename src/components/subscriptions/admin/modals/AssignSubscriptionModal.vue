<template>
  <div class="modal fade" id="assignModal" tabindex="-1" aria-labelledby="assignModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            Asignar Suscripción a
            {{ activeTab === "clients" ? "Cliente" : "Afiliado" }}
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"
            @click="resetModalData"></button>
        </div>
        <div class="modal-body">
          <!-- Top Actions -->
          <div class="d-flex justify-content-between align-items-start mb-4">
            <div class="alert alert-info mb-0 flex-grow-1 me-3">
              <i class="fa-solid fa-info-circle me-2"></i>
              <strong>Funciones:</strong> Seleccione un plan y busque el
              {{ activeTab === "clients" ? "cliente" : "afiliado" }} para
              asignar una suscripción.
            </div>
            <button class="btn btn-theme" data-bs-toggle="modal" data-bs-target="#createPlan">
              <i class="fa-solid fa-plus me-2"></i>Crear Plan
            </button>
          </div>

          <!-- Search Section -->
          <div class="card mb-4">
            <div class="card-body">
              <h6 class="card-subtitle mb-3 text-white">
                <i class="fa-solid fa-search me-2"></i>Buscar
                {{ activeTab === "clients" ? "Cliente" : "Afiliado" }}
              </h6>
              <SearchInput v-model="searchQuery" :results="searchResults" :placeholder="activeTab === 'clients'
                  ? 'Buscar por nombre o cédula...'
                  : 'Buscar por nombre o RIF...'
                " @input="
                  activeTab === 'clients' ? searchClients() : searchAffiliates()
                  " @select="handleSelect" class="form-control mb-3" />

              <div v-if="internalSelectedUser" class="selected-item">
                <div class="d-flex align-items-center justify-content-between p-2 rounded bg-dark-purple">
                  <span>
                    <i class="fa-solid fa-user me-2"></i>
                    {{ getUserDisplayName }}
                  </span>
                  <button class="btn btn-sm btn-outline-danger" @click="deselectUser">
                    <i class="fa-solid fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Selected User Details -->
          <div v-if="internalSelectedUser" class="card mb-4">
            <div class="card-body">
              <h6 class="card-subtitle mb-3 text-white">
                <i class="fa-solid fa-info-circle me-2"></i>Información del
                {{ activeTab === "clients" ? "Cliente" : "Afiliado" }}
              </h6>
              <div class="row g-3">
                <!-- Client Fields -->
                <template v-if="activeTab === 'clients'">
                  <div class="col-md-6">
                    <label class="form-label">Nombre Completo</label>
                    <div class="form-control-static">
                      {{
                        internalSelectedUser.firstName +
                        " " +
                        internalSelectedUser.lastName
                      }}
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Cédula</label>
                    <div class="form-control-static">
                      {{ internalSelectedUser.identification }}
                    </div>
                  </div>
                </template>

                <!-- Affiliate Fields -->
                <template v-else>
                  <div class="col-md-6">
                    <label class="form-label">Nombre de la Empresa</label>
                    <div class="form-control-static">
                      {{ internalSelectedUser.companyName }}
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">RIF</label>
                    <div class="form-control-static">
                      {{ internalSelectedUser.rif }}
                    </div>
                  </div>
                </template>

                <!-- Common Fields -->
                <div class="col-md-6">
                  <label class="form-label">Fecha de Corte</label>
                  <input type="date" v-model="calculatedPayday" class="form-control" id="payDay" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Teléfono</label>
                  <div class="form-control-static">
                    {{ internalSelectedUser.phoneNumber }}
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <div class="form-control-static">
                    {{ internalSelectedUser.email }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Plan Selection -->
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-3 text-white">
                <i class="fa-solid fa-list me-2"></i>Planes Disponibles
              </h6>
              <div class="row g-3">
                <!-- Loading State -->
                <div v-if="!availablePlans || !availablePlans.length" class="col-12 text-center py-4">
                  <div class="spinner-border text-theme" role="status">
                    <span class="visually-hidden">Cargando...</span>
                  </div>
                  <p class="mt-2 text-muted">Cargando planes disponibles...</p>
                </div>

                <!-- Plans List -->
                <template v-else>
                  <div v-for="plan in availablePlans" :key="plan.id" class="col-md-4">
                    <div class="plan-card">
                      <div class="plan-actions">
                        <button class="btn btn-sm btn-outline-light" @click="editPlan(plan)" title="Editar plan">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click="deletePlan(plan)" title="Eliminar plan">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                      <button class="plan-button-big w-100" :class="{ selected: selectedPlan === plan.name }"
                        @click="selectPlan(plan.name)">
                        <span>{{ plan.name.toUpperCase() }}</span>
                        <small>${{ plan.price }}/mes</small>
                        <div class="popular-badge" v-if="plan.isHidden">
                          Oculto
                        </div>
                        <div class="popular-badge" v-if="plan.isPopular">
                          <i class="fa-solid fa-star fa-3xs me-1"></i>Popular
                        </div>
                      </button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button type="button" class="btn btn-theme" @click="assignPlan"
            :disabled="loading || !internalSelectedUser || !selectedPlan || !calculatedPayday">
            <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span v-else><i class="fa-solid fa-check me-2"></i>Asignar Plan</span>            
          </button>
        </div>
      </div>
    </div>
  </div>

  <CreatePlanModal ref="createPlanModal" :active-tab="activeTab" @plan-created="handlePlanCreated" />

  <EditPlanModal ref="editPlanModal" :active-tab="activeTab" :edit-client-plan-data="editClientPlanData"
    :edit-affiliate-plan-data="editAffiliatePlanData" @plan-updated="handlePlanUpdated" />
</template>

<script>
import { Modal } from "bootstrap";
import { showToast } from "@/utils/toast";
import { db } from "@/firebase/init";
import { ref as dbRef, update, get, remove, push, set } from "firebase/database";
import { sendEmail } from "@/utils/emailService.js";
import SearchInput from "@/components/app/SearchInput.vue";
import EditPlanModal from "./EditPlanModal.vue";
import CreatePlanModal from "./CreatePlanModal.vue";

export default {
  name: "AssignSubscriptionModal",
  components: {
    SearchInput,
    EditPlanModal,
    CreatePlanModal,
  },
  emits: ["plan-assigned", "plan-updated", "plan-deleted"],
  props: {
    selectedClient: {
      type: Object,
      default: null,
    },
    selectedAffiliate: {
      type: Object,
      default: null,
    },
    activeTab: {
      type: String,
      required: true,
    },
    plans: {
      type: Array,
      required: true,
    },
    affiliatePlans: {
      type: Array,
      required: true,
    },
    clients: {
      type: Array,
      required: true,
    },
    affiliates: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      searchQuery: "",
      searchResults: [],
      internalSelectedUser: null,
      selectedPlan: null,
      isPaid: false,
      editClientPlanData: {
        id: null,
        name: "",
        price: 0,
        desc: "",
        order: 0,
        requestLimit: 0,
        isPopular: false,
        isHidden: false,
        icon: "",
      },
      editAffiliatePlanData: {
        id: null,
        name: "",
        price: 0,
        desc: "",
        order: 0,
        isPopular: false,
        isHidden: false
      },
      loading: false
    };
  },
  computed: {
    availablePlans() {
      const plansToUse =
        this.activeTab === "clients" ? this.plans : this.affiliatePlans;
      return plansToUse?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
    },
    getUserDisplayName() {
      if (!this.internalSelectedUser) return "";
      return this.activeTab === "clients"
        ? `${this.internalSelectedUser.firstName} ${this.internalSelectedUser.lastName}`
        : this.internalSelectedUser.companyName;
    },
    calculatedPayday() {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      // return the date in YYYY-MM-DD format for date input
      return nextMonth.toISOString().split('T')[0];
    }
  },
  watch: {
    selectedClient: {
      immediate: true,
      handler(newClient) {
        if (newClient) {
          this.internalSelectedUser = newClient;
        }
      },
    },
    selectedAffiliate: {
      immediate: true,
      handler(newAffiliate) {
        if (newAffiliate) {
          this.internalSelectedUser = newAffiliate;
        }
      },
    },
    activeTab: {
      immediate: true,
      handler() {
        // Clear search results when tab changes
        this.searchResults = [];
        this.searchQuery = "";
      },
    },
  },
  methods: {
    searchClients() {
      if (!this.searchQuery || !this.searchQuery.trim()) {
        this.searchResults = [];
        return;
      }

      const searchInput = this.searchQuery.trim().toLowerCase();
      const results = this.clients.filter((client) => {
        if (!client) return false;

        const identification = String(
          client.identification || ""
        ).toLowerCase();
        const firstName = String(client.firstName || "").toLowerCase();
        const lastName = String(client.lastName || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();

        return (
          identification.includes(searchInput) ||
          fullName.includes(searchInput) ||
          firstName.includes(searchInput) ||
          lastName.includes(searchInput)
        );
      });
      this.searchResults = results;
    },
    searchAffiliates() {
      if (!this.searchQuery || !this.searchQuery.trim()) {
        this.searchResults = [];
        return;
      }

      const searchInput = this.searchQuery.trim().toLowerCase();
      const results = this.affiliates.filter((affiliate) => {
        if (!affiliate) return false;

        const rif = String(affiliate.rif || "").toLowerCase();
        const companyName = String(affiliate.companyName || "").toLowerCase();

        return rif.includes(searchInput) || companyName.includes(searchInput);
      });

      this.searchResults = results;
    },
    handleSelect(user) {
      this.internalSelectedUser = user;
      this.searchQuery = "";
      this.searchResults = [];
    },
    deselectUser() {
      this.internalSelectedUser = null;
      this.$emit("user-selected", null);
    },
    async assignPlan() {
      if (!this.internalSelectedUser || !this.selectedPlan || !this.calculatedPayday) {
        showToast("Por favor complete todos los campos requeridos", "error");
        return;
      }

      const userId = this.internalSelectedUser.id;
      const userDisplayName = this.getUserDisplayName;
      const selectedPlanDetails = this.availablePlans.find(
        (plan) => plan.name === this.selectedPlan
      );

      if (!selectedPlanDetails) {
        showToast("Error al seleccionar el plan", "error");
        return;
      }

      const subscriptionData = {
        subscription_id: selectedPlanDetails.id,
        status: true,
        payDay: new Date(this.calculatedPayday).toISOString(),
        isPaid: this.isPaid,
      };

      if (!confirm("¿Desea asignar esta suscripcion?")) {
        return;
      }

      try {
        this.loading = true;

        const userPlanRef = dbRef(db, `Users/${userId}/subscription`);
        await set(userPlanRef, subscriptionData);

        // Email notifications
        const appUrl = "https://app.rosecoupon.com";
        const userType = this.activeTab === "clients" ? "Cliente" : "Afiliado";

        // User notification
        const userEmailPayload = {
          to: this.internalSelectedUser.email,
          message: {
            subject: `Suscripción ${selectedPlanDetails.name.toUpperCase()} activada`,
            text: `Hola ${userDisplayName}, se le ha activado la Suscripción ${selectedPlanDetails.name.toUpperCase()} en Roseapp.
                        Te invitamos a chequear los beneficios que te ofrecemos. Abrir app: ${appUrl}`,
            html: `
              <!DOCTYPE html>
              <html lang="es">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Rose Coupon - Suscripción Activada</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f4f6f9;
                    margin: 0;
                    padding: 0;
                  }
                  .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                    border-radius: 8px;
                    overflow: hidden;
                  }
                  .email-header {
                    background-color: #f0f2f5;
                    color: #2c3e50;
                    text-align: center;
                    padding: 20px;
                    border-bottom: 1px solid #e1e4e8;
                  }
                  .email-body {
                    padding: 30px;
                  }
                  .email-footer {
                    background-color: #f0f2f5;
                    color: #6c757d;
                    text-align: center;
                    padding: 15px;
                    font-size: 0.9em;
                    border-top: 1px solid #e1e4e8;
                  }
                  .btn {
                    display: inline-block;
                    background-color: #4a90e2;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 4px;
                    margin: 20px 0;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  }
                  .details-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                  }
                  .details-table td {
                    padding: 10px;
                    border-bottom: 1px solid #e1e4e8;
                  }
                  .details-table tr:last-child td {
                    border-bottom: none;
                  }
                  .details-label {
                    color: #6c757d;
                    font-weight: 600;
                  }
                </style>
              </head>
              <body>
                <div class="email-container">
                  <div class="email-header">
                    <h1 style="margin: 0;">Rose Coupon</h1>
                    <p style="margin: 10px 0 0;">Confirmación de Suscripción</p>
                  </div>
                  
                  <div class="email-body">
                    <h2>Hola ${userDisplayName},</h2>
                    
                    <p>Su suscripción <strong>${selectedPlanDetails.name.toUpperCase()}</strong> ha sido activada exitosamente.</p>
                    
                    <table class="details-table">
                      <tr>
                        <td class="details-label">Plan</td>
                        <td>${selectedPlanDetails.name.toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td class="details-label">Fecha de Activación</td>
                        <td>${new Date().toLocaleDateString()}</td>
                      </tr>
                      <tr>
                        <td class="details-label">Precio Mensual</td>
                        <td>$${selectedPlanDetails.price}</td>
                      </tr>
                    </table>
                    
                    <a href="${appUrl}" class="btn">Acceder a Rose Coupon</a>
                    
                    <p>Si tiene alguna pregunta, no dude en contactar a nuestro equipo de soporte.</p>
                  </div>
                  
                  <div class="email-footer">
                    <p>&copy; ${new Date().getFullYear()} Rose Coupon. Todos los derechos reservados.</p>
                    <p>Este es un correo electrónico automático. Por favor, no responda.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          },
        };

        const adminEmailPayload = {
          to: "roseindustry11@gmail.com",
          message: {
            subject: `Nuevo ${userType} suscrito al Plan ${selectedPlanDetails.name.toUpperCase()}`,
            text: `Un nuevo ${userType}, ${userDisplayName}, se ha suscrito al plan ${selectedPlanDetails.name.toUpperCase()}.`,
            html: `
              <!DOCTYPE html>
              <html lang="es">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Rose Coupon - Nueva Suscripción</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f4f6f9;
                    margin: 0;
                    padding: 0;
                  }
                  .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                    border-radius: 8px;
                    overflow: hidden;
                  }
                  .email-header {
                    background-color: #f0f2f5;
                    color: #2c3e50;
                    text-align: center;
                    padding: 20px;
                    border-bottom: 1px solid #e1e4e8;
                  }
                  .email-body {
                    padding: 30px;
                  }
                  .email-footer {
                    background-color: #f0f2f5;
                    color: #6c757d;
                    text-align: center;
                    padding: 15px;
                    font-size: 0.9em;
                    border-top: 1px solid #e1e4e8;
                  }
                  .details-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                  }
                  .details-table td {
                    padding: 10px;
                    border-bottom: 1px solid #e1e4e8;
                  }
                  .details-table tr:last-child td {
                    border-bottom: none;
                  }
                  .details-label {
                    color: #6c757d;
                    font-weight: 600;
                  }
                </style>
              </head>
              <body>
                <div class="email-container">
                  <div class="email-header">
                    <h1 style="margin: 0;">Rose Coupon</h1>
                    <p style="margin: 10px 0 0;">Notificación de Nueva Suscripción</p>
                  </div>
                  
                  <div class="email-body">
                    <h2>Nueva Suscripción Registrada</h2>
                    
                    <p>Un nuevo ${userType} se ha suscrito al plan <strong>${selectedPlanDetails.name.toUpperCase()}</strong>.</p>
                    
                    <table class="details-table">
                      <tr>
                        <td class="details-label">Tipo de Usuario</td>
                        <td>${userType}</td>
                      </tr>
                      <tr>
                        <td class="details-label">Nombre</td>
                        <td>${userDisplayName}</td>
                      </tr>
                      <tr>
                        <td class="details-label">Plan</td>
                        <td>${selectedPlanDetails.name.toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td class="details-label">Fecha de Registro</td>
                        <td>${new Date().toLocaleDateString()}</td>
                      </tr>
                    </table>
                    
                    <p>Por favor, revise los detalles de la nueva suscripción en el panel administrativo.</p>
                  </div>
                  
                  <div class="email-footer">
                    <p>&copy; ${new Date().getFullYear()} Rose Coupon. Notificación Administrativa</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          },
        };

        await this.sendNotificationEmail(userEmailPayload);
        await this.sendNotificationEmail(adminEmailPayload);

        showToast("Suscripción asignada con éxito!");
        this.resetModalData();
        this.$emit("plan-assigned");
      } catch (error) {
        console.error("Error assigning plan:", error);
        showToast("La asignación de la suscripción falló", "error");
      } finally {
        this.loading = false;
      }
    },
    async sendNotificationEmail(emailPayload) {
      try {
        const result = await sendEmail(emailPayload);
        if (result.success) {
          console.log("Email sent successfully:", result.message);
        } else {
          console.error("Failed to send email:", result.error);
        }
      } catch (error) {
        console.error("Error sending email:", error);
      }
    },
    selectPlan(planName) {
      if (this.selectedPlan === planName) {
        this.selectedPlan = null;
      } else {
        this.selectedPlan = planName;
      }
    },
    resetModalData() {
        this.internalSelectedUser = null;
      this.selectedPlan = null;
      this.isPaid = false;
      this.searchQuery = "";
      this.searchResults = [];
    },
    handlePlanCreated() {
      showToast("Plan creado exitosamente", "success");
      this.$emit("plan-updated");
    },
    handlePlanUpdated() {
      // Show assign modal after a short delay
      setTimeout(() => {
        const assignModal = new Modal(document.getElementById("assignModal"));
        assignModal.show();
      }, 100);

      this.$emit("plan-updated");
    },
    editPlan(plan) {
      // Create a deep copy of the plan
      const planData = JSON.parse(JSON.stringify(plan));

      if (this.activeTab === "clients") {
        this.editClientPlanData = {
          id: planData.id,
          name: planData.name || "",
          price: Number(planData.price) || 0,
          desc: planData.desc || "",
          order: Number(planData.order) || 0,
          requestLimit: Number(planData.requestLimit) || 0,
          isPopular: Boolean(planData.isPopular),
          isHidden: Boolean(planData.isHidden),
          icon: planData.icon || "",
        };
      } else {
        this.editAffiliatePlanData = {
          id: planData.id,
          name: planData.name || "",
          price: Number(planData.price) || 0,
          desc: planData.desc || "",
          order: Number(planData.order) || 0,
          isPopular: Boolean(planData.isPopular),
          isHidden: Boolean(planData.isHidden),
        };
      }

      // Hide assign modal first
      const assignModal = Modal.getInstance(document.getElementById("assignModal"));
      assignModal.hide();

      // Show edit modal after a short delay
      setTimeout(() => {
        const editModal = new Modal(document.getElementById("editPlanModal"));
        editModal.show();
      }, 100);
    },
    async deletePlan(plan) {
      if (!confirm(`¿Está seguro que desea eliminar el plan ${plan.name}?`)) {
        return;
      }

      try {
        const planRef = dbRef(
          db,
          `${this.activeTab === "clients" ? "Suscriptions" : "Affiliate_suscriptions"}/${plan.id}`
        );
        await remove(planRef);

        showToast("Plan eliminado exitosamente");
        this.$emit("plan-deleted");
      } catch (error) {
        console.error("Error deleting plan:", error);
        showToast("Error al eliminar el plan", "error");
      }
    },
  },
};
</script>

<style scoped>
/* Inherit the dark theme styles from parent */
.modal-content {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.modal-header {
  border-bottom-color: #444;
  background-color: rgba(111, 66, 193, 0.1);
}

.modal-footer {
  border-top-color: #444;
}

.form-control,
.form-select {
  background-color: #2d2d2d;
  border-color: #444;
  color: #fff;
}

.form-control:focus,
.form-select:focus {
  background-color: #2d2d2d;
  border-color: #6f42c1;
  color: #fff;
  box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

/* Button Styles */
.btn-outline-theme,
.btn-theme {
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

.btn-outline-light {
  border-radius: 20px;
}

.card {
  background-color: #2d2d2d;
  border: 1px solid #444;
  border-radius: 0.5rem;
}

.text-purple {
  color: #6f42c1;
}

.bg-dark-purple {
  background-color: #2d1b3a;
}

.form-control-static {
  padding: 0.375rem 0.75rem;
  background-color: #383838;
  border-radius: 0.25rem;
  min-height: 38px;
  display: flex;
  align-items: center;
}

.plan-button-big {
  position: relative;
  padding: 1.5rem 1rem;
  background-color: #383838;
  border: 1px solid #444;
  border-radius: 0.5rem;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.plan-button-big:hover {
  background-color: #444;
  border-color: #6f42c1;
  transform: translateY(-2px);
}

.plan-button-big.selected {
  background-color: #6f42c1;
  border-color: #6f42c1;
}

.plan-button-big i {
  font-size: 1.5rem;
}

.plan-button-big small {
  opacity: 0.7;
}

.alert-info {
  background-color: rgba(111, 66, 193, 0.1);
  border-color: #6f42c1;
  color: #fff;
}

.btn-close-white {
  filter: invert(1) grayscale(100%) brightness(200%);
}

.plan-card {
  position: relative;
  margin-bottom: 1rem;
}

.plan-actions {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  display: flex;
  gap: 0.5rem;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.plan-card:hover .plan-actions {
  opacity: 1;
}

.popular-badge {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  background: purple;
  color: white;
  padding: 0.15rem 0.35rem;
  border-radius: 0.75rem;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>

