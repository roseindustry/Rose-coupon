<template>
    <div class="header-container d-flex justify-content-between align-items-center">
        <h4 class="mb-0 text-primary">
            <i :class="[icon, 'me-2']"></i>
            {{ title }}
        </h4>
        <div v-if="isAdmin" class="header-actions d-flex gap-2">
            <CustomButton
                v-for="(action, index) in actions"
                :key="index"
                :icon="action.icon"
                :text="action.text"
                :button-class="`${action.class}`"
                :modal-toggle="action.modalToggle"
                :modal-target="action.modalTarget"
                :on-click="action.onClick"
            />
        </div>
    </div>
</template>

<script>
import CustomButton from './CustomButton.vue'

export default {
    name: 'PageHeader',
    components: {
        CustomButton
    },
    props: {
        isAdmin: {
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
        actions: {
            type: Array,
            required: true,
            // Each action should have: { icon, text, class, onClick, modalToggle?, modalTarget? }
            validator: (actions) => {
                return actions.every(action =>
                    typeof action.icon === 'string' &&
                    typeof action.class === 'string' &&
                    typeof action.text === 'string' &&
                    typeof action.onClick === 'function'
                )
            }
        }
    }
}
</script>

<style scoped>
.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
}

.header-actions {
    display: flex;
    gap: 0.5rem;
}

.header-actions .btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
}

.header-actions .btn i {
    font-size: 1rem;
}

.exchange-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    margin-left: 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
}

/* Hide text in header actions on small screens */
@media (max-width: 576px) {
    .header-actions :deep(.action-text) {
        display: none;
    }

    .header-actions :deep(.header-action-btn) {
        padding: 0.375rem;
        min-width: 36px;
        justify-content: center;
    }

    .header-actions :deep(.header-action-btn i) {
        margin: 0;
    }
}

/* Mobile Styles */
@media (max-width: 768px) {
    .header-container {
        flex-direction: row;
        align-items: center;
    }

    .btn-theme.btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }

    .btn-glass {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
    }
}

@media (max-width: 576px) {
    .header-container {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
    }

    .header-actions {
        margin-left: auto;
    }
}
</style>