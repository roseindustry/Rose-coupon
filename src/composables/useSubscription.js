import { ref, computed } from 'vue';
import { db } from '../firebase/init';
import { ref as dbRef, get } from 'firebase/database';

export function useSubscription() {
    const subscriptionPlan = ref({});
    const userSubscriptionId = ref('');
    const isLoading = ref(false);
    const error = ref(null);

    const fetchSubscriptionPlan = async (userId) => {
        if (!userId) return;

        isLoading.value = true;
        error.value = null;

        try {
            const userRef = dbRef(db, `Users/${userId}`);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const user = snapshot.val();

                // Check if the user has a subscription plan and it's an object
                if (user.subscription && typeof user.subscription === 'object') {
                    const userSubscriptionRef = dbRef(db, `Users/${userId}/subscription`);
                    const subscriptionSnapshot = await get(userSubscriptionRef);

                    if (subscriptionSnapshot.exists()) {
                        const subscriptionData = subscriptionSnapshot.val();
                        userSubscriptionId.value = subscriptionData.subscription_id;

                        // Query the Suscriptions collection
                        const subscriptionDataRef = dbRef(db, `Suscriptions/${userSubscriptionId.value}`);
                        const userSuscriptionSnapshot = await get(subscriptionDataRef);

                        if (userSuscriptionSnapshot.exists()) {
                            const userSuscription = userSuscriptionSnapshot.val();

                            subscriptionPlan.value = {
                                id: userSubscriptionId.value,
                                name: userSuscription.name,
                                status: subscriptionData.status || false,
                                price: userSuscription.isYearly && userSuscription.yearlyPrice ? userSuscription.yearlyPrice : (userSuscription.price || 0),
                                payDay: subscriptionData.payDay || null,
                                isPaid: subscriptionData.isPaid || false,
                                paymentUploaded: subscriptionData.paymentUploaded || false,
                                paymentVerified: subscriptionData.paymentVerified || false,
                                paymentUrl: subscriptionData.paymentUrl || null,
                                lastPaymentDate: subscriptionData.lastPaymentDate || null,
                                icon: userSuscription.icon || 'fa fa-times',
                                isYearly: userSuscription.isYearly || false,
                                isMonthly: userSuscription.isMonthly || false,
                            };
                        }
                    }
                } else {
                    // Handle case where there is no subscription plan
                    subscriptionPlan.value = {
                        name: 'Sin suscripcion',
                        status: false,
                        price: 0,
                        payDay: null,
                        isPaid: false
                    };
                }
            }
        } catch (err) {
            console.error('Error fetching subscription plan:', err);
            error.value = err.message;
        } finally {
            isLoading.value = false;
        }
    };

    const isFreeSubscription = computed(() => {
        return subscriptionPlan.value.price === 0;
    });

    return {
        subscriptionPlan,
        userSubscriptionId,
        isLoading,
        error,
        fetchSubscriptionPlan,
        isFreeSubscription
    };
} 