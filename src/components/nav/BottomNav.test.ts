import React from 'react';
import { render, screen } from '@testing-library/react';
import BottomNav from './BottomNav';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) =>
    React.createElement('a', props, children)
}));

describe('BottomNav', () => {
  beforeEach(() => {
    const uiLayer = document.createElement('div');
    uiLayer.id = 'ui-layer';
    document.body.appendChild(uiLayer);
  });

  it('renders navigation links', () => {
    render(React.createElement(BottomNav));
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });
});
