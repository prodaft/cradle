import { it } from '@jest/globals';
import { SeleniumUtils, CRADLE_URL } from './utils';
import 'geckodriver';
import 'selenium-webdriver/firefox';

describe('Test dashboard', () => {
    let adminUser = new SeleniumUtils(CRADLE_URL);
    let noteContents = [
        '[[case:Bromania]] and [[ip:192.168.0.0]]',
        '[[case:Bromania]] and [[country:Romania]]',
        '[[case:Bromania]] and [[actor:Diaciclovn]]',
    ];

    it.skip('', async () => {
        let username = 'admin';
        const password = import.meta.env.VITE_ADMIN_PASSWORD;
        let searchString = 'Bromania';

        try {
            await adminUser.openStartPage();
            await adminUser.login(username, password);

            await adminUser.goToSidebarOption(3);
            await adminUser.createActor('Diaciclovn', '');
            await adminUser.createCase('Bromania', 'Description');

            await adminUser.goToSidebarOption(1);
            await adminUser.createNote(noteContents[0], 0);
            await adminUser.createNote(noteContents[1], 0);
            await adminUser.createNote(noteContents[2], 0);

            await adminUser.driver.get(
                'https://cradle.yigit.run/#/dashboards/cases/Bromania',
            );

            // assert stuff here.

            // await adminUser.logout();
        } finally {
            // await adminUser.driver.quit();
        }
    });
});
