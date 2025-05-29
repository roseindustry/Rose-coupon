import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubscription } from '@/composables/useSubscription';
import { ref as dbRef, get } from 'firebase/database';

// Mock Firebase
vi.mock('@/firebase/init', () => ({
    db: {},
}));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    get: vi.fn(),
}));

describe('useSubscription', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default values', () => {
        const { subscriptionPlan, userSubscriptionId, isLoading, error } = useSubscription();
        
        expect(subscriptionPlan.value).toEqual({});
        expect(userSubscriptionId.value).toBe('');
        expect(isLoading.value).toBe(false);
        expect(error.value).toBe(null);
    });

    it('should handle user without subscription', async () => {
        const mockUserData = {
            exists: () => true,
            val: () => ({
                subscription: null
            })
        };

        (get as any).mockResolvedValueOnce(mockUserData);

        const { fetchSubscriptionPlan, subscriptionPlan } = useSubscription();
        await fetchSubscriptionPlan('test-user-id');

        expect(subscriptionPlan.value).toEqual({
            name: 'Sin suscripcion',
            status: false,
            price: 0,
            payDay: null,
            isPaid: false
        });
    });

    it('should handle user with subscription', async () => {
        const mockUserData = {
            exists: () => true,
            val: () => ({
                subscription: {
                    subscription_id: 'test-sub-id'
                }
            })
        };

        const mockSubscriptionData = {
            exists: () => true,
            val: () => ({
                subscription_id: 'test-sub-id',
                status: true,
                payDay: '2024-01-01',
                isPaid: false,
                paymentUploaded: true,
                lastPaymentDate: '2024-01-01',
                paymentUrl: 'https://example.com/payment',
                paymentVerified: false,
            })
        };

        const mockSubscriptionDetails = {
            exists: () => true,
            val: () => ({
                name: 'Premium',
                price: Number(100),
                icon: 'fa-star',
                isYearly: true,
                isMonthly: true
            })
        };

        (get as any)
            .mockResolvedValueOnce(mockUserData)
            .mockResolvedValueOnce(mockSubscriptionData)
            .mockResolvedValueOnce(mockSubscriptionDetails);

        const { fetchSubscriptionPlan, subscriptionPlan } = useSubscription();
        await fetchSubscriptionPlan('test-user-id');

        expect(subscriptionPlan.value).toEqual({
            id: 'test-sub-id',
            name: 'Premium',
            status: true,
            price: Number(100),
            payDay: '2024-01-01',
            isPaid: false,
            paymentUploaded: true,
            lastPaymentDate: '2024-01-01',
            paymentUrl: 'https://example.com/payment',
            paymentVerified: false,
            icon: 'fa-star',
            isYearly: true,
            isMonthly: true,
        });
    });

    it('should handle errors gracefully', async () => {
        (get as any).mockRejectedValueOnce(new Error('Test error'));

        const { fetchSubscriptionPlan, error } = useSubscription();
        await fetchSubscriptionPlan('test-user-id');

        expect(error.value).toBe('Test error');
    });
}); 