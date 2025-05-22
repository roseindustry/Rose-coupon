import { ref, computed } from 'vue'
import { db } from '@/firebase/init'
import { ref as dbRef, query, orderByChild, equalTo, get } from 'firebase/database'

export function useClientManagement() {
  const clients = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const verificationFilter = ref('all')

  const fetchClients = async () => {
    const clientRef = query(dbRef(db, 'Users'), orderByChild('role'), equalTo('cliente'))
    
    try {
      loading.value = true
      const snapshot = await get(clientRef)

      clients.value = snapshot.exists() 
        ? Object.entries(snapshot.val()).map(([uid, user]) => ({
            uid,
            ...user,
            _detailsLoaded: false
          }))
        : []
    } catch (error) {
      console.error('Error fetching clients:', error)
      clients.value = []
    } finally {
      loading.value = false
    }
  }

  const filteredUsers = computed(() => {
    const trimmedQuery = searchQuery.value?.trim().toLowerCase()
    let filtered = clients.value

    if (trimmedQuery) {
      filtered = filtered.filter(client => {
        const identification = client.identification?.toString().toLowerCase() || ''
        const firstName = client.firstName?.toLowerCase() || ''
        const lastName = client.lastName?.toLowerCase() || ''
        const fullName = `${firstName} ${lastName}`.toLowerCase()
        const reversedFullName = `${lastName} ${firstName}`.toLowerCase()

        return identification.includes(trimmedQuery) ||
          firstName.includes(trimmedQuery) ||
          lastName.includes(trimmedQuery) ||
          fullName.includes(trimmedQuery) ||
          reversedFullName.includes(trimmedQuery)
      })
    }

    if (verificationFilter.value !== 'all') {
      filtered = filtered.filter(client => {
        switch (verificationFilter.value) {
          case 'verified': return client.isVerified === true
          case 'pending': return client.requestedVerification === true && client.isVerified !== true
          case 'unverified': return !client.requestedVerification && !client.isVerified
          default: return true
        }
      })
    }

    return filtered
  })

  return {
    clients,
    loading,
    searchQuery,
    verificationFilter,
    filteredUsers,
    fetchClients
  }
}