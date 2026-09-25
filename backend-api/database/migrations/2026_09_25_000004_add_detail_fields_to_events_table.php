<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('event_code')->nullable()->unique()->after('slug');
            $table->string('event_time')->nullable()->after('event_date');
            $table->json('speakers')->nullable()->after('event_time');
            $table->json('benefits')->nullable()->after('speakers');
            $table->json('contact_pics')->nullable()->after('benefits');
            $table->json('documents')->nullable()->after('contact_pics');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'event_code',
                'event_time',
                'speakers',
                'benefits',
                'contact_pics',
                'documents',
            ]);
        });
    }
};
