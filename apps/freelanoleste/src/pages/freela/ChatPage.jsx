import { useCallback } from 'react';
import { NegotiationChat } from '../../components/chat/NegotiationChat';
import {
  fetchProposalByRoom,
  postChatMessage,
  resolveProposal,
  sendCounterProposal,
} from '../../services/freelaApi';

export function FreelaChatPage() {
  const loadPack = useCallback((roomId) => fetchProposalByRoom(roomId), []);

  return (
    <NegotiationChat
      actor="freela"
      backTo="/freela/vagas"
      loadPack={loadPack}
      postMessage={postChatMessage}
      sendCounter={sendCounterProposal}
      resolve={resolveProposal}
    />
  );
}
