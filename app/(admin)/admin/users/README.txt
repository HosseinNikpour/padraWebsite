CRUD template update: users page

- The users table is now displayed above the create-user form.
- The create form uses CrudFormGrid: 3 columns on wide screens, 2 on medium screens, and 1 on mobile.
- The edit modal keeps its separate two-column form grid.
- Existing users API calls and edit/delete actions are preserved.

Files included in this update:
components/admin/crud/CrudPage.tsx
components/admin/crud/crud-theme.css
app/(admin)/admin/users/page.tsx
