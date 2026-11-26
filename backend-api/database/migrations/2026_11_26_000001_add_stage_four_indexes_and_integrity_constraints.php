<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('student_profiles')
            ->where('nim', '')
            ->update(['nim' => null]);

        Schema::table('marketplace_listings', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'marketplace_status_created_idx');
            $table->dropForeign(['category_id']);
        });

        Schema::table('marketplace_listings', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable()->change();
            $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
        });

        Schema::table('service_listings', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'services_status_created_idx');
            $table->dropForeign(['category_id']);
        });

        Schema::table('service_listings', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable()->change();
            $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
        });

        Schema::table('lost_found_reports', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'lost_found_status_created_idx');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->index(['status', 'event_date'], 'events_status_date_idx');
            $table->index(['status', 'created_at'], 'events_status_created_idx');
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'reports_status_created_idx');
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->index(
                ['chat_room_id', 'is_deleted', 'user_id', 'created_at'],
                'chat_messages_unread_lookup_idx'
            );
        });

        Schema::table('student_profiles', function (Blueprint $table) {
            $table->unique('nim', 'student_profiles_nim_unique');
        });

        Schema::table('ratings', function (Blueprint $table) {
            $table->unique(['user_id', 'rateable_type', 'rateable_id'], 'ratings_user_rateable_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropUnique('ratings_user_rateable_unique');
        });

        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropUnique('student_profiles_nim_unique');
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropIndex('chat_messages_unread_lookup_idx');
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex('reports_status_created_idx');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('events_status_date_idx');
            $table->dropIndex('events_status_created_idx');
        });

        Schema::table('lost_found_reports', function (Blueprint $table) {
            $table->dropIndex('lost_found_status_created_idx');
        });

        Schema::table('service_listings', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropIndex('services_status_created_idx');
        });

        Schema::table('service_listings', function (Blueprint $table) {
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
        });

        Schema::table('marketplace_listings', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropIndex('marketplace_status_created_idx');
        });

        Schema::table('marketplace_listings', function (Blueprint $table) {
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
        });
    }
};
