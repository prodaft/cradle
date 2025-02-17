# CRADLE Notification System

CRADLE implements a comprehensive notification system that keeps users informed about important events and actions within the platform. The system combines in-app notifications with email notifications for critical updates.

## Types of Notifications

1. **Message Notifications**
   - Base notification type for general messages
   - Contains basic information like message content and timestamp
   - Can be marked as read/unread

2. **Access Request Notifications**
   - Sent when a user requests access to an entity
   - Received by all users with READ-WRITE access to the requested entity
   - Contains information about:
     - The requesting user
     - The entity being requested
     - Timestamp of request

3. **New User Notifications**
   - Sent to all admin users when a new user registers
   - Contains information about the new user's account
   - Includes links to manage the new user's account

## Notification States

Notifications have two state flags:
1. **Read**: Automatically set to true for new notifications
   - Set to false when notifications are viewed
2. **Unread**: Manual flag that users can toggle
   - Allows users to mark important notifications for later review

## Email Integration

The system automatically sends email notifications for critical events:

1. **Access Requests**
   - Emails sent to users with READ-WRITE access
   - Contains details about the request and actions needed

2. **New User Registration**
   - Emails sent to admin users
   - Contains new user details and activation instructions

3. **Password Reset**
   - Sent when users request password resets
   - Contains secure reset links

4. **Email Confirmation**
   - Sent to new users to verify their email
   - Contains email verification links


The notification system ensures users stay informed about important events while providing flexibility in how they manage and interact with notifications.
