+++
title = "System Settings"
date = "2025-03-05T12:55:52+01:00"
draft = false
weight = 5
+++

System settings are stored in the management subsystem and control defaults for
notes, users, and file handling.

## Notes settings
- **min_entries** sets the minimum number of entries required for a note.
- **min_entities** sets the minimum number of entities required for a note.
- **max_clique_size** sets the maximum clique size for note reference linking.
- **allow_dynamic_entry_class_creation** controls whether entry classes
  can be created on the fly.

## User settings
- **require_admin_confirmation** requires admin approval for new accounts.
- **require_email_confirmation** requires email confirmation for activation.
- **allow_registration** controls whether users can self-register.

## File settings
- **upload_limit** sets the maximum upload size.
- **autoprocess_files** controls whether files are processed after upload.
- **md5_subtype** sets the subtype used for MD5 hash entries.
- **sha1_subtype** sets the subtype used for SHA-1 hash entries.
- **sha256_subtype** sets the subtype used for SHA-256 hash entries.
- **max_file_size_for_hashing** sets the largest file size eligible for hashing.
