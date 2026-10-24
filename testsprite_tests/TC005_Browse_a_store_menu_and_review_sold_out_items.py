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
        
        # -> Open the stores listing from the “Tiendas” navigation and select Antojos.
        # Tiendas link
        elem = page.get_by_role("link", name="Tiendas", exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the Antojos store card to review its product menu.
        # Tienda de barrio Antojos Lo que se antoja entre... link
        elem = page.get_by_role("link", name="Tienda de barrio Antojos Lo")
        await elem.click(timeout=10000)
        
        # -> Scroll down through the Antojos menu to inspect the sold-out product card and confirm its ordering control is unavailable.
        await page.mouse.wheel(0, 300)
        
        # --> Assertions to verify final state
        
        # --> Available product cards are displayed in the Antojos menu.
        await page.get_by_role("button", name="Agregar Bombombum personal ·").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The Bombombum personal product card is displayed.
        await expect(page.get_by_role("button", name="Agregar Bombombum personal ·").nth(0)).to_be_visible(timeout=15000), "The Bombombum personal product card is displayed."
        await page.get_by_role("button", name="Agregar Cheetos al pedido").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The Cheetos product card is displayed.
        await expect(page.get_by_role("button", name="Agregar Cheetos al pedido").nth(0)).to_be_visible(timeout=15000), "The Cheetos product card is displayed."
        
        # --> The sold-out Doritos card remains visible with its unavailable control disabled.
        await page.get_by_text("Agotado").first.nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The sold-out label is visible on the Doritos card.
        await expect(page.get_by_text("Agotado").first.nth(0)).to_be_visible(timeout=15000), "The sold-out label is visible on the Doritos card."
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The Doritos ordering control is disabled.
        await expect(page.get_by_role("button", name="Doritos está agotado").nth(0)).to_have_attribute("disabled", "", timeout=15000), "The Doritos ordering control is disabled."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    