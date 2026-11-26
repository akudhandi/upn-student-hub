<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\RegisterRequest;
use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function dispatchOtp(string $email, string $type, ?string $recipientName = null): void
    {
        $plainCode = OtpCode::issue($email, $type);

        Mail::to($email)->send(new OtpCodeMail($plainCode, $type, OtpCode::EXPIRY_MINUTES, $recipientName));

        if (app()->environment('local') && config('app.debug') && config('mail.default') === 'log') {
            Log::info("UPN Student Hub OTP [{$type}] untuk {$email}: {$plainCode}");
        }
    }

    private function handlePasswordResetOtpRequest(string $email): JsonResponse
    {
        $user = User::query()->where('email', $email)->first();

        if ($user !== null && $user->status === 'active') {
            $wait = OtpCode::remainingCooldownSeconds($email, OtpCode::TYPE_PASSWORD_RESET);
            if ($wait > 0) {
                return response()->json([
                    'message' => "Tunggu {$wait} detik sebelum meminta kode OTP baru.",
                    'retry_after' => $wait,
                ], 429);
            }

            $this->dispatchOtp($email, OtpCode::TYPE_PASSWORD_RESET, $user->name);
        }

        return response()->json([
            'message' => 'Jika email terdaftar dan aktif, kode OTP reset password telah dikirim ke email Anda.',
            'retry_after' => OtpCode::RESEND_COOLDOWN_SECONDS,
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'status' => 'active',
                'account_type' => 'student',
                'email_verified_at' => null,
            ]);

            StudentProfile::create([
                'user_id' => $user->id,
                'name' => $validated['name'],
                'nim' => $validated['nim'] ?? null,
                'faculty' => $validated['faculty'] ?? null,
                'bio' => $validated['bio'] ?? null,
            ]);

            return $user;
        });

        $this->dispatchOtp($user->email, OtpCode::TYPE_REGISTER, $user->name);
        $user->load('profile');

        return response()->json([
            'message' => 'Registrasi berhasil. Kode OTP verifikasi telah dikirim ke email kampus Anda.',
            'requires_verification' => true,
            'email' => $user->email,
            'user' => $user,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::with('profile')->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Kredensial yang diberikan tidak cocok dengan data kami.',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Akun Anda sedang ditangguhkan atau dinonaktifkan.',
            ], 403);
        }

        if ($user->email_verified_at === null) {
            return response()->json([
                'message' => 'Email Anda belum diverifikasi. Masukkan kode OTP yang telah dikirim ke email kampus Anda.',
                'requires_verification' => true,
                'email' => $user->email,
            ], 403);
        }

        $token = $user->createToken('student_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => $this->normalizeEmail($request->input('email'))]);
        }

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'digits:6'],
        ], [
            'email.required' => 'Email kampus wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'code.required' => 'Kode OTP wajib diisi.',
            'code.digits' => 'Kode OTP harus 6 digit angka.',
        ]);

        $email = $validated['email'];
        $user = User::with('profile')->where('email', $email)->first();

        if ($user === null) {
            return response()->json([
                'message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.',
            ], 422);
        }

        if ($user->email_verified_at !== null) {
            return response()->json([
                'message' => 'Email ini sudah terverifikasi. Silakan masuk dengan akun Anda.',
            ], 422);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Akun Anda sedang ditangguhkan atau dinonaktifkan.',
            ], 403);
        }

        if (! OtpCode::consumeValid($email, OtpCode::TYPE_REGISTER, $validated['code'])) {
            return response()->json([
                'message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.',
            ], 422);
        }

        $user->email_verified_at = now();
        $user->save();

        $token = $user->createToken('student_token')->plainTextToken;

        return response()->json([
            'message' => 'Email berhasil diverifikasi.',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function resendOtp(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => $this->normalizeEmail($request->input('email'))]);
        }

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'type' => ['nullable', 'in:register,password_reset'],
        ], [
            'email.required' => 'Email kampus wajib diisi.',
            'email.email' => 'Format email tidak valid.',
        ]);

        $email = $validated['email'];
        $type = $validated['type'] ?? OtpCode::TYPE_REGISTER;

        if ($type === OtpCode::TYPE_PASSWORD_RESET) {
            return $this->handlePasswordResetOtpRequest($email);
        }

        $user = User::query()->where('email', $email)->first();
        if ($user === null || $user->email_verified_at !== null) {
            return response()->json([
                'message' => 'Akun tidak ditemukan atau email sudah terverifikasi.',
            ], 422);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Akun Anda sedang ditangguhkan atau dinonaktifkan.',
            ], 403);
        }

        $wait = OtpCode::remainingCooldownSeconds($email, OtpCode::TYPE_REGISTER);
        if ($wait > 0) {
            return response()->json([
                'message' => "Tunggu {$wait} detik sebelum meminta kode OTP baru.",
                'retry_after' => $wait,
            ], 429);
        }

        $this->dispatchOtp($email, OtpCode::TYPE_REGISTER, $user->name);

        return response()->json([
            'message' => 'Kode OTP verifikasi baru telah dikirim ke email kampus Anda.',
            'retry_after' => OtpCode::RESEND_COOLDOWN_SECONDS,
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => $this->normalizeEmail($request->input('email'))]);
        }

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ], [
            'email.required' => 'Email kampus wajib diisi.',
            'email.email' => 'Format email tidak valid.',
        ]);

        return $this->handlePasswordResetOtpRequest($validated['email']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => $this->normalizeEmail($request->input('email'))]);
        }

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'email.required' => 'Email kampus wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'code.required' => 'Kode OTP wajib diisi.',
            'code.digits' => 'Kode OTP harus 6 digit angka.',
            'password.required' => 'Password baru wajib diisi.',
            'password.min' => 'Password minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ]);

        $email = $validated['email'];
        $user = User::query()->where('email', $email)->first();

        if ($user === null || $user->status !== 'active') {
            return response()->json([
                'message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.',
            ], 422);
        }

        if (! OtpCode::consumeValid($email, OtpCode::TYPE_PASSWORD_RESET, $validated['code'])) {
            return response()->json([
                'message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.',
            ], 422);
        }

        DB::transaction(function () use ($user, $validated): void {
            $user->password = Hash::make($validated['password']);
            if ($user->email_verified_at === null) {
                $user->email_verified_at = now();
            }
            $user->save();
            $user->tokens()->delete();
        });

        return response()->json([
            'message' => 'Password berhasil diperbarui. Silakan masuk dengan password baru Anda.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logout berhasil',
        ]);
    }
}
