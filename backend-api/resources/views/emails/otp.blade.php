<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kode OTP — UPN Student Hub</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F1EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#141416;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #E5E0DA;border-radius:16px;padding:32px;">
                    <tr>
                        <td>
                            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6E6A66;text-transform:uppercase;letter-spacing:0.06em;">
                                UPN Student Hub
                            </p>
                            <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;line-height:1.3;color:#141416;">
                                @if($type === \App\Models\OtpCode::TYPE_PASSWORD_RESET)
                                    Reset Password Akun Anda
                                @else
                                    Verifikasi Email Kampus Anda
                                @endif
                            </h1>
                            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#57534E;">
                                Halo{{ $recipientName ? ' ' . $recipientName : '' }},
                            </p>
                            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#57534E;">
                                @if($type === \App\Models\OtpCode::TYPE_PASSWORD_RESET)
                                    Kami menerima permintaan untuk mengatur ulang password akun UPN Student Hub Anda. Masukkan kode OTP 6 digit berikut pada halaman pemulihan password:
                                @else
                                    Terima kasih telah mendaftar di UPN Student Hub. Masukkan kode OTP 6 digit berikut untuk memverifikasi email kampus dan mengaktifkan akses akun Anda:
                                @endif
                            </p>
                            <div style="margin:0 0 20px;padding:18px;background-color:#FAF8F6;border:1px solid #E5E0DA;border-radius:12px;text-align:center;">
                                <span style="font-size:30px;font-weight:700;letter-spacing:8px;color:#141416;">{{ $code }}</span>
                            </div>
                            <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#57534E;">
                                Kode ini berlaku selama <strong>{{ $expiryMinutes }} menit</strong>.
                            </p>
                            <p style="margin:0;font-size:13px;line-height:1.5;color:#787470;">
                                Demi keamanan akun Anda, <strong>jangan pernah membagikan kode OTP ini kepada siapa pun</strong>, termasuk pihak yang mengaku sebagai admin atau tim pengembang.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
