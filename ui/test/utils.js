import { Browser, Builder, By, until } from 'selenium-webdriver';

export const CRADLE_URL = 'http://cradle.yigit.run/';

export class SeleniumUtils {
    constructor(url) {
        this.driver = new Builder().forBrowser(Browser.FIREFOX).build();
        this.url = url;
    }

    async getSidebarCount() {
        let items = await this.driver.findElements(By.className('menu-item'));
        return items.length;
    }

    async getActorCount() {
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/admin'));

        let divs = await this.driver.findElements(
            By.className('w-full h-fit bg-gray-2 rounded-md p-3'),
        );

        let actorDiv = divs[0];

        let children = await actorDiv.findElements(By.xpath('./*'));

        children = await children[2].findElements(By.xpath('./*'));

        return children.length;
    }

    async getEntityCount() {
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/admin'));

        let divs = await this.driver.findElements(
            By.className('w-full h-fit bg-gray-2 rounded-md p-3'),
        );

        let entityDiv = divs[0];

        let children = await entityDiv.findElements(By.xpath('./*'));

        children = await children[2].findElements(By.xpath('./*'));

        return children.length;
    }

    async checkAlertSuccessful() {
        let alert = await this.driver.wait(
            until.elementLocated(By.css('[data-testid="dismissable-alert"]')),
        );

        let hasClass = await alert
            .getAttribute('class')
            .then((classes) => classes.split(' ').includes('bg-success'));
        expect(hasClass).toBe(true);
    }

    async openStartPage() {
        await this.driver.get(this.url);
        await this.driver.wait(until.titleIs('CRADLE'), 1000);
    }

    async goToRegister() {
        const buttonLocator = await this.driver.findElement(
            By.css('[href="#/register"]'),
        );
        await buttonLocator.click();
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/register'));
    }

    async goToLogin() {
        const buttonLocator = await this.driver.findElement(By.css('[href="#/login"]'));
        await buttonLocator.click();
    }

    async login(username, password) {
        const usernameForm = await this.driver.findElement(By.id('username'));
        const passwordForm = await this.driver.findElement(By.id('password'));
        const loginButton = await this.driver.findElement(
            By.css('[data-testid="login-register-button"]'),
        );

        await usernameForm.sendKeys(username);
        await passwordForm.sendKeys(password);
        await loginButton.click();
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/'));
    }

    async goToSidebarOption(option) {
        let items = await this.driver.findElements(By.className('menu-item'));
        await items[option].click();
    }

    async register(username, password, email) {
        const usernameForm = await this.driver.findElement(By.id('username'));
        const passwordForm = await this.driver.findElement(By.id('password'));
        const confirmPasswordForm = await this.driver.findElement(
            By.id('password-check'),
        );
        const emailForm = await this.driver.findElement(By.id('email'));
        const registerButton = await this.driver.findElement(
            By.css('[data-testid="login-register-button"]'),
        );

        await usernameForm.sendKeys(username);
        await passwordForm.sendKeys(password);
        await confirmPasswordForm.sendKeys(password);
        await emailForm.sendKeys(email);
        await registerButton.click();
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/login'));
    }

    async search(queryString) {
        let inputElems = await this.driver.findElements(By.css('input'));
        await inputElems[0].click();
        inputElems = await this.driver.findElements(By.css('input'));
        await inputElems[0].sendKeys(queryString + '\uE007');
        let searchResults = await this.driver.wait(
            until.elementsLocated(
                By.className(
                    'h-fit w-full bg-cradle3 px-3 py-6 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl cursor-pointer',
                ),
            ),
        );
        for (let result of searchResults) {
            let resultH2 = await result.findElement(By.css('h2'));
            if ((await resultH2.getText()) == queryString) {
                await result.click();
                return;
            }
        }
    }

    async createEntity(name, description) {
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/admin'));
        let items = await this.driver.findElements(By.css('span'));

        await items[1].click();
        await this.driver.wait(
            until.urlIs('https://cradle.yigit.run/#/admin/add-entity'),
        );

        let inputs = await this.driver.findElements(By.css('input'));
        let descriptionForm = await this.driver.findElement(By.css('textarea'));
        let buttons = await this.driver.findElements(By.css('button'));

        await inputs[1].sendKeys(name);
        await descriptionForm.sendKeys(description);

        await buttons[3].click();
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/admin'));
    }

    async createActor(name, description) {
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/admin'));
        let items = await this.driver.findElements(By.css('span'));

        await items[0].click();
        await this.driver.wait(
            until.urlIs('https://cradle.yigit.run/#/admin/add-actor'),
        );

        let inputs = await this.driver.findElements(By.css('input'));
        let descriptionForm = await this.driver.findElement(By.css('textarea'));
        let buttons = await this.driver.findElements(By.css('button'));

        await inputs[1].sendKeys(name);
        await descriptionForm.sendKeys(description);

        await buttons[3].click();
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/admin'));
    }

    async deleteActor(name) {
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/admin'));

        let divs = await this.driver.findElements(
            By.className('w-full h-fit bg-gray-2 rounded-md p-3'),
        );

        let actorDiv = divs[0];

        let children = await actorDiv.findElements(By.xpath('./*'));

        children = await children[2].findElements(By.xpath('./*'));

        for (let child of children) {
            var nameTag = await child.findElement(By.css('a'));
            var blabla = await nameTag.getText();
            if ((await nameTag.getText()) == name) {
                // delete actor
                var button = await child.findElement(By.css('button'));
                await button.click();
                var confirmButton = await this.driver.wait(
                    until.elementLocated(By.className('btn btn-success')),
                );
                await confirmButton.click();
            }
        }
    }

    async createNote(content, option) {
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/editor/new'));
        let activeLine = await this.driver.findElement(By.className('cm-activeLine'));
        await this.driver.executeScript(
            'arguments[0].innerText = arguments[1];',
            activeLine,
            content,
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));

        let buttons = await this.driver.findElements(By.css('button'));
        await buttons[3].click();
        let options = await this.driver.findElements(By.css('a'));
        await options[option].click();
    }

    async logout() {
        let items = await this.driver.findElements(By.className('menu-item'));
        await items[5].click();
        await this.driver.wait(until.urlIs('https://cradle.yigit.run/#/login'));
    }

    async closeApplication() {
        this.driver.quit();
    }
}
