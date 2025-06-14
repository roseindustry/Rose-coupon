<template>
    <div class="search-card">
        <label class="form-label">
            <i class="fas fa-search me-2"></i>
            {{ title }}
        </label>
        <div class="search-input-wrapper">
            <input 
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
                class="form-control form-control-lg"
                :placeholder="placeholder"
            >
            <div class="search-actions">
                <button class="btn btn-icon" v-if="modelValue" @click="clearSearch">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'SearchCard',
    props: {
        title: {
            type: String,
            required: true
        },
        modelValue: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: 'Buscar...'
        }
    },
    emits: ['update:modelValue'],
    methods: {
        clearSearch() {
            this.$emit('update:modelValue', '')
        }
    }
}
</script>
<style>
.search-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.search-input-wrapper {
    position: relative;
}

.search-input-wrapper .form-control {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding-right: 3rem;
    height: 48px;
    font-size: 1rem;
}

.search-input-wrapper .form-control:focus {
    background: rgba(0, 0, 0, 0.3);
    border-color: #6f42c1;
    box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}
.form-label {
    color: #adb5bd;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}

.search-actions {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 0.5rem;
}
</style>