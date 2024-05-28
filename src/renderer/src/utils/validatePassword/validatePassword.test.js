import { validatePassword } from './validatePassword';

describe('validatePassword', () => {
    it('validates password with all required characters', () => {
        const password = 'Password1@';
        expect(validatePassword(password)).toBe(true);
    });

    it('validates password with all required characters variation 1', () => {
        const password = '1@Password';
        expect(validatePassword(password)).toBe(true);
    });

    it('validates password with all required characters variation 2', () => {
        const password = 'Pas12sw@rds';
        expect(validatePassword(password)).toBe(true);
    });

    it('invalidates password without lowercase letter', () => {
        const password = 'PASSWORD1@';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without lowercase letter variation 1', () => {
        const password = 'P@SSW00RD';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without uppercase letter', () => {
        const password = 'password1@';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without uppercase letter variation 1', () => {
        const password = 'p@ssw00rd';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without digit', () => {
        const password = 'Password@';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without digit variation 1', () => {
        const password = 'P@ssword';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without special character', () => {
        const password = 'Password1';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password without special character variation 1', () => {
        const password = 'Passw00rd';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password shorter than 8 characters', () => {
        const password = 'Pass1@';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password shorter than 8 characters variation 1', () => {
        const password = '';
        expect(validatePassword(password)).toBe(false);
    });

    it('invalidates password shorter than 8 characters variation 2', () => {
        const password = 'P@s0';
        expect(validatePassword(password)).toBe(false);
    });
});