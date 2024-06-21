import { SeleniumUtils, CRADLE_URL } from './utils';
import 'geckodriver';
import 'selenium-webdriver/firefox';

describe('Test user functionality', () => {
    let normalUser = new SeleniumUtils(CRADLE_URL);
    let adminUser = new SeleniumUtils(CRADLE_URL);

    it.skip('Registers successfully', async () => {
        try {
            let username = 'someuser';
            let email = 'somemail@example.com';
            let password = 'V3rys@fePassw0rd';
            await normalUser.openStartPage();
            await normalUser.goToRegister();
            await normalUser.register(username, password, email);

            let adminUsername = 'admin';
            let adminPassword = 'PU4kiIit21pFbib';
            await adminUser.openStartPage();
            await adminUser.login(adminUsername, adminPassword);
            await adminUser.goToSidebarOption(3);
            await adminUser.createCase('newcase', '');
            await adminUser.setAccess(username, 'newcase', 2);
            // assert that the access for the user has changed.

            // await normalUser.login(username, password);
            // expect(await normalUser.getSidebarCount()).toBe(5);
            // await normalUser.goToSidebarOption(1);
            // await normalUser.createNote("[[case:newcase]] and [[ip:192.168.0.0]]");

            // await adminUser.logout();
            // await normalUser.logout();
        } finally {
            // await adminUser.driver.quit();
            // await normalUser.driver.quit();
        }
    });
});
