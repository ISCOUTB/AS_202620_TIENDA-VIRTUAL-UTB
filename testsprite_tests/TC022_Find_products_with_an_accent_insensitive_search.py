import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:3000")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Enter an unaccented product search term and check whether matching suggestions appear.
        # Arroz, granola, helado… search field
        elem = page.get_by_role("searchbox", name="Buscar en las tiendas")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("cafe")
        
        # -> Select the “Café americano” suggestion and verify the matching product and Alegría store menu are displayed.
        # Café americano Alegría $3.500 link
        elem = page.get_by_role("link", name="Café americano Alegría $")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The unaccented search for “cafe” found the matching product “Café americano.”
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The matching product Café americano is displayed.
        await expect(page.locator("#contenido").nth(0)).to_contain_text("Caf\u00e9 americano", timeout=15000), "The matching product Caf\u00e9 americano is displayed."
        
        # --> Selecting the matching product opened Alegría’s store menu.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: Alegría’s store menu is open.
        await expect(page).to_have_url(re.compile("/tiendas/alegria"), timeout=15000), "Alegr\u00eda\u2019s store menu is open."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    