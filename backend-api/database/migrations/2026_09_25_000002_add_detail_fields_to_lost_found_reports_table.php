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
        Schema::table('lost_found_reports', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('title')->constrained()->nullOnDelete();
            $table->timestamp('date_event')->nullable()->after('location');
            $table->string('contact_info')->nullable()->after('date_event');
            $table->string('reward')->nullable()->after('contact_info');
            $table->dropColumn('incident_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lost_found_reports', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn([
                'category_id',
                'date_event',
                'contact_info',
                'reward',
            ]);
            $table->timestamp('incident_date')->nullable()->after('location');
        });
    }
};
