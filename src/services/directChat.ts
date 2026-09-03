import { DirectChat, DirectMessage, DirectMessageAttachment } from '../types';
import { fetchDirectChatsFromStore, saveDirectChatsToStore } from './store';
import { platformChatService } from './platform/chatService';

// Get all direct chats
export const getAllDirectChats = async (): Promise<DirectChat[]> => {
    const chats = await fetchDirectChatsFromStore();
    return chats.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
};

// Get chats for a specific student
export const getStudentChats = async (studentId: string): Promise<DirectChat[]> => {
    try {
        const threads = await platformChatService.getMyThreads();
        if (threads && threads.length > 0) {
            const thread = threads[0];
            const messagesRes = await platformChatService.getThreadMessages(thread.id, 1, 50);
            const messages: DirectMessage[] = messagesRes.items.map(m => ({
                id: m.id,
                senderId: m.sender_id,
                senderName: m.sender_id === studentId ? 'Student' : 'Counselor',
                senderRole: m.sender_id === studentId ? 'student' : 'admin',
                text: m.message_text,
                timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now()
            }));

            const chat: DirectChat = {
                id: thread.id,
                studentId: studentId,
                studentName: 'Student',
                studentEmail: '',
                status: 'open',
                messages: messages,
                createdAt: thread.created_at ? new Date(thread.created_at).getTime() : Date.now(),
                lastMessageAt: thread.updated_at ? new Date(thread.updated_at).getTime() : Date.now()
            };
            return [chat];
        }
    } catch (e) {
        console.warn('Platform Chat fetch notice:', e);
    }

    const chats = await fetchDirectChatsFromStore();
    return chats.filter(c => c.studentId === studentId).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
};

// Get a single chat by ID
export const getDirectChat = async (chatId: string): Promise<DirectChat | null> => {
    const chats = await fetchDirectChatsFromStore();
    return chats.find(c => c.id === chatId) || null;
};

// Create a new chat (initiated by student)
export const createDirectChat = async (
    studentId: string, 
    studentName: string, 
    studentEmail: string, 
    initialMessage: string, 
    attachment?: DirectMessageAttachment
): Promise<DirectChat> => {
    const chats = await fetchDirectChatsFromStore();

    let threadId = Math.random().toString(36).substr(2, 9);
    try {
        const newThread = await platformChatService.createThread({ subject: `Inquiry from ${studentName}` });
        if (newThread && newThread.id) {
            threadId = newThread.id;
            await platformChatService.sendMessage(threadId, {
                message_text: initialMessage,
                attachments: attachment ? [{ url: attachment.url, name: attachment.name, type: attachment.type }] : null
            });
        }
    } catch (e) {
        console.warn('Platform Chat create thread notice:', e);
    }

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
        id: threadId,
        studentId,
        studentName,
        studentEmail,
        status: 'open',
        messages: [msg],
        createdAt: Date.now(),
        lastMessageAt: Date.now()
    };

    chats.push(newChat);
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

    try {
        await platformChatService.sendMessage(chatId, {
            message_text: text,
            attachments: attachment ? [{ url: attachment.url, name: attachment.name, type: attachment.type }] : null
        });
    } catch (e) {
        console.warn('Platform Chat sendMessage notice:', e);
    }

    if (index === -1) {
        const msg: DirectMessage = {
            id: Math.random().toString(36).substr(2, 9),
            senderId,
            senderName,
            senderRole,
            text,
            attachment,
            timestamp: Date.now()
        };
        const newChat: DirectChat = {
            id: chatId,
            studentId: senderId,
            studentName,
            studentEmail: '',
            status: 'open',
            messages: [msg],
            createdAt: Date.now(),
            lastMessageAt: Date.now()
        };
        chats.push(newChat);
        await saveDirectChatsToStore(chats);
        return newChat;
    }

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

    if (senderRole === 'student' && chats[index].status === 'closed') {
        chats[index].status = 'open';
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

// Subscribe to Realtime Updates
export const subscribeToChatUpdates = (chatId: string, onUpdate: (chat: DirectChat) => void) => {
    // In Platform API architecture, WebSocket connections handle realtime updates
    return () => {};
};
