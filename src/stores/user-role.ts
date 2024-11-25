import { defineStore } from 'pinia';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getUserData } from '../helpers/firebaseService.js';

interface UserRoleState {
  role: string;
  userId: string | null;
  userName: string | null;
  isVerified: boolean;
}

export const useUserStore = defineStore('user-role', {
  state: (): UserRoleState => ({
    role: '',
    userId: null,
    userName: null,
    isVerified: false,
  }),
  actions: {
    async searchUsers() {
      const dbRef = databaseRef(db, `Users`);
      
      try {
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          const users = snapshot.val();
          
          return Object.entries(users).filter(([key, value]) => 
          (value.identification || value.firstName || value.lastName)).map(([key, value]) => ({ uid: key, ...value }));
        }
        return [];
      } catch (error) {
        console.error("Firebase search failed:", error);
        return [];
      }
    },
    async setUserRole(uid: string) {
      this.userId = uid;
      try {
        const snapshot = await getUserData(uid);
        if (snapshot.exists()) {
          const data = snapshot.val();
          this.role = data.role || 'unknown';
          this.userName = this.role === 'cliente' ||
          this.role === 'admin'
            ? `${data.firstName} ${data.lastName}` 
            : data.companyName;
          this.isVerified = data.isVerified;
        } else {
          console.log("No data available");
          this.resetUser();
        }
      } catch (error) {
        console.error("Firebase error:", error);
        this.resetUser();
      }
    },
    fetchUser() {
      const auth = getAuth();
      onAuthStateChanged(auth, (user) => {
        if (user) {
          this.setUserRole(user.uid);
        } else {
          this.resetUser();
        }
      });
    },
    resetUser() {
      this.role = 'unknown';
      this.userId = null;
      this.userName = null;
      this.isVerified = false;
    },
  },
  getters: {
    getUserRole: (state) => state.role,
    getUserId: (state) => state.userId,
    getUserName: (state) => state.userName,
    getUserVerifiedStatus: (state) => state.isVerified,
  },
});
