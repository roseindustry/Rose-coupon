<template>
    <div class="dashboard-card">
        <div class="icon-container">
            <i class="fa" :class="icon"></i>
        </div>
        <h6 class="card-title text-white mb-2">{{ title }}</h6>
        <div class="mt-1">
            <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-label="Loading"></span>
            <h4 v-else class="fw-bold mb-2">{{ value || 0 }}</h4>
        </div>
        <div v-if="actions && actions.length" class="mt-2">
            <template v-for="(action, index) in actions" :key="index">
                <router-link v-if="action.isRoute" :to="action.route" class="btn btn-theme btn-sm me-2">
                    {{ action.text }}
                </router-link>
                <CustomButton v-else :text="action.text" :button-class="action.class" :modal-toggle="action.modalToggle"
                    :modal-target="action.modalTarget" :on-click="action.onClick" />
            </template>
        </div>
    </div>
</template>
<script>
import CustomButton from './CustomButton.vue';

export default {
    components: {
        CustomButton
    },
    name: 'DashboardCard',
    props: {
        loading: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            required: true
        },
        actions: {
            type: Array,
            required: false,
            default: () => [],
            validator: (actions) => {
                return actions.every(action => {
                    // Check if action has required properties
                    if (!action.text || typeof action.text !== 'string') return false;

                    // Check if action is either a button or a route, but not both
                    const isButton = action.isButton === true;
                    const isRoute = action.isRoute === true;
                    if (isButton === isRoute) return false; // Must be exactly one of them

                    // Check if action has the correct handler based on its type
                    if (isButton && typeof action.onClick !== 'function') return false;
                    if (isRoute && typeof action.route !== 'string') return false;

                    return true;
                });
            }
        }
    }
}
</script>
<style>
/* Button styles */
.btn-theme {
    border-radius: 20px;
    font-size: 0.85rem;
    padding: 0.375rem 0.75rem;
    transition: all 0.2s ease;
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

.btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

/* card styles */
.dashboard-card {
    background-color: #2d2d2d;
    border-radius: 12px;
    padding: 1.25rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: transform 0.2s ease;
}

.dashboard-card:hover {
    transform: translateY(-2px);
}

.dashboard-card .icon-container {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: rgba(128, 0, 128, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.75rem;
}

.dashboard-card .icon-container i {
    font-size: 1rem;
    color: purple;
}

.dashboard-card h6 {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}

.dashboard-card h4 {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
}

.dashboard-card .btn-sm {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
}

.icon-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
}

.icon-circle:hover {
    transform: scale(1.05);
}

/* Date filter styling */
.date-filter {
    width: 100%;
    max-width: 200px;
}

.date-filter .form-control {
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
</style>