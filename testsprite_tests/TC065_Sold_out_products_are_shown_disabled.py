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
        
        # -> Open the Antojos store page and inspect its products for a sold-out item and disabled purchase button.
        await page.goto("http://localhost:3000/tiendas/antojos")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Scroll the Antojos product list to reveal the sold-out item and verify its purchase button.
        await page.mouse.wheel(0, 300)
        
        # --> Assertions to verify final state
        
        # --> Doritos is marked “Agotado” and its “Sin unidades” button is disabled.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: Doritos is marked as sold out.
        await expect(page.locator("xpath=/html/body/div[2]/main/div[2]/div/section/div/div[2]/ul/li[8]/div[1]/span/span").nth(0)).to_have_text("Agotado", timeout=15000), "Doritos is marked as sold out."
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The “Sin unidades” button is disabled.
        await expect(page.get_by_role("button", name="Doritos está agotado").nth(0)).to_have_attribute("disabled", "", timeout=15000), "The \u201cSin unidades\u201d button is disabled."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    