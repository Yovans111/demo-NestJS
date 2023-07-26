import { LoginMiddleware } from './login.middleware';

describe('LoginMiddleware', () => {
  it('should be defined', () => {
    expect(new LoginMiddleware()).toBeDefined();
  });
});
