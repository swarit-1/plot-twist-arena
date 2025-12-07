import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TwistReveal from '../components/TwistReveal';

describe('TwistReveal', () => {
  it('renders the twist text', () => {
    const twistText = 'The butler did it!';
    render(<TwistReveal twistText={twistText} />);

    // Text should be in the document (even if blurred initially)
    expect(screen.getByText(/butler/i)).toBeInTheDocument();
  });

  it('shows skip button initially', () => {
    render(<TwistReveal twistText="Test twist" />);

    const skipButton = screen.getByRole('button', { name: /skip/i });
    expect(skipButton).toBeInTheDocument();
  });

  it('calls onComplete when skip button is clicked', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();

    render(<TwistReveal twistText="Test twist" onComplete={onComplete} />);

    const skipButton = screen.getByRole('button', { name: /skip/i });
    await user.click(skipButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('skips animation when Space key is pressed', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();

    render(<TwistReveal twistText="Test twist" onComplete={onComplete} />);

    await user.keyboard(' ');

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('skips animation when Enter key is pressed', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();

    render(<TwistReveal twistText="Test twist" onComplete={onComplete} />);

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('displays the full text when revealed', async () => {
    const twistText = 'The protagonist was dead all along';
    const user = userEvent.setup();

    render(<TwistReveal twistText={twistText} revealSpeed={10} />);

    // Skip to revealed state
    await user.keyboard(' ');

    await waitFor(() => {
      expect(screen.getByText(twistText)).toBeInTheDocument();
    });
  });

  it('has proper ARIA attributes', () => {
    render(<TwistReveal twistText="Test twist" />);

    const region = screen.getByRole('region', { name: /plot twist reveal/i });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('tabIndex', '0');
  });
});
