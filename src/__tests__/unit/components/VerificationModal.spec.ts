import { render, fireEvent, screen } from '@testing-library/vue';
import VerificationModal from '@/components/clients/VerificationModal.vue'
import { describe, it, expect, vi } from 'vitest'

describe('VerificationModal.vue', () => {
  const clientMock = {
    email: 'test@example.com',
    phoneNumber: '+584123456789'
  }

  it('renders email and phone correctly', async () => {
    render(VerificationModal, {
        props: {
          client: clientMock
        }
      });

      expect(screen.getByText(/Enviar a: test@example.com/)).toBeTruthy();
      expect(screen.getByText(/Enviar a: \+584123456789/)).toBeTruthy();
  })

  it('emits skip-verification when "Omitir" is clicked', async () => {
    const { emitted } = render(VerificationModal, {
      props: { client: clientMock }
    });

    await fireEvent.click(screen.getByText('Omitir'));
    expect(emitted()['skip-verification']).toBeTruthy();
  });
})