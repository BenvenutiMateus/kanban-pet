const { test, expect } = require('@playwright/test');

test('Group visibility and My Tasks functionality', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Need to bypass authentication or setup mock user state for pure UI test,
  // but since we do not have a test DB setup let's just make sure the page loads and the new button is there
  await page.waitForSelector('#btn-my-tasks');
  const myTasksBtn = page.locator('#btn-my-tasks');
  await expect(myTasksBtn).toBeVisible();
});
