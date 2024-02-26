<script>
export default {
  data() {
    return {
      selectedRole: null,
      // Keep the rest of your data properties and methods as before
      employees: [],
      selectedEmployee: null,
    };
  },
  methods: {
    selectRole(role) {
      this.selectedRole = role;
    },
    // Include other methods (fetchEmployees, selectEmployee, assignRole) as before
    async fetchEmployees() {
      // Fetch employees from your API
    },
    selectEmployee(employee) {
      this.selectedEmployee = employee.name;
    },
    assignRole() {
      console.log("Assigning Role:", this.selectedRole, "to", this.selectedEmployee);
      // Implement the API call to assign the role here
    },
  },
  // Keep the mounted lifecycle hook for fetching employees
  mounted() {
    this.fetchEmployees();
  },
};
</script>
<template>
    <div class="container py-5 h-100">
        <div class="row justify-content-center align-items-center h-100">
            <div class="col-12 col-md-8 col-lg-6">
                <div class="card shadow">
                    <div class="card-body">
                        <h2 class="card-title mb-4 text-center">Registrar opciones de POS</h2>

                        <!-- Category Form -->
                        <form @submit.prevent="submitCategory" class="mb-3">
                            <div class="mb-3">
                                <label for="categoryName" class="form-label">Agregar Categoria de Menu:</label>
                                <input type="text" class="form-control" id="categoryName" v-model="categoryName" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Agregar</button>
                        </form>

                        <!-- Tables Form -->
                        <form @submit.prevent="submitTables" class="mb-3">
                            <div class="mb-3">
                                <label for="numberOfTables" class="form-label">Actualizar Numero de mesas:</label>
                                <input type="number" class="form-control" id="numberOfTables"
                                    v-model.number="numberOfTables" min="1" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Actualizar</button>
                        </form>

                        <!-- Role Assignment Form -->
                        <form @submit.prevent="submitRole">
                            <div class="mb-3">
                                <label class="form-label">Assign Role:</label>
                                <button class="btn btn-secondary dropdown-toggle" type="button" id="roleDropdown"
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                    {{ selectedRole || 'Select Role' }}
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="roleDropdown">
                                    <li>
                                        <a class="dropdown-item" href="#" @click.prevent="selectRole('Admin')">Admin</a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item" href="#" @click.prevent="selectRole('Cashier')">Cashier</a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item" href="#" @click.prevent="selectRole('Waiter')">Waiter</a>
                                    </li>
                                </ul>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Employee:</label>
                                <button class="btn btn-secondary dropdown-toggle" type="button" id="employeeDropdown"
                                    data-bs-toggle="dropdown" aria-expanded="false">
                                    {{ selectedEmployee || 'Select Employee' }}
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="employeeDropdown">
                                    <li v-for="employee in employees" :key="employee.id">
                                        <a class="dropdown-item" href="#" @click.prevent="selectEmployee(employee)">
                                            {{ employee.name }}
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <button type="submit" class="btn btn-primary">Aceptar</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
</div></template>