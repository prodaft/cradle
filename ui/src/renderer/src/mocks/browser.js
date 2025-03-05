import { setupWorker } from 'msw/browser';
import { handlers as loginHandlers } from './handlers/login';

export const worker = setupWorker(...loginHandlers);
