<script>
import { useAppOptionStore } from '@/stores/app-option';
import { RouterLink } from 'vue-router';
import { Modal } from 'bootstrap';
import axios from 'axios';
import PosHeader from '@/components/app/PosHeader.vue'

const appOption = useAppOptionStore();

export default {
	data() {
		return {
			order: ''
		}
	},
	components:{
		PosHeader,
	},
	mounted() {
		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		appOption.appContentClass = 'p-0';
		appOption.appContentFullHeight = true;
		
		axios.get('/assets/data/pos/kitchen-order.json').then((response) => {
			this.order = response.data.order;
		});
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
		appOption.appContentFullHeight = false;
	},
	methods: {
		checkTime(i) {
			if (i < 10) {i = "0" + i};
			return i;
		},
		getTime() {
			var today = new Date();
			var h = today.getHours();
			var m = today.getMinutes();
			var s = today.getSeconds();
			var a;
			m = this.checkTime(m);
			s = this.checkTime(s);
			a = (h > 11) ? 'pm' : 'am';
			h = (h > 12) ? h - 12 : h;
			
			setTimeout(this.getTime, 500);
			
			return h + ":" + m + a;
		},
		getTotalCompletedItems(items) {
			var count = 0;
			for (var i = 0; i < items.length; i++) {
				if (items[i].status == 'Completed') {
					count++;
				}
			}
			return count;
		},
		setItemStatus(event, item, status) {
			event.preventDefault();
			
			if (confirm('Confirm set this order to ' + status + '?') === true) {
				item.status = status;
			}
		}
	}
}
</script>
<template>
	<!-- BEGIN pos -->
	<div class="pos pos-vertical pos-with-header" id="pos">
		<!-- BEGIN pos-container -->
		<div class="pos-container">
			<!-- BEGIN pos-header -->
			<pos-header />
			<!-- END pos-header -->
		
			<!-- BEGIN pos-content -->
			<div class="pos-content">
				<perfect-scrollbar class="pos-content-container h-100 p-0">
					<div class="pos-task" v-if="order" v-for="order in order">
						<div class="pos-task-info">
							<div class="h3 mb-1">Mesa {{ order.tableNo }}</div>
							<div class="mb-3">Orden No: #{{ order.orderNo }}</div>
							<div class="mb-2">
								<span class="badge fs-14px" v-bind:class="{ 'bg-theme text-theme-color': order.orderStatus != 'Completed', 'bg-gray-500 text-white': order.orderStatus == 'Completed'}">{{ order.orderType }}</span>
							</div>
							<div v-if="order.orderTime"><span v-bind:class="{ 'text-danger fw-bold': order.urgent }">{{ order.orderTime }}</span> time</div>
							<div v-if="order.totalOrderTime">
								Orden completa servida<br />{{ order.totalOrderTime }} de tiempo de espera
							</div>
						</div>
						<div class="pos-task-body">
							<div class="fs-16px mb-3">
								Completado: ({{ getTotalCompletedItems(order.items) }}/{{ order.items.length }})
							</div>
							<div class="row gx-4">
								<div class="col-lg-3 pb-4" v-for="item in order.items">
									<div class="pos-task-product" v-bind:class="{ 'completed': item.status == 'Completed' || item.status == 'Cancelled' }">
										<div class="pos-task-product-img">
											<div class="cover" v-bind:style="{ backgroundImage: 'url('+ item.image +')' }"></div>
											
											<div class="caption" v-if="item.status == 'Completed'">
												<div>Completado</div>
											</div>
											<div class="caption" v-if="item.status == 'Cancelled'">
												<div>Cancelado</div>
											</div>
										</div>
										<div class="pos-task-product-info">
											<div class="flex-1">
												<div class="d-flex mb-2">
													<div class="fs-5 mb-0 fw-semibold flex-1">{{ item.title }}</div>
													<div class="fs-5 mb-0 fw-semibold">x{{ item.quantity }}</div>
												</div>
												<div class="text-body text-opacity-75" v-for="note in item.note">- {{ note }}</div>
											</div>
										</div>
										<div class="pos-task-product-action">
											<a href="#" class="btn btn-theme" 
												v-on:click="(event) => setItemStatus(event, item, 'Completed')"
												v-bind:class="{ 'disabled': item.status == 'Completed' || item.status == 'Cancelled' }">
												Completar
											</a>
											<a href="#" class="btn btn-default" 
												v-on:click="(event) => setItemStatus(event, item, 'Cancelled')"
												v-bind:class="{ 'disabled': item.status == 'Completed' || item.status == 'Cancelled' }">
												Cancelar
											</a>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="px-3 py-5 text-center" v-else>
						No se encontraron ordenes
					</div>
				</perfect-scrollbar>
			</div>
			<!-- END pos-content -->
		</div>
		<!-- END pos-container -->
	</div>
	<!-- END pos -->
</template>
