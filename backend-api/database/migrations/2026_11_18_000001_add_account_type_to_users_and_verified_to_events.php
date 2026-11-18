<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_type', 30)->default('student')->after('status')->index();
        });

        Schema::table('events', function (Blueprint $table) {
            $table->boolean('is_verified')->default(false)->after('status');
        });

        // Existing published events curated by admin before this migration remain marked verified.
        DB::table('events')->where('status', 'published')->update(['is_verified' => true]);
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('is_verified');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['account_type']);
            $table->dropColumn('account_type');
        });
    }
};
