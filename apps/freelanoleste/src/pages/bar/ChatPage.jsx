import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NegotiationChat } from '../../components/chat/NegotiationChat';
import {
  fetchBarProposalByRoom,
  postBarChatMessage,
  resolveBarProposal,
  sendBarCounter,
  submitBarReview,
} from '../../services/ownerApi';

export function BarChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const loadPack = useCallback((id) => fetchBarProposalByRoom(id), []);

  return (
    <NegotiationChat
      actor="bar"
      roomId={roomId}
      onClose={() => navigate('/bar/propostas')}
      loadPack={loadPack}
      postMessage={postBarChatMessage}
      sendCounter={sendBarCounter}
      resolve={resolveBarProposal}
      submitReview={submitBarReview}
    />
  );
}
