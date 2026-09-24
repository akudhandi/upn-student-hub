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
        Schema::table('service_listings', function (Blueprint $table) {
            $table->string('pricing_type')->nullable()->after('price_max'); // fixed, per_hour, starting_from, negotiable
            $table->string('estimated_time')->nullable()->after('pricing_type');
            $table->string('payment_method')->nullable()->after('estimated_time'); // dp, full, flexible
            $table->string('whatsapp_number', 20)->nullable()->after('payment_method');
            $table->json('target_faculties')->nullable()->after('whatsapp_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_listings', function (Blueprint $table) {
            $table->dropColumn([
                'pricing_type',
                'estimated_time',
                'payment_method',
                'whatsapp_number',
                'target_faculties',
            ]);
        });
    }
};
