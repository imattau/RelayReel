import React from 'react';
import { render, screen } from '@testing-library/react';
import CreatorInfo from './CreatorInfo';

describe('CreatorInfo', () => {
  it('renders creator name and caption', () => {
    render(
      React.createElement(CreatorInfo, {
        creator: 'Alice',
        caption: 'Hello world',
        avatarUrl: 'avatar.png',
      })
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});
