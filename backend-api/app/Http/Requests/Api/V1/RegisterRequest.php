<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email', 'ends_with:@upnjatim.ac.id'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'nim' => ['nullable', 'string', 'max:50'],
            'faculty' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.ends_with' => 'Email harus menggunakan domain @upnjatim.ac.id.',
        ];
    }
}
