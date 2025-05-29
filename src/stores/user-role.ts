import { defineStore } from 'pinia';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getUserData } from '../helpers/firebaseService.js';

interface UserRoleState {
  role: string;
  userId: string | null;
  userName: string | null;
  userIdentification: string | null;
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isProfileCompleted: boolean;
  requestedVerification: boolean;
}

export const useUserStore = defineStore('user-role', {
  state: (): UserRoleState => ({
    role: '',
    userId: null,
    userName: null,
    userIdentification: null,
    isVerified: false,
    isEmailVerified: false,
    isPhoneVerified: false,
    isProfileCompleted: false,
    requestedVerification: false,
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
          this.userName = this.role === 'cliente' || this.role === 'admin'
            ? `${data.firstName} ${data.lastName}` 
            : data.companyName;
          this.userIdentification = this.role === 'afiliado' ? `${data.rif}` : data.identification;
          this.isVerified = data.isVerified;
          this.isEmailVerified = data.emailVerified;
          this.isPhoneVerified = data.phoneVerified;
          this.isProfileCompleted = !!(data.state && data.municipio && data.parroquia);
          this.requestedVerification = data.requestedVerification || false;
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
      this.userIdentification = null;
      this.isVerified = false;
      this.isEmailVerified = false;
      this.isPhoneVerified = false;
      this.isProfileCompleted = false;
      this.requestedVerification = false;
    },
  },
  getters: {
    getUserRole: (state) => state.role,
    getUserId: (state) => state.userId,
    getUserName: (state) => state.userName,
    getUserIdentification: (state) => state.userIdentification,
    getUserVerifiedStatus: (state) => state.isVerified,
    getEmailVerifiedStatus: (state) => state.isEmailVerified,
    getPhoneVerifiedStatus: (state) => state.isPhoneVerified,
    getProfileStatus: (state) => state.isProfileCompleted,
    getRequestedVerification: (state) => state.requestedVerification,
  },
});
