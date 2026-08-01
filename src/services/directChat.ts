
import { DirectChat, DirectMessage, DirectMessageAttachment } from '../types';
import { fetchDirectChatsFromStore, saveDirectChatsToStore } from './store';
import { supabase } from '../lib/supabase';

// Get all direct chats
export const getAllDirectChats = async (): Promise<DirectChat[]> => {
    const chats = await fetchDirectChatsFromStore();
    return chats.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
};

// Get chats for a specific student
export const getStudentChats = async (studentId: string): Promise<DirectChat[]> => {
    const chats = await fetchDirectChatsFromStore();
    return chats.filter(c => c.studentId === studentId).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
};

// Get a single chat by ID
export const getDirectChat = async (chatId: string): Promise<DirectChat | null> => {
    const chats = await fetchDirectChatsFromStore();
    return chats.find(c => c.id === chatId) || null;
};

// Create a new chat (initiated by student)
export const createDirectChat = async (studentId: string, studentName: string, studentEmail: string, initialMessage: string, attachment?: DirectMessageAttachment): Promise<DirectChat> => {
    const chats = await fetchDirectChatsFromStore();

    const msg: DirectMessage = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: studentId,
        senderName: studentName,
        senderRole: 'student',
        text: initialMessage,
        attachment,
        timestamp: Date.now()
    };

    const newChat: DirectChat = {
        id: Math.random().toString(36).substr(2, 9),
        studentId,
        studentName,
        studentEmail,
        status: 'open',
        messages: [msg],
        createdAt: Date.now(),
        lastMessageAt: Date.now()
    };

    chats.push(newChat);

    try {
        await supabase.from('direct_chats').upsert({
            id: newChat.id,
            student_id: newChat.studentId,
            student_name: newChat.studentName,
            student_email: newChat.studentEmail,
            messages: newChat.messages,
            created_at: newChat.createdAt,
            last_message_at: newChat.lastMessageAt,
            status: newChat.status
        });
    } catch (e) {
        console.warn('Direct Supabase chat insert warning:', e);
    }

    await saveDirectChatsToStore(chats);
    return newChat;
};

// Send a message in an existing chat
export const sendDirectMessage = async (
    chatId: string,
    senderId: string,
    senderName: string,
    senderRole: 'student' | 'admin',
    text: string,
    attachment?: DirectMessageAttachment
): Promise<DirectChat | null> => {
    const chats = await fetchDirectChatsFromStore();
    const index = chats.findIndex(c => c.id === chatId);
    if (index === -1) return null;

    const msg: DirectMessage = {
        id: Math.random().toString(36).substr(2, 9),
        senderId,
        senderName,
        senderRole,
        text,
        attachment,
        timestamp: Date.now()
    };

    chats[index].messages.push(msg);
    chats[index].lastMessageAt = Date.now();

    // Reopen if closed and student sends a message
    if (senderRole === 'student' && chats[index].status === 'closed') {
        chats[index].status = 'open';
    }

    try {
        await supabase.from('direct_chats').update({
            messages: chats[index].messages,
            last_message_at: chats[index].lastMessageAt,
            status: chats[index].status
        }).eq('id', chatId);
    } catch (e) {
        console.warn('Direct Supabase chat update warning:', e);
    }

    await saveDirectChatsToStore(chats);
    return chats[index];
};

// Escalate a chat to a higher role
export const escalateChat = async (chatId: string, escalatedBy: string, escalatedByName: string, targetRole: string, reason: string): Promise<DirectChat | null> => {
    const chats = await fetchDirectChatsFromStore();
    const index = chats.findIndex(c => c.id === chatId);
    if (index === -1) return null;

    chats[index].status = 'escalated';
    chats[index].escalatedTo = targetRole;
    chats[index].escalationReason = reason;

    // Add a system-style escalation message
    const escalationMsg: DirectMessage = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: escalatedBy,
        senderName: escalatedByName,
        senderRole: 'admin',
        text: `⚠️ Escalated to ${targetRole}: ${reason}`,
        timestamp: Date.now(),
        isEscalation: true,
        escalationNote: reason
    };

    chats[index].messages.push(escalationMsg);
    chats[index].lastMessageAt = Date.now();

    await saveDirectChatsToStore(chats);
    return chats[index];
};

// Close a chat
export const closeDirectChat = async (chatId: string): Promise<boolean> => {
    const chats = await fetchDirectChatsFromStore();
    const index = chats.findIndex(c => c.id === chatId);
    if (index === -1) return false;

    chats[index].status = 'closed';
    await saveDirectChatsToStore(chats);
    return true;
};

// Subscribe to Realtime Updates for a specific chat
export const subscribeToChatUpdates = (chatId: string, onUpdate: (chat: DirectChat) => void) => {
    const channel = supabase
        .channel(`chat_${chatId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'direct_chats', filter: `id=eq.${chatId}` },
            (payload) => {
                if (payload.new) {
                    const row = payload.new;
                    const updatedChat: DirectChat = {
                        id: row.id,
                        studentId: row.student_id,
                        studentName: row.student_name,
                        studentEmail: row.student_email,
                        status: row.status,
                        messages: row.messages || [],
                        createdAt: row.created_at,
                        lastMessageAt: row.last_message_at
                    };
                    onUpdate(updatedChat);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
