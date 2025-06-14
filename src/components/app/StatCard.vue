<template>
    <div class="stats-card">
        <div class="stats-icon">
            <i class="fa" :class="icon"></i>
        </div>
        <div class="stats-info">
            <h6 class="stats-label">{{ title }}</h6>
            <h3 class="stats-value">{{ value }}</h3>
        </div>
    </div>
</template>
<script>
import { icon } from '@fortawesome/fontawesome-svg-core';

export default {
    name: 'StatCard',
    props: {
        title: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            required: true
        },
        icon: {
            type: String,
            required: true
        }
    }
}
</script>
<style>
.stats-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
    height: 100%;
    min-height: 125px;
}

.stats-card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stats-icon {
    width: 48px;
    height: 48px;
    background: rgba(128, 0, 128, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.stats-icon i {
    font-size: 1.5rem;
    color: purple;
}

.stats-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.stats-label {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
}

.stats-value {
    color: white;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
}
</style>