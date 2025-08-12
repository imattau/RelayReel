import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthPanel from './AuthPanel';
import useAuth from '../../features/auth/useAuth';
import useRemoteSigner from '../../features/auth/useRemoteSigner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../features/auth/useAuth');
vi.mock('../../features/auth/useRemoteSigner');

const mockUseAuth = useAuth as any;
const mockUseRemoteSigner = useRemoteSigner as any;

describe('AuthPanel', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseRemoteSigner.mockReset();
    // eslint-disable-next-line
    delete (globalThis as any).nostr;
  });

  it('shows fallback when no extension', () => {
    mockUseAuth.mockReturnValue({
      pubkey: undefined,
      method: undefined,
      login: vi.fn(),
      logout: vi.fn(),
    });
    mockUseRemoteSigner.mockReturnValue({
      connectRemote: vi.fn(),
      disconnect: vi.fn(),
    });

    render(React.createElement(AuthPanel));
    expect(
      screen.getByText(/nostr extension not detected/i)
    ).toBeInTheDocument();
  });

  it('calls login on connect click', () => {
    const login = vi.fn();
    mockUseAuth.mockReturnValue({
      pubkey: undefined,
      method: undefined,
      login,
      logout: vi.fn(),
    });
    mockUseRemoteSigner.mockReturnValue({
      connectRemote: vi.fn(),
      disconnect: vi.fn(),
    });

    render(React.createElement(AuthPanel));
    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }));
    expect(login).toHaveBeenCalled();
  });

  it('renders status when connected', () => {
    mockUseAuth.mockReturnValue({
      pubkey: 'abcdef123456',
      method: 'nip07',
      login: vi.fn(),
      logout: vi.fn(),
    });
    mockUseRemoteSigner.mockReturnValue({
      connectRemote: vi.fn(),
      disconnect: vi.fn(),
    });

    render(React.createElement(AuthPanel));
    expect(screen.getByTestId('status').textContent).toMatch(/Connected/);
  });

  it('calls connectRemote with input', () => {
    const connectRemote = vi.fn();
    mockUseAuth.mockReturnValue({
      pubkey: undefined,
      method: undefined,
      login: vi.fn(),
      logout: vi.fn(),
    });
    mockUseRemoteSigner.mockReturnValue({
      connectRemote,
      disconnect: vi.fn(),
    });

    render(React.createElement(AuthPanel));
    const input = screen.getByPlaceholderText('bunker://...');
    fireEvent.change(input, { target: { value: 'bunker://abc' } });
    fireEvent.click(screen.getByRole('button', { name: /connect remote/i }));
    expect(connectRemote).toHaveBeenCalledWith('bunker://abc');
  });
});

