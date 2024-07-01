// stores/tenancy.ts
import { defineStore } from 'pinia';
import { getSubdomain } from '@/utils/subdomain';
import { db } from '@/firebase/init';
import { ref as dbRef, set, push, get, child, update } from 'firebase/database';

interface Tenant {
  name: string;
  key: string | null;
  logoUrl: string;
}

export const useTenancyStore = defineStore('tenancy', {
  state: () => ({
    subdomain: getSubdomain(),
    tenant: null,
  }),
  actions: {
    async findOrCreateTenant(): void {
      if (!this.subdomain) {
        console.error("Subdomain is required but not found.");
        return;
      }

      const tenantsRef = dbRef(db, 'Tenants');
      const snapshot = await get(child(tenantsRef, `byName/${this.subdomain}`));

      if (snapshot.exists()) {
        // Fetch existing tenant details instead of resetting name to subdomain
        const tenantKey = snapshot.val();
        const tenantSnapshot = await get(dbRef(db, `Tenants/${tenantKey}`));
        if (tenantSnapshot.exists()) {
          const tenantData = tenantSnapshot.val();
          this.tenant = { name: tenantData.name, key: tenantKey, logoUrl: tenantData.logoUrl };
        } else {
          console.error("Found tenant key but could not fetch tenant details.");
        }
      } else {
        // Tenant doesn't exist, create a new one with subdomain as name
        const newTenantRef = push(tenantsRef);
        await set(newTenantRef, { name: this.subdomain });
    
        // Save a reference by name for easy lookup
        const byNameRef = child(tenantsRef, `byName/${this.subdomain}`);
        await set(byNameRef, newTenantRef.key);
        
        this.tenant = { name: this.subdomain, key: newTenantRef.key };
      }
    },
    async updateTenantDetails(name: string, logoUrl: string): Promise<void> {
      if (!this.tenant || !this.tenant.key) {
        console.error("Tenant key is required but not found.");
        return;
      }

      const tenantRef = dbRef(db, `Tenants/${this.tenant.key}`);
      const updateData: Partial<Tenant> = { name };
      if (logoUrl) updateData.logoUrl = logoUrl;

      await update(tenantRef, updateData);

      // Update local state
      if (this.tenant) {
        this.tenant.name = name;
        if (logoUrl) this.tenant.logoUrl = logoUrl;
      }
    },
  }
});
