<script setup lang="ts">
import { useRouter } from 'vue-router';

defineProps<{
  menu: {
  	icon?: string;
  	text: string;
  	url?: string;
  	highlight?: boolean;
  	children?: Array<any>;
  };
}>();

const router = useRouter();

// Function to check if any of the submenu URLs matches the current route
function subIsActive(children: Array<any>) {
  const currentRoute = router.currentRoute.value.path;
  console.log('Menu Prop:', menu);
console.log('Is Active:', subIsActive(menu.children));
  return children.some((child) => child.url === currentRoute || (child.children && subIsActive(child.children)));
}
</script>

<template>
  <!-- Menu item with submenu -->
  <div v-if="menu.children && menu.children.length" class="menu-item has-sub" :class="{ 'active': subIsActive(menu.children) }">
    <a class="menu-link">
      <span class="menu-icon" v-if="menu.icon">
        <i :class="menu.icon"></i>
        <span class="w-5px h-5px rounded-3 bg-theme position-absolute top-0 end-0 mt-3px me-3px" v-if="menu.highlight"></span>
      </span>
      <span class="menu-text">{{ menu.text }}</span>
      <span class="menu-caret"><b class="caret"></b></span>
    </a>
    <div class="menu-submenu">
      <!-- Recursively render submenu items -->
      <sidebar-nav v-for="(submenu, index) in menu.children" :key="index" :menu="submenu"></sidebar-nav>
    </div>
  </div>

  <!-- Menu item without submenu -->
  <router-link v-else :to="menu.url" custom v-slot="{ navigate, href, isActive }">
    <div class="menu-item" :class="{ 'active': isActive }">
      <a :href="href" @click="navigate" class="menu-link">
        <span class="menu-icon" v-if="menu.icon">
          <i :class="menu.icon"></i>
          <span class="menu-icon-label" v-if="menu.label">{{ menu.label }}</span>
        </span>
        <span class="menu-text">{{ menu.text }}</span>
      </a>
    </div>
  </router-link>
</template>
