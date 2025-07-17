import React, { useState } from 'react';
import { Panel, Form, Input, Button, Message, Loader, Stack } from 'rsuite';
import { useAuth } from '../../providers/AuthProvider';
import { useConfiguration } from '../../providers/ConfigurationProvider';
import { Logo } from './Logo';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customBasePath, setCustomBasePath] = useState('');
  const { login, loading, error } = useAuth();
  const { basePath, setBasePath } = useConfiguration();

  const handleSubmit = async (_formValue: Record<string, any> | null, event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (username && password) {
      // Update base path if custom one is provided
      if (customBasePath && customBasePath !== basePath) {
        setBasePath(customBasePath);
      }
      await login(username, password);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Panel 
        bordered 
        header={
          <Stack direction="column" alignItems="center" spacing={15}>
            <Logo 
              className="login-logo"
              alt="CRADLE Logo"
              text={true}
            />
          </Stack>
        }
        className="w-full max-w-md p-8 rounded-lg shadow-lg"
      >
        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <Form.ControlLabel>Username</Form.ControlLabel>
            <Input
              value={username}
              onChange={setUsername}
              placeholder="Enter your username"
              disabled={loading}
              size="lg"
            />
          </Form.Group>
          
          <Form.Group>
            <Form.ControlLabel>Password</Form.ControlLabel>
            <Input
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              disabled={loading}
              size="lg"
            />
          </Form.Group>

          <div className="mb-5">
            <Button
              appearance="link"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
                        className="p-0 no-underline"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>
          </div>

          {showAdvanced && (
            <Form.Group>
              <Form.ControlLabel>
                API Base URL (Optional)
                <span className="text-xs text-gray-600 block">
                  Current: {basePath}
                </span>
              </Form.ControlLabel>
              <Input
                value={customBasePath}
                onChange={setCustomBasePath}
                placeholder={basePath}
                disabled={loading}
                size="lg"
              />
            </Form.Group>
          )}

          {error && (
            <Message 
              type="error" 
                      className="mb-5"
              showIcon
            >
              <strong>Authentication Error:</strong> {error}
            </Message>
          )}

          <Button
            type="submit"
            appearance="primary"
            size="lg"
            block
            disabled={loading || !username || !password}
                    className="mt-5"
          >
            {loading ? (
              <Stack spacing={8} alignItems="center">
                <Loader size="sm" />
                <span>Signing in...</span>
              </Stack>
            ) : (
              'Sign in'
            )}
          </Button>
        </Form>
      </Panel>
    </div>
  );
};

export default LoginForm;
