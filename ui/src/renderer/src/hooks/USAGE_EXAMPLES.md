# API Error Handling - Usage Examples

## Overview

All API errors follow RFC 9457 format. Use the provided utilities for consistent error handling.

---

## Basic Pattern: Manual Error Handling

```javascript
import { handleAPIError } from '../utils/apiErrorHandler';
import { useNotif } from '../contexts/NotificationContext/NotificationContext';

function MyComponent() {
    const { notify } = useNotif();
    const { usersApi } = useApi();

    const handleDelete = async (userId) => {
        try {
            await usersApi.usersDestroy({ userId });
            notify({ type: 'success', text: 'User deleted successfully' });
        } catch (error) {
            handleAPIError(error, notify);  // One-liner for standard error
        }
    };
}
```

---

## Using useAPICall Hook

### Simple Execute Pattern

```javascript
import { useAPICall } from '../hooks/useAPICall';

function MyComponent() {
    const { execute, loading } = useAPICall();
    const { usersApi } = useApi();

    const handleDelete = async (userId) => {
        await execute(
            () => usersApi.usersDestroy({ userId }),
            { successMessage: 'User deleted successfully' }
        );
        // Errors handled automatically, success notification shown
        refreshList();
    };

    return (
        <button onClick={() => handleDelete(user.id)} disabled={loading}>
            Delete
        </button>
    );
}
```

### Executor Pattern (Pre-configured Function)

```javascript
import { useAPICall } from '../hooks/useAPICall';

function MyComponent() {
    const { executor } = useAPICall();
    const { usersApi } = useApi();

    // Create pre-configured function
    const deleteUser = executor(
        (userId) => usersApi.usersDestroy({ userId }),
        { successMessage: 'User deleted successfully' }
    );

    // Use it directly in event handlers
    return (
        <button onClick={() => deleteUser(user.id)}>
            Delete
        </button>
    );
}
```

### With Custom Error Handling

```javascript
const { execute } = useAPICall();

const handleImport = async (file) => {
    try {
        await execute(
            () => usersApi.usersImport({ file }),
            { successMessage: 'Users imported' }
        );
        navigate('/users');
    } catch (error) {
        // Custom logic for specific errors
        if (error.code === 'DUPLICATE_USER') {
            showDuplicateDialog();
        }
    }
};
```

---

## Form Validation

### Basic Form

```javascript
import { useFormValidation } from '../hooks/useFormValidation';
import FormFieldWithError from '../components/FormField/FormFieldWithError';

function UserForm() {
    const { handleSubmit, getFieldError, isSubmitting } = useFormValidation();
    const { usersApi } = useApi();
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            await handleSubmit(
                () => usersApi.usersCreate({
                    userRequest: Object.fromEntries(formData)
                }),
                { successMessage: 'User created successfully' }
            );
            navigate('/users');
        } catch (error) {
            // Error already handled, field errors set automatically
            // Can add custom logic here if needed
        }
    };

    return (
        <form onSubmit={onSubmit}>
            <FormFieldWithError
                name="username"
                label="Username"
                error={getFieldError('username')}
                required
            />
            
            <FormFieldWithError
                name="email"
                label="Email"
                type="email"
                error={getFieldError('email')}
                required
            />
            
            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
        </form>
    );
}
```

### Form with Custom Field Components

```javascript
function MyForm() {
    const { handleSubmit, getFieldError, hasFieldError } = useFormValidation();

    return (
        <form onSubmit={onSubmit}>
            <div>
                <input 
                    name="username" 
                    className={hasFieldError('username') ? 'error' : ''}
                />
                {getFieldError('username')?.map((error, i) => (
                    <span key={i} className="error-text">{error}</span>
                ))}
            </div>
        </form>
    );
}
```

---

## Advanced Patterns

### Silent Background Request

```javascript
// Don't show any notification
try {
    const exists = await usersApi.usersRetrieve({ username });
    return true;
} catch (error) {
    // Silent - no notification
    return false;
}
```

### Custom Error Messages

```javascript
try {
    await usersApi.usersDestroy({ userId });
    notify({ type: 'success', text: 'User deleted' });
} catch (error) {
    handleAPIError(error, notify, {
        message: 'Failed to delete user. They may have active sessions.',
        duration: 6000
    });
}
```

### Check Specific Error Codes

```javascript
import { parseAPIError, isErrorCode } from '../utils/apiErrorHandler';

try {
    await api.operation();
} catch (error) {
    if (isErrorCode(error, 'PERMISSION_DENIED')) {
        navigate('/login');
        return;
    }
    
    const parsed = parseAPIError(error);
    if (parsed.code === 'DUPLICATE_USER') {
        showDuplicateDialog();
        return;
    }
    
    // Generic error
    handleAPIError(error, notify);
}
```

### Suppress Notification but Log

```javascript
const { execute } = useAPICall();

await execute(
    () => api.backgroundTask(),
    { 
        suppressNotification: true,
        onError: (error) => console.log('Background task failed:', error.code)
    }
);
```

### Custom Success/Error Callbacks

```javascript
const { execute } = useAPICall();

await execute(
    () => api.createUser(userData),
    {
        successMessage: 'User created',
        onSuccess: (result) => {
            console.log('Created user:', result.id);
            trackEvent('user_created', result.id);
        },
        onError: (error) => {
            console.error('Failed to create user:', error.code);
            trackEvent('user_creation_failed', error.code);
        }
    }
);
```

---

## Utility Functions Reference

### parseAPIError(error)
Parse error into structured format.

```javascript
import { parseAPIError } from '../utils/apiErrorHandler';

const parsed = parseAPIError(error);
console.log(parsed.code);           // 'USER_NOT_FOUND'
console.log(parsed.detail);         // 'User with ID 123 not found.'
console.log(parsed.isValidationError); // false
console.log(parsed.fieldErrors);    // {}
```

### handleAPIError(error, notify, options)
Show error notification (one-liner).

```javascript
import { handleAPIError } from '../utils/apiErrorHandler';

catch (error) {
    handleAPIError(error, notify);
}

// With custom message
catch (error) {
    handleAPIError(error, notify, { 
        message: 'Custom error message',
        duration: 6000 
    });
}
```

### isErrorCode(error, code)
Check specific error code.

```javascript
import { isErrorCode } from '../utils/apiErrorHandler';

if (isErrorCode(error, 'DUPLICATE_USER')) {
    // Handle duplicate
}
```

### getFieldErrors(error)
Extract field validation errors.

```javascript
import { getFieldErrors } from '../utils/apiErrorHandler';

const fieldErrors = getFieldErrors(error);
// { username: ['This field is required.'], email: [...] }
```

### isValidationError(error)
Check if error is validation error.

```javascript
import { isValidationError } from '../utils/apiErrorHandler';

if (isValidationError(error)) {
    showFieldErrors(getFieldErrors(error));
}
```

---

## Migration Guide

### Before (Old Pattern)

```javascript
// Old way - using notify directly
const handleDelete = async (userId) => {
    try {
        await usersApi.usersDestroy({ userId });
        notify({ type: 'success', text: 'Deleted' });
    } catch (error) {
        notify({
            type: 'error',
            text: error.response?.data?.detail || 'Failed to delete',
        });
    }
};
```

### After (New Pattern)

```javascript
// Option 1: Using hook
const { executor } = useAPICall();
const handleDelete = executor(
    (userId) => usersApi.usersDestroy({ userId }),
    { successMessage: 'Deleted' }
);

// Option 2: Using utility
const handleDelete = async (userId) => {
    try {
        await usersApi.usersDestroy({ userId });
        notify({ type: 'success', text: 'Deleted' });
    } catch (error) {
        handleAPIError(error, notify);
    }
};
```

---

## Common Error Codes

### Authentication & Authorization
- `UNAUTHENTICATED` (401) - Not logged in
- `PERMISSION_DENIED` (403) - Insufficient permissions
- `TWO_FACTOR_REQUIRED` (401) - 2FA needed

### Validation
- `VALIDATION_ERROR` (400) - Field validation failed
- `INVALID_PASSWORD` (400) - Password requirements not met

### Resources
- `USER_NOT_FOUND` (404)
- `NOTE_NOT_FOUND` (404)
- `ENTRY_NOT_FOUND` (404)

### Conflicts
- `DUPLICATE_USER` (409)
- `DUPLICATE_ENTRY` (409)

See `/api/schema/` for complete list.

---

## Best Practices

✅ **DO**
- Use `handleAPIError` for simple cases
- Use hooks for repetitive patterns
- Use utilities for custom logic
- Check error codes, not messages
- Show success notifications

❌ **DON'T**
- Don't parse error strings
- Don't rely on status codes alone
- Don't suppress all errors silently
- Don't hardcode error messages

