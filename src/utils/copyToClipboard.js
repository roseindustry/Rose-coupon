import { showToast } from './toast'

export default async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text)
        showToast('Texto copiado!', 'success')
    } catch (err) {
        showToast(`Error: ${err}`, 'error')
    }
}
