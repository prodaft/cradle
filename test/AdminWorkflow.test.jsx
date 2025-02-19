/**
 * @jest-environment jsdom
 */
import { SeleniumUtils, CRADLE_URL } from './utils';
import 'geckodriver';
import 'selenium-webdriver/firefox';

describe('Test admin functionality', () => {
    let loginPage = new SeleniumUtils(CRADLE_URL);
    it.skip('creates/deletes entities and a note.', async () => {
        let username = 'admin';
        const password = process.env.VITE_ADMIN_PASSWORD;
        let content = '[[entity:Bromania]] il investigheaza pe [[ip:192.168.0.0]]';
        try {
            await loginPage.openStartPage();
            await loginPage.login(username, password);
            expect(await loginPage.getSidebarCount()).toBe(6);

            await loginPage.goToSidebarOption(3);
            let currEntities = await loginPage.getEntityCount();
            await loginPage.createEntity('Bromania', 'Description');

            expect(await loginPage.getEntityCount()).toBe(currEntities + 1);

            await loginPage.goToSidebarOption(1);
            await loginPage.createNote(content, 0);

            await loginPage.checkAlertSuccessful();

            await loginPage.goToSidebarOption(3);
            await loginPage.logout();
        } finally {
            await loginPage.driver.quit();
        }
    });
});
