<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All clinic data lives in Lovable Cloud tables; `src/store/clinic.ts` (Zustand) loads it after sign-in and writes optimistically, reloading on failure — keeps pages synchronous.
- Roles live in `user_roles` (doctor/receptionist); RLS uses `is_staff`/`has_role` — never trust client role.
- Staff accounts are created only by the doctor via server functions in `src/lib/staff.functions.ts`; the first doctor is created via a one-time setup screen when no roles exist.
- Username sign-in resolves the email server-side and returns session tokens, so emails are never exposed to the browser.
