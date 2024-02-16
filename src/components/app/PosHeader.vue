<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, onMounted, onBeforeUnmount } from 'vue';

const currentTime = ref<string>(getCurrentTime());

// Function to get the current time without seconds
function getCurrentTime(): string {
  const now = new Date();
  // Use Intl.DateTimeFormat for more control over formatting
  return new Intl.DateTimeFormat('default', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // Use `true` for AM/PM format
  }).format(now);
}

// Update the time every minute
const intervalId = setInterval(() => {
  currentTime.value = getCurrentTime();
}, 60000); // Update every minute (60,000 milliseconds)

// Cleanup on component unmount
onBeforeUnmount(() => {
  clearInterval(intervalId);
});
</script>

<template>
<div class="row pos-header">
				<div class="col back-button">
					<RouterLink to="/" class="nav-link">
						<i class="fa-solid fa-chevron-left" title="Volver" style="font-size: 1.5rem;"></i>
					</RouterLink>
				</div>
				<div class="col d-flex justify-content-center align-items-center brand">
						<div><i class="fa fa-solid fa-burger" style="font-size: 1.5rem;"></i></div>
						<!-- <div>{{Restaurant}}</div> -->
				</div>
				<div class="col nav">
					<div class="nav-item">
						<RouterLink to="/pos/kitchen-order" class="nav-link">
							<i class="fa fa-kitchen-set nav-icon" title="Ordenes de cocina"></i>
						</RouterLink>
					</div>
					<div class="nav-item">
						<RouterLink to="/pos/table-booking" class="nav-link">
							<i class="fa fa-chair nav-icon" title="Mesas"></i>
						</RouterLink>
					</div>
					<div class="nav-item">
						<RouterLink to="/pos/menu-stock" class="nav-link">
							<i class="fa fa-book nav-icon" title="Menu"></i>
						</RouterLink>
					</div>
				</div>
			</div>
</template>