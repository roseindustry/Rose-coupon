import { defineStore } from 'pinia';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ref as databaseRef, get } from 'firebase/database';
import { db } from '@/firebase/init';
import { useTenancyStore } from '@/stores/tenancy';

interface UserRoleState {
  role: string;
  userId: string | null;
}

export const useUserStore = defineStore('user-role', {
  state: (): UserRoleState => ({
    role: '',
    userId: null,
    
  }),
  actions: {
    async searchUsers(query) {
      const tenancyStore = useTenancyStore();
      const tenantId = tenancyStore.tenant.key;
      const dbRef = databaseRef(db, `Users`);
      
      try {
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          const users = snapshot.val();
          
          // Each user object has an 'identification' you can filter by
          return Object.entries(users).filter(([key, value]) => 
          (value.identification || (value.firstName + value.lastName)) && value.tenant_id === tenantId
          ).map(([key, value]) => ({ uid: key, ...value }));
        }
        return [];
      } catch (error) {
        console.error("Firebase search failed:", error);
        return [];
      }
    },
    async setUserRole(uid: string) {
      this.userId = uid;
      const dbRef = databaseRef(db, `Users/${uid}`);
      try {
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          this.role = snapshot.val().role || 'unknown'; // Default to 'unknown' or any other default role if role is not set
        } else {
          console.log("No data available");
          this.role = 'unknown'; // Set to a default role if no data is available
        }
      } catch (error) {
        console.error("Firebase read failed:", error);
        this.role = 'error'; // Handle error in role retrieval, maybe set to an error state or default
      }
    },
    fetchUser() {
      const auth = getAuth();
      onAuthStateChanged(auth, (user) => {
        if (user) {
          this.setUserRole(user.uid);
        } else {
          this.role = '';
          this.userId = null;
        }
      });
    },
    getters: {
        getUserRole: (state) => state.role,
        getUserId: (state) => state.userId,
      },
  }
});
