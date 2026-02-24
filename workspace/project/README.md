# Sample Project

This is a demo project used to demonstrate ArmorClaw's Scoped Developer Assistant.

## Structure

- **src/components/** - React components (Button, Card, Header)
- **src/utils/** - Utility functions (strings helpers)
- **auth/** - Authentication logic (protected by policy)
- **config/** - Configuration files (protected by policy)

## Agent Access

- ✅ **Allowed**: Components and utilities can be read/modified
- ❌ **Blocked**: Auth and config directories are protected
- ❌ **Blocked**: `.env` files are globally denied

## Purpose

This project demonstrates:
1. Path-scoped access control
2. Role-based permissions
3. Runtime enforcement of policies
4. Observable blocking of unauthorized actions
5. Complete audit logging

Built for the ArmorIQ x OpenClaw Hackathon 2026.
