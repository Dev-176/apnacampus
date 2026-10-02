import { ConversationListItem, Message } from '../../types/database';

export type MessageState = 'sending' | 'sent' | 'failed';

export interface ChatMessage extends Message {
  state?: MessageState;
  error?: string;
}

export type ConversationItem = ConversationListItem;

export interface SendMessageParams {
  conversationId: string;
  body: string;
  clientId: string;
}

export interface DeleteMessageParams {
  messageId: string;
  deleteType: 'for_me' | 'for_everyone';
}
