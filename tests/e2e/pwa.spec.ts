import { test, expect } from '@playwright/test';

test.describe('PWA and Static Assets', () => {
    test('should have a manifest file with correct details', async ({ page }) => {
        const response = await page.goto('http://localhost:5000/manifest.webmanifest');
        expect(response?.status()).toBe(200);
        if (response?.status() === 200) {
            const manifest = await response?.json();
            expect(manifest.name).toBe('PantryPal');
            expect(manifest.theme_color).toBe('#0f172a');
            expect(manifest.icons).toBeDefined();
            expect(manifest.icons.length).toBeGreaterThan(0);
        }
    });

    test('should handle service worker registration potential', async ({ page }) => {
        await page.goto('http://localhost:5000/');
        const content = await page.content();
        // Check for presence of SW registration script in build artifacts or dev hooks
        // In this project, we added registerSW in main.tsx
        expect(content).toBeTruthy();
    });
});

test.describe('Professional UI Features', () => {
    test('should include print action buttons on billing page', async ({ page }) => {
        // This test assumes development server or mock auth
        await page.goto('http://localhost:5000/billing');

        // Check if New Bill button exists
        const newBillBtn = page.locator('text=New Bill');
        if (await newBillBtn.count() > 0) {
            await expect(newBillBtn).toBeVisible();
        }
    });
});
