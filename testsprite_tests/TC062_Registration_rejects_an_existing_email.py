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
        
        # -> Open the account creation page and inspect its registration fields and controls.
        await page.goto("http://localhost:3000/auth/crear-cuenta")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Enter Ana, ana@utb.edu.co, and the supplied password, accept the terms, and submit the registration form.
        # nombre text field
        elem = page.get_by_role("textbox", name="Nombre completo")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Ana")
        
        # -> Enter Ana, ana@utb.edu.co, and the supplied password, accept the terms, and submit the registration form.
        # email email field
        elem = page.get_by_role("textbox", name="Correo institucional")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("ana@utb.edu.co")
        
        # -> Enter Ana, ana@utb.edu.co, and the supplied password, accept the terms, and submit the registration form.
        # password password field
        elem = page.get_by_role("textbox", name="Contraseña")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Comprador-2026")
        
        # -> Enter Ana, ana@utb.edu.co, and the supplied password, accept the terms, and submit the registration form.
        # acepta checkbox
        elem = page.get_by_role("checkbox", name="Acepto los términos de uso y")
        await elem.click(timeout=10000)
        
        # -> Enter Ana, ana@utb.edu.co, and the supplied password, accept the terms, and submit the registration form.
        # Crear mi pase button
        elem = page.get_by_role("button", name="Crear mi pase")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The duplicate-email submission left the registration form open rather than creating a signed-in session.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The page remains on the account-creation route.
        await expect(page).to_have_url(re.compile("/auth/crear\\-cuenta"), timeout=15000), "The page remains on the account-creation route."
        await page.get_by_role("button", name="Crear mi pase").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The registration submit button remains visible.
        await expect(page.get_by_role("button", name="Crear mi pase").nth(0)).to_be_visible(timeout=15000), "The registration submit button remains visible."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    