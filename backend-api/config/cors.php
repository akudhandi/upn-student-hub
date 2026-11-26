<?php

$rawOrigins = (string) env(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001'
);

$allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $rawOrigins))));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => array_values(array_filter([
        'Accept',
        'Authorization',
        'Content-Type',
        'Origin',
        'X-Requested-With',
        env('APP_ENV', 'production') === 'local'
            && filter_var(env('ALLOW_DEV_FALLBACK_AUTH', false), FILTER_VALIDATE_BOOLEAN)
            ? 'X-Dev-User-Id'
            : null,
    ])),

    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 3600,

    'supports_credentials' => false,

];
