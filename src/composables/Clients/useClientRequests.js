import { ref } from 'vue'
import { db, storage } from '@/firebase/init'
import { ref as dbRef, get } from 'firebase/database'
import { ref as storageRef, listAll } from 'firebase/storage'
import { toast as showToast } from '@/utils/toast'

export function useClientRequests() {
  const updateRequests = ref([])
  const deleteRequests = ref([])
  const loadingRequests = ref(false)

  const fetchUpdateRequests = async (clients) => {
    try {
      loadingRequests.value = true;

      const updateRequestsRef = dbRef(db, 'updateRequests');
      const updateRequestsSnapshot = await get(updateRequestsRef);

      if (!updateRequestsSnapshot.exists()) {
        updateRequests.value = [];
        return [];
      }

      const requests = updateRequestsSnapshot.val();

      // Transform the requests into a flat array with additional metadata
      const processedRequests = Object.entries(requests).flatMap(([userId, userRequests]) => {
        // Find the corresponding user
        const user = clients.find(client => client.uid === userId);

        // Transform each request for the user
        return Object.entries(userRequests).map(([requestId, requestData]) => ({
          id: requestId,
          userId: userId,
          userName: user
            ? `${user.firstName} ${user.lastName}`
            : 'Usuario Desconocido',
          userEmail: user ? user.email : 'Email no disponible',
          ...requestData
        }));
      }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
        .filter(r => r.status === 'pending'); // Sort by most recent first and status pending

      updateRequests.value = processedRequests;
      return processedRequests;

    } catch (error) {
      console.error('Error fetching update requests:', error);
      showToast.error('No se pudieron cargar las solicitudes de actualización');
      updateRequests.value = [];
      return [];
    } finally {
      loadingRequests.value = false;
    }
  }

  const fetchDeleteRequests = async (clients) => {
    try {
      loadingRequests.value = true;

      const deleteRequestsRef = dbRef(db, 'deletionRequests');
      const deleteRequestsSnapshot = await get(deleteRequestsRef);

      if (!deleteRequestsSnapshot.exists()) {
        deleteRequests.value = [];
        return [];
      }

      const requests = deleteRequestsSnapshot.val();

      const processedRequests = Object.entries(requests).map(([userId, requestData]) => {
        const user = clients.find(client => client.uid === userId);

        return {
          id: userId, // Using userId as ID since there is no requestId
          userId,
          userName: user
            ? `${user.firstName} ${user.lastName}`
            : 'Usuario Desconocido',
          userEmail: user ? user.email : 'Email no disponible',
          ...requestData
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .filter(r => r.status === 'pending');

      deleteRequests.value = processedRequests;
      return processedRequests;

    } catch (error) {
      console.error('Error fetching delete requests:', error);
      showToast.error('No se pudieron cargar las solicitudes de eliminación');
      deleteRequests.value = [];
      return [];
    } finally {
      loadingRequests.value = false;
    }
  }

  return {
    updateRequests,
    deleteRequests,
    loadingRequests,
    fetchUpdateRequests,
    fetchDeleteRequests
  }
} 