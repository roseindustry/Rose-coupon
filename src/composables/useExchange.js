import { ref } from 'vue';
import { db } from '../firebase/init';
import { ref as dbRef, get } from 'firebase/database';

export function useExchange() {
    const exchange = ref(0);
    const isLoading = ref(false);
    const error = ref(null);

    const fetchCurrentExchange = async () => {
        isLoading.value = true;
        error.value = null;

        try {
            const exchangeRef = dbRef(db, 'Exchange');
            const exchangeSnapshot = await get(exchangeRef);

            if (exchangeSnapshot.exists()) {
                const exchangeData = exchangeSnapshot.val();
                exchange.value = exchangeData.value;
            } else {
                console.log("No exchange value found.");
                exchange.value = 0;
            }
        } catch (err) {
            console.error("Error fetching current exchange value:", err);
            error.value = err.message;
            exchange.value = 0;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        exchange,
        isLoading,
        error,
        fetchCurrentExchange
    };
} 