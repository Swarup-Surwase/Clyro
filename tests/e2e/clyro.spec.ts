import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const SCRATCH_DIR =
  '/Users/swarup/.gemini/antigravity/brain/381dce98-7887-4334-a5b3-77ea7dd4531e/scratch';

test.describe('Clyro End-to-End, Privacy & Responsive Verification', () => {
  test('complete user journey, byte-verified exports, zero data egress, zero storage persistence', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const nonStaticOrExternalRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
    page.on('request', (req) => {
      const url = req.url();
      if (url.startsWith('blob:') || url.startsWith('data:')) return;
      const parsed = new URL(url);
      const isAllowedStaticGet =
        req.method() === 'GET' &&
        parsed.origin === 'http://127.0.0.1:4173' &&
        parsed.search === '' &&
        (parsed.pathname === '/' ||
          parsed.pathname === '/app' ||
          parsed.pathname === '/favicon.svg' ||
          parsed.pathname.startsWith('/assets/'));
      if (!isAllowedStaticGet) {
        nonStaticOrExternalRequests.push(`${req.method()} ${url}`);
      }
    });

    // 1. Load landing page, capture opening intro bloom screenshot, then enter hero
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await fs.mkdir(SCRATCH_DIR, { recursive: true });
    await expect(page.getByTestId('clyro-intro-overlay')).toBeVisible();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'landing-shader-bloom.png') });
    await page.getByRole('button', { name: /Skip Intro/i }).click();
    await expect(page.getByTestId('clyro-intro-overlay')).toBeHidden();
    await expect(page.getByRole('heading', { name: /Protect identities\./i })).toBeVisible();
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'landing-desktop.png') });

    // Test interactive Replay Intro button and dismiss cleanly
    await page.getByRole('button', { name: /Replay Intro/i }).click();
    await expect(page.getByTestId('clyro-intro-overlay')).toBeVisible();
    await page.getByRole('button', { name: /Skip Intro/i }).click();
    await expect(page.getByTestId('clyro-intro-overlay')).toBeHidden();

    // Verify interactive landing preview updates live via shared engine
    await page.getByRole('radio', { name: /Pseudonymization/i }).click();
    await expect(page.getByText('EMAIL_001').first()).toBeVisible();

    // Test Try Your Text live editable landing sandbox
    await page.getByRole('button', { name: /Try Your Text/i }).click();
    const landingTextarea = page.getByLabel(/Interactive landing sanitizer input/i);
    await landingTextarea.fill('Urgent Pune call: custom@example.org');
    await expect(page.getByText('EMAIL_001').first()).toBeVisible();

    // Test interactive Technology Pipeline Luhn validator probe
    const probeInput = page.getByLabel(/Live Local Validator Input/i);
    await probeInput.fill('4111 1111 1111 1111');
    await expect(page.getByText(/CARD: 4111111111111111/i)).toBeVisible();
    await probeInput.fill('4111 1111 1111 1112');
    await expect(page.getByText(/Rejected by Luhn checksum/i)).toBeVisible();

    // 2. Launch workspace
    await page.getByRole('button', { name: /Launch Clyro/i }).first().click();
    await expect(page.getByRole('heading', { name: /Data Sanitizer/i })).toBeVisible();

    // 3. Load synthetic relief sample
    await page.getByRole('button', { name: /^Load Sample$/i }).click();
    await expect(page.getByTestId('stat-categories-detected')).toHaveText('6 / 6');

    // 4. Verify Luhn rejected card & invalid IP are flagged separately and NOT masked
    await expect(page.getByText('4111111111111112').first()).toBeVisible();
    await expect(page.getByText('999.1.2.3').first()).toBeVisible();

    // 5. Switch through Full -> Partial -> Pseudonymization
    await page.getByRole('radio', { name: /Partial Mask/i }).click();
    await expect(page.getByText('XXXXXX3210').first()).toBeVisible();
    await expect(page.getByText('XXXX-XXXX-XXXX-1111').first()).toBeVisible();

    await page.getByRole('radio', { name: /Pseudonymization/i }).click();
    await expect(page.getByText('EMAIL_001').first()).toBeVisible();
    await expect(page.getByText('PHONE_001').first()).toBeVisible();
    await expect(page.getByText('CARD_001').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCRATCH_DIR, 'workspace-desktop.png') });

    // 6. Download sanitized CSV and verify exact local bytes
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download Sanitized File/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('clyro-sanitized.csv');
    const dlPath = await download.path();
    expect(dlPath).toBeTruthy();
    const downloadedCsv = await fs.readFile(dlPath!, 'utf8');

    expect(downloadedCsv).toContain('Pune');
    expect(downloadedCsv).toContain('EMAIL_001');
    expect(downloadedCsv).toContain('PHONE_001');
    expect(downloadedCsv).toContain('CARD_001');
    expect(downloadedCsv).not.toContain('ravi@example.com');
    expect(downloadedCsv).not.toContain('9876543210');
    expect(downloadedCsv).not.toContain('ABCDE1234F');
    expect(downloadedCsv).not.toContain('4111 1111 1111 1111');

    // 7. Safe Handover scope & column minimization
    await page.getByRole('button', { name: /Safe Handover/i }).click();
    await expect(page.getByRole('heading', { name: /Organization Safe Handover/i })).toBeVisible();
    await page.getByRole('button', { name: /NGO Coordination/i }).click();
    await expect(page.getByText(/NGO_[0-9A-F]{4}_PHONE_001/)).toBeVisible();

    // 8. Privacy Audit check (zero raw PII in JSON payload)
    await page.getByRole('button', { name: /Privacy Audit/i }).click();
    await expect(page.getByRole('heading', { name: /Privacy Audit Report/i })).toBeVisible();
    const auditBody = await page.locator('pre').textContent();
    expect(auditBody).not.toContain('ravi@example.com');
    expect(auditBody).not.toContain('ABCDE1234F');

    // 9. Reset Session clears state
    await page.getByRole('button', { name: /^Sanitizer$/i }).click();
    await page.getByRole('button', { name: /^Reset$/i }).click();
    await expect(page.getByTestId('stat-total-occurrences')).toHaveText('0');

    // 10. Local TXT upload and byte-verified TXT download
    await page.setInputFiles('input[type="file"]', {
      name: 'intake-note.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Caller: +91 98765 43210, Mail: ravi@example.com, Card: 4111111111111111'),
    });
    await expect(page.getByTestId('stat-total-occurrences')).toHaveText('3');
    const [txtDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download Sanitized File/i }).click(),
    ]);
    expect(txtDownload.suggestedFilename()).toBe('clyro-sanitized.txt');
    const txtPath = await txtDownload.path();
    const txtBytes = await fs.readFile(txtPath!, 'utf8');
    expect(txtBytes).toBe('Caller: [REDACTED], Mail: [REDACTED], Card: [REDACTED]');

    // 11. Malformed CSV disables export with actionable error
    await page.setInputFiles('input[type="file"]', {
      name: 'broken.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('col1,col2\n"unclosed,value\n'),
    });
    await expect(page.getByRole('alert')).toHaveText(/CSV Parsing Failed/i);
    await expect(page.getByRole('button', { name: /^Export$/i })).toBeDisabled();

    // 12. Verify zero persistent storage, zero console/CSP errors, zero non-static network requests
    const storageCounts = await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
    }));
    expect(storageCounts.local).toBe(0);
    expect(storageCounts.session).toBe(0);
    expect(nonStaticOrExternalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('responsive layout has zero unintended horizontal overflow across 360px, 768px, and 1440px', async ({
    page,
  }) => {
    for (const vp of [
      { width: 360, height: 800 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto('/');
      const skipBtn = page.getByRole('button', { name: /Skip Intro/i });
      if (await skipBtn.isVisible()) {
        await skipBtn.click();
      }
      const overflowLanding = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(overflowLanding).toBe(false);

      if (vp.width === 360) {
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'landing-mobile.png') });
      }

      await page.goto('/app');
      await page.getByRole('button', { name: /^Load Sample$/i }).click();
      const overflowApp = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(overflowApp).toBe(false);

      if (vp.width === 360) {
        await page.screenshot({ path: path.join(SCRATCH_DIR, 'workspace-mobile.png') });
      }
    }
  });
});
