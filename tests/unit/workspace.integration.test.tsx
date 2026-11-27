import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

describe('Workspace Integration & Rendering Safety', () => {
  it('renders landing page, launches workspace, loads sample, and toggles modes live', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(screen.getByRole('heading', { name: /Protect identities\./i })).toBeInTheDocument();

    // Launch workspace
    const launchBtns = screen.getAllByRole('button', { name: /Launch Clyro/i });
    fireEvent.click(launchBtns[0]!);

    expect(screen.getByRole('heading', { name: /Data Sanitizer/i })).toBeInTheDocument();

    // Load synthetic sample
    fireEvent.click(screen.getByRole('button', { name: /Load Sample/i }));

    expect(screen.getByTestId('stat-categories-detected')).toHaveTextContent('6 / 6');
    const totalOcc = Number(screen.getByTestId('stat-total-occurrences').textContent);
    const replacedOcc = Number(screen.getByTestId('stat-replaced-occurrences').textContent);
    expect(totalOcc).toBeGreaterThan(15);
    expect(replacedOcc).toBe(totalOcc);

    // Switch to Pseudonymization
    fireEvent.click(screen.getByRole('radio', { name: /Pseudonymization/i }));
    expect(screen.getAllByText('EMAIL_001').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('PHONE_001').length).toBeGreaterThanOrEqual(2);

    // Reset session clears everything
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
    expect(screen.getByTestId('stat-total-occurrences')).toHaveTextContent('0');
  });

  it('displays HTML/script payloads as inert text nodes without DOM injection', () => {
    window.history.pushState({}, '', '/app');
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Paste Text/i }));
    const textarea = screen.getByLabelText(/Original raw text or CSV input/i);
    fireEvent.change(textarea, {
      target: { value: '<script>window.__xss=true</script> ravi@example.com' },
    });

    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByTestId('sanitized-output-text')).toHaveTextContent(
      '<script>window.__xss=true</script> [REDACTED]'
    );
  });

  it('rejects unsupported files and oversized files with clear errors and disables export', async () => {
    window.history.pushState({}, '', '/app');
    render(<App />);

    const fileInput = screen.getByLabelText(/Upload local TXT or CSV file/i) as HTMLInputElement;

    const badFile = new File(['dummy'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/Unsupported file format/i);

    const exportBtn = screen.getByRole('button', { name: /^Export$/i });
    expect(exportBtn).toBeDisabled();

    // Oversized file (> 5 MB)
    const oversized = new File(['a'], 'big.txt', { type: 'text/plain' });
    Object.defineProperty(oversized, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [oversized] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/exceeds the 5 MB/i);
  });
});
