<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\OtpCode;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $code,
        public readonly string $type,
        public readonly int $expiryMinutes = OtpCode::EXPIRY_MINUTES,
        public readonly ?string $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->type === OtpCode::TYPE_PASSWORD_RESET
            ? 'Kode Reset Password — UPN Student Hub'
            : 'Kode Verifikasi Email — UPN Student Hub';

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.otp',
        );
    }
}
