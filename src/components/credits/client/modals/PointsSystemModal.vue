<template>
  <div class="modal fade" id="pointsSystemModal" tabindex="-1">
    <div class="modal-dialog modal-sm">
      <div class="modal-content bg-dark">
        <div class="modal-header border-secondary">
          <h5 class="modal-title text-light">Mis Puntos</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <!-- Current Level Info -->
          <div class="current-level mb-3 p-3 rounded" :style="{ backgroundColor: '#2d2d2d' }">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-light mb-1">Puntos Acumulados</h6>
                <h4 class="text-light text-center mb-0">{{ currentClient?.points || 0 }}</h4>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="mt-3">
              <small class="text-light d-block mb-2">
                {{ pointsToNextLevel }} puntos más para obtener 10% más de crédito
              </small>
              <div class="progress bg-dark">
                <div 
                  class="progress-bar bg-purple" 
                  role="progressbar"
                  :style="{ width: progressPercentage + '%' }"
                  :aria-valuenow="currentClient?.points"
                  aria-valuemin="0"
                  :aria-valuemax="nextLevelPoints">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PointsSystemModal',
  props: {
    currentClient: {
      type: Object,
      required: true
    },
    levels: {
      type: Array,
      required: true
    }
  },
  computed: {
    nextLevelPoints() {
      const currentPoints = this.currentClient?.points || 0;
      const nextLevel = this.levels.find(level => level.minPoints > currentPoints);
      return nextLevel ? nextLevel.minPoints : this.currentClient?.level?.minPoints || 0;
    },
    pointsToNextLevel() {
      const currentPoints = this.currentClient?.points || 0;
      const nextLevel = this.levels.find(level => level.minPoints > currentPoints);
      return nextLevel ? nextLevel.minPoints - currentPoints : 0;
    },
    progressPercentage() {
      const currentPoints = this.currentClient?.points || 0;
      const minPoints = this.currentClient?.level?.minPoints || 0;
      const pointsRange = this.nextLevelPoints - minPoints;
      const progress = ((currentPoints - minPoints) / pointsRange) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }
  }
}
</script>

<style scoped>
.text-purple {
  color: #6f42c1;
}

.bg-purple {
  background-color: #6f42c1;
}

.progress {
  height: 6px;
  border-radius: 3px;
}

.progress-bar {
  transition: width 0.5s ease-in-out;
}

@media (max-width: 576px) {
  .current-level .d-flex {
    align-items: flex-start;
  }
}
</style> 