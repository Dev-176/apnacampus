import {
  Connection,
  ConnectionStatus,
  ConnectionRequestItem,
  ConnectionItem,
} from '../../types/database';

export type {
  Connection,
  ConnectionStatus,
  ConnectionRequestItem,
  ConnectionItem,
};

export interface ConnectionStatusResult {
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected' | 'blocked';
  requestId: string | null;
}
