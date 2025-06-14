<template>
    <div class="custom-nav">
        <button 
            v-for="(action, index) in actions" 
            :key="index"
            class="nav-btn" 
            :class="{ active: action.isActive }"
            @click="handleAction(action)"
        >
            <i class="fa" :class="action.icon"></i>
            <span>{{ action.text }}</span>
            <span class="badge" v-if="action.badge">{{ action.badge }}</span>
        </button>
    </div>
</template>
<script>
export default {
    name: 'CustomNav',
    props: {
        actions: {
            type: Array,
            required: true,
            default: () => [],
            validator: (actions) => {
                return actions.every(action => {
                    // Check if action has required properties
                    if (!action.text || typeof action.text !== 'string') return false;
                    if (!action.icon || typeof action.icon !== 'string') return false;
                    if (typeof action.onClick !== 'function') return false;
                    
                    // Optional properties
                    if (action.badge !== undefined && typeof action.badge !== 'number') return false;
                    if (action.isActive !== undefined && typeof action.isActive !== 'boolean') return false;
                    
                    return true;
                });
            }
        }
    },
    emits: ['update:modelValue'],
    methods: {
        handleAction(action) {
            action.onClick();
        },
        clearSearch() {
            this.$emit('update:modelValue', '')
        }
    }
}
</script>
<style>
.custom-nav {
    display: flex;
    height: 100%;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: #adb5bd;
    border-radius: 8px;
    transition: all 0.2s ease;
    position: relative;
}

.nav-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

.nav-btn.active {
    background: #29122f;
    color: #fff;
}

.nav-btn .badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #dc3545;
    color: #fff;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 10px;
}
/* Responsive adjustments */
@media (max-width: 768px) {
    .custom-nav {
        margin-top: 1rem;
        padding: 1rem !important;
        flex-direction: column;
    }

    .nav-btn {
        width: 100%;
    }
}
</style>