<template>
  <button class="header-action-btn btn" :class="[buttonClass, { 'btn-glass': isGlass }]" :data-bs-toggle="modalToggle"
    :data-bs-target="modalTarget" @click="handleClick">
    <i v-if="icon" :class="[icon, 'fa-fw']"></i>
    <span class="action-text">{{ text }}</span>
  </button>
</template>

<script>
export default {
  name: 'CustomButton',
  props: {
    icon: {
      type: String,
      required: false
    },
    text: {
      type: String,
      required: true
    },
    buttonClass: {
      type: String,
      default: 'btn-outline-theme'
    },
    isGlass: {
      type: Boolean,
      default: false
    },
    modalToggle: {
      type: String,
      default: null
    },
    modalTarget: {
      type: String,
      default: null
    },
    onClick: {
      type: Function,
      default: () => { }
    }
  },
  methods: {
    handleClick(event) {
      this.onClick(event)
    }
  }
}
</script>

<style lang="scss" scoped>
.header-action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  border-radius: 12px;
  white-space: nowrap;

  i {
    font-size: 1rem;
  }

  .action-text {
    font-weight: 500;
  }

  /* Theme Button Styles */
  &.btn-outline-theme {
    border-color: purple;
    color: purple;

    &:hover {
      background-color: purple;
      color: white;
      box-shadow: 0 2px 5px rgba(128, 0, 128, 0.3);
    }
  }

  &.btn-theme {
    background-color: purple;
    border-color: purple;
    color: white;

    &:hover {
      background-color: #8a2be2;
      border-color: #8a2be2;
      box-shadow: 0 2px 5px rgba(138, 43, 226, 0.3);
    }
  }

  &.btn-sm {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Glass Effect */
  &.btn-glass {
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    background: transparent;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

/* Responsive Styles */
@media (max-width: 768px) {
  .header-action-btn {
    padding: 0.375rem 0.5rem;
    font-size: 0.8rem;

    i {
      font-size: 0.9rem;
    }
  }
}

@media (max-width: 576px) {
  .header-action-btn {
    padding: 0.375rem;
    min-width: 36px;
    justify-content: center;

    i {
      margin: 0;
    }
  }
}
</style>