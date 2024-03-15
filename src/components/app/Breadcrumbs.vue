<template>
  <nav aria-label="breadcrumb">
    <ol class="breadcrumb">
      <li v-for="(crumb, index) in breadcrumbs" :key="index" class="breadcrumb-item" :class="{ 'active': index === breadcrumbs.length - 1 }">
        <router-link v-if="index < breadcrumbs.length - 1" :to="{ name: crumb.name }">{{ crumb.text }}</router-link>
        <span v-else>{{ crumb.text }}</span>
      </li>
    </ol>
  </nav>
</template>

<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'Breadcrumbs',
  setup() {
    const route = useRoute();
    
    const breadcrumbs = computed(() => {
      const paths = [];
      const routePath = route.path;
      const pathArray = routePath.split('/').filter(p => p);
      let pathUrl = '';

      pathArray.forEach((path, index) => {
        pathUrl += '/' + path;
        paths.push({
          text: path, // You might want to replace this with dynamic or more meaningful text based on your routing structure or meta tags
          name: route.matched[index]?.name || '',
        });
      });

      // Prepend home route
      paths.unshift({ text: 'Dashboard', name: 'Dashboard' });

      return paths;
    });

    return { breadcrumbs };
  },
};
</script>