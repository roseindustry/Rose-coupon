// src/composables/useClientDetails.js
import { ref, watchEffect } from 'vue'
import { db, storage } from '@/firebase/init'
import { get, ref as dbRef } from 'firebase/database'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'

export function useClientDetails() {
  const loadingStates = ref({})
  const expandedClients = ref(new Set())
  const clientCoupons = ref({})
  const clientPreferences = ref({})

  // Add a debug watcher to track changes in expandedClients
//   watchEffect(() => {
//     console.group('ExpandedClients Debug')
//     console.log('Current expanded clients:', Array.from(expandedClients.value))
//     console.log('Number of expanded clients:', expandedClients.value.size)
//     console.groupEnd()
//   })

  const fetchingClientDetails = async (client) => {
    // Set loading state
    loadingStates.value[client.uid] = true

    try {
      // Parallel fetching of client details
      const results = await Promise.allSettled([
        fetchClientCredit(client),
        fetchClientSubscription(client),
        fetchClientPreferences(client),
        fetchClientCoupons(client),
        fetchIdFiles(client)
      ])

      // Log any errors in fetching details
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Error in fetching detail ${index}:`, result.reason)
        }
      })

      // Mark details as loaded
      client._detailsLoaded = true
    } catch (error) {
      console.error('Error loading client details:', error)
      throw error
    } finally {
      loadingStates.value[client.uid] = false
    }
  }

  const togglingClientDetails = async (client) => {

    const uid = client.uid;

  if (expandedClients.value.has(uid)) {
    // Collapse client
    expandedClients.value.delete(uid);
    // Trigger reactivity
    expandedClients.value = new Set(expandedClients.value);
  } else {
    // Set loading to true before expanding
    loadingStates.value[uid] = true;
    // Expand first so loading spinner can appear
    expandedClients.value.add(uid);
    expandedClients.value = new Set(expandedClients.value);

    try {
      await fetchingClientDetails(client);
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      // Set loading to false after fetching
      loadingStates.value[uid] = false;
    }
  }
  }

  // Method to check if a client is expanded
  const isClientExpanded = (clientUid) => {
    return expandedClients.value.has(clientUid)
  }

  // Method to clear all expanded clients
  const clearExpandedClients = () => {
    expandedClients.value.clear()
    expandedClients.value = new Set()
  }

  const fetchClientCoupons = async (client) => {
    try {
      const couponsRef = dbRef(db, `Users/${client.uid}/coupons`)
      const couponsSnapshot = await get(couponsRef)
      
      clientCoupons.value[client.uid] = couponsSnapshot.exists() 
        ? Object.keys(couponsSnapshot.val()) 
        : []
    } catch (error) {
      console.error('Error fetching client coupons:', error)
      clientCoupons.value[client.uid] = []
    }
  }

  const fetchClientSubscription = async (client) => {
    try {
      const subscriptionRef = dbRef(db, `Users/${client.uid}/subscription`)
      const subscriptionSnapshot = await get(subscriptionRef)

      if (subscriptionSnapshot.exists()) {
        client.subscription = subscriptionSnapshot.val()
        const subscriptionId = client.subscription.subscription_id

        if (subscriptionId) {
          // Query the Suscriptions table to fetch the details
          const subscriptionDataRef = dbRef(db, `Suscriptions/${subscriptionId}`)
          const userSuscriptionSnapshot = await get(subscriptionDataRef)

          if (userSuscriptionSnapshot.exists()) {
            const userSubscription = userSuscriptionSnapshot.val()
            // Merge the userSubscription into the client's subscription object
            client.subscription = {
              ...client.subscription,
              ...userSubscription
            }
            if (client.subscription.lastPaymentDate) {
              // In case the client made a payment
              const paymentDate = (client.subscription.lastPaymentDate).split('T')[0]
              await fetchPaymentFiles(client, paymentDate)
            }
          }
        }
      } else {
        // Set a default empty subscription if none exist
        client.subscription = null
      }
    } catch (error) {
      console.error('Error fetching client subscription:', error)
      client.subscription = null
    }
  }

  const fetchPaymentFiles = async (client, paymentDate) => {
    try {
      // Example path - adjust according to your Firebase structure
      const paymentFilesRef = dbRef(db, `Users/${client.uid}/payments/${paymentDate}`)
      const paymentFilesSnapshot = await get(paymentFilesRef)

      if (paymentFilesSnapshot.exists()) {
        const paymentFiles = paymentFilesSnapshot.val()
            
        // If you want to store payment file URLs or details
        client.paymentFiles = paymentFiles
      } else {
        console.warn(`No payment files found for date: ${paymentDate}`)
        client.paymentFiles = null
      }
    } catch (error) {
      console.error('Error fetching payment files:', error)
      client.paymentFiles = null
    } finally {
      console.groupEnd()
    }
  }

  const fetchClientCredit = async (client) => {
    try {
      const creditRef = dbRef(db, `Users/${client.uid}/credit`)
      const creditSnapshot = await get(creditRef)

      if (creditSnapshot.exists()) {
        const creditData = creditSnapshot.val()

        client.credit = {
          mainCredit: creditData.main?.totalCredit || 0,
          availableMainCredit: creditData.main?.availableCredit || 0,
          plusCredit: creditData.plus?.totalCredit || 0,
          availablePlusCredit: creditData.plus?.availableCredit || 0
        }
      } else {
        client.credit = {
          mainCredit: 0,
          availableMainCredit: 0,
          plusCredit: 0,
          availablePlusCredit: 0
        }
      }
    } catch (error) {
      console.error('Error fetching client credit:', error)
      client.credit = {
        mainCredit: 0,
        availableMainCredit: 0,
        plusCredit: 0,
        availablePlusCredit: 0
      }
    } finally {
      console.groupEnd()
    }
  }

  const fetchClientPreferences = async (client) => {
    try {
      // Initialize the preferences array for each client
      clientPreferences.value[client.uid] = {}

      // Fetch the preferences from the user's data in Firebase Realtime Database
      const preferencesRef = dbRef(db, `Users/${client.uid}/preferences`)
      const prefSnapshot = await get(preferencesRef)

      if (prefSnapshot.exists()) {
        const preferences = prefSnapshot.val()

        // Fetch categories for the selectedCategories
        if (preferences.selectedCategories) {
          const selectedCategories = preferences.selectedCategories

          // Initialize each category in clientPreferences
          for (const categoryId of selectedCategories) {
            const categoryRef = dbRef(db, `Affiliate_categories/${categoryId}`)
            const categoryDetailsSnapshot = await get(categoryRef)

            if (categoryDetailsSnapshot.exists()) {
              const categoryDetails = categoryDetailsSnapshot.val()
              // Store the category details in clientPreferences
              clientPreferences.value[client.uid][categoryId] = {
                category: categoryDetails.name,
                subcategories: [] // Initialize subcategories
              }
            }
          }
        }

        // Fetch subcategories for the selectedSubcategories
        if (preferences.selectedSubcategories) {
          const selectedSubcategories = preferences.selectedSubcategories

          for (const subcategoryId of selectedSubcategories) {
            const subcategoryRef = dbRef(db, `Affiliate_subcategories/${subcategoryId}`)
            const subcategoryDetailsSnapshot = await get(subcategoryRef)

            if (subcategoryDetailsSnapshot.exists()) {
              const subcategoryDetails = subcategoryDetailsSnapshot.val()
              // Find the category to add the subcategory to
              for (const categoryId in clientPreferences.value[client.uid]) {
                // Assuming subcategory is related to its category
                if (subcategoryDetails.category_id === categoryId) {
                  clientPreferences.value[client.uid][categoryId].subcategories.push(subcategoryDetails.name)
                  break // Break after adding to the correct category
                }
              }
            }
          }
        }
      } else {
        clientPreferences.value[client.uid] = {}
      }
    } catch (error) {
      console.error("Error fetching client preferences: ", error)
      clientPreferences.value[client.uid] = {} // Ensure empty preferences on error
    }
  }

  const fetchIdFiles = async (client) => {
    try {
      // Skip fetching if client hasn't requested verification
      if (!client.requestedVerification && !client.verificationFiles) {
        return
      }

      // Set loading state
      loadingStates.value[client.uid + '_files'] = true

      // Check if verification files exist in the database
      const verificationFilesRef = dbRef(db, `Users/${client.uid}/verificationFiles`)
      const snapshot = await get(verificationFilesRef)

      if (!snapshot.exists()) {
        console.warn('No verification files found')
        client.idFiles = []
        return
      }

      const verificationFiles = snapshot.val()
      
      const idFiles = []

      // Process each file type
      for (const [type, path] of Object.entries(verificationFiles)) {
        if (path) {
          try {
            const url = await getDownloadURL(storageRef(storage, path))
            
            idFiles.push({
              type,
              url,
              path  // Keep original path for reference
            })
          } catch (error) {
            console.error(`Error fetching ${type} file:`, error)
          }
        }
      }

      // Set the ID files on the client object
      client.idFiles = idFiles
    } catch (error) {
      console.error('Error fetching ID files:', error)
    } finally {
      // Clear loading state
      loadingStates.value[client.uid + '_files'] = false
    }
  }

  return {
    loadingStates,
    expandedClients,
    clientCoupons,
    clientPreferences,
    fetchingClientDetails,
    togglingClientDetails,
    isClientExpanded,
    clearExpandedClients,
    fetchClientCoupons,
    fetchClientSubscription,
    fetchClientCredit,
    fetchClientPreferences,
    fetchIdFiles,
    fetchPaymentFiles
  }
}