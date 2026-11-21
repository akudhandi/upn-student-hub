<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge([
                'email' => strtolower(trim($this->input('email'))),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255', "regex:/^[A-Za-z\\s.',-]+$/"],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email', 'ends_with:@student.upnjatim.ac.id'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'nim' => ['nullable', 'string', 'regex:/^[0-9]{11}$/'],
            'faculty' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama lengkap wajib diisi.',
            'name.min' => 'Nama lengkap minimal 2 huruf.',
            'name.regex' => 'Nama lengkap hanya boleh berisi huruf alfabet dan spasi.',
            'email.required' => 'Email kampus wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar. Silakan masuk dengan akun Anda.',
            'email.ends_with' => 'Email harus menggunakan domain @student.upnjatim.ac.id.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'nim.regex' => 'NPM harus tepat 11 digit angka.',
        ];
    }
}
