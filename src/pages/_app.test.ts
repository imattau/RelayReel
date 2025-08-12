import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AppProps } from 'next/app';
import App from './_app';

vi.mock('@/components/nav/BottomNav', () => ({
  __esModule: true,
  default: () => React.createElement('nav', { 'data-testid': 'bottom-nav' }),
}));

describe('App', () => {
  it('renders bottom navigation', () => {
    const Page: AppProps['Component'] = () => React.createElement('div', null, 'Page');
    const router = {} as any;
    render(React.createElement(App, { Component: Page, pageProps: {}, router }));
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
  });
});
