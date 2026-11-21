<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Concerns;

use Symfony\Component\HttpFoundation\StreamedResponse;

trait ExportsCsv
{
    /**
     * Stream sanitized CSV rows with UTF-8 BOM to protect against spreadsheet formula injection.
     *
     * @param  array<int, string>  $headers
     * @param  iterable<int, mixed>  $rows
     * @param  callable(mixed): array<int, mixed>  $mapper
     */
    protected function streamCsv(string $filename, array $headers, iterable $rows, callable $mapper): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows, $mapper): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers);

            foreach ($rows as $row) {
                $cells = array_map(
                    fn (mixed $cell): string|int|float => $this->sanitizeCsvCell($cell),
                    $mapper($row)
                );
                fputcsv($handle, $cells);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function sanitizeCsvCell(mixed $value): string|int|float
    {
        if ($value === null) {
            return '';
        }

        if (is_int($value) || is_float($value)) {
            return $value;
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        $str = (string) $value;

        if (preg_match('/^[\x00-\x20]*[=+\-@]|^[\t\r]/', $str) === 1) {
            return "'".$str;
        }

        return $str;
    }
}
