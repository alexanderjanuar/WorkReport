<?php

namespace App\Http\Controllers;

use App\Enums\Platform;
use App\Models\Media;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MediaController extends Controller
{
    /**
     * List the team's media accounts (admin / ketua tim).
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));

        $media = Media::query()
            ->withCount('comments')
            ->when($search !== '', fn ($query) => $query
                ->where('name', 'like', "%{$search}%"))
            ->orderBy('platform')
            ->orderBy('name')
            ->get()
            ->map(fn (Media $media) => [
                'id' => $media->id,
                'name' => $media->name,
                'platform' => $media->platform->value,
                'platform_label' => $media->platform->label(),
                'logo_url' => $media->logo_path
                    ? Storage::disk('public')->url($media->logo_path)
                    : null,
                'url' => $media->url,
                'note' => $media->note,
                'comments_count' => $media->comments_count,
            ]);

        return Inertia::render('media/index', [
            'media' => $media,
            'platformOptions' => Platform::options(),
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->persist($request, new Media());

        return back();
    }

    public function update(Request $request, Media $media): RedirectResponse
    {
        $this->persist($request, $media);

        return back();
    }

    public function destroy(Media $media): RedirectResponse
    {
        if ($media->logo_path) {
            Storage::disk('public')->delete($media->logo_path);
        }

        $media->delete();

        return back();
    }

    /**
     * Validate + save a media account, handling the optional logo upload
     * (replacing/removing the previous file when a new one is uploaded).
     */
    private function persist(Request $request, Media $media): void
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'platform' => ['required', Rule::enum(Platform::class)],
            'url' => ['nullable', 'url', 'max:2048'],
            'note' => ['nullable', 'string', 'max:1000'],
            'logo' => ['nullable', 'image', 'max:4096'], // ≤ 4 MB
        ]);

        $media->fill([
            'name' => $validated['name'],
            'platform' => $validated['platform'],
            'url' => $validated['url'] ?? null,
            'note' => $validated['note'] ?? null,
        ]);

        if ($request->hasFile('logo')) {
            if ($media->logo_path) {
                Storage::disk('public')->delete($media->logo_path);
            }
            $media->logo_path = $request->file('logo')->store('media-logos', 'public');
        }

        $media->save();
    }
}
