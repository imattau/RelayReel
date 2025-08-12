import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionButtons from './ActionButtons';

describe('ActionButtons', () => {
  it('invokes handlers on button clicks', () => {
    const onLike = vi.fn();
    const onComment = vi.fn();
    const onShare = vi.fn();
    const onZap = vi.fn();
    render(
      React.createElement(ActionButtons, {
        liked: false,
        likeCount: 0,
        commentCount: 0,
        zapTotal: 0,
        onLike,
        onComment,
        onShare,
        onZap,
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /like/i }));
    fireEvent.click(screen.getByRole('button', { name: /comment/i }));
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    fireEvent.click(screen.getByRole('button', { name: /zap/i }));

    expect(onLike).toHaveBeenCalled();
    expect(onComment).toHaveBeenCalled();
    expect(onShare).toHaveBeenCalled();
    expect(onZap).toHaveBeenCalled();
  });
});
