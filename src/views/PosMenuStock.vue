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
			menu: ''
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
		
		axios.get('/assets/data/pos/menu-stock.json').then((response) => {
			this.menu = response.data.menu;
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
				<div class="pos-content-container p-3">
					<div class="row gx-3">
						<div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 pb-3" v-if="menu" v-for="(menu, index) in menu">
							<div class="pos-product">
								<div class="img" v-bind:style="{ backgroundImage: 'url('+ menu.image +')' }"></div>
								<div class="info">
									<div class="title text-truncate">{{ menu.title }}</div>
									<div class="desc text-truncate">{{ menu.description }}</div>
									<div class="d-flex align-items-center mb-3">
										<div class="w-100px">Stock:</div>
										<div class="flex-1">
											<input type="text" class="form-control" v-bind:value="menu.stock" />
										</div>
									</div>
									<div class="d-flex align-items-center mb-3">
										<div class="w-100px">Availability:</div>
										<div class="flex-1">
											<div class="form-check form-switch">
												<input class="form-check-input" type="checkbox" name="qty" v-bind:id="'product' + index" v-bind:checked="menu.available" value="1" />
												<label class="form-check-label" v-bind:for="'product' + index"></label>
											</div>
										</div>
									</div>
									<div>
										<a href="#" class="btn btn-theme d-block mb-2">Update</a>
										<a href="#" class="btn btn-secondary d-block">Cancel</a>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<!-- END pos-content -->
		</div>
		<!-- END pos-container -->
	</div>
	<!-- END pos -->
</template>
