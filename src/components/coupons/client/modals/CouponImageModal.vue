<template>
    <div class="modal fade" id="qrModal" tabindex="-1" aria-labelledby="qrModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="qrModalLabel">Cupon Logo</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                    <img :src="modalImageUrl" alt="Cupon" class="img-fluid">
                </div>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'CouponImageModal',
    props: {
        modalImageUrl: {
            type: String,
            required: true
        }
    },
}
</script>