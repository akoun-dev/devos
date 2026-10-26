import { expect, test } from '@playwright/test'

const privateRepository = {
  id: 90210,
  name: 'private-demo',
  fullName: 'test-owner/private-demo',
  htmlUrl: 'https://github.com/test-owner/private-demo',
  description: 'Private repository used for UI smoke tests',
  isPrivate: true,
  defaultBranch: 'main',
  owner: 'test-owner',
  updatedAt: '2026-10-26T10:00:00Z',
}

for (const scenario of [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
]) {
  test(`GitHub import flow on ${scenario.name}`, async ({ page }) => {
    await page.setViewportSize(scenario.viewport)

    await page.route('**/api/github/repositories', async (route) => {
      const body = route.request().postDataJSON()
      if (body.action === 'list') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ repositories: [privateRepository] }) })
        return
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ project: { id: 'project-ui-test', name: privateRepository.name, sourceRepositoryUrl: privateRepository.htmlUrl, sourceDefaultBranch: 'main' } }),
      })
    })

    await page.goto('http://127.0.0.1:3000/')
    const email = `github-ui-${scenario.name}-${Date.now()}@example.invalid`
    const registrationStatus = await page.evaluate(async (testEmail) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'UI Test', email: testEmail, password: 'Test-password-2026' }),
      })
      return response.status
    }, email)
    expect(registrationStatus).toBe(201)
    await page.reload()

    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible({ timeout: 20_000 })

    if (scenario.mobile) {
      await page.getByRole('button', { name: 'Ouvrir la navigation' }).click()
      await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'GitHub' }).click()
    } else {
      await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'GitHub' }).click()
    }

    await expect(page.getByRole('heading', { name: 'Dépôts GitHub' })).toBeVisible()
    await page.getByLabel('Token personnel GitHub').fill('ghp-ui-test-token')
    await page.getByRole('button', { name: 'Charger les dépôts' }).click()

    await expect(page.getByText('test-owner/private-demo')).toBeVisible()
    await expect(page.getByText('Privé')).toBeVisible()
    expect(await page.evaluate(() => Object.values(localStorage).join(' '))).not.toContain('ghp-ui-test-token')
    expect(await page.evaluate(() => Object.values(sessionStorage).join(' '))).not.toContain('ghp-ui-test-token')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.getByRole('button', { name: 'Importer dans DevOS' }).click()
    await expect(page.getByRole('heading', { name: 'Confirmer l’import du dépôt ?' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirmer l’import' }).click()

    await expect(page.getByRole('heading', { name: 'Projets' })).toBeVisible({ timeout: 10_000 })
    expect(await page.locator('nav[aria-label="Navigation mobile inférieure"]').count()).toBe(0)
  })
}
