import { validatePassword } from './validatePassword';

describe('validatePassword', () => {
    it('validates password with all required characters', () => {
        const password = 'Password1@2345';
        expect(validatePassword(password)).toBe(true);
    });

    it('validates password with all required characters variation 1', () => {
        const password = '1@Pass2345word';
        expect(validatePassword(password)).toBe(true);
    });

    it('validates password with all required characters variation 2', () => {
        const password = 'Pas12sword@rds!N#4';
        expect(validatePassword(password)).toBe(true);
    });

    it('invalidates password without lowerentity letter', () => {
        const password = 'PASSWORD1@2345';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without lowerentity letter variation 1', () => {
        const password = 'P@S1SW00RDDDDDD';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without upperentity letter', () => {
        const password = 'password1@aaaaa';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without upperentity letter variation 1', () => {
        const password = 'p@sddddddsw00rd';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without digit', () => {
        const password = 'Password@afFdfs(';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without digit variation 1', () => {
        const password = 'P@ss%<wwPword';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without special character', () => {
        const password = 'Password123dPass';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without special character variation 1', () => {
        const password = 'Passw00rdisNotGood';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password shorter than 12 characters', () => {
        const password = 'Pass1@';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password shorter than 12 characters variation 1', () => {
        const password = '';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password shorter than 12 characters variation 2', () => {
        const password = 'Pas!5678911';
        expect(validatePassword(password)).toBe(false);
    });
});
