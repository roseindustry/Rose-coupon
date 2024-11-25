<script>
import { useAppOptionStore } from '@/stores/app-option';
import highlightjs from '@/components/plugins/Highlightjs.vue';
import axios from 'axios';

const appOption = useAppOptionStore();

export default {
	data() {
		return {
			code1: ''
		}
	},
	components: {
		highlightjs: highlightjs
	},
	mounted() {
		appOption.appSidebarMinified = true;
		
		axios.get('/assets/data/layout/minified-sidebar-code-1.json').then((response) => {
			this.code1 = response.data;
		});
	},
	beforeUnmount() {
		appOption.appSidebarMinified = false;
	}
}
</script>
<template>
	<ul class="breadcrumb">
		<li class="breadcrumb-item"><a href="#">LAYOUT</a></li>
		<li class="breadcrumb-item active">MINIFIED SIDEBAR</li>
	</ul>

	<h1 class="page-header">
		Minified Sidebar <small>page header description goes here...</small>
	</h1>

	<hr class="mb-4" />

	<p>
		Add the following code within the <code>&lt;script&gt;</code> tag for minified sidebar page setting.
	</p>

	<card>
		<highlightjs class="rounded" :code="code1" />
	</card>
</template>