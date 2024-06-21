/**
 * @jest-environment jsdom
 */
import { SeleniumUtils, CRADLE_URL } from './utils';
import 'geckodriver';
import 'selenium-webdriver/firefox';

describe('Test admin functionality', () => {
    let loginPage = new SeleniumUtils(CRADLE_URL);
    it.skip('creates/deletes cases, actors and a note.', async () => {
        let username = 'admin';
        const password = process.env.VITE_ADMIN_PASSWORD;
        let content = '[[case:Bromania]] il investigheaza pe [[ip:192.168.0.0]]';
        try {
            await loginPage.openStartPage();
            await loginPage.login(username, password);
            expect(await loginPage.getSidebarCount()).toBe(6);

            await loginPage.goToSidebarOption(3);
            let currActors = await loginPage.getActorCount();
            let currCases = await loginPage.getCaseCount();
            await loginPage.createActor('Diaciclovn', '');
            await loginPage.createCase('Bromania', 'Description');

            expect(await loginPage.getActorCount()).toBe(currActors + 1);
            expect(await loginPage.getCaseCount()).toBe(currCases + 1);

            await loginPage.goToSidebarOption(1);
            await loginPage.createNote(content, 0);

            await loginPage.checkAlertSuccessful();

            await loginPage.goToSidebarOption(3);
            await loginPage.deleteActor('Diaciclovn');
            expect(await loginPage.getActorCount()).toBe(currActors);
            await loginPage.logout();
        } finally {
            await loginPage.driver.quit();
        }
    });
});
