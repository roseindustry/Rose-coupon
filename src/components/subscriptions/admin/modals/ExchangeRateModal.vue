<template>
    <div class="modal fade" id="setExchange" tabindex="-1" aria-labelledby="setExchangeModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Tasa de Cambio</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Monto en Bolívares</label>
                        <div class="input-group">
                            <span class="input-group-text">Bs</span>
                            <input type="number" class="form-control" v-model.number="exchange" min="0"
                                placeholder="Ingrese el monto" />
                        </div>
                        <small class="form-text text-muted mt-2">
                            <i class="fa-solid fa-info-circle me-1"></i>
                            Este valor se utilizará para calcular los precios en bolívares
                        </small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-light" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-theme" @click="setExchange">
                        <i class="fa-solid fa-save me-2"></i>Guardar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { showToast } from '@/utils/toast';
import { db } from '@/firebase/init';
import { ref as dbRef, update, get } from 'firebase/database';

export default {
    name: 'ExchangeRateModal',
    data() {
        return {
            exchange: 0
        }
    },
    methods: {
        async setExchange() {
            if (confirm("¿Desea asignar este nueva tasa de cambio a la app?")) {
                const creditRef = dbRef(db, `Exchange`);
                try {
                    const value = {
                        value: parseFloat(this.exchange),
                    }
                    await update(creditRef, value);

                    showToast('Tasa actualizada!');
                    this.$emit('exchange-updated');
                    
                    // Reset form fields
                    await this.fetchCurrentExchange();
                } catch (error) {
                    console.error('Error setting exchange value:', error);
                    showToast('No se pudo editar el valor.', 'error');
                }
            }
        },
        async fetchCurrentExchange() {
            try {
                const exchangeRef = dbRef(db, `Exchange`);
                const exchangeSnapshot = await get(exchangeRef);

                if (exchangeSnapshot.exists()) {
                    const exchangeData = exchangeSnapshot.val();
                    this.exchange = parseFloat(exchangeData.value).toFixed(2);
                } else {
                    console.log('No exchange value found.');
                    this.exchange = 0;
                }
            } catch (error) {
                console.error('Error fetching current exchange value:', error);
                this.exchange = 0;
            }
        }
    },
    async mounted() {
        await this.fetchCurrentExchange();
    }
}
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

.form-control, .form-select {
    background-color: #2d2d2d;
    border-color: #444;
    color: #fff;
}

.form-control:focus, .form-select:focus {
    background-color: #2d2d2d;
    border-color: #6f42c1;
    color: #fff;
    box-shadow: 0 0 0 0.25rem rgba(111, 66, 193, 0.25);
}

.btn-theme {
    background-color: #6f42c1;
    border-color: #6f42c1;
    color: white;
}

.btn-theme:hover {
    background-color: #5a32a3;
    border-color: #5a32a3;
}

.input-group-text {
    background-color: #444;
    border-color: #444;
    color: #fff;
}

.btn-close-white {
    filter: invert(1) grayscale(100%) brightness(200%);
}

.form-text {
    color: #aaa !important;
}
</style> 