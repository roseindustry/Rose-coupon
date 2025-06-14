<template>
  <nav class="my-5 custom-pagination" v-if="totalPages > 1" aria-label="Page navigation">
    <ul class="pagination justify-content-center custom-pagination">
      <li class="page-item" :class="{ disabled: currentPage === 1 }">
        <button class="page-link" @click="handlePageChange(currentPage - 1)" :disabled="currentPage === 1">
          {{ prevText }}
        </button>
      </li>
      <li class="page-item" v-for="page in totalPages" :key="page" :class="{ active: page === currentPage }">
        <button class="page-link" @click="handlePageChange(page)">
          {{ page }}
        </button>
      </li>
      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
        <button class="page-link" @click="handlePageChange(currentPage + 1)" :disabled="currentPage === totalPages">
          {{ nextText }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script>
export default {
  name: 'CustomPagination',
  props: {
    currentPage: {
      type: Number,
      required: true,
      validator: (value) => value > 0
    },
    totalPages: {
      type: Number,
      required: true,
      validator: (value) => value > 0
    },
    prevText: {
      type: String,
      default: 'Anterior'
    },
    nextText: {
      type: String,
      default: 'Siguiente'
    }
  },
  methods: {
    handlePageChange(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.$emit('page-change', page);
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.custom-pagination {
  .pagination {
    margin-bottom: 0;
  }

  .page-link {
    color: var(--bs-theme);
    border-color: var(--bs-border-color);
    padding: 0.5rem 0.75rem;
    transition: all 0.2s ease;

    &:hover {
      background-color: rgba(var(--bs-theme-rgb), 0.1);
      color: var(--bs-theme);
    }

    &:focus {
      box-shadow: 0 0 0 0.2rem rgba(var(--bs-theme-rgb), 0.25);
    }
  }

  .page-item {
    &.active .page-link {
      background-color: var(--bs-theme);
      border-color: var(--bs-theme);
      color: white;
    }

    &.disabled .page-link {
      color: var(--bs-gray-500);
      pointer-events: none;
      background-color: var(--bs-gray-100);
      border-color: var(--bs-border-color);
    }
  }
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .custom-pagination {
    .page-link {
      padding: 0.375rem 0.5rem;
      font-size: 0.875rem;
    }
  }
}
</style> 