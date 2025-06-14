<template>
    <select class="form-select form-select-lg" :value="modelValue" 
        @change="$emit('update:modelValue', $event.target.value)">
        <template v-if="options.length === 0">No hay opciones disponibles.</template>
        <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.text }} {{ option.count ? `(${option.count})` : '' }}
        </option>
    </select>
</template>
<script>
export default {
    name: 'CustomSelect',
    props: {
        modelValue: {
            type: String || {},
            default: ''
        },
        options: {
            type: Array,
            required: true,
            default: () => [],
            validator: (options) => {
                return options.every(option => {
                    // Required properties
                    if (!option.text || typeof option.text !== 'string') return false;
                    if (!option.value || typeof option.value !== 'string') return false;

                    // Optional properties
                    if (option.count !== undefined && typeof option.count !== 'number') return false;

                    return true;
                });
            }
        }
    },
    emits: ['update:modelValue']
}
</script>
<style>
.form-select {
    background-color: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    height: auto;
}

.form-select:focus {
    background-color: #1a1a1a;
    border-color: purple;
    color: #fff;
    box-shadow: 0 0 0 0.25rem rgba(128, 0, 128, 0.25);
}

.form-select option {
    background-color: #1a1a1a;
    color: #fff !important;
    padding: 0.5rem;
}

.form-select:focus {
    border-color: purple;
    box-shadow: 0 0 0 0.25rem rgba(128, 0, 128, 0.25);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .form-select {
        font-size: 0.875rem;
        padding: 0.5rem 0.75rem;
    }
}
</style>