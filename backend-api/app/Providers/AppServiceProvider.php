<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by(
                $this->actorRateKey($request)
            );
        });

        RateLimiter::for('auth-attempts', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email', '')));

            return Limit::perMinute(10)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('media-uploads', function (Request $request) {
            return Limit::perMinute(30)->by(
                $this->actorRateKey($request)
            );
        });

        RateLimiter::for('student-writes', function (Request $request) {
            return Limit::perMinute(60)->by(
                $this->actorRateKey($request)
            );
        });
    }

    private function actorRateKey(Request $request): string
    {
        $user = $request->user();
        if ($user !== null) {
            return get_class($user).':'.$user->getAuthIdentifier();
        }

        return 'ip:'.$request->ip();
    }
}
