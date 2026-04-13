import Peer from 'simple-peer';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc, 
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export class WebRTCService {
  private peer: Peer.Instance | null = null;
  private roomId: string | null = null;

  async startCall(roomId: string, localStream: MediaStream, onRemoteStream: (stream: MediaStream) => void) {
    this.roomId = roomId;

    const callDoc = doc(db, 'calls', roomId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    this.peer = new Peer({
      initiator: true,
      stream: localStream,
      trickle: true,
    });

    this.peer.on('signal', async (data) => {
      if (data.type === 'offer') {
        await setDoc(callDoc, { offer: data });
      } else if (data.type === 'candidate') {
        await addDoc(offerCandidates, data);
      }
    });

    this.peer.on('stream', (stream) => {
      onRemoteStream(stream);
    });

    // Listen for answer
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && !this.peer?.destroyed) {
        this.peer?.signal(data.answer as Peer.SignalData);
      }
    });

    // Listen for answer candidates
    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          this.peer?.signal(change.doc.data() as Peer.SignalData);
        }
      });
    });
  }

  async joinCall(roomId: string, localStream: MediaStream, onRemoteStream: (stream: MediaStream) => void) {
    this.roomId = roomId;

    const callDoc = doc(db, 'calls', roomId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    const callData = (await getDoc(callDoc)).data();
    if (!callData?.offer) return;

    this.peer = new Peer({
      initiator: false,
      stream: localStream,
      trickle: true,
    });

    this.peer.on('signal', async (data) => {
      if (data.type === 'answer') {
        await updateDoc(callDoc, { answer: data });
      } else if (data.type === 'candidate') {
        await addDoc(answerCandidates, data);
      }
    });

    this.peer.on('stream', (stream) => {
      onRemoteStream(stream);
    });

    this.peer.signal(callData.offer as Peer.SignalData);

    // Listen for offer candidates
    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          this.peer?.signal(change.doc.data() as Peer.SignalData);
        }
      });
    });
  }

  endCall() {
    this.peer?.destroy();
    this.peer = null;
    if (this.roomId) {
      deleteDoc(doc(db, 'calls', this.roomId));
    }
  }
}

export const webrtcService = new WebRTCService();
