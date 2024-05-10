import { logInReq, registerReq } from '../src/renderer/src/services/AuthService';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('AuthService', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should make a successful login request', async () => {
    const data = { username: 'test', password: 'test' };
    mock.onPost('/users/login/').reply(200, { data: 'success' });

    const response = await logInReq(data);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ data: 'success' });
  });

  it('should handle failed login request', async () => {
    const data = { username: 'test', password: 'test' };
    mock.onPost('/users/login/').reply(500);

    try {
      await logInReq(data);
    } catch (error) {
      expect(error.response.status).toBe(500);
    }
  });

  it('should make a successful registration request', async () => {
    const data = { username: 'test', password: 'test' };
    mock.onPost('/users/').reply(200, { data: 'success' });

    const response = await registerReq(data);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ data: 'success' });
  });

  it('should handle failed registration request', async () => {
    const data = { username: 'test', password: 'test' };
    mock.onPost('/users/').reply(500);

    try {
        await registerReq(data);
    } catch (error) {
        expect(error.response.status).toBe(500);
    }
  });
});
