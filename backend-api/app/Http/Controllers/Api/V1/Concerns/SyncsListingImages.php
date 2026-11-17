<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Concerns;

use Illuminate\Database\Eloquent\Model;

trait SyncsListingImages
{
    /**
     * Normalize relative storage paths (reject external URLs or path traversal)
     * and replace the model's polymorphic `images` relation when provided.
     *
     * @param  array<int, mixed>  $paths
     */
    protected function syncImages(Model $model, array $paths): void
    {
        $clean = [];
        foreach ($paths as $raw) {
            if (! is_string($raw)) {
                continue;
            }
            $trimmed = ltrim(trim($raw), '/');
            $trimmed = preg_replace('#^storage/#', '', $trimmed) ?? $trimmed;
            if ($trimmed === '' || str_contains($trimmed, '..') || preg_match('#^https?://#i', $trimmed)) {
                continue;
            }
            $clean[] = $trimmed;
        }

        $model->images()->delete();
        foreach (array_values($clean) as $index => $filePath) {
            $model->images()->create([
                'file_path' => $filePath,
                'sort_order' => $index,
            ]);
        }
    }
}
