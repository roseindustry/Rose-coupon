<template>
    <div class="position-relative">
        <input type="text" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"
            :placeholder="placeholder" class="form-control" autocomplete="off" />
        <div class="dropdown-menu show w-100 mt-2" v-show="results.length > 0 || modelValue.length > 0"
            style="max-height: 200px; overflow-y: auto;">
            <i class="dropdown-item disabled" v-if="results.length === 0">No se encontraron resultados</i>
            <div class="list-group">
                <button type="button" class="list-group-item list-group-item-action" v-for="item in results"
                    :key="item.uid" @click.prevent="$emit('select', item)">
                    {{ item.identification }} - {{ item.firstName }} {{ item.lastName }}
                </button>
            </div>
        </div>
        <div v-if="selectedItem" class="selected-item-details mt-2">
            <div class="alert alert-info" role="alert">
                {{ selectedItemText }}
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        modelValue: {
            type: String,
            default: ''
        },
        results: {
            type: Array,
            default: () => []
        },
        placeholder: {
            type: String,
            default: ''
        },
        selectedItem: {
            type: Object,
            default: () => null
        },
        selectedItemText: {
            type: String,
            default: ''
        }
    }
};
</script>

<style scoped>
.position-relative {
    position: relative;
}

.dropdown-menu.show {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    display: block;
    float: left;
    min-width: 100%;
    padding: 0.5rem 0;
    margin: 0;
    font-size: 1rem;
    color: #212529;
    text-align: left;
    background-color: #fff;
    background-clip: padding-box;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0.25rem;
}

.list-group-item-action {
    cursor: pointer;
}
</style>