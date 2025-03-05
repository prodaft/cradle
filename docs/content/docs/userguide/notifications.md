+++
date = "2025-03-05T14:30:00+01:00"
draft = false
linkTitle = "Notification System"
title = "Notification System"
weight = 7
+++

CRADLE implements a comprehensive notification system to keep users informed about key events and actions across the platform. This system combines in-app alerts with email notifications for critical updates.

## Types of Notifications

1. **Message Notifications**
   - Base notifications for general messages.
   - Display essential details such as message content and timestamp.
   - Can be marked as read or unread.

2. **Access Request Notifications**
   - Triggered when a user requests access to an entity.
   - Sent to all users with READ-WRITE access for the requested entity.
   - Include details about the requesting user, the entity in question, and the timestamp of the request.

3. **New User Notifications**
   - Sent to all admin users upon new user registration.
   - Contain new account details.
   - Provide links for managing the new user's account.

## Notification States

Notifications utilize two state flags to manage their lifecycle:

1. **Read:**
   - Initially set to true for new notifications.
   - Automatically toggled to false once the notification is viewed.

2. **Unread:**
   - A manual flag that users can toggle.
   - Allows important notifications to be marked for later review.

## Email Integration

For critical events, the notification system automatically dispatches email alerts:

1. **Access Requests**
   - Emails are sent to users with READ-WRITE access.
   - Contain details of the request and any required actions.

2. **New User Registration**
   - Emails are sent to admin users.
   - Include details of the new user and activation instructions.

3. **Password Reset**
   - Sent when a password reset is requested.
   - Provide secure links for resetting the password.

4. **Email Confirmation**
   - Sent to new users to verify their email address.
   - Include verification links to confirm the email.

5. **Report Status**
   - Sent to users when the status of their report has changed

The CRADLE notification system ensures that users remain informed about critical updates while offering flexibility in how they manage and interact with these notifications.

### Navigation

{{< cards columns = "2" >}}
  {{< card link="/docs/userguide/publishing" title="Publishing View" icon="arrow-left" >}}
  {{< card link="/docs/userguide/admin" title="Admin Features" icon="arrow-right" >}}
{{< /cards >}}
