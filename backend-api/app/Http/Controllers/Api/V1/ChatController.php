<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ResolvesMorphType;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    use ResolvesMorphType;

    private function currentUserId(Request $request): int
    {
        return $request->user()?->id ?? 1;
    }

    private function isParticipant(ChatRoom $room, int $userId): bool
    {
        return $room->participants->contains('user_id', $userId);
    }

    private function conversationPayload(ChatRoom $room, int $userId): array
    {
        $room->loadMissing(['participants.user:id,name', 'contextable']);

        $other = $room->participants->firstWhere('user_id', '!=', $userId);
        $latest = $room->messages()->latest()->first();

        $context = null;
        if ($room->contextable_type && $room->contextable_id) {
            $context = [
                'type' => static::resolveMorphAlias($room->contextable_type),
                'id' => $room->contextable_id,
                'title' => $room->contextable?->title ?? null,
            ];
        }

        return [
            'id' => $room->id,
            'recipient' => $other?->user ? [
                'id' => $other->user->id,
                'name' => $other->user->name,
            ] : null,
            'last_message' => $latest ? [
                'body' => $latest->message,
                'sender_id' => $latest->user_id,
                'created_at' => $latest->created_at,
            ] : null,
            'unread_count' => $this->unreadCount($room->id, $userId),
            'context' => $context,
            'updated_at' => $room->updated_at,
        ];
    }

    private function unreadCount(int $roomId, int $userId): int
    {
        $participant = ChatParticipant::query()
            ->where('chat_room_id', $roomId)
            ->where('user_id', $userId)
            ->first();

        $query = ChatMessage::query()
            ->where('chat_room_id', $roomId)
            ->where('user_id', '!=', $userId);

        if ($participant?->last_read_at) {
            $query->where('created_at', '>', $participant->last_read_at);
        }

        return $query->count();
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $this->currentUserId($request);

        $roomIds = ChatParticipant::query()
            ->where('user_id', $userId)
            ->pluck('chat_room_id');

        $rooms = ChatRoom::query()
            ->with(['participants.user:id,name', 'contextable'])
            ->whereIn('id', $roomIds)
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json([
            'message' => 'Daftar percakapan berhasil diambil',
            'data' => $rooms->map(fn (ChatRoom $room) => $this->conversationPayload($room, $userId)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipient_id' => 'required|integer|min:1|exists:users,id',
            'listing_type' => 'nullable|string',
            'listing_id' => 'nullable|integer|min:1',
            'message' => 'nullable|string|max:2000',
        ]);

        $userId = $this->currentUserId($request);
        $recipientId = (int) $validated['recipient_id'];

        if ($recipientId === $userId) {
            return response()->json([
                'message' => 'Tidak dapat memulai percakapan dengan diri sendiri',
                'data' => null,
            ], 422);
        }

        $contextClass = null;
        if (!empty($validated['listing_type'])) {
            $contextClass = static::resolveMorphClass($validated['listing_type']);
            if ($contextClass === null) {
                return response()->json([
                    'message' => 'Tipe listing tidak valid',
                    'data' => null,
                ], 422);
            }
        }

        $listingId = isset($validated['listing_id']) ? (int) $validated['listing_id'] : null;
        if ($listingId !== null && $contextClass === null) {
            return response()->json([
                'message' => 'listing_type wajib diisi bila listing_id diberikan',
                'data' => null,
            ], 422);
        }

        if ($contextClass !== null && $listingId !== null) {
            $exists = $contextClass::query()->where('id', $listingId)->exists();
            if (!$exists) {
                return response()->json([
                    'message' => 'Data listing tidak ditemukan',
                    'data' => null,
                ], 404);
            }
        }

        $query = ChatRoom::query()
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userId))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $recipientId));

        if ($contextClass !== null && $listingId !== null) {
            $query->where('contextable_type', $contextClass)->where('contextable_id', $listingId);
        } else {
            $query->whereNull('contextable_type');
        }

        $room = $query->first();
        $created = false;

        if ($room === null) {
            $room = ChatRoom::create([
                'contextable_type' => $contextClass,
                'contextable_id' => $listingId,
            ]);
            ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $userId]);
            ChatParticipant::create(['chat_room_id' => $room->id, 'user_id' => $recipientId]);
            $created = true;
        }

        if (!empty($validated['message'])) {
            $this->appendMessage($room, $userId, (string) $validated['message']);
        }

        return response()->json([
            'message' => $created ? 'Percakapan berhasil dibuat' : 'Percakapan sudah ada',
            'data' => $this->conversationPayload($room->fresh(), $userId),
        ], $created ? 201 : 200);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $userId = $this->currentUserId($request);

        $room = ChatRoom::query()
            ->with(['participants.user:id,name'])
            ->where('id', $id)
            ->first();

        if ($room === null || !$this->isParticipant($room, $userId)) {
            return response()->json([
                'message' => 'Percakapan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $messages = $room->messages()
            ->with('user:id,name')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn (ChatMessage $message) => [
                'id' => $message->id,
                'body' => $message->message,
                'sender_id' => $message->user_id,
                'sender_name' => $message->user?->name,
                'created_at' => $message->created_at,
            ]);

        $payload = $this->conversationPayload($room, $userId);

        return response()->json([
            'message' => 'Detail percakapan berhasil diambil',
            'data' => [
                ...$payload,
                'messages' => $messages,
            ],
        ]);
    }

    public function sendMessage(Request $request, string $id): JsonResponse
    {
        $userId = $this->currentUserId($request);

        $room = ChatRoom::query()
            ->with('participants')
            ->where('id', $id)
            ->first();

        if ($room === null || !$this->isParticipant($room, $userId)) {
            return response()->json([
                'message' => 'Percakapan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $validated = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $message = $this->appendMessage($room, $userId, $validated['body']);

        return response()->json([
            'message' => 'Pesan berhasil dikirim',
            'data' => [
                'id' => $message->id,
                'body' => $message->message,
                'sender_id' => $message->user_id,
                'created_at' => $message->created_at,
            ],
        ], 201);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $userId = $this->currentUserId($request);

        $room = ChatRoom::query()
            ->with('participants')
            ->where('id', $id)
            ->first();

        if ($room === null || !$this->isParticipant($room, $userId)) {
            return response()->json([
                'message' => 'Percakapan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        ChatParticipant::query()
            ->where('chat_room_id', $room->id)
            ->where('user_id', $userId)
            ->update(['last_read_at' => now()]);

        return response()->json([
            'message' => 'Percakapan ditandai sudah dibaca',
            'data' => ['unread_count' => 0],
        ]);
    }

    private function appendMessage(ChatRoom $room, int $userId, string $body): ChatMessage
    {
        $message = ChatMessage::create([
            'chat_room_id' => $room->id,
            'user_id' => $userId,
            'message' => $body,
        ]);

        $room->update(['last_message_at' => $message->created_at]);
        $room->touch();

        return $message;
    }
}
