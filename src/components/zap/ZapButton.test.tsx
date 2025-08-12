import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ZapButton from './ZapButton';
import useZap from '../../features/zaps/useZap';
import { vi, type Mock } from 'vitest';

vi.mock('../../features/zaps/useZap');

const zap = vi.fn();
const loadTotals = vi.fn();

(useZap as unknown as Mock).mockReturnValue({
  zap,
  status: 'idle',
  totals: { byVideo: {}, byUser: {} },
  error: undefined,
  loadTotals,
});

describe('ZapButton', () => {
  it('renders status and triggers zap', () => {
    render(<ZapButton lnurl="ln" recipientPubkey="pub" />);
    expect(loadTotals).toHaveBeenCalled();
    expect(screen.getByText(/Status: idle/)).toBeInTheDocument();
    expect(screen.getByText(/Total: 0/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(zap).toHaveBeenCalled();
  });

  it('shows error message', () => {
    (useZap as unknown as Mock).mockReturnValueOnce({
      zap,
      status: 'error',
      totals: { byVideo: {}, byUser: {} },
      error: 'fail',
      loadTotals,
    });
    render(<ZapButton lnurl="ln" recipientPubkey="pub" />);
    expect(screen.getByRole('alert')).toHaveTextContent('fail');
  });
});
