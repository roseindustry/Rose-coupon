<template>
    <div class="options-nav">
        <div class="options-container">
            <div v-for="option in options" :key="option.value" class="option-item">
                <input class="option-input" type="radio" :id="option.value" :value="option.value"
                    v-model="selectedValue" @change="handleChange">
                <label class="option-label" :for="option.value">
                    <i :class="['fas', option.icon]"></i>
                    <span>{{ option.text }}</span>
                </label>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'OptionsNav',
    props: {
        modelValue: {
            type: String,
            required: true
        },
        options: {
            type: Array,
            required: true,
            validator: (value) => {
                return value.every(option =>
                    typeof option === 'object' &&
                    'text' in option &&
                    'value' in option &&
                    'icon' in option
                )
            }
        }
    },
    emits: ['update:modelValue', 'change'],
    computed: {
        selectedValue: {
            get() {
                return this.modelValue
            },
            set(value) {
                this.$emit('update:modelValue', value)
            }
        }
    },
    methods: {
        handleChange(event) {
            this.$emit('change', event.target.value)
        }
    }
}
</script>

<style lang="scss" scoped>
.options-nav {
    width: 100%;
    margin: 1rem 0;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.options-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;
}

.option-item {
    position: relative;
    flex: 1;
    min-width: 140px;
    max-width: 200px;
}

.option-input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;

    &:checked+.option-label {
        background: rgba(111, 66, 193, 0.15);
        color: #6f42c1;
        border-color: #6f42c1;
        box-shadow: 0 2px 5px rgba(111, 66, 193, 0.2);

        i {
            color: #6f42c1;
        }
    }

    &:focus+.option-label {
        box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.25);
    }
}

.option-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #b8b8b8;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
        background: rgba(111, 66, 193, 0.05);
        border-color: rgba(111, 66, 193, 0.2);
    }

    i {
        font-size: 1rem;
        transition: color 0.2s ease;
    }
}

/* Responsive Styles */
@media (max-width: 768px) {
    .options-nav {
        margin: 0.75rem 0;
        padding: 0.5rem;
    }

    .options-container {
        gap: 0.5rem;
    }

    .option-item {
        min-width: 120px;
    }

    .option-label {
        padding: 0.6rem 0.75rem;
        font-size: 0.8rem;

        i {
            font-size: 0.9rem;
        }
    }
}

@media (max-width: 575.98px) {
    .options-container {
        flex-direction: column;
        align-items: stretch;
    }

    .option-item {
        min-width: 100%;
        max-width: none;
    }

    .option-label {
        padding: 0.75rem;
        font-size: 0.875rem;
        justify-content: flex-start;

        i {
            font-size: 1rem;
            width: 20px;
            text-align: center;
        }
    }
}
</style>