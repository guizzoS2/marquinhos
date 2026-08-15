import { useCallback } from 'react';
import { NegotiationChat } from '../../components/chat/NegotiationChat';
import {
  fetchBarProposalByRoom,
  postBarChatMessage,
  resolveBarProposal,
  sendBarCounter,
} from '../../services/ownerApi';

export function BarChatPage() {
  const loadPack = useCallback((roomId) => fetchBarProposalByRoom(roomId), []);

  return (
    <NegotiationChat
      actor="bar"
      backTo="/bar/propostas"
      loadPack={loadPack}
      postMessage={postBarChatMessage}
      sendCounter={sendBarCounter}
      resolve={resolveBarProposal}
    />
  );
}
