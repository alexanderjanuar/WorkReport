<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * List user accounts the actor may manage, with optional search.
     */
    public function index(Request $request): Response
    {
        $actor = $request->user();
        $search = trim((string) $request->input('search', ''));

        $users = User::query()
            // Ketua Tim may only see/manage members (anggota).
            ->when($actor->isKetuaTim(), fn ($q) => $q->where('role', UserRole::User))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderByRaw("FIELD(role, 'admin', 'ketua_tim', 'user')")
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'role_label' => $user->role->label(),
                'created_at' => $user->created_at?->translatedFormat('d M Y'),
                'is_self' => $user->id === $actor->id,
            ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => ['search' => $search],
            'roleOptions' => array_map(
                fn (UserRole $role) => ['value' => $role->value, 'label' => $role->label()],
                $actor->role->assignableRoles(),
            ),
        ]);
    }

    /**
     * Create a new user account (admin-provisioned, pre-verified).
     */
    public function store(Request $request): RedirectResponse
    {
        $actor = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', Password::defaults()],
            'role' => ['required', Rule::in($this->assignableRoleValues($actor))],
        ]);

        $user = new User();
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->password = $validated['password'];
        $user->role = UserRole::from($validated['role']);
        $user->email_verified_at = now();
        $user->save();

        return back();
    }

    /**
     * Update a user's name, email, and role.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        $this->authorizeManage($actor, $user);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::in($this->assignableRoleValues($actor))],
        ]);

        // Prevent an admin from removing their own admin access (avoids lockout).
        if ($actor->id === $user->id && $validated['role'] !== UserRole::Admin->value) {
            abort(403, 'Anda tidak dapat mengubah peran akun Anda sendiri.');
        }

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => UserRole::from($validated['role']),
        ]);

        return back();
    }

    /**
     * Reset a user's password.
     */
    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        $this->authorizeManage($actor, $user);

        $validated = $request->validate([
            'password' => ['required', Password::defaults()],
        ]);

        $user->update(['password' => $validated['password']]);

        return back();
    }

    /**
     * Delete a user account.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        $this->authorizeManage($actor, $user);

        if ($actor->id === $user->id) {
            abort(403, 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        $user->delete();

        return back();
    }

    /**
     * Role values the actor is allowed to assign.
     *
     * @return array<int, string>
     */
    private function assignableRoleValues(User $actor): array
    {
        return array_map(
            fn (UserRole $role) => $role->value,
            $actor->role->assignableRoles(),
        );
    }

    /**
     * Guard: ensure the actor is allowed to manage the target account.
     */
    private function authorizeManage(User $actor, User $target): void
    {
        // Ketua Tim may only manage members (anggota).
        if ($actor->isKetuaTim() && ! $target->isAnggota()) {
            abort(403);
        }
    }
}
